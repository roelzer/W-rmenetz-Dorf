// Testhilfe (Tester-Vorarbeit NR16-B2b, A92): echte Steuerung mit echtem Blatt, echtem Toast, echtem Katalog und echter
// Kontextkarte auf der DOM-Nachbildung tests/hilfen/dom-attrappe.ts – ohne Browser (ENTSCHEIDUNGEN 2026-11-05, Antwort 8:
// „Neue Tests nutzen das echte Blatt“). Nichts aus src/ wird ersetzt; nur die Grafik (Leinwand, Maler, Katalogbild) ist
// eine leere Attrappe, weil die Nachbildung nicht zeichnen kann. Lage und Breiten prüfen die Browser-Tests (werkzeuge/).
import { vi } from 'vitest';
import type { Spiel } from '../../src/core/spiel';
import { domAttrappe, El, type DomAttrappe } from './dom-attrappe';

export type EchteUmgebung = {
  dom: DomAttrappe;
  /** echte Steuerung (Typ bewusst offen: die Tests greifen nur über die öffentliche Oberfläche zu) */
  st: {
    stempeln(t: string): void; katalog(k?: string): void; kontext(id: number | null): void; geaendert(): void;
    kamera: { breite: number; hoehe: number; zoom: number; mitte(x: number, y: number): [number, number]; groesseSetzen(b: number, h: number, d: number): boolean };
  };
  /** Text der aktuell stehenden Meldung (#toast), leer wenn keine */
  meldung(): string;
  /** alle Meldungen in Aufrufreihenfolge (auch zweimal derselbe Text) – die echte Meldung läuft trotzdem */
  meldungen: string[];
  /** alle Knöpfe im Dokument */
  knoepfe(): El[];
  /** gespeicherte Werte im Ersatz-localStorage */
  speicher: Map<string, string>;
};

/** Knopf antippen wie ein Browser: kein Klick bei HTML-`disabled`. */
export const tippe = (k: El): void => k.click();

/**
 * Oberflächen-Module frisch laden und eine echte Steuerung bauen. `speicher` erlaubt einen vorbelegten localStorage
 * (z. B. Einstellungen); der Spielstand selbst kommt immer über `spiel`.
 */
export async function echteSteuerung(spiel: Spiel, arbeit: (u: EchteUmgebung) => Promise<void> | void, opt: { speicher?: Map<string, string>; breite?: number; hoehe?: number; uhr?: () => number; bewegung?: 'normal' | 'einstellung' | 'system' } = {}): Promise<void> {
  const dom = domAttrappe();
  const speicher = opt.speicher ?? new Map<string, string>();
  // „Weniger Bewegung“: aus der Einstellung (gespeichert wie src/ui/einstellungen.ts) oder vom System (prefers-reduced-motion)
  if (opt.bewegung === 'einstellung') speicher.set('waermedorf-einstellungen-v1', JSON.stringify({ weniger_bewegung: true }));
  const meldungen: string[] = [];
  vi.resetModules();
  vi.stubGlobal('document', dom.doc);
  vi.stubGlobal('DOMParser', dom.Parser);
  vi.stubGlobal('HTMLElement', El);
  vi.stubGlobal('HTMLButtonElement', El);
  vi.stubGlobal('localStorage', { getItem: (k: string) => speicher.get(k) ?? null, setItem: (k: string, v: string) => { speicher.set(k, String(v)); }, removeItem: (k: string) => { speicher.delete(k); } });
  const matchMedia = (q: string) => ({ matches: opt.bewegung === 'system' && q.includes('prefers-reduced-motion') && q.includes('reduce'), media: q, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('requestAnimationFrame', (f: (t: number) => void) => fensterSetTimeout(() => f(0), 0));
  vi.stubGlobal('cancelAnimationFrame', (id: ReturnType<typeof setTimeout>) => fensterClearTimeout(id));
  // Zeitgeber der Oberfläche merken und am Ende löschen: sonst läuft z. B. die Ausblende-Zeit der Meldung nach dem Test
  // weiter und trifft auf das schon zurückgesetzte `window` (unbehandelter Fehler im Gesamtlauf). Ruft immer die gerade
  // gültige globale Uhr auf, damit vi.useFakeTimers() im Test weiter greift.
  const zeitgeber = new Set<ReturnType<typeof setTimeout>>();
  const fensterSetTimeout = (f: () => void, ms?: number): ReturnType<typeof setTimeout> => {
    const id = globalThis.setTimeout(() => { zeitgeber.delete(id); f(); }, ms);
    zeitgeber.add(id);
    return id;
  };
  const fensterClearTimeout = (id: ReturnType<typeof setTimeout>): void => { zeitgeber.delete(id); globalThis.clearTimeout(id); };
  vi.stubGlobal('window', { matchMedia, setTimeout: fensterSetTimeout, clearTimeout: fensterClearTimeout, devicePixelRatio: 2, innerWidth: opt.breite ?? 844, innerHeight: opt.hoehe ?? 390, addEventListener: () => {}, removeEventListener: () => {} });
  vi.doMock('../../src/ui/bild', () => ({ katalogBild: () => new El('canvas') }));
  // Meldungen mitschreiben, ohne sie zu ersetzen: die echte Funktion läuft weiter (echtes #toast im DOM).
  vi.doMock('../../src/ui/toast', async (original) => {
    const m = await original<typeof import('../../src/ui/toast')>();
    return { ...m, toast: (t: string, ...rest: unknown[]) => { meldungen.push(t); return (m.toast as (t: string, ...r: unknown[]) => void)(t, ...rest); } };
  });
  try {
    const { Steuerung } = await import('../../src/steuerung');
    const leinwand = new El('canvas');
    dom.app.append(leinwand);
    spiel.stand.namen_gefragt = true; // Willkommen-Popup ist nicht Gegenstand dieser Tests
    const st = new Steuerung(spiel, leinwand as unknown as HTMLCanvasElement, { reduziert: false } as never, opt.uhr ?? (() => Date.now())) as unknown as EchteUmgebung['st'];
    if (st.kamera.groesseSetzen(opt.breite ?? 844, opt.hoehe ?? 390, 2)) (st as unknown as { zentrieren(): void }).zentrieren(); // wie main.ts
    const meldung = (): string => {
      const t = dom.doc.getElementById('toast');
      return t ? t.textContent : '';
    };
    await arbeit({ dom, st, meldung, meldungen, knoepfe: () => dom.html.querySelectorAll('button'), speicher });
  } finally {
    for (const id of zeitgeber) globalThis.clearTimeout(id);
    zeitgeber.clear();
    vi.unstubAllGlobals();
    vi.doUnmock('../../src/ui/bild');
    vi.doUnmock('../../src/ui/toast');
  }
}
