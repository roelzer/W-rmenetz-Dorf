// Browser-Prüfung Neuladen im Tutorial (Produktprüfer NR13, Muss M1; ENTSCHEIDUNGEN 2026-11-06): Neuladen in T12 und in T13
// mit Strichen (Wiedereinstieg → T12). Nach der Blase „Weiter geht’s …“ muss das Baumenü auf „Leitungen“ offen sein, die
// Leitungskarte im Loch liegen und ein Tipp daneben als Fehltipp zählen; danach weiter bis T14. Eigene Datei neben
// tests/browser/nr13-tutorial.browser.cjs, weil bestehende Prüfdateien unverändert bleiben (Test-Schranke).
//
// Aufruf:  NODE_PATH=/opt/node22/lib/node_modules node tests/browser/nr13-neuladen.browser.cjs   (startet selbst einen Vite-Dev-Server)
// Ausgabe: je Prüfpunkt „OK“ oder „FEHLT“ mit Messwert. Exit 0 nur, wenn alles OK ist; 1 bei FEHLT; 2 bei Aufbaufehlern.
// Nicht Teil von `npm test` (braucht Playwright und einen Dev-Server, wie der Durchklick).
//
// Ablauf 844×390 (Gerätefaktor 2, Touch, Querformat), leerer Speicher, Vorführ-Tempo ×10 → Namensfenster → T01 … T11 über
// Lochmitte bzw. [Weiter] → T12 → Seite neu laden → Wiedereinstieg → [Weiter] → T12 prüfen, Fehltipp, Tipp aufs Loch → T13 →
// Spur bis Haus 1 → neu laden → T12 prüfen → T13 (T13b-Text) → Rest der Spur bis auf Haus 2 → T14.
// Messhilfen wie im Durchklick: Die Seite lädt '/src/render/kamera.ts' und '/src/steuerung.ts' (dieselben Modul-Instanzen wie
// das Spiel) und merkt sich Kamera und Steuerung. main.ts speichert beim pagehide, darum übersteht der Stand das Neuladen.
'use strict';

const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WURZEL = path.resolve(__dirname, '..', '..');
const TEMPO_SCHLUESSEL = 'waermedorf-tempo-v1'; // Speicher-Schlüssel von src/tempo.ts
const TEMPO_FAKTOR = 10;
const SPIELERNAME = 'Mila';
const TEXT_T13B = 'Das erste Haus ist erreicht. Jetzt weiter bis zum zweiten.';
const TEXT_T14 = 'Beide Häuser sind erreicht. Tippe auf Abschnitt abschließen.';
// src/core/start.ts (TUTORIAL_SPUR, ERSTE_HAEUSER) – hier fest, weil der Lauf in Node ohne TypeScript startet
const TUTORIAL_SPUR = [[10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [11, 14]];
const ERSTE_HAEUSER = [[9, 13], [12, 14]];
const WARTEN_MS = 40000;

const ergebnisse = [];
function pruefe(ort, name, ok, wert) {
  ergebnisse.push({ ort, name, ok: !!ok });
  console.log(`${ok ? 'OK   ' : 'FEHLT'}  [${ort}] ${name}${wert === undefined ? '' : ` – ${wert}`}`);
  return !!ok;
}
/** Abbruch des Laufs: Folge-Schritte ergäben nur Folgefehler */
class LaufAbbruch extends Error {}
function muss(ort, name, ok, wert) { if (!pruefe(ort, name, ok, wert)) throw new LaufAbbruch(`${ort}: ${name}`); }

function vorDemStart(opt) {
  // Nur beim ersten Laden leeren: beim Neuladen muss der gespeicherte Spielstand bleiben
  if (!sessionStorage.getItem('nr13-neuladen-start')) {
    sessionStorage.setItem('nr13-neuladen-start', '1');
    localStorage.clear();
    localStorage.setItem(opt.tempoSchluessel, JSON.stringify({ faktor: opt.faktor, offset_ms: 0 }));
  }
}

/** Nach jedem Laden: Vorspann weg, Kamera und Steuerung des Spiels merken */
async function messhilfen(p) {
  await p.waitForFunction(() => !document.getElementById('vorspann'), null, { timeout: 30000, polling: 100 });
  const da = await p.evaluate(async () => {
    window.__kamera = null; window.__st = null;
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
}

const warten = (p, ms) => p.waitForTimeout(ms);
const lage = (p) => p.evaluate(() => {
  const st = window.__st, a = st.anleitungAnsicht();
  const el = document.querySelector('#anleiter .anleiter-text');
  const w = document.getElementById('anleiter-weiter');
  return {
    schritt: a ? a.schritt : null, art: a ? a.art : null, intro: a ? a.wiedereinstieg : null,
    text: el ? el.textContent.replace(/\s+/g, ' ').trim() : null,
    daneben: st.anleitung ? st.anleitung.daneben : null, fahrt: st.fahrtJetzt,
    weiter: !!w && w.getClientRects().length > 0, karte: !!document.getElementById('anleiter'),
  };
});
const feldPunkt = (p, x, y) => p.evaluate(({ x, y }) => {
  const k = window.__kamera, c = document.querySelector('canvas').getBoundingClientRect();
  const [mx, my] = k.mitte(x, y);
  return [c.left + mx, c.top + my];
}, { x, y });
const mitteVon = (p, sel) => p.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}, sel);
async function tippe(p, punkt) { await p.touchscreen.tap(punkt[0], punkt[1]); }

/** Ziehen mit einem Finger über CDP-Touch (Chromium macht daraus pointerdown/pointermove/pointerup) */
async function ziehen(s, punkte) {
  const tp = ([x, y]) => [{ x: Math.round(x), y: Math.round(y), id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await s.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(punkte[0]) });
  let letzt = punkte[0];
  for (const q of punkte.slice(1)) {
    for (let i = 1; i <= 6; i++) {
      const z = [letzt[0] + ((q[0] - letzt[0]) * i) / 6, letzt[1] + ((q[1] - letzt[1]) * i) / 6];
      await s.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(z) });
      await warten(s.p, 16);
    }
    letzt = q;
  }
  await s.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

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

