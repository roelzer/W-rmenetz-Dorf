import tokens from '../../design/tokens.json';
import { mod } from '../core/feld';
import { freigeschaltet } from '../core/freischaltung';
import { QUERUNG_X, querungImBau } from '../core/nordviertel';
import type { Spielstand } from '../core/typen';
import { schatten } from './farben';
import { zeichneMonteur } from './gebaeude';
import type { Kamera } from './kamera';
import type { Maler, Punkt } from './maler';

/**
 * NR27 (DESIGN 14.3, 14.8, 14.9): Inszenierung der Bahn. Reine Darstellung, keine Spieldaten.
 * Maße aus DESIGN 14.9 (`karte.bahn`), bis sie in design/tokens.json stehen (14.15 Punkt 21).
 */
export const ZUG_MASS = {
  /** `zug_feld_je_s` */
  feld_je_s: 3,
  /** `zug_pause_s` [90, 150] */
  pause_min_s: 90, pause_max_s: 150,
  /** Gleise laufen von x = −2 bis 25 (DESIGN 14.2 „Enden“) */
  von_x: -2, bis_x: 25,
  /** zwei Wagen je 2 Felder (DESIGN 14.3 „Form“) */
  laenge_felder: 4,
  /** Gleismitten quer zur Bahn: −2,5 ± Gleisabstand/2 (DESIGN 14.2 Querschnitt) */
  gleis1_y: -2.28, gleis2_y: -2.72,
} as const;

/** Farben und Maße aus DESIGN 14.9 (Vorschlag `farbe.bahn`/`karte.bahn`; in design/tokens.json trägt sie 14.15 Punkt 21 ein). */
export const BAHN = {
  schotter: '#8f887d', schotter_kante: '#6f675c', randweg: '#ddd5c4', schwelle: '#cfcac0', schiene: '#333b41',
  schiene_glanz: 'rgba(255,255,255,.55)', zaun: '#55605b', bruecke: '#7d858a',
} as const;
export const BAHN_MASS = { gleisabstand: 0.44, spurweite: 0.144, schwellen_teilung: 0.25, detail_ab_kachelbreite: 32 } as const;

/** Oberleitung (DESIGN 14.2 „Oberleitung“, 14.9 `mast`, `fahrdraht`, `mast_teilung`, `mast_versatz`, `mast_hoehe`, `fahrdraht_hoehe`). */
const MAST = {
  farbe: '#3f4549', draht: 'rgba(47,58,64,.60)',
  teilung: 3, versatz: 2,
  /** Masten auf dem Randweg Nord (Querschnitt 14.2) */
  y: -3.26,
  /** Höhen in Kachelbreiten */
  hoehe: 0.62, draht_hoehe: 0.50,
  /** Ausleger knapp unter der Mastspitze, damit die Spitze als Mast lesbar bleibt (Wert der Grafik, kein Fachwert) */
  ausleger_hoehe: 0.58,
} as const;

type Felder = ReadonlyArray<readonly [number, number]>;

/** Schranke am Straßenende (DESIGN 14.2 „Straßenende“): `bake_rot` = `menue.knopf.gefahr`, dazu Weiß, 0,14 Kachel hoch. */
const SCHRANKE = {
  rot: tokens.menue.knopf.gefahr[0], weiss: '#ffffff', hoehe: 0.14,
  /** am Nordrand des letzten Straßenfelds; Pfosten knapp außerhalb der Fahrbahn (halbe Breite 0,31 in szene.ts) */
  rand_y: -0.42, pfosten_x: 0.36,
} as const;

/**
 * Feste Schranke, wo eine Straße vor der Bahn endet: Nordnachbar ist keine Straße, und ein oder zwei Felder weiter liegen Gleise.
 * Aus den Daten abgeleitet statt (10|0)/(17|0) fest zu schreiben – die Grafik folgt den Zeilen aus nordviertel.ts.
 */
