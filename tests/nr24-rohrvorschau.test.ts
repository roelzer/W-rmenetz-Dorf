import { describe, expect, it } from 'vitest';
import { KATALOG, LEITUNGEN, START_PREISSTUFE, istLeitung } from '../src/core/katalog';
import { berechneNetz, bedarfKw } from '../src/core/netz';
import { rohrBedarf, rohrVorschauText } from '../src/core/engstelle';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import type { Netz, Objekt } from '../src/core/typen';
import { dorf, neu, quelle } from './hilfen';

// NR24 (Lastenheft, Simon 2026-11-11, Reihenfolge Simon per Sprache 2026-11-12): Beim Leitungsziehen zeigt das Spiel die
// kleinste Rohrgröße, die alle Häuser hinter dieser Stelle versorgt. Zahlen nur aus dem Kern (engstelle.ts + Spiel).
// Katalogwerte von Hand: d25 15 kW, d32 25 kW, d40 40 kW, d50 60 kW; EFH 15.000 kWh/a ÷ 1.500 h = 10 kW.
const f = (x: number, y: number): number => y * 24 + x;
const netzAus = (objekte: Objekt[]): Netz => berechneNetz(objekte, [quelle('kessel')], START_PREISSTUFE);

describe('NR24 rohrBedarf (rein)', () => {
  it('25er-Strang mit zwei EFH: vorne 20 kW → 32er nötig, am Ende 10 kW → 25er reicht', () => {
    const netz = netzAus(dorf(neu('d25', 12, 10), neu('d25', 13, 10), neu('d25', 14, 10), neu('d25', 15, 10), neu('efh', 14, 11), neu('efh', 16, 10)));
    expect(netz.spreizung_faktor).toBe(1);
    expect(rohrBedarf(netz, f(12, 10))).toEqual({ last_kw: 20, noetig: 'd32', verbunden: true });
    expect(rohrBedarf(netz, f(15, 10))).toEqual({ last_kw: 10, noetig: 'd25', verbunden: true });
  });

  it('Grenze: genau 40 kW → 40er reicht, nicht 50er', () => {
    const netz = netzAus(dorf(neu('d25', 12, 10), neu('d25', 13, 10), neu('efh', 14, 10), neu('efh', 13, 9), neu('efh', 13, 11), neu('efh', 12, 9)));
    expect(rohrBedarf(netz, f(12, 10))).toEqual({ last_kw: 40, noetig: 'd40', verbunden: true });
  });

  it('Leitung ohne Weg zur Heizzentrale → nicht verbunden; Feld ohne Leitung → null', () => {
    const netz = netzAus(dorf(neu('d25', 20, 20), neu('efh', 21, 20)));
    expect(rohrBedarf(netz, f(20, 20))).toEqual({ last_kw: 0, noetig: null, verbunden: false });
    expect(rohrBedarf(netz, f(5, 5))).toBeNull();
  });

  it('Mehr als die dickste Leitung trägt → noetig null', () => {
    const groesste = KATALOG[LEITUNGEN[LEITUNGEN.length - 1]].kapazitaet_kw as number;
    const netz = netzAus(dorf(neu('d25', 12, 10), neu('efh', 13, 10)));
    const echt = rohrBedarf(netz, f(12, 10))!;
    expect(echt.noetig).toBe('d25');
    // Kapazität wie die Netzrechnung: Katalog × Spreizungsfaktor
    const viel = { ...netz, last_kw: new Map([[f(12, 10), groesste + 1]]) } as Netz;
    expect(rohrBedarf(viel, f(12, 10))).toEqual({ last_kw: groesste + 1, noetig: null, verbunden: true });
  });
});

