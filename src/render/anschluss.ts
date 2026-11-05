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
