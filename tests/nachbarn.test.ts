import { describe, expect, it } from 'vitest';
import { nachbardoerfer, neuesNachbardorf } from '../src/core/nachbarn';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/spiel';

describe('A17 – Nachbardörfer besuchen (Beispieldörfer, kein Server)', () => {
  it('A17: Es gibt Beispieldörfer mit Namen, Besitzer, Heizzentrale und Dorfwert', () => {
    const d = nachbardoerfer();
    expect(d.length).toBeGreaterThanOrEqual(3);
    for (const v of d) {
      expect(v.name).toBeTruthy(); expect(v.besitzer).toBeTruthy();
      expect(v.objekte.filter((o) => o.typ === 'hz')).toHaveLength(1);
      expect(v.dorfwert).toBeGreaterThan(0);
    }
  });
  it('A17: Gleicher Startwert ergibt immer dasselbe Dorf (deterministisch)', () => {
    const a = neuesNachbardorf(23, 3, 'X', 'Y'), b = neuesNachbardorf(23, 3, 'X', 'Y');
    expect(JSON.stringify(a.objekte)).toBe(JSON.stringify(b.objekte));
  });
  it('A17: Größere Heizzentrale ergibt höheren Dorfwert (Rangfolge nach Dorfwert sinnvoll)', () => {
    expect(neuesNachbardorf(5, 4, 'a', 'b').dorfwert).toBeGreaterThan(neuesNachbardorf(5, 1, 'a', 'b').dorfwert);
  });
  it('A17: Objekte überlappen sich nicht und liegen auf der Karte', () => {
    for (const v of nachbardoerfer()) {
      const belegt = new Set<string>();
      for (const o of v.objekte) {
        const s = o.typ === 'hz' ? (o.stufe >= 3 ? 3 : 2) : (['mfh', 'bad', 'klinik', 'buero', 'brunnen', 'pv', 'solar', 'sonde', 'gewerbe'].includes(o.typ) ? 2 : 1);
        for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
          expect(o.x + dx).toBeLessThan(24); expect(o.y + dy).toBeLessThan(24);
          const k = `${o.x + dx},${o.y + dy}`; expect(belegt.has(k)).toBe(false); belegt.add(k);
        }
      }
    }
  });
  it('A17: Ein Besuch verändert den eigenen Spielstand nicht', () => {
    const sp = new Spiel(neuerSpielstand(0), () => 0);
    const vorher = JSON.stringify(sp.stand);
    nachbardoerfer();
    expect(JSON.stringify(sp.stand)).toBe(vorher);
    expect(sp.moegen('Testdorf')).toBe(true);
    expect(sp.moegen('Testdorf')).toBe(false);
    expect(sp.stand.gemocht['Testdorf']).toBe(true);
  });
});
