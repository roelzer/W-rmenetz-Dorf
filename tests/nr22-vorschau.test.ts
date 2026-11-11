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

// Bauplan NR20-22 P7 (Vorschau-Rauten), DESIGN 13.17.3 „Auf der Karte, solange das Blatt offen ist“: gestrichelte Raute in der
// Farbe der empfohlenen Größe auf den Feldern, die vergrößert würden. Seit DESIGN 13.17.11 H2 (Tester-Vorarbeit P7e): Farbstrich
// voll deckend (vorher 0,5), darunter eine Linie `kontur` mit 0,5 (geprüft in tests/nr22-p7e.test.ts). Farben aus core/katalog.ts:
// 40er '#6ec6ff', 32er '#4caf3e'. Im Bild liegen nur 25er, also stammt jeder Strich in diesen Farben von einer Raute.

const N = KONSTANTEN.feldanzahl;
const D40 = '#6ec6ff', D32 = '#4caf3e';


// Heizzentrale 2×2 ab (11|10), gebaute 25er (10|10) → (6|10); (10|10) hat schon einen 32er-Ersatz
const F = (x: number): number => 10 * N + x;
const objekte = [neu('hz', 11, 10), neu('d25', 10, 10, { ersatz: { typ: 'd32', nr: 99 } }), ...[9, 8, 7, 6].map((x) => neu('d25', x, 10))];
const netz = berechneNetz(objekte, [], 1);
const szene = (extra: Partial<Szene>): Szene => ({
  objekte, innen: [], netz, spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 10_000, strassen: [], fluss: [], kw_anzeigen: false, ...extra,
});
function bild(s: Szene): string[] {
  const a = aufnahme(), m = new Maler(a.X), k = new Kamera();
  k.groesseSetzen(844, 390, 1); k.zoom = 2; k.zentrieren(9, 10, 1);
  bodenEbeneEinrichten(null);
  zeichneSzene(m, k, s, new Effekte(), 0.016);
  return a.befehle;
}
const zahl = (b: string[], marke: string): number => b.filter((x) => x === marke).length;
/** Deckkraft, die vor dem Befehl an Stelle `i` gilt – mit save()/restore() wie im echten Canvas (P7e: die Unterlinie mit 0,5
 *  darf in einem eigenen save/restore liegen) */
const deckkraftVor = (b: string[], i: number): string => {
  let a = '1';
  const stapel: string[] = [];
  for (const x of b.slice(0, i)) {
    if (x === 'save()') stapel.push(a);
    else if (x === 'restore()') a = stapel.pop() ?? '1';
    else if (x.startsWith('globalAlpha=')) a = x.slice(12);
  }
  return `globalAlpha=${a}`;
};

describe('NR22 P7b Vorschau-Rauten', () => {
  it('ohne Vorschau: keine Raute in der 40er-Farbe, die vorhandene 32er-Ersatzraute bleibt', () => {
    const b = bild(szene({}));
    expect(zahl(b, `strokeStyle=${D40}`)).toBe(0);
    expect(zahl(b, `strokeStyle=${D32}`)).toBe(1);
  });

  it('je Vorschau-Feld eine gestrichelte Raute in der Farbe der Zielgröße, voll deckend (H2)', () => {
    const b = bild(szene({ ueberlast_vorschau: { felder: [F(9), F(8), F(7)], typ: 'd40' } }));
    const stellen = b.flatMap((x, i) => (x === `strokeStyle=${D40}` ? [i] : []));
    expect(stellen).toHaveLength(3);
    for (const i of stellen) {
      expect(deckkraftVor(b, i)).toBe('globalAlpha=1');
      expect(b.slice(0, i).reverse().find((x) => x.startsWith('setLineDash('))).not.toBe('setLineDash([])');
    }
  });

  it('Feld mit dünnerem Ersatz in der Vorschau: die Vorschau-Raute ersetzt die Ersatzraute (keine zwei Rauten übereinander)', () => {
    const b = bild(szene({ ueberlast_vorschau: { felder: [F(10), F(9)], typ: 'd40' } }));
    expect(zahl(b, `strokeStyle=${D40}`)).toBe(2);
    expect(zahl(b, `strokeStyle=${D32}`)).toBe(0);
  });

  it('Szenen-Schlüssel ändert sich mit den Vorschau-Feldern und der Zielgröße', () => {
    const basis = szenenSchluessel(szene({ ueberlast_vorschau: { felder: [F(9)], typ: 'd40' } }));
    expect(szenenSchluessel(szene({}))).not.toBe(basis);
    expect(szenenSchluessel(szene({ ueberlast_vorschau: { felder: [F(9), F(8)], typ: 'd40' } }))).not.toBe(basis);
    expect(szenenSchluessel(szene({ ueberlast_vorschau: { felder: [F(9)], typ: 'd50' } }))).not.toBe(basis);
  });
});
