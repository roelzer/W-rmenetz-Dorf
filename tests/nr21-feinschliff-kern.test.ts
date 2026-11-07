import { describe, expect, it } from 'vitest';
import { KATALOG, type TypId } from '../src/core/katalog';
import { Spiel } from '../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT, neuesSpielMitTutorial } from '../src/core/start';
import { Tutorial } from '../src/core/tutorial';
import type { Feld } from '../src/core/tutorial-vertrag';
import type { Objekt } from '../src/core/typen';

// Tutorial-Feinschliff, Kern (ENTSCHEIDUNGEN 2026-11-07 Punkte (6) und (9), Bestätigung zu DESIGN 13.17.9 F3/F8):
// (9) In Kapitel 3 ist jedes Leitungsfeld außerhalb der Spur und außerhalb des echten Hauptwegs `fremd` – auch Reste nach
//     [Zurück] und unverbundene Stücke. K-a: Der echte Hauptweg ist nie fremd. Rolle und Hausbewertung bleiben wie bisher.
// (6) Die Zielscheibe auf (10|12) bleibt nach dem Wegnehmen stehen, bis das betroffene Haus richtig angeschlossen ist.
// Startdorf (tests/nr21-kern.test.ts Kopf): Heizzentrale 2×2 ab (11|10), Haus 1 auf (9|13), Haus 2 auf (12|14);
// Spur: Haupt (10|11),(10|12) als 32er, Haus 1 (9|12), Haus 2 (10|13),(10|14),(11|14) als 25er.
const T0 = 1_000_000;
const SATZ_EIGENER_ABGANG = 'Nimm das gestreifte Stück mit Zurück oder Radierer weg. Zieh die 25er von der Abzweigung.';
const ZWISCHENSTAND = 'Das erste Haus hat seinen Hausanschluss. Jetzt zieh die 25er zum zweiten Haus.';
const KURZ_WEG = 'Stück muss weg';

type Strich = readonly [TypId, number, number];
const HAUPT: Strich[] = TUTORIAL_HAUPT.map(([x, y]) => ['d32', x, y] as const);
const ANSCHLUSS_1: Strich[] = TUTORIAL_ANSCHLUSS_1.map(([x, y]) => ['d25', x, y] as const);
const ANSCHLUSS_2: Strich[] = TUTORIAL_ANSCHLUSS_2.map(([x, y]) => ['d25', x, y] as const);
const E1: Strich[] = [...HAUPT, ...ANSCHLUSS_1, ...ANSCHLUSS_2];

const hausBei = (s: Spiel, [x, y]: readonly [number, number]): Objekt => {
  const h = s.stand.objekte.find((o) => o.x === x && o.y === y && KATALOG[o.typ].kategorie === 'haus');
  if (!h) throw new Error(`kein Haus bei (${x}|${y})`);
  return h;
};
/** Tutorial-Spiel mit offenem Abschnitt (Planung im Tutorial 10 s, tests/nr13-kern.test.ts test_nr13_tutorial_zeiten). */
function offen(): { s: Spiel; uhr: { t: number } } {
  const uhr = { t: T0 };
  const s = new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);
  s.namenSetzen('Anna', 'Heatville');
  // Startgeld reicht nicht für alle Stücke dieser Tests; Geld-Satz und Geld-Sperre sollen hier nicht greifen.
  s.stand.geld_eur = 30_000;
  expect(s.abschnittPlanen().ok).toBe(true);
  uhr.t += 10_000; s.bis(uhr.t);
  expect(s.stand.abschnitt?.phase).toBe('offen');
  return { s, uhr };
}
function zeichnen(s: Spiel, striche: Strich[]): void {
  for (const [typ, x, y] of striche) expect(s.platzieren(typ, x, y).ok, `${typ} auf (${x}|${y})`).toBe(true);
}
const lageMit = (striche: Strich[]) => { const { s } = offen(); zeichnen(s, striche); return { s, lage: s.tutorialLeitungen() }; };
const hatFeld = (liste: ReadonlyArray<{ x: number; y: number }>, [x, y]: Feld): boolean => liste.some((f) => f.x === x && f.y === y);

describe('Feinschliff Kern (9): Rest-Stück abseits der Spur ist fremd', () => {
  it('test_nr21_rest_stueck_an_heizzentrale: 25er (12|12) unter der Heizzentrale, ohne Haus → fremd, Hausbewertung bleibt', () => {
    const { lage } = lageMit([...HAUPT, ...ANSCHLUSS_1, ['d25', 12, 12]]);
    expect(lage.fremd).toEqual([[12, 12]]);
    expect(lage.fremd_haus).toBeNull();
    expect([lage.haupt_ok, lage.haus1_ok, lage.haus2_ok]).toEqual([true, true, false]);
    expect(hatFeld(lage.felder, [12, 12])).toBe(false);
  });

  it('test_nr21_rest_stueck_unverbunden: einzelnes 25er-Feld ohne Verbindung (14|12) bei voller Spur → fremd, beide Häuser bleiben ok', () => {
    const { lage } = lageMit([...E1, ['d25', 14, 12]]);
    expect(lage.fremd).toEqual([[14, 12]]);
    expect(lage.fremd_haus).toBeNull();
    expect([lage.haupt_ok, lage.haus1_ok, lage.haus2_ok]).toEqual([true, true, true]);
  });

  it('test_nr21_rest_stueck_neben_spur: (8|12) hinter Haus 1 an der Spur → fremd; Haus 1 bleibt ok (Bewertung wie bisher)', () => {
    const { lage } = lageMit([...HAUPT, ['d25', 9, 12], ['d25', 8, 12]]);
    expect(lage.fremd).toEqual([[8, 12]]);
    expect(lage.haus1_ok).toBe(true);
  });

  it('test_nr21_rest_stueck_mehrfach: eigener Abgang zuerst (Hausweg-Reihenfolge), danach Reste aufsteigend, jedes Feld einmal', () => {
    const { lage } = lageMit([...HAUPT, ...ANSCHLUSS_1, ['d25', 12, 12], ['d25', 12, 13], ['d25', 14, 12], ['d25', 15, 12]]);
    // (14|12) = 12·24+14 = 302, (15|12) = 303
    expect(lage.fremd).toEqual([[12, 13], [12, 12], [14, 12], [15, 12]]);
    expect(lage.fremd_haus).toBe(2);
  });

  it('test_nr21_rest_stueck_echter_hauptweg (K-a): Hauptleitung (11|12)→(10|12) ist nie fremd, die Spurfelder auch nicht', () => {
    const { lage } = lageMit([['d32', 11, 12], ['d32', 10, 12], ...ANSCHLUSS_1, ...ANSCHLUSS_2]);
    expect(lage.fremd).toEqual([]);
    expect([lage.haupt_ok, lage.haus1_ok, lage.haus2_ok]).toEqual([true, true, true]);
    const voll = lageMit(E1).lage;
    expect(voll.fremd).toEqual([]);
  });
});

