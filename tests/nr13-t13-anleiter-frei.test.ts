// DESIGN 13.16 (Designer-Treueprüfung NR13), Entscheidung Projektleiter 2026-11-06:
//   Muss M1 – in T13 verdeckt die Anleiter-Karte weder die gelbe Spur noch Heizzentrale oder eines der beiden Häuser.
//   Kann K4 – immer gesperrte Aktions-Knöpfe im Tutorial zeigen in Zeile 2 „nach dem Tutorial“, Auswahl-Sperren weiter „später wählbar“.
// Erwartete Zahlen von Hand hergeleitet (Rechnung im Kommentar), nicht mit dem Code ausgerechnet.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KATALOG } from '../src/core/katalog';
import { groesse } from '../src/core/netz';
import { Spiel } from '../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_SPUR, neuesSpielMitTutorial } from '../src/core/start';
import { Tutorial } from '../src/core/tutorial';
import type { Bedienung } from '../src/core/tutorial-vertrag';
import { El } from './hilfen/dom-attrappe';
import { echteSteuerung } from './hilfen/echte-steuerung';

const T0 = 1_000_000;
/** Breite der offenen Zeichenleiste (design/tokens.json menue.mass_px.zeichenleiste_breite) */
const LEISTE_PX = 216;

type Grenze = { zoom_min: number };
type Kam = { zoom: number; winkel_rad: number; grenze: Grenze | null; mitte(x: number, y: number): [number, number] };
type St = { tick(t: number): void; kamera: Kam; anleitungAnsicht(): { schritt: string } | null };
type U = Parameters<Parameters<typeof echteSteuerung>[1]>[0];
type Obj = { x: number; y: number; typ: string };

const st = (u: U): St => u.st as unknown as St;
const schrittJetzt = (u: U): string | undefined => st(u).anleitungAnsicht()?.schritt;
const zielEl = (u: U, name: string, typ?: string) => u.dom.html.querySelector(`[data-ziel="${name}"]${typ ? `[data-typ="${typ}"]` : ''}`);
const hausBei = (spiel: Spiel, [x, y]: readonly [number, number]) => spiel.stand.objekte.find((o) => o.x === x && o.y === y && KATALOG[o.typ].kategorie === 'haus')!;
function objektMitte(u: U, o: Obj): [number, number] {
  const k = groesse(o as never);
  return st(u).kamera.mitte(o.x + (k - 1) / 2, o.y + (k - 1) / 2);
}
function weiterTippen(u: U): void {
  const k = u.dom.doc.getElementById('anleiter-weiter');
  expect(k, `[Weiter] in ${schrittJetzt(u)}`).not.toBeNull();
  k!.click();
}
function tippePunkt(u: U, [mx, my]: [number, number]): void {
  const c = u.dom.app.querySelector('canvas')!, z = { pointerId: 3, clientX: mx, clientY: my, pointerType: 'touch', button: 0 };
  c.ausloesen('pointerdown', z); c.ausloesen('pointerup', z);
}
/** Echter Klickweg von der Wiedereinstiegs-Blase bis T13 (Zeichenleiste offen), wie in nr13-einbindung.test.ts. */
function bisT13(u: U, spiel: Spiel, uhr: { t: number }): void {
  const s = st(u);
  s.tick(uhr.t); weiterTippen(u);
  s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T01');
  tippePunkt(u, objektMitte(u, spiel.hz));
  for (const id of ['T02', 'T03', 'T04', 'T05', 'T06', 'T07']) { s.tick(uhr.t); expect(schrittJetzt(u)).toBe(id); weiterTippen(u); }
  s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T08');
  zielEl(u, 'bauen')!.click();
  s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T10');
  zielEl(u, 'philipp')!.click();
  s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T11');
  // Philipps Blase steht höchstens 3.800 + 2.500 ms und blendet in 350 ms aus (src/ui/sprecher.ts)
  vi.advanceTimersByTime(7_000);
  uhr.t += 10_000; s.tick(uhr.t); weiterTippen(u);
  s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T12');
  zielEl(u, 'leitungskarte', spiel.tutorialWerte().leitung)!.click();
  s.tick(uhr.t); expect(schrittJetzt(u)).toBe('T13');
}

