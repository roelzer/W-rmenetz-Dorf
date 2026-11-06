import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KATALOG, istLeitung } from '../src/core/katalog';
import { groesse } from '../src/core/netz';
import { Spiel } from '../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_SPUR, neuesSpielMitTutorial } from '../src/core/start';
import { Tutorial } from '../src/core/tutorial';
import type { TippMeldung } from '../src/core/tutorial-vertrag';
import { echteSteuerung } from './hilfen/echte-steuerung';
import { El } from './hilfen/dom-attrappe';

// Bauplan NR13 Fassung 3.1, Paket P4 (Einbindung) – Teil 1: Steuerung hält das Tutorial, Meldungen stumm, nachTutorial,
// „Willkommen zurück“ entfällt im Tutorial (K6).
const T0 = 1_000_000;
const ohneKommentare = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

type St = {
  anleitungAnsicht(): { wiedereinstieg: boolean; art: string } | null;
  nachTutorial(f: () => void): void;
  toast(t: string): void;
  toastWichtig(t: string): void;
};

describe('NR13 P4 Einbindung', () => {
  it('test_nr13_kein_willkommen_zurueck: die A38-Meldung hängt an !spiel.tutorialAktiv()', () => {
    const main = ohneKommentare(readFileSync('src/main.ts', 'utf8'));
    const zeile = main.split('\n').find((z) => z.includes('5 * 60_000'));
    expect(zeile).toBeDefined();
    expect(zeile).toContain('!spiel.tutorialAktiv()');
  });

  it('test_nr13_meldungen_stumm: im Tutorial schweigt toast(), toastWichtig erscheint', async () => {
    const uhr = (): number => T0;
    await echteSteuerung(new Spiel(neuesSpielMitTutorial(T0), uhr), ({ st, meldung }) => {
      const s = st as unknown as St;
      s.toast('Gewöhnliche Meldung');
      expect(meldung()).toBe('');
      s.toastWichtig('Speichern geht gerade nicht');
      expect(meldung()).toBe('Speichern geht gerade nicht');
    }, { uhr });
  });

  it('test_nr13_anleitung_ansicht: Stand mit Merke und namen_gefragt → erste Blase ist der Wiedereinstieg', async () => {
    const uhr = (): number => T0;
    await echteSteuerung(new Spiel(neuesSpielMitTutorial(T0), uhr), ({ st }) => {
      const a = (st as unknown as St).anleitungAnsicht();
      expect(a?.wiedereinstieg).toBe(true);
      expect(a?.art).toBe('W');
    }, { uhr });
  });

  it('test_nr13_ohne_tutorial_kein_stumm: ohne Merke keine Ansicht, toast() sichtbar, nachTutorial sofort', async () => {
    const uhr = (): number => T0;
    const spiel = new Spiel(neuesSpielMitTutorial(T0), uhr);
    spiel.tutorialUeberspringen();
    await echteSteuerung(spiel, ({ st, meldung }) => {
      const s = st as unknown as St;
      expect(s.anleitungAnsicht()).toBeNull();
      s.toast('Hallo');
      expect(meldung()).toBe('Hallo');
      let gerufen = 0;
      s.nachTutorial(() => { gerufen++; });
      expect(gerufen).toBe(1);
    }, { uhr });
  });

  it('test_nr13_nach_tutorial_wartet: solange das Tutorial läuft, wird nachTutorial nicht sofort ausgeführt', async () => {
    const uhr = (): number => T0;
    await echteSteuerung(new Spiel(neuesSpielMitTutorial(T0), uhr), ({ st }) => {
      let gerufen = 0;
      (st as unknown as St).nachTutorial(() => { gerufen++; });
      expect(gerufen).toBe(0);
    }, { uhr });
  });
});

