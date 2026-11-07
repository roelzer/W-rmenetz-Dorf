import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { echteSteuerung } from './hilfen/echte-steuerung';
import {
  ZUG_HAUS1, abheben, bisT12, bisT13h, knopfMitId, knopfRechteck, neuesSpiel, ringMitten, schritt, st, wischeFelder, zielEl,
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
});
