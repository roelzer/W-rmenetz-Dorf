import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import type { Objekt } from '../src/core/typen';
import { SYMBOLE } from '../src/ui/symbole';
import { kontextKarte } from './hilfen/kontext-attrappe';

// A88 Designer-Treue P2 (DESIGN.md 12.15, Fotos docs/pruefberichte/fotos-a88p2/). Nutzt das echte Kernmodul.

const lies = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/** Alle Deklarationen eines CSS-Selektors (auch aus Media-Blöcken), zu einem Text verbunden. */
const regeln = (css: string, selektor: string): string => {
  const esc = selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|[}\\s,])${esc}\\{([^}]*)\\}`, 'gm'))].map((m) => m[1]).join(';');
};

const T0 = 1_000_000_000_000;
const neu = (stufe = 1): Spiel => {
  const s = new Spiel(neuerSpielstand(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  return s;
};

/** Kontextkarte eines Objekts ohne Browser aufbauen (gemeinsame Hilfe tests/hilfen/kontext-attrappe.ts). */
async function karte(s: Spiel, o: Objekt) {
  const { a, c } = await kontextKarte(s, o, T0);
  return { a, alle: a.alle(c) };
}

describe('A88 Designer-Treue P2 (DESIGN.md 12.15)', () => {
  it('A88: Heizzentrale – Hinweise „Vorlauf-Regler ab …“ und „Rücklauf-Helfer ab …“ einheitlich gedämpft mit Schloss davor', async () => {
    const s = neu(1);
    const { a, alle } = await karte(s, s.stand.objekte.find((o) => o.typ === 'hz')!);
    const hinweise = alle.filter((e) => e.tag === 'p' && /^(Vorlauf-Regler|Rücklauf-Helfer) ab Heizzentrale Stufe 3$/.test(a.text(e)));
    expect(hinweise.map((e) => a.text(e))).toEqual(['Vorlauf-Regler ab Heizzentrale Stufe 3', 'Rücklauf-Helfer ab Heizzentrale Stufe 3']);
    for (const p of hinweise) {
      expect(p.className, a.text(p)).toBe('gedaempft sperrhinweis');
      const erstes = p.kinder[0] as InstanceType<typeof a.El>;
      expect(erstes.className, a.text(p)).toBe('sym');
      expect((erstes.kinder[0] as InstanceType<typeof a.El>).attrs.quelle, a.text(p)).toBe(SYMBOLE.schloss);
    }
  });

  it('A88: Sperrhinweis – Schloss 14 px, 8 px Abstand nach oben (DESIGN.md 12.15)', () => {
    const css = lies('src/ui/stil.css');
    expect(regeln(css, '.blatt .sperrhinweis')).toMatch(/margin-top:8px/);
    expect(regeln(css, '.blatt .sperrhinweis')).toMatch(/display:flex/);
    expect(regeln(css, '.sperrhinweis .sym')).toMatch(/width:14px;height:14px/);
  });

  it('A88: Katalogkarte – Grund in menue.farbe.text statt der alten Tinte', () => {
    expect(regeln(lies('src/ui/stil.css'), '.bkarte .grund')).toMatch(/color:var\(--menue-farbe-text\)/);
  });

  it('A88: Baumenü bei 667×375 – Karten dürfen schmaler werden, lange Titel brechen um (Deutsch)', () => {
    const css = lies('src/ui/stil.css');
    expect(regeln(css, '.raster')).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
    expect(regeln(css, '.raster')).not.toMatch(/repeat\(2,1fr\)/);
    expect(regeln(css, '.bkarte')).toMatch(/min-width:0/);
    expect(regeln(css, '.bkarte .titel')).toMatch(/overflow-wrap:anywhere/);
    expect(regeln(css, '.bkarte .titel')).toMatch(/hyphens:auto/);
    expect(lies('index.html')).toContain('<html lang="de">'); // hyphens:auto trennt nur mit Sprachangabe
  });
});
