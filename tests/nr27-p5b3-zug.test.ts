import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { bahnFelder } from '../src/core/nordviertel';
import type { Objekt } from '../src/core/typen';
import { zugImBild, zugLage, zugTeile } from '../src/render/bahn';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { animationBedarf } from '../src/render/szene-schluessel';
import { neu } from './hilfen';
import { aufnahme, leeresDorf } from './hilfen/nr22';

// NR27 P5b3 (DESIGN 14.3, 14.8, 14.9, 14.15 Punkte 9 und 22): Zug zeichnen, Takt „flüssig“ nur im Bild, kein Zug bei
// weniger Bewegung/Sparmodus und während des Querungsbaus. Muster wie tests/nr27-p5b2-bahnzone.test.ts.
//
// Fahrplan von Hand (render/bahn.ts, zugLage): Takt 0 beginnt bei 0 ms ohne Versatz (Streuung von 0 ist 0), die Fahrt dauert
// (27 + 4) Felder / 3 Felder/s ≈ 10,33 s. Takt 0 ist gerade → Gleis 2 (y = −2,72) nach Osten, Spitze bei −2 + 3 · t_s.
// Bei 4000 ms steht die Spitze also bei x = 10, der Zug reicht von x = 6 bis 10. Bei 50 000 ms fährt kein Zug (nächster Takt
// erst nach 130 s). Fensterband `bahn.zug_fenster` = '#2f3d48' (DESIGN 14.9), Mast '#3f4549'.
const FENSTER = 'fillStyle=#2f3d48', MAST = 'strokeStyle=#3f4549', FAHRT_MS = 4000, PAUSE_MS = 50_000;

const hz = [neu('hz', 11, 30)];
const szene = (extra: Partial<Szene>, objekte: Objekt[] = hz): Szene => ({
  objekte, innen: [], netz: berechneNetz(objekte, [], 1), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: FAHRT_MS, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46,
  bahn: bahnFelder(), ...extra,
});
function kamera(mitte: [number, number], zoom: number): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = zoom; k.zentrieren(mitte[0], mitte[1], 1);
  return k;
}
function bild(s: Szene, reduziert: boolean, k = kamera([8, -2.5], 1.4)): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  m.reduziert = reduziert;
  bodenEbeneEinrichten(null);
  zeichneSzene(m, k, s, new Effekte(), 0.016);
  return a.befehle;
}
const zahl = (b: string[], marke: string): number => b.filter((x) => x === marke).length;

describe('NR27 P5b3 Zug: Form und Lage (DESIGN 14.3 „Form“)', () => {
  // Fehler, die ihn rot machen: Wagen hinter statt vor der Spitze, falsche Länge, Wagen nicht am Gleisende abgeschnitten.
  it('test_nr27_zug_form: Lok vorn, Wagen dahinter, je 2 Felder, zusammen 4; am Gleisende abgeschnitten', () => {
    expect(zugTeile({ gleis_y: -2.72, kopf_x: 10, richtung: 1 })).toEqual([
      { von_x: 8, bis_x: 10, gleis_y: -2.72, lok: true },
      { von_x: 6, bis_x: 8, gleis_y: -2.72, lok: false },
    ]);
    expect(zugTeile({ gleis_y: -2.28, kopf_x: 10, richtung: -1 })).toEqual([
      { von_x: 10, bis_x: 12, gleis_y: -2.28, lok: true },
      { von_x: 12, bis_x: 14, gleis_y: -2.28, lok: false },
    ]);
    // Gleise reichen von x = −2 bis 25 (Feldränder −2,5 und 25,5): was darüber hinausragt, steckt noch im Wolkenrand
    expect(zugTeile({ gleis_y: -2.72, kopf_x: -1, richtung: 1 })).toEqual([{ von_x: -2.5, bis_x: -1, gleis_y: -2.72, lok: true }]);
    expect(zugTeile({ gleis_y: -2.28, kopf_x: 27, richtung: -1 })).toEqual([]);
    expect(zugTeile({ gleis_y: -2.72, kopf_x: 28, richtung: 1 })).toEqual([{ von_x: 24, bis_x: 25.5, gleis_y: -2.72, lok: false }]);
  });
});