export function zeichneSchranken(m: Maler, k: Kamera, strassen: Felder, bahn: Felder): void {
  const { X } = m, tw = k.tw;
  const strasse = new Set(strassen.map(([x, y]) => `${x},${y}`)), gleis = new Set(bahn.map(([x, y]) => `${x},${y}`));
  for (const [x, y] of strassen) {
    if (strasse.has(`${x},${y - 1}`) || !(gleis.has(`${x},${y - 1}`) || gleis.has(`${x},${y - 2}`))) continue;
    const [cx, cy] = k.mitte(x, y);
    if (cx < -tw || cx > k.breite + tw || cy < -tw || cy > k.hoehe + tw) continue;
    const h = SCHRANKE.hoehe * tw, by = y + SCHRANKE.rand_y;
    const fuss = (dx: number): Punkt => k.mitte(x + dx, by);
    const kopf = (dx: number): Punkt => { const [px, py] = fuss(dx); return [px, py - h]; };
    const l = -SCHRANKE.pfosten_x, r = SCHRANKE.pfosten_x, teil = (f: number): number => l + (r - l) * f;
    X.lineCap = 'butt';
    X.strokeStyle = SCHRANKE.weiss; X.lineWidth = Math.max(2, tw * 0.05); X.beginPath();
    X.moveTo(...kopf(l)); X.lineTo(...kopf(r)); X.stroke();
    // Pfosten und drei rote Felder im Balken (rot-weiß im Wechsel) in einem Strich
    X.strokeStyle = SCHRANKE.rot; X.beginPath();
    for (const dx of [l, r]) { X.moveTo(...fuss(dx)); X.lineTo(...kopf(dx)); }
    for (const [a, b] of [[0, 0.2], [0.4, 0.6], [0.8, 1]]) { X.moveTo(...kopf(teil(a))); X.lineTo(...kopf(teil(b))); }
    X.stroke();
  }
}

/** Dunst über dem Gebiet hinter der Bahn (DESIGN 14.4, 14.9 `nord_dunst`): ab dem Nordzaun, weicher Südrand über 0,3 Feld. */
const DUNST = { farbe: 'rgba(236,242,245,.55)', klar: 'rgba(236,242,245,0)', sued_y: -3.5, rand_felder: 0.3 } as const;

/**
 * Eine Fläche von `west_x` … `ost_x` und vom Nordzaun bis `nord_y`. Der Verlauf läuft senkrecht zur Zaunlinie im Bild
 * (nicht entlang der Feld-y-Achse, die in der Schrägansicht schief zur Linie steht), damit der Rand überall gleich weich ist.
 * `deckkraft` < 1 nur, während sich der Dunst im Erfolgsmoment hebt (DESIGN 14.8).
 */
export function zeichneDunst(m: Maler, k: Kamera, west_x: number, ost_x: number, nord_y: number, deckkraft = 1): void {
  const { X } = m;
  if (deckkraft !== 1) { X.save(); X.globalAlpha = deckkraft; }
  const a = k.mitte(west_x, DUNST.sued_y), b = k.mitte(ost_x, DUNST.sued_y), innen = k.mitte(west_x, DUNST.sued_y - DUNST.rand_felder);
  const lx = b[0] - a[0], ly = b[1] - a[1], laenge = Math.hypot(lx, ly);
  const nx = -ly / laenge, ny = lx / laenge, tiefe = (innen[0] - a[0]) * nx + (innen[1] - a[1]) * ny;
  const g = X.createLinearGradient(a[0], a[1], a[0] + nx * tiefe, a[1] + ny * tiefe);
  g.addColorStop(0, DUNST.klar); g.addColorStop(1, DUNST.farbe);
  m.flaeche([a, b, k.mitte(ost_x, nord_y), k.mitte(west_x, nord_y)], g, false);
  if (deckkraft !== 1) X.restore();
}

/** Liegt ein Feld unter dem Dunst (nördlich der Zaunlinie)? Dort stand vor der Erschließung die Kulisse. */
export function unterDemDunst(y: number): boolean {
  return y < DUNST.sued_y;
}

/** DESIGN 14.9 `gesperrt_schleier`; Rasterstrich wie das Baumodus-Raster in szene.ts (zeichneBoden). */
const SCHLEIER = { farbe: 'rgba(31,42,46,.12)', raster: 'rgba(255,255,255,.25)' } as const;

/** Ab Stufe 6 (Freischaltung „bahnquerung“) bleibt die Querungsstelle frei; ohne Spielstand (Nachbardorf) nie. */
export function querungFrei(stand: Spielstand | undefined): boolean {
  return !!stand && freigeschaltet(stand, 'bahnquerung');
}

/**
 * Leitungsmodus (DESIGN 14.15 Punkt 10): auf jedem Bahnfeld der Schleier, auch auf der Brücke. Ist die Querung frei, bleiben die
 * Felder in der Querungsspalte ohne Schleier und bekommen Rasterlinien wie ein Baufeld – gleiche Lage wie das Raster in zeichneBoden.
 */
export function zeichneSchleier(m: Maler, k: Kamera, bahn: Felder, frei: boolean): void {
  const { X } = m, tw = k.tw, th = k.th;
  const offen: Array<readonly [number, number]> = [];
  for (const f of bahn) {
    if (frei && f[0] === QUERUNG_X) { offen.push(f); continue; }
    const [cx, cy] = k.mitte(f[0], f[1]);
    if (cx < -tw || cx > k.breite + tw || cy < -th || cy > k.hoehe + tw) continue;
    m.raute(cx, cy, 1.02); X.fillStyle = SCHLEIER.farbe; X.fill();
  }
  if (!offen.length) return;
  const ecke = (x: number, y: number): Punkt => { const [px, py] = k.mitte(x, y); return [px, py - th / 2]; };
  X.strokeStyle = SCHLEIER.raster; X.lineWidth = 1; X.beginPath();
  for (const [x, y] of offen) {
    const p = [ecke(x - 0.5, y - 0.5), ecke(x + 0.5, y - 0.5), ecke(x + 0.5, y + 0.5), ecke(x - 0.5, y + 0.5)];
    X.moveTo(...p[0]); for (const q of [p[1], p[2], p[3], p[0]]) X.lineTo(...q);
  }
  X.stroke();
}

