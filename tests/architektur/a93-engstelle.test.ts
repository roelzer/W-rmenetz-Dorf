import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// NR17/A93 (Bauplan docs/bauplaene/NR17-engstelle.md, AE-A93-1/2): Die Engstelle wird an genau einer Stelle gefunden
// (src/core/engstelle.ts, rein, ohne Spielstand), nur der Spielkern ruft sie auf; Oberfläche und Darstellung rechnen
// keine eigene Probe-Netzrechnung. Die Regeln lesen Dateien, sie führen keinen Code aus.

const DATEI = 'src/core/engstelle.ts';
const ohneKommentare = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('A93 Engstelle: eine Abfrage im Kern, Oberfläche fragt nur ab', { timeout: 30000 }, () => {
  if (!existsSync(DATEI)) {
    it('A93 ist noch nicht gebaut – die Regeln greifen, sobald src/core/engstelle.ts existiert', () => expect(existsSync(DATEI)).toBe(false));
    return;
  }
  const text = ohneKommentare(readFileSync(DATEI, 'utf8'));

  it('A93 R1: engstelle.ts importiert nur katalog und typen (kein Spielstand, kein spiel.ts, kein Kreis)', () => {
    const importe = [...text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    expect(importe.filter((i) => !['./katalog', './typen'].includes(i))).toEqual([]);
  });

  it('A93 R2: engstelleFinden wird außerhalb von engstelle.ts nur in src/core/spiel.ts aufgerufen', () => {
    const rufer = dateien('src').filter((f) => f.replace(/\\/g, '/') !== DATEI && /\bengstelleFinden\s*\(/.test(ohneKommentare(readFileSync(f, 'utf8'))));
    expect(rufer.map((f) => f.replace(/\\/g, '/'))).toEqual(rufer.length ? ['src/core/spiel.ts'] : []);
  });

  it('A93 R3: Oberfläche und Darstellung rechnen kein Netz selbst (kein berechneNetz außerhalb von src/core)', () => {
    const fremd = dateien('src').filter((f) => !f.replace(/\\/g, '/').startsWith('src/core/') && /\bberechneNetz\b/.test(ohneKommentare(readFileSync(f, 'utf8'))));
    expect(fremd).toEqual([]);
  });
});
