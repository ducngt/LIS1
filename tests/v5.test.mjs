import test from 'node:test';
import assert from 'node:assert/strict';
import { invokeAI } from '../src/wires/ai.mjs';
import { documentCapabilities } from '../src/wires/document.mjs';
import { BASE_PERMISSIONS } from '../src/core/permissions.mjs';

test('V5 document capability accepts office/PDF formats', () => {
  const c = documentCapabilities();
  for (const ext of ['.pdf','.doc','.docx','.txt','.md','.rtf']) assert.ok(c.acceptedExtensions.includes(ext));
  assert.equal(c.maxFileBytes, 25 * 1024 * 1024);
});

test('V5 permissions include participant document and workflow actions', () => {
  assert.ok(BASE_PERMISSIONS.includes('research.document.upload'));
  assert.ok(BASE_PERMISSIONS.includes('research.submit'));
  assert.ok(BASE_PERMISSIONS.includes('research.approve'));
});

test('OpenAI adapter uses Responses API and safe generation defaults', async () => {
  const prior = globalThis.fetch;
  let seen;
  globalThis.fetch = async (url, opts) => {
    seen = { url: String(url), opts, body: JSON.parse(opts.body) };
    return {
      ok: true,
      status: 200,
      async text() { return JSON.stringify({ output: [{ content: [{ type: 'output_text', text: 'OK' }] }] }); }
    };
  };
  try {
    const out = await invokeAI({
      kind: 'openai', model: 'gpt-test', endpoint: '',
      capabilities: { temperature: false }, generation: { useTemperature: false, useMaxTokens: false }
    }, 'sk-test', { task: 'test', content: 'hello' });
    assert.equal(out, 'OK');
    assert.equal(seen.url, 'https://api.openai.com/v1/responses');
    assert.equal(seen.opts.headers.Authorization, 'Bearer sk-test');
    assert.equal(seen.body.model, 'gpt-test');
    assert.ok('input' in seen.body);
    assert.ok(!('temperature' in seen.body));
    assert.ok(!('max_output_tokens' in seen.body));
  } finally {
    globalThis.fetch = prior;
  }
});