describe('Feinschliff Kern (9): Tutorial-Ablauf mit Rest-Stück', () => {
  it('test_nr21_rest_stueck_sperrt_t14: volle Spur + Stummel (12|12) → T13h, Satz und „Stück muss weg“; Stummel weg → T14', () => {
    const { s } = offen();
    zeichnen(s, [...E1, ['d25', 12, 12]]);
    const t = new Tutorial(s);
    t.zustandPruefen();
    expect(t.ansicht(T0)?.schritt).toBe('T13h');
    expect(t.ansicht(T0)?.text).toBe(SATZ_EIGENER_ABGANG);
    expect(t.ansicht(T0)?.fremd).toEqual([[12, 12]]);
    expect(t.sperre('abschliessen')?.kurz).toBe(KURZ_WEG);
    expect(s.geplanteLeitungEntfernen(12, 12).ok).toBe(true);
    t.zustandPruefen();
    expect(t.ansicht(T0)?.schritt).toBe('T14');
  });
});

describe('Feinschliff Kern (6): Zielscheibe bleibt nach dem Wegnehmen, bis das betroffene Haus richtig angeschlossen ist', () => {
  /** T13h mit Haus 1 richtig und eigenem Abgang (12|12)→(12|13) zu Haus 2; Einstieg aus dem Zustand (fremd → T13h). */
  function mitEigenemAbgang(): { s: Spiel; t: Tutorial } {
    const { s } = offen();
    zeichnen(s, [...HAUPT, ...ANSCHLUSS_1, ['d25', 12, 12], ['d25', 12, 13]]);
    const t = new Tutorial(s);
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', text: SATZ_EIGENER_ABGANG, zielscheibe: [10, 12] });
    return { s, t };
  }

  it('test_nr21_zielscheibe_nach_zurueck: [Zurück] → Rest (12|12) gestreift, Zielscheibe da; Rest weg → Zwischenstand, Zielscheibe bleibt', () => {
    const { s, t } = mitEigenemAbgang();
    expect(s.letzteLeitungZurueck().ok).toBe(true); t.handlung();
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', text: SATZ_EIGENER_ABGANG, fremd: [[12, 12]], zielscheibe: [10, 12] });
    expect(t.sperre('abschliessen')?.kurz).toBe(KURZ_WEG);
    expect(s.geplanteLeitungEntfernen(12, 12).ok).toBe(true); t.handlung();
    const h2 = hausBei(s, ERSTE_HAEUSER[1]);
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', text: ZWISCHENSTAND, fremd: [], zielscheibe: [10, 12], ziel_ring: h2.id });
  });

  it('test_nr21_zielscheibe_weg_wenn_haus2_ok: Spur zu Haus 2 im laufenden Zug → Zielscheibe weg; Haus 2 wieder offen → sie kommt nicht zurück', () => {
    const { s, t } = mitEigenemAbgang();
    expect(s.letzteLeitungZurueck().ok).toBe(true); t.handlung();
    expect(s.geplanteLeitungEntfernen(12, 12).ok).toBe(true); t.handlung();
    // Zug läuft (kein Abheben): T13h bleibt, Haus 2 ist aber schon richtig angeschlossen
    t.zugBeginnt();
    for (const [typ, x, y] of ANSCHLUSS_2) { expect(s.platzieren(typ, x, y).ok).toBe(true); t.schritt({ schritt: 'leitung_gezeichnet' }); }
    expect(s.tutorialLeitungen().haus2_ok).toBe(true);
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', zielscheibe: null });
    // letztes Feld wieder weg: Haus 2 offen, das Stück, das weg musste, ist längst weg → normale Führung ohne Zielscheibe
    expect(s.letzteLeitungZurueck().ok).toBe(true); t.handlung();
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', text: ZWISCHENSTAND, zielscheibe: null });
  });

  it('test_nr21_zielscheibe_normaler_zwischenstand: ohne vorheriges fremdes Stück keine Zielscheibe in T13h', () => {
    const { s } = offen();
    zeichnen(s, [...HAUPT, ...ANSCHLUSS_1]);
    const t = new Tutorial(s);
    t.tipp({ art: 'tipp', tipp: 'farbknopf', typ: 'd25' });
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', text: ZWISCHENSTAND, zielscheibe: null });
  });
});
