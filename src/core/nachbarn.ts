import { KATALOG, KONSTANTEN, type TypId } from './katalog';
import { berechneNetz, dorfwert, groesse } from './netz';
import type { InnenQuelle, Netz, Objekt } from './typen';
import { zufall } from './zufall';

const N = KONSTANTEN.feldanzahl;

/** Beispieldorf eines „Nachbarn“. Ausgedacht und fest – kein Server, keine echten Personen (A17). */
export interface Nachbardorf {
  name: string;
  besitzer: string;
  stufe: number;
  objekte: Objekt[];
  innen: InnenQuelle[];
  netz: Netz;
  dorfwert: number;
}

export function neuesNachbardorf(seed: number, stufe: number, name: string, besitzer: string): Nachbardorf {
  const r = zufall(seed), objekte: Objekt[] = [];
  let id = 1;
  const belegt = new Int32Array(N * N);
  const frei = (x: number, y: number, s: number): boolean => {
    if (x < 0 || y < 0 || x + s > N || y + s > N) return false;
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) if (belegt[(y + dy) * N + x + dx]) return false;
    return true;
  };
  const dazu = (typ: TypId, x: number, y: number, st = 1, extra: Partial<Objekt> = {}): boolean => {
    const s = groesse({ typ, stufe: st, bau: null });
    if (!frei(x, y, s)) return false;
    const o: Objekt = { id: id++, typ, x, y, stufe: st, bau: null, kasse_eur: 0, ...extra };
    objekte.push(o);
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) belegt[(y + dy) * N + x + dx] = o.id;
    return true;
  };
  const cx = 9 + Math.floor(r() * 4), cy = 9 + Math.floor(r() * 4), H0 = stufe >= 3 ? 3 : 2;
  dazu('hz', cx, cy, stufe);
  const leitungen: Array<[number, number]> = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let x = dx > 0 ? cx + H0 : dx < 0 ? cx - 1 : cx + Math.floor(r() * H0);
    let y = dy > 0 ? cy + H0 : dy < 0 ? cy - 1 : cy + Math.floor(r() * H0);
    const laenge = 4 + Math.floor(r() * (2 + stufe * 1.5));
    for (let i = 0; i < laenge; i++) {
      const t: TypId = i < 2 && stufe >= 2 ? 'd110' : i < laenge - 2 ? 'd50' : 'd25';
      if (dazu(t, x, y)) leitungen.push([x, y]);
      x += dx; y += dy;
    }
  }
  const aussen: TypId[] = ['puffer', 'pv', 'solar', 'sonde', 'pv', 'puffer'];
  let g = 0;
  const haeuser: TypId[] = stufe >= 3 ? ['efh', 'efh', 'rh', 'mfh', 'efh', 'baeck', 'rh'] : stufe >= 2 ? ['efh', 'efh', 'rh', 'efh', 'mfh'] : ['efh'];
  for (const [x, y] of leitungen) {
    if (r() < 0.4) continue;
    const plaetze: Array<[number, number]> = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1], [x - 1, y - 1], [x + 1, y - 1]];
    const [px, py] = plaetze[Math.floor(r() * plaetze.length)];
    const typ = r() < 0.18 && g < aussen.length ? aussen[g] : haeuser[Math.floor(r() * haeuser.length)];
    const grenze = KATALOG[typ].grenze?.[stufe - 1] ?? 0;
    if (grenze <= objekte.filter((a) => a.typ === typ).length) continue;
    const st = Math.max(1, Math.min(stufe, 1 + Math.floor(r() * stufe)));
    const extra: Partial<Objekt> = KATALOG[typ].kategorie === 'haus' ? { zufriedenheit_pct: 80 } : {};
    if (dazu(typ, px, py, st, extra) && typ === aussen[g]) g++;
  }
  dazu('buero', cx - 3, cy + H0 + 1, Math.min(stufe, 3)) || dazu('buero', cx + H0 + 1, cy - 3, 1);
  dazu('huette', cx - 1, cy - 3); dazu('huette', cx + H0, cy - 3);
  if (stufe >= 2) { dazu('brunnen', cx + H0 + 1, cy + H0 + 1) || dazu('brunnen', cx - 4, cy - 4); dazu('bad', 3, 3, 1, { zustand: 'vertrag' }); }
  const deko: TypId[] = ['baum', 'baum', 'blumen', 'laterne', 'bank', 'hecke', 'baum', 'blumen'];
  for (let i = 0; i < 80; i++) dazu(deko[Math.floor(r() * deko.length)], Math.floor(r() * N), Math.floor(r() * N));
  const quellen: TypId[] = ['kessel', 'wpg', 'ptk'];
  const innen: InnenQuelle[] = Array.from({ length: KATALOG.hz.plaetze![stufe - 1] }, (_, i) => ({ typ: quellen[(seed + i) % 3], stufe, bau: null }));
  const netz = berechneNetz(objekte, innen, 2);
  return { name, besitzer, stufe, objekte, innen, netz, dorfwert: dorfwert(objekte, innen) };
}

export const nachbardoerfer = (): Nachbardorf[] => [
  neuesNachbardorf(11, 4, 'Sonnenhof', 'Lena'),
  neuesNachbardorf(23, 3, 'Waldwärme', 'Tobi'),
  neuesNachbardorf(5, 2, 'Kesselbach', 'Mia'),
  neuesNachbardorf(77, 3, 'Lindenau', 'Jonas'),
  neuesNachbardorf(31, 1, 'Neuheim', 'Sam'),
];
