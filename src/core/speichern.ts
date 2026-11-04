import { neuerSpielstand } from './spiel';
import type { Spielstand } from './typen';

export const SPEICHER_SCHLUESSEL = 'waermedorf-spielstand-v1';

/** Zustand → JSON. Nur der Spielstand, keine Darstellungsfelder. */
export function serialisieren(stand: Spielstand): string {
  return JSON.stringify(stand, (k, v) => (k === '_pop' ? undefined : v));
}

/** JSON → Spielstand. Kaputte, fremde oder zu alte Daten ergeben ein neues Spiel. */
export function laden(text: string | null, jetzt_ms: number): Spielstand {
  if (!text) return neuerSpielstand(jetzt_ms);
  try {
    const d = JSON.parse(text) as Partial<Spielstand>;
    if (d && d.version === 1 && Array.isArray(d.objekte) && Array.isArray(d.innen) &&
        d.objekte.some((o) => o && o.typ === 'hz') && typeof d.geld_eur === 'number') {
      return d as Spielstand;
    }
  } catch { /* fällt unten zurück */ }
  return neuerSpielstand(jetzt_ms);
}
