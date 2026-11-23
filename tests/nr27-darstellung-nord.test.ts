import { describe, expect, it } from 'vitest';
import { istLeitung, type TypId } from '../src/core/katalog';
import { berechneNetz } from '../src/core/netz';
import { nordText } from '../src/core/nord-texte';
import { NORD_PLAN, nordviertelAnlegen } from '../src/core/nordviertel';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/start';
import type { Objekt } from '../src/core/typen';
import { Effekte } from '../src/render/effekte';
import { schneefall } from '../src/render/jahreszeiten';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { neu } from './hilfen';
import { aufnahme } from './hilfen/nr22';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';

// NR27 P4, Ergänzung zu tests/nr27-darstellung.test.ts (Bauplan docs/bauplaene/NR27-bahnquerung-entwurf.md Abschnitt 6 P4):
// alle 14 Kulissenhäuser einzeln gezählt, Kulisse ohne Kunden-Schild, Leitungen in der Nordzone verbunden, Schneefall bis zum
// Nordrand (Randfall Winter), Ziehen endet am Sperrfeld. Die Datei ist neu, weil tests/nr27-darstellung.test.ts schon besteht.
// Muster und Zeichen-Protokoll wie tests/nr27-darstellung.test.ts.

const FENSTER_KALT = '#6996ad';
/** Füllfarbe der Schneeflocken (render/jahreszeiten.ts, schneefall). */
const FLOCKE = 'fillStyle=rgba(255,255,255,.82)';

function kamera(mitte: [number, number], zoom: number): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = zoom; k.zentrieren(mitte[0], mitte[1], 1);
  return k;
}
/** Heizzentrale weit südlich im Dorf, damit berechneNetz einen Ursprung hat; sie liegt außerhalb jedes Blicks hier. */
function szene(leitungen: Objekt[], extra: Partial<Szene>): Szene {
  const objekte = [neu('hz', 11, 30), ...leitungen];
  return {
    objekte, innen: [], netz: berechneNetz(objekte, [], 1), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
    verschiebe_id: null, stempel: null, jetzt_ms: 10_000, strassen: [], fluss: [], kw_anzeigen: false, kartenHoehe: 46, ...extra,
  };
}
function bild(s: Szene, k: Kamera, einstellen: (m: Maler) => void = (m) => { m.reduziert = true; }): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  einstellen(m);
  bodenEbeneEinrichten(null);
  zeichneSzene(m, k, s, new Effekte(), 0.016);
  return a.befehle;
}
const zahl = (b: string[], marke: string): number => b.filter((x) => x === marke).length;
/** Flocken = arc-Aufrufe zwischen der Flockenfarbe und dem nächsten fill(). */
function flocken(b: string[]): number {
  const start = b.indexOf(FLOCKE);
  if (start < 0) return 0;
  const ende = b.indexOf('fill()', start);
  return b.slice(start, ende).filter((x) => x.startsWith('arc(')).length;
}

describe('NR27 P4 Kulisse: jedes der 14 Häuser gezeichnet', () => {
  // Fehler, die ihn rot machen: nur ein Teil der Kulisse kommt in die Zeichenliste (z. B. nur eine Hausreihe) oder
  // ein Kulissenhaus läuft durch den normalen Hauszeichner mit warmen Fenstern.
  it('test_nr27_a_kulisse_alle: 5 EFH · 4 + 9 RH · 2 = 38 kalte Fenster', () => {
    const k = (): Kamera => kamera([9, -7], 1.0), leer = szene([], {});
    // Von Hand (render/wohnhaus.ts, fassade): je Haus zwei sichtbare Seiten, je Etage ein kaltes Fenster;
    // EFH 2 Etagen → 4, RH 1 Etage → 2. NORD_PLAN: 5 EFH, 9 RH (Bauplan Abschnitt 3).
    expect(NORD_PLAN.filter((h) => h.typ === 'efh')).toHaveLength(5);
    expect(NORD_PLAN.filter((h) => h.typ === 'rh')).toHaveLength(9);
    expect(zahl(bild({ ...leer, kartenOben: -10, kulisse: [NORD_PLAN[0]] }, k()), `fillStyle=${FENSTER_KALT}`), 'ein EFH').toBe(4);
    expect(zahl(bild({ ...leer, kartenOben: -10, kulisse: [NORD_PLAN[1]] }, k()), `fillStyle=${FENSTER_KALT}`), 'ein RH').toBe(2);
    expect(zahl(bild({ ...leer, kartenOben: -10, kulisse: NORD_PLAN }, k()), `fillStyle=${FENSTER_KALT}`), 'alle 14').toBe(38);
  });
});

