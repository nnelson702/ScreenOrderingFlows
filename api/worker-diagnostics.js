import worker from './worker.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isQuoteCreate = request.method === 'POST' && url.pathname === '/api/quote/create';

    const startedAt = Date.now();
    const response = await worker.fetch(request, env, ctx);

    if (!isQuoteCreate) return response;

    const elapsedMs = Date.now() - startedAt;
    let bodyText = '';
    try {
      bodyText = await response.clone().text();
    } catch (err) {
      bodyText = '[diagnostic body read failed] ' + String(err && err.message ? err.message : err);
    }

    if (response.status >= 400) {
      console.error('quote_create_failure', JSON.stringify({
        status: response.status,
        elapsed_ms: elapsedMs,
        worker_entrypoint: 'worker-diagnostics.js',
        supabase_url_present: Boolean(env && env.SUPABASE_URL),
        supabase_service_role_key_present: Boolean(env && env.SUPABASE_SERVICE_ROLE_KEY),
        stripe_secret_key_present: Boolean(env && env.STRIPE_SECRET_KEY),
        response_body: bodyText
      }));
    } else {
      console.log('quote_create_success', JSON.stringify({
        status: response.status,
        elapsed_ms: elapsedMs,
        worker_entrypoint: 'worker-diagnostics.js'
      }));
    }

    const headers = new Headers(response.headers);
    headers.set('X-Screen-Worker-Entrypoint', 'worker-diagnostics.js');
    headers.set('X-Screen-Worker-Diagnostic', 'quote-create-v1');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
