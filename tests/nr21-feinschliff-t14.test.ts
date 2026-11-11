import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { laden, serialisieren } from '../src/core/speichern';
import { TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT, neuesSpielMitTutorial } from '../src/core/start';
import { Tutorial } from '../src/core/tutorial';
import { echteSteuerung } from './hilfen/echte-steuerung';
import { ZUG_HAUS1, ZUG_HAUS2, bisT13h, farbknopf, knopfMitId, schritt, st, weiterTippen, wischeFelder, zielEl, type U } from './hilfen/tutorial-zug';

// Feinschliff T14 (ENTSCHEIDUNGEN 2026-11-07, Nachprüfung P5f-1, offener Punkt (1); DESIGN 13.17.9 F3):
// Ab T13h ist jedes Leitungsstück abseits von Spur und Hauptleitung `fremd` und muss weg. T13h → T14 erst, wenn `fremd`
// leer ist – auch dann, wenn beide Häuser schon richtig angeschlossen sind. Hier: 32er-Stummel auf (12|12) direkt unter der
// Heizzentrale (2×2 ab (11|10)), nicht auf der Spur (Haupt (10|11),(10|12); Haus 1 (9|12); Haus 2 (10|13),(10|14),(11|14)).
// Fehler, den diese Tests fangen: Der Schrittwechsel T13h → T14 (src/core/tutorial.ts, abschliessenBereit) prüft `fremd`
// nicht → T14 trotz liegendem Stummel. Der Wortlaut des Satzes wird bewusst nicht festgeschrieben (klärt ein Entwickler).
const T0 = 1_000_000;
const STUMMEL: [number, number] = [12, 12];

/** Tutorial-Spiel mit offenem Abschnitt; 30.000 €, damit die Geld-Sperre nicht greift (wie tests/nr21-feinschliff-kern). */
function offen(): { s: Spiel; uhr: { t: number } } {
  const uhr = { t: T0 };
  const s = new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);
  s.namenSetzen('Anna', 'Heatville');
  s.stand.geld_eur = 30_000;
  expect(s.abschnittPlanen().ok).toBe(true);
  uhr.t += 10_000; s.bis(uhr.t);
  expect(s.stand.abschnitt?.phase).toBe('offen');
  return { s, uhr };
}
/** Speichern und in ein neues Spiel laden – wie Neuladen im Browser (main.ts). */
function neuGeladen(s: Spiel, uhr: { t: number }): Spiel {
  const text = serialisieren(s.stand);
  uhr.t += 1_000;
  const neu = new Spiel(laden(text, uhr.t), () => uhr.t);
  neu.bis(uhr.t);
  return neu;
}
const hatStummel = (fremd: ReadonlyArray<readonly [number, number]> | undefined): boolean =>
  (fremd ?? []).some(([x, y]) => x === STUMMEL[0] && y === STUMMEL[1]);

describe('NR21 Feinschliff T14 (Kern): beide Häuser ok + 32er-Stummel', () => {
  it('test_nr21_t14_stummel_bleibt_t13h: beide Häuser richtig, 32er auf (12|12) → T13h, Abschließen gesperrt, (12|12) gestreift', () => {
    const { s } = offen();
    const t = new Tutorial(s);
    t.tipp({ art: 'tipp', tipp: 'leitungskarte', typ: 'd32' });
    for (const [x, y] of TUTORIAL_HAUPT) { expect(s.platzieren('d32', x, y).ok).toBe(true); t.handlung(); }
    t.tipp({ art: 'tipp', tipp: 'farbknopf', typ: 'd25' });
    expect(t.ansicht(T0)?.schritt).toBe('T13h');
    expect(s.platzieren('d32', ...STUMMEL).ok).toBe(true); t.handlung();
    for (const [x, y] of [...TUTORIAL_ANSCHLUSS_1, ...TUTORIAL_ANSCHLUSS_2]) { expect(s.platzieren('d25', x, y).ok).toBe(true); t.handlung(); }
    t.tipp({ art: 'tipp', tipp: 'abgehoben' });
    const lg = s.tutorialLeitungen();
    expect([lg.haupt_ok, lg.haus1_ok, lg.haus2_ok], 'Ausgangslage: beide Häuser richtig angeschlossen').toEqual([true, true, true]);
    const a = t.ansicht(T0)!;
    expect(a.schritt).toBe('T13h');
    expect(hatStummel(a.fremd), '(12|12) gestreift').toBe(true);
    expect(t.sperre('abschliessen'), 'Abschließen gesperrt').not.toBeNull();
  });

  it('test_nr21_t14_stummel_nach_neuladen: Stand mit Stummel speichern und laden → Wiedereinstieg T13h, (12|12) gestreift, gesperrt, nie T14', () => {
    const { s, uhr } = offen();
    for (const [x, y] of TUTORIAL_HAUPT) expect(s.platzieren('d32', x, y).ok).toBe(true);
    expect(s.platzieren('d32', ...STUMMEL).ok).toBe(true);
    for (const [x, y] of [...TUTORIAL_ANSCHLUSS_1, ...TUTORIAL_ANSCHLUSS_2]) expect(s.platzieren('d25', x, y).ok).toBe(true);
    const neu = neuGeladen(s, uhr);
    const t = new Tutorial(neu, { wiedereinstieg: true });
    expect(t.ansicht(uhr.t)?.wiedereinstieg).toBe(true);
    t.tipp({ art: 'tipp', tipp: 'weiter' });
    const a = t.ansicht(uhr.t)!;
    expect(a.schritt).toBe('T13h');
    expect(hatStummel(a.fremd)).toBe(true);
    expect(t.sperre('abschliessen')).not.toBeNull();
    t.handlung(); t.tipp({ art: 'tipp', tipp: 'abgehoben' });
    expect(t.ansicht(uhr.t)?.schritt, 'auch nach weiterer Handlung kein T14').toBe('T13h');
  });

  it('test_nr21_t14_stummel_weg_dann_t14: Stummel entfernen → T14, Abschließen frei, keine Streifen', () => {
    const { s } = offen();
    const t = new Tutorial(s);
    t.tipp({ art: 'tipp', tipp: 'leitungskarte', typ: 'd32' });
    for (const [x, y] of TUTORIAL_HAUPT) { expect(s.platzieren('d32', x, y).ok).toBe(true); t.handlung(); }
    t.tipp({ art: 'tipp', tipp: 'farbknopf', typ: 'd25' });
    expect(s.platzieren('d32', ...STUMMEL).ok).toBe(true); t.handlung();
    for (const [x, y] of [...TUTORIAL_ANSCHLUSS_1, ...TUTORIAL_ANSCHLUSS_2]) { expect(s.platzieren('d25', x, y).ok).toBe(true); t.handlung(); }
    t.tipp({ art: 'tipp', tipp: 'abgehoben' });
    expect(t.ansicht(T0)?.schritt).toBe('T13h');
    expect(s.geplanteLeitungEntfernen(...STUMMEL).ok).toBe(true); t.handlung(); t.tipp({ art: 'tipp', tipp: 'abgehoben' });
    const a = t.ansicht(T0)!;
    expect(a.schritt).toBe('T14');
    expect(a.fremd).toEqual([]);
    expect(t.sperre('abschliessen')).toBeNull();
  });
});

