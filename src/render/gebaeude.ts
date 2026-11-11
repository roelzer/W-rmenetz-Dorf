import { KATALOG } from '../core/katalog';
import { groesse } from '../core/netz';
import type { Bau, InnenQuelle, Objekt } from '../core/typen';
import { SCHNEE } from './jahreszeiten';
import { KONTUR, schatten } from './farben';
import tokens from '../../design/tokens.json';
import type { Maler } from './maler';
import { zeichneWohnhaus } from './wohnhaus';

const ALLES = Math.PI * 2;
/** Dauer des kurzen Federns (DESIGN.md Abschnitt 3: Platzieren; 13.2: „Erreicht“-Zeichen) */
export const FEDERN_MS = 450;

/** Was ein Gebäude zum Zeichnen über das Netz wissen muss. */
export interface Zustand {
  warm: boolean;
  laeuft: boolean;
  innen: InnenQuelle[];
  oel: boolean;
  strassenseite?: number;
}

export function zeichneObjekt(m: Maler, o: Objekt, cx: number, cy: number, st: Zustand, jetzt_ms: number): void {
  const { X } = m;
  const tw = m.tw, th = m.th, t = o.typ, lv = o.stufe, D = KATALOG[t];
  const geist = o.bau?.art === 'neu';
  const pop = o._pop ? Math.max(0, 1 - (jetzt_ms - o._pop) / FEDERN_MS) : 0;
  if (pop > 0) { X.save(); X.translate(cx, cy); const k = 1 + Math.sin(pop * Math.PI) * 0.18; X.scale(k, Math.max(0.8, 2 - k)); X.translate(-cx, -cy); }
  const alpha = X.globalAlpha;
  if (geist) X.globalAlpha *= 0.5;
  if (t === 'hz') heizzentrale(m, o, cx, cy, st);
  else if (t === 'pv' || t === 'solar') {
    m.schatten(cx, cy, 1.6); m.raute(cx, cy, 1.75); X.fillStyle = t === 'pv' ? '#c9c4b2' : '#b9b29a'; X.fill(); X.strokeStyle = KONTUR; X.stroke();
    const n = Math.min(4, lv + 1), col = t === 'pv' ? '#2c5aa0' : '#283848';
    for (let i = 0; i < n; i++) {
      const ox = cx - tw * 0.32 + i * tw * 0.2, oy = cy - th * 0.32 + i * th * 0.2;
      const p: [number, number][] = [[ox - tw * 0.3, oy], [ox, oy + th * 0.15], [ox + tw * 0.15, oy - tw * 0.16], [ox - tw * 0.15, oy - tw * 0.31]];
      X.strokeStyle = '#5d6b78'; X.lineWidth = Math.max(1, tw * 0.02); X.beginPath(); X.moveTo(ox - tw * 0.1, oy); X.lineTo(ox - tw * 0.1, oy - tw * 0.08); X.stroke();
      m.flaeche(p, m.verlauf(oy - tw * 0.31, oy + th * 0.15, schatten(col, 0.35), schatten(col, -0.1)));
      X.strokeStyle = t === 'pv' ? 'rgba(200,225,255,.6)' : '#d08b45'; X.lineWidth = Math.max(1, tw * 0.012); X.beginPath();
      for (let j = 1; j < 3; j++) { const f = j / 3; X.moveTo(p[0][0] + (p[3][0] - p[0][0]) * f, p[0][1] + (p[3][1] - p[0][1]) * f); X.lineTo(p[1][0] + (p[2][0] - p[1][0]) * f, p[1][1] + (p[2][1] - p[1][1]) * f); }
      X.stroke();
      X.fillStyle = 'rgba(255,255,255,.35)'; X.beginPath(); X.moveTo(p[3][0], p[3][1]); X.lineTo(p[3][0] + tw * 0.08, p[3][1] + tw * 0.03); X.lineTo(p[0][0] + tw * 0.06, p[0][1] - tw * 0.04); X.closePath(); X.fill();
    }
  } else if (t === 'puffer') {
    m.schatten(cx, cy, 0.8); const hp = tw * (0.42 + 0.1 * lv); m.zylinder(cx, cy, tw * 0.22, hp, '#d6dde3');
    X.fillStyle = '#3d9b4f'; X.fillRect(cx - tw * 0.22, cy - hp * 0.6, tw * 0.44, tw * 0.06);
    X.strokeStyle = '#6b7680'; X.lineWidth = Math.max(1, tw * 0.015); X.beginPath();
    for (let y = cy - tw * 0.05; y > cy - hp + tw * 0.05; y -= tw * 0.07) { X.moveTo(cx + tw * 0.12, y); X.lineTo(cx + tw * 0.18, y - tw * 0.01); }
    X.stroke();
  } else if (t === 'sonde') {
    m.schatten(cx, cy, 1.5); m.raute(cx, cy, 1.7); X.fillStyle = '#7fb85a'; X.fill(); X.strokeStyle = KONTUR; X.stroke();
    for (let i = 0; i < Math.min(6, lv + 2); i++) { const a = i * 1.1; m.zylinder(cx + Math.cos(a) * tw * 0.38, cy + Math.sin(a) * th * 0.38, tw * 0.07, tw * 0.05, '#9aa4ac'); }
    m.quader(cx, cy, 0.45, tw * 0.18, '#c9d0d6');
  } else if (t === 'buero') {
    m.schatten(cx, cy, 1.4); const hp = tw * (0.38 + 0.05 * lv); m.kontaktSchatten(cx, cy, 1.35); m.quaderUmriss(cx, cy, 1.35, hp, tw * 0.35); const tp = m.quader(cx, cy, 1.35, hp, '#f1e6cf', false);
    tp.wandR = schatten('#f1e6cf', -0.25);
    m.fenster(tp.bL, tp.bB, 0.3, hp, -hp * 0.35, '#ffe08a', false); m.fenster(tp.bL, tp.bB, 0.7, hp, -hp * 0.35, '#ffe08a', false);
    m.dach(tp, tw * 0.35, lv >= 3 ? '#3f72b8' : '#3c8a4a');
    m.kreis(cx + tw * 0.33, cy - hp * 0.35, tw * 0.13, '#f6c22c', true); X.lineWidth = 2; X.stroke();
    m.text('€', cx + tw * 0.33, cy - hp * 0.35 + tw * 0.06, tw * 0.17, 'rgba(40,34,26,.4)');
  } else if (t === 'huette') {
    m.schatten(cx, cy, 0.7); const hp = tw * 0.2; m.quaderUmriss(cx, cy, 0.62, hp, tw * 0.2); const tp = m.quader(cx, cy, 0.62, hp, '#c98f52', false);
    tp.wandR = schatten('#c98f52', -0.3); m.dach(tp, tw * 0.2, '#e2582b');
  } else if (D.kategorie === 'haus') zeichneWohnhaus(m, o, cx, cy, st.strassenseite ?? 1, st.warm);
  else if (D.kategorie === 'gross') gross(m, o, cx, cy, st);
  else deko(m, o, cx, cy);
  X.globalAlpha = alpha;
  if (pop > 0) X.restore();
}

