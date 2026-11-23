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

    // Fehler: „Preis und Bauzeit sind im Spiel vereinfacht.“ bleibt unter beiden Spalten statt bei den Chips (Bildspalte).
    it(`test_nr27_fix_m4_karte5_in_bildspalte_${b}x${h}`, async () => {
      await echteSteuerung(spiel(), (u) => {
        const k = karteOeffnen(u);
        const teile = alle(k);
        const bild = teile.find((e) => e.tag.toLowerCase() === 'svg' && e.attrs.role === 'img')!;
        const chips = teile.filter((e) => e.klassen().includes('chip'));
        const spalte = gemeinsamerVorfahre([bild, ...chips]);
        expect(norm(spalte.textContent)).toContain(NORD_TEXTE.KARTE_5.text);
      }, { breite: b, hoehe: h });
    });
  }
});
