import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand, type Ereignis } from '../src/core/spiel';
import { KONSTANTEN, istLeitung, passendeStation, type TypId } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import type { Objekt } from '../src/core/typen';
import tokens from '../design/tokens.json';
import { Kamera } from '../src/render/kamera';
import { dreieckFelder, dreieckTreffer } from '../src/render/ueberlast';
import { abschnittOeffnen, objektBei, vorstellen, type Uhr } from './hilfen/nr18';

// Bauplan docs/bauplaene/NR20-22.md Fassung 2.4, P6 (E5, E6). Erwartungen von Hand aus dem Startdorf hergeleitet:
// Heizzentrale 2×2 ab (11|10). Stamm als 25er von (11|9) nach Westen bis (6|9) – 6 Felder –, danach eine 40er bis (3|9),
// (2|9), (2|8). Kunden: Reihenhaus (3|10) 16 kW und EFH (2|7) 10 kW, beide ohne Puffer → 26 kW durch den ganzen Stamm.
// 25er trägt 15 kW, 32er 25 kW, 40er 40 kW (Katalog, Spreizung 20 K) → der Stamm ist zu dünn, die 32er reicht nicht, die 40er schon.
// Katalogpreise (kosten_eur[0], mit Kostenfaktor 40): d25 400 €, d32 560 €, d40 800 €; Rückkauf 50 % des alten Typs.
const T0 = 1_000_000_000_000;
const N = KONSTANTEN.feldanzahl;
const feld = (x: number, y: number): number => y * N + x;
const STAMM: ReadonlyArray<[number, number]> = [[11, 9], [10, 9], [9, 9], [8, 9], [7, 9], [6, 9]];
const ENDE: ReadonlyArray<[number, number]> = [[5, 9], [4, 9], [3, 9], [2, 9], [2, 8]];
const STAMM_FELDER = STAMM.map(([x, y]) => feld(x, y));
const TEXT_ERSATZ_AUSSERHALB = 'Dickere Leitungen entstehen nur im Bauabschnitt – lass Philipp einen planen.';

function leeresDorf(): { s: Spiel; z: Uhr } {
  const z = { t: T0 };
  const st = neuerSpielstand(T0);
  st.objekte = st.objekte.filter((o) => !istLeitung(o.typ));
  for (const o of st.objekte) if (o.station) { delete o.station; o.ohne_station = true; }
  const s = new Spiel(st, () => z.t);
  if (!s.stand.quelle_gewaehlt) s.ersteQuelleWaehlen('kessel');
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.length = 0;
  return { s, z };
}
const zeichne = (s: Spiel, typ: TypId, weg: ReadonlyArray<[number, number]>): void => {
  for (const [x, y] of weg) expect(s.platzieren(typ, x, y).ok, `platzieren ${typ} (${x}|${y})`).toBe(true);
};
const haus = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => !istLeitung(o.typ) && o.typ !== 'hz')!;
const leitung = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => istLeitung(o.typ))!;
const stammLeitungen = (s: Spiel): Objekt[] => STAMM.map(([x, y]) => leitung(s, x, y));
const bauen = (s: Spiel, z: Uhr): void => {
  expect(s.materialBestellen().ok).toBe(true);
  vorstellen(s, z, KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
  expect(s.stand.abschnitt).toBeUndefined();
};
/** Stamm und Ende eingezeichnet, beide Kunden mit Station, Abschnitt abgeschlossen (noch nicht bestellt). */
function eingezeichnet(): { s: Spiel; z: Uhr } {
  const d = leeresDorf();
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  zeichne(d.s, 'd25', STAMM);
  zeichne(d.s, 'd40', ENDE);
  for (const [x, y] of [[3, 10], [2, 7]]) {
    const h = haus(d.s, x, y);
    expect(d.s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
  }
  expect(d.s.abschnittAbschliessen().ok).toBe(true);
  return d;
}
/** Wie oben, gebaut: der 25er-Stamm ist überlastet. */
function gebaut(): { s: Spiel; z: Uhr } {
  const d = eingezeichnet();
  bauen(d.s, d.z);
  return d;
}
/** Gebaut und ein neuer Abschnitt offen. */
function gebautOffen(): { s: Spiel; z: Uhr } {
  const d = gebaut();
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  return d;
}
const hinweise = (s: Spiel): string[] => s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'hinweis' }> => e.art === 'hinweis').map((e) => e.text);

