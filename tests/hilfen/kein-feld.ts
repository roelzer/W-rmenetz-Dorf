// NR27 Tester-Vorarbeit V1 (Bauplan docs/bauplaene/NR27-bahnquerung-entwurf.md, AE-NR27-3):
// „Kein Feld / direkt am Heizhaus“ ist heute -1 und wird mit P1 zu KEIN_FELD (-1.000.000), weil -1 dann ein echtes
// Nordfeld (23|-1) ist. Diese Hilfe gilt vor und nach P1 und importiert bewusst NICHT src/core/feld.ts.
// Die eingefrorene alte Netzrechnung tests/hilfen/netz-alt-a91.ts bleibt bei -1; Vergleiche alt ↔ neu gleichen hierüber an.

/** true, wenn v „kein Feld“ bedeutet (alte Kennung -1 oder KEIN_FELD = -1.000.000). */
export const istKeinFeld = (v: number | undefined): boolean => v === -1 || v === -1_000_000;

/** Eltern-Karte als Liste in Einfügereihenfolge; „kein Feld“ (Wurzel direkt am Heizhaus) wird zu 'kein'. */
export function elternAngleichen(m: ReadonlyMap<number, number>): Array<[number, number | 'kein']> {
  return [...m].map(([k, p]): [number, number | 'kein'] => [k, istKeinFeld(p) ? 'kein' : p]);
}
