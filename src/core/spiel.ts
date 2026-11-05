import {
  KATALOG, KONSTANTEN, LEITUNGEN, PREISSTUFEN, START_PREISSTUFE, UPGRADES, VORLAUF, HELFER, ABSCHNITT_HELFER, DACH_PV, HZ_ZIELE, SPREIZUNG_BASIS_K, SPIELJAHR_MS, MIN_VORLAUF_C, STATIONEN, passendeStation, stationHolen, hatStufen, istLeitung, istQuelle, type TypId,
} from './katalog';
import {
  belegungskarte, berechneNetz, leitungsNachbarn, mittlereSpreizung_k, bedarfKw, nutzungsfaktor, dorfwert, groesse, heizzentrale, istAktiv, istKunde,
} from './netz';
import type { Bau, InnenQuelle, Netz, Objekt, Spielstand } from './typen';
import { ortHolen, STANDARD_ORT } from './orte';
import { zufall } from './zufall';

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
  | { art: 'sprecher'; figur: string; text: string };

export interface Ergebnis { ok: boolean; hinweis?: string }
const ok = (): Ergebnis => ({ ok: true });

/** Ein Spieltag in ms (1 Spieljahr = 365 Tage). */
const SPIELTAG_MS = SPIELJAHR_MS / 365;
const tageText = (t: number): string => `${t} ${t === 1 ? 'Tag' : 'Tage'}`;

export function neuerSpielstand(jetzt_ms: number, ortId: string = STANDARD_ORT): Spielstand {
  const ort = ortHolen(ortId);
  const objekte: Objekt[] = [];
  let id = 1;
  const add = (typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}) =>
    objekte.push({ id: id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra });
  // Start (A22/A29): Heizhaus, Büro, ein Monteurhäuschen, 30.000 €. Die Häuser des Ortes (A21) heizen noch mit Öl.
  add('hz', 11, 10); add('buero', 7, 10); add('huette', 11, 7);
  // A29/A59: zwei Starthäuser sind von Anfang an angeschlossen. Die Hauptleitung (40er) liegt in der Straße neben dem Heizhaus,
  // die Hausanschlüsse (25er) führen von dort zu den Häusern; alle weiteren Häuser heizen noch mit Öl.
  // A67: Die Hauptleitung endet am letzten Abzweig (9|13 schließt bei 10|13 seitlich an); erst dort wird es dünner.
  for (let y = 10; y <= 13; y++) add('d40', 10, y);
  add('d25', 10, 14); add('d25', 11, 14);
  // Die beiden Starthäuser haben eine Übergabestation; alle anderen müssen eine kaufen (A32, Simon 2026-11-05).
  const starthaeuser = new Set([13 * N + 9, 14 * N + 12]);
  ort.haeuser.forEach((h) => {
    const bedarf = KATALOG[h.typ].bedarf_kw as number;
    const start = starthaeuser.has(h.y * N + h.x);
    add(h.typ, h.x, h.y, { zufriedenheit_pct: 80, bestand: true, ...(start ? { station: passendeStation(bedarf).id } : { ohne_station: true }) });
  });
  for (const g of ort.gross) add(g.typ, g.x, g.y, { zustand: 'gesperrt', ohne_station: true });
  const strassenFelder = new Set([...ort.strassen, ...ort.fluss].map(([sx, sy]) => sy * N + sx));
  const r = zufall(9 + ortId.length);
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(r() * N), y = Math.floor(r() * N);
    if (x > 5 && x < 17 && y > 5 && y < 17) continue;
    if (strassenFelder.has(y * N + x)) continue;
    { const typ = r() < 0.45 ? 'stein' : r() < 0.55 ? 'busch' : 'baum'; add(typ, x, y, typ === 'baum' ? { landschaft: true } : {}); }
  }
  const behalten: Objekt[] = [];
  for (const a of objekte) if (!behalten.some((b) => ueberlappt(a, b))) behalten.push(a);
  return {
    version: 3, name: ort.name, ort: ort.id, geld_eur: KONSTANTEN.startgeld_eur, taler: KONSTANTEN.starttaler,
    objekte: behalten, naechste_id: id, innen: [], preisstufe: START_PREISSTUFE, antraege: {},
    karte: 2, zuletzt_ms: jetzt_ms, erledigt: {}, gemocht: {}, quelle_gewaehlt: false, deko_anzahl: 0,
  };
}