describe('NR27 P5b3 Zug im Bild (14.15 Punkt 9)', () => {
  it('Testaufbau: bei 4000 ms fährt der Zug auf Gleis 2 mit der Spitze bei x = 10, bei 50 000 ms keiner', () => {
    expect(zugLage(FAHRT_MS, null)).toEqual({ gleis_y: -2.72, kopf_x: 10, richtung: 1 });
    expect(zugLage(PAUSE_MS, null)).toBeNull();
  });

  // Fehler, die ihn rot machen: Zug wird nie gezeichnet, oder er wird auch zwischen den Fahrten gezeichnet.
  it('test_nr27_zug_gezeichnet: mit Animation zwei Wagen mit Fensterband, zwischen den Fahrten keiner', () => {
    expect(zahl(bild(szene({}), false), FENSTER), 'Fensterband auf beiden sichtbaren Seiten je Wagen').toBeGreaterThanOrEqual(2);
    expect(zahl(bild(szene({ jetzt_ms: PAUSE_MS }), false), FENSTER), 'zwischen den Fahrten').toBe(0);
    expect(zahl(bild(szene({ bahn: undefined }), false), FENSTER), 'ohne Bahn (Nachbardorf)').toBe(0);
  });

  // Fehler, der ihn rot macht: der Zug wird auch bei „Weniger Bewegung“/Sparmodus (Maler.reduziert) gezeichnet – er stünde still.
  it('test_nr27_zug_weniger_bewegung: bei Weniger Bewegung und im Sparmodus fährt und steht kein Zug', () => {
    expect(zahl(bild(szene({}), true), FENSTER)).toBe(0);
  });

  // Fehler, der ihn rot macht: zeichneSzene fragt zugLage ohne den Spielstand – dann fährt der Zug über die Baustelle.
  it('test_nr27_zug_pausiert: während ein Abschnitt mit Querung gebaut wird, fährt kein Zug', () => {
    const { s: sp } = leeresDorf(1_700_000_000_000);
    sp.stand.abschnitt = { phase: 'bau', mit_querung: true, bau: { art: 'neu', start_ms: -1000, ende_ms: 3_600_000 } };
    expect(zahl(bild(szene({ spiel: sp }), false), FENSTER), 'Querung im Bau').toBe(0);
    sp.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: -1000, ende_ms: 3_600_000 } };
    expect(zahl(bild(szene({ spiel: sp }), false), FENSTER), 'Gegenprobe: Abschnitt ohne Querung').toBeGreaterThanOrEqual(2);
  });

  // Fehler, die ihn rot machen: der Zug wird als Ganzes nach allen Objekten gezeichnet (läge über Häusern davor) oder als ein
  // Block außerhalb der Tiefenliste der Masten. Tiefe von Hand bei Winkel 0 (x + y + 1): Wagen 6…8 → 5,28; Mast x = 8 auf
  // y = −3,26 → 5,74; Lok 8…10 → 7,28; Haus (8|−1) auf dem Grünstreifen → 8. Reihenfolge also Wagen, Mast 8, Lok, Haus.
  it('test_nr27_zug_tiefe: Wagen und Lok einzeln in der Tiefenliste mit den Masten, Haus davor kommt danach', () => {
    const b = bild(szene({}, [...hz, neu('efh', 8, -1)]), false);
    const fenster = b.flatMap((x, i) => (x === FENSTER ? [i] : []));
    expect(fenster.length).toBeGreaterThanOrEqual(2);
    const erstes = fenster[0], letztes = fenster[fenster.length - 1];
    expect(b.slice(erstes, letztes).includes(MAST), 'ein Mast zwischen Wagen und Lok').toBe(true);
    const haus = b.indexOf('fillStyle=#6996ad');
    expect(haus, 'Testaufbau: Haus mit kalten Fenstern gezeichnet').toBeGreaterThan(-1);
    expect(haus, 'Haus vor der Bahn liegt über dem Zug').toBeGreaterThan(letztes);
  });
});

