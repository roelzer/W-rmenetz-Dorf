import { istLeitung, KONSTANTEN, type TypId } from './katalog';
import { freigeschaltet, sperrgrund } from './freischaltung';
import { KARTE_OBEN_Y } from './feld';
import { nordHinweisText } from './nord-texte';
import type { Objekt, Spielstand } from './typen';

/**
 * NR27 (AE-NR27-5): Die Nordzone – Bahn, Brücke, Querungsstelle, Straßen, Fluss und der Hausplan hinter der Bahn – steht nur hier.
 * Reines Datenmodul ohne Darstellung; spiel.ts ruft es auf, nie umgekehrt. Die Zeilen liegen im negativen y (Bauplan Abschnitt 3).
 * Hier kein Vergleich von y mit 0: Abfragen laufen über istBahn/hinterDerBahn.
 */

/** Gleiszeilen der Bahn quer über die ganze Kartenbreite. */
export const BAHN_ZEILEN_Y: readonly number[] = [-3, -2];
/** Die Straßenbrücke über den Fluss trägt keine Leitung. */
export const BRUECKE_X: readonly number[] = [19, 20];
/** Einzige Spalte, in der eine Leitung die Gleise quert: Verlängerung der Dorfstraße x = 10. */
export const QUERUNG_X = 10;

const ERSTE_ZEILE_Y = KARTE_OBEN_Y;
const LETZTE_ZEILE_Y = -1;
const ERSTE_ZEILE_HINTER_Y = -4;
const FLUSS_X: readonly number[] = [19, 20];
/** Wohnstraße im Norden: Zeile y = -7 von x = 1 bis x = 17. */
const WOHNSTRASSE_Y = -7;

type Haus = { typ: TypId; x: number; y: number };

/** 14 Häuser (5 EFH, 9 RH; Entscheidung 23.11.) in zwei Reihen hinter der Bahn; Reihenfolge wie im Bauplan. */
export const NORD_PLAN: ReadonlyArray<Haus> = [
  { typ: 'efh', x: 2, y: -9 }, { typ: 'rh', x: 4, y: -9 }, { typ: 'rh', x: 6, y: -9 }, { typ: 'efh', x: 8, y: -9 },
  { typ: 'rh', x: 12, y: -9 }, { typ: 'rh', x: 14, y: -9 }, { typ: 'efh', x: 16, y: -9 },
  { typ: 'rh', x: 2, y: -5 }, { typ: 'efh', x: 4, y: -5 }, { typ: 'rh', x: 6, y: -5 }, { typ: 'rh', x: 8, y: -5 },
  { typ: 'efh', x: 12, y: -5 }, { typ: 'rh', x: 14, y: -5 }, { typ: 'rh', x: 16, y: -5 },
];

export function bahnFelder(): Array<[number, number]> {
  const felder: Array<[number, number]> = [];
  for (const y of BAHN_ZEILEN_Y) for (let x = 0; x < KONSTANTEN.feldanzahl; x++) felder.push([x, y]);
  return felder;
}

/** Stichstraße (x = 10) und Wohnstraße der Nordzone: hier dürfen Leitungen ohne Gestattung liegen. */
export function nordStrassen(): Array<[number, number]> {
  const felder: Array<[number, number]> = [];
  for (let y = ERSTE_ZEILE_Y; y < WOHNSTRASSE_Y; y++) felder.push([QUERUNG_X, y]);
  for (let x = 1; x <= 17; x++) felder.push([x, WOHNSTRASSE_Y]);
  return felder;
}

/** Fluss am Ostrand, über die Bahnzeilen führt die Brücke. */
export function nordFluss(): Array<[number, number]> {
  const felder: Array<[number, number]> = [];
  for (let y = ERSTE_ZEILE_Y; y <= LETZTE_ZEILE_Y; y++) {
    if (BAHN_ZEILEN_Y.includes(y)) continue;
    for (const x of FLUSS_X) felder.push([x, y]);
  }
  return felder;
}

export const istBahn = (x: number, y: number): boolean => BAHN_ZEILEN_Y.includes(y) && x >= 0 && x < KONSTANTEN.feldanzahl;
export const istBruecke = (x: number, y: number): boolean => istBahn(x, y) && BRUECKE_X.includes(x);
export const hinterDerBahn = (y: number): boolean => y <= ERSTE_ZEILE_HINTER_Y;

/** Die Häuser hinter der Bahn als Kulisse: bis zur Erschließung gezeichnet, aber keine Objekte. */
export function nordKulisse(stand: Pick<Spielstand, 'nordviertel'>): ReadonlyArray<Haus> {
  return stand.nordviertel ? [] : NORD_PLAN;
}

/** Die Querung steht, wenn auf jeder Bahnzeile in der Querungsspalte eine gebaute (nicht nur geplante) Leitung liegt. */
export function querungGebaut(objekte: ReadonlyArray<Objekt>): boolean {
  return BAHN_ZEILEN_Y.every((y) => objekte.some((o) => o.x === QUERUNG_X && o.y === y && istLeitung(o.typ) && !o.geplant));
}

export function querungImBau(stand: Pick<Spielstand, 'abschnitt'>): boolean {
  return !!stand.abschnitt?.mit_querung && stand.abschnitt.phase === 'bau';
}

/** Legt die Häuser hinter der Bahn einmalig an (Merker `nordviertel`). Belegte Plätze werden übersprungen. */
export function nordviertelAnlegen(stand: Spielstand): boolean {
  if (stand.nordviertel) return false;
  for (const h of NORD_PLAN) {
    if (stand.objekte.some((o) => o.x === h.x && o.y === h.y)) continue;
    stand.objekte.push({
      id: stand.naechste_id++, typ: h.typ, x: h.x, y: h.y, stufe: 1, bestand: true, ohne_station: true,
      kasse_eur: 0, zufriedenheit_pct: 80, bau: null,
    });
  }
  stand.nordviertel = true;
  return true;
}

/** Der eine Sperrgrund der Nordzone (AE-NR27-9): `null` = erlaubt. Genutzt vom Platzieren im Kern und vom Ziehen in der Steuerung. */
export function nordSperre(stand: Spielstand, t: TypId, x: number, y: number): string | null {
  if (istBahn(x, y)) {
    if (!istLeitung(t)) return nordHinweisText('GLEISE');
    if (istBruecke(x, y)) return nordHinweisText('BRUECKE');
    const grund = sperrgrund(stand, 'bahnquerung');
    if (grund !== null) return nordHinweisText('Q2', { sperrgrund: grund });
    if (x === QUERUNG_X) return null;
    const nachbar = stand.objekte.some((o) => o.y === y && (o.x === x - 1 || o.x === x + 1) && istLeitung(o.typ));
    return nordHinweisText(nachbar ? 'Q4' : 'STELLE');
  }
  if (hinterDerBahn(y) && !stand.nordviertel) return nordHinweisText(querungImBau(stand) ? 'Q5' : 'HINTER');
  return null;
}

/** Hinweis beim Antippen der Bahn oder der Kulisse; nach der Erschließung nichts mehr. */
export function nordInfo(stand: Spielstand, x: number, y: number): string | null {
  if (stand.nordviertel || !(istBahn(x, y) || hinterDerBahn(y))) return null;
  return nordHinweisText(freigeschaltet(stand, 'bahnquerung') ? 'N2' : 'N1');
}
