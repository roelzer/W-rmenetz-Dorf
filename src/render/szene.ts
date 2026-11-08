import tokens from '../../design/tokens.json';
import { istLeitung, KATALOG, KONSTANTEN, type TypId } from '../core/katalog';
import { abzweigZeichnen, eigenerHausanschluss, kwSchildZeigen } from './anschluss';
import { bedarfKw, groesse, heizzentrale, leitungsNachbarn } from '../core/netz';
import type { Spiel } from '../core/spiel';
import { bandVorgaenger } from '../core/tutorial-band';
import type { Feld, TutorialBandFeld } from '../core/tutorial-vertrag';
import type { InnenQuelle, Netz, Objekt } from '../core/typen';
import { zufall } from '../core/zufall';
import { BodenEbene, flaechenGroesse, type FlaechenFabrik } from './ebenen';
import { Effekte } from './effekte';
import { blase } from './blase';
import { FEDERN_MS, zeichneBalken, zeichneBlase, zeichneGeruest, zeichneObjekt } from './gebaeude';
import { Kamera } from './kamera';
import type { Maler, Punkt } from './maler';
import { bodenSchluessel, fremdEinblendungMerken } from './szene-schluessel';

// Bestehende Aufrufer (Tests) holen `blase` weiter hier.
export { blase };

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
  /** Verbrauchsschilder (kW) der Häuser anzeigen; Standard: ja */
  kw_anzeigen?: boolean;
  /** NR13: erreichte Tutorial-Häuser mit Zeitpunkt, ab dem ihr „Erreicht“-Zeichen federt */
  erreicht?: ReadonlyArray<{ id: number; seit_ms: number }>;
  /** NR20: Geisterleitung mit Pfeilen (T13/T13w/T13h) */
  tutorial_band?: ReadonlyArray<TutorialBandFeld>;
  /** NR20: Feld mit der leuchtenden Raute */
  naechstes_feld?: Feld;
  /** NR20: Zielscheibe im Band auf dem Abzweig */
  zielscheibe?: Feld;
  /** NR20: Haus-Ids mit Ziel-Stecker und das Haus mit Ring */
  ziel?: { stecker: number[]; ring: number | null };
  /** DESIGN 13.17.9 F2: Ziel-Stecker blass wie ruhende Bandstücke (`faktor.geist_ruhend`), solange die Häuser noch nicht das Ziel sind */
  stecker_blass?: boolean;
  /** DESIGN 13.17.10 G5: nur diese Ziel-Stecker blass (`faktor.geist_ruhend`), solange die Zielscheibe wegen eines eigenen Abgangs steht */
  stecker_blass_ids?: ReadonlyArray<number>;
  /** NR20: Ruhe im Bild in Kapitel 3 (kW-Schilder und fremde Blasen aus, leichter Schleier) */
  ruhe?: boolean;
  /** NR21: gestreiftes fremdes Stück (eigener Abgang) */
  tutorial_fremd?: ReadonlyArray<Feld>;
  /** NR22: überlastete Stücke; `dreiecke` = Feldnummern der Warndreiecke, `geplant` = Ersatz für alle Felder geplant */
  ueberlast?: ReadonlyArray<{ felder: number[]; dreiecke: number[]; geplant: boolean; seit_ms: number }>;
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

