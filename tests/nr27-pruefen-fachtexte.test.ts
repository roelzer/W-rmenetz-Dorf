import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// NR27 Tester-Modus „pruefen“ (2026-11-23), Schwerpunkt 5: Fachtexte (WISSEN_A/B, KARTE_1–4, TUTORIAL_1; AE-NR27-13,
// Lastenheft NR27 (d) „fachlich geprüft … bestätigt durch Simon“) erscheinen ohne Freigabe nirgends.
// Welche Fehler machen diese Tests rot?
// - Ein Fachsatz wird irgendwo im Spiel (Katalog, Blatt, Sprecher, Tutorial, Karte, index.html, Bilder) als fester Text
//   wiederholt und umgeht so den Schalter.
// - Jeder Aufruf nordText(Fach-ID) liefert ohne Freigabe etwas anderes als null.
// - Schalter steht auf true, ohne dass Simons Freigabe „NR27-Fachtexte“ eingetragen ist.

import { NORD_FACHTEXTE_FREIGEGEBEN, NORD_TEXTE, nordText, type NordTextId } from '../src/core/nord-texte';

const WURZEL = new URL('..', import.meta.url).pathname;
function dateien(ordner: string): string[] {
  if (!existsSync(ordner)) return [];
  return readdirSync(ordner).flatMap((n) => {
    const p = join(ordner, n);
    return statSync(p).isDirectory() ? dateien(p) : [p];
  });
}
const FACH = (Object.keys(NORD_TEXTE) as NordTextId[]).filter((id) => NORD_TEXTE[id].fach);

describe('NR27 pruefen: Fachtexte ohne Freigabe', () => {
  it('test_nr27_d_fachsaetze_nur_in_der_tabelle: kein Fachsatz (auch kein Satzteil ≥ 30 Zeichen) außerhalb von nord-texte.ts', () => {
    expect(FACH.sort()).toEqual(['KARTE_1', 'KARTE_2', 'KARTE_3', 'KARTE_4', 'TUTORIAL_1', 'WISSEN_A', 'WISSEN_B']);
    const pruefen = [...dateien(join(WURZEL, 'src')), ...dateien(join(WURZEL, 'public')), join(WURZEL, 'index.html'),
      ...dateien(join(WURZEL, 'design')).filter((p) => p.endsWith('.svg'))]
      .filter((p) => existsSync(p) && !p.endsWith('nord-texte.ts') && /\.(ts|css|html|svg|json)$/.test(p));
    const teile = FACH.flatMap((id) => NORD_TEXTE[id].text.split(/(?<=[.–])\s+/).filter((s) => s.length >= 30).map((s) => [id, s] as const));
    expect(teile.length).toBeGreaterThanOrEqual(FACH.length);
    const funde: string[] = [];
    for (const p of pruefen) {
      const inhalt = readFileSync(p, 'utf8');
      for (const [id, s] of teile) if (inhalt.includes(s)) funde.push(`${id} in ${p.slice(WURZEL.length)}`);
    }
    expect(funde).toEqual([]);
  });

  it('test_nr27_d_ohne_freigabe_null: jede Fach-ID liefert null, auch mit Platzhalterwerten', () => {
    for (const id of FACH) expect(nordText(id, { preis: '1 €', stufe: 6 }), id).toBeNull();
  });

  it('test_nr27_d_schalter_passt_zur_freigabe: true nur mit Eintrag „NR27-Fachtexte“ von Simon in .claude/freigaben.md', () => {
    const freigaben = readFileSync(join(WURZEL, '.claude/freigaben.md'), 'utf8');
    const eingetragen = freigaben.split('\n').some((z) => z.includes('NR27-Fachtexte') && z.includes('Simon'));
    if (NORD_FACHTEXTE_FREIGEGEBEN) expect(eingetragen).toBe(true);
    else expect(NORD_FACHTEXTE_FREIGEGEBEN).toBe(false);
  });
});
