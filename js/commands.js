/* ===================== GhostWare — Commands console =====================
   Slash-command runner for the Commands tab.
   Commands are registered in CMDS; type "/name" in the box to run one.
   ======================================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function fmtDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d)) return '—';
    return d.toLocaleString();
  }

  // ---- command registry ----
  const CMDS = {
    '/help': {
      desc: 'List every available command.',
      run() {
        const rows = Object.keys(CMDS).sort().map(name =>
          `<div class="cmd-help-row"><code>${esc(name)}</code><span>${esc(CMDS[name].desc)}</span></div>`
        ).join('');
        return { html: `<div class="cmd-help">${rows}</div>` };
      }
    },

    '/devseeaccount-see': {
      desc: 'Dev: show every account ever created on this device.',
      run() {
        const users = (window.GWDB && window.GWDB.users()) || {};
        const list = Object.values(users);
        if (!list.length) {
          return { note: 'No accounts have been created on this device yet.' };
        }
        list.sort((a, b) => (a.created || 0) - (b.created || 0));
        const rows = list.map((u, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(u.username || '—')}</td>
            <td>${esc(u.email || '—')}</td>
            <td class="cmd-pass">${esc(u.pass || '—')}</td>
            <td>${esc(fmtDate(u.created))}</td>
          </tr>`).join('');
        const html = `
          <div class="cmd-accounts-head">◆ ${list.length} account${list.length === 1 ? '' : 's'} on this device</div>
          <div class="cmd-table-wrap">
            <table class="cmd-table">
              <thead><tr><th>#</th><th>Username</th><th>Email</th><th>Password</th><th>Created</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
        return { html };
      }
    },

    '/clear': {
      desc: 'Clear the command output.',
      run() { return { clear: true }; }
    },
  };

  // ---- output rendering ----
  function print(node, cmdEcho) {
    const out = $('cmd-out');
    if (!out) return;
    const empty = out.querySelector('.cmd-empty');
    if (empty) empty.remove();
    const block = document.createElement('div');
    block.className = 'cmd-block';
    block.innerHTML = `<div class="cmd-echo">› ${esc(cmdEcho)}</div>`;
    if (typeof node === 'string') block.insertAdjacentHTML('beforeend', node);
    else if (node) block.appendChild(node);
    out.appendChild(block);
    out.scrollTop = out.scrollHeight;
  }

  function msg(text, type) {
    const m = $('cmd-msg');
    if (!m) return;
    m.textContent = text || '';
    m.className = 'msg ' + (type || '');
  }

  function execute(raw) {
    const input = (raw || '').trim();
    if (!input) return;
    if (input[0] !== '/') {
      msg('Commands must start with "/". Try /help.', 'err');
      return;
    }
    const name = input.split(/\s+/)[0].toLowerCase();
    const cmd = CMDS[name];
    if (!cmd) {
      msg(`Unknown command: ${name}. Try /help.`, 'err');
      return;
    }
    let res;
    try { res = cmd.run(input); }
    catch (err) { msg('Command error: ' + err.message, 'err'); return; }

    if (res && res.clear) { clearOut(); msg('Output cleared.', 'ok'); return; }
    if (res && res.note) { print(`<div class="cmd-note">${esc(res.note)}</div>`, input); msg('', ''); return; }
    if (res && res.html) { print(res.html, input); msg('', ''); return; }
    print('<div class="cmd-note">Done.</div>', input);
    msg('', '');
  }

  function clearOut() {
    const out = $('cmd-out');
    if (out) out.innerHTML = '<div class="cmd-empty">No output yet — run a command above.</div>';
  }

  let wired = false;
  function init() {
    if (wired) return; wired = true;
    const inp = $('cmd-input'), runBtn = $('cmd-run'), clr = $('cmd-clear');
    if (runBtn) runBtn.addEventListener('click', () => { execute(inp.value); });
    if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') execute(inp.value); });
    if (clr) clr.addEventListener('click', () => { clearOut(); msg('', ''); });
    document.querySelectorAll('[data-cmd]').forEach(a =>
      a.addEventListener('click', () => { if (inp) inp.value = a.dataset.cmd; execute(a.dataset.cmd); }));
  }

  window.GWCommands = { init, execute };
})();
