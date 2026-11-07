import tokens from '../../design/tokens.json';
import { KONSTANTEN } from '../core/katalog';
import type { Kamera } from './kamera';
import type { Szene } from './szene';

/** Warndreieck-Maße aus DESIGN 13.17.3 (Token `karte.ueberlast`). */
const U = tokens.karte.ueberlast;
/** DESIGN 13.17.3 / Bauplan E9: Zwei Dreiecke näher als 1,5 Felder (Feldmitten) stehen sich im Weg – das spätere entfällt. */
const MINDESTABSTAND_FELDER = 1.5;

/**
 * Bauplan E9 (AE-NR22-4: nur hier): Auf welchen Feldern jedes überlastete Stück ein Warndreieck bekommt, je Stück in derselben
 * Reihenfolge wie `stuecke`. Gelesen wird nach Tiefe im Netz, nicht nach Listenplatz, damit Verzweigungen nicht von der
 * Feldreihenfolge abhängen: Kandidaten sind die Tiefen t0, t0 + 8, … (je Tiefe das Feld mit der kleinsten Nummer); außer dem
 * ersten entfällt ein Kandidat weniger als 4 Felder vor dem tiefsten Feld (der Saum zeigt den Rest). Danach entfällt über alle
 * Stücke jedes Dreieck, das einem schon gesetzten zu nahe kommt. `feldanzahl` = Kartenbreite (Feldnummer = y × feldanzahl + x).
 */
export function dreieckFelder(stuecke: ReadonlyArray<ReadonlyArray<number>>, tiefe: ReadonlyMap<number, number>, feldanzahl: number): number[][] {
  const tiefeVon = (f: number): number => {
    const t = tiefe.get(f);
    if (t === undefined) throw new Error(`Überlast-Dreieck: keine Tiefe für Feld ${f}`);
    return t;
  };
  const gesetzt: Array<[number, number]> = [];
  return stuecke.map((stueck) => {
    if (!stueck.length) return [];
    const t0 = tiefeVon(stueck[0]);
    const kleinstesJeTiefe = new Map<number, number>();
    for (const f of stueck) {
      const t = tiefeVon(f), alt = kleinstesJeTiefe.get(t);
      if (alt === undefined || f < alt) kleinstesJeTiefe.set(t, f);
    }
    const tmax = Math.max(...kleinstesJeTiefe.keys());
    const kandidaten: number[] = [];
    for (let t = t0; t <= tmax; t += U.wiederholen_felder) {
      const f = kleinstesJeTiefe.get(t);
      if (f !== undefined && (t === t0 || tmax - t >= U.abstand_ende_min)) kandidaten.push(f);
    }
    return kandidaten.filter((f) => {
      const x = f % feldanzahl, y = Math.floor(f / feldanzahl);
      if (gesetzt.some(([gx, gy]) => Math.hypot(gx - x, gy - y) < MINDESTABSTAND_FELDER)) return false;
      gesetzt.push([x, y]);
      return true;
    });
  });
}

/** Bildschirmmitte des Warndreiecks über einem Feld (DESIGN 13.17.3): Pfosten von der Leitungsmitte nach oben, darauf die
 *  Unterkante des gleichseitigen Dreiecks mit Kante clamp(Feldbreite × 0,34, 16, 28). */
function dreieckMitte(k: Kamera, feld: number): [number, number] {
  const N = KONSTANTEN.feldanzahl;
  const [x, y] = k.mitte(feld % N, Math.floor(feld / N));
  const kante = Math.min(U.zeichen_max, Math.max(U.zeichen_min, k.tw * U.zeichen_faktor));
  return [x, y - k.tw * U.pfosten_faktor - (kante * Math.sqrt(3)) / 4];
}

/** Welches Warndreieck liegt unter dem Finger? Tippfläche 44 × 44 px um die Dreiecksmitte; bei Überdeckung das nächste.
 *  Liefert das Dreieck-Feld oder null (dann gilt das Antippen der Leitung wie bisher). */
export function dreieckTreffer(k: Kamera, ueberlast: Szene['ueberlast'], mx: number, my: number): number | null {
  const halb = tokens.groesse_px.tippflaeche_min / 2;
  let best: number | null = null, bestAbstand = Infinity;
  for (const stueck of ueberlast ?? []) {
    for (const f of stueck.dreiecke) {
      const [cx, cy] = dreieckMitte(k, f), dx = Math.abs(mx - cx), dy = Math.abs(my - cy);
      if (dx > halb || dy > halb) continue;
      const d = Math.hypot(dx, dy);
      if (d < bestAbstand) { bestAbstand = d; best = f; }
    }
  }
  return best;
}
