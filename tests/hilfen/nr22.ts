/**
 * Gemeinsame Testhilfen NR22 (Tester-Vorarbeit P7t, Review P7 gesamt K4). Vorher wörtlich doppelt in
 * tests/nr22-darstellung.test.ts / tests/nr22-vorschau.test.ts (aufnahme) und tests/nr22-blatt.test.ts /
 * tests/nr22-steuerung.test.ts (leeresDorf). Inhalt unverändert übernommen.
 */
import { Spiel, neuerSpielstand } from '../../src/core/spiel';
import { istLeitung } from '../../src/core/katalog';
import type { Uhr } from './nr18';

/** Zeichen-Aufnahme: ein Canvas-Kontext, der jeden Aufruf und jede Zuweisung als Text in `befehle` schreibt. */
export function aufnahme(): { X: CanvasRenderingContext2D; befehle: string[] } {
  const befehle: string[] = [];
  const zustand = new Map<PropertyKey, unknown>();
  const text = (a: unknown): string => (Array.isArray(a) ? JSON.stringify(a) : typeof a === 'object' && a !== null ? 'objekt' : String(a));
  const X = new Proxy({}, {
    get(_z, p) {
      if (zustand.has(p)) return zustand.get(p);
      return (...a: unknown[]) => {
        befehle.push(`${String(p)}(${a.map(text).join(',')})`);
        if (p === 'measureText') return { width: String(a[0]).length * 6 };
        if (p === 'createRadialGradient' || p === 'createLinearGradient') return { addColorStop: () => {} };
        return undefined;
      };
    },
    set(_z, p, v) { zustand.set(p, v); befehle.push(`${String(p)}=${text(v)}`); return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { X, befehle };
}

/** Startdorf zur Zeit `t0` ohne Leitungen und ohne Stationen, Kessel gewählt, 1 Mio. € Geld, Ereignisse geleert. */
export function leeresDorf(t0: number): { s: Spiel; z: Uhr } {
  const z = { t: t0 };
  const st = neuerSpielstand(t0);
  st.objekte = st.objekte.filter((o) => !istLeitung(o.typ));
  for (const o of st.objekte) if (o.station) { delete o.station; o.ohne_station = true; }
  const s = new Spiel(st, () => z.t);
  if (!s.stand.quelle_gewaehlt) s.ersteQuelleWaehlen('kessel');
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.length = 0;
  return { s, z };
}
