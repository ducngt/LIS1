function jsonHeaders(apiKey, extra = {}) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...extra };
}

export function normalizeModelCapabilities(input = {}) {
  return {
    chat: input.chat !== false,
    streaming: input.streaming === true,
    temperature: input.temperature === true,
    vision: input.vision === true,
    jsonMode: input.jsonMode === true,
    reasoning: input.reasoning === true,
    toolCalling: input.toolCalling === true,
    embeddings: input.embeddings === true
  };
}

export function normalizeGenerationSettings(input = {}) {
  const temperature = Number(input.temperature);
  const maxTokens = Number(input.maxTokens);
  return {
    useTemperature: input.useTemperature === true,
    temperature: Number.isFinite(temperature) ? Math.max(0, Math.min(2, temperature)) : 0.2,
    useMaxTokens: input.useMaxTokens === true,
    maxTokens: Number.isFinite(maxTokens) ? Math.max(1, Math.min(32768, Math.trunc(maxTokens))) : 1800
  };
}

export async function invokeAI(provider, apiKey, request) {
  const prompt = buildPrompt(request);
  const attachments = normalizeAttachments(request.attachments || []);
  const model = provider.model;
  if (!model) throw new Error('Chưa chọn Model ID.');
  const timeout = AbortSignal.timeout(60000);
  const capabilities = normalizeModelCapabilities(provider.capabilities || {});
  const generation = normalizeGenerationSettings(provider.generation || {});

  if (provider.kind === 'gemini') {
    const endpoint = provider.endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const url = endpoint.includes('?') ? `${endpoint}&key=${encodeURIComponent(apiKey)}` : `${endpoint}?key=${encodeURIComponent(apiKey)}`;
    const parts = [{ text: prompt }];
    for (const a of attachments.filter(x => x.mimeType === 'application/pdf')) parts.push({ inlineData: { mimeType: a.mimeType, data: a.base64 } });
    const payload = { contents: [{ role: 'user', parts }] };
    const generationConfig = {};
    if (capabilities.temperature && generation.useTemperature) generationConfig.temperature = generation.temperature;
    if (generation.useMaxTokens) generationConfig.maxOutputTokens = generation.maxTokens;
    if (Object.keys(generationConfig).length) payload.generationConfig = generationConfig;
    const r = await fetch(url, { method: 'POST', signal: timeout, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await safeJson(r);
    if (!r.ok) throw new Error(data?.error?.message || `Gemini HTTP ${r.status}`);
    return data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || '';
  }

  if (provider.kind === 'anthropic') {
    const endpoint = provider.endpoint || 'https://api.anthropic.com/v1/messages';
    const content = [];
    for (const a of attachments.filter(x => x.mimeType === 'application/pdf')) content.push({ type: 'document', source: { type: 'base64', media_type: a.mimeType, data: a.base64 } });
    content.push({ type: 'text', text: prompt });
    const payload = { model, max_tokens: generation.useMaxTokens ? generation.maxTokens : 1800, messages: [{ role: 'user', content }] };
    if (capabilities.temperature && generation.useTemperature) payload.temperature = generation.temperature;
    const r = await fetch(endpoint, {
      method: 'POST', signal: timeout,
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(payload)
    });
    const data = await safeJson(r);
    if (!r.ok) throw new Error(data?.error?.message || `Anthropic HTTP ${r.status}`);
    return (data?.content || []).map(x => x.text || '').join('\n');
  }

  if (provider.kind === 'openai') {
    const endpoint = provider.endpoint || 'https://api.openai.com/v1/responses';
    const inputContent = [{ type: 'input_text', text: prompt }];
    for (const a of attachments) inputContent.push({ type: 'input_file', filename: a.name, file_data: `data:${a.mimeType};base64,${a.base64}`, ...(a.mimeType === 'application/pdf' ? { detail: 'auto' } : {}) });
    const payload = {
      model,
      instructions: 'Bạn là trợ lý nghiên cứu của NUTE. Chỉ hỗ trợ phân tích và khuyến nghị; không tự đưa ra quyết định phê duyệt hành chính.',
      input: attachments.length ? [{ role: 'user', content: inputContent }] : prompt
    };
    // Responses API: only send optional parameters explicitly confirmed for the selected model.
    if (capabilities.temperature && generation.useTemperature) payload.temperature = generation.temperature;
    if (generation.useMaxTokens) payload.max_output_tokens = generation.maxTokens;
    const r = await fetch(endpoint, {
      method: 'POST', signal: timeout, headers: jsonHeaders(apiKey), body: JSON.stringify(payload)
    });
    const data = await safeJson(r);
    if (!r.ok) throw providerHttpError('OpenAI', r.status, data);
    return extractOpenAIResponseText(data);
  }

  if (attachments.length && !String(request.content || '').trim()) throw new Error(`${provider.kind || 'AI'} chưa được cấu hình đọc tệp PDF trực tiếp; AI Router sẽ thử provider khác.`);
  const endpoint = provider.endpoint || defaultOpenAICompatibleEndpoint(provider.kind);
  const payload = {
    model,
    messages: [
      { role: 'system', content: 'Bạn là trợ lý nghiên cứu của NUTE. Chỉ hỗ trợ phân tích và khuyến nghị; không tự đưa ra quyết định phê duyệt hành chính.' },
      { role: 'user', content: prompt }
    ]
  };
  // Safe-by-default: optional generation parameters are only sent when the model capability is explicitly confirmed.
  if (capabilities.temperature && generation.useTemperature) payload.temperature = generation.temperature;
  if (generation.useMaxTokens) payload.max_tokens = generation.maxTokens;

  const r = await fetch(endpoint, {
    method: 'POST', signal: timeout,
    headers: jsonHeaders(apiKey, provider.kind === 'openrouter' ? { 'HTTP-Referer': 'http://localhost', 'X-Title': 'NUTE Research' } : {}),
    body: JSON.stringify(payload)
  });
  const data = await safeJson(r);
  if (!r.ok) throw providerHttpError(provider.kind || 'AI', r.status, data);
  return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
}


export function isUsableTextGenerationModel(kind, id, metadata = {}) {
  const name = String(id || '').toLowerCase();
  if (!name) return false;
  const blocked = ['embedding','moderation','audio','realtime','image','tts','transcrib','whisper','speech','vision-preview','search-preview','dall-e','sora'];
  if (blocked.some(x => name.includes(x))) return false;
  if (kind === 'openai') {
    if (['babbage-002','davinci-002','gpt-3.5-turbo-instruct'].includes(name)) return false;
    return true;
  }
  if (kind === 'gemini') return !name.includes('embedding');
  if (kind === 'anthropic') return name.includes('claude');
  if (kind === 'groq' || kind === 'openrouter' || kind === 'custom' || kind === 'ollama') return true;
  return metadata.textGeneration !== false;
}

export function filterUsableModels(kind, models = []) {
  return models.filter(m => isUsableTextGenerationModel(kind, m.id, m));
}

export async function listProviderModels(provider, apiKey) {
  const kind = String(provider.kind || 'openai');
  const timeout = AbortSignal.timeout(30000);
  if (!apiKey && kind !== 'ollama') throw new Error('Chưa có API key.');

  if (kind === 'gemini') {
    const base = provider.modelsEndpoint || 'https://generativelanguage.googleapis.com/v1beta/models';
    const url = base.includes('?') ? `${base}&key=${encodeURIComponent(apiKey)}` : `${base}?key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, { signal: timeout });
    const data = await safeJson(r);
    if (!r.ok) throw new Error(data?.error?.message || `Gemini HTTP ${r.status}`);
    return (data.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => ({
      id: String(m.name || '').replace(/^models\//, ''), name: m.displayName || m.name, contextWindow: m.inputTokenLimit || null,
      outputTokens: m.outputTokenLimit || null, source: 'provider-api'
    })).filter(x => x.id);
  }

  if (kind === 'anthropic') {
    const endpoint = provider.modelsEndpoint || 'https://api.anthropic.com/v1/models';
    const r = await fetch(endpoint, { signal: timeout, headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } });
    const data = await safeJson(r);
    if (!r.ok) throw new Error(data?.error?.message || `Anthropic HTTP ${r.status}`);
    return (data.data || []).map(m => ({ id: m.id, name: m.display_name || m.id, createdAt: m.created_at || null, source: 'provider-api' })).filter(x => x.id);
  }

  if (kind === 'ollama') {
    const endpoint = provider.modelsEndpoint || deriveOllamaModelsEndpoint(provider.endpoint);
    const r = await fetch(endpoint, { signal: timeout });
    const data = await safeJson(r);
    if (!r.ok) throw new Error(data?.error?.message || `Ollama HTTP ${r.status}`);
    if (Array.isArray(data.models)) return data.models.map(m => ({ id: m.name || m.model, name: m.name || m.model, size: m.size || null, source: 'provider-api' })).filter(x => x.id);
    return (data.data || []).map(m => ({ id: m.id, name: m.id, source: 'provider-api' })).filter(x => x.id);
  }

  const endpoint = provider.modelsEndpoint || defaultModelsEndpoint(kind, provider.endpoint);
  const headers = jsonHeaders(apiKey, kind === 'openrouter' ? { 'HTTP-Referer': 'http://localhost', 'X-Title': 'NUTE Research' } : {});
  const r = await fetch(endpoint, { signal: timeout, headers });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error?.message || data?.message || `Models HTTP ${r.status}`);
  const discovered = (data.data || []).map(m => ({
    id: m.id,
    name: m.name || m.id,
    contextWindow: m.context_length || m.context_window || null,
    ownedBy: m.owned_by || null,
    architecture: m.architecture || null,
    pricing: m.pricing || null,
    source: 'provider-api'
  })).filter(x => x.id);
  return filterUsableModels(kind, discovered).sort((a,b) => String(a.id).localeCompare(String(b.id)));
}

export async function probeModelCapabilities(provider, apiKey) {
  const baseProvider = { ...provider, capabilities: normalizeModelCapabilities(provider.capabilities || {}), generation: normalizeGenerationSettings(provider.generation || {}) };
  const startedAt = new Date().toISOString();
  const result = {
    model: baseProvider.model,
    provider: baseProvider.kind,
    reachable: false,
    capabilities: { ...baseProvider.capabilities },
    probes: {},
    probedAt: startedAt
  };

  try {
    const text = await invokeAI({ ...baseProvider, capabilities: { ...baseProvider.capabilities, temperature: false }, generation: { ...baseProvider.generation, useTemperature: false, useMaxTokens: false } }, apiKey, { task: 'Kiểm tra kết nối', content: 'Chỉ trả lời đúng một từ: OK' });
    result.reachable = true;
    result.probes.base = { ok: true, response: String(text || '').slice(0,120) };
  } catch (e) {
    result.probes.base = { ok: false, error: e.message };
    return result;
  }

  // Probe temperature only. This directly addresses the most common incompatibility while keeping cost low.
  try {
    await invokeAI({ ...baseProvider, capabilities: { ...baseProvider.capabilities, temperature: true }, generation: { ...baseProvider.generation, useTemperature: true, temperature: 0.2, useMaxTokens: false } }, apiKey, { task: 'Kiểm tra tham số', content: 'Chỉ trả lời: OK' });
    result.capabilities.temperature = true;
    result.probes.temperature = { ok: true };
  } catch (e) {
    result.capabilities.temperature = false;
    result.probes.temperature = { ok: false, error: e.message };
  }

  return result;
}


function normalizeAttachments(items = []) {
  return (Array.isArray(items) ? items : []).filter(x => x?.base64).map((x, i) => ({
    name: String(x.name || `document-${i+1}.pdf`).slice(0, 180),
    mimeType: String(x.mimeType || 'application/pdf'),
    base64: String(x.base64),
    size: Number(x.size || 0)
  }));
}

function extractOpenAIResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text) return data.output_text;
  const pieces = [];
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') pieces.push(part.text);
    }
  }
  return pieces.join('\n');
}

function providerHttpError(provider, status, data) {
  const raw = data?.error?.message || data?.message || `${provider} HTTP ${status}`;
  let hint = '';
  if (status === 401) hint = ' API key không hợp lệ, đã hết hiệu lực, hoặc không thuộc project/provider đang gọi.';
  else if (status === 403) hint = ' API key hoặc project không có quyền sử dụng model/endpoint này.';
  else if (status === 404) hint = ' Model ID hoặc endpoint không tồn tại. Hãy dùng “Lấy danh sách model”.';
  else if (status === 429) hint = ' Provider đang giới hạn tốc độ hoặc tài khoản/project chưa có quota/billing phù hợp.';
  return new Error(`${raw}${hint}`);
}

function defaultOpenAICompatibleEndpoint(kind) {
  if (kind === 'groq') return 'https://api.groq.com/openai/v1/chat/completions';
  if (kind === 'openrouter') return 'https://openrouter.ai/api/v1/chat/completions';
  if (kind === 'ollama') return 'http://localhost:11434/v1/chat/completions';
  return 'https://api.openai.com/v1/chat/completions';
}

function defaultModelsEndpoint(kind, completionEndpoint = '') {
  if (kind === 'groq') return 'https://api.groq.com/openai/v1/models';
  if (kind === 'openrouter') return 'https://openrouter.ai/api/v1/models';
  if (kind === 'ollama') return deriveOllamaModelsEndpoint(completionEndpoint);
  if (completionEndpoint) {
    try {
      const u = new URL(completionEndpoint);
      const path = u.pathname.replace(/\/chat\/completions\/?$/, '/models').replace(/\/responses\/?$/, '/models');
      u.pathname = path;
      u.search = '';
      return u.toString();
    } catch {}
  }
  return 'https://api.openai.com/v1/models';
}

function deriveOllamaModelsEndpoint(completionEndpoint = '') {
  try {
    const u = new URL(completionEndpoint || 'http://localhost:11434/v1/chat/completions');
    return `${u.origin}/api/tags`;
  } catch { return 'http://localhost:11434/api/tags'; }
}

async function safeJson(r) {
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function buildPrompt(request) {
  return [
    `Nhiệm vụ: ${request.task || 'Phân tích hồ sơ nghiên cứu'}`,
    request.context ? `Bối cảnh:\n${JSON.stringify(request.context, null, 2)}` : '',
    request.content ? `Nội dung:\n${request.content}` : '',
    'Trả lời bằng tiếng Việt, ngắn gọn, có cấu trúc. Phân biệt rõ dữ kiện, nhận xét và khuyến nghị. Không tạo quyết định công nhận/phê duyệt thay con người.'
  ].filter(Boolean).join('\n\n');
}
