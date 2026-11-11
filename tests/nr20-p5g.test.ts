// Tester-Vorarbeit P5g (DESIGN 13.17.10 G1–G7, Fotocheck docs/pruefberichte/20261107-designer-p5f-final.md N1–N5) und
// Tutorial-Punkte der Sammelliste P5 („Für P7“, nach P5g verschoben, ENTSCHEIDUNGEN 2026-11-07 letzter Eintrag).
// Geprüft wird Verhalten: Ansicht des Kerns, Szene der echten Steuerung, aufgezeichnete Canvas-Befehle, Abdunkel-Fläche.
// Startdorf: Heizzentrale 2×2 ab (11|10), Haus 1 (9|13), Haus 2 (12|14); Spur Haupt (10|11),(10|12) 32er,
// Haus 1 (9|12), Haus 2 (10|13),(10|14),(11|14) 25er (tests/nr21-kern.test.ts Kopf).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tokens from '../design/tokens.json';
import { KATALOG, type TypId } from '../src/core/katalog';
import { berechneNetz } from '../src/core/netz';
import { Spiel } from '../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT, neuesSpielMitTutorial } from '../src/core/start';
import { Tutorial } from '../src/core/tutorial';
import type { TutorialBandFeld } from '../src/core/tutorial-vertrag';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { fremdEinblendungZuruecksetzen } from '../src/render/szene-schluessel';
import { neu } from './hilfen';
import type { El } from './hilfen/dom-attrappe';
import { echteSteuerung } from './hilfen/echte-steuerung';
import { T0, ZUG_HAUS1, abheben, bisT13h, hausBei, knopfMitId, neuesSpiel, st, wischeFelder, type U } from './hilfen/tutorial-zug';

const ZIEL = '#ffe08a', HAKEN_SCHEIBE = 'fillStyle=#d3f0c6';
const SATZ_VOLL = 'Nimm das gestreifte Stück mit Zurück oder Radierer weg. Zieh die 25er von der Abzweigung.';
const SATZ_REST = 'Nimm das gestreifte Stück mit Zurück oder Radierer weg.';
const EIGENER_ABGANG: ReadonlyArray<readonly [number, number]> = [[12, 12], [12, 13]];
/** Eigener Abgang zu Haus 1 (9|13), von Hand aus dem Startdorf gesucht. Seit main 4d2aecd sind Nord- und Ostseite der
 *  Heizzentrale Ausbaureserve (11..13|9..11), und (10|10)/(11|12) liegen neben der Hauptleitung – frei bleibt nur der Abgang
 *  (12|12) an der Südseite. Von dort nach Osten bis (14|12), an der Reserve vorbei nach Norden bis (14|8), auf Reihe 8 nach
 *  Westen bis (6|8), über Spalte 6 nach Süden bis (6|12) und über (7|12), (8|12) ans Leitungsende (8|13) neben Haus 1.
 *  Kein Feld liegt neben Hauptleitung oder Haus-2-Spur, also läuft der Hausweg nicht über den Abzweig (fremd_haus 1, Vorprobe). */
const ABGANG_HAUS1: ReadonlyArray<readonly [number, number]> = [[12, 12], [13, 12], [14, 12], [14, 11], [14, 10], [14, 9], [14, 8],
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 8], [7, 8], [6, 8], [6, 9], [6, 10], [6, 11], [6, 12], [7, 12], [8, 12], [8, 13]];

// ---------------------------------------------------------------- Hilfen: Canvas-Aufnahme (wie tests/nr20-darstellung.test.ts)
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
const szene = (extra: Partial<Szene>): Szene => ({
  objekte, innen: [], netz: berechneNetz(objekte, [], 1), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 90_000, strassen: [], fluss: [], kw_anzeigen: false, ...extra,
});
function kamera(drehung_rad = 0): Kamera {
  const k = new Kamera();
  k.groesseSetzen(844, 390, 1);
  k.zentrieren(11, 12, 1);
  if (drehung_rad) k.drehenUm(drehung_rad);
  return k;
}
function bild(s: Szene, k: Kamera = kamera()): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  bodenEbeneEinrichten(null);
  zeichneSzene(m, k, s, new Effekte(), 0.016);
  return a.befehle;
}
/** Deckkraft, die vor Befehl `i` gilt – mit save()/restore() wie im echten Canvas (z. B. Streifen-Ebene szene.ts ~607). */
const alphaVor = (b: string[], i: number): number => {
  let alpha = 1;
  const stapel: number[] = [];
  for (let j = 0; j < i; j++) {
    if (b[j] === 'save()') stapel.push(alpha);
    else if (b[j] === 'restore()') alpha = stapel.pop() ?? 1;
    else if (b[j].startsWith('globalAlpha=')) alpha = Number(b[j].slice('globalAlpha='.length));
  }
  return alpha;
};
/** Blasen über dem Haus mit Bildschirm-x `cx`. zeichneBlase (src/render/gebaeude.ts:219) beginnt mit
 *  fillStyle=#fff, strokeStyle=…, lineWidth=2.5, beginPath(), arc(cx, …); das Zeichen darin folgt vor der nächsten Blase. */
