import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

// NR27 Fix-Runde M4 (docs/pruefberichte/20261123-designer-treue-nr27.md): Erklärkarte bei 667×375 – die Chips waren halb
// abgeschnitten. Abhilfe: Chips unter das Bild in die linke Spalte (Bildspalte), Text rechts. Strukturell geprüft: Der nächste
// gemeinsame Vorfahre von Bild (svg role=img) und allen Chips der Karte ist die Bildspalte; sie enthält keinen der Sätze
// KARTE_1 … KARTE_4, aber den Hinweis KARTE_5 („im Spiel vereinfacht“). Fachtext-Schalter wie tests/nr27-p5a3-ui.test.ts.
const schalter = vi.hoisted(() => ({ frei: true }));
vi.mock('../src/core/nord-texte', async (orig) => {
  const echt = await orig<typeof import('../src/core/nord-texte')>();
  return { ...echt, nordText: (id: Parameters<typeof echt.nordText>[0], werte?: Record<string, string | number>, frei?: boolean) => echt.nordText(id, werte, frei ?? schalter.frei) };
});

import { NORD_TEXTE } from '../src/core/nord-texte';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import { echteSteuerung, tippe, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';

const T0 = 1_700_000_000_000;
const norm = (s: string): string => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function spiel(): Spiel {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
  st.geld_eur = 10_000_000; st.taler = 10_000;
  st.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(st, () => T0);
  sp.neuBerechnen();
  sp.ereignisse.splice(0);
  return sp;
}
function karteOeffnen(u: EchteUmgebung): El {
  u.st.katalog('netz');
  const info = u.dom.html.querySelectorAll('[data-ziel="bahn_info"]')[0];
  expect(info, 'Testaufbau: (i) im Kasten „Bauabschnitt“').toBeDefined();
  tippe(info);
  const k = u.dom.html.querySelector('#bahn-karte');
  expect(k, 'Erklärkarte offen').not.toBeNull();
  return k!;
}
function alle(e: El): El[] {
  const r: El[] = [];
  for (const k of e.kinder) if (typeof (k as El).klassen === 'function') r.push(k as El, ...alle(k as El));
  return r;
}
const vorfahren = (e: El): El[] => { const r: El[] = []; for (let p: El | null = e; p; p = p.parentNode) r.push(p); return r; };
function gemeinsamerVorfahre(els: El[]): El {
  let kandidaten = vorfahren(els[0]);
  for (const e of els.slice(1)) { const v = new Set(vorfahren(e)); kandidaten = kandidaten.filter((k) => v.has(k)); }
  return kandidaten[0];
}

describe('NR27 Fix M4 – Erklärkarte: Chips in der Bildspalte', () => {
  for (const [b, h] of [[844, 390], [667, 375]] as const) {
    // Fehler, der ihn rot macht: Chips stehen weiter in einer eigenen Reihe unter Bild UND Text (gemeinsamer Vorfahre = ganzer
    // Inhalt mit allen Sätzen) – dann werden sie bei 667×375 abgeschnitten.
    it(`test_nr27_fix_m4_chips_unter_bild_ohne_saetze_${b}x${h}`, async () => {
      await echteSteuerung(spiel(), (u) => {
        const k = karteOeffnen(u);
        const teile = alle(k);
        const bild = teile.find((e) => e.tag.toLowerCase() === 'svg' && e.attrs.role === 'img');
        const chips = teile.filter((e) => e.klassen().includes('chip'));
        expect(bild, 'Bild der Karte').toBeDefined();
        expect(chips.length, 'zwei Chips (Preis je Gleisfeld, Bauzeit)').toBeGreaterThanOrEqual(2);
        const spalte = gemeinsamerVorfahre([bild!, ...chips]);
        const text = norm(spalte.textContent);
        for (const id of ['KARTE_1', 'KARTE_2', 'KARTE_3', 'KARTE_4'] as const) expect(text, id).not.toContain(NORD_TEXTE[id].text);
      }, { breite: b, hoehe: h });
    });

    // Fehler, der ihn rot macht: KARTE_5 („Preis und Bauzeit sind im Spiel vereinfacht.“) steht weiter in der Bildspalte unter
    // den Chips – dort wird er bei 667×375 verdeckt (NR27 W1).
    it(`test_nr27_w1_karte5_nicht_in_bildspalte_${b}x${h}`, async () => {
      await echteSteuerung(spiel(), (u) => {
        const k = karteOeffnen(u);
        const teile = alle(k);
        const bild = teile.find((e) => e.tag.toLowerCase() === 'svg' && e.attrs.role === 'img')!;
        const chips = teile.filter((e) => e.klassen().includes('chip'));
        const spalte = gemeinsamerVorfahre([bild, ...chips]);
        expect(norm(k.textContent), 'KARTE_5 steht auf der Karte').toContain(NORD_TEXTE.KARTE_5.text);
        expect(norm(spalte.textContent), 'KARTE_5 nicht in der Bildspalte').not.toContain(NORD_TEXTE.KARTE_5.text);
      }, { breite: b, hoehe: h });
    });

    // Fehler, die ihn rot machen: KARTE_5 steht unter beiden Spalten (eigene Reihe, gemeinsamer Vorfahre der Sätze enthält ihn
    // nicht), steht in der Textspalte nicht zuletzt (z. B. vor KARTE_1), oder die Textspalte enthält Bild/Chips (keine zwei Spalten).
    it(`test_nr27_w1_karte5_unten_in_textspalte_${b}x${h}`, async () => {
      await echteSteuerung(spiel(), (u) => {
        const k = karteOeffnen(u);
        const teile = alle(k);
        const blattMit = (txt: string): El => {
          const treffer = teile.filter((e) => norm(e.textContent).includes(txt) && !alle(e).some((c) => norm(c.textContent).includes(txt)));
          expect(treffer, `genau ein Element mit „${txt}“`).toHaveLength(1);
          return treffer[0];
        };
        const saetze = (['KARTE_1', 'KARTE_2', 'KARTE_3', 'KARTE_4'] as const).map((id) => blattMit(NORD_TEXTE[id].text));
        const hinweis = blattMit(NORD_TEXTE.KARTE_5.text);
        const textspalte = gemeinsamerVorfahre(saetze);
        expect(vorfahren(hinweis).includes(textspalte), 'KARTE_5 liegt in der Textspalte').toBe(true);
        const textTeile = alle(textspalte);
        expect(textTeile.some((e) => e.tag.toLowerCase() === 'svg' && e.attrs.role === 'img'), 'kein Bild in der Textspalte').toBe(false);
        expect(textTeile.some((e) => e.klassen().includes('chip')), 'keine Chips in der Textspalte').toBe(false);
        // „unten“: das letzte Element-Kind der Textspalte ist (oder enthält) KARTE_5
        const kinder = textspalte.kinder.filter((c) => typeof (c as El).klassen === 'function') as El[];
        const letztes = kinder[kinder.length - 1];
        expect(letztes === hinweis || vorfahren(hinweis).includes(letztes), 'KARTE_5 steht zuletzt in der Textspalte').toBe(true);
      }, { breite: b, hoehe: h });
    });
  }
});

// ---- NR27 W1: Maße und Ausblendmaske der Erklärkarte (Struktur/CSS-Werte wie tests/nr27-p5a3-ui.test.ts) ----
const lies = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
/** Alle Deklarationen eines Selektors (exakt dieser Selektor, auch in Selektorlisten), in Quellreihenfolge. */
const regeln = (css: string, selektor: string): string => {
  const esc = selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(new RegExp(`(?:^|[}\\s,])${esc}\\{([^}]*)\\}`, 'gm'))].map((m) => m[1]).join(';');
};
/** Wert der letzten Deklaration einer Eigenschaft (spätere gewinnen), sonst undefined. */
const wert = (dekl: string, eig: string): string | undefined => {
  const t = [...dekl.matchAll(new RegExp(`(?:^|;)\\s*${eig.replace(/-/g, '\\-')}\\s*:([^;]*)`, 'g'))];
  return t.length ? t[t.length - 1][1].trim() : undefined;
};
const px = (v: string): number => { const m = /^(-?\d+(?:\.\d+)?)px$/.exec(v.trim()); if (!m) throw new Error(`kein px-Wert: ${v}`); return Number(m[1]); };
/** padding-Kurzschrift (1–4 Werte) plus spätere padding-top/-bottom → [oben, rechts, unten, links] in px. */
function innenabstand(dekl: string): [number, number, number, number] {
  const p = wert(dekl, 'padding');
  expect(p, 'padding gesetzt').toBeDefined();
  const v = p!.split(/\s+/).map(px);
  const [o, r, u, l] = v.length === 1 ? [v[0], v[0], v[0], v[0]] : v.length === 2 ? [v[0], v[1], v[0], v[1]] : v.length === 3 ? [v[0], v[1], v[2], v[1]] : v;
  const pt = wert(dekl, 'padding-top'), pb = wert(dekl, 'padding-bottom');
  return [pt ? px(pt) : o, r, pb ? px(pb) : u, l];
}

