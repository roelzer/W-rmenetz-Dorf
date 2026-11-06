import { afterEach, describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand, type Ereignis } from '../src/core/spiel';
import { KATALOG, KONSTANTEN, istLeitung, passendeStation, type TypId } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import { ENGPASS_ERSATZ, WEITERE_STELLEN, engstellenFinden } from '../src/core/engstelle';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { abschnittBauen, abschnittOeffnen, objektBei, vorstellen, type Uhr } from './hilfen/nr18';
import type { Objekt } from '../src/core/typen';

// NR18-P2 (Bauplan docs/bauplaene/NR18-ohne-autoanschluss.md, Abschnitt 5.1 und 7 „Bauplan P2“).
// engstellenFinden bleibt echt; nur test_nr18_station_ersatztext lässt es einmal leer antworten und
// test_nr18_station_alte_kalte_nicht_genannt liest mit, welche Kunden gefragt werden.
vi.mock('../src/core/engstelle', async (orig) => {
  const echt = await orig<typeof import('../src/core/engstelle')>();
  return { ...echt, engstellenFinden: vi.fn(echt.engstellenFinden) };
});
afterEach(() => { vi.mocked(engstellenFinden).mockClear(); });

const T0 = 1_000_000_000_000;
const N = KONSTANTEN.feldanzahl;
const feld = (x: number, y: number): number => y * N + x;
// Katalogpreise (kosten_eur[0], schon mit Kostenfaktor 40): d25 400 €, d32 560 €, d40 800 €, d63 1.520 €.
const TEXT_HZ_25 = 'Die 25er an der Heizzentrale ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.';
const TEXT_EINGEZ_25 = 'Die eingezeichnete 25er ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.';
const TEXT_ERSATZ_AUSSERHALB = 'Dickere Leitungen entstehen nur im Bauabschnitt – lass Philipp einen planen.';
const TEXT_W5 = 'Diese Leitung wird gerade ersetzt – warte, bis der Abschnitt gebaut ist.';
/** Weg der 25er aus Abnahme (b): von der Heizzentrale (11|10) über (10|11) nach Süden bis an das Haus (12|14). */
const WEG: ReadonlyArray<[number, number]> = [[10, 11], [10, 12], [10, 13], [10, 14], [11, 14]];

/** Leeres Dorf: Startdorf ohne Leitungen und ohne Stationen, mit Kessel (passt vor und nach dem neuen Spielstart). */
function leeresDorf(): { s: Spiel; z: Uhr } {
  const z = { t: T0 };
  const st = neuerSpielstand(T0);
  st.objekte = st.objekte.filter((o) => !istLeitung(o.typ));
  for (const o of st.objekte) if (o.station) { delete o.station; o.ohne_station = true; }
  const s = new Spiel(st, () => z.t);
  if (!s.stand.quelle_gewaehlt) s.ersteQuelleWaehlen('kessel');
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.length = 0;
  return { s, z };
}
const haus = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => KATALOG[o.typ].kategorie === 'haus')!;
const leitung = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => istLeitung(o.typ))!;
const zeichne = (s: Spiel, typ: TypId, weg: ReadonlyArray<[number, number]> = WEG): void => {
  for (const [x, y] of weg) expect(s.platzieren(typ, x, y).ok).toBe(true);
};
const wand = (s: Spiel, h: Objekt) => s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id);
const hinweise = (s: Spiel): string[] => s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'hinweis' }> => e.art === 'hinweis').map((e) => e.text);
const engstellen = (s: Spiel): number[][] => s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'engstelle' }> => e.art === 'engstelle').map((e) => e.felder);
const schritte = (s: Spiel) => s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'schritt' }> => e.art === 'schritt');
/** Leeres Dorf mit gebauter 25er aus Abnahme (b). */
function mitGebauter25er(): { s: Spiel; z: Uhr } {
  const d = leeresDorf();
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  zeichne(d.s, 'd25');
  abschnittBauen(d.s, d.z);
  expect(d.s.stand.abschnitt).toBeUndefined();
  return d;
}

