import { describe, expect, it } from 'vitest';
import { berechneNetz, bedarfKw, eigenerAnschlussZuDuenn } from '../src/core/netz';
import { passendeStation, type TypId } from '../src/core/katalog';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { SPEICHER_SCHLUESSEL, SPEICHER_VERSION } from '../src/core/speichern';
import type { Netz, Objekt } from '../src/core/typen';
import { berechneNetzAlt } from './hilfen/netz-alt-a91';
import { kontextKarte } from './hilfen/kontext-attrappe';

// A91 P1 (Bauplan docs/bauplaene/NR15-netzmodell.md, Fassung 3 Nachtrag 1): Anschlusswahl und Wärmeverteilung.
// Bedarf = Jahresverbrauch ÷ 1.500 h: EFH 10, RH 16, Bäckerei 20, Klinik 70 kW. Kapazität d25 15, d32 25, d40 40, d50 60,
// d75 135 kW (katalog.ts). Kessel Stufe 2 = 90 kW, Stufe 5 = 240 kW. Feldnummer = y · 24 + x.
// Jeder Test prüft auch das Ergebnis der eingefrorenen alten Rechnung (Gegenstück), damit sichtbar bleibt, was A91 ändert.

const N = 24;
const T0 = 1_000_000_000_000;
const HINWEIS_EIGEN = 'Sein Hausanschluss ist zu dünn für dieses Haus. Ersetze ihn durch eine dickere Leitung – das Haus bekommt seine Wärme nur über diesen Anschluss.';
const HINWEIS_ALLGEMEIN = 'Angeschlossen, aber eine Leitung auf dem Weg ist zu dünn. Ersetze sie durch eine dickere Leitung.';

/** Kleiner Aufbau mit fortlaufenden IDs; Kunden bekommen eine passende Station, Großabnehmer einen Vertrag. */
function aufbau() {
  const objekte: Objekt[] = [];
  let id = 1;
  const setze = (typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}): Objekt => {
    const o: Objekt = { id: id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra };
    objekte.push(o);
    return o;
  };
  const kunde = (typ: TypId, x: number, y: number): Objekt => {
    const o = setze(typ, x, y, typ === 'klinik' ? { zustand: 'vertrag' } : {});
    o.station = passendeStation(bedarfKw(o)).id;
    return o;
  };
  const leitung = (typ: TypId, felder: Array<[number, number]>): void => { for (const [x, y] of felder) setze(typ, x, y); };
  const spalte = (x: number, y0: number, y1: number): Array<[number, number]> => Array.from({ length: y1 - y0 + 1 }, (_, i) => [x, y0 + i] as [number, number]);
  return { objekte, setze, kunde, leitung, spalte };
}
const rechne = (objekte: Objekt[], kessel: number): { neu: Netz; alt: Netz } => {
  const innen = [{ typ: 'kessel' as TypId, stufe: kessel, bau: null }];
  return { neu: berechneNetz(objekte, innen, 2), alt: berechneNetzAlt(objekte, innen, 2) };
};

/** V2/V1-Grundaufbau: d25 x=0 (y 2–7) ist näher, d40 x=2 (y 0–7) dicker; Haus bei (1|5) grenzt an beide. */
function zweiStraenge(hausTyp: TypId, efhY: number[]) {
  const a = aufbau();
  a.setze('hz', 0, 0);
  a.leitung('d25', a.spalte(0, 2, 7));
  a.leitung('d40', a.spalte(2, 0, 7));
  const haus = a.kunde(hausTyp, 1, 5);
  const efh = efhY.map((y) => a.kunde('efh', 3, y));
  return { ...a, haus, efh };
}

