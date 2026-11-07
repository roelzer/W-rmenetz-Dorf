import { beforeEach, describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/start';
import type { TutorialBandFeld } from '../src/core/tutorial-vertrag';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, pfeilFarbe, zeichneSzene, type Szene } from '../src/render/szene';
import { animationBedarf, fremdEinblendungZuruecksetzen, szenenSchluessel } from '../src/render/szene-schluessel';
import { SYMBOLE } from '../src/ui/symbole';
import { neu } from './hilfen';

/** Aufnahme-Attrappe wie in nr13-blaetter: jeder Canvas-Befehl wird als Text mitgeschrieben. */
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
function kamera(zoom?: number): Kamera {
  const k = new Kamera();
  k.groesseSetzen(844, 390, 1);
  if (zoom !== undefined) k.zoom = zoom;
  k.zentrieren(11, 12, 1);
  return k;
}
function bild(s: Szene, reduziert = false, zoom?: number): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  m.reduziert = reduziert;
  bodenEbeneEinrichten(null);
  zeichneSzene(m, kamera(zoom), s, new Effekte(), 0.016);
  return a.befehle;
}
const mitte = (x: number, y: number): [number, number] => kamera().mitte(x, y);
const anzahl = (b: string[], marke: string): number => b.filter((x) => x === marke).length;
/** Punkte (moveTo/lineTo) zwischen der Marke und dem nächsten stroke() bzw. fill() */
function punkteNach(b: string[], start: number): Array<[number, number]> {
  const p: Array<[number, number]> = [];
  for (let i = start + 1; i < b.length && b[i] !== 'stroke()' && b[i] !== 'fill()'; i++) {
    const t = /^(moveTo|lineTo)\(([^,]+),([^,]+)\)$/.exec(b[i]);
    if (t) p.push([Number(t[2]), Number(t[3])]);
  }
  return p;
}
function gleichePunkte(ist: Array<[number, number]>, soll: Array<[number, number]>): void {
  expect(ist).toHaveLength(soll.length);
  ist.forEach(([x, y], i) => { expect(x).toBeCloseTo(soll[i][0], 6); expect(y).toBeCloseTo(soll[i][1], 6); });
}
const feld = (x: number, y: number, typ: TutorialBandFeld['typ'], pfeil: TutorialBandFeld['pfeil'], extra: Partial<TutorialBandFeld> = {}): TutorialBandFeld =>
  ({ x, y, typ, aktiv: true, falsch: false, pfeil, ...extra });

// Rohrfarben aus core/katalog.ts (d25, d40; wie Rohr und Farbknopf), sonst design/tokens.json menue.farbe.kontur/tafel/ziel
const D25 = '#d8392f', D40 = '#6ec6ff', KONTUR = '#3b1d0a', TAFEL = '#fff4df', ZIEL = '#ffe08a';
const HAKEN_SCHEIBE = 'fillStyle=#d3f0c6';