describe('NR18-P2 Warnung beim Stationskauf (AE-NR18-1)', () => {
  it('test_nr18_station_warnt_ohne_sperre – gekauft, Geld weg, Hinweis mit der Engstelle, Felder markiert', () => {
    const { s } = mitGebauter25er();
    const a = haus(s, 12, 14), b = haus(s, 9, 13);
    expect(bedarfKw(a)).toBe(10); expect(bedarfKw(b)).toBe(10); expect(s.netz.spreizung_faktor).toBe(1);
    expect(wand(s, a)).toEqual({ ok: true });
    s.ereignisse.length = 0;
    const geld = s.stand.geld_eur, preis = s.stationspreis_eur(b, passendeStation(10));
    const e = wand(s, b);
    expect(e).toEqual({ ok: true, hinweis: TEXT_HZ_25 });
    expect(geld - s.stand.geld_eur).toBe(preis);
    expect(preis).toBeGreaterThan(0);
    expect(b.ohne_station).toBeUndefined();
    expect(b.station).toBe(passendeStation(10).id);
    expect(hinweise(s)).toEqual([TEXT_HZ_25]);
    expect(engstellen(s)).toEqual([[feld(10, 11), feld(10, 12), feld(10, 13)]]);
    expect(schritte(s).filter((x) => x.schritt === 'station_gekauft')).toEqual([{ art: 'schritt', schritt: 'station_gekauft', objekt_id: b.id }]);
    expect(s.netz.kalt.get(b.id)).toBe('leitung'); // gekauft trotz Engstelle, das Haus bleibt kalt
  });
  it('test_nr18_station_mit_geplanter_leitung – nur eingezeichnet: Warnung schon jetzt; auch wenn die Leitung am Haus vorbeiläuft', () => {
    const { s, z } = leeresDorf();
    expect(abschnittOeffnen(s, z)).toBe(true);
    zeichne(s, 'd25');
    expect(wand(s, haus(s, 12, 14))).toEqual({ ok: true });
    expect(wand(s, haus(s, 9, 13))).toEqual({ ok: true, hinweis: TEXT_EINGEZ_25 });
    // Variante: (9|13) zuerst; die 25er läuft an (9|13) vorbei weiter bis (12|14)
    const v = leeresDorf();
    expect(abschnittOeffnen(v.s, v.z)).toBe(true);
    zeichne(v.s, 'd25');
    expect(wand(v.s, haus(v.s, 9, 13))).toEqual({ ok: true });
    v.s.ereignisse.length = 0;
    expect(wand(v.s, haus(v.s, 12, 14))).toEqual({ ok: true, hinweis: TEXT_EINGEZ_25 });
    expect(engstellen(v.s)).toEqual([[feld(10, 11), feld(10, 12), feld(10, 13)]]);
  });
  it('test_nr18_station_ohne_leitung – keine Leitung am Haus: gekauft, keine Warnung, Schritt gemeldet', () => {
    const { s } = leeresDorf();
    const h = haus(s, 12, 14);
    expect(wand(s, h)).toEqual({ ok: true });
    expect(hinweise(s)).toEqual([]);
    expect(engstellen(s)).toEqual([]);
    expect(h.station).toBe(passendeStation(10).id);
    expect(schritte(s).map((x) => [x.schritt, x.objekt_id])).toEqual([['station_gekauft', h.id]]);
  });
  it('test_nr18_station_alte_kalte_nicht_genannt – nur neu kalte Kunden werden gesucht', () => {
    const { s, z } = leeresDorf();
    expect(abschnittOeffnen(s, z)).toBe(true);
    zeichne(s, 'd25', [...WEG, [10, 15]]);
    const a = haus(s, 12, 14), b = haus(s, 9, 13), c = haus(s, 9, 15);
    expect(wand(s, a).ok).toBe(true);
    expect(wand(s, b).hinweis).toBe(TEXT_EINGEZ_25);
    vi.mocked(engstellenFinden).mockClear();
    // (10|11) trägt jetzt 30 kW: 15 kW fehlen, die 32er (25 kW) reicht nicht, die 40er (40 kW) schon
    expect(wand(s, c)).toEqual({ ok: true, hinweis: 'Die eingezeichnete 25er ist zu dünn, es fehlen 15 kW. Zeichne eine 40er darüber.' });
    expect(vi.mocked(engstellenFinden).mock.calls.map((k) => [...k[1]])).toEqual([[c.id]]);
  });
  it('test_nr18_station_ersatztext – Überlast ohne gefundenes Stück → ENGPASS_ERSATZ', () => {
    const { s } = mitGebauter25er();
    expect(wand(s, haus(s, 12, 14)).ok).toBe(true);
    vi.mocked(engstellenFinden).mockReturnValueOnce([]);
    s.ereignisse.length = 0;
    expect(wand(s, haus(s, 9, 13))).toEqual({ ok: true, hinweis: ENGPASS_ERSATZ });
    expect(hinweise(s)).toEqual([ENGPASS_ERSATZ]);
    expect(engstellen(s)).toEqual([[]]);
  });
  it('test_nr18_waermemangel_warnt_nicht – kalt wegen Wärme ist keine Engstelle', () => {
    const { s } = mitGebauter25er();
    s.stand.innen = []; // keine Quelle: wer an der Leitung genug Platz hat, ist kalt wegen Wärme
    s.neuBerechnen();
    s.ereignisse.length = 0;
    const a = haus(s, 12, 14);
    expect(wand(s, a)).toEqual({ ok: true });
    expect(s.netz.kalt.get(a.id)).toBe('waerme');
    expect(hinweise(s)).toEqual([]);
    expect(engstellen(s)).toEqual([]);
  });
});

