import { describe, expect, it } from 'vitest';
import { zeichneGeruest, zeichneMonteur } from '../src/render/gebaeude';
import { Maler } from '../src/render/maler';
import { aufnahme } from './hilfen/nr22';

// NR27 P5b4: Der Monteur steckte fest in zeichneGeruest; für die Bahn-Baustelle (DESIGN 14.5 „Monteur steht an der Zielgrube“)
// ist er eine eigene Funktion. Dieser Test hält das Bild des Gerüsts fest, damit das Herausziehen nichts verändert.
//
// Werte von Hand: tw = 40, th = 20, zeit_s = 0, Gerüst bei (100|100), s = 0,8, hp = 22.
// Fußpunkt des Monteurs: mx = 100 + 40 · 0,35 · 0,8 = 111,2; my = 100 + 20 · 0,25 = 105.
// Körper: fillRect(mx − 1,4; my − 4,8; 2,8; 4) = (109,8 | 100,2 | 2,8 | 4) in '#e2582b'.
// Helm: arc um (111,2 | 105 − 6,4 = 98,6), Radius 40 · 0,045 = 1,8.
function maler(): { m: Maler; befehle: string[] } {
  const a = aufnahme(), m = new Maler(a.X);
  m.tw = 40; m.th = 20; m.zeit_s = 0;
  return { m, befehle: a.befehle };
}
const zahlen = (c: string): number[] => c.slice(c.indexOf('(') + 1, -1).split(',').map(Number);
const nah = (a: number[], b: number[]): boolean => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);

describe('NR27 P5b4: Monteur als eigene Figur (Aufräumen ohne Verhaltensänderung)', () => {
  // Fehler, die ihn rot machen: der Monteur steht beim Gerüst an anderer Stelle, hat andere Maße oder fehlt.
  it('zeichneGeruest zeichnet den Monteur rechts vorn am Gerüst wie bisher', () => {
    const { m, befehle } = maler();
    zeichneGeruest(m, 100, 100, 0.8, 22);
    const koerper = befehle.filter((c) => c.startsWith('fillRect('));
    expect(koerper).toHaveLength(1);
    expect(nah(zahlen(koerper[0]), [109.8, 100.2, 2.8, 4])).toBe(true);
    expect(befehle[befehle.indexOf(koerper[0]) - 1]).toBe('fillStyle=#e2582b');
    const helm = befehle.filter((c) => c.startsWith('arc('));
    expect(helm).toHaveLength(1);
    expect(nah(zahlen(helm[0]).slice(0, 3), [111.2, 98.6, 1.8])).toBe(true);
  });

  // Fehler, der ihn rot macht: zeichneMonteur weicht von der Figur am Gerüst ab (andere Farben, Arm, Lage zum Fußpunkt).
  it('zeichneMonteur am Fußpunkt zeichnet genau die Figur, die das Gerüst zeichnet', () => {
    const g = maler(), f = maler();
    zeichneGeruest(g.m, 100, 100, 0.8, 22);
    zeichneMonteur(f.m, 111.2, 105);
    expect(f.befehle.length).toBeGreaterThan(5);
    expect(g.befehle.slice(-f.befehle.length)).toEqual(f.befehle);
  });
});
