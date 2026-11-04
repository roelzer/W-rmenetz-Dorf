import type { TypId } from '../src/core/katalog';
import type { InnenQuelle, Objekt } from '../src/core/typen';

let zaehler = 0;
export function neu(typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}): Objekt {
  return { id: ++zaehler, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra };
}
export const quelle = (typ: TypId, stufe = 1): InnenQuelle => ({ typ, stufe, bau: null });

/** Heizzentrale bei (10,10) belegt die Felder x 10–11, y 10–11. Leitungen beginnen bei (12,10). */
export function dorf(...objekte: Objekt[]): Objekt[] {
  return [neu('hz', 10, 10), ...objekte];
}
