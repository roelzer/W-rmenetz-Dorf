import { KATALOG } from '../core/katalog';
import type { Spiel } from '../core/spiel';
import type { Netz, Objekt } from '../core/typen';
import type { Blase } from './gebaeude';

// Eigene Datei, damit szene.ts und szene-schluessel.ts sie beide nutzen können, ohne sich gegenseitig zu importieren.

/** Welche Sprechblase gehört über das Gebäude? Nur eine, wichtigste zuerst. */
export function blase(sp: Spiel, netz: Netz, o: Objekt, warm: boolean, angeschlossen: boolean): Blase | null {
  const D = KATALOG[o.typ], kat = D.kategorie;
  if (kat === 'haus' || (kat === 'gross' && o.zustand === 'vertrag' && D.bedarf_kw)) {
    if (o.gekuendigt) return 'weg';
    if (!angeschlossen && !o.station) return null; // Häuser, die noch mit Öl heizen, bekommen keine Blase (weniger Unruhe)
    if (!angeschlossen || o.ohne_station) return 'stecker';
    if (netz.kalt.get(o.id) === 'leitung' || netz.kalt.get(o.id) === 'station') return 'leitung';
    if (!warm) return 'kalt';
    if ((o.zufriedenheit_pct ?? 80) < 40) return 'wuetend';
    if (o.anfrage) return 'anfrage'; // A88/F2: Probleme haben Vorrang vor der Kundenanfrage
    return null;
  }
  if (kat === 'gross' && o.zustand !== 'vertrag' && sp.vertragBedingungen(o).ok) return 'angebot';
  if (kat === 'gross' && o.typ === 'gewerbe' && o.zustand === 'vertrag' && !angeschlossen) return 'stecker';
  if (kat === 'waerme' && !angeschlossen) return 'stecker';
  return null;
}
