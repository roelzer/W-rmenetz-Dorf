import { describe, expect, it } from 'vitest';
import { KEIN_FELD, KARTE_OBEN_Y, feldVon, mod, schluessel } from '../src/core/feld';
import { KONSTANTEN, START_PREISSTUFE, type TypId } from '../src/core/katalog';
import { alleSchluessel, belegtId, belegungskarte, berechneNetz } from '../src/core/netz';
import { engstellenFinden } from '../src/core/engstelle';
import { rohrVorschau } from '../src/core/rohrvorschau';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { tutorialLeitungsLage } from '../src/core/tutorial-netz';
import type { Objekt, Spielstand } from '../src/core/typen';
import { neu, quelle } from './hilfen';

// Bauplan docs/bauplaene/NR27-bahnquerung-entwurf.md, Fassung 3, Paket P1 „Raster nach Norden“ (AE-NR27-1 … -4).
// Die Karte wächst nach Norden in Zeilen y = −10 … −1; der Feldschlüssel bleibt y·24 + x (für negatives y eindeutig).
// Erwartete Werte von Hand: Breite 24, Nordzone 10 Zeilen, Süden bis y = 45 (neubau_hoehe 46) → 24 · 56 = 1.344 Felder.

describe('NR27 P1 feld.ts', () => {
  it('test_nr27_feldVon_umkehr: feldVon kehrt y·24+x für y −10 … 45 um, x immer 0–23', () => {
    for (let y = -10; y <= 45; y++) for (let x = 0; x < 24; x++) expect(feldVon(y * 24 + x)).toEqual([x, y]);
    expect(feldVon(-1)).toEqual([23, -1]);
    expect(feldVon(-240)).toEqual([0, -10]);
    expect(feldVon(-217)).toEqual([23, -10]);
    expect(schluessel(5, -10)).toBe(-235);
    expect(schluessel(23, 45)).toBe(1103);
    expect(KARTE_OBEN_Y).toBe(-10);
    // KEIN_FELD liegt weit außerhalb der Karte: kleinster Schlüssel −240
    expect(KEIN_FELD).toBe(-1_000_000);
    expect(KEIN_FELD).toBeLessThan(-240);
  });

  it('test_nr27_mod: Rest immer 0 ≤ r < n, auch für negative Zahlen und Bruchteile', () => {
    expect(mod(-1, 2)).toBe(1);
    expect(mod(-3, 4)).toBe(1);
    expect(mod(-0.25, 1)).toBe(0.75);
    expect(mod(5, 24)).toBe(5);
    expect(mod(-24, 24)).toBe(0);
    expect(mod(0, 2)).toBe(0);
  });
});

// ---------- Verschiebungstest (Q2: die Netzrechnung hängt nicht von der Zeile ab) ----------
// Netz in den Zeilen 2–11 (Heizzentrale Stufe 1 bei (11|10) belegt x 11–12, y 10–11), direkt aus Objekten gebaut.
// Derselbe Stand 12 Zeilen nach Norden verschoben liegt in den Zeilen −10 … −1. Schlüssel verschieben sich um −12·24 = −288,
// KEIN_FELD bleibt.
const DY = -12, DK = DY * 24;
const sch = (k: number): number => (k === KEIN_FELD ? k : k + DK);
const schMap = <V>(m: ReadonlyMap<number, V>): Array<[number, V]> => [...m].map(([k, v]) => [sch(k), v]);
const schSet = (s: ReadonlySet<number>): number[] => [...s].map(sch);

type Probe = { objekte: Objekt[]; hausAmHz: Objekt; puffer: Objekt; pufferAussen: Objekt; bei: (x: number, y: number) => Objekt };

