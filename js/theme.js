/* ===================== GhostWare — Theme System ===================== */
(function () {
  const $ = (id) => document.getElementById(id);

  // Apply theme from localStorage
  function applyTheme() {
    const mode = localStorage.getItem('gw_theme_mode') || 'dark';
    const scheme = localStorage.getItem('gw_color_scheme') || 'purple';
    const accent = localStorage.getItem('gw_accent_color');

    document.body.classList.toggle('light-theme', mode === 'light');
    
    // Remove all scheme classes
    document.body.classList.remove('scheme-blue', 'scheme-green', 'scheme-red', 'scheme-cyberpunk', 'scheme-monochrome');
    
    // Apply current scheme
    if (scheme !== 'purple') {
      document.body.classList.add(`scheme-${scheme}`);
    }

    // Apply custom accent
    if (accent) {
      document.body.setAttribute('data-accent-color', accent);
      document.documentElement.style.setProperty('--custom-accent', accent);
    } else {
      document.body.removeAttribute('data-accent-color');
      document.documentElement.style.removeProperty('--custom-accent');
    }
  }

  // Initialize theme on load
  applyTheme();

  // Wire up theme controls when DOM is ready
  function wireThemeControls() {
    const themeMode = $('set-theme-mode');
    const colorScheme = $('set-color-scheme');

    // Load saved values into dropdowns
    if (themeMode) {
      themeMode.value = localStorage.getItem('gw_theme_mode') || 'dark';
      themeMode.addEventListener('change', () => {
        localStorage.setItem('gw_theme_mode', themeMode.value);
        applyTheme();
        if (window.GWSound) window.GWSound.click();
        if (window.toast) window.toast('Theme mode changed');
      });
    }

    if (colorScheme) {
      colorScheme.value = localStorage.getItem('gw_color_scheme') || 'purple';
      colorScheme.addEventListener('change', () => {
        localStorage.setItem('gw_color_scheme', colorScheme.value);
        applyTheme();
        if (window.GWSound) window.GWSound.click();
        if (window.toast) window.toast('Color scheme changed');
      });
    }

    // Color swatches
    const activeAccent = localStorage.getItem('gw_accent_color');
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.classList.toggle('active', swatch.dataset.color === activeAccent);
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        localStorage.setItem('gw_accent_color', color);
        document.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('active'));
        swatch.classList.add('active');
        applyTheme();
        if (window.GWSound) window.GWSound.click();
        if (window.toast) window.toast('Accent color changed');
      });
    });

    // Reset accent button
    const resetAccentBtn = $('reset-accent-btn');
    if (resetAccentBtn) {
      resetAccentBtn.addEventListener('click', () => {
        localStorage.removeItem('gw_accent_color');
        document.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('active'));
        applyTheme();
        if (window.GWSound) window.GWSound.click();
        if (window.toast) window.toast('Accent color reset to default');
      });
    }
  }

  // Expose functions globally
  window.GWTheme = {
    apply: applyTheme,
    wire: wireThemeControls,
    reset: function() {
      localStorage.removeItem('gw_theme_mode');
      localStorage.removeItem('gw_color_scheme');
      localStorage.removeItem('gw_accent_color');
      applyTheme();
    }
  };

  // Auto-wire when page contains settings
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireThemeControls);
  } else {
    wireThemeControls();
  }
})();


// Wire up Discord button
document.addEventListener('DOMContentLoaded', () => {
  const discordBtn = document.getElementById('join-discord-btn');
  if (discordBtn) {
    discordBtn.addEventListener('click', () => {
      // Open Discord invite in external browser
      if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal('https://discord.gg/ghostware');
      } else {
        window.open('https://discord.gg/ghostware', '_blank');
      }
      if (window.GWSound) window.GWSound.click();
    });
  }
});
