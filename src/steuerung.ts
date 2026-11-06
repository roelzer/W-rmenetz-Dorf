import { pruefeAuftraege, type Auftrag } from './core/auftraege';
import { KATALOG, KONSTANTEN, LEITUNGEN, istLeitung, type TypId } from './core/katalog';
import { groesse } from './core/netz';
import { nachbardoerfer, type Nachbardorf } from './core/nachbarn';
import type { Spiel } from './core/spiel';
import { Effekte } from './render/effekte';
import { Kamera } from './render/kamera';
import { drehFrei } from './render/anschluss';
import { objektAmPunkt } from './render/treffer';
import type { Maler } from './render/maler';
import type { Szene } from './render/szene';
import { chip, knopf, sperren, symbol } from './ui/bausteine';
import { blattBreite_px, blattOeffnen, blattOffen, type Blatt } from './ui/blatt';
import { eur, h } from './ui/dom';
import { sprecherZeigen } from './ui/sprecher';
import { einstellungenLesen, einstellungenOeffnen, einstellungenSchreiben } from './ui/einstellungen';
import { Hud } from './ui/hud';
import { ortHolen } from './core/orte';
import { Katalog } from './ui/katalog';
import { Kontext, dickereFarbknopf, kurzGrund, tStueckHinweis } from './ui/kontext';
import { HAUSANSCHLUSS_KURZ, NICHTS_GEZEICHNET_KURZ, NICHTS_ZURUECK, abschnittSperreKurz, ersteSperre, schonGemocht } from './ui/sperrtexte';
import type { Ui } from './ui/schnittstelle';
import { T } from './ui/tokens';
import { toast } from './ui/toast';

