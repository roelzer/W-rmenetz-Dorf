import tokens from '../../design/tokens.json';
import { KONSTANTEN } from '../core/katalog';

const N = KONSTANTEN.feldanzahl;

/** Felder-Rahmen (Feldmitten von x0|y0 bis x1|y1) */
type Rahmen = { x0: number; y0: number; x1: number; y1: number };
/** NR13 K5: Bildmitte (Feld unter `mitte_px`) bleibt im Rahmen, Zoom in [zoom_min, zoom_max] */
type Grenze = Rahmen & { mitte_px: readonly [number, number]; zoom_min: number; zoom_max: number };
type Fahrt = { von_x: number; von_y: number; von_zoom: number; nach_x: number; nach_y: number; nach_zoom: number; start_ms: number; dauer_ms: number };

/** CSS-Zeitkurve `cubic-bezier(x1,y1,x2,y2)` als Funktion Zeitanteil → Wegeanteil (x per Halbierung gelöst, monoton in [0,1]). */
function zeitkurve(css: string): (p: number) => number {
  const z = css.match(/-?[\d.]+/g)?.map(Number);
  if (!z || z.length !== 4) throw new Error(`Zeitkurve nicht lesbar: ${css}`);
  const [ax, ay, bx, by] = z;
  const kurve = (a: number, b: number, t: number): number => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  return (p) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (kurve(ax, bx, m) < p) lo = m; else hi = m; }
    return kurve(ay, by, (lo + hi) / 2);
  };
}
/** DESIGN 13.6: Kamerafahrt mit `kurve.weich` */
const WEICH = zeitkurve(tokens.menue.kurve.weich);

/** Isometrische Kamera (2:1). Rechnet Felder in Bildschirmpunkte um und zurück. Keine Spiellogik. */
export class Kamera {
  kartenHoehe: number = N;
  breite = 0;
  hoehe = 0;
  pixelverhaeltnis = 1;
  zoom = 3;
  /** A75: Drehung der Ansicht als beliebiger Winkel (stufenlos, Simon 2026-11-05) */
  winkel_rad = 0;
  /** Rest einer weichen 45°-Drehung (drehen ±1), wird pro Bild abgebaut */
  private dreh_rest_rad = 0;
  basis = 40;
  schiebe_x = 0;
  schiebe_y = 0;
  private initial = false;
  private _grenze: Grenze | null = null;
  private fahrt: Fahrt | null = null;
  /** NR13 K5: aktuelle Kamera-Grenze (nur lesen; setzen über grenzeSetzen) */
  get grenze(): Readonly<Grenze> | null { return this._grenze; }

  get tw(): number { return this.basis * this.zoom; }
  get th(): number { return this.tw / 2; }

