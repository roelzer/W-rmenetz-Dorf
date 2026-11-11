import { describe, expect, it } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { istLeitung, type TypId } from '../src/core/katalog';
import { neuerSpielstand } from '../src/core/start';
import type { Objekt } from '../src/core/typen';
import { T } from '../src/ui/tokens';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';

// NR20 V1 (Bauplan NR20-22 Fassung 2.4, E4 Regeln 2+3, Paket P3): Ein Zug, der auf einer vorhandenen Leitung beginnt, baut
// das Startfeld S nicht still um. Echte Steuerung, echte Zeigerereignisse, neues Startdorf (Heizzentrale auf (11|10), 2×2,
// src/core/start.ts), offener Bauabschnitt, kein Tutorial. (10|11) liegt links neben der Heizzentrale, (10|12) nicht.

const T0 = 1_000_000_000_000;
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const neu = (): Spiel => {
  const s = new Spiel(neuerSpielstand(T0), () => T0);
  s.stand.abschnitt = { phase: 'offen', bau: null };
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
const leitungBei = (s: Spiel, x: number, y: number): Objekt | undefined => s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === x && o.y === y);
/** Typ der Leitung auf (x|y): eingezeichnet = ihr Typ, gebaut = geplanter Ersatz, sonst ihr Typ; null = keine Leitung */
const typBei = (s: Spiel, x: number, y: number): TypId | null => { const o = leitungBei(s, x, y); return o ? (o.ersatz?.typ ?? o.typ) : null; };
const gebauteLeitung = (s: Spiel, typ: TypId, x: number, y: number): void => {
  s.stand.objekte.push({ id: s.stand.naechste_id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0 });
};

function punkt(u: EchteUmgebung, x: number, y: number): [number, number] {
  const k = u.st.kamera as unknown as { mitte(x: number, y: number): [number, number]; feld(a: number, b: number): [number, number] };
  const [mx, my] = k.mitte(x, y);
  expect(k.feld(mx, my), `Testaufbau: Feld (${x}|${y}) ist auf der Leinwand sichtbar`).toEqual([x, y]);
  return [mx, my];
}
function wische(u: EchteUmgebung, felder: Array<[number, number]>): void {
  const canvas = u.dom.app.querySelector('canvas')!;
  const evs = felder.map(([x, y]) => { const [mx, my] = punkt(u, x, y); return { pointerId: 7, clientX: mx, clientY: my, pointerType: 'touch', button: 0 }; });
  canvas.ausloesen('pointerdown', evs[0]);
  for (const ev of evs.slice(1)) canvas.ausloesen('pointermove', ev);
  canvas.ausloesen('pointerup', evs[evs.length - 1]);
}
const hilfeZu = (u: EchteUmgebung): void => { u.knoepfe().filter((k) => k.isConnected).find((k) => norm(k.textContent) === 'Verstanden')?.click(); };
const zeichne = (u: EchteUmgebung, typ: TypId, felder: Array<[number, number]>): void => { u.st.stempeln(typ); hilfeZu(u); wische(u, felder); };

