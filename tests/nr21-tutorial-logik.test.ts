import { describe, expect, it } from 'vitest';
import { neuesSpielMitTutorial } from '../src/core/start';
import type { TypId } from '../src/core/katalog';
import type { Objekt, Spielstand } from '../src/core/typen';
import type { Bedienung, TutorialAnsicht, TutorialLeitungsLage, TutorialSchrittId, TutorialWerte } from '../src/core/tutorial-vertrag';
import { einstieg, Tutorial, type TutorialLage } from '../src/core/tutorial';

// Bauplan docs/bauplaene/NR20-22.md Fassung 2.3, Paket P2: Schrittlogik T12–T14 mit der Leitungslage als Attrappe.
// Erwartete Texte wörtlich aus Bauplan E8 (= DESIGN 13.17.2 / 13.17.8), Zahlen von Hand: 15 kW = 2 × 7,5 kW Puffer-Bedarf.
const T0 = 1_000_000_000_000;
const NB = ' ';
const WERTE: TutorialWerte = { kessel_kw: 60, kwh: 15000, kw_ohne: 10, kw_puffer: 7.5, kw_summe: 15, haupt: 'd32', anschluss: 'd25' };

const TEXT = {
  T12: 'Fertig geplant! Zuerst die **Hauptleitung**: Nimm die dicke 32er, sie trägt die Wärme für beide Häuser.',
  T13: 'Zieh die 32er von der Heizzentrale bis zur Abzweigung. Folge der Spur.',
  T13w: `Bis hier fließen 15${NB}kW für beide Häuser, ab hier **je Haus nur** 7,5${NB}kW. Dafür reicht die 25er.`,
  T13h: 'Jedes Haus bekommt seinen eigenen **Hausanschluss**. Zieh die 25er bis ans erste Haus.',
  zwischenstand: 'Das erste Haus hat seinen Hausanschluss. Jetzt zieh die 25er zum zweiten Haus.',
  T14: 'Beide Häuser sind erreicht. Tippe auf Abschnitt abschließen.',
  zuDuenn: 'Hier fließt Wärme für beide Häuser, die 25er wäre randvoll. Nimm die 32er und zieh drüber.',
  zuDick: 'Für ein Haus reicht die 25er. Tippe auf 25 und zieh noch mal über dieses Stück.',
  groesse: 'Ein Stück passt nicht zum Plan. Zieh mit der richtigen Größe noch mal drüber.',
  eigenerAbgang: 'Nimm das gestreifte Stück mit Zurück oder Radierer weg. Zieh die 25er von der Abzweigung.',
  hilfeSpur: 'Leg den Finger auf das leuchtende Feld und zieh ihn die Spur entlang.',
  hilfeT13w: 'Tippe rechts in der Leiste auf 25.',
  zuFrueh: 'Zieh die Leitung bis an beide Häuser – folge der Spur.',
  leisteOffen: 'Die Leiste bleibt offen, bis beide Häuser erreicht sind.',
  geld: 'Dann reicht dein Geld nicht mehr für die Stationen. Nimm mit Zurück ein paar Leitungen weg.',
};
const GELD = { kurz: 'Geld reicht nicht', satz: TEXT.geld };
const WEG = { kurz: 'Stück muss weg', satz: TEXT.eigenerAbgang };
const GROESSE = { kurz: 'Größe passt nicht', satz: TEXT.groesse };
const EINS = { kurz: `noch 1${NB}Haus fehlt`, satz: TEXT.zuFrueh };
const ZWEI = { kurz: `2${NB}Häuser fehlen`, satz: TEXT.zuFrueh };

type Stueck = 'haupt' | 'haus1' | 'haus2';
const SPUR: ReadonlyArray<readonly [number, number, Stueck]> = [
  [10, 11, 'haupt'], [10, 12, 'haupt'], [9, 12, 'haus1'], [10, 13, 'haus2'], [10, 14, 'haus2'], [11, 14, 'haus2'],
];
interface Ziel { haupt?: boolean; haus1?: boolean; haus2?: boolean }
/** Richtige Stücke liegen in Sollgröße, die übrigen Spurfelder sind leer; `extra` überschreibt einzelne Felder. */
function lage(z: Ziel = {}, extra: Partial<TutorialLeitungsLage> = {}): TutorialLeitungsLage {
  const ok: Record<Stueck, boolean> = { haupt: !!z.haupt, haus1: !!z.haus1, haus2: !!z.haus2 };
  const soll = (s: Stueck): TypId => (s === 'haupt' ? 'd32' : 'd25');
  return {
    haupt_ok: ok.haupt, haus1_ok: ok.haus1, haus2_ok: ok.haus2, haupt_zu_duenn: false, anschluss_zu_dick: false,
    planungsfehler: false, fremd: [], fremd_haus: null,
    felder: SPUR.filter(([, , s]) => ok[s]).map(([x, y, s]) => ({ x, y, rolle: s === 'haupt' ? 'haupt' as const : 'anschluss' as const, typ: soll(s), richtig: true })),
    spur: SPUR.map(([x, y, stueck]) => ({ x, y, stueck, belegt: ok[stueck] ? soll(stueck) : null, richtig: ok[stueck] })),
    ...extra,
  };
}
/** Ein Spurfeld mit falscher Größe: in `felder` und `spur` auf `typ`, nicht richtig. */
function falsch(basis: TutorialLeitungsLage, x: number, y: number, typ: TypId, extra: Partial<TutorialLeitungsLage>): TutorialLeitungsLage {
  const hier = (f: { x: number; y: number }): boolean => f.x === x && f.y === y;
  const rolle = y <= 12 && x === 10 ? 'haupt' as const : 'anschluss' as const;
  const felder = basis.felder.some(hier) ? basis.felder.map((f) => (hier(f) ? { ...f, typ, richtig: false } : f))
    : [...basis.felder, { x, y, rolle, typ, richtig: false }];
  return { ...basis, felder, spur: basis.spur.map((f) => (hier(f) ? { ...f, belegt: typ, richtig: false } : f)), ...extra };
}
const zuDuenn = (extra: Partial<TutorialLeitungsLage> = {}): TutorialLeitungsLage =>
  falsch(lage({ haupt: true }), 10, 11, 'd25', { haupt_ok: false, haupt_zu_duenn: true, ...extra });
