# GhostWare Website

A clean, static website for GhostWare — advanced OSINT platform.

## Hosting on GitHub Pages

### Method 1 — GitHub Pages (simplest)

1. Push this entire `website/` folder to a GitHub repo
2. Go to **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: `main`, Folder: `/ (root)`
5. Save — your site will be live at `https://yourusername.github.io/repo-name`

### Method 2 — Deploy from root

If you want the site at the repo root instead:
1. Copy everything inside `website/` to your repo root
2. Enable GitHub Pages on the `main` branch `/root`

### File structure

```
website/
├── index.html          ← Main landing page (Home + OSINT Tools + Updates)
├── auth.html           ← Login / signup page
├── dashboard.html      ← Dashboard (requires login)
├── _redirects          ← Netlify/Cloudflare redirect rules
├── _headers            ← Security headers
├── assets/
│   ├── reaper.svg      ← GhostWare logo
│   └── global-network.png
├── css/
│   └── style.css       ← Shared styles
└── js/
    ├── logo.js         ← Reaper SVG injector
    ├── effects.js      ← Mouse glow + sound engine
    ├── modules.js      ← OSINT lookup engines (real APIs)
    ├── auth.js         ← Login/signup logic
    ├── dashboard.js    ← Dashboard controller
    ├── connections.js  ← Connections + Tokens tab
    ├── filebuilder.js  ← EXE/JAR builder UI
    ├── chat.js         ← Live chat
    ├── commands.js     ← Commands page
    ├── theme.js        ← Dark/light theme
    └── virustotal.js   ← VirusTotal integration
```

### Custom domain

Add a `CNAME` file with your domain:
```
ghostware.lol
```

Then configure your DNS with a CNAME record pointing to `yourusername.github.io`.