function ueberlappt(a: Objekt, b: Objekt): boolean {
  const sa = groesse(a), sb = groesse(b);
  return a.x < b.x + sb && b.x < a.x + sa && a.y < b.y + sb && b.y < a.y + sa;
}

export class Spiel {
  stand: Spielstand;
  netz!: Netz;
  readonly ereignisse: Ereignis[] = [];
  private abwesend = false;
  private strassenSet?: Set<number>;
  private flussSet?: Set<number>;
  constructor(stand: Spielstand, private readonly uhr: () => number) {
    this.stand = stand;
    this.neuBerechnen();
  }

  // ---------- Abfragen ----------
  get vorlauf_c(): number { return this.stand.vorlauf_c ?? VORLAUF.start_c; }
  /** Vorlauftemperatur in 5-K-Schritten setzen (A33). */
  vorlaufSetzen(c: number): void {
    const w = Math.max(VORLAUF.min_c, Math.min(VORLAUF.max_c, Math.round(c / VORLAUF.schritt_c) * VORLAUF.schritt_c));
    this.stand.vorlauf_c = w; this.neuBerechnen();
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
    const kw = this.dachPvLeistung_kw();
    const b = this.bezahlen({ eur: kw * DACH_PV.eur_je_kw });
    if (!b.ok) return b;
    hz.dach_pv = true; hz._pop = this.uhr();
    this.ereignisse.push({ art: 'funken', objekt_id: 'heizzentrale' });
    this.hinweis(`PV-Anlage auf dem Heizhaus-Dach: ${kw} kWp`);
    this.neuBerechnen();
    return ok();
  }

