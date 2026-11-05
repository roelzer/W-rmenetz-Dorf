import { vi } from 'vitest';
import type { Spiel } from '../../src/core/spiel';
import type { Objekt } from '../../src/core/typen';

// Gemeinsame Testhilfe: winzige DOM-Nachbildung ohne Browser und Aufbau der Kontextkarte eines Objekts mit dem echten
// Kernmodul und der echten Kontextkarte (src/ui/kontext.ts). Nur das Seitenblatt (src/ui/blatt) wird ersetzt.
// Muster: tests/a88-freischalt-leiter.test.ts (dort noch eigene Kopie) und tests/menue-v2.test.ts.

/** Winzige DOM-Nachbildung. Der Parser merkt sich das geparste SVG im Attribut `quelle`, damit Tests das Symbol prüfen können. */
export function attrappe() {
  class El {
    tag: string; className = ''; attrs: Record<string, string> = {}; kinder: unknown[] = []; style: Record<string, string> = {};
    on: Record<string, () => void> = {};
    constructor(tag: string) { this.tag = tag; }
    setAttribute(k: string, v: string) { this.attrs[k] = v; }
    hasAttribute(k: string) { return k in this.attrs; }
    addEventListener(n: string, f: () => void) { this.on[n] = f; }
    append(...k: unknown[]) { this.kinder.push(...k); }
    replaceChildren(...k: unknown[]) { this.kinder = [...k]; }
  }
  const doc = { createElement: (t: string) => new El(t), createTextNode: (t: string) => ({ text: t }), importNode: (n: unknown) => n, addEventListener: () => {} };
  class Parser { parseFromString(q: string) { const svg = new El('svg'); svg.attrs.quelle = q; return { documentElement: svg }; } }
  const text = (n: unknown): string => (n && typeof n === 'object' && 'text' in n ? String((n as { text: string }).text) : n instanceof El ? n.kinder.map(text).join('') : '');
  const alle = (n: unknown): El[] => (n instanceof El ? [n, ...n.kinder.flatMap(alle)] : []);
  return { doc, Parser, El, text, alle };
}

export type Attrappe = ReturnType<typeof attrappe>;
export type AttrappenElement = InstanceType<Attrappe['El']>;

/** Kontextkarte eines Objekts ohne Browser aufbauen; liefert die Attrappe und den Kartencontainer. */
export async function kontextKarte(s: Spiel, o: Objekt, jetzt_ms: number): Promise<{ a: Attrappe; c: AttrappenElement }> {
  const a = attrappe();
  vi.resetModules();
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  vi.doMock('../../src/ui/blatt', () => ({ blattOeffnen: () => ({ inhalt: new a.El('div'), zu: () => {} }), blattOffen: () => false }));
  try {
    const { Kontext } = await import('../../src/ui/kontext');
    const ui = { spiel: s, jetzt_ms: () => jetzt_ms, geaendert: () => {}, stempeln: () => {}, toast: () => {}, katalog: () => {} };
    const k = new Kontext(ui as unknown as ConstructorParameters<typeof Kontext>[0], () => {});
    const c = new a.El('div');
    (k as unknown as { inhalt: (c: unknown, o: Objekt) => void }).inhalt(c, o);
    return { a, c };
  } finally { vi.unstubAllGlobals(); vi.doUnmock('../../src/ui/blatt'); }
}
