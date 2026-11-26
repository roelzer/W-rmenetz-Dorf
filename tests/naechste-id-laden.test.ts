import { describe, expect, it } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { altesStartdorf } from './hilfen/altes-startdorf';

// Tester-Bericht 26.11. (Risiko 4): Ein Stand mit zu kleiner „nächster Objektnummer“ lud als „ok“; das nächste neue Objekt
// bekam eine schon vergebene Nummer, und spiel.objekt(nr) fand das falsche Objekt. Erwartung: Beim Laden steigt die Nummer
// still auf „höchste vorhandene Objektnummer + 1“ – ohne Befund „repariert“, denn der Spieler sieht diese Nummer nie.
// Feste Testdaten: Alle Objekte bekommen die Nummern 1, 2, 3 …, das letzte die 777 – höchste Nummer also 777.

const T0 = 1_000_000_000_000;
type Roh = Record<string, unknown> & { objekte: Array<Record<string, unknown>> };

function rohMitNummer(naechste_id: number): Roh {
  const d = JSON.parse(serialisieren(altesStartdorf(T0))) as Roh;
  d.objekte.forEach((o, i) => { o.id = i + 1; });
  d.objekte[d.objekte.length - 1].id = 777;
  d.naechste_id = naechste_id;
  return d;
}
const laden = (d: unknown) => ladenMitBefund(JSON.stringify(d), T0);

/** Erstes freies Feld für einen Baum im Südwesten der Karte (wie in spiel.test.ts). */
function frei(s: Spiel): [number, number] {
  for (let y = 22; y >= 0; y--) for (let x = 0; x < 6; x++) if (s.kannPlatzieren('baum', x, y)) return [x, y];
  throw new Error('kein freies Feld für den Baum');
}

describe('Nächste Objektnummer beim Laden', () => {
  it('naechste_id = 1 bei Objekten bis 777 → 778, Befund ok', () => {
    const r = laden(rohMitNummer(1));
    expect(r.befund).toBe('ok');
    expect(r.stand.naechste_id).toBe(778);
  });

  it('naechste_id genau auf der höchsten Nummer (777) → 778', () => {
    const r = laden(rohMitNummer(777));
    expect(r.befund).toBe('ok');
    expect(r.stand.naechste_id).toBe(778);
  });

  it('intakte naechste_id bleibt unverändert: 778 bleibt 778, 5000 bleibt 5000', () => {
    expect(laden(rohMitNummer(778)).stand.naechste_id).toBe(778);
    expect(laden(rohMitNummer(5000)).stand.naechste_id).toBe(5000);
  });

  it('neues Objekt nach dem Laden bekommt eine freie Nummer und wird über sie gefunden', () => {
    const z = { t: T0 };
    const s = new Spiel(laden(rohMitNummer(1)).stand, () => z.t);
    const erstes = s.objekt(1);
    s.stand.geld_eur = 1_000_000;
    expect(s.platzieren('baum', ...frei(s)).ok).toBe(true);
    expect(s.objekt(778)?.typ).toBe('baum');
    expect(erstes).toBeDefined();
    expect(s.objekt(1)).toBe(erstes);
    expect(s.stand.objekte.filter((o) => o.id === 778)).toHaveLength(1);
  });

  it('Speichern → Laden ist danach unverändert (gleicher Text, gleiche Nummer)', () => {
    const erst = laden(rohMitNummer(1)).stand;
    const text = serialisieren(erst);
    const zweit = ladenMitBefund(text, T0);
    expect(zweit.befund).toBe('ok');
    expect(zweit.stand.naechste_id).toBe(778);
    expect(serialisieren(zweit.stand)).toBe(text);
  });
});
