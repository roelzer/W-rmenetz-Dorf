import { describe, expect, it } from 'vitest';
import { neuesSpielMitTutorial } from '../src/core/start';
import { KATALOG, istLeitung, type TypId } from '../src/core/katalog';
import type { Objekt, Spielstand } from '../src/core/typen';
import type {
  Bedienung, Schritt, Tipp, TutorialLeitungsLage, TutorialSchrittId, TutorialWerte,
} from '../src/core/tutorial-vertrag';
import { einstieg, Tutorial, TUTORIAL_SCHRITTE, TUTORIAL_TEXT_MAX, TUTORIAL_ZURUFE, type TutorialLage } from '../src/core/tutorial';

// Bauplan docs/bauplaene/NR13-tutorial.md (Fassung 3.1), Paket P1: Schrittlogik ohne Grafik. Die Lage ist ein einfaches Objekt,
// das der Test von Hand stellt (Leitungslage, Geld, Abschnitt); erwartete Texte stehen wörtlich aus DESIGN 13.5/13.15.
// NR21 (Bauplan NR20-22 Fassung 2.2, §8 V0 / P2): Kapitel 3 hat die Schritte T12, T13, T13w, T13h, T14. Die Schritte hängen an der
// Leitungslage `tutorialLeitungen()` (haupt_ok, haus1_ok, haus2_ok …), nicht an `erreichteHaeuser()`. Texte nach Bauplan E8
// (= DESIGN 13.17.2 Fassung 2 und 13.17.8); T13b entfällt und wird zum Zwischenstand-Satz von T13h.
const T0 = 1_000_000_000_000;
const NB = ' ';
const NAME20 = 'Abcdefghijklmnopqrst';
const WERTE: TutorialWerte = { kessel_kw: 60, kwh: 15000, kw_ohne: 10, kw_puffer: 7.5, kw_summe: 15, haupt: 'd32', anschluss: 'd25' };

const TEXT = {
  T01: 'Hallo Chef! Ich bin Simon und zeige dir, wie dein Dorf warm wird. Tippe auf die Heizzentrale.',
  T02: 'Hier steht dein **Wärmeerzeuger**, ein **Hackschnitzelkessel**. Er verbrennt Holzreste und macht damit Wasser heiß.',
  T12: 'Fertig geplant! Zuerst die **Hauptleitung**: Nimm die dicke 32er, sie trägt die Wärme für beide Häuser.',
  T13: 'Zieh die 32er von der Heizzentrale bis zur Abzweigung. Folge der Spur.',
  T13w: `Bis hier fließen 15${NB}kW für beide Häuser, ab hier **je Haus nur** 7,5${NB}kW. Dafür reicht die 25er.`,
  T13h: 'Jedes Haus bekommt seinen eigenen **Hausanschluss**. Zieh die 25er bis ans erste Haus.',
  zwischenstand: 'Das erste Haus hat seinen Hausanschluss. Jetzt zieh die 25er zum zweiten Haus.',
  T14: 'Beide Häuser sind erreicht. Tippe auf Abschnitt abschließen.',
  T15: 'Damit ein Haus die Wärme nehmen kann, braucht es eine **Übergabestation**. Tippe auf das erste Haus.',
  T18: 'Prima! Jetzt bekommt das zweite Haus auch eine. Tippe darauf.',
  T24: 'Geschafft, Chef! Beide Häuser heizen jetzt mit Wärme aus deinem Netz statt mit Öl.',
  geld: 'Dann reicht dein Geld nicht mehr für die Stationen. Nimm mit Zurück ein paar Leitungen weg.',
  leisteOffen: 'Die Leiste bleibt offen, bis beide Häuser erreicht sind.',
  zuFrueh: 'Zieh die Leitung bis an beide Häuser – folge der Spur.',
  zuDuenn: 'Hier fließt Wärme für beide Häuser, die 25er wäre randvoll. Nimm die 32er und zieh drüber.',
  zuDick: 'Für ein Haus reicht die 25er. Tippe auf 25 und zieh noch mal über dieses Stück.',
  groesse: 'Ein Stück passt nicht zum Plan. Zieh mit der richtigen Größe noch mal drüber.',
  eigenerAbgang: 'Nimm das gestreifte Stück mit Zurück oder Radierer weg. Zieh die 25er von der Abzweigung.',
  hilfeT01: 'Tippe auf das große Gebäude, das gelb leuchtet.',
  hilfeT13: 'Leg den Finger auf das leuchtende Feld und zieh ihn die Spur entlang.',
  hilfeT13w: 'Tippe rechts in der Leiste auf 25.',
};

/** Spurfelder in Zugrichtung (Bauplan NR20-22 E1): Hauptleitung, Hausanschluss Haus 1, Hausanschluss Haus 2. */
const SPUR: ReadonlyArray<readonly [number, number, 'haupt' | 'haus1' | 'haus2']> = [
  [10, 11, 'haupt'], [10, 12, 'haupt'], [9, 12, 'haus1'], [10, 13, 'haus2'], [10, 14, 'haus2'], [11, 14, 'haus2'],
];
/** Ziel der Lage-Attrappe: welche Stücke richtig liegen; alles Übrige der Lage kann überschrieben werden. */
interface Ziel { haupt?: boolean; haus1?: boolean; haus2?: boolean }
/** Leitungslage von Hand: richtige Stücke sind mit der Sollgröße belegt (32er Haupt, 25er Hausanschluss), die übrigen leer.
 *  planungsfehler ist im normalen Zwischenstand (Hauptleitung und genau ein Haus) wahr, wie die Probe im Bauplan §2 zeigt. */
function leitungsLage(z: Ziel = {}, extra: Partial<TutorialLeitungsLage> = {}): TutorialLeitungsLage {
  const ok = { haupt: !!z.haupt, haus1: !!z.haus1, haus2: !!z.haus2 };
  const soll = (st: 'haupt' | 'haus1' | 'haus2'): TypId => (st === 'haupt' ? 'd32' : 'd25');
  const spur = SPUR.map(([x, y, stueck]) => ({ x, y, stueck, belegt: ok[stueck] ? soll(stueck) : null, richtig: ok[stueck] }));
  const felder = SPUR.filter(([, , st]) => ok[st]).map(([x, y, st]) => ({ x, y, rolle: st === 'haupt' ? 'haupt' as const : 'anschluss' as const, typ: soll(st), richtig: true }));
  return {
    haupt_ok: ok.haupt, haus1_ok: ok.haus1, haus2_ok: ok.haus2, haupt_zu_duenn: false, anschluss_zu_dick: false,
    planungsfehler: ok.haupt && ok.haus1 !== ok.haus2, fremd: [], fremd_haus: null, felder, spur, ...extra,
  };
}

interface Testlage extends TutorialLage {
  stand: Spielstand; netz: { warm: Set<number> }; spielerName: string;
  /** Häuser, die über irgendeine Leitung verbunden sind – zählt für Kapitel 3 nicht mehr (Bauplan NR20-22 P2 erreichtZahl). */
  erreicht: number[]; geldFehlt: number; werte: TutorialWerte; kapitelGesetzt: number[]; beendet: number;
  leitungen: TutorialLeitungsLage;
  erreichteHaeuser(): number[];
}

function lageBauen(werte: Partial<TutorialWerte> = {}, name = 'Chef'): Testlage {
  const stand = neuesSpielMitTutorial(T0);
  stand.namen_gefragt = true;
  return {
    stand, netz: { warm: new Set<number>() }, spielerName: name, erreicht: [], geldFehlt: 0,
    werte: { ...WERTE, ...werte }, kapitelGesetzt: [], beendet: 0, leitungen: leitungsLage(),
    erreichteHaeuser() { return [...this.erreicht]; },
    tutorialWerte() { return this.werte; },
    tutorialLeitungen() { return this.leitungen; },
    tutorialGeldFehlt_eur() { return this.geldFehlt; },
    tutorialKapitelSetzen(k: number) { this.kapitelGesetzt.push(k); this.stand.tutorial = { kapitel: k }; },
    tutorialBeenden() { this.beendet++; delete this.stand.tutorial; },
  };
}
const bei = (l: Testlage, x: number, y: number): Objekt => l.stand.objekte.find((o) => o.x === x && o.y === y && KATALOG[o.typ].kategorie === 'haus')!;
const h1 = (l: Testlage): Objekt => bei(l, 9, 13);
const h2 = (l: Testlage): Objekt => bei(l, 12, 14);
const hz = (l: Testlage): Objekt => l.stand.objekte.find((o) => o.typ === 'hz')!;
/** Lage setzen; `erreicht` folgt den richtig angeschlossenen Häusern (ein Test weicht davon bewusst ab). */
function setze(l: Testlage, z: Ziel, extra: Partial<TutorialLeitungsLage> = {}): void {
  l.leitungen = leitungsLage(z, extra);
  l.erreicht = [...(l.leitungen.haus1_ok ? [h1(l).id] : []), ...(l.leitungen.haus2_ok ? [h2(l).id] : [])];
}
/** Ein Spurfeld mit falscher Größe belegt (Rolle falsch, Bauplan NR20-22 E3): Feld in `felder` und `spur` auf `typ`, nicht richtig. */
function mitFalscherGroesse(basis: TutorialLeitungsLage, x: number, y: number, typ: TypId, extra: Partial<TutorialLeitungsLage>): TutorialLeitungsLage {
  const hier = (f: { x: number; y: number }): boolean => f.x === x && f.y === y;
  return {
    ...basis,
    felder: basis.felder.map((f) => (hier(f) ? { ...f, typ, richtig: false } : f)),
    spur: basis.spur.map((f) => (hier(f) ? { ...f, belegt: typ, richtig: false } : f)),
    ...extra,
  };
}
/** Hauptleitung (10|11) als 25er: Rolle haupt falsch → haupt_ok false, haupt_zu_duenn („Hauptleitung zu dünn“). */
const lageZuDuenn = (extra: Partial<TutorialLeitungsLage> = {}): TutorialLeitungsLage =>
  mitFalscherGroesse(leitungsLage({ haupt: true }), 10, 11, 'd25', { haupt_ok: false, haupt_zu_duenn: true, ...extra });
