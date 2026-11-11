// Browser-Fotos NR20-22 Kapitel 3 (Bauplan NR20-22 P5 „tests/browser/nr20-tutorial.browser.cjs“, Sammelliste P5 Punkte 11
// und 13): das Tutorial bis Kapitel 3 durch die echte Oberfläche in Chromium, Züge mit echter Touch-Geste (CDP), Fotos für
// den Fotocheck des Designers bei 844×390 und 667×375 (Gerätefaktor 1).
//
// Aufruf:  NODE_PATH=/opt/node22/lib/node_modules node tests/browser/nr20-tutorial.browser.cjs   (startet selbst einen Vite-Dev-Server)
//          … --ordner <pfad>   Zielordner der Fotos (Standard: docs/pruefberichte/ im Projekt)
//          … --datum <JJJJMMTT> Datum im Dateinamen (Standard: heute)
//          … --paket <kennung> Paketkennung im Dateinamen, z. B. p5f (Standard: p5e)
// Ausgabe: je Prüfpunkt „OK“ oder „FEHLT“, je Foto der Pfad. Exit 0 nur, wenn alles OK ist; 1 bei FEHLT; 2 bei Aufbaufehlern.
// Nicht Teil von `npm test` (braucht Playwright und einen Dev-Server).
//
// Je Bildgröße drei Läufe mit leerem Speicher (der Weg ab T13 verzweigt):
//  A  T12, T13, Hauptleitung (10|11)→(10|12) → T13w, Farbknopf 25 → T13h, Haus 1, Haus 2 → T14.
//  B  T13: Hauptleitung (10|11)→(10|13), also über den Abzweig hinaus; Foto nach dem Abheben.
//  C  T13h, Haus 1, dann 25er (12|12)→(12|13) – eigener Abgang: Foto mit dem Finger noch auf (12|13), Foto nach dem
//     Abheben, [Zurück] antippen, Foto danach.
//  D  (P5g, DESIGN 13.17.10 G2/G3) T13h, Haus 1, dann eigener Abgang (12|12)→(12|13) bis aufs Haus 2 mit liegendem Finger:
//     kein Haken an Haus 2 (G2). Abheben, [Zurück], Haus 2 vom Abzweig: beide Häuser richtig + Rest (12|12) → nur der erste
//     Satz, keine Zielscheibe (G3). Bis P5g gebaut ist, erscheinen diese Prüfpunkte als FEHLT.
// Messhilfen wie tests/browser/nr13-tutorial.browser.cjs: Die Seite lädt '/src/render/kamera.ts' und '/src/steuerung.ts'
// (dieselben Modul-Instanzen wie das Spiel), um Feldmitten zu projizieren und den Schritt mitzulesen. Bedient wird nur
// über Touch.
'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WURZEL = path.resolve(__dirname, '..', '..');
/** src/tempo.ts: SCHLUESSEL und Stufe „Schnell ×10“ – Tutorial-Planung (10 s) vergeht in 1 s */
const TEMPO_SCHLUESSEL = 'waermedorf-tempo-v1';
const TEMPO_FAKTOR = 10;
/** Von Hand aus src/core/start.ts (NR20-22 E1) */
const HAUPT = [[10, 11], [10, 12]];
const UEBER_ABZWEIG = [[10, 11], [10, 12], [10, 13]];
const ANSCHLUSS_1 = [[9, 12]];
const ANSCHLUSS_2 = [[10, 13], [10, 14], [11, 14]];
const ERSTE_HAEUSER = [[9, 13], [12, 14]];
/** Bauplan P5 Ablauftest (7): eigener Abgang neben der Spur */
const EIGENER_ABGANG = [[12, 12], [12, 13]];
const ANSCHLUSS_TYP = 'd25';
/** DESIGN 13.17.10 G3: nur der erste Satz von satz_eigener_abgang (55 Zeichen) */
const SATZ_REST = 'Nimm das gestreifte Stück mit Zurück oder Radierer weg.';
const WARTEN_MS = 40000;
const GROESSEN = [{ b: 844, h: 390 }, { b: 667, h: 375 }];

