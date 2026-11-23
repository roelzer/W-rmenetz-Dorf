import { describe, expect, it } from 'vitest';
import tokens from '../design/tokens.json';
import { bahnFelder } from '../src/core/nordviertel';
import { baustelleImBild, zeichneGleise, zeichneMast } from '../src/render/bahn';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { aufnahme } from './hilfen/nr22';

// NR27 Fix-Runde K2/K3 (Reviewer 20261123-121807): zeichneGleise zog nach render/bahn.ts, die doppelten Hilfsstücke `oben()` und
// „Rechteck im Bild“ wurden je eine Funktion. Diese Tests halten das Verhalten fest, das vorher kein Test abdeckte
// (Fehlerprobe NICHT ERKANNT): Mast steigt nach oben, Spielraum über den Gruben, Körnung im Schotter.
// Werte von Hand: Kachelbreite tw = basis 40 × zoom 1 = 40 px (≥ detail_ab_kachelbreite 32, also mit Details);
// Masthöhe 0,62 Kachel = 24,8 px (DESIGN 14.9 `mast_hoehe`); Mast auf dem Randweg Nord bei Feld-y −3,26.

function kamera(): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  // basis fest setzen: groesseSetzen leitet sie aus der Bildgröße ab, der Test braucht genau 40 px je Kachel
  k.groesseSetzen(844, 390, 1); k.basis = 40; k.zoom = 1; k.zentrieren(10, -2.5, 1);
  return k;
}
const zahlen = (befehl: string): number[] => befehl.slice(befehl.indexOf('(') + 1, -1).split(',').map(Number);

describe('NR27 Fix K3 – gemeinsame Helfer in render/bahn.ts', () => {
  it('Testaufbau: Kachelbreite 40 px', () => {
    expect(kamera().tw).toBe(40);
  });

  // Fehler, der ihn rot macht: oben() rechnet die Höhe nach unten (py + h · tw) oder ohne Kachelbreite.
  it('test_nr27_fix_k3_mast_steigt_um_mast_hoehe_nach_oben', () => {
    const k = kamera(), a = aufnahme(), m = new Maler(a.X);
    zeichneMast(m, k, { x: 11, tiefe: 0, draht_von_x: 11, draht_bis_x: 14 });
    const [fx, fy] = k.mitte(11, -3.26);
    const i = a.befehle.findIndex((b, j) => b.startsWith('moveTo(') && a.befehle[j + 1]?.startsWith('lineTo(')
      && Math.abs(zahlen(b)[0] - fx) < 1e-9 && Math.abs(zahlen(b)[1] - fy) < 1e-9);
    expect(i, 'Mastfuß gezeichnet').toBeGreaterThanOrEqual(0);
    const [sx, sy] = zahlen(a.befehle[i + 1]);
    expect(sx).toBeCloseTo(fx, 9);
    expect(sy).toBeCloseTo(fy - 24.8, 9);
  });

  // Fehler, der ihn rot macht: imBild gibt oben keinen Spielraum (oder rechnet ihn in die falsche Richtung). Gruben-Bodenfläche
  // x 9,65 … 10,35, y −4,35 … −0,65 (tests/nr27-p5d-baustelle-rand.test.ts); höchster Bodenpunkt im Bild ist (9,65|−4,35).
  // Spielraum oben = 1 Kachel: liegt dieser Punkt eine halbe Kachel unter dem Bildrand, ragt die Baustelle noch hinein,
  // anderthalb Kacheln darunter nicht mehr.
  it('test_nr27_fix_k3_baustelle_spielraum_eine_kachel_nach_oben', () => {
    const lage = (unter_kacheln: number): Kamera => {
      const k = kamera();
      k.zentrierenBei(9.65, -4.35, 1, 422, 390 + unter_kacheln * 40);
      return k;
    };
    const halb = lage(0.5), anderthalb = lage(1.5);
    expect(halb.mitte(9.65, -4.35)[1], 'Testaufbau halbe Kachel').toBeCloseTo(410, 6);
    expect(anderthalb.mitte(9.65, -4.35)[1], 'Testaufbau anderthalb Kacheln').toBeCloseTo(450, 6);
    expect(baustelleImBild(halb)).toBe(true);
    expect(baustelleImBild(anderthalb)).toBe(false);
  });
});

describe('NR27 Fix K2 – Gleise aus render/bahn.ts', () => {
  // Fehler, der ihn rot macht: die Körnung im Schotter fehlt oder nimmt eine andere Farbe als das Token.
  it('test_nr27_fix_k2_koernung_im_schotter_aus_token', () => {
    expect(tokens.farbe.bahn.schotter_koernung).toBe('rgba(60,54,46,.22)');
    const a = aufnahme(), m = new Maler(a.X);
    zeichneGleise(m, kamera(), bahnFelder(), [], false);
    expect(a.befehle.filter((b) => b === 'fillStyle=rgba(60,54,46,.22)').length).toBeGreaterThan(0);
  });
});
