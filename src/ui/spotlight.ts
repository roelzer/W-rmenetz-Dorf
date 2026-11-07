import { symbol } from './bausteine';
import { h } from './dom';
import { T } from './tokens';

/** Spotlight, Zeigefinger, Eingabesperre und Tastatur-Ersatz des Tutorials (DESIGN 13.2, 13.7, 13.11, 13.15 K9; Bauplan NR13
 *  AE-NR13-5/-6). Kennt weder Spiel noch Tutorial: Lage, Ziele und Rückmeldungen kommen von steuerung.ts. */

const M = T.menue.mass_px, Z = T.menue.zeit_ms;

/** Bildschirm-Rechteck in px. */
export interface Rechteck { x: number; y: number; b: number; h: number }
/** Loch um ein Ziel: `r` ist das Bildschirm-Rechteck des Ziels selbst; der Abstand des Lochs kommt hier dazu (13.2):
 *  Kartenobjekt = Ellipse um das Rechteck + 12 px, Bedienelement = Rechteck + 8 px mit Radius des Elements + 8. */
export interface Loch { r: Rechteck; form: 'ellipse' | 'rund'; radius_px?: number }
export type Finger = { art: 'tippen'; ziel: Rechteck } | { art: 'spur'; punkte: ReadonlyArray<readonly [number, number]> };

/** Eingangsdaten der Sperrregel AE-NR13-6 – aus der Tutorial-Ansicht gebaut, nicht aus dem gerade gezeigten Bild.
 *  `loecher` sind die Rechtecke der Ziele (wie `Loch.r`). */
export interface SperrLage {
  fahrt: boolean;
  anleiter: Rechteck | null;
  abdunkeln: 'alles' | 'nur_hud' | 'nichts';
  art: 'W' | 'H';
  loecher: Rechteck[];
}

export const KARTEN_VORLESENAME: Readonly<Record<'heizzentrale' | 'haus1' | 'haus2', string>> = { heizzentrale: 'Heizzentrale', haus1: 'Haus 1', haus2: 'Haus 2' };

const zahl = (n: number): string => String(Math.round(n * 100) / 100);
const px = (n: number): string => `${zahl(n)}px`;
const drin = (r: Rechteck, x: number, y: number): boolean => x >= r.x && x <= r.x + r.b && y >= r.y && y <= r.y + r.h;

/** Gezeichneter Umriss eines Lochs: Ellipse durch die Ecken des Ziel-Rechtecks (Halbachsen b/√2, h/√2) plus Abstand, bzw.
 *  Rechteck plus Abstand mit Radius höchstens der halben kürzeren Seite. */
function umriss(l: Loch): { x: number; y: number; b: number; h: number; radius: number | null } {
  if (l.form === 'ellipse') {
    const rx = l.r.b / Math.SQRT2 + M.spot_abstand_karte, ry = l.r.h / Math.SQRT2 + M.spot_abstand_karte;
    return { x: l.r.x + l.r.b / 2 - rx, y: l.r.y + l.r.h / 2 - ry, b: 2 * rx, h: 2 * ry, radius: null };
  }
  const d = M.spot_abstand_knopf, b = l.r.b + 2 * d, hh = l.r.h + 2 * d;
  return { x: l.r.x - d, y: l.r.y - d, b, h: hh, radius: Math.min((l.radius_px ?? 0) + d, b / 2, hh / 2) };
}

/** Außenmaß des gezeichneten Lochrands (inklusive Abstand) – danach richtet sich, wo die Anleiter-Karte stehen darf. */
export function lochRand(l: Loch): Rechteck {
  const u = umriss(l);
  return { x: u.x, y: u.y, b: u.b, h: u.h };
}

const rechteckPfad = (r: Rechteck): string => `M${zahl(r.x)} ${zahl(r.y)}H${zahl(r.x + r.b)}V${zahl(r.y + r.h)}H${zahl(r.x)}Z`;

