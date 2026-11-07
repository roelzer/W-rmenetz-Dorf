import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TUTORIAL_HAUPT } from '../src/core/start';
import { El } from './hilfen/dom-attrappe';
import { echteSteuerung } from './hilfen/echte-steuerung';
import {
  ZUG_HAUS1, abheben, bisT13, bisT13h, farbknopf, knopfMitId, knopfRechteck, neuesSpiel, schritt, st, wischeFelder,
} from './hilfen/tutorial-zug';

// Paket P5f-2 (DESIGN 13.17.9 F7, F8): Ring um den Farbknopf, Abstand der Kennzeile, Finger in T13w, Zeitpunkt des Wechsels.

const ringe = (u: Parameters<typeof st>[0]) => u.dom.html.querySelectorAll('.spot-ring').filter((r) => r.isConnected);
const fingerEl = (u: Parameters<typeof st>[0]) => u.dom.html.querySelector('.spot-finger');

describe('P5f-2 F7: Ring um den Farbknopf und Finger in T13w', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('T13w: Ring 2 px um den Farbknopf (statt 8), Finger mit Spitze auf der Knopfmitte und Hand nach rechts oben', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      wischeFelder(u, TUTORIAL_HAUPT); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T13w');
      // Knopf 44 × 44 bei (600|300): Ring = Knopf + 2 px je Seite → links 598, Breite 48 (Token spot_abstand_farbknopf)
      knopfRechteck(farbknopf(u, spiel.tutorialWerte().anschluss), 600, 300);
      const animiert: Array<{ el: El; kf: Array<Record<string, unknown>> }> = [];
      vi.spyOn(El.prototype, 'animate').mockImplementation(function (this: El, kf: unknown) {
        animiert.push({ el: this, kf: kf as Array<Record<string, unknown>> });
        return { finished: Promise.resolve(), cancel() {}, onfinish: null };
      } as unknown as El['animate']);
      st(u).tick(uhr.t);
      const r = ringe(u).map((x) => [x.style.left, x.style.top, x.style.width, x.style.height]);
      expect(r).toContainEqual(['598px', '298px', '48px', '48px']);
      const f = fingerEl(u);
      expect(f, 'Finger in T13w').not.toBeNull();
      expect([f!.style.left, f!.style.top]).toEqual(['622px', '322px']);
      expect(f!.klassen()).toContain('nach-oben');
      // Tippen 6 px schräg zum Ziel: die Hand kommt von rechts oben, also nach links unten (je Achse 6/√2 = 4,24)
      const tipp = animiert.find((x) => x.el === f && x.kf.some((k) => 'transform' in k));
      expect(tipp?.kf[1].transform).toBe('translate(-4.24px, 4.24px)');
    }, { uhr: () => uhr.t });
  });

  it('[Zurück] beim eigenen Abgang behält den Abstand 8 px (spot_abstand_knopf)', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, [[12, 12], [12, 13]]); st(u).tick(uhr.t);
      knopfRechteck(knopfMitId(u, 'zurueck')!, 600, 300);
      st(u).tick(uhr.t);
      expect(ringe(u).map((x) => [x.style.left, x.style.width])).toContainEqual(['592px', '60px']);
    }, { uhr: () => uhr.t });
  });

  it('stil.css: Kennzeile 4 px unter den Farbknöpfen (8 px Lücke + 4 = 12), Finger nach oben gespiegelt und um seine Höhe versetzt', () => {
    const css = readFileSync('src/ui/stil.css', 'utf8');
    expect(css).toContain('.blatt.zeichenleiste .kennzeile{margin:4px 0 0;');
    expect(css).toContain('.spot-finger.nach-oben{margin-top:calc(-1 * var(--menue-mass-px-finger))}');
    expect(css).toContain('.spot-finger.nach-oben .sym{transform:scaleY(-1)}');
    expect(css).toContain('.spot-finger.nach-oben.von-links .sym{transform:scale(-1,-1)}');
  });
});
