// Messwerkzeug Bildrate (A90, Zielwerte Z1–Z10 aus docs/bauplaene/NR12-fluessig.md, Abschnitt 6).
//
// Aufruf:  node werkzeuge/messe-bildrate.cjs [--url http://localhost:4317/] [--nur-bericht] [--vorher-speichern]
// Voraussetzung: gebaute Vorschau läuft (npm run build && npx vite preview --port 4317).
// Exit 0 nur, wenn Z1–Z10 erfüllt sind (mit --nur-bericht immer 0); Exit 2 bei Bedienungs- oder Aufbaufehlern.
// --vorher-speichern schreibt die Werte für Z8/Z9 nach werkzeuge/nr12-vorher.json (Lauf auf dem Basis-Commit).
//
// Einordnung: Chromium kopflos ohne Grafikkarte rastert in Software. Absolute Bildraten sind deshalb schlechter
// als auf einem Handy; übertragbar sind Befehle je Bild, JS-Zeit je Bild, Pixelzahl und vorher/nachher-Verhältnisse.
// Der große Spielstand wird aus dem Quellcode dieses Ordners erzeugt (Vite lädt die Kernmodule in Node) und nur im
// Testbrowser in localStorage gelegt.
'use strict';
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const WURZEL = path.resolve(__dirname, '..');
const VORHER_DATEI = path.join(__dirname, 'nr12-vorher.json');
const SPIELSTAND_SCHLUESSEL = 'waermedorf-spielstand-v1';
const EINSTELLUNGS_SCHLUESSEL = 'waermedorf-einstellungen-v1';
/** „Nicht schlechter“ = höchstens 10 % über vorher (Messrauschen, Bauplan Abschnitt 6). */
const NICHT_SCHLECHTER_FAKTOR = 1.10;
/** Ein Bild-Rückruf zählt als JS-Arbeit erst ab 0,3 ms (Bauplan P4: FireAnimationFrame > 0,3 ms); darunter liegt der Zählrückruf. */
const JS_MIN_MS = 0.3;
const RUHE_MS = 4000, GESTE_MS = 3000;
/** Zeitmessungen (Z4, Z5, Z8, Z9) laufen in mehreren frischen Seiten; die Werte werden gepoolt. Ein einzelnes Fenster
 *  schwankte im Vorlauf um ein ganzes Bildintervall (p95 50 ↔ 66,7 ms), weil die Abstände in 16,7-ms-Stufen liegen. */
const WIEDERHOLUNGEN = 5;
/** Zielgrenzen Z1–Z7 (Bauplan Abschnitt 6). */
const GRENZE = {
  z1_bilder_s: 3, z2_bilder_s: 5, z3_bilder_s: 31, z3_befehle: 9000, z4_js_p95_ms: 32, z5_js_p95_ms: 36,
  z6_weitere_bilder: 0, z6_animationen: 2, z7_handy_px: 1_500_000, z7_laptop_px: 2_000_000, z7_spar_px: 550_000,
};
const Z6_ERLAUBT = ['vs-laden', 'vs-plopp'];
/** Z10: Stichprobe 40×40 CSS-Pixel um den Tipp, Vergleich vor dem Tipp und 2 Bildaufrufe danach. */
const Z10_KANTE_PX = 40, Z10_BILDAUFRUFE = 2;
/** Nur zum Vergleich mit Bauplan Abschnitt 1 (16 900 / 8 600 Befehle): dort wurden nur diese Zeichenbefehle gezählt.
 *  Z3 prüft wie im Bauplan (Technik P4) alle Methoden. */
const AUSWAHL_ABSCHNITT_1 = ['fill', 'stroke', 'fillRect', 'fillText', 'strokeText', 'arc', 'ellipse', 'createRadialGradient', 'createLinearGradient', 'lineTo', 'measureText'];

function argumenteLesen(argv) {
  const a = { url: 'http://localhost:4317/', nurBericht: false, vorherSpeichern: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--nur-bericht') a.nurBericht = true;
    else if (x === '--vorher-speichern') a.vorherSpeichern = true;
    else if (x === '--url' && argv[i + 1]) a.url = argv[++i];
    else if (x.startsWith('--url=')) a.url = x.slice(6);
    else throw new Error(`Unbekanntes Argument „${x}“. Erlaubt: --url <adresse>, --nur-bericht, --vorher-speichern`);
  }
  return a;
}

/** Perzentil nach dem Rang-Verfahren (kleinster Wert, unter dem mindestens q·n Werte liegen); leere Liste → null. */
function perzentil(werte, q) {
  if (!werte.length) return null;
  const s = [...werte].sort((x, y) => x - y);
  return s[Math.max(0, Math.ceil(q * s.length) - 1)];
}
const runde = (v, stellen = 1) => (v == null ? null : Number(v.toFixed(stellen)));

