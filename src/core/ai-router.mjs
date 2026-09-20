export function normalizeProviderRoutes(routes) {
  if (!Array.isArray(routes) || !routes.length) return ['*'];
  return [...new Set(routes.map(x => String(x || '').trim()).filter(Boolean))];
}

export function providerEligible(provider, route = '*') {
  if (!provider || provider.enabled === false || !provider.model) return false;
  const routes = normalizeProviderRoutes(provider.routes);
  return routes.includes('*') || routes.includes(route);
}

export function rankProviders(providers = [], route = '*') {
  return providers
    .filter(p => providerEligible(p, route))
    .slice()
    .sort((a, b) => {
      const pa = a.primary || a.active ? 1 : 0;
      const pb = b.primary || b.active ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return Number(a.priority ?? 100) - Number(b.priority ?? 100);
    });
}

export async function invokeAIWithFallback({ providers, route='*', request, decrypt, invoke }) {
  const ranked = rankProviders(providers, route);
  if (!ranked.length) throw new Error(`Chưa có AI Provider khả dụng cho capability route: ${route}.`);
  const attempts = [];
  for (const provider of ranked) {
    try {
      const key = provider.kind === 'ollama' ? '' : (provider.secret ? decrypt(provider.secret) : '');
      if (!key && provider.kind !== 'ollama') {
        attempts.push({ providerId: provider.id, model: provider.model, ok: false, error: 'Thiếu API key' });
        continue;
      }
      const result = await invoke(provider, key, request);
      return { result, provider, attempts: [...attempts, { providerId: provider.id, model: provider.model, ok: true }] };
    } catch (error) {
      attempts.push({ providerId: provider.id, model: provider.model, ok: false, error: String(error?.message || error) });
    }
  }
  const detail = attempts.map(a => `${a.providerId || '?'} / ${a.model || '?'}: ${a.error}`).join(' | ');
  throw new Error(`Không AI Provider nào xử lý được yêu cầu. ${detail}`);
}