function probeStand(dy: number): Probe {
  let id = 0;
  const objekte: Objekt[] = [];
  const add = (typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}): Objekt => {
    const o: Objekt = { id: ++id, typ, x, y: y + dy, stufe: 1, bau: null, kasse_eur: 0, ...extra };
    objekte.push(o);
    return o;
  };
  add('hz', 11, 10);
  // Hauptstrang nach oben: 50er, an (11|8) dünner, danach wieder dicker (Engpass), 32er-Stück bei (11|5)
  add('d50', 11, 9); add('d40', 11, 8); add('d50', 11, 7); add('d50', 11, 6); add('d32', 11, 5); add('d50', 11, 4); add('d50', 11, 3);
  add('efh', 11, 2);
  // Abzweig bei (11|4) nach links, gleich dick wie die Zuleitung (A76-Aufteilung); bei (9|4) dünner ohne Abzweig (A67)
  add('d50', 10, 4); add('d40', 9, 4); add('efh', 8, 4);
  // A91-Umhängen links der Heizzentrale: (9|9) wird zuerst über den dünnen 25er (10|9) erreicht und hängt dann am gleich
  // nahen 50er (9|10)
  add('d25', 10, 9); add('d50', 10, 10); add('d50', 9, 10); add('d50', 9, 9); add('efh', 8, 9);
  // Wärmequelle an der Leitung (Solarthermie 2×2 an (11|3)/(11|4))
  add('solar', 12, 3);
  // Abzweig bei (11|7) nach rechts: 25er (15 kW) mit drei EFH (je 10 kW) → zu dünn, Engstelle
  add('d25', 12, 7); add('d25', 13, 7); add('d25', 14, 7);
  add('efh', 15, 7); add('efh', 14, 6); add('efh', 14, 8);
  // direkt am Heizhaus: ein Haus links, ein Puffer rechts (KEIN_FELD)
  const hausAmHz = add('efh', 10, 11);
  const puffer = add('puffer', 13, 11);
  // Puffer ohne eigene Leitung abseits (A24: gilt als mit der Heizzentrale verbunden)
  const pufferAussen = add('puffer', 20, 3);
  // kurzer 25er rechts oben an der Heizzentrale (für die Ringprüfung über die Heizzentrale)
  add('d25', 13, 9); add('d25', 13, 10);
  // abseits: einzelne gebaute Leitung und eingezeichnete Leitungen mit zwei Hausanschlüssen
  add('d25', 16, 7);
  add('d25', 16, 10, { geplant: true }); add('d25', 16, 9, { geplant: true });
  add('efh', 17, 9); add('efh', 16, 11);
  // eingezeichnete Leitung, die an einem Haus nur vorbeiläuft: kein Hausanschluss (A57)
  add('d25', 19, 8, { geplant: true }); add('d25', 20, 8, { geplant: true }); add('d25', 21, 8, { geplant: true });
  add('efh', 20, 9);
  const bei = (x: number, y: number): Objekt => objekte.find((o) => o.x === x && o.y === y + dy) as Objekt;
  return { objekte, hausAmHz, puffer, pufferAussen, bei };
}

const kundenIds = (objekte: Objekt[]): number[] => objekte.filter((o) => o.typ === 'efh').map((o) => o.id);
const netzVon = (objekte: Objekt[]) => berechneNetz(objekte, [quelle('kessel')], START_PREISSTUFE);

function spielAus(objekte: Objekt[]): Spiel {
  const stand: Spielstand = { ...neuerSpielstand(0), objekte, naechste_id: 1000, abschnitt: { phase: 'offen', bau: null } };
  return new Spiel(stand, () => 0);
}
type Ring = { schliesstLeitungsring(abgaenge: Objekt[], x?: number, y?: number): boolean };