describe('A91 P1 – Anschlusswahl', () => {
  it('A91: test_a91_duenne_leitung_neben_warmem_haus_macht_es_nicht_kalt', () => {
    const a = aufbau();
    a.setze('hz', 0, 0);
    a.leitung('d40', a.spalte(2, 0, 7));
    const A = a.kunde('efh', 1, 5);
    a.leitung('d25', [[1, 4], [0, 4]]);
    const B = a.kunde('efh', 0, 5);
    const { neu, alt } = rechne(a.objekte, 5);
    expect(neu.anschluss.get(A.id)?.feld).toBe(5 * N + 2);
    expect(neu.warm.has(A.id) && neu.warm.has(B.id)).toBe(true);
    expect(neu.kalt.size).toBe(0);
    // alt: A hängt an der neuen dünnen (1|4) und überlastet sie zusammen mit B (20 > 15)
    expect(alt.anschluss.get(A.id)?.feld).toBe(4 * N + 1);
    expect([alt.kalt.get(A.id), alt.kalt.get(B.id)]).toEqual(['leitung', 'leitung']);
  });

  it('A91: test_a91_haus_wechselt_auf_leitung_mit_rest', () => {
    // alt an (0|5) (Tiefe 4 < 5), 16 > 15; die d40 trägt 20 + 16 = 36 ≤ 40
    const { objekte, haus, efh } = zweiStraenge('rh', [4, 5]);
    const { neu, alt } = rechne(objekte, 5);
    expect(neu.anschluss.get(haus.id)).toEqual({ feld: 5 * N + 2, tiefe: 5 });
    expect([haus, ...efh].every((o) => neu.warm.has(o.id))).toBe(true);
    expect(neu.kalt.size).toBe(0);
    expect(neu.last_kw.get(1 * N + 2)).toBe(36);
    expect(alt.anschluss.get(haus.id)?.feld).toBe(5 * N + 0);
    expect(alt.kalt.get(haus.id)).toBe('leitung');
  });

  it('A91: test_a91_haus_wechselt_nicht_auf_volle_leitung', () => {
    // die d40 hätte 30 + 16 = 46 > 40 – kein Wechsel; eine Regel ohne Restprüfung machte alle EFH kalt
    const { objekte, haus, efh } = zweiStraenge('rh', [4, 5, 6]);
    const { neu, alt } = rechne(objekte, 5);
    expect(neu.anschluss.get(haus.id)?.feld).toBe(5 * N + 0);
    expect(neu.kalt.get(haus.id)).toBe('leitung');
    expect(efh.every((o) => neu.warm.has(o.id))).toBe(true);
    expect(alt.anschluss.get(haus.id)?.feld).toBe(5 * N + 0);
    expect(alt.kalt.get(haus.id)).toBe('leitung');
  });

  it('A91: test_a91_haus_wechselt_auf_leitung_genau_an_der_grenze', () => {
    // Grenzfall „≥“: Bäckerei 20 kW an der d25 (20 > 15, kalt); die d40 hat 40 − 20 = 20 kW Rest, also genau den Bedarf → Wechsel, 40 ≤ 40
    const { objekte, haus, efh } = zweiStraenge('baeck', [4, 5]);
    const { neu, alt } = rechne(objekte, 5);
    expect(neu.anschluss.get(haus.id)?.feld).toBe(5 * N + 2);
    expect(neu.last_kw.get(1 * N + 2)).toBe(40);
    expect([haus, ...efh].every((o) => neu.warm.has(o.id))).toBe(true);
    expect(alt.kalt.get(haus.id)).toBe('leitung');
  });

  it('A91: test_a91_spaeterer_wechsel_sieht_den_stand_nach_frueherem', () => {
    // Zwei EFH an der d25 (Tiefe 3 bzw. 5 < 4 bzw. 6): zusammen 20 > 15, beide kalt. Das mit der kleineren ID (1|4) wechselt
    // auf die d40; danach trägt die d25 das zweite (10 ≤ 15) – es bleibt an (0|6).
    const a = aufbau();
    a.setze('hz', 0, 0);
    a.leitung('d25', a.spalte(0, 2, 7));
    a.leitung('d40', a.spalte(2, 0, 7));
    const erstes = a.kunde('efh', 1, 4);
    const zweites = a.kunde('efh', 1, 6);
    const { neu, alt } = rechne(a.objekte, 5);
    expect(neu.anschluss.get(erstes.id)?.feld).toBe(4 * N + 2);
    expect(neu.anschluss.get(zweites.id)?.feld).toBe(6 * N + 0);
    expect(neu.warm.has(erstes.id) && neu.warm.has(zweites.id)).toBe(true);
    expect([alt.kalt.get(erstes.id), alt.kalt.get(zweites.id)]).toEqual(['leitung', 'leitung']);
  });

  it('A91: test_a91_grossabnehmer_bei_waermemangel_zuletzt', () => {
    // alt: Klinik an (3|3) (erste Fundstelle, gleiche Tiefe 3), 70 > 60 → „leitung“, die drei EFH (30 kW) warm.
    // neu: Klinik an der d75 (6|3), aber begünstigt → zuletzt: 30 + 70 = 100 > 90 kW Kessel 2 → Klinik „waerme“.
    const a = aufbau();
    a.setze('hz', 4, 0);
    a.leitung('d50', a.spalte(3, 0, 6));
    a.leitung('d75', a.spalte(6, 0, 6));
    const klinik = a.kunde('klinik', 4, 3);
    const efh = [4, 5, 6].map((y) => a.kunde('efh', 7, y));
    const { neu, alt } = rechne(a.objekte, 2);
    expect(neu.anschluss.get(klinik.id)?.feld).toBe(3 * N + 6);
    expect(neu.kalt.get(klinik.id)).toBe('waerme');
    expect(efh.every((o) => neu.warm.has(o.id))).toBe(true);
    expect(alt.anschluss.get(klinik.id)?.feld).toBe(3 * N + 3);
    expect(alt.kalt.get(klinik.id)).toBe('leitung');
    // mit genug Wärme (Kessel 5, 240 kW) sind alle vier warm
    const voll = rechne(a.objekte, 5).neu;
    expect([klinik, ...efh].every((o) => voll.warm.has(o.id))).toBe(true);
  });

  it('A91: test_a91_haus_wechselt_nur_wenn_es_dort_kalt_waere', () => {
    // EFH 10 kW trägt die d25 (≤ 15) – es bleibt an der näheren (0|5), obwohl die d40 Platz hätte
    const { objekte, haus } = zweiStraenge('efh', [4, 5]);
    const { neu, alt } = rechne(objekte, 5);
    expect(neu.anschluss.get(haus.id)).toEqual({ feld: 5 * N + 0, tiefe: 4 });
    expect(neu.warm.has(haus.id)).toBe(true);
    expect(alt.anschluss.get(haus.id)?.feld).toBe(5 * N + 0);
  });

  it('A91: test_a91_eigener_zu_duenner_hausanschluss_bleibt_kalt', async () => {
    const { s, baeckerei, neu, alt } = baeckereiAmEigenenEnde();
    expect(neu.anschluss.get(baeckerei.id)?.feld).toBe(4 * N + 0);
    expect(neu.kalt.get(baeckerei.id)).toBe('leitung');
    expect(alt.kalt.get(baeckerei.id)).toBe('leitung');
    const { a, c } = await kontextKarte(s, baeckerei, T0);
    const chips = a.alle(c).filter((e) => e.className.includes('chip')).map((e) => a.text(e));
    expect(chips).toContain('Leitung zu dünn');
  });

  it('A91: test_a91_eigenes_ende_reicht_dann_bleibt_es', () => {
    // A57-Fall mit Überlast an anderer Stelle (Durchgang 2 läuft): das EFH bleibt an seinem eigenen, tragfähigen Ende (2|3)
    const a = aufbau();
    a.setze('hz', 0, 0);
    a.leitung('d50', Array.from({ length: 7 }, (_, x) => [x, 2] as [number, number]));
    a.leitung('d25', [[2, 3]]);
    const efh = a.kunde('efh', 3, 3);
    a.leitung('d25', [[5, 3], [5, 4]]);
    const b = a.kunde('baeck', 5, 5);
    const { neu, alt } = rechne(a.objekte, 5);
    expect(neu.anschluss.get(efh.id)?.feld).toBe(3 * N + 2);
    expect(neu.warm.has(efh.id)).toBe(true);
    expect(neu.kalt.get(b.id)).toBe('leitung');
    expect(alt.anschluss.get(efh.id)?.feld).toBe(3 * N + 2);
  });

  it('A91: test_a91_haus_an_der_heizzentrale_wechselt_nie', () => {
    // RH (2|1) grenzt an die Heizzentrale (Feld −1) und an die d25 (2|0); die Bäckerei an ihrem Ende (3|2) überlastet die d25.
    const a = aufbau();
    a.setze('hz', 0, 0);
    a.leitung('d25', [[2, 0], [3, 0], [3, 1], [3, 2]]);
    const rh = a.kunde('rh', 2, 1);
    const b = a.kunde('baeck', 4, 2);
    const { neu } = rechne(a.objekte, 5);
    expect(neu.anschluss.get(rh.id)).toEqual({ feld: -1, tiefe: 0 });
    expect(neu.warm.has(rh.id)).toBe(true);
    expect(neu.kalt.get(b.id)).toBe('leitung');
  });

  it('A91: test_a91_haus_ohne_station_wechselt_nicht', () => {
    // wie V2, aber das RH hat keine Station: kein Kunde, sein Anschluss bleibt der aus Durchgang 1 (nur für die Anzeige).
    // Die Bäckerei (1|7) an ihrem eigenen Ende (0|7) überlastet die d25 (20 > 15), damit (0|5) wirklich nicht trägt.
    const { objekte, haus, kunde } = zweiStraenge('rh', [4, 5]);
    haus.ohne_station = true;
    delete haus.station;
    const b = kunde('baeck', 1, 7);
    const { neu } = rechne(objekte, 5);
    expect(neu.anschluss.get(haus.id)?.feld).toBe(5 * N + 0);
    expect(neu.warm.has(haus.id)).toBe(false);
    expect(neu.anschluss.get(b.id)?.feld).toBe(7 * N + 0);
    expect(neu.kapazitaet_ok.get(5 * N + 0)).toBe(false);
  });

  it('A91: test_a91_spreizung_unter_eins_steckt_in_der_pruefung', () => {
    // Vorlauf 55 °C → Spreizung 15 K statt 20 K, Faktor 0,75: d25 trägt 11,25 kW, d40 30 kW.
    // V2: die d40 hat 30 − 20 = 10 kW Rest < 16 → kein Wechsel (bei 75 °C wechselt das RH, siehe V2)
    const { objekte, haus, efh } = zweiStraenge('rh', [4, 5]);
    const innen = [{ typ: 'kessel' as TypId, stufe: 5, bau: null }];
    const neu = berechneNetz(objekte, innen, 2, 55);
    expect(neu.spreizung_faktor).toBe(0.75);
    expect(neu.anschluss.get(haus.id)?.feld).toBe(5 * N + 0);
    expect(neu.kalt.get(haus.id)).toBe('leitung');
    expect(efh.every((o) => neu.warm.has(o.id))).toBe(true);
  });
});

