import { describe, expect, it } from 'vitest';
import { KATALOG, KONSTANTEN, type TypId } from '../src/core/katalog';
import { FREISCHALTUNGEN } from '../src/core/freischaltung';
import { berechneNetz } from '../src/core/netz';
import { Spiel } from '../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT, neuesSpielMitTutorial, neuerSpielstand } from '../src/core/start';
import { tutorialLeitungsLage } from '../src/core/tutorial-netz';
import type { Feld, TutorialLeitungsLage } from '../src/core/tutorial-vertrag';
import type { Objekt, Spielstand } from '../src/core/typen';
import { mitKatalog } from './hilfen/katalog';
import { abschnittBauen, abschnittOeffnen, vorstellen, type Uhr } from './hilfen/nr18';

// Bauplan docs/bauplaene/NR20-22.md Fassung 2.3, P1 (E2, E3). Erwartungen von Hand aus dem Startdorf hergeleitet:
// Heizzentrale 2×2 ab (11|10), Haus 1 auf (9|13), Haus 2 auf (12|14); EFH 15.000 kWh/a → 7,5 kW mit Puffer (2.000 h),
// 10 kW ohne (1.500 h); 25er trägt 15 kW, 32er 25 kW, 40er 40 kW; Aufstockung × 1,4 (KONSTANTEN.aufstockung_faktor).
// Welche Felder an welchem Nachbarn hängen, belegt die Probe im Bauplan §2 (und die Probe zu (11|12) im Auftrag des PL).
const T0 = 1_000_000;
const N = KONSTANTEN.feldanzahl;

const istHaus = (o: Objekt): boolean => KATALOG[o.typ].kategorie === 'haus';
const hausBei = (st: Spielstand, [x, y]: readonly [number, number]): Objekt => {
  const h = st.objekte.find((o) => o.x === x && o.y === y && istHaus(o));
  if (!h) throw new Error(`kein Haus bei (${x}|${y})`);
  return h;
};

function tutorialSpiel(): { s: Spiel; z: Uhr; h1: Objekt; h2: Objekt } {
  const z = { t: T0 };
  const s = new Spiel(neuesSpielMitTutorial(T0), () => z.t);
  s.namenSetzen('Anna', 'Heatville');
  const [h1, h2] = ERSTE_HAEUSER.map((k) => hausBei(s.stand, k));
  return { s, z, h1, h2 };
}
/** Planung im Tutorial dauert 10 s; danach ist der Abschnitt offen und Leitungen werden eingezeichnet. */
function tutorialOffen(): ReturnType<typeof tutorialSpiel> {
  const t = tutorialSpiel();
  expect(t.s.abschnittPlanen().ok).toBe(true);
  t.z.t += 10_000; t.s.bis(t.z.t);
  expect(t.s.stand.abschnitt?.phase).toBe('offen');
  return t;
}
type Strich = readonly [TypId, number, number];
const HAUPT: Strich[] = TUTORIAL_HAUPT.map(([x, y]) => ['d32', x, y] as const);
const ANSCHLUSS_1: Strich[] = TUTORIAL_ANSCHLUSS_1.map(([x, y]) => ['d25', x, y] as const);
const ANSCHLUSS_2: Strich[] = TUTORIAL_ANSCHLUSS_2.map(([x, y]) => ['d25', x, y] as const);
const E1: Strich[] = [...HAUPT, ...ANSCHLUSS_1, ...ANSCHLUSS_2];
const mit = (liste: Strich[], x: number, y: number, typ: TypId): Strich[] => liste.map((l) => (l[1] === x && l[2] === y ? [typ, x, y] as const : l));

function zeichnen(s: Spiel, striche: Strich[]): void {
  for (const [typ, x, y] of striche) expect(s.platzieren(typ, x, y).ok, `${typ} auf (${x}|${y})`).toBe(true);
}
function lageMit(striche: Strich[]): { s: Spiel; lage: TutorialLeitungsLage; h1: Objekt; h2: Objekt; z: Uhr } {
  const t = tutorialOffen();
  zeichnen(t.s, striche);
  return { ...t, lage: t.s.tutorialLeitungen() };
}
/** Netz wie das Probe-Netz im Spiel (ohne geplanten Ersatz, den diese Tests nicht nutzen). */
const netzVon = (s: Spiel) => berechneNetz(s.stand.objekte, s.stand.innen, s.stand.preisstufe, s.vorlauf_c, s.grundgebuehr_eur);
const nr = (x: number, y: number): number => y * N + x;
const anschlussFeld = (s: Spiel, h: Objekt): Feld | null => {
  const a = netzVon(s).anschluss.get(h.id);
  return a && a.feld >= 0 ? [a.feld % N, Math.floor(a.feld / N)] : null;
};
const spurFeld = (lage: TutorialLeitungsLage, x: number, y: number) => lage.spur.find((f) => f.x === x && f.y === y);
const kurz = (lage: TutorialLeitungsLage) => ({
  haupt_ok: lage.haupt_ok, haus1_ok: lage.haus1_ok, haus2_ok: lage.haus2_ok, haupt_zu_duenn: lage.haupt_zu_duenn,
  anschluss_zu_dick: lage.anschluss_zu_dick, planungsfehler: lage.planungsfehler, fremd: lage.fremd, fremd_haus: lage.fremd_haus,
});
const ALLES_OK = { haupt_ok: true, haus1_ok: true, haus2_ok: true, haupt_zu_duenn: false, anschluss_zu_dick: false, planungsfehler: false, fremd: [], fremd_haus: null };

