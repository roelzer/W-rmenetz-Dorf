import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/start';
import type { TutorialBandFeld } from '../src/core/tutorial-vertrag';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { animationBedarf, szenenSchluessel } from '../src/render/szene-schluessel';
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
function kamera(): Kamera {
  const k = new Kamera();
  k.groesseSetzen(844, 390, 1);
  k.zentrieren(11, 12, 1);
  return k;
}
function bild(s: Szene, reduziert = false): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  m.reduziert = reduziert;
  bodenEbeneEinrichten(null);
  zeichneSzene(m, kamera(), s, new Effekte(), 0.016);
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
  it('Band nur auf den übergebenen Feldern: Füllung in der Zielfarbe von Feldeingang über Mitte zum Ausgang, Doppelrand darunter', () => {
    const leer = bild(szene({}));
    expect(anzahl(leer, `strokeStyle=${D25}`)).toBe(0);
    const b = bild(szene({ tutorial_band: [feld(9, 12, 'd25', [0, 1]), feld(10, 13, 'd25', [0, 1]), feld(10, 14, 'd25', [1, 0])] }));
    const i = b.indexOf(`strokeStyle=${D25}`);
    expect(i, 'Füllung in der Zielfarbe').toBeGreaterThan(-1);
    // (9|12) allein: von halb (9|11,5) über die Mitte nach (9|12,5); (10|14) übernimmt den Eingang von (10|13) und geht nach Osten
    gleichePunkte(punkteNach(b, i), [
      mitte(9, 11.5), mitte(9, 12), mitte(9, 12.5),
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

  it('Zielscheibe auch ohne Bandfeld: Scheibe #ffe08a auf der Feldmitte, darin Ring und Punkt in kontur', () => {
    const leer = bild(szene({}));
    const b = bild(szene({ zielscheibe: [10, 12] }));
    expect(anzahl(b, `fillStyle=${ZIEL}`) - anzahl(leer, `fillStyle=${ZIEL}`)).toBe(1);
    const i = b.indexOf(`fillStyle=${ZIEL}`);
    const [zx, zy] = mitte(10, 12);
    const kreis = b.slice(0, i).reverse().find((x) => x.startsWith('arc('))!;
    const [ax, ay] = kreis.slice(4, -1).split(',').map(Number);
    expect(ax).toBeCloseTo(zx, 6); expect(ay).toBeCloseTo(zy, 6);
    expect(b.slice(i, i + 12)).toContain(`strokeStyle=${KONTUR}`);
  });

  it('genau eine leuchtende Raute auf naechstes_feld (über der Zielscheibe), auch bei mehreren Bandfeldern', () => {
    const raute = (b: string[]): number => b.filter((x, i) => x === 'globalAlpha=0.55' && b[i + 1] === `fillStyle=${ZIEL}`).length;
    const band = [feld(10, 11, 'd32', [0, 1]), feld(10, 12, 'd32', null)];
    expect(raute(bild(szene({ tutorial_band: band })))).toBe(0);
    const b = bild(szene({ tutorial_band: band, naechstes_feld: [10, 12], zielscheibe: [10, 12] }));
    expect(raute(b)).toBe(1);
    const iRaute = b.findIndex((x, i) => x === 'globalAlpha=0.55' && b[i + 1] === `fillStyle=${ZIEL}`);
    expect(b.indexOf(`fillStyle=${ZIEL}`), 'Zielscheibe zuerst, Raute darüber').toBeLessThan(iRaute);
    // Raute × 0,92 um (10|12): erste Ecke wie m.raute
    expect(b.slice(iRaute - 12, iRaute).some((x) => x.startsWith('moveTo('))).toBe(true);
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
    bild(szene({ tutorial_fremd: [], jetzt_ms: 0 }));
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

    // Auf gestreiften Feldern kein Band und keine Raute
    const ohne = bild(s(50_300, { tutorial_band: [feld(12, 12, 'd25', [0, 1])], naechstes_feld: [12, 12] }));
    expect(anzahl(ohne, `strokeStyle=${D25}`)).toBe(0);
    expect(ohne.filter((x, i) => x === 'globalAlpha=0.55' && ohne[i + 1] === `fillStyle=${ZIEL}`)).toHaveLength(0);

    // Weniger Bewegung: neue Felder sofort voll
    const red = bild(szene({ tutorial_fremd: [[13, 12]], jetzt_ms: 60_000 }), true);
    expect(red).toContain('globalAlpha=0.85');
    expect(red).not.toContain('globalAlpha=0');
  });

  it('Schlüssel und Takt: Band, Raute, Zielscheibe, Ziel, Ruhe und Fremd ändern den Schlüssel; die Spur nicht mehr', () => {
    const s0 = szenenSchluessel(szene({}));
    expect(szenenSchluessel(szene({ tutorial_spur: [[10, 11]] })), 'Spur wird nicht mehr gezeichnet').toBe(s0);
    expect(bild(szene({ tutorial_spur: [[10, 11], [10, 12]] }))).toEqual(bild(szene({})));
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
});
