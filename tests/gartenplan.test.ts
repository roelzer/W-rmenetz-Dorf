import { describe, expect, it } from 'vitest';
import { istLeitung } from '../src/core/katalog';
import { groesse } from '../src/core/netz';
import { ortHolen, STANDARD_ORT } from '../src/core/orte';
import { neuerSpielstand } from '../src/core/start';
import { gartenplan } from '../src/render/gartenplan';
import { neu } from './hilfen';

describe('Grundstücke der Einfamilienhäuser', () => {
  it('verteilt 1, 2, 3, 4 und 6 Felder im Startdorf und lässt Straßen, Fluss, Nachbarn und Heizhaus frei', () => {
    const { objekte } = neuerSpielstand(0);
    const { strassen, fluss } = ortHolen(STANDARD_ORT);
    const { parzellen } = gartenplan({ objekte, strassen, fluss });
    const besucht = new Set<string>();
    const tabu = new Set([...strassen, ...fluss].map(([x, y]) => `${x},${y}`));
    const hz = objekte.find((o) => o.typ === 'hz')!;
    for (const o of objekte.filter((o) => !istLeitung(o.typ) && o.typ !== 'efh')) {
      const rand = o === hz ? 1 : 0, kante = groesse(o);
      for (let y = o.y - rand; y < o.y + kante + rand; y++) for (let x = o.x - rand; x < o.x + kante + rand; x++) tabu.add(`${x},${y}`);
    }
    expect(parzellen.size).toBe(objekte.filter((o) => o.typ === 'efh').length);
    expect(new Set([...parzellen.values()].map((g) => g.breite * g.tiefe))).toEqual(new Set([1, 2, 3, 4, 6]));
    for (const [id, g] of parzellen) {
      const haus = objekte.find((o) => o.id === id)!;
      expect(haus.x).toBeGreaterThanOrEqual(g.x);
      expect(haus.x).toBeLessThan(g.x + g.breite);
      expect(haus.y).toBeGreaterThanOrEqual(g.y);
      expect(haus.y).toBeLessThan(g.y + g.tiefe);
      for (let y = g.y; y < g.y + g.tiefe; y++) for (let x = g.x; x < g.x + g.breite; x++) {
        const feld = `${x},${y}`;
        expect(tabu.has(feld) || besucht.has(feld), feld).toBe(false);
        besucht.add(feld);
      }
    }
  });

  it('berechnet den Garten bei einem neuen Hindernis neu, lässt Leitungen jedoch unter dem Garten', () => {
    const haus = neu('efh', 8, 9, { id: 1 });
    const s = { objekte: [haus] };
    const alt = gartenplan(s);
    const g = alt.parzellen.get(1)!;
    expect(g.breite * g.tiefe).toBeGreaterThan(1);
    const x = g.x === haus.x && g.y === haus.y ? g.x + g.breite - 1 : g.x;
    const y = g.x === haus.x && g.y === haus.y ? g.y + g.tiefe - 1 : g.y;
    s.objekte.push(neu('d25', x, y, { id: 2 }));
    expect(gartenplan(s)).toBe(alt);
    s.objekte.push(neu('baum', x, y, { id: 3 }));
    const danach = gartenplan(s);
    expect(danach.schluessel).not.toBe(alt.schluessel);
  });
});