describe('NR21 P1 Kern: Werte (E2)', () => {
  it('test_nr21_werte: Startdorf-Werte, zwei verschiedene Häuser, W1 wirft', () => {
    const { s, h1, h2 } = tutorialSpiel();
    // toEqual: genau diese sieben Felder, kein überzähliges (leitung/kap_kw sind entfernt)
    expect(s.tutorialWerte()).toEqual({ kessel_kw: 60, kwh: 15_000, kw_ohne: 10, kw_puffer: 7.5, kw_summe: 15, haupt: 'd32', anschluss: 'd25' });
    // Zwei verschiedene Häuser: Haus 2 aufgestockt → 7,5 × 1,4 = 10,5 kW; Summe 7,5 + 10,5 = 18 kW; kw_puffer bleibt Haus 1.
    h2.aufgestockt = true;
    const w2 = s.tutorialWerte();
    expect(w2.kw_puffer).toBeCloseTo(7.5, 9);
    expect(w2.kw_summe).toBeCloseTo(18, 9);
    expect([w2.haupt, w2.anschluss]).toEqual(['d32', 'd25']);
    // Umgekehrt nur Haus 1 aufgestockt: kw_puffer 10,5, kw_ohne 10 × 1,4 = 14, kwh 21.000, Summe wieder 18.
    h2.aufgestockt = false; h1.aufgestockt = true;
    const w1 = s.tutorialWerte();
    expect(w1.kw_puffer).toBeCloseTo(10.5, 9);
    expect(w1.kw_ohne).toBeCloseTo(14, 9);
    expect(w1.kwh).toBeCloseTo(21_000, 6);
    expect(w1.kw_summe).toBeCloseTo(18, 9);
    h1.aufgestockt = false;
    // W1: die 32er trägt nur 14 kW < 15 kW Summe
    mitKatalog('d32', 'kapazitaet_kw', 14, () => { expect(() => s.tutorialWerte()).toThrow(/Hauptleitung/); });
    // W1: die 25er trägt nur 7 kW < 7,5 kW → anschluss wäre die 32er = haupt
    mitKatalog('d25', 'kapazitaet_kw', 7, () => { expect(() => s.tutorialWerte()).toThrow(/Hausanschluss/); });
    // W1 auf der Grenze: 25er trägt so viel wie die 32er (25 kW) → nicht dünner → wirft
    mitKatalog('d25', 'kapazitaet_kw', 25, () => { expect(() => s.tutorialWerte()).toThrow(/Hausanschluss/); });
    // Genau auf der Grenze: EFH 25.000 kWh → 12,5 kW je Haus, Summe 25 kW = 32er → erlaubt (W1 verlangt „<“), 25er trägt 12,5 kW
    mitKatalog('efh', 'verbrauch_kwh_a', 25_000, () => { expect(s.tutorialWerte()).toMatchObject({ kw_summe: 25, haupt: 'd32', anschluss: 'd25' }); });
  });

  it('test_nr21_w1_32er_gesperrt: ist die 32er nicht freigeschaltet, wirft tutorialWerte', () => {
    const { s } = tutorialSpiel();
    const f = FREISCHALTUNGEN as Record<string, number | undefined>;
    const alt = f.d32;
    f.d32 = 2;
    try { expect(() => s.tutorialWerte()).toThrow(/32er/); } finally { if (alt === undefined) delete f.d32; else f.d32 = alt; }
    expect(s.tutorialWerte().haupt).toBe('d32');
  });

  it('test_nr21_w2_freigeschaltete_duennere_leitung: eine freigeschaltete Leitung dünner als der Anschluss → wirft (W2)', () => {
    const { s } = tutorialSpiel();
    // Die 40er (ab Stufe 1 frei) trägt künstlich nur 5 kW < 15 kW der 25er: Es gäbe „Hausanschluss zu dünn“.
    mitKatalog('d40', 'kapazitaet_kw', 5, () => { expect(() => s.tutorialWerte()).toThrow(/dünner/); });
  });

  it('test_nr21_w2_duennste_leitung: im echten Katalog ist keine Leitung dünner als der Hausanschluss', () => {
    const { s } = tutorialSpiel();
    const anschluss_kw = KATALOG[s.tutorialWerte().anschluss].kapazitaet_kw as number;
    const duenner = Object.entries(KATALOG).filter(([, d]) => d.kategorie === 'netz' && (d.kapazitaet_kw as number) < anschluss_kw).map(([id]) => id);
    expect(duenner).toEqual([]);
  });
});

