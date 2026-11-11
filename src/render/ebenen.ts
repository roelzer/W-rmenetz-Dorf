/**
 * Zwischenspeicher für die ruhende Bodenebene (A90, Bauplan NR12 P3a).
 * Kennt keinen Browser: die Zeichenfläche liefert eine übergebene Fabrik (in main.ts eine Zweitleinwand, im Test ein Aufzeichner).
 */

export interface Flaeche { width: number; height: number; getContext(t: '2d'): CanvasRenderingContext2D | null }
export type FlaechenFabrik = (breite_px: number, hoehe_px: number) => Flaeche;

/** Größe der Fläche in Gerätepixeln: aufgerundete Bildgröße (gebrochene CSS-Größen) plus Rand auf beiden Seiten. */
export function flaechenGroesse(breite_px: number, hoehe_px: number, rand_x_px: number, rand_y_px: number): { breite_px: number; hoehe_px: number } {
  return { breite_px: Math.ceil(breite_px) + 2 * rand_x_px, hoehe_px: Math.ceil(hoehe_px) + 2 * rand_y_px };
}

export class BodenEbene {
  private flaeche: Flaeche | null = null;
  private schluessel = '';
  private rand_x_px = 0;
  private rand_y_px = 0;
  /** Verschiebung der Kamera beim letzten Malen (Gerätepixel). */
  private gemalt_x_px = 0;
  private gemalt_y_px = 0;

  constructor(private readonly fabrik: FlaechenFabrik) {}

  /** true, wenn neu gemalt werden muss: keine Fläche, anderer Schlüssel oder Verschiebung seit dem Malen größer als der Rand. */
  braucht(schluessel: string, schiebe_x_px: number, schiebe_y_px: number): boolean {
    return !this.flaeche || schluessel !== this.schluessel
      || Math.abs(schiebe_x_px - this.gemalt_x_px) > this.rand_x_px
      || Math.abs(schiebe_y_px - this.gemalt_y_px) > this.rand_y_px;
  }

  /**
   * Malt neu; rand_x_px/rand_y_px ganzzahlig; merkt sich die Verschiebung beim Malen.
   * Liefert die Fläche keinen 2D-Kontext, bleibt die Ebene leer (braucht() bleibt true) – der Aufrufer zeichnet dann direkt.
   */
  neu(schluessel: string, breite_px: number, hoehe_px: number, rand_x_px: number, rand_y_px: number,
    schiebe_x_px: number, schiebe_y_px: number, malen: (X: CanvasRenderingContext2D) => void): void {
    const { breite_px: b, hoehe_px: h } = flaechenGroesse(breite_px, hoehe_px, rand_x_px, rand_y_px);
    if (this.flaeche && (this.flaeche.width !== b || this.flaeche.height !== h)) this.freigeben();
    if (!this.flaeche) this.flaeche = this.fabrik(b, h);
    const X = this.flaeche.getContext('2d');
    if (!X) { this.freigeben(); return; }
    // Vor dem Malen ungültig machen: bricht malen() mit einem Fehler ab, gilt die halb gemalte Fläche nicht als fertig.
    this.schluessel = '';
    malen(X);
    this.schluessel = schluessel;
    this.rand_x_px = rand_x_px; this.rand_y_px = rand_y_px;
    this.gemalt_x_px = schiebe_x_px; this.gemalt_y_px = schiebe_y_px;
  }

  /** Kopiert die Fläche mit Einheitstransformation an (−rand + Verschiebungsdifferenz), auf ganze Gerätepixel gerundet. */
  auflegen(X: CanvasRenderingContext2D, schiebe_x_px: number, schiebe_y_px: number): void {
    if (!this.flaeche) throw new Error('Bodenebene ist leer – vor auflegen() mit braucht()/neu() malen');
    // Ganze Gerätepixel: so wird die Fläche 1:1 kopiert, nicht neu abgetastet (keine Unschärfe).
    const x = Math.round(schiebe_x_px - this.gemalt_x_px) - this.rand_x_px;
    const y = Math.round(schiebe_y_px - this.gemalt_y_px) - this.rand_y_px;
    X.save();
    X.setTransform(1, 0, 0, 1, 0, 0);
    X.globalAlpha = 1;
    X.globalCompositeOperation = 'copy';
    X.drawImage(this.flaeche as unknown as CanvasImageSource, x, y);
    X.restore();
  }

  /** width = height = 0 gibt den Speicher sofort frei (iOS begrenzt den Leinwand-Speicher). */
  freigeben(): void {
    if (this.flaeche) { this.flaeche.width = 0; this.flaeche.height = 0; }
    this.flaeche = null;
    this.schluessel = '';
  }
}
