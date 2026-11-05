import tokens from '../../design/tokens.json';
import { istLeitung, KATALOG, KONSTANTEN, type TypId } from '../core/katalog';
import { bedarfKw, groesse, heizzentrale } from '../core/netz';
import type { Spiel } from '../core/spiel';
import type { InnenQuelle, Netz, Objekt } from '../core/typen';
import { zufall } from '../core/zufall';
import { Effekte } from './effekte';
import { Blase, zeichneBalken, zeichneBlase, zeichneGeruest, zeichneObjekt } from './gebaeude';
import { Kamera } from './kamera';
import type { Maler, Punkt } from './maler';

const N = KONSTANTEN.feldanzahl;

/** Alles, was die Szene zum Zeichnen braucht. `spiel` fehlt beim Besuch im Nachbardorf (keine Blasen, keine Kasse). */
export interface Szene {
  objekte: Objekt[];
  innen: InnenQuelle[];
  netz: Netz;
  spiel: Spiel | null;
  auswahl_id: number | null;
  modus: 'normal' | 'platzieren' | 'verschieben' | 'stempel';
  /** Platzier-Vorschau */
  geist: { typ: TypId; x: number; y: number; kante: number; ok: boolean } | null;
  verschiebe_id: number | null;
  stempel: { x: number; y: number; ok: boolean } | null;
  jetzt_ms: number;
  /** Straßenfelder des Ortes (nur Optik) */
  strassen?: ReadonlyArray<readonly [number, number]>;
  fluss?: ReadonlyArray<readonly [number, number]>;
}

interface Gras { n: Punkt[]; blume: number; hell: number }
const GRAS: Gras[] = (() => {
  const r = zufall(3), a: Gras[] = [];
  for (let i = 0; i < N * N; i++) {
    const n: Punkt[] = [];
    for (let j = 0; j < 3; j++) n.push([r() - 0.5, r() - 0.5]);
    a.push({ n, blume: r() < 0.07 ? Math.floor(r() * 3) : -1, hell: r() });
  }
  return a;
})();

