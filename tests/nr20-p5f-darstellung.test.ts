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
