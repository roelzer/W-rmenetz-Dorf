import { KATALOG, LEITUNGEN, istLeitung, type TypId } from './katalog';
import type { Netz } from './typen';

/**
 * AE-NR18-2: Die zu dünne Leitung wird nur hier gefunden und benannt. Rein (kein Spielstand, keine Zeit); aufgerufen nur
 * vom Spielkern, der dafür ein Probe-Netz „wie nach dem Bau“ rechnet. Texte nach Bauplan NR18 Abschnitt 6 (Fachprüfer).
 */
export interface Engstelle {
  /** Feldnummern (y·N + x), ab der Heizzentrale geordnet */
  felder: number[];
  typ: TypId;
  /** Last am ersten Feld */
  last_kw: number;
  /** Katalogkapazität × Spreizungsfaktor des Netzes (A49) */
  kapazitaet_kw: number;
  /** erstes Feld liegt direkt an der Heizzentrale (Tiefe 1) */
  an_heizzentrale: boolean;
  /** ein Feld des Stücks ist eingezeichnet (geplant) oder hat einen geplanten Ersatz */
  geplant: boolean;
  /** kleinste Leitung des Katalogs, dicker als `typ`, die `last_kw` trägt; null = keine reicht */
  empfohlen: TypId | null;
}

/** Ohne gefundenes Stück (Fachprüfung F2: „werden“, weil die Station schon gekauft ist). */
export const ENGPASS_ERSATZ = 'Mit diesem Haus werden andere Häuser kalt. Eine Leitung auf dem Weg ist zu dünn.';
/** Zusatz, wenn beim Abschließen mehr als ein Stück zu dünn ist. */
export const WEITERE_STELLEN = 'Weitere zu dünne Stellen stehen im Baumenü.';

/** Kapazität eines Leitungstyps im Netz (Katalog × Spreizungsfaktor, wie die Netzrechnung). */
const kapazitaet = (netz: Netz, typ: TypId): number => (KATALOG[typ].kapazitaet_kw as number) * netz.spreizung_faktor;

/** Leitungstyp auf dem Feld; null, wenn dort keine Leitung liegt. */
function leitungsTyp(netz: Netz, feld: number): TypId | null {
  const o = netz.nachId.get(netz.belegung[feld]);
  return o && istLeitung(o.typ) ? o.typ : null;
}

function zuVoll(netz: Netz, feld: number): boolean {
  const typ = leitungsTyp(netz, feld);
  return typ !== null && (netz.last_kw.get(feld) ?? 0) > kapazitaet(netz, typ);
}

/**
 * Je Kunde der Weg von seinem Anschlussfeld über `netz.eltern` zur Heizzentrale; das Stück beginnt am ersten zu vollen Feld
 * ab der Heizzentrale und reicht über die anschließenden zu vollen Felder gleichen Typs. Gleiches erstes Feld = ein Eintrag
 * (der erste Kunde bestimmt die Fortsetzung). Kunden ohne Anschluss oder direkt an der Heizzentrale (Feld −1) haben keinen
 * Weg. Sortiert nach Tiefe des ersten Felds, dann Feldnummer.
 */
export function engstellenFinden(netz: Netz, kunden: Iterable<number>): Engstelle[] {
  const stuecke = new Map<number, Engstelle>();
  for (const id of kunden) {
    const a = netz.anschluss.get(id);
    if (!a) continue;
    // Feld −1 (direkt an der Heizzentrale) ergibt einen leeren Weg und damit kein Stück.
    const weg: number[] = [];
    for (let feld = a.feld; feld >= 0; feld = netz.eltern.get(feld) ?? -1) weg.push(feld);
    weg.reverse();
    const start = weg.findIndex((feld) => zuVoll(netz, feld));
    if (start < 0 || stuecke.has(weg[start])) continue;
    const typ = leitungsTyp(netz, weg[start]) as TypId;
    const felder = [weg[start]];
    for (let i = start + 1; i < weg.length && zuVoll(netz, weg[i]) && leitungsTyp(netz, weg[i]) === typ; i++) felder.push(weg[i]);
    const last_kw = netz.last_kw.get(weg[start]) as number;
    stuecke.set(weg[start], {
      felder,
      typ,
      last_kw,
      kapazitaet_kw: kapazitaet(netz, typ),
      an_heizzentrale: netz.tiefe.get(weg[start]) === 1,
      geplant: felder.some((feld) => { const o = netz.nachId.get(netz.belegung[feld]); return !!(o?.geplant || o?.ersatz); }),
      // Das Stück ist zu voll, die Katalogkapazität steigt mit dem Durchmesser: Jede Leitung, die die Last trägt, ist dicker.
      empfohlen: LEITUNGEN.find((l) => kapazitaet(netz, l) >= last_kw) ?? null,
    });
  }
  const tiefe = (e: Engstelle): number => netz.tiefe.get(e.felder[0]) as number;
  return [...stuecke.values()].sort((x, y) => tiefe(x) - tiefe(y) || x.felder[0] - y.felder[0]);
}

/** „25er-Leitung“ → „25er“ (Bauplan Abschnitt 6: Kurzname ohne „-Leitung“). */
const kurzname = (typ: TypId): string => KATALOG[typ].name.replace(/-Leitung$/, '');

/**
 * Warnsatz zur Engstelle (Bauplan Abschnitt 6). `empfohlenAbStufe`: null = die empfohlene Leitung ist frei, sonst die Stufe,
 * ab der es sie gibt; ohne Empfehlung wird der Wert nicht gelesen.
 */
export function engstelleText(e: Engstelle, empfohlenAbStufe: number | null): string {
  const t = kurzname(e.typ);
  const fehlt_kw = Math.max(1, Math.ceil(e.last_kw - e.kapazitaet_kw));
  const satz1 = e.geplant
    ? `Die eingezeichnete ${t} ist zu dünn, es fehlen ${fehlt_kw} kW.`
    : e.an_heizzentrale
      ? `Die ${t} an der Heizzentrale ist zu dünn, es fehlen ${fehlt_kw} kW.`
      : `Eine ${t} auf dem Weg ist zu dünn, es fehlen ${fehlt_kw} kW.`;
  const satz2 = e.empfohlen === null
    ? 'Leg eine getrennte zweite Leitung.'
    : empfohlenAbStufe === null
      ? `Zeichne eine ${kurzname(e.empfohlen)} darüber.`
      : `Die ${kurzname(e.empfohlen)} gibt es ab Stufe ${empfohlenAbStufe}.`;
  return `${satz1} ${satz2}`;
}
