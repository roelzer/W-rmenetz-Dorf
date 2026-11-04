import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('A19 Spiellogik ist von der Darstellung getrennt', () => {
  const kern = dateien('src/core');
  it('es gibt Kerndateien', () => expect(kern.length).toBeGreaterThan(2));
  for (const f of kern) {
    const text = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    it(`${f} nutzt keine Browser-APIs`, () => {
      expect(text).not.toMatch(/\b(document|window|localStorage|sessionStorage|navigator|requestAnimationFrame|HTMLElement|CanvasRenderingContext2D)\b/);
    });
    it(`${f} importiert nichts aus Darstellung oder Oberfläche`, () => {
      expect(text).not.toMatch(/from\s+['"]\.\.\/(render|ui)\//);
    });
    it(`${f} nutzt weder Date.now noch Math.random (Zeit kommt von außen, Zufall nur mit Seed)`, () => {
      expect(text).not.toMatch(/Date\.now\(|new Date\(|Math\.random\(/);
    });
  }
});
