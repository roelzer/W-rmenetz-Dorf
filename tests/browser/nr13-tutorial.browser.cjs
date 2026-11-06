// Browser-Durchklick NR13 (Bauplan NR13 Fassung 3.1, P4 „Browser-Test“, §9 Zeile F3.1): das Pflicht-Tutorial T01–T26 einmal
// durch die echte Oberfläche in Chromium – echte Lage der Löcher, echte Eingabesperre, echte Touch-Ereignisse.
//
// Aufruf:  NODE_PATH=/opt/node22/lib/node_modules node tests/browser/nr13-tutorial.browser.cjs   (startet selbst einen Vite-Dev-Server)
//          node tests/browser/nr13-tutorial.browser.cjs --url http://localhost:5173/              (fremder Vite-DEV-Server)
// Ausgabe: je Prüfpunkt „OK“ oder „FEHLT“ mit Messwert. Exit 0 nur, wenn alles OK ist; 1 bei FEHLT; 2 bei Aufbaufehlern.
// Nicht Teil von `npm test` (braucht Playwright und einen Dev-Server, Bauplan E-NR13-m).
//
// Ablauf 844×390 (Gerätefaktor 2, Touch an, Querformat), leerer Speicher → Namensfenster → T01. Je Schritt zuerst ein
// Fehltipp außerhalb von Loch und Anleiter-Karte (T13: auf die Geld-Pille) → Schritt, Blasentext und Kapitel bleiben, die
// Sperre zählt genau einen Fehltipp. Handlungs-Schritt: Tipp in die Mitte des Lochs (`.spot-ring`). Erklär-Schritt: Tipp ins
// Loch ändert nichts, dann [Weiter] (in T02 einmal per Tastatur: Enter). T13: Spur bis Haus 1 ziehen → T13b-Text, Zurück →
// T13-Text, ab dem Leitungsende weiter bis auf Haus 2 → T14. Ende: keine Anleiter-Karte, gespeicherter Stand ohne
// `tutorial`, beide ERSTE_HAEUSER warm (im laufenden Spiel und in Node aus dem gespeicherten Stand gerechnet), keine
// Konsolenfehler. Zusätzlich 667×375 bis T05.
//
// Zeit: Das Vorführ-Tempo ×10 (Speicher-Schlüssel von src/tempo.ts) lässt die Tutorial-Planung (10 s) und den Tutorial-Bau
// (20 s) in 1 bzw. 2 s vergehen. Die Sprecher-Blasen von Philipp und Laura laufen auf der echten Fensteruhr (bis ~7 s);
// darum je Warteschritt eine Zeitgrenze von 40 s.
//
// Messhilfen (nur im Testbrowser, nichts im Spielcode), wie tests/browser/a92-b2b.browser.cjs: Die Seite lädt
// '/src/render/kamera.ts' und '/src/steuerung.ts' (dieselben Modul-Instanzen wie das Spiel) und merkt sich die laufende
// Kamera bzw. Steuerung, um Feldmitten zu projizieren und den Tutorial-Schritt (anleitungAnsicht) mitzulesen. Bedient wird
// ausschließlich über Touch und Tastatur.
'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WURZEL = path.resolve(__dirname, '..', '..');
const SPIELSTAND_SCHLUESSEL = 'waermedorf-spielstand-v1';
/** src/tempo.ts: SCHLUESSEL und Stufe „Schnell ×10“ */
const TEMPO_SCHLUESSEL = 'waermedorf-tempo-v1';
const TEMPO_FAKTOR = 10;
const SPIELERNAME = 'Mila';
/** Feste Erwartungen von Hand aus src/core/tutorial.ts (TUTORIAL_SCHRITTE) und src/core/start.ts */
const FOLGE = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15', 'T16',
  'T17', 'T18', 'T19', 'T20', 'T21', 'T22', 'T23', 'T24', 'T25', 'T26'];
