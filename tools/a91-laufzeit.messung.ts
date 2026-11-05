import { describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { berechneNetz, bedarfKw } from '../src/core/netz';
import { passendeStation, type TypId } from '../src/core/katalog';
import type { InnenQuelle, Objekt } from '../src/core/typen';
import { berechneNetzAlt } from '../tests/hilfen/netz-alt-a91';

// A91 Laufzeitmessung M1–M5 (Bauplan docs/bauplaene/NR15-netzmodell.md, Paket P1). Je 20 Aufwärmläufe, dann Median.
// Die Grenzen sind hart: Reißt eine, ist das ein Fall für den Projektleiter, nicht für eine größere Grenze.
// Gezählt wird jede Netzrechnung, auch die in der Wegsuche von hausanschlussPlanen (deshalb der durchreichende Mock).

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
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 1e8;
    s.hz.stufe = 3;
    s.stand.abschnitt = { phase: 'offen', bau: null };
    // Volles Startdorf (Review P1, K2): Das Startnetz hat an der Heizzentrale nur d40 und ist nach 2–3 Häusern voll, und
    // mit Kessel Stufe 1 lehnt die Planung weitere Häuser wegen Wärmemangel ab. Deshalb d63 statt d40 und Kessel 5 schon
    // beim Planen. Ein Haus, an dem eine schon geplante Leitung vorbeiführt, braucht nur seine Station.
    for (const o of s.stand.objekte) if (o.typ === 'd40') o.typ = 'd63';
    s.stand.innen = KESSEL_5.map((q) => ({ ...q }));
    s.neuBerechnen();
    let angeschlossen = 0;
    for (const h of s.stand.objekte.filter((o) => ['efh', 'rh', 'baeck', 'mfh'].includes(o.typ) && o.ohne_station)) {
      const e = s.hausanschlussPlanen(h.id);
      if (!e.ok && e.hinweis !== 'Das Haus liegt schon an einer Leitung') continue;
      expect(s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
      angeschlossen++;
    }
    for (const o of s.stand.objekte) delete o.geplant;
    const objekte = s.stand.objekte;
    const neu = berechneNetz(objekte, KESSEL_5, 2), alt = berechneNetzAlt(objekte, KESSEL_5, 2);
    expect([...neu.kalt.values()]).not.toContain('station');
    // Wirkt die neue Regel hier? Gezählt gegen die eingefrorene alte Rechnung, nur berichtet: Die geplanten Hausanschlüsse
    // sind eigene Leitungsenden und das Netz trägt, also gibt es im Startdorf nichts zu wechseln (den schweren Fall misst M3).
    const wechsel = objekte.filter((o) => alt.anschluss.get(o.id)?.feld !== neu.anschluss.get(o.id)?.feld).length;
    const umgehaengt = [...neu.eltern].filter(([k, p]) => alt.eltern.get(k) !== p).length;
    const ms = miss(50, () => null, () => { berechneNetz(objekte, KESSEL_5, 2); });
    bericht('M1', ms, 2, `, ${angeschlossen} Anschlüsse, ${objekte.length} Objekte, ${wechsel} Anschlusswechsel, ${umgehaengt} umgehängte Felder`);
    expect(ms).toBeLessThanOrEqual(2);
  }, 120_000);

  it('M2 hausanschlussPlanen (8|18) im neuen Spiel: ≤ 10 ms', () => {
    const vorher = (): { s: Spiel; id: number } => {
      const s = new Spiel(neuerSpielstand(T0), () => T0);
      s.ersteQuelleWaehlen('kessel');
      s.stand.geld_eur = 1e8;
      s.stand.abschnitt = { phase: 'offen', bau: null };
      s.neuBerechnen();
      return { s, id: (s.stand.objekte.find((o) => o.x === 8 && o.y === 18) as Objekt).id };
    };
    const probe = vorher();
    expect(probe.s.hausanschlussPlanen(probe.id).ok).toBe(true);
    const ms = miss(25, vorher, ({ s, id }) => { s.hausanschlussPlanen(id); });
    bericht('M2', ms, 10);
    expect(ms).toBeLessThanOrEqual(10);
  }, 120_000);

  it('M3 Extremnetz: berechneNetz ≤ 8 ms', () => {
    const objekte = extremnetz(false);
    const ms = miss(50, () => null, () => { berechneNetz(objekte, KESSEL_5, 2); });
    bericht('M3', ms, 8, `, ${objekte.length} Objekte`);
    expect(ms).toBeLessThanOrEqual(8);
  }, 120_000);

  it('M4 Hausanschluss im Extremnetz: ≤ 100 ms', () => {
    let rechnungen = 0, ok = false;
    const ms = miss(9, () => extremSpiel('efh', 21, 21), ({ s, id }) => {
      zaehler.netzrechnungen = 0;
      ok = s.hausanschlussPlanen(id).ok;
      rechnungen = zaehler.netzrechnungen;
    });
    bericht('M4', ms, 100, `, ${rechnungen} Netzrechnungen, Weg gefunden: ${ok ? 'ja' : 'nein'}`);
    expect(ms).toBeLessThanOrEqual(100);
  }, 120_000);

  it('M5 Hausanschluss ohne möglichen Weg (Klinik im Extremnetz): ≤ 100 ms', () => {
    let rechnungen = 0;
    const hinweise = new Set<string | undefined>();
    const ms = miss(9, () => extremSpiel('klinik', 20, 20, { zustand: 'vertrag' }), ({ s, id }) => {
      zaehler.netzrechnungen = 0;
      const e = s.hausanschlussPlanen(id);
      hinweise.add(e.ok ? 'Weg gefunden' : e.hinweis);
      rechnungen = zaehler.netzrechnungen;
    });
    expect([...hinweise]).toEqual(['Kein Weg gefunden, bei dem alle Häuser warm bleiben']);
    bericht('M5', ms, 100, `, ${rechnungen} Netzrechnungen`);
    expect(ms).toBeLessThanOrEqual(100);
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
