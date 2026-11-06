import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand, type Ereignis } from '../src/core/spiel';
import * as katalog from '../src/core/katalog';
import { KATALOG, KONSTANTEN, STATIONEN, type TypId } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import * as netz from '../src/core/netz';
import { engstelleText, type Engstelle } from '../src/core/engstelle';
import { FREISCHALTUNGEN, FUNKTION_NAME } from '../src/core/freischaltung';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { ERSTE_HAEUSER } from '../src/core/start';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { abschnittBauen, abschnittOeffnen, objektBei, vorstellen, type Uhr } from './hilfen/nr18';
import type { Objekt } from '../src/core/typen';

// NR19 Puffer-Übergabestation (Bauplan docs/bauplaene/NR18-ohne-autoanschluss.md, Abschnitt 5.5 und „Bauplan P6“).
// Erwartete Zahlen von Hand: EFH 15.000 kWh ÷ 2.000 h = 7,5 kW (mit Puffer), ÷ 1.500 h = 10 kW (ohne Puffer).
// Neue Kern-Namen über einen Typumweg, damit die Datei schon vor dem Bau übersetzt (rot, nicht kaputt).

type PufferStation = katalog.Station & { spitze_kw: number; speicher_l: number };
type Nr19Katalog = {
  PUFFER_STATIONEN: ReadonlyArray<PufferStation>;
  istPufferStation(st: katalog.Station | undefined): boolean;
  passendePufferStation(netz_kw: number, spitze_kw: number): PufferStation | null;
};
const K = katalog as unknown as Nr19Katalog;
const stationReicht = (st: katalog.Station, o: Objekt): boolean =>
  (netz as unknown as { stationReicht(st: katalog.Station, o: Objekt): boolean }).stationReicht(st, o);

const T0 = 1_000_000_000_000;
const SATZ_NACHRUESTEN = 'Den Puffer gibt es nur beim Anschluss. Für dieses Haus geht nur eine Wandstation.';

