import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import type { TypId } from '../src/core/katalog';
import type { InnenQuelle, Objekt } from '../src/core/typen';
import { berechneNetzAlt } from './hilfen/netz-alt-a91';
import { pruefeVergleich } from './hilfen/a91-netze';

// A91 P2, Review Fix-Runde 1 (docs/ENTSCHEIDUNGEN.md, 2026-11-05, W1): Nach dem Umhängen zählt das neue Kind beim neuen
// Elternfeld q mit. Ein späteres Feld darf nicht so dick an q hängen, dass an q zwei gleich dicke Abgänge entstehen (A76).
// Feldnummer = y · 24 + x.

const N = 24;
const f = (x: number, y: number): number => y * N + x;
const KESSEL_5: InnenQuelle[] = [{ typ: 'kessel', stufe: 5, bau: null }];

/** Leitungsnetz ohne Kunden: Heizzentrale Stufe 1 (2×2) bei (0|0), dazu Leitungen je Typ. */
function netz(leitungen: Array<[TypId, Array<[number, number]>]>): Objekt[] {
  const objekte: Objekt[] = [{ id: 1, typ: 'hz', x: 0, y: 0, stufe: 1, bau: null, kasse_eur: 0 }];
  for (const [typ, felder] of leitungen) {
    for (const [x, y] of felder) objekte.push({ id: objekte.length + 1, typ, x, y, stufe: 1, bau: null, kasse_eur: 0 });
  }
  return objekte;
}

describe('A91 P2 – Kinderliste nach dem Umhängen', () => {
  it('A91: test_a91_kind_beim_neuen_elternfeld_zaehlt_fuer_spaetere_felder', () => {
    // Breitensuche: (5|2) erreicht (6|2), (4|2) und q = (5|3) gleich nah; k1 = (6|3) hängt alt an (6|2) (d32),
    // k2 = (4|3) an (4|2) (d32). k1 hängt zu q um (gleich dick, q noch ohne Kind). Danach hat q mit k1 einen gleich dicken
    // Abgang, k2 darf nicht auch an q (sonst A76-Aufteilung an q) und bleibt an (4|2).
    const objekte = netz([
      ['d50', [[2, 0], [3, 0], [4, 0], [5, 0], [5, 1], [5, 2]]],
      ['d32', [[6, 2], [4, 2]]],
      ['d40', [[5, 3], [6, 3], [4, 3]]],
    ]);
    const alt = berechneNetzAlt(objekte, KESSEL_5, 2);
    const neu = berechneNetz(objekte, KESSEL_5, 2);
    expect(alt.eltern.get(f(6, 3))).toBe(f(6, 2));
    expect(alt.eltern.get(f(4, 3))).toBe(f(4, 2));
    expect(neu.eltern.get(f(6, 3))).toBe(f(5, 3));
    expect(neu.eltern.get(f(4, 3))).toBe(f(4, 2));
    expect([...neu.aufteilung]).toEqual([]);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });
});
