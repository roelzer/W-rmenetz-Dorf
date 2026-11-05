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

/** A54: kW-Schild über einem Gebäude zeigen? Nur fertige, nicht gekündigte Häuser bzw. Großabnehmer mit Vertrag, wenn der Schalter an ist,
 *  ab 44 px Kachelbreite und (Designer A66) nur dort, wo die Zahl nützt: angeschlossen, Interessent oder während des Leitungsplanens. */
export function kwSchildZeigen(
  o: { bau: unknown; gekuendigt?: boolean; zustand?: string },
  kat: string, bedarf_kw: number | undefined, kachel_px: number, kw_anzeigen: boolean | undefined, relevant = true,
): boolean {
  return !o.bau && !!bedarf_kw && !o.gekuendigt && (kat === 'haus' || (kat === 'gross' && o.zustand === 'vertrag')) && kachel_px >= 44 && kw_anzeigen !== false && relevant;
}

/** A55/A75: Zwei-Finger-Drehung. Erst ab 0,15 rad (gut 8°) Fingerdrehung dreht die Karte mit – Zoomen dreht so nicht versehentlich;
 *  danach folgt sie den Fingern stufenlos (Simon 2026-11-05: „flüssig in den Winkel, den ich will“). */
export const DREH_SCHWELLE_RAD = 0.15;
export function drehFrei(summe_rad: number, dw_rad: number, aktiv: boolean): { summe_rad: number; aktiv: boolean; dreh_rad: number } {
  let dw = dw_rad;
  if (dw > Math.PI) dw -= 2 * Math.PI;
  if (dw < -Math.PI) dw += 2 * Math.PI;
  if (aktiv) return { summe_rad: 0, aktiv: true, dreh_rad: dw };
  const neu = summe_rad + dw;
  if (Math.abs(neu) > DREH_SCHWELLE_RAD) return { summe_rad: 0, aktiv: true, dreh_rad: neu };
  return { summe_rad: neu, aktiv: false, dreh_rad: 0 };
}
