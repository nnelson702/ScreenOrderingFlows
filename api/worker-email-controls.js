import worker from './worker.js';

const BLOCKED_PREFIXES = [
  'Screen Order Completed -',
  'Vendor Forms Ready -'
];
const LIFECYCLE_STATUSES = ['in_production', 'ready', 'completed'];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const allowManualVendorSend = url.pathname === '/api/vendor-packet/send-to-store';

    if (request.method === 'POST' && url.pathname === '/api/quote/status') {
      const duplicate = await duplicateLifecycleStatusResponse(request, env);
      if (duplicate) return duplicate;
    }

    return withEmailControls(allowManualVendorSend, () => worker.fetch(request, env, ctx));
  }
};

async function duplicateLifecycleStatusResponse(request, env) {
  let body;
  try {
    body = await request.clone().json();
  } catch (err) {
    return null;
  }

  const quoteId = clean(body && body.quote_id);
  const status = clean(body && body.status).toLowerCase();
  if (!quoteId || !LIFECYCLE_STATUSES.includes(status)) return null;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const current = await fetchCurrentStatus(env, quoteId);
  if (!current.ok || current.status !== status) return null;

  return json({
    ok: true,
    quote_id: quoteId,
    status,
    email_status: {
      skipped: true,
      reason: 'Status already set; lifecycle email not resent'
    }
  });
}

async function fetchCurrentStatus(env, quoteId) {
  const url = trim(env.SUPABASE_URL) + '/rest/v1/quotes?id=eq.' + encodeURIComponent(quoteId) + '&select=id,status&limit=1';
  const res = await globalThis.fetch(url, {
    method: 'GET',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
  const text = await res.text();
  const data = parseJson(text);
  if (!res.ok || !Array.isArray(data) || !data[0]) return { ok: false, status: null };
  return { ok: true, status: clean(data[0].status).toLowerCase() };
}

async function withEmailControls(allowManualVendorSend, callback) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function controlledFetch(resource, init) {
    const target = typeof resource === 'string' ? resource : resource && resource.url;
    const method = String(init && init.method ? init.method : 'GET').toUpperCase();

    if (target === 'https://api.resend.com/emails' && method === 'POST') {
      const payload = parseJson(init && init.body);
      const subject = String(payload && payload.subject ? payload.subject : '');
      const isBlocked = BLOCKED_PREFIXES.some((prefix) => subject.startsWith(prefix));
      const isAllowedManualVendorSend = allowManualVendorSend && subject.startsWith('Vendor Forms Ready -');

      if (isBlocked && !isAllowedManualVendorSend) {
        return new Response(JSON.stringify({ id: 'suppressed-store-email', skipped: true, subject }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return originalFetch(resource, init);
  };

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function parseJson(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

function clean(value) {
  return String(value ?? '').trim();
}

function trim(value) {
  return String(value || '').replace(/\/+$/, '');
}
