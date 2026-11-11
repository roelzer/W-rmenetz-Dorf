import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERSTE_HAEUSER, TUTORIAL_HAUPT } from '../src/core/start';
import { El } from './hilfen/dom-attrappe';
import { echteSteuerung } from './hilfen/echte-steuerung';
import {
  ZUG_HAUS1, ZUG_HAUS2, abheben, bisT13, bisT13h, farbknopf, knopfMitId, knopfRechteck, neuesSpiel, schritt, st, wischeFelder,
} from './hilfen/tutorial-zug';

// Paket P5f-2 (DESIGN 13.17.9 F7, F8): Ring um den Farbknopf, Abstand der Kennzeile, Finger in T13w, Zeitpunkt des Wechsels.

const ringe = (u: Parameters<typeof st>[0]) => u.dom.html.querySelectorAll('.spot-ring').filter((r) => r.isConnected);
const fingerEl = (u: Parameters<typeof st>[0]) => u.dom.html.querySelector('.spot-finger');

describe('P5f-2 F7: Ring um den Farbknopf und Finger in T13w', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('T13w: Ring 2 px um den Farbknopf (statt 8), Finger mit Spitze auf der Knopfmitte und Hand nach rechts oben', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      wischeFelder(u, TUTORIAL_HAUPT); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T13w');
      // Knopf 44 × 44 bei (600|300): Ring = Knopf + 2 px je Seite → links 598, Breite 48 (Token spot_abstand_farbknopf)
      knopfRechteck(farbknopf(u, spiel.tutorialWerte().anschluss), 600, 300);
      const animiert: Array<{ el: El; kf: Array<Record<string, unknown>> }> = [];
      vi.spyOn(El.prototype, 'animate').mockImplementation(function (this: El, kf: unknown) {
        animiert.push({ el: this, kf: kf as Array<Record<string, unknown>> });
        return { finished: Promise.resolve(), cancel() {}, onfinish: null };
      } as unknown as El['animate']);
      st(u).tick(uhr.t);
      const r = ringe(u).map((x) => [x.style.left, x.style.top, x.style.width, x.style.height]);
      expect(r).toContainEqual(['598px', '298px', '48px', '48px']);
      const f = fingerEl(u);
      expect(f, 'Finger in T13w').not.toBeNull();
      expect([f!.style.left, f!.style.top]).toEqual(['622px', '322px']);
      expect(f!.klassen()).toContain('nach-oben');
      // Tippen 6 px schräg zum Ziel: die Hand kommt von rechts oben, also nach links unten (je Achse 6/√2 = 4,24)
      const tipp = animiert.find((x) => x.el === f && x.kf.some((k) => 'transform' in k));
      expect(tipp?.kf[1].transform).toBe('translate(-4.24px, 4.24px)');
    }, { uhr: () => uhr.t });
  });

  it('[Zurück] beim eigenen Abgang behält den Abstand 8 px (spot_abstand_knopf)', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, [[12, 12], [12, 13]]); st(u).tick(uhr.t);
      knopfRechteck(knopfMitId(u, 'zurueck')!, 600, 300);
      st(u).tick(uhr.t);
      expect(ringe(u).map((x) => [x.style.left, x.style.width])).toContainEqual(['592px', '60px']);
    }, { uhr: () => uhr.t });
  });

  it('stil.css: Kennzeile 4 px unter den Farbknöpfen (8 px Lücke + 4 = 12), Finger nach oben gespiegelt und um seine Höhe versetzt', () => {
    const css = readFileSync('src/ui/stil.css', 'utf8');
    expect(css).toContain('.blatt.zeichenleiste .kennzeile{margin:4px 0 0;');
    expect(css).toContain('.spot-finger.nach-oben{margin-top:calc(-1 * var(--menue-mass-px-finger))}');
    expect(css).toContain('.spot-finger.nach-oben .sym{transform:scaleY(-1)}');
    expect(css).toContain('.spot-finger.nach-oben.von-links .sym{transform:scale(-1,-1)}');
  });
});

