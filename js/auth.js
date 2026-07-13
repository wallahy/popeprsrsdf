/* ===================== GhostWare — Auth + Captcha ===================== */
(function () {
  const DB_KEY = 'gw_users';
  const SESSION_KEY = 'gw_session';

  // ── Dev account seed — always present ──
  const DEV_EMAIL    = 'ghostware@gmail.com';
  const DEV_USERNAME = 'GhostWare';
  const DEV_PASS     = 'ghostware33351';

  const db = {
    users() { return JSON.parse(localStorage.getItem(DB_KEY) || '{}'); },
    save(u) { localStorage.setItem(DB_KEY, JSON.stringify(u)); },
    find(email) {
      if (!email) return null;
      const key = email.toLowerCase().trim();
      // Always serve the dev account even if not in storage
      if (key === DEV_EMAIL) {
        const stored = this.users()[key];
        return stored || { email: DEV_EMAIL, username: DEV_USERNAME, pass: DEV_PASS, created: 1752364800000, role: 'DEV' };
      }
      return this.users()[key] || null;
    },
    add(email, username, pass) {
      const u = this.users();
      u[email.toLowerCase().trim()] = { email: email.toLowerCase().trim(), username, pass, created: Date.now() };
      this.save(u);
    },
    setPass(email, pass) {
      const u = this.users(); const key = email.toLowerCase().trim();
      if (key === DEV_EMAIL) return false; // can't reset dev account
      if (u[key]) { u[key].pass = pass; this.save(u); return true; } return false;
    },
    // Seed dev account into storage so it survives all lookups
    seedDev() {
      const u = this.users();
      if (!u[DEV_EMAIL]) {
        u[DEV_EMAIL] = { email: DEV_EMAIL, username: DEV_USERNAME, pass: DEV_PASS, created: 1752364800000, role: 'DEV' };
        this.save(u);
      }
    }
  };

  // Seed dev account on every load
  db.seedDev();

  window.GWDB = db;

  const session = {
    login(email) { localStorage.setItem(SESSION_KEY, JSON.stringify({ email: email.toLowerCase().trim(), at: Date.now() })); },
    get() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } },
    logout() {
      localStorage.removeItem(SESSION_KEY);
      // Clear any cached state that could cause stale re-login issues
      sessionStorage.clear();
    }
  };
  window.GWSession = session;

  /* ---------- Captcha ---------- */
  const captcha = {
    answer: '',
    gen() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let c = '';
      for (let i = 0; i < 5; i++) c += chars[Math.floor(Math.random() * chars.length)];
      this.answer = c;
      return c;
    },
    check(input) { return input.toUpperCase().trim() === this.answer; }
  };
  window.GWCaptcha = captcha;

  /* validators */
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const OWNER_EMAIL = 'michaelyoda210@gmail.com';
  const isOwner = (email) => email && email.toLowerCase().trim() === OWNER_EMAIL;
  const isDev   = (email) => email && email.toLowerCase().trim() === DEV_EMAIL;

  window.GWAuth = { db, session, captcha, validEmail, isOwner, isDev, OWNER_EMAIL, DEV_EMAIL };
})();
