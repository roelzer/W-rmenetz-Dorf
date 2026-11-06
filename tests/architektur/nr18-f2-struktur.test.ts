import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Bauplan docs/bauplaene/NR18-ohne-autoanschluss.md, Fassung 2. Die Regeln lesen Dateien, sie führen keinen Code aus.
// F1 (AE-NR13-1): Spielstart an genau einer Stelle, start.ts ohne Kreis zu spiel.ts.
// F2 (AE-NR13-2): Das Tutorial-Ereignis „schritt“ erzeugt nur der Kern.
// F3 (AE-NR19-2): „Station reicht?“ an genau einer Stelle (greift, sobald netz.ts stationReicht exportiert).

const ohneKommentare = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const lesen = (f: string): string => ohneKommentare(readFileSync(f, 'utf8'));
const norm = (f: string): string => f.replace(/\\/g, '/');
function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('NR18 Fassung 2: Struktur', { timeout: 30000 }, () => {
  it('F1: neuerSpielstand ist in src genau einmal definiert (spiel.ts oder start.ts); start.ts importiert nicht ./spiel', () => {
    const orte = dateien('src').map(norm).filter((f) => /\bfunction\s+neuerSpielstand\s*\(/.test(lesen(f)));
    expect(orte).toHaveLength(1);
    expect(['src/core/spiel.ts', 'src/core/start.ts']).toContain(orte[0]);
    const importe = existsSync('src/core/start.ts') ? [...lesen('src/core/start.ts').matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1]) : [];
    expect(importe.filter((i) => i === './spiel')).toEqual([]);
  });

  it("F2: Ereignisse { art: 'schritt' } entstehen nur in src/core", () => {
    const fremd = dateien('src').map(norm).filter((f) => !f.startsWith('src/core/') && /art\s*:\s*['"]schritt['"]/.test(lesen(f)));
    expect(fremd).toEqual([]);
  });

  it('F3: außerhalb von netz.ts und katalog.ts vergleicht kein Code leistung_kw mit einem Bedarf (greift ab stationReicht)', () => {
    if (!/export\s+function\s+stationReicht\s*\(/.test(lesen('src/core/netz.ts'))) return;
    const verstoesse: string[] = [];
    for (const f of dateien('src').map(norm)) {
      if (f === 'src/core/netz.ts' || f === 'src/core/katalog.ts') continue;
      lesen(f).split('\n').forEach((zeile, i) => {
        for (const m of zeile.matchAll(/([\w.()]+)\s*(<=|>=|<|>)\s*([\w.()]+)/g)) {
          const links = m[1].includes('leistung_kw'), rechts = m[3].includes('leistung_kw');
          if (links !== rechts) verstoesse.push(`${f}:${i + 1}: ${m[0]}`);
        }
      });
    }
    expect(verstoesse).toEqual([]);
  });
});
