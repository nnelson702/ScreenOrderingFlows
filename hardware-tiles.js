// hardware-tiles.js
// Adds image-based hardware selection tiles while keeping #hardwareType as the canonical value source.
(function () {
  const HARDWARE_TILE_OPTIONS = [
    { id: 'slide_leaf_spring', label: 'Slide Leaf Spring', initials: 'SLS', imageUrl: 'assets/hardware/slide-leaf-spring.svg' },
    { id: 'standard_leaf_spring', label: 'Standard Leaf Spring', initials: 'LS', imageUrl: 'assets/hardware/standard-leaf-spring.svg' },
    { id: 'pull_tab', label: 'Pull Tab', initials: 'PT', imageUrl: 'assets/hardware/pulltab.svg' },
    { id: 'bale_clip', label: 'Bale Clip', initials: 'BC', imageUrl: 'assets/hardware/bale-clip.svg' },
    { id: 'tension_spring', label: 'Tension Spring', initials: 'TS', imageUrl: 'assets/hardware/tension-spring.svg?v=2' },
    { id: 'plunger', label: 'Plunger', initials: 'PL', imageUrl: 'assets/hardware/plunger.svg' }
  ];

  const CROSSBAR_WARNING_TEXT = 'This opening is large enough that we recommend a crossbar. You chose not to include one. Be aware this may cause some bowing in the middle.';

  let installed = false;
  let lastCrossbarWarningKey = '';
  let nativeAlert = null;

  function getState() {
    try { return AppState; } catch (err) { return null; }
  }

  function normalizeOptions() {
    const state = getState();
    if (!state || !state.config) return;
    state.config.hardwareOptions = HARDWARE_TILE_OPTIONS.map((option) => ({ ...option }));
  }

  function hideEnvironmentPill() {
    const pill = document.getElementById('envIndicator');
    if (pill) pill.remove();
  }

  function ensureStyles() {
    if (document.getElementById('hardwareTileStyles')) return;
    const style = document.createElement('style');
    style.id = 'hardwareTileStyles';
    style.textContent = `
      #envIndicator,.environment-pill{display:none!important}
      .hardware-type-select-fallback{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important}
      #windowOnlyFields.hardware-step-panel{padding:1rem 1.15rem;border-radius:.65rem;overflow:hidden}
      #windowOnlyFields.hardware-step-panel>.helper-text{max-width:640px;margin:.15rem 0 .35rem}
      #windowOnlyFields .hardware-layout.hardware-step-grid{display:grid;grid-template-columns:minmax(0,330px) minmax(260px,1fr);gap:1.25rem;align-items:start;margin-top:1rem;min-width:0;width:100%;max-width:100%}
      #windowOnlyFields .hardware-controls.hardware-step-controls{display:grid;grid-template-columns:minmax(0,168px) minmax(0,150px);gap:.85rem .75rem;align-items:end;min-width:0;max-width:330px}
      #windowOnlyFields .hardware-controls.hardware-step-controls>.form-field:first-child{grid-column:1/-1}
      #windowOnlyFields .hardware-controls.hardware-step-controls>.form-field:nth-of-type(2){max-width:168px}
      #windowOnlyFields .hardware-controls.hardware-step-controls>.form-field:nth-of-type(3){max-width:150px}
      #windowOnlyFields .qty-stepper{grid-template-columns:34px minmax(56px,68px) 34px!important;gap:.32rem!important;max-width:150px!important}
      #windowOnlyFields .qty-stepper input{min-width:0!important}
      .hardware-step-summary{grid-column:1/-1;margin-top:.1rem;min-height:1.2rem}
      .hardware-type-tile-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.7rem;margin-top:.45rem;margin-bottom:.2rem;max-width:330px;width:100%}
      .hardware-type-tile{border:2px solid #d0d4da;border-radius:.7rem;background:#fff;padding:.5rem .4rem .55rem;min-height:126px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:.35rem;cursor:pointer;color:#222;text-align:center;font:inherit;width:100%}
      .hardware-type-tile.is-selected{border-color:#b01c2e;box-shadow:0 0 0 2px rgba(176,28,46,.18);background:#fff7f8}
      .hardware-type-tile:focus-visible{outline:2px solid #b01c2e;outline-offset:2px}
      .hardware-type-image-wrap{width:70px;height:70px;border-radius:999px;border:1px solid #cfd4dc;background:#f7f4f0;display:flex;align-items:center;justify-content:center;overflow:hidden;font-weight:800;color:#555}
      .hardware-type-image-wrap img{width:100%;height:100%;object-fit:cover;display:block}
      .hardware-type-label{font-size:.78rem;font-weight:700;line-height:1.15}
      .hardware-type-initials{font-size:.68rem;color:#666;text-transform:uppercase;letter-spacing:.05em}
      #windowOnlyFields .hardware-diagram-wrapper.hardware-step-diagram{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;min-width:0;padding-top:1.55rem}
      .hardware-diagram-instruction{align-self:stretch;max-width:360px;margin:0 auto .95rem!important}
      .hardware-action-field{width:100%;max-width:360px;margin:.85rem auto 0}
      .hardware-action-field .btn{width:100%}
      #windowOnlyFields .hardware-diagram-wrapper.hardware-step-diagram .hardware-diagram{width:170px;height:170px;margin:0 auto .75rem}
      @media(max-width:860px){#windowOnlyFields .hardware-layout.hardware-step-grid{grid-template-columns:1fr;gap:1rem}#windowOnlyFields .hardware-diagram-wrapper.hardware-step-diagram{padding-top:.25rem}.hardware-action-field{max-width:none}}
      @media(max-width:640px){#windowOnlyFields .hardware-controls.hardware-step-controls{grid-template-columns:1fr;max-width:none}.hardware-type-tile-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:none}.hardware-type-tile{min-height:124px}.hardware-type-image-wrap{width:68px;height:68px}}
      @media(max-width:380px){.hardware-type-tile-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function arrangeHardwareStep() {
    const panel = document.getElementById('windowOnlyFields');
    const layout = panel?.querySelector('.hardware-layout');
    const controls = panel?.querySelector('.hardware-controls');
    const diagram = panel?.querySelector('.hardware-diagram-wrapper');
    if (!panel || !layout || !controls || !diagram) return;

    panel.classList.add('hardware-step-panel');
    layout.classList.add('hardware-step-grid');
    controls.classList.add('hardware-step-controls');
    diagram.classList.add('hardware-step-diagram');

    const instruction = Array.from(controls.querySelectorAll('p.helper-text'))
      .find((node) => node.textContent.includes('Choose a hardware type'));
    if (instruction) {
      instruction.classList.add('hardware-diagram-instruction');
      if (!diagram.contains(instruction)) diagram.insertBefore(instruction, diagram.firstChild);
    }

    const actionButton = document.getElementById('btnAddHardware');
    const actionField = actionButton?.closest('.form-field');
    if (actionField) {
      actionField.classList.add('hardware-action-field');
      if (!diagram.contains(actionField)) diagram.appendChild(actionField);
    }

    document.getElementById('hardwareListSummary')?.classList.add('hardware-step-summary');
  }

  function syncSelectOptions(select) {
    const previousValue = select.value;
    select.innerHTML = '';
    HARDWARE_TILE_OPTIONS.forEach((option, index) => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = option.label;
      if ((previousValue && previousValue === option.id) || (!previousValue && index === 0)) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function renderTiles() {
    const select = document.getElementById('hardwareType');
    if (!select) return false;

    normalizeOptions();
    hideEnvironmentPill();
    ensureStyles();
    arrangeHardwareStep();
    syncSelectOptions(select);
    select.classList.add('hardware-type-select-fallback');

    let container = document.getElementById('hardwareTypeTiles');
    if (!container) {
      container = document.createElement('div');
      container.id = 'hardwareTypeTiles';
      container.className = 'hardware-type-tile-grid';
      select.insertAdjacentElement('afterend', container);
    }

    container.innerHTML = '';
    HARDWARE_TILE_OPTIONS.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hardware-type-tile' + (option.id === select.value ? ' is-selected' : '');
      button.setAttribute('aria-pressed', option.id === select.value ? 'true' : 'false');

      const imageWrap = document.createElement('span');
      imageWrap.className = 'hardware-type-image-wrap';
      const image = document.createElement('img');
      image.src = option.imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      imageWrap.appendChild(image);

      const label = document.createElement('span');
      label.className = 'hardware-type-label';
      label.textContent = option.label;

      const initials = document.createElement('span');
      initials.className = 'hardware-type-initials';
      initials.textContent = option.initials;

      button.appendChild(imageWrap);
      button.appendChild(label);
      button.appendChild(initials);
      button.addEventListener('click', () => {
        select.value = option.id;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        renderTiles();
      });
      container.appendChild(button);
    });

    return true;
  }

  function getCrossbarWarningKey() {
    const activeStep = document.querySelector('.screen-step.active-step');
    const crossbarLabel = document.getElementById('crossbarLabel');
    const crossbarSelect = document.getElementById('crossbarNeeded');
    if (!activeStep || activeStep.dataset.step !== '6') return '';
    if (!crossbarLabel || !crossbarLabel.textContent.includes('recommended')) return '';
    if (!crossbarSelect || crossbarSelect.value !== 'no') return '';
    const width = `${document.getElementById('screenWidthWhole')?.value || ''}-${document.getElementById('screenWidthFraction')?.value || ''}`;
    const height = `${document.getElementById('screenHeightWhole')?.value || ''}-${document.getElementById('screenHeightFraction')?.value || ''}`;
    return `${width}|${height}`;
  }

  function maybeShowCrossbarWarningOnStepEntry() {
    const key = getCrossbarWarningKey();
    if (!key || key === lastCrossbarWarningKey) return;
    lastCrossbarWarningKey = key;
    nativeAlert(CROSSBAR_WARNING_TEXT);
  }

  function installCrossbarWarningMove() {
    if (nativeAlert) return;
    nativeAlert = window.alert.bind(window);
    window.alert = function patchedAlert(message) {
      if (String(message) === CROSSBAR_WARNING_TEXT && getCrossbarWarningKey() === lastCrossbarWarningKey) return;
      nativeAlert(message);
    };

    const stepObserver = new MutationObserver(() => {
      window.setTimeout(maybeShowCrossbarWarningOnStepEntry, 0);
    });
    const form = document.getElementById('screenForm');
    if (form) stepObserver.observe(form, { subtree: true, attributes: true, attributeFilter: ['class'] });

    document.addEventListener('change', (event) => {
      if (event.target && event.target.id === 'crossbarNeeded') {
        window.setTimeout(maybeShowCrossbarWarningOnStepEntry, 0);
      }
    });
  }

  function install() {
    if (installed) return;
    installed = true;
    hideEnvironmentPill();

    const interval = window.setInterval(() => {
      const rendered = renderTiles();
      hideEnvironmentPill();
      installCrossbarWarningMove();
      maybeShowCrossbarWarningOnStepEntry();
      if (rendered) window.clearInterval(interval);
    }, 120);

    window.setTimeout(() => window.clearInterval(interval), 10000);

    document.addEventListener('change', (event) => {
      if (event.target && event.target.id === 'hardwareType') renderTiles();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();

// Load the draft line-item editor outside the critical page-start path. It is
// triggered immediately when a customer begins adding a screen, with an idle
// fallback so editing remains available even if the user returns to the tab.
(function () {
  let editorRequested = false;

  function loadPreSubmitLineEditor() {
    if (editorRequested || document.querySelector('script[data-pre-submit-line-editor="1"]')) return;
    editorRequested = true;
    const script = document.createElement('script');
    script.src = 'line-item-editor.js?v=1';
    script.defer = true;
    script.dataset.preSubmitLineEditor = '1';
    (document.body || document.head).appendChild(script);
  }

  function scheduleEditor() {
    document.getElementById('btnAddScreen')?.addEventListener('click', loadPreSubmitLineEditor, { once: true, capture: true });
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadPreSubmitLineEditor, { timeout: 8000 });
    } else {
      window.setTimeout(loadPreSubmitLineEditor, 4000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleEditor);
  } else {
    scheduleEditor();
  }
})();

// Pass 2 additive UX hardening. This executes before DOMContentLoaded so the
// existing app event handlers bind to the wrapped functions below.
(function () {
  let quoteSubmissionPending = false;

  function installStyles() {
    if (document.getElementById('pass2UxStyles')) return;
    const style = document.createElement('style');
    style.id = 'pass2UxStyles';
    style.textContent = `
      #screenStepIndicator{
        --step-progress:16.67%;
        position:relative;
        overflow:hidden;
        border:1px solid #d8dde6;
        border-radius:999px;
        padding:.48rem .8rem;
        font-weight:700;
        color:#40464f;
        background:linear-gradient(90deg,rgba(176,28,46,.14) 0 var(--step-progress),#f1f3f6 var(--step-progress) 100%);
      }
      .btn[disabled],button[disabled]{opacity:.58;cursor:not-allowed;transform:none!important}
      #btnSubmitQuote[aria-busy="true"]{min-width:132px}
      @media(max-width:640px){
        input,select,textarea{min-height:44px;font-size:16px}
        .btn{min-height:44px}
        #screenStepIndicator{padding:.58rem .8rem}
      }
    `;
    document.head.appendChild(style);
  }

  function setAttrs(id, attrs) {
    const el = document.getElementById(id);
    if (!el) return;
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  }

  function installCustomerFormHints() {
    setAttrs('customerName', { autocomplete: 'name', enterkeyhint: 'next' });
    setAttrs('customerStreet', { autocomplete: 'street-address', enterkeyhint: 'next' });
    setAttrs('customerCity', { autocomplete: 'address-level2', enterkeyhint: 'next' });
    setAttrs('customerState', { autocomplete: 'address-level1', autocapitalize: 'characters', enterkeyhint: 'next' });
    setAttrs('customerZip', { autocomplete: 'postal-code', inputmode: 'numeric', enterkeyhint: 'next' });
    setAttrs('customerEmail', { autocomplete: 'email', inputmode: 'email', autocapitalize: 'none', spellcheck: 'false', enterkeyhint: 'next' });
    setAttrs('customerPhone', { autocomplete: 'tel', inputmode: 'tel', enterkeyhint: 'done' });
  }

  function updateStepProgress() {
    const indicator = document.getElementById('screenStepIndicator');
    if (!indicator) return;
    const match = indicator.textContent.match(/Step\s+(\d+)\s+of\s+(\d+)/i);
    if (!match) return;
    const current = Math.max(1, Number(match[1]) || 1);
    const max = Math.max(current, Number(match[2]) || current);
    const progress = Math.min(100, Math.max(0, (current / max) * 100));
    indicator.style.setProperty('--step-progress', `${progress}%`);
    indicator.setAttribute('role', 'progressbar');
    indicator.setAttribute('aria-label', 'Screen configuration progress');
    indicator.setAttribute('aria-valuemin', '1');
    indicator.setAttribute('aria-valuenow', String(current));
    indicator.setAttribute('aria-valuemax', String(max));
    indicator.setAttribute('aria-live', 'polite');
  }

  if (typeof showScreenStep === 'function') {
    const originalShowScreenStep = showScreenStep;
    showScreenStep = function pass2ShowScreenStep(step) {
      const result = originalShowScreenStep.apply(this, arguments);
      updateStepProgress();
      return result;
    };
  }

  if (typeof handleSubmitQuote === 'function') {
    const originalHandleSubmitQuote = handleSubmitQuote;
    handleSubmitQuote = async function pass2HandleSubmitQuote() {
      if (quoteSubmissionPending) return;
      const button = document.getElementById('btnSubmitQuote');
      const originalLabel = button ? button.textContent : 'Submit Quote';
      quoteSubmissionPending = true;
      if (button) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.textContent = 'Submitting...';
      }
      try {
        return await originalHandleSubmitQuote.apply(this, arguments);
      } finally {
        quoteSubmissionPending = false;
        if (button) {
          button.disabled = false;
          button.removeAttribute('aria-busy');
          button.textContent = originalLabel;
        }
      }
    };
  }

  installStyles();
  document.addEventListener('DOMContentLoaded', () => {
    installCustomerFormHints();
    updateStepProgress();
  });
})();