describe('NR21 P1 Kern: Rollenprüfung (E3)', () => {
  it('test_nr21_rollen_spur_richtig: E1 komplett → alles ok, Rollen und Spur richtig', () => {
    const { lage } = lageMit(E1);
    expect(kurz(lage)).toEqual(ALLES_OK);
    expect(lage.felder).toEqual([
      { x: 10, y: 11, rolle: 'haupt', typ: 'd32', richtig: true },
      { x: 9, y: 12, rolle: 'anschluss', typ: 'd25', richtig: true },
      { x: 10, y: 12, rolle: 'haupt', typ: 'd32', richtig: true },
      { x: 10, y: 13, rolle: 'anschluss', typ: 'd25', richtig: true },
      { x: 10, y: 14, rolle: 'anschluss', typ: 'd25', richtig: true },
      { x: 11, y: 14, rolle: 'anschluss', typ: 'd25', richtig: true },
    ]);
    expect(lage.spur).toEqual([
      { x: 10, y: 11, stueck: 'haupt', belegt: 'd32', richtig: true },
      { x: 10, y: 12, stueck: 'haupt', belegt: 'd32', richtig: true },
      { x: 9, y: 12, stueck: 'haus1', belegt: 'd25', richtig: true },
      { x: 10, y: 13, stueck: 'haus2', belegt: 'd25', richtig: true },
      { x: 10, y: 14, stueck: 'haus2', belegt: 'd25', richtig: true },
      { x: 11, y: 14, stueck: 'haus2', belegt: 'd25', richtig: true },
    ]);
  });

  it('test_nr21_haus1_ueber_vorbeilaufende: Haupt + Anschluss 2 ohne (9|12) → Haus 1 an (10|13) zählt nicht', () => {
    const { s, h1, lage } = lageMit([...HAUPT, ...ANSCHLUSS_2]);
    expect(anschlussFeld(s, h1)).toEqual([10, 13]);
    expect(kurz(lage)).toEqual({ ...ALLES_OK, haus1_ok: false, planungsfehler: true });
    expect(lage.felder.find((f) => f.x === 10 && f.y === 13)?.rolle).toBe('anschluss');
  });

  it('test_nr21_haus2_vor_haus1: (a) nur (10|13) → Haus 1; (b) + Rest Haus 2 → Haus 2; (c) + (9|12) → beide', () => {
    const { s } = tutorialOffen();
    zeichnen(s, [...HAUPT, ['d25', 10, 13]]);
    const a = s.tutorialLeitungen();
    expect([a.haus1_ok, a.haus2_ok, a.haupt_zu_duenn]).toEqual([true, false, false]);
    zeichnen(s, [['d25', 10, 14], ['d25', 11, 14]]);
    const b = s.tutorialLeitungen();
    expect([b.haus1_ok, b.haus2_ok, b.haupt_zu_duenn]).toEqual([false, true, false]);
    zeichnen(s, ANSCHLUSS_1);
    const c = s.tutorialLeitungen();
    expect([c.haus1_ok, c.haus2_ok, c.haupt_zu_duenn, c.planungsfehler]).toEqual([true, true, false, false]);
  });

  it('test_nr21_haupt_zu_duenn: (10|11) als 25er → Hauptleitung zu dünn', () => {
    const { lage } = lageMit(mit(E1, 10, 11, 'd25'));
    expect([lage.haupt_ok, lage.haupt_zu_duenn]).toEqual([false, true]);
    expect(lage.felder.find((f) => f.x === 10 && f.y === 11)).toEqual({ x: 10, y: 11, rolle: 'haupt', typ: 'd25', richtig: false });
    expect(spurFeld(lage, 10, 11)?.richtig).toBe(false);
  });

  it('test_nr21_anschluss_zu_dick: (10|14) als 32er → Haus 2 nicht ok, Anschluss zu dick', () => {
    const { lage } = lageMit(mit(E1, 10, 14, 'd32'));
    expect([lage.haus2_ok, lage.anschluss_zu_dick, lage.haus1_ok, lage.haupt_ok]).toEqual([false, true, true, true]);
    expect(spurFeld(lage, 10, 14)).toEqual({ x: 10, y: 14, stueck: 'haus2', belegt: 'd32', richtig: false });
  });

  it('test_nr21_stummel_ohne_rolle: zusätzlich (10|10) als 25er → Häuser unverändert ok, Stummel ohne Rolle, aber fremd; weg → alles ok', () => {
    // DESIGN 13.17.9 F3 (ENTSCHEIDUNGEN 2026-11-07): In Kapitel 3 ist jede Leitung außerhalb von Spur und echtem Hauptweg fremd.
    const { s, lage } = lageMit([...E1, ['d25', 10, 10]]);
    expect(kurz(lage)).toEqual({ ...ALLES_OK, fremd: [[10, 10]] });
    expect(lage.felder.some((f) => f.x === 10 && f.y === 10)).toBe(false);
    expect(s.geplanteLeitungEntfernen(10, 10).ok).toBe(true);
    expect(kurz(s.tutorialLeitungen())).toEqual(ALLES_OK);
  });

  it('test_nr21_neben_der_spur: (a) Haus 1 über (8|13); (b) Haus 2 über (12|13), leere Spurfelder nicht richtig', () => {
    const a = lageMit([...HAUPT, ['d25', 9, 12], ['d25', 8, 12], ['d25', 8, 13], ...ANSCHLUSS_2]);
    expect(anschlussFeld(a.s, a.h1)).toEqual([8, 13]);
    expect([a.lage.haus1_ok, a.lage.haus2_ok]).toEqual([true, true]);
    const b = lageMit([...HAUPT, ['d25', 9, 12], ['d25', 10, 13], ['d25', 11, 13], ['d25', 12, 13]]);
    expect(anschlussFeld(b.s, b.h2)).toEqual([12, 13]);
    expect([b.lage.haus1_ok, b.lage.haus2_ok]).toEqual([true, true]);
    expect(spurFeld(b.lage, 10, 14)).toEqual({ x: 10, y: 14, stueck: 'haus2', belegt: null, richtig: false });
    expect(spurFeld(b.lage, 11, 14)).toEqual({ x: 11, y: 14, stueck: 'haus2', belegt: null, richtig: false });
  });

  it('test_nr21_eigener_abgang: (a)–(e) eigener Abgang zu Haus 2 über (12|12),(12|13)', () => {
    const abgang: Strich[] = [['d25', 12, 12], ['d25', 12, 13]];
    const fremd: Feld[] = [[12, 13], [12, 12]];
    const a = lageMit([...HAUPT, ...ANSCHLUSS_1, ...abgang]);
    expect(anschlussFeld(a.s, a.h2)).toEqual([12, 13]);
    expect(kurz(a.lage)).toEqual({ ...ALLES_OK, haus2_ok: false, planungsfehler: true, fremd, fremd_haus: 2 });
    const b = lageMit([...HAUPT, ...ANSCHLUSS_1, ['d32', 12, 12], ['d32', 12, 13]]);
    expect(kurz(b.lage)).toEqual({ ...ALLES_OK, haus2_ok: false, planungsfehler: true, fremd, fremd_haus: 2 });
    const c = lageMit([...HAUPT, ...abgang]);
    expect(kurz(c.lage)).toEqual({ ...ALLES_OK, haus1_ok: false, haus2_ok: false, planungsfehler: false, fremd, fremd_haus: 2 });
    const d = lageMit([...HAUPT, ...ANSCHLUSS_1, ...abgang, ...ANSCHLUSS_2]);
    expect(anschlussFeld(d.s, d.h2)).toEqual([12, 13]);
    expect(kurz(d.lage)).toEqual({ ...ALLES_OK, haus2_ok: false, planungsfehler: false, fremd, fremd_haus: 2 });
    // (e) DESIGN 13.17.9 F3: nach dem Wegnehmen von (12|13) bleibt der Rest (12|12) fremd (kein Hausweg mehr → fremd_haus null)
    expect(a.s.geplanteLeitungEntfernen(12, 13).ok).toBe(true);
    expect(kurz(a.s.tutorialLeitungen())).toEqual({ ...ALLES_OK, haus2_ok: false, planungsfehler: true, fremd: [[12, 12]] });
    expect(a.s.geplanteLeitungEntfernen(12, 12).ok).toBe(true);
    expect(kurz(a.s.tutorialLeitungen())).toEqual({ ...ALLES_OK, haus2_ok: false, planungsfehler: true });
  });

  it('test_nr21_eigener_abgang_spalte_11: Abgang über Spalte 11, auch mit umgehängtem Abzweig ein eigener Abgang', () => {
    const { s, lage } = lageMit([...HAUPT, ...ANSCHLUSS_1, ['d25', 11, 12], ['d25', 11, 13], ['d25', 11, 14]]);
    expect(kurz(lage)).toEqual({ ...ALLES_OK, haus2_ok: false, planungsfehler: true, fremd: [[11, 13], [11, 12]], fremd_haus: 2 });
    // Kritiker-Fall: (10|12) hängt an (11|12) statt an (10|11). Der eigene Abgang zu Haus 2 bleibt derselbe (K-b);
    // (11|12) liegt jetzt auf dem echten Hauptweg und ist darum nie fremd (Fassung 2.3 K-a), aber als 25er dort zu dünn.
    const netz = netzVon(s);
    expect(netz.eltern.get(nr(10, 12))).toBe(nr(10, 11));
    const umgehaengt = { ...netz, eltern: new Map(netz.eltern).set(nr(10, 12), nr(11, 12)) };
    const [h1, h2] = ERSTE_HAEUSER.map((k) => hausBei(s.stand, k));
    const rein = tutorialLeitungsLage(umgehaengt, s.stand.objekte, h1.id, h2.id, 'd32', 'd25');
    expect(kurz(rein)).toEqual({
      haupt_ok: false, haus1_ok: false, haus2_ok: false, haupt_zu_duenn: true, anschluss_zu_dick: false,
      planungsfehler: true, fremd: [[11, 13]], fremd_haus: 2,
    });
  });

  it('test_nr21_vorbeilaufend_eigenes_spurfeld: Haupt + (9|12),(8|12) → Haus 1 an (9|12) ok; + Anschluss 2 → kein Planungsfehler', () => {
    // (8|12) liegt abseits der Spur → fremd (DESIGN 13.17.9 F3), zählt aber nicht als eigener Abgang (kein Hausweg darüber).
    const { s, h1, lage } = lageMit([...HAUPT, ['d25', 9, 12], ['d25', 8, 12]]);
    expect(anschlussFeld(s, h1)).toEqual([9, 12]);
    expect([lage.haus1_ok, lage.planungsfehler, lage.fremd, lage.fremd_haus]).toEqual([true, true, [[8, 12]], null]);
    zeichnen(s, ANSCHLUSS_2);
    expect(kurz(s.tutorialLeitungen())).toEqual({ ...ALLES_OK, fremd: [[8, 12]] });
    expect(s.geplanteLeitungEntfernen(8, 12).ok).toBe(true);
    expect(kurz(s.tutorialLeitungen())).toEqual(ALLES_OK);
  });

  it('test_nr21_vierer_ring_fremd: E1 + (11|13) → beide ok, Planungsfehler, fremd nur (11|13); Gegenproben ohne fremd', () => {
    const { lage } = lageMit([...E1, ['d25', 11, 13]]);
    expect(kurz(lage)).toEqual({ ...ALLES_OK, planungsfehler: true, fremd: [[11, 13]] });
    const z1 = lageMit([...HAUPT, ...ANSCHLUSS_1]).lage;
    expect([z1.planungsfehler, z1.fremd, z1.fremd_haus]).toEqual([true, [], null]);
    const z2 = lageMit([...HAUPT, ...ANSCHLUSS_2]).lage;
    expect([z2.planungsfehler, z2.fremd, z2.fremd_haus]).toEqual([true, [], null]);
    // K-a: Hauptleitung (11|12)→(10|12) als 32er; (11|12) liegt auf dem echten Hauptweg
    const ka = lageMit([['d32', 11, 12], ['d32', 10, 12], ...ANSCHLUSS_1, ...ANSCHLUSS_2]);
    expect(netzVon(ka.s).eltern.get(nr(10, 12))).toBe(nr(11, 12));
    expect(kurz(ka.lage)).toEqual(ALLES_OK);
  });

  it('test_nr21_fremd_planungsfehler_sortiert: mehrere Fehlerfelder abseits der Spur → nach Feldnummer, ohne Spurfelder', () => {
    // Vierer-Ring (Aufteilung (10|13),(11|13),(10|14)) plus Stummel (10|10) 25er → (10|9) 32er (Engpass (10|9),(10|10)).
    const { s, lage } = lageMit([...E1, ['d25', 11, 13], ['d25', 10, 10], ['d32', 10, 9]]);
    const netz = netzVon(s);
    expect([...netz.engpass].sort((p, q) => p - q)).toEqual([nr(10, 9), nr(10, 10)]);
    expect(kurz(lage)).toEqual({ ...ALLES_OK, planungsfehler: true, fremd: [[10, 9], [10, 10], [11, 13]] });
    // Zwischenstand (Haus 2 fehlt) mit demselben Stummel: Der zweite Teil von fremd greift nur, wenn beide Häuser ok sind –
    // seit DESIGN 13.17.9 F3 ist der Stummel abseits der Spur aber trotzdem fremd (dritter Teil), sortiert nach Feldnummer.
    const zw = lageMit([...HAUPT, ...ANSCHLUSS_1, ['d25', 10, 10], ['d32', 10, 9]]).lage;
    expect([zw.planungsfehler, zw.haus2_ok, zw.fremd, zw.fremd_haus]).toEqual([true, false, [[10, 9], [10, 10]], null]);
  });

  it('test_nr21_zweite_verbindung_11_12: volle Spur + 25er/32er auf (11|12) → was die Lage liefert (Probe PL)', () => {
    // Probe: Mit 25er auf (11|12) hängt (10|12) wieder an (10|11) (A91 hängt an den dickeren Nachbarn), (11|12) ist ein
    // Stummel an der Heizzentrale ohne Planungsfehler. Mit 32er auf (11|12) hängt (10|12) an (11|12), (10|11) wird der Stummel.
    // DESIGN 13.17.9 F3: der 25er-Stummel (11|12) liegt abseits von Spur und echtem Hauptweg → fremd, bis er weg ist.
    const d25 = lageMit([...E1, ['d25', 11, 12]]);
    expect(netzVon(d25.s).eltern.get(nr(10, 12))).toBe(nr(10, 11));
    expect(kurz(d25.lage)).toEqual({ ...ALLES_OK, fremd: [[11, 12]] });
    expect(d25.lage.felder.some((f) => f.x === 11 && f.y === 12)).toBe(false);
    expect(d25.s.geplanteLeitungEntfernen(11, 12).ok).toBe(true);
    expect(kurz(d25.s.tutorialLeitungen())).toEqual(ALLES_OK);
    const d32 = lageMit([...E1, ['d32', 11, 12]]);
    expect(netzVon(d32.s).eltern.get(nr(10, 12))).toBe(nr(11, 12));
    expect(kurz(d32.lage)).toEqual(ALLES_OK);
    expect(d32.lage.felder.find((f) => f.x === 11 && f.y === 12)).toEqual({ x: 11, y: 12, rolle: 'haupt', typ: 'd32', richtig: true });
    expect(d32.lage.felder.some((f) => f.x === 10 && f.y === 11)).toBe(false);
  });

  it('test_nr21_planungsfehler: Zwischenstand wahr, E1 falsch, E1 + Stummel falsch, Engpass wahr', () => {
    expect(lageMit([...HAUPT, ...ANSCHLUSS_1]).lage.planungsfehler).toBe(true);
    expect(lageMit(E1).lage.planungsfehler).toBe(false);
    expect(lageMit([...E1, ['d25', 10, 10]]).lage.planungsfehler).toBe(false);
    expect(lageMit([['d25', 10, 11], ['d32', 10, 12]]).lage.planungsfehler).toBe(true);
  });

  it('test_nr21_gleichstand_zwei_enden: 32er auf (10|13) + 25er (9|12) → Haus 1 an (9|12), (10|13) nicht richtig', () => {
    const { s, h1, lage } = lageMit([...HAUPT, ['d32', 10, 13], ['d25', 9, 12]]);
    expect(anschlussFeld(s, h1)).toEqual([9, 12]);
    expect(lage.haus1_ok).toBe(true);
    expect(spurFeld(lage, 10, 13)?.richtig).toBe(false);
  });

  it('test_nr21_nur_10_13: nur (10|13) → Haus 1 ok; mit (10|14) nicht mehr', () => {
    const { s, lage } = lageMit([...HAUPT, ['d25', 10, 13]]);
    expect(lage.haus1_ok).toBe(true);
    zeichnen(s, [['d25', 10, 14]]);
    expect(s.tutorialLeitungen().haus1_ok).toBe(false);
  });

  it('test_nr21_spur_b1_nach_bau: E1 einzeichnen, Stationen, bauen → beide warm, kein Planungsfehler, Haus 1 an (9|12)', () => {
    const { s, z, h1, h2, lage } = lageMit(E1);
    expect(kurz(lage)).toEqual(ALLES_OK);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.stationKaufen(h1.id, 'hp_800').ok).toBe(true);
    expect(s.stationKaufen(h2.id, 'hp_800').ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    vorstellen(s, z, 20);
    expect(s.stand.abschnitt).toBeUndefined();
    expect(s.netz.warm.has(h1.id) && s.netz.warm.has(h2.id)).toBe(true);
    expect([...s.netz.kapazitaet_ok.values()].every(Boolean)).toBe(true);
    expect([s.netz.engpass.size, s.netz.reduzierung.size, s.netz.aufteilung.size]).toEqual([0, 0, 0]);
    expect(s.netz.anschluss.get(h1.id)?.feld).toBe(nr(9, 12));
    expect(kurz(s.tutorialLeitungen())).toEqual(ALLES_OK);
  });
});