/** Großer Spielstand wie Bauplan Abschnitt 1: Leitung d40 auf jedem freien Straßenfeld, jedes Haus mit passender Station,
 *  6 Gaskessel Stufe 3 in der Heizzentrale, Namensfrage erledigt. */
async function grossenStandErzeugen() {
  const vite = await import(pathToFileURL(require.resolve('vite', { paths: [WURZEL] })).href);
  const server = await vite.createServer({ root: WURZEL, logLevel: 'error', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    const sp = await server.ssrLoadModule('/src/core/spiel.ts');
    const sv = await server.ssrLoadModule('/src/core/speichern.ts');
    const kat = await server.ssrLoadModule('/src/core/katalog.ts');
    const orte = await server.ssrLoadModule('/src/core/orte.ts');
    const netz = await server.ssrLoadModule('/src/core/netz.ts');
    const jetzt = Date.now();
    const stand = sp.neuerSpielstand(jetzt);
    const N = kat.KONSTANTEN.feldanzahl;
    const belegt = netz.belegungskarte(stand.objekte);
    let id = stand.naechste_id;
    for (const [x, y] of orte.ortHolen(stand.ort).strassen) {
      if (belegt[y * N + x]) continue;
      stand.objekte.push({ id: id++, typ: 'd40', x, y, stufe: 1, bau: null, kasse_eur: 0 });
    }
    stand.naechste_id = id;
    for (const o of stand.objekte) {
      if (kat.KATALOG[o.typ].kategorie !== 'haus') continue;
      delete o.ohne_station;
      o.station = kat.passendeStation(kat.KATALOG[o.typ].bedarf_kw).id;
    }
    stand.namen_gefragt = true;
    // Ohne quelle_gewaehlt ruft steuerung.ts beim Start ersteQuelleWaehlen('kessel'), und das leert `innen`.
    stand.quelle_gewaehlt = true;
    stand.innen = Array.from({ length: 6 }, () => ({ typ: 'gas', stufe: 3, bau: null }));
    const text = sv.serialisieren(stand);
    const geprueft = sv.ladenMitBefund(text, jetzt);
    if (geprueft.befund !== 'ok') throw new Error(`Der erzeugte Spielstand wird vom Spiel nicht angenommen (Befund „${geprueft.befund}“).`);
    const spiel = new sp.Spiel(geprueft.stand, () => jetzt);
    spiel.bis(jetzt);
    const zahl = {
      objekte: stand.objekte.length,
      leitungen: stand.objekte.filter((o) => kat.istLeitung(o.typ)).length,
      haeuser: stand.objekte.filter((o) => kat.KATALOG[o.typ].kategorie === 'haus').length,
      quellen: spiel.stand.innen.map((k) => `${k.typ}${k.stufe}`).join(' '),
      warme_kunden: spiel.netz.warm.size,
      leitungen_mit_fluss: [...spiel.netz.last_kw.values()].filter((v) => v > 0).length,
    };
    return { text, zahl };
  } finally {
    await server.close();
  }
}

/** Läuft im Testbrowser vor jedem Skript der Seite: Spielstand/Einstellungen setzen, Bildaufrufe und Canvas-Befehle zählen. */
function seitenMessung(opt) {
  if (opt.stand) localStorage.setItem(opt.standSchluessel, opt.stand);
  localStorage.setItem(opt.einstellungsSchluessel, JSON.stringify(opt.einstellungen));
  const m = { raf: [], bilder: [], lange: [], befehle: 0, auswahl: 0, verdecktVorher: true, zaehlen: opt.zaehlen, original: {} };
  window.__mess = m;
  const verdeckt = () => { const v = document.getElementById('vorspann'); return !!v && !v.classList.contains('aus'); };
  // Die Befehle zwischen zwei Zählrückrufen stammen aus dem Bild davor; deshalb gilt der Vorspann-Zustand des vorigen Rückrufs.
  const lauf = (t) => {
    m.raf.push(t);
    if (m.zaehlen) { m.bilder.push([t, m.befehle, m.verdecktVorher, m.auswahl]); m.befehle = 0; m.auswahl = 0; m.verdecktVorher = verdeckt(); }
    requestAnimationFrame(lauf);
  };
  requestAnimationFrame(lauf);
  m.original.getImageData = CanvasRenderingContext2D.prototype.getImageData;
  if (m.zaehlen) {
    const umwickeln = (P) => {
      for (const n of Object.getOwnPropertyNames(P)) {
        const d = Object.getOwnPropertyDescriptor(P, n);
        if (!d || typeof d.value !== 'function' || n === 'constructor') continue;
        const f = d.value;
        P[n] = opt.auswahl.includes(n)
          ? function (...a) { m.befehle++; m.auswahl++; return f.apply(this, a); }
          : function (...a) { m.befehle++; return f.apply(this, a); };
      }
    };
    umwickeln(CanvasRenderingContext2D.prototype);
    if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') umwickeln(OffscreenCanvasRenderingContext2D.prototype);
  }
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) m.lange.push(e.duration); }).observe({ type: 'longtask', buffered: true });
  } catch (fehler) {
    console.warn('Messung: Long-Task-Beobachter nicht verfügbar', fehler);
  }
}

