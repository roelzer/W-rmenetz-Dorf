import type { Objekt } from '../core/typen';
import { groesse } from '../core/netz';

/** Ein gemeinsamer, einmal dekodierter Atlas. Keine Bildfilter oder Texturen pro Frame. */
const RECHTECKE = {
  haus: [45, 60, 555, 540],
  hz: [635, 40, 615, 550],
  mfh: [45, 650, 555, 580],
  baum: [650, 640, 585, 575],
} as const;
type Grafik = keyof typeof RECHTECKE;
let atlas: HTMLImageElement | undefined;
let laden: Promise<void> | undefined;

export function grafikenLaden(): Promise<void> {
  if (laden) return laden;
  laden = new Promise<void>((resolve) => {
    if (typeof Image === 'undefined') { resolve(); return; }
    const bild = new Image();
    bild.onload = () => { atlas = bild; resolve(); };
    bild.onerror = () => { console.warn('Dorf-Grafiken nicht geladen; gezeichnete Ersatzgrafiken bleiben aktiv.'); resolve(); };
    bild.src = '/art/heatville-modern-v1.webp';
  });
  return laden;
}

export function objektGrafik(o: Objekt): { art: Grafik; breite: number } | undefined {
  if (o.typ === 'hz') return { art: 'hz', breite: groesse(o) === 3 ? 2.65 : 1.78 };
  if (o.typ === 'mfh') return { art: 'mfh', breite: 1.45 + Math.min(4, o.stufe - 1) * 0.025 };
  if (o.typ === 'efh' || o.typ === 'rh') return { art: 'haus', breite: (o.typ === 'rh' ? 0.88 : 0.78) + Math.min(4, o.stufe - 1) * 0.025 };
  return undefined;
}

/** Bildschirmaufrechte Sprites: Grundstücke drehen mit der Karte, Fassaden bleiben lesbar.
 *  Breite und Höhe werden immer proportional skaliert; die vordere Bodenecke ist der Anker. */
export function grafikZeichnen(X: CanvasRenderingContext2D, art: Grafik, cx: number, cy: number, breite: number): boolean {
  if (!atlas) return false;
  const [x, y, w, h] = RECHTECKE[art], hoehe = breite * h / w;
  const unten = cy + (art === 'baum' ? 0 : breite * 0.24);
  X.drawImage(atlas, x, y, w, h, cx - breite / 2, unten - hoehe, breite, hoehe);
  return true;
}

/** Gleiche Maße für Grafik, Trefferfläche und schwebende Hinweise. */
export function grafikHoehe(o: Objekt): number | undefined {
  const g = objektGrafik(o);
  if (!g || !atlas) return undefined;
  const [, , w, h] = RECHTECKE[g.art];
  return g.breite * (h / w - 0.24);
}