describe('NR27 P5b3 Takt: „flüssig“ nur, solange der Zug im Bild ist (DESIGN 14.3 „Takt“)', () => {
  // Ohne Fluss, Kulisse und Last ist die Szene sonst ruhig ('keine'), so zählt nur der Zug.
  // Fehler, die ihn rot machen: animationBedarf kennt den Zug nicht, oder fragt die Kamera nicht (flüssig auch außer Sicht).
  it('test_nr27_zug_takt: im Bild flüssig, außer Sicht und zwischen den Fahrten keine', () => {
    const imBild = kamera([8, -2.5], 1.4), weg = kamera([10, 40], 2.2);
    expect(animationBedarf(szene({ jetzt_ms: PAUSE_MS }), false, imBild), 'Gegenprobe: ruhige Szene').toBe('keine');
    expect(animationBedarf(szene({}), false, imBild), 'Zug im Bild').toBe('fluessig');
    expect(animationBedarf(szene({}), false, weg), 'Zug außerhalb des Bildes').toBe('keine');
    expect(animationBedarf(szene({ bahn: undefined }), false, imBild), 'ohne Bahn').toBe('keine');
  });

  it('test_nr27_zug_takt: Querung im Bau → kein Zug, kein Bedarf; ohne Kamera zählt ein fahrender Zug (nie ein eingefrorener)', () => {
    const { s: sp } = leeresDorf(1_700_000_000_000);
    sp.stand.abschnitt = { phase: 'bau', mit_querung: true, bau: { art: 'neu', start_ms: -1000, ende_ms: 3_600_000 } };
    expect(animationBedarf(szene({ spiel: sp }), false, kamera([8, -2.5], 1.4))).toBe('keine');
    expect(animationBedarf(szene({}), false)).toBe('fluessig');
  });

  // Fehler, die ihn rot machen: der Rand um das Bild ist viel zu groß (Zug weit außerhalb zählt) oder fehlt (der Stromabnehmer
  // ragt ins Bild, der Takt bleibt aber ruhig). Rand von Hand: Fahrdrahthöhe 0,5 Kachel = 0,5 · 57,2 = 28,6 px bei Zoom 2,2.
  it('test_nr27_zug_takt: Spitze am linken Bildrand – knapp außerhalb des Rands zählt nicht, knapp innerhalb schon', () => {
    const k = kamera([9, -8], 2.2);
    expect(k.tw).toBeCloseTo(57.2, 6);
    // Östlichster Bildpunkt des Zugs ist die Spitze an der Nordkante des Kastens (y = −2,72 − 0,14); Bildhöhe liegt innen
    const [aus_px, aus_py] = k.mitte(-2, -2.86), [ein_px] = k.mitte(-1.5, -2.86);
    expect(aus_px, 'Testaufbau: Spitze bei x = −2 außerhalb von −28,6 px').toBeLessThan(-28.6);
    expect(ein_px, 'Testaufbau: Spitze bei x = −1,5 links vom Bild, aber im Rand').toBeGreaterThan(-28.6);
    expect(ein_px).toBeLessThan(0);
    expect(aus_py).toBeGreaterThan(0); expect(aus_py).toBeLessThan(390);
    expect(zugImBild(k, { gleis_y: -2.72, kopf_x: -2, richtung: 1 }), 'außerhalb des Rands').toBe(false);
    expect(zugImBild(k, { gleis_y: -2.72, kopf_x: -1.5, richtung: 1 }), 'im Rand').toBe(true);
    expect(zugImBild(kamera([8, -2.5], 1.4), { gleis_y: -2.72, kopf_x: 10, richtung: 1 }), 'mitten im Bild').toBe(true);
  });
});

describe('NR27 P5b3 Takt: die Bildschleife gibt die Kamera mit', () => {
  // Fehler, der ihn rot macht: main.ts ruft animationBedarf ohne Kamera – dann hält ein Zug außer Sicht den Takt flüssig.
  it('test_nr27_zug_takt main.ts: animationBedarf bekommt die Kamera der Karte', () => {
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main).toMatch(/animationBedarf\(\s*szene\s*,\s*effekte_aktiv\s*,\s*kamera\s*\)/);
    expect(main).toMatch(/const kamera = steuerung\.kamera;/);
  });
});
