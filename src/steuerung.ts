import { pruefeAuftraege, type Auftrag } from './core/auftraege';
import { KATALOG, KONSTANTEN, LEITUNGEN, istLeitung, type TypId } from './core/katalog';
import { groesse } from './core/netz';
import { nachbardoerfer, type Nachbardorf } from './core/nachbarn';
import type { Spiel } from './core/spiel';
import { TUTORIAL_SPUR } from './core/start';
import { Tutorial } from './core/tutorial';
import type { Bedienung, TippMeldung, TutorialAnsicht, TutorialSperre, ZielName } from './core/tutorial-vertrag';
import type { Objekt } from './core/typen';
import { Effekte } from './render/effekte';
import { FEDERN_MS } from './render/gebaeude';
import { jahreszeit } from './render/jahreszeiten';
import { Kamera } from './render/kamera';
import { drehFrei } from './render/anschluss';
import { objektAmPunkt } from './render/treffer';
import type { Maler } from './render/maler';
import type { Szene } from './render/szene';
import { chip, knopf, sperren, symbol, type Sperre } from './ui/bausteine';
import { blattBreite_px, blattOeffnen, blattOffen, type Blatt } from './ui/blatt';
import { eur, h } from './ui/dom';
import { sprecherAktiv, sprecherZeigen } from './ui/sprecher';
import { anleiterAusblenden, anleiterKasten, anleiterPlaetze, anleiterPlatz, anleiterPlatzFrei, anleiterRechteck, anleiterZeigen, zielFlaecheNebenKarte } from './ui/anleiter';
import { KARTEN_VORLESENAME, eingabeSperre, ersatzZiel, infoKapsel, lochRand, spotlightAus, spotlightSetzen, stupsen, zielSichtbarMachen, type Finger, type Loch, type Rechteck, type SperrLage } from './ui/spotlight';
import { einstellungenLesen, einstellungenOeffnen, einstellungenSchreiben } from './ui/einstellungen';
import { Hud } from './ui/hud';
import { zieleOeffnen } from './ui/ziele';
import { spielOrt } from './core/neubaugebiet';
import { Katalog } from './ui/katalog';
import { Kontext, dickereFarbknopf, kurzGrund, tStueckHinweis } from './ui/kontext';
import { HAUSANSCHLUSS_KURZ, NICHTS_GEZEICHNET_KURZ, NICHTS_ZURUECK, abschnittSperreKurz, ersteSperre, schonGemocht } from './ui/sperrtexte';
import type { Ui } from './ui/schnittstelle';
import { T } from './ui/tokens';
import { tempo } from './tempo';
import { meldungenStumm, toast, toastDauer_ms, toastWichtig } from './ui/toast';

const N = KONSTANTEN.feldanzahl;
/** Bauplan NR13 P4: Abstand nach [Los geht’s], bevor aufgesparte Hinweise kommen */
const NACH_TUTORIAL_MS = 600;
const istKartenziel = (z: ZielName): z is keyof typeof KARTEN_VORLESENAME => z === 'heizzentrale' || z === 'haus1' || z === 'haus2';
/** Ziele im Baumenü (Gruppe „Baumenü“ in src/core/tutorial-vertrag.ts); alle liegen im Reiter „Leitungen“ */
const BAUMENUE_ZIELE: ReadonlySet<ZielName> = new Set<ZielName>(['reiter_leitungen', 'philipp', 'kasten_abschnitt', 'leitungskarte', 'laura']);
/** DESIGN 13.6 / Bauplan NR13 P4 „Kamera“: Rand beim Einpassen mehrerer Ziele und höchster Zoom (= Startzoom am Handy) */
const EINPASS_RAND_PX = 24;
const ZIEL_ZOOM_MAX = T.karte.zoom_start_handy;
/** DESIGN 13.16 M1: so weit darf die Kamera in T13 herauszoomen, damit Spur und Gebäude über der Anleiter-Karte Platz finden */
const T13_ZOOM_MIN = 2;
/** Tabelle Abschnitt 6: das Hausblatt schließt 200 ms nach dem Kauf, damit man den Kauf noch sieht */
const BLATT_ZU_NACH_KAUF_MS = 200;
/** Wie Kamera.groesseSetzen: kürzere Bildkante unter 500 px = Handy */
const HANDY_KANTE_PX = 500;
type Modus = 'normal' | 'platzieren' | 'verschieben' | 'stempel';

/** Verbindet Eingabe, Karte, Oberfläche und Spiel. Enthält keine Spielregeln – die liegen in src/core. */
export class Steuerung implements Ui {
  readonly kamera = new Kamera();
  readonly effekte = new Effekte();
  readonly hud: Hud;
  private modus: Modus = 'normal';
  private auswahl: number | null = null;
  private geist: { typ: TypId; x: number; y: number; kante: number } | null = null;
  private verschiebeId: number | null = null;
  private stempelTyp: TypId | null = null;
  private stempelLetzte: [number, number] | null = null;
  private stempelAchse: 'h' | 'v' | null = null;
  private radieren = false;
  /** A69: Werkzeug „T-Stück mit Vorsehung“: Tippen auf eine geplante Leitung setzt/entfernt die Vorsehung */
  private vorsehen = false;
  private modusBlatt: Blatt | null = null;
  /** Offene Zeichenleiste (DESIGN.md 12.18): [?] im Kopf, Aktionsleiste unter dem scrollenden Inhalt */
  private leiste: { blatt: Blatt; frage: HTMLButtonElement; aktion: HTMLElement } | null = null;
  /** Erklärtext statt Werkzeug im Mittelteil der Zeichenleiste */
  private hilfeOffen = false;
  private katalogUi: Katalog;
  private kontextUi: Kontext;
  private auftrag: Auftrag | null = null;
  private einstellungen = einstellungenLesen();
  private letzteHudMs = 0;
  private letzterAuftragMs = 0;
  private letzterKatalogMs = 0;
  private zeiger = new Map<number, { x: number; y: number }>();
  private zieht = false;
  private start: { x: number; y: number } | null = null;
  private geistGreifen = false;
  private besuch: Nachbardorf | null = null;
  private banner: HTMLElement | null = null;
  private readonly nachbarn = nachbardoerfer();
  private pinch: { abstand: number; mx: number; my: number; winkel: number } | null = null;
  private drehSumme = 0;
  private drehAktiv = false;
  private mitteDreh: { x: number } | null = null;
  /** NR13 (U1): laufendes Pflicht-Tutorial; `null`, wenn keines läuft. Heißt nicht `tutorial`, weil nur der Kern die Merke schreibt. */
  private anleitung: Tutorial | null = null;
  /** Nach dem Neuladen ist kein Blatt offen: Der erste Schritt nach der Wiedereinstiegs-Blase stellt sein Ziel selbst her */
  private zielHerstellenOffen = false;
  /** Aufgaben, die erst nach dem Tutorial dran sind (z. B. der Update-Hinweis, K6) */
  private nachTutorialListe: Array<() => void> = [];
  /** Läuft in diesem Bild eine Kamerafahrt? Einmal je Bild aus der Bildzeit bestimmt (tick). */
  private fahrtJetzt = false;
  /** Zuletzt angewendete Ansicht: Schritt (mit Wiedereinstieg), freie Breite und Darstellungs-Schlüssel */
  private angewendet: { schritt: string; frei_b: number; schluessel: string } | null = null;
  /** Lage für die Eingabesperre aus der Ansicht (nicht aus dem Bild, AE-NR13-6); Fahrt und Anleiter werden frisch gelesen */
  private sperrLage: SperrLage = { fahrt: false, anleiter: null, abdunkeln: 'alles', art: 'W', loecher: [] };
  private sperreAn = false;
  /** Tutorial-Kurzgrund von [Abschnitt abschließen], mit dem die Zeichenleiste zuletzt gebaut wurde */
  private leisteSperreKurz: string | null = null;
  private tabZiele: HTMLElement[] = [];
  /** Schritt (wie `angewendet.schritt`), für den der Fokus schon gesetzt ist */
  private fokusFuer: string | null = null;
  /** Ziele im Blatt, die in diesem Schritt schon ins Bild gescrollt wurden (K9) */
  private gescrollt = new Set<string>();
  /** Schritt, freie Breite und Kartenhöhe, für die die Kamera die Ziele schon neben die Anleiter-Karte geschoben hat – je Lage
   *  höchstens einmal, damit eine an der Kartengrenze gekappte Verschiebung nicht in jedem Bild neu ansetzt. */
  private freigestelltFuer = '';
  /** Seit wann ein Tutorial-Haus erreicht ist (Federn des Häkchens) */
  private erreichtSeit = new Map<number, number>();
  private szeneTutorial: Pick<Szene, 'tutorial_spur' | 'erreicht'> = {};

  jetzt_ms(): number { return this.uhr(); }
  /** Läuft gerade eine Geste auf der Karte (Finger oder gedrückte Mitteltaste)? Die Bildschleife reicht es an die Bodenebene weiter. */
  fingerAufKarte(): boolean { return this.zeiger.size > 0 || this.mitteDreh !== null; }
  constructor(readonly spiel: Spiel, private readonly leinwand: HTMLCanvasElement, private readonly maler: Maler, private readonly uhr: () => number) {
    this.kamera.kartenHoehe = spiel.kartenHoehe;
    this.katalogUi = new Katalog(this);
    this.kontextUi = new Kontext(this, () => { this.auswahl = null; });
    this.hud = new Hud(() => this.spiel, {
      bauen: () => this.bauenGetippt(),
      besuchen: () => this.doerferOeffnen(),
      einstellungen: () => einstellungenOeffnen(this, this.einstellungen, (e) => { this.einstellungen = e; this.bewegungAnwenden(); }),
      auftrag: () => zieleOeffnen(this.spiel, () => this.kontext(this.spiel.hz.id)),
      geldfluss: () => this.geldflussOeffnen(),
      kwUmschalten: () => this.kwUmschalten(),
      kwAn: () => this.einstellungen.kw_anzeigen,
    });
    document.getElementById('app')!.append(this.hud.wurzel, h('div', { id: 'ebene' }));
    this.eingabe();
    this.bewegungAnwenden();
    if (!spiel.stand.quelle_gewaehlt) { this.spiel.ersteQuelleWaehlen('kessel'); this.geaendert(); this.zentrieren(); }
    if (spiel.tutorialAktiv()) {
      // Wiedereinstieg: Wer den Namen schon gesetzt hat, hat das Tutorial vorher verlassen (DESIGN 13.7)
      this.anleitung = new Tutorial(spiel, { wiedereinstieg: spiel.stand.namen_gefragt !== false });
      this.zielHerstellenOffen = spiel.stand.namen_gefragt !== false;
      meldungenStumm(true);
      this.hud.tutorialModus(true);
    }
    if (spiel.stand.namen_gefragt === false) this.namenFragen();
  }

