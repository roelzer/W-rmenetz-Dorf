import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TUTORIAL_HAUPT } from '../src/core/start';
import { echteSteuerung } from './hilfen/echte-steuerung';
import { sichtbar, type El } from './hilfen/dom-attrappe';
import { T0, bisT12, bisT13, neuesSpiel, schritt, st, wischeFelder } from './hilfen/tutorial-zug';

// Designer-Fotocheck nach dem Merge main ↔ NR20–22 (docs/pruefberichte/20261111-designer-merge-main.md, ENTSCHEIDUNGEN
// 2026-11-11 „Designer Merge 🟡 … B1 … B2 – beide übernommen“). Echte Steuerung mit echtem Tutorial (tests/hilfen/echte-steuerung.ts).

const NB = ' ';

describe('Merge B2: geschütztes Leerzeichen zwischen Zahl und Einheit im Anleitertext', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  // Werte von Hand (tests/nr21-kern.test.ts, Startdorf): zwei Tutorial-Häuser je 7,5 kW mit Puffer → kw_summe 15 kW,
  // kw_puffer 7,5 kW. DESIGN 13.15 K3: U+00A0 vor der Einheit, damit Zahl und Einheit in der Blase nicht getrennt umbrechen.
  // Fehler, der ihn rot macht: zahl() in src/core/tutorial.ts setzt ein normales Leerzeichen (oder die Blase ersetzt U+00A0).
  it('test_mm_b2_t13w_erklaersatz_nbsp: T13w-Blase enthält „15 kW“ und „7,5 kW“ mit U+00A0, kein normales Leerzeichen vor „kW“', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      wischeFelder(u, TUTORIAL_HAUPT);
      uhr.t += 16; st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T13w');
      const el = u.dom.html.querySelectorAll('.anleiter-text').filter((e) => e.isConnected)[0];
      expect(el, 'Anleiter-Karte mit Text').toBeDefined();
      const text = el.textContent;
      expect(text).toContain(`15${NB}kW`);
      expect(text).toContain(`7,5${NB}kW`);
      expect(text).not.toMatch(/\d kW/);
    }, { uhr: () => uhr.t });
  });
});

describe('Merge B1: kW-Knopf im Tutorial ausgeblendet wie [Dörfer]', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  // Mechanismus [Dörfer]: Hud.tutorialModus(true) beim Tutorialstart (steuerung.ts), Klasse „versteckt“ am Knopf selbst,
  // tutorialModus(false) beim Ende. Fehler, die ihn rot machen: Der kW-Knopf (.kwknopf, main) bleibt neben der Anleiter-Karte
  // sichtbar (Foto mmfinal-t05-ecke-kw-knopf-844x390.png), oder er kommt nach dem Tutorial nicht zurück.
  it('test_mm_b1_kw_knopf_im_tutorial_weg: ab Tutorialstart und in T12 mit Anleiter-Karte ohne kW-Knopf (wie [Dörfer]); nach dem Tutorial beide wieder da', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      const q = (sel: string): El => u.dom.html.querySelector(sel)!;
      const karte = (): boolean => u.dom.html.querySelectorAll('.anleiter-text').some((e) => sichtbar(e));
      st(u).tick(uhr.t);
      const kw = q('.kwknopf'), doerfer = q('.rund.besuch');
      expect(kw, 'kW-Knopf im HUD').not.toBeNull();
      expect(doerfer, '[Dörfer] im HUD').not.toBeNull();
      expect(sichtbar(doerfer), 'Vergleich: [Dörfer] im Tutorial weg').toBe(false);
      expect(sichtbar(kw), 'kW-Knopf im Tutorial weg').toBe(false);
      expect(kw.classList.contains('versteckt'), 'Klasse am Knopf selbst (wie [Dörfer])').toBe(true);
      bisT12(u, spiel, uhr);
      expect(karte(), 'Vorprobe: Anleiter-Karte steht in T12').toBe(true);
      expect(sichtbar(kw), 'T12: kW-Knopf weg').toBe(false);
      spiel.tutorialBeenden(); uhr.t += 16; st(u).tick(uhr.t);
      expect(sichtbar(doerfer), 'nach dem Tutorial: [Dörfer] wieder da').toBe(true);
      expect(sichtbar(kw), 'nach dem Tutorial: kW-Knopf wieder da').toBe(true);
    }, { uhr: () => uhr.t });
  });
});