function lochPfad(l: Loch): string {
  const u = umriss(l);
  if (u.radius === null) {
    const rx = u.b / 2, ry = u.h / 2, cy = zahl(u.y + ry), bogen = `A${zahl(rx)} ${zahl(ry)} 0 1 0`;
    return `M${zahl(u.x)} ${cy}${bogen} ${zahl(u.x + u.b)} ${cy}${bogen} ${zahl(u.x)} ${cy}Z`;
  }
  const r = u.radius, x0 = u.x, y0 = u.y, x1 = u.x + u.b, y1 = u.y + u.h, a = `A${zahl(r)} ${zahl(r)} 0 0 1`;
  return `M${zahl(x0 + r)} ${zahl(y0)}H${zahl(x1 - r)}${a} ${zahl(x1)} ${zahl(y0 + r)}V${zahl(y1 - r)}${a} ${zahl(x1 - r)} ${zahl(y1)}`
    + `H${zahl(x0 + r)}${a} ${zahl(x0)} ${zahl(y1 - r)}V${zahl(y0 + r)}${a} ${zahl(x0 + r)} ${zahl(y0)}Z`;
}

/** Umriss der dunklen Fläche für `clip-path: path(evenodd, …)`. Ohne `nur`: Außenrechteck, aus dem die Löcher ausgespart
 *  werden (evenodd). Mit `nur` (T13): genau diese Rechtecke dunkel, damit die Zeichenleiste nie verdeckt ist. */
export function abdunkelPfad(breite: number, hoehe: number, loecher: Loch[], nur: Rechteck[]): string {
  if (nur.length > 0) return nur.map(rechteckPfad).join('');
  return rechteckPfad({ x: 0, y: 0, b: breite, h: hoehe }) + loecher.map(lochPfad).join('');
}

// Zustand der sichtbaren Teile – eine Ebene im Dokument, nie zwei.
let ebene: HTMLElement | null = null;
let dunkel: HTMLElement | null = null;
let ringe: HTMLElement[] = [];
let fingerEl: HTMLElement | null = null;
let fingerAnim: Animation[] = [];
let lochSchluessel = '';
let fingerSchluessel = '';
let fingerJetzt: { f: Finger; ruhig: boolean } | null = null;

function fingerStoppen(): void {
  for (const an of fingerAnim) an.cancel();
  fingerAnim = [];
}

/** Bewegung des Fingers über die Web-Animations-Schnittstelle (keine eigene Bildschleife, Architekturregel R1).
 *  Tippen (13.2): nach `verzoegerung` 6 px schräg zum Ziel und zurück in 400 ms, dann 1.200 ms Ruhe.
 *  Spur (K9): gleichmäßig in 2.400 ms über alle Punkte, am Ende ausblenden, 600 ms Pause, von vorn. */
function fingerBewegen(el: HTMLElement, f: Finger, verzoegerung: number): void {
  fingerStoppen();
  if (f.art === 'tippen') {
    const zyklus = Z.finger_tipp + Z.finger_ruhe, weg = M.finger_weg / Math.SQRT2;
    const dx = el.classList.contains('von-links') ? weg : -weg, aus = 'translate(0px, 0px)';
    fingerAnim.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: Z.spot_wechsel, delay: verzoegerung, fill: 'both' }));
    fingerAnim.push(el.animate([
      { offset: 0, transform: aus },
      { offset: Z.finger_tipp / 2 / zyklus, transform: `translate(${px(dx)}, ${px(-weg)})` },
      { offset: Z.finger_tipp / zyklus, transform: aus },
      { offset: 1, transform: aus },
    ], { duration: zyklus, delay: verzoegerung, iterations: Infinity }));
    return;
  }
  const p = f.punkte, zyklus = Z.spur_finger + Z.spur_pause;
  const laengen = p.map((q, i) => (i === 0 ? 0 : Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1])));
  const gesamt = laengen.reduce((s, l) => s + l, 0);
  let bisher = 0;
  const lage = (q: readonly [number, number]): string => `translate(${px(q[0])}, ${px(q[1])})`;
  const kf: Keyframe[] = p.map((q, i) => {
    bisher += laengen[i];
    return { offset: gesamt > 0 ? (bisher / gesamt) * (Z.spur_finger / zyklus) : 0, transform: lage(q), opacity: 1 };
  });
  const ende = lage(p[p.length - 1]);
  kf.push({ offset: (Z.spur_finger + Z.spot_wechsel) / zyklus, transform: ende, opacity: 0 }, { offset: 1, transform: ende, opacity: 0 });
  fingerAnim.push(el.animate(kf, { duration: zyklus, delay: verzoegerung, iterations: Infinity }));
}

