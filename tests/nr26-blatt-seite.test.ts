// NR26 (Simon 2026-11-11): Am Laptop sitzt das Bauen-/Leitungsfenster mitten auf der Karte – es soll an die Seite.
// Entscheidung: Blätter erscheinen in jedem Querformat (Handy und Laptop) als Seitenfläche rechts; Popups bleiben mittig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');

/** Alle @media-Blöcke mit ihrer Bedingung und ihrem Inhalt (eine Klammerebene tief) */
function mediaBloecke(text: string): { bedingung: string; inhalt: string }[] {
  const out: { bedingung: string; inhalt: string }[] = [];
  const re = /@media([^{]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let tiefe = 1, i = re.lastIndex;
    while (i < text.length && tiefe > 0) { if (text[i] === '{') tiefe++; else if (text[i] === '}') tiefe--; i++; }
    out.push({ bedingung: m[1].replace(/\s+/g, ''), inhalt: text.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  return out;
}

const querformatOhneHoehe = mediaBloecke(css).filter((b) => b.bedingung === '(orientation:landscape)');

describe('NR26 – Blatt als Seitenfläche auch am Laptop', () => {
  it('test_nr26_querformat_block_ohne_hoehengrenze_vorhanden', () => {
    expect(querformatOhneHoehe.length).toBeGreaterThan(0);
  });

  it('test_nr26_ebene_rechts_ausgerichtet_in_jedem_querformat', () => {
    const inhalt = querformatOhneHoehe.map((b) => b.inhalt).join('\n');
    expect(inhalt).toMatch(/#ebene\{align-items:flex-end;justify-content:stretch;padding:0\}/);
    expect(inhalt).toMatch(/#ebene\.mitte\{align-items:center;justify-content:center\}/);
    expect(inhalt).toMatch(/#ebene>\.blatt\{align-self:flex-end\}/);
  });

  it('test_nr26_blatt_volle_hoehe_seitlich_popup_mittig', () => {
    const inhalt = querformatOhneHoehe.map((b) => b.inhalt).join('\n');
    expect(inhalt).toMatch(/\.blatt\{width:min\(46%,400px\);max-width:none;height:100%;max-height:100%;margin:0;/);
    expect(inhalt).toMatch(/\.blatt\.popup\{width:min\(92%,640px\);height:auto;max-height:94%;/);
  });

  it('test_nr26_laptop_regel_schiebt_blatt_nicht_mehr_nach_unten', () => {
    // Die Laptop-Regel (min-width:700px, min-height:601px) darf dem Blatt keinen unteren Rand mehr geben,
    // sonst reicht die Seitenfläche nicht bis an den Bildschirmrand.
    const laptop = mediaBloecke(css).filter((b) => b.bedingung === '(min-width:700px)and(min-height:601px)');
    expect(laptop.length).toBe(1);
    expect(laptop[0].inhalt).not.toMatch(/\.blatt\{[^}]*margin-bottom/);
  });
});