/** Schritt `id` erreicht → Handlung: Tipp in die Lochmitte (H) bzw. auf [Weiter] (W); danach muss `nach` erscheinen */
async function weiterBis(s, ort, id, nach) {
  const { p } = s;
  await ruhe(p);
  const l = await lage(p);
  muss(ort, `Schritt ${id} erreicht`, l.schritt === id && !l.intro, `${l.schritt}${l.intro ? ' (Wiedereinstieg)' : ''}`);
  if (l.art === 'H') {
    const m = await mitteVon(p, '.spot-ring');
    muss(ort, `${id}: Lochrand .spot-ring vorhanden`, !!m, '');
    await tippe(p, m);
  } else {
    const w = await bis(p, (x) => x.weiter, WARTEN_MS);
    muss(ort, `${id}: [Weiter] erscheint`, w.weiter, '');
    await tippe(p, await mitteVon(p, '#anleiter-weiter'));
  }
  const n = await bis(p, (x) => x.schritt === nach, WARTEN_MS);
  muss(ort, `${id} → ${nach}`, n.schritt === nach, String(n.schritt));
}

/** Seite neu laden, Wiedereinstiegs-Blase → [Weiter] → T12 mit offenem Baumenü, Leitungskarte im Loch, Fehltipp gezählt */
async function neuLadenInT12(s, ort, wo) {
  const { p } = s;
  await p.reload({ waitUntil: 'load' });
  await messhilfen(p);
  const l = await bis(p, (x) => x.intro && x.karte && x.weiter, WARTEN_MS);
  muss(ort, `Neuladen ${wo}: Wiedereinstiegs-Blase mit [Weiter]`, l.intro && l.weiter, `${l.schritt} · „${l.text}“`);
  pruefe(ort, `Neuladen ${wo}: Blase „Weiter geht’s, ${SPIELERNAME}! …“`, (l.text || '').startsWith(`Weiter geht’s, ${SPIELERNAME}!`), `„${l.text}“`);
  await tippe(p, await mitteVon(p, '#anleiter-weiter'));
  const n = await bis(p, (x) => x.schritt === 'T12' && !x.intro, 5000);
  muss(ort, `Neuladen ${wo}: nach [Weiter] → T12`, n.schritt === 'T12' && !n.intro, String(n.schritt));
  await ruhe(p);
  const m = await p.evaluate(() => {
    const r = document.querySelector('[data-ziel="reiter_leitungen"]');
    const a = window.__st.anleitungAnsicht();
    const k = a && a.leitung_typ ? document.querySelector(`[data-ziel="leitungskarte"][data-typ="${a.leitung_typ}"]`) : null;
    const ring = document.querySelector('.spot-ring');
    let trifft = false;
    if (ring && k) {
      const q = ring.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      trifft = !!e && k.contains(e);
    }
    return { reiter: !!r && r.getAttribute('aria-selected') === 'true', karte: !!k && k.getClientRects().length > 0, ring: !!ring, trifft };
  });
  pruefe(ort, `Neuladen ${wo}: Baumenü offen, Reiter „Leitungen“ gewählt`, m.reiter, String(m.reiter));
  pruefe(ort, `Neuladen ${wo}: Leitungskarte sichtbar, Loch-Ring da, Lochmitte trifft die Karte`, m.karte && m.ring && m.trifft,
    `Karte ${m.karte} · Ring ${m.ring} · trifft ${m.trifft}`);
  // Das Abdunkeln sperrt weiter alles außerhalb: Tipp auf die Geld-Pille zählt als Fehltipp, der Schritt bleibt
  const vor = await lage(p);
  await tippe(p, await mitteVon(p, '[data-ziel="geld_pille"]'));
  await warten(p, 300);
  const nach = await lage(p);
  pruefe(ort, `Neuladen ${wo}: Tipp auf die Geld-Pille → Fehltipp, T12 bleibt`, nach.schritt === 'T12' && nach.daneben === vor.daneben + 1, `${nach.schritt} · Fehltipps ${vor.daneben} → ${nach.daneben}`);
  await weiterBis(s, ort, 'T12', 'T13');
}

