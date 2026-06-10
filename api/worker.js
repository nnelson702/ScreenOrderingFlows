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
          phase: 'staff-access-sessions-v1'
        }));
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        return cors(request, env, json({
          ok: true,
          service: 'screen-ordering-api',
          phase: 'staff-access-sessions-v1',
          env: envStatus(env)
        }));
      }

      if (request.method === 'POST' && url.pathname === '/api/staff/login') {
        return cors(request, env, await staffLogin(request, env));
      }

      if (request.method === 'POST' && url.pathname === '/api/staff/logout') {
        return cors(request, env, await staffLogout(request, env));
      }

      if (request.method === 'POST' && url.pathname === '/api/staff/access/list') {
        return cors(request, env, await listStaffAccess(request, env));
      }

      if (request.method === 'POST' && url.pathname === '/api/staff/access/create') {
        return cors(request, env, await createStaffAccess(request, env));
      }

      if (request.method === 'POST' && url.pathname === '/api/staff/access/rotate') {
        return cors(request, env, await rotateStaffAccess(request, env));
      }

      if (request.method === 'POST' && url.pathname === '/api/staff/access/deactivate') {
        return cors(request, env, await setStaffAccessActive(request, env, false));
      }

      if (request.method === 'POST' && url.pathname === '/api/staff/access/reactivate') {
        return cors(request, env, await setStaffAccessActive(request, env, true));
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

      if (request.method === 'POST' && url.pathname === '/api/quote/search') {
        return cors(request, env, await searchQuotes(request, env));
      }

      if (request.method === 'POST' && url.pathname === '/api/quote/admin-view') {
        return cors(request, env, await adminViewQuote(request, env));
      }

      if (request.method === 'GET' && url.pathname.startsWith('/api/vendor-packet/view/')) {
        const packetToken = url.pathname.split('/').pop();
        return cors(request, env, await viewVendorPacket(env, packetToken));
      }

      if (request.method === 'POST' && url.pathname === '/api/vendor-packet/mark-sent-to-vendor') {
        return cors(request, env, await markVendorPacketSentToVendor(request, env));
      }

      if (request.method === 'POST' && url.pathname === '/api/vendor-packet/send-to-store') {
        return cors(request, env, await sendVendorPacketToStoreEndpoint(request, env));
      }

      if (request.method === 'POST' && url.pathname === '/api/quote/status') {
        return cors(request, env, await updateQuoteStatus(request, env));
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

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({
      error: 'Invalid JSON body',
      message: String(err && err.message ? err.message : err)
    }, 400);
  }

  const customer = body.customer || {};
  const store = body.store || {};
  const fulfillment = body.fulfillment || {};
  const totals = body.totals || {};
  const items = Array.isArray(body.items) ? body.items : [];

  if (!customer.name || !customer.email) {
    return json({ error: 'Missing customer name or email' }, 400);
  }

  if (!store.name || !store.email) {
    return json({ error: 'Missing store name or email' }, 400);
  }

  if (!items.length) {
    return json({ error: 'Quote must include at least one screen item' }, 400);
  }

  const subtotal = cents(totals.subtotal_cents);
  const delivery = cents(totals.delivery_cents);
  const tax = cents(totals.tax_cents);
  const total = cents(totals.total_cents);

  if (total <= 0) {
    return json({ error: 'Computed total invalid' }, 400);
  }

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
    status: 'quote_created',
    view_token: token(40),
    validity_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),

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
  if (!insertedQuote.ok) {
    return json({ error: 'Supabase quote insert failed', details: insertedQuote.error }, 500);
  }

  const quote = insertedQuote.data && insertedQuote.data[0];
  if (!quote || !quote.id) {
    return json({ error: 'Supabase did not return quote id', details: insertedQuote.data }, 500);
  }

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
    crossbar_type: item.crossbar_type == null ? null : String(item.crossbar_type),
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
    await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quote.id), {
      status: 'payment_link_failed'
    });

    return json({
      error: 'Stripe checkout session create failed: ' + summarizeStripeError(checkout.error),
      quote_id: quote.id,
      details: checkout.error
    }, 500);
  }

  const updated = await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quote.id), {
    stripe_session_id: checkout.data.id,
    payment_url: checkout.data.url,
    fulfillment_method: quotePayload.fulfillment_method,
    delivery_distance_miles: quotePayload.delivery_distance_miles,
    delivery_fee_cents: quotePayload.delivery_fee_cents
  });

  if (!updated.ok) {
    return json({
      error: 'Supabase payment fields update failed',
      quote_id: quote.id,
      payment_url: checkout.data.url,
      details: updated.error
    }, 500);
  }

  const updatedQuote = {
    ...quote,
    status: quotePayload.status,
    stripe_session_id: checkout.data.id,
    payment_url: checkout.data.url,
    fulfillment_method: quotePayload.fulfillment_method,
    delivery_distance_miles: quotePayload.delivery_distance_miles,
    delivery_fee_cents: quotePayload.delivery_fee_cents
  };

  const emailStatus = await sendQuoteCreatedEmails(env, updatedQuote, itemRows);

  return json({
    ok: true,
    quote_id: quote.id,
    id: quote.id,
    payment_url: checkout.data.url,
    email_status: emailStatus,
    quote: {
      id: quote.id,
      status: quotePayload.status,
      view_token: quote.view_token,
      total_cents: quote.total_cents,
      payment_url: checkout.data.url,
      stripe_session_id: checkout.data.id
    }
  });
}

async function viewQuote(env, viewToken) {
  if (!viewToken) return json({ error: 'Missing view token' }, 400);

  const loaded = await loadQuoteWithItemsByFilter(env, 'view_token=eq.' + encodeURIComponent(viewToken));
  if (!loaded.ok) {
    return json({ error: loaded.error, details: loaded.details }, loaded.status || 500);
  }

  return json({ ok: true, quote: loaded.quote, items: loaded.items });
}

async function searchQuotes(request, env) {
  const staff = await requireStaff(request, env);
  if (!staff.ok) return staff.response;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const term = clean(body.search || body.term || '').toLowerCase();
  const status = clean(body.status || 'all').toLowerCase();
  const storeId = clean(body.store_id || body.store || 'all');
  const fulfillment = clean(body.fulfillment_method || 'all').toLowerCase();
  const limit = Math.min(Math.max(Number(body.limit || 150), 1), 500);

  const query = [
    'order=created_at.desc',
    'limit=' + limit
  ];

  if (status && status !== 'all') {
    query.push('status=eq.' + encodeURIComponent(status));
  }

  if (storeId && storeId !== 'all') {
    query.push('store_id=eq.' + encodeURIComponent(storeId));
  }

  if (fulfillment && fulfillment !== 'all') {
    query.push('fulfillment_method=eq.' + encodeURIComponent(fulfillment));
  }

  const result = await sbSelect(env, 'quotes', query.join('&'));
  if (!result.ok) {
    return json({ ok: false, error: 'Supabase quote search failed', details: result.error }, 500);
  }

  let rows = result.data || [];
  if (term) {
    rows = rows.filter((quote) => quoteMatchesTerm(quote, term));
  }

  return json({
    ok: true,
    count: rows.length,
    quotes: rows.map(adminQuoteSummary)
  });
}

