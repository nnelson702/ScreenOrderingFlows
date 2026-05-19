// post-app-fixes.js
// Targeted front-end corrections loaded after app.js and before DOMContentLoaded.

const ACTIVE_TAX_RATE = 0.08375; // Clark County, NV sales/use tax rate.
const DELIVERY_FEE = 10;
const DELIVERY_MINIMUM_SUBTOTAL = 35;
const DELIVERY_RADIUS_MILES = 15;

let customerStoreManualOverride = false;
let programmaticStoreSelectUpdate = false;
let storeAutoSelectTimer = null;

if (!AppState.fulfillmentMethod) AppState.fulfillmentMethod = 'pickup';

const STORE_COORDS = {
  '18228': { lat: 36.1006, lng: -115.1060 }, // Helpful ACE - Tropicana
  '18507': { lat: 36.0137, lng: -115.0546 }, // Helpful ACE - Horizon Ridge
  '18690': { lat: 36.0770, lng: -115.2428 }, // Helpful ACE - Rainbow
  '19117': { lat: 36.0572, lng: -115.0828 }  // Helpful ACE - Green Valley
};

const ZIP_COORDS = {
  '89002': { lat: 35.9820, lng: -114.9930 },
  '89005': { lat: 35.9670, lng: -114.8390 },
  '89011': { lat: 36.0830, lng: -114.9720 },
  '89012': { lat: 36.0120, lng: -115.0470 },
  '89014': { lat: 36.0550, lng: -115.0800 },
  '89015': { lat: 36.0340, lng: -114.9780 },
  '89044': { lat: 35.9270, lng: -115.1120 },
  '89052': { lat: 35.9900, lng: -115.1080 },
  '89074': { lat: 36.0350, lng: -115.0820 },
  '89101': { lat: 36.1710, lng: -115.1240 },
  '89102': { lat: 36.1450, lng: -115.1740 },
  '89103': { lat: 36.1130, lng: -115.2140 },
  '89104': { lat: 36.1510, lng: -115.1090 },
  '89106': { lat: 36.1810, lng: -115.1620 },
  '89107': { lat: 36.1720, lng: -115.2090 },
  '89108': { lat: 36.2030, lng: -115.2230 },
  '89109': { lat: 36.1280, lng: -115.1650 },
  '89110': { lat: 36.1730, lng: -115.0480 },
  '89113': { lat: 36.0600, lng: -115.2570 },
  '89117': { lat: 36.1430, lng: -115.2800 },
  '89118': { lat: 36.0790, lng: -115.2190 },
  '89119': { lat: 36.0840, lng: -115.1420 },
  '89120': { lat: 36.0760, lng: -115.0960 },
  '89121': { lat: 36.1200, lng: -115.0890 },
  '89122': { lat: 36.1050, lng: -115.0470 },
  '89123': { lat: 36.0360, lng: -115.1520 },
  '89128': { lat: 36.1920, lng: -115.2630 },
  '89129': { lat: 36.2330, lng: -115.2920 },
  '89130': { lat: 36.2490, lng: -115.2300 },
  '89131': { lat: 36.3060, lng: -115.2520 },
  '89134': { lat: 36.2070, lng: -115.3160 },
  '89135': { lat: 36.1190, lng: -115.3280 },
  '89138': { lat: 36.1660, lng: -115.3660 },
  '89139': { lat: 36.0340, lng: -115.2190 },
  '89141': { lat: 35.9890, lng: -115.2150 },
  '89142': { lat: 36.1480, lng: -115.0350 },
  '89144': { lat: 36.1780, lng: -115.3200 },
  '89145': { lat: 36.1680, lng: -115.2650 },
  '89146': { lat: 36.1440, lng: -115.2310 },
  '89147': { lat: 36.1120, lng: -115.2790 },
  '89148': { lat: 36.0620, lng: -115.2980 },
  '89149': { lat: 36.2820, lng: -115.2910 },
  '89156': { lat: 36.2160, lng: -115.0340 },
  '89166': { lat: 36.3200, lng: -115.3630 },
  '89169': { lat: 36.1260, lng: -115.1410 },
  '89178': { lat: 35.9950, lng: -115.2860 },
  '89179': { lat: 35.9380, lng: -115.2520 },
  '89183': { lat: 35.9910, lng: -115.1560 }
};

