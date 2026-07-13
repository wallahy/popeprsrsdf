/* ===================== GhostWare — Real-time Chat engine =====================
   Powers BOTH the public lobby and the support room. No backend, no API keys:
   MQTT over secure WebSockets to a free public broker (EMQX).

   Features:
   - live cross-account messaging (shared topic per room)
   - presence heartbeats + online count
   - typing indicator ("X is typing…") broadcast on a per-room topic
   - persistence: each room's log is saved to localStorage, so you still see
     old messages after closing the site and coming back
   - peer history sync: on join you request backlog; anyone online replies with
     their saved log, so a returning user catches up even with an empty cache

   NOTE: a public broker is world-readable — demo lobby, not private comms.
   For real cross-device history + privacy, point BROKER at your own broker/DB.
   ========================================================================== */
(function () {
  const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
  const MAX_STORE = 200;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function rid() { return Math.floor(Math.random() * 1e9).toString(36) + Math.floor(Math.random() * 1e9).toString(36); }

  function Room(name, opts) {
    this.name = name;
    this.base = 'ghostware/' + name + '/v2';
    this.T = {
      msg: this.base + '/msg',
      pres: this.base + '/presence',
      typing: this.base + '/typing',
      histReq: this.base + '/hist/req',
      histRes: this.base + '/hist/res',
    };
    this.storeKey = 'gw_chat_' + name;
    this.client = null;
    this.me = 'operator';
    this.role = '';
    this.id = 'guest';
    this.started = false;
    this.presence = {};
    this.typing = {}; // id -> { name, at }
    this.seen = new Set();
    this.messages = [];
    this.onCount = opts && opts.onCount || null;
    this.els = {};
    this._sel = opts || {};
  }

  Room.prototype.init = function (user) {
    if (this.started) return;
    this.started = true;
    this.me = (user && user.username) || 'operator';
    this.role = (user && user.role) || '';
    this.id = (user && user.email ? user.email : 'guest') + ':' + rid().slice(0, 6);

    const s = this._sel;
    this.els = {
      log: document.getElementById(s.log),
      form: document.getElementById(s.form),
      input: document.getElementById(s.input),
      status: document.getElementById(s.status),
      statusText: document.getElementById(s.statusText),
      who: document.getElementById(s.who),
      typing: document.getElementById(s.typing),
    };
    if (this.els.who) this.els.who.textContent = this.me;

    // 1) paint stored history immediately (works fully offline)
    this.load();
    if (this.messages.length) {
      this.els.log.innerHTML = '';
      this.messages.forEach(m => this.paint(m, m.id === this.id, false));
      this.sysLine('— showing ' + this.messages.length + ' saved message' + (this.messages.length === 1 ? '' : 's') + ' —');
    }

    if (this.els.form) {
      this.els.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.els.input.value.trim();
        if (!text) return;
        this.send(text);
        this.els.input.value = '';
        this.sendTyping(false);
      });
    }
    if (this.els.input) {
      let last = 0;
      this.els.input.addEventListener('input', () => {
        const now = performance.now();
        if (now - last > 1200) { last = now; this.sendTyping(true); }
      });
      this.els.input.addEventListener('blur', () => this.sendTyping(false));
    }

    if (typeof mqtt === 'undefined') { this.setStatus(false, 'Chat library failed to load.'); return; }
    this.connect();
  };

  Room.prototype.connect = function () {
    this.setStatus(false, 'Connecting…');
    const clientId = 'gw_' + this.name + '_' + this.id.replace(/[^a-z0-9]/gi, '').slice(0, 16) + rid().slice(0, 4);
    try {
      this.client = mqtt.connect(BROKER_URL, { clientId, keepalive: 30, reconnectPeriod: 3000, connectTimeout: 8000 });
    } catch (e) { this.setStatus(false, 'Could not connect.'); return; }

    this.client.on('connect', () => {
      this.client.subscribe(Object.values(this.T), () => {});
      this.setStatus(true, 'Connected');
      this.announce();
      // ask peers for backlog
      this.client.publish(this.T.histReq, JSON.stringify({ id: this.id }));
      if (this._hb) clearInterval(this._hb);
      this._hb = setInterval(() => { this.announce(); this.prune(); }, 8000);
    });
    this.client.on('reconnect', () => this.setStatus(false, 'Reconnecting…'));
    this.client.on('close', () => this.setStatus(false, 'Disconnected'));
    this.client.on('error', () => this.setStatus(false, 'Connection error'));

    this.client.on('message', (topic, payload) => {
      let d; try { d = JSON.parse(payload.toString()); } catch { return; }
      if (topic === this.T.msg) this.onMsg(d);
      else if (topic === this.T.pres) this.onPres(d);
      else if (topic === this.T.typing) this.onTyping(d);
      else if (topic === this.T.histReq) this.onHistReq(d);
      else if (topic === this.T.histRes) this.onHistRes(d);
    });
  };

  Room.prototype.onMsg = function (d) {
    if (!d || !d.text || !d.mid) return;
    if (this.seen.has(d.mid)) return;
    this.seen.add(d.mid);
    this.messages.push(d);
    this.trimSave();
    this.paint(d, d.id === this.id, true);
    // a fresh message means they stopped typing
    if (this.typing[d.id]) { delete this.typing[d.id]; this.renderTyping(); }
  };

  Room.prototype.onPres = function (d) {
    if (!d || !d.id) return;
    const known = !!this.presence[d.id];
    this.presence[d.id] = { name: d.name, at: Date.now() };
    if (!known && d.id !== this.id) this.sysLine((d.name || 'someone') + ' is online');
    this.updateCount();
  };

  Room.prototype.onTyping = function (d) {
    if (!d || !d.id || d.id === this.id) return;
    if (d.on) this.typing[d.id] = { name: d.name, at: Date.now() };
    else delete this.typing[d.id];
    this.renderTyping();
  };

  Room.prototype.onHistReq = function (d) {
    if (!d || d.id === this.id) return;
    if (!this.messages.length) return;
    // only one responder-ish: small random delay, send our tail
    setTimeout(() => {
      if (!this.client || !this.client.connected) return;
      this.client.publish(this.T.histRes, JSON.stringify({ to: d.id, msgs: this.messages.slice(-60) }));
    }, 150 + Math.floor(rid().charCodeAt(0) % 400));
  };

  Room.prototype.onHistRes = function (d) {
    if (!d || d.to !== this.id || !Array.isArray(d.msgs)) return;
    let added = 0;
    // merge by mid, keep chronological
    d.msgs.forEach(m => {
      if (m && m.mid && !this.seen.has(m.mid)) { this.seen.add(m.mid); this.messages.push(m); added++; }
    });
    if (!added) return;
    this.messages.sort((a, b) => (a.t || 0) - (b.t || 0));
    this.trimSave();
    // repaint from scratch to keep order
    this.els.log.innerHTML = '';
    this.messages.forEach(m => this.paint(m, m.id === this.id, false));
    this.sysLine('— synced ' + added + ' earlier message' + (added === 1 ? '' : 's') + ' from peers —');
  };

  Room.prototype.announce = function () {
    if (!this.client || !this.client.connected) return;
    this.presence[this.id] = { name: this.me, at: Date.now() };
    this.client.publish(this.T.pres, JSON.stringify({ id: this.id, name: this.me, role: this.role }));
    this.updateCount();
  };

  Room.prototype.prune = function () {
    const now = Date.now();
    Object.keys(this.presence).forEach(k => { if (now - this.presence[k].at > 26000) delete this.presence[k]; });
    Object.keys(this.typing).forEach(k => { if (now - this.typing[k].at > 4000) delete this.typing[k]; });
    this.renderTyping();
    this.updateCount();
  };

  Room.prototype.updateCount = function () {
    const n = Object.keys(this.presence).length || 1;
    if (this.onCount) this.onCount(n);
  };

  Room.prototype.send = function (text) {
    if (!this.client || !this.client.connected) { this.sysLine('Not connected — message not sent.'); return; }
    const msg = { mid: rid(), id: this.id, name: this.me, role: this.role, text: text.slice(0, 500), t: Date.now() };
    this.client.publish(this.T.msg, JSON.stringify(msg));
  };

  Room.prototype.sendTyping = function (on) {
    if (!this.client || !this.client.connected) return;
    this.client.publish(this.T.typing, JSON.stringify({ id: this.id, name: this.me, role: this.role, on: !!on }));
  };

  Room.prototype.renderTyping = function () {
    if (!this.els.typing) return;
    const entries = Object.values(this.typing);
    const names = entries.map(t => (t.role === 'OWNER' ? t.name + ' (OWNER)' : t.name) || 'someone');
    if (!names.length) { this.els.typing.textContent = ''; this.els.typing.classList.remove('show'); return; }
    let txt;
    if (names.length === 1) txt = names[0] + ' is typing';
    else if (names.length === 2) txt = names[0] + ' and ' + names[1] + ' are typing';
    else txt = names.length + ' people are typing';
    this.els.typing.innerHTML = esc(txt) + ' <span class="tdot">.</span><span class="tdot">.</span><span class="tdot">.</span>';
    this.els.typing.classList.add('show');
  };

  Room.prototype.viewUser = function (d) {
    if (typeof window.GWUserModal !== 'function') return;
    const email = (d.id && d.id.split(':')[0]) || '';
    window.GWUserModal({ email, name: d.name, role: d.role, t: d.t });
  };

  Room.prototype.paint = function (d, mine, animate) {
    if (!this.els.log) return;
    const when = new Date(d.t || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ownerBadge = d.role === 'OWNER' ? '<span class="owner-badge chat-owner">OWNER</span>' : '';
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg' + (mine ? ' me' : '') + (animate ? '' : ' noanim');
    wrap.innerHTML =
      '<div class="meta"><button class="user-name" data-name="' + esc(d.name || 'anon') + '" data-email="' + esc((d.id && d.id.split(':')[0]) || '') + '" data-role="' + esc(d.role || '') + '" data-t="' + esc(d.t || '') + '"><b>' + esc(d.name || 'anon') + '</b></button>' + ownerBadge + ' · ' + esc(when) + '</div>' +
      '<div class="bubble">' + esc(d.text) + '</div>';
    const nameBtn = wrap.querySelector('.user-name');
    if (nameBtn) {
      const self = this;
      nameBtn.addEventListener('click', function () {
        self.viewUser({
          name: this.dataset.name,
          id: this.dataset.email + ':view',
          role: this.dataset.role,
          t: this.dataset.t,
        });
      });
    }
    this.els.log.appendChild(wrap);
    this.scroll();
  };

  Room.prototype.sysLine = function (text) {
    if (!this.els.log) return;
    const el = document.createElement('div');
    el.className = 'chat-sys';
    el.textContent = text;
    this.els.log.appendChild(el);
    this.scroll();
  };

  Room.prototype.scroll = function () { if (this.els.log) this.els.log.scrollTop = this.els.log.scrollHeight; };

  Room.prototype.setStatus = function (online, text) {
    if (this.els.status) this.els.status.classList.toggle('online', !!online);
    if (this.els.statusText) this.els.statusText.textContent = text;
  };

  Room.prototype.load = function () {
    if (JSON.parse(localStorage.getItem('gw_chatsave') ?? 'true') === false) return;
    try {
      const arr = JSON.parse(localStorage.getItem(this.storeKey) || '[]');
      if (Array.isArray(arr)) { this.messages = arr; arr.forEach(m => m && m.mid && this.seen.add(m.mid)); }
    } catch {}
  };
  Room.prototype.trimSave = function () {
    if (this.messages.length > MAX_STORE) this.messages = this.messages.slice(-MAX_STORE);
    if (JSON.parse(localStorage.getItem('gw_chatsave') ?? 'true') === false) return;
    try { localStorage.setItem(this.storeKey, JSON.stringify(this.messages)); } catch {}
  };
  Room.prototype.clear = function () {
    this.messages = []; this.seen = new Set();
    try { localStorage.removeItem(this.storeKey); } catch {}
    if (this.els.log) this.els.log.innerHTML = '';
    this.sysLine('— history cleared —');
  };

  // registry so dashboard can grab rooms by name
  const rooms = {};
  window.GWChat = {
    room(name, opts) {
      if (!rooms[name]) rooms[name] = new Room(name, opts);
      else if (opts && opts.onCount) rooms[name].onCount = opts.onCount;
      return rooms[name];
    },
    clearAll() { Object.values(rooms).forEach(r => r.clear()); },
  };
})();
