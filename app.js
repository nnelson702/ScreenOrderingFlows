// app.js
// Screen Ordering Tool - conversational SPA

// Configurable settings
const ERROR_LOG_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbxE-qLmoNnnqPVaxMl6jNs40jAyWYwRzvngrWx5LbAvZuJrV_XKSjscwxghAGAXrjXt/exec';
const ENVIRONMENT = 'dev';
const TAX_RATE = 0;

// Global application state
const AppState = {
  environment: ENVIRONMENT,
  config: null,
  customer: null,
  store: null,
  lineItems: [],
  quoteId: null,
  stripeEnabled: false
};

// Intermediate state variables
let currentHardwareAssignments = [];
let currentScreenStep = 1;
let crossbarRecommended = false;

// Utility functions
function $(selector) {
  return document.querySelector(selector);
}
// ---------- Small DOM helpers ----------
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
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
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

// Show a non-blocking error message in the error banner. The banner will appear near the top of the page and not disrupt form submissions.
function showError(message) {
  const banner = document.getElementById('errorBanner');
  if (!banner) {
    console.error('Error banner element not found');
    return;
  }
  banner.textContent = message;
  banner.style.display = 'block';
}

// Hide the error banner
function hideError() {
  const banner = document.getElementById('errorBanner');
  if (banner) {
    banner.textContent = '';
    banner.style.display = 'none';
  }
}


function driveToDirect(url) {
  const s = String(url ?? '');
  const m = s.match(/\/d\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!m) return s;
  return `https://drive.google.com/uc?export=download&id=${m[1]}`;
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'object') return Object.values(value);
  return [];
}


function showView(viewId) {
  document
    .querySelectorAll('.view')
    .forEach((el) => el.classList.remove('active-view'));
  const view = document.getElementById(`view-${viewId}`);
  if (view) view.classList.add('active-view');
}
function getCurrentScreenType() {
  return document.querySelector('input[name="screenType"]:checked')?.value || 'window';
}

function getFrameColorSwatchUrl(frameType, colorName) {
  const cfg = AppState.config;
  const list = ensureArray(cfg?.frameOptions?.window);
  const item = list.find((x) => String(x.type).trim() === String(frameType).trim());
  const colorObj = item?.colors?.find((c) => String(c.name).trim() === String(colorName).trim());
  return colorObj?.swatchUrl ? driveToDirect(colorObj.swatchUrl) : '';
}

function getMaterialColorSwatchUrl(materialType, colorName) {
  const cfg = AppState.config;
  const list = ensureArray(cfg?.materialOptions);
  const item = list.find((x) => String(x.type).trim() === String(materialType).trim());
  const colorObj = item?.colors?.find((c) => String(c.name).trim() === String(colorName).trim());
  return colorObj?.swatchUrl ? driveToDirect(colorObj.swatchUrl) : '';
}