function deko(m: Maler, o: Objekt, cx: number, cy: number): void {
  const { X } = m, tw = m.tw, th = m.th, t = o.typ;
  if (t === 'baum') m.baum(cx, cy, 1, o.id);
  else if (t === 'busch') {
    m.schatten(cx, cy, 0.5);
    for (const [a, b, r] of [[-0.1, 0, 0.13], [0.09, -0.02, 0.11], [0, -0.1, 0.11]]) {
      const x = cx + tw * a, y = cy + tw * b - tw * 0.05, g = X.createRadialGradient(x - 3, y - 3, 1, x, y, tw * r);
      g.addColorStop(0, '#7cc35a'); g.addColorStop(1, '#3d7a2c'); m.kreis(x, y, tw * r, g, true); X.lineWidth = 1; X.stroke();
    }
    m.kreis(cx + tw * 0.05, cy - tw * 0.16, tw * 0.02, '#e2582b');
  } else if (t === 'stein') {
    m.schatten(cx, cy, 0.5);
    m.flaeche([[cx - tw * 0.24, cy], [cx - tw * 0.14, cy - tw * 0.2], [cx + tw * 0.1, cy - tw * 0.22], [cx + tw * 0.24, cy - tw * 0.03], [cx + tw * 0.02, cy + th * 0.28]], m.verlauf(cy - tw * 0.22, cy + th * 0.28, '#c3c8cc', '#7d858b'));
    m.flaeche([[cx - tw * 0.14, cy - tw * 0.2], [cx + tw * 0.1, cy - tw * 0.22], [cx + tw * 0.02, cy - tw * 0.08]], '#dfe3e6');
  } else if (t === 'blumen') {
    m.raute(cx, cy, 0.75); X.fillStyle = '#8a6340'; X.fill(); X.strokeStyle = KONTUR; X.stroke();
    const cs = ['#e2582b', '#f6c22c', '#fff', '#d0508f', '#8b5cf0'];
    for (let i = 0; i < 9; i++) m.kreis(cx + Math.cos(i * 2.4) * tw * 0.18 * (((i % 3) + 1) / 3), cy + Math.sin(i * 2.4) * th * 0.3 * (((i % 3) + 1) / 3) - tw * 0.03, tw * 0.035, cs[i % 5]);
  } else if (t === 'hecke') { m.schatten(cx, cy, 0.6); m.quader(cx, cy, 0.8, tw * 0.16, '#3f8a3a'); }
  else if (t === 'bank') {
    m.schatten(cx, cy, 0.4);
    m.flaeche([[cx - tw * 0.24, cy - tw * 0.06], [cx + tw * 0.06, cy + th * 0.28 - tw * 0.06], [cx + tw * 0.06, cy + th * 0.28 - tw * 0.1], [cx - tw * 0.24, cy - tw * 0.1]], '#9c7046');
    m.flaeche([[cx - tw * 0.24, cy - tw * 0.1], [cx + tw * 0.06, cy + th * 0.28 - tw * 0.1], [cx + tw * 0.06, cy + th * 0.28 - tw * 0.22], [cx - tw * 0.24, cy - tw * 0.22]], '#b88a5a');
  } else if (t === 'laterne') {
    m.schatten(cx, cy, 0.25); X.fillStyle = '#2f3437'; X.fillRect(cx - tw * 0.018, cy - tw * 0.55, tw * 0.036, tw * 0.55);
    const g = X.createRadialGradient(cx, cy - tw * 0.58, 1, cx, cy - tw * 0.58, tw * 0.16);
    g.addColorStop(0, '#fff7c2'); g.addColorStop(1, 'rgba(255,220,100,0)'); m.kreis(cx, cy - tw * 0.58, tw * 0.16, g);
    m.kreis(cx, cy - tw * 0.58, tw * 0.05, '#ffe07a', true);
  } else if (t === 'brunnen') {
    m.schatten(cx, cy, 1.4); m.zylinder(cx, cy, tw * 0.55, tw * 0.14, '#c2b8a4');
    X.fillStyle = '#4aa0d8'; X.beginPath(); X.ellipse(cx, cy - tw * 0.14, tw * 0.46, tw * 0.23, 0, 0, ALLES); X.fill();
    m.zylinder(cx, cy - tw * 0.14, tw * 0.08, tw * 0.3, '#c2b8a4');
    for (let i = 0; i < 6; i++) {
      const f = (m.zeit_s * 0.9 + i / 6) % 1, a = i * 1.05;
      X.globalAlpha = 1 - f;
      m.kreis(cx + Math.cos(a) * tw * 0.25 * f, cy - tw * 0.46 + f * f * tw * 0.32 + Math.sin(a) * th * 0.25 * f, tw * 0.025, '#d6f0ff');
    }
    X.globalAlpha = 1;
  }
}