/** Altes Startdorf (Haus (9|13) mit Wandstation Typ 15, Haus (13|12) ohne Station), Kessel gewählt. */
function altesDorf(stufe = 1): Spiel {
  const s = new Spiel(altesStartdorf(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 100_000;
  s.neuBerechnen();
  return s;
}
const bei = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => KATALOG[o.typ].kategorie === 'haus')!;
const ohneStation = (s: Spiel): Objekt => { const o = bei(s, 13, 12); expect(o.ohne_station).toBe(true); return o; };
const mitWand = (s: Spiel): Objekt => { const o = bei(s, 9, 13); expect(o.station).toBe('st_15'); return o; };
const objekt = (typ: TypId, extra: Partial<Objekt> = {}): Objekt => ({ id: 1, typ, x: 0, y: 0, stufe: 1, bau: null, kasse_eur: 0, ...extra });
const engstellen = (s: Spiel): Ereignis[] => s.ereignisse.filter((e) => e.art === 'engstelle');

/** Neues Spiel bis zur Phase „bestellen“: 25er von (10|10) bis (10|14) und (11|14), beide ersten Häuser erreicht. */
function tutorialBisBestellen(): { s: Spiel; z: Uhr; h1: Objekt; h2: Objekt; alle: Ereignis[] } {
  const z = { t: T0 };
  const s = new Spiel(neuerSpielstand(T0), () => z.t);
  const alle: Ereignis[] = [];
  const merken = () => { alle.push(...s.ereignisse); s.ereignisse.length = 0; };
  expect(s.abschnittPlanen().ok).toBe(true);
  vorstellen(s, z, KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor + 10);
  expect(s.stand.abschnitt?.phase).toBe('offen');
  for (const [x, y] of [[10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [11, 14]] as const) expect(s.platzieren('d25', x, y).ok).toBe(true);
  const [h1, h2] = ERSTE_HAEUSER.map(([x, y]) => bei(s, x, y));
  expect(s.erreichteHaeuser()).toEqual(expect.arrayContaining([h1.id, h2.id]));
  const ab = s.abschnittAbschliessen();
  expect(ab.ok).toBe(true); expect(ab.hinweis).toBeUndefined();
  expect(s.abschnittWarnungen()).toEqual([]);
  expect(s.stand.abschnitt?.phase).toBe('bestellen');
  merken();
  return { s, z, h1, h2, alle };
}

describe('NR19 Puffer-Übergabestation – Katalog', () => {
  it('NR19 test_nr19_volllaststunden: 1.500 h ohne, 2.000 h mit Puffer', () => {
    expect(katalog.VOLLLASTSTUNDEN).toEqual({ ohne_puffer_h: 1500, mit_puffer_h: 2000 });
  });

  it('NR19 test_nr19_katalog: drei Puffer-Stationen mit den Werten der Tabelle, Wandstationen unverändert', () => {
    expect(K.PUFFER_STATIONEN.map((p) => ({ ...p }))).toEqual([
      { id: 'hp_800', name: 'Puffer-Übergabestation HP 800', leistung_kw: 14, spitze_kw: 19, speicher_l: 800, kosten_eur: 5570, beschreibung: '800-l-Speicher mit Rohrwendel: lädt mit 14 kW, gibt im Haus bis 19 kW ab.' },
      { id: 'hp_1000', name: 'Puffer-Übergabestation HP 1000', leistung_kw: 20, spitze_kw: 27, speicher_l: 1000, kosten_eur: 6570, beschreibung: '1.000-l-Speicher mit Rohrwendel: lädt mit 20 kW, gibt im Haus bis 27 kW ab.' },
      { id: 'up_1000', name: 'Puffer-Übergabestation ÜP 1000', leistung_kw: 40, spitze_kw: 54, speicher_l: 1000, kosten_eur: 7570, beschreibung: '1.000-l-Speicher mit Plattentauscher: lädt mit 40 kW, gibt im Haus bis 54 kW ab.' },
    ]);
    // Preis = Station allein (2.000 / 3.000 / 4.000 €) + Speicher-Aufpreis 3.570 €
    expect(K.PUFFER_STATIONEN.map((p) => p.kosten_eur - 3570)).toEqual([2000, 3000, 4000]);
    for (const p of K.PUFFER_STATIONEN) {
      expect(p.name.startsWith('Puffer-Übergabestation')).toBe(true);
      expect(p.beschreibung.length).toBeLessThanOrEqual(90);
      expect(`${p.name} ${p.beschreibung}`).not.toMatch(/enerpipe/i); // A87: kein Firmenname
      expect(K.istPufferStation(p)).toBe(true);
      expect(katalog.stationHolen(p.id)).toBe(p);
    }
    expect(STATIONEN.map((s) => [s.id, s.leistung_kw, s.kosten_eur])).toEqual([
      ['st_15', 15, 2400], ['st_25', 25, 3600], ['st_40', 40, 4800], ['st_60', 60, 7000], ['st_80', 80, 9000], ['st_cad', 150, 20000],
    ]);
    for (const s of STATIONEN) expect(K.istPufferStation(s)).toBe(false);
    expect(K.istPufferStation(undefined)).toBe(false);
    expect(katalog.passendeStation(10).id).toBe('st_15'); // passendeStation kennt nur Wandstationen
  });

  it('NR19 test_nr19_katalog_plausibel: Spitze über Ladeleistung, Probe-Tabelle 5.5, fehlende kW ganzzahlig', () => {
    for (const p of K.PUFFER_STATIONEN) expect(p.spitze_kw).toBeGreaterThan(p.leistung_kw);
    const wahl = (o: Objekt) => K.passendePufferStation(bedarfKw({ ...o, hauspuffer: true }), bedarfKw({ ...o, hauspuffer: false }))?.id ?? null;
    const doppelt = { vollversorgung: true, aufgestockt: true }; // 1,5 × 1,4 = 2,1
    expect(wahl(objekt('efh'))).toBe('hp_800'); //   7,5 / 10
    expect(wahl(objekt('rh'))).toBe('hp_800'); //    12 / 16
    expect(wahl(objekt('baeck'))).toBe('hp_1000'); // 15 / 20
    expect(wahl(objekt('mfh'))).toBe('up_1000'); //  22,5 / 30
    expect(wahl(objekt('efh', doppelt))).toBe('hp_1000'); // 15,75 / 21
    expect(wahl(objekt('mfh', doppelt))).toBeNull(); // 47,25 / 63
    // Grenzen: genau auf der Leistung reicht, knapp darüber nicht; die Spitze zählt eigenständig
    expect(K.passendePufferStation(14, 19)?.id).toBe('hp_800');
    expect(K.passendePufferStation(14.5, 19)?.id).toBe('hp_1000');
    expect(K.passendePufferStation(10, 19.5)?.id).toBe('hp_1000');
    expect(K.passendePufferStation(40, 54)?.id).toBe('up_1000');
    expect(K.passendePufferStation(40, 54.5)).toBeNull();
    const e = (d: number): Engstelle => ({ felder: [1], typ: 'd25', last_kw: 15 + d, kapazitaet_kw: 15, an_heizzentrale: false, geplant: false, empfohlen: 'd32' });
    for (const d of [0.0005, 0.001, 0.5, 4.2, 1000]) {
      const f = Number(/es fehlen (\d+) kW/.exec(engstelleText(e(d), null))?.[1]);
      expect(Number.isInteger(f) && f >= 1, `d = ${d}`).toBe(true);
    }
  });
});

describe('NR19 Puffer-Übergabestation – Netz und Kauf', () => {
  it('NR19 test_nr19_puffer_kaufen: EFH ohne Station + HP 800 → Puffer, 7,5 kW, Haus warm', () => {
    const z = { t: T0 };
    const s = new Spiel(neuerSpielstand(T0), () => z.t);
    s.stand.geld_eur = 1_000_000;
    expect(abschnittOeffnen(s, z)).toBe(true);
    for (const [x, y] of [[10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [11, 14]] as const) expect(s.platzieren('d25', x, y).ok).toBe(true);
    abschnittBauen(s, z);
    const h = bei(s, 12, 14);
    const geld = s.stand.geld_eur;
    expect(s.stationKaufen(h.id, 'hp_800').ok).toBe(true);
    expect(h.hauspuffer).toBe(true); expect(h.station).toBe('hp_800'); expect(h.ohne_station).toBeUndefined();
    expect(s.stand.geld_eur).toBe(geld - 5570);
    expect(bedarfKw(h)).toBeCloseTo(7.5, 10);
    expect(s.netz.warm.has(h.id)).toBe(true); expect(s.netz.kalt.has(h.id)).toBe(false);
  });

  it('NR19 test_nr19_wand_kaufen: EFH + Wandstation Typ 15 → kein Puffer, 10 kW', () => {
    const s = altesDorf(), h = ohneStation(s);
    expect(s.stationKaufen(h.id, 'st_15').ok).toBe(true);
    expect(h.hauspuffer).toBeFalsy(); expect(bedarfKw(h)).toBeCloseTo(10, 10);
  });

  it('NR19 test_nr19_kein_nachruesten: Haus mit Wandstation bekommt keine Puffer-Station', () => {
    for (const stufe of [1, 2]) {
      const s = altesDorf(stufe), w = mitWand(s), geld = s.stand.geld_eur;
      const r = s.stationKaufen(w.id, 'hp_1000');
      expect(r).toEqual({ ok: false, hinweis: SATZ_NACHRUESTEN });
      expect(SATZ_NACHRUESTEN.length).toBeLessThanOrEqual(90);
      expect(w.station).toBe('st_15'); expect(w.hauspuffer).toBeFalsy(); expect(s.stand.geld_eur).toBe(geld);
    }
  });

  it('NR19 test_nr19_altstand_puffer_bleibt: alter Stand „Puffer + Wandstation“ lädt ohne Verlust', () => {
    const s = altesDorf(2), w = mitWand(s);
    w.hauspuffer = true;
    const { stand, befund } = ladenMitBefund(serialisieren(s.stand), T0);
    expect(befund).not.toBe('defekt');
    const s2 = new Spiel(stand, () => T0);
    const w2 = bei(s2, 9, 13);
    expect(w2.station).toBe('st_15'); expect(w2.hauspuffer).toBe(true);
    expect(bedarfKw(w2)).toBeCloseTo(7.5, 10);
    expect(stationReicht(katalog.stationHolen('st_15')!, w2)).toBe(true);
    const geld = s2.stand.geld_eur;
    expect(s2.stationKaufen(w2.id, 'hp_1000').ok).toBe(true);
    expect(w2.station).toBe('hp_1000'); expect(w2.hauspuffer).toBe(true);
    expect(s2.stand.geld_eur).toBe(geld - (6570 - 2400 / 2)); // Rückkauf der alten Wandstation zu 50 %
  });

  it('NR19 test_nr19_spitze: Netz-Ladeleistung und Spitze im Haus begrenzen die Puffer-Station', () => {
    // Bäckerei: 30.000 kWh ÷ 2.000 h = 15 kW aus dem Netz > 14 kW der HP 800
    const s = altesDorf(2), b = ohneStation(s);
    b.typ = 'baeck'; s.neuBerechnen();
    const geld = s.stand.geld_eur;
    expect(s.stationKaufen(b.id, 'hp_800')).toEqual({ ok: false, hinweis: 'Puffer-Übergabestation HP 800 schafft nur 14 kW, das Gebäude braucht 15 kW' });
    expect(s.stand.geld_eur).toBe(geld); expect(b.hauspuffer).toBeFalsy();
    // EFH Kamin aus und aufgestockt: 15,75 kW Netz / 21 kW Spitze
    const s2 = altesDorf(2), e = ohneStation(s2);
    e.vollversorgung = true; e.aufgestockt = true; s2.neuBerechnen();
    expect(s2.stationKaufen(e.id, 'hp_800').ok).toBe(false);
    expect(s2.stationKaufen(e.id, 'hp_1000').ok).toBe(true);
    // Station mit zu kleiner Spitze (künstlich): Ladeleistung reicht, die Spitze nicht
    const efh = objekt('efh', { hauspuffer: true });
    const st = (spitze_kw: number) => ({ id: 'x', name: 'X', leistung_kw: 14, spitze_kw, speicher_l: 800, kosten_eur: 1, beschreibung: '' });
    expect(stationReicht(st(10), efh)).toBe(true); // Spitze genau 10 kW = 15.000 ÷ 1.500
    expect(stationReicht(st(9.5), efh)).toBe(false);
    expect(stationReicht(katalog.stationHolen('st_15')!, objekt('efh'))).toBe(true); // Wandstation: nur die Leistung
    expect(stationReicht(katalog.stationHolen('st_15')!, objekt('efh', { vollversorgung: true, aufgestockt: true }))).toBe(false);
    const hp800 = K.PUFFER_STATIONEN[0] as { spitze_kw: number }, spitzeVorher = hp800.spitze_kw;
    hp800.spitze_kw = 9;
    try {
      const s3 = altesDorf(2), e3 = ohneStation(s3);
      expect(s3.stationKaufen(e3.id, 'hp_800')).toEqual({ ok: false, hinweis: 'Puffer-Übergabestation HP 800 gibt im Haus nur 9 kW ab, das Haus braucht in der Spitze 10 kW' });
    } finally { hp800.spitze_kw = spitzeVorher; }
  });

  it('NR19 test_nr19_spitze: Haus mit HP 800 wird nach Kamin aus und Aufstockung kalt „station“', () => {
    // Haus (9|13) am 40er des alten Startdorfs (trägt 40 kW), die Leitung begrenzt also nicht
    const s = altesDorf(1), h = mitWand(s);
    h.station = 'hp_800'; h.hauspuffer = true; s.neuBerechnen();
    expect(s.netz.warm.has(h.id)).toBe(true);
    h.vollversorgung = true; h.aufgestockt = true; s.neuBerechnen(); // 15,75 kW Netz > 14 kW, 21 kW Spitze > 19 kW
    expect(s.netz.kalt.get(h.id)).toBe('station');
    // Nur die Spitze zu klein (künstlich 9 kW < 10 kW ohne Puffer): auch dann „Station zu klein“
    h.vollversorgung = false; h.aufgestockt = false; s.neuBerechnen();
    expect(s.netz.warm.has(h.id)).toBe(true);
    const hp800 = K.PUFFER_STATIONEN[0] as { spitze_kw: number }, spitzeVorher = hp800.spitze_kw;
    hp800.spitze_kw = 9;
    try { s.neuBerechnen(); expect(s.netz.kalt.get(h.id)).toBe('station'); } finally { hp800.spitze_kw = spitzeVorher; }
  });

  it('NR19 test_nr19_grossabnehmer_ohne_puffer: Großabnehmer bekommen keine Puffer-Station', () => {
    const s = altesDorf(2);
    const g = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'gross' && o.ohne_station)!;
    expect(g).toBeDefined();
    const geld = s.stand.geld_eur;
    for (const p of K.PUFFER_STATIONEN) expect(s.stationKaufen(g.id, p.id).ok).toBe(false);
    expect(g.station).toBeUndefined(); expect(g.hauspuffer).toBeFalsy(); expect(s.stand.geld_eur).toBe(geld);
  });

  it('NR19 test_nr19_ohne_stationstypen: genau die kleinste Wand- und die kleinste Puffer-Station sind erlaubt', () => {
    const ids = [...STATIONEN, ...K.PUFFER_STATIONEN].map((st) => st.id);
    const erlaubt = ids.filter((id) => { const s = altesDorf(1); return s.stationKaufen(ohneStation(s).id, id).ok; });
    expect(erlaubt).toEqual(['st_15', 'hp_800']);
    const mitTypen = ids.filter((id) => { const s = altesDorf(2); return s.stationKaufen(ohneStation(s).id, id).ok; });
    expect(mitTypen).toEqual(['st_15', 'st_25', 'st_40', 'st_60', 'st_80', 'st_cad', 'hp_800', 'hp_1000', 'up_1000']);
  });

  it('NR19 test_nr19_ohne_stationstypen: Interessenten-Nachlass gilt auch für Puffer-Stationen', () => {
    const s = altesDorf(1), h = ohneStation(s);
    h.interessent = true;
    const geld = s.stand.geld_eur;
    expect(s.stationKaufen(h.id, 'hp_800').ok).toBe(true);
    expect(s.stand.geld_eur).toBe(geld - 4456); // 5.570 € × 0,8
  });

  it('NR19 test_nr19_ohne_stationstypen: Tausch Puffer → größere Puffer-Station mit 50 % Rückkauf, nie kleiner', () => {
    const s = altesDorf(2), h = ohneStation(s);
    expect(s.stationKaufen(h.id, 'hp_1000').ok).toBe(true);
    expect(s.stationKaufen(h.id, 'hp_800').ok).toBe(false);
    const geld = s.stand.geld_eur;
    expect(s.stationKaufen(h.id, 'up_1000').ok).toBe(true);
    expect(s.stand.geld_eur).toBe(geld - (7570 - 6570 / 2));
    expect(h.station).toBe('up_1000'); expect(h.hauspuffer).toBe(true);
  });

  it('NR19 test_nr19_zwei_efh_an_25er: 2 × 7,5 = 15 kW an der 25er warnt nicht, 2 × 10 kW warnt', () => {
    const p = tutorialBisBestellen();
    expect(p.s.stationKaufen(p.h1.id, 'hp_800')).toEqual({ ok: true });
    expect(p.s.stationKaufen(p.h2.id, 'hp_800')).toEqual({ ok: true });
    expect(engstellen(p.s)).toEqual([]); expect(p.s.abschnittWarnungen()).toEqual([]);
    const w = tutorialBisBestellen();
    expect(w.s.stationKaufen(w.h1.id, 'st_15').ok).toBe(true);
    const zweite = w.s.stationKaufen(w.h2.id, 'st_15');
    expect(zweite.ok).toBe(true); expect(zweite.hinweis).toBeDefined();
    expect(engstellen(w.s).length).toBe(1); expect(w.s.abschnittWarnungen().length).toBeGreaterThan(0);
  });

  it('NR19 test_nr19_tutorial_reihenfolge: Ablauf DESIGN 13.5 mit zwei HP 800, Restgeld 14.460 €', () => {
    const { s, z, h1, h2, alle } = tutorialBisBestellen();
    const r1 = s.stationKaufen(h1.id, 'hp_800'), r2 = s.stationKaufen(h2.id, 'hp_800');
    expect(r1.hinweis).toBeUndefined(); expect(r2.hinweis).toBeUndefined(); expect(r1.ok && r2.ok).toBe(true);
    expect(s.abschnittWarnungen()).toEqual([]);
    expect(s.materialBestellen().ok).toBe(true);
    // Uhr genau bis Bauende (10-s-Schritte); danach laufen Brennstoffkosten und Rechnungen, das Geld bewegt sich wieder
    for (let i = 0; i < 1000 && s.stand.abschnitt; i++) vorstellen(s, z, 10);
    expect(s.stand.abschnitt).toBeUndefined();
    expect(s.netz.warm.has(h1.id) && s.netz.warm.has(h2.id)).toBe(true);
    expect(s.netz.kalt.has(h1.id) || s.netz.kalt.has(h2.id)).toBe(false);
    expect([...alle, ...s.ereignisse].filter((e) => e.art === 'engstelle')).toEqual([]);
    expect(s.stand.geld_eur).toBe(14_460); // 30.000 − 2.000 Planung − 6 × 400 Leitung − 2 × 5.570 Station
  });
});

describe('NR19 Puffer-Übergabestation – Spielstand und Freischaltung', () => {
  it('NR19 test_nr19_spielstand_reparatur: Puffer-Station ohne Puffer-Merkmal und am Großabnehmer', () => {
    const s = altesDorf(2), h = ohneStation(s), w = mitWand(s);
    const g = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'gross' && o.ohne_station)!;
    h.station = 'hp_800'; delete h.ohne_station;
    g.station = 'up_1000'; delete g.ohne_station;
    w.hauspuffer = true;
    const { stand, befund } = ladenMitBefund(serialisieren(s.stand), T0);
    expect(befund).not.toBe('defekt'); expect(stand.version).toBe(3);
    const finde = (o: Objekt) => stand.objekte.find((x) => x.id === o.id)!;
    expect(finde(h).station).toBe('hp_800'); expect(finde(h).hauspuffer).toBe(true);
    expect(finde(g).station).toBeUndefined(); expect(finde(g).ohne_station).toBe(true); expect(finde(g).hauspuffer).toBeFalsy();
    expect(finde(w).station).toBe('st_15'); expect(finde(w).hauspuffer).toBe(true);
    expect(stand.objekte.filter((o) => o.id !== h.id && o.id !== w.id).some((o) => o.hauspuffer)).toBe(false);
  });

  it('NR19 test_nr19_kein_hauspufferEinbauen: alter Einbau, Merkmal und Preis sind weg', () => {
    const s = altesDorf();
    expect('hauspufferEinbauen' in s).toBe(false);
    expect(Object.keys(FREISCHALTUNGEN)).not.toContain('hauspuffer');
    expect(Object.keys(FUNKTION_NAME)).not.toContain('hauspuffer');
    expect(Object.keys(KONSTANTEN)).not.toContain('hauspuffer_eur');
  });
});

describe('NR19 Tausch einer Puffer-Station (Review P6 W1, Weg a)', () => {
  const SATZ_NUR_PUFFER = 'Dieses Haus hat eine Puffer-Station. Tausch nur gegen eine größere Puffer-Station.';

  it('NR19: HP 800 → st_15 abgelehnt (15 kW > 14 kW zählt nicht), Puffer und Geld bleiben', () => {
    const s = altesDorf(2), h = ohneStation(s);
    expect(s.stationKaufen(h.id, 'hp_800').ok).toBe(true);
    const geld = s.stand.geld_eur;
    expect(s.stationKaufen(h.id, 'st_15')).toEqual({ ok: false, hinweis: SATZ_NUR_PUFFER });
    expect(h.station).toBe('hp_800'); expect(h.hauspuffer).toBe(true); expect(s.stand.geld_eur).toBe(geld);
  });

  it('NR19: HP 800 nach Kamin aus und Aufstockung (15,75 kW Netz) – HP 1000 reicht, also keine Wandstation, auch ohne Stationswahl', () => {
    for (const stufe of [1, 2]) {
      const s = altesDorf(stufe), h = ohneStation(s);
      expect(s.stationKaufen(h.id, 'hp_800').ok).toBe(true);
      h.vollversorgung = true; h.aufgestockt = true; s.neuBerechnen();
      expect(s.stationKaufen(h.id, 'st_25')).toEqual({ ok: false, hinweis: SATZ_NUR_PUFFER });
      expect(h.station).toBe('hp_800'); expect(h.hauspuffer).toBe(true);
      expect(s.stationKaufen(h.id, 'hp_1000').ok).toBe(true); // 20 kW ≥ 15,75 kW, 27 kW ≥ 21 kW
    }
  });

  it('NR19: keine Puffer-Station reicht → Wandstation nach Bedarf ohne Puffer, der Puffer ist weg', () => {
    // MFH 45.000 kWh × 1,5 × 1,4 = 94.500 kWh: mit Puffer 47,25 kW > 40 kW der ÜP 1000, ohne Puffer ÷ 1.500 h = 63 kW
    const s = altesDorf(1), m = ohneStation(s);
    m.typ = 'mfh'; s.neuBerechnen();
    expect(s.stationKaufen(m.id, 'up_1000').ok).toBe(true); // 22,5 kW Netz, 30 kW Spitze
    m.vollversorgung = true; m.aufgestockt = true; s.neuBerechnen();
    // Ohne Stationswahl nur die kleinste Wandstation für 63 kW: Typ 80, nicht Typ 60
    expect(s.stationKaufen(m.id, 'st_60').ok).toBe(false);
    expect(m.station).toBe('up_1000'); expect(m.hauspuffer).toBe(true);
    const geld = s.stand.geld_eur;
    expect(s.stationKaufen(m.id, 'st_80').ok).toBe(true);
    expect(m.station).toBe('st_80'); expect(m.hauspuffer).toBeFalsy();
    expect(bedarfKw(m)).toBeCloseTo(63, 9);
    expect(s.stand.geld_eur).toBe(geld - 5215); // 9.000 € − 7.570 € ÷ 2
    expect(s.netz.kalt.has(m.id)).not.toBe(true);
  });

  it('NR19: keine Puffer-Station reicht, mit Stationswahl – Typ 60 schafft die 63 kW ohne Puffer nicht', () => {
    const s = altesDorf(2), m = ohneStation(s);
    m.typ = 'mfh'; s.neuBerechnen();
    expect(s.stationKaufen(m.id, 'up_1000').ok).toBe(true);
    m.vollversorgung = true; m.aufgestockt = true; s.neuBerechnen();
    expect(s.stationKaufen(m.id, 'st_60')).toEqual({ ok: false, hinweis: 'Wandstation Typ 60 schafft nur 60 kW, das Gebäude braucht 63 kW' });
    expect(m.hauspuffer).toBe(true);
    expect(s.stationKaufen(m.id, 'st_80').ok).toBe(true);
    expect(m.hauspuffer).toBeFalsy();
  });

  it('NR19: Altstand Puffer + Wandstation bleibt unverändert – eine größere Wandstation behält den Puffer', () => {
    const s = altesDorf(1), w = mitWand(s);
    w.hauspuffer = true; w.vollversorgung = true; w.aufgestockt = true; s.neuBerechnen(); // 15,75 kW > 15 kW
    expect(s.stationKaufen(w.id, 'st_25').ok).toBe(true); // kleinste für 15,75 kW mit Puffer
    expect(w.station).toBe('st_25'); expect(w.hauspuffer).toBe(true);
    expect(bedarfKw(w)).toBeCloseTo(15.75, 9);
  });

  it('NR19: Altstand Puffer ohne Station – die Wandstation rechnet mit dem vorhandenen Puffer (7,5 kW), der Puffer bleibt', () => {
    const s = altesDorf(1), h = ohneStation(s);
    h.hauspuffer = true; s.neuBerechnen();
    expect(s.stationKaufen(h.id, 'st_15').ok).toBe(true);
    expect(h.station).toBe('st_15'); expect(h.hauspuffer).toBe(true);
    expect(bedarfKw(h)).toBe(7.5);
  });
});