describe('NR27 P1 Verschiebungstest', () => {
  const a = probeStand(0), b = probeStand(DY);
  const na = netzVon(a.objekte), nb = netzVon(b.objekte);

  it('test_nr27_verschiebung_netz: Probe ist nicht leer (sonst prüft der Vergleich nichts)', () => {
    expect(na.warm.size).toBeGreaterThan(0);
    expect([...na.kalt.values()]).toContain('leitung');
    expect(na.engpass.size).toBeGreaterThan(0);
    expect(na.reduzierung.size).toBeGreaterThan(0);
    expect(na.aufteilung.size).toBeGreaterThan(0);
    expect(na.anschluss.has(a.bei(12, 3).id)).toBe(true);
    expect(engstellenFinden(na, kundenIds(a.objekte)).length).toBeGreaterThan(0);
    // umgehängt: (9|9) hängt am 50er (9|10), nicht am zuerst gefundenen 25er (10|9)
    expect(na.eltern.get(9 * 24 + 9)).toBe(10 * 24 + 9);
    expect(nb.eltern.get(-3 * 24 + 9)).toBe(-2 * 24 + 9);
  });

  it('test_nr27_verschiebung_netz: Haus und Puffer direkt am Heizhaus hängen an KEIN_FELD (Zeile 10 und Zeile −2)', () => {
    expect(na.anschluss.get(a.hausAmHz.id)).toEqual({ feld: KEIN_FELD, tiefe: 0 });
    expect(na.anschluss.get(a.puffer.id)).toEqual({ feld: KEIN_FELD, tiefe: 0 });
    expect(nb.anschluss.get(b.hausAmHz.id)).toEqual({ feld: KEIN_FELD, tiefe: 0 });
    expect(nb.anschluss.get(b.puffer.id)).toEqual({ feld: KEIN_FELD, tiefe: 0 });
    expect(na.anschluss.get(a.pufferAussen.id)).toEqual({ feld: KEIN_FELD, tiefe: 0 });
    expect(nb.anschluss.get(b.pufferAussen.id)).toEqual({ feld: KEIN_FELD, tiefe: 0 });
    // Wurzeln des Baums (Felder direkt an der Heizzentrale) haben KEIN_FELD als Eltern
    expect(na.eltern.get(9 * 24 + 11)).toBe(KEIN_FELD);
    expect(nb.eltern.get(-3 * 24 + 11)).toBe(KEIN_FELD);
  });

  it('test_nr27_verschiebung_netz: Netzrechnung 12 Zeilen weiter nördlich gleich (Schlüssel verschoben)', () => {
    expect([...nb.warm]).toEqual([...na.warm]);
    expect([...nb.kalt]).toEqual([...na.kalt]);
    expect(nb.verfuegbar_kw).toBe(na.verfuegbar_kw);
    expect(nb.genutzt_kw).toBe(na.genutzt_kw);
    expect([...nb.last_kw]).toEqual(schMap(na.last_kw));
    expect([...nb.kapazitaet_ok]).toEqual(schMap(na.kapazitaet_ok));
    expect([...nb.tiefe]).toEqual(schMap(na.tiefe));
    expect([...nb.eltern]).toEqual(schMap(na.eltern).map(([k, p]) => [k, sch(p)]));
    expect(nb.reihenfolge).toEqual(na.reihenfolge.map(sch));
    expect([...nb.engpass]).toEqual(schSet(na.engpass));
    expect([...nb.reduzierung]).toEqual(schSet(na.reduzierung));
    expect([...nb.aufteilung]).toEqual(schSet(na.aufteilung));
    expect([...nb.anschluss]).toEqual([...na.anschluss].map(([id, v]) => [id, { feld: sch(v.feld), tiefe: v.tiefe }]));
  });

  it('test_nr27_verschiebung_netz: engstellenFinden und rohrVorschau gleich', () => {
    const ea = engstellenFinden(na, kundenIds(a.objekte)), eb = engstellenFinden(nb, kundenIds(b.objekte));
    expect(eb).toEqual(ea.map((e) => ({ ...e, felder: e.felder.map(sch) })));
    for (const k of na.reihenfolge) expect(rohrVorschau(nb, b.objekte, sch(k))).toEqual(rohrVorschau(na, a.objekte, k));
    // (16|4) ist keine Leitung
    expect(rohrVorschau(na, a.objekte, 4 * 24 + 16)).toBeNull();
    expect(rohrVorschau(na, a.objekte, 7 * 24 + 12)?.haeuser).toBe(3);
    expect(rohrVorschau(nb, b.objekte, (7 + DY) * 24 + 12)?.haeuser).toBe(3);
  });

  it('test_nr27_verschiebung_netz: der Spiel-Konstruktor lässt den verschobenen Stand unverändert', () => {
    const vorher = JSON.stringify(b.objekte);
    spielAus(b.objekte);
    expect(JSON.stringify(b.objekte)).toBe(vorher);
  });

  it('test_nr27_verschiebung_netz: abschnittAnschluesse gleich (zwei Hausanschlüsse an eingezeichneten Leitungen)', () => {
    const ids = (s: Spiel): number[] => s.abschnittAnschluesse().map((o) => o.id);
    const sa = spielAus(a.objekte), sb = spielAus(b.objekte);
    expect(ids(sa)).toEqual([a.bei(17, 9).id, a.bei(16, 11).id]);
    expect(ids(sb)).toEqual(ids(sa));
  });

  it('test_nr27_verschiebung_netz: schliesstLeitungsring gleich – mit Ring, ohne Ring, über die Heizzentrale', () => {
    const ring = (p: Probe, dy: number): boolean[] => {
      const s = spielAus(p.objekte) as unknown as Ring;
      return [
        // neues Rohr bei (12|6) zwischen (11|6) und (12|7), die schon über (11|7) verbunden sind
        s.schliesstLeitungsring([p.bei(11, 6), p.bei(12, 7)], 12, 6 + dy),
        // neues Rohr bei (16|8) zwischen zwei getrennten Stücken ohne Heizzentrale
        s.schliesstLeitungsring([p.bei(16, 9), p.bei(16, 7)], 16, 8 + dy),
        // neues Rohr bei (12|9) direkt am Heizhaus, das (13|9) über (13|10) schon mit dem Heizhaus verbindet
        s.schliesstLeitungsring([p.bei(11, 9), p.bei(13, 9)], 12, 9 + dy),
      ];
    };
    expect(ring(a, 0)).toEqual([true, false, true]);
    expect(ring(b, DY)).toEqual([true, false, true]);
  });
});