/** Eine Browser-Sitzung mit eigenem Kontext (Gerät, Drossel, Einstellungen). */
async function sitzungOeffnen(browser, f, stand) {
  const ctx = await browser.newContext({
    viewport: { width: f.breite ?? 844, height: f.hoehe ?? 390 }, deviceScaleFactor: f.faktor ?? 3,
    hasTouch: f.touch ?? true, isMobile: f.touch ?? true, serviceWorkers: 'block',
  });
  await ctx.addInitScript(seitenMessung, {
    stand, standSchluessel: SPIELSTAND_SCHLUESSEL, einstellungsSchluessel: EINSTELLUNGS_SCHLUESSEL, zaehlen: !!f.zaehlen, auswahl: AUSWAHL_ABSCHNITT_1,
    einstellungen: { weniger_bewegung: !!f.weniger_bewegung, kw_anzeigen: true, sparmodus: !!f.sparmodus },
  });
  const p = await ctx.newPage();
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: f.drossel ?? 1 });
  return { ctx, p, cdp, fehler };
}

async function aufSpielWarten(p, url) {
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForFunction(() => !document.getElementById('vorspann'), null, { timeout: 30000, polling: 100 });
  await p.waitForTimeout(500);
  return p.evaluate(() => {
    const k = document.getElementById('karte');
    const blatt = document.querySelector('.blatt h2');
    return { leinwand_px: [k.width, k.height], offenes_blatt: blatt ? blatt.textContent : null };
  });
}

/** Ablaufverfolgung (CDP Tracing) je Phase: JS-Dauer je Bild-Rückruf und Übergabe (Commit) auf dem Hauptthread. */
async function verfolgungStarten(cdp) {
  const ereignisse = [];
  const sammeln = (e) => { for (const x of e.value) ereignisse.push(x); };
  cdp.on('Tracing.dataCollected', sammeln);
  // Commit (Leinwand-Übergabe) liegt nur in der zusätzlichen Kategorie disabled-by-default-devtools.timeline.
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
  return async () => {
    const fertig = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end');
    await fertig;
    cdp.off('Tracing.dataCollected', sammeln);
    const haupt = new Set();
    for (const e of ereignisse) if (e.name === 'thread_name' && String(e.args?.name).startsWith('CrRendererMain')) haupt.add(`${e.pid}:${e.tid}`);
    if (!haupt.size) throw new Error('Ablaufverfolgung ohne Hauptthread (CrRendererMain) – JS-Zeit nicht messbar.');
    const js = [], uebergabe = [];
    for (const e of ereignisse) {
      if (e.ph !== 'X' || !e.dur || !haupt.has(`${e.pid}:${e.tid}`)) continue;
      const ms = e.dur / 1000;
      if (e.name === 'FireAnimationFrame' && ms > JS_MIN_MS) js.push(ms);
      else if (e.name === 'Commit') uebergabe.push(ms);
    }
    return { js, uebergabe };
  };
}

async function fensterLeeren(p) {
  await p.evaluate(() => { const m = window.__mess; m.raf = []; m.bilder = []; m.lange = []; m.befehle = 0; m.auswahl = 0; });
}
async function fensterLesen(p) {
  return p.evaluate(() => { const m = window.__mess; return { raf: m.raf.slice(), bilder: m.bilder.slice(), lange: m.lange.slice() }; });
}