function fingerSetzen(f: Finger | null, ruhig: boolean): void {
  const schluessel = f && (f.art === 'tippen' || f.punkte.length > 0) ? JSON.stringify({ f, ruhig, breite: window.innerWidth }) : '';
  if (schluessel === fingerSchluessel) return;
  fingerSchluessel = schluessel;
  fingerStoppen();
  fingerEl?.remove();
  fingerEl = null;
  fingerJetzt = null;
  if (!f || !schluessel || !ebene) return;
  const el = h('div', { class: 'spot-finger', 'aria-hidden': 'true' }, symbol('finger'));
  if (f.art === 'tippen') {
    const mx = f.ziel.x + f.ziel.b / 2, my = f.ziel.y + f.ziel.h / 2;
    el.style.left = px(mx); el.style.top = px(my);
    // Am rechten Rand ist rechts unten kein Platz für die Hand – dann kommt sie von links unten (13.2).
    if (mx + M.finger + M.anleiter_rand > window.innerWidth) el.classList.add('von-links');
  } else {
    el.style.left = '0px'; el.style.top = '0px';
    el.style.transform = `translate(${px(f.punkte[0][0])}, ${px(f.punkte[0][1])})`;
  }
  ebene.append(el);
  fingerEl = el;
  fingerJetzt = { f, ruhig };
  if (!ruhig) fingerBewegen(el, f, f.art === 'tippen' ? Z.finger_verzoegerung : 0);
}

function ringeSetzen(loecher: Loch[]): void {
  for (const r of ringe) r.remove();
  ringe = loecher.map((l) => {
    const u = umriss(l);
    const ring = h('div', { class: 'spot-ring' });
    ring.style.left = px(u.x); ring.style.top = px(u.y); ring.style.width = px(u.b); ring.style.height = px(u.h);
    ring.style.borderRadius = u.radius === null ? '50%' : px(u.radius);
    ring.addEventListener('animationend', () => ring.classList.remove('stupst', 'stupst-ruhig'));
    return ring;
  });
  dunkel!.after(...ringe);
}

/** Zeigt das Abdunkeln mit Löchern, Lochrändern und Finger. Gleiche Löcher bzw. gleicher Finger erneut gesetzt ändern nichts,
 *  damit Blenden und Fingertakt nicht bei jedem Aufruf neu beginnen. */
export function spotlightSetzen(z: { loecher: Loch[]; abdunkeln: 'alles' | 'nur_hud' | 'nichts'; finger: Finger | null; ruhig: boolean; hud: Rechteck[] }): void {
  if (!ebene) {
    dunkel = h('div', { class: 'spot-dunkel' });
    ebene = h('div', { id: 'spotlight', 'aria-hidden': 'true' }, dunkel);
    document.getElementById('app')!.append(ebene);
  }
  const breite = window.innerWidth, hoehe = window.innerHeight;
  const schluessel = JSON.stringify({ l: z.loecher, a: z.abdunkeln, hud: z.hud, breite, hoehe });
  if (schluessel !== lochSchluessel) {
    lochSchluessel = schluessel;
    dunkel!.hidden = z.abdunkeln === 'nichts';
    dunkel!.style.clipPath = `path(evenodd, '${abdunkelPfad(breite, hoehe, z.loecher, z.abdunkeln === 'nur_hud' ? z.hud : [])}')`;
    ringeSetzen(z.loecher);
  }
  fingerSetzen(z.finger, z.ruhig);
}

export function spotlightAus(): void {
  fingerSetzen(null, false);
  ebene?.remove();
  ebene = null; dunkel = null; ringe = []; lochSchluessel = '';
}

let schleier: HTMLElement | null = null;
let schleierSchluessel = '';