describe('NR27 W1 – Erklärkarte ohne Scrollen: Rand, Innenabstand, Ausblendmaske', () => {
  const css = lies('src/ui/stil.css');

  // Fehler, der ihn rot macht: Popup-Rand bleibt 12 px (oder größer) – bei 667×375 fehlen dann die 8 px Höhe für KARTE_5.
  it('test_nr27_w1_popup_rand_8px', () => {
    const [o, r, u, l] = innenabstand(regeln(css, '#bahn-karte'));
    expect([o, r, u, l]).toEqual([8, 8, 8, 8]);
  });

  // Fehler, der ihn rot macht: Innenabstand oben/unten bleibt 16 px (alter Stand) oder wird 0.
  it('test_nr27_w1_inhalt_innenabstand_oben_unten_12px', () => {
    const [o, , u] = innenabstand(regeln(css, '#bahn-karte .inhalt'));
    expect(o, 'oben').toBe(12);
    expect(u, 'unten').toBe(12);
  });

  // Fehler, der ihn rot macht: Ausblendmaske bleibt 16 px hoch bei 12 px Innenabstand – dann liegt die letzte Zeile (KARTE_5)
  // auch ohne Überlauf zum Teil in der Maske und wirkt verblasst. Geprüft für mask-image, -webkit-mask-image und mask.
  it('test_nr27_w1_ausblendmaske_hoechstens_innenabstand', () => {
    const dekl = regeln(css, '#bahn-karte .inhalt');
    const [, , unten] = innenabstand(dekl);
    for (const eig of ['mask-image', '-webkit-mask-image', 'mask', '-webkit-mask']) {
      const v = wert(dekl, eig);
      if (v === undefined || v === 'none') continue;
      expect(v, `${eig}: Verlauf nach unten`).toMatch(/linear-gradient\(\s*to bottom/);
      const stopps = [...v.matchAll(/calc\(\s*100%\s*-\s*(\d+(?:\.\d+)?)px\s*\)/g)].map((m) => Number(m[1]));
      expect(stopps.length, `${eig}: Maskenhöhe als calc(100% - Npx) ablesbar`).toBeGreaterThan(0);
      for (const n of stopps) expect(n, `${eig}: Maskenhöhe ${n} px ≤ Innenabstand unten ${unten} px`).toBeLessThanOrEqual(unten);
    }
    expect(unten).toBeLessThanOrEqual(12);
  });
});