/** Rohwerte eines Messfensters: Bildabstände der rAF-Aufrufe, Zählbilder, Long Tasks, JS je Bild und Übergabe aus der Spur. */
async function phase(s, dauer_ms, aktion, verfolgen) {
  await fensterLeeren(s.p);
  const stop = verfolgen ? await verfolgungStarten(s.cdp) : null;
  const t0 = Date.now();
  if (aktion) await aktion(t0 + dauer_ms);
  const rest = dauer_ms - (Date.now() - t0);
  if (rest > 0) await s.p.waitForTimeout(rest);
  const f = await fensterLesen(s.p);
  const gemessen = Date.now() - t0;
  const spur = stop ? await stop() : null;
  const abstand = [];
  for (let i = 1; i < f.raf.length; i++) abstand.push(f.raf[i] - f.raf[i - 1]);
  return { dauer_ms: gemessen, aufrufe: f.raf.length, abstand, bilder: f.bilder, lange: f.lange.length, spur };
}

/** Fasst ein oder mehrere Messfenster desselben Falls zusammen (Werte werden gepoolt, nicht gemittelt). */
function auswerten(fenster) {
  const alle = (f) => fenster.flatMap(f);
  const abstand = alle((w) => w.abstand), bilder = alle((w) => w.bilder);
  const dauer_ms = fenster.reduce((x, w) => x + w.dauer_ms, 0);
  const gezeichnet = bilder.filter((b) => b[1] > 0);
  const befehle = gezeichnet.reduce((x, b) => x + b[1], 0), auswahl = gezeichnet.reduce((x, b) => x + b[3], 0);
  const verfolgt = fenster.every((w) => w.spur);
  const js = alle((w) => (w.spur ? w.spur.js : [])), uebergabe = alle((w) => (w.spur ? w.spur.uebergabe : []));
  return {
    fenster: fenster.length,
    dauer_ms,
    aufrufe: fenster.reduce((x, w) => x + w.aufrufe, 0),
    abstand_p50_ms: runde(perzentil(abstand, 0.5)),
    abstand_p95_ms: runde(perzentil(abstand, 0.95)),
    // 17,5 bzw. 34 ms statt 16,7/33,3: rAF-Zeitstempel schwanken um Bruchteile, gemeint ist „ein Bild verpasst“.
    ueber_17_pct: abstand.length ? Math.round((100 * abstand.filter((v) => v > 17.5).length) / abstand.length) : null,
    ueber_33_pct: abstand.length ? Math.round((100 * abstand.filter((v) => v > 34).length) / abstand.length) : null,
    gezeichnet_s: bilder.length ? runde((1000 * gezeichnet.length) / dauer_ms) : null,
    befehle_je_bild: gezeichnet.length ? Math.round(befehle / gezeichnet.length) : null,
    befehle_auswahl_je_bild: gezeichnet.length ? Math.round(auswahl / gezeichnet.length) : null,
    lange_aufgaben: fenster.reduce((x, w) => x + w.lange, 0),
    js_p50_ms: verfolgt ? runde(perzentil(js, 0.5)) : null,
    js_p95_ms: verfolgt ? runde(perzentil(js, 0.95)) : null,
    uebergabe_p50_ms: verfolgt ? runde(perzentil(uebergabe, 0.5)) : null,
  };
}

const finger = (s, typ, punkte) => s.cdp.send('Input.dispatchTouchEvent', { type: typ, touchPoints: punkte });

/** Ein Finger zieht abwechselnd nach rechts und links, bis die Phase endet (bei 4× dauert jede Bewegung lange,
 *  deshalb wird auch mitten im Zug abgebrochen, damit das Fenster nicht über die Phasendauer hinauswächst). */
async function verschieben(s, ende) {
  for (let r = 0; Date.now() < ende; r++) {
    const richtung = r % 2 ? -1 : 1;
    await finger(s, 'touchStart', [{ x: 300, y: 200 }]);
    for (let i = 1; i <= 30 && Date.now() < ende; i++) await finger(s, 'touchMove', [{ x: 300 + i * 8 * richtung, y: 200 + i * 2 }]);
    await finger(s, 'touchEnd', []);
  }
}

/** Zwei Finger zoomen und drehen gleichzeitig, abwechselnd auf und zu, bis die Phase endet. */
async function zoomenDrehen(s, ende) {
  for (let r = 0; Date.now() < ende; r++) {
    const richtung = r % 2 ? -1 : 1;
    const lage = (i) => {
      const w = i * 0.02 * richtung, d = richtung > 0 ? 40 + i * 3 : 130 - i * 3;
      return [{ x: 420 - Math.cos(w) * d, y: 200 - Math.sin(w) * d, id: 0 }, { x: 420 + Math.cos(w) * d, y: 200 + Math.sin(w) * d, id: 1 }];
    };
    await finger(s, 'touchStart', lage(0));
    for (let i = 1; i <= 30 && Date.now() < ende; i++) await finger(s, 'touchMove', lage(i));
    await finger(s, 'touchEnd', []);
  }
}

