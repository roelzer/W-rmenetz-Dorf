import { afterEach, describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { SYMBOLE } from '../src/ui/symbole';
import { attrappe } from './hilfen/kontext-attrappe';

// NR16-B2a (A92), Entwickler: Grenzfälle der Sperrtexte nach DESIGN.md 12.20, die die Tester-Vorarbeit nicht abdeckt –
// Fehlbetrag genau auf der Grenze, Münze bei Knöpfen, denen nur Geld fehlt (Übergabe Designer), und Rangfolge (Regel 4).
// Erwartete Texte wörtlich aus DESIGN.md 12.20 Regel 5.

const T0 = 1_000_000_000_000;
afterEach(() => { vi.unstubAllGlobals(); });

describe('A92 / 12.20 Regel 5 – Fehlbetrag an der Grenze', () => {
  it('A92: nichts fehlt (0 €) oder Überschuss → kein Hinweis; 1 Cent fehlt → „1 €“; 1.000,01 € → „1.001 €“', async () => {
    const { geldHinweis, talerHinweis } = await import('../src/ui/sperrtexte');
    expect(geldHinweis(0)).toBeNull();
    expect(geldHinweis(-5)).toBeNull();
    expect(geldHinweis(0.01)).toBe('Dir fehlen noch 1 €. Am Monatsende zahlen deine Kunden ihre Wärmerechnung.');
    expect(geldHinweis(1_000.01)).toBe('Dir fehlen noch 1.001 €. Am Monatsende zahlen deine Kunden ihre Wärmerechnung.');
    expect(geldHinweis(1_000)).toBe('Dir fehlen noch 1.000 €. Am Monatsende zahlen deine Kunden ihre Wärmerechnung.');
    expect(talerHinweis(0)).toBeNull();
    expect(talerHinweis(1)).toBe('Dir fehlen noch 1 Dorftaler. Du bekommst sie für Aufträge und beim Wegräumen.');
  });

  it('A92: Geld genau gleich dem Preis → nicht gesperrt; 0,5 € darunter → gesperrt, Preis bleibt (grund null), kein Schloss', async () => {
    const { geldSperre, talerSperre } = await import('../src/ui/sperrtexte');
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    s.stand.geld_eur = 2_000;
    expect(geldSperre(s, 2_000)).toBeNull();
    s.stand.geld_eur = 1_999.5;
    const g = geldSperre(s, 2_000)!;
    expect(g).toMatchObject({ grund: null, schloss: false });
    expect((g.hinweis as () => string | null)()).toBe('Dir fehlen noch 1 €. Am Monatsende zahlen deine Kunden ihre Wärmerechnung.');
    s.stand.geld_eur = 2_000; // Geld kam, während das Blatt offen war (Antwort 7)
    expect((g.hinweis as () => string | null)()).toBeNull();
    s.stand.taler = 5;
    expect(talerSperre(s, () => 5)).toBeNull();
    expect(talerSperre(s, () => 6)).not.toBeNull();
  });

  it('A92 Z3: genau 6 versorgte Häuser → frei; 5 → „5/6 Häuser versorgt“, Schloss, „dir fehlen noch 1.“', async () => {
    const { baugebietSperre } = await import('../src/ui/sperrtexte');
    expect(baugebietSperre(6)).toBeNull();
    expect(baugebietSperre(5)).toEqual({ grund: '5/6 Häuser versorgt', schloss: true, hinweis: 'Für das Baugebiet brauchst du 6 versorgte Häuser – dir fehlen noch 1.' });
  });

  it('A92 Regel 4: ersteSperre nimmt den ersten Grund, überspringt fehlende', async () => {
    const { ersteSperre } = await import('../src/ui/sperrtexte');
    const a = { grund: 'a', schloss: true, hinweis: 'A' }, b = { grund: null, schloss: false, hinweis: 'B' };
    expect(ersteSperre(null, a, b)).toBe(a);
    expect(ersteSperre(b, a)).toBe(b);
    expect(ersteSperre(null, null)).toBeNull();
  });
});

describe('A92 / 12.20 Regel 5 – Münze bleibt, wenn nur Geld fehlt', () => {
  it('A92: Geld-Knopf mit Geld-Sperre zeigt Münze vor dem Preis und kein Schloss; mit Stufen-Sperre Schloss statt Münze', async () => {
    const a = attrappe();
    vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
    vi.resetModules();
    const b = await import('../src/ui/bausteine');
    const quellen = (k: unknown) => a.alle(k).map((e) => e.attrs.quelle).filter(Boolean);
    const geld = b.knopf('Puffer einbauen', () => {}, 'geld', { unter: '1.800 €', sperre: { grund: null, schloss: false, hinweis: 'x' } });
    expect((geld as unknown as { attrs: Record<string, string> }).attrs['aria-disabled']).toBe('true');
    expect(a.text(geld)).toBe('Puffer einbauen1.800 €');
    expect(quellen(geld)).toEqual([SYMBOLE.geld]);
    const taler = b.knopf('Sofort fertig', () => {}, 'taler', { unter: '9 Taler', sperre: { grund: null, schloss: false, hinweis: 'x' } });
    expect(quellen(taler)).toEqual([SYMBOLE.taler]);
    const stufe = b.knopf('Puffer einbauen', () => {}, 'geld', { unter: '1.800 €', sperre: { grund: 'ab Heizzentrale Stufe 3', schloss: true, hinweis: 'x' } });
    expect(a.text(stufe)).toBe('Puffer einbauenab Heizzentrale Stufe 3');
    expect(quellen(stufe)).toEqual([SYMBOLE.schloss]);
  });
});
