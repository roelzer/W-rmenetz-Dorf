import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KATALOG } from '../src/core/katalog';
import { groesse } from '../src/core/netz';
import { Spiel } from '../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT, neuesSpielMitTutorial } from '../src/core/start';
import type { Feld, TutorialAnsicht, TutorialBandFeld } from '../src/core/tutorial-vertrag';
import { echteSteuerung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';

// Bauplan NR20-22 P5 (Einbindung Tutorial): die echte Steuerung überträgt die Tutorial-Ansicht auf Szene, Finger, Kamera,
// Zeichenleiste und Schleier. Erwartete Zahlen stammen aus design/tokens.json (Quelle jeweils am Test).
const T0 = 1_000_000;

type Kam = { breite: number; hoehe: number; zoom: number; schiebe_x: number; schiebe_y: number; tw: number; th: number;
  grenze: { mitte_px: readonly [number, number]; zoom_min: number } | null; mitte(x: number, y: number): [number, number];
  groesseSetzen(b: number, h: number, d: number): boolean };
type SzeneTeil = { tutorial_band?: ReadonlyArray<TutorialBandFeld>; naechstes_feld?: Feld; zielscheibe?: Feld;
  ziel?: { stecker: number[]; ring: number | null }; ruhe?: boolean; tutorial_fremd?: ReadonlyArray<Feld>;
  erreicht?: ReadonlyArray<{ id: number; seit_ms: number }>; tutorial_spur?: unknown };
type St = { tick(t: number): void; kamera: Kam; anleitungAnsicht(): TutorialAnsicht | null; szene(): SzeneTeil };
type U = Parameters<Parameters<typeof echteSteuerung>[1]>[0];
type Obj = { x: number; y: number; typ: string };

const st = (u: U): St => u.st as unknown as St;
const schritt = (u: U): string | undefined => st(u).anleitungAnsicht()?.schritt;
const zielEl = (u: U, name: string, typ?: string) => u.dom.html.querySelector(`[data-ziel="${name}"]${typ ? `[data-typ="${typ}"]` : ''}`);
const knopfMitId = (u: U, id: string): El | null => u.dom.html.querySelector(`[data-id="${id}"]`);
function farbknopf(u: U, typ: string): El {
  const k = knopfMitId(u, `farbe-${typ}`);
  expect(k, `Farbknopf ${typ} in ${schritt(u)}`).not.toBeNull();
  return k!;
}
function weiterTippen(u: U): void {
  const k = u.dom.doc.getElementById('anleiter-weiter');
  expect(k, `[Weiter] in ${schritt(u)}`).not.toBeNull();
  k!.click();
}
function objektMitte(u: U, o: Obj): [number, number] {
  const k = groesse(o as never);
  return st(u).kamera.mitte(o.x + (k - 1) / 2, o.y + (k - 1) / 2);
}
const leinwand = (u: U) => u.dom.app.querySelector('canvas')!;
const zeiger = (id: number, x: number, y: number) => ({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch', button: 0 });
function tippePunkt(u: U, [mx, my]: [number, number]): void {
  leinwand(u).ausloesen('pointerdown', zeiger(3, mx, my)); leinwand(u).ausloesen('pointerup', zeiger(3, mx, my));
}
/** Zug über Feldmitten; `abheben: false` lässt den Finger auf dem letzten Feld liegen. */
function wischeFelder(u: U, felder: ReadonlyArray<readonly [number, number]>, abheben = true): void {
  const evs = felder.map(([x, y]) => { const [mx, my] = st(u).kamera.mitte(x, y); return zeiger(7, mx, my); });
  leinwand(u).ausloesen('pointerdown', evs[0]);
  for (const ev of evs.slice(1)) leinwand(u).ausloesen('pointermove', ev);
  if (abheben) leinwand(u).ausloesen('pointerup', evs[evs.length - 1]);
}
const hausBei = (spiel: Spiel, [x, y]: readonly [number, number]) => spiel.stand.objekte.find((o) => o.x === x && o.y === y && KATALOG[o.typ].kategorie === 'haus')!;
const ZUG_HAUS1 = [...TUTORIAL_ANSCHLUSS_1, ERSTE_HAEUSER[0]];
const ZUG_HAUS2 = [...TUTORIAL_ANSCHLUSS_2, ERSTE_HAEUSER[1]];

/** Echter Klickweg von der Wiedereinstiegs-Blase bis T13 (Zeichenleiste offen). */
function bisT13(u: U, spiel: Spiel, uhr: { t: number }): void {
  const s = st(u);
  s.tick(uhr.t); weiterTippen(u);
  s.tick(uhr.t); expect(schritt(u)).toBe('T01');
  tippePunkt(u, objektMitte(u, spiel.hz));
  for (const id of ['T02', 'T03', 'T04', 'T05', 'T06', 'T07']) { s.tick(uhr.t); expect(schritt(u)).toBe(id); weiterTippen(u); }
  s.tick(uhr.t); expect(schritt(u)).toBe('T08');
  zielEl(u, 'bauen')!.click();
  s.tick(uhr.t); expect(schritt(u)).toBe('T10');
  zielEl(u, 'philipp')!.click();
  s.tick(uhr.t); expect(schritt(u)).toBe('T11');
  vi.advanceTimersByTime(7_000);
  uhr.t += 10_000; s.tick(uhr.t); weiterTippen(u);
  s.tick(uhr.t); expect(schritt(u)).toBe('T12');
  zielEl(u, 'leitungskarte', spiel.tutorialWerte().haupt)!.click();
  s.tick(uhr.t); expect(schritt(u)).toBe('T13');
}
function bisT13h(u: U, spiel: Spiel, uhr: { t: number }): void {
  bisT13(u, spiel, uhr);
  wischeFelder(u, TUTORIAL_HAUPT);
  st(u).tick(uhr.t); expect(schritt(u)).toBe('T13w');
  farbknopf(u, spiel.tutorialWerte().anschluss).click();
  st(u).tick(uhr.t); expect(schritt(u)).toBe('T13h');
}
const neuesSpiel = (uhr: { t: number }): Spiel => new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);
const fingerEl = (u: U): El | null => u.dom.html.querySelector('.spot-finger');
const kameraLage = (u: U): number[] => { const k = st(u).kamera; return [k.zoom, k.schiebe_x, k.schiebe_y]; };

describe('NR20-22 P5 Einbindung: Szene, Finger, Kamera', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr20_szene_band_und_zielscheibe: T13 frisch → Band aus der Ansicht, Raute (10|11), Zielscheibe (10|12), Stecker über beiden Häusern, Ruhe; keine alte Spur', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const a = st(u).anleitungAnsicht()!, sz = st(u).szene();
      const [h1, h2] = [hausBei(spiel, ERSTE_HAEUSER[0]), hausBei(spiel, ERSTE_HAEUSER[1])];
      expect(a.band).toHaveLength(6);
      expect(sz.tutorial_band).toEqual(a.band);
      expect(sz.naechstes_feld).toEqual([10, 11]);
      expect(sz.zielscheibe).toEqual([10, 12]);
      expect(sz.ziel).toEqual({ stecker: [h1.id, h2.id], ring: null });
      expect(sz.ruhe).toBe(true);
      expect(sz.erreicht ?? []).toEqual([]);
      expect(sz.tutorial_fremd ?? []).toEqual([]);
      expect(sz.tutorial_spur).toBeUndefined();
    }, { uhr: () => uhr.t });
  });

  it('test_nr20_szene_erreicht_aus_ansicht: T13h nach Haus 1 → Haken über Haus 1 aus erreicht_ids, Ring um Haus 2; nach dem Tutorial keine Tutorial-Felder', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      const [h1, h2] = [hausBei(spiel, ERSTE_HAEUSER[0]), hausBei(spiel, ERSTE_HAEUSER[1])];
      wischeFelder(u, ZUG_HAUS1);
      st(u).tick(uhr.t);
      const sz = st(u).szene();
      expect(st(u).anleitungAnsicht()!.erreicht_ids).toEqual([h1.id]);
      expect(sz.erreicht?.map((e) => e.id)).toEqual([h1.id]);
      expect(sz.ziel).toEqual({ stecker: [h1.id, h2.id], ring: h2.id });
      expect(sz.naechstes_feld).toEqual([10, 13]);
      spiel.tutorialBeenden(); st(u).tick(uhr.t);
      const nach = st(u).szene();
      expect([nach.tutorial_band, nach.zielscheibe, nach.naechstes_feld, nach.ziel, nach.ruhe, nach.erreicht]).toEqual([undefined, undefined, undefined, undefined, undefined, undefined]);
    }, { uhr: () => uhr.t });
  });

  it('test_nr20_finger_aus_finger_weg: T13 → Finger startet auf (10|11); beim Berühren weg, 4 s nach dem Abheben zurück; T13w → Finger tippt auf den Farbknopf', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const [x0, y0] = st(u).kamera.mitte(10, 11);
      const runde = (n: number): number => Math.round(n * 100) / 100;
      expect(fingerEl(u)!.style.transform).toBe(`translate(${runde(x0)}px, ${runde(y0)}px)`);
      // Finger auf einem freien Feld neben der Spur (kein Zug über die Spur) – solange er liegt, ist der Vorführ-Finger weg
      const [mx, my] = st(u).kamera.mitte(14, 8);
      leinwand(u).ausloesen('pointerdown', zeiger(7, mx, my));
      st(u).tick(uhr.t);
      expect(fingerEl(u)).toBeNull();
      leinwand(u).ausloesen('pointerup', zeiger(7, mx, my));
      vi.advanceTimersByTime(3_999); st(u).tick(uhr.t);
      expect(fingerEl(u), '4 s (design/tokens.json finger_wieder) noch nicht um').toBeNull();
      vi.advanceTimersByTime(1); st(u).tick(uhr.t);
      expect(fingerEl(u)).not.toBeNull();
      // Probe-Leitung auf (14|8) wieder weg, dann die Hauptleitung
      knopfMitId(u, 'zurueck')!.click();
      wischeFelder(u, TUTORIAL_HAUPT);
      vi.advanceTimersByTime(4_000); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T13w');
      const k = farbknopf(u, spiel.tutorialWerte().anschluss);
      k.rechteck = { left: 760, top: 120, right: 804, bottom: 164, width: 44, height: 44, x: 760, y: 120 };
      st(u).tick(uhr.t);
      const f = fingerEl(u)!;
      expect([f.style.left, f.style.top]).toEqual(['782px', '142px']);
    }, { uhr: () => uhr.t });
  });

  for (const [breite, hoehe] of [[844, 390], [667, 375]] as const) {
    it(`test_nr20_einpassen_kompakt (${breite}×${hoehe}): Zoom 2–3, Band, Heizzentrale und Häuser über der 92-px-Karte mit 24 px Rand, Grenze in der Mitte der freien Fläche`, async () => {
      const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
      await echteSteuerung(spiel, (u) => {
        bisT13(u, spiel, uhr);
        const k = st(u).kamera, a = st(u).anleitungAnsicht()!;
        // design/tokens.json: blatt_oben_quer 64, anleiter_rand 12, anleiter_kompakt_hoehe 92, anleiter_ziel_abstand 16
        const oben = 64, unten = hoehe - 12 - 92 - 16;
        expect(k.zoom).toBeGreaterThanOrEqual(2 - 1e-9);
        expect(k.zoom).toBeLessThanOrEqual(3 + 1e-9);
        expect(k.grenze!.mitte_px[1]).toBe((oben + unten) / 2);
        const halb = k.tw / 2, rand = k.zoom > 2 + 1e-9 ? 24 - 1 : 0;
        const punkte = [...a.band.map((f) => k.mitte(f.x, f.y)), objektMitte(u, spiel.hz), objektMitte(u, hausBei(spiel, ERSTE_HAEUSER[0])), objektMitte(u, hausBei(spiel, ERSTE_HAEUSER[1]))];
        for (const [, py] of punkte) {
          expect(py - halb).toBeGreaterThanOrEqual(oben + rand);
          expect(py + halb).toBeLessThanOrEqual(unten - rand);
        }
      }, { uhr: () => uhr.t, breite, hoehe });
    });
  }

  it('test_nr20_kamera_ohne_sprung: Wechsel T13 → T13w → T13h → T14 → T13h lässt Zoom und Verschiebung unverändert', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const vorher = kameraLage(u);
      wischeFelder(u, TUTORIAL_HAUPT);
      st(u).tick(uhr.t); expect(schritt(u)).toBe('T13w');
      expect(kameraLage(u)).toEqual(vorher);
      farbknopf(u, spiel.tutorialWerte().anschluss).click();
      st(u).tick(uhr.t); expect(schritt(u)).toBe('T13h');
      expect(kameraLage(u)).toEqual(vorher);
      wischeFelder(u, ZUG_HAUS1); wischeFelder(u, ZUG_HAUS2);
      st(u).tick(uhr.t); expect(schritt(u)).toBe('T14');
      expect(kameraLage(u)).toEqual(vorher);
      // Eigener Abgang in T14 (dort ist Zeichnen frei) → zurück nach T13h, die Kamera steht
      wischeFelder(u, [[12, 12], [12, 13]]);
      st(u).tick(uhr.t); expect(schritt(u)).toBe('T13h');
      expect(kameraLage(u)).toEqual(vorher);
      expect(st(u).kamera.grenze, 'Grenze wieder gesetzt').not.toBeNull();
    }, { uhr: () => uhr.t });
  });
});

describe('NR20-22 P5 Einbindung: Zeichnen ruht in T13w', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr20_t13w_zug_aendert_nichts: jeder Zug in T13w legt nichts und zählt einmal „daneben“ – erst der dritte bringt den Hilfe-Satz', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      wischeFelder(u, TUTORIAL_HAUPT);
      st(u).tick(uhr.t); expect(schritt(u)).toBe('T13w');
      const objekte = spiel.stand.objekte.length, grundtext = st(u).anleitungAnsicht()!.text;
      for (let i = 0; i < 2; i++) { wischeFelder(u, [[10, 13], [10, 14], [11, 14]]); st(u).tick(uhr.t); }
      expect(spiel.stand.objekte.length).toBe(objekte);
      expect(st(u).anleitungAnsicht()!.text, 'zwei Züge: noch kein Hilfe-Satz').toBe(grundtext);
      wischeFelder(u, [[10, 13], [10, 14], [11, 14]]); st(u).tick(uhr.t);
      expect(st(u).anleitungAnsicht()!.text).toBe('Tippe rechts in der Leiste auf 25.');
      expect(schritt(u)).toBe('T13w');
      expect(spiel.stand.objekte.length).toBe(objekte);
    }, { uhr: () => uhr.t });
  });
});