const zuDick = (extra: Partial<TutorialLeitungsLage> = {}): TutorialLeitungsLage =>
  falsch(lage({ haupt: true, haus1: true, haus2: true }), 10, 14, 'd32', { haus2_ok: false, anschluss_zu_dick: true, ...extra });
/** P1 `test_nr21_eigener_abgang` (a): Haus 1 richtig, Haus 2 über (12|12)→(12|13), Reduzierung → Planungsfehler. */
const ABGANG: Partial<TutorialLeitungsLage> = { fremd: [[12, 13], [12, 12]], fremd_haus: 2, planungsfehler: true };
/** P1 `test_nr21_vierer_ring_fremd` [2.3]: beide Häuser richtig, Stummel (11|13) → Aufteilung, fremd ohne Haus. */
const RING: Partial<TutorialLeitungsLage> = { fremd: [[11, 13]], fremd_haus: null, planungsfehler: true };
const ALLE: Ziel = { haupt: true, haus1: true, haus2: true };

interface Testlage extends TutorialLage {
  stand: Spielstand; netz: { warm: Set<number> }; spielerName: string; geldFehlt: number; werte: TutorialWerte;
  leitungen: TutorialLeitungsLage; leitungenGelesen: number;
}
function lageBauen(name = 'Chef', werte: TutorialWerte = WERTE): Testlage {
  const stand = neuesSpielMitTutorial(T0);
  stand.namen_gefragt = true;
  stand.tutorial = { kapitel: 3 };
  stand.abschnitt = { phase: 'offen', bau: null };
  return {
    stand, netz: { warm: new Set<number>() }, spielerName: name, geldFehlt: 0, werte, leitungen: lage(), leitungenGelesen: 0,
    erreichteHaeuser() { return []; },
    tutorialWerte() { return this.werte; },
    tutorialLeitungen() { this.leitungenGelesen++; return this.leitungen; },
    tutorialGeldFehlt_eur() { return this.geldFehlt; },
    tutorialKapitelSetzen(k: number) { this.stand.tutorial = { kapitel: k }; },
    tutorialBeenden() { delete this.stand.tutorial; },
  };
}
const haus = (l: Testlage, x: number, y: number): Objekt => l.stand.objekte.find((o) => o.x === x && o.y === y && o.typ === 'efh')!;
const h1 = (l: Testlage): number => haus(l, 9, 13).id;
const h2 = (l: Testlage): number => haus(l, 12, 14).id;
const jetzt = (t: Tutorial): TutorialSchrittId => t.ansicht(T0)!.schritt;
const an = (t: Tutorial): TutorialAnsicht => t.ansicht(T0)!;
const farbknopf = (t: Tutorial, typ: TypId): void => t.tipp({ art: 'tipp', tipp: 'farbknopf', typ });
const abheben = (t: Tutorial): void => t.tipp({ art: 'tipp', tipp: 'abgehoben' });
const strich = (t: Tutorial): void => t.schritt({ schritt: 'leitung_gezeichnet', objekt_id: 77 });
function setze(l: Testlage, t: Tutorial, neu: TutorialLeitungsLage): void { l.leitungen = neu; t.zustandPruefen(); }

/** Phase offen ohne Leitung → T12; Tipp auf die 32er → T13. */
function inT13(l: Testlage = lageBauen()): [Tutorial, Testlage] {
  const t = new Tutorial(l);
  expect(jetzt(t)).toBe('T12');
  t.tipp({ art: 'tipp', tipp: 'leitungskarte', typ: 'd32' });
  expect(jetzt(t)).toBe('T13');
  return [t, l];
}
function inT13w(l: Testlage = lageBauen()): [Tutorial, Testlage] {
  const [t] = inT13(l);
  setze(l, t, lage({ haupt: true }));
  expect(jetzt(t)).toBe('T13w');
  return [t, l];
}
function inT13h(l: Testlage = lageBauen()): [Tutorial, Testlage] {
  const [t] = inT13w(l);
  farbknopf(t, 'd25');
  expect(jetzt(t)).toBe('T13h');
  return [t, l];
}
function inT14(l: Testlage = lageBauen()): [Tutorial, Testlage] {
  const [t] = inT13h(l);
  setze(l, t, lage(ALLE));
  expect(jetzt(t)).toBe('T14');
  return [t, l];
}