/**
 * Querung (DESIGN 14.5 „Zeichnen“/„Fertig“, 14.9): Strichellinie 0,10/0,07 Feld in 60 % der Rohrbreite, Ringe (Ø 0,26) vor den
 * Zäunen bei y = −1,38 und −3,62 – also 0,62 Feld außerhalb der Mitte der äußeren Bahnzeilen. In der Vorschau Ringe mit 50 %.
 */
const QUERUNG = {
  strich: 0.10, luecke: 0.07, breite_anteil: 0.6, ring_abstand: 0.62, ring_radius: 0.13, vorschau_deckkraft: 0.5,
  schutzrohr: '#2f3a40', merkpfahl: '#f4f1ea', kappe: tokens.menue.farbe.naht_vorlauf,
  /** Merkpfahl 0,22 Kachel hoch, neben dem Ring (Abstand und Kappenlänge sind Werte der Grafik) */
  pfahl_hoehe: 0.22, pfahl_versatz: 0.22, kappe_hoehe: 0.05,
  haarlinie: 'rgba(31,42,46,.55)',
} as const;

/**
 * Vorschau-Farbe der Strichellinie: das deckende OK-Grün der Karte (`karte.pfeil_ok`). DESIGN 14.5 nennt `vorschau_ok`; das ist
 * eine Flächenfarbe mit 40 % Deckkraft und war als 1-px-Strich auf dem Schotter kaum zu sehen (Foto P5b3).
 */
export const STRICHEL_VORSCHAU = tokens.farbe.karte.pfeil_ok;

/**
 * Leitung auf einem Bahnfeld: dieselben Arme wie das Rohr (ohne Arm der Punkt), aber gestrichelt und schmaler – auf den Gleisen
 * liegt nie ein normales Rohr (DESIGN 14.5).
 */
export function zeichneStrichellinie(m: Maler, tw: number, mitte: Punkt, arme: readonly Punkt[], farbe: string, rohr_breite: number): void {
  const { X } = m, [cx, cy] = mitte;
  X.setLineDash([QUERUNG.strich * tw, QUERUNG.luecke * tw]); X.lineCap = 'butt';
  X.strokeStyle = farbe; X.lineWidth = rohr_breite * QUERUNG.breite_anteil; X.beginPath();
  for (const [ax, ay] of arme) { X.moveTo(cx, cy); X.lineTo(ax, ay); }
  if (!arme.length) { X.moveTo(cx - 1, cy); X.lineTo(cx + 1, cy); }
  X.stroke(); X.setLineDash([]);
}

/** Feld-y des Rings vor dem Zaun, wenn (y) eine äußere Bahnzeile ist, sonst null. `bahn_zeilen` = alle y der Bahnfelder. */
export function schutzrohrY(y: number, bahn_zeilen: readonly number[]): number | null {
  if (y === Math.max(...bahn_zeilen)) return y + QUERUNG.ring_abstand;
  if (y === Math.min(...bahn_zeilen)) return y - QUERUNG.ring_abstand;
  return null;
}

/** Schutzrohr-Ring (flache Ellipse, innen die Rohrfarbe); fertig zusätzlich der Merkpfahl daneben, sonst halb durchsichtig. */
export function zeichneSchutzrohr(m: Maler, k: Kamera, x: number, y: number, rohr: string, fertig: boolean): void {
  const { X } = m, tw = k.tw, [cx, cy] = k.mitte(x, y);
  X.save(); X.globalAlpha = fertig ? 1 : QUERUNG.vorschau_deckkraft; X.setLineDash([]);
  X.beginPath(); X.ellipse(cx, cy, QUERUNG.ring_radius * tw, QUERUNG.ring_radius * k.th, 0, 0, Math.PI * 2);
  X.fillStyle = rohr; X.fill();
  X.strokeStyle = QUERUNG.schutzrohr; X.lineWidth = Math.max(1.5, tw * 0.03); X.stroke();
  X.restore();
  if (!fertig) return;
  const [px, py] = k.mitte(x + QUERUNG.pfahl_versatz, y), kopf = py - QUERUNG.pfahl_hoehe * tw, b = Math.max(1.5, tw * 0.03);
  X.lineCap = 'butt';
  // Haarlinie wie bei allen Objekten, damit der weiße Pfahl auch auf Schnee lesbar bleibt
  X.strokeStyle = QUERUNG.haarlinie; X.lineWidth = b + 1; X.beginPath(); X.moveTo(px, py); X.lineTo(px, kopf - 0.5); X.stroke();
  X.strokeStyle = QUERUNG.merkpfahl; X.lineWidth = b; X.beginPath(); X.moveTo(px, py); X.lineTo(px, kopf); X.stroke();
  X.strokeStyle = QUERUNG.kappe; X.beginPath(); X.moveTo(px, kopf + QUERUNG.kappe_hoehe * tw); X.lineTo(px, kopf); X.stroke();
}

