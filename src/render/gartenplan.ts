import { istLeitung, KONSTANTEN } from '../core/katalog';
import { groesse } from '../core/netz';
import type { Objekt } from '../core/typen';
import type { Szene } from './szene';

const N = KONSTANTEN.feldanzahl;
const FORMATE = [
  [[1, 1]], [[1, 2], [2, 1]], [[1, 3], [3, 1]], [[2, 2]], [[2, 3], [3, 2]],
] as const;

export interface Garten {
  x: number;
  y: number;
  breite: number;
  tiefe: number;
}

interface Plan {
  schluessel: string;
  parzellen: ReadonlyMap<number, Garten>;
}

const leer: Plan = { schluessel: '', parzellen: new Map() };
const cache = new WeakMap<Objekt[], { eingabe: string; plan: Plan; strassen: Szene['strassen']; fluss: Szene['fluss'] }>();

/** Sichtbare Parzellen aus dem aktuellen Dorf, ohne Felder für den Bau zu sperren. */
export function gartenplan(s: Pick<Szene, 'objekte' | 'kartenHoehe' | 'strassen' | 'fluss'>): Plan {
  const haeuser = s.objekte.filter((o) => o.typ === 'efh' && !o.bau);
  if (!haeuser.length) return leer;
  const hoehe = s.kartenHoehe ?? N;
  const objekte = s.objekte.filter((o) => !istLeitung(o.typ));
  const eingabe = `${hoehe}|${objekte.map((o) => `${o.id},${o.typ},${o.x},${o.y},${groesse(o)},${o.typ === 'efh' && !!o.bau}`).join(';')}`;
  const bisher = cache.get(s.objekte);
  if (bisher?.eingabe === eingabe && bisher.strassen === s.strassen && bisher.fluss === s.fluss) return bisher.plan;

  const strassen = new Set((s.strassen ?? []).map(([x, y]) => y * N + x));
  const belegt = new Set([...strassen, ...(s.fluss ?? []).map(([x, y]) => y * N + x)]);
  const imDorf = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < N && y < hoehe;
  for (const o of objekte) {
    const kante = groesse(o);
    // Alle möglichen 3×3-Ausbauten der kleinen Heizzentrale bleiben frei von sichtbaren Parzellen.
    const rand = o.typ === 'hz' && kante === 2 ? 1 : 0;
    for (let y = o.y - rand; y < o.y + kante + rand; y++) for (let x = o.x - rand; x < o.x + kante + rand; x++) {
      if (!imDorf(x, y)) continue;
      belegt.add(y * N + x);
    }
  }

  const parzellen = new Map<number, Garten>();
  const sorte = (o: Objekt): number => (Math.imul(o.x + 11, 2654435761) ^ Math.imul(o.y + 23, 1597334677)) >>> 0;
  for (const o of haeuser.sort((a, b) => sorte(a) - sorte(b) || a.y - b.y || a.x - b.x)) {
    const ziel = (o.x * 7 + o.y * 11 + 1) % FORMATE.length;
    const [sx, sy] = ([[0, -1], [1, 0], [0, 1], [-1, 0]] as const)
      .find(([dx, dy]) => imDorf(o.x + dx, o.y + dy) && strassen.has((o.y + dy) * N + o.x + dx)) ?? [0, 0];
    const haus = o.y * N + o.x;
    let garten: Garten = { x: o.x, y: o.y, breite: 1, tiefe: 1 };
    for (let stufe = ziel; stufe > 0; stufe--) {
      let besteLage = -Infinity;
      for (const [breite, tiefe] of FORMATE[stufe]) {
        for (let y = o.y - tiefe + 1; y <= o.y; y++) for (let x = o.x - breite + 1; x <= o.x; x++) {
          if (!imDorf(x, y) || !imDorf(x + breite - 1, y + tiefe - 1)) continue;
          let frei = true;
          for (let fy = y; fy < y + tiefe; fy++) for (let fx = x; fx < x + breite; fx++) {
            const f = fy * N + fx;
            if (f !== haus && belegt.has(f)) frei = false;
          }
          const lage = -(x + (breite - 1) / 2 - o.x) * sx - (y + (tiefe - 1) / 2 - o.y) * sy;
          if (frei && lage > besteLage) { garten = { x, y, breite, tiefe }; besteLage = lage; }
        }
      }
      if (besteLage > -Infinity) break;
    }
    parzellen.set(o.id, garten);
    for (let y = garten.y; y < garten.y + garten.tiefe; y++) for (let x = garten.x; x < garten.x + garten.breite; x++) belegt.add(y * N + x);
  }
  const schluessel = [...parzellen].map(([id, g]) => `${id},${g.x},${g.y},${g.breite},${g.tiefe}`).join(';');
  const plan = { schluessel, parzellen };
  cache.set(s.objekte, { eingabe, plan, strassen: s.strassen, fluss: s.fluss });
  return plan;
}
