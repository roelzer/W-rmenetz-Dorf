import { KONSTANTEN } from '../core/katalog';

const N = KONSTANTEN.feldanzahl;

/** Isometrische Kamera (2:1). Rechnet Felder in Bildschirmpunkte um und zurück. Keine Spiellogik. */
export class Kamera {
  breite = 0;
  hoehe = 0;
  pixelverhaeltnis = 1;
  zoom = 3;
  /** Drehung der Ansicht in Vierteln (0–3): Die Karte lässt sich in 90°-Schritten drehen, damit nichts hinter Gebäuden verschwindet. */
  drehung = 0;
  basis = 40;
  schiebe_x = 0;
  schiebe_y = 0;
  private initial = false;

  get tw(): number { return this.basis * this.zoom; }
  get th(): number { return this.tw / 2; }

  groesseSetzen(breite: number, hoehe: number, dpr: number): boolean {
    this.breite = breite; this.hoehe = hoehe;
    this.pixelverhaeltnis = Math.min(2, dpr || 1);
    this.basis = Math.min(breite / (N + 2), hoehe / (N / 2 + 3));
    if (!this.initial && breite > 0) {
      this.initial = true;
      this.zoom = Math.min(breite, hoehe) < 500 ? 2.2 : 1.9;
      return true; // erster Aufruf: Aufrufer zentriert auf die Heizzentrale
    }
    this.begrenzen();
    return false;
  }

  private ursprung(): [number, number] {
    return [this.breite / 2 + this.schiebe_x, this.hoehe / 2 - ((N + 1) * this.th) / 2 + this.schiebe_y];
  }
  /** Feld → gedrehte Kartenlage (Drehung um die Kartenmitte). */
  dreheFeld(x: number, y: number): [number, number] {
    const e = N - 1;
    switch (this.drehung & 3) { case 1: return [e - y, x]; case 2: return [e - x, e - y]; case 3: return [y, e - x]; default: return [x, y]; }
  }
  private dreheZurueck(x: number, y: number): [number, number] {
    const e = N - 1;
    switch (this.drehung & 3) { case 1: return [y, e - x]; case 2: return [e - x, e - y]; case 3: return [e - y, x]; default: return [x, y]; }
  }
  /** Richtungsvektor in die gedrehte Ansicht (für Kanten zwischen Nachbarfeldern). */
  dreheVektor(dx: number, dy: number): [number, number] {
    switch (this.drehung & 3) { case 1: return [-dy, dx]; case 2: return [-dx, -dy]; case 3: return [dy, -dx]; default: return [dx, dy]; }
  }
  /** Feldmitte (x,y; auch gebrochen) → Bildschirmpunkt. */
  mitte(x0: number, y0: number): [number, number] {
    const [x, y] = this.dreheFeld(x0, y0);
    const [ox, oy] = this.ursprung();
    return [ox + ((x - y) * this.tw) / 2, oy + ((x + y + 1) * this.th) / 2];
  }
  /** Bildschirmpunkt → Feld (gebrochen). */
  feldGenau(mx: number, my: number): [number, number] {
    const [ox, oy] = this.ursprung();
    const a = (mx - ox) / (this.tw / 2), b = (my - oy) / (this.th / 2) - 1;
    return this.dreheZurueck((a + b) / 2, (b - a) / 2);
  }
  /** Um 90° drehen (+1 = im Uhrzeigersinn); die Bildmitte bleibt am selben Feld. */
  drehen(richtung: 1 | -1): void {
    const [fx, fy] = this.feldGenau(this.breite / 2, this.hoehe / 2);
    this.drehung = (this.drehung + richtung + 4) & 3;
    const [sx, sy] = this.mitte(fx, fy);
    this.schiebe_x += this.breite / 2 - sx; this.schiebe_y += this.hoehe / 2 - sy;
    this.begrenzen();
  }
  feld(mx: number, my: number): [number, number] {
    const [x, y] = this.feldGenau(mx, my);
    return [Math.round(x), Math.round(y)];
  }
  begrenzen(): void {
    const g = N * this.tw * 0.5;
    this.schiebe_x = Math.max(-g, Math.min(g, this.schiebe_x));
    this.schiebe_y = Math.max(-g * 0.55, Math.min(g * 0.55, this.schiebe_y));
  }
  zoomUm(faktor: number, mx: number, my: number): void {
    const b = this.feldGenau(mx, my);
    this.zoom = Math.max(1, Math.min(4, this.zoom * faktor));
    const [sx, sy] = this.mitte(b[0], b[1]);
    this.schiebe_x += mx - sx; this.schiebe_y += my - sy;
    this.begrenzen();
  }
  zentrieren(x: number, y: number, kante: number): void {
    this.schiebe_x = 0; this.schiebe_y = 0;
    const [cx, cy] = this.mitte(x + (kante - 1) / 2, y + (kante - 1) / 2);
    this.schiebe_x = this.breite / 2 - cx; this.schiebe_y = this.hoehe / 2 - cy + 30;
    this.begrenzen();
  }
  /** Schiebt das Objekt auf einen Zielpunkt im Bild (z. B. in die freie obere Hälfte, wenn unten ein Blatt offen ist). */
  zentrierenBei(x: number, y: number, kante: number, ziel_x: number, ziel_y: number): void {
    this.schiebe_x = 0; this.schiebe_y = 0;
    const [cx, cy] = this.mitte(x + (kante - 1) / 2, y + (kante - 1) / 2);
    this.schiebe_x = ziel_x - cx; this.schiebe_y = ziel_y - cy;
    this.begrenzen();
  }
}
