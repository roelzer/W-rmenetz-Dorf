import { KATALOG, KONSTANTEN, START_PREISSTUFE, passendeStation, type TypId } from './katalog';
import { groesse } from './netz';
import { ortHolen, STANDARD_ORT } from './orte';
import type { Objekt, Spielstand } from './typen';
import { zufall } from './zufall';

// AE-NR13-1: Der Spielstart steht an genau einer Stelle. spiel.ts reicht neuerSpielstand nur weiter, damit speichern.ts und
// die Tests ihren Import behalten; diese Datei importiert spiel.ts nicht (kein Kreis).
const N = KONSTANTEN.feldanzahl;

export function neuerSpielstand(jetzt_ms: number, ortId: string = STANDARD_ORT): Spielstand {
  const ort = ortHolen(ortId);
  const objekte: Objekt[] = [];
  let id = 1;
  const add = (typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}) =>
    objekte.push({ id: id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra });
  // Start (A22/A29): Heizhaus, Büro, ein Monteurhäuschen, 30.000 €. Die Häuser des Ortes (A21) heizen noch mit Öl.
  add('hz', 11, 10); add('buero', 7, 10); add('huette', 11, 7);
  // A29/A59: zwei Starthäuser sind von Anfang an angeschlossen. Die Hauptleitung (40er) liegt in der Straße neben dem Heizhaus,
  // die Hausanschlüsse (25er) führen von dort zu den Häusern; alle weiteren Häuser heizen noch mit Öl.
  // A67/A74 (Simon): Die 40er läuft bis vor das letzte Haus, weil in diese Richtung absehbar weitergebaut wird. Dort sitzt ein T-Stück:
  // geradeaus eine Vorsehung für den Weiterbau, seitlich die 25er zum Haus (12|14). 9|13 schließt bei 10|13 seitlich an.
  for (let y = 10; y <= 14; y++) add('d40', 10, y, y === 14 ? { vorsehung: true } : {});
  add('d25', 11, 14);
  // Die beiden Starthäuser haben eine Übergabestation; alle anderen müssen eine kaufen (A32, Simon 2026-11-05).
  const starthaeuser = new Set([13 * N + 9, 14 * N + 12]);
  ort.haeuser.forEach((h) => {
    const bedarf = KATALOG[h.typ].bedarf_kw as number;
    const start = starthaeuser.has(h.y * N + h.x);
    add(h.typ, h.x, h.y, { zufriedenheit_pct: 80, bestand: true, ...(start ? { station: passendeStation(bedarf).id } : { ohne_station: true }) });
  });
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
  return {
    version: 3, name: ort.name, ort: ort.id, namen_gefragt: false, geld_eur: KONSTANTEN.startgeld_eur, taler: KONSTANTEN.starttaler,
    objekte: behalten, naechste_id: id, innen: [], preisstufe: START_PREISSTUFE, antraege: {},
    karte: 2, zuletzt_ms: jetzt_ms, erledigt: {}, gemocht: {}, quelle_gewaehlt: false, deko_anzahl: 0,
  };
}

function ueberlappt(a: Objekt, b: Objekt): boolean {
  const sa = groesse(a), sb = groesse(b);
  return a.x < b.x + sb && b.x < a.x + sa && a.y < b.y + sb && b.y < a.y + sa;
}
