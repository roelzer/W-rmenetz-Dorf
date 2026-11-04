import { KATALOG, type TypId } from './katalog';
import { neuerSpielstand } from './spiel';
import type { Spielstand } from './typen';

export const SPEICHER_SCHLUESSEL = 'waermedorf-spielstand-v1';
/** Aktuelle Form des Spielstands. Bei jeder Änderung des Datenmodells erhöhen und unten migrieren. */
export const SPEICHER_VERSION = 2;

/** Zustand → JSON. Nur der Spielstand, keine Darstellungsfelder. */
export function serialisieren(stand: Spielstand): string {
  return JSON.stringify(stand, (k, v) => (k === '_pop' ? undefined : v));
}

export type LadeBefund = 'neu' | 'ok' | 'migriert' | 'defekt';

/** Leitungs-Namen der Versionen 1 (p1/p2/p3) → Durchmesser (gleiche Leistung 12/50/220 kW). */
const ALTE_LEITUNGEN: Record<string, TypId> = { p1: 'd25', p2: 'd50', p3: 'd110' };

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
      for (const o of d.objekte) if (o && typeof o.typ === 'string' && o.typ in ALTE_LEITUNGEN) { o.typ = ALTE_LEITUNGEN[o.typ]; migriert = true; }
      d.version = SPEICHER_VERSION;
      migriert = true;
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