describe('NR20 V1 – Zug ab einer vorhandenen Leitung (E4)', () => {
  it('test_v1_weiterzeichnen_startfeld_bleibt: 32er (10|11),(10|12), dann 25er (10|12)→(9|12) → (10|12) bleibt d32', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 11], [10, 12]]);
      zeichne(u, 'd25', [[10, 12], [9, 12]]);
      expect(typBei(s, 10, 12)).toBe('d32');
      expect(typBei(s, 9, 12)).toBe('d25');
    });
  });

  it('test_v1_schnell_wischen_luecklos: 32er-Ende (10|12), 25er-Zug direkt auf (10|15) → (10|13),(10|14),(10|15) belegt, (10|12) bleibt d32', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 11], [10, 12]]);
      zeichne(u, 'd25', [[10, 12], [10, 15]]);
      expect([typBei(s, 10, 13), typBei(s, 10, 14), typBei(s, 10, 15)]).toEqual(['d25', 'd25', 'd25']);
      expect(typBei(s, 10, 12)).toBe('d32');
    });
  });

  it('test_v1_abzweig_bleibt_dick: Abzweig (10|12) mit drei Leitungsnachbarn bleibt beim 25er-Zug d32', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 11], [10, 12], [10, 13]]);
      zeichne(u, 'd25', [[9, 12]]);
      zeichne(u, 'd25', [[10, 12], [10, 13], [10, 14]]);
      expect([typBei(s, 10, 12), typBei(s, 10, 13), typBei(s, 10, 14)]).toEqual(['d32', 'd25', 'd25']);
    });
  });

  it('Grenzfall Regel 3: genau zwei Leitungsnachbarn (Mitte einer geraden 32er) → Startfeld bleibt beim 25er-Zug d32', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 11], [10, 12], [10, 13]]);
      zeichne(u, 'd25', [[10, 12], [10, 13]]);
      expect([typBei(s, 10, 11), typBei(s, 10, 12), typBei(s, 10, 13)]).toEqual(['d32', 'd32', 'd25']);
    });
  });

  it('Randfall: Zittern im Startfeld (Bewegung über der Ziehschwelle, Finger bleibt auf S) entscheidet noch nichts', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 11], [10, 12]]);
      u.st.stempeln('d25');
      const k = u.st.kamera as unknown as { feld(a: number, b: number): [number, number] };
      const canvas = u.dom.app.querySelector('canvas')!;
      const [mx, my] = punkt(u, 10, 12), versatz = T.karte.ziehen_schwelle_px + 1;
      expect(k.feld(mx, my + versatz), 'Testaufbau: Zittern bleibt im Startfeld').toEqual([10, 12]);
      const [nx, ny] = punkt(u, 9, 12);
      const ev = (x: number, y: number) => ({ pointerId: 7, clientX: x, clientY: y, pointerType: 'touch', button: 0 });
      canvas.ausloesen('pointerdown', ev(mx, my));
      canvas.ausloesen('pointermove', ev(mx, my + versatz));
      canvas.ausloesen('pointermove', ev(nx, ny));
      canvas.ausloesen('pointerup', ev(nx, ny));
      expect(typBei(s, 10, 12)).toBe('d32');
      expect(typBei(s, 9, 12)).toBe('d25');
    });
  });

  it('test_v1_ende_an_hz_bleibt: Leitungsende (10|11) an der Heizzentrale bleibt beim 25er-Zug d32', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 11], [10, 12]]);
      zeichne(u, 'd25', [[10, 11], [10, 12]]);
      expect(typBei(s, 10, 11)).toBe('d32');
      expect(typBei(s, 10, 12)).toBe('d25');
    });
  });

  it('test_v1_ende_ueberzeichnet: freies Leitungsende (10|13) wird beim 25er-Zug Richtung Heizzentrale überzeichnet', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 11], [10, 12], [10, 13]]);
      zeichne(u, 'd25', [[10, 13], [10, 12]]);
      expect([typBei(s, 10, 11), typBei(s, 10, 12), typBei(s, 10, 13)]).toEqual(['d32', 'd25', 'd25']);
    });
  });

  it('test_v1_tippen_ueberzeichnet: Tipp mit dem 32er auf eine eingezeichnete 25er → d32', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd25', [[10, 13]]);
      expect(typBei(s, 10, 13), 'Testaufbau').toBe('d25');
      zeichne(u, 'd32', [[10, 13]]);
      expect(typBei(s, 10, 13)).toBe('d32');
    });
  });

  it('test_v1_tippen_ueberzeichnet: Tipp auf das Leitungsende an der Heizzentrale überzeichnet auch dünner', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 11], [10, 12]]);
      zeichne(u, 'd25', [[10, 11]]);
      expect(typBei(s, 10, 11)).toBe('d25');
    });
  });

  it('test_v1_ersetzen_entlang: gebaute 25er-Strecke, 32er-Zug ab dem ersten Feld → alle Felder Ersatz d32 (NR18 (d))', async () => {
    const s = neu();
    for (const y of [11, 12, 13]) gebauteLeitung(s, 'd25', 10, y);
    s.neuBerechnen();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 11], [10, 12], [10, 13]]);
      expect([11, 12, 13].map((y) => leitungBei(s, 10, y)?.ersatz?.typ)).toEqual(['d32', 'd32', 'd32']);
    });
  });

  // Sammelliste P5 Punkt 9 (Review P3, K1–K3)
  it('K1: Zug beginnt auf einer Leitung am Kartenrand (10|0) und geht über den Rand hinaus → Startfeld bleibt d32 (E4 Regel 2 „außerhalb“)', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      const k = u.st.kamera as unknown as { mitte(x: number, y: number): [number, number]; feld(a: number, b: number): [number, number]; zentrieren(x: number, y: number, kante: number): void };
      k.zentrieren(10, 0, 1);
      zeichne(u, 'd32', [[10, 1], [10, 0]]);
      expect([typBei(s, 10, 0), typBei(s, 10, 1)], 'Testaufbau').toEqual(['d32', 'd32']);
      u.st.stempeln('d25'); hilfeZu(u);
      const canvas = u.dom.app.querySelector('canvas')!;
      const [sx, sy] = punkt(u, 10, 0), [ax, ay] = k.mitte(10, -1);
      expect(k.feld(ax, ay), 'Testaufbau: Punkt liegt außerhalb der Karte').toEqual([10, -1]);
      const ev = (x: number, y: number) => ({ pointerId: 7, clientX: x, clientY: y, pointerType: 'touch', button: 0 });
      canvas.ausloesen('pointerdown', ev(sx, sy));
      canvas.ausloesen('pointermove', ev(ax, ay));
      canvas.ausloesen('pointerup', ev(ax, ay));
      expect([typBei(s, 10, 0), typBei(s, 10, 1)]).toEqual(['d32', 'd32']);
    });
  });

  it('K2: schnelles Wischen vom Leitungsende (10|13) über das freie (10|14) auf eine Leitung (10|15) → Startfeld bleibt d32 (F = erstes Feld neben S)', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 11], [10, 12], [10, 13]]);
      zeichne(u, 'd32', [[10, 15]]);
      expect([typBei(s, 10, 13), typBei(s, 10, 14), typBei(s, 10, 15)], 'Testaufbau').toEqual(['d32', null, 'd32']);
      zeichne(u, 'd25', [[10, 13], [10, 15]]);
      expect([typBei(s, 10, 13), typBei(s, 10, 14)]).toEqual(['d32', 'd25']);
    });
  });

  // Seit main 4d2aecd ist (11|9) Teil der Ausbaureserve 11..13|9..11: dort entsteht gar kein Leitungsende mehr. Der frühere
  // Fall „über der Heizzentrale“ wird deshalb als Ablehnung geprüft; die K3-Regel selbst prüfen die Fälle (12|12) und (10|10).
  it('K3: Zug über der Heizzentrale (11|9) wird abgelehnt – kein Rohr in der Ausbaureserve, Meldung „reserviert“', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[11, 9], [11, 8]]);
      expect(typBei(s, 11, 9), 'kein Rohr auf dem reservierten Feld').toBeNull();
      expect(u.meldungen).toContain('Dieses Feld ist für den Ausbau der Heizzentrale reserviert');
    });
  });

  it('K3: Leitungsende links der Heizzentrale (10|10) bleibt beim 25er-Zug d32', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 10], [10, 9]]);
      expect([typBei(s, 10, 10), typBei(s, 10, 9)], 'Testaufbau').toEqual(['d32', 'd32']);
      zeichne(u, 'd25', [[10, 10], [10, 9]]);
      expect([typBei(s, 10, 10), typBei(s, 10, 9)]).toEqual(['d32', 'd25']);
    });
  });

  it('K3: Leitungsende unter der Heizzentrale (12|12) bleibt beim 25er-Zug d32', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[12, 12], [12, 13]]);
      zeichne(u, 'd25', [[12, 12], [12, 13]]);
      expect([typBei(s, 12, 12), typBei(s, 12, 13)]).toEqual(['d32', 'd25']);
    });
  });

  it('K3: Leitungsende diagonal an der Ecke der Heizzentrale (10|9) wird beim 25er-Zug überzeichnet', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd32', [[10, 9], [10, 8]]);
      zeichne(u, 'd25', [[10, 9], [10, 8]]);
      expect([typBei(s, 10, 9), typBei(s, 10, 8)]).toEqual(['d25', 'd25']);
    });
  });
});