/** SVG des Schleiers: Fläche in `schleier_leicht`, aus der eine Maske die Löcher des Gangs weich ausspart. Der Rand von
 *  `gang_rand` (12 px) entspricht etwa ±2 σ der Unschärfe, also σ = gang_rand / 4. Ein Pfad je Loch, damit sich
 *  überlappende Löcher nicht gegenseitig aufheben. Nur eigene Zahlen gelangen in den Text. */
function schleierSvg(breite: number, hoehe: number, gang: Loch[]): string {
  const b = zahl(breite), hh = zahl(hoehe);
  const loecher = gang.map((l) => `<path d="${lochPfad(l)}" fill="#000" filter="url(#schleier-weich)"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${b}" height="${hh}" viewBox="0 0 ${b} ${hh}">`
    + `<defs><filter id="schleier-weich" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${zahl(M.gang_rand / 4)}"/></filter>`
    + `<mask id="schleier-gang" maskUnits="userSpaceOnUse" x="0" y="0" width="${b}" height="${hh}"><rect width="${b}" height="${hh}" fill="#fff"/>${loecher}</mask></defs>`
    + `<rect width="${b}" height="${hh}" fill="${T.menue.farbe.schleier_leicht}" mask="url(#schleier-gang)"/></svg>`;
}

/** Leichter Schleier über der Spielkarte mit ausgespartem Gang (DESIGN 13.17.1); `null` nimmt ihn weg. Er liegt direkt über
 *  `#karte`, also unter allen Bedienelementen, fängt per CSS keine Zeiger und ist nicht Teil der Eingabesperre. Gleicher Gang
 *  bei gleicher Bildgröße baut nichts neu auf, weil der Aufruf in jedem Bild kommt. */
export function schleierSetzen(gang: Loch[] | null): void {
  if (gang === null) {
    schleier?.remove();
    schleier = null; schleierSchluessel = '';
    return;
  }
  const breite = window.innerWidth, hoehe = window.innerHeight;
  const schluessel = JSON.stringify({ gang, breite, hoehe });
  if (schleier && schluessel === schleierSchluessel) return;
  if (!schleier) {
    schleier = h('div', { id: 'schleier', 'aria-hidden': 'true' });
    document.getElementById('karte')!.after(schleier);
  }
  schleierSchluessel = schluessel;
  const svg = new DOMParser().parseFromString(schleierSvg(breite, hoehe, gang), 'image/svg+xml').documentElement;
  schleier.replaceChildren(document.importNode(svg, true));
}

/** Antwort auf einen Fehltipp (13.7): Lochrand stupst einmal, der Finger erscheint sofort neu.
 *  `ruhig` (Weniger Bewegung): statt Stupsen wird der Rand kurz dicker. */
export function stupsen(ruhig: boolean): void {
  for (const r of ringe) {
    r.classList.remove('stupst', 'stupst-ruhig');
    void r.offsetWidth; // erzwingt neues Layout, damit dieselbe CSS-Animation erneut startet
    r.classList.add(ruhig ? 'stupst-ruhig' : 'stupst');
  }
  if (fingerEl && fingerJetzt && !fingerJetzt.ruhig) fingerBewegen(fingerEl, fingerJetzt.f, 0);
}

/** Ganze Tabelle AE-NR13-6 (in dieser Reihenfolge): Fahrt → still; Anleiter-Karte → durch; nur_hud → nur #hud gesperrt;
 *  sonst nur ein Loch in einem Handlungs-Schritt. */
export function eingabeErlaubtBei(lage: SperrLage, x: number, y: number, imHud: boolean): 'durch' | 'daneben' | 'still' {
  if (lage.fahrt) return 'still';
  if (lage.anleiter && drin(lage.anleiter, x, y)) return 'durch';
  if (lage.abdunkeln === 'nur_hud') return imHud ? 'daneben' : 'durch';
  if (lage.art === 'H' && lage.loecher.some((r) => drin(r, x, y))) return 'durch';
  return 'daneben';
}

type SperrQuelle = { lage: () => SperrLage; daneben: () => void; tab_ziele: () => HTMLElement[] };
const SPERR_EREIGNISSE = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'touchstart', 'wheel', 'keydown'] as const;
let sperre: SperrQuelle | null = null;
let sperrEmpfaenger: ((ev: Event) => void) | null = null;
/** Finger, deren Aufsetzen durchgelassen wurde – ihre Folge-Ereignisse gehen auch nach einem Schrittwechsel durch (F3.1). */
const durchFinger = new Set<number>();
/** Diese Berührung wurde schon beim Aufsetzen beurteilt: touchstart und click derselben Berührung melden kein zweites daneben. */
let beruehrungBeurteilt = false;
/** Ein Dreh am Mausrad schickt viele wheel-Ereignisse; höchstens eines je 200 ms zählt als Fehltipp. */
const RAD_DANEBEN_ABSTAND_MS = 200;
let letztesRadDaneben = -Infinity;

