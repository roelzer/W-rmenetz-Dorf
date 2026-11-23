import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { bahnFelder } from '../src/core/nordviertel';
import type { Objekt } from '../src/core/typen';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { neu } from './hilfen';
import { aufnahme } from './hilfen/nr22';

// NR27 P5b3 (DESIGN 14.5 „Zeichnen“ und „Fertig“, 14.9, 14.15 Punkte 11, 15, 22; Entscheidung 23.11.: Strichellinie nimmt dieselben
// Arme wie das Rohr, auch den Punkt bei einer einzelnen Leitung). Muster wie tests/nr27-darstellung-nord.test.ts.
//
// Werte von Hand: Zoom 1,4 bei 844×390 → Basis min(844/26, 390/15) = 26 px, tw = 36,4 px. d40: breite 0,08, farbe '#6ec6ff'
// (core/katalog.ts) → Rohrbreite max(1,5; 36,4 · 0,08 · 0,62) = 1,80544 px; Strichellinie 60 % = 1,083264 px.
// Vorschau-Farbe `karte.pfeil_ok` = '#2e7a4e' (deckendes Grün statt `vorschau_ok` mit 40 %: auf Schotter kaum sichtbar, Foto P5b3); `bahn.schutzrohr` '#2f3a40'; `bahn.merkpfahl` '#f4f1ea',
// Kappe `menue.farbe.naht_vorlauf` '#ff8a1f'. Ringe vor den Zäunen bei y = −1,38 und −3,62.
const D40 = '#6ec6ff', W = 1.80544, STRICH = 1.083264, VORSCHAU = '#2e7a4e';
const SCHUTZROHR = 'strokeStyle=#2f3a40', MERKPFAHL = 'strokeStyle=#f4f1ea', KAPPE = 'strokeStyle=#ff8a1f';

function kamera(): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = 1.4; k.zentrieren(10, -2.5, 1);
  return k;
}
const szene = (objekte: Objekt[], extra: Partial<Szene> = {}): Szene => ({
  objekte, innen: [], netz: berechneNetz(objekte, [], 1), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 50_000, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46,
  bahn: bahnFelder(), ...extra,
});
function bild(s: Szene, reduziert = true): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  m.reduziert = reduziert;
  bodenEbeneEinrichten(null);
  zeichneSzene(m, kamera(), s, new Effekte(), 0.016);
  return a.befehle;
}

/** Jeder moveTo mit dem Strich, der in dem Moment eingestellt war (Farbe, Breite, Strichelung). */
interface Zug { x: number; y: number; farbe: string; breite: number; strichel: boolean; alpha: number }
function zuege(b: string[]): Zug[] {
  let farbe = '', breite = 1, strichel = false, alpha = 1;
  const r: Zug[] = [];
  for (const c of b) {
    if (c.startsWith('strokeStyle=')) farbe = c.slice(12);
    else if (c.startsWith('lineWidth=')) breite = Number(c.slice(10));
    else if (c.startsWith('globalAlpha=')) alpha = Number(c.slice(12));
    else if (c.startsWith('setLineDash(')) strichel = c !== 'setLineDash([])';
    else if (c.startsWith('moveTo(')) { const [x, y] = c.slice(7, -1).split(',').map(Number); r.push({ x, y, farbe, breite, strichel, alpha }); }
  }
  return r;
}
const nah = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
const ab = (z: Zug[], k: Kamera, x: number, y: number): Zug[] => { const [cx, cy] = k.mitte(x, y); return z.filter((q) => nah(q.x, cx) && nah(q.y, cy)); };
const rohrAuf = (z: Zug[], k: Kamera, x: number, y: number, farbe: string): boolean =>
  ab(z, k, x, y).some((q) => q.farbe === farbe && nah(q.breite, W) && !q.strichel);
const strichelAuf = (z: Zug[], k: Kamera, x: number, y: number, farbe: string): boolean =>
  ab(z, k, x, y).some((q) => q.farbe === farbe && nah(q.breite, STRICH) && q.strichel);
