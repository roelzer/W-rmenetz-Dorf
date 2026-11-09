import {
  KATALOG, KONSTANTEN, LEITUNGEN, PREISSTUFEN, UPGRADES, VORLAUF, HELFER, ABSCHNITT_HELFER, DACH_PV, HZ_ZIELE, SPREIZUNG_BASIS_K, SPIELJAHR_MS, SPIELMONAT_MS, MONATE, MONATSANTEIL_PROMILLE, GRUNDGEBUEHR, MIN_VORLAUF_C, MIN_RUECKLAUF_C, STATIONEN, passendeStation, passendePufferStation, istPufferStation, stationHolen, hatStufen, istLeitung, istQuelle, type Station, type TypId,
} from './katalog';
import {
  belegungskarte, berechneNetz, leitungsNachbarn, mittlereSpreizung_k, spreizungHaus_k, bedarfKw, nutzungsfaktor, dorfwert, groesse, heizzentrale, istAktiv, istKunde, stationReicht, pufferStationReicht, trassenUebergang,
} from './netz';
import type { Abrechnung, Bau, InnenQuelle, Netz, Objekt, Spielstand } from './typen';
import { ortHolen } from './orte';
import { abStufe, freigeschaltet, merkmalName, neuBeiStufe, sperrgrund, type Merkmal } from './freischaltung';
import type { Schritt, TutorialWerte } from './tutorial-vertrag';
import { ERSTE_HAEUSER } from './start';
import { ENGPASS_ERSATZ, engstelleText, mehrereStellenText, engstellenFinden, type Engstelle } from './engstelle';

const N = KONSTANTEN.feldanzahl;
/** A38: So lange wird eine Abwesenheit höchstens nachgerechnet (7 Tage). */
const MAX_OFFLINE_S = 7 * 24 * 3600;
const SCHRITT_S = 30;
/** Ab dieser Lücke (Sekunden) gilt das Spiel als „war zu“. */
const OFFLINE_SCHWELLE_S = 300;

/** Ereignisse für Oberfläche und Darstellung (Hinweise, Effekte). Der Kern kennt keine Grafik. */
export type Ereignis =
  | { art: 'hinweis'; text: string }
  | { art: 'funken'; objekt_id: number | 'heizzentrale'; farbe?: string }
  | { art: 'muenzen'; objekt_id: number; betrag_eur: number }
  | { art: 'schwebtext'; x: number; y: number; text: string; farbe?: string }
  /** A51: Eine Figur (Philipp, Laura, ein Techniker) kommt kurz ins Bild und sagt etwas */
  | { art: 'sprecher'; figur: string; text: string }
  /** NR18 (AE-NR18-6): zu dünne Leitungsfelder (y·N + x) markieren; die Darstellung entscheidet über Puls oder fest */
  | { art: 'engstelle'; felder: number[] }
  /** NR13 (AE-NR13-2): eine Handlung ist gelungen; ein Tutorial kann darauf warten (Namen in tutorial-vertrag.ts) */
  | { art: 'schritt'; schritt: Schritt; objekt_id?: number };

export interface Ergebnis { ok: boolean; hinweis?: string }
const ok = (): Ergebnis => ({ ok: true });

/** Ein Spieltag in ms (1 Spieljahr = 365 Tage). */
const SPIELTAG_MS = SPIELJAHR_MS / 365;
const tageText = (t: number): string => `${t} ${t === 1 ? 'Tag' : 'Tage'}`;
/** Bauplan NR18 Abschnitt 6: Ablehnungen des Ersatzes (außerhalb des offenen Abschnitts) und des Entfernens während des Baus (W5). */
/** NR18-D (Designer 2026-11-06): einmalige Start-Meldung nach der Begrüßung, bis das Tutorial (NR13) sie ablöst. */
export const START_TIPP = `Tipp ein Haus an – ${ABSCHNITT_HELFER.planung} plant dort deinen ersten Bauabschnitt.`;
/** AE-NR13-7: Satz, mit dem die Oberfläche die gesperrte Wandstation im Tutorial erklärt. */
export const WANDSTATION_TUTORIAL = 'Im Tutorial nimmst du den Standard. Die Wandstation kannst du später wählen.';
const ERSATZ_NUR_IM_ABSCHNITT = `Dickere Leitungen entstehen nur im Bauabschnitt – lass ${ABSCHNITT_HELFER.planung} einen planen.`;
const ERSATZ_IM_BAU = 'Diese Leitung wird gerade ersetzt – warte, bis der Abschnitt gebaut ist.';
const istHausOderGross = (o: Objekt): boolean => ['haus', 'gross'].includes(KATALOG[o.typ].kategorie);

export { neuerSpielstand } from './start';

export class Spiel {
  stand: Spielstand;
  netz!: Netz;
  readonly ereignisse: Ereignis[] = [];
  private abwesend = false;
  /** A81: Abrechnungsmeldung, die bei Abwesenheit erst am Ende gezeigt wird */
  private offline_text = '';
  /** A88/F2: während der laufenden Abwesenheit neu entstandene Kundenanfragen (eine Sammelmeldung statt vieler) */
  private offline_anfragen = 0;
  private strassenSet?: Set<number>;
  private flussSet?: Set<number>;
  /** AE-NR18-5: Warnsätze „Nach dem Bau zu dünn“ des abgeschlossenen Abschnitts – nur hier, nie im Spielstand. */
  private warnliste: string[] = [];
  /** NR18-W: zuletzt gerechnetes Probe-Netz zum Abgleich der wartenden Häuser und der Schlüssel, für den es gilt. */
  private probeSpeicher: { netz: Netz; zu: Netz; schluessel: string } | null = null;
  /** AE-NR13-2: zuletzt erreichte Häuser; Grundlage für haus_erreicht/haus_getrennt. */
  private erreicht: Set<number>;
  constructor(stand: Spielstand, private readonly uhr: () => number) {
    this.stand = stand;
    this.anfragenPruefen();
    this.neuBerechnen();
    // Beim Laden nur merken, nichts melden: sonst kündigt jedes Laden alle erreichten Häuser neu an.
    const probe = this.probeNetz();
    this.erreicht = new Set(this.erreichteIn(probe));
    if (stand.abschnitt?.phase === 'bestellen') this.warnlisteFuellen(probe);
  }

  // ---------- Abfragen ----------
  /** A88: Ist das Merkmal bei der jetzigen Heizzentralen-Stufe frei? Die Oberfläche fragt nur hier, sie rechnet nie selbst. */
  freigeschaltet(m: Merkmal): boolean { return freigeschaltet(this.stand, m); }
  sperrgrund(m: Merkmal): string | null { return sperrgrund(this.stand, m); }
  /** A88: Lehnt eine Aktion mit einem gesperrten Merkmal ab (AE-A88-2: der Kern setzt die Sperre selbst durch); frei = null. */
  private gesperrt(m: Merkmal): Ergebnis | null {
    const text = this.sperrText(m);
    return text ? this.nein(text) : null;
  }
  /** Sperrsatz ohne Ereignis: Die Zeichenleiste setzt nach einer Ablehnung ihre Ereignisliste zurück und zeigt den Text selbst. */
  private sperrText(m: Merkmal): string | null {
    const grund = sperrgrund(this.stand, m);
    return grund ? `${merkmalName(m)} ${grund}` : null;
  }

  /** NR13: Das Tutorial läuft, solange die Merke im Spielstand steht (AE-NR13-3). */
  tutorialAktiv(): boolean { return !!this.stand.tutorial; }
  /** AE-NR13-7: Die Wandstation ist erst nach dem Tutorial wählbar. */
  wandstationFrei(): boolean { return !this.stand.tutorial; }
  /** NR13: Ids der Häuser und Großabnehmer, die über gebaute und eingezeichnete Leitungen mit der Heizzentrale verbunden sind
   *  (mit oder ohne Station), aufsteigend. Dieselbe Probe-Rechnung wie die Warnprüfung (AE-NR18-3). */
  erreichteHaeuser(): number[] { return this.erreichteIn(this.probeNetz()); }
  /** NR13: Zahlen für die Tutorial-Texte, aus denselben Rechnungen wie das Spiel (AE-NR18-3: keine zweite Netzrechnung). */
  tutorialWerte(): TutorialWerte {
    const [h1, h2] = this.tutorialHaeuser();
    const kw_puffer = bedarfKw({ ...h1, hauspuffer: true });
    const leitung = this.passendeLeitung(kw_puffer + bedarfKw({ ...h2, hauspuffer: true }));
    if (!leitung) throw new Error('NR13: keine Leitung freigeschaltet');
    return {
      kessel_kw: this.netz.verfuegbar_kw, kwh: this.jahresverbrauch_kwh(h1), kw_ohne: bedarfKw({ ...h1, hauspuffer: false }), kw_puffer,
      leitung, kap_kw: KATALOG[leitung].kapazitaet_kw as number,
    };
  }
  /** NR13 (Weg b): Was bis zum Material noch fehlt – eingezeichnete Leitungen plus die Puffer-Stationen der Tutorial-Häuser, die noch
   *  keine haben, zum Preis, den stationKaufen abbucht. 0 ohne Tutorial und außerhalb der Phasen offen/bestellen. */
  tutorialGeldFehlt_eur(): number {
    const phase = this.stand.abschnitt?.phase;
    if (!this.stand.tutorial || (phase !== 'offen' && phase !== 'bestellen')) return 0;
    const stationen_eur = this.tutorialHaeuser().filter((h) => !h.station).reduce((summe, h) => {
      const st = passendePufferStation(bedarfKw({ ...h, hauspuffer: true }), bedarfKw({ ...h, hauspuffer: false }));
      if (!st) throw new Error(`NR13: keine Puffer-Station für ${KATALOG[h.typ].name}`);
      return summe + this.stationspreis_eur(h, st);
    }, 0);
    return Math.max(0, this.abschnittKosten_eur() + stationen_eur - this.stand.geld_eur);
  }
  /** NR13: zuletzt begonnenes Kapitel merken (Wiedereinstieg); nur im laufenden Tutorial und nur Kapitel 1–6. */
  tutorialKapitelSetzen(kapitel: number): void {
    if (this.stand.tutorial && Number.isInteger(kapitel) && kapitel >= 1 && kapitel <= 6) this.stand.tutorial.kapitel = kapitel;
  }
  /** NR13: Tutorial fertig – die Merke verschwindet, ab jetzt gilt das normale Spiel. */
  tutorialBeenden(): void { delete this.stand.tutorial; }
  /** NR13 (T-F3): „Ohne Tutorial“ – wie das Ende; ein laufender Abschnitt behält seine kurze Restzeit. */
  tutorialUeberspringen(): void { this.tutorialBeenden(); }
  /** Die zwei Häuser an ERSTE_HAEUSER; speichern.ts löscht die Merke, wenn eins fehlt, darum ist das Fehlen hier ein Fehler. */
  private tutorialHaeuser(): [Objekt, Objekt] {
    const [h1, h2] = ERSTE_HAEUSER.map(([x, y]) => {
      const h = this.stand.objekte.find((o) => o.x === x && o.y === y && KATALOG[o.typ].kategorie === 'haus');
      if (!h) throw new Error(`NR13: kein Haus bei (${x}|${y})`);
      return h;
    });
    return [h1, h2];
  }
  /** NR18: Warnsätze „Nach dem Bau zu dünn“ des abgeschlossenen Bauabschnitts (Phase bestellen). */
  abschnittWarnungen(): string[] { return [...this.warnliste]; }
  /** A88: kleinste freigeschaltete Leitung, die den Bedarf trägt, sonst die dickste freigeschaltete. */
  passendeLeitung(bedarf_kw: number): TypId | undefined {
    const frei = LEITUNGEN.filter((l) => freigeschaltet(this.stand, l));
    return frei.find((l) => (KATALOG[l].kapazitaet_kw as number) >= bedarf_kw) ?? frei[frei.length - 1];
  }
  get vorlauf_c(): number { return this.stand.vorlauf_c ?? VORLAUF.start_c; }
  /** A81: monatliche Grundgebühr je Anschluss in € */
  get grundgebuehr_eur(): number { return this.stand.grundgebuehr_eur ?? GRUNDGEBUEHR.start_eur; }
  /** A81: Grundgebühr in ganzen Euro setzen (25–40 €). */
  grundgebuehrSetzen(eur: number): void {
    this.stand.grundgebuehr_eur = Math.max(GRUNDGEBUEHR.min_eur, Math.min(GRUNDGEBUEHR.max_eur, Math.round(eur)));
    this.neuBerechnen();
  }
  /** A81: Monatsname zu einer Monatsnummer (Spielzeit ÷ Monatslänge). */
  monatsname(nr: number): string { return MONATE[((nr % 12) + 12) % 12]; }
  /** A81: Nummer des aktuellen Spielmonats und Rest bis zur nächsten Abrechnung in ms. */
  monat(): { nr: number; rest_ms: number } {
    const t = this.uhr(), nr = Math.floor(t / SPIELMONAT_MS);
    return { nr, rest_ms: (nr + 1) * SPIELMONAT_MS - t };
  }
  /** A81: Jahresverbrauch eines Kunden in kWh (mit Kamin aus / Aufstockung). */
  jahresverbrauch_kwh(o: Objekt): number { return (KATALOG[o.typ].verbrauch_kwh_a ?? 0) * nutzungsfaktor(o); }
  /** A81: Erwarteter Monatsbetrag eines Kunden in € für einen Monat (kWh-Anteil × Wärmepreis + Grundgebühr). */
  monatsbetrag_eur(o: Objekt, nr: number): number {
    return this.jahresverbrauch_kwh(o) * (MONATSANTEIL_PROMILLE[((nr % 12) + 12) % 12] / 1000) * PREISSTUFEN[this.stand.preisstufe].ct_je_kwh / 100 + this.grundgebuehr_eur;
  }
  /** Vorlauftemperatur in 5-K-Schritten setzen (A33). */
  vorlaufSetzen(c: number): Ergebnis {
    const sperre = this.gesperrt('vorlauf');
    if (sperre) return sperre;
    const w = Math.max(VORLAUF.min_c, Math.min(VORLAUF.max_c, Math.round(c / VORLAUF.schritt_c) * VORLAUF.schritt_c));
    this.stand.vorlauf_c = w; this.neuBerechnen();
    return ok();
  }
  /** Vorlauftemperatur, die dieses Haus für ausreichend Wärme braucht (sinkt mit Upgrades). */
  mindestVorlauf_c(o: Objekt): number {
    const basis = MIN_VORLAUF_C[o.typ] ?? 70;
    return basis - UPGRADES.slice(0, o.upgrade ?? 0).reduce((a, u) => a + u.senkung_k, 0);
  }
  /** A36: PV-Anlage auf dem Dach der Heizzentrale; ihre Größe wächst mit der Stufe. Überschuss geht ins Stromnetz. */
  dachPvLeistung_kw(): number { return DACH_PV.kw_je_stufe[this.hzStufe - 1] ?? 0; }
  dachPvKaufen(): Ergebnis {
    const hz = this.hz;
    if (hz.dach_pv) return { ok: false };
    const sperre = this.gesperrt('dach_pv');
    if (sperre) return sperre;
    const kw = this.dachPvLeistung_kw();
    const b = this.bezahlen({ eur: kw * DACH_PV.eur_je_kw });
    if (!b.ok) return b;
    hz.dach_pv = true; hz._pop = this.uhr();
    this.ereignisse.push({ art: 'funken', objekt_id: 'heizzentrale' });
    this.hinweis(`PV-Anlage auf dem Heizhaus-Dach: ${kw} kWp`);
    this.neuBerechnen();
    return ok();
  }

