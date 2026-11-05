import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG, KONSTANTEN, passendeStation } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import { pruefeAuftraege } from '../src/core/auftraege';
import { ORTE } from '../src/core/orte';
import type { Objekt } from '../src/core/typen';

// A89 – Hausanschluss macht keine Häuser kalt (docs/lastenheft.md A89; Entscheidung Projektleiter Variante a: die Wegsuche nimmt
// einen Weg nur, wenn danach kein Haus neu wegen der Leitung kalt ist; zusätzlich keine Felder direkt neben der Heizzentrale).
// Echtes Kernmodul, keine Attrappen, echte Freischalt-Leiter.

const T0 = 1_000_000_000_000;
// Heizzentrale des Startdorfs: (11|10), 2×2 Felder → Nachbarfelder von Hand: links (10|10),(10|11), rechts (13|10),(13|11),
// oben (11|9),(12|9), unten (11|12),(12|12).
const NEBEN_HZ = new Set(['10|10', '10|11', '13|10', '13|11', '11|9', '12|9', '11|12', '12|12']);
// Gefundene Wege über alle noch nicht angeschlossenen Häuser und Großabnehmer des Ortes, gemessen am Stand 01c80ec (vor A89):
// Stufe 1: 41 (2 ohne Weg: Haus liegt schon an einer Leitung bzw. jenseits des Flusses ohne Spülbohrung), Stufe 2: 42.
// A89 darf keine Häuser „unanschließbar“ machen, die vorher einen Weg hatten.
const WEGE_VOR_A89: Record<number, number> = { 1: 41, 2: 42 };

/** Felder, die seitlich an die Heizzentrale grenzen (quadratische Grundfläche, Kantenlänge aus dem Katalog). */
const nebenHzVon = (hz: Objekt): Set<string> => {
  const g = KATALOG[hz.typ].groesse as number, r = new Set<string>();
  for (let i = 0; i < g; i++) for (const [x, y] of [[hz.x + i, hz.y - 1], [hz.x + i, hz.y + g], [hz.x - 1, hz.y + i], [hz.x + g, hz.y + i]]) r.add(`${x}|${y}`);
  return r;
};
const anschliessbar = (s: Spiel): Objekt[] => s.stand.objekte.filter((o) => ['haus', 'gross'].includes(KATALOG[o.typ].kategorie) && o.ohne_station);
const feld = (o: Objekt) => `${o.x}|${o.y}`;

