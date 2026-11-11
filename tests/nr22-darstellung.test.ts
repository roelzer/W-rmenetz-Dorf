import { describe, expect, it } from 'vitest';
import { KONSTANTEN } from '../src/core/katalog';
import { berechneNetz } from '../src/core/netz';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { szenenSchluessel } from '../src/render/szene-schluessel';
import { neu } from './hilfen';
import { aufnahme } from './hilfen/nr22';

// Bauplan NR20-22 P7, DESIGN 13.17.3. Werte von Hand: 25er-Farbe '#d8392f' und Breite 0,06 (core/katalog.ts), Warngelb '#ffc531'
// und Kontur '#3b1d0a' (design/tokens.json menue.farbe). Kamera 844×390, Zoom 2 → Grundmaß min(844 / 26, 390 / 15) = 26
// (kamera.ts, N = 24), Feldbreite tw = 52; Rohr w = max(2, 52 × 0,06) = 3,12 → ohne Überlast dunkle Kante w + 2 = 5,12.
// Tester-Vorarbeit P7e (DESIGN 13.17.11 H1, ersetzt den Saum aus 13.17.3): Gelb ersetzt nur die dunkle Kante, w + 2 = 5,12
// (1 px je Seite), keine Außenlinie – die Leitung ist mit Überlast genau so breit wie ohne.

const N = KONSTANTEN.feldanzahl;
const D25 = '#d8392f', GELB = '#ffc531', KONTUR = '#3b1d0a';


// Heizzentrale 2×2 ab (11|10), gebaute 25er (10|10) → (6|10): fünf Felder Tiefe 1…5
const objekte = [neu('hz', 11, 10), ...[10, 9, 8, 7, 6].map((x) => neu('d25', x, 10))];
const F = (x: number): number => 10 * N + x;
const netz = berechneNetz(objekte, [], 1);
for (const x of [10, 9, 8, 7, 6]) netz.kapazitaet_ok.set(F(x), false);
const STUECK = { felder: [F(10), F(9), F(8), F(7), F(6)], dreiecke: [F(10)], geplant: false, seit_ms: 0 };
const szene = (extra: Partial<Szene>): Szene => ({
  objekte, innen: [], netz, spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 10_000, strassen: [], fluss: [], kw_anzeigen: false, ...extra,
});
function bild(s: Szene, zeit_s = 0, reduziert = false): string[] {
  const a = aufnahme(), m = new Maler(a.X), k = new Kamera();
  k.groesseSetzen(844, 390, 1); k.zoom = 2; k.zentrieren(9, 10, 1);
  m.reduziert = reduziert; m.zeit_s = zeit_s;
  bodenEbeneEinrichten(null);
  zeichneSzene(m, k, s, new Effekte(), 0.016);
  return a.befehle;
}
const zahl = (b: string[], marke: string): number => b.filter((x) => x === marke).length;
/** Wie oft wird die Linienbreite auf (ungefähr) `px` gesetzt? Gleitkomma: 3,12 + 6 ergibt nicht genau 9,12. */
const breiten = (b: string[], px: number): number => b.filter((x) => x.startsWith('lineWidth=') && Math.abs(Number(x.slice(10)) - px) < 1e-9).length;

