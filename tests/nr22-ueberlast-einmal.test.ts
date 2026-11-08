import { afterEach, describe, expect, it, vi } from 'vitest';
import * as engstelle from '../src/core/engstelle';
import { KONSTANTEN, istLeitung, passendeStation } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import type { Szene } from '../src/render/szene';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import { abschnittOeffnen, objektBei, vorstellen } from './hilfen/nr18';
import { leeresDorf } from './hilfen/nr22';

// Tester-Vorarbeit P7t (Review P7 gesamt K1, Nacharbeit P7d (3)): Die Suche nach überlasteten Stücken läuft je Bild bei
// unverändertem Netz höchstens einmal – auch wenn das Leitungsblatt offen ist (Saum, Dreiecke, „geplant“ und Vorschau-Rauten
// lesen dasselbe Ergebnis). Gezählt wird die Kernsuche `engstellenFinden` selbst (Durchreiche, rechnet echt); wie der Kern das
// Ergebnis wiederverwendet (Zwischenspeicher je Netz-Stand oder Stück weiterreichen), legt der Test nicht fest.
// Rot bis P7d: heute rechnet ein Bild mit offenem Blatt 4-mal (ueberlastSzene 1 + je Stück stueckOffeneFelder 1, Vorschau 1 + 1).
vi.mock('../src/core/engstelle', async (original) => {
  const echt = await original<typeof import('../src/core/engstelle')>();
  return { ...echt, engstellenFinden: vi.fn(echt.engstellenFinden) };
});
const suche = vi.mocked(engstelle.engstellenFinden);

// Lage wie tests/nr22-blatt.test.ts (dort von Hand hergeleitet): 25er von (11|9) bis (3|7), 11 Felder, Reihenhaus (4|7) mit
// 16 kW am Ende; die 25er schafft 15 kW → ein überlastetes Stück, empfohlen 32er.
const T0 = 1_000_000_000_000;
const WEG: ReadonlyArray<[number, number]> = [[11, 9], [10, 9], [9, 9], [8, 9], [7, 9], [6, 9], [5, 9], [4, 9], [3, 9], [3, 8], [3, 7]];

function gebautOffen() {
  const d = leeresDorf(T0);
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  for (const [x, y] of WEG) expect(d.s.platzieren('d25', x, y).ok).toBe(true);
  const h = objektBei(d.s, 4, 7, (o) => !istLeitung(o.typ))!;
  expect(d.s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
  expect(d.s.abschnittAbschliessen().ok).toBe(true);
  expect(d.s.materialBestellen().ok).toBe(true);
  vorstellen(d.s, d.z, KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  return { ...d, haus: h };
}
const szene = (u: EchteUmgebung): Szene => (u.st as unknown as { szene(): Szene }).szene();

afterEach(() => { suche.mockClear(); });

describe('NR22 P7t: überlastete Stücke je Bild nur einmal suchen (rot bis P7d)', () => {
  // Fehler, der ihn rot macht: szene() ruft ueberlastStuecke() bzw. stueckOffeneFelder() mehrfach und jedes Mal sucht der Kern neu.
  it('test_nr22_ueberlast_einmal_je_bild: offenes Leitungsblatt, Netz unverändert → höchstens eine Suche je Bild; nach Netzänderung neues Ergebnis', async () => {
    const { s, z, haus } = gebautOffen();
    await echteSteuerung(s, (u) => {
      const o = objektBei(s, 8, 9, (x) => istLeitung(x.typ))!;
      u.st.kontext(o.id);
      // Testaufbau: Saum und Vorschau sind wirklich da (sonst gäbe es nichts zu suchen)
      const erst = szene(u);
      expect(erst.ueberlast?.map((e) => e.felder.length)).toEqual([11]);
      expect(erst.ueberlast_vorschau?.felder).toHaveLength(11);
      for (let bild = 1; bild <= 3; bild++) {
        suche.mockClear();
        const sz = szene(u);
        expect(sz.ueberlast?.map((e) => e.felder.length), `Bild ${bild}`).toEqual([11]);
        expect(suche.mock.calls.length, `Bild ${bild}: Aufrufe der Kernsuche`).toBeLessThanOrEqual(1);
      }
      // Kein veraltetes Ergebnis: ohne Station ist der Kunde nicht mehr kalt → kein Stück, keine Vorschau
      haus.ohne_station = true;
      s.neuBerechnen();
      const nach = szene(u);
      expect(nach.ueberlast).toEqual([]);
      expect(nach.ueberlast_vorschau).toBeUndefined();
    }, { uhr: () => z.t });
  });
});
