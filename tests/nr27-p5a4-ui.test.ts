import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// NR27 P5a4 (DESIGN 13.13 A, 14.15 Punkt 20): Mini-Tutorial „Bahnquerung“ bei der Freischaltung (Stufe 6). Der Fachtext-
// Schalter wird nur hier im Test umgeschaltet: nordText wird durch die echte Funktion mit `freigegeben = schalter.frei`
// ersetzt. Im Spielcode gibt es keinen Schalter.
const schalter = vi.hoisted(() => ({ frei: false }));
vi.mock('../src/core/nord-texte', async (orig) => {
  const echt = await orig<typeof import('../src/core/nord-texte')>();
  return { ...echt, nordText: (id: Parameters<typeof echt.nordText>[0], werte?: Record<string, string | number>, frei?: boolean) => echt.nordText(id, werte, frei ?? schalter.frei) };
});

import tokens from '../design/tokens.json';
import { nordText, type NordTextId } from '../src/core/nord-texte';
import { laden, serialisieren } from '../src/core/speichern';
import { neuesSpielMitTutorial } from '../src/core/start';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import type { Spielstand } from '../src/core/typen';
import { echteSteuerung, tippe, type EchteUmgebung } from './hilfen/echte-steuerung';
import { sichtbarerText, type El } from './hilfen/dom-attrappe';

const T0 = 1_700_000_000_000;
const t = (id: NordTextId): string => nordText(id, {}, true) as string;
const norm = (s: string): string => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function stand(stufe: number): Spielstand {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  st.geld_eur = 10_000_000; st.taler = 10_000;
  st.abschnitt = { phase: 'offen', bau: null };
  return st;
}
function spiel(st: Spielstand): Spiel {
  const sp = new Spiel(st, () => T0);
  sp.neuBerechnen();
  sp.ereignisse.splice(0);
  return sp;
}
type St = EchteUmgebung['st'] & { tick(t: number): void; toast(t: string): void };
const tick = (u: EchteUmgebung): void => (u.st as St).tick(T0);
/** Das erste Bild prüft die Aufträge und zeigt z. B. „Auftrag geschafft!“; das Mini-Tutorial wartet, bis die Meldung weg ist. */
const meldungAbwarten = (): void => { vi.advanceTimersByTime(20_000); };
const ersteBilder = (u: EchteUmgebung): void => { tick(u); meldungAbwarten(); tick(u); };
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });
const tut = (u: EchteUmgebung): El | null => u.dom.html.querySelector('#bahn-tutorial');
const knopfMitText = (wurzel: El, text: string): El | undefined => wurzel.querySelectorAll('button').find((k) => norm(k.textContent) === text);
const knopfTexte = (wurzel: El): string[] => wurzel.querySelectorAll('button').map((k) => norm(k.textContent));
const text = (u: EchteUmgebung): string => norm(sichtbarerText(tut(u)!));
const katalogOffen = (u: EchteUmgebung): boolean => u.dom.html.querySelector('[data-ziel="kasten_abschnitt"]')?.isConnected === true;

