import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// NR18 (Bauplan docs/bauplaene/NR18-ohne-autoanschluss.md, AE-NR18-2; übernimmt NR17): Die zu dünne Leitung wird an genau
// einer Stelle gefunden (src/core/engstelle.ts, rein, ohne Spielstand), nur der Spielkern ruft sie auf; Oberfläche und
// Darstellung rechnen keine eigene Probe-Netzrechnung. Die Regeln lesen Dateien, sie führen keinen Code aus.

const DATEI = 'src/core/engstelle.ts';
const ohneKommentare = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : p.endsWith('.ts') ? [p] : [];
  });
}

// NR18 R4 (AE-NR18-3): Jede Probe-Rechnung „wie nach dem Bau“ läuft durch genau eine Methode (probeNetz), die geplante
// Leitungen und geplante Ersatz-Leitungen einrechnet. Eine dritte Netzrechnung in spiel.ts würde den Ersatz vergessen.
// Gilt sofort (heute: neuBerechnen und die Probe der alten Wegsuche).
describe('NR18 Probe-Netz an einer Stelle', { timeout: 30000 }, () => {
  it('NR18 R4: src/core/spiel.ts ruft berechneNetz an höchstens zwei Stellen auf (neuBerechnen, probeNetz)', () => {
    const treffer = ohneKommentare(readFileSync('src/core/spiel.ts', 'utf8')).match(/\bberechneNetz\s*\(/g) ?? [];
    expect(treffer.length).toBeLessThanOrEqual(2);
  });
});

describe('NR18 Engstelle: eine Abfrage im Kern, Oberfläche fragt nur ab', { timeout: 30000 }, () => {
  if (!existsSync(DATEI)) {
    it('NR18 ist noch nicht gebaut – die Regeln greifen, sobald src/core/engstelle.ts existiert', () => expect(existsSync(DATEI)).toBe(false));
    return;
  }
  const text = ohneKommentare(readFileSync(DATEI, 'utf8'));

  it('NR18 R1: engstelle.ts importiert nur katalog und typen (kein Spielstand, kein spiel.ts, kein Kreis)', () => {
    const importe = [...text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    expect(importe.filter((i) => !['./katalog', './typen'].includes(i))).toEqual([]);
  });

  it('NR18 R2: engstellenFinden wird außerhalb von engstelle.ts nur in src/core/spiel.ts aufgerufen', () => {
    const rufer = dateien('src').filter((f) => f.replace(/\\/g, '/') !== DATEI && /\bengstellenFinden\s*\(/.test(ohneKommentare(readFileSync(f, 'utf8'))));
    expect(rufer.map((f) => f.replace(/\\/g, '/'))).toEqual(rufer.length ? ['src/core/spiel.ts'] : []);
  });

  it('NR18 R3: Oberfläche und Darstellung rechnen kein Netz selbst (kein berechneNetz außerhalb von src/core)', () => {
    const fremd = dateien('src').filter((f) => !f.replace(/\\/g, '/').startsWith('src/core/') && /\bberechneNetz\b/.test(ohneKommentare(readFileSync(f, 'utf8'))));
    expect(fremd).toEqual([]);
  });
});