describe('NR22 P6 Kern: überlastete Stücke (E5)', () => {
  it('test_nr22_stueck_wie_warnliste: gleiche Empfehlung wie die Warnliste; eingezeichnete Leitungen zählen nicht', () => {
    const { s, z } = eingezeichnet();
    expect(bedarfKw(haus(s, 3, 10))).toBe(16);
    expect(bedarfKw(haus(s, 2, 7))).toBe(10);
    // 26 kW − 15 kW = 11 kW fehlen; die 32er (25 kW) reicht nicht, die 40er (40 kW) schon
    expect(s.abschnittWarnungen()).toHaveLength(1);
    expect(s.abschnittWarnungen()[0]).toContain('es fehlen 11 kW. Zeichne eine 40er darüber.');
    // nur eingezeichnet: noch kein Stück (E5 „Eingezeichnete Leitungen bekommen kein Dreieck“)
    expect(s.ueberlastStuecke()).toEqual([]);
    bauen(s, z);
    expect(s.ueberlastStuecke()).toEqual([{
      felder: STAMM_FELDER, typ: 'd25', last_kw: 26, kapazitaet_kw: 15, an_heizzentrale: true, geplant: false, empfohlen: 'd40',
    }]);
  });

  it('test_nr22_vorlauf_unter_60: Spreizungsfaktor < 1 → kapazitaet_kw = Katalog × Faktor', () => {
    const { s } = gebaut();
    s.stand.vorlauf_c = 55; // Rücklauf mindestens 40 °C → 15 K statt 20 K Spreizung → Faktor 0,75 (A73)
    s.neuBerechnen();
    expect(s.netz.spreizung_faktor).toBeCloseTo(0.75);
    const [st] = s.ueberlastStuecke();
    expect(st.kapazitaet_kw).toBeCloseTo(11.25); // 15 kW × 0,75
    expect(st.last_kw).toBe(26);
    // 40er: 40 kW × 0,75 = 30 kW ≥ 26 kW, die 32er mit 18,75 kW nicht
    expect(st.empfohlen).toBe('d40');
  });
});

