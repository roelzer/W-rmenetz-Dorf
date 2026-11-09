import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Spiel, type Ereignis } from '../src/core/spiel';
import * as startModul from '../src/core/start';
import { ERSTE_HAEUSER, neuerSpielstand } from '../src/core/start';
import { KATALOG, istLeitung, type TypId } from '../src/core/katalog';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import type { Objekt, Spielstand } from '../src/core/typen';
import type { Schritt, Tipp } from '../src/core/tutorial-vertrag';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { echteSteuerung } from './hilfen/echte-steuerung';

// NR13 Pflicht-Tutorial – verdeckte Abnahmetests (Tester, Modus abnahme-entwurf, 2026-11-06, Basis 5de76c4).
// Liegt als tests/nr13-abnahme.test.ts.verdeckt im Repo und läuft erst, wenn der Projektleiter die Datei nach P4 als
// tests/nr13-abnahme.test.ts aufdeckt (Muster NR19). Bis dahin bewusst rot (P0–P4 fehlen).
// Grundlage: Lastenheft NR13 (mit Präzisierung 06.11.), A29; DESIGN.md 13.5, 13.7, 13.8, 13.9 und 13.15 K1–K10 (13.15 geht
// 13.2–13.11 vor); Bauplan docs/bauplaene/NR13-tutorial.md Fassung 2 (Abschnitte 1, 4–6, 11, 12).
// Nachtrag 2026-11-06 (Basis f8766f7): DESIGN 13.15 K11 „2 Häuser fehlen“; Weg b T14-Geldmangel (K12, Bauplan F3 Punkt 11).
//
// Erwartete Werte von Hand (nicht mit dem Spielcode gerechnet):
// - Texte: DESIGN 13.5 wörtlich nach 13.15 (K1 T17, K3 Platzhalter mit Einheit, U+00A0 vor der Einheit), **-Marken entfernt.
// - Spielwerte: Kessel Stufe 1 60 kW; EFH 15.000 kWh/a, ohne Puffer ÷ 1.500 h = 10 kW, mit Puffer ÷ 2.000 h = 7,5 kW;
//   zwei Häuser mit Puffer 15 kW → 25er (trägt 15 kW); 25er auf 14 kW gesetzt → 32er (trägt 25 kW).
// - Puffer-Station für ein EFH: HP 800 (14 kW Netz / 19 kW Spitze, 5.570 €); Wandstation Typ 15 (2.400 €).
// - Geld: 2.000 € Planung, 25er 400 € je Feld. Mit 16.000 € Start: nach Planung 14.000 €; 8 Felder + 2 × 5.570 = 14.340 € → es
//   fehlen 340 €; 10 Felder → 1.140 €; 7 Felder → 13.940 € → 0.
// - Zeiten im Tutorial: Planung 10 s, Bau 20 s (ohne Bauzeit-Faktor), Laura „Lieferzeit: 1 Tag.“; danach normal
//   30 s × 2,5 = 75 s und 360 s × 2,5 = 900 s, Lieferzeit 900 s ÷ 19,726 s je Spieltag ≈ 46 Tage.
// - Wiedereinstieg: Tabelle DESIGN 13.7, Kapitelnamen „Die Heizzentrale“, „Planen mit Philipp“, „Leitung ziehen“,
//   „Übergabestationen“, „Bauen“, „Warm!“ (K2: nach „!“ kein Schlusspunkt).
// Neue Namen (neuesSpielMitTutorial, src/core/tutorial.ts, Spiel.tutorial…, Steuerung.anleitungAnsicht) über einen Typumweg,
// damit `npm run typecheck` die Datei vor und nach NR13 annimmt; fehlt ein Name, wirft der Aufruf einen sprechenden Fehler.

// ─────────────── Typumweg (Bauplan NR13 F2, Abschnitt 6) ───────────────
type SchrittId = string;
type Bedienung = 'zoom' | 'doerfer' | 'auftrag' | 'blatt_schliessen' | 'verwerfen' | 'sofort' | 'express'
  | 'weiter_einzeichnen' | 'abschliessen' | 'karte_gesten';
interface TippMeldung { art: 'tipp'; tipp: Tipp; objekt_id?: number; typ?: TypId }
interface Ansicht {
  schritt: SchrittId; kapitel: number; kapitel_name: string; art: 'W' | 'H'; text: string; knopf_hinweis?: string;
  wusstest_du: boolean; ziele: string[]; finger: 'aus' | 'tippen' | 'spur'; abdunkeln: string;
  weiter: 'weiter' | 'los' | 'wartet' | null; warte_text?: string; warte_bis_ms?: number; kamera: string; kamera_ziele: string[];
  kamera_grenze: boolean; spur: boolean; erreicht_zeigen: boolean; info_kapsel?: string; leitung_typ?: TypId;
  objekt_ids: { heizzentrale: number; haus1: number; haus2: number; leitungsstueck: number[] };
  normale_aktion: boolean; wiedereinstieg: boolean;
}
interface TutorialObj {
  aktiv(): boolean; ansicht(jetzt_ms: number): Ansicht | null; tipp(m: TippMeldung): void;
  schritt(e: { schritt: Schritt; objekt_id?: number }): void; sperre(b: Bedienung): { kurz: string; satz: string } | null;
  gesperrtGetippt(b: Bedienung): void; handlung(): void;
  zustandPruefen(): void; // Bauplan F3: Übergänge ohne Ereignis (T13 ↔ T14), läuft in der Steuerung bei jedem Takt
}
interface TutorialModul {
  Tutorial: new (lage: unknown, opt?: { wiedereinstieg?: boolean }) => TutorialObj;
  einstieg(lage: unknown): SchrittId;
}
type Werte = { kessel_kw: number; kwh: number; kw_ohne: number; kw_puffer: number; leitung: TypId; kap_kw: number };
type Nr13Kern = {
  tutorialAktiv?(): boolean; wandstationFrei?(): boolean; tutorialWerte?(): Werte; tutorialGeldFehlt_eur?(): number;
  tutorialBeenden?(): void; tutorialUeberspringen?(): void;
};
const MODUL_PFAD = '../src/core/tutorial';
async function tutorialModul(): Promise<TutorialModul> {
  try { return (await import(/* @vite-ignore */ MODUL_PFAD)) as TutorialModul; }
  catch (fehler) { throw new Error(`NR13: src/core/tutorial.ts fehlt noch (kommt mit P1): ${String(fehler)}`); }
}
function kern<K extends keyof Nr13Kern>(s: Spiel, name: K): NonNullable<Nr13Kern[K]> {
  const f = (s as unknown as Nr13Kern)[name];
  if (typeof f !== 'function') throw new Error(`NR13: Spiel.${String(name)} fehlt noch (kommt mit P0/P2)`);
  return (f as (...a: unknown[]) => unknown).bind(s) as NonNullable<Nr13Kern[K]>;
}
function neuesSpielMitTutorial(jetzt_ms: number): Spielstand {
  const f = (startModul as unknown as { neuesSpielMitTutorial?: (j: number) => Spielstand }).neuesSpielMitTutorial;
  if (typeof f !== 'function') throw new Error('NR13: neuesSpielMitTutorial fehlt noch (kommt mit P0)');
  return f(jetzt_ms);
}
const merke = (st: Spielstand): unknown => (st as unknown as { tutorial?: unknown }).tutorial;
const merkeSetzen = (st: Spielstand, v: unknown): void => { (st as unknown as { tutorial?: unknown }).tutorial = v; };

// ─────────────── Handtabellen ───────────────
const T0 = 1_000_000_000_000;
const NAME = 'Kunigunde Habermaßen'; // 20 Zeichen
const NB = ' ';
const SPUR: ReadonlyArray<readonly [number, number]> = [[10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [11, 14]];
const FOLGE: SchrittId[] = Array.from({ length: 26 }, (_, i) => `T${String(i + 1).padStart(2, '0')}`);
const W_SCHRITTE = new Set(['T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T11', 'T16', 'T22', 'T23', 'T24', 'T25', 'T26']);
const KAPITEL_NAME = ['', 'Die Heizzentrale', 'Planen mit Philipp', 'Leitung ziehen', 'Übergabestationen', 'Bauen', 'Warm!'];
const kapitelVon = (id: SchrittId): number => { const n = Number(id.slice(1)); return n <= 7 ? 1 : n <= 11 ? 2 : n <= 14 ? 3 : n <= 19 ? 4 : n <= 23 ? 5 : 6; };
const TEXTE = (n: string): Record<SchrittId, string> => ({
  T01: `Hallo ${n}! Ich bin Simon und zeige dir, wie dein Dorf warm wird. Tippe auf die Heizzentrale.`,
  T02: 'Hier steht dein Wärmeerzeuger, ein Hackschnitzelkessel. Er verbrennt Holzreste und macht damit Wasser heiß.',
  T03: `Wie viel Wärme er in jedem Moment schafft, misst man in Kilowatt (kW). Dein Kessel schafft 60${NB}kW.`,
  T04: 'Das heiße Wasser fließt durch Rohre unter der Straße zu den Häusern. Das nennt man Wärmenetz oder Nahwärme.',
  T05: 'Diese Häuser heizen noch mit Öl – siehst du den grauen Rauch? Du willst die ersten zwei anschließen.',
  T06: `Ein Haus braucht im Jahr 15.000${NB}kWh Wärme. An den kältesten Tagen braucht es bis zu 10${NB}kW gleichzeitig.`,
  T07: 'kW ist, wie viel Wasser gerade aus dem Hahn läuft. kWh ist, wie voll der Eimer am Ende ist.',
  T08: 'Leitungen baust du in Bauabschnitten. Tippe auf Bauen.',
  T09: 'Hier ist alles für dein Netz. Tippe auf Leitungen.',
  T10: 'Philipp plant, wo die Leitung in der Straße liegen soll. Tippe auf seinen Knopf.',
  T11: 'Je mehr Häuser an einer Leitung hängen, desto mehr kW muss sie tragen – und desto dicker muss sie sein.',
  T12: `Fertig geplant! Nimm die 25er – sie trägt im Spiel bis 15${NB}kW, genug für beide Häuser.`,
  T13: 'Zieh die Leitung mit dem Finger von der Heizzentrale bis an beide Häuser. Folge der gelben Spur.',
  T14: 'Beide Häuser sind erreicht. Tippe auf Abschnitt abschließen.',
  T15: 'Damit ein Haus die Wärme nehmen kann, braucht es eine Übergabestation. Tippe auf das erste Haus.',
  T16: 'Sie holt die Wärme aus dem Netz ins Haus. Ein Wärmetauscher trennt dabei das Netzwasser vom Heizwasser im Haus.',
  T17: `Nimm die mit Pufferspeicher. Ihr Tank sammelt Wärme vorab, so reichen 7,5${NB}kW statt 10${NB}kW aus dem Netz – genauso warm.`,
  T18: 'Prima! Jetzt bekommt das zweite Haus auch eine. Tippe darauf.',
  T19: 'Wieder die Puffer-Übergabestation, bitte.',
  T20: 'Fehlt nur noch das Material. Tippe auf Bauen.',
  T21: 'Tippe auf Laura. Sie bestellt Rohre und Stationen, dann wird gebaut.',
  T22: 'In echt dauert so ein Bau einige Wochen. Für dich geht es heute schneller.',
  T23: 'Deine Kunden zahlen für jede kWh, die bei ihnen ankommt, und eine feste Grundgebühr. Das ist deine Einnahme.',
  T24: `Geschafft, ${n}! Beide Häuser heizen jetzt mit Wärme aus deinem Netz statt mit Öl.`,
  T25: 'In jeder Leitung liegen zwei Rohre: Heißes Wasser fließt hin (Vorlauf), abgekühltes zurück (Rücklauf).',
  T26: 'Am Monatsende zahlen deine Kunden ihre Wärmerechnung. Damit schließt du die nächsten Häuser an.',
});
const T13B = 'Das erste Haus ist erreicht. Jetzt weiter bis zum zweiten.';
const HILFE: Record<SchrittId, string> = {
  T01: 'Tippe auf das große Gebäude, das gelb leuchtet.',
  T08: 'Der Knopf Bauen ist unten rechts – er leuchtet gelb.', T20: 'Der Knopf Bauen ist unten rechts – er leuchtet gelb.',
  T09: 'Leitungen ist der Reiter mit dem Rohr – oben im Blatt.',
  T10: 'Tippe auf den leuchtenden Knopf im Blatt.', T21: 'Tippe auf den leuchtenden Knopf im Blatt.',
  T12: 'Tippe auf die leuchtende Leitungs-Karte.',
  T13: 'Leg den Finger auf die Heizzentrale und zieh ihn die gelbe Spur entlang.',
  T14: 'Unten in der Leiste: Abschnitt abschließen.',
  T15: 'Tippe auf das leuchtende Haus.', T18: 'Tippe auf das leuchtende Haus.',
  T17: 'Tippe auf Puffer-Übergabestation.', T19: 'Tippe auf Puffer-Übergabestation.',
};
const TIPPE_WEITER = 'Tippe auf Weiter.';
const WANDSTATION_SATZ = 'Im Tutorial nimmst du den Standard. Die Wandstation kannst du später wählen.';
const GELD_KURZ = 'Geld reicht nicht';
const GELD_SATZ = 'Dann reicht dein Geld nicht mehr für die Stationen. Nimm mit Zurück ein paar Leitungen weg.';
const HAEUSER_SATZ = 'Zieh die Leitung bis an beide Häuser – folge der gelben Spur.';
const LEISTE_SATZ = 'Die Leiste bleibt offen, bis beide Häuser erreicht sind.';
const IMMER_GESPERRT: Bedienung[] = ['zoom', 'doerfer', 'auftrag', 'verwerfen', 'sofort', 'express', 'weiter_einzeichnen'];
const ALLE_BEDIENUNGEN: Bedienung[] = [...IMMER_GESPERRT, 'blatt_schliessen', 'abschliessen', 'karte_gesten'];
const ohneMarken = (t: string): string => t.replace(/\*\*/g, '');
const wiederSatz = (n: string, kap: number): string => {
  const k = KAPITEL_NAME[kap];
  return `Weiter geht’s, ${n}! Wir waren gerade bei: ${k}${k.endsWith('!') ? '' : '.'}`;
};
/** Satzregel K2: Satzende = . ! ? vor Leerzeichen oder Textende; ein Zuruf aus der festen Liste am Anfang zählt nicht. */
function saetze(text: string, n: string): number {
  let t = ohneMarken(text);
  const zuruf = [`Hallo ${n}!`, 'Prima!', 'Fertig geplant!', `Geschafft, ${n}!`, `Weiter geht’s, ${n}!`].find((z) => t.startsWith(z));
  if (zuruf) t = t.slice(zuruf.length);
  return (t.match(/[.!?](?=\s|$)/g) ?? []).length;
}

// ─────────────── Ablauf mit echtem Spiel und echtem Tutorial (ohne Oberfläche) ───────────────
type Uhr = { t: number };
type Lauf = { s: Spiel; tut: TutorialObj; z: Uhr; h1: Objekt; h2: Objekt; hz: Objekt; log: Ereignis[]; leitung: TypId; name: string };
const istHaus = (o: Objekt): boolean => KATALOG[o.typ].kategorie === 'haus';
const hausBei = (st: Spielstand, [x, y]: readonly [number, number]): Objekt => {
  const h = st.objekte.find((o) => o.x === x && o.y === y && istHaus(o));
  if (!h) throw new Error(`Testaufbau: kein Haus bei (${x}|${y})`);
  return h;
};

/** Kern-Ereignisse wie die Steuerung (P4) an das Tutorial weiterreichen; alle Ereignisse mitschreiben. */
function pumpen(l: Lauf): void {
  const neu = l.s.ereignisse.splice(0);
  l.log.push(...neu);
  for (const e of neu) if (e.art === 'schritt') l.tut.schritt(e.objekt_id === undefined ? { schritt: e.schritt } : { schritt: e.schritt, objekt_id: e.objekt_id });
}
function tippen(l: Lauf, tipp: Tipp, extra: { objekt_id?: number; typ?: TypId } = {}): void { l.tut.tipp({ art: 'tipp', tipp, ...extra }); }
const ansicht = (l: Lauf): Ansicht | null => l.tut.ansicht(l.z.t);
const jetzt = (l: Lauf): Ansicht => { const a = ansicht(l); if (!a) throw new Error('Tutorial zeigt keine Ansicht'); return a; };

/** Spiel aus einem Spielstand mit Tutorial bauen (Lage = echtes Spiel, Bauplan 6 „Spiel erfüllt sie strukturell“). */
async function lauf(st: Spielstand, z: Uhr, opt: { wiedereinstieg: boolean; leitung?: TypId; nachrechnen?: boolean }): Promise<Lauf> {
  const s = new Spiel(st, () => z.t);
  if (opt.nachrechnen) s.bis(z.t); // wie main.ts: Zeit nachrechnen, danach entsteht die Steuerung mit dem Tutorial
  const M = await tutorialModul();
  const tut = new M.Tutorial(s, { wiedereinstieg: opt.wiedereinstieg });
  s.ereignisse.length = 0;
  return { s, tut, z, h1: hausBei(s.stand, ERSTE_HAEUSER[0]), h2: hausBei(s.stand, ERSTE_HAEUSER[1]),
    hz: s.stand.objekte.find((o) => o.typ === 'hz')!, log: [], leitung: opt.leitung ?? 'd25', name: s.spielerName };
}

/** Neues Spiel über den Produktionsweg (leerer Speicher), Namensfenster ausgefüllt. */
async function neuesSpiel(opt: { name?: string; geld_eur?: number; leitung?: TypId } = {}): Promise<Lauf> {
  const z = { t: T0 };
  const { stand, befund } = ladenMitBefund(null, T0);
  expect(befund).toBe('neu');
  expect(merke(stand), 'NR13: ein neues Spiel trägt die Tutorial-Merke { kapitel: 1 }').toEqual({ kapitel: 1 });
  if (opt.geld_eur !== undefined) stand.geld_eur = opt.geld_eur;
  const l = await lauf(stand, z, { wiedereinstieg: false, leitung: opt.leitung });
  expect(ansicht(l), 'vor dem Namensfenster keine Blase').toBeNull();
  l.s.namenSetzen(opt.name ?? NAME, 'Testdorf');
  l.name = l.s.spielerName;
  return l;
}

/** Die richtige Handlung des Schritts, so wie ein Spieler sie über die Oberfläche auslöst. */
function handeln(l: Lauf, a: Ansicht): void {
  const { s, z } = l;
  switch (a.schritt) {
    case 'T01': tippen(l, 'heizzentrale', { objekt_id: l.hz.id }); break;
    case 'T08': tippen(l, 'baumenue'); break;
    case 'T09': tippen(l, 'reiter_leitungen'); break;
    case 'T20': tippen(l, 'baumenue'); tippen(l, 'reiter_leitungen'); break; // P4 meldet beides (Baumenü öffnet auf Leitungen)
    case 'T10': expect(s.abschnittPlanen().ok).toBe(true); pumpen(l); break;
    case 'T11': case 'T23': {
      if (a.weiter === 'wartet') {
        tippen(l, 'weiter');
        expect(jetzt(l).schritt, `${a.schritt}: Weiter während des Wartens wirkungslos`).toBe(a.schritt);
        z.t = s.stand.abschnitt!.bau!.ende_ms + 1_000; s.bis(z.t); pumpen(l);
      }
      expect(jetzt(l).weiter, `${a.schritt}: nach dem Warten [Weiter]`).toBe('weiter');
      tippen(l, 'weiter');
      break;
    }
    case 'T12':
      expect(a.leitung_typ, 'T12 zeigt auf die Karte der berechneten Leitung').toBe(l.leitung);
      tippen(l, 'leitungskarte', { typ: l.leitung }); break;
    case 'T13':
      for (const [x, y] of SPUR) {
        if (s.stand.objekte.some((o) => o.x === x && o.y === y && istLeitung(o.typ))) continue; // nach Wiedereinstieg schon da
        expect(s.platzieren(l.leitung, x, y).ok, `Leitung auf (${x}|${y})`).toBe(true); pumpen(l);
      }
      break;
    case 'T14': expect(s.abschnittAbschliessen().ok).toBe(true); pumpen(l); break;
    case 'T15': tippen(l, 'haus', { objekt_id: l.h1.id }); break;
    case 'T18': tippen(l, 'haus', { objekt_id: l.h2.id }); break;
    case 'T17': expect(s.stationKaufen(l.h1.id, 'hp_800').ok).toBe(true); pumpen(l); break;
    case 'T19': expect(s.stationKaufen(l.h2.id, 'hp_800').ok).toBe(true); pumpen(l); break;
    case 'T21': expect(s.materialBestellen().ok).toBe(true); pumpen(l); break;
    default: tippen(l, 'weiter');
  }
}

/** Ablauf bis zum Schritt `bis` (dieser wird nicht mehr ausgeführt) bzw. bis zum Ende; `bei` läuft beim Eintritt in jeden Schritt. */
function laufen(l: Lauf, opt: { bis?: SchrittId; bei?: (a: Ansicht) => void } = {}): Ansicht | null {
  for (let runde = 0; runde < 60; runde++) {
    const a = ansicht(l);
    if (!a) return null;
    if (a.wiedereinstieg) { tippen(l, 'weiter'); continue; }
    if (a.schritt === opt.bis) return a;
    opt.bei?.(a);
    const i = FOLGE.indexOf(a.schritt);
    expect(i, `unbekannter Schritt ${a.schritt}`).toBeGreaterThanOrEqual(0);
    handeln(l, a);
    const n = ansicht(l);
    expect(n?.schritt ?? 'ENDE', `nach der Handlung von ${a.schritt}`).toBe(FOLGE[i + 1] ?? 'ENDE');
  }
  throw new Error('Ablauf endet nicht');
}

/** Speichern → Laden → neues Spiel → Tutorial mit Wiedereinstieg (wie ein Neustart der App). */
async function neuLaden(l: Lauf, spaeter_ms = 0): Promise<Lauf> {
  l.z.t += spaeter_ms;
  const { stand, befund } = ladenMitBefund(serialisieren(l.s.stand), l.z.t);
  expect(befund).not.toBe('defekt');
  return lauf(stand, l.z, { wiedereinstieg: true, leitung: l.leitung, nachrechnen: true });
}

const hausIds = (s: Spiel): Set<number> => new Set(s.stand.objekte.filter(istHaus).map((o) => o.id));
const warmeHaeuser = (s: Spiel): number[] => [...s.netz.warm].filter((id) => hausIds(s).has(id)).sort((a, b) => a - b);

// ═══════════════════════════ A: Start ═══════════════════════════
describe('NR13 Abnahme – Start', () => {
  it('test_nr13_a_neues_spiel_startet_nach_dem_namen_in_t01', async () => {
    const l = await neuesSpiel();
    expect(kern(l.s, 'tutorialAktiv')()).toBe(true);
    const a = jetzt(l);
    expect(a.schritt).toBe('T01');
    expect(a.kapitel).toBe(1);
    expect(a.kapitel_name).toBe('Die Heizzentrale');
    expect(a.art).toBe('H');
    expect(a.weiter, 'Handlungs-Schritt ohne [Weiter]').toBeNull();
    expect(a.ziele[0]).toBe('heizzentrale');
    expect(a.finger).toBe('tippen');
    expect(a.normale_aktion, 'T01: Tipp auf die Heizzentrale öffnet kein Blatt').toBe(false);
    expect(a.wiedereinstieg).toBe(false);
  });

  it('test_nr13_a_kaputter_stand_gibt_neues_dorf_mit_tutorial', () => {
    const { stand, befund } = ladenMitBefund('{kaputt', T0);
    expect(befund).toBe('defekt');
    expect(merke(stand)).toEqual({ kapitel: 1 });
  });

  it('test_nr13_a_startdorf_ohne_anschluss_sonst_gleich', () => {
    const st = neuesSpielMitTutorial(T0);
    expect(merke(st)).toEqual({ kapitel: 1 });
    const ohne = { ...st } as Record<string, unknown>;
    delete ohne.tutorial;
    expect(ohne, 'neben der Merke kein weiteres Feld').toEqual(neuerSpielstand(T0));
    expect(st.objekte.filter((o) => istLeitung(o.typ))).toEqual([]);
    for (const k of ERSTE_HAEUSER) { const h = hausBei(st, k); expect(h.station).toBeUndefined(); expect(h.ohne_station).toBe(true); }
    expect(new Spiel(st, () => T0).netz.warm.size).toBe(0);
  });

  it('test_nr13_a_alter_stand_sieht_das_tutorial_nie_und_bleibt_gleich', async () => {
    const M = await tutorialModul();
    // altes Startdorf (Netz und zwei angeschlossene Häuser) und ein weitergespieltes altes Dorf
    const alt1 = altesStartdorf(T0);
    const alt2 = altesStartdorf(T0); alt2.geld_eur = 7_777; alt2.namen_gefragt = true; alt2.spieler = 'Bert';
    for (const alt of [alt1, alt2]) {
      const text = serialisieren(alt);
      const { stand, befund } = ladenMitBefund(text, T0 + 1_000);
      expect(befund).not.toBe('defekt');
      expect(merke(stand)).toBeUndefined();
      expect(stand.objekte).toEqual(alt.objekte.filter((o) => o.x !== 13 || o.y !== 12));
      const s = new Spiel(stand, () => T0 + 1_000);
      expect(kern(s, 'tutorialAktiv')()).toBe(false);
      expect(kern(s, 'wandstationFrei')()).toBe(true);
      const tut = new M.Tutorial(s, { wiedereinstieg: true });
      expect(tut.aktiv()).toBe(false);
      expect(tut.ansicht(T0 + 1_000)).toBeNull();
      for (const b of ALLE_BEDIENUNGEN) expect(tut.sperre(b), `außerhalb des Tutorials nichts gesperrt (${b})`).toBeNull();
    }
  });
});

// ═══════════════════════════ B: kompletter Ablauf ═══════════════════════════
describe('NR13 Abnahme – kompletter Ablauf', () => {
  it('test_nr13_a_ablauf_bis_zwei_warme_haeuser_falsche_tipps_aendern_nichts', async () => {
    const l = await neuesSpiel();
    const haeuser = hausIds(l.s);
    const anderesHaus = [...haeuser].find((id) => id !== l.h1.id && id !== l.h2.id)!;
    const geld: number[] = [];
    laufen(l, {
      bei: (a) => {
        const vorher = a.schritt;
        const bleibt = (was: string): void => expect(jetzt(l).schritt, `${vorher}: ${was} schaltet nicht weiter`).toBe(vorher);
        const falsch: Array<[Tipp, { objekt_id?: number; typ?: TypId }]> = [];
        if (vorher !== 'T01') falsch.push(['heizzentrale', { objekt_id: l.hz.id }]);
        if (vorher !== 'T08' && vorher !== 'T20') falsch.push(['baumenue', {}]);
        if (vorher !== 'T09') falsch.push(['reiter_leitungen', {}]);
        falsch.push(['leitungskarte', { typ: vorher === 'T12' ? 'd50' : l.leitung }]);
        falsch.push(['haus', { objekt_id: vorher === 'T15' ? l.h2.id : l.h1.id }], ['haus', { objekt_id: anderesHaus }]);
        if (vorher === 'T18') falsch.push(['haus', { objekt_id: l.h1.id }]);
        if (!W_SCHRITTE.has(vorher)) falsch.push(['weiter', {}]);
        for (let i = 0; i < 3; i++) falsch.push(['daneben', {}]);
        for (const [t, extra] of falsch) { tippen(l, t, extra); bleibt(`Tipp ${t} ${JSON.stringify(extra)}`); }
        // Ereignisse, deren Zustand nicht stimmt, schalten nicht (Bauplan: „Wo es einen Zustand gibt, entscheidet der Zustand“)
        const fremd: Array<{ schritt: Schritt; objekt_id?: number }> = [];
        if (vorher === 'T10') fremd.push({ schritt: 'abschnitt_geplant' });
        if (vorher === 'T13') fremd.push({ schritt: 'haus_erreicht', objekt_id: l.h1.id }, { schritt: 'haus_erreicht', objekt_id: l.h2.id });
        if (vorher === 'T14') fremd.push({ schritt: 'abschnitt_abgeschlossen' });
        if (vorher === 'T17') fremd.push({ schritt: 'station_gekauft', objekt_id: l.h1.id });
        if (vorher === 'T19') fremd.push({ schritt: 'station_gekauft', objekt_id: l.h2.id });
        if (vorher === 'T21') fremd.push({ schritt: 'material_bestellt' });
        if (W_SCHRITTE.has(vorher)) fremd.push({ schritt: 'abschnitt_gebaut' }, { schritt: 'haus_warm', objekt_id: l.h1.id });
        for (const e of fremd) { l.tut.schritt(e); bleibt(`Ereignis ${e.schritt} ohne passenden Zustand`); }
        if (['T13', 'T14'].includes(vorher)) geld.push(kern(l.s, 'tutorialGeldFehlt_eur')());
      },
    });
    expect(l.tut.aktiv()).toBe(false);
    expect(merke(l.s.stand), 'Tutorial als fertig gemerkt (Feld weg)').toBeUndefined();
    expect(warmeHaeuser(l.s), 'genau die zwei Tutorial-Häuser warm').toEqual([l.h1.id, l.h2.id].sort((a, b) => a - b));
    expect(l.log.filter((e) => e.art === 'engstelle'), 'keine NR18-Warnung').toEqual([]);
    expect(geld.every((g) => g === 0), 'Startgeld reicht im normalen Ablauf').toBe(true);
    expect(l.s.stand.geld_eur, 'danach bleibt Geld für den nächsten Schritt (13.9)').toBeGreaterThanOrEqual(5_000);
    const { stand } = ladenMitBefund(serialisieren(l.s.stand), l.z.t);
    expect(merke(stand)).toBeUndefined();
    const M = await tutorialModul();
    expect(new M.Tutorial(new Spiel(stand, () => l.z.t), { wiedereinstieg: true }).aktiv(), 'neu laden → kein Tutorial').toBe(false);
  });

  it('test_nr13_a_keine_warnung_nach_abschliessen', async () => {
    const l = await neuesSpiel();
    laufen(l, { bis: 'T15' });
    expect(l.s.abschnittWarnungen()).toEqual([]);
  });

  it('test_nr13_a_hilfe_nach_drei_fehltipps_je_art', async () => {
    const l = await neuesSpiel();
    laufen(l, {
      bei: (a) => {
        expect(a.knopf_hinweis ?? '', `${a.schritt}: beim Eintritt keine Hilfe`).not.toBe(TIPPE_WEITER);
        expect(Object.values(HILFE), `${a.schritt}: Hilfe-Satz nicht beim Eintritt`).not.toContain(ohneMarken(a.text));
        tippen(l, 'daneben'); tippen(l, 'daneben');
        expect(ohneMarken(jetzt(l).text), `${a.schritt}: nach zwei Fehltipps noch keine Hilfe`).toBe(ohneMarken(a.text));
        tippen(l, 'daneben');
        const b = jetzt(l);
        if (a.weiter === 'wartet') {
          expect(b.knopf_hinweis ?? '', `${a.schritt}: beim Warten keine Hilfe`).not.toBe(TIPPE_WEITER);
          expect(b.text).toBe(a.text);
        } else if (a.art === 'W') {
          expect(b.knopf_hinweis, `${a.schritt}: Erklär-Schritt → „Tippe auf Weiter.“`).toBe(TIPPE_WEITER);
          expect(b.text, `${a.schritt}: Text bleibt stehen`).toBe(a.text);
        } else {
          expect(ohneMarken(b.text), `${a.schritt}: Hilfe-Satz ersetzt den Text`).toBe(HILFE[a.schritt]);
        }
      },
    });
  });

  it('test_nr13_a_texte_woertlich_nach_design_13_5', async () => {
    const l = await neuesSpiel();
    const soll = TEXTE(NAME);
    let t13b = '';
    laufen(l, {
      bei: (a) => {
        expect(ohneMarken(a.text), a.schritt).toBe(soll[a.schritt]);
        if (a.schritt === 'T13') {
          for (const [x, y] of SPUR.slice(0, 4)) { expect(l.s.platzieren(l.leitung, x, y).ok).toBe(true); pumpen(l); }
          t13b = ohneMarken(jetzt(l).text);
          expect(jetzt(l).schritt, 'ein Haus erreicht → Schritt bleibt T13').toBe('T13');
          expect(l.s.geplanteLeitungEntfernen(10, 13).ok).toBe(true); pumpen(l);
          expect(ohneMarken(jetzt(l).text), 'Haus wieder getrennt → T13-Text').toBe(soll.T13);
        }
      },
    });
    expect(t13b).toBe(T13B);
  });

  it('test_nr13_a_kapitel_art_und_weiter_je_schritt_merke_folgt', async () => {
    const l = await neuesSpiel();
    laufen(l, {
      bei: (a) => {
        const k = kapitelVon(a.schritt);
        expect(a.kapitel, a.schritt).toBe(k);
        expect(a.kapitel_name, a.schritt).toBe(KAPITEL_NAME[k]);
        expect(merke(l.s.stand), `${a.schritt}: Merke = begonnenes Kapitel`).toEqual({ kapitel: k });
        expect(a.art, a.schritt).toBe(W_SCHRITTE.has(a.schritt) ? 'W' : 'H');
        const weiter = a.schritt === 'T26' ? 'los' : a.schritt === 'T11' || a.schritt === 'T23' ? 'wartet' : W_SCHRITTE.has(a.schritt) ? 'weiter' : null;
        expect(a.weiter, a.schritt).toBe(weiter);
      },
    });
  });

  it('test_nr13_a_muss_felder_der_ansicht', async () => {
    const l = await neuesSpiel();
    const gesehen: Record<string, Ansicht> = {};
    laufen(l, { bei: (a) => { gesehen[a.schritt] = a; } });
    expect(gesehen.T03.ziele, 'T03 zwei Löcher').toEqual(expect.arrayContaining(['heizzentrale', 'waerme_pille']));
    expect(gesehen.T05.ziele).toEqual(expect.arrayContaining(['haus1', 'haus2']));
    expect(gesehen.T06.info_kapsel, 'Info-Kapsel K9').toBe(`15.000${NB}kWh im Jahr · bis 10${NB}kW`);
    expect(gesehen.T07.info_kapsel).toBe(`15.000${NB}kWh im Jahr · bis 10${NB}kW`);
    expect(gesehen.T08.info_kapsel ?? null).toBeNull();
    expect(gesehen.T13.kamera_grenze, 'K5 Kamera-Grenze in T13').toBe(true);
    expect(gesehen.T13.spur).toBe(true);
    expect(gesehen.T13.abdunkeln).toBe('nur_hud');
    for (const id of FOLGE.filter((x) => x !== 'T13')) { expect(gesehen[id].kamera_grenze, id).toBe(false); expect(gesehen[id].spur, id).toBe(false); }
    expect(gesehen.T15.normale_aktion && gesehen.T18.normale_aktion, 'T15/T18 Tipp aufs Haus öffnet das Hausblatt').toBe(true);
    for (const id of FOLGE.filter((x) => x !== 'T15' && x !== 'T18')) expect(gesehen[id].normale_aktion, id).toBe(false);
    expect(gesehen.T25.wusstest_du).toBe(true);
    // T25: Loch um ein gebautes Leitungsstück auf dem Weg Heizzentrale → Haus 1 und seine zwei Nachbarn (K9)
    const ids = gesehen.T25.objekt_ids.leitungsstueck;
    const weg = SPUR.slice(0, 4).map(([x, y]) => l.s.stand.objekte.find((o) => o.x === x && o.y === y && istLeitung(o.typ))!);
    expect(ids.length).toBe(3);
    for (const id of ids) expect(weg.map((o) => o.id), 'Leitungsstück auf dem Weg HZ → Haus 1').toContain(id);
    expect(weg.filter((o) => ids.includes(o.id)).every((o) => !o.geplant)).toBe(true);
    expect(gesehen.T24.objekt_ids.leitungsstueck).toEqual([]);
  });

  it('test_nr13_a_sperren_je_schritt', async () => {
    const l = await neuesSpiel();
    laufen(l, {
      bei: (a) => {
        for (const b of IMMER_GESPERRT) expect(l.tut.sperre(b), `${a.schritt}: ${b} gesperrt`).not.toBeNull();
        if (a.schritt === 'T13') expect(l.tut.sperre('karte_gesten'), 'T13: Karte frei').toBeNull();
        else expect(l.tut.sperre('karte_gesten'), `${a.schritt}: Karte steht`).not.toBeNull();
      },
    });
    for (const b of ALLE_BEDIENUNGEN) expect(l.tut.sperre(b), `nach dem Ende frei: ${b}`).toBeNull();
  });
});

// ═══════════════════════════ C: Wandstation, Zeiten ═══════════════════════════
describe('NR13 Abnahme – Wandstation und Zeiten', () => {
  it('test_nr13_a_wandstation_im_tutorial_gesperrt_ab_drittem_haus_frei', async () => {
    const l = await neuesSpiel();
    laufen(l, { bis: 'T17' });
    expect(kern(l.s, 'wandstationFrei')()).toBe(false);
    const geld = l.s.stand.geld_eur;
    const r = l.s.stationKaufen(l.h1.id, 'st_15');
    expect(r.ok).toBe(false);
    expect(r.hinweis).toBe(WANDSTATION_SATZ);
    expect(l.s.stand.geld_eur, 'nichts bezahlt').toBe(geld);
    expect(l.h1.station).toBeUndefined();
    const drittes = l.s.stand.objekte.find((o) => o.typ === 'efh' && o.ohne_station && !o.interessent && o.id !== l.h1.id && o.id !== l.h2.id)!;
    expect(l.s.stationKaufen(drittes.id, 'st_15').ok, 'auch an anderen Häusern im Tutorial gesperrt').toBe(false);
    pumpen(l);
    expect(jetzt(l).schritt).toBe('T17');
    laufen(l);
    expect(kern(l.s, 'wandstationFrei')()).toBe(true);
    const vorher = l.s.stand.geld_eur;
    expect(l.s.stationKaufen(drittes.id, 'st_15').ok, 'nach dem Tutorial: Wandstation am dritten Haus').toBe(true);
    expect(drittes.station).toBe('st_15');
    expect(vorher - l.s.stand.geld_eur).toBe(2_400);
  });

  it('test_nr13_a_zeiten_planung_10s_bau_20s_danach_normal', async () => {
    const l = await neuesSpiel();
    laufen(l, { bis: 'T10' });
    l.z.t += 3_000;
    const start = l.z.t;
    expect(l.s.abschnittPlanen().ok).toBe(true); pumpen(l);
    const p = l.s.stand.abschnitt!.bau!;
    expect(p.ende_ms - p.start_ms, 'Planung im Tutorial 10 s').toBe(10_000);
    l.s.bis(start + 9_900); expect(l.s.stand.abschnitt?.phase).toBe('planung');
    l.z.t = start + 10_000; l.s.bis(l.z.t); pumpen(l);
    expect(l.s.stand.abschnitt?.phase, 'nach genau 10 s offen').toBe('offen');
    laufen(l, { bis: 'T21' });
    const bauStart = l.z.t;
    expect(l.s.materialBestellen().ok).toBe(true); pumpen(l);
    const b = l.s.stand.abschnitt!.bau!;
    expect(b.ende_ms - b.start_ms, 'Bau im Tutorial 20 s').toBe(20_000);
    const laura = l.log.filter((e): e is Extract<Ereignis, { art: 'sprecher' }> => e.art === 'sprecher').map((e) => e.text).at(-1) ?? '';
    expect(laura).toContain('Lieferzeit: 1 Tag.');
    l.s.bis(bauStart + 19_900); expect(l.s.stand.abschnitt?.phase).toBe('bau');
    l.z.t = bauStart + 20_000; l.s.bis(l.z.t); pumpen(l);
    expect(l.s.stand.abschnitt, 'nach genau 20 s gebaut').toBeUndefined();
    laufen(l);
    expect(l.tut.aktiv()).toBe(false);
    // zweiter Abschnitt: normale Zeiten
    l.log.length = 0;
    expect(l.s.abschnittPlanen().ok).toBe(true);
    const p2 = l.s.stand.abschnitt!.bau!;
    expect(p2.ende_ms - p2.start_ms).toBe(75_000);
    l.z.t = p2.ende_ms; l.s.bis(l.z.t);
    expect(l.s.stand.abschnitt?.phase).toBe('offen');
    expect(l.s.platzieren('d25', 10, 15).ok).toBe(true);
    expect(l.s.abschnittAbschliessen().ok).toBe(true);
    expect(l.s.materialBestellen().ok).toBe(true);
    const b2 = l.s.stand.abschnitt!.bau!;
    expect(b2.ende_ms - b2.start_ms).toBe(900_000);
    const laura2 = l.s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'sprecher' }> => e.art === 'sprecher').map((e) => e.text).at(-1) ?? '';
    expect(laura2).toContain('Lieferzeit: 46 Tage.');
  });
});

// ═══════════════════════════ D: Wiedereinstieg (DESIGN 13.7) ═══════════════════════════
type Zeile = { name: string; bis: SchrittId; vorbereiten?: (l: Lauf) => void; spaeter_ms?: number; erwartet: SchrittId; danach?: SchrittId; t13b?: boolean };
const ZEILEN: Zeile[] = [
  { name: 'kapitel_1_zurueck_auf_t01', bis: 'T05', erwartet: 'T01' },
  { name: 'kein_abschnitt_kapitel_2_t08', bis: 'T10', erwartet: 'T08' },
  { name: 'abschnitt_in_planung_t11', bis: 'T11', spaeter_ms: 4_000, erwartet: 'T11' },
  { name: 'offen_ohne_striche_t12', bis: 'T12', erwartet: 'T12', danach: 'T13' },
  { name: 'offen_ein_haus_t12_dann_t13b', bis: 'T13', vorbereiten: (l) => { for (const [x, y] of SPUR.slice(0, 4)) { l.s.platzieren(l.leitung, x, y); pumpen(l); } }, erwartet: 'T12', danach: 'T13', t13b: true },
  { name: 'offen_beide_verbunden_t12_dann_t14', bis: 'T13', vorbereiten: (l) => { for (const [x, y] of SPUR) { l.s.platzieren(l.leitung, x, y); pumpen(l); } }, erwartet: 'T12', danach: 'T14' },
  { name: 'bestellen_haus1_ohne_station_t15', bis: 'T17', erwartet: 'T15' },
  { name: 'nur_haus2_ohne_station_t18', bis: 'T19', erwartet: 'T18' },
  { name: 'beide_stationen_t20', bis: 'T21', erwartet: 'T20' },
  { name: 'im_bau_t22', bis: 'T23', erwartet: 'T22' },
  { name: 'bau_fertig_t24', bis: 'T25', erwartet: 'T24' },
];

