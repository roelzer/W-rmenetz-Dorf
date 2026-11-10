/* Jede Fassung startet aus ihrem eigenen Cache. Das HTML und die Dateien darin gehören zum selben Build. */
const VERSION = '__VERSION__';
const CACHE = 'waermedorf-' + VERSION;
const DATEIEN = __DATEIEN__;
const START = self.registration.scope;
const dateiUrl = (datei) => new URL(datei, START).href;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    try {
      await c.addAll(DATEIEN.map((datei) => new Request(dateiUrl(datei), { cache: 'reload' })));
      const html = await c.match(START);
      if (!(await html?.text())?.includes(`name="heatville-build" content="${VERSION}"`)) {
        throw new Error('Startseite passt noch nicht zu diesem Heatville-Build');
      }
      // Ein CDN kann während des Rollouts auf eine fehlende Datei mit der HTML-Startseite antworten.
      for (const datei of DATEIEN.filter((name) => /\.(js|css)$/.test(name))) {
        const antwort = await c.match(dateiUrl(datei));
        const mime = antwort?.headers.get('content-type') ?? '';
        const richtig = datei.endsWith('.css') ? mime.includes('text/css') : mime.includes('javascript');
        if (!richtig) throw new Error(`Startdatei fehlt: ${datei}`);
      }
    } catch (fehler) {
      await caches.delete(CACHE);
      throw fehler;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Laufende Tabs dürfen beim Wechsel noch Dateien der vorigen Fassung anfordern.
    const alt = (await caches.keys()).filter((k) => k.startsWith('waermedorf-') && k !== CACHE);
    await Promise.all(alt.slice(0, -1).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  const url = new URL(r.url);
  if (r.method !== 'GET' || url.origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    if (url.href.split(/[?#]/, 1)[0] !== START && url.href.split(/[?#]/, 1)[0] !== dateiUrl('index.html')) return;
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(START)) ?? fetch(r)));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const antwort = await c.match(r, { ignoreSearch: true });
    if (antwort) return antwort;
    if (url.pathname.startsWith(new URL('assets/', START).pathname)) {
      const vorher = await caches.match(r, { ignoreSearch: true });
      if (vorher) return vorher;
    }
    return fetch(r);
  }));
});