describe('NR13 P4 Einbindung – Ende', () => {
  it('test_nr13_ende_stumm_aus_und_nach_tutorial: endet das Tutorial, ist toast() wieder sichtbar und nachTutorial läuft nach 600 ms', async () => {
    vi.useFakeTimers();
    try {
      const uhr = (): number => T0;
      const spiel = new Spiel(neuesSpielMitTutorial(T0), uhr);
      await echteSteuerung(spiel, ({ st, meldung }) => {
        const s = st as unknown as St & { tick(t: number): void };
        let gerufen = 0;
        s.nachTutorial(() => { gerufen++; });
        spiel.tutorialBeenden();
        s.tick(T0);
        expect(s.anleitungAnsicht()).toBeNull();
        vi.advanceTimersByTime(599);
        expect(gerufen).toBe(0);
        vi.advanceTimersByTime(1);
        expect(gerufen).toBe(1);
        s.toast('Wieder da');
        expect(meldung()).toBe('Wieder da');
      }, { uhr });
    } finally { vi.useRealTimers(); }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Teil 2: Ansicht anwenden (Spotlight, Anleiter, Sperre), Kamera-Regel, Tipps, Zeichenleiste, Gesten-Sperre.
// Die Uhr des Spiels läuft von Hand; die Kamerafahrt läuft über die Bildzeit (performance.now), nicht über die Spieluhr.
type Grenze = { x0: number; y0: number; x1: number; y1: number; mitte_px: readonly [number, number]; zoom_min: number; zoom_max: number };
type Kam = {
  breite: number; hoehe: number; zoom: number; winkel_rad: number; schiebe_x: number; schiebe_y: number; grenze: Grenze | null;
  mitte(x: number, y: number): [number, number]; feldGenau(mx: number, my: number): [number, number];
  einpassenZiel(f: { x0: number; y0: number; x1: number; y1: number }, frei: { x: number; y: number; b: number; h: number }, rand: number, zmax: number): { zoom: number };
  groesseSetzen(b: number, h: number, d: number): boolean;
};
type Ansicht2 = { schritt: string; text: string; art: string };
type St2 = { tick(t: number): void; kamera: Kam; anleitungAnsicht(): Ansicht2 | null };
type U = Parameters<Parameters<typeof echteSteuerung>[1]>[0];
type Obj = { x: number; y: number; typ: string };

const s2 = (u: U): St2 => u.st as unknown as St2;
const schrittJetzt = (u: U): string | undefined => s2(u).anleitungAnsicht()?.schritt;
const offeneBlaetter = (u: U) => u.dom.html.querySelectorAll('.blatt').filter((b) => b.isConnected && !b.classList.contains('zeichenleiste'));
const zielEl = (u: U, name: string, typ?: string) => u.dom.html.querySelector(`[data-ziel="${name}"]${typ ? `[data-typ="${typ}"]` : ''}`);
function weiterTippen(u: U): void {
  const k = u.dom.doc.getElementById('anleiter-weiter');
  expect(k, `[Weiter] in ${schrittJetzt(u)}`).not.toBeNull();
  k!.click();
}
function objektMitte(u: U, o: Obj): [number, number] {
  const k = groesse(o as never);
  return s2(u).kamera.mitte(o.x + (k - 1) / 2, o.y + (k - 1) / 2);
}
const leinwand = (u: U) => u.dom.app.querySelector('canvas')!;
const zeiger = (id: number, x: number, y: number, art = 'touch', button = 0) => ({ pointerId: id, clientX: x, clientY: y, pointerType: art, button });
function tippePunkt(u: U, [mx, my]: [number, number]): void {
  leinwand(u).ausloesen('pointerdown', zeiger(3, mx, my)); leinwand(u).ausloesen('pointerup', zeiger(3, mx, my));
}
function wischeFelder(u: U, felder: ReadonlyArray<readonly [number, number]>): void {
  const evs = felder.map(([x, y]) => { const [mx, my] = s2(u).kamera.mitte(x, y); return zeiger(7, mx, my); });
  leinwand(u).ausloesen('pointerdown', evs[0]);
  for (const ev of evs.slice(1)) leinwand(u).ausloesen('pointermove', ev);
  leinwand(u).ausloesen('pointerup', evs[evs.length - 1]);
}
const zeile2 = (k: { querySelector(s: string): { textContent: string } | null }): string => (k.querySelector('small')?.textContent ?? '').replace(/\s+/g, ' ').trim();
const hausBei = (spiel: Spiel, [x, y]: readonly [number, number]) => spiel.stand.objekte.find((o) => o.x === x && o.y === y && KATALOG[o.typ].kategorie === 'haus')!;
const tutorialObjekte = (spiel: Spiel) => [spiel.hz, hausBei(spiel, ERSTE_HAEUSER[0]), hausBei(spiel, ERSTE_HAEUSER[1])];
/** Feldmitten-Rahmen um Heizzentrale und beide Tutorial-Häuser (Rahmen-Art von Kamera.einpassenZiel) */
function rahmenHzHaeuser(spiel: Spiel): { x0: number; y0: number; x1: number; y1: number } {
  const os = tutorialObjekte(spiel);
  return { x0: Math.min(...os.map((o) => o.x)), y0: Math.min(...os.map((o) => o.y)), x1: Math.max(...os.map((o) => o.x + groesse(o) - 1)), y1: Math.max(...os.map((o) => o.y + groesse(o) - 1)) };
}
function imBild(u: U, o: Obj, breite: number, hoehe: number): void {
  const [x, y] = objektMitte(u, o);
  expect(x).toBeGreaterThanOrEqual(24 - 1); expect(x).toBeLessThanOrEqual(breite - 24 + 1);
  expect(y).toBeGreaterThanOrEqual(24 - 1); expect(y).toBeLessThanOrEqual(hoehe - 24 + 1);
}

/** Wie ein Spieler: die Spur entlang und weiter auf Haus 2. Der letzte Spurschritt (10,14)→(11,14) geht nur ein Feld
 *  zur Seite; nach A47 knickt die Leitung erst bei 2 Feldern seitlich – erst der Zug auf das Haus legt (11,14). */
const SPUR_BIS_HAUS2 = [...TUTORIAL_SPUR, ERSTE_HAEUSER[1]];

/** Echter Klickweg ab der stehenden T01-Ansicht bis T13 (Zeichenleiste offen). */
function vonT01BisT13(u: U, spiel: Spiel, uhr: { t: number }): void {
  const s = s2(u);
  tippePunkt(u, objektMitte(u, spiel.hz));
  for (const id of ['T02', 'T03', 'T04', 'T05', 'T06', 'T07']) { s.tick(uhr.t); expect(schrittJetzt(u)).toBe(id); weiterTippen(u); }
  s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T08');
  zielEl(u, 'bauen')!.click();
  s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T10');
  zielEl(u, 'philipp')!.click();
  s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T11');
  // Philipp spricht (DESIGN 13.3): solange macht Simon Platz, es gibt kein [Weiter]. Seine Blase steht höchstens
  // 3.800 + 2.500 ms und blendet in 350 ms aus (src/ui/sprecher.ts) – darum die Fensteruhr 7 s weiter.
  expect(u.dom.doc.getElementById('anleiter-weiter')).toBeNull();
  vi.advanceTimersByTime(7_000);
  uhr.t += 10_000; s.tick(uhr.t); weiterTippen(u);
  s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T12');
  zielEl(u, 'leitungskarte', spiel.tutorialWerte().leitung)!.click();
  s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T13');
}
/** Wiedereinstiegs-Blase wegtippen, dann T01 */
function bisT01(u: U, uhr: { t: number }): void {
  s2(u).tick(uhr.t); weiterTippen(u);
  s2(u).tick(uhr.t); expect(schrittJetzt(u)).toBe('T01');
}
function bisT13(u: U, spiel: Spiel, uhr: { t: number }): void { bisT01(u, uhr); vonT01BisT13(u, spiel, uhr); }
/** Weiter bis T14: ganze Spur in einem Zug */
function bisT14(u: U, spiel: Spiel, uhr: { t: number }): void {
  bisT13(u, spiel, uhr);
  wischeFelder(u, SPUR_BIS_HAUS2);
  s2(u).tick(uhr.t); expect(schrittJetzt(u)).toBe('T14');
}
/** Weiter bis T22 (Laura hat bestellt) */
function bisT22(u: U, spiel: Spiel, uhr: { t: number }): void {
  bisT14(u, spiel, uhr);
  const s = s2(u), [h1, h2] = [hausBei(spiel, ERSTE_HAEUSER[0]), hausBei(spiel, ERSTE_HAEUSER[1])];
  zielEl(u, 'abschliessen')!.click(); s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T15');
  tippePunkt(u, objektMitte(u, h1)); s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T16');
  weiterTippen(u); s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T17');
  zielEl(u, 'puffer_knopf')!.click(); s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T18');
  tippePunkt(u, objektMitte(u, h2)); s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T19');
  zielEl(u, 'puffer_knopf')!.click(); s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T20');
  zielEl(u, 'bauen')!.click(); s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T21');
  zielEl(u, 'laura')!.click(); s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T22');
}
const neuesSpiel = (uhr: { t: number }): Spiel => new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);

describe('NR13 P4 Einbindung – Teil 2', () => {
  // Die Anleiter-Karte zeigt Simons Figur; ein Foto lädt die DOM-Nachbildung nicht (Bild bleibt leer, die Zeichnung steht)
  // Fensteruhr von Hand: Sprecher-Blasen und Blatt-Schließen laufen über window.setTimeout
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr13_t01_heizzentrale_ohne_blatt: Tipp auf die Heizzentrale meldet den Tipp und öffnet kein Blatt', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT01(u, uhr);
      tippePunkt(u, objektMitte(u, spiel.hz));
      expect(schrittJetzt(u)).toBe('T02');
      expect(offeneBlaetter(u)).toHaveLength(0);
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_w_schritt_kartentipp_oeffnet_nichts: in T05 öffnet ein Tipp auf Haus 1 kein Blatt und schaltet nicht weiter', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      const s = s2(u);
      bisT01(u, uhr);
      tippePunkt(u, objektMitte(u, spiel.hz));
      for (let i = 0; i < 3; i++) { s.tick(uhr.t); weiterTippen(u); }
      s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T05');
      tippePunkt(u, objektMitte(u, hausBei(spiel, ERSTE_HAEUSER[0])));
      expect(offeneBlaetter(u)).toHaveLength(0);
      expect(schrittJetzt(u)).toBe('T05');
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_spotlight_anleiter_und_sperrlage: Karte und Abdunkeln stehen, die Sperre lässt nur das Loch durch, am Ende ist alles weg', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, async (u) => {
      const { eingabeErlaubt } = await import('../src/ui/spotlight');
      const s = s2(u);
      bisT01(u, uhr);
      expect(u.dom.doc.getElementById('anleiter')).not.toBeNull();
      expect(u.dom.doc.getElementById('spotlight')).not.toBeNull();
      const [hx, hy] = objektMitte(u, spiel.hz);
      expect(eingabeErlaubt(hx, hy)).toBe(true);
      expect(eingabeErlaubt(5, 5)).toBe(false);
      tippePunkt(u, [hx, hy]); s.tick(uhr.t);
      expect(schrittJetzt(u)).toBe('T02');
      // W-Schritt: das Loch zeigt nur (AE-NR13-6)
      expect(eingabeErlaubt(hx, hy)).toBe(false);
      spiel.tutorialBeenden(); s.tick(uhr.t);
      expect(u.dom.doc.getElementById('anleiter')).toBeNull();
      expect(u.dom.doc.getElementById('spotlight')).toBeNull();
      expect(eingabeErlaubt(5, 5)).toBe(true);
      expect(s.kamera.grenze).toBeNull();
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_t05_fahrt_nach_bildzeit: Fahrt endet nach 1.200 ms Bildzeit ohne Spieluhr; währenddessen kein Abdunkeln und alles still gesperrt', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    let bild = 50_000;
    vi.spyOn(performance, 'now').mockImplementation(() => bild);
    await echteSteuerung(spiel, async (u) => {
      const { eingabeErlaubt } = await import('../src/ui/spotlight');
      const s = s2(u);
      bisT01(u, uhr);
      tippePunkt(u, objektMitte(u, spiel.hz));
      for (let i = 0; i < 3; i++) { s.tick(uhr.t); weiterTippen(u); }
      s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T05');
      // Bei 844 × 390 liegt der Zoom schon vor der Fahrt an der Obergrenze 3 – die Fahrt zeigt sich an der Verschiebung
      const lage = (): number[] => [s.kamera.schiebe_x, s.kamera.schiebe_y];
      const lageStart = lage();
      bild += 600; s.tick(uhr.t);
      const dunkel = u.dom.html.querySelector('.spot-dunkel')!;
      expect(dunkel.hidden).toBe(true);
      const r = u.dom.doc.getElementById('anleiter')!.getBoundingClientRect();
      expect(eingabeErlaubt(r.x, r.y)).toBe(false);
      const lageMitte = lage();
      expect(lageMitte).not.toEqual(lageStart);
      bild += 600; s.tick(uhr.t);
      expect(lage()).not.toEqual(lageMitte);
      expect(dunkel.hidden).toBe(false);
      expect(eingabeErlaubt(r.x, r.y)).toBe(true);
      imBild(u, hausBei(spiel, ERSTE_HAEUSER[0]), 844, 390);
      imBild(u, hausBei(spiel, ERSTE_HAEUSER[1]), 844, 390);
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_karte_steht_ausser_t13: in T01 bewegen Ziehen, Mausrad, zwei Finger und Mitteltaste die Karte nicht; in T13 hält die Grenze', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      const k = s2(u).kamera, c = leinwand(u);
      bisT01(u, uhr);
      const vorher = [k.schiebe_x, k.schiebe_y, k.zoom, k.winkel_rad];
      c.ausloesen('pointerdown', zeiger(1, 100, 330)); c.ausloesen('pointermove', zeiger(1, 200, 330)); c.ausloesen('pointerup', zeiger(1, 200, 330));
      c.ausloesen('wheel', { deltaY: -100, clientX: 300, clientY: 200 });
      c.ausloesen('pointerdown', zeiger(1, 300, 200)); c.ausloesen('pointerdown', zeiger(2, 400, 200));
      c.ausloesen('pointermove', zeiger(2, 600, 320));
      c.ausloesen('pointerup', zeiger(2, 600, 320)); c.ausloesen('pointerup', zeiger(1, 300, 200));
      c.ausloesen('pointerdown', zeiger(5, 300, 200, 'mouse', 1)); c.ausloesen('pointermove', zeiger(5, 400, 200, 'mouse', 1)); c.ausloesen('pointerup', zeiger(5, 400, 200, 'mouse', 1));
      expect([k.schiebe_x, k.schiebe_y, k.zoom, k.winkel_rad]).toEqual(vorher);
      expect(schrittJetzt(u)).toBe('T01');

      vonT01BisT13(u, spiel, uhr);
      const g = k.grenze!, winkel = k.winkel_rad;
      expect(g).not.toBeNull();
      // zwei Finger zusammenführen (heraus zoomen), dabei weit schieben und drehen
      c.ausloesen('pointerdown', zeiger(1, 100, 100)); c.ausloesen('pointerdown', zeiger(2, 700, 300));
      c.ausloesen('pointermove', zeiger(2, 140, 330)); c.ausloesen('pointermove', zeiger(1, 20, 380));
      c.ausloesen('pointerup', zeiger(2, 140, 330)); c.ausloesen('pointerup', zeiger(1, 20, 380));
      expect(k.zoom).toBeCloseTo(g.zoom_min, 6);
      expect(k.winkel_rad).toBe(winkel);
      const [fx, fy] = k.feldGenau(g.mitte_px[0], g.mitte_px[1]);
      expect(fx).toBeGreaterThanOrEqual(g.x0 - 1e-6); expect(fx).toBeLessThanOrEqual(g.x1 + 1e-6);
      expect(fy).toBeGreaterThanOrEqual(g.y0 - 1e-6); expect(fy).toBeLessThanOrEqual(g.y1 + 1e-6);
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_t13_kamera_einpassen_und_breite: Eintritt T13 passt ein und setzt die Grenze; neue freie Breite führt nur mitte_px nach', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const k = s2(u).kamera;
      // DESIGN 13.16 M1: Spur, HZ und Häuser brauchen 2,5 Feldbreiten Höhe (Feldsumme 20…26 → 6 × tw/4 + tw); frei sind nur
      // 64…200 px (Karte oben 216 − 16). Bei basis 26 px passt erst Zoom 88/65 ≈ 1,35 → Kamera zoomt bis zur Untergrenze 2.
      const erwartet = 2;
      expect(k.zoom).toBeCloseTo(erwartet, 6);
      expect(k.grenze!.zoom_min).toBeCloseTo(erwartet, 6);
      expect(k.grenze!.zoom_max).toBe(3);
      // Bildmitte der freien Fläche zwischen Anzeigenreihe (64) und Kartenoberkante − 16 (200): (64 + 200) / 2 = 132
      expect(k.grenze!.mitte_px).toEqual([422, 132]);
      k.groesseSetzen(700, 390, 2);
      s2(u).tick(uhr.t);
      expect(k.zoom).toBeCloseTo(erwartet, 6);
      expect(k.grenze!.zoom_min).toBeCloseTo(erwartet, 6);
      expect(k.grenze!.mitte_px).toEqual([350, 132]);
      expect(schrittJetzt(u)).toBe('T13');
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_zeichenhilfe_aus: im Tutorial klappt die Zeichenhilfe nicht auf, die Merke wird gesetzt; Leiste und Knopf tragen data-ziel', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      expect(u.dom.html.querySelector('.zeichen-hilfe')!.hidden).toBe(true);
      expect(spiel.stand.zeichenhilfe_gesehen).toBe(true);
      expect(zielEl(u, 'zeichenleiste')).not.toBeNull();
      expect(zielEl(u, 'abschliessen')).not.toBeNull();
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_abschliessen_gesperrt_noch_ein_haus: Zeile 2 „noch 1 Haus fehlt“, Tipp bringt den Satz in die Blase ohne Meldung; ein Farbknopf nimmt ihn weg', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      wischeFelder(u, TUTORIAL_SPUR.slice(0, 4));
      s2(u).tick(uhr.t);
      expect(schrittJetzt(u)).toBe('T13');
      const k = zielEl(u, 'abschliessen')!;
      expect(zeile2(k)).toBe('noch 1 Haus fehlt');
      const zahl = u.meldungen.length;
      k.click();
      expect(s2(u).anleitungAnsicht()!.text).toBe('Zieh die Leitung bis an beide Häuser – folge der gelben Spur.');
      expect(u.meldungen.length).toBe(zahl);
      u.dom.html.querySelector('.farbknopf')!.click();
      expect(s2(u).anleitungAnsicht()!.text).toBe('Das erste Haus ist erreicht. Jetzt weiter bis zum zweiten.');
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_t13_bleibt_bei_geldmangel: Umweg bei knappem Geld → T13 mit Geld-Satz und „Geld reicht nicht“; Zurück wirkt → T14', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      wischeFelder(u, SPUR_BIS_HAUS2);
      // Geld genau so knapp, dass Spur und Stationen gerade bezahlbar sind; ein Feld Umweg ist zu viel
      spiel.stand.geld_eur = 0;
      spiel.stand.geld_eur = spiel.tutorialGeldFehlt_eur();
      wischeFelder(u, [[11, 13]]);
      expect(spiel.tutorialGeldFehlt_eur(), 'Testaufbau: Umweg kostet').toBeGreaterThan(0);
      s2(u).tick(uhr.t);
      expect(schrittJetzt(u)).toBe('T13');
      expect(s2(u).anleitungAnsicht()!.text).toBe('Dann reicht dein Geld nicht mehr für die Stationen. Nimm mit Zurück ein paar Leitungen weg.');
      expect(zeile2(zielEl(u, 'abschliessen')!)).toBe('Geld reicht nicht');
      u.knoepfe().find((b) => b.getAttribute('data-id') === 'zurueck')!.click();
      s2(u).tick(uhr.t);
      expect(schrittJetzt(u)).toBe('T14');
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_nach_abschliessen_kein_baumenue + blatt_schliesst_nach_kauf: kein Baumenü nach dem Abschließen; T17 Kauf → nach 200 ms zu; T21 Laura → Baumenü sofort zu', async () => {
    vi.useFakeTimers();
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      const s = s2(u);
      bisT14(u, spiel, uhr);
      zielEl(u, 'abschliessen')!.click();
      expect(offeneBlaetter(u)).toHaveLength(0);
      s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T15');
      tippePunkt(u, objektMitte(u, hausBei(spiel, ERSTE_HAEUSER[0])));
      expect(offeneBlaetter(u)).toHaveLength(1);
      s.tick(uhr.t); weiterTippen(u); s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T17');
      zielEl(u, 'puffer_knopf')!.click(); s.tick(uhr.t);
      expect(schrittJetzt(u)).toBe('T18');
      vi.advanceTimersByTime(199); expect(offeneBlaetter(u)).toHaveLength(1);
      vi.advanceTimersByTime(1); expect(offeneBlaetter(u)).toHaveLength(0);
      tippePunkt(u, objektMitte(u, hausBei(spiel, ERSTE_HAEUSER[1]))); s.tick(uhr.t);
      zielEl(u, 'puffer_knopf')!.click(); s.tick(uhr.t); vi.advanceTimersByTime(200);
      expect(schrittJetzt(u)).toBe('T20');
      zielEl(u, 'bauen')!.click(); s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T21');
      expect(offeneBlaetter(u)).toHaveLength(1);
      zielEl(u, 'laura')!.click(); s.tick(uhr.t);
      expect(schrittJetzt(u)).toBe('T22');
      expect(offeneBlaetter(u)).toHaveLength(0);
    }, { uhr: () => uhr.t });
  });

  for (const [breite, hoehe] of [[844, 390], [667, 375]] as const) {
    it(`test_nr13_t22_kamera_eingepasst (${breite}×${hoehe}): nach der Fahrt liegen Heizzentrale und beide Häuser in der freien Fläche minus 24 px, Zoom ≤ 3`, async () => {
      const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
      let bild = 10_000;
      vi.spyOn(performance, 'now').mockImplementation(() => bild);
      await echteSteuerung(spiel, (u) => {
        bisT22(u, spiel, uhr);
        bild += 1200; s2(u).tick(uhr.t);
        expect(s2(u).kamera.zoom).toBeLessThanOrEqual(3);
        for (const o of tutorialObjekte(spiel)) imBild(u, o, breite, hoehe);
      }, { uhr: () => uhr.t, breite, hoehe });
    });
  }
});

// Ablauf ohne Oberfläche (Bauplan F3, Weg b): echtes Spiel und echtes Tutorial, Uhr von Hand. Die Ereignisse des Spiels gehen
// wie in steuerung.ts ans Tutorial; Tipps meldet der Test so, wie die Oberfläche sie melden würde.
describe('NR13 P4 Einbindung – Ablauf Geldmangel', () => {
  it('test_nr13_geldmangel_kein_festhaengen: Umwege bis das Geld fehlt → T13 bleibt; Zurück bis es reicht → T14; Rest bis T26 → beide Häuser warm', () => {
    const uhr = { t: T0 }, s = neuesSpiel(uhr);
    s.namenSetzen('Anna', 'Heatville'); // ohne Namen zeigt das Tutorial noch keine Blase (Namensfenster zuerst)
    const t = new Tutorial(s);
    const melden = (): void => { for (const ev of s.ereignisse.splice(0)) if (ev.art === 'schritt') t.schritt(ev); };
    const jetzt = (): string | undefined => t.ansicht(uhr.t)?.schritt;
    const tippe = (m: Omit<TippMeldung, 'art'>): void => { t.tipp({ art: 'tipp', ...m } as TippMeldung); melden(); };
    const [h1, h2] = ERSTE_HAEUSER.map((k) => hausBei(s, k));
    const typ = s.tutorialWerte().leitung;

    tippe({ tipp: 'heizzentrale' });
    for (let i = 0; i < 6; i++) tippe({ tipp: 'weiter' });
    expect(jetzt()).toBe('T08');
    tippe({ tipp: 'baumenue' }); tippe({ tipp: 'reiter_leitungen' });
    expect(jetzt()).toBe('T10');
    expect(s.abschnittPlanen().ok).toBe(true); melden();
    expect(jetzt()).toBe('T11');
    uhr.t += 10_000; s.bis(uhr.t); melden();
    tippe({ tipp: 'weiter' }); tippe({ tipp: 'leitungskarte', typ });
    expect(jetzt()).toBe('T13');

    // Spur ganz: beide Häuser erreicht, Geld reicht → T14
    for (const [x, y] of TUTORIAL_SPUR) { expect(s.platzieren(typ, x, y).ok).toBe(true); melden(); }
    expect(jetzt()).toBe('T14');
    // Umwege, bis Spur, Umwege und zwei Puffer-Stationen mehr kosten als da ist
    let umwege = 0;
    for (let y = 16; y < 30 && s.tutorialGeldFehlt_eur() === 0; y++) {
      for (let x = 0; x < 30 && s.tutorialGeldFehlt_eur() === 0; x++) {
        if (s.kannPlatzieren(typ, x, y) && s.platzieren(typ, x, y).ok) { umwege++; melden(); }
      }
    }
    expect(s.tutorialGeldFehlt_eur(), 'Testaufbau: Umwege machen das Geld knapp').toBeGreaterThan(0);
    expect(umwege).toBeGreaterThan(1);
    expect(s.erreichteHaeuser()).toEqual(expect.arrayContaining([h1.id, h2.id]));
    t.zustandPruefen();
    expect(jetzt()).toBe('T13');
    expect(t.ansicht(uhr.t)!.text).toBe('Dann reicht dein Geld nicht mehr für die Stationen. Nimm mit Zurück ein paar Leitungen weg.');
    expect(t.sperre('abschliessen')?.kurz).toBe('Geld reicht nicht');

    // Zurück nimmt die letzten Umwege weg; solange Geld fehlt, bleibt T13 – danach geht es weiter, der Spieler hängt nicht fest
    let zurueck = 0;
    while (s.tutorialGeldFehlt_eur() > 0) {
      expect(s.letzteLeitungZurueck().ok).toBe(true); melden(); t.handlung();
      zurueck++;
      if (s.tutorialGeldFehlt_eur() > 0) { t.zustandPruefen(); expect(jetzt()).toBe('T13'); }
    }
    expect(zurueck).toBeLessThan(umwege);
    expect(s.erreichteHaeuser()).toEqual(expect.arrayContaining([h1.id, h2.id]));
    t.zustandPruefen();
    expect(jetzt()).toBe('T14');

    expect(s.abschnittAbschliessen().ok).toBe(true); melden();
    expect(jetzt()).toBe('T15');
    tippe({ tipp: 'haus', objekt_id: h1.id }); tippe({ tipp: 'weiter' });
    expect(jetzt()).toBe('T17');
    expect(s.stationKaufen(h1.id, 'hp_800').ok).toBe(true); melden();
    tippe({ tipp: 'haus', objekt_id: h2.id });
    expect(jetzt()).toBe('T19');
    expect(s.stationKaufen(h2.id, 'hp_800').ok).toBe(true); melden();
    expect(jetzt()).toBe('T20');
    tippe({ tipp: 'baumenue' });
    expect(jetzt()).toBe('T21');
    expect(s.materialBestellen().ok).toBe(true); melden();
    expect(jetzt()).toBe('T22');
    tippe({ tipp: 'weiter' });
    expect(jetzt()).toBe('T23');
    // Tutorial-Bau dauert 20 s (tests/nr13-kern.test.ts, test_nr13_tutorial_zeiten)
    for (let i = 0; i < 3; i++) { uhr.t += 10_000; s.bis(uhr.t); melden(); }
    expect(s.stand.abschnitt).toBeUndefined();
    for (const id of ['T23', 'T24', 'T25', 'T26']) { expect(jetzt()).toBe(id); tippe({ tipp: 'weiter' }); }
    expect(t.aktiv()).toBe(false);
    expect(s.stand.tutorial).toBeUndefined();
    expect(s.netz.warm.has(h1.id) && s.netz.warm.has(h2.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Teil 3: Namensfenster, Fokus und Vorlesenamen (DESIGN 13.11/K9), Ende mit federndem Auftrag, Finger-Spur bis Haus 2.
type St3 = Omit<St2, 'anleitungAnsicht'> & { anleitungAnsicht(): (Ansicht2 & { wiedereinstieg: boolean }) | null; zentrieren(): void };
const knopfMit = (u: U, text: string) => u.knoepfe().find((k) => k.textContent.includes(text));

/** Zweite, echte Steuerung mit offenem Namensfenster (die Testhilfe überspringt es, Hilfen bleiben unverändert). */
async function mitNamensfenster(u: U, spiel: Spiel, uhr: { t: number }): Promise<St3> {
  const { Steuerung } = await import('../src/steuerung');
  const lw = new El('canvas');
  u.dom.app.append(lw);
  spiel.stand.namen_gefragt = false;
  const st = new Steuerung(spiel, lw as unknown as HTMLCanvasElement, { reduziert: false } as never, () => uhr.t) as unknown as St3;
  st.kamera.groesseSetzen(844, 390, 2); st.zentrieren();
  return st;
}
/** Neues Spiel ohne Tutorial für die erste (von der Hilfe gebaute) Steuerung, damit sie nichts anzeigt */
const ohneTutorial = (uhr: { t: number }): Spiel => { const s = neuesSpiel(uhr); s.tutorialUeberspringen(); return s; };
/** Punkte (px) der letzten Spur-Animation des Fingers, in der Reihenfolge, in der er sie abfährt */
function fingerSpurPunkte(anim: { mock: { calls: unknown[][] } }): Array<[number, number]> {
  const spur = anim.mock.calls.filter(([kf, o]) => Array.isArray(kf) && (o as { iterations?: number } | undefined)?.iterations === Infinity
    && (kf as Keyframe[]).length >= 4 && (kf as Keyframe[]).every((k) => typeof k.transform === 'string')
    && (kf as Keyframe[]).some((k) => k.opacity === 0));
  expect(spur.length, 'Testaufbau: die Finger-Spur wurde gezeigt').toBeGreaterThan(0);
  const kf = spur[spur.length - 1][0] as Keyframe[];
  return kf.filter((k) => k.opacity === 1).map((k) => {
    const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(String(k.transform))!;
    return [Number(m[1]), Number(m[2])];
  });
}

describe('NR13 P4 Einbindung – Teil 3', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr13_namensfenster_startet_t01: ohne Vorführ-Tempo kein „Ohne Tutorial starten“; nach dem Namen T01 ohne Begrüßung und Start-Tipp', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(ohneTutorial(uhr), async (u) => {
      const st = await mitNamensfenster(u, spiel, uhr);
      expect(st.anleitungAnsicht(), 'solange das Namensfenster offen ist, keine Blase').toBeNull();
      expect(knopfMit(u, 'Ohne Tutorial starten')).toBeUndefined();
      (u.dom.doc.getElementById('start-spieler') as unknown as { value: string }).value = 'Anna';
      knopfMit(u, 'Los geht’s')!.click();
      expect(spiel.spielerName).toBe('Anna');
      expect(st.anleitungAnsicht()?.schritt).toBe('T01');
      expect(st.anleitungAnsicht()?.wiedereinstieg).toBe(false);
      expect(u.dom.doc.getElementById('anleiter'), 'T01 steht sofort, ohne auf das nächste Bild zu warten').not.toBeNull();
      vi.advanceTimersByTime(30_000);
      expect(u.meldungen).toEqual([]);
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_ohne_tutorial_nur_vorfuehrtempo: mit ×10 startet „Ohne Tutorial starten“ das Spiel wie bisher (Begrüßung sichtbar)', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    const speicher = new Map([['waermedorf-tempo-v1', JSON.stringify({ faktor: 10, offset_ms: 0 })]]);
    await echteSteuerung(ohneTutorial(uhr), async (u) => {
      const st = await mitNamensfenster(u, spiel, uhr);
      (u.dom.doc.getElementById('start-spieler') as unknown as { value: string }).value = 'Anna';
      knopfMit(u, 'Ohne Tutorial starten')!.click();
      expect(st.anleitungAnsicht()).toBeNull();
      expect(spiel.stand.tutorial).toBeUndefined();
      expect(spiel.spielerName).toBe('Anna');
      expect(u.meldung()).toBe(`Viel Erfolg, Anna! ${spiel.stand.name} wartet auf sein Wärmenetz.`);
      expect(u.dom.doc.getElementById('anleiter')).toBeNull();
      expect(knopfMit(u, 'Ohne Tutorial starten')).toBeUndefined();
    }, { uhr: () => uhr.t, speicher });
  });

  it('test_nr13_fokus_und_vorlesename: T01 Ersatz-Element „Heizzentrale“ fokussiert, Enter → T02; T02 Fokus auf [Weiter]; T08 Fokus auf [Bauen]', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      const s = s2(u), doc = u.dom.doc;
      bisT01(u, uhr);
      const ersatz = doc.activeElement as unknown as El;
      expect(ersatz.classList.contains('ersatz-ziel')).toBe(true);
      expect(ersatz.getAttribute('aria-label')).toBe('Heizzentrale');
      ersatz.ausloesen('keydown', { key: 'Enter' });
      expect(schrittJetzt(u)).toBe('T02');
      s.tick(uhr.t);
      expect((doc.activeElement as unknown as El).id).toBe('anleiter-weiter');
      expect(doc.querySelector('.ersatz-ziel'), 'W-Schritt: kein Ersatz-Element').toBeNull();
      for (const id of ['T02', 'T03', 'T04', 'T05', 'T06', 'T07']) { s.tick(uhr.t); expect(schrittJetzt(u)).toBe(id); weiterTippen(u); }
      s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T08');
      expect((doc.activeElement as unknown as El).getAttribute('data-ziel')).toBe('bauen');
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_nach_ende_knoepfe_zurueck: nach T26 sind Auftragskarte und Zoomknöpfe zurück, der Auftrag federt 450 ms; „Weniger Bewegung“ ohne Federn', async () => {
    for (const bewegung of ['normal', 'einstellung'] as const) {
      // die Testhilfe nimmt am Ende alle Ersatz-Globale zurück, also je Durchlauf neu
      vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; });
      const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
      await echteSteuerung(spiel, (u) => {
        const s = s2(u);
        bisT01(u, uhr);
        const karte = u.dom.html.querySelector('.auftrag')!, zoom = u.dom.html.querySelector('.zoom')!;
        expect(karte.classList.contains('versteckt')).toBe(true);
        const anim = vi.spyOn(karte, 'animate');
        spiel.tutorialBeenden(); s.tick(uhr.t);
        expect(karte.classList.contains('versteckt')).toBe(false);
        expect(zoom.classList.contains('versteckt')).toBe(false);
        if (bewegung === 'einstellung') { expect(anim).not.toHaveBeenCalled(); return; }
        expect(anim).toHaveBeenCalledTimes(1);
        const [kf, opt] = anim.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions];
        // DESIGN Abschnitt 1/13.5: kurzes Federn 450 ms mit plopp_staerke 0,08 (design/tokens.json)
        expect(opt.duration).toBe(450);
        expect(kf.map((k) => k.transform)).toEqual(['scale(1)', 'scale(1.08)', 'scale(1)']);
      }, { uhr: () => uhr.t, bewegung });
    }
  });

  it('test_nr13_spur_nachfahren_bis_haus2: wer die Finger-Spur in T13 genau nachfährt, verbindet beide Häuser → T14', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    const anim = vi.spyOn(El.prototype, 'animate');
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const punkte = fingerSpurPunkte(anim);
      leinwand(u).ausloesen('pointerdown', zeiger(7, ...punkte[0]));
      for (const p of punkte.slice(1)) leinwand(u).ausloesen('pointermove', zeiger(7, ...p));
      leinwand(u).ausloesen('pointerup', zeiger(7, ...punkte[punkte.length - 1]));
      const leitungBei = (x: number, y: number) => spiel.stand.objekte.some((o) => istLeitung(o.typ) && o.x === x && o.y === y);
      for (const [x, y] of TUTORIAL_SPUR) expect(leitungBei(x, y), `Leitung auf ${x},${y}`).toBe(true);
      expect(spiel.erreichteHaeuser()).toEqual(expect.arrayContaining(tutorialObjekte(spiel).slice(1).map((o) => o.id)));
      s2(u).tick(uhr.t);
      expect(schrittJetzt(u)).toBe('T14');
    }, { uhr: () => uhr.t });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Teil 4 (Nachbesserung nach Review): Fehltipp über die echte Eingabesperre, Geld-Prüfung je Bild, Tastensperre,
// stumme Meldungen über Hinweis-Ereignis und Bestätigen-Weg.
type Fang = Record<string, Array<(e: unknown) => void>>;
/** Die Testhilfe stellt ein `window` ohne Listener-Liste bereit; die Eingabesperre hängt sich dort ein (Capture).
 *  Dieser Test hält die Listener selbst fest – vor dem ersten Anwenden der Ansicht, also vor dem ersten tick. */
function fensterFangen(): Fang {
  const fang: Fang = {};
  const w = window as unknown as { addEventListener: (t: string, f: (e: unknown) => void) => void; removeEventListener: (t: string, f: (e: unknown) => void) => void };
  w.addEventListener = (t, f) => { (fang[t] ??= []).push(f); };
  w.removeEventListener = (t, f) => { fang[t] = (fang[t] ?? []).filter((x) => x !== f); };
  return fang;
}
/** Eine Berührung wie der Browser sie ans Fenster gibt: pointerdown, pointerup, click an derselben Stelle. */
function fensterTipp(u: U, fang: Fang, x: number, y: number): void {
  for (const typ of ['pointerdown', 'pointerup', 'click']) {
    const e = { type: typ, clientX: x, clientY: y, pointerId: 9, pointerType: 'touch', detail: 1, target: u.dom.body, preventDefault() {}, stopPropagation() {} };
    for (const f of [...(fang[typ] ?? [])]) f(e);
  }
}

describe('NR13 P4 Einbindung – Teil 4', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr13_daneben_aendert_nichts: Tipp neben das Ziel ändert Schritt und Blase nicht; ab dem 3. Fehltipp steht der Hilfe-Satz', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      const fang = fensterFangen();
      bisT01(u, uhr);
      expect(fang.pointerdown?.length, 'Testaufbau: die Eingabesperre hängt am Fenster').toBe(1);
      const satz = s2(u).anleitungAnsicht()!.text;
      expect(satz).not.toBe('Tippe auf das große Gebäude, das gelb leuchtet.');
      const k = s2(u).kamera, lage = [k.schiebe_x, k.schiebe_y, k.zoom];
      for (let i = 1; i <= 2; i++) {
        fensterTipp(u, fang, 5, 5); s2(u).tick(uhr.t);
        expect(schrittJetzt(u)).toBe('T01');
        expect(s2(u).anleitungAnsicht()!.text, `nach ${i} Fehltipp(s)`).toBe(satz);
      }
      fensterTipp(u, fang, 5, 5); s2(u).tick(uhr.t);
      expect(schrittJetzt(u)).toBe('T01');
      // T01 hat einen eigenen Hilfe-Satz (src/core/tutorial.ts, Schritt T01)
      expect(s2(u).anleitungAnsicht()!.text).toBe('Tippe auf das große Gebäude, das gelb leuchtet.');
      expect(offeneBlaetter(u)).toHaveLength(0);
      expect([k.schiebe_x, k.schiebe_y, k.zoom]).toEqual(lage);
      expect(u.meldungen).toEqual([]);
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_geld_pruefung_je_bild: T13, beide Häuser erreicht, Geld knapp → Geld direkt erhöhen → nur tick → T14 ohne Geld-Grund', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      wischeFelder(u, SPUR_BIS_HAUS2);
      spiel.stand.geld_eur = 0;
      spiel.stand.geld_eur = spiel.tutorialGeldFehlt_eur();
      wischeFelder(u, [[11, 13]]);
      s2(u).tick(uhr.t);
      expect(schrittJetzt(u)).toBe('T13');
      expect(zeile2(zielEl(u, 'abschliessen')!)).toBe('Geld reicht nicht');
      // Kein Ereignis, nur mehr Geld: allein die Prüfung im Bild darf weiterschalten
      spiel.stand.geld_eur += 100_000;
      expect(spiel.ereignisse).toHaveLength(0);
      s2(u).tick(uhr.t);
      expect(schrittJetzt(u)).toBe('T14');
      expect(zeile2(zielEl(u, 'abschliessen')!)).not.toBe('Geld reicht nicht');
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_tasten_gesperrt: in T01 bewegen Pfeile, +, - und Q/E die Karte nicht; in T13 schieben Pfeile, Q/E drehen nicht', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      // Q/E stoßen eine Drehung nur an (Rest in der Kamera, abgebaut je Bild) – darum zählt auch inBewegung()
      const k = s2(u).kamera as Kam & { inBewegung(): boolean };
      bisT01(u, uhr);
      const lage = (): unknown[] => [k.schiebe_x, k.schiebe_y, k.zoom, k.winkel_rad, k.inBewegung()];
      const vorher = lage();
      expect(vorher[4], 'Testaufbau: keine Drehung angestoßen').toBe(false);
      for (const taste of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'q', 'Q', 'e', 'E']) {
        u.dom.taste(taste);
        expect(lage(), `Taste ${taste} in T01`).toEqual(vorher);
      }
      expect(schrittJetzt(u)).toBe('T01');

      vonT01BisT13(u, spiel, uhr);
      const winkel = k.winkel_rad;
      for (const taste of ['q', 'Q', 'e', 'E']) {
        u.dom.taste(taste);
        expect(k.winkel_rad, `Taste ${taste} in T13`).toBe(winkel);
        expect(k.inBewegung(), `Taste ${taste} in T13`).toBe(false);
      }
      const x = k.schiebe_x;
      u.dom.taste('ArrowLeft');
      expect(k.schiebe_x, 'in T13 darf die Karte geschoben werden').not.toBe(x);
    }, { uhr: () => uhr.t });
  });

  it('test_nr13_meldungen_stumm_hinweis_und_bestaetigen: Hinweis-Ereignis und der Bestätigen-Weg zeigen im Tutorial keine Meldung', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      const st = u.st as unknown as { tick(t: number): void; geist: unknown; bestaetigen(): void };
      bisT01(u, uhr);
      spiel.ereignisse.push({ art: 'hinweis', text: 'Hinweis aus dem Spiel' } as never);
      st.tick(uhr.t);
      expect(u.meldungen, 'Testaufbau: der Hinweis ging an toast()').toContain('Hinweis aus dem Spiel');
      expect(u.meldung()).toBe('');
      // Geist auf der Heizzentrale: kein Platz → bestaetigen() meldet über toast()
      st.geist = { typ: spiel.hz.typ, x: spiel.hz.x, y: spiel.hz.y, kante: groesse(spiel.hz) };
      st.bestaetigen();
      expect(u.meldungen, 'Testaufbau: bestaetigen() ging an toast()').toContain('Hier ist kein Platz – such dir freie Wiese.');
      expect(u.meldung()).toBe('');
    }, { uhr: () => uhr.t });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Teil 5: DESIGN 13.3 „nie über dem Ziel“ – die Anleiter-Karte überdeckt in keinem Schritt einen Lochrand (Browser-Fund
// F3.1: in T24/T25 lag die Karte bei 844×390 über dem Loch). Die Nachbildung rechnet kein Layout: Die Karte bekommt die
// Höhe einer Blase mit „Wusstest du?“-Chip und drei Zeilen (178 px, im Browser in T25 gemessen); die Lochränder liest der
// Test aus der Lage der `.spot-ring`-Elemente, die Karte aus ihrem `left/top/bottom/width`.
describe('NR13 P4 Einbindung – Teil 5', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  const KARTE_H = 178;
  type Kasten = { x: number; y: number; b: number; h: number };
  const zahlAus = (v: unknown): number => parseFloat(String(v));
  const ueberlappt = (a: Kasten, b: Kasten): boolean => a.x < b.x + b.b && b.x < a.x + a.b && a.y < b.y + b.h && b.y < a.y + a.h;

  function kartenKasten(u: U, hoehe: number): Kasten | null {
    const k = u.dom.doc.getElementById('anleiter') as El | null;
    if (!k) return null;
    const st = k.style as Record<string, unknown>;
    const oben = String(st.top ?? ''), unten = /(-?[\d.]+)px/.exec(String(st.bottom ?? ''));
    const y = oben !== '' ? zahlAus(oben) : hoehe - zahlAus(unten?.[1]) - KARTE_H;
    return { x: zahlAus(st.left), y, b: zahlAus(st.width), h: KARTE_H };
  }
  const ringe = (u: U): Kasten[] => u.dom.html.querySelectorAll('.spot-ring').filter((r) => r.isConnected).map((r) => {
    const st = r.style as Record<string, unknown>;
    return { x: zahlAus(st.left), y: zahlAus(st.top), b: zahlAus(st.width), h: zahlAus(st.height) };
  });

  for (const [breite, hoehe] of [[844, 390], [667, 375]] as const) {
    it(`test_nr13_anleiter_nie_ueber_loch (${breite}×${hoehe}): in allen Schritten T01–T26 überschneiden sich Karte und Lochränder nicht`, async () => {
      const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
      let bild = 10_000;
      vi.spyOn(performance, 'now').mockImplementation(() => bild);
      const geprueft: string[] = [], funde: string[] = [];
      await echteSteuerung(spiel, (u) => {
        const s = s2(u), tick = s.tick.bind(s);
        // Nach jedem Bild wie im Spiel weitere Bilder: Kamerafahrten enden (Bildzeit), die gemessene Kartenhöhe wirkt
        s.tick = (t: number): void => {
          tick(t);
          for (let i = 0; i < 3; i++) {
            const k = u.dom.doc.getElementById('anleiter') as El | null;
            if (k) k.rechteck = { left: 0, top: 0, right: 0, bottom: KARTE_H, width: 0, height: KARTE_H, x: 0, y: 0 };
            bild += 1300; tick(t);
          }
          const id = schrittJetzt(u), karte = kartenKasten(u, hoehe), rs = ringe(u);
          if (!id || !karte || rs.length === 0) return;
          geprueft.push(id);
          for (const r of rs) if (ueberlappt(karte, r)) funde.push(`${id}: Karte ${JSON.stringify(karte)} über Loch ${JSON.stringify(r)}`);
        };
        bisT22(u, spiel, uhr);
        for (let i = 0; i < 60 && schrittJetzt(u) !== 'T26'; i++) {
          if (u.dom.doc.getElementById('anleiter-weiter')) weiterTippen(u);
          // Laura spricht nach der Bestellung auf der Fensteruhr (src/ui/sprecher.ts), der Bau läuft auf der Spieluhr
          else { vi.advanceTimersByTime(1000); uhr.t += 1000; }
          s.tick(uhr.t);
        }
        expect(schrittJetzt(u)).toBe('T26');
      }, { uhr: () => uhr.t, breite, hoehe });
      expect(geprueft, 'Testaufbau: Schritte mit Loch geprüft').toEqual(expect.arrayContaining(['T01', 'T05', 'T17', 'T24', 'T25']));
      expect(funde).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// Teil 6: Freistellen der Kartenziele (13.3) – höchstens einmal je Lage, und in T05 schon im Ziel der Fahrt (Review Fix 3).
// Die Kartenhöhe ist wie in Teil 5 fest 178 px; die Bildzeit läuft von Hand, damit Kamerafahrten sicher enden.
describe('NR13 P4 Einbindung – Teil 6', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  const KARTE_H = 178;
  type Fahrt = { nach_x: number; nach_y: number; nach_zoom: number };
  type KamIntern = Kam & { begrenzen(): void; zentrierenBei(...a: number[]): void; fahrtZu(...a: number[]): void; fahrt: Fahrt | null };
  function karteHoch(u: U, h = KARTE_H): void {
    const k = u.dom.doc.getElementById('anleiter') as El | null;
    if (k) k.rechteck = { left: 0, top: 0, right: 0, bottom: h, width: 0, height: h, x: 0, y: 0 };
  }
  /** Zählt die Kamerabewegungen über zentrierenBei (Ausrichten, Freistellen und Fahrtziel laufen alle darüber). */
  function bewegungenZaehlen(k: KamIntern): { n: number } {
    const z = { n: 0 }, zentrieren = k.zentrierenBei.bind(k);
    k.zentrierenBei = (...a: number[]): void => { z.n++; zentrieren(...a); };
    return z;
  }

  it('test_nr13_freistellen_einmal_je_lage: kappt eine Grenze die Verschiebung, bewegt sich die Kamera je Lage genau einmal und der Zoom bleibt', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    let bild = 10_000;
    vi.spyOn(performance, 'now').mockImplementation(() => bild);
    await echteSteuerung(spiel, (u) => {
      const s = s2(u), k = s.kamera as KamIntern;
      bisT01(u, uhr);
      tippePunkt(u, objektMitte(u, spiel.hz));
      for (const id of ['T02', 'T03']) { karteHoch(u); s.tick(uhr.t); expect(schrittJetzt(u)).toBe(id); weiterTippen(u); }
      for (let i = 0; i < 3; i++) { bild += 1300; karteHoch(u); s.tick(uhr.t); }
      expect(schrittJetzt(u), 'Testaufbau').toBe('T04');
      // Grenze, die gar keine Verschiebung zulässt: jede Verschiebung wird auf die Lage von eben zurückgekappt
      const fest = { x: k.schiebe_x, y: k.schiebe_y };
      k.begrenzen = (): void => { k.schiebe_x = fest.x; k.schiebe_y = fest.y; };
      const bewegt = bewegungenZaehlen(k);
      // Die Karte wächst auf 200 px (neue Lage): unten steht sie ab 390 − 12 − 200 = 178, oben bis 64 + 200 = 264 – über
      // bzw. unter ihr bleiben je 113 px, weniger als der Lochrand der Heizzentrale hoch ist. Das Freistellen muss also
      // verkleinern (Faktor < 1); ohne die Sperre je Lage riefe es sich bei gekappter Verschiebung immer wieder auf
      // und verkleinerte den Zoom jedes Mal weiter.
      const zoomVorher = k.zoom;
      karteHoch(u, 200); bild += 1300; s.tick(uhr.t);
      expect(bewegt.n, 'Kamera genau einmal bewegt').toBe(1);
      expect(k.zoom, 'Testaufbau: das Freistellen hat verkleinert').toBeLessThan(zoomVorher);
      const zoom = k.zoom;
      for (let i = 0; i < 5; i++) { bild += 1300; karteHoch(u, 200); s.tick(uhr.t); }
      expect(schrittJetzt(u)).toBe('T04');
      expect(bewegt.n).toBe(1);
      expect(k.zoom).toBe(zoom);
    }, { uhr: () => uhr.t });
  });

  for (const [breite, hoehe] of [[844, 390], [667, 375]] as const) {
    it(`test_nr13_t05_kein_ruck_nach_fahrt (${breite}×${hoehe}): die Fahrt endet dort, wo die Kamera danach bleibt`, async () => {
      const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
      let bild = 10_000;
      vi.spyOn(performance, 'now').mockImplementation(() => bild);
      await echteSteuerung(spiel, (u) => {
        const s = s2(u), k = s.kamera as KamIntern;
        bisT01(u, uhr);
        tippePunkt(u, objektMitte(u, spiel.hz));
        for (const id of ['T02', 'T03', 'T04']) { karteHoch(u); s.tick(uhr.t); expect(schrittJetzt(u)).toBe(id); if (id !== 'T04') weiterTippen(u); }
        // Der Schrittwechsel (und mit ihm die Fahrt) geschieht schon beim Tipp auf [Weiter]
        const ziele: Fahrt[] = [], fahrtZu = k.fahrtZu.bind(k);
        k.fahrtZu = (...a: number[]): void => { fahrtZu(...a); if (k.fahrt) ziele.push({ ...k.fahrt }); };
        karteHoch(u); weiterTippen(u); s.tick(uhr.t);
        expect(schrittJetzt(u)).toBe('T05');
        expect(ziele, 'Testaufbau: T05 fährt').toHaveLength(1);
        const bewegt = bewegungenZaehlen(k);
        for (let i = 0; i < 4; i++) { bild += 1300; karteHoch(u); s.tick(uhr.t); }
        expect(bewegt.n, 'nach der Fahrt keine weitere Kamerabewegung').toBe(0);
        expect(k.schiebe_x).toBeCloseTo(ziele[0].nach_x, 6);
        expect(k.schiebe_y).toBeCloseTo(ziele[0].nach_y, 6);
        expect(k.zoom).toBeCloseTo(ziele[0].nach_zoom, 9);
      }, { uhr: () => uhr.t, breite, hoehe });
    });
  }
});
