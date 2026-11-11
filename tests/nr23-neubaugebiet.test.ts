// NR23 (Simon 2026-11-11): „Das Neubaugebiet ist viel zu dicht gebaut, mach das breiter.“
// Entwurf docs/bauplaene/NR23-neubaugebiet-entwurf.md (Layout 3) und Umzug alter Stände ohne Verlust.
import { describe, expect, it } from 'vitest';
import { KATALOG, KONSTANTEN } from '../src/core/katalog';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { neubaugebietAnlegen, neubaugebietLayout2Anlegen, neubauPlan, spielOrt } from '../src/core/neubaugebiet';
import { laden, serialisieren } from '../src/core/speichern';
import type { Objekt, Spielstand } from '../src/core/typen';
import { neu } from './hilfen';

const N = KONSTANTEN.feldanzahl;
const kante = (typ: string) => KATALOG[typ as keyof typeof KATALOG].groesse ?? 1;

function stufe6(layout: 2 | 3): Spielstand {
  const stand = neuerSpielstand(0);
  stand.objekte[0].stufe = 6;
  stand.naechste_id = 2000;
  if (layout === 2) neubaugebietLayout2Anlegen(stand, 0); else neubaugebietAnlegen(stand, 0);
  return stand;
}
const neubauHaeuser = (s: Spielstand) => s.objekte.filter((o) => o.bestand && o.y >= N && KATALOG[o.typ].kategorie === 'haus');

