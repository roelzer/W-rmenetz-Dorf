import {
  KATALOG, KONSTANTEN, PREISSTUFEN, START_PREISSTUFE, hatStufen, istLeitung, istQuelle, type TypId,
} from './katalog';
import {
  belegungskarte, berechneNetz, dorfwert, groesse, heizzentrale, istAktiv, istKunde,
} from './netz';
import type { Bau, InnenQuelle, Netz, Objekt, Spielstand } from './typen';
import { ortHolen, STANDARD_ORT } from './orte';
import { zufall } from './zufall';

const N = KONSTANTEN.feldanzahl;
const MAX_OFFLINE_S = 12 * 3600;
const SCHRITT_S = 30;

/** Ereignisse für Oberfläche und Darstellung (Hinweise, Effekte). Der Kern kennt keine Grafik. */
export type Ereignis =
  | { art: 'hinweis'; text: string }
  | { art: 'funken'; objekt_id: number | 'heizzentrale'; farbe?: string }
  | { art: 'muenzen'; objekt_id: number; betrag_eur: number }
  | { art: 'schwebtext'; x: number; y: number; text: string; farbe?: string };

export interface Ergebnis { ok: boolean; hinweis?: string }
const ok = (): Ergebnis => ({ ok: true });

export function neuerSpielstand(jetzt_ms: number, ortId: string = STANDARD_ORT): Spielstand {
  const ort = ortHolen(ortId);
  const objekte: Objekt[] = [];
  let id = 1;
  const add = (typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}) =>
    objekte.push({ id: id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra });
  // Start (A22/A29): Heizhaus, Büro, ein Monteurhäuschen, 100.000 €. Die Häuser des Ortes (A21) heizen noch mit Öl.
  add('hz', 11, 10); add('buero', 7, 10); add('huette', 11, 7);
  // A29: zwei Starthäuser sind von Anfang an mit 50er-Leitung angeschlossen (Hauptleitung zum Heizhaus); alle weiteren Häuser heizen noch mit Öl.
  for (const [x, y] of [[11, 12], [11, 13], [11, 14], [10, 13]]) add('d50', x, y);
  for (const h of ort.haeuser) add(h.typ, h.x, h.y, { zufriedenheit_pct: 80, bestand: true });
  for (const g of ort.gross) add(g.typ, g.x, g.y, { zustand: 'gesperrt' });
  const r = zufall(9 + ortId.length);
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(r() * N), y = Math.floor(r() * N);
    if (x > 5 && x < 17 && y > 5 && y < 17) continue;
    { const typ = r() < 0.45 ? 'stein' : r() < 0.55 ? 'busch' : 'baum'; add(typ, x, y, typ === 'baum' ? { landschaft: true } : {}); }
  }
  const behalten: Objekt[] = [];
  for (const a of objekte) if (!behalten.some((b) => ueberlappt(a, b))) behalten.push(a);
  return {
    version: 3, name: ort.name, ort: ort.id, geld_eur: KONSTANTEN.startgeld_eur, taler: KONSTANTEN.starttaler,
    objekte: behalten, naechste_id: id, innen: [], preisstufe: START_PREISSTUFE, antraege: {},
    zuletzt_ms: jetzt_ms, erledigt: {}, gemocht: {}, quelle_gewaehlt: false, deko_anzahl: 0,
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
  constructor(stand: Spielstand, private readonly uhr: () => number) {
    this.stand = stand;
    this.neuBerechnen();
  }

  // ---------- Abfragen ----------
  neuBerechnen(): void { this.netz = berechneNetz(this.stand.objekte, this.stand.innen, this.stand.preisstufe); }
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
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) if (belegung[(y + dy) * N + x + dx]) return false;
    return true;
  }

  /** Würde eine Leitung auf (x, y) eine Kreuzung (vier Leitungsnachbarn) erzeugen? Echte Netze kennen nur T-Stücke. */
  machtKreuzung(x: number, y: number): boolean {
    const leit = new Set(this.stand.objekte.filter((o) => istLeitung(o.typ)).map((o) => o.y * N + o.x));
    leit.add(y * N + x);
    const zahl = (fx: number, fy: number): number =>
      [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => leit.has((fy + dy) * N + fx + dx)).length;
    if (zahl(x, y) >= 4) return true;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => leit.has((y + dy) * N + x + dx) && zahl(x + dx, y + dy) >= 4);
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
    if (istLeitung(t) && this.machtKreuzung(x, y)) return this.nein('Keine Kreuzungen: Leitungen verzweigen nur als T-Stück');
    if (!D.sofort && !this.braucheMonteur()) return { ok: false };
    const c = this.kosten(t, 1);
    const b = this.bezahlen(c);
    if (!b.ok) return b;
    const o: Objekt = {
      id: this.stand.naechste_id++, typ: t, x, y, stufe: 1,
      bau: D.sofort ? null : this.neuerBau('neu', (D.bauzeit_s as number[])[0]),
      kasse_eur: 0, _pop: this.uhr(),
    };
    if (D.kategorie === 'haus') o.zufriedenheit_pct = 80;
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

  /** Vor dem Spielstart: anderen Ort wählen, das Dorf beginnt neu (A21). */
  ortWechseln(ortId: string): Ergebnis {
    if (this.stand.quelle_gewaehlt) return { ok: false };
    this.stand = neuerSpielstand(this.uhr(), ortId);
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
    if (istLeitung(o.typ)) this.stand.geld_eur += this.rueckkauf_eur(o.typ, 1); // A30: 50 % zurück
    this.stand.objekte = this.stand.objekte.filter((a) => a !== o);
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
    if (KATALOG[o.typ].kategorie === 'gross' || KATALOG[o.typ].kategorie === 'hindernis') return this.nein('Das lässt sich nicht verschieben');
    if (!this.kannPlatzieren(o.typ, x, y, id, groesse(o))) return this.nein('Hier ist kein Platz');
    o.x = x; o.y = y; o._pop = this.uhr();
    this.neuBerechnen();
    return ok();
  }

  leitungTauschen(id: number, neu: TypId): Ergebnis {
    const o = this.objekt(id);
    if (!o || !istLeitung(o.typ) || !istLeitung(neu) || o.typ === neu || !this.grenze(neu)) return { ok: false };
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
  /** Rechnet den Spielstand bis zum Zeitpunkt jetzt_ms fort (auch lange Offline-Zeit, höchstens 12 h). */
  bis(jetzt_ms: number): void {
    const s = this.stand;
    if (jetzt_ms <= s.zuletzt_ms) { this.fertigstellen(jetzt_ms); return; }
    if (jetzt_ms - s.zuletzt_ms > MAX_OFFLINE_S * 1000) s.zuletzt_ms = jetzt_ms - MAX_OFFLINE_S * 1000;
    while (s.zuletzt_ms < jetzt_ms) {
      let ziel = Math.min(jetzt_ms, s.zuletzt_ms + SCHRITT_S * 1000);
      const naechster = this.naechstesEreignis_ms();
      if (naechster !== null && naechster > s.zuletzt_ms && naechster < ziel) ziel = naechster;
      this.einnahmen((ziel - s.zuletzt_ms) / 1000);
      s.zuletzt_ms = ziel;
      this.fertigstellen(ziel);
    }
  }
  private naechstesEreignis_ms(): number | null {
    let m: number | null = null;
    const merke = (t: number) => { if (m === null || t < m) m = t; };
    for (const o of this.stand.objekte) if (o.bau) merke(o.bau.ende_ms);
    for (const k of this.stand.innen) if (k.bau) merke(k.bau.ende_ms);
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
      if (this.netz.warm.has(o.id))
        o.kasse_eur = Math.min(this.kassenCap_eur(o), o.kasse_eur + (((KATALOG[o.typ].einnahmen_eur_min as number[])[o.stufe - 1] || 0) * P.einnahmefaktor / 60) * dt_s);
    }
    s.geld_eur = Math.max(0, s.geld_eur - (this.netz.betriebskosten_eur_min / 60) * dt_s);
    let geaendert = false;
    for (const o of s.objekte) {
      if (!istKunde(o) || !this.netz.anschluss.has(o.id)) continue;
      const gross = KATALOG[o.typ].kategorie === 'gross';
      const ziel = Math.max(0, Math.min(100, P.zufriedenheit_pct + (this.netz.warm.has(o.id) ? 0 : gross ? -KONSTANTEN.kalt_abzug_gross_pct : -KONSTANTEN.kalt_abzug_haus_pct) + (o.stufe - 1) * 3));
      const jetzt = o.zufriedenheit_pct ?? 80, tau = gross ? 60 : 90;
      o.zufriedenheit_pct = ziel + (jetzt - ziel) * Math.exp(-dt_s / tau);
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
    if (geaendert) this.neuBerechnen();
  }
}
