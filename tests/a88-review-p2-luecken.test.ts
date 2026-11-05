import { describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { istLeitung, KATALOG, KONSTANTEN, UPGRADES, type TypId } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';

// A88 – Testlücken aus dem Review A88 P2 (K1, K3, K4). Eigene Datei, weil tests/a88-freischalt-leiter.test.ts als bestehender
// Test gesperrt ist; die Hilfen unten sind dem Muster dort nachgebaut (echtes Kernmodul, winzige DOM-Nachbildung ohne Browser).

const T0 = 1_000_000_000_000;
const neu = (stufe = 1) => {
  const s = new Spiel(neuerSpielstand(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  return s;
};
const lege = (s: Spiel, typ: TypId, x: number, y: number): Objekt => {
  const o: Objekt = { id: s.stand.naechste_id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0 };
  s.stand.objekte.push(o); return o;
};
const startHaeuser = (s: Spiel) => s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.station);

/** Winzige DOM-Nachbildung (Muster tests/a88-freischalt-leiter.test.ts / tests/menue-v2.test.ts). */
function attrappe() {
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
  class Parser { parseFromString() { return { documentElement: new El('svg') }; } }
  const text = (n: unknown): string => (n && typeof n === 'object' && 'text' in n ? String((n as { text: string }).text) : n instanceof El ? n.kinder.map(text).join('') : '');
  const alle = (n: unknown): El[] => (n instanceof El ? [n, ...n.kinder.flatMap(alle)] : []);
  return { doc, Parser, El, text, alle };
}

type Knopf = { text: string; aus: boolean };
/** Kontextkarte eines Objekts aufbauen; liefert Text und Knöpfe. */
async function karte(s: Spiel, o: Objekt): Promise<{ text: string; knoepfe: Knopf[] }> {
  const a = attrappe();
  vi.resetModules();
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  vi.doMock('../src/ui/blatt', () => ({ blattOeffnen: () => ({ inhalt: new a.El('div'), zu: () => {} }), blattOffen: () => false }));
  try {
    const { Kontext } = await import('../src/ui/kontext');
    const ui = { spiel: s, jetzt_ms: () => T0, geaendert: () => {}, stempeln: () => {}, toast: () => {}, katalog: () => {} };
    const k = new Kontext(ui as unknown as ConstructorParameters<typeof Kontext>[0], () => {});
    const c = new a.El('div');
    (k as unknown as { inhalt: (c: unknown, o: Objekt) => void }).inhalt(c, o);
    const knoepfe = a.alle(c).filter((e) => e.tag === 'button').map((e) => ({ text: a.text(e), aus: e.attrs.disabled !== undefined }));
    return { text: a.text(c), knoepfe };
  } finally { vi.unstubAllGlobals(); vi.doUnmock('../src/ui/blatt'); }
}
const mit = (k: Knopf[], anfang: string) => k.filter((x) => x.text.startsWith(anfang));

describe('A88 Review P2 – Testlücken', () => {
  it('A88 (Review P2, K1): voll ausgebautes Haus aus altem Stand auf Stufe 1 – kein gesperrter Knopf „Helfer beauftragen“', async () => {
    const s = neu(1), h = startHaeuser(s)[0];
    h.upgrade = UPGRADES.length;
    const k = await karte(s, h);
    expect(k.knoepfe.filter((x) => x.text.includes('beauftragen'))).toEqual([]);
    expect(k.text).toContain('Alle Upgrades erledigt.');
  });

  it('A88 (Review P2, K3): Gebautes bleibt – alte 50er trägt weiter, alter Pelletkessel liefert weiter (Stufe 1)', () => {
    const s = neu(1);
    // Start-40er an der Heizzentrale (10|11) wird zur 50er aus einem alten Stand; sie speist die Strecke zu beiden Starthäusern.
    s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === 10 && o.y === 11)!.typ = 'd50';
    s.stand.innen.push({ typ: 'pellet', stufe: 1, bau: null });
    s.neuBerechnen();
    const feld = 11 * KONSTANTEN.feldanzahl + 10;
    expect(s.netz.tiefe.get(feld)).toBe(1);
    expect(s.netz.last_kw.get(feld)).toBe(20); // zwei Starthäuser à 10 kW hängen dahinter
    expect(s.netz.kapazitaet_ok.get(feld)).toBe(true);
    expect(startHaeuser(s).every((o) => s.netz.warm.has(o.id))).toBe(true);
    // Hackschnitzelkessel Stufe 1 = 60 kW, Pelletkessel Stufe 1 = 40 kW (katalog.ts) → 100 kW Erzeugerleistung
    expect(s.netz.verfuegbar_kw).toBe(100);
  });

  it('A88 (Review P2, K4): Leitungskarte zeigt „Dickere“ nur, wenn es eine dickere gesperrte Leitung gibt', async () => {
    const s = neu(2);
    // 110er ist die dickste Leitung (LEITUNGEN in katalog.ts): auf Stufe 2 sind 75er/90er/110er gesperrt, aber keine ist dicker.
    const k110 = await karte(s, lege(s, 'd110', 3, 3));
    expect(mit(k110.knoepfe, 'Dickere')).toEqual([]);
    expect(mit(k110.knoepfe, 'Tauschen:').length).toBe(5); // 25er, 32er, 40er, 50er, 63er
    // 90er auf Stufe 2: die 110er ist dicker und erst ab Stufe 3 frei.
    const k90 = await karte(s, lege(s, 'd90', 5, 3));
    expect(mit(k90.knoepfe, 'Dickere')).toEqual([expect.objectContaining({ text: 'Dickereab Heizzentrale Stufe 3', aus: true })]);
  });
});