async function lauf(browser, url) {
  const ort = '844×390 Neuladen';
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await ctx.addInitScript(vorDemStart, { tempoSchluessel: TEMPO_SCHLUESSEL, faktor: TEMPO_FAKTOR });
  const p = await ctx.newPage();
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(`Seitenfehler: ${e.message}`));
  p.on('console', (m) => { if (m.type() === 'error') fehler.push(`Konsole: ${m.text()}`); });
  const s = { p, cdp: await ctx.newCDPSession(p) };
  try {
    await p.goto(url, { waitUntil: 'load' });
    await messhilfen(p);
    await p.waitForSelector('#start-spieler', { timeout: 15000 });
    await p.fill('#start-spieler', SPIELERNAME);
    await p.press('#start-spieler', 'Enter');
    const folge = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T10', 'T11', 'T12'];
    for (let i = 0; i < folge.length - 1; i++) await weiterBis(s, ort, folge[i], folge[i + 1]);
    await ruhe(p);
    // 1) Neuladen in T12
    await neuLadenInT12(s, ort, 'in T12');
    // 2) in T13 die Spur bis Haus 1 ziehen (Striche im Netz), dann neu laden → Wiedereinstieg T12
    await ruhe(p);
    const bisHaus1 = [];
    for (const [x, y] of TUTORIAL_SPUR.slice(0, 4)) bisHaus1.push(await feldPunkt(p, x, y));
    await ziehen(s, bisHaus1);
    let l = await bis(p, (x) => x.text === TEXT_T13B, 3000);
    muss(ort, 'T13: Striche bis Haus 1 → T13b-Text', l.schritt === 'T13' && l.text === TEXT_T13B, `${l.schritt} · „${l.text}“`);
    await neuLadenInT12(s, ort, 'in T13 mit Strichen');
    await ruhe(p);
    l = await lage(p);
    pruefe(ort, 'nach Neuladen in T13: T13b-Text (Haus 1 bleibt erreicht)', l.schritt === 'T13' && l.text === TEXT_T13B, `${l.schritt} · „${l.text}“`);
    // vom Leitungsende (10|13) weiter die Spur entlang und mit dem Finger bis auf Haus 2 (A47: letztes Feld per Zug aufs Haus)
    const rest = [];
    for (const [x, y] of [...TUTORIAL_SPUR.slice(3), ERSTE_HAEUSER[1]]) rest.push(await feldPunkt(p, x, y));
    await ziehen(s, rest);
    l = await bis(p, (x) => x.schritt === 'T14', 5000);
    muss(ort, 'nach Neuladen: Zug bis auf Haus 2 → T14', l.schritt === 'T14', `${l.schritt} · „${l.text}“`);
    await ruhe(p);
    l = await lage(p);
    pruefe(ort, 'nach Neuladen: T14-Text', l.text === TEXT_T14, `„${l.text}“`);
  } catch (f) {
    if (!(f instanceof LaufAbbruch)) throw f;
    const l = await lage(p).catch(() => null);
    console.log(`       Abbruch des Laufs, letzte Lage: ${JSON.stringify(l)}`);
  } finally {
    pruefe(ort, 'keine Fehler in der Browser-Konsole', fehler.length === 0, fehler.join(' · ') || 'keine');
    await ctx.close();
  }
}

async function main() {
  const vite = await import(pathToFileURL(require.resolve('vite', { paths: [WURZEL] })).href);
  // Verknüpftes node_modules im Arbeitsordner: Schriften sonst mit 403 (wie im Durchklick)
  const erlaubt = { allow: [WURZEL, fs.realpathSync(path.join(WURZEL, 'node_modules'))] };
  const server = await vite.createServer({ root: WURZEL, logLevel: 'error', server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false, fs: erlaubt } });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  let browser;
  try {
    browser = await chromium.launch();
    console.log(`Browser-Prüfung NR13 Neuladen · ${url} · ${new Date().toISOString()}`);
    await lauf(browser, url);
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
