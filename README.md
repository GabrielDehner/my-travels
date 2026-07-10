# my-travels

An offline-first trip planner built with Ionic + Angular. Plan destinations,
lodging, tickets, documents, checklists and expenses for your travels. All
data lives locally in IndexedDB, so the app works fully offline — installing
it as a PWA adds a proper app icon and caches the app shell for faster,
more reliable loads.

## Requirements

- Node 22.12.0 (see `.nvmrc`)
- npm

## Local development

```bash
nvm use 22.12.0
npm install
npm start
```

Then open <http://localhost:4200>.

## Build

```bash
ng build
```

Production output goes to `www/` (Ionic's default output dir, configured in
`angular.json`). The production build also emits the PWA assets:
`ngsw-worker.js`, `ngsw.json`, and `manifest.webmanifest`, so `www/` is a
fully installable, offline-capable app shell.

## Deploy

### Option 1 — GitHub Pages (included workflow)

`.github/workflows/deploy.yml` builds and deploys automatically on every
push to `main`:

1. Push to `main`.
2. In the repo settings, go to **Settings → Pages** and set **Source** to
   **GitHub Actions** (one-time setup).
3. The workflow builds with `ng build --base-href "/<repo-name>/"` (so the
   app works correctly under `https://<user>.github.io/<repo-name>/`),
   copies `www/index.html` to `www/404.html` (SPA fallback — GitHub Pages
   has no server-side rewrite, so deep links/refreshes on client-side
   routes are served the app shell instead of a 404), and deploys `www/`
   via the official `actions/upload-pages-artifact` +
   `actions/deploy-pages` actions.

**Base-href note**: the manifest and service worker use relative paths, so
they resolve correctly under the `/<repo-name>/` subpath — no extra
configuration needed beyond the `--base-href` flag the workflow already
passes.

### Option 2 — Cloudflare Pages / Netlify

Both work the same way with a static build:

- Build command: `ng build`
- Output directory: `www`
- Node version: `22.12.0`
- SPA fallback: redirect all paths to `/index.html` (Cloudflare Pages and
  Netlify both auto-detect this for Angular; if not, add a rewrite rule
  `/* -> /index.html (200)`)

No `--base-href` override is needed when deploying at the domain root
(default `/`).

## Quality checks

```bash
npx tsc --noEmit          # type check
ng lint                   # lint
npm run dep-cruise        # architecture boundary check
ng test --watch=false     # unit tests
```

## Icons

App icons under `public/icons/` and `src/assets/icon/favicon.png` are
placeholder art (solid app-blue background with a simple plane glyph) —
replace with real brand art when available.
