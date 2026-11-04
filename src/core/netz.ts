import {
  KATALOG, KONSTANTEN, DACH_PV, LEITUNGSRANG, VORLAUF, PREISSTUFEN, istLeitung, stationHolen,
  type TypId,
} from './katalog';
import type { InnenQuelle, Netz, Objekt } from './typen';

const N = KONSTANTEN.feldanzahl;

/** Kantenlänge des Objekts in Feldern. Die Heizzentrale wächst ab Stufe 3 (oder im Ausbau auf 3) auf 3×3. */
export function groesse(o: Pick<Objekt, 'typ' | 'stufe' | 'bau'>): number {
  if (o.typ === 'hz') {
    return o.stufe >= 3 || (o.stufe === 2 && o.bau?.art === 'ausbau') ? 3 : 2;
  }
  return KATALOG[o.typ].groesse ?? 1;
}

export const istAktiv = (o: { bau: { art: string } | null }): boolean => !(o.bau && o.bau.art === 'neu');

export const heizzentrale = (objekte: Objekt[]): Objekt =>
  objekte.find((o) => o.typ === 'hz') as Objekt;

/** Belegung: Feld → Objekt-ID (0 = frei). */
export function belegungskarte(objekte: Objekt[], ohne?: Objekt): Int32Array {
  const m = new Int32Array(N * N);
  for (const o of objekte) {
    if (o === ohne) continue;
    const s = groesse(o);
    for (let dy = 0; dy < s; dy++) {
      for (let dx = 0; dx < s; dx++) {
        const x = o.x + dx, y = o.y + dy;
        if (x >= 0 && y >= 0 && x < N && y < N) m[y * N + x] = o.id;
      }
    }
  }
  return m;
}

/** Zahlender oder abnehmender Kunde? Häuser ohne Kündigung, Großabnehmer mit Vertrag und Wärmebedarf. */
export function istKunde(o: Objekt): boolean {
  const k = KATALOG[o.typ].kategorie;
  return (
    !o.ohne_station && ((k === 'haus' && istAktiv(o) && !o.gekuendigt) ||
    (k === 'gross' && o.zustand === 'vertrag' && !!KATALOG[o.typ].bedarf_kw))
  );
}

const NACHBARN: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Berechnet das Wärmenetz: Verbindung, Lastfluss, Kapazität, Versorgung, Kosten, Einnahmen.
 * Rein und deterministisch – keine Zeit, kein Zufall, kein Browser.
 * Fachregeln (siehe docs/lastenheft.md A6–A10):
 *  - Versorgt wird nur, wer über eine durchgehende Leitung mit der Heizzentrale verbunden ist.
 *  - Ein Leitungsabschnitt überträgt höchstens seine Nennleistung (Summe der Last dahinter).
 *  - Wird die Leitung Richtung Kunde dünner und danach wieder dicker, ist das ein Planungsfehler.
 *  - Es wird nie mehr Wärme verteilt als erzeugt (genutzt ≤ verfügbar).
 *  - Einnahmen nur für warme Kunden, Betriebskosten nur für tatsächlich erzeugte Wärme.
 */