function blasenBei(b: string[], cx: number): Array<{ i: number; art: 'ziel' | 'haken' | 'andere'; alpha: number }> {
  const r: Array<{ i: number; art: 'ziel' | 'haken' | 'andere'; alpha: number }> = [];
  const istBlase = (i: number): boolean => b[i] === 'fillStyle=#fff' && b[i + 2] === 'lineWidth=2.5' && b[i + 3] === 'beginPath()' && !!b[i + 4]?.startsWith('arc(');
  b.forEach((_x, i) => {
    if (!istBlase(i)) return;
    if (Math.abs(Number(b[i + 4].slice(4, -1).split(',')[0]) - cx) > 1e-6) return;
    let ende = i + 1;
    while (ende < b.length && ende < i + 40 && !istBlase(ende)) ende++;
    const folge = b.slice(i, ende);
    const art = folge.includes(`fillStyle=${ZIEL}`) ? 'ziel' : folge.includes(HAKEN_SCHEIBE) ? 'haken' : 'andere';
    r.push({ i, art, alpha: alphaVor(b, i) });
  });
  return r;
}

// ---------------------------------------------------------------- Hilfen: Kern (wie tests/nr21-feinschliff-kern.test.ts)
type Strich = readonly [TypId, number, number];
const HAUPT: Strich[] = TUTORIAL_HAUPT.map(([x, y]) => ['d32', x, y] as const);
const A1: Strich[] = TUTORIAL_ANSCHLUSS_1.map(([x, y]) => ['d25', x, y] as const);
const A2: Strich[] = TUTORIAL_ANSCHLUSS_2.map(([x, y]) => ['d25', x, y] as const);
function offenMit(striche: Strich[]): { s: Spiel; t: Tutorial } {
  const uhr = { t: T0 };
  const s = new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);
  s.namenSetzen('Anna', 'Heatville');
  s.stand.geld_eur = 30_000;
  expect(s.abschnittPlanen().ok).toBe(true);
  uhr.t += 10_000; s.bis(uhr.t);
  for (const [typ, x, y] of striche) expect(s.platzieren(typ, x, y).ok, `${typ} auf (${x}|${y})`).toBe(true);
  const t = new Tutorial(s);
  t.zustandPruefen();
  return { s, t };
}
const hausId = (s: Spiel, i: 0 | 1): number => {
  const [x, y] = ERSTE_HAEUSER[i];
  return s.stand.objekte.find((o) => o.x === x && o.y === y && KATALOG[o.typ].kategorie === 'haus')!.id;
};