/** Gleisspalten von Ende zu Ende: x = −2 … 25, beidseits über die Karte hinaus in den Wolkenrand (DESIGN 14.2 „Enden“). */
export function gleisSpalten(): number[] {
  const r: number[] = [];
  for (let x = ZUG_MASS.von_x; x <= ZUG_MASS.bis_x; x++) r.push(x);
  return r;
}

/** Mastspalten: x ≡ 2 (mod 3) über die ganze Strecke, nie auf der Brücke. mod() aus feld.ts, weil x = −1 negativ ist. */
export function mastSpalten(bahn: Felder, fluss: Felder): number[] {
  const bruecken = brueckenSpalten(bahn, fluss);
  return gleisSpalten().filter((x) => mod(x, MAST.teilung) === MAST.versatz && !bruecken.has(x));
}

/** Ein Mast mit seiner Tiefe für die Zeichenreihenfolge der Objekt-Ebene (gleiche Formel wie für Objekte: Mitte + Größe 1). */
export interface Mast {
  x: number; tiefe: number;
  /** Fahrdraht von … bis (Feld-x): vom Mast zum nächsten, beim ersten Mast schon ab dem Gleisanfang */
  draht_von_x: number; draht_bis_x: number;
}

export function mastenNachTiefe(k: Kamera, bahn: Felder, fluss: Felder): Mast[] {
  const xs = mastSpalten(bahn, fluss);
  return xs.map((x, i) => {
    const [rx, ry] = k.dreheFeld(x, MAST.y);
    return { x, tiefe: rx + ry + 1, draht_von_x: i === 0 ? ZUG_MASS.von_x - 0.5 : x, draht_bis_x: xs[i + 1] ?? ZUG_MASS.bis_x + 0.5 };
  }).sort((a, b) => a.tiefe - b.tiefe);
}

/**
 * Mast mit Ausleger über beide Gleise und den Fahrdrähten bis zum nächsten Mast (am Ende bis zum Gleisende).
 * Unter der Detailstufe ohne Ausleger und mit einem Fahrdraht über der Bahnmitte (DESIGN 14.2 Zoomstufen).
 */
export function zeichneMast(m: Maler, k: Kamera, mast: Mast): void {
  const { X } = m, tw = k.tw;
  const oben = (x: number, y: number, h: number): Punkt => { const [px, py] = k.mitte(x, y); return [px, py - h * tw]; };
  const a = oben(mast.draht_von_x, MAST.y, 0), b = oben(mast.draht_bis_x, MAST.y, 0);
  const rand = 2 * tw;
  if (Math.max(a[0], b[0]) < -rand || Math.min(a[0], b[0]) > k.breite + rand || Math.max(a[1], b[1]) < -rand || Math.min(a[1], b[1]) > k.hoehe + rand) return;
  const details = tw >= BAHN_MASS.detail_ab_kachelbreite;
  const gleise = details ? [ZUG_MASS.gleis1_y, ZUG_MASS.gleis2_y] : [(ZUG_MASS.gleis1_y + ZUG_MASS.gleis2_y) / 2];
  X.strokeStyle = MAST.draht; X.lineWidth = Math.max(0.75, tw * 0.012); X.beginPath();
  for (const g of gleise) { X.moveTo(...oben(mast.draht_von_x, g, MAST.draht_hoehe)); X.lineTo(...oben(mast.draht_bis_x, g, MAST.draht_hoehe)); }
  X.stroke();
  X.strokeStyle = MAST.farbe; X.lineWidth = Math.max(1, tw * 0.022); X.beginPath();
  X.moveTo(...oben(mast.x, MAST.y, 0)); X.lineTo(...oben(mast.x, MAST.y, MAST.hoehe));
  if (details) { X.moveTo(...oben(mast.x, MAST.y, MAST.ausleger_hoehe)); X.lineTo(...oben(mast.x, ZUG_MASS.gleis1_y, MAST.ausleger_hoehe)); }
  X.stroke();
}

