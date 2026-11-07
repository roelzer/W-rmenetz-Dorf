import { KATALOG, type TypId } from '../../src/core/katalog';

/** Mit gesetztem Katalogwert ausführen und ihn danach sicher zurücksetzen – auch wenn `f` wirft. */
export function mitKatalog<T>(typ: TypId, feld: 'kapazitaet_kw' | 'verbrauch_kwh_a', wert: number, f: () => T): T {
  const d = KATALOG[typ] as unknown as Record<string, unknown>;
  const alt = d[feld];
  d[feld] = wert;
  try { return f(); } finally { d[feld] = alt; }
}
