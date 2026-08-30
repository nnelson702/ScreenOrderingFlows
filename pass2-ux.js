// pass2-ux.js
// Additive customer-facing UX hardening. No pricing, payload, API, or workflow logic changes.
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
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === null) return;
      el.setAttribute(key, value);
    });
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

  // Wrap the existing step renderer without changing its navigation behavior.
  if (typeof showScreenStep === 'function') {
    const originalShowScreenStep = showScreenStep;
    showScreenStep = function pass2ShowScreenStep(step) {
      const result = originalShowScreenStep.apply(this, arguments);
      updateStepProgress();
      return result;
    };
  }

  // Prevent accidental double-click/double-tap quote creation while preserving
  // the existing validation, API request, success handling, and error handling.
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