async function adminViewQuote(request, env) {
  const staff = await requireStaff(request, env);
  if (!staff.ok) return staff.response;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const quoteId = clean(body.quote_id);
  if (!quoteId) return json({ ok: false, error: 'Missing quote_id' }, 400);

  const loaded = await loadQuoteWithItemsByFilter(env, 'id=eq.' + encodeURIComponent(quoteId));
  if (!loaded.ok) {
    return json({ ok: false, error: loaded.error, details: loaded.details }, loaded.status || 500);
  }

  return json({ ok: true, quote: loaded.quote, items: loaded.items });
}

async function viewVendorPacket(env, packetToken) {
  if (!packetToken) return json({ ok: false, error: 'Missing packet token' }, 400);

  const tokenHash = await sha256Hex(packetToken);
  const loaded = await loadQuoteWithItemsByFilter(
    env,
    'vendor_packet_token_hash=eq.' + encodeURIComponent(tokenHash) + '&limit=1'
  );

  if (!loaded.ok) {
    return json({ ok: false, error: loaded.error, details: loaded.details }, loaded.status || 500);
  }

  if (!isOperationalVendorStatus(loaded.quote.status)) {
    return json({
      ok: false,
      error: 'Vendor packet unavailable for current quote status',
      allowed_statuses: ['in_production', 'ready', 'completed']
    }, 403);
  }

  let quote = loaded.quote;
  if (quote.vendor_packet_status !== 'sent_to_vendor') {
    const now = new Date().toISOString();
    const patch = {
      vendor_packet_status: 'opened_by_store',
      vendor_packet_opened_at: now,
      vendor_packet_opened_by: quote.store_email || 'packet_link'
    };

    const updated = await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quote.id), patch);
    if (!updated.ok) {
      return json({ ok: false, error: 'Supabase vendor packet update failed', details: updated.error }, 500);
    }

    quote = { ...quote, ...patch };
  }

  return json({ ok: true, quote, items: loaded.items });
}

async function updateQuoteStatus(request, env) {
  const staff = await requireStaff(request, env);
  if (!staff.ok) return staff.response;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const quoteId = clean(body.quote_id);
  const status = clean(body.status).toLowerCase();
  const paymentMethod = clean(body.payment_method);
  const posReceiptNumber = clean(body.pos_receipt_number);
  const posNotes = clean(body.pos_notes);

  if (!quoteId) return json({ ok: false, error: 'Missing quote_id' }, 400);
  if (!status) return json({ ok: false, error: 'Missing status' }, 400);

  const validStatuses = ['in_production', 'ready', 'completed', 'cancelled', 'expired'];
  if (!validStatuses.includes(status)) {
    return json({
      ok: false,
      error: 'Invalid status',
      allowed_statuses: validStatuses
    }, 400);
  }

  const current = await loadQuoteWithItemsByFilter(env, 'id=eq.' + encodeURIComponent(quoteId));
  if (!current.ok) {
    return json({ ok: false, error: current.error, details: current.details }, current.status || 500);
  }

  const transitioningIntoProduction = status === 'in_production' && current.quote.status !== 'in_production';
  const now = new Date().toISOString();
  const patch = {
    status,
    status_updated_at: now
  };

  if (status === 'in_production') {
    patch.payment_method = paymentMethod || 'in_store';
    patch.paid_at = now;
    if (posReceiptNumber) patch.pos_receipt_number = posReceiptNumber;
    if (posNotes) patch.pos_notes = posNotes;
  }

  if (status === 'ready') {
    patch.ready_at = now;
    if (posNotes) patch.pos_notes = posNotes;
  }

  if (status === 'completed') {
    patch.completed_at = now;
    if (posNotes) patch.pos_notes = posNotes;
  }

  if (status === 'cancelled') {
    patch.cancelled_at = now;
    if (posNotes) patch.pos_notes = posNotes;
  }

  if (status === 'expired') {
    patch.expired_at = now;
    if (posNotes) patch.pos_notes = posNotes;
  }

  const updated = await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quoteId), patch);
  if (!updated.ok) {
    return json({ ok: false, error: 'Supabase status update failed', details: updated.error }, 500);
  }

  let emailStatus = null;
  const loaded = await loadQuoteWithItemsByFilter(env, 'id=eq.' + encodeURIComponent(quoteId));

  if (loaded.ok) {
    if (status === 'in_production') {
      emailStatus = await sendPaymentReceivedEmails(env, loaded.quote, loaded.items);
      emailStatus.vendor_packet = transitioningIntoProduction
        ? await maybeAutoSendVendorPacket(env, loaded.quote, loaded.items)
        : { skipped: true, reason: 'Quote already in production' };
    }

    if (status === 'ready') {
      emailStatus = await sendReadyEmails(env, loaded.quote, loaded.items);
    }

    if (status === 'completed') {
      emailStatus = await sendCompletedEmails(env, loaded.quote, loaded.items);
    }
  }

  return json({
    ok: true,
    quote_id: quoteId,
    status,
    email_status: emailStatus
  });
}

async function markVendorPacketSentToVendor(request, env) {
  const staff = await requireStaff(request, env);
  if (!staff.ok) return staff.response;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const quoteId = clean(body.quote_id);
  const method = clean(body.method || 'email') || 'email';
  const notes = clean(body.notes);

  if (!quoteId) return json({ ok: false, error: 'Missing quote_id' }, 400);

  const loaded = await loadQuoteWithItemsByFilter(env, 'id=eq.' + encodeURIComponent(quoteId));
  if (!loaded.ok) {
    return json({ ok: false, error: loaded.error, details: loaded.details }, loaded.status || 500);
  }

  const now = new Date().toISOString();
  const updated = await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quoteId), {
    vendor_packet_status: 'sent_to_vendor',
    vendor_order_sent_to_vendor_at: now,
    vendor_order_sent_to_vendor_by:
      staff.staff.label ||
      staff.staff.store_name ||
      staff.staff.access_key_id ||
      'staff',
    vendor_order_sent_to_vendor_method: method,
    vendor_order_sent_to_vendor_notes: notes || null
  });

  if (!updated.ok) {
    return json({ ok: false, error: 'Supabase vendor packet update failed', details: updated.error }, 500);
  }

  return json({ ok: true, quote_id: quoteId });
}

async function sendVendorPacketToStoreEndpoint(request, env) {
  const staff = await requireStaff(request, env);
  if (!staff.ok) return staff.response;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const quoteId = clean(body.quote_id);
  if (!quoteId) return json({ ok: false, error: 'Missing quote_id' }, 400);

  const loaded = await loadQuoteWithItemsByFilter(env, 'id=eq.' + encodeURIComponent(quoteId));
  if (!loaded.ok) {
    return json({ ok: false, error: loaded.error, details: loaded.details }, loaded.status || 500);
  }

  const emailStatus = await sendVendorPacketToStore(env, loaded.quote, loaded.items);
  return json({ ok: true, quote_id: quoteId, email_status: emailStatus });
}

async function loadQuoteWithItemsByFilter(env, filter) {
  const q = await sbSelect(env, 'quotes', filter);
  if (!q.ok) {
    return {
      ok: false,
      error: 'Supabase quote select failed',
      details: q.error,
      status: 500
    };
  }

  const quote = q.data && q.data[0];
  if (!quote) {
    return {
      ok: false,
      error: 'Quote not found',
      status: 404
    };
  }

  const items = await sbSelect(env, 'quote_items', 'quote_id=eq.' + encodeURIComponent(quote.id) + '&order=sort_index.asc');
  if (!items.ok) {
    return {
      ok: false,
      error: 'Supabase quote_items select failed',
      details: items.error,
      status: 500
    };
  }

  return {
    ok: true,
    quote,
    items: items.data || []
  };
}