function heizRauch(m: Maler, x: number, y: number, zeit: number, radius: number): void {
  if (!m.reduziert) m.wolke(x, y, zeit, radius);
}

function heizzentrale(m: Maler, o: Objekt, cx: number, cy: number, st: Zustand): void {
  const { X } = m;
  const gross3 = groesse(o) === 3, f = gross3 ? 1.5 : 1, tw0 = m.tw, th0 = m.th;
  m.tw *= f; m.th *= f;
  const tw = m.tw, th = m.th, lv = o.stufe, hp = tw * (0.4 + 0.05 * lv), ins = st.innen;
  m.schatten(cx, cy, 1.7);
  const nk = ins.filter((k) => k.typ === 'kessel' || k.typ === 'pellet' || k.typ === 'gas').length, nb = ins.filter((k) => k.typ === 'bhkw').length, nw = ins.filter((k) => k.typ === 'wpg').length, np = ins.filter((k) => k.typ === 'ptk').length;
  for (let i = 0; i < Math.max(1, nk); i++) {
    const x = cx - tw * 0.5 + i * tw * 0.17, y = cy - hp - tw * 0.05, g = X.createLinearGradient(x, 0, x + tw * 0.1, 0);
    g.addColorStop(0, '#c9ced2'); g.addColorStop(1, '#7e868c'); X.fillStyle = g; X.fillRect(x, y - tw * 0.55, tw * 0.1, tw * 0.55);
    X.strokeStyle = KONTUR; X.lineWidth = 1.2; X.strokeRect(x, y - tw * 0.55, tw * 0.1, tw * 0.55);
    X.fillStyle = '#e2582b'; X.fillRect(x, y - tw * 0.5, tw * 0.1, tw * 0.05); X.fillStyle = '#fff'; X.fillRect(x, y - tw * 0.45, tw * 0.1, tw * 0.04);
  }
  m.kontaktSchatten(cx, cy, 1.78); m.quaderUmriss(cx, cy, 1.78, hp);
  const tp = m.quader(cx, cy, 1.78, hp, '#e4e7e9', true);
  if (m.jahreszeit === 'winter') m.flaeche(tp.welt, SCHNEE, false);
  m.flaeche([[tp.bL[0], tp.bL[1]], [tp.bB[0], tp.bB[1]], [tp.bB[0], tp.bB[1] - hp * 0.22], [tp.bL[0], tp.bL[1] - hp * 0.22]], '#a8553c');
  m.flaeche([[tp.bB[0], tp.bB[1]], [tp.bR[0], tp.bR[1]], [tp.bR[0], tp.bR[1] - hp * 0.22], [tp.bB[0], tp.bB[1] - hp * 0.22]], '#86412e');
  m.flaeche([[tp.L[0], tp.L[1] + hp * 0.12], [tp.B[0], tp.B[1] + hp * 0.12], [tp.B[0], tp.B[1] + hp * 0.24], [tp.L[0], tp.L[1] + hp * 0.24]], '#3d9b4f');
  { // Rolltor auf der rechten sichtbaren Wand (A75: entlang der Wand)
    const auf = (f: number): [number, number] => [tp.bB[0] + (tp.bR[0] - tp.bB[0]) * f, tp.bB[1] + (tp.bR[1] - tp.bB[1]) * f];
    const a = auf(0.16), b = auf(0.58);
    m.flaeche([a, b, [b[0], b[1] - hp * 0.55], [a[0], a[1] - hp * 0.55]], m.verlauf(cy - hp * 0.3, cy + th * 0.7, '#7d8a96', '#4f5b66'));
    X.strokeStyle = 'rgba(255,255,255,.25)'; X.lineWidth = 1;
    for (let i = 1; i < 5; i++) { const d = (hp * 0.55 * i) / 5; X.beginPath(); X.moveTo(a[0], a[1] - d); X.lineTo(b[0], b[1] - d); X.stroke(); }
  }
  if (o.dach_pv) {
    const [a, b, c, d] = tp.welt;
    const lerp = (p: [number, number], q: [number, number], t: number): [number, number] => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    for (let i = 0; i < 3; i++) {
      const l = lerp(a, b, 0.12 + i * 0.26), r = lerp(a, b, 0.33 + i * 0.26);
      const vl = lerp(d, c, 0.12 + i * 0.26), vr = lerp(d, c, 0.33 + i * 0.26);
      m.flaeche([lerp(l, vl, 0.18), lerp(r, vr, 0.18), lerp(r, vr, 0.72), lerp(l, vl, 0.72)], '#234d78');
    }
  }
  for (const fr of [0.25, 0.5, 0.75]) m.fenster(tp.bL, tp.bB, fr, hp, -hp * 0.42, '#bfe0f5', false);
  for (let i = 0; i < nw; i++) {
    const x = cx + tw * 0.05 + i * tw * 0.18, y = cy - hp - th * 0.05 + i * th * 0.1;
    m.zylinder(x, y, tw * 0.1, tw * 0.06, '#aeb7be');
    X.strokeStyle = '#4f5b66'; X.lineWidth = 1.4; const a = m.zeit_s * 7; X.beginPath();
    for (let j = 0; j < 3; j++) { const an = a + j * 2.09; X.moveTo(x, y - tw * 0.06); X.lineTo(x + Math.cos(an) * tw * 0.08, y - tw * 0.06 + Math.sin(an) * tw * 0.04); }
    X.stroke();
  }
  // A58: BHKW als grüner Motorcontainer neben dem Heizhaus
  for (let i = 0; i < nb; i++) { const x = cx - tw * 0.62 - i * tw * 0.12, y = cy + th * 0.35 + i * th * 0.12; m.quader(x, y, 0.42, tw * 0.16, '#3d9b4f', true); m.symbol('blitz', x, y - tw * 0.1, tw * 0.05, '#f6c22c'); }
  for (let i = 0; i < np; i++) { const x = cx - tw * 0.2 + i * tw * 0.16, y = cy - hp + th * 0.15; m.quader(x, y, 0.25, tw * 0.1, '#f2c94c'); m.symbol('blitz', x, y - tw * 0.1, tw * 0.05, 'rgba(40,34,26,.4)'); }
  X.fillStyle = '#f6c22c'; X.strokeStyle = KONTUR; X.lineWidth = 1;
  for (let i = 0; i < lv; i++) m.stern(tp.L[0] + tw * 0.2 + i * tw * 0.1, tp.L[1] + hp * 0.55 + i * th * 0.1, tw * 0.035);
  if (st.laeuft && nk) for (let i = 0; i < nk; i++) heizRauch(m, cx - tw * 0.45 + i * tw * 0.17, cy - hp - tw * 0.62, m.zeit_s + i * 0.37, tw * 0.055);
  m.tw = tw0; m.th = th0;
}