function punkt(ev: Event): [number, number] {
  const t = (ev as TouchEvent).touches?.[0];
  if (t) return [t.clientX, t.clientY];
  const m = ev as MouseEvent;
  return [m.clientX, m.clientY];
}

function imHud(ev: Event): boolean {
  const z = ev.target as Element | null;
  return !!z && typeof z.closest === 'function' && z.closest('#hud') !== null;
}

function abfangen(ev: Event): void { ev.preventDefault(); ev.stopPropagation(); }

/** Liegt das Ziel des Ereignisses auf der Anleiter-Karte oder in einem erlaubten Tab-Ziel? Nur damit dürfen Tastatur-Klicks
 *  durch, denn sie tragen keine Lage (13.11: Enter/Leertaste auf [Weiter] und auf dem Ziel im Loch). */
function tastaturZielErlaubt(s: SperrQuelle, ev: Event): boolean {
  const z = ev.target as Element | null;
  if (!z || typeof z.closest !== 'function') return false;
  return z.closest('#anleiter') !== null || s.tab_ziele().some((t) => t.contains(z));
}

function tabWeiter(ev: KeyboardEvent, ziele: HTMLElement[]): void {
  ev.preventDefault();
  if (ziele.length === 0) return;
  const i = ziele.indexOf(document.activeElement as HTMLElement);
  const n = i < 0 ? (ev.shiftKey ? ziele.length - 1 : 0) : (i + (ev.shiftKey ? -1 : 1) + ziele.length) % ziele.length;
  ziele[n].focus();
}

function sperrEreignis(s: SperrQuelle, ev: Event): void {
  const typ = ev.type;
  if (typ === 'keydown') {
    const k = (ev as KeyboardEvent).key;
    if (k === 'Tab') tabWeiter(ev as KeyboardEvent, s.tab_ziele());
    else if (k !== 'Enter' && !(k === ' ' && tastaturZielErlaubt(s, ev))) abfangen(ev);
    return;
  }
  // Von Enter/Leertaste ausgelöster click: detail 0 und Lage 0|0 – entscheidend ist das Ziel, nicht die Lage.
  if (typ === 'click' && (ev as MouseEvent).detail === 0 && tastaturZielErlaubt(s, ev)) return;
  const id = (ev as PointerEvent).pointerId;
  if (typ === 'pointerup' || typ === 'pointercancel') { durchFinger.delete(id); return; }
  if (typ === 'pointermove' && durchFinger.has(id)) return;
  const [x, y] = punkt(ev);
  const urteil = eingabeErlaubtBei(s.lage(), x, y, imHud(ev));
  // click beendet eine Berührung; touchstart und click ohne vorheriges pointerdown zählen als eigene Berührung.
  const schonBeurteilt = beruehrungBeurteilt;
  if (typ === 'pointerdown') beruehrungBeurteilt = true;
  if (typ === 'click') beruehrungBeurteilt = false;
  if (urteil === 'durch') { if (typ === 'pointerdown') durchFinger.add(id); return; }
  abfangen(ev);
  if (urteil !== 'daneben' || typ === 'pointermove') return;
  if (typ === 'wheel') {
    const jetzt = Date.now();
    if (jetzt - letztesRadDaneben < RAD_DANEBEN_ABSTAND_MS) return;
    letztesRadDaneben = jetzt;
    s.daneben();
    return;
  }
  if (typ === 'pointerdown' || !schonBeurteilt) s.daneben();
}

