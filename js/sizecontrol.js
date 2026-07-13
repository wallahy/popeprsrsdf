/* ===================== GhostWare — Window Size Control =====================
   Provides slider controls for dynamically resizing the application window.
   Integrates with Electron's main process for proper window management.
   ========================================================================== */
(function () {
  let currentSize = { width: 1280, height: 860 };
  let isInitialized = false;

  const $ = (id) => document.getElementById(id);

  // Default size presets
  const SIZE_PRESETS = {
    compact: { width: 900, height: 600, label: 'Compact' },
    default: { width: 1280, height: 860, label: 'Default' },
    large: { width: 1600, height: 1000, label: 'Large' },
    ultrawide: { width: 1920, height: 1080, label: 'Ultra Wide' }
  };

  // Get current window size
  const getCurrentSize = async () => {
    if (window.electronAPI) {
      try {
        const size = await window.electronAPI.getWindowSize();
        if (size) {
          currentSize = size;
          return size;
        }
      } catch (error) {
        console.error('Failed to get window size:', error);
      }
    }
    return currentSize;
  };

  // Set window size
  const setWindowSize = async (width, height) => {
    if (window.electronAPI) {
      try {
        const newSize = await window.electronAPI.setWindowSize(width, height);
        if (newSize) {
          currentSize = newSize;
          updateSizeDisplays();
          saveCurrentSize();
          return newSize;
        }
      } catch (error) {
        console.error('Failed to set window size:', error);
      }
    }
    return null;
  };

  // Save current size to localStorage
  const saveCurrentSize = () => {
    try {
      localStorage.setItem('gw_window_size', JSON.stringify(currentSize));
    } catch (error) {
      console.error('Failed to save window size:', error);
    }
  };

  // Load saved size from localStorage
  const loadSavedSize = () => {
    try {
      const saved = localStorage.getItem('gw_window_size');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.width && parsed.height) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load saved size:', error);
    }
    return SIZE_PRESETS.default;
  };

  // Update all size-related displays
  const updateSizeDisplays = () => {
    // Update width slider
    const widthSlider = $('size-width-slider');
    const widthValue = $('size-width-value');
    if (widthSlider && widthValue) {
      widthSlider.value = currentSize.width;
      widthValue.textContent = `${currentSize.width}px`;
    }

    // Update height slider
    const heightSlider = $('size-height-slider');
    const heightValue = $('size-height-value');
    if (heightSlider && heightValue) {
      heightSlider.value = currentSize.height;
      heightValue.textContent = `${currentSize.height}px`;
    }

    // Update current size display
    const currentSizeDisplay = $('current-size-display');
    if (currentSizeDisplay) {
      currentSizeDisplay.textContent = `${currentSize.width} × ${currentSize.height}`;
    }

    // Update preset buttons
    document.querySelectorAll('.size-preset').forEach(btn => {
      const preset = SIZE_PRESETS[btn.dataset.preset];
      if (preset) {
        const isActive = preset.width === currentSize.width && preset.height === currentSize.height;
        btn.classList.toggle('active', isActive);
      }
    });
  };

  // Apply a size preset
  const applyPreset = async (presetName) => {
    const preset = SIZE_PRESETS[presetName];
    if (preset) {
      await setWindowSize(preset.width, preset.height);
      if (window.GWSound) window.GWSound.click();
    }
  };

  // Create size control HTML
  const createSizeControl = () => {
    return `
      <div class="size-control-section">
        <div class="panel-head">
          <h3>Window Size</h3>
          <span class="current-size-badge" id="current-size-display">${currentSize.width} × ${currentSize.height}</span>
        </div>
        
        <div class="size-presets">
          ${Object.entries(SIZE_PRESETS).map(([key, preset]) => 
            `<button class="btn ghost size-preset" data-preset="${key}">${preset.label}<br><span class="preset-size">${preset.width}×${preset.height}</span></button>`
          ).join('')}
        </div>

        <div class="size-controls">
          <div class="size-control">
            <span class="size-label">Width</span>
            <input type="range" id="size-width-slider" class="size-slider" 
                   min="900" max="2560" step="20" value="${currentSize.width}">
            <span class="size-value" id="size-width-value">${currentSize.width}px</span>
          </div>

          <div class="size-control">
            <span class="size-label">Height</span>
            <input type="range" id="size-height-slider" class="size-slider" 
                   min="600" max="1440" step="20" value="${currentSize.height}">
            <span class="size-value" id="size-height-value">${currentSize.height}px</span>
          </div>
        </div>

        <div class="size-actions">
          <button class="btn ghost" id="reset-size">Reset to Default</button>
          <button class="btn ghost" id="apply-size">Apply Current Settings</button>
        </div>

        <div class="size-info">
          <div class="info-note">
            Window size is saved automatically and restored when you restart the app. 
            Minimum size is 900×600 pixels for proper interface display.
          </div>
        </div>
      </div>
    `;
  };

  // Initialize size controls
  const init = async () => {
    if (isInitialized) return;
    isInitialized = true;

    // Load saved size or apply it on startup
    const savedSize = loadSavedSize();
    if (savedSize.width !== currentSize.width || savedSize.height !== currentSize.height) {
      await setWindowSize(savedSize.width, savedSize.height);
    }

    // Get current actual size from window
    await getCurrentSize();
    updateSizeDisplays();

    console.log('GhostWare Size Control initialized');
  };

  // Wire up size control events
  const wireEvents = () => {
    // Preset buttons
    document.querySelectorAll('.size-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        applyPreset(preset);
      });
    });

    // Width slider
    const widthSlider = $('size-width-slider');
    if (widthSlider) {
      let widthTimeout;
      widthSlider.addEventListener('input', (e) => {
        const widthValue = $('size-width-value');
        if (widthValue) {
          widthValue.textContent = `${e.target.value}px`;
        }
        
        // Debounce the actual resize
        clearTimeout(widthTimeout);
        widthTimeout = setTimeout(() => {
          setWindowSize(parseInt(e.target.value), currentSize.height);
        }, 100);
      });
    }

    // Height slider
    const heightSlider = $('size-height-slider');
    if (heightSlider) {
      let heightTimeout;
      heightSlider.addEventListener('input', (e) => {
        const heightValue = $('size-height-value');
        if (heightValue) {
          heightValue.textContent = `${e.target.value}px`;
        }
        
        // Debounce the actual resize
        clearTimeout(heightTimeout);
        heightTimeout = setTimeout(() => {
          setWindowSize(currentSize.width, parseInt(e.target.value));
        }, 100);
      });
    }

    // Reset button
    const resetBtn = $('reset-size');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        applyPreset('default');
      });
    }

    // Apply button
    const applyBtn = $('apply-size');
    if (applyBtn) {
      applyBtn.addEventListener('click', async () => {
        const width = parseInt($('size-width-slider').value);
        const height = parseInt($('size-height-slider').value);
        await setWindowSize(width, height);
        if (window.GWSound) window.GWSound.ok();
      });
    }
  };

  // Insert size control into settings page
  const injectIntoSettings = () => {
    const settingsPage = document.querySelector('.page[data-view="settings"]');
    if (!settingsPage) return;

    // Find the integrations panel or create after preferences
    let insertPoint = settingsPage.querySelector('.panel:last-of-type');
    if (!insertPoint) {
      insertPoint = settingsPage.querySelector('.panel');
    }

    if (insertPoint) {
      const sizePanel = document.createElement('div');
      sizePanel.className = 'panel';
      sizePanel.style.marginTop = '18px';
      sizePanel.innerHTML = createSizeControl();
      
      insertPoint.insertAdjacentElement('afterend', sizePanel);
      
      // Wire up events after injection
      wireEvents();
      updateSizeDisplays();
    }
  };

  // Handle window resize events from main process
  const handleWindowResize = (newSize) => {
    if (newSize && newSize.width && newSize.height) {
      currentSize = newSize;
      updateSizeDisplays();
      saveCurrentSize();
    }
  };

  // Export API
  window.GWSizeControl = {
    init,
    getCurrentSize,
    setWindowSize,
    applyPreset,
    updateSizeDisplays,
    injectIntoSettings,
    handleWindowResize,
    SIZE_PRESETS,
    get currentSize() { return { ...currentSize }; }
  };

  // Listen for window resize events if available
  if (window.electronAPI && window.electronAPI.onWindowResize) {
    window.electronAPI.onWindowResize((event, newSize) => {
      handleWindowResize(newSize);
    });
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();