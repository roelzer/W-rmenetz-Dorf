import type {
  Bedienung, Feld, Schritt, Tipp, TippMeldung, TutorialAnsicht, TutorialBandFeld, TutorialLeitungsLage, TutorialSchrittId, TutorialSperre,
  TutorialWerte, ZielName,
} from './tutorial-vertrag';
import { ERSTE_HAEUSER, TUTORIAL_ABZWEIG, TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT } from './start';
import { KATALOG, istLeitung, type TypId } from './katalog';
import type { Objekt, Spielstand } from './typen';

// AE-NR13-4 (Bauplan NR13 Fassung 3.1, Paket P1): Schrittfolge, Texte, Bedingungen, Wiedereinstieg, Fehltipps, Sperren und
// alle Darstellungsentscheidungen je Schritt stehen hier. Die Oberfläche liest nur die TutorialAnsicht. Das Tutorial hört zu
// (Tipps der Oberfläche, Schritte des Kerns) und fragt den Kern über die TutorialLage – es rechnet keine Spielregel nach
// (AE-NR13-2). Importiert nur Vertrag, Start, Typen, Katalog (U3), darum steht das Zahlformat hier selbst.

/** Was das Tutorial vom Spiel braucht; `Spiel` erfüllt es strukturell. */
export interface TutorialLage {
  readonly stand: Spielstand; readonly netz: { readonly warm: ReadonlySet<number> }; readonly spielerName: string;
  erreichteHaeuser(): number[]; tutorialWerte(): TutorialWerte; tutorialGeldFehlt_eur(): number;
  tutorialLeitungen(): TutorialLeitungsLage;
  tutorialKapitelSetzen(kapitel: number): void; tutorialBeenden(): void;
}

/** DESIGN 13.5: Blasentexte höchstens 120 Zeichen (ohne Fett-Marken), auch mit 20 Zeichen langem Namen. */
export const TUTORIAL_TEXT_MAX = 120;

/** DESIGN 13.15 K2: Zurufe am Textanfang zählen nicht als Satz. */
export const TUTORIAL_ZURUFE: ReadonlyArray<string> = ['Hallo {Name}!', 'Prima!', 'Fertig geplant!', 'Geschafft, {Name}!', 'Weiter geht’s, {Name}!'];

/** Ein Schritt aus DESIGN 13.5 mit den Ansicht-Feldern aus dem Bauplan P1. Nicht genannte Felder gelten als aus/false. */
export interface TutorialSchrittDef {
  id: TutorialSchrittId; kapitel: number; art: 'W' | 'H'; text: string; hilfe: string;
  ziele: ZielName[]; finger: 'aus' | 'tippen' | 'spur';
  abdunkeln?: 'nur_hud' | 'nichts'; kamera?: 'fahrt' | 'frei'; kamera_ziele?: ZielName[];
  /** Handlungs-Schritt, der nur mit diesem Tipp weiterschaltet */
  tipp?: Tipp;
  effekt?: 'hz_federn' | 'pille_huepfen'; nach_handlung_schliessen?: 'blatt' | 'baumenue';
  info_kapsel?: true; wusstest_du?: true; normale_aktion?: true; t13?: true; los?: true;
}

const HILFE_W = 'Tippe auf Weiter.';
const HILFE_BAUEN = 'Der Knopf Bauen ist unten rechts – er leuchtet gelb.';
const HILFE_BLATT_KNOPF = 'Tippe auf den leuchtenden Knopf im Blatt.';
const HILFE_HAUS = 'Tippe auf das leuchtende Haus.';
const HILFE_PUFFER = 'Tippe auf Puffer-Übergabestation.';
const HZ: ZielName[] = ['heizzentrale'];
const HZ_HAEUSER: ZielName[] = ['heizzentrale', 'haus1', 'haus2'];
// Bauplan NR20-22 E8 (= DESIGN 13.17.2): Hilfe in T13 und T13h
const HILFE_SPUR = 'Leg den Finger auf das leuchtende Feld und zieh ihn die Spur entlang.';

