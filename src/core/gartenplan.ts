import { istLeitung, KATALOG, KONSTANTEN } from './katalog';
import { groesse } from './netz';
import type { Objekt } from './typen';

const N = KONSTANTEN.feldanzahl;
const SEITEN = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
const FORMATE = [[[1, 1]], [[1, 2], [2, 1]], [[1, 3], [3, 1]], [[2, 2]], [[2, 3], [3, 2]]] as const;
type Felder = ReadonlyArray<readonly [number, number]>;

export interface Garten {
  x: number;
  y: number;
  breite: number;
  tiefe: number;
  /** Gartenseite relativ zum Haus. */
  seite: number;
}

interface Plan {
  schluessel: string;
  parzellen: ReadonlyMap<number, Garten>;
}

const leer: Plan = { schluessel: '', parzellen: new Map() };
const cache = new WeakMap<Objekt[], { eingabe: string; plan: Plan; strassen?: Felder; fluss?: Felder }>();
export const istGartenhaus = (o: Objekt): boolean => KATALOG[o.typ].kategorie === 'haus';

function rand(o: Objekt, seite: number, i: number): [number, number] {
  const k = groesse(o);
  if (seite === 0) return [o.x + i, o.y - 1];
  if (seite === 1) return [o.x + k, o.y + i];
  if (seite === 2) return [o.x + i, o.y + k];
  return [o.x - 1, o.y + i];
}

export function gartenplan(s: { objekte: Objekt[]; kartenHoehe?: number; strassen?: Felder; fluss?: Felder }): Plan {
  const haeuser = s.objekte.filter(istGartenhaus);
  if (!haeuser.length) return leer;
  const hoehe = s.kartenHoehe ?? N;
  const objekte = s.objekte.filter((o) => !istLeitung(o.typ));
  const eingabe = `${hoehe}|${objekte.map((o) => `${o.id},${o.typ},${o.x},${o.y},${groesse(o)}`).join(';')}`;
  const bisher = cache.get(s.objekte);
  if (bisher?.eingabe === eingabe && bisher.strassen === s.strassen && bisher.fluss === s.fluss) return bisher.plan;

  const strassen = new Set((s.strassen ?? []).map(([x, y]) => y * N + x));
  const belegt = new Set([...strassen, ...(s.fluss ?? []).map(([x, y]) => y * N + x)]);
  const imDorf = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < N && y < hoehe;
  for (const o of objekte) {
    const k = groesse(o), abstand = o.typ === 'hz' && k === 2 ? 1 : 0;
    for (let y = o.y - abstand; y < o.y + k + abstand; y++) for (let x = o.x - abstand; x < o.x + k + abstand; x++) {
      if (imDorf(x, y)) belegt.add(y * N + x);
    }
  }

  const optionen = new Map(haeuser.map((o) => {
    const seiten = SEITEN.map((_, i) => Array.from({ length: groesse(o) }, (_, j) => rand(o, i, j)));
    const front = seiten.findIndex((felder) => felder.some(([x, y]) => imDorf(x, y) && strassen.has(y * N + x)));
    const folge = front < 0 ? [2, 1, 3, 0] : [(front + 2) % 4, (front + 1) % 4, (front + 3) % 4];
    const felder = folge.flatMap((seite) => seiten[seite]
      .filter(([x, y]) => imDorf(x, y) && !belegt.has(y * N + x))
      .map(([x, y]) => ({ x, y, breite: 1, tiefe: 1, seite })));
    return [o.id, felder] as const;
  }));

  // Zuerst je Haus ein Feld zuordnen. Bei Konkurrenz kann ein Haus auf ein anderes freies Nachbarfeld ausweichen.
  const parzellen = new Map<number, Garten>(), besitzer = new Map<number, number>();
  function zuordnen(id: number, geprueft: Set<number>): boolean {
    for (const g of optionen.get(id) ?? []) {
      const feld = g.y * N + g.x, alt = besitzer.get(feld);
      if (geprueft.has(feld)) continue;
      geprueft.add(feld);
      if (alt !== undefined && !zuordnen(alt, geprueft)) continue;
      besitzer.set(feld, id);
      parzellen.set(id, g);
      return true;
    }
    return false;
  }

  haeuser.sort((a, b) => optionen.get(a.id)!.length - optionen.get(b.id)!.length || a.y - b.y || a.x - b.x || a.id - b.id);
  for (const o of haeuser) zuordnen(o.id, new Set());

  // Ein Garten bleibt vollständig auf der gewählten Hausseite. Freie Flächen dürfen wachsen,
  // solange dafür kein anderes Haus seinen ersten Garten verliert.
  for (const o of haeuser) {
    const g = parzellen.get(o.id);
    if (!g) continue;
    const ziel = (o.x * 7 + o.y * 11 + 1) % FORMATE.length;
    for (let stufe = ziel; stufe > 0; stufe--) {
      let erweiterung: Garten | undefined;
      for (const [breite, tiefe] of FORMATE[stufe]) {
        for (let y = g.y - tiefe + 1; y <= g.y; y++) for (let x = g.x - breite + 1; x <= g.x; x++) {
          const r = x + breite - 1, u = y + tiefe - 1;
          const [dx, dy] = SEITEN[g.seite], k = groesse(o);
          if (!imDorf(x, y) || !imDorf(r, u) || (dx < 0 && r >= o.x) || (dx > 0 && x < o.x + k)
            || (dy < 0 && u >= o.y) || (dy > 0 && y < o.y + k)) continue;
          let frei = true;
          for (let fy = y; fy <= u; fy++) for (let fx = x; fx <= r; fx++) {
            const f = fy * N + fx;
            if (belegt.has(f) || (besitzer.has(f) && besitzer.get(f) !== o.id)) frei = false;
          }
          if (frei) erweiterung ??= { x, y, breite, tiefe, seite: g.seite };
        }
      }
      if (!erweiterung) continue;
      parzellen.set(o.id, erweiterung);
      const { x, y, breite, tiefe } = erweiterung;
      for (let fy = y; fy < y + tiefe; fy++) for (let fx = x; fx < x + breite; fx++) besitzer.set(fy * N + fx, o.id);
      break;
    }
  }
  const schluessel = [...parzellen].map(([id, g]) => `${id},${g.x},${g.y},${g.breite},${g.tiefe},${g.seite}`).join(';');
  const plan = { schluessel, parzellen };
  cache.set(s.objekte, { eingabe, plan, strassen: s.strassen, fluss: s.fluss });
  return plan;
}
