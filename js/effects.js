/* ===================== GhostWare — Effects: mouse glow, sparks, sounds ===================== */
(function () {
  const root = document.documentElement;

  /* effects (glow + sparks) on/off — persisted, toggled from Settings */
  const FX = {
    enabled: JSON.parse(localStorage.getItem('gw_fx') ?? 'true'),
    set(v) {
      this.enabled = !!v;
      localStorage.setItem('gw_fx', JSON.stringify(this.enabled));
      if (!this.enabled) {
        root.style.setProperty('--glow-strength', '0');
        document.querySelectorAll('.spark').forEach(s => s.remove());
      } else {
        root.style.setProperty('--glow-strength', '0.12');
      }
    }
  };
  window.GWFX = FX;
  if (!FX.enabled) root.style.setProperty('--glow-strength', '0');

  /* ---------- Mouse-follow glow — pure white/gray, follows the cursor ---------- */
  let lastX = 0, lastY = 0, lastSpark = 0;
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    root.style.setProperty('--mx', x + '%');
    root.style.setProperty('--my', y + '%');
    if (!FX.enabled) return;

    // brightness reacts to speed but is ALWAYS neutral gray→white (r=g=b, no hue)
    const speed = Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY;
    const v = Math.round(Math.min(255, 165 + speed * 1.7)); // 165 (gray) -> 255 (white)
    root.style.setProperty('--glow', `${v},${v},${v}`);
    root.style.setProperty('--glow-strength', Math.min(0.26, 0.11 + speed * 0.004).toFixed(3));

    // spawn sparks while moving (throttled)
    const now = performance.now();
    if (speed > 6 && now - lastSpark > 30) {
      lastSpark = now;
      spawnSpark(e.clientX, e.clientY);
    }
  });

  function spawnSpark(x, y) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.style.left = (x - 3 + (Math.random() * 10 - 5)) + 'px';
    s.style.top = (y - 3 + (Math.random() * 10 - 5)) + 'px';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 800);
  }

  /* ---------- Sound engine (Web Audio, generated — no files needed) ---------- */
  const Sound = {
    ctx: null,
    enabled: JSON.parse(localStorage.getItem('gw_sound') ?? 'true'),
    init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } },
    blip(freq = 420, dur = 0.06, type = 'sine', vol = 0.05) {
      if (!this.enabled) return;
      this.init(); if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.7, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + dur);
    },
    click() { this.blip(520, 0.05, 'triangle', 0.05); },
    hover() { this.blip(720, 0.03, 'sine', 0.02); },
    ok()    { this.blip(660, 0.09, 'sine', 0.06); setTimeout(() => this.blip(880, 0.09, 'sine', 0.05), 80); },
    err()   { this.blip(180, 0.16, 'sawtooth', 0.05); },
    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('gw_sound', JSON.stringify(this.enabled));
      if (this.enabled) this.ok();
      return this.enabled;
    }
  };
  window.GWSound = Sound;

  /* ---------- Wire sounds to interactive elements ---------- */
  function wire() {
    document.querySelectorAll('button, .btn, .nav-item, .auth-links a, a.panel, .card')
      .forEach(el => {
        if (el.dataset.snd) return;
        el.dataset.snd = '1';
        el.addEventListener('click', () => Sound.click());
        el.addEventListener('mouseenter', () => Sound.hover());
      });
  }
  window.GWWire = wire;
  document.addEventListener('DOMContentLoaded', wire);

  /* sound toggle button (if present) — SVG icons, no emoji */
  const ICON_ON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const ICON_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/></svg>';
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('soundToggle');
    if (btn) {
      const card = document.getElementById('c-sound');
      const paint = () => {
        btn.innerHTML = Sound.enabled ? ICON_ON : ICON_OFF;
        btn.classList.toggle('muted', !Sound.enabled);
        if (card) card.textContent = Sound.enabled ? 'On' : 'Off';
      };
      paint();
      btn.addEventListener('click', () => { Sound.toggle(); paint(); });
    }
  });
})();
