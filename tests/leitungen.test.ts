import { describe, expect, it } from 'vitest';
import { istLeitung, KATALOG, LEITUNGEN, LEITUNGSRANG } from '../src/core/katalog';

/** Leitungsdurchmesser und Farben nach Simons Vorgabe (2026-11-04). */
const FARBEN: Record<number, string> = {
  25: '#d8392f', // rot
  32: '#4caf3e', // grün
  40: '#6ec6ff', // hellblau
  50: '#1f4fa8', // dunkelblau
  63: '#e86aa0', // pink
  75: '#f6c22c', // gelb
  90: '#8a5a2b', // braun
  110: '#1f6b3a', // dunkelgrün
  125: '#8455bb',
  140: '#007e81',
  160: '#db681b',
};

describe('A6 – Leitungen in elf Durchmessern (25er … 160er) mit festen Farben', () => {
  it('A6: Es gibt genau die Durchmesser 25 bis 160 mm', () => {
    expect(LEITUNGEN.map((t) => KATALOG[t].durchmesser_mm)).toEqual([25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160]);
    for (const t of LEITUNGEN) expect(istLeitung(t)).toBe(true);
  });
  it('A6: Jeder Durchmesser hat die vorgegebene Farbe, alle Farben sind verschieden', () => {
    for (const t of LEITUNGEN) expect(KATALOG[t].farbe).toBe(FARBEN[KATALOG[t].durchmesser_mm as number]);
    expect(new Set(LEITUNGEN.map((t) => KATALOG[t].farbe)).size).toBe(11);
  });
  it('A6: Je dicker die Leitung, desto mehr Leistung, Rang und Preis – und desto breiter gezeichnet', () => {
    for (let i = 1; i < LEITUNGEN.length; i++) {
      const a = KATALOG[LEITUNGEN[i - 1]], b = KATALOG[LEITUNGEN[i]];
      expect(b.kapazitaet_kw as number).toBeGreaterThan(a.kapazitaet_kw as number);
      expect(b.kosten_eur![0]).toBeGreaterThan(a.kosten_eur![0]);
      expect(b.breite as number).toBeGreaterThan(a.breite as number);
      expect(LEITUNGSRANG[LEITUNGEN[i]]).toBe(LEITUNGSRANG[LEITUNGEN[i - 1]] + 1);
    }
  });
});
