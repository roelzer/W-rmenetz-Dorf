// Browser-Abnahme A92 / NR16-B2b (Tester-Vorarbeit): Lagen und Maße aus DESIGN.md 12.16–12.18 und 12.21 Punkt 4,
// die die DOM-Nachbildung der Vitest-Tests nicht messen kann (echte Schriften, echtes CSS, echte Kamera).
//
// Aufruf:  npm run test:browser            (startet selbst einen Vite-Dev-Server auf einem freien Port)
//          node tests/browser/a92-b2b.browser.cjs [--url http://localhost:5173/]   (fremder Vite-DEV-Server)
// Ausgabe: je Prüfpunkt „OK“ oder „FEHLT“ mit Messwert. Exit 0 nur, wenn alles OK ist; 1 bei FEHLT; 2 bei Aufbaufehlern.
//
// Prüfumgebung nach 12.21 Punkt 4: Chromium (Playwright), 844×390 und 667×375, Gerätefaktor 2, Touch an, Querformat,
// vor jedem Messen document.fonts.ready, Toleranz 1 px (Lage der Meldung ±2, Kamera ±16 laut Vorgabe), jede Größe einmal
// zusätzlich mit reducedMotion: 'reduce'. Sicherheitsabstand des Geräts 0.
//
// Messhilfen (nur im Testbrowser, nichts im Spielcode): Der Dev-Server liefert die Quellmodule einzeln aus. Die Seite
// lädt '/src/render/kamera.ts' (dieselbe Modul-Instanz wie das Spiel) und merkt sich die laufende Kamera, um die
// Bildschirmlage eines Hauses mit der Projektionsfunktion des Spiels zu lesen; '/src/ui/toast.ts' ruft die echte Meldung
// auf, um ihre Lage ohne/mit Blatt zu messen. Eine gebaute Vorschau (vite preview) kann das nicht – daher Dev-Server.
// Der Spielstand wird in Node aus den Kernmodulen erzeugt (wie werkzeuge/messe-bildrate.cjs) und per addInitScript abgelegt.
'use strict';
const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WURZEL = path.resolve(__dirname, '..', '..');
const SPIELSTAND_SCHLUESSEL = 'waermedorf-spielstand-v1';
const EINSTELLUNGS_SCHLUESSEL = 'waermedorf-einstellungen-v1';
/** Haus ohne Anschluss neben der Hauptleitung im Startdorf (wie tests/a92-anschlussweg.test.ts) */
const HAUS = { x: 9, y: 15 };
const TOL = 1, TOL_MELDUNG = 2, TOL_KAMERA = 16;
/** 46 Zeichen wie das Beispiel in 12.17. NR18-P0 (4.14): die Hausanschluss-Meldung entfällt, daher eine bleibende Meldung
 * gleicher Länge (Hinweis bei Planungsende, src/core/spiel.ts) */
const TEXT_46 = 'Bauabschnitt bereit – jetzt Häuser anschließen';
/** Erwartungen je Größe, von Hand aus DESIGN.md 12.16/12.18/12.21 */
const GROESSEN = [
  { b: 844, h: 390, worte: ['Außenanlagen', 'Leitungen'], kartenFrei: 620 },
  { b: 667, h: 375, worte: ['Außen', 'Netz'], kartenFrei: 450 },
];
const ZEICHENLEISTE_PX = 216, LEISTE_HOEHE = 64, ABSCHLUSS_HOEHE = 52, MELDUNG_MAX_H = 74, MELDUNG_RAND = 12, MELDUNG_ABSTAND = 12;

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
}
const r1 = (v) => (v == null || Number.isNaN(v) ? String(v) : String(Math.round(v * 10) / 10));
const nahe = (ist, soll, tol) => typeof ist === 'number' && Math.abs(ist - soll) <= tol;