// ================================================================= G3 – Kern
describe('P5g G3: T13h, beide Häuser richtig angeschlossen, aber noch ein gestreifter Rest', () => {
  // Fehler, die rot machen: zweiter Satz bleibt; Zielscheibe bleibt; Raute/Band/Ring/Finger kommen zurück; Sperre mit vollem Satz.
  for (const [name, rest] of [
    ['Rest (12|12) unter der Heizzentrale', [['d25', 12, 12]]],
    ['unverbundener Rest (14|12)', [['d25', 14, 12]]],
    ['zwei Rest-Felder (12|12),(15|12)', [['d25', 12, 12], ['d25', 15, 12]]],
  ] as Array<[string, Strich[]]>) {
    it(`test_g3_nur_erster_satz_ohne_zielscheibe: ${name}`, () => {
      const { s, t } = offenMit([...HAUPT, ...A1, ...A2, ...rest]);
      const lg = s.tutorialLeitungen();
      expect([lg.haus1_ok, lg.haus2_ok], 'Vorprobe: beide Häuser richtig').toEqual([true, true]);
      expect(lg.fremd.length, 'Vorprobe: Rest ist fremd').toBe(rest.length);
      const a = t.ansicht(T0)!;
      expect(a.schritt).toBe('T13h');
      expect(a.text).toBe(SATZ_REST);
      expect(a.text.length).toBe(55);
      expect(a.zielscheibe).toBeNull();
      expect(a.naechstes_feld).toBeNull();
      expect(a.band).toEqual([]);
      expect(a.ziel_ring).toBeNull();
      expect(a.finger_weg).toEqual([]);
      expect([...a.erreicht_ids].sort()).toEqual([hausId(s, 0), hausId(s, 1)].sort());
      expect(a.fremd.length).toBe(rest.length);
    });
  }

  it('test_g3_sperre_abschliessen_nur_erster_satz: Antippen von [Abschnitt abschließen] zeigt nur den ersten Satz, Knopfzeile „Stück muss weg“', () => {
    const { t } = offenMit([...HAUPT, ...A1, ...A2, ['d25', 12, 12]]);
    expect(t.sperre('abschliessen')).toEqual({ kurz: 'Stück muss weg', satz: SATZ_REST });
    t.gesperrtGetippt('abschliessen');
    expect(t.ansicht(T0)!.text).toBe(SATZ_REST);
  });

  it('test_g3_rest_weg_dann_t14: Rest weg → T14 (keine Zielscheibe, kein Satz zum Wegnehmen)', () => {
    const { s, t } = offenMit([...HAUPT, ...A1, ...A2, ['d25', 12, 12]]);
    expect(s.geplanteLeitungEntfernen(12, 12).ok).toBe(true);
    t.handlung();
    expect(t.ansicht(T0)!.schritt).toBe('T14');
  });

  it('test_g3_ein_haus_offen_bleibt_voller_satz: eigener Abgang zu Haus 2 (Haus 2 nicht richtig) → beide Sätze und Zielscheibe wie bisher', () => {
    const { t } = offenMit([...HAUPT, ...A1, ['d25', 12, 12], ['d25', 12, 13]]);
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', text: SATZ_VOLL, zielscheibe: [10, 12] });
    expect(t.sperre('abschliessen')?.satz).toBe(SATZ_VOLL);
  });

  // Review P5g (Nachtrag Tester P7et). Fehler, der ihn rot macht: G3 prüft nur Haus 2 (bzw. „irgendein Haus ok“) – dann
  // fehlte hier, wo Haus 1 noch offen ist, die Aufforderung zum Ziehen.
  it('test_g3_haus2_richtig_eigener_abgang_haus1_voller_satz: Haus 2 vom Abzweig, Haus 1 über eigenen Abgang → voller Satz', () => {
    const { s, t } = offenMit([...HAUPT, ...A2, ...ABGANG_HAUS1.map(([x, y]) => ['d25', x, y] as const)]);
    const lg = s.tutorialLeitungen();
    expect([lg.haus1_ok, lg.haus2_ok, lg.fremd_haus], 'Vorprobe: Haus 2 richtig, Haus 1 über eigenen Abgang').toEqual([false, true, 1]);
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', text: SATZ_VOLL, zielscheibe: [10, 12] });
    expect(t.sperre('abschliessen')?.satz).toBe(SATZ_VOLL);
  });

  it('test_g3_nach_zurueck_und_haus2_richtig: Rest nach [Zurück], dann Haus 2 vom Abzweig → nur erster Satz, Zielscheibe weg', () => {
    const { s, t } = offenMit([...HAUPT, ...A1, ['d25', 12, 12], ['d25', 12, 13]]);
    expect(s.letzteLeitungZurueck().ok).toBe(true); t.handlung();
    for (const [typ, x, y] of A2) { expect(s.platzieren(typ, x, y).ok).toBe(true); t.handlung(); }
    expect(s.tutorialLeitungen().haus2_ok).toBe(true);
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', text: SATZ_REST, zielscheibe: null, naechstes_feld: null, band: [], fremd: [[12, 12]] });
  });
});