/** Hausanschluss Haus 2 mit 32er auf (10|14): Rolle anschluss falsch → Haus 2 nicht ok, anschluss_zu_dick („Hausanschluss zu dick“). */
const lageZuDick = (extra: Partial<TutorialLeitungsLage> = {}): TutorialLeitungsLage =>
  mitFalscherGroesse(leitungsLage({ haupt: true, haus1: true, haus2: true }), 10, 14, 'd32', { haus2_ok: false, anschluss_zu_dick: true, ...extra });
/** Eigener Abgang zu Haus 2 über (12|12)→(12|13) (Bauplan NR20-22 P1 `test_nr21_eigener_abgang` (a)). */
const FREMD_HAUS2: Partial<TutorialLeitungsLage> = { fremd: [[12, 13], [12, 12]], fremd_haus: 2 };
const tipp = (t: Tutorial, w: Tipp, extra: { objekt_id?: number; typ?: TypId } = {}): void => t.tipp({ art: 'tipp', tipp: w, ...extra });
const schritt = (t: Tutorial, s: Schritt, objekt_id?: number): void => t.schritt(objekt_id === undefined ? { schritt: s } : { schritt: s, objekt_id });
const jetzt = (t: Tutorial): TutorialSchrittId => t.ansicht(T0)!.schritt;
const leitungLegen = (l: Testlage, x: number, y: number, geplant: boolean): Objekt => {
  const o: Objekt = { id: l.stand.naechste_id++, typ: 'd25', x, y, stufe: 1, bau: null, kasse_eur: 0, ...(geplant ? { geplant: true } : {}) };
  l.stand.objekte.push(o);
  return o;
};

/** Die richtige Handlung des aktuellen Schritts: Zustand der Lage ändern, dann melden, was Kern bzw. Oberfläche melden würden. */
function richtig(t: Tutorial, l: Testlage): void {
  const id = jetzt(t);
  switch (id) {
    case 'T01': tipp(t, 'heizzentrale'); return;
    case 'T08': case 'T20': tipp(t, 'baumenue'); return;
    case 'T09': tipp(t, 'reiter_leitungen'); return;
    case 'T10':
      l.stand.abschnitt = { phase: 'planung', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 10_000 } };
      schritt(t, 'abschnitt_geplant'); return;
    case 'T11':
      l.stand.abschnitt = { phase: 'offen', bau: null };
      schritt(t, 'abschnitt_offen'); tipp(t, 'weiter'); return;
    case 'T12': tipp(t, 'leitungskarte', { typ: l.werte.haupt }); return;
    case 'T13':
      // Zug mit der Hauptleitung bis zum Abzweig; der Wechsel nach T13w kommt erst beim Abheben (Bauplan NR20-22 P2).
      setze(l, { haupt: true }); schritt(t, 'leitung_gezeichnet'); tipp(t, 'abgehoben'); return;
    case 'T13w': tipp(t, 'farbknopf', { typ: l.werte.anschluss }); return;
    case 'T13h':
      setze(l, { haupt: true, haus1: true }); schritt(t, 'haus_erreicht', h1(l).id);
      setze(l, { haupt: true, haus1: true, haus2: true }); schritt(t, 'haus_erreicht', h2(l).id); return;
    case 'T14':
      l.stand.abschnitt = { phase: 'bestellen', bau: null };
      schritt(t, 'abschnitt_abgeschlossen'); return;
    case 'T15': tipp(t, 'haus', { objekt_id: h1(l).id }); return;
    case 'T17': h1(l).station = 'puffer'; schritt(t, 'station_gekauft', h1(l).id); return;
    case 'T18': tipp(t, 'haus', { objekt_id: h2(l).id }); return;
    case 'T19': h2(l).station = 'puffer'; schritt(t, 'station_gekauft', h2(l).id); return;
    case 'T21':
      l.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 50_000 } };
      schritt(t, 'material_bestellt'); return;
    case 'T23':
      delete l.stand.abschnitt;
      l.netz.warm = new Set([h1(l).id, h2(l).id]);
      schritt(t, 'abschnitt_gebaut'); tipp(t, 'weiter'); return;
    default: tipp(t, 'weiter');
  }
}
function bis(t: Tutorial, l: Testlage, ziel: TutorialSchrittId): void {
  for (let i = 0; i < 45 && jetzt(t) !== ziel; i++) richtig(t, l);
  expect(jetzt(t)).toBe(ziel);
}
const NUMMERN: TutorialSchrittId[] = Array.from({ length: 26 }, (_, i) => `T${String(i + 1).padStart(2, '0')}` as TutorialSchrittId);
/** Reihenfolge Bauplan NR20-22 §5: … T12, T13, T13w, T13h, T14 … */
const ALLE: TutorialSchrittId[] = NUMMERN.flatMap((s) => (s === 'T13' ? ['T13', 'T13w', 'T13h'] as TutorialSchrittId[] : [s]));
const KAPITEL: Record<TutorialSchrittId, number> = Object.fromEntries(ALLE.map((s) => {
  const n = Number(s.slice(1, 3));
  return [s, n <= 7 ? 1 : n <= 11 ? 2 : n <= 14 ? 3 : n <= 19 ? 4 : n <= 23 ? 5 : 6];
})) as Record<TutorialSchrittId, number>;
const KAPITEL_NAME = ['', 'Die Heizzentrale', 'Planen mit Philipp', 'Leitung ziehen', 'Übergabestationen', 'Bauen', 'Warm!'];
const sichtbar = (s: string): string => s.replace(/\*\*/g, '');
function saetze(s: string, name: string): number {
  let rest = sichtbar(s);
  for (const z of TUTORIAL_ZURUFE.map((x) => x.replace('{Name}', name))) if (rest.startsWith(z)) { rest = rest.slice(z.length); break; }
  return (rest.match(/[.!?](?=\s|$)/g) ?? []).length;
}