describe('NR18-P2 Ersatz einer gebauten Leitung (AE-NR18-4)', () => {
  it('test_nr18_ersatz_regeln – abgelehnt außerhalb, dünner, gleich, gesperrt, geplant; dicker setzt nur den Ersatz', () => {
    const { s, z } = mitGebauter25er();
    const l = leitung(s, 10, 11);
    expect(s.ersatzPlanen(l.id, 'd32')).toEqual({ ok: false, hinweis: TEXT_ERSATZ_AUSSERHALB });
    expect(abschnittOeffnen(s, z)).toBe(true);
    expect(s.platzieren('d25', 10, 15).ok).toBe(true);
    const geplant = leitung(s, 10, 15);
    expect(s.ersatzPlanen(l.id, 'd25').ok).toBe(false); // gleich
    expect(s.ersatzPlanen(geplant.id, 'd32').ok).toBe(false); // geplant: dafür gibt es geplanteLeitungTyp
    expect(s.ersatzPlanen(l.id, 'd50').ok).toBe(false); // gesperrt auf Stufe 1
    expect(l.ersatz).toBeUndefined();
    const warm = [...s.netz.warm];
    const nr = s.stand.naechste_id;
    expect(s.ersatzPlanen(l.id, 'd40')).toEqual({ ok: true });
    expect(l.ersatz).toEqual({ typ: 'd40', nr });
    expect(s.stand.naechste_id).toBe(nr + 1);
    expect(l.typ).toBe('d25');
    expect(s.ersatzPlanen(l.id, 'd32').ok).toBe(false); // dünner als der geplante Ersatz
    expect(s.ersatzPlanen(l.id, 'd40').ok).toBe(false); // gleich wie der geplante Ersatz
    expect(l.ersatz?.typ).toBe('d40');
    expect([...s.netz.warm]).toEqual(warm);
    expect(s.leitungsanzahl()).toBe(6); // der Ersatz ist keine neue Leitung
    s.abschnittAbschliessen();
    expect(s.ersatzPlanen(l.id, 'd40')).toEqual({ ok: false, hinweis: TEXT_ERSATZ_AUSSERHALB });
  });
  it('test_nr18_ersatz_kosten – Neupreis minus 50 % Altpreis, Spülbohrung im Fluss, keine Gestattung', () => {
    const { s, z } = mitGebauter25er();
    s.hz.stufe = 2; // Spülbohrung und Gestattung frei
    const fluss = { x: 19, y: 3 };
    expect(s.istFluss(fluss.x, fluss.y)).toBe(true);
    s.stand.objekte.push({ id: s.stand.naechste_id++, typ: 'd25', x: fluss.x, y: fluss.y, stufe: 1, bau: null, kasse_eur: 0 });
    expect(abschnittOeffnen(s, z)).toBe(true);
    expect(s.abschnittKosten_eur()).toBe(0);
    expect(s.ersatzPlanen(leitung(s, 10, 11).id, 'd32').ok).toBe(true);
    // 560 € − 200 € = 360 € (Straße)
    expect(s.ersatz_eur()).toBe(360);
    expect(s.abschnittKosten_eur()).toBe(360);
    expect(s.ersatzPlanen(leitung(s, fluss.x, fluss.y).id, 'd40').ok).toBe(true);
    // + 800 € − 200 € + 8.000 € Spülbohrung = 8.600 €
    expect(s.ersatz_eur()).toBe(360 + 8600);
    expect(s.abschnittKosten_eur()).toBe(8960);
    expect(s.gestattung_eur()).toBe(0);
    expect(s.abschnittLeitungen()).toBe(2);
  });
  it('test_nr18_ersatz_zurueck_radierer_verwerfen – Radierer, Zurück (jüngstes zuerst) und Verwerfen nehmen den Ersatz', () => {
    const { s, z } = mitGebauter25er();
    expect(abschnittOeffnen(s, z)).toBe(true);
    const l1 = leitung(s, 10, 11), l2 = leitung(s, 10, 12);
    expect(s.ersatzPlanen(l1.id, 'd32').ok).toBe(true);
    expect(s.platzieren('d25', 10, 15).ok).toBe(true);
    expect(s.ersatzPlanen(l2.id, 'd32').ok).toBe(true);
    expect(s.letzteLeitungZurueck().ok).toBe(true); // jüngstes: Ersatz auf (10|12)
    expect(l2.ersatz).toBeUndefined();
    expect(leitung(s, 10, 15)).toBeDefined();
    expect(s.letzteLeitungZurueck().ok).toBe(true); // dann die geplante (10|15)
    expect(leitung(s, 10, 15)).toBeUndefined();
    expect(l1.ersatz?.typ).toBe('d32');
    expect(s.geplanteLeitungEntfernen(10, 11).ok).toBe(true); // Radierer auf gebaut: nur der Ersatz geht
    expect(l1.ersatz).toBeUndefined();
    expect(leitung(s, 10, 11)).toBe(l1);
    expect(s.geplanteLeitungEntfernen(10, 11).ok).toBe(false);
    expect(s.letzteLeitungZurueck().ok).toBe(false);
    expect(s.ersatzPlanen(l1.id, 'd40').ok).toBe(true);
    expect(s.ersatzPlanen(l2.id, 'd32').ok).toBe(true);
    expect(s.abschnittVerwerfen().ok).toBe(true);
    expect(s.stand.objekte.some((o) => o.ersatz)).toBe(false);
  });
  it('test_nr18_ersatz_bauende – Typ neu, Vorsehung bleibt, warm während der Bauzeit', () => {
    const { s, z } = mitGebauter25er();
    const a = haus(s, 12, 14), b = haus(s, 9, 13);
    wand(s, a);
    expect(s.netz.warm.has(a.id)).toBe(true);
    const l = leitung(s, 10, 11);
    l.vorsehung = true;
    expect(abschnittOeffnen(s, z)).toBe(true);
    for (const [x, y] of [[10, 11], [10, 12], [10, 13]]) expect(s.ersatzPlanen(leitung(s, x, y).id, 'd32').ok).toBe(true);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    vorstellen(s, z, 20);
    expect(s.stand.abschnitt?.phase).toBe('bau');
    expect(l.typ).toBe('d25');
    expect(s.netz.warm.has(a.id)).toBe(true); // die 25er liefert bis zum Bauende weiter
    expect(wand(s, b)).toEqual({ ok: true }); // mit dem bestellten Ersatz reicht es: keine Warnung
    expect(s.netz.kalt.get(b.id)).toBe('leitung'); // live noch die 25er
    s.ereignisse.length = 0;
    vorstellen(s, z, KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(s.stand.abschnitt).toBeUndefined();
    expect(l.typ).toBe('d32');
    expect(l.ersatz).toBeUndefined();
    expect(l.vorsehung).toBe(true);
    expect(s.netz.warm.has(b.id)).toBe(true); // (a) kann über die lange Bauzeit kündigen, das prüft hier nichts
    const nachBau = schritte(s).map((x) => [x.schritt, x.objekt_id]);
    expect(nachBau).toContainEqual(['abschnitt_gebaut', undefined]);
    expect(nachBau).toContainEqual(['haus_warm', b.id]);
  });
  it('test_nr18_ersatz_in_probe – geplanter Ersatz zählt in der Warnprüfung, das Live-Netz bleibt alt', () => {
    const { s, z } = mitGebauter25er();
    expect(abschnittOeffnen(s, z)).toBe(true);
    for (const [x, y] of [[10, 11], [10, 12], [10, 13]]) expect(s.ersatzPlanen(leitung(s, x, y).id, 'd32').ok).toBe(true);
    expect(wand(s, haus(s, 12, 14))).toEqual({ ok: true });
    expect(wand(s, haus(s, 9, 13))).toEqual({ ok: true }); // mit der 32er reicht es
    expect(s.netz.kalt.get(haus(s, 9, 13).id)).toBe('leitung'); // live noch die 25er
    // nur zwei Felder ersetzt: das dritte bleibt eine zu dünne 25er
    const v = mitGebauter25er();
    expect(abschnittOeffnen(v.s, v.z)).toBe(true);
    for (const [x, y] of [[10, 11], [10, 12]]) expect(v.s.ersatzPlanen(leitung(v.s, x, y).id, 'd32').ok).toBe(true);
    expect(wand(v.s, haus(v.s, 12, 14)).ok).toBe(true);
    expect(wand(v.s, haus(v.s, 9, 13))).toEqual({ ok: true, hinweis: 'Eine 25er auf dem Weg ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.' });
  });
});

describe('NR18-P2 Warnliste des Bauabschnitts (AE-NR18-5)', () => {
  it('test_nr18_abschliessen_warnliste – Liste, Hinweis, „Weitere …“, Leeren', () => {
    const { s, z } = mitGebauter25er();
    for (const h of [haus(s, 12, 14), haus(s, 9, 13)]) wand(s, h);
    expect(abschnittOeffnen(s, z)).toBe(true);
    expect(s.platzieren('d25', 10, 15).ok).toBe(true);
    s.ereignisse.length = 0;
    expect(s.abschnittAbschliessen()).toEqual({ ok: true, hinweis: TEXT_HZ_25 });
    expect(s.abschnittWarnungen()).toEqual([TEXT_HZ_25]);
    expect(engstellen(s)).toEqual([[feld(10, 11), feld(10, 12), feld(10, 13)]]);
    expect(schritte(s).map((x) => x.schritt)).toEqual(['abschnitt_abgeschlossen']);
    expect(s.abschnittWiederOeffnen().ok).toBe(true);
    expect(s.abschnittWarnungen()).toEqual([]);
    // zweites Stück: eine 25er-Stichleitung mit Mehrfamilienhaus (30 kW) am Ende
    zeichne(s, 'd25', [[12, 12]]);
    const c = haus(s, 13, 12);
    c.aufgestockt = true; c.vollversorgung = true;
    expect(bedarfKw(c)).toBeGreaterThan(15);
    expect(wand(s, c).ok).toBe(true);
    const e = s.abschnittAbschliessen();
    expect(e.ok).toBe(true);
    expect(s.abschnittWarnungen().length).toBe(2);
    expect(e.hinweis).toBe(`${s.abschnittWarnungen()[0]} ${WEITERE_STELLEN}`);
    expect(s.abschnittVerwerfen().ok).toBe(true);
    expect(s.abschnittWarnungen()).toEqual([]);
    expect(abschnittOeffnen(s, z)).toBe(true);
    expect(s.platzieren('d25', 10, 15).ok).toBe(true);
    s.abschnittAbschliessen();
    expect(s.abschnittWarnungen().length).toBeGreaterThan(0);
    expect(s.materialBestellen().ok).toBe(true);
    expect(s.abschnittWarnungen()).toEqual([]);
  });
  it('test_nr18_abschliessen_warnliste – W4: Stationskauf und Entfernen in Phase bestellen halten die Liste aktuell', () => {
    const { s, z } = leeresDorf();
    expect(abschnittOeffnen(s, z)).toBe(true);
    zeichne(s, 'd25');
    expect(s.abschnittAbschliessen()).toEqual({ ok: true });
    expect(s.abschnittWarnungen()).toEqual([]);
    expect(wand(s, haus(s, 9, 13)).ok).toBe(true);
    expect(s.abschnittWarnungen()).toEqual([]);
    expect(wand(s, haus(s, 12, 14))).toEqual({ ok: true, hinweis: TEXT_EINGEZ_25 });
    expect(s.abschnittWarnungen()).toEqual([TEXT_EINGEZ_25]);
    s.ereignisse.length = 0;
    expect(s.entfernen(leitung(s, 11, 14).id).ok).toBe(true);
    expect(schritte(s).map((x) => [x.schritt, x.objekt_id])).toEqual([['haus_getrennt', haus(s, 12, 14).id]]);
    expect(s.abschnittWarnungen()).toEqual([]);
  });
  it('test_nr18_ersatz_entfernen – W5: in Phase bau abgelehnt; offen und bestellen: Leitung und Ersatz weg, 50 % des alten Typs', () => {
    const { s, z } = mitGebauter25er();
    expect(abschnittOeffnen(s, z)).toBe(true);
    const l = leitung(s, 11, 14);
    expect(s.ersatzPlanen(l.id, 'd32').ok).toBe(true);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    const geld = s.stand.geld_eur;
    expect(s.entfernen(l.id)).toEqual({ ok: false, hinweis: TEXT_W5 });
    expect(s.stand.geld_eur).toBe(geld);
    expect(leitung(s, 11, 14)).toBe(l);
    expect(l.ersatz?.typ).toBe('d32');
    vorstellen(s, z, KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(l.typ).toBe('d32');
    for (const phase of ['offen', 'bestellen'] as const) {
      const d = mitGebauter25er();
      expect(abschnittOeffnen(d.s, d.z)).toBe(true);
      const m = leitung(d.s, 11, 14);
      expect(d.s.ersatzPlanen(m.id, 'd32').ok).toBe(true);
      if (phase === 'bestellen') expect(d.s.abschnittAbschliessen().ok).toBe(true);
      const g = d.s.stand.geld_eur;
      expect(d.s.entfernen(m.id)).toEqual({ ok: true });
      expect(d.s.stand.geld_eur - g).toBe(200); // 50 % von 400 € (25er)
      expect(leitung(d.s, 11, 14)).toBeUndefined();
      expect(d.s.ersatz_eur()).toBe(0);
      expect(d.s.abschnittKosten_eur()).toBe(0);
    }
  });
  it('test_nr18_keine_wegsuche – Wegsuche und Sofort-Tausch gibt es nicht mehr', () => {
    const s = new Spiel(altesStartdorf(T0), () => T0);
    expect('hausanschlussPlanen' in s).toBe(false);
    expect('leitungTauschen' in s).toBe(false);
  });
});