  /** Was die Anleiter-Karte gerade zeigen soll (nur lesen, für Tests); `null` ohne laufendes Tutorial. */
  anleitungAnsicht(): TutorialAnsicht | null { return this.anleitung?.ansicht(this.uhr()) ?? null; }
  /** Läuft kein Tutorial, sofort; sonst nach dessen Ende (AE-NR13-8: nichts drängt sich ins Tutorial). */
  nachTutorial(f: () => void): void { if (this.anleitung) this.nachTutorialListe.push(f); else f(); }
  /** Meldung, die auch im Tutorial erscheint (Speichern/Laden gescheitert, AE-NR13-8). */
  toastWichtig(text: string): void { toastWichtig(text); }

  /** A79 (Simon): Beim Start eines neuen Spiels nach dem eigenen Namen und dem Dorfnamen fragen. */
  private namenFragen(): void {
    const b = blattOeffnen({ titel: 'Willkommen!', art: 'popup', schliessbar: false });
    const spieler = h('input', { class: 'feld', type: 'text', maxlength: 20, placeholder: 'z. B. Simon', 'aria-label': 'Dein Name', id: 'start-spieler', autocomplete: 'given-name' }) as HTMLInputElement;
    const dorf = h('input', { class: 'feld', type: 'text', maxlength: 24, value: this.spiel.stand.name, 'aria-label': 'Name deines Dorfs', id: 'start-dorf' }) as HTMLInputElement;
    const los = (): void => {
      this.spiel.namenSetzen(spieler.value, dorf.value); b.zu(); this.geaendert();
      // Im Tutorial begrüßt Simon in T01 selbst; Begrüßung und Start-Tipp entfallen (DESIGN 13.7 „Erster Start“)
      if (this.anleitung) { this.anleitungAnwenden(); return; }
      const gruss = `Viel Erfolg, ${this.spiel.spielerName}! ${this.spiel.stand.name} wartet auf sein Wärmenetz.`;
      this.toast(gruss);
      this.startTippPlanen(gruss);
    };
    // T-F3 (Simon): Überspringen nur für Tester, also nur im Vorführ-Tempo
    const ohneTutorial = (): void => {
      this.spiel.tutorialUeberspringen();
      this.anleitungBeenden();
      los();
    };
    const knoepfe = [knopf('Los geht’s', los, 'los')];
    if (this.anleitung && tempo() > 1) knoepfe.push(knopf('Ohne Tutorial starten', ohneTutorial));
    for (const f of [spieler, dorf]) f.addEventListener('keydown', (e) => { if (e.key === 'Enter') los(); });
    b.inhalt.append(
      h('p', {}, 'Du baust das Wärmenetz für ein Dorf. Wie heißt du, und wie heißt dein Dorf?'),
      h('label', { for: 'start-spieler', class: 'gedaempft' }, 'Dein Name (so sprechen dich Philipp, Laura und die Techniker an)'), spieler,
      h('label', { for: 'start-dorf', class: 'gedaempft' }, 'Name deines Dorfs'), dorf,
      h('div', { class: 'knopfreihe' }, ...knoepfe));
  }

  /** NR18-D: einmalige Start-Meldung. Es gibt nur eine Meldung zugleich (12.17) – steht schon eine (`vorher`), kommt der
   *  Tipp erst nach ihrer Lesezeit, sonst sofort. Ob er dran ist, entscheidet der Kern beim Zeigen. */
  startTippPlanen(vorher?: string): void {
    if (!this.spiel.startTippFaellig()) return;
    window.setTimeout(() => {
      const tipp = this.spiel.startTippNehmen();
      if (tipp) this.toast(tipp);
    }, vorher ? toastDauer_ms(vorher) : 0);
  }

  kwUmschalten(): boolean {
    this.einstellungen = { ...this.einstellungen, kw_anzeigen: !this.einstellungen.kw_anzeigen };
    einstellungenSchreiben(this.einstellungen);
    return this.einstellungen.kw_anzeigen;
  }

  private bewegungAnwenden(): void {
    this.maler.reduziert = this.einstellungen.weniger_bewegung;
    document.body.classList.toggle('weniger-bewegung', this.einstellungen.weniger_bewegung);
  }

  zentrieren(): void { const hz = this.spiel.hz; this.kamera.zentrieren(hz.x, hz.y, groesse(hz)); }

  // ---------- Ui ----------
  geaendert(): void {
    this.spiel.neuBerechnen();
    this.hudJetzt();
    this.kontextUi.aktualisieren();
    // 12.21 Punkt 1: Abschließen und Zurück sofort frei bzw. gesperrt, ohne die Leiste neu zu öffnen
    this.leisteAufbauen();
  }
  toast(text: string): void { toast(text); }
  /** Bedienschritt an das Tutorial (AE-NR13-2); danach sofort neu anwenden, damit Blase und Löcher nicht ein Bild nachhängen. */
  tutorialMelden(m: TippMeldung): void {
    const t = this.anleitung;
    if (!t) return;
    this.mitSchliessen(() => t.tipp(m));
    this.anleitungAnwenden();
  }
  /** Gesperrter Knopf im Tutorial: Zeile 2 = Kurzgrund, Tippen bringt den Simon-Satz in die Blase statt einer Meldung. */
  tutorialSperreKnopf(b: Bedienung): Sperre | null {
    const s = this.tutorialSperre(b);
    if (!s) return null;
    return { grund: s.kurz, schloss: false, hinweis: () => {
      this.anleitung?.gesperrtGetippt(b);
      this.anleitungAnwenden();
      if (b === 'blatt_schliessen' && !s.satz) toastWichtig('Dieses Menü bleibt für den aktuellen Tutorialschritt offen.');
      return '';
    } };
  }
  private tutorialSperre(b: Bedienung): TutorialSperre | null { return this.anleitung?.sperre(b) ?? null; }
  /** [Bauen]: im Tutorial direkt der Reiter Leitungen (T08 → T10, T09 im selben Takt). */
  private bauenGetippt(): void {
    if (!this.anleitung) { this.katalog(); return; }
    this.tutorialMelden({ art: 'tipp', tipp: 'baumenue' });
    this.katalog('netz');
    this.tutorialMelden({ art: 'tipp', tipp: 'reiter_leitungen' });
  }
  /** Tabelle Abschnitt 6: `nach_handlung_schliessen` der Ansicht vor der Handlung; wechselt danach der Schritt, schließt es. */
  private mitSchliessen(handlung: () => void): void {
    const vorher = this.anleitung?.ansicht(this.uhr()) ?? null;
    handlung();
    const art = vorher?.nach_handlung_schliessen;
    if (!art || this.anleitung?.ansicht(this.uhr())?.schritt === vorher.schritt) return;
    if (art === 'baumenue') { this.katalogUi.schliessen(); return; }
    const fuer = this.kontextUi.offenFuer;
    // nur das Blatt des Kaufs – ist inzwischen ein anderes offen, bleibt es
    window.setTimeout(() => { if (this.kontextUi.offenFuer === fuer) this.kontextUi.schliessen(); }, BLATT_ZU_NACH_KAUF_MS);
  }
  katalog(kategorie?: string): void { this.abbrechen(); this.kontextUi.schliessen(); this.katalogUi.oeffnen(kategorie); }
  kontext(id: number | null): void {
    if (id == null) { this.kontextUi.schliessen(); return; }
    this.abbrechen(); this.katalogUi.schliessen();
    this.auswahl = id;
    this.kontextUi.oeffnen(id);
    const o = this.spiel.objekt(id);
    if (o) {
      // Querformat: Blatt liegt rechts, das Objekt wandert in die freie linke Fläche
      // Breite aus dem tatsächlichen Blatt-Rechteck (DESIGN.md 12.21 Punkt 4), y nach ENTSCHEIDUNGEN 2026-11-05 (Hausblatt 0,58)
      const k = this.kamera;
      k.zentrierenBei(o.x, o.y, groesse(o), (k.breite - blattBreite_px()) / 2, k.hoehe * (this.anleitung ? T.menue.faktor.anleiter_ziel_hoehe : 0.58));
    }
  }

  neubaugebietZeigen(): void {
    if (!this.spiel.stand.neubaugebiet) return;
    this.kontextUi.schliessen();
    this.kamera.kartenHoehe = this.spiel.kartenHoehe;
    this.kamera.zentrieren(10, (N + this.spiel.kartenHoehe - 1) / 2, 1);
  }