// ================================================================= G1, G4, G7 – Darstellung
describe('P5g G1: Streifen über den halb durchsichtigen Gebäuden, unter Steckern, Haken und Zielscheibe', () => {
  beforeEach(() => fremdEinblendungZuruecksetzen());
  it('test_g1_ebene_streifen: beim Planen nach der Heizzentrale (durchsichtig), vor Ziel-Stecker, Haken und Zielscheibe', () => {
    // Fehler: Streifen wieder unter den Gebäuden (vor der Wand) oder über Steckern/Haken/Zielscheibe.
    const HZ_WAND = 'fillStyle=#86412e';
    const mitRohr = [...objekte, neu('d25', 12, 12)];
    const b = bild(szene({ objekte: mitRohr, netz: berechneNetz(mitRohr, [], 1), modus: 'stempel', tutorial_fremd: [[12, 12]],
      ziel: { stecker: [HAUS1, HAUS2], ring: null }, erreicht: [{ id: HAUS1, seit_ms: 0 }], zielscheibe: [10, 12] }));
    const streifen = b.indexOf('clip()');
    expect(streifen).toBeGreaterThan(-1);
    expect(streifen, 'über der durchsichtigen Heizzentrale').toBeGreaterThan(b.lastIndexOf(HZ_WAND));
    const k = kamera(), [h2x] = k.mitte(12, 14), [h1x] = k.mitte(9, 13);
    const stecker = blasenBei(b, h2x).find((x) => x.art === 'ziel'), haken = blasenBei(b, h1x).find((x) => x.art === 'haken');
    expect(stecker && haken, 'Vorprobe: Stecker an Haus 2, Haken an Haus 1').toBeTruthy();
    expect(streifen, 'unter dem Ziel-Stecker').toBeLessThan(stecker!.i);
    expect(streifen, 'unter dem Haken').toBeLessThan(haken!.i);
    expect(streifen, 'unter der Zielscheibe').toBeLessThan(b.lastIndexOf(`fillStyle=${ZIEL}`));
  });
});

describe('P5g G4: Band auf dem Rautenfeld voll deckend', () => {
  it('test_g4_band_auf_rautenfeld_deckkraft_1: Füllstrich, der durch die Rautenfeld-Mitte läuft, mit Deckkraft 1; übrige Bandfelder 0,75', () => {
    // Fehler: Band auf dem Rautenfeld weiter 0,75 (Grün ausgewaschen) oder das ganze Band auf 1.
    const D25 = '#d8392f', k = kamera(), bb = Math.max(12, Math.round(k.tw * 0.28));
    const band: TutorialBandFeld[] = [
      { x: 10, y: 13, typ: 'd25', aktiv: true, falsch: false, pfeil: [0, 1] },
      { x: 10, y: 14, typ: 'd25', aktiv: true, falsch: false, pfeil: [1, 0] },
      { x: 11, y: 14, typ: 'd25', aktiv: true, falsch: false, pfeil: [1, 0] },
    ];
    const b = bild(szene({ tutorial_band: band, naechstes_feld: [10, 13] }), k);
    // Füllstriche: strokeStyle Bandfarbe mit Breite b − 6 (Doppelrand 2 × 1,5 + 2 × 1,5), Punkte bis zum stroke()
    const striche: Array<{ alpha: number; punkte: Array<[number, number]> }> = [];
    b.forEach((x, i) => {
      if (x !== `strokeStyle=${D25}` || !b.slice(i, i + 4).includes(`lineWidth=${bb - 6}`)) return;
      const punkte: Array<[number, number]> = [];
      for (let j = i + 1; j < b.length && b[j] !== 'stroke()'; j++) {
        const t = /^(moveTo|lineTo)\(([^,]+),([^,]+)\)$/.exec(b[j]);
        if (t) punkte.push([Number(t[2]), Number(t[3])]);
      }
      striche.push({ alpha: alphaVor(b, b.indexOf('stroke()', i)), punkte });
    });
    const durch = (x: number, y: number) => {
      const [mx, my] = k.mitte(x, y);
      return striche.filter((s) => s.punkte.some(([px, py]) => Math.abs(px - mx) < 1e-6 && Math.abs(py - my) < 1e-6));
    };
    expect(durch(10, 13).length, 'Vorprobe: Rautenfeld hat einen Füllstrich').toBeGreaterThan(0);
    // Der oberste Füllstrich durch die Rautenfeld-Mitte entscheidet, was man sieht (ein darunterliegender 0,75-Strich der
    // ganzen Gruppe ist erlaubt, wenn das Rautenfeld darüber voll gemalt wird).
    expect(durch(10, 13).at(-1)!.alpha, 'Rautenfeld (10|13), oberster Füllstrich').toBe(1);
    for (const [x, y] of [[10, 14], [11, 14]] as const) for (const s of durch(x, y)) expect(s.alpha, `(${x}|${y})`).toBe(0.75);
  });

  it('test_g4_tokens: faktor.naechstes_feld_deckkraft = 0, faktor.geist_deckkraft_raute = 1 (DESIGN 13.17.10 G4)', () => {
    const f = tokens.menue.faktor as Record<string, number>;
    expect(f.naechstes_feld_deckkraft).toBe(0);
    expect(f.geist_deckkraft_raute).toBe(1);
  });
});

