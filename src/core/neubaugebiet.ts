import { KONSTANTEN, type TypId } from './katalog';
import { ortHolen } from './orte';
import type { Spielstand } from './typen';

const N = KONSTANTEN.feldanzahl, ALTER_SUEDRAND = 32;
type Parzelle = { typ: TypId; x: number; y: number; bau_s: number };

// ---------- Layout 2 (2026-11-10, eingefroren) ----------
// Bleibt unverändert im Code: Alte Spielstände stehen noch darauf, und der Garten-Rückbau
// (spiel.ts gartenumbauRueckgaengig) findet die Ursprungsplätze nur über diese Listen.
const strassen2: Array<[number, number]> = [];
const parzellen: Parzelle[] = [];
for (let y = N; y < 40; y++) {
  strassen2.push([10, y]);
  if (y >= ALTER_SUEDRAND) continue;
  // Ein Feld Vorland bleibt für den Abzweig zwischen Haupttrasse und Haus.
  for (const [seite, x] of [8, 12].entries()) {
    const i = (y - N) * 2 + seite;
    parzellen.push({ typ: i % 3 === 0 ? 'efh' : 'rh', x, y, bau_s: (y - N + seite) % 2 ? 90 + Math.floor(i / 2) * 90 : 0 });
  }
}
for (const y of [32, 37]) for (let x = 5; x <= 17; x++) {
  if (x !== 10) strassen2.push([x, y]);
}
for (let y = 33; y < 37; y++) strassen2.push([5, y]);

const suedblock: Parzelle[] = [];
for (const y of [34, 35, 39]) for (const x of [6, 7, 8, 9, 11, 12, 13, 14, 15]) {
  if (y < 39 && (x === 13 || x === 14)) continue; // Platz für das Mehrfamilienhaus
  suedblock.push({ typ: (x + y) % 3 ? 'rh' : 'efh', x, y, bau_s: (x + y) % 2 ? 120 + (x - 5) * 60 : 0 });
}
suedblock.push({ typ: 'mfh', x: 13, y: 34, bau_s: 900 });

// ---------- Layout 3 (NR23, Simon 2026-11-11: „viel zu dicht, mach das breiter“) ----------
// Entwurf docs/bauplaene/NR23-neubaugebiet-entwurf.md: Sammelstraße x = 10 bis y = 41, drei Wohnstraßen
// (y = 27, 34, 41, x = 1 … 17). Grundstück 2 × 3 Felder (Vorgarten, Haus, Garten), zwischen zwei Häusern 1 Feld frei.
export const WOHNSTRASSEN_Y = [27, 34, 41] as const;
const strassen3: Array<[number, number]> = [];
for (let y = N; y <= 41; y++) strassen3.push([10, y]);
for (const y of WOHNSTRASSEN_Y) for (let x = 1; x <= 17; x++) if (x !== 10) strassen3.push([x, y]);

const plan3: Parzelle[] = [];
const REIHEN: Array<[number, number[]]> = [
  [25, [2, 4, 6, 8, 12, 14, 16]], [29, [2, 4, 6, 8, 12, 14, 16]], [32, [2, 4, 6, 8, 12, 14, 16]],
  [36, [2, 4, 6, 8]], [39, [2, 4, 6, 8, 12, 14, 16]], [43, [2, 4, 6, 8, 12, 14, 16]],
];
for (const [y, xs] of REIHEN) for (const x of xs) {
  // Typ- und Bauzeit-Regel wie im Südblock von Layout 2: gleiche Mischung (13 EFH, 26 RH), gestaffelte Fertigstellung.
  plan3.push({ typ: (x + y) % 3 ? 'rh' : 'efh', x, y, bau_s: (x + y) % 2 ? 90 + plan3.length * 30 : 0 });
}
plan3.push({ typ: 'mfh', x: 12, y: 36, bau_s: 900 });

const fluss: Array<[number, number]> = [];
for (let y = N; y < KONSTANTEN.neubau_hoehe; y++) fluss.push([19, y], [20, y]);

/** Hausplätze eines Layouts (Kopie, für Umzug und Tests). */
export function neubauPlan(layout: 2 | 3): Parzelle[] {
  return (layout === 3 ? plan3 : [...parzellen, ...suedblock]).map((p) => ({ ...p }));
}
/** Straßenfelder des Neubaugebiets je Layout. */
export function neubauStrassen(layout: 2 | 3): Array<[number, number]> {
  return (layout === 3 ? strassen3 : strassen2).map(([x, y]) => [x, y]);
}

const erweitert = new Map<string, ReturnType<typeof ortHolen>>();
export function spielOrt(stand: Pick<Spielstand, 'ort' | 'neubaugebiet' | 'neubaugebiet_layout' | 'neubau_strassenluecken'>): ReturnType<typeof ortHolen> {
  const ort = ortHolen(stand.ort);
  if (!stand.neubaugebiet) return ort;
  const layout = stand.neubaugebiet_layout === 3 ? 3 : 2;
  const luecken = stand.neubau_strassenluecken ?? [];
  const schluessel = `${ort.id}|${layout}|${luecken.join(',')}`;
  let plan = erweitert.get(schluessel);
  if (!plan) {
    const frei = new Set(luecken);
    const neu = (layout === 3 ? strassen3 : strassen2).filter(([x, y]) => !frei.has(y * N + x));
    plan = { ...ort, strassen: [...ort.strassen, ...neu], fluss: [...ort.fluss, ...fluss] };
    erweitert.set(schluessel, plan);
  }
  return plan;
}

function hinstellen(stand: Spielstand, liste: Parzelle[], zeit_ms: number): void {
  for (const { typ, x, y, bau_s } of liste) {
    stand.objekte.push({
      id: stand.naechste_id++, typ, x, y, stufe: 1, bestand: true, ohne_station: true,
      kasse_eur: 0, zufriedenheit_pct: 80,
      bau: bau_s ? { art: 'neu', start_ms: zeit_ms, ende_ms: zeit_ms + bau_s * 1000 } : null,
    });
  }
}

/** Eingefrorener Weg von Layout 2: nur für den Garten-Rückbau (Ursprungsplätze) und alte Stände. */
export function neubaugebietLayout2Anlegen(stand: Spielstand, zeit_ms: number): void {
  if (stand.neubaugebiet_layout === 2) return;
  hinstellen(stand, stand.neubaugebiet ? suedblock : [...parzellen, ...suedblock], zeit_ms);
  stand.neubaugebiet = true;
  stand.neubaugebiet_layout = 2;
}

/** Neue Erschließung bekommt Layout 3. Ältere Stände werden auf Layout 2 vervollständigt;
 *  den Umzug auf Layout 3 macht danach Spiel.neubaugebietUmziehen() (nach dem Garten-Rückbau). */
export function neubaugebietAnlegen(stand: Spielstand, zeit_ms: number): void {
  if (stand.neubaugebiet_layout === 3 || stand.neubaugebiet_layout === 2) return;
  if (stand.neubaugebiet) { neubaugebietLayout2Anlegen(stand, zeit_ms); return; }
  hinstellen(stand, plan3, zeit_ms);
  stand.neubaugebiet = true;
  stand.neubaugebiet_layout = 3;
}