describe('NR22 P6 Kern: ganzes Stück vergrößern (E6)', () => {
  it('test_nr22_ganzes_stueck: beliebiges Feld → alle 6 Felder Ersatz, Preis = Σ ersatzPreis_eur', () => {
    const { s } = gebautOffen();
    const stamm = stammLeitungen(s);
    // 800 € neue 40er − 200 € Rückkauf der 25er; kein Fluss auf Reihe 9
    for (const o of stamm) expect(s.ersatzPreis_eur(o, 'd40')).toBe(600);
    expect(s.stueckOffeneFelder(feld(8, 9), 'd40')).toEqual(STAMM_FELDER);
    s.ereignisse.length = 0;
    expect(s.stueckVergroessern(feld(8, 9), 'd40')).toEqual({ ok: true });
    expect(stamm.map((o) => o.ersatz?.typ)).toEqual(['d40', 'd40', 'd40', 'd40', 'd40', 'd40']);
    expect(s.ersatz_eur()).toBe(3600);
    expect(s.stueckOffeneFelder(feld(8, 9), 'd40')).toEqual([]);
    expect(hinweise(s)).toEqual([]);
    // das Ende (40er) ist nicht Teil des Stücks und bleibt unberührt
    expect(ENDE.map(([x, y]) => leitung(s, x, y).ersatz)).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });

  it('test_nr22_ganzes_stueck: Feld außerhalb eines Stücks oder zu kleine Größe → { ok: false } ohne Hinweis', () => {
    const { s } = gebautOffen();
    s.ereignisse.length = 0;
    expect(s.stueckOffeneFelder(feld(4, 9), 'd40')).toEqual([]);
    expect(s.stueckVergroessern(feld(4, 9), 'd40')).toEqual({ ok: false });
    // gleich groß wie das Stück selbst ist kein Vergrößern
    expect(s.stueckOffeneFelder(feld(8, 9), 'd25')).toEqual([]);
    expect(s.stueckVergroessern(feld(8, 9), 'd25')).toEqual({ ok: false });
    expect(stammLeitungen(s).every((o) => !o.ersatz)).toBe(true);
    expect(hinweise(s)).toEqual([]);
  });

  it('test_nr22_teilweise_geplant: 2 der 6 Felder mit Ersatz ≥ typ → 4 offen, 4 geplant, danach offen = []', () => {
    const { s } = gebautOffen();
    const stamm = stammLeitungen(s);
    expect(s.ersatzPlanen(stamm[1].id, 'd40').ok).toBe(true);
    expect(s.ersatzPlanen(stamm[4].id, 'd40').ok).toBe(true);
    expect(s.ersatzPlanen(stamm[2].id, 'd32').ok).toBe(true); // kleinerer Ersatz: wird abgelöst
    const nr1 = stamm[1].ersatz!.nr, nr4 = stamm[4].ersatz!.nr;
    const offen = [STAMM_FELDER[0], STAMM_FELDER[2], STAMM_FELDER[3], STAMM_FELDER[5]];
    expect(s.stueckOffeneFelder(feld(11, 9), 'd40')).toEqual(offen);
    // die 32er-Stufe ist für die schon geplanten Felder erledigt, offen sind nur die drei ohne Ersatz
    expect(s.stueckOffeneFelder(feld(11, 9), 'd32')).toEqual([STAMM_FELDER[0], STAMM_FELDER[3], STAMM_FELDER[5]]);
    expect(s.stueckVergroessern(feld(6, 9), 'd40')).toEqual({ ok: true });
    expect(stamm.map((o) => o.ersatz?.typ)).toEqual(['d40', 'd40', 'd40', 'd40', 'd40', 'd40']);
    // schon passende Felder bleiben unverändert (gleiche Ersatz-Nummer)
    expect([stamm[1].ersatz!.nr, stamm[4].ersatz!.nr]).toEqual([nr1, nr4]);
    expect(s.stueckOffeneFelder(feld(11, 9), 'd40')).toEqual([]);
  });

  it('test_nr22_ganz_oder_gar_nicht: Phase bestellen → nichts geplant, Hinweis ERSATZ_NUR_IM_ABSCHNITT; gesperrte Größe → Sperrsatz', () => {
    const { s } = gebautOffen();
    zeichne(s, 'd25', [[13, 10]]);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.stueckVergroessern(feld(8, 9), 'd40')).toEqual({ ok: false, hinweis: TEXT_ERSATZ_AUSSERHALB });
    expect(stammLeitungen(s).every((o) => !o.ersatz)).toBe(true);
    // kein Stück an diesem Feld (40er-Ende): stilles Nein, kein Satz über den Bauabschnitt
    expect(s.stueckVergroessern(feld(4, 9), 'd40')).toEqual({ ok: false });
    // offen, aber 50er auf Stufe 1 gesperrt (A88): nichts geplant
    expect(s.abschnittWiederOeffnen().ok).toBe(true);
    expect(s.stueckVergroessern(feld(8, 9), 'd50')).toEqual({ ok: false, hinweis: '50er-Leitung ab Heizzentrale Stufe 2' });
    expect(stammLeitungen(s).every((o) => !o.ersatz)).toBe(true);
  });

  it('test_nr22_vergroessern_ohne_geld: Geld 0 → ok, alle Felder Ersatz; Bestellen scheitert am Geld, Ersatz bleibt geplant', () => {
    const { s } = gebautOffen();
    s.stand.geld_eur = 0;
    expect(s.stueckVergroessern(feld(10, 9), 'd40')).toEqual({ ok: true });
    expect(stammLeitungen(s).map((o) => o.ersatz?.typ)).toEqual(['d40', 'd40', 'd40', 'd40', 'd40', 'd40']);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    // 6 × 600 € Ersatz, nichts eingezeichnet
    expect(s.materialBestellen()).toEqual({ ok: false, hinweis: 'Es fehlen 3.600 €' });
    expect(stammLeitungen(s).map((o) => o.ersatz?.typ)).toEqual(['d40', 'd40', 'd40', 'd40', 'd40', 'd40']);
  });
});

