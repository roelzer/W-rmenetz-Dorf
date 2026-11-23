import { describe, expect, it } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { istLeitung, type TypId } from '../src/core/katalog';
import { berechneNetz } from '../src/core/netz';
import { nordText } from '../src/core/nord-texte';
import { bahnFelder, NORD_PLAN, nordInfo } from '../src/core/nordviertel';
import { neuerSpielstand } from '../src/core/start';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { bodenSchluessel, szenenSchluessel } from '../src/render/szene-schluessel';
import { neu } from './hilfen';
import { aufnahme } from './hilfen/nr22';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';

// NR27 P4 (Bauplan docs/bauplaene/NR27-bahnquerung-entwurf.md Abschnitt 6 P4, DESIGN 14.2/14.15 Punkte 1–5).
// Farben von Hand aus DESIGN 14.9: Schiene '#333b41'. Kalte Fenster '#6996ad' (render/wohnhaus.ts, warm = false).
// Sommerwiese zweite Farbe = tokens karte.wiese_a (render/jahreszeiten.ts), nur für Felder innerhalb der Karte.

const T0 = 1_000_000_000_000;
const SCHIENE = '#333b41', FENSTER_KALT = '#6996ad', WIESE_A = '#8dcc55';
const objekte = [neu('hz', 11, 10)];
const netz = berechneNetz(objekte, [], 1);
const szene = (extra: Partial<Szene>): Szene => ({
  objekte, innen: [], netz, spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 10_000, strassen: [], fluss: [], kw_anzeigen: false, ...extra,
});
function bild(s: Szene, mitte: [number, number] = [10, -5], zoom = 1.4): string[] {
  const a = aufnahme(), m = new Maler(a.X), k = new Kamera();
  k.kartenOben = -10;
  k.groesseSetzen(844, 390, 1); k.zoom = zoom; k.zentrieren(mitte[0], mitte[1], 1);
  m.reduziert = true;
  bodenEbeneEinrichten(null);
  zeichneSzene(m, k, s, new Effekte(), 0.016);
  return a.befehle;
}
const zahl = (b: string[], marke: string): number => b.filter((x) => x === marke).length;

describe('NR27 P4 Darstellung: Boden, Gleise, Kulisse', () => {
  // Fehler, die ihn rot machen: Boden beginnt weiter bei y = −2 (kartenOben ignoriert) oder GRAS/Wiesenfarbe mit negativem Index.
  it('test_nr27_a_boden_nord: Boden für y = −10 als Karte gezeichnet, ohne undefined-Farbe', () => {
    const mit = bild(szene({ kartenOben: -10 }), [10, -9], 2.2), ohne = bild(szene({}), [10, -9], 2.2);
    expect(mit.join('\n')).not.toMatch(/=undefined/);
    // wiese_a fällt nur auf Felder innerhalb der Karte (Rand ist immer wiese_b): mit Nordzone deutlich mehr davon im Bild
    expect(zahl(mit, `fillStyle=${WIESE_A}`), 'Nordzone als Karte gezeichnet').toBeGreaterThan(zahl(ohne, `fillStyle=${WIESE_A}`) + 20);
  });

  it('test_nr27_a_boden_nord: Winter und Herbst in der Nordzone ohne undefined', () => {
    for (const saison of ['winter', 'herbst', 'fruehling'] as const) {
      const b = bild(szene({ kartenOben: -10, saison }), [10, -9], 2.2);
      expect(b.join('\n'), saison).not.toMatch(/=undefined|NaN/);
    }
  });

  it('test_nr27_a_gleise: mit bahn werden Schienen gezeichnet, ohne nicht', () => {
    expect(zahl(bild(szene({ kartenOben: -10, bahn: bahnFelder() })), `strokeStyle=${SCHIENE}`)).toBeGreaterThan(0);
    expect(zahl(bild(szene({ kartenOben: -10 })), `strokeStyle=${SCHIENE}`)).toBe(0);
  });

  it('test_nr27_a_kulisse: 14 Kulissenhäuser mit kalten Fenstern; leere Kulisse → anderer Schlüssel', () => {
    const mit = bild(szene({ kartenOben: -10, kulisse: NORD_PLAN }), [9, -7], 1.0);
    const ohne = bild(szene({ kartenOben: -10, kulisse: [] }), [9, -7], 1.0);
    expect(zahl(ohne, `fillStyle=${FENSTER_KALT}`)).toBe(0);
    const einzeln = bild(szene({ kartenOben: -10, kulisse: [NORD_PLAN[0]] }), [9, -7], 1.0);
    const jeHaus = zahl(einzeln, `fillStyle=${FENSTER_KALT}`);
    expect(jeHaus).toBeGreaterThan(0);
    expect(zahl(mit, `fillStyle=${FENSTER_KALT}`), 'alle 14 Häuser gezeichnet').toBeGreaterThanOrEqual(14);
    const k = new Kamera();
    expect(szenenSchluessel(szene({ kulisse: NORD_PLAN }))).not.toBe(szenenSchluessel(szene({ kulisse: [] })));
    expect(bodenSchluessel(szene({ kulisse: NORD_PLAN }), k)).not.toBe(bodenSchluessel(szene({ kulisse: [] }), k));
    expect(bodenSchluessel(szene({ bahn: bahnFelder() }), k)).not.toBe(bodenSchluessel(szene({}), k));
    expect(bodenSchluessel(szene({ kartenOben: -10 }), k)).not.toBe(bodenSchluessel(szene({}), k));
    expect(szenenSchluessel(szene({ kartenOben: -10 }))).not.toBe(szenenSchluessel(szene({})));
  });
});