describe('NR21 Feinschliff T14 (echte Steuerung): Knopfzeile und Wechsel mit echten Gesten', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  const abschliessen = (u: U) => { const k = zielEl(u, 'abschliessen'); expect(k, '[Abschnitt abschließen] im Dokument').not.toBeNull(); return k!; };

  it('test_nr21_t14_stummel_steuerung: 32er-Stummel (12|12) + beide Häuser → T13h, Knopf sperrt (Tippen bleibt ohne Wirkung), Neuladen T13h; Radierer auf (12|12) → T14', async () => {
    const uhr = { t: T0 };
    const spiel = new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);
    await echteSteuerung(spiel, (u) => {
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      farbknopf(u, 'd32').click(); st(u).tick(uhr.t);
      wischeFelder(u, [STUMMEL]); st(u).tick(uhr.t);
      expect(spiel.stand.objekte.some((o) => o.typ === 'd32' && o.x === STUMMEL[0] && o.y === STUMMEL[1]), '32er liegt auf (12|12)').toBe(true);
      farbknopf(u, 'd25').click(); st(u).tick(uhr.t);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, ZUG_HAUS2); st(u).tick(uhr.t);
      const lg = spiel.tutorialLeitungen();
      expect([lg.haus1_ok, lg.haus2_ok]).toEqual([true, true]);
      expect(schritt(u)).toBe('T13h');
      expect(hatStummel(st(u).szene().tutorial_fremd), '(12|12) auf der Karte gestreift').toBe(true);
      abschliessen(u).click(); st(u).tick(uhr.t);
      expect(spiel.stand.abschnitt?.phase, 'gesperrter Knopf schließt nicht ab').toBe('offen');
      expect(schritt(u)).toBe('T13h');
    }, { uhr: () => uhr.t });

    const neu = neuGeladen(spiel, uhr);
    vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; });
    await echteSteuerung(neu, (u) => {
      st(u).tick(uhr.t);
      expect(schritt(u), 'Wiedereinstieg nie T14').not.toBe('T14');
      weiterTippen(u); vi.advanceTimersByTime(2_000); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T13h');
      expect(hatStummel(st(u).szene().tutorial_fremd)).toBe(true);
      abschliessen(u).click(); st(u).tick(uhr.t);
      expect(neu.stand.abschnitt?.phase).toBe('offen');
      knopfMitId(u, 'radierer')!.click(); st(u).tick(uhr.t);
      wischeFelder(u, [STUMMEL]); st(u).tick(uhr.t);
      expect(neu.stand.objekte.some((o) => o.x === STUMMEL[0] && o.y === STUMMEL[1] && o.typ === 'd32'), 'Stummel weg').toBe(false);
      expect(schritt(u)).toBe('T14');
      expect(st(u).szene().tutorial_fremd ?? []).toEqual([]);
    }, { uhr: () => uhr.t });
  });
});