export const TUTORIAL_SCHRITTE: ReadonlyArray<TutorialSchrittDef> = [
  { id: 'T01', kapitel: 1, art: 'H', tipp: 'heizzentrale', ziele: HZ, finger: 'tippen', kamera_ziele: HZ,
    text: 'Hallo {Name}! Ich bin Simon und zeige dir, wie dein Dorf warm wird. Tippe auf die Heizzentrale.',
    hilfe: 'Tippe auf das große Gebäude, das gelb leuchtet.' },
  { id: 'T02', kapitel: 1, art: 'W', ziele: HZ, finger: 'aus', kamera_ziele: HZ, effekt: 'hz_federn', hilfe: HILFE_W,
    text: 'Hier steht dein **Wärmeerzeuger**, ein **Hackschnitzelkessel**. Er verbrennt Holzreste und macht damit Wasser heiß.' },
  { id: 'T03', kapitel: 1, art: 'W', ziele: ['heizzentrale', 'waerme_pille'], finger: 'aus', kamera_ziele: HZ, effekt: 'pille_huepfen',
    hilfe: HILFE_W, text: 'Wie viel Wärme er in jedem Moment schafft, misst man in **Kilowatt (kW)**. Dein Kessel schafft {kessel_kw}.' },
  { id: 'T04', kapitel: 1, art: 'W', ziele: HZ, finger: 'aus', kamera_ziele: HZ, hilfe: HILFE_W,
    text: 'Das heiße Wasser fließt durch Rohre unter der Straße zu den Häusern. Das nennt man **Wärmenetz** oder **Nahwärme**.' },
  { id: 'T05', kapitel: 1, art: 'W', ziele: ['haus1', 'haus2'], finger: 'aus', kamera: 'fahrt', kamera_ziele: ['haus1', 'haus2'],
    hilfe: HILFE_W, text: 'Diese Häuser heizen noch mit Öl – siehst du den grauen Rauch? Du willst die ersten zwei anschließen.' },
  { id: 'T06', kapitel: 1, art: 'W', ziele: ['haus1'], finger: 'aus', kamera_ziele: ['haus1'], info_kapsel: true, hilfe: HILFE_W,
    text: 'Ein Haus braucht im Jahr {kwh} Wärme. An den kältesten Tagen braucht es bis zu {kw_ohne} gleichzeitig.' },
  { id: 'T07', kapitel: 1, art: 'W', ziele: ['haus1'], finger: 'aus', kamera_ziele: ['haus1'], info_kapsel: true, hilfe: HILFE_W,
    text: '**kW** ist, wie viel Wasser gerade aus dem Hahn läuft. **kWh** ist, wie voll der Eimer am Ende ist.' },
  { id: 'T08', kapitel: 2, art: 'H', tipp: 'baumenue', ziele: ['bauen'], finger: 'tippen', hilfe: HILFE_BAUEN,
    text: 'Leitungen baust du in **Bauabschnitten**. Tippe auf Bauen.' },
  { id: 'T09', kapitel: 2, art: 'H', tipp: 'reiter_leitungen', ziele: ['reiter_leitungen'], finger: 'tippen',
    hilfe: 'Leitungen ist der Reiter mit dem Rohr – oben im Blatt.', text: 'Hier ist alles für dein Netz. Tippe auf Leitungen.' },
  { id: 'T10', kapitel: 2, art: 'H', ziele: ['philipp'], finger: 'tippen', hilfe: HILFE_BLATT_KNOPF,
    text: 'Philipp plant, wo die Leitung in der Straße liegen soll. Tippe auf seinen Knopf.' },
  { id: 'T11', kapitel: 2, art: 'W', ziele: ['kasten_abschnitt'], finger: 'aus', hilfe: HILFE_W,
    text: 'Je mehr Häuser an einer Leitung hängen, desto mehr kW muss sie tragen – und desto dicker muss sie sein.' },
  { id: 'T12', kapitel: 3, art: 'H', tipp: 'leitungskarte', ziele: ['leitungskarte'], finger: 'tippen', kamera_ziele: HZ_HAEUSER,
    hilfe: 'Tippe auf die leuchtende Leitungs-Karte.',
    text: 'Fertig geplant! Zuerst die **Hauptleitung**: Nimm die dicke {haupt}, sie trägt die Wärme für beide Häuser.' },
  { id: 'T13', kapitel: 3, art: 'H', ziele: [], finger: 'spur', abdunkeln: 'nur_hud', kamera: 'frei', kamera_ziele: HZ_HAEUSER, t13: true,
    hilfe: HILFE_SPUR, text: 'Zieh die {haupt} von der Heizzentrale bis zur Abzweigung. Folge der Spur.' },
  { id: 'T13w', kapitel: 3, art: 'H', tipp: 'farbknopf', ziele: [], finger: 'tippen', abdunkeln: 'nur_hud', kamera: 'frei',
    kamera_ziele: HZ_HAEUSER, t13: true, hilfe: 'Tippe rechts in der Leiste auf {anschluss_zahl}.',
    text: 'Bis hier fließen {kw_summe} für beide Häuser, ab hier **je Haus nur** {kw_puffer}. Dafür reicht die {anschluss}.' },
  { id: 'T13h', kapitel: 3, art: 'H', ziele: [], finger: 'spur', abdunkeln: 'nur_hud', kamera: 'frei', kamera_ziele: HZ_HAEUSER, t13: true,
    hilfe: HILFE_SPUR, text: 'Jedes Haus bekommt seinen eigenen **Hausanschluss**. Zieh die {anschluss} bis ans erste Haus.' },
  { id: 'T14', kapitel: 3, art: 'H', ziele: ['abschliessen'], finger: 'tippen', hilfe: 'Unten in der Leiste: Abschnitt abschließen.',
    text: 'Beide Häuser sind erreicht. Tippe auf Abschnitt abschließen.' },
  { id: 'T15', kapitel: 4, art: 'H', tipp: 'haus', ziele: ['haus1'], finger: 'tippen', kamera_ziele: ['haus1'], normale_aktion: true,
    hilfe: HILFE_HAUS, text: 'Damit ein Haus die Wärme nehmen kann, braucht es eine **Übergabestation**. Tippe auf das erste Haus.' },
  { id: 'T16', kapitel: 4, art: 'W', ziele: ['kasten_station'], finger: 'aus', kamera_ziele: ['haus1'], hilfe: HILFE_W,
    text: 'Sie holt die Wärme aus dem Netz ins Haus. Ein **Wärmetauscher** trennt dabei das Netzwasser vom Heizwasser im Haus.' },
  { id: 'T17', kapitel: 4, art: 'H', ziele: ['puffer_knopf', 'haus1'], finger: 'tippen', kamera_ziele: ['haus1'],
    nach_handlung_schliessen: 'blatt', hilfe: HILFE_PUFFER,
    text: 'Nimm die mit **Pufferspeicher**. Ihr Tank sammelt Wärme vorab, so reichen {kw_puffer} statt {kw_ohne} aus dem Netz – genauso warm.' },
  { id: 'T18', kapitel: 4, art: 'H', tipp: 'haus', ziele: ['haus2'], finger: 'tippen', kamera_ziele: ['haus2'], normale_aktion: true,
    hilfe: HILFE_HAUS, text: 'Prima! Jetzt bekommt das zweite Haus auch eine. Tippe darauf.' },
  { id: 'T19', kapitel: 4, art: 'H', ziele: ['puffer_knopf'], finger: 'tippen', kamera_ziele: ['haus2'], nach_handlung_schliessen: 'blatt',
    hilfe: HILFE_PUFFER, text: 'Wieder die Puffer-Übergabestation, bitte.' },
  { id: 'T20', kapitel: 5, art: 'H', tipp: 'baumenue', ziele: ['bauen'], finger: 'tippen', hilfe: HILFE_BAUEN,
    text: 'Fehlt nur noch das Material. Tippe auf Bauen.' },
  { id: 'T21', kapitel: 5, art: 'H', ziele: ['laura'], finger: 'tippen', nach_handlung_schliessen: 'baumenue', hilfe: HILFE_BLATT_KNOPF,
    text: 'Tippe auf Laura. Sie bestellt Rohre und Stationen, dann wird gebaut.' },
  { id: 'T22', kapitel: 5, art: 'W', ziele: [], finger: 'aus', abdunkeln: 'nichts', kamera: 'fahrt', kamera_ziele: HZ_HAEUSER, hilfe: HILFE_W,
    text: 'In echt dauert so ein Bau einige Wochen. Für dich geht es heute schneller.' },
  { id: 'T23', kapitel: 5, art: 'W', ziele: ['geld_pille'], finger: 'aus', hilfe: HILFE_W,
    text: 'Deine Kunden zahlen für jede kWh, die bei ihnen ankommt, und eine feste Grundgebühr. Das ist deine Einnahme.' },
  { id: 'T24', kapitel: 6, art: 'W', ziele: ['haus1', 'haus2'], finger: 'aus', hilfe: HILFE_W,
    text: 'Geschafft, {Name}! Beide Häuser heizen jetzt mit Wärme aus deinem Netz statt mit Öl.' },
  { id: 'T25', kapitel: 6, art: 'W', ziele: ['leitungsstueck'], finger: 'aus', wusstest_du: true, hilfe: HILFE_W,
    text: 'In jeder Leitung liegen zwei Rohre: Heißes Wasser fließt hin (**Vorlauf**), abgekühltes zurück (**Rücklauf**).' },
  { id: 'T26', kapitel: 6, art: 'W', ziele: [], finger: 'aus', abdunkeln: 'nichts', los: true, hilfe: HILFE_W,
    text: 'Am Monatsende zahlen deine Kunden ihre Wärmerechnung. Damit schließt du die nächsten Häuser an.' },
];

