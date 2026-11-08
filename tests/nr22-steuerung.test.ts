import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Spiel } from '../src/core/spiel';
import { KONSTANTEN, istLeitung, passendeStation, type TypId } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import type { Objekt } from '../src/core/typen';
import type { Kamera } from '../src/render/kamera';
import type { Szene } from '../src/render/szene';
import { objektAmPunkt } from '../src/render/treffer';
import { dreieckMitte } from '../src/render/ueberlast';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import { abschnittOeffnen, objektBei, vorstellen, type Uhr } from './hilfen/nr18';
import { leeresDorf } from './hilfen/nr22';

// Bauplan docs/bauplaene/NR20-22.md P7 (Punkt steuerung.ts, Rückfrage „welche Leitung öffnet das Blatt“), DESIGN 13.17.3.
// Dorf wie tests/nr22-kern.test.ts, von Hand hergeleitet: Heizzentrale 2×2 ab (11|10), 25er-Stamm (11|9) → (6|9), danach 40er
// bis (3|9), (2|9), (2|8). Reihenhaus (3|10) 16 kW + EFH (2|7) 10 kW = 26 kW durch den Stamm; 25er trägt 15 kW, 32er 25 kW,
// 40er 40 kW → ein Stück aus den sechs Stammfeldern, empfohlen die 40er. Feldnummer = y × 24 + x (KONSTANTEN.feldanzahl = 24).
// Dreiecke (E9): Stück mit 6 Feldern, Tiefen t0 … t0 + 5 → nur das erste Feld (t0 + 8 liegt hinter dem Ende).
const T0 = 1_000_000_000_000;
const STAMM: ReadonlyArray<[number, number]> = [[11, 9], [10, 9], [9, 9], [8, 9], [7, 9], [6, 9]];
const ENDE: ReadonlyArray<[number, number]> = [[5, 9], [4, 9], [3, 9], [2, 9], [2, 8]];
const STAMM_FELDER = [227, 226, 225, 224, 223, 222];
const ERSTES = 227;

type Innen = {
  szene(): Szene;
  kamera: Kamera;
  kontextUi: { offenFuer: number | null; schliessen(): void };
};
const innen = (u: EchteUmgebung): Innen => u.st as unknown as Innen;

const zeichne = (s: Spiel, typ: TypId, weg: ReadonlyArray<[number, number]>): void => {
  for (const [x, y] of weg) expect(s.platzieren(typ, x, y).ok, `platzieren ${typ} (${x}|${y})`).toBe(true);
};
const haus = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => !istLeitung(o.typ) && o.typ !== 'hz')!;
const leitung = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => istLeitung(o.typ))!;

