// NR13 P3 (Teil a): Bausteine des Tutorials ohne Browser – Anleiter-Karte, Spotlight, Eingabesperre, Finger, Ersatz-Ziel,
// Info-Kapsel, Blatt-Scrollen, Simon-Figur. Bauplan docs/bauplaene/NR13-tutorial.md, P3 und AE-NR13-6; DESIGN 13.2/13.3/13.15.
// Alle erwarteten Zahlen sind von Hand aus DESIGN 13.3/13.10 hergeleitet (Rechnung jeweils im Kommentar).
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domAttrappe, El, sichtbar, sichtbarerText, TextKnoten, type DomAttrappe } from './hilfen/dom-attrappe';
import type { TutorialAnsicht } from '../src/core/tutorial-vertrag';

type Ereignis = Record<string, unknown> & { type: string };
interface Eintrag { typ: string; f: (ev: unknown) => void; opt: unknown }

/** Eigener window-Stub mit Listener-Liste: „kommt an“ = kein Capture-Listener hat das Ereignis gestoppt. */
function fensterStub(matchMedia: () => { matches: boolean }) {
  const liste: Eintrag[] = [];
  return {
    innerWidth: 844, innerHeight: 390, devicePixelRatio: 1, matchMedia,
    setTimeout: (f: () => void, ms?: number) => setTimeout(f, ms),
    clearTimeout: (id: number) => clearTimeout(id),
    addEventListener(typ: string, f: (ev: unknown) => void, opt?: unknown) { liste.push({ typ, f, opt }); },
    removeEventListener(typ: string, f: (ev: unknown) => void) { const i = liste.findIndex((e) => e.typ === typ && e.f === f); if (i >= 0) liste.splice(i, 1); },
    liste,
    feuern(typ: string, ev: Record<string, unknown>): { angekommen: boolean; verhindert: boolean } {
      let gestoppt = false, verhindert = false;
      const e: Ereignis = { type: typ, preventDefault() { verhindert = true; }, stopPropagation() { gestoppt = true; }, stopImmediatePropagation() { gestoppt = true; }, ...ev };
      for (const x of [...liste]) if (x.typ === typ) x.f(e);
      return { angekommen: !gestoppt, verhindert };
    },
  };
}

let a: DomAttrappe;
let fenster: ReturnType<typeof fensterStub>;
const animiert: Array<{ el: El; kf: Array<Record<string, unknown>>; opt: Record<string, unknown> }> = [];

beforeEach(() => {
  vi.resetModules();
  a = domAttrappe();
  const matchMedia = () => ({ matches: false });
  fenster = fensterStub(matchMedia);
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('window', fenster);
  vi.stubGlobal('requestAnimationFrame', (f: () => void) => { f(); return 1; });
  // Die Attrappe lädt keine Fotos. Auch ohne Ladeereignis darf keine Ersatzzeichnung erscheinen.
  vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; });
  animiert.length = 0;
  // Die Attrappe merkt sich keine Keyframes – hier werden sie mitgeschrieben, damit der Test die Fingerbewegung lesen kann.
  const merken = function (this: El, kf: unknown, opt: unknown) {
    animiert.push({ el: this, kf: kf as Array<Record<string, unknown>>, opt: opt as Record<string, unknown> });
    return { finished: Promise.resolve(), cancel() {}, onfinish: null };
  };
  vi.spyOn(El.prototype, 'animate').mockImplementation(merken as unknown as El['animate']);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const anleiter = () => import('../src/ui/anleiter');
const spotlight = () => import('../src/ui/spotlight');

function ansicht(teil: Partial<TutorialAnsicht> = {}): TutorialAnsicht {
  return {
    schritt: 'T01', kapitel: 2, kapitel_name: 'Erstes Netz', art: 'W', text: 'Das ist deine **Heizzentrale**.', wusstest_du: false,
    ziele: [], finger: 'aus', abdunkeln: 'alles', weiter: 'weiter', kamera: 'steht', kamera_ziele: [], kamera_grenze: false,
    spur: false, erreicht_zeigen: false, objekt_ids: { heizzentrale: 1, haus1: 2, haus2: 3, leitungsstueck: [] },
    normale_aktion: false, wiedereinstieg: false, ...teil,
  };
}
const PLATZ = { links: 12, unten: 12, breite: 432, figur_px: 112 as const };
const karte = (): El => a.doc.getElementById('anleiter') as El;

describe('NR13 Anleiter-Platz (DESIGN 13.3)', () => {
  it('test_nr13_platz_ohne_blatt', async () => {
    const { anleiterPlatz } = await anleiter();
    // 844 − 112 = 732 → höchstens 460; 667 − 112 = 555 → 460; 500 − 112 = 388
    expect(anleiterPlatz({ x: 0, y: 0, b: 844, h: 390 }, null, { breite: 844, hoehe: 390 })).toEqual({ links: 12, unten: 12, breite: 460, figur_px: 112 });
    expect(anleiterPlatz({ x: 0, y: 0, b: 667, h: 375 }, null, { breite: 667, hoehe: 375 })).toEqual({ links: 12, unten: 12, breite: 460, figur_px: 112 });
    expect(anleiterPlatz({ x: 0, y: 0, b: 500, h: 375 }, null, { breite: 500, hoehe: 375 }).breite).toBe(388);
  });

  it('test_nr13_platz_mit_seitenflaeche_844_und_667', async () => {
    const { anleiterPlatz } = await anleiter();
    // Seitenfläche 388 bzw. 306,8: frei 456 − 24 = 432; frei 360,2 − 24 = 336,2 → 336; Figur klein, weil 360,2 < 400
    expect(anleiterPlatz({ x: 0, y: 0, b: 456, h: 390 }, null, { breite: 844, hoehe: 390 })).toEqual({ links: 12, unten: 12, breite: 432, figur_px: 112 });
    expect(anleiterPlatz({ x: 0, y: 0, b: 360.2, h: 375 }, null, { breite: 667, hoehe: 375 })).toEqual({ links: 12, unten: 12, breite: 336, figur_px: 72 });
    // Zeichenleiste 216: frei 628 − 24 = 604 → 460; frei 451 − 24 = 427
    expect(anleiterPlatz({ x: 0, y: 0, b: 628, h: 390 }, null, { breite: 844, hoehe: 390 }).breite).toBe(460);
    expect(anleiterPlatz({ x: 0, y: 0, b: 451, h: 375 }, null, { breite: 667, hoehe: 375 })).toEqual({ links: 12, unten: 12, breite: 427, figur_px: 112 });
    // Grenze der kleinen Figur: genau 400 frei → groß, 399 → klein
    expect(anleiterPlatz({ x: 0, y: 0, b: 400, h: 375 }, null, { breite: 667, hoehe: 375 }).figur_px).toBe(112);
    expect(anleiterPlatz({ x: 0, y: 0, b: 399, h: 375 }, null, { breite: 667, hoehe: 375 }).figur_px).toBe(72);
    // Freie Fläche nicht am linken Rand: links = frei.x + 12
    expect(anleiterPlatz({ x: 100, y: 0, b: 456, h: 390 }, null, { breite: 844, hoehe: 390 }).links).toBe(112);
  });

  it('test_nr13_platz_ziel_unten_wechselt_nach_oben', async () => {
    const { anleiterPlatz } = await anleiter();
    const frei = { x: 0, y: 0, b: 844, h: 390 }, bild = { breite: 844, hoehe: 390 };
    // Oberkante der Karte 390 − 12 − 162 = 216; Wechsel, wenn Unterkante Ziel > 216 − 16 = 200
    expect(anleiterPlatz(frei, { x: 300, y: 150, b: 40, h: 50 }, bild)).toEqual({ links: 12, unten: 12, breite: 460, figur_px: 112 });
    expect(anleiterPlatz(frei, { x: 300, y: 151, b: 40, h: 50 }, bild)).toEqual({ links: 12, oben: 64, breite: 460, figur_px: 112 });
    // 667×375: Oberkante 375 − 174 = 201, Grenze 185
    expect(anleiterPlatz({ x: 0, y: 0, b: 667, h: 375 }, { x: 10, y: 145, b: 40, h: 40 }, { breite: 667, hoehe: 375 }).unten).toBe(12);
    expect(anleiterPlatz({ x: 0, y: 0, b: 667, h: 375 }, { x: 10, y: 146, b: 40, h: 40 }, { breite: 667, hoehe: 375 }).oben).toBe(64);
  });
});