function gross(m: Maler, o: Objekt, cx: number, cy: number, st: Zustand): void {
  const { X } = m, tw = m.tw, th = m.th, t = o.typ, mein = o.zustand === 'vertrag';
  m.schatten(cx, cy, 1.7);
  if (t === 'bad') {
    const hp = tw * 0.42; m.kontaktSchatten(cx, cy, 1.75); m.quaderUmriss(cx, cy, 1.75, hp); const tp = m.quader(cx, cy, 1.75, hp, '#e9f1f5', false);
    for (let i = 0; i < 4; i++) m.fenster(tp.bL, tp.bB, (i + 1) / 5, hp, -hp * 0.35, '#9fd6f5', false);
    m.flaeche([tp.T, tp.R, tp.B, tp.L], '#f4f8fa');
    m.raute(cx, cy - hp, 1.25); X.fillStyle = m.verlauf(cy - hp - th * 0.6, cy - hp + th * 0.6, '#d6f0ff', '#5aa6d6'); X.fill(); X.strokeStyle = KONTUR; X.lineWidth = Math.max(1, tw * 0.018); X.stroke();
    X.strokeStyle = 'rgba(255,255,255,.7)'; X.beginPath(); X.moveTo(cx - tw * 0.35, cy - hp); X.lineTo(cx, cy - hp + th * 0.35); X.stroke();
    m.text('BAD', cx - tw * 0.35, cy - hp * 0.1, tw * 0.18, '#3b86d1');
  } else if (t === 'klinik') {
    const hp = tw * 0.8; m.kontaktSchatten(cx, cy, 1.6); m.quaderUmriss(cx, cy, 1.6, hp); const tp = m.quader(cx, cy, 1.6, hp, '#f4f6f8', true);
    for (let r2 = 0; r2 < 3; r2++) for (let i = 0; i < 3; i++) { m.fenster(tp.bL, tp.bB, (i + 1) / 4, hp, -hp * (0.25 + r2 * 0.27), '#cfe6f5', false); m.fenster(tp.bB, tp.bR, (i + 1) / 4, hp, -hp * (0.25 + r2 * 0.27), '#cfe6f5', true); }
    X.fillStyle = '#3b86d1'; X.strokeStyle = KONTUR; m.rundRechteck(cx - tw * 0.12, cy - hp - tw * 0.12, tw * 0.24, tw * 0.18, 4); X.fill(); X.stroke();
    m.text('H', cx, cy - hp + tw * 0.02, tw * 0.16);
  } else {
    const hp = tw * 0.4; m.kontaktSchatten(cx, cy, 1.75); m.quaderUmriss(cx, cy, 1.75, hp); const tp = m.quader(cx, cy, 1.75, hp, '#c99a63', false);
    for (let i = 0; i < 3; i++) {
      const f = i / 3, f2 = (i + 1) / 3;
      const a: [number, number] = [tp.L[0] + (tp.B[0] - tp.L[0]) * f, tp.L[1] + (tp.B[1] - tp.L[1]) * f];
      const b: [number, number] = [tp.L[0] + (tp.B[0] - tp.L[0]) * f2, tp.L[1] + (tp.B[1] - tp.L[1]) * f2];
      const dx = tp.T[0] - tp.L[0], dy = tp.T[1] - tp.L[1];
      m.flaeche([a, b, [b[0], b[1] - tw * 0.22], [a[0] + dx * 0.2, a[1] + dy * 0.2 - tw * 0.22]], '#8d6a45');
      m.flaeche([b, [b[0] + dx, b[1] + dy], [b[0] + dx, b[1] + dy - tw * 0.22], [b[0], b[1] - tw * 0.22]], '#6e5236');
    }
    for (let i = 0; i < 4; i++) m.kreis(cx + tw * 0.55 - i * tw * 0.08, cy + th * 0.45 - i * th * 0.03, tw * 0.05, i % 2 ? '#b07a45' : '#9a6838', true);
    if (mein) m.wolke(cx - tw * 0.2, cy - hp - tw * 0.2, m.zeit_s, tw * 0.05);
  }
  if (!mein && t !== 'gewerbe') {
    m.quader(cx + tw * 0.45, cy - th * 0.2, 0.15, tw * 0.12, '#7d6a5a');
  }
  void st;
}

