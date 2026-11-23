import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { bahnFelder } from '../src/core/nordviertel';
import type { Objekt } from '../src/core/typen';
import { zugLage } from '../src/render/bahn';
import { Kamera } from '../src/render/kamera';
import { animationBedarf } from '../src/render/szene-schluessel';
import { neu } from './hilfen';
import { leeresDorf } from './hilfen/nr22';

// NR27 P5d-2: Randfälle zu DESIGN 14.5 „Leben“ – „Takt ‚flüssig‘ nur, solange die Baustelle im Bild ist“ (Querung im Bau,
// Animation an). Ergänzt tests/nr27-p5d-baustelle-takt.test.ts (dort nur „mitten im Bild“ und „weit weg“); Aufbau wie dort.
//
// Werte von Hand (DESIGN 14.5 Skizze, src/render/bahn.ts BAUSTELLE): Startgrube (10|−1), Zielgrube (10|−4), je 0,7 × 0,7 Feld.
// Bodenfläche der Baustelle also x 9,65 … 10,35, y −4,35 … −0,65. Bildschirm 844 × 390.
// Bohrgerät, Baken und Abgas ragen nach oben über die Gruben hinaus (Größenordnung bis knapp eine halbe Kachel). Wie weit genau,
// ist eine Grafik-Schätzung; deshalb prüfen diese Tests nur Lagen mit deutlichem Abstand vom Bildrand: 2,5 Kacheln (gemessen ab
// dem nächstgelegenen Eckpunkt der Bodenfläche) innen bzw. außen, nie die genaue Randkachel.
// Zeit 50 000 ms: mitten im Bau, kein Zug unterwegs – allein die Baustelle kann den Takt flüssig machen.
const BAU = { start_ms: -1000, ende_ms: 3_600_000 }, RUHIG_MS = 50_000, ABSTAND_KACHELN = 2.5;
const ECKEN: Array<[number, number]> = [[9.65, -4.35], [10.35, -4.35], [9.65, -0.65], [10.35, -0.65]];

const hz = [neu('hz', 11, 30)];
const szene = (extra: Partial<Parameters<typeof animationBedarf>[0]>, objekte: Objekt[] = hz): Parameters<typeof animationBedarf>[0] => ({
  objekte, innen: [], netz: berechneNetz(objekte, [], 1), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: RUHIG_MS, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46,
  bahn: bahnFelder(), ...extra,
});
function spielImBau() {
  const { s } = leeresDorf(1_700_000_000_000);
  s.stand.abschnitt = { phase: 'bau', mit_querung: true, bau: { art: 'neu', ...BAU } };
  return s;
}
const imBau = () => szene({ spiel: spielImBau() });

/** Kamera wie in nr27-p5d-baustelle-takt, auf die Baustelle zentriert. */
function kamera(zoom: number): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = zoom; k.zentrieren(10, -2.5, 1);
  return k;
}
/** Bildpunkte der vier Ecken der Bodenfläche. */
const ecken = (k: Kamera): Array<[number, number]> => ECKEN.map(([x, y]) => k.mitte(x, y));
const ys = (k: Kamera): number[] => ecken(k).map((p) => p[1]);
const xs = (k: Kamera): number[] => ecken(k).map((p) => p[0]);

/** Verschiebt die Kamera senkrecht so, dass die Bodenfläche mit `abstand` Kacheln unter dem unteren Bildrand beginnt
 *  (positiv = unterhalb des Bilds, gemessen an der obersten Ecke) bzw. mit `abstand` Kacheln über dem Rand endet
 *  (negativ = im Bild, gemessen an der untersten Ecke). */
function amUnterenRand(zoom: number, abstand: number): Kamera {
  const k = kamera(zoom);
  const ziel = abstand > 0 ? k.hoehe + abstand * k.tw - Math.min(...ys(k)) : k.hoehe + abstand * k.tw - Math.max(...ys(k));
  k.schiebe_y += ziel;
  return k;
}
/** Ebenso am oberen Rand: positiv = über dem Bild (gemessen an der untersten Ecke), negativ = im Bild (oberste Ecke). */
function amOberenRand(zoom: number, abstand: number): Kamera {
  const k = kamera(zoom);
  const ziel = abstand > 0 ? -abstand * k.tw - Math.max(...ys(k)) : -abstand * k.tw - Math.min(...ys(k));
  k.schiebe_y += ziel;
  return k;
}
/** Links/rechts: positiv = außerhalb, gemessen an der nächstgelegenen Ecke. */
function amLinkenRand(zoom: number, abstand: number): Kamera {
  const k = kamera(zoom);
  k.schiebe_x += -abstand * k.tw - Math.max(...xs(k));
  return k;
}
function amRechtenRand(zoom: number, abstand: number): Kamera {
  const k = kamera(zoom);
  k.schiebe_x += k.breite + abstand * k.tw - Math.min(...xs(k));
  return k;
}
const waagrechtInnen = (k: Kamera): boolean => Math.min(...xs(k)) > 2 * k.tw && Math.max(...xs(k)) < k.breite - 2 * k.tw;
const senkrechtInnen = (k: Kamera): boolean => Math.min(...ys(k)) > 2 * k.tw && Math.max(...ys(k)) < k.hoehe - 2 * k.tw;

// Zwei Zoomstufen (Standard am Handy 2,2 und weit herausgezoomt 1,4), damit kein fester Bildpunktwert zufällig passt.
const ZOOMS = [1.4, 2.2];

