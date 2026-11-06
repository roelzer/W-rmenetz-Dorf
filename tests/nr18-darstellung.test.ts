import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import type { Objekt } from '../src/core/typen';
import { ENGSTELLE_DAUER_S, Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { animationBedarf } from '../src/render/szene-schluessel';
import { neu } from './hilfen';

// NR18-P4 Darstellung (Bauplan docs/bauplaene/NR18-ohne-autoanschluss.md, Abschnitt 5.1 „Engstellen-Anzeige“ und 7 „Bauplan P4“):
// Rauten-Umriss je Feld in Warnrot #d8392f, Linie 3 px, 6 s, Puls 1,5 Hz, bei „Weniger Bewegung“ fest; eine neue Markierung
// ersetzt die alte. Gebaute Leitung mit geplantem Ersatz trägt zusätzlich die Planmarkierung (gestrichelte blaue Raute #2a6fb0).
// Echte Maler- und Effekte-Klassen; nur die Leinwand ist eine Aufzeichnungs-Attrappe (wie tests/nr12-p5b-ruhe.test.ts).

/** Aufzeichnungs-Kontext: protokolliert Methodenaufrufe und gesetzte Eigenschaften. */
function aufnahme(): { X: CanvasRenderingContext2D; befehle: string[] } {
  const befehle: string[] = [];
  const zustand = new Map<PropertyKey, unknown>();
  const text = (a: unknown): string => (typeof a === 'object' && a !== null ? String((a as { name?: string }).name ?? 'objekt') : String(a));
  const X = new Proxy({}, {
    get(_z, p) {
      if (zustand.has(p)) return zustand.get(p);
      return (...a: unknown[]) => {
        befehle.push(`${String(p)}(${a.map(text).join(',')})`);
        if (p === 'measureText') return { width: String(a[0]).length * 6 };
        if (p === 'createRadialGradient' || p === 'createLinearGradient') return { name: 'verlauf', addColorStop: () => {} };
        return undefined;
      };
    },
    set(_z, p, v) { zustand.set(p, v); befehle.push(`${String(p)}=${text(v)}`); return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { X, befehle };
}

const WARNROT = '#d8392f';
/** Bildschirm-Mitte eines Felds für die Attrappe: eindeutig je Feld, damit die Rauten zuzuordnen sind. */
const mitte = (x: number, y: number): [number, number] => [x * 100, y * 100];

/** Spielt `sekunden` in Bildern zu 0,1 s ab (Effekte begrenzen dt auf 0,1) und liefert die Befehle des letzten Bilds. */
function abspielen(e: Effekte, sekunden: number): string[] {
  let letzte: string[] = [];
  const schritte = Math.round(sekunden / 0.1);
  for (let i = 0; i < schritte; i++) {
    const a = aufnahme(), m = new Maler(a.X);
    e.zeichnen(m, 0.1, mitte);
    letzte = a.befehle;
  }
  return letzte;
}
/** Ein Bild mit beliebigem dt; liefert seine Befehle. */
function bild(e: Effekte, dt_s: number): string[] {
  const a = aufnahme();
  e.zeichnen(new Maler(a.X), dt_s, mitte);
  return a.befehle;
}
/** globalAlpha, mit dem die Warnrot-Raute gezeichnet wird (letzter gesetzter Wert vor strokeStyle=#d8392f). */
function alphaDerMarkierung(befehle: string[]): number {
  const i = befehle.indexOf(`strokeStyle=${WARNROT}`);
  expect(i, 'Markierung gezeichnet').toBeGreaterThanOrEqual(0);
  const vorher = befehle.slice(0, i).filter((b) => b.startsWith('globalAlpha=')).pop();
  return vorher === undefined ? 1 : Number(vorher.slice('globalAlpha='.length));
}
/** Feldmitten (in Attrappen-Koordinaten), um die eine Warnrot-Raute gezogen wird: Mittel der vier Ecken je Pfad. */
function markierteMitten(befehle: string[]): string[] {
  const mitten: string[] = [];
  let pfad: Array<[number, number]> = [];
  for (const b of befehle) {
    if (b === 'beginPath()') pfad = [];
    const t = /^(?:moveTo|lineTo)\(([-\d.e]+),([-\d.e]+)\)$/.exec(b);
    if (t) pfad.push([Number(t[1]), Number(t[2])]);
    if (b === 'stroke()' && pfad.length === 4) {
      const cx = pfad.reduce((s, p) => s + p[0], 0) / 4, cy = pfad.reduce((s, p) => s + p[1], 0) / 4;
      mitten.push(`${Math.round(cx)}|${Math.round(cy)}`);
    }
  }
  return mitten;
}
/** Nur die Befehle ab dem ersten Setzen von Warnrot (die Markierung ist das Einzige in Warnrot). */
const abWarnrot = (befehle: string[]): string[] => befehle.slice(Math.max(0, befehle.indexOf(`strokeStyle=${WARNROT}`)));

describe('NR18-P4 Engstellen-Markierung (Bauplan 5.1)', () => {
  it('NR18-P4: Dauer ist 6 s', () => {
    expect(ENGSTELLE_DAUER_S).toBe(6);
  });

  it('NR18-P4: Markierung ist 6 s aktiv – aktiv() zählt sie mit, nach 6 s ist sie weg', () => {
    const e = new Effekte();
    expect(e.aktiv()).toBe(false);
    e.engstelle([[3, 4], [5, 6]], false);
    expect(e.aktiv(), 'gleich nach dem Aufruf').toBe(true);
    abspielen(e, 5.9);
    expect(e.aktiv(), 'nach 5,9 s').toBe(true);
    bild(e, 0.1); // 6,0 s
    bild(e, 0.1); // 6,1 s
    expect(e.aktiv(), 'nach 6,1 s').toBe(false);
    expect(bild(e, 0.1).includes(`strokeStyle=${WARNROT}`), 'nach Ablauf nichts mehr gezeichnet').toBe(false);
  });

  it('NR18-P4: Rauten-Umriss je Feld in Warnrot #d8392f mit 3 px Linie – alle Felder, auch aus mehreren Ästen', () => {
    const e = new Effekte();
    e.engstelle([[3, 4], [5, 6], [9, 1]], false);
    const b = bild(e, 0.1);
    expect(b).toContain(`strokeStyle=${WARNROT}`);
    expect(b).toContain('lineWidth=3');
    expect(markierteMitten(abWarnrot(b)).sort()).toEqual(['300|400', '500|600', '900|100']);
    expect(b.filter((x) => x === 'fill()').length, 'nur Umriss, keine Füllung').toBe(0);
  });

  // Effekte begrenzen dt auf 0,1 s je Bild, darum laufen alle Zeitschritte hier in 0,1-s-Bildern.
  it('NR18-P4: Puls mit 1,5 Hz – Helligkeit wechselt, nach drei Perioden (2 s) wieder gleich', () => {
    const e = new Effekte();
    e.engstelle([[2, 2]], false);
    const a0 = alphaDerMarkierung(bild(e, 0.1)); // t = 0,1 s
    abspielen(e, 0.2);
    const a3 = alphaDerMarkierung(bild(e, 0.1)); // t = 0,4 s: 0,45 Perioden weiter, fast Gegenphase
    expect(Math.abs(a0 - a3), 'Puls sichtbar').toBeGreaterThan(0.3);
    abspielen(e, 1.6);
    const a2s = alphaDerMarkierung(bild(e, 0.1)); // t = 2,1 s = 0,1 s + 3 Perioden zu 2/3 s
    expect(a2s).toBeCloseTo(a0, 5);
    for (const a of [a0, a3, a2s]) { expect(a).toBeGreaterThanOrEqual(0.3); expect(a).toBeLessThanOrEqual(1); }
  });

  it('NR18-P4: Puls-Takt 1,5 Hz – hellstes Bild nach 2/3 s (Bild 0,7 s), dunkelstes nach 1/3 s (Bild 0,3 s)', () => {
    // Die Markierung beginnt hell (Aufmerksamkeit sofort); bei 1,5 Hz liegt die nächste Spitze bei 2/3 s, das Tal bei 1/3 s.
    // In 0,1-s-Bildern von 0,1 bis 0,9 s sind das die Bilder 0,7 s und 0,3 s (das nächste Tal käme erst bei 1,0 s);
    // bei 1 Hz läge das Tal bei 0,5 s und die Spitze am Rand.
    const e = new Effekte();
    e.engstelle([[2, 2]], false);
    const alphas = Array.from({ length: 9 }, () => alphaDerMarkierung(bild(e, 0.1)));
    const zeit = (i: number): number => (i + 1) / 10;
    expect(zeit(alphas.indexOf(Math.max(...alphas)))).toBe(0.7);
    expect(zeit(alphas.indexOf(Math.min(...alphas)))).toBe(0.3);
  });

  it('NR18-P4: „Weniger Bewegung“ – fest ohne Puls, volle Deckkraft, trotzdem 6 s', () => {
    const e = new Effekte();
    e.engstelle([[2, 2]], true);
    const werte = [1, 2, 3, 4].map(() => alphaDerMarkierung(bild(e, 0.1))); // t = 0,1 … 0,4 s
    expect(werte).toEqual([1, 1, 1, 1]);
    abspielen(e, 5.5); // t = 5,9 s
    expect(e.aktiv(), 'nach 5,9 s').toBe(true);
    abspielen(e, 0.2); // t = 6,1 s
    expect(e.aktiv(), 'nach 6,1 s').toBe(false);
  });

  it('NR18-P4: neue Markierung ersetzt die alte – nur neue Felder, Zeit beginnt neu', () => {
    const e = new Effekte();
    e.engstelle([[3, 4]], false);
    abspielen(e, 5);
    e.engstelle([[7, 8]], false);
    const b = bild(e, 0.1);
    expect(markierteMitten(abWarnrot(b))).toEqual(['700|800']);
    abspielen(e, 5);
    expect(e.aktiv(), '5,1 s nach der neuen Markierung').toBe(true);
  });

  it('NR18-P4: leere Feldliste löscht die Markierung (nichts zu zeigen)', () => {
    const e = new Effekte();
    e.engstelle([[3, 4]], false);
    e.engstelle([], false);
    expect(e.aktiv()).toBe(false);
    expect(bild(e, 0.1)).not.toContain(`strokeStyle=${WARNROT}`);
  });

  it('NR18-P4: aktive Markierung hält die Bildschleife flüssig (NR12-Takt), danach nicht mehr', () => {
    const objekte = [neu('hz', 10, 10)];
    const s: Szene = {
      objekte, innen: [], netz: berechneNetz(objekte, [], 2), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
      verschiebe_id: null, stempel: null, jetzt_ms: 1000, strassen: [], fluss: [], kw_anzeigen: true,
    };
    const e = new Effekte();
    expect(animationBedarf(s, e.aktiv())).not.toBe('fluessig');
    e.engstelle([[12, 10]], true);
    expect(animationBedarf(s, e.aktiv())).toBe('fluessig');
    abspielen(e, 6.1);
    expect(animationBedarf(s, e.aktiv())).not.toBe('fluessig');
  });
});

describe('NR18-P4 Leitung mit geplantem Ersatz (Bauplan P4)', () => {
  function szeneMit(leitung: Partial<Objekt>): string[] {
    const objekte = [neu('hz', 10, 10), neu('d25', 12, 10, leitung), neu('d25', 13, 10), neu('efh', 14, 10)];
    const s: Szene = {
      objekte, innen: [], netz: berechneNetz(objekte, [], 2), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
      verschiebe_id: null, stempel: null, jetzt_ms: 1000, strassen: [], fluss: [], kw_anzeigen: true,
    };
    const k = new Kamera();
    k.groesseSetzen(844, 390, 2);
    k.zentrieren(12, 10, 2);
    const a = aufnahme();
    bodenEbeneEinrichten(null);
    zeichneSzene(new Maler(a.X), k, s, new Effekte(), 0.016);
    return a.befehle;
  }

  it('NR18-P4: gebaute Leitung mit Ersatz bekommt die Planmarkierung (gestrichelte blaue Raute), ohne Ersatz nicht', () => {
    const ohne = szeneMit({});
    const mit = szeneMit({ ersatz: { typ: 'd32', nr: 1 } });
    expect(ohne.filter((b) => b === 'strokeStyle=#2a6fb0').length, 'ohne Ersatz keine Planmarkierung').toBe(0);
    expect(mit.filter((b) => b === 'strokeStyle=#2a6fb0').length, 'genau eine Leitung mit Ersatz').toBe(1);
    const i = mit.indexOf('strokeStyle=#2a6fb0');
    expect(mit.slice(Math.max(0, i - 3), i).some((b) => b.startsWith('setLineDash(') && b !== 'setLineDash()'), 'gestrichelt').toBe(true);
  });

  it('NR18-P4: die Ersatz-Leitung bleibt in ihrer alten Farbe sichtbar (keine Planfarbe statt Bestand)', () => {
    const ohne = szeneMit({});
    const mit = szeneMit({ ersatz: { typ: 'd32', nr: 1 } });
    // Die gebaute 25er wird weiter gezeichnet: gleiche Rohr-Befehle wie ohne Ersatz, die Markierung kommt dazu.
    const rohr = (b: string[]): number => b.filter((x) => x.startsWith('strokeStyle=') && x !== 'strokeStyle=#2a6fb0').length;
    expect(rohr(mit)).toBe(rohr(ohne));
  });
});