/** Z6: Bilder unter dem Vorspann und laufende CSS-Animationen 1 s nach dem Start. */
async function vorspannMessen(s, url) {
  await s.p.goto(url, { waitUntil: 'load' });
  await s.p.waitForFunction(() => performance.now() >= 1000, null, { polling: 'raf', timeout: 10000 });
  const anim = await s.p.evaluate(() => ({
    nach_ms: Math.round(performance.now()),
    namen: [...new Set(document.getAnimations().filter((a) => a.playState === 'running' && a.animationName).map((a) => a.animationName))].sort(),
  }));
  await s.p.waitForFunction(() => { const v = document.getElementById('vorspann'); return !v || v.classList.contains('aus'); }, null, { timeout: 30000, polling: 'raf' });
  // ein Bildaufruf mehr, damit die Befehle des letzten verdeckten Bildes gezählt sind
  await s.p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  const bilder = await s.p.evaluate(() => window.__mess.bilder.filter((b) => b[2] && b[1] > 0).length);
  return { bilder_verdeckt: bilder, weitere_bilder: Math.max(0, bilder - 1), animationen_nach_1s: anim.namen, animationen_gemessen_ms: anim.nach_ms };
}

/** Z10: Gebäude antippen, auf dem die Kamera nach dem Start steht (Heizzentrale 30 px unter der Bildmitte, kamera.ts `zentrieren`;
 *  im großen Stand liegt dort zuvorderst ein Haus). Getroffen = ein Kontextblatt öffnet sich.
 *  Leerprobe ohne Tipp zeigt, ob sich die Stichprobe auch ohne Eingabe ändert (dann ist der Tipp-Vergleich nicht aussagekräftig). */
async function antippenMessen(s) {
  const probe = (mitTipp) => s.p.evaluate(([mitTipp, kante, aufrufe]) => new Promise((fertig, fehlschlag) => {
    const k = document.getElementById('karte'), r = k.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2 + 30, f = k.width / r.width;
    const lesen = () => window.__mess.original.getImageData.call(k.getContext('2d'), Math.round((x - r.left - kante / 2) * f), Math.round((y - r.top - kante / 2) * f), Math.round(kante * f), Math.round(kante * f)).data;
    const vergleichen = (a) => {
      let n = 0;
      const warten = () => requestAnimationFrame(() => {
        // Erst nach den übrigen Rückrufen dieses Bildaufrufs lesen, damit das Spiel sein Bild schon gezeichnet hat.
        if (++n < aufrufe) { warten(); return; }
        setTimeout(() => {
          const b = lesen();
          let anders = 0;
          for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) anders++;
          fertig({ punkt: [Math.round(x), Math.round(y)], pixel: a.length / 4, geaendert: anders, blatt: document.querySelector('.blatt h2')?.textContent ?? null });
        }, 0);
      });
      warten();
    };
    if (!mitTipp) { vergleichen(lesen()); return; }
    // Vorher-Bild genau beim Loslassen lesen, bevor das Spiel den Tipp verarbeitet (Zuhörer im Einfangschritt am Fenster).
    window.addEventListener('pointerup', () => vergleichen(lesen()), { capture: true, once: true });
    setTimeout(() => fehlschlag(new Error('Kein pointerup innerhalb von 5 s – der Tipp kam nicht an.')), 5000);
    window.__mess.tippBereit = [x, y];
  }), [mitTipp, Z10_KANTE_PX, Z10_BILDAUFRUFE]);
  const leer = await probe(false);
  const tippErgebnis = probe(true);
  const punkt = await s.p.waitForFunction(() => window.__mess.tippBereit, null, { polling: 50 }).then((h) => h.jsonValue());
  await finger(s, 'touchStart', [{ x: punkt[0], y: punkt[1] }]);
  await finger(s, 'touchEnd', []);
  const tipp = await tippErgebnis;
  return { leer, tipp };
}