  /** A43: Baugebiet in der Gegenrichtung erschließen – ein zweiter Strang aus dem Heizhaus, neue Häuser stehen fest. */
  baugebietBedingungen(): { ok: boolean; fehlt: string[] } {
    const fehlt: string[] = [];
    if (this.stand.baugebiet) fehlt.push('Baugebiet ist schon erschlossen');
    if (this.hzStufe < KONSTANTEN.baugebiet_hz_stufe) fehlt.push(`Heizzentrale Stufe ${KONSTANTEN.baugebiet_hz_stufe}`);
    const n = this.stand.objekte.filter((o) => this.netz.warm.has(o.id) && KATALOG[o.typ].kategorie === 'haus').length;
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
  /** Spreizung des Netzes (Vorlauf minus Rücklauf): Grundwert plus die Rücklauf-Senkung der Upgrades, nach Bedarf gewichtet. Sie hängt nicht vom Regler ab – ein heißerer Vorlauf hebt auch den Rücklauf (A39). */
  spreizung_k(): number { return mittlereSpreizung_k(this.stand.objekte, this.netz.warm); }
  /** Bedingungen für die nächste Heizzentralen-Stufe (A39). */
  hzZiele(): { text: string; ist: number; soll: number; erreicht: boolean }[] {
    const z = HZ_ZIELE.find((x) => x.stufe === this.hzStufe + 1);
    if (!z) return [];
    const anschluesse = this.stand.objekte.filter((o) => this.netz.warm.has(o.id) && KATALOG[o.typ].kategorie === 'haus').length;
    const liste = [{ text: 'Angeschlossene Häuser', ist: anschluesse, soll: z.anschluesse }];
    if (z.absatz_kw) liste.push({ text: 'Wärmeabsatz in kW', ist: Math.round(this.netz.genutzt_kw), soll: z.absatz_kw });
    if (z.spreizung_k) liste.push({ text: 'Spreizung in K', ist: Math.round(this.spreizung_k()), soll: z.spreizung_k });
    return liste.map((x) => ({ ...x, erreicht: x.ist >= x.soll }));
  }

  neuBerechnen(): void { this.netz = berechneNetz(this.stand.objekte.filter((o) => !o.geplant), this.stand.innen, this.stand.preisstufe, this.vorlauf_c); }
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
  kassenCap_eur(o: Objekt): number { return ((KATALOG[o.typ].einnahmen_eur_min as number[])[o.stufe - 1] || 0) * 6; }
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
  /** Name des Spielers für die Ansprache der Helfer (A51). */
  get spielerName(): string { return this.stand.spieler?.trim() || 'Chef'; }
  private sagt(figur: string, text: string): void { this.ereignisse.push({ art: 'sprecher', figur, text }); }
  /** Lieferzeit des Materials in Spieltagen (1 Spieljahr = 365 Tage); mindestens 1. Wochen wären zu grob (Review: immer „1 Woche“). */
  liefertage(): number { return Math.max(1, Math.round(KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor * 1000 / SPIELTAG_MS)); }
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
  private neuerBau(art: Bau['art'], dauer_s: number): Bau {
    const j = this.uhr();
    return { art, start_ms: j, ende_ms: j + dauer_s * KONSTANTEN.bauzeit_faktor * 1000 };
  }
  aenderung(): void { this.neuBerechnen(); }

  // ---------- Aktionen ----------
  platzieren(t: TypId, x: number, y: number): Ergebnis {
    const D = KATALOG[t];
    if (!this.kannPlatzieren(t, x, y)) return this.nein('Hier ist kein Platz');
    if (istLeitung(t)) {
      if (this.leitungsanzahl() >= this.grenze(t))
        return this.nein(this.grenze(t) ? 'Mehr Leitungen ab der nächsten Heizzentralen-Stufe' : `${D.name} ab Heizzentrale Stufe 2`);
    } else if (this.anzahl(t) >= this.grenze(t)) return this.nein(`Mehr ${D.name} ab der nächsten Heizzentralen-Stufe`);
    if (istLeitung(t)) {
      // A41: Leitungen entstehen nur in einem Bauabschnitt, bezahlt wird erst bei der Materialbestellung.
      if (this.stand.abschnitt?.phase !== 'offen') return this.nein(this.stand.abschnitt ? 'Der Bauabschnitt ist gerade nicht zum Einzeichnen offen' : `Leitungen entstehen in Bauabschnitten – erst mit ${ABSCHNITT_HELFER.planung} einen Abschnitt planen`);
      this.stand.objekte.push({ id: this.stand.naechste_id++, typ: t, x, y, stufe: 1, bau: null, kasse_eur: 0, geplant: true, _pop: this.uhr() });
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
    if (o.typ === 'hz' && o.stufe === 2 && !this.kannPlatzieren('hz', o.x, o.y, o.id, 3))
      return this.nein('Für den Anbau auf 3×3 müssen die Felder rechts und unten frei sein');
    if (!this.braucheMonteur()) return { ok: false };
    const c = { eur: (D.kosten_eur as number[])[o.stufe] };
    const b = this.bezahlen(c);
    if (!b.ok) return b;
    if (istQuelle(o.typ) && this.foerderungNutzen(o.typ)) o.foerderung_eur = c.eur;
    o.bau = this.neuerBau('ausbau', (D.bauzeit_s as number[])[o.stufe]);
    this.neuBerechnen();
    return ok();
  }

  /** Quelle ins Heizhaus einbauen. gratis = Startquelle. */
  innenEinbauen(t: TypId, gratis = false): Ergebnis {
    const D = KATALOG[t];
    if (this.stand.innen.length >= (KATALOG.hz.plaetze as number[])[this.hzStufe - 1])
      return this.nein('Kein Platz mehr im Heizhaus – erst die Heizzentrale ausbauen');
    if (!gratis && D.min_hz_stufe && this.hzStufe < D.min_hz_stufe) return this.nein(`${D.name} passt erst in die Heizzentrale Stufe ${D.min_hz_stufe}`);
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

  einsammeln(o: Objekt, still = false): number {
    if (o.kasse_eur < 1) { if (!still) this.hinweis('Noch nichts abzuholen'); return 0; }
    const platz = this.kassengrenze_eur() - this.stand.geld_eur;
    const menge = Math.floor(Math.min(o.kasse_eur, platz));
    if (menge <= 0) { this.hinweis('Kasse voll – Abrechnungsbüro ausbauen'); return 0; }
    this.stand.geld_eur += menge;
    o.kasse_eur -= menge;
    this.ereignisse.push({ art: 'schwebtext', x: o.x, y: o.y, text: `+${menge.toLocaleString('de-DE')}` });
    this.ereignisse.push({ art: 'muenzen', objekt_id: o.id, betrag_eur: menge });
    this.stand.erledigt.collect = true;
    return menge;
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
    if (istLeitung(o.typ) && !o.geplant) this.stand.geld_eur += this.rueckkauf_eur(o.typ, 1); // A30: 50 % zurück
    this.stand.objekte = this.stand.objekte.filter((a) => a !== o);
    this.neuBerechnen();
    return ok();
  }

  /** A47: Eine geplante (noch nicht bestellte) Leitung auf dem Feld wieder wegnehmen – kostenlos, nur im offenen Bauabschnitt. */
  geplanteLeitungEntfernen(x: number, y: number): Ergebnis {
    if (this.stand.abschnitt?.phase !== 'offen') return { ok: false };
    const o = this.stand.objekte.find((a) => a.geplant && a.x === x && a.y === y);
    if (!o) return { ok: false };
    this.stand.objekte = this.stand.objekte.filter((a) => a !== o);
    return ok();
  }
  /** A47: Zuletzt eingezeichnete Leitung des offenen Bauabschnitts zurücknehmen. */
  letzteLeitungZurueck(): Ergebnis {
    if (this.stand.abschnitt?.phase !== 'offen') return { ok: false };
    const geplant = this.stand.objekte.filter((a) => a.geplant);
    const letzte = geplant[geplant.length - 1];
    if (!letzte) return { ok: false };
    // Review: Ein automatisch gezogener Hausanschluss wird als Ganzes zurückgenommen.
    this.stand.objekte = this.stand.objekte.filter((a) => a !== letzte && !(letzte.gruppe !== undefined && a.geplant && a.gruppe === letzte.gruppe));
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
  /** A32: Übergabestation für ein Haus/einen Großabnehmer kaufen (auch größere, z. B. als Reserve für einen Anbau). */
  stationKaufen(id: number, stationId: string): Ergebnis {
    const o = this.objekt(id), st = stationHolen(stationId);
    if (!o || !st || !(o.ohne_station || o.station) || o.bau) return { ok: false };
    const bedarf = bedarfKw(o);
    if (st.leistung_kw < bedarf) return this.nein(`${st.name} schafft nur ${st.leistung_kw} kW, das Gebäude braucht ${bedarf} kW`);
    const alt = stationHolen(o.station);
    if (alt && alt.leistung_kw >= st.leistung_kw) return this.nein('Es steht schon eine gleich große oder größere Station');
    const b = this.bezahlen({ eur: this.stationspreis_eur(o, st) });
    if (!b.ok) return b;
    delete o.interessent;
    o.station = st.id; delete o.ohne_station; o._pop = this.uhr();
    this.ereignisse.push({ art: 'funken', objekt_id: o.id });
    this.neuBerechnen();
    return ok();
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
      + this.vorsehungen_eur() + this.anbohrung_eur();
  }
  /** A69: geplante Vorsehungen (T-Stück mit verschlossenem Abgang) im Abschnitt. */
  vorsehungen_eur(): number { return this.stand.objekte.filter((o) => o.geplant && o.vorsehung).length * KONSTANTEN.vorsehung_eur; }
  anbohrung_eur(): number { return this.anbohrungsFelder().length * KONSTANTEN.anbohrung_eur; }
  /** Gebaute Leitungsnachbarn eines Feldes (die Heizzentrale zählt mit). */
  private gebauteNachbarn(f: number): number {
    const bel = belegungskarte(this.stand.objekte);
    return leitungsNachbarn(f % N, Math.floor(f / N), (n) => { const o = this.objekt(bel[n]); return !!o && ((istLeitung(o.typ) && !o.geplant) || o.typ === 'hz'); });
  }
  /** A69: Muss hier an eine laufende Leitung angebohrt werden? Ja, wenn sie durchläuft (kein Leitungsende) und keine Vorsehung hat. */
  private brauchtAnbohrung(o: Objekt): boolean {
    return istLeitung(o.typ) && !o.geplant && !o.vorsehung && this.gebauteNachbarn(o.y * N + o.x) >= 2;
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
        if (o && this.brauchtAnbohrung(o)) felder.add(ny * N + nx);
      }
    }
    return [...felder];
  }
  /** A69: Im offenen Bauabschnitt auf eine geplante Leitung ein T-Stück mit Vorsehung setzen oder wieder wegnehmen. */
  vorsehungUmschalten(id: number): Ergebnis {
    const o = this.objekt(id);
    if (!o || !istLeitung(o.typ)) return { ok: false };
    if (!o.geplant || this.stand.abschnitt?.phase !== 'offen') return this.nein('Eine Vorsehung kommt beim Bau der Leitung mit hinein – zeichne die Leitung im offenen Bauabschnitt');
    if (o.vorsehung) delete o.vorsehung; else o.vorsehung = true;
    o._pop = this.uhr();
    return ok();
  }
  abschnittLeitungen(): number { return this.stand.objekte.filter((o) => o.geplant).length; }
  /** A47: Kosten, eine Leitung auf dieses Feld zu legen (Material, Gestattung, Spülbohrung); Grundlage der automatischen Wegsuche. */
  private feldKosten_eur(t: TypId, x: number, y: number): number {
    const mat = (KATALOG[t].kosten_eur as number[])[0];
    if (this.istFluss(x, y)) return mat + KONSTANTEN.bohrung_eur_je_feld;
    if (this.istStrasse(x, y) || (this.stand.gestattungen ?? []).includes(y * N + x)) return mat;
    return mat + KONSTANTEN.gestattung_eur_je_feld;
  }
  /** A47: Hausanschluss ziehen: vom Haus auf dem günstigsten Weg zur nächsten Leitung, im offenen Bauabschnitt (alles geplant). Gerade Hauptleitungen bleiben unberührt, der Anschluss dockt seitlich an (T-Stück). */
  hausanschlussPlanen(hausId: number): Ergebnis {
    const haus = this.objekt(hausId);
    if (!haus || !['haus', 'gross'].includes(KATALOG[haus.typ].kategorie)) return { ok: false };
    if (this.stand.abschnitt?.phase !== 'offen') return this.nein('Erst einen Bauabschnitt planen lassen und öffnen');
    const bedarf = bedarfKw(haus);
    const verfuegbar = LEITUNGEN.filter((l) => this.grenze(l) > 0);
    const typ = verfuegbar.find((l) => (KATALOG[l].kapazitaet_kw as number) >= bedarf) ?? verfuegbar[verfuegbar.length - 1];
    if (!typ) return this.nein('Noch keine Leitung freigeschaltet');
    const belegung = belegungskarte(this.stand.objekte);
    const leit = new Set(this.stand.objekte.filter((o) => istLeitung(o.typ)).map((o) => o.y * N + o.x));
    const g = groesse(haus);
    const nachbarn = (f: number): number[] => {
      const x = f % N, y = Math.floor(f / N);
      return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N).map(([a, b]) => b * N + a);
    };
    const imHaus = (f: number): boolean => { const x = f % N, y = Math.floor(f / N); return x >= haus.x && x < haus.x + g && y >= haus.y && y < haus.y + g; };
    const frei = (f: number): boolean => !belegung[f] && !leit.has(f);
    // Schon angeschlossen? (Haus grenzt an eine Leitung)
    for (let dy = 0; dy < g; dy++) for (let dx = 0; dx < g; dx++) if (nachbarn((haus.y + dy) * N + haus.x + dx).some((n) => leit.has(n))) return this.nein('Das Haus liegt schon an einer Leitung');
    // Dijkstra über freie Felder (Zustand = Feld + Richtung). Jede Biegung kostet einen Aufschlag, damit der Anschluss gerade läuft.
    const BIEGUNG_EUR = 900;
    const richtungen: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const zustand = (f: number, r: number): number => f * 4 + r;
    const dist = new Map<number, number>(), von = new Map<number, number>();
    const offen: Array<[number, number]> = [];
    for (let dy = 0; dy < g; dy++) for (let dx = 0; dx < g; dx++) {
      const feld = (haus.y + dy) * N + haus.x + dx;
      richtungen.forEach(([rx, ry], r) => {
        const nx = feld % N + rx, ny = Math.floor(feld / N) + ry;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) return;
        const n = ny * N + nx;
        if (imHaus(n) || !frei(n)) return;
        const c = this.feldKosten_eur(typ, nx, ny), z = zustand(n, r);
        if (c < (dist.get(z) ?? Infinity)) { dist.set(z, c); von.set(z, -1); offen.push([c, z]); }
      });
    }
    let ziel = -1;
    // A69: Andocken an eine durchlaufende Leitung ohne Vorsehung kostet eine Anbohrung – die Wegsuche bevorzugt Vorsehungen und Leitungsenden.
    const bel = belegungskarte(this.stand.objekte);
    // Summe wie in anbohrungsFelder(): jede berührte durchlaufende Leitung ohne Vorsehung wird angebohrt.
    const andockKosten = (f: number): number => nachbarn(f).filter((n) => leit.has(n)).reduce((summe, n) => {
      const o = this.objekt(bel[n]);
      return summe + (o && this.brauchtAnbohrung(o) ? KONSTANTEN.anbohrung_eur : 0);
    }, 0);
    const erledigt = new Set<number>();
    while (offen.length) {
      offen.sort((a, b) => a[0] - b[0]);
      const [c, z] = offen.shift() as [number, number];
      if (z < 0) { ziel = -z - 1; break; } // günstigstes Ziel samt Andockkosten
      if (c > (dist.get(z) as number)) continue;
      const f = Math.floor(z / 4), r = z % 4;
      if (nachbarn(f).some((n) => leit.has(n))) {
        if (!erledigt.has(z)) { erledigt.add(z); offen.push([c + andockKosten(f), -z - 1]); }
        continue;
      }
      richtungen.forEach(([rx, ry], r2) => {
        const nx = f % N + rx, ny = Math.floor(f / N) + ry;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) return;
        const n = ny * N + nx;
        if (imHaus(n) || !frei(n)) return;
        const nc = c + this.feldKosten_eur(typ, nx, ny) + (r2 === r ? 0 : BIEGUNG_EUR), nz = zustand(n, r2);
        if (nc < (dist.get(nz) ?? Infinity)) { dist.set(nz, nc); von.set(nz, z); offen.push([nc, nz]); }
      });
    }
    if (ziel < 0) return this.nein('Kein Weg zu einer Leitung gefunden');
    const weg: number[] = [];
    for (let z = ziel; z >= 0; z = von.get(z) as number) weg.push(Math.floor(z / 4));
    if (this.leitungsanzahl() + weg.length > this.grenze(typ)) return this.nein('Zu viele Leitungen für diese Heizzentralen-Stufe');
    const gruppe = this.stand.naechste_id;
    for (const f of weg) this.stand.objekte.push({ id: this.stand.naechste_id++, typ, x: f % N, y: Math.floor(f / N), stufe: 1, bau: null, kasse_eur: 0, geplant: true, gruppe, _pop: this.uhr() });
    this.hinweis(`Hausanschluss geplant: ${weg.length} Felder, ${KATALOG[typ].name}`);
    return ok();
  }
  /** Neuen Bauabschnitt planen lassen (Philipp). */
  abschnittPlanen(): Ergebnis {
    if (this.stand.abschnitt) return this.nein('Es läuft schon ein Bauabschnitt');
    if (!this.stand.quelle_gewaehlt) return this.nein('Erst eine Wärmequelle wählen');
    const b = this.bezahlen({ eur: KONSTANTEN.abschnitt_planung_eur });
    if (!b.ok) return b;
    this.stand.abschnitt = { phase: 'planung', bau: this.neuerBau('neu', KONSTANTEN.abschnitt_planung_s) };
    this.sagt(ABSCHNITT_HELFER.planung, `Alles klar, ${this.spielerName}, ich kümmere mich um die Planung.`);
    return ok();
  }
  /** Einzeichnen beenden; als Nächstes wird Material bestellt. */
  abschnittAbschliessen(): Ergebnis {
    const a = this.stand.abschnitt;
    if (a?.phase !== 'offen') return { ok: false };
    if (!this.abschnittLeitungen()) return this.nein('Zeichne erst Leitungen in den Abschnitt');
    a.phase = 'bestellen';
    return ok();
  }
  /** Zurück zum Einzeichnen. */
  abschnittWiederOeffnen(): Ergebnis {
    const a = this.stand.abschnitt;
    if (a?.phase !== 'bestellen') return { ok: false };
    a.phase = 'offen';
    return ok();
  }
  /** Abschnitt verwerfen: alle eingezeichneten Leitungen verschwinden, die Planungsgebühr ist weg. */
  abschnittVerwerfen(): Ergebnis {
    const a = this.stand.abschnitt;
    if (!a || a.phase === 'planung' || a.phase === 'bau') return { ok: false };
    this.stand.objekte = this.stand.objekte.filter((o) => !o.geplant);
    delete this.stand.abschnitt;
    this.neuBerechnen();
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
    a.phase = 'bau'; a.bau = this.neuerBau('neu', KONSTANTEN.abschnitt_bau_s);
    const t = this.liefertage();
    this.sagt(ABSCHNITT_HELFER.material, `Hey ${this.spielerName}, dein Material ist bestellt. Lieferzeit: ${tageText(t)}.`);
    return ok();
  }

  /** A69: Nach dem Bau ist eine Vorsehung belegt, wenn an ihr ein Abzweig hängt (drei oder mehr Leitungsnachbarn, Heizzentrale zählt mit).
   *  Erst bei Bauende, damit sie während der Bauzeit weiter als Abzweig zählt (A67); ein bloß verlängertes Leitungsende verbraucht sie nicht. */
  private vorsehungenVerbrauchen(): void {
    for (const o of this.stand.objekte) if (o.vorsehung && !o.geplant && istLeitung(o.typ) && this.gebauteNachbarn(o.y * N + o.x) >= 3) delete o.vorsehung;
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

  leitungTauschen(id: number, neu: TypId): Ergebnis {
    const o = this.objekt(id);
    if (!o || o.geplant || !istLeitung(o.typ) || !istLeitung(neu) || o.typ === neu || !this.grenze(neu)) return { ok: false };
    // A30: Die alte Leitung wird zu 50 % des Preises zurückgekauft, die neue kostet den vollen Preis.
    const rueck = Math.round((KATALOG[o.typ].kosten_eur as number[])[0] * KONSTANTEN.rueckkauf_anteil);
    const b = this.bezahlen({ eur: (KATALOG[neu].kosten_eur as number[])[0] - rueck });
    if (!b.ok) return b;
    o.typ = neu; o._pop = this.uhr();
    this.neuBerechnen();
    return ok();
  }

  /** Bedingungen für einen Großabnehmer-Vertrag. */
  vertragBedingungen(o: Objekt): { ok: boolean; fehlt: string[] } {
    const D = KATALOG[o.typ];
    const ruf = this.ruf_pct(), reserve = this.netz.verfuegbar_kw - this.netz.genutzt_kw;
    const fehlt: string[] = [];
    if (this.hzStufe < (D.min_hz_stufe as number)) fehlt.push(`Heizzentrale Stufe ${D.min_hz_stufe}`);
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

  foerderungBeantragen(t: TypId): Ergebnis {
    if (this.stand.antraege[t]) return { ok: false };
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
    if (jetzt_ms <= s.zuletzt_ms) { this.fertigstellen(jetzt_ms); return; }
    if (jetzt_ms - s.zuletzt_ms > MAX_OFFLINE_S * 1000) s.zuletzt_ms = jetzt_ms - MAX_OFFLINE_S * 1000;
    // A38: Bei längerer Abwesenheit kommen die Einnahmen direkt aufs Konto (die Hauskassen würden sonst überlaufen, die Kosten liefen aber weiter).
    this.abwesend = jetzt_ms - s.zuletzt_ms > OFFLINE_SCHWELLE_S * 1000;
    while (s.zuletzt_ms < jetzt_ms) {
      let ziel = Math.min(jetzt_ms, s.zuletzt_ms + SCHRITT_S * 1000);
      const naechster = this.naechstesEreignis_ms();
      if (naechster !== null && naechster > s.zuletzt_ms && naechster < ziel) ziel = naechster;
      this.einnahmen((ziel - s.zuletzt_ms) / 1000);
      s.zuletzt_ms = ziel;
      this.fertigstellen(ziel);
    }
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
      const ziel = istObjekt ? (e as Objekt) : this.hz;
      ziel._pop = t;
      this.ereignisse.push({ art: 'funken', objekt_id: istObjekt ? (e as Objekt).id : 'heizzentrale' });
    };
    for (const o of s.objekte) if (o.bau && o.bau.ende_ms <= t) fertig(o, KATALOG[o.typ].name, true);
    for (const k of s.innen) if (k.bau && k.bau.ende_ms <= t) fertig(k, KATALOG[k.typ].name, false);
    const ab = s.abschnitt;
    if (ab?.bau && ab.bau.ende_ms <= t) {
      if (ab.phase === 'planung') { ab.phase = 'offen'; ab.bau = null; this.hinweis(`${ABSCHNITT_HELFER.planung} ist fertig: Zeichne jetzt die Leitungen ein`); }
      else {
        for (const o of s.objekte) if (o.geplant) { delete o.geplant; delete o.gruppe; o._pop = t; }
        this.vorsehungenVerbrauchen();
        delete s.abschnitt; this.hinweis('Bauabschnitt fertig – die Leitungen liegen'); this.ereignisse.push({ art: 'funken', objekt_id: 'heizzentrale' });
      }
      geaendert = true;
    }
    for (const o of s.objekte) if (o.upgrade_auftrag && o.upgrade_auftrag.ende_ms <= t) {
      const u = UPGRADES[o.upgrade ?? 0];
      this.hinweis(`${o.upgrade_auftrag.helfer} ist fertig: ${u.name} (Rücklauf −${u.senkung_k} K)`);
      o.upgrade = (o.upgrade ?? 0) + 1; delete o.upgrade_auftrag; o._pop = t; geaendert = true;
      this.ereignisse.push({ art: 'funken', objekt_id: o.id });
    }
    for (const [typ, g] of Object.entries(s.antraege) as Array<[TypId, NonNullable<Spielstand['antraege'][TypId]>]>) {
      if (g.stand === 'wartet' && g.bewilligt_ms <= t) {
        g.stand = 'bewilligt'; this.hinweis(`Förderbescheid: ${KATALOG[typ].name} ist bewilligt`); geaendert = true;
      }
    }
    if (geaendert) this.neuBerechnen();
  }
  private einnahmen(dt_s: number): void {
    const s = this.stand, P = PREISSTUFEN[s.preisstufe];
    for (const o of s.objekte) {
      if (this.netz.warm.has(o.id)) {
        const plus = (((KATALOG[o.typ].einnahmen_eur_min as number[])[o.stufe - 1] || 0) * P.einnahmefaktor * nutzungsfaktor(o) / 60) * dt_s;
        if (this.abwesend) s.geld_eur = Math.min(Math.max(s.geld_eur, this.kassengrenze_eur()), s.geld_eur + plus);
        else o.kasse_eur = Math.min(this.kassenCap_eur(o), o.kasse_eur + plus);
      }
    }
    s.geld_eur = Math.max(0, s.geld_eur - (this.netz.betriebskosten_eur_min / 60) * dt_s + (this.netz.einspeisung_kw * KONSTANTEN.einspeisung_eur_je_kw_min / 60) * dt_s);
    let geaendert = false;
    for (const o of s.objekte) {
      if (!istKunde(o) || !this.netz.anschluss.has(o.id)) continue;
      const gross = KATALOG[o.typ].kategorie === 'gross';
      const kuehl = Math.max(0, this.mindestVorlauf_c(o) - this.vorlauf_c) * 4; // A33: Vorlauf zu niedrig → Räume zu kühl
      const ziel = Math.max(0, Math.min(100, P.zufriedenheit_pct - kuehl + (this.netz.warm.has(o.id) ? 0 : gross ? -KONSTANTEN.kalt_abzug_gross_pct : -KONSTANTEN.kalt_abzug_haus_pct) + (o.stufe - 1) * 3));
      const jetzt = o.zufriedenheit_pct ?? 80, tau = gross ? 60 : 90;
      o.zufriedenheit_pct = ziel + (jetzt - ziel) * Math.exp(-dt_s / tau);
      if (!gross && this.netz.warm.has(o.id)) {
        o.warm_s = (o.warm_s ?? 0) + dt_s;
        // A34: Dauerhaft sehr zufrieden → Kamin aus, ganze Wärme aus dem Netz
        o.voll_s = o.zufriedenheit_pct >= 95 ? (o.voll_s ?? 0) + dt_s : o.zufriedenheit_pct < 85 ? 0 : (o.voll_s ?? 0);
        if (!o.vollversorgung && o.voll_s >= KONSTANTEN.vollversorgung_nach_s) {
          o.vollversorgung = true; geaendert = true;
          this.hinweis(`${KATALOG[o.typ].name} hat den Kamin abgeschaltet und heizt nur noch mit Fernwärme (+${Math.round((KONSTANTEN.vollversorgung_faktor - 1) * 100)} % Verbrauch)`);
          this.ereignisse.push({ art: 'schwebtext', x: o.x, y: o.y, text: 'Kamin aus', farbe: '#7bd88f' });
        }
        // Aufstockung: Nach einiger Zeit baut ein Wohnhaus ein Stockwerk auf, der Bedarf steigt
        if (!o.aufgestockt && (['efh', 'rh', 'baeck'] as TypId[]).includes(o.typ) && o.warm_s >= KONSTANTEN.aufstockung_nach_s + (o.id % 4) * 300) {
          o.aufgestockt = true; geaendert = true;
          this.hinweis(`${KATALOG[o.typ].name} stockt auf: Bedarf ${bedarfKw(o).toFixed(0)} kW – reicht die Übergabestation noch?`);
          this.ereignisse.push({ art: 'schwebtext', x: o.x, y: o.y, text: 'Aufstockung', farbe: '#ffd166' });
        }
      }
      if (o.zufriedenheit_pct < KONSTANTEN.kuendigung_haus_pct && KATALOG[o.typ].kategorie === 'haus') {
        o.gekuendigt = true; geaendert = true;
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