describe('NR21 P1 Kern: Randfälle', () => {
  it('test_nr21_abzweig_nicht_verbunden: ohne Leitung bzw. mit losem (9|12) → alles false, keine Rollen', () => {
    const leer = lageMit([]).lage;
    expect(kurz(leer)).toEqual({ ...ALLES_OK, haupt_ok: false, haus1_ok: false, haus2_ok: false });
    expect(leer.felder).toEqual([]);
    expect(leer.spur.map((f) => [f.belegt, f.richtig])).toEqual(Array(6).fill([null, false]));
    const lose = lageMit([['d25', 9, 12]]).lage;
    expect(kurz(lose)).toEqual({ ...ALLES_OK, haupt_ok: false, haus1_ok: false, haus2_ok: false });
    expect(lose.felder).toEqual([]);
  });

  it('test_nr21_beide_eigener_abgang: fremd = Felder Haus 1, dann Haus 2; fremd_haus 1', () => {
    const { lage } = lageMit([['d25', 10, 11], ['d25', 9, 11], ['d25', 9, 12], ['d25', 12, 12], ['d25', 12, 13]]);
    expect(lage.fremd).toEqual([[9, 11], [12, 13], [12, 12]]);
    expect(lage.fremd_haus).toBe(1);
    expect([lage.haupt_ok, lage.haus1_ok, lage.haus2_ok]).toEqual([false, false, false]);
  });

  it('test_nr21_beide_eigener_abgang_geteilt: gemeinsame Felder stehen nur einmal in fremd', () => {
    // Haus 1 hängt an (10|13) (Leitungsende), Haus 2 an (12|13); beide Hauswege laufen über (12|13),(12|12).
    const { s, h1, h2, lage } = lageMit([['d25', 12, 12], ['d25', 12, 13], ['d25', 11, 13], ['d25', 10, 13]]);
    expect([anschlussFeld(s, h1), anschlussFeld(s, h2)]).toEqual([[10, 13], [12, 13]]);
    expect(lage.fremd).toEqual([[10, 13], [11, 13], [12, 13], [12, 12]]);
    expect(lage.fremd_haus).toBe(1);
  });

  it('test_nr21_fremd_vorrang_vor_rolle: E1 + (11|13),(12|13) → fremd ohne Rolle, Hausbewertung unverändert', () => {
    // Haus 2 hängt jetzt an (12|13) (Leitungsende); sein gezählter Hausweg (12|13),(11|13),(10|13),Abzweig gäbe (11|13) und
    // (12|13) die Rolle Anschluss. Beide Felder sind aber Planungsfehler abseits der Spur → fremd hat Vorrang (Entscheidung PL).
    const { s, h2, lage } = lageMit([...E1, ['d25', 11, 13], ['d25', 12, 13]]);
    expect(anschlussFeld(s, h2)).toEqual([12, 13]);
    expect(kurz(lage)).toEqual({ ...ALLES_OK, planungsfehler: true, fremd: [[11, 13], [12, 13]] });
    expect(lage.felder).toEqual([
      { x: 10, y: 11, rolle: 'haupt', typ: 'd32', richtig: true },
      { x: 9, y: 12, rolle: 'anschluss', typ: 'd25', richtig: true },
      { x: 10, y: 12, rolle: 'haupt', typ: 'd32', richtig: true },
      { x: 10, y: 13, rolle: 'anschluss', typ: 'd25', richtig: true },
    ]);
  });

  it('test_nr21_gemeinsamer_hausweg_haupt: (10|13),(10|14) auf beiden gezählten Hauswegen → Rolle haupt, als 25er zu dünn', () => {
    // Haus 1 an (9|14), Haus 2 an (11|14), beide Leitungsenden; beide Hauswege laufen über (10|14),(10|13) zum Abzweig.
    const { s, h1, h2, lage } = lageMit([...HAUPT, ['d25', 10, 13], ['d25', 10, 14], ['d25', 11, 14], ['d25', 9, 14]]);
    expect([anschlussFeld(s, h1), anschlussFeld(s, h2)]).toEqual([[9, 14], [11, 14]]);
    // (9|14) liegt abseits der Spur → fremd (DESIGN 13.17.9 F3); fremd hat Vorrang, die Hausbewertung bleibt wie sie ist.
    expect(kurz(lage)).toEqual({ ...ALLES_OK, haupt_ok: false, haus1_ok: false, haus2_ok: false, haupt_zu_duenn: true, planungsfehler: true, fremd: [[9, 14]] });
    expect(lage.felder.find((f) => f.x === 10 && f.y === 13)).toEqual({ x: 10, y: 13, rolle: 'haupt', typ: 'd25', richtig: false });
    expect(lage.felder.find((f) => f.x === 10 && f.y === 14)).toEqual({ x: 10, y: 14, rolle: 'haupt', typ: 'd25', richtig: false });
    // Spur prüft nach der Rolle, nicht nach dem Spurstück: (10|13),(10|14) sind Stück haus2, aber hier Hauptleitung.
    expect(spurFeld(lage, 10, 13)).toEqual({ x: 10, y: 13, stueck: 'haus2', belegt: 'd25', richtig: false });
    expect(spurFeld(lage, 10, 14)).toEqual({ x: 10, y: 14, stueck: 'haus2', belegt: 'd25', richtig: false });
    expect(spurFeld(lage, 11, 14)).toEqual({ x: 11, y: 14, stueck: 'haus2', belegt: 'd25', richtig: true });
  });

  it('test_nr21_fremd_fehler_auf_hauptweg: Planungsfehler auf dem echten Hauptweg abseits der Spur → nicht fremd (K-a)', () => {
    // K-a-Netz: Hauptleitung über (11|12); dazu künstlich ein Engpass auf (11|12). Beide Häuser bleiben ok.
    const { s, h1, h2 } = lageMit([['d32', 11, 12], ['d32', 10, 12], ...ANSCHLUSS_1, ...ANSCHLUSS_2]);
    const netz = netzVon(s);
    expect(netz.eltern.get(nr(10, 12))).toBe(nr(11, 12));
    const mitEngpass = { ...netz, engpass: new Set([nr(11, 12)]) };
    const rein = tutorialLeitungsLage(mitEngpass, s.stand.objekte, h1.id, h2.id, 'd32', 'd25');
    expect(kurz(rein)).toEqual({ ...ALLES_OK, planungsfehler: true });
  });

  it('test_nr21_haus_fehlt: fehlt ein Tutorial-Haus, wirft die Prüfung (wie heute)', () => {
    const { s, h2 } = tutorialOffen();
    const netz = netzVon(s);
    const h1 = hausBei(s.stand, ERSTE_HAEUSER[0]);
    const ohne = s.stand.objekte.filter((o) => o !== h2);
    expect(() => tutorialLeitungsLage(netz, ohne, h1.id, h2.id, 'd32', 'd25')).toThrow(/Haus/);
    s.stand.objekte = ohne;
    expect(() => s.tutorialLeitungen()).toThrow(/kein Haus/);
  });
});