describe('NR20 P4 Darstellung Kapitel 3', () => {
  // Die Streifen-Einblendung merkt sich die zuletzt gezeichneten Felder; jeder Test beginnt ohne Vorgeschichte.
  beforeEach(() => fremdEinblendungZuruecksetzen());

  it('Band nur auf den übergebenen Feldern: Füllung in der Zielfarbe von Feldeingang über Mitte zum Ausgang, Doppelrand darunter', () => {
    const leer = bild(szene({}));
    expect(anzahl(leer, `strokeStyle=${D25}`)).toBe(0);
    const b = bild(szene({ tutorial_band: [feld(9, 12, 'd25', [0, 1]), feld(10, 13, 'd25', [0, 1]), feld(10, 14, 'd25', [1, 0])] }));
    const i = b.indexOf(`strokeStyle=${D25}`);
    expect(i, 'Füllung in der Zielfarbe').toBeGreaterThan(-1);
    // (9|12) kommt vom Abzweig (10|12) im Osten und geht nach Süden; (10|13) kommt vom Abzweig im Norden; (10|14) von (10|13), nach Osten
    gleichePunkte(punkteNach(b, i), [
      mitte(9.5, 12), mitte(9, 12), mitte(9, 12.5),
      mitte(10, 12.5), mitte(10, 13), mitte(10, 13.5),
      mitte(10, 13.5), mitte(10, 14), mitte(10.5, 14),
    ]);
    // Band b = max(12, round(Feldbreite × 0,28)); Füllung b − 2 × 1,5 − 2 × 1,5; Deckkraft 0,75
    const tw = kamera().tw, bb = Math.max(12, Math.round(tw * 0.28));
    expect(b.slice(i, i + 4)).toContain(`lineWidth=${bb - 6}`);
    expect(b.slice(i - 3, i + 1)).toContain('globalAlpha=0.75');
    const aussen = b.lastIndexOf(`strokeStyle=${KONTUR}`, i), innen = b.lastIndexOf(`strokeStyle=${TAFEL}`, i);
    expect(aussen, 'dunkler Rand vor dem hellen').toBeGreaterThan(-1);
    expect(innen).toBeGreaterThan(aussen);
    expect(b.slice(aussen, aussen + 4)).toContain(`lineWidth=${bb}`);
    expect(b.slice(innen, innen + 4)).toContain(`lineWidth=${bb - 3}`);
  });

  it('Band-Eingang aus der festen Feldfolge: (10|14) kommt von (10|13), auch wenn (10|13) schon belegt ist; Abzweig von (10|11)', () => {
    const b = bild(szene({ tutorial_band: [feld(10, 14, 'd25', [1, 0]), feld(11, 14, 'd25', [1, 0])] }));
    gleichePunkte(punkteNach(b, b.indexOf(`strokeStyle=${D25}`)), [
      mitte(10, 13.5), mitte(10, 14), mitte(10.5, 14),
      mitte(10.5, 14), mitte(11, 14), mitte(11.5, 14),
    ]);
    // Abzweig allein (pfeil null): Weg von der Hauptleitung (10|11) her bis in die Mitte
    const D32 = '#4caf3e';
    const a = bild(szene({ tutorial_band: [feld(10, 12, 'd32', null)] }));
    gleichePunkte(punkteNach(a, a.indexOf(`strokeStyle=${D32}`)), [mitte(10, 11.5), mitte(10, 12)]);
    // (9|12) allein, Abzweig schon gebaut: Eingang trotzdem vom Abzweig im Osten
    const h = bild(szene({ tutorial_band: [feld(9, 12, 'd25', [0, 1])] }));
    gleichePunkte(punkteNach(h, h.indexOf(`strokeStyle=${D25}`)), [mitte(9.5, 12), mitte(9, 12), mitte(9, 12.5)]);
  });

  // Sammelliste P5 Punkt 10 (Review P4a) und 14: (10|11) hat die Heizzentrale (11|11) als Vorgänger (src/core/tutorial-band.ts);
  // sein Band kommt von Osten, läuft durch die Feldmitte zur Abzweigung nach Süden und schließt an die Abzweigung an.
  it('Erstes Bandfeld (10|11) von der Heizzentrale: Eingang im Osten, Weg über die Mitte nach Süden, Ausgang trifft den Eingang der Abzweigung (10|12)', () => {
    const D32 = '#4caf3e';
    const b = bild(szene({ tutorial_band: [feld(10, 11, 'd32', [0, 1]), feld(10, 12, 'd32', null)] }));
    const p = punkteNach(b, b.indexOf(`strokeStyle=${D32}`));
    expect(p, 'drei Punkte für (10|11), zwei für die Abzweigung').toHaveLength(5);
    gleichePunkte(p, [mitte(10.5, 11), mitte(10, 11), mitte(10, 11.5), mitte(10, 11.5), mitte(10, 12)]);
  });

  it('Pfeilfarbe: weiß ab Kontrast 3:1, darunter kontur (Grenze von Hand: #949494 ≈ 3,03, #959595 ≈ 2,996, #8a8a8a ≈ 3,45)', () => {
    expect(pfeilFarbe('#949494')).toBe('#ffffff');
    expect(pfeilFarbe('#959595')).toBe(KONTUR);
    expect(pfeilFarbe('#8a8a8a')).toBe('#ffffff');
    expect(pfeilFarbe(D25)).toBe('#ffffff');
    expect(pfeilFarbe(D40)).toBe(KONTUR);
  });

  it('weißer Pfeil hat einen Rand in kontur (1,5 px), der Pfeil in kontur keinen zweiten', () => {
    const nachFuellung = (b: string[], farbe: string): string[] => {
      const i = b.findIndex((x, j) => x === `fillStyle=${farbe}` && b[j + 1] === 'beginPath()' && b[j + 2]?.startsWith('moveTo(') && b.slice(j, j + 8).includes('closePath()'));
      expect(i, `Pfeil ${farbe}`).toBeGreaterThan(-1);
      const f = b.indexOf('fill()', i);
      return b.slice(f + 1, f + 4);
    };
    expect(nachFuellung(bild(szene({ tutorial_band: [feld(9, 12, 'd25', [0, 1])] })), '#ffffff')).toEqual([`strokeStyle=${KONTUR}`, 'lineWidth=1.5', 'stroke()']);
    expect(nachFuellung(bild(szene({ tutorial_band: [feld(9, 12, 'd40', [0, 1])] })), KONTUR)).not.toContain('stroke()');
  });

  it('Pfeile: Spitze folgt pfeil ([0,1] unterhalb der Mitte), 25er weiß mit Kontur, 40er in kontur, ruhend und pfeil null ohne Pfeil', () => {
    const spitze = (b: string[], farbe: string): Array<[number, number]> => {
      const r: Array<[number, number]> = [];
      b.forEach((x, i) => { if (x === `fillStyle=${farbe}` && b[i + 1] === 'beginPath()' && b[i + 2]?.startsWith('moveTo(')) r.push(punkteNach(b, i)[0]); });
      return r;
    };
    const leer = bild(szene({}));
    const w = bild(szene({ tutorial_band: [feld(9, 12, 'd25', [0, 1])] }));
    const sw = spitze(w, '#ffffff');
    expect(sw.length - spitze(leer, '#ffffff').length).toBe(1);
    const [, my] = mitte(9, 12);
    expect(sw.at(-1)![1], 'Spitze nach Süden liegt unterhalb der Feldmitte').toBeGreaterThan(my);
    const ost = spitze(bild(szene({ tutorial_band: [feld(9, 12, 'd25', [1, 0])] })), '#ffffff').at(-1)!;
    const [mx] = mitte(9, 12);
    expect(ost[0], 'Spitze nach Osten liegt rechts der Mitte').toBeGreaterThan(mx);

    const k = bild(szene({ tutorial_band: [feld(9, 12, 'd40', [0, 1])] }));
    expect(spitze(k, KONTUR).length - spitze(leer, KONTUR).length, '40er: Pfeil in kontur').toBe(1);
    expect(spitze(k, '#ffffff').length - spitze(leer, '#ffffff').length).toBe(0);

    const ruhend = bild(szene({ tutorial_band: [feld(9, 12, 'd25', [0, 1], { aktiv: false })] }));
    expect(spitze(ruhend, '#ffffff').length - spitze(leer, '#ffffff').length, 'ruhend ohne Pfeil').toBe(0);
    expect(ruhend, 'ruhend 0,35').toContain('globalAlpha=0.35');
    const ohne = bild(szene({ tutorial_band: [feld(10, 12, 'd25', null)] }));
    expect(spitze(ohne, '#ffffff').length - spitze(leer, '#ffffff').length, 'pfeil null ohne Pfeil').toBe(0);
  });

  it('falsch: gestrichelte Raute in der Zielfarbe auf dem Bandfeld', () => {
    const b = bild(szene({ tutorial_band: [feld(10, 13, 'd25', [0, 1], { falsch: true })] }));
    const i = b.findIndex((x, j) => x.startsWith('setLineDash([') && x !== 'setLineDash([])' && b.slice(j, j + 4).includes(`strokeStyle=${D25}`));
    expect(i).toBeGreaterThan(-1);
    expect(anzahl(bild(szene({ tutorial_band: [feld(10, 13, 'd25', [0, 1])] })), `strokeStyle=${D25}`) + 1).toBe(anzahl(b, `strokeStyle=${D25}`));
  });

  // DESIGN 13.17.9 F1 (geht B4 vor): Durchmesser max(18, round(tw × 0,32)), 2 px kontur, Ring-Linie 2 px, Punkt Ø 4 px,
  // Schein als radialer Verlauf mit Radius halber Durchmesser + 10 px.
  it('Zielscheibe auch ohne Bandfeld: Scheibe #ffe08a auf der Feldmitte, Durchmesser max(18, round(tw × 0,32)), Ring und Punkt in kontur, Schein + 10 px', () => {
    const leer = bild(szene({}));
    const b = bild(szene({ zielscheibe: [10, 12] }));
    expect(anzahl(b, `fillStyle=${ZIEL}`) - anzahl(leer, `fillStyle=${ZIEL}`)).toBe(1);
    const i = b.indexOf(`fillStyle=${ZIEL}`);
    const [zx, zy] = mitte(10, 12);
    const kreis = b.slice(0, i).reverse().find((x) => x.startsWith('arc('))!;
    const [ax, ay, ar] = kreis.slice(4, -1).split(',').map(Number);
    expect(ax).toBeCloseTo(zx, 6); expect(ay).toBeCloseTo(zy, 6);
    const d = Math.max(18, Math.round(kamera().tw * 0.32));
    expect(ar, 'Radius = halber Durchmesser').toBeCloseTo(d / 2, 6);
    // Rand der Scheibe und Ring in kontur, beide 2 px; danach Punkt Ø 4 px (Radius 2) in kontur
    const punkt = b.findIndex((x, j) => j > i && x.startsWith('arc(') && Math.abs(Number(x.slice(4, -1).split(',')[2]) - 2) < 1e-6);
    expect(punkt, 'Punkt Ø 4 px').toBeGreaterThan(i);
    const [px, py] = b[punkt].slice(4, -1).split(',').map(Number);
    expect(px).toBeCloseTo(zx, 6); expect(py).toBeCloseTo(zy, 6);
    expect(b.slice(punkt, punkt + 4)).toContain(`fillStyle=${KONTUR}`);
    const zwischen = b.slice(i, punkt);
    expect(zwischen).toContain(`strokeStyle=${KONTUR}`);
    expect(anzahl(zwischen, 'stroke()'), 'Scheibenrand und Ring').toBeGreaterThanOrEqual(2);
    const breiten = zwischen.filter((x) => x.startsWith('lineWidth='));
    expect(breiten.length).toBeGreaterThan(0);
    expect(breiten.every((x) => x === 'lineWidth=2'), `Linien 2 px: ${breiten.join(' ')}`).toBe(true);
    // Schein: radialer Verlauf um die Feldmitte bis halber Durchmesser + 10 px
    const verlauf = b.filter((x) => x.startsWith('createRadialGradient(')).map((x) => x.slice(21, -1).split(',').map(Number))
      .filter(([x, y]) => Math.abs(x - zx) < 1e-6 && Math.abs(y - zy) < 1e-6);
    expect(verlauf.length, 'Schein als radialer Verlauf um die Zielscheibe').toBeGreaterThan(0);
    expect(verlauf.some((v) => Math.abs(v[5] - (d / 2 + 10)) < 1e-6), 'Schein-Radius halber Durchmesser + 10').toBe(true);
    // Größerer Zoom, damit nicht nur die Untergrenze 18 greift: tw × 0,32 > 18
    const k2 = kamera(3), d2 = Math.max(18, Math.round(k2.tw * 0.32));
    expect(d2, 'Vorprobe: Formel über der Untergrenze').toBeGreaterThan(18);
    const b2 = bild(szene({ zielscheibe: [10, 12] }), false, 3);
    const [z2x, z2y] = k2.mitte(10, 12);
    const k2kreis = b2.slice(0, b2.indexOf(`fillStyle=${ZIEL}`)).reverse().find((x) => x.startsWith('arc('))!;
    const [bx, by, br] = k2kreis.slice(4, -1).split(',').map(Number);
    expect(bx).toBeCloseTo(z2x, 6); expect(by).toBeCloseTo(z2y, 6);
    expect(br, 'Radius bei Zoom 3').toBeCloseTo(d2 / 2, 6);
  });

  // DESIGN 13.17.9 F5: Raute-Füllung Deckkraft 0,35; F1: Zielscheibe oberste Kartenebene (über Raute, Gebäuden, Ziel-Steckern).
  it('genau eine leuchtende Raute auf naechstes_feld (Füllung 0,35, unter der Zielscheibe), auch bei mehreren Bandfeldern', () => {
    const istRaute = (b: string[], i: number): boolean => b[i] === 'globalAlpha=0.35' && b[i + 1] === `fillStyle=${ZIEL}`;
    const raute = (b: string[]): number => b.filter((_x, i) => istRaute(b, i)).length;
    const [zx, zy] = mitte(10, 12), r = Math.max(18, Math.round(kamera().tw * 0.32)) / 2;
    /** Füllung der Zielscheibe: fillStyle ziel direkt nach dem Kreis um (10|12) mit dem Zielscheiben-Radius */
    const zielscheibeAn = (b: string[]): number => b.findIndex((x, i) => {
      if (x !== `fillStyle=${ZIEL}`) return false;
      const k = b.slice(0, i).reverse().find((y) => y.startsWith('arc('));
      if (!k) return false;
      const [ax, ay, ar] = k.slice(4, -1).split(',').map(Number);
      return Math.abs(ax - zx) < 1e-6 && Math.abs(ay - zy) < 1e-6 && Math.abs(ar - r) < 1e-6;
    });
    const band = [feld(10, 11, 'd32', [0, 1]), feld(10, 12, 'd32', null)];
    expect(raute(bild(szene({ tutorial_band: band })))).toBe(0);
    const b = bild(szene({ tutorial_band: band, naechstes_feld: [10, 12], zielscheibe: [10, 12] }));
    expect(raute(b)).toBe(1);
    expect(b.some((x, i) => x === 'globalAlpha=0.55' && b[i + 1] === `fillStyle=${ZIEL}`), 'keine Raute mehr mit 0,55').toBe(false);
    const iRaute = b.findIndex((_x, i) => istRaute(b, i));
    const iScheibe = zielscheibeAn(b);
    expect(iScheibe, 'Zielscheibe gefunden').toBeGreaterThan(-1);
    expect(iScheibe, 'Raute zuerst, Zielscheibe darüber').toBeGreaterThan(iRaute);
    // Raute × 0,92 um (10|12): erste Ecke wie m.raute
    expect(b.slice(iRaute - 12, iRaute).some((x) => x.startsWith('moveTo('))).toBe(true);
    // Über Gebäuden und Ziel-Steckern: keine gelbe Füllung (Stecker-Scheibe) nach der Zielscheibe
    const mitStecker = bild(szene({ tutorial_band: band, naechstes_feld: [10, 12], zielscheibe: [10, 12], ziel: { stecker: [HAUS1, HAUS2], ring: null } }));
    const jS = zielscheibeAn(mitStecker);
    expect(jS).toBeGreaterThan(-1);
    expect(mitStecker.lastIndexOf(`fillStyle=${ZIEL}`), 'Zielscheibe nach den Ziel-Steckern gezeichnet').toBe(jS);
  });

  it('Ziel-Stecker → Haken; Ring nur um ziel.ring', () => {
    const leer = bild(szene({}));
    const st = bild(szene({ ziel: { stecker: [HAUS1, HAUS2], ring: null } }));
    expect(anzahl(st, `fillStyle=${ZIEL}`) - anzahl(leer, `fillStyle=${ZIEL}`), 'zwei Stecker mit Zielscheibe').toBe(2);
    expect(anzahl(st, HAKEN_SCHEIBE)).toBe(0);
    const ellipsen = (b: string[]): string[] => b.filter((x) => x.startsWith('ellipse('));
    expect(ellipsen(st), 'ohne ring kein Ring').toEqual(ellipsen(leer));
    const haken = bild(szene({ ziel: { stecker: [HAUS1, HAUS2], ring: null }, erreicht: [{ id: HAUS1, seit_ms: 0 }] }));
    expect(anzahl(haken, `fillStyle=${ZIEL}`) - anzahl(leer, `fillStyle=${ZIEL}`), 'Haus 1 zeigt den Haken statt des Steckers').toBe(1);
    expect(anzahl(haken, HAKEN_SCHEIBE)).toBe(1);
    const ring = bild(szene({ ziel: { stecker: [HAUS1, HAUS2], ring: HAUS2 } }));
    const e = ellipsen(ring).filter((x) => !ellipsen(leer).includes(x));
    expect(e, 'Schein, Kontur, Ring').toHaveLength(3);
    const [ex, ey] = mitte(12, 14);
    for (const x of e) { const [a, c] = x.slice(8, -1).split(',').map(Number); expect(a).toBeCloseTo(ex, 6); expect(c).toBeCloseTo(ey, 6); }
    expect(ring).toContain(`strokeStyle=${ZIEL}`);
  });

  it('ruhe: keine kW-Schilder (auch bei Schalter an) und keine fremden Blasen', () => {
    const kw = (b: string[]): number => b.filter((x) => /^fillText\(\d+ kW,/.test(x)).length;
    expect(kw(bild(szene({ modus: 'stempel', kw_anzeigen: true }))), 'Vorprobe: ohne Ruhe Schilder').toBeGreaterThan(0);
    expect(kw(bild(szene({ modus: 'stempel', kw_anzeigen: true, ruhe: true })))).toBe(0);

    const spiel = new Spiel(neuerSpielstand(0), () => 0);
    const mitFremd = [...objekte, neu('efh', 5, 5, { station: 'kompakt' })];
    const n2 = berechneNetz(mitFremd, [], 1);
    const STECKER_GRAU = 'fillStyle=#8d99a5';
    expect(anzahl(bild(szene({ objekte: mitFremd, netz: n2, spiel })), STECKER_GRAU), 'Vorprobe: fremde Blase sichtbar').toBeGreaterThan(0);
    const ruhig = szene({ objekte: mitFremd, netz: n2, spiel, ruhe: true, ziel: { stecker: [HAUS1], ring: null } });
    const b = bild(ruhig);
    expect(anzahl(b, STECKER_GRAU)).toBe(0);
    expect(anzahl(b, `fillStyle=${ZIEL}`), 'Ziel-Stecker bleibt').toBeGreaterThan(0);
  });

  it('test_nr20_streifen_fremd: Streifen genau auf tutorial_fremd, Farben karte.fremd, ohne Band und Raute; leer → nichts; reduziert ohne Einblenden', () => {
    const leer = bild(szene({ tutorial_fremd: [] }));
    expect(leer).not.toContain('clip()');
    expect(bild(szene({}))).toEqual(leer);

    const fremd: Array<readonly [number, number]> = [[12, 12], [12, 13]];
    const s = (t: number, extra: Partial<Szene> = {}): Szene => szene({ tutorial_fremd: fremd, jetzt_ms: t, ...extra });
    const b0 = bild(s(50_000));
    expect(b0, 'erstes Bild: Einblenden beginnt bei 0').toContain('globalAlpha=0');
    expect(animationBedarf(s(50_100), false), 'während des Einblendens flüssig').toBe('fluessig');
    const b1 = bild(s(50_100));
    expect(b1).toContain('globalAlpha=0.425');
    const b2 = bild(s(50_300));
    expect(b2, 'danach still mit Deckkraft 0,85').toContain('globalAlpha=0.85');
    expect(animationBedarf(s(50_300), false), 'danach keine Dauer-Animation').toBe('keine');
    // Weniger Felder: kein neues Einblenden; ein Feld kommt (wieder) dazu: Einblenden beginnt neu
    expect(bild(szene({ tutorial_fremd: [[12, 12]], jetzt_ms: 50_400 }))).toContain('globalAlpha=0.85');
    expect(bild(s(50_500)), 'neues Feld in bestehender Liste').toContain('globalAlpha=0');
    bild(s(50_700));

    expect(b2).toContain('clip()');
    expect(b2).toContain(`fillStyle=${TAFEL}`);
    const iClip = b2.indexOf('clip()');
    expect(b2.slice(iClip).includes(`strokeStyle=${KONTUR}`), 'dunkle Streifen').toBe(true);
    // Hülle: Kreise um genau die zwei Feldmitten
    const boegen = b2.slice(0, iClip).filter((x) => x.startsWith('arc(')).slice(-2).map((x) => x.slice(4, -1).split(',').map(Number));
    const soll = [mitte(12, 12), mitte(12, 13)];
    boegen.forEach(([x, y], i) => { expect(x).toBeCloseTo(soll[i][0], 6); expect(y).toBeCloseTo(soll[i][1], 6); });
    // DESIGN 13.17.9 F3: Streifen dunkel 5 px + hell 5 px = 10 px quer zur 45°-Linie, waagrecht gemessen 10 / sin 45° = 14,1421 px
    const streifen = b2.slice(iClip, b2.indexOf('stroke()', iClip));
    expect(streifen, 'dunkler Streifen 5 px breit').toContain('lineWidth=5');
    const anfaenge = streifen.filter((x) => x.startsWith('moveTo(')).map((x) => Number(x.slice(7, -1).split(',')[0]));
    expect(anfaenge.length).toBeGreaterThan(2);
    for (let j = 1; j < anfaenge.length; j++) expect(anfaenge[j] - anfaenge[j - 1]).toBeCloseTo(14.1421, 3);

    // Auf gestreiften Feldern kein Band und keine Raute
    const ohne = bild(s(50_300, { tutorial_band: [feld(12, 12, 'd25', [0, 1])], naechstes_feld: [12, 12] }));
    expect(anzahl(ohne, `strokeStyle=${D25}`)).toBe(0);
    expect(ohne.filter((x, i) => (x === 'globalAlpha=0.35' || x === 'globalAlpha=0.55') && ohne[i + 1] === `fillStyle=${ZIEL}`)).toHaveLength(0);

    // Weniger Bewegung: neue Felder sofort voll
    const red = bild(szene({ tutorial_fremd: [[13, 12]], jetzt_ms: 60_000 }), true);
    expect(red).toContain('globalAlpha=0.85');
    expect(red).not.toContain('globalAlpha=0');
  });

  it('Takt fragt die Einblendung nur ab: animationBedarf vor dem ersten Bild startet das Einblenden nicht', () => {
    const s = (t: number): Szene => szene({ tutorial_fremd: [[12, 12]], jetzt_ms: t });
    expect(animationBedarf(s(70_000), false), 'neue Felder vor dem ersten Bild: flüssig').toBe('fluessig');
    expect(animationBedarf(s(70_500), false)).toBe('fluessig');
    expect(bild(s(71_000)), 'das erste Bild beginnt bei 0').toContain('globalAlpha=0');
    expect(animationBedarf(s(71_100), false)).toBe('fluessig');
    expect(animationBedarf(s(71_200), false), 'nach 200 ms still').toBe('keine');
    // Weniger Bewegung: das Bild merkt sich die Felder trotzdem, der Takt wird danach still
    expect(bild(szene({ tutorial_fremd: [[13, 13]], jetzt_ms: 80_000 }), true)).toContain('globalAlpha=0.85');
    expect(animationBedarf(szene({ tutorial_fremd: [[13, 13]], jetzt_ms: 80_300 }), false)).toBe('keine');
  });

  it('ruhe: fremde Blasen wippen nicht, also kein Dauertakt', () => {
    const spiel = new Spiel(neuerSpielstand(0), () => 0);
    const mitFremd = [...objekte, neu('efh', 5, 5, { station: 'kompakt' })];
    const n2 = berechneNetz(mitFremd, [], 1);
    expect(animationBedarf(szene({ objekte: mitFremd, netz: n2, spiel }), false), 'Vorprobe: fremde Blase wippt').toBe('fluessig');
    expect(animationBedarf(szene({ objekte: mitFremd, netz: n2, spiel, ruhe: true }), false)).toBe('keine');
  });

  it('Schlüssel und Takt: Band, Raute, Zielscheibe, Ziel, Ruhe und Fremd ändern den Schlüssel; die Spur nicht mehr', () => {
    const s0 = szenenSchluessel(szene({}));
    // P5 (Entscheidung d): Das Feld Szene.tutorial_spur entfällt. Ein liegengebliebener Wert (alte Steuerung, alter Aufrufer)
    // darf weder den Schlüssel noch das Bild ändern – darum ohne Typ an der Szene vorbei hineingereicht.
    const alteSpur = (spur: Array<[number, number]>): Partial<Szene> => ({ tutorial_spur: spur }) as unknown as Partial<Szene>;
    expect(szenenSchluessel(szene(alteSpur([[10, 11]]))), 'Spur wird nicht mehr gezeichnet').toBe(s0);
    expect(bild(szene(alteSpur([[10, 11], [10, 12]])))).toEqual(bild(szene({})));
    const varianten: Array<Partial<Szene>> = [
      { tutorial_band: [feld(10, 11, 'd32', [0, 1])] },
      { tutorial_band: [feld(10, 11, 'd32', [0, 1], { aktiv: false })] },
      { tutorial_band: [feld(10, 11, 'd32', [0, 1], { falsch: true })] },
      { tutorial_band: [feld(10, 11, 'd25', [0, 1])] },
      { tutorial_band: [feld(10, 11, 'd32', [1, 0])] },
      { naechstes_feld: [10, 11] }, { naechstes_feld: [10, 12] },
      { zielscheibe: [10, 12] },
      { ziel: { stecker: [HAUS1], ring: null } }, { ziel: { stecker: [HAUS1], ring: HAUS1 } },
      { ruhe: true }, { tutorial_fremd: [[12, 12]] },
    ];
    const schluessel = varianten.map((v) => szenenSchluessel(szene(v)));
    expect(new Set([s0, ...schluessel]).size).toBe(varianten.length + 1);
    expect(animationBedarf(szene({ ziel: { stecker: [HAUS1], ring: null } }), false), 'Ziel-Stecker wippt wie jede Blase').toBe('fluessig');
  });

  it('Symbol zielscheibe als SVG mit Ring und Punkt', () => {
    const svg = (SYMBOLE as Record<string, string>).zielscheibe;
    expect(svg).toBeDefined();
    expect((svg.match(/<circle /g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(svg).toContain(KONTUR);
    expect(svg).toContain(ZIEL);
  });

  // Sammelliste P5 Punkt 14 (ENTSCHEIDUNGEN 2026-11-07): Das Band am ersten Feld (10|11) kommt von der Heizzentrale im Osten
  // (hz bei (11|10), Größe 2, belegt also (11|11) direkt östlich von (10|11)) – Fließrichtung der Wärme, nicht von Norden.
  it('Erstes Bandfeld (10|11): Eingang von der Heizzentrale im Osten (Kante zu (11|11)), dann über die Mitte nach Süden', async () => {
    const { bandVorgaenger } = await import('../src/core/tutorial-band');
    expect(bandVorgaenger(10, 11)).toEqual([11, 11]);
    const D32 = '#4caf3e';
    const b = bild(szene({ tutorial_band: [feld(10, 11, 'd32', [0, 1])] }));
    gleichePunkte(punkteNach(b, b.indexOf(`strokeStyle=${D32}`)), [mitte(10.5, 11), mitte(10, 11), mitte(10, 11.5)]);
  });
});