describe('NR27 P5d-2 Baustelle am unteren Bildrand (DESIGN 14.5 „Leben“)', () => {
  it.each(ZOOMS)('Testaufbau (Zoom %s): Lagen haben den verlangten Abstand, waagrecht liegt die Baustelle innen', (zoom) => {
    const r = ABSTAND_KACHELN;
    const unten_aus = amUnterenRand(zoom, r), unten_ein = amUnterenRand(zoom, -r);
    expect(Math.min(...ys(unten_aus)) - unten_aus.hoehe, 'oberste Ecke 2,5 Kacheln unter dem Bild').toBeCloseTo(r * unten_aus.tw, 6);
    expect(unten_ein.hoehe - Math.max(...ys(unten_ein)), 'unterste Ecke 2,5 Kacheln über dem Rand').toBeCloseTo(r * unten_ein.tw, 6);
    expect(Math.min(...ys(unten_ein)), 'ganz im Bild').toBeGreaterThan(0);
    expect(waagrechtInnen(unten_aus)).toBe(true);
    expect(waagrechtInnen(unten_ein)).toBe(true);
    expect(zugLage(RUHIG_MS, null), 'bei 50 000 ms fährt kein Zug').toBeNull();
  });

  // Fehler, der ihn rot macht: die Prüfung „im Bild“ ignoriert den unteren Rand (oder hat dort einen viel zu großen Zuschlag) –
  // dann hält eine Baustelle knapp unter dem Bild die Karte auf 30 Bildern/s.
  it.each(ZOOMS)('test_nr27_baustelle_rand (Zoom %s): 2,5 Kacheln unter dem unteren Rand → nicht flüssig', (zoom) => {
    expect(animationBedarf(imBau(), false, amUnterenRand(zoom, ABSTAND_KACHELN))).not.toBe('fluessig');
  });

  // Fehler, der ihn rot macht: der untere Rand ist zu streng (z. B. Vergleich mit der falschen Ecke oder ohne Zoom) – dann steht
  // die sichtbare Baustelle unten im Bild still.
  it.each(ZOOMS)('test_nr27_baustelle_rand (Zoom %s): ganz im Bild, 2,5 Kacheln über dem unteren Rand → flüssig', (zoom) => {
    expect(animationBedarf(imBau(), false, amUnterenRand(zoom, -ABSTAND_KACHELN))).toBe('fluessig');
  });

  // Gegenprobe zur Lage: weit unter dem Bild (6 Kacheln) ebenfalls nicht flüssig.
  it.each(ZOOMS)('test_nr27_baustelle_rand (Zoom %s): 6 Kacheln unter dem unteren Rand → nicht flüssig', (zoom) => {
    expect(animationBedarf(imBau(), false, amUnterenRand(zoom, 6))).not.toBe('fluessig');
  });
});

describe('NR27 P5d-2 Baustelle an den übrigen Bildrändern (DESIGN 14.5 „Leben“)', () => {
  it.each(ZOOMS)('Testaufbau (Zoom %s): Lagen oben/links/rechts mit 2,5 Kacheln Abstand', (zoom) => {
    const r = ABSTAND_KACHELN;
    const o_aus = amOberenRand(zoom, r), o_ein = amOberenRand(zoom, -r);
    expect(-Math.max(...ys(o_aus)), 'unterste Ecke über dem Bild').toBeCloseTo(r * o_aus.tw, 6);
    expect(Math.min(...ys(o_ein)), 'oberste Ecke unter dem oberen Rand').toBeCloseTo(r * o_ein.tw, 6);
    expect(Math.max(...ys(o_ein))).toBeLessThan(o_ein.hoehe);
    const l = amLinkenRand(zoom, r), re = amRechtenRand(zoom, r);
    expect(-Math.max(...xs(l))).toBeCloseTo(r * l.tw, 6);
    expect(Math.min(...xs(re)) - re.breite).toBeCloseTo(r * re.tw, 6);
    for (const k of [o_aus, o_ein]) expect(waagrechtInnen(k)).toBe(true);
    for (const k of [l, re]) expect(senkrechtInnen(k)).toBe(true);
  });

  // Fehler, der ihn rot macht: eine Seite des Bilds wird nicht geprüft – Baustelle außer Sicht hält den Takt flüssig.
  it.each(ZOOMS)('test_nr27_baustelle_rand (Zoom %s): 2,5 Kacheln über / links / rechts außerhalb → nicht flüssig', (zoom) => {
    const r = ABSTAND_KACHELN;
    expect(animationBedarf(imBau(), false, amOberenRand(zoom, r)), 'oben').not.toBe('fluessig');
    expect(animationBedarf(imBau(), false, amLinkenRand(zoom, r)), 'links').not.toBe('fluessig');
    expect(animationBedarf(imBau(), false, amRechtenRand(zoom, r)), 'rechts').not.toBe('fluessig');
  });

  // Fehler, der ihn rot macht: oberer Rand zu streng – Baustelle knapp unter dem oberen Bildrand steht still.
  it.each(ZOOMS)('test_nr27_baustelle_rand (Zoom %s): ganz im Bild, 2,5 Kacheln unter dem oberen Rand → flüssig', (zoom) => {
    expect(animationBedarf(imBau(), false, amOberenRand(zoom, -ABSTAND_KACHELN))).toBe('fluessig');
  });
});