const KAPITEL_NAMEN = ['', 'Die Heizzentrale', 'Planen mit Philipp', 'Leitung ziehen', 'Übergabestationen', 'Bauen', 'Warm!'];
// Bauplan NR20-22 E8 (= DESIGN 13.17.2 Fassung 2 und 13.17.8): Sätze in Kapitel 3, Platzhalter setzt `einsetzen` ein.
const ZWISCHENSTAND = 'Das erste Haus hat seinen Hausanschluss. Jetzt zieh die {anschluss} zum zweiten Haus.';
const SATZ_ZU_DUENN = 'Hier fließt Wärme für beide Häuser, die {anschluss} wäre randvoll. Nimm die {haupt} und zieh drüber.';
const SATZ_ZU_DICK = 'Für ein Haus reicht die {anschluss}. Tippe auf {anschluss_zahl} und zieh noch mal über dieses Stück.';
const SATZ_GROESSE = 'Ein Stück passt nicht zum Plan. Zieh mit der richtigen Größe noch mal drüber.';
// DESIGN 13.17.10 G3: Sind in T13h beide Häuser richtig angeschlossen, gibt es nichts mehr zu ziehen – dann nur der erste Satz.
const SATZ_STUECK_WEG = 'Nimm das gestreifte Stück mit Zurück oder Radierer weg.';
const SATZ_EIGENER_ABGANG = `${SATZ_STUECK_WEG} Zieh die {anschluss} von der Abzweigung.`;
const KURZ_GROESSE = 'Größe passt nicht';
const KURZ_WEG = 'Stück muss weg';
const INFO_KAPSEL = '{kwh} im Jahr · bis {kw_ohne}';
const WIEDEREINSTIEG = 'Weiter geht’s, {Name}! Wir waren gerade bei: {Kapitelname}';
const WARTE_PLANUNG = 'Philipp plant noch … {Restzeit}';
const WARTE_BAU = 'Gebaut wird … noch {Restzeit}';
// DESIGN 13.7 / 13.15 K7, K11: Sperren der Zeichenleiste in T13. Zeile 2 höchstens 18 Zeichen, geschütztes Leerzeichen.
const SATZ_LEISTE_OFFEN = 'Die Leiste bleibt offen, bis beide Häuser erreicht sind.';
const SATZ_ZU_FRUEH = 'Zieh die Leitung bis an beide Häuser – folge der Spur.';
const SATZ_GELD = 'Dann reicht dein Geld nicht mehr für die Stationen. Nimm mit Zurück ein paar Leitungen weg.';
const KURZ_GELD = 'Geld reicht nicht';
const KURZ_EIN_HAUS = 'noch 1 Haus fehlt';
const KURZ_ZWEI_HAEUSER = '2 Häuser fehlen';
// Gesperrter Grundzustand (DESIGN 13.5): Zeile 2 wie bei der Wandstation (13.5 T17). Diese Bedienungen liegen unter dem
// Abdunkeln – ein Tipp darauf gilt als „falsch getippt“ (13.7), darum gibt es keinen Simon-Satz für die Blase.
const GRUNDSPERRE: TutorialSperre = { kurz: 'später wählbar', satz: '' };
// DESIGN 13.16 K4: „wählbar“ passt nur zu einer Auswahl; Aktionen, die das Tutorial nie freigibt, gehen erst danach.
const AKTIONSSPERRE: TutorialSperre = { kurz: 'nach dem Tutorial', satz: '' };

interface TutorialObjekte { hz: Objekt; haus1: Objekt; haus2: Objekt }

/** Heizzentrale = `typ 'hz'`; Tutorial-Häuser = Kategorie `haus` genau auf den ERSTE_HAEUSER-Koordinaten (Rückfrage P1-8). */
function tutorialObjekte(stand: Spielstand): TutorialObjekte | null {
  const hz = stand.objekte.find((o) => o.typ === 'hz');
  const [a, b] = ERSTE_HAEUSER.map(([x, y]) => stand.objekte.find((o) => o.x === x && o.y === y && KATALOG[o.typ].kategorie === 'haus'));
  return hz && a && b ? { hz, haus1: a, haus2: b } : null;
}

const index = (id: TutorialSchrittId): number => TUTORIAL_SCHRITTE.findIndex((s) => s.id === id);

