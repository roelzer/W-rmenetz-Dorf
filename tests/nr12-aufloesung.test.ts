import { describe, expect, it } from 'vitest';
import { MAX_FAKTOR, MAX_PIXEL, SPAR_FAKTOR, zeichenAufloesung } from '../src/render/aufloesung';

// NR12 / A90 Paket P1 (Bauplan docs/bauplaene/NR12-fluessig.md, „Regeln für zeichenAufloesung“, Zielwert Z7).
// Erwartete Werte von Hand gerechnet (Herleitung je Fall im Kommentar).

describe('NR12 P1 Auflösung: zeichenAufloesung', () => {
  it('NR12 P1: Grenzwerte wie im Bauplan (Faktor 2, 1,5 MP, Sparmodus 1,25)', () => {
    expect([MAX_FAKTOR, MAX_PIXEL, SPAR_FAKTOR]).toEqual([2, 1_500_000, 1.25]);
  });

  it('NR12 P1: Handy 844×390 Faktor 3 → Faktor 2, 1688×780', () => {
    // min(3, 2) = 2; 844·390·4 = 1 316 640 ≤ 1 500 000 → Faktor bleibt 2
    expect(zeichenAufloesung(844, 390, 3, false)).toEqual({ faktor: 2, breite_px: 1688, hoehe_px: 780 });
  });

  it('NR12 P1: Laptop 1920×1000 Faktor 2 → Faktor 1, 1920×1000', () => {
    // 1920·1000·4 = 7,68 MP > 1,5 MP → √(1,5/1,92) = 0,88 → nie unter 1 → 1
    expect(zeichenAufloesung(1920, 1000, 2, false)).toEqual({ faktor: 1, breite_px: 1920, hoehe_px: 1000 });
  });

  it('NR12 P1: Sparmodus 844×390 Faktor 3 → Faktor 1,25, 1055×488', () => {
    // 844·1,25 = 1055; 390·1,25 = 487,5 → 488; 1055·488 = 514 840 ≤ 0,55 MP (Z7)
    expect(zeichenAufloesung(844, 390, 3, true)).toEqual({ faktor: 1.25, breite_px: 1055, hoehe_px: 488 });
  });

  it('NR12 P1: dpr 0/undefined → Faktor 1', () => {
    expect(zeichenAufloesung(844, 390, 0, false)).toEqual({ faktor: 1, breite_px: 844, hoehe_px: 390 });
    expect(zeichenAufloesung(844, 390, undefined as unknown as number, false)).toEqual({ faktor: 1, breite_px: 844, hoehe_px: 390 });
    expect(zeichenAufloesung(844, 390, Number.NaN, false)).toEqual({ faktor: 1, breite_px: 844, hoehe_px: 390 });
    expect(zeichenAufloesung(844, 390, -2, false)).toEqual({ faktor: 1, breite_px: 844, hoehe_px: 390 });
  });

  it('NR12 P1: Pixel-Obergrenze greift zwischen Faktor 1 und 2 (Tablet 1280×800 Faktor 2)', () => {
    // 1280·800·4 = 4,096 MP > 1,5 MP → f = √(1 500 000 / 1 024 000) = √1,46484375 ≈ 1,21031
    // 1280·1,21031 = 1549,2 → 1549; 800·1,21031 = 968,2 → 968
    const a = zeichenAufloesung(1280, 800, 2, false);
    expect(a.faktor).toBeCloseTo(1.21031, 4);
    expect([a.breite_px, a.hoehe_px]).toEqual([1549, 968]);
  });

  it('NR12 P1: genau auf der Pixel-Obergrenze bleibt der Faktor (Grenze ist „größer als“)', () => {
    // 750·500·4 = 1 500 000 = MAX_PIXEL → nicht darüber → Faktor 2
    expect(zeichenAufloesung(750, 500, 2, false)).toEqual({ faktor: 2, breite_px: 1500, hoehe_px: 1000 });
    // 751·500·4 = 1 502 000 > MAX_PIXEL → Faktor knapp unter 2
    expect(zeichenAufloesung(751, 500, 2, false).faktor).toBeLessThan(2);
  });

  it('NR12 P1: kleiner Faktor bleibt, Sparmodus hebt nie an', () => {
    expect(zeichenAufloesung(844, 390, 1.5, false)).toEqual({ faktor: 1.5, breite_px: 1266, hoehe_px: 585 });
    expect(zeichenAufloesung(844, 390, 1, true)).toEqual({ faktor: 1, breite_px: 844, hoehe_px: 390 });
  });

  it('NR12 P1: Fläche 0 (Leinwand noch nicht im Layout) → 0×0 ohne Fehler', () => {
    expect(zeichenAufloesung(0, 0, 3, false)).toEqual({ faktor: 2, breite_px: 0, hoehe_px: 0 });
  });

  it('NR12 P1: riesiger Bildschirm (7680×4320 Faktor 1) → nie unter 1', () => {
    expect(zeichenAufloesung(7680, 4320, 1, false)).toEqual({ faktor: 1, breite_px: 7680, hoehe_px: 4320 });
  });
});
