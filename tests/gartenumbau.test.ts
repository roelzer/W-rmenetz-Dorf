import { describe, expect, it } from 'vitest';
import { neubaugebietAnlegen } from '../src/core/neubaugebiet';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/start';
import { neu } from './hilfen';

describe('Rückbau des Gartenupdates', () => {
  function verschobenesHaus() {
    const stand = neuerSpielstand(0);
    const haus = stand.objekte.find((o) => o.typ === 'efh' && o.x === 18 && o.y === 14)!;
    stand.objekte = [stand.objekte[0], haus];
    haus.y = 13;
    stand.garten_layout = 1;
    return { stand, haus };
  }

  it('stellt den alten Standort wieder her und behält die Objekt-ID und Kundendaten', () => {
    const { stand, haus } = verschobenesHaus();
    haus.zufriedenheit_pct = 84;
    const id = haus.id;
    new Spiel(stand, () => 0).gartenumbauRueckgaengig();
    expect(haus).toMatchObject({ id, x: 18, y: 14, zufriedenheit_pct: 84 });
    expect(stand.garten_layout).toBeUndefined();
  });

  it('behält den neuen Platz bei einem inzwischen geplanten Anschluss oder belegten Ziel', () => {
    for (const neuObjekt of [neu('d25', 17, 13, { id: 500, geplant: true }), neu('baum', 18, 14, { id: 500 })]) {
      const { stand, haus } = verschobenesHaus();
      stand.objekte.push(neuObjekt);
      new Spiel(stand, () => 0).gartenumbauRueckgaengig();
      expect([haus.x, haus.y]).toEqual([18, 13]);
      expect(stand.objekte).toContain(neuObjekt);
    }
  });

  it('ordnet ein verschobenes Haus im Neubaugebiet über die feste Parzellenreihenfolge zu', () => {
    const stand = neuerSpielstand(0);
    const hz = stand.objekte[0];
    hz.stufe = 6;
    stand.naechste_id = 1200;
    neubaugebietAnlegen(stand, 0);
    const haus = stand.objekte.find((o) => o.id === 1200)!;
    const { x, y } = haus;
    haus.x--;
    stand.garten_layout = 1;
    new Spiel(stand, () => 0).gartenumbauRueckgaengig();
    expect([haus.x, haus.y]).toEqual([x, y]);
  });
});