describe('NR27 P4 Kamera nach Norden', () => {
  const kamera = (kartenHoehe: number): Kamera => {
    const k = new Kamera();
    k.kartenOben = -10; k.kartenHoehe = kartenHoehe;
    k.groesseSetzen(844, 390, 2); k.zoom = 2.2;
    return k;
  };
  const mitteBei = (k: Kamera, x: number, y: number): [number, number] => {
    k.zentrierenBei(x, y, 1, k.breite / 2, k.hoehe / 2);
    return k.feld(k.breite / 2, k.hoehe / 2);
  };
  // Fehler, die ihn rot machen: Grenze rechnet weiter nur mit kartenHoehe (Nordrand y = −10 nicht erreichbar).
  it('test_nr27_kamera_nord: (10|−7) und die Ecke (2|−10) in die Bildmitte; (10|45) bei Stufe 6; ohne Norden wie bisher', () => {
    expect(mitteBei(kamera(24), 10, -7)).toEqual([10, -7]);
    expect(mitteBei(kamera(24), 2, -10)).toEqual([2, -10]);
    expect(mitteBei(kamera(46), 10, 45)).toEqual([10, 45]);
    const alt = new Kamera(); alt.groesseSetzen(844, 390, 2); alt.zoom = 2.2;
    expect(alt.kartenOben).toBe(0);
    expect(mitteBei(alt, 2, -10), 'ohne Nordrand bleibt die alte Grenze').not.toEqual([2, -10]);
  });
});

// Echte Steuerung, echte Zeigerereignisse (Muster tests/nr20-v1-zug.test.ts). Gilt vor und nach P3 (Bahnregeln im Kern).
const spiel = (stufe: number): Spiel => {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  const s = new Spiel(st, () => T0);
  s.stand.abschnitt = { phase: 'offen', bau: null };
  s.stand.geld_eur = 10_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
const leitungBei = (s: Spiel, x: number, y: number) => s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === x && o.y === y);
function punkt(u: EchteUmgebung, x: number, y: number): [number, number] {
  const k = u.st.kamera as unknown as { mitte(x: number, y: number): [number, number]; feld(a: number, b: number): [number, number] };
  const [mx, my] = k.mitte(x, y);
  expect(k.feld(mx, my), `Testaufbau: Feld (${x}|${y})`).toEqual([x, y]);
  return [mx, my];
}
function wische(u: EchteUmgebung, felder: Array<[number, number]>): void {
  const canvas = u.dom.app.querySelector('canvas')!;
  const evs = felder.map(([x, y]) => { const [mx, my] = punkt(u, x, y); return { pointerId: 7, clientX: mx, clientY: my, pointerType: 'touch', button: 0 }; });
  canvas.ausloesen('pointerdown', evs[0]);
  for (const ev of evs.slice(1)) canvas.ausloesen('pointermove', ev);
  canvas.ausloesen('pointerup', evs[evs.length - 1]);
}
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const zeichne = (u: EchteUmgebung, typ: TypId, felder: Array<[number, number]>): void => {
  u.st.stempeln(typ);
  u.knoepfe().filter((k) => k.isConnected).find((k) => norm(k.textContent) === 'Verstanden')?.click();
  wische(u, felder);
};
const blick = (u: EchteUmgebung, x: number, y: number): void => (u.st.kamera as unknown as { zentrieren(x: number, y: number, k: number): void }).zentrieren(x, y, 1);
const keineLeitungAb = (s: Spiel, y: number): boolean => !s.stand.objekte.some((o) => istLeitung(o.typ) && o.y <= y);

