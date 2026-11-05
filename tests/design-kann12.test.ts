import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Designer-Nachprüfung A88 P2 / NR12 P2, Kann-Befund 1 (Bericht docs/pruefberichte/20261105-143528-designer-…):
// Der lange Tipp auf dem Startbildschirm wurde mit Auslassungspunkten abgeschnitten.

const lies = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/** Alle Deklarationen eines CSS-Selektors (auch aus Media-Blöcken), zu einem Text verbunden. */
const regeln = (css: string, selektor: string): string => {
  const esc = selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|[}\\s,])${esc}\\{([^}]*)\\}`, 'gm'))].map((m) => m[1]).join(';');
};

describe('Startbildschirm – Tipp bricht um statt abgeschnitten zu werden (Designer Kann 1)', () => {
  const css = lies('src/ui/stil.css');
  const tipp = regeln(css, '.vs-tipp');

  it('kein Einzeilen-Zwang und keine Auslassungspunkte mehr', () => {
    expect(tipp).not.toBe('');
    expect(tipp).not.toMatch(/white-space:\s*nowrap/);
    expect(tipp).not.toMatch(/text-overflow:\s*ellipsis/);
  });

  it('höchstens zwei Zeilen mit Zeilenhöhe 1,3', () => {
    expect(tipp).toMatch(/display:\s*-webkit-box/);
    expect(tipp).toMatch(/-webkit-box-orient:\s*vertical/);
    expect(tipp).toMatch(/-webkit-line-clamp:\s*2(;|$)/);
    expect(tipp).toMatch(/(^|;)line-clamp:\s*2(;|$)/);
    expect(tipp).toMatch(/overflow:\s*hidden/);
    expect(tipp).toMatch(/line-height:\s*1\.3(;|$)/);
  });

  it('der Tipp-Text selbst bleibt unverändert (Kürzen nur mit dem Fachprüfer)', () => {
    expect(lies('src/ui/vorspann.ts')).toContain(
      "'Leitungen liegen meist in der öffentlichen Straße – über fremde Grundstücke brauchst du die Gestattung des Eigentümers.'",
    );
  });

  it('tote Regeln für den kleinen Schriftzug im Startbild sind entfernt (das Startbild nutzt das SVG)', () => {
    expect(css).not.toContain('#vorspann span.schriftzug>span.heat');
    expect(css).not.toContain('#vorspann span.schriftzug>span.ville');
    // Der kleine Schriftzug in den Einstellungen behält seine Farben.
    expect(css).toContain('span.schriftzug>span.heat{color:#ff8a1f}');
  });
});
