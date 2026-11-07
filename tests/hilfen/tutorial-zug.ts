// Testhilfe (Bauplan NR20-22 P5): Klickweg und Züge mit der echten Steuerung aus tests/hilfen/echte-steuerung.ts – dieselben
// Griffe wie in tests/nr20-einbindung.test.ts, hier gemeinsam für die NR21-Tests der Einbindung und des Ablaufs.
import { expect, vi } from 'vitest';
import { KATALOG } from '../../src/core/katalog';
import { groesse } from '../../src/core/netz';
import { Spiel } from '../../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT, neuesSpielMitTutorial } from '../../src/core/start';
import type { Feld, TutorialAnsicht, TutorialBandFeld } from '../../src/core/tutorial-vertrag';
import type { echteSteuerung } from './echte-steuerung';
import type { El } from './dom-attrappe';

export const T0 = 1_000_000;

type Kam = { breite: number; hoehe: number; zoom: number; schiebe_x: number; schiebe_y: number; tw: number; th: number;
  grenze: { mitte_px: readonly [number, number]; zoom_min: number } | null; mitte(x: number, y: number): [number, number] };
export type SzeneTeil = { tutorial_band?: ReadonlyArray<TutorialBandFeld>; naechstes_feld?: Feld; zielscheibe?: Feld;
  ziel?: { stecker: number[]; ring: number | null }; ruhe?: boolean; tutorial_fremd?: ReadonlyArray<Feld>;
  erreicht?: ReadonlyArray<{ id: number; seit_ms: number }> };
type St = { tick(t: number): void; kamera: Kam; anleitungAnsicht(): TutorialAnsicht | null; szene(): SzeneTeil };
export type U = Parameters<Parameters<typeof echteSteuerung>[1]>[0];
type Obj = { x: number; y: number; typ: string };

export const st = (u: U): St => u.st as unknown as St;
export const schritt = (u: U): string | undefined => st(u).anleitungAnsicht()?.schritt;
export const zielEl = (u: U, name: string, typ?: string): El | null => u.dom.html.querySelector(`[data-ziel="${name}"]${typ ? `[data-typ="${typ}"]` : ''}`);
export const knopfMitId = (u: U, id: string): El | null => u.dom.html.querySelector(`[data-id="${id}"]`);
export function farbknopf(u: U, typ: string): El {
  const k = knopfMitId(u, `farbe-${typ}`);
  expect(k, `Farbknopf ${typ} in ${schritt(u)}`).not.toBeNull();
  return k!;
}
export function weiterTippen(u: U): void {
  const k = u.dom.doc.getElementById('anleiter-weiter');
  expect(k, `[Weiter] in ${schritt(u)}`).not.toBeNull();
  k!.click();
}
export function objektMitte(u: U, o: Obj): [number, number] {
  const k = groesse(o as never);
  return st(u).kamera.mitte(o.x + (k - 1) / 2, o.y + (k - 1) / 2);
}
const leinwand = (u: U): El => u.dom.app.querySelector('canvas')!;
const zeiger = (id: number, x: number, y: number) => ({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch', button: 0 });
export function tippePunkt(u: U, [mx, my]: [number, number]): void {
  leinwand(u).ausloesen('pointerdown', zeiger(3, mx, my)); leinwand(u).ausloesen('pointerup', zeiger(3, mx, my));
}
/** Zug über Feldmitten; `abheben: false` lässt den Finger auf dem letzten Feld liegen (dann `abheben(u, feld)`). */
export function wischeFelder(u: U, felder: ReadonlyArray<readonly [number, number]>, abheben = true): void {
  const evs = felder.map(([x, y]) => { const [mx, my] = st(u).kamera.mitte(x, y); return zeiger(7, mx, my); });
  leinwand(u).ausloesen('pointerdown', evs[0]);
  for (const ev of evs.slice(1)) leinwand(u).ausloesen('pointermove', ev);
  if (abheben) leinwand(u).ausloesen('pointerup', evs[evs.length - 1]);
}
export function abheben(u: U, [x, y]: readonly [number, number]): void {
  const [mx, my] = st(u).kamera.mitte(x, y);
  leinwand(u).ausloesen('pointerup', zeiger(7, mx, my));
}
export const hausBei = (spiel: Spiel, [x, y]: readonly [number, number]) => spiel.stand.objekte.find((o) => o.x === x && o.y === y && KATALOG[o.typ].kategorie === 'haus')!;
export const ZUG_HAUS1: ReadonlyArray<readonly [number, number]> = [...TUTORIAL_ANSCHLUSS_1, ERSTE_HAEUSER[0]];
export const ZUG_HAUS2: ReadonlyArray<readonly [number, number]> = [...TUTORIAL_ANSCHLUSS_2, ERSTE_HAEUSER[1]];

/** Echter Klickweg von der Wiedereinstiegs-Blase bis T12 (Baumenü mit den Leitungskarten offen). */
export function bisT12(u: U, spiel: Spiel, uhr: { t: number }): void {
  const s = st(u);
  s.tick(uhr.t); weiterTippen(u);
  s.tick(uhr.t); expect(schritt(u)).toBe('T01');
  tippePunkt(u, objektMitte(u, spiel.hz));
  for (const id of ['T02', 'T03', 'T04', 'T05', 'T06', 'T07']) { s.tick(uhr.t); expect(schritt(u)).toBe(id); weiterTippen(u); }
  s.tick(uhr.t); expect(schritt(u)).toBe('T08');
  zielEl(u, 'bauen')!.click();
  s.tick(uhr.t); expect(schritt(u)).toBe('T10');
  zielEl(u, 'philipp')!.click();
  s.tick(uhr.t); expect(schritt(u)).toBe('T11');
  vi.advanceTimersByTime(7_000);
  uhr.t += 10_000; s.tick(uhr.t); weiterTippen(u);
  s.tick(uhr.t); expect(schritt(u)).toBe('T12');
}
export function bisT13(u: U, spiel: Spiel, uhr: { t: number }): void {
  bisT12(u, spiel, uhr);
  zielEl(u, 'leitungskarte', spiel.tutorialWerte().haupt)!.click();
  st(u).tick(uhr.t); expect(schritt(u)).toBe('T13');
}
export function bisT13h(u: U, spiel: Spiel, uhr: { t: number }): void {
  bisT13(u, spiel, uhr);
  wischeFelder(u, TUTORIAL_HAUPT);
  st(u).tick(uhr.t); expect(schritt(u)).toBe('T13w');
  farbknopf(u, spiel.tutorialWerte().anschluss).click();
  st(u).tick(uhr.t); expect(schritt(u)).toBe('T13h');
}
export const neuesSpiel = (uhr: { t: number }): Spiel => new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);
export const kameraLage = (u: U): number[] => { const k = st(u).kamera; return [k.zoom, k.schiebe_x, k.schiebe_y]; };
/** Mitten der gezeichneten Lochränder (`.spot-ring`); die Mitte ist gleich der Mitte des umringten Knopfs. */
export function ringMitten(u: U): Array<[number, number]> {
  return u.dom.html.querySelectorAll('.spot-ring').map((r) => {
    const z = (s: unknown): number => Number.parseFloat(String(s));
    return [z(r.style.left) + z(r.style.width) / 2, z(r.style.top) + z(r.style.height) / 2] as [number, number];
  });
}
/** Knopf an eine feste Stelle legen (die DOM-Nachbildung hat kein Layout). */
export function knopfRechteck(k: El, x: number, y: number, b = 44, h = 44): void {
  k.rechteck = { left: x, top: y, right: x + b, bottom: y + h, width: b, height: h, x, y };
}