describe('NR27 P5a4 Mini-Tutorial Bahnquerung – Auslösen (DESIGN 14.15 Punkt 20)', () => {
  // Fehler, die ihn rot machen: kein Auslösen im tick, Fachtext ohne Freigabe sichtbar, TUTORIAL_2 ohne den Fachsatz davor,
  // falsche Knöpfe, kein Abdunkeln, keine Figur Simon.
  it('test_nr27_tutorial_ohne_freigabe: Stufe 6 → eine Blase TUTORIAL_BEDIEN mit [Zeig’s mir] und [Später], kein Fachtext', async () => {
    schalter.frei = false;
    await echteSteuerung(spiel(stand(6)), (u) => {
      expect(tut(u), 'vor dem ersten Bild noch nichts').toBeNull();
      ersteBilder(u);
      const w = tut(u);
      expect(w, 'Mini-Tutorial offen').not.toBeNull();
      expect(text(u)).toContain(t('TUTORIAL_BEDIEN'));
      expect(text(u)).not.toContain(t('TUTORIAL_1'));
      expect(text(u)).not.toContain(t('TUTORIAL_2'));
      expect(text(u)).toContain('Simon');
      expect(knopfTexte(w!)).toEqual(['Zeig’s mir', 'Später']);
      expect(w!.querySelectorAll('.abdunkeln')).toHaveLength(1);
      expect(u.dom.doc.activeElement, 'Fokus auf [Zeig’s mir]').toBe(knopfMitText(w!, 'Zeig’s mir'));
    });
  });

  // Fehler, die ihn rot machen: Reihenfolge falsch, [Weiter] fehlt, Chip „Neu freigeschaltet“ fehlt, Bedien-Teil fehlt.
  it('test_nr27_tutorial_mit_freigabe: TUTORIAL_1 → [Weiter] → TUTORIAL_2 → [Weiter] → TUTORIAL_BEDIEN mit [Zeig’s mir]/[Später]', async () => {
    schalter.frei = true;
    await echteSteuerung(spiel(stand(6)), (u) => {
      ersteBilder(u);
      const w = tut(u)!;
      expect(text(u)).toContain(t('TUTORIAL_1'));
      expect(text(u)).not.toContain(t('TUTORIAL_2'));
      expect(text(u)).toContain('Neu freigeschaltet');
      expect(knopfTexte(w)).toEqual(['Weiter']);
      expect(u.dom.doc.activeElement).toBe(knopfMitText(w, 'Weiter'));
      tippe(knopfMitText(w, 'Weiter')!);
      tick(u);
      expect(text(u)).toContain(t('TUTORIAL_2'));
      expect(text(u)).not.toContain(t('TUTORIAL_1'));
      expect(knopfTexte(tut(u)!)).toEqual(['Weiter']);
      tippe(knopfMitText(tut(u)!, 'Weiter')!);
      tick(u);
      expect(text(u)).toContain(t('TUTORIAL_BEDIEN'));
      expect(knopfTexte(tut(u)!)).toEqual(['Zeig’s mir', 'Später']);
      expect(u.dom.doc.activeElement).toBe(knopfMitText(tut(u)!, 'Zeig’s mir'));
      expect(u.dom.html.querySelectorAll('#bahn-tutorial'), 'nie zwei Karten').toHaveLength(1);
    });
  });

  // Fehler, der ihn rot macht: Bedingung `>= 5` statt Freischaltung, oder Auslösen ohne Stufenprüfung.
  it('Stufe 5: kein Mini-Tutorial', async () => {
    schalter.frei = true;
    await echteSteuerung(spiel(stand(5)), (u) => {
      ersteBilder(u);
      expect(tut(u)).toBeNull();
    });
  });

  // Fehler, die ihn rot machen: Merker wird nicht gelesen.
  it('Merker gesetzt: kein Mini-Tutorial', async () => {
    const st = stand(6); st.bahn_hilfe_gesehen = true;
    await echteSteuerung(spiel(st), (u) => {
      ersteBilder(u);
      expect(tut(u)).toBeNull();
    });
  });

  // Fehler, die ihn rot machen: offenes Blatt wird nicht abgewartet (13.13 A „sobald kein Blatt offen ist“).
  it('wartet auf das offene Blatt – erscheint nach dem Schließen', async () => {
    schalter.frei = false;
    await echteSteuerung(spiel(stand(6)), async (u) => {
      tick(u); meldungAbwarten();
      u.st.katalog('netz');
      tick(u);
      expect(tut(u), 'Blatt offen').toBeNull();
      (await import('../src/ui/blatt')).blattSchliessen();
      tick(u);
      expect(tut(u), 'Blatt zu').not.toBeNull();
    });
  });

  // Fehler, die ihn rot machen: stehende Meldung wird nicht abgewartet (14.15 Punkt 20 „nach der Stufen-Meldung“).
  it('wartet auf die stehende Meldung – erscheint, wenn sie weg ist', async () => {
    schalter.frei = false;
    await echteSteuerung(spiel(stand(6)), (u) => {
      tick(u); meldungAbwarten();
      (u.st as St).toast('Heizzentrale Stufe 6');
      tick(u);
      expect(tut(u), 'Meldung steht').toBeNull();
      meldungAbwarten();
      tick(u);
      expect(tut(u), 'Meldung weg').not.toBeNull();
    });
  });

  // Fehler, die ihn rot machen: Sprecherblase wird nicht abgewartet (sonst zwei Simon-Karten zugleich).
  it('wartet auf die Sprecherblase', async () => {
    schalter.frei = false;
    await echteSteuerung(spiel(stand(6)), async (u) => {
      tick(u); meldungAbwarten();
      (await import('../src/ui/sprecher')).sprecherZeigen('Simon', 'Hallo');
      tick(u);
      expect(tut(u), 'Sprecher spricht').toBeNull();
    });
  });

  // Fehler, der ihn rot macht: Installations-Hinweis wird nicht abgewartet – er liegt im Browser über allem und verdeckte die
  // Knöpfe der Karte (Bildschirmfoto 844×390, P5a4).
  it('wartet auf den Installations-Hinweis – erscheint, wenn er geschlossen ist', async () => {
    schalter.frei = false;
    await echteSteuerung(spiel(stand(6)), async (u) => {
      tick(u); meldungAbwarten();
      const { h } = await import('../src/ui/dom');
      const hinweis = h('aside', { class: 'install-hinweis' }) as unknown as El;
      u.dom.html.append(hinweis);
      tick(u);
      expect(tut(u) === null, 'Hinweis steht: kein Mini-Tutorial').toBe(true);
      hinweis.remove();
      tick(u);
      expect(tut(u) !== null, 'Hinweis zu: Mini-Tutorial da').toBe(true);
    });
  });

  // Fehler, der ihn rot macht: Der Hinweis erscheint (nach 3,2 s) über einem schon offenen Mini-Tutorial – im Bildschirmfoto
  // geschehen. Prüfung im Stil von tests/pwa.test.ts (Quelltext, weil der Hinweis nur auf echten Handys startet).
  it('Installations-Hinweis wartet seinerseits auf das offene Mini-Tutorial', () => {
    const installation = readFileSync(new URL('../src/ui/installation.ts', import.meta.url), 'utf8');
    expect(installation).toContain("document.getElementById('bahn-tutorial')");
  });

  // Fehler, der ihn rot macht: Besuch im Nachbardorf wird nicht abgewartet ([Zeig’s mir] führte in ein fremdes Dorf).
  it('während eines Besuchs im Nachbardorf kein Mini-Tutorial', async () => {
    schalter.frei = false;
    await echteSteuerung(spiel(stand(6)), (u) => {
      tick(u); meldungAbwarten();
      (u.st as unknown as { besuch: unknown }).besuch = { name: 'Nachbarort', objekte: [] };
      tick(u);
      expect(tut(u)).toBeNull();
    });
  });

  // Fehler, der ihn rot macht: Pflicht-Tutorial wird nicht abgewartet (zwei Anleiter-Karten übereinander).
  it('während des Pflicht-Tutorials kein Mini-Tutorial', async () => {
    schalter.frei = false;
    const st = { ...stand(6), tutorial: neuesSpielMitTutorial(T0).tutorial };
    await echteSteuerung(spiel(st), (u) => {
      ersteBilder(u);
      expect(tut(u)).toBeNull();
    });
  });
});

