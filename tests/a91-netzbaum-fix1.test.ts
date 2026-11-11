import { KATALOG } from '../src/core/katalog';
import { describe, expect, it } from 'vitest';
import { berechneNetz, bedarfKw } from '../src/core/netz';
import { passendeStation, type TypId } from '../src/core/katalog';
import type { InnenQuelle, Objekt } from '../src/core/typen';
import { berechneNetzAlt } from './hilfen/netz-alt-a91';
import { pruefeVergleich, zufallsNetz } from './hilfen/a91-netze';

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

// Schrittweise Prüfung (Review P2, W2): Nach jedem Umhängen muss die Last auf dem Weg über das neue Elternfeld q schwerer
// und auf dem Weg über das alte p leichter werden – mit den eigenen Kunden der Felder. Beide Fälle stammen aus dem
// P0-Generator; gefunden mit Wegwerf-Varianten, die eins davon vergessen (Last nicht nachgeführt, nur q-Weg, ohne Kunden).
// Kapazität d63 = 95 kW × Spreizungsfaktor (katalog.ts); Bedarf RH 16, EFH 10, MFH 30, Bäckerei 20, Klinik 70 kW.
describe('A91 P2 – Last nach dem Umhängen', () => {
  it('A91: test_a91_umhaengen_sieht_die_last_auf_dem_neuen_weg', () => {
    // Startwert 2471: Die d63-Reihe (11..16|9) hängt alt an den d32-Feldern darunter. Zuerst hängen (12|9)…(15|9) um; die
    // Klinik (13|9, 70 kW) und die Bäckerei (15|9, 20 kW) belasten danach (11|9)…(13|9) mit 90 kW. Rest über q = (15|9):
    // 95 × 1,1176 − 90 ≈ 16,2 kW < 20 kW Last hinter (16|9) (Bäckerei 16|8) → (16|9) bleibt an (16|10).
    // Die historische Engstelle gezielt nachstellen, auch wenn das Spiel die 63er heute höher dimensioniert.
    const kapazitaet = KATALOG.d63.kapazitaet_kw;
    KATALOG.d63.kapazitaet_kw = 95;
    try {
      const { objekte, innen, vorlauf_c } = zufallsNetz(2471);
      const alt = berechneNetzAlt(objekte, innen, 2, vorlauf_c);
      const neu = berechneNetz(objekte, innen, 2, vorlauf_c);
      expect([12, 13, 14, 15, 16].map((x) => alt.eltern.get(f(x, 9)))).toEqual([12, 13, 14, 15, 16].map((x) => f(x, 10)));
      expect([12, 13, 14, 15].map((x) => neu.eltern.get(f(x, 9)))).toEqual([11, 12, 13, 14].map((x) => f(x, 9)));
      expect(neu.last_kw.get(f(11, 9))).toBe(90);
      expect(neu.last_kw.get(f(16, 9))).toBe(20);
      expect(95 * neu.spreizung_faktor - 90).toBeLessThan(20);
      expect(neu.eltern.get(f(16, 9))).toBe(f(16, 10));
      expect(pruefeVergleich(alt, neu)).toEqual([]);
    } finally {
      KATALOG.d63.kapazitaet_kw = kapazitaet;
    }
  });

  it('A91: test_a91_umhaengen_entlastet_den_alten_weg', () => {
    // Startwert 20550: Die d63-Reihe (3..9|7) hängt alt an der d25/d32-Reihe darunter. Nacheinander hängen (8|7), (7|7),
    // (6|7) und (5|7) zur d63-Reihe um. Am gemeinsamen Feld (9|8) liegen danach 30 (MFH) + 16 (RH) + 20 (Bäckerei) + 10 (EFH)
    // = 76 kW ≤ 95 × 1,2594 ≈ 119,6 kW. Bliebe die Last auf dem alten Weg (8|8) stehen (46 kW), zählte sie an (9|8) doppelt
    // (122 kW > 119,6 kW) und (5|7) bliebe am dünnen (5|8): Bäckerei 45 und EFH 46 kalt.
    const { objekte, innen, vorlauf_c } = zufallsNetz(20550);
    const alt = berechneNetzAlt(objekte, innen, 2, vorlauf_c);
    const neu = berechneNetz(objekte, innen, 2, vorlauf_c);
    expect(alt.eltern.get(f(5, 7))).toBe(f(5, 8));
    expect([alt.warm.has(45), alt.warm.has(46)]).toEqual([false, false]);
    expect([8, 7, 6, 5].map((x) => neu.eltern.get(f(x, 7)))).toEqual([9, 8, 7, 6].map((x) => f(x, 7)));
    expect(neu.last_kw.get(f(9, 8))).toBe(76);
    expect(neu.last_kw.get(f(8, 8))).toBe(0);
    expect([neu.warm.has(42), neu.warm.has(45), neu.warm.has(46)]).toEqual([true, true, true]);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });
});

describe('A91 P1 – Gebäude am alten Feld nach dem Anschlusswechsel', () => {
  it('A91: test_a91_zweites_haus_bleibt_wenn_altes_feld_sonst_kein_abzweig_waere', () => {
    // Heizzentrale (0|0); d63 (2..4|0), (4|1..3); d32 (5|3) und p = (6|3); dahinter c = (7|3) d25 mit RH (8|3) am Ende.
    // EFH H1 (6|2) und H2 (6|4) hängen an p (Last an p: 16 + 10 + 10 = 36 > 25 kW). Ausweichleitung d40 ab (4|3) über
    // (4|4),(4|5),(5..9|5),(9|4..1),(8|1),(7|1),(6|1),(6|0): H1 erreicht sie an (6|1), H2 an (6|5).
    // H1 wechselt (p hat dann noch H2 als Gebäude, bleibt Abzweig); p trägt danach 26 > 25 kW. H2 bliebe nur ohne
    // Gebäude an p, und p speiste dann allein das dünnere c → neue A67-Warnung an p → H2 bleibt.
    const objekte = netz([
      ['d63', [[2, 0], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3]]],
      ['d32', [[5, 3], [6, 3]]],
      ['d25', [[7, 3]]],
      ['d40', [[4, 4], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [9, 4], [9, 3], [9, 2], [9, 1], [8, 1], [7, 1], [6, 1], [6, 0]]],
    ]);
    const kunde = (typ: TypId, x: number, y: number): Objekt => {
      const o: Objekt = { id: objekte.length + 1, typ, x, y, stufe: 1, bau: null, kasse_eur: 0 };
      o.station = passendeStation(bedarfKw(o)).id;
      objekte.push(o);
      return o;
    };
    const h1 = kunde('efh', 6, 2), h2 = kunde('efh', 6, 4);
    kunde('rh', 8, 3);
    const alt = berechneNetzAlt(objekte, KESSEL_5, 2);
    const neu = berechneNetz(objekte, KESSEL_5, 2);
    expect([alt.anschluss.get(h1.id)?.feld, alt.anschluss.get(h2.id)?.feld]).toEqual([f(6, 3), f(6, 3)]);
    expect(alt.last_kw.get(f(6, 3))).toBe(36);
    expect(neu.anschluss.get(h1.id)?.feld).toBe(f(6, 1));
    expect(neu.warm.has(h1.id)).toBe(true);
    expect(neu.anschluss.get(h2.id)?.feld).toBe(f(6, 3));
    expect(neu.last_kw.get(f(6, 3))).toBe(26);
    expect(neu.kalt.get(h2.id)).toBe('leitung');
    expect([...neu.reduzierung]).toEqual([]);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });
});
