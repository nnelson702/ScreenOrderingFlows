// app.js
// Screen Ordering Tool - hardened alpha build

// Configurable settings
const ERROR_LOG_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbxE-qLmoNnnqPVaxMl6jNs40jAyWYwRzvngrWx5LbAvZuJrV_XKSjscwxghAGAXrjXt/exec';
const ENVIRONMENT = 'dev';
const API_BASE_URL = 'https://screen-ordering-api.nnelson.workers.dev';

// Approved alpha delivery and tax rules
const ACTIVE_TAX_RATE = 0.08375; // Clark County, NV sales/use tax rate.
const DELIVERY_FEE = 10;
const DELIVERY_MINIMUM_SUBTOTAL = 35;
const DELIVERY_RADIUS_MILES = 15;

// Global application state
const AppState = {
  environment: ENVIRONMENT,
  config: null,
  customer: null,
  store: null,
  lineItems: [],
  quoteId: null,
  stripeEnabled: false,
  paymentUrl: null,
  fulfillmentMethod: 'pickup'
};

// Intermediate state variables
let currentHardwareAssignments = [];
let currentScreenStep = 1;
let crossbarRecommended = false;
let customerStoreManualOverride = false;
let programmaticStoreSelectUpdate = false;
let storeAutoSelectTimer = null;

const STORE_OVERRIDES = [
  { id:'18228', name:'SKYE-ACE Tropicana', city:'Las Vegas', state:'NV', zip:'89121', email:'ACE_18228@skyecos.com', address:'3145 E. Tropicana Blvd', phone:'7259773444', imageId:'1At3jAbLQqp-Z0lX5U4c3BB4JLAoqxwTN' },
  { id:'18507', name:'SKYE-ACE Horizon Ridge', city:'Henderson', state:'NV', zip:'89012', email:'ACE_18507@skyecos.com', address:'1450 W. Horizon Ridge Pkwy #420', phone:'7027500111', imageId:'1-LE0iA1BNFh9PT-yUVN1s3La5wdlzblJ' },
  { id:'18690', name:'SKYE-ACE Rainbow', city:'Las Vegas', state:'NV', zip:'89103', email:'ACE_18690@Skyecos.com', address:'3665 S. Rainbow Blvd #100A-B', phone:'7023317006', imageId:'1vMPBQ5FEh2KNgrA_kmw5N5GvFfe0Ww1n' },
  { id:'19117', name:'SKYE-ACE Green Valley', city:'Henderson', state:'NV', zip:'89014', email:'ACE_19117@Skyecos.com', address:'2255 N. Green Valley Pkwy #110', phone:'7028678566', imageId:'1h1aoHaob3SIR65gTYUaMnQap9jQFGiRx' }
];

const STORE_COORDS = {
  '18228': { lat: 36.09834491, lng: -115.1061869 },
  '18507': { lat: 36.02241113, lng: -115.0497763 },
  '18690': { lat: 36.12264745, lng: -115.244173 },
  '19117': { lat: 36.05645598, lng: -115.084989 }
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

const MATERIAL_COLORS = {
  FIBERGLASS: ['Black', 'Grey'],
  ALUMINUM: ['Brite'],
  PET: ['Black'],
  'VIMCO 20x30': ['Black'],
  'SOLAR 70': ['Black'],
  'SUNTEX 80': ['Black', 'Brown', 'Grey', 'Dark Bronze', 'Stucco', 'Beige'],
  'SUNTEX 90': ['Black', 'Brown', 'Grey', 'Dark Bronze', 'Stucco', 'Beige'],
  'SOLAR 90': ['Black', 'Brown']
};

const PRICING_WINDOW = [
  ['FIBERGLASS','5/16 x 3/4',0.53],['FIBERGLASS','7/16 x 3/4',0.53],['FIBERGLASS','3/8 x 3/4',0.53],['FIBERGLASS','STANDOFF',0.60],['FIBERGLASS','3/8 x KE',0.53],
  ['ALUMINUM','5/16 x 3/4',0.73],['ALUMINUM','7/16 x 3/4',0.73],['ALUMINUM','3/8 x 3/4',0.73],['ALUMINUM','STANDOFF',0.79],['ALUMINUM','3/8 x KE',0.73],
  ['PET','5/16 x 3/4',0.92],['PET','7/16 x 3/4',0.92],['PET','3/8 x 3/4',0.92],['PET','STANDOFF',1.00],['PET','3/8 x KE',0.92],
  ['VIMCO 20x30','5/16 x 3/4',0.92],['VIMCO 20x30','7/16 x 3/4',0.92],['VIMCO 20x30','3/8 x 3/4',0.92],['VIMCO 20x30','STANDOFF',0.92],['VIMCO 20x30','3/8 x KE',0.92],
  ['SOLAR 70','5/16 x 3/4',0.92],['SOLAR 70','7/16 x 3/4',0.92],['SOLAR 70','3/8 x 3/4',0.92],['SOLAR 70','STANDOFF',1.00],['SOLAR 70','3/8 x KE',0.92],
  ['SUNTEX 80','5/16 x 3/4',0.92],['SUNTEX 80','7/16 x 3/4',0.92],['SUNTEX 80','3/8 x 3/4',0.92],['SUNTEX 80','STANDOFF',1.00],['SUNTEX 80','3/8 x KE',0.92],
  ['SUNTEX 90','5/16 x 3/4',0.92],['SUNTEX 90','7/16 x 3/4',0.92],['SUNTEX 90','3/8 x 3/4',0.92],['SUNTEX 90','STANDOFF',1.00],['SUNTEX 90','3/8 x KE',0.92],
  ['SOLAR 90','5/16 x 3/4',0.92],['SOLAR 90','7/16 x 3/4',0.92],['SOLAR 90','3/8 x 3/4',0.92],['SOLAR 90','STANDOFF',1.00],['SOLAR 90','3/8 x KE',0.92]
].map(([materialId, frameId, retailPerInch]) => ({ materialId, frameId, retailPerInch }));

const PRICING_DOOR = [
  ['FIBERGLASS','Standard Aluminum',1.25],['FIBERGLASS','Premium Aluminum',1.44],['FIBERGLASS','Rolled Form Steel',0.80],
  ['ALUMINUM','Standard Aluminum',1.35],['ALUMINUM','Premium Aluminum',1.55],['ALUMINUM','Rolled Form Steel',0.87],
  ['PET','Standard Aluminum',1.70],['PET','Premium Aluminum',1.93],['PET','Rolled Form Steel',1.10],
  ['VIMCO 20x30','Standard Aluminum',1.85],['VIMCO 20x30','Premium Aluminum',2.15],['VIMCO 20x30','Rolled Form Steel',1.25],
  ['SOLAR 70','Standard Aluminum',1.47],['SOLAR 70','Premium Aluminum',1.66],['SOLAR 70','Rolled Form Steel',1.00],
  ['SUNTEX 80','Standard Aluminum',1.70],['SUNTEX 80','Premium Aluminum',1.93],['SUNTEX 80','Rolled Form Steel',1.10],
  ['SUNTEX 90','Standard Aluminum',1.82],['SUNTEX 90','Premium Aluminum',2.02],['SUNTEX 90','Rolled Form Steel',1.17],
  ['SOLAR 90','Standard Aluminum',1.82],['SOLAR 90','Premium Aluminum',2.02],['SOLAR 90','Rolled Form Steel',1.17]
].map(([materialId, frameId, retailPerInch]) => ({ materialId, frameId, retailPerInch }));

const FRAME_SWATCH_MAP = {
  white: 'swatches/frame_white.png',
  bronze: 'swatches/frame_bronze.png',
  tan: 'swatches/frame_tan.png',
  champagne: 'swatches/frame_champagne.png',
  mill: 'swatches/frame_mill.png'
};

const MATERIAL_SWATCH_MAP = {
  black: 'swatches/mat_black.png',
  brown: 'swatches/mat_brown.png',
  gray: 'swatches/mat_gray.png',
  grey: 'swatches/mat_gray.png',
  beige: 'swatches/mat_beige.png',
  stucco: 'swatches/mat_stucco.png',
  'dark bronze': 'swatches/mat_dark_bronze.png',
  brite: 'swatches/frame_mill.png'
};

const SOLAR_SWATCH_MAP = {
  black: 'swatches/solar_black.png',
  brown: 'swatches/solar_brown.png',
  gray: 'swatches/solar_gray.png',
  grey: 'swatches/solar_gray.png'
};

const PET_SWATCH_MAP = { black: 'swatches/pet_black.png' };
const FIBERGLASS_SWATCH_MAP = { black: 'swatches/fiberglass_black.png' };

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function byId(id) {
  return document.getElementById(id);
}

function setText(el, value) {
  if (!el) return;
  el.textContent = value == null ? '' : String(value);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatPhone(input) {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return String(input ?? '').trim();
}

function formatMoney(value) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safe);
  } catch (e) {
    return `$${safe.toFixed(2)}`;
  }
}

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function capitalizeFirst(str) {
  if (!str) return '';
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}

function normalizeObjectArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === 'object') return Object.values(value);
  if (typeof value === 'string') return [value];
  return [];
}

function normalizeColorList(value) {
  return normalizeObjectArray(value)
    .map((entry) => {
      if (typeof entry === 'string') return { id: colorId(entry), label: entry };
      if (entry && typeof entry === 'object') {
        return {
          id: entry.id || entry.name || entry.label || '',
          label: entry.label || entry.name || entry.id || '',
          swatchUrl: entry.swatchUrl || entry.url || ''
        };
      }
      return null;
    })
    .filter((item) => item && (item.id || item.label));
}

function normalizeColorName(name) {
  return String(name ?? '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeMaterialName(name) {
  return normalizeColorName(name);
}

function normalizeMaterialKey(value) {
  return String(value || '').trim().toUpperCase();
}

function resolveColorKey(name) {
  const normalized = normalizeColorName(name);
  if (normalized === 'charcoal') return 'black';
  return normalized;
}

function colorId(label) {
  return String(label || '').toLowerCase().replace(/\s+/g, '_');
}

function colorObj(label) {
  return { id: colorId(label), label };
}

function getDisplayColorLabel(color) {
  const rawLabel = color?.label || color?.id || '';
  const normalized = normalizeColorName(rawLabel);
  if (normalized === 'charcoal') return 'Black';
  return rawLabel || color?.id || '';
}

function showBanner(message, variant = 'info') {
  const banner = byId('appBanner');
  if (!banner) return;
  banner.textContent = message;
  banner.classList.remove('hidden', 'banner-error', 'banner-info');
  banner.classList.add(variant === 'error' ? 'banner-error' : 'banner-info');
}

function showError(message) {
  showBanner(message, 'error');
}

function hideError() {
  const banner = byId('appBanner');
  if (!banner || !banner.classList.contains('banner-error')) return;
  banner.textContent = '';
  banner.classList.add('hidden');
  banner.classList.remove('banner-error');
}

async function logError({ errorType, location, userContext, rawPayload }) {
  try {
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isLocalHost) {
      console.error('[DEV] Error logged:', { errorType, location, userContext, rawPayload });
      return;
    }
    await fetch(ERROR_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environment: AppState.environment,
        userContext: userContext || '',
        errorType: errorType || 'UNKNOWN',
        location: location || '',
        rawPayload: rawPayload || null
      })
    });
  } catch (err) {
    console.error('Logging error failed:', err);
  }
}

