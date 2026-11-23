import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// NR27 Tester-Modus „pruefen“ (2026-11-23), Schwerpunkt 4: Hausanschluss im Nordviertel nach der Querung und Wärmeerzeugung
// bei Heizzentrale Stufe 6. Anforderung NR27 (f) „Häuser hinter der Bahn werden nach der Querung anschließbar“ – hier bis zum
// Ende: Leitung, Station, Haus warm. Bedarf von Hand: EFH 15.000 kWh/a, RH 24.000 kWh/a ÷ 1.500 h (A71) → 10 kW bzw. 16 kW;
// 5 EFH + 9 RH = 194 kW.
//
// Welche Fehler machen diese Tests rot?
// - Nordhäuser sind nach der Querung nicht anschließbar (abschnittAnschluesse/Netz sieht y < 0 nicht, Station nicht kaufbar).
// - Die Netzrechnung führt Wärme nicht über die Bahnfelder (Querung zählt nicht als Leitung).
// - Die Heizzentrale Stufe 6 kann rechnerisch nicht alle Häuser der Karte (Dorf + Süd + Nord) decken.

import { KATALOG, KONSTANTEN, type TypId } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import { NORD_PLAN } from '../src/core/nordviertel';
import { passendeStation } from '../src/core/katalog';
import { Spiel } from '../src/core/spiel';
import { ladenMitBefund } from '../src/core/speichern';
import type { Objekt, Spielstand } from '../src/core/typen';

const N = KONSTANTEN.feldanzahl;
const DATEI = 'altstand-stufe6-layout3.json';