describe('NR22 P7 Darstellung: Farbe bleibt, Saum und Dreieck', () => {
  it('Rohrfarbe = leitung.d25 zu zwei Zeitpunkten 250 ms auseinander, keine Blink-Rottöne, beide Bilder gleich', () => {
    const s = szene({ ueberlast: [STUECK] });
    const a = bild(s, 1), b = bild(s, 1.25);
    expect(zahl(a, `strokeStyle=${D25}`)).toBeGreaterThanOrEqual(5);
    expect(a.join('\n')).not.toMatch(/#ff4a3a|#b8221a/i);
    expect(b).toEqual(a);
  });

  it('Saum gelb auf jedem Feld des Stücks: Gelb w + 2 statt der dunklen Kante, innen das Rohr w, nichts breiter (H1)', () => {
    const b = bild(szene({ ueberlast: [STUECK] }));
    expect(zahl(b, `strokeStyle=${GELB}`)).toBe(5);
    expect(breiten(b, 9.12)).toBe(0);
    expect(breiten(b, 7.12)).toBe(0);
    // je Gelb-Strich die Breite w + 2 = 5,12 (wie die dunkle Kante ohne Überlast), danach das Rohr w = 3,12 in leitung.d25
    const gelb = b.flatMap((x, i) => (x === `strokeStyle=${GELB}` ? [i] : []));
    for (const i of gelb) {
      const nach = b.slice(i);
      expect(Number(nach.find((x) => x.startsWith('lineWidth='))!.slice(10))).toBeCloseTo(5.12, 9);
      const rohr = nach.indexOf(`strokeStyle=${D25}`);
      expect(rohr, 'Rohr folgt auf das Gelb').toBeGreaterThan(0);
      expect(Number(nach.slice(rohr).find((x) => x.startsWith('lineWidth='))!.slice(10))).toBeCloseTo(3.12, 9);
    }
    // ohne Überlast-Stück bleibt die dunkle Kante (w + 2), auch wenn das Netz die Leitung als zu voll führt
    const ohne = bild(szene({}));
    expect(zahl(ohne, `strokeStyle=${GELB}`)).toBe(0);
    expect(breiten(ohne, 5.12)).toBe(5);
  });

  it('Dreieck nur an den Feldern aus `dreiecke`, eins je Eintrag; geplant mit Deckkraft 0,5', () => {
    const ein = bild(szene({ ueberlast: [STUECK] }));
    expect(zahl(ein, `fillStyle=${GELB}`)).toBe(1);
    const zwei = bild(szene({ ueberlast: [{ ...STUECK, dreiecke: [F(10), F(6)] }] }));
    expect(zahl(zwei, `fillStyle=${GELB}`)).toBe(2);
    const geplant = bild(szene({ ueberlast: [{ ...STUECK, geplant: true }] }));
    const i = geplant.indexOf(`fillStyle=${GELB}`);
    expect(geplant.slice(0, i).lastIndexOf('globalAlpha=0.5')).toBeGreaterThan(geplant.slice(0, i).lastIndexOf('globalAlpha=1'));
  });

  it('kein Dreieck an eingezeichneter Leitung (sie steht nicht in `ueberlast`, E5)', () => {
    const plan = [neu('hz', 11, 10), neu('d25', 10, 10, { geplant: true })];
    const pn = berechneNetz(plan, [], 1);
    pn.kapazitaet_ok.set(F(10), false);
    const b = bild(szene({ objekte: plan, netz: pn, ueberlast: [] }));
    expect(b.join('\n')).not.toContain(GELB);
  });

  it('Federn: 100 ms nach seit_ms anders als ruhend, ab 450 ms und bei Weniger Bewegung wie ruhend', () => {
    const zu = (jetzt_ms: number, reduziert = false): string[] => bild(szene({ ueberlast: [{ ...STUECK, seit_ms: 1000 }], jetzt_ms }), 0, reduziert);
    const ruhend = zu(60_000);
    expect(zu(1100)).not.toEqual(ruhend);
    expect(zu(1450)).toEqual(ruhend);
    expect(zu(1100, true)).toEqual(zu(60_000, true));
  });

  it('Szenen-Schlüssel ändert sich mit Überlast (Felder, Dreiecke, geplant) und mit `stecker_blass`', () => {
    const basis = szenenSchluessel(szene({ ueberlast: [STUECK] }));
    expect(szenenSchluessel(szene({ ueberlast: [] }))).not.toBe(basis);
    expect(szenenSchluessel(szene({ ueberlast: [{ ...STUECK, dreiecke: [F(9)] }] }))).not.toBe(basis);
    expect(szenenSchluessel(szene({ ueberlast: [{ ...STUECK, geplant: true }] }))).not.toBe(basis);
    expect(szenenSchluessel(szene({ ueberlast: [STUECK], stecker_blass: true }))).not.toBe(basis);
  });
});

// Tester-Vorarbeit P7t (Review P7 gesamt K3): Verhalten, das es schon gibt – sofort grün.
describe('NR22 P7t Darstellung: fehlende Prüfungen (Saum ohne Außenlinie seit P7e, seit_ms im Schlüssel)', () => {
  const letzte = (b: string[], bis: number, anfang: string): string | undefined => b.slice(0, bis).filter((x) => x.startsWith(anfang)).pop();

  // Tester-Vorarbeit P7e (DESIGN 13.17.11 H1): Die Außenlinie (kontur 0,55) entfällt. Fehler, der ihn rot macht: dunkle Außenlinie
  // um das Gelb bleibt (Leitung wieder breiter als ohne Überlast) oder das Gelb ist nicht voll deckend.
  it('Saum: keine Außenlinie in kontur, keine Deckkraft 0,55, das Gelb voll deckend', () => {
    const b = bild(szene({ ueberlast: [STUECK] }));
    const gelb = b.flatMap((x, i) => (x === `strokeStyle=${GELB}` ? [i] : []));
    expect(gelb).toHaveLength(5);
    for (const i of gelb) {
      const naechsterStroke = b.indexOf('stroke()', i);
      expect(letzte(b, naechsterStroke, 'globalAlpha=') ?? 'globalAlpha=1').toBe('globalAlpha=1');
      // vom Rohrbett dieses Felds (fillStyle rgba(140,100,55,.35), szene.ts) bis zum Gelb: keine Linie in kontur, keine 0,55
      const bett = b.slice(0, i).lastIndexOf('fillStyle=rgba(140,100,55,.35)');
      expect(bett, 'Rohrbett vor dem Gelb').toBeGreaterThan(-1);
      expect(b.slice(bett, i)).not.toContain(`strokeStyle=${KONTUR}`);
      expect(b.slice(bett, i)).not.toContain('globalAlpha=0.55');
    }
  });

  // Fehler, der ihn rot macht: `seit_ms` fehlt im Szenen-Schlüssel – ein neu auftauchendes Stück am selben Ort federt nicht, weil kein neues Bild kommt.
  it('Szenen-Schlüssel ändert sich mit `seit_ms` allein, bei gleichem `seit_ms` bleibt er gleich', () => {
    const mit = (seit_ms: number): string => szenenSchluessel(szene({ ueberlast: [{ ...STUECK, seit_ms }] }));
    expect(mit(5_000)).not.toBe(mit(1_000));
    expect(mit(1_000)).toBe(mit(1_000));
  });
});