describe('NR13 Abnahme – Neu laden nach Tabelle 13.7', () => {
  for (const zeile of ZEILEN) {
    it(`test_nr13_a_wiedereinstieg_${zeile.name}`, async () => {
      const l = await neuesSpiel();
      laufen(l, { bis: zeile.bis });
      zeile.vorbereiten?.(l);
      const planEnde = l.s.stand.abschnitt?.bau?.ende_ms;
      const leitungenVorher = l.s.stand.objekte.filter((o) => istLeitung(o.typ)).length;
      const n = await neuLaden(l, zeile.spaeter_ms ?? 0);
      const M = await tutorialModul();
      expect(M.einstieg(n.s), 'berechneter Einstieg').toBe(zeile.erwartet);
      const w = jetzt(n);
      expect(w.wiedereinstieg).toBe(true);
      expect(w.art).toBe('W');
      expect(w.weiter).toBe('weiter');
      expect(w.ziele).toEqual([]);
      expect(ohneMarken(w.text)).toBe(wiederSatz(NAME, kapitelVon(zeile.erwartet)));
      expect(n.s.stand.objekte.filter((o) => istLeitung(o.typ)).length, 'vorhandene Striche bleiben').toBe(leitungenVorher);
      tippen(n, 'weiter');
      const a = jetzt(n);
      expect(a.schritt).toBe(zeile.erwartet);
      expect(a.wiedereinstieg).toBe(false);
      if (zeile.erwartet === 'T11') expect(a.warte_bis_ms, 'Restzeit läuft weiter').toBe(planEnde);
      if (zeile.danach) {
        tippen(n, 'leitungskarte', { typ: n.leitung });
        expect(jetzt(n).schritt).toBe(zeile.danach);
        if (zeile.t13b) expect(ohneMarken(jetzt(n).text)).toBe(T13B);
      }
      laufen(n);
      expect(warmeHaeuser(n.s), 'Ablauf endet nach dem Wiedereinstieg mit zwei warmen Häusern').toEqual([n.h1.id, n.h2.id].sort((x, y) => x - y));
      expect(merke(n.s.stand)).toBeUndefined();
    });
  }

  it('test_nr13_a_wiedereinstieg_kapitelname_aus_dem_zustand_nicht_aus_der_merke', async () => {
    const l = await neuesSpiel();
    laufen(l, { bis: 'T16' });
    merkeSetzen(l.s.stand, { kapitel: 2 });
    const n = await neuLaden(l);
    expect(ohneMarken(jetzt(n).text)).toBe(wiederSatz(NAME, 4));
    tippen(n, 'weiter');
    expect(jetzt(n).schritt).toBe('T15');
  });

  it('test_nr13_a_lange_abwesenheit_im_bau_bau_nachgerechnet_einstieg_t24', async () => {
    const l = await neuesSpiel();
    laufen(l, { bis: 'T22' });
    const n = await neuLaden(l, 3 * 3_600_000);
    expect(n.s.stand.abschnitt, 'Bau nachgerechnet').toBeUndefined();
    expect(warmeHaeuser(n.s)).toEqual([n.h1.id, n.h2.id].sort((x, y) => x - y));
    expect(ohneMarken(jetzt(n).text)).toBe(wiederSatz(NAME, 6));
    expect(ohneMarken(jetzt(n).text).endsWith('Warm!'), 'K2: kein Schlusspunkt nach „Warm!“').toBe(true);
    tippen(n, 'weiter');
    expect(jetzt(n).schritt).toBe('T24');
  });

  it('test_nr13_a_kein_willkommen_zurueck_im_tutorial', () => {
    // main.ts ist ohne Browser nicht ladbar (Bauplan P4: dann Quelltext-Prüfung). Die A38-Meldung muss an tutorialAktiv() hängen.
    const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    // Anker ist das Meldungs-Literal (Text in Anführungszeichen/Backtick), nicht eine Erwähnung im Kommentar.
    const literal = /[`'"]Willkommen zurück/.exec(main);
    expect(literal, 'A38-Meldungstext steht als Literal in main.ts').not.toBeNull();
    const i = literal!.index;
    // Die Bedingung, die die Meldung umschließt: das letzte `if (` vor dem Literal bis zu seiner öffnenden Klammer `{`.
    const ifStart = main.lastIndexOf('if (', i);
    expect(ifStart, 'Meldung steht in einer if-Bedingung').toBeGreaterThan(0);
    const bedingung = main.slice(ifStart, main.indexOf('{', ifStart));
    expect(bedingung, '„Willkommen zurück“ hängt an !spiel.tutorialAktiv() in derselben Bedingung').toMatch(/!\s*spiel\.tutorialAktiv\(\)/);
  });
});

// ═══════════════════════════ E: Werte und Texte ═══════════════════════════
describe('NR13 Abnahme – Zahlen aus dem Spiel und Textlängen', () => {
  it('test_nr13_a_25er_mit_14_kw_nennt_32er_und_endet_ohne_warnung', async () => {
    const alt = KATALOG.d25.kapazitaet_kw;
    try {
      KATALOG.d25.kapazitaet_kw = 14;
      const l = await neuesSpiel({ leitung: 'd32' });
      expect(kern(l.s, 'tutorialWerte')().leitung).toBe('d32');
      let t12 = '';
      laufen(l, { bei: (a) => { if (a.schritt === 'T12') t12 = ohneMarken(a.text); } });
      expect(t12).toBe(`Fertig geplant! Nimm die 32er – sie trägt im Spiel bis 25${NB}kW, genug für beide Häuser.`);
      expect(l.log.filter((e) => e.art === 'engstelle')).toEqual([]);
      expect(warmeHaeuser(l.s)).toEqual([l.h1.id, l.h2.id].sort((a, b) => a - b));
    } finally { KATALOG.d25.kapazitaet_kw = alt; }
  });

  it('test_nr13_a_kessel_leistung_geaendert_t03_zahl_aendert_sich', async () => {
    const leistung = KATALOG.kessel.leistung_kw as number[];
    const alt = leistung[0];
    try {
      leistung[0] = 85;
      const l = await neuesSpiel();
      laufen(l, { bis: 'T03' });
      expect(ohneMarken(jetzt(l).text)).toBe(`Wie viel Wärme er in jedem Moment schafft, misst man in Kilowatt (kW). Dein Kessel schafft 85${NB}kW.`);
    } finally { leistung[0] = alt; }
  });

  it('test_nr13_a_texte_hoechstens_120_zeichen_und_2_saetze_mit_20_zeichen_namen', async () => {
    const l = await neuesSpiel({ name: NAME });
    expect(l.name.length).toBe(20);
    const texte: Array<[string, string]> = [];
    const pruefen = (wo: string, t: string | undefined): void => { if (t) texte.push([wo, t.replace('{Restzeit}', '10 s')]); };
    const efh = KATALOG.efh as { verbrauch_kwh_a?: number };
    const kessel = KATALOG.kessel.leistung_kw as number[];
    laufen(l, {
      bei: (a) => {
        pruefen(a.schritt, a.text); pruefen(`${a.schritt} knopf`, a.knopf_hinweis); pruefen(`${a.schritt} warten`, a.warte_text);
        pruefen(`${a.schritt} kapsel`, a.info_kapsel);
        for (const b of ALLE_BEDIENUNGEN) {
          const sp = l.tut.sperre(b);
          if (!sp) continue;
          pruefen(`${a.schritt} sperre ${b}`, sp.satz);
          l.tut.gesperrtGetippt(b); pruefen(`${a.schritt} blase ${b}`, jetzt(l).text); l.tut.handlung();
        }
        if (['T03', 'T06', 'T07', 'T17'].includes(a.schritt)) {
          // schlechtester Fall K1: 7 Zeichen je Leistung (17,5 kW / 13,1 kW), 999 kW Kessel
          const altV = efh.verbrauch_kwh_a, altK = kessel[0];
          try {
            efh.verbrauch_kwh_a = 26_250; kessel[0] = 999; l.s.neuBerechnen();
            const v = jetzt(l);
            pruefen(`${a.schritt} gross`, v.text); pruefen(`${a.schritt} gross kapsel`, v.info_kapsel);
            if (a.schritt === 'T17') expect(ohneMarken(v.text)).toContain(`13,1${NB}kW statt 17,5${NB}kW`);
            if (a.schritt === 'T06') expect(v.info_kapsel).toBe(`26.250${NB}kWh im Jahr · bis 17,5${NB}kW`);
            if (a.schritt === 'T03') expect(ohneMarken(v.text)).toContain(`999${NB}kW.`);
          } finally { efh.verbrauch_kwh_a = altV; kessel[0] = altK; l.s.neuBerechnen(); }
        }
        if (!W_SCHRITTE.has(a.schritt)) { for (let i = 0; i < 3; i++) tippen(l, 'daneben'); pruefen(`${a.schritt} hilfe`, jetzt(l).text); }
      },
    });
    for (let k = 1; k <= 6; k++) pruefen(`wiedereinstieg ${k}`, wiederSatz(NAME, k));
    expect(texte.length).toBeGreaterThan(60);
    for (const [wo, t] of texte) {
      expect(ohneMarken(t).length, `${wo}: „${ohneMarken(t)}“`).toBeLessThanOrEqual(120);
      expect(saetze(t, NAME), `${wo}: höchstens 2 Sätze – „${ohneMarken(t)}“`).toBeLessThanOrEqual(2);
    }
  });
});

// ═══════════════════════════ F: manipulierte Tutorial-Daten ═══════════════════════════
describe('NR13 Abnahme – manipulierte Merke', () => {
  const KAPUTT: unknown[] = ['x', 5, true, null, [], {}, { kapitel: 'a' }, { kapitel: '3' }, { kapitel: 0 }, { kapitel: 7 },
    { kapitel: 2.5 }, { kapitel: -1 }, { kapitel: null }, { kapitel: [3] }, { kapitel: 'A'.repeat(100_000) }, [{ kapitel: 1 }]];

  it('test_nr13_a_kaputte_merke_wird_geloescht_nie_erzwungen', async () => {
    const M = await tutorialModul();
    for (const wert of KAPUTT) {
      const st = neuesSpielMitTutorial(T0);
      st.namen_gefragt = true;
      merkeSetzen(st, wert);
      const text = serialisieren(st);
      const { stand, befund } = ladenMitBefund(text, T0);
      const was = JSON.stringify(wert).slice(0, 40);
      expect(befund, was).not.toBe('defekt');
      expect(merke(stand), `${was}: Feld gelöscht`).toBeUndefined();
      expect(stand.objekte, `${was}: Dorf unverändert`).toEqual(JSON.parse(text).objekte);
      const s = new Spiel(stand, () => T0);
      expect(kern(s, 'tutorialAktiv')(), was).toBe(false);
      const tut = new M.Tutorial(s, { wiedereinstieg: true });
      expect(tut.aktiv(), was).toBe(false);
      expect(tut.ansicht(T0), was).toBeNull();
    }
  });

  it('test_nr13_a_haus1_verschoben_oder_weg_merke_geloescht', () => {
    const verschoben = neuesSpielMitTutorial(T0);
    hausBei(verschoben, ERSTE_HAEUSER[0]).y += 3;
    const weg = neuesSpielMitTutorial(T0);
    const h = hausBei(weg, ERSTE_HAEUSER[1]);
    weg.objekte = weg.objekte.filter((o) => o !== h);
    for (const [was, st] of [['Haus 1 verschoben', verschoben], ['Haus 2 fehlt', weg]] as const) {
      const { stand, befund } = ladenMitBefund(serialisieren(st), T0);
      expect(befund, was).not.toBe('defekt');
      expect(merke(stand), was).toBeUndefined();
    }
  });

  it('test_nr13_a_gueltige_merke_bleibt_nach_speichern_und_laden', () => {
    for (let k = 1; k <= 6; k++) {
      const st = neuesSpielMitTutorial(T0);
      merkeSetzen(st, { kapitel: k });
      const { stand, befund } = ladenMitBefund(serialisieren(st), T0);
      expect(befund).toBe('ok');
      expect(merke(stand)).toEqual({ kapitel: k });
    }
  });
});

// ═══════════════════════════ G: Sperren beim Abschließen (13.7, 13.15 K7) ═══════════════════════════
describe('NR13 Abnahme – Abschließen gesperrt', () => {
  it('test_nr13_a_t13_haeuser_fehlen_satz_in_der_blase', async () => {
    const l = await neuesSpiel();
    laufen(l, { bis: 'T13' });
    for (const [x, y] of SPUR.slice(0, 2)) { expect(l.s.platzieren(l.leitung, x, y).ok).toBe(true); pumpen(l); }
    expect(l.tut.sperre('abschliessen')).toEqual({ kurz: `2${NB}Häuser fehlen`, satz: HAEUSER_SATZ });
    expect(l.tut.sperre('blatt_schliessen')?.satz).toBe(LEISTE_SATZ);
    for (const [x, y] of SPUR.slice(2, 4)) { expect(l.s.platzieren(l.leitung, x, y).ok).toBe(true); pumpen(l); }
    expect(l.tut.sperre('abschliessen')).toEqual({ kurz: `noch 1${NB}Haus fehlt`, satz: HAEUSER_SATZ });
    for (let i = 0; i < 3; i++) tippen(l, 'daneben');
    l.tut.gesperrtGetippt('abschliessen');
    expect(ohneMarken(jetzt(l).text), 'Sperr-Satz geht allem vor (K4)').toBe(HAEUSER_SATZ);
    l.tut.handlung();
    expect(ohneMarken(jetzt(l).text)).not.toBe(HAEUSER_SATZ);
    for (const [x, y] of SPUR.slice(4)) { expect(l.s.platzieren(l.leitung, x, y).ok).toBe(true); pumpen(l); }
    expect(jetzt(l).schritt).toBe('T14');
    expect(l.tut.sperre('abschliessen'), 'beide erreicht, Geld reicht → frei').toBeNull();
  });

  it('test_nr13_a_zu_viel_gezeichnet_geld_sperre_bis_leitungen_weg', async () => {
    const l = await neuesSpiel({ geld_eur: 16_000 });
    laufen(l, { bis: 'T13' });
    expect(l.s.stand.geld_eur).toBe(14_000);
    const zeichne = (felder: ReadonlyArray<readonly [number, number]>): void => {
      for (const [x, y] of felder) { expect(l.s.platzieren(l.leitung, x, y).ok, `(${x}|${y})`).toBe(true); pumpen(l); }
    };
    zeichne(SPUR.slice(0, 4));
    expect(kern(l.s, 'tutorialGeldFehlt_eur')()).toBe(0);
    expect(l.tut.sperre('abschliessen')?.kurz).toBe(`noch 1${NB}Haus fehlt`);
    zeichne([[9, 12], [8, 12], [7, 12], [9, 11]]); // vier Felder neben der Spur
    expect(kern(l.s, 'tutorialGeldFehlt_eur')(), '8 Felder + 2 Stationen − 14.000 €').toBe(340);
    expect(l.tut.sperre('abschliessen'), 'Geld-Sperre vor Häuser-Sperre').toEqual({ kurz: GELD_KURZ, satz: GELD_SATZ });
    l.tut.gesperrtGetippt('abschliessen');
    expect(ohneMarken(jetzt(l).text)).toBe(GELD_SATZ);
    l.tut.handlung();
    zeichne(SPUR.slice(4));
    l.tut.zustandPruefen();
    expect(kern(l.s, 'tutorialGeldFehlt_eur')()).toBe(1_140);
    // Weg b (ENTSCHEIDUNGEN 2026-11-06, DESIGN 13.15 K12, Bauplan F3 Punkt 11): beide Häuser erreicht, Geld fehlt → T13 bleibt
    const a = jetzt(l);
    expect(a.schritt, 'beide erreicht, Geld fehlt → Schritt bleibt T13 (Weg b)').toBe('T13');
    expect(ohneMarken(a.text), 'Blase zeigt den Geld-Satz (K7)').toBe(GELD_SATZ);
    expect(a.finger, 'kein Finger auf einem gesperrten Knopf').toBe('aus');
    expect(l.tut.sperre('abschliessen')).toEqual({ kurz: GELD_KURZ, satz: GELD_SATZ });
    // K12 Muss: alle Häuser-Sätze weichen dem Geld-Satz – Hilfe nach drei Fehltipps, Sperr-Satz bei [X], Sperr-Satz Abschließen
    for (let i = 0; i < 3; i++) tippen(l, 'daneben');
    expect(jetzt(l).schritt).toBe('T13');
    expect(ohneMarken(jetzt(l).text), 'Hilfe-Satz nach drei Fehltipps weicht dem Geld-Satz (K12)').toBe(GELD_SATZ);
    expect(l.tut.sperre('blatt_schliessen'), 'Leiste bleibt in T13 offen').not.toBeNull();
    expect(l.tut.sperre('blatt_schliessen')?.satz, 'Sperr-Satz bei [X] sagt nicht „bis beide Häuser erreicht“ (K12)').not.toBe(LEISTE_SATZ);
    l.tut.gesperrtGetippt('blatt_schliessen');
    expect(ohneMarken(jetzt(l).text), 'Sperr-Satz bei [X] weicht dem Geld-Satz (K12)').toBe(GELD_SATZ);
    l.tut.handlung();
    expect(ohneMarken(jetzt(l).text), 'nach der Handlung weiter der Geld-Satz, kein Häuser-/Hilfe-Satz').toBe(GELD_SATZ);
    l.tut.gesperrtGetippt('abschliessen');
    expect(ohneMarken(jetzt(l).text)).toBe(GELD_SATZ);
    l.tut.handlung();
    // Zurück/Radieren: erst zwei Felder (Geld fehlt noch) → weiter T13 mit Geld-Satz
    for (const [x, y] of [[9, 11], [7, 12]] as const) { expect(l.s.geplanteLeitungEntfernen(x, y).ok).toBe(true); pumpen(l); }
    l.tut.zustandPruefen();
    expect(kern(l.s, 'tutorialGeldFehlt_eur')()).toBe(340);
    expect(jetzt(l).schritt, '340 € fehlen noch → T13').toBe('T13');
    expect(ohneMarken(jetzt(l).text)).toBe(GELD_SATZ);
    expect(l.tut.sperre('abschliessen')?.kurz).toBe(GELD_KURZ);
    // drittes Feld weg → Geld reicht → T14
    expect(l.s.geplanteLeitungEntfernen(8, 12).ok).toBe(true); pumpen(l);
    l.tut.zustandPruefen();
    expect(kern(l.s, 'tutorialGeldFehlt_eur')(), '7 Felder: 13.940 € ≤ 14.000 €').toBe(0);
    const b = jetzt(l);
    expect(b.schritt, 'beide erreicht und Geld reicht → T14').toBe('T14');
    expect(l.tut.sperre('abschliessen')).toBeNull();
    expect(ohneMarken(b.text)).toBe(TEXTE(NAME).T14);
    expect(b.finger).toBe('tippen');
    laufen(l);
    expect(warmeHaeuser(l.s), 'mit knappem Geld trotzdem zwei warme Häuser').toEqual([l.h1.id, l.h2.id].sort((x, y) => x - y));
  });
});

// ═══════════════════════════ H: Überspringen (nur Vorführ-Tempo) – Kern ═══════════════════════════
describe('NR13 Abnahme – Überspringen', () => {
  it('test_nr13_a_ueberspringen_loescht_merke_start_tipp_und_wandstation_frei', async () => {
    const l = await neuesSpiel();
    expect(l.s.startTippFaellig(), 'im Tutorial kein Start-Tipp').toBe(false);
    kern(l.s, 'tutorialUeberspringen')();
    expect(merke(l.s.stand)).toBeUndefined();
    expect(l.s.startTippFaellig()).toBe(true);
    expect(kern(l.s, 'wandstationFrei')()).toBe(true);
    expect(l.tut.ansicht(l.z.t)).toBeNull();
  });
});

// ═══════════════════════════ I: Oberfläche – Karte steht außerhalb T13 ═══════════════════════════
type Kamera = { zoom: number; schiebe_x: number; schiebe_y: number; winkel_rad: number };
async function gestenProbe(st: Spielstand): Promise<{ ansicht: unknown; vorher: Kamera; nachher: Kamera }> {
  const z = { t: T0 };
  const s = new Spiel(st, () => z.t);
  let erg: { ansicht: unknown; vorher: Kamera; nachher: Kamera } | null = null;
  await echteSteuerung(s, (u) => {
    const st2 = u.st as unknown as { anleitungAnsicht?: () => unknown; kamera: Kamera };
    if (typeof st2.anleitungAnsicht !== 'function') throw new Error('NR13: Steuerung.anleitungAnsicht fehlt noch (kommt mit P4)');
    const k = st2.kamera;
    const lesen = (): Kamera => ({ zoom: k.zoom, schiebe_x: k.schiebe_x, schiebe_y: k.schiebe_y, winkel_rad: k.winkel_rad });
    const vorher = lesen();
    const c = u.dom.app.querySelector('canvas')!;
    const p = (id: number, x: number, y: number) => ({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch', button: 0 });
    c.ausloesen('pointerdown', p(1, 400, 200)); c.ausloesen('pointermove', p(1, 460, 220)); c.ausloesen('pointermove', p(1, 520, 250));
    c.ausloesen('pointerup', p(1, 520, 250));
    c.ausloesen('wheel', { deltaY: -120, clientX: 420, clientY: 200 });
    c.ausloesen('pointerdown', p(2, 300, 200)); c.ausloesen('pointerdown', p(3, 500, 200));
    c.ausloesen('pointermove', p(3, 640, 280)); c.ausloesen('pointerup', p(3, 640, 280)); c.ausloesen('pointerup', p(2, 300, 200));
    erg = { ansicht: st2.anleitungAnsicht(), vorher, nachher: lesen() };
  }, { uhr: () => z.t });
  return erg!;
}

describe('NR13 Abnahme – Oberfläche', () => {
  it('test_nr13_a_karte_steht_im_tutorial_ausserhalb_t13', async () => {
    const r = await gestenProbe(neuesSpielMitTutorial(T0));
    expect(r.ansicht, 'Tutorial läuft in der Steuerung').not.toBeNull();
    expect(r.nachher, 'Ziehen, Mausrad, Zwei-Finger ändern die Kamera nicht').toEqual(r.vorher);
  });

  it('test_nr13_a_alter_stand_kein_tutorial_karte_frei', async () => {
    const r = await gestenProbe(altesStartdorf(T0));
    expect(r.ansicht).toBeNull();
    expect(r.nachher, 'Gegenprobe: dieselben Gesten bewegen die Karte').not.toEqual(r.vorher);
  });
});
