import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import type { Objekt } from '../src/core/typen';
import { SYMBOLE } from '../src/ui/symbole';

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

/** Winzige DOM-Nachbildung wie in tests/a88-freischalt-leiter.test.ts; der Parser merkt sich das geparste SVG. */
function attrappe() {
  class El {
    tag: string; className = ''; attrs: Record<string, string> = {}; kinder: unknown[] = []; style: Record<string, string> = {};
    on: Record<string, () => void> = {};
    constructor(tag: string) { this.tag = tag; }
    setAttribute(k: string, v: string) { this.attrs[k] = v; }
    hasAttribute(k: string) { return k in this.attrs; }
    addEventListener(n: string, f: () => void) { this.on[n] = f; }
    append(...k: unknown[]) { this.kinder.push(...k); }
    replaceChildren(...k: unknown[]) { this.kinder = [...k]; }
  }
  const doc = { createElement: (t: string) => new El(t), createTextNode: (t: string) => ({ text: t }), importNode: (n: unknown) => n, addEventListener: () => {} };
  class Parser { parseFromString(q: string) { const svg = new El('svg'); svg.attrs.quelle = q; return { documentElement: svg }; } }
  const text = (n: unknown): string => (n && typeof n === 'object' && 'text' in n ? String((n as { text: string }).text) : n instanceof El ? n.kinder.map(text).join('') : '');
  const alle = (n: unknown): El[] => (n instanceof El ? [n, ...n.kinder.flatMap(alle)] : []);
  return { doc, Parser, El, text, alle };
}

/** Kontextkarte eines Objekts ohne Browser aufbauen. */
async function karte(s: Spiel, o: Objekt) {
  const a = attrappe();
  vi.resetModules();
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.doMock('../src/ui/blatt', () => ({ blattOeffnen: () => ({ inhalt: new a.El('div'), zu: () => {} }), blattOffen: () => false }));
  try {
    const { Kontext } = await import('../src/ui/kontext');
    const ui = { spiel: s, jetzt_ms: () => T0, geaendert: () => {}, stempeln: () => {}, toast: () => {}, katalog: () => {} };
    const k = new Kontext(ui as unknown as ConstructorParameters<typeof Kontext>[0], () => {});
    const c = new a.El('div');
    (k as unknown as { inhalt: (c: unknown, o: Objekt) => void }).inhalt(c, o);
    return { a, alle: a.alle(c) };
  } finally { vi.unstubAllGlobals(); vi.doUnmock('../src/ui/blatt'); }
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
