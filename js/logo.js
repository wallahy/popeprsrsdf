/* ===================== GhostWare — Reaper logo (inline, no fetch) ===================== */
/* Monochrome grim-reaper mark — hooded skull + scythe, tuned to the B/W theme. */
window.GW_REAPER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <defs>
    <linearGradient id="gwCloak" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f4f4"/>
      <stop offset="0.5" stop-color="#bdbdbd"/>
      <stop offset="1" stop-color="#6f6f6f"/>
    </linearGradient>
    <linearGradient id="gwSkull" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#c7c7c7"/>
    </linearGradient>
    <linearGradient id="gwBlade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </linearGradient>
    <radialGradient id="gwEye" cx="0.5" cy="0.4" r="0.7">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#e8e8e8"/>
      <stop offset="1" stop-color="#9a9a9a"/>
    </radialGradient>
  </defs>

  <!-- Scythe handle -->
  <path d="M97 16 L60 118" stroke="#3a3a3a" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M97 16 L60 118" stroke="#7c7c7c" stroke-width="2.4" stroke-linecap="round"/>
  <!-- Scythe blade -->
  <path d="M97 16 C74 14 50 24 36 46 C58 40 82 34 100 22 Z" fill="url(#gwBlade)" stroke="#e9e9e9" stroke-width="1.2"/>
  <path d="M97 16 C80 16 60 24 46 40" stroke="#ffffff" stroke-width="1.6" fill="none" opacity="0.8"/>

  <!-- Hooded cloak -->
  <path d="M31 60 C31 33 45 18 64 18 C83 18 97 33 97 60
           C97 70 93 79 87 87
           C83 78 77 73 70 74
           C67 68 61 68 58 74
           C51 73 45 78 41 87
           C35 79 31 70 31 60 Z" fill="url(#gwCloak)"/>
  <!-- Hood inner shadow -->
  <path d="M40 58 C40 39 50 27 64 27 C78 27 88 39 88 58
           C88 67 84 76 78 83
           C74 76 70 73 64 73
           C58 73 54 76 50 83
           C44 76 40 67 40 58 Z" fill="#101010"/>

  <!-- Skull face -->
  <path d="M50 55 C50 44 56 37 64 37 C72 37 78 44 78 55
           C78 63 74 70 68 76 L60 76 C54 70 50 63 50 55 Z" fill="url(#gwSkull)"/>
  <!-- Eye sockets -->
  <ellipse cx="57.5" cy="55" rx="5.2" ry="6.6" fill="#0a0a0a"/>
  <ellipse cx="70.5" cy="55" rx="5.2" ry="6.6" fill="#0a0a0a"/>
  <!-- Glowing pupils -->
  <circle cx="57.5" cy="55" r="2.4" fill="url(#gwEye)"/>
  <circle cx="70.5" cy="55" r="2.4" fill="url(#gwEye)"/>
  <!-- Nasal cavity -->
  <path d="M64 61 l-3.2 6 h6.4 Z" fill="#0a0a0a"/>
  <!-- Teeth line -->
  <path d="M56 74 h16" stroke="#0a0a0a" stroke-width="1.4"/>
  <path d="M60 71 v6 M64 71 v6 M68 71 v6" stroke="#9a9a9a" stroke-width="1"/>

  <!-- Cloak lower body -->
  <path d="M30 82 C40 98 50 106 64 111 C78 106 88 98 98 82
           C102 96 103 110 100 122 C78 129 50 129 28 122
           C25 110 26 96 30 82 Z" fill="url(#gwCloak)"/>
  <path d="M64 100 v22" stroke="#4a4a4a" stroke-width="2"/>
  <path d="M50 98 l-5 22 M78 98 l5 22" stroke="#5a5a5a" stroke-width="1.4"/>
</svg>`;

window.GWInjectLogos = function () {
  document.querySelectorAll('[data-reaper]').forEach(el => { el.innerHTML = window.GW_REAPER_SVG; });
};
document.addEventListener('DOMContentLoaded', window.GWInjectLogos);
