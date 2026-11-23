import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { bahnFelder } from '../src/core/nordviertel';
import type { Abschnitt, Objekt } from '../src/core/typen';
import { bauFortschritt, zeichneBaustelle } from '../src/render/bahn';
import { Effekte } from '../src/render/effekte';
import { schatten } from '../src/render/farben';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { szenenSchluessel } from '../src/render/szene-schluessel';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { neu } from './hilfen';
import { aufnahme, leeresDorf } from './hilfen/nr22';

// NR27 P5b4 Baustelle (DESIGN 14.5 „Bau“, 14.8, 14.9, 14.15 Punkt 14). Muster wie tests/nr27-p5b3-zug.test.ts.
//
// Werte von Hand: Zoom 1,4 bei 844×390 → tw = 36,4 px (wie P5b3). Startgrube (10|−1), Zielgrube (10|−4), je 0,7 × 0,7 Feld.
// Die Bohrlinie läuft vom Nordrand der Startgrube (y = −1 − 0,35 = −1,35) zum Südrand der Zielgrube (y = −4 + 0,35 = −3,65),
// also 2,3 Felder. Bohrkopf bei y = −1,35 − 2,3 · Fortschritt: 0 % → −1,35; 30 % → −2,04; 50 % → −2,5 (zwischen den Gleisen,
// Prüfliste 14.13 Punkt 12); 80 % → −3,19; 100 % → −3,65.
// Farben DESIGN 14.9: `bohrgeraet` '#f0a53a', `bohrlinie` '#4a2c14', `grube_boden` '#5f4532'; Abgas `rauch_hell` '#ffffff'.
// Zittern ±1 px mit Periode 180 ms: bei zeit_s = 0,045 (Viertelperiode) liegt die Haube genau 1 px höher als bei 0.
const BOHRGERAET = '#f0a53a', BOHRLINIE = '#4a2c14', GRUBE_BODEN = '#5f4532', RAUCH = '#ffffff';
/** Deckel des Geräts: Maler.quader hellt die Oberseite auf (Lichtregel), nur um die Fläche wiederzufinden. */
const HAUBE = schatten(BOHRGERAET, 0.14);

function kamera(): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = 1.4; k.zentrieren(10, -2.5, 1);
  return k;
}
/** Heizzentrale weit im Süden, außerhalb des Bilds: berechneNetz braucht einen Ursprung. */
const HZ = neu('hz', 11, 30);
/** einmal gerechnet: jedes berechneNetz bekommt eine neue Nummer, die im Szenenschlüssel steht */
const NETZ = berechneNetz([HZ], [], 1);
const szene = (extra: Partial<Szene> = {}): Szene => ({
  objekte: [HZ] as Objekt[], innen: [], netz: NETZ, spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 300_000, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46,
  bahn: bahnFelder(), ...extra,
});
function spielMit(abschnitt: Abschnitt | undefined) {
  const { s } = leeresDorf(1_700_000_000_000);
  s.stand.abschnitt = abschnitt;
  return s;
}
const imBau: Abschnitt = { phase: 'bau', mit_querung: true, bau: { art: 'neu', start_ms: 0, ende_ms: 1_000_000 } };

function bild(s: Szene, reduziert = true, zeit_s = 0): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  m.reduziert = reduziert; m.zeit_s = zeit_s;
  bodenEbeneEinrichten(null);
  zeichneSzene(m, kamera(), s, new Effekte(), 0.016);
  return a.befehle;
}
function baustelle(fortschritt: number, reduziert: boolean, zeit_s: number): string[] {
  const a = aufnahme(), m = new Maler(a.X), k = kamera();
  m.reduziert = reduziert; m.zeit_s = zeit_s; m.tw = k.tw; m.th = k.th;
  m.dreh_cos = Math.cos(k.winkel_rad); m.dreh_sin = Math.sin(k.winkel_rad);
  zeichneBaustelle(m, k, fortschritt);
  return a.befehle;
}
const nah = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
const zahlen = (c: string): number[] => c.slice(c.indexOf('(') + 1, -1).split(',').map(Number);
/** Mittelpunkte aller Kreise, die danach in `farbe` gefüllt werden. */
function kreiseIn(b: string[], farbe: string): Array<[number, number]> {
  const r: Array<[number, number]> = [];
  b.forEach((c, i) => { if (c.startsWith('arc(') && b[i + 1] === `fillStyle=${farbe}`) { const [x, y] = zahlen(c); r.push([x, y]); } });
  return r;
}
const kommtVor = (b: string[], farbe: string): boolean => b.some((c) => c === `fillStyle=${farbe}` || c === `strokeStyle=${farbe}`);
/** Kleinstes y aller Punkte (moveTo/lineTo), die gezeichnet werden, solange `farbe` als Füllung gilt. */
function obersteKante(b: string[], farbe: string): number {
  let aktiv = false, y = Infinity, offen: number[] = [];
  for (const c of b) {
    if (c === 'beginPath()') offen = [];
    if (c.startsWith('moveTo(') || c.startsWith('lineTo(')) offen.push(zahlen(c)[1]);
    if (c.startsWith('fillStyle=')) aktiv = c === `fillStyle=${farbe}`;
    if (c === 'fill()' && aktiv) y = Math.min(y, ...offen);
  }
  return y;
}

