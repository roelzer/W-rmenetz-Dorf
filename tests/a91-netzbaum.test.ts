import { describe, expect, it } from 'vitest';
import { berechneNetz, bedarfKw } from '../src/core/netz';
import { passendeStation, type TypId } from '../src/core/katalog';
import { altesStartdorf } from './hilfen/altes-startdorf';
import type { InnenQuelle, Netz, Objekt } from '../src/core/typen';
import { berechneNetzAlt } from './hilfen/netz-alt-a91';
import { pruefeVergleich, zufallsNetz } from './hilfen/a91-netze';

// A91 P2 (Bauplan docs/bauplaene/NR15-netzmodell.md, Fassung 3 Nachtrag 1, AE-A91-2): Netzbaum. Eine Leitung wird nicht über
// ein dünneres Feld gespeist, wenn ein gleich naher, mindestens so dicker Nachbar die Last dahinter trägt.
// Bedarf = Jahresverbrauch ÷ 1.500 h: EFH 10, RH 16 kW. Kapazität d25 15, d32 25, d40 40, d50 60 kW (katalog.ts).
// Kessel Stufe 1 = 60 kW, Stufe 5 = 240 kW; Solarthermie Stufe 2 = 40 kW. Feldnummer = y · 24 + x.
// Jeder Test prüft auch das Ergebnis der eingefrorenen alten Rechnung (Gegenstück), damit sichtbar bleibt, was P2 ändert.

const N = 24;
const f = (x: number, y: number): number => y * N + x;

/** Kleiner Aufbau mit fortlaufenden IDs; Kunden bekommen eine passende Station. */
function aufbau() {
  const objekte: Objekt[] = [];
  let id = 1;
  const setze = (typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}): Objekt => {
    const o: Objekt = { id: id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra };
    objekte.push(o);
    return o;
  };
  const kunde = (typ: TypId, x: number, y: number): Objekt => {
    const o = setze(typ, x, y);
    o.station = passendeStation(bedarfKw(o)).id;
    return o;
  };
  const leitung = (typ: TypId, felder: Array<[number, number]>, extra: Partial<Objekt> = {}): void => {
    for (const [x, y] of felder) setze(typ, x, y, extra);
  };
  return { objekte, setze, kunde, leitung };
}
const kessel = (stufe: number): InnenQuelle[] => [{ typ: 'kessel', stufe, bau: null }];
const rechne = (objekte: Objekt[], stufe = 5): { neu: Netz; alt: Netz } =>
  ({ neu: berechneNetz(objekte, kessel(stufe), 2), alt: berechneNetzAlt(objekte, kessel(stufe), 2) });
const felder = (von: [number, number], bis: [number, number]): Array<[number, number]> => {
  const r: Array<[number, number]> = [];
  for (let y = von[1]; y <= bis[1]; y++) for (let x = von[0]; x <= bis[0]; x++) r.push([x, y]);
  return r;
};

/** Startdorf (neues Spiel) mit Kessel Stufe 1, dazu von Hand d25 (11|12),(12|12) und Station für das EFH (13|12). */
function startdorfMitAbkuerzung() {
  const objekte = altesStartdorf(1_000_000_000_000).objekte;
  let id = Math.max(...objekte.map((o) => o.id)) + 1;
  for (const [x, y] of [[11, 12], [12, 12]]) objekte.push({ id: id++, typ: 'd25', x, y, stufe: 1, bau: null, kasse_eur: 0 });
  const haus = objekte.find((o) => o.x === 13 && o.y === 12) as Objekt;
  delete haus.ohne_station;
  haus.station = passendeStation(bedarfKw(haus)).id;
  const an = (x: number, y: number): Objekt => objekte.find((o) => o.x === x && o.y === y) as Objekt;
  return { objekte, haeuser: [an(9, 13), an(12, 14), an(13, 12)] };
}

/**
 * Ring: d50 (2..6|0) und (6|1..6) bzw. bis (6|7); d32 (0|2..4) und (1..5|4). Das Feld (6|4) (d50) erreicht die
 * Breitensuche gleich nah über (5|4) (d32) und (6|3) (d50); (5|4) kommt zuerst.
 */
