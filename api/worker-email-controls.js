import worker from './worker.js';

const BLOCKED_PREFIXES = [
  'Screen Order Completed -',
  'Vendor Forms Ready -'
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const allowManualVendorSend = url.pathname === '/api/vendor-packet/send-to-store';
    return withEmailControls(allowManualVendorSend, () => worker.fetch(request, env, ctx));
  }
};

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

function parseJson(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}
