import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand, type Ereignis } from '../src/core/spiel';
import { KATALOG, KONSTANTEN, STATIONEN, passendeStation } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import { pruefeAuftraege } from '../src/core/auftraege';
import type { Objekt } from '../src/core/typen';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import { abschnittBauen, abschnittOeffnen, abschnittWarnungen, ersatzPlanen, ersatzVon, objektBei, type Uhr } from './hilfen/nr18';

// NR18-P0 Teil B – Abnahme NR18 auf dem leeren Dorf (Bauplan docs/bauplaene/NR18-ohne-autoanschluss.md Fassung 3,
// Abschnitt 1 „Abnahme NR18 auf dem leeren Dorf“ (a)–(d) und Abschnitt 7 P0 Teil B).
// Bewusst rot bis NR18-P2 + NR18-P3 + NR18-P5 (leeres Startdorf mit vorgewähltem Kessel, Warnung, Ersatz, Hausblatt);
// der Projektleiter merged diese Datei nach P5.
// Stand 06.11. (eingespielt auf P5 af8b773): (b) grün – die P5-Voraussetzungen (leeres Dorf, Kessel vorgewählt, c1) sind erfüllt;
// die übrigen fünf Tests sind bewusst rot bis P2/P3 (Kommentar am Test). Keiner hängt an P4.
//
// Erwartete Werte von Hand aus dem Katalog (src/core/katalog.ts) und dem Bauplan, nicht mit dem Spielcode gerechnet:
// - 25er trägt 15 kW, 32er 25 kW (kapazitaet_kw), bei Spreizungsfaktor 1 (Vorbedingung, wird geprüft).
// - Einfamilienhaus 15.000 kWh/a ÷ 1.500 h = 10 kW (A71, ohne Puffer) – zwei Häuser = 20 kW > 15 kW → es fehlen 5 kW;
//   die kleinste dickere Leitung mit ≥ 20 kW ist die 32er (25 kW), auf Stufe 1 frei → „Zeichne eine 32er darüber.“
// - Heizzentrale (2×2) liegt auf (11|10)–(12|11). Die Spur (10|10)…(10|14), (11|14) führt zu den Häusern (9|13) (über (10|13))
//   und (12|14) (über (11|14)). Last 20 kW tragen (10|11), (10|12), (10|13); (10|10) ist ein lastfreier Stummel,
//   (10|14) und (11|14) tragen nur 10 kW (Kritik W2, Fassung 3).

const T0 = 1_000_000_000_000;
const N = KONSTANTEN.feldanzahl;
const TEXT_C = 'Die 25er an der Heizzentrale ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.';
/** Die Spur von der Heizzentrale nach Süden und zum Haus (12|14). */
const SPUR: ReadonlyArray<readonly [number, number]> = [[10, 10], [10, 11], [10, 12], [10, 13], [10, 14], [11, 14]];
/** Felder, die die Last beider Häuser tragen (Abnahme c). */
const ENGSTELLE = [11 * N + 10, 12 * N + 10, 13 * N + 10];

type EngstelleEreignis = { art: 'engstelle'; felder: number[] };
const engstellen = (s: Spiel): EngstelleEreignis[] =>
  (s.ereignisse as ReadonlyArray<Ereignis | EngstelleEreignis>).filter((e): e is EngstelleEreignis => e.art === 'engstelle');
const hausBei = (s: Spiel, x: number, y: number): Objekt => {
  const h = objektBei(s, x, y, (o) => KATALOG[o.typ].kategorie === 'haus');
  if (!h) throw new Error(`Testaufbau: kein Haus auf (${x}|${y})`);
  return h;
};
const leitungBei = (s: Spiel, x: number, y: number): Objekt | undefined =>
  objektBei(s, x, y, (o) => o.typ === 'd25' || o.typ === 'd32' || o.typ === 'd40');
const warmeHaeuser = (s: Spiel): string[] =>
  s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && s.netz.warm.has(o.id)).map((o) => `${o.x}|${o.y}`).sort();
const preis = (id: string): number => STATIONEN.find((st) => st.id === id)!.kosten_eur;