/** Schaltet die Eingabesperre ein (mit Quelle) oder aus (`null`). Die Lage wird bei jedem Ereignis frisch gelesen;
 *  jeder Aufruf vergisst die durchgelassenen Finger. */
export function eingabeSperre(s: SperrQuelle | null): void {
  if (sperrEmpfaenger) for (const t of SPERR_EREIGNISSE) window.removeEventListener(t, sperrEmpfaenger, { capture: true });
  sperrEmpfaenger = null;
  sperre = s;
  durchFinger.clear();
  beruehrungBeurteilt = false;
  letztesRadDaneben = -Infinity;
  if (!s) return;
  const f = (ev: Event): void => sperrEreignis(s, ev);
  sperrEmpfaenger = f;
  for (const t of SPERR_EREIGNISSE) window.addEventListener(t, f, { capture: true, passive: false });
}

/** Würde eine Berührung an (x, y) durchgelassen? Ohne Sperre immer. */
export function eingabeErlaubt(x: number, y: number, imHudZiel = false): boolean {
  return sperre ? eingabeErlaubtBei(sperre.lage(), x, y, imHudZiel) === 'durch' : true;
}

let ersatz: HTMLElement | null = null;
let ersatzEnter: (() => void) | null = null;

/** Unsichtbares, fokussierbares Ersatz-Element über einem Kartenobjekt im Loch (13.15 Vorlesenamen und Fokus): Vorleser
 *  nennt den Namen, Enter löst den Tipp aus; Fingertipps gehen durch (`pointer-events: none` in stil.css). */
export function ersatzZiel(z: { r: Rechteck; name: string; enter: () => void } | null): void {
  if (!z) { ersatz?.remove(); ersatz = null; ersatzEnter = null; return; }
  if (!ersatz) {
    ersatz = h('div', { class: 'ersatz-ziel', role: 'button', tabindex: '0' });
    ersatz.addEventListener('keydown', (ev) => { if ((ev as KeyboardEvent).key === 'Enter') ersatzEnter?.(); });
    document.getElementById('app')!.append(ersatz);
  }
  ersatz.setAttribute('aria-label', z.name);
  ersatz.style.left = px(z.r.x); ersatz.style.top = px(z.r.y); ersatz.style.width = px(z.r.b); ersatz.style.height = px(z.r.h);
  ersatzEnter = z.enter;
}

let kapsel: HTMLElement | null = null;

/** Info-Kapsel (K9): Chip mittig 8 px über dem Loch; reicht der Platz unter der Anzeigenreihe nicht, 8 px darunter. */
export function infoKapsel(text: string | null, loch: Rechteck | null): void {
  if (text === null || !loch) { kapsel?.remove(); kapsel = null; return; }
  if (!kapsel) {
    kapsel = h('span', { class: 'chip info-kapsel', 'aria-hidden': 'true' });
    document.getElementById('app')!.append(kapsel);
  }
  kapsel.textContent = text;
  const oben = loch.y - M.info_kapsel_abstand - M.chip_hoehe;
  kapsel.style.left = px(loch.x + loch.b / 2);
  kapsel.style.top = px(oben < T.groesse_px.blatt_oben_quer ? loch.y + loch.h + M.info_kapsel_abstand : oben);
}

/** Blatt scrollt zum Ziel (K9): kürzester Weg im nächsten scrollenden Vorfahren, 8 px Abstand, weich (ruhig: sofort). */
export function zielSichtbarMachen(el: HTMLElement, ruhig: boolean, fertig: () => void): void {
  const box = el.closest('.inhalt') as HTMLElement | null;
  if (!box) { fertig(); return; }
  const r = el.getBoundingClientRect(), b = box.getBoundingClientRect(), d = M.ziel_scroll_abstand;
  const weg = r.top < b.top + d ? r.top - b.top - d : r.bottom > b.bottom - d ? r.bottom - b.bottom + d : 0;
  if (weg === 0) { fertig(); return; }
  if (ruhig) { box.scrollTop += weg; fertig(); return; }
  box.scrollTo({ top: box.scrollTop + weg, behavior: 'smooth' });
  window.setTimeout(fertig, Z.ziel_scrollen);
}