describe('NR27 P4 Bedienung: Antippen und Ziehen', () => {
  it('test_nr27_antippen: (5|−9) ohne Objekt → Hinweis nordInfo', async () => {
    const s = spiel(5);
    await echteSteuerung(s, (u) => {
      blick(u, 5, -9);
      const [mx, my] = punkt(u, 5, -9), canvas = u.dom.app.querySelector('canvas')!;
      const ev = { pointerId: 3, clientX: mx, clientY: my, pointerType: 'touch', button: 0 };
      canvas.ausloesen('pointerdown', ev); canvas.ausloesen('pointerup', ev);
      expect(u.meldungen).toEqual([nordInfo(s.stand, 5, -9)]);
      expect(u.meldungen[0]).toBe(nordText('N1'));
    });
  });

  // Fehler, die ihn rot machen: stilles `continue` (kein Toast), ein Toast je Feld, oder die Leitung läuft über das Sperrfeld hinaus.
  it('test_nr27_zusammenspiel_ziehen (a): Stufe 5, Zug (10|0) → (10|−3) → genau ein Toast Q2, keine Leitung y ≤ −2', async () => {
    const s = spiel(5);
    await echteSteuerung(s, (u) => {
      blick(u, 10, -1);
      zeichne(u, 'd40', [[10, 1], [10, 0]]);
      expect(leitungBei(s, 10, 0), 'Testaufbau').toBeDefined();
      u.meldungen.splice(0);
      zeichne(u, 'd40', [[10, 0], [10, -1], [10, -2], [10, -3]]);
      expect(u.meldungen).toEqual([nordText('Q2', { sperrgrund: 'ab Heizzentrale Stufe 6' })]);
      expect(keineLeitungAb(s, -2)).toBe(true);
    });
  });

  it('test_nr27_zusammenspiel_ziehen (b): Stufe 6, Zug (10|0) → (10|−6) → genau ein Toast HINTER, keine Leitung y ≤ −4', async () => {
    const s = spiel(6);
    await echteSteuerung(s, (u) => {
      blick(u, 10, -2);
      zeichne(u, 'd40', [[10, 1], [10, 0]]);
      u.meldungen.splice(0);
      zeichne(u, 'd40', [[10, 0], [10, -6]]);
      expect(u.meldungen).toEqual([nordText('HINTER')]);
      expect(keineLeitungAb(s, -4)).toBe(true);
    });
  });

  it('test_nr27_zusammenspiel_ziehen (c): Stufe 6, Zug (14|0) → (14|−3) → genau ein Toast STELLE, keine Leitung y ≤ −2', async () => {
    const s = spiel(6);
    await echteSteuerung(s, (u) => {
      blick(u, 14, -1);
      zeichne(u, 'd40', [[14, 1], [14, 0]]);
      u.meldungen.splice(0);
      zeichne(u, 'd40', [[14, 0], [14, -1], [14, -2], [14, -3]]);
      expect(u.meldungen).toEqual([nordText('STELLE')]);
      expect(keineLeitungAb(s, -2)).toBe(true);
    });
  });

  it('zweiter Zug meldet wieder genau einmal (Merker wird bei Zugbeginn zurückgesetzt)', async () => {
    const s = spiel(5);
    await echteSteuerung(s, (u) => {
      blick(u, 10, -1);
      zeichne(u, 'd40', [[10, 1], [10, 0]]);
      u.meldungen.splice(0);
      zeichne(u, 'd40', [[10, 0], [10, -3]]);
      zeichne(u, 'd40', [[10, 0], [10, -3]]);
      expect(u.meldungen).toHaveLength(2);
    });
  });
});