describe('P5f-2 F8: Zustand „eigener Abgang“ wechselt gemeinsam beim Abheben', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  // Wörtlich aus src/core/tutorial.ts (SATZ_EIGENER_ABGANG) mit {anschluss} = 25er
  const SATZ_EIGENER_ABGANG = 'Nimm das gestreifte Stück mit Zurück oder Radierer weg. Zieh die 25er von der Abzweigung.';
  const ZURUECK_MITTE: [number, number] = [622, 322];
  type U = Parameters<typeof st>[0];
  /** Was der Spieler sieht: Satz der Anleiter-Karte, Band, Raute, Zielscheibe, Ring ums Haus, Lochränder in der Leiste, Streifen */
  function bild(u: U, t: number) {
    knopfRechteck(knopfMitId(u, 'zurueck')!, 600, 300);
    knopfRechteck(knopfMitId(u, 'radierer')!, 680, 300);
    st(u).tick(t);
    const sz = st(u).szene();
    return {
      satz: u.dom.html.querySelector('.anleiter-text')?.textContent ?? '',
      band: sz.tutorial_band ?? [], raute: sz.naechstes_feld ?? null, zielscheibe: sz.zielscheibe ?? null, ring: sz.ziel?.ring ?? null,
      ringe: ringe(u).map((r) => { const z = (v: unknown): number => Number.parseFloat(String(v)); return [z(r.style.left) + z(r.style.width) / 2, z(r.style.top) + z(r.style.height) / 2]; }),
      streifen: sz.tutorial_fremd ?? [],
    };
  }

  it('im Zug bleibt das Bild wie vor dem Zug (Satz, Ringe, Zielscheibe, Raute, Band, keine Streifen); nach dem Abheben alles zusammen', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1);
      const vorher = bild(u, uhr.t);
      expect(vorher.satz, 'Vorprobe: noch nicht der Satz zum eigenen Abgang').not.toBe(SATZ_EIGENER_ABGANG);
      expect(vorher.zielscheibe).toBeNull();
      wischeFelder(u, [[12, 12], [12, 13]], false);
      expect(st(u).anleitungAnsicht()!.text, 'Vorprobe: der Kern meldet den eigenen Abgang schon im Zug').toBe(SATZ_EIGENER_ABGANG);
      expect(bild(u, uhr.t), 'im Zug unverändert').toEqual(vorher);
      abheben(u, [12, 13]);
      const nach = bild(u, uhr.t);
      expect(nach.satz).toBe(SATZ_EIGENER_ABGANG);
      expect(nach.zielscheibe).toEqual([10, 12]);
      expect(nach.streifen).toEqual([[12, 13], [12, 12]]);
      expect(nach.ringe).toContainEqual(ZURUECK_MITTE);
    }, { uhr: () => uhr.t });
  });

  it('Zug zu Haus 1: Ring ums Haus, Band und Raute springen erst beim Abheben auf Haus 2', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      const vorher = bild(u, uhr.t);
      wischeFelder(u, ZUG_HAUS1, false);
      const kern = st(u).anleitungAnsicht()!;
      expect(kern.ziel_ring, 'Vorprobe: der Kern ist im Zug schon bei Haus 2').not.toBe(vorher.ring);
      expect(kern.naechstes_feld, 'Vorprobe: Raute im Kern schon weiter').not.toEqual(vorher.raute);
      expect(kern.band, 'Vorprobe: Band im Kern schon anders').not.toEqual(vorher.band);
      const im = bild(u, uhr.t);
      expect([im.ring, im.raute, im.band, im.satz]).toEqual([vorher.ring, vorher.raute, vorher.band, vorher.satz]);
      abheben(u, ERSTE_HAEUSER[0]);
      const nach = bild(u, uhr.t);
      expect([nach.ring, nach.raute]).toEqual([kern.ziel_ring, kern.naechstes_feld]);
    }, { uhr: () => uhr.t });
  });

  it('im Zug mit dem Radierer: Streifen auf gerade wegradierten Feldern verschwinden sofort, Satz bleibt bis zum Abheben', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      // Ablauf wie tests/nr21-ablauf.test.ts (11): 30.000 € reichen für alle Felder, kein Geld-Satz. Früher über Spalte 11
      // (11|12)→(11|14); (11|12) schließt seit main 859dda7 einen Ring über die Heizzentrale. Ringfrei: eigener Abgang
      // (12|12),(12|13) zu Haus 2 und die Spur zu Haus 2 dazu.
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, [[12, 12], [12, 13], ERSTE_HAEUSER[1]]); st(u).tick(uhr.t);
      wischeFelder(u, ZUG_HAUS2);
      const vorher = bild(u, uhr.t);
      expect(vorher.satz).toBe(SATZ_EIGENER_ABGANG);
      expect(vorher.streifen.length, 'Vorprobe: mehr als ein gestreiftes Feld').toBeGreaterThan(1);
      knopfMitId(u, 'radierer')!.click(); st(u).tick(uhr.t);
      wischeFelder(u, [[12, 13]], false);
      const im = bild(u, uhr.t);
      expect(im.streifen, 'gerade wegradiert: nicht mehr gestreift').not.toContainEqual([12, 13]);
      expect(im.streifen, 'die übrigen bleiben').toContainEqual([12, 12]);
      wischeFelder(u, [[12, 12]], false);
      const leer = bild(u, uhr.t);
      expect(leer.streifen).toEqual([]);
      expect(leer.satz, 'Satz bleibt bis zum Abheben').toBe(SATZ_EIGENER_ABGANG);
      expect(leer.zielscheibe).toEqual(vorher.zielscheibe);
      abheben(u, [12, 12]); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T14');
    }, { uhr: () => uhr.t });
  });
});
