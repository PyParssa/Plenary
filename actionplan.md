# Action Plan: Enable "Install as App" (PWA) for Plenary

## Problem

The browser doesn't show the "Add to Home Screen" / "Install App" option because the project is **missing all three PWA requirements**:

1. **No Web App Manifest** — no `manifest.json` or `.webmanifest` file exists
2. **No Service Worker** — no `sw.js` or service worker registration
3. **No PWA-sized icons** — only an SVG favicon exists; browsers require PNG icons ≥ 192×192

> [!NOTE]
> Chrome/Edge require **all three** to trigger the install prompt: a valid manifest linked in HTML, a registered service worker with a `fetch` handler, and icons at `192x192` + `512x512`.

---

## Steps

### Step 1 — Generate PNG icons from the existing SVG favicon

**File:** `frontend/public/favicon.svg` → generate PNGs

- Use the existing `favicon.svg` to create:
  - `frontend/public/icons/icon-192x192.png`
  - `frontend/public/icons/icon-512x512.png`
  - `frontend/public/icons/icon-maskable-192x192.png`
  - `frontend/public/icons/icon-maskable-512x512.png`
- Tool: convert with a script (e.g. `sharp`, `inkscape`, or `resvg`) during this plan execution

### Step 2 — Create the Web App Manifest

**File:** `frontend/public/manifest.json` (new)

```json
{
  "name": "Plenary: Illuminating Questions",
  "short_name": "Plenary",
  "description": "A reflective inquiry deck for exploring life's most meaningful questions.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#fca311",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Step 3 — Create a Service Worker

**File:** `frontend/public/sw.js` (new)

A minimal service worker with a `fetch` handler (required for installability). Uses a **network-first** strategy so the app always serves fresh content but can fall back to cache when offline:

```js
const CACHE_NAME = 'plenary-v1';
const PRECACHE_URLS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

### Step 4 — Link the manifest in `index.html`

**File:** `frontend/index.html` (edit)

Add inside `<head>`, after the existing `<link rel="icon" ...>` line:

```html
<link rel="manifest" href="/manifest.json" />
```

### Step 5 — Register the Service Worker in the app entrypoint

**File:** `frontend/src/main.tsx` (edit)

Add at the bottom of the file:

```ts
// Register service worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app continues to work normally
    });
  });
}
```

### Step 6 — Rebuild and verify

- Run `npm run build:frontend` to include the new files in the dist
- Serve the built output (or use the dev server) over **HTTPS** (required for SW)
- Open Chrome DevTools → **Application** tab → check:
  - ✅ Manifest is detected and valid
  - ✅ Service Worker is registered
  - ✅ Installability section shows no errors
- The browser install icon (⊕) should appear in the URL bar

---

## Files Changed Summary

| Action | File | Description |
|--------|------|-------------|
| **Create** | `frontend/public/icons/icon-192x192.png` | 192px app icon |
| **Create** | `frontend/public/icons/icon-512x512.png` | 512px app icon |
| **Create** | `frontend/public/icons/icon-maskable-192x192.png` | 192px maskable icon |
| **Create** | `frontend/public/icons/icon-maskable-512x512.png` | 512px maskable icon |
| **Create** | `frontend/public/manifest.json` | Web App Manifest |
| **Create** | `frontend/public/sw.js` | Service Worker |
| **Edit** | `frontend/index.html` | Add `<link rel="manifest">` |
| **Edit** | `frontend/src/main.tsx` | Register service worker |

> [!IMPORTANT]
> The service worker + install prompt only work when served over **HTTPS** (or `localhost`). It won't trigger on plain HTTP.