const TEXT_T13 = 'Zieh die Leitung mit dem Finger von der Heizzentrale bis an beide Häuser. Folge der gelben Spur.';
const TEXT_T13B = 'Das erste Haus ist erreicht. Jetzt weiter bis zum zweiten.';
const TEXT_T14 = 'Beide Häuser sind erreicht. Tippe auf Abschnitt abschließen.';
const TUTORIAL_SPUR = [[10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [11, 14]];
const ERSTE_HAEUSER = [[9, 13], [12, 14]];
const WARTEN_MS = 40000;

function argumenteLesen(argv) {
  const a = { url: null };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--url' && argv[i + 1]) a.url = argv[++i];
    else if (x.startsWith('--url=')) a.url = x.slice(6);
    else throw new Error(`Unbekanntes Argument „${x}“. Erlaubt: --url <adresse eines Vite-Dev-Servers>`);
  }
  return a;
}

// ───────────── Ergebnisliste ─────────────
const ergebnisse = [];
function pruefe(lage, name, ok, wert) {
  ergebnisse.push({ lage, name, ok: !!ok, wert });
  console.log(`${ok ? 'OK   ' : 'FEHLT'}  [${lage}] ${name}${wert === undefined ? '' : ` – ${wert}`}`);
  return !!ok;
}
/** Abbruch eines Laufs: Folge-Schritte ergäben nur Folgefehler */
class LaufAbbruch extends Error {}
function muss(lage, name, ok, wert) { if (!pruefe(lage, name, ok, wert)) throw new LaufAbbruch(`${lage}: ${name}`); }
const r1 = (v) => (v == null || Number.isNaN(v) ? String(v) : String(Math.round(v * 10) / 10));

// ───────────── Seite ─────────────
function vorDemStart(opt) {
  // Nur beim ersten Laden leeren (die Seite wird im Lauf nicht neu geladen)
  if (!sessionStorage.getItem('nr13-test-start')) {
    sessionStorage.setItem('nr13-test-start', '1');
    localStorage.clear();
    localStorage.setItem(opt.tempoSchluessel, JSON.stringify({ faktor: opt.faktor, offset_ms: 0 }));
  }
}

