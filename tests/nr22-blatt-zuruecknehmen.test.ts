import { describe, expect, it } from 'vitest';
import type { Spiel } from '../src/core/spiel';
import { KONSTANTEN, istLeitung, passendeStation, type TypId } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import type { Objekt } from '../src/core/typen';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';
import { abschnittOeffnen, objektBei, vorstellen, type Uhr } from './hilfen/nr18';
import { leeresDorf } from './hilfen/nr22';

// P7d (Entscheidung PL 2026-11-08 nach Tester P7t): [Zurücknehmen] im Kasten „Überlastet“ erscheint nur, wenn mindestens ein
// Feld des Stücks Ersatz in genau der empfohlenen Größe hat – sonst gäbe es nichts zurückzunehmen.
// Lage wie tests/nr22-blatt.test.ts (dort von Hand hergeleitet): 25er von (10|10) über (10|9) bis (3|7), 11 Felder, Reihenhaus (4|7) mit
// 16 kW am Ende; die 25er schafft 15 kW → ein Stück, empfohlen 32er. Preis je Feld 32er: 560 € − 50 % von 400 € = 360 €.
const T0 = 1_000_000_000_000;
const WEG: ReadonlyArray<[number, number]> = [[10, 10], [10, 9], [9, 9], [8, 9], [7, 9], [6, 9], [5, 9], [4, 9], [3, 9], [3, 8], [3, 7]];
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const leitung = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => istLeitung(o.typ))!;
const wegLeitungen = (s: Spiel): Objekt[] => WEG.map(([x, y]) => leitung(s, x, y));
const ersatzTypen = (s: Spiel): Array<TypId | undefined> => wegLeitungen(s).map((o) => o.ersatz?.typ);
const mit = (u: EchteUmgebung, anfang: string): El[] => u.knoepfe().filter((k) => k.isConnected && norm(k.textContent).startsWith(anfang));
const zeile2 = (k: El): string => norm(k.querySelector('small')?.textContent ?? '');

function gebautOffen(): { s: Spiel; z: Uhr } {
  const d = leeresDorf(T0);
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  for (const [x, y] of WEG) expect(d.s.platzieren('d25', x, y).ok).toBe(true);
  const h = objektBei(d.s, 4, 7, (o) => !istLeitung(o.typ))!;
  expect(d.s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
  expect(d.s.abschnittAbschliessen().ok).toBe(true);
  expect(d.s.materialBestellen().ok).toBe(true);
  vorstellen(d.s, d.z, KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  // Testaufbau: genau das erwartete Stück
  expect(d.s.ueberlastStuecke().map((e) => [e.felder.length, e.empfohlen])).toEqual([[11, 'd32']]);
  return d;
}

describe('NR22 P7d: [Zurücknehmen] nur bei Ersatz in der empfohlenen Größe', () => {
  // Fehler, der ihn rot macht: Der Knopf erscheint, sobald kein Feld mehr offen ist – auch wenn alles von Hand dicker geplant ist.
  it('test_nr22_zuruecknehmen_nicht_ohne_empfohlenen_ersatz: alle 11 Felder von Hand auf 40er → kein [Zurücknehmen]', async () => {
    const { s, z } = gebautOffen();
    for (const o of wegLeitungen(s)) expect(s.ersatzPlanen(o.id, 'd40').ok).toBe(true);
    await echteSteuerung(s, (u) => {
      u.st.kontext(leitung(s, 8, 9).id);
      expect(mit(u, 'Auf 32er vergrößern').length, 'Knopf Vergrößern').toBe(0);
      expect(mit(u, 'Zurücknehmen').length, 'Knopf Zurücknehmen').toBe(0);
    }, { uhr: () => z.t });
    expect(ersatzTypen(s)).toEqual(Array(11).fill('d40'));
  });

  // Grenzfall genau ein Feld: Fehler, der ihn rot macht, wäre „Knopf erst ab zwei Feldern“ oder Entfernen auch der 40er.
  it('test_nr22_zuruecknehmen_ein_feld_empfohlen: 10 Felder 40er, 1 Feld 32er → Knopf da, nimmt nur die 32er zurück', async () => {
    const { s, z } = gebautOffen();
    const leitungen = wegLeitungen(s);
    leitungen.forEach((o, i) => expect(s.ersatzPlanen(o.id, i === 10 ? 'd32' : 'd40').ok).toBe(true));
    await echteSteuerung(s, (u) => {
      u.st.kontext(leitung(s, 8, 9).id);
      const zurueck = mit(u, 'Zurücknehmen');
      expect(zurueck).toHaveLength(1);
      zurueck[0].click();
      expect(ersatzTypen(s)).toEqual([...Array(10).fill('d40'), undefined]);
      expect(mit(u, 'Auf 32er vergrößern').map(zeile2)).toEqual(['1 Feld · 360 €']);
    }, { uhr: () => z.t });
  });
});