/** Stamm und Ende eingezeichnet, beide Kunden mit Station, Abschnitt abgeschlossen (noch nicht bestellt). */
function eingezeichnet(): { s: Spiel; z: Uhr } {
  const d = leeresDorf(T0);
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  zeichne(d.s, 'd25', STAMM);
  zeichne(d.s, 'd40', ENDE);
  for (const [x, y] of [[3, 10], [2, 7]]) {
    const h = haus(d.s, x, y);
    expect(d.s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
  }
  expect(d.s.abschnittAbschliessen().ok).toBe(true);
  return d;
}
function bauen(s: Spiel, z: Uhr): void {
  expect(s.materialBestellen().ok).toBe(true);
  vorstellen(s, z, KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
  expect(s.stand.abschnitt).toBeUndefined();
}
/** Gebaut, der 25er-Stamm ist überlastet. */
function gebaut(): { s: Spiel; z: Uhr } {
  const d = eingezeichnet();
  bauen(d.s, d.z);
  return d;
}
/** Gebaut und ein neuer Abschnitt offen (Ersatz planen geht nur im offenen Abschnitt). */
function gebautOffen(): { s: Spiel; z: Uhr } {
  const d = gebaut();
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  return d;
}
/** Beide Kunden vom Netz nehmen bzw. wieder anschließen: ohne kalte Kunden gibt es kein überlastetes Stück. */
function kundenAbklemmen(s: Spiel, ab: boolean): void {
  for (const [x, y] of [[3, 10], [2, 7]]) haus(s, x, y).ohne_station = ab ? true : undefined;
  s.neuBerechnen();
}
/** Echter Fingertipp auf die Leinwand (pointerdown + pointerup an derselben Stelle). */
function tippeAuf(u: EchteUmgebung, mx: number, my: number): void {
  const canvas = u.dom.app.querySelector('canvas')!;
  const ev = { pointerId: 1, clientX: mx, clientY: my, pointerType: 'touch', button: 0 };
  canvas.ausloesen('pointerdown', ev);
  canvas.ausloesen('pointerup', ev);
}
const BILD = { breite: 844, hoehe: 390 };

describe('NR22 P7b Steuerung: Szene-Feld ueberlast', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('nur eingezeichnet: kein Stück; gebaut: ein Stück mit den Stammfeldern und einem Dreieck auf dem ersten Feld', async () => {
    const d = eingezeichnet();
    await echteSteuerung(d.s, (u) => {
      expect(innen(u).szene().ueberlast).toEqual([]);
      bauen(d.s, d.z);
      expect(innen(u).szene().ueberlast).toEqual([{ felder: STAMM_FELDER, dreiecke: [ERSTES], geplant: false, seit_ms: d.z.t }]);
    }, { ...BILD, uhr: () => d.z.t });
  });

  it('seit_ms bleibt der Zeitpunkt der ersten Sichtung – das Dreieck federt nicht in jedem Bild neu', async () => {
    const d = gebaut();
    await echteSteuerung(d.s, (u) => {
      const erst = d.z.t;
      expect(innen(u).szene().ueberlast?.[0].seit_ms).toBe(erst);
      d.z.t += 250;
      expect(innen(u).szene().ueberlast?.[0].seit_ms).toBe(erst);
      d.z.t += 10_000;
      expect(innen(u).szene().ueberlast?.[0].seit_ms).toBe(erst);
    }, { ...BILD, uhr: () => d.z.t });
  });

  it('verschwindet das Stück, wird der Eintrag gelöscht: beim Wiedererscheinen gilt ein neuer Zeitpunkt', async () => {
    const d = gebaut();
    await echteSteuerung(d.s, (u) => {
      const erst = d.z.t;
      expect(innen(u).szene().ueberlast?.[0].seit_ms).toBe(erst);
      d.z.t += 1_000;
      kundenAbklemmen(d.s, true);
      expect(d.s.ueberlastStuecke(), 'Vorprobe: ohne kalte Kunden kein Stück').toEqual([]);
      expect(innen(u).szene().ueberlast).toEqual([]);
      d.z.t += 1_000;
      kundenAbklemmen(d.s, false);
      expect(d.s.ueberlastStuecke().map((e) => e.felder), 'Vorprobe: Stück wieder da').toEqual([STAMM_FELDER]);
      expect(innen(u).szene().ueberlast?.[0].seit_ms).toBe(erst + 2_000);
    }, { ...BILD, uhr: () => d.z.t });
  });

  it('geplant erst, wenn jedes Feld des Stücks einen Ersatz in der empfohlenen Größe hat', async () => {
    const d = gebautOffen();
    await echteSteuerung(d.s, (u) => {
      const geplant = (): boolean | undefined => innen(u).szene().ueberlast?.[0].geplant;
      expect(geplant()).toBe(false);
      // ein Feld mit 40er-Ersatz: fünf Felder offen
      expect(d.s.ersatzPlanen(leitung(d.s, 11, 9).id, 'd40').ok).toBe(true);
      expect(geplant()).toBe(false);
      // alle übrigen Felder nur auf 32er: zu dünn für die Empfehlung (40er), also nicht geplant
      for (const [x, y] of STAMM.slice(1)) expect(d.s.ersatzPlanen(leitung(d.s, x, y).id, 'd32').ok).toBe(true);
      expect(geplant()).toBe(false);
      expect(d.s.stueckVergroessern(ERSTES, 'd40').ok).toBe(true);
      expect(geplant()).toBe(true);
    }, { ...BILD, uhr: () => d.z.t });
  });
});

describe('NR22 P7b Steuerung: Tipp auf das Warndreieck', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('öffnet das Leitungsblatt der Leitung auf dem Dreieck-Feld, auch wenn dort keine Leitung gezeichnet ist', async () => {
    const d = gebaut();
    await echteSteuerung(d.s, (u) => {
      const k = innen(u).kamera;
      const [mx, my] = dreieckMitte(k, ERSTES);
      expect(mx > 0 && mx < BILD.breite && my > 0 && my < BILD.hoehe, 'Vorprobe: Dreieck im Bild').toBe(true);
      // Vorprobe: An der Dreiecksmitte liegt nicht die Leitung (11|9) – ohne Dreieck-Treffer öffnete hier ihr Blatt nicht
      expect(objektAmPunkt(k, d.s.stand.objekte, mx, my)?.id).not.toBe(leitung(d.s, 11, 9).id);
      tippeAuf(u, mx, my);
      expect(innen(u).kontextUi.offenFuer).toBe(leitung(d.s, 11, 9).id);
    }, { ...BILD, uhr: () => d.z.t });
  });

  it('ohne Überlast trifft dieselbe Stelle das, was dort liegt (kein Leitungsblatt aus dem Nichts)', async () => {
    const d = gebaut();
    kundenAbklemmen(d.s, true);
    await echteSteuerung(d.s, (u) => {
      const k = innen(u).kamera;
      const [mx, my] = dreieckMitte(k, ERSTES);
      const dort = objektAmPunkt(k, d.s.stand.objekte, mx, my)?.id ?? null;
      tippeAuf(u, mx, my);
      expect(innen(u).kontextUi.offenFuer).toBe(dort);
    }, { ...BILD, uhr: () => d.z.t });
  });
});

