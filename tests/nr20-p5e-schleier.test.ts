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
  it('test_nr20_leitungsziehen_hell_aber_hud_gesperrt: in T13 und T13h Karte frei, Anzeigenreihe gesperrt', async () => {
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
      };
      pruefe('T13');
      wischeFelder(u, TUTORIAL_HAUPT); uhr.t += 16; st(u).tick(uhr.t);
      farbknopf(u, spiel.tutorialWerte().anschluss).click(); uhr.t += 16; st(u).tick(uhr.t);
      pruefe('T13h');
    }, { uhr: () => uhr.t });
  });

  it('test_nr20_schleier_folgt_kamera: Kamera verschoben → Schleier neu, Löcher wandern mit (T12)', async () => {
    const uhr = { t: T0 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT12(u, spiel, uhr);
      const vorher = maske(u);
      expect(schwarzePfade(u), 'Vorprobe: Heizzentrale und beide Häuser ausgespart').toBe(3);
      st(u).kamera.schiebe_x += 30; st(u).kamera.schiebe_y -= 10;
      uhr.t += 16; st(u).tick(uhr.t);
      const nachher = maske(u);
      expect(nachher).not.toBe(vorher);
      expect(schwarzePfade(u)).toBe(3);
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
      spiel.tutorialBeenden(); uhr.t += 16; st(u).tick(uhr.t);
      expect(schleier(u)).toBeNull();
    }, { uhr: () => uhr.t });
  });
});