  /** Warm versorgte Wohnhäuser – zählt für die Ziele der Heizzentrale und fürs Baugebiet. */
  versorgteHaeuser(): number { return this.stand.objekte.filter((o) => this.netz.warm.has(o.id) && KATALOG[o.typ].kategorie === 'haus').length; }
  /** A43: Baugebiet in der Gegenrichtung erschließen – ein zweiter Strang aus dem Heizhaus, neue Häuser stehen fest. */
  baugebietBedingungen(): { ok: boolean; fehlt: string[] } {
    const fehlt: string[] = [];
    if (this.stand.baugebiet) fehlt.push('Baugebiet ist schon erschlossen');
    if (!freigeschaltet(this.stand, 'baugebiet')) fehlt.push(`Heizzentrale Stufe ${abStufe('baugebiet')}`);
    const n = this.versorgteHaeuser();
    if (n < KONSTANTEN.baugebiet_anschluesse) fehlt.push(`${KONSTANTEN.baugebiet_anschluesse} angeschlossene Häuser (jetzt ${n})`);
    return { ok: fehlt.length === 0, fehlt };
  }
  baugebietErschliessen(): Ergebnis {
    if (!this.baugebietBedingungen().ok) return this.nein('Die Bedingungen für das Baugebiet sind noch nicht erfüllt');
    // Gegenrichtung zum Schwerpunkt der bestehenden Häuser; erst Plätze suchen, bezahlt wird nur bei mindestens einem Grundstück
    const haeuser = this.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus');
    const sx = haeuser.reduce((a, o) => a + o.x, 0) / Math.max(1, haeuser.length), sy = haeuser.reduce((a, o) => a + o.y, 0) / Math.max(1, haeuser.length);
    const hz = this.hz, dx = Math.sign(hz.x - sx) || 1, dy = Math.sign(hz.y - sy) || 1;
    const ziele: Array<[number, number]> = [];
    for (let r = 4; r <= 11; r++) for (let a = -5; a <= 5; a++) ziele.push([hz.x + dx * r, hz.y + a], [hz.x + a, hz.y + dy * r]);
    const typen: TypId[] = ['efh', 'efh', 'rh', 'efh', 'mfh', 'efh', 'rh', 'efh'];
    const plaetze: Array<{ typ: TypId; x: number; y: number }> = [];
    for (const [x, y] of ziele) {
      if (plaetze.length >= typen.length) break;
      const t = typen[plaetze.length], k = KATALOG[t].groesse ?? 1;
      const nahe = [...haeuser, ...plaetze.map((p) => ({ ...p, typ: p.typ }))].some((o) => KATALOG[o.typ].kategorie === 'haus' && Math.abs(o.x - x) < k + 1 && Math.abs(o.y - y) < k + 1);
      if (nahe || !this.kannPlatzieren(t, x, y)) continue;
      plaetze.push({ typ: t, x, y });
    }
    if (!plaetze.length) return this.nein('Auf dieser Seite ist kein Platz für ein Baugebiet');
    const b = this.bezahlen({ eur: KONSTANTEN.baugebiet_eur });
    if (!b.ok) return b;
    for (const p of plaetze) this.stand.objekte.push({ id: this.stand.naechste_id++, typ: p.typ, x: p.x, y: p.y, stufe: 1, bau: null, kasse_eur: 0, zufriedenheit_pct: 80, bestand: true, ohne_station: true, _pop: this.uhr() });
    this.stand.baugebiet = true;
    this.hinweis(`Baugebiet erschlossen: ${plaetze.length} neue Grundstücke – verbinde sie mit einem Bauabschnitt`);
    this.neuBerechnen();
    return ok();
  }

  /** Helfer, der gerade keinen Auftrag hat (A40). */
  freierHelfer(): string | undefined {
    const belegt = new Set(this.stand.objekte.filter((o) => o.upgrade_auftrag).map((o) => o.upgrade_auftrag!.helfer));
    return HELFER.find((h) => !belegt.has(h));
  }
  /** Was der Helfer gerade tut (für die Anzeige). */
  helferAuftrag(name: string): { objekt: Objekt; ende_ms: number } | undefined {
    const o = this.stand.objekte.find((x) => x.upgrade_auftrag?.helfer === name);
    return o ? { objekt: o, ende_ms: o.upgrade_auftrag!.ende_ms } : undefined;
  }
  /** Nächstes Hausupgrade beauftragen: Ein freier Helfer senkt den Rücklauf; das kostet Geld und Zeit (A33/A40). */
  upgradeKaufen(id: number, helfer?: string): Ergebnis {
    const o = this.objekt(id), n = o?.upgrade ?? 0;
    if (!o || !(KATALOG[o.typ].kategorie === 'haus' || KATALOG[o.typ].kategorie === 'gross') || n >= UPGRADES.length) return { ok: false };
    const sperre = this.gesperrt('ruecklauf_helfer');
    if (sperre) return sperre;
    if (o.ohne_station) return this.nein('Erst eine Übergabestation einbauen');
    if (o.upgrade_auftrag) return this.nein('Hier arbeitet schon ein Helfer');
    const wer = helfer ?? this.freierHelfer();
    if (!wer || !HELFER.includes(wer) || this.helferAuftrag(wer)) return this.nein('Alle Helfer sind beschäftigt');
    const b = this.bezahlen({ eur: UPGRADES[n].kosten_eur });
    if (!b.ok) return b;
    o.upgrade_auftrag = { helfer: wer, ende_ms: this.uhr() + UPGRADES[n].dauer_s * KONSTANTEN.bauzeit_faktor * 1000 };
    this.sagt(wer, `Alles klar, ${this.spielerName}, ich kümmere mich drum: ${UPGRADES[n].name}.`);
    return ok();
  }
  /** Spreizung des Netzes (Vorlauf minus Rücklauf): Grundwert plus Upgrades, nach Bedarf gewichtet; der Rücklauf fällt nie unter 40 °C (A73), bei niedrigem Vorlauf schrumpft sie also. */
  spreizung_k(): number { return mittlereSpreizung_k(this.stand.objekte, this.netz.warm, this.vorlauf_c); }
  /** Bedingungen für die nächste Heizzentralen-Stufe (A39). */
  hzZiele(): { text: string; ist: number; soll: number; erreicht: boolean }[] {
    const z = HZ_ZIELE.find((x) => x.stufe === this.hzStufe + 1);
    if (!z) return [];
    const anschluesse = this.versorgteHaeuser();
    const liste = [{ text: 'Angeschlossene Häuser', ist: anschluesse, soll: z.anschluesse }];
    if (z.absatz_kw) liste.push({ text: 'Wärmeabsatz in kW', ist: Math.round(this.netz.genutzt_kw), soll: z.absatz_kw });
    if (z.spreizung_k) liste.push({ text: 'Spreizung in K', ist: Math.round(this.spreizung_k()), soll: z.spreizung_k });
    return liste.map((x) => ({ ...x, erreicht: x.ist >= x.soll }));
  }

