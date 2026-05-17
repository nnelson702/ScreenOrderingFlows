export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return cors(request, env, new Response(null, { status: 204 }));
    }

    try {
      if (request.method === 'GET' && url.pathname === '/') {
        return cors(request, env, json({
          ok: true,
          service: 'screen-ordering-api',
          message: 'API is running. Use /health for diagnostics.',
          phase: 'quote-email-webhook-v1'
        }));
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        return cors(request, env, json({
          ok: true,
          service: 'screen-ordering-api',
          phase: 'quote-email-webhook-v1',
          env: envStatus(env)
        }));
      }

      if (request.method === 'GET' && url.pathname === '/api/quote/create') {
        return cors(request, env, json({
          ok: true,
          route: '/api/quote/create',
          allowed_method: 'POST',
          note: 'This endpoint is working; browser address bar uses GET, but the quote form uses POST.'
        }, 405));
      }

      if (request.method === 'POST' && url.pathname === '/api/quote/create') {
        return cors(request, env, await createQuote(request, env));
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/quote/view/')) {
        const viewToken = url.pathname.split('/').pop();
        return cors(request, env, await viewQuote(env, viewToken));
      }

      if (request.method === 'POST' && url.pathname === '/api/stripe/webhook') {
        return cors(request, env, await handleStripeWebhook(request, env));
      }

      return cors(request, env, json({ error: 'Not found', path: url.pathname }, 404));
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      return cors(request, env, json({ error: 'Server error: ' + message, message }, 500));
    }
  }
};

async function createQuote(request, env) {
  const missing = missingEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY']);
  if (missing.length) {
    return json({ error: 'Missing required Worker environment variables', missing, env: envStatus(env) }, 500);
  }

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

  const fulfillment = body.fulfillment || {};
  const fulfillmentMethod = clean(
    body.fulfillment_method ||
    fulfillment.fulfillment_method ||
    fulfillment.method ||
    'pickup'
  ).toLowerCase();

  const rawDeliveryDistanceMiles =
    body.delivery_distance_miles ??
    fulfillment.delivery_distance_miles ??
    null;

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
    total_cents: total,
    fulfillment_method: fulfillmentMethod,
    delivery_distance_miles:
      rawDeliveryDistanceMiles == null || rawDeliveryDistanceMiles === ''
        ? null
        : Number(rawDeliveryDistanceMiles),
    delivery_fee_cents: cents(
      body.delivery_fee_cents ??
      fulfillment.delivery_fee_cents ??
      delivery
    )
  };

  const insertedQuote = await sbInsert(env, 'quotes', quotePayload);
  if (!insertedQuote.ok) return json({ error: 'Supabase quote insert failed', details: insertedQuote.error }, 500);

  const quote = insertedQuote.data && insertedQuote.data[0];
  if (!quote || !quote.id) return json({ error: 'Supabase did not return quote id', details: insertedQuote.data }, 500);

  const itemRows = items.map((item, index) => ({
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

  const insertedItems = await sbInsert(env, 'quote_items', itemRows);
  if (!insertedItems.ok) {
    await sbDelete(env, 'quotes', 'id', quote.id);
    return json({ error: 'Supabase quote_items insert failed', details: insertedItems.error }, 500);
  }

  const checkout = await createCheckout(request, env, quote);
  if (!checkout.ok) {
    await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quote.id), { status: 'payment_link_failed' });
    return json({ error: 'Stripe checkout session create failed: ' + summarizeStripeError(checkout.error), quote_id: quote.id, details: checkout.error }, 500);
  }

    const updatedQuote = {
    ...quote,
    stripe_session_id: checkout.data.id,
    payment_url: checkout.data.url,
    fulfillment_method: quotePayload.fulfillment_method,
    delivery_distance_miles: quotePayload.delivery_distance_miles,
    delivery_fee_cents: quotePayload.delivery_fee_cents
  };

  const updated = await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quote.id), {
    stripe_session_id: checkout.data.id,
    payment_url: checkout.data.url,
    fulfillment_method: quotePayload.fulfillment_method,
    delivery_distance_miles: quotePayload.delivery_distance_miles,
    delivery_fee_cents: quotePayload.delivery_fee_cents
  });
  if (!updated.ok) {
    return json({ error: 'Supabase payment fields update failed', quote_id: quote.id, payment_url: checkout.data.url, details: updated.error }, 500);
  }

  const emailStatus = await sendQuoteCreatedEmails(env, updatedQuote, itemRows);

  return json({
    ok: true,
    quote_id: quote.id,
    id: quote.id,
    payment_url: checkout.data.url,
    email_status: emailStatus,
    quote: {
      id: quote.id,
      status: quote.status,
      view_token: quote.view_token,
      total_cents: quote.total_cents,
      payment_url: checkout.data.url,
      stripe_session_id: checkout.data.id
    }
  });
}