function syncFrameColorSwatch() {
  const sw = document.getElementById('frameColorSwatch');
  const img = document.getElementById('frameColorSwatchImg');
  const typeEl = document.getElementById('frameType');
  const colorEl = document.getElementById('frameColor');
  if (!colorEl) return;

  const colorName = colorEl.value || colorEl.options?.[colorEl.selectedIndex]?.text || '';
  if (sw) sw.style.background = (colorName || '').toLowerCase();
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
  const sw = document.getElementById('materialColorSwatch');
  const img = document.getElementById('materialColorSwatchImg');
  const typeEl = document.getElementById('materialType');
  const colorEl = document.getElementById('materialColor');
  if (!colorEl) return;

  const colorName = colorEl.value || colorEl.options?.[colorEl.selectedIndex]?.text || '';
  if (sw) sw.style.background = (colorName || '').toLowerCase();
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


function formatAddress(addr) {
  if (!addr) return '';
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;
}
function formatFrameSummary(item) {
  if (!item.frameType && !item.frameColor) return '';
  if (item.frameType && item.frameColor) {
    return `${item.frameType} / ${item.frameColor}`;
  }
  return item.frameType || item.frameColor || '';
}
function formatMaterialSummary(item) {
  if (!item.materialType && !item.materialColor) return '';
  if (item.materialType && item.materialColor) {
    return `${item.materialType} / ${item.materialColor}`;
  }
  return item.materialType || item.materialColor || '';
}
function formatDimensionDisplay(whole, fraction) {
  const w = whole && String(whole).trim() !== '' ? String(whole).trim() : '0';
  const f = fraction && String(fraction).trim() !== '' ? String(fraction) : '';
  if (f) return `${w} ${f}"`;
  return `${w}"`;
}
function parseDimensionInches(wholeStr, fractionStr) {
  const whole = parseFloat(wholeStr || '0') || 0;
  let frac = 0;
  if (fractionStr) {
    const parts = String(fractionStr).split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]) || 0;
      const den = parseFloat(parts[1]) || 0;
      if (den > 0) frac = num / den;
    }
  }
  return whole + frac;
}
function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function generateQuoteId() {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `Q-${ts}-${rand}`;
}
async function logError({ errorType, location, userContext, rawPayload }) {
  try {
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (isLocalHost) {
      // Local dev: avoid CORS noise from Apps Script. Keep errors visible in console.
      console.error('[DEV] Error logged:', { errorType, location, userContext, rawPayload });
      return;
    }
    const payload = {
      environment: AppState.environment,
      userContext: userContext || '',
      errorType: errorType || 'UNKNOWN',
      location: location || '',
      rawPayload: rawPayload || null
    };
    await fetch(ERROR_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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
    rawPayload: {
      reason: event.reason ? String(event.reason) : null
    }
  });
});

// Pricing lookup
function getRetailRatePerInch(materialId, frameKey, screenType) {
  const cfg = AppState.config;
  if (!cfg) return null;
  const list = screenType === 'door' ? ensureArray(cfg.pricingDoor) : ensureArray(cfg.pricingWindow);
  const row = list.find(
    (p) => p.materialId === materialId && p.frameId === frameKey
  );
  return row ? row.retailPerInch : null;
}

