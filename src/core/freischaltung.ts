import { KATALOG, VORLAUF, type TypId } from './katalog';
import type { Spielstand } from './typen';

/**
 * A88 Freischalt-Leiter: Ob etwas frei ist, entscheidet nur diese Datei (Bauplan docs/bauplaene/A88-freischalt-leiter.md, AE-A88-1).
 * Die Tabelle wird nur hier gelesen; spiel.ts und die Oberfläche nutzen die Abfragen, damit Tests mit den Stufen von vor A88
 * das Modul per vi.mock tauschen können (tests/ohne-leiter.ts). Seit Simons F3 gilt die Leiter für alle Spielstände.
 */
export type Funktion =
  | 'stationstypen' | 'express' | 'gestattung' | 'spuelbohrung'
  | 'andi' | 'vorlauf' | 'ruecklauf_helfer' | 'vorsehung' | 'dach_pv' | 'baugebiet' | 'neubaugebiet';
export type Merkmal = TypId | Funktion;

/** Merkmal → ab Heizzentralen-Stufe; fehlt = 1. Spielwerte, Simon kann jede Zeile ändern (Bauplan Abschnitt 4). */
export const FREISCHALTUNGEN: Readonly<Partial<Record<Merkmal, number>>> = {
  d50: 2, d63: 2,
  d75: 3, d90: 3, d110: 3,
  d125: 4, d140: 4, d160: 5,
  stationstypen: 2,
  express: 2,
  gestattung: 2,
  spuelbohrung: 2,
  wpg: 2,
  puffer: 2,
  solar: 2,
  bad: 2, gewerbe: 2,
  brunnen: 2,
  andi: 3,
  vorlauf: 3,
  ruecklauf_helfer: 3,
  pellet: 3, gas: 3,
  sonde: 3, klinik: 3,
  vorsehung: 4,
  bhkw: 4,
  ptk: 4,
  pv: 4, dach_pv: 4,
  baugebiet: 4,
  neubaugebiet: 6,
};

/** Anzeigename der Funktionen, die kein Katalogeintrag sind. */
export const FUNKTION_NAME: Readonly<Record<Funktion, string>> = {
  stationstypen: 'Freie Stationswahl',
  express: 'Expresslieferung',
  gestattung: 'Gestattung',
  spuelbohrung: 'Spülbohrung',
  andi: 'Andi · Zweiter Vorstand',
  vorlauf: 'Vorlauf-Regler',
  ruecklauf_helfer: 'Rücklauf-Helfer',
  vorsehung: 'T-Stück mit Vorsehung',
  dach_pv: 'PV auf dem Heizhaus-Dach',
  baugebiet: 'Baugebiet',
  neubaugebiet: 'Neubaugebiet Süd',
};

export function merkmalName(m: Merkmal): string {
  return m in FUNKTION_NAME ? FUNKTION_NAME[m as Funktion] : KATALOG[m as TypId].name;
}

export function abStufe(m: Merkmal): number { return FREISCHALTUNGEN[m] ?? 1; }

/** Die Stufe zählt erst, wenn der Ausbau fertig ist (o.stufe steigt beim Fertigstellen). */
const hzStufe = (stand: Spielstand): number => stand.objekte.find((o) => o.typ === 'hz')?.stufe ?? 1;

export function freigeschaltet(stand: Spielstand, m: Merkmal): boolean {
  // Bestandsschutz (Bauplan Abschnitt 5): Wer den Vorlauf schon verstellt hat, behält den Regler, bis er wieder auf Start steht.
  if (m === 'vorlauf' && stand.vorlauf_c != null && stand.vorlauf_c !== VORLAUF.start_c) return true;
  return hzStufe(stand) >= abStufe(m);
}

export function sperrgrund(stand: Spielstand, m: Merkmal): string | null {
  return freigeschaltet(stand, m) ? null : `ab Heizzentrale Stufe ${abStufe(m)}`;
}

export function neuBeiStufe(stufe: number): Merkmal[] {
  return (Object.keys(FREISCHALTUNGEN) as Merkmal[]).filter((m) => abStufe(m) === stufe);
}

