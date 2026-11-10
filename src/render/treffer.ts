import { KATALOG, istLeitung } from '../core/katalog';
import { groesse } from '../core/netz';
import type { Objekt } from '../core/typen';
import type { Kamera } from './kamera';
import { grafikHoehe } from './grafiken';

type P = [number, number];

/** Liegt der Punkt in der konvexen Form (Ecken im oder gegen den Uhrzeigersinn)? */
function innen(p: P, ecken: P[]): boolean {
  let vz = 0;
  for (let i = 0; i < ecken.length; i++) {
    const a = ecken[i], b = ecken[(i + 1) % ecken.length];
    const k = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (k === 0) continue;
    if (vz === 0) vz = Math.sign(k); else if (Math.sign(k) !== vz) return false;
  }
  return true;
}

/** Gezeichnete Höhe eines Objekts in Feldbreiten (grob, eher großzügig – Dach und Kamin zählen mit). */
function hoehe_tw(o: Objekt): number {
  const grafik = grafikHoehe(o);
  if (grafik !== undefined) return grafik;
  const kat = KATALOG[o.typ].kategorie;
  if (istLeitung(o.typ)) return 0;
  if (kat === 'deko' || kat === 'hindernis') return 0.35;
  const je: Partial<Record<string, number>> = { hz: 0.65, mfh: 1.4, klinik: 0.9, efh: 0.55, rh: 0.6, baeck: 0.55 };
  return je[o.typ] ?? (groesse(o) >= 2 ? 0.6 : 0.5);
}

/** Konvexe Hülle (für Boden-Raute plus hochgezogene Raute). */
function huelle(punkte: P[]): P[] {
  const p = [...punkte].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const kreuz = (o: P, a: P, b: P): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const u: P[] = [], o: P[] = [];
  for (const q of p) { while (u.length >= 2 && kreuz(u[u.length - 2], u[u.length - 1], q) <= 0) u.pop(); u.push(q); }
  for (const q of [...p].reverse()) { while (o.length >= 2 && kreuz(o[o.length - 2], o[o.length - 1], q) <= 0) o.pop(); o.push(q); }
  return [...u.slice(0, -1), ...o.slice(0, -1)];
}

/**
 * A80: Welches Objekt liegt unter dem Finger? Geprüft wird die gezeichnete Form (Grundfläche plus Höhe), nicht nur das Bodenfeld –
 * wer auf Dach oder Wand eines Hauses tippt, trifft das Haus. Bei Überdeckung gewinnt das vordere Gebäude; Leitungen und
 * flache Dinge zählen nur auf ihrem Bodenfeld und nur, wenn kein Gebäude darüber gezeichnet ist.
 */
export function objektAmPunkt(k: Kamera, objekte: Objekt[], mx: number, my: number): Objekt | undefined {
  let best: Objekt | undefined, bestTiefe = -Infinity;
  for (const o of objekte) {
    const h = hoehe_tw(o) * k.tw;
    if (h === 0) continue;
    const g = groesse(o), x0 = o.x - 0.5, y0 = o.y - 0.5;
    const boden: P[] = [k.mitte(x0, y0), k.mitte(x0 + g, y0), k.mitte(x0 + g, y0 + g), k.mitte(x0, y0 + g)];
    const form = huelle([...boden, ...boden.map(([x, y]) => [x, y - h] as P)]);
    if (!innen([mx, my], form)) continue;
    const [rx, ry] = k.dreheFeld(o.x + (g - 1) / 2, o.y + (g - 1) / 2), t = rx + ry + g;
    if (t > bestTiefe) { bestTiefe = t; best = o; }
  }
  if (best) return best;
  const [x, y] = k.feld(mx, my);
  return objekte.find((a) => { const kk = groesse(a); return x >= a.x && x < a.x + kk && y >= a.y && y < a.y + kk; });
}
