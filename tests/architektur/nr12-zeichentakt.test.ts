import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * NR12 / A90 „Flüssig“ – Architekturregeln (Bauplan docs/bauplaene/NR12-fluessig.md, AE-NR12-1 … AE-NR12-5).
 * Liest nur Dateien, führt keinen Spielcode aus.
 * Regeln 1–3 gelten sofort (sie halten den heutigen Stand fest). Regeln 4–6 greifen, sobald src/render/takt.ts existiert (Paket P1),
 * Regeln 7–8, sobald src/render/ebenen.ts existiert (Paket P3).
 */

function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : p.endsWith('.ts') ? [p] : [];
  });
}
const ohneKommentare = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const lies = (f: string): string => ohneKommentare(readFileSync(f, 'utf8'));
const pfad = (f: string): string => f.replace(/\\/g, '/');
const alle = dateien('src').map(pfad);

/** Rumpf einer Funktion (ab `function name(` bis zur passenden schließenden Klammer). */
function rumpf(text: string, name: string): string | null {
  const start = text.search(new RegExp(`function\\s+${name}\\s*\\(`));
  if (start < 0) return null;
  const auf = text.indexOf('{', text.indexOf(')', start));
  let tiefe = 0;
  for (let i = auf; i < text.length; i++) {
    if (text[i] === '{') tiefe++;
    else if (text[i] === '}' && --tiefe === 0) return text.slice(auf, i + 1);
  }
  return null;
}

describe('NR12 Zeichentakt: Regeln, die ab sofort gelten', { timeout: 30000 }, () => {
  it('NR12 R1: Nur src/main.ts hat eine dauerhafte Bildschleife (requestAnimationFrame mit benannter Funktion)', () => {
    const verstoesse = alle.filter((f) => f !== 'src/main.ts' && /requestAnimationFrame\(\s*[A-Za-z_$][\w$]*\s*\)/.test(lies(f)));
    expect(verstoesse).toEqual([]);
  });
  it('NR12 R2: Kein Canvas-Weichzeichner (shadowBlur, ctx.filter) in der Spielgrafik', () => {
    const verstoesse = alle.filter((f) => f.startsWith('src/render/') && /\bshadowBlur\b|\.filter\s*=(?!=)/.test(lies(f)));
    expect(verstoesse).toEqual([]);
  });
  it('NR12 R3: Kein Dauer-Timer schneller als 1 s (setInterval mit < 1000 ms)', () => {
    const verstoesse: string[] = [];
    for (const f of alle) for (const m of lies(f).matchAll(/setInterval\([^;]*?,\s*([\d_]+)\s*\)/g)) if (Number(m[1].replace(/_/g, '')) < 1000) verstoesse.push(`${f}: ${m[0]}`);
    expect(verstoesse).toEqual([]);
  });
});

const TAKT = 'src/render/takt.ts';
describe('NR12 Zeichentakt: Regeln ab Paket P1 (src/render/takt.ts)', { timeout: 30000 }, () => {
  if (!existsSync(TAKT)) {
    it('NR12 P1 ist noch nicht gebaut – die Regeln greifen, sobald src/render/takt.ts existiert', () => expect(existsSync('src/render')).toBe(true));
    return;
  }
  for (const f of [TAKT, 'src/render/aufloesung.ts']) {
    it(`NR12 R4: ${f} ist rein (ohne Browser, ohne Oberfläche, ohne Spielkern) und damit in Node testbar`, () => {
      expect(existsSync(f)).toBe(true);
      const t = lies(f);
      expect(t).not.toMatch(/\b(document|window|requestAnimationFrame|performance|localStorage|matchMedia|navigator)\b/);
      expect(t).not.toMatch(/from\s+['"]\.\.\/(ui|steuerung|core\/spiel)/);
    });
  }
  it('NR12 R5: devicePixelRatio wird nur an einer Stelle für die Karte gelesen (main.ts → zeichenAufloesung)', () => {
    const erlaubt = new Set(['src/main.ts', 'src/ui/bild.ts']); // bild.ts: einmaliges Figurenbild, keine Bildschleife
    expect(alle.filter((f) => !erlaubt.has(f) && /devicePixelRatio/.test(lies(f)))).toEqual([]);
    const main = lies('src/main.ts');
    expect((main.match(/devicePixelRatio/g) ?? []).length).toBe(1);
    expect(main).toMatch(/zeichenAufloesung\(/);
    expect(main).not.toMatch(/Math\.min\(\s*2\s*,\s*window\.devicePixelRatio/);
  });
  it('NR12 R6: main.ts zeichnet nur, wenn der Takt es erlaubt (sollZeichnen aus render/takt)', () => {
    const main = lies('src/main.ts');
    expect(main).toMatch(/from\s+['"]\.\/render\/takt['"]/);
    expect(main).toMatch(/sollZeichnen\(/);
  });
});

const EBENEN = 'src/render/ebenen.ts';
describe('NR12 Ruhende Ebene: Regeln ab Paket P3 (src/render/ebenen.ts)', { timeout: 30000 }, () => {
  if (!existsSync(EBENEN)) {
    it('NR12 P3 ist noch nicht gebaut – die Regeln greifen, sobald src/render/ebenen.ts existiert', () => expect(existsSync('src/render')).toBe(true));
    return;
  }
  it('NR12 R7: ebenen.ts erzeugt Zeichenflächen nur über die übergebene Fabrik (testbar ohne Browser)', () => {
    expect(lies(EBENEN)).not.toMatch(/\bdocument\b|\bwindow\b|new\s+OffscreenCanvas/);
  });
  it('NR12 R8: Die ruhende Ebene hängt nicht von der Zeit ab (kein zeit_s / jetzt_ms in zeichneRuhend)', () => {
    const r = rumpf(lies('src/render/szene.ts'), 'zeichneRuhend');
    expect(r, 'src/render/szene.ts braucht eine Funktion zeichneRuhend').not.toBeNull();
    expect(r).not.toMatch(/zeit_s|jetzt_ms|Date\.now|performance/);
  });
});
