import { describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { berechneNetz, bedarfKw, groesse } from '../src/core/netz';
import { istLeitung, passendeStation, type TypId } from '../src/core/katalog';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import type { InnenQuelle, Objekt } from '../src/core/typen';
import { berechneNetzAlt } from '../tests/hilfen/netz-alt-a91';
import { altesStartdorf } from '../tests/hilfen/altes-startdorf';

// A91 Laufzeitmessung M1, M3, M6 (Bauplan docs/bauplaene/NR15-netzmodell.md, Paket P1) und NR18 M7–M10 (Bauplan
// docs/bauplaene/NR18-ohne-autoanschluss.md, P2). M2, M4, M5 maßen die automatische Wegsuche, die es seit NR18 nicht mehr gibt.
// Je 20 Aufwärmläufe, dann Median. Die Grenzen sind hart: Reißt eine, ist das ein Fall für den Projektleiter, nicht für eine
// größere Grenze. Gezählt wird jede Netzrechnung einer Aktion (deshalb der durchreichende Mock).

const zaehler = vi.hoisted(() => ({ netzrechnungen: 0 }));
vi.mock('../src/core/netz', async (original) => {
  const m = await original<typeof import('../src/core/netz')>();
  return { ...m, berechneNetz: (...a: Parameters<typeof m.berechneNetz>) => { zaehler.netzrechnungen++; return m.berechneNetz(...a); } };
});

const T0 = 1_000_000_000_000;
const N = 24;
const AUFWAERMEN = 20;
const KESSEL_5: InnenQuelle[] = [{ typ: 'kessel', stufe: 5, bau: null }];

const median = (werte: number[]): number => { const s = [...werte].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
/** Misst `lauf` nach dem Aufwärmen `anzahl`-mal; `vorher` baut den Zustand außerhalb der Zeitmessung. */
function miss<T>(anzahl: number, vorher: () => T, lauf: (z: T) => void): number {
  for (let i = 0; i < AUFWAERMEN; i++) lauf(vorher());
  const zeiten: number[] = [];
  for (let i = 0; i < anzahl; i++) {
    const z = vorher();
    const t = performance.now();
    lauf(z);
    zeiten.push(performance.now() - t);
  }
  return median(zeiten);
}
const bericht = (name: string, ms: number, grenze: number, zusatz = ''): void => {
  console.log(`${name}: Median ${ms.toFixed(2)} ms (Grenze ${grenze} ms)${zusatz}`);
};

/** Extremnetz: Heizzentrale Stufe 3 bei (10|10); Leitung auf jedem Feld mit y % 3 = 0 oder x % 4 = 1 (d63 bei x % 8 = 1 oder
 *  y % 6 = 0, sonst d32), alle übrigen Felder EFH mit Station für 10 kW. Mit `eckeFrei` bleibt die Ecke x ≥ 17, y ≥ 17 leer. */
function extremnetz(eckeFrei: boolean): Objekt[] {
  const objekte: Objekt[] = [];
  let id = 1;
  const setze = (typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}): void => {
    objekte.push({ id: id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra });
  };
  setze('hz', 10, 10, { stufe: 3 });
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (x >= 10 && x <= 12 && y >= 10 && y <= 12) continue;
      if (eckeFrei && x >= 17 && y >= 17) continue;
      if (y % 3 === 0 || x % 4 === 1) setze(x % 8 === 1 || y % 6 === 0 ? 'd63' : 'd32', x, y);
      else setze('efh', x, y, { station: passendeStation(10).id });
    }
  }
  return objekte;
}
/** Kürzester Weg über freie Felder (Breitensuche) von einem Feld neben dem Haus bis an eine Leitung oder die Heizzentrale.
 *  [] = das Haus liegt schon daran, null = kein Weg. Nur für den Aufbau von M1/M7 – das Spiel selbst sucht keine Wege mehr. */
function wegZurLeitung(s: Spiel, h: Objekt): number[] | null {
  const netz = new Set<number>();
  for (const o of s.stand.objekte) {
    if (istLeitung(o.typ)) netz.add(o.y * N + o.x);
    else if (o.typ === 'hz') for (let dy = 0; dy < groesse(o); dy++) for (let dx = 0; dx < groesse(o); dx++) netz.add((o.y + dy) * N + o.x + dx);
  }
  const nachbarn = (f: number): number[] => {
    const x = f % N, y = Math.floor(f / N);
    return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N).map(([a, b]) => b * N + a);
  };
  const g = groesse(h), rand: number[] = [];
  for (let i = 0; i < g; i++) rand.push((h.y - 1) * N + h.x + i, (h.y + g) * N + h.x + i, (h.y + i) * N + h.x - 1, (h.y + i) * N + h.x + g);
  if (rand.some((f) => netz.has(f))) return [];
  const frei = (f: number): boolean => s.kannPlatzieren('d63', f % N, Math.floor(f / N));
  const herkunft = new Map<number, number>();
  const offen = rand.filter((f) => f >= 0 && f < N * N && frei(f));
  for (const f of offen) herkunft.set(f, -1);
  for (let i = 0; i < offen.length; i++) {
    const f = offen[i];
    if (nachbarn(f).some((n) => netz.has(n))) {
      const weg: number[] = [];
      for (let k = f; k !== -1; k = herkunft.get(k) as number) weg.push(k);
      return weg;
    }
    for (const n of nachbarn(f)) if (!herkunft.has(n) && frei(n)) { herkunft.set(n, f); offen.push(n); }
  }
  return null;
}
/** Volles altes Startdorf (Review P1, K2): Das Startnetz hat an der Heizzentrale nur d40 und ist nach 2–3 Häusern voll, und mit
 *  Kessel Stufe 1 reicht die Wärme nicht. Deshalb d63 statt d40 und Kessel 5. Jedes erreichbare Haus bekommt eine selbst
 *  gezeichnete d63 bis zur nächsten Leitung und seine Station; `ohneStation` bleibt ohne Station (für M7). Alles gebaut. */
