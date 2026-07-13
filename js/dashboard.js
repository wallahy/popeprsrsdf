/* ===================== GhostWare — Dashboard controller ===================== */
(function () {
  const { session, db, isOwner, isDev } = window.GWAuth;
  const S = window.GWSound;
  const { gen, real } = window.GWModules;

  // ---- auth gate ----
  const sess = session.get();
  if (!sess) { location.href = './index.html'; return; }
  let user = db.find(sess.email) || { username: 'operator', email: sess.email, created: Date.now() };
  if (isOwner(user.email)) user.role = 'OWNER';
  if (isDev && isDev(user.email)) user.role = 'DEV';

  // ---- per-account persistent stats (credits removed — unlimited plan) ----
  const statsKey = 'gw_stats_' + (user.email || 'guest');
  const stats = Object.assign({ today: 0, total: 0 }, JSON.parse(localStorage.getItem(statsKey) || '{}'));
  function saveStats() { localStorage.setItem(statsKey, JSON.stringify(stats)); }

  const $ = (id) => document.getElementById(id);
  function toast(t) {
    const el = $('toast'); el.textContent = t; el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2400);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // ---- header fill ----
  function paintStats() {
    $('uname').textContent = user.username || 'operator';
    $('c-lookups').textContent = stats.total;
    $('creditNum').textContent = stats.total;
    $('c-today').textContent = stats.today;
    if ($('pf-total')) $('pf-total').textContent = stats.total;
    if ($('pf-today')) $('pf-today').textContent = stats.today;
    paintSidebar();
  }
  // ---- sidebar profile mini (above Sign Out) ----
  function paintSidebar() {
    const name = $('sideName'), pfp = $('sidePfp'), badge = $('sideOwnerBadge'), devBadge = $('sideDevBadge');
    if (name) name.textContent = user.username || 'operator';
    if (badge) badge.style.display = user.role === 'OWNER' ? 'inline-flex' : 'none';
    if (devBadge) devBadge.style.display = user.role === 'DEV' ? 'inline-flex' : 'none';
    if (pfp) {
      if (user.avatar) { pfp.style.backgroundImage = `url("${user.avatar}")`; pfp.classList.add('has-img'); pfp.textContent = ''; }
      else { pfp.style.backgroundImage = ''; pfp.classList.remove('has-img'); pfp.textContent = (user.username || '?').charAt(0).toUpperCase(); }
    }
  }

  // ---- routing ----
  const pages = document.querySelectorAll('.page');
  const navs = document.querySelectorAll('.nav-item[data-page]');
  function goto(name) {
    let found = false;
    pages.forEach(p => { const on = p.dataset.view === name; p.classList.toggle('active', on); if (on) found = true; });
    if (!found) return;
    navs.forEach(n => n.classList.toggle('active', n.dataset.page === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'profile') fillProfile();
    if (name === 'chat') startChat();
    if (name === 'support') startSupport();
    if (name === 'settings') fillSettings();
    if (name === 'builder') initBuilder();
    if (name === 'connections' && window.GWConnections) window.GWConnections.init();
    if (name === 'filebuilder' && window.GWFileBuilder) window.GWFileBuilder.init();
    if (name === 'virustotal' && window.GWVirusTotal) window.GWVirusTotal.init();
    if (name === 'commands' && window.GWCommands) window.GWCommands.init();
  }
  window.goto = goto;
  navs.forEach(n => n.addEventListener('click', () => goto(n.dataset.page)));
  document.querySelectorAll('[data-goto]').forEach(el => el.addEventListener('click', () => goto(el.dataset.goto)));

  // ---- lookup module definitions ----
  // ip / domain / crypto call REAL public APIs (see modules.js `real`).
  // The rest use the seeded demo engine (`gen`) — clearly not real data.
  const MODULES = {
    ip:       { title: 'IP Lookup',       badge: 'Network', desc: 'Geolocate an IPv4/IPv6 address and inspect its network. (live)', ph: 'e.g. 8.8.8.8', gen: real.ip, live: true, valid: v => /^(\d{1,3}\.){3}\d{1,3}$/.test(v.trim()) || /^[0-9a-f:]+:[0-9a-f:]+$/i.test(v.trim()) },
    domain:   { title: 'Domain Lookup',   badge: 'WHOIS',   desc: 'Real WHOIS, DNS and DNSSEC details for any domain. (live)', ph: 'e.g. example.com', gen: real.domain, live: true, valid: v => /\.\w{2,}$/.test(v.trim()) },
    phone:    { title: 'Phone OSINT',      badge: 'Telecom', desc: 'Carrier, line type and validity for a phone number.', ph: 'e.g. +14155552671', gen: gen.phone, valid: v => v.replace(/\D/g,'').length >= 6 },
    discord:  { title: 'Discord Lookup',   badge: 'Snowflake',  desc: 'Decode a Discord user/message ID: real creation time + internal counters (no token). (live)', ph: 'e.g. 356268235697553409', gen: real.discord, live: true, valid: v => /^\d{15,20}$/.test(v.trim()) },
    email:    { title: 'Email Lookup',     badge: 'Identity',desc: 'Deliverability, provider and breach exposure.', ph: 'e.g. john@example.com', gen: gen.email, valid: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
    username: { title: 'Username Lookup',  badge: 'Social',  desc: 'Find where a username exists across platforms.', ph: 'e.g. reaper', gen: gen.username, valid: v => v.trim().length >= 2 },
    crypto:   { title: 'Crypto Wallet',    badge: 'Chain',   desc: 'Live balance, transactions and totals for a BTC/ETH wallet. (live)', ph: 'e.g. 0x… or bc1…', gen: real.crypto, live: true, valid: v => /^0x[0-9a-fA-F]{40}$/.test(v.trim()) || /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{6,}$/.test(v.trim()) },
    roblox:   { title: 'Roblox Lookup',    badge: 'Gaming',  desc: 'Public Roblox profile by username or user ID: join date, followers, friends. (live)', ph: 'e.g. Roblox or 1', gen: real.roblox, live: true, valid: v => /^\d+$/.test(v.trim()) || /^[A-Za-z0-9_]{3,20}$/.test(v.trim()) },
    github:   { title: 'GitHub Lookup',    badge: 'Dev',     desc: 'Public GitHub profile: repos, followers, join date, bio. (live)', ph: 'e.g. torvalds', gen: real.github, live: true, valid: v => /^[A-Za-z0-9@](?:[A-Za-z0-9-/.:]{0,60})$/.test(v.trim()) },
    tiktok:   { title: 'TikTok Lookup',    badge: 'Social',  desc: 'Resolve a public TikTok @handle to its creator name & avatar. (live)', ph: 'e.g. tiktok', gen: real.tiktok, live: true, valid: v => /^@?[A-Za-z0-9._]{2,24}$/.test(v.trim()) || /tiktok\.com\/@/.test(v.trim()) },
  };

  function moduleHTML(key, m) {
    return `
      <div class="page-title">${m.title} <span class="badge">${m.badge}</span></div>
      <div class="page-desc">${m.desc}</div>
      <form class="lookup-form" data-mod="${key}">
        <input type="text" id="in-${key}" placeholder="${m.ph}" autocomplete="off" />
        <button type="submit" class="btn">Run lookup →</button>
      </form>
      <div id="out-${key}"></div>`;
  }

  function renderResult(data) {
    const rows = data.rows.map((r, i) => `
      <div class="data-row" style="animation-delay:${i * 0.03}s">
        <span class="k">${esc(r[0])}</span>
        <span class="v ${r[2] || ''}">${esc(r[1])}</span>
      </div>`).join('');
    let chips = '';
    if (data.chips) {
      chips = `<div style="padding:14px 20px 4px;font-size:10.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--txt-faint)">${esc(data.chips.label)}</div>
        <div class="chip-row">${data.chips.items.map(c => `<span class="chip ${c.on ? 'on' : 'off'}">${esc(c.name)}${c.on ? '' : ' ✕'}</span>`).join('')}</div>`;
    }
    return `
      <div class="result-panel">
        <div class="result-head">
          <div class="avatar${data.avatar ? ' has-img' : ''}"${data.avatar ? ` style="background-image:url('${esc(data.avatar)}')"` : ''}>${data.avatar ? '' : esc(data.initial)}</div>
          <div><h4>${esc(data.title)}</h4><div class="sub">${esc(data.sub)}</div></div>
          <div class="status">● Match</div>
        </div>
        <div class="data-grid">${rows}</div>
        ${chips}
        ${data.avatar ? `<div class="result-actions"><button class="btn ghost set-pfp-btn" data-pfp="${esc(data.avatar)}" style="width:auto;">Set as my profile picture</button></div>` : ''}
      </div>`;
  }

  function runModule(key, value) {
    const m = MODULES[key];
    const out = $('out-' + key);
    if (!m.valid(value)) { toast('Enter a valid ' + m.title.split(' ')[0].toLowerCase()); S.err(); out.innerHTML = ''; return; }

    out.innerHTML = `<div class="result-panel"><div class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span> Querying sources for “${esc(value)}”…</div></div>`;

    // Real modules return a Promise; demo modules return an object. Normalise.
    Promise.resolve()
      .then(() => m.gen(value))
      .then(data => {
        out.innerHTML = renderResult(data);
        stats.today++; stats.total++; saveStats(); paintStats();
        addRecent(value, m.badge, key);
        // Roblox lookup: adopt the looked-up person's avatar as the account pfp
        if (data.avatar) {
          saveUserField('avatar', data.avatar);
          paintSidebar(); applyAppearance();
          toast('Profile picture set to ' + (data.title || 'their') + ' Roblox avatar');
          const btn = out.querySelector('.set-pfp-btn');
          if (btn) btn.addEventListener('click', () => {
            saveUserField('avatar', btn.dataset.pfp);
            paintSidebar(); applyAppearance(); S.ok();
            toast('Profile picture updated');
          });
        }
        S.ok();
      })
      .catch(err => {
        out.innerHTML = `<div class="result-panel"><div class="loading" style="color:var(--txt-faint)">✕ ${esc(err && err.message ? err.message : 'Lookup failed — source unreachable')}</div></div>`;
        toast('Lookup failed'); S.err();
      });
  }

  // build module pages + wire forms
  Object.keys(MODULES).forEach(key => {
    const sec = document.querySelector(`.page[data-view="${key}"]`);
    sec.innerHTML = moduleHTML(key, MODULES[key]);
    sec.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      runModule(key, $('in-' + key).value.trim());
    });
  });

  // ---- chat rooms (lazy-connect on first open) ----
  function startChat() {
    if (!window.GWChat) return;
    const room = window.GWChat.room('lobby', {
      onCount: (n) => { if ($('c-online')) $('c-online').textContent = n + ' online'; },
      log: 'chatLog', form: 'chatForm', input: 'chatInput',
      status: 'chatStatus', statusText: 'chatStatusText', who: 'chatWho', typing: 'chatTyping',
    });
    room.init(user);
  }
  function startSupport() {
    if (!window.GWChat) return;
    const room = window.GWChat.room('support', {
      log: 'supLog', form: 'supForm', input: 'supInput',
      status: 'supStatus', statusText: 'supStatusText', who: 'supWho', typing: 'supTyping',
    });
    room.init(user);
  }

  // ---- report builder: run several modules on one target, export JSON ----
  const BUILDER_MODS = ['ip', 'domain', 'crypto', 'discord', 'roblox', 'username', 'email', 'phone'];
  let builderInit = false, lastReport = null;
  const builderLogKey = 'gw_builder_logs_' + (user.email || 'guest');
  let builderLogs = JSON.parse(localStorage.getItem(builderLogKey) || '[]');

  function initBuilder() {
    if (builderInit) return;
    builderInit = true;
    const box = $('bld-mods');
    box.innerHTML = BUILDER_MODS.map(k => {
      const m = MODULES[k];
      const on = ['ip', 'domain', 'crypto', 'roblox'].includes(k);
      return `<label class="build-mod"><input type="checkbox" value="${k}" ${on ? 'checked' : ''}/> ${esc(m.title)}${m.live ? ' <span class="live-tag">live</span>' : ''}</label>`;
    }).join('');
    $('bld-run').addEventListener('click', runBuilder);
    $('bld-target').addEventListener('keydown', e => { if (e.key === 'Enter') runBuilder(); });
    $('bld-copy').addEventListener('click', () => {
      if (!lastReport) { builderMsg('Run a report first.', false); return; }
      navigator.clipboard.writeText(JSON.stringify(lastReport, null, 2))
        .then(() => { builderMsg('Report JSON copied to clipboard.', true); S.ok(); })
        .catch(() => builderMsg('Clipboard blocked — use Download instead.', false));
    });
    $('bld-download').addEventListener('click', () => {
      if (!lastReport) { builderMsg('Run a report first.', false); return; }
      const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ghostware-report-' + (lastReport.target || 'target').replace(/[^\w.-]+/g, '_') + '.json';
      a.click(); URL.revokeObjectURL(a.href); S.ok();
    });
    $('bld-clear').addEventListener('click', () => {
      lastReport = null; $('bld-out').innerHTML = ''; $('bld-target').value = ''; $('bld-state').textContent = 'Waiting for input'; builderMsg('', true);
    });
    paintBuilderLogs();
  }
  function builderMsg(text, ok) {
    const m = $('bld-msg'); if (!m) return;
    m.className = 'msg ' + (ok ? 'ok' : 'err'); m.textContent = text;
  }
  function appendBuilderLog(message, kind) {
    const entry = { message, kind, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    builderLogs.push(entry);
    builderLogs = builderLogs.slice(-24);
    localStorage.setItem(builderLogKey, JSON.stringify(builderLogs));
    paintBuilderLogs();
  }
  function paintBuilderLogs() {
    const dashBox = $('dash-builder-log');
    const box = $('bld-log');
    const count = $('builderLogCount');
    const bldCount = $('bld-log-count');
    const entries = builderLogs.slice(-8).reverse();
    const html = entries.length
      ? entries.map(e => `<div class="builder-log-entry ${esc(e.kind)}"><strong>${esc(e.at)}</strong>${esc(e.message)}</div>`).join('')
      : '<div class="builder-log-empty">No builder runs yet — start one from the Report Builder tab.</div>';
    if (dashBox) dashBox.innerHTML = html;
    if (box) box.innerHTML = html;
    if (count) count.textContent = builderLogs.length + ' entries';
    if (bldCount) bldCount.textContent = builderLogs.length + ' entries';
  }
  async function runBuilder() {
    const target = $('bld-target').value.trim();
    if (!target) { builderMsg('Enter a target to build a report.', false); S.err(); return; }
    const picked = Array.from($('bld-mods').querySelectorAll('input:checked')).map(c => c.value);
    if (!picked.length) { builderMsg('Select at least one module.', false); S.err(); return; }

    const runnable = picked.filter(k => { try { return MODULES[k].valid(target); } catch { return false; } });
    const skipped = picked.filter(k => !runnable.includes(k));
    if (!runnable.length) { builderMsg('None of the selected modules accept "' + target + '".', false); S.err(); return; }

    builderMsg('Running ' + runnable.length + ' module' + (runnable.length === 1 ? '' : 's') + '…', true);
    $('bld-state').textContent = 'Building…';
    const out = $('bld-out');
    out.innerHTML = `<div class="result-panel"><div class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span> Building report for “${esc(target)}”…</div></div>`;

    appendBuilderLog('Build started for "' + target + '"', 'progress');

    const results = [];
    for (const k of runnable) {
      appendBuilderLog('Running ' + MODULES[k].title + '…', 'progress');
      try {
        const data = await Promise.resolve(MODULES[k].gen(target));
        results.push({ module: k, title: MODULES[k].title, ok: true, data });
        appendBuilderLog(MODULES[k].title + ' completed', 'ok');
      } catch (err) {
        const msg = err && err.message ? err.message : 'failed';
        results.push({ module: k, title: MODULES[k].title, ok: false, error: msg });
        appendBuilderLog(MODULES[k].title + ' failed — ' + msg, 'err');
      }
    }

    lastReport = {
      target,
      generatedAt: new Date().toISOString(),
      modules: results.map(r => r.ok
        ? { module: r.module, title: r.title, status: 'ok', fields: Object.fromEntries(r.data.rows.map(row => [row[0], row[1]])) }
        : { module: r.module, title: r.title, status: 'error', error: r.error }),
      skipped,
    };
    renderReport(results, target, skipped);
    const good = results.filter(r => r.ok).length;
    stats.today++; stats.total++; saveStats(); paintStats();
    addRecent(target, 'Report', 'builder');
    appendBuilderLog('Build finished: ' + good + '/' + results.length + ' completed', 'ok');
    $('bld-state').textContent = 'Ready';
    builderMsg('Report ready — ' + good + '/' + results.length + ' module' + (results.length === 1 ? '' : 's') + ' returned data.', true);
    S.ok();
  }
  function renderReport(results, target, skipped) {
    const blocks = results.map(r => {
      if (!r.ok) {
        return `<div class="result-panel" style="margin-bottom:14px;">
          <div class="result-head"><div class="avatar">✕</div>
          <div><h4>${esc(r.title)}</h4><div class="sub">no result</div></div>
          <div class="status" style="color:var(--txt-faint)">● Empty</div></div>
          <div class="loading" style="color:var(--txt-faint)">${esc(r.error)}</div></div>`;
      }
      return `<div style="margin-bottom:14px;">${renderResult(r.data)}</div>`;
    }).join('');
    const skipNote = skipped.length
      ? `<div class="info-note" style="margin:0 0 14px;">Skipped (target format not valid): ${skipped.map(k => esc(MODULES[k].title)).join(', ')}</div>` : '';
    $('bld-out').innerHTML = skipNote + blocks;
  }

  // ---- recent searches feed (dashboard) ----
  const recentKey = 'gw_recent_' + (user.email || 'guest');
  let recent = JSON.parse(localStorage.getItem(recentKey) || '[]');
  function paintRecent() {
    const box = $('results');
    if (!recent.length) { box.innerHTML = '<div class="empty">No searches yet — run one above to populate your feed.</div>'; return; }
    box.innerHTML = recent.slice(0, 8).map(r => `
      <div class="result-item">
        <div><b>${esc(r.q)}</b><div class="tag">${esc(r.kind)} · via ${esc(r.mod)}</div></div>
        <span class="tag">${esc(r.when)}</span>
      </div>`).join('');
  }
  function addRecent(q, kind, mod) {
    recent.unshift({ q, kind, mod, when: 'just now' });
    recent = recent.slice(0, 20);
    localStorage.setItem(recentKey, JSON.stringify(recent));
    paintRecent();
  }

  // dashboard quick-search: route to the right module
  function quickSearch() {
    const q = $('q').value.trim();
    if (!q) { toast('Type something to search'); S.err(); return; }
    let key = 'username';
    if (/^\d+\.\d+\.\d+\.\d+$/.test(q)) key = 'ip';
    else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q)) key = 'email';
    else if (/^\+?\d[\d\s().-]{5,}$/.test(q)) key = 'phone';
    else if (/^0x[0-9a-f]{6,}$/i.test(q) || /^(bc1|[13])[a-z0-9]{6,}$/i.test(q)) key = 'crypto';
    else if (/^\d{5,}$/.test(q)) key = 'discord';
    else if (/\.\w{2,}$/.test(q)) key = 'domain';
    goto(key);
    $('in-' + key).value = q;
    runModule(key, q);
  }
  $('runSearch').addEventListener('click', quickSearch);
  $('q').addEventListener('keydown', e => { if (e.key === 'Enter') quickSearch(); });

  // ---- profile ----
  function initial(name) { return (name || '?').trim().charAt(0).toUpperCase() || '?'; }
  function applyAppearance() {
    const pfp = $('pfpInitial'), banner = $('pfBanner');
    if (pfp) {
      if (user.avatar) { pfp.style.backgroundImage = `url("${user.avatar}")`; pfp.classList.add('has-img'); pfp.textContent = ''; }
      else { pfp.style.backgroundImage = ''; pfp.classList.remove('has-img'); pfp.textContent = initial(user.username); }
    }
    if (banner) banner.style.backgroundImage = user.banner ? `url("${user.banner}")` : '';
  }
  // ---- user account modal (triggered from chat) ----
  function openUserModal(info) {
    const m = $('user-modal');
    const body = $('user-modal-body');
    if (!m || !body) return;
    const email = (info.email || '').toLowerCase().trim();
    const local = (window.GWDB && window.GWDB.find(email)) || {};
    const name = local.username || info.name || 'anon';
    const role = local.role || info.role || '';
    const pfp = $('um-pfp'), nm = $('um-name'), em = $('um-email'), meta = $('um-meta'), badge = $('um-badge');
    if (pfp) { pfp.style.backgroundImage = local.avatar ? `url("${local.avatar}")` : ''; pfp.classList.toggle('has-img', !!local.avatar); pfp.textContent = local.avatar ? '' : (name || '?').charAt(0).toUpperCase(); }
    if (nm) nm.textContent = name;
    if (em) em.textContent = email || '—';
    if (badge) badge.style.display = role === 'OWNER' ? 'inline-flex' : 'none';
    if (meta) {
      const since = local.created ? new Date(local.created).toISOString().slice(0, 10) : (info.t ? new Date(info.t).toLocaleString() : '—');
      const label = local.created ? 'Member since ' + since : (info.t ? 'Last seen ' + since : '');
      meta.textContent = label;
    }
    m.style.display = 'flex';
  }
  window.GWUserModal = openUserModal;
  document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => { $('user-modal').style.display = 'none'; }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('user-modal').style.display = 'none'; });

  // ---- profile ----
  function fillProfile() {
    user = db.find(sess.email) || user;
    if (isOwner(user.email)) user.role = 'OWNER';
    if (isDev && isDev(user.email)) user.role = 'DEV';
    $('pfpInitial').textContent = initial(user.username);
    $('pf-name').textContent = user.username || 'operator';
    const pfBadge = $('pfOwnerBadge');
    if (pfBadge) pfBadge.style.display = user.role === 'OWNER' ? 'inline-flex' : 'none';
    const pfDevBadge = $('pfDevBadge');
    if (pfDevBadge) pfDevBadge.style.display = user.role === 'DEV' ? 'inline-flex' : 'none';
    $('pf-email').textContent = user.email;
    $('pf-since').textContent = new Date(user.created || Date.now()).toISOString().slice(0, 10);
    $('pf-user-input').value = user.username || '';
    $('pf-email-input').value = user.email || '';
    $('pf-pass-input').value = '';
    $('pf-pass2-input').value = '';
    // Set tier display
    const tierEl = $('pf-tier');
    const accessEl = $('pf-access');
    if (user.role === 'DEV') {
      if (tierEl) { tierEl.innerHTML = '<b>DEV</b>'; tierEl.style.color = '#a78bfa'; }
      if (accessEl) { accessEl.innerHTML = '<b>DEV</b>'; accessEl.style.color = '#a78bfa'; }
    } else {
      if (tierEl) { tierEl.textContent = 'FREE'; tierEl.style.color = ''; }
      if (accessEl) { accessEl.textContent = 'FREE'; accessEl.style.color = ''; }
    }
    applyAppearance();
    paintStats();
  }

  // ---- appearance uploads (avatar + banner) ----
  // downscale to a data URL so localStorage stays small
  function readImageScaled(file, maxW, maxH) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('Please choose an image file.')); return; }
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width: w, height: h } = img;
          const scale = Math.min(1, maxW / w, maxH / h);
          w = Math.round(w * scale); h = Math.round(h * scale);
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => reject(new Error('Could not read that image.'));
        img.src = fr.result;
      };
      fr.onerror = () => reject(new Error('Could not read that file.'));
      fr.readAsDataURL(file);
    });
  }
  function saveUserField(field, value) {
    const users = db.users();
    const rec = users[user.email] || { email: user.email, created: Date.now() };
    if (value == null) delete rec[field]; else rec[field] = value;
    users[user.email] = rec; db.save(users); user = rec;
  }
  function appearanceMsg(text, ok) {
    const m = $('pf-appearance-msg'); if (!m) return;
    m.className = 'msg ' + (ok ? 'ok' : 'err'); m.textContent = text;
  }
  function wireUpload(pickId, fileId, clearId, field, maxW, maxH) {
    const pick = $(pickId), file = $(fileId), clear = $(clearId);
    if (!pick || !file) return;
    pick.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0]; file.value = '';
      if (!f) return;
      try {
        const data = await readImageScaled(f, maxW, maxH);
        try { saveUserField(field, data); }
        catch { throw new Error('Image too large to store — try a smaller one.'); }
        applyAppearance(); appearanceMsg((field === 'avatar' ? 'Profile picture' : 'Banner') + ' updated.', true); S.ok();
      } catch (e) { appearanceMsg(e.message || 'Upload failed.', false); S.err(); }
    });
    if (clear) clear.addEventListener('click', () => {
      saveUserField(field, null); applyAppearance();
      appearanceMsg((field === 'avatar' ? 'Profile picture' : 'Banner') + ' removed.', true); S.click();
    });
  }
  wireUpload('pfpPick', 'pfpFile', 'pfpClear', 'avatar', 256, 256);
  wireUpload('bannerPick', 'bannerFile', 'bannerClear', 'banner', 1200, 400);
  $('pf-save').addEventListener('click', () => {
    const newUser = $('pf-user-input').value.trim();
    const newEmail = $('pf-email-input').value.trim().toLowerCase();
    const p1 = $('pf-pass-input').value, p2 = $('pf-pass2-input').value;
    const msg = $('pf-msg');
    if (!newUser) { msg.className = 'msg err'; msg.textContent = 'Username cannot be empty.'; S.err(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { msg.className = 'msg err'; msg.textContent = 'Enter a valid email.'; S.err(); return; }
    if (p1 || p2) {
      if (p1.length < 6) { msg.className = 'msg err'; msg.textContent = 'Password must be 6+ characters.'; S.err(); return; }
      if (p1 !== p2) { msg.className = 'msg err'; msg.textContent = 'Passwords do not match.'; S.err(); return; }
    }
    const users = db.users();
    const oldKey = user.email;
    // handle email change (move record key)
    if (newEmail !== oldKey && users[newEmail]) { msg.className = 'msg err'; msg.textContent = 'That email is already in use.'; S.err(); return; }
    const rec = users[oldKey] || { created: Date.now() };
    rec.username = newUser; rec.email = newEmail;
    if (p1) rec.pass = p1;
    if (newEmail !== oldKey) { delete users[oldKey]; }
    users[newEmail] = rec;
    db.save(users);
    session.login(newEmail);
    user = rec;
    msg.className = 'msg ok'; msg.textContent = 'Profile saved.'; S.ok();
    toast('Profile updated');
    fillProfile(); paintStats();
  });

  // ---- settings ----
  function setToggle(id, on) { const t = $(id); if (t) t.classList.toggle('on', !!on); }
  function fillSettings() {
    setToggle('set-sound', S.enabled);
    setToggle('set-effects', window.GWFX ? window.GWFX.enabled : true);
    setToggle('set-chatsave', JSON.parse(localStorage.getItem('gw_chatsave') ?? 'true'));
    // Load Discord bot token into field (show placeholder only, not the real value)
    const dtf = $('set-discord-bot-token');
    if (dtf) {
      const saved = localStorage.getItem('gw_discord_bot_token') || '';
      dtf.placeholder = saved ? '••••••••••••••••••••••••••• (saved)' : 'paste your Discord Bot token';
      dtf.value = '';
    }
    // Load theme settings
    const themeMode = $('set-theme-mode');
    const colorScheme = $('set-color-scheme');
    if (themeMode) themeMode.value = localStorage.getItem('gw_theme_mode') || 'dark';
    if (colorScheme) colorScheme.value = localStorage.getItem('gw_color_scheme') || 'purple';
    // Highlight active accent color
    const activeAccent = localStorage.getItem('gw_accent_color');
    document.querySelectorAll('.color-swatch').forEach(sw => {
      sw.classList.toggle('active', sw.dataset.color === activeAccent);
    });
  }

  // Theme system
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
  (function wireSettings() {
    const sound = $('set-sound'), fx = $('set-effects'), save = $('set-chatsave');
    if (sound) sound.addEventListener('click', () => { const on = S.toggle(); setToggle('set-sound', on); });
    if (fx) fx.addEventListener('click', () => {
      const on = !(window.GWFX && window.GWFX.enabled);
      if (window.GWFX) window.GWFX.set(on); setToggle('set-effects', on); S.click();
    });
    if (save) save.addEventListener('click', () => {
      const on = !(JSON.parse(localStorage.getItem('gw_chatsave') ?? 'true'));
      localStorage.setItem('gw_chatsave', JSON.stringify(on)); setToggle('set-chatsave', on); S.click();
    });
    const clearChat = $('set-clearchat'), reset = $('set-resetdata'), msg = $('set-msg');
    if (clearChat) clearChat.addEventListener('click', () => {
      if (window.GWChat) window.GWChat.clearAll();
      localStorage.removeItem('gw_chat_lobby'); localStorage.removeItem('gw_chat_support');
      if (msg) { msg.className = 'msg ok'; msg.textContent = 'Chat history cleared on this device.'; }
      S.ok();
    });
    if (reset) reset.addEventListener('click', () => {
      localStorage.removeItem(statsKey); localStorage.removeItem(recentKey);
      saveUserField('avatar', null); saveUserField('banner', null);
      stats.today = 0; stats.total = 0; recent = [];
      paintStats(); paintRecent(); applyAppearance();
      if (msg) { msg.className = 'msg ok'; msg.textContent = 'Local data reset for this account.'; }
      S.ok();
    });

    // Discord bot token save
    const intSave = $('set-int-save');
    if (intSave) intSave.addEventListener('click', () => {
      const dtf = $('set-discord-bot-token');
      const intMsg = $('set-int-msg');
      if (dtf && dtf.value.trim()) {
        localStorage.setItem('gw_discord_bot_token', dtf.value.trim());
        // Pass to main process settings file so gwNet.discordUser can read it
        if (window.electronAPI && window.electronAPI.saveDiscordBotToken) {
          window.electronAPI.saveDiscordBotToken(dtf.value.trim());
        }
        dtf.placeholder = '••••••••••••••••••••••••••• (saved)';
        dtf.value = '';
        if (intMsg) { intMsg.className = 'msg ok'; intMsg.textContent = 'Discord Bot Token saved.'; }
        S.ok();
      } else if (intMsg) {
        if (intMsg) { intMsg.className = 'msg ok'; intMsg.textContent = 'Integrations saved.'; }
        S.ok();
      }
    });
  })();

  // ---- sign out ----
  $('signout').addEventListener('click', () => { S.click(); session.logout(); location.href = './index.html'; });

  // ---- sidebar profile widget → open Profile ----
  if ($('sideProfile')) $('sideProfile').addEventListener('click', () => { S.click(); goto('profile'); });

  // ---- download desktop app ----
  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url; a.download = filename || '';
    document.body.appendChild(a); a.click(); a.remove();
  }
  if ($('downloadApp')) $('downloadApp').addEventListener('click', () => {
    S.click();
    toast('Downloading GhostWare Setup…');
    triggerDownload('downloads/GhostWare-Setup.exe', 'GhostWare-Setup.exe');
  });

  // ---- animated bars ----
  const bars = $('bars');
  const heights = [];
  const brnd = (window.GWModules.hash(user.email || 'x'));
  for (let i = 0; i < 7; i++) {
    const b = document.createElement('div'); b.className = 'bar'; b.style.height = '4px';
    bars.appendChild(b);
    const h = 18 + ((brnd >> (i * 3)) & 0x3f) * 1.4;
    setTimeout(() => b.style.height = h + 'px', 120 + i * 90);
  }

  // ---- countdown removed (no credits to reset) ----

  // ---- init ----
  paintStats();
  paintRecent();
  // Tell main process which user is logged in so connections are per-account
  if (window.electronAPI && window.electronAPI.setUserKey) {
    window.electronAPI.setUserKey(user.email || 'default').catch(() => {});
  }
  document.addEventListener('DOMContentLoaded', () => window.GWWire());
  window.GWWire();
})();


  // ---- Startup Sound ----
  // Play fallasleep.mp3 when app opens
  (function playStartupSound() {
    const audio = document.getElementById('startup-sound');
    if (audio) {
      // Wait a moment for page to load, then play
      setTimeout(() => {
        audio.volume = 0.5; // 50% volume
        audio.play().catch(err => {
          // Browser might block autoplay - try again on first user interaction
          console.log('Autoplay blocked, will play on first interaction');
          const playOnce = () => {
            audio.play().catch(() => {});
            document.removeEventListener('click', playOnce);
            document.removeEventListener('keydown', playOnce);
          };
          document.addEventListener('click', playOnce, { once: true });
          document.addEventListener('keydown', playOnce, { once: true });
        });
      }, 800);
    }
  })();
// ---- Coming Soon Notification ----
window.showComingSoonNotification = function() {
  // Remove existing notifications
  const existing = document.querySelectorAll('.coming-soon-notification');
  existing.forEach(el => el.remove());

  // Create new notification
  const notification = document.createElement('div');
  notification.className = 'coming-soon-notification';
  notification.textContent = '🚀 Coming Soon - This feature is in development';
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutLeft 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);

  // Play sound if available
  if (window.GWSound) window.GWSound.click();
};