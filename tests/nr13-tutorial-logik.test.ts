import { describe, expect, it } from 'vitest';
import { neuesSpielMitTutorial } from '../src/core/start';
import { KATALOG, istLeitung } from '../src/core/katalog';
import type { Objekt, Spielstand } from '../src/core/typen';
import type { Bedienung, Schritt, Tipp, TutorialSchrittId, TutorialWerte } from '../src/core/tutorial-vertrag';
import { einstieg, Tutorial, TUTORIAL_SCHRITTE, TUTORIAL_TEXT_MAX, TUTORIAL_ZURUFE, type TutorialLage } from '../src/core/tutorial';

// Bauplan docs/bauplaene/NR13-tutorial.md (Fassung 3.1), Paket P1: Schrittlogik ohne Grafik. Die Lage ist ein einfaches Objekt,
// das der Test von Hand stellt (Häuser erreicht, Geld, Abschnitt); erwartete Texte stehen wörtlich aus DESIGN 13.5/13.15.
const T0 = 1_000_000_000_000;
const NB = ' ';
const NAME20 = 'Abcdefghijklmnopqrst';
const WERTE: TutorialWerte = { kessel_kw: 60, kwh: 15000, kw_ohne: 10, kw_puffer: 7.5, leitung: 'd25', kap_kw: 15 };

const TEXT = {
  T01: 'Hallo Chef! Ich bin Simon und zeige dir, wie dein Dorf warm wird. Tippe auf die Heizzentrale.',
  T02: 'Hier steht dein **Wärmeerzeuger**, ein **Hackschnitzelkessel**. Er verbrennt Holzreste und macht damit Wasser heiß.',
  T13: 'Zieh die Leitung mit dem Finger von der Heizzentrale bis an beide Häuser. Folge der gelben Spur.',
  T13b: 'Das erste Haus ist erreicht. Jetzt weiter bis zum zweiten.',
  T14: 'Beide Häuser sind erreicht. Tippe auf Abschnitt abschließen.',
  T15: 'Damit ein Haus die Wärme nehmen kann, braucht es eine **Übergabestation**. Tippe auf das erste Haus.',
  T18: 'Prima! Jetzt bekommt das zweite Haus auch eine. Tippe darauf.',
  T24: 'Geschafft, Chef! Beide Häuser heizen jetzt mit Wärme aus deinem Netz statt mit Öl.',
  geld: 'Dann reicht dein Geld nicht mehr für die Stationen. Nimm mit Zurück ein paar Leitungen weg.',
  leisteOffen: 'Die Leiste bleibt offen, bis beide Häuser erreicht sind.',
  zuFrueh: 'Zieh die Leitung bis an beide Häuser – folge der gelben Spur.',
  hilfeT01: 'Tippe auf das große Gebäude, das gelb leuchtet.',
  hilfeT13: 'Leg den Finger auf die Heizzentrale und zieh ihn die gelbe Spur entlang.',
};

interface Testlage extends TutorialLage {
  stand: Spielstand; netz: { warm: Set<number> }; spielerName: string;
  erreicht: number[]; geldFehlt: number; werte: TutorialWerte; kapitelGesetzt: number[]; beendet: number;
}