/** Spalten mit Brückentrog: Der Fluss kreuzt die Bahnzeilen dort, wo ober- und unterhalb der Bahn Wasser liegt. */
export function brueckenSpalten(bahn: Felder, fluss: Felder): Set<number> {
  const zeilen = bahn.map(([, y]) => y), nord = Math.min(...zeilen), sued = Math.max(...zeilen);
  const wasser = new Set(fluss.map(([x, y]) => `${x},${y}`));
  return new Set(bahn.map(([x]) => x).filter((x) => wasser.has(`${x},${nord - 1}`) && wasser.has(`${x},${sued + 1}`)));
}

/** Die Spitze fährt vom westlichen Gleisende bis der letzte Wagen das östliche verlassen hat (oder umgekehrt). */
const FAHRT_FELDER = ZUG_MASS.bis_x - ZUG_MASS.von_x + ZUG_MASS.laenge_felder;
const FAHRT_MS = (FAHRT_FELDER / ZUG_MASS.feld_je_s) * 1000;
/**
 * Fahrplan in festen Takten: Takt n beginnt bei n · TAKT_MS, die Fahrt darin um 0 … SPIEL_MS versetzt.
 * Abstand zweier Fahrten = TAKT_MS − FAHRT_MS + (Versatz danach − Versatz davor) = 120 s ± 30 s, also 90 … 150 s.
 */
const SPIEL_MS = (ZUG_MASS.pause_max_s - ZUG_MASS.pause_min_s) / 2 * 1000;
const TAKT_MS = ((ZUG_MASS.pause_min_s + ZUG_MASS.pause_max_s) / 2) * 1000 + FAHRT_MS;

/** Fester Versatz 0 … 1 je Takt (Ganzzahl-Streuung statt Zufall: gleiche Uhrzeit, gleiche Lage). */
function versatz(n: number): number {
  return (Math.imul(n | 0, 0x9e3779b1) >>> 0) / 0x1_0000_0000;
}

export interface ZugLage {
  /** Gleismitte quer zur Bahn (Feld-y) */
  gleis_y: number;
  /** Feld-x der Zugspitze */
  kopf_x: number;
  /** +1 = nach Osten, −1 = nach Westen */
  richtung: 1 | -1;
}

/**
 * Wo der Zug zur Uhrzeit `jetzt_ms` fährt, oder null. Während eine Querung gebaut wird, startet keiner (Fachprüfer F3);
 * eine Fahrt, die vor Baubeginn losfuhr, endet normal – ein Zug, der mitten im Bild verschwindet, sähe wie ein Fehler aus.
 */
export function zugLage(jetzt_ms: number, stand: Pick<Spielstand, 'abschnitt'> | null): ZugLage | null {
  const n = Math.floor(jetzt_ms / TAKT_MS), start_ms = n * TAKT_MS + versatz(n) * SPIEL_MS;
  const t_ms = jetzt_ms - start_ms;
  if (t_ms < 0 || t_ms >= FAHRT_MS) return null;
  if (stand && querungImBau(stand) && start_ms >= (stand.abschnitt?.bau?.start_ms ?? -Infinity)) return null;
  const weg = (t_ms / 1000) * ZUG_MASS.feld_je_s;
  // Im Wechsel: gerade Takte auf Gleis 2 nach Osten, ungerade auf Gleis 1 nach Westen
  if (n % 2 === 0) return { gleis_y: ZUG_MASS.gleis2_y, kopf_x: ZUG_MASS.von_x + weg, richtung: 1 };
  return { gleis_y: ZUG_MASS.gleis1_y, kopf_x: ZUG_MASS.bis_x - weg, richtung: -1 };
}

/** Ein Wagen in Feld-x, schon auf die Gleislänge gekürzt. `lok` = vorderer Wagen (Stromabnehmer, orangener Streifen). */
export interface ZugTeil { von_x: number; bis_x: number; gleis_y: number; lok: boolean }

/** Gleise enden am Feldrand der Endspalten; was darüber hinausragt, steckt noch im Wolkenrand (DESIGN 14.3 „Fahrt“). */
const GLEIS_WEST_X = ZUG_MASS.von_x - 0.5, GLEIS_OST_X = ZUG_MASS.bis_x + 0.5;
const WAGEN_FELDER = ZUG_MASS.laenge_felder / 2;

/** Lok und Wagen hinter der Spitze (gegen die Fahrtrichtung), je 2 Felder; ganz im Wolkenrand liegende Teile fehlen. */
export function zugTeile(lage: ZugLage): ZugTeil[] {
  const r: ZugTeil[] = [];
  for (const [i, lok] of [[0, true], [1, false]] as const) {
    const a = lage.kopf_x - lage.richtung * i * WAGEN_FELDER, b = a - lage.richtung * WAGEN_FELDER;
    const von_x = Math.max(Math.min(a, b), GLEIS_WEST_X), bis_x = Math.min(Math.max(a, b), GLEIS_OST_X);
    if (bis_x > von_x) r.push({ von_x, bis_x, gleis_y: lage.gleis_y, lok });
  }
  return r;
}