describe('P5g G7: Pfeilspitze zeigt auf dem Bildschirm zur Mitte des nächsten Felds', () => {
  // Fehler: Spitze zeigt pauschal nach oben/links, oder die Form ist so gleichseitig, dass eine andere Ecke als Spitze gelesen
  // wird (Foto t13h: ▲ auf (9|12), obwohl der Weg nach links unten geht).
  // Annahme des Testers (Auslegung von „zeigt“): Die Spitze ist die Ecke des gefüllten Pfeil-Umrisses, die am weitesten vom
  // Schwerpunkt der Ecken entfernt liegt, und zwar eindeutig – mindestens 1,25-mal so weit wie jede andere Ecke. Ihre Richtung
  // vom Schwerpunkt weicht höchstens 12° von der Richtung Feldmitte → Mitte des nächsten Felds ab.
  const FAELLE: Array<{ feld: [number, number]; naechstes: [number, number]; typ: TypId; pfeil: [number, number] }> = [
    { feld: [10, 11], naechstes: [10, 12], typ: 'd32', pfeil: [0, 1] },
    { feld: [9, 12], naechstes: [9, 13], typ: 'd25', pfeil: [0, 1] },   // letztes Feld → Haus 1
    { feld: [10, 13], naechstes: [10, 14], typ: 'd25', pfeil: [0, 1] },
    { feld: [10, 14], naechstes: [11, 14], typ: 'd25', pfeil: [1, 0] },
    { feld: [11, 14], naechstes: [12, 14], typ: 'd25', pfeil: [1, 0] }, // letztes Feld → Haus 2
  ];
  /** gefüllte Vielecke (beginPath, moveTo, lineTo…, closePath … fill) mit ihren Ecken */
  function vielecke(b: string[]): Array<Array<[number, number]>> {
    const r: Array<Array<[number, number]>> = [];
    b.forEach((x, i) => {
      if (x !== 'beginPath()' || !b[i + 1]?.startsWith('moveTo(')) return;
      const p: Array<[number, number]> = [];
      let j = i + 1;
      for (; j < b.length; j++) {
        const t = /^(moveTo|lineTo)\(([^,]+),([^,]+)\)$/.exec(b[j]);
        if (t) p.push([Number(t[2]), Number(t[3])]); else break;
      }
      if (b[j] !== 'closePath()') return;
      const ende = b.slice(j, j + 8);
      if (ende.includes('fill()') && p.length >= 3) r.push(p);
    });
    return r;
  }
  function spitze(p: Array<[number, number]>): { richtung: number; eindeutig: number } {
    const sx = p.reduce((a, q) => a + q[0], 0) / p.length, sy = p.reduce((a, q) => a + q[1], 0) / p.length;
    const d = p.map(([x, y]) => Math.hypot(x - sx, y - sy));
    const i = d.indexOf(Math.max(...d)), zweit = Math.max(...d.filter((_v, j) => j !== i));
    return { richtung: Math.atan2(p[i][1] - sy, p[i][0] - sx), eindeutig: d[i] / zweit };
  }
  const winkelAbstand = (a: number, c: number): number => { const w = Math.abs(a - c) % (2 * Math.PI); return Math.min(w, 2 * Math.PI - w) * 180 / Math.PI; };

  for (const drehung of [0, Math.PI / 2]) {
    for (const f of FAELLE) {
      it(`test_g7_pfeil_zum_naechsten_feld: (${f.feld.join('|')}) → (${f.naechstes.join('|')})${drehung ? ', Karte um 90° gedreht' : ''}`, () => {
        const k = kamera(drehung);
        const leer = vielecke(bild(szene({}), k)).map((p) => JSON.stringify(p));
        const band: TutorialBandFeld[] = [{ x: f.feld[0], y: f.feld[1], typ: f.typ, aktiv: true, falsch: false, pfeil: f.pfeil }];
        const neue = vielecke(bild(szene({ tutorial_band: band }), k)).filter((p) => !leer.includes(JSON.stringify(p)));
        // Pfeil = neues gefülltes Vieleck nahe der Feldmitte (höchstens eine halbe Feldbreite entfernt)
        const [mx, my] = k.mitte(f.feld[0], f.feld[1]);
        const pfeile = neue.filter((p) => p.every(([x, y]) => Math.hypot(x - mx, y - my) < k.tw / 2));
        expect(pfeile.length, 'Vorprobe: ein Pfeil auf dem Feld').toBe(1);
        const [nx, ny] = k.mitte(f.naechstes[0], f.naechstes[1]);
        const soll = Math.atan2(ny - my, nx - mx);
        const sp = spitze(pfeile[0]);
        expect(sp.eindeutig, 'Spitze eindeutig (≥ 1,25 × jede andere Ecke)').toBeGreaterThanOrEqual(1.25);
        expect(winkelAbstand(sp.richtung, soll), 'Abweichung zur Richtung des nächsten Felds in Grad').toBeLessThanOrEqual(12);
      });
    }
  }
});