describe('NR27 P5a4 Mini-Tutorial Bahnquerung – Bedienung', () => {
  // Fehler, die ihn rot machen: [Später] schließt nicht, Merker nicht gesetzt, es kommt im nächsten Bild wieder.
  it('[Später] schließt, setzt bahn_hilfe_gesehen und es kommt nicht wieder', async () => {
    schalter.frei = false;
    const sp = spiel(stand(6));
    await echteSteuerung(sp, (u) => {
      ersteBilder(u);
      tippe(knopfMitText(tut(u)!, 'Später')!);
      expect(tut(u)).toBeNull();
      expect(sp.stand.bahn_hilfe_gesehen).toBe(true);
      tick(u);
      expect(tut(u)).toBeNull();
      expect(katalogOffen(u), '[Später] öffnet nichts').toBe(false);
    });
  });

  // Fehler, die ihn rot machen: Merker schon beim Zeigen gesetzt (Neustart mittendrin → kommt nicht wieder, 13.13 A/13.7).
  it('offen ohne Antwort: Merker bleibt leer (Neustart mittendrin → kommt wieder)', async () => {
    schalter.frei = false;
    const sp = spiel(stand(6));
    await echteSteuerung(sp, (u) => {
      ersteBilder(u); tick(u);
      expect(tut(u)).not.toBeNull();
      expect(sp.stand.bahn_hilfe_gesehen).toBeUndefined();
    });
  });

  // Fehler, die ihn rot machen: Esc schließt nicht, gilt nicht als [Später], wird weitergereicht; Tab läuft aus der Karte.
  it('Esc wirkt wie [Später] ohne Weitergabe; Tab bleibt in der Karte', async () => {
    schalter.frei = false;
    const sp = spiel(stand(6));
    await echteSteuerung(sp, (u) => {
      ersteBilder(u);
      const w = tut(u)!;
      const dialog = w.querySelector('[role="dialog"]')!;
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      const zeig = knopfMitText(w, 'Zeig’s mir')!, spaeter = knopfMitText(w, 'Später')!;
      const stopp = vi.fn();
      spaeter.focus();
      expect(dialog.ausloesen('keydown', { key: 'Tab', shiftKey: false, stopPropagation: stopp }).defaultPrevented).toBe(true);
      expect(u.dom.doc.activeElement, 'Tab vom letzten auf das erste').toBe(zeig);
      expect(dialog.ausloesen('keydown', { key: 'Tab', shiftKey: true, stopPropagation: stopp }).defaultPrevented).toBe(true);
      expect(u.dom.doc.activeElement, 'Umschalt+Tab vom ersten auf das letzte').toBe(spaeter);
      dialog.ausloesen('keydown', { key: 'Escape', stopPropagation: stopp });
      expect(stopp).toHaveBeenCalledTimes(3);
      expect(tut(u)).toBeNull();
      expect(sp.stand.bahn_hilfe_gesehen).toBe(true);
    });
  });

  // Fehler, der ihn rot macht: Tippen aufs Abdunkeln lässt den Fokus außerhalb der Karte (im Browser fällt er auf body).
  it('Tippen aufs Abdunkeln holt den Fokus zurück auf die Karte', async () => {
    schalter.frei = false;
    await echteSteuerung(spiel(stand(6)), (u) => {
      ersteBilder(u);
      const w = tut(u)!;
      u.dom.html.querySelector('canvas')!.focus(); // wie der Browser: Fokus ist nicht mehr in der Karte
      tippe(w.querySelector('.abdunkeln')!);
      expect(u.dom.doc.activeElement === knopfMitText(w, 'Zeig’s mir'), 'Fokus auf [Zeig’s mir]').toBe(true);
      expect(tut(u), 'Abdunkeln schließt nicht').not.toBeNull();
    });
  });

  // Fehler, die ihn rot machen: [Zeig’s mir] öffnet nicht den Reiter Leitungen, Kamera nicht auf (10|−2,5) mit Zoom 2,2,
  // Merker nicht gesetzt. „Weniger Bewegung“: die Kamera springt (Dauer 0), so steht sie im Test sofort am Ziel.
  it('[Zeig’s mir]: Merker, Kamera auf die Querungsstelle (Zoom 2,2), Baumenü im Reiter „Leitungen“', async () => {
    schalter.frei = false;
    const sp = spiel(stand(6));
    await echteSteuerung(sp, async (u) => {
      tick(u); meldungAbwarten();
      // Zuletzt war der Reiter „Deko“ offen: [Zeig’s mir] muss selbst auf „Leitungen“ wechseln
      u.st.katalog('deko');
      (await import('../src/ui/blatt')).blattSchliessen();
      tick(u);
      tippe(knopfMitText(tut(u)!, 'Zeig’s mir')!);
      tick(u);
      expect(tut(u)).toBeNull();
      expect(sp.stand.bahn_hilfe_gesehen).toBe(true);
      expect(katalogOffen(u), 'Kasten „Bauabschnitt“ im Reiter Leitungen').toBe(true);
      expect(u.st.kamera.zoom).toBe(2.2);
      // Freie Fläche 844 × 390 (das Blatt der Nachbildung hat keine Breite): Mitte (422|195)
      const [mx, my] = u.st.kamera.mitte(10, -2.5);
      expect(Math.round(mx)).toBe(422);
      expect(Math.round(my)).toBe(195);
    }, { bewegung: 'einstellung' });
  });
});