function argumenteLesen(argv) {
  const heute = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const a = { ordner: path.join(WURZEL, 'docs', 'pruefberichte'), datum: heute, paket: 'p5e' };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--ordner' && argv[i + 1]) a.ordner = path.resolve(argv[++i]);
    else if (x === '--datum' && argv[i + 1] && /^\d{8}$/.test(argv[i + 1])) a.datum = argv[++i];
    else if (x === '--paket' && argv[i + 1] && /^[a-z0-9]+$/.test(argv[i + 1])) a.paket = argv[++i];
    else throw new Error(`Unbekanntes oder unvollständiges Argument „${x}“. Erlaubt: --ordner <pfad>, --datum <JJJJMMTT>, --paket <kennung>`);
  }
  return a;
}

const ergebnisse = [];
function pruefe(lage, name, ok, wert) {
  ergebnisse.push({ lage, name, ok: !!ok });
  console.log(`${ok ? 'OK   ' : 'FEHLT'}  [${lage}] ${name}${wert === undefined ? '' : ` – ${wert}`}`);
  return !!ok;
}
class LaufAbbruch extends Error {}
function muss(lage, name, ok, wert) { if (!pruefe(lage, name, ok, wert)) throw new LaufAbbruch(`${lage}: ${name}`); }

function vorDemStart(opt) {
  if (!sessionStorage.getItem('nr20-test-start')) {
    sessionStorage.setItem('nr20-test-start', '1');
    localStorage.clear();
    localStorage.setItem(opt.tempoSchluessel, JSON.stringify({ faktor: opt.faktor, offset_ms: 0 }));
  }
}

