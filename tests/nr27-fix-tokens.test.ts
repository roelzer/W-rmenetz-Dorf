import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import tokens from '../design/tokens.json';

// NR27 Fix-Runde W1/M5 (docs/pruefberichte/20261123-designer-treue-nr27.md): Bahnfarben und -maße gehören nach design/tokens.json
// (`farbe.bahn`, `karte.bahn`) statt fest in src/render/bahn.ts. Erwartete Werte von Hand aus docs/DESIGN.md 14.9 abgeschrieben
// (Stand 2026-11-23); sie stimmen mit den heutigen Werten in src/render/bahn.ts überein (gelesen, keine Abweichung).

type Bahn = { farbe: Record<string, string>; karte: Record<string, number | number[]> };
const t = tokens as unknown as { farbe: { bahn?: Bahn['farbe'] }; karte: { bahn?: Bahn['karte'] } };

const FARBEN: Record<string, string> = {
  schotter: '#8f887d', schiene: '#333b41', zaun: '#55605b', bruecke: '#7d858a', mast: '#3f4549',
  fahrdraht: 'rgba(47,58,64,.60)', zug_kasten: '#f3eee3', grube_wand: '#8a6a4e', bohrgeraet: '#f0a53a', bohrlinie: '#4a2c14',
  schutzrohr: '#2f3a40', merkpfahl: '#f4f1ea', nord_dunst: 'rgba(236,242,245,.55)', gesperrt_schleier: 'rgba(31,42,46,.12)',
  bake_rot: '#d23a2c',
};
const MASSE: Record<string, number | number[]> = {
  gleisabstand: 0.44, spurweite: 0.144, schwellen_teilung: 0.25, mast_teilung: 3, mast_versatz: 2, mast_hoehe: 0.62,
  fahrdraht_hoehe: 0.5, zug_feld_je_s: 3, zug_pause_s: [90, 150], detail_ab_kachelbreite: 32,
};

describe('NR27 Fix M5/W1 – Bahn-Tokens', () => {
  // Fehler, der ihn rot macht: Gruppe fehlt, ein Token fehlt oder hat einen anderen Wert als DESIGN 14.9.
  for (const [name, wert] of Object.entries(FARBEN)) {
    it(`test_nr27_fix_m5_token_farbe_bahn_${name}`, () => {
      expect(t.farbe.bahn?.[name]).toBe(wert);
    });
  }
  for (const [name, wert] of Object.entries(MASSE)) {
    it(`test_nr27_fix_m5_token_karte_bahn_${name}`, () => {
      expect(t.karte.bahn?.[name]).toEqual(wert);
    });
  }

  // Fehler: in src/render/bahn.ts steht weiter eine Farbe als Literal (Hex oder rgba) – dann wirkt eine Token-Änderung nicht.
  // Reine Textsuche über die ganze Datei, auch Kommentare, ohne Ausnahme (Auftrag Projektleiter).
  it('test_nr27_fix_m5_bahn_ts_ohne_farbliterale', () => {
    const quelle = readFileSync(new URL('../src/render/bahn.ts', import.meta.url), 'utf8');
    const hex = quelle.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    const rgba = quelle.match(/rgba\(/g) ?? [];
    expect(hex, 'Hex-Literale').toEqual([]);
    expect(rgba.length, 'rgba(-Literale').toBe(0);
  });
});
