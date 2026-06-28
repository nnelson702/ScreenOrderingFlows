// scroll-reset.js
// Keeps customer-facing view and step transitions anchored at the top of the page.

(function () {
  function scrollToTrueTop() {
    requestAnimationFrame(function () {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      const app = document.getElementById('app');
      if (app && typeof app.scrollTo === 'function') {
        app.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    });
  }

  function wrapNavigationFunction(name) {
    const original = window[name];
    if (typeof original !== 'function' || original.__scrollResetWrapped) return;

    window[name] = function () {
      const result = original.apply(this, arguments);
      scrollToTrueTop();
      return result;
    };
    window[name].__scrollResetWrapped = true;
  }

  function installScrollReset() {
    wrapNavigationFunction('showView');
    wrapNavigationFunction('showScreenStep');

    document.addEventListener('click', function (event) {
      const target = event.target && event.target.closest && event.target.closest('[data-nav], #btnGetStarted, #btnAddScreen, #btnCancelScreen, #btnScreenNext, #btnScreenPrev, #btnNewQuote');
      if (target) setTimeout(scrollToTrueTop, 0);
    }, true);

    document.addEventListener('submit', function (event) {
      const form = event.target;
      if (form && (form.id === 'customerForm' || form.id === 'screenForm')) {
        setTimeout(scrollToTrueTop, 0);
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installScrollReset);
  } else {
    installScrollReset();
  }
})();