async function seiteOeffnen(browser, url, g) {
  const ctx = await browser.newContext({
    viewport: { width: g.b, height: g.h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block',
  });
  await ctx.addInitScript(vorDemStart, { tempoSchluessel: TEMPO_SCHLUESSEL, faktor: TEMPO_FAKTOR });
  const p = await ctx.newPage();
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(`Seitenfehler: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') fehler.push(`Konsole: ${m.text()}`); });
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForFunction(() => !document.getElementById('vorspann'), null, { timeout: 30000, polling: 100 });
  const da = await p.evaluate(async () => {
    const k = await import('/src/render/kamera.ts');
    const altK = k.Kamera.prototype.schluessel;
    k.Kamera.prototype.schluessel = function (...a) { window.__kamera = this; return altK.apply(this, a); };
    const s = await import('/src/steuerung.ts');
    const altS = s.Steuerung.prototype.tick;
    s.Steuerung.prototype.tick = function (...a) { window.__st = this; return altS.apply(this, a); };
    for (let i = 0; i < 100 && !(window.__kamera && window.__st); i++) await new Promise((r) => setTimeout(r, 30));
    return !!window.__kamera && !!window.__st;
  });
  if (!da) throw new Error('Kamera/Steuerung des Spiels nicht gefunden');
  await p.evaluate(() => document.fonts.ready);
  const cdp = await ctx.newCDPSession(p);
  return { ctx, p, cdp, fehler };
}

const warten = (p, ms) => p.waitForTimeout(ms);
const lage = (p) => p.evaluate(() => {
  const st = window.__st, a = st.anleitungAnsicht();
  const el = document.querySelector('#anleiter .anleiter-text');
  const w = document.getElementById('anleiter-weiter');
  return {
    schritt: a ? a.schritt : null, art: a ? a.art : null, intro: a ? a.wiedereinstieg : null,
    text: el ? el.textContent.replace(/\s+/g, ' ').trim() : null, fremd: a ? a.fremd.length : 0,
    fahrt: st.fahrtJetzt, weiter: !!w && w.getClientRects().length > 0, karte: !!document.getElementById('anleiter'),
    schleier: !!document.getElementById('schleier'),
    satz: a ? a.text : null, zielscheibe: a ? a.zielscheibe : null,
    haken2: !!a && (st.szene().erreicht || []).some((e) => e.id === a.objekt_ids.haus2),
  };
});
const feldPunkt = (p, x, y) => p.evaluate(({ x, y }) => {
  const k = window.__kamera, c = document.querySelector('canvas').getBoundingClientRect();
  const [mx, my] = k.mitte(x, y);
  return [c.left + mx, c.top + my];
}, { x, y });
const mitteVon = (p, sel) => p.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e || e.getClientRects().length === 0) return null;
  const r = e.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}, sel);
async function tippe(p, punkt) { await p.touchscreen.tap(punkt[0], punkt[1]); }
async function punkte(p, felder) { const r = []; for (const [x, y] of felder) r.push(await feldPunkt(p, x, y)); return r; }

/** Ein Finger über CDP-Touch (Chromium macht daraus pointerdown/pointermove/pointerup). `abheben: false` lässt ihn liegen. */
async function ziehen(s, pkt, abheben = true) {
  const tp = ([x, y]) => [{ x: Math.round(x), y: Math.round(y), id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await s.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(pkt[0]) });
  let letzt = pkt[0];
  for (const q of pkt.slice(1)) {
    for (let i = 1; i <= 6; i++) {
      const z = [letzt[0] + ((q[0] - letzt[0]) * i) / 6, letzt[1] + ((q[1] - letzt[1]) * i) / 6];
      await s.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(z) });
      await warten(s.p, 16);
    }
    letzt = q;
  }
  if (abheben) await abhebenJetzt(s);
}
const abhebenJetzt = (s) => s.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

async function bis(p, f, ms = 8000) {
  const ende = Date.now() + ms;
  let l = await lage(p);
  while (!f(l) && Date.now() < ende) { await warten(p, 100); l = await lage(p); }
  return l;
}
/** Fahrt vorbei, Karte und Löcher stehen still (zweimal gleich gemessen) */
async function ruhe(p) {
  await bis(p, (l) => !l.fahrt && l.karte, WARTEN_MS);
  let vorher = '';
  for (let i = 0; i < 40; i++) {
    const jetzt = await p.evaluate(() => JSON.stringify([...document.querySelectorAll('.spot-ring, #anleiter')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })));
    if (jetzt === vorher) break;
    vorher = jetzt;
    await warten(p, 250);
  }
}

async function namenEingeben(s, ort) {
  const { p } = s;
  await p.waitForSelector('#start-spieler', { timeout: 15000 });
  await p.fill('#start-spieler', 'Mila');
  const los = await p.evaluate(() => {
    const k = [...document.querySelectorAll('button')].find((b) => b.offsetParent !== null && b.innerText.replace(/\s+/g, ' ').trim().startsWith('Los geht'));
    if (!k) return null;
    const r = k.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  muss(ort, 'Knopf „Los geht’s“', !!los, '');
  await tippe(p, los);
  const l = await bis(p, (x) => x.schritt === 'T01' && x.karte, 15000);
  muss(ort, 'T01 nach dem Namensfenster', l.schritt === 'T01', String(l.schritt));
}

/** Bis `ziel` durchklicken: Erklär-Schritt → [Weiter], Handlungs-Schritt → Mitte des ersten Lochs */
async function bisSchritt(s, ort, ziel) {
  const { p } = s;
  for (let n = 0; n < 40; n++) {
    await ruhe(p);
    const l = await lage(p);
    if (l.schritt === ziel) return;
    let punkt = null;
    if (l.weiter) punkt = await mitteVon(p, '#anleiter-weiter');
    else if (l.art === 'H') punkt = await mitteVon(p, '.spot-ring');
    if (!punkt) {
      // T11: [Weiter] erscheint erst nach der Sprecher-Blase und der Planung
      await bis(p, (x) => x.weiter || x.schritt !== l.schritt, WARTEN_MS);
      continue;
    }
    await tippe(p, punkt);
    await bis(p, (x) => x.schritt !== l.schritt, WARTEN_MS);
  }
  const l = await lage(p);
  muss(ort, `Schritt ${ziel} erreicht`, l.schritt === ziel, String(l.schritt));
}

async function foto(s, a, g, szene, ruhig = true) {
  if (ruhig) { await ruhe(s.p); await warten(s.p, 400); }
  const datei = path.join(a.ordner, `${a.datum}-${a.paket}-${szene}-${g.b}x${g.h}.png`);
  await s.p.screenshot({ path: datei });
  const l = await lage(s.p);
  console.log(`FOTO   ${datei}  (${l.schritt}, Schleier ${l.schleier ? 'an' : 'aus'}, „${l.text}“)`);
  return l;
}

async function laufA(s, a, g, ort) {
  const { p } = s;
  await bisSchritt(s, ort, 'T12');
  let l = await foto(s, a, g, 't12');
  pruefe(ort, 'T12: Schleier liegt', l.schleier, '');
  await bisSchritt(s, ort, 'T13');
  l = await foto(s, a, g, 't13');
  pruefe(ort, 'T13: kein Schleier (Karte beim Leitungsziehen hell, main 9918f8d)', !l.schleier, '');
  await ziehen(s, await punkte(p, HAUPT));
  l = await bis(p, (x) => x.schritt === 'T13w', 3000);
  muss(ort, 'T13 → T13w nach dem Abheben', l.schritt === 'T13w', String(l.schritt));
  await foto(s, a, g, 't13w');
  const k25 = await mitteVon(p, `button[data-id="farbe-${ANSCHLUSS_TYP}"]`);
  muss(ort, 'T13w: Farbknopf 25', !!k25, '');
  await tippe(p, k25);
  l = await bis(p, (x) => x.schritt === 'T13h', 3000);
  muss(ort, 'T13w → T13h', l.schritt === 'T13h', String(l.schritt));
  await foto(s, a, g, 't13h');
  await ziehen(s, await punkte(p, [...ANSCHLUSS_1, ERSTE_HAEUSER[0]]));
  await warten(p, 300);
  await ziehen(s, await punkte(p, [...ANSCHLUSS_2, ERSTE_HAEUSER[1]]));
  l = await bis(p, (x) => x.schritt === 'T14', 5000);
  muss(ort, 'T13h → T14 nach beiden Häusern', l.schritt === 'T14', String(l.schritt));
  await foto(s, a, g, 't14');
}

async function laufB(s, a, g, ort) {
  const { p } = s;
  await bisSchritt(s, ort, 'T13');
  await ruhe(p);
  await ziehen(s, await punkte(p, UEBER_ABZWEIG));
  const l = await bis(p, (x) => x.schritt === 'T13w', 3000);
  muss(ort, 'Über den Abzweig hinaus: nach dem Abheben T13w', l.schritt === 'T13w', String(l.schritt));
  await foto(s, a, g, 'ueber-abzweig');
}

async function laufC(s, a, g, ort) {
  const { p } = s;
  await bisSchritt(s, ort, 'T13');
  await ruhe(p);
  await ziehen(s, await punkte(p, HAUPT));
  await bis(p, (x) => x.schritt === 'T13w', 3000);
  await ruhe(p);
  await tippe(p, await mitteVon(p, `button[data-id="farbe-${ANSCHLUSS_TYP}"]`));
  let l = await bis(p, (x) => x.schritt === 'T13h', 3000);
  muss(ort, 'T13h erreicht', l.schritt === 'T13h', String(l.schritt));
  await ruhe(p);
  await ziehen(s, await punkte(p, [...ANSCHLUSS_1, ERSTE_HAEUSER[0]]));
  await warten(p, 300);
  // Eigener Abgang: Finger bleibt auf (12|13) liegen (Sammelliste 13 – Ring und Satz wechseln schon, Streifen noch nicht)
  await ziehen(s, await punkte(p, EIGENER_ABGANG), false);
  await warten(p, 500);
  l = await foto(s, a, g, 'abgang-im-zug', false);
  pruefe(ort, 'Eigener Abgang im Zug: noch T13h', l.schritt === 'T13h', `${l.schritt}, fremd ${l.fremd}`);
  await abhebenJetzt(s);
  l = await bis(p, (x) => x.fremd > 0, 3000);
  pruefe(ort, 'Eigener Abgang nach dem Abheben: zwei gestreifte Felder', l.fremd === 2, `fremd ${l.fremd}`);
  await foto(s, a, g, 'abgang-vor-zurueck');
  const zurueck = await mitteVon(p, 'button[data-id="zurueck"]');
  muss(ort, 'Knopf [Zurück] sichtbar', !!zurueck, '');
  await tippe(p, zurueck);
  // DESIGN 13.17.9 F3 (ENTSCHEIDUNGEN 2026-11-07, Punkt (9)): [Zurück] nimmt nur den letzten Schritt (12|13) weg; das Rest-Stück
  // (12|12) neben der Heizzentrale liegt abseits von Spur und Hauptleitung und bleibt gestreift, bis es auch weg ist.
  l = await bis(p, (x) => x.fremd === 1, 3000);
  const rest = await p.evaluate(() => window.__st.anleitungAnsicht().fremd.map(([x, y]) => `${x}|${y}`));
  pruefe(ort, 'Nach [Zurück]: Rest-Stück (12|12) bleibt gestreift (F3)', l.fremd === 1 && rest.length === 1 && rest[0] === '12|12',
    `fremd ${JSON.stringify(rest)}, Schritt ${l.schritt}`);
  pruefe(ort, 'Nach [Zurück]: noch T13h, kein T14', l.schritt === 'T13h', String(l.schritt));
  await foto(s, a, g, 'abgang-nach-zurueck');
}

/** P5g (DESIGN 13.17.10 G2, G3): „Zug mit eigenem Abgang bis aufs Haus: kein Haken“ und „Zwei Häuser mit Rest: nur der erste
 *  Satz, keine Zielscheibe“ – die beiden letzten Punkte der Prüfliste für den nächsten Fotocheck. */
async function laufD(s, a, g, ort) {
  const { p } = s;
  await bisSchritt(s, ort, 'T13');
  await ruhe(p);
  await ziehen(s, await punkte(p, HAUPT));
  await bis(p, (x) => x.schritt === 'T13w', 3000);
  await ruhe(p);
  await tippe(p, await mitteVon(p, `button[data-id="farbe-${ANSCHLUSS_TYP}"]`));
  let l = await bis(p, (x) => x.schritt === 'T13h', 3000);
  muss(ort, 'T13h erreicht', l.schritt === 'T13h', String(l.schritt));
  await ruhe(p);
  await ziehen(s, await punkte(p, [...ANSCHLUSS_1, ERSTE_HAEUSER[0]]));
  await warten(p, 300);
  // G2: Finger liegt auf Haus 2; der Zug zählt nach dem Abheben als „muss weg“ – darum auch jetzt kein Haken
  await ziehen(s, await punkte(p, [...EIGENER_ABGANG, ERSTE_HAEUSER[1]]), false);
  let haken = false;
  for (let i = 0; i < 10; i++) { l = await lage(p); haken = haken || l.haken2; await warten(p, 50); }
  l = await foto(s, a, g, 'abgang-bis-haus', false);
  pruefe(ort, 'P5g G2: eigener Abgang bis aufs Haus, Finger liegt – kein Haken an Haus 2', !haken && !l.haken2, `Haken ${haken || l.haken2}`);
  await abhebenJetzt(s);
  l = await bis(p, (x) => x.fremd > 0, 3000);
  pruefe(ort, 'P5g G2: nach dem Abheben kein Haken an Haus 2', !l.haken2, `fremd ${l.fremd}, Haken ${l.haken2}`);
  const zurueck = await mitteVon(p, 'button[data-id="zurueck"]');
  muss(ort, 'Knopf [Zurück] sichtbar', !!zurueck, '');
  // [Zurück] so oft, bis nur noch das Rest-Stück (12|12) liegt (der Zug kann das Hausfeld als eigenen Schritt enthalten)
  for (let i = 0; i < 3 && l.fremd !== 1; i++) { await tippe(p, zurueck); await warten(p, 300); l = await lage(p); }
  muss(ort, 'Nach [Zurück]: nur das Rest-Stück liegt', l.fremd === 1, `fremd ${l.fremd}`);
  await ruhe(p);
  await ziehen(s, await punkte(p, [...ANSCHLUSS_2, ERSTE_HAEUSER[1]]));
  l = await bis(p, (x) => x.haken2, 3000);
  muss(ort, 'Haus 2 vom Abzweig richtig angeschlossen (Haken)', l.haken2, `Schritt ${l.schritt}, fremd ${l.fremd}`);
  l = await foto(s, a, g, 'zwei-haeuser-rest');
  pruefe(ort, 'P5g G3: zwei Häuser + Rest – noch T13h mit Streifen', l.schritt === 'T13h' && l.fremd === 1, `${l.schritt}, fremd ${l.fremd}`);
  pruefe(ort, 'P5g G3: zwei Häuser + Rest – nur der erste Satz', l.satz === SATZ_REST && l.text === SATZ_REST, `Ansicht „${l.satz}“, Karte „${l.text}“`);
  pruefe(ort, 'P5g G3: zwei Häuser + Rest – keine Zielscheibe', l.zielscheibe === null, JSON.stringify(l.zielscheibe));
}

async function lauf(browser, url, a, g, name, f) {
  const ort = `${g.b}×${g.h} ${name}`;
  const s = await seiteOeffnen(browser, url, g);
  try {
    await namenEingeben(s, ort);
    await f(s, a, g, ort);
  } catch (fehler) {
    if (!(fehler instanceof LaufAbbruch)) throw fehler;
    const l = await lage(s.p).catch(() => null);
    console.log(`       Abbruch des Laufs, letzte Lage: ${JSON.stringify(l)}`);
  } finally {
    pruefe(ort, 'keine Fehler in der Browser-Konsole', s.fehler.length === 0, s.fehler.join(' · ') || 'keine');
    await s.ctx.close();
  }
}

async function main() {
  let a;
  try { a = argumenteLesen(process.argv.slice(2)); } catch (fehler) { console.error(fehler.message); return 2; }
  fs.mkdirSync(a.ordner, { recursive: true });
  const vite = await import(pathToFileURL(require.resolve('vite', { paths: [WURZEL] })).href);
  // Mit verknüpftem node_modules liefert der Dev-Server die Schriften sonst mit 403 aus (wie nr13-tutorial.browser.cjs)
  const erlaubt = { allow: [WURZEL, fs.realpathSync(path.join(WURZEL, 'node_modules'))] };
  const server = await vite.createServer({ root: WURZEL, logLevel: 'error', server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false, fs: erlaubt } });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  let browser;
  try {
    const antwort = await fetch(url);
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    browser = await chromium.launch();
    console.log(`Browser-Fotos NR20 Kapitel 3 · ${url} · ${new Date().toISOString()}`);
    for (const g of GROESSEN) {
      await lauf(browser, url, a, g, 'A', laufA);
      await lauf(browser, url, a, g, 'B', laufB);
      await lauf(browser, url, a, g, 'C', laufC);
      await lauf(browser, url, a, g, 'D', laufD);
    }
  } catch (fehler) {
    console.error('Aufbaufehler:', fehler && fehler.message ? fehler.message : fehler);
    return 2;
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
  const fehlt = ergebnisse.filter((e) => !e.ok);
  console.log('');
  console.log(`ERGEBNIS: ${ergebnisse.length - fehlt.length} OK, ${fehlt.length} FEHLT (von ${ergebnisse.length} Prüfpunkten)`);
  return fehlt.length ? 1 : 0;
}

main().then((code) => { process.exitCode = code; }, (fehler) => { console.error('Abgebrochen:', fehler); process.exitCode = 2; });
