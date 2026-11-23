import { WEICH } from './kamera';
import type { Maler } from './maler';

interface Funke { x: number; y: number; vx: number; vy: number; r: number; t: number; leben: number; farbe: string }
interface Muenze { x0: number; y0: number; x1: number; y1: number; t: number; dauer: number }
interface Schwebtext { x: number; y: number; t: number; text: string; farbe: string }

const SCHWEBZEIT_S = 1.4;
/** NR18 (Bauplan 5.1): so lange bleibt die Markierung der zu dünnen Leitungsfelder stehen. */
export const ENGSTELLE_DAUER_S = 6;
const ENGSTELLE_PULS_HZ = 1.5;
const WARNROT = '#d8392f';

interface Engstelle { felder: ReadonlyArray<readonly [number, number]>; ruhig: boolean; t: number }

/**
 * NR27 Erfolgsmoment (DESIGN 14.8, 14.9 `dunst_heben`): der Dunst hebt sich in 1,2 s mit `kurve.weich`. Bei „Weniger Bewegung“
 * ist er sofort weg; stattdessen leuchten die Grubenfelder kurz und ruhig auf (Dauer und Deckkraft sind Werte der Grafik).
 */
const DUNST_HEBEN_S = 1.2;
const AUFLEUCHTEN = { dauer_s: 0.4, deckkraft: 0.5, farbe: '#ffe14d' } as const;
interface Erfolg { felder: ReadonlyArray<readonly [number, number]>; ruhig: boolean; t: number }

/** Kurzlebige Effekte (Funken, fliegende Münzen, Schwebetexte). Reine Darstellung, laufen über Zeitdifferenzen. */
export class Effekte {
  private funken_: Funke[] = [];
  private muenzen_: Muenze[] = [];
  private texte: Schwebtext[] = [];
  private engstelle_: Engstelle | null = null;
  private erfolg_: Erfolg | null = null;
  /** Zuletzt gesehener Stand hinter der Bahn: welches Spiel, und ob dort noch Kulisse stand. null = noch kein Bild. */
  private nord_: { spiel: object; kulisse: boolean } | null = null;
  /** Sparmodus: weniger Teilchen für ältere Handys (6 statt 24 Funken, höchstens 2 Münzen). */
  sparsam = false;

