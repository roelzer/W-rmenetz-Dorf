// NR20-22 P4 (zweite Hälfte): kompakte Anleiter-Karte in Kapitel 3 und leichter Schleier mit Gang (DESIGN 13.17.1, B6 und
// „Leichter Schleier mit Gang“). Gleiche DOM-Nachbildung wie tests/nr13-bausteine.test.ts.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domAttrappe, El, type DomAttrappe } from './hilfen/dom-attrappe';
import type { TutorialAnsicht } from '../src/core/tutorial-vertrag';
import type { Loch } from '../src/ui/spotlight';

interface Eintrag { typ: string; f: (ev: unknown) => void }

let a: DomAttrappe;
let fenster: { innerWidth: number; innerHeight: number; liste: Eintrag[] } & Record<string, unknown>;

beforeEach(() => {
  vi.resetModules();
  a = domAttrappe();
  const matchMedia = () => ({ matches: false });
  const liste: Eintrag[] = [];
  fenster = {
    innerWidth: 844, innerHeight: 390, devicePixelRatio: 1, matchMedia, liste,
    setTimeout: (f: () => void, ms?: number) => setTimeout(f, ms),
    clearTimeout: (id: number) => clearTimeout(id),
    addEventListener(typ: string, f: (ev: unknown) => void) { liste.push({ typ, f }); },
    removeEventListener() {},
  };
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('window', fenster);
  vi.stubGlobal('requestAnimationFrame', (f: () => void) => { f(); return 1; });
  vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; });
  vi.spyOn(El.prototype, 'animate').mockImplementation((() => ({ finished: Promise.resolve(), cancel() {}, onfinish: null })) as unknown as El['animate']);
  // Die Spielkarte liegt wie in index.html als erstes Bild in #app
  const karteBild = a.doc.createElement('canvas'); karteBild.id = 'karte'; a.app.append(karteBild);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const anleiter = () => import('../src/ui/anleiter');
const spotlight = () => import('../src/ui/spotlight');

function ansicht(teil: Partial<TutorialAnsicht> = {}): TutorialAnsicht {
  return {
    schritt: 'T13', kapitel: 3, kapitel_name: 'Leitung', art: 'H', text: 'Zieh die Leitung von der Heizzentrale zu Haus 1.', wusstest_du: false,
    ziele: [], finger: 'aus', abdunkeln: 'nichts', weiter: null, kamera: 'steht', kamera_ziele: [], kamera_grenze: false,
    spur: false, erreicht_zeigen: false, objekt_ids: { heizzentrale: 1, haus1: 2, haus2: 3, leitungsstueck: [] },
    normale_aktion: false, wiedereinstieg: false,
    band: [], naechstes_feld: null, zielscheibe: null, finger_weg: [], fremd: [], ziel_stecker: [], ziel_ring: null, erreicht_ids: [],
    farbknopf_ring: null, zeichenleiste: null, zeichnen_ruht: false, kompakt: false, ruhe: false, ...teil,
  };
}
// Große Figur vom Platz, damit sichtbar wird, dass die kompakte Karte selbst auf die kleine Figur (96 px, figur-klein) verkleinert
const PLATZ = { links: 12, unten: 12, breite: 460, figur_px: 112 as const };
const karte = (): El => a.doc.getElementById('anleiter') as El;
const schleier = (): El | null => a.doc.getElementById('schleier') as El | null;
const stil = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');