/** Form und Farben nach DESIGN 14.3/14.9 (`zug_kasten`, `zug_fenster`, `zug_dach`; Streifen = `menue.farbe.naht_*`). */
const ZUG = {
  kasten: '#f3eee3', fenster: '#2f3d48', dach: '#9aa1a6',
  vorlauf: tokens.menue.farbe.naht_vorlauf, ruecklauf: tokens.menue.farbe.naht_ruecklauf,
  /** halbe Breite 0,28 Feld, Höhe 0,34 Kachel */
  halb_breite: 0.14, hoehe: 0.34,
  /** Fensterband und Streifen als Anteil der Kastenhöhe; Abstand der Fenster zum Wagenende in Feldern (Werte der Grafik) */
  fenster_unten: 0.5, fenster_oben: 0.78, streifen: 0.14, fenster_rand: 0.12,
  schatten: 'rgba(30,50,35,.22)',
} as const;

/** Tiefe wie bei Masten und Objekten (Mitte + Größe 1), damit Häuser davor und Masten dahinter richtig liegen. */
export function zugTeilTiefe(k: Kamera, teil: ZugTeil): number {
  const [rx, ry] = k.dreheFeld((teil.von_x + teil.bis_x) / 2, teil.gleis_y);
  return rx + ry + 1;
}

/**
 * Wagen als Quader nach Blickrichtung: sichtbare Seiten wie Maler.quader (Außennormale zeigt im Bild nach unten), Fensterband und
 * Streifen auf den Längsseiten, Dach, Stromabnehmer bis zur Fahrdrahthöhe auf der Lok, flacher Schatten am Boden.
 */
export function zeichneZugTeil(m: Maler, k: Kamera, teil: ZugTeil): void {
  const { X } = m, tw = k.tw, h = ZUG.hoehe * tw;
  const { von_x: x0, bis_x: x1, gleis_y: g } = teil, y0 = g - ZUG.halb_breite, y1 = g + ZUG.halb_breite;
  const auf = (p: Punkt, f: number): Punkt => [p[0], p[1] - h * f];
  const boden = [k.mitte(x0, y0), k.mitte(x1, y0), k.mitte(x1, y1), k.mitte(x0, y1)];
  const versatz = tw * 0.04;
  m.flaeche(boden.map(([px, py]) => [px + versatz, py + versatz * 0.5] as Punkt), ZUG.schatten, false);
  const fx0 = Math.min(x0 + ZUG.fenster_rand, x1), fx1 = Math.max(x1 - ZUG.fenster_rand, x0);
  for (let i = 0; i < 4; i++) {
    const a = boden[i], b = boden[(i + 1) % 4], nx = b[1] - a[1], ny = -(b[0] - a[0]), nl = Math.hypot(nx, ny) || 1;
    if (ny <= 0) continue;
    m.flaeche([a, b, auf(b, 1), auf(a, 1)], schatten(ZUG.kasten, -0.08 - 0.179 * (nx / nl)));
    // Längsseiten (Kanten 0 und 2 laufen entlang der Gleise): Fensterband und Streifen
    if (i % 2 !== 0) continue;
    const yy = i === 0 ? y0 : y1, p = (x: number, f: number): Punkt => auf(k.mitte(x, yy), f);
    m.flaeche([p(fx0, ZUG.fenster_unten), p(fx1, ZUG.fenster_unten), p(fx1, ZUG.fenster_oben), p(fx0, ZUG.fenster_oben)], ZUG.fenster, false);
    X.strokeStyle = teil.lok ? ZUG.vorlauf : ZUG.ruecklauf; X.lineWidth = Math.max(1, tw * 0.025); X.lineCap = 'butt';
    X.beginPath(); X.moveTo(...p(x0, ZUG.streifen)); X.lineTo(...p(x1, ZUG.streifen)); X.stroke();
  }
  m.flaeche(boden.map((q) => auf(q, 1)), ZUG.dach);
  if (!teil.lok) return;
  // Stromabnehmer: zwei Striche vom Dach bis an den Fahrdraht (Höhe `fahrdraht_hoehe` über der Gleismitte)
  const mx = (x0 + x1) / 2, oben = (x: number, y: number, hh: number): Punkt => { const [px, py] = k.mitte(x, y); return [px, py - hh * tw]; };
  X.strokeStyle = MAST.farbe; X.lineWidth = Math.max(1, tw * 0.015); X.beginPath();
  X.moveTo(...oben(mx - 0.25, g, ZUG.hoehe)); X.lineTo(...oben(mx, g, MAST.draht_hoehe));
  X.moveTo(...oben(mx + 0.25, g, ZUG.hoehe)); X.lineTo(...oben(mx, g, MAST.draht_hoehe));
  X.stroke();
}

