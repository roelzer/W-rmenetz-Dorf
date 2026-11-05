import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A88 Freischalt-Leiter – Architekturregel (Bauplan docs/bauplaene/A88-freischalt-leiter.md, AE-A88-1):
 * Ob etwas freigeschaltet ist, entscheidet genau eine Stelle im Kern (src/core/freischaltung.ts).
 * Oberfläche, Darstellung und Steuerung fragen nur `freigeschaltet()` / `sperrgrund()` ab und rechnen nie selbst.
 * Seit Simons F3 (2026-11-05) gilt die Leiter für alle Spielstände: kein Merker `freischalt_leiter`, kein Schalter im Produktivcode.
 * Die Tabelle wird nur in freischaltung.ts gelesen, damit Tests mit den Stufen von vor A88 das Modul per vi.mock tauschen können
 * (tests/ohne-leiter.ts, Bauplan Abschnitt 11) – ein direkter Tabellenzugriff in spiel.ts würde daran vorbeilaufen.
 * Die Regeln greifen, sobald src/core/freischaltung.ts existiert. Liest nur Dateien, führt keinen Spielcode aus.
 */

function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : p.endsWith('.ts') ? [p] : [];
  });
}
const ohneKommentare = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const KERN_MODUL = 'src/core/freischaltung.ts';
const gebaut = existsSync(KERN_MODUL);

describe('A88 Freischaltung: eine Regel im Kern, die Oberfläche fragt nur ab', { timeout: 30000 }, () => {
  if (!gebaut) {
    it('A88 ist noch nicht gebaut – die Regeln greifen, sobald src/core/freischaltung.ts existiert', () => {
      expect(existsSync('src/core')).toBe(true);
    });
    return;
  }

  const ausserhalbKern = dateien('src').filter((f) => !f.startsWith(join('src', 'core')));
  const alle = dateien('src');

  it('es gibt Dateien außerhalb des Kerns', () => expect(ausserhalbKern.length).toBeGreaterThan(3));

  for (const f of ausserhalbKern) {
    const text = ohneKommentare(readFileSync(f, 'utf8'));
    it(`${f} liest die Freischalt-Tabelle nicht selbst`, () => {
      expect(text).not.toMatch(/\b(FREISCHALTUNGEN|ab_stufe|alt_ab_stufe|min_hz_stufe)\b/);
    });
    it(`${f} leitet aus der Stückzahl-Grenze keine Freischaltung ab`, () => {
      // grenze(t) > 0, grenze(t) === 0, !sp.grenze(t), grenze === 0 – das war die alte, doppelte Sperrlogik
      expect(text).not.toMatch(/\bgrenze\([^)]*\)\s*(>|===?|!==?)\s*0\b/);
      expect(text).not.toMatch(/!\s*[\w.]*\bgrenze\(/);
      expect(text).not.toMatch(/\bgrenze\s*===?\s*0\b/);
    });
    it(`${f} vergleicht die Heizzentralen-Stufe nicht mit einer festen Zahl`, () => {
      expect(text).not.toMatch(/\bhzStufe\s*(<|>|<=|>=)\s*\d/);
      expect(text).not.toMatch(/\d\s*(<|>|<=|>=)\s*[\w.]*\bhzStufe\b/);
    });
  }

  for (const f of alle) {
    const text = ohneKommentare(readFileSync(f, 'utf8'));
    it(`${f} nutzt keine abgelösten Stufen-Felder (min_hz_stufe, baugebiet_hz_stufe)`, () => {
      expect(text).not.toMatch(/\b(min_hz_stufe|baugebiet_hz_stufe)\b/);
    });
    it(`${f} kennt keinen Merker freischalt_leiter (F3: alle Spielstände bekommen die Leiter)`, () => {
      expect(text).not.toMatch(/\bfreischalt_leiter\b/);
    });
  }

  it('die Freischalt-Tabelle wird nur in src/core/freischaltung.ts gelesen (auch nicht in spiel.ts)', () => {
    const mitZugriff = alle.filter((f) => /\bFREISCHALTUNGEN\b/.test(ohneKommentare(readFileSync(f, 'utf8'))));
    expect(mitZugriff).toEqual([KERN_MODUL]);
  });

  it('die Freischalt-Tabelle steht nur in src/core/freischaltung.ts', () => {
    const mitTabelle = alle.filter((f) => /\bFREISCHALTUNGEN\s*[:=]/.test(ohneKommentare(readFileSync(f, 'utf8'))));
    expect(mitTabelle).toEqual([KERN_MODUL]);
  });
});
