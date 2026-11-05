import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG, KONSTANTEN, passendeStation, type TypId } from '../src/core/katalog';
import { berechneNetz, bedarfKw } from '../src/core/netz';
import { pruefeAuftraege } from '../src/core/auftraege';
import { ORTE } from '../src/core/orte';
import type { Netz, Objekt } from '../src/core/typen';
import { berechneNetzAlt } from './hilfen/netz-alt-a91';
import { pruefeVergleich } from './hilfen/a91-netze';

// A91 P3 (Bauplan docs/bauplaene/NR15-netzmodell.md, Fassung 3 Nachtrag 1, Abschnitt 5): Die automatische Hausanschluss-Planung
// (A89) sperrt die Felder neben der Heizzentrale nicht mehr. Dafür trägt ein Weg nur, wenn danach kein Haus neu „kalt: Leitung“
// ist und keine Planungsfehler-Warnung (W1-Engpass, A67-Reduzierung, A76-Aufteilung) neu dazukommt. Gibt es keinen solchen Weg,
// nimmt die Suche den Weg wie vor P3 (nur „kein Haus neu kalt“) – Anschließbarkeit geht vor, die Warnung bleibt sichtbar.

const T0 = 1_000_000_000_000;
const feld = (o: Pick<Objekt, 'x' | 'y'>): string => `${o.x}|${o.y}`;
const warnungen = (n: Netz): Set<string> => new Set([
  ...[...n.engpass].map((f) => `engpass ${f}`),
  ...[...n.reduzierung].map((f) => `reduzierung ${f}`),
  ...[...n.aufteilung].map((f) => `aufteilung ${f}`),
]);