/** Bäckerei (1|4) mit eigenem d25-Ende (0|2)–(0|4) neben einer d50 (x=2): als Spiel (für das Hausblatt) und als Netz. */
function baeckereiAmEigenenEnde() {
  const a = aufbau();
  a.setze('hz', 0, 0);
  a.leitung('d50', a.spalte(2, 0, 6));
  const baeckerei = a.kunde('baeck', 1, 4);
  a.leitung('d25', a.spalte(0, 2, 4));
  return { ...spielMit(a.objekte), baeckerei, ...rechne(a.objekte, 5) };
}
/** Spiel mit genau diesen Objekten und Kessel Stufe 5. */
function spielMit(objekte: Objekt[]) {
  const s = new Spiel(neuerSpielstand(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.stand.objekte = objekte;
  s.stand.naechste_id = Math.max(...objekte.map((o) => o.id)) + 1;
  s.stand.innen = [{ typ: 'kessel', stufe: 5, bau: null }];
  s.neuBerechnen();
  return { s };
}
const blattText = async (s: Spiel, o: Objekt): Promise<string> => { const { a, c } = await kontextKarte(s, o, T0); return a.text(c); };

describe('A91 P1 – Hinweis „eigener Hausanschluss zu dünn“', () => {
  it('A91: test_a91_hinweis_eigener_hausanschluss_zu_duenn', async () => {
    // Anschluss (0|4) mit einem Leitungsnachbarn; Endstück (0|4),(0|3),(0|2), darüber die Heizzentrale; alle drei Felder 20 > 15 kW
    const { s, baeckerei } = baeckereiAmEigenenEnde();
    expect(eigenerAnschlussZuDuenn(s.netz, baeckerei)).toBe(true);
    const text = await blattText(s, baeckerei);
    expect(text).toContain(HINWEIS_EIGEN);
    expect(text).not.toContain('eine Leitung auf dem Weg ist zu dünn');
  });

  it('A91: test_a91_hinweis_engpass_vor_dem_endstueck_bleibt_allgemein', async () => {
    // EFH (0|6) an (0|5); Endstück (0|5),(0|4) mit 10 ≤ 25 kW; darüber (0|3), wo das RH anschließt: 26 > 25 kW → Engpass vor dem Endstück
    const a = aufbau();
    a.setze('hz', 0, 0);
    a.leitung('d32', a.spalte(0, 2, 5));
    const rh = a.kunde('rh', 1, 3);
    const efh = a.kunde('efh', 0, 6);
    const { s } = spielMit(a.objekte);
    expect(s.netz.kalt.get(efh.id)).toBe('leitung');
    expect(eigenerAnschlussZuDuenn(s.netz, efh)).toBe(false);
    expect(eigenerAnschlussZuDuenn(s.netz, rh)).toBe(false);
    const text = await blattText(s, efh);
    expect(text).toContain(HINWEIS_ALLGEMEIN);
    expect(text).not.toContain(HINWEIS_EIGEN);
  });

  it('A91: test_a91_hinweis_abzweig_vor_dem_endstueck_bleibt_allgemein', () => {
    // EFH A (0|6) an (0|5); Endstück (0|5),(0|4) endet am Abzweig (0|3) (Kinder (0|4) und (1|3)); dort 20 > 15 kW → allgemein
    const a = aufbau();
    a.setze('hz', 0, 0);
    a.leitung('d25', [...a.spalte(0, 2, 5), [1, 3]]);
    const A = a.kunde('efh', 0, 6);
    a.kunde('efh', 2, 3);
    const { s } = spielMit(a.objekte);
    expect(s.netz.kalt.get(A.id)).toBe('leitung');
    expect([s.netz.last_kw.get(4 * N + 0), s.netz.last_kw.get(3 * N + 0)]).toEqual([10, 20]);
    expect(eigenerAnschlussZuDuenn(s.netz, A)).toBe(false);
  });

  it('A91: test_a91_hinweis_nur_bei_kaltem_haus', () => {
    // Bäckerei mit d32-Ende (25 kW ≥ 20): warm, also kein Hinweis
    const a = aufbau();
    a.setze('hz', 0, 0);
    const b = a.kunde('baeck', 1, 4);
    a.leitung('d32', a.spalte(0, 2, 4));
    const { s } = spielMit(a.objekte);
    expect(s.netz.warm.has(b.id)).toBe(true);
    expect(eigenerAnschlussZuDuenn(s.netz, b)).toBe(false);
  });
});

describe('A91 P1 – Spiel', () => {
  it('A91: test_a91_hausanschluss_4_12_ohne_umweg', () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 1e7;
    s.stand.abschnitt = { phase: 'offen', bau: null };
    s.neuBerechnen();
    const haus = s.stand.objekte.find((o) => o.x === 4 && o.y === 12) as Objekt;
    expect(s.hausanschlussPlanen(haus.id).ok).toBe(true);
    const geplant = s.stand.objekte.filter((o) => o.geplant);
    expect(geplant.map((o) => [o.x, o.y]).sort((p, q) => p[0] - q[0])).toEqual([[5, 12], [6, 12], [7, 12], [8, 12], [9, 12]]);
    expect(geplant.every((o) => o.typ === 'd32')).toBe(true);
    // 5 Felder × 560 € (Material d32 14 € × Kostenfaktor 40, katalog.ts)
    expect(s.abschnittKosten_eur()).toBe(2800);
    expect(s.stationKaufen(haus.id, passendeStation(bedarfKw(haus)).id).ok).toBe(true);
    for (const o of s.stand.objekte) delete o.geplant;
    s.neuBerechnen();
    expect([...s.netz.kalt.values()]).not.toContain('leitung');
  });

  it('A91: test_a91_spielstand_format_unveraendert', () => {
    expect(SPEICHER_SCHLUESSEL).toBe('waermedorf-spielstand-v1');
    expect(SPEICHER_VERSION).toBe(3);
  });
});
