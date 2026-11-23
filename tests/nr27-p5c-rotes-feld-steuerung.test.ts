import { describe, expect, it } from 'vitest';
import { istLeitung, type TypId } from '../src/core/katalog';
import { nordText } from '../src/core/nord-texte';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import type { Szene } from '../src/render/szene';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';

// NR27 P5c (DESIGN 14.5 „Falsch ziehen“, 14.15 Punkt 12): Die Steuerung meldet der Szene das abgelehnte Nordzonenfeld als
// `abgelehnt_feld = { x, y, bis_ms }`; genau ein Hinweis je Fingerzug bleibt. Muster wie tests/nr27-darstellung.test.ts.
//
// Werte von Hand: Das rote Feld steht 700 ms (Auftrag P5c: „~600–800 ms“, Mitte des Rahmens), also bis_ms = Uhr beim Ablehnen + 700.
// Stufe 5: Zug (10|0) → (10|−3): (10|−1) ist Grünstreifen und erlaubt, (10|−2) das erste Bahnfeld → abgelehnt (Q2).
const T0 = 1_700_000_000_000;

const spiel = (stufe: number): Spiel => {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  const s = new Spiel(st, () => T0);
  s.stand.abschnitt = { phase: 'offen', bau: null };
  s.stand.geld_eur = 10_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
function punkt(u: EchteUmgebung, x: number, y: number): [number, number] {
  const k = u.st.kamera as unknown as { mitte(x: number, y: number): [number, number]; feld(a: number, b: number): [number, number] };
  const [mx, my] = k.mitte(x, y);
  expect(k.feld(mx, my), `Testaufbau: Feld (${x}|${y})`).toEqual([x, y]);
  return [mx, my];
}
function wische(u: EchteUmgebung, felder: Array<[number, number]>): void {
  const canvas = u.dom.app.querySelector('canvas')!;
  const evs = felder.map(([x, y]) => { const [mx, my] = punkt(u, x, y); return { pointerId: 7, clientX: mx, clientY: my, pointerType: 'touch', button: 0 }; });
  canvas.ausloesen('pointerdown', evs[0]);
  for (const ev of evs.slice(1)) canvas.ausloesen('pointermove', ev);
  canvas.ausloesen('pointerup', evs[evs.length - 1]);
}
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const zeichne = (u: EchteUmgebung, typ: TypId, felder: Array<[number, number]>): void => {
  u.st.stempeln(typ);
  u.knoepfe().filter((k) => k.isConnected).find((k) => norm(k.textContent) === 'Verstanden')?.click();
  wische(u, felder);
};
const blick = (u: EchteUmgebung, x: number, y: number): void => (u.st.kamera as unknown as { zentrieren(x: number, y: number, k: number): void }).zentrieren(x, y, 1);
const szene = (u: EchteUmgebung): Szene => (u.st as unknown as { szene(): Szene }).szene();
const leitungBei = (s: Spiel, x: number, y: number) => s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === x && o.y === y);

describe('NR27 P5c rotes Feld: Steuerung → Szene (14.15 Punkt 12)', () => {
  // Fehler, die ihn rot machen: die Steuerung merkt sich das Feld nicht, merkt sich das letzte erlaubte statt des abgelehnten Felds,
  // nimmt ein späteres Feld des Zugs, oder der Hinweis kommt mehr als einmal.
  it('test_nr27_p5c_feld_beim_ziehen: Zug über die Gleise vor Stufe 6 → (10|−2) rot, ein Hinweis', async () => {
    const s = spiel(5);
    let jetzt = T0;
    await echteSteuerung(s, (u) => {
      blick(u, 10, -1);
      zeichne(u, 'd40', [[10, 1], [10, 0]]);
      expect(szene(u).abgelehnt_feld, 'vorher kein rotes Feld').toBeUndefined();
      u.meldungen.splice(0);
      jetzt = T0 + 5_000;
      zeichne(u, 'd40', [[10, 0], [10, -1], [10, -2], [10, -3]]);
      expect(leitungBei(s, 10, -1), 'Testaufbau: Grünstreifen erlaubt').toBeDefined();
      expect(szene(u).abgelehnt_feld).toEqual({ x: 10, y: -2, bis_ms: T0 + 5_700 });
      expect(u.meldungen).toEqual([nordText('Q2', { sperrgrund: 'ab Heizzentrale Stufe 6' })]);
    }, { uhr: () => jetzt });
  });

  // Fehler, die ihn rot machen: das Feld bleibt für immer stehen, oder es verschwindet schon vor 700 ms (Grenze bis_ms ausschließlich).
  it('test_nr27_p5c_feld_dauer: bei +699 ms noch da, ab +700 ms weg', async () => {
    const s = spiel(5);
    let jetzt = T0;
    await echteSteuerung(s, (u) => {
      blick(u, 10, -1);
      zeichne(u, 'd40', [[10, 1], [10, 0]]);
      zeichne(u, 'd40', [[10, 0], [10, -3]]);
      jetzt = T0 + 699;
      expect(szene(u).abgelehnt_feld, '+699 ms').toEqual({ x: 10, y: -2, bis_ms: T0 + 700 });
      jetzt = T0 + 700;
      expect(szene(u).abgelehnt_feld, '+700 ms').toBeUndefined();
    }, { uhr: () => jetzt });
  });

  // Fehler, der ihn rot macht: nur das Ziehen setzt das Feld, das Antippen eines gesperrten Felds im Leitungsmodus nicht.
  it('test_nr27_p5c_feld_beim_tippen: Antippen von (14|−2) ab Stufe 6 → rot, Hinweis STELLE', async () => {
    const s = spiel(6);
    await echteSteuerung(s, (u) => {
      blick(u, 14, -1);
      u.meldungen.splice(0);
      zeichne(u, 'd40', [[14, -2]]);
      expect(szene(u).abgelehnt_feld).toEqual({ x: 14, y: -2, bis_ms: T0 + 700 });
      expect(u.meldungen).toEqual([nordText('STELLE')]);
    }, { uhr: () => T0 });
  });

  // Fehler, der ihn rot macht: das Feld hinter der Bahn (Kulisse) zählt nicht als abgelehnt.
  it('test_nr27_p5c_feld_hinter_der_bahn: Stufe 6, Zug (10|0) → (10|−6) → (10|−4) rot', async () => {
    const s = spiel(6);
    await echteSteuerung(s, (u) => {
      blick(u, 10, -2);
      zeichne(u, 'd40', [[10, 1], [10, 0]]);
      zeichne(u, 'd40', [[10, 0], [10, -6]]);
      expect(szene(u).abgelehnt_feld).toEqual({ x: 10, y: -4, bis_ms: T0 + 700 });
    }, { uhr: () => T0 });
  });

  // Fehler, der ihn rot macht: ein normal erlaubter Zug ohne Ablehnung setzt trotzdem ein rotes Feld.
  it('test_nr27_p5c_kein_feld_ohne_ablehnung: erlaubter Zug im Dorf → kein rotes Feld', async () => {
    const s = spiel(6);
    await echteSteuerung(s, (u) => {
      blick(u, 10, 1);
      zeichne(u, 'd40', [[10, 2], [10, 1], [10, 0]]);
      expect(leitungBei(s, 10, 0), 'Testaufbau').toBeDefined();
      expect(szene(u).abgelehnt_feld).toBeUndefined();
    }, { uhr: () => T0 });
  });
});