const KARTE = tokens.farbe.karte;
const NACHBARN: Punkt[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function zeichneSzene(m: Maler, k: Kamera, s: Szene, effekte: Effekte, dt_s: number): void {
  const { X } = m;
  m.tw = k.tw; m.th = k.th;
  const tw = k.tw, th = k.th, W = k.breite, H = k.hoehe;
  X.setTransform(k.pixelverhaeltnis, 0, 0, k.pixelverhaeltnis, 0, 0);
  X.fillStyle = KARTE.hintergrund_rand; X.fillRect(0, 0, W, H);

  // Boden
  for (let y = -3; y < N + 3; y++) {
    for (let x = -3; x < N + 3; x++) {
      const [cx, cy] = k.mitte(x, y);
      if (cx < -tw || cx > W + tw || cy < -th || cy > H + tw) continue;
      const innen = x >= 0 && y >= 0 && x < N && y < N;
      m.raute(cx, cy, 1.02);
      if (innen) {
        const g = GRAS[y * N + x];
        X.fillStyle = (x + y) % 2 ? KARTE.wiese_a : KARTE.wiese_b; X.fill();
        if (g.hell > 0.8) { X.fillStyle = 'rgba(255,255,255,.05)'; X.fill(); }
        if (tw > (tokens as unknown as { karte: { grashalme_ab_kachelbreite: number } }).karte.grashalme_ab_kachelbreite) {
          X.strokeStyle = KARTE.halm; X.lineWidth = 1; X.beginPath();
          for (const [a, b] of g.n) { const px = cx + a * tw * 0.6, py = cy + b * th * 0.6; X.moveTo(px, py); X.lineTo(px - 1.5, py - tw * 0.05); X.moveTo(px, py); X.lineTo(px + 1.5, py - tw * 0.045); }
          X.stroke();
          if (g.blume >= 0) m.kreis(cx + g.n[0][0] * tw * 0.4, cy + g.n[0][1] * th * 0.4, Math.max(1.2, tw * 0.022), KARTE.blumen[g.blume]);
        }
      } else { X.fillStyle = (x + y) % 2 ? KARTE.aussen_a : KARTE.aussen_b; X.fill(); }
    }
  }
  // Fluss (A46): Wasserfelder mit Uferlinie; Brücken entstehen, wo eine Straße darüber liegt
  if (s.fluss?.length) {
    const wasser = new Set(s.fluss.map(([fx, fy]) => fy * N + fx));
    for (const [fx, fy] of s.fluss) {
      const [cx, cy] = k.mitte(fx, fy);
      if (cx < -tw || cx > W + tw || cy < -th || cy > H + tw) continue;
      m.raute(cx, cy, 1.03); X.fillStyle = (fx + fy) % 2 ? KARTE.wasser_a : KARTE.wasser_b; X.fill();
      const glitzer = Math.sin(m.zeit_s * 1.4 + fx * 1.3 + fy * 0.7);
      if (glitzer > 0.6) { X.strokeStyle = 'rgba(255,255,255,.35)'; X.lineWidth = 1; X.beginPath(); X.moveTo(cx - tw * 0.12, cy); X.lineTo(cx + tw * 0.12, cy); X.stroke(); }
    }
    X.strokeStyle = KARTE.ufer; X.lineWidth = Math.max(1.5, tw * 0.03);
    for (const [fx, fy] of s.fluss) {
      const [cx, cy] = k.mitte(fx, fy);
      if (cx < -tw || cx > W + tw || cy < -th || cy > H + tw) continue;
      const ecken: Array<[number, number, [number, number], [number, number]]> = [
        [0, -1, [0, -th / 2], [tw / 2, 0]], [1, 0, [tw / 2, 0], [0, th / 2]], [0, 1, [0, th / 2], [-tw / 2, 0]], [-1, 0, [-tw / 2, 0], [0, -th / 2]],
      ];
      for (const [dx, dy, a, b] of ecken) {
        if (wasser.has((fy + dy) * N + fx + dx)) continue;
        X.beginPath(); X.moveTo(cx + a[0], cy + a[1]); X.lineTo(cx + b[0], cy + b[1]); X.stroke();
      }
    }
  }
  // Straßen (A44): helle Bänder mit feinem Rand und gestrichelter Mitte; Leitungen liegen darüber
  if (s.strassen?.length) {
    const feld = new Set(s.strassen.map(([sx, sy]) => sy * N + sx));
    for (const [sx, sy] of s.strassen) {
      const [cx, cy] = k.mitte(sx, sy);
      if (cx < -tw || cx > W + tw || cy < -th || cy > H + tw) continue;
      m.raute(cx, cy, 1.03); X.fillStyle = KARTE.strasse; X.fill();
    }
    X.strokeStyle = KARTE.strasse_rand; X.lineWidth = 1;
    for (const [sx, sy] of s.strassen) {
      const [cx, cy] = k.mitte(sx, sy);
      if (cx < -tw || cx > W + tw || cy < -th || cy > H + tw) continue;
      // Randlinie nur dort, wo kein Straßenfeld anschließt
      const ecken: Array<[number, number, [number, number], [number, number]]> = [
        [0, -1, [0, -th / 2], [tw / 2, 0]], [1, 0, [tw / 2, 0], [0, th / 2]], [0, 1, [0, th / 2], [-tw / 2, 0]], [-1, 0, [-tw / 2, 0], [0, -th / 2]],
      ];
      for (const [dx, dy, a, b] of ecken) {
        if (feld.has((sy + dy) * N + sx + dx)) continue;
        X.beginPath(); X.moveTo(cx + a[0], cy + a[1]); X.lineTo(cx + b[0], cy + b[1]); X.stroke();
      }
    }
  }
  // Waldrand
  for (let i = -3; i < N + 3; i++) {
    for (const [x, y] of [[i, -2], [-2, i], [i, -3], [-3, i]]) {
      const [cx, cy] = k.mitte(x + ((i * 7) % 3) * 0.2, y);
      if (cx < -tw || cx > W + tw || cy < -tw || cy > H + tw) continue;
      m.baum(cx, cy, 1.25, i);
    }
  }
  // Zaun um das Dorf
  { const a = k.mitte(-0.5, -0.5), b = k.mitte(N - 0.5, -0.5), c = k.mitte(N - 0.5, N - 0.5), d = k.mitte(-0.5, N - 0.5);
    X.strokeStyle = '#c9a76a'; X.lineWidth = Math.max(2, tw * 0.06); X.beginPath();
    X.moveTo(a[0], a[1] - th / 2); X.lineTo(b[0], b[1] - th / 2); X.lineTo(c[0], c[1] - th / 2); X.lineTo(d[0], d[1] - th / 2); X.closePath(); X.stroke(); }
  if (s.modus !== 'normal') {
    X.strokeStyle = 'rgba(255,255,255,.25)'; X.lineWidth = 1;
    for (let i = 0; i <= N; i++) {
      const a = k.mitte(i - 0.5, -0.5), b = k.mitte(i - 0.5, N - 0.5), c = k.mitte(-0.5, i - 0.5), d = k.mitte(N - 0.5, i - 0.5);
      X.beginPath(); X.moveTo(a[0], a[1] - th / 2); X.lineTo(b[0], b[1] - th / 2); X.moveTo(c[0], c[1] - th / 2); X.lineTo(d[0], d[1] - th / 2); X.stroke();
    }
  }

  zeichneLeitungen(m, k, s);

  // Auswahlring
  const sel = s.auswahl_id != null ? s.objekte.find((o) => o.id === s.auswahl_id) : undefined;
  if (sel && s.modus !== 'verschieben') {
    const kante = groesse(sel), [cx, cy] = k.mitte(sel.x + (kante - 1) / 2, sel.y + (kante - 1) / 2);
    m.raute(cx, cy, kante + 0.12); X.strokeStyle = '#fff'; X.lineWidth = 3; X.setLineDash([7, 5]); X.lineDashOffset = -m.zeit_s * 20; X.stroke(); X.setLineDash([]);
  }

  // Gebäude von hinten nach vorn
  // A37: Beim Planen (Leitungen einzeichnen) werden Gebäude durchsichtig, die Leitungen dahinter bleiben sichtbar.
  const durchsicht = istDurchsichtig(s.modus, s.spiel?.abschnitt?.phase);
  const sortiert = s.objekte.filter((o) => !istLeitung(o.typ) && !(s.modus === 'verschieben' && o.id === s.verschiebe_id))
    .sort((a, b) => (a.x + a.y + 2 * groesse(a)) - (b.x + b.y + 2 * groesse(b)) || a.x - b.x);
  const oben: Array<() => void> = [];
  for (const o of sortiert) {
    const kante = groesse(o), D = KATALOG[o.typ], kat = D.kategorie;
    const [cx, cy] = k.mitte(o.x + (kante - 1) / 2, o.y + (kante - 1) / 2);
    const angeschlossen = s.netz.anschluss.has(o.id);
    const st = {
      warm: s.netz.warm.has(o.id), laeuft: s.netz.genutzt_kw > 0, innen: s.innen,
      oel: (kat === 'haus' && (!angeschlossen || !!o.gekuendigt)) || (kat === 'gross' && o.zustand !== 'vertrag' && o.typ !== 'gewerbe'),
    };
    const durch = durchsicht && kat !== 'dorf';
    if (durch) X.globalAlpha = 0.5;
    zeichneObjekt(m, o, cx, cy, st, s.jetzt_ms);
    if (durch) X.globalAlpha = 1;
    const topY = cy - tw * (kante >= 2 ? (o.typ === 'klinik' ? 1.15 : 0.95) : 0.72);
    if (o.bau) {
      const hp = tw * 0.55 * kante, bau = o.bau;
      zeichneGeruest(m, cx, cy, kante * 0.8, hp);
      oben.push(() => zeichneBalken(m, cx, cy - hp - tw * 0.15, bau, s.jetzt_ms));
    } else if (s.spiel) {
      const b = blase(s.spiel, s.netz, o, st.warm, angeschlossen);
      if (b) oben.push(() => zeichneBlase(m, cx, topY, b));
    }
    // A25: Verbrauch jedes Kunden als kleines Schild am Fuß des Gebäudes
    const DK = KATALOG[o.typ];
    if (!o.bau && DK.bedarf_kw && !o.gekuendigt && (DK.kategorie === 'haus' || (DK.kategorie === 'gross' && o.zustand === 'vertrag')) && tw >= 36) {
      const txt = `${Math.round(bedarfKw(o))} kW`, fy = cy + tw * 0.16 * kante;
      oben.push(() => {
        const g = Math.max(10, tw * 0.17), w = txt.length * g * 0.56 + g * 0.9;
        X.fillStyle = 'rgba(42,33,24,.72)'; m.rundRechteck(cx - w / 2, fy - g * 0.9, w, g * 1.3, g * 0.4); X.fill();
        m.text(txt, cx, fy, g, '#fff');
      });
    }
  }
  const hzObj = heizzentrale(s.objekte);
  const innenBau = s.innen.find((q) => q.bau);
  if (s.spiel && innenBau?.bau && hzObj) {
    const [cx, cy] = k.mitte(hzObj.x + (groesse(hzObj) - 1) / 2, hzObj.y + (groesse(hzObj) - 1) / 2), bau = innenBau.bau;
    oben.push(() => zeichneBalken(m, cx, cy - tw * (groesse(hzObj) === 3 ? 1.5 : 1.1), bau, s.jetzt_ms));
  }

  // Platzier-Vorschau
  if ((s.modus === 'platzieren' || s.modus === 'verschieben') && s.geist) {
    const g = s.geist, [cx, cy] = k.mitte(g.x + (g.kante - 1) / 2, g.y + (g.kante - 1) / 2);
    m.raute(cx, cy, g.kante); X.fillStyle = g.ok ? 'rgba(76,175,62,.45)' : 'rgba(216,57,47,.45)'; X.fill(); X.strokeStyle = '#fff'; X.lineWidth = 2.5; X.stroke();
    const bewegt = s.verschiebe_id != null ? s.objekte.find((o) => o.id === s.verschiebe_id) : undefined;
    const vorlage: Objekt = bewegt ? { ...bewegt, x: g.x, y: g.y, bau: null, _pop: 0 }
      : { id: 0, typ: g.typ, x: g.x, y: g.y, stufe: 1, bau: null, kasse_eur: 0 };
    X.globalAlpha = 0.9;
    zeichneObjekt(m, vorlage, cx, cy, { warm: true, laeuft: false, innen: s.innen, oel: false }, s.jetzt_ms);
    X.globalAlpha = 1;
    oben.push(() => m.symbol('pfeil', cx, cy - tw * (g.kante > 1 ? 1.1 : 0.8) + Math.sin(m.zeit_s * 4) * 3, tw * 0.15, g.ok ? '#9be36a' : '#ff6a5a'));
  }
  if (s.modus === 'stempel' && s.stempel) {
    const [cx, cy] = k.mitte(s.stempel.x, s.stempel.y);
    m.raute(cx, cy, 1); X.strokeStyle = s.stempel.ok ? '#fff' : '#d8392f'; X.lineWidth = 2.5; X.stroke();
  }
  if (durchsicht) zeichneLeitungen(m, k, s);
  oben.forEach((f) => f());
  effekte.zeichnen(m, dt_s, (x, y) => k.mitte(x, y));
}

/** Welche Sprechblase gehört über das Gebäude? Nur eine, wichtigste zuerst. */
function blase(sp: Spiel, netz: Netz, o: Objekt, warm: boolean, angeschlossen: boolean): Blase | null {
  const D = KATALOG[o.typ], kat = D.kategorie;
  if (kat === 'haus' || (kat === 'gross' && o.zustand === 'vertrag' && D.bedarf_kw)) {
    if (o.gekuendigt) return 'weg';
    if (!angeschlossen && !o.station) return null; // Häuser, die noch mit Öl heizen, bekommen keine Blase (weniger Unruhe)
    if (!angeschlossen || o.ohne_station) return 'stecker';
    if (netz.kalt.get(o.id) === 'leitung' || netz.kalt.get(o.id) === 'station') return 'leitung';
    if (!warm) return 'kalt';
    if ((o.zufriedenheit_pct ?? 80) < 40) return 'wuetend';
    if (o.kasse_eur >= sp.kassenCap_eur(o) * 0.08) return 'muenze';
    return null;
  }
  if (kat === 'gross' && o.zustand !== 'vertrag' && sp.vertragBedingungen(o).ok) return 'angebot';
  if (kat === 'gross' && o.typ === 'gewerbe' && o.zustand === 'vertrag' && !angeschlossen) return 'stecker';
  if (kat === 'waerme' && !angeschlossen) return 'stecker';
  return null;
}

/** A37: Beim Planen sind Gebäude durchsichtig, damit nichts dahinter verschwindet. */
export function istDurchsichtig(modus: string, abschnittPhase?: string): boolean {
  return modus === 'stempel' || modus === 'platzieren' || abschnittPhase === 'offen';
}

function zeichneLeitungen(m: Maler, k: Kamera, s: Szene): void {
  const { X } = m, tw = k.tw, netz = s.netz;
  const nachFeld = new Map<number, Objekt>();
  for (const o of s.objekte) { const kante = groesse(o); for (let dy = 0; dy < kante; dy++) for (let dx = 0; dx < kante; dx++) nachFeld.set((o.y + dy) * N + o.x + dx, o); }
  for (const o of s.objekte) {
    if (!istLeitung(o.typ)) continue;
    const key = o.y * N + o.x, [cx, cy] = k.mitte(o.x, o.y), an = netz.tiefe.has(key), seg: Punkt[] = [];
    for (const [dx, dy] of NACHBARN) {
      const nx = o.x + dx, ny = o.y + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const n = nachFeld.get(ny * N + nx);
      if (!n) continue;
      const c = KATALOG[n.typ].kategorie;
      if (istLeitung(n.typ) || n.typ === 'hz' || c === 'haus' || c === 'waerme' || c === 'gross') { const [a, b] = k.mitte(nx, ny); seg.push([(cx + a) / 2, (cy + b) / 2]); }
    }
    const plan = !!o.geplant;
    if (plan) { X.save(); X.globalAlpha = 0.6; }
    const D = KATALOG[o.typ], w = Math.max(2, tw * (D.breite ?? 0.1)), ueber = an && netz.kapazitaet_ok.get(key) === false;
    m.raute(cx, cy, 0.55); X.fillStyle = 'rgba(140,100,55,.35)'; X.fill();
    X.lineCap = 'round';
    const rohr = plan ? (D.farbe ?? '#e2582b') : ueber ? (Math.floor(m.zeit_s * 4) % 2 ? '#ff4a3a' : '#b8221a') : an ? (D.farbe ?? '#e2582b') : '#9aa4ab';
    for (const [lw, c] of [[w + 2, 'rgba(40,34,26,.4)'], [w, rohr]] as const) {
      X.strokeStyle = c; X.lineWidth = lw; X.beginPath();
      for (const [mx, my] of seg) { X.moveTo(cx, cy); X.lineTo(mx, my); }
      if (!seg.length) { X.moveTo(cx - 1, cy); X.lineTo(cx + 1, cy); }
      X.stroke();
    }
    X.strokeStyle = 'rgba(255,255,255,.45)'; X.lineWidth = Math.max(1, w * 0.3); X.beginPath();
    for (const [mx, my] of seg) { X.moveTo(cx, cy - w * 0.22); X.lineTo(mx, my - w * 0.22); }
    X.stroke();
    if (netz.engpass.has(key)) {
      m.bahn([[cx, cy - tw * 0.32], [cx + tw * 0.13, cy - tw * 0.07], [cx - tw * 0.13, cy - tw * 0.07]]);
      X.fillStyle = '#d8392f'; X.strokeStyle = 'rgba(32,28,22,.5)'; X.lineWidth = 2; X.fill(); X.stroke();
      m.symbol('ausruf', cx, cy - tw * 0.14, tw * 0.07);
    }
    if (plan) {
      X.setLineDash([tw * 0.08, tw * 0.06]); X.strokeStyle = '#2a6fb0'; X.lineWidth = 1.5; m.raute(cx, cy, 0.6); X.stroke(); X.setLineDash([]);
      X.restore();
    }
  }
  // Wärmepunkte fließen vom Heizhaus zum Kunden
  const hz = heizzentrale(s.objekte);
  X.fillStyle = '#fff';
  for (const [key] of netz.tiefe) {
    if (!((netz.last_kw.get(key) ?? 0) > 0)) continue;
    const p = netz.eltern.get(key), x = key % N, y = (key - x) / N;
    let a: Punkt;
    if (p === -1 || p === undefined) { const kante = groesse(hz); a = k.mitte(hz.x + (kante - 1) / 2, hz.y + (kante - 1) / 2); }
    else a = k.mitte(p % N, (p - (p % N)) / N);
    const b = k.mitte(x, y), f = (m.zeit_s * 0.6 + key * 0.37) % 1;
    X.globalAlpha = 0.9; X.beginPath(); X.arc(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.max(1.5, tw * 0.028), 0, Math.PI * 2); X.fill();
  }
  X.globalAlpha = 1;
}