export type Blase = 'stecker' | 'kalt' | 'wuetend' | 'weg' | 'leitung' | 'angebot' | 'anfrage' | 'erreicht' | 'ziel';

/** `federn` 0…1: Rest des kurzen Federns (1 = gerade begonnen), vergrößert die Blase um bis zu `plopp_staerke`. */
export function zeichneBlase(m: Maler, cx: number, y: number, art: Blase, federn = 0): void {
  const { X } = m, r = m.tw * 0.17 * (1 + Math.sin(federn * Math.PI) * tokens.karte.plopp_staerke);
  y += Math.sin(m.zeit_s * 3 + cx) * 2.5;
  X.fillStyle = '#fff'; X.strokeStyle = 'rgba(32,28,22,.5)'; X.lineWidth = 2.5;
  X.beginPath(); X.arc(cx, y, r, 0, ALLES); X.fill(); X.stroke();
  X.beginPath(); X.moveTo(cx - r * 0.4, y + r * 0.82); X.lineTo(cx, y + r * 1.5); X.lineTo(cx + r * 0.4, y + r * 0.82); X.closePath(); X.fill(); X.stroke();
  X.beginPath(); X.arc(cx, y, r - 1.5, 0, ALLES); X.fill();
  // A88/F2: Kundenanfrage in Heat-Orange (Rohrnaht Vorlauf, DESIGN.md 12.2)
  if (art === 'erreicht') { hakenScheibe(m, cx, y, r * 0.7); return; }
  if (art === 'ziel') { zielscheibe(m, cx, y, r * 0.7); return; }
  const farbe = { stecker: '#8d99a5', kalt: '#3b86d1', wuetend: '#d8392f', weg: '#4a4038', leitung: '#e2582b', angebot: '#4caf3e', anfrage: '#ff8a1f' }[art];
  m.kreis(cx, y, r * 0.7, farbe);
  if (art === 'anfrage') { flammeMitPlus(m, cx, y, r * 0.5); return; }
  const sym = { stecker: 'ausruf', kalt: 'flocke', wuetend: 'ausruf', weg: 'kreuz', leitung: 'ausruf', angebot: 'frage' } as const;
  m.symbol(sym[art], cx, y, r * 0.5);
}