describe('NR27 P4 Kulisse: kein Kunden-Schild (DESIGN 14.4 „nicht erreichbar“)', () => {
  // Fehler, der ihn rot macht: ein Kulissenhaus läuft durch den normalen Kundenzweig (Blase, kW-Schild beim Planen).
  it('test_nr27_a_kulisse_ohne_schild: beim Leitungslegen zeigt das Kulissenhaus (2|−9) kein kW-Schild, ein echtes Haus dort schon', () => {
    const k = (): Kamera => kamera([2, -9], 2.2);
    const kw = (b: string[]): number => b.filter((x) => x.startsWith('fillText(') && x.includes(' kW')).length;
    const planen: Partial<Szene> = { kartenOben: -10, modus: 'stempel', kw_anzeigen: true };
    expect(NORD_PLAN[0]).toEqual({ typ: 'efh', x: 2, y: -9 });
    expect(kw(bild(szene([neu('efh', 2, -9)], planen), k())), 'Gegenkontrolle: echtes Haus zeigt sein Schild').toBe(1);
    expect(kw(bild(szene([], { ...planen, kulisse: [NORD_PLAN[0]] }), k())), 'Kulisse ohne Schild').toBe(0);
  });
});

describe('NR27 P4 Leitungen in der Nordzone', () => {
  // Fehler, der ihn rot macht: die Nachbarprüfung in zeichneLeitungen verwirft Nachbarn mit y < 0 (alter Nordrand),
  // dann zeichnet jede Leitung nur ihren Punkt-Stummel statt des Rohrarms zum Nachbarn.
  it('test_nr27_leitung_nord: zwei Leitungen auf (10|−3) und (10|−2) sind verbunden, kein Punkt-Stummel', () => {
    const k = kamera([10, -3], 1.4);
    const stummel = (b: string[], x: number, y: number): boolean => {
      const [cx, cy] = k.mitte(x, y);
      return b.includes(`moveTo(${cx - 1},${cy})`);
    };
    const einzeln = bild(szene([neu('d40', 10, -3)], { kartenOben: -10 }), k);
    expect(stummel(einzeln, 10, -3), 'Gegenkontrolle: einzelne Leitung zeigt den Punkt-Stummel').toBe(true);
    const paar = bild(szene([neu('d40', 10, -3), neu('d40', 10, -2)], { kartenOben: -10 }), k);
    expect(stummel(paar, 10, -3), '(10|−3) verbunden').toBe(false);
    expect(stummel(paar, 10, -2), '(10|−2) verbunden').toBe(false);
  });

  it('test_nr27_leitung_nord: über den alten Nordrand (10|0) ↔ (10|−1) verbunden', () => {
    const k = kamera([10, -1], 1.4);
    const paar = bild(szene([neu('d40', 10, 0), neu('d40', 10, -1)], { kartenOben: -10 }), k);
    for (const y of [0, -1]) {
      const [cx, cy] = k.mitte(10, y);
      expect(paar.includes(`moveTo(${cx - 1},${cy})`), `(10|${y}) verbunden`).toBe(false);
    }
  });
});