/** DESIGN 13.7 „Wiedereinstieg nach Neustart“: aus dem Zustand (nicht aus der letzten Blase) der Schritt, an dem es weitergeht. */
export function einstieg(lage: TutorialLage): TutorialSchrittId {
  const t = tutorialObjekte(lage.stand);
  if (!t) throw new Error('Tutorial-Wiedereinstieg: Heizzentrale oder eines der zwei ersten Häuser fehlt im Spielstand.');
  const a = lage.stand.abschnitt;
  if (!a) {
    if (lage.netz.warm.has(t.haus1.id) && lage.netz.warm.has(t.haus2.id)) return 'T24';
    return (lage.stand.tutorial?.kapitel ?? 1) <= 1 ? 'T01' : 'T08';
  }
  switch (a.phase) {
    case 'planung': return 'T11';
    case 'offen': {
      // Bauplan NR20-22 P2 „Wiedereinstieg“, in dieser Reihenfolge; mit eigenem Abgang oder Planungsfehler nie T14.
      const lg = lage.tutorialLeitungen();
      if (!lg.haupt_ok) return 'T12';
      if (lg.fremd.length > 0) return 'T13h';
      if (!lg.haus1_ok || !lg.haus2_ok) return 'T13w';
      return lg.planungsfehler ? 'T13h' : 'T14';
    }
    case 'bestellen': return !t.haus1.station ? 'T15' : !t.haus2.station ? 'T18' : 'T20';
    case 'bau': return 'T22';
  }
}

/** DESIGN 13.15 K3: Tausenderpunkt, Dezimalkomma, höchstens eine Nachkommastelle, „,0“ fällt weg, U+00A0 vor der Einheit. */
function zahl(wert: number, einheit: string): string {
  if (!Number.isFinite(wert)) throw new Error(`Tutorial-Text: Wert ${wert} ${einheit} ist keine endliche Zahl.`);
  const zehntel = Math.round(Math.abs(wert) * 10);
  const ganz = String(Math.floor(zehntel / 10)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const rest = zehntel % 10;
  return `${wert < 0 && zehntel > 0 ? '-' : ''}${ganz}${rest ? `,${rest}` : ''} ${einheit}`;
}

/** `{anschluss_zahl}` = Aufschrift des Farbknopfs aus dem Katalognamen („25er-Leitung“ → „25“). */
function leitungsZahl(typ: TypId): string {
  const m = /^(\d+)er-Leitung$/.exec(KATALOG[typ].name);
  if (!m) throw new Error(`Tutorial-Text: ${typ} ist keine Leitung mit Kurzform („${KATALOG[typ].name}“).`);
  return m[1];
}

/** `{haupt}`/`{anschluss}` = Kurzform des Katalognamens („25er-Leitung“ → „25er“). */
const kurzform = (typ: TypId): string => `${leitungsZahl(typ)}er`;

type Nr20Felder = Pick<TutorialAnsicht, 'band' | 'naechstes_feld' | 'zielscheibe' | 'finger_weg' | 'fremd' | 'ziel_stecker'
  | 'ziel_ring' | 'erreicht_ids' | 'farbknopf_ring' | 'zeichenleiste' | 'zeichnen_ruht' | 'kompakt' | 'ruhe'>;

/** NR20/NR21: Ansicht-Felder für Spur, Ziele und Ruhe – leer bzw. aus, bis die Schrittlogik für Kapitel 3 sie füllt.
 *  Jedes Mal neue Listen, damit kein Aufrufer eine gemeinsame Liste verändert. */
function nr20Leer(): Nr20Felder {
  return { band: [], naechstes_feld: null, zielscheibe: null, finger_weg: [], fremd: [], ziel_stecker: [], ziel_ring: null,
    erreicht_ids: [], farbknopf_ring: null, zeichenleiste: null, zeichnen_ruht: false, kompakt: false, ruhe: false };
}

function einsetzen(text: string, w: TutorialWerte, name: string, kapitelname = ''): string {
  const werte: Record<string, () => string> = {
    Name: () => name, Kapitelname: () => kapitelname,
    haupt: () => kurzform(w.haupt), anschluss: () => kurzform(w.anschluss), anschluss_zahl: () => leitungsZahl(w.anschluss),
    kessel_kw: () => zahl(w.kessel_kw, 'kW'), kwh: () => zahl(w.kwh, 'kWh'), kw_summe: () => zahl(w.kw_summe, 'kW'),
    kw_ohne: () => zahl(w.kw_ohne, 'kW'), kw_puffer: () => zahl(w.kw_puffer, 'kW'),
  };
  return text.replace(/\{(\w+)\}/g, (_, k: string) => {
    const f = werte[k];
    if (!f) throw new Error(`Tutorial-Text: unbekannter Platzhalter {${k}}.`);
    return f();
  });
}

/** Feldmitte eines Objekts. Die Heizzentrale bleibt im Tutorial auf Stufe 1 (2×2 laut Katalog); netz.groesse ist hier tabu (U3). */
function mitte(o: Objekt): [number, number] {
  const g = KATALOG[o.typ].groesse ?? 1;
  return [o.x + g / 2, o.y + g / 2];
}

/** K9 / Rückfrage P1-6: gebautes Leitungsfeld nächst der Mitte Heizzentrale–Haus 1 (Gleichstand: kleinere id) plus bis zu zwei
 *  gebaute Leitungsnachbarn (gleiches x und y±1 bzw. gleiches y und x±1). */
function leitungsstueck(stand: Spielstand, t: TutorialObjekte): number[] {
  const [hx, hy] = mitte(t.hz), [ax, ay] = mitte(t.haus1);
  const mx = (hx + ax) / 2, my = (hy + ay) / 2;
  const gebaut = stand.objekte.filter((o) => istLeitung(o.typ) && !o.geplant).sort((p, q) => p.id - q.id);
  let best: Objekt | null = null, bestD = Infinity;
  for (const o of gebaut) {
    const [ox, oy] = mitte(o);
    const d = (ox - mx) ** 2 + (oy - my) ** 2;
    if (d < bestD) { best = o; bestD = d; }
  }
  if (!best) return [];
  const b = best;
  const nachbarn = gebaut.filter((o) => Math.abs(o.x - b.x) + Math.abs(o.y - b.y) === 1).slice(0, 2);
  return [b.id, ...nachbarn.map((o) => o.id)];
}

type Stueck = 'haupt' | 'haus1' | 'haus2';

/** Spurstücke in Zugrichtung (Bauplan NR20-22 E1, Konstanten aus start.ts). */
const STUECKE: Record<Stueck, ReadonlyArray<Feld>> = { haupt: TUTORIAL_HAUPT, haus1: TUTORIAL_ANSCHLUSS_1, haus2: TUTORIAL_ANSCHLUSS_2 };
const STUECK_HAUS: Record<1 | 2, Stueck> = { 1: 'haus1', 2: 'haus2' };

/** Bauplan NR20-22 P2 „Band“: Feldschritt zum nächsten Feld des Stücks, letztes Feld eines Hausanschlusses → sein Haus
 *  (ERSTE_HAEUSER), Abzweig → null. Die Konstanten liegen fest; passt ein Schritt nicht, ist die Spur kaputt – das soll laut auffallen. */
function pfeil(stueck: Stueck, x: number, y: number): Feld | null {
  const felder = STUECKE[stueck];
  const i = felder.findIndex(([fx, fy]) => fx === x && fy === y);
  if (i < 0) throw new Error(`Tutorial-Spur: Feld (${x}|${y}) gehört nicht zum Stück ${stueck}.`);
  if (stueck === 'haupt' && i === felder.length - 1) return null;
  const [zx, zy] = i < felder.length - 1 ? felder[i + 1] : ERSTE_HAEUSER[stueck === 'haus1' ? 0 : 1];
  const dx = zx - x, dy = zy - y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) throw new Error(`Tutorial-Spur: (${x}|${y}) → (${zx}|${zy}) ist kein Feldschritt.`);
  return [dx, dy];
}