async function requireStaff(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const tokenValue = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!tokenValue) {
    return {
      ok: false,
      response: json({ ok: false, error: 'Unauthorized' }, 401)
    };
  }

  const missing = missingEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  if (missing.length) {
    return {
      ok: false,
      response: json({
        ok: false,
        error: 'Missing required staff session environment variables',
        missing,
        env: envStatus(env)
      }, 500)
    };
  }

  const tokenHash = await sha256Hex(tokenValue);
  const now = new Date().toISOString();

  const sessionResult = await sbSelect(
    env,
    'staff_sessions',
    'token_hash=eq.' + encodeURIComponent(tokenHash) +
      '&revoked_at=is.null' +
      '&expires_at=gt.' + encodeURIComponent(now) +
      '&limit=1'
  );

  if (!sessionResult.ok) {
    return {
      ok: false,
      response: json({
        ok: false,
        error: 'Staff session lookup failed',
        details: sessionResult.error
      }, 500)
    };
  }

  const session = sessionResult.data && sessionResult.data[0];
  if (!session) {
    return {
      ok: false,
      response: json({ ok: false, error: 'Unauthorized or expired staff session' }, 401)
    };
  }

  await sbPatch(env, 'staff_sessions', 'id=eq.' + encodeURIComponent(session.id), {
    last_used_at: now
  });

  return {
    ok: true,
    staff: {
      session_id: session.id,
      access_key_id: session.access_key_id,
      role: session.role,
      label: session.label,
      store_id: session.store_id,
      store_name: session.store_name
    }
  };
}

async function requireTopAdmin(request, env) {
  const staff = await requireStaff(request, env);
  if (!staff.ok) return staff;

  const role = staff.staff && staff.staff.role;
  if (role !== 'top_admin') {
    return {
      ok: false,
      response: json({ ok: false, error: 'Top admin access required' }, 403)
    };
  }

  return staff;
}

