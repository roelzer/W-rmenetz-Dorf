// A91 Vergleichswerkzeug (Bauplan docs/bauplaene/NR15-netzmodell.md, Fassung 3, Paket P0).
// zufallsNetz: deterministischer Netz-Generator mit der im Bauplan festgeschriebenen Verteilung.
// pruefeVergleich: Bedingungen (a)–(e) „neue Regel ist nie schlechter als die alte“.
// Nur Test-Infrastruktur. Nutzt für die Belegung die eingefrorene Kopie, damit der Generator nicht vom geprüften Code abhängt.
import { belegungskarte } from './netz-alt-a91';
import { KATALOG, LEITUNGEN, passendeStation, type TypId } from '../../src/core/katalog';
import type { InnenQuelle, Netz, Objekt } from '../../src/core/typen';

const N = 24;

/** Eigener Zufall: linearer Kongruenzgenerator (Numerical Recipes), Startwert fest, kein Math.random. */
function zufall(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

/**
 * Zufallsnetz zum Startwert `seed` (gleicher Startwert → gleiches Netz).
 * Verteilung laut Bauplan P0 (Prozentangaben je Netz):
 *  - Heizzentrale bei (10|10), je zur Hälfte Stufe 1 (2×2) und Stufe 3 (3×3).
 *  - Parallelstrang in 60 %: zwei Abgänge an derselben Heizzentralen-Seite, einer auf y = 10, einer über einen Knick auf
 *    y = 12 (Lücke 1: EFH/RH/Bäckerei) oder y = 13 (Lücke 2: MFH/Hallenbad/Klinik), Länge 4–10, Typen zufällig;
 *    die Häuser in der Lücke grenzen an beide Stränge.
 *  - 1–6 Zufallsstränge ab den Feldern rund um die Heizzentrale oder ab bestehenden Leitungen, Länge 3–15,
 *    Richtungswechsel, Typ aus LEITUNGEN[0..4], unterwegs dünner werdend; Kreuzungen ergeben Maschen.
 *  - 6–23 weitere Gebäude neben Leitungen, 25 % Großabnehmer-Ziehung (MFH/Hallenbad/Klinik, Klinik/Hallenbad mit Vertrag),
 *    Station passendeStation(bedarf), 10 % ohne Station.
 *  - 30 % ein Puffer neben einer Leitung; 40 % der Gebäude mit Station Upgrade 1–3, 15 % Hauspuffer.
 *  - 50 % 1–3 Wärmequellen (PV, Solarthermie, Erdsonde, Puffer; Stufe 1–2) neben Leitungen; 30 % ein Sägewerk (Abwärme) mit Vertrag.
 *  - Kessel Stufe 1 in 35 %, sonst 1–5; Vorlauf 75 °C in 70 %, sonst 55–85 °C in 5er-Schritten.
 * Nie auf belegte Felder, 2×2-Gebäude nur auf vollständig freie Fläche. Netze ohne Kunden sind erlaubt.
 * Die Reihenfolge der Zufallsziehungen entspricht dem Prototyp-Generator (Scratchpad proto/tests/proto-gen2.ts),
 * damit die im Bauplan Abschnitt 6 gemessenen Zahlen mit diesem Generator nachvollziehbar sind.
 */
export function zufallsNetz(seed: number): { objekte: Objekt[]; innen: InnenQuelle[]; vorlauf_c: number } {
  const r = zufall(seed);
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(r() * a.length)];
  const objekte: Objekt[] = [];
  let id = 1;
  const stufe = r() < 0.5 ? 1 : 3;
  const hzG = stufe >= 3 ? 3 : 2;
  objekte.push({ id: id++, typ: 'hz', x: 10, y: 10, stufe, bau: null, kasse_eur: 0 });
  const frei = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < N && y < N && !belegungskarte(objekte)[y * N + x];
  const flaecheFrei = (x: number, y: number, g: number): boolean => {
    for (let dy = 0; dy < g; dy++) for (let dx = 0; dx < g; dx++) if (!frei(x + dx, y + dy)) return false;
    return true;
  };
  const leitungen: number[] = [];
  const lege = (x: number, y: number, rang: number): void => {
    if (frei(x, y)) { objekte.push({ id: id++, typ: LEITUNGEN[rang], x, y, stufe: 1, bau: null, kasse_eur: 0 }); leitungen.push(y * N + x); }
  };
  const startFelder: Array<[number, number]> = [];
  for (let i = 0; i < hzG; i++) startFelder.push([10 + i, 9], [10 + i, 10 + hzG], [9, 10 + i], [10 + hzG, 10 + i]);

  // Parallelstrang (60 %)
  if (r() < 0.6) {
    const links = r() < 0.5, sx = links ? 9 : 10 + hzG, dx = links ? -1 : 1;
    const luecke = r() < 0.6 ? 1 : 2, L = 4 + Math.floor(r() * 7), ra = Math.floor(r() * 5), rb = Math.floor(r() * 5), yB = 11 + luecke;
    for (let s = 0; s < L; s++) lege(sx + dx * s, 10, ra);
    for (let y = 11; y <= yB; y++) lege(sx, y, rb);
    for (let s = 1; s < L; s++) lege(sx + dx * s, yB, rb);
    for (let s = 1; s < L - 1; s += 1 + Math.floor(r() * 2)) {
      const typ: TypId = luecke === 1 ? pick(['efh', 'rh', 'baeck'] as TypId[]) : pick(['mfh', 'bad', 'klinik'] as TypId[]);
      const g = KATALOG[typ].groesse ?? 1, x = links ? sx + dx * s - (g - 1) : sx + dx * s;
      if (!flaecheFrei(x, 11, g)) continue;
      const o: Objekt = { id: id++, typ, x, y: 11, stufe: 1, bau: null, kasse_eur: 0, station: passendeStation(KATALOG[typ].bedarf_kw as number).id };
      if (KATALOG[typ].kategorie === 'gross') o.zustand = 'vertrag';
      objekte.push(o);
      if (g === 2) s++;
    }
  }

  // Zufallsstränge (1–6)
  const straenge = 1 + Math.floor(r() * 4) + (r() < 0.5 ? 2 : 0);
  const richtungen: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let w = 0; w < straenge; w++) {
    let [x, y] = w < 2 || leitungen.length === 0 || r() < 0.4
      ? pick(startFelder)
      : ((): [number, number] => { const f = pick(leitungen); return [f % N, Math.floor(f / N)]; })();
    let rang = Math.floor(r() * 5);
    let d = pick(richtungen);
    const laenge = 3 + Math.floor(r() * 13);
    for (let s = 0; s < laenge; s++) {
      if (frei(x, y)) lege(x, y, rang);
      else if (!leitungen.includes(y * N + x) && s > 0) break;
      if (r() < 0.25) d = pick(richtungen);
      if (r() < 0.12 && rang > 0) rang--;
      x += d[0]; y += d[1];
      if (x < 0 || y < 0 || x >= N || y >= N) break;
    }
  }

  // Weitere Gebäude (6–23)
  const zahl = 6 + Math.floor(r() * 18);
  for (let i = 0; i < zahl; i++) {
    const typ: TypId = r() < 0.25 ? pick(['bad', 'klinik', 'mfh'] as TypId[]) : pick(['efh', 'efh', 'rh', 'baeck', 'mfh'] as TypId[]);
    const g = KATALOG[typ].groesse ?? 1;
    for (let v = 0; v < 40; v++) {
      const f = pick(leitungen);
      const x = f % N + Math.floor(r() * 3) - 1 - (g - 1) * Math.floor(r() * 2);
      const y = Math.floor(f / N) + Math.floor(r() * 3) - 1 - (g - 1) * Math.floor(r() * 2);
      if (!flaecheFrei(x, y, g)) continue;
      const o: Objekt = { id: id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, station: passendeStation(KATALOG[typ].bedarf_kw as number).id };
      if (KATALOG[typ].kategorie === 'gross') o.zustand = 'vertrag';
      if (r() < 0.1) { delete o.station; o.ohne_station = true; }
      objekte.push(o);
      break;
    }
  }

  // Puffer (30 %)
  if (r() < 0.3) {
    for (let v = 0; v < 40; v++) {
      const f = pick(leitungen); const x = f % N + 1, y = Math.floor(f / N);
      if (frei(x, y)) { objekte.push({ id: id++, typ: 'puffer', x, y, stufe: 1, bau: null, kasse_eur: 0 }); break; }
    }
  }
  r(); // ungenutzte Ziehung, hält die Zufallsfolge gleich wie im Prototyp (Bauplan Abschnitt 6)

  // Upgrades und Hauspuffer
  for (const o of objekte) {
    if (!o.station) continue;
    if (r() < 0.4) o.upgrade = 1 + Math.floor(r() * 3);
    if (r() < 0.15) o.hauspuffer = true;
  }
  const neben = (g: number): [number, number] | null => {
    for (let v = 0; v < 40; v++) {
      const f = pick(leitungen);
      const x = f % N + (r() < 0.5 ? 1 : -g), y = Math.floor(f / N) - Math.floor(r() * g);
      if (flaecheFrei(x, y, g)) return [x, y];
    }
    return null;
  };
  // Wärmequellen (50 %, 1–3 Stück)
  if (r() < 0.5) {
    const z = 1 + Math.floor(r() * 3);
    for (let i = 0; i < z; i++) {
      const typ = pick(['pv', 'solar', 'sonde', 'puffer'] as TypId[]);
      const p = neben(KATALOG[typ].groesse ?? 1);
      if (p) objekte.push({ id: id++, typ, x: p[0], y: p[1], stufe: 1 + Math.floor(r() * 2), bau: null, kasse_eur: 0 });
    }
  }
  // Sägewerk mit Abwärme (30 %)
  if (r() < 0.3) {
    const p = neben(2);
    if (p) objekte.push({ id: id++, typ: 'gewerbe', x: p[0], y: p[1], stufe: 1, bau: null, kasse_eur: 0, zustand: 'vertrag' });
  }
  const kesselStufe = r() < 0.35 ? 1 : 1 + Math.floor(r() * 5);
  const innen: InnenQuelle[] = [{ typ: 'kessel', stufe: kesselStufe, bau: null }];
  const vorlauf_c = r() < 0.7 ? 75 : 55 + 5 * Math.floor(r() * 7);
  return { objekte, innen, vorlauf_c };
}

