// Paket P5f-2 (DESIGN 13.17.9 „Feinschliff P5f“): Darstellung auf der Karte – Aufnahme der Canvas-Befehle wie in
// tests/nr20-darstellung.test.ts.
import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { neu } from './hilfen';

function aufnahme(): { X: CanvasRenderingContext2D; befehle: string[] } {
  const befehle: string[] = [];
  const zustand = new Map<PropertyKey, unknown>();
  const text = (a: unknown): string => (Array.isArray(a) ? JSON.stringify(a) : typeof a === 'object' && a !== null ? 'objekt' : String(a));
  const X = new Proxy({}, {
    get(_z, p) {
      if (zustand.has(p)) return zustand.get(p);
      return (...a: unknown[]) => {
        befehle.push(`${String(p)}(${a.map(text).join(',')})`);
        if (p === 'measureText') return { width: String(a[0]).length * 6 };
        if (p === 'createRadialGradient' || p === 'createLinearGradient') return { addColorStop: () => {} };
        return undefined;
      };
    },
    set(_z, p, v) { zustand.set(p, v); befehle.push(`${String(p)}=${text(v)}`); return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { X, befehle };
}

const objekte = [neu('hz', 11, 10), neu('efh', 9, 13), neu('efh', 12, 14)];
const HAUS1 = objekte[1].id, HAUS2 = objekte[2].id;
const netz = berechneNetz(objekte, [], 1);
const szene = (extra: Partial<Szene>): Szene => ({
  objekte, innen: [], netz, spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 10_000, strassen: [], fluss: [], kw_anzeigen: false, ...extra,
});
function kamera(): Kamera {
  const k = new Kamera();
  k.groesseSetzen(844, 390, 1);
  k.zentrieren(11, 12, 1);
  return k;
}
function bild(s: Szene): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  bodenEbeneEinrichten(null);
  zeichneSzene(m, kamera(), s, new Effekte(), 0.016);
  return a.befehle;
}
const ZIEL = '#ffe08a';
const ellipsen = (b: string[]): string[] => b.filter((x) => x.startsWith('ellipse('));

describe('P5f-2 Darstellung (DESIGN 13.17.9)', () => {
  it('F2: stecker_blass → beide Ziel-Stecker mit Deckkraft 0,35 (Scheibe, Schatten, Symbol zusammen), danach wieder voll; der Haken bleibt voll', () => {
    const scheiben = (b: string[]): number[] => b.flatMap((x, i) => (x === `fillStyle=${ZIEL}` ? [i] : []));
    const alphaVor = (b: string[], i: number): string => b.slice(0, i).reverse().find((x) => x.startsWith('globalAlpha='))!;
    const voll = bild(szene({ ziel: { stecker: [HAUS1, HAUS2], ring: null } }));
    expect(scheiben(voll).map((i) => alphaVor(voll, i))).not.toContain('globalAlpha=0.35');
    const blass = bild(szene({ ziel: { stecker: [HAUS1, HAUS2], ring: null }, stecker_blass: true }));
    const s = scheiben(blass);
    expect(s).toHaveLength(2);
    for (const i of s) expect(alphaVor(blass, i)).toBe('globalAlpha=0.35');
    // Die Blase beginnt mit der weißen Fläche: auch sie liegt schon unter 0,35
    const weiss = blass.lastIndexOf('fillStyle=#fff', s[0]);
    expect(alphaVor(blass, weiss)).toBe('globalAlpha=0.35');
    // Nach dem Stecker wieder voll: das kW-Schild desselben Hauses kommt danach und bleibt deckend
    const mitSchild = bild(szene({ ziel: { stecker: [HAUS1, HAUS2], ring: null }, stecker_blass: true, modus: 'stempel', kw_anzeigen: true }));
    const schild = mitSchild.findIndex((x) => /^fillText\(\d+ kW,/.test(x));
    expect(schild).toBeGreaterThan(mitSchild.indexOf(`fillStyle=${ZIEL}`));
    expect(alphaVor(mitSchild, schild)).toBe('globalAlpha=1');
    const haken = bild(szene({ ziel: { stecker: [HAUS1, HAUS2], ring: null }, stecker_blass: true, erreicht: [{ id: HAUS1, seit_ms: 0 }] }));
    const iHaken = haken.indexOf('fillStyle=#d3f0c6');
    expect(alphaVor(haken, iHaken)).not.toBe('globalAlpha=0.35');
  });

  it('F6: Ring um das Ziel-Haus = Ellipse um die Grundfläche + 8 px (Halbachsen tw/2 + 8, th/2 + 8) und vor dem Band gezeichnet', () => {
    const k = kamera();
    const b = bild(szene({ ziel: { stecker: [HAUS1, HAUS2], ring: HAUS2 }, tutorial_band: [{ x: 10, y: 13, typ: 'd25', aktiv: true, falsch: false, pfeil: [0, 1] }] }));
    const leer = ellipsen(bild(szene({}))), e = ellipsen(b).filter((x) => !leer.includes(x));
    expect(e).toHaveLength(3);
    const [, , rx, ry] = e[0].slice(8, -1).split(',').map(Number);
    expect(rx).toBeCloseTo(k.tw / 2 + 8, 6);
    expect(ry).toBeCloseTo(k.th / 2 + 8, 6);
    // Band in d25-Farbe (#d8392f) kommt nach dem Ring
    expect(b.indexOf(e[2])).toBeLessThan(b.indexOf('strokeStyle=#d8392f'));
  });
});

// P5f-2 (Fortsetzung): F5 Rest – Startfeld (10|11) über der Heizzentrale, Raute Füllung → Pfeil → Rand, Pfeil der 32er mit Rand `tafel`.
describe('P5f-2 F5: Startfeld an der Heizzentrale und Raute mit Pfeil', () => {
  // Farben: d32 #4caf3e, d25 #d8392f (src/core/katalog.ts), tafel #fff4df, kontur #3b1d0a (design/tokens.json menue.farbe)
  const D32 = '#4caf3e', D25 = '#d8392f', TAFEL = '#fff4df', KONTUR = '#3b1d0a';
  /** Seitenwand der Heizzentrale (src/render/gebaeude.ts heizzentrale): Marke „Heizzentrale ist gezeichnet“ */
  const HZ_WAND = 'fillStyle=#86412e';
  /** Füllung der leuchtenden Raute: Deckkraft (0,55 bzw. nach F5 0,35) direkt vor fillStyle ziel */
  const rauteFuellung = (b: string[]): number => b.findIndex((x, i) => /^globalAlpha=0\.(55|35)$/.test(x) && b[i + 1] === `fillStyle=${ZIEL}`);
  const pfeil = (b: string[], farbe: string): number => b.findIndex((x, i) => x === `fillStyle=${farbe}` && b[i + 1] === 'beginPath()' && b[i + 2]?.startsWith('moveTo(') && b.slice(i, i + 8).includes('closePath()'));
  const T13_BAND = [
    { x: 10, y: 11, typ: 'd32' as const, aktiv: true, falsch: false, pfeil: [0, 1] as [number, number] },
    { x: 10, y: 12, typ: 'd32' as const, aktiv: true, falsch: false, pfeil: null },
  ];
  const FELD_9_12 = [{ x: 9, y: 12, typ: 'd25' as const, aktiv: true, falsch: false, pfeil: [0, 1] as [number, number] }];

  it('Band und Raute auf (10|11) liegen über der Heizzentrale, ein Spurfeld ohne Nachbarschaft zur Heizzentrale darunter', () => {
    const b = bild(szene({ tutorial_band: T13_BAND, naechstes_feld: [10, 11] }));
    const hz = b.indexOf(HZ_WAND);
    expect(hz, 'Vorprobe: Heizzentrale gezeichnet').toBeGreaterThan(-1);
    expect(b.indexOf(`strokeStyle=${D32}`), 'Band (10|11) nach der Heizzentrale').toBeGreaterThan(hz);
    expect(rauteFuellung(b), 'Raute (10|11) nach der Heizzentrale').toBeGreaterThan(hz);
    const unten = bild(szene({ tutorial_band: FELD_9_12, naechstes_feld: [9, 12] }));
    const hz2 = unten.indexOf(HZ_WAND);
    expect(unten.indexOf(`strokeStyle=${D25}`), 'Band (9|12) vor der Heizzentrale').toBeLessThan(hz2);
    expect(rauteFuellung(unten), 'Raute (9|12) vor der Heizzentrale').toBeLessThan(hz2);
  });

  it('Grenze der Nachbarschaft: (10|12) (nur übers Eck) und (14|11) (ein Feld Lücke) bleiben unter der Heizzentrale, (13|11) liegt darüber', () => {
    // Heizzentrale (11|10), Größe 2: Grundfläche x 11–12, y 10–11
    const lage = (x: number, y: number): number => {
      const b = bild(szene({ tutorial_band: [{ x, y, typ: 'd25', aktiv: true, falsch: false, pfeil: null }] }));
      return Math.sign(b.indexOf(`strokeStyle=${D25}`) - b.indexOf(HZ_WAND));
    };
    expect([lage(10, 12), lage(14, 11), lage(13, 11), lage(12, 9)]).toEqual([-1, -1, 1, 1]);
  });

  it('beim Planen (zweiter Leitungs-Durchgang über den Gebäuden) liegen Band und Raute auf (10|11) auch über den Leitungen', () => {
    const mitRohr = [...objekte, neu('d25', 13, 12)];
    const b = bild(szene({ objekte: mitRohr, netz: berechneNetz(mitRohr, [], 1), modus: 'stempel', tutorial_band: T13_BAND, naechstes_feld: [10, 11] }));
    // Rohrschatten rgba(40,34,26,.4) (zeichneLeitungen): der letzte gehört zum zweiten Durchgang
    const rohr = b.lastIndexOf('strokeStyle=rgba(40,34,26,.4)');
    expect(rohr).toBeGreaterThan(b.indexOf(HZ_WAND));
    expect(b.indexOf(`strokeStyle=${D32}`)).toBeGreaterThan(rohr);
    expect(rauteFuellung(b)).toBeGreaterThan(rohr);
  });

  it('Raute in der Reihenfolge Füllung → Pfeil → Rand, auf (10|11) und auf jedem anderen Feld', () => {
    for (const [s, farbe] of [
      [szene({ tutorial_band: T13_BAND, naechstes_feld: [10, 11] }), KONTUR],
      [szene({ tutorial_band: FELD_9_12, naechstes_feld: [9, 12] }), '#ffffff'],
    ] as const) {
      const b = bild(s), f = rauteFuellung(b), p = pfeil(b, farbe);
      expect(f).toBeGreaterThan(-1);
      expect(p, 'Pfeil nach der Füllung').toBeGreaterThan(f);
      const rand = b.findIndex((x, i) => i > f && x === `strokeStyle=${ZIEL}`);
      expect(rand, 'Rand nach dem Pfeil').toBeGreaterThan(p);
    }
  });

  it('Pfeil in kontur (32er) bekommt einen Rand tafel 1,5 px: vor der Füllung 3 px breit gestrichen', () => {
    const b = bild(szene({ tutorial_band: T13_BAND }));
    const p = pfeil(b, KONTUR);
    expect(p).toBeGreaterThan(-1);
    const vor = b.slice(p, b.indexOf('fill()', p));
    expect(vor).toContain(`strokeStyle=${TAFEL}`);
    expect(vor).toContain('lineWidth=3');
    expect(vor.at(-1)).toBe('stroke()');
  });
});