async function messen(args) {
  const { text: stand, zahl } = await grossenStandErzeugen();
  const browser = await chromium.launch();
  const erg = { stand: zahl, faelle: {}, info: {}, seitenfehler: [] };
  const sitzung = async (name, f, ablauf) => {
    const s = await sitzungOeffnen(browser, f, stand);
    try { await ablauf(s); } finally {
      for (const m of s.fehler) erg.seitenfehler.push(`${name}: ${m}`);
      await s.ctx.close();
    }
  };
  try {
    await sitzung('1x normal (Zählung)', { zaehlen: true }, async (s) => {
      erg.z6 = await vorspannMessen(s, args.url);
      await s.p.waitForFunction(() => !document.getElementById('vorspann'), null, { timeout: 30000, polling: 100 });
      await s.p.waitForTimeout(500);
      erg.faelle['1x Ruhe normal (Zählung)'] = auswerten([await phase(s, RUHE_MS)]);
    });
    await sitzung('1x Sparmodus', { zaehlen: true, sparmodus: true }, async (s) => {
      erg.info.spar = await aufSpielWarten(s.p, args.url);
      erg.faelle['1x Ruhe Sparmodus (Zählung)'] = auswerten([await phase(s, RUHE_MS)]);
    });
    await sitzung('1x Weniger Bewegung', { zaehlen: true, weniger_bewegung: true }, async (s) => {
      erg.info.weniger = await aufSpielWarten(s.p, args.url);
      erg.faelle['1x Ruhe Weniger Bewegung (Zählung)'] = auswerten([await phase(s, RUHE_MS)]);
      erg.z10 = await antippenMessen(s);
    });
    for (const drossel of [1, 4]) {
      const roh = { Ruhe: [], Verschieben: [], 'Zoomen+Drehen': [] };
      for (let w = 1; w <= WIEDERHOLUNGEN; w++) {
        await sitzung(`${drossel}x Zeitmessung ${w}`, { drossel }, async (s) => {
          erg.info[`handy_${drossel}x`] = await aufSpielWarten(s.p, args.url);
          roh.Ruhe.push(await phase(s, RUHE_MS, null, true));
          roh.Verschieben.push(await phase(s, GESTE_MS, (ende) => verschieben(s, ende), true));
          roh['Zoomen+Drehen'].push(await phase(s, GESTE_MS, (ende) => zoomenDrehen(s, ende), true));
        });
      }
      for (const [fall, fenster] of Object.entries(roh)) erg.faelle[`${drossel}x ${fall}`] = auswerten(fenster);
    }
    await sitzung('Laptop', { breite: 1920, hoehe: 1000, faktor: 2, touch: false }, async (s) => {
      erg.info.laptop = await aufSpielWarten(s.p, args.url);
    });
  } finally {
    await browser.close();
  }
  return erg;
}

/** Werte, gegen die Z8/Z9 „nicht schlechter als vorher“ geprüft werden. */
function vorherWerte(erg) {
  const f = erg.faelle;
  return {
    z8: {
      zoom_1x: { js_p95_ms: f['1x Zoomen+Drehen'].js_p95_ms, abstand_p95_ms: f['1x Zoomen+Drehen'].abstand_p95_ms },
      zoom_4x: { js_p95_ms: f['4x Zoomen+Drehen'].js_p95_ms, abstand_p95_ms: f['4x Zoomen+Drehen'].abstand_p95_ms },
    },
    z9: { ruhe_1x: { abstand_p95_ms: f['1x Ruhe'].abstand_p95_ms }, verschieben_1x: { abstand_p95_ms: f['1x Verschieben'].abstand_p95_ms } },
  };
}

const px = (info) => info.leinwand_px[0] * info.leinwand_px[1];
const zahlText = (v) => (v == null ? '–' : String(v).replace('.', ','));