describe('NR27 P1 Tutorial-Lage', () => {
  it('test_nr27_tutorial_fremd_nord: fremde Leitungen in der Nordzone werden gefunden, fremd bleibt aufsteigend nach Feldnummer', () => {
    // Heizzentrale (11|10), Tutorial-Häuser auf (9|13) und (12|14); zwei unverbundene Leitungen: (3|20) im Süden, (3|−2) im Norden
    const objekte: Objekt[] = [neu('hz', 11, 10), neu('efh', 9, 13), neu('efh', 12, 14), neu('d25', 3, 20), neu('d25', 3, -2)];
    const netz = netzVon(objekte);
    const lage = tutorialLeitungsLage(netz, objekte, objekte[1].id, objekte[2].id, 'd32', 'd25');
    expect(lage.fremd).toEqual([[3, -2], [3, 20]]);
  });
});

describe('NR27 P1 Konstanten', () => {
  it('test_nr27_konstanten: Nordzone 10 Zeilen, Querung-Platzhalter 45.000 € je Bahnfeld und 1.440 s Zuschlag (Bauplan Abschnitt 6 P1)', () => {
    expect(KONSTANTEN.nord_zeilen).toBe(10);
    expect(KONSTANTEN.querung_eur_je_feld).toBe(45000);
    expect(KONSTANTEN.querung_bau_s).toBe(1440);
  });
});

describe('NR27 P1 Belegungskarte', () => {
  it('test_nr27_belegung_nord: Häuser ganz oben und ganz unten werden gefunden, außerhalb 0; alleSchluessel aufsteigend inkl. Norden', () => {
    const oben = neu('efh', 5, -10), unten = neu('efh', 5, 45);
    const bel = belegungskarte([oben, unten]);
    expect(belegtId(bel, -10 * 24 + 5)).toBe(oben.id);
    expect(belegtId(bel, 45 * 24 + 5)).toBe(unten.id);
    expect(belegtId(bel, -11 * 24 + 5)).toBe(0);
    expect(belegtId(bel, 46 * 24 + 5)).toBe(0);
    expect(belegtId(bel, KEIN_FELD)).toBe(0);
    const alle = alleSchluessel(bel);
    expect(alle.length).toBe(1344);
    expect(alle[0]).toBe(-240);
    expect(alle[alle.length - 1]).toBe(1103);
    expect(alle.every((k, i) => i === 0 || k === alle[i - 1] + 1)).toBe(true);
  });
});
