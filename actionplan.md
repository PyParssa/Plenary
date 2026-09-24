# Action Plan: Fix PWA Install Timeout on Mobile

## Root Cause Diagnosis

The PWA install flow on mobile is timing out due to **multiple compounding issues**:

### 🔴 Critical: Monolithic 744 KB JS Bundle
- `assets/index-PHAPkTdz.js` is **744 KB** (uncompressed). On a mobile connection this can easily take 10–30 seconds.
- There is **no code-splitting** configured in `vite.config.ts` — the entire app ships as one chunk.
- The browser must download, parse, and execute this entire bundle before it can trigger the PWA install prompt.

### 🔴 Critical: Service Worker Fetch Strategy Blocks Install
- The `sw.js` `fetch` handler uses **network-first** for *every* request.
- During install, the browser must successfully complete all precache fetches. If the network is slow, the SW install event can time out (browsers enforce ~5 min, but mobile often kills it sooner).
- The precache loop uses `fetch(url, { cache: 'no-cache' })` which bypasses the HTTP cache — every asset is re-downloaded fresh even if already cached by the browser.

### 🟡 High: 682 KB Unoptimized Logo Image
- `assets/logo.png` is **682 KB** — nearly as large as the JS bundle.
- This is likely loaded eagerly and contributes heavily to initial load time.

### 🟡 High: 61 KB SVG Favicon
- `favicon.svg` is **61 KB** — excessively large for an icon.

### 🟡 Medium: Screenshots Missing
- `frontend/dist/screenshots/` is an **empty directory**.
- Chrome/mobile browsers require at least one screenshot to show the "Install App" prompt (rich install UI). Missing screenshots can prevent the install banner from appearing at all.

### 🟡 Medium: `og-image.png` in Precache
- `og-image.png` (62 KB) is in `PRECACHE_ASSETS` but serves no purpose for offline functionality — it's only needed for social sharing previews.

---

## Fix Plan (Ordered by Impact)

### Step 1 — Code-Split the JS Bundle
**File:** `frontend/vite.config.ts`

Add `build.rollupOptions.output.manualChunks` to split vendor libraries:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-supabase': ['@supabase/supabase-js'],
        'vendor-motion': ['motion'],
        'vendor-ui': ['lucide-react', 'driver.js'],
      },
    },
  },
},
```

**Expected result:** Bundle splits into 4–5 smaller chunks (~100–200 KB each), enabling parallel downloads and faster first-paint. Target: main entry chunk < 200 KB.

---

### Step 2 — Fix Service Worker Caching Strategy
**File:** `frontend/public/sw.js`

**2a. Remove `og-image.png` from precache** — it's not needed offline:
```js
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  // Removed: '/og-image.png'
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
];
```

**2b. Remove `cache: 'no-cache'` from precache fetches** so the browser HTTP cache is used when available:
```js
fetch(url)  // was: fetch(url, { cache: 'no-cache' })
```

**2c. Switch fetch handler to cache-first for static assets:**
```js
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http') || url.pathname.startsWith('/api') || url.pathname.startsWith('/auth')) return;

  // Cache-first for static assets (JS, CSS, images, fonts)
  const isStatic = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?)(\?|$)/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }))
    );
  } else {
    // Network-first for navigation/HTML
    event.respondWith(
      fetch(event.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return (await caches.match('/index.html')) || (await caches.match('/'));
        }
      })
    );
  }
});
```

---

### Step 3 — Optimize Images
**Files:** `frontend/public/` and `frontend/dist/assets/`

**3a. Compress `logo.png` (682 KB → target < 100 KB):**
```bash
npx @squoosh/cli --webp '{"quality":80}' frontend/src/assets/logo.png
# Or with imagemagick:
convert logo.png -quality 80 -resize 800x800\> logo.webp
```

**3b. Compress `favicon.svg` (61 KB → target < 5 KB):**
```bash
npx svgo frontend/public/favicon.svg -o frontend/public/favicon.svg
```

**3c. Compress `apple-touch-icon.png` (40 KB → target < 15 KB):**
```bash
npx @squoosh/cli --oxipng '{}' frontend/public/apple-touch-icon.png
```

**3d. Update logo imports** in source to use the WebP version if converted.

---

### Step 4 — Add PWA Screenshots
**Files to create:** `frontend/public/screenshots/`

The `manifest.json` references `screenshot-mobile.png` and `screenshot-desktop.png` but the directory is **empty**. Mobile Chrome **requires screenshots** for the enhanced install UI:

```
frontend/public/screenshots/screenshot-mobile.png   # 750×1334 px
frontend/public/screenshots/screenshot-desktop.png  # 1280×720 px
```

Without these, the install banner may silently fail to appear on Chrome for Android.

---

### Step 5 — Add Gzip/Brotli Pre-compression (if self-hosting)
**File:** `frontend/vite.config.ts`

> Skip this step if hosting on **Vercel** — it handles compression automatically.

```bash
npm install -D vite-plugin-compression
```

```ts
import compression from 'vite-plugin-compression';
plugins: [react(), tailwindcss(), compression({ algorithm: 'brotliCompress' })],
```

---

### Step 6 — Bump Service Worker Cache Version
**File:** `frontend/public/sw.js`

After all changes, bump the cache name so the old broken SW gets replaced on next visit:
```js
const CACHE_NAME = 'plenary-v4';
```

---

## Summary Table

| Issue | Severity | Fix | Effort |
|---|---|---|---|
| 744 KB monolithic JS bundle | 🔴 Critical | Code-split in vite.config.ts | Low |
| SW network-first for all assets | 🔴 Critical | Cache-first for static assets | Low |
| SW precache uses `cache: 'no-cache'` | 🔴 Critical | Remove the option | Trivial |
| 682 KB logo.png | 🟡 High | Compress / convert to WebP | Low |
| 61 KB favicon.svg | 🟡 High | Run svgo | Trivial |
| Missing PWA screenshots | 🟡 High | Take screenshots, add to /public | Medium |
| og-image.png in precache | 🟡 Medium | Remove from PRECACHE_ASSETS | Trivial |

## Expected Outcome

After Steps 1–3: Initial load on mobile drops from ~30s → ~3–5s. Service worker installs without timeout. PWA install prompt reliably appears.

After Steps 4–6: Enhanced install UI, better offline experience, cache hits on repeat visits.
