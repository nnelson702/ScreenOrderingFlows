import worker from './worker.js';

const LIFECYCLE_EMAIL_STATUSES = new Set(['in_production', 'ready', 'completed']);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isStatusUpdate = request.method === 'POST' && url.pathname === '/api/quote/status';

    if (!isStatusUpdate) {
      return worker.fetch(request, env, ctx);
    }

    const statusDecision = await prepareStatusUpdate(request, env);
    if (statusDecision.response) {
      return cors(request, env, statusDecision.response);
    }

    if (statusDecision.status === 'in_production') {
      await suppressAutoVendorPacketForProduction(statusDecision.quoteId, env);
    }

    return worker.fetch(request, env, ctx);
  }
};

async function prepareStatusUpdate(request, env) {
  let body;
  try {
    body = await request.clone().json();
  } catch (err) {
    return {};
  }

  const quoteId = clean(body && body.quote_id);
  const status = clean(body && body.status).toLowerCase();
  if (!quoteId || !status) return { quoteId, status };

  if (!LIFECYCLE_EMAIL_STATUSES.has(status)) return { quoteId, status };
  if (!env || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { quoteId, status };

  const current = await loadQuote(quoteId, env);
  if (!current.ok || !current.quote) return { quoteId, status };

  const previousStatus = clean(current.quote.status).toLowerCase();
  if (previousStatus !== status) return { quoteId, status };

  const patch = sameStatusPatch(status, body);
  const updated = await patchQuote(quoteId, patch, env);
  if (!updated.ok) {
    return {
      quoteId,
      status,
      response: json({
        ok: false,
        error: 'Supabase same-status update failed',
        details: updated.error
      }, 500)
    };
  }

  return {
    quoteId,
    status,
    response: json({
      ok: true,
      quote_id: quoteId,
      status,
      email_status: {
        skipped: true,
        reason: 'Status already set; lifecycle email not resent'
      }
    })
  };
}

function sameStatusPatch(status, body) {
  const now = new Date().toISOString();
  const patch = { status_updated_at: now };
  const posNotes = clean(body && body.pos_notes);
  const posReceiptNumber = clean(body && body.pos_receipt_number);
  const paymentMethod = clean(body && body.payment_method);

  if (status === 'in_production') {
    if (paymentMethod) patch.payment_method = paymentMethod;
    if (posReceiptNumber) patch.pos_receipt_number = posReceiptNumber;
    if (posNotes) patch.pos_notes = posNotes;
  }

  if ((status === 'ready' || status === 'completed') && posNotes) {
    patch.pos_notes = posNotes;
  }

  return patch;
}

async function suppressAutoVendorPacketForProduction(quoteId, env) {
  if (!quoteId) return;
  if (!env || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return;

  const patch = {
    vendor_packet_status: 'sent_to_store',
    vendor_packet_last_error: null
  };

  const res = await supabaseFetch(
    env,
    'quotes?id=eq.' + encodeURIComponent(quoteId),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(patch)
    }
  );

  if (!res.ok) {
    console.error('vendor_packet_auto_suppress_failed', JSON.stringify({
      quote_id: quoteId,
      status: res.status,
      body: await res.text()
    }));
  }
}

async function loadQuote(quoteId, env) {
  const res = await supabaseFetch(
    env,
    'quotes?id=eq.' + encodeURIComponent(quoteId) + '&limit=1',
    { method: 'GET' }
  );

  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }

  const data = await res.json();
  return { ok: true, quote: Array.isArray(data) ? data[0] : null };
}

async function patchQuote(quoteId, patch, env) {
  const res = await supabaseFetch(
    env,
    'quotes?id=eq.' + encodeURIComponent(quoteId),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(patch)
    }
  );

  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }

  return { ok: true };
}

async function supabaseFetch(env, pathAndQuery, options) {
  const base = String(env.SUPABASE_URL).replace(/\/+$/, '');
  const headers = new Headers(options && options.headers ? options.headers : {});
  headers.set('Content-Type', 'application/json');
  headers.set('apikey', env.SUPABASE_SERVICE_ROLE_KEY);
  headers.set('Authorization', 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY);

  return fetch(base + '/rest/v1/' + pathAndQuery, {
    ...(options || {}),
    headers
  });
}

function cors(request, env, response) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env && env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS : '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else if (allowed.length) {
    headers.set('Access-Control-Allow-Origin', allowed[0]);
  } else {
    headers.set('Access-Control-Allow-Origin', '*');
  }

  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,Stripe-Signature');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function clean(value) {
  return String(value == null ? '' : value).trim();
}
