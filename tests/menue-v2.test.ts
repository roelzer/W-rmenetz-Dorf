import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { SYMBOLE } from '../src/ui/symbole';
import { gesperrt as istGesperrt } from './hilfen/gesperrt';

const lies = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/** Findet den knopf(…)-Aufruf, der mit dem Text beginnt, und liefert die Zeile ab dort (Variante steht in derselben Zeile). */
const knopfZeile = (quelle: string, anfang: string): string => {
  const i = quelle.indexOf(`knopf(${anfang}`);
  expect(i, `knopf(${anfang} … fehlt`).toBeGreaterThanOrEqual(0);
  const ende = quelle.indexOf('\n', i);
  return quelle.slice(i, ende < 0 ? undefined : ende);
};

describe('A84 – Menü-Stil v2 (DESIGN.md Abschnitt 12)', () => {
  it('A84: Symbole plus, minus, schloss und zahnrad sind gezeichnet (SVG)', () => {
    for (const n of ['plus', 'minus', 'schloss', 'zahnrad'] as const) expect(n in SYMBOLE, n).toBe(true);
  });
  it('A84: jedes Symbol trägt den SVG-Namensraum (ohne ihn zeichnet der Browser per DOMParser geparste Symbole nicht)', () => {
    for (const [n, q] of Object.entries(SYMBOLE)) expect(q, n).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 24 24"/);
  });

  it('A84: Symbole kommen per DOMParser ins Dokument, nicht per innerHTML', () => {
    const q = lies('src/ui/bausteine.ts');
    expect(q).toContain('DOMParser');
    expect(q).not.toMatch(/innerHTML/);
  });

  it('A84: Knopf-Varianten geld und gefahr; geld/taler tragen ein Symbol vor der Preiszeile; Stufenknopf mit Symbol', () => {
    const q = lies('src/ui/bausteine.ts');
    expect(q).toMatch(/type Variante = [^;]*'geld'[^;]*;/);
    expect(q).toMatch(/type Variante = [^;]*'gefahr'[^;]*;/);
    expect(q).toMatch(/type Variante = [^;]*'taler'[^;]*;/);
    expect(q).toContain("variante === 'geld' || variante === 'taler'");
    expect(q).toMatch(/export function stepper\(art: 'plus' \| 'minus', label: string, bei: \(\) => void, aus = false\): HTMLButtonElement/);
    expect(q).toContain("class: 'knopf stepper'");
  });

  it('A84: Heizzentrale – Plus/Minus sind Stufenknöpfe statt Text, nicht ausbaubare Quelle als deaktivierter Knopf', () => {
    const q = lies('src/ui/kontext.ts');
    expect(q).not.toMatch(/knopf\('[−+]'/);
    expect((q.match(/stepper\('minus'/g) ?? []).length).toBe(3);
    expect((q.match(/stepper\('plus'/g) ?? []).length).toBe(3);
    expect(q).not.toContain("h('span', { class: 'gedaempft' }, q.stufe >= KONSTANTEN.hoechststufe ? 'Höchste Stufe' : 'Heizzentrale ausbauen')");
    expect(q).toContain("unter: 'Erst Heizzentrale ausbauen'");
  });

  it('A84: Was Euro kostet, ist ein Geld-Knopf (Regel 12.5)', () => {
    const k = lies('src/ui/kontext.ts');
    for (const a of ['`Wegräumen', '`Ausbauen auf Stufe', '`Stufe ${q.stufe + 1}`, () => { sp.innenAusbauen', "'Zurückgewinnen'", "'Baugebiet erschließen'", '`${st.name}', '`PV aufs Dach', "'Puffer einbauen'", 'frei ? `${frei} beauftragen']) {
      expect(knopfZeile(k, a), a).toMatch(/'geld'/);
    }
    const kat = lies('src/ui/katalog.ts');
    for (const a of ['`${ABSCHNITT_HELFER.planung}: Neuen Bauabschnitt planen`', '`${ABSCHNITT_HELFER.material}: Material bestellen`', '`${ABSCHNITT_HELFER.material}: Expresslieferung`']) {
      expect(knopfZeile(kat, a), a).toMatch(/'geld'/);
    }
  });

  it('A84: Sofort fertig ist ein Taler-Knopf, Ja löschen ein Gefahr-Knopf, Radierer/T-Stück an und Tempo sind Gewählt', () => {
    expect(knopfZeile(lies('src/ui/katalog.ts'), "'Sofort fertig'")).toMatch(/'taler'/);
    expect(knopfZeile(lies('src/ui/einstellungen.ts'), "'Ja, löschen'")).toMatch(/'gefahr'/);
    const st = lies('src/steuerung.ts');
    expect(knopfZeile(st, "radieren ? 'Radierer an")).toMatch(/radieren \? 'gewaehlt' : ''/);
    expect(knopfZeile(st, "this.vorsehen ? 'T-Stück an")).toMatch(/this\.vorsehen \? 'gewaehlt' : ''/);
    expect(lies('src/ui/einstellungen.ts')).toContain("tempo() === t.faktor ? 'gewaehlt' : ''");
  });

  it('A84: die Variante heiss wird in der Oberfläche nicht mehr gesetzt', () => {
    for (const f of ['src/ui/kontext.ts', 'src/ui/katalog.ts', 'src/ui/einstellungen.ts', 'src/steuerung.ts', 'src/ui/bausteine.ts']) {
      expect(lies(f), f).not.toContain("'heiss'");
    }
  });

  it('A84: Katalogkarte – Preis als Chip mit Geldsymbol, gesperrte Karte mit Schloss', () => {
    const q = lies('src/ui/katalog.ts');
    expect(q).toContain("h('span', { class: `preis ${zuTeuer ? 'zuteuer' : ''}` }, symbol(c.taler != null ? 'taler' : 'geld')");
    expect(q).toContain("h('span', { class: 'grund' }, symbol('schloss')");
    expect(q).toContain("k.append(h('h3', {}, 'Bauabschnitt'))"); // Kasten mit Mini-Kopfband (12.7)
  });

  it('A84: Zahnrad im Dorfschild ist ein gezeichnetes Symbol, kein Schriftzeichen', () => {
    const q = lies('src/ui/hud.ts');
    expect(q).not.toContain('⚙');
    expect(q).toContain("symbol('zahnrad', 'zahnrad')");
  });

  it('A84: „Weniger Bewegung“ ist ein Schalter (role="switch")', () => {
    expect(lies('src/ui/einstellungen.ts')).toContain("h('input', { type: 'checkbox', id: 'bewegung', role: 'switch' })");
  });

  it('A84: Tafel-Titel ohne festen Inline-Schriftgrad (die Titelgröße kommt aus dem Stylesheet)', () => {
    expect(lies('src/ui/blatt.ts')).not.toContain('titel.style.fontSize');
  });

  it('A84: stil.css nutzt die --menue-Variablen; Kopfband mit Rohrnaht, Knopfarten, Schalter, Stufenknopf', () => {
    const css = lies('src/ui/stil.css');
    expect((css.match(/var\(--menue-/g) ?? []).length).toBeGreaterThan(100);
    expect(css).toMatch(/\.blatt \.kopf\{[^}]*background:var\(--menue-farbe-kopfband\)/);
    expect(css).toMatch(/\.blatt \.kopf::after\{[^}]*var\(--menue-farbe-naht-vorlauf\) 0 50%,var\(--menue-farbe-naht-ruecklauf\) 50% 100%/);
    for (const r of ['.knopf.geld{--f:var(--menue-knopf-geld-0);--u:var(--menue-knopf-geld-1)', '.knopf.gefahr{--f:var(--menue-knopf-gefahr-0);--u:var(--menue-knopf-gefahr-1)}', '.knopf.taler{--f:var(--menue-knopf-taler-0);--u:var(--menue-knopf-taler-1)}', '.knopf.gewaehlt{--f:var(--menue-knopf-gewaehlt-0)', '.knopf.stepper{', '.schalter input{appearance:none', '.schliessen{width:var(--menue-mass-px-schliessen)']) {
      expect(css, r).toContain(r);
    }
    expect(css).toMatch(/\.weniger-bewegung \.knopf:active:not\(:disabled\)[^{]*\{transform:none;background:var\(--u\)\}/);
  });

  it('A84: alte Aussehen-Regeln sind ersetzt, nicht nur überlagert', () => {
    const css = lies('src/ui/stil.css');
    for (const alt of ['.knopf.heiss{background:var(--farbe-knopf-heiss-0)}', '.knopf:disabled{opacity:.55', 'background:linear-gradient(var(--farbe-ui-kopf-oben),var(--farbe-ui-kopf-unten))', '.schalter input{width:24px;height:24px}', '.umriss{color:var(--farbe-ui-tinte);font-family:var(--schrift-anzeige);font-weight:700}']) {
      expect(css, alt).not.toContain(alt);
    }
    expect(css).toContain('.umriss{color:var(--farbe-ui-tinte);font-family:var(--menue-schrift-anzeige);font-weight:400}');
  });

  it('A84: Update-Hinweis und Meldung im neuen Stil (dunkle Kapsel mit Kontur)', () => {
    const css = lies('src/ui/stil.css');
    expect(css).toMatch(/\.update-hinweis\{[^}]*background:var\(--menue-farbe-hud-grund\)[^}]*border:var\(--menue-mass-px-kontur-fein\) solid var\(--k\)/);
    expect(css).toMatch(/#toast \.toast,#toast \.toast\.lang\{background:var\(--menue-farbe-hud-grund\)/);
  });
});

// ---- Review A84 W1: Verhalten statt nur Quelltext ----
/** Winzige DOM-Nachbildung nur für die Bausteine (Vitest läuft ohne Browser). */
function attrappe() {
  const mime: string[] = [];
  class El {
    tag: string; className = ''; attrs: Record<string, string> = {}; kinder: unknown[] = []; ereignisse: Record<string, () => void> = {};
    constructor(tag: string) { this.tag = tag; }
    setAttribute(k: string, v: string) { this.attrs[k] = v; }
    hasAttribute(k: string) { return k in this.attrs; }
    addEventListener(k: string, f: () => void) { this.ereignisse[k] = f; }
    append(...k: unknown[]) { this.kinder.push(...k); }
  }
  const doc = { createElement: (t: string) => new El(t), createTextNode: (t: string) => ({ text: t }), importNode: (n: unknown) => n };
  class Parser { parseFromString(_t: string, m: string) { mime.push(m); return { documentElement: new El('svg') }; } }
  return { doc, Parser, mime, El };
}
describe('A84 (Review W1) Bausteine verhalten sich richtig', () => {
  it('A84: Symbole werden als SVG geparst, gesperrte Plus/Minus-Knöpfe sind wirklich gesperrt, Euro-Preis bekommt die Münze', async () => {
    const a = attrappe();
    vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
    try {
      const b = await import('../src/ui/bausteine');
      b.symbol('plus');
      expect(a.mime).toEqual(['image/svg+xml']);
      const aus = b.stepper('minus', 'Senken', () => {}, true) as unknown as InstanceType<typeof a.El>;
      expect(istGesperrt(aus)).toBe(true); // disabled oder nach DESIGN.md 12.19 aria-disabled="true"
      expect(aus.attrs['aria-label']).toBe('Senken');
      const an = b.stepper('plus', 'Erhöhen', () => {}, false) as unknown as InstanceType<typeof a.El>;
      expect(istGesperrt(an)).toBe(false);
      const geld = b.knopf('Kaufen', () => {}, 'geld', { unter: '100 €' }) as unknown as InstanceType<typeof a.El>;
      const zeile = geld.kinder.at(-1) as InstanceType<typeof a.El>;
      expect(zeile.tag).toBe('small');
      expect((zeile.kinder[0] as InstanceType<typeof a.El>).className).toBe('sym preis-sym');
      const frei = b.knopf('Planen', () => {}, 'los', { unter: 'kostenlos' }) as unknown as InstanceType<typeof a.El>;
      expect((frei.kinder.at(-1) as InstanceType<typeof a.El>).kinder.length).toBe(1); // keine Münze bei Kostenlosem
      const gesperrt = b.knopf('Ausbauen', () => {}, 'geld', { unter: 'Ziele noch offen', aus: true }) as unknown as InstanceType<typeof a.El>;
      expect((gesperrt.kinder.at(-1) as InstanceType<typeof a.El>).kinder.length).toBe(1); // gesperrt: Grund statt Preis, keine Münze
    } finally { vi.unstubAllGlobals(); }
  });
  it('A84: Tippflächen – Tokens und CSS halten mindestens 44 px, Plus/Minus 48 px', () => {
    const t = JSON.parse(lies('design/tokens.json'));
    expect(t.menue.mass_px.knopf_hoehe).toBeGreaterThanOrEqual(48);
    expect(t.menue.mass_px.knopf_hoehe_klein).toBeGreaterThanOrEqual(44);
    expect(t.menue.mass_px.schliessen).toBeGreaterThanOrEqual(44);
    const css = lies('src/ui/stil.css');
    expect(css).toMatch(/\.knopf\.stepper\{width:48px;min-width:48px/);
    expect(css).toMatch(/\.knopf\.klein\{min-height:var\(--menue-mass-px-knopf-hoehe-klein\)/);
    expect(css).toMatch(/\.knopf\.los,\.knopf\.taler,\.knopf\.blau,\.knopf\.gefahr\{--t:#fff;/); // weiße Schrift auf Rot/Grün/Violett/Blau
  });
  it('A84: Plus erhöht, Minus senkt (Wärmepreis, Grundgebühr, Vorlauf)', () => {
    const k = lies('src/ui/kontext.ts');
    expect(k).toMatch(/stepper\('plus', 'Wärmepreis erhöhen', \(\) => \{ sp\.preisSetzen\(s\.preisstufe \+ 1\)/);
    expect(k).toMatch(/stepper\('minus', 'Wärmepreis senken', \(\) => \{ sp\.preisSetzen\(s\.preisstufe - 1\)/);
    expect(k).toContain("stepper('plus', 'Grundgebühr erhöhen', () => { sp.grundgebuehrSetzen(g + 1)");
    expect(k).toContain("stepper('minus', 'Grundgebühr senken', () => { sp.grundgebuehrSetzen(g - 1)");
    expect(k).toContain("stepper('plus', 'Vorlauftemperatur erhöhen', () => { sp.vorlaufSetzen(sp.vorlauf_c + VORLAUF.schritt_c)");
    expect(k).toContain("stepper('minus', 'Vorlauftemperatur senken', () => { sp.vorlaufSetzen(sp.vorlauf_c - VORLAUF.schritt_c)");
  });
  it('A84 (Review W2): Was Euro kostet, ist Gold – auch Vorsehung setzen und Leitung tauschen', () => {
    const k = lies('src/ui/kontext.ts');
    expect(k).toContain("o.vorsehung ? '' : 'geld'");
    expect(k).toMatch(/knopf\(`Tauschen: \$\{KATALOG\[t\]\.name\}`, [^]*?, 'geld', \{ unter: eur/);
  });
});

describe('A84 Designer-Treueprüfung (Nr. 1–7)', () => {
  it('A84: kein Fokusrahmen um die ganze Tafel, Update-Hinweis weicht Fenstern aus, Popup mittig, schmale Handys', () => {
    const css = lies('src/ui/stil.css');
    expect(css).toContain('#ebene>.blatt:focus,#ebene>.blatt:focus-visible{outline:none}');
    expect(css).toContain('body:has(#ebene .blatt.popup) .update-hinweis{display:none}');
    expect(css).toMatch(/\.blatt-offen \.update-hinweis\{left:/);
    expect(css).toContain('#ebene.mitte>.blatt.popup{align-self:center}');
    expect(css).toMatch(/@media \(orientation:landscape\) and \(max-width:799px\)\{\.hud-links\{width:170px\}/);
    expect(css).toMatch(/@media \(orientation:landscape\) and \(max-width:699px\)\{\.hud-links\{width:160px\}/);
    expect(lies('src/ui/hud.ts')).toContain("matchMedia('(max-width:699px)')");
  });
  it('A84: Plus/Minus einfarbig kräftig, gesperrte Knöpfe ohne Münze, Hausausbau gesperrt als Knopf mit Grund', async () => {
    expect(SYMBOLE.plus).not.toContain('#fff6e2'); expect(SYMBOLE.minus).not.toContain('#fff6e2');
    const k = lies('src/ui/kontext.ts');
    expect(k).not.toContain("'Für die nächste Stufe erst die Heizzentrale ausbauen.'");
    expect(k).toContain("knopf(`Stufe ${o.stufe + 1}`, () => undefined, '', { aus: true, unter: 'Erst Heizzentrale ausbauen' })");
  });
});

describe('A84 (Review A86-Paket) Monteur-Anzeige auf schmalen Handys', () => {
  it('A84: unter 700 px ohne „frei“, sonst mit', async () => {
    const { monteurText } = await import('../src/ui/hud');
    expect(monteurText(1, 2, false)).toBe('1/2 frei');
    expect(monteurText(1, 2, true)).toBe('1/2');
    expect(lies('src/ui/hud.ts')).toContain("monteurText(frei, sp.monteure(), kurz)");
  });
});
