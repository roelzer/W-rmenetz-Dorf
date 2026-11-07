// Paket P5f-2 (DESIGN 13.17.9 „Feinschliff P5f“) und Nachträge aus dem Review P5e: Schleier, Stecker, Ringe, Finger und der
// Zeitpunkt des Wechsels in der echten Steuerung (DOM-Nachbildung wie tests/nr20-p5e-schleier.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERSTE_HAEUSER } from '../src/core/start';
import { echteSteuerung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';
import { T0, bisT13, hausBei, neuesSpiel, st, type U } from './hilfen/tutorial-zug';

const schleierSvg = (u: U): El => (u.dom.doc.getElementById('schleier') as El).querySelector('svg') as El;
const maske = (u: U): string => /<mask[^>]*>(.*)<\/mask>/.exec(schleierSvg(u).attrs.quelle)![1];
/** Mitte und Halbachsen jedes Lochs der Maske aus dem Pfad `M{x0} {cy}A{rx} {ry} 0 1 0 {x1} {cy}…` (spotlight.ts lochPfad). */
function loecher(u: U): Array<{ cx: number; cy: number; rx: number; ry: number }> {
  return [...maske(u).matchAll(/<path d="M([\d.-]+) ([\d.-]+)A([\d.-]+) ([\d.-]+) 0 1 0 ([\d.-]+) /g)].map((t) => {
    const [x0, cy, rx, ry, x1] = t.slice(1, 6).map(Number);
    return { cx: (x0 + x1) / 2, cy, rx, ry };
  });
}

describe('P5f-2 Schleier (DESIGN 13.17.9 F5, Review P5e)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('Schleier ohne Änderung wird nicht neu gebaut: zwei weitere Bilder in T13 lassen dasselbe SVG-Element stehen', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const vorher = schleierSvg(u);
      uhr.t += 16; st(u).tick(uhr.t);
      uhr.t += 16; st(u).tick(uhr.t);
      expect(schleierSvg(u)).toBe(vorher);
    }, { uhr: () => uhr.t });
  });

  it('Lochmitte Haus 2: Ellipse um das Haus (Grundfläche + eine Feldhöhe nach oben), Mitte also eine halbe Feldhöhe über der Feldmitte', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const k = st(u).kamera, h2 = hausBei(spiel, ERSTE_HAEUSER[1]);
      const [mx, my] = k.mitte(h2.x, h2.y);
      const l = loecher(u).at(-1)!;
      expect(l.cx).toBeCloseTo(mx, 1);
      expect(l.cy).toBeCloseTo(my - k.th / 2, 1);
    }, { uhr: () => uhr.t });
  });

  it('F5: Heizzentrale nur mit der Grundfläche (2×2 Felder als Raute) + 12 px: Mitte = Mitte der vier Felder, Halbachsen Feldbreite + 12 und Feldhöhe + 12', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const k = st(u).kamera, hz = spiel.hz;
      // Heizzentrale (11|10), Größe 2: Mitte der Bodenraute bei (11,5|10,5); Ellipse durch die Rautenecken = halbe Diagonalen
      // 2 · tw / 2 und 2 · th / 2, dazu spot_abstand_karte 12 px
      expect([hz.x, hz.y]).toEqual([11, 10]);
      const [mx, my] = k.mitte(11.5, 10.5);
      const alle = loecher(u), l = alle[alle.length - 3];
      expect(l.cx).toBeCloseTo(mx, 1);
      expect(l.cy).toBeCloseTo(my, 1);
      expect(l.rx).toBeCloseTo(k.tw + 12, 1);
      expect(l.ry).toBeCloseTo(k.th + 12, 1);
    }, { uhr: () => uhr.t });
  });
});
