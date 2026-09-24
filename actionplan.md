# Action Plan: Fixing Slow PWA Installation

The PWA "Add to Home Screen" prompt is appearing too slowly because the Service Worker registration and installation phases are being delayed by how assets are loaded and cached. 

Here are the root causes and the steps to fix them.

## 1. Delayed Service Worker Registration
**The Problem:** In `frontend/src/main.tsx`, the service worker is registered inside `window.addEventListener('load', ...)`. The `load` event only fires after **all** page assets (images, external fonts, etc.) have fully finished downloading. On a slower connection, this delays the service worker from even *starting* its registration process, which directly delays the PWA install prompt.

**The Fix:** Register the service worker sooner, without waiting for the full page `load` event.
*Modify `frontend/src/main.tsx`:*
```typescript
if ('serviceWorker' in navigator) {
  // Register immediately or use a slight timeout, rather than waiting for window.onload
  // which can be blocked by images/fonts.
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('Plenary ServiceWorker active with scope:', registration.scope);
    })
    .catch((error) => {
      console.warn('Plenary ServiceWorker registration failed:', error);
    });
}
```

## 2. Heavy Icons Blocking the Install Event
**The Problem:** In `frontend/public/sw.js`, the `PRECACHE_ASSETS` array includes `icon-512x512.png` (258 KB) and `icon-maskable-512x512.png` (258 KB). During the `install` event, the Service Worker pauses and waits for all precached assets to download before it activates. Downloading over 500 KB of icon files slows down the installation process significantly. 

**The Fix:** Remove the large icons from the precache list. The browser will automatically fetch them from the `manifest.json` when generating the home screen icon anyway; they do not need to be manually cached in the service worker's `install` event.
*Modify `frontend/public/sw.js`:*
```javascript
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  // REMOVE the 512x512 icons from here to speed up SW install
];
```
*(Also, optimize those 512x512 PNGs using a tool like TinyPNG to reduce their file size from 258KB down to ~40KB).*

## 3. Lack of Proper Build Tooling for PWA (Vite Plugin)
**The Problem:** You are using a manual `sw.js` file. Vite hashes your Javascript and CSS files during build (e.g., `index-D8fk2.js`), meaning your manual `sw.js` does not know their names and cannot precache them. While your `fetch` handler caches them at runtime, a much better and more performant approach is to use `vite-plugin-pwa`.

**The Fix (Recommended):** Migrate to `vite-plugin-pwa`. 
1. Install it: `npm install -D vite-plugin-pwa`
2. Configure it in `vite.config.ts`. It will automatically generate a highly optimized Service Worker that precaches your JS/CSS bundles perfectly without blocking the main thread, and handles updates gracefully. This is the industry standard for Vite PWAs and resolves performance issues inherent to manual service workers.