/** Prüft Z1–Z10. Jede Zeile: Ziel, Fall, Grenze, Messwert, erfüllt. Fehlende Messwerte gelten als nicht erfüllt. */
function zielePruefen(erg, vorher) {
  const f = erg.faelle, z = [];
  const hoechstens = (id, fall, wert, grenze, einheit) =>
    z.push({ id, fall, grenze: `≤ ${zahlText(grenze)} ${einheit}`, wert: `${zahlText(wert)} ${einheit}`, ok: wert != null && wert <= grenze });
  hoechstens('Z1', 'Ruhe, Sparmodus, 1×', f['1x Ruhe Sparmodus (Zählung)'].gezeichnet_s, GRENZE.z1_bilder_s, 'gezeichnete Bilder/s');
  hoechstens('Z2', 'Ruhe, Weniger Bewegung, 1×', f['1x Ruhe Weniger Bewegung (Zählung)'].gezeichnet_s, GRENZE.z2_bilder_s, 'gezeichnete Bilder/s');
  hoechstens('Z3', 'Ruhe, normal, 1×', f['1x Ruhe normal (Zählung)'].gezeichnet_s, GRENZE.z3_bilder_s, 'gezeichnete Bilder/s');
  hoechstens('Z3', 'Ruhe, normal, 1×', f['1x Ruhe normal (Zählung)'].befehle_je_bild, GRENZE.z3_befehle, 'Befehle je gezeichnetem Bild');
  hoechstens('Z4', 'Ruhe, normal, 4×', f['4x Ruhe'].js_p95_ms, GRENZE.z4_js_p95_ms, 'ms JS je Bild p95');
  hoechstens('Z5', 'Verschieben, normal, 4×', f['4x Verschieben'].js_p95_ms, GRENZE.z5_js_p95_ms, 'ms JS je Bild p95');
  hoechstens('Z6', 'Vorspann, 1×', erg.z6.weitere_bilder, GRENZE.z6_weitere_bilder, 'weitere Bilder unter dem Vorspann');
  const fremd = erg.z6.animationen_nach_1s.filter((n) => !Z6_ERLAUBT.includes(n));
  z.push({ id: 'Z6', fall: `Vorspann, 1×, ${erg.z6.animationen_gemessen_ms} ms nach Start`, grenze: `≤ ${GRENZE.z6_animationen} laufende Animationen, nur ${Z6_ERLAUBT.join('/')}`,
    wert: `${erg.z6.animationen_nach_1s.length}: ${erg.z6.animationen_nach_1s.join(', ') || '–'}`, ok: erg.z6.animationen_nach_1s.length <= GRENZE.z6_animationen && !fremd.length });
  hoechstens('Z7', 'Leinwand 844×390 @3', px(erg.info.handy_1x), GRENZE.z7_handy_px, 'Pixel');
  hoechstens('Z7', 'Leinwand 1920×1000 @2', px(erg.info.laptop), GRENZE.z7_laptop_px, 'Pixel');
  hoechstens('Z7', 'Leinwand Sparmodus 844×390 @3', px(erg.info.spar), GRENZE.z7_spar_px, 'Pixel');
  const relativ = (id, fall, wert, alt, einheit) => {
    if (alt == null) { z.push({ id, fall, grenze: 'nicht schlechter als vorher', wert: `${zahlText(wert)} ${einheit} (kein Vorher-Wert)`, ok: false }); return; }
    hoechstens(id, `${fall} (vorher ${zahlText(alt)})`, wert, runde(alt * NICHT_SCHLECHTER_FAKTOR), einheit);
  };
  const v = vorher;
  relativ('Z8', 'Zoomen+Drehen, 1×', f['1x Zoomen+Drehen'].js_p95_ms, v?.z8.zoom_1x.js_p95_ms, 'ms JS je Bild p95');
  relativ('Z8', 'Zoomen+Drehen, 1×', f['1x Zoomen+Drehen'].abstand_p95_ms, v?.z8.zoom_1x.abstand_p95_ms, 'ms Bildabstand p95');
  relativ('Z8', 'Zoomen+Drehen, 4×', f['4x Zoomen+Drehen'].js_p95_ms, v?.z8.zoom_4x.js_p95_ms, 'ms JS je Bild p95');
  relativ('Z8', 'Zoomen+Drehen, 4×', f['4x Zoomen+Drehen'].abstand_p95_ms, v?.z8.zoom_4x.abstand_p95_ms, 'ms Bildabstand p95');
  relativ('Z9', 'Ruhe, 1×', f['1x Ruhe'].abstand_p95_ms, v?.z9.ruhe_1x.abstand_p95_ms, 'ms Bildabstand p95');
  relativ('Z9', 'Verschieben, 1×', f['1x Verschieben'].abstand_p95_ms, v?.z9.verschieben_1x.abstand_p95_ms, 'ms Bildabstand p95');
  const t = erg.z10.tipp;
  z.push({ id: 'Z10', fall: `Gebäude antippen (${t.punkt.join('|')}), Weniger Bewegung, 1×`, grenze: `Stichprobe ${Z10_KANTE_PX}×${Z10_KANTE_PX} ändert sich in ${Z10_BILDAUFRUFE} Bildaufrufen`,
    wert: `${t.geaendert} von ${t.pixel} Pixeln anders, Blatt „${t.blatt ?? '–'}“ (ohne Tipp: ${erg.z10.leer.geaendert} anders)`, ok: t.geaendert > 0 && !!t.blatt });
  return z;
}

function tabelleDrucken(kopf, zeilen) {
  console.log(`| ${kopf.join(' | ')} |`);
  console.log(`|${kopf.map(() => '---').join('|')}|`);
  for (const r of zeilen) console.log(`| ${r.map(zahlText).join(' | ')} |`);
}