describe('NR24 rohrVorschauText', () => {
  it('nötige Größe mit Last; zu dünn, wenn der gewählte Stempel dünner ist', () => {
    expect(rohrVorschauText({ last_kw: 20, noetig: 'd32', verbunden: true }, 'd25', null)).toEqual({ text: 'Nötig hier: 32er · 20 kW', zu_duenn: true });
    expect(rohrVorschauText({ last_kw: 20, noetig: 'd32', verbunden: true }, 'd32', null)).toEqual({ text: 'Nötig hier: 32er · 20 kW', zu_duenn: false });
    expect(rohrVorschauText({ last_kw: 20, noetig: 'd32', verbunden: true }, 'd40', null)).toEqual({ text: 'Nötig hier: 32er · 20 kW', zu_duenn: false });
  });
  it('kW werden aufgerundet (nie weniger anzeigen als nötig)', () => {
    expect(rohrVorschauText({ last_kw: 13.3, noetig: 'd25', verbunden: true }, 'd25', null).text).toBe('Nötig hier: 25er · 14 kW');
  });
  it('gesperrte Größe nennt die Stufe', () => {
    expect(rohrVorschauText({ last_kw: 45, noetig: 'd50', verbunden: true }, 'd40', 2)).toEqual({ text: 'Nötig hier: 50er · 45 kW (ab Stufe 2)', zu_duenn: true });
  });
  it('keine Leitung reicht, kein Haus dahinter, nicht verbunden', () => {
    expect(rohrVorschauText({ last_kw: 950, noetig: null, verbunden: true }, 'd160', null)).toEqual({ text: 'Hier 950 kW – mehr als jede Leitung. Leg einen getrennten Abgang.', zu_duenn: true });
    expect(rohrVorschauText({ last_kw: 0, noetig: 'd25', verbunden: true }, 'd25', null)).toEqual({ text: 'Noch kein Haus hinter dieser Stelle.', zu_duenn: false });
    expect(rohrVorschauText({ last_kw: 0, noetig: null, verbunden: false }, 'd25', null)).toEqual({ text: 'Noch nicht mit der Heizzentrale verbunden.', zu_duenn: false });
  });
});

describe('NR24 Spiel.rohrVorschau (Netz wie nach dem Bau)', () => {
  const T0 = 1_000_000_000_000;
  /** Startdorf ohne Leitungen und ohne Stationen (wie tests/nr18-kern.test.ts), Abschnitt offen. */
  function leeresDorf(): Spiel {
    const st = neuerSpielstand(T0);
    st.objekte = st.objekte.filter((o) => !istLeitung(o.typ));
    for (const o of st.objekte) if (o.station) { delete o.station; o.ohne_station = true; }
    const s = new Spiel(st, () => T0);
    if (!s.stand.quelle_gewaehlt) s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 1_000_000;
    s.stand.abschnitt = { phase: 'offen', bau: null };
    s.neuBerechnen();
    return s;
  }
  const WEG: ReadonlyArray<[number, number]> = [[10, 11], [10, 12], [10, 13], [10, 14], [11, 14]];

  it('eingezeichnete Leitung zählt alle erreichten Häuser – auch ohne Übergabestation; erstes Feld trägt alle', () => {
    const s = leeresDorf();
    for (const [x, y] of WEG) expect(s.platzieren('d25', x, y).ok).toBe(true);
    const erreicht = s.erreichteHaeuser().map((id) => s.objekt(id)!).filter((o) => KATALOG[o.typ].kategorie === 'haus');
    expect(erreicht.length).toBeGreaterThanOrEqual(2);
    expect(erreicht.every((o) => o.ohne_station)).toBe(true);
    const summe = erreicht.reduce((a, o) => a + bedarfKw(o), 0);
    const v = s.rohrVorschau(10, 11)!;
    expect(v.verbunden).toBe(true);
    expect(v.last_kw).toBeCloseTo(summe, 6);
    expect(v.noetig).toBe(LEITUNGEN.find((l) => (KATALOG[l].kapazitaet_kw as number) * s.netz.spreizung_faktor >= summe));
    expect(v.noetig_ab_stufe).toBeNull();
    // Das gebaute Netz kennt die eingezeichnete Leitung noch nicht
    expect(s.netz.last_kw.has(f(10, 11))).toBe(false);
  });

  it('nötige Größe noch gesperrt → noetig_ab_stufe; kein Rohr → null', () => {
    const s = leeresDorf();
    for (const [x, y] of WEG) expect(s.platzieren('d25', x, y).ok).toBe(true);
    const v = s.rohrVorschau(10, 11)!;
    if (v.noetig && !s.freigeschaltet(v.noetig)) expect(v.noetig_ab_stufe).toBeGreaterThan(1);
    expect(s.rohrVorschau(0, 0)).toBeNull();
  });
});