function getActiveTaxRate() {
  return ACTIVE_TAX_RATE;
}

function getLineItemSubtotal() {
  return AppState.lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
}

function getQuoteTotals() {
  const subtotal = getLineItemSubtotal();
  const eligibility = getDeliveryEligibility(subtotal);
  const delivery = eligibility.method === 'delivery' && eligibility.available ? DELIVERY_FEE : 0;
  const tax = roundCurrency(subtotal * getActiveTaxRate());
  const total = roundCurrency(subtotal + tax + delivery);
  return { subtotal, tax, delivery, total };
}

function getStores() {
  return normalizeObjectArray(AppState.config?.stores);
}

function findStoreById(storeId) {
  return getStores().find((store) => String(store.id) === String(storeId)) || null;
}

function milesBetween(a, b) {
  if (!a || !b) return Infinity;
  const R = 3958.8;
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getCustomerApproxCoords(customerOrZip) {
  const zip = typeof customerOrZip === 'string' ? customerOrZip : customerOrZip?.zip;
  const cleanZip = String(zip || '').replace(/\D/g, '').slice(0, 5);
  return ZIP_COORDS[cleanZip] || null;
}

function getSelectedStoreCoords() {
  const selectedStoreId = document.getElementById('storeSelect')?.value;
  const store = AppState.store || findStoreById(selectedStoreId);
  if (!store) return null;
  return STORE_COORDS[String(store.id)] || getCustomerApproxCoords(store.zip);
}

function getCustomerToSelectedStoreMiles() {
  const customer = AppState.customer || getCustomerFormSnapshot();
  const customerCoords = getCustomerApproxCoords(customer);
  const storeCoords = getSelectedStoreCoords();
  const miles = milesBetween(customerCoords, storeCoords);
  return Number.isFinite(miles) ? Math.round(miles * 10) / 10 : null;
}

function autoSelectStore(customerOrZip) {
  const stores = getStores();
  const customerCoords = getCustomerApproxCoords(customerOrZip);
  if (!stores.length) return null;
  if (!customerCoords) return stores[0] || null;

  let best = null;
  let bestMiles = Infinity;
  stores.forEach((store) => {
    const storeCoords = STORE_COORDS[String(store.id)] || getCustomerApproxCoords(store.zip);
    const miles = milesBetween(customerCoords, storeCoords);
    if (miles < bestMiles) {
      bestMiles = miles;
      best = { ...store, estimatedDistanceMiles: Math.round(miles * 10) / 10 };
    }
  });
  return best || stores[0] || null;
}

function getFulfillmentMethod() {
  const checked = document.querySelector('input[name="fulfillmentMethod"]:checked');
  return checked?.value || AppState.fulfillmentMethod || 'pickup';
}

function setFulfillmentMethod(method, options = {}) {
  const cleanMethod = method === 'delivery' ? 'delivery' : 'pickup';
  AppState.fulfillmentMethod = cleanMethod;
  const input = document.querySelector(`input[name="fulfillmentMethod"][value="${cleanMethod}"]`);
  if (input) input.checked = true;
  if (options.updateUi !== false) updateDashboardFulfillmentUi();
  if (options.render) renderSummary();
}

function getDeliveryEligibility(subtotal = getLineItemSubtotal()) {
  const method = getFulfillmentMethod();
  const miles = getCustomerToSelectedStoreMiles();
  const distanceKnown = typeof miles === 'number';
  const withinRadius = distanceKnown && miles <= DELIVERY_RADIUS_MILES;
  const minimumMet = subtotal >= DELIVERY_MINIMUM_SUBTOTAL;
  const available = withinRadius && minimumMet;
  return { method, miles, distanceKnown, withinRadius, minimumMet, available, subtotal };
}

function ensureDashboardFulfillmentSection() {
  let section = document.getElementById('dashboardFulfillmentSection');
  if (section) return section;

  const summaryGrid = document.querySelector('#view-dashboard .summary-grid');
  if (!summaryGrid) return null;

  section = document.createElement('section');
  section.id = 'dashboardFulfillmentSection';
  section.className = 'summary-card';
  section.style.margin = '0 0 1rem 0';
  section.innerHTML = `
    <h3>Pickup or Delivery</h3>
    <div class="inline-options">
      <label><input type="radio" name="fulfillmentMethod" value="pickup" checked /> Pick up at selected store</label>
      <label><input id="deliveryFulfillmentOption" type="radio" name="fulfillmentMethod" value="delivery" /> Delivery (+$10)</label>
    </div>
    <p id="dashboardFulfillmentNote" class="helper-text small">Delivery becomes available when the order subtotal is at least $35 and the address is within 15 miles of the selected store.</p>
  `;
  summaryGrid.insertAdjacentElement('afterend', section);

  section.querySelectorAll('input[name="fulfillmentMethod"]').forEach((input) => {
    input.addEventListener('change', () => {
      AppState.fulfillmentMethod = getFulfillmentMethod();
      updateDashboardFulfillmentUi();
      renderSummary();
    });
  });

  return section;
}

function updateDashboardFulfillmentUi() {
  ensureDashboardFulfillmentSection();
  const note = document.getElementById('dashboardFulfillmentNote');
  const deliveryInput = document.getElementById('deliveryFulfillmentOption');
  if (!note || !deliveryInput) return;

  const eligibility = getDeliveryEligibility();
  const subtotalNeeded = Math.max(0, DELIVERY_MINIMUM_SUBTOTAL - eligibility.subtotal);
  const milesText = eligibility.distanceKnown ? `${eligibility.miles} miles` : 'unknown distance';

  const deliveryCanBeSelected = eligibility.minimumMet && eligibility.withinRadius;
  deliveryInput.disabled = !deliveryCanBeSelected;

  if (!deliveryCanBeSelected && eligibility.method === 'delivery') {
    setFulfillmentMethod('pickup', { updateUi: false });
  }

  if (!eligibility.minimumMet) {
    note.textContent = `Delivery becomes available at a $35 screen subtotal. Add ${formatMoney(subtotalNeeded)} more to enable delivery.`;
    return;
  }

  if (!eligibility.distanceKnown) {
    note.textContent = 'Delivery distance could not be verified from this ZIP code. Pickup is allowed only unless the address is corrected.';
    return;
  }

  if (!eligibility.withinRadius) {
    note.textContent = `Outside delivery radius — pickup allowed only. Estimated distance from selected store: ${milesText}. Delivery limit: ${DELIVERY_RADIUS_MILES} miles.`;
    return;
  }

  if (getFulfillmentMethod() === 'delivery') {
    note.textContent = `Delivery selected. $10 delivery fee applied. Estimated distance from selected store: ${milesText}.`;
  } else {
    note.textContent = `Pickup selected. Delivery is available for this order for $10. Estimated distance from selected store: ${milesText}.`;
  }
}

function ensureStoreAutoNote() {
  let note = document.getElementById('storeAutoNote');
  const select = document.getElementById('storeSelect');
  if (!note && select && select.parentElement) {
    note = document.createElement('p');
    note.id = 'storeAutoNote';
    note.className = 'helper-text small';
    select.parentElement.appendChild(note);
  }
  return note;
}

function getCustomerFormSnapshot() {
  const form = document.getElementById('customerForm');
  if (!form) return null;
  return {
    name: form.customerName?.value?.trim() || '',
    street: form.customerStreet?.value?.trim() || '',
    city: form.customerCity?.value?.trim() || '',
    state: form.customerState?.value?.trim().toUpperCase() || '',
    zip: form.customerZip?.value?.trim() || '',
    email: form.customerEmail?.value?.trim() || '',
    phone: form.customerPhone?.value?.trim() || ''
  };
}

function setSelectedStore(store, source = 'auto') {
  if (!store) return;
  const matchingStore = findStoreById(store.id) || store;
  AppState.store = matchingStore;

  const select = document.getElementById('storeSelect');
  if (select && matchingStore.id) {
    programmaticStoreSelectUpdate = true;
    select.value = matchingStore.id;
    programmaticStoreSelectUpdate = false;
  }

  const note = ensureStoreAutoNote();
  if (note) {
    if (source === 'manual') {
      note.textContent = `Selected store: ${matchingStore.name}. This store will be used for the quote unless you change it.`;
    } else {
      note.textContent = store.estimatedDistanceMiles
        ? `Closest available store selected automatically: ${matchingStore.name} — approximately ${store.estimatedDistanceMiles} miles by area estimate. You can change this selection.`
        : `Closest available store selected automatically: ${matchingStore.name}. You can change this selection.`;
    }
  }

  updateDashboardFulfillmentUi();
}

function syncStoreFromDropdown(source = 'manual') {
  const select = document.getElementById('storeSelect');
  if (!select || !select.value) return null;
  const selectedStore = findStoreById(select.value);
  if (selectedStore) setSelectedStore(selectedStore, source);
  return selectedStore;
}

function runStoreAutoSelect(force = false) {
  if (customerStoreManualOverride && !force) return;
  const customer = getCustomerFormSnapshot();
  if (!customer) return;
  const cleanZip = String(customer.zip || '').replace(/\D/g, '').slice(0, 5);
  if (cleanZip.length < 5) return;

  const nearest = autoSelectStore(customer);
  if (nearest) setSelectedStore(nearest, 'auto');
}

function scheduleStoreAutoSelect(force = false) {
  clearTimeout(storeAutoSelectTimer);
  storeAutoSelectTimer = setTimeout(() => runStoreAutoSelect(force), 150);
}

function installStoreAutoSelectBehavior() {
  const form = document.getElementById('customerForm');
  const select = document.getElementById('storeSelect');
  if (!form || !select) return;

  const addressFieldIds = ['customerStreet', 'customerCity', 'customerState', 'customerZip'];
  addressFieldIds.forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', () => {
      customerStoreManualOverride = false;
      scheduleStoreAutoSelect(false);
      updateDashboardFulfillmentUi();
    });
    input.addEventListener('change', () => {
      customerStoreManualOverride = false;
      scheduleStoreAutoSelect(false);
      updateDashboardFulfillmentUi();
    });
  });

  select.addEventListener('change', () => {
    if (programmaticStoreSelectUpdate) return;
    customerStoreManualOverride = true;
    syncStoreFromDropdown('manual');
  });

  const observer = new MutationObserver(() => {
    if (!customerStoreManualOverride) scheduleStoreAutoSelect(false);
    updateDashboardFulfillmentUi();
  });
  observer.observe(select, { childList: true });

  scheduleStoreAutoSelect(false);
}