/** Bauplan NR20-22 P2 K2: Hausmitte in Feldkoordinaten (die Steuerung rechnet sie mit kamera.mitte um) – nicht `mitte()`. */
function hausmitte(o: Objekt): Feld {
  const g = KATALOG[o.typ].groesse ?? 1;
  return [o.x + (g - 1) / 2, o.y + (g - 1) / 2];
}

/** Bauplan NR20-22 P2 `ziel_ring`: das Haus mit eigenem Abgang, sonst das erste nicht richtig angeschlossene (K2, ohne Verlauf). */
function zielHaus(lg: TutorialLeitungsLage): 1 | 2 | null {
  return lg.fremd_haus ?? (!lg.haus1_ok ? 1 : !lg.haus2_ok ? 2 : null);
}

export class Tutorial {
  private schrittIndex = 0;
  private daneben = 0;
  private sperrGetippt: Bedienung | null = null;
  /** Bauplan NR20-22 P2: ein Zug läuft (Finger aufgesetzt oder leitung_gezeichnet in T13–T13h) bis zum Tipp „abgehoben“ oder
   *  Schrittwechsel. Auch ein Radierzug zählt (ENTSCHEIDUNGEN 2026-11-07): kein Schrittwechsel unter dem Finger. */
  private zugLaeuft = false;
  /** DESIGN 13.17.9 F8, ENTSCHEIDUNGEN 2026-11-07 (6): Haus, dessen eigener Abgang weggenommen wird bzw. wurde. Solange es nicht
   *  richtig angeschlossen ist, bleibt die Zielscheibe auf dem Abzweig stehen – auch wenn kein Stück mehr weg muss. Ohne diese
   *  Erinnerung wäre der Zustand nach dem Wegnehmen nicht vom normalen Zwischenstand zu unterscheiden. */
  private zielscheibeHaus: 1 | 2 | null = null;
  private intro: boolean;
  private beendet = false;

  constructor(private readonly lage: TutorialLage, opt?: { wiedereinstieg?: boolean }) {
    this.intro = !!opt?.wiedereinstieg;
    if (this.aktiv()) this.schrittIndex = index(einstieg(lage));
    this.zielscheibeMerken();
  }

  /** Merkt sich das Haus mit eigenem Abgang und vergisst es, sobald es richtig angeschlossen ist oder Kapitel 3 vorbei ist. */
  private zielscheibeMerken(): void {
    if (!this.aktiv() || !(this.def.t13 || this.def.id === 'T14')) { this.zielscheibeHaus = null; return; }
    const lg = this.leitungen();
    if (lg.fremd_haus !== null) this.zielscheibeHaus = lg.fremd_haus;
    else if (this.zielscheibeHaus !== null && (this.zielscheibeHaus === 1 ? lg.haus1_ok : lg.haus2_ok)) this.zielscheibeHaus = null;
  }

  aktiv(): boolean {
    return !this.beendet && !!this.lage.stand.tutorial && tutorialObjekte(this.lage.stand) !== null;
  }

  private get def(): TutorialSchrittDef { return TUTORIAL_SCHRITTE[this.schrittIndex]; }
  private objekte(): TutorialObjekte { return tutorialObjekte(this.lage.stand) as TutorialObjekte; }

  /** Leitungslage für den aktuellen Schritt. Review P5f-1 W1, Entscheidung (a): Die Rest-Stück-Regel (DESIGN 13.17.9 F3) gilt
   *  erst ab T13h. In T13 (Hauptleitung ziehen) und T13w (Größe wechseln) würde ein Stück abseits der Spur sonst Satz, Finger und
   *  Ring gegen den Schritt führen und schon den ersten Zug des erlaubten Umwegs (11|12)→(10|12) streifen. Dort zählt fremd
   *  wie vor P5f-1 nur bei eigenem Abgang oder bei einem Planungsfehler trotz beider Häuser ok. Gefiltert wird hier und nicht
   *  im Kern, weil Spiel.tutorialLeitungen() den Schritt nicht kennt. Bewusste Vereinfachung: Liegt in T13/T13w ein eigener
   *  Abgang, bleiben auch zusätzliche Reststücke gestreift – der Kern liefert die Teile von fremd nicht getrennt. */
  private leitungen(): TutorialLeitungsLage {
    const lg = this.lage.tutorialLeitungen();
    const id = this.def.id;
    if ((id !== 'T13' && id !== 'T13w') || lg.fremd.length === 0) return lg;
    const wieVorher = lg.fremd_haus !== null || (lg.haus1_ok && lg.haus2_ok && lg.planungsfehler);
    return wieVorher ? lg : { ...lg, fremd: [] };
  }