async function seiteOeffnen(browser, url, g) {
  const ctx = await browser.newContext({
    viewport: { width: g.b, height: g.h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block',
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
  if (!da) throw new Error('Kamera/Steuerung des Spiels nicht gefunden (läuft unter --url ein Vite-DEV-Server?)');
  await p.evaluate(() => document.fonts.ready);
  const cdp = await ctx.newCDPSession(p);
  return { ctx, p, cdp, fehler };
}

const warten = (p, ms) => p.waitForTimeout(ms);
/** Was die Steuerung gerade zeigt: Schritt, Art, Kapitel, Text, Fehltipp-Zähler, Fahrt */
const lage = (p) => p.evaluate(() => {
  const st = window.__st, a = st.anleitungAnsicht();
  const el = document.querySelector('#anleiter .anleiter-text');
  const kap = document.querySelector('#anleiter .kapitel-punkte');
  const w = document.getElementById('anleiter-weiter');
  return {
    schritt: a ? a.schritt : null, art: a ? a.art : null, intro: a ? a.wiedereinstieg : null, kamera: a ? a.kamera : null,
    ansichtText: a ? a.text : null,
    text: el ? el.textContent.replace(/\s+/g, ' ').trim() : null,
    kapitel: kap ? kap.getAttribute('aria-label') : null,
    daneben: st.anleitung ? st.anleitung.daneben : null,
    fahrt: st.fahrtJetzt,
    weiter: !!w && w.getClientRects().length > 0,
    karte: !!document.getElementById('anleiter'),
  };
});
/** Bildschirm-Mitte eines Feldes (Projektion des Spiels plus Lage der Leinwand) */
const feldPunkt = (p, x, y) => p.evaluate(({ x, y }) => {
  const k = window.__kamera, c = document.querySelector('canvas').getBoundingClientRect();
  const [mx, my] = k.mitte(x, y);
  return [c.left + mx, c.top + my];
}, { x, y });
const mitteVon = (p, sel, i = 0) => p.evaluate(({ s, i }) => {
  const e = document.querySelectorAll(s)[i];
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}, { s: sel, i });

/** Punkt in der Leinwand außerhalb aller Lochränder, der Anleiter-Karte und des Tastatur-Ersatzes */
const fehltippPunkt = (p) => p.evaluate(() => {
  const frei = (sel, rand) => [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect())
    .filter((r) => r.width > 0 || r.height > 0)
    .map((r) => ({ l: r.left - rand, r: r.right + rand, o: r.top - rand, u: r.bottom + rand }));
  const sperr = [...frei('.spot-ring', 16), ...frei('#anleiter', 16), ...frei('.ersatz-ziel', 16), ...frei('.info-kapsel', 8)];
  const innen = (x, y) => sperr.some((q) => x >= q.l && x <= q.r && y >= q.o && y <= q.u);
  for (let y = 0.3; y <= 0.8; y += 0.05) for (let x = 0.05; x <= 0.6; x += 0.05) {
    const px = innerWidth * x, py = innerHeight * y;
    if (innen(px, py)) continue;
    const unter = document.elementFromPoint(px, py);
    if (unter && unter.tagName === 'CANVAS') return [px, py];
  }
  return null;
});

/** DESIGN 13.3 „nie über dem Ziel“: Lochränder (.spot-ring), die die stehende Anleiter-Karte schneidet (leer = frei) */
const karteUeberLoch = (p) => p.evaluate(() => {
  const k = document.getElementById('anleiter');
  if (!k || k.getClientRects().length === 0) return { karte: null, treffer: [] };
  const q = (r) => `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`;
  const kr = k.getBoundingClientRect();
  const treffer = [...document.querySelectorAll('.spot-ring')].map((e) => e.getBoundingClientRect())
    .filter((r) => (r.width > 0 || r.height > 0) && r.left < kr.right && kr.left < r.right && r.top < kr.bottom && kr.top < r.bottom)
    .map(q);
  return { karte: q(kr), treffer };
});

/** Bildrate im Browser: eigener requestAnimationFrame-Zähler (nur Messhilfe), Start und Stopp getrennt */
const BILDRATE_MIN = 50;
const bildrateStart = (p) => p.evaluate(() => {
  const m = { n: 0, t0: performance.now(), an: true };
  window.__bildrate = m;
  const f = () => { if (!m.an) return; m.n++; requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
const bildrateStopp = (p) => p.evaluate(() => {
  const m = window.__bildrate;
  m.an = false;
  const dauer_s = (performance.now() - m.t0) / 1000;
  return { bilder: m.n, dauer_s, fps: m.n / dauer_s };
});
function bildratePruefen(ort, was, r) {
  pruefe(ort, `Bildrate ${was} ≥ ${BILDRATE_MIN} Bilder/s`, r.fps >= BILDRATE_MIN, `${r1(r.fps)} Bilder/s (${r.bilder} Bilder in ${r1(r.dauer_s)} s)`);
}

/** Tutorial-Abschnitt (Bauplan NR13 Ziel 6): gleich nach dem Tipp steht der Abschnitt in `phase` und endet nach `soll_s`
 *  Sekunden Spielzeit. Im Vorführ-Tempo ×10 vergeht das zehnmal schneller; darum Spielzeit, nicht Wanduhr. */
async function abschnittDauerPruefen(p, ort, phase, soll_s) {
  const a = await p.evaluate(() => {
    const st = window.__st, ab = st.spiel.stand.abschnitt;
    return ab ? { phase: ab.phase, rest_s: ab.bau ? (ab.bau.ende_ms - st.uhr()) / 1000 : null } : null;
  });
  pruefe(ort, `Abschnitt „${phase}“ läuft, Restdauer ≤ ${soll_s} s und > ${soll_s - 3} s Spielzeit`,
    !!a && a.phase === phase && a.rest_s !== null && a.rest_s <= soll_s && a.rest_s > soll_s - 3, a ? `${a.phase}, noch ${r1(a.rest_s)} s` : 'kein Abschnitt');
}

/** Bildrate während einer Kamerafahrt, die mit dem Schrittwechsel eben begonnen hat (Dauer 1.200 ms) */
async function fahrtMessen(p, ort, id) {
  await bildrateStart(p);
  const l = await bis(p, (x) => x.schritt === id && x.fahrt, 400);
  pruefe(ort, `${id}: Kamerafahrt läuft`, l.schritt === id && l.fahrt, `${l.schritt} · Fahrt ${l.fahrt}`);
  await warten(p, 1000);
  bildratePruefen(ort, `während der Kamerafahrt in ${id}`, await bildrateStopp(p));
}

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

/** Wartet, bis die Bedingung über `lage` erfüllt ist; liefert die letzte Lage */
async function bis(p, f, ms = 8000) {
  const ende = Date.now() + ms;
  let l = await lage(p);
  while (!f(l) && Date.now() < ende) { await warten(p, 100); l = await lage(p); }
  return l;
}
/** Nach einem Schrittwechsel: Fahrt vorbei, Karte und Löcher stehen still (zweimal gleich gemessen) */
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

/** Fehltipp: Schritt, Text, Kapitel bleiben; die Sperre zählt genau einen Fehltipp */
async function fehltipp(p, ort, punkt, wo) {
  const v = await lage(p);
  if (!punkt) { pruefe(ort, `${v.schritt}: Fehltipp-Punkt ${wo}`, false, 'kein freier Punkt gefunden'); return; }
  await tippe(p, punkt);
  await warten(p, 300);
  const n = await lage(p);
  pruefe(ort, `${v.schritt}: Fehltipp ${wo} (${r1(punkt[0])}|${r1(punkt[1])}) → Schritt, Text und Kapitel unverändert`,
    n.schritt === v.schritt && n.text === v.text && n.kapitel === v.kapitel, `${n.schritt} · ${n.kapitel} · „${n.text}“`);
  pruefe(ort, `${v.schritt}: Fehltipp von der Sperre abgefangen (Fehltipp-Zähler +1)`, n.daneben === v.daneben + 1, `${v.daneben} → ${n.daneben}`);
}

/** Ein Schritt nach der Folge: Fehltipp, dann die Handlung `handeln`; danach muss `nach` erscheinen */
async function schritt(s, ort, id, handeln, nach) {
  const { p } = s;
  await ruhe(p);
  const l = await lage(p);
  muss(ort, `Schritt ${id} erreicht`, l.schritt === id && !l.intro, `${l.schritt}${l.intro ? ' (Wiedereinstieg)' : ''}`);
  pruefe(ort, `${id}: Anleiter-Karte zeigt den Text der Ansicht`, l.text === l.ansichtText.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(), `„${l.text}“`);
  const ueber = await karteUeberLoch(p);
  pruefe(ort, `${id}: Anleiter-Karte schneidet keinen Lochrand`, ueber.treffer.length === 0,
    ueber.karte ? `Karte ${ueber.karte}${ueber.treffer.length ? `; Lochrand ${ueber.treffer.join(' / ')}` : ''}` : 'keine Karte sichtbar');
  if (id === 'T13') await fehltipp(p, ort, await mitteVon(p, '[data-ziel="geld_pille"]'), 'auf die Geld-Pille');
  else await fehltipp(p, ort, await fehltippPunkt(p), 'außerhalb');
  await handeln(l);
  if (nach) {
    const n = await bis(p, (x) => x.schritt === nach, WARTEN_MS);
    muss(ort, `${id} → ${nach}`, n.schritt === nach, String(n.schritt));
  }
}

/** Handlungs-Schritt: Tipp in die Mitte des (ersten) Lochs */
const lochTipp = (s, ort, id) => async () => {
  const m = await mitteVon(s.p, '.spot-ring', 0);
  muss(ort, `${id}: Lochrand .spot-ring vorhanden`, !!m, '');
  // Lage des Lochs: Kartenziele liegen auf der Leinwand, Bedienelemente müssen unter der Lochmitte selbst liegen
  const treffer = await s.p.evaluate(([x, y]) => {
    const st = window.__st, a = st.anleitungAnsicht(), z = a.ziele[0];
    const e = document.elementFromPoint(x, y);
    const karte = ['heizzentrale', 'haus1', 'haus2'].includes(z);
    const typ = z === 'leitungskarte' && a.leitung_typ ? `[data-typ="${a.leitung_typ}"]` : '';
    const ziel = karte ? null : document.querySelector(`[data-ziel="${z}"]${typ}`);
    const ok = karte ? !!e && e.tagName === 'CANVAS' : !!e && !!ziel && ziel.contains(e);
    return { z, ok, unter: e ? e.tagName.toLowerCase() + (e.closest('[data-ziel]') ? `[data-ziel=${e.closest('[data-ziel]').getAttribute('data-ziel')}]` : '') : 'nichts' };
  }, m);
  pruefe(ort, `${id}: Lochmitte (${r1(m[0])}|${r1(m[1])}) trifft das Ziel „${treffer.z}“`, treffer.ok, `darunter ${treffer.unter}`);
  await tippe(s.p, m);
};
/** Erklär-Schritt: Tipp ins Loch ändert nichts (Sperre zählt ihn), dann [Weiter] antippen oder per Enter */
const weiterSchritt = (s, ort, id, perEnter = false) => async () => {
  const { p } = s;
  const m = await mitteVon(p, '.spot-ring', 0);
  if (m) {
    const v = await lage(p);
    // Was unter der Lochmitte liegt (für die Fehlersuche, falls der Tipp doch etwas auslöst)
    const unter = await p.evaluate(([x, y]) => {
      const e = document.elementFromPoint(x, y), q = (el) => { if (!el) return 'keine'; const r = el.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`; };
      return `darunter ${e ? (e.id || e.className || e.tagName) : 'nichts'}${e && e.closest('#anleiter') ? ' (in der Anleiter-Karte)' : ''}; Karte ${q(document.getElementById('anleiter'))}; Loch ${q(document.querySelector('.spot-ring'))}`;
    }, m);
    await tippe(p, m);
    await warten(p, 300);
    const n = await lage(p);
    pruefe(ort, `${id}: Tipp ins Loch (${r1(m[0])}|${r1(m[1])}) ändert nichts`, n.schritt === v.schritt && n.text === v.text && n.daneben === v.daneben + 1, `${n.schritt}, Fehltipps ${v.daneben} → ${n.daneben}; ${unter}`);
  }
  const w = await bis(p, (x) => x.weiter, WARTEN_MS);
  muss(ort, `${id}: [Weiter] erscheint`, w.weiter, '');
  if (perEnter) {
    const fokus = await p.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName));
    pruefe(ort, `${id}: Fokus auf [Weiter]`, fokus === 'anleiter-weiter', String(fokus));
    await p.keyboard.press('Enter');
  } else await tippe(p, await mitteVon(p, '#anleiter-weiter'));
};

// ───────────── Läufe ─────────────
async function namenEingeben(s, ort) {
  const { p } = s;
  await p.waitForSelector('#start-spieler', { timeout: 15000 });
  pruefe(ort, 'Namensfenster beim neuen Spiel', true, '#start-spieler');
  await p.fill('#start-spieler', SPIELERNAME);
  const los = await p.evaluate(() => {
    const k = [...document.querySelectorAll('button')].find((b) => b.offsetParent !== null && b.innerText.replace(/\s+/g, ' ').trim().startsWith('Los geht'));
    if (!k) return null;
    const r = k.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  muss(ort, 'Knopf „Los geht’s“ im Namensfenster', !!los, '');
  await tippe(p, los);
  const l = await bis(p, (x) => x.schritt === 'T01' && x.karte, 15000);
  muss(ort, 'nach dem Namensfenster: T01 mit Anleiter-Karte', l.schritt === 'T01' && l.karte && !l.intro, `${l.schritt}`);
  pruefe(ort, 'T01 begrüßt mit dem Namen', (l.text || '').startsWith(`Hallo ${SPIELERNAME}!`), `„${l.text}“`);
}

async function t13(s, ort) {
  const { p } = s;
  const anfang = await lage(p);
  muss(ort, 'T13: Text vor dem Ziehen', anfang.text === TEXT_T13, `„${anfang.text}“`);
  // bis Haus 1: die Spur bis (10|13), dem Feld neben Haus 1 (9|13)
  const bisHaus1 = [];
  for (const [x, y] of TUTORIAL_SPUR.slice(0, 4)) bisHaus1.push(await feldPunkt(p, x, y));
  await bildrateStart(p);
  await ziehen(s, bisHaus1);
  const b1 = await bildrateStopp(p);
  let l = await bis(p, (x) => x.text === TEXT_T13B, 3000);
  pruefe(ort, 'T13: nach dem Zug bis Haus 1 → T13b-Text', l.schritt === 'T13' && l.text === TEXT_T13B, `${l.schritt} · „${l.text}“`);
  // Zurück (in T13 frei) nimmt das letzte Feld weg → Haus 1 getrennt → wieder T13-Text
  const zurueck = await mitteVon(p, 'button[data-id="zurueck"]');
  muss(ort, 'T13: Knopf Zurück in der Zeichenleiste', !!zurueck, '');
  await tippe(p, zurueck);
  l = await bis(p, (x) => x.text === TEXT_T13, 3000);
  pruefe(ort, 'T13: Zurück → Text wechselt von T13b zu T13', l.schritt === 'T13' && l.text === TEXT_T13, `${l.schritt} · „${l.text}“`);
  pruefe(ort, 'T13: Zurück zählt nicht als Fehltipp', l.daneben === anfang.daneben, `${anfang.daneben} → ${l.daneben}`);
  // ab dem Leitungsende (10|12) weiter die Spur entlang und mit dem Finger bis auf Haus 2 (A47: letztes Feld per Zug aufs Haus)
  const rest = [];
  for (const [x, y] of [...TUTORIAL_SPUR.slice(2), ERSTE_HAEUSER[1]]) rest.push(await feldPunkt(p, x, y));
  await bildrateStart(p);
  await ziehen(s, rest);
  const b2 = await bildrateStopp(p);
  const dauer_s = b1.dauer_s + b2.dauer_s, bilder = b1.bilder + b2.bilder;
  bildratePruefen(ort, 'in T13 beim Ziehen der Leitung', { bilder, dauer_s, fps: bilder / dauer_s });
  l = await bis(p, (x) => x.schritt === 'T14', 5000);
  muss(ort, 'T13: Zug bis auf Haus 2 → T14', l.schritt === 'T14', `${l.schritt} · „${l.text}“`);
  await ruhe(p);
  l = await lage(p);
  pruefe(ort, 'T14-Text', l.text === TEXT_T14, `„${l.text}“`);
}

async function durchklick844(browser, url, server) {
  const g = { b: 844, h: 390 }, ort = '844×390';
  const s = await seiteOeffnen(browser, url, g);
  const { p } = s;
  const gesehen = [];
  const S = async (id, handeln, nach) => { await schritt(s, ort, id, handeln, nach); gesehen.push(id); };
  try {
    await namenEingeben(s, ort);
    // Vergleichswert ohne Bewegung (keine Prüfung): zeigt, was dieser Rechner im Testbrowser überhaupt schafft
    await ruhe(p); await bildrateStart(p); await warten(p, 1000);
    const ruhend = await bildrateStopp(p);
    console.log(`INFO   [${ort}] Bildrate ruhend in T01 (Vergleich): ${r1(ruhend.fps)} Bilder/s`);
    await S('T01', lochTipp(s, ort, 'T01'), 'T02');
    await S('T02', weiterSchritt(s, ort, 'T02'), 'T03');
    // Tastatur (13.11): in T03 einmal Enter auf [Weiter]
    await S('T03', weiterSchritt(s, ort, 'T03', true), 'T04');
    // T05 beginnt mit einer Kamerafahrt (1.200 ms): Bildrate währenddessen
    await S('T04', async () => { await weiterSchritt(s, ort, 'T04')(); await fahrtMessen(p, ort, 'T05'); }, 'T05');
    for (const [id, nach] of [['T05', 'T06'], ['T06', 'T07'], ['T07', 'T08']]) await S(id, weiterSchritt(s, ort, id), nach);
    // T09 (Reiter Leitungen) ist beim Öffnen des Baumenüs schon erfüllt und wird im selben Takt durchlaufen
    await S('T08', lochTipp(s, ort, 'T08'), 'T10');
    await S('T10', async () => { await lochTipp(s, ort, 'T10')(); await abschnittDauerPruefen(p, ort, 'planung', 10); }, 'T11');
    await S('T11', weiterSchritt(s, ort, 'T11'), 'T12');
    await S('T12', lochTipp(s, ort, 'T12'), 'T13');
    await S('T13', () => t13(s, ort), null);
    gesehen.push('T14');
    // T14 getrennt: der Schrittwechsel ist schon in t13 geprüft
    await schritt(s, ort, 'T14', lochTipp(s, ort, 'T14'), 'T15');
    await S('T15', lochTipp(s, ort, 'T15'), 'T16');
    await S('T16', weiterSchritt(s, ort, 'T16'), 'T17');
    await S('T17', lochTipp(s, ort, 'T17'), 'T18');
    await S('T18', lochTipp(s, ort, 'T18'), 'T19');
    await S('T19', lochTipp(s, ort, 'T19'), 'T20');
    await S('T20', lochTipp(s, ort, 'T20'), 'T21');
    // T22 beginnt mit einer Kamerafahrt über Heizzentrale und Häuser
    await S('T21', async () => { await lochTipp(s, ort, 'T21')(); await abschnittDauerPruefen(p, ort, 'bau', 20); await fahrtMessen(p, ort, 'T22'); }, 'T22');
    await S('T22', weiterSchritt(s, ort, 'T22'), 'T23');
    await S('T23', weiterSchritt(s, ort, 'T23'), 'T24');
    for (const [id, nach] of [['T24', 'T25'], ['T25', 'T26']]) await S(id, weiterSchritt(s, ort, id), nach);
    await S('T26', weiterSchritt(s, ort, 'T26'), null);

    const reihenfolge = gesehen.filter((x, i) => gesehen.indexOf(x) === i);
    pruefe(ort, 'Schrittfolge T01–T08, T10–T26', JSON.stringify(reihenfolge) === JSON.stringify(FOLGE), reihenfolge.join(' '));
    const ende = await bis(p, (x) => x.schritt === null && !x.karte, 5000);
    pruefe(ort, 'Ende: kein Tutorial-Schritt, keine #anleiter', ende.schritt === null && !ende.karte, `${ende.schritt} · Karte ${ende.karte}`);
    pruefe(ort, 'Ende: Abdunkeln weg (#spotlight)', !(await p.$('#spotlight')), '');
    const warmImSpiel = await p.evaluate((haeuser) => {
      const sp = window.__st.spiel;
      return haeuser.map(([x, y]) => { const o = sp.stand.objekte.find((q) => q.x === x && q.y === y && q.typ !== 'hz' && !/leitung/i.test(q.typ)); return !!o && sp.netz.warm.has(o.id); });
    }, ERSTE_HAEUSER);
    pruefe(ort, 'Ende: beide ERSTE_HAEUSER warm (laufendes Spiel)', warmImSpiel.every(Boolean), warmImSpiel.join(' / '));
    // gespeicherter Stand: main.ts speichert alle 5 s
    await p.waitForFunction((k) => { const t = localStorage.getItem(k); return !!t && !('tutorial' in JSON.parse(t)); }, SPIELSTAND_SCHLUESSEL, { timeout: 15000, polling: 250 }).catch(() => null);
    const text = await p.evaluate((k) => localStorage.getItem(k), SPIELSTAND_SCHLUESSEL);
    await standInNodePruefen(server, ort, text);
  } catch (f) {
    if (!(f instanceof LaufAbbruch)) throw f;
    const l = await lage(p).catch(() => null);
    console.log(`       Abbruch des Laufs, letzte Lage: ${JSON.stringify(l)}`);
  } finally {
    pruefe(ort, 'keine Fehler in der Browser-Konsole', s.fehler.length === 0, s.fehler.join(' · ') || 'keine');
    await s.ctx.close();
  }
}

async function standInNodePruefen(server, ort, text) {
  if (!pruefe(ort, 'gespeicherter Spielstand vorhanden', !!text, '')) return;
  const roh = JSON.parse(text);
  pruefe(ort, 'gespeicherter Stand ohne „tutorial“', !('tutorial' in roh), Object.prototype.hasOwnProperty.call(roh, 'tutorial') ? JSON.stringify(roh.tutorial) : 'fehlt');
  const sp = await server.ssrLoadModule('/src/core/spiel.ts');
  const sv = await server.ssrLoadModule('/src/core/speichern.ts');
  const kat = await server.ssrLoadModule('/src/core/katalog.ts');
  const jetzt = roh.zuletzt_ms;
  const geladen = sv.ladenMitBefund(text, jetzt);
  pruefe(ort, 'gespeicherter Stand lädt ohne Befund', geladen.befund === 'ok', geladen.befund);
  const spiel = new sp.Spiel(geladen.stand, () => jetzt);
  const warm = ERSTE_HAEUSER.map(([x, y]) => {
    const o = spiel.stand.objekte.find((q) => q.x === x && q.y === y && kat.KATALOG[q.typ].kategorie === 'haus');
    return !!o && spiel.netz.warm.has(o.id);
  });
  pruefe(ort, 'beide ERSTE_HAEUSER warm (in Node aus dem gespeicherten Stand)', warm.every(Boolean), warm.join(' / '));
}

async function kurzlauf667(browser, url) {
  const g = { b: 667, h: 375 }, ort = '667×375';
  const s = await seiteOeffnen(browser, url, g);
  try {
    await namenEingeben(s, ort);
    await schritt(s, ort, 'T01', lochTipp(s, ort, 'T01'), 'T02');
    for (const [id, nach] of [['T02', 'T03'], ['T03', 'T04'], ['T04', 'T05']]) await schritt(s, ort, id, weiterSchritt(s, ort, id), nach);
    await ruhe(s.p);
    const l = await lage(s.p);
    pruefe(ort, 'T05 erreicht, Anleiter-Karte zeigt seinen Text', l.schritt === 'T05' && (l.text || '').startsWith('Diese Häuser heizen noch mit Öl'), `${l.schritt} · „${l.text}“`);
    const ueber = await karteUeberLoch(s.p);
    pruefe(ort, 'T05: Anleiter-Karte schneidet keinen Lochrand', ueber.treffer.length === 0,
      ueber.karte ? `Karte ${ueber.karte}${ueber.treffer.length ? `; Lochrand ${ueber.treffer.join(' / ')}` : ''}` : 'keine Karte sichtbar');
  } catch (f) {
    if (!(f instanceof LaufAbbruch)) throw f;
    const l = await lage(s.p).catch(() => null);
    console.log(`       Abbruch des Laufs, letzte Lage: ${JSON.stringify(l)}`);
  } finally {
    pruefe(ort, 'keine Fehler in der Browser-Konsole', s.fehler.length === 0, s.fehler.join(' · ') || 'keine');
    await s.ctx.close();
  }
}

async function main() {
  let args;
  try { args = argumenteLesen(process.argv.slice(2)); } catch (fehler) { console.error(fehler.message); return 2; }
  const vite = await import(pathToFileURL(require.resolve('vite', { paths: [WURZEL] })).href);
  // In einem Arbeitsordner mit verknüpftem node_modules (Verknüpfung auf den Hauptordner) liefert der Dev-Server die Schriften
  // ohne Freigabe des echten Pfads mit 403 aus – die Konsolenprüfung schlüge dann zu Unrecht an.
  const erlaubt = { allow: [WURZEL, fs.realpathSync(path.join(WURZEL, 'node_modules'))] };
  let server, url = args.url;
  if (url) server = await vite.createServer({ root: WURZEL, logLevel: 'error', server: { middlewareMode: true, hmr: false, ws: false, fs: erlaubt }, appType: 'custom' });
  else {
    server = await vite.createServer({ root: WURZEL, logLevel: 'error', server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false, fs: erlaubt } });
    await server.listen();
    url = server.resolvedUrls.local[0];
  }
  let browser;
  try {
    const antwort = await fetch(url);
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    browser = await chromium.launch();
    console.log(`Browser-Durchklick NR13 · ${url} · ${new Date().toISOString()}`);
    await durchklick844(browser, url, server);
    await kurzlauf667(browser, url);
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
