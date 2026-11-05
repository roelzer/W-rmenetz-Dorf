import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG, passendeStation } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';

// A89 – verwirft die Wegsuche jeden Weg, weil danach ein Haus wegen der Leitung kalt wäre, sagt der Hinweis genau das
// (sonst stünde dort „Kein Weg zu einer Leitung gefunden“, obwohl Wege zu sehen sind). Echtes Kernmodul, keine Attrappen.

const T0 = 1_000_000_000_000;

describe('A89 Hausanschluss – Hinweis, wenn jeder Weg ein Haus kalt machen würde', () => {
  it('A89: Hauptleitung nur 32er, jeder Weg hängt an ihr – Hinweis „bei dem alle Häuser warm bleiben“, nichts geplant, kein Geld weg', () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 1_000_000;
    s.stand.abschnitt = { phase: 'offen', bau: null };
    // Startdorf: Hauptleitung (10|10)…(10|14) und (11|14) an der Heizzentrale (11|10), daran zwei Häuser mit je 10 kW.
    // Als 32er (25 kW) trägt sie diese 20 kW, ein drittes Haus mit 10 kW (30 kW) aber nicht mehr.
    for (const o of s.stand.objekte) if (KATALOG[o.typ].kategorie === 'netz') o.typ = 'd32';
    // Zugestellt: die freien Felder neben der Heizzentrale und die beiden freien Nachbarn von (10|10). (10|10) grenzt selbst an die
    // Heizzentrale; ein Anschluss dort wäre ein eigener Abgang und trüge das neue Haus ohne die anderen.
    for (const [x, y] of [[13, 10], [13, 11], [11, 9], [12, 9], [11, 12], [12, 12], [10, 9], [9, 10]]) {
      s.stand.objekte.push({ id: s.stand.naechste_id++, typ: 'stein', x, y, stufe: 1, bau: null, kasse_eur: 0 });
    }
    s.neuBerechnen();
    expect(s.netz.warm.size).toBe(2); // Voraussetzung: beide Häuser an der 32er sind warm
    const haus = s.stand.objekte.find((o) => o.x === 13 && o.y === 12)!;
    const geld = s.stand.geld_eur;
    const r = s.hausanschlussPlanen(haus.id);
    expect(r.ok).toBe(false);
    expect(r.hinweis).toBe('Kein Weg gefunden, bei dem alle Häuser warm bleiben');
    expect(s.stand.objekte.some((o) => o.geplant)).toBe(false);
    expect(s.stand.geld_eur).toBe(geld);
  });

  it('A89: Häuser, die schon vorher wegen der Leitung kalt sind, verhindern einen Anschluss nicht, der sie nicht verschlechtert', () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 1_000_000;
    s.stand.abschnitt = { phase: 'offen', bau: null };
    // Hauptleitung als 25er (15 kW) trägt die zwei Starthäuser (20 kW) nicht – beide sind schon vor dem Anschluss kalt.
    for (const o of s.stand.objekte) if (KATALOG[o.typ].kategorie === 'netz') o.typ = 'd25';
    s.neuBerechnen();
    const kaltVorher = [...s.netz.kalt].filter(([, grund]) => grund === 'leitung').map(([id]) => id).sort();
    expect(kaltVorher.length).toBe(2);
    const haus = s.stand.objekte.find((o) => o.x === 13 && o.y === 12)!;
    expect(s.hausanschlussPlanen(haus.id).ok).toBe(true);
    expect(s.stationKaufen(haus.id, passendeStation(bedarfKw(haus)).id).ok).toBe(true);
    for (const o of s.stand.objekte) delete o.geplant; // wie nach der Bauzeit
    s.neuBerechnen();
    expect(s.netz.warm.has(haus.id)).toBe(true);
    expect([...s.netz.kalt].filter(([, grund]) => grund === 'leitung').map(([id]) => id).sort()).toEqual(kaltVorher);
  });

  it('A89: geht es nur über ein Feld neben der Heizzentrale, nennt der Hinweis die Heizzentrale als Grund', () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    s.ersteQuelleWaehlen('kessel');
    s.stand.abschnitt = { phase: 'offen', bau: null };
    const haus = s.stand.objekte.find((o) => o.x === 13 && o.y === 12)!;
    // Freie Nachbarn von (13|12) außer denen neben der Heizzentrale: (14|12), (13|13).
    for (const [x, y] of [[14, 12], [13, 13]]) s.stand.objekte.push({ id: s.stand.naechste_id++, typ: 'stein', x, y, stufe: 1, bau: null, kasse_eur: 0 });
    expect(s.hausanschlussPlanen(haus.id).hinweis).toBe('Kein Weg zu einer Leitung gefunden – direkt neben der Heizzentrale darf der Hausanschluss nicht liegen');
  });
});