describe('NR23 Layout 3: breitere Grundstücke', () => {
  const plan = neubauPlan(3);
  const stand = stufe6(3);
  const ort = spielOrt(stand);
  const strassen = new Set(ort.strassen.map(([x, y]) => y * N + x));
  const fluss = new Set(ort.fluss.map(([x, y]) => y * N + x));

  it('hat 40 Häuser in derselben Mischung wie vorher (13 EFH, 26 RH, 1 MFH) und eine 46 Felder hohe Karte', () => {
    expect(KONSTANTEN.neubau_hoehe).toBe(46);
    expect(plan).toHaveLength(40);
    expect(plan.filter((p) => p.typ === 'efh')).toHaveLength(13);
    expect(plan.filter((p) => p.typ === 'rh')).toHaveLength(26);
    expect(plan.filter((p) => p.typ === 'mfh')).toHaveLength(1);
    expect(stand.neubaugebiet_layout).toBe(3);
    expect(neubauHaeuser(stand)).toHaveLength(40);
    expect(new Spiel(stand, () => 0).kartenHoehe).toBe(46);
  });

  it('kein Haus auf Straße, Fluss oder außerhalb der Karte; zwischen allen Häusern mindestens ein freies Feld, auch über Eck', () => {
    for (const p of plan) {
      const k = kante(p.typ);
      expect(p.x >= 0 && p.x + k <= N && p.y >= N && p.y + k <= KONSTANTEN.neubau_hoehe).toBe(true);
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
        expect(strassen.has((p.y + dy) * N + p.x + dx)).toBe(false);
        expect(fluss.has((p.y + dy) * N + p.x + dx)).toBe(false);
      }
    }
    for (const a of plan) for (const b of plan) {
      if (a === b) continue;
      const ka = kante(a.typ), kb = kante(b.typ);
      const luecke_x = Math.max(b.x - (a.x + ka), a.x - (b.x + kb)), luecke_y = Math.max(b.y - (a.y + ka), a.y - (b.y + kb));
      expect(Math.max(luecke_x, luecke_y), `${a.typ} ${a.x}|${a.y} zu ${b.typ} ${b.x}|${b.y}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('jedes Haus hat genau ein Vorgartenfeld zur Straße (Platz für den Hausanschluss), keines steht direkt an der Straße', () => {
    for (const p of plan) {
      const k = kante(p.typ);
      const rand: Array<[number, number]> = [];
      for (let i = 0; i < k; i++) rand.push([p.x + i, p.y - 1], [p.x + i, p.y + k], [p.x - 1, p.y + i], [p.x + k, p.y + i]);
      expect(rand.some(([x, y]) => strassen.has(y * N + x)), `${p.x}|${p.y} direkt an der Straße`).toBe(false);
      const vorgarten = rand.filter(([x, y]) => !strassen.has(y * N + x)
        && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => strassen.has((y + dy) * N + x + dx)));
      expect(vorgarten.length, `${p.x}|${p.y} ohne Vorgarten`).toBeGreaterThan(0);
    }
  });

  it('drei Wohnstraßen gehen von der Sammelstraße ab, die alten Querstraßen sind weg', () => {
    const s = new Spiel(stand, () => 0);
    for (const y of [27, 34, 41]) for (const x of [1, 5, 15, 17]) expect(s.istStrasse(x, y)).toBe(true);
    for (let y = N; y <= 41; y++) expect(s.istStrasse(10, y)).toBe(true);
    expect(s.istStrasse(10, 42)).toBe(false);
    expect(s.istStrasse(15, 32)).toBe(false);
    expect(s.istStrasse(15, 37)).toBe(false);
    expect(s.istStrasse(5, 35)).toBe(false);
  });
});

describe('NR23 Umzug alter Stände (Layout 2 → 3)', () => {
  it('freie Häuser ziehen um, ein Haus mit Station bleibt stehen, die Straße darunter entfällt; kein Haus geht verloren', () => {
    const stand = stufe6(2);
    const vorher = neubauHaeuser(stand).map((o) => ({ id: o.id, typ: o.typ }));
    const fest = stand.objekte.find((o) => o.bestand && o.x === 8 && o.y === 27)!; // liegt auf der neuen Wohnstraße Nord
    fest.ohne_station = false;
    const spiel = new Spiel(stand, () => 0);
    const text = spiel.neubaugebietUmziehen();
    expect(stand.neubaugebiet_layout).toBe(3);
    expect([fest.x, fest.y]).toEqual([8, 27]);
    expect(stand.neubau_strassenluecken).toEqual([27 * N + 8]);
    expect(spiel.istStrasse(8, 27)).toBe(false);
    expect(spiel.istStrasse(7, 27)).toBe(true);
    const nachher = neubauHaeuser(stand);
    expect(nachher.map((o) => ({ id: o.id, typ: o.typ }))).toEqual(vorher);
    const plaetze = new Set(neubauPlan(3).map((p) => `${p.typ} ${p.x}|${p.y}`));
    expect(nachher.filter((o) => o !== fest).every((o) => plaetze.has(`${o.typ} ${o.x}|${o.y}`))).toBe(true);
    expect(text).toBe('Das Neubaugebiet ist jetzt großzügiger geplant: 39 Häuser sind auf breitere Grundstücke umgezogen. 1 Haus mit Anschluss bleibt, wo es ist.');
  });

  it('ein Haus mit Leitung am Rand bleibt samt Leitung, wo es ist; die Leitung bleibt unverändert', () => {
    const stand = stufe6(2);
    const haus = stand.objekte.find((o) => o.bestand && o.x === 12 && o.y === 24)!;
    const leitung = neu('d50', 11, 24, { id: 9000 });
    stand.objekte.push(leitung);
    const kopie = { ...leitung };
    new Spiel(stand, () => 0).neubaugebietUmziehen();
    expect([haus.x, haus.y]).toEqual([12, 24]);
    expect(stand.objekte.find((o) => o.id === 9000)).toEqual(kopie);
  });

  it('läuft nur einmal: zweiter Aufruf und erneutes Laden ändern nichts', () => {
    const stand = stufe6(2);
    const spiel = new Spiel(stand, () => 0);
    expect(spiel.neubaugebietUmziehen()).toMatch(/40 Häuser sind auf breitere Grundstücke umgezogen\.$/);
    const lage = JSON.stringify(stand.objekte.map((o: Objekt) => [o.id, o.x, o.y]));
    expect(spiel.neubaugebietUmziehen()).toBe('');
    const geladen = new Spiel(laden(serialisieren(stand), 0), () => 0);
    expect(geladen.neubaugebietUmziehen()).toBe('');
    expect(JSON.stringify(geladen.stand.objekte.map((o: Objekt) => [o.id, o.x, o.y]))).toBe(lage);
    expect(geladen.stand.neubaugebiet_layout).toBe(3);
  });

  it('geplante Leitung auf einer früheren Querstraße braucht danach keine neue Gestattung', () => {
    const stand = stufe6(2);
    stand.objekte.push(neu('d50', 15, 37, { id: 9001, geplant: true }));
    const spiel = new Spiel(stand, () => 0);
    spiel.neubaugebietUmziehen();
    expect(spiel.istStrasse(15, 37)).toBe(false);
    expect(stand.gestattungen).toContain(37 * N + 15);
  });

  it('neue Stände und Stände ohne Neubaugebiet bleiben unberührt', () => {
    const neuStand = stufe6(3);
    expect(new Spiel(neuStand, () => 0).neubaugebietUmziehen()).toBe('');
    const ohne = neuerSpielstand(0);
    expect(new Spiel(ohne, () => 0).neubaugebietUmziehen()).toBe('');
    expect(ohne.neubaugebiet).toBeUndefined();
  });
});
