/**
 * Testhilfe NR18-P0 (Bauplan NR18 Fassung 3, Abschnitt 7 P0 Teil A Punkt 1).
 *
 * `altesStartdorf` liefert das Startdorf, wie `neuerSpielstand` es vor NR13/P5 angelegt hat:
 * 5 × 40er auf (10|10)…(10|14) (Vorsehung auf (10|14)), 25er auf (11|14), die Häuser (9|13) und (12|14)
 * mit passender Übergabestation, keine Wärmequelle gewählt (`innen = []`, `quelle_gewaehlt = false`).
 *
 * Vor P5 ändert sie nichts am Ergebnis von `neuerSpielstand` (Startnetz und Stationen sind schon da, nur
 * „wo frei“ wird ergänzt). Nach P5 (leeres Startdorf, Kessel vorgewählt) stellt sie das alte Dorf wieder her –
 * einschließlich der Ids: Die Leitungen werden wie früher direkt nach der Monteurhütte eingefügt, alle späteren
 * Objekte rücken um die Zahl der eingefügten Leitungen nach hinten (so vergab `neuerSpielstand` die Ids vorher).
 *
 * Importiert bewusst nur `src/core/spiel`, `src/core/katalog`, `src/core/typen` (nicht `start.ts`, das es vor P1 nicht gibt).
 */
import { neuerSpielstand } from '../../src/core/spiel';
import { KATALOG, KONSTANTEN, passendeStation, type TypId } from '../../src/core/katalog';
import type { Objekt, Spielstand } from '../../src/core/typen';

const N = KONSTANTEN.feldanzahl;

/** Startnetz vor NR13: Reihenfolge wie früher in `neuerSpielstand`. */
const STARTNETZ: ReadonlyArray<{ typ: TypId; x: number; y: number; vorsehung?: boolean }> = [
  { typ: 'd40', x: 10, y: 10 }, { typ: 'd40', x: 10, y: 11 }, { typ: 'd40', x: 10, y: 12 },
  { typ: 'd40', x: 10, y: 13 }, { typ: 'd40', x: 10, y: 14, vorsehung: true }, { typ: 'd25', x: 11, y: 14 },
];
/** Die zwei Starthäuser vor NR13. */
const STARTHAEUSER = new Set([13 * N + 9, 14 * N + 12]);

function kante(o: Objekt): number {
  if (o.typ === 'hz') return o.stufe >= 3 || (o.stufe === 2 && o.bau?.art === 'ausbau') ? 3 : 2;
  return (KATALOG[o.typ].groesse as number | undefined) ?? 1;
}

function belegt(objekte: ReadonlyArray<Objekt>, x: number, y: number): boolean {
  return objekte.some((o) => { const k = kante(o); return x >= o.x && x < o.x + k && y >= o.y && y < o.y + k; });
}

export function frueheresAusbauHaus(id: number): Objekt {
  return { id, typ: 'efh', x: 13, y: 12, stufe: 1, bau: null, kasse_eur: 0, zufriedenheit_pct: 80, bestand: true, ohne_station: true };
}

export function altesStartdorf(jetzt_ms: number, ortId?: string): Spielstand {
  const st = ortId === undefined ? neuerSpielstand(jetzt_ms) : neuerSpielstand(jetzt_ms, ortId);
  st.objekte.splice(5, 0, frueheresAusbauHaus(6));
  const fehlend = STARTNETZ.filter((l) => !belegt(st.objekte, l.x, l.y));
  if (fehlend.length > 0) {
    // Einfügen nach der Monteurhütte (bzw. nach dem letzten Gebäude des Starts), Ids wie früher vergeben.
    const huette = st.objekte.findIndex((o) => o.typ === 'huette');
    const pos = huette >= 0 ? huette + 1 : Math.min(3, st.objekte.length);
    const ab_id = pos > 0 ? st.objekte[pos - 1].id + 1 : 1;
    for (const o of st.objekte) if (o.id >= ab_id) o.id += fehlend.length;
    const neu: Objekt[] = fehlend.map((l, i) => ({
      id: ab_id + i, typ: l.typ, x: l.x, y: l.y, stufe: 1, bau: null, kasse_eur: 0, ...(l.vorsehung ? { vorsehung: true } : {}),
    }));
    st.objekte.splice(pos, 0, ...neu);
    st.naechste_id += fehlend.length;
  }
  for (const o of st.objekte) {
    if (KATALOG[o.typ].kategorie !== 'haus' || !STARTHAEUSER.has(o.y * N + o.x) || !o.ohne_station) continue;
    delete o.ohne_station;
    o.station = passendeStation(KATALOG[o.typ].bedarf_kw as number).id;
  }
  st.innen = [];
  st.quelle_gewaehlt = false;
  return st;
}