window.addEventListener('error', (event) => {
  logError({
    errorType: 'UNCAUGHT_ERROR',
    location: 'window.onerror',
    rawPayload: {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    }
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logError({
    errorType: 'UNHANDLED_REJECTION',
    location: 'window.unhandledrejection',
    rawPayload: { reason: event.reason ? String(event.reason) : null }
  });
});


function scrollToFlowTop() {
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const app = byId('app');
    if (app && typeof app.scrollTo === 'function') {
      app.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  });
}

function showView(viewId) {
  $all('.view').forEach((el) => el.classList.remove('active-view'));
  const view = byId(`view-${viewId}`);
  if (view) view.classList.add('active-view');
  scrollToFlowTop();
}

function getCurrentScreenType() {
  return document.querySelector('input[name="screenType"]:checked')?.value || 'window';
}

function getSafeConfig() {
  return {
    environment: AppState.environment,
    stores: [],
    frameOptions: { window: [], door: [] },
    materialOptions: { window: [], door: [] },
    hardwareOptions: [],
    doorHardwareOptions: [],
    pricingWindow: [],
    pricingDoor: []
  };
}

function applyApprovedConfigOverrides(config) {
  const cfg = config || getSafeConfig();
  cfg.stores = STORE_OVERRIDES.map((store) => ({ ...store }));
  cfg.pricingWindow = PRICING_WINDOW.map((row) => ({ ...row }));
  cfg.pricingDoor = PRICING_DOOR.map((row) => ({ ...row }));

  ['window', 'door'].forEach((screenType) => {
    const list = Array.isArray(cfg.materialOptions?.[screenType]) ? cfg.materialOptions[screenType] : [];
    list.forEach((material) => {
      const key = normalizeMaterialKey(material.id || material.label);
      if (MATERIAL_COLORS[key]) material.colors = MATERIAL_COLORS[key].map(colorObj);
    });
  });

  return cfg;
}

async function loadConfig() {
  try {
    let resp;
    try {
      resp = await fetch('/data/config.json', { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (innerErr) {
      resp = await fetch('/config.json', { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    }

    const data = await resp.json();
    AppState.config = applyApprovedConfigOverrides(data);
    updateEnvironmentIndicator();
    populateStores();
    populateStaticOptions();
    hideError();
  } catch (err) {
    console.error('Failed to load config:', err);
    AppState.config = applyApprovedConfigOverrides(getSafeConfig());
    updateEnvironmentIndicator();
    showError('There was a problem loading configuration data. Some options may not appear correctly.');
    populateStores();
    populateStaticOptions();
  }
}

function updateEnvironmentIndicator() {
  const el = $('#envIndicator');
  if (!el) return;
  el.textContent = AppState.environment.toUpperCase();
  if (AppState.environment === 'prod') el.style.backgroundColor = '#2f6f2f';
}

function getStores() {
  return normalizeObjectArray(AppState.config?.stores);
}

function findStoreById(storeId) {
  return getStores().find((store) => String(store.id) === String(storeId)) || null;
}

function populateStores() {
  const select = $('#storeSelect');
  if (!select) return;
  select.innerHTML = '';

  const stores = getStores();
  if (!stores.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No stores available';
    opt.disabled = true;
    opt.selected = true;
    select.appendChild(opt);
    return;
  }

  stores.forEach((store, index) => {
    const opt = document.createElement('option');
    opt.value = store.id;
    opt.textContent = `${store.name} (${store.city}, ${store.state})`;
    if (index === 0) {
      opt.selected = true;
      AppState.store = store;
    }
    select.appendChild(opt);
  });
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

function getCustomerFormSnapshot() {
  const form = byId('customerForm');
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

function getCustomerApproxCoords(customerOrZip) {
  const zip = typeof customerOrZip === 'string' ? customerOrZip : customerOrZip?.zip;
  const cleanZip = String(zip || '').replace(/\D/g, '').slice(0, 5);
  return ZIP_COORDS[cleanZip] || null;
}

function getSelectedStoreCoords() {
  const selectedStoreId = byId('storeSelect')?.value;
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

function ensureStoreAutoNote() {
  let note = byId('storeAutoNote');
  const select = byId('storeSelect');
  if (!note && select && select.parentElement) {
    note = document.createElement('p');
    note.id = 'storeAutoNote';
    note.className = 'helper-text small';
    select.parentElement.appendChild(note);
  }
  return note;
}

function setSelectedStore(store, source = 'auto') {
  if (!store) return;
  const matchingStore = findStoreById(store.id) || store;
  AppState.store = matchingStore;

  const select = byId('storeSelect');
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
  const select = byId('storeSelect');
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
  const form = byId('customerForm');
  const select = byId('storeSelect');
  if (!form || !select || select.__storeAutoInstalled) return;
  select.__storeAutoInstalled = true;

  ['customerStreet', 'customerCity', 'customerState', 'customerZip'].forEach((id) => {
    const input = byId(id);
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
    renderSummary();
  });

  scheduleStoreAutoSelect(false);
}

function getLineItemSubtotal() {
  return AppState.lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
}

function getActiveTaxRate() {
  return ACTIVE_TAX_RATE;
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

function getQuoteTotals() {
  const subtotal = getLineItemSubtotal();
  const eligibility = getDeliveryEligibility(subtotal);
  const delivery = eligibility.method === 'delivery' && eligibility.available ? DELIVERY_FEE : 0;
  const tax = roundCurrency(subtotal * getActiveTaxRate());
  const total = roundCurrency(subtotal + tax + delivery);
  return { subtotal, tax, delivery, total };
}

function ensureDashboardFulfillmentSection() {
  let section = byId('dashboardFulfillmentSection');
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
  const note = byId('dashboardFulfillmentNote');
  const deliveryInput = byId('deliveryFulfillmentOption');
  if (!note || !deliveryInput) return;

  const eligibility = getDeliveryEligibility();
  const subtotalNeeded = Math.max(0, DELIVERY_MINIMUM_SUBTOTAL - eligibility.subtotal);
  const milesText = eligibility.distanceKnown ? `${eligibility.miles} miles` : 'unknown distance';
  const deliveryCanBeSelected = eligibility.minimumMet && eligibility.withinRadius;

  deliveryInput.disabled = !deliveryCanBeSelected;
  if (!deliveryCanBeSelected && eligibility.method === 'delivery') setFulfillmentMethod('pickup', { updateUi: false });

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

  note.textContent = getFulfillmentMethod() === 'delivery'
    ? `Delivery selected. $10 delivery fee applied. Estimated distance from selected store: ${milesText}.`
    : `Pickup selected. Delivery is available for this order for $10. Estimated distance from selected store: ${milesText}.`;
}

function getFrameOptionsForScreenType(screenType) {
  const cfg = AppState.config;
  if (!cfg || !cfg.frameOptions) return [];
  return normalizeObjectArray(cfg.frameOptions[screenType] || []);
}

function getMaterialOptionsForScreenType(screenType) {
  const cfg = AppState.config;
  if (!cfg || !cfg.materialOptions) return [];
  const fallback = cfg.materialOptions.window || [];
  return normalizeObjectArray(cfg.materialOptions[screenType] || fallback);
}

function populateStaticOptions() {
  const type = getCurrentScreenType();
  updateFrameSelects(type);
  updateMaterialSelects(type);
  populateDoorRollerOptions();
  populateWindowHardwareOptions();
  updateHardwareImage();
  updateStep5Titles();
}

function getFrameColorSwatchUrl(frameType, colorName) {
  return FRAME_SWATCH_MAP[resolveColorKey(colorName)] || '';
}

function getMaterialColorSwatchUrl(materialType, colorName) {
  const materialKey = normalizeMaterialName(materialType);
  const colorKey = resolveColorKey(colorName);
  if (materialKey === 'solar 70' || materialKey === 'solar 90') return SOLAR_SWATCH_MAP[colorKey] || MATERIAL_SWATCH_MAP[colorKey] || '';
  if (materialKey === 'pet') return PET_SWATCH_MAP[colorKey] || MATERIAL_SWATCH_MAP[colorKey] || '';
  if (materialKey === 'fiberglass') return FIBERGLASS_SWATCH_MAP[colorKey] || MATERIAL_SWATCH_MAP[colorKey] || '';
  return MATERIAL_SWATCH_MAP[colorKey] || '';
}

function syncFrameColorSwatch() {
  const sw = byId('frameColorSwatchInline');
  const img = byId('frameColorSwatchImgInline');
  const typeEl = byId('frameType');
  const colorEl = byId('frameColor');
  if (!colorEl) return;
  const colorName = colorEl.value || colorEl.options?.[colorEl.selectedIndex]?.text || '';
  if (sw) sw.style.background = colorName.toLowerCase();
  if (img && typeEl) {
    const url = getFrameColorSwatchUrl(typeEl.value, colorName);
    if (url) {
      img.src = url;
      img.style.display = '';
    } else {
      img.removeAttribute('src');
      img.style.display = 'none';
    }
  }
}

function syncMaterialColorSwatch() {
  const sw = byId('materialColorSwatchInline');
  const img = byId('materialColorSwatchImgInline');
  const typeEl = byId('materialType');
  const colorEl = byId('materialColor');
  if (!colorEl) return;
  const colorName = colorEl.value || colorEl.options?.[colorEl.selectedIndex]?.text || '';
  if (sw) sw.style.background = colorName.toLowerCase();
  if (img && typeEl) {
    const url = getMaterialColorSwatchUrl(typeEl.value, colorName);
    if (url) {
      img.src = url;
      img.style.display = '';
    } else {
      img.removeAttribute('src');
      img.style.display = 'none';
    }
  }
}

function updateFrameSelects(screenType) {
  const frameTypeSelect = $('#frameType');
  const frameColorSelect = $('#frameColor');
  if (!frameTypeSelect || !frameColorSelect || !AppState.config) return;

  const frames = getFrameOptionsForScreenType(screenType);
  frameTypeSelect.innerHTML = '';
  frames.forEach((frame, idx) => {
    const opt = document.createElement('option');
    opt.value = frame.id;
    opt.textContent = frame.label || frame.id;
    if (idx === 0) opt.selected = true;
    frameTypeSelect.appendChild(opt);
  });
  updateFrameColorOptions();
}

function updateFrameColorOptions() {
  const frameTypeSelect = $('#frameType');
  const frameColorSelect = $('#frameColor');
  if (!frameTypeSelect || !frameColorSelect || !AppState.config) return;

  const type = getCurrentScreenType();
  const frames = getFrameOptionsForScreenType(type);
  const frameDef = frames.find((f) => f.id === frameTypeSelect.value);
  const colors = normalizeColorList(frameDef?.colors);

  frameColorSelect.innerHTML = '';
  colors.forEach((color, idx) => {
    const opt = document.createElement('option');
    opt.value = color.id;
    opt.textContent = color.label;
    if (idx === 0) opt.selected = true;
    frameColorSelect.appendChild(opt);
  });

  renderFrameColorTiles();
  syncFrameColorSwatch();
}

function renderFrameColorTiles() {
  const container = $('#frameColorTiles');
  const frameTypeSelect = $('#frameType');
  const frameColorSelect = $('#frameColor');
  if (!container || !frameTypeSelect || !frameColorSelect) return;

  const type = getCurrentScreenType();
  const frames = getFrameOptionsForScreenType(type);
  const frameDef = frames.find((f) => f.id === frameTypeSelect.value);
  const colors = normalizeColorList(frameDef?.colors);
  container.innerHTML = '';
  if (!colors.length) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  colors.forEach((color) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `swatch-tile${color.id === frameColorSelect.value ? ' is-selected' : ''}`;
    btn.setAttribute('aria-pressed', color.id === frameColorSelect.value ? 'true' : 'false');

    const chip = document.createElement('span');
    chip.className = 'swatch-chip';
    const labelText = getDisplayColorLabel(color);
    const url = getFrameColorSwatchUrl(frameTypeSelect.value, labelText);
    if (url) chip.style.backgroundImage = `url("${url}")`;
    else chip.style.backgroundColor = String(labelText).toLowerCase();

    const label = document.createElement('span');
    label.className = 'swatch-label';
    label.textContent = labelText;

    btn.appendChild(chip);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      frameColorSelect.value = color.id;
      renderFrameColorTiles();
      syncFrameColorSwatch();
    });
    container.appendChild(btn);
  });
}

function updateMaterialSelects(screenType) {
  const materialTypeSelect = $('#materialType');
  const materialColorSelect = $('#materialColor');
  const materialDetailsEl = $('#materialDetails');
  if (!materialTypeSelect || !materialColorSelect || !AppState.config) return;

  const mats = getMaterialOptionsForScreenType(screenType);
  materialTypeSelect.innerHTML = '';
  mats.forEach((mat, idx) => {
    const opt = document.createElement('option');
    opt.value = mat.id;
    opt.textContent = mat.label || mat.id;
    if (idx === 0) opt.selected = true;
    materialTypeSelect.appendChild(opt);
  });

  updateMaterialColorOptions();
  if (materialDetailsEl) {
    const selMat = mats.find((m) => m.id === materialTypeSelect.value);
    materialDetailsEl.textContent = selMat?.description || 'Select a material to see its features.';
  }
}

function updateMaterialColorOptions() {
  const materialTypeSelect = $('#materialType');
  const materialColorSelect = $('#materialColor');
  const materialDetailsEl = $('#materialDetails');
  if (!materialTypeSelect || !materialColorSelect || !AppState.config) return;

  const type = getCurrentScreenType();
  const mats = getMaterialOptionsForScreenType(type);
  const matDef = mats.find((m) => m.id === materialTypeSelect.value);
  const colors = normalizeColorList(matDef?.colors);

  materialColorSelect.innerHTML = '';
  colors.forEach((color, idx) => {
    const opt = document.createElement('option');
    opt.value = color.id;
    opt.textContent = color.label;
    if (idx === 0) opt.selected = true;
    materialColorSelect.appendChild(opt);
  });

  if (materialDetailsEl) materialDetailsEl.textContent = matDef?.description || 'Select a material to see its features.';
  renderMaterialColorTiles();
  syncMaterialColorSwatch();
}

function renderMaterialColorTiles() {
  const container = $('#materialColorTiles');
  const materialTypeSelect = $('#materialType');
  const materialColorSelect = $('#materialColor');
  if (!container || !materialTypeSelect || !materialColorSelect) return;

  const type = getCurrentScreenType();
  const mats = getMaterialOptionsForScreenType(type);
  const matDef = mats.find((m) => m.id === materialTypeSelect.value);
  const colors = normalizeColorList(matDef?.colors);
  container.innerHTML = '';
  if (!colors.length) {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');

  colors.forEach((color) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `swatch-tile${color.id === materialColorSelect.value ? ' is-selected' : ''}`;
    btn.setAttribute('aria-pressed', color.id === materialColorSelect.value ? 'true' : 'false');

    const chip = document.createElement('span');
    chip.className = 'swatch-chip';
    const labelText = getDisplayColorLabel(color);
    const url = getMaterialColorSwatchUrl(materialTypeSelect.value, labelText);
    if (url) chip.style.backgroundImage = `url("${url}")`;
    else chip.style.backgroundColor = String(labelText).toLowerCase();

    const label = document.createElement('span');
    label.className = 'swatch-label';
    label.textContent = labelText;

    btn.appendChild(chip);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      materialColorSelect.value = color.id;
      renderMaterialColorTiles();
      syncMaterialColorSwatch();
    });
    container.appendChild(btn);
  });
}

function populateDoorRollerOptions() {
  const select = $('#doorRollers');
  if (!select || !AppState.config) return;
  select.innerHTML = '';
  normalizeObjectArray(AppState.config.doorHardwareOptions || []).forEach((hw, idx) => {
    const opt = document.createElement('option');
    opt.value = hw.id;
    opt.textContent = hw.label;
    if (hw.id === 'steel_rollers' || idx === 0) opt.selected = true;
    select.appendChild(opt);
  });
}

function populateWindowHardwareOptions() {
  const select = $('#hardwareType');
  if (!select || !AppState.config) return;
  select.innerHTML = '';
  normalizeObjectArray(AppState.config.hardwareOptions || []).forEach((hw, idx) => {
    const opt = document.createElement('option');
    opt.value = hw.id;
    opt.textContent = hw.label;
    if (idx === 0) opt.selected = true;
    select.appendChild(opt);
  });
}

function getHardwareDefById(id) {
  return normalizeObjectArray(AppState.config?.hardwareOptions).find((h) => h.id === id) || null;
}

function getDoorRollerDefById(id) {
  return normalizeObjectArray(AppState.config?.doorHardwareOptions).find((h) => h.id === id) || null;
}

function updateHardwareImage() {
  const preview = $('#hardwareImagePreview');
  const img = $('#hardwareImageImg');
  const caption = $('#hardwareImageCaption');
  if (!preview || !img || !caption) return;

  if (getCurrentScreenType() !== 'window') {
    preview.classList.add('hidden');
    return;
  }

  const def = getHardwareDefById($('#hardwareType')?.value);
  if (def && def.imageUrl) {
    let url = def.imageUrl;
    const match = url.match(/\/file\/d\/([^/]+)\//);
    if (match) url = `https://drive.google.com/uc?export=view&id=${match[1]}`;
    img.onload = () => preview.classList.remove('hidden');
    img.onerror = () => preview.classList.add('hidden');
    img.src = url;
    caption.textContent = def.label;
  } else {
    preview.classList.add('hidden');
  }
}

function resetHardwareAssignments() {
  currentHardwareAssignments = [];
  renderHardwareDiagram();
  updateHardwareSummary();
}

function handleAddHardware() {
  const typeSelect = $('#hardwareType');
  const qtyInput = $('#hardwareQty');
  const sideSelect = $('#hardwareSide');
  if (!typeSelect || !qtyInput || !sideSelect) return;

  const typeId = typeSelect.value;
  const qty = parseInt(qtyInput.value, 10) || 0;
  const side = sideSelect.value;
  if (!typeId || qty <= 0) {
    alert('Select a hardware type and a quantity greater than zero.');
    return;
  }

  const def = getHardwareDefById(typeId);
  currentHardwareAssignments.push({
    typeId,
    initials: def?.initials || '?',
    label: def?.label || typeId,
    side,
    qty
  });
  renderHardwareDiagram();
  updateHardwareSummary();
}

function renderHardwareDiagram() {
  const diagram = $('#hardwareDiagram');
  if (!diagram) return;
  const sideMap = {
    top: diagram.querySelector('.side-top'),
    right: diagram.querySelector('.side-right'),
    bottom: diagram.querySelector('.side-bottom'),
    left: diagram.querySelector('.side-left')
  };
  Object.values(sideMap).forEach((sideEl) => {
    if (sideEl) sideEl.innerHTML = '';
  });

  currentHardwareAssignments.forEach((assignment) => {
    const target = sideMap[assignment.side];
    if (!target) return;
    for (let i = 0; i < assignment.qty; i += 1) {
      const badge = document.createElement('span');
      badge.className = 'hardware-badge';
      badge.textContent = assignment.initials || '?';
      target.appendChild(badge);
    }
  });
}

function updateHardwareSummary() {
  const el = $('#hardwareListSummary');
  if (!el) return;
  if (!currentHardwareAssignments.length) {
    el.textContent = 'No hardware added yet.';
    return;
  }

  el.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'hardware-list';
  currentHardwareAssignments.forEach((assignment, index) => {
    const row = document.createElement('div');
    row.className = 'hardware-list-item';

    const label = document.createElement('span');
    label.textContent = `${assignment.initials || '?'} x${assignment.qty} on ${capitalizeFirst(assignment.side)}`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-secondary btn-xs';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      currentHardwareAssignments.splice(index, 1);
      renderHardwareDiagram();
      updateHardwareSummary();
    });

    row.appendChild(label);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
  el.appendChild(list);
}

function summarizeHardware(assignments) {
  if (!assignments || !assignments.length) return '';
  return assignments.map((a) => `${a.initials || '?'} x${a.qty} ${capitalizeFirst(a.side || '')}`).join('; ');
}

function summarizeDoorHardware(id) {
  if (!id) return '';
  const def = getDoorRollerDefById(id);
  return def ? `${def.initials || ''} - ${def.label}` : id;
}

function formatDimensionDisplay(whole, fraction) {
  const w = whole && String(whole).trim() !== '' ? String(whole).trim() : '0';
  const f = fraction && String(fraction).trim() !== '' ? String(fraction) : '';
  return f ? `${w} ${f}"` : `${w}"`;
}

function parseDimensionInches(wholeStr, fractionStr) {
  const whole = parseFloat(wholeStr || '0') || 0;
  let frac = 0;
  if (fractionStr) {
    const [numRaw, denRaw] = String(fractionStr).split('/');
    const num = parseFloat(numRaw) || 0;
    const den = parseFloat(denRaw) || 0;
    if (den > 0) frac = num / den;
  }
  return whole + frac;
}

function formatFrameSummary(item) {
  if (!item.frameType && !item.frameColor) return '';
  if (item.frameType && item.frameColor) return `${item.frameType} / ${item.frameColor}`;
  return item.frameType || item.frameColor || '';
}

function formatMaterialSummary(item) {
  if (!item.materialType && !item.materialColor) return '';
  if (item.materialType && item.materialColor) return `${item.materialType} / ${item.materialColor}`;
  return item.materialType || item.materialColor || '';
}

function getRetailRatePerInch(materialId, frameKey, screenType) {
  const list = screenType === 'door' ? normalizeObjectArray(AppState.config?.pricingDoor) : normalizeObjectArray(AppState.config?.pricingWindow);
  const row = list.find((p) => p.materialId === materialId && p.frameId === frameKey);
  return row ? Number(row.retailPerInch) : null;
}

function showScreenStep(step) {
  const screenType = getCurrentScreenType();
  const maxScreenStep = screenType === 'window' ? 6 : 5;
  const safeStep = Math.max(1, Math.min(step, maxScreenStep));
  currentScreenStep = safeStep;

  const sharedSubtitle = document.querySelector('#view-add-screen .view-subtitle');
  if (sharedSubtitle) sharedSubtitle.style.display = safeStep === 1 ? '' : 'none';

  const step6 = document.querySelector('.screen-step[data-step="6"]');
  if (step6) step6.style.display = screenType === 'door' ? 'none' : '';

  $all('.screen-step').forEach((el) => el.classList.remove('active-step'));
  const active = document.querySelector(`.screen-step[data-step="${safeStep}"]`);
  if (active) active.classList.add('active-step');

  const indicator = $('#screenStepIndicator');
  if (indicator) indicator.textContent = `Step ${safeStep} of ${maxScreenStep}`;

  if (safeStep === 6 && screenType === 'window') evaluateCrossbarRecommendation();

  const prevBtn = $('#btnScreenPrev');
  const nextBtn = $('#btnScreenNext');
  const saveBtn = $('#btnSaveScreen');
  if (prevBtn) prevBtn.disabled = safeStep === 1;
  if (nextBtn) nextBtn.style.display = safeStep === maxScreenStep ? 'none' : 'inline-flex';
  if (saveBtn) saveBtn.style.display = safeStep === maxScreenStep ? 'inline-flex' : 'none';
  scrollToFlowTop();
}

function handleNextStep() {
  const maxScreenStep = getCurrentScreenType() === 'window' ? 6 : 5;
  if (currentScreenStep < maxScreenStep) showScreenStep(currentScreenStep + 1);
}

function handlePrevStep() {
  if (currentScreenStep > 1) showScreenStep(currentScreenStep - 1);
}

function evaluateCrossbarRecommendation() {
  if (getCurrentScreenType() !== 'window') {
    crossbarRecommended = false;
    return;
  }

  const crossbarLabel = $('#crossbarLabel');
  const crossbarHelper = $('#crossbarHelper');
  const w = parseDimensionInches($('#screenWidthWhole')?.value, $('#screenWidthFraction')?.value);
  const h = parseDimensionInches($('#screenHeightWhole')?.value, $('#screenHeightFraction')?.value);
  const maxSide = Math.max(w, h);
  crossbarRecommended = maxSide > 47.5;

  if (crossbarLabel) crossbarLabel.textContent = crossbarRecommended ? 'Do you want a crossbar? Crossbar recommended for this size.' : 'Do you want a crossbar?';
  if (crossbarHelper) {
    crossbarHelper.textContent = crossbarRecommended
      ? 'This opening is large enough that a crossbar is recommended to reduce bowing.'
      : 'Crossbars are optional unless recommended for larger openings.';
  }
}

function handleScreenTypeChange() {
  const type = getCurrentScreenType();
  const windowFields = $('#windowOnlyFields');
  const doorFields = $('#doorOnlyFields');

  if (type === 'door') {
    windowFields?.classList.add('hidden');
    doorFields?.classList.remove('hidden');
    resetHardwareAssignments();
  } else {
    windowFields?.classList.remove('hidden');
    doorFields?.classList.add('hidden');
  }

  updateFrameSelects(type);
  updateMaterialSelects(type);
  populateDoorRollerOptions();
  populateWindowHardwareOptions();
  updateHardwareImage();
  updateStep5Titles();
  crossbarRecommended = false;
  showScreenStep(currentScreenStep);
}

function updateStep5Titles() {
  const type = getCurrentScreenType();
  const title = $('#step5Title');
  const subtitle = $('#step5Subtitle');
  if (title) title.textContent = type === 'door' ? 'Rollers and Handle' : 'Hardware';
  if (subtitle) subtitle.textContent = type === 'door' ? 'Choose the patio door roller type and handle orientation.' : "Let's place the hardware on your window screen.";
}

function handleCrossbarChange() {
  const crossbarSelect = $('#crossbarNeeded');
  const details = $('#crossbarDetails');
  if (!crossbarSelect || !details) return;
  details.classList.toggle('hidden', crossbarSelect.value !== 'yes');
}

function handleCustomerSubmit(event) {
  event.preventDefault();
  const customer = getCustomerFormSnapshot();
  if (!customer) return;

  if (!customer.name || !customer.email || !customer.phone) {
    alert('Please provide name, phone, and email.');
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

function handleScreenSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const type = getCurrentScreenType();
  const qty = Math.max(1, parseInt(form.screenQty.value, 10) || 1);

  const widthWhole = form.screenWidthWhole.value;
  const widthFraction = form.screenWidthFraction.value;
  const heightWhole = form.screenHeightWhole.value;
  const heightFraction = form.screenHeightFraction.value;

  const widthDisplay = formatDimensionDisplay(widthWhole, widthFraction);
  const heightDisplay = formatDimensionDisplay(heightWhole, heightFraction);
  const widthInches = parseDimensionInches(widthWhole, widthFraction);
  const heightInches = parseDimensionInches(heightWhole, heightFraction);

  if (widthInches <= 0 || heightInches <= 0) {
    alert('Please enter valid width and height measurements.');
    return;
  }

  const frameType = form.frameType.value;
  const frameColor = form.frameColor.value;
  const materialType = form.materialType.value;
  const materialColor = form.materialColor.value;

  const frames = getFrameOptionsForScreenType(type);
  const frameDef = frames.find((f) => f.id === frameType);
  const frameKey = type === 'door' && frameDef?.pricingKey ? frameDef.pricingKey : frameType;
  const ratePerInch = getRetailRatePerInch(materialType, frameKey, type);

  let unitPrice = null;
  let lineTotal = null;
  if (ratePerInch != null) {
    const pricedHalfPerimeter = Math.ceil(widthInches + heightInches);
    unitPrice = roundCurrency(pricedHalfPerimeter * ratePerInch);
    lineTotal = roundCurrency(unitPrice * qty);
  } else {
    logError({
      errorType: 'PRICING_LOOKUP_MISS',
      location: 'handleScreenSubmit',
      rawPayload: { materialType, frameKey, screenType: type }
    });
  }

  if (type === 'window' && crossbarRecommended && form.crossbarNeeded.value === 'no') {
    alert('This opening is large enough that we recommend a crossbar. You chose not to include one. Be aware this may cause some bowing in the middle.');
  }

  const baseItem = {
    id: AppState.lineItems.length + 1,
    screenType: type,
    qty,
    width: widthDisplay,
    height: heightDisplay,
    widthWhole,
    widthFraction,
    heightWhole,
    heightFraction,
    widthInches,
    heightInches,
    frameType,
    framePricingKey: frameKey,
    frameColor,
    materialType,
    materialColor,
    unitPrice,
    lineTotal
  };

  if (type === 'window') {
    baseItem.frameCutType = form.frameCutType.value;
    baseItem.crossbarNeeded = form.crossbarNeeded.value === 'yes';
    if (baseItem.crossbarNeeded) {
      baseItem.crossbarType = form.crossbarType.value.trim();
      baseItem.crossbarOrientation = form.crossbarOrientation.value;
      baseItem.crossbarDistance = form.crossbarDistance.value.trim();
    }
    baseItem.hardwareAssignments = currentHardwareAssignments.slice();
  } else {
    baseItem.doorRollers = form.doorRollers.value;
    baseItem.handleOrientation = form.handleOrientation.value;
    const hhWhole = form.handleHeightWhole.value;
    const hhFraction = form.handleHeightFraction.value;
    baseItem.handleHeightDisplay = formatDimensionDisplay(hhWhole, hhFraction);
    baseItem.handleHeightInches = parseDimensionInches(hhWhole, hhFraction);
  }

  AppState.lineItems.push(baseItem);
  resetHardwareAssignments();
  renderLineItems();
  renderSummary();
  showView('dashboard');
}

function measureShort(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const cleaned = raw.replace(/[“”]/g, '"').replace(/\s+/g, ' ');
  const match = cleaned.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)/);
  const base = match ? match[1] : cleaned.split(/\s+/)[0].replace(/"/g, '');
  return base ? base.replace(/"/g, '') + '"' : '';
}

function compactCrossbarHandle(item) {
  const type = String(item?.screenType || item?.type || '').toLowerCase();
  if (type === 'door') {
    const sideRaw = String(item.handleOrientation || item.handle_orientation || '').toLowerCase();
    const side = sideRaw.includes('left') || sideRaw === 'xo' || sideRaw.includes('xo') ? 'L' : 'R';
    const measurement = measureShort(item.handleHeightDisplay || item.handle_height_display);
    return measurement ? `${side}:${measurement}` : side;
  }

  const needed = item && (item.crossbarNeeded === true || item.crossbar_needed === true || item.crossbar_needed === 'true');
  if (!needed) return 'None';
  const orientationRaw = String(item.crossbarOrientation || item.crossbar_orientation || '').toLowerCase();
  const orientation = orientationRaw.charAt(0) === 'v' ? 'V' : 'H';
  const distance = measureShort(item.crossbarDistance || item.crossbar_distance_display);
  return distance ? `${orientation}:${distance}` : orientation;
}

function renderLineItems() {
  const tbody = $('#lineItemsBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  AppState.lineItems.forEach((item, index) => {
    const tr = document.createElement('tr');
    const hwSummary = item.screenType === 'window' ? summarizeHardware(item.hardwareAssignments || []) : summarizeDoorHardware(item.doorRollers);
    const linePrice = item.lineTotal != null ? `$${item.lineTotal.toFixed(2)}` : '—';

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.screenType === 'door' ? 'Patio Door' : 'Window'}</td>
      <td>${item.qty}</td>
      <td>${escapeHtml(item.width)}</td>
      <td>${escapeHtml(item.height)}</td>
      <td>${escapeHtml(formatFrameSummary(item))}</td>
      <td>${escapeHtml(formatMaterialSummary(item))}</td>
      <td class="crossbar-handle-cell">${escapeHtml(compactCrossbarHandle(item))}</td>
      <td>${escapeHtml(hwSummary)}</td>
      <td>${linePrice}</td>
      <td><button type="button" class="btn btn-secondary btn-xs" data-index="${index}">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button[data-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (!Number.isNaN(idx)) {
        AppState.lineItems.splice(idx, 1);
        renderLineItems();
        renderSummary();
      }
    });
  });
}

function ensureSuccessTotalsCard() {
  let card = byId('successTotalsCard');
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
  const card = ensureSuccessTotalsCard();
  if (!card) return;
  const totals = getQuoteTotals();
  setText($('#successSubtotalValue'), formatMoney(totals.subtotal));
  setText($('#successTaxValue'), formatMoney(totals.tax));
  setText($('#successDeliveryValue'), formatMoney(totals.delivery));
  setText($('#successTotalValue'), formatMoney(totals.total));
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

function renderSuccessLineItems() {
  try {
    const tbody = $('#successLineItemsBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    AppState.lineItems.forEach((item, index) => {
      const tr = document.createElement('tr');
      const hwSummary = item.screenType === 'window' ? summarizeHardware(item.hardwareAssignments || []) : summarizeDoorHardware(item.doorRollers);
      const linePrice = item.lineTotal != null ? `$${item.lineTotal.toFixed(2)}` : '—';
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.screenType === 'door' ? 'Patio Door' : 'Window'}</td>
        <td>${item.qty}</td>
        <td>${escapeHtml(item.width)}</td>
        <td>${escapeHtml(item.height)}</td>
        <td>${escapeHtml(formatFrameSummary(item))}</td>
        <td>${escapeHtml(formatMaterialSummary(item))}</td>
        <td class="crossbar-handle-cell">${escapeHtml(compactCrossbarHandle(item))}</td>
        <td>${escapeHtml(hwSummary)}</td>
        <td>${linePrice}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Render success line items failed:', err);
    showError('There was a problem rendering the success summary. You can still continue.');
  }
}

function updateSuccessPaymentLink() {
  const link = byId('successPaymentLink');
  const line = byId('successStripeLine');
  if (!link || !line) return;

  if (AppState.paymentUrl) {
    link.href = AppState.paymentUrl;
    link.classList.remove('disabled');
    link.setAttribute('aria-disabled', 'false');
    line.classList.remove('hidden');
  } else if (AppState.stripeEnabled) {
    line.classList.remove('hidden');
    link.href = '#';
    link.setAttribute('aria-disabled', 'true');
  } else {
    link.href = '#';
    link.setAttribute('aria-disabled', 'true');
    line.classList.add('hidden');
  }
}

function renderSuccessView() {
  const quoteIdEl = $('#successQuoteId');
  if (quoteIdEl) quoteIdEl.textContent = AppState.quoteId || '(pending)';
  renderSummary();
  renderSuccessLineItems();
  renderSuccessTotals();
  updateSuccessPaymentLink();
  showView('success');
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
    AppState.paymentUrl = result?.payment_url || result?.quote?.payment_url || null;
    AppState.stripeEnabled = Boolean(AppState.paymentUrl);
    renderSuccessView();
  } catch (err) {
    console.error('Submit quote failed:', err);
    showError(err?.message || 'Quote submission failed. Please try again.');
    alert(err?.message || 'Quote submission failed. Please try again.');
  }
}

function generateQuoteId() {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `Q-${ts}-${rand}`;
}

function resetScreenForm() {
  const form = $('#screenForm');
  if (!form) return;
  form.reset();
  const firstType = form.querySelector('input[name="screenType"]');
  if (firstType) firstType.checked = true;
  handleScreenTypeChange();
  handleCrossbarChange();
  resetHardwareAssignments();
  crossbarRecommended = false;
  showScreenStep(1);
}

function resetQuote() {
  AppState.customer = null;
  AppState.store = getStores()[0] || null;
  AppState.lineItems = [];
  AppState.quoteId = null;
  AppState.paymentUrl = null;
  AppState.stripeEnabled = false;
  AppState.fulfillmentMethod = 'pickup';
  const ack = $('#ackMeasurements');
  if (ack) ack.checked = false;
  renderLineItems();
  renderSummary();
}

function setNumericKeyboard(input, mode = 'numeric') {
  if (!input) return;
  input.setAttribute('inputmode', mode);
  input.setAttribute('pattern', mode === 'numeric' ? '[0-9]*' : '[0-9.]*');
  input.setAttribute('autocomplete', 'off');
}

function normalizeQtyValue(input) {
  const raw = parseInt(input.value, 10);
  const min = parseInt(input.getAttribute('min') || '1', 10);
  const next = Number.isFinite(raw) ? raw : min;
  input.value = String(Math.max(min, next));
}

function changeQty(delta) {
  const input = byId('hardwareQty');
  if (!input) return;
  normalizeQtyValue(input);
  const min = parseInt(input.getAttribute('min') || '1', 10);
  const current = parseInt(input.value, 10) || min;
  input.value = String(Math.max(min, current + delta));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function installNumericInputHints() {
  ['screenQty', 'screenWidthWhole', 'screenHeightWhole', 'handleHeightWhole', 'hardwareQty'].forEach((id) => setNumericKeyboard(byId(id), 'numeric'));
}

function installHardwareQtyControls() {
  const input = byId('hardwareQty');
  if (!input || input.closest('.qty-stepper')) return;

  input.classList.add('hardware-qty-input');
  setNumericKeyboard(input, 'numeric');

  const wrapper = document.createElement('div');
  wrapper.className = 'qty-stepper hardware-qty-stepper';

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'qty-stepper-btn';
  minus.id = 'hardwareQtyMinus';
  minus.setAttribute('aria-label', 'Decrease hardware quantity');
  minus.textContent = '−';

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'qty-stepper-btn';
  plus.id = 'hardwareQtyPlus';
  plus.setAttribute('aria-label', 'Increase hardware quantity');
  plus.textContent = '+';

  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(minus);
  wrapper.appendChild(input);
  wrapper.appendChild(plus);

  minus.addEventListener('click', () => changeQty(-1));
  plus.addEventListener('click', () => changeQty(1));
  input.addEventListener('blur', () => normalizeQtyValue(input));
}

function installHardeningStyles() {
  if (byId('alphaHardeningStyles')) return;
  const style = document.createElement('style');
  style.id = 'alphaHardeningStyles';
  style.textContent = `
    #frameColor,#materialColor{display:none!important}
    #frameColorSwatchPreview,#materialColorSwatchPreview{display:none!important}
    .swatch-tile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:.75rem;margin-top:.75rem}
    .swatch-tile-grid .swatch-tile{min-width:0}
    .lineitems-table th.crossbar-handle-header,.lineitems-table td.crossbar-handle-cell{white-space:nowrap}
    .hardware-layout{display:flex;flex-wrap:wrap;gap:1.25rem;align-items:flex-start;margin-top:.5rem;min-width:0}
    .dimension-input{grid-template-columns:minmax(0,.72fr) minmax(72px,.28fr);max-width:560px}
    .dimension-input input,.dimension-input select{text-align:center}
    #hardwareSide{margin-bottom:.65rem}
    .qty-stepper{display:grid;grid-template-columns:46px minmax(64px,92px) 46px;align-items:center;gap:.45rem;max-width:200px}
    .qty-stepper .hardware-qty-input{text-align:center;width:100%;min-width:0}
    .qty-stepper-btn{height:42px;width:46px;border:0;border-radius:999px;background:#e3e6ea;color:#222;font-size:1.35rem;line-height:1;font-weight:700;cursor:pointer}
    .qty-stepper-btn:active{transform:translateY(1px)}
    @media(max-width:640px){
      .dimension-input{grid-template-columns:minmax(0,.68fr) minmax(70px,.32fr);max-width:100%}
      .qty-stepper{grid-template-columns:48px minmax(56px,86px) 48px;max-width:202px}
      .hardware-layout{flex-direction:column}
    }
  `;
  document.head.appendChild(style);
}

function refreshHeaders() {
  document.querySelectorAll('.lineitems-table thead tr').forEach((row) => {
    Array.from(row.children).forEach((th) => {
      const text = th.textContent.trim().toLowerCase().replace(/\s+/g, ' ');
      if (text === 'crossbar' || text === 'crossbar / handle') {
        th.innerHTML = 'Crossbar /<br>Handle';
        th.classList.add('crossbar-handle-header');
      }
    });
  });
}

function initEventHandlers() {
  $('#btnGetStarted')?.addEventListener('click', () => showView('customer'));
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      if (target) showView(target);
    });
  });

  $('#customerForm')?.addEventListener('submit', handleCustomerSubmit);
  $('#btnAddScreen')?.addEventListener('click', () => {
    resetScreenForm();
    showView('add-screen');
  });

  $('#screenForm')?.addEventListener('submit', handleScreenSubmit);
  $('#btnCancelScreen')?.addEventListener('click', () => showView('dashboard'));
  $('#btnScreenNext')?.addEventListener('click', handleNextStep);
  $('#btnScreenPrev')?.addEventListener('click', handlePrevStep);
  document.querySelectorAll('input[name="screenType"]').forEach((radio) => radio.addEventListener('change', handleScreenTypeChange));
  $('#crossbarNeeded')?.addEventListener('change', handleCrossbarChange);
  $('#frameType')?.addEventListener('change', updateFrameColorOptions);
  $('#frameColor')?.addEventListener('change', () => {
    syncFrameColorSwatch();
    renderFrameColorTiles();
  });
  $('#materialType')?.addEventListener('change', updateMaterialColorOptions);
  $('#materialColor')?.addEventListener('change', () => {
    syncMaterialColorSwatch();
    renderMaterialColorTiles();
  });
  $('#btnAddHardware')?.addEventListener('click', handleAddHardware);
  $('#hardwareType')?.addEventListener('change', updateHardwareImage);
  $('#btnSubmitQuote')?.addEventListener('click', handleSubmitQuote);
  $('#btnNewQuote')?.addEventListener('click', () => {
    resetQuote();
    showView('landing');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initEventHandlers();
  installHardeningStyles();
  installNumericInputHints();
  installHardwareQtyControls();
  installStoreAutoSelectBehavior();
  ensureDashboardFulfillmentSection();

  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalHost) showBanner('DEV mode: remote calls disabled.', 'info');

  await loadConfig();
  resetQuote();
  showScreenStep(1);
  updateDashboardFulfillmentUi();
  refreshHeaders();
});