function vollesStartdorf(): { s: Spiel; angeschlossen: number; ohneStation: number } {
  const s = new Spiel(altesStartdorf(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.stand.geld_eur = 1e8;
  s.hz.stufe = 3;
  s.stand.abschnitt = { phase: 'offen', bau: null };
  for (const o of s.stand.objekte) if (o.typ === 'd40') o.typ = 'd63';
  s.stand.innen = KESSEL_5.map((q) => ({ ...q }));
  s.neuBerechnen();
  const haeuser: Objekt[] = [];
  for (const h of s.stand.objekte.filter((o) => ['efh', 'rh', 'baeck', 'mfh'].includes(o.typ) && o.ohne_station)) {
    const weg = wegZurLeitung(s, h);
    if (weg === null) continue;
    for (const f of weg) expect(s.platzieren('d63', f % N, Math.floor(f / N)).ok).toBe(true);
    haeuser.push(h);
  }
  const ohneStation = haeuser[haeuser.length - 1].id;
  for (const h of haeuser) if (h.id !== ohneStation) expect(s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
  for (const o of s.stand.objekte) delete o.geplant;
  delete s.stand.abschnitt;
  s.neuBerechnen();
  return { s, angeschlossen: haeuser.length, ohneStation };
}

/** Spiel mit dem Extremnetz (Ecke frei) plus einem Gebäude ohne Station; Kessel Stufe 5, Abschnitt offen. */
function extremSpiel(typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}): { s: Spiel; id: number } {
  const s = new Spiel(neuerSpielstand(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.stand.geld_eur = 1e8;
  const objekte = extremnetz(true);
  const id = objekte.length + 1;
  objekte.push({ id, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ohne_station: true, ...extra });
  s.stand.objekte = objekte;
  s.stand.naechste_id = id + 1;
  s.stand.innen = KESSEL_5.map((q) => ({ ...q }));
  s.stand.abschnitt = { phase: 'offen', bau: null };
  s.neuBerechnen();
  return { s, id };
}

describe('A91 Laufzeit', () => {
  it('M1 Startdorf voll: berechneNetz ≤ 2 ms', () => {
    const { s, angeschlossen } = vollesStartdorf();
    const objekte = s.stand.objekte;
    const neu = berechneNetz(objekte, KESSEL_5, 2), alt = berechneNetzAlt(objekte, KESSEL_5, 2);
    expect([...neu.kalt.values()]).not.toContain('station');
    // Wirkt die neue Regel hier? Gezählt gegen die eingefrorene alte Rechnung, nur berichtet: Die gezeichneten Hausanschlüsse
    // sind eigene Leitungsenden und das Netz trägt, also gibt es im Startdorf nichts zu wechseln (den schweren Fall misst M3).
    const wechsel = objekte.filter((o) => alt.anschluss.get(o.id)?.feld !== neu.anschluss.get(o.id)?.feld).length;
    const umgehaengt = [...neu.eltern].filter(([k, p]) => alt.eltern.get(k) !== p).length;
    const ms = miss(50, () => null, () => { berechneNetz(objekte, KESSEL_5, 2); });
    bericht('M1', ms, 2, `, ${angeschlossen} Anschlüsse, ${objekte.length} Objekte, ${wechsel} Anschlusswechsel, ${umgehaengt} umgehängte Felder`);
    expect(ms).toBeLessThanOrEqual(2);
  }, 120_000);

  it('M3 Extremnetz: berechneNetz ≤ 8 ms', () => {
    const objekte = extremnetz(false);
    const ms = miss(50, () => null, () => { berechneNetz(objekte, KESSEL_5, 2); });
    bericht('M3', ms, 8, `, ${objekte.length} Objekte`);
    expect(ms).toBeLessThanOrEqual(8);
  }, 120_000);

  // NR18: Rechnungen je Aktion – neuBerechnen plus Probe-Netz(e) für Warnung und erreichte Häuser (AE-NR18-3).
  it('M7 stationKaufen mit Warnprüfung im vollen alten Startdorf: ≤ 4 ms', () => {
    const { s: voll, ohneStation } = vollesStartdorf();
    const text = serialisieren(voll.stand);
    let rechnungen = 0, ok = false;
    const ms = miss(25, () => new Spiel(ladenMitBefund(text, T0).stand, () => T0), (s) => {
      const h = s.objekt(ohneStation) as Objekt;
      zaehler.netzrechnungen = 0;
      ok = s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok;
      rechnungen = zaehler.netzrechnungen;
    });
    expect(ok).toBe(true);
    bericht('M7', ms, 4, `, ${rechnungen} Netzrechnungen`);
    expect(ms).toBeLessThanOrEqual(4);
  }, 120_000);

  it('M8 stationKaufen mit Warnprüfung im Extremnetz: ≤ 12 ms', () => {
    let rechnungen = 0, ok = false;
    // (17|17) liegt in der freien Ecke direkt an der Leitung (17|16).
    const ms = miss(25, () => extremSpiel('efh', 17, 17), ({ s, id }) => {
      zaehler.netzrechnungen = 0;
      ok = s.stationKaufen(id, passendeStation(10).id).ok;
      rechnungen = zaehler.netzrechnungen;
    });
    expect(ok).toBe(true);
    bericht('M8', ms, 12, `, ${rechnungen} Netzrechnungen`);
    expect(ms).toBeLessThanOrEqual(12);
  }, 120_000);

  it('M9 abschnittAbschliessen im Extremnetz: ≤ 8 ms', () => {
    let rechnungen = 0, ok = false;
    const ms = miss(25, () => extremSpiel('d32', 17, 17, { geplant: true, ohne_station: undefined }), ({ s }) => {
      zaehler.netzrechnungen = 0;
      ok = s.abschnittAbschliessen().ok;
      rechnungen = zaehler.netzrechnungen;
    });
    expect(ok).toBe(true);
    bericht('M9', ms, 8, `, ${rechnungen} Netzrechnungen`);
    expect(ms).toBeLessThanOrEqual(8);
  }, 120_000);

  it('M10 eine geplante Leitung platzieren (mit Abgleich der erreichten Häuser) im Extremnetz: ≤ 4 ms', () => {
    let rechnungen = 0, ok = false;
    const vorher = (): Spiel => {
      const { s } = extremSpiel('efh', 18, 18);
      // Das Extremnetz hat mehr Leitungen, als eine Heizzentrale je erlaubt; gemessen wird die Rechnung, nicht die Grenze.
      vi.spyOn(s, 'grenze').mockReturnValue(10_000);
      return s;
    };
    const ms = miss(25, vorher, (s) => {
      zaehler.netzrechnungen = 0;
      ok = s.platzieren('d32', 17, 17).ok;
      rechnungen = zaehler.netzrechnungen;
    });
    expect(ok).toBe(true);
    bericht('M10', ms, 4, `, ${rechnungen} Netzrechnungen`);
    expect(ms).toBeLessThanOrEqual(4);
  }, 120_000);
});

/** Dicht verlegtes Netz ohne Häuser (Review P2, W2): Heizzentrale Stufe 3 bei (10|10), Leitung auf jedem Feld, für das
 *  `typ` einen Typ liefert. Wechseln die Typen, erreicht die Breitensuche viele Felder über ein dünneres Feld (viele Umhängungen). */
function dichtesNetz(typ: (x: number, y: number) => TypId | null): Objekt[] {
  const objekte: Objekt[] = [{ id: 1, typ: 'hz', x: 10, y: 10, stufe: 3, bau: null, kasse_eur: 0 }];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (x >= 10 && x <= 12 && y >= 10 && y <= 12) continue;
      const t = typ(x, y);
      if (t) objekte.push({ id: objekte.length + 1, typ: t, x, y, stufe: 1, bau: null, kasse_eur: 0 });
    }
  }
  return objekte;
}

describe('A91 Laufzeit – viele Umhängungen', () => {
  // Grenze wie M3 (eine Netzrechnung im Extremnetz). M6b/M6c: die beiden weiteren Muster aus dem Review.
  const muster: Array<[string, (x: number, y: number) => TypId | null]> = [
    ['M6 Zeilen abwechselnd d32/d63', (_x, y) => (y % 2 === 0 ? 'd32' : 'd63')],
    ['M6b nur obere Hälfte (y < 12) so belegt', (_x, y) => (y >= 12 ? null : y % 2 === 0 ? 'd32' : 'd63')],
    ['M6c Diagonalmuster d32/d63', (x, y) => (Math.floor((x + y) / 2) % 2 === 0 ? 'd32' : 'd63')],
  ];
  for (const [name, typ] of muster) {
    it(`${name}: berechneNetz ≤ 8 ms`, () => {
      const objekte = dichtesNetz(typ);
      const neu = berechneNetz(objekte, KESSEL_5, 2), alt = berechneNetzAlt(objekte, KESSEL_5, 2);
      const umgehaengt = [...neu.eltern].filter(([k, p]) => alt.eltern.get(k) !== p).length;
      const msAlt = miss(50, () => null, () => { berechneNetzAlt(objekte, KESSEL_5, 2); });
      const ms = miss(50, () => null, () => { berechneNetz(objekte, KESSEL_5, 2); });
      bericht(name, ms, 8, `, ${objekte.length} Objekte, ${umgehaengt} umgehängte Felder, alte Rechnung ${msAlt.toFixed(2)} ms`);
      expect(ms).toBeLessThanOrEqual(8);
    }, 120_000);
  }
});