describe('NR22 P6 Dreiecke auf einem Stück (E9)', () => {
  /** Gerades Stück senkrecht in Spalte 3: Feld i liegt auf (3|i), Tiefe i + 1 – so liegen Dreiecke 8 Felder auseinander. */
  const gerade = (n: number): { felder: number[]; tiefe: Map<number, number> } => {
    const felder = Array.from({ length: n }, (_, i) => feld(3, i));
    return { felder, tiefe: new Map(felder.map((f, i) => [f, i + 1])) };
  };
  const TABELLE: Array<[number, number[]]> = [
    [1, [0]], [8, [0]], [9, [0]], [12, [0]], [13, [0, 8]], [17, [0, 8]], [20, [0, 8]], [21, [0, 8, 16]],
    [28, [0, 8, 16]], // 27 − 24 = 3 < 4
    [29, [0, 8, 16, 24]],
  ];
  it.each(TABELLE)('test_nr22_dreiecke: gerades Stück mit %i Feldern → Indizes %j', (n, indizes) => {
    const { felder, tiefe } = gerade(n);
    expect(dreieckFelder([felder], tiefe, N)).toEqual([indizes.map((i) => felder[i])]);
  });

  it('test_nr22_dreiecke verzweigt: Stamm Tiefe 1–6, zwei Äste Tiefe 7–14 → Kandidat Tiefe 9 mit kleinerer Feldnummer, 14 − 9 = 5 ≥ 4', () => {
    // Stamm (0|10) … (5|10); Ast A nach Osten (6|10) … (13|10), Ast B nach Süden (5|11) … (5|18)
    const stamm = Array.from({ length: 6 }, (_, i) => feld(i, 10));
    const astA = Array.from({ length: 8 }, (_, i) => feld(6 + i, 10));
    const astB = Array.from({ length: 8 }, (_, i) => feld(5, 11 + i));
    const tiefe = new Map<number, number>([
      ...stamm.map((f, i): [number, number] => [f, i + 1]),
      ...astA.map((f, i): [number, number] => [f, i + 7]),
      ...astB.map((f, i): [number, number] => [f, i + 7]),
    ]);
    // Tiefe 9: (8|10) = 248 und (5|13) = 317 → 248; Ast B steht absichtlich vorn in der Liste
    expect(feld(8, 10)).toBe(248);
    expect(feld(5, 13)).toBe(317);
    expect(dreieckFelder([[...stamm, ...astB, ...astA]], tiefe, N)).toEqual([[feld(0, 10), 248]]);
    // Äste nur bis Tiefe 12: 12 − 9 = 3 < 4 → nur das erste Dreieck
    const kurz = [...stamm, ...astA.slice(0, 6), ...astB.slice(0, 6)];
    expect(dreieckFelder([kurz], tiefe, N)).toEqual([[feld(0, 10)]]);
  });

  it('test_nr22_dreiecke zwei Stücke: näher als 1,5 Felder → das spätere entfällt; genau 2 Felder bleibt', () => {
    const a = [feld(5, 5), feld(5, 4)], tiefe = new Map<number, number>([[feld(5, 5), 1], [feld(5, 4), 2]]);
    const nah = [feld(6, 5)], schraeg = [feld(6, 6)], weit = [feld(7, 5)];
    for (const f of [...nah, ...schraeg, ...weit]) tiefe.set(f, 3);
    expect(dreieckFelder([a, nah], tiefe, N)).toEqual([[feld(5, 5)], []]); // Abstand 1
    expect(dreieckFelder([a, schraeg], tiefe, N)).toEqual([[feld(5, 5)], []]); // Abstand √2 ≈ 1,41
    expect(dreieckFelder([a, weit], tiefe, N)).toEqual([[feld(5, 5)], [feld(7, 5)]]); // Abstand 2
    // die Feldnummer wird mit der übergebenen Kartenbreite zerlegt: bei Breite 40 liegen 125 = (5|3) und 166 = (6|4) √2 auseinander
    const t40 = new Map<number, number>([[125, 1], [166, 1]]);
    expect(dreieckFelder([[125], [166]], t40, 40)).toEqual([[125], []]);
    expect(dreieckFelder([[125], [166]], t40, 24)).toEqual([[125], [166]]);
  });

  it('test_nr22_dreiecke ohne Tiefe für ein Feld → Fehler statt stiller Annahme', () => {
    expect(() => dreieckFelder([[feld(1, 1)]], new Map(), N)).toThrow(/Tiefe/);
  });
});

