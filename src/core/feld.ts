import { KONSTANTEN } from './katalog';

/**
 * Feldschlüssel der Spielkarte (AE-NR27-1 … -3). Die Karte wächst nach Norden in Zeilen mit negativem y; der Schlüssel bleibt
 * y·N + x, damit alte Spielstände (gestattungen, neubau_strassenluecken) unverändert gelten. Für y < 0 ist der Schlüssel negativ:
 * `k % N` und `(…) % n` liefern dann negative Reste, und -1 ist ein echtes Feld (23|-1). Darum rechnen alle Module nur hier zurück.
 */
const N = KONSTANTEN.feldanzahl;

/** Oberste Kartenzeile (Nordzone). */
export const KARTE_OBEN_Y: number = -KONSTANTEN.nord_zeilen;

/** „Kein Feld / direkt am Heizhaus“: weit außerhalb jedes Kartenschlüssels (kleinster Schlüssel ist KARTE_OBEN_Y·N). */
export const KEIN_FELD = -1_000_000;

/** Rest mit 0 ≤ r < n, auch für negatives a und für Bruchteile (n = 1). */
export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** Schlüssel → [x, y]; x liegt immer in 0 … N−1. */
export function feldVon(k: number): [number, number] {
  const x = mod(k, N);
  return [x, (k - x) / N];
}

/** [x, y] → Schlüssel. */
export function schluessel(x: number, y: number): number {
  return y * N + x;
}