export function berechneNetz(objekte: Objekt[], innen: InnenQuelle[], preisstufe: number, vorlauf_c: number = VORLAUF.start_c): Netz {
  const belegung = belegungskarte(objekte);
  const nachId = new Map(objekte.map((o) => [o.id, o]));
  const hz = heizzentrale(objekte);
  const leitungAn = (k: number): Objekt | null => {
    const o = nachId.get(belegung[k]);
    return o && istLeitung(o.typ) ? o : null;
  };
  const rund = (o: Objekt): Array<[number, number]> => {
    const s = groesse(o);
    const r: Array<[number, number]> = [];
    for (let i = 0; i < s; i++) r.push([o.x + i, o.y - 1], [o.x + i, o.y + s], [o.x - 1, o.y + i], [o.x + s, o.y + i]);
    return r.filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N);
  };

  // Ausbreitung von der Heizzentrale über zusammenhängende Leitungsfelder
  const tiefe = new Map<number, number>();
  const eltern = new Map<number, number>();
  const reihenfolge: number[] = [];
  for (const [x, y] of rund(hz)) {
    const k = y * N + x;
    if (leitungAn(k) && !tiefe.has(k)) { tiefe.set(k, 1); eltern.set(k, -1); reihenfolge.push(k); }
  }
  for (let i = 0; i < reihenfolge.length; i++) {
    const k = reihenfolge[i], x = k % N, y = (k - x) / N;
    for (const [dx, dy] of NACHBARN) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const nk = ny * N + nx;
      if (leitungAn(nk) && !tiefe.has(nk)) {
        tiefe.set(nk, (tiefe.get(k) as number) + 1);
        eltern.set(nk, k);
        reihenfolge.push(nk);
      }
    }
  }
  const hzFelder = new Set<number>();
  { const s = groesse(hz); for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) hzFelder.add((hz.y + dy) * N + hz.x + dx); }

  // Anschlusspunkt je Gebäude: nächstes erreichtes Leitungsfeld (oder direkt an der Heizzentrale)
  const anschluss = new Map<number, { feld: number; tiefe: number }>();
  for (const o of objekte) {
    const kat = KATALOG[o.typ].kategorie;
    if (!(kat === 'haus' || kat === 'waerme' || kat === 'gross')) continue;
    let best: number | null = null, bd = 1e9;
    for (const [x, y] of rund(o)) {
      const k = y * N + x;
      if (hzFelder.has(k)) { best = -1; bd = 0; break; }
      const t = tiefe.get(k);
      if (t !== undefined && t < bd) { bd = t; best = k; }
    }
    if (best !== null) anschluss.set(o.id, { feld: best, tiefe: bd });
    // A24: Ein Pufferspeicher außen ist ohne eigene Leitung mit der Heizzentrale verbunden.
    else if (o.typ === 'puffer') anschluss.set(o.id, { feld: -1, tiefe: 0 });
  }

  // Last in den Leitungen (Baum von der Heizzentrale aus)
  const last_kw = new Map<number, number>();
  const eigen = new Map<number, number>();
  for (const k of reihenfolge) { last_kw.set(k, 0); eigen.set(k, 0); }
  const kunden = objekte.filter((o) => istKunde(o) && anschluss.has(o.id));
  for (const o of kunden) {
    const a = anschluss.get(o.id) as { feld: number };
    if (a.feld >= 0) eigen.set(a.feld, (eigen.get(a.feld) as number) + bedarfKw(o));
  }
  for (const k of reihenfolge) last_kw.set(k, eigen.get(k) as number);
  for (let i = reihenfolge.length - 1; i >= 0; i--) {
    const k = reihenfolge[i], p = eltern.get(k) as number;
    if (p >= 0) last_kw.set(p, (last_kw.get(p) as number) + (last_kw.get(k) as number));
  }
  const kapazitaet_ok = new Map<number, boolean>();
  for (const k of reihenfolge) {
    const p = eltern.get(k) as number;
    const kap = KATALOG[(leitungAn(k) as Objekt).typ].kapazitaet_kw as number;
    kapazitaet_ok.set(k, (p < 0 || (kapazitaet_ok.get(p) as boolean)) && (last_kw.get(k) as number) <= kap);
  }
  // Fachregel: Dimension in Fließrichtung nur gleich oder kleiner
  const engpass = new Set<number>();
  for (const k of reihenfolge) {
    const p = eltern.get(k) as number;
    if (p >= 0 && LEITUNGSRANG[(leitungAn(k) as Objekt).typ] > LEITUNGSRANG[(leitungAn(p) as Objekt).typ]) {
      engpass.add(k); engpass.add(p);
    }
  }

  // Erzeugung. Fachregel V1: Von außen eingespeiste Wärme ist höchstens so groß wie die kleinste
  // Leitungskapazität auf dem Weg zur Heizzentrale. V2: Ein Speicher erzeugt keine Wärme (zählt nur, wenn eine Quelle läuft).
  const wegKapazitaet_kw = (feld: number): number => {
    let kap = Infinity;
    for (let k = feld; k >= 0; k = eltern.get(k) as number) kap = Math.min(kap, KATALOG[(leitungAn(k) as Objekt).typ].kapazitaet_kw as number);
    return kap;
  };
  let aussen_kw = 0, strom_kw = 0, speicher_kw = 0;
  for (const o of objekte) {
    const D = KATALOG[o.typ];
    if (D.kategorie === 'waerme' && istAktiv(o) && anschluss.has(o.id)) {
      const weg = wegKapazitaet_kw((anschluss.get(o.id) as { feld: number }).feld);
      if (D.leistung_kw) {
        const kw = Math.min(D.leistung_kw[o.stufe - 1], weg);
        if (o.typ === 'puffer') speicher_kw += kw; else aussen_kw += kw;
      }
      if (D.strom_kw) strom_kw += D.strom_kw[o.stufe - 1];
    }
  }
  for (const o of objekte) if (o.dach_pv) strom_kw += DACH_PV.kw[o.typ] ?? 0; // A36: Dach-PV
  let abwaerme_kw = 0;
  for (const o of objekte) {
    if (o.typ === 'gewerbe' && o.zustand === 'vertrag' && anschluss.has(o.id))
      abwaerme_kw += Math.min(KATALOG.gewerbe.abwaerme_kw as number, wegKapazitaet_kw((anschluss.get(o.id) as { feld: number }).feld));
  }
  const quellen = innen.filter((k) => istAktiv(k));
  const leistung = (k: InnenQuelle): number => (KATALOG[k.typ].leistung_kw as number[])[k.stufe - 1];
  const innen_kw = quellen.reduce((a, k) => a + leistung(k), 0);
  const ohneSpeicher_kw = aussen_kw + abwaerme_kw + innen_kw;
  if (ohneSpeicher_kw > 0) aussen_kw += speicher_kw;
  const verfuegbar_kw = aussen_kw + abwaerme_kw + innen_kw;

  // Wärme verteilen: nah zuerst, nur wenn die Leitungen reichen
  const warm = new Set<number>();
  const kalt = new Map<number, 'leitung' | 'waerme' | 'station'>();
  let genutzt_kw = 0, bedarf_kw = 0;
  const geordnet = [...kunden].sort(
    (a, b) => (anschluss.get(a.id) as { tiefe: number }).tiefe - (anschluss.get(b.id) as { tiefe: number }).tiefe || a.id - b.id,
  );
  for (const o of geordnet) {
    const n = bedarfKw(o);
    const a = anschluss.get(o.id) as { feld: number };
    bedarf_kw += n;
    if (a.feld >= 0 && !kapazitaet_ok.get(a.feld)) { kalt.set(o.id, 'leitung'); continue; }
    const st = stationHolen(o.station);
    if (st && st.leistung_kw < n) { kalt.set(o.id, 'station'); continue; } // A32: Station zu klein
    if (genutzt_kw + n <= verfuegbar_kw) { genutzt_kw += n; warm.add(o.id); } else kalt.set(o.id, 'waerme');
  }

  // Betriebskosten (Merit-Order: kostenlose Außenanlagen, dann Abwärme, dann günstigste Innenquelle)
  const elektrisch_kw = quellen.filter((k) => KATALOG[k.typ].elektrisch).reduce((a, k) => a + leistung(k), 0);
  const einspeisung_kw = Math.max(0, strom_kw - elektrisch_kw);
  const pv_faktor = Math.max(0.25, 1 - strom_kw / Math.max(1, elektrisch_kw));
  const preis = (k: InnenQuelle): number =>
    (KATALOG[k.typ].betriebskosten_eur_je_kw_min as number) * (KATALOG[k.typ].elektrisch ? pv_faktor : 1);
  let rest = Math.max(0, genutzt_kw - aussen_kw);
  let betriebskosten_eur_min = 0;
  const ab = Math.min(rest, abwaerme_kw);
  betriebskosten_eur_min += ab * KONSTANTEN.abwaerme_eur_je_kw_min;
  rest -= ab;
  const laeuft_mit_kw = new Map<InnenQuelle, number>();
  for (const k of [...quellen].sort((a, b) => preis(a) - preis(b))) {
    const h = Math.min(rest, leistung(k));
    rest -= h;
    laeuft_mit_kw.set(k, h);
    betriebskosten_eur_min += h * preis(k);
  }
  // A33: niedrigere Vorlauftemperatur spart Betriebskosten (Pumpen, Netzverluste)
  betriebskosten_eur_min *= Math.max(0.5, 1 - (VORLAUF.start_c - vorlauf_c) * VORLAUF.ersparnis_je_k);
  const P = PREISSTUFEN[preisstufe ?? 2];
  let einnahmen_eur_min = 0;
  for (const o of objekte) {
    if (warm.has(o.id)) einnahmen_eur_min += ((KATALOG[o.typ].einnahmen_eur_min as number[])[o.stufe - 1] || 0) * P.einnahmefaktor * nutzungsfaktor(o);
  }
  return {
    tiefe, eltern, reihenfolge, last_kw, kapazitaet_ok, engpass, anschluss, warm, kalt,
    verfuegbar_kw, genutzt_kw, bedarf_kw, betriebskosten_eur_min, einnahmen_eur_min,
    pv_faktor, strom_kw, einspeisung_kw, laeuft_mit_kw, belegung, nachId,
  };
}