function ring(traegtNicht: boolean) {
  const a = aufbau();
  a.setze('hz', 0, 0);
  a.leitung('d50', [...felder([2, 0], [6, 0]), ...felder([6, 1], [6, traegtNicht ? 7 : 6])]);
  a.leitung('d32', [...felder([0, 2], [0, 4]), ...felder([1, 4], [5, 4])]);
  const efh = ([[3, 1], [5, 1], [7, 3], [3, 5], [5, 5], [7, 5], [7, 6]] as Array<[number, number]>).map(([x, y]) => a.kunde('efh', x, y));
  if (traegtNicht) efh.push(a.kunde('efh', 7, 7), a.kunde('efh', 5, 7));
  return { ...a, efh };
}

/** Heizzentrale 3×3 bei (0|0) mit zwei Einspeisepunkten (0|3) und (2|3); k = (1|5) (d50) hängt alt am dünneren (1|4) (d32). */
function heizzentrale3x3(hausTyp: TypId) {
  const a = aufbau();
  a.setze('hz', 0, 0, { stufe: 3 });
  a.leitung('d50', [[0, 3], [0, 4], [0, 5], [1, 5], [2, 5], [2, 4], [2, 3]]);
  a.leitung('d32', [[1, 4]]);
  const efh = a.kunde('efh', 1, 6);
  const haus = a.kunde(hausTyp, 3, 4);
  return { ...a, haeuser: [efh, haus] };
}

/**
 * Ecke: Heizzentrale (0|0); k = (2|2) (d40) grenzt an die Einspeisepunkte p = (1|2) und q = (2|1). Die Breitensuche
 * erreicht k zuerst über p (d32, dünner), q (Typ je Test) ist gleich nah. Dahinter d40 (2|3),(2|4) und ein EFH (3|3).
 */
function ecke(qTyp: TypId, qExtra: Partial<Objekt> = {}, pExtra: Partial<Objekt> = {}) {
  const a = aufbau();
  a.setze('hz', 0, 0);
  a.leitung('d32', [[1, 2]], pExtra);
  a.leitung(qTyp, [[2, 1]], qExtra);
  a.leitung('d40', [[2, 2], [2, 3], [2, 4]]);
  a.kunde('efh', 3, 3);
  return a;
}
const K = f(2, 2), P = f(1, 2), Q = f(2, 1);