// ================================================================= G2, G5, G6, Sammelliste – echte Steuerung
const leinwand = (u: U): El => u.dom.app.querySelector('canvas')!;
const zeiger = (x: number, y: number) => ({ pointerId: 7, clientX: x, clientY: y, pointerType: 'touch', button: 0 });
/** Zug Feld für Feld mit einem Bild (tick) nach jedem Schritt; der Finger bleibt liegen. */
function ziehenMitBildern(u: U, uhr: { t: number }, felder: ReadonlyArray<readonly [number, number]>): void {
  felder.forEach(([x, y], i) => {
    const [mx, my] = st(u).kamera.mitte(x, y);
    leinwand(u).ausloesen(i ? 'pointermove' : 'pointerdown', zeiger(mx, my));
    uhr.t += 16; st(u).tick(uhr.t);
  });
}
const erreichtIds = (u: U): number[] => (st(u).szene().erreicht ?? []).map((e) => e.id);
function szenenBild(u: U): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  bodenEbeneEinrichten(null);
  zeichneSzene(m, st(u).kamera as unknown as Kamera, (u.st as unknown as { szene(): Szene }).szene(), new Effekte(), 0.016);
  return a.befehle;
}
const steckerVon = (u: U, spiel: Spiel, i: 0 | 1) => {
  const h = hausBei(spiel, ERSTE_HAEUSER[i]), [cx] = st(u).kamera.mitte(h.x, h.y);
  return blasenBei(szenenBild(u), cx);
};

