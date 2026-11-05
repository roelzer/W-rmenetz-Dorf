import { istLeitung, KATALOG, type TypId } from '../core/katalog';
import type { Objekt } from '../core/typen';
import { zeichneObjekt } from '../render/gebaeude';
import { Maler } from '../render/maler';
import { T } from './tokens';

/** Zeichnet das Katalogbild mit denselben Zeichenfunktionen wie die Karte, auf Wiesengrund. */
export function katalogBild(typ: TypId, breite = 150, hoehe = T.groesse_px.katalog_bild_hoehe): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = breite * dpr; c.height = hoehe * dpr;
  const X = c.getContext('2d')!;
  X.scale(dpr, dpr);
  X.fillStyle = T.farbe.karte.wiese_a; X.fillRect(0, 0, breite, hoehe);
  const m = new Maler(X);
  const D = KATALOG[typ];
  const kante = D.groesse ?? 1;
  m.tw = kante >= 2 ? 52 : 64; m.th = m.tw / 2;
  const cx = breite / 2, cy = hoehe * 0.72;
  if (D.kategorie === 'innen') heizhausBild(m, typ, cx, cy);
  else if (istLeitung(typ)) leitungsBild(m, typ, cx, cy);
  else {
    const o: Objekt = { id: 1, typ, x: 0, y: 0, stufe: 1, bau: null, kasse_eur: 0, zustand: 'vertrag' };
    zeichneObjekt(m, o, cx, cy, { warm: true, laeuft: false, innen: [], oel: false }, 0);
  }
  return c;
}

function leitungsBild(m: Maler, typ: TypId, cx: number, cy: number): void {
  const { X } = m, D = KATALOG[typ], w = Math.max(4, m.tw * (D.breite ?? 0.1) * 1.8);
  X.lineCap = 'round';
  for (const [lw, f] of [[w + 4, '#2a1d10'], [w, D.farbe ?? '#e2582b']] as const) {
    X.strokeStyle = f; X.lineWidth = lw; X.beginPath(); X.moveTo(cx - m.tw * 0.9, cy - m.th * 0.4); X.lineTo(cx + m.tw * 0.9, cy - m.th * 0.4); X.stroke();
  }
  X.strokeStyle = 'rgba(255,255,255,.45)'; X.lineWidth = Math.max(1, w * 0.3); X.beginPath(); X.moveTo(cx - m.tw * 0.9, cy - m.th * 0.4 - w * 0.22); X.lineTo(cx + m.tw * 0.9, cy - m.th * 0.4 - w * 0.22); X.stroke();
}

function heizhausBild(m: Maler, typ: TypId, cx: number, cy: number): void {
  const { X } = m, tw = m.tw;
  m.schatten(cx, cy, 1);
  if (typ === 'kessel') {
    m.zylinder(cx, cy, tw * 0.3, tw * 0.55, '#c9ced2');
    X.fillStyle = '#e2582b'; X.fillRect(cx - tw * 0.3, cy - tw * 0.32, tw * 0.6, tw * 0.07);
    m.quader(cx + tw * 0.3, cy - tw * 0.05, 0.16, tw * 0.5, '#9aa4ac');
    m.wolke(cx + tw * 0.3, cy - tw * 0.55, 0.3, tw * 0.06);
  } else if (typ === 'wpg') {
    const tp = m.quader(cx, cy, 0.9, tw * 0.4, '#dfe6ea', true);
    m.zylinder(cx, cy - tw * 0.4, tw * 0.2, tw * 0.05, '#aeb7be');
    X.strokeStyle = '#4f5b66'; X.lineWidth = 2; X.beginPath();
    for (let j = 0; j < 3; j++) { const a = j * 2.09 + 0.4; X.moveTo(cx, cy - tw * 0.45); X.lineTo(cx + Math.cos(a) * tw * 0.16, cy - tw * 0.45 + Math.sin(a) * tw * 0.08); }
    X.stroke(); void tp;
  } else if (typ === 'pellet') {
    m.zylinder(cx, cy, tw * 0.24, tw * 0.45, '#d9d2c3');
    X.fillStyle = '#8a5a2b'; X.fillRect(cx - tw * 0.24, cy - tw * 0.27, tw * 0.48, tw * 0.06);
    m.zylinder(cx - tw * 0.32, cy + tw * 0.02, tw * 0.12, tw * 0.3, '#b98a52');
    m.quader(cx + tw * 0.26, cy - tw * 0.05, 0.12, tw * 0.42, '#9aa4ac');
  } else if (typ === 'gas') {
    m.quader(cx, cy, 0.75, tw * 0.42, '#d8392f', true);
    X.fillStyle = '#fff'; X.fillRect(cx - tw * 0.16, cy - tw * 0.3, tw * 0.32, tw * 0.05);
    m.quader(cx + tw * 0.22, cy - tw * 0.2, 0.12, tw * 0.45, '#9aa4ac');
    m.kreis(cx - tw * 0.05, cy - tw * 0.12, tw * 0.07, '#4aa3ff');
  } else if (typ === 'bhkw') {
    m.quader(cx, cy, 1.0, tw * 0.38, '#3d9b4f', true);
    X.strokeStyle = 'rgba(255,255,255,.5)'; X.lineWidth = 1.5;
    for (let j = 0; j < 4; j++) { X.beginPath(); X.moveTo(cx - tw * 0.32 + j * tw * 0.1, cy - tw * 0.05); X.lineTo(cx - tw * 0.32 + j * tw * 0.1, cy - tw * 0.3); X.stroke(); }
    m.symbol('blitz', cx + tw * 0.2, cy - tw * 0.2, tw * 0.12, '#f6c22c');
    m.quader(cx - tw * 0.1, cy - tw * 0.38, 0.1, tw * 0.25, '#7e868c');
  } else {
    m.quader(cx, cy, 0.9, tw * 0.4, '#f2c94c', true);
    m.symbol('blitz', cx - tw * 0.18, cy - tw * 0.15, tw * 0.16, '#2a1d10');
  }
}