describe('NR13 Anleiter-Karte', () => {
  it('test_nr13_anleiter_weiter_nur_bei_erklaer', async () => {
    const { anleiterZeigen, anleiterRechteck, anleiterAusblenden } = await anleiter();
    const weiter = vi.fn();
    // Handlungs-Schritt: kein Knopf
    anleiterZeigen(ansicht({ art: 'H', weiter: null, text: 'Tippe auf die Heizzentrale.' }), PLATZ, { weiter }, 0);
    const k = karte();
    expect(k.getAttribute('role')).toBe('status');
    expect(k.getAttribute('aria-live')).toBe('polite');
    expect(k.querySelectorAll('button')).toHaveLength(0);
    expect(k.klassen()).toContain('handlung');
    expect(k.querySelector('.anleiter-knopfzeile')).toBeNull();
    expect(k.style.left).toBe('12px');
    expect(k.style.width).toBe('432px');
    expect(sichtbarerText(k)).toContain('Simon');
    const punkte = k.querySelector('.kapitel-punkte')!;
    expect(punkte.getAttribute('aria-label')).toBe('Kapitel 2 von 6');
    expect(punkte.querySelectorAll('.punkt')).toHaveLength(6);
    expect(punkte.querySelectorAll('.punkt.an')).toHaveLength(2);

    // Warten: Wartetext mit Restzeit (10 000 − 2 500 ms = 7,5 s → aufgerundet „8s“), kein Knopf
    anleiterZeigen(ansicht({ weiter: 'wartet', warte_text: 'Philipp plant noch {Restzeit}.', warte_bis_ms: 10000 }), PLATZ, { weiter }, 2500);
    expect(karte().klassen()).not.toContain('handlung');
    expect(karte().querySelectorAll('button')).toHaveLength(0);
    expect(karte().querySelector('.anleiter-knopfzeile .gedaempft')!.textContent).toBe('Philipp plant noch 8s.');
    // Restzeit läuft ab: nach dem Ende 0s, nie negativ
    anleiterZeigen(ansicht({ weiter: 'wartet', warte_text: 'Noch {Restzeit}', warte_bis_ms: 10000 }), PLATZ, { weiter }, 12000);
    expect(karte().querySelector('.anleiter-knopfzeile .gedaempft')!.textContent).toBe('Noch 0s');

    // Erklär-Schritt: [Weiter] mit Kennung, Fokus darauf, Klick ruft weiter
    anleiterZeigen(ansicht({ weiter: 'weiter', knopf_hinweis: 'Tippe auf Weiter.' }), PLATZ, { weiter }, 0);
    const knopf = a.doc.getElementById('anleiter-weiter') as El;
    expect(knopf).not.toBeNull();
    expect(knopf.tag).toBe('button');
    expect(knopf.klassen()).toEqual(expect.arrayContaining(['knopf', 'los', 'klein']));
    expect(knopf.textContent).toBe('Weiter');
    expect(a.doc.activeElement).toBe(knopf);
    expect(karte().querySelector('.anleiter-knopfzeile .gedaempft')!.textContent).toBe('Tippe auf Weiter.');
    knopf.click();
    expect(weiter).toHaveBeenCalledTimes(1);

    // [Los geht’s] und „Wusstest du?“-Chip
    anleiterZeigen(ansicht({ weiter: 'los', wusstest_du: true }), { links: 12, oben: 64, breite: 336, figur_px: 72 }, { weiter }, 0);
    expect((a.doc.getElementById('anleiter-weiter') as El).textContent).toBe('Los geht’s');
    expect(karte().querySelector('.chip.gold')!.textContent).toBe('Wusstest du?');
    expect(karte().style.top).toBe('64px');
    expect(karte().klassen()).toContain('figur-klein');
    // Nur eine Karte im Dokument, egal wie oft gezeigt
    expect(a.doc.querySelectorAll('#anleiter')).toHaveLength(1);

    karte().rechteck = { left: 12, top: 64, right: 348, bottom: 226, width: 336, height: 162, x: 12, y: 64 };
    expect(anleiterRechteck()).toEqual({ x: 12, y: 64, b: 336, h: 162 });
    anleiterAusblenden();
    expect(a.doc.getElementById('anleiter')).toBeNull();
    expect(anleiterRechteck()).toBeNull();
  });

  it('test_nr13_fett_ohne_html', async () => {
    const { anleiterZeigen } = await anleiter();
    anleiterZeigen(ansicht({ text: 'Das ist ein **Wärmenetz** mit <b>x</b> und **offen' }), PLATZ, { weiter() {} }, 0);
    const text = karte().querySelector('.anleiter-text')!;
    const fett = text.querySelectorAll('strong');
    expect(fett).toHaveLength(1);
    expect(fett[0].textContent).toBe('Wärmenetz');
    expect(text.querySelectorAll('b')).toHaveLength(0);
    expect(text.textContent).toBe('Das ist ein Wärmenetz mit <b>x</b> und **offen');
    expect(text.kinder.filter((k) => k instanceof TextKnoten).map((k) => k.textContent)).toEqual(['Das ist ein ', ' mit <b>x</b> und **offen']);
  });

  it('verwendet bei Simon und Philipp von Anfang an nur das Foto', async () => {
    vi.useFakeTimers();
    const { sprecherZeigen, sprecherAktiv } = await import('../src/ui/sprecher');
    expect(sprecherAktiv()).toBe(false);
    sprecherZeigen('Simon', 'Hallo!');
    expect(sprecherAktiv()).toBe(true);
    expect(a.doc.querySelector('#sprecher .sprecher-bild.foto img')?.getAttribute('src')).toBe('figuren/simon.webp');
    expect(a.doc.querySelector('#sprecher .sprecher-bild svg')).toBeNull();
    sprecherZeigen('Philipp', 'Ich plane.');
    vi.advanceTimersByTime(3800 + 6 * 20 + 350);
    expect(a.doc.querySelector('#sprecher .sprecher-bild.foto img')?.getAttribute('src')).toBe('figuren/philipp.webp');
    expect(a.doc.querySelector('#sprecher .sprecher-bild svg')).toBeNull();
    vi.advanceTimersByTime(3800 + 10 * 20 + 350);
    expect(sprecherAktiv()).toBe(false);
    const { anleiterZeigen } = await anleiter();
    anleiterZeigen(ansicht(), PLATZ, { weiter() {} }, 0);
    expect(karte().querySelector('.sprecher-bild.foto img')?.getAttribute('src')).toBe('figuren/simon.webp');
    expect(karte().querySelector('.sprecher-bild svg')).toBeNull();
  });
});