describe('A89 Hausanschluss macht keine Häuser kalt', () => {
  it('A89: neues Spiel, Hausanschluss zu (13|12) – nach Bauzeit alle drei Starthäuser warm ohne Leitungstausch, c2 erledigt', () => {
    const z = { t: T0 };
    const s = new Spiel(neuerSpielstand(T0), () => z.t);
    s.ersteQuelleWaehlen('kessel');
    const vor = (sek: number) => { for (let i = 0; i < sek / 10; i++) { z.t += 10_000; s.bis(z.t); } };
    expect(s.abschnittPlanen().ok).toBe(true);
    vor(KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor + 10);
    const haus = s.stand.objekte.find((o) => o.x === 13 && o.y === 12)!;
    expect(s.hausanschlussPlanen(haus.id).ok).toBe(true);
    const weg = s.stand.objekte.filter((o) => o.geplant);
    expect(weg.length).toBeGreaterThan(0);
    expect(s.stationKaufen(haus.id, passendeStation(bedarfKw(haus)).id).ok).toBe(true);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    vor(KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(s.stand.abschnitt).toBeUndefined(); // Bau fertig
    expect(weg.every((o) => !o.geplant && KATALOG[o.typ].kategorie === 'netz')).toBe(true); // keine Leitung getauscht oder nachgebessert
    const warm = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && s.netz.warm.has(o.id)).map(feld).sort();
    expect(warm).toEqual(['12|14', '13|12', '9|13']);
    expect([...s.netz.kalt.values()].filter((grund) => grund === 'leitung')).toEqual([]);
    pruefeAuftraege(s);
    expect(s.stand.erledigt.c2).toBe(true);
  });

  it('A89: der Hausanschluss zu (13|12) legt kein Feld direkt neben die Heizzentrale', () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    s.ersteQuelleWaehlen('kessel');
    s.stand.abschnitt = { phase: 'offen', bau: null };
    expect(nebenHzVon(s.hz)).toEqual(NEBEN_HZ); // Voraussetzung: Heizzentrale bei (11|10), 2×2
    const haus = s.stand.objekte.find((o) => o.x === 13 && o.y === 12)!;
    expect(s.hausanschlussPlanen(haus.id).ok).toBe(true);
    const weg = s.stand.objekte.filter((o) => o.geplant).map(feld);
    expect(weg.length).toBeGreaterThan(0);
    expect(weg.filter((f) => NEBEN_HZ.has(f))).toEqual([]);
  });

  it('A89: geht es nur über ein Feld neben der Heizzentrale, wird kein Weg geplant', () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 1_000_000;
    s.stand.abschnitt = { phase: 'offen', bau: null };
    const haus = s.stand.objekte.find((o) => o.x === 13 && o.y === 12)!;
    // Freie Nachbarn von (13|12): (14|12), (13|13) – mit Felsbrocken zustellen. Übrig bleiben (12|12) und (13|11), beide neben der Heizzentrale.
    for (const [x, y] of [[14, 12], [13, 13]]) s.stand.objekte.push({ id: s.stand.naechste_id++, typ: 'stein', x, y, stufe: 1, bau: null, kasse_eur: 0 });
    const geld = s.stand.geld_eur;
    const r = s.hausanschlussPlanen(haus.id);
    expect(r.ok).toBe(false);
    expect(r.hinweis ?? '').not.toBe('');
    expect(s.stand.objekte.some((o) => o.geplant)).toBe(false);
    expect(s.stand.geld_eur).toBe(geld);
  });

  for (const stufe of [1, 2]) {
    it(`A89: Stufe ${stufe} – kein Hausanschluss im ganzen Ort macht ein vorher warmes Haus kalt, keiner liegt neben der Heizzentrale, nicht weniger Wege als vor A89`, () => {
      const befunde: string[] = [];
      let gefunden = 0;
      for (const ort of ORTE) {
        const anzahl = anschliessbar(new Spiel(neuerSpielstand(T0, ort.id), () => T0)).length;
        expect(anzahl, ort.id).toBeGreaterThan(30);
        for (let i = 0; i < anzahl; i++) {
          const s = new Spiel(neuerSpielstand(T0, ort.id), () => T0);
          s.ersteQuelleWaehlen('kessel');
          s.stand.geld_eur = 10_000_000; s.hz.stufe = stufe;
          s.stand.abschnitt = { phase: 'offen', bau: null };
          s.neuBerechnen();
          const vorher = new Set(s.netz.warm);
          expect(vorher.size).toBeGreaterThan(0);
          const haus = anschliessbar(s)[i];
          if (!s.hausanschlussPlanen(haus.id).ok) continue;
          gefunden++;
          const geplant = s.stand.objekte.filter((o) => o.geplant);
          const nebenHz = geplant.map(feld).filter((f) => nebenHzVon(s.hz).has(f));
          if (nebenHz.length) befunde.push(`${feld(haus)}: Weg neben der Heizzentrale ${nebenHz}`);
          if (KATALOG[haus.typ].kategorie === 'haus') expect(s.stationKaufen(haus.id, passendeStation(bedarfKw(haus)).id).ok).toBe(true);
          for (const o of geplant) delete o.geplant; // wie nach der Bauzeit
          s.neuBerechnen();
          const neuKalt = [...vorher].filter((id) => !s.netz.warm.has(id)).map((id) => feld(s.objekt(id)!));
          if (neuKalt.length) befunde.push(`${feld(haus)}: macht kalt ${neuKalt}`);
        }
      }
      expect(befunde).toEqual([]);
      expect(gefunden).toBeGreaterThanOrEqual(WEGE_VOR_A89[stufe]);
    });
  }
});
