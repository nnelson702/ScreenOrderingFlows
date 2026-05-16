export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return cors(request, env, new Response(null, { status: 204 }));
    try {
      if (request.method === 'GET' && url.pathname === '/') {
        return cors(request, env, json({ ok: true, service: 'screen-ordering-api', message: 'API is running. Use /health for diagnostics.', phase: 'quote-create-v3-stripe-details' }));
      }
      if (request.method === 'GET' && url.pathname === '/health') {
        return cors(request, env, json({ ok: true, service: 'screen-ordering-api', phase: 'quote-create-v3-stripe-details', env: envStatus(env) }));
      }
      if (request.method === 'GET' && url.pathname === '/api/quote/create') {
        return cors(request, env, json({ ok: true, route: '/api/quote/create', allowed_method: 'POST', note: 'This endpoint is working; browser address bar uses GET, but the quote form uses POST.' }, 405));
      }
      if (request.method === 'POST' && url.pathname === '/api/quote/create') return cors(request, env, await createQuote(request, env));
      return cors(request, env, json({ error: 'Not found', path: url.pathname }, 404));
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      return cors(request, env, json({ error: 'Server error: ' + message, message }, 500));
    }
  }
};

async function createQuote(request, env) {
  const missing = missingEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY']);
  if (missing.length) return json({ error: 'Missing required Worker environment variables', missing, env: envStatus(env) }, 500);

  const body = await request.json();
  const customer = body.customer || {};
  const store = body.store || {};
  const items = Array.isArray(body.items) ? body.items : [];
  const totals = body.totals || {};

  for (const key of ['name', 'street', 'city', 'state', 'zip', 'phone', 'email']) {
    if (!String(customer[key] || '').trim()) return json({ error: 'Missing customer.' + key }, 400);
  }
  if (!String(store.name || '').trim()) return json({ error: 'Missing store.name' }, 400);
  if (!String(store.email || '').trim()) return json({ error: 'Missing store.email' }, 400);
  if (!items.length) return json({ error: 'At least one item required' }, 400);

  const subtotal = cents(totals.subtotal_cents) || items.reduce((sum, item) => sum + cents(item.line_total_cents), 0);
  const delivery = cents(totals.delivery_cents);
  const tax = cents(totals.tax_cents);
  const total = cents(totals.total_cents) || subtotal + delivery + tax;
  if (total <= 0) return json({ error: 'Computed total invalid' }, 400);

  const quotePayload = {
    status: 'submitted',
    view_token: token(40),
    customer_name: clean(customer.name),
    customer_street: clean(customer.street),
    customer_city: clean(customer.city),
    customer_state: clean(customer.state),
    customer_zip: clean(customer.zip),
    customer_phone: clean(customer.phone),
    customer_email: clean(customer.email),
    store_id: store.id == null ? null : String(store.id),
    store_name: clean(store.name),
    store_email: clean(store.email),
    store_phone: store.phone == null ? null : String(store.phone),
    store_street: store.street == null ? null : String(store.street),
    store_city: store.city == null ? null : String(store.city),
    store_state: store.state == null ? null : String(store.state),
    store_zip: store.zip == null ? null : String(store.zip),
    subtotal_cents: subtotal,
    delivery_cents: delivery,
    tax_cents: tax,
    total_cents: total
  };

  const insertedQuote = await sbInsert(env, 'quotes', quotePayload);
  if (!insertedQuote.ok) return json({ error: 'Supabase quote insert failed', details: insertedQuote.error }, 500);
  const quote = insertedQuote.data && insertedQuote.data[0];
  if (!quote || !quote.id) return json({ error: 'Supabase did not return quote id', details: insertedQuote.data }, 500);

  const rows = items.map((item, index) => ({
    quote_id: quote.id,
    sort_index: Number(item.sort_index || index + 1),
    type: clean(item.type || 'window').toLowerCase(),
    qty: Number(item.qty || 1),
    width_display: clean(item.width_display),
    height_display: clean(item.height_display),
    frame_type: clean(item.frame_type),
    frame_color: clean(item.frame_color),
    material_type: clean(item.material_type),
    material_color: clean(item.material_color),
    line_total_cents: cents(item.line_total_cents),
    frame_cut_type: item.frame_cut_type == null ? null : String(item.frame_cut_type),
    crossbar_needed: item.crossbar_needed == null ? null : Boolean(item.crossbar_needed),
    crossbar_orientation: item.crossbar_orientation == null ? null : String(item.crossbar_orientation),
    crossbar_distance_display: item.crossbar_distance_display == null ? null : String(item.crossbar_distance_display),
    handle_orientation: item.handle_orientation == null ? null : String(item.handle_orientation),
    handle_height_display: item.handle_height_display == null ? null : String(item.handle_height_display),
    roller_type: item.roller_type == null ? null : String(item.roller_type),
    hardware_json: item.hardware_json == null ? null : item.hardware_json
  }));

  const insertedItems = await sbInsert(env, 'quote_items', rows);
  if (!insertedItems.ok) {
    await sbDelete(env, 'quotes', 'id', quote.id);
    return json({ error: 'Supabase quote_items insert failed', details: insertedItems.error }, 500);
  }

  const checkout = await createCheckout(request, env, quote);
  if (!checkout.ok) {
    await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quote.id), { status: 'payment_link_failed' });
    return json({ error: 'Stripe checkout session create failed: ' + summarizeStripeError(checkout.error), quote_id: quote.id, details: checkout.error }, 500);
  }

  const updated = await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quote.id), {
    stripe_session_id: checkout.data.id,
    payment_url: checkout.data.url
  });
  if (!updated.ok) return json({ error: 'Supabase payment fields update failed', quote_id: quote.id, payment_url: checkout.data.url, details: updated.error }, 500);

  return json({ ok: true, quote_id: quote.id, id: quote.id, payment_url: checkout.data.url, quote: { id: quote.id, status: quote.status, view_token: quote.view_token, total_cents: quote.total_cents, payment_url: checkout.data.url, stripe_session_id: checkout.data.id } });
}