describe('NR13 Eingabesperre (AE-NR13-6)', () => {
  const lage = (teil: Partial<import('../src/ui/spotlight').SperrLage> = {}): import('../src/ui/spotlight').SperrLage => ({
    fahrt: false, anleiter: { x: 12, y: 216, b: 460, h: 162 }, abdunkeln: 'alles', art: 'H', loecher: [{ x: 300, y: 100, b: 60, h: 40 }], ...teil,
  });

  it('test_nr13_sperre_regeln_je_abdunkeln', async () => {
    const { eingabeErlaubtBei } = await spotlight();
    // Fall 1: Fahrt – still, auch auf der Anleiter-Karte und im Loch
    expect(eingabeErlaubtBei(lage({ fahrt: true }), 20, 300, false)).toBe('still');
    expect(eingabeErlaubtBei(lage({ fahrt: true }), 330, 120, false)).toBe('still');
    // Fall 2: Anleiter-Karte immer durch (auch W, auch nur_hud im HUD)
    expect(eingabeErlaubtBei(lage({ art: 'W' }), 20, 300, false)).toBe('durch');
    expect(eingabeErlaubtBei(lage({ abdunkeln: 'nur_hud' }), 12, 216, true)).toBe('durch'); // Ecke zählt dazu
    // Fall 3: nur_hud – alles außerhalb von #hud durch, im HUD daneben
    expect(eingabeErlaubtBei(lage({ abdunkeln: 'nur_hud', loecher: [] }), 700, 300, false)).toBe('durch');
    expect(eingabeErlaubtBei(lage({ abdunkeln: 'nur_hud', loecher: [] }), 700, 20, true)).toBe('daneben');
    // Fall 4: alles / nichts – H: im Loch durch (Rand eingeschlossen), außen daneben; W: auch im Loch daneben
    for (const abdunkeln of ['alles', 'nichts'] as const) {
      expect(eingabeErlaubtBei(lage({ abdunkeln }), 330, 120, false)).toBe('durch');
      expect(eingabeErlaubtBei(lage({ abdunkeln }), 300, 100, false)).toBe('durch');
      expect(eingabeErlaubtBei(lage({ abdunkeln }), 360, 140, false)).toBe('durch');
      expect(eingabeErlaubtBei(lage({ abdunkeln }), 361, 140, false)).toBe('daneben');
      expect(eingabeErlaubtBei(lage({ abdunkeln }), 600, 50, false)).toBe('daneben');
      expect(eingabeErlaubtBei(lage({ abdunkeln, art: 'W' }), 330, 120, false)).toBe('daneben');
      // Im HUD ändert bei alles/nichts nichts – entscheidend ist das Loch
      expect(eingabeErlaubtBei(lage({ abdunkeln }), 330, 120, true)).toBe('durch');
    }
    // Zwei Löcher (T03): beide durch
    const zwei = lage({ loecher: [{ x: 10, y: 10, b: 50, h: 30 }, { x: 100, y: 10, b: 50, h: 30 }] });
    expect(eingabeErlaubtBei(zwei, 30, 20, false)).toBe('durch');
    expect(eingabeErlaubtBei(zwei, 120, 20, false)).toBe('durch');
    expect(eingabeErlaubtBei(zwei, 80, 20, false)).toBe('daneben');
    // Ohne Anleiter-Karte
    expect(eingabeErlaubtBei(lage({ anleiter: null }), 20, 300, false)).toBe('daneben');
  });

  it('test_nr13_sperre_faengt_daneben', async () => {
    const { eingabeSperre, eingabeErlaubt } = await spotlight();
    expect(eingabeErlaubt(600, 50)).toBe(true); // ohne Sperre
    const daneben = vi.fn();
    let aktuell = lage();
    const lageFn = vi.fn(() => aktuell);
    eingabeSperre({ lage: lageFn, daneben, tab_ziele: () => [] });
    const ziel = a.app;
    // Alle Ereignisse in der Capture-Phase am window
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'click', 'touchstart', 'wheel', 'keydown']) {
      expect(fenster.liste.filter((e) => e.typ === t)).toHaveLength(1);
      expect(fenster.liste.find((e) => e.typ === t)!.opt).toMatchObject({ capture: true });
    }
    // Außerhalb: daneben einmal, kommt nicht an
    const r = fenster.feuern('pointerdown', { pointerId: 1, clientX: 600, clientY: 50, target: ziel });
    expect(r).toEqual({ angekommen: false, verhindert: true });
    expect(daneben).toHaveBeenCalledTimes(1);
    // Die übrigen Ereignisse derselben Berührung: abgefangen, kein weiteres daneben
    expect(fenster.feuern('touchstart', { touches: [{ clientX: 600, clientY: 50 }], target: ziel }).angekommen).toBe(false);
    expect(fenster.feuern('click', { clientX: 600, clientY: 50, target: ziel }).angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(1);
    // Ein Klick ohne vorheriges pointerdown (eigene Berührung) meldet daneben
    expect(fenster.feuern('click', { clientX: 600, clientY: 50, target: ziel }).angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(2);
    // Mausrad außerhalb: daneben
    expect(fenster.feuern('wheel', { clientX: 600, clientY: 50, target: ziel }).angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(3);
    // Im Loch: kommt an
    expect(fenster.feuern('pointerdown', { pointerId: 2, clientX: 330, clientY: 120, target: ziel }).angekommen).toBe(true);
    expect(fenster.feuern('click', { clientX: 330, clientY: 120, target: ziel }).angekommen).toBe(true);
    expect(daneben).toHaveBeenCalledTimes(3);
    expect(eingabeErlaubt(330, 120)).toBe(true);
    expect(eingabeErlaubt(600, 50)).toBe(false);
    // Lage wird bei jedem Ereignis neu gelesen: Loch wandert
    const vorher = lageFn.mock.calls.length;
    aktuell = lage({ loecher: [{ x: 580, y: 30, b: 40, h: 40 }] });
    expect(fenster.feuern('pointerdown', { pointerId: 3, clientX: 600, clientY: 50, target: ziel }).angekommen).toBe(true);
    expect(lageFn.mock.calls.length).toBe(vorher + 1);
    expect(eingabeErlaubt(330, 120)).toBe(false);
    // Fahrt: still – abgefangen ohne daneben
    aktuell = lage({ fahrt: true });
    expect(fenster.feuern('pointerdown', { pointerId: 4, clientX: 20, clientY: 300, target: ziel }).angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(3);
    // nur_hud: Ziel in #hud → daneben, außerhalb → durch (Ziel entscheidet, nicht die Lage)
    aktuell = lage({ abdunkeln: 'nur_hud', loecher: [] });
    const hud = a.doc.createElement('div'); hud.id = 'hud'; const pille = a.doc.createElement('button'); hud.append(pille); a.app.append(hud);
    expect(fenster.feuern('pointerdown', { pointerId: 5, clientX: 700, clientY: 300, target: pille }).angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(4);
    expect(fenster.feuern('pointerdown', { pointerId: 6, clientX: 700, clientY: 300, target: ziel }).angekommen).toBe(true);
    // Tasten: nur Tab und Enter
    expect(fenster.feuern('keydown', { key: 'ArrowLeft', target: ziel }).angekommen).toBe(false);
    expect(fenster.feuern('keydown', { key: '+', target: ziel }).angekommen).toBe(false);
    expect(fenster.feuern('keydown', { key: 'Enter', target: ziel }).angekommen).toBe(true);
    expect(daneben).toHaveBeenCalledTimes(4);
    // Ausschalten: Listener weg
    eingabeSperre(null);
    expect(fenster.liste).toHaveLength(0);
    expect(eingabeErlaubt(600, 50)).toBe(true);
  });

  it('test_nr13_sperre_tab_nur_ziel_und_weiter', async () => {
    const { eingabeSperre } = await spotlight();
    const z1 = a.doc.createElement('button'), z2 = a.doc.createElement('button'), fremd = a.doc.createElement('button');
    a.app.append(z1, z2, fremd);
    eingabeSperre({ lage: () => lage(), daneben() {}, tab_ziele: () => [z1, z2] as unknown as HTMLElement[] });
    fremd.focus();
    expect(fenster.feuern('keydown', { key: 'Tab', target: fremd }).verhindert).toBe(true);
    expect(a.doc.activeElement).toBe(z1);
    fenster.feuern('keydown', { key: 'Tab', target: z1 });
    expect(a.doc.activeElement).toBe(z2);
    fenster.feuern('keydown', { key: 'Tab', target: z2 });
    expect(a.doc.activeElement).toBe(z1);
    fenster.feuern('keydown', { key: 'Tab', shiftKey: true, target: z1 });
    expect(a.doc.activeElement).toBe(z2);
  });

  it('test_nr13_sperre_finger_ueber_schrittwechsel', async () => {
    const { eingabeSperre } = await spotlight();
    const daneben = vi.fn();
    let aktuell = lage();
    const s = { lage: () => aktuell, daneben, tab_ziele: () => [] };
    eingabeSperre(s);
    const t = a.app;
    expect(fenster.feuern('pointerdown', { pointerId: 1, clientX: 330, clientY: 120, target: t }).angekommen).toBe(true);
    // Schrittwechsel: anderes Loch, dann Fahrt
    aktuell = lage({ loecher: [{ x: 700, y: 300, b: 40, h: 40 }] });
    expect(fenster.feuern('pointermove', { pointerId: 1, clientX: 500, clientY: 50, target: t }).angekommen).toBe(true);
    aktuell = lage({ fahrt: true });
    expect(fenster.feuern('pointermove', { pointerId: 1, clientX: 510, clientY: 50, target: t }).angekommen).toBe(true);
    expect(daneben).not.toHaveBeenCalled();
    expect(fenster.feuern('pointerup', { pointerId: 1, clientX: 510, clientY: 50, target: t }).angekommen).toBe(true);
    aktuell = lage({ loecher: [{ x: 700, y: 300, b: 40, h: 40 }] });
    // Finger 1 ist fertig: weiteres Bewegen außerhalb wird abgefangen (ohne daneben)
    expect(fenster.feuern('pointermove', { pointerId: 1, clientX: 500, clientY: 50, target: t }).angekommen).toBe(false);
    expect(daneben).not.toHaveBeenCalled();
    // Finger 2 setzt außerhalb auf: daneben einmal, auch das Bewegen meldet nichts mehr
    expect(fenster.feuern('pointerdown', { pointerId: 2, clientX: 500, clientY: 50, target: t }).angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(1);
    expect(fenster.feuern('pointermove', { pointerId: 2, clientX: 505, clientY: 50, target: t }).angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(1);
    // Ende eines Fingers kommt immer an – auch eines nie gesehenen
    expect(fenster.feuern('pointerup', { pointerId: 2, clientX: 505, clientY: 50, target: t }).angekommen).toBe(true);
    expect(fenster.feuern('pointercancel', { pointerId: 3, clientX: 505, clientY: 50, target: t }).angekommen).toBe(true);
    expect(daneben).toHaveBeenCalledTimes(1);
    // Neu setzen leert die Finger-Liste
    expect(fenster.feuern('pointerdown', { pointerId: 4, clientX: 710, clientY: 310, target: t }).angekommen).toBe(true);
    eingabeSperre(null);
    eingabeSperre(s);
    expect(fenster.feuern('pointermove', { pointerId: 4, clientX: 500, clientY: 50, target: t }).angekommen).toBe(false);
  });
});

describe('NR13 Spotlight', () => {
  it('test_nr13_abdunkel_pfad', async () => {
    const { abdunkelPfad } = await spotlight();
    // Ellipse um 60×40 bei (100,100) + 12: rx = 30·√2 + 12 = 54,43; ry = 20·√2 + 12 = 40,28; Mitte (130,120)
    // Knopf 80×44 bei (200,300) + 8 je Seite → (192,292) 96×60, Radius 12 + 8 = 20
    const pfad = abdunkelPfad(844, 390, [
      { r: { x: 100, y: 100, b: 60, h: 40 }, form: 'ellipse' },
      { r: { x: 200, y: 300, b: 80, h: 44 }, form: 'rund', radius_px: 12 },
    ], []);
    expect(pfad).toBe('M0 0H844V390H0Z'
      + 'M75.57 120A54.43 40.28 0 1 0 184.43 120A54.43 40.28 0 1 0 75.57 120Z'
      + 'M212 292H268A20 20 0 0 1 288 312V332A20 20 0 0 1 268 352H212A20 20 0 0 1 192 332V312A20 20 0 0 1 212 292Z');
    expect(pfad.match(/Z/g)).toHaveLength(3);
    // Ohne Radius: 0 + 8; Radius höchstens halbe kürzere Seite (Rechteck 20×10 + 8 → 36×26, Radius 13)
    expect(abdunkelPfad(100, 100, [{ r: { x: 10, y: 10, b: 20, h: 10 }, form: 'rund' }], []))
      .toBe('M0 0H100V100H0ZM10 2H30A8 8 0 0 1 38 10V20A8 8 0 0 1 30 28H10A8 8 0 0 1 2 20V10A8 8 0 0 1 10 2Z');
    expect(abdunkelPfad(100, 100, [{ r: { x: 10, y: 10, b: 20, h: 10 }, form: 'rund', radius_px: 40 }], []))
      .toBe('M0 0H100V100H0ZM15 2H25A13 13 0 0 1 38 15V15A13 13 0 0 1 25 28H15A13 13 0 0 1 2 15V15A13 13 0 0 1 15 2Z');
    // Hochkant (10×20 + 8 → 26×36): hier begrenzt die halbe Breite 13
    expect(abdunkelPfad(100, 100, [{ r: { x: 10, y: 10, b: 10, h: 20 }, form: 'rund', radius_px: 40 }], []))
      .toBe('M0 0H100V100H0ZM15 2H15A13 13 0 0 1 28 15V25A13 13 0 0 1 15 38H15A13 13 0 0 1 2 25V15A13 13 0 0 1 15 2Z');
    // nur: genau diese Rechtecke dunkel, kein Außenrechteck, Löcher zählen nicht
    const nur = abdunkelPfad(844, 390, [{ r: { x: 1, y: 1, b: 2, h: 2 }, form: 'ellipse' }],
      [{ x: 0, y: 0, b: 100, h: 56 }, { x: 300, y: 4, b: 200, h: 48 }, { x: 780, y: 200, b: 56, h: 100 }, { x: 760, y: 310, b: 72, h: 72 }]);
    expect(nur).toBe('M0 0H100V56H0ZM300 4H500V52H300ZM780 200H836V300H780ZM760 310H832V382H760Z');
    // Keine Löcher: nur das Außenrechteck
    expect(abdunkelPfad(844, 390, [], [])).toBe('M0 0H844V390H0Z');
  });

  it('test_nr13_spotlight_setzen_und_aus', async () => {
    const { spotlightSetzen, spotlightAus } = await spotlight();
    fenster.innerWidth = 844; fenster.innerHeight = 390;
    spotlightSetzen({ loecher: [{ r: { x: 200, y: 300, b: 80, h: 44 }, form: 'rund', radius_px: 12 }, { r: { x: 100, y: 100, b: 60, h: 40 }, form: 'ellipse' }], abdunkeln: 'alles', finger: null, ruhig: false, hud: [] });
    const ebene = a.doc.getElementById('spotlight') as El;
    expect(ebene.getAttribute('aria-hidden')).toBe('true');
    const dunkel = ebene.querySelector('.spot-dunkel')!;
    expect(String(dunkel.style.clipPath)).toBe("path(evenodd, 'M0 0H844V390H0ZM212 292H268A20 20 0 0 1 288 312V332A20 20 0 0 1 268 352H212A20 20 0 0 1 192 332V312A20 20 0 0 1 212 292ZM75.57 120A54.43 40.28 0 1 0 184.43 120A54.43 40.28 0 1 0 75.57 120Z')");
    const ringe = ebene.querySelectorAll('.spot-ring');
    expect(ringe).toHaveLength(2);
    // Ring 1: Knopf + 8 → (192,292) 96×60, Radius 20; Ring 2: Ellipse-Umriss (75,57|79,72) 108,85×80,57
    expect([ringe[0].style.left, ringe[0].style.top, ringe[0].style.width, ringe[0].style.height, ringe[0].style.borderRadius]).toEqual(['192px', '292px', '96px', '60px', '20px']);
    expect([ringe[1].style.left, ringe[1].style.top, ringe[1].style.width, ringe[1].style.height, ringe[1].style.borderRadius]).toEqual(['75.57px', '79.72px', '108.85px', '80.57px', '50%']);
    expect(sichtbar(dunkel)).toBe(false); // aria-hidden: Vorleser übergeht es
    expect(dunkel.hidden).toBe(false);
    // nur_hud: nur die HUD-Rechtecke dunkel
    spotlightSetzen({ loecher: [], abdunkeln: 'nur_hud', finger: null, ruhig: false, hud: [{ x: 0, y: 0, b: 100, h: 56 }] });
    expect(String((a.doc.getElementById('spotlight') as El).querySelector('.spot-dunkel')!.style.clipPath)).toBe("path(evenodd, 'M0 0H100V56H0Z')");
    // nichts: kein Abdunkeln, eine Ebene bleibt
    spotlightSetzen({ loecher: [], abdunkeln: 'nichts', finger: null, ruhig: false, hud: [] });
    expect((a.doc.getElementById('spotlight') as El).querySelector('.spot-dunkel')!.hidden).toBe(true);
    expect(a.doc.querySelectorAll('#spotlight')).toHaveLength(1);
    spotlightAus();
    expect(a.doc.getElementById('spotlight')).toBeNull();
  });

  const lageBei = (kf: Array<Record<string, unknown>>, anteil: number): [number, number] => {
    const pos = (k: Record<string, unknown>): [number, number] => { const m = String(k.transform).match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/)!; return [Number(m[1]), Number(m[2])]; };
    for (let i = 1; i < kf.length; i++) {
      const o0 = Number(kf[i - 1].offset), o1 = Number(kf[i].offset);
      if (anteil >= o0 && anteil <= o1) { const [x0, y0] = pos(kf[i - 1]), [x1, y1] = pos(kf[i]); const f = o1 === o0 ? 0 : (anteil - o0) / (o1 - o0); return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]; }
    }
    throw new Error('Anteil außerhalb der Keyframes');
  };

  it('test_nr13_finger_spur', async () => {
    const { spotlightSetzen } = await spotlight();
    // Spur 4 × 40 px senkrecht + 40 px waagrecht = 200 px; nach 1.200 ms von 2.400 ms (Zyklus 3.000 ms) halbe Strecke = (100,200)
    const punkte = [[100, 100], [100, 140], [100, 180], [100, 220], [100, 260], [140, 260]] as const;
    spotlightSetzen({ loecher: [], abdunkeln: 'nur_hud', finger: { art: 'spur', punkte }, ruhig: false, hud: [] });
    const finger = a.doc.querySelector('#spotlight .spot-finger') as El;
    expect(finger.getAttribute('aria-hidden')).toBe('true');
    expect(finger.querySelector('svg')!.getAttribute('quelle')).toContain('<svg');
    const anim = animiert.filter((x) => x.el === finger && x.kf.some((k) => 'transform' in k));
    expect(anim).toHaveLength(1);
    expect(anim[0].opt).toMatchObject({ duration: 3000, iterations: Infinity });
    expect(lageBei(anim[0].kf, 1200 / 3000)).toEqual([100, 200]);
    expect(lageBei(anim[0].kf, 0)).toEqual([100, 100]);
    expect(lageBei(anim[0].kf, 2400 / 3000)).toEqual([140, 260]);
    expect(lageBei(anim[0].kf, 1)).toEqual([140, 260]);
    // Am Ende blendet er aus, die Pause bleibt unsichtbar
    expect(anim[0].kf.at(-1)!.opacity).toBe(0);
    // Gleicher Finger erneut gesetzt: Bewegung läuft weiter, wird nicht neu gestartet
    spotlightSetzen({ loecher: [], abdunkeln: 'nur_hud', finger: { art: 'spur', punkte }, ruhig: false, hud: [] });
    expect(animiert.filter((x) => x.kf.some((k) => 'transform' in k))).toHaveLength(1);

    // Weniger Bewegung: steht still am ersten Punkt, keine Animation
    animiert.length = 0;
    spotlightSetzen({ loecher: [], abdunkeln: 'nur_hud', finger: { art: 'spur', punkte }, ruhig: true, hud: [] });
    const still = a.doc.querySelector('#spotlight .spot-finger') as El;
    expect(still.style.transform).toBe('translate(100px, 100px)');
    expect(animiert).toHaveLength(0);
  });

  it('test_nr13_finger_tippen', async () => {
    const { spotlightSetzen } = await spotlight();
    // Ziel (300,100) 60×40 → Mitte (330,120); Hand von rechts unten tippt 6 px schräg zum Ziel: je Achse 6/√2 = 4,24
    spotlightSetzen({ loecher: [], abdunkeln: 'alles', finger: { art: 'tippen', ziel: { x: 300, y: 100, b: 60, h: 40 } }, ruhig: false, hud: [] });
    const finger = a.doc.querySelector('#spotlight .spot-finger') as El;
    expect(finger.style.left).toBe('330px');
    expect(finger.style.top).toBe('120px');
    expect(finger.klassen()).not.toContain('von-links');
    const tipp = animiert.find((x) => x.el === finger && x.kf.some((k) => 'transform' in k))!;
    // 400 ms Tippen + 1.200 ms Ruhe, erst nach 600 ms
    expect(tipp.opt).toMatchObject({ duration: 1600, delay: 600, iterations: Infinity });
    expect(tipp.kf.map((k) => [k.offset, k.transform])).toEqual([
      [0, 'translate(0px, 0px)'], [0.125, 'translate(-4.24px, -4.24px)'], [0.25, 'translate(0px, 0px)'], [1, 'translate(0px, 0px)'],
    ]);
    const ein = animiert.find((x) => x.el === finger && x.kf.some((k) => 'opacity' in k))!;
    expect(ein.opt).toMatchObject({ delay: 600, fill: 'both' });
    // Ziel am rechten Rand: Hand kommt von links unten, tippt nach rechts oben
    animiert.length = 0;
    spotlightSetzen({ loecher: [], abdunkeln: 'alles', finger: { art: 'tippen', ziel: { x: 800, y: 100, b: 40, h: 40 } }, ruhig: false, hud: [] });
    const links = a.doc.querySelector('#spotlight .spot-finger') as El;
    expect(links.klassen()).toContain('von-links');
    expect(animiert.find((x) => x.kf.some((k) => 'transform' in k))!.kf[1].transform).toBe('translate(4.24px, -4.24px)');
    // Weniger Bewegung: Finger steht, sofort sichtbar
    animiert.length = 0;
    spotlightSetzen({ loecher: [], abdunkeln: 'alles', finger: { art: 'tippen', ziel: { x: 300, y: 100, b: 60, h: 40 } }, ruhig: true, hud: [] });
    expect(animiert).toHaveLength(0);
    // Kein Finger
    spotlightSetzen({ loecher: [], abdunkeln: 'alles', finger: null, ruhig: false, hud: [] });
    expect(a.doc.querySelector('#spotlight .spot-finger')).toBeNull();
  });

  it('test_nr13_stupsen', async () => {
    const { spotlightSetzen, stupsen } = await spotlight();
    spotlightSetzen({ loecher: [{ r: { x: 10, y: 10, b: 40, h: 40 }, form: 'rund' }], abdunkeln: 'alles', finger: { art: 'tippen', ziel: { x: 10, y: 10, b: 40, h: 40 } }, ruhig: false, hud: [] });
    animiert.length = 0;
    stupsen(false);
    const ring = a.doc.querySelector('.spot-ring') as El;
    expect(ring.klassen()).toContain('stupst');
    // Der Finger erscheint sofort neu (ohne die 600 ms Verzögerung)
    expect(animiert.filter((x) => x.kf.some((k) => 'transform' in k)).map((x) => x.opt.delay)).toEqual([0]);
    ring.ausloesen('animationend');
    expect(ring.klassen()).not.toContain('stupst');
    stupsen(true);
    expect(ring.klassen()).toContain('stupst-ruhig');
    expect(ring.klassen()).not.toContain('stupst');
    // Ohne Spotlight: nichts passiert, kein Fehler
    const { spotlightAus } = await spotlight();
    spotlightAus();
    expect(() => stupsen(false)).not.toThrow();
  });

  it('test_nr13_ersatz_ziel_vorlesename', async () => {
    const { ersatzZiel, KARTEN_VORLESENAME } = await spotlight();
    expect(KARTEN_VORLESENAME).toEqual({ heizzentrale: 'Heizzentrale', haus1: 'Haus 1', haus2: 'Haus 2' });
    const enter = vi.fn();
    ersatzZiel({ r: { x: 300, y: 100, b: 60, h: 40 }, name: KARTEN_VORLESENAME.haus1, enter });
    const el = a.doc.querySelector('.ersatz-ziel') as El;
    expect(el.getAttribute('aria-label')).toBe('Haus 1');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('role')).toBe('button');
    expect([el.style.left, el.style.top, el.style.width, el.style.height]).toEqual(['300px', '100px', '60px', '40px']);
    el.ausloesen('keydown', { key: 'a' });
    expect(enter).not.toHaveBeenCalled();
    el.ausloesen('keydown', { key: 'Enter' });
    expect(enter).toHaveBeenCalledTimes(1);
    // Neues Ziel ersetzt das alte, Enter ruft nur das neue
    const enter2 = vi.fn();
    ersatzZiel({ r: { x: 0, y: 0, b: 10, h: 10 }, name: KARTEN_VORLESENAME.heizzentrale, enter: enter2 });
    expect(a.doc.querySelectorAll('.ersatz-ziel')).toHaveLength(1);
    (a.doc.querySelector('.ersatz-ziel') as El).ausloesen('keydown', { key: 'Enter' });
    expect(enter).toHaveBeenCalledTimes(1);
    expect(enter2).toHaveBeenCalledTimes(1);
    ersatzZiel(null);
    expect(a.doc.querySelector('.ersatz-ziel')).toBeNull();
  });

  it('test_nr13_info_kapsel_lage', async () => {
    const { infoKapsel } = await spotlight();
    // Loch (300,150) 60×40: Mitte x 330; oben 150 − 8 − 26 = 116
    infoKapsel('3.000 kWh im Jahr · bis 4 kW', { x: 300, y: 150, b: 60, h: 40 });
    const k = a.doc.querySelector('.info-kapsel') as El;
    expect(k.klassen()).toContain('chip');
    expect(k.getAttribute('aria-hidden')).toBe('true');
    expect(k.textContent).toBe('3.000 kWh im Jahr · bis 4 kW');
    expect([k.style.left, k.style.top]).toEqual(['330px', '116px']);
    // Genau auf der Grenze: 98 − 34 = 64 → bleibt darüber
    infoKapsel('x', { x: 300, y: 98, b: 60, h: 40 });
    expect((a.doc.querySelector('.info-kapsel') as El).style.top).toBe('64px');
    // Zu wenig Platz: 97 − 34 = 63 < 64 → 8 px unter dem Loch: 97 + 40 + 8 = 145
    infoKapsel('x', { x: 300, y: 97, b: 60, h: 40 });
    expect((a.doc.querySelector('.info-kapsel') as El).style.top).toBe('145px');
    expect(a.doc.querySelectorAll('.info-kapsel')).toHaveLength(1);
    infoKapsel(null, null);
    expect(a.doc.querySelector('.info-kapsel')).toBeNull();
  });

  it('test_nr13_blatt_scrollt_zum_ziel', async () => {
    const { zielSichtbarMachen } = await spotlight();
    const inhalt = a.doc.createElement('div'); inhalt.className = 'inhalt';
    const ziel = a.doc.createElement('div'); inhalt.append(ziel); a.app.append(inhalt);
    inhalt.rechteck = { left: 0, top: 100, right: 300, bottom: 300, width: 300, height: 200, x: 0, y: 100 };
    // Unter dem sichtbaren Bereich: 394 − 300 + 8 = 102 nach unten
    ziel.rechteck = { left: 0, top: 350, right: 300, bottom: 394, width: 300, height: 44, x: 0, y: 350 };
    const fertig = vi.fn();
    zielSichtbarMachen(ziel as unknown as HTMLElement, true, fertig);
    expect(inhalt.scrollTop).toBe(102);
    expect(fertig).toHaveBeenCalledTimes(1);
    // Über dem sichtbaren Bereich: 80 − 100 − 8 = −28 (von 102 auf 74), auch ohne Animation sofort erreichbar
    ziel.rechteck = { left: 0, top: 80, right: 300, bottom: 124, width: 300, height: 44, x: 0, y: 80 };
    const fertig2 = vi.fn();
    zielSichtbarMachen(ziel as unknown as HTMLElement, false, fertig2);
    expect(inhalt.scrollTop).toBe(74);
    expect(fertig2).toHaveBeenCalledTimes(1);
    // Schon sichtbar (mit 8 px Abstand genau auf der Grenze): kein Scrollen, sofort fertig
    ziel.rechteck = { left: 0, top: 108, right: 300, bottom: 292, width: 300, height: 184, x: 0, y: 108 };
    const fertig3 = vi.fn();
    zielSichtbarMachen(ziel as unknown as HTMLElement, false, fertig3);
    expect(inhalt.scrollTop).toBe(74);
    expect(fertig3).toHaveBeenCalledTimes(1);
    // Kein scrollender Vorfahr: sofort fertig
    const frei = a.doc.createElement('div'); a.app.append(frei);
    const fertig4 = vi.fn();
    zielSichtbarMachen(frei as unknown as HTMLElement, false, fertig4);
    expect(fertig4).toHaveBeenCalledTimes(1);
  });
});

// Fix-Runde P3a: Tastatur-Klicks, Finger-Aufnahme nur bei pointerdown, Mausrad-Takt, Ausblenden mit Blende, Wackeln des
// Schließen-Knopfs. Erwartete Werte von Hand: Blende 200 ms (menue.zeit_ms.anleiter_wechsel), Mausrad höchstens ein
// „daneben“ je 200 ms.
describe('NR13 Fix-Runde P3a', () => {
  const lage = (teil: Partial<import('../src/ui/spotlight').SperrLage> = {}): import('../src/ui/spotlight').SperrLage => ({
    fahrt: false, anleiter: { x: 12, y: 216, b: 460, h: 162 }, abdunkeln: 'alles', art: 'H', loecher: [{ x: 300, y: 100, b: 60, h: 40 }], ...teil,
  });

  it('test_nr13_fix_enter_auf_weiter_ruft_weiter_kein_daneben', async () => {
    const { anleiterZeigen } = await anleiter();
    const { eingabeSperre } = await spotlight();
    const weiter = vi.fn(), daneben = vi.fn();
    anleiterZeigen(ansicht({ weiter: 'weiter' }), PLATZ, { weiter }, 0);
    const knopf = a.doc.getElementById('anleiter-weiter') as El;
    // tab_ziele ohne den Knopf: hier entscheidet allein, dass er in #anleiter liegt
    eingabeSperre({ lage: () => lage({ art: 'W' }), daneben, tab_ziele: () => [] });
    // Enter auf dem Knopf: Chromium schickt einen click mit detail 0 an Lage 0|0 (außerhalb der Karte)
    const r = fenster.feuern('click', { detail: 0, clientX: 0, clientY: 0, target: knopf });
    expect(r).toEqual({ angekommen: true, verhindert: false });
    if (r.angekommen) knopf.click();
    expect(weiter).toHaveBeenCalledTimes(1);
    expect(daneben).not.toHaveBeenCalled();
    // Leertaste auf dem Knopf darf nicht schon beim Drücken abgefangen werden, sonst kommt gar kein click
    expect(fenster.feuern('keydown', { key: ' ', target: knopf }).angekommen).toBe(true);
    // Ein echter Mausklick an 0|0 (detail 1) bleibt daneben
    expect(fenster.feuern('click', { detail: 1, clientX: 0, clientY: 0, target: knopf }).angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(1);
  });

  it('test_nr13_fix_enter_auf_ziel_knopf_kein_daneben', async () => {
    const { eingabeSperre } = await spotlight();
    const daneben = vi.fn();
    const ziel = a.doc.createElement('button'), innen = a.doc.createElement('span'), fremd = a.doc.createElement('button');
    ziel.append(innen); a.app.append(ziel, fremd);
    eingabeSperre({ lage: () => lage(), daneben, tab_ziele: () => [ziel] as unknown as HTMLElement[] });
    expect(fenster.feuern('click', { detail: 0, clientX: 0, clientY: 0, target: ziel }).angekommen).toBe(true);
    // Auch ein Kind des Ziel-Knopfs zählt zum Ziel
    expect(fenster.feuern('click', { detail: 0, clientX: 0, clientY: 0, target: innen }).angekommen).toBe(true);
    expect(fenster.feuern('keydown', { key: ' ', target: ziel }).angekommen).toBe(true);
    expect(daneben).not.toHaveBeenCalled();
    // Tastatur-Klick auf ein fremdes Element bleibt gesperrt, ebenso die Leertaste dort
    expect(fenster.feuern('click', { detail: 0, clientX: 0, clientY: 0, target: fremd }).angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(1);
    expect(fenster.feuern('keydown', { key: ' ', target: fremd }).angekommen).toBe(false);
  });

  it('test_nr13_fix_nur_pointerdown_nimmt_finger_auf', async () => {
    const { eingabeSperre } = await spotlight();
    const daneben = vi.fn();
    let aktuell = lage();
    eingabeSperre({ lage: () => aktuell, daneben, tab_ziele: () => [] });
    const t = a.app;
    // touchstart und wheel im Loch gehen durch, tragen aber keinen Finger ein
    expect(fenster.feuern('touchstart', { pointerId: 7, touches: [{ clientX: 330, clientY: 120 }], target: t }).angekommen).toBe(true);
    expect(fenster.feuern('wheel', { pointerId: 8, clientX: 330, clientY: 120, target: t }).angekommen).toBe(true);
    aktuell = lage({ loecher: [{ x: 700, y: 300, b: 40, h: 40 }] });
    expect(fenster.feuern('pointermove', { pointerId: 7, clientX: 500, clientY: 50, target: t }).angekommen).toBe(false);
    expect(fenster.feuern('pointermove', { pointerId: 8, clientX: 500, clientY: 50, target: t }).angekommen).toBe(false);
    expect(daneben).not.toHaveBeenCalled();
  });

  it('test_nr13_fix_mausrad_hoechstens_ein_daneben_je_200ms', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(10000);
    const { eingabeSperre } = await spotlight();
    const daneben = vi.fn();
    eingabeSperre({ lage: () => lage(), daneben, tab_ziele: () => [] });
    const rad = () => fenster.feuern('wheel', { clientX: 600, clientY: 50, target: a.app });
    expect(rad().angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(rad().angekommen).toBe(false);
    vi.advanceTimersByTime(99); // 199 ms nach dem ersten: noch gesperrt
    expect(rad().angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1); // genau 200 ms: wieder eins
    expect(rad().angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(2);
    // Ein Fingertipp daneben zählt unabhängig vom Mausrad-Takt
    expect(fenster.feuern('pointerdown', { pointerId: 1, clientX: 600, clientY: 50, target: a.app }).angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(3);
    // Neu einschalten vergisst den Takt
    eingabeSperre(null);
    eingabeSperre({ lage: () => lage(), daneben, tab_ziele: () => [] });
    expect(rad().angekommen).toBe(false);
    expect(daneben).toHaveBeenCalledTimes(4);
  });

  it('test_nr13_fix_anleiter_ausblenden_mit_blende', async () => {
    vi.useFakeTimers();
    const { anleiterZeigen, anleiterAusblenden, anleiterRechteck } = await anleiter();
    anleiterZeigen(ansicht(), PLATZ, { weiter() {} }, 0);
    const alt = karte();
    animiert.length = 0;
    anleiterAusblenden();
    // Sofort nicht mehr die Karte (keine Kennung, keine Lage), aber noch sichtbar beim Ausblenden
    expect(a.doc.getElementById('anleiter')).toBeNull();
    expect(anleiterRechteck()).toBeNull();
    expect(alt.parentNode === a.app).toBe(true);
    const blende = animiert.find((x) => x.el === alt)!;
    expect(blende.kf).toEqual([{ opacity: 1 }, { opacity: 0 }]);
    expect(blende.opt).toMatchObject({ duration: 200 });
    // Eine neue Karte während der Blende ist die einzige mit Kennung
    anleiterZeigen(ansicht({ schritt: 'T02' }), PLATZ, { weiter() {} }, 0);
    expect(a.doc.querySelectorAll('#anleiter')).toHaveLength(1);
    expect(karte() === alt).toBe(false);
    vi.advanceTimersByTime(199);
    expect(alt.parentNode === a.app).toBe(true);
    vi.advanceTimersByTime(1);
    expect(alt.parentNode === null).toBe(true);
    expect(karte()).not.toBeNull();
  });

  it('test_nr13_fix_anleiter_ausblenden_weniger_bewegung_sofort', async () => {
    vi.useFakeTimers();
    const { anleiterZeigen, anleiterAusblenden } = await anleiter();
    a.body.classList.add('weniger-bewegung');
    anleiterZeigen(ansicht(), PLATZ, { weiter() {} }, 0);
    let alt = karte();
    animiert.length = 0;
    anleiterAusblenden();
    expect(alt.parentNode === null).toBe(true);
    expect(animiert).toHaveLength(0);
    // Systemeinstellung „Bewegung reduzieren“ genauso
    a.body.classList.remove('weniger-bewegung');
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    anleiterZeigen(ansicht(), PLATZ, { weiter() {} }, 0);
    alt = karte();
    anleiterAusblenden();
    expect(alt.parentNode === null).toBe(true);
    expect(animiert).toHaveLength(0);
  });

  it('test_nr13_fix_schliessen_wackelt_css', () => {
    const css = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');
    const regel = /\.blatt \.schliessen\.wackelt\{animation:([^;}]+)/.exec(css);
    expect(regel).not.toBeNull();
    expect(regel![1]).toContain('wackeln');
    expect(regel![1]).toContain('var(--menue-zeit-ms-wackeln)');
    expect(css).toMatch(/\.weniger-bewegung \.blatt \.schliessen\.wackelt\{animation:none\}/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\.blatt \.schliessen\.wackelt\{animation:none\}\}/);
  });
});
