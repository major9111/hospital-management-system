// Deliberately minimal: this service worker exists to make the console
// installable (a PWA needs one registered) and to let the static shell
// load offline, NOT to cache patient data. Every request to the gateway
// (appointments, prescriptions, lab results, anything with PHI) always
// goes straight to the network, uncached — caching that on disk would
// outlive the session and could leak across users on a shared device.

const CACHE_NAME = 'hospital-shell-v1';
const SHELL_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept anything that isn't a same-origin static shell asset —
  // in particular, never touch API/data calls (those go through
  // NEXT_PUBLIC_GATEWAY_URL, a different origin, or Next's own data
  // routes). This `fetch` handler simply doesn't run for those; only
  // listing them here for clarity on the boundary.
  const isShellAsset = SHELL_ASSETS.some((asset) => url.pathname === asset);
  if (!isShellAsset) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
