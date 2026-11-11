// Bauplan NR20-22 P5, Sammelliste P5 Punkte 2 und 3: Die echte Steuerung legt in den Schritten mit Ruhe den leichten Schleier
// mit Gang über die Karte (DESIGN 13.17.1) und baut ihn neu auf, wenn sich die Kamera bewegt.
// Vorrang main (Commit 9918f8d „Karte beim Leitungsziehen vollständig aufhellen“, ENTSCHEIDUNGEN 2026-11-11): Beim Zeichnen
// (T13, T13w, T13h) liegt weder Schleier noch Abdunkelung über der Karte. Der Schleier bleibt in T12 und T14.
// Gang laut DESIGN: jede Raute der Spur × 1,5, Heizzentrale und beide Tutorial-Häuser als Ellipse + 12 px
// (tokens.json spot_abstand_karte = 12). Die Löcher stehen in der Maske schwarz (#000) auf weißer Fläche. In T12 gibt es noch
// kein Band, also drei Löcher (Heizzentrale, Haus 1, Haus 2).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { echteSteuerung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';
import { TUTORIAL_HAUPT } from '../src/core/start';
import { T0, ZUG_HAUS1, ZUG_HAUS2, bisT12, bisT13, farbknopf, neuesSpiel, schritt, st, wischeFelder, zielEl, type U } from './hilfen/tutorial-zug';

