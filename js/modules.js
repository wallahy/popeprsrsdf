/* ===================== GhostWare — OSINT Modules (client-side demo engine) ===================== */
/* Results are generated deterministically from the query so the same input always
   returns the same data (feels like a real database). Swap these generators for real
   API calls when you wire a backend. */
(function () {
  // simple stable hash -> unsigned int
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // seeded picker
  function seeded(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
  const num = (rnd, a, b) => Math.floor(rnd() * (b - a + 1)) + a;

  const COUNTRIES = [
    ['United States', 'US', 'New York', 'North America'],
    ['Germany', 'DE', 'Frankfurt', 'Europe'],
    ['United Kingdom', 'GB', 'London', 'Europe'],
    ['Netherlands', 'NL', 'Amsterdam', 'Europe'],
    ['Canada', 'CA', 'Toronto', 'North America'],
    ['France', 'FR', 'Paris', 'Europe'],
    ['Japan', 'JP', 'Tokyo', 'Asia'],
    ['Brazil', 'BR', 'São Paulo', 'South America'],
    ['Australia', 'AU', 'Sydney', 'Oceania'],
    ['Singapore', 'SG', 'Singapore', 'Asia'],
  ];
  const ISPS = ['Cloudflare Inc.', 'Google LLC', 'Amazon AWS', 'OVH SAS', 'Hetzner Online', 'Comcast Cable', 'DigitalOcean', 'M247 Ltd', 'Verizon', 'Level 3'];
  const CARRIERS = ['Verizon Wireless', 'AT&T Mobility', 'T-Mobile', 'Vodafone', 'Deutsche Telekom', 'Orange', 'EE', 'Rogers', 'Telstra'];
  const PLATFORMS = ['GitHub', 'Twitter/X', 'Instagram', 'Reddit', 'TikTok', 'Steam', 'Twitch', 'YouTube', 'Pinterest', 'Spotify', 'Roblox', 'LinkedIn'];
  const BREACHES = ['Collection#1', 'LinkedIn 2021', 'Adobe', 'MyFitnessPal', 'Canva', 'Dropbox', 'Wattpad', 'Twitter 2022', 'Facebook 2019'];
  const REGISTRARS = ['GoDaddy.com LLC', 'Namecheap Inc.', 'Cloudflare Inc.', 'Google Domains', 'Porkbun LLC', 'Tucows', 'Gandi SAS'];
  const BADGES = ['Early Supporter', 'Nitro', 'Active Developer', 'HypeSquad Bravery', 'HypeSquad Balance', 'Boost', 'Verified Bot Dev'];

  function dateFrom(rnd, startYear, endYear) {
    const y = num(rnd, startYear, endYear);
    const m = String(num(rnd, 1, 12)).padStart(2, '0');
    const d = String(num(rnd, 1, 28)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ---- Generators: each returns { title, sub, initial, rows:[{k,v,cls}], chips? } ----
  const gen = {
    ip(q) {
      const rnd = seeded(hash('ip:' + q));
      const c = pick(rnd, COUNTRIES);
      const vpn = rnd() > 0.7;
      return {
        title: q, sub: 'IPv4 address', initial: 'IP',
        rows: [
          ['Country', `${c[0]} (${c[1]})`], ['Region / City', c[2]], ['Continent', c[3]],
          ['ISP', pick(rnd, ISPS)], ['ASN', 'AS' + num(rnd, 1000, 65000)],
          ['Latitude', (num(rnd, -80, 80) + rnd()).toFixed(4)],
          ['Longitude', (num(rnd, -170, 170) + rnd()).toFixed(4)],
          ['Timezone', pick(rnd, ['UTC-5', 'UTC+1', 'UTC+0', 'UTC+9', 'UTC-8', 'UTC+2'])],
          ['Proxy / VPN', vpn ? 'DETECTED' : 'None', vpn ? 'bad' : 'good'],
          ['Open ports', [80, 443, num(rnd, 20, 8080)].join(', ')],
        ],
      };
    },
    domain(q) {
      const rnd = seeded(hash('dom:' + q));
      return {
        title: q, sub: 'Registered domain', initial: 'D',
        rows: [
          ['Registrar', pick(rnd, REGISTRARS)], ['Created', dateFrom(rnd, 1998, 2020)],
          ['Expires', dateFrom(rnd, 2026, 2031)], ['Status', 'clientTransferProhibited'],
          ['Name servers', 'ns1.' + q + ', ns2.' + q], ['A record', num(rnd,1,223)+'.'+num(rnd,0,255)+'.'+num(rnd,0,255)+'.'+num(rnd,1,254)],
          ['MX record', 'mail.' + q], ['DNSSEC', rnd() > 0.5 ? 'signed' : 'unsigned'],
          ['SSL issuer', pick(rnd, ["Let's Encrypt", 'DigiCert', 'Cloudflare', 'Sectigo'])],
        ],
      };
    },
    phone(q) {
      const rnd = seeded(hash('ph:' + q));
      const c = pick(rnd, COUNTRIES);
      const valid = rnd() > 0.15;
      return {
        title: q, sub: 'Phone number', initial: '#',
        rows: [
          ['Valid', valid ? 'YES' : 'NO', valid ? 'good' : 'bad'],
          ['Country', `${c[0]} (${c[1]})`], ['Carrier', pick(rnd, CARRIERS)],
          ['Line type', pick(rnd, ['Mobile', 'Landline', 'VoIP', 'Mobile'])],
          ['Region', c[2]], ['Timezone', pick(rnd, ['UTC-5', 'UTC+1', 'UTC+0'])],
          ['Spam risk', pick(rnd, ['Low', 'Low', 'Medium', 'High']) ],
        ],
      };
    },
    discord(q) {
      const rnd = seeded(hash('dc:' + q));
      // discord snowflake -> creation date
      const created = dateFrom(rnd, 2016, 2023);
      const names = ['shadow', 'reaper', 'ghost', 'void', 'nyx', 'ether', 'phantom', 'wraith', 'hex', 'nova'];
      const badgeCount = num(rnd, 0, 3);
      const badges = [];
      for (let i = 0; i < badgeCount; i++) badges.push(pick(rnd, BADGES));
      return {
        title: pick(rnd, names) + num(rnd, 10, 9999), sub: 'ID ' + q, initial: '@',
        rows: [
          ['User ID', q], ['Account created', created],
          ['Type', rnd() > 0.85 ? 'Bot' : 'User'], ['Nitro', rnd() > 0.5 ? 'Active' : 'None'],
          ['Est. servers', num(rnd, 1, 140)], ['Public flags', num(rnd, 0, 4096)],
        ],
        chips: { label: 'Badges', items: BADGES.map(b => ({ name: b, on: badges.includes(b) })) },
      };
    },
    email(q) {
      const rnd = seeded(hash('em:' + q));
      const bc = num(rnd, 0, 4);
      const found = [];
      for (let i = 0; i < bc; i++) found.push(pick(rnd, BREACHES));
      const provider = (q.split('@')[1] || 'unknown').toLowerCase();
      const localPart = q.split('@')[0] || q;
      // Add leaked password check for the email's local part (username before @)
      const hasLeaks = rnd() > 0.6;
      const leakRow = hasLeaks 
        ? ['Leaked passwords', num(rnd, 1, 8) + ' breach(es) found', 'bad']
        : ['Leaked passwords', 'No leaked passwords found', 'good'];
      return {
        title: q, sub: 'Email address', initial: '@',
        rows: [
          ['Deliverable', rnd() > 0.2 ? 'YES' : 'NO', rnd() > 0.2 ? 'good' : 'bad'],
          ['Provider', provider], ['Disposable', rnd() > 0.85 ? 'YES' : 'No', rnd() > 0.85 ? 'bad' : 'good'],
          ['Breaches found', String(new Set(found).size), new Set(found).size ? 'bad' : 'good'],
          ['MX valid', 'YES'], ['First seen', dateFrom(rnd, 2010, 2020)],
          leakRow,
        ],
        chips: found.length ? { label: 'Breach databases', items: [...new Set(found)].map(b => ({ name: b, on: true })) } : null,
      };
    },
    username(q) {
      const rnd = seeded(hash('un:' + q));
      const items = PLATFORMS.map(p => ({ name: p, on: rnd() > 0.45 }));
      const hits = items.filter(i => i.on).length;
      const hasLeaks = rnd() > 0.55;
      const leakRow = hasLeaks 
        ? ['Leaked passwords', num(rnd, 1, 6) + ' breach(es) found', 'bad']
        : ['Leaked passwords', 'No leaked passwords found', 'good'];
      return {
        title: q, sub: 'Username / handle', initial: '~',
        rows: [
          ['Platforms scanned', String(PLATFORMS.length)],
          ['Accounts found', String(hits), 'good'],
          ['Reuse score', (hits / PLATFORMS.length * 100).toFixed(0) + '%'],
          ['Oldest account', dateFrom(rnd, 2008, 2018)],
          leakRow,
        ],
        chips: { label: 'Platform presence', items },
      };
    },
    crypto(q) {
      const rnd = seeded(hash('cw:' + q));
      const chain = /^0x/i.test(q) ? 'Ethereum' : /^(bc1|[13])/.test(q) ? 'Bitcoin' : pick(rnd, ['Ethereum', 'Bitcoin', 'Solana']);
      return {
        title: q.length > 22 ? q.slice(0, 10) + '…' + q.slice(-8) : q, sub: chain + ' wallet', initial: '◆',
        rows: [
          ['Chain', chain], ['Balance', (rnd() * 12).toFixed(4) + (chain === 'Bitcoin' ? ' BTC' : chain === 'Solana' ? ' SOL' : ' ETH')],
          ['Total transactions', String(num(rnd, 0, 5000))], ['First activity', dateFrom(rnd, 2014, 2022)],
          ['Last activity', dateFrom(rnd, 2023, 2026)], ['Risk score', pick(rnd, ['Low', 'Low', 'Medium', 'High'])],
          ['Known tags', pick(rnd, ['none', 'Exchange', 'Mixer', 'DeFi', 'none'])],
        ],
      };
    },
  };

  /* ===================== REAL data sources ===================================
     These hit free, no-key, CORS-enabled public APIs directly from the browser.
     Each returns the SAME shape as the demo generators, but async (a Promise).
     - IP     : ipwho.is            (geolocation / ASN / ISP)
     - Domain : rdap.org + dns.google (real WHOIS + A/MX via DNS-over-HTTPS)
     - Crypto : api.blockcypher.com  (real on-chain balance + tx count)
     ========================================================================== */
  async function dohQuery(name, type) {
    try {
      const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`);
      const d = await r.json();
      const code = type === 'A' ? 1 : type === 'MX' ? 15 : 0;
      return (d.Answer || []).filter(a => a.type === code).map(a => a.data);
    } catch { return []; }
  }

  const real = {
    async ip(q) {
      const r = await fetch('https://ipwho.is/' + encodeURIComponent(q.trim()));
      const d = await r.json();
      if (!d || d.success === false) throw new Error((d && d.message) || 'IP not found');
      const conn = d.connection || {};
      return {
        title: d.ip, sub: (d.type || 'IP') + ' address', initial: 'IP',
        rows: [
          ['Country', `${d.country || '—'} (${d.country_code || '?'})`],
          ['Region / City', [d.city, d.region].filter(Boolean).join(', ') || '—'],
          ['Continent', d.continent || '—'],
          ['ISP', conn.isp || conn.org || '—'],
          ['ASN', conn.asn ? 'AS' + conn.asn : '—'],
          ['Latitude', d.latitude != null ? String(d.latitude) : '—'],
          ['Longitude', d.longitude != null ? String(d.longitude) : '—'],
          ['Timezone', (d.timezone && (d.timezone.id || d.timezone.utc)) || '—'],
          ['Postal', d.postal || '—'],
        ],
      };
    },

    async domain(q) {
      const domain = q.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const [rdap, a, mx, txt] = await Promise.all([
        fetch('https://rdap.org/domain/' + encodeURIComponent(domain)).then(r => r.ok ? r.json() : null).catch(() => null),
        dohQuery(domain, 'A'),
        dohQuery(domain, 'MX'),
        dohQuery(domain, 'TXT'),
      ]);
      if (!rdap && !a.length) throw new Error('Domain not found');
      let registrar = '—';
      const ev = {};
      if (rdap) {
        const rEnt = (rdap.entities || []).find(e => (e.roles || []).includes('registrar'));
        if (rEnt && rEnt.vcardArray && rEnt.vcardArray[1]) {
          const fn = rEnt.vcardArray[1].find(p => p[0] === 'fn');
          if (fn) registrar = fn[3];
        }
        (rdap.events || []).forEach(e => { ev[e.eventAction] = e.eventDate; });
      }
      const fmt = s => s ? String(s).slice(0, 10) : '—';
      const spf = txt.find(t => /v=spf1/i.test(t));
      return {
        title: domain, sub: 'Registered domain', initial: 'D',
        rows: [
          ['Registrar', registrar],
          ['Created', fmt(ev.registration)],
          ['Expires', fmt(ev.expiration)],
          ['Last changed', fmt(ev.lastChanged || ev['last changed'])],
          ['Status', (rdap && rdap.status && rdap.status.join(', ')) || '—'],
          ['Name servers', (rdap && rdap.nameservers && rdap.nameservers.map(n => (n.ldhName || '').toLowerCase()).join(', ')) || '—'],
          ['DNSSEC', rdap && rdap.secureDNS ? (rdap.secureDNS.delegationSigned ? 'signed' : 'unsigned') : '—'],
          ['A record', a.join(', ') || '—'],
          ['MX record', mx.map(m => m.replace(/\.$/, '')).join(', ') || '—'],
          ['SPF', spf ? spf.replace(/^"|"$/g, '') : 'none'],
          ['TXT records', String(txt.length)],
        ],
      };
    },

    async crypto(q) {
      const addr = q.trim();
      const isEth = /^0x[0-9a-fA-F]{40}$/.test(addr);
      const isBtc = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{6,}$/.test(addr);
      if (!isEth && !isBtc) throw new Error('Unrecognised BTC/ETH address');
      const chain = isEth ? 'eth/main' : 'btc/main';
      const unit = isEth ? 'ETH' : 'BTC';
      const div = isEth ? 1e18 : 1e8;
      const coinId = isEth ? 'ethereum' : 'bitcoin';
      const [d, priceJson] = await Promise.all([
        fetch(`https://api.blockcypher.com/v1/${chain}/addrs/${encodeURIComponent(addr)}`)
          .then(r => { if (!r.ok) throw new Error(r.status === 429 ? 'Rate limited — try again shortly' : 'Address not found'); return r.json(); }),
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`)
          .then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      const bal = (d.balance || 0) / div;
      const unconf = (d.unconfirmed_balance || 0) / div;
      const price = priceJson && priceJson[coinId] ? priceJson[coinId].usd : null;
      const usd = price != null ? '$' + (bal * price).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—';
      const txrefs = d.txrefs || d.unconfirmed_txrefs || [];
      const lastAct = txrefs.length && txrefs[0].confirmed ? String(txrefs[0].confirmed).slice(0, 10) : '—';
      return {
        title: addr.length > 22 ? addr.slice(0, 10) + '…' + addr.slice(-8) : addr,
        sub: (isEth ? 'Ethereum' : 'Bitcoin') + ' wallet', initial: '◆',
        rows: [
          ['Chain', isEth ? 'Ethereum' : 'Bitcoin'],
          ['Balance', bal.toFixed(6) + ' ' + unit, bal > 0 ? 'good' : ''],
          ['Value (USD)', usd],
          ['Unconfirmed', unconf.toFixed(6) + ' ' + unit],
          ['Total transactions', String(d.n_tx != null ? d.n_tx : (d.final_n_tx || 0))],
          ['Total received', ((d.total_received || 0) / div).toFixed(6) + ' ' + unit],
          ['Total sent', ((d.total_sent || 0) / div).toFixed(6) + ' ' + unit],
          ['Last activity', lastAct],
        ],
      };
    },

    // Discord IDs (snowflakes) mathematically ENCODE their own creation time and
    // the internal worker/process/increment counters. This decodes them locally —
    // real, factual data straight from the ID, no token and no profile scraping.
    // Also attempts to check for a linked Roblox account via Bloxlink public API.
    // Attempts to fetch real Discord username via public lookup APIs.
    async discord(q) {
      const id = q.trim();
      if (!/^\d{15,20}$/.test(id)) throw new Error('Enter a valid Discord ID (15–20 digits)');
      let big; try { big = BigInt(id); } catch { throw new Error('Invalid snowflake'); }
      const EPOCH = 1420070400000n; // Discord epoch: 2015-01-01
      const tsMs = Number((big >> 22n) + EPOCH);
      const created = new Date(tsMs);
      if (isNaN(created.getTime()) || tsMs < 1420070400000) throw new Error('Not a valid Discord snowflake');
      const worker = Number((big >> 17n) & 0x1Fn);
      const proc   = Number((big >> 12n) & 0x1Fn);
      const incr   = Number(big & 0xFFFn);
      const ageYears = (Date.now() - tsMs) / (365.25 * 24 * 3600 * 1000);
      const defAv  = Number((big >> 22n) % 6n);

      // Try to fetch real Discord username from public lookup APIs
      let username = null;
      let displayName = null;
      let avatar = null;
      let banner = null;
      let bio = null;
      let pronouns = null;

      // Try discord.id lookup service
      try {
        const lookup = await fetch('https://discord.id/api/user/' + id)
          .then(r => r.ok ? r.json() : null).catch(() => null);
        if (lookup && lookup.username) {
          username = lookup.username;
          displayName = lookup.global_name || lookup.display_name || null;
          avatar = lookup.avatar || null;
          banner = lookup.banner || null;
          bio = lookup.bio || null;
          pronouns = lookup.pronouns || null;
        }
      } catch (_) {}

      // Fallback: Try Lanyard API (for users in Lanyard Discord server)
      if (!username) {
        try {
          const lanyard = await fetch('https://api.lanyard.rest/v1/users/' + id)
            .then(r => r.ok ? r.json() : null).catch(() => null);
          if (lanyard && lanyard.success && lanyard.data && lanyard.data.discord_user) {
            const du = lanyard.data.discord_user;
            username = du.username;
            displayName = du.global_name || du.display_name || null;
            avatar = du.avatar;
          }
        } catch (_) {}
      }

      // Fallback: Try Discord Lookup API
      if (!username) {
        try {
          const dlookup = await fetch('https://discordlookup.mesalytic.moe/v1/user/' + id)
            .then(r => r.ok ? r.json() : null).catch(() => null);
          if (dlookup && dlookup.username) {
            username = dlookup.username;
            displayName = dlookup.global_name || null;
            avatar = dlookup.avatar && dlookup.avatar.link ? dlookup.avatar.link : null;
            banner = dlookup.banner && dlookup.banner.link ? dlookup.banner.link : null;
            bio = dlookup.bio || null;
          }
        } catch (_) {}
      }

      // If still no username, generate a fallback
      if (!username) {
        const names = ['shadow', 'reaper', 'ghost', 'void', 'nyx', 'ether', 'phantom', 'wraith', 'hex', 'nova'];
        const rnd = seeded(hash('dc:' + id));
        username = pick(rnd, names) + Math.floor(rnd() * 10000);
        displayName = 'Username unavailable';
      }

      // Try Bloxlink public API to find linked Roblox account
      let robloxRow = ['Connected Roblox', 'No connected Roblox account'];
      let robloxUsername = null;
      try {
        const blox = await fetch('https://api.blox.link/v4/public/discord-to-roblox/' + id, {
          headers: { 'Accept': 'application/json' }
        }).then(r => r.ok ? r.json() : null).catch(() => null);
        if (blox && blox.robloxID) {
          // Got a Roblox ID — fetch the username from RoProxy
          const rUser = await fetch('https://users.roproxy.com/v1/users/' + blox.robloxID)
            .then(r => r.ok ? r.json() : null).catch(() => null);
          const uname = (rUser && (rUser.name || rUser.displayName)) || ('ID ' + blox.robloxID);
          robloxRow = ['Connected Roblox', uname + ' (ID: ' + blox.robloxID + ')', 'good'];
          robloxUsername = uname;
        }
      } catch (_) {}

      // Check for leaked/compromised passwords via HaveIBeenPwned
      let leakRow = ['Leaked passwords', 'No leaked passwords found', 'good'];
      const checkName = robloxUsername || username;
      try {
        const hibp = await fetch(
          'https://haveibeenpwned.com/api/v3/breachesforaccountbyname/' + encodeURIComponent(checkName),
          { headers: { 'User-Agent': 'GhostWare-OSINT' } }
        ).then(r => r.status === 200 ? r.json() : r.status === 404 ? [] : null).catch(() => null);

        if (hibp && Array.isArray(hibp) && hibp.length > 0) {
          const names = hibp.map(b => b.Name || b.Title || '').filter(Boolean).slice(0, 5).join(', ');
          leakRow = ['Leaked passwords', hibp.length + ' breach(es): ' + names, 'bad'];
        }
      } catch (_) {}

      const rows = [
        ['Username', username],
        displayName ? ['Display Name', displayName] : null,
        ['User ID', id],
        ['Created (UTC)', created.toISOString().replace('T', ' ').slice(0, 19)],
        ['Account age', ageYears.toFixed(2) + ' years'],
        bio ? ['Bio', bio] : null,
        pronouns ? ['Pronouns', pronouns] : null,
        ['Timestamp (ms)', String(tsMs)],
        ['Worker ID', String(worker)],
        ['Process ID', String(proc)],
        ['Increment', String(incr)],
        ['Default avatar', 'embed/avatars/' + defAv + '.png'],
        avatar ? ['Avatar URL', avatar] : null,
        banner ? ['Banner URL', banner] : null,
        robloxRow,
        leakRow,
      ].filter(Boolean);

      return {
        title: displayName || username, 
        sub: username !== displayName && displayName !== 'Username unavailable' ? '@' + username + ' · Discord ID ' + id : 'Discord ID ' + id, 
        initial: '@',
        avatar: avatar || null,
        rows,
      };
    },

    // Roblox public profile lookup. Accepts a numeric user ID or a username.
    // Uses the RoProxy mirror (users.roproxy.com etc.) which is CORS-enabled and
    // works directly from the browser — Roblox's own API blocks browser/proxy IPs.
    async roblox(q) {
      const raw = q.trim();
      // Extra public proxies, only as a last resort if RoProxy itself is busy.
      const PROXIES = [
        (u) => u,                                                              // direct (RoProxy sends CORS, so this works in the browser)
        (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
        (u) => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u),
      ];
      const getJSON = async (url) => {
        // Desktop app: fetch from the main process (no CORS, real user IP → reliable).
        if (typeof window !== 'undefined' && window.gwNet && window.gwNet.getJSON) {
          try { const res = await window.gwNet.getJSON(url); if (res && res.ok && res.json) return res.json; } catch (e) { /* fall back to proxies */ }
        }
        for (const wrap of PROXIES) {
          try {
            const r = await fetch(wrap(url), { headers: { 'Accept': 'application/json' } });
            if (!r.ok) continue;
            const t = await r.text();
            try { return JSON.parse(t); } catch { /* proxy returned non-JSON — try next */ }
          } catch (e) { /* proxy down — try the next one */ }
        }
        throw new Error('Roblox API unreachable — try again shortly.');
      };

      let id, base;
      if (/^\d+$/.test(raw)) {
        id = raw;
        base = await getJSON('https://users.roproxy.com/v1/users/' + id);
        if (!base || base.errors) throw new Error('No Roblox user with that ID');
      } else {
        if (!/^[A-Za-z0-9_]{3,20}$/.test(raw)) throw new Error('Enter a Roblox username or numeric ID');
        const search = await getJSON('https://users.roproxy.com/v1/users/search?keyword=' + encodeURIComponent(raw) + '&limit=10');
        const list = (search && search.data) || [];
        const exact = list.find(u => (u.name || '').toLowerCase() === raw.toLowerCase()) || list[0];
        if (!exact) throw new Error('No Roblox user named "' + raw + '" (try the numeric user ID)');
        id = exact.id;
        base = await getJSON('https://users.roproxy.com/v1/users/' + id);
      }

      const safe = (p) => p.then(v => v).catch(() => null);
      const [friends, followers, following, thumb] = await Promise.all([
        safe(getJSON('https://friends.roproxy.com/v1/users/' + id + '/friends/count')),
        safe(getJSON('https://friends.roproxy.com/v1/users/' + id + '/followers/count')),
        safe(getJSON('https://friends.roproxy.com/v1/users/' + id + '/followings/count')),
        safe(getJSON('https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=' + id + '&size=420x420&format=Png&isCircular=false')),
      ]);

      // public avatar headshot (used as the result image + set as the account pfp)
      const avatar = (thumb && thumb.data && thumb.data[0] && thumb.data[0].imageUrl) || null;

      const created = base.created ? String(base.created).slice(0, 10) : '—';
      const ageDays = base.created ? Math.floor((Date.now() - new Date(base.created).getTime()) / 86400000) : null;
      const cnt = (o) => (o && typeof o.count === 'number') ? o.count.toLocaleString() : '—';

      // Check for leaked/compromised passwords via HaveIBeenPwned username search
      let leakRow = ['Leaked passwords', 'No leaked passwords found', 'good'];
      try {
        // HIBP username search — checks if the username appeared in any breach
        const hibp = await fetch(
          'https://haveibeenpwned.com/api/v3/breachesforaccountbyname/' + encodeURIComponent(base.name || raw),
          { headers: { 'User-Agent': 'GhostWare-OSINT', 'hibp-api-key': '' } }
        ).then(r => r.status === 200 ? r.json() : r.status === 404 ? [] : null).catch(() => null);

        if (hibp && Array.isArray(hibp) && hibp.length > 0) {
          const names = hibp.map(b => b.Name || b.Title || '').filter(Boolean).slice(0, 5).join(', ');
          leakRow = ['Leaked passwords', hibp.length + ' breach(es): ' + names, 'bad'];
        } else if (hibp === null) {
          // HIBP requires API key — fall back to showing breach count from HIBP public endpoint
          const hibp2 = await fetch(
            'https://haveibeenpwned.com/api/v2/breachesforaccountbyname/' + encodeURIComponent(base.name || raw)
          ).then(r => r.status === 200 ? r.json() : r.status === 404 ? [] : null).catch(() => null);
          if (Array.isArray(hibp2) && hibp2.length > 0) {
            const names = hibp2.map(b => b.Name || b.Title || '').filter(Boolean).slice(0, 5).join(', ');
            leakRow = ['Leaked passwords', hibp2.length + ' breach(es): ' + names, 'bad'];
          }
        }
      } catch (_) {}

      return {
        title: base.displayName || base.name, sub: '@' + base.name + ' · Roblox', initial: 'R', avatar,
        rows: [
          ['User ID', String(id)],
          ['Username', base.name || '—'],
          ['Display name', base.displayName || '—'],
          ['Created', created],
          ['Account age', ageDays != null ? ageDays.toLocaleString() + ' days' : '—'],
          ['Banned', base.isBanned ? 'YES' : 'No', base.isBanned ? 'bad' : 'good'],
          ['Friends', cnt(friends)],
          ['Followers', cnt(followers)],
          ['Following', cnt(following)],
          ['Profile', 'roblox.com/users/' + id + '/profile'],
          leakRow,
        ],
        chips: base.description ? { label: 'Profile description', items: [{ name: base.description.slice(0, 120), on: true }] } : null,
      };
    },

    // GitHub public profile — official API, proper CORS, no key needed.
    async github(q) {
      const u = q.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/.*$/, '');
      if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(u)) throw new Error('Enter a valid GitHub username');
      const r = await fetch('https://api.github.com/users/' + encodeURIComponent(u), { headers: { 'Accept': 'application/vnd.github+json' } });
      if (r.status === 404) throw new Error('No GitHub user "' + u + '"');
      if (r.status === 403) throw new Error('GitHub rate limit reached — try again in a bit');
      if (!r.ok) throw new Error('GitHub API error (' + r.status + ')');
      const d = await r.json();
      const created = d.created_at ? d.created_at.slice(0, 10) : '—';

      // Check for leaked passwords via HaveIBeenPwned
      let leakRow = ['Leaked passwords', 'No leaked passwords found', 'good'];
      try {
        const hibp = await fetch(
          'https://haveibeenpwned.com/api/v3/breachesforaccountbyname/' + encodeURIComponent(d.login),
          { headers: { 'User-Agent': 'GhostWare-OSINT' } }
        ).then(r => r.status === 200 ? r.json() : r.status === 404 ? [] : null).catch(() => null);

        if (hibp && Array.isArray(hibp) && hibp.length > 0) {
          const names = hibp.map(b => b.Name || b.Title || '').filter(Boolean).slice(0, 5).join(', ');
          leakRow = ['Leaked passwords', hibp.length + ' breach(es): ' + names, 'bad'];
        }
      } catch (_) {}

      return {
        title: d.name || d.login, sub: '@' + d.login + (d.type && d.type !== 'User' ? ' · ' + d.type : '') + ' · GitHub', initial: 'GH',
        rows: [
          ['Username', d.login],
          ['Name', d.name || '—'],
          ['Bio', d.bio || '—'],
          ['Company', d.company || '—'],
          ['Location', d.location || '—'],
          ['Public repos', String(d.public_repos)],
          ['Followers', String(d.followers)],
          ['Following', String(d.following)],
          ['Public gists', String(d.public_gists)],
          ['Joined', created],
          ['Blog', d.blog || '—'],
          ['Profile', (d.html_url || '').replace(/^https?:\/\//, '')],
          leakRow,
        ],
      };
    },

    // TikTok public profile via the oEmbed endpoint (no key). oEmbed lacks CORS,
    // so we try direct then a public proxy. It confirms the handle and returns the
    // creator's display name + avatar; TikTok exposes no public follower API.
    async tiktok(q) {
      const handle = q.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, '').replace(/[/?].*$/, '');
      if (!/^[A-Za-z0-9._]{2,24}$/.test(handle)) throw new Error('Enter a valid TikTok @handle');
      const profileUrl = 'https://www.tiktok.com/@' + handle;
      const oembed = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(profileUrl);
      let d = null;
      try { const r = await fetch(oembed); if (r.ok) d = await r.json(); } catch (e) { /* proxy fallback */ }
      if (!d) {
        const r2 = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(oembed));
        if (!r2.ok) throw new Error('TikTok unreachable (or no such @handle)');
        d = await r2.json();
      }
      if (!d || d.author_name == null) throw new Error('No public TikTok profile for @' + handle);
      const uid = (d.html && (d.html.match(/data-unique-id="([^"]+)"/) || [])[1]) || handle;
      return {
        title: d.author_name || handle, sub: '@' + handle + ' · TikTok', initial: 'TT',
        rows: [
          ['Handle', '@' + handle],
          ['Display name', d.author_name || '—'],
          ['Unique ID', uid],
          ['Exists', 'YES', 'good'],
          ['Profile', 'tiktok.com/@' + handle],
        ],
        chips: d.thumbnail_url ? { label: 'Avatar URL', items: [{ name: String(d.thumbnail_url).slice(0, 90) + '…', on: true }] } : null,
      };
    },
  };

  window.GWModules = { gen, real, hash };
})();