function handleCustomerSubmit(event) {
  event.preventDefault();
  const customer = getCustomerFormSnapshot();
  if (!customer) return;

  if (!customer.name || !customer.email) {
    alert('Please provide at least a name and email.');
    return;
  }

  AppState.customer = customer;

  const selectedStore = syncStoreFromDropdown(customerStoreManualOverride ? 'manual' : 'auto');
  if (selectedStore) {
    AppState.store = selectedStore;
  } else {
    const nearest = autoSelectStore(customer);
    if (nearest) setSelectedStore(nearest, 'auto');
  }

  const stores = getStores();
  if (!AppState.store && stores.length) AppState.store = stores[0];

  renderSummary();
  showView('dashboard');
  ensureDashboardFulfillmentSection();
  updateDashboardFulfillmentUi();
}

async function submitQuoteToApi() {
  const totals = getQuoteTotals();
  const eligibility = getDeliveryEligibility(totals.subtotal);
  const payload = {
    customer: {
      name: AppState.customer.name,
      street: AppState.customer.street,
      city: AppState.customer.city,
      state: AppState.customer.state,
      zip: AppState.customer.zip,
      phone: AppState.customer.phone,
      email: AppState.customer.email
    },
    store: {
      id: AppState.store?.id || null,
      name: AppState.store?.name || '',
      email: AppState.store?.email || '',
      phone: AppState.store?.phone || null,
      street: AppState.store?.address || null,
      city: AppState.store?.city || null,
      state: AppState.store?.state || null,
      zip: AppState.store?.zip || null
    },
    fulfillment: {
      method: getFulfillmentMethod(),
      delivery_distance_miles: eligibility.miles,
      delivery_fee_cents: Math.round(totals.delivery * 100),
      delivery_minimum_cents: DELIVERY_MINIMUM_SUBTOTAL * 100,
      delivery_radius_miles: DELIVERY_RADIUS_MILES
    },
    totals: {
      subtotal_cents: Math.round(totals.subtotal * 100),
      delivery_cents: Math.round(totals.delivery * 100),
      tax_cents: Math.round(totals.tax * 100),
      total_cents: Math.round(totals.total * 100)
    },
    items: AppState.lineItems.map((item, idx) => ({
      sort_index: idx + 1,
      type: item.screenType === 'door' ? 'door' : 'window',
      qty: item.qty || 1,
      width_display: item.width,
      height_display: item.height,
      frame_type: item.frameType,
      frame_color: item.frameColor,
      material_type: item.materialType,
      material_color: item.materialColor,
      line_total_cents: Math.round((item.lineTotal || 0) * 100),
      frame_cut_type: item.frameCutType || null,
      crossbar_needed: item.crossbarNeeded ?? null,
      crossbar_type: item.crossbarType || null,
      crossbar_orientation: item.crossbarOrientation || null,
      crossbar_distance_display: item.crossbarDistance || null,
      handle_orientation: item.handleOrientation || null,
      handle_height_display: item.handleHeightDisplay || null,
      roller_type: item.doorRollers || null,
      hardware_json: item.hardwareAssignments ? item.hardwareAssignments : null
    }))
  };

  const resp = await fetch(`${API_BASE_URL}/api/quote/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    let msg = `Quote submit failed (HTTP ${resp.status})`;
    try {
      const data = await resp.json();
      if (data?.error) msg = `${msg}: ${data.error}`;
    } catch (e) {}
    throw new Error(msg);
  }

  return await resp.json();
}

function renderSummary() {
  try {
    updateDashboardFulfillmentUi();

    const custEl = $('#summaryCustomer');
    const succCustEl = $('#successCustomer');
    const storeEl = $('#summaryStore');
    const succStoreEl = $('#successStore');

    if (custEl) {
      if (!AppState.customer) {
        custEl.textContent = 'Not set';
      } else {
        const c = AppState.customer;
        const lines = [];
        if (c.name) lines.push(escapeHtml(c.name));
        if (c.street) lines.push(escapeHtml(c.street));
        const cityState = [escapeHtml(c.city || ''), escapeHtml(c.state || '')].filter(Boolean).join(', ');
        if (cityState) lines.push(cityState);
        if (c.zip) lines.push(escapeHtml(c.zip));
        if (c.phone) lines.push(escapeHtml(formatPhone(c.phone)));
        if (c.email) lines.push(escapeHtml(c.email));
        custEl.innerHTML = lines.map((x) => `<div>${x}</div>`).join('');
      }
    }
    if (succCustEl) succCustEl.innerHTML = custEl?.innerHTML || '';

    if (storeEl) {
      if (!AppState.store) {
        storeEl.textContent = 'Not set';
      } else {
        const s = AppState.store;
        const lines = [];
        if (s.name) lines.push(escapeHtml(s.name));
        if (s.address) lines.push(escapeHtml(s.address));
        const cityState = [escapeHtml(s.city || ''), escapeHtml(s.state || '')].filter(Boolean).join(', ');
        if (cityState) lines.push(cityState);
        if (s.zip) lines.push(escapeHtml(s.zip));
        if (s.phone) lines.push(escapeHtml(formatPhone(s.phone)));
        lines.push(`<strong>Fulfillment:</strong> ${getFulfillmentMethod() === 'delivery' ? 'Delivery' : 'Pickup'}`);
        storeEl.innerHTML = lines.map((x) => `<div>${x}</div>`).join('');
      }
    }
    if (succStoreEl) succStoreEl.innerHTML = storeEl?.innerHTML || '';

    const lineCount = AppState.lineItems.length;
    const totals = getQuoteTotals();
    const lineCountEl = $('#lineItemCount');
    if (lineCountEl) setText(lineCountEl, lineCount ? `${lineCount} screen line item${lineCount === 1 ? '' : 's'}` : 'No screens added yet.');

    setText($('#subtotalValue'), formatMoney(totals.subtotal));
    setText($('#taxValue'), formatMoney(totals.tax));
    setText($('#deliveryValue'), formatMoney(totals.delivery));
    setText($('#totalValue'), formatMoney(totals.total));
    renderSuccessTotals();
  } catch (err) {
    console.error('Render summary failed:', err);
    showError('There was a problem rendering the quote summary. You can still continue.');
  }
}

function ensureSuccessTotalsCard() {
  let card = document.getElementById('successTotalsCard');
  if (card) return card;
  const grid = document.querySelector('#view-success .summary-grid');
  if (!grid) return null;
  card = document.createElement('div');
  card.className = 'summary-card totals-card';
  card.id = 'successTotalsCard';
  card.innerHTML = `
    <h3>Quote Totals</h3>
    <div class="totals-row"><span>Subtotal</span><span id="successSubtotalValue">$0.00</span></div>
    <div class="totals-row"><span>Tax</span><span id="successTaxValue">$0.00</span></div>
    <div class="totals-row"><span>Delivery</span><span id="successDeliveryValue">$0.00</span></div>
    <div class="totals-row totals-row-strong"><span>Total</span><span id="successTotalValue">$0.00</span></div>
  `;
  grid.appendChild(card);
  return card;
}

function renderSuccessTotals() {
  if (!document.getElementById('view-success')) return;
  const card = ensureSuccessTotalsCard();
  if (!card) return;
  const totals = getQuoteTotals();
  setText($('#successSubtotalValue'), formatMoney(totals.subtotal));
  setText($('#successTaxValue'), formatMoney(totals.tax));
  setText($('#successDeliveryValue'), formatMoney(totals.delivery));
  setText($('#successTotalValue'), formatMoney(totals.total));
}

function renderSuccessView() {
  const quoteIdEl = $('#successQuoteId');
  if (quoteIdEl) quoteIdEl.textContent = AppState.quoteId || '(pending)';
  renderSummary();
  renderSuccessLineItems();
  renderSuccessTotals();
  const stripeLine = $('#successStripeLine');
  if (stripeLine) {
    if (AppState.stripeEnabled) stripeLine.classList.remove('hidden');
    else stripeLine.classList.add('hidden');
  }
  showView('success');
}

async function handleSubmitQuote() {
  try {
    if (!AppState.customer || !AppState.store) {
      alert('Please complete customer and store information first.');
      return;
    }
    if (!AppState.lineItems.length) {
      alert('Please add at least one screen to the quote.');
      return;
    }
    const ack = $('#ackMeasurements');
    if (!ack || !ack.checked) {
      alert('Please acknowledge that measurements and hardware selections are your responsibility before submitting.');
      return;
    }

    AppState.fulfillmentMethod = getFulfillmentMethod();
    const eligibility = getDeliveryEligibility();
    if (AppState.fulfillmentMethod === 'delivery') {
      if (!eligibility.distanceKnown) {
        alert('Delivery distance could not be verified from this ZIP code. Please choose pickup or correct the address.');
        return;
      }
      if (!eligibility.withinRadius) {
        alert(`Delivery is not available because the address is outside the 15-mile radius from the selected store. Estimated distance is ${eligibility.miles} miles.`);
        return;
      }
      if (!eligibility.minimumMet) {
        alert(`Delivery requires at least $35 in screen subtotal. Add ${formatMoney(DELIVERY_MINIMUM_SUBTOTAL - eligibility.subtotal)} more or choose pickup.`);
        return;
      }
    }

    const result = await submitQuoteToApi();
    AppState.quoteId = result?.quote_id || result?.id || generateQuoteId();
    AppState.stripeEnabled = Boolean(result?.payment_url);
    renderSuccessView();
  } catch (err) {
    console.error('Submit quote failed:', err);
    showError(err?.message || 'Quote submission failed. Please try again.');
    alert(err?.message || 'Quote submission failed. Please try again.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  installStoreAutoSelectBehavior();
  ensureDashboardFulfillmentSection();
  updateDashboardFulfillmentUi();
});
