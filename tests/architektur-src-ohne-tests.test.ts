import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// A91 (Bauplan NR15 Fassung 3, Abschnitt 8): Spielcode importiert nichts aus tests/ – damit die eingefrorene alte Netzrechnung
// tests/hilfen/netz-alt-a91.ts und andere Test-Hilfen nie ins Spiel geraten.

const WURZEL = resolve('.');
const TESTS = resolve('tests');

function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : /\.(ts|tsx|js|mjs)$/.test(p) ? [p] : [];
  });
}

/** Alle Import-Ziele einer Quelldatei (statisch, dynamisch, Re-Export, Seiteneffekt-Import), die in tests/ landen. */
function importeAusTests(datei: string, text: string): string[] {
  const ohneKommentare = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const muster = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g;
  const treffer: string[] = [];
  for (const m of ohneKommentare.matchAll(muster)) {
    const ziel = m[1];
    const pfad = ziel.startsWith('.') ? resolve(dirname(datei), ziel) : resolve(WURZEL, ziel.replace(/^\/+/, ''));
    if (pfad === TESTS || pfad.startsWith(TESTS + sep) || /(^|\/)tests\//.test(ziel)) treffer.push(ziel);
  }
  return treffer;
}

describe('A91 Spielcode importiert nichts aus tests/', () => {
  const quellen = dateien('src');
  it('A91: es gibt Quelldateien unter src/', () => expect(quellen.length).toBeGreaterThan(10));
  it('A91: test_a91_src_importiert_nichts_aus_tests', () => {
    const befunde = quellen.flatMap((f) => importeAusTests(resolve(f), readFileSync(f, 'utf8')).map((z) => `${relative(WURZEL, f)} → ${z}`));
    expect(befunde).toEqual([]);
  });
  it('A91: Selbstprobe – die Prüfung erkennt Importe aus tests/ und lässt normale Importe durch', () => {
    const f = resolve('src/core/beispiel.ts');
    expect(importeAusTests(f, "import { berechneNetzAlt } from '../../tests/hilfen/netz-alt-a91';")).toEqual(['../../tests/hilfen/netz-alt-a91']);
    expect(importeAusTests(f, "export { x } from \"../../tests/hilfen\";")).toEqual(['../../tests/hilfen']);
    expect(importeAusTests(f, "const m = await import('../../tests/hilfen/a91-netze');")).toEqual(['../../tests/hilfen/a91-netze']);
    expect(importeAusTests(f, "import '../../tests/x';")).toEqual(['../../tests/x']);
    expect(importeAusTests(f, "import { KATALOG } from './katalog';\nimport type { Netz } from './typen';\nimport { a } from '../ui/tests-anzeige';")).toEqual([]);
    expect(importeAusTests(f, "// import { a } from '../../tests/hilfen';")).toEqual([]);
  });
});