/** Liegt ein Teil des Zugs im Bild (mit Rand für Dach und Stromabnehmer)? Außerhalb braucht er keinen flüssigen Takt. */
export function zugImBild(k: Kamera, lage: ZugLage): boolean {
  const tw = k.tw, rand = tw * MAST.draht_hoehe;
  return zugTeile(lage).some((t) => {
    const p = [t.von_x, t.bis_x].flatMap((x) => [k.mitte(x, t.gleis_y - ZUG.halb_breite), k.mitte(x, t.gleis_y + ZUG.halb_breite)]);
    const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
    return Math.max(...xs) >= -rand && Math.min(...xs) <= k.breite + rand && Math.max(...ys) >= 0 && Math.min(...ys) - rand <= k.hoehe;
  });
}

/**
 * Baustelle der Querung (DESIGN 14.5 „Bau“, 14.9): Startgrube über dem Leitungsfeld (10|−1), Zielgrube auf der Böschung (10|−4),
 * je 0,7 × 0,7 Feld. Die Bohrlinie läuft von Grubenrand zu Grubenrand. Tiefe der Grube, Maße von Bohrgerät, Kabine und Lafette
 * und die Größe des Wölkchens sind Werte der Grafik, keine Fachwerte.
 */
const BAUSTELLE = {
  start_y: -1, ziel_y: -4, grube: 0.7, grube_tiefe: 0.12,
  grube_wand: '#8a6a4e', grube_boden: '#5f4532', verbau: tokens.farbe.objekt.geruest,
  bake_hoehe: 0.18,
  bohrgeraet: '#f0a53a', bohrlinie: '#4a2c14', kabine: ZUG.fenster, lafette: MAST.farbe,
  geraet: 0.34, geraet_hoehe: 0.12, kabine_breite: 0.14, kabine_hoehe: 0.14, kopf_radius: 0.06,
  /** `bohrgeraet_zittern` 180 ms (±1 px), `abgas_zyklus` 2400 ms (DESIGN 14.9 `zeit_ms`) */
  zittern_s: 0.18, abgas_s: 2.4,
  rauch: tokens.farbe.objekt.rauch_hell, rauch_rand: tokens.farbe.objekt.rauch_hell_rand,
} as const;

/** Mitten der beiden Gruben: dort sprühen im Erfolgsmoment die Funken (DESIGN 14.8). */
export function grubenFelder(): Array<[number, number]> {
  return [[QUERUNG_X, BAUSTELLE.start_y], [QUERUNG_X, BAUSTELLE.ziel_y]];
}

/** Anteil der Bauzeit (0 … 1) der Querung, oder null, wenn keine Querung gebaut wird. */
export function bauFortschritt(stand: Pick<Spielstand, 'abschnitt'>, jetzt_ms: number): number | null {
  if (!querungImBau(stand)) return null;
  const bau = stand.abschnitt?.bau;
  // Die Bauphase hat immer eine Bauzeit (Spiel setzt beide zusammen); fehlt sie, ist der Spielstand kaputt – nicht still raten.
  if (!bau) throw new Error('Querung im Bau ohne Bauzeit im Abschnitt');
  return Math.min(1, Math.max(0, (jetzt_ms - bau.start_ms) / (bau.ende_ms - bau.start_ms)));
}

/** Eingesenkte Grube: Rückwände und Boden innerhalb der Öffnung, Verbau-Bretter und Rand in Gerüstfarbe, Baken an den Ecken. */
function zeichneGrube(m: Maler, k: Kamera, y: number): void {
  const { X } = m, tw = k.tw, [cx, cy] = k.mitte(QUERUNG_X, y), tiefe = BAUSTELLE.grube_tiefe * tw;
  const rand = m.ecken(cx, cy, BAUSTELLE.grube), unten = (p: Punkt, f = 1): Punkt => [p[0], p[1] + tiefe * f];
  X.save(); m.bahn(rand); X.clip();
  for (let i = 0; i < 4; i++) {
    const a = rand[i], b = rand[(i + 1) % 4], nx = b[1] - a[1], ny = -(b[0] - a[0]), nl = Math.hypot(nx, ny) || 1;
    // Von innen sieht man die Wände, deren Außennormale im Bild nach oben zeigt (die hinteren)
    if (ny >= 0) continue;
    m.flaeche([a, b, unten(b), unten(a)], schatten(BAUSTELLE.grube_wand, -0.08 + 0.179 * (nx / nl)), false);
    X.strokeStyle = BAUSTELLE.verbau; X.lineWidth = Math.max(1, tw * 0.015); X.beginPath();
    for (const f of [0.33, 0.66]) { X.moveTo(...unten(a, f)); X.lineTo(...unten(b, f)); }
    X.stroke();
  }
  m.flaeche(rand.map((p) => unten(p)), BAUSTELLE.grube_boden, false);
  X.restore();
  m.bahn(rand); X.strokeStyle = BAUSTELLE.verbau; X.lineWidth = Math.max(1.5, tw * 0.03); X.lineJoin = 'round'; X.stroke();
  // Baken rot-weiß wie die Schranke: weißer Pfosten, darauf zwei rote Felder
  const h = BAUSTELLE.bake_hoehe * tw;
  X.lineCap = 'butt'; X.lineWidth = Math.max(2, tw * 0.04);
  X.strokeStyle = SCHRANKE.weiss; X.beginPath();
  for (const [px, py] of rand) { X.moveTo(px, py); X.lineTo(px, py - h); }
  X.stroke();
  X.strokeStyle = SCHRANKE.rot; X.beginPath();
  for (const [px, py] of rand) for (const [a, b] of [[0, 0.33], [0.66, 1]]) { X.moveTo(px, py - h * a); X.lineTo(px, py - h * b); }
  X.stroke();
}

