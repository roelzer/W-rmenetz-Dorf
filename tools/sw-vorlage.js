/* Service Worker: Das Spiel läuft nach dem ersten Laden ohne Netz (A16).
   Beim Einrichten wird die ganze Dateiliste des Builds abgelegt (Seite, Skripte, Schriften, Symbole).
   Die Seite kommt zuerst aus dem Netz (damit Updates ankommen), ohne Netz aus dem Speicher; alles andere aus dem Speicher.
   Jede Fassung hat ihren eigenen Speicher; alte werden beim Aktivieren gelöscht. */
const VERSION = '__VERSION__';
const CACHE = 'waermedorf-' + VERSION;
const DATEIEN = __DATEIEN__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then((a) => { if (a && a.ok) caches.open(CACHE).then((c) => c.put('./', a.clone())); return a; })
      .catch(() => caches.match('./', { ignoreSearch: true }).then((a) => a || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(r, { ignoreSearch: true }).then((a) => a || fetch(r).then((n) => { if (n && n.ok) caches.open(CACHE).then((c) => c.put(r, n.clone())); return n; })));
});
