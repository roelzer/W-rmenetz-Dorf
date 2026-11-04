import type { Maler } from './maler';

interface Funke { x: number; y: number; vx: number; vy: number; r: number; t: number; leben: number; farbe: string }
interface Muenze { x0: number; y0: number; x1: number; y1: number; t: number; dauer: number }
interface Schwebtext { x: number; y: number; t: number; text: string; farbe: string }

const SCHWEBZEIT_S = 1.4;

/** Kurzlebige Effekte (Funken, fliegende Münzen, Schwebetexte). Reine Darstellung, laufen über Zeitdifferenzen. */
export class Effekte {
  private funken_: Funke[] = [];
  private muenzen_: Muenze[] = [];
  private texte: Schwebtext[] = [];

  funken(cx: number, cy: number, tw: number, farbe?: string): void {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * 7, v = 2 + Math.random() * 4;
      this.funken_.push({
        x: cx, y: cy - tw * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, r: 2 + Math.random() * 3, t: 0, leben: 0.8 + Math.random() * 0.5,
        farbe: farbe || ['#ffe14d', '#9be36a', '#fff', '#ff9a4a'][i % 4],
      });
    }
  }
  muenzen(x0: number, y0: number, x1: number, y1: number, betrag_eur: number): void {
    const n = Math.min(8, 2 + Math.floor(betrag_eur / 40));
    for (let i = 0; i < n; i++) this.muenzen_.push({ x0: x0 + (Math.random() - 0.5) * 20, y0, x1, y1, t: -i * 0.05, dauer: 0.7 });
  }
  schwebtext(feldX: number, feldY: number, text: string, farbe = '#ffe14d'): void {
    this.texte.push({ x: feldX, y: feldY, t: 0, text, farbe });
  }
  aktiv(): boolean { return this.funken_.length + this.muenzen_.length + this.texte.length > 0; }

  /** dt_s = Sekunden seit dem letzten Bild (auf 0,1 begrenzt, damit nach Pausen nichts springt). */
  zeichnen(m: Maler, dt_s: number, mitte: (x: number, y: number) => [number, number]): void {
    const { X } = m, dt = Math.min(0.1, Math.max(0, dt_s));
    this.funken_ = this.funken_.filter((p) => (p.t += dt) < p.leben);
    for (const p of this.funken_) {
      const k = dt * 60;
      p.x += p.vx * k; p.y += p.vy * k; p.vy += 0.25 * k;
      X.globalAlpha = Math.max(0, 1 - p.t / p.leben); X.fillStyle = p.farbe; X.beginPath(); X.arc(p.x, p.y, p.r, 0, Math.PI * 2); X.fill();
    }
    X.globalAlpha = 1;
    this.muenzen_ = this.muenzen_.filter((c) => (c.t += dt) < c.dauer);
    for (const c of this.muenzen_) {
      if (c.t < 0) continue;
      const f = Math.min(1, c.t / c.dauer), e = f * f * (3 - 2 * f);
      const x = c.x0 + (c.x1 - c.x0) * e, y = c.y0 + (c.y1 - c.y0) * e - Math.sin(f * Math.PI) * 80;
      X.fillStyle = '#f6c22c'; X.strokeStyle = '#9a6a08'; X.lineWidth = 2; X.beginPath();
      X.ellipse(x, y, 9 * Math.abs(Math.cos(c.t * 10)) + 2, 9, 0, 0, Math.PI * 2); X.fill(); X.stroke();
    }
    this.texte = this.texte.filter((f) => (f.t += dt) < SCHWEBZEIT_S);
    for (const f of this.texte) {
      const [cx, cy] = mitte(f.x, f.y);
      X.globalAlpha = Math.max(0, 1 - f.t / SCHWEBZEIT_S);
      m.text(f.text, cx, cy - m.tw * (0.9 + f.t * 0.7), Math.max(16, m.tw * 0.32), f.farbe);
      X.globalAlpha = 1;
    }
  }
}