/** Leeres Dorf (nach P5), Abschnitt offen. Prüft die Vorbedingungen der Abnahme. */
function leeresDorfOffen(): { s: Spiel; z: Uhr } {
  const z: Uhr = { t: T0 };
  const s = new Spiel(neuerSpielstand(T0), () => z.t); // Kessel ist nach P5 vorgewählt – bewusst kein ersteQuelleWaehlen
  expect(s.stand.objekte.some((o) => o.typ === 'd25' || o.typ === 'd40'), 'leeres Dorf: keine Leitung beim Start (P5)').toBe(false);
  expect(s.stand.quelle_gewaehlt, 'Kessel vorgewählt (P5)').toBe(true);
  expect(s.netz.spreizung_faktor, 'Vorbedingung: Spreizungsfaktor 1').toBe(1);
  for (const [x, y] of [[9, 13], [12, 14]] as const) {
    const h = hausBei(s, x, y);
    expect(h.typ, `Vorbedingung: (${x}|${y}) ist ein Einfamilienhaus`).toBe('efh');
    expect(h.ohne_station, `(${x}|${y}) hat noch keine Station`).toBe(true);
    expect(bedarfKw(h)).toBe(10);
  }
  expect(abschnittOeffnen(s, z), 'Bauabschnitt offen').toBe(true);
  return { s, z };
}

/** Abnahme (b): 25er von der Heizzentrale bis (12|14) gezeichnet, Station gekauft, gebaut. */
function erstesHausAngeschlossen() {
  const { s, z } = leeresDorfOffen();
  const zeichnen = SPUR.map(([x, y]) => s.platzieren('d25', x, y));
  const haus = hausBei(s, 12, 14);
  const station = s.stationKaufen(haus.id, passendeStation(10).id);
  const markierungenNachStation = engstellen(s).length;
  const bau = abschnittBauen(s, z);
  pruefeAuftraege(s);
  return { s, z, haus, zeichnen, station, bau, markierungenNachStation };
}

/** Abnahme (c): zweites Haus (9|13) mit Wandstation an derselben 25er (ohne neuen Abschnitt). */
function zweitesHausGekauft() {
  const b = erstesHausAngeschlossen();
  const { s } = b;
  const haus2 = hausBei(s, 9, 13);
  const geld_vorher = s.stand.geld_eur;
  s.ereignisse.length = 0;
  const kauf = s.stationKaufen(haus2.id, 'st_15');
  return { ...b, haus2, geld_vorher, kauf };
}

/** Feld auf der Karte antippen wie ein Finger (echte Zeigerereignisse auf der Leinwand). */
function tippeFeld(u: EchteUmgebung, x: number, y: number): void {
  const k = u.st.kamera;
  const [mx, my] = k.mitte(x, y);
  const f = (k as unknown as { feld(a: number, b: number): [number, number] }).feld(mx, my);
  expect([f[0], f[1]], `Testaufbau: Feld (${x}|${y}) ist auf dem Bildschirm treffbar`).toEqual([x, y]);
  expect(mx > 0 && mx < k.breite && my > 0 && my < k.hoehe, `Testaufbau: Feld (${x}|${y}) sichtbar`).toBe(true);
  const canvas = u.dom.app.querySelector('canvas')!;
  const ev = { pointerId: 1, clientX: mx, clientY: my, pointerType: 'touch', button: 0 };
  canvas.ausloesen('pointerdown', ev);
  canvas.ausloesen('pointerup', ev);
}
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

