// Bauplan NR20-22 P5, Sammelliste P5 Punkte 2 und 3: Die echte Steuerung legt in den Schritten mit Ruhe (T12–T14) den
// leichten Schleier mit Gang über die Karte (DESIGN 13.17.1) und baut ihn neu auf, wenn sich die Kamera bewegt.
// Gang laut DESIGN: jede Raute der Spur × 1,5, Heizzentrale und beide Tutorial-Häuser als Ellipse + 12 px
// (tokens.json spot_abstand_karte = 12). Die Löcher stehen in der Maske schwarz (#000) auf weißer Fläche.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { echteSteuerung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';
import { T0, bisT12, bisT13, neuesSpiel, st, type U } from './hilfen/tutorial-zug';

const schleier = (u: U): El | null => u.dom.doc.getElementById('schleier') as El | null;
const quelle = (u: U): string => (schleier(u)!.querySelector('svg') as El).attrs.quelle;
const maske = (u: U): string => /<mask[^>]*>(.*)<\/mask>/.exec(quelle(u))![1];
const r2 = (n: number): string => String(Math.round(n * 100) / 100);
/** Pfadanfang der Ellipse um die Raute × 1,5 von Feld (x|y): Halbachsen 0,75 · Feldbreite bzw. -höhe plus 12 px Abstand. */
function rautenAnfang(u: U, x: number, y: number): string {
  const k = st(u).kamera, [cx, cy] = k.mitte(x, y), rx = 0.75 * k.tw + 12, ry = 0.75 * k.th + 12;
  return `M${r2(cx - rx)} ${r2(cy)}A${r2(rx)} ${r2(ry)} 0 1 0 ${r2(cx + rx)} ${r2(cy)}`;
}
const schwarzePfade = (u: U): number => (maske(u).match(/<path [^>]*fill="#000"/g) ?? []).length;

describe('NR20-22 P5e Schleier mit Gang in der echten Steuerung', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr20_schleier_t13_loecher_schwarz: T13 → Schleier direkt über #karte, je Bandfeld und für Heizzentrale und beide Häuser ein schwarzes Loch in der Maske', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const leinwand = u.dom.app.querySelector('canvas')!;
      expect(leinwand.id).toBe('karte');
      const s = schleier(u);
      expect(s).not.toBeNull();
      expect(u.dom.app.kinder.indexOf(s!)).toBe(u.dom.app.kinder.indexOf(leinwand) + 1);
      const band = st(u).anleitungAnsicht()!.band;
      expect(band).toHaveLength(6);
      // 6 Rauten + Heizzentrale + Haus 1 + Haus 2
      expect(schwarzePfade(u)).toBe(9);
      // Die Fläche der Maske ist weiß, nur die Löcher sind schwarz
      expect(maske(u)).toMatch(/^<rect [^>]*fill="#fff"\/>/);
      for (const f of band) expect(maske(u)).toContain(`<path d="${rautenAnfang(u, f.x, f.y)}`);
    }, { uhr: () => uhr.t });
  });

  it('test_nr20_schleier_folgt_kamera: Kamera verschoben → Schleier neu, Löcher wandern mit', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const vorher = rautenAnfang(u, 10, 11);
      expect(maske(u)).toContain(vorher);
      st(u).kamera.schiebe_x += 30; st(u).kamera.schiebe_y -= 10;
      uhr.t += 16; st(u).tick(uhr.t);
      const nachher = rautenAnfang(u, 10, 11);
      expect(nachher).not.toBe(vorher);
      expect(maske(u)).not.toContain(vorher);
      expect(maske(u)).toContain(nachher);
    }, { uhr: () => uhr.t });
  });

  it('test_nr20_schleier_nur_mit_ruhe: vor T12 kein Schleier, in T12 nur Heizzentrale und Häuser ausgespart, nach dem Tutorial weg', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      st(u).tick(uhr.t);
      expect(st(u).anleitungAnsicht()!.ruhe).toBe(false);
      expect(schleier(u)).toBeNull();
      bisT12(u, spiel, uhr);
      expect(schleier(u)).not.toBeNull();
      expect(schwarzePfade(u)).toBe(3);
      spiel.tutorialBeenden(); uhr.t += 16; st(u).tick(uhr.t);
      expect(schleier(u)).toBeNull();
    }, { uhr: () => uhr.t });
  });
});
