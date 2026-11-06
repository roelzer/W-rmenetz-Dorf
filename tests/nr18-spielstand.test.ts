import { describe, expect, it } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { KATALOG, passendeStation, istLeitung } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import type { Objekt } from '../src/core/typen';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { abschnittOeffnen, objektBei } from './hilfen/nr18';

// NR18-P2 (Bauplan NR18 Abschnitt 7, „Bauplan P2“, speichern.ts): Spielstand ist Eingabe von außen; geprüft wird an der Grenze.
const T0 = 1_000_000_000_000;
// Zwei Häuser mit Kamin aus und Stockwerk (je 21 kW) am 40er-Startnetz: 42 kW über (10|11) … (10|13), 40 kW Kapazität;
// die 25er (11|14) trägt 21 kW bei 15 kW Kapazität. Die 50er ist auf Stufe 1 gesperrt (ab Stufe 2), die 32er (25 kW) frei.
const WARNUNGEN = [
  'Die 40er an der Heizzentrale ist zu dünn, es fehlen 2 kW. Die 50er gibt es ab Stufe 2.',
  'Eine 25er auf dem Weg ist zu dünn, es fehlen 6 kW. Zeichne eine 32er darüber.',
];
type Roh = { objekte: Array<Record<string, unknown>> } & Record<string, unknown>;

/** Altes Startdorf mit gewählter Quelle und offenem Bauabschnitt. */
function offen() {
  const z = { t: T0 };
  const s = new Spiel(altesStartdorf(T0), () => z.t);
  s.ersteQuelleWaehlen('kessel');
  s.stand.geld_eur = 1_000_000;
  expect(abschnittOeffnen(s, z)).toBe(true);
  return { s, z };
}
const laden = (roh: Roh, z: { t: number }) => {
  const r = ladenMitBefund(JSON.stringify(roh), z.t);
  return { ...r, s: new Spiel(r.stand, () => z.t) };
};
const leitungBei = (s: Spiel, x: number, y: number): Objekt | undefined => objektBei(s, x, y, (o) => istLeitung(o.typ));

describe('NR18-P2 alte und kaputte Spielstände', () => {
  it('test_nr18_spielstand_gruppe – alter Stand mit Hausanschluss-Gruppe lädt, „gruppe“ ist weg, „Zurück“ nimmt ein Feld', () => {
    const { s, z } = offen();
    for (const [x, y] of [[9, 12], [9, 11]]) expect(s.platzieren('d25', x, y).ok).toBe(true);
    const roh = JSON.parse(serialisieren(s.stand)) as Roh;
    for (const o of roh.objekte) if (o.geplant) o.gruppe = 76; // so schrieb die alte Wegsuche ihre Felder
    const g = laden(roh, z);
    expect(g.befund).toBe('ok');
    expect(g.stand.objekte.filter((o) => 'gruppe' in o)).toEqual([]);
    expect(g.s.stand.abschnitt?.phase).toBe('offen');
    expect(g.s.letzteLeitungZurueck().ok).toBe(true);
    expect(leitungBei(g.s, 9, 11)).toBeUndefined();
    expect(leitungBei(g.s, 9, 12)?.geplant).toBe(true);
  });
  it('test_nr18_spielstand_warnliste – Stand in Phase bestellen: nach dem Laden ist die Warnliste gefüllt', () => {
    const { s, z } = offen();
    for (const h of [objektBei(s, 9, 13)!, objektBei(s, 12, 14)!]) {
      h.aufgestockt = true; h.vollversorgung = true; delete h.station; h.ohne_station = true;
    }
    const roh = JSON.parse(serialisieren(s.stand)) as Roh;
    roh.abschnitt = { ...(roh.abschnitt as object), phase: 'bestellen' };
    const g = laden(roh, z);
    expect(g.s.abschnittWarnungen()).toEqual([]); // ohne Stationen ist niemand Kunde
    for (const h of [objektBei(g.s, 9, 13)!, objektBei(g.s, 12, 14)!]) expect(g.s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
    const bedarf = bedarfKw(objektBei(g.s, 9, 13)!) + bedarfKw(objektBei(g.s, 12, 14)!);
    expect(bedarf).toBeCloseTo(42, 9);
    const roh2 = JSON.parse(serialisieren(g.s.stand)) as Roh;
    const g2 = laden(roh2, z);
    expect(g2.s.stand.abschnitt?.phase).toBe('bestellen');
    expect(g2.s.abschnittWarnungen()).toEqual(WARNUNGEN);
    expect(g2.s.ereignisse.filter((e) => e.art === 'schritt')).toEqual([]); // Laden meldet keine Schritte
  });
  it('test_nr18_spielstand_ersatz – kaputter Ersatz wird entfernt, der Stand bleibt gültig; ein richtiger bleibt', () => {
    const { s, z } = offen();
    expect(s.platzieren('d25', 9, 12).ok).toBe(true);
    const roh = JSON.parse(serialisieren(s.stand)) as Roh;
    const bei = (x: number, y: number) => roh.objekte.find((o) => o.x === x && o.y === y && istLeitung(o.typ as never))!;
    bei(10, 10).ersatz = { typ: 'hz', nr: 900 }; // keine Leitung
    bei(9, 12).ersatz = { typ: 'd63', nr: 901 }; // an geplanter Leitung
    bei(10, 11).ersatz = { typ: 'd50', nr: 'x' }; // nr ist keine Zahl
    bei(10, 12).ersatz = { typ: 'd25', nr: 902 }; // dünner als die 40er
    bei(10, 13).ersatz = { typ: 'd40', nr: 903 }; // gleich dick
    bei(11, 14).ersatz = { typ: 'd32', nr: 904 }; // richtig: 25er → 32er
    bei(10, 14).ersatz = 'd50'; // keine Form
    const g = laden(roh, z);
    expect(g.befund).toBe('ok');
    expect(g.stand.objekte.filter((o) => 'ersatz' in o).map((o) => [o.x, o.y, o.ersatz])).toEqual([[11, 14, { typ: 'd32', nr: 904 }]]);
    expect(KATALOG[leitungBei(g.s, 11, 14)!.typ].name).toBe('25er-Leitung');
  });
});