  funken(cx: number, cy: number, tw: number, farbe?: string): void {
    for (let i = 0, n = this.sparsam ? 6 : 24; i < n; i++) {
      const a = Math.random() * 7, v = 2 + Math.random() * 4;
      this.funken_.push({
        x: cx, y: cy - tw * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, r: 2 + Math.random() * 3, t: 0, leben: 0.8 + Math.random() * 0.5,
        farbe: farbe || ['#ffe14d', '#9be36a', '#fff', '#ff9a4a'][i % 4],
      });
    }
  }
  muenzen(x0: number, y0: number, x1: number, y1: number, betrag_eur: number): void {
    const n = Math.min(this.sparsam ? 2 : 8, 2 + Math.floor(betrag_eur / 40));
    for (let i = 0; i < n; i++) this.muenzen_.push({ x0: x0 + (Math.random() - 0.5) * 20, y0, x1, y1, t: -i * 0.05, dauer: 0.7 });
  }
  schwebtext(feldX: number, feldY: number, text: string, farbe = '#ffe14d'): void {
    this.texte.push({ x: feldX, y: feldY, t: 0, text, farbe });
  }
  /** NR18 (AE-NR18-6): Markierung der zu dünnen Felder [x, y]; `ruhig` = „Weniger Bewegung“ (fest statt Puls).
   *  Eine neue Markierung ersetzt die alte, damit nach einer Änderung nur die aktuellen Stellen leuchten. */
  engstelle(felder: ReadonlyArray<readonly [number, number]>, ruhig: boolean): void {
    this.engstelle_ = felder.length ? { felder: felder.map(([x, y]) => [x, y] as const), ruhig, t: 0 } : null;
  }
  /**
   * NR27: Merkt sich je Bild, ob hinter der Bahn noch Kulisse steht. true genau beim Wechsel „Kulisse da → leer“ im selben Spiel –
   * nie im ersten Bild und nie, wenn ein anderes Spiel geladen wurde (sonst feierte jedes Laden eines erschlossenen Stands).
   */
  nordWechsel(spiel: object, kulisse: boolean): boolean {
    const vorher = this.nord_;
    this.nord_ = { spiel, kulisse };
    return !!vorher && vorher.spiel === spiel && vorher.kulisse && !kulisse;
  }
  /** Startet den Erfolgsmoment; `felder` = Grubenfelder fürs Aufleuchten, `ruhig` = „Weniger Bewegung“. */
  erfolgsmoment(felder: ReadonlyArray<readonly [number, number]>, ruhig: boolean): void {
    this.erfolg_ = { felder, ruhig, t: 0 };
  }
  /** Deckkraft des Dunsts über dem neuen Viertel: 1 beim Auslösen, nach 1,2 s und bei „Weniger Bewegung“ 0. */
  dunstDeckkraft(): number {
    const e = this.erfolg_;
    if (!e || e.ruhig || e.t >= DUNST_HEBEN_S) return 0;
    // Im Auslösebild genau 1: die Zeitkurve löst x durch Halbierung und trifft 0 nur auf 1e-12 genau
    return e.t <= 0 ? 1 : 1 - WEICH(e.t / DUNST_HEBEN_S);
  }
  aktiv(): boolean {
    return this.funken_.length + this.muenzen_.length + this.texte.length > 0 || this.engstelle_ !== null || this.erfolg_ !== null;
  }

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
    this.engstelleZeichnen(m, dt, mitte);
    this.erfolgZeichnen(m, dt, mitte);
    this.texte = this.texte.filter((f) => (f.t += dt) < SCHWEBZEIT_S);
    for (const f of this.texte) {
      const [cx, cy] = mitte(f.x, f.y);
      X.globalAlpha = Math.max(0, 1 - f.t / SCHWEBZEIT_S);
      m.text(f.text, cx, cy - m.tw * (0.9 + f.t * 0.7), Math.max(16, m.tw * 0.32), f.farbe);
      X.globalAlpha = 1;
    }
  }

  /** Zeit des Erfolgsmoments fortschreiben; bei „Weniger Bewegung“ das ruhige Aufleuchten (kein Puls, einfach an, dann aus). */
  private erfolgZeichnen(m: Maler, dt: number, mitte: (x: number, y: number) => [number, number]): void {
    const e = this.erfolg_;
    if (!e) return;
    if (e.ruhig && e.t < AUFLEUCHTEN.dauer_s) {
      const { X } = m;
      X.globalAlpha = AUFLEUCHTEN.deckkraft;
      for (const [x, y] of e.felder) { const [cx, cy] = mitte(x, y); m.raute(cx, cy, 1); X.fillStyle = AUFLEUCHTEN.farbe; X.fill(); }
      X.globalAlpha = 1;
    }
    e.t += dt;
    if (e.t >= (e.ruhig ? AUFLEUCHTEN.dauer_s : DUNST_HEBEN_S)) this.erfolg_ = null;
  }

  private engstelleZeichnen(m: Maler, dt: number, mitte: (x: number, y: number) => [number, number]): void {
    const e = this.engstelle_;
    if (!e) return;
    e.t += dt;
    if (e.t >= ENGSTELLE_DAUER_S) { this.engstelle_ = null; return; }
    const { X } = m;
    // Eigene Uhr statt m.zeit_s: die steht bei „Weniger Bewegung“ still, die 6 s sollen aber trotzdem ablaufen.
    X.globalAlpha = e.ruhig ? 1 : 0.65 + 0.35 * Math.cos(2 * Math.PI * ENGSTELLE_PULS_HZ * e.t);
    X.strokeStyle = WARNROT; X.lineWidth = 3; X.lineJoin = 'round';
    for (const [x, y] of e.felder) {
      const [cx, cy] = mitte(x, y);
      m.raute(cx, cy, 0.92); X.stroke();
    }
    X.globalAlpha = 1;
  }
}