function zeichneBoden(m: Maler, k: Kamera, s: Szene): void {
  const { X } = m;
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
    }
    X.strokeStyle = KARTE.ufer; X.lineWidth = Math.max(1.5, tw * 0.03);
    for (const [fx, fy] of s.fluss) {
      const [cx, cy] = k.mitte(fx, fy);
      if (cx < -tw || cx > W + tw || cy < -th || cy > H + tw) continue;
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        if (wasser.has((fy + dy) * N + fx + dx)) continue;
        // A75: Uferkante = Feldrand zur Landseite, über die Kamera gerechnet (stimmt in jedem Drehwinkel)
        const pa = k.mitte(fx + dx / 2 - dy / 2, fy + dy / 2 - dx / 2), pb = k.mitte(fx + dx / 2 + dy / 2, fy + dy / 2 + dx / 2);
        const a = [pa[0] - cx, pa[1] - cy], b = [pb[0] - cx, pb[1] - cy];
        X.beginPath(); X.moveTo(cx + a[0], cy + a[1]); X.lineTo(cx + b[0], cy + b[1]); X.stroke();
      }
    }
  }
  // Straßen (A53): Asphalt zwischen Gehwegen mit Bordstein, Mittelmarkierung, Zebrastreifen, Laternen; Leitungen liegen darüber
  if (s.strassen?.length) {
    const feld = new Set(s.strassen.map(([sx, sy]) => sy * N + sx));
    const strasse = (x: number, y: number): boolean => feld.has(y * N + x);
    const hash = (x: number, y: number): number => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
    const arme = (x: number, y: number): number => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => strasse(x + dx, y + dy)).length;
    const sichtbar = (cx: number, cy: number): boolean => !(cx < -tw || cx > W + tw || cy < -th || cy > H + tw);
    const poly = (sx: number, sy: number, pts: Array<[number, number]>, fuell: string): void => {
      X.beginPath(); pts.forEach(([gx, gy], i) => { const [px, py] = k.mitte(sx + gx, sy + gy); if (i) X.lineTo(px, py); else X.moveTo(px, py); }); X.closePath(); X.fillStyle = fuell; X.fill();
    };
    const BR = 0.31; // halbe Fahrbahnbreite in Feldern
    // 1. Gehweg + Bordstein (volle Felder)
    for (const [sx, sy] of s.strassen) {
      const [cx, cy] = k.mitte(sx, sy);
      if (!sichtbar(cx, cy)) continue;
      m.raute(cx, cy, 1.03); X.fillStyle = KARTE.gehweg; X.fill();
    }
    // 2. Asphalt: Mitte plus Arme zu Nachbarstraßen; Bordsteinlinie als etwas hellerer Rand
    const asphalt = (breite: number, farbe: string): void => {
      for (const [sx, sy] of s.strassen!) {
        const [cx, cy] = k.mitte(sx, sy);
        if (!sichtbar(cx, cy)) continue;
        poly(sx, sy, [[-breite, -breite], [breite, -breite], [breite, breite], [-breite, breite]], farbe);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!strasse(sx + dx, sy + dy)) continue;
          const px = dy === 0 ? 0.52 * dx : breite, py = dx === 0 ? 0.52 * dy : breite;
          const x0 = dx === 0 ? -breite : Math.min(0, 0.52 * dx), x1 = dx === 0 ? breite : Math.max(0, 0.52 * dx);
          const y0 = dy === 0 ? -breite : Math.min(0, 0.52 * dy), y1 = dy === 0 ? breite : Math.max(0, 0.52 * dy);
          void px; void py;
          poly(sx, sy, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], farbe);
        }
      }
    };
    asphalt(BR + 0.035, KARTE.bordstein);
    asphalt(BR, KARTE.strasse);
    // 3. Markierungen, Zebrastreifen, Risse
    for (const [sx, sy] of s.strassen) {
      const [cx, cy] = k.mitte(sx, sy);
      if (!sichtbar(cx, cy) || tw < 24) continue;
      const n = arme(sx, sy), waag = strasse(sx + 1, sy) && strasse(sx - 1, sy), senk = strasse(sx, sy + 1) && strasse(sx, sy - 1);
      const gerade = n === 2 && (waag !== senk);
      if (gerade) {
        // gestrichelte Mittellinie, auf jedem zweiten Feld
        if ((sx + sy) % 2 === 0) { const l = 0.22; poly(sx, sy, waag ? [[-l, -0.018], [l, -0.018], [l, 0.018], [-l, 0.018]] : [[-0.018, -l], [0.018, -l], [0.018, l], [-0.018, l]], KARTE.markierung); }
      }
      // Zebrastreifen auf Feldern direkt neben einer Kreuzung/Einmündung
      const naheKreuzung = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => strasse(sx + dx, sy + dy) && arme(sx + dx, sy + dy) >= 3);
      if (gerade && naheKreuzung && hash(sx + 5, sy + 2) > 0.85) {
        for (let i = -2; i <= 2; i++) { const o = i * 0.11; poly(sx, sy, waag ? [[-0.13, o - 0.035], [0.13, o - 0.035], [0.13, o + 0.035], [-0.13, o + 0.035]] : [[o - 0.035, -0.13], [o + 0.035, -0.13], [o + 0.035, 0.13], [o - 0.035, 0.13]], 'rgba(255,255,255,.82)'); }
      }
      // Flicken im Asphalt
      if (hash(sx, sy) > 0.8) { const o = (hash(sy, sx) - 0.5) * 0.3; poly(sx, sy, [[o - 0.07, o * 0.5 - 0.05], [o + 0.07, o * 0.5 - 0.05], [o + 0.07, o * 0.5 + 0.05], [o - 0.07, o * 0.5 + 0.05]], 'rgba(0,0,0,.09)'); }
    }
    // 4. Laternen am Rand, Gullydeckel (feste Verteilung nach Feldposition)
    for (const [sx, sy] of s.strassen) {
      const [cx, cy] = k.mitte(sx, sy);
      if (!sichtbar(cx, cy) || tw < 30) continue;
      const waag = strasse(sx + 1, sy) && strasse(sx - 1, sy), senk = strasse(sx, sy + 1) && strasse(sx, sy - 1);
      if (!(waag !== senk)) continue;
      const seite = hash(sy, sx) > 0.5 ? 1 : -1;
      if ((sx * 3 + sy * 5) % 4 === 0) {
        const [lx, ly] = k.mitte(sx + (waag ? 0 : seite * 0.43), sy + (waag ? seite * 0.43 : 0));
        X.strokeStyle = '#3b3f44'; X.lineWidth = Math.max(1, tw * 0.02); X.beginPath(); X.moveTo(lx, ly); X.lineTo(lx, ly - tw * 0.2); X.stroke();
        m.kreis(lx, ly - tw * 0.21, Math.max(1.5, tw * 0.026), '#ffe9a6');
      } // A66: keine Autos mehr (Simon 2026-11-05)
    }
  }
  // Hausanschlussweg und Garten (A53): Plattenweg vom Haus zur nächsten Straße, abgesetzter Garten mit Zaun
  if (s.strassen?.length) {
    const feld = new Set(s.strassen.map(([sx, sy]) => sy * N + sx));
    for (const o of s.objekte) {
      const kat = KATALOG[o.typ].kategorie;
      if (kat !== 'haus' || o.bau) continue;
      const kk = groesse(o);
      let weg: [number, number, number, number] | null = null;
      for (let i = 0; i < kk && !weg; i++) {
        if (feld.has((o.y - 1) * N + o.x + i)) weg = [o.x + i, o.y, 0, -1];
        else if (feld.has((o.y + kk) * N + o.x + i)) weg = [o.x + i, o.y + kk - 1, 0, 1];
        else if (feld.has((o.y + i) * N + o.x - 1)) weg = [o.x, o.y + i, -1, 0];
        else if (feld.has((o.y + i) * N + o.x + kk)) weg = [o.x + kk - 1, o.y + i, 1, 0];
      }
      const [gcx, gcy] = k.mitte(o.x + (kk - 1) / 2, o.y + (kk - 1) / 2);
      if (gcx < -tw || gcx > W + tw || gcy < -th || gcy > H + tw) continue;
      if (weg) {
        const [wx, wy, dx, dy] = weg, hw = 0.12;
        const pts: Array<[number, number]> = dx === 0
          ? [[-hw, 0], [hw, 0], [hw, 0.55 * dy], [-hw, 0.55 * dy]]
          : [[0, -hw], [0, hw], [0.55 * dx, hw], [0.55 * dx, -hw]];
        X.beginPath(); pts.forEach(([gx, gy], i) => { const [px, py] = k.mitte(wx + gx, wy + gy); if (i) X.lineTo(px, py); else X.moveTo(px, py); }); X.closePath();
        X.fillStyle = KARTE.gehweg; X.fill(); X.strokeStyle = KARTE.bordstein; X.lineWidth = 1; X.stroke();
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
}

/** Ruhezeit nach Zoomen/Drehen, bevor die Bodenebene neu aufgebaut wird (während der Geste wäre jedes Bild ein Neuaufbau). */
const BODEN_RUHE_S = 0.15;
/**
 * Nach einer Fingergeste zusätzlich so viele gezeichnete Bilder ohne Kameraänderung und ohne Finger: ein einzelnes langes Bild
 * (Ruckler) erfüllt die Ruhezeit allein, und der Neuaufbau (2,25-fache Fläche) machte aus einem Ruckler zwei.
 */
const BODEN_RUHE_BILDER = 3;
/** Rand der Bodenebene je Seite als Anteil der Bildgröße: Verschieben bis hierhin kopiert nur (Fläche 1,5² = 2,25-fach). */
const BODEN_RAND_ANTEIL = 0.25;

let bodenEbene: BodenEbene | null = null;
let letzte_tw = NaN;
let letzter_winkel_rad = NaN;
let ruhe_s = Infinity;
/** Ruhige Bilder in Folge (ohne Kameraänderung, ohne Finger auf der Karte). */
let ruhe_bilder = 0;
/** Zoomen/Drehen ist passiert, der Boden wurde seitdem noch nicht neu aufgebaut. */
let ruhe_ausstehend = false;
/** Seit der ausstehenden Kameraänderung lag ein Finger auf der Karte: dann gilt zusätzlich BODEN_RUHE_BILDER. */
let ruhe_nach_geste = false;

/** Zwischenspeicher für den Boden einschalten (Fabrik) oder ausschalten (null, Standard: direkt zeichnen wie bisher). */
export function bodenEbeneEinrichten(fabrik: FlaechenFabrik | null): void {
  bodenEbene?.freigeben();
  bodenEbene = fabrik ? new BodenEbene(fabrik) : null;
  letzte_tw = NaN; letzter_winkel_rad = NaN; ruhe_s = Infinity; // das erste Bild baut sofort auf
  ruhe_bilder = 0; ruhe_ausstehend = false; ruhe_nach_geste = false;
}

/** Fläche freigeben; das nächste Bild malt den Boden neu (Rückkehr in die App, Leinwand-Verlust). */
export function bodenEbeneVerwerfen(): void {
  bodenEbene?.freigeben();
}

/** `finger_auf_karte`: liegt gerade ein Finger (oder die gedrückte Mitteltaste) auf der Karte – liefert die Steuerung. */
export function zeichneSzene(m: Maler, k: Kamera, s: Szene, effekte: Effekte, dt_s: number, finger_auf_karte = false): void {
  const { X } = m;
  m.tw = k.tw; m.th = k.th; m.dreh_cos = Math.cos(k.winkel_rad); m.dreh_sin = Math.sin(k.winkel_rad);
  const tw = k.tw, th = k.th;
  bodenAuflegen(m, k, s, dt_s, finger_auf_karte);
  zeichneGlitzern(m, k, s);

  zeichneLeitungen(m, k, s);
  // NR20 (DESIGN 13.17.1 B2, K10): Band, Streifen, Zielscheibe und Raute über den eingezeichneten Leitungen, unter den Gebäuden –
  // nie in der zwischengespeicherten Bodenebene
  const tutorial = tutorialLage(m, s);
  // A37: Beim Planen zeichnet der zweite Leitungs-Durchgang über den Gebäuden – die Streifen (F3) müssen dann darüber liegen
  const durchsicht = istDurchsichtig(s.modus, s.spiel?.abschnitt?.phase);
  zeichneTutorialUnten(m, k, s, tutorial, !durchsicht);

  // Auswahlring
  const sel = s.auswahl_id != null ? s.objekte.find((o) => o.id === s.auswahl_id) : undefined;
  if (sel && s.modus !== 'verschieben') {
    const kante = groesse(sel), [cx, cy] = k.mitte(sel.x + (kante - 1) / 2, sel.y + (kante - 1) / 2);
    m.raute(cx, cy, kante + 0.12); X.strokeStyle = '#fff'; X.lineWidth = 3; X.setLineDash([7, 5]); X.lineDashOffset = -m.zeit_s * 20; X.stroke(); X.setLineDash([]);
  }

  // Gebäude von hinten nach vorn
  // A37: Beim Planen (Leitungen einzeichnen) werden Gebäude durchsichtig, die Leitungen dahinter bleiben sichtbar.
  // Zeichenreihenfolge von hinten nach vorn in der gedrehten Ansicht (Mittelpunkt, nach Größe gewichtet)
  const tiefe = (o: Objekt): number => { const kk = groesse(o), [rx, ry] = k.dreheFeld(o.x + (kk - 1) / 2, o.y + (kk - 1) / 2); return rx + ry + kk; };
  const sortiert = s.objekte.filter((o) => !istLeitung(o.typ) && !(s.modus === 'verschieben' && o.id === s.verschiebe_id))
    .sort((a, b) => tiefe(a) - tiefe(b) || a.x - b.x);
  const oben: Array<() => void> = [];
  const erreicht = new Map((s.erreicht ?? []).map((e) => [e.id, e.seit_ms]));
  for (const o of sortiert) {
    const kante = groesse(o), D = KATALOG[o.typ], kat = D.kategorie;
    const [cx, cy] = k.mitte(o.x + (kante - 1) / 2, o.y + (kante - 1) / 2);
    const angeschlossen = s.netz.anschluss.has(o.id);
    const st = {
      warm: s.netz.warm.has(o.id), laeuft: s.netz.genutzt_kw > 0, innen: s.innen,
      oel: (kat === 'haus' && (!angeschlossen || !!o.gekuendigt)) || (kat === 'gross' && o.zustand !== 'vertrag' && o.typ !== 'gewerbe'),
    };
    const durch = durchsicht && kat !== 'dorf';
    if (o.interessent && !angeschlossen && !o.bau) {
      // A50: Interessent leuchtet gelb
      const puls = 0.5 + 0.5 * Math.sin(m.zeit_s * 3 + o.id);
      m.raute(cx, cy, kante + 0.5 + puls * 0.15); X.fillStyle = `rgba(255,214,64,${0.28 + puls * 0.22})`; X.fill();
      X.strokeStyle = 'rgba(255,196,0,.85)'; X.lineWidth = Math.max(1.5, tw * 0.03); X.stroke();
    }
    if (durch) X.globalAlpha = 0.5;
    zeichneObjekt(m, o, cx, cy, st, s.jetzt_ms);
    if (durch) X.globalAlpha = 1;
    const topY = cy - tw * (kante >= 2 ? (o.typ === 'klinik' ? 1.15 : 0.95) : 0.72);
    if (o.bau) {
      const hp = tw * 0.55 * kante, bau = o.bau;
      zeichneGeruest(m, cx, cy, kante * 0.8, hp);
      oben.push(() => zeichneBalken(m, cx, cy - hp - tw * 0.15, bau, s.jetzt_ms));
    } else if (erreicht.has(o.id)) {
      // NR13: „Erreicht“-Zeichen statt der Kunden-Blase; Federn nach der Uhr, bei „Weniger Bewegung“ ohne
      const seit_ms = erreicht.get(o.id)!;
      const federn = m.reduziert ? 0 : Math.max(0, 1 - (s.jetzt_ms - seit_ms) / FEDERN_MS);
      oben.push(() => zeichneBlase(m, cx, topY, 'erreicht', federn));
    } else if (s.ziel?.stecker.includes(o.id)) {
      // NR20 B4: Ziel-Stecker auf dem Platz des „Erreicht“-Zeichens; F2: blass, damit die Zielscheibe im Band das hellste Ziel ist
      const blass = !!s.stecker_blass || !!s.stecker_blass_ids?.includes(o.id);
      oben.push(() => {
        if (blass) X.globalAlpha = FAKTOR.geist_ruhend;
        zeichneBlase(m, cx, topY, 'ziel');
        if (blass) X.globalAlpha = 1;
      });
    } else if (s.spiel && !s.ruhe) {
      // NR20 B1: In Kapitel 3 ruhen die übrigen Kunden-Blasen
      const b = blase(s.spiel, s.netz, o, st.warm, angeschlossen);
      if (b) oben.push(() => zeichneBlase(m, cx, topY, b));
    }
    // A25: Verbrauch jedes Kunden als kleines Schild am Fuß des Gebäudes
    const DK = KATALOG[o.typ];
    const planung = s.modus === 'stempel' || s.spiel?.abschnitt?.phase === 'offen';
    const relevant = (planung || s.netz.anschluss.has(o.id) && !o.ohne_station || !!o.interessent) && !s.ruhe;
    if (kwSchildZeigen(o, DK.kategorie, DK.bedarf_kw, tw, s.kw_anzeigen, relevant)) {
      // Designer A66: helles, kleines Schild an der vorderen Ecke, Punkt zeigt den Zustand (warm / kalt / nicht angeschlossen)
      const txt = `${Math.round(bedarfKw(o))} kW`, fx = cx + tw * 0.18 * kante, fy = cy + tw * 0.2 * kante;
      const punkt = s.netz.warm.has(o.id) ? '#ffc65c' : s.netz.anschluss.has(o.id) && !o.ohne_station ? '#4a86c5' : '#a7afb4';
      oben.push(() => {
        const g = DK.kategorie === 'gross' ? 12 : 11;
        X.font = `700 ${g}px "Manrope",system-ui,sans-serif`;
        const w = X.measureText(txt).width + g * 1.6, hgt = g * 1.5;
        X.fillStyle = 'rgba(251,250,247,.92)'; X.strokeStyle = 'rgba(31,42,46,.12)'; X.lineWidth = 1;
        m.rundRechteck(fx - w / 2, fy - hgt / 2, w, hgt, 6); X.fill(); X.stroke();
        X.beginPath(); X.arc(fx - w / 2 + g * 0.65, fy, 3, 0, Math.PI * 2); X.fillStyle = punkt; X.fill();
        X.fillStyle = '#1f2a2e'; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(txt, fx + g * 0.35, fy + 0.5); X.textBaseline = 'alphabetic';
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
  // 13.17.9 F5: Band und Raute am Feld neben der Heizzentrale liegen über ihr (und über dem zweiten Leitungs-Durchgang)
  if (durchsicht && tutorial.fremd.length) zeichneFremd(m, k, s, tutorial.fremd, tutorial.deckkraft);
  zeichneTutorialOben(m, k, tutorial);
  oben.forEach((f) => f());
  // 13.17.9 F1: Zielscheibe als oberste Kartenebene über Gebäuden, Blasen und Ziel-Steckern
  if (s.zielscheibe) { const [x, y] = k.mitte(s.zielscheibe[0], s.zielscheibe[1]); zielscheibeImBand(m, x, y); }
  effekte.zeichnen(m, dt_s, (x, y) => k.mitte(x, y));
}

const MF = tokens.menue.farbe, MM = tokens.menue.mass_px, FAKTOR = tokens.menue.faktor, FREMD = tokens.karte.fremd;
const feldText = ([x, y]: Feld): string => `${x},${y}`;

/** Rohrbreite einer Leitung in px – dieselbe Formel für das Rohr und die Hülle der Streifen. */
const rohrBreite = (tw: number, typ: TypId): number => Math.max(2, tw * (KATALOG[typ].breite ?? 0.1));

/** WCAG-Kontrast von Weiß auf einer Farbe `#rrggbb` (DESIGN 13.17.1 B2: weiße Pfeile ab 3:1). */
function kontrastZuWeiss(hex: string): number {
  const kanal = (i: number): number => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 1.05 / (0.2126 * kanal(1) + 0.7152 * kanal(3) + 0.0722 * kanal(5) + 0.05);
}
/** Mindestkontrast für Grafik (WCAG 1.4.11), ab dem der Pfeil weiß ist (DESIGN 13.17.1 B2). */
const PFEIL_WEISS_AB = 3;

const WEISS = '#ffffff';
/** Farbe der Pfeilspitze auf einer Bandfarbe: weiß ab PFEIL_WEISS_AB, sonst `kontur` (B2). */
export const pfeilFarbe = (farbe: string): string => (kontrastZuWeiss(farbe) >= PFEIL_WEISS_AB ? WEISS : MF.kontur);

/** Bandfarbe = dieselbe Farbe wie Rohr und Farbknopf (B2). */
const bandFarbe = (typ: TypId): string => KATALOG[typ].farbe ?? MF.kontur;

/** Bandbreite b = max(geist_band_min, round(Feldbreite × geist_band_faktor)) (DESIGN 13.17.1 B2). */
const bandBreite = (tw: number): number => Math.max(MM.geist_band_min, Math.round(tw * MM.geist_band_faktor));

/** Band und Raute eines Bilds, aufgeteilt auf die Ebene unter den Gebäuden und die über der Heizzentrale (13.17.9 F5). */
interface TutorialLage {
  fremd: ReadonlyArray<Feld>;
  /** Bandfelder ohne die gestreiften */
  band: TutorialBandFeld[];
  unten: TutorialBandFeld[];
  oben: TutorialBandFeld[];
  /** Feld der leuchtenden Raute (nicht auf gestreiften Feldern) */
  raute: Feld | null;
  raute_oben: boolean;
  /** Deckkraft der Streifen beim Einblenden (1 bei Weniger Bewegung) */
  deckkraft: number;
}

/**
 * Über der Heizzentrale liegen nur Spurfelder, die an ihre Grundfläche grenzen (heute (10|11)). Damit sich die Deckkraft an
 * den Stößen nicht verdoppelt (B2: ein Pfad je Farbe und Zustand), wandert die ganze Bandgruppe eines solchen Felds mit.
 */
function tutorialLage(m: Maler, s: Szene): TutorialLage {
  const fremd = s.tutorial_fremd ?? [];
  // Auch bei Weniger Bewegung merken, sonst hielte der Takt die Felder für ungezeichnet und bliebe flüssig
  const eingeblendet = fremdEinblendungMerken(fremd, s.jetzt_ms);
  const gestreift = new Set(fremd.map(feldText));
  const band = (s.tutorial_band ?? []).filter((f) => !gestreift.has(feldText([f.x, f.y])));
  const hz = band.length || s.naechstes_feld ? heizzentrale(s.objekte) : undefined;
  const anHz = ([x, y]: Feld): boolean => {
    if (!hz) return false;
    const g = groesse(hz);
    return NACHBARN.some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= hz.x && nx < hz.x + g && ny >= hz.y && ny < hz.y + g; });
  };
  const gruppe = (f: TutorialBandFeld): string => `${f.typ},${f.aktiv}`;
  const obenGruppen = new Set(band.filter((f) => anHz([f.x, f.y])).map(gruppe));
  const raute = s.naechstes_feld && !gestreift.has(feldText(s.naechstes_feld)) ? s.naechstes_feld : null;
  return {
    fremd, band, raute, raute_oben: !!raute && anHz(raute), deckkraft: m.reduziert ? 1 : eingeblendet,
    unten: band.filter((f) => !obenGruppen.has(gruppe(f))), oben: band.filter((f) => obenGruppen.has(gruppe(f))),
  };
}

/** Bandfeld auf dem Feld der Raute: Es wird voll deckend gezeichnet (13.17.10 G4). */
const rautenFeld = (t: TutorialLage): TutorialBandFeld | null =>
  (t.raute && t.band.find((f) => f.x === t.raute![0] && f.y === t.raute![1])) || null;
/** Bandfeld mit Pfeil auf der Raute: Sein Pfeil liegt unter dem Rand der Raute (13.17.9 F5). */
const rautenPfeil = (t: TutorialLage): TutorialBandFeld | null => {
  const f = rautenFeld(t);
  return f && f.aktiv && f.pfeil ? f : null;
};

/** NR20/NR21 (DESIGN 13.17.1 B2–B4, 13.17.8, 13.17.9): eine Ebene über den eingezeichneten Leitungen. Reihenfolge: Ring, Band,
 *  Streifen (ohne Planen), Raute. Die Zielscheibe liegt seit F1 ganz oben (zeichneSzene). */
function zeichneTutorialUnten(m: Maler, k: Kamera, s: Szene, t: TutorialLage, mitStreifen: boolean): void {
  // F6: Ring unter Band und Raute – die Raute liegt oben, wo sich beide berühren
  const ringHaus = s.ziel?.ring != null ? s.objekte.find((o) => o.id === s.ziel!.ring) : undefined;
  if (ringHaus) { const g = groesse(ringHaus), [cx, cy] = k.mitte(ringHaus.x + (g - 1) / 2, ringHaus.y + (g - 1) / 2); zielRing(m, cx, cy, g); }
  const pfeilRaute = rautenPfeil(t);
  if (t.unten.length) zeichneBand(m, k, t.unten, rautenFeld(t), pfeilRaute);
  if (mitStreifen && t.fremd.length) zeichneFremd(m, k, s, t.fremd, t.deckkraft);
  if (t.raute && !t.raute_oben) leuchtendeRaute(m, k, t.raute, pfeilRaute);
}

/** 13.17.9 F5, 13.17.10 G4: Band dieses Felds → Pfeil → Raute-Rand, über der Heizzentrale. */
function zeichneTutorialOben(m: Maler, k: Kamera, t: TutorialLage): void {
  const pfeilRaute = rautenPfeil(t);
  if (t.oben.length) zeichneBand(m, k, t.oben, rautenFeld(t), pfeilRaute);
  if (t.raute && t.raute_oben) leuchtendeRaute(m, k, t.raute, pfeilRaute);
}

/**
 * Weg des Bands durch ein Feld (B2): vom Eingang über die Mitte zum Ausgang (halber Schritt in `pfeil`). Der Eingang liegt auf
 * der Kante zum festen Vorgänger in der Spur (bandVorgaenger: Heizzentrale für das erste Feld der Hauptleitung, Abzweig für
 * beide Hausanschlüsse), auch wenn dort schon eine Leitung liegt. Nur ein Feld außerhalb der Spur hat keinen Vorgänger; dann
 * kommt der Weg gegen den eigenen Pfeil. Ohne Pfeil (Abzweig) endet der Weg in der Mitte.
 */
function bandWeg(k: Kamera, f: TutorialBandFeld): Punkt[] {
  const vor = bandVorgaenger(f.x, f.y);
  const p: Punkt[] = [];
  if (vor) p.push(k.mitte((f.x + vor[0]) / 2, (f.y + vor[1]) / 2));
  else if (f.pfeil) p.push(k.mitte(f.x - f.pfeil[0] / 2, f.y - f.pfeil[1] / 2));
  p.push(k.mitte(f.x, f.y));
  if (f.pfeil) p.push(k.mitte(f.x + f.pfeil[0] / 2, f.y + f.pfeil[1] / 2));
  if (p.length === 1) p.push(p[0]); // einzelnes Feld ohne Richtung: runder Punkt
  return p;
}

/**
 * Geisterleitung (B2): je Feld der Weg aus bandWeg. Alle Felder gleicher Farbe und gleichen Zustands liegen in einem Pfad,
 * damit sich die Deckkraft an den Stößen nicht verdoppelt. Das Feld der Raute bekommt darüber seine Füllung noch einmal voll
 * deckend (13.17.10 G4), der Doppelrand darunter bleibt.
 */
function zeichneBand(m: Maler, k: Kamera, band: ReadonlyArray<TutorialBandFeld>, aufRaute: TutorialBandFeld | null, pfeilInRaute: TutorialBandFeld | null): void {
  const { X } = m, b = bandBreite(k.tw), rand_hell = MM.geist_rand_hell, rand_dunkel = MM.geist_rand_dunkel;
  const fuellBreite = b - 2 * rand_dunkel - 2 * rand_hell;
  const gruppen = new Map<string, TutorialBandFeld[]>();
  for (const f of band) { const g = `${f.typ},${f.aktiv}`; gruppen.set(g, [...(gruppen.get(g) ?? []), f]); }
  X.save(); X.lineCap = 'round'; X.lineJoin = 'round';
  for (const felder of gruppen.values()) {
    const { typ, aktiv } = felder[0], farbe = bandFarbe(typ);
    const wege = felder.map((f) => bandWeg(k, f));
    const ruhend = aktiv ? 1 : FAKTOR.geist_ruhend;
    const strich = (p: Punkt[]): void => p.forEach(([px, py], i) => (i ? X.lineTo(px, py) : X.moveTo(px, py)));
    for (const [farbeStrich, breite, alpha] of [
      [MF.kontur, b, 0.8], [MF.tafel, b - 2 * rand_dunkel, 1], [farbe, fuellBreite, FAKTOR.geist_deckkraft],
    ] as const) {
      X.globalAlpha = alpha * ruhend; X.strokeStyle = farbeStrich; X.lineWidth = breite; X.beginPath();
      for (const p of wege) strich(p);
      X.stroke();
    }
    if (aufRaute && felder.includes(aufRaute)) {
      // Gerade Enden an den Feldkanten: Runde Enden ragten voll deckend in die Nachbarfelder mit 0,75
      X.globalAlpha = FAKTOR.geist_deckkraft_raute * ruhend; X.strokeStyle = farbe; X.lineWidth = fuellBreite; X.lineCap = 'butt';
      X.beginPath(); strich(bandWeg(k, aufRaute)); X.stroke();
      X.lineCap = 'round';
    }
    X.globalAlpha = 1;
    if (aktiv) for (const f of felder) if (f.pfeil && f !== pfeilInRaute) pfeilSpitze(m, k, f, b, farbe);
    for (const f of felder) if (f.falsch) {
      // 12.22: gestrichelte Raute in der Zielfarbe, Deckkraft 0,8
      const [cx, cy] = k.mitte(f.x, f.y);
      X.globalAlpha = 0.8; X.setLineDash([k.tw * 0.08, k.tw * 0.06]); X.strokeStyle = farbe; X.lineWidth = 2;
      m.raute(cx, cy, FAKTOR.naechstes_feld); X.stroke(); X.setLineDash([]); X.globalAlpha = 1;
    }
  }
  X.restore();
}

/** Halbe Länge des Pfeils in Vielfachen seiner halben Breite (die Breite b × 0,6 bleibt, B2). Bei 1,8 liegt die Spitze
 *  1,54-mal so weit vom Schwerpunkt wie die hinteren Ecken (4·1,8/3 zu √((2·1,8/3)² + 1)); 13.17.10 G7 verlangt ≥ 1,25. Bei 1
 *  (1,11) und noch bei 1,3 (1,31) las man im Browserfoto eine hintere Ecke als Spitze: Rand und Kantenglättung runden die
 *  spitze Ecke bei rund 9 px Breite stärker ab als die stumpfen. */
const PFEIL_LAENGE = 1.8;

/** Pfeilspitze in der Bandmitte, Breite b × 0,6, zeigt auf dem Bildschirm zur Mitte des nächsten Felds (B2, 13.17.10 G7) –
 *  die Richtung kommt aus den Bildschirmpunkten, gilt also auch bei gedrehter Karte. Weiß mit Kontur oder in `kontur` mit
 *  Rand `tafel` (13.17.9 F5: der dunkle Pfeil hebt sich so vom Grün der 32er ab). Der Umriss beginnt mit der Spitze. */
function pfeilSpitze(m: Maler, k: Kamera, f: TutorialBandFeld, b: number, farbe: string): void {
  const { X } = m, pfeil = f.pfeil!;
  const [ax, ay] = k.mitte(f.x, f.y), [bx, by] = k.mitte(f.x + pfeil[0], f.y + pfeil[1]);
  const l = Math.hypot(bx - ax, by - ay);
  if (l === 0) return;
  const ux = (bx - ax) / l, uy = (by - ay) / l, h = (b * 0.6) / 2, lh = h * PFEIL_LAENGE;
  const fuellung = pfeilFarbe(farbe), weiss = fuellung === WEISS;
  X.fillStyle = fuellung;
  X.beginPath();
  X.moveTo(ax + ux * lh, ay + uy * lh);
  X.lineTo(ax - ux * lh - uy * h, ay - uy * lh + ux * h);
  X.lineTo(ax - ux * lh + uy * h, ay - uy * lh - ux * h);
  X.closePath();
  // Rand `tafel` doppelt breit vor der Füllung: die Füllung deckt die innere Hälfte, außen bleibt 1,5 px
  if (!weiss) { X.strokeStyle = MF.tafel; X.lineWidth = 2 * MM.geist_rand_dunkel; X.stroke(); }
  X.fill();
  if (weiss) { X.strokeStyle = MF.kontur; X.lineWidth = MM.geist_rand_dunkel; X.stroke(); }
}

/** Leuchtende Raute auf dem nächsten Feld (B3, 13.17.10 G4): Raute × 0,92, Füllung `ziel` mit `naechstes_feld_deckkraft`
 *  (heute 0: keine Füllung, das Gelb wusch das Grün der 32er aus), 3 px `ziel`, außen 2 px `kontur`.
 *  13.17.9 F5: Der Pfeil des Bandfelds liegt unter dem Rand. */
function leuchtendeRaute(m: Maler, k: Kamera, f: Feld, pfeil: TutorialBandFeld | null): void {
  const { X } = m, [cx, cy] = k.mitte(f[0], f[1]);
  m.raute(cx, cy, FAKTOR.naechstes_feld);
  X.globalAlpha = FAKTOR.naechstes_feld_deckkraft; X.fillStyle = MF.ziel; X.fill(); X.globalAlpha = 1;
  if (pfeil) {
    pfeilSpitze(m, k, pfeil, bandBreite(k.tw), bandFarbe(pfeil.typ));
    m.raute(cx, cy, FAKTOR.naechstes_feld);
  }
  X.strokeStyle = MF.kontur; X.lineWidth = MM.spot_ring + 2 * MM.spot_ring_kontur; X.stroke();
  X.strokeStyle = MF.ziel; X.lineWidth = MM.spot_ring; X.stroke();
}

/**
 * Zielscheibe im Band (13.17.9 F1): Durchmesser max(18, round(Feldbreite × 0,32)), Scheibe `spot_ring` mit 2 px `kontur`, darin
 * Ring (2 px) und Punkt Ø 4 px in `kontur`. Davor ein ruhiger Schein bis halber Durchmesser + 10 px, von `spot_schein` nach 0.
 */
function zielscheibeImBand(m: Maler, x: number, y: number): void {
  const { X } = m, r = Math.max(MM.zielscheibe_min, Math.round(m.tw * FAKTOR.zielscheibe)) / 2, schein = r + MM.zielscheibe_schein;
  const verlauf = X.createRadialGradient(x, y, r, x, y, schein);
  verlauf.addColorStop(0, MF.spot_schein); verlauf.addColorStop(1, MF.spot_schein.replace(/[\d.]+\)$/, '0)'));
  m.kreis(x, y, schein, verlauf);
  m.kreis(x, y, r, MF.spot_ring);
  X.strokeStyle = MF.kontur; X.lineWidth = MM.kontur_fein; X.stroke();
  X.beginPath(); X.arc(x, y, r * 0.55, 0, Math.PI * 2); X.stroke();
  m.kreis(x, y, MM.zielscheibe_punkt / 2, MF.kontur);
}

/** Ring um das aktive Ziel-Haus (B4, 13.17.9 F6): Ellipse durch die Ecken der Grundfläche + `ziel_ring_abstand`, 16 px Schein,
 *  2 px `kontur`, 3 px `ziel` – eng am Haus, damit er die Raute daneben nicht überdeckt. */
function zielRing(m: Maler, cx: number, cy: number, kante: number): void {
  const { X } = m, rx = m.tw * kante / 2 + MM.ziel_ring_abstand, ry = m.th * kante / 2 + MM.ziel_ring_abstand;
  for (const [farbe, breite] of [
    [MF.spot_schein, MM.spot_schein], [MF.kontur, MM.spot_ring + 2 * MM.spot_ring_kontur], [MF.ziel, MM.spot_ring],
  ] as const) {
    X.strokeStyle = farbe; X.lineWidth = breite; X.beginPath(); X.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); X.stroke();
  }
}

/**
 * Streifen auf dem fremden Stück (DESIGN 13.17.8 Punkt 2, 13.17.9 F3): Hülle Rohrbreite + 12 px entlang der Felder, darin
 * 45°-Streifen dunkel/hell je 5 px mit Deckkraft 0,85, außen 1,5 px `kontur`. `einblendung` 0…1 skaliert die Deckkraft, danach still.
 */
function zeichneFremd(m: Maler, k: Kamera, s: Szene, fremd: ReadonlyArray<Feld>, einblendung: number): void {
  const { X } = m;
  const typen = new Map(s.objekte.filter((o) => istLeitung(o.typ)).map((o) => [feldText([o.x, o.y]), o.typ]));
  const breite = Math.max(...fremd.map((f) => rohrBreite(k.tw, typen.get(feldText(f)) ?? 'd25'))) + FREMD.huelle_zusatz_px;
  const mitten = fremd.map(([x, y]) => k.mitte(x, y));
  const paare: Array<[Punkt, Punkt]> = [];
  fremd.forEach((a, i) => fremd.forEach((c, j) => { if (j > i && Math.abs(a[0] - c[0]) + Math.abs(a[1] - c[1]) === 1) paare.push([mitten[i], mitten[j]]); }));
  const huelle = (w: number): void => {
    X.beginPath();
    for (const [x, y] of mitten) { X.moveTo(x + w / 2, y); X.arc(x, y, w / 2, 0, Math.PI * 2); }
    for (const [[ax, ay], [bx, by]] of paare) {
      const l = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / l * w / 2, ny = (bx - ax) / l * w / 2;
      X.moveTo(ax + nx, ay + ny); X.lineTo(bx + nx, by + ny); X.lineTo(bx - nx, by - ny); X.lineTo(ax - nx, ay - ny); X.closePath();
    }
  };
  X.save();
  X.globalAlpha = FREMD.deckkraft * einblendung;
  huelle(breite + 2 * FREMD.rand_px); X.fillStyle = FREMD.dunkel; X.fill();
  huelle(breite); X.clip();
  X.fillStyle = FREMD.hell; X.fill();
  const xs = mitten.map((p) => p[0]), ys = mitten.map((p) => p[1]);
  const x0 = Math.min(...xs) - breite, x1 = Math.max(...xs) + breite, y0 = Math.min(...ys) - breite, y1 = Math.max(...ys) + breite;
  const schritt = 2 * FREMD.streifen_px / Math.sin(FREMD.winkel_grad * Math.PI / 180);
  X.strokeStyle = FREMD.dunkel; X.lineWidth = FREMD.streifen_px; X.beginPath();
  for (let d = x0 - (y1 - y0); d <= x1; d += schritt) { X.moveTo(d, y1); X.lineTo(d + (y1 - y0), y0); }
  X.stroke();
  X.restore();
}

/** A37: Beim Planen sind Gebäude durchsichtig, damit nichts dahinter verschwindet. */
export function istDurchsichtig(modus: string, abschnittPhase?: string): boolean {
  return modus === 'stempel' || modus === 'platzieren' || abschnittPhase === 'offen';
}

function zeichneLeitungen(m: Maler, k: Kamera, s: Szene): void {
  const { X } = m, tw = k.tw, netz = s.netz;
  const nachFeld = new Map<number, Objekt>();
  for (const o of s.objekte) { const kante = groesse(o); for (let dy = 0; dy < kante; dy++) for (let dx = 0; dx < kante; dx++) nachFeld.set((o.y + dy) * N + o.x + dx, o); }
  const rohrNachbarn = (x: number, y: number): number => leitungsNachbarn(x, y, (f) => { const n = nachFeld.get(f); return !!n && istLeitung(n.typ); });
  const stummel: Array<{ von: Punkt; bis: Punkt; typ: TypId; an: boolean }> = [];
  // dünne Leitungen zuerst, damit die dicke Hauptleitung über dem Anschlusspunkt liegt (A65)
  const rohre = s.objekte.filter((o) => istLeitung(o.typ)).sort((a, b) => (KATALOG[a.typ].kapazitaet_kw as number) - (KATALOG[b.typ].kapazitaet_kw as number));
  /** Gestrichelte blaue Raute: Kennzeichen „geplant, noch nicht gebaut“ (geplante Leitung und geplanter Ersatz). */
  const planRaute = (cx: number, cy: number, farbe = '#2a6fb0'): void => {
    X.setLineDash([tw * 0.08, tw * 0.06]); X.strokeStyle = farbe; X.lineWidth = 1.5; m.raute(cx, cy, 0.6); X.stroke(); X.setLineDash([]);
  };
  for (const o of rohre) {
    const key = o.y * N + o.x, [cx, cy] = k.mitte(o.x, o.y), an = netz.tiefe.has(key), seg: Punkt[] = [];
    for (const [dx, dy] of NACHBARN) {
      const nx = o.x + dx, ny = o.y + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const n = nachFeld.get(ny * N + nx);
      if (!n) continue;
      const c = KATALOG[n.typ].kategorie;
      // A57: Zu einem Gebäude nur abknicken, wenn genau dieses Leitungsfeld sein Anschluss ist (oder ein geplantes Leitungsende)
      const gebaeude = c === 'haus' || c === 'waerme' || c === 'gross';
      if (gebaeude) {
        if (n.ohne_station && !o.geplant) continue; // Haus ohne Station ist nicht angeschlossen
        const a = netz.anschluss.get(n.id);
        if (a ? a.feld !== key : !(o.geplant && rohrNachbarn(o.x, o.y) <= 1)) continue;
      }
      // A65: Treffen zwei verschieden dicke Leitungen, läuft die dünnere in ihrer Farbe bis in die dickere hinein
      // (Abzweig schließt an die Hauptleitung an); die dicke Leitung zeichnet keinen eigenen Stummel zum Abzweig.
      if (istLeitung(n.typ)) {
        const art = abzweigZeichnen(o.typ, n.typ);
        if (art === 'nichts') continue;
        const [a, b] = k.mitte(nx, ny);
        seg.push(art === 'bis_mitte_nachbar' ? [a, b] : [(cx + a) / 2, (cy + b) / 2]);
        continue;
      }
      if (n.typ === 'hz') { const [a, b] = k.mitte(nx, ny); seg.push([(cx + a) / 2, (cy + b) / 2]); }
      else if (gebaeude) {
        // A65: Liegt das Haus direkt an einer dicken Leitung, führt ein eigener, dünner Hausanschluss
        // (kleinste passende Leitung) vom Haus bis an die Hauptleitung – kein Stummel in der Farbe der Hauptleitung.
        const [a, b] = k.mitte(nx, ny), mx = (cx + a) / 2, my = (cy + b) / 2;
        const eigen = KATALOG[n.typ].kategorie !== 'waerme' ? eigenerHausanschluss(o.typ, bedarfKw(n)) : null;
        if (eigen) stummel.push({ von: [cx, cy], bis: [mx, my], typ: eigen, an });
        else seg.push([mx, my]);
      }
    }
    const plan = !!o.geplant;
    if (plan) { X.save(); X.globalAlpha = 0.6; }
    const D = KATALOG[o.typ], w = rohrBreite(tw, o.typ), ueber = an && netz.kapazitaet_ok.get(key) === false;
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
    // A69: T-Stück mit Vorsehung: kurzer Abgang quer zur Leitung mit dunkler Verschlusskappe
    if (o.vorsehung) {
      const quer = NACHBARN.filter(([dx, dy]) => { const n = nachFeld.get((o.y + dy) * N + o.x + dx); return !(n && istLeitung(n.typ)); });
      const lauf = NACHBARN.filter(([dx, dy]) => { const n = nachFeld.get((o.y + dy) * N + o.x + dx); return !!n && istLeitung(n.typ); });
      // A74: An einer Ecke zeigt der Abgang geradeaus (Fortsetzung der Zuleitung), sonst quer zur Leitung, bevorzugt zu einem freien Feld
      const p = netz.eltern.get(key), px = p !== undefined && p >= 0 ? p % N - o.x : null, py = p !== undefined && p >= 0 ? Math.floor(p / N) - o.y : null;
      const geradeaus = quer.filter(([dx, dy]) => px === null ? lauf.some(([lx, ly]) => lx === -dx && ly === -dy) : px === -dx && py === -dy);
      const senkrecht = quer.filter(([dx, dy]) => lauf.every(([lx, ly]) => lx * dx + ly * dy === 0));
      const frei = (r: readonly [number, number]): boolean => !nachFeld.has((o.y + r[1]) * N + o.x + r[0]);
      const [rx, ry] = geradeaus[0] ?? senkrecht.find(frei) ?? senkrecht[0] ?? quer[0] ?? [0, 1];
      const [ax, ay] = k.mitte(o.x + rx, o.y + ry), ex = cx + (ax - cx) * 0.32, ey = cy + (ay - cy) * 0.32;
      for (const [lw, c] of [[w + 2, 'rgba(40,34,26,.4)'], [w, rohr]] as const) { X.strokeStyle = c; X.lineWidth = lw; X.beginPath(); X.moveTo(cx, cy); X.lineTo(ex, ey); X.stroke(); }
      X.beginPath(); X.arc(ex, ey, Math.max(2.5, w * 0.75), 0, Math.PI * 2); X.fillStyle = '#2d2a26'; X.fill();
      X.strokeStyle = 'rgba(255,255,255,.7)'; X.lineWidth = 1; X.stroke();
    }
    if (netz.engpass.has(key) || netz.reduzierung.has(key) || netz.aufteilung.has(key)) {
      m.bahn([[cx, cy - tw * 0.32], [cx + tw * 0.13, cy - tw * 0.07], [cx - tw * 0.13, cy - tw * 0.07]]);
      X.fillStyle = '#d8392f'; X.strokeStyle = 'rgba(32,28,22,.5)'; X.lineWidth = 2; X.fill(); X.stroke();
      m.symbol('ausruf', cx, cy - tw * 0.14, tw * 0.07);
    }
    if (plan) {
      planRaute(cx, cy);
      X.restore();
    } else if (o.ersatz) {
      // NR18: Gebaute Leitung mit geplantem Ersatz zeigt eine gestrichelte Planraute; die alte Leitung bleibt bis zum Bauende
      // sichtbar, weil sie bis dahin das Wasser führt. DESIGN 12.22: Raute in der Farbe der neuen Leitung, damit man sieht,
      // welche Dicke kommt, und Ersatz nicht wie eine neu eingezeichnete (blaue) Leitung aussieht.
      X.save(); X.globalAlpha = 0.8; planRaute(cx, cy, KATALOG[o.ersatz.typ].farbe);
      X.restore();
    }
  }
  // A65: eigene dünne Hausanschlüsse von der Hauptleitung bis ans Haus (beginnen am Rand der Hauptleitung)
  X.lineCap = 'round';
  for (const st of stummel) {
    const D = KATALOG[st.typ], w = Math.max(2, tw * (D.breite ?? 0.06));
    const v: Punkt = [st.von[0] + (st.bis[0] - st.von[0]) * 0.3, st.von[1] + (st.bis[1] - st.von[1]) * 0.3];
    for (const [lw, c] of [[w + 2, 'rgba(40,34,26,.4)'], [w, st.an ? (D.farbe ?? '#d8392f') : '#9aa4ab']] as const) {
      X.strokeStyle = c; X.lineWidth = lw; X.beginPath(); X.moveTo(v[0], v[1]); X.lineTo(st.bis[0], st.bis[1]); X.stroke();
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

/**
 * Boden direkt oder über die Bodenebene. Nach Zoomen/Drehen direkt, bis echte Ruhe herrscht (sonst wäre jedes Bild ein Neuaufbau):
 * kein Finger auf der Karte, ≥ BODEN_RUHE_S ohne Kameraänderung und – nach einer Fingergeste – ≥ BODEN_RUHE_BILDER ruhige Bilder.
 * Ohne Geste (Mausrad, Tasten) genügt die Ruhezeit. Das Sicherheitsbild des Takts liefert die Bilder auch ohne Animation.
 */
function bodenAuflegen(m: Maler, k: Kamera, s: Szene, dt_s: number, finger_auf_karte: boolean): void {
  const ebene = bodenEbene, pv = k.pixelverhaeltnis;
  if (!ebene) { zeichneBoden(m, k, s); return; }
  if (k.tw !== letzte_tw || k.winkel_rad !== letzter_winkel_rad) {
    if (!Number.isNaN(letzte_tw)) { ruhe_s = 0; ruhe_bilder = 0; ruhe_ausstehend = true; }
    letzte_tw = k.tw; letzter_winkel_rad = k.winkel_rad;
  } else {
    ruhe_s += dt_s;
    ruhe_bilder = finger_auf_karte ? 0 : ruhe_bilder + 1;
  }
  if (ruhe_ausstehend) {
    if (finger_auf_karte) ruhe_nach_geste = true;
    // „Kein Finger auf der Karte“ steckt im Bildzähler: ein Finger setzt ihn auf 0 und markiert die Geste.
    const ruhig = ruhe_s >= BODEN_RUHE_S && (!ruhe_nach_geste || ruhe_bilder >= BODEN_RUHE_BILDER);
    if (ruhig) { ruhe_ausstehend = false; ruhe_nach_geste = false; }
  }
  const breite_px = k.breite * pv, hoehe_px = k.hoehe * pv;
  if (ruhe_ausstehend || breite_px <= 0 || hoehe_px <= 0) { zeichneBoden(m, k, s); return; }
  const schiebe_x_px = k.schiebe_x * pv, schiebe_y_px = k.schiebe_y * pv, schluessel = bodenSchluessel(s, k);
  if (ebene.braucht(schluessel, schiebe_x_px, schiebe_y_px)) {
    const rand_x_px = Math.round(BODEN_RAND_ANTEIL * breite_px), rand_y_px = Math.round(BODEN_RAND_ANTEIL * hoehe_px);
    ebene.neu(schluessel, breite_px, hoehe_px, rand_x_px, rand_y_px, schiebe_x_px, schiebe_y_px, (FX) => {
      // Kamera vorübergehend um den Rand vergrößern (Felder direkt, nicht groesseSetzen – das würde tw ändern):
      // der Ursprung rückt genau um den Rand, und die Sichtbarkeitsprüfungen behalten den Randstreifen.
      const X = m.X, breite = k.breite, hoehe = k.hoehe;
      // Erst die ganze Fläche in Gerätepixeln füllen: bei gebrochener CSS-Größe deckt die Hintergrundfläche von zeichneBoden
      // den aufgerundeten letzten Pixelstreifen nur teilweise, er bliebe sonst halb durchsichtig.
      const flaeche = flaechenGroesse(breite_px, hoehe_px, rand_x_px, rand_y_px);
      FX.setTransform(1, 0, 0, 1, 0, 0); FX.fillStyle = KARTE.hintergrund_rand;
      FX.fillRect(0, 0, flaeche.breite_px, flaeche.hoehe_px);
      m.X = FX; k.breite += (2 * rand_x_px) / pv; k.hoehe += (2 * rand_y_px) / pv;
      try { zeichneBoden(m, k, s); } finally { m.X = X; k.breite = breite; k.hoehe = hoehe; }
    });
    if (ebene.braucht(schluessel, schiebe_x_px, schiebe_y_px)) {
      console.warn('Bodenebene: Zeichenfläche ohne 2D-Kontext – die Karte wird ab jetzt direkt gezeichnet');
      bodenEbene = null;
      zeichneBoden(m, k, s);
      return;
    }
  }
  ebene.auflegen(m.X, schiebe_x_px, schiebe_y_px);
  m.X.setTransform(pv, 0, 0, pv, 0, 0);
}

/** Wasserglitzern ändert sich mit der Zeit und liegt deshalb nicht in der Bodenebene; Brückenfelder decken es zu. */
function zeichneGlitzern(m: Maler, k: Kamera, s: Szene): void {
  if (!s.fluss?.length) return;
  const { X } = m, tw = k.tw, th = k.th, W = k.breite, H = k.hoehe;
  const strasse = new Set((s.strassen ?? []).map(([sx, sy]) => sy * N + sx));
  for (const [fx, fy] of s.fluss) {
    if (strasse.has(fy * N + fx)) continue;
    const [cx, cy] = k.mitte(fx, fy);
    if (cx < -tw || cx > W + tw || cy < -th || cy > H + tw) continue;
    const glitzer = Math.sin(m.zeit_s * 1.4 + fx * 1.3 + fy * 0.7);
    if (glitzer > 0.6) { X.strokeStyle = 'rgba(255,255,255,.35)'; X.lineWidth = 1; X.beginPath(); X.moveTo(cx - tw * 0.12, cy); X.lineTo(cx + tw * 0.12, cy); X.stroke(); }
  }
}