// ───────────── Spielstand ─────────────
async function standErzeugen(server, stufe) {
  const sp = await server.ssrLoadModule('/src/core/spiel.ts');
  const sv = await server.ssrLoadModule('/src/core/speichern.ts');
  const jetzt = Date.now();
  const spiel = new sp.Spiel(sp.neuerSpielstand(jetzt), () => jetzt);
  spiel.ersteQuelleWaehlen('kessel');
  spiel.hz.stufe = stufe;
  spiel.stand.geld_eur = 1_000_000;
  spiel.stand.abschnitt = { phase: 'offen', bau: null };
  spiel.stand.namen_gefragt = true;
  const haus = spiel.stand.objekte.find((o) => o.x === HAUS.x && o.y === HAUS.y);
  if (!haus) throw new Error(`Im Startdorf steht bei (${HAUS.x}|${HAUS.y}) kein Haus mehr – Testaufbau anpassen.`);
  const text = sv.serialisieren(spiel.stand);
  const geprueft = sv.ladenMitBefund(text, jetzt);
  if (geprueft.befund !== 'ok') throw new Error(`Erzeugter Spielstand abgelehnt (Befund „${geprueft.befund}“).`);
  return { text, haus: { x: haus.x, y: haus.y, kante: 1 } };
}

function vorDemStart(opt) {
  localStorage.setItem(opt.standSchluessel, opt.stand);
  localStorage.setItem(opt.einstellungsSchluessel, JSON.stringify({ weniger_bewegung: false, kw_anzeigen: true, sparmodus: false }));
}

async function seiteOeffnen(browser, url, g, reduziert, stand) {
  const ctx = await browser.newContext({
    viewport: { width: g.b, height: g.h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    reducedMotion: reduziert ? 'reduce' : 'no-preference', serviceWorkers: 'block',
  });
  await ctx.addInitScript(vorDemStart, { stand: stand.text, standSchluessel: SPIELSTAND_SCHLUESSEL, einstellungsSchluessel: EINSTELLUNGS_SCHLUESSEL });
  const p = await ctx.newPage();
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(e.message));
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForFunction(() => !document.getElementById('vorspann'), null, { timeout: 30000, polling: 100 });
  // laufende Kamera des Spiels merken (dieselbe Modul-Instanz; schluessel() ruft die Bildschleife jedes Bild auf)
  const kameraDa = await p.evaluate(async () => {
    const m = await import('/src/render/kamera.ts');
    const alt = m.Kamera.prototype.schluessel;
    m.Kamera.prototype.schluessel = function (...a) { window.__kamera = this; return alt.apply(this, a); };
    for (let i = 0; i < 100 && !window.__kamera; i++) await new Promise((r) => setTimeout(r, 30));
    return !!window.__kamera;
  });
  if (!kameraDa) throw new Error('Kamera des Spiels nicht gefunden (läuft unter --url ein Vite-DEV-Server?)');
  await p.evaluate(() => document.fonts.ready);
  return { ctx, p, fehler };
}