const schleier = (u: U): El | null => u.dom.doc.getElementById('schleier') as El | null;
const quelle = (u: U): string => (schleier(u)!.querySelector('svg') as El).attrs.quelle;
const maske = (u: U): string => /<mask[^>]*>(.*)<\/mask>/.exec(quelle(u))![1];
const schwarzePfade = (u: U): number => (maske(u).match(/<path [^>]*fill="#000"/g) ?? []).length;
/** Ellipsen-Löcher der Maske (spotlight.ts lochPfad: `M{x} {cy}A{rx} {ry} 0 1 0 {x + 2rx} {cy}…`) als Mitte und Halbachsen. */
const ellipsen = (u: U): Array<{ cx: number; cy: number; rx: number; ry: number }> =>
  [...maske(u).matchAll(/<path d="M([-\d.]+) ([-\d.]+)A([\d.]+) ([\d.]+) 0 1 0 ([-\d.]+) [-\d.]+/g)]
    .map((m) => ({ cx: (Number(m[1]) + Number(m[5])) / 2, cy: Number(m[2]), rx: Number(m[3]), ry: Number(m[4]) }));

describe('NR20-22 P5e Schleier mit Gang in der echten Steuerung', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  // Fehler, die ihn rot machen: In einem der Zeichen-Schritte liegt der leichte Schleier über #karte, oder die Abdunkel-Ebene
  // ist sichtbar (abdunkeln 'nur_hud' bzw. 'alles'); oder der Schleier kommt in T14 nicht zurück.
  it('test_nr20_kein_schleier_beim_leitungsziehen: T12 mit Schleier, T13/T13w/T13h ohne Schleier und ohne Abdunkelung, T14 wieder mit Schleier', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      const dunkel = (): El | null => u.dom.html.querySelector('.spot-dunkel');
      bisT12(u, spiel, uhr);
      expect(schleier(u), 'Vorprobe: T12 hat den Schleier').not.toBeNull();
      const hell = (id: string): void => {
        uhr.t += 16; st(u).tick(uhr.t);
        expect(schritt(u)).toBe(id);
        expect(st(u).anleitungAnsicht()!.abdunkeln, `${id}: Ansicht ohne Abdunkeln`).toBe('nichts');
        expect(schleier(u) === null, `${id}: kein Schleier über der Karte`).toBe(true);
        expect(dunkel(), `${id}: Abdunkel-Ebene vorhanden (Tutorial läuft)`).not.toBeNull();
        expect(dunkel()!.hidden, `${id}: Abdunkel-Ebene unsichtbar`).toBe(true);
      };
      zielEl(u, 'leitungskarte', spiel.tutorialWerte().haupt)!.click();
      hell('T13');
      wischeFelder(u, TUTORIAL_HAUPT);
      hell('T13w');
      farbknopf(u, spiel.tutorialWerte().anschluss).click();
      hell('T13h');
      wischeFelder(u, ZUG_HAUS1);
      hell('T13h');
      wischeFelder(u, ZUG_HAUS2);
      uhr.t += 16; st(u).tick(uhr.t);
      expect(schritt(u), 'Vorprobe: beide Häuser angeschlossen').toBe('T14');
      expect(schleier(u), 'T14: Schleier wieder da').not.toBeNull();
      expect(dunkel()!.hidden, 'T14: Abdunkel-Ebene sichtbar').toBe(false);
    }, { uhr: () => uhr.t });
  });

  // Die Karte ist hell, die Eingaberegel bleibt wie beim früheren HUD-Spotlight (main, steuerung.ts sperrLage). Fehler, der ihn
  // rot macht: mit abdunkeln 'nichts' lässt die Sperre auch Tipps auf die Anzeigenreihe durch, oder die Karte wird gesperrt.
  // Merge W1 (ENTSCHEIDUNGEN 2026-11-11): auch T13w (Farbknopf-Schritt) gehört dazu – Anzeigenreihe hell, aber gesperrt.
  it('test_nr20_leitungsziehen_hell_aber_hud_gesperrt: in T13, T13w und T13h Karte frei, Anzeigenreihe nicht abgedunkelt, aber gesperrt', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, async (u) => {
      const { eingabeErlaubt } = await import('../src/ui/spotlight');
      bisT13(u, spiel, uhr);
      uhr.t += 16; st(u).tick(uhr.t);
      const pruefe = (id: string): void => {
        expect(schritt(u)).toBe(id);
        const [zx, zy] = st(u).kamera.mitte(10, 12);
        expect(eingabeErlaubt(zx, zy, false), `${id}: Karte (10|12) frei`).toBe(true);
        expect(eingabeErlaubt(60, 30, true), `${id}: Ziel in der Anzeigenreihe gesperrt`).toBe(false);
        const dunkel = u.dom.html.querySelector('.spot-dunkel');
        expect(dunkel !== null && dunkel.hidden, `${id}: Anzeigenreihe nicht abgedunkelt (Abdunkel-Ebene unsichtbar)`).toBe(true);
      };
      pruefe('T13');
      wischeFelder(u, TUTORIAL_HAUPT); uhr.t += 16; st(u).tick(uhr.t);
      pruefe('T13w');
      farbknopf(u, spiel.tutorialWerte().anschluss).click(); uhr.t += 16; st(u).tick(uhr.t);
      pruefe('T13h');
    }, { uhr: () => uhr.t });
  });

  // Fehler, die ihn rot machen: Der Schleier baut nach der Kamerabewegung nicht neu auf, oder das Heizzentralen-Loch steht nicht
  // an der neuen Bildschirmlage der Heizzentrale. Heizzentrale 2×2 ab (11|10) → Mitte (11,5|10,5); Loch = Raute über die
  // Grundfläche (steuerung.ts rautenLoch, Kante 2) als Ellipse: Halbachsen 2 · tw / 2 + 12 = tw + 12 bzw. th + 12
  // (spotlight.ts umriss, spot_abstand_karte 12). Pfadzahlen auf 0,01 gerundet → Toleranz 0,01.
  it('test_nr20_schleier_folgt_kamera: Kamera verschoben → Schleier neu, Heizzentralen-Loch an der neuen Mitte (T12)', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      expect([spiel.hz.x, spiel.hz.y], 'Testaufbau: Heizzentrale ab (11|10)').toEqual([11, 10]);
      bisT12(u, spiel, uhr);
      const vorher = maske(u);
      expect(schwarzePfade(u), 'Vorprobe: Heizzentrale und beide Häuser ausgespart').toBe(3);
      st(u).kamera.schiebe_x += 30; st(u).kamera.schiebe_y -= 10;
      uhr.t += 16; st(u).tick(uhr.t);
      const nachher = maske(u);
      expect(nachher).not.toBe(vorher);
      expect(schwarzePfade(u)).toBe(3);
      const k = st(u).kamera, [mx, my] = k.mitte(11.5, 10.5);
      const hz = ellipsen(u).filter((e) => Math.abs(e.rx - (k.tw + 12)) <= 0.01 && Math.abs(e.ry - (k.th + 12)) <= 0.01);
      expect(hz, 'genau ein Loch in Größe der Heizzentralen-Raute').toHaveLength(1);
      expect(Math.abs(hz[0].cx - mx), `Mitte x ${hz[0].cx} statt ${mx}`).toBeLessThanOrEqual(0.01);
      expect(Math.abs(hz[0].cy - my), `Mitte y ${hz[0].cy} statt ${my}`).toBeLessThanOrEqual(0.01);
    }, { uhr: () => uhr.t });
  });

  it('test_nr20_schleier_nur_mit_ruhe: vor T12 kein Schleier, in T12 nur Heizzentrale und Häuser ausgespart, nach dem Tutorial weg', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      st(u).tick(uhr.t);
      expect(st(u).anleitungAnsicht()!.ruhe).toBe(false);
      expect(schleier(u)).toBeNull();
      bisT12(u, spiel, uhr);
      expect(schleier(u)).not.toBeNull();
      expect(schwarzePfade(u)).toBe(3);
      // Die Fläche der Maske ist weiß, nur die Löcher sind schwarz
      expect(maske(u)).toMatch(/^<rect [^>]*fill="#fff"\/>/);
      spiel.tutorialBeenden(); uhr.t += 16; st(u).tick(uhr.t);
      expect(schleier(u)).toBeNull();
    }, { uhr: () => uhr.t });
  });
});