/** NR13 (DESIGN 13.2 „Erreicht“-Zeichen): grüne Scheibe (`menue.chip.gruen` Grund) mit gezeichnetem Haken in der Chip-Schrift. */
function hakenScheibe(m: Maler, x: number, y: number, r: number): void {
  const { X } = m, [grund, schrift] = tokens.menue.chip.gruen;
  m.kreis(x, y, r, grund);
  X.save(); X.lineJoin = 'round'; X.lineCap = 'round';
  X.strokeStyle = schrift; X.lineWidth = Math.max(1.5, r * 0.22);
  X.beginPath(); X.moveTo(x - r * 0.45, y + r * 0.02); X.lineTo(x - r * 0.12, y + r * 0.35); X.lineTo(x + r * 0.5, y - r * 0.32); X.stroke();
  X.restore();
}

/** NR20 (DESIGN 13.17.1 B4): Scheibe `menue.farbe.ziel` mit 2 px `kontur`, darin Ring + Punkt in `kontur` – wie das SVG-Symbol `zielscheibe`.
 *  Gilt für den Ziel-Stecker und die Zielscheibe im Band. */
export function zielscheibe(m: Maler, x: number, y: number, r: number): void {
  const { X } = m, F = tokens.menue.farbe;
  m.kreis(x, y, r, F.ziel);
  X.strokeStyle = F.kontur; X.lineWidth = 2; X.stroke();
  X.beginPath(); X.arc(x, y, r * 0.55, 0, ALLES); X.lineWidth = Math.max(1.5, r * 0.16); X.stroke();
  m.kreis(x, y, r * 0.2, F.kontur);
}

