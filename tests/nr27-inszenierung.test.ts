import { describe, expect, it } from 'vitest';
import type { Spielstand } from '../src/core/typen';
import { zugLage } from '../src/render/bahn';

// NR27 P5b (DESIGN 14.3/14.8, 14.15 Punkt 9 und 22): Fahrplan des Zugs rein aus der Uhrzeit.
// Werte von Hand aus DESIGN 14.3: 3 Felder/s, Abstand 90–150 s, Gleis 1 (y = −2,28) Ost → West, Gleis 2 (y = −2,72) West → Ost im Wechsel.

const T0 = 1_700_000_000_000;
type Stand = Pick<Spielstand, 'abschnitt'>;
const ohneBau: Stand = { abschnitt: undefined };

/** Fahrten im Zeitraum als [Beginn, Ende] in ms, in 250-ms-Schritten abgetastet. */
function fahrten(von_ms: number, dauer_ms: number, stand: Stand): Array<[number, number]> {
  const r: Array<[number, number]> = [];
  let laeuft = false;
  for (let t = von_ms; t < von_ms + dauer_ms; t += 250) {
    const da = zugLage(t, stand) !== null;
    if (da && !laeuft) r.push([t, t]);
    if (da) r[r.length - 1][1] = t;
    laeuft = da;
  }
  return r;
}

describe('NR27 P5b Zug: Fahrplan aus der Uhrzeit', () => {
  // Fehler, die ihn rot machen: Zufallszahl je Bild, falsches Tempo, Abstand außerhalb 90–150 s, kein Wechsel der Gleise.
  it('test_nr27_zug_fahrplan: Abstände 90–150 s, 3 Felder/s, Gleise im Wechsel, gleiche Uhrzeit = gleiche Lage', () => {
    const f = fahrten(T0, 40 * 60_000, ohneBau);
    expect(f.length).toBeGreaterThanOrEqual(15);
    for (let i = 1; i < f.length; i++) {
      const pause_s = (f[i][0] - f[i - 1][1]) / 1000;
      expect(pause_s, `Pause vor Fahrt ${i}`).toBeGreaterThanOrEqual(89.5);
      expect(pause_s, `Pause vor Fahrt ${i}`).toBeLessThanOrEqual(150.5);
    }
    for (let i = 0; i < f.length; i++) {
      const t = f[i][0] + 2000, a = zugLage(t, ohneBau)!, b = zugLage(t + 1000, ohneBau)!;
      expect(zugLage(t, ohneBau)).toEqual(a);
      expect(Math.abs(b.kopf_x - a.kopf_x)).toBeCloseTo(3, 6);
      expect([-2.28, -2.72]).toContain(a.gleis_y);
      expect(a.richtung, 'Gleis 1 fährt nach Westen, Gleis 2 nach Osten').toBe(a.gleis_y === -2.28 ? -1 : 1);
      expect(b.kopf_x - a.kopf_x > 0 ? 1 : -1).toBe(a.richtung);
      if (i) expect(zugLage(f[i - 1][0] + 2000, ohneBau)!.gleis_y, 'Wechsel').not.toBe(a.gleis_y);
    }
    // Fahrt über 27 Felder plus zwei Wagen à 2 Felder mit 3 Felder/s ≈ 10,3 s
    const dauer_s = (f[1][1] - f[1][0]) / 1000;
    expect(dauer_s).toBeGreaterThan(9.5);
    expect(dauer_s).toBeLessThan(10.6);
  });

  // Fehler, die ihn rot machen: querungImBau wird ignoriert, oder ein schon fahrender Zug verschwindet mitten im Bild.
  it('test_nr27_zug_pause: während eine Querung gebaut wird, startet kein Zug; ein fahrender fährt zu Ende', () => {
    const f = fahrten(T0, 20 * 60_000, ohneBau);
    const bau = (start_ms: number, phase: 'bau' | 'offen' = 'bau', mit_querung = true): Stand => ({
      abschnitt: { phase, bau: { art: 'neu', start_ms, ende_ms: start_ms + 3_600_000 }, ...(mit_querung ? { mit_querung: true as const } : {}) },
    });
    expect(fahrten(T0, 20 * 60_000, bau(T0 - 1000))).toEqual([]);
    const mitten = f[2][0] + 3000;
    expect(zugLage(mitten, bau(mitten - 1000)), 'Fahrt begann vor dem Bau').not.toBeNull();
    expect(fahrten(f[2][1] + 1000, 20 * 60_000, bau(mitten - 1000))).toEqual([]);
    expect(zugLage(mitten, bau(mitten - 10_000, 'bau', false)), 'Abschnitt ohne Querung').not.toBeNull();
    expect(zugLage(mitten, bau(mitten - 10_000, 'offen')), 'Querung geplant, nicht im Bau').not.toBeNull();
  });
});