describe('NR22 P7b Steuerung: Vorschau-Rauten bei offenem Leitungsblatt', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('Blatt einer überlasteten Leitung: die offenen Felder des Stücks in der empfohlenen Größe', async () => {
    const d = gebautOffen();
    await echteSteuerung(d.s, (u) => {
      expect(innen(u).szene().ueberlast_vorschau, 'kein Blatt offen').toBeUndefined();
      u.st.kontext(leitung(d.s, 8, 9).id);
      expect(innen(u).szene().ueberlast_vorschau).toEqual({ felder: STAMM_FELDER, typ: 'd40' });
      // ein Feld schon auf 40er geplant: es würde nicht mehr vergrößert
      expect(d.s.ersatzPlanen(leitung(d.s, 11, 9).id, 'd40').ok).toBe(true);
      expect(innen(u).szene().ueberlast_vorschau).toEqual({ felder: [226, 225, 224, 223, 222], typ: 'd40' });
      // ganzes Stück geplant: keine Vorschau mehr (die Planrauten des Ersatzes zeigen es)
      expect(d.s.stueckVergroessern(ERSTES, 'd40').ok).toBe(true);
      expect(innen(u).szene().ueberlast_vorschau).toBeUndefined();
    }, { ...BILD, uhr: () => d.z.t });
  });

  it('keine Vorschau bei Blatt einer nicht überlasteten Leitung, eines Hauses oder nach dem Schließen', async () => {
    const d = gebautOffen();
    await echteSteuerung(d.s, (u) => {
      u.st.kontext(leitung(d.s, 4, 9).id);
      expect(innen(u).szene().ueberlast_vorschau, '40er-Ende ist nicht überlastet').toBeUndefined();
      u.st.kontext(haus(d.s, 3, 10).id);
      expect(innen(u).szene().ueberlast_vorschau, 'Hausblatt').toBeUndefined();
      u.st.kontext(leitung(d.s, 6, 9).id);
      expect(innen(u).szene().ueberlast_vorschau, 'Vorprobe: letztes Stammfeld').toEqual({ felder: STAMM_FELDER, typ: 'd40' });
      innen(u).kontextUi.schliessen();
      expect(innen(u).szene().ueberlast_vorschau, 'Blatt zu').toBeUndefined();
    }, { ...BILD, uhr: () => d.z.t });
  });
});