/** ellipse(...)-Aufrufe mit Mittelpunkt bei (x|y) und der Deckkraft, die beim Aufruf galt. */
function ringe(b: string[], k: Kamera, x: number, y: number): number[] {
  const [cx, cy] = k.mitte(x, y);
  let alpha = 1;
  const r: number[] = [];
  for (const c of b) {
    if (c.startsWith('globalAlpha=')) alpha = Number(c.slice(12));
    if (!c.startsWith('ellipse(')) continue;
    const [ex, ey] = c.slice(8, -1).split(',').map(Number);
    if (nah(ex, cx) && nah(ey, cy)) r.push(alpha);
  }
  return r;
}
const geplant = (x: number, y: number): Objekt => neu('d40', x, y, { geplant: true });
/** Heizzentrale weit im Süden, außerhalb des Bilds: berechneNetz braucht einen Ursprung. */
const HZ = neu('hz', 11, 30);

describe('NR27 P5b3 Vorschau: Strichellinie statt Rohr auf den Bahnfeldern (14.15 Punkt 11)', () => {
  // Fehler, die ihn rot machen: zeichneLeitungen kennt die Bahnfelder nicht (Rohr auf den Gleisen), die Strichellinie fehlt,
  // sie ist nicht 60 % breit oder nicht in Vorschau-Farbe, oder auch (10|−1) bekommt die Strichellinie.
  it('test_nr27_kein_rohr_auf_bahn: Rohr auf (10|−1), Strichellinie in Vorschau-Farbe auf (10|−2) und (10|−3)', () => {
    const k = kamera(), leitungen = [geplant(10, -1), geplant(10, -2), geplant(10, -3)];
    const z = zuege(bild(szene([HZ, ...leitungen])));
    expect(rohrAuf(z, k, 10, -1, D40), 'Grünstreifen: normales Rohr').toBe(true);
    expect(strichelAuf(z, k, 10, -1, VORSCHAU), 'Grünstreifen: keine Strichellinie').toBe(false);
    for (const y of [-2, -3]) {
      expect(rohrAuf(z, k, 10, y, D40), `(10|${y}) kein Rohr`).toBe(false);
      expect(strichelAuf(z, k, 10, y, VORSCHAU), `(10|${y}) Strichellinie`).toBe(true);
    }
    const ohneBahn = zuege(bild(szene([HZ, ...leitungen], { bahn: undefined })));
    expect([-1, -2, -3].every((y) => rohrAuf(ohneBahn, k, 10, y, D40)), 'Gegenprobe ohne Bahn: überall Rohr').toBe(true);
  });

  // Fehler, die ihn rot machen: die Strichellinie lässt den Punkt einer einzelnen Leitung weg, oder es kommen Ringe an beide Enden.
  it('test_nr27_strichel_punkt: einzelne Leitung auf (10|−2) zeigt den gestrichelten Punkt und nur den südlichen Ring', () => {
    const k = kamera(), [cx, cy] = k.mitte(10, -2);
    const b = bild(szene([HZ, geplant(10, -2)]));
    expect(zuege(b).some((q) => nah(q.x, cx - 1) && nah(q.y, cy) && q.strichel && q.farbe === VORSCHAU)).toBe(true);
    expect(ringe(b, k, 10, -1.38), 'Ring vor dem Zaun Süd').not.toEqual([]);
    expect(ringe(b, k, 10, -3.62), 'kein Ring im Norden').toEqual([]);
  });

  // Fehler, die ihn rot machen: Ringe fehlen in der Vorschau, sind voll deckend, oder es stehen schon Merkpfähle.
  it('test_nr27_vorschau_ringe: zwei Schutzrohr-Ringe mit 50 % Deckkraft, keine Merkpfähle', () => {
    const k = kamera(), b = bild(szene([HZ, geplant(10, -1), geplant(10, -2), geplant(10, -3)]));
    expect(ringe(b, k, 10, -1.38)).toEqual([0.5]);
    expect(ringe(b, k, 10, -3.62)).toEqual([0.5]);
    expect(b.includes(MERKPFAHL)).toBe(false);
  });
});

