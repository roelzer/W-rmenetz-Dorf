import { KATALOG } from './katalog';
import type { Spiel } from './spiel';

export interface Auftrag {
  id: string;
  text: string;
  taler: number;
  erfuellt: (s: Spiel) => boolean;
}

export const AUFTRAEGE: ReadonlyArray<Auftrag> = [
  { id: 'c1', taler: 10, text: 'Versorge dein erstes Haus: lege eine Leitung von der Heizzentrale bis ans Haus',
    erfuellt: (s) => s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && s.netz.warm.has(o.id)).length >= 1 },
  { id: 'c2', taler: 10, text: 'Versorge alle drei Starthäuser: kaufe dem dritten Haus eine Übergabestation und lass mit Philipp einen Bauabschnitt planen, der die Leitung dorthin legt',
    erfuellt: (s) => s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && s.netz.warm.has(o.id)).length >= 3 },
  // A81: Abholen an den Häusern gibt es nicht mehr – Kennung 'col' bleibt, damit alte Spielstände den Auftrag behalten
  { id: 'col', taler: 5, text: 'Erlebe deine erste Monatsabrechnung: am Monatsende zahlen deine Kunden automatisch', erfuellt: (s) => !!s.stand.erledigt.collect },
  { id: 'h3', taler: 10, text: 'Schließ ein viertes Haus an: Übergabestation kaufen und per Bauabschnitt eine Leitung legen', erfuellt: (s) => s.netz.warm.size >= 4 },
  { id: 'grant', taler: 5, text: 'Stelle im Abrechnungsbüro einen Förderantrag', erfuellt: (s) => !!s.stand.erledigt.grant },
  { id: 'hz2', taler: 15, text: 'Baue die Heizzentrale auf Stufe 2 aus', erfuellt: (s) => s.hzStufe >= 2 },
  { id: 'fund', taler: 15, text: 'Baue etwas mit bewilligter Förderung', erfuellt: (s) => !!s.stand.erledigt.funded },
  { id: 'obs', taler: 5, text: 'Räume ein Hindernis weg (Felsen, Gestrüpp)', erfuellt: (s) => !!s.stand.erledigt.obs },
  { id: 'main', taler: 25, text: 'Verlege eine ausreichend starke Leitung zum Hallenbad und unterschreib den Vertrag',
    erfuellt: (s) => s.stand.objekte.some((o) => o.typ === 'bad' && o.zustand === 'vertrag') },
  { id: 'saw', taler: 15, text: 'Hol dir die Abwärme vom Sägewerk',
    erfuellt: (s) => s.stand.objekte.some((o) => o.typ === 'gewerbe' && o.zustand === 'vertrag' && s.netz.anschluss.has(o.id)) },
  { id: 'h8', taler: 20, text: 'Versorge 8 Kunden', erfuellt: (s) => s.netz.warm.size >= 8 },
  { id: 'deko', taler: 10, text: 'Verschönere dein Dorf mit 5 Deko-Stücken', erfuellt: (s) => s.stand.deko_anzahl >= 5 },
  { id: 'hz3', taler: 30, text: 'Vergrößere die Heizzentrale auf Stufe 3', erfuellt: (s) => s.hzStufe >= 3 },
];

/** Prüft alle Aufträge, schreibt Belohnungen gut und gibt den aktuell offenen Auftrag zurück (oder null). */
export function pruefeAuftraege(s: Spiel): Auftrag | null {
  for (const a of AUFTRAEGE) {
    if (!s.stand.erledigt[a.id] && a.erfuellt(s)) {
      s.stand.erledigt[a.id] = true;
      s.stand.taler += a.taler;
      s.ereignisse.push({ art: 'hinweis', text: `Auftrag geschafft! +${a.taler} Dorftaler` });
    }
  }
  return AUFTRAEGE.find((a) => !s.stand.erledigt[a.id]) ?? null;
}