const N = KONSTANTEN.feldanzahl;
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

  jetzt_ms(): number { return this.uhr(); }
  /** Läuft gerade eine Geste auf der Karte (Finger oder gedrückte Mitteltaste)? Die Bildschleife reicht es an die Bodenebene weiter. */
  fingerAufKarte(): boolean { return this.zeiger.size > 0 || this.mitteDreh !== null; }
  constructor(readonly spiel: Spiel, private readonly leinwand: HTMLCanvasElement, private readonly maler: Maler, private readonly uhr: () => number) {
    this.katalogUi = new Katalog(this);
    this.kontextUi = new Kontext(this, () => { this.auswahl = null; });
    this.hud = new Hud(() => this.spiel, {
      bauen: () => this.katalog(),
      besuchen: () => this.doerferOeffnen(),
      einstellungen: () => einstellungenOeffnen(this, this.einstellungen, (e) => { this.einstellungen = e; this.bewegungAnwenden(); }),
      auftrag: () => { if (this.auftrag) toast(this.auftrag.text); },
      kwUmschalten: () => this.kwUmschalten(),
      kwAn: () => this.einstellungen.kw_anzeigen,
    });
    document.getElementById('app')!.append(this.hud.wurzel, h('div', { id: 'ebene' }));
    this.eingabe();
    this.bewegungAnwenden();
    if (!spiel.stand.quelle_gewaehlt) { this.spiel.ersteQuelleWaehlen('kessel'); this.geaendert(); this.zentrieren(); }
    if (spiel.stand.namen_gefragt === false) this.namenFragen();
  }

  /** A79 (Simon): Beim Start eines neuen Spiels nach dem eigenen Namen und dem Dorfnamen fragen. */
  private namenFragen(): void {
    const b = blattOeffnen({ titel: 'Willkommen!', art: 'popup', schliessbar: false });
    const spieler = h('input', { class: 'feld', type: 'text', maxlength: 20, placeholder: 'z. B. Simon', 'aria-label': 'Dein Name', id: 'start-spieler', autocomplete: 'given-name' }) as HTMLInputElement;
    const dorf = h('input', { class: 'feld', type: 'text', maxlength: 24, value: this.spiel.stand.name, 'aria-label': 'Name deines Dorfs', id: 'start-dorf' }) as HTMLInputElement;
    const los = (): void => { this.spiel.namenSetzen(spieler.value, dorf.value); b.zu(); this.geaendert(); this.toast(`Viel Erfolg, ${this.spiel.spielerName}! ${this.spiel.stand.name} wartet auf sein Wärmenetz.`); };
    for (const f of [spieler, dorf]) f.addEventListener('keydown', (e) => { if (e.key === 'Enter') los(); });
    b.inhalt.append(
      h('p', {}, 'Du baust das Wärmenetz für ein Dorf. Wie heißt du, und wie heißt dein Dorf?'),
      h('label', { for: 'start-spieler', class: 'gedaempft' }, 'Dein Name (so sprechen dich Philipp, Laura und die Techniker an)'), spieler,
      h('label', { for: 'start-dorf', class: 'gedaempft' }, 'Name deines Dorfs'), dorf,
      h('div', { class: 'knopfreihe' }, knopf('Los geht’s', los, 'los')));
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
      k.zentrierenBei(o.x, o.y, groesse(o), (k.breite - blattBreite_px()) / 2, k.hoehe * 0.58);
    }
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
  }
  private werkzeugSetzen(typ: TypId, radieren: boolean, vorsehen: boolean): void {
    this.modus = 'stempel'; this.geist = null; this.verschiebeId = null;
    this.stempelTyp = typ; this.stempelLetzte = null; this.stempelAchse = null;
    this.radieren = radieren; this.vorsehen = vorsehen && !radieren;
  }
  private leisteOeffnen(): void {
    // Erste Nutzung je Spielstand (12.18): die Merke steht im Spielstand, damit sie Neuladen und Gerätewechsel übersteht
    this.hilfeOffen = !this.spiel.stand.zeichenhilfe_gesehen;
    this.spiel.stand.zeichenhilfe_gesehen = true;
    const frage = h('button', { type: 'button', class: 'knopf frage', 'aria-label': 'Hilfe zum Zeichnen', 'aria-expanded': 'false', onclick: () => this.hilfeZeigen(!this.hilfeOffen) }, symbol('frage'));
    const blatt = blattOeffnen({ titel: 'Zeichnen', klasse: 'zeichenleiste', kopfKnopf: frage, beiZu: () => { this.leiste = null; this.modusBlatt = null; this.modusZuruecksetzen(); } });
    // Außerhalb des scrollenden Inhalts: „Abschnitt abschließen“ bleibt immer im Bild (12.18 Aktionsleiste)
    const aktion = h('div', { class: 'aktionsleiste' });
    blatt.wurzel.append(aktion);
    this.modusBlatt = blatt;
    this.leiste = { blatt, frage, aktion };
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
    const zurueck = knopf(h('span', { class: 'mit-sym' }, symbol('zurueck'), 'Zurück'), () => { sp.letzteLeitungZurueck(); this.stempelLetzte = null; this.geaendert(); }, '', { klein: true, id: 'zurueck', sperre: () => (sp.abschnittLeitungen() ? null : NICHTS_ZURUECK), neuAufbau });
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
    l.aktion.replaceChildren(knopf('Abschnitt abschließen', () => this.leisteAbschliessen(), 'los', { id: 'abschliessen', sperre: () => ersteSperre(abschnittSperreKurz(sp, this.uhr), sp.abschnittLeitungen() ? null : NICHTS_GEZEICHNET_KURZ), neuAufbau }));
    if (fokus) [...l.blatt.wurzel.querySelectorAll<HTMLElement>('button')].find((b) => b.getAttribute('data-id') === fokus)?.focus();
  }
  private leisteAbschliessen(): void {
    const r = this.spiel.abschnittAbschliessen();
    if (r.ok) { this.abbrechen(); this.geaendert(); this.katalog('netz'); return; }
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
    if (!this.geistOk()) { toast('Hier ist kein Platz – such dir freie Wiese.'); return; }
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
      if (e.pointerType === 'mouse' && e.button === 1) { e.preventDefault(); this.mitteDreh = { x: e.clientX }; l.setPointerCapture(e.pointerId); return; }
      l.setPointerCapture(e.pointerId);
      this.zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.zeiger.size === 1) {
        this.start = { x: e.clientX, y: e.clientY }; this.zieht = false; this.geistGreifen = this.nahAmGeist(e.clientX, e.clientY);
        if (this.modus === 'stempel') { this.stempelLetzte = null; this.stempelAchse = null; this.stempelnBei(e.clientX, e.clientY, true); }
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
        this.kamera.zoomUm(neu.abstand / (this.pinch.abstand || 1), neu.mx, neu.my);
        this.kamera.schiebe_x += neu.mx - this.pinch.mx; this.kamera.schiebe_y += neu.my - this.pinch.my; this.kamera.begrenzen();
        const d = drehFrei(this.drehSumme, neu.winkel - this.pinch.winkel, this.drehAktiv);
        this.drehSumme = d.summe_rad; this.drehAktiv = d.aktiv;
        if (d.dreh_rad) this.kamera.drehenUm(d.dreh_rad, neu.mx, neu.my);
        this.pinch = neu; return;
      }
      if (!this.start) return;
      if (!this.zieht && Math.hypot(e.clientX - this.start.x, e.clientY - this.start.y) > T.karte.ziehen_schwelle_px) this.zieht = true;
      if (!this.zieht) return;
      if (this.modus === 'stempel') { this.stempelnBei(e.clientX, e.clientY); return; }
      if (this.geistGreifen && this.geist) { this.geistSetzen(e.clientX, e.clientY); return; }
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
    l.addEventListener('wheel', (e) => { e.preventDefault(); this.kamera.zoomUm(e.deltaY < 0 ? T.karte.zoom_schritt_rad : 1 / T.karte.zoom_schritt_rad, e.clientX, e.clientY); }, { passive: false });
    document.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const schritt = 40;
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
    g.y = Math.max(0, Math.min(N - g.kante, Math.round(fy - (g.kante - 1) / 2)));
  }
  /** `gesteStart`: erstes Feld einer Geste (Finger aufgesetzt) – nur dort meldet ein abgelehnter Ersatz etwas. */
  private stempelnBei(mx: number, my: number, gesteStart = false): void {
    if (!this.stempelTyp) return;
    const [x, y] = this.kamera.feld(mx, my);
    if (x < 0 || y < 0 || x >= N || y >= N) return;
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
    let felder: Array<[number, number]> = [[x, y]];
    if (l && (x !== l[0] || y !== l[1])) {
      const dx = x - l[0], dy = y - l[1];
      if (!this.stempelAchse) this.stempelAchse = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      const entlang = this.stempelAchse === 'h' ? dx : dy, quer = this.stempelAchse === 'h' ? dy : dx;
      if (Math.abs(quer) >= 2 && Math.abs(quer) > Math.abs(entlang)) this.stempelAchse = this.stempelAchse === 'h' ? 'v' : 'h';
      const horizontal = this.stempelAchse === 'h';
      const laenge = horizontal ? dx : dy, schritt = Math.sign(laenge);
      felder = [];
      for (let i = 1; i <= Math.abs(laenge); i++) felder.push(horizontal ? [l[0] + i * schritt, l[1]] : [l[0], l[1] + i * schritt]);
    }
    let geaendert = false;
    for (const [fx, fy] of felder) {
      if (!this.spiel.kannPlatzieren(this.stempelTyp, fx, fy)) {
        const r = this.ueberzeichnen(this.stempelTyp, fx, fy, gesteStart && felder.length === 1);
        if (r) { geaendert = true; this.stempelLetzte = [fx, fy]; }
        continue;
      }
      if (this.spiel.platzieren(this.stempelTyp, fx, fy).ok) { geaendert = true; this.stempelLetzte = [fx, fy]; } else { this.hinweiseZeigen(); break; }
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
    const o = objektAmPunkt(this.kamera, this.spiel.stand.objekte, mx, my); // A80: gezeichnete Form zählt, nicht nur das Bodenfeld
    if (!o) { this.kontextUi.schliessen(); return; }
    this.kontext(o.id);
  }

  // ---------- je Bild ----------
  szene(): Szene {
    const g = this.geist, v = this.besuch;
    if (v) return { objekte: v.objekte, innen: v.innen, netz: v.netz, spiel: null, auswahl_id: null, modus: 'normal', verschiebe_id: null, jetzt_ms: this.uhr(), geist: null, stempel: null };
    return {
      objekte: this.spiel.stand.objekte, innen: this.spiel.stand.innen, netz: this.spiel.netz, spiel: this.spiel,
      auswahl_id: this.auswahl, modus: this.modus, verschiebe_id: this.verschiebeId, jetzt_ms: this.uhr(),
      geist: g ? { ...g, ok: this.geistOk() } : null, stempel: null,
      strassen: ortHolen(this.spiel.stand.ort).strassen, fluss: ortHolen(this.spiel.stand.ort).fluss, kw_anzeigen: this.einstellungen.kw_anzeigen,
    };
  }

  /** Spiel fortschreiben, Ereignisse in Effekte/Toasts übersetzen, Oberfläche auffrischen. */
  tick(jetzt_ms: number): void {
    this.spiel.bis(jetzt_ms);
    this.ereignisse();
    if (jetzt_ms - this.letzterAuftragMs > 1000) { this.letzterAuftragMs = jetzt_ms; this.auftrag = pruefeAuftraege(this.spiel); this.ereignisse(); }
    if (jetzt_ms - this.letzteHudMs > 250) { this.letzteHudMs = jetzt_ms; this.hudJetzt(); this.kontextUi.aktualisieren(); }
    // A92: Restzeit des Bauabschnitts im Baumenü; einmal je Sekunde reicht für eine Sekundenanzeige und schont die Bildrate (A90)
    if (jetzt_ms - this.letzterKatalogMs >= 1000) { this.letzterKatalogMs = jetzt_ms; this.katalogUi.aktualisieren(); }
  }
  private hudJetzt(): void { this.hud.aktualisieren(this.auftrag); }
  private hinweiseZeigen(): void { this.ereignisse(); }

  private ereignisse(): void {
    const ruhig = this.einstellungen.weniger_bewegung;
    for (const ev of this.spiel.ereignisse.splice(0)) {
      if (ev.art === 'hinweis') toast(ev.text);
      else if (ev.art === 'sprecher') sprecherZeigen(ev.figur, ev.text);
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