/** Faktor auf Bedarf und Einnahmen: Vollversorgung (Kamin aus, A34) und Aufstockung erhöhen beides. */
export function nutzungsfaktor(o: Objekt): number {
  return (o.vollversorgung ? KONSTANTEN.vollversorgung_faktor : 1) * (o.aufgestockt ? KONSTANTEN.aufstockung_faktor : 1);
}
/** Tatsächlicher Wärmebedarf in kW. */
export function bedarfKw(o: Objekt): number {
  return (KATALOG[o.typ].bedarf_kw ?? 0) * nutzungsfaktor(o);
}

/** Dorfwert für die Rangliste. */
export function dorfwert(objekte: Objekt[], innen: InnenQuelle[]): number {
  let v = innen.reduce((a, k) => a + k.stufe * 12, 0);
  for (const o of objekte) {
    const D = KATALOG[o.typ];
    if (o.typ === 'hz') v += o.stufe * 60;
    else if (D.bauzeit_s) v += o.stufe * (D.groesse ?? 1) * 8;
    else if (D.kategorie === 'deko') v += 2;
    else if (istLeitung(o.typ)) v += LEITUNGSRANG[o.typ];
    else if (D.kategorie === 'gross' && o.zustand === 'vertrag') v += 40;
  }
  return v;
}

export type { TypId };