function lageBauen(werte: Partial<TutorialWerte> = {}, name = 'Chef'): Testlage {
  const stand = neuesSpielMitTutorial(T0);
  stand.namen_gefragt = true;
  return {
    stand, netz: { warm: new Set<number>() }, spielerName: name, erreicht: [], geldFehlt: 0,
    werte: { ...WERTE, ...werte }, kapitelGesetzt: [], beendet: 0,
    erreichteHaeuser() { return [...this.erreicht]; },
    tutorialWerte() { return this.werte; },
    tutorialGeldFehlt_eur() { return this.geldFehlt; },
    tutorialKapitelSetzen(k: number) { this.kapitelGesetzt.push(k); this.stand.tutorial = { kapitel: k }; },
    tutorialBeenden() { this.beendet++; delete this.stand.tutorial; },
  };
}
const bei = (l: Testlage, x: number, y: number): Objekt => l.stand.objekte.find((o) => o.x === x && o.y === y && KATALOG[o.typ].kategorie === 'haus')!;
const h1 = (l: Testlage): Objekt => bei(l, 9, 13);
const h2 = (l: Testlage): Objekt => bei(l, 12, 14);
const hz = (l: Testlage): Objekt => l.stand.objekte.find((o) => o.typ === 'hz')!;
const tipp = (t: Tutorial, w: Tipp, extra: { objekt_id?: number; typ?: 'd25' | 'd32' | 'd40' } = {}): void => t.tipp({ art: 'tipp', tipp: w, ...extra });
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
    case 'T12': tipp(t, 'leitungskarte', { typ: l.werte.leitung as 'd25' }); return;
    case 'T13':
      l.erreicht = [h1(l).id]; schritt(t, 'haus_erreicht', h1(l).id);
      l.erreicht = [h1(l).id, h2(l).id]; schritt(t, 'haus_erreicht', h2(l).id); return;
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
  for (let i = 0; i < 40 && jetzt(t) !== ziel; i++) richtig(t, l);
  expect(jetzt(t)).toBe(ziel);
}
const ALLE: TutorialSchrittId[] = Array.from({ length: 26 }, (_, i) => `T${String(i + 1).padStart(2, '0')}` as TutorialSchrittId);
const KAPITEL: Record<TutorialSchrittId, number> = Object.fromEntries(ALLE.map((s) => {
  const n = Number(s.slice(1));
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
    const TIPPS: Tipp[] = ['heizzentrale', 'baumenue', 'reiter_leitungen', 'leitungskarte', 'haus', 'weiter', 'daneben'];
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
      if (ziel === 'T12') { tipp(t, 'leitungskarte', { typ: 'd40' }); tipp(t, 'leitungskarte'); }
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

  it('test_nr13_t13_beide_haeuser – ein Haus → T13b, getrennt → T13-Text, beide → T14', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T13');
    expect(t.ansicht(T0)!.text).toBe(TEXT.T13);
    l.erreicht = [h1(l).id]; schritt(t, 'haus_erreicht', h1(l).id);
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13', text: TEXT.T13b });
    l.erreicht = []; schritt(t, 'haus_getrennt', h1(l).id);
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13', text: TEXT.T13 });
    l.erreicht = [h2(l).id]; schritt(t, 'haus_erreicht', h2(l).id);
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13', text: TEXT.T13b });
    l.erreicht = [h2(l).id, h1(l).id]; schritt(t, 'haus_erreicht', h1(l).id);
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T14', text: TEXT.T14, finger: 'tippen', ziele: ['abschliessen'] });
  });

  it('test_nr13_viele_striche_schalten_hoechstens_einmal – Wischen mit vielen leitung_gezeichnet', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T13');
    for (let i = 0; i < 10; i++) schritt(t, 'leitung_gezeichnet', 500 + i);
    expect(jetzt(t)).toBe('T13');
    l.erreicht = [h1(l).id, h2(l).id];
    for (let i = 0; i < 10; i++) schritt(t, 'leitung_gezeichnet', 600 + i);
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
    l.erreicht = [h1(l).id]; schritt(t, 'haus_erreicht', h1(l).id);
    expect(t.ansicht(T0)!.text).toBe(TEXT.T13b);
    l.erreicht = []; schritt(t, 'haus_getrennt', h1(l).id);
    expect(t.ansicht(T0)!.text).toBe(TEXT.hilfeT13);
  });

  it('test_nr13_hilfe_saetze_je_schritt – Hilfe-Sätze aus DESIGN 13.5 wörtlich', () => {
    const erwartet: Partial<Record<TutorialSchrittId, string>> = {
      T01: TEXT.hilfeT01,
      T08: 'Der Knopf Bauen ist unten rechts – er leuchtet gelb.', T20: 'Der Knopf Bauen ist unten rechts – er leuchtet gelb.',
      T09: 'Leitungen ist der Reiter mit dem Rohr – oben im Blatt.',
      T10: 'Tippe auf den leuchtenden Knopf im Blatt.', T21: 'Tippe auf den leuchtenden Knopf im Blatt.',
      T12: 'Tippe auf die leuchtende Leitungs-Karte.', T13: TEXT.hilfeT13, T14: 'Unten in der Leiste: Abschnitt abschließen.',
      T15: 'Tippe auf das leuchtende Haus.', T18: 'Tippe auf das leuchtende Haus.',
      T17: 'Tippe auf Puffer-Übergabestation.', T19: 'Tippe auf Puffer-Übergabestation.',
    };
    for (const [id, satz] of Object.entries(erwartet) as Array<[TutorialSchrittId, string]>) {
      const l = lageBauen();
      const t = new Tutorial(l);
      bis(t, l, id);
      for (let i = 0; i < 3; i++) tipp(t, 'daneben');
      expect([id, t.ansicht(T0)!.text]).toEqual([id, satz]);
      expect(TUTORIAL_SCHRITTE.find((s) => s.id === id)!.hilfe).toBe(satz);
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
      T12: `Fertig geplant! Nimm die 25er – sie trägt im Spiel bis 15${NB}kW, genug für beide Häuser.`,
      T13: TEXT.T13, T14: TEXT.T14, T15: TEXT.T15,
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
    const werte = { kwh: 99_999, kw_ohne: 17.5, kw_puffer: 12.5, kessel_kw: 999, leitung: 'd110' as const, kap_kw: 999 };
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
      if (id === 'T13') {
        lx.erreicht = [h1(lx).id]; schritt(tx, 'haus_erreicht', h1(lx).id); sammle(tx);
        lx.geldFehlt = 1; tx.zustandPruefen(); sammle(tx);
        texte.push(tx.sperre('abschliessen')!.satz);
      }
    }
    for (const [k, l6] of wiedereinstiegsLagen(werte, NAME20)) {
      const tw = new Tutorial(l6, { wiedereinstieg: true });
      const a = tw.ansicht(T0)!;
      expect(a.kapitel).toBe(k);
      texte.push(a.text);
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

    const l = lageBauen({ leitung: 'd32', kap_kw: 30 });
    const t = new Tutorial(l);
    bis(t, l, 'T06');
    expect(t.ansicht(T0)!.info_kapsel).toBe(`15.000${NB}kWh im Jahr · bis 10${NB}kW`);
    bis(t, l, 'T07');
    expect(t.ansicht(T0)!.info_kapsel).toBe(`15.000${NB}kWh im Jahr · bis 10${NB}kW`);
    bis(t, l, 'T12');
    const a = t.ansicht(T0)!;
    expect(a.text).toBe(`Fertig geplant! Nimm die 32er – sie trägt im Spiel bis 30${NB}kW, genug für beide Häuser.`);
    expect(a.leitung_typ).toBe('d32');
    tipp(t, 'leitungskarte', { typ: 'd25' });
    expect(jetzt(t)).toBe('T12');
    tipp(t, 'leitungskarte', { typ: 'd32' });
    expect(jetzt(t)).toBe('T13');
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
      T12: { ziele: ['leitungskarte'], finger: 'tippen', leitung_typ: 'd25', kamera_ziele: HZ3, abdunkeln: 'alles' },
      T13: { ziele: [], finger: 'spur', abdunkeln: 'nur_hud', kamera: 'frei', kamera_ziele: HZ3, kamera_grenze: true, spur: true, erreicht_zeigen: true, leitung_typ: undefined },
      T14: { ziele: ['abschliessen'], finger: 'tippen', abdunkeln: 'alles', kamera: 'steht', kamera_grenze: false, spur: false, erreicht_zeigen: false },
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
      erreicht_zeigen: false, normale_aktion: false, wusstest_du: false, wiedereinstieg: false };
    for (const id of ALLE) {
      bis(t, l, id);
      const a = t.ansicht(T0)! as unknown as Record<string, unknown>;
      const soll = { ...AUS, ...erwartet[id] };
      for (const [k, v] of Object.entries(soll)) expect([id, k, a[k]]).toEqual([id, k, v]);
      if (!['T06', 'T07'].includes(id)) expect([id, a.info_kapsel]).toEqual([id, undefined]);
      if (!['T02', 'T03'].includes(id)) expect([id, a.effekt]).toEqual([id, undefined]);
      if (!['T17', 'T19', 'T21'].includes(id)) expect([id, a.nach_handlung_schliessen]).toEqual([id, undefined]);
      if (id !== 'T12') expect([id, a.leitung_typ]).toEqual([id, undefined]);
      expect(a.objekt_ids).toMatchObject({ heizzentrale: hz(l).id, haus1: h1(l).id, haus2: h2(l).id });
      if (id === 'T13') {
        schritt(t, 'leitung_gezeichnet', 777);
        expect(t.ansicht(T0)!.finger).toBe('aus');
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
    expect(einstieg(fall((l) => { kap(l, 3); l.stand.abschnitt = { phase: 'offen', bau: null }; l.erreicht = [h1(l).id]; }))).toBe('T12');
    const beide = fall((l) => { kap(l, 3); l.stand.abschnitt = { phase: 'offen', bau: null }; l.erreicht = [h1(l).id, h2(l).id]; });
    expect(einstieg(beide)).toBe('T12');
    expect(einstieg(fall((l) => { kap(l, 3); l.stand.abschnitt = { phase: 'bestellen', bau: null }; }))).toBe('T15');
    expect(einstieg(fall((l) => { kap(l, 4); l.stand.abschnitt = { phase: 'bestellen', bau: null }; h1(l).station = 'p'; }))).toBe('T18');
    expect(einstieg(fall((l) => { kap(l, 4); l.stand.abschnitt = { phase: 'bestellen', bau: null }; h1(l).station = 'p'; h2(l).station = 'p'; }))).toBe('T20');
    expect(einstieg(fall((l) => { kap(l, 5); l.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 9000 } }; }))).toBe('T22');
    expect(einstieg(fall((l) => { kap(l, 5); l.netz.warm = new Set([h1(l).id, h2(l).id]); }))).toBe('T24');
    expect(einstieg(fall((l) => { kap(l, 6); l.netz.warm = new Set([h1(l).id, h2(l).id]); }))).toBe('T24');
    expect(einstieg(fall((l) => { kap(l, 5); l.netz.warm = new Set([h1(l).id]); }))).toBe('T08');

    // „offen, beide verbunden“: T12 → Tipp auf die Karte → T13 schaltet sofort auf T14 (Geld reicht) bzw. bleibt T13 (Geld fehlt).
    const t = new Tutorial(beide);
    expect(jetzt(t)).toBe('T12');
    tipp(t, 'leitungskarte', { typ: 'd25' });
    expect(jetzt(t)).toBe('T14');
    const arm = fall((l) => { kap(l, 3); l.stand.abschnitt = { phase: 'offen', bau: null }; l.erreicht = [h1(l).id, h2(l).id]; l.geldFehlt = 300; });
    const ta = new Tutorial(arm);
    tipp(ta, 'leitungskarte', { typ: 'd25' });
    expect(ta.ansicht(T0)!).toMatchObject({ schritt: 'T13', text: TEXT.geld });
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

  it('test_nr13_sperren – Grundzustand gesperrt, Gesten nur in T13, Abschließen-Sperre in T13, außerhalb nichts', () => {
    const IMMER: Bedienung[] = ['zoom', 'doerfer', 'auftrag', 'verwerfen', 'sofort', 'express', 'weiter_einzeichnen', 'blatt_schliessen'];
    const l = lageBauen();
    const t = new Tutorial(l);
    for (const b of [...IMMER, 'karte_gesten' as const]) {
      const s = t.sperre(b)!;
      expect([b, s.kurz]).toEqual([b, 'später wählbar']);
    }
    expect(t.sperre('abschliessen')).toBeNull();
    bis(t, l, 'T13');
    for (const b of IMMER) expect([b, t.sperre(b) !== null]).toEqual([b, true]);
    expect(t.sperre('karte_gesten')).toBeNull();
    expect(t.sperre('blatt_schliessen')!.satz).toBe(TEXT.leisteOffen);
    expect(t.sperre('abschliessen')).toEqual({ kurz: `2${NB}Häuser fehlen`, satz: TEXT.zuFrueh });
    l.erreicht = [h2(l).id]; schritt(t, 'haus_erreicht', h2(l).id);
    expect(t.sperre('abschliessen')).toEqual({ kurz: `noch 1${NB}Haus fehlt`, satz: TEXT.zuFrueh });
    l.geldFehlt = 1;
    expect(t.sperre('abschliessen')).toEqual({ kurz: 'Geld reicht nicht', satz: TEXT.geld });
    l.geldFehlt = 0;
    l.erreicht = [h1(l).id, h2(l).id]; schritt(t, 'haus_erreicht', h1(l).id);
    expect(jetzt(t)).toBe('T14');
    expect(t.sperre('abschliessen')).toBeNull();
    expect(t.sperre('karte_gesten')!.kurz).toBe('später wählbar');
    l.geldFehlt = 1;
    expect(t.sperre('abschliessen')).toBeNull();
    for (const b of IMMER) expect(t.sperre(b)!.kurz).toBe('später wählbar');

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

  it('test_nr13_k12_haeuser_saetze_weichen_dem_geld_satz – beide erreicht, Geld fehlt', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T13');
    l.geldFehlt = 200;
    l.erreicht = [h1(l).id, h2(l).id]; schritt(t, 'haus_erreicht', h2(l).id);
    expect(jetzt(t)).toBe('T13');
    t.gesperrtGetippt('blatt_schliessen');
    expect(t.ansicht(T0)!.text).toBe(TEXT.geld);
    t.handlung();
    for (let i = 0; i < 3; i++) tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe(TEXT.geld);
  });

  it('test_nr13_t13_weg_b_geldmangel – Geld fehlt: bleibt T13 mit Geld-Satz; T14 nur bei beiden Häusern und genug Geld', () => {
    const l = lageBauen();
    const t = new Tutorial(l);
    bis(t, l, 'T13');
    schritt(t, 'leitung_gezeichnet', 1);
    l.geldFehlt = 500;
    l.erreicht = [h1(l).id, h2(l).id]; schritt(t, 'haus_erreicht', h2(l).id);
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13', text: TEXT.geld });
    expect(t.sperre('abschliessen')!.kurz).toBe('Geld reicht nicht');
    l.geldFehlt = 0; t.zustandPruefen();
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T14', text: TEXT.T14, finger: 'tippen' });
    l.geldFehlt = 1; t.zustandPruefen();
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13', text: TEXT.geld, finger: 'aus' });
    l.geldFehlt = 0; t.zustandPruefen();
    expect(jetzt(t)).toBe('T14');
    l.erreicht = [h1(l).id]; t.zustandPruefen();
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13', text: TEXT.T13b, finger: 'aus' });
    l.geldFehlt = 10;
    expect(t.ansicht(T0)!.text).toBe(TEXT.geld);
    expect(l.kapitelGesetzt).toEqual([2, 3]);

    // Rückfall T14 → T13 ist ein Schrittwechsel: Fehltipps beginnen bei 0.
    l.geldFehlt = 0; l.erreicht = [h1(l).id, h2(l).id]; t.zustandPruefen();
    for (let i = 0; i < 3; i++) tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe('Unten in der Leiste: Abschnitt abschließen.');
    l.erreicht = []; t.zustandPruefen();
    expect(t.ansicht(T0)!).toMatchObject({ schritt: 'T13', text: TEXT.T13 });
    tipp(t, 'daneben'); tipp(t, 'daneben');
    expect(t.ansicht(T0)!.text).toBe(TEXT.T13);

    // Die Bedingung gilt auch bei Tipp und handlung().
    l.erreicht = [h1(l).id, h2(l).id];
    t.handlung();
    expect(jetzt(t)).toBe('T14');
    l.geldFehlt = 3;
    tipp(t, 'daneben');
    expect(jetzt(t)).toBe('T13');

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

/** Je Kapitel eine Lage, deren Zustand im Wiedereinstieg einen Schritt dieses Kapitels ergibt. */
function wiedereinstiegsLagen(werte: Partial<TutorialWerte>, name: string): Array<[number, Testlage]> {
  const mit = (k: number, f: (l: Testlage) => void): [number, Testlage] => { const l = lageBauen(werte, name); l.stand.tutorial = { kapitel: k }; f(l); return [k, l]; };
  return [
    mit(1, () => {}),
    mit(2, () => {}),
    mit(3, (l) => { l.stand.abschnitt = { phase: 'offen', bau: null }; }),
    mit(4, (l) => { l.stand.abschnitt = { phase: 'bestellen', bau: null }; }),
    mit(5, (l) => { l.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 1 } }; }),
    mit(6, (l) => { l.netz.warm = new Set([h1(l).id, h2(l).id]); }),
  ];
}