async function staffLogin(request, env) {
  const missing = missingEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  if (missing.length) {
    return json({
      ok: false,
      error: 'Missing required staff login environment variables',
      missing,
      env: envStatus(env)
    }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const accessValue = clean(
    body.access_value ||
    body.staff_access ||
    body.passphrase ||
    body.password
  );

  if (!accessValue) {
    return json({ ok: false, error: 'Missing staff access value' }, 400);
  }

  const accessHash = await sha256Hex(accessValue);

  const accessResult = await sbSelect(
    env,
    'staff_access_keys',
    'access_hash=eq.' + encodeURIComponent(accessHash) +
      '&is_active=eq.true' +
      '&limit=1'
  );

  if (!accessResult.ok) {
    return json({
      ok: false,
      error: 'Staff access lookup failed',
      details: accessResult.error
    }, 500);
  }

  const accessKey = accessResult.data && accessResult.data[0];
  if (!accessKey) {
    return json({ ok: false, error: 'Access rejected' }, 401);
  }

  const sessionToken = token(64);
  const sessionTokenHash = await sha256Hex(sessionToken);
  const now = new Date().toISOString();
  const sessionHours = Math.min(Math.max(Number(env.STAFF_SESSION_HOURS || 12), 1), 24);
  const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000).toISOString();

  const insertedSession = await sbInsert(env, 'staff_sessions', {
    access_key_id: accessKey.id,
    role: accessKey.role,
    label: accessKey.label,
    store_id: accessKey.store_id,
    store_name: accessKey.store_name,
    token_hash: sessionTokenHash,
    expires_at: expiresAt,
    last_used_at: now
  });

  if (!insertedSession.ok) {
    return json({
      ok: false,
      error: 'Staff session create failed',
      details: insertedSession.error
    }, 500);
  }

  await sbPatch(env, 'staff_access_keys', 'id=eq.' + encodeURIComponent(accessKey.id), {
    last_used_at: now
  });

  const session = insertedSession.data && insertedSession.data[0];

  return json({
    ok: true,
    token: sessionToken,
    session: {
      id: session ? session.id : null,
      role: accessKey.role,
      label: accessKey.label,
      store_id: accessKey.store_id,
      store_name: accessKey.store_name,
      expires_at: expiresAt
    }
  });
}

async function staffLogout(request, env) {
  const staff = await requireStaff(request, env);
  if (!staff.ok) return staff.response;

  if (staff.staff && staff.staff.session_id) {
    await sbPatch(env, 'staff_sessions', 'id=eq.' + encodeURIComponent(staff.staff.session_id), {
      revoked_at: new Date().toISOString()
    });
  }

  return json({ ok: true });
}

async function listStaffAccess(request, env) {
  const admin = await requireTopAdmin(request, env);
  if (!admin.ok) return admin.response;

  const result = await sbSelect(env, 'staff_access_keys', 'order=store_id.asc,label.asc');

  if (!result.ok) {
    return json({
      ok: false,
      error: 'Staff access list failed',
      details: result.error
    }, 500);
  }

  return json({
    ok: true,
    access_keys: (result.data || []).map(safeStaffAccessKey)
  });
}

async function createStaffAccess(request, env) {
  const admin = await requireTopAdmin(request, env);
  if (!admin.ok) return admin.response;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const label = clean(body.label);
  const storeId = clean(body.store_id);
  const storeName = clean(body.store_name);
  const role = clean(body.role || 'store').toLowerCase();
  const accessValue = clean(body.access_value || body.passphrase || body.password);

  if (!label) return json({ ok: false, error: 'Missing label' }, 400);
  if (!['store', 'top_admin'].includes(role)) return json({ ok: false, error: 'Invalid role' }, 400);
  if (!accessValue || accessValue.length < 8) {
    return json({ ok: false, error: 'Access value must be at least 8 characters' }, 400);
  }

  const accessHash = await sha256Hex(accessValue);

  const inserted = await sbInsert(env, 'staff_access_keys', {
    label,
    store_id: storeId || null,
    store_name: storeName || null,
    role,
    access_hash: accessHash,
    is_active: true,
    created_by_access_key_id: admin.staff.access_key_id || null
  });

  if (!inserted.ok) {
    return json({
      ok: false,
      error: 'Staff access create failed',
      details: inserted.error
    }, 500);
  }

  return json({
    ok: true,
    access_key: safeStaffAccessKey(inserted.data && inserted.data[0])
  });
}

async function rotateStaffAccess(request, env) {
  const admin = await requireTopAdmin(request, env);
  if (!admin.ok) return admin.response;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const id = clean(body.id || body.access_key_id);
  const accessValue = clean(body.access_value || body.passphrase || body.password);

  if (!id) return json({ ok: false, error: 'Missing access key id' }, 400);
  if (!accessValue || accessValue.length < 8) {
    return json({ ok: false, error: 'New access value must be at least 8 characters' }, 400);
  }

  const now = new Date().toISOString();
  const accessHash = await sha256Hex(accessValue);

  const updated = await sbPatch(env, 'staff_access_keys', 'id=eq.' + encodeURIComponent(id), {
    access_hash: accessHash,
    is_active: true,
    rotated_at: now,
    revoked_at: null
  });

  if (!updated.ok) {
    return json({
      ok: false,
      error: 'Staff access rotation failed',
      details: updated.error
    }, 500);
  }

  await sbPatch(env, 'staff_sessions', 'access_key_id=eq.' + encodeURIComponent(id), {
    revoked_at: now
  });

  return json({ ok: true, id, rotated_at: now });
}

async function setStaffAccessActive(request, env, active) {
  const admin = await requireTopAdmin(request, env);
  if (!admin.ok) return admin.response;

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const id = clean(body.id || body.access_key_id);
  if (!id) return json({ ok: false, error: 'Missing access key id' }, 400);

  const now = new Date().toISOString();

  const patch = active
    ? { is_active: true, revoked_at: null }
    : { is_active: false, revoked_at: now };

  const updated = await sbPatch(env, 'staff_access_keys', 'id=eq.' + encodeURIComponent(id), patch);

  if (!updated.ok) {
    return json({
      ok: false,
      error: active ? 'Staff access reactivate failed' : 'Staff access deactivate failed',
      details: updated.error
    }, 500);
  }

  if (!active) {
    await sbPatch(env, 'staff_sessions', 'access_key_id=eq.' + encodeURIComponent(id), {
      revoked_at: now
    });
  }

  return json({ ok: true, id, is_active: active });
}

function safeStaffAccessKey(row) {
  if (!row) return null;

  return {
    id: row.id,
    label: row.label,
    store_id: row.store_id,
    store_name: row.store_name,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
    rotated_at: row.rotated_at,
    revoked_at: row.revoked_at,
    last_used_at: row.last_used_at
  };
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function adminQuoteSummary(quote) {
  return {
    id: quote.id,
    order_number: quote.order_number || null,
    created_at: quote.created_at,
    status: quote.status,
    customer_name: quote.customer_name,
    customer_phone: quote.customer_phone,
    customer_email: quote.customer_email,
    store_id: quote.store_id,
    store_name: quote.store_name,
    fulfillment_method: quote.fulfillment_method,
    total_cents: quote.total_cents,
    payment_method: quote.payment_method,
    pos_receipt_number: quote.pos_receipt_number,
    paid_at: quote.paid_at,
    ready_at: quote.ready_at,
    completed_at: quote.completed_at,
    status_updated_at: quote.status_updated_at,
    validity_expires_at: quote.validity_expires_at,
    payment_url: quote.payment_url,
    view_token: quote.view_token
  };
}

function quoteMatchesTerm(quote, term) {
  const phoneTerm = digits(term);
  const haystack = [
    quote.id,
    quote.order_number,
    quote.customer_name,
    quote.customer_phone,
    quote.customer_email,
    quote.store_name,
    quote.status
  ].map((value) => clean(value).toLowerCase()).join(' ');

  if (haystack.includes(term)) return true;
  if (phoneTerm && digits(quote.customer_phone).includes(phoneTerm)) return true;
  return false;
}

function digits(value) {
  return clean(value).replace(/\D/g, '');
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
      const current = await loadQuoteWithItemsByFilter(env, 'id=eq.' + encodeURIComponent(quoteId));
      const previousStatus = current.ok ? clean(current.quote.status).toLowerCase() : '';
      const now = new Date().toISOString();

      await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quoteId), {
        status: 'in_production',
        payment_method: 'stripe',
        stripe_session_id: session.id || null,
        stripe_payment_intent_id: session.payment_intent || null,
        paid_at: now,
        status_updated_at: now
      });

      const loaded = await loadQuoteWithItemsByFilter(env, 'id=eq.' + encodeURIComponent(quoteId));
      if (loaded.ok) {
        await sendPaymentReceivedEmails(env, loaded.quote, loaded.items);
        // If the pre-patch read failed, fall back to vendor packet state so a transient read failure
        // does not block the initial vendor packet send after Stripe moves the order into production.
        const inferredTransition = previousStatus
          ? previousStatus !== 'in_production'
          : vendorPacketStatusAllowsAutoSend(loaded.quote.vendor_packet_status);
        if (inferredTransition) {
          await maybeAutoSendVendorPacket(env, loaded.quote, loaded.items);
        }
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
  const paymentUrl = clean(quote.payment_url || '');
  const customerSubject = 'ACE Screen Quote Created - Action Required to Place Order';
  const storeSubject = 'New Screen Quote Created - Customer Follow-Up Required';

  results.push(await sendEmail(env, {
    to: quote.customer_email,
    subject: customerSubject,
    html: customerQuoteHtml(env, quote, items, paymentUrl),
    text: customerQuoteText(env, quote, items, paymentUrl)
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
  const packetTokenResult = await createOrReuseVendorPacketToken(env, quote);
  if (packetTokenResult.ok && packetTokenResult.quote) {
    Object.assign(quote, packetTokenResult.quote);
  }
  const vendorFormsLink = packetTokenResult.ok
    ? vendorFormsBaseUrl(env) + '/vendor-forms.html?packet_token=' + encodeURIComponent(packetTokenResult.token)
    : '';

  results.push(await sendEmail(env, {
    to: quote.customer_email,
    subject: 'Production Started - Your ACE Screen Order Is Now In Progress',
    html: paymentReceivedCustomerHtml(quote, items),
    text: paymentReceivedCustomerText(quote, items)
  }));

  results.push(await sendEmail(env, {
    to: quote.store_email,
    subject: 'Paid Screen Order - Production Started / Vendor Submission Required',
    html: paidStoreNoticeHtml(quote, items, vendorFormsLink),
    text: paidStoreNoticeText(quote, items, vendorFormsLink)
  }));

  return { attempted: true, results };
}

async function sendReadyEmails(env, quote, items) {
  if (!env.RESEND_API_KEY) return { skipped: true, reason: 'RESEND_API_KEY not set' };

  const fulfillment = clean(quote.fulfillment_method || 'pickup').toLowerCase();
  const readyPhrase = fulfillment === 'delivery'
    ? 'ready for delivery scheduling'
    : 'ready for pickup';
  const customerSubject = fulfillment === 'delivery'
    ? 'Ready for Delivery Scheduling - Your ACE Screen Order Is Ready'
    : 'Ready for Pickup - Your ACE Screen Order Is Ready';

  const results = [];

  results.push(await sendEmail(env, {
    to: quote.customer_email,
    subject: customerSubject,
    html: readyCustomerHtml(quote, items, readyPhrase),
    text: readyCustomerText(quote, items, readyPhrase)
  }));

  return { attempted: true, results };
}

async function sendCompletedEmails(env, quote, items) {
  if (!env.RESEND_API_KEY) return { skipped: true, reason: 'RESEND_API_KEY not set' };

  const results = [];

  results.push(await sendEmail(env, {
    to: quote.customer_email,
    subject: 'Thank You - Your ACE Screen Order Is Complete',
    html: completedCustomerHtml(quote, items),
    text: completedCustomerText(quote, items)
  }));

  results.push(await sendEmail(env, {
    to: quote.store_email,
    subject: 'Screen Order Completed - ' + clean(quote.id) + ' - ' + clean(quote.customer_name),
    html: completedStoreHtml(quote, items),
    text: completedStoreText(quote, items)
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

function customerQuoteHtml(env, quote, items, paymentUrl) {
  const downloadUrl = quoteDownloadUrl(env, quote);
  const payCta = paymentUrl
    ? `<a href="${esc(paymentUrl)}" style="display:inline-block;background:#b01c2e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold;margin:0 8px 8px 0;">Pay Now</a>`
    : '';
  const downloadCta = downloadUrl
    ? `<a href="${esc(downloadUrl)}" style="display:inline-block;background:#333;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold;margin:0 8px 8px 0;">View / Download Quote</a>`
    : '';

  return customerEmailShell({
    statusStep: 'quote',
    titleText: 'Quote Created',
    statusLabel: 'QUOTE CREATED',
    statusMessage: 'Action required to place your order',
    bodyHtml: `
      <p>Your screen quote has been created, but your order has not been placed yet.</p>
      <p>Please review your quote for accuracy. When everything looks correct, you can pay online or visit your selected store to place the order.</p>
      <p>${payCta}${downloadCta}</p>
      <p><strong>Important:</strong> Production does not begin until payment is received. Once payment is received, your custom order will move into production and may no longer be edited or cancelled.</p>
      ${customerOrderInfoHtml(quote, { includeValidity: true })}
      ${storeAndTotalSummaryHtml(quote)}
      ${screenSummaryHtml(items)}
    `
  });
}

function customerQuoteText(env, quote, items, paymentUrl) {
  const downloadUrl = quoteDownloadUrl(env, quote);
  const sections = [
    'SKYE ACE HARDWARE | SCREEN TOOL',
    'QUOTE > PRODUCTION > READY > COMPLETE',
    'QUOTE CREATED - Action required to place your order',
    '',
    'Your screen quote has been created, but your order has not been placed yet.',
    'Please review your quote for accuracy. When everything looks correct, you can pay online or visit your selected store to place the order.'
  ];

  if (paymentUrl) {
    sections.push('', 'Pay now:', paymentUrl);
  }

  if (downloadUrl) {
    sections.push('', 'View / Download quote:', downloadUrl);
  }

  sections.push(
    '',
    'Important: Production does not begin until payment is received. Once payment is received, your custom order will move into production and may no longer be edited or cancelled.',
    '',
    customerOrderInfoText(quote, { includeValidity: true }),
    '',
    storeAndTotalSummaryText(quote),
    '',
    screenSummaryText(items)
  );

  return sections.join('\n');
}

function storeQuoteCreatedHtml(quote, items) {
  return operationalStoreEmailShell('NEW SCREEN QUOTE CREATED', `
    <p><strong>Customer follow-up required if not paid within 2 days.</strong></p>
    <p>A customer screen quote has been created. If the customer has not yet paid on their own, a store representative must make contact within 2 days to ensure the customer does not require assistance or have any questions.</p>
    <p>Do not begin production until the quote is accepted and paid for.</p>
    ${customerSearchDetailsHtml(quote)}
    ${orderDetailsHtml(quote, { includePaymentMethod: true })}
    <p><strong>Next steps:</strong></p>
    <ol>
      <li>Watch for payment or dashboard status change.</li>
      <li>If unpaid after 2 days, contact the customer.</li>
      <li>Answer questions or assist with order placement.</li>
      <li>Do not submit vendor forms until the order is paid/in production.</li>
    </ol>
  `);
}

function storeQuoteCreatedText(quote, items) {
  return [
    'NEW SCREEN QUOTE CREATED',
    'Customer follow-up required if not paid within 2 days',
    '',
    'A customer screen quote has been created. If the customer has not yet paid on their own, a store representative must make contact within 2 days to ensure the customer does not require assistance or have any questions.',
    'Do not begin production until the quote is accepted and paid for.',
    '',
    customerSearchDetailsText(quote),
    '',
    orderDetailsText(quote, { includePaymentMethod: true }),
    '',
    'Next steps:',
    '1. Watch for payment or dashboard status change.',
    '2. If unpaid after 2 days, contact the customer.',
    '3. Answer questions or assist with order placement.',
    '4. Do not submit vendor forms until the order is paid/in production.'
  ].join('\n');
}

function paymentReceivedCustomerHtml(quote, items) {
  return customerEmailShell({
    statusStep: 'production',
    titleText: 'Production Started',
    statusLabel: 'PRODUCTION STARTED',
    statusMessage: 'Your custom order is now in progress',
    bodyHtml: `
      <p>Payment has been received. Your custom screen order has moved into production.</p>
      <p><strong>Because this is a custom-made order, it can no longer be edited, cancelled, or returned from this point forward.</strong></p>
      <p>Your selected store and vendor production process are now underway. We will notify you when your order is ready for pickup or delivery scheduling.</p>
      ${customerOrderInfoHtml(quote)}
      ${storeAndTotalSummaryHtml(quote)}
      ${screenSummaryHtml(items)}
    `
  });
}

function paymentReceivedCustomerText(quote, items) {
  return [
    'SKYE ACE HARDWARE | SCREEN TOOL',
    'QUOTE > PRODUCTION > READY > COMPLETE',
    'PRODUCTION STARTED - Your custom order is now in progress',
    '',
    'Payment has been received. Your custom screen order has moved into production.',
    'Because this is a custom-made order, it can no longer be edited, cancelled, or returned from this point forward.',
    'Your selected store and vendor production process are now underway. We will notify you when your order is ready for pickup or delivery scheduling.',
    '',
    customerOrderInfoText(quote),
    '',
    storeAndTotalSummaryText(quote),
    '',
    screenSummaryText(items)
  ].join('\n');
}

function paidStoreNoticeHtml(quote, items, vendorFormsLink) {
  const vendorLinkHtml = vendorFormsLink
    ? `<p><a href="${esc(vendorFormsLink)}" style="color:#0b57d0;">Open vendor forms</a></p>`
    : '<p>Vendor forms link unavailable. Open the dashboard order and generate forms manually.</p>';

  return operationalStoreEmailShell('PAID SCREEN ORDER - PRODUCTION STARTED', `
    <p><strong>Vendor submission required.</strong></p>
    <p>A customer quote has been accepted and paid for.</p>
    <p><strong>Action required:</strong></p>
    <ol>
      <li>Use the link in this email to generate/open vendor forms.</li>
      <li>Validate the order matches the dashboard.</li>
      <li>Submit the order to the vendor.</li>
      <li>Update submission status in the dashboard.</li>
      <li>If online payment was made, process through POS to record the sale in Business Advisor.</li>
    </ol>
    ${vendorLinkHtml}
    ${customerSearchDetailsHtml(quote)}
    ${orderDetailsHtml(quote, { includePaymentMethod: true })}
  `);
}

function paidStoreNoticeText(quote, items, vendorFormsLink) {
  return [
    'PAID SCREEN ORDER - PRODUCTION STARTED',
    'Vendor submission required',
    '',
    'A customer quote has been accepted and paid for.',
    '',
    'Action required:',
    '1. Use the link in this email to generate/open vendor forms.',
    '2. Validate the order matches the dashboard.',
    '3. Submit the order to the vendor.',
    '4. Update submission status in the dashboard.',
    '5. If online payment was made, process through POS to record the sale in Business Advisor.',
    '',
    'Open vendor forms:',
    vendorFormsLink || 'Vendor forms link unavailable. Open the dashboard order and generate forms manually.',
    '',
    customerSearchDetailsText(quote),
    '',
    orderDetailsText(quote, { includePaymentMethod: true })
  ].join('\n');
}

function vendorPacketHtml(quote, items, link) {
  return emailShell('Vendor forms ready', `
    <p>The vendor forms packet is ready for <strong>${esc(quote.customer_name)}</strong>.</p>
    <p><strong>Store:</strong> ${esc(quote.store_name)}<br><strong>Quote ID:</strong> ${esc(quote.id)}<br><strong>Total:</strong> ${esc(money(quote.total_cents))}</p>
    <p><a href="${esc(link)}" style="display:inline-block;background:#b01c2e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold;">Open Vendor Forms</a></p>
    <p>Please open the link, save or print the vendor forms, send the packet to ScreenFab/vendor, then mark it sent in the staff portal.</p>
    ${quoteSummaryHtml(quote, items)}
  `);
}

function vendorPacketText(quote, items, link) {
  return [
    'Vendor forms are ready.',
    '',
    'Customer: ' + quote.customer_name,
    'Store: ' + quote.store_name,
    'Quote ID: ' + quote.id,
    'Total: ' + money(quote.total_cents),
    '',
    'Open Vendor Forms:',
    link,
    '',
    'Please open the link, save or print the vendor forms, send the packet to ScreenFab/vendor, then mark it sent in the staff portal.',
    '',
    quoteSummaryText(quote, items)
  ].join('\n');
}

function readyCustomerHtml(quote, items, readyPhrase) {
  const fulfillment = clean(quote.fulfillment_method || 'pickup').toLowerCase();
  const isDelivery = fulfillment === 'delivery';
  const titleText = isDelivery ? 'Ready for Delivery Scheduling' : 'Ready for Pickup';
  const statusLabel = isDelivery ? 'READY FOR DELIVERY SCHEDULING' : 'READY FOR PICKUP';
  const statusMessage = isDelivery
    ? 'Your screen order is ready'
    : 'Your screen order is ready at your selected store';
  const nextStepHtml = isDelivery
    ? '<p>Your selected store will contact you soon to schedule delivery of your order.</p>'
    : '<p>Please visit your selected store when convenient. Bring your quote ID or a copy of this email so the team can quickly locate your order.</p>';

  return customerEmailShell({
    statusStep: 'ready',
    titleText,
    statusLabel,
    statusMessage,
    bodyHtml: `
      <p>Your custom screen order is ${esc(readyPhrase)}.</p>
      ${nextStepHtml}
      ${customerOrderInfoHtml(quote)}
      ${storeAndTotalSummaryHtml(quote)}
      ${screenSummaryHtml(items)}
    `
  });
}

function readyCustomerText(quote, items, readyPhrase) {
  const fulfillment = clean(quote.fulfillment_method || 'pickup').toLowerCase();
  const isDelivery = fulfillment === 'delivery';
  return [
    'SKYE ACE HARDWARE | SCREEN TOOL',
    'QUOTE > PRODUCTION > READY > COMPLETE',
    (isDelivery ? 'READY FOR DELIVERY SCHEDULING' : 'READY FOR PICKUP') + ' - Your screen order is ready',
    '',
    'Your custom screen order is ' + readyPhrase + '.',
    isDelivery
      ? 'Your selected store will contact you soon to schedule delivery of your order.'
      : 'Please visit your selected store when convenient. Bring your quote ID or a copy of this email so the team can quickly locate your order.',
    '',
    customerOrderInfoText(quote),
    '',
    storeAndTotalSummaryText(quote),
    '',
    screenSummaryText(items)
  ].join('\n');
}

function completedCustomerHtml(quote, items) {
  return customerEmailShell({
    statusStep: 'complete',
    titleText: 'Order Complete',
    statusLabel: 'ORDER COMPLETE',
    statusMessage: 'Thank you for your business',
    bodyHtml: `
      <p>Your screen order has been completed.</p>
      <p>Thank you for trusting Helpful ACE Hardware. We value you as a customer and neighbor.</p>
      <p>We keep your invoice and order information on file. If you ever need to replace a screen you previously purchased, we can use your order history to make the repeat process easier.</p>
      ${customerOrderInfoHtml(quote)}
      ${storeAndTotalSummaryHtml(quote)}
      ${futureBusinessTilesHtml()}
    `
  });
}

function completedCustomerText(quote, items) {
  return [
    'SKYE ACE HARDWARE | SCREEN TOOL',
    'QUOTE > PRODUCTION > READY > COMPLETE',
    'ORDER COMPLETE - Thank you for your business',
    '',
    'Your screen order has been completed.',
    'Thank you for trusting Helpful ACE Hardware. We value you as a customer and neighbor.',
    'We keep your invoice and order information on file. If you ever need to replace a screen you previously purchased, we can use your order history to make the repeat process easier.',
    '',
    customerOrderInfoText(quote),
    '',
    storeAndTotalSummaryText(quote),
    '',
    'Think of us for:',
    '- Knife sharpening',
    '- Key cutting',
    '- Paint and color help',
    '- Expert help',
    '- Special orders and delivery',
    '- ACE Rewards'
  ].join('\n');
}

function completedStoreHtml(quote, items) {
  return operationalStoreEmailShell('SCREEN ORDER COMPLETED', `
    <p>Order ${esc(quote.id)} has been marked as completed in the dashboard.</p>
    <p>No further store action is required from this email.</p>
    ${customerSearchDetailsHtml(quote)}
    ${orderDetailsHtml(quote)}
  `);
}

function completedStoreText(quote, items) {
  return [
    'SCREEN ORDER COMPLETED',
    'Order ' + clean(quote.id) + ' has been marked as completed in the dashboard.',
    'No further store action is required from this email.',
    '',
    customerSearchDetailsText(quote),
    '',
    orderDetailsText(quote)
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

function customerEmailShell({ statusStep, titleText, statusLabel, statusMessage, bodyHtml }) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.45;color:#222;max-width:780px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;">
      <div style="background:#b01c2e;color:#fff;padding:14px 20px;">
        <div style="font-size:20px;font-weight:700;letter-spacing:0.2px;">SKYE ACE Hardware</div>
        <div style="font-size:13px;opacity:0.95;">Custom Window &amp; Door Screen Tool</div>
      </div>
      <div style="padding:18px 20px 24px;">
        ${lifecycleTrackerHtml(statusStep)}
        <h2 style="margin:8px 0 6px;color:#b01c2e;">${esc(titleText)}</h2>
        ${statusBannerHtml(statusLabel, statusMessage)}
        ${bodyHtml}
      </div>
    </div>
  `;
}

function lifecycleTrackerHtml(statusStep) {
  const sequence = ['quote', 'production', 'ready', 'complete'];
  const labels = {
    quote: 'Quote',
    production: 'Production',
    ready: 'Ready',
    complete: 'Complete'
  };
  const currentIndex = sequence.indexOf(clean(statusStep).toLowerCase());

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin-bottom:16px;">
      <tr>
        ${sequence.map((step, index) => `
          <td style="text-align:center;padding:4px 2px;">
            <div style="display:inline-block;min-width:88px;padding:6px 8px;border-radius:999px;border:1px solid ${currentIndex >= 0 && index <= currentIndex ? '#b01c2e' : '#c8c8c8'};background:${currentIndex >= 0 && index <= currentIndex ? '#b01c2e' : '#fff'};color:${currentIndex >= 0 && index <= currentIndex ? '#fff' : '#555'};font-size:12px;font-weight:700;">${labels[step]}</div>
          </td>
        `).join('')}
      </tr>
    </table>
  `;
}

function statusBannerHtml(label, message) {
  return `
    <div style="background:#b01c2e;color:#fff;padding:14px 16px;border-radius:8px;margin:10px 0 16px;">
      <div style="font-size:18px;font-weight:700;letter-spacing:0.4px;">${esc(label)}</div>
      <div style="font-size:15px;margin-top:4px;">${esc(message)}</div>
    </div>
  `;
}

function customerOrderInfoHtml(quote, options = {}) {
  const details = [
    `<strong>Quote ID:</strong> ${esc(quote.id)}`,
    `<strong>Status:</strong> ${esc(quote.status)}`,
    `<strong>Fulfillment:</strong> ${esc(fulfillmentLabel(quote))}`
  ];

  if (options.includeValidity && clean(quote.validity_expires_at)) {
    details.push(`<strong>Valid through:</strong> ${esc(dateLabel(quote.validity_expires_at))}`);
  }

  return `
    <h3 style="margin:16px 0 8px;">Order Information</h3>
    <p>${details.join('<br>')}</p>
  `;
}

function storeAndTotalSummaryHtml(quote) {
  return `
    <h3 style="margin:16px 0 8px;">Selected Store</h3>
    <p>${esc(quote.store_name)}<br>${esc(quote.store_phone || '')}<br>${esc(quote.store_email || '')}</p>
    <h3 style="margin:16px 0 8px;">Total Summary</h3>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:320px;max-width:100%;font-size:14px;margin-bottom:8px;">
      <tbody>
        <tr><td style="border-bottom:1px solid #ddd;">Subtotal</td><td style="border-bottom:1px solid #ddd;text-align:right;">${money(quote.subtotal_cents)}</td></tr>
        <tr><td style="border-bottom:1px solid #ddd;">Tax</td><td style="border-bottom:1px solid #ddd;text-align:right;">${money(quote.tax_cents)}</td></tr>
        <tr><td style="border-bottom:1px solid #ddd;">Delivery</td><td style="border-bottom:1px solid #ddd;text-align:right;">${money(quote.delivery_cents)}</td></tr>
        <tr><td style="font-weight:bold;">Total</td><td style="font-weight:bold;text-align:right;">${money(quote.total_cents)}</td></tr>
      </tbody>
    </table>
  `;
}

function futureBusinessTilesHtml() {
  const tiles = [
    { label: 'Knife sharpening', detail: 'Keep your tools performing at their best.' },
    { label: 'Key cutting', detail: 'Fast duplication for home, office, and auto keys.' },
    { label: 'Paint and color help', detail: 'Expert matching and in-store guidance.' },
    { label: 'Expert help', detail: 'Project advice from your neighborhood team.' },
    { label: 'Special orders and delivery', detail: 'Ask us about hard-to-find items and delivery options.' },
    { label: 'ACE Rewards', detail: 'Earn points and access member-exclusive savings.' }
  ];
  const rowSize = 3;
  const rows = [];
  for (let i = 0; i < tiles.length; i += rowSize) {
    rows.push(tiles.slice(i, i + rowSize));
  }

  return `
    <h3 style="margin:16px 0 8px;">Think of us for...</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      ${rows.map((row) => `
        <tr>
          ${row.map((tile) => `
            <td style="width:33.33%;padding:8px;vertical-align:top;">
              <div role="group" aria-label="${esc(tile.label)} service tile" style="border:1px solid #ddd;border-radius:8px;padding:12px 10px;text-align:left;height:100%;background:#fafafa;">
                <div style="font-size:13px;font-weight:700;margin-bottom:6px;">${esc(tile.label)}</div>
                <div style="font-size:12px;color:#2f2f2f;line-height:1.4;">${esc(tile.detail)}</div>
              </div>
            </td>
          `).join('')}
        </tr>
      `).join('')}
    </table>
  `;
}

function operationalStoreEmailShell(titleText, bodyHtml) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.45;color:#222;max-width:780px;margin:0 auto;">
      <h2>${esc(titleText)}</h2>
      ${bodyHtml}
    </div>
  `;
}

function emailShell(titleText, bodyHtml) {
  return operationalStoreEmailShell(titleText, bodyHtml);
}

function customerSearchDetailsHtml(quote) {
  return `
    <h3 style="margin:16px 0 8px;">Customer / Search Details</h3>
    <p><strong>Customer:</strong> ${esc(quote.customer_name)}<br><strong>Phone:</strong> ${esc(quote.customer_phone)}<br><strong>Email:</strong> ${esc(quote.customer_email)}<br><strong>Address:</strong> ${esc(customerAddressLine(quote))}<br><strong>Quote ID:</strong> ${esc(quote.id)}</p>
  `;
}

function customerSearchDetailsText(quote) {
  return [
    'Customer/search details:',
    'Customer: ' + clean(quote.customer_name),
    'Phone: ' + clean(quote.customer_phone),
    'Email: ' + clean(quote.customer_email),
    'Address: ' + customerAddressLine(quote),
    'Quote ID: ' + clean(quote.id)
  ].join('\n');
}

function orderDetailsHtml(quote, options = {}) {
  const rows = [
    '<strong>Quote ID:</strong> ' + esc(quote.id),
    '<strong>Status:</strong> ' + esc(quote.status),
    '<strong>Fulfillment:</strong> ' + esc(fulfillmentLabel(quote)),
    '<strong>Total:</strong> ' + esc(money(quote.total_cents)),
    '<strong>Selected store:</strong> ' + esc(quote.store_name)
  ];

  if (options.includePaymentMethod) {
    rows.push('<strong>Payment method:</strong> ' + esc(paymentMethodLabel(quote.payment_method)));
  }

  return `
    <h3 style="margin:16px 0 8px;">Order Details</h3>
    <p>${rows.join('<br>')}</p>
  `;
}

function orderDetailsText(quote, options = {}) {
  const lines = [
    'Order details:',
    'Quote ID: ' + clean(quote.id),
    'Status: ' + clean(quote.status),
    'Fulfillment: ' + fulfillmentLabel(quote),
    'Total: ' + money(quote.total_cents),
    'Selected store: ' + clean(quote.store_name)
  ];

  if (options.includePaymentMethod) {
    lines.push('Payment method: ' + paymentMethodLabel(quote.payment_method));
  }

  return lines.join('\n');
}

function customerOrderInfoText(quote, options = {}) {
  const lines = [
    'Order information:',
    'Quote ID: ' + clean(quote.id),
    'Status: ' + clean(quote.status),
    'Fulfillment: ' + fulfillmentLabel(quote)
  ];

  if (options.includeValidity && clean(quote.validity_expires_at)) {
    lines.push('Valid through: ' + dateLabel(quote.validity_expires_at));
  }

  return lines.join('\n');
}

function storeAndTotalSummaryText(quote) {
  return [
    'Selected store:',
    clean(quote.store_name),
    clean(quote.store_phone),
    clean(quote.store_email),
    '',
    'Total summary:',
    'Subtotal: ' + money(quote.subtotal_cents),
    'Tax: ' + money(quote.tax_cents),
    'Delivery: ' + money(quote.delivery_cents),
    'Total: ' + money(quote.total_cents)
  ].join('\n');
}

function screenSummaryHtml(items) {
  const rows = items.map((item, index) => `
    <tr>
      <td style="border-bottom:1px solid #eee;padding:6px 4px;">${index + 1}</td>
      <td style="border-bottom:1px solid #eee;padding:6px 4px;">${esc(title(item.type))}</td>
      <td style="border-bottom:1px solid #eee;padding:6px 4px;">${esc(item.qty)}</td>
      <td style="border-bottom:1px solid #eee;padding:6px 4px;">${esc(item.width_display)} x ${esc(item.height_display)}</td>
      <td style="border-bottom:1px solid #eee;padding:6px 4px;text-align:right;">${money(item.line_total_cents)}</td>
    </tr>
  `).join('');

  return `
    <h3 style="margin:16px 0 8px;">Screens</h3>
    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:6px 4px;border-bottom:1px solid #ddd;">#</th>
          <th style="text-align:left;padding:6px 4px;border-bottom:1px solid #ddd;">Type</th>
          <th style="text-align:left;padding:6px 4px;border-bottom:1px solid #ddd;">Qty</th>
          <th style="text-align:left;padding:6px 4px;border-bottom:1px solid #ddd;">Size</th>
          <th style="text-align:right;padding:6px 4px;border-bottom:1px solid #ddd;">Line</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function screenSummaryText(items) {
  const lines = ['Screens:'];
  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${title(item.type)} | Qty ${item.qty} | ${item.width_display} x ${item.height_display} | ${money(item.line_total_cents)}`
    );
  });
  return lines.join('\n');
}

function fulfillmentLabel(quote) {
  const fulfillment = clean(quote && quote.fulfillment_method ? quote.fulfillment_method : 'pickup').toLowerCase();
  return fulfillment === 'delivery' ? 'Delivery' : 'Pickup';
}

function quoteDownloadUrl(env, quote) {
  if (!clean(quote && quote.view_token)) return '';
  return customerFormsBaseUrl(env) + '/quote.html?token=' + encodeURIComponent(clean(quote.view_token));
}

function paymentMethodLabel(method) {
  const normalized = clean(method).toLowerCase();
  if (normalized === 'stripe' || normalized === 'online') return 'Online';
  if (normalized === 'in_store') return 'In Store';
  return normalized ? title(normalized.replace(/_/g, ' ')) : 'Unknown';
}

function customerAddressLine(quote) {
  const city = clean(quote.customer_city);
  const state = clean(quote.customer_state);
  const zip = clean(quote.customer_zip);
  const cityStateZip = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [clean(quote.customer_street), cityStateZip].filter(Boolean).join(', ');
}

function dateLabel(value) {
  const raw = clean(value);
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    RESEND_REPLY_TO: Boolean(env.RESEND_REPLY_TO),
    STAFF_API_KEY: Boolean(env.STAFF_API_KEY)
  };
}

function isOperationalVendorStatus(status) {
  return ['in_production', 'ready', 'completed'].includes(clean(status).toLowerCase());
}

async function createOrReuseVendorPacketToken(env, quote) {
  if (!quote || !quote.id) return { ok: false, error: 'Quote not found' };

  const now = new Date().toISOString();
  const existingToken = clean(quote.vendor_packet_token);
  const existingTokenHash = clean(quote.vendor_packet_token_hash);
  const existingCreatedAt = clean(quote.vendor_packet_token_created_at);
  const tokenValue = existingToken || token(48);
  const tokenHash = existingTokenHash ? existingTokenHash : await sha256Hex(tokenValue);
  const createdAt = existingCreatedAt || now;
  const patch = {};

  if (!existingToken) patch.vendor_packet_token = tokenValue;
  if (!existingTokenHash) patch.vendor_packet_token_hash = tokenHash;
  if (!existingCreatedAt) patch.vendor_packet_token_created_at = createdAt;

  if (Object.keys(patch).length) {
    const updated = await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(quote.id), patch);
    if (!updated.ok) return { ok: false, error: 'Supabase vendor packet token update failed', details: updated.error };
  }

  return {
    ok: true,
    token: tokenValue,
    quote: {
      ...quote,
      vendor_packet_token: tokenValue,
      vendor_packet_token_hash: tokenHash,
      vendor_packet_token_created_at: createdAt
    }
  };
}

async function sendVendorPacketToStore(env, quote, items) {
  if (!quote || !quote.id) return { ok: false, error: 'Quote not found' };

  const tokenResult = await createOrReuseVendorPacketToken(env, quote);
  if (!tokenResult.ok) return tokenResult;

  const packetQuote = tokenResult.quote;
  const link =
    vendorFormsBaseUrl(env) +
    '/vendor-forms.html?packet_token=' +
    encodeURIComponent(tokenResult.token);
  const subject = 'Vendor Forms Ready - ' + clean(packetQuote.customer_name);
  let emailStatus;

  try {
    if (!packetQuote.store_email) throw new Error('Quote store_email is missing');
    if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');

    emailStatus = await sendEmail(env, {
      to: packetQuote.store_email,
      subject,
      html: vendorPacketHtml(packetQuote, items, link),
      text: vendorPacketText(packetQuote, items, link)
    });
  } catch (err) {
    emailStatus = {
      ok: false,
      to: packetQuote.store_email || null,
      subject,
      error: stringifyError(err)
    };
  }

  const patch = emailStatus.ok
    ? {
        vendor_packet_sent_to_store_at: new Date().toISOString(),
        vendor_packet_sent_to_store_email: packetQuote.store_email,
        vendor_packet_last_error: null
      }
    : {
        vendor_packet_last_error: stringifyError(emailStatus.error || emailStatus)
      };

  if (packetQuote.vendor_packet_status !== 'sent_to_vendor') {
    patch.vendor_packet_status = emailStatus.ok ? 'sent_to_store' : 'send_failed';
  }

  const updated = await sbPatch(env, 'quotes', 'id=eq.' + encodeURIComponent(packetQuote.id), patch);
  if (!updated.ok) {
    return {
      ok: false,
      error: 'Supabase vendor packet send update failed',
      details: updated.error,
      email_status: emailStatus
    };
  }

  return emailStatus;
}

async function maybeAutoSendVendorPacket(env, quote, items) {
  if (!quote || !isOperationalVendorStatus(quote.status)) {
    return { skipped: true, reason: 'Quote is not in an operational vendor status' };
  }

  if (!vendorPacketStatusAllowsAutoSend(quote.vendor_packet_status)) {
    return { skipped: true, reason: 'Vendor packet already sent or confirmed' };
  }

  return sendVendorPacketToStore(env, quote, items);
}

function summarizeStripeError(error) {
  if (!error) return 'Unknown Stripe error';
  if (typeof error === 'string') return error;
  if (error.error && error.error.message) return error.error.message;
  if (error.message) return error.message;
  return JSON.stringify(error);
}

function stringifyError(error) {
  if (error == null) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch (err) {
    return String(error);
  }
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

function vendorFormsBaseUrl(env) {
  return trim(env.VENDOR_FORMS_BASE_URL || 'https://screen-ordering-flow.nnelson.workers.dev');
}

function customerFormsBaseUrl(env) {
  return trim(env.CUSTOMER_FORMS_BASE_URL || env.PUBLIC_APP_BASE_URL || 'https://screens.helpful.place');
}

function vendorPacketStatusAllowsAutoSend(status) {
  return !['sent_to_store', 'opened_by_store', 'sent_to_vendor'].includes(clean(status).toLowerCase());
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
