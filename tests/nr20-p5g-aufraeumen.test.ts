// P5g Aufräumen aus der Sammelliste (docs/bauplaene/NR20-22-sammelliste-P5.md, „Für P7 (Nachtrag)“, nach P5g verschoben):
// Die kompakte Anleiter-Karte zeigt keinen Chip „Wusstest du?“ (Sammelliste Punkt 5) – im Code geregelt, nicht nur über die
// Daten. Gleiche DOM-Nachbildung wie tests/nr20-anleiter-schleier.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domAttrappe, El, type DomAttrappe } from './hilfen/dom-attrappe';
import type { TutorialAnsicht } from '../src/core/tutorial-vertrag';

let a: DomAttrappe;

beforeEach(() => {
  vi.resetModules();
  a = domAttrappe();
  const matchMedia = () => ({ matches: false });
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('window', {
    innerWidth: 844, innerHeight: 390, devicePixelRatio: 1, matchMedia,
    setTimeout: (f: () => void, ms?: number) => setTimeout(f, ms), clearTimeout: (id: number) => clearTimeout(id),
    addEventListener() {}, removeEventListener() {},
  });
  vi.stubGlobal('requestAnimationFrame', (f: () => void) => { f(); return 1; });
  vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; });
  vi.spyOn(El.prototype, 'animate').mockImplementation((() => ({ finished: Promise.resolve(), cancel() {}, onfinish: null })) as unknown as El['animate']);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function ansicht(teil: Partial<TutorialAnsicht>): TutorialAnsicht {
  return {
    schritt: 'T13', kapitel: 3, kapitel_name: 'Leitung', art: 'H', text: 'Zieh die Leitung von der Heizzentrale zu Haus 1.', wusstest_du: false,
    ziele: [], finger: 'aus', abdunkeln: 'nichts', weiter: null, kamera: 'steht', kamera_ziele: [], kamera_grenze: false,
    spur: false, erreicht_zeigen: false, objekt_ids: { heizzentrale: 1, haus1: 2, haus2: 3, leitungsstueck: [] },
    normale_aktion: false, wiedereinstieg: false,
    band: [], naechstes_feld: null, zielscheibe: null, finger_weg: [], fremd: [], ziel_stecker: [], ziel_ring: null, erreicht_ids: [],
    farbknopf_ring: null, zeichenleiste: null, zeichnen_ruht: false, kompakt: false, ruhe: false, ...teil,
  };
}
const PLATZ = { links: 12, unten: 12, breite: 460, figur_px: 112 as const };
const chips = (): number => (a.doc.getElementById('anleiter') as El).querySelectorAll('.chip').length;

describe('P5g Sammelliste: kein Chip auf der kompakten Karte', () => {
  it('test_p5g_chip_nur_ohne_kompakt: wusstest_du auf der kompakten Karte → kein Chip; auf der großen Karte → Chip', async () => {
    // Fehler, der rot macht: Chip hängt nur an wusstest_du (anleiter.ts), die kompakte Karte zeigte ihn dann auch.
    const { anleiterZeigen } = await import('../src/ui/anleiter');
    anleiterZeigen(ansicht({ kompakt: true, wusstest_du: true }), PLATZ, { weiter: vi.fn() }, 0);
    expect(chips(), 'kompakte Karte').toBe(0);
    anleiterZeigen(ansicht({ kompakt: false, wusstest_du: true, art: 'W', weiter: 'weiter', schritt: 'T25' }), PLATZ, { weiter: vi.fn() }, 0);
    expect(chips(), 'große Karte, Vorprobe: der Chip ist sonst da').toBe(1);
  });
});
