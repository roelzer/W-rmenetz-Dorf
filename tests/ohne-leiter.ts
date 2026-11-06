import type { Spielstand } from '../src/core/typen';

/**
 * A88 Testhilfe (Bauplan docs/bauplaene/A88-freischalt-leiter.md, Abschnitt 4 Spalte „heute“ und Abschnitt 11 V1).
 *
 * Bestehende Tests prüfen Mechaniken mit den Freischalt-Stufen von vor A88. Seit Simons F3 gilt die Leiter für alle
 * Spielstände, im Produktivcode gibt es keinen Schalter. Diese Testdateien tauschen deshalb das Kernmodul per
 *   vi.mock('../src/core/freischaltung', async (orig) => (await import('./ohne-leiter')).ohneLeiter(await orig()));
 * Alle vier Abfragen werden ersetzt, weil ein Mock Aufrufe innerhalb des echten Moduls nicht erreicht.
 * Importiert bewusst nicht src/core/freischaltung.ts, damit die Typprüfung auch vor P2 grün ist.
 * Neue Testdateien (A88 selbst) nutzen das echte Modul.
 */

/** Merkmal → ab HZ-Stufe, wie vor A88 (fehlt = 1). Reihenfolge wie die Tabelle im Bauplan. */
export const WIE_VOR_A88: Readonly<Record<string, number>> = {
  d50: 1, d63: 1,
  d75: 2, d90: 2, d110: 2,
  stationstypen: 1,
  express: 1,
  gestattung: 1,
  spuelbohrung: 1,
  wpg: 1,
  puffer: 1,
  solar: 2,
  bad: 2, gewerbe: 2,
  brunnen: 2,
  vorlauf: 1,
  ruecklauf_helfer: 1,
  pellet: 1, gas: 1,
  sonde: 3, klinik: 3,
  vorsehung: 1,
  bhkw: 2,
  ptk: 1,
  pv: 1, dach_pv: 1,
  baugebiet: 3,
};

const abStufe = (m: string): number => WIE_VOR_A88[m] ?? 1;

/** Stufe der Heizzentrale; sie zählt erst, wenn der Ausbau fertig ist (o.stufe steigt in bis()). */
const hzStufe = (stand: Spielstand): number => stand.objekte.find((o) => o.typ === 'hz')?.stufe ?? 1;

const freigeschaltet = (stand: Spielstand, m: string): boolean => hzStufe(stand) >= abStufe(m);

const sperrgrund = (stand: Spielstand, m: string): string | null =>
  freigeschaltet(stand, m) ? null : `ab Heizzentrale Stufe ${abStufe(m)}`;

const neuBeiStufe = (stufe: number): string[] => Object.keys(WIE_VOR_A88).filter((m) => WIE_VOR_A88[m] === stufe);

/** Ersetzt die vier Abfragen des echten Moduls durch die Stufen von vor A88; alles andere bleibt echt. */
export function ohneLeiter(echt: Record<string, unknown>): Record<string, unknown> {
  return { ...echt, abStufe, freigeschaltet, sperrgrund, neuBeiStufe };
}
