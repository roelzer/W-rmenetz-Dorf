import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG, KONSTANTEN, passendeStation } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import type { Objekt } from '../src/core/typen';

// A89 – mehrere Hausanschlüsse im selben Bauabschnitt (Review A89, Befund W1).
// Die Probe-Netzrechnung der Wegsuche muss die schon geplanten Leitungen des offenen Abschnitts mitzählen: sonst sieht sie
// die Last der vorher geplanten Anschlüsse nicht, nimmt einen Weg über eine schon volle Leitung, und nach dem Bau sind Häuser
// wegen der Leitung kalt. Echtes Kernmodul, echter Ablauf (Abschnitt planen → einzeichnen → bestellen → Bauzeit), keine Attrappen.
//
// Welcher Fehler macht diese Tests rot: Die Probe rechnet ohne die geplanten Leitungen
// (spiel.ts, hausanschlussPlanen: `this.stand.objekte.map(` → `this.stand.objekte.filter((o) => !o.geplant).map(`).

const T0 = 1_000_000_000_000;

const kaltWegenLeitung = (s: Spiel): number[] => [...s.netz.kalt].filter(([, grund]) => grund === 'leitung').map(([id]) => id);

/** Spiel mit Kessel, viel Geld und einer uhrgesteuerten Zeit; `vor` lässt die Spielzeit in 10-s-Schritten laufen. */
function startSpiel() {
  const z = { t: T0 };
  const s = new Spiel(neuerSpielstand(T0), () => z.t);
  s.ersteQuelleWaehlen('kessel');
  s.stand.geld_eur = 10_000_000;
  const vor = (sek: number) => { for (let i = 0; i < sek / 10; i++) { z.t += 10_000; s.bis(z.t); } };
  return { s, vor };
}

/** Bauabschnitt planen lassen und warten, bis er zum Einzeichnen offen ist. */
function abschnittOeffnen(s: Spiel, vor: (sek: number) => void) {
  expect(s.abschnittPlanen().ok).toBe(true);
  vor(KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor + 10);
  expect(s.stand.abschnitt?.phase).toBe('offen');
}

/** Abschnitt abschließen, Material bestellen und die Bauzeit abwarten (höchstens zehn Bauzeiten). */
function abschnittBauen(s: Spiel, vor: (sek: number) => void) {
  expect(s.abschnittAbschliessen().ok).toBe(true);
  expect(s.materialBestellen().ok).toBe(true);
  for (let i = 0; i < 10 && s.stand.abschnitt; i++) vor(KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
  expect(s.stand.abschnitt).toBeUndefined();
  expect(s.stand.objekte.some((o) => o.geplant)).toBe(false);
  s.neuBerechnen();
}

describe('A89 mehrere Hausanschlüsse in einem Bauabschnitt', () => {
  it('A89: zweiter Hausanschluss im selben Bauabschnitt – keine Leitung über eine schon volle Hauptleitung, nach dem Bau kein Haus wegen der Leitung kalt', () => {
    const { s, vor } = startSpiel();
    // Eigenes, übersichtliches Dorf: nur Heizzentrale (11|10, 2×2), Büro und Monteurhütte bleiben; alle Leitungen, Häuser,
    // Großabnehmer und Landschaft weg.
    s.stand.objekte = s.stand.objekte.filter((o) => ['hz', 'buero', 'huette'].includes(o.typ));
    const neu = (typ: Objekt['typ'], x: number, y: number, extra: Partial<Objekt> = {}): Objekt => {
      const o: Objekt = { id: s.stand.naechste_id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra };
      s.stand.objekte.push(o);
      return o;
    };
    // Hauptleitung: 25er (15 kW) rechts an der Heizzentrale, (13|10) bis (17|10), gebaut.
    // Einfamilienhaus: 15.000 kWh/a ÷ 1.500 h = 10 kW → die Leitung trägt genau ein Haus, zwei (20 kW) nicht.
    for (let x = 13; x <= 17; x++) neu('d25', x, 10);
    const a = neu('efh', 15, 12, { ohne_station: true });
    const b = neu('efh', 17, 12, { ohne_station: true });
    expect(bedarfKw(a)).toBe(10);
    s.neuBerechnen();
    expect(kaltWegenLeitung(s)).toEqual([]);

    abschnittOeffnen(s, vor);
    // Anschluss 1 planen + Station kaufen.
    expect(s.hausanschlussPlanen(a.id).ok).toBe(true);
    const wegA = s.stand.objekte.filter((o) => o.geplant);
    expect(wegA.length).toBeGreaterThan(0);
    expect(s.stationKaufen(a.id, passendeStation(bedarfKw(a)).id).ok).toBe(true);
    // Anschluss 2 planen: jeder Weg endet an derselben, mit Haus 1 schon vollen 25er → abgelehnt, nichts geplant.
    const rB = s.hausanschlussPlanen(b.id);
    expect(rB.ok).toBe(false);
    expect(rB.hinweis ?? '').not.toBe('');
    expect(s.stand.objekte.filter((o) => o.geplant)).toEqual(wegA);

    abschnittBauen(s, vor);
    expect(kaltWegenLeitung(s)).toEqual([]);
    expect(s.netz.warm.has(a.id)).toBe(true);
    expect(s.netz.warm.has(b.id)).toBe(false); // ohne Anschluss bleibt es beim Öl, aber nicht wegen der Leitung kalt
  });

  it('A89: mehrere Anschlüsse nacheinander in einem Abschnitt (Startdorf) – nach dem Bau kein Haus wegen der Leitung kalt, jedes angeschlossene warm', () => {
    const { s, vor } = startSpiel();
    // Kessel auf Stufe 3 (130 kW statt 60 kW), damit kein angeschlossenes Haus aus Wärmemangel kalt bleibt – geprüft wird hier die Leitung.
    const kessel = s.stand.innen.find((q) => q.typ === 'kessel')!;
    kessel.stufe = 3;
    s.neuBerechnen();
    expect(kaltWegenLeitung(s)).toEqual([]); // Ausgangslage
    abschnittOeffnen(s, vor);
    // Alle noch nicht angeschlossenen Einfamilienhäuser der Reihe nach anschließen, so wie ein Spieler sie antippt.
    const kandidaten = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station);
    const angeschlossen: Objekt[] = [];
    for (const h of kandidaten) {
      if (!s.hausanschlussPlanen(h.id).ok) continue;
      expect(s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
      angeschlossen.push(h);
    }
    // Mindestens drei Anschlüsse im selben Abschnitt, sonst prüft der Test das Zusammenspiel nicht.
    expect(angeschlossen.length).toBeGreaterThanOrEqual(3);

    abschnittBauen(s, vor);
    expect(kaltWegenLeitung(s)).toEqual([]);
    expect(angeschlossen.filter((h) => !s.netz.warm.has(h.id)).map((h) => `${h.x}|${h.y}: ${s.netz.kalt.get(h.id)}`)).toEqual([]);
  });
});
