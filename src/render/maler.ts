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
  /** A75: Drehwinkel der Karte als cos/sin – Rauten und Quader werden in jedem Winkel richtig gezeichnet */
  dreh_cos = 1;
  dreh_sin = 0;
  zeit_s = 0;
  /** „Weniger Bewegung“: Animationen stehen still, Überlast bleibt dauerhaft rot */
  reduziert = false;
  constructor(public X: CanvasRenderingContext2D) {}

  /** Bildvektoren für einen Feldschritt in x- und y-Richtung (gedreht, isometrisch). */
  achsen(): [Punkt, Punkt] {
    const c = this.dreh_cos, si = this.dreh_sin, hw = this.tw / 2, hh = this.th / 2;
    return [[(c - si) * hw, (c + si) * hh], [(-si - c) * hw, (-si + c) * hh]];
  }
  /** Die vier Bodenecken eines Quadrats (Kantenlänge s Felder) in Weltreihenfolge (−x−y, +x−y, +x+y, −x+y). */
  ecken(cx: number, cy: number, s: number): Punkt[] {
    const [ax, ay] = this.achsen(), h = s / 2;
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [cx + h * (i * ax[0] + j * ay[0]), cy + h * (i * ax[1] + j * ay[1])] as Punkt);
  }
  bahn(p: Punkt[]): void {
    const X = this.X;
    X.beginPath(); X.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) X.lineTo(p[i][0], p[i][1]);
    X.closePath();
  }
  flaeche(p: Punkt[], fuell: string | CanvasGradient, rand = true): void {
    const X = this.X;
    this.bahn(p); X.fillStyle = fuell; X.fill();
    if (rand) { X.strokeStyle = KONTUR; X.lineWidth = Math.max(0.75, this.tw * 0.008); X.lineJoin = 'round'; X.stroke(); }
  }
  verlauf(y1: number, y2: number, c1: string, c2: string): CanvasGradient {
    const g = this.X.createLinearGradient(0, y1, 0, y2);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    return g;
  }
  raute(cx: number, cy: number, s: number): void {
    this.bahn(this.ecken(cx, cy, s));
  }
  schatten(cx: number, cy: number, s: number): void {
    const X = this.X;
    // weicher Schatten: Verlauf von der Mitte nach außen auf null
    const sx = cx + this.tw * 0.08 * s, sy = cy + this.th * 0.12 * s, rx = this.tw * 0.55 * s;
    X.save(); X.translate(sx, sy); X.scale(1, this.th / this.tw);
    const g = X.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
    g.addColorStop(0, 'rgba(30,50,35,.28)'); g.addColorStop(1, 'rgba(30,50,35,0)');
    X.fillStyle = g; X.beginPath(); X.arc(0, 0, rx, 0, ALLES); X.fill(); X.restore();
  }
  /** O7 (Designer): Kontaktschatten direkt am Fuß – das Gebäude „steht“. */
  kontaktSchatten(cx: number, cy: number, s: number): void {
    const X = this.X;
    X.beginPath(); X.ellipse(cx, cy + this.th * 0.06 * s, this.tw * 0.5 * s, this.th * 0.5 * s, 0, 0, ALLES);
    X.fillStyle = 'rgba(20,30,15,.22)'; X.fill();
  }
  /** O1 (Designer): Umriss in Ladebild-Braun um die Gesamtform. Vor den Flächen zeichnen – die Flächen decken die innere Hälfte ab. */
  silhouette(punkte: Punkt[]): void {
    const X = this.X, h = huelle(punkte);
    if (h.length < 3) return;
    X.save(); X.lineJoin = 'round'; X.lineCap = 'round';
    X.strokeStyle = 'rgba(59,29,10,.7)'; X.lineWidth = 2 * Math.max(1, this.tw * 0.018);
    X.beginPath(); X.moveTo(h[0][0], h[0][1]); for (const p of h.slice(1)) X.lineTo(p[0], p[1]); X.closePath(); X.stroke();
    X.restore();
  }
  /** O1: Umriss eines Quaders (optional mit Satteldach der Höhe rh; First entlang der Welt-x-Achse wie in `dach`). */
  quaderUmriss(cx: number, cy: number, s: number, hp: number, rh = 0): void {
    const g = this.ecken(cx, cy, s), u = (p: Punkt): Punkt => [p[0], p[1] - hp];
    const pkt: Punkt[] = [...g, ...g.map(u)];
    if (rh) pkt.push([(g[0][0] + g[3][0]) / 2, (g[0][1] + g[3][1]) / 2 - hp - rh], [(g[1][0] + g[2][0]) / 2, (g[1][1] + g[2][1]) / 2 - hp - rh]);
    this.silhouette(pkt);
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
    X.font = `700 ${groesse}px "Manrope",system-ui,sans-serif`; X.textAlign = 'center'; X.lineJoin = 'round';
    X.lineWidth = Math.max(2, groesse * 0.18); X.strokeStyle = 'rgba(30,26,20,.55)'; X.strokeText(s, x, y);
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

  /** Quader (isometrisch, in jedem Drehwinkel). Gibt die Eckpunkte von Oberkante und Boden zurück:
   *  B = vorderste Ecke, L/R = ihre linke/rechte Nachbarecke, T = hinterste; `welt` = Oberkante in Weltreihenfolge (für das Dach). */
  quader(cx: number, cy: number, s: number, hp: number, farbe: string, oben = true) {
    const g = this.ecken(cx, cy, s), u = (p: Punkt): Punkt => [p[0], p[1] - hp];
    // sichtbare Wände: Außennormale zeigt im Bild nach unten (zum Betrachter); Helligkeit nach Blickrichtung (links hell, rechts dunkel)
    for (let i = 0; i < 4; i++) {
      const a = g[i], b = g[(i + 1) % 4], ex = b[0] - a[0], ey = b[1] - a[1], nx = ey, ny = -ex, nl = Math.hypot(nx, ny) || 1;
      if (ny <= 0) continue;
      this.flaeche([a, b, u(b), u(a)], schatten(farbe, -0.08 - 0.179 * (nx / nl)));
    }
    if (oben) this.flaeche(g.map(u), schatten(farbe, 0.14));
    let vb = 0;
    for (let i = 1; i < 4; i++) if (g[i][1] > g[vb][1] + 1e-6) vb = i;
    const n1 = g[(vb + 3) % 4], n2 = g[(vb + 1) % 4], li = n1[0] <= n2[0] ? (vb + 3) % 4 : (vb + 1) % 4, re = li === (vb + 3) % 4 ? (vb + 1) % 4 : (vb + 3) % 4;
    const L = g[li], B = g[vb], R = g[re], T = g[(vb + 2) % 4];
    return { L: u(L), B: u(B), R: u(R), T: u(T), bL: L, bB: B, bR: R, welt: g.map(u), wandR: undefined as string | undefined };
  }

  /** Satteldach auf einem Quader; der First läuft entlang der Welt-x-Achse und dreht mit der Karte. */
  dach(t: ReturnType<Maler['quader']>, rh: number, farbe: string): { P1: Punkt; P2: Punkt } {
    const X = this.X, tw = this.tw, [c0, c1, c2, c3] = t.welt;
    const mitte = (a: Punkt, b: Punkt): Punkt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const P1 = mitte(c0, c3), P2 = mitte(c1, c2);
    P1[1] -= rh; P2[1] -= rh;
    const giebel = t.wandR || schatten('#e8dcc4', -0.16);
    // Flächen von hinten nach vorn (Tiefe = Bildhöhe der Traufkante)
    const hinten = mitte(c0, c1)[1], vorn = mitte(c3, c2)[1];
    const flaechen: Array<[number, Punkt[], string]> = [
      [hinten, [c0, c1, P2, P1], schatten(farbe, hinten < vorn ? -0.18 : 0.06)],
      [vorn, [c3, c2, P2, P1], schatten(farbe, vorn <= hinten ? -0.18 : 0.06)],
      [mitte(c1, c2)[1], [c1, c2, P2], giebel],
      [mitte(c0, c3)[1], [c0, c3, P1], giebel],
    ];
    flaechen.sort((a, b) => a[0] - b[0]);
    for (const [, p, f] of flaechen) this.flaeche(p, f);
    const [ka, kb] = vorn >= hinten ? [c3, c2] : [c0, c1];
    X.strokeStyle = 'rgba(0,0,0,.07)'; X.lineWidth = Math.max(0.75, tw * 0.008);
    for (let i = 1; i < 4; i++) {
      const f = i / 4;
      X.beginPath();
      X.moveTo(ka[0] + (P1[0] - ka[0]) * f, ka[1] + (P1[1] - ka[1]) * f);
      X.lineTo(kb[0] + (P2[0] - kb[0]) * f, kb[1] + (P2[1] - kb[1]) * f);
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

  fenster(p0: Punkt, p1: Punkt, f: number, hp: number, yoff: number, licht: string, seite: boolean, gross = false): void {
    const X = this.X;
    const bx = p0[0] + (p1[0] - p0[0]) * f, by = p0[1] + (p1[1] - p0[1]) * f + yoff;
    // O3 (Designer): größere Fenster mit hellem Rahmen; warme Fenster leuchten mit einem Schein (Wärme ist das Leuchten im Spiel)
    const dx = p1[0] - p0[0];
    if (Math.abs(dx) < this.tw * 0.04) return; // Wand steht fast hochkant zum Betrachter – kein Platz für ein Fenster
    void seite;
    const w = this.tw * (gross ? 0.072 : 0.055) * Math.min(1, Math.abs(dx) / (this.tw * 0.3)), h = hp * (gross ? 0.4 : 0.32), sk = (p1[1] - p0[1]) / dx;
    const rahmen = (d: number): Punkt[] => [[bx - w - d, by - (w + d) * sk - h - d], [bx + w + d, by + (w + d) * sk - h - d], [bx + w + d, by + (w + d) * sk + d], [bx - w - d, by - (w + d) * sk + d]];
    if (gross && licht === WARM_FENSTER) this.flaeche(rahmen(this.tw * 0.035), 'rgba(255,200,80,.32)');
    if (gross) this.flaeche(rahmen(Math.max(1, this.tw * 0.012)), '#fbf6ec');
    this.flaeche(rahmen(0), licht);
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
      X.fillStyle = farbe; X.fill(); X.strokeStyle = 'rgba(32,28,22,.5)'; X.lineWidth = Math.max(1, r * 0.18); X.stroke();
    } else if (art === 'flocke') {
      X.strokeStyle = 'rgba(32,28,22,.5)'; X.lineWidth = Math.max(3, r * 0.5);
      for (let pass = 0; pass < 2; pass++) {
        if (pass) { X.strokeStyle = farbe; X.lineWidth = Math.max(1.5, r * 0.26); }
        X.beginPath();
        for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; X.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); X.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        X.stroke();
      }
    } else if (art === 'kreuz') {
      X.strokeStyle = 'rgba(32,28,22,.5)'; X.lineWidth = Math.max(3, r * 0.6);
      for (let pass = 0; pass < 2; pass++) {
        if (pass) { X.strokeStyle = farbe; X.lineWidth = Math.max(1.8, r * 0.34); }
        X.beginPath(); X.moveTo(x - r * 0.7, y - r * 0.7); X.lineTo(x + r * 0.7, y + r * 0.7); X.moveTo(x + r * 0.7, y - r * 0.7); X.lineTo(x - r * 0.7, y + r * 0.7); X.stroke();
      }
    } else if (art === 'pfeil') {
      X.beginPath(); X.moveTo(x - r, y - r * 0.6); X.lineTo(x + r, y - r * 0.6); X.lineTo(x, y + r * 0.8); X.closePath();
      X.fillStyle = farbe; X.fill(); X.strokeStyle = 'rgba(32,28,22,.5)'; X.lineWidth = Math.max(1.5, r * 0.2); X.stroke();
    } else {
      this.text(art === 'frage' ? '?' : '!', x, y + r * 0.7, r * 2.3, farbe);
    }
    X.restore();
  }
}

/** Farbe warmer Fenster (Haus wird vom Netz versorgt). */
export const WARM_FENSTER = '#ffd45c';

/** Konvexe Hülle (Monotone Chain) – für den Gebäudeumriss. */
export function huelle(punkte: Punkt[]): Punkt[] {
  const p = [...punkte].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const kreuz = (o: Punkt, a: Punkt, b: Punkt): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const unten: Punkt[] = [], oben: Punkt[] = [];
  for (const q of p) { while (unten.length >= 2 && kreuz(unten[unten.length - 2], unten[unten.length - 1], q) <= 0) unten.pop(); unten.push(q); }
  for (const q of [...p].reverse()) { while (oben.length >= 2 && kreuz(oben[oben.length - 2], oben[oben.length - 1], q) <= 0) oben.pop(); oben.push(q); }
  return [...unten.slice(0, -1), ...oben.slice(0, -1)];
}
