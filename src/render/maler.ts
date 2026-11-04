import { KONTUR, schatten } from './farben';

export type Punkt = [number, number];
const ALLES = Math.PI * 2;

/**
 * Zeichenwerkzeug für die Spielgrafik (Canvas 2D). Hält Zeichenfläche, Feldbreite und Zeit.
 * Animationen laufen über `zeit_s` (Sekunden), nicht über Bildzähler – gleiche Geschwindigkeit auf jedem Gerät.
 */
export class Maler {
  tw = 50;
  th = 25;
  zeit_s = 0;
  /** „Weniger Bewegung“: Animationen stehen still, Überlast bleibt dauerhaft rot */
  reduziert = false;
  constructor(public X: CanvasRenderingContext2D) {}

  bahn(p: Punkt[]): void {
    const X = this.X;
    X.beginPath(); X.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) X.lineTo(p[i][0], p[i][1]);
    X.closePath();
  }
  flaeche(p: Punkt[], fuell: string | CanvasGradient, rand = true): void {
    const X = this.X;
    this.bahn(p); X.fillStyle = fuell; X.fill();
    if (rand) { X.strokeStyle = KONTUR; X.lineWidth = Math.max(1, this.tw * 0.018); X.lineJoin = 'round'; X.stroke(); }
  }
  verlauf(y1: number, y2: number, c1: string, c2: string): CanvasGradient {
    const g = this.X.createLinearGradient(0, y1, 0, y2);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    return g;
  }
  raute(cx: number, cy: number, s: number): void {
    this.bahn([[cx, cy - (this.th / 2) * s], [cx + (this.tw / 2) * s, cy], [cx, cy + (this.th / 2) * s], [cx - (this.tw / 2) * s, cy]]);
  }
  schatten(cx: number, cy: number, s: number): void {
    const X = this.X;
    X.fillStyle = 'rgba(20,45,10,.25)'; X.beginPath();
    X.ellipse(cx + this.tw * 0.08 * s, cy + this.th * 0.12 * s, this.tw * 0.5 * s, this.th * 0.5 * s, 0, 0, ALLES); X.fill();
  }
  kreis(x: number, y: number, r: number, fuell: string | CanvasGradient, rand = false): void {
    const X = this.X;
    X.beginPath(); X.arc(x, y, r, 0, ALLES); X.fillStyle = fuell; X.fill();
    if (rand) { X.strokeStyle = KONTUR; X.stroke(); }
  }
  rundRechteck(x: number, y: number, w: number, h: number, r: number): void {
    const X = this.X;
    X.beginPath();
    if (X.roundRect) X.roundRect(x, y, w, h, r); else X.rect(x, y, w, h);
  }
  text(s: string, x: number, y: number, groesse: number, farbe = '#fff'): void {
    const X = this.X;
    X.font = `800 ${groesse}px "Baloo 2",sans-serif`; X.textAlign = 'center'; X.lineJoin = 'round';
    X.lineWidth = Math.max(3, groesse * 0.28); X.strokeStyle = '#1a1208'; X.strokeText(s, x, y);
    X.fillStyle = farbe; X.fillText(s, x, y);
  }
  stern(x: number, y: number, r: number): void {
    const X = this.X;
    X.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      X.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    X.closePath(); X.fill(); X.stroke();
  }

  /** Quader (isometrisch). Gibt die Eckpunkte von Oberkante und Boden zurück. */
  quader(cx: number, cy: number, s: number, hp: number, farbe: string, oben = true) {
    const tw = this.tw, th = this.th;
    const L: Punkt = [cx - (tw / 2) * s, cy], B: Punkt = [cx, cy + (th / 2) * s], R: Punkt = [cx + (tw / 2) * s, cy], T: Punkt = [cx, cy - (th / 2) * s];
    const u = (p: Punkt): Punkt => [p[0], p[1] - hp];
    this.flaeche([L, B, u(B), u(L)], this.verlauf(cy - hp, cy + (th / 2) * s, schatten(farbe, 0.05), schatten(farbe, -0.12)));
    this.flaeche([B, R, u(R), u(B)], this.verlauf(cy - hp, cy + (th / 2) * s, schatten(farbe, -0.18), schatten(farbe, -0.34)));
    if (oben) this.flaeche([u(T), u(R), u(B), u(L)], schatten(farbe, 0.18));
    return { L: u(L), B: u(B), R: u(R), T: u(T), bL: L, bB: B, bR: R, wandR: undefined as string | undefined };
  }

  /** Satteldach auf einem Quader. */
  dach(t: ReturnType<Maler['quader']>, rh: number, farbe: string): { P1: Punkt; P2: Punkt } {
    const X = this.X, tw = this.tw;
    const mitte = (a: Punkt, b: Punkt): Punkt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const P1 = mitte(t.T, t.L), P2 = mitte(t.R, t.B);
    P1[1] -= rh; P2[1] -= rh;
    this.flaeche([t.T, t.R, P2, P1], schatten(farbe, -0.25));
    this.flaeche([t.B, t.R, P2], t.wandR || schatten('#e8dcc4', -0.25));
    this.flaeche([t.L, t.B, P2, P1], this.verlauf(P1[1], t.B[1], schatten(farbe, 0.12), schatten(farbe, -0.08)));
    X.strokeStyle = 'rgba(0,0,0,.18)'; X.lineWidth = Math.max(1, tw * 0.012);
    for (let i = 1; i < 4; i++) {
      const f = i / 4;
      X.beginPath();
      X.moveTo(t.L[0] + (P1[0] - t.L[0]) * f, t.L[1] + (P1[1] - t.L[1]) * f);
      X.lineTo(t.B[0] + (P2[0] - t.B[0]) * f, t.B[1] + (P2[1] - t.B[1]) * f);
      X.stroke();
    }
    X.strokeStyle = 'rgba(255,255,255,.55)'; X.lineWidth = Math.max(1.2, tw * 0.025);
    X.beginPath(); X.moveTo(P1[0], P1[1]); X.lineTo(P2[0], P2[1]); X.stroke();
    return { P1, P2 };
  }

  zylinder(cx: number, cy: number, rw: number, hp: number, farbe: string): void {
    const X = this.X, rh = rw / 2;
    const g = X.createLinearGradient(cx - rw, 0, cx + rw, 0);
    g.addColorStop(0, schatten(farbe, -0.05)); g.addColorStop(0.35, schatten(farbe, 0.35)); g.addColorStop(1, schatten(farbe, -0.3));
    X.beginPath(); X.ellipse(cx, cy, rw, rh, 0, 0, Math.PI); X.lineTo(cx - rw, cy - hp);
    X.ellipse(cx, cy - hp, rw, rh, 0, Math.PI, 0, true); X.closePath();
    X.fillStyle = g; X.fill(); X.strokeStyle = KONTUR; X.lineWidth = Math.max(1, this.tw * 0.018); X.stroke();
    X.beginPath(); X.ellipse(cx, cy - hp, rw, rh, 0, 0, ALLES); X.fillStyle = schatten(farbe, 0.25); X.fill(); X.stroke();
  }

  fenster(p0: Punkt, p1: Punkt, f: number, hp: number, yoff: number, licht: string, seite: boolean): void {
    const X = this.X;
    const bx = p0[0] + (p1[0] - p0[0]) * f, by = p0[1] + (p1[1] - p0[1]) * f + yoff;
    const w = this.tw * 0.055, h = hp * 0.32, sk = seite ? -0.5 : 0.5;
    this.flaeche([[bx - w, by - w * sk - h], [bx + w, by + w * sk - h], [bx + w, by + w * sk], [bx - w, by - w * sk]], licht);
    X.strokeStyle = 'rgba(255,255,255,.7)'; X.lineWidth = 1; X.beginPath(); X.moveTo(bx, by - h); X.lineTo(bx, by); X.stroke();
  }

  baum(cx: number, cy: number, k: number, variante = 0): void {
    const X = this.X, tw = this.tw;
    this.schatten(cx, cy, 0.5 * k);
    X.fillStyle = '#6b4b30'; X.fillRect(cx - tw * 0.03 * k, cy - tw * 0.16 * k, tw * 0.06 * k, tw * 0.16 * k);
    const cs = variante % 2 ? ['#2f7a35', '#3f9a43', '#6cc35a'] : ['#2b6e3a', '#3a8f4a', '#62b85f'];
    for (const [dx, dy, r] of [[-0.1, -0.3, 0.15], [0.1, -0.3, 0.15], [0, -0.42, 0.17]]) {
      const x = cx + tw * dx * k, y = cy + tw * dy * k, rr = tw * r * k;
      const g = X.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr);
      g.addColorStop(0, cs[2]); g.addColorStop(0.5, cs[1]); g.addColorStop(1, cs[0]);
      X.fillStyle = g; X.beginPath(); X.arc(x, y, rr, 0, ALLES); X.fill();
      X.strokeStyle = KONTUR; X.lineWidth = Math.max(1, tw * 0.016); X.stroke();
    }
  }

  /** Rauch/Dampf, steigt mit der Zeit auf. */
  wolke(x: number, y: number, t: number, groesse: number, farbe = '#ffffff'): void {
    const X = this.X, tw = this.tw;
    for (let i = 0; i < 4; i++) {
      const f = (t * 0.28 + i / 4) % 1, r = groesse * (0.5 + f * 1.2);
      const xx = x + Math.sin(f * 4 + i) * tw * 0.05 + f * tw * 0.1, yy = y - f * tw * 0.6;
      X.globalAlpha = (1 - f) * 0.75;
      const g = X.createRadialGradient(xx - r * 0.3, yy - r * 0.3, r * 0.1, xx, yy, r);
      g.addColorStop(0, farbe); g.addColorStop(1, farbe === '#ffffff' ? '#d9e2e8' : '#4a443e');
      X.fillStyle = g; X.beginPath(); X.arc(xx, yy, r, 0, ALLES); X.fill();
    }
    X.globalAlpha = 1;
  }

  /** Gezeichnete Symbole statt Emoji-Schrift (sieht auf jedem Gerät gleich aus). */
  symbol(art: 'blitz' | 'flocke' | 'kreuz' | 'ausruf' | 'frage' | 'pfeil', x: number, y: number, r: number, farbe = '#fff'): void {
    const X = this.X;
    X.save(); X.lineCap = 'round'; X.lineJoin = 'round';
    if (art === 'blitz') {
      X.beginPath(); X.moveTo(x + r * 0.2, y - r); X.lineTo(x - r * 0.55, y + r * 0.1); X.lineTo(x - r * 0.05, y + r * 0.1);
      X.lineTo(x - r * 0.25, y + r); X.lineTo(x + r * 0.55, y - r * 0.15); X.lineTo(x + r * 0.05, y - r * 0.15); X.closePath();
      X.fillStyle = farbe; X.fill(); X.strokeStyle = '#1a1208'; X.lineWidth = Math.max(1, r * 0.18); X.stroke();
    } else if (art === 'flocke') {
      X.strokeStyle = '#1a1208'; X.lineWidth = Math.max(3, r * 0.5);
      for (let pass = 0; pass < 2; pass++) {
        if (pass) { X.strokeStyle = farbe; X.lineWidth = Math.max(1.5, r * 0.26); }
        X.beginPath();
        for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; X.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); X.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        X.stroke();
      }
    } else if (art === 'kreuz') {
      X.strokeStyle = '#1a1208'; X.lineWidth = Math.max(3, r * 0.6);
      for (let pass = 0; pass < 2; pass++) {
        if (pass) { X.strokeStyle = farbe; X.lineWidth = Math.max(1.8, r * 0.34); }
        X.beginPath(); X.moveTo(x - r * 0.7, y - r * 0.7); X.lineTo(x + r * 0.7, y + r * 0.7); X.moveTo(x + r * 0.7, y - r * 0.7); X.lineTo(x - r * 0.7, y + r * 0.7); X.stroke();
      }
    } else if (art === 'pfeil') {
      X.beginPath(); X.moveTo(x - r, y - r * 0.6); X.lineTo(x + r, y - r * 0.6); X.lineTo(x, y + r * 0.8); X.closePath();
      X.fillStyle = farbe; X.fill(); X.strokeStyle = '#1a1208'; X.lineWidth = Math.max(1.5, r * 0.2); X.stroke();
    } else {
      this.text(art === 'frage' ? '?' : '!', x, y + r * 0.7, r * 2.3, farbe);
    }
    X.restore();
  }
}
