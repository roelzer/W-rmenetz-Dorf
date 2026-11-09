import { describe, expect, it } from 'vitest';
import { pruefeAuftraege, AUFTRAEGE } from '../src/core/auftraege';
import { KATALOG, passendeStation, type TypId } from '../src/core/katalog';
import { berechneNetz } from '../src/core/netz';
import { laden, ladenMitBefund, serialisieren } from '../src/core/speichern';
import { Spiel } from '../src/core/spiel';
import { ERSTE_HAEUSER, neuerSpielstand } from '../src/core/start';
import type { Objekt, Spielstand } from '../src/core/typen';
import { altesStartdorf, frueheresAusbauHaus } from './hilfen/altes-startdorf';
import { abschnittBauen, abschnittOeffnen, objektBei, type Uhr } from './hilfen/nr18';

// Bauplan docs/bauplaene/NR18-ohne-autoanschluss.md, Fassung 3, Abschnitte 5.2/5.3 und „Bauplan P5“.
// Werte von Hand aus dem Katalog: Startgeld 30.000 €, 100 Taler, Preisstufe 5, Hackschnitzelkessel Stufe 1 = 60 kW.
// Tutorial-Spur: Leitung (10|10)…(10|14), (11|14) von der Heizzentrale (11|10) nach Süden.
const T0 = 1_000_000;
const SPUR: ReadonlyArray<readonly [number, number]> = [[10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [11, 14]];

const istHaus = (o: Objekt): boolean => KATALOG[o.typ].kategorie === 'haus';
const istLeitung = (o: Objekt): boolean => KATALOG[o.typ].kategorie === 'netz';
const hausBei = (st: Spielstand, x: number, y: number): Objekt => {
  const h = st.objekte.find((o) => o.x === x && o.y === y && istHaus(o));
  if (!h) throw new Error(`kein Haus bei (${x}|${y})`);
  return h;
};
/** Gebaute Leitung direkt in den Stand legen (ohne Bauabschnitt), so wie ein alter Stand sie enthält. */
const leitungLegen = (st: Spielstand, typ: TypId, x: number, y: number): void => {
  st.objekte.push({ id: st.naechste_id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0 });
};

describe('NR13 neuer Spielstart (P5)', () => {
  it('hält die Ausbaufläche für Stufe 3 in neuen und geladenen Spielständen frei', () => {
    const stand = neuerSpielstand(T0);
    const neu = new Spiel(stand, () => T0);
    expect(neu.kannPlatzieren('hz', neu.hz.x, neu.hz.y, neu.hz.id, 3)).toBe(true);

    const haus = frueheresAusbauHaus(6);
    stand.objekte.push(haus);
    expect(neu.kannPlatzieren('hz', neu.hz.x, neu.hz.y, neu.hz.id, 3)).toBe(false);
    const geladen = new Spiel(laden(serialisieren(stand), T0), () => T0);
    expect(geladen.kannPlatzieren('hz', geladen.hz.x, geladen.hz.y, geladen.hz.id, 3)).toBe(true);

    haus.bestand = false;
    expect(laden(serialisieren(stand), T0).objekte).toContainEqual(haus);
  });

  it('test_nr13_start_ohne_leitung_und_station: keine Leitung, kein Haus mit Station, nichts warm, Geld/Taler/Preis wie vorher', () => {
    const st = neuerSpielstand(T0);
    expect(st.objekte.filter(istLeitung)).toEqual([]);
    expect(st.objekte.filter((o) => o.station !== undefined)).toEqual([]);
    const haeuser = st.objekte.filter(istHaus);
    expect(haeuser.length).toBe(41);
    expect(haeuser.every((h) => h.ohne_station === true)).toBe(true);
    expect(st.geld_eur).toBe(30_000);
    expect(st.taler).toBe(100);
    expect(st.preisstufe).toBe(5);
    expect(['hz', 'buero', 'huette'].map((t) => st.objekte.filter((o) => o.typ === t).length)).toEqual([1, 1, 1]);
    const s = new Spiel(st, () => T0);
    expect(s.netz.warm.size).toBe(0);
  });

  it('test_nr13_start_mit_kessel: Hackschnitzelkessel Stufe 1 vorgewählt, gratis, 60 kW; erneutes Wählen lässt genau einen Kessel', () => {
    const st = neuerSpielstand(T0);
    expect(st.quelle_gewaehlt).toBe(true);
    expect(st.innen).toEqual([{ typ: 'kessel', stufe: 1, bau: null }]);
    const s = new Spiel(st, () => T0);
    expect(s.netz.verfuegbar_kw).toBe(60);
    expect(s.stand.geld_eur).toBe(30_000);
    expect(s.ersteQuelleWaehlen('kessel').ok).toBe(true);
    expect(s.stand.innen.map((k) => `${k.typ}/${k.stufe}`)).toEqual(['kessel/1']);
    expect(s.netz.verfuegbar_kw).toBe(60);
  });

  it('test_nr13_erste_haeuser: (9|13) und (12|14), beide EFH ohne Station; die Spur erreicht beide', () => {
    expect(ERSTE_HAEUSER).toEqual([[9, 13], [12, 14]]);
    const st = neuerSpielstand(T0);
    const [h1, h2] = ERSTE_HAEUSER.map(([x, y]) => hausBei(st, x, y));
    for (const h of [h1, h2]) { expect(h.typ).toBe('efh'); expect(h.ohne_station).toBe(true); expect(h.station).toBeUndefined(); }
    const ohne = berechneNetz(st.objekte, st.innen, st.preisstufe).anschluss;
    expect([ohne.has(h1.id), ohne.has(h2.id)]).toEqual([false, false]);
    for (const [x, y] of SPUR) leitungLegen(st, 'd25', x, y);
    const mit = berechneNetz(st.objekte, st.innen, st.preisstufe).anschluss;
    expect([mit.has(h1.id), mit.has(h2.id)]).toEqual([true, true]);
  });

  it('test_nr13_alter_stand_behaelt_netz: altes Startdorf übersteht Speichern und Laden mit Leitungen, Vorsehung und Stationen', () => {
    const alt = altesStartdorf(T0);
    const { stand, befund } = ladenMitBefund(serialisieren(alt), T0);
    expect(befund).toBe('ok');
    const leitungen = stand.objekte.filter(istLeitung).map((o) => `${o.typ}@${o.x}|${o.y}${o.vorsehung ? '+v' : ''}`);
    expect(leitungen).toEqual(['d40@10|10', 'd40@10|11', 'd40@10|12', 'd40@10|13', 'd40@10|14+v', 'd25@11|14']);
    expect(stand.objekte.filter((o) => o.station).map((o) => `${o.x}|${o.y}:${o.station}`)).toEqual(['9|13:st_15', '12|14:st_15']);
    const s = new Spiel(stand, () => T0);
    expect(s.ersteQuelleWaehlen('kessel').ok).toBe(true);
    expect([s.netz.warm.has(hausBei(s.stand, 9, 13).id), s.netz.warm.has(hausBei(s.stand, 12, 14).id)]).toEqual([true, true]);
  });

  it('test_nr13_auftraege: c1 offen beim Start, erledigt mit einem warmen Haus; c2 mit zwei; Texte passen zum leeren Start', () => {
    const st = neuerSpielstand(T0);
    const s0 = new Spiel(st, () => T0);
    expect(pruefeAuftraege(s0)?.id).toBe('c1');
    expect(s0.stand.erledigt.c1).toBeUndefined();
    // 32er bis (10|13) trägt beide EFH (2 × 10 kW ≤ 25 kW), die 25er dahinter nur das Haus (12|14).
    for (const [x, y] of SPUR) leitungLegen(st, y <= 13 && x === 10 ? 'd32' : 'd25', x, y);
    const h1 = hausBei(st, 9, 13), h2 = hausBei(st, 12, 14);
    delete h2.ohne_station; h2.station = 'st_15';
    const s1 = new Spiel(st, () => T0);
    expect(s1.netz.warm.size).toBe(1);
    expect(pruefeAuftraege(s1)?.id).toBe('c2');
    expect([s1.stand.erledigt.c1, s1.stand.erledigt.c2]).toEqual([true, undefined]);
    expect(s1.stand.taler).toBe(110);
    delete h1.ohne_station; h1.station = 'st_15';
    const s2 = new Spiel(st, () => T0);
    expect(s2.netz.warm.size).toBe(2);
    expect(pruefeAuftraege(s2)?.id).toBe('col');
    expect(s2.stand.erledigt.c2).toBe(true);
    expect(s2.stand.taler).toBe(120);
    const text = (id: string): string | undefined => AUFTRAEGE.find((a) => a.id === id)?.text;
    expect(text('c1')).toBe('Versorge dein erstes Haus: Leitung von der Heizzentrale bis ans Haus legen, Station kaufen');
    expect(text('c2')).toBe('Versorge ein zweites Haus – reicht die Leitung für beide?');
    expect(text('h3')).toBe('Schließ zwei weitere Häuser an: Station kaufen und Leitung im Bauabschnitt legen');
    expect(AUFTRAEGE.some((a) => /Starth/.test(a.text))).toBe(false);
  });

  it('test_nr13_geld_reicht: leeres Dorf, zwei erste Häuser per 25er und Wandstation – Restgeld 20.800 € (30.000 − 2.000 − 6 × 400 − 2 × 2.400)', () => {
    const z: Uhr = { t: T0 };
    const s = new Spiel(neuerSpielstand(T0), () => z.t);
    expect(abschnittOeffnen(s, z)).toBe(true);
    for (const [x, y] of SPUR) expect(s.platzieren('d25', x, y).ok).toBe(true);
    for (const [x, y] of ERSTE_HAEUSER) {
      const h = objektBei(s, x, y, istHaus) as Objekt;
      expect(s.stationKaufen(h.id, passendeStation(KATALOG.efh.bedarf_kw as number).id).ok).toBe(true);
    }
    const { bestellen } = abschnittBauen(s, z);
    expect(bestellen.ok).toBe(true);
    expect(s.stand.objekte.filter((o) => istLeitung(o) && !o.geplant && !o.bau).length).toBe(6);
    expect(s.stand.geld_eur).toBe(20_800);
  });
});

describe('NR13 neuer Spielstart – Randfälle (P5)', () => {
  it('test_nr13_deko_unveraendert: Deko liegt wie vor P5 (gemessen an 1df16da, Standardort)', () => {
    const deko = neuerSpielstand(0).objekte.filter((o) => ['stein', 'busch', 'baum'].includes(o.typ)).map((o) => `${o.typ}@${o.x}|${o.y}`);
    expect(deko).toEqual([
      'busch@4|8', 'stein@2|21', 'stein@1|11', 'baum@2|16', 'busch@22|13', 'stein@3|11', 'stein@0|2', 'stein@14|18', 'baum@23|5',
      'stein@6|5', 'baum@2|18', 'stein@3|13', 'busch@1|13', 'baum@8|4', 'busch@11|1', 'baum@16|0', 'busch@21|0',
    ]);
  });

  it('test_nr13_naechste_id: 7 Objekte weniger als vor P5 (71 → 64), naechste_id 76 → 70, Ids eindeutig und kleiner', () => {
    const st = neuerSpielstand(0);
    expect(st.objekte).toHaveLength(64);
    expect(st.naechste_id).toBe(70);
    const ids = st.objekte.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id < st.naechste_id)).toBe(true);
  });

  it('test_nr13_kaputter_stand: laden mit kaputtem Text liefert ein neues Spiel mit vorgewähltem Kessel', () => {
    const st = laden('{kaputt', T0);
    expect(st.quelle_gewaehlt).toBe(true);
    expect(st.innen).toEqual([{ typ: 'kessel', stufe: 1, bau: null }]);
    expect(st.objekte.filter(istLeitung)).toEqual([]);
  });
});
