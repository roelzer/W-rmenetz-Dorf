import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { echteSteuerung } from './hilfen/echte-steuerung';
import {
  ZUG_HAUS1, ZUG_HAUS2, abheben, bisT12, bisT13h, knopfMitId, knopfRechteck, neuesSpiel, ringMitten, schritt, st, wischeFelder, zielEl,
} from './hilfen/tutorial-zug';

// Bauplan NR20-22 P5 [2.1] „Eigener Abgang“ (DESIGN 13.17.8) und „T12 wählt haupt“: Streifen erst nach dem Abheben, Ring ohne
// Finger an [Zurück] oder [Radierer] – ermittelt in der Steuerung, die als Einzige [Zurück] kennt.
describe('NR21 Einbindung: eigener Abgang in der Steuerung', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr21_fremd_erst_beim_abheben: Zug (12|12)→(12|13) – solange der Finger liegt keine Streifen, nach dem Abheben (12|13),(12|12)', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, [[12, 12], [12, 13]], false); st(u).tick(uhr.t);
      expect(st(u).anleitungAnsicht()!.fremd, 'der Kern kennt das Stück schon im Zug').toEqual([[12, 13], [12, 12]]);
      expect(st(u).szene().tutorial_fremd ?? []).toEqual([]);
      abheben(u, [12, 13]); st(u).tick(uhr.t);
      expect(st(u).szene().tutorial_fremd).toEqual([[12, 13], [12, 12]]);
    }, { uhr: () => uhr.t });
  });
  /** [Zurück] und [Radierer] an feste, verschiedene Stellen legen, ein Bild weiter, dann die Ringmitten lesen. */
  function ringeNachBild(u: Parameters<typeof st>[0], t: number): Array<[number, number]> {
    knopfRechteck(knopfMitId(u, 'zurueck')!, 600, 300);
    knopfRechteck(knopfMitId(u, 'radierer')!, 680, 300);
    st(u).tick(t);
    return ringMitten(u);
  }
  const ZURUECK_MITTE: [number, number] = [622, 322], RADIERER_MITTE: [number, number] = [702, 322];

  it('test_nr21_ring_an_zurueck: letztes Feld (12|13) liegt im fremden Stück → Ring um [Zurück], nicht um den Radierer, kein Finger dort; nach [Zurück] kein Ring mehr', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      expect(ringeNachBild(u, uhr.t)).not.toContainEqual(ZURUECK_MITTE);
      wischeFelder(u, [[12, 12], [12, 13]]); st(u).tick(uhr.t);
      const ringe = ringeNachBild(u, uhr.t);
      expect(ringe).toContainEqual(ZURUECK_MITTE);
      expect(ringe).not.toContainEqual(RADIERER_MITTE);
      const f = u.dom.html.querySelector('.spot-finger');
      expect(f ? [f.style.left, f.style.top] : null, 'Ring ohne Finger').not.toEqual(['622px', '322px']);
      // [Zurück] nimmt nur (12|13); der Rest (12|12) ist jetzt das letzte Feld und bleibt fremd (DESIGN 13.17.9 F3) → Ring bleibt an [Zurück]
      knopfMitId(u, 'zurueck')!.click(); st(u).tick(uhr.t);
      expect(spiel.letzteLeitungFeld()).toEqual([12, 12]);
      expect(st(u).anleitungAnsicht()!.fremd).toEqual([[12, 12]]);
      const rest = ringeNachBild(u, uhr.t);
      expect(rest).toContainEqual(ZURUECK_MITTE);
      expect(rest).not.toContainEqual(RADIERER_MITTE);
      // zweites [Zurück] → nichts mehr fremd, kein Ring mehr
      knopfMitId(u, 'zurueck')!.click(); st(u).tick(uhr.t);
      expect(st(u).anleitungAnsicht()!.fremd).toEqual([]);
      const danach = ringeNachBild(u, uhr.t);
      expect(danach).not.toContainEqual(ZURUECK_MITTE);
      expect(danach).not.toContainEqual(RADIERER_MITTE);
    }, { uhr: () => uhr.t });
  });

  it('test_nr21_ring_an_radierer: nach dem fremden Stück die Spur zu Haus 2 dazu → letztes Feld (11|14) ist kein fremdes → Ring um den Radierer', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      // Startgeld laut tests/nr13-kern.test.ts:11; 30.000 € reichen für alle Felder (Bauplan P5 Test (8)), kein Geld-Satz
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, [[12, 12], [12, 13]]); st(u).tick(uhr.t);
      wischeFelder(u, ZUG_HAUS2); st(u).tick(uhr.t);
      expect(spiel.letzteLeitungFeld()).toEqual([11, 14]);
      expect(st(u).anleitungAnsicht()!.fremd).toEqual([[12, 13], [12, 12]]);
      const ringe = ringeNachBild(u, uhr.t);
      expect(ringe).toContainEqual(RADIERER_MITTE);
      expect(ringe).not.toContainEqual(ZURUECK_MITTE);
    }, { uhr: () => uhr.t });
  });
  it('test_nr21_ring_an_radierer_gleiche_zeile: Spurfeld (10|13) nach dem fremden Stück – gleiche Zeile wie (12|13), aber nicht im Stück → Ring um den Radierer', async () => {
    // Früher ein Stummel (13|13); seit DESIGN 13.17.9 F3 ist jedes Feld abseits der Spur selbst fremd. In Zeile 13 ist (10|13)
    // das einzige Feld, das nie fremd wird (Spurfeld) – es prüft weiter, dass nicht nur die Zeile verglichen wird.
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, [[12, 12], [12, 13]]); st(u).tick(uhr.t);
      wischeFelder(u, [[10, 12], [10, 13]]); st(u).tick(uhr.t);
      expect(spiel.letzteLeitungFeld()).toEqual([10, 13]);
      expect(st(u).anleitungAnsicht()!.fremd).toEqual([[12, 13], [12, 12]]);
      const ringe = ringeNachBild(u, uhr.t);
      expect(ringe).toContainEqual(RADIERER_MITTE);
      expect(ringe).not.toContainEqual(ZURUECK_MITTE);
    }, { uhr: () => uhr.t });
  });
  // Früher Abgang (11|12)→(11|13); (11|12) zwischen Heizzentrale und Hauptleitung schließt seit main 859dda7 einen Ring und wird
  // abgelehnt. Ohne Ring: loses fremdes Stück (11|13), dann (11|14) zum Haus 2 – dieselbe Spalte, aber ein Spurfeld.
  it('test_nr21_ring_an_radierer_gleiche_spalte: fremdes Stück (11|13), dann (11|14) zum Haus 2 – gleiche Spalte wie das Stück, aber Spurfeld → Ring um den Radierer', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, [[11, 13]]); st(u).tick(uhr.t);
      wischeFelder(u, [[11, 13], [11, 14], [12, 14]]); st(u).tick(uhr.t);
      expect(spiel.letzteLeitungFeld()).toEqual([11, 14]);
      expect(st(u).anleitungAnsicht()!.fremd).toEqual([[11, 13]]);
      const ringe = ringeNachBild(u, uhr.t);
      expect(ringe).toContainEqual(RADIERER_MITTE);
      expect(ringe).not.toContainEqual(ZURUECK_MITTE);
    }, { uhr: () => uhr.t });
  });
});

describe('NR21 Einbindung: T12 wählt haupt', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr21_t12_waehlt_haupt: in T12 liegt der Lochrand um die Leitungskarte der Hauptleitung (d32), nicht um die des Anschlusses (d25)', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT12(u, spiel, uhr);
      const w = spiel.tutorialWerte();
      expect([w.haupt, w.anschluss]).toEqual(['d32', 'd25']);
      knopfRechteck(zielEl(u, 'leitungskarte', 'd32')!, 100, 200, 120, 80);
      knopfRechteck(zielEl(u, 'leitungskarte', 'd25')!, 300, 200, 120, 80);
      st(u).tick(uhr.t);
      const ringe = ringMitten(u);
      expect(ringe).toContainEqual([160, 240]);
      expect(ringe).not.toContainEqual([360, 240]);
      expect(schritt(u)).toBe('T12');
    }, { uhr: () => uhr.t });
  });
});