describe('NR13 Design 13.16 M1: Anleiter-Karte in T13 frei von Spur und Gebäuden', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  // Karte nach 13.3 (Leiste offen): Breite min(460, frei − 2 × 12), links 12, Höhe 162 (Token anleiter_hoehe), unten 12 Rand.
  //   667 × 375: frei 667 − 216 = 451 → Breite 427, oben 375 − 12 − 162 = 201 (Foto 667x375_T13_spur.png: Karte ab x 12 bis 439).
  //   844 × 390: frei 844 − 216 = 628 → Breite 460, oben 390 − 12 − 162 = 216.
  for (const [breite, hoehe, karte] of [[667, 375, { x: 12, y: 201, b: 427, h: 162 }], [844, 390, { x: 12, y: 216, b: 460, h: 162 }]] as const) {
    it(`test_nr13_t13_anleiter_verdeckt_nichts_${breite}: Spur, Heizzentrale und beide Häuser liegen über der Karte und links der Leiste`, async () => {
      const uhr = { t: T0 }, spiel = new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);
      // Die DOM-Nachbildung rechnet kein Layout: die offene Zeichenleiste bekommt ihre Breite wie im Browser
      const echt = El.prototype.getBoundingClientRect;
      vi.spyOn(El.prototype, 'getBoundingClientRect').mockImplementation(function (this: El) {
        if (!this.classList.contains('zeichenleiste')) return echt.call(this);
        return { left: breite - LEISTE_PX, top: 0, right: breite, bottom: hoehe, width: LEISTE_PX, height: hoehe, x: breite - LEISTE_PX, y: 0 };
      });
      await echteSteuerung(spiel, (u) => {
        bisT13(u, spiel, uhr);
        const k = st(u).kamera;
        expect(k.winkel_rad).toBe(0);
        // Zoom höchstens bis 2 gesenkt; die T13-Grenze gilt ab der neuen Lage (zoom_min = aktueller Zoom)
        expect(k.zoom).toBeGreaterThanOrEqual(2);
        expect(k.grenze!.zoom_min).toBeCloseTo(k.zoom, 6);
        const halb = k.mitte(1, 0)[0] - k.mitte(0, 0)[0]; // halbe Feldbreite tw / 2 (ohne Drehung)
        const [h1, h2] = [hausBei(spiel, ERSTE_HAEUSER[0]), hausBei(spiel, ERSTE_HAEUSER[1])];
        const punkte: Array<[string, [number, number]]> = [
          ...TUTORIAL_SPUR.map(([x, y]): [string, [number, number]] => [`Spur ${x}|${y}`, k.mitte(x, y)]),
          ['Heizzentrale', objektMitte(u, spiel.hz)], ['Haus 1', objektMitte(u, h1)], ['Haus 2', objektMitte(u, h2)],
        ];
        for (const [name, [px, py]] of punkte) {
          const schneidet = px - halb < karte.x + karte.b && karte.x < px + halb && py - halb < karte.y + karte.h && karte.y < py + halb;
          expect([name, schneidet], `${name} bei ${px.toFixed(1)}|${py.toFixed(1)}, halbe Feldbreite ${halb.toFixed(1)}`).toEqual([name, false]);
          expect(px + halb, `${name} links der Leiste`).toBeLessThanOrEqual(breite - LEISTE_PX);
          expect(px - halb, `${name} im Bild`).toBeGreaterThanOrEqual(0);
        }
      }, { uhr: () => uhr.t, breite, hoehe });
    });
  }
});

describe('NR13 Design 13.16 K4: Zeile 2 der immer gesperrten Knöpfe', () => {
  it('test_nr13_aktionen_nach_dem_tutorial: Verwerfen, Sofort fertig, Express, Weiter einzeichnen → „nach dem Tutorial“; übrige Grundsperren bleiben', () => {
    const t = new Tutorial(new Spiel(neuesSpielMitTutorial(T0), () => T0));
    const AKTIONEN: Bedienung[] = ['verwerfen', 'sofort', 'express', 'weiter_einzeichnen'];
    for (const b of AKTIONEN) expect([b, t.sperre(b)]).toEqual([b, { kurz: 'nach dem Tutorial', satz: '' }]);
    for (const b of ['zoom', 'doerfer', 'auftrag', 'karte_gesten', 'blatt_schliessen'] as Bedienung[]) expect([b, t.sperre(b)!.kurz]).toEqual([b, 'später wählbar']);
    // 13.15: Zeile 2 höchstens 18 Zeichen
    expect('nach dem Tutorial'.length).toBeLessThanOrEqual(18);
  });
});