describe('NR27 P5a4 Mini-Tutorial – Merker im Spielstand', () => {
  // Fehler, die ihn rot machen: Merker geht beim Speichern verloren (z. B. Ausschlussliste in serialisieren) oder Laden löscht ihn.
  it('test_nr27_bahn_hilfe_gesehen_ueberlebt: Speichern und Laden behalten den Merker', () => {
    const st = stand(6); st.bahn_hilfe_gesehen = true;
    expect(laden(serialisieren(st), T0).bahn_hilfe_gesehen).toBe(true);
  });

  // Fehler, die ihn rot machen: Laden markiert alte Stände mit Stufe 6 als gesehen (sie sollen es genau einmal sehen).
  it('alter Stand auf Stufe 6 ohne Merker: nach dem Laden kommt das Mini-Tutorial genau einmal', async () => {
    schalter.frei = false;
    const alt = stand(6);
    expect(alt.bahn_hilfe_gesehen).toBeUndefined();
    const geladen = laden(serialisieren(alt), T0);
    expect(geladen.bahn_hilfe_gesehen).toBeUndefined();
    const sp = spiel(geladen);
    await echteSteuerung(sp, (u) => {
      ersteBilder(u);
      expect(tut(u)).not.toBeNull();
      tippe(knopfMitText(tut(u)!, 'Später')!);
    });
    const wieder = laden(serialisieren(sp.stand), T0);
    await echteSteuerung(spiel(wieder), (u) => {
      ersteBilder(u);
      expect(tut(u), 'nach Speichern/Laden nicht noch einmal').toBeNull();
    });
  });
});

