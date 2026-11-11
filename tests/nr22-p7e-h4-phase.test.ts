// P7e H4 (DESIGN 13.17.11): Zeile „Wird im Bauabschnitt durch eine … ersetzt.“ und [Ersatz zurücknehmen] entfallen, solange das
// Blatt den Zustand „Wird auf … vergrößert“ zeigt – das ist nicht nur im offenen Abschnitt so, sondern auch nach „Abschnitt
// abschließen“ bis zur Bestellung. Im Bau heißt der Zustand „Wird gerade vergrößert“; dort bleibt die Zeile wie bisher.
// Lage wie tests/nr22-p7e.test.ts (H3/H4): 25er von (10|10) über (10|9) bis (3|7), 11 Felder, Reihenhaus (4|7) mit 16 kW → ein Stück, empfohlen 32er.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KONSTANTEN, istLeitung, passendeStation } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import type { Spiel } from '../src/core/spiel';
import type { Objekt } from '../src/core/typen';
import type { El } from './hilfen/dom-attrappe';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import { abschnittOeffnen, objektBei, vorstellen, type Uhr } from './hilfen/nr18';
import { leeresDorf } from './hilfen/nr22';

const T0 = 1_000_000_000_000;
const WEG: ReadonlyArray<[number, number]> = [[10, 10], [10, 9], [9, 9], [8, 9], [7, 9], [6, 9], [5, 9], [4, 9], [3, 9], [3, 8], [3, 7]];
// \s umfasst auch das geschützte Leerzeichen
const norm = (t: string): string => t.replace(/\s+/g, ' ').trim();
const leitung = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => istLeitung(o.typ))!;
const mit = (u: EchteUmgebung, anfang: string): El[] => u.knoepfe().filter((k) => k.isConnected && norm(k.textContent).startsWith(anfang));
const blatt = (u: EchteUmgebung): El => u.dom.html.querySelectorAll('.blatt').filter((b) => b.isConnected)[0];
const titel = (u: EchteUmgebung): string => (blatt(u).querySelectorAll('.kasten')
  .find((k) => norm(k.querySelector('h3')?.textContent ?? '') === 'Überlastet')?.children ?? []).map((c) => norm(c.textContent))[1];
const ZEILE_32 = 'Wird im Bauabschnitt durch eine 32er ersetzt.';

/** Gebautes überlastetes Stück, alle 11 Felder mit 32er-Ersatz geplant, Abschnitt danach abgeschlossen (Phase „bestellen“). */
function geplantAbgeschlossen(): { s: Spiel; z: Uhr } {
  const d = leeresDorf(T0);
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  for (const [x, y] of WEG) expect(d.s.platzieren('d25', x, y).ok).toBe(true);
  const h = objektBei(d.s, 4, 7, (o) => !istLeitung(o.typ))!;
  expect(d.s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
  expect(d.s.abschnittAbschliessen().ok).toBe(true);
  expect(d.s.materialBestellen().ok).toBe(true);
  vorstellen(d.s, d.z, KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  expect(d.s.ueberlastStuecke().map((e) => [e.felder.length, e.empfohlen]), 'Testaufbau').toEqual([[11, 'd32']]);
  for (const [x, y] of WEG) expect(d.s.ersatzPlanen(leitung(d.s, x, y).id, 'd32').ok).toBe(true);
  expect(d.s.abschnittAbschliessen().ok).toBe(true);
  expect(d.s.abschnitt?.phase, 'Testaufbau: Phase nach dem Abschließen').toBe('bestellen');
  return d;
}

describe('P7e H4: Feldzeile auch nach dem Abschließen weg, im Bau wie bisher', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  // Fehler, der ihn rot macht: H4 nur im offenen Abschnitt – nach dem Abschließen stünde unter „Wird auf 32er vergrößert“
  // noch einmal „Wird im Bauabschnitt durch eine 32er ersetzt.“
  it('test_h4_phase_bestellen: alle 32er, Abschnitt abgeschlossen → Titel „Wird auf 32er vergrößert“, keine Feldzeile, kein Knopf', async () => {
    const { s, z } = geplantAbgeschlossen();
    await echteSteuerung(s, (u) => {
      u.st.kontext(leitung(s, 8, 9).id);
      expect(titel(u)).toBe('Wird auf 32er vergrößert');
      expect(norm(blatt(u).textContent)).not.toContain(ZEILE_32);
      expect(mit(u, 'Ersatz zurücknehmen')).toHaveLength(0);
    }, { uhr: () => z.t });
  });

  // Fehler, der ihn rot macht: H4 auch im Bau – dort heißt der Zustand „Wird gerade vergrößert“, die Zeile bleibt.
  it('test_h4_phase_bau: alle 32er, Material bestellt → Titel „Wird gerade vergrößert“, Feldzeile bleibt', async () => {
    const { s, z } = geplantAbgeschlossen();
    expect(s.materialBestellen().ok).toBe(true);
    expect(s.abschnitt?.phase, 'Testaufbau').toBe('bau');
    await echteSteuerung(s, (u) => {
      u.st.kontext(leitung(s, 8, 9).id);
      expect(titel(u)).toBe('Wird gerade vergrößert');
      expect(norm(blatt(u).textContent)).toContain(ZEILE_32);
    }, { uhr: () => z.t });
  });
});
