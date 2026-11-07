import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// Bauplan docs/bauplaene/NR20-22.md, Abschnitt 4 (AE-NR20-1 … AE-NR22-3). Die Regeln lesen Dateien, sie führen keinen Code aus.
// Regeln, die erst mit einem Paket gelten, greifen ab einem Merkmal im Quelltext („greift ab …“) – vorher sind sie grün.
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

describe('NR20–NR22: Struktur', { timeout: 30000 }, () => {
  it('N1 (AE-NR20-1): Tutorial-Geometrie (Spur, Abzweig, erste Häuser) nur im Kern (greift ab TUTORIAL_ABZWEIG und ohne TUTORIAL_SPUR)', () => {
    const start = lesen('src/core/start.ts');
    if (!/export\s+const\s+TUTORIAL_ABZWEIG\b/.test(start) || /export\s+const\s+TUTORIAL_SPUR\b/.test(start)) return;
    const namen = /\b(TUTORIAL_SPUR|TUTORIAL_HAUPT|TUTORIAL_ANSCHLUSS_1|TUTORIAL_ANSCHLUSS_2|TUTORIAL_ABZWEIG|ERSTE_HAEUSER)\b/;
    const fremd = dateien('src').map(norm).filter((f) => !f.startsWith('src/core/') && namen.test(lesen(f)));
    expect(fremd).toEqual([]);
  });

  it('N2 (AE-NR22-1): kein Überlast-Blinken mehr – die festen Rottöne #ff4a3a/#b8221a stehen nirgends in src (greift ab render/ueberlast.ts)', () => {
    if (!existsSync('src/render/ueberlast.ts')) return;
    const fremd = dateien('src').map(norm).filter((f) => /#ff4a3a|#b8221a/i.test(lesen(f)));
    expect(fremd).toEqual([]);
  });

  it('N3 (AE-NR22-2): Warngelb und leichter Schleier nur über die Tokens, nicht fest im Code (greift ab render/ueberlast.ts)', () => {
    if (!existsSync('src/render/ueberlast.ts')) return;
    const fremd = dateien('src').map(norm)
      .filter((f) => f !== 'src/ui/tokens.ts' && /#ffc531|rgba\(\s*28\s*,\s*14\s*,\s*4\s*,\s*0?\.3\d*\s*\)/i.test(lesen(f)));
    expect(fremd).toEqual([]);
  });

  it('N4 (AE-NR21-1): Tutorial-Netzprüfung ohne Kreis – tutorial-netz.ts importiert nur Katalog/Typen/Vertrag/Start/Netz, genutzt nur von spiel.ts (greift ab der Datei)', () => {
    const f = 'src/core/tutorial-netz.ts';
    if (!existsSync(f)) return;
    // Fassung 2 (Kritiker B2): ./netz ist erlaubt, damit „Leitungsende“ eine Regel bleibt (leitungsNachbarn). Kein Kreis,
    // solange netz.ts weder tutorial-netz noch spiel importiert – das prüft die zweite Erwartung.
    const erlaubt = ['./katalog', './typen', './tutorial-vertrag', './start', './netz'];
    expect(importe('src/core/netz.ts').filter((i) => /(^|\/)(tutorial-netz|spiel)$/.test(i))).toEqual([]);
    expect(importe(f).filter((i) => !erlaubt.includes(i))).toEqual([]);
    const nutzer = dateien('src').map(norm)
      .filter((d) => d !== f && importe(d).some((i) => /(^|\/)tutorial-netz$/.test(i)) && !/import\s+type\s[^;]*tutorial-netz/.test(lesen(d)));
    expect(nutzer.filter((d) => d !== 'src/core/spiel.ts')).toEqual([]);
  });

  it('N5 (AE-NR22-3): Überlastete Stücke findet nur der Kern – engstellenFinden außerhalb von src/core nicht verwendet', () => {
    const fremd = dateien('src').map(norm).filter((f) => !f.startsWith('src/core/') && /\bengstellenFinden\b/.test(lesen(f)));
    expect(fremd).toEqual([]);
  });

  it('N6 (AE-NR22-4): Die Dreieck-Regel (Feld 0, 8, 16 …) steht nur in render/ueberlast.ts (greift ab der Datei)', () => {
    if (!existsSync('src/render/ueberlast.ts')) return;
    const fremd = dateien('src').map(norm)
      .filter((f) => f !== 'src/render/ueberlast.ts' && f !== 'src/ui/tokens.ts' && /\bwiederholen_felder\b|\babstand_ende_min\b/.test(lesen(f)));
    expect(fremd).toEqual([]);
  });
});