  platzieren(typ: TypId): void {
    this.katalogUi.schliessen(); this.kontextUi.schliessen();
    const kante = KATALOG[typ].groesse ?? 1;
    const [x, y] = this.freierPlatz(typ, kante);
    this.geist = { typ, x, y, kante }; this.modus = 'platzieren'; this.verschiebeId = null;
    this.modusBlattOeffnen(`${KATALOG[typ].name} platzieren`, 'Tippe auf die Wiese oder zieh das Gebäude an seinen Platz.', 'Hier bauen', () => this.bestaetigen());
  }
  verschieben(id: number): void {
    const o = this.spiel.objekt(id);
    if (!o) return;
    this.kontextUi.schliessen(); this.katalogUi.schliessen();
    const kante = groesse(o);
    this.geist = { typ: o.typ, x: o.x, y: o.y, kante }; this.verschiebeId = id; this.modus = 'verschieben';
    this.modusBlattOeffnen(`${KATALOG[o.typ].name} verschieben`, 'Tippe auf die Wiese oder zieh das Gebäude an seinen neuen Platz.', 'Hier hin', () => this.bestaetigen());
  }
  /** Zeichenmodus mit der schmalen Zeichenleiste (DESIGN.md 12.18/12.21). Ist die Leiste schon offen, wechselt nur das
   *  Werkzeug (Farbknopf, Radierer, T-Stück) – ein neues Blatt würde den Zeichenmodus beenden. */
  stempeln(typ: TypId, radieren = false, vorsehen = false): void {
    if (!this.leiste) {
      const herkunft = this.kontextUi.offenFuer;
      this.katalogUi.schliessen(); this.kontextUi.schliessen(); this.modusBlatt?.zu();
      this.leisteOeffnen();
      this.werkzeugSetzen(typ, radieren, vorsehen);
      this.leisteAufbauen();
      this.kameraFuerLeiste(herkunft);
      return;
    }
    this.werkzeugSetzen(typ, radieren, vorsehen);
    this.leisteAufbauen();
    this.anleitung?.handlung();
  }
  private werkzeugSetzen(typ: TypId, radieren: boolean, vorsehen: boolean): void {
    this.modus = 'stempel'; this.geist = null; this.verschiebeId = null;
    this.stempelTyp = typ; this.stempelLetzte = null; this.stempelAchse = null;
    this.radieren = radieren; this.vorsehen = vorsehen && !radieren;
  }
  private leisteOeffnen(): void {
    // Erste Nutzung je Spielstand (12.18): die Merke steht im Spielstand, damit sie Neuladen und Gerätewechsel übersteht.
    // Im Tutorial erklärt Simon das Zeichnen – die Hilfe klappt nicht auf, gilt aber als gesehen (K9).
    this.hilfeOffen = !this.anleitung && !this.spiel.stand.zeichenhilfe_gesehen;
    this.spiel.stand.zeichenhilfe_gesehen = true;
    const frage = h('button', { type: 'button', class: 'knopf frage', 'aria-label': 'Hilfe zum Zeichnen', 'aria-expanded': 'false', onclick: () => this.frageGetippt(frage) }, symbol('frage'));
    frage.addEventListener('animationend', () => frage.classList.remove('wackelt'));
    const blatt = blattOeffnen({ titel: 'Zeichnen', klasse: 'zeichenleiste', kopfKnopf: frage, beiZu: () => { this.leiste = null; this.modusBlatt = null; this.modusZuruecksetzen(); }, zuSperre: () => this.tutorialSperreKnopf('blatt_schliessen') });
    blatt.wurzel.setAttribute('data-ziel', 'zeichenleiste');
    // Außerhalb des scrollenden Inhalts: „Abschnitt abschließen“ bleibt immer im Bild (12.18 Aktionsleiste)
    const aktion = h('div', { class: 'aktionsleiste' });
    blatt.wurzel.append(aktion);
    this.modusBlatt = blatt;
    this.leiste = { blatt, frage, aktion };
  }
  /** [?] der Zeichenleiste: im Tutorial wie [X] gesperrt (die Hilfe würde das Werkzeug verdecken) – wackelt, Satz in die Blase. */
  private frageGetippt(frage: HTMLButtonElement): void {
    const s = this.tutorialSperreKnopf('blatt_schliessen');
    if (!s) { this.hilfeZeigen(!this.hilfeOffen); return; }
    if (typeof s.hinweis === 'function') s.hinweis();
    frage.classList.remove('wackelt'); void frage.offsetWidth; frage.classList.add('wackelt');
  }
  private hilfeZeigen(offen: boolean): void {
    this.hilfeOffen = offen;
    this.leisteAufbauen();
    // [Verstanden] verschwindet mit der Hilfe – der Fokus geht an [?] zurück (12.21 Punkt 4)
    if (!offen) this.leiste?.frage.focus();
  }
  /** Baut Mittelteil und Aktionsleiste neu (nach jeder Änderung). Kopf und Blatt bleiben, der Fokus bleibt auf demselben Knopf. */
  private leisteAufbauen(): void {
    const l = this.leiste, typ = this.stempelTyp;
    if (!l || !typ) return;
    const sp = this.spiel, D = KATALOG[typ];
    this.leisteSperreKurz = this.tutorialSperre('abschliessen')?.kurz ?? null;
    const fokus = document.activeElement instanceof HTMLElement && l.blatt.wurzel.contains(document.activeElement) ? document.activeElement.getAttribute('data-id') : null;
    const neuAufbau = (): void => this.leisteAufbauen();
    l.frage.setAttribute('aria-expanded', String(this.hilfeOffen));
    const umschalter = (k: HTMLButtonElement, an: boolean): HTMLButtonElement => { k.setAttribute('aria-pressed', String(an)); return k; };
    const farben = LEITUNGEN.filter((t) => sp.freigeschaltet(t)).map((t) => {
      const L = KATALOG[t];
      const k = umschalter(knopf(String(L.durchmesser_mm), () => this.stempeln(t), t === typ ? 'gewaehlt' : '', { id: `farbe-${t}` }), t === typ);
      k.classList.add('farbknopf');
      k.setAttribute('aria-label', `${L.name}, bis ${L.kapazitaet_kw} kW`);
      k.style.setProperty('--streifen', L.farbe ?? '');
      return k;
    });
    const dicker = dickereFarbknopf(sp);
    const kennzeile = this.radieren ? 'Leitung antippen = löschen' : this.vorsehen ? 'Geplante Leitung antippen' : `bis ${D.kapazitaet_kw} kW · ${eur(D.kosten_eur![0])}/Feld`;
    const zurueck = knopf(h('span', { class: 'mit-sym' }, symbol('zurueck'), 'Zurück'), () => { sp.letzteLeitungZurueck(); this.stempelLetzte = null; this.geaendert(); this.anleitung?.handlung(); }, '', { klein: true, id: 'zurueck', sperre: () => (sp.abschnittLeitungen() ? null : NICHTS_ZURUECK), neuAufbau });
    zurueck.setAttribute('aria-label', 'Letzte Leitung zurück');
    const sperreTStueck = sp.sperrgrund('vorsehung');
    // enge Leiste: kurzer Grund „ab Stufe X“ (DESIGN.md 12.15); der Hinweis beim Antippen erklärt ausführlich
    const tStueck = umschalter(knopf('T-Stück mit Vorsehung', () => this.stempeln(typ, false, !this.vorsehen), this.vorsehen ? 'gewaehlt' : '', { klein: true, id: 'tstueck', unter: sperreTStueck ? kurzGrund('vorsehung') : eur(KONSTANTEN.vorsehung_eur), aus: sperreTStueck !== null, schloss: true, muenze: true, hinweis: tStueckHinweis() }), this.vorsehen);
    tStueck.classList.add('t-stueck');
    const werkzeug = h('div', { class: 'zeichen-werkzeug', hidden: this.hilfeOffen },
      h('div', { class: 'farbknoepfe' }, ...farben, dicker),
      h('p', { class: 'kennzeile' }, kennzeile),
      h('div', { class: 'zeichen-reihe' },
        umschalter(knopf('Radierer', () => this.stempeln(typ, !this.radieren), this.radieren ? 'gewaehlt' : '', { klein: true, id: 'radierer' }), this.radieren),
        zurueck),
      tStueck);
    const hilfe = h('div', { class: 'zeichen-hilfe', hidden: !this.hilfeOffen },
      h('p', {}, 'Zieh die Leitung mit dem Finger: Sie läuft gerade durch, ein Knick entsteht nur, wenn du zur Seite ziehst. ' + HAUSANSCHLUSS_KURZ + ' Bezahlt wird erst, wenn Laura das Material bestellt.'),
      knopf('Verstanden', () => this.hilfeZeigen(false), '', { id: 'verstanden' }));
    l.blatt.inhalt.replaceChildren(werkzeug, hilfe);
    // B1–B4 vor B6 (12.21 Punkt 1); beim Tippen werden alle Gründe neu gelesen (Punkt 3)
    // 13.7: die Gründe des Spiels (B1–B6) zuerst, dann die Sperre des Tutorials
    const abschliessen = knopf('Abschnitt abschließen', () => this.leisteAbschliessen(), 'los', { id: 'abschliessen', sperre: () => ersteSperre(abschnittSperreKurz(sp, this.uhr), sp.abschnittLeitungen() ? null : NICHTS_GEZEICHNET_KURZ, this.tutorialSperreKnopf('abschliessen')), neuAufbau });
    abschliessen.setAttribute('data-ziel', 'abschliessen');
    l.aktion.replaceChildren(abschliessen);
    if (fokus) [...l.blatt.wurzel.querySelectorAll<HTMLElement>('button')].find((b) => b.getAttribute('data-id') === fokus)?.focus();
  }
  private leisteAbschliessen(): void {
    const r = this.spiel.abschnittAbschliessen();
    // K8: im Tutorial bleibt das Baumenü zu, Simon führt weiter
    if (r.ok) { this.abbrechen(); this.geaendert(); if (!this.anleitung) this.katalog('netz'); return; }
    // Fehler beim Abschließen: Meldung, die Leiste bleibt offen (12.18)
    this.geaendert(); this.hinweiseZeigen();
  }
  /** Kamera beim Öffnen der Leiste (12.21 Punkt 4): aus einem Objektblatt das Objekt, sonst die zuletzt geplante Leitung
   *  in die Mitte der freien Fläche links der Leiste; gibt es keine, bleibt die Kamera stehen. Zoom bleibt. */
  private kameraFuerLeiste(herkunft: number | null): void {
    const geplant = this.spiel.stand.objekte.filter((o) => o.geplant);
    const o = herkunft != null ? this.spiel.objekt(herkunft) : geplant[geplant.length - 1];
    if (!o) return;
    const k = this.kamera;
    k.zentrierenBei(o.x, o.y, groesse(o), (k.breite - blattBreite_px()) / 2, k.hoehe * 0.5);
  }