describe('NR21 Tutorial-Schrittlogik (Bauplan NR20-22 P2)', () => {
  it('test_nr21_t13_wechsel_erst_beim_abheben – haupt_ok mitten im Zug bleibt T13, Abheben → T13w', () => {
    const [t, l] = inT13();
    strich(t);
    l.leitungen = lage({ haupt: true });
    strich(t);
    t.zustandPruefen();
    expect(jetzt(t)).toBe('T13');
    abheben(t);
    expect(jetzt(t)).toBe('T13w');
  });

  it('test_nr21_t13_ohne_zug_sofort – haupt_ok beim Eintritt (Neuladen, Radierer) → gleich T13w', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    l.leitungen = lage({ haupt: true });
    t.tipp({ art: 'tipp', tipp: 'leitungskarte', typ: 'd32' });
    expect(jetzt(t)).toBe('T13w');
    // Abheben in T12 (kein Zug) lässt T12 stehen; ohne Hauptleitung wartet T13.
    const [t2, l2] = inT13();
    abheben(t2);
    expect(jetzt(t2)).toBe('T13');
    l2.leitungen = lage({ haupt: true });
    t2.handlung();
    expect(jetzt(t2)).toBe('T13w');
  });

  it('test_nr21_t13w_nur_mit_farbknopf_anschluss – andere Größe, ohne Typ oder andere Tipps schalten nicht', () => {
    const [t] = inT13w();
    farbknopf(t, 'd32');
    t.tipp({ art: 'tipp', tipp: 'farbknopf' });
    farbknopf(t, 'd40');
    abheben(t);
    t.tipp({ art: 'tipp', tipp: 'leitungskarte', typ: 'd25' });
    expect(jetzt(t)).toBe('T13w');
    farbknopf(t, 'd25');
    expect(jetzt(t)).toBe('T13h');
  });

  it('test_nr21_t13w_zeichnen_ruht – nur T13w ruht das Zeichnen, Leiste behält die 32er, Ring am 25er-Knopf', () => {
    const [t] = inT13w();
    expect(an(t)).toMatchObject({ zeichnen_ruht: true, zeichenleiste: { typ: 'd32' }, farbknopf_ring: 'd25', finger: 'tippen' });
    farbknopf(t, 'd25');
    expect(an(t)).toMatchObject({ zeichnen_ruht: false, zeichenleiste: { typ: 'd25' } });
    const [t13] = inT13();
    expect(an(t13).zeichnen_ruht).toBe(false);
  });

  it('test_nr21_t13h_zu_t14 – beide Häuser ohne Planungsfehler, Geld reicht, nach dem Abheben [2.3]', () => {
    const [t, l] = inT13h();
    strich(t);
    setze(l, t, lage(ALLE));
    expect(jetzt(t)).toBe('T13h');
    abheben(t);
    expect(jetzt(t)).toBe('T14');
    // Planungsfehler oder Geldmangel halten T13h fest
    const [u, m] = inT13h();
    setze(m, u, lage(ALLE, { planungsfehler: true }));
    expect(jetzt(u)).toBe('T13h');
    m.geldFehlt = 1;
    setze(m, u, lage(ALLE));
    expect(jetzt(u)).toBe('T13h');
    m.geldFehlt = 0;
    u.zustandPruefen();
    expect(jetzt(u)).toBe('T14');
  });

  it('test_nr21_zurueck_nach_t13 – aus T13w, T13h und T14 bei !haupt_ok', () => {
    for (const geh of [inT13w, inT13h, inT14]) {
      const [t, l] = geh();
      setze(l, t, lage({ haus1: true, haus2: true }));
      expect(an(t)).toMatchObject({ schritt: 'T13', text: TEXT.T13, zeichenleiste: { typ: 'd32' } });
    }
  });

  it('test_nr21_t13h_abschliessen_gesperrt_bis_beide – Fachprüfer-Muss', () => {
    const [t, l] = inT13h();
    setze(l, t, lage({ haupt: true, haus1: true }));
    expect(t.sperre('abschliessen')!.kurz).toBe(`noch 1${NB}Haus fehlt`);
    setze(l, t, lage({ haupt: true, haus2: true }));
    expect(t.sperre('abschliessen')!.kurz).toBe(`noch 1${NB}Haus fehlt`);
    setze(l, t, lage(ALLE));
    expect(t.sperre('abschliessen')).toBeNull();
  });

  it('test_nr21_zustandpruefen_t13w_t13h – Lage wechselt ohne Ereignis → zustandPruefen springt', () => {
    for (const geh of [inT13w, inT13h]) {
      const [t, l] = geh();
      l.leitungen = zuDuenn();
      expect(jetzt(t)).not.toBe('T13');
      t.zustandPruefen();
      expect(jetzt(t)).toBe('T13');
    }
  });

  it('test_nr21_t13w_immer_erklaersatz – Größe, Geld, Zwischenstand und eigener Abgang verdrängen den Erklärsatz nicht (B5, K3)', () => {
    const [t, l] = inT13w();
    l.geldFehlt = 100;
    setze(l, t, falsch(lage({ haupt: true, haus1: true }), 10, 13, 'd32', { anschluss_zu_dick: true }));
    expect(an(t)).toMatchObject({ schritt: 'T13w', text: TEXT.T13w });
    setze(l, t, lage({ haupt: true, haus1: true }, ABGANG));
    expect(an(t).text).toBe(TEXT.T13w);
    setze(l, t, lage({ haupt: true, haus1: true }));
    expect(an(t).text).toBe(TEXT.T13w);
    for (let i = 0; i < 3; i++) t.tipp({ art: 'tipp', tipp: 'daneben' });
    expect(an(t).text).toBe(TEXT.hilfeT13w);
    t.gesperrtGetippt('abschliessen');
    expect(an(t).text).toBe(TEXT.geld);
    // gleiche Lage in T13h → Geld-Satz, ohne Geldmangel „Hausanschluss zu dick“
    const [u, m] = inT13h();
    m.geldFehlt = 100;
    setze(m, u, falsch(lage({ haupt: true, haus1: true }), 10, 13, 'd32', { anschluss_zu_dick: true }));
    expect(an(u).text).toBe(TEXT.geld);
    m.geldFehlt = 0;
    expect(an(u).text).toBe(TEXT.zuDick);
  });

  it('test_nr21_eigener_abgang_logik – Satz, Streifen, Zielscheibe, Ring Haus 2, Sperre „Stück muss weg“, kein T14', () => {
    const [t, l] = inT13h();
    setze(l, t, lage({ haupt: true, haus1: true }, ABGANG));
    const a = an(t);
    expect(a).toMatchObject({
      schritt: 'T13h', text: TEXT.eigenerAbgang, fremd: [[12, 13], [12, 12]], zielscheibe: [10, 12], ziel_ring: h2(l),
      naechstes_feld: [10, 13], finger_weg: [], erreicht_ids: [h1(l)],
    });
    expect(a.band.map((f) => [f.x, f.y, f.aktiv])).toEqual([[10, 13, true], [10, 14, true], [11, 14, true]]);
    expect(t.sperre('abschliessen')).toEqual(WEG);
    abheben(t);
    t.handlung();
    expect(jetzt(t)).toBe('T13h');
    // Geld geht vor
    l.geldFehlt = 1;
    expect(an(t).text).toBe(TEXT.geld);
    l.geldFehlt = 0;
    // zusätzlich Hauptleitung zu dünn → Rücksprung T13, Satz eigener Abgang vor dem Größen-Satz (K4)
    setze(l, t, falsch(lage({ haupt: true, haus1: true }, ABGANG), 10, 11, 'd25', { haupt_ok: false, haupt_zu_duenn: true }));
    expect(an(t)).toMatchObject({ schritt: 'T13', text: TEXT.eigenerAbgang });
    // Stück weg: Zwischenstand; die Zielscheibe bleibt am Abzweig, bis Haus 2 richtig angeschlossen ist (DESIGN 13.17.9 F8)
    const [u, m] = inT13h();
    setze(m, u, lage({ haupt: true, haus1: true }, ABGANG));
    setze(m, u, lage({ haupt: true, haus1: true }, { planungsfehler: true }));
    expect(an(u)).toMatchObject({ schritt: 'T13h', text: TEXT.zwischenstand, zielscheibe: [10, 12], fremd: [], ziel_ring: h2(m) });
    // Haus 2 richtig angeschlossen, aber noch ein Planungsfehler: T13h bleibt, Zielscheibe jetzt weg
    setze(m, u, lage(ALLE, { planungsfehler: true }));
    expect(an(u)).toMatchObject({ schritt: 'T13h', zielscheibe: null, fremd: [] });
    expect(u.sperre('abschliessen')).toEqual(GROESSE);
    setze(m, u, lage(ALLE));
    expect(jetzt(u)).toBe('T14');
  });

  it('test_nr21_vierer_ring_ohne_haus – Streifen da, aber kein Haus als Verursacher (Zusatz PL K-d)', () => {
    const [t, l] = inT13h();
    setze(l, t, lage(ALLE, RING));
    const a = an(t);
    expect(a).toMatchObject({
      schritt: 'T13h', text: TEXT.eigenerAbgang, fremd: [[11, 13]], ziel_ring: null, band: [], naechstes_feld: null,
      zielscheibe: [10, 12], finger_weg: [], erreicht_ids: [h1(l), h2(l)],
    });
    expect(t.sperre('abschliessen')).toEqual(WEG);
    abheben(t);
    expect(jetzt(t)).toBe('T13h');
    // Wiedereinstieg mit derselben Lage: T13h, nie T14
    const n = lageBauen();
    n.leitungen = lage(ALLE, RING);
    expect(einstieg(n)).toBe('T13h');
    expect(an(new Tutorial(n))).toMatchObject({ schritt: 'T13h', text: TEXT.eigenerAbgang, zielscheibe: [10, 12] });
    // Stummel weg → T14
    setze(l, t, lage(ALLE));
    expect(jetzt(t)).toBe('T14');
  });

  it('test_nr21_sperre_reihenfolge – Häuser fehlen vor Planungsfehler; Planungsfehler sperrt mit Fachprüfer-Satz', () => {
    const [t, l] = inT13h();
    setze(l, t, lage({ haupt: true, haus1: true }, { planungsfehler: true }));
    expect(t.sperre('abschliessen')).toEqual(EINS);
    setze(l, t, lage(ALLE, { planungsfehler: true }));
    expect(t.sperre('abschliessen')).toEqual(GROESSE);
    expect(jetzt(t)).toBe('T13h');
    setze(l, t, lage(ALLE));
    expect(jetzt(t)).toBe('T14');
    expect(t.sperre('abschliessen')).toBeNull();
    // ganze Kette in T13: Geld > Stück muss weg > Rolle falsch > Häuser fehlen
    const [u, m] = inT13();
    const pruefe = (neu: TutorialLeitungsLage, geld: number, soll: { kurz: string; satz: string }): void => {
      m.geldFehlt = geld; setze(m, u, neu);
      expect([jetzt(u), u.sperre('abschliessen')]).toEqual(['T13', soll]);
    };
    pruefe(zuDuenn(ABGANG), 1, GELD);
    pruefe(zuDuenn(ABGANG), 0, WEG);
    pruefe(zuDuenn(), 0, GROESSE);
    pruefe(lage({}, { planungsfehler: true }), 0, ZWEI);
  });

  it('test_nr21_t14_zurueck_bei_fremd – eigener Abgang oder Planungsfehler in T14 → T13h', () => {
    const [t, l] = inT14();
    setze(l, t, lage({ haupt: true, haus1: true }, ABGANG));
    expect(an(t)).toMatchObject({ schritt: 'T13h', text: TEXT.eigenerAbgang });
    const [u, m] = inT14();
    setze(m, u, lage(ALLE, { planungsfehler: true }));
    expect(an(u)).toMatchObject({ schritt: 'T13h', text: TEXT.T13h });
    const [v, n] = inT14();
    setze(n, v, lage(ALLE, RING));
    expect(an(v)).toMatchObject({ schritt: 'T13h', text: TEXT.eigenerAbgang });
  });

  it('test_nr21_wiedereinstieg_fremd – Neuladen mit eigenem Abgang bzw. Planungsfehler → T13h, nie T14', () => {
    const l = lageBauen();
    l.leitungen = lage({ haupt: true }, { fremd: [[12, 13], [12, 12]], fremd_haus: 2 });
    const t = new Tutorial(l, { wiedereinstieg: true });
    expect(jetzt(t)).toBe('T13h');
    t.tipp({ art: 'tipp', tipp: 'weiter' });
    expect(an(t)).toMatchObject({ schritt: 'T13h', text: TEXT.eigenerAbgang, fremd: [[12, 13], [12, 12]] });
    const p = lageBauen();
    p.leitungen = lage(ALLE, { planungsfehler: true });
    const tp = new Tutorial(p);
    tp.zustandPruefen();
    expect(jetzt(tp)).toBe('T13h');
  });

  it('test_nr21_wiedereinstieg_tabelle – fünf Zeilen in Reihenfolge; T13w mit haus1_ok → nach Farbknopf Zwischenstand', () => {
    const fall = (neu: TutorialLeitungsLage): TutorialSchrittId => { const l = lageBauen(); l.leitungen = neu; return einstieg(l); };
    expect(fall(lage({ haus1: true, haus2: true }, ABGANG))).toBe('T12');
    expect(fall(lage({ haupt: true }, { fremd: [[12, 13]], fremd_haus: 2 }))).toBe('T13h');
    expect(fall(lage({ haupt: true, haus2: true }, { planungsfehler: true }))).toBe('T13w');
    expect(fall(lage(ALLE, { planungsfehler: true }))).toBe('T13h');
    expect(fall(lage(ALLE))).toBe('T14');
    const l = lageBauen();
    l.leitungen = lage({ haupt: true, haus1: true }, { planungsfehler: true });
    const t = new Tutorial(l);
    expect(jetzt(t)).toBe('T13w');
    farbknopf(t, 'd25');
    expect(an(t)).toMatchObject({ schritt: 'T13h', text: TEXT.zwischenstand });
    // Andere Phasen lesen die Leitungslage nicht (bis P1 wirft sie im Spiel noch).
    const b = lageBauen();
    b.stand.abschnitt = { phase: 'bestellen', bau: null };
    expect(einstieg(b)).toBe('T15');
    expect(b.leitungenGelesen).toBe(0);
  });

  it('test_nr21_schritt_tabelle – alle Zellen der Tabelle B6', () => {
    const HZ3 = ['heizzentrale', 'haus1', 'haus2'];
    const k3 = { ziele: [], abdunkeln: 'nur_hud', kamera: 'frei', kamera_ziele: HZ3, kamera_grenze: true, spur: true, erreicht_zeigen: true,
      kompakt: true, ruhe: true };
    const [t13, l] = inT13();
    expect(an(t13)).toMatchObject({ ...k3, finger: 'spur', zielscheibe: [10, 12], ziel_ring: null, zeichenleiste: { typ: 'd32' }, zeichnen_ruht: false });
    expect(an(t13).ziel_stecker).toEqual([h1(l), h2(l)]);
    expect(t13.sperre('karte_gesten')).toBeNull();
    expect(t13.sperre('blatt_schliessen')!.satz).toBe(TEXT.leisteOffen);
    const [t13w] = inT13w();
    expect(an(t13w)).toMatchObject({ ...k3, finger: 'tippen', zielscheibe: [10, 12], ziel_ring: null, zeichenleiste: { typ: 'd32' }, zeichnen_ruht: true });
    expect(t13w.sperre('karte_gesten')).toBeNull();
    expect(t13w.sperre('blatt_schliessen')!.satz).toBe(TEXT.leisteOffen);
    expect(t13w.sperre('abschliessen')).toEqual(ZWEI);
    const [t13h, m] = inT13h();
    expect(an(t13h)).toMatchObject({ ...k3, finger: 'spur', zielscheibe: null, ziel_ring: h1(m), zeichenleiste: { typ: 'd25' }, zeichnen_ruht: false });
    expect(t13h.sperre('karte_gesten')).toBeNull();
    expect(t13h.sperre('blatt_schliessen')!.satz).toBe(TEXT.leisteOffen);
    expect(t13h.sperre('abschliessen')).toEqual(ZWEI);
    const [t14] = inT14();
    expect(an(t14)).toMatchObject({ ziele: ['abschliessen'], finger: 'tippen', abdunkeln: 'alles', kamera: 'steht', kamera_ziele: [],
      kamera_grenze: false, spur: false, erreicht_zeigen: false, zielscheibe: null, ziel_ring: null, zeichenleiste: null,
      zeichnen_ruht: false, kompakt: false, ruhe: true, band: [], ziel_stecker: [] });
    expect(t14.sperre('karte_gesten')!.kurz).toBe('später wählbar');
    expect(t14.sperre('blatt_schliessen')).toEqual({ kurz: 'später wählbar', satz: '' });
    expect(t14.sperre('abschliessen')).toBeNull();
    // T12: ruhe, sonst nichts aus Kapitel 3
    const t12 = new Tutorial(lageBauen());
    expect(an(t12)).toMatchObject({ schritt: 'T12', ruhe: true, kompakt: false, zeichenleiste: null, band: [], leitung_typ: 'd32', text: TEXT.T12 });
  });

  it('test_nr21_texte_laenge – Kapitel-3-Texte wörtlich nach E8 und ≤ 96 Zeichen ohne Marken, auch mit 20-Zeichen-Namen', () => {
    const name = 'Abcdefghijklmnopqrst';
    const texte: string[] = [];
    const nimm = (t: Tutorial, soll: string): void => { const s = an(t).text; expect(s).toBe(soll); texte.push(s); };
    const [t13, l] = inT13(lageBauen(name));
    nimm(t13, TEXT.T13);
    for (let i = 0; i < 3; i++) t13.tipp({ art: 'tipp', tipp: 'daneben' });
    nimm(t13, TEXT.hilfeSpur);
    setze(l, t13, zuDuenn());
    nimm(t13, TEXT.zuDuenn);
    const [t13w] = inT13w(lageBauen(name));
    nimm(t13w, TEXT.T13w);
    for (let i = 0; i < 3; i++) t13w.tipp({ art: 'tipp', tipp: 'daneben' });
    nimm(t13w, TEXT.hilfeT13w);
    const [t13h, m] = inT13h(lageBauen(name));
    nimm(t13h, TEXT.T13h);
    setze(m, t13h, lage({ haupt: true, haus1: true }));
    nimm(t13h, TEXT.zwischenstand);
    setze(m, t13h, zuDick());
    nimm(t13h, TEXT.zuDick);
    setze(m, t13h, lage({ haupt: true, haus1: true }, ABGANG));
    nimm(t13h, TEXT.eigenerAbgang);
    setze(m, t13h, lage(ALLE, { planungsfehler: true }));
    texte.push(t13h.sperre('abschliessen')!.satz);
    for (const b of ['abschliessen', 'blatt_schliessen'] as Bedienung[]) texte.push(t13h.sperre(b)!.satz);
    expect(texte).toContain(TEXT.groesse);
    for (const s of texte) expect([s, s.replace(/\*\*/g, '').length <= 96]).toEqual([s, true]);
    // T12 läuft auf der normalen Karte (Bauplan NR20-22 Z. 12: 96 Zeichen nur kompakt in T13/T13w/T13h); E8 wörtlich, 99 Zeichen
    // ohne Marken (Grenze der normalen Karte 120 prüft test_nr13_texte_laenge).
    const t12 = an(new Tutorial(lageBauen(name))).text;
    expect(t12).toBe(TEXT.T12);
    expect(t12.replace(/\*\*/g, '').length).toBe(99);
    expect(TEXT.eigenerAbgang.length).toBe(89);
  });

  it('test_nr21_groessensaetze_vorrang – haupt_zu_duenn vor anschluss_zu_dick, beide vor Hilfe und Zwischenstand; Farbknopf-Ring', () => {
    const [t, l] = inT13h();
    for (let i = 0; i < 3; i++) t.tipp({ art: 'tipp', tipp: 'daneben' });
    setze(l, t, falsch(lage({ haupt: true, haus1: true }), 10, 13, 'd32', { anschluss_zu_dick: true }));
    expect(an(t)).toMatchObject({ text: TEXT.zuDick, farbknopf_ring: 'd25' });
    const [u, m] = inT13();
    setze(m, u, zuDuenn({ anschluss_zu_dick: true }));
    expect(an(u)).toMatchObject({ schritt: 'T13', text: TEXT.zuDuenn, farbknopf_ring: 'd32' });
    expect(u.sperre('abschliessen')).toEqual(GROESSE);
    setze(m, u, lage());
    expect(an(u)).toMatchObject({ text: TEXT.T13, farbknopf_ring: null });
  });

  it('test_nr20_band_und_naechstes_feld – frisch, halb gezeichnet, falsche Größe, Hauptleitung daneben', () => {
    const [t, l] = inT13();
    const a = an(t);
    expect(a.band).toEqual([
      { x: 10, y: 11, typ: 'd32', aktiv: true, falsch: false, pfeil: [0, 1] },
      { x: 10, y: 12, typ: 'd32', aktiv: true, falsch: false, pfeil: null },
      { x: 9, y: 12, typ: 'd25', aktiv: false, falsch: false, pfeil: [0, 1] },
      { x: 10, y: 13, typ: 'd25', aktiv: false, falsch: false, pfeil: [0, 1] },
      { x: 10, y: 14, typ: 'd25', aktiv: false, falsch: false, pfeil: [1, 0] },
      { x: 11, y: 14, typ: 'd25', aktiv: false, falsch: false, pfeil: [1, 0] },
    ]);
    expect(a).toMatchObject({ naechstes_feld: [10, 11], zielscheibe: [10, 12], finger_weg: [[10, 11], [10, 12]] });
    // halb gezeichnet: (10|11) liegt richtig
    const halb = lage();
    halb.spur[0].belegt = 'd32'; halb.spur[0].richtig = true;
    setze(l, t, halb);
    expect(an(t)).toMatchObject({ naechstes_feld: [10, 12], finger_weg: [[10, 12]] });
    expect(an(t).band.map((f) => [f.x, f.y])).toEqual([[10, 12], [9, 12], [10, 13], [10, 14], [11, 14]]);
    // falsche Größe auf (10|11)
    setze(l, t, zuDuenn());
    expect(an(t).band[0]).toEqual({ x: 10, y: 11, typ: 'd32', aktiv: true, falsch: true, pfeil: [0, 1] });
    expect(an(t).naechstes_feld).toEqual([10, 11]);
    // Hauptleitung über (11|12): haupt_ok, Spurfeld (10|11) leer → kein Haupt-Band, T13w, Raute auf dem Abzweig
    const daneben = lage({ haupt: true });
    daneben.spur[0].belegt = null; daneben.spur[0].richtig = false;
    setze(l, t, daneben);
    expect(an(t)).toMatchObject({ schritt: 'T13w', naechstes_feld: [10, 12], finger_weg: [] });
    expect(an(t).band.map((f) => [f.x, f.y, f.aktiv])).toEqual([[9, 12, true], [10, 13, true], [10, 14, true], [11, 14, true]]);
    // im Zug in T13 mit haupt_ok daneben: kein Haupt-Band, keine Raute auf einem Feld, das schon erfüllt ist
    const [u, m] = inT13();
    strich(u);
    setze(m, u, daneben);
    expect(an(u)).toMatchObject({ schritt: 'T13', naechstes_feld: null, finger_weg: [] });
    expect(an(u).band.some((f) => f.y <= 11)).toBe(false);
  });

  it('test_nr20_ziel_ring – T13/T13w null; T13h Haus 1, nach haus1_ok Haus 2; Finger bis zur Hausmitte; Zielscheibe in T13h null', () => {
    const [t13] = inT13();
    expect(an(t13).ziel_ring).toBeNull();
    const [t13w] = inT13w();
    expect(an(t13w).ziel_ring).toBeNull();
    const [t, l] = inT13h();
    expect(an(t)).toMatchObject({ ziel_ring: h1(l), zielscheibe: null, naechstes_feld: [9, 12], finger_weg: [[9, 12], [9, 13]] });
    expect(an(t).band.filter((f) => f.aktiv).map((f) => [f.x, f.y])).toEqual([[9, 12]]);
    setze(l, t, lage({ haupt: true, haus1: true }));
    expect(an(t)).toMatchObject({ ziel_ring: h2(l), zielscheibe: null, naechstes_feld: [10, 13],
      finger_weg: [[10, 13], [10, 14], [11, 14], [12, 14]], erreicht_ids: [h1(l)] });
    expect(an(t).band.filter((f) => f.aktiv).map((f) => [f.x, f.y])).toEqual([[10, 13], [10, 14], [11, 14]]);
    // Haus 2 vor Haus 1: Ring und Raute bei Haus 1
    setze(l, t, lage({ haupt: true, haus2: true }));
    expect(an(t)).toMatchObject({ ziel_ring: h1(l), naechstes_feld: [9, 12], erreicht_ids: [h2(l)] });
  });

  it('test_nr21_nur_10_13_kurz_haken – haus1_ok über (10|13) → Zwischenstand, Ring Haus 2; danach haus1_ok false → Ring Haus 1, Grundtext', () => {
    const [t, l] = inT13h();
    const kurz = lage({ haupt: true }, { haus1_ok: true, planungsfehler: true });
    kurz.spur[3].belegt = 'd25';
    setze(l, t, kurz);
    expect(an(t)).toMatchObject({ text: TEXT.zwischenstand, ziel_ring: h2(l), erreicht_ids: [h1(l)] });
    const weiter = lage({ haupt: true }, { planungsfehler: true });
    weiter.spur[3].belegt = 'd25'; weiter.spur[4].belegt = 'd25';
    setze(l, t, weiter);
    expect(an(t)).toMatchObject({ schritt: 'T13h', text: TEXT.T13h, ziel_ring: h1(l), naechstes_feld: [9, 12] });
  });

  it('test_nr21_leitungslage_nur_in_kapitel_3 – außerhalb T12–T14 und in der Wiedereinstiegs-Blase liest das Tutorial die Lage nicht', () => {
    const l = lageBauen();
    delete l.stand.abschnitt;
    l.stand.tutorial = { kapitel: 1 };
    const t = new Tutorial(l);
    an(t); t.sperre('abschliessen'); t.sperre('blatt_schliessen'); t.zustandPruefen(); t.handlung();
    t.tipp({ art: 'tipp', tipp: 'heizzentrale' });
    an(t);
    const w = lageBauen();
    w.stand.abschnitt = { phase: 'bestellen', bau: null };
    const tw = new Tutorial(w, { wiedereinstieg: true });
    an(tw);
    expect([l.leitungenGelesen, w.leitungenGelesen]).toEqual([0, 0]);
  });

  // Review P2 – Testlücken (Tester 2026-11-07). Erwartungen aus Bauplan NR20-22 P2 bzw. §5, nicht aus der Ausgabe.
  it('test_nr21_ring_auf_haus_mit_eigenem_abgang – T13h, Haus 1 offen, Haus 2 mit eigenem Abgang → Ring, Band und Raute auf Haus 2', () => {
    // Tabelle P2: ziel_ring = Haus `fremd_haus`, erst sonst das erste nicht-ok Haus. Haus 1 ist hier nicht ok – die Regel
    // „erstes offenes Haus“ allein ergäbe Haus 1.
    const [t, l] = inT13h();
    setze(l, t, lage({ haupt: true }, { fremd: [[11, 13], [11, 12]], fremd_haus: 2, planungsfehler: true }));
    const a = an(t);
    expect(a).toMatchObject({ schritt: 'T13h', text: TEXT.eigenerAbgang, ziel_ring: h2(l), naechstes_feld: [10, 13],
      zielscheibe: [10, 12], finger_weg: [], erreicht_ids: [] });
    expect(a.band.map((f) => [f.x, f.y, f.aktiv])).toEqual([[9, 12, false], [10, 13, true], [10, 14, true], [11, 14, true]]);
  });

  it('test_nr21_zustandpruefen_nur_kapitel_3 – T17 mit schon gekaufter Station bleibt nach zustandPruefen T17', () => {
    // P2: „zustandPruefen gilt für T13, T13w, T13h, T14.“ In Kapitel 4 schaltet erst das Ereignis station_gekauft weiter.
    const l = lageBauen();
    l.stand.tutorial = { kapitel: 4 };
    l.stand.abschnitt = { phase: 'bestellen', bau: null };
    const t = new Tutorial(l);
    expect(jetzt(t)).toBe('T15');
    t.tipp({ art: 'tipp', tipp: 'haus', objekt_id: h1(l) });
    t.tipp({ art: 'tipp', tipp: 'weiter' });
    expect(jetzt(t)).toBe('T17');
    haus(l, 9, 13).station = 'puffer';
    t.zustandPruefen();
    expect(jetzt(t)).toBe('T17');
  });

  it('test_nr21_geld_satz_vor_sperr_satz – T13 und T13h: Geld fehlt, Blatt schließen getippt → Blase = Geld-Satz', () => {
    // Textvorrang P2 (T13/T13h): Geld-Satz > Sperr-Satz. Häuser nicht erreicht → Sperr-Satz wäre „Leiste bleibt offen“.
    const [t, l] = inT13();
    l.geldFehlt = 50;
    t.gesperrtGetippt('blatt_schliessen');
    expect(t.sperre('blatt_schliessen')!.satz).toBe(TEXT.leisteOffen);
    expect(an(t)).toMatchObject({ schritt: 'T13', text: TEXT.geld });
    const [u, m] = inT13h();
    m.geldFehlt = 50;
    u.gesperrtGetippt('blatt_schliessen');
    expect(u.sperre('blatt_schliessen')!.satz).toBe(TEXT.leisteOffen);
    expect(an(u)).toMatchObject({ schritt: 'T13h', text: TEXT.geld });
  });

  it('test_nr21_zug_endet_beim_schrittwechsel – Zug in T13h, Rücksprung T13, Hauptleitung wieder gut ohne Strich → sofort T13w', () => {
    // P2: zugLaeuft wird false „bei jedem Schrittwechsel“; ohne Zug gilt T13 → T13w sofort.
    const [t, l] = inT13h();
    strich(t);
    setze(l, t, zuDuenn());
    expect(jetzt(t)).toBe('T13');
    setze(l, t, lage({ haupt: true }));
    expect(jetzt(t)).toBe('T13w');
  });

  it('test_nr21_t14_ansicht_zeigt_fremd – Lage.fremd steht in T14 in der Ansicht, bevor zustandPruefen zurückspringt', () => {
    // §5: `fremd` = Lage.fremd in T13–T14, sonst [].
    const [t, l] = inT14();
    expect(an(t).fremd).toEqual([]);
    l.leitungen = lage(ALLE, RING);
    expect(an(t)).toMatchObject({ schritt: 'T14', fremd: [[11, 13]] });
  });

  it('test_nr21_blatt_schliessen_geld_satz – beide Häuser erreicht und Geld fehlt → Sperr-Satz von [X] ist der Geld-Satz (K12)', () => {
    // NR13 F3/K12 (Muss): Sind beide Häuser erreicht und fehlt Geld, weicht auch der Sperr-Satz von blatt_schliessen dem Geld-Satz;
    // mit nur einem Haus bleibt „Leiste bleibt offen“.
    const [t, l] = inT13h();
    l.geldFehlt = 50;
    setze(l, t, lage({ haupt: true, haus1: true }));
    expect(t.sperre('blatt_schliessen')).toEqual({ kurz: 'später wählbar', satz: TEXT.leisteOffen });
    setze(l, t, lage(ALLE));
    expect(jetzt(t)).toBe('T13h');
    expect(t.sperre('blatt_schliessen')).toEqual({ kurz: 'später wählbar', satz: TEXT.geld });
    l.geldFehlt = 0;
    expect(t.sperre('blatt_schliessen')).toEqual({ kurz: 'später wählbar', satz: TEXT.leisteOffen });
  });
});