  /** DESIGN 13.17.10 G3: T13h, beide Häuser richtig angeschlossen, aber noch ein gestreifter Rest. Nur in T13h: In T13 bleibt
   *  der volle Satz (Review P5f-1 W1 (a), tests/nr21-feinschliff-w1.test.ts). */
  private nurRestWeg(lg: TutorialLeitungsLage): boolean {
    return this.def.id === 'T13h' && lg.fremd.length > 0 && lg.haus1_ok && lg.haus2_ok;
  }

  /** Satz „Stück muss weg“ für Blase und Sperre: ohne Aufforderung zum Ziehen, wenn nur noch ein Rest liegt (G3). */
  private satzWeg(lg: TutorialLeitungsLage, w: TutorialWerte): string {
    return this.nurRestWeg(lg) ? SATZ_STUECK_WEG : einsetzen(SATZ_EIGENER_ABGANG, w, this.lage.spielerName);
  }

  /** Bauplan NR20-22 P2: richtig angeschlossene Tutorial-Häuser laut Leitungslage, nicht „irgendwie verbunden“. */
  private erreichtZahl(lg: TutorialLeitungsLage): number {
    return (lg.haus1_ok ? 1 : 0) + (lg.haus2_ok ? 1 : 0);
  }

  /** Weg b (ENTSCHEIDUNGEN 2026-11-06) und Bauplan NR20-22 P2: T14 nur mit richtiger Hauptleitung, beiden Häusern, ohne
   *  Planungsfehler, ohne Stück, das weg muss (Rest-Stück, DESIGN 13.17.9 F3: auch bei beiden Häusern ok), und mit genug Geld. */
  private abschliessenBereit(lg: TutorialLeitungsLage): boolean {
    return lg.haupt_ok && this.erreichtZahl(lg) === 2 && !lg.planungsfehler && lg.fremd.length === 0
      && this.lage.tutorialGeldFehlt_eur() === 0;
  }

  /** Zustand des Handlungs-Schritts erfüllt (Bauplan P1 „Weiterschalten“); undefined = Schritt hat keinen Zustand. */
  private zustandErfuellt(id: TutorialSchrittId): boolean | undefined {
    const a = this.lage.stand.abschnitt, t = this.objekte();
    switch (id) {
      case 'T10': return !!a;
      case 'T13': return this.leitungen().haupt_ok && !this.zugLaeuft;
      case 'T13w': { const lg = this.leitungen(); return lg.haus1_ok && lg.haus2_ok; }
      case 'T13h': return this.abschliessenBereit(this.leitungen()) && !this.zugLaeuft;
      case 'T14': return a?.phase === 'bestellen';
      case 'T17': return !!t.haus1.station;
      case 'T19': return !!t.haus2.station;
      case 'T21': return a?.phase === 'bau';
      default: return undefined;
    }
  }

  private wechseln(nach: number): void {
    const vorher = this.def;
    this.schrittIndex = nach;
    this.daneben = 0;
    this.sperrGetippt = null;
    this.zugLaeuft = false;
    if (this.def.kapitel !== vorher.kapitel) this.lage.tutorialKapitelSetzen(this.def.kapitel);
  }

  private vor(): void {
    if (this.schrittIndex === TUTORIAL_SCHRITTE.length - 1) {
      this.beendet = true;
      this.lage.tutorialBeenden();
      return;
    }
    this.wechseln(this.schrittIndex + 1);
  }

  /** Bauplan NR20-22 P2 „Rückwärts“: T13w/T13h/T14 → T13 ohne richtige Hauptleitung; T14 → T13h, wenn nicht abschließbar.
   *  true = zurückgesprungen. */
  private zurueck(): boolean {
    const id = this.def.id;
    if (id !== 'T13w' && id !== 'T13h' && (id !== 'T14' || this.zustandErfuellt('T14'))) return false;
    const lg = this.leitungen();
    if (!lg.haupt_ok) { this.wechseln(index('T13')); return true; }
    if (id === 'T14' && !this.abschliessenBereit(lg)) { this.wechseln(index('T13h')); return true; }
    return false;
  }

  /** Übergänge aus dem Zustand, auch mehrere hintereinander (Eintritt in einen schon erfüllten Handlungs-Schritt). */
  private nachZustand(): void {
    this.zielscheibeMerken();
    for (let i = 0; i < TUTORIAL_SCHRITTE.length && !this.beendet && !this.intro; i++) {
      if (this.zurueck()) return;
      const d = this.def;
      if (d.art !== 'H' || this.zustandErfuellt(d.id) !== true) return;
      this.vor();
    }
  }

  private wartet(): boolean {
    const a = this.lage.stand.abschnitt;
    if (this.def.id === 'T11') return a?.phase === 'planung';
    if (this.def.id === 'T23') return !!a;
    return false;
  }

  private tippPasst(m: TippMeldung): boolean {
    const d = this.def;
    if (m.tipp !== d.tipp) return false;
    if (d.id === 'T12') return m.typ === this.lage.tutorialWerte().haupt;
    if (d.id === 'T13w') return m.typ === this.lage.tutorialWerte().anschluss;
    if (d.id === 'T15') return m.objekt_id === this.objekte().haus1.id;
    if (d.id === 'T18') return m.objekt_id === this.objekte().haus2.id;
    return true;
  }

