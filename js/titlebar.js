/* ===================== GhostWare Desktop — title bar injector =====================
   Builds the custom title bar and wires the macOS traffic-light controls.
   Runs only inside Electron (where window.gwWindow exists via preload.js).
   ================================================================================= */
(function () {
  if (!window.gwWindow) return;                 // plain browser → keep native chrome
  if (document.querySelector('.gw-titlebar')) return;

  document.body.classList.add('gw-has-titlebar', 'gw-focused');
  document.documentElement.classList.add('gw-rounded');   // rounded window corners

  const bar = document.createElement('div');
  bar.className = 'gw-titlebar';
  bar.innerHTML =
    '<div class="gw-traffic">' +
      '<button class="gw-tl gw-close" title="Close" aria-label="Close">' +
        '<svg viewBox="0 0 8 8"><path d="M1 1 L7 7 M7 1 L1 7"/></svg></button>' +
      '<button class="gw-tl gw-min" title="Minimize" aria-label="Minimize">' +
        '<svg viewBox="0 0 8 8"><path d="M1 4 L7 4"/></svg></button>' +
      '<button class="gw-tl gw-max" title="Maximize" aria-label="Maximize">' +
        '<svg viewBox="0 0 8 8"><path d="M1.5 1.5 L6.5 1.5 L6.5 6.5 L1.5 6.5 Z"/></svg></button>' +
    '</div>' +
    '<div class="gw-title">GHOST<b>WARE</b> <span class="accent">// console</span></div>';

  document.body.insertBefore(bar, document.body.firstChild);

  bar.querySelector('.gw-close').addEventListener('click', () => window.gwWindow.close());
  bar.querySelector('.gw-min').addEventListener('click', () => window.gwWindow.minimize());
  bar.querySelector('.gw-max').addEventListener('click', () => window.gwWindow.maximize());

  // focus/blur dimming, mac-style
  window.addEventListener('focus', () => document.body.classList.add('gw-focused'));
  window.addEventListener('blur',  () => document.body.classList.remove('gw-focused'));

  // drop the rounding when maximized (square fills the screen), restore when restored
  if (window.gwWindow.onMaximized) {
    window.gwWindow.onMaximized((isMax) => {
      document.documentElement.classList.toggle('gw-maximized', !!isMax);
    });
  }
})();
