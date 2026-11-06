import type {
  Bedienung, Schritt, Tipp, TippMeldung, TutorialAnsicht, TutorialSchrittId, TutorialSperre, TutorialWerte, ZielName,
} from './tutorial-vertrag';
import { ERSTE_HAEUSER } from './start';
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
    text: 'Fertig geplant! Nimm die {leitung} – sie trägt im Spiel bis {kap_kw}, genug für beide Häuser.' },
  { id: 'T13', kapitel: 3, art: 'H', ziele: [], finger: 'spur', abdunkeln: 'nur_hud', kamera: 'frei', kamera_ziele: HZ_HAEUSER, t13: true,
    hilfe: 'Leg den Finger auf die Heizzentrale und zieh ihn die gelbe Spur entlang.',
    text: 'Zieh die Leitung mit dem Finger von der Heizzentrale bis an beide Häuser. Folge der gelben Spur.' },
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
const T13B = 'Das erste Haus ist erreicht. Jetzt weiter bis zum zweiten.';
const INFO_KAPSEL = '{kwh} im Jahr · bis {kw_ohne}';
const WIEDEREINSTIEG = 'Weiter geht’s, {Name}! Wir waren gerade bei: {Kapitelname}';
const WARTE_PLANUNG = 'Philipp plant noch … {Restzeit}';
const WARTE_BAU = 'Gebaut wird … noch {Restzeit}';
// DESIGN 13.7 / 13.15 K7, K11: Sperren der Zeichenleiste in T13. Zeile 2 höchstens 18 Zeichen, geschütztes Leerzeichen.
const SATZ_LEISTE_OFFEN = 'Die Leiste bleibt offen, bis beide Häuser erreicht sind.';
const SATZ_ZU_FRUEH = 'Zieh die Leitung bis an beide Häuser – folge der gelben Spur.';
const SATZ_GELD = 'Dann reicht dein Geld nicht mehr für die Stationen. Nimm mit Zurück ein paar Leitungen weg.';
const KURZ_GELD = 'Geld reicht nicht';
const KURZ_EIN_HAUS = 'noch 1 Haus fehlt';
const KURZ_ZWEI_HAEUSER = '2 Häuser fehlen';
// Gesperrter Grundzustand (DESIGN 13.5): Zeile 2 wie bei der Wandstation (13.5 T17). Diese Bedienungen liegen unter dem
// Abdunkeln – ein Tipp darauf gilt als „falsch getippt“ (13.7), darum gibt es keinen Simon-Satz für die Blase.
const GRUNDSPERRE: TutorialSperre = { kurz: 'später wählbar', satz: '' };

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
    // „offen, beide verbunden“ beginnt auch bei T12: der Tipp auf die Karte öffnet die Leiste, T13 schaltet dann sofort weiter.
    case 'offen': return 'T12';
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

/** `{leitung}` = Kurzform des Katalognamens („25er-Leitung“ → „25er“). */
function kurzform(typ: TypId): string {
  const m = /^(\d+er)-Leitung$/.exec(KATALOG[typ].name);
  if (!m) throw new Error(`Tutorial-Text: ${typ} ist keine Leitung mit Kurzform („${KATALOG[typ].name}“).`);
  return m[1];
}