  /** Blatt für Platzieren und Verschieben: Erklärtext, Bestätigen und Abbrechen. */
  private modusBlattOeffnen(titel: string, text: string, ja: string, bei: () => void): void {
    this.modusBlatt?.zu();
    this.modusBlatt = blattOeffnen({ titel, beiZu: () => { this.modusBlatt = null; this.modusZuruecksetzen(); } });
    this.modusBlatt.inhalt.append(h('p', {}, text), h('div', { class: 'knopfreihe' }, knopf(ja, bei, 'los'), knopf('Abbrechen', () => this.abbrechen())));
  }
  private modusZuruecksetzen(): void { this.modus = 'normal'; this.geist = null; this.verschiebeId = null; this.stempelTyp = null; this.stempelLetzte = null; this.stempelAchse = null; this.radieren = false; this.vorsehen = false; }
  private abbrechen(): void { if (this.modusBlatt) { const b = this.modusBlatt; this.modusBlatt = null; b.zu(); } this.modusZuruecksetzen(); }

  private geistOk(): boolean {
    const g = this.geist;
    return !!g && this.spiel.kannPlatzieren(g.typ, g.x, g.y, this.verschiebeId ?? 0, g.kante);
  }
  private bestaetigen(): void {
    const g = this.geist;
    if (!g) return;
    if (!this.geistOk()) {
      const bestand = this.verschiebeId != null && this.spiel.objekt(this.verschiebeId)?.bestand;
      toast(this.spiel.sperrtAusbaureserve(g.typ, g.x, g.y, g.kante, !!bestand)
        ? 'Dieses Feld ist für den Ausbau der Heizzentrale reserviert'
        : 'Hier ist kein Platz – such dir freie Wiese.');
      return;
    }
    const r = this.verschiebeId != null ? this.spiel.verschieben(this.verschiebeId, g.x, g.y) : this.spiel.platzieren(g.typ, g.x, g.y);
    if (r.ok) { this.abbrechen(); this.geaendert(); }
    this.hinweiseZeigen();
  }
  private freierPlatz(typ: TypId, kante: number): [number, number] {
    const [mx, my] = this.kamera.feld(this.kamera.breite / 2, this.kamera.hoehe / 2);
    for (let r = 0; r < N; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = mx + dx, y = my + dy;
        if (this.spiel.kannPlatzieren(typ, x, y, 0, kante)) return [x, y];
      }
    }
    return [0, 0];
  }

  // ---------- Nachbardörfer (S6, S7) ----------
  private doerferOeffnen(): void {
    this.abbrechen(); this.katalogUi.schliessen(); this.kontextUi.schliessen();
    const b = blattOeffnen({ titel: 'Dörfer in der Nähe', art: 'hoch' });
    const eigene = { name: this.spiel.stand.name, besitzer: 'Du', stufe: this.spiel.hzStufe, wert: this.spiel.dorfwert(), v: null as Nachbardorf | null };
    const zeilen = [eigene, ...this.nachbarn.map((v) => ({ name: v.name, besitzer: v.besitzer, stufe: v.stufe, wert: v.dorfwert, v }))].sort((a, c) => c.wert - a.wert);
    const liste = h('div', {});
    zeilen.forEach((z, i) => {
      const zeile = h('div', { class: 'zeile', style: z.v ? '' : 'background:var(--farbe-knopf-gewaehlt-0);border-radius:8px;padding:0 8px' },
        h('span', {}, `${i + 1}. `, h('b', {}, z.name), h('br'), h('small', { class: 'gedaempft' }, `Dorf von ${z.besitzer} · Heizzentrale ${z.stufe} · Dorfwert ${z.wert.toLocaleString('de-DE')}`)),
        z.v ? knopf('Besuchen', () => { b.zu(); this.besuchStarten(z.v!); }, 'blau', { klein: true }) : chip('dein Dorf', 'gruen'));
      liste.append(zeile);
    });
    b.inhalt.append(liste);
  }
  private besuchStarten(v: Nachbardorf): void {
    this.besuch = v; this.auswahl = null;
    this.hud.sichtbar({ eigene: false });
    const gemocht = !!this.spiel.stand.gemocht[v.name];
    // DESIGN.md 12.20 D1: Schon gemocht = Hinweis beim Antippen. Direkt nach dem Mögen steht die Bestätigung noch da;
    // ein zweites Tippen soll keine zweite Meldung stapeln (Test K-b), deshalb dort ohne Hinweis gesperrt.
    const gefaellt = knopf(gemocht ? 'Gefällt dir' : 'Gefällt mir', () => { this.spiel.moegen(v.name); gefaellt.textContent = 'Gefällt dir'; sperren(gefaellt); toast(`${v.name} gefällt dir!`); }, 'taler', { klein: true, aus: gemocht, hinweis: gemocht ? schonGemocht(v.name) : undefined });
    this.banner = h('div', { class: 'banner' },
      h('span', { class: 'wer' }, v.name, h('small', {}, `Dorf von ${v.besitzer} · Heizzentrale ${v.stufe}`)), gefaellt,
      knopf('Nach Hause', () => this.besuchEnde(), 'los', { klein: true }));
    document.getElementById('app')!.append(this.banner);
    const hz = v.objekte.find((o) => o.typ === 'hz')!;
    this.kamera.zentrieren(hz.x, hz.y, groesse(hz));
  }
  private besuchEnde(): void {
    this.besuch = null; this.banner?.remove(); this.banner = null;
    this.hud.sichtbar({ eigene: true }); this.zentrieren();
  }

  // ---------- Eingabe ----------
  private eingabe(): void {
    const l = this.leinwand;
    l.addEventListener('pointerdown', (e) => {
      // Drehen ist im ganzen Tutorial aus (AE-NR13-6)
      if (e.pointerType === 'mouse' && e.button === 1) { e.preventDefault(); if (this.anleitung) return; this.mitteDreh = { x: e.clientX }; l.setPointerCapture(e.pointerId); return; }
      l.setPointerCapture(e.pointerId);
      this.zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.zeiger.size === 1) {
        this.start = { x: e.clientX, y: e.clientY }; this.zieht = false; this.geistGreifen = this.nahAmGeist(e.clientX, e.clientY);
        if (this.modus === 'stempel') { this.stempelLetzte = null; this.stempelAchse = null; this.anleitung?.handlung(); this.stempelnBei(e.clientX, e.clientY, true); }
      } else if (this.zeiger.size === 2) { this.start = null; this.pinch = this.pinchMass(); this.drehSumme = 0; this.drehAktiv = false; }
    });
    l.addEventListener('pointermove', (e) => {
      if (this.mitteDreh) {
        const d = e.clientX - this.mitteDreh.x;
        this.kamera.drehenUm(d * 0.008); this.mitteDreh.x = e.clientX; // A75: stufenlos
        return;
      }
      const alt = this.zeiger.get(e.pointerId);
      if (!alt) return;
      this.zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.zeiger.size >= 2 && this.pinch) {
        const neu = this.pinchMass();
        if (!this.tutorialSperre('karte_gesten')) {
          this.kamera.zoomUm(neu.abstand / (this.pinch.abstand || 1), neu.mx, neu.my);
          this.kamera.schiebe_x += neu.mx - this.pinch.mx; this.kamera.schiebe_y += neu.my - this.pinch.my; this.kamera.begrenzen();
        }
        if (!this.anleitung) {
          const d = drehFrei(this.drehSumme, neu.winkel - this.pinch.winkel, this.drehAktiv);
          this.drehSumme = d.summe_rad; this.drehAktiv = d.aktiv;
          if (d.dreh_rad) this.kamera.drehenUm(d.dreh_rad, neu.mx, neu.my);
        }
        this.pinch = neu; return;
      }
      if (!this.start) return;
      if (!this.zieht && Math.hypot(e.clientX - this.start.x, e.clientY - this.start.y) > T.karte.ziehen_schwelle_px) this.zieht = true;
      if (!this.zieht) return;
      if (this.modus === 'stempel') { this.stempelnBei(e.clientX, e.clientY); return; }
      if (this.geistGreifen && this.geist) { this.geistSetzen(e.clientX, e.clientY); return; }
      if (this.tutorialSperre('karte_gesten')) return;
      this.kamera.schiebe_x += e.clientX - alt.x; this.kamera.schiebe_y += e.clientY - alt.y; this.kamera.begrenzen();
    });
    const ende = (e: PointerEvent): void => {
      if (this.mitteDreh) { this.mitteDreh = null; return; }
      const war = this.zeiger.delete(e.pointerId);
      if (this.zeiger.size < 2) this.pinch = null;
      if (war && this.zeiger.size === 0 && this.start && !this.zieht) this.tippen(e.clientX, e.clientY);
      if (this.zeiger.size === 0) this.start = null;
    };
    l.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
    l.addEventListener('pointerup', ende);
    l.addEventListener('pointercancel', ende);
    l.addEventListener('wheel', (e) => { e.preventDefault(); if (this.tutorialSperre('karte_gesten')) return; this.kamera.zoomUm(e.deltaY < 0 ? T.karte.zoom_schritt_rad : 1 / T.karte.zoom_schritt_rad, e.clientX, e.clientY); }, { passive: false });
    document.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const schritt = 40;
      // Im Tutorial steht die Karte außer in T13 (Sperre) und dreht sich nie (AE-NR13-6)
      if (this.tutorialSperre('karte_gesten') && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(e.key)) return;
      if (this.anleitung && ['q', 'Q', 'e', 'E'].includes(e.key)) return;
      if (e.key === 'ArrowLeft') { this.kamera.schiebe_x += schritt; this.kamera.begrenzen(); }
      else if (e.key === 'ArrowRight') { this.kamera.schiebe_x -= schritt; this.kamera.begrenzen(); }
      else if (e.key === 'ArrowUp') { this.kamera.schiebe_y += schritt; this.kamera.begrenzen(); }
      else if (e.key === 'ArrowDown') { this.kamera.schiebe_y -= schritt; this.kamera.begrenzen(); }
      else if (e.key === '+' || e.key === '=') this.kamera.zoomUm(T.karte.zoom_schritt_knopf, this.kamera.breite / 2, this.kamera.hoehe / 2);
      else if (e.key === 'k' || e.key === 'K') this.hud.kwZeigen(this.kwUmschalten());
      else if (e.key === 'q' || e.key === 'Q') this.kamera.drehen(-1);
      else if (e.key === 'e' || e.key === 'E') this.kamera.drehen(1);
      else if (e.key === '-') this.kamera.zoomUm(1 / T.karte.zoom_schritt_knopf, this.kamera.breite / 2, this.kamera.hoehe / 2);
      else if ((e.key === 'b' || e.key === 'B') && !blattOffen()) this.katalog();
      else if (e.key === 'Enter' && this.geist) this.bestaetigen();
      else return;
      e.preventDefault();
    });
  }
  private pinchMass(): { abstand: number; mx: number; my: number; winkel: number } {
    const [a, b] = [...this.zeiger.values()];
    return { abstand: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, winkel: Math.atan2(b.y - a.y, b.x - a.x) };
  }
  private nahAmGeist(mx: number, my: number): boolean {
    const g = this.geist;
    if (!g) return false;
    const [fx, fy] = this.kamera.feldGenau(mx, my);
    return fx >= g.x - 0.9 && fx <= g.x + g.kante - 0.1 && fy >= g.y - 0.9 && fy <= g.y + g.kante - 0.1;
  }
  private geistSetzen(mx: number, my: number): void {
    const g = this.geist!, [fx, fy] = this.kamera.feldGenau(mx, my);
    g.x = Math.max(0, Math.min(N - g.kante, Math.round(fx - (g.kante - 1) / 2)));
    g.y = Math.max(0, Math.min(this.spiel.kartenHoehe - g.kante, Math.round(fy - (g.kante - 1) / 2)));
  }
  /** `gesteStart`: erstes Feld einer Geste (Finger aufgesetzt) – nur dort meldet ein abgelehnter Ersatz etwas. */
  private stempelnBei(mx: number, my: number, gesteStart = false): void {
    if (!this.stempelTyp) return;
    const [x, y] = this.kamera.feld(mx, my);
    if (x < 0 || y < 0 || x >= N || y >= this.spiel.kartenHoehe) return;
    if (this.radieren) { if (this.spiel.geplanteLeitungEntfernen(x, y).ok) this.geaendert(); return; }
    if (this.vorsehen) {
      if (this.stempelLetzte) return; // nur beim Antippen umschalten, nicht beim Wischen über weitere Felder
      this.stempelLetzte = [x, y];
      const o = this.spiel.stand.objekte.find((a) => a.geplant && a.x === x && a.y === y);
      if (o && this.spiel.vorsehungUmschalten(o.id).ok) this.geaendert(); else this.hinweiseZeigen();
      return;
    }
    // A47: Die Leitung läuft gerade durch. Ein Knick entsteht nur, wenn der Finger deutlich (2 Felder) zur Seite zieht.
    const l = this.stempelLetzte;
    if (l && x === l[0] && y === l[1]) return;
    let felder: Array<[number, number]> = [[x, y]];
    if (l) {
      const dx = x - l[0], dy = y - l[1];
      if (!this.stempelAchse) this.stempelAchse = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      const entlang = this.stempelAchse === 'h' ? dx : dy, quer = this.stempelAchse === 'h' ? dy : dx;
      if (Math.abs(quer) >= 2 && Math.abs(quer) > Math.abs(entlang)) this.stempelAchse = this.stempelAchse === 'h' ? 'v' : 'h';
      const horizontal = this.stempelAchse === 'h';
      const laenge = horizontal ? dx : dy, schritt = Math.sign(laenge);
      felder = [];
      for (let i = 1; i <= Math.abs(laenge); i++) felder.push(horizontal ? [l[0] + i * schritt, l[1]] : [l[0], l[1] + i * schritt]);
    }
    const sp = this.spiel;
    const rohrBei = (fx: number, fy: number): Objekt | undefined =>
      sp.stand.objekte.find((o) => o.x === fx && o.y === fy && istLeitung(o.typ));
    let geaendert = false;
    for (const [fx, fy] of felder) {
      const vorher = this.stempelLetzte ? rohrBei(...this.stempelLetzte) : undefined;
      const vorhanden = rohrBei(fx, fy);
      if (vorhanden) {
        const verbunden = vorher ? sp.trasseBeimZeichnenVerbinden(vorher, vorhanden) : null;
        if (verbunden && !verbunden.ok) { this.hinweiseZeigen(); break; }
        if (verbunden || this.ueberzeichnen(this.stempelTyp, fx, fy, gesteStart && felder.length === 1)) geaendert = true;
        this.stempelLetzte = [fx, fy];
        continue;
      }
      if (!sp.kannPlatzieren(this.stempelTyp, fx, fy)) {
        if (sp.sperrtAusbaureserve(this.stempelTyp, fx, fy)) {
          if (gesteStart) toast('Dieses Feld ist für den Ausbau der Heizzentrale reserviert');
          break;
        }
        continue;
      }
      if (!sp.platzieren(this.stempelTyp, fx, fy).ok) { this.hinweiseZeigen(); break; }
      const neu = rohrBei(fx, fy);
      const verbunden = vorher && neu ? sp.trasseBeimZeichnenVerbinden(vorher, neu) : null;
      geaendert = true;
      this.stempelLetzte = [fx, fy];
      if (verbunden && !verbunden.ok) { this.hinweiseZeigen(); break; }
    }
    if (geaendert) this.geaendert();
  }
  /** NR18: Zeichnen über eine vorhandene Leitung. Gebaut und der Stempel dicker als sie (bzw. ihr geplanter Ersatz) → Ersatz
   *  planen; eingezeichnet mit anderem Typ → Typ neu; sonst still weiter, damit Wischen über eine dicke Hauptleitung nichts
   *  meldet. Eine Ablehnung des Kerns zeigt nur das erste Feld der Geste, sonst entstünde je Feld dieselbe Meldung. */
  private ueberzeichnen(typ: TypId, x: number, y: number, melden: boolean): boolean {
    const sp = this.spiel, o = sp.stand.objekte.find((a) => istLeitung(a.typ) && a.x === x && a.y === y);
    if (!o) return false;
    const dicker = (t: TypId, als: TypId): boolean => LEITUNGEN.indexOf(t) > LEITUNGEN.indexOf(als);
    const vorher = sp.ereignisse.length;
    let r: { ok: boolean };
    if (o.geplant) { if (o.typ === typ) return false; r = sp.geplanteLeitungTyp(o.id, typ); }
    else { if (!dicker(typ, o.ersatz?.typ ?? o.typ)) return false; r = sp.ersatzPlanen(o.id, typ); }
    if (!r.ok) { if (melden) this.hinweiseZeigen(); else sp.ereignisse.length = vorher; }
    return r.ok;
  }
  private tippen(mx: number, my: number): void {
    if (this.modus === 'platzieren' || this.modus === 'verschieben') { this.geistSetzen(mx, my); return; }
    if (this.modus === 'stempel') return;
    const [x, y] = this.kamera.feld(mx, my);
    if (this.besuch) {
      const f = this.besuch.objekte.find((a) => { const k = groesse(a); return x >= a.x && x < a.x + k && y >= a.y && y < a.y + k; });
      if (f) toast(`${KATALOG[f.typ].name}${KATALOG[f.typ].bauzeit_s ? ' · Stufe ' + f.stufe : ''}`);
      return;
    }
    if (this.anleitung) { this.kartentippImTutorial(mx, my); return; }
    const o = objektAmPunkt(this.kamera, this.spiel.stand.objekte, mx, my); // A80: gezeichnete Form zählt, nicht nur das Bodenfeld
    if (!o) { this.kontextUi.schliessen(); return; }
    this.kontext(o.id);
  }

  /**
   * Kartentipp im Tutorial: Heizzentrale/Tutorial-Haus melden; ein Blatt öffnet nur bei `normale_aktion` (T15/T18).
   * Getroffen werden nur Heizzentrale und die beiden Tutorial-Häuser: alle anderen Objekte sind im Tutorial ohne Wirkung
   * und dürfen den Tipp nicht schlucken – das Dach eines Nachbarhauses vor der Heizzentrale verdeckt sonst deren untere Hälfte.
   */
  private kartentippImTutorial(mx: number, my: number): void {
    const a = this.anleitung?.ansicht(this.uhr());
    if (!a) return;
    const ids = a.objekt_ids;
    const ziele = this.spiel.stand.objekte.filter((z) => z.id === ids.heizzentrale || z.id === ids.haus1 || z.id === ids.haus2);
    const o = objektAmPunkt(this.kamera, ziele, mx, my);
    if (o) this.kartenzielGetippt(o.id);
  }
  /** Antippen oder Enter auf dem Ersatz-Element (13.11): derselbe Tipp. Ob ein Blatt öffnet, gilt für die Ansicht vor dem Tipp. */
  private kartenzielGetippt(id: number): void {
    const a = this.anleitung?.ansicht(this.uhr());
    if (!a) return;
    const ids = a.objekt_ids;
    if (id === ids.heizzentrale) { this.tutorialMelden({ art: 'tipp', tipp: 'heizzentrale' }); return; }
    if (id !== ids.haus1 && id !== ids.haus2) return;
    this.tutorialMelden({ art: 'tipp', tipp: 'haus', objekt_id: id });
    if (a.normale_aktion) this.kontext(id);
  }

  // ---------- je Bild ----------
  szene(): Szene {
    const g = this.geist, v = this.besuch, saison = jahreszeit(this.spiel.monat().nr);
    if (v) return { saison, objekte: v.objekte, innen: v.innen, netz: v.netz, spiel: null, auswahl_id: null, modus: 'normal', verschiebe_id: null, jetzt_ms: this.uhr(), geist: null, stempel: null };
    return {
      saison, objekte: this.spiel.stand.objekte, innen: this.spiel.stand.innen, netz: this.spiel.netz, spiel: this.spiel,
      auswahl_id: this.auswahl, modus: this.modus, verschiebe_id: this.verschiebeId, jetzt_ms: this.uhr(),
      geist: g ? { ...g, ok: this.geistOk() } : null, stempel: null,
      kartenHoehe: this.spiel.kartenHoehe, strassen: spielOrt(this.spiel.stand).strassen, fluss: spielOrt(this.spiel.stand).fluss, kw_anzeigen: this.einstellungen.kw_anzeigen,
      ...this.szeneTutorial,
    };
  }

  /** Spiel fortschreiben, Ereignisse in Effekte/Toasts übersetzen, Oberfläche auffrischen. */
  tick(jetzt_ms: number, oberflaeche_ms = jetzt_ms): void {
    // Fahrt nach der Bildzeit, nicht nach der Spieluhr – im Vorführ-Tempo wäre sie sonst sofort vorbei (Entscheidung PL)
    this.fahrtJetzt = this.kamera.fahrtLaeuft(this.bildzeit());
    this.spiel.bis(jetzt_ms);
    this.kamera.kartenHoehe = this.spiel.kartenHoehe;
    this.ereignisse();
    if (oberflaeche_ms - this.letzterAuftragMs > 1000) { this.letzterAuftragMs = oberflaeche_ms; this.auftrag = pruefeAuftraege(this.spiel); this.ereignisse(); }
    if (oberflaeche_ms - this.letzteHudMs > 250) { this.letzteHudMs = oberflaeche_ms; this.hudJetzt(); this.kontextUi.aktualisieren(); }
    // A92: Restzeit des Bauabschnitts im Baumenü; einmal je Sekunde reicht für eine Sekundenanzeige und schont die Bildrate (A90)
    if (oberflaeche_ms - this.letzterKatalogMs >= 1000) { this.letzterKatalogMs = oberflaeche_ms; this.katalogUi.aktualisieren(); }
    if (this.anleitung && !this.anleitung.aktiv()) this.anleitungBeenden();
    // Weg b: Geld ändert sich auch ohne Ereignis, darum in jedem Bild prüfen (vor dem Anwenden)
    this.anleitung?.zustandPruefen();
    this.anleitungAnwenden();
  }

  /** Nach dem letzten Schritt: Meldungen und HUD wie außerhalb des Tutorials; Aufgesparte Aufgaben 600 ms nach [Los geht’s]. */
  private anleitungBeenden(): void {
    this.anleitung = null;
    eingabeSperre(null); this.sperreAn = false;
    spotlightAus(); anleiterAusblenden(); infoKapsel(null, null); ersatzZiel(null);
    this.kamera.grenzeSetzen(null);
    this.angewendet = null; this.fokusFuer = null; this.szeneTutorial = {}; this.erreichtSeit.clear();
    meldungenStumm(false);
    this.hud.tutorialModus(false);
    this.auftragFedern();
    const liste = this.nachTutorialListe.splice(0);
    if (liste.length) window.setTimeout(() => { for (const f of liste) f(); }, NACH_TUTORIAL_MS);
  }
  /** T26 (DESIGN 13.5): die Auftragskarte kommt zurück und federt kurz wie beim Bauen (450 ms, `plopp_staerke`); ruhig ohne. */
  private auftragFedern(): void {
    this.auftrag = pruefeAuftraege(this.spiel);
    this.hudJetzt();
    const karte = this.hud.wurzel.querySelector<HTMLElement>('.auftrag');
    if (!karte) throw new Error('HUD ohne Auftragskarte (.auftrag)');
    if (this.ruhig() || karte.classList.contains('versteckt')) return;
    const gross = `scale(${1 + T.karte.plopp_staerke})`;
    karte.animate([{ transform: 'scale(1)' }, { transform: gross }, { transform: 'scale(1)' }], { duration: FEDERN_MS, easing: 'ease-out' });
  }
  private bildzeit(): number { return performance.now(); }
  private ruhig(): boolean { return this.einstellungen.weniger_bewegung || matchMedia('(prefers-reduced-motion: reduce)').matches; }
  /** Fläche links neben dem offenen Blatt (Querformat: Blätter rechts), in px */
  private freieFlaeche(): Rechteck { return { x: 0, y: 0, b: this.kamera.breite - blattBreite_px(), h: this.kamera.hoehe }; }

  /** Kartenziel → Objekt; `null` für Bedienelemente und das Leitungsstück. */
  private kartenObjekt(a: TutorialAnsicht, z: ZielName): Objekt | null {
    if (!istKartenziel(z)) return null;
    const o = this.spiel.objekt(a.objekt_ids[z]);
    if (!o) throw new Error(`Tutorial: Objekt ${z} (id ${a.objekt_ids[z]}) fehlt im Spielstand.`);
    return o;
  }
  /** Bildschirm-Rechteck um die Bodenfelder; Gebäude ragen etwa eine Feldhöhe je Kante nach oben. */
  private objektRechteck(o: Objekt, hoch: boolean): Rechteck {
    const g = groesse(o), k = this.kamera;
    const ecken = [[o.x - 0.5, o.y - 0.5], [o.x + g - 0.5, o.y - 0.5], [o.x - 0.5, o.y + g - 0.5], [o.x + g - 0.5, o.y + g - 0.5]].map(([x, y]) => k.mitte(x, y));
    const xs = ecken.map((e) => e[0]), ys = ecken.map((e) => e[1]);
    const oben = Math.min(...ys) - (hoch ? k.th * g : 0), x = Math.min(...xs);
    return { x, y: oben, b: Math.max(...xs) - x, h: Math.max(...ys) - oben };
  }
  private static rechteckUm(rs: Rechteck[]): Rechteck {
    const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y));
    return { x, y, b: Math.max(...rs.map((r) => r.x + r.b)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
  }
  /** Loch eines Ziels: Kartenziele über die Kamera, Bedienelemente über `[data-ziel]`; `null`, solange es nicht da ist. */
  private zielLoch(a: TutorialAnsicht, z: ZielName): { loch: Loch; el: HTMLElement | null } | null {
    if (z === 'leitungsstueck') {
      const rs = a.objekt_ids.leitungsstueck.flatMap((id) => { const o = this.spiel.objekt(id); return o ? [this.objektRechteck(o, false)] : []; });
      return rs.length ? { loch: { r: Steuerung.rechteckUm(rs), form: 'ellipse' }, el: null } : null;
    }
    const o = this.kartenObjekt(a, z);
    if (o) return { loch: { r: this.objektRechteck(o, true), form: 'ellipse' }, el: null };
    const typ = z === 'leitungskarte' && a.leitung_typ ? `[data-typ="${a.leitung_typ}"]` : '';
    const el = document.querySelector<HTMLElement>(`[data-ziel="${z}"]${typ}`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { loch: { r: { x: r.left, y: r.top, b: r.width, h: r.height }, form: 'rund' }, el };
  }

  /** Kamera-Regel P4: 1 Ziel → Mitte der freien Breite auf 38 % Höhe mit Zielzoom; ≥ 2 Ziele → Rahmen einpassen. */
  private kameraAusrichten(a: TutorialAnsicht, frei: Rechteck): void {
    const os = a.kamera_ziele.map((z) => this.kartenObjekt(a, z)).filter((o): o is Objekt => o !== null);
    if (!os.length) return;
    const k = this.kamera;
    if (a.spur) { this.t13Einpassen(os, frei); return; }
    let z: { mitte_x: number; mitte_y: number; zoom: number; ziel_x: number; ziel_y: number };
    if (os.length === 1) {
      const o = os[0], g = groesse(o);
      const zoom = Math.min(k.breite, k.hoehe) < HANDY_KANTE_PX ? T.karte.zoom_start_handy : T.karte.zoom_start_desktop;
      z = { mitte_x: o.x + (g - 1) / 2, mitte_y: o.y + (g - 1) / 2, zoom, ziel_x: frei.x + frei.b / 2, ziel_y: frei.y + frei.h * T.menue.faktor.anleiter_ziel_hoehe };
    } else {
      z = { ...k.einpassenZiel(this.rahmen(os), frei, EINPASS_RAND_PX, ZIEL_ZOOM_MAX), ziel_x: frei.x + frei.b / 2, ziel_y: frei.y + frei.h / 2 };
    }
    if (a.kamera === 'fahrt') {
      // Das Freistellen (13.3) gehört schon ins Ziel der Fahrt – sonst springt das Bild nach der Fahrt ohne Übergang zur
      // Seite. Darum die Endlage einmal probehalber einnehmen, freistellen, merken und von der alten Lage aus hinfahren.
      const von = { x: k.schiebe_x, y: k.schiebe_y, zoom: k.zoom };
      k.zoom = z.zoom;
      k.zentrierenBei(z.mitte_x, z.mitte_y, 1, z.ziel_x, z.ziel_y);
      const kartenHoehe_px = this.anleiterHoehe();
      const ziele = a.ziele.map((zn) => ({ l: this.zielLoch(a, zn) }));
      const loecher = ziele.flatMap((e) => (e.l ? [lochRand(e.l.loch)] : []));
      if (!anleiterPlatzFrei(frei, loecher, { breite: k.breite, hoehe: k.hoehe }, kartenHoehe_px)) {
        this.zieleFreistellen(ziele, frei, kartenHoehe_px, this.freistellLage(a, frei, kartenHoehe_px));
      }
      const mitte_px = [k.breite / 2, k.hoehe / 2] as const, [fx, fy] = k.feldGenau(mitte_px[0], mitte_px[1]), zoom = k.zoom;
      k.schiebe_x = von.x; k.schiebe_y = von.y; k.zoom = von.zoom;
      const jetzt = this.bildzeit();
      k.fahrtZu(fx, fy, 1, mitte_px[0], mitte_px[1], zoom, this.ruhig() ? 0 : T.menue.zeit_ms.kamera_fahrt, jetzt);
      this.fahrtJetzt = k.fahrtLaeuft(jetzt);
      return;
    }
    k.zoom = z.zoom;
    k.zentrierenBei(z.mitte_x, z.mitte_y, 1, z.ziel_x, z.ziel_y);
  }
  /** DESIGN 13.16 M1: In T13 hat die Karte kein Loch zum Ausweichen und die Spur braucht fast die ganze Höhe – darum setzt
   *  die Kamera Spur und Gebäude (Feldmitte ± halbe Feldbreite) mit Rand zwischen Anzeigenreihe und Oberkante der unten
   *  stehenden Karte − 16, links von der Zeichenleiste. Der Umriss wächst linear mit dem Zoom, darum genügt eine Messung bei
   *  Zoom 1. Reicht der Platz auch bei T13_ZOOM_MIN nicht für den vollen Rand, steht der Umriss mittig – der Rand wird kleiner. */
  private t13Einpassen(os: Objekt[], frei: Rechteck): void {
    const k = this.kamera, flaeche = this.t13Flaeche(frei);
    const felder = [...TUTORIAL_SPUR, ...os.map((o) => [o.x + (groesse(o) - 1) / 2, o.y + (groesse(o) - 1) / 2] as const)];
    k.zoom = 1;
    const pk = felder.map(([x, y]) => k.mitte(x, y)), xs = pk.map((p) => p[0]), ys = pk.map((p) => p[1]);
    const breite1 = Math.max(...xs) - Math.min(...xs) + k.tw, hoehe1 = Math.max(...ys) - Math.min(...ys) + k.tw;
    const passt = Math.min((flaeche.b - 2 * EINPASS_RAND_PX) / breite1, (flaeche.h - 2 * EINPASS_RAND_PX) / hoehe1);
    const [fx, fy] = k.feldGenau((Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2);
    k.zoom = Math.max(T13_ZOOM_MIN, Math.min(ZIEL_ZOOM_MAX, passt));
    k.zentrierenBei(fx, fy, 1, flaeche.x + flaeche.b / 2, flaeche.y + flaeche.h / 2);
  }
  /** Freie Fläche in T13: unter der Anzeigenreihe, über der Anleiter-Karte − 16, links von der Zeichenleiste. */
  private t13Flaeche(frei: Rechteck): Rechteck {
    const M = T.menue.mass_px, oben = T.groesse_px.blatt_oben_quer;
    const kartenOben = this.kamera.hoehe - M.anleiter_rand - this.anleiterHoehe();
    return { x: frei.x, y: oben, b: frei.b, h: kartenOben - M.anleiter_ziel_abstand - oben };
  }
  /** Höhe der stehenden Karte (aus dem letzten Bild): ändert sie sich mit dem Text, wird der Platz neu gewählt (13.3). */
  private anleiterHoehe(): number { return Math.max(anleiterRechteck()?.h ?? 0, T.menue.mass_px.anleiter_hoehe); }
  /** Lage, für die höchstens einmal freigestellt wird: Schritt, freie Breite und Kartenhöhe. Ohne diese Sperre riefe sich
   *  das Anwenden bei gekappter Verschiebung (Kamera-Grenze) immer wieder auf und verkleinerte den Zoom jedes Mal weiter. */
  private freistellLage(a: TutorialAnsicht, frei: Rechteck, kartenHoehe_px: number): string {
    return `${a.schritt}|${a.wiedereinstieg}|${frei.b}|${kartenHoehe_px}`;
  }
  /** 13.3 „nie über dem Ziel“: Liegt die Anleiter-Karte auf beiden Plätzen über einem Kartenziel, schiebt (und wenn nötig
   *  verkleinert) die Kamera die Kartenziele sofort in die nächste Lücke neben der Karte – wie das Ausrichten ohne Fahrt.
   *  Bedienelemente liegen fest und bleiben, wo sie sind. Gibt zurück, ob sich die Kamera bewegt hat. */
  private zieleFreistellen(ziele: Array<{ l: { loch: Loch; el: HTMLElement | null } | null }>, frei: Rechteck, kartenHoehe_px: number, lage: string): boolean {
    const karten = ziele.flatMap((e) => (e.l && !e.l.el ? [lochRand(e.l.loch)] : []));
    if (!karten.length || this.freigestelltFuer === lage) return false;
    this.freigestelltFuer = lage;
    const k = this.kamera, M = T.menue.mass_px, bild = { breite: k.breite, hoehe: k.hoehe };
    // Erlaubte Fläche: unter der Anzeigenreihe, über dem unteren Rand, links vom Blatt bzw. links vom [Bauen]-Knopf (13.3)
    const blattOffen = frei.x + frei.b < k.breite, rechts = blattOffen ? frei.x + frei.b : k.breite - M.anleiter_platz_bauen;
    const oben = T.groesse_px.blatt_oben_quer, flaeche = { x: frei.x, y: oben, b: rechts - frei.x, h: k.hoehe - M.anleiter_rand - oben };
    const x = Math.min(...karten.map((r) => r.x)), y = Math.min(...karten.map((r) => r.y));
    const umriss = { x, y, b: Math.max(...karten.map((r) => r.x + r.b)) - x, h: Math.max(...karten.map((r) => r.y + r.h)) - y };
    const ziel = zielFlaecheNebenKarte(umriss, anleiterPlaetze(frei, bild).map((p) => anleiterKasten(p, kartenHoehe_px, bild)), flaeche, 2 * M.spot_abstand_karte);
    if (!ziel) return false;
    const [fx, fy] = k.feldGenau(ziel.von[0], ziel.von[1]);
    k.zoom *= ziel.faktor;
    k.zentrierenBei(fx, fy, 1, ziel.nach[0], ziel.nach[1]);
    return true;
  }
  /** Weg des Fingers in T13: die Spur und weiter auf Haus 2. Der letzte Spurschritt geht nur ein Feld zur Seite; nach A47
   *  knickt die Leitung erst bei 2 Feldern – wer genau nachfährt, legt das letzte Feld erst mit dem Zug auf das Haus. */
  private fingerSpur(a: TutorialAnsicht): Array<[number, number]> {
    const h2 = this.spiel.objekt(a.objekt_ids.haus2);
    if (!h2) throw new Error(`Tutorial: Haus 2 (id ${a.objekt_ids.haus2}) fehlt im Spielstand.`);
    const g = groesse(h2), ende = [h2.x + (g - 1) / 2, h2.y + (g - 1) / 2] as const;
    return [...TUTORIAL_SPUR, ende].map(([x, y]) => this.kamera.mitte(x, y));
  }
  /** Feldmitten-Rahmen um Objekte */
  private rahmen(os: Objekt[]): { x0: number; y0: number; x1: number; y1: number } {
    return { x0: Math.min(...os.map((o) => o.x)), y0: Math.min(...os.map((o) => o.y)), x1: Math.max(...os.map((o) => o.x + groesse(o) - 1)), y1: Math.max(...os.map((o) => o.y + groesse(o) - 1)) };
  }

  /** Spur noch freier Felder und Häkchen über erreichten Tutorial-Häusern (nur T13). */
  private tutorialSzeneSetzen(a: TutorialAnsicht): void {
    const sz: Pick<Szene, 'tutorial_spur' | 'erreicht'> = {};
    if (a.spur) sz.tutorial_spur = TUTORIAL_SPUR.filter(([x, y]) => !this.spiel.stand.objekte.some((o) => istLeitung(o.typ) && o.x === x && o.y === y));
    if (a.erreicht_zeigen) {
      const erreicht = this.spiel.erreichteHaeuser();
      for (const id of [a.objekt_ids.haus1, a.objekt_ids.haus2]) {
        if (!erreicht.includes(id)) this.erreichtSeit.delete(id);
        else if (!this.erreichtSeit.has(id)) this.erreichtSeit.set(id, this.uhr());
      }
      sz.erreicht = [...this.erreichtSeit].map(([id, seit_ms]) => ({ id, seit_ms }));
    } else this.erreichtSeit.clear();
    this.szeneTutorial = sz;
  }

  /** Ansicht des Tutorials auf Kamera, Abdunkeln, Anleiter-Karte, Kapsel und Sperre übertragen – je Bild geprüft, nur bei
   *  Änderung gesetzt. Die freie Breite wird hier gemessen, also nach der Verarbeitung des Ereignisses. */
  private anleitungAnwenden(): void {
    const a = this.anleitung?.ansicht(this.uhr()) ?? null;
    if (!a) return;
    if (this.zielHerstellenOffen && !a.wiedereinstieg) { this.zielHerstellenOffen = false; this.zielHerstellen(a); }
    const k = this.kamera, frei = this.freieFlaeche(), vorher = this.angewendet;
    const schritt = `${a.schritt}|${a.wiedereinstieg}`, wechsel = vorher?.schritt !== schritt, breiteNeu = !!vorher && vorher.frei_b !== frei.b;
    if (!a.kamera_grenze && k.grenze) k.grenzeSetzen(null);
    if ((wechsel || (breiteNeu && a.kamera !== 'frei')) && a.kamera_ziele.length) this.kameraAusrichten(a, frei);
    if (a.kamera_grenze && (wechsel || breiteNeu)) {
      // K5: Rahmen und zoom_min einmal beim Eintritt; ändert sich später die freie Breite, wandert nur die Bildmitte mit
      const g = k.grenze, os = a.kamera_ziele.map((z) => this.kartenObjekt(a, z)).filter((o): o is Objekt => o !== null);
      // In T13 steht die Bildmitte der Grenze dort, wohin t13Einpassen die Ziele gesetzt hat – sonst schöbe die Grenze sie zurück
      const mf = a.spur ? this.t13Flaeche(frei) : frei, mitte_px = [mf.x + mf.b / 2, mf.y + mf.h / 2] as const;
      if (wechsel || !g) k.grenzeSetzen({ ...this.rahmen(os), mitte_px, zoom_min: k.zoom, zoom_max: ZIEL_ZOOM_MAX });
      else k.grenzeSetzen({ ...g, mitte_px });
    }
    if (wechsel) this.gescrollt.clear();
    // Zeile 2 von [Abschnitt abschließen] folgt dem Tutorial auch ohne Bedienung: Geld ändert sich ohne Ereignis (Weg b)
    // und schaltet T13 ⇄ T14 – sonst stünde in der Blase „Geld reicht nicht“, am Knopf aber kein Grund
    if (this.leiste && (this.tutorialSperre('abschliessen')?.kurz ?? null) !== this.leisteSperreKurz) this.leisteAufbauen();
    this.tutorialSzeneSetzen(a);

    const ziele = a.ziele.map((z) => ({ z, l: this.zielLoch(a, z) }));
    const loecher = ziele.flatMap((e) => (e.l ? [e.l.loch] : []));
    const rest_s = a.warte_bis_ms === undefined ? 0 : Math.ceil((a.warte_bis_ms - this.uhr()) / 1000);
    const kartenHoehe_px = this.anleiterHoehe();
    const schluessel = JSON.stringify([a, k.schluessel(), frei.b, loecher, this.fahrtJetzt, rest_s, sprecherAktiv(), kartenHoehe_px]);
    this.angewendet = { schritt, frei_b: frei.b, schluessel };
    if (vorher?.schluessel === schluessel) return;
    const bild = { breite: k.breite, hoehe: k.hoehe };
    const freierPlatz = anleiterPlatzFrei(frei, loecher.map(lochRand), bild, kartenHoehe_px);
    if (!freierPlatz && a.kamera !== 'frei' && !this.fahrtJetzt && this.zieleFreistellen(ziele, frei, kartenHoehe_px, this.freistellLage(a, frei, kartenHoehe_px))) {
      this.anleitungAnwenden();
      return;
    }

    const ruhig = this.ruhig();
    for (const { z, l } of ziele) {
      const el = l?.el;
      if (!el || this.gescrollt.has(z) || !el.closest('.blatt')) continue;
      this.gescrollt.add(z);
      // ohne Layout (Rechteck 0 × 0) gibt es nichts ins Bild zu holen
      const r = el.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) {
        // Nach dem Scrollen komplett neu vermessen. Das alte Loch darf nicht anschließend mit den Koordinaten von vor
        // dem Scrollen wieder eingesetzt werden – sonst ist das sichtbare Ziel auf dem Handy trotzdem nicht anklickbar.
        // Der Schlüssel wird dafür geleert: Musste nichts gescrollt werden, wäre er unverändert, der zweite Durchlauf endete
        // sofort, und Karte, Loch und Sperre blieben auf dem alten Schritt stehen (Fehler T11/T14 auf dem Handy).
        zielSichtbarMachen(el, ruhig, () => { if (this.angewendet) this.angewendet = { ...this.angewendet, schluessel: '' }; this.anleitungAnwenden(); });
        return;
      }
    }
    const erstes = ziele[0]?.l?.loch.r ?? null;
    const finger: Finger | null = a.finger === 'tippen' && erstes ? { art: 'tippen', ziel: erstes }
      : a.finger === 'spur' ? { art: 'spur', punkte: this.fingerSpur(a) } : null;
    const hud = this.hud.wurzel.getBoundingClientRect();
    // Während der Fahrt zeigt das Bild kein Abdunkeln; die Sperre liest weiter die Ansicht (AE-NR13-6)
    spotlightSetzen({ loecher, abdunkeln: this.fahrtJetzt ? 'nichts' : a.abdunkeln, finger, ruhig, hud: [{ x: hud.left, y: hud.top, b: hud.width, h: hud.height }] });
    // 13.3: Spricht Philipp oder Laura, macht Simon Platz und kommt danach zurück
    if (sprecherAktiv()) anleiterAusblenden();
    else anleiterZeigen(a, freierPlatz ?? anleiterPlatz(frei, erstes, bild), { weiter: () => this.tutorialMelden({ art: 'tipp', tipp: 'weiter' }) }, this.uhr());
    const haus1 = this.spiel.objekt(a.objekt_ids.haus1);
    infoKapsel(a.info_kapsel ?? null, a.info_kapsel && haus1 ? this.objektRechteck(haus1, true) : null);
    // Die Karte ist beim Zeichnen hell, die Eingaberegel bleibt aber wie beim früheren HUD-Spotlight.
    this.sperrLage = { fahrt: this.fahrtJetzt, anleiter: null, abdunkeln: a.spur ? 'nur_hud' : a.abdunkeln, art: a.art, loecher: loecher.map((l) => l.r) };
    // 13.11/K9: Kartenziel eines Handlungs-Schritts bekommt ein fokussierbares Ersatz-Element mit Vorlesenamen
    const z0 = a.art === 'H' ? a.ziele[0] : undefined, karte0 = z0 && istKartenziel(z0) ? this.kartenObjekt(a, z0) : null;
    ersatzZiel(z0 && istKartenziel(z0) && karte0 && erstes ? { r: erstes, name: KARTEN_VORLESENAME[z0], enter: () => this.kartenzielGetippt(karte0.id) } : null);
    const ersatz = document.querySelector<HTMLElement>('.ersatz-ziel');
    const weiter = document.getElementById('anleiter-weiter');
    const zielEls = [...(ersatz ? [ersatz] : []), ...ziele.flatMap((e) => (e.l?.el ? [e.l.el] : []))];
    this.tabZiele = [...zielEls, ...(weiter ? [weiter] : [])];
    // Fokus einmal je Schritt: Handlungs-Schritt aufs Ziel, sobald es da ist; im Erklär-Schritt setzt ihn anleiterZeigen auf [Weiter]
    if (this.fokusFuer !== schritt) {
      const ziel = a.art === 'H' ? zielEls[0] : undefined;
      ziel?.focus();
      if (ziel || a.art === 'W' || !a.ziele.length) this.fokusFuer = schritt;
    }
    if (!this.sperreAn) {
      this.sperreAn = true;
      eingabeSperre({
        lage: () => ({ ...this.sperrLage, fahrt: this.fahrtJetzt, anleiter: anleiterRechteck() }),
        daneben: () => { this.tutorialMelden({ art: 'tipp', tipp: 'daneben' }); stupsen(this.ruhig()); },
        tab_ziele: () => this.tabZiele,
      });
    }
  }
  /** ENTSCHEIDUNGEN 2026-11-06 (Muss M1): Kein Schritt steht nach dem Neuladen ohne erreichbares Ziel. Fehlt ein Baumenü-Ziel
   *  (T11 kasten_abschnitt, T12 leitungskarte), öffnet der Wiedereinstieg das Baumenü auf „Leitungen“ – sonst sperrte das
   *  Abdunkeln auch [Bauen], und das Tutorial hinge. Vor dem Messen der freien Fläche, weil das Blatt sie verkleinert. */
  private zielHerstellen(a: TutorialAnsicht): void {
    if (a.ziele.some((z) => BAUMENUE_ZIELE.has(z) && !document.querySelector(`[data-ziel="${z}"]`))) this.katalog('netz');
  }
  private geldflussOeffnen(): void {
    if (this.spiel.tutorialAktiv() || this.besuch) return;
    const sp = this.spiel, monat = sp.monat(), a = sp.stand.letzte_abrechnung;
    const { inhalt } = blattOeffnen({ titel: 'Geldfluss', art: 'popup' });
    inhalt.append(
      h('p', {}, `Kontostand: ${eur(sp.verfuegbareEuro)}`),
      h('p', {}, `Nächste Abrechnung: Ende ${sp.monatsname(monat.nr)}`),
      a ? h('div', { class: 'kasten' },
        h('h3', {}, `Letzte Abrechnung · ${sp.monatsname(a.monat)}`),
        h('p', {}, `${a.kunden} Kunden · ${a.waerme_kwh.toLocaleString('de-DE')} kWh`),
        h('p', {}, `Wärme ${eur(a.waerme_eur)} + Grundgebühr ${eur(a.grund_eur)} = ${eur(a.summe_eur)}`),
        a.eingang_eur === undefined ? null : h('p', {}, `Eingegangen: ${eur(a.eingang_eur)}`))
        : h('p', {}, 'Es gibt noch keine Monatsabrechnung.'),
    );
  }

  private hudJetzt(): void { this.hud.aktualisieren(this.auftrag); }
  private hinweiseZeigen(): void { this.ereignisse(); }

  private ereignisse(): void {
    const ruhig = this.einstellungen.weniger_bewegung;
    for (const ev of this.spiel.ereignisse.splice(0)) {
      if (ev.art === 'hinweis') toast(ev.text);
      else if (ev.art === 'sprecher') sprecherZeigen(ev.figur, ev.text);
      else if (ev.art === 'schritt') this.mitSchliessen(() => this.anleitung?.schritt(ev));
      // NR18 (AE-NR18-6): auch bei „Weniger Bewegung“ markieren – die Darstellung lässt dann nur den Puls weg
      else if (ev.art === 'engstelle') this.effekte.engstelle(ev.felder.map((f) => [f % N, Math.floor(f / N)] as const), ruhig);
      else if (ev.art === 'funken') {
        if (ruhig) continue;
        const o = ev.objekt_id === 'heizzentrale' ? this.spiel.hz : this.spiel.objekt(ev.objekt_id);
        if (o) { const k = groesse(o), [cx, cy] = this.kamera.mitte(o.x + (k - 1) / 2, o.y + (k - 1) / 2); this.effekte.funken(cx, cy, this.kamera.tw, ev.farbe); }
      } else if (ev.art === 'schwebtext') { if (!ruhig) this.effekte.schwebtext(ev.x, ev.y, ev.text, ev.farbe); }
      else if (ev.art === 'muenzen' && !ruhig) {
        const o = this.spiel.objekt(ev.objekt_id);
        if (o) { const [cx, cy] = this.kamera.mitte(o.x, o.y), [zx, zy] = this.hud.geldPillePunkt(); this.effekte.muenzen(cx, cy - this.kamera.tw * 0.5, zx, zy, ev.betrag_eur); }
      }
    }
  }
}