describe('NR18 Abnahme auf dem leeren Dorf (Bauplan Abschnitt 1 (a)–(d), rot bis NR18-P2/P3/P5)', () => {
  // NR18 (a) rot bis P2/P3: Kern-Methode hausanschlussPlanen entfällt in P2, Knopf „Hausanschluss ziehen“ im Hausblatt in P3 (Stand P5, 06.11.).
  it('NR18: test_nr18_kein_knopf_hausanschluss_ziehen (a) – Hausblatt bei offenem Abschnitt nur mit „Leitung selbst legen“', async () => {
    const { s } = leeresDorfOffen();
    expect('hausanschlussPlanen' in s, 'keine automatische Wegsuche im Kern').toBe(false);
    const haeuser = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station);
    expect(haeuser.length).toBeGreaterThanOrEqual(2);
    await echteSteuerung(s, (u) => {
      for (const h of haeuser) {
        u.st.kontext(h.id);
        const texte = u.knoepfe().filter((k) => k.isConnected).map((k) => norm(`${k.textContent} ${k.attrs['aria-label'] ?? ''}`));
        expect(texte.filter((t) => t.includes('Hausanschluss ziehen')), `Haus (${h.x}|${h.y})`).toEqual([]);
        expect(texte.some((t) => t.includes('Leitung selbst legen')), `Haus (${h.x}|${h.y}): „Leitung selbst legen“ da`).toBe(true);
        u.st.kontext(null);
      }
    }, { uhr: () => T0 });
  });

  it('NR18: test_nr18_selbst_gezogen_warm (b) – 25er selbst bis (12|14) gezeichnet, Station, Bauzeit → warm, Auftrag c1', () => {
    const { s, haus, zeichnen, station, bau, markierungenNachStation } = erstesHausAngeschlossen();
    zeichnen.forEach((r, i) => expect(r.ok, `Feld ${SPUR[i].join('|')}: ${r.hinweis ?? ''}`).toBe(true));
    expect(station.ok).toBe(true);
    expect(station.hinweis, 'eine 25er reicht für ein Haus – keine Warnung').toBeUndefined();
    expect(markierungenNachStation, 'keine Engstellen-Markierung').toBe(0);
    expect(bau.abschliessen.ok).toBe(true);
    expect(bau.abschliessen.hinweis, 'Abschließen ohne Warnung').toBeUndefined();
    expect(bau.bestellen.ok, bau.bestellen.hinweis).toBe(true);
    expect(s.stand.abschnitt, 'Abschnitt gebaut').toBeUndefined();
    for (const [x, y] of SPUR) expect(leitungBei(s, x, y)?.geplant, `(${x}|${y}) gebaut`).toBeFalsy();
    expect(s.netz.warm.has(haus.id), 'Haus (12|14) warm').toBe(true);
    expect(warmeHaeuser(s)).toEqual(['12|14']);
    expect(s.stand.erledigt.c1).toBe(true);
    expect(s.stand.erledigt.c2, 'c2 (zwei Häuser) noch offen').toBeFalsy();
  });

  // NR18 (c) rot bis P2: Warnung beim Stationskauf (Hinweis, Meldung, Engstellen-Ereignis) kommt mit P2 (Stand P5, 06.11.).
  it('NR18: test_nr18_zu_duenn_warnt (c) – zweites Haus an derselben 25er: gekauft, Warnung mit Stück und kW, Markierung, kalt wegen Leitung', () => {
    const { s, haus2, geld_vorher, kauf } = zweitesHausGekauft();
    expect(kauf.ok, 'Warnung, keine Sperre').toBe(true);
    expect(s.stand.geld_eur).toBe(geld_vorher - preis('st_15'));
    expect(haus2.station).toBe('st_15');
    expect(haus2.ohne_station).toBeFalsy();
    expect(kauf.hinweis).toBe(TEXT_C);
    expect(s.ereignisse.some((e) => e.art === 'hinweis' && e.text === TEXT_C), 'Hinweis als Meldung').toBe(true);
    const m = engstellen(s);
    expect(m.length, 'genau eine Markierung').toBe(1);
    expect([...m[0].felder].sort((a, b) => a - b)).toEqual(ENGSTELLE);
    expect(s.netz.kalt.get(haus2.id)).toBe('leitung');
    expect(leitungBei(s, 10, 12)?.typ, 'Leitung bleibt, wie sie ist').toBe('d25');
  });

  // NR18 rot bis P2: Sofort-Tausch leitungTauschen entfällt und ersatzPlanen kommt mit P2 (Stand P5, 06.11.).
  it('NR18: test_nr18_ersatz_nur_im_bauabschnitt – ohne offenen Abschnitt wird keine dickere Leitung geplant, kein Sofort-Tausch', () => {
    const { s } = zweitesHausGekauft();
    expect('leitungTauschen' in s, 'Sofort-Tausch entfällt').toBe(false);
    const l = leitungBei(s, 10, 12)!;
    const geld = s.stand.geld_eur;
    const r = ersatzPlanen(s, l.id, 'd32');
    expect(r.ok).toBe(false);
    expect(r.hinweis).toBe('Dickere Leitungen entstehen nur im Bauabschnitt – lass Philipp einen planen.');
    expect(l.typ).toBe('d25');
    expect(ersatzVon(l)).toBeUndefined();
    expect(s.stand.geld_eur).toBe(geld);
  });

  // NR18 (d) rot bis P2/P3: ersatzPlanen und Ersatz beim Bauende in P2, Überzeichnen per Stempel (stempelnBei) in P3 (Stand P5, 06.11.).
  it('NR18: test_nr18_ersatz_macht_warm (d) – neuer Abschnitt, 32er per Steuerung über die 25er → nach dem Bau beide warm, c2', async () => {
    const { s, z, haus, haus2 } = zweitesHausGekauft();
    expect(abschnittOeffnen(s, z), 'zweiter Bauabschnitt offen').toBe(true);
    const felder: ReadonlyArray<readonly [number, number]> = [[10, 10], [10, 11], [10, 12], [10, 13]];
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d32');
      u.knoepfe().find((k) => k.isConnected && norm(k.textContent) === 'Verstanden')?.click(); // Erste-Nutzung-Hilfe zu
      for (const [x, y] of felder) tippeFeld(u, x, y);
    }, { uhr: () => z.t });
    for (const [x, y] of felder) {
      const l = leitungBei(s, x, y)!;
      expect(l.typ, `(${x}|${y}) bleibt bis zum Bauende eine 25er`).toBe('d25');
      expect(ersatzVon(l)?.typ, `(${x}|${y}) Ersatz geplant`).toBe('d32');
    }
    expect(s.stand.objekte.filter((o) => o.geplant), 'Überzeichnen legt keine zweite Leitung').toEqual([]);
    expect(s.abschnittKosten_eur()).toBeGreaterThan(0);
    expect(s.netz.kalt.get(haus2.id), 'bis zum Bauende rechnet das Netz mit der alten 25er').toBe('leitung');
    const bau = abschnittBauen(s, z);
    expect(bau.abschliessen.ok, bau.abschliessen.hinweis).toBe(true);
    expect(bau.bestellen.ok, bau.bestellen.hinweis).toBe(true);
    expect(s.stand.abschnitt).toBeUndefined();
    for (const [x, y] of felder) {
      const l = leitungBei(s, x, y)!;
      expect(l.typ, `(${x}|${y}) nach dem Bau`).toBe('d32');
      expect(ersatzVon(l)).toBeUndefined();
    }
    expect(leitungBei(s, 10, 14)?.typ, 'nicht überzeichnete Felder bleiben').toBe('d25');
    expect(s.netz.warm.has(haus.id) && s.netz.warm.has(haus2.id), 'beide Häuser warm').toBe(true);
    expect([...s.netz.kalt.values()].includes('leitung'), 'kein Haus kalt wegen Leitung').toBe(false);
    pruefeAuftraege(s);
    expect(s.stand.erledigt.c2).toBe(true);
  });

  // NR18 rot bis P2: Warnliste und Hinweis beim Abschließen (abschnittAbschliessen, abschnittWarnungen) kommen mit P2 (Stand P5, 06.11.).
  it('NR18: test_nr18_mehrere_haeuser_warnung_beim_abschliessen – drei Häuser an einer 25er: abschließen geht, Warnung nennt die 25er', () => {
    const { s } = leeresDorfOffen();
    for (const [x, y] of SPUR) expect(s.platzieren('d25', x, y).ok).toBe(true);
    // (13|12) über (11|12), (12|12) an die 25er auf (10|12)
    for (const [x, y] of [[11, 12], [12, 12]] as const) expect(s.platzieren('d25', x, y).ok).toBe(true);
    for (const [x, y] of [[12, 14], [9, 13], [13, 12]] as const) {
      const h = hausBei(s, x, y);
      expect(s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok, `Station (${x}|${y})`).toBe(true);
    }
    const geld = s.stand.geld_eur;
    s.ereignisse.length = 0;
    const r = s.abschnittAbschliessen();
    expect(r.ok, 'Warnung, keine Sperre').toBe(true);
    expect(r.hinweis ?? '').toContain('25er');
    expect(r.hinweis ?? '').toContain('zu dünn');
    expect(s.stand.abschnitt?.phase).toBe('bestellen');
    expect(s.stand.geld_eur, 'Abschließen kostet nichts').toBe(geld);
    const liste = abschnittWarnungen(s);
    expect(liste.length).toBeGreaterThan(0);
    expect(liste[0]).toContain('25er');
    expect(engstellen(s).length, 'Markierung auf der Karte').toBe(1);
    expect(engstellen(s)[0].felder).toEqual(expect.arrayContaining(ENGSTELLE));
  });
});