async function main() {
  let args;
  try { args = argumenteLesen(process.argv.slice(2)); } catch (fehler) { console.error(fehler.message); return 2; }
  try {
    const antwort = await fetch(args.url);
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
  } catch (fehler) {
    console.error(`Vorschau unter ${args.url} nicht erreichbar (${fehler.message}). Erst bauen und starten: npm run build && npx vite preview --port 4317`);
    return 2;
  }
  const vorher = !args.vorherSpeichern && fs.existsSync(VORHER_DATEI) ? JSON.parse(fs.readFileSync(VORHER_DATEI, 'utf8')).werte : null;
  const erg = await messen(args);
  const vorherNeu = args.vorherSpeichern ? vorherWerte(erg) : null;

  console.log(`Messung ${new Date().toISOString()} · ${args.url} · Chromium ${chromium.name()} kopflos, ohne Grafikkarte`);
  console.log(`Spielstand groß: ${erg.stand.objekte} Objekte, ${erg.stand.leitungen} Leitungen, ${erg.stand.haeuser} Häuser mit Station, Quellen ${erg.stand.quellen}, ${erg.stand.warme_kunden} warme Kunden, ${erg.stand.leitungen_mit_fluss} Leitungen mit Wärmefluss`);
  const offen = Object.entries(erg.info).filter(([, i]) => i.offenes_blatt).map(([k, i]) => `${k}: ${i.offenes_blatt}`);
  if (offen.length) console.log(`Hinweis: nach dem Start offenes Blatt – ${offen.join('; ')}`);
  console.log('');
  tabelleDrucken(['Fall', 'Fenster × s', 'Bildaufrufe', 'Bildabstand p50 / p95 ms', '> 17,5 / > 34 ms %', 'gezeichnet/s', 'Befehle/Bild alle (Auswahl Abschn. 1)', 'JS/Bild p50 / p95 ms', 'Übergabe p50 ms', 'Long Tasks'],
    Object.entries(erg.faelle).map(([n, v]) => [n, `${v.fenster} × ${zahlText(runde(v.dauer_ms / v.fenster / 1000))}`, v.aufrufe, `${zahlText(v.abstand_p50_ms)} / ${zahlText(v.abstand_p95_ms)}`, `${zahlText(v.ueber_17_pct)} / ${zahlText(v.ueber_33_pct)}`,
      v.gezeichnet_s, v.befehle_je_bild == null ? null : `${v.befehle_je_bild} (${v.befehle_auswahl_je_bild})`, `${zahlText(v.js_p50_ms)} / ${zahlText(v.js_p95_ms)}`, v.uebergabe_p50_ms, v.lange_aufgaben]));
  console.log('');
  console.log(`Leinwand: Handy ${erg.info.handy_1x.leinwand_px.join('×')} · Laptop ${erg.info.laptop.leinwand_px.join('×')} · Sparmodus ${erg.info.spar.leinwand_px.join('×')}`);
  console.log(`Vorspann: ${erg.z6.bilder_verdeckt} gezeichnete Bilder unter dem Vorspann; laufende Animationen nach ${erg.z6.animationen_gemessen_ms} ms: ${erg.z6.animationen_nach_1s.join(', ') || '–'}`);
  console.log('');
  const ziele = zielePruefen(erg, vorherNeu ?? vorher);
  tabelleDrucken(['Ziel', 'Fall', 'Grenze', 'gemessen', 'Ergebnis'], ziele.map((r) => [r.id, r.fall, r.grenze, r.wert, r.ok ? 'erfüllt' : 'NICHT ERFÜLLT']));
  if (erg.seitenfehler.length) { console.log(''); console.log(`Seitenfehler (Messung ungültig): ${erg.seitenfehler.join(' · ')}`); }
  const alleOk = ziele.every((r) => r.ok) && !erg.seitenfehler.length;
  console.log('');
  console.log(`ERGEBNIS: ${alleOk ? 'alle Ziele Z1–Z10 erfüllt' : `${ziele.filter((r) => !r.ok).length} von ${ziele.length} Prüfungen nicht erfüllt`}${vorherNeu ? ' (Z8/Z9 gegen diesen Lauf selbst)' : ''}`);

  if (vorherNeu) {
    const datei = { erzeugt: new Date().toISOString(), url: args.url, nicht_schlechter_faktor: NICHT_SCHLECHTER_FAKTOR, spielstand: erg.stand, werte: vorherNeu, alle_faelle: erg.faelle, z6: erg.z6, leinwand: erg.info };
    fs.writeFileSync(VORHER_DATEI, `${JSON.stringify(datei, null, 2)}\n`);
    console.log(`Vorher-Werte gespeichert: ${path.relative(WURZEL, VORHER_DATEI)}`);
  }
  return args.nurBericht || alleOk ? 0 : 1;
}

main().then((code) => { process.exitCode = code; }, (fehler) => { console.error('Messung abgebrochen:', fehler); process.exitCode = 2; });