describe('A91 P2 – Netzbaum', () => {
  it('A91: test_a91_hauptleitung_nicht_ueber_duenne_leitung_gespeist', () => {
    const { objekte, haeuser } = startdorfMitAbkuerzung();
    const { neu, alt } = rechne(objekte, 1);
    expect(alt.eltern.get(f(10, 12))).toBe(f(11, 12));
    expect(haeuser.filter((h) => !alt.warm.has(h.id))).toHaveLength(2);
    expect(neu.eltern.get(f(10, 12))).toBe(f(10, 11));
    expect(neu.tiefe.get(f(10, 12))).toBe(2);
    expect([...neu.engpass]).toEqual([]);
    for (const h of haeuser) expect(neu.warm.has(h.id)).toBe(true);
  });

  it('A91: test_a91_ring_last_hinter_umgehaengtem_feld_traegt', () => {
    const { objekte, efh } = ring(false);
    const { neu, alt } = rechne(objekte);
    expect(alt.eltern.get(f(6, 4))).toBe(f(5, 4));
    expect([alt.last_kw.get(f(2, 0)), alt.last_kw.get(f(0, 2))]).toEqual([30, 40]);
    expect([...alt.engpass].sort((x, y) => x - y)).toEqual([f(5, 4), f(6, 4)]);
    expect(neu.eltern.get(f(6, 4))).toBe(f(6, 3));
    expect(neu.tiefe.get(f(6, 4))).toBe(9);
    expect(neu.last_kw.get(f(2, 0))).toBe(50);
    expect(neu.last_kw.get(f(0, 2))).toBe(20);
    for (const h of efh) expect(neu.warm.has(h.id)).toBe(true);
    expect([...neu.engpass]).toEqual([]);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_ring_last_hinter_umgehaengtem_feld_traegt_nicht', () => {
    // Last hinter (6|4): 40 kW > Rest über (6|3) = 60 − 30 → kein Umhängen, Ergebnis wie alt
    const { objekte } = ring(true);
    const { neu, alt } = rechne(objekte);
    expect(neu.eltern.get(f(6, 4))).toBe(f(5, 4));
    expect([neu.last_kw.get(f(2, 0)), neu.last_kw.get(f(0, 2))]).toEqual([30, 60]);
    expect([...neu.eltern]).toEqual([...alt.eltern]);
    expect([...neu.kalt]).toEqual([...alt.kalt]);
    expect(neu.kalt.size).toBe(6);
    expect([...neu.warm]).toEqual([...alt.warm]);
  });

  it('A91: test_a91_kein_umhaengen_mit_quelle_im_teilbaum', () => {
    const { objekte, setze } = ring(false);
    const solar = setze('solar', 4, 6, { stufe: 2 });
    const { neu, alt } = rechne(objekte, 1);
    expect(neu.anschluss.get(solar.id)?.feld).toBe(f(6, 6));
    expect(neu.eltern.get(f(6, 4))).toBe(f(5, 4));
    // Kessel 60 kW + Solarthermie min(40, dünnstes Feld d32 25) = 85 kW; ohne Sperre wären es 60 + min(40, 60) = 100
    expect(neu.verfuegbar_kw).toBe(85);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_kein_umhaengen_mit_puffer_oder_gewerbe_im_teilbaum', () => {
    for (const [typ, x, extra] of [['puffer', 5, {}], ['gewerbe', 4, { zustand: 'vertrag' }]] as Array<[TypId, number, Partial<Objekt>]>) {
      const { objekte, setze } = ring(false);
      const o = setze(typ, x, 6, extra);
      const { neu, alt } = rechne(objekte, 1);
      expect(neu.anschluss.get(o.id)?.feld, typ).toBe(f(6, 6));
      expect(neu.eltern.get(f(6, 4)), typ).toBe(f(5, 4));
      expect(pruefeVergleich(alt, neu), typ).toEqual([]);
    }
  });

  it('A91: test_a91_heizzentrale_3x3_groesster_rest_gewinnt', () => {
    const { objekte, haeuser } = heizzentrale3x3('rh');
    const { neu, alt } = rechne(objekte);
    expect(alt.eltern.get(f(1, 5))).toBe(f(1, 4));
    expect([alt.last_kw.get(f(0, 3)), alt.last_kw.get(f(2, 3))]).toEqual([10, 16]);
    // Rest(2|5) = 60 − 16 = 44, Rest(0|5) = 60 − 10 = 50, Last hinter k = 10 → größter Rest (0|5)
    expect(neu.eltern.get(f(1, 5))).toBe(f(0, 5));
    expect(neu.tiefe.get(f(1, 5))).toBe(4);
    expect([...neu.engpass, ...neu.reduzierung, ...neu.aufteilung]).toEqual([]);
    for (const h of haeuser) expect(neu.warm.has(h.id)).toBe(true);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_heizzentrale_3x3_gleichstand_nachbarn_reihenfolge', () => {
    // Rest(2|5) = 50 = Rest(0|5) → Gleichstand → zuerst durchlaufener Nachbar von k aus ([1,0] = rechts = (2|5))
    const { objekte } = heizzentrale3x3('efh');
    const { neu, alt } = rechne(objekte);
    expect(alt.eltern.get(f(1, 5))).toBe(f(1, 4));
    expect(neu.eltern.get(f(1, 5))).toBe(f(2, 5));
  });

  it('A91: test_a91_tiefe_bleibt_kuerzester_abstand', () => {
    const aufbau6 = aufbau();
    aufbau6.setze('hz', 0, 0);
    aufbau6.leitung('d40', felder([2, 0], [2, 7]));
    aufbau6.kunde('efh', 1, 5);
    aufbau6.leitung('d25', [[1, 4], [0, 4]]);
    aufbau6.kunde('efh', 0, 5);
    const netze = [altesStartdorf(1_000_000_000_000).objekte, startdorfMitAbkuerzung().objekte, aufbau6.objekte, ring(false).objekte, ring(true).objekte];
    for (const objekte of netze) {
      const { neu, alt } = rechne(objekte);
      expect([...neu.tiefe]).toEqual([...alt.tiefe]);
      expect(neu.reihenfolge).toEqual(alt.reihenfolge);
    }
  });

  it('A91: test_a91_reihenfolge_eltern_vor_kind', () => {
    const netze: Array<{ objekte: Objekt[]; innen: InnenQuelle[]; vorlauf_c?: number }> = [
      { objekte: startdorfMitAbkuerzung().objekte, innen: kessel(1) },
      { objekte: ring(false).objekte, innen: kessel(5) },
    ];
    for (let seed = 1; seed <= 200; seed++) netze.push(zufallsNetz(seed));
    let umgehaengt = 0;
    for (const { objekte, innen, vorlauf_c } of netze) {
      const neu = berechneNetz(objekte, innen, 2, vorlauf_c);
      const alt = berechneNetzAlt(objekte, innen, 2, vorlauf_c);
      if ([...neu.eltern].some(([k, p]) => alt.eltern.get(k) !== p)) umgehaengt++;
      const platz = new Map(neu.reihenfolge.map((k, i) => [k, i]));
      for (const [k, p] of neu.eltern) if (p >= 0) expect(platz.get(p) as number).toBeLessThan(platz.get(k) as number);
    }
    expect(umgehaengt).toBeGreaterThan(2);
  });

  it('A91: test_a91_p2_wirkt_im_generator', () => {
    let anders = 0;
    for (let seed = 1; seed <= 3000; seed++) {
      const { objekte, innen, vorlauf_c } = zufallsNetz(seed);
      const alt = berechneNetzAlt(objekte, innen, 2, vorlauf_c);
      const neu = berechneNetz(objekte, innen, 2, vorlauf_c);
      if ([...neu.eltern].some(([k, p]) => alt.eltern.get(k) !== p)) anders++;
    }
    expect(anders).toBeGreaterThanOrEqual(100);
  }, 60_000);
});

