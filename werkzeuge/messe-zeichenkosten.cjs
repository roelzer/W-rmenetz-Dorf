// Messwerkzeug Zeichenkosten der Karte (Anlass: Bildrate im Browser-Durchklick NR13 bei Kamerafahrten).
//
// Aufruf:  NODE_PATH=/opt/node22/lib/node_modules node werkzeuge/messe-zeichenkosten.cjs   (startet selbst einen Vite-Dev-Server)
// Ausgabe: je Fall Median aus 20 Bildern – „JS“ = Zeit in zeichneSzene, „Raster“ = Zeit, bis die Leinwand die gesammelten
// Befehle wirklich gemalt hat (getImageData erzwingt das sofort; im Spiel geschieht es erst beim Übergeben des Bildes).
//
// Gezeichnet wird auf eine eigene Leinwand 1688×780 (844×390 bei Faktor 2, wie im Durchklick) mit Kamera und Szene des
// laufenden Spiels nach dem Vorspann. Die Bodenebene des Spiels wird dabei umgestellt – die Seite ist danach nur noch
// Messobjekt. Einordnung wie werkzeuge/messe-bildrate.cjs: Chromium kopflos rastert ohne Grafikkarte in Software;
// übertragbar sind die Verhältnisse (Boden direkt gegen Zwischenspeicher, Anteil der Häuser), nicht die absoluten Zeiten.
'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WURZEL = path.resolve(__dirname, '..');

async function messen() {
  const st = window.__st, k = st.kamera;
  const { Maler } = await import('/src/render/maler.ts');
  const sz = await import('/src/render/szene.ts');
  const { Effekte } = await import('/src/render/effekte.ts');
  const { KATALOG } = await import('/src/core/katalog.ts');
  const c = document.createElement('canvas'); c.width = 1688; c.height = 780;
  const X = c.getContext('2d'), m = new Maler(X), eff = new Effekte(), szene = st.szene(), N = 20;
  const median = (a) => a.sort((x, y) => x - y)[a.length >> 1];
  const lauf = (name, s2, vorher) => {
    const js = [], raster = [];
    for (let i = 0; i < N; i++) {
      vorher?.(i);
      X.setTransform(2, 0, 0, 2, 0, 0);
      const t0 = performance.now();
      sz.zeichneSzene(m, k, s2, eff, 1 / 60, false);
      const t1 = performance.now();
      X.getImageData(0, 0, 1, 1);
      js.push(t1 - t0); raster.push(performance.now() - t1);
    }
    return `${name}: JS ${median(js).toFixed(1)} ms, Raster ${median(raster).toFixed(1)} ms`;
  };
  const zoom0 = k.zoom, aus = [`Zoom ${zoom0.toFixed(2)}, Objekte ${szene.objekte.length}`];
  sz.bodenEbeneEinrichten(null);
  aus.push(lauf('Boden direkt, alles', szene));
  aus.push(lauf('Boden direkt, ohne Objekte', { ...szene, objekte: [] }));
  sz.bodenEbeneEinrichten((b, h) => { const q = document.createElement('canvas'); q.width = b; q.height = h; return q; });
  lauf('(Ebene aufbauen)', szene);
  aus.push(lauf('Boden aus dem Zwischenspeicher, alles', szene));
  aus.push(lauf('Boden aus dem Zwischenspeicher, ohne Objekte', { ...szene, objekte: [] }));
  // Wie eine Kamerafahrt mit Zoomänderung: jedes Bild eine andere Zoomstufe → Boden wird direkt gezeichnet
  aus.push(lauf('Zoom ändert sich je Bild, alles', szene, (i) => { k.zoom = zoom0 * (1 + 0.01 * (i + 1)); }));
  k.zoom = zoom0;
  for (const kat of [...new Set(szene.objekte.map((o) => KATALOG[o.typ].kategorie))]) {
    const os = szene.objekte.filter((o) => KATALOG[o.typ].kategorie === kat);
    aus.push(lauf(`Zwischenspeicher, nur Kategorie ${kat} (${os.length})`, { ...szene, objekte: os }));
  }
  return aus;
}

async function main() {
  const vite = await import(pathToFileURL(require.resolve('vite', { paths: [WURZEL] })).href);
  // Verknüpftes node_modules (Arbeitsordner): ohne Freigabe des echten Pfads lieferte der Dev-Server die Schriften mit 403
  const erlaubt = { allow: [WURZEL, fs.realpathSync(path.join(WURZEL, 'node_modules'))] };
  const server = await vite.createServer({ root: WURZEL, logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, fs: erlaubt } });
  await server.listen();
  let browser;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const p = await ctx.newPage();
    await p.goto(server.resolvedUrls.local[0], { waitUntil: 'load' });
    await p.waitForFunction(() => !document.getElementById('vorspann'), null, { timeout: 30000, polling: 100 });
    const da = await p.evaluate(async () => {
      const s = await import('/src/steuerung.ts');
      const alt = s.Steuerung.prototype.tick;
      s.Steuerung.prototype.tick = function (...a) { window.__st = this; return alt.apply(this, a); };
      for (let i = 0; i < 100 && !window.__st; i++) await new Promise((r) => setTimeout(r, 30));
      s.Steuerung.prototype.tick = alt;
      return !!window.__st;
    });
    if (!da) throw new Error('Steuerung des Spiels nicht gefunden');
    console.log((await p.evaluate(messen)).join('\n'));
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}

main().catch((fehler) => { console.error('Abgebrochen:', fehler); process.exitCode = 2; });
