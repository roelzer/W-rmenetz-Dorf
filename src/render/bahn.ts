import { querungImBau } from '../core/nordviertel';
import type { Spielstand } from '../core/typen';

/**
 * NR27 (DESIGN 14.3, 14.8, 14.9): Inszenierung der Bahn. Reine Darstellung, keine Spieldaten.
 * Maße aus DESIGN 14.9 (`karte.bahn`), bis sie in design/tokens.json stehen (14.15 Punkt 21).
 */
export const ZUG_MASS = {
  /** `zug_feld_je_s` */
  feld_je_s: 3,
  /** `zug_pause_s` [90, 150] */
  pause_min_s: 90, pause_max_s: 150,
  /** Gleise laufen von x = −2 bis 25 (DESIGN 14.2 „Enden“) */
  von_x: -2, bis_x: 25,
  /** zwei Wagen je 2 Felder (DESIGN 14.3 „Form“) */
  laenge_felder: 4,
  /** Gleismitten quer zur Bahn: −2,5 ± Gleisabstand/2 (DESIGN 14.2 Querschnitt) */
  gleis1_y: -2.28, gleis2_y: -2.72,
} as const;

/** Die Spitze fährt vom westlichen Gleisende bis der letzte Wagen das östliche verlassen hat (oder umgekehrt). */
const FAHRT_FELDER = ZUG_MASS.bis_x - ZUG_MASS.von_x + ZUG_MASS.laenge_felder;
const FAHRT_MS = (FAHRT_FELDER / ZUG_MASS.feld_je_s) * 1000;
/**
 * Fahrplan in festen Takten: Takt n beginnt bei n · TAKT_MS, die Fahrt darin um 0 … SPIEL_MS versetzt.
 * Abstand zweier Fahrten = TAKT_MS − FAHRT_MS + (Versatz danach − Versatz davor) = 120 s ± 30 s, also 90 … 150 s.
 */
const SPIEL_MS = (ZUG_MASS.pause_max_s - ZUG_MASS.pause_min_s) / 2 * 1000;
const TAKT_MS = ((ZUG_MASS.pause_min_s + ZUG_MASS.pause_max_s) / 2) * 1000 + FAHRT_MS;

/** Fester Versatz 0 … 1 je Takt (Ganzzahl-Streuung statt Zufall: gleiche Uhrzeit, gleiche Lage). */
function versatz(n: number): number {
  return (Math.imul(n | 0, 0x9e3779b1) >>> 0) / 0x1_0000_0000;
}

export interface ZugLage {
  /** Gleismitte quer zur Bahn (Feld-y) */
  gleis_y: number;
  /** Feld-x der Zugspitze */
  kopf_x: number;
  /** +1 = nach Osten, −1 = nach Westen */
  richtung: 1 | -1;
}

/**
 * Wo der Zug zur Uhrzeit `jetzt_ms` fährt, oder null. Während eine Querung gebaut wird, startet keiner (Fachprüfer F3);
 * eine Fahrt, die vor Baubeginn losfuhr, endet normal – ein Zug, der mitten im Bild verschwindet, sähe wie ein Fehler aus.
 */
export function zugLage(jetzt_ms: number, stand: Pick<Spielstand, 'abschnitt'> | null): ZugLage | null {
  const n = Math.floor(jetzt_ms / TAKT_MS), start_ms = n * TAKT_MS + versatz(n) * SPIEL_MS;
  const t_ms = jetzt_ms - start_ms;
  if (t_ms < 0 || t_ms >= FAHRT_MS) return null;
  if (stand && querungImBau(stand) && start_ms >= (stand.abschnitt?.bau?.start_ms ?? -Infinity)) return null;
  const weg = (t_ms / 1000) * ZUG_MASS.feld_je_s;
  // Im Wechsel: gerade Takte auf Gleis 2 nach Osten, ungerade auf Gleis 1 nach Westen
  if (n % 2 === 0) return { gleis_y: ZUG_MASS.gleis2_y, kopf_x: ZUG_MASS.von_x + weg, richtung: 1 };
  return { gleis_y: ZUG_MASS.gleis1_y, kopf_x: ZUG_MASS.bis_x - weg, richtung: -1 };
}