describe('NR13 Tutorial-Schrittlogik (P1)', () => {
  it('test_nr13_reihenfolge_t01_bis_t26 – alle richtigen Handlungen ergeben genau T01 … T26, dann Ende', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    const gesehen: TutorialSchrittId[] = [];
    for (let i = 0; i < 40 && t.aktiv(); i++) {
      const a = t.ansicht(T0)!;
      if (gesehen[gesehen.length - 1] !== a.schritt) gesehen.push(a.schritt);
      expect(a.kapitel).toBe(KAPITEL[a.schritt]);
      expect(a.kapitel_name).toBe(KAPITEL_NAME[KAPITEL[a.schritt]]);
      richtig(t, l);
    }
    expect(gesehen).toEqual(ALLE);
    expect(l.beendet).toBe(1);
    expect(l.kapitelGesetzt).toEqual([2, 3, 4, 5, 6]);
    expect(t.aktiv()).toBe(false);
    expect(t.ansicht(T0)).toBeNull();
    tipp(t, 'weiter');
    expect(l.beendet).toBe(1);
  });

  it('test_nr13_reihenfolge_mit_t09 – T08 → T09 → T10, wenn der Reiter eigens getippt werden muss; T20 springt direkt auf T21', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T08');
    tipp(t, 'baumenue');
    expect(jetzt(t)).toBe('T09');
    tipp(t, 'reiter_leitungen');
    expect(jetzt(t)).toBe('T10');
    bis(t, l, 'T20');
    tipp(t, 'baumenue');
    expect(jetzt(t)).toBe('T21');
    tipp(t, 'reiter_leitungen');
    expect(jetzt(t)).toBe('T21');
  });

  it('test_nr13_jeder_schritt_wartet – falsche Tipps, fremde Ereignisse und falsche Objekte schalten nicht', () => {
    const TIPPS: Tipp[] = ['heizzentrale', 'baumenue', 'reiter_leitungen', 'leitungskarte', 'haus', 'weiter', 'daneben', 'farbknopf', 'abgehoben'];
    const SCHRITTE: Schritt[] = ['abschnitt_geplant', 'abschnitt_offen', 'leitung_gezeichnet', 'haus_erreicht', 'haus_getrennt',
      'station_gekauft', 'abschnitt_abgeschlossen', 'material_bestellt', 'abschnitt_gebaut', 'haus_warm'];
    const RICHTIG: Partial<Record<TutorialSchrittId, Tipp>> = { T01: 'heizzentrale', T08: 'baumenue', T09: 'reiter_leitungen',
      T12: 'leitungskarte', T15: 'haus', T18: 'haus', T20: 'baumenue' };
    for (const ziel of ALLE) {
      const l = lageBauen();
      const t = new Tutorial(l);
      bis(t, l, ziel);
      const a = t.ansicht(T0)!;
      for (const w of TIPPS) {
        if (w === RICHTIG[ziel]) continue;
        if (w === 'weiter' && a.art === 'W' && a.weiter !== 'wartet') continue;
        tipp(t, w);
        expect([ziel, w, jetzt(t)]).toEqual([ziel, w, ziel]);
      }
      for (const s of SCHRITTE) { schritt(t, s, 999_999); expect(jetzt(t)).toBe(ziel); }
      if (ziel === 'T12') { tipp(t, 'leitungskarte', { typ: 'd40' }); tipp(t, 'leitungskarte', { typ: 'd25' }); tipp(t, 'leitungskarte'); }
      // NR21: Farbknopf mit anderem Typ (oder ohne Typ) schaltet T13w nicht weiter (Bauplan NR20-22 P2 „Übergänge“)
      if (ziel === 'T13w') { tipp(t, 'farbknopf', { typ: 'd32' }); tipp(t, 'farbknopf', { typ: 'd40' }); }
      if (ziel === 'T15') { tipp(t, 'haus', { objekt_id: h2(l).id }); tipp(t, 'haus'); }
      if (ziel === 'T18') { tipp(t, 'haus', { objekt_id: h1(l).id }); tipp(t, 'haus'); }
      expect(jetzt(t)).toBe(ziel);
    }
  });

  it('test_nr13_wartet_auf_planung_und_bau – T11/T23 warten mit Restzeit, [Weiter] erst nach dem Phasenwechsel', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T11');
    let a = t.ansicht(T0)!;
    expect(a.weiter).toBe('wartet');
    expect(a.warte_bis_ms).toBe(T0 + 10_000);
    expect(a.warte_text).toBe('Philipp plant noch … {Restzeit}');
    tipp(t, 'weiter');
    expect(jetzt(t)).toBe('T11');
    l.stand.abschnitt = { phase: 'offen', bau: null };
    a = t.ansicht(T0)!;
    expect(a.weiter).toBe('weiter');
    expect(a.warte_text).toBeUndefined();
    expect(a.warte_bis_ms).toBeUndefined();
    tipp(t, 'weiter');
    expect(jetzt(t)).toBe('T12');

    bis(t, l, 'T23');
    a = t.ansicht(T0)!;
    expect(a.weiter).toBe('wartet');
    expect(a.warte_bis_ms).toBe(T0 + 50_000);
    expect(a.warte_text).toBe('Gebaut wird … noch {Restzeit}');
    expect(a.warte_text!.split('{Restzeit}').length).toBe(2);
    tipp(t, 'weiter');
    expect(jetzt(t)).toBe('T23');
    delete l.stand.abschnitt;
    expect(t.ansicht(T0)!.weiter).toBe('weiter');
    tipp(t, 'weiter');
    expect(jetzt(t)).toBe('T24');
  });

  it('test_nr13_t13_beide_haeuser – T13h: ein Haus → Zwischenstand, getrennt → T13h-Text, beide → T14; zählt die Lage, nicht erreichteHaeuser', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T13');
    expect(t.ansicht(T0)!.text).toBe(TEXT.T13);
    bis(t, l, 'T13w');
    expect(t.ansicht(T0)!.text).toBe(TEXT.T13w);
    bis(t, l, 'T13h');
    expect(t.ansicht(T0)!.text).toBe(TEXT.T13h);
    setze(l, { haupt: true, haus1: true }); schritt(t, 'haus_erreicht', h1(l).id);
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13h', text: TEXT.zwischenstand });
    setze(l, { haupt: true }); schritt(t, 'haus_getrennt', h1(l).id);
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13h', text: TEXT.T13h });
    setze(l, { haupt: true, haus2: true }); schritt(t, 'haus_erreicht', h2(l).id);
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13h', text: TEXT.zwischenstand });
    // Beide Häuser über irgendeine Leitung verbunden, aber Haus 1 nicht richtig angeschlossen → kein T14
    l.erreicht = [h1(l).id, h2(l).id]; schritt(t, 'haus_erreicht', h1(l).id);
    expect(jetzt(t)).toBe('T13h');
    setze(l, { haupt: true, haus1: true, haus2: true }); schritt(t, 'haus_erreicht', h1(l).id);
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T14', text: TEXT.T14, finger: 'tippen', ziele: ['abschliessen'] });
  });

  it('test_nr13_viele_striche_schalten_hoechstens_einmal – Wischen mit vielen leitung_gezeichnet; T13 wechselt erst beim Abheben', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T13');
    for (let i = 0; i < 10; i++) schritt(t, 'leitung_gezeichnet', 500 + i);
    expect(jetzt(t)).toBe('T13');
    setze(l, { haupt: true });
    for (let i = 0; i < 10; i++) schritt(t, 'leitung_gezeichnet', 600 + i);
    expect(jetzt(t)).toBe('T13');
    tipp(t, 'abgehoben');
    expect(jetzt(t)).toBe('T13w');
    tipp(t, 'farbknopf', { typ: 'd25' });
    expect(jetzt(t)).toBe('T13h');
    setze(l, { haupt: true, haus1: true, haus2: true });
    for (let i = 0; i < 10; i++) schritt(t, 'leitung_gezeichnet', 700 + i);
    // Bauplan NR20-22 P2 [2.3]: T13h → T14 erst nach dem Abheben, mitten im Zug bleibt T13h (auch beim Prüfen).
    expect(jetzt(t)).toBe('T13h');
    t.zustandPruefen();
    expect(jetzt(t)).toBe('T13h');
    tipp(t, 'abgehoben');
    expect(jetzt(t)).toBe('T14');
    expect(l.kapitelGesetzt).toEqual([2, 3]);
  });

  it('test_nr13_fehltipps_hilfe – H ab dem dritten daneben Hilfe-Satz, W „Tippe auf Weiter.“, Warten ohne Hilfe', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    tipp(t, 'daneben'); tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe(TEXT.T01);
    tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe(TEXT.hilfeT01);
    expect(t.ansicht(T0)!.knopf_hinweis).toBeUndefined();
    tipp(t, 'heizzentrale');
    let a = t.ansicht(T0)!;
    expect(a.schritt).toBe('T02');
    expect(a.text).toBe(TEXT.T02);
    expect(a.knopf_hinweis).toBeUndefined();
    tipp(t, 'daneben'); tipp(t, 'daneben');
    expect(t.ansicht(T0)!.knopf_hinweis).toBeUndefined();
    tipp(t, 'daneben');
    a = t.ansicht(T0)!;
    expect(a.text).toBe(TEXT.T02);
    expect(a.knopf_hinweis).toBe('Tippe auf Weiter.');
    tipp(t, 'weiter');
    expect(t.ansicht(T0)!.knopf_hinweis).toBeUndefined();

    bis(t, l, 'T11');
    for (let i = 0; i < 3; i++) tipp(t, 'daneben');
    expect(t.ansicht(T0)!.knopf_hinweis).toBeUndefined();
    expect(t.ansicht(T0)!.text).toBe('Je mehr Häuser an einer Leitung hängen, desto mehr kW muss sie tragen – und desto dicker muss sie sein.');

    bis(t, l, 'T13');
    for (let i = 0; i < 3; i++) tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe(TEXT.hilfeT13);
    bis(t, l, 'T13w');
    for (let i = 0; i < 2; i++) tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe(TEXT.T13w);
    tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe(TEXT.hilfeT13w);
    bis(t, l, 'T13h');
    expect(t.ansicht(T0)!.text).toBe(TEXT.T13h);
    for (let i = 0; i < 3; i++) tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe(TEXT.hilfeT13);
    // Vorrang T13h (Bauplan NR20-22 P2): Hilfe vor Zwischenstand
    setze(l, { haupt: true, haus1: true }); schritt(t, 'haus_erreicht', h1(l).id);
    expect(t.ansicht(T0)!.text).toBe(TEXT.hilfeT13);
    setze(l, { haupt: true }); schritt(t, 'haus_getrennt', h1(l).id);
    expect(t.ansicht(T0)!.text).toBe(TEXT.hilfeT13);
  });

  it('test_nr13_hilfe_saetze_je_schritt – Hilfe-Sätze aus DESIGN 13.5 wörtlich', () => {
    const erwartet: Partial<Record<TutorialSchrittId, string>> = {
      T01: TEXT.hilfeT01,
      T08: 'Der Knopf Bauen ist unten rechts – er leuchtet gelb.', T20: 'Der Knopf Bauen ist unten rechts – er leuchtet gelb.',
      T09: 'Leitungen ist der Reiter mit dem Rohr – oben im Blatt.',
      T10: 'Tippe auf den leuchtenden Knopf im Blatt.', T21: 'Tippe auf den leuchtenden Knopf im Blatt.',
      T12: 'Tippe auf die leuchtende Leitungs-Karte.', T13: TEXT.hilfeT13, T13w: TEXT.hilfeT13w, T13h: TEXT.hilfeT13,
      T14: 'Unten in der Leiste: Abschnitt abschließen.',
      T15: 'Tippe auf das leuchtende Haus.', T18: 'Tippe auf das leuchtende Haus.',
      T17: 'Tippe auf Puffer-Übergabestation.', T19: 'Tippe auf Puffer-Übergabestation.',
    };
    for (const [id, satz] of Object.entries(erwartet) as Array<[TutorialSchrittId, string]>) {
      const l = lageBauen();
      const t = new Tutorial(l);
      bis(t, l, id);
      for (let i = 0; i < 3; i++) tipp(t, 'daneben');
      expect([id, t.ansicht(T0)!.text]).toEqual([id, satz]);
      // T13w setzt {anschluss_zahl} ein; dort zählt nur der fertige Text
      if (id !== 'T13w') expect(TUTORIAL_SCHRITTE.find((s) => s.id === id)!.hilfe).toBe(satz);
    }
    for (const s of TUTORIAL_SCHRITTE.filter((x) => x.art === 'W')) expect(s.hilfe).toBe('Tippe auf Weiter.');
  });

  it('test_nr13_texte_wortlaut – Grundtexte T01 … T26 aus DESIGN 13.5 (nach 13.15) mit den Spielwerten', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    const erwartet: Record<TutorialSchrittId, string> = {
      T01: TEXT.T01, T02: TEXT.T02,
      T03: `Wie viel Wärme er in jedem Moment schafft, misst man in **Kilowatt (kW)**. Dein Kessel schafft 60${NB}kW.`,
      T04: 'Das heiße Wasser fließt durch Rohre unter der Straße zu den Häusern. Das nennt man **Wärmenetz** oder **Nahwärme**.',
      T05: 'Diese Häuser heizen noch mit Öl – siehst du den grauen Rauch? Du willst die ersten zwei anschließen.',
      T06: `Ein Haus braucht im Jahr 15.000${NB}kWh Wärme. An den kältesten Tagen braucht es bis zu 10${NB}kW gleichzeitig.`,
      T07: '**kW** ist, wie viel Wasser gerade aus dem Hahn läuft. **kWh** ist, wie voll der Eimer am Ende ist.',
      T08: 'Leitungen baust du in **Bauabschnitten**. Tippe auf Bauen.',
      T09: 'Hier ist alles für dein Netz. Tippe auf Leitungen.',
      T10: 'Philipp plant, wo die Leitung in der Straße liegen soll. Tippe auf seinen Knopf.',
      T11: 'Je mehr Häuser an einer Leitung hängen, desto mehr kW muss sie tragen – und desto dicker muss sie sein.',
      T12: TEXT.T12,
      T13: TEXT.T13, T13w: TEXT.T13w, T13h: TEXT.T13h, T14: TEXT.T14, T15: TEXT.T15,
      T16: 'Sie holt die Wärme aus dem Netz ins Haus. Ein **Wärmetauscher** trennt dabei das Netzwasser vom Heizwasser im Haus.',
      T17: `Nimm die mit **Pufferspeicher**. Ihr Tank sammelt Wärme vorab, so reichen 7,5${NB}kW statt 10${NB}kW aus dem Netz – genauso warm.`,
      T18: TEXT.T18,
      T19: 'Wieder die Puffer-Übergabestation, bitte.',
      T20: 'Fehlt nur noch das Material. Tippe auf Bauen.',
      T21: 'Tippe auf Laura. Sie bestellt Rohre und Stationen, dann wird gebaut.',
      T22: 'In echt dauert so ein Bau einige Wochen. Für dich geht es heute schneller.',
      T23: 'Deine Kunden zahlen für jede kWh, die bei ihnen ankommt, und eine feste Grundgebühr. Das ist deine Einnahme.',
      T24: TEXT.T24,
      T25: 'In jeder Leitung liegen zwei Rohre: Heißes Wasser fließt hin (**Vorlauf**), abgekühltes zurück (**Rücklauf**).',
      T26: 'Am Monatsende zahlen deine Kunden ihre Wärmerechnung. Damit schließt du die nächsten Häuser an.',
    };
    for (const id of ALLE) {
      bis(t, l, id);
      expect([id, t.ansicht(T0)!.text]).toEqual([id, erwartet[id]]);
    }
    expect(TUTORIAL_SCHRITTE.map((s) => s.id)).toEqual(ALLE);
    expect(TUTORIAL_SCHRITTE.map((s) => s.kapitel)).toEqual(ALLE.map((s) => KAPITEL[s]));
    expect(TUTORIAL_ZURUFE).toEqual(['Hallo {Name}!', 'Prima!', 'Fertig geplant!', 'Geschafft, {Name}!', 'Weiter geht’s, {Name}!']);
  });

  it('test_nr13_texte_laenge – alle Blasen-, Hilfe-, Sperr- und Wiedereinstiegs-Sätze ≤ 120 Zeichen, ≤ 2 Sätze (K2)', () => {
    const werte = { kwh: 99_999, kw_ohne: 17.5, kw_puffer: 12.5, kessel_kw: 999, kw_summe: 1_234.5, haupt: 'd110' as const, anschluss: 'd110' as const };
    const texte: string[] = [];
    const sammle = (t: Tutorial): void => {
      const a = t.ansicht(T0)!;
      texte.push(a.text);
      if (a.info_kapsel) texte.push(a.info_kapsel);
    };
    const l = lageBauen(werte, NAME20);
    const t = new Tutorial(l);
    for (let i = 0; i < 40 && t.aktiv(); i++) { sammle(t); richtig(t, l); }
    for (const id of ALLE) {
      const lx = lageBauen(werte, NAME20);
      const tx = new Tutorial(lx);
      bis(tx, lx, id);
      for (let i = 0; i < 3; i++) tipp(tx, 'daneben');
      sammle(tx);
      const b: Bedienung[] = ['zoom', 'doerfer', 'auftrag', 'blatt_schliessen', 'verwerfen', 'sofort', 'express', 'weiter_einzeichnen', 'abschliessen', 'karte_gesten'];
      for (const x of b) { const s = tx.sperre(x); if (s) { expect(s.kurz.length).toBeLessThanOrEqual(18); if (s.satz) texte.push(s.satz); } }
    }
    // Kapitel 3 mit Lagen (Bauplan NR20-22 P2 Textvorrang und Sperre): Größen-Sätze, eigener Abgang, Planungsfehler-Sperre,
    // Zwischenstand, Geld. Jeder Fall muss seinen Satz wirklich zeigen (Kennwort), sonst prüft die Länge nichts.
    const lk = lageBauen(werte, NAME20);
    const tk = new Tutorial(lk);
    const nimm = (lage: TutorialLeitungsLage, kennwort: RegExp, geld = 0): void => {
      lk.leitungen = lage; lk.geldFehlt = geld; tk.zustandPruefen();
      const a = tk.ansicht(T0)!;
      const s = tk.sperre('abschliessen');
      expect(s).not.toBeNull();
      expect(s!.kurz.length).toBeLessThanOrEqual(18);
      texte.push(a.text, s!.satz);
      expect([a.schritt, kennwort.test(a.text) || kennwort.test(s!.satz)]).toEqual([a.schritt, true]);
    };
    bis(tk, lk, 'T13');
    nimm(lageZuDuenn(), /randvoll/);
    nimm(lageZuDuenn(), /passt nicht zum Plan/);
    bis(tk, lk, 'T13w');
    nimm(leitungsLage({ haupt: true }, FREMD_HAUS2), /gestreifte Stück/);
    bis(tk, lk, 'T13h');
    nimm(leitungsLage({ haupt: true, haus1: true }), /zweiten Haus/);
    nimm(lageZuDick(), /Für ein Haus reicht/);
    nimm(leitungsLage({ haupt: true, haus1: true }, FREMD_HAUS2), /gestreifte Stück/);
    nimm(leitungsLage({ haupt: true, haus1: true, haus2: true }, { planungsfehler: true }), /passt nicht zum Plan/);
    nimm(leitungsLage({ haupt: true, haus1: true }), /Geld/, 1);
    expect(jetzt(tk)).toBe('T13h');
    for (const [k, s, l6] of wiedereinstiegsLagen(werte, NAME20)) {
      const tw = new Tutorial(l6, { wiedereinstieg: true });
      const a = tw.ansicht(T0)!;
      expect([s, a.schritt, a.kapitel]).toEqual([s, s, k]);
      texte.push(a.text);
      tipp(tw, 'weiter');
      expect([s, jetzt(tw)]).toEqual([s, s]);
      texte.push(tw.ansicht(T0)!.text);
    }
    expect(texte.length).toBeGreaterThan(60);
    for (const s of texte) {
      expect([s, sichtbar(s).length <= TUTORIAL_TEXT_MAX]).toEqual([s, true]);
      expect([s, saetze(s, NAME20) <= 2]).toEqual([s, true]);
      expect([s, /\{[^}]*\}/.test(s)]).toEqual([s, false]);
    }
    expect(TUTORIAL_TEXT_MAX).toBe(120);
  });

  it('test_nr13_geld_satz_laenge – Geld-Satz mit 20-Zeichen-Namen ≤ 120 Zeichen, 2 Sätze', () => {
    const l = lageBauen({}, NAME20);
    const t = new Tutorial(l);
    bis(t, l, 'T13');
    l.geldFehlt = 500; t.zustandPruefen();
    const s = t.ansicht(T0)!.text;
    expect(s).toBe(TEXT.geld);
    expect(s.length).toBe(91);
    expect(saetze(s, NAME20)).toBe(2);
  });

  it('test_nr13_texte_aus_werten – Platzhalter mit Einheit, Format mit Tausenderpunkt und Dezimalkomma', () => {
    const t03 = (kessel_kw: number): string => { const l = lageBauen({ kessel_kw }); const t = new Tutorial(l); bis(t, l, 'T03'); return t.ansicht(T0)!.text; };
    const ende = (s: string): string => s.slice(s.indexOf('schafft ') + 8);
    expect(ende(t03(60))).toBe(`60${NB}kW.`);
    expect(ende(t03(75))).toBe(`75${NB}kW.`);
    expect(ende(t03(1234.56))).toBe(`1.234,6${NB}kW.`);
    expect(ende(t03(59.96))).toBe(`60${NB}kW.`);
    expect(ende(t03(7.25))).toBe(`7,3${NB}kW.`);
    expect(ende(t03(1_000_000))).toBe(`1.000.000${NB}kW.`);
    expect(ende(t03(0))).toBe(`0${NB}kW.`);
    expect(() => t03(Number.NaN)).toThrow();
    expect(() => t03(Number.POSITIVE_INFINITY)).toThrow();

    const l = lageBauen({ haupt: 'd40', anschluss: 'd32', kw_summe: 22.5 });
    const t = new Tutorial(l);
    bis(t, l, 'T06');
    expect(t.ansicht(T0)!.info_kapsel).toBe(`15.000${NB}kWh im Jahr · bis 10${NB}kW`);
    bis(t, l, 'T07');
    expect(t.ansicht(T0)!.info_kapsel).toBe(`15.000${NB}kWh im Jahr · bis 10${NB}kW`);
    bis(t, l, 'T12');
    const a = t.ansicht(T0)!;
    expect(a.text).toBe('Fertig geplant! Zuerst die **Hauptleitung**: Nimm die dicke 40er, sie trägt die Wärme für beide Häuser.');
    expect(a.leitung_typ).toBe('d40');
    tipp(t, 'leitungskarte', { typ: 'd32' });
    expect(jetzt(t)).toBe('T12');
    tipp(t, 'leitungskarte', { typ: 'd40' });
    expect(jetzt(t)).toBe('T13');
    expect(t.ansicht(T0)!.text).toBe('Zieh die 40er von der Heizzentrale bis zur Abzweigung. Folge der Spur.');
    bis(t, l, 'T13w');
    expect(t.ansicht(T0)!.text).toBe(`Bis hier fließen 22,5${NB}kW für beide Häuser, ab hier **je Haus nur** 7,5${NB}kW. Dafür reicht die 32er.`);
    for (let i = 0; i < 3; i++) tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe('Tippe rechts in der Leiste auf 32.');
    tipp(t, 'farbknopf', { typ: 'd25' });
    expect(jetzt(t)).toBe('T13w');
    tipp(t, 'farbknopf', { typ: 'd32' });
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13h', text: 'Jedes Haus bekommt seinen eigenen **Hausanschluss**. Zieh die 32er bis ans erste Haus.' });
    bis(t, l, 'T17');
    expect(t.ansicht(T0)!.text).toContain(`reichen 7,5${NB}kW statt 10${NB}kW aus dem Netz`);
    l.werte = { ...l.werte, kw_puffer: 12.5, kw_ohne: 17.5 };
    expect(t.ansicht(T0)!.text).toContain(`reichen 12,5${NB}kW statt 17,5${NB}kW aus dem Netz`);

    const ln = lageBauen({}, 'Mia');
    expect(new Tutorial(ln).ansicht(T0)!.text.startsWith('Hallo Mia! Ich bin Simon')).toBe(true);
  });

  it('test_nr13_ansicht_felder – Darstellungsfelder je Schritt (Tabelle Bauplan P1)', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    type Teil = Partial<Record<string, unknown>>;
    const HZ3 = ['heizzentrale', 'haus1', 'haus2'];
    const erwartet: Record<TutorialSchrittId, Teil> = {
      T01: { art: 'H', ziele: ['heizzentrale'], finger: 'tippen', kamera_ziele: ['heizzentrale'], weiter: null },
      T02: { art: 'W', ziele: ['heizzentrale'], finger: 'aus', kamera_ziele: ['heizzentrale'], effekt: 'hz_federn', weiter: 'weiter' },
      T03: { ziele: ['heizzentrale', 'waerme_pille'], finger: 'aus', kamera_ziele: ['heizzentrale'], effekt: 'pille_huepfen' },
      T04: { ziele: ['heizzentrale'], finger: 'aus', kamera_ziele: ['heizzentrale'], effekt: undefined },
      T05: { ziele: ['haus1', 'haus2'], kamera: 'fahrt', kamera_ziele: ['haus1', 'haus2'] },
      T06: { ziele: ['haus1'], kamera_ziele: ['haus1'], kamera: 'steht' },
      T07: { ziele: ['haus1'], kamera_ziele: ['haus1'] },
      T08: { art: 'H', ziele: ['bauen'], finger: 'tippen', kamera_ziele: [], info_kapsel: undefined },
      T09: { art: 'H', ziele: ['reiter_leitungen'], finger: 'tippen' },
      T10: { ziele: ['philipp'], finger: 'tippen' },
      T11: { art: 'W', ziele: ['kasten_abschnitt'], finger: 'aus', weiter: 'wartet' },
      T12: { ziele: ['leitungskarte'], finger: 'tippen', leitung_typ: 'd32', kamera_ziele: HZ3, abdunkeln: 'alles', ruhe: true },
      // NR20/NR21 Schritt-Tabelle Bauplan NR20-22 P2 (B6) und §5
      T13: { ziele: [], finger: 'spur', abdunkeln: 'nur_hud', kamera: 'frei', kamera_ziele: HZ3, kamera_grenze: true, spur: true, erreicht_zeigen: true, leitung_typ: undefined,
        zielscheibe: [10, 12], naechstes_feld: [10, 11], finger_weg: [[10, 11], [10, 12]], ziel_ring: null, zeichenleiste: { typ: 'd32' },
        zeichnen_ruht: false, kompakt: true, ruhe: true, farbknopf_ring: null },
      T13w: { ziele: [], finger: 'tippen', abdunkeln: 'nur_hud', kamera: 'frei', kamera_ziele: HZ3, kamera_grenze: true, spur: true, erreicht_zeigen: true,
        zielscheibe: [10, 12], naechstes_feld: [10, 12], finger_weg: [], ziel_ring: null, zeichenleiste: { typ: 'd32' }, zeichnen_ruht: true,
        kompakt: true, ruhe: true, farbknopf_ring: 'd25' },
      T13h: { ziele: [], finger: 'spur', abdunkeln: 'nur_hud', kamera: 'frei', kamera_ziele: HZ3, kamera_grenze: true, spur: true, erreicht_zeigen: true,
        zielscheibe: null, naechstes_feld: [9, 12], zeichenleiste: { typ: 'd25' }, zeichnen_ruht: false, kompakt: true, ruhe: true, farbknopf_ring: null },
      T14: { ziele: ['abschliessen'], finger: 'tippen', abdunkeln: 'alles', kamera: 'steht', kamera_grenze: false, spur: false, erreicht_zeigen: false, ruhe: true },
      T15: { ziele: ['haus1'], finger: 'tippen', kamera_ziele: ['haus1'], normale_aktion: true },
      T16: { art: 'W', ziele: ['kasten_station'], finger: 'aus', kamera_ziele: ['haus1'], normale_aktion: false },
      T17: { art: 'H', ziele: ['puffer_knopf', 'haus1'], finger: 'tippen', kamera_ziele: ['haus1'], nach_handlung_schliessen: 'blatt' },
      T18: { ziele: ['haus2'], finger: 'tippen', kamera_ziele: ['haus2'], normale_aktion: true, nach_handlung_schliessen: undefined },
      T19: { ziele: ['puffer_knopf'], finger: 'tippen', kamera_ziele: ['haus2'], nach_handlung_schliessen: 'blatt', normale_aktion: false },
      T20: { ziele: ['bauen'], finger: 'tippen', kamera_ziele: [], nach_handlung_schliessen: undefined },
      T21: { ziele: ['laura'], finger: 'tippen', nach_handlung_schliessen: 'baumenue' },
      T22: { art: 'W', ziele: [], finger: 'aus', abdunkeln: 'nichts', kamera: 'fahrt', kamera_ziele: HZ3 },
      T23: { ziele: ['geld_pille'], abdunkeln: 'alles', kamera: 'steht', kamera_ziele: [], weiter: 'wartet' },
      T24: { ziele: ['haus1', 'haus2'], weiter: 'weiter', wusstest_du: false },
      T25: { ziele: ['leitungsstueck'], wusstest_du: true },
      T26: { ziele: [], abdunkeln: 'nichts', weiter: 'los', wusstest_du: false },
    };
    const AUS = { finger: 'aus', abdunkeln: 'alles', kamera: 'steht', kamera_ziele: [], kamera_grenze: false, spur: false,
      erreicht_zeigen: false, normale_aktion: false, wusstest_du: false, wiedereinstieg: false,
      band: [], zielscheibe: null, naechstes_feld: null, finger_weg: [], fremd: [], ziel_stecker: [], ziel_ring: null, zeichenleiste: null,
      zeichnen_ruht: false, kompakt: false, ruhe: false, farbknopf_ring: null };
    const K3 = ['T13', 'T13w', 'T13h'];
    for (const id of ALLE) {
      bis(t, l, id);
      const a = t.ansicht(T0)! as unknown as Record<string, unknown>;
      const soll: Record<string, unknown> = { ...AUS, ...erwartet[id] };
      if (K3.includes(id)) { delete soll.band; soll.ziel_stecker = [h1(l).id, h2(l).id]; }
      for (const [k, v] of Object.entries(soll)) expect([id, k, a[k]]).toEqual([id, k, v]);
      if (!['T06', 'T07'].includes(id)) expect([id, a.info_kapsel]).toEqual([id, undefined]);
      if (!['T02', 'T03'].includes(id)) expect([id, a.effekt]).toEqual([id, undefined]);
      if (!['T17', 'T19', 'T21'].includes(id)) expect([id, a.nach_handlung_schliessen]).toEqual([id, undefined]);
      if (id !== 'T12') expect([id, a.leitung_typ]).toEqual([id, undefined]);
      expect(a.objekt_ids).toMatchObject({ heizzentrale: hz(l).id, haus1: h1(l).id, haus2: h2(l).id });
      if (id === 'T13h') {
        // Hausmitte nach Bauplan NR20-22 P2 K2: [x + (g − 1) / 2, y + (g − 1) / 2]
        const g = KATALOG[h1(l).typ].groesse ?? 1;
        expect(a.finger_weg).toEqual([[9, 12], [h1(l).x + (g - 1) / 2, h1(l).y + (g - 1) / 2]]);
        expect(a.ziel_ring).toBe(h1(l).id);
      }
    }
  });

  it('test_nr13_kamera_ziele_t05_t13_t22 – Kamera-Ziele und Kamera-Art', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T05');
    expect(t.ansicht(T0)!).toMatchObject({ kamera: 'fahrt', kamera_ziele: ['haus1', 'haus2'] });
    bis(t, l, 'T13');
    expect(t.ansicht(T0)!).toMatchObject({ kamera: 'frei', kamera_ziele: ['heizzentrale', 'haus1', 'haus2'] });
    bis(t, l, 'T22');
    expect(t.ansicht(T0)!).toMatchObject({ kamera: 'fahrt', kamera_ziele: ['heizzentrale', 'haus1', 'haus2'] });
  });

  it('test_nr13_leitungsstueck_t25 – gebautes Feld nächst der Mitte HZ/Haus 1 plus Nachbarn, geplante zählen nicht', () => {
    // Mitte HZ (11|10, 2×2) = (12|11), Mitte Haus 1 (9|13) = (9,5|13,5) → (10,75|12,25). Feldmitten der Spur (10,5|y+0,5):
    // (10|12) Abstand² 0,125 – am nächsten; (10|11) 0,625; (10|13) 1,625.
    const l = lageBauen();
    const s = [[10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [11, 14]].map(([x, y]) => leitungLegen(l, x, y, false));
    const t = new Tutorial(l);
    bis(t, l, 'T24');
    expect(t.ansicht(T0)!.objekt_ids.leitungsstueck).toEqual([]);
    tipp(t, 'weiter');
    expect(t.ansicht(T0)!.objekt_ids.leitungsstueck).toEqual([s[2].id, s[1].id, s[3].id]);
    tipp(t, 'weiter');
    expect(t.ansicht(T0)!.objekt_ids.leitungsstueck).toEqual([]);

    const g = lageBauen();
    const a = leitungLegen(g, 10, 10, false), b = leitungLegen(g, 10, 11, false);
    leitungLegen(g, 10, 12, true);
    leitungLegen(g, 10, 13, false);
    const tg = new Tutorial(g);
    bis(tg, g, 'T25');
    expect(tg.ansicht(T0)!.objekt_ids.leitungsstueck).toEqual([b.id, a.id]);
    expect(g.stand.objekte.filter((o) => istLeitung(o.typ)).length).toBe(4);
  });

  it('test_nr13_leitungsstueck_gleichstand – bei gleichem Abstand gewinnt die kleinere id', () => {
    // (11|12) und (10|11) liegen gleich weit von (10,75|12,25): Feldmitten (11,5|12,5) und (10,5|11,5) → je 0,625.
    // Sie liegen schräg zueinander, sind also keine Leitungsnachbarn.
    for (const rechtsZuerst of [true, false]) {
      const l = lageBauen();
      const erstes = rechtsZuerst ? leitungLegen(l, 11, 12, false) : leitungLegen(l, 10, 11, false);
      if (rechtsZuerst) leitungLegen(l, 10, 11, false); else leitungLegen(l, 11, 12, false);
      const t = new Tutorial(l);
      bis(t, l, 'T25');
      expect(t.ansicht(T0)!.objekt_ids.leitungsstueck).toEqual([erstes.id]);
    }
  });

  it('test_nr13_wiedereinstieg_tabelle – Zustand → Schritt nach DESIGN 13.7', () => {
    const fall = (vorher: (l: Testlage) => void): Testlage => { const l = lageBauen(); vorher(l); return l; };
    const kap = (l: Testlage, k: number): void => { l.stand.tutorial = { kapitel: k }; };
    expect(einstieg(fall(() => {}))).toBe('T01');
    expect(einstieg(fall((l) => kap(l, 2)))).toBe('T08');
    expect(einstieg(fall((l) => kap(l, 3)))).toBe('T08');
    expect(einstieg(fall((l) => { kap(l, 2); l.stand.abschnitt = { phase: 'planung', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 5000 } }; }))).toBe('T11');
    expect(einstieg(fall((l) => { kap(l, 3); l.stand.abschnitt = { phase: 'bestellen', bau: null }; }))).toBe('T15');
    expect(einstieg(fall((l) => { kap(l, 4); l.stand.abschnitt = { phase: 'bestellen', bau: null }; h1(l).station = 'p'; }))).toBe('T18');
    expect(einstieg(fall((l) => { kap(l, 4); l.stand.abschnitt = { phase: 'bestellen', bau: null }; h1(l).station = 'p'; h2(l).station = 'p'; }))).toBe('T20');
    expect(einstieg(fall((l) => { kap(l, 5); l.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 9000 } }; }))).toBe('T22');
    expect(einstieg(fall((l) => { kap(l, 5); l.netz.warm = new Set([h1(l).id, h2(l).id]); }))).toBe('T24');
    expect(einstieg(fall((l) => { kap(l, 6); l.netz.warm = new Set([h1(l).id, h2(l).id]); }))).toBe('T24');
    expect(einstieg(fall((l) => { kap(l, 5); l.netz.warm = new Set([h1(l).id]); }))).toBe('T08');

    // Phase offen (Bauplan NR20-22 P2 „Wiedereinstieg“, fünf Zeilen in dieser Reihenfolge): !haupt_ok → T12; fremd ≠ [] → T13h;
    // nicht beide Häuser ok → T13w; planungsfehler → T13h; sonst T14. Es zählt die Leitungslage, nicht erreichteHaeuser.
    const offen = (z: Ziel, extra: Partial<TutorialLeitungsLage> = {}): Testlage =>
      fall((l) => { kap(l, 3); l.stand.abschnitt = { phase: 'offen', bau: null }; setze(l, z, extra); });
    const ALLE_OK: Ziel = { haupt: true, haus1: true, haus2: true };
    // Zeile 1: ohne richtige Hauptleitung T12 – auch wenn sonst alles da ist oder ein eigener Abgang liegt.
    expect(einstieg(offen({}))).toBe('T12');
    expect(einstieg(offen({ haus1: true, haus2: true }))).toBe('T12');
    expect(einstieg(offen({}, { haupt_zu_duenn: true, ...FREMD_HAUS2 }))).toBe('T12');
    // Zeile 2: eigener Abgang → T13h, vor „nicht beide Häuser ok“ (sonst wäre es T13w) und auch bei beiden ok (Vierer-Ring).
    expect(einstieg(offen({ haupt: true, haus1: true }, FREMD_HAUS2))).toBe('T13h');
    expect(einstieg(offen({ haupt: true }, { fremd: [[11, 13], [11, 12]], fremd_haus: 2 }))).toBe('T13h');
    expect(einstieg(offen(ALLE_OK, { planungsfehler: true, fremd: [[11, 13]], fremd_haus: null }))).toBe('T13h');
    // Zeile 3: nicht beide Häuser richtig → T13w, auch mit Planungsfehler (normaler Zwischenstand) und auch, wenn beide nur „verbunden“ sind.
    expect(einstieg(offen({ haupt: true }))).toBe('T13w');
    expect(einstieg(offen({ haupt: true, haus1: true }))).toBe('T13w');
    expect(einstieg(offen({ haupt: true, haus2: true }))).toBe('T13w');
    expect(einstieg(offen({ haupt: true }, { planungsfehler: true }))).toBe('T13w');
    const nurVerbunden = offen({ haupt: true, haus1: true });
    nurVerbunden.erreicht = [h1(nurVerbunden).id, h2(nurVerbunden).id];
    expect(einstieg(nurVerbunden)).toBe('T13w');
    expect(einstieg(offen({ haupt: true, haus1: true }, lageZuDick()))).toBe('T13w');
    // Zeile 4: beide richtig, aber Planungsfehler → T13h, nie T14.
    expect(einstieg(offen(ALLE_OK, { planungsfehler: true }))).toBe('T13h');
    // Zeile 5: sonst T14.
    const beide = offen(ALLE_OK);
    expect(einstieg(beide)).toBe('T14');

    // T13w mit haus1_ok: nach dem Farbknopf gleich der Zwischenstand.
    const halb = offen({ haupt: true, haus1: true });
    const th = new Tutorial(halb);
    expect(jetzt(th)).toBe('T13w');
    tipp(th, 'farbknopf', { typ: 'd25' });
    expect(th.ansicht(T0)!).toMatchObject({ schritt: 'T13h', text: TEXT.zwischenstand });
    // Eigener Abgang: Satz sofort.
    expect(new Tutorial(offen({ haupt: true, haus1: true }, FREMD_HAUS2)).ansicht(T0)!).toMatchObject({ schritt: 'T13h', text: TEXT.eigenerAbgang });
    // Beide richtig ohne Fehler: gleich T14; fehlt Geld, fällt T14 beim Prüfen auf T13h mit Geld-Satz zurück (P2 „Rückwärts“).
    expect(new Tutorial(beide).ansicht(T0)!).toMatchObject({ schritt: 'T14', text: TEXT.T14 });
    const arm = offen(ALLE_OK);
    arm.geldFehlt = 300;
    const ta = new Tutorial(arm);
    ta.zustandPruefen();
    expect(ta.ansicht(T0)!).toMatchObject({ schritt: 'T13h', text: TEXT.geld });
  });

  it('test_nr13_wiedereinstieg_blase – „Weiter geht’s …“ mit Kapitel des berechneten Schritts, dann der Schritt', () => {
    const l = lageBauen();
    l.stand.tutorial = { kapitel: 2 };
    l.stand.abschnitt = { phase: 'bestellen', bau: null };
    const t = new Tutorial(l, { wiedereinstieg: true });
    let a = t.ansicht(T0)!;
    expect(a).toMatchObject({ schritt: 'T15', kapitel: 4, kapitel_name: 'Übergabestationen', art: 'W', weiter: 'weiter', ziele: [],
      finger: 'aus', wiedereinstieg: true, normale_aktion: false });
    expect(a.text).toBe('Weiter geht’s, Chef! Wir waren gerade bei: Übergabestationen.');
    tipp(t, 'haus', { objekt_id: h1(l).id });
    expect(t.ansicht(T0)!.wiedereinstieg).toBe(true);
    tipp(t, 'weiter');
    a = t.ansicht(T0)!;
    expect(a).toMatchObject({ schritt: 'T15', art: 'H', wiedereinstieg: false, text: TEXT.T15, ziele: ['haus1'], normale_aktion: true });
    expect(l.kapitelGesetzt).toEqual([]);

    const w = lageBauen();
    w.stand.tutorial = { kapitel: 6 };
    w.netz.warm = new Set([h1(w).id, h2(w).id]);
    expect(new Tutorial(w, { wiedereinstieg: true }).ansicht(T0)!.text).toBe('Weiter geht’s, Chef! Wir waren gerade bei: Warm!');
    expect(new Tutorial(w).ansicht(T0)!).toMatchObject({ schritt: 'T24', wiedereinstieg: false, text: TEXT.T24 });
  });

  it('test_nr13_sperren – Grundzustand gesperrt, Gesten nur in T13–T13h, Abschließen-Sperre in T13–T13h nach Reihenfolge P2, außerhalb nichts', () => {
    const IMMER: Bedienung[] = ['zoom', 'doerfer', 'auftrag', 'verwerfen', 'sofort', 'express', 'weiter_einzeichnen', 'blatt_schliessen'];
    // DESIGN 13.16 K4: Aktionen, die das Tutorial nie freigibt, zeigen „nach dem Tutorial“; alle übrigen Sperren „später wählbar“
    const NACH_TUTORIAL: Bedienung[] = ['verwerfen', 'sofort', 'express', 'weiter_einzeichnen'];
    const kurzErwartet = (b: Bedienung): string => (NACH_TUTORIAL.includes(b) ? 'nach dem Tutorial' : 'später wählbar');
    const l = lageBauen();
    const t = new Tutorial(l);
    for (const b of [...IMMER, 'karte_gesten' as const]) {
      const s = t.sperre(b)!;
      expect([b, s.kurz]).toEqual([b, kurzErwartet(b)]);
    }
    expect(t.sperre('abschliessen')).toBeNull();
    bis(t, l, 'T13');
    for (const b of IMMER) expect([b, t.sperre(b) !== null]).toEqual([b, true]);
    expect(t.sperre('karte_gesten')).toBeNull();
    expect(t.sperre('blatt_schliessen')!.satz).toBe(TEXT.leisteOffen);
    // Abschließen-Sperre in T13, T13w, T13h (Bauplan NR20-22 P2, Schritt-Tabelle): Geld > Stück muss weg (fremd) >
    // Größe passt nicht (Rolle falsch) > Häuser fehlen > Größe passt nicht (Planungsfehler, Fachprüfer-Satz).
    const ZWEI = { kurz: `2${NB}Häuser fehlen`, satz: TEXT.zuFrueh };
    const EINS = { kurz: `noch 1${NB}Haus fehlt`, satz: TEXT.zuFrueh };
    const GROESSE = { kurz: 'Größe passt nicht', satz: TEXT.groesse };
    const WEG = { kurz: 'Stück muss weg', satz: TEXT.eigenerAbgang };
    const GELD = { kurz: 'Geld reicht nicht', satz: TEXT.geld };
    const pruefe = (s: TutorialSchrittId, lage: TutorialLeitungsLage, geld: number, erwartet: { kurz: string; satz: string } | null): void => {
      l.leitungen = lage; l.geldFehlt = geld; t.zustandPruefen();
      expect([s, jetzt(t), t.sperre('abschliessen')]).toEqual([s, s, erwartet]);
    };
    pruefe('T13', leitungsLage(), 0, ZWEI);
    pruefe('T13', leitungsLage({}, { planungsfehler: true }), 0, ZWEI);
    pruefe('T13', lageZuDuenn(), 0, GROESSE);
    pruefe('T13', lageZuDuenn(FREMD_HAUS2), 0, WEG);
    pruefe('T13', lageZuDuenn(FREMD_HAUS2), 1, GELD);
    pruefe('T13', leitungsLage(), 1, GELD);
    // In T13w und T13h dieselbe Reihenfolge (Lagen mit richtiger Hauptleitung, nie beide Häuser richtig).
    const reihe = (s: TutorialSchrittId): void => {
      expect([s, t.sperre('karte_gesten')]).toEqual([s, null]);
      // Haus 1 mit 32er (9|12) und eigener Abgang zu Haus 2: alles zugleich falsch
      const allesFalsch = mitFalscherGroesse(leitungsLage({ haupt: true, haus1: true }), 9, 12, 'd32',
        { haus1_ok: false, anschluss_zu_dick: true, planungsfehler: true, ...FREMD_HAUS2 });
      pruefe(s, allesFalsch, 1, GELD);
      pruefe(s, allesFalsch, 0, WEG);
      pruefe(s, leitungsLage({ haupt: true, haus1: true }, FREMD_HAUS2), 0, WEG);
      pruefe(s, lageZuDick({ planungsfehler: true }), 0, GROESSE);
      pruefe(s, lageZuDick(), 0, GROESSE);
      pruefe(s, leitungsLage({ haupt: true, haus1: true }, { planungsfehler: true }), 0, EINS);
      pruefe(s, leitungsLage({ haupt: true, haus2: true }, { planungsfehler: true }), 0, EINS);
      pruefe(s, leitungsLage({ haupt: true }, { planungsfehler: true }), 0, ZWEI);
      pruefe(s, leitungsLage({ haupt: true }), 0, ZWEI);
      pruefe(s, leitungsLage({ haupt: true, haus1: true }), 1, GELD);
    };
    l.geldFehlt = 0;
    bis(t, l, 'T13w');
    reihe('T13w');
    tipp(t, 'farbknopf', { typ: 'd25' });
    expect(jetzt(t)).toBe('T13h');
    reihe('T13h');
    // Nur in T13h erreichbar: beide Häuser richtig. Planungsfehler sperrt mit dem Fachprüfer-Satz und hält T13h fest;
    // ein Abseits-Stück (Vierer-Ring, fremd_haus null) sperrt mit „Stück muss weg“; Geld geht weiter vor.
    const ALLE_OK: Ziel = { haupt: true, haus1: true, haus2: true };
    pruefe('T13h', leitungsLage(ALLE_OK, { planungsfehler: true }), 0, GROESSE);
    pruefe('T13h', leitungsLage(ALLE_OK, { planungsfehler: true, fremd: [[11, 13]], fremd_haus: null }), 0, WEG);
    pruefe('T13h', leitungsLage(ALLE_OK, { planungsfehler: true }), 1, GELD);
    l.leitungen = leitungsLage(ALLE_OK); l.geldFehlt = 0; t.zustandPruefen();
    expect(jetzt(t)).toBe('T14');
    expect(t.sperre('abschliessen')).toBeNull();
    expect(t.sperre('karte_gesten')!.kurz).toBe('später wählbar');
    l.geldFehlt = 1;
    expect(t.sperre('abschliessen')).toBeNull();
    for (const b of IMMER) expect([b, t.sperre(b)!.kurz]).toEqual([b, kurzErwartet(b)]);

    const alt = lageBauen();
    delete alt.stand.tutorial;
    const ta = new Tutorial(alt);
    expect(ta.aktiv()).toBe(false);
    expect(ta.ansicht(T0)).toBeNull();
    for (const b of [...IMMER, 'karte_gesten' as const, 'abschliessen' as const]) expect(ta.sperre(b)).toBeNull();
  });

  it('test_nr13_sperr_satz_vorrang – Sperr-Satz vor Hilfe, bis handlung() oder Schritt-Ereignis', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T13');
    t.gesperrtGetippt('abschliessen');
    expect(t.ansicht(T0)!.text).toBe(TEXT.zuFrueh);
    t.handlung();
    expect(t.ansicht(T0)!.text).toBe(TEXT.T13);
    for (let i = 0; i < 3; i++) tipp(t, 'daneben');
    t.gesperrtGetippt('abschliessen');
    expect(t.ansicht(T0)!.text).toBe(TEXT.zuFrueh);
    tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe(TEXT.zuFrueh);
    t.handlung();
    expect(t.ansicht(T0)!.text).toBe(TEXT.hilfeT13);
    t.gesperrtGetippt('blatt_schliessen');
    expect(t.ansicht(T0)!.text).toBe(TEXT.leisteOffen);
    schritt(t, 'leitung_gezeichnet', 1234);
    expect(t.ansicht(T0)!.text).toBe(TEXT.hilfeT13);
    // Grundzustand ohne Satz (liegt unter dem Abdunkeln): die Blase bleibt, wie sie ist.
    t.gesperrtGetippt('zoom');
    expect(t.ansicht(T0)!.text).toBe(TEXT.hilfeT13);
    // Freie Bedienung (in T13 die Gesten): kein Satz.
    t.gesperrtGetippt('karte_gesten');
    expect(t.ansicht(T0)!.text).toBe(TEXT.hilfeT13);
  });

  it('test_nr13_sperr_satz_weicht_bei_schrittwechsel', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    t.gesperrtGetippt('blatt_schliessen');
    tipp(t, 'heizzentrale');
    expect(t.ansicht(T0)!.text).toBe(TEXT.T02);
  });

  it('test_nr13_k12_haeuser_saetze_weichen_dem_geld_satz – beide angeschlossen, Geld fehlt (T13h)', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T13h');
    l.geldFehlt = 200;
    setze(l, { haupt: true, haus1: true, haus2: true }); schritt(t, 'haus_erreicht', h2(l).id);
    expect(jetzt(t)).toBe('T13h');
    t.gesperrtGetippt('blatt_schliessen');
    expect(t.ansicht(T0)!.text).toBe(TEXT.geld);
    t.handlung();
    for (let i = 0; i < 3; i++) tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe(TEXT.geld);
  });

  it('test_nr13_t13_weg_b_geldmangel – Geld fehlt: bleibt T13h mit Geld-Satz; T14 nur bei beiden Häusern und genug Geld', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T13h');
    schritt(t, 'leitung_gezeichnet', 1);
    l.geldFehlt = 500;
    setze(l, { haupt: true, haus1: true, haus2: true }); schritt(t, 'haus_erreicht', h2(l).id);
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13h', text: TEXT.geld });
    expect(t.sperre('abschliessen')!.kurz).toBe('Geld reicht nicht');
    l.geldFehlt = 0; t.zustandPruefen();
    // Der Zug von Z. „leitung_gezeichnet“ läuft noch: kein T14 vor dem Abheben (Bauplan NR20-22 P2 [2.3]).
    expect(jetzt(t)).toBe('T13h');
    tipp(t, 'abgehoben');
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T14', text: TEXT.T14, finger: 'tippen' });
    l.geldFehlt = 1; t.zustandPruefen();
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13h', text: TEXT.geld, finger: 'spur' });
    l.geldFehlt = 0; t.zustandPruefen();
    expect(jetzt(t)).toBe('T14');
    setze(l, { haupt: true, haus1: true }); t.zustandPruefen();
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13h', text: TEXT.zwischenstand, finger: 'spur' });
    l.geldFehlt = 10;
    expect(t.ansicht(T0)!.text).toBe(TEXT.geld);
    expect(l.kapitelGesetzt).toEqual([2, 3]);

    // Rückfall T14 → T13h ist ein Schrittwechsel: Fehltipps beginnen bei 0.
    l.geldFehlt = 0; setze(l, { haupt: true, haus1: true, haus2: true }); t.zustandPruefen();
    for (let i = 0; i < 3; i++) tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe('Unten in der Leiste: Abschnitt abschließen.');
    setze(l, { haupt: true }); t.zustandPruefen();
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13h', text: TEXT.T13h });
    tipp(t, 'daneben'); tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe(TEXT.T13h);

    // Die Bedingung gilt auch bei Tipp und handlung().
    setze(l, { haupt: true, haus1: true, haus2: true });
    t.handlung();
    expect(jetzt(t)).toBe('T14');
    l.geldFehlt = 3;
    tipp(t, 'daneben');
    expect(jetzt(t)).toBe('T13h');

    // zustandPruefen außerhalb von T13/T14 ändert nichts.
    const a = lageBauen();
    const ta = new Tutorial(a);
    a.erreicht = [h1(a).id, h2(a).id];
    ta.zustandPruefen();
    expect(jetzt(ta)).toBe('T01');
    bis(ta, a, 'T15');
    a.geldFehlt = 99; a.erreicht = [];
    ta.zustandPruefen();
    expect(jetzt(ta)).toBe('T15');
  });

  it('test_nr13_handlungsschritt_mit_erfuelltem_zustand – beim Eintritt sofort weiter (T17 übersprungen, wenn Haus 1 schon eine Station hat)', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T16');
    h1(l).station = 'puffer';
    tipp(t, 'weiter');
    expect(jetzt(t)).toBe('T18');
  });

  it('test_nr13_ohne_namen_keine_ansicht – solange das Namensfenster offen ist, keine Ansicht', () => {
    const l = lageBauen();
    l.stand.namen_gefragt = false;
    const t = new Tutorial(l);
    expect(t.ansicht(T0)).toBeNull();
    l.stand.namen_gefragt = true;
    expect(jetzt(t)).toBe('T01');
  });

  it('test_nr13_tutorial_haeuser_fehlen – ohne die zwei ersten Häuser kein Tutorial, kein Absturz', () => {
    const l = lageBauen();
    l.stand.objekte = l.stand.objekte.filter((o) => !(o.x === 12 && o.y === 14));
    const t = new Tutorial(l);
    expect(t.aktiv()).toBe(false);
    expect(t.ansicht(T0)).toBeNull();
    expect(t.sperre('zoom')).toBeNull();
    tipp(t, 'weiter'); schritt(t, 'haus_erreicht', 3); t.handlung(); t.zustandPruefen(); t.gesperrtGetippt('zoom');
    expect(l.beendet).toBe(0);
    expect(l.kapitelGesetzt).toEqual([]);

    const v = lageBauen();
    const h = h1(v);
    h.x = 8; // gleiches Haus, aber nicht genau auf der Koordinate → zählt nicht
    expect(new Tutorial(v).aktiv()).toBe(false);
    const z = lageBauen();
    z.stand.objekte = z.stand.objekte.filter((o) => o.typ !== 'hz');
    expect(new Tutorial(z).aktiv()).toBe(false);
  });
});