async function viewQuote(env, viewToken) {
  if (!viewToken) return json({ error: 'Missing view token' }, 400);

  const q = await sbSelect(env, 'quotes', 'view_token=eq.' + encodeURIComponent(viewToken));
  if (!q.ok) return json({ error: 'Supabase quote select failed', details: q.error }, 500);

  const quote = q.data && q.data[0];
  if (!quote) return json({ error: 'Quote not found' }, 404);

  const items = await sbSelect(env, 'quote_items', 'quote_id=eq.' + encodeURIComponent(quote.id) + '&order=sort_index.asc');
  if (!items.ok) return json({ error: 'Supabase quote_items select failed', details: items.error }, 500);

  return json({ ok: true, quote, items: items.data || [] });
}

async function handleStripeWebhook(request, env) {
  const missing = missingEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_WEBHOOK_SECRET']);
  if (missing.length) return json({ error: 'Missing required webhook environment variables', missing }, 500);

  const signature = request.headers.get('Stripe-Signature');
  if (!signature) return json({ error: 'Missing Stripe-Signature header' }, 400);

  const rawBody = await request.arrayBuffer();
  const verified = await verifyStripeWebhook(env, rawBody, signature);
  if (!verified.ok) return json({ error: 'Webhook signature verification failed', details: verified.error }, 400);

  const event = verified.data;

  if (event && event.type === 'checkout.session.completed') {
    const session = event.data && event.data.object;
    const quoteId = session && session.metadata && session.metadata.quote_id;

    if (quoteId) {
      await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quoteId), {
        status: 'paid',
        stripe_session_id: session.id || null,
        stripe_payment_intent_id: session.payment_intent || null,
        paid_at: new Date().toISOString()
      });

      const q = await sbSelect(env, 'quotes', 'id=eq.' + encodeURIComponent(quoteId));
      const quote = q.ok && q.data ? q.data[0] : null;

      if (quote) {
        const itemsResult = await sbSelect(env, 'quote_items', 'quote_id=eq.' + encodeURIComponent(quote.id) + '&order=sort_index.asc');
        const items = itemsResult.ok ? (itemsResult.data || []) : [];
        await sendPaymentReceivedEmails(env, quote, items);
      }
    }
  }

  return json({ ok: true });
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

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString()
  });

  const text = await res.text();
  const data = parse(text);
  if (!res.ok) return { ok: false, error: data || text || ('HTTP ' + res.status) };
  return { ok: true, data };
}

async function sendQuoteCreatedEmails(env, quote, items) {
  if (!env.RESEND_API_KEY) return { skipped: true, reason: 'RESEND_API_KEY not set' };

  const results = [];
  const paymentUrl = quote.payment_url || '';
  const customerSubject = 'Your Helpful ACE screen quote is ready';
  const storeSubject = 'Screen quote created - ' + quote.customer_name;

  results.push(await sendEmail(env, {
    to: quote.customer_email,
    subject: customerSubject,
    html: customerQuoteHtml(quote, items, paymentUrl),
    text: customerQuoteText(quote, items, paymentUrl)
  }));

  results.push(await sendEmail(env, {
    to: quote.store_email,
    subject: storeSubject,
    html: storeQuoteCreatedHtml(quote, items),
    text: storeQuoteCreatedText(quote, items)
  }));

  return { attempted: true, results };
}