describe('NR27 P4 Schneefall bis zum Nordrand (Randfall Winter)', () => {
  // Fehler, die ihn rot machen: schneefall prüft weiter fy < −0,5 (alter Rand) oder zeichneSzene gibt kartenOben nicht weiter.
  it('test_nr27_schnee_nord: schneefall mit oben = −10 zeichnet auch Flocken über der Nordzone, mit oben = 0 nicht', () => {
    // Blick auf (10|−7), Zoom 2,2: der größte Teil des Bildschirms liegt nördlich von y = −0,5
    const k = kamera([10, -7], 2.2);
    const nord = aufnahme(), alt = aufnahme();
    schneefall(new Maler(nord.X), k, 24, 46, -10);
    schneefall(new Maler(alt.X), k, 24, 46);
    expect(flocken(nord.befehle), 'mit Nordzone mehr Flocken als mit altem Rand').toBeGreaterThan(flocken(alt.befehle));
  });

  it('test_nr27_schnee_nord: zeichneSzene im Winter gibt kartenOben an den Schneefall weiter', () => {
    const k = kamera([10, -7], 2.2);
    const winter = (m: Maler): void => { m.reduziert = false; m.jahreszeit = 'winter'; };
    const mit = bild(szene([], { kartenOben: -10, saison: 'winter' }), k, winter);
    const ohne = bild(szene([], { saison: 'winter' }), k, winter);
    expect(flocken(mit), 'mit Nordzone mehr Flocken als mit altem Rand').toBeGreaterThan(flocken(ohne));
  });
});

// Echte Steuerung, echte Zeigerereignisse (Muster tests/nr27-darstellung.test.ts, dort sind die Hilfen dateilokal).
const T0 = 1_000_000_000_000;
function punkt(u: EchteUmgebung, x: number, y: number): [number, number] {
  const k = u.st.kamera as unknown as { mitte(x: number, y: number): [number, number]; feld(a: number, b: number): [number, number] };
  const [mx, my] = k.mitte(x, y);
  expect(k.feld(mx, my), `Testaufbau: Feld (${x}|${y})`).toEqual([x, y]);
  return [mx, my];
}
function zeichne(u: EchteUmgebung, typ: TypId, felder: Array<[number, number]>): void {
  u.st.stempeln(typ);
  u.knoepfe().filter((k) => k.isConnected).find((k) => k.textContent.replace(/\s+/g, ' ').trim() === 'Verstanden')?.click();
  const canvas = u.dom.app.querySelector('canvas')!;
  const evs = felder.map(([x, y]) => { const [mx, my] = punkt(u, x, y); return { pointerId: 7, clientX: mx, clientY: my, pointerType: 'touch', button: 0 }; });
  canvas.ausloesen('pointerdown', evs[0]);
  for (const ev of evs.slice(1)) canvas.ausloesen('pointermove', ev);
  canvas.ausloesen('pointerup', evs[evs.length - 1]);
}

describe('NR27 P4 Ziehen: Leitung endet am letzten erlaubten Feld', () => {
  // Fehler, der ihn rot macht: nach dem Sperrfeld läuft die Schleife weiter (`continue` statt `break`) und setzt jenseits
  // der Bahn eine Leitung, die mit nichts verbunden ist.
  it('test_nr27_ziehen_endet: nach Erschließung, Zug (13|−4) → (13|−1) über die Bahn → ein Toast STELLE, keine Leitung y = −3 … −1', async () => {
    const st = neuerSpielstand(T0);
    st.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
    nordviertelAnlegen(st);
    const s = new Spiel(st, () => T0);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    s.stand.geld_eur = 10_000_000;
    s.neuBerechnen();
    s.ereignisse.splice(0);
    const leitungBei = (x: number, y: number): boolean => s.stand.objekte.some((o) => istLeitung(o.typ) && o.x === x && o.y === y);
    await echteSteuerung(s, (u) => {
      (u.st.kamera as unknown as { zentrieren(x: number, y: number, k: number): void }).zentrieren(13, -3, 1);
      zeichne(u, 'd40', [[13, -5], [13, -4]]);
      expect(leitungBei(13, -4), 'Testaufbau: Leitung hinter der Bahn').toBe(true);
      u.meldungen.splice(0);
      zeichne(u, 'd40', [[13, -4], [13, -1]]);
      expect(u.meldungen).toEqual([nordText('STELLE')]);
      for (const y of [-3, -2, -1]) expect(leitungBei(13, y), `keine Leitung auf (13|${y})`).toBe(false);
    });
  });
});
