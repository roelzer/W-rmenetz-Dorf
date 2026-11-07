import { TUTORIAL_ABZWEIG, TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT } from './start';
import type { Feld } from './tutorial-vertrag';

/**
 * Vorgänger jedes Tutorial-Spurfelds in Zugrichtung (DESIGN 13.17.1 B2): Hauptleitung der Reihe nach, beide Hausanschlüsse
 * beginnen am Abzweig. Steht hier und nicht in der Darstellung, weil die Tutorial-Geometrie nur im Kern liegt (AE-NR20-1).
 */
/** Feld der Heizzentrale, aus dem die Hauptleitung kommt: Die hz steht bei (11|10) mit Größe 2 (start.ts neuerSpielstand,
 *  katalog.ts), belegt also (11|11) direkt östlich von (10|11). Das Band kommt dort aus der Fließrichtung der Wärme herein
 *  (ENTSCHEIDUNGEN 2026-11-07). */
const HZ_AUSGANG: readonly [number, number] = [11, 11];
const VORGAENGER = new Map<string, Feld>();
const kette = (felder: ReadonlyArray<readonly [number, number]>, start: readonly [number, number] | null): void => {
  felder.forEach(([x, y], i) => {
    const v = i > 0 ? felder[i - 1] : start;
    if (v) VORGAENGER.set(`${x},${y}`, [v[0], v[1]]);
  });
};
kette(TUTORIAL_HAUPT, HZ_AUSGANG);
kette(TUTORIAL_ANSCHLUSS_1, TUTORIAL_ABZWEIG);
kette(TUTORIAL_ANSCHLUSS_2, TUTORIAL_ABZWEIG);

/**
 * Feld, von dem das Band in (x|y) hereinkommt – unabhängig davon, ob dort schon eine Leitung liegt. Beim ersten Feld der
 * Hauptleitung ist es das Feld der Heizzentrale; null für Felder außerhalb der Spur.
 */
export function bandVorgaenger(x: number, y: number): Feld | null {
  return VORGAENGER.get(`${x},${y}`) ?? null;
}
