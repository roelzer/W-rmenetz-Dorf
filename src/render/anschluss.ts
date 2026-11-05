import { KATALOG, LEITUNGEN, type TypId } from '../core/katalog';

/** A65: Wie wird die Kante zwischen zwei Leitungsfeldern gezeichnet (aus Sicht von Leitung a)?
 *  Die dünnere Leitung läuft bis in die Mitte der dickeren; die dickere zeichnet nichts zur dünneren. */
export function abzweigZeichnen(a: TypId, b: TypId): 'nichts' | 'bis_mitte_nachbar' | 'halb' {
  const ka = KATALOG[a].kapazitaet_kw as number, kb = KATALOG[b].kapazitaet_kw as number;
  return kb < ka ? 'nichts' : kb > ka ? 'bis_mitte_nachbar' : 'halb';
}

/** A65: Liegt ein Gebäude direkt an Leitung `leitung`, bekommt es einen eigenen Hausanschluss in der kleinsten passenden Größe –
 *  oder null, wenn die Leitung selbst schon nicht dicker ist als nötig. */
export function eigenerHausanschluss(leitung: TypId, bedarf_kw: number): TypId | null {
  const passend = LEITUNGEN.find((l) => (KATALOG[l].kapazitaet_kw as number) >= bedarf_kw) ?? leitung;
  return (KATALOG[passend].kapazitaet_kw as number) < (KATALOG[leitung].kapazitaet_kw as number) ? passend : null;
}

/** A54: kW-Schild über einem Gebäude zeigen? Nur fertige, nicht gekündigte Häuser bzw. Großabnehmer mit Vertrag, ab ausreichender Kachelbreite und wenn der Schalter an ist. */
export function kwSchildZeigen(
  o: { bau: unknown; gekuendigt?: boolean; zustand?: string },
  kat: string, bedarf_kw: number | undefined, kachel_px: number, kw_anzeigen: boolean | undefined,
): boolean {
  return !o.bau && !!bedarf_kw && !o.gekuendigt && (kat === 'haus' || (kat === 'gross' && o.zustand === 'vertrag')) && kachel_px >= 36 && kw_anzeigen !== false;
}

/** A55: Zwei-Finger-Drehung sammelt den Winkel; ab 0,6 rad dreht die Karte um einen 90°-Schritt. */
export const DREH_SCHWELLE_RAD = 0.6;
export function drehSchritt(summe_rad: number, dw_rad: number): { summe_rad: number; schritt: -1 | 0 | 1 } {
  let dw = dw_rad;
  if (dw > Math.PI) dw -= 2 * Math.PI;
  if (dw < -Math.PI) dw += 2 * Math.PI;
  const neu = summe_rad + dw;
  if (Math.abs(neu) > DREH_SCHWELLE_RAD) return { summe_rad: 0, schritt: neu > 0 ? 1 : -1 };
  return { summe_rad: neu, schritt: 0 };
}
