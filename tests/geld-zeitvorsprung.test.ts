import { describe, expect, it } from 'vitest';
import { Spiel, type Ereignis } from '../src/core/spiel';
import { SPIELMONAT_MS } from '../src/core/katalog';
import { altesStartdorf } from './hilfen/altes-startdorf';

// Spielerbericht 26.11. „seit 3 Tagen kein Geld mehr“, Risiko 1: Die gespeicherte Spielzeit eilt der Geräteuhr voraus
// (z. B. Sicherung von einem Gerät mit Tempo ×10). Vorher stand das Spiel, bis die echte Zeit aufgeholt hatte: keine
// Abrechnung, keine fertigen Bauten. Erwartung: Die Spielzeit wird auf „jetzt“ neu angesetzt, alle Fristen rücken um
// denselben Betrag mit (Restdauer bleibt), Geld und Bauten bleiben, ein Hinweis erscheint.
// Ein Spielmonat dauert 10 Minuten (katalog.ts SPIELMONAT_MS), 3 Tage Vorsprung = 432 Monate ohne Abrechnung.

const T0 = 1_000_000_000_000;
const DREI_TAGE_MS = 3 * 24 * 3600 * 1000;
const hinweise = (s: Spiel): string[] =>
  s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'hinweis' }> => e.art === 'hinweis').map((e) => e.text);

/** Startdorf mit Kessel, dessen gespeicherte Spielzeit 3 Tage vor der Geräteuhr liegt. */
function standMitVorsprung() {
  const zukunft = T0 + DREI_TAGE_MS;
  const stand = altesStartdorf(zukunft);
  const z = { t: zukunft };
  const vorher = new Spiel(stand, () => z.t);
  vorher.ersteQuelleWaehlen('kessel');
  vorher.ereignisse.length = 0;
  // Gerätewechsel: die Uhr steht jetzt 3 Tage früher
  z.t = T0;
  return { stand, z };
}

describe('Risiko 1: Spielzeit-Vorsprung', () => {
  it('Laden mit 3 Tagen Vorsprung: Spielzeit springt auf jetzt, Geld bleibt, Hinweis nennt den Vorsprung', () => {
    const { stand, z } = standMitVorsprung();
    const geld = stand.geld_eur;
    const s = new Spiel(stand, () => z.t);
    s.bis(T0);
    expect(s.stand.zuletzt_ms).toBe(T0);
    expect(s.stand.geld_eur).toBe(geld);
    expect(hinweise(s)).toContain('Spieluhr war 3 Tage voraus – auf jetzt gestellt, Geld und Bauten bleiben');
  });

  it('nach dem Neuansetzen kommt die nächste Monatsabrechnung nach höchstens einem Spielmonat', () => {
    const { stand, z } = standMitVorsprung();
    const s = new Spiel(stand, () => z.t);
    s.bis(T0);
    const monatVorher = s.stand.letzte_abrechnung?.monat;
    // zwei Spielmonate in 10-s-Schritten weiter: mindestens eine neue Abrechnung mit Kunden
    for (let t = T0; t <= T0 + 2 * SPIELMONAT_MS; t += 10_000) { z.t = t; s.bis(t); }
    expect(s.stand.letzte_abrechnung).toBeDefined();
    expect(s.stand.letzte_abrechnung!.monat).not.toBe(monatVorher);
    expect(s.stand.letzte_abrechnung!.kunden).toBe(2);
    expect(s.stand.letzte_abrechnung!.eingang_eur).toBeGreaterThan(0);
  });

  it('laufende Baustelle behält ihre Restdauer (rückt mit) und wird danach fertig', () => {
    const { stand, z } = standMitVorsprung();
    const zukunft = T0 + DREI_TAGE_MS;
    // Baustelle: noch 60 s bis fertig (aus Sicht der gespeicherten Spielzeit)
    const haus = stand.objekte.find((o) => o.typ === 'efh')!;
    haus.bau = { art: 'ausbau', start_ms: zukunft - 30_000, ende_ms: zukunft + 60_000 };
    const stufe = haus.stufe;
    stand.antraege.kessel = { stand: 'wartet', bewilligt_ms: zukunft + 120_000 };
    stand.helfer_pause_bis_ms = { Laura: zukunft + 90_000 };
    const s = new Spiel(stand, () => z.t);
    s.bis(T0);
    const h = s.stand.objekte.find((o) => o.id === haus.id)!;
    expect(h.bau).toEqual({ art: 'ausbau', start_ms: T0 - 30_000, ende_ms: T0 + 60_000 });
    expect(s.stand.antraege.kessel).toEqual({ stand: 'wartet', bewilligt_ms: T0 + 120_000 });
    expect(s.stand.helfer_pause_bis_ms).toEqual({ Laura: T0 + 90_000 });
    z.t = T0 + 60_000; s.bis(z.t);
    expect(h.bau).toBeNull();
    expect(h.stufe).toBe(stufe + 1);
  });

  it('Bauabschnitt und Helferauftrag rücken mit', () => {
    const { stand, z } = standMitVorsprung();
    const zukunft = T0 + DREI_TAGE_MS;
    stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: zukunft - 1000, ende_ms: zukunft + 5000 } };
    const haus = stand.objekte.find((o) => o.typ === 'efh')!;
    haus.upgrade_auftrag = { helfer: 'Laura', ende_ms: zukunft + 7000 };
    stand.innen[0].bau = { art: 'ausbau', start_ms: zukunft - 2000, ende_ms: zukunft + 8000 };
    const s = new Spiel(stand, () => z.t);
    s.bis(T0);
    expect(s.stand.abschnitt?.bau).toEqual({ art: 'neu', start_ms: T0 - 1000, ende_ms: T0 + 5000 });
    expect(s.stand.objekte.find((o) => o.id === haus.id)!.upgrade_auftrag).toEqual({ helfer: 'Laura', ende_ms: T0 + 7000 });
    expect(s.stand.innen[0].bau).toEqual({ art: 'ausbau', start_ms: T0 - 2000, ende_ms: T0 + 8000 });
  });

  it('gleiche Zeit ist kein Vorsprung: kein Hinweis, nichts verschoben', () => {
    const { stand, z } = standMitVorsprung();
    z.t = stand.zuletzt_ms;
    const s = new Spiel(stand, () => z.t);
    const zuletzt = stand.zuletzt_ms;
    s.bis(zuletzt);
    expect(s.stand.zuletzt_ms).toBe(zuletzt);
    expect(hinweise(s).some((t) => t.startsWith('Spieluhr war'))).toBe(false);
  });

  it('kleiner Vorsprung (2 s) wird still neu angesetzt, ohne Hinweis', () => {
    const { stand, z } = standMitVorsprung();
    const jetzt = stand.zuletzt_ms - 2000;
    z.t = jetzt;
    const s = new Spiel(stand, () => z.t);
    s.bis(jetzt);
    expect(s.stand.zuletzt_ms).toBe(jetzt);
    expect(hinweise(s).some((t) => t.startsWith('Spieluhr war'))).toBe(false);
  });

  it('Vorsprung unter einem Tag nennt Stunden', () => {
    const { stand, z } = standMitVorsprung();
    const jetzt = stand.zuletzt_ms - 5 * 3600 * 1000;
    z.t = jetzt;
    const s = new Spiel(stand, () => z.t);
    s.bis(jetzt);
    expect(hinweise(s)).toContain('Spieluhr war 5 Std. voraus – auf jetzt gestellt, Geld und Bauten bleiben');
  });
});
