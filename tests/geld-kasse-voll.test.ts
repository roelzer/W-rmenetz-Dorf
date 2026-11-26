import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { domAttrappe, El } from './hilfen/dom-attrappe';

// Spielerbericht 26.11. „seit 3 Tagen kein Geld mehr“, Risiko 3: Liegt das Geld an der Kassengrenze, kommt bei der Abrechnung
// nichts mehr an (Regel A10, unverändert). Bisher zeigte das nur die rote Farbe der Geld-Pille. Erwartung: dauerhafter
// sichtbarer Hinweis „Kasse voll“ an der Geldanzeige, solange die Kasse voll ist; Antippen öffnet den Geldfluss (Pille ist der Knopf).

const T0 = 1_000_000_000_000;
let Hud: typeof import('../src/ui/hud').Hud;
let KASSE_VOLL: string;
beforeAll(async () => {
  const dom = domAttrappe();
  vi.stubGlobal('document', dom.doc);
  vi.stubGlobal('DOMParser', dom.Parser);
  vi.stubGlobal('HTMLElement', El);
  vi.stubGlobal('HTMLButtonElement', El);
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} }));
  ({ Hud } = await import('../src/ui/hud'));
  ({ KASSE_VOLL } = await import('../src/ui/sperrtexte'));
});
afterAll(() => { vi.unstubAllGlobals(); });
function hudMit(geld_eur: number | 'grenze') {
  const s = new Spiel(altesStartdorf(T0), () => T0);
  s.stand.geld_eur = geld_eur === 'grenze' ? s.kassengrenze_eur() : geld_eur;
  let geoeffnet = 0;
  const hud = new Hud(() => s, { bauen() {}, besuchen() {}, einstellungen() {}, auftrag() {}, geldfluss: () => { geoeffnet++; }, kwUmschalten: () => true, kwAn: () => true });
  hud.aktualisieren(null);
  const pille = hud.wurzel.querySelector<HTMLElement>('[data-res="geld"]')!;
  return { s, hud, pille, geoeffnet: () => geoeffnet };
}
const hinweis = (pille: HTMLElement) => pille.querySelector<HTMLElement>('.kasse-voll');

describe('Risiko 3: Kasse voll sichtbar', () => {
  it('Text steht in der Texttabelle', () => {
    expect(KASSE_VOLL).toBe('Kasse voll');
  });

  it('Geld genau an der Grenze: Hinweis sichtbar, im Geld-Knopf, Vorlesetext nennt ihn', () => {
    const { pille } = hudMit('grenze');
    const h = hinweis(pille);
    expect(h).not.toBeNull();
    expect(h!.hidden).toBe(false);
    expect(h!.textContent).toBe('Kasse voll');
    expect(pille.tagName).toBe('BUTTON');
    expect(pille.getAttribute('aria-label')).toContain('Kasse voll');
  });

  it('Geld unter der Grenze: Hinweis versteckt, Vorlesetext ohne', () => {
    const { s, pille } = hudMit(0);
    expect(s.stand.geld_eur).toBe(0);
    expect(hinweis(pille)!.hidden).toBe(true);
    expect(pille.getAttribute('aria-label')).not.toContain('Kasse voll');
  });

  it('Hinweis wechselt mit dem Kontostand (voll → nicht voll → voll), auch über der Grenze', () => {
    const { s, hud, pille } = hudMit('grenze');
    s.stand.geld_eur = s.kassengrenze_eur() - 1000; hud.aktualisieren(null);
    expect(hinweis(pille)!.hidden).toBe(true);
    s.stand.geld_eur = s.kassengrenze_eur() * 10; hud.aktualisieren(null);
    expect(hinweis(pille)!.hidden).toBe(false);
  });

  it('Hinweis liegt im Geld-Knopf (Klick steigt im Browser zum Knopf auf), der Knopf öffnet den Geldfluss', () => {
    const { pille, geoeffnet } = hudMit('grenze');
    // Die Test-Attrappe lässt Klicks nicht aufsteigen; geprüft wird darum: direktes Kind des Knopfs, Knopf öffnet.
    expect((hinweis(pille) as unknown as El).parentNode).toBe(pille);
    pille.click();
    expect(geoeffnet()).toBe(1);
  });
});