  tipp(m: TippMeldung): void {
    if (!this.aktiv()) return;
    if (m.tipp === 'abgehoben') this.zugLaeuft = false;
    if (m.tipp === 'daneben') this.daneben++;
    else if (this.intro) {
      if (m.tipp === 'weiter') { this.intro = false; this.daneben = 0; this.sperrGetippt = null; }
    } else if (this.def.art === 'W') {
      if (m.tipp === 'weiter' && !this.wartet()) this.vor();
    } else if (this.tippPasst(m)) this.vor();
    this.nachZustand();
  }

  schritt(e: { schritt: Schritt; objekt_id?: number }): void {
    if (!this.aktiv()) return;
    this.sperrGetippt = null;
    if (this.intro) return;
    if (this.def.t13 && e.schritt === 'leitung_gezeichnet') this.zugLaeuft = true;
    this.nachZustand();
  }

  /** Die Oberfläche meldet: Finger im Zeichen- oder Radiermodus aufgesetzt. Weiter geht es erst mit dem Tipp „abgehoben“. */
  zugBeginnt(): void {
    if (!this.aktiv() || this.intro || !this.def.t13) return;
    this.zugLaeuft = true;
  }

  handlung(): void {
    if (!this.aktiv()) return;
    this.sperrGetippt = null;
    this.nachZustand();
  }

  zustandPruefen(): void {
    if (!this.aktiv() || this.intro || !(this.def.t13 || this.def.id === 'T14')) return;
    this.nachZustand();
  }

  sperre(b: Bedienung): TutorialSperre | null {
    if (!this.aktiv()) return null;
    const t13 = !!this.def.t13;
    switch (b) {
      case 'karte_gesten': return t13 ? null : GRUNDSPERRE;
      case 'abschliessen': return t13 ? this.abschliessenSperre(this.leitungen()) : null;
      case 'blatt_schliessen': {
        if (!t13) return GRUNDSPERRE;
        // K12: Sind beide Häuser erreicht und fehlt Geld, weicht auch dieser Häuser-Satz dem Geld-Satz.
        const geld = this.erreichtZahl(this.leitungen()) === 2 && this.lage.tutorialGeldFehlt_eur() > 0;
        return { kurz: GRUNDSPERRE.kurz, satz: geld ? SATZ_GELD : SATZ_LEISTE_OFFEN };
      }
      case 'verwerfen': case 'sofort': case 'express': case 'weiter_einzeichnen': return AKTIONSSPERRE;
      default: return GRUNDSPERRE;
    }
  }

  /** Bauplan NR20-22 P2 Schritt-Tabelle: Geld > Stück muss weg > Größe passt nicht (Rolle falsch) > Häuser fehlen >
   *  Größe passt nicht (Planungsfehler, Simon Weg b). */
  private abschliessenSperre(lg: TutorialLeitungsLage): TutorialSperre | null {
    if (this.lage.tutorialGeldFehlt_eur() > 0) return { kurz: KURZ_GELD, satz: SATZ_GELD };
    if (lg.fremd.length > 0) return { kurz: KURZ_WEG, satz: this.satzWeg(lg, this.lage.tutorialWerte()) };
    if (lg.felder.some((f) => !f.richtig)) return { kurz: KURZ_GROESSE, satz: SATZ_GROESSE };
    const fehlen = 2 - this.erreichtZahl(lg);
    if (fehlen > 0) return { kurz: fehlen === 1 ? KURZ_EIN_HAUS : KURZ_ZWEI_HAEUSER, satz: SATZ_ZU_FRUEH };
    return lg.planungsfehler ? { kurz: KURZ_GROESSE, satz: SATZ_GROESSE } : null;
  }

  gesperrtGetippt(b: Bedienung): void {
    if (!this.aktiv()) return;
    if (this.sperre(b)?.satz) this.sperrGetippt = b;
  }

  /** Blasentext nach Vorrang (Bauplan NR20-22 P2 „Textvorrang“, DESIGN 13.17.2 Fassung 2.1):
   *  T13/T13h: Geld-Satz > Sperr-Satz > eigener Abgang > Größen-Satz > Hilfe > Zwischenstand (T13h) > Grundtext;
   *  T13w (B5): Sperr-Satz > Hilfe > Erklärsatz; sonst Sperr-Satz > Hilfe (nur H) > Grundtext. */
  private blasentext(w: TutorialWerte): string {
    const d = this.def, name = this.lage.spielerName;
    const hilfe = d.art === 'H' && this.daneben >= 3;
    const sperrSatz = this.sperrGetippt ? this.sperre(this.sperrGetippt)?.satz : '';
    if (d.t13 && d.id !== 'T13w') {
      const lg = this.leitungen();
      if (this.lage.tutorialGeldFehlt_eur() > 0) return SATZ_GELD;
      if (sperrSatz) return sperrSatz;
      if (lg.fremd.length > 0) return this.satzWeg(lg, w);
      if (lg.haupt_zu_duenn) return einsetzen(SATZ_ZU_DUENN, w, name);
      if (lg.anschluss_zu_dick) return einsetzen(SATZ_ZU_DICK, w, name);
      if (!hilfe && d.id === 'T13h' && lg.haus1_ok && !lg.haus2_ok) return einsetzen(ZWISCHENSTAND, w, name);
    } else if (sperrSatz) return sperrSatz;
    return einsetzen(hilfe ? d.hilfe : d.text, w, name);
  }

