import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { bahnFelder } from '../src/core/nordviertel';
import type { Abschnitt, Objekt } from '../src/core/typen';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { neu } from './hilfen';
import { aufnahme, leeresDorf } from './hilfen/nr22';

// NR27 P5c (Review P5b4 Bedenken 2; DESIGN 14.5 „Bau“): Solange die Querung gebaut wird, zeigen die Bahnfelder nur die Baustelle.
// Die Planungs-Darstellung (grüne Strichellinie, halb durchsichtige Schutzrohr-Ringe) entfällt in dieser Zeit.
// Muster wie tests/nr27-p5b3-querung.test.ts und tests/nr27-p5b4-baustelle.test.ts.
//
// Werte von Hand (wie P5b3): Zoom 1,4 bei 844×390 → tw = 36,4 px; d40 → Strichellinie 60 % von 1,80544 px = 1,083264 px.
// Vorschau-Farbe `karte.pfeil_ok` '#2e7a4e'. Ringe vor den Zäunen bei y = −1,38 und −3,62 (Mittelpunkt einer ellipse()).
const STRICH = 1.083264, VORSCHAU = '#2e7a4e';

function kamera(): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = 1.4; k.zentrieren(10, -2.5, 1);
  return k;
}
const HZ = neu('hz', 11, 30);
const geplant = (x: number, y: number): Objekt => neu('d40', x, y, { geplant: true });
const LEITUNGEN = (): Objekt[] => [geplant(10, -1), geplant(10, -2), geplant(10, -3)];
function spielMit(abschnitt: Abschnitt | undefined) {
  const { s } = leeresDorf(1_700_000_000_000);
  s.stand.abschnitt = abschnitt;
  return s;
}
const imBau: Abschnitt = { phase: 'bau', mit_querung: true, bau: { art: 'neu', start_ms: 0, ende_ms: 1_000_000 } };
const szene = (abschnitt: Abschnitt | undefined): Szene => {
  const objekte = [HZ, ...LEITUNGEN()];
  return {
    objekte, innen: [], netz: berechneNetz(objekte, [], 1), spiel: spielMit(abschnitt), auswahl_id: null, modus: 'normal', geist: null,
    verschiebe_id: null, stempel: null, jetzt_ms: 300_000, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46,
    bahn: bahnFelder(),
  };
};
function bild(s: Szene): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  m.reduziert = true;
  bodenEbeneEinrichten(null);
  zeichneSzene(m, kamera(), s, new Effekte(), 0.016);
  return a.befehle;
}
const nah = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
/** Gestrichelte moveTo-Züge in Vorschau-Farbe und Strichellinien-Breite, die in der Mitte von (x|y) beginnen. */
function vorschauStriche(b: string[], k: Kamera, x: number, y: number): number {
  const [cx, cy] = k.mitte(x, y);
  let farbe = '', breite = 1, strichel = false, n = 0;
  for (const c of b) {
    if (c.startsWith('strokeStyle=')) farbe = c.slice(12);
    else if (c.startsWith('lineWidth=')) breite = Number(c.slice(10));
    else if (c.startsWith('setLineDash(')) strichel = c !== 'setLineDash([])';
    else if (c.startsWith('moveTo(')) {
      const [mx, my] = c.slice(7, -1).split(',').map(Number);
      if (nah(mx, cx) && nah(my, cy) && farbe === VORSCHAU && nah(breite, STRICH) && strichel) n++;
    }
  }
  return n;
}
const ringe = (b: string[], k: Kamera, x: number, y: number): number => {
  const [cx, cy] = k.mitte(x, y);
  return b.filter((c) => c.startsWith('ellipse(')).map((c) => c.slice(8, -1).split(',').map(Number)).filter(([ex, ey]) => nah(ex, cx) && nah(ey, cy)).length;
};

describe('NR27 P5c Vorschau ruht während des Querungsbaus (Review P5b4 Bedenken 2)', () => {
  // Fehler, die ihn rot machen: zeichneLeitungen fragt querungImBau nicht ab (Strichellinie und Ringe überlagern die Gruben), oder die
  // Abfrage greift zu weit und nimmt die Vorschau auch in der Planung weg.
  it('test_nr27_p5c_keine_vorschau_im_bau: Planung zeigt Strichellinie und Ringe, im Bau keines von beiden', () => {
    const k = kamera();
    const planung = bild(szene({ phase: 'planung', mit_querung: true, bau: null }));
    for (const y of [-2, -3]) expect(vorschauStriche(planung, k, 10, y), `Planung (10|${y}) Strichellinie`).toBeGreaterThan(0);
    expect(ringe(planung, k, 10, -1.38), 'Planung: Ring Süd').toBeGreaterThan(0);
    expect(ringe(planung, k, 10, -3.62), 'Planung: Ring Nord').toBeGreaterThan(0);

    const bau = bild(szene(imBau));
    for (const y of [-2, -3]) expect(vorschauStriche(bau, k, 10, y), `Bau (10|${y}) keine Strichellinie`).toBe(0);
    expect(ringe(bau, k, 10, -1.38), 'Bau: kein Ring Süd').toBe(0);
    expect(ringe(bau, k, 10, -3.62), 'Bau: kein Ring Nord').toBe(0);
  });

  // Fehler, der ihn rot macht: die Abfrage prüft nur die Phase „bau“ und nicht mit_querung – ein gewöhnlicher Abschnitt im Bau
  // hat dann keine Strichellinie mehr, obwohl er keine Baustelle an der Bahn zeigt.
  it('test_nr27_p5c_vorschau_bleibt_ohne_querung: Abschnitt im Bau ohne Querung behält die Strichellinie', () => {
    const k = kamera();
    const b = bild(szene({ phase: 'bau', bau: imBau.bau }));
    for (const y of [-2, -3]) expect(vorschauStriche(b, k, 10, y), `(10|${y})`).toBeGreaterThan(0);
  });
});