describe('NR27 P5b3 fertige Querung (14.15 Punkt 15)', () => {
  // Heizzentrale bei (10|1) belegt x 10–11, y 1–2 (tests/hilfen.ts); Leitung nach Norden über die Bahn bis (10|−4), dort das Haus.
  const fertig = (): Objekt[] => [neu('hz', 10, 1), ...[0, -1, -2, -3, -4].map((y) => neu('d40', 10, y)), neu('efh', 11, -4)];

  // Fehler, die ihn rot machen: Rohr auf den Bahnfeldern, Strichellinie nicht in Rohrfarbe, Ringe halb durchsichtig oder ohne
  // Außenring `schutzrohr`, Merkpfähle fehlen.
  it('test_nr27_querung_fertig: Strichellinie in Rohrfarbe, Ringe voll deckend mit Außenring, zwei Merkpfähle mit Kappe', () => {
    const k = kamera(), s = szene(fertig());
    expect(s.netz.tiefe.has(-2 * 24 + 10), 'Testaufbau: (10|−2) hängt am Netz').toBe(true);
    const b = bild(s), z = zuege(b);
    for (const y of [-2, -3]) {
      expect(rohrAuf(z, k, 10, y, D40), `(10|${y}) kein Rohr`).toBe(false);
      expect(strichelAuf(z, k, 10, y, D40), `(10|${y}) Strichellinie in Rohrfarbe`).toBe(true);
    }
    expect(rohrAuf(z, k, 10, -4, D40), 'Böschung: normales Rohr').toBe(true);
    expect(ringe(b, k, 10, -1.38)).toEqual([1]);
    expect(ringe(b, k, 10, -3.62)).toEqual([1]);
    expect(b.filter((c) => c === SCHUTZROHR).length, 'Außenring je Ring').toBeGreaterThanOrEqual(2);
    expect(b.filter((c) => c === MERKPFAHL).length, 'zwei Merkpfähle').toBe(2);
    expect(b.filter((c) => c === KAPPE).length, 'zwei Kappen').toBe(2);
  });

  // Fehler, die ihn rot machen: die Fließpunkte entfallen auf den Bahnfeldern, oder sie laufen auch bei weniger Bewegung.
  it('test_nr27_querung_fliesspunkte: Fließpunkte laufen über die Strichellinie, nur bei Animation an', () => {
    const k = kamera(), s = szene(fertig());
    expect(s.netz.last_kw.get(-2 * 24 + 10) ?? 0, 'Testaufbau: Last hinter (10|−2)').toBeGreaterThan(0);
    const [ax, ay] = k.mitte(10, -1), [bx, by] = k.mitte(10, -2);
    const zwischen = (b: string[]): boolean => b.some((c) => {
      if (!c.startsWith('arc(')) return false;
      const [px, py] = c.slice(4, -1).split(',').map(Number), t = (px - ax) / (bx - ax);
      return t > 0 && t < 1 && Math.abs(ay + (by - ay) * t - py) < 1e-6;
    });
    expect(zwischen(bild(s, false)), 'mit Animation').toBe(true);
    expect(zwischen(bild(s, true)), 'weniger Bewegung').toBe(false);
  });

  // Fehler, der ihn rot macht: Ringe und Pfähle hängen an etwas anderem als den Leitungen auf den Bahnfeldern (Randfall „entfernt“).
  it('test_nr27_querung_entfernt: ohne Leitung auf den Bahnfeldern keine Ringe, keine Merkpfähle', () => {
    const k = kamera(), b = bild(szene([neu('hz', 10, 1), neu('d40', 10, 0), neu('d40', 10, -1)]));
    expect(ringe(b, k, 10, -1.38)).toEqual([]);
    expect(ringe(b, k, 10, -3.62)).toEqual([]);
    expect(b.includes(MERKPFAHL)).toBe(false);
  });
});