const warten = (p, ms) => p.waitForTimeout(ms);
/** Bildschirmlage eines Objekts mit der Projektion des Spiels (Kamera.mitte + Lage der Leinwand) */
const objektLage = (p, o) => p.evaluate(({ x, y, kante }) => {
  const k = window.__kamera, c = document.querySelector('canvas').getBoundingClientRect();
  const [mx, my] = k.mitte(x + (kante - 1) / 2, y + (kante - 1) / 2);
  return { x: c.left + mx, y: c.top + my, zoom: k.zoom };
}, o);
/** Rechteck eines Elements (oder null) */
const rechteck = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; }, sel);
/** Knopf über Vorlesetext (aria-label) oder sichtbaren Textanfang finden und antippen; false, wenn es ihn nicht gibt */
async function tippeKnopf(p, anfang) {
  const ziel = await p.evaluate((a) => {
    const n = (t) => (t || '').replace(/\s+/g, ' ').trim();
    const k = [...document.querySelectorAll('button')].find((b) => b.offsetParent !== null && (n(b.getAttribute('aria-label')).startsWith(a) || n(b.innerText).startsWith(a)));
    if (!k) return null;
    k.scrollIntoView({ block: 'nearest', behavior: 'instant' }); // wie ein Spieler, der im Blatt hinscrollt
    const r = k.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, anfang);
  if (!ziel) return false;
  await p.touchscreen.tap(ziel.x, ziel.y);
  return true;
}
/** Die Zeichenleiste: Dialog/Abschnitt um den Knopf „Abschnitt abschließen“ – Selektor-Marke setzen */
const leisteMarkieren = (p) => p.evaluate(() => {
  document.querySelectorAll('[data-pruef-leiste]').forEach((e) => e.removeAttribute('data-pruef-leiste'));
  const k = [...document.querySelectorAll('button')].find((b) => b.offsetParent !== null && b.innerText.replace(/\s+/g, ' ').trim().startsWith('Abschnitt abschließen'));
  const l = k && k.closest('section,[role="dialog"],aside');
  if (l) l.setAttribute('data-pruef-leiste', '');
  return !!l;
});

/** Meldung mit Text auslösen (echte Funktion) und messen */
async function meldungMessen(p, text, reduziert) {
  if (text) await p.evaluate(async (t) => { const m = await import('/src/ui/toast.ts'); m.toast(t); }, text);
  await warten(p, reduziert ? 80 : 450);
  return p.evaluate(() => {
    const alle = document.querySelectorAll('#toast .toast');
    const t = alle[alle.length - 1];
    if (!t) return null;
    const r = t.getBoundingClientRect();
    const mx = r.left + r.width / 2, my = r.top + r.height / 2;
    const unter = document.elementFromPoint(mx, my);
    const blatt = [...document.querySelectorAll('section.blatt,[role="dialog"],aside')].filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0).sort((a, b) => a.left - b.left)[0];
    return { anzahl: alle.length, text: t.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, mitte: mx, unterTag: unter ? unter.tagName.toLowerCase() : null, blattLeft: blatt ? blatt.left : null };
  });
}
function meldungPruefen(lage, m, g, freiBis) {
  const was = `Meldung ${lage.split('·').pop().trim()}`;
  if (!m) { pruefe(lage, `${was}: sichtbar`, false, 'keine #toast .toast'); return; }
  const frei = freiBis ?? g.b;
  pruefe(lage, `${was}: genau eine`, m.anzahl === 1, `${m.anzahl}`);
  pruefe(lage, `${was}: Mitte x = ${r1(frei / 2)} ±${TOL_MELDUNG}`, nahe(m.mitte, frei / 2, TOL_MELDUNG), r1(m.mitte));
  const maxB = freiBis == null ? Math.min(420, g.b - 176) : Math.min(420, frei - 24);
  pruefe(lage, `${was}: Breite ≤ ${r1(maxB)}`, m.width <= maxB + TOL, r1(m.width));
  pruefe(lage, `${was}: Höhe ≤ ${MELDUNG_MAX_H}`, m.height <= MELDUNG_MAX_H + TOL, r1(m.height));
  pruefe(lage, `${was}: Unterkante = ${g.h - MELDUNG_RAND} ±${TOL_MELDUNG}`, nahe(m.bottom, g.h - MELDUNG_RAND, TOL_MELDUNG), r1(m.bottom));
  if (freiBis != null) pruefe(lage, `${was}: Abstand zum Blatt ≥ ${MELDUNG_ABSTAND}`, freiBis - m.right >= MELDUNG_ABSTAND - TOL, r1(freiBis - m.right));
  pruefe(lage, `${was}: Berührung geht durch (elementFromPoint = canvas)`, m.unterTag === 'canvas', m.unterTag);
}

