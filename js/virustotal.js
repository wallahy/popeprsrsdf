/* ===================== GhostWare — VirusTotal scan module =====================
   Drag a file in; it's uploaded to the VirusTotal API and scanned by 70+ engines.
   Runs entirely client-side using the user's own API key (stored in Settings).

   SECURITY: on a static site the key lives in the browser. Only use a personal
   free key. Free tier ~4 requests/min, 32 MB/file. VT allows browser CORS calls
   (verified) with the x-apikey header.
   ========================================================================== */
(function () {
  const VT = 'https://www.virustotal.com/api/v3';
  const els = {};
  let busy = false;

  function key() { return (localStorage.getItem('gw_vt_key') || '').trim(); }
  function msg(text, kind) { if (els.msg) { els.msg.className = 'msg ' + (kind || ''); els.msg.textContent = text; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  async function sha256(file) {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function scan(file) {
    if (busy) return;
    if (!key()) { msg('No VirusTotal API key set — add one in Settings.', 'err'); return; }
    if (file.size > 32 * 1024 * 1024) { msg('File is larger than 32 MB (free-tier limit).', 'err'); return; }
    busy = true;
    els.result.innerHTML = '';
    try {
      // 1) hash first — if VT already knows the file, skip the upload
      msg('Hashing ' + file.name + ' (' + fmtBytes(file.size) + ')…', '');
      let analysis = null, fileReport = null;
      const hash = await sha256(file);

      const existing = await fetch(VT + '/files/' + hash, { headers: { 'x-apikey': key() } });
      if (existing.ok) {
        fileReport = (await existing.json()).data;
        msg('Found existing VirusTotal report for this file.', 'ok');
      } else if (existing.status === 401) {
        throw new Error('API key rejected (401). Check it in Settings.');
      } else {
        // 2) upload
        msg('Uploading to VirusTotal…', '');
        const fd = new FormData(); fd.append('file', file);
        const up = await fetch(VT + '/files', { method: 'POST', headers: { 'x-apikey': key() }, body: fd });
        if (up.status === 401) throw new Error('API key rejected (401). Check it in Settings.');
        if (up.status === 429) throw new Error('Rate limit hit (free tier ~4/min). Wait a moment.');
        if (!up.ok) throw new Error('Upload failed (' + up.status + ').');
        const id = (await up.json()).data.id;

        // 3) poll the analysis until complete
        msg('Scanning across engines…', '');
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const an = await fetch(VT + '/analyses/' + id, { headers: { 'x-apikey': key() } });
          if (!an.ok) continue;
          const j = (await an.json()).data;
          if (j.attributes.status === 'completed') { analysis = j; break; }
          msg('Scanning… (' + (i + 1) * 3 + 's)', '');
        }
        if (!analysis) throw new Error('Scan timed out — check VirusTotal later with the file hash.');
        // fetch the file object for richer stats/name
        const fr = await fetch(VT + '/files/' + hash, { headers: { 'x-apikey': key() } });
        if (fr.ok) fileReport = (await fr.json()).data;
      }

      render(file, hash, fileReport, analysis);
      const stats = statsOf(fileReport, analysis);
      msg('Done — ' + stats.malicious + ' malicious / ' + stats.total + ' engines.', stats.malicious ? 'err' : 'ok');
      if (window.GWSound) (stats.malicious ? window.GWSound.err() : window.GWSound.ok());
    } catch (e) {
      msg(e.message || 'Scan failed.', 'err');
      if (window.GWSound) window.GWSound.err();
    } finally { busy = false; }
  }

  function statsOf(fileReport, analysis) {
    const s = (fileReport && fileReport.attributes && fileReport.attributes.last_analysis_stats)
      || (analysis && analysis.attributes && analysis.attributes.stats) || {};
    const malicious = s.malicious || 0, suspicious = s.suspicious || 0;
    const harmless = s.harmless || 0, undetected = s.undetected || 0;
    const total = malicious + suspicious + harmless + undetected + (s.timeout || 0) + (s.failure || 0) + (s['type-unsupported'] || 0);
    return { malicious, suspicious, harmless, undetected, total };
  }

  function render(file, hash, fileReport, analysis) {
    const st = statsOf(fileReport, analysis);
    const results = (fileReport && fileReport.attributes && fileReport.attributes.last_analysis_results)
      || (analysis && analysis.attributes && analysis.attributes.results) || {};
    const flagged = Object.entries(results)
      .filter(([, v]) => v.category === 'malicious' || v.category === 'suspicious')
      .map(([eng, v]) => `<span class="chip ${v.category === 'malicious' ? 'off' : 'on'}">${esc(eng)}: ${esc(v.result || v.category)}</span>`)
      .join('');
    const verdict = st.malicious ? 'MALICIOUS' : st.suspicious ? 'SUSPICIOUS' : 'CLEAN';
    const vcls = st.malicious ? 'bad' : st.suspicious ? 'bad' : 'good';
    const ratio = st.total ? Math.round((st.malicious + st.suspicious) / st.total * 100) : 0;

    els.result.innerHTML = `
      <div class="result-panel" style="margin-top:16px;">
        <div class="result-head">
          <div class="avatar">${st.malicious ? '⚠' : '✓'}</div>
          <div><h4>${esc(file.name)}</h4><div class="sub">${fmtBytes(file.size)} · ${esc((file.type || 'unknown type'))}</div></div>
          <div class="status" style="color:${st.malicious || st.suspicious ? '#ff6b6b' : '#7dffa0'}">● ${verdict}</div>
        </div>
        <div class="data-grid">
          <div class="data-row"><span class="k">Detection</span><span class="v ${vcls}">${st.malicious + st.suspicious} / ${st.total} (${ratio}%)</span></div>
          <div class="data-row"><span class="k">Malicious</span><span class="v ${st.malicious ? 'bad' : 'good'}">${st.malicious}</span></div>
          <div class="data-row"><span class="k">Suspicious</span><span class="v ${st.suspicious ? 'bad' : 'good'}">${st.suspicious}</span></div>
          <div class="data-row"><span class="k">Harmless</span><span class="v good">${st.harmless}</span></div>
          <div class="data-row"><span class="k">Undetected</span><span class="v">${st.undetected}</span></div>
          <div class="data-row"><span class="k">SHA-256</span><span class="v" style="font-size:11px;">${esc(hash)}</span></div>
        </div>
        ${flagged ? `<div style="padding:14px 20px 4px;font-size:10.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--txt-faint)">Flagged by</div><div class="chip-row">${flagged}</div>` : ''}
        <div style="padding:12px 20px;"><a href="https://www.virustotal.com/gui/file/${esc(hash)}" target="_blank" rel="noopener" style="color:var(--txt-dim);font-size:12px;">Open full report on VirusTotal ↗</a></div>
      </div>`;
  }

  function initVT() {
    if (els.init) return;
    els.drop = document.getElementById('vtDrop');
    els.file = document.getElementById('vtFile');
    els.browse = document.getElementById('vtBrowse');
    els.msg = document.getElementById('vt-msg');
    els.result = document.getElementById('vtResult');
    els.note = document.getElementById('vtKeyNote');
    if (!els.drop) return;
    els.init = true;

    els.browse.addEventListener('click', () => els.file.click());
    els.drop.addEventListener('click', (e) => { if (e.target === els.browse) return; els.file.click(); });
    els.file.addEventListener('change', () => { const f = els.file.files[0]; els.file.value = ''; if (f) scan(f); });

    ['dragenter', 'dragover'].forEach(ev => els.drop.addEventListener(ev, (e) => { e.preventDefault(); els.drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => els.drop.addEventListener(ev, (e) => { e.preventDefault(); els.drop.classList.remove('over'); }));
    els.drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) scan(f); });

    if (els.note) els.note.style.display = key() ? 'none' : '';
  }

  window.GWVirusTotal = { init: initVT, hasKey: () => !!key() };
})();