describe('P5g mit der echten Steuerung', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_g2_haken_live_bei_richtigem_zug: Zug zu Haus 1 erreicht das Haus → Haken sofort, noch vor dem Abheben', async () => {
    // Fehler: Haken wartet bis zum Abheben (F8 zu weit ausgelegt).
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      const h1 = hausBei(spiel, ERSTE_HAEUSER[0]).id;
      ziehenMitBildern(u, uhr, ZUG_HAUS1);
      expect(erreichtIds(u), 'Finger liegt noch auf Haus 1').toContain(h1);
    }, { uhr: () => uhr.t });
  });

  it('test_g2_kein_haken_bei_eigenem_abgang: Zug (12|12)→(12|13) bis aufs Haus 2 → zu keinem Zeitpunkt ein Haken an Haus 2', async () => {
    // Fehler: Haken blitzt im Zug auf (live), obwohl der Zug nach dem Abheben als „muss weg“ zählt.
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      const h2 = hausBei(spiel, ERSTE_HAEUSER[1]).id;
      const zug = [...EIGENER_ABGANG, ERSTE_HAEUSER[1]];
      zug.forEach(([x, y], i) => {
        const [mx, my] = st(u).kamera.mitte(x, y);
        leinwand(u).ausloesen(i ? 'pointermove' : 'pointerdown', zeiger(mx, my));
        uhr.t += 16; st(u).tick(uhr.t);
        expect(erreichtIds(u), `im Zug nach (${x}|${y})`).not.toContain(h2);
        expect(steckerVon(u, spiel, 1).some((b) => b.art === 'haken'), `kein gezeichneter Haken nach (${x}|${y})`).toBe(false);
      });
      abheben(u, ERSTE_HAEUSER[1]); uhr.t += 16; st(u).tick(uhr.t);
      expect(erreichtIds(u), 'nach dem Abheben').not.toContain(h2);
      expect(st(u).anleitungAnsicht()!.text, 'Vorprobe: eigener Abgang erkannt').toBe(SATZ_VOLL);
    }, { uhr: () => uhr.t });
  });

  it('test_g5_stecker_blass_bei_eigenem_abgang: Stecker von Haus 2 blass, solange die Zielscheibe wegen des Abgangs steht; danach Haken', async () => {
    // Fehler: Stecker unter der Zielscheibe voll (zwei gleiche Zeichen übereinander) oder blass bleibt im normalen T13h.
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); uhr.t += 16; st(u).tick(uhr.t);
      const steckerAlpha = (): number => {
        const s = steckerVon(u, spiel, 1).filter((b) => b.art === 'ziel');
        expect(s.length, 'Vorprobe: genau ein Ziel-Stecker an Haus 2').toBe(1);
        return s[0].alpha;
      };
      expect(st(u).anleitungAnsicht()!.zielscheibe, 'Zwischenstand ohne Abgang: keine Zielscheibe').toBeNull();
      expect(steckerAlpha(), 'normaler Zwischenstand: Stecker voll').toBe(1);
      wischeFelder(u, [...EIGENER_ABGANG, ERSTE_HAEUSER[1]]); uhr.t += 16; st(u).tick(uhr.t);
      expect(st(u).anleitungAnsicht()!.zielscheibe, 'Vorprobe: Zielscheibe wieder da').toEqual([10, 12]);
      expect(steckerAlpha(), 'eigener Abgang: Stecker blass').toBeCloseTo(0.35, 6);
      expect(steckerVon(u, spiel, 0).filter((b) => b.art === 'haken').every((b) => b.alpha === 1), 'Haken an Haus 1 voll').toBe(true);
      // Stück ganz weg (Zielscheibe bleibt laut F8 bis Haus 2 richtig ist) → Stecker bleibt blass
      knopfMitId(u, 'radierer')!.click(); uhr.t += 16; st(u).tick(uhr.t);
      wischeFelder(u, EIGENER_ABGANG); uhr.t += 16; st(u).tick(uhr.t);
      expect(st(u).anleitungAnsicht()!.fremd).toEqual([]);
      expect(st(u).anleitungAnsicht()!.zielscheibe, 'Vorprobe: Zielscheibe bleibt nach dem Wegnehmen').toEqual([10, 12]);
      expect(steckerAlpha(), 'Zielscheibe steht noch: Stecker blass').toBeCloseTo(0.35, 6);
    }, { uhr: () => uhr.t });
  });

  // Review P5g (Nachtrag Tester P7et). Fehler, der ihn rot macht: statt nur das Ring-Haus wird der Stecker aller Häuser blass
  // (z. B. `stecker_blass = true` statt `stecker_blass_ids`) – dann verlöre das noch offene Haus 2 sein Ziel-Zeichen.
  it('test_g5_eigener_abgang_haus1_nur_haus1_blass: eigener Abgang zu Haus 1, Haus 2 offen → Stecker Haus 1 0,35, Haus 2 voll', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      for (const [x, y] of ABGANG_HAUS1) expect(spiel.platzieren('d25', x, y).ok, `25er auf (${x}|${y})`).toBe(true);
      (u.st as unknown as { anleitung: { handlung(): void } }).anleitung.handlung();
      uhr.t += 16; st(u).tick(uhr.t);
      const lg = spiel.tutorialLeitungen();
      expect([lg.haus1_ok, lg.haus2_ok, lg.fremd_haus], 'Vorprobe: eigener Abgang zu Haus 1, Haus 2 offen').toEqual([false, false, 1]);
      const a = st(u).anleitungAnsicht()!;
      expect([a.zielscheibe, a.ziel_ring], 'Vorprobe: Zielscheibe und Ring an Haus 1').toEqual([[10, 12], hausBei(spiel, ERSTE_HAEUSER[0]).id]);
      const ziel = (i: 0 | 1) => steckerVon(u, spiel, i).filter((b) => b.art === 'ziel');
      expect(ziel(0).map((b) => b.alpha), 'Stecker Haus 1 (Ring-Haus) blass').toEqual([0.35]);
      expect(ziel(1).map((b) => b.alpha), 'Stecker Haus 2 voll').toEqual([1]);
    }, { uhr: () => uhr.t });
  });

  // Vorrang main (Commit 9918f8d, ENTSCHEIDUNGEN 2026-11-11): Beim Leitungsziehen ist die ganze Karte hell – in T13h liegt keine
  // Abdunkel-Fläche über Karte, Zeichenleiste oder Anzeigenreihe (ersetzt G6 „nur Anzeigenreihe“ für diesen Schritt).
  // Fehler, der ihn rot macht: T13h dunkelt weiter ab ('nur_hud'/'alles') oder die Abdunkel-Ebene bleibt sichtbar.
  it('test_g6_abdunkeln_t13h_nichts: in T13h liegt keine Abdunkel-Fläche über dem Bildschirm', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      // Lage wie im Browser (Foto 844×390): HUD-Behälter über den ganzen Bildschirm, die Anzeigenreihe oben links/mitte
      const setze = (el: El | null, x: number, y: number, b: number, h: number): void => {
        if (el) el.rechteck = { left: x, top: y, right: x + b, bottom: y + h, width: b, height: h, x, y };
      };
      const hud = (u.st as unknown as { hud: { wurzel: El } }).hud.wurzel;
      setze(hud, 0, 0, 844, 390);
      setze(u.dom.html.querySelector('.hud-links'), 8, 8, 260, 60);
      setze(u.dom.html.querySelector('.dorfschild'), 8, 8, 200, 56);
      setze(u.dom.html.querySelector('.pillen'), 300, 8, 230, 40);
      bisT13h(u, spiel, uhr);
      uhr.t += 16; st(u).tick(uhr.t);
      expect(st(u).anleitungAnsicht()!.abdunkeln, 'T13h ohne Abdunkeln').toBe('nichts');
      const dunkel = u.dom.html.querySelector('.spot-dunkel');
      expect(dunkel, 'Vorprobe: Abdunkel-Ebene da (Tutorial läuft)').not.toBeNull();
      expect(dunkel!.hidden, 'Abdunkel-Ebene unsichtbar').toBe(true);
    }, { uhr: () => uhr.t });
  });

  it('test_sammel_leiste_im_zug_nicht_neu_gebaut: im Zug mit eigenem Abgang baut kein Bild die Zeichenleiste neu, solange der Finger liegt', async () => {
    // Sammelliste P5 (aus P5f-3): Leisten-Abgleich je Bild liest die gehaltene Sperre (steuerung.ts ~1001). Fehler: Abgleich
    // gegen die aktuelle Sperre → Neuaufbau der Leiste in jedem Bild des Zugs.
    // Gezählt werden nur Aufrufe aus den Bildern (tick). Jedes gesetzte Rohr baut die Leiste über geaendert() (steuerung.ts ~218)
    // einmal neu (Kosten, Knöpfe) – das ist ein Ereignis, kein Bild, und gehört nicht zu diesem Befund.
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); uhr.t += 16; st(u).tick(uhr.t);
      const zaehler = vi.spyOn(u.st as unknown as { leisteAufbauen(): void }, 'leisteAufbauen');
      let ausBildern = 0;
      const bild = (): void => { const vor = zaehler.mock.calls.length; uhr.t += 16; st(u).tick(uhr.t); ausBildern += zaehler.mock.calls.length - vor; };
      [...EIGENER_ABGANG, ERSTE_HAEUSER[1]].forEach(([x, y], i) => {
        const [mx, my] = st(u).kamera.mitte(x, y);
        leinwand(u).ausloesen(i ? 'pointermove' : 'pointerdown', zeiger(mx, my));
        bild();
      });
      for (let i = 0; i < 3; i++) bild();
      expect(st(u).anleitungAnsicht()!.fremd.length, 'Vorprobe: Abgang liegt (Kern sieht ihn)').toBeGreaterThan(0);
      expect(ausBildern, 'Neuaufbauten der Leiste aus Bildern, Finger liegt noch').toBe(0);
      abheben(u, ERSTE_HAEUSER[1]); uhr.t += 16; st(u).tick(uhr.t);
      expect(zaehler.mock.calls.length, 'nach dem Abheben wechselt die Knopfzeile auf „Stück muss weg“').toBeGreaterThan(0);
    }, { uhr: () => uhr.t });
  });
});
