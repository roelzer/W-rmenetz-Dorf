import { mod } from '../core/feld';
import { querungImBau } from '../core/nordviertel';
import type { Spielstand } from '../core/typen';
import type { Kamera } from './kamera';
import type { Maler, Punkt } from './maler';

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

/** Farben und Maße aus DESIGN 14.9 (Vorschlag `farbe.bahn`/`karte.bahn`; in design/tokens.json trägt sie 14.15 Punkt 21 ein). */
export const BAHN = {
  schotter: '#8f887d', schotter_kante: '#6f675c', randweg: '#ddd5c4', schwelle: '#cfcac0', schiene: '#333b41',
  schiene_glanz: 'rgba(255,255,255,.55)', zaun: '#55605b', bruecke: '#7d858a',
} as const;
export const BAHN_MASS = { gleisabstand: 0.44, spurweite: 0.144, schwellen_teilung: 0.25, detail_ab_kachelbreite: 32 } as const;

/** Oberleitung (DESIGN 14.2 „Oberleitung“, 14.9 `mast`, `fahrdraht`, `mast_teilung`, `mast_versatz`, `mast_hoehe`, `fahrdraht_hoehe`). */
const MAST = {
  farbe: '#3f4549', draht: 'rgba(47,58,64,.60)',
  teilung: 3, versatz: 2,
  /** Masten auf dem Randweg Nord (Querschnitt 14.2) */
  y: -3.26,
  /** Höhen in Kachelbreiten */
  hoehe: 0.62, draht_hoehe: 0.50,
  /** Ausleger knapp unter der Mastspitze, damit die Spitze als Mast lesbar bleibt (Wert der Grafik, kein Fachwert) */
  ausleger_hoehe: 0.58,
} as const;

type Felder = ReadonlyArray<readonly [number, number]>;

/** Gleisspalten von Ende zu Ende: x = −2 … 25, beidseits über die Karte hinaus in den Wolkenrand (DESIGN 14.2 „Enden“). */
export function gleisSpalten(): number[] {
  const r: number[] = [];
  for (let x = ZUG_MASS.von_x; x <= ZUG_MASS.bis_x; x++) r.push(x);
  return r;
}

/** Mastspalten: x ≡ 2 (mod 3) über die ganze Strecke, nie auf der Brücke. mod() aus feld.ts, weil x = −1 negativ ist. */
export function mastSpalten(bahn: Felder, fluss: Felder): number[] {
  const bruecken = brueckenSpalten(bahn, fluss);
  return gleisSpalten().filter((x) => mod(x, MAST.teilung) === MAST.versatz && !bruecken.has(x));
}

/** Ein Mast mit seiner Tiefe für die Zeichenreihenfolge der Objekt-Ebene (gleiche Formel wie für Objekte: Mitte + Größe 1). */
export interface Mast {
  x: number; tiefe: number;
  /** Fahrdraht von … bis (Feld-x): vom Mast zum nächsten, beim ersten Mast schon ab dem Gleisanfang */
  draht_von_x: number; draht_bis_x: number;
}

export function mastenNachTiefe(k: Kamera, bahn: Felder, fluss: Felder): Mast[] {
  const xs = mastSpalten(bahn, fluss);
  return xs.map((x, i) => {
    const [rx, ry] = k.dreheFeld(x, MAST.y);
    return { x, tiefe: rx + ry + 1, draht_von_x: i === 0 ? ZUG_MASS.von_x - 0.5 : x, draht_bis_x: xs[i + 1] ?? ZUG_MASS.bis_x + 0.5 };
  }).sort((a, b) => a.tiefe - b.tiefe);
}

/**
 * Mast mit Ausleger über beide Gleise und den Fahrdrähten bis zum nächsten Mast (am Ende bis zum Gleisende).
 * Unter der Detailstufe ohne Ausleger und mit einem Fahrdraht über der Bahnmitte (DESIGN 14.2 Zoomstufen).
 */
export function zeichneMast(m: Maler, k: Kamera, mast: Mast): void {
  const { X } = m, tw = k.tw;
  const oben = (x: number, y: number, h: number): Punkt => { const [px, py] = k.mitte(x, y); return [px, py - h * tw]; };
  const a = oben(mast.draht_von_x, MAST.y, 0), b = oben(mast.draht_bis_x, MAST.y, 0);
  const rand = 2 * tw;
  if (Math.max(a[0], b[0]) < -rand || Math.min(a[0], b[0]) > k.breite + rand || Math.max(a[1], b[1]) < -rand || Math.min(a[1], b[1]) > k.hoehe + rand) return;
  const details = tw >= BAHN_MASS.detail_ab_kachelbreite;
  const gleise = details ? [ZUG_MASS.gleis1_y, ZUG_MASS.gleis2_y] : [(ZUG_MASS.gleis1_y + ZUG_MASS.gleis2_y) / 2];
  X.strokeStyle = MAST.draht; X.lineWidth = Math.max(0.75, tw * 0.012); X.beginPath();
  for (const g of gleise) { X.moveTo(...oben(mast.draht_von_x, g, MAST.draht_hoehe)); X.lineTo(...oben(mast.draht_bis_x, g, MAST.draht_hoehe)); }
  X.stroke();
  X.strokeStyle = MAST.farbe; X.lineWidth = Math.max(1, tw * 0.022); X.beginPath();
  X.moveTo(...oben(mast.x, MAST.y, 0)); X.lineTo(...oben(mast.x, MAST.y, MAST.hoehe));
  if (details) { X.moveTo(...oben(mast.x, MAST.y, MAST.ausleger_hoehe)); X.lineTo(...oben(mast.x, ZUG_MASS.gleis1_y, MAST.ausleger_hoehe)); }
  X.stroke();
}

/** Spalten mit Brückentrog: Der Fluss kreuzt die Bahnzeilen dort, wo ober- und unterhalb der Bahn Wasser liegt. */
export function brueckenSpalten(bahn: Felder, fluss: Felder): Set<number> {
  const zeilen = bahn.map(([, y]) => y), nord = Math.min(...zeilen), sued = Math.max(...zeilen);
  const wasser = new Set(fluss.map(([x, y]) => `${x},${y}`));
  return new Set(bahn.map(([x]) => x).filter((x) => wasser.has(`${x},${nord - 1}`) && wasser.has(`${x},${sued + 1}`)));
}

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
