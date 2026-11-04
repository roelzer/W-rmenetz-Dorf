import { KATALOG, type TypId } from './katalog';
import { neuerSpielstand } from './spiel';
import type { Spielstand } from './typen';

export const SPEICHER_SCHLUESSEL = 'waermedorf-spielstand-v1';
/** Aktuelle Form des Spielstands. Bei jeder Änderung des Datenmodells erhöhen und unten migrieren. */
export const SPEICHER_VERSION = 3;

/** Zustand → JSON. Nur der Spielstand, keine Darstellungsfelder. */
export function serialisieren(stand: Spielstand): string {
  return JSON.stringify(stand, (k, v) => (k === '_pop' ? undefined : v));
}

export type LadeBefund = 'neu' | 'ok' | 'migriert' | 'defekt';

/** Leitungs-Namen der Versionen 1 (p1/p2/p3) → Durchmesser (gleiche Leistung 12/50/220 kW). */
const ALTE_LEITUNGEN: Record<string, TypId> = { p1: 'd25', p2: 'd50', p3: 'd110' };

const ALTE_PREISE_CT = [10, 12, 14, 16, 18];
const istZahl = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Prüft jedes Objekt und jede Heizhaus-Quelle gegen den Katalog. Ein unbekannter Typ macht den Stand unbrauchbar. */
function gueltig(d: Partial<Spielstand>): d is Spielstand {
  if (!d || !Array.isArray(d.objekte) || !Array.isArray(d.innen)) return false;
  if (!istZahl(d.geld_eur) || !istZahl(d.taler) || !istZahl(d.naechste_id) || !istZahl(d.zuletzt_ms) || !istZahl(d.preisstufe)) return false;
  if (typeof d.name !== 'string' || !d.erledigt || typeof d.erledigt !== 'object' || !d.gemocht || !d.antraege) return false;
  for (const o of d.objekte) {
    if (!o || !(o.typ in KATALOG) || !istZahl(o.x) || !istZahl(o.y) || !istZahl(o.id) || !istZahl(o.stufe)) return false;
  }
  for (const k of d.innen) if (!k || !(k.typ in KATALOG) || KATALOG[k.typ].kategorie !== 'innen' || !istZahl(k.stufe)) return false;
  // Neue optionale Felder (A33, A41): unbrauchbare Werte machen den Stand unbrauchbar, statt Bauabschnitte für immer zu blockieren
  if (d.vorlauf_c !== undefined && !istZahl(d.vorlauf_c)) return false;
  if (d.abschnitt !== undefined) {
    const a = d.abschnitt as { phase?: unknown; bau?: { ende_ms?: unknown } | null };
    if (!a || !['planung', 'offen', 'bestellen', 'bau'].includes(a.phase as string)) return false;
    if ((a.phase === 'planung' || a.phase === 'bau') && !(a.bau && istZahl(a.bau.ende_ms))) return false;
  }
  for (const o of d.objekte) if (o.upgrade !== undefined && !istZahl(o.upgrade)) return false;
  return d.objekte.some((o) => o.typ === 'hz');
}

/**
 * JSON → Spielstand mit Befund. Version 1 wird umgeschrieben, kaputte oder fremde Daten ergeben ein neues Spiel
 * (Befund 'defekt', damit die Oberfläche den Spieler informiert und den alten Text sichern kann).
 */
export function ladenMitBefund(text: string | null, jetzt_ms: number): { stand: Spielstand; befund: LadeBefund } {
  if (!text) return { stand: neuerSpielstand(jetzt_ms), befund: 'neu' };
  try {
    const d = JSON.parse(text) as Omit<Partial<Spielstand>, 'version'> & { version?: number };
    let migriert = false;
    if (d && d.version === 1 && Array.isArray(d.objekte)) {
      d.version = 2 as number;
      for (const o of d.objekte) if (o && typeof o.typ === 'string' && o.typ in ALTE_LEITUNGEN) { o.typ = ALTE_LEITUNGEN[o.typ]; migriert = true; }
      migriert = true;
    }
    if (d && d.version === 2 && istZahl(d.preisstufe)) {
      // Version 3: Wärmepreis 7–15 ct/kWh in neun Stufen (vorher fünf Stufen 10–18 ct)
      d.preisstufe = Math.max(0, Math.min(8, Math.round(ALTE_PREISE_CT[d.preisstufe] ?? 12) - 7));
      d.version = SPEICHER_VERSION; migriert = true;
    }
    if (d && d.version === SPEICHER_VERSION && gueltig(d as Partial<Spielstand>)) return { stand: d as Spielstand, befund: migriert ? 'migriert' : 'ok' };
  } catch (fehler) {
    console.warn('Spielstand nicht lesbar', fehler);
  }
  return { stand: neuerSpielstand(jetzt_ms), befund: 'defekt' };
}

export function laden(text: string | null, jetzt_ms: number): Spielstand {
  return ladenMitBefund(text, jetzt_ms).stand;
}
