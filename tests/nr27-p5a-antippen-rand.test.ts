import { describe, expect, it } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/start';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';

// NR27 P5a, Nachtrag P4-Review (1): Antippen außerhalb der Karte zeigt keinen Nord-Hinweis (DESIGN 14.4: dort nichts).
const T0 = 1_700_000_000_000;
type K = { mitte(x: number, y: number): [number, number]; feld(a: number, b: number): [number, number]; zentrieren(x: number, y: number, z: number): void };

function tippeFeld(u: EchteUmgebung, x: number, y: number): void {
  const k = u.st.kamera as unknown as K;
  k.zentrieren(x, y, 1);
  const [mx, my] = k.mitte(x, y);
  expect(k.feld(mx, my), `Testaufbau: Feld (${x}|${y})`).toEqual([x, y]);
  const canvas = u.dom.app.querySelector('canvas')!, ev = { pointerId: 3, clientX: mx, clientY: my, pointerType: 'touch', button: 0 };
  canvas.ausloesen('pointerdown', ev); canvas.ausloesen('pointerup', ev);
}

describe('NR27 P5a – Antippen außerhalb der Karte', () => {
  // Fehler, der ihn rot macht: die Feldkoordinate geht ungeprüft an nordInfo → „Hinter der Bahn …“ links, rechts und über der Karte.
  for (const [x, y] of [[-3, -5], [27, -6], [10, -14]] as const) {
    it(`(${x}|${y}) → kein Hinweis`, async () => {
      const st = neuerSpielstand(T0);
      const s = new Spiel(st, () => T0);
      await echteSteuerung(s, (u) => {
        tippeFeld(u, x, y);
        expect(u.meldungen).toEqual([]);
      });
    });
  }
});