/**
 * Baustelle nach dem Fortschritt (0 … 1). Bohrlinie und Bohrkopf sind Information und laufen immer; Zittern und Abgas nur bei
 * Animation an (`m.reduziert` aus), sonst steht das Gerät still.
 */
export function zeichneBaustelle(m: Maler, k: Kamera, fortschritt: number): void {
  const { X } = m, tw = k.tw, x = QUERUNG_X, halb = BAUSTELLE.grube / 2;
  zeichneGrube(m, k, BAUSTELLE.ziel_y);
  // Monteur westlich der Zielgrube: östlich steht bei x = 11 ein Mast (mast_teilung 3, Versatz 2), der ihn verdecken würde
  const [mx, my] = k.mitte(x - halb - 0.12, BAUSTELLE.ziel_y);
  zeichneMonteur(m, mx, my);

  const von_y = BAUSTELLE.start_y - halb, bis_y = BAUSTELLE.ziel_y + halb, kopf_y = von_y + (bis_y - von_y) * fortschritt;
  const a = k.mitte(x, von_y), b = k.mitte(x, kopf_y);
  X.setLineDash([QUERUNG.strich * tw, QUERUNG.luecke * tw]); X.lineCap = 'butt';
  X.strokeStyle = BAUSTELLE.bohrlinie; X.lineWidth = Math.max(1.5, tw * 0.03); X.beginPath();
  X.moveTo(...a); X.lineTo(...b); X.stroke(); X.setLineDash([]);
  X.lineWidth = 1; m.kreis(b[0], b[1], Math.max(2.5, BAUSTELLE.kopf_radius * tw), BAUSTELLE.bohrgeraet, true);

  zeichneGrube(m, k, BAUSTELLE.start_y);
  const animiert = !m.reduziert;
  const zittern = animiert ? Math.sin((2 * Math.PI * m.zeit_s) / BAUSTELLE.zittern_s) : 0;
  // Lafette: dunkler Keil vom Gerät zur Bahn hin, darauf das Gerät mit Kabine am Südende (Haube zittert, Lafette nicht)
  const hg = BAUSTELLE.geraet_hoehe * tw, auf = (p: Punkt, h: number): Punkt => [p[0], p[1] - h];
  m.flaeche([auf(k.mitte(x - 0.06, BAUSTELLE.start_y - 0.05), hg), auf(k.mitte(x + 0.06, BAUSTELLE.start_y - 0.05), hg),
    k.mitte(x, BAUSTELLE.start_y - 0.32)], BAUSTELLE.lafette);
  const [gx, gy] = k.mitte(x, BAUSTELLE.start_y + 0.12);
  m.quader(gx, gy - zittern, BAUSTELLE.geraet, hg, BAUSTELLE.bohrgeraet);
  const [kx, ky] = k.mitte(x + 0.04, BAUSTELLE.start_y + 0.2);
  m.quader(kx, ky - hg - zittern, BAUSTELLE.kabine_breite, BAUSTELLE.kabine_hoehe * tw, BAUSTELLE.kabine);
  if (!animiert) return;
  // Ein Wölkchen je Zyklus: steigt vom Auspuff auf, wächst und verblasst
  const f = (m.zeit_s % BAUSTELLE.abgas_s) / BAUSTELLE.abgas_s, [ax, ay] = k.mitte(x - 0.1, BAUSTELLE.start_y + 0.2);
  X.globalAlpha = (1 - f) * 0.8;
  m.kreis(ax, ay - hg - f * tw * 0.4, tw * 0.04 * (1 + f * 1.5), BAUSTELLE.rauch);
  X.strokeStyle = BAUSTELLE.rauch_rand; X.lineWidth = 1; X.stroke();
  X.globalAlpha = 1;
}