/** Alle Planungsfehler-Kennungen eines Netzes (e = W1-Engpass, r = A67-Reduzierung, a = A76-Aufteilung, je mit Feld). */
function warnungen(n: Netz): Set<string> {
  return new Set([
    ...[...n.engpass].map((f) => `engpass ${f}`),
    ...[...n.reduzierung].map((f) => `reduzierung ${f}`),
    ...[...n.aufteilung].map((f) => `aufteilung ${f}`),
  ]);
}

/**
 * Verstöße der neuen Rechnung gegen die alte (leer = gut), Bauplan P0:
 * (a) nicht weniger warme Häuser; (b)+(c) jedes alt warme Haus ist neu warm; (d) keine neue Planungsfehler-Kennung;
 * (e) verfügbare Wärme genau gleich.
 */
export function pruefeVergleich(alt: Netz, neu: Netz): string[] {
  const v: string[] = [];
  if (neu.warm.size < alt.warm.size) v.push(`(a) weniger warme Häuser: alt ${alt.warm.size}, neu ${neu.warm.size}`);
  for (const id of alt.warm) if (!neu.warm.has(id)) v.push(`(b) Haus ${id} war warm, ist neu kalt (${neu.kalt.get(id) ?? 'nicht angeschlossen'})`);
  const wa = warnungen(alt);
  for (const w of warnungen(neu)) if (!wa.has(w)) v.push(`(d) neue Warnung ${w}`);
  if (neu.verfuegbar_kw !== alt.verfuegbar_kw) v.push(`(e) verfügbare Wärme alt ${alt.verfuegbar_kw} kW, neu ${neu.verfuegbar_kw} kW`);
  return v;
}
