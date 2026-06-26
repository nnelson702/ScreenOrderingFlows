import worker from './worker.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/api/quote/create') {
      return worker.fetch(request, env, ctx);
    }
    return withLegacyQuoteCreate(() => worker.fetch(request, env, ctx));
  }
};

async function withLegacyQuoteCreate(callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function(resource, init) {
    const target = typeof resource === 'string' ? resource : resource && resource.url;
    const method = String(init && init.method ? init.method : 'GET').toUpperCase();
    const isQuoteWrite = typeof target === 'string' && target.includes('/rest/v1/quotes') && (method === 'POST' || method === 'PATCH');
    if (!isQuoteWrite || !init || typeof init.body !== 'string') return originalFetch(resource, init);

    let payload;
    try { payload = JSON.parse(init.body); } catch (err) { return originalFetch(resource, init); }
    if (!payload || Array.isArray(payload)) return originalFetch(resource, init);

    const next = { ...payload };
    if (method === 'POST' && next.status === 'quote_created') next.status = 'submitted';
    next.fulfillment_method = undefined;
    next.delivery_distance_miles = undefined;
    next.delivery_fee_cents = undefined;

    return originalFetch(resource, { ...init, body: JSON.stringify(next) });
  };
  try { return await callback(); }
  finally { globalThis.fetch = originalFetch; }
}