async function sendPaymentReceivedEmails(env, quote, items) {
  if (!env.RESEND_API_KEY) return { skipped: true, reason: 'RESEND_API_KEY not set' };

  const results = [];

  results.push(await sendEmail(env, {
    to: quote.customer_email,
    subject: 'Your Helpful ACE screen order has been received',
    html: paymentReceivedCustomerHtml(quote, items),
    text: paymentReceivedCustomerText(quote, items)
  }));

  results.push(await sendEmail(env, {
    to: quote.store_email,
    subject: 'Paid screen order received - ' + quote.customer_name,
    html: paidStoreNoticeHtml(quote, items),
    text: paidStoreNoticeText(quote, items)
  }));

  return { attempted: true, results };
}

async function sendEmail(env, message) {
  const from = env.RESEND_FROM || 'Helpful ACE Screen Quotes <onboarding@resend.dev>';
  const payload = {
    from,
    to: [message.to],
    subject: message.subject,
    html: message.html,
    text: message.text
  };

  if (env.RESEND_REPLY_TO) payload.reply_to = env.RESEND_REPLY_TO;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  const data = parse(text);

  return {
    ok: res.ok,
    to: message.to,
    subject: message.subject,
    status: res.status,
    id: data && data.id ? data.id : null,
    error: res.ok ? null : (data || text || ('HTTP ' + res.status))
  };
}

function customerQuoteHtml(quote, items, paymentUrl) {
  return emailShell('Your screen quote is ready', `
    <p>Your Screen Quote has been created, but not yet placed.</p>
    <p>Please review the details below for accuracy. When ready, you can pay securely online or visit the store to make payment and complete your order.</p>
    <p><a href="${esc(paymentUrl)}" style="display:inline-block;background:#b01c2e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold;">Pay Here</a></p>
    ${quoteSummaryHtml(quote, items)}
    <p>Once payment is received, production on your order will begin and will no longer be able to be cancelled or modified.</p>
  `);
}

function customerQuoteText(quote, items, paymentUrl) {
  return [
    'Your Screen Quote has been created, but not yet placed.',
    '',
    'Review the details of your order for accuracy, then pay here:',
    paymentUrl,
    '',
    quoteSummaryText(quote, items),
    '',
    'Once payment is received, production on your order will begin and will no longer be able to be cancelled or modified.'
  ].join('\n');
}

function storeQuoteCreatedHtml(quote, items) {
  return emailShell('Screen quote created', `
    <p>A customer has built a screen quote. This is not a paid order yet.</p>
    ${quoteSummaryHtml(quote, items)}
  `);
}

function storeQuoteCreatedText(quote, items) {
  return [
    'A customer has built a screen quote. This is not a paid order yet.',
    '',
    quoteSummaryText(quote, items)
  ].join('\n');
}

function paymentReceivedCustomerHtml(quote, items) {
  return emailShell('Your screen order has been received', `
    <p>Your order has been received and production will begin immediately.</p>
    <p>Because production is beginning, the order can no longer be cancelled or modified.</p>
    ${quoteSummaryHtml(quote, items)}
  `);
}

function paymentReceivedCustomerText(quote, items) {
  return [
    'Your order has been received and production will begin immediately.',
    'Because production is beginning, the order can no longer be cancelled or modified.',
    '',
    quoteSummaryText(quote, items)
  ].join('\n');
}

function paidStoreNoticeHtml(quote, items) {
  return emailShell('Paid screen order received', `
    <p>A screen order has been paid. Vendor form generation and customer quote PDF attachment are the next integration step.</p>
    ${quoteSummaryHtml(quote, items)}
  `);
}

