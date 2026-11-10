import { describe, expect, it } from 'vitest';
import { istLeitung } from '../src/core/katalog';
import { groesse } from '../src/core/netz';
import { ortHolen, STANDARD_ORT } from '../src/core/orte';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/start';
import { gartenplan, istGartenhaus } from '../src/core/gartenplan';
import { neu } from './hilfen';

describe('Zusammenhängende Hausgärten', () => {
  it('nutzt eigene Felder auf einer Hausseite und hält Häuser, Straßen und die Ausbaureserve frei', () => {
    const { objekte } = neuerSpielstand(0);
    const { strassen, fluss } = ortHolen(STANDARD_ORT);
    const { parzellen } = gartenplan({ objekte, strassen, fluss });
    const besucht = new Set<string>();
    const tabu = new Set([...strassen, ...fluss].map(([x, y]) => `${x},${y}`));
    for (const o of objekte.filter((o) => !istLeitung(o.typ))) {
      const rand = o.typ === 'hz' ? 1 : 0, kante = groesse(o);
      for (let y = o.y - rand; y < o.y + kante + rand; y++) for (let x = o.x - rand; x < o.x + kante + rand; x++) tabu.add(`${x},${y}`);
    }
    expect(parzellen.size).toBeGreaterThan(objekte.filter(istGartenhaus).length * .8);
    for (const [id, g] of parzellen) {
      const haus = objekte.find((o) => o.id === id)!;
      const k = groesse(haus);
      const beruehrt = [
        g.y + g.tiefe === haus.y && g.x < haus.x + k && g.x + g.breite > haus.x,
        g.x === haus.x + k && g.y < haus.y + k && g.y + g.tiefe > haus.y,
        g.y === haus.y + k && g.x < haus.x + k && g.x + g.breite > haus.x,
        g.x + g.breite === haus.x && g.y < haus.y + k && g.y + g.tiefe > haus.y,
      ];
      expect(beruehrt[g.seite]).toBe(true);
      expect([1, 2, 3, 4, 6]).toContain(g.breite * g.tiefe);
      for (let y = g.y; y < g.y + g.tiefe; y++) for (let x = g.x; x < g.x + g.breite; x++) {
        const feld = `${x},${y}`;
        expect(tabu.has(feld) || besucht.has(feld), feld).toBe(false);
        besucht.add(feld);
      }
    }
  });

  it('zieht ein eingeschlossenes Haus nur einmal um und lässt einen geplanten Anschluss stehen', () => {
    const stand = neuerSpielstand(0);
    const frei = neu('rh', 9, 12, { id: 401, ohne_station: true, bestand: true });
    const geschuetzt = neu('rh', 8, 16, { id: 402, ohne_station: true, bestand: true });
    // Haus A ist von Hindernissen und der Hauptstraße eingeschlossen.
    // Haus B hat ebenfalls keinen Garten, darf wegen der geplanten Leitung aber nicht umziehen.
    const rohr = neu('d25', 7, 16, { id: 403, geplant: true });
    stand.objekte = [stand.objekte[0], frei, geschuetzt, rohr,
      neu('stein', 9, 11, { id: 404 }), neu('stein', 8, 12, { id: 405 }), neu('stein', 9, 13, { id: 406 }),
      neu('stein', 8, 15, { id: 407 }), neu('stein', 9, 16, { id: 408 }),
    ];
    const sp = new Spiel(stand, () => 0);
    const { strassen, fluss } = ortHolen(STANDARD_ORT);
    const vorher = gartenplan({ objekte: stand.objekte, strassen, fluss }).parzellen;
    expect(vorher.has(frei.id)).toBe(false);
    expect(vorher.has(geschuetzt.id)).toBe(false);
    expect(sp.gaertenEinrichten()).toBe(1);
    expect([frei.x, frei.y]).not.toEqual([9, 12]);
    expect([geschuetzt.x, geschuetzt.y]).toEqual([8, 16]);
    expect(gartenplan({ objekte: stand.objekte, strassen, fluss }).parzellen.has(frei.id)).toBe(true);
    expect(sp.gaertenEinrichten()).toBe(0);
  });

  it('findet nach dem Umbau für jedes Haus im Standarddorf einen Garten', () => {
    const stand = neuerSpielstand(0);
    const sp = new Spiel(stand, () => 0);
    const { strassen, fluss } = ortHolen(STANDARD_ORT);
    expect(sp.gaertenEinrichten()).toBeGreaterThan(0);
    expect(gartenplan({ objekte: stand.objekte, strassen, fluss }).parzellen.size)
      .toBe(stand.objekte.filter(istGartenhaus).length);
  });

  it('berechnet den Garten bei einem neuen Hindernis neu, lässt Leitungen jedoch unter dem Garten', () => {
    const haus = neu('efh', 8, 10, { id: 1 });
    const s = { objekte: [haus] };
    const alt = gartenplan(s);
    const g = alt.parzellen.get(1)!;
    expect(g.breite * g.tiefe).toBeGreaterThan(1);
    const { x, y } = g;
    s.objekte.push(neu('d25', x, y, { id: 2 }));
    expect(gartenplan(s)).toBe(alt);
    s.objekte.push(neu('baum', x, y, { id: 3 }));
    const danach = gartenplan(s);
    expect(danach.schluessel).not.toBe(alt.schluessel);
  });
});