describe('A91 P2 – keine neue Warnung durch Umhängen', () => {
  it('A91: test_a91_ecke_haengt_um', () => {
    // q = (2|1) d40: gleich dick wie k, kein weiteres Kind → Umhängen, Engpass (1|2)→(2|2) verschwindet
    const { objekte } = ecke('d40');
    const { neu, alt } = rechne(objekte);
    expect(alt.eltern.get(K)).toBe(P);
    expect([...alt.engpass].sort((x, y) => x - y)).toEqual([P, K]);
    expect(neu.eltern.get(K)).toBe(Q);
    expect([...neu.engpass, ...neu.reduzierung, ...neu.aufteilung]).toEqual([]);
  });

  it('A91: test_a91_p_verliert_abzweig_dann_nicht_umhaengen', () => {
    // p = (1|2) hat zwei Kinder: k und (1|3) (d25, dünner). Ohne k wäre p kein Abzweig mehr → neue A67 → bleibt.
    const a = ecke('d40');
    a.leitung('d25', [[1, 3]]);
    const { neu, alt } = rechne(a.objekte);
    expect(alt.eltern.get(f(1, 3))).toBe(P);
    expect(alt.reduzierung.size).toBe(0);
    expect(neu.eltern.get(K)).toBe(P);
    expect(neu.reduzierung.size).toBe(0);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_vorsehung_an_p_zaehlt_als_abzweig', () => {
    // Wie oben, aber p hat eine Vorsehung (A69): p bleibt ein Abzweig, also darf k umgehängt werden.
    const a = ecke('d40', {}, { vorsehung: true });
    a.leitung('d25', [[1, 3]]);
    const { neu, alt } = rechne(a.objekte);
    expect(neu.eltern.get(K)).toBe(Q);
    expect(neu.reduzierung.size).toBe(0);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_k_duenner_als_q_ohne_abzweig_nicht_umhaengen', () => {
    // q = (2|1) d50, ohne Kind, ohne Haus, ohne Vorsehung: k (d40) dahinter wäre eine Verjüngung ohne Abzweig → neue A67
    const { objekte } = ecke('d50');
    const { neu, alt } = rechne(objekte);
    expect(neu.eltern.get(K)).toBe(P);
    expect(neu.reduzierung.size).toBe(0);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_k_duenner_als_q_mit_vorsehung_haengt_um', () => {
    const { objekte } = ecke('d50', { vorsehung: true });
    const { neu, alt } = rechne(objekte);
    expect(neu.eltern.get(K)).toBe(Q);
    expect([...neu.engpass, ...neu.reduzierung, ...neu.aufteilung]).toEqual([]);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_k_duenner_als_q_mit_haus_an_q_haengt_um', () => {
    // EFH (3|1) endet an q (eigenes Leitungsende) → q ist ein Abzweig, die Verjüngung zu k ist erlaubt
    const a = ecke('d50');
    const haus = a.kunde('efh', 3, 1);
    const { neu, alt } = rechne(a.objekte);
    expect(neu.anschluss.get(haus.id)?.feld).toBe(Q);
    expect(neu.eltern.get(K)).toBe(Q);
    expect([...neu.engpass, ...neu.reduzierung, ...neu.aufteilung]).toEqual([]);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_q_mit_gleich_dickem_kind_nicht_umhaengen', () => {
    // q = (2|1) d40 hat schon das gleich dicke Kind (3|1); mit k liefen zwei Abgänge so dick weiter wie q → neue A76
    const a = ecke('d40');
    a.leitung('d40', [[3, 1]]);
    const { neu, alt } = rechne(a.objekte);
    expect(alt.eltern.get(f(3, 1))).toBe(Q);
    expect(neu.eltern.get(K)).toBe(P);
    expect(neu.aufteilung.size).toBe(0);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_q_mit_duennerem_kind_haengt_um', () => {
    // Gegenstück: Kind (3|1) ist d32 (dünner als q) → mit k nur ein gleich dicker Abgang, q wird Abzweig
    const a = ecke('d40');
    a.leitung('d32', [[3, 1]]);
    const { neu, alt } = rechne(a.objekte);
    expect(neu.eltern.get(K)).toBe(Q);
    expect([...neu.engpass, ...neu.reduzierung, ...neu.aufteilung]).toEqual([]);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_spaeteres_umhaengen_sieht_den_stand_nach_frueherem', () => {
    // Heizzentrale (0|1) (belegt (0..1|1..2)). d40 (1|0),(2|0),(3|0) oben, d25 (2|1),(3|1) rechts; die Breitensuche kommt
    // über die frühere Einspeisung (2|1) zuerst an (2|0) und (3|0). EFH (4|0) hängt an (3|0).
    // (2|0) hängt an (1|0) (Last 0). Danach (3|0): Rest über (2|0) auf dem neuen Baum = 40 ≥ 10; auf dem alten Baum
    // ginge der Weg über (2|1) mit Rest 15 − 10 = 5 < 10 → nur wer den Stand nach dem ersten Umhängen sieht, hängt um.
    const a = aufbau();
    a.setze('hz', 0, 1);
    a.leitung('d40', [[1, 0], [2, 0], [3, 0]]);
    a.leitung('d25', [[2, 1], [3, 1]]);
    const efh = a.kunde('efh', 4, 0);
    const { neu, alt } = rechne(a.objekte);
    expect([alt.eltern.get(f(2, 0)), alt.eltern.get(f(3, 0))]).toEqual([f(2, 1), f(3, 1)]);
    expect([neu.eltern.get(f(2, 0)), neu.eltern.get(f(3, 0))]).toEqual([f(1, 0), f(2, 0)]);
    expect([...neu.engpass, ...neu.reduzierung, ...neu.aufteilung]).toEqual([]);
    expect(neu.last_kw.get(f(1, 0))).toBe(10);
    expect(neu.warm.has(efh.id)).toBe(true);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_umhaengen_sieht_die_last_nach_dem_anschlusswechsel', () => {
    // Fall aus dem P0-Generator (Startwert 6662, Kessel 5, Vorlauf 80 °C): Die Bäckerei (7|16) wechselt in P1 von (8|16)
    // auf (6|16) und verlässt damit den Teilbaum von (8|13) (d50, alt am dünneren (9|13), d25). Erst mit der Last nach
    // diesem Wechsel trägt der gleich nahe, dickere Nachbar (8|12) (d63) den Teilbaum. Gefunden mit einer Wegwerf-Variante,
    // die die Last hinter k aus der Rechnung vor dem Wechsel nimmt: Dort bleibt (8|13) an (9|13).
    const { objekte, innen, vorlauf_c } = zufallsNetz(6662);
    const alt = berechneNetzAlt(objekte, innen, 2, vorlauf_c);
    const neu = berechneNetz(objekte, innen, 2, vorlauf_c);
    const baeckerei = objekte.find((o) => o.x === 7 && o.y === 16) as Objekt;
    expect([alt.anschluss.get(baeckerei.id)?.feld, neu.anschluss.get(baeckerei.id)?.feld]).toEqual([f(8, 16), f(6, 16)]);
    expect(alt.eltern.get(f(8, 13))).toBe(f(9, 13));
    expect(neu.eltern.get(f(8, 13))).toBe(f(8, 12));
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_gleich_dickes_elternfeld_bleibt', () => {
    // p = (1|2) ist so dick wie k (d40): kein „dünn speist dick“, also kein Umhängen auf q = (2|1). Damit der Durchgang
    // überhaupt läuft, gibt es woanders ein dünneres Elternfeld: d25 (0|2) speist d40 (0|3).
    const a = ecke('d40');
    const p = a.objekte.find((o) => o.x === 1 && o.y === 2) as Objekt;
    p.typ = 'd40';
    a.leitung('d25', [[0, 2]]);
    a.leitung('d40', [[0, 3]]);
    const { neu, alt } = rechne(a.objekte);
    expect(alt.eltern.get(K)).toBe(P);
    expect(alt.eltern.get(f(0, 3))).toBe(f(0, 2));
    expect(neu.eltern.get(K)).toBe(P);
  });

  it('A91: test_a91_p_verliert_zwei_kinder_nacheinander', () => {
    // Heizzentrale (0|4); d50 (2|5),(3|5), r = (4|5); p = (5|5) (d32) mit drei Kindern: k2 = (5|6), k1 = (5|4) (beide d40)
    // und c = (6|5) (d25). Gleich nahe, gleich dicke Nachbarn q2 = (4|6) und q1 = (4|4) hängen an r.
    // Zuerst hängt k2 an q2 (p bleibt mit k1 und c ein Abzweig). Danach hätte p ohne k1 nur noch das dünnere c → k1 bleibt.
    const a = aufbau();
    a.setze('hz', 0, 4);
    a.leitung('d50', [[2, 5], [3, 5], [4, 5]]);
    a.leitung('d32', [[5, 5]]);
    a.leitung('d40', [[5, 6], [5, 4], [4, 6], [4, 4]]);
    a.leitung('d25', [[6, 5]]);
    const { neu, alt } = rechne(a.objekte);
    expect([alt.eltern.get(f(5, 6)), alt.eltern.get(f(5, 4)), alt.eltern.get(f(6, 5))]).toEqual([f(5, 5), f(5, 5), f(5, 5)]);
    expect(neu.eltern.get(f(5, 6))).toBe(f(4, 6));
    expect(neu.eltern.get(f(5, 4))).toBe(f(5, 5));
    expect(neu.reduzierung.size).toBe(0);
    expect(pruefeVergleich(alt, neu)).toEqual([]);
  });

  it('A91: test_a91_nicht_verbundene_leitung_bleibt_ohne_tiefe', () => {
    const a = ecke('d40');
    a.leitung('d50', [[8, 8], [8, 9]]);
    const { neu } = rechne(a.objekte);
    expect(neu.tiefe.has(f(8, 8))).toBe(false);
    expect(neu.eltern.has(f(8, 8))).toBe(false);
    expect(neu.eltern.get(K)).toBe(Q);
  });
});
