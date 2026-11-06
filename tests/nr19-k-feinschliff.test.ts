import { describe, expect, it } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { KATALOG } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { kontextKarte, type Attrappe, type AttrappenElement } from './hilfen/kontext-attrappe';
import { objektBei } from './hilfen/nr18';

// NR19-K Feinschliff (Tester-Vorarbeit 06.11.): Designer-Nachfoto NR19 (docs/DESIGN.md 12.23 Absatz „Nachfoto“,
// docs/ENTSCHEIDUNGEN.md „Designer-Nachfoto NR19“). Echte Kontextkarte mit echtem Kern, ohne Browser (tests/hilfen/kontext-attrappe).
// Geprüft wird
//  - CAD-Knopf der Stationswahl: Zeile 1 kurz „CAD-Station · 150 kW“ (geschützt in „150 kW“), kein langer Name im Knopf;
//    Katalogname und Hauskarte bleiben lang („CAD-Großabnehmerstation“).
//  - Wandknöpfe Zeile 1 „Wandstation Typ 60 · 60 kW“ mit geschützten Leerzeichen in „Typ 60“, „60 kW“ und vor „·“ – hier mit
//    anderen Typen als in den Beispielen (60/80 statt 15).
//  - Stationszeile „Leistung Station“ als zwei Wortgruppen auch für HP 1000 und ÜP 1000 (nicht nur HP 800 aus dem Beispiel).
//  - Zeile „Aktuell …“: geschützte Leerzeichen in „(… kW)“, „… kW“ und „50 %“.
// Zahlen von Hand: Hallenbad 67.500 kWh ÷ 1.500 h = 45 kW → passend Typ 60, 80, CAD (bis drei Knöpfe);
// EFH 15.000 kWh ÷ 1.500 h = 10 kW, ÷ 2.000 h = 7,5 kW; EFH Kamin aus + aufgestockt: 15.000 × 1,5 × 1,4 = 31.500 kWh ÷ 2.000 h = 15,75 → „15,8“.
// Rückkauf: KONSTANTEN.rueckkauf_anteil 0,5 → „50 %“. HP 1000: 20 kW Netz / 27 kW Haus; ÜP 1000: 40 kW Netz / 54 kW Haus (Katalog, ENERPIPE).

const T0 = 1_000_000_000_000;
const NB = ' ';
const norm = (t: string): string => t.replace(/[  ]/g, ' ');

function dorf(stufe: number): Spiel {
  const s = new Spiel(altesStartdorf(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  return s;
}
const haus = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => KATALOG[o.typ].kategorie === 'haus')!;
const ohneStation = (s: Spiel): Objekt => { const o = haus(s, 13, 12); expect(o.ohne_station, 'Vorbedingung: (13|12) ohne Station').toBe(true); return o; };
const hallenbad = (s: Spiel): Objekt => {
  // Ein Großabnehmer ohne Station aus dem Startdorf, auf Hallenbad (Katalog-Id 'bad', 67.500 kWh/a) gesetzt
  const g = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'gross' && o.ohne_station);
  if (!g) throw new Error('Testaufbau: kein Großabnehmer ohne Station im alten Startdorf');
  g.typ = 'bad'; g.zustand = 'vertrag';
  s.neuBerechnen();
  return g;
};

type Knopf = { z1roh: string; z2roh: string; z1: string; ganz: string };
async function karte(s: Spiel, o: Objekt): Promise<{ roh: string; knoepfe: Knopf[]; absaetze: string[] }> {
  const { a, c } = await kontextKarte(s, o, T0);
  const knoepfe = a.alle(c).filter((e) => e.tag === 'button').map((e) => teile(a, e));
  return { roh: a.text(c), knoepfe, absaetze: a.alle(c).filter((e) => e.tag === 'p').map(a.text) };
}
function teile(a: Attrappe, e: AttrappenElement): Knopf {
  const istSmall = (n: unknown): boolean => !!n && typeof n === 'object' && (n as { tag?: string }).tag === 'small';
  const z1roh = e.kinder.filter((n) => !istSmall(n)).map(a.text).join('');
  const z2roh = e.kinder.filter(istSmall).map(a.text).join('');
  return { z1roh, z2roh, z1: norm(z1roh), ganz: z1roh + z2roh };
}
const aktuell = (absaetze: string[]): string => {
  const t = absaetze.filter((x) => x.startsWith('Aktuell:'));
  expect(t.length, 'genau eine Zeile „Aktuell …“').toBe(1);
  return t[0];
};