  /** NR20/NR21 (Bauplan NR20-22 P2): Spur, Ziele und Ruhe in Kapitel 3; die Leitungslage wird nur in T13–T14 gelesen. */
  private kapitel3(d: TutorialSchrittDef, t: TutorialObjekte, w: TutorialWerte): Nr20Felder {
    const leer = nr20Leer();
    if (d.id === 'T12') return { ...leer, ruhe: true };
    if (d.id === 'T14') return { ...leer, ruhe: true, fremd: [...this.leitungen().fremd] };
    if (!d.t13) return leer;
    const lg = this.leitungen();
    const fertig: Record<Stueck, boolean> = { haupt: lg.haupt_ok, haus1: lg.haus1_ok, haus2: lg.haus2_ok };
    const ring = d.id === 'T13h' ? zielHaus(lg) : null;
    const ringStueck = ring ? STUECK_HAUS[ring] : null;
    const aktiv = (s: Stueck): boolean => (d.id === 'T13' ? s === 'haupt' : d.id === 'T13w' ? s !== 'haupt' : s === ringStueck);
    const offen = lg.spur.filter((f) => !f.richtig && !fertig[f.stueck]);
    const band: TutorialBandFeld[] = offen.map((f) => ({ x: f.x, y: f.y, typ: f.stueck === 'haupt' ? w.haupt : w.anschluss,
      aktiv: aktiv(f.stueck), falsch: f.belegt !== null, pfeil: pfeil(f.stueck, f.x, f.y) }));
    // Raute und Finger nur auf dem führenden Stück, ab seinem ersten offenen Bandfeld in Zugrichtung.
    const fuehrt: Stueck | null = d.id === 'T13' ? 'haupt' : ringStueck;
    let naechstes: Feld | null = d.id === 'T13w' ? [...TUTORIAL_ABZWEIG] : null;
    let weg: Feld[] = [];
    if (fuehrt) {
      const felder = STUECKE[fuehrt];
      const i = felder.findIndex(([x, y]) => offen.some((f) => f.x === x && f.y === y));
      if (i >= 0) {
        naechstes = [...felder[i]];
        weg = felder.slice(i).map(([x, y]) => [x, y] as const);
        if (ring) weg.push(hausmitte(ring === 1 ? t.haus1 : t.haus2));
      }
    }
    // G3: Liegt nur noch ein Rest, führt keine Zielscheibe mehr zum Abzweig – es gibt dort nichts mehr anzuschließen
    const fremd = lg.fremd.length > 0, abgangOffen = fremd && !this.nurRestWeg(lg);
    const farbknopf_ring = d.id === 'T13w' ? w.anschluss : lg.haupt_zu_duenn ? w.haupt : lg.anschluss_zu_dick ? w.anschluss : null;
    return {
      band, naechstes_feld: naechstes, zielscheibe: d.id !== 'T13h' || abgangOffen || this.zielscheibeHaus !== null ? [...TUTORIAL_ABZWEIG] : null,
      finger_weg: fremd || d.id === 'T13w' ? [] : weg, fremd: [...lg.fremd], ziel_stecker: [t.haus1.id, t.haus2.id],
      ziel_ring: ring === 1 ? t.haus1.id : ring === 2 ? t.haus2.id : null,
      erreicht_ids: [...(lg.haus1_ok ? [t.haus1.id] : []), ...(lg.haus2_ok ? [t.haus2.id] : [])],
      farbknopf_ring, zeichenleiste: { typ: d.id === 'T13h' ? w.anschluss : w.haupt }, zeichnen_ruht: d.id === 'T13w',
      kompakt: true, ruhe: true,
    };
  }

  /** Die Restzeit rechnet die Oberfläche aus `warte_bis_ms`; ob gewartet wird, entscheidet die Phase im Spielstand, nicht die Uhr. */
  ansicht(_jetzt_ms: number): TutorialAnsicht | null {
    if (!this.aktiv() || this.lage.stand.namen_gefragt === false) return null;
    const d = this.def, t = this.objekte(), w = this.lage.tutorialWerte();
    const objekt_ids = { heizzentrale: t.hz.id, haus1: t.haus1.id, haus2: t.haus2.id,
      leitungsstueck: d.id === 'T25' && !this.intro ? leitungsstueck(this.lage.stand, t) : [] };
    const kopf = { schritt: d.id, kapitel: d.kapitel, kapitel_name: KAPITEL_NAMEN[d.kapitel] };
    const hinweis = this.daneben >= 3 ? { knopf_hinweis: HILFE_W } : {};
    if (this.intro) {
      const name = KAPITEL_NAMEN[d.kapitel];
      const text = einsetzen(WIEDEREINSTIEG, w, this.lage.spielerName, name) + (name.endsWith('!') ? '' : '.');
      return { ...kopf, art: 'W', text, ...hinweis, wusstest_du: false, ziele: [], finger: 'aus', abdunkeln: 'alles', weiter: 'weiter',
        kamera: 'steht', kamera_ziele: [], kamera_grenze: false, spur: false, erreicht_zeigen: false, objekt_ids,
        normale_aktion: false, wiedereinstieg: true, ...nr20Leer() };
    }
    const wartet = this.wartet();
    const weiter = d.art === 'H' ? null : wartet ? 'wartet' : d.los ? 'los' : 'weiter';
    const warte = wartet
      ? { warte_text: d.id === 'T11' ? WARTE_PLANUNG : WARTE_BAU,
          ...(this.lage.stand.abschnitt?.bau ? { warte_bis_ms: this.lage.stand.abschnitt.bau.ende_ms } : {}) }
      : {};
    return {
      ...kopf, art: d.art, text: this.blasentext(w),
      ...(d.art === 'W' && !wartet ? hinweis : {}),
      wusstest_du: !!d.wusstest_du, ziele: [...d.ziele], finger: d.finger,
      abdunkeln: d.abdunkeln ?? 'alles', weiter, ...warte,
      kamera: d.kamera ?? 'steht', kamera_ziele: [...(d.kamera_ziele ?? [])],
      kamera_grenze: !!d.t13, spur: !!d.t13, erreicht_zeigen: !!d.t13,
      ...(d.info_kapsel ? { info_kapsel: einsetzen(INFO_KAPSEL, w, this.lage.spielerName) } : {}),
      ...(d.effekt ? { effekt: d.effekt } : {}),
      ...(d.nach_handlung_schliessen ? { nach_handlung_schliessen: d.nach_handlung_schliessen } : {}),
      ...(d.id === 'T12' ? { leitung_typ: w.haupt } : {}),
      objekt_ids, normale_aktion: !!d.normale_aktion, wiedereinstieg: false, ...this.kapitel3(d, t, w),
    };
  }
}