describe('NR27 P5b4 Baustelle nur, solange die Querung gebaut wird (14.15 Punkt 14, 22)', () => {
  // Fehler, die ihn rot machen: zeichneSzene zeichnet die Baustelle nie, immer, schon in der Planung oder bei jedem Abschnitt
  // ohne Querung – statt nur bei querungImBau.
  it('test_nr27_baustelle_nur_im_bau: Gruben und Bohrgerät nur bei einem Abschnitt mit Querung in der Bauphase', () => {
    expect(kommtVor(bild(szene({ spiel: spielMit(imBau) })), BOHRGERAET), 'Querung im Bau').toBe(true);
    expect(kommtVor(bild(szene({ spiel: spielMit(imBau) })), GRUBE_BODEN), 'Querung im Bau: Grube').toBe(true);
    const ohneQuerung: Abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: 0, ende_ms: 1_000_000 } };
    const planung: Abschnitt = { phase: 'planung', mit_querung: true, bau: { art: 'neu', start_ms: 0, ende_ms: 1_000_000 } };
    for (const [name, s] of [
      ['ohne Spiel', szene()], ['ohne Abschnitt', szene({ spiel: spielMit(undefined) })],
      ['Abschnitt ohne Querung im Bau', szene({ spiel: spielMit(ohneQuerung) })], ['Querung in der Planung', szene({ spiel: spielMit(planung) })],
    ] as const) {
      const b = bild(s);
      expect(kommtVor(b, BOHRGERAET) || kommtVor(b, GRUBE_BODEN) || kommtVor(b, BOHRLINIE), name).toBe(false);
    }
  });

  // Fehler, der ihn rot macht: der Szenenschlüssel kennt mit_querung nicht – ein Wechsel ohne andere Änderung bliebe ohne neues Bild.
  it('test_nr27_baustelle_schluessel: Querung im Abschnitt ändert den Szenenschlüssel', () => {
    const ohne: Abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: 0, ende_ms: 1_000_000 } };
    expect(szenenSchluessel(szene({ spiel: spielMit(imBau) }))).not.toBe(szenenSchluessel(szene({ spiel: spielMit(ohne) })));
  });
});

