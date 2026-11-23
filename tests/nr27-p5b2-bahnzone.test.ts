import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { bahnFelder, NORD_PLAN, nordFluss, nordKulisse } from '../src/core/nordviertel';
import type { Spiel } from '../src/core/spiel';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { animationBedarf, bodenSchluessel } from '../src/render/szene-schluessel';
import type { Objekt } from '../src/core/typen';
import { neu } from './hilfen';
import { leeresDorf } from './hilfen/nr22';

// NR27 P5b2 (DESIGN 14.2, 14.4, 14.9, 14.15 Punkte 6, 7, 8, 10, 22): statische Bahnzone. Muster wie tests/nr27-p4-nachtrag.test.ts.
// Farben von Hand aus DESIGN 14.9: mast '#3f4549', bake_rot '#d23a2c', schotter '#8f887d', nord_dunst 'rgba(236,242,245,.55)',
// gesperrt_schleier 'rgba(31,42,46,.12)'; Öl-Rauch = tokens farbe.objekt.rauch_oel '#6f6862'; Brunnen-Wasser '#4aa0d8' (gebaeude.ts).
const MAST = 'strokeStyle=#3f4549', BAKE = 'strokeStyle=#d23a2c', SCHOTTER = 'fillStyle=#8f887d';
const DUNST = 'addColorStop(1,rgba(236,242,245,.55))', OEL = 'addColorStop(0,#6f6862)';
const SCHLEIER = 'fillStyle=rgba(31,42,46,.12)', RASTER = 'strokeStyle=rgba(255,255,255,.25)', BRUNNEN = 'fillStyle=#4aa0d8';