function paidStoreNoticeText(quote, items) {
  return [
    'A screen order has been paid.',
    'Vendor form generation and customer quote PDF attachment are the next integration step.',
    '',
    quoteSummaryText(quote, items)
  ].join('\n');
}

function quoteSummaryHtml(quote, items) {
  const rows = items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${esc(title(item.type))}</td>
      <td>${esc(item.qty)}</td>
      <td>${esc(item.width_display)}</td>
      <td>${esc(item.height_display)}</td>
      <td>${esc(item.frame_type)} / ${esc(item.frame_color)}</td>
      <td>${esc(item.material_type)} / ${esc(item.material_color)}</td>
      <td style="text-align:right;">${money(item.line_total_cents)}</td>
    </tr>
  `).join('');

  return `
    <h3>Quote Summary</h3>
    <p><strong>Quote ID:</strong> ${esc(quote.id)}</p>
    <p><strong>Status:</strong> ${esc(quote.status)}</p>

    <h3>Quote Totals</h3>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:320px;max-width:100%;font-size:14px;margin-bottom:14px;">
      <tbody>
        <tr>
          <td style="border-bottom:1px solid #ddd;">Subtotal</td>
          <td style="border-bottom:1px solid #ddd;text-align:right;">${money(quote.subtotal_cents)}</td>
        </tr>
        <tr>
          <td style="border-bottom:1px solid #ddd;">Tax</td>
          <td style="border-bottom:1px solid #ddd;text-align:right;">${money(quote.tax_cents)}</td>
        </tr>
        <tr>
          <td style="border-bottom:1px solid #ddd;">Delivery</td>
          <td style="border-bottom:1px solid #ddd;text-align:right;">${money(quote.delivery_cents)}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Total</td>
          <td style="font-weight:bold;text-align:right;">${money(quote.total_cents)}</td>
        </tr>
      </tbody>
    </table>

    <h3>Customer</h3>
    <p>${esc(quote.customer_name)}<br>${esc(quote.customer_street)}<br>${esc(quote.customer_city)}, ${esc(quote.customer_state)} ${esc(quote.customer_zip)}<br>${esc(quote.customer_phone)}<br>${esc(quote.customer_email)}</p>

    <h3>Store</h3>
    <p>${esc(quote.store_name)}<br>${esc(quote.store_phone || '')}<br>${esc(quote.store_email || '')}</p>

    <h3>Screens</h3>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr>
          <th>#</th>
          <th>Type</th>
          <th>Qty</th>
          <th>Width</th>
          <th>Height</th>
          <th>Frame</th>
          <th>Material</th>
          <th>Line</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function quoteSummaryText(quote, items) {
  const screenCount = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const lines = [
    'Quote ID: ' + quote.id,
    'Status: ' + quote.status,
    '',
    'Quote Totals:',
    'Subtotal: ' + money(quote.subtotal_cents),
    'Tax: ' + money(quote.tax_cents),
    'Delivery: ' + money(quote.delivery_cents),
    'Total: ' + money(quote.total_cents),
    'Screen count: ' + screenCount,
    '',
    'Customer:',
    quote.customer_name,
    quote.customer_street,
    quote.customer_city + ', ' + quote.customer_state + ' ' + quote.customer_zip,
    quote.customer_phone,
    quote.customer_email,
    '',
    'Store:',
    quote.store_name,
    quote.store_phone || '',
    quote.store_email || '',
    '',
    'Screens:'
  ];

  items.forEach((item, index) => {
    lines.push(`${index + 1}. ${title(item.type)} x${item.qty} - ${item.width_display} x ${item.height_display} - ${item.frame_type}/${item.frame_color} - ${item.material_type}/${item.material_color} - ${money(item.line_total_cents)}`);
  });

  return lines.join('\n');
}
function emailShell(titleText, bodyHtml) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.45;color:#222;max-width:780px;margin:0 auto;">
      <h2 style="color:#b01c2e;">${esc(titleText)}</h2>
      ${bodyHtml}
    </div>
  `;
}

function envStatus(env) {
  return {
    ALLOWED_ORIGINS: Boolean(env.ALLOWED_ORIGINS),
    CONFIG_URL: Boolean(env.CONFIG_URL),
    SUPABASE_URL: Boolean(env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    STRIPE_SECRET_KEY: Boolean(env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: Boolean(env.STRIPE_WEBHOOK_SECRET),
    RESEND_API_KEY: Boolean(env.RESEND_API_KEY),
    RESEND_FROM: Boolean(env.RESEND_FROM),
    RESEND_REPLY_TO: Boolean(env.RESEND_REPLY_TO)
  };
}

function summarizeStripeError(error) {
  if (!error) return 'Unknown Stripe error';
  if (typeof error === 'string') return error;
  if (error.error && error.error.message) return error.error.message;
  if (error.message) return error.message;
  return JSON.stringify(error);
}

function missingEnv(env, names) { return names.filter((name) => !env[name]); }

function sbHeaders(env) {
  return {
    'Content-Type': 'application/json',
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY
  };
}

async function sbInsert(env, table, payload) {
  const res = await fetch(trim(env.SUPABASE_URL) + '/rest/v1/' + table + '?select=*', {
    method: 'POST',
    headers: { ...sbHeaders(env), Prefer: 'return=representation' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  const data = parse(text);
  if (!res.ok) return { ok: false, error: data || text || ('HTTP ' + res.status) };
  return { ok: true, data };
}

async function sbSelect(env, table, queryString) {
  const res = await fetch(trim(env.SUPABASE_URL) + '/rest/v1/' + table + '?' + queryString + '&select=*', {
    method: 'GET',
    headers: sbHeaders(env)
  });
  const text = await res.text();
  const data = parse(text);
  if (!res.ok) return { ok: false, error: data || text || ('HTTP ' + res.status) };
  return { ok: true, data };
}

async function sbPatch(env, table, filter, payload) {
  const res = await fetch(trim(env.SUPABASE_URL) + '/rest/v1/' + table + '?' + filter, {
    method: 'PATCH',
    headers: { ...sbHeaders(env), Prefer: 'return=minimal' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, error: parse(text) || text || ('HTTP ' + res.status) };
  return { ok: true };
}

async function sbDelete(env, table, key, value) {
  const res = await fetch(trim(env.SUPABASE_URL) + '/rest/v1/' + table + '?' + key + '=eq.' + encodeURIComponent(value), {
    method: 'DELETE',
    headers: sbHeaders(env)
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, error: parse(text) || text || ('HTTP ' + res.status) };
  return { ok: true };
}

async function verifyStripeWebhook(env, rawBody, signatureHeader) {
  const parts = {};
  signatureHeader.split(',').forEach((part) => {
    const [key, value] = part.split('=');
    if (key && value) parts[key] = value;
  });

  if (!parts.t || !parts.v1) return { ok: false, error: 'Invalid Stripe signature header' };

  const bodyText = new TextDecoder().decode(new Uint8Array(rawBody));
  const expected = await hmacSha256Hex(env.STRIPE_WEBHOOK_SECRET, parts.t + '.' + bodyText);

  if (!safeEqual(expected, parts.v1)) return { ok: false, error: 'Stripe signature mismatch' };

  return { ok: true, data: JSON.parse(bodyText) };
}

async function hmacSha256Hex(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

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

function token(len) {
  const b = crypto.getRandomValues(new Uint8Array(len));
  return btoa(String.fromCharCode(...b)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '').slice(0, len);
}

function clean(v) { return String(v == null ? '' : v).trim(); }
function cents(v) { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : 0; }
function trim(v) { return String(v || '').replace(/\/+$/, ''); }
function parse(text) { try { return text ? JSON.parse(text) : null; } catch { return null; } }
function money(centsValue) { return '$' + (cents(centsValue) / 100).toFixed(2); }
function title(value) { const s = clean(value); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function esc(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