/** A88/F2: Symbol der Kundenanfrage – Flamme („mehr Wärme“) mit kleinem Plus rechts oben. */
function flammeMitPlus(m: Maler, x: number, y: number, r: number): void {
  const { X } = m, fx = x - r * 0.15;
  X.save(); X.lineJoin = 'round'; X.lineCap = 'round';
  X.beginPath();
  X.moveTo(fx, y - r);
  X.bezierCurveTo(fx + r * 0.75, y - r * 0.3, fx + r * 0.75, y + r * 0.35, fx + r * 0.45, y + r * 0.7);
  X.quadraticCurveTo(fx, y + r * 1.05, fx - r * 0.45, y + r * 0.7);
  X.bezierCurveTo(fx - r * 0.75, y + r * 0.3, fx - r * 0.55, y - r * 0.2, fx, y - r);
  X.closePath();
  X.fillStyle = '#fff'; X.fill(); X.strokeStyle = 'rgba(32,28,22,.5)'; X.lineWidth = Math.max(1, r * 0.16); X.stroke();
  const px = x + r * 0.7, py = y - r * 0.55, a = r * 0.38;
  for (const [farbe, breite] of [['rgba(32,28,22,.5)', Math.max(3, r * 0.42)], ['#fff', Math.max(1.6, r * 0.22)]] as const) {
    X.strokeStyle = farbe; X.lineWidth = breite;
    X.beginPath(); X.moveTo(px - a, py); X.lineTo(px + a, py); X.moveTo(px, py - a); X.lineTo(px, py + a); X.stroke();
  }
  X.restore();
}

