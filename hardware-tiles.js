// hardware-tiles.js
// Adds image-based hardware selection tiles while keeping #hardwareType as the canonical value source.
(function () {
  const HARDWARE_TILE_OPTIONS = [
    { id: 'slide_leaf_spring', label: 'Slide Leaf Spring', initials: 'SLS', imageUrl: 'assets/hardware/slide-leaf-spring.svg' },
    { id: 'standard_leaf_spring', label: 'Standard Leaf Spring', initials: 'LS', imageUrl: 'assets/hardware/standard-leaf-spring.svg' },
    { id: 'pull_tab', label: 'Pull Tab', initials: 'PT', imageUrl: 'assets/hardware/pulltab.svg' },
    { id: 'bale_clip', label: 'Bale Clip', initials: 'BC', imageUrl: 'assets/hardware/bale-clip.svg' },
    { id: 'tension_spring', label: 'Tension Spring', initials: 'TS', imageUrl: 'assets/hardware/tension-spring.svg' },
    { id: 'plunger', label: 'Plunger', initials: 'PL', imageUrl: 'assets/hardware/plunger.svg' }
  ];

  let installed = false;

  function getState() {
    try { return AppState; } catch (err) { return null; }
  }

  function normalizeOptions() {
    const state = getState();
    if (!state || !state.config) return;
    state.config.hardwareOptions = HARDWARE_TILE_OPTIONS.map((option) => ({ ...option }));
  }

  function ensureStyles() {
    if (document.getElementById('hardwareTileStyles')) return;
    const style = document.createElement('style');
    style.id = 'hardwareTileStyles';
    style.textContent = `
      .hardware-type-select-fallback{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important}
      .hardware-type-tile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:.75rem;margin-top:.45rem;margin-bottom:.85rem;max-width:100%}
      .hardware-type-tile{border:2px solid #d0d4da;border-radius:.7rem;background:#fff;padding:.55rem .45rem .6rem;min-height:146px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:.35rem;cursor:pointer;color:#222;text-align:center;font:inherit;width:100%}
      .hardware-type-tile.is-selected{border-color:#b01c2e;box-shadow:0 0 0 2px rgba(176,28,46,.18);background:#fff7f8}
      .hardware-type-tile:focus-visible{outline:2px solid #b01c2e;outline-offset:2px}
      .hardware-type-image-wrap{width:78px;height:78px;border-radius:999px;border:1px solid #cfd4dc;background:#f7f4f0;display:flex;align-items:center;justify-content:center;overflow:hidden;font-weight:800;color:#555}
      .hardware-type-image-wrap img{width:100%;height:100%;object-fit:cover;display:block}
      .hardware-type-label{font-size:.78rem;font-weight:700;line-height:1.15}
      .hardware-type-initials{font-size:.68rem;color:#666;text-transform:uppercase;letter-spacing:.05em}
      @media(max-width:640px){.hardware-type-tile-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hardware-type-tile{min-height:138px}.hardware-type-image-wrap{width:72px;height:72px}}
      @media(max-width:380px){.hardware-type-tile-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
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
    ensureStyles();
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

  function install() {
    if (installed) return;
    installed = true;

    const interval = window.setInterval(() => {
      if (renderTiles()) window.clearInterval(interval);
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
