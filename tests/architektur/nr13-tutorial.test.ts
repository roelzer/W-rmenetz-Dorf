import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
// Bauplan docs/bauplaene/NR13-tutorial.md, Abschnitt 3. Die Regeln lesen Dateien, sie führen keinen Code aus.
// U1 (AE-NR13-3): Die Tutorial-Merke im Spielstand schreiben nur spiel.ts, start.ts und speichern.ts. Bewusst breit (jedes
//    `.tutorial =`), darum heißt das Feld in Steuerung `anleitung` (Bauplan F2, Kritiker-Befund 1).
// U2 (AE-NR13-4): Schritt-Kennungen (T01 … T26, T13b) stehen nur im Kern – die Oberfläche entscheidet keinen Schritt.
// U2b (F2): Auch die Kapitelnummer entscheidet außerhalb des Kerns nichts – `.kapitel` liest nur anleiter.ts (Kapitel-Punkte).
// U3 (AE-NR13-4): Kein Kreis: spiel.ts kennt die Schrittlogik nicht; tutorial.ts importiert nur Vertrag, Start, Typen, Katalog.
// U4 (AE-NR13-1 erweitert): Sobald es neuesSpielMitTutorial gibt, ruft außer start.ts niemand neuerSpielstand auf.
// U5 (AE-NR13-5): Tutorial-Bausteine der Oberfläche (anleiter.ts, spotlight.ts) holen aus dem Kern nur den Vertrag.
// U6 (Projektregel): kein HTML aus Zeichenketten, SVG nur per DOMParser.
const ohneKommentare = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const lesen = (f: string): string => ohneKommentare(readFileSync(f, 'utf8'));
const norm = (f: string): string => f.replace(/\\/g, '/');
function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : p.endsWith('.ts') ? [p] : [];
  });
}
const importe = (f: string): string[] => [...lesen(f).matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
const MERKE_SCHREIBER = ['src/core/spiel.ts', 'src/core/start.ts', 'src/core/speichern.ts'];

describe('NR13 Tutorial: Struktur', { timeout: 30000 }, () => {
  it('U1: Zuweisung oder delete an …tutorial (auch Unterfelder) nur in spiel.ts, start.ts, speichern.ts', () => {
    const verstoesse: string[] = [];
    for (const f of dateien('src').map(norm)) {
      if (MERKE_SCHREIBER.includes(f)) continue;
      const q = lesen(f);
      if (/\.tutorial(\.\w+|\[[^\]]+\])*\s*(=(?!=)|\+=|-=|\+\+|--)/.test(q) || /\bdelete\s+[\w.[\]'"]*\.tutorial\b/.test(q)) verstoesse.push(f);
    }
    expect(verstoesse).toEqual([]);
  });

  it('U2: Schritt-Kennungen T01 … T26 / T13b als Zeichenkette nur in src/core', () => {
    const fremd = dateien('src').map(norm).filter((f) => !f.startsWith('src/core/') && /['"`]T\d{2}b?['"`]/.test(lesen(f)));
    expect(fremd).toEqual([]);
  });

  it('U2b: .kapitel nur in src/core und src/ui/anleiter.ts (keine Schrittwahl über die Kapitelnummer)', () => {
    const fremd = dateien('src').map(norm)
      .filter((f) => !f.startsWith('src/core/') && f !== 'src/ui/anleiter.ts' && /\.kapitel\b/.test(lesen(f)));
    expect(fremd).toEqual([]);
  });

  it('U3: spiel.ts importiert ./tutorial nicht; tutorial.ts importiert nur Vertrag, Start, Typen, Katalog (greift ab der Datei)', () => {
    expect(importe('src/core/spiel.ts').filter((i) => i === './tutorial')).toEqual([]);
    if (!existsSync('src/core/tutorial.ts')) return;
    const erlaubt = ['./tutorial-vertrag', './start', './typen', './katalog'];
    expect(importe('src/core/tutorial.ts').filter((i) => !erlaubt.includes(i))).toEqual([]);
  });

  it('U4: neuerSpielstand( wird außerhalb von start.ts nicht aufgerufen (greift ab neuesSpielMitTutorial)', () => {
    if (!/export\s+function\s+neuesSpielMitTutorial\s*\(/.test(lesen('src/core/start.ts'))) return;
    const aufrufer = dateien('src').map(norm).filter((f) => f !== 'src/core/start.ts'
      && /\bneuerSpielstand\s*\(/.test(lesen(f).replace(/function\s+neuerSpielstand\s*\(/g, '')));
    expect(aufrufer).toEqual([]);
  });

  it('U5: anleiter.ts und spotlight.ts importieren aus dem Kern nur tutorial-vertrag (greift ab den Dateien)', () => {
    const verstoesse: string[] = [];
    for (const f of dateien('src/ui').map(norm).filter((x) => ['anleiter.ts', 'spotlight.ts'].includes(basename(x)))) {
      for (const i of importe(f)) if (/(^|\/)core\//.test(i) && !/core\/tutorial-vertrag$/.test(i)) verstoesse.push(`${f}: ${i}`);
    }
    expect(verstoesse).toEqual([]);
  });

  it('U6: kein innerHTML/outerHTML-Schreiben, kein insertAdjacentHTML/document.write, kein createElementNS in src', () => {
    const verstoesse = dateien('src').map(norm)
      .filter((f) => /\b(innerHTML|outerHTML)\s*(=(?!=)|\+=)|insertAdjacentHTML|document\.write\s*\(|createElementNS\s*\(/.test(lesen(f)));
    expect(verstoesse).toEqual([]);
  });
});
