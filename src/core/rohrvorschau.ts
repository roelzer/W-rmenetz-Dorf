import { KATALOG, LEITUNGEN, type TypId } from './katalog';
import { bedarfKw, istAktiv, istKunde } from './netz';
import type { Netz, Objekt } from './typen';

/**
 * NR24 (Simon 2026-11-11): Vorschau beim Leitungsziehen, welche Leitungsgröße an einem Feld mindestens nötig ist, damit alle
 * Häuser dahinter versorgt sind. Rein (kein Spielstand, keine Zeit); der Spielkern ruft sie mit dem Probe-Netz „wie nach dem
 * Bau“ (eingezeichnete Leitungen und Ersatz zählen schon) auf.
 */
export interface RohrVorschau {
  /** Last in kW aller gezählten Häuser hinter dem Feld (Feld eingeschlossen) */
  last_kw: number;
  /** Anzahl dieser Häuser */
  haeuser: number;
  /** kleinste Leitung des Katalogs, die `last_kw` trägt (Katalog × Spreizungsfaktor wie die Netzrechnung); null = keine */
  noetig: TypId | null;
}

/**
 * Gezählt wird, wer Wärme abnimmt (istKunde) und Häuser, die nur noch keine Übergabestation haben: Sie werden mit der neuen
 * Leitung angeschlossen und sollen deshalb schon in die Größe eingehen (Simon: „um alle Häuser versorgen zu können“).
 * Gekündigte Häuser und Häuser im Neubau zählen nicht.
 */
function zaehlt(o: Objekt): boolean {
  return istKunde(o) || (KATALOG[o.typ].kategorie === 'haus' && !!o.ohne_station && istAktiv(o) && !o.gekuendigt);
}

/**
 * Last hinter `feld` im Netzbaum: Je gezähltem Haus der Weg vom Anschlussfeld über `netz.eltern` zur Heizzentrale; liegt
 * `feld` darauf, zählt sein Bedarf. null, wenn `feld` keine mit der Heizzentrale verbundene Leitung ist.
 */
export function rohrVorschau(netz: Netz, objekte: readonly Objekt[], feld: number): RohrVorschau | null {
  if (!netz.tiefe.has(feld)) return null;
  let last_kw = 0, haeuser = 0;
  for (const o of objekte) {
    if (!zaehlt(o)) continue;
    const a = netz.anschluss.get(o.id);
    if (!a || a.feld < 0) continue;
    for (let f = a.feld; f >= 0; f = netz.eltern.get(f) ?? -1) {
      if (f === feld) { last_kw += bedarfKw(o); haeuser++; break; }
    }
  }
  const noetig = LEITUNGEN.find((t) => (KATALOG[t].kapazitaet_kw as number) * netz.spreizung_faktor >= last_kw) ?? null;
  return { last_kw, haeuser, noetig };
}

/** „25er-Leitung“ → „25er“. */
const kurzname = (typ: TypId): string => KATALOG[typ].name.replace(/-Leitung$/, '');

/**
 * Texte der Vorschau in der Zeichenleiste (schmal, darum kurz). `gewaehlt`: Leitung des Stifts; `abStufe`: Stufe, ab der die
 * nötige Leitung frei ist (null = schon frei). kW aufgerundet, damit „reicht“ nie zu knapp wirkt.
 */
export function rohrVorschauText(v: RohrVorschau, gewaehlt: TypId | null, abStufe: number | null): { zeile: string; klein: string; warnung: string | null } {
  if (v.haeuser === 0) return { zeile: 'Noch kein Haus dahinter', klein: '', warnung: null };
  const klein = `${v.haeuser} ${v.haeuser === 1 ? 'Haus' : 'Häuser'} · ${Math.ceil(v.last_kw - 1e-9)} kW`;
  if (v.noetig === null) return { zeile: 'Keine Leitung reicht hier', klein, warnung: 'Leg einen getrennten Abgang.' };
  const zeile = `Hier nötig: ${kurzname(v.noetig)}${abStufe === null ? '' : ` (ab Stufe ${abStufe})`}`;
  const zuDuenn = gewaehlt !== null && LEITUNGEN.indexOf(gewaehlt) < LEITUNGEN.indexOf(v.noetig);
  return { zeile, klein, warnung: zuDuenn ? `Deine ${kurzname(gewaehlt)} ist hier zu dünn.` : null };
}