/** Tippflächen: alle sichtbaren Knöpfe/Reiter unter `sel` ≥ 44×44, auch gesperrte */
async function tippflaechen(p, sel, lage, wo) {
  const zu = await p.evaluate(({ s, TOL }) => {
    const w = document.querySelector(s);
    if (!w) return null;
    return [...w.querySelectorAll('button,[role="tab"],input,[tabindex]:not([tabindex="-1"])')].filter((e) => e !== w && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')
      .map((e) => { const r = e.getBoundingClientRect(); return { name: (e.getAttribute('aria-label') || e.innerText || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 30), w: r.width, h: r.height }; })
      .filter((x) => x.w < 44 - TOL || x.h < 44 - TOL);
  }, { s: sel, TOL });
  if (zu === null) { pruefe(lage, `Tippflächen ${wo} ≥ 44×44`, false, `${wo} nicht gefunden`); return; }
  pruefe(lage, `Tippflächen ${wo} ≥ 44×44 (auch gesperrt)`, zu.length === 0, zu.length ? zu.map((x) => `${x.name} ${r1(x.w)}×${r1(x.h)}`).join('; ') : 'alle');
}

// ───────────── Prüfschritte ─────────────
async function reiterPruefen(p, g, lage) {
  const m = await p.evaluate(() => {
    const l = document.querySelector('[role="tablist"]');
    if (!l) return null;
    const lr = l.getBoundingClientRect();
    const tabs = [...l.querySelectorAll('[role="tab"]')].map((t) => {
      const r = t.getBoundingClientRect();
      return { wort: t.innerText.replace(/\s+/g, ' ').trim(), sel: t.getAttribute('aria-selected'), innen: r.left >= lr.left - 1 && r.right <= lr.right + 1 && r.top >= lr.top - 1 && r.bottom <= lr.bottom + 1, w: r.width, h: r.height };
    });
    return { hoehe: lr.height, sw: l.scrollWidth, cw: l.clientWidth, tabs };
  });
  if (!m) { pruefe(lage, 'Reiterleiste role="tablist"', false, 'nicht gefunden'); return; }
  pruefe(lage, `Reiterleiste Höhe ${LEISTE_HOEHE} ±${TOL}`, nahe(m.hoehe, LEISTE_HOEHE, TOL), r1(m.hoehe));
  pruefe(lage, 'Reiterleiste scrollWidth === clientWidth', m.sw === m.cw, `${m.sw} / ${m.cw}`);
  pruefe(lage, 'Reiterleiste: fünf Reiter', m.tabs.length === 5, `${m.tabs.length}`);
  pruefe(lage, 'Reiter ganz in der Leiste', m.tabs.length > 0 && m.tabs.every((t) => t.innen), m.tabs.filter((t) => !t.innen).map((t) => t.wort).join(', ') || 'alle');
  pruefe(lage, 'Reiter ≥ 44×44', m.tabs.length > 0 && m.tabs.every((t) => t.w >= 44 - TOL && t.h >= 44 - TOL), m.tabs.map((t) => `${r1(t.w)}×${r1(t.h)}`).join(' '));
  pruefe(lage, `sichtbare Wörter Reiter 2/3 = ${g.worte.join(' / ')}`, m.tabs[1]?.wort === g.worte[0] && m.tabs[2]?.wort === g.worte[1], m.tabs.map((t) => t.wort).join(' · '));
  pruefe(lage, 'genau ein Reiter aria-selected="true"', m.tabs.filter((t) => t.sel === 'true').length === 1, m.tabs.map((t) => String(t.sel)).join(' '));
}

async function zeichenleistePruefen(p, g, lage) {
  // Erste-Nutzung-Hilfe schließen, falls offen (12.18)
  await tippeKnopf(p, 'Verstanden');
  await warten(p, 250);
  if (!(await leisteMarkieren(p))) {
    const da = await p.evaluate(() => [...document.querySelectorAll('button')].filter((k) => k.offsetParent !== null).map((k) => (k.getAttribute('aria-label') || k.innerText).replace(/\s+/g, ' ').trim().slice(0, 25)).join(' | '));
    pruefe(lage, 'Zeichenleiste offen', false, `kein Knopf „Abschnitt abschließen“; sichtbar: ${da}`);
    return null;
  }
  const m = await p.evaluate(() => {
    const l = document.querySelector('[data-pruef-leiste]');
    const r = l.getBoundingClientRect();
    const knoepfe = [...l.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => { const q = b.getBoundingClientRect(); return { name: (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim().slice(0, 30), q: { left: q.left, right: q.right, top: q.top, bottom: q.bottom, w: q.width, h: q.height } }; });
    const scroller = [l, ...l.querySelectorAll('*')].filter((e) => e === l || /(auto|scroll)/.test(getComputedStyle(e).overflowY)).map((e) => ({ sh: e.scrollHeight, ch: e.clientHeight, cls: e === l ? 'Leiste' : (e.className || e.tagName) }));
    const ab = [...l.querySelectorAll('button')].find((b) => b.innerText.replace(/\s+/g, ' ').trim().startsWith('Abschnitt abschließen'));
    const abQ = ab.getBoundingClientRect();
    const abgeschnitten = [ab, ...ab.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0).map((e) => e.className || e.tagName);
    return { left: r.left, width: r.width, knoepfe, scroller, abH: abQ.height, abgeschnitten, innerH: innerHeight, innerW: innerWidth };
  });
  pruefe(lage, `Zeichenleiste Breite ${ZEICHENLEISTE_PX} ±${TOL}`, nahe(m.width, ZEICHENLEISTE_PX, TOL), r1(m.width));
  pruefe(lage, `Kartenfläche links ≥ ${g.kartenFrei}`, m.left >= g.kartenFrei - TOL, r1(m.left));
  const raus = m.knoepfe.filter((k) => k.q.bottom > m.innerH + TOL || k.q.top < -TOL || k.q.right > m.innerW + TOL || k.q.left < -TOL);
  pruefe(lage, 'alle Knöpfe der Leiste ganz im Bild', raus.length === 0, raus.map((k) => `${k.name} unten ${r1(k.q.bottom)}`).join('; ') || `${m.knoepfe.length} Knöpfe`);
  const klein = m.knoepfe.filter((k) => k.q.w < 44 - TOL || k.q.h < 44 - TOL);
  pruefe(lage, 'Knöpfe der Leiste ≥ 44×44 (auch gesperrt)', klein.length === 0, klein.map((k) => `${k.name} ${r1(k.q.w)}×${r1(k.q.h)}`).join('; ') || 'alle');
  const sb = m.scroller.filter((s) => s.sh > s.ch + 1);
  pruefe(lage, 'kein Scrollbalken an Leiste/Mittelteil (scrollHeight ≤ clientHeight + 1)', sb.length === 0, sb.map((s) => `${s.cls} ${s.sh}/${s.ch}`).join('; ') || `${m.scroller.length} geprüft`);
  pruefe(lage, `„Abschnitt abschließen“ Höhe ${ABSCHLUSS_HOEHE} ±${TOL}`, nahe(m.abH, ABSCHLUSS_HOEHE, TOL), r1(m.abH));
  pruefe(lage, '„Abschnitt abschließen“: Zeile 2 nicht abgeschnitten', m.abgeschnitten.length === 0, m.abgeschnitten.join(', ') || 'nichts abgeschnitten');
  return m;
}

async function lauf(browser, url, server, g, reduziert) {
  const lageBasis = `${g.b}×${g.h}${reduziert ? ' weniger Bewegung' : ''}`;
  const stand1 = await standErzeugen(server, 1);
  const s = await seiteOeffnen(browser, url, g, reduziert, stand1);
  const { p } = s;
  try {
    // (1) Meldung ohne Blatt
    meldungPruefen(`${lageBasis} · ohne Blatt`, await meldungMessen(p, TEXT_46, reduziert), g, null);

    // (2) Baumenü: Reiter (Heizhaus aktiv, dann Deko aktiv), Meldung im Seitenblatt, Blattkopf
    if (!(await tippeKnopf(p, 'Bauen'))) pruefe(lageBasis, 'Knopf „Bauen“', false, 'nicht gefunden');
    await warten(p, 500);
    await p.evaluate(() => document.fonts.ready);
    await reiterPruefen(p, g, `${lageBasis} · Baumenü`);
    await tippflaechen(p, 'section.blatt .kopf', `${lageBasis} · Baumenü`, 'Blattkopf');
    if (await tippeKnopf(p, 'Deko')) { await warten(p, 300); await reiterPruefen(p, g, `${lageBasis} · Baumenü Deko aktiv`); }
    else pruefe(`${lageBasis} · Baumenü Deko aktiv`, 'Reiter „Deko“ antippbar', false, 'nicht gefunden');
    const blattB = await rechteck(p, 'section.blatt');
    meldungPruefen(`${lageBasis} · Seitenblatt (Baumenü)`, await meldungMessen(p, TEXT_46, reduziert), g, blattB ? blattB.left : null);
    await tippeKnopf(p, 'Schließen');
    await warten(p, 400);

    // (3) Hausblatt: Kamera-Lage des Hauses (12.21 Punkt 4; y = 0,58 · Höhe nach ENTSCHEIDUNGEN 2026-11-05 Tester-Fragen B2b)
    const vorher = await objektLage(p, stand1.haus);
    await p.touchscreen.tap(vorher.x, vorher.y);
    await warten(p, 600);
    const blattH = await rechteck(p, 'section.blatt');
    if (!blattH) pruefe(`${lageBasis} · Hausblatt`, 'Hausblatt offen nach Antippen des Hauses', false, `getippt bei ${r1(vorher.x)}|${r1(vorher.y)}`);
    else {
      const nach = await objektLage(p, stand1.haus);
      const sollX = blattH.left / 2;
      pruefe(`${lageBasis} · Hausblatt`, `Kamera: Haus x = ${r1(sollX)} ±${TOL_KAMERA}`, nahe(nach.x, sollX, TOL_KAMERA), r1(nach.x));
      pruefe(`${lageBasis} · Hausblatt`, `Kamera: Haus y = 0,58·${g.h} = ${r1(0.58 * g.h)} ±${TOL_KAMERA}`, nahe(nach.y, 0.58 * g.h, TOL_KAMERA), r1(nach.y));
      pruefe(`${lageBasis} · Hausblatt`, 'Kamera: Zoom unverändert', nach.zoom === vorher.zoom, `${vorher.zoom} → ${nach.zoom}`);
      await tippflaechen(p, 'section.blatt .kopf', `${lageBasis} · Hausblatt`, 'Blattkopf');
      meldungPruefen(`${lageBasis} · Seitenblatt (Hausblatt)`, await meldungMessen(p, TEXT_46, reduziert), g, blattH.left);

      // (4) „Leitung selbst legen“ → Zeichenleiste: Kamera, Maße, Meldung beim Antippen eines gesperrten Knopfs
      const zoomVor = nach.zoom;
      if (!(await tippeKnopf(p, 'Leitung selbst legen'))) pruefe(`${lageBasis} · Zeichenleiste`, '„Leitung selbst legen“ im Hausblatt', false, 'nicht gefunden');
      await warten(p, 600);
      const zl = await objektLage(p, stand1.haus);
      const sollZX = (g.b - ZEICHENLEISTE_PX) / 2;
      pruefe(`${lageBasis} · Zeichenleiste`, `Kamera: Haus x = (${g.b} − 216)/2 = ${r1(sollZX)} ±${TOL_KAMERA}`, nahe(zl.x, sollZX, TOL_KAMERA), r1(zl.x));
      pruefe(`${lageBasis} · Zeichenleiste`, `Kamera: Haus y = 0,5·${g.h} = ${r1(0.5 * g.h)} ±${TOL_KAMERA}`, nahe(zl.y, 0.5 * g.h, TOL_KAMERA), r1(zl.y));
      pruefe(`${lageBasis} · Zeichenleiste`, 'Kamera: Zoom unverändert', zl.zoom === zoomVor, `${zoomVor} → ${zl.zoom}`);
      const m = await zeichenleistePruefen(p, g, `${lageBasis} · Zeichenleiste Stufe 1`);
      if (m) {
        // gesperrtes „Abschnitt abschließen“ (0 Leitungen, 12.21 Punkt 1) antippen: Meldung links der Leiste, Leiste bleibt offen
        await tippeKnopf(p, 'Abschnitt abschließen');
        const mel = await meldungMessen(p, null, reduziert);
        // die gemessene Meldung muss die des Antippens sein (B6-Hinweis, 12.21 Punkt 1), nicht eine ältere
        pruefe(`${lageBasis} · Zeichenleiste (gesperrt angetippt)`, 'Meldung = B6-Hinweis', !!mel && mel.text.replace(/\s+/g, ' ').trim() === 'Noch nichts gezeichnet. Wähle eine Leitung und zieh sie in der Karte.', mel ? mel.text : 'keine');
        meldungPruefen(`${lageBasis} · Zeichenleiste (gesperrt angetippt)`, mel, g, m.left);
        pruefe(`${lageBasis} · Zeichenleiste (gesperrt angetippt)`, 'Leiste bleibt offen', await leisteMarkieren(p), '');
      }
    }
  } finally {
    if (s.fehler.length) pruefe(lageBasis, 'keine Seitenfehler', false, s.fehler.join(' · '));
    await s.ctx.close();
  }

  // (5) Stufe 3: zwei Reihen Farbknöpfe – alles im Bild, kein Scrollbalken (12.21 Punkt 4)
  const stand3 = await standErzeugen(server, 3);
  const s3 = await seiteOeffnen(browser, url, g, reduziert, stand3);
  try {
    const l = await objektLage(s3.p, stand3.haus);
    await s3.p.touchscreen.tap(l.x, l.y);
    await warten(s3.p, 600);
    if (await tippeKnopf(s3.p, 'Leitung selbst legen')) { await warten(s3.p, 600); await zeichenleistePruefen(s3.p, g, `${lageBasis} · Zeichenleiste Stufe 3`); }
    else pruefe(`${lageBasis} · Zeichenleiste Stufe 3`, '„Leitung selbst legen“ im Hausblatt', false, 'nicht gefunden');
  } finally {
    if (s3.fehler.length) pruefe(`${lageBasis} · Stufe 3`, 'keine Seitenfehler', false, s3.fehler.join(' · '));
    await s3.ctx.close();
  }
}

async function main() {
  let args;
  try { args = argumenteLesen(process.argv.slice(2)); } catch (fehler) { console.error(fehler.message); return 2; }
  const vite = await import(pathToFileURL(require.resolve('vite', { paths: [WURZEL] })).href);
  let server, url = args.url;
  if (url) server = await vite.createServer({ root: WURZEL, logLevel: 'error', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  else {
    server = await vite.createServer({ root: WURZEL, logLevel: 'error', server: { host: '127.0.0.1', port: 0, strictPort: false, hmr: false } });
    await server.listen();
    url = server.resolvedUrls.local[0];
  }
  let browser;
  try {
    const antwort = await fetch(url);
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    browser = await chromium.launch();
    console.log(`Browser-Abnahme A92 / NR16-B2b · ${url} · ${new Date().toISOString()}`);
    for (const g of GROESSEN) for (const reduziert of [false, true]) await lauf(browser, url, server, g, reduziert);
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