/** Je Kapitel mindestens eine Lage, deren Zustand im Wiedereinstieg den genannten Schritt ergibt; Kapitel 3 mit allen fünf Zeilen
 *  der Wiedereinstieg-Tabelle (Bauplan NR20-22 P2): T12, T13h (fremd), T13w, T13h (Planungsfehler), T14. */
function wiedereinstiegsLagen(werte: Partial<TutorialWerte>, name: string): Array<[number, TutorialSchrittId, Testlage]> {
  const mit = (k: number, s: TutorialSchrittId, f: (l: Testlage) => void): [number, TutorialSchrittId, Testlage] => {
    const l = lageBauen(werte, name); l.stand.tutorial = { kapitel: k }; f(l); return [k, s, l];
  };
  const offen = (z: Ziel, extra: Partial<TutorialLeitungsLage> = {}) => (l: Testlage): void => {
    l.stand.abschnitt = { phase: 'offen', bau: null }; setze(l, z, extra);
  };
  return [
    mit(1, 'T01', () => {}),
    mit(2, 'T08', () => {}),
    mit(3, 'T12', offen({})),
    mit(3, 'T13h', offen({ haupt: true, haus1: true }, FREMD_HAUS2)),
    mit(3, 'T13w', offen({ haupt: true, haus1: true })),
    mit(3, 'T13h', offen({ haupt: true, haus1: true, haus2: true }, { planungsfehler: true })),
    mit(3, 'T14', offen({ haupt: true, haus1: true, haus2: true })),
    mit(4, 'T15', (l) => { l.stand.abschnitt = { phase: 'bestellen', bau: null }; }),
    mit(5, 'T22', (l) => { l.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 1 } }; }),
    mit(6, 'T24', (l) => { l.netz.warm = new Set([h1(l).id, h2(l).id]); }),
  ];
}