function einsetzen(text: string, w: TutorialWerte, name: string, kapitelname = ''): string {
  const werte: Record<string, () => string> = {
    Name: () => name, Kapitelname: () => kapitelname, leitung: () => kurzform(w.leitung),
    kessel_kw: () => zahl(w.kessel_kw, 'kW'), kap_kw: () => zahl(w.kap_kw, 'kW'), kwh: () => zahl(w.kwh, 'kWh'),
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

export class Tutorial {
  private schrittIndex = 0;
  private daneben = 0;
  private sperrGetippt: Bedienung | null = null;
  private ersterStrich = false;
  private intro: boolean;
  private beendet = false;

  constructor(private readonly lage: TutorialLage, opt?: { wiedereinstieg?: boolean }) {
    this.intro = !!opt?.wiedereinstieg;
    if (this.aktiv()) this.schrittIndex = index(einstieg(lage));
  }

  aktiv(): boolean {
    return !this.beendet && !!this.lage.stand.tutorial && tutorialObjekte(this.lage.stand) !== null;
  }

  private get def(): TutorialSchrittDef { return TUTORIAL_SCHRITTE[this.schrittIndex]; }
  private objekte(): TutorialObjekte { return tutorialObjekte(this.lage.stand) as TutorialObjekte; }

  private erreichtZahl(): number {
    const t = this.objekte(), e = this.lage.erreichteHaeuser();
    return (e.includes(t.haus1.id) ? 1 : 0) + (e.includes(t.haus2.id) ? 1 : 0);
  }

  /** Weg b (ENTSCHEIDUNGEN 2026-11-06): T14 nur, wenn beide Häuser erreicht sind und das Geld reicht. */
  private abschliessenBereit(): boolean {
    return this.erreichtZahl() === 2 && this.lage.tutorialGeldFehlt_eur() === 0;
  }

  /** Zustand des Handlungs-Schritts erfüllt (Bauplan P1 „Weiterschalten“); undefined = Schritt hat keinen Zustand. */
  private zustandErfuellt(id: TutorialSchrittId): boolean | undefined {
    const a = this.lage.stand.abschnitt, t = this.objekte();
    switch (id) {
      case 'T10': return !!a;
      case 'T13': return this.abschliessenBereit();
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
    if (this.def.t13 && vorher.id !== 'T14') this.ersterStrich = false;
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

  /** Übergänge aus dem Zustand, auch mehrere hintereinander (Eintritt in einen schon erfüllten Handlungs-Schritt). */
  private nachZustand(): void {
    for (let i = 0; i < TUTORIAL_SCHRITTE.length && !this.beendet && !this.intro; i++) {
      const d = this.def;
      if (d.id === 'T14' && !this.zustandErfuellt('T14') && !this.abschliessenBereit()) { this.wechseln(index('T13')); return; }
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
    if (d.id === 'T12') return m.typ === this.lage.tutorialWerte().leitung;
    if (d.id === 'T15') return m.objekt_id === this.objekte().haus1.id;
    if (d.id === 'T18') return m.objekt_id === this.objekte().haus2.id;
    return true;
  }

  tipp(m: TippMeldung): void {
    if (!this.aktiv()) return;
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
    if (this.def.t13 && e.schritt === 'leitung_gezeichnet') this.ersterStrich = true;
    this.nachZustand();
  }

  handlung(): void {
    if (!this.aktiv()) return;
    this.sperrGetippt = null;
    this.nachZustand();
  }

  zustandPruefen(): void {
    if (!this.aktiv() || this.intro || (this.def.id !== 'T13' && this.def.id !== 'T14')) return;
    this.nachZustand();
  }

  sperre(b: Bedienung): TutorialSperre | null {
    if (!this.aktiv()) return null;
    const t13 = !!this.def.t13;
    switch (b) {
      case 'karte_gesten': return t13 ? null : GRUNDSPERRE;
      case 'abschliessen': {
        if (!t13) return null;
        if (this.lage.tutorialGeldFehlt_eur() > 0) return { kurz: KURZ_GELD, satz: SATZ_GELD };
        const fehlen = 2 - this.erreichtZahl();
        return fehlen === 0 ? null : { kurz: fehlen === 1 ? KURZ_EIN_HAUS : KURZ_ZWEI_HAEUSER, satz: SATZ_ZU_FRUEH };
      }
      case 'blatt_schliessen': {
        if (!t13) return GRUNDSPERRE;
        // K12: Sind beide Häuser erreicht und fehlt Geld, weicht auch dieser Häuser-Satz dem Geld-Satz.
        const geld = this.erreichtZahl() === 2 && this.lage.tutorialGeldFehlt_eur() > 0;
        return { kurz: GRUNDSPERRE.kurz, satz: geld ? SATZ_GELD : SATZ_LEISTE_OFFEN };
      }
      default: return GRUNDSPERRE;
    }
  }

  gesperrtGetippt(b: Bedienung): void {
    if (!this.aktiv()) return;
    if (this.sperre(b)?.satz) this.sperrGetippt = b;
  }

  /** Blasentext nach Vorrang K4/K7/K12: Sperr-Satz > (T13) Geld-Satz > T13b > Hilfe (nur H) > Grundtext. */
  private blasentext(w: TutorialWerte): string {
    const sperrSatz = this.sperrGetippt ? this.sperre(this.sperrGetippt)?.satz : '';
    if (sperrSatz) return sperrSatz;
    const d = this.def;
    if (d.t13) {
      if (this.lage.tutorialGeldFehlt_eur() > 0) return SATZ_GELD;
      if (this.erreichtZahl() === 1) return T13B;
    }
    const satz = d.art === 'H' && this.daneben >= 3 ? d.hilfe : d.text;
    return einsetzen(satz, w, this.lage.spielerName);
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
        normale_aktion: false, wiedereinstieg: true };
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
      wusstest_du: !!d.wusstest_du, ziele: [...d.ziele],
      finger: d.t13 && this.ersterStrich ? 'aus' : d.finger,
      abdunkeln: d.abdunkeln ?? 'alles', weiter, ...warte,
      kamera: d.kamera ?? 'steht', kamera_ziele: [...(d.kamera_ziele ?? [])],
      kamera_grenze: !!d.t13, spur: !!d.t13, erreicht_zeigen: !!d.t13,
      ...(d.info_kapsel ? { info_kapsel: einsetzen(INFO_KAPSEL, w, this.lage.spielerName) } : {}),
      ...(d.effekt ? { effekt: d.effekt } : {}),
      ...(d.nach_handlung_schliessen ? { nach_handlung_schliessen: d.nach_handlung_schliessen } : {}),
      ...(d.id === 'T12' ? { leitung_typ: w.leitung } : {}),
      objekt_ids, normale_aktion: !!d.normale_aktion, wiedereinstieg: false,
    };
  }
}