describe('NR27 P5b4 Bohrlinie und Bohrkopf nach dem Baufortschritt (DESIGN 14.5 „Bohrlinie = Fortschritt“)', () => {
  // Fehler, die ihn rot machen: Fortschritt nicht aus start_ms … ende_ms, nicht auf 0 … 1 begrenzt, oder auch ohne Querung im Bau.
  it('test_nr27_bau_fortschritt: Anteil der Bauzeit, begrenzt auf 0 … 1, null ohne Querung im Bau', () => {
    expect(bauFortschritt({ abschnitt: imBau }, 300_000)).toBe(0.3);
    expect(bauFortschritt({ abschnitt: imBau }, 800_000)).toBe(0.8);
    expect(bauFortschritt({ abschnitt: imBau }, -5_000), 'vor dem Start').toBe(0);
    expect(bauFortschritt({ abschnitt: imBau }, 1_000_000), 'genau am Ende').toBe(1);
    expect(bauFortschritt({ abschnitt: imBau }, 9_000_000), 'nach dem Ende').toBe(1);
    expect(bauFortschritt({ abschnitt: { ...imBau, bau: { art: 'neu', start_ms: 1000, ende_ms: 3000 } } }, 1500)).toBe(0.25);
    expect(bauFortschritt({ abschnitt: { ...imBau, phase: 'planung' } }, 300_000)).toBeNull();
    expect(bauFortschritt({ abschnitt: { phase: 'bau', bau: imBau.bau } }, 300_000)).toBeNull();
    expect(bauFortschritt({ abschnitt: undefined }, 300_000)).toBeNull();
  });

  // Fehler, die ihn rot machen: der Bohrkopf steht fest, wandert in die falsche Richtung, startet nicht am Grubenrand oder
  // zeichneSzene gibt nicht den Fortschritt aus dem Abschnitt weiter.
  it('test_nr27_bohrkopf_lage: Bohrkopf bei 0, 30, 50, 80 und 100 % an der von Hand gerechneten Stelle', () => {
    const k = kamera();
    for (const [f, y] of [[0, -1.35], [0.3, -2.04], [0.5, -2.5], [0.8, -3.19], [1, -3.65]]) {
      const [cx, cy] = k.mitte(10, y), koepfe = kreiseIn(baustelle(f, true, 0), BOHRGERAET);
      expect(koepfe.filter(([x, yy]) => nah(x, cx) && nah(yy, cy)), `Fortschritt ${f}`).toHaveLength(1);
    }
    const [cx, cy] = k.mitte(10, -2.04);
    const ganzeSzene = kreiseIn(bild(szene({ spiel: spielMit(imBau), jetzt_ms: 300_000 })), BOHRGERAET);
    expect(ganzeSzene.filter(([x, yy]) => nah(x, cx) && nah(yy, cy)), 'Szene bei 300 von 1000 s').toHaveLength(1);
  });

  // Fehler, der ihn rot macht: die Bohrlinie fehlt, ist nicht gestrichelt oder reicht nicht bis zum Bohrkopf.
  it('test_nr27_bohrlinie: gestrichelt vom Grubenrand bis zum Bohrkopf', () => {
    const k = kamera(), b = baustelle(0.8, true, 0);
    // Strich-Zustand bei jedem Punkt mitschreiben (Farbe und Strichelung), wie zuege() in nr27-p5b3-querung
    let farbe = '', strichel = false;
    const danach: string[] = [];
    for (const c of b) {
      if (c.startsWith('strokeStyle=')) farbe = c.slice(12);
      else if (c.startsWith('setLineDash(')) strichel = c !== 'setLineDash([])';
      else if ((c.startsWith('moveTo(') || c.startsWith('lineTo(')) && farbe === BOHRLINIE) {
        expect(strichel, 'gestrichelt').toBe(true);
        danach.push(c);
      }
    }
    const [x0, y0] = k.mitte(10, -1.35), [x1, y1] = k.mitte(10, -3.19);
    expect(danach.some((c) => c.startsWith('moveTo(') && nah(zahlen(c)[0], x0) && nah(zahlen(c)[1], y0)), 'Anfang am Grubenrand').toBe(true);
    expect(danach.some((c) => c.startsWith('lineTo(') && nah(zahlen(c)[0], x1) && nah(zahlen(c)[1], y1)), 'Ende am Bohrkopf').toBe(true);
  });
});

describe('NR27 P5b4 Leben der Baustelle nur bei Animation an (DESIGN 14.5 „Leben“, 14.8)', () => {
  // Fehler, die ihn rot machen: die Haube zittert nicht, zittert mehr als 1 px, oder zittert auch bei weniger Bewegung.
  it('test_nr27_bohrgeraet_zittern: Haube bei Viertelperiode 1 px höher, bei weniger Bewegung fest', () => {
    const ruhig = obersteKante(baustelle(0.5, false, 0), HAUBE);
    expect(ruhig).toBeLessThan(Infinity);
    expect(obersteKante(baustelle(0.5, false, 0.045), HAUBE)).toBeCloseTo(ruhig - 1, 6);
    expect(obersteKante(baustelle(0.5, false, 0.135), HAUBE), 'Dreiviertelperiode').toBeCloseTo(ruhig + 1, 6);
    expect(obersteKante(baustelle(0.5, true, 0.045), HAUBE), 'weniger Bewegung').toBeCloseTo(ruhig, 6);
  });

  // Fehler, die ihn rot machen: kein Abgas, Abgas auch bei weniger Bewegung, oder ein anderer Zyklus als 2,4 s.
  it('test_nr27_abgas: Wölkchen nur bei Animation an, Zyklus 2,4 s', () => {
    // auf 1/1000 px gerundet: 0,6 + 2,4 liegt im Gleitkomma nicht exakt auf 3,0
    const wolken = (reduziert: boolean, t: number): string[] => kreiseIn(baustelle(0.5, reduziert, t), RAUCH).map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`);
    expect(wolken(false, 0.6).length, 'Animation an').toBeGreaterThan(0);
    expect(wolken(true, 0.6), 'weniger Bewegung').toHaveLength(0);
    expect(wolken(false, 0.6 + 2.4)).toEqual(wolken(false, 0.6));
    expect(wolken(false, 0.6 + 1.2)).not.toEqual(wolken(false, 0.6));
  });
});