/** Spiel im offenen Bauabschnitt mit genau diesen Objekten (fortlaufende IDs), Kessel Stufe 5. */
function spielMit(objekte: Array<Omit<Objekt, 'id' | 'stufe' | 'bau' | 'kasse_eur'> & Partial<Objekt>>): Spiel {
  const s = new Spiel(neuerSpielstand(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.stand.geld_eur = 1e7;
  s.stand.objekte = objekte.map((o, i) => ({ stufe: 1, bau: null, kasse_eur: 0, ...o, id: i + 1 }));
  s.stand.naechste_id = objekte.length + 1;
  s.stand.innen = [{ typ: 'kessel', stufe: 5, bau: null }];
  s.stand.abschnitt = { phase: 'offen', bau: null };
  s.neuBerechnen();
  return s;
}

describe('A91 P3 – Hausanschluss ohne Sperre neben der Heizzentrale', () => {
  it('A91: test_a91_hausanschluss_13_12_zwei_felder', () => {
    const z = { t: T0 };
    const s = new Spiel(neuerSpielstand(T0), () => z.t);
    s.ersteQuelleWaehlen('kessel');
    const vor = (sek: number): void => { for (let i = 0; i < sek / 10; i++) { z.t += 10_000; s.bis(z.t); } };
    expect(s.abschnittPlanen().ok).toBe(true);
    vor(KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(s.stand.abschnitt?.phase).toBe('offen');
    const haus = s.stand.objekte.find((o) => o.x === 13 && o.y === 12) as Objekt;
    expect(s.hausanschlussPlanen(haus.id).ok).toBe(true);
    const geplant = s.stand.objekte.filter((o) => o.geplant);
    expect(geplant.map(feld).sort()).toEqual(['11|12', '12|12']);
    expect(geplant.every((o) => o.typ === 'd25')).toBe(true);
    // 2 Felder × 400 € (Material d25 10 € × Kostenfaktor 40, katalog.ts; Straße, Anbohrung vor Freischaltung 0 €)
    expect(s.abschnittKosten_eur()).toBe(800);
    expect(s.stationKaufen(haus.id, passendeStation(bedarfKw(haus)).id).ok).toBe(true);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    vor(KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(s.stand.abschnitt).toBeUndefined();
    const warm = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && s.netz.warm.has(o.id)).map(feld).sort();
    expect(warm).toEqual(['12|14', '13|12', '9|13']);
    pruefeAuftraege(s);
    expect(s.stand.erledigt.c2).toBe(true);
  });

  it('A91: test_a91_keine_abkuerzung_neben_heizzentrale', () => {
    const d40 = (x: number, y: number) => ({ typ: 'd40' as TypId, x, y });
    const s = spielMit([
      { typ: 'hz', x: 10, y: 10 },
      d40(10, 9), d40(10, 8), d40(11, 8), d40(12, 8), d40(13, 8), d40(13, 9), d40(13, 10), d40(13, 11),
      { typ: 'efh', x: 9, y: 8, station: passendeStation(10).id },
      { typ: 'efh', x: 13, y: 12, ohne_station: true },
      { typ: 'efh', x: 11, y: 12, ohne_station: true },
      { typ: 'efh', x: 12, y: 12, ohne_station: true },
    ]);
    const ziel = s.stand.objekte.find((o) => o.x === 12 && o.y === 12) as Objekt;
    expect(s.hausanschlussPlanen(ziel.id).ok).toBe(true);
    const geplant = s.stand.objekte.filter((o) => o.geplant);
    // Ohne Warnprüfung (gemessen im Bauplan): 1 Feld (12|11), dann Engpass an (13|11) und (12|11).
    // Mit Warnprüfung: Umweg (14|11),(14|12),(14|13),(13|13),(12|13) ohne Warnung.
    expect(geplant.map(feld)).not.toContain('12|11');
    expect(geplant.map(feld).sort()).toEqual(['12|13', '13|13', '14|11', '14|12', '14|13']);
    expect(s.stationKaufen(ziel.id, passendeStation(bedarfKw(ziel)).id).ok).toBe(true);
    for (const o of s.stand.objekte) delete o.geplant;
    s.neuBerechnen();
    expect([...s.netz.engpass]).toEqual([]);
    expect([...s.netz.reduzierung]).toEqual([]);
    expect([...s.netz.aufteilung]).toEqual([]);
    expect([...s.netz.kalt.values()]).not.toContain('leitung');
    expect(s.netz.warm.has(ziel.id)).toBe(true);
  });

  it('A91: test_a91_rueckfall_ohne_warnpruefung_wenn_nur_warnender_weg', () => {
    // Wie oben, aber der Umweg ist zugestellt (Steine auf (14|11) und (12|13)): Es bleibt nur (12|11) mit Engpass-Warnung.
    // Rückfall (Projektleiter bestätigt): Der Weg wird trotzdem geplant, die Warnung zeigt die Planungsfehler-Anzeige.
    const d40 = (x: number, y: number) => ({ typ: 'd40' as TypId, x, y });
    const s = spielMit([
      { typ: 'hz', x: 10, y: 10 },
      d40(10, 9), d40(10, 8), d40(11, 8), d40(12, 8), d40(13, 8), d40(13, 9), d40(13, 10), d40(13, 11),
      { typ: 'efh', x: 9, y: 8, station: passendeStation(10).id },
      { typ: 'efh', x: 13, y: 12, ohne_station: true },
      { typ: 'efh', x: 11, y: 12, ohne_station: true },
      { typ: 'efh', x: 12, y: 12, ohne_station: true },
      { typ: 'stein', x: 14, y: 11 },
      { typ: 'stein', x: 12, y: 13 },
    ]);
    const ziel = s.stand.objekte.find((o) => o.x === 12 && o.y === 12) as Objekt;
    expect(s.hausanschlussPlanen(ziel.id).ok).toBe(true);
    expect(s.stand.objekte.filter((o) => o.geplant).map(feld)).toEqual(['12|11']);
  });

  it('A91: test_a91_kein_hinweis_auf_heizzentrale_mehr', () => {
    const quelle = readFileSync(new URL('../src/core/spiel.ts', import.meta.url), 'utf8');
    expect(quelle).not.toContain('darf der Hausanschluss nicht liegen');
  });

  it('A91: test_a91_durchlauf_ohne_sperre', () => {
    const anschliessbar = (s: Spiel): Objekt[] => s.stand.objekte.filter((o) => ['haus', 'gross'].includes(KATALOG[o.typ].kategorie) && o.ohne_station);
    const MIN_WEGE: Record<number, number> = { 1: 41, 2: 42 };
    // Höchstzahl Anschlüsse mit neuer Warnung: Stufe 1 heute 0, Stufe 2 heute 2, mit Warnprüfung und Rückfall 1 (Bauplan Abschnitt 5).
    const MAX_MIT_WARNUNG: Record<number, number> = { 1: 0, 2: 1 };
    for (const stufe of [1, 2]) {
      const neuKalt: string[] = [], mitWarnung: string[] = [], vergleich: string[] = [];
      let wege = 0;
      for (const ort of ORTE) {
        const anzahl = anschliessbar(new Spiel(neuerSpielstand(T0, ort.id), () => T0)).length;
        for (let i = 0; i < anzahl; i++) {
          const s = new Spiel(neuerSpielstand(T0, ort.id), () => T0);
          s.ersteQuelleWaehlen('kessel');
          s.stand.geld_eur = 1e7;
          s.hz.stufe = stufe;
          s.stand.abschnitt = { phase: 'offen', bau: null };
          s.neuBerechnen();
          const warmVorher = new Set(s.netz.warm), warnVorher = warnungen(s.netz);
          const h = anschliessbar(s)[i];
          if (!s.hausanschlussPlanen(h.id).ok) continue;
          wege++;
          if (KATALOG[h.typ].kategorie === 'haus') expect(s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
          for (const o of s.stand.objekte) delete o.geplant;
          s.neuBerechnen();
          const kalt = [...warmVorher].filter((id) => !s.netz.warm.has(id));
          if (kalt.length) neuKalt.push(`${ort.id} (${feld(h)}): ${kalt}`);
          const neu = [...warnungen(s.netz)].filter((w) => !warnVorher.has(w));
          if (neu.length) mitWarnung.push(`${ort.id} (${feld(h)}): ${neu}`);
          const o = s.stand.objekte;
          const alt = berechneNetzAlt(o, s.stand.innen, s.stand.preisstufe, s.vorlauf_c, s.grundgebuehr_eur);
          const jetzt = berechneNetz(o, s.stand.innen, s.stand.preisstufe, s.vorlauf_c, s.grundgebuehr_eur);
          for (const v of pruefeVergleich(alt, jetzt)) vergleich.push(`${ort.id} (${feld(h)}): ${v}`);
        }
      }
      expect(neuKalt, `Stufe ${stufe}`).toEqual([]);
      expect(vergleich, `Stufe ${stufe}`).toEqual([]);
      expect(mitWarnung.length, `Stufe ${stufe}: ${mitWarnung.join('; ')}`).toBeLessThanOrEqual(MAX_MIT_WARNUNG[stufe]);
      expect(wege, `Stufe ${stufe}`).toBeGreaterThanOrEqual(MIN_WEGE[stufe]);
    }
  }, 120_000);
});