async function createCheckout(request, env, quote) {
  if (!env.STRIPE_SECRET_KEY) return { ok: false, error: 'STRIPE_SECRET_KEY not set' };
  const base = customerBase(request, env);
  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', base + '/?paid=1&quote=' + encodeURIComponent(quote.view_token));
  form.set('cancel_url', base + '/?canceled=1&quote=' + encodeURIComponent(quote.view_token));
  form.set('customer_email', quote.customer_email || '');
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][unit_amount]', String(cents(quote.total_cents)));
  form.set('line_items[0][price_data][product_data][name]', 'Custom Screen Quote');
  form.set('line_items[0][price_data][product_data][description]', 'Customer: ' + quote.customer_name + ' | Store: ' + quote.store_name);
  form.set('metadata[quote_id]', String(quote.id));
  form.set('metadata[view_token]', String(quote.view_token));

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
  const text = await res.text();
  const data = parse(text);
  if (!res.ok) return { ok: false, error: data || text || ('HTTP ' + res.status) };
  return { ok: true, data };
}

function envStatus(env) {
  return {
    ALLOWED_ORIGINS: Boolean(env.ALLOWED_ORIGINS),
    CONFIG_URL: Boolean(env.CONFIG_URL),
    SUPABASE_URL: Boolean(env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    STRIPE_SECRET_KEY: Boolean(env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: Boolean(env.STRIPE_WEBHOOK_SECRET),
    RESEND_API_KEY: Boolean(env.RESEND_API_KEY)
  };
}
function summarizeStripeError(error) { if (!error) return 'Unknown Stripe error'; if (typeof error === 'string') return error; if (error.error && error.error.message) return error.error.message; if (error.message) return error.message; return JSON.stringify(error); }
function missingEnv(env, names) { return names.filter((name) => !env[name]); }
function sbHeaders(env) { return { 'Content-Type': 'application/json', apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY }; }
async function sbInsert(env, table, payload) {
  const res = await fetch(trim(env.SUPABASE_URL) + '/rest/v1/' + table + '?select=*', { method: 'POST', headers: { ...sbHeaders(env), Prefer: 'return=representation' }, body: JSON.stringify(payload) });
  const text = await res.text();
  const data = parse(text);
  if (!res.ok) return { ok: false, error: data || text || ('HTTP ' + res.status) };
  return { ok: true, data };
}
async function sbPatch(env, table, filter, payload) {
  const res = await fetch(trim(env.SUPABASE_URL) + '/rest/v1/' + table + '?' + filter, { method: 'PATCH', headers: { ...sbHeaders(env), Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
  const text = await res.text();
  if (!res.ok) return { ok: false, error: parse(text) || text || ('HTTP ' + res.status) };
  return { ok: true };
}
async function sbDelete(env, table, key, value) {
  const res = await fetch(trim(env.SUPABASE_URL) + '/rest/v1/' + table + '?' + key + '=eq.' + encodeURIComponent(value), { method: 'DELETE', headers: sbHeaders(env) });
  const text = await res.text();
  if (!res.ok) return { ok: false, error: parse(text) || text || ('HTTP ' + res.status) };
  return { ok: true };
}
function json(obj, status = 200) { return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } }); }
function cors(request, env, response) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  const allowOrigin = allowed.length === 0 ? '*' : (origin && allowed.includes(origin) ? origin : allowed[0]);
  const h = new Headers(response.headers);
  h.set('Access-Control-Allow-Origin', allowOrigin);
  h.set('Vary', 'Origin');
  h.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,Stripe-Signature');
  return new Response(response.body, { status: response.status, headers: h });
}
function customerBase(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (origin && (allowed.length === 0 || allowed.includes(origin))) return origin;
  return allowed[0] || 'https://screen-ordering-flow.nnelson.workers.dev';
}
function token(len) { const b = crypto.getRandomValues(new Uint8Array(len)); return btoa(String.fromCharCode(...b)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '').slice(0, len); }
function clean(v) { return String(v == null ? '' : v).trim(); }
function cents(v) { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : 0; }
function trim(v) { return String(v || '').replace(/\/+$/, ''); }
function parse(text) { try { return text ? JSON.parse(text) : null; } catch { return null; } }