describe('NR22 P6 Treffer auf ein Dreieck (E9, DESIGN 13.17.3)', () => {
  /** 844×390, Zoom 3: Feldbreite 78 px (Basis min(844/26, 390/15) = 26). Dreieck: Pfosten 78 × 0,18 = 14,04 px, Kante
   *  78 × 0,34 = 26,52 px, Höhe 26,52 × √3/2 = 22,97 px → Mitte 14,04 + 11,48 = 25,52 px über der Leitungsmitte. */
  const kamera = (): Kamera => { const k = new Kamera(); k.groesseSetzen(844, 390, 1); k.zoom = 3; return k; };
  const ueberlast = [
    { felder: [feld(11, 9), feld(10, 9)], dreiecke: [feld(11, 9)], geplant: false, seit_ms: 0 },
    { felder: [feld(4, 14)], dreiecke: [feld(4, 14)], geplant: true, seit_ms: 0 },
  ];
  it('test_nr22_treffer_44px: Treffer liefert das Dreieck-Feld; 44 × 44 px um die Dreiecksmitte', () => {
    const k = kamera();
    expect(k.tw).toBe(78);
    const [bx, by] = k.mitte(11, 9), my = by - 25.52;
    expect(dreieckTreffer(k, ueberlast, bx, my)).toBe(feld(11, 9));
    expect(dreieckTreffer(k, ueberlast, bx + 21.9, my - 21.9)).toBe(feld(11, 9));
    expect(dreieckTreffer(k, ueberlast, bx - 21.9, my + 21.9)).toBe(feld(11, 9));
    expect(dreieckTreffer(k, ueberlast, bx + 22.5, my)).toBeNull();
    expect(dreieckTreffer(k, ueberlast, bx, my - 22.5)).toBeNull();
    // die Leitung selbst (25,5 px unter der Mitte) trifft das Dreieck nicht – ihr Antippen bleibt wie heute
    expect(dreieckTreffer(k, ueberlast, bx, by)).toBeNull();
    const [cx, cy] = k.mitte(4, 14);
    expect(dreieckTreffer(k, ueberlast, cx, cy - 25.52)).toBe(feld(4, 14));
    // Feld ohne Dreieck (10|9) und leere Szene
    const [dx, dy] = k.mitte(10, 9);
    expect(dreieckTreffer(k, ueberlast, dx + 5, dy - 25.52)).toBeNull();
    expect(dreieckTreffer(k, undefined, bx, my)).toBeNull();
  });
  it('test_nr22_treffer_44px: Zoom 1 → Kante mindestens 16 px', () => {
    // Feldbreite 26: Pfosten 4,68 px, Kante max(8,84; 16) = 16 px, Höhe 13,86 px → Mitte 4,68 + 6,93 = 11,61 px über der Leitung
    const k = kamera(); k.zoom = 1;
    const [bx, by] = k.mitte(11, 9);
    expect(dreieckTreffer(k, ueberlast, bx, by - 11.61 - 21.9)).toBe(feld(11, 9));
    expect(dreieckTreffer(k, ueberlast, bx, by - 11.61 - 22.5)).toBeNull();
  });
});

describe('NR22 P6 Randfälle Dreieck und Tokens', () => {
  it('test_nr22_dreiecke leeres Stück → keine Dreiecke', () => {
    expect(dreieckFelder([[]], new Map(), N)).toEqual([[]]);
  });
  it('test_nr22_treffer_44px: überdecken sich zwei Tippflächen, gewinnt das nähere Dreieck', () => {
    const k = new Kamera(); k.groesseSetzen(844, 390, 1); k.zoom = 3;
    // (11|9) und (12|9) liegen im Bild 39 px waagrecht und 19,5 px senkrecht auseinander – die Tippflächen überdecken sich
    const ueberlast = [{ felder: [feld(11, 9)], dreiecke: [feld(11, 9)], geplant: false, seit_ms: 0 },
      { felder: [feld(12, 9)], dreiecke: [feld(12, 9)], geplant: false, seit_ms: 0 }];
    const [ax, ay] = k.mitte(11, 9), [bx, by] = k.mitte(12, 9);
    expect(Math.abs(bx - ax)).toBeCloseTo(39);
    expect(Math.abs(by - ay)).toBeCloseTo(19.5);
    const mx = (ax + bx) / 2, my = (ay + by) / 2 - 25.52;
    const links = ax < bx ? feld(11, 9) : feld(12, 9), rechts = ax < bx ? feld(12, 9) : feld(11, 9);
    // 1 px neben der Mitte: 18,5 px zum einen, 20,5 px zum anderen Dreieck waagrecht, je 9,75 px senkrecht – beide Flächen treffen
    expect(dreieckTreffer(k, ueberlast, mx - 1, my)).toBe(links);
    expect(dreieckTreffer(k, ueberlast, mx + 1, my)).toBe(rechts);
  });
  it('test_nr22_wegfall_tokens: Blink-Rot, Blinktakt und orange Spur sind aus den Tokens entfernt (DESIGN 13.17.4)', () => {
    const t = tokens as unknown as Record<string, Record<string, Record<string, unknown>>>;
    expect(Object.keys(t.farbe.leitung)).not.toContain('ueberlast_a');
    expect(Object.keys(t.farbe.leitung)).not.toContain('ueberlast_b');
    expect(Object.keys(t.zeit_ms)).not.toContain('ueberlast_blinken_zyklus');
    expect(Object.keys(t.bewegung_reduziert)).not.toContain('ueberlast_blinken');
    expect(Object.keys(t.menue.farbe)).not.toContain('spur');
  });
});
