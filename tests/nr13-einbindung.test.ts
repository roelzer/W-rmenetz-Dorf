import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KATALOG } from '../src/core/katalog';
import { groesse } from '../src/core/netz';
import { Spiel } from '../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_SPUR, neuesSpielMitTutorial } from '../src/core/start';
import { Tutorial } from '../src/core/tutorial';
import type { TippMeldung } from '../src/core/tutorial-vertrag';
import { echteSteuerung } from './hilfen/echte-steuerung';

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
      const erwartet = k.einpassenZiel(rahmenHzHaeuser(spiel), { x: 0, y: 0, b: 844, h: 390 }, 24, 3).zoom;
      expect(k.zoom).toBeCloseTo(erwartet, 6);
      expect(k.grenze!.zoom_min).toBeCloseTo(erwartet, 6);
      expect(k.grenze!.zoom_max).toBe(3);
      expect(k.grenze!.mitte_px).toEqual([422, 195]);
      k.groesseSetzen(700, 390, 2);
      s2(u).tick(uhr.t);
      expect(k.zoom).toBeCloseTo(erwartet, 6);
      expect(k.grenze!.zoom_min).toBeCloseTo(erwartet, 6);
      expect(k.grenze!.mitte_px).toEqual([350, 195]);
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
