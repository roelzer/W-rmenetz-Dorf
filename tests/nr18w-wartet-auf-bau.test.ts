import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG, KONSTANTEN, passendeStation } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';
import { abschnittBauen, abschnittOeffnen, ersatzPlanen, objektBei, vorstellen, type Uhr } from './hilfen/nr18';

// NR18-W (Entscheidung Projektleiter 06.11., Weg A): Ein Haus, das nur wegen der Leitung kalt ist, während ein Bauabschnitt
// läuft, und im Netz „wie nach dem Bau“ warm wäre, verliert keine Zufriedenheit. Sonst gilt der Kälte-Abzug wie bisher (A11).
// Aufbau wie Abnahme NR18 (b)/(c): 25er (10|10)…(10|14), (11|14) an die Häuser (12|14) und (9|13); 2 × 10 kW = 20 kW > 15 kW
// der 25er → beide Häuser kalt wegen Leitung. Kündigung unter 20 % (KONSTANTEN.kuendigung_haus_pct); kalt sinkt die
// Zufriedenheit mit Zeitkonstante 90 s auf ein Ziel unter 20 %, nach 900 s Bauzeit ist also jedes kalte Haus gekündigt.

const T0 = 1_000_000_000_000;
const SPUR = [[10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [11, 14]] as const;
const BAUZEIT_S = KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor;

const haus = (s: Spiel, x: number, y: number): Objekt =>
  objektBei(s, x, y, (o) => KATALOG[o.typ].kategorie === 'haus') as Objekt;

/** Ersatz 32er auf (10|10)…(10|13) im offenen Abschnitt: 25 kW tragen die 20 kW beider Häuser. */
function ersatz32(s: Spiel): void {
  for (const [x, y] of SPUR.slice(0, 4)) {
    const l = objektBei(s, x, y, (o) => o.typ === 'd25') as Objekt;
    expect(ersatzPlanen(s, l.id, 'd32').ok).toBe(true);
  }
}

/** Erstes Haus gebaut und warm, dann Station am zweiten Haus → beide kalt wegen Leitung. */
function zweiHaeuserKalt(zusatz: ReadonlyArray<readonly [number, number]> = []): { s: Spiel; z: Uhr; h1: Objekt; h2: Objekt } {
  const z: Uhr = { t: T0 };
  const s = new Spiel(neuerSpielstand(T0), () => z.t);
  expect(abschnittOeffnen(s, z)).toBe(true);
  for (const [x, y] of [...SPUR, ...zusatz]) expect(s.platzieren('d25', x, y).ok).toBe(true);
  const h1 = haus(s, 12, 14), h2 = haus(s, 9, 13);
  expect(s.stationKaufen(h1.id, passendeStation(10).id).ok).toBe(true);
  abschnittBauen(s, z);
  expect(s.netz.warm.has(h1.id), 'Vorbedingung: erstes Haus warm').toBe(true);
  expect(s.stationKaufen(h2.id, 'st_15').ok).toBe(true);
  expect(s.netz.kalt.get(h1.id), 'Vorbedingung: erstes Haus kalt wegen Leitung').toBe('leitung');
  expect(s.netz.kalt.get(h2.id), 'Vorbedingung: zweites Haus kalt wegen Leitung').toBe('leitung');
  return { s, z, h1, h2 };
}

describe('NR18-W: Häuser warten auf den Bau', () => {
  it('test_nr18w_wartet_auf_bau_kuendigt_nicht – 32er als Ersatz im laufenden Abschnitt: keine Kündigung, nach dem Bau warm', () => {
    const { s, z, h1, h2 } = zweiHaeuserKalt();
    expect(abschnittOeffnen(s, z)).toBe(true);
    for (const [x, y] of SPUR.slice(0, 4)) {
      const l = objektBei(s, x, y, (o) => o.typ === 'd25') as Objekt;
      expect(ersatzPlanen(s, l.id, 'd32').ok).toBe(true);
    }
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    const vorher = [h1.zufriedenheit_pct as number, h2.zufriedenheit_pct as number];
    vorstellen(s, z, BAUZEIT_S / 2);
    expect(s.stand.abschnitt?.phase, 'noch im Bau').toBe('bau');
    expect(h1.zufriedenheit_pct as number, 'Haus (12|14) verliert im Bau keine Zufriedenheit').toBeGreaterThanOrEqual(vorher[0]);
    expect(h2.zufriedenheit_pct as number, 'Haus (9|13) verliert im Bau keine Zufriedenheit').toBeGreaterThanOrEqual(vorher[1]);
    vorstellen(s, z, BAUZEIT_S / 2 + 10);
    expect(s.stand.abschnitt, 'Abschnitt gebaut').toBeUndefined();
    expect(h1.gekuendigt).toBeFalsy();
    expect(h2.gekuendigt).toBeFalsy();
    expect(s.netz.warm.has(h1.id) && s.netz.warm.has(h2.id), 'beide warm').toBe(true);
  });

  it('test_nr18w_ohne_abschnitt_abzug_wie_bisher – kalt wegen Leitung ohne laufenden Abschnitt: beide kündigen', () => {
    const { s, z, h1, h2 } = zweiHaeuserKalt();
    expect(s.stand.abschnitt).toBeUndefined();
    vorstellen(s, z, BAUZEIT_S);
    expect(h1.gekuendigt).toBe(true);
    expect(h2.gekuendigt).toBe(true);
  });

  it('test_nr18w_auch_nach_bau_kalt_abzug_wie_bisher – Abschnitt offen, aber ohne Ersatz: beide kündigen', () => {
    const { s, z, h1, h2 } = zweiHaeuserKalt();
    expect(abschnittOeffnen(s, z)).toBe(true);
    vorstellen(s, z, BAUZEIT_S);
    expect(s.stand.abschnitt?.phase, 'Abschnitt läuft noch').toBe('offen');
    expect(h1.gekuendigt).toBe(true);
    expect(h2.gekuendigt).toBe(true);
  });

  // Review W1: Erst ein abgeschlossener Abschnitt ist verbindlich. Offen mit eingezeichnetem Ersatz zählt nicht, sonst bliebe ein
  // nie abgeschlossener Abschnitt ein Dauer-Freibrief. Vorgespult wird die Bauzeit (900 s): 3 Spieltage (≈ 59 s) reichen von
  // etwa 40 % nicht bis unter 20 % (Zeitkonstante 90 s, Ziel unter 20 % braucht gut 180 s).
  it('test_nr18w_offen_mit_ersatz_kuendigt – Abschnitt offen, Ersatz eingezeichnet, nie abgeschlossen: beide kündigen', () => {
    const { s, z, h1, h2 } = zweiHaeuserKalt();
    expect(abschnittOeffnen(s, z)).toBe(true);
    ersatz32(s);
    vorstellen(s, z, BAUZEIT_S);
    expect(s.stand.abschnitt?.phase).toBe('offen');
    expect(h1.gekuendigt).toBe(true);
    expect(h2.gekuendigt).toBe(true);
  });

  it('test_nr18w_bestellen_kuendigt_nicht – Abschnitt abgeschlossen (Phase bestellen) mit Ersatz: keine Kündigung', () => {
    const { s, z, h1, h2 } = zweiHaeuserKalt();
    expect(abschnittOeffnen(s, z)).toBe(true);
    ersatz32(s);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    vorstellen(s, z, BAUZEIT_S);
    expect(s.stand.abschnitt?.phase).toBe('bestellen');
    expect(h1.gekuendigt).toBeFalsy();
    expect(h2.gekuendigt).toBeFalsy();
  });

  // Review W2: Ändert sich das gebaute Netz (hier: Station am dritten Haus (9|15) über die 25er (10|15)), muss das Probe-Netz neu
  // gerechnet werden. 3 × 10 kW = 30 kW > 25 kW der 32er → auch nach dem Bau kalt → Kälte-Abzug wie bisher.
  it('test_nr18w_netz_aendert_sich_im_bau – drittes Haus im Bau: auch nach dem Bau zu dünn → beide kündigen', () => {
    const { s, z, h1, h2 } = zweiHaeuserKalt([[10, 15]]);
    expect(abschnittOeffnen(s, z)).toBe(true);
    ersatz32(s);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    vorstellen(s, z, 10);
    expect(h1.gekuendigt || h2.gekuendigt, 'Vorbedingung: noch keiner gekündigt').toBeFalsy();
    const h3 = haus(s, 9, 15);
    expect(s.stationKaufen(h3.id, passendeStation(10).id).ok).toBe(true);
    vorstellen(s, z, BAUZEIT_S / 2);
    expect(s.stand.abschnitt?.phase, 'noch im Bau').toBe('bau');
    expect(h1.gekuendigt).toBe(true);
    expect(h2.gekuendigt).toBe(true);
  });

  // Review W2: Wieder geöffnet und einen Ersatz wegradiert (gebautes Netz unverändert, nur der Abschnitt) → Probe-Netz neu.
  it('test_nr18w_ersatz_wegradiert_kuendigt – abgeschlossen, wieder geöffnet, Ersatz auf (10|12) entfernt, erneut abgeschlossen: beide kündigen', () => {
    const { s, z, h1, h2 } = zweiHaeuserKalt();
    expect(abschnittOeffnen(s, z)).toBe(true);
    ersatz32(s);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    vorstellen(s, z, 10);
    expect(s.abschnittWiederOeffnen().ok).toBe(true);
    // Ohne Ersatz auf (10|12) bleibt dort die 25er mit 20 kW > 15 kW – auch nach dem Bau zu dünn.
    expect(s.geplanteLeitungEntfernen(10, 12).ok).toBe(true);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    vorstellen(s, z, BAUZEIT_S);
    expect(s.stand.abschnitt?.phase).toBe('bestellen');
    expect(h1.gekuendigt).toBe(true);
    expect(h2.gekuendigt).toBe(true);
  });
});
