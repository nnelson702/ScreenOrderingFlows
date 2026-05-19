// mobile-ui-polish.js
// Small mobile usability improvements loaded after app.js and post-app-fixes.js.

(function mobileUiPolish() {
  function byId(id) {
    return document.getElementById(id);
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
    [
      'screenQty',
      'screenWidthWhole',
      'screenHeightWhole',
      'handleHeightWhole',
      'hardwareQty'
    ].forEach((id) => setNumericKeyboard(byId(id), 'numeric'));
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

  function installMobileUiStyles() {
    if (byId('mobileUiPolishStyles')) return;
    const style = document.createElement('style');
    style.id = 'mobileUiPolishStyles';
    style.textContent = `
      .dimension-input {
        grid-template-columns: minmax(0, 0.72fr) minmax(72px, 0.28fr);
        max-width: 560px;
      }
      .dimension-input input {
        text-align: center;
      }
      .dimension-input select {
        text-align: center;
      }
      .qty-stepper {
        display: grid;
        grid-template-columns: 46px minmax(64px, 92px) 46px;
        align-items: center;
        gap: 0.45rem;
        max-width: 200px;
      }
      .qty-stepper .hardware-qty-input {
        text-align: center;
        width: 100%;
        min-width: 0;
      }
      .qty-stepper-btn {
        height: 42px;
        width: 46px;
        border: 0;
        border-radius: 999px;
        background: #e3e6ea;
        color: #222;
        font-size: 1.35rem;
        line-height: 1;
        font-weight: 700;
        cursor: pointer;
      }
      .qty-stepper-btn:active {
        transform: translateY(1px);
      }
      @media (max-width: 640px) {
        .dimension-input {
          grid-template-columns: minmax(0, 0.68fr) minmax(70px, 0.32fr);
          max-width: 100%;
        }
        .qty-stepper {
          grid-template-columns: 48px minmax(56px, 86px) 48px;
          max-width: 202px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    installMobileUiStyles();
    installNumericInputHints();
    installHardwareQtyControls();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