describe('NR20 kompakte Anleiter-Karte (DESIGN 13.17.1 B6)', () => {
  it('test_nr20_anleiter_kompakt: Klasse kompakt, Figur 72 px, kein [Weiter], Höhe 92 aus dem Token', async () => {
    const { anleiterZeigen } = await anleiter();
    // Auch wenn die Ansicht einen Weiter-Knopf wünscht: die kompakte Karte hat keinen
    anleiterZeigen(ansicht({ kompakt: true, weiter: 'weiter' }), PLATZ, { weiter: vi.fn() }, 0);
    const k = karte();
    expect(k.classList.contains('kompakt')).toBe(true);
    expect(k.classList.contains('figur-klein')).toBe(true);
    expect(k.querySelectorAll('button')).toHaveLength(0);
    expect(k.querySelector('#anleiter-weiter')).toBeNull();
    // 8 + 18 + 4 + 3 × 18 + 8 = 92 (anleiter_kompakt_hoehe)
    expect(k.style.height).toBe('92px');
  });

  it('test_nr20_anleiter_nicht_kompakt_unveraendert: ohne kompakt bleibt die Karte wie in NR13', async () => {
    const { anleiterZeigen } = await anleiter();
    anleiterZeigen(ansicht({ kompakt: false, art: 'W', weiter: 'weiter' }), PLATZ, { weiter: vi.fn() }, 0);
    const k = karte();
    expect(k.classList.contains('kompakt')).toBe(false);
    expect(k.classList.contains('figur-klein')).toBe(false);
    expect(k.querySelector('#anleiter-weiter')!.textContent).toContain('Weiter');
    expect(k.style.height ?? '').toBe('');
  });

  it('test_nr20_anleiter_wechsel_kompakt: Wechsel kompakt ↔ normal bei gleichem Text baut die Karte um', async () => {
    const { anleiterZeigen } = await anleiter();
    const a1 = ansicht({ art: 'W', weiter: 'weiter', text: 'Gleicher Satz.' });
    anleiterZeigen({ ...a1, kompakt: true }, PLATZ, { weiter: vi.fn() }, 0);
    expect(karte().querySelector('#anleiter-weiter')).toBeNull();
    anleiterZeigen({ ...a1, kompakt: false }, PLATZ, { weiter: vi.fn() }, 0);
    expect(karte().classList.contains('kompakt')).toBe(false);
    expect(karte().querySelector('#anleiter-weiter')).not.toBeNull();
    expect(karte().style.height ?? '').toBe('');
    anleiterZeigen({ ...a1, kompakt: true }, PLATZ, { weiter: vi.fn() }, 0);
    expect(karte().classList.contains('kompakt')).toBe(true);
    expect(karte().querySelector('#anleiter-weiter')).toBeNull();
  });

  it('test_nr20_anleiter_kompakt_css: Blase füllt die 92 px, Knopfzeile weg', () => {
    expect(stil).toMatch(/#anleiter\.kompakt \.anleiter-knopfzeile\{[^}]*display:none/);
    expect(stil).toMatch(/#anleiter\.kompakt \.anleiter-blase\{[^}]*overflow:hidden/);
  });
});

// Ellipse um { x 100, y 100, b 40, h 20 } (spotlight.ts umriss): rx = 40/√2 + 12 = 40,28; ry = 20/√2 + 12 = 26,14;
// links 120 − 40,28 = 79,72; rechts 160,28; Mitte y 110.
const HAUS: Loch = { r: { x: 100, y: 100, b: 40, h: 20 }, form: 'ellipse' };
const HAUS_PFAD = 'M79.72 110A40.28 26.14 0 1 0 160.28 110A40.28 26.14 0 1 0 79.72 110Z';
// Ellipse um { x 300, y 200, b 20, h 20 }: r = 20/√2 + 12 = 26,14; links 310 − 26,14 = 283,86; rechts 336,14; Mitte y 210.
const RAUTE: Loch = { r: { x: 300, y: 200, b: 20, h: 20 }, form: 'ellipse' };
const RAUTE_PFAD = 'M283.86 210A26.14 26.14 0 1 0 336.14 210A26.14 26.14 0 1 0 283.86 210Z';
const quelle = (): string => (schleier()!.querySelector('svg') as El).attrs.quelle;

describe('NR20 Schleier mit Gang (DESIGN 13.17.1)', () => {
  it('test_nr20_schleier_setzen_aendern_entfernen', async () => {
    const { schleierSetzen } = await spotlight();
    expect(schleier()).toBeNull();
    // Ein Bedienelement, das schon nach der Karte im Dokument steht, muss über dem Schleier bleiben
    const hud = a.doc.createElement('div'); hud.id = 'hud'; a.app.append(hud);
    schleierSetzen([HAUS]);
    const s = schleier()!;
    expect(s.getAttribute('aria-hidden')).toBe('true');
    // Direkt über der Spielkarte, unter allen später eingehängten Bedienelementen
    expect(a.app.kinder.indexOf(s)).toBe(a.app.kinder.indexOf(a.doc.getElementById('karte') as El) + 1);
    expect(s.querySelectorAll('svg')).toHaveLength(1);
    expect(quelle()).toContain(HAUS_PFAD);
    expect(quelle()).toContain('rgba(28,14,4,.30)');
    // Weicher Rand 12 px (gang_rand) ≈ ±2 σ → σ = 3
    expect(quelle()).toContain('stdDeviation="3"');
    expect(quelle()).toContain('width="844"');
    expect(quelle()).toContain('height="390"');

    schleierSetzen([HAUS, RAUTE]);
    expect(a.doc.querySelectorAll('#schleier')).toHaveLength(1);
    expect(schleier()!.querySelectorAll('svg')).toHaveLength(1);
    expect(quelle()).toContain(HAUS_PFAD);
    expect(quelle()).toContain(RAUTE_PFAD);

    schleierSetzen([RAUTE]);
    expect(quelle()).not.toContain(HAUS_PFAD);
    expect(quelle()).toContain(RAUTE_PFAD);

    schleierSetzen(null);
    expect(schleier()).toBeNull();
    schleierSetzen(null);
    expect(schleier()).toBeNull();

    // Nach dem Entfernen wieder setzbar, auch mit demselben Gang wie zuletzt
    schleierSetzen([RAUTE]);
    expect(quelle()).toContain(RAUTE_PFAD);
  });

  it('test_nr20_schleier_leerer_gang: Schleier ohne Aussparung', async () => {
    const { schleierSetzen } = await spotlight();
    schleierSetzen([]);
    expect(quelle()).toContain('rgba(28,14,4,.30)');
    expect(quelle()).not.toContain('<path');
  });

  it('test_nr20_schleier_faengt_nichts_ab: keine Empfänger, pointer-events none per CSS, nicht in der Eingabesperre', async () => {
    const { schleierSetzen } = await spotlight();
    const vorher = fenster.liste.length;
    schleierSetzen([HAUS]);
    const s = schleier()!;
    expect(Object.values(s.ereignisse).flat()).toHaveLength(0);
    expect(fenster.liste.length).toBe(vorher);
    expect(stil).toMatch(/#schleier\{[^}]*pointer-events:none/);
    expect(stil).toMatch(/#schleier\{[^}]*position:absolute;inset:0/);
  });

  it('test_nr20_schleier_gleicher_gang_kein_neuaufbau', async () => {
    const { schleierSetzen } = await spotlight();
    const parsen = vi.spyOn(a.Parser.prototype, 'parseFromString');
    schleierSetzen([HAUS, RAUTE]);
    const svg = schleier()!.querySelector('svg');
    // Neues Feld mit gleichen Werten – so kommt der Gang je Bild aus der Ansicht
    schleierSetzen([{ ...HAUS, r: { ...HAUS.r } }, { ...RAUTE, r: { ...RAUTE.r } }]);
    schleierSetzen([HAUS, RAUTE]);
    expect(parsen).toHaveBeenCalledTimes(1);
    expect(schleier()!.querySelector('svg')).toBe(svg);

    // Andere Bildgröße → neu, weil die Fläche den ganzen Bildschirm deckt
    fenster.innerWidth = 667; fenster.innerHeight = 375;
    schleierSetzen([HAUS, RAUTE]);
    expect(parsen).toHaveBeenCalledTimes(2);
    expect(quelle()).toContain('width="667"');
  });
});
