import { describe, expect, it } from 'vitest';
import type { TypId } from '../src/core/katalog';
import { Spiel } from '../src/core/spiel';
import { TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT, neuesSpielMitTutorial } from '../src/core/start';
import { Tutorial } from '../src/core/tutorial';

// Review P5f-1 W1, Entscheidung (a) (ENTSCHEIDUNGEN 2026-11-07): Die Rest-Stück-Regel (jedes Leitungsfeld außerhalb von Spur
// und echtem Hauptweg ist fremd) greift erst ab T13h. In T13 und T13w gilt das Verhalten von vor P5f-1: Ein Stück ohne eigenen
// Abgang und ohne Planungsfehler bei beiden Häusern ist dort nicht fremd – kein Abgang-Satz, Finger bleibt, Ring am Farbknopf.
// Der Spielkern (Spiel.tutorialLeitungen) meldet das Rest-Stück weiter; nur das Tutorial blendet es in T13/T13w aus.
// Startdorf (tests/nr21-kern.test.ts Kopf): Heizzentrale 2×2 ab (11|10), Haus 1 auf (9|13), Haus 2 auf (12|14);
// Spur: Haupt (10|11),(10|12) als 32er, Haus 1 (9|12), Haus 2 (10|13),(10|14),(11|14) als 25er.
const T0 = 1_000_000;
const SATZ_EIGENER_ABGANG = 'Nimm das gestreifte Stück mit Zurück oder Radierer weg. Zieh die 25er von der Abzweigung.';
const ZWISCHENSTAND = 'Das erste Haus hat seinen Hausanschluss. Jetzt zieh die 25er zum zweiten Haus.';
const TEXT_T13 = 'Zieh die 32er von der Heizzentrale bis zur Abzweigung. Folge der Spur.';
const KURZ_WEG = 'Stück muss weg';

type Strich = readonly [TypId, number, number];
const HAUPT: Strich[] = TUTORIAL_HAUPT.map(([x, y]) => ['d32', x, y] as const);
const ANSCHLUSS_1: Strich[] = TUTORIAL_ANSCHLUSS_1.map(([x, y]) => ['d25', x, y] as const);
const ANSCHLUSS_2: Strich[] = TUTORIAL_ANSCHLUSS_2.map(([x, y]) => ['d25', x, y] as const);

/** Tutorial-Spiel mit offenem Abschnitt (Planung im Tutorial 10 s, tests/nr13-kern.test.ts test_nr13_tutorial_zeiten). */
function offen(): Spiel {
  const uhr = { t: T0 };
  const s = new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);
  s.namenSetzen('Anna', 'Heatville');
  // Startgeld reicht nicht für alle Stücke dieser Tests; Geld-Satz und Geld-Sperre sollen hier nicht greifen.
  s.stand.geld_eur = 30_000;
  expect(s.abschnittPlanen().ok).toBe(true);
  uhr.t += 10_000; s.bis(uhr.t);
  expect(s.stand.abschnitt?.phase).toBe('offen');
  return s;
}
function zeichnen(s: Spiel, striche: Strich[]): void {
  for (const [typ, x, y] of striche) expect(s.platzieren(typ, x, y).ok, `${typ} auf (${x}|${y})`).toBe(true);
}
/** Ohne Leitung steigt das Tutorial in T12 ein; der Tipp auf die 32er-Karte führt nach T13. */
function inT13(): { s: Spiel; t: Tutorial } {
  const s = offen();
  const t = new Tutorial(s);
  expect(t.ansicht(T0)?.schritt).toBe('T12');
  t.tipp({ art: 'tipp', tipp: 'leitungskarte', typ: 'd32' });
  expect(t.ansicht(T0)?.schritt).toBe('T13');
  return { s, t };
}

