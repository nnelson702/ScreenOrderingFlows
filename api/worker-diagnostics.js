import worker from './worker.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isQuoteCreate = request.method === 'POST' && url.pathname === '/api/quote/create';
    const isStatusUpdate = request.method === 'POST' && url.pathname === '/api/quote/status';

    if (isStatusUpdate) {
      await suppressAutoVendorPacketForProduction(request, env);
    }

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

async function suppressAutoVendorPacketForProduction(request, env) {
  let body;
  try {
    body = await request.clone().json();
  } catch (err) {
    return;
  }

  const quoteId = String(body && body.quote_id ? body.quote_id : '').trim();
  const status = String(body && body.status ? body.status : '').trim().toLowerCase();

  if (!quoteId || status !== 'in_production') return;
  if (!env || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;

  const endpoint = String(env.SUPABASE_URL).replace(/\/+$/, '') + '/rest/v1/quotes?id=eq.' + encodeURIComponent(quoteId);
  const patch = {
    vendor_packet_status: 'sent_to_store',
    vendor_packet_last_error: null
  };

  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(patch)
  });

  if (!res.ok) {
    console.error('vendor_packet_auto_suppress_failed', JSON.stringify({
      quote_id: quoteId,
      status: res.status,
      body: await res.text()
    }));
  } else {
    console.log('vendor_packet_auto_suppressed', JSON.stringify({ quote_id: quoteId }));
  }
}
