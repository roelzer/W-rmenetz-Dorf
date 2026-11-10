import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { erzeugeServiceWorker, FESTE_DATEIEN } from '../tools/sw';

const lies = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('A16 – installierbar (PWA) und offline spielbar', () => {
  it('A16: Manifest nennt Namen, Querformat, Start-Adresse und Symbole in 192 und 512 px', () => {
    const m = JSON.parse(lies('public/manifest.webmanifest'));
    expect(m.name).toBeTruthy();
    expect(m.orientation).toBe('landscape');
    expect(m.start_url).toBeTruthy();
    expect(m.display).toBe('standalone');
    const groessen = m.icons.map((i: { sizes: string }) => i.sizes);
    expect(groessen).toContain('192x192'); expect(groessen).toContain('512x512');
    for (const i of m.icons) expect(existsSync(new URL(`../public/${i.src}`, import.meta.url))).toBe(true);
  });
  it('A16: Die Seite verweist auf das Manifest und die Anwendung meldet den Service Worker an', () => {
    expect(lies('index.html')).toContain('manifest.webmanifest');
    expect(lies('index.html')).toContain('apple-mobile-web-app-status-bar-style');
    expect(lies('src/main.ts')).toContain("serviceWorker.register('./sw.js')");
  });
  it('Handy: bietet Installation ohne Browserleiste an, ohne Tutorial oder Zeichenfläche zu überlagern', () => {
    const installation = lies('src/ui/installation.ts');
    expect(installation).toContain('beforeinstallprompt');
    expect(installation).toContain('(display-mode: standalone)');
    expect(installation).toContain('Zum Home-Bildschirm');
    expect(lies('src/main.ts')).toContain('nachTutorial(() => installationStarten())');
    expect(installation).toContain("document.getElementById('anleiter')");
    expect(lies('src/ui/stil.css')).not.toContain('100dvh');
  });
  it('A16: Der Service Worker legt beim Einrichten die komplette Dateiliste des Builds ab (nicht erst beim zweiten Laden)', () => {
    const vorlage = lies('tools/sw-vorlage.js');
    expect(vorlage).toContain('c.addAll(DATEIEN.map');
    const sw = erzeugeServiceWorker(vorlage, ['assets/index-abc.js', 'assets/index-abc.css', 'assets/baloo-2-latin-700-normal-x.woff2'], 'v1');
    expect(sw).not.toContain('__DATEIEN__'); expect(sw).not.toContain('__VERSION__');
    for (const d of ['assets/index-abc.js', 'assets/index-abc.css', 'assets/baloo-2-latin-700-normal-x.woff2', ...FESTE_DATEIEN]) expect(sw).toContain(JSON.stringify(d));
    expect(sw).toContain("'waermedorf-' + VERSION");
  });
  it('A16: Nach einem Build liegt sw.js mit Skript, Stil und Schriften in der Dateiliste (läuft nur, wenn dist/ existiert)', () => {
    if (!existsSync(new URL('../dist/sw.js', import.meta.url))) return;
    const sw = lies('dist/sw.js');
    const assets = readdirSync(new URL('../dist/assets', import.meta.url));
    expect(assets.some((a) => a.endsWith('.js'))).toBe(true);
    for (const a of assets) expect(sw).toContain(`assets/${a}`);
  });
});


describe('Heatville-Start beim Versionswechsel', () => {
  const start = 'https://heatville.example/';
  const alt = 'assets/index-alt.js';
  const neu = 'assets/index-neu.js';
  const css = 'assets/index-neu.css';
  const html = (version: string) => `<meta name="heatville-build" content="${version}">`;
  const mitTyp = (text: string, mime: string) => new Response(text, { headers: { 'content-type': mime } });

  function worker(htmlVersion: string, scriptMime = 'text/javascript') {
    const alteDateien = new Map([[start, mitTyp(html('alt'), 'text/html')], [start + alt, mitTyp('alt', 'text/javascript')]]);
    const netz = new Map([[start, mitTyp(html(htmlVersion), 'text/html')], [start + neu, mitTyp('neu', scriptMime)], [start + css, mitTyp('css', 'text/css')]]);
    const speicher = new Map([['waermedorf-alt', alteDateien], ['fremder-cache', new Map<string, Response>()]]);
    const netzAbrufen = async (r: Request) => netz.get(r.url)?.clone() ?? new Response('', { status: 404 });
    const ereignisse = new Map<string, (e: unknown) => void>();
    const caches = {
      async open(name: string) {
        const dateien = speicher.get(name) ?? new Map<string, Response>();
        speicher.set(name, dateien);
        return {
          async addAll(requests: Request[]) {
            for (const r of requests) {
              expect(r.cache).toBe('reload');
              dateien.set(r.url, await netzAbrufen(r));
            }
          },
          async match(r: string | Request) { return dateien.get(typeof r === 'string' ? r : r.url)?.clone(); },
        };
      },
      async keys() { return [...speicher.keys()]; },
      async delete(name: string) { return speicher.delete(name); },
      async match(r: Request) {
        for (const cache of speicher.values()) {
          const antwort = cache.get(r.url);
          if (antwort) return antwort.clone();
        }
      },
    };
    runInNewContext(erzeugeServiceWorker(lies('tools/sw-vorlage.js'), [neu, css], 'neu'), {
      Request, URL, caches, fetch: netzAbrufen,
      self: {
        location: { origin: new URL(start).origin }, registration: { scope: start },
        clients: { claim() {} }, skipWaiting() {},
        addEventListener: (name: string, f: (e: unknown) => void) => ereignisse.set(name, f),
      },
    });
    const wechsel = (name: string) => new Promise<void>((resolve, reject) => {
      ereignisse.get(name)!({ waitUntil: (p: Promise<void>) => p.then(resolve, reject) });
    });
    const laden = (pfad: string, mode: string) => new Promise<Response>((resolve, reject) => {
      const request = { url: new URL(pfad, start).href, mode, method: 'GET' };
      ereignisse.get('fetch')!({ request, respondWith: (p: Promise<Response>) => p.then(resolve, reject) });
    });
    return { wechsel, laden, netz, speicher };
  }

  it('lädt HTML, Skript und CSS gemeinsam aus derselben Fassung, auch offline', async () => {
    const w = worker('neu');
    await w.wechsel('install');
    await w.wechsel('activate');
    w.netz.clear();
    expect(await (await w.laden('?quelle=homescreen', 'navigate')).text()).toBe(html('neu'));
    expect(await (await w.laden(neu, 'cors')).text()).toBe('neu');
    expect(await (await w.laden(css, 'cors')).text()).toBe('css');
    expect(await (await w.laden(alt, 'cors')).text()).toBe('alt');
    expect(w.speicher.has('fremder-cache')).toBe(true);
  });

  it.each([['alt', 'text/javascript'], ['neu', 'text/html']])('verwirft eine unvollständige Installation (%s, %s)', async (version, mime) => {
    const w = worker(version, mime);
    await expect(w.wechsel('install')).rejects.toThrow();
    expect(w.speicher.has('waermedorf-neu')).toBe(false);
    expect(w.speicher.has('waermedorf-alt')).toBe(true);
  });

  it('zeigt ohne Spielskript einen eigenen Startstatus statt der Drehmeldung', () => {
    const seite = lies('index.html');
    expect(seite).toContain('id="drehen" hidden');
    expect(seite).toContain('id="startstatus"');
    expect(seite).toContain("addEventListener('click', () => location.reload())");
  });
});