describe('Review P5f-1 W1 (a): Rest-Stück-Regel erst ab T13h', () => {
  it('test_w1_t13_stummel: 32er-Stummel (12|12) in T13 → nicht fremd, Grundtext, Finger bleibt, kein „Stück muss weg“', () => {
    const { s, t } = inT13();
    zeichnen(s, [['d32', 12, 12]]);
    t.handlung();
    expect(s.tutorialLeitungen().fremd, 'Testaufbau: der Kern meldet das Rest-Stück').toEqual([[12, 12]]);
    const a = t.ansicht(T0)!;
    expect(a).toMatchObject({ schritt: 'T13', text: TEXT_T13, fremd: [], zielscheibe: [10, 12] });
    expect(a.finger_weg.length).toBeGreaterThan(0);
    expect(t.sperre('abschliessen')?.kurz).not.toBe(KURZ_WEG);
  });

  it('test_w1_t13w_stummel: Hauptleitung fertig, Stummel (12|12) in T13w → nicht fremd, Ring am Farbknopf 25', () => {
    const { s, t } = inT13();
    zeichnen(s, HAUPT);
    t.handlung();
    expect(t.ansicht(T0)?.schritt).toBe('T13w');
    zeichnen(s, [['d32', 12, 12]]);
    t.handlung();
    expect(s.tutorialLeitungen().fremd, 'Testaufbau: der Kern meldet das Rest-Stück').toEqual([[12, 12]]);
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13w', fremd: [], farbknopf_ring: 'd25' });
    expect(t.sperre('abschliessen')?.kurz).not.toBe(KURZ_WEG);
  });

  it('test_w1_umweg_zwei_zuege: (11|12) dann (10|12) – nach dem ersten Zug nichts gestreift, nach dem zweiten T13w', () => {
    const { s, t } = inT13();
    zeichnen(s, [['d32', 11, 12]]);
    t.handlung();
    expect(s.tutorialLeitungen().fremd, 'Testaufbau: (11|12) ist ohne Abzweig noch kein Hauptweg').toEqual([[11, 12]]);
    const a = t.ansicht(T0)!;
    expect(a).toMatchObject({ schritt: 'T13', text: TEXT_T13, fremd: [] });
    expect(a.finger_weg.length).toBeGreaterThan(0);
    zeichnen(s, [['d32', 10, 12]]);
    t.handlung();
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13w', fremd: [] });
  });

  // Früher mit dem Vierer-Ring (11|13) (Aufteilung). Seit main 859dda7 lehnt der Kern Ringe ab; derselbe Fall „beide Häuser ok
  // und ein Planungsfehler“ entsteht ohne Ring mit einem Engpass-Stummel (10|10) 25er → (10|9) 32er (tests/nr21-kern.test.ts
  // test_nr21_fremd_planungsfehler_sortiert).
  it('test_w1_t13_planungsfehler_bleibt: im laufenden Zug in T13 volle Spur + Engpass-Stummel (10|10),(10|9) → beide Häuser ok mit Planungsfehler, gestreift wie vor P5f-1', () => {
    const { s, t } = inT13();
    t.zugBeginnt();
    for (const [typ, x, y] of [...HAUPT, ...ANSCHLUSS_1, ...ANSCHLUSS_2, ['d25', 10, 10] as const, ['d32', 10, 9] as const]) {
      expect(s.platzieren(typ, x, y).ok, `${typ} auf (${x}|${y})`).toBe(true);
      t.schritt({ schritt: 'leitung_gezeichnet' });
    }
    const lg = s.tutorialLeitungen();
    expect([lg.haus1_ok, lg.haus2_ok, lg.planungsfehler, lg.fremd_haus], 'Testaufbau (tests/nr21-kern.test.ts Engpass-Stummel)').toEqual([true, true, true, null]);
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13', text: SATZ_EIGENER_ABGANG, fremd: [[10, 9], [10, 10]], finger_weg: [] });
    expect(t.sperre('abschliessen')?.kurz).toBe(KURZ_WEG);
  });

  it('test_w1_t13h_stummel_bleibt_fremd: derselbe Stummel ab T13h → gestreift, Abgang-Satz, „Stück muss weg“', () => {
    const { s, t } = inT13();
    zeichnen(s, HAUPT);
    t.handlung();
    t.tipp({ art: 'tipp', tipp: 'farbknopf', typ: 'd25' });
    expect(t.ansicht(T0)?.schritt).toBe('T13h');
    zeichnen(s, [['d32', 12, 12]]);
    t.handlung();
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', text: SATZ_EIGENER_ABGANG, fremd: [[12, 12]], finger_weg: [] });
    expect(t.sperre('abschliessen')?.kurz).toBe(KURZ_WEG);
  });
});

describe('Review P5f-1 K3: Zielscheibe nur nach einem eigenen Abgang', () => {
  it('test_k3_reiner_stummel_weg: Stummel ohne Haus (12|12) in T13h weg → keine Zielscheibe', () => {
    const s = offen();
    zeichnen(s, [...HAUPT, ...ANSCHLUSS_1, ['d25', 12, 12]]);
    const t = new Tutorial(s);
    expect(s.tutorialLeitungen().fremd_haus, 'Testaufbau: kein Haus hängt am Stummel').toBeNull();
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', text: SATZ_EIGENER_ABGANG, fremd: [[12, 12]], zielscheibe: [10, 12] });
    expect(s.geplanteLeitungEntfernen(12, 12).ok).toBe(true);
    t.handlung();
    expect(t.ansicht(T0)).toMatchObject({ schritt: 'T13h', text: ZWISCHENSTAND, fremd: [], zielscheibe: null });
  });
});
