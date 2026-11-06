import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand, type Ereignis } from '../src/core/spiel';
import { KATALOG, KONSTANTEN, istLeitung, passendeStation } from '../src/core/katalog';
import { bedarfKw, berechneNetz } from '../src/core/netz';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import type { Objekt } from '../src/core/typen';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { zufallsNetz } from './hilfen/a91-netze';
import { abschnittBauen, abschnittOeffnen, erreichteHaeuser, objektBei, vorstellen, type Uhr } from './hilfen/nr18';

// NR18-P2 / NR13 (Bauplan NR18 Abschnitt 5.4): Der Kern meldet gelungene Handlungen als Ereignis „schritt“.
const T0 = 1_000_000_000_000;

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
/** Schritte seit dem letzten Aufruf als [schritt, objekt_id] (ohne objekt_id nur [schritt]); leert die Ereignisliste. */
function neueSchritte(s: Spiel): Array<[string, number] | [string]> {
  const r = s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'schritt' }> => e.art === 'schritt')
    .map((e): [string, number] | [string] => (e.objekt_id === undefined ? [e.schritt] : [e.schritt, e.objekt_id]));
  s.ereignisse.length = 0;
  return r;
}

describe('NR13 Schritt-Ereignisse aus dem Kern', () => {
  it('test_nr13_schritt_je_handlung – jede der zehn Arten genau nach ihrer Handlung', () => {
    const { s, z } = leeresDorf();
    const h = haus(s, 9, 13);
    expect(s.abschnittPlanen().ok).toBe(true);
    expect(neueSchritte(s)).toEqual([['abschnitt_geplant']]);
    vorstellen(s, z, KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(neueSchritte(s)).toEqual([['abschnitt_offen']]);
    expect(s.platzieren('d25', 10, 11).ok).toBe(true);
    const l1 = leitung(s, 10, 11);
    expect(neueSchritte(s)).toEqual([['leitung_gezeichnet', l1.id]]);
    expect(s.platzieren('d25', 10, 12).ok).toBe(true);
    neueSchritte(s);
    expect(s.platzieren('d25', 10, 13).ok).toBe(true);
    expect(neueSchritte(s)).toEqual([['leitung_gezeichnet', leitung(s, 10, 13).id], ['haus_erreicht', h.id]]);
    expect(s.geplanteLeitungTyp(l1.id, 'd32').ok).toBe(true);
    expect(l1.typ).toBe('d32');
    expect(neueSchritte(s)).toEqual([['leitung_gezeichnet', l1.id]]);
    expect(s.geplanteLeitungEntfernen(10, 13).ok).toBe(true);
    expect(neueSchritte(s)).toEqual([['haus_getrennt', h.id]]);
    expect(s.platzieren('d25', 10, 13).ok).toBe(true);
    neueSchritte(s);
    expect(s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
    expect(neueSchritte(s)).toEqual([['station_gekauft', h.id]]);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(neueSchritte(s)).toEqual([['abschnitt_abgeschlossen']]);
    expect(s.materialBestellen().ok).toBe(true);
    expect(neueSchritte(s)).toEqual([['material_bestellt']]);
    vorstellen(s, z, KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(neueSchritte(s)).toEqual([['abschnitt_gebaut'], ['haus_warm', h.id]]);
    expect(abschnittOeffnen(s, z)).toBe(true);
    neueSchritte(s);
    const l2 = leitung(s, 10, 12);
    expect(s.ersatzPlanen(l2.id, 'd32').ok).toBe(true);
    expect(neueSchritte(s)).toEqual([['leitung_gezeichnet', l2.id]]);
  });
  it('test_nr13_erreicht_und_getrennt – Feld für Feld, Zurück, Radierer, Laden', () => {
    const { s, z } = leeresDorf();
    const a = haus(s, 9, 13), b = haus(s, 12, 14);
    expect(abschnittOeffnen(s, z)).toBe(true);
    neueSchritte(s);
    const erreicht = (): Array<[string, number] | [string]> => neueSchritte(s).filter((x) => x[0] !== 'leitung_gezeichnet');
    for (const [x, y] of [[10, 11], [10, 12]]) { expect(s.platzieren('d25', x, y).ok).toBe(true); expect(erreicht()).toEqual([]); }
    expect(s.platzieren('d25', 10, 13).ok).toBe(true);
    expect(erreicht()).toEqual([['haus_erreicht', a.id]]);
    expect(s.platzieren('d25', 10, 14).ok).toBe(true);
    expect(erreicht()).toEqual([]);
    expect(s.platzieren('d25', 11, 14).ok).toBe(true);
    expect(erreicht()).toEqual([['haus_erreicht', b.id]]);
    expect(a.ohne_station && b.ohne_station).toBe(true); // erreicht zählt auch ohne Station
    expect(s.erreichteHaeuser()).toEqual([a.id, b.id].sort((x, y) => x - y));
    expect(s.letzteLeitungZurueck().ok).toBe(true);
    expect(erreicht()).toEqual([['haus_getrennt', b.id]]);
    expect(s.geplanteLeitungEntfernen(10, 12).ok).toBe(true);
    expect(erreicht()).toEqual([['haus_getrennt', a.id]]);
    expect(s.erreichteHaeuser()).toEqual([]);
    // Laden: der erste Abgleich meldet nichts, eine Änderung danach schon
    const g = new Spiel(ladenMitBefund(serialisieren(s.stand), z.t).stand, () => z.t);
    expect(neueSchritte(g)).toEqual([]);
    expect(g.platzieren('d25', 10, 12).ok).toBe(true);
    expect(neueSchritte(g).filter((x) => x[0] !== 'leitung_gezeichnet')).toEqual([['haus_erreicht', a.id]]);
  });
  it('test_nr13_erreicht_gleich_probe – 20 Zufallsnetze: erreichteHaeuser = Anschlüsse der Rechnung mit allen Objekten', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const netz = zufallsNetz(seed);
      // jede dritte Leitung gilt als eingezeichnet: sie zählt für „erreicht“ mit
      netz.objekte.filter((o) => istLeitung(o.typ)).forEach((o, i) => { if (i % 3 === 0) o.geplant = true; });
      const st = { ...neuerSpielstand(T0), objekte: netz.objekte, innen: netz.innen, vorlauf_c: netz.vorlauf_c, quelle_gewaehlt: true };
      const s = new Spiel(st, () => T0);
      const probe = berechneNetz(netz.objekte, netz.innen, st.preisstufe, s.vorlauf_c, s.grundgebuehr_eur);
      const erwartet = netz.objekte.filter((o) => ['haus', 'gross'].includes(KATALOG[o.typ].kategorie) && probe.anschluss.has(o.id)).map((o) => o.id).sort((x, y) => x - y);
      expect(erreichteHaeuser(s), `Netz ${seed}`).toEqual(erwartet);
    }
  });
  it('test_nr13_kein_schritt_bei_ablehnung – abgelehnte Aktionen melden nichts', () => {
    const { s, z } = leeresDorf();
    expect(s.platzieren('d25', 10, 11).ok).toBe(false); // kein offener Abschnitt
    const h = haus(s, 12, 14);
    const geld = s.stand.geld_eur;
    s.stand.geld_eur = 0;
    expect(s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(false);
    s.stand.geld_eur = geld;
    expect(neueSchritte(s)).toEqual([]);
    expect(abschnittOeffnen(s, z)).toBe(true);
    for (const [x, y] of [[10, 11], [10, 12], [10, 13], [10, 14], [11, 14]]) s.platzieren('d25', x, y);
    abschnittBauen(s, z);
    expect(abschnittOeffnen(s, z)).toBe(true);
    const l = leitung(s, 11, 14);
    expect(s.ersatzPlanen(l.id, 'd32').ok).toBe(true);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    neueSchritte(s);
    expect(s.entfernen(l.id).ok).toBe(false);
    expect(neueSchritte(s)).toEqual([]);
    expect(s.erreichteHaeuser()).toContain(h.id);
  });
  it('test_nr13_haus_warm_nicht_beim_laden – Konstruktor meldet kein haus_warm, danach genau eins je neu warmem Haus', () => {
    const z = { t: T0 };
    const s0 = new Spiel(altesStartdorf(T0), () => z.t);
    s0.ersteQuelleWaehlen('kessel');
    s0.stand.geld_eur = 1_000_000;
    s0.neuBerechnen();
    expect(s0.netz.warm.size).toBeGreaterThan(0);
    const s = new Spiel(ladenMitBefund(serialisieren(s0.stand), z.t).stand, () => z.t);
    expect(s.netz.warm.size).toBe(s0.netz.warm.size);
    expect(neueSchritte(s)).toEqual([]);
    const h = haus(s, 9, 10); // liegt an der gebauten 40er (10|10), noch ohne Station
    expect(h.ohne_station).toBe(true);
    expect(s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
    expect(neueSchritte(s)).toEqual([['haus_warm', h.id], ['station_gekauft', h.id]]);
  });
});