  neuBerechnen(): void {
    const alt = this.netz?.warm;
    this.netz = berechneNetz(this.stand.objekte.filter((o) => !o.geplant), this.stand.innen, this.stand.preisstufe, this.vorlauf_c, this.grundgebuehr_eur);
    // Die erste Rechnung (Konstruktor) meldet nichts, sonst wäre nach jedem Laden jedes warme Haus „neu warm“.
    if (alt) for (const id of this.netz.warm) if (!alt.has(id)) this.schritt('haus_warm', id);
  }
  /** AE-NR18-3: Netz „wie nach dem Bau“ – alle Objekte samt eingezeichneter Leitungen, geplanter Ersatz mit seinem neuen Typ. */
  private probeNetz(anpassen?: (o: Objekt) => Objekt): Netz {
    const objekte = this.stand.objekte.map((o) => {
      const a = anpassen ? anpassen(o) : o;
      return a.ersatz ? { ...a, typ: a.ersatz.typ } : a;
    });
    return berechneNetz(objekte, this.stand.innen, this.stand.preisstufe, this.vorlauf_c, this.grundgebuehr_eur);
  }
  /**
   * NR18-W (Entscheidung 06.11., Weg A): Häuser, die nur wegen der Leitung kalt sind und nach dem laufenden Bauabschnitt warm
   * wären – sie warten auf den Bau und verlieren keine Zufriedenheit. Nur in den Phasen bestellen und bau: Erst der
   * abgeschlossene Abschnitt ist verbindlich, ein offener, nie abgeschlossener wäre sonst ein Dauer-Freibrief (Review W1).
   * Ohne solchen Abschnitt oder ohne Haus kalt wegen Leitung wird nichts gerechnet (der Normalfall in jedem Spieltakt).
   */
  private wartenAufBau(): Set<number> {
    const phase = this.stand.abschnitt?.phase;
    if (phase !== 'bestellen' && phase !== 'bau') return new Set();
    const kalt = [...this.netz.kalt].filter(([, grund]) => grund === 'leitung').map(([id]) => id);
    if (!kalt.length) return new Set();
    const probe = this.probeGespeichert();
    return new Set(kalt.filter((id) => probe.warm.has(id)));
  }
  /**
   * Probe-Netz nur neu rechnen, wenn sich etwas geändert hat. Alles außer eingezeichneten Leitungen und Ersatz steckt schon
   * im gebauten Netz, das jede Änderung über neuBerechnen neu anlegt; dessen Identität plus die Abschnittsteile ist der Schlüssel.
   */
  private probeGespeichert(): Netz {
    const schluessel = this.stand.objekte
      .filter((o) => o.geplant || o.ersatz)
      .map((o) => `${o.id}:${o.typ}:${o.x}:${o.y}:${o.geplant ? 1 : 0}:${o.ersatz?.typ ?? ''}:${o.vorsehung ? 1 : 0}:${JSON.stringify(o.trassenUebergaenge ?? {})}`).join('|');
    const sp = this.probeSpeicher;
    if (sp && sp.zu === this.netz && sp.schluessel === schluessel) return sp.netz;
    const netz = this.probeNetz();
    this.probeSpeicher = { netz, zu: this.netz, schluessel };
    return netz;
  }
  private erreichteIn(netz: Netz): number[] {
    return this.stand.objekte.filter((o) => istHausOderGross(o) && netz.anschluss.has(o.id)).map((o) => o.id).sort((x, y) => x - y);
  }
  /** AE-NR13-2: erreichte Häuser mit dem letzten Stand vergleichen und Zuwachs/Verlust als Schritt melden. */
  private erreichtAbgleichen(netz: Netz = this.probeNetz()): void {
    const neu = new Set(this.erreichteIn(netz)), alt = this.erreicht;
    this.erreicht = neu;
    for (const id of neu) if (!alt.has(id)) this.schritt('haus_erreicht', id);
    for (const id of alt) if (!neu.has(id)) this.schritt('haus_getrennt', id);
  }
  private schritt(schritt: Schritt, objekt_id?: number): void {
    this.ereignisse.push(objekt_id === undefined ? { art: 'schritt', schritt } : { art: 'schritt', schritt, objekt_id });
  }
  /** Warnsatz zur Engstelle; Satz 2 nennt die Stufe, wenn die empfohlene Leitung noch gesperrt ist (Bauplan Abschnitt 6). */
  private engstelleSatz(e: Engstelle): string {
    return engstelleText(e, e.empfohlen === null || freigeschaltet(this.stand, e.empfohlen) ? null : abStufe(e.empfohlen));
  }
  /** Alle zu dünnen Stücke für die Kunden, die im Probe-Netz wegen der Leitung kalt sind. */
  private engstellenIn(netz: Netz, kunden?: number[]): Engstelle[] {
    const kalt = kunden ?? [...netz.kalt].filter(([, grund]) => grund === 'leitung').map(([id]) => id);
    return kalt.length ? engstellenFinden(netz, kalt) : [];
  }
  /** AE-NR18-5: Warnliste aus dem Probe-Netz neu füllen (Abschließen, Laden, Stationskauf, Entfernen). */
  private warnlisteFuellen(nachher: Netz): Engstelle[] {
    const stuecke = this.engstellenIn(nachher);
    this.warnliste = stuecke.map((e) => this.engstelleSatz(e));
    return stuecke;
  }
  get hz(): Objekt { return heizzentrale(this.stand.objekte); }
  get hzStufe(): number { return this.hz.stufe; }
  anzahl(t: TypId): number {
    return KATALOG[t].kategorie === 'innen'
      ? this.stand.innen.filter((k) => k.typ === t).length
      : this.stand.objekte.filter((o) => o.typ === t && !o.landschaft && !o.bestand).length;
  }
  grenze(t: TypId): number { return KATALOG[t].grenze ? KATALOG[t].grenze![this.hzStufe - 1] : 0; }
  leitungsanzahl(): number { return this.stand.objekte.filter((o) => istLeitung(o.typ)).length; }
  monteure(): number { return this.anzahl('huette'); }
  beschaeftigt(): number {
    return this.stand.objekte.filter((o) => o.bau).length + this.stand.innen.filter((k) => k.bau).length;
  }
  kassengrenze_eur(): number {
    return KONSTANTEN.grundkasse_eur + this.stand.objekte
      .filter((o) => o.typ === 'buero' && istAktiv(o))
      .reduce((a, o) => a + (KATALOG.buero.kassenspeicher_eur as number[])[o.stufe - 1], 0);
  }
  /** Ruf in %: Durchschnitt der Zufriedenheit angeschlossener Kunden. */
  ruf_pct(): number {
    const ks = this.stand.objekte.filter((o) => istKunde(o) && this.netz.anschluss.has(o.id));
    return ks.length ? ks.reduce((a, o) => a + (o.zufriedenheit_pct ?? 80), 0) / ks.length : 75;
  }
  dorfwert(): number { return dorfwert(this.stand.objekte, this.stand.innen); }
  objekt(id: number): Objekt | undefined { return this.stand.objekte.find((o) => o.id === id); }

  kannPlatzieren(t: TypId, x: number, y: number, ohneId = 0, kante?: number): boolean {
    const s = kante ?? KATALOG[t].groesse ?? 1;
    if (x < 0 || y < 0 || x + s > N || y + s > N) return false;
    const belegung = belegungskarte(this.stand.objekte, this.objekt(ohneId));
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      if (belegung[(y + dy) * N + x + dx]) return false;
      // A46: Auf Straßen steht nichts (außer Leitungen, Laternen, Bänke); im Fluss nur Leitungen (per Spülbohrung)
      const fx = x + dx, fy = y + dy;
      if (!istLeitung(t) && this.istFluss(fx, fy)) return false;
      if (!istLeitung(t) && KATALOG[t].kategorie !== 'deko' && this.istStrasse(fx, fy)) return false;
    }
    return true;
  }

  kosten(t: TypId, stufe = 1): { taler?: number; eur?: number } {
    const D = KATALOG[t];
    if (D.kosten_taler) return { taler: D.kosten_taler[Math.min(this.anzahl('huette'), D.kosten_taler.length - 1)] };
    const k = D.kosten_eur as number[];
    return { eur: k[Math.min(stufe - 1, k.length - 1)] };
  }

  private bezahlen(c: { taler?: number; eur?: number }): Ergebnis {
    if (c.taler != null) {
      if (this.stand.taler < c.taler) return this.nein('Zu wenig Dorftaler');
      this.stand.taler -= c.taler;
      return ok();
    }
    const eur = c.eur as number;
    if (this.stand.geld_eur < eur) return this.nein(`Es fehlen ${Math.floor(eur - this.stand.geld_eur).toLocaleString('de-DE')} €`);
    this.stand.geld_eur -= eur;
    return ok();
  }
  private nein(text: string): Ergebnis { this.ereignisse.push({ art: 'hinweis', text }); return { ok: false, hinweis: text }; }
  private hinweis(text: string): void { this.ereignisse.push({ art: 'hinweis', text }); }
  /** A79: Name und Dorfname beim Spielstart; leere Eingaben behalten den bisherigen Wert. */
  namenSetzen(spieler: string, dorf: string): void {
    const sp = spieler.trim().slice(0, 20), d = dorf.trim().slice(0, 24);
    if (sp) this.stand.spieler = sp;
    if (d) this.stand.name = d;
    this.stand.namen_gefragt = true;
  }
  /** NR18-D: Die einmalige Start-Meldung ist dran – nach der Begrüßung (Namensfenster zu), noch nie gezeigt und noch kein Haus
   *  mit Übergabestation (wer schon angeschlossen hat, braucht den Tipp nicht; neue Spiele starten ohne Station, NR13). */
  startTippFaellig(): boolean {
    const s = this.stand;
    // NR13: Das Tutorial löst die Start-Meldung ab; wer es überspringt, bekommt sie danach.
    if (s.tutorial || s.namen_gefragt === false || s.start_tipp_gezeigt) return false;
    return !s.objekte.some((o) => KATALOG[o.typ].kategorie === 'haus' && !o.ohne_station);
  }
  /** NR18-D: Text der Start-Meldung und als gezeigt merken; `null`, wenn sie nicht (mehr) dran ist. */
  startTippNehmen(): string | null {
    if (!this.startTippFaellig()) return null;
    this.stand.start_tipp_gezeigt = true;
    return START_TIPP;
  }
  /** Name des Spielers für die Ansprache der Helfer (A51). */
  get spielerName(): string { return this.stand.spieler?.trim() || 'Chef'; }
  private sagt(figur: string, text: string): void { this.ereignisse.push({ art: 'sprecher', figur, text }); }
  /** Lieferzeit des Materials in Spieltagen (1 Spieljahr = 365 Tage); mindestens 1. Wochen wären zu grob (Review: immer „1 Woche“). */
  liefertage(dauer_ms = KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor * 1000): number { return Math.max(1, Math.round(dauer_ms / SPIELTAG_MS)); }
  private braucheMonteur(): boolean {
    if (this.beschaeftigt() >= this.monteure()) { this.nein('Alle Monteure sind beschäftigt'); return false; }
    return true;
  }
  private foerderungNutzen(t: TypId): boolean {
    const g = this.stand.antraege[t];
    if (!g) return false;
    delete this.stand.antraege[t];
    if (g.stand === 'wartet') { this.hinweis('Vorzeitiger Baubeginn – der Förderantrag ist verfallen'); return false; }
    return true;
  }
  private neuerBau(art: Bau['art'], dauer_s: number, faktor: number = KONSTANTEN.bauzeit_faktor): Bau {
    const j = this.uhr();
    return { art, start_ms: j, ende_ms: j + dauer_s * faktor * 1000 };
  }
  aenderung(): void { this.neuBerechnen(); }

  // ---------- Aktionen ----------
  platzieren(t: TypId, x: number, y: number): Ergebnis {
    const D = KATALOG[t];
    const sperre = this.gesperrt(t);
    if (sperre) return sperre;
    if (!this.kannPlatzieren(t, x, y)) return this.nein('Hier ist kein Platz');
    if (istLeitung(t) && this.istFluss(x, y) && !freigeschaltet(this.stand, 'spuelbohrung')) return this.nein(this.flussGesperrt());
    if (istLeitung(t)) {
      if (this.leitungsanzahl() >= this.grenze(t))
        return this.nein(this.grenze(t) ? 'Mehr Leitungen ab der nächsten Heizzentralen-Stufe' : `${D.name} ab Heizzentrale Stufe 2`);
    } else if (this.anzahl(t) >= this.grenze(t)) return this.nein(`Mehr ${D.name} ab der nächsten Heizzentralen-Stufe`);
    if (istLeitung(t)) {
      // A41: Leitungen entstehen nur in einem Bauabschnitt, bezahlt wird erst bei der Materialbestellung.
      if (this.stand.abschnitt?.phase !== 'offen') return this.nein(this.stand.abschnitt ? 'Der Bauabschnitt ist gerade nicht zum Einzeichnen offen' : `Leitungen entstehen in Bauabschnitten – erst mit ${ABSCHNITT_HELFER.planung} einen Abschnitt planen`);
      const id = this.stand.naechste_id++;
      const trassenUebergaenge = Object.fromEntries(this.stand.objekte
        .filter((o) => !o.geplant && istLeitung(o.typ) && Math.abs(o.x - x) + Math.abs(o.y - y) === 1)
        .map((o) => [o.id, false]));
      this.stand.objekte.push({ id, typ: t, x, y, stufe: 1, bau: null, kasse_eur: 0, geplant: true, _pop: this.uhr(),
        ...(Object.keys(trassenUebergaenge).length ? { trassenUebergaenge } : {}) });
      this.schritt('leitung_gezeichnet', id);
      this.erreichtAbgleichen();
      return ok();
    }
    if (!D.sofort && !this.braucheMonteur()) return { ok: false };
    const c = this.kosten(t, 1);
    const b = this.bezahlen(c);
    if (!b.ok) return b;
    const o: Objekt = {
      id: this.stand.naechste_id++, typ: t, x, y, stufe: 1,
      bau: D.sofort ? null : this.neuerBau('neu', (D.bauzeit_s as number[])[0]),
      kasse_eur: 0, _pop: this.uhr(),
    };
    if (D.kategorie === 'haus') { o.zufriedenheit_pct = 80; o.ohne_station = true; } // Häuser brauchen eine Übergabestation, um Wärme abzunehmen
    if (D.kategorie === 'deko') this.stand.deko_anzahl++;
    if (istQuelle(t) && this.foerderungNutzen(t)) o.foerderung_eur = c.eur;
    this.stand.objekte.push(o);
    this.neuBerechnen();
    return { ok: true };
  }

  maxStufe(o: Objekt): number { return o.typ === 'hz' ? KONSTANTEN.hoechststufe : Math.min(KONSTANTEN.hoechststufe, this.hzStufe); }

  ausbauen(id: number): Ergebnis {
    const o = this.objekt(id);
    if (!o || !hatStufen(o.typ) || o.bau) return { ok: false };
    const D = KATALOG[o.typ];
    if (o.stufe >= this.maxStufe(o)) return this.nein(o.typ === 'hz' ? 'Höchste Stufe' : 'Erst die Heizzentrale ausbauen');
    if (o.typ === 'hz' && !this.hzZiele().every((z) => z.erreicht)) return this.nein('Die Ziele für die nächste Stufe sind noch nicht erreicht');
    // Alle vier 3×3-Flächen enthalten den bisherigen 2×2-Grundriss.
    let ausbauplatz: { x: number; y: number } | undefined;
    if (o.typ === 'hz' && o.stufe === 2) {
      ausbauplatz = [
        { x: o.x, y: o.y }, { x: o.x, y: o.y - 1 },
        { x: o.x - 1, y: o.y }, { x: o.x - 1, y: o.y - 1 },
      ].find(({ x, y }) => this.kannPlatzieren('hz', x, y, o.id, 3));
      if (!ausbauplatz) return this.nein('Rund um die Heizzentrale ist keine freie 3×3-Fläche für den Ausbau');
    }
    if (!this.braucheMonteur()) return { ok: false };
    const c = { eur: (D.kosten_eur as number[])[o.stufe] };
    const b = this.bezahlen(c);
    if (!b.ok) return b;
    if (istQuelle(o.typ) && this.foerderungNutzen(o.typ)) o.foerderung_eur = c.eur;
    if (ausbauplatz) {
      o.x = ausbauplatz.x;
      o.y = ausbauplatz.y;
    }
    o.bau = this.neuerBau('ausbau', (D.bauzeit_s as number[])[o.stufe]);
    this.neuBerechnen();
    return ok();
  }

  /** Quelle ins Heizhaus einbauen. gratis = Startquelle. */
  innenEinbauen(t: TypId, gratis = false): Ergebnis {
    const D = KATALOG[t];
    if (this.stand.innen.length >= (KATALOG.hz.plaetze as number[])[this.hzStufe - 1])
      return this.nein('Kein Platz mehr im Heizhaus – erst die Heizzentrale ausbauen');
    if (!gratis) { const sperre = this.gesperrt(t); if (sperre) return sperre; }
    if (!gratis) {
      if (!this.braucheMonteur()) return { ok: false };
      const b = this.bezahlen({ eur: (D.kosten_eur as number[])[0] });
      if (!b.ok) return b;
    }
    const k: InnenQuelle = { typ: t, stufe: 1, bau: gratis ? null : this.neuerBau('neu', (D.bauzeit_s as number[])[0]) };
    if (!gratis && this.foerderungNutzen(t)) k.foerderung_eur = (D.kosten_eur as number[])[0];
    this.stand.innen.push(k);
    this.neuBerechnen();
    return ok();
  }

  ersteQuelleWaehlen(t: TypId): Ergebnis {
    this.stand.innen = [];
    const r = this.innenEinbauen(t, true);
    if (!r.ok) return r;
    this.stand.quelle_gewaehlt = true;
    this.ereignisse.push({ art: 'funken', objekt_id: 'heizzentrale' });
    this.hz._pop = this.uhr();
    this.hinweis(`${KATALOG[t].name} läuft!`);
    return ok();
  }

  innenAusbauen(i: number): Ergebnis {
    const k = this.stand.innen[i];
    if (!k || k.bau || k.stufe >= KONSTANTEN.hoechststufe) return { ok: false };
    const D = KATALOG[k.typ];
    if (k.stufe >= this.hzStufe) return this.nein(`Stufe ${k.stufe + 1} passt erst in die Heizzentrale Stufe ${k.stufe + 1}`);
    if (!this.braucheMonteur()) return { ok: false };
    const b = this.bezahlen({ eur: (D.kosten_eur as number[])[k.stufe] });
    if (!b.ok) return b;
    if (this.foerderungNutzen(k.typ)) k.foerderung_eur = (D.kosten_eur as number[])[k.stufe];
    k.bau = this.neuerBau('ausbau', (D.bauzeit_s as number[])[k.stufe]);
    this.neuBerechnen();
    return ok();
  }

  beschleunigungskosten_taler(bau: Bau): number {
    return Math.max(1, Math.ceil((bau.ende_ms - this.uhr()) / 1000 / KONSTANTEN.beschleunigen_s_je_taler));
  }
  /** „Gefällt mir“ für ein Nachbardorf – ändert nur den eigenen Spielstand, einmal je Dorf. */
  moegen(name: string): boolean {
    if (this.stand.gemocht[name]) return false;
    this.stand.gemocht[name] = true;
    return true;
  }

  beschleunigen(bau: Bau | null | undefined): Ergebnis {
    if (!bau) return { ok: false };
    const c = this.beschleunigungskosten_taler(bau);
    if (this.stand.taler < c) return this.nein('Zu wenig Dorftaler');
    this.stand.taler -= c;
    bau.ende_ms = this.uhr();
    this.bis(this.uhr());
    return ok();
  }

  hindernisRaeumen(id: number): Ergebnis {
    const o = this.objekt(id);
    if (!o || KATALOG[o.typ].kategorie !== 'hindernis') return { ok: false };
    const D = KATALOG[o.typ];
    const b = this.bezahlen({ eur: D.raeumen_eur });
    if (!b.ok) return b;
    this.ereignisse.push({ art: 'funken', objekt_id: o.id, farbe: '#c9a76a' });
    this.stand.objekte = this.stand.objekte.filter((a) => a !== o);
    this.stand.taler += D.raeumen_taler as number;
    this.ereignisse.push({ art: 'schwebtext', x: o.x, y: o.y, text: `+${D.raeumen_taler} Taler`, farbe: '#d9c2ff' });
    this.stand.erledigt.obs = true;
    this.neuBerechnen();
    return ok();
  }

  entfernen(id: number): Ergebnis {
    const o = this.objekt(id);
    if (!o || o.landschaft || !(istLeitung(o.typ) || KATALOG[o.typ].kategorie === 'deko')) return { ok: false };
    if (o.geplant && (this.stand.abschnitt?.phase === 'bau' || this.stand.abschnitt?.phase === 'planung')) return this.nein('Der Abschnitt ist schon bestellt oder in Planung – hier lässt sich nichts mehr entfernen');
    // W5: Der Ersatz ist schon bezahlt und unterwegs; ohne die Leitung hätte er keinen Platz mehr.
    if (o.ersatz && this.stand.abschnitt?.phase === 'bau') return this.nein(ERSATZ_IM_BAU);
    // A30: 50 % des alten Typs zurück; ein geplanter Ersatz ist noch nicht bezahlt und verfällt mit der Leitung.
    if (istLeitung(o.typ) && !o.geplant) this.stand.geld_eur += this.rueckkauf_eur(o.typ, 1);
    this.stand.objekte = this.stand.objekte.filter((a) => a !== o);
    this.neuBerechnen();
    if (istLeitung(o.typ)) {
      const probe = this.probeNetz();
      this.erreichtAbgleichen(probe);
      if (this.stand.abschnitt?.phase === 'bestellen') this.warnlisteFuellen(probe);
    }
    return ok();
  }

  /** A47: Eine geplante (noch nicht bestellte) Leitung auf dem Feld wieder wegnehmen – kostenlos, nur im offenen Bauabschnitt. */
  geplanteLeitungEntfernen(x: number, y: number): Ergebnis {
    if (this.stand.abschnitt?.phase !== 'offen') return { ok: false };
    const o = this.stand.objekte.find((a) => a.geplant && a.x === x && a.y === y);
    if (o) {
      this.stand.objekte = this.stand.objekte.filter((a) => a !== o);
      this.erreichtAbgleichen();
      return ok();
    }
    // NR18: Ohne eingezeichnete Leitung nimmt der Radierer den geplanten Ersatz der gebauten Leitung zurück.
    const gebaut = this.stand.objekte.find((a) => a.ersatz && a.x === x && a.y === y);
    if (!gebaut) return { ok: false };
    delete gebaut.ersatz;
    return ok();
  }
  /** A47: Zuletzt eingezeichnete Leitung des offenen Bauabschnitts zurücknehmen. */
  letzteLeitungZurueck(): Ergebnis {
    if (this.stand.abschnitt?.phase !== 'offen') return { ok: false };
    // Leitungs-Ids und Ersatz-Nummern kommen beide aus naechste_id: die größere Zahl ist das zuletzt Gezeichnete.
    let letzte: Objekt | undefined, nr = -Infinity;
    for (const a of this.stand.objekte) {
      const n = a.geplant ? a.id : a.ersatz ? a.ersatz.nr : -Infinity;
      if (n > nr) { nr = n; letzte = a; }
    }
    if (!letzte) return { ok: false };
    if (letzte.geplant) {
      const weg = letzte;
      this.stand.objekte = this.stand.objekte.filter((a) => a !== weg);
      this.erreichtAbgleichen();
    } else delete letzte.ersatz;
    return ok();
  }
  /** A47: Häuser und Großabnehmer, die an eine geplante Leitung des Bauabschnitts grenzen und noch an keiner gebauten Leitung hängen: Das sind die Hausanschlüsse dieses Abschnitts. */
  abschnittAnschluesse(): Objekt[] {
    const N_ = N, bau = new Set(this.stand.objekte.filter((o) => istLeitung(o.typ) && !o.geplant).map((o) => o.y * N_ + o.x));
    const plan = new Set(this.stand.objekte.filter((o) => o.geplant).map((o) => o.y * N_ + o.x));
    // A57: Nur ein Leitungsende am Haus ist ein Hausanschluss – eine vorbeilaufende Leitung nicht.
    const leitungsEnde = (f: number): boolean => leitungsNachbarn(f % N_, Math.floor(f / N_), (n) => plan.has(n) || bau.has(n)) <= 1;
    return this.stand.objekte.filter((h) => {
      if (!['haus', 'gross'].includes(KATALOG[h.typ].kategorie)) return false;
      const g = groesse(h);
      let anPlan = false, anBau = false;
      for (let dy = -1; dy <= g; dy++) for (let dx = -1; dx <= g; dx++) {
        if ((dx === -1 || dx === g) === (dy === -1 || dy === g)) continue; // nur die vier Seiten, keine Ecken/Innenfelder
        const f = (h.y + dy) * N_ + h.x + dx;
        if (plan.has(f) && leitungsEnde(f)) anPlan = true;
        if (bau.has(f)) anBau = true;
      }
      return anPlan && !anBau;
    });
  }
  /** A92: Hat das Haus im laufenden Bauabschnitt schon einen geplanten Hausanschluss? Dann ist „Hausanschluss ziehen“ erledigt. */
  hausanschlussGeplant(hausId: number): boolean { return this.abschnittAnschluesse().some((h) => h.id === hausId); }
  /** A32: Übergabestation für ein Haus/einen Großabnehmer kaufen (auch größere, z. B. als Reserve für einen Anbau). */
  stationKaufen(id: number, stationId: string): Ergebnis {
    const o = this.objekt(id), st = stationHolen(stationId);
    if (!o || !st || !(o.ohne_station || o.station) || o.bau) return { ok: false };
    const puffer = istPufferStation(st);
    if (puffer && KATALOG[o.typ].kategorie !== 'haus') return { ok: false };
    // AE-NR13-7: Im Tutorial nimmt jedes Haus die Puffer-Station; der Kern setzt das selbst durch, nicht erst die Oberfläche.
    if (!puffer && this.stand.tutorial && KATALOG[o.typ].kategorie === 'haus') return this.nein(WANDSTATION_TUTORIAL);
    // NR19: Den Speicher gibt es nur beim Anschluss; ein Haus mit Wandstation ohne Puffer behält seine Bauart.
    if (puffer && o.station && !o.hauspuffer) return this.nein('Den Puffer gibt es nur beim Anschluss. Für dieses Haus geht nur eine Wandstation.');
    // NR19 (Review P6, Weg a): Der Speicher gehört zur Puffer-Station. Eine Wandstation statt ihrer gibt es erst, wenn keine
    // Puffer-Station mehr reicht – dann fällt der Puffer mit der alten Station weg (sonst wirkte ein zurückgekaufter Speicher weiter).
    const pufferWeg = !puffer && istPufferStation(stationHolen(o.station));
    if (pufferWeg && pufferStationReicht(o)) return this.nein('Dieses Haus hat eine Puffer-Station. Tausch nur gegen eine größere Puffer-Station.');
    const p = { ...o, hauspuffer: !pufferWeg && (o.hauspuffer || puffer) };
    // A88/NR19: Ohne freie Stationswahl gibt es je Bauart nur die kleinste passende Station (so bleibt jedes Haus versorgbar).
    const kleinste = puffer
      ? passendePufferStation(bedarfKw({ ...o, hauspuffer: true }), bedarfKw({ ...o, hauspuffer: false }))?.id
      : passendeStation(bedarfKw(p)).id;
    if (st.id !== kleinste) { const sperre = this.gesperrt('stationstypen'); if (sperre) return sperre; }
    if (!stationReicht(st, p)) {
      const netz_kw = bedarfKw(p), runde = (n: number): number => Math.round(n * 10) / 10;
      // Ohne Spitzenangabe prüft stationReicht nur die Netzleistung – reicht die, fehlt es an der Spitze im Haus. Kein direkter
      // Vergleich leistung_kw ≥ Bedarf hier: Architekturregel F3 erlaubt solche Vergleiche nur in netz.ts/katalog.ts.
      const { spitze_kw: _spitze, ...nurNetz } = st as Station & { spitze_kw?: number };
      if (puffer && stationReicht(nurNetz, p)) return this.nein(`${st.name} gibt im Haus nur ${st.spitze_kw} kW ab, das Haus braucht in der Spitze ${runde(bedarfKw({ ...p, hauspuffer: false }))} kW`);
      return this.nein(`${st.name} schafft nur ${st.leistung_kw} kW, das Gebäude braucht ${runde(netz_kw)} kW`);
    }
    const alt = stationHolen(o.station);
    if (alt && alt.leistung_kw >= st.leistung_kw) return this.nein('Es steht schon eine gleich große oder größere Station');
    const b = this.bezahlen({ eur: this.stationspreis_eur(o, st) });
    if (!b.ok) return b;
    const warOhne = !!o.ohne_station;
    delete o.interessent;
    o.station = st.id; delete o.ohne_station; o._pop = this.uhr();
    // NR19: vor neuBerechnen und vor der NR18-Warnprüfung, damit beide mit 2.000 Volllaststunden rechnen
    if (puffer) o.hauspuffer = true;
    if (pufferWeg) delete o.hauspuffer;
    this.ereignisse.push({ art: 'funken', objekt_id: o.id });
    this.neuBerechnen();
    this.schritt('station_gekauft', o.id);
    // AE-NR18-1: Die Prüfung kommt nach dem Kauf und warnt nur. Eine größere Station ändert die Last nicht, nur ein neuer Kunde.
    const bestellen = this.stand.abschnitt?.phase === 'bestellen';
    if (!warOhne && !bestellen) return ok();
    const nachher = this.probeNetz();
    let hinweis: string | undefined;
    if (warOhne) {
      const vorher = this.probeNetz((a) => (a === o ? { ...a, station: undefined, ohne_station: true } : a));
      const neu = [...nachher.kalt].filter(([id, grund]) => grund === 'leitung' && vorher.kalt.get(id) !== 'leitung').map(([id]) => id);
      if (neu.length) {
        const stuecke = this.engstellenIn(nachher, neu);
        hinweis = stuecke.length ? this.engstelleSatz(stuecke[0]) : ENGPASS_ERSATZ;
        this.hinweis(hinweis);
        this.ereignisse.push({ art: 'engstelle', felder: stuecke.flatMap((e) => e.felder) });
      }
    }
    if (bestellen) this.warnlisteFuellen(nachher);
    return hinweis === undefined ? ok() : { ok: true, hinweis };
  }

  /** Rückkaufpreis (50 %) einer Anlage, die bis zur Stufe `stufe` ausgebaut wurde (A30/A31). */
  rueckkauf_eur(t: TypId, stufe: number): number {
    const k = KATALOG[t].kosten_eur ?? [];
    return Math.round(k.slice(0, stufe).reduce((a, x) => a + x, 0) * KONSTANTEN.rueckkauf_anteil);
  }

  /** Außenanlage (Puffer, PV, Solarthermie, Erdsonde …) verkaufen: 50 % des Einkaufspreises. */
  verkaufen(id: number): Ergebnis {
    const o = this.objekt(id);
    if (!o || KATALOG[o.typ].kategorie !== 'waerme' || o.bau) return { ok: false };
    const betrag = this.rueckkauf_eur(o.typ, o.stufe);
    this.stand.geld_eur += betrag;
    this.stand.objekte = this.stand.objekte.filter((a) => a !== o);
    this.hinweis(`${KATALOG[o.typ].name} verkauft: +${betrag.toLocaleString('de-DE')} €`);
    this.neuBerechnen();
    return ok();
  }

  /** Quelle im Heizhaus (z. B. zweiten Kessel) verkaufen: 50 % des Einkaufspreises; die letzte Quelle bleibt. */
  innenVerkaufen(i: number): Ergebnis {
    const k = this.stand.innen[i];
    if (!k || k.bau || this.stand.innen.length <= 1) return this.nein('Die letzte Wärmequelle kann nicht verkauft werden');
    const betrag = this.rueckkauf_eur(k.typ, k.stufe);
    this.stand.geld_eur += betrag;
    this.stand.innen.splice(i, 1);
    this.hinweis(`${KATALOG[k.typ].name} verkauft: +${betrag.toLocaleString('de-DE')} €`);
    this.neuBerechnen();
    return ok();
  }

  verschieben(id: number, x: number, y: number): Ergebnis {
    const o = this.objekt(id);
    if (!o) return { ok: false };
    if (['gross', 'hindernis', 'haus'].includes(KATALOG[o.typ].kategorie) || o.bestand) return this.nein('Gebäude stehen fest und lassen sich nicht verschieben');
    if (!this.kannPlatzieren(o.typ, x, y, id, groesse(o))) return this.nein('Hier ist kein Platz');
    o.x = x; o.y = y; o._pop = this.uhr();
    this.neuBerechnen();
    return ok();
  }

  // ---------- Bauabschnitte (A41) ----------
  get abschnitt() { return this.stand.abschnitt; }
  /** Liegt das Feld auf der öffentlichen Straße des Ortes? */
  istStrasse(x: number, y: number): boolean {
    this.strassenSet ??= new Set(ortHolen(this.stand.ort).strassen.map(([sx, sy]) => sy * N + sx));
    return this.strassenSet.has(y * N + x);
  }
  istFluss(x: number, y: number): boolean {
    this.flussSet ??= new Set(ortHolen(this.stand.ort).fluss.map(([sx, sy]) => sy * N + sx));
    return this.flussSet.has(y * N + x);
  }
  /** A45: Geplante Leitungen abseits der Straße, für die noch keine Gestattung geklärt ist (Flussfelder zählen zur Spülbohrung). */
  gestattungsFelder(): number[] {
    if (!freigeschaltet(this.stand, 'gestattung')) return []; // A88/F1: vor der Freischaltung kostenlos
    const geklaert = new Set(this.stand.gestattungen ?? []);
    return this.stand.objekte.filter((o) => o.geplant && !this.istStrasse(o.x, o.y) && !this.istFluss(o.x, o.y) && !geklaert.has(o.y * N + o.x)).map((o) => o.y * N + o.x);
  }
  /** A46: Geplante Leitungsfelder im Fluss: dort ist eine Spülbohrung nötig. */
  bohrungsFelder(): number[] { return this.stand.objekte.filter((o) => o.geplant && this.istFluss(o.x, o.y)).map((o) => o.y * N + o.x); }
  bohrung_eur(): number { return this.bohrungsFelder().length * KONSTANTEN.bohrung_eur_je_feld; }
  gestattung_eur(): number { return this.gestattungsFelder().length * KONSTANTEN.gestattung_eur_je_feld; }
  /** Summe der Leitungskosten des Abschnitts in € (Material, Gestattungen, Spülbohrung, Vorsehungen, Anbohrungen). */
  abschnittKosten_eur(): number {
    return this.stand.objekte.filter((o) => o.geplant).reduce((a, o) => a + (KATALOG[o.typ].kosten_eur as number[])[0], 0) + this.gestattung_eur() + this.bohrung_eur()
      + this.vorsehungen_eur() + this.anbohrung_eur() + this.ersatz_eur();
  }
  /** NR18 (E1): je Ersatz Neupreis minus 50 % des alten Typs, im Fluss dazu die Spülbohrung; eine Gestattung fällt nicht an. */
  ersatz_eur(): number {
    return this.stand.objekte.reduce((summe, o) => !o.ersatz ? summe
      : summe + (KATALOG[o.ersatz.typ].kosten_eur as number[])[0] - this.rueckkauf_eur(o.typ, 1) + (this.istFluss(o.x, o.y) ? KONSTANTEN.bohrung_eur_je_feld : 0), 0);
  }
  /** A69: geplante Vorsehungen (T-Stück mit verschlossenem Abgang) im Abschnitt. */
  vorsehungen_eur(): number { return this.stand.objekte.filter((o) => o.geplant && o.vorsehung).length * KONSTANTEN.vorsehung_eur; }
  anbohrung_eur(): number { return this.anbohrungsFelder().length * KONSTANTEN.anbohrung_eur; }
  /** Gebaute Leitungsnachbarn eines Feldes (die Heizzentrale zählt mit). */
  private gebauteNachbarn(rohr: Objekt): number {
    const bel = belegungskarte(this.stand.objekte);
    return leitungsNachbarn(rohr.x, rohr.y, (n) => {
      const o = this.objekt(bel[n]);
      return !!o && (o.typ === 'hz' || (istLeitung(o.typ) && !o.geplant && trassenUebergang(rohr, o) !== false));
    });
  }
  /** A69: Muss hier an eine laufende Leitung angebohrt werden? Ja, wenn sie durchläuft (kein Leitungsende) und keine Vorsehung hat. */
  private brauchtAnbohrung(o: Objekt): boolean {
    // A88/F1: vor der Freischaltung der Vorsehung kostet Andocken nichts
    return freigeschaltet(this.stand, 'vorsehung') && this.laeuftDurch(o);
  }
  /** Gebaute Leitung, die hier durchläuft (kein Leitungsende) und keine Vorsehung hat. */
  private laeuftDurch(o: Objekt): boolean {
    return istLeitung(o.typ) && !o.geplant && !o.vorsehung && this.gebauteNachbarn(o) >= 2;
  }
  /** Benachbarte Rohrenden mit einem manuell schaltbaren Übergang. */
  trassenNachbarn(o: Objekt): { nachbar: Objekt; verbunden: boolean; kosten: number }[] {
    if (!istLeitung(o.typ)) return [];
    const phase = this.stand.abschnitt?.phase;
    if (phase && phase !== 'offen') return [];
    return this.stand.objekte.flatMap((nachbar) => {
      if (!istLeitung(nachbar.typ) || Math.abs(o.x - nachbar.x) + Math.abs(o.y - nachbar.y) !== 1) return [];
      const verbunden = trassenUebergang(o, nachbar);
      const geplant = !!(o.geplant || nachbar.geplant);
      if (verbunden === undefined || (verbunden && !geplant)) return [];
      const kosten = geplant ? 0 : [o, nachbar].filter((rohr) => this.brauchtAnbohrung(rohr)).length * KONSTANTEN.anbohrung_eur;
      return [{ nachbar, verbunden, kosten }];
    });
  }

  trassenUmschalten(id: number, nachbarId: number): Ergebnis {
    const o = this.objekt(id);
    const uebergang = o && this.trassenNachbarn(o).find(({ nachbar }) => nachbar.id === nachbarId);
    if (!o || !uebergang) return { ok: false };
    const { nachbar, verbunden, kosten } = uebergang;
    if (kosten) {
      const bezahlt = this.bezahlen({ eur: kosten });
      if (!bezahlt.ok) return bezahlt;
    }
    if (o.trassenUebergaenge?.[nachbarId] !== undefined) o.trassenUebergaenge[nachbarId] = !verbunden;
    else nachbar.trassenUebergaenge![id] = !verbunden;
    if (!o.geplant && !nachbar.geplant) {
      this.vorsehungenVerbrauchen();
      this.neuBerechnen();
    }
    this.erreichtAbgleichen();
    return ok();
  }

  /** A69: Gebaute, durchlaufende Leitungen ohne Vorsehung, an die eine geplante Leitung des Abschnitts andockt. */
  anbohrungsFelder(): number[] {
    const bel = belegungskarte(this.stand.objekte), felder = new Set<number>();
    for (const g of this.stand.objekte) {
      if (!g.geplant) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = g.x + dx, ny = g.y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const o = this.objekt(bel[ny * N + nx]);
        if (o && trassenUebergang(g, o) !== false && this.brauchtAnbohrung(o)) felder.add(ny * N + nx);
      }
    }
    return [...felder];
  }
  /** A69: Im offenen Bauabschnitt auf eine geplante Leitung ein T-Stück mit Vorsehung setzen oder wieder wegnehmen. */
  vorsehungUmschalten(id: number): Ergebnis {
    const o = this.objekt(id);
    if (!o || !istLeitung(o.typ)) return { ok: false };
    if (!o.geplant || this.stand.abschnitt?.phase !== 'offen') return this.nein('Eine Vorsehung kommt beim Bau der Leitung mit hinein – zeichne die Leitung im offenen Bauabschnitt');
    if (o.vorsehung) delete o.vorsehung;
    else { const sperre = this.gesperrt('vorsehung'); if (sperre) return sperre; o.vorsehung = true; } // Ausschalten bleibt immer erlaubt
    o._pop = this.uhr();
    return ok();
  }
  abschnittLeitungen(): number { return this.stand.objekte.filter((o) => o.geplant || o.ersatz).length; }
  /** NR18: gebaute Leitung im offenen Bauabschnitt durch eine dickere ersetzen (bezahlt mit der Materialbestellung, getauscht
   *  beim Bauende). Ein schon geplanter Ersatz wird nur durch einen noch dickeren abgelöst. Keine Flusssperre: die Querung gibt es schon. */
  ersatzPlanen(id: number, neu: TypId): Ergebnis {
    const o = this.objekt(id);
    if (!o || o.geplant || !istLeitung(o.typ) || !istLeitung(neu)) return { ok: false };
    if (this.stand.abschnitt?.phase !== 'offen') return { ok: false, hinweis: ERSATZ_NUR_IM_ABSCHNITT };
    // Dünner oder gleich ist kein Ersatz; die Zeichenleiste überspringt solche Felder still.
    if ((KATALOG[neu].kapazitaet_kw as number) <= (KATALOG[o.ersatz?.typ ?? o.typ].kapazitaet_kw as number)) return { ok: false };
    const sperre = this.sperrText(neu);
    if (sperre) return { ok: false, hinweis: sperre };
    o.ersatz = { typ: neu, nr: this.stand.naechste_id++ };
    this.schritt('leitung_gezeichnet', o.id);
    return ok();
  }
  /** NR18: eingezeichnete Leitung im offenen Bauabschnitt bekommt einen anderen Typ (die Leitungsgrenze ändert sich nicht). */
  geplanteLeitungTyp(id: number, neu: TypId): Ergebnis {
    const o = this.objekt(id);
    if (!o || !o.geplant || !istLeitung(neu) || o.typ === neu || this.stand.abschnitt?.phase !== 'offen') return { ok: false };
    const sperre = this.sperrText(neu);
    if (sperre) return { ok: false, hinweis: sperre };
    o.typ = neu; o._pop = this.uhr();
    this.schritt('leitung_gezeichnet', o.id);
    return ok();
  }
  /** Neuen Bauabschnitt planen lassen (Philipp). */
  abschnittPlanen(): Ergebnis {
    if (this.stand.abschnitt) return this.nein('Es läuft schon ein Bauabschnitt');
    if (!this.stand.quelle_gewaehlt) return this.nein('Erst eine Wärmequelle wählen');
    const b = this.bezahlen({ eur: KONSTANTEN.abschnitt_planung_eur });
    if (!b.ok) return b;
    // NR13: Im Tutorial dauert die Planung feste 10 s statt 30 s × Spieltempo (erster Abschnitt in ca. 1 Minute).
    const bau = this.stand.tutorial ? this.neuerBau('neu', KONSTANTEN.tutorial_planung_s, 1) : this.neuerBau('neu', KONSTANTEN.abschnitt_planung_s);
    this.stand.abschnitt = { phase: 'planung', bau };
    this.sagt(ABSCHNITT_HELFER.planung, `Alles klar, ${this.spielerName}, ich kümmere mich um die Planung.`);
    this.schritt('abschnitt_geplant');
    return ok();
  }
  /** Einzeichnen beenden; als Nächstes wird Material bestellt. */
  abschnittAbschliessen(): Ergebnis {
    const a = this.stand.abschnitt;
    if (a?.phase !== 'offen') return { ok: false };
    if (!this.abschnittLeitungen()) return this.nein('Zeichne erst Leitungen in den Abschnitt');
    a.phase = 'bestellen';
    // AE-NR18-1: warnen, nicht sperren – bestellt werden darf trotzdem.
    const stuecke = this.warnlisteFuellen(this.probeNetz());
    this.schritt('abschnitt_abgeschlossen');
    if (!stuecke.length) return ok();
    const hinweis = stuecke.length > 1 ? mehrereStellenText(stuecke.length) : this.warnliste[0];
    this.hinweis(hinweis);
    this.ereignisse.push({ art: 'engstelle', felder: stuecke.flatMap((e) => e.felder) });
    return { ok: true, hinweis };
  }
  /** Zurück zum Einzeichnen. */
  abschnittWiederOeffnen(): Ergebnis {
    const a = this.stand.abschnitt;
    if (a?.phase !== 'bestellen') return { ok: false };
    a.phase = 'offen';
    this.warnliste = [];
    return ok();
  }
  /** Abschnitt verwerfen: alle eingezeichneten Leitungen verschwinden, die Planungsgebühr ist weg. */
  abschnittVerwerfen(): Ergebnis {
    const a = this.stand.abschnitt;
    if (!a || a.phase === 'planung' || a.phase === 'bau') return { ok: false };
    this.stand.objekte = this.stand.objekte.filter((o) => !o.geplant);
    for (const o of this.stand.objekte) delete o.ersatz;
    delete this.stand.abschnitt;
    this.warnliste = [];
    this.neuBerechnen();
    this.erreichtAbgleichen();
    return ok();
  }
  /** Material bestellen (Laura): bezahlt die Leitungen, danach beginnt die Wartezeit bis zum Bau. */
  materialBestellen(): Ergebnis {
    const a = this.stand.abschnitt;
    if (a?.phase !== 'bestellen') return { ok: false };
    const kost = this.abschnittKosten_eur();
    const b = this.bezahlen({ eur: kost });
    if (!b.ok) return b;
    a.material_eur = kost;
    this.stand.gestattungen = [...new Set([...(this.stand.gestattungen ?? []), ...this.gestattungsFelder()])];
    a.phase = 'bau';
    a.bau = this.stand.tutorial ? this.neuerBau('neu', KONSTANTEN.tutorial_bau_s, 1) : this.neuerBau('neu', KONSTANTEN.abschnitt_bau_s);
    this.warnliste = [];
    // Laura nennt die tatsächliche Wartezeit (im Tutorial 20 s = 1 Tag), nicht die normale.
    const t = this.liefertage(a.bau.ende_ms - a.bau.start_ms);
    this.sagt(ABSCHNITT_HELFER.material, `Hey ${this.spielerName}, dein Material ist bestellt. Lieferzeit: ${tageText(t)}.`);
    this.schritt('material_bestellt');
    return ok();
  }

  /** A69: Nach dem Bau ist eine Vorsehung belegt, wenn an ihr ein Abzweig hängt (drei oder mehr Leitungsnachbarn, Heizzentrale zählt mit).
   *  Erst bei Bauende, damit sie während der Bauzeit weiter als Abzweig zählt (A67); ein bloß verlängertes Leitungsende verbraucht sie nicht. */
  private vorsehungenVerbrauchen(): void {
    for (const o of this.stand.objekte) if (o.vorsehung && !o.geplant && istLeitung(o.typ) && this.gebauteNachbarn(o) >= 3) delete o.vorsehung;
  }
  /** A62: Aufpreis für die Expresslieferung des laufenden Bauabschnitts. */
  expresskosten_eur(): number {
    // Review: Alte Spielstände ohne gemerkten Materialpreis rechnen mit den (noch geplanten) Leitungen des Abschnitts.
    const m = this.stand.abschnitt?.material_eur ?? this.abschnittKosten_eur();
    return Math.max(KONSTANTEN.express_min_eur, Math.round(m * KONSTANTEN.express_anteil));
  }
  /** Restliche Lieferzeit des Bauabschnitts in Spieltagen (mindestens 1). */
  resttage(): number {
    const a = this.stand.abschnitt;
    if (!a?.bau) return 0;
    return Math.max(1, Math.round(Math.max(0, a.bau.ende_ms - this.uhr()) / SPIELTAG_MS));
  }
  /** A62: Expresslieferung (Laura): einmal je Abschnitt, gegen Aufpreis schrumpft die Restlieferzeit deutlich. */
  expressLiefern(): Ergebnis {
    const a = this.stand.abschnitt;
    if (a?.phase !== 'bau' || !a.bau) return { ok: false };
    const sperre = this.gesperrt('express');
    if (sperre) return sperre;
    if (a.express) return this.nein('Express ist schon bestellt');
    if (a.bau.ende_ms - this.uhr() < SPIELTAG_MS) return this.nein('Das Material kommt sowieso in weniger als einem Tag – Express lohnt sich nicht mehr');
    const b = this.bezahlen({ eur: this.expresskosten_eur() });
    if (!b.ok) return b;
    const jetzt = this.uhr(), rest = Math.max(0, a.bau.ende_ms - jetzt);
    a.bau.ende_ms = jetzt + Math.round(rest * KONSTANTEN.express_faktor);
    a.express = true;
    this.sagt(ABSCHNITT_HELFER.material, `Alles klar ${this.spielerName}, ich hab auf Express umgestellt. Dein Material kommt jetzt in ${tageText(this.resttage())}.`);
    return ok();
  }

  /** Bedingungen für einen Großabnehmer-Vertrag. */
  vertragBedingungen(o: Objekt): { ok: boolean; fehlt: string[] } {
    const D = KATALOG[o.typ];
    const ruf = this.ruf_pct(), reserve = this.netz.verfuegbar_kw - this.netz.genutzt_kw;
    const fehlt: string[] = [];
    if (!freigeschaltet(this.stand, o.typ)) fehlt.push(`Heizzentrale Stufe ${abStufe(o.typ)}`);
    if (ruf < (D.min_ruf_pct as number)) fehlt.push(`Ruf ${D.min_ruf_pct} % (jetzt ${Math.round(ruf)} %)`);
    if (D.bedarf_kw && reserve < D.bedarf_kw) fehlt.push(`${D.bedarf_kw} kW freie Leistung (frei: ${Math.max(0, reserve)} kW)`);
    return { ok: fehlt.length === 0, fehlt };
  }
  vertragUnterschreiben(id: number): Ergebnis {
    const o = this.objekt(id);
    if (!o || KATALOG[o.typ].kategorie !== 'gross' || o.zustand === 'vertrag') return { ok: false };
    if (!this.vertragBedingungen(o).ok) return this.nein('Noch nicht alle Bedingungen erfüllt');
    o.zustand = 'vertrag'; o.zufriedenheit_pct = 80; o._pop = this.uhr();
    this.ereignisse.push({ art: 'funken', objekt_id: o.id });
    this.hinweis(`Vertrag mit ${KATALOG[o.typ].name} unterschrieben!`);
    this.neuBerechnen();
    return ok();
  }

  zurueckgewinnen(id: number): Ergebnis {
    const o = this.objekt(id);
    if (!o || !o.gekuendigt) return { ok: false };
    if (PREISSTUFEN[this.stand.preisstufe].zufriedenheit_pct < 50)
      return this.nein('Bei diesem Preis kommt der Kunde nicht zurück – senke den Wärmepreis');
    const b = this.bezahlen({ eur: KONSTANTEN.zurueckgewinnen_eur });
    if (!b.ok) return b;
    o.gekuendigt = false; o.zufriedenheit_pct = 55;
    this.hinweis('Kunde ist zurück!');
    this.neuBerechnen();
    return ok();
  }

  /** A88/F2: Der Kunde fragt nach mehr Wärme; der Bedarf ändert sich erst beim Annehmen. */
  private anfrageStellen(o: Objekt, art: NonNullable<Objekt['anfrage']>): void {
    o.anfrage = art;
    if (this.abwesend) { this.offline_anfragen++; return; }
    const name = KATALOG[o.typ].name, kw = this.anfrageBedarf_kw(o).toFixed(0);
    this.hinweis(art === 'vollversorgung' ? `${name} fragt an: Kamin abschalten und ganz mit Fernwärme heizen? Bedarf dann ${kw} kW` : `${name} baut ein Stockwerk auf und fragt nach mehr Wärme: Bedarf dann ${kw} kW`);
    this.ereignisse.push({ art: 'schwebtext', x: o.x, y: o.y, text: 'fragt an', farbe: '#ffd166' });
  }
  /** A88 (Review P1): Ein unbekannter anfrage-Wert (z. B. aus einem veränderten Spielstand) wird gelöscht, damit Blase und Chip nichts Ungültiges zeigen. */
  private anfragenPruefen(): void {
    for (const o of this.stand.objekte) if (o.anfrage !== undefined && o.anfrage !== 'vollversorgung' && o.anfrage !== 'aufstockung') delete o.anfrage;
  }
  /** A88: Meldung, was mit der neuen Heizzentralen-Stufe frei wird (höchstens vier Namen). */
  private neuFreigeschaltetMelden(stufe: number): void {
    const namen = neuBeiStufe(stufe).map(merkmalName);
    if (namen.length) this.hinweis(`Neu ab Stufe ${stufe}: ${namen.slice(0, 4).join(', ')}${namen.length > 4 ? ' …' : ''}`);
  }
  private flussGesperrt(): string { return `Über den Fluss geht es erst mit Spülbohrung – ${sperrgrund(this.stand, 'spuelbohrung')}`; }
  /** A88/F2: Haus mit gültiger offener Anfrage; ein unbekannter Wert (z. B. aus einem veränderten Spielstand) wird dabei gelöscht. */
  private offeneAnfrage(id: number): Objekt | null {
    const o = this.objekt(id);
    if (!o || KATALOG[o.typ].kategorie !== 'haus' || o.gekuendigt || !o.anfrage) return null;
    if (o.anfrage !== 'vollversorgung' && o.anfrage !== 'aufstockung') { delete o.anfrage; return null; }
    return o;
  }
  /** A88/F2: Anfrage annehmen – kostenlos, ab Stufe 1, ohne Kapazitätsprüfung (der Spieler entscheidet). */
  anfrageAnnehmen(id: number): Ergebnis {
    const o = this.offeneAnfrage(id);
    if (!o) return { ok: false };
    const name = KATALOG[o.typ].name;
    if (o.anfrage === 'vollversorgung') {
      o.vollversorgung = true;
      this.hinweis(`${name} hat den Kamin abgeschaltet und heizt nur noch mit Fernwärme (+${Math.round((KONSTANTEN.vollversorgung_faktor - 1) * 100)} % Verbrauch)`);
      this.ereignisse.push({ art: 'schwebtext', x: o.x, y: o.y, text: 'Kamin aus', farbe: '#7bd88f' });
    } else {
      o.aufgestockt = true;
      this.hinweis(`${name} stockt auf: Bedarf ${bedarfKw(o).toFixed(0)} kW – reicht die Übergabestation noch?`);
      this.ereignisse.push({ art: 'schwebtext', x: o.x, y: o.y, text: 'Aufstockung', farbe: '#ffd166' });
    }
    delete o.anfrage;
    this.neuBerechnen();
    return ok();
  }
  /** A88/F2: Anfrage vorerst ablehnen – ohne Kosten und Strafe; der Zähler beginnt von vorn, die Anfrage kommt nach derselben Wartezeit wieder. */
  anfrageAblehnen(id: number): Ergebnis {
    const o = this.offeneAnfrage(id);
    if (!o) return { ok: false };
    if (o.anfrage === 'vollversorgung') o.voll_s = 0; else o.warm_s = 0;
    delete o.anfrage;
    this.hinweis(`${KATALOG[o.typ].name} wartet und fragt später wieder`);
    return ok();
  }
  /** A88/F2: Anschlussleistung nach dem Annehmen der offenen Anfrage (ohne gültige Anfrage = heutiger Bedarf). */
  anfrageBedarf_kw(o: Objekt): number { return bedarfKw(this.anfrageObjekt(o)); }
  /** NR19: das Gebäude, wie es nach dem Annehmen der offenen Anfrage wäre (ohne gültige Anfrage = unverändert) – für `stationReicht`. */
  anfrageObjekt(o: Objekt): Objekt {
    if (o.anfrage === 'vollversorgung') return { ...o, vollversorgung: true };
    if (o.anfrage === 'aufstockung') return { ...o, aufgestockt: true };
    return o;
  }

  foerderungBeantragen(t: TypId): Ergebnis {
    if (this.stand.antraege[t]) return { ok: false };
    const sperre = this.gesperrt(t);
    if (sperre) return sperre;
    this.stand.antraege[t] = { stand: 'wartet', bewilligt_ms: this.uhr() + KONSTANTEN.foerderdauer_s * 1000 };
    this.stand.erledigt.grant = true;
    this.hinweis('Förderantrag eingereicht');
    return ok();
  }

  preisSetzen(stufe: number): void {
    if (stufe < 0 || stufe >= PREISSTUFEN.length) return;
    this.stand.preisstufe = stufe;
    this.neuBerechnen();
  }

  // ---------- Zeit ----------
  /** Rechnet den Spielstand bis zum Zeitpunkt jetzt_ms fort (auch lange Offline-Zeit, höchstens 7 Tage). */
  bis(jetzt_ms: number): void {
    const s = this.stand;
    this.anfragenPruefen();
    if (jetzt_ms <= s.zuletzt_ms) { this.fertigstellen(jetzt_ms); return; }
    if (jetzt_ms - s.zuletzt_ms > MAX_OFFLINE_S * 1000) s.zuletzt_ms = jetzt_ms - MAX_OFFLINE_S * 1000;
    // A38/A81: Bei längerer Abwesenheit gibt es statt vieler Einzelmeldungen eine Sammelmeldung.
    this.abwesend = jetzt_ms - s.zuletzt_ms > OFFLINE_SCHWELLE_S * 1000;
    // Review A81 W2: Monate vor der gekürzten Abwesenheit werden nicht nachträglich abgerechnet
    s.abrechnung_monat = Math.max(s.abrechnung_monat ?? 0, Math.floor(s.zuletzt_ms / SPIELMONAT_MS));
    const offline = { monate: 0, eur: 0, voll: false };
    while (s.zuletzt_ms < jetzt_ms) {
      // A81: Schritte enden an der Monatsgrenze, damit jeder Monat mit seinem eigenen Verbrauchsanteil gezählt wird
      let ziel = Math.min(jetzt_ms, s.zuletzt_ms + SCHRITT_S * 1000, (Math.floor(s.zuletzt_ms / SPIELMONAT_MS) + 1) * SPIELMONAT_MS);
      const naechster = this.naechstesEreignis_ms();
      if (naechster !== null && naechster > s.zuletzt_ms && naechster < ziel) ziel = naechster;
      this.einnahmen((ziel - s.zuletzt_ms) / 1000);
      s.zuletzt_ms = ziel;
      while (Math.floor(ziel / SPIELMONAT_MS) > (s.abrechnung_monat as number)) {
        const a = this.abrechnen(s.abrechnung_monat as number);
        s.abrechnung_monat = (s.abrechnung_monat as number) + 1;
        offline.monate++; offline.eur += a.eingang_eur; offline.voll ||= a.eingang_eur < a.summe_eur - 0.5;
      }
      this.fertigstellen(ziel);
    }
    if (this.abwesend && offline.monate === 1 && this.offline_text) this.hinweis(this.offline_text);
    this.offline_text = '';
    if (this.abwesend && offline.monate > 1) this.hinweis(`Während du weg warst: ${offline.monate} Monatsabrechnungen, zusammen +${Math.round(offline.eur).toLocaleString('de-DE')} € eingegangen${offline.voll ? ' – Kasse voll, Abrechnungsbüro ausbauen' : ''}`);
    if (this.abwesend && this.offline_anfragen > 0) this.hinweis(`Während du weg warst: ${this.offline_anfragen === 1 ? '1 Kunde fragt' : `${this.offline_anfragen} Kunden fragen`} nach mehr Wärme`);
    this.offline_anfragen = 0;
    this.abwesend = false;
  }
  private naechstesEreignis_ms(): number | null {
    let m: number | null = null;
    const merke = (t: number) => { if (m === null || t < m) m = t; };
    for (const o of this.stand.objekte) { if (o.bau) merke(o.bau.ende_ms); if (o.upgrade_auftrag) merke(o.upgrade_auftrag.ende_ms); }
    for (const k of this.stand.innen) if (k.bau) merke(k.bau.ende_ms);
    if (this.stand.abschnitt?.bau) merke(this.stand.abschnitt.bau.ende_ms);
    for (const g of Object.values(this.stand.antraege)) if (g && g.stand === 'wartet') merke(g.bewilligt_ms);
    return m;
  }
  private fertigstellen(t: number): void {
    const s = this.stand;
    let geaendert = false;
    const fertig = (e: Objekt | InnenQuelle, name: string, istObjekt: boolean) => {
      if (e.bau!.art === 'ausbau') e.stufe++;
      e.bau = null; geaendert = true;
      if (e.foerderung_eur) {
        const zurueck = Math.round(e.foerderung_eur * KONSTANTEN.foerderquote);
        s.geld_eur += zurueck;
        this.hinweis(`${name} fertig · Förderung ausgezahlt: +${zurueck.toLocaleString('de-DE')} €`);
        delete e.foerderung_eur; s.erledigt.funded = true;
      } else this.hinweis(`${name}${hatStufen(e.typ) ? ' Stufe ' + e.stufe : ''} fertig!`);
      if (istObjekt && e.typ === 'hz') this.neuFreigeschaltetMelden(e.stufe);
      const ziel = istObjekt ? (e as Objekt) : this.hz;
      ziel._pop = t;
      this.ereignisse.push({ art: 'funken', objekt_id: istObjekt ? (e as Objekt).id : 'heizzentrale' });
    };
    for (const o of s.objekte) if (o.bau && o.bau.ende_ms <= t) fertig(o, KATALOG[o.typ].name, true);
    for (const k of s.innen) if (k.bau && k.bau.ende_ms <= t) fertig(k, KATALOG[k.typ].name, false);
    const ab = s.abschnitt;
    if (ab?.bau && ab.bau.ende_ms <= t) {
      if (ab.phase === 'planung') { ab.phase = 'offen'; ab.bau = null; this.hinweis('Bauabschnitt bereit – jetzt Häuser anschließen'); this.schritt('abschnitt_offen'); }
      else {
        for (const o of s.objekte) if (o.geplant) { delete o.geplant; o._pop = t; }
        // E2: Erst jetzt wird getauscht; bis hierher lieferte die alte Leitung.
        for (const o of s.objekte) if (o.ersatz) { o.typ = o.ersatz.typ; delete o.ersatz; o._pop = t; }
        this.vorsehungenVerbrauchen();
        delete s.abschnitt; this.warnliste = [];
        this.hinweis('Bauabschnitt fertig – die Leitungen liegen'); this.ereignisse.push({ art: 'funken', objekt_id: 'heizzentrale' });
        this.schritt('abschnitt_gebaut');
      }
      geaendert = true;
    }
    for (const o of s.objekte) if (o.upgrade_auftrag && o.upgrade_auftrag.ende_ms <= t) {
      const u = UPGRADES[o.upgrade ?? 0], vorher_k = spreizungHaus_k(o, this.vorlauf_c);
      o.upgrade = (o.upgrade ?? 0) + 1;
      // A73 + Fachprüfung: tatsächlicher Spreizungsgewinn beim aktuellen Vorlauf (Rücklauf nie unter 40 °C)
      const gewinn_k = Math.round(spreizungHaus_k(o, this.vorlauf_c) - vorher_k);
      this.hinweis(`${o.upgrade_auftrag.helfer} ist fertig: ${u.name} (${gewinn_k > 0 ? `Spreizung +${gewinn_k} K` : `Rücklauf schon bei ${MIN_RUECKLAUF_C} °C`} · braucht ${u.senkung_k} K weniger Vorlauf)`); delete o.upgrade_auftrag; o._pop = t; geaendert = true;
      this.ereignisse.push({ art: 'funken', objekt_id: o.id });
    }
    for (const [typ, g] of Object.entries(s.antraege) as Array<[TypId, NonNullable<Spielstand['antraege'][TypId]>]>) {
      if (g.stand === 'wartet' && g.bewilligt_ms <= t) {
        g.stand = 'bewilligt'; this.hinweis(`Förderbescheid: ${KATALOG[typ].name} ist bewilligt`); geaendert = true;
      }
    }
    if (geaendert) this.neuBerechnen();
  }
  /** A81: Monatsabrechnung – jeder angeschlossene Kunde zahlt gelieferte kWh × Wärmepreis + Grundgebühr; das Geld wird automatisch überwiesen. */
  private abrechnen(nr: number): Abrechnung & { eingang_eur: number } {
    const s = this.stand;
    let kunden = 0, kwh = 0, waerme_eur = 0, grund_eur = 0, rest_kasse = 0;
    for (const o of s.objekte) {
      rest_kasse += o.kasse_eur; o.kasse_eur = 0; // Münzen aus Spielständen vor A81 werden mit überwiesen
      if ((o.zaehler_grund_eur ?? 0) > 0 || (o.zaehler_eur ?? 0) > 0) kunden++;
      kwh += o.zaehler_kwh ?? 0; waerme_eur += o.zaehler_eur ?? 0; grund_eur += o.zaehler_grund_eur ?? 0;
      delete o.zaehler_kwh; delete o.zaehler_eur; delete o.zaehler_grund_eur;
    }
    const summe_eur = waerme_eur + grund_eur;
    const vorher = s.geld_eur, grenze = this.kassengrenze_eur();
    s.geld_eur = Math.min(Math.max(s.geld_eur, grenze), s.geld_eur + summe_eur + rest_kasse);
    const eingang_eur = s.geld_eur - vorher;
    const a: Abrechnung = { monat: nr, kunden, waerme_kwh: Math.round(kwh), waerme_eur: Math.round(waerme_eur), grund_eur: Math.round(grund_eur), summe_eur: Math.round(summe_eur) };
    s.letzte_abrechnung = a;
    if (kunden > 0) {
      s.erledigt.collect = true; // Auftrag „erste Monatsabrechnung“
      const eingang = Math.round(eingang_eur);
      const text = `Abrechnung ${this.monatsname(nr)}: ${kunden} Kunden · ${Math.round(kwh).toLocaleString('de-DE')} kWh · +${eingang.toLocaleString('de-DE')} € eingegangen${eingang < Math.round(summe_eur) ? ' – Kasse voll, Abrechnungsbüro ausbauen' : ''}`;
      if (this.abwesend) this.offline_text = text;
      else {
        this.hinweis(text);
        const hz = this.hz;
        this.ereignisse.push({ art: 'schwebtext', x: hz.x, y: hz.y, text: `+${eingang.toLocaleString('de-DE')} €`, farbe: '#ffd166' });
        if (eingang > 0) this.ereignisse.push({ art: 'muenzen', objekt_id: hz.id, betrag_eur: eingang });
      }
    }
    return { ...a, eingang_eur };
  }
  private einnahmen(dt_s: number): void {
    const s = this.stand, P = PREISSTUFEN[s.preisstufe];
    // A81: Der Wärmezähler jedes warmen Kunden läuft mit dem Verbrauchsanteil des laufenden Monats
    const anteil = MONATSANTEIL_PROMILLE[Math.floor(s.zuletzt_ms / SPIELMONAT_MS) % 12] / 1000;
    // Review A81 W3: Wärme kostet den Preis, der beim Liefern gilt; die Grundgebühr läuft anteilig je Zeit mit
    const ct = P.ct_je_kwh, monatsteil = dt_s * 1000 / SPIELMONAT_MS;
    for (const o of s.objekte) {
      if (!istKunde(o) || !this.netz.anschluss.has(o.id)) continue;
      o.zaehler_grund_eur = (o.zaehler_grund_eur ?? 0) + this.grundgebuehr_eur * monatsteil;
      if (!this.netz.warm.has(o.id)) continue;
      const kwh = this.jahresverbrauch_kwh(o) * anteil * monatsteil;
      o.zaehler_kwh = (o.zaehler_kwh ?? 0) + kwh;
      o.zaehler_eur = (o.zaehler_eur ?? 0) + kwh * ct / 100;
    }
    // A81: Erzeugungskosten folgen der im Monat gelieferten Wärme (Monatsanteil × 12; übers Jahr gemittelt 1)
    s.geld_eur = Math.max(0, s.geld_eur - (this.netz.betriebskosten_eur_min * anteil * 12 / 60) * dt_s + (this.netz.einspeisung_kw * KONSTANTEN.einspeisung_eur_je_kw_min / 60) * dt_s);
    let geaendert = false;
    const wartet = this.wartenAufBau();
    for (const o of s.objekte) {
      if (!istKunde(o) || !this.netz.anschluss.has(o.id)) continue;
      const gross = KATALOG[o.typ].kategorie === 'gross';
      const kuehl = Math.max(0, this.mindestVorlauf_c(o) - this.vorlauf_c) * 4; // A33: Vorlauf zu niedrig → Räume zu kühl
      const grund = (GRUNDGEBUEHR.neutral_eur - this.grundgebuehr_eur) * GRUNDGEBUEHR.zufriedenheit_je_eur_pct; // A81
      const ziel = Math.max(0, Math.min(100, P.zufriedenheit_pct + grund - kuehl + (this.netz.warm.has(o.id) || wartet.has(o.id) ? 0 : gross ? -KONSTANTEN.kalt_abzug_gross_pct : -KONSTANTEN.kalt_abzug_haus_pct) + (o.stufe - 1) * 3));
      const jetzt = o.zufriedenheit_pct ?? 80, tau = gross ? 60 : 90;
      o.zufriedenheit_pct = ziel + (jetzt - ziel) * Math.exp(-dt_s / tau);
      if (!gross && this.netz.warm.has(o.id)) {
        o.warm_s = (o.warm_s ?? 0) + dt_s;
        // A34: Dauerhaft sehr zufrieden → der Kunde möchte den Kamin abschalten (ganze Wärme aus dem Netz)
        o.voll_s = o.zufriedenheit_pct >= 95 ? (o.voll_s ?? 0) + dt_s : o.zufriedenheit_pct < 85 ? 0 : (o.voll_s ?? 0);
        // A88/F2: Der Bedarf steigt nicht von selbst – der Kunde fragt an, der Spieler entscheidet. Höchstens eine Anfrage je Haus, Kamin zuerst.
        if (!o.anfrage && !o.vollversorgung && o.voll_s >= KONSTANTEN.vollversorgung_nach_s) this.anfrageStellen(o, 'vollversorgung');
        // Aufstockung: Nach einiger Zeit möchte ein Wohnhaus ein Stockwerk aufsetzen
        if (!o.anfrage && !o.aufgestockt && (['efh', 'rh', 'baeck'] as TypId[]).includes(o.typ) && o.warm_s >= KONSTANTEN.aufstockung_nach_s + (o.id % 4) * 300) this.anfrageStellen(o, 'aufstockung');
      }
      if (o.zufriedenheit_pct < KONSTANTEN.kuendigung_haus_pct && KATALOG[o.typ].kategorie === 'haus') {
        o.gekuendigt = true; geaendert = true;
        delete o.anfrage; // A88/F2: Wer gekündigt hat, will keine Wärme mehr
        this.hinweis(`${KATALOG[o.typ].name} hat gekündigt!`);
        this.ereignisse.push({ art: 'schwebtext', x: o.x, y: o.y, text: 'Gekündigt', farbe: '#ff6a5a' });
      }
      if (o.zufriedenheit_pct < KONSTANTEN.kuendigung_gross_pct && gross) {
        o.zustand = 'gesperrt'; geaendert = true;
        this.hinweis(`${KATALOG[o.typ].name} hat den Vertrag gekündigt!`);
      }
    }
    // A50: Sind die Anschlussnehmer lange zufrieden, sprechen sich das die Nachbarn herum: einzelne Häuser möchten ebenfalls anschließen.
    // Review: Alle angeschlossenen Kunden zählen – friert einer oder ist einer unzufrieden, beginnt die Zeit von vorn.
    const warmeHaeuser = s.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && istKunde(o) && this.netz.anschluss.has(o.id));
    const alleZufrieden = warmeHaeuser.length > 0 && warmeHaeuser.every((o) => this.netz.warm.has(o.id) && (o.zufriedenheit_pct ?? 80) >= KONSTANTEN.interesse_ab_pct);
    if (!alleZufrieden) s.zufrieden_s = 0;
    else {
      s.zufrieden_s = (s.zufrieden_s ?? 0) + dt_s;
      while ((s.zufrieden_s ?? 0) >= KONSTANTEN.interesse_alle_s) {
        s.zufrieden_s = (s.zufrieden_s ?? 0) - KONSTANTEN.interesse_alle_s;
        if (s.objekte.filter((o) => o.interessent).length >= KONSTANTEN.interessenten_max) break;
        const kandidaten = s.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station && !o.interessent && !o.gekuendigt && !this.netz.anschluss.has(o.id));
        if (!kandidaten.length) break;
        const abstand = (o: Objekt): number => Math.min(...warmeHaeuser.map((w) => Math.abs(w.x - o.x) + Math.abs(w.y - o.y)));
        kandidaten.sort((a, b) => abstand(a) - abstand(b) || a.id - b.id);
        const wahl = kandidaten[Math.floor(Math.min(kandidaten.length - 1, (s.naechste_id + s.objekte.length) % 3))];
        wahl.interessent = true; wahl._pop = this.uhr();
        this.hinweis('Ein Nachbar möchte auch Fernwärme – das Haus leuchtet gelb');
        this.ereignisse.push({ art: 'schwebtext', x: wahl.x, y: wahl.y, text: 'möchte anschließen', farbe: '#ffd166' });
      }
    }
    if (geaendert) this.neuBerechnen();
  }
  /** A50: Preis der Übergabestation für dieses Haus (Interessenten bekommen einen Nachlass; die alte Station wird zu 50 % zurückgekauft). */
  stationspreis_eur(o: Objekt, st: { kosten_eur: number }): number {
    const alt = stationHolen(o.station);
    const brutto = st.kosten_eur * (o.interessent ? 1 - KONSTANTEN.interessent_nachlass : 1);
    return Math.round(brutto - (alt ? alt.kosten_eur * KONSTANTEN.rueckkauf_anteil : 0));
  }
}
