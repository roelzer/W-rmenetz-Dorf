import { KONSTANTEN, START_PREISSTUFE, type TypId } from './katalog';
import { groesse } from './netz';
import { ortHolen, STANDARD_ORT } from './orte';
import type { Objekt, Spielstand } from './typen';
import { zufall } from './zufall';

// AE-NR13-1: Der Spielstart steht an genau einer Stelle. spiel.ts reicht neuerSpielstand nur weiter, damit speichern.ts und
// die Tests ihren Import behalten; diese Datei importiert spiel.ts nicht (kein Kreis).
const N = KONSTANTEN.feldanzahl;

/** NR13: Die zwei ersten Häuser an der Tutorial-Spur (10|10)…(10|14), (11|14), in der Reihenfolge, in der eine von der
 *  Heizzentrale nach Süden gezogene Leitung sie erreicht: (9|13) über (10|13), (12|14) über (11|14). */
export const ERSTE_HAEUSER: ReadonlyArray<readonly [number, number]> = [[9, 13], [12, 14]];

/** NR13 (NR18 5.2): Felder der Tutorial-Spur in Zugrichtung – von der Heizzentrale nach Süden an Haus 1 vorbei, dann zu Haus 2. */
export const TUTORIAL_SPUR: ReadonlyArray<readonly [number, number]> = [[10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [11, 14]];

/** AE-NR13-1: Jeder Produktionsweg zu einem neuen Spiel startet hier – das Startdorf plus die Tutorial-Merke, sonst nichts. */
export function neuesSpielMitTutorial(jetzt_ms: number, ortId?: string): Spielstand {
  return { ...neuerSpielstand(jetzt_ms, ortId), tutorial: { kapitel: 1 } };
}

/** Entfernt das frühere Bestands-EFH auf der Ausbaufläche der Heizzentrale. */
export function hzAusbauflaecheFreiraeumen(stand: Spielstand): void {
  stand.objekte = stand.objekte.filter((o) => !((o.id === 6 || o.id === 12) && o.typ === 'efh' && o.bestand && o.x === 13 && o.y === 12));
}

export function neuerSpielstand(jetzt_ms: number, ortId: string = STANDARD_ORT): Spielstand {
  const ort = ortHolen(ortId);
  const objekte: Objekt[] = [];
  let id = 1;
  const add = (typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}) =>
    objekte.push({ id: id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra });
  // Start (A22/A29): Heizhaus, Büro, ein Monteurhäuschen, 30.000 €. Die Häuser des Ortes (A21) heizen noch mit Öl.
  add('hz', 11, 10); add('buero', 7, 10); add('huette', 11, 7);
  // NR13 (ersetzt A29/A59/A67/A74 für neue Spiele): Das Dorf startet ohne Leitungen und ohne Übergabestationen, alle Häuser
  // heizen mit Öl. Der Spieler legt die erste Leitung selbst. Alte Spielstände behalten ihr Startnetz (speichern.ts lädt sie unverändert).
  ort.haeuser.forEach((h) => add(h.typ, h.x, h.y, { zufriedenheit_pct: 80, bestand: true, ohne_station: true }));
  for (const g of ort.gross) add(g.typ, g.x, g.y, { zustand: 'gesperrt', ohne_station: true });
  const strassenFelder = new Set([...ort.strassen, ...ort.fluss].map(([sx, sy]) => sy * N + sx));
  const r = zufall(9 + ortId.length);
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(r() * N), y = Math.floor(r() * N);
    if (x > 5 && x < 17 && y > 5 && y < 17) continue;
    if (strassenFelder.has(y * N + x)) continue;
    { const typ = r() < 0.45 ? 'stein' : r() < 0.55 ? 'busch' : 'baum'; add(typ, x, y, typ === 'baum' ? { landschaft: true } : {}); }
  }
  const behalten: Objekt[] = [];
  for (const a of objekte) if (!behalten.some((b) => ueberlappt(a, b))) behalten.push(a);
  // NR13: Hackschnitzelkessel Stufe 1 ist vorgewählt (gratis, wie ersteQuelleWaehlen('kessel')), weil das Tutorial von Anfang an
  // mit ihm und seinen 60 kW rechnet; die Wahl der Wärmequelle kommt später.
  const stand: Spielstand = {
    version: 3, name: ort.name, ort: ort.id, namen_gefragt: false, geld_eur: KONSTANTEN.startgeld_eur, taler: KONSTANTEN.starttaler,
    objekte: behalten, naechste_id: id, innen: [{ typ: 'kessel', stufe: 1, bau: null }], preisstufe: START_PREISSTUFE, antraege: {},
    karte: 2, zuletzt_ms: jetzt_ms, erledigt: {}, gemocht: {}, quelle_gewaehlt: true, deko_anzahl: 0,
  };
  hzAusbauflaecheFreiraeumen(stand);
  return stand;
}

function ueberlappt(a: Objekt, b: Objekt): boolean {
  const sa = groesse(a), sb = groesse(b);
  return a.x < b.x + sb && b.x < a.x + sa && a.y < b.y + sb && b.y < a.y + sa;
}