/** Wie tests/hilfen/nr22 `aufnahme`, schreibt zusätzlich die Farbstopps der Verläufe mit (Dunst, Rauch). */
function aufnahme(): { X: CanvasRenderingContext2D; befehle: string[] } {
  const befehle: string[] = [];
  const zustand = new Map<PropertyKey, unknown>();
  const text = (a: unknown): string => (Array.isArray(a) ? JSON.stringify(a) : typeof a === 'object' && a !== null ? 'objekt' : String(a));
  const verlauf = { addColorStop: (o: number, f: string) => { befehle.push(`addColorStop(${o},${f})`); } };
  const X = new Proxy({}, {
    get(_z, p) {
      if (zustand.has(p)) return zustand.get(p);
      return (...a: unknown[]) => {
        befehle.push(`${String(p)}(${a.map(text).join(',')})`);
        if (p === 'measureText') return { width: String(a[0]).length * 6 };
        if (p === 'createRadialGradient' || p === 'createLinearGradient') return verlauf;
        return undefined;
      };
    },
    set(_z, p, v) { zustand.set(p, v); befehle.push(`${String(p)}=${text(v)}`); return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { X, befehle };
}

const hz = [neu('hz', 11, 30)];
const szene = (extra: Partial<Szene>, objekte: Objekt[] = hz): Szene => ({
  objekte, innen: [], netz: berechneNetz(objekte, [], 1), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 10_000, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46, ...extra,
});
function kamera(mitte: [number, number], zoom: number): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = zoom; k.zentrieren(mitte[0], mitte[1], 1);
  return k;
}
function bild(s: Szene, mitte: [number, number], zoom: number, reduziert = true): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  m.reduziert = reduziert;
  bodenEbeneEinrichten(null);
  zeichneSzene(m, kamera(mitte, zoom), s, new Effekte(), 0.016);
  return a.befehle;
}
const zahl = (b: string[], marke: string): number => b.filter((x) => x === marke).length;
/** Ganze Bahn von x = −2 bis 25 im Bild (Zoom 1,0 = 26 px Kachelbreite). */
const GANZ: [number, number] = [11, -2];

function dorfMitStufe(stufe: number): Spiel {
  const { s } = leeresDorf(1_700_000_000_000);
  s.stand.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  return s;
}
const leitungsSzene = (sp: Spiel, modus: Szene['modus']): Szene =>
  szene({ spiel: sp, netz: sp.netz, modus, bahn: bahnFelder(), fluss: nordFluss() }, sp.stand.objekte);

describe('NR27 P5b2 Masten (14.15 Punkt 6)', () => {
  // Fehler, die ihn rot machen: keine Masten; Teilung nicht 3/Versatz nicht 2; negatives x ohne mod(); Mast auf der Brücke.
  // Von Hand: x = −2 … 25 mit x ≡ 2 (mod 3) → −1, 2, 5, 8, 11, 14, 17, 20, 23 = 9; ohne Brückenspalte 20 → 8.
  it('test_nr27_masten_nicht_auf_bruecke: 8 Masten mit Fluss (Brücke x = 19/20), 9 ohne Fluss', () => {
    expect(zahl(bild(szene({ bahn: bahnFelder(), fluss: nordFluss() }), GANZ, 1.0), MAST)).toBe(8);
    expect(zahl(bild(szene({ bahn: bahnFelder(), fluss: [] }), GANZ, 1.0), MAST)).toBe(9);
  });

  // Fehler, der ihn rot macht: Masten werden nur vor Objekten gezeichnet, die vor ihnen liegen – fehlt so ein Objekt, fehlen sie.
  // Von Hand: Heizzentrale (0|−14), Größe 2 → Tiefe 0,5 − 13,5 + 2 = −11, kleiner als jeder Mast (ab −1 − 2,26 = −3,26).
  it('test_nr27_masten_hinter_allen_objekten: liegt jedes Objekt hinter den Masten, kommen trotzdem alle 8', () => {
    expect(zahl(bild(szene({ bahn: bahnFelder(), fluss: nordFluss() }, [neu('hz', 0, -14)]), GANZ, 1.0), MAST)).toBe(8);
  });

  it('ohne Bahn keine Masten (Nachbardorf)', () => {
    expect(zahl(bild(szene({}), GANZ, 1.0), MAST)).toBe(0);
  });

  // Fehler, der ihn rot macht: Masten alle vor oder alle nach den Objekten statt nach Tiefe einsortiert.
  // Von Hand (Winkel 0): Tiefe = Mitte x + Mitte y + Größe. Brunnen (11|−1), Größe 2 (katalog.ts) → 11,5 − 0,5 + 2 = 13;
  // Mast (x|−3,26) → x − 2,26; davor x < 15,26 → −1, 2, 5, 8, 11, 14 = 6, danach 17, 23 = 2.
  it('test_nr27_masten_tiefe: 6 Masten vor dem Brunnen (11|−1), 2 danach', () => {
    const b = bild(szene({ bahn: bahnFelder(), fluss: nordFluss() }, [...hz, neu('brunnen', 11, -1)]), GANZ, 1.0);
    const i = b.indexOf(BRUNNEN);
    expect(i).toBeGreaterThan(0);
    expect(zahl(b.slice(0, i), MAST)).toBe(6);
    expect(zahl(b.slice(i), MAST)).toBe(2);
  });
});

describe('NR27 P5b2 Gleisenden und Schranken (14.15 Punkt 7)', () => {
  // Fehler, der ihn rot macht: Gleise enden an x = 0 … 23 statt x = −2 … 25. Von Hand: 28 Spalten je ein Schotterbett.
  it('test_nr27_gleisenden: Schotterbett in 28 Spalten (x = −2 … 25)', () => {
    expect(zahl(bild(szene({ bahn: bahnFelder(), fluss: nordFluss() }), GANZ, 1.0), SCHOTTER)).toBe(28);
  });

  // Fehler, die ihn rot machen: keine Schranke; Schranke an jeder Straße statt nur am Straßenende vor der Bahn.
  const ende = (x: number): Array<[number, number]> => [[x, 0], [x, 1]];
  it('test_nr27_schranken: je Straßenende vor der Bahn eine Schranke, sonst keine', () => {
    const zwei = zahl(bild(szene({ bahn: bahnFelder(), strassen: [...ende(10), ...ende(17)] }), [12, 0], 2.2), BAKE);
    const eine = zahl(bild(szene({ bahn: bahnFelder(), strassen: ende(10) }), [12, 0], 2.2), BAKE);
    expect(eine).toBeGreaterThan(0);
    expect(zwei).toBe(2 * eine);
    // Straße läuft weiter nach Süden, endet aber nicht vor der Bahn → keine Schranke
    expect(zahl(bild(szene({ bahn: bahnFelder(), strassen: [[10, 5], [10, 6]] }), [10, 5], 2.2), BAKE)).toBe(0);
    // Fehler, der ihn rot macht: Straße mit Nordnachbar gilt als Ende. Läuft sie bis (10|−1), steht nur dort die eine Schranke.
    expect(zahl(bild(szene({ bahn: bahnFelder(), strassen: [...ende(10), [10, -1]] }), [12, 0], 2.2), BAKE)).toBe(eine);
    // ohne Bahn (Nachbardorf) keine Schranke
    expect(zahl(bild(szene({ strassen: [...ende(10), ...ende(17)] }), [12, 0], 2.2), BAKE)).toBe(0);
  });
});

describe('NR27 P5b2 Dunst und Öl-Rauch (14.15 Punkt 8)', () => {
  const MITTE_NORD: [number, number] = [9, -7];
  // Fehler, die ihn rot machen: kein Dunst; Dunst bleibt nach der Erschließung (an die Kulisse gekoppelt, Bauplan P5).
  it('test_nr27_dunst: mit Kulisse liegt der Dunst (weicher Verlauf bis 55 %), nach der Erschließung nicht', () => {
    expect(zahl(bild(szene({ bahn: bahnFelder(), kulisse: nordKulisse({ nordviertel: undefined }) }), MITTE_NORD, 1.4), DUNST)).toBe(1);
    expect(zahl(bild(szene({ bahn: bahnFelder(), kulisse: nordKulisse({ nordviertel: true }) }), MITTE_NORD, 1.4), DUNST)).toBe(0);
  });

  // Fehler, die ihn rot machen: kein Rauch; Rauch an allen 14 Häusern; Rauch trotz „Weniger Bewegung“.
  // Von Hand: 3 Häuser × 4 Rauchballen (maler.ts wolke) = 12 Farbstopps in rauch_oel.
  it('test_nr27_oelrauch: drei Kulissenhäuser rauchen grau, bei weniger Bewegung keins', () => {
    const s = szene({ bahn: bahnFelder(), kulisse: NORD_PLAN });
    expect(zahl(bild(s, MITTE_NORD, 1.4, false), OEL)).toBe(12);
    expect(zahl(bild(s, MITTE_NORD, 1.4, true), OEL)).toBe(0);
  });

  // Fehler, der ihn rot macht: der Rauch steht still, weil die Szene keinen Bildtakt anfordert.
  it('test_nr27_oelrauch_takt: Kulisse mit Rauch braucht flüssigen Takt, ohne Kulisse nicht', () => {
    expect(animationBedarf(szene({ kulisse: NORD_PLAN }), false)).toBe('fluessig');
    expect(animationBedarf(szene({ kulisse: [] }), false)).toBe('keine');
  });
});

describe('NR27 P5b2 Schleier im Leitungsmodus (14.15 Punkt 10, 22)', () => {
  // Fehler, die ihn rot machen: kein Schleier; Schleier auch außerhalb des Leitungsmodus; Aussparung schon vor Stufe 6.
  // Von Hand: 2 Bahnzeilen × 24 Spalten = 48 Rauten; ab Stufe 6 ohne (10|−2), (10|−3) → 46.
  it('test_nr27_schleier_aussparung_ab_stufe6: 48 Rauten vor Stufe 6, 46 ab Stufe 6, keine außerhalb des Leitungsmodus', () => {
    expect(zahl(bild(leitungsSzene(dorfMitStufe(5), 'stempel'), GANZ, 1.0), SCHLEIER)).toBe(48);
    expect(zahl(bild(leitungsSzene(dorfMitStufe(6), 'stempel'), GANZ, 1.0), SCHLEIER)).toBe(46);
    expect(zahl(bild(leitungsSzene(dorfMitStufe(6), 'normal'), GANZ, 1.0), SCHLEIER)).toBe(0);
    expect(zahl(bild(leitungsSzene(dorfMitStufe(6), 'platzieren'), GANZ, 1.0), SCHLEIER)).toBe(0);
  });

  // Fehler, der ihn rot macht: die zwei freien Felder bekommen kein Raster wie ein Baufeld.
  it('test_nr27_querung_raster: ab Stufe 6 eine Rasterzeichnung mehr (die zwei Querungsfelder)', () => {
    const vor = zahl(bild(leitungsSzene(dorfMitStufe(5), 'stempel'), GANZ, 1.0), RASTER);
    expect(zahl(bild(leitungsSzene(dorfMitStufe(6), 'stempel'), GANZ, 1.0), RASTER)).toBe(vor + 1);
  });

  // Fehler, der ihn rot macht: der Bodenschlüssel kennt Stufe/Leitungsmodus nicht – der Zwischenspeicher zeigte den alten Schleier.
  it('test_nr27_schleier_bodenschluessel: Stufe 6 und Leitungsmodus ändern den Schlüssel der Bodenebene', () => {
    const k = kamera(GANZ, 1.0);
    expect(bodenSchluessel(leitungsSzene(dorfMitStufe(5), 'stempel'), k)).not.toBe(bodenSchluessel(leitungsSzene(dorfMitStufe(6), 'stempel'), k));
    expect(bodenSchluessel(leitungsSzene(dorfMitStufe(5), 'stempel'), k)).not.toBe(bodenSchluessel(leitungsSzene(dorfMitStufe(5), 'platzieren'), k));
  });
});