describe('NR27 P5a4 Mini-Tutorial – Tippflächen und Lage', () => {
  const css = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');
  // Fehler, die ihn rot machen: Knöpfe ohne Klasse `knopf`/`klein` (dann gilt keine Mindesthöhe), Token unter 44.
  it('Knöpfe mit Mindestmaß ≥ 44 px (Token knopf_hoehe_klein, tippflaeche_min)', async () => {
    schalter.frei = true;
    await echteSteuerung(spiel(stand(6)), (u) => {
      ersteBilder(u);
      const geprueft: string[] = [];
      for (let blase = 0; blase < 3; blase++) {
        for (const k of tut(u)!.querySelectorAll('button')) {
          expect(k.className.split(/\s+/), norm(k.textContent)).toEqual(expect.arrayContaining(['knopf', 'klein']));
          geprueft.push(norm(k.textContent));
        }
        const weiter = knopfMitText(tut(u)!, 'Weiter');
        if (weiter) tippe(weiter);
      }
      expect(geprueft, 'alle Knöpfe aller Blasen').toEqual(['Weiter', 'Weiter', 'Zeig’s mir', 'Später']);
    });
    expect(tokens.menue.mass_px.knopf_hoehe_klein).toBeGreaterThanOrEqual(44);
    expect(tokens.groesse_px.tippflaeche_min).toBeGreaterThanOrEqual(44);
    expect(css).toMatch(/\.knopf\.klein\{min-height:var\(--menue-mass-px-knopf-hoehe-klein\)/);
  });

  // Fehler, die ihn rot machen: Karte ohne Platz (links/Breite fehlen) oder breiter als das Bild bei 667 × 375.
  for (const [b, hh] of [[844, 390], [667, 375]] as const) {
    it(`Karte liegt im Bild ${b}×${hh} (Platzregel 13.3, unten links)`, async () => {
      schalter.frei = false;
      await echteSteuerung(spiel(stand(6)), (u) => {
        ersteBilder(u);
        const karte = tut(u)!.querySelector('.bahn-tutorial-karte')!;
        const links = parseFloat(String(karte.style.left)), breite = parseFloat(String(karte.style.width));
        expect(links).toBe(tokens.menue.mass_px.anleiter_rand);
        expect(links + breite).toBeLessThanOrEqual(b - tokens.menue.mass_px.anleiter_rand);
        expect(breite).toBeLessThanOrEqual(tokens.menue.mass_px.anleiter_karte_max);
      }, { breite: b, hoehe: hh });
    });
  }
});