describe('NR21 P1 Kern: letzteLeitungFeld', () => {
  it('test_nr21_letzte_leitung_feld: zuletzt gezeichnet, nach Zurück, außerhalb offen null, Ersatz zählt mit', () => {
    const { s } = tutorialSpiel();
    expect(s.letzteLeitungFeld()).toBeNull(); // kein Abschnitt
    const t = tutorialOffen();
    expect(t.s.letzteLeitungFeld()).toBeNull(); // offen, aber keine Leitung
    zeichnen(t.s, [['d25', 9, 12], ['d25', 12, 13]]);
    expect(t.s.letzteLeitungFeld()).toEqual([12, 13]);
    expect(t.s.letzteLeitungZurueck().ok).toBe(true);
    expect(t.s.letzteLeitungFeld()).toEqual([9, 12]);

    // Ersatz: gebaute 25er auf (14|12) bekommt nach einer neu gezeichneten Leitung einen 32er-Ersatz → sie ist die letzte.
    const z = { t: T0 };
    const alt = new Spiel(neuerSpielstand(T0), () => z.t);
    expect(abschnittOeffnen(alt, z)).toBe(true);
    zeichnen(alt, [['d25', 13, 11], ['d25', 14, 11]]);
    expect(abschnittBauen(alt, z).bestellen.ok).toBe(true);
    expect(alt.stand.abschnitt).toBeUndefined();
    expect(alt.letzteLeitungFeld()).toBeNull(); // kein offener Abschnitt
    expect(abschnittOeffnen(alt, z)).toBe(true);
    zeichnen(alt, [['d25', 15, 11]]);
    const gebaut = alt.stand.objekte.find((o) => o.x === 13 && o.y === 11 && !o.geplant)!;
    expect(alt.ersatzPlanen(gebaut.id, 'd32').ok).toBe(true);
    expect(alt.letzteLeitungFeld()).toEqual([13, 11]);
    expect(alt.letzteLeitungZurueck().ok).toBe(true);
    expect(gebaut.ersatz).toBeUndefined();
    expect(alt.letzteLeitungFeld()).toEqual([15, 11]);
  });

  it('test_nr21_letzte_leitung_feld_nach_abschliessen: Phase bestellen → null, Zurück nimmt nichts', () => {
    const { s } = lageMit(E1);
    expect(s.letzteLeitungFeld()).toEqual([11, 14]);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.stand.abschnitt?.phase).toBe('bestellen');
    const vorher = s.stand.objekte.length;
    expect(s.letzteLeitungFeld()).toBeNull();
    expect(s.letzteLeitungZurueck().ok).toBe(false);
    expect(s.stand.objekte.length).toBe(vorher);
  });
});