export function zeichneBalken(m: Maler, cx: number, y: number, b: Bau, jetzt_ms: number): void {
  const { X } = m, tw = m.tw;
  const f = Math.max(0, Math.min(1, (jetzt_ms - b.start_ms) / (b.ende_ms - b.start_ms)));
  const rest_s = Math.max(0, (b.ende_ms - jetzt_ms) / 1000), w = tw * 1.1, h = Math.max(9, tw * 0.14);
  X.fillStyle = 'rgba(32,28,22,.5)'; m.rundRechteck(cx - w / 2 - 3, y - h - 3, w + 6, h + 6, 7); X.fill();
  X.fillStyle = '#4a3a26'; m.rundRechteck(cx - w / 2, y - h, w, h, 5); X.fill();
  const g = X.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, '#9be36a'); g.addColorStop(1, '#3f9a25');
  X.fillStyle = g; m.rundRechteck(cx - w / 2, y - h, Math.max(h, w * f), h, 5); X.fill();
  m.text(zeitText(rest_s), cx, y - h - 7, Math.max(12, tw * 0.22));
}

export function zeitText(s: number): string {
  s = Math.ceil(s);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60 ? `${s % 60}s` : ''}`.trim();
  const h = Math.floor(s / 3600), min = Math.floor((s % 3600) / 60);
  return `${h}h ${min ? `${min}m` : ''}`.trim();
}

/** Ungefähre Dauer für Fließtext („etwa 15 Min.“, DESIGN 12.22) – nicht für die Restzeit-Anzeigen, die `zeitText` kurz hält.
 *  Ab einer Minute auf ganze Minuten gerundet. Endet immer mit dem Abkürzungspunkt – am Satzende keinen zweiten setzen. */
export function dauerText(s: number): string {
  s = Math.ceil(s);
  if (s < 60) return `${s} Sek.`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} Min.`;
  const h = Math.floor(min / 60), rest = min % 60;
  return rest ? `${h} Std. ${rest} Min.` : `${h} Std.`;
}

export function zeichneGeruest(m: Maler, cx: number, cy: number, s: number, hp: number): void {
  const { X } = m, tw = m.tw, th = m.th;
  X.strokeStyle = '#a0703f'; X.lineWidth = Math.max(1.5, tw * 0.03); X.beginPath();
  for (const f of [-0.4, 0, 0.4]) { X.moveTo(cx + f * tw * s, cy + th * 0.15); X.lineTo(cx + f * tw * s, cy - hp); }
  for (const k of [0.33, 0.66, 1]) { X.moveTo(cx - 0.4 * tw * s, cy - hp * k); X.lineTo(cx + 0.4 * tw * s, cy - hp * k); }
  X.stroke();
  const a = Math.sin(m.zeit_s * 10) * 0.6, mx = cx + tw * 0.35 * s, my = cy + th * 0.25;
  m.kreis(mx, my - tw * 0.16, tw * 0.045, '#f6c22c', true); X.lineWidth = 1; X.stroke();
  X.fillStyle = '#e2582b'; X.fillRect(mx - tw * 0.035, my - tw * 0.12, tw * 0.07, tw * 0.1);
  X.strokeStyle = '#5b4a33'; X.lineWidth = Math.max(1.5, tw * 0.02); X.beginPath();
  X.moveTo(mx + tw * 0.03, my - tw * 0.09); X.lineTo(mx + tw * 0.03 + Math.cos(a - 1) * tw * 0.1, my - tw * 0.09 + Math.sin(a - 1) * tw * 0.1); X.stroke();
}