// Config loading
async function loadConfig() {
  try {
    // Attempt to load config from the /data directory first. If that fails, try the root.
    let resp;
    try {
      resp = await fetch('data/config.json', { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (innerErr) {
      // Fallback to root if /data is missing
      resp = await fetch('config.json', { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();
    AppState.config = data;
    updateEnvironmentIndicator();
    populateStores();
    populateStaticOptions();
    hideError();
  } catch (err) {
    console.error('Failed to load config:', err);
    AppState.config = null;
    updateEnvironmentIndicator();
    // Avoid remote logging for config errors in local dev; still log to console
    // Show a non-blocking error banner
    showError('There was a problem loading configuration data. Some options may not appear correctly.');
  }
}
function updateEnvironmentIndicator() {
  const el = $('#envIndicator');
  if (!el) return;
  el.textContent = AppState.environment.toUpperCase();
  if (AppState.environment === 'prod') {
    el.style.backgroundColor = '#2f6f2f';
  }
}

// Populate store dropdown
function populateStores() {
  const select = $('#storeSelect');
  if (!select) return;
  select.innerHTML = '';
  const stores = AppState.config?.stores;
  if (!Array.isArray(stores) || stores.length === 0) {
    // Show placeholder when no stores available; do not block form submission
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

// Auto-select the nearest store based on the provided ZIP code. Uses simple
// numeric distance as a proxy when geolocation APIs are unavailable. Returns
// the best matching store or null if none.
function autoSelectStore(zip) {
  if (!AppState.config || !Array.isArray(AppState.config.stores) || !zip) {
    return null;
  }
  // Extract only numeric digits from the ZIP code
  const zipNum = parseInt(String(zip).replace(/\D/g, ''));
  let bestStore = null;
  let minDiff = Infinity;
  AppState.config.stores.forEach((store) => {
    const sZipNum = parseInt(String(store.zip).replace(/\D/g, ''));
    if (!isNaN(zipNum) && !isNaN(sZipNum)) {
      const diff = Math.abs(sZipNum - zipNum);
      if (diff < minDiff) {
        minDiff = diff;
        bestStore = store;
      }
    }
  });
  return bestStore || AppState.config.stores[0] || null;
}

// Helpers for options by screen type
function getFrameOptionsForScreenType(screenType) {
  const cfg = AppState.config;
  if (!cfg || !cfg.frameOptions) return [];
  return cfg.frameOptions[screenType] || [];
}
function getMaterialOptionsForScreenType(screenType) {
  const cfg = AppState.config;
  if (!cfg || !cfg.materialOptions) return [];
  return cfg.materialOptions[screenType] || cfg.materialOptions.window || [];
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
function updateFrameSelects(screenType) {
  const frameTypeSelect = $('#frameType');
  const frameColorSelect = $('#frameColor');
  if (!frameTypeSelect || !frameColorSelect || !AppState.config) return;

  const frames = getFrameOptionsForScreenType(screenType);
  frameTypeSelect.innerHTML = '';
  frames.forEach((frame, idx) => {
    const opt = document.createElement('option');
    opt.value = frame.id;
    opt.textContent = frame.label;
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
  const selectedFrameId = frameTypeSelect.value;
  const frameDef = frames.find((f) => f.id === selectedFrameId);

  frameColorSelect.innerHTML = '';
  (frameDef?.colors || []).forEach((color, idx) => {
    const opt = document.createElement('option');
    opt.value = color.id;
    opt.textContent = color.label;
    if (idx === 0) opt.selected = true;
    frameColorSelect.appendChild(opt);
  });

  updateFrameColorSwatch();
}
function updateFrameColorSwatch() {
  const frameTypeSelect = $('#frameType');
  const frameColorSelect = $('#frameColor');
  const swatchContainer = $('#frameColorSwatchPreview');
  const swatchImg = $('#frameColorSwatchImg');
  const swatchLabel = $('#frameColorSwatchLabel');

  if (
    !frameTypeSelect ||
    !frameColorSelect ||
    !swatchContainer ||
    !swatchImg ||
    !swatchLabel ||
    !AppState.config
  ) {
    return;
  }

  const type = getCurrentScreenType();
  const frames = getFrameOptionsForScreenType(type);
  const frameDef = frames.find((f) => f.id === frameTypeSelect.value);
  const colorDef = (frameDef?.colors || []).find(
    (c) => c.id === frameColorSelect.value
  );

  if (colorDef && colorDef.swatchUrl) {
    // convert Google Drive share link to direct view
    let url = colorDef.swatchUrl;
    const match = url.match(/\/file\/d\/([^/]+)\//);
    if (match) {
      url = `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    swatchImg.onload = () => {
      swatchContainer.classList.remove('hidden');
    };
    swatchImg.onerror = () => {
      swatchContainer.classList.add('hidden');
    };
    swatchImg.src = url;
    swatchImg.alt = `${colorDef.label} frame swatch`;
    swatchLabel.textContent = `${frameDef.label} – ${colorDef.label}`;
  } else {
    swatchContainer.classList.add('hidden');
  }
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
    opt.textContent = mat.label;
    if (idx === 0) opt.selected = true;
    materialTypeSelect.appendChild(opt);
  });
  updateMaterialColorOptions();
  if (materialDetailsEl) {
    const selMat = mats.find((m) => m.id === materialTypeSelect.value);
    if (selMat?.description) {
      materialDetailsEl.textContent = selMat.description;
    } else {
      materialDetailsEl.textContent = 'Select a material to see its features.';
    }
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
  materialColorSelect.innerHTML = '';
  (matDef?.colors || []).forEach((color, idx) => {
    const opt = document.createElement('option');
    opt.value = color.id;
    opt.textContent = color.label;
    if (idx === 0) opt.selected = true;
    materialColorSelect.appendChild(opt);
  });
  if (materialDetailsEl) {
    if (matDef?.description) {
      materialDetailsEl.textContent = matDef.description;
    } else {
      materialDetailsEl.textContent = 'Select a material to see its features.';
    }
  }
}
function populateDoorRollerOptions() {
  const select = $('#doorRollers');
  if (!select || !AppState.config) return;
  select.innerHTML = '';
  const list = AppState.config.doorHardwareOptions || [];
  list.forEach((hw, idx) => {
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
  (AppState.config.hardwareOptions || []).forEach((hw, idx) => {
    const opt = document.createElement('option');
    opt.value = hw.id;
    opt.textContent = hw.label;
    if (idx === 0) opt.selected = true;
    select.appendChild(opt);
  });
}
function getHardwareDefById(id) {
  if (!AppState.config || !Array.isArray(AppState.config.hardwareOptions))
    return null;
  return AppState.config.hardwareOptions.find((h) => h.id === id) || null;
}
function getDoorRollerDefById(id) {
  if (!AppState.config || !Array.isArray(AppState.config.doorHardwareOptions))
    return null;
  return AppState.config.doorHardwareOptions.find((h) => h.id === id) || null;
}

// Update hardware image preview
function updateHardwareImage() {
  const preview = $('#hardwareImagePreview');
  const img = $('#hardwareImageImg');
  const caption = $('#hardwareImageCaption');

  if (!preview || !img || !caption) return;

  const type = getCurrentScreenType();
  if (type !== 'window') {
    preview.classList.add('hidden');
    return;
  }
  const typeSelect = $('#hardwareType');
  if (!typeSelect) {
    preview.classList.add('hidden');
    return;
  }
  const def = getHardwareDefById(typeSelect.value);
  if (def && def.imageUrl) {
    let url = def.imageUrl;
    const match = url.match(/\/file\/d\/([^/]+)\//);
    if (match) {
      url = `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    img.onload = () => {
      preview.classList.remove('hidden');
    };
    img.onerror = () => {
      preview.classList.add('hidden');
    };
    img.src = url;
    caption.textContent = def.label;
  } else {
    preview.classList.add('hidden');
  }
}

// Hardware diagram helpers
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
  const topEl = diagram.querySelector('.side-top');
  const rightEl = diagram.querySelector('.side-right');
  const bottomEl = diagram.querySelector('.side-bottom');
  const leftEl = diagram.querySelector('.side-left');
  [topEl, rightEl, bottomEl, leftEl].forEach((sideEl) => {
    if (sideEl) sideEl.innerHTML = '';
  });
  currentHardwareAssignments.forEach((assignment) => {
    const target =
      assignment.side === 'top'
        ? topEl
        : assignment.side === 'right'
        ? rightEl
        : assignment.side === 'bottom'
        ? bottomEl
        : leftEl;
    if (!target) return;
    for (let i = 0; i < assignment.qty; i++) {
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
  const parts = currentHardwareAssignments.map((a) => {
    return `${a.initials || '?'} x${a.qty} on ${capitalizeFirst(a.side)}`;
  });
  el.textContent = parts.join('; ');
}
function summarizeHardware(assignments) {
  if (!assignments || !assignments.length) return '';
  return assignments
    .map(
      (a) =>
        `${a.initials || '?'} x${a.qty} ${capitalizeFirst(a.side || '')}`
    )
    .join('; ');
}
function summarizeDoorHardware(id) {
  if (!id) return '';
  const def = getDoorRollerDefById(id);
  return def ? `${def.initials || ''} - ${def.label}` : id;
}

// Stepper helpers
function showScreenStep(step) {
  // Show the shared "We'll walk through..." subtitle only on Step 1
  const sharedSubtitle = document.querySelector('#view-add-screen .view-subtitle');
  if (sharedSubtitle) sharedSubtitle.style.display = (step === 1 ? '' : 'none');


  currentScreenStep = step;
  const screenType = getCurrentScreenType();
  const MAX_SCREEN_STEP = screenType === 'window' ? 6 : 5;
  
  // Hide Step 6 entirely for doors
  const step6 = document.querySelector('.screen-step[data-step="6"]');
  if (step6) {
    if (screenType === 'door') {
      step6.style.display = 'none';
    } else {
      step6.style.display = '';
    }
  }
  
  document.querySelectorAll('.screen-step').forEach((el) => {
    el.classList.remove('active-step');
  });
  const active = document.querySelector(`.screen-step[data-step="${step}"]`);
  if (active) active.classList.add('active-step');

  const indicator = $('#screenStepIndicator');
  if (indicator) {
    indicator.textContent = `Step ${step} of ${MAX_SCREEN_STEP}`;
  }
  
  // Evaluate crossbar recommendation when reaching Step 6 for window screens
  if (step === 6 && screenType === 'window') {
    evaluateCrossbarRecommendation();
  }
  
  const prevBtn = $('#btnScreenPrev');
  const nextBtn = $('#btnScreenNext');
  const saveBtn = $('#btnSaveScreen');
  if (prevBtn) prevBtn.disabled = step === 1;
  if (nextBtn) nextBtn.style.display =
    step === MAX_SCREEN_STEP ? 'none' : 'inline-flex';
  if (saveBtn) saveBtn.style.display =
    step === MAX_SCREEN_STEP ? 'inline-flex' : 'none';

  // end of showScreenStep
}

function handleNextStep() {
  const screenType = getCurrentScreenType();
  const MAX_SCREEN_STEP = screenType === 'window' ? 6 : 5;
  
  if (currentScreenStep < MAX_SCREEN_STEP) {
    showScreenStep(currentScreenStep + 1);
  }
}
function handlePrevStep() {
  if (currentScreenStep > 1) {
    showScreenStep(currentScreenStep - 1);
  }
}
// Evaluate crossbar recommendation for windows only
function evaluateCrossbarRecommendation() {
  const type = getCurrentScreenType();
  if (type !== 'window') {
    crossbarRecommended = false;
    return;
  }
  
  // Check if crossbar elements exist in DOM before attempting to update
  const crossbarLabel = $('#crossbarLabel');
  const crossbarHelper = $('#crossbarHelper');
  if (!crossbarLabel || !crossbarHelper) {
    return;
  }
  
  const w = parseDimensionInches($('#screenWidthWhole')?.value, $('#screenWidthFraction')?.value);
  const h = parseDimensionInches($('#screenHeightWhole')?.value, $('#screenHeightFraction')?.value);
  const maxSide = Math.max(w, h);
  crossbarRecommended = maxSide > 47.5;

  if (crossbarRecommended) {
    crossbarLabel.textContent =
      'We recommend a crossbar for this size. Do you want one added?';
    crossbarHelper.textContent =
      'One or more sides are over 47.5". A crossbar helps prevent bowing on large screens.';
  } else {
    crossbarLabel.textContent = 'Do you want a crossbar?';
    crossbarHelper.textContent =
      'If any side is over 47.5", we recommend adding a crossbar.';
  }
}
// Update step 5 titles based on screen type
function updateStep5Titles() {
  const step5Title = $('#step5Title');
  const step5Subtitle = $('#step5Subtitle');
  const type = getCurrentScreenType();
  if (type === 'door') {
    step5Title.textContent = 'Rollers & Handle Placement';
    step5Subtitle.textContent =
      'Choose the roller type and handle placement for this patio door screen.';
  } else {
    step5Title.textContent = 'Hardware';
    step5Subtitle.textContent =
      'Let\'s place the hardware on your window screen.';
  }
}
// Event handlers
function initEventHandlers() {
  // Swatch previews
  const frameTypeEl = document.getElementById('frameType');
  const frameColorEl = document.getElementById('frameColor');
  const materialTypeEl = document.getElementById('materialType');
  const materialColorEl = document.getElementById('materialColor');

  if (frameTypeEl) frameTypeEl.addEventListener('change', syncFrameColorSwatch);
  if (frameColorEl) frameColorEl.addEventListener('change', syncFrameColorSwatch);
  if (materialTypeEl) materialTypeEl.addEventListener('change', syncMaterialColorSwatch);
  if (materialColorEl) materialColorEl.addEventListener('change', syncMaterialColorSwatch);

  $('#btnGetStarted')?.addEventListener('click', () => showView('customer'));
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      if (target) showView(target);
    });
  });
  $('#customerForm')?.addEventListener('submit', handleCustomerSubmit);
  $('#storeSelect')?.addEventListener('change', () => {
    if (!AppState.config) return;
    const val = $('#storeSelect').value;
    const store = AppState.config.stores.find((s) => s.id === val);
    if (store) {
      AppState.store = store;
      renderSummary();
    }
  });
  $('#btnAddScreen')?.addEventListener('click', () => {
    resetScreenForm();
    showView('add-screen');
  });
  $('#screenForm')?.addEventListener('submit', handleScreenSubmit);
  $('#btnCancelScreen')?.addEventListener('click', () => showView('dashboard'));
  $('#btnScreenNext')?.addEventListener('click', handleNextStep);
  $('#btnScreenPrev')?.addEventListener('click', handlePrevStep);
  document.querySelectorAll('input[name="screenType"]').forEach((radio) =>
    radio.addEventListener('change', handleScreenTypeChange)
  );
  $('#crossbarNeeded')?.addEventListener('change', handleCrossbarChange);
  $('#frameType')?.addEventListener('change', () => {
    updateFrameColorOptions();
  });
  $('#frameColor')?.addEventListener('change', updateFrameColorSwatch);
  $('#materialType')?.addEventListener('change', () => {
    updateMaterialColorOptions();
  });
  $('#btnAddHardware')?.addEventListener('click', handleAddHardware);
  $('#hardwareType')?.addEventListener('change', updateHardwareImage);
  $('#btnSubmitQuote')?.addEventListener('click', handleSubmitQuote);
  $('#btnNewQuote')?.addEventListener('click', () => {
    resetQuote();
    showView('landing');
  });
}

// Handlers
function handleCustomerSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const customer = {
    name: form.customerName.value.trim(),
    street: form.customerStreet.value.trim(),
    city: form.customerCity.value.trim(),
    state: form.customerState.value.trim().toUpperCase(),
    zip: form.customerZip.value.trim(),
    email: form.customerEmail.value.trim(),
    phone: form.customerPhone.value.trim()
  };
  if (!customer.name || !customer.email) {
    alert('Please provide at least a name and email.');
    return;
  }
  AppState.customer = customer;
  // Auto-select nearest store based on the provided ZIP
  if (AppState.config && Array.isArray(AppState.config.stores)) {
    const nearest = autoSelectStore(customer.zip);
    if (nearest) {
      AppState.store = nearest;
      const sel = document.getElementById('storeSelect');
      if (sel) sel.value = nearest.id;
      const note = document.getElementById('storeAutoNote');
      if (note) {
        note.textContent =
          `Nearest store (${nearest.city}, ${nearest.state}) selected automatically based on your ZIP. ` +
          'You can change this selection.';
      }
    }
  }
  // Fallback to first store if still not set
  if (!AppState.store && AppState.config?.stores?.length) {
    AppState.store = AppState.config.stores[0];
  }
  renderSummary();
  showView('dashboard');
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
  crossbarRecommended = false;
  updateStep5Titles();
  showScreenStep(currentScreenStep); // Refresh step display
}
function handleCrossbarChange() {
  const crossbarSelect = $('#crossbarNeeded');
  const details = $('#crossbarDetails');
  if (!crossbarSelect || !details) return;
  if (crossbarSelect.value === 'yes') {
    details.classList.remove('hidden');
  } else {
    details.classList.add('hidden');
  }
}
function handleScreenSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const type = getCurrentScreenType();
  const qty = parseInt(form.screenQty.value, 10) || 1;
  const widthWhole = form.screenWidthWhole.value;
  const widthFraction = form.screenWidthFraction.value;
  const heightWhole = form.screenHeightWhole.value;
  const heightFraction = form.screenHeightFraction.value;

  const widthDisplay = formatDimensionDisplay(widthWhole, widthFraction);
  const heightDisplay = formatDimensionDisplay(heightWhole, heightFraction);
  const widthInches = parseDimensionInches(widthWhole, widthFraction);
  const heightInches = parseDimensionInches(heightWhole, heightFraction);

  const frameType = form.frameType.value;
  const frameColor = form.frameColor.value;
  const materialType = form.materialType.value;
  const materialColor = form.materialColor.value;

  const frames = getFrameOptionsForScreenType(type);
  const frameDef = frames.find((f) => f.id === frameType);
  const frameKey =
    type === 'door' && frameDef?.pricingKey ? frameDef.pricingKey : frameType;
  const ratePerInch = getRetailRatePerInch(materialType, frameKey, type);
  let unitPrice = null;
  let lineTotal = null;
  if (ratePerInch != null) {
    const halfPerimeter = widthInches + heightInches;
    unitPrice = roundCurrency(halfPerimeter * ratePerInch);
    lineTotal = roundCurrency(unitPrice * qty);
  } else {
    logError({
      errorType: 'PRICING_LOOKUP_MISS',
      location: 'handleScreenSubmit',
      rawPayload: { materialType, frameKey, screenType: type }
    });
  }

  if (type === 'window' && crossbarRecommended && form.crossbarNeeded.value === 'no') {
    alert(
      'This opening is large enough that we recommend a crossbar. ' +
        'You chose not to include one. Be aware this may cause some bowing in the middle.'
    );
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

function handleSubmitQuote() {
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
    alert(
      'Please acknowledge that measurements and hardware selections are your responsibility before submitting.'
    );
    return;
  }
  AppState.quoteId = generateQuoteId();
  renderSuccessView();
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
  AppState.store = AppState.config?.stores?.[0] || null;
  AppState.lineItems = [];
  AppState.quoteId = null;
  const ack = $('#ackMeasurements');
  if (ack) ack.checked = false;
  renderSummary();
  renderLineItems();
}


function renderSummary() {
  const custEl = $('#summaryCustomer');
  const succCustEl = $('#successCustomer');
  const storeEl = $('#summaryStore');
  const succStoreEl = $('#successStore');

  // Customer card: force clean line breaks
  if (custEl) {
    if (!AppState.customer) {
      custEl.textContent = 'Not set';
    } else {
      const c = AppState.customer;
      const lines = [];
      if (c.name) lines.push(escapeHtml(c.name));
      if (c.street) lines.push(escapeHtml(c.street));
      // City and state on one line
      const cityState = [escapeHtml(c.city || ''), escapeHtml(c.state || '')]
        .filter(Boolean)
        .join(', ');
      if (cityState) lines.push(cityState);
      if (c.zip) lines.push(escapeHtml(c.zip));
      if (c.phone) lines.push(escapeHtml(formatPhone(c.phone)));
      if (c.email) lines.push(escapeHtml(c.email));
      custEl.innerHTML = lines.map((x) => `<div>${x}</div>`).join('');
    }
  }
  if (succCustEl) succCustEl.innerHTML = custEl?.innerHTML || '';

  // Store card: force clean line breaks
  if (storeEl) {
    if (!AppState.store) {
      storeEl.textContent = 'Not set';
    } else {
      const s = AppState.store;
      const lines = [];
      if (s.name) lines.push(escapeHtml(s.name));
      if (s.address) lines.push(escapeHtml(s.address));
      const cityState = [escapeHtml(s.city || ''), escapeHtml(s.state || '')]
        .filter(Boolean)
        .join(', ');
      if (cityState) lines.push(cityState);
      if (s.zip) lines.push(escapeHtml(s.zip));
      if (s.phone) lines.push(escapeHtml(formatPhone(s.phone)));
      storeEl.innerHTML = lines.map((x) => `<div>${x}</div>`).join('');
    }
  }
  if (succStoreEl) succStoreEl.innerHTML = storeEl?.innerHTML || '';

  const lineCount = AppState.lineItems.length;
  const subtotal = AppState.lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const tax = roundCurrency(subtotal * TAX_RATE);
  const delivery = 0;
  const total = roundCurrency(subtotal + tax + delivery);

  const lineCountEl = $('#lineItemCount');
  if (lineCountEl) setText(lineCountEl, lineCount ? `${lineCount} screen line item${lineCount === 1 ? '' : 's'}` : 'No screens added yet.');

  setText($('#subtotalValue'), formatMoney(subtotal));
  setText($('#taxValue'), formatMoney(tax));
  setText($('#deliveryValue'), formatMoney(delivery));
  setText($('#totalValue'), formatMoney(total));
}

function renderLineItems() {
  const tbody = $('#lineItemsBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  AppState.lineItems.forEach((item, index) => {
    const tr = document.createElement('tr');
    const hwSummary =
      item.screenType === 'window'
        ? summarizeHardware(item.hardwareAssignments || [])
        : summarizeDoorHardware(item.doorRollers);
    const crossbarSummary =
      item.screenType === 'window' && item.crossbarNeeded
        ? `${item.crossbarOrientation || ''} @ ${
            item.crossbarDistance || ''
          } (${item.crossbarType || ''})`
        : item.screenType === 'door'
        ? 'N/A'
        : 'None';
    const linePrice =
      item.lineTotal != null ? `$${item.lineTotal.toFixed(2)}` : '—';
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.screenType === 'door' ? 'Patio Door' : 'Window'}</td>
      <td>${item.qty}</td>
      <td>${item.width}</td>
      <td>${item.height}</td>
      <td>${formatFrameSummary(item)}</td>
      <td>${formatMaterialSummary(item)}</td>
      <td>${crossbarSummary}</td>
      <td>${hwSummary}</td>
      <td>${linePrice}</td>
      <td>
        <button type="button" class="btn btn-secondary btn-xs" data-index="${index}">
          Remove
        </button>
      </td>
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
function renderSuccessView() {
  const quoteIdEl = $('#successQuoteId');
  if (quoteIdEl) {
    quoteIdEl.textContent = AppState.quoteId || '(pending)';
  }
  renderSummary();
  renderSuccessLineItems();
  const stripeLine = $('#successStripeLine');
  if (stripeLine) {
    if (AppState.stripeEnabled) {
      stripeLine.classList.remove('hidden');
    } else {
      stripeLine.classList.add('hidden');
    }
  }
  showView('success');
}
function renderSuccessLineItems() {
  const tbody = $('#successLineItemsBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  AppState.lineItems.forEach((item, index) => {
    const tr = document.createElement('tr');
    const hwSummary =
      item.screenType === 'window'
        ? summarizeHardware(item.hardwareAssignments || [])
        : summarizeDoorHardware(item.doorRollers);
    const crossbarSummary =
      item.screenType === 'window' && item.crossbarNeeded
        ? `${item.crossbarOrientation || ''} @ ${
            item.crossbarDistance || ''
          } (${item.crossbarType || ''})`
        : item.screenType === 'door'
        ? 'N/A'
        : 'None';
    const linePrice =
      item.lineTotal != null ? `$${item.lineTotal.toFixed(2)}` : '—';
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.screenType === 'door' ? 'Patio Door' : 'Window'}</td>
      <td>${item.qty}</td>
      <td>${item.width}</td>
      <td>${item.height}</td>
      <td>${formatFrameSummary(item)}</td>
      <td>${formatMaterialSummary(item)}</td>
      <td>${crossbarSummary}</td>
      <td>${hwSummary}</td>
      <td>${linePrice}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  initEventHandlers();
  loadConfig();
  resetQuote();
  showScreenStep(1);
});
