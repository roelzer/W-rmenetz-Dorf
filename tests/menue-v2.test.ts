import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SYMBOLE } from '../src/ui/symbole';

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
    for (const r of ['.knopf.geld,.knopf.heiss{--f:var(--menue-knopf-geld-0);--u:var(--menue-knopf-geld-1)', '.knopf.gefahr{--f:var(--menue-knopf-gefahr-0);--u:var(--menue-knopf-gefahr-1)}', '.knopf.taler{--f:var(--menue-knopf-taler-0);--u:var(--menue-knopf-taler-1)}', '.knopf.gewaehlt{--f:var(--menue-knopf-gewaehlt-0)', '.knopf.stepper{', '.schalter input{appearance:none', '.schliessen{width:var(--menue-mass-px-schliessen)']) {
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
