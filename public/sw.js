/* Service Worker: Das Spiel läuft nach dem ersten Laden ohne Netz (A16).
   Alles, was die Seite lädt (Seite, Skripte, Schriften, Symbole), wird beim ersten Abruf abgelegt
   und danach aus dem Speicher geliefert; im Hintergrund wird aufgefrischt. */
const CACHE = 'waermedorf-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const alt = await c.match(r, { ignoreSearch: true });
    const netz = fetch(r).then((a) => { if (a && a.ok) c.put(r, a.clone()); return a; }).catch(() => alt);
    return alt || netz;
  }));
});