describe('NR27 pruefen: Versorgung des Nordviertels bei Stufe 6', () => {
  it('test_nr27_f_bedarf_nordviertel_194kw: 5 EFH + 9 RH, zusammen 194 kW (von Hand: 5 × 10 + 9 × 16)', () => {
    const efh = NORD_PLAN.filter((h) => h.typ === 'efh').length, rh = NORD_PLAN.filter((h) => h.typ === 'rh').length;
    expect([efh, rh]).toEqual([5, 9]);
    const summe = NORD_PLAN.reduce((a, h) => a + bedarfKw({ typ: h.typ } as Objekt), 0);
    expect(summe).toBeCloseTo(194, 6);
  });

  it('test_nr27_f_hausanschluss_nord_ende_zu_ende: alter Stand Stufe 6 → Querung → Wohnstraße → Stationen → alle 14 Nordhäuser warm', () => {
    const text = readFileSync(new URL(`./referenz/nr27/${DATEI}`, import.meta.url), 'utf8');
    const d = JSON.parse(text) as Spielstand;
    const uhr = { t: d.zuletzt_ms };
    const stand = ladenMitBefund(text, uhr.t).stand;
    // Erzeugung: das Heizhaus Stufe 6 voll mit dem größten Gaskessel (8 Plätze × 300 kW) – Testaufbau, kein Spielweg.
    stand.innen = Array.from({ length: (KATALOG.hz.plaetze as number[])[5] }, () => ({ typ: 'gas' as TypId, stufe: 5, bau: null }));
    const sp = new Spiel(stand, () => uhr.t);
    const abschnitt = (felder: Array<[number, number]>, typ: TypId): void => {
      expect(sp.abschnittPlanen().ok).toBe(true);
      uhr.t = sp.stand.abschnitt!.bau!.ende_ms; sp.bis(uhr.t);
      for (const [x, y] of felder) expect(sp.platzieren(typ, x, y), `${typ} ${x}|${y}`).toEqual({ ok: true });
      // Trassenübergang zur gebauten Querung (10|−3) verbinden (Regel vor NR27: neu an gebaut ist zunächst getrennt)
      const a4 = sp.stand.objekte.find((o) => o.x === 10 && o.y === -4)!, q3 = sp.stand.objekte.find((o) => o.x === 10 && o.y === -3)!;
      expect(sp.trassenUmschalten(a4.id, q3.id).ok).toBe(true);
      expect(sp.abschnittAbschliessen().ok).toBe(true);
      expect(sp.materialBestellen().ok).toBe(true);
      uhr.t = sp.stand.abschnitt!.bau!.ende_ms; sp.bis(uhr.t);
      expect(sp.stand.abschnitt).toBeUndefined();
    };
    // 1) Querung an (10|0) – Trassenübergang zur alten Leitung verbinden
    expect(sp.abschnittPlanen().ok).toBe(true);
    uhr.t = sp.stand.abschnitt!.bau!.ende_ms; sp.bis(uhr.t);
    for (const y of [-1, -2, -3]) expect(sp.platzieren('d90', 10, y).ok).toBe(true);
    const an = sp.stand.objekte.find((o) => o.x === 10 && o.y === -1)!, alt0 = sp.stand.objekte.find((o) => o.x === 10 && o.y === 0)!;
    expect(sp.trassenUmschalten(an.id, alt0.id).ok).toBe(true);
    sp.abschnittAbschliessen(); expect(sp.materialBestellen().ok).toBe(true);
    uhr.t = sp.stand.abschnitt!.bau!.ende_ms; sp.bis(uhr.t);
    expect(sp.stand.nordviertel).toBe(true);
    // 2) Stichstraße und Wohnstraße, Stichleitungen zu jedem Haus (Hausreihe −9 über (x|−8), Hausreihe −5 über (x|−6))
    const felder: Array<[number, number]> = [[10, -4], [10, -5], [10, -6], [10, -7]];
    for (let x = 9; x >= 2; x--) felder.push([x, -7]);
    for (let x = 11; x <= 16; x++) felder.push([x, -7]);
    for (const h of NORD_PLAN) felder.push([h.x, h.y === -9 ? -8 : -6]);
    abschnitt(felder, 'd90'); // d90 = 270 kW ≥ 194 kW (d63 mit 120 kW reicht für die Stichstraße nicht)
    // 3) Stationen kaufen
    const nord = sp.stand.objekte.filter((o) => o.y <= -5 && KATALOG[o.typ].kategorie === 'haus');
    expect(nord).toHaveLength(14);
    for (const h of nord) expect(sp.netz.anschluss.has(h.id), `Haus ${h.x}|${h.y} am Netz`).toBe(true);
    for (const h of nord) expect(sp.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok, `Station ${h.x}|${h.y}`).toBe(true);
    // 4) warm?
    const kalt = nord.filter((h) => !sp.netz.warm.has(h.id)).map((h) => `${h.typ}@${h.x}|${h.y}:${sp.netz.kalt.get(h.id)}`);
    expect(kalt).toEqual([]);
    // Die Querungsleitung trägt mindestens die 194 kW des Viertels
    expect(sp.netz.last_kw.get(-2 * N + 10)!).toBeGreaterThanOrEqual(194 - 1e-6);
    expect(sp.netz.kapazitaet_ok.get(-2 * N + 10)).toBe(true);
  });

  it('test_nr27_f_erzeugung_stufe6_reicht_rechnerisch: Höchstleistung Heizhaus Stufe 6 ≥ Bedarf aller Häuser der Karte', () => {
    const text = readFileSync(new URL(`./referenz/nr27/${DATEI}`, import.meta.url), 'utf8');
    const d = JSON.parse(text) as Spielstand;
    const sp = new Spiel(ladenMitBefund(text, d.zuletzt_ms).stand, () => d.zuletzt_ms);
    const kunden = sp.stand.objekte.filter((o) => ['haus', 'gross'].includes(KATALOG[o.typ].kategorie));
    const dorfSued_kw = kunden.reduce((a, o) => a + (KATALOG[o.typ].bedarf_kw ?? 0), 0);
    const nord_kw = NORD_PLAN.reduce((a, h) => a + (KATALOG[h.typ].bedarf_kw ?? 0), 0);
    // Innen: 8 Plätze; stärkstes Modell je Quelle bei Stufe 6 (alle Modelle sind ab Stufe 6 frei, erzeugerAbStufe)
    const plaetze = (KATALOG.hz.plaetze as number[])[5];
    const staerkste_kw = Math.max(...(Object.keys(KATALOG) as TypId[]).filter((t) => KATALOG[t].kategorie === 'innen').map((t) => Math.max(...KATALOG[t].leistung_kw!)));
    const innen_max_kw = plaetze * staerkste_kw;
    console.info(`NR27 Bilanz Stufe 6: Dorf+Süd ${dorfSued_kw.toFixed(1)} kW (${kunden.length} Kunden), Nord ${nord_kw.toFixed(1)} kW, Heizhaus max ${innen_max_kw} kW`);
    expect(innen_max_kw).toBeGreaterThanOrEqual(dorfSued_kw + nord_kw);
  });
});