  groesseSetzen(breite: number, hoehe: number, dpr: number): boolean {
    this.breite = breite; this.hoehe = hoehe;
    // Der wirksame Faktor kommt gedeckelt aus zeichenAufloesung; ein zweiter Deckel hier ließe Kamera und Leinwand auseinanderlaufen.
    this.pixelverhaeltnis = dpr || 1;
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
  /** Feld → gedrehte Kartenlage (Drehung um die Kartenmitte, beliebiger Winkel). */
  dreheFeld(x: number, y: number): [number, number] {
    const c = (N - 1) / 2, co = Math.cos(this.winkel_rad), si = Math.sin(this.winkel_rad), dx = x - c, dy = y - c;
    return [c + dx * co - dy * si, c + dx * si + dy * co];
  }
  private dreheZurueck(x: number, y: number): [number, number] {
    const c = (N - 1) / 2, co = Math.cos(this.winkel_rad), si = Math.sin(this.winkel_rad), dx = x - c, dy = y - c;
    return [c + dx * co + dy * si, c - dx * si + dy * co];
  }
  /** Richtungsvektor in die gedrehte Ansicht (für Kanten zwischen Nachbarfeldern). */
  dreheVektor(dx: number, dy: number): [number, number] {
    const co = Math.cos(this.winkel_rad), si = Math.sin(this.winkel_rad);
    return [dx * co - dy * si, dx * si + dy * co];
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
  /** A75: Um einen beliebigen Winkel drehen (positiv = im Uhrzeigersinn); der Punkt (um_x|um_y) im Bild bleibt am selben Feld. */
  drehenUm(rad: number, um_x = this.breite / 2, um_y = this.hoehe / 2): void {
    const [fx, fy] = this.feldGenau(um_x, um_y);
    this.winkel_rad = ((this.winkel_rad + rad) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const [sx, sy] = this.mitte(fx, fy);
    this.schiebe_x += um_x - sx; this.schiebe_y += um_y - sy;
    this.begrenzen();
  }
  /** Alles, was das Bild verschiebt oder verzerrt; gerundet, damit Gleitkomma-Rauschen kein Neuzeichnen auslöst. */
  schluessel(): string {
    const r4 = (v: number): number => Math.round(v * 1e4) / 1e4, r2 = (v: number): number => Math.round(v * 100) / 100;
    return `${this.breite},${this.hoehe},${this.pixelverhaeltnis},${r4(this.zoom)},${r4(this.winkel_rad)},${r2(this.schiebe_x)},${r2(this.schiebe_y)}`;
  }
  /** Läuft gerade eine weiche Drehung? */
  inBewegung(): boolean { return this.dreh_rest_rad !== 0; }
  /** Tasten Q/E: weich um eine Achteldrehung (+1 = im Uhrzeigersinn) weiterdrehen. */
  drehen(richtung: 1 | -1): void { this.dreh_rest_rad += richtung * Math.PI / 4; }
  /** Pro Bild aufrufen: baut eine weiche Drehung ab (etwa 0,3 s). */
  schritt(dt_s: number): void {
    if (Math.abs(this.dreh_rest_rad) < 1e-4) { this.dreh_rest_rad = 0; return; }
    const d = this.dreh_rest_rad * Math.min(1, dt_s * 12);
    this.dreh_rest_rad -= d; this.drehenUm(d);
  }
  feld(mx: number, my: number): [number, number] {
    const [x, y] = this.feldGenau(mx, my);
    return [Math.round(x), Math.round(y)];
  }
  begrenzen(): void {
    if (this._grenze) { this.inGrenze(this._grenze); return; }
    const g = this.kartenHoehe * this.tw * 0.5;
    this.schiebe_x = Math.max(-g, Math.min(g, this.schiebe_x));
    this.schiebe_y = Math.max(-g * 0.55, Math.min(g * 0.55, this.schiebe_y));
  }
  zoomUm(faktor: number, mx: number, my: number): void {
    const b = this.feldGenau(mx, my);
    const min = this._grenze?.zoom_min ?? 1, max = this._grenze?.zoom_max ?? 4;
    this.zoom = Math.max(min, Math.min(max, this.zoom * faktor));
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

  /** NR13 K5: Grenze setzen (null = wie früher). Wirkt sofort auf Zoom und Lage, danach bei jedem begrenzen()/zoomUm(). */
  grenzeSetzen(g: Grenze | null): void {
    this._grenze = g ? { ...g } : null;
    if (g) this.zoom = Math.max(g.zoom_min, Math.min(g.zoom_max, this.zoom));
    this.begrenzen();
  }

  /** Das Feld unter `mitte_px` aufs Rechteck kürzen und die Verschiebung so nachführen, dass das gekürzte Feld dort liegt.
   *  `mitte()` hängt linear von der Verschiebung ab, daher genügt ein Schritt; am Rand bleibt die Karte stehen (kein Rückfedern). */
  private inGrenze(g: Grenze): void {
    const [px, py] = g.mitte_px, [fx, fy] = this.feldGenau(px, py);
    const x = Math.max(g.x0, Math.min(g.x1, fx)), y = Math.max(g.y0, Math.min(g.y1, fy));
    if (x === fx && y === fy) return;
    const [sx, sy] = this.mitte(x, y);
    this.schiebe_x += px - sx; this.schiebe_y += py - sy;
  }

  /** NR13 (13.6/K5): Zoom und Mitte (in Feldern), bei denen der Rahmen mit `rand_px` Abstand in `frei` passt – rechnet nur.
   *  Die Feldmitten liegen im Bild bei (x−y)·tw/2 waagrecht und (x+y)·tw/4 senkrecht; maßgeblich ist die Ausdehnung der vier Ecken. */
  einpassenZiel(f: Rahmen, frei: { x: number; y: number; b: number; h: number }, rand_px: number, zoom_max: number): { mitte_x: number; mitte_y: number; zoom: number } {
    const ecken = [[f.x0, f.y0], [f.x1, f.y0], [f.x0, f.y1], [f.x1, f.y1]].map(([x, y]) => this.dreheFeld(x, y));
    const u = ecken.map(([x, y]) => x - y), v = ecken.map(([x, y]) => x + y);
    const du = Math.max(...u) - Math.min(...u), dv = Math.max(...v) - Math.min(...v);
    const breite_px = frei.b - 2 * rand_px, hoehe_px = frei.h - 2 * rand_px;
    const zoom = Math.min(zoom_max, du > 0 ? breite_px / (du * this.basis / 2) : Infinity, dv > 0 ? hoehe_px / (dv * this.basis / 4) : Infinity);
    const uc = (Math.max(...u) + Math.min(...u)) / 2, vc = (Math.max(...v) + Math.min(...v)) / 2;
    const [mitte_x, mitte_y] = this.dreheZurueck((uc + vc) / 2, (vc - uc) / 2);
    return { mitte_x, mitte_y, zoom };
  }

  /** einpassenZiel sofort anwenden: Rahmenmitte in die Mitte von `frei`. */
  einpassen(f: Rahmen, frei: { x: number; y: number; b: number; h: number }, rand_px: number, zoom_max: number): void {
    const z = this.einpassenZiel(f, frei, rand_px, zoom_max);
    this.zoom = z.zoom;
    this.zentrierenBei(z.mitte_x, z.mitte_y, 1, frei.x + frei.b / 2, frei.y + frei.h / 2);
  }

  /** NR13 13.6: Fahrt, an deren Ende das Objekt (x|y, Kante) bei (ziel_x_px|ziel_y_px) liegt; `zoom` null = Zoom bleibt.
   *  Die Lage hängt nur an der Uhr (fahrtLaeuft), nicht an der Zahl der Bilder. */
  fahrtZu(x: number, y: number, kante: number, ziel_x_px: number, ziel_y_px: number, zoom: number | null, dauer_ms: number, jetzt_ms: number): void {
    const von = { x: this.schiebe_x, y: this.schiebe_y, zoom: this.zoom };
    if (zoom !== null) this.zoom = zoom;
    this.zentrierenBei(x, y, kante, ziel_x_px, ziel_y_px);
    this.fahrt = { von_x: von.x, von_y: von.y, von_zoom: von.zoom, nach_x: this.schiebe_x, nach_y: this.schiebe_y, nach_zoom: this.zoom, start_ms: jetzt_ms, dauer_ms };
    this.schiebe_x = von.x; this.schiebe_y = von.y; this.zoom = von.zoom;
    this.fahrtLaeuft(jetzt_ms);
  }

  /** Setzt die Kamera auf den Stand der Fahrt zu `jetzt_ms` (einmal je Bild aufrufen) und sagt, ob sie noch läuft.
   *  Nach dem Ende (auch nach einer Pause im Hintergrund) steht sie genau am Ziel. */
  fahrtLaeuft(jetzt_ms: number): boolean {
    const f = this.fahrt;
    if (!f) return false;
    const p = f.dauer_ms > 0 ? (jetzt_ms - f.start_ms) / f.dauer_ms : 1;
    if (p >= 1) {
      this.schiebe_x = f.nach_x; this.schiebe_y = f.nach_y; this.zoom = f.nach_zoom;
      this.fahrt = null;
      return false;
    }
    const w = WEICH(Math.max(0, p));
    this.schiebe_x = f.von_x + (f.nach_x - f.von_x) * w;
    this.schiebe_y = f.von_y + (f.nach_y - f.von_y) * w;
    this.zoom = f.von_zoom + (f.nach_zoom - f.von_zoom) * w;
    return true;
  }
}