describe('NR19-K – CAD-Knopf in der Stationswahl (DESIGN 12.23 Nachfoto)', () => {
  it('NR19-K: CAD-Knopf Zeile 1 heißt kurz „CAD-Station · 150 kW“', async () => {
    const s = dorf(2), k = await karte(s, hallenbad(s));
    const cad = k.knoepfe.filter((x) => x.z1.startsWith('CAD'));
    expect(cad.map((x) => x.z1)).toEqual(['CAD-Station · 150 kW']);
  });

  it('NR19-K: CAD-Knopf – geschütztes Leerzeichen in „150 kW“, nach „·“ normales Leerzeichen', async () => {
    const s = dorf(2), k = await karte(s, hallenbad(s));
    const [cad] = k.knoepfe.filter((x) => x.z1.startsWith('CAD'));
    expect(cad.z1roh).toMatch(new RegExp(`^CAD-Station[ ${NB}]· 150${NB}kW$`));
  });

  it('NR19-K: kein Knopf der Stationswahl trägt den langen Namen „Großabnehmerstation“', async () => {
    const s = dorf(2), k = await karte(s, hallenbad(s));
    expect(k.knoepfe.length).toBeGreaterThan(0);
    expect(k.knoepfe.filter((x) => x.ganz.includes('Großabnehmerstation')).map((x) => x.ganz)).toEqual([]);
  });

  it('NR19-K: Hauskarte mit eingebauter CAD-Station zeigt in der Zeile „Übergabestation“ weiter den langen Namen', async () => {
    // Die Großabnehmerkarte hat keine Zeile „Übergabestation“; die lange Form steht in der Hauskarte. MFH Kamin aus + aufgestockt:
    // 45.000 × 1,5 × 1,4 = 94.500 kWh ÷ 1.500 h = 63 kW → wählbar sind Typ 80 und CAD.
    const s = dorf(2), m = ohneStation(s);
    m.typ = 'mfh'; m.vollversorgung = true; m.aufgestockt = true; s.neuBerechnen();
    const wahl = await karte(s, m);
    expect(wahl.knoepfe.filter((x) => x.z1.startsWith('CAD')).length, 'Vorbedingung: CAD wählbar').toBe(1);
    expect(s.stationKaufen(m.id, 'st_cad').ok).toBe(true);
    const k = await karte(s, m);
    expect(norm(k.roh)).toContain('Übergabestation' + 'CAD-Großabnehmerstation · 150 kW');
  });
});

describe('NR19-K – Wandknöpfe Zeile 1 mit geschützten Leerzeichen (andere Typen als im Beispiel)', () => {
  it('NR19-K: Großabnehmer 45 kW – Wandknöpfe „Wandstation Typ 60 · 60 kW“ und „Typ 80 · 80 kW“ geschützt, nur nach „Wandstation“ und „·“ umbrechbar', async () => {
    const s = dorf(2), k = await karte(s, hallenbad(s));
    expect(k.knoepfe.filter((x) => x.z1.startsWith('Wandstation')).map((x) => x.z1roh))
      .toEqual([`Wandstation Typ${NB}60${NB}· 60${NB}kW`, `Wandstation Typ${NB}80${NB}· 80${NB}kW`]);
  });
});

describe('NR19-K – Stationszeile „Leistung Station“ für alle Puffer-Stationen', () => {
  for (const [id, netz, spitze] of [['hp_1000', 20, 27], ['up_1000', 40, 54]] as const) {
    it(`NR19-K: ${id} – „${netz} kW Netz · ${spitze} kW Haus“ als zwei geschützte Wortgruppen`, async () => {
      const s = dorf(2), h = ohneStation(s);
      expect(s.stationKaufen(h.id, id).ok).toBe(true);
      const k = await karte(s, h);
      expect(k.roh).toContain(`Leistung Station${netz}${NB}kW${NB}Netz${NB}· ${spitze}${NB}kW${NB}Haus`);
    });
  }
});

describe('NR19-K – Zeile „Aktuell …“ mit geschützten Leerzeichen', () => {
  it('NR19-K: Wandstation Typ 15 – „(15 kW)“, „10 kW“ und „50 %“ geschützt', async () => {
    const s = dorf(2), w = haus(s, 9, 13);
    expect(w.station, 'Vorbedingung: (9|13) mit Wandstation Typ 15').toBe('st_15');
    const t = aktuell((await karte(s, w)).absaetze);
    expect(t).toContain(`(15${NB}kW), das Gebäude braucht 10${NB}kW.`);
    expect(t).toContain(`zu 50${NB}% zurückgekauft.`);
    expect(t, 'keine Zahl mit normalem Leerzeichen vor kW oder %').not.toMatch(/\d (kW|%)/);
  });

  it('NR19-K: HP 800 im Haus mit Kamin aus und aufgestockt – „(14 kW)“ und „15,8 kW“ geschützt', async () => {
    const s = dorf(1), h = ohneStation(s);
    expect(s.stationKaufen(h.id, 'hp_800').ok).toBe(true);
    h.vollversorgung = true; h.aufgestockt = true; s.neuBerechnen();
    const t = aktuell((await karte(s, h)).absaetze);
    expect(t.startsWith(`Aktuell: Puffer HP${NB}800 (14${NB}kW), das Gebäude braucht 15,8${NB}kW.`)).toBe(true);
    expect(t).toContain(`zu 50${NB}% zurückgekauft.`);
    expect(t, 'keine Zahl mit normalem Leerzeichen vor kW oder %').not.toMatch(/\d (kW|%)/);
  });
});
