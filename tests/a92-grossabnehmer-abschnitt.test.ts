import { describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG, type TypId } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';
import { serialisieren } from '../src/core/speichern';
import { attrappe, type Attrappe, type AttrappenElement } from './hilfen/kontext-attrappe';
import { gesperrt, htmlDisabled } from './hilfen/gesperrt';

// A92 / K1 (Review NR16-A, ENTSCHEIDUNGEN 2026-11-05 „NR16-A als A92 übernommen“, Paket NR16-B1):
// Der Großabnehmer-Knopf „<Leitung> legen“ ist ohne offenen Bauabschnitt gesperrt wie beim Haus („Leitung selbst legen“),
// zeigt beim Antippen den Philipp-Hinweis (DESIGN.md 12.18/12.19) und startet kein Zeichnen.
// Echtes Kernmodul und echte Kontextkarte; ohne Browser über die DOM-Attrappe der Testhilfen.

const T0 = 1_000_000_000_000;
const OHNE_ABSCHNITT = 'braucht offenen Bauabschnitt';
const SELBST_HINWEIS = 'Erst mit Philipp einen Bauabschnitt planen: Bauen → Leitungen.';

const neu = (stufe = 1) => {
  const s = new Spiel(neuerSpielstand(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
const bad = (s: Spiel) => s.stand.objekte.find((o) => o.typ === 'bad')!;

/** Attrappe mit classList, document.body und matchMedia, damit Tippen auf einen gesperrten Knopf (Wackeln, „Weniger Bewegung“) läuft. */
function attrappePlus(): Attrappe {
  const a = attrappe();
  Object.defineProperty(a.El.prototype, 'classList', {
    get(this: AttrappenElement) {
      const liste = () => this.className.split(' ').filter(Boolean);
      return {
        add: (k: string) => { if (!liste().includes(k)) this.className = [...liste(), k].join(' '); },
        remove: (k: string) => { this.className = liste().filter((x) => x !== k).join(' '); },
        contains: (k: string) => liste().includes(k),
        toggle: (k: string, an?: boolean) => { const soll = an ?? !liste().includes(k); this.className = soll ? [...liste().filter((x) => x !== k), k].join(' ') : liste().filter((x) => x !== k).join(' '); return soll; },
      };
    },
    configurable: true,
  });
  Object.defineProperty(a.El.prototype, 'textContent', {
    get(this: AttrappenElement) { return a.text(this); },
    set(this: AttrappenElement, v: string) { this.kinder = [{ text: v }]; },
    configurable: true,
  });
  (a.doc as unknown as { body: AttrappenElement }).body = new a.El('body');
  return a;
}

type Knopf = { text: string; aus: boolean; el: AttrappenElement };
type Karte = { text: string; knoepfe: Knopf[]; gestempelt: string[]; toasts: string[] };
type Handler = (ev?: unknown) => void;
const ereignis = (el: AttrappenElement, key?: string) => {
  const ev = { key, target: el, currentTarget: el, defaultPrevented: false, preventDefault() { ev.defaultPrevented = true; }, stopPropagation() {} };
  return ev;
};
/** Tippen wie im Browser: Ein Knopf mit HTML-disabled bekommt keinen Klick. */
const tippe = (el: AttrappenElement): void => { if (!htmlDisabled(el)) (el.on.click as Handler | undefined)?.(ereignis(el)); };
/** Enter auf dem fokussierten Knopf wie im Browser: nach keydown ein Klick, außer preventDefault. */
const enter = (el: AttrappenElement): void => {
  if (htmlDisabled(el)) return;
  const ev = ereignis(el, 'Enter'); (el.on.keydown as Handler | undefined)?.(ev);
  if (!ev.defaultPrevented) tippe(el);
};

/** Kontextkarte des Objekts aufbauen; `tun` läuft noch mit der Attrappe. Toasts aus ui.toast und dem Toast-Modul werden gesammelt. */
async function karte(s: Spiel, o: Objekt, tun?: (k: Karte) => void): Promise<Karte> {
  const a = attrappePlus();
  const toasts: string[] = [];
  vi.resetModules();
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  const matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} });
  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('window', { matchMedia, setTimeout: (f: () => void, ms?: number) => setTimeout(f, ms), clearTimeout: (t: ReturnType<typeof setTimeout>) => clearTimeout(t), devicePixelRatio: 1 });
  vi.doMock('../src/ui/blatt', () => ({ blattOeffnen: () => ({ inhalt: new a.El('div'), zu: () => {} }), blattOffen: () => false }));
  vi.doMock('../src/ui/bild', () => ({ katalogBild: () => new a.El('canvas') }));
  vi.doMock('../src/ui/toast', () => ({ toast: (t: string) => toasts.push(t), hinweisMitKnopf: () => {} }));
  vi.doMock('../src/ui/sprecher', () => ({ sprecherZeigen: () => {} }));
  try {
    const { Kontext } = await import('../src/ui/kontext');
    const gestempelt: string[] = [];
    const ui = { spiel: s, jetzt_ms: () => T0, geaendert: () => s.neuBerechnen(), stempeln: (t: string) => gestempelt.push(t), toast: (t: string) => toasts.push(t), katalog: () => {} };
    const k = new Kontext(ui as unknown as ConstructorParameters<typeof Kontext>[0], () => {});
    const c = new a.El('div');
    (k as unknown as { inhalt: (c: unknown, o: Objekt) => void }).inhalt(c, o);
    const knoepfe = a.alle(c).filter((e) => e.tag === 'button').map((e) => ({ text: a.text(e), aus: gesperrt(e), el: e }));
    const kk: Karte = { text: a.text(c), knoepfe, gestempelt, toasts };
    tun?.(kk);
    return kk;
  } finally {
    vi.unstubAllGlobals();
    for (const m of ['../src/ui/blatt', '../src/ui/bild', '../src/ui/toast', '../src/ui/sprecher']) vi.doUnmock(m);
  }
}
const legenKnopf = (k: Karte, typ: TypId) => k.knoepfe.filter((x) => x.text.startsWith(`${KATALOG[typ].name} legen`));

describe('A92 / K1 – Großabnehmer: „<Leitung> legen“ nur mit offenem Bauabschnitt', () => {
  // Passende Leitung: Hallenbad auf Stufe 1 → 40er (wie a88 „Großabnehmer – Knopf legt die passende freigeschaltete Leitung“).
  // Der Enter-Fall läuft bewusst auf Stufe 3 und prüft jeden Legen-Knopf, damit die Sperre nicht nur an der 40er hängt.
  it('A92: K1 – ohne Bauabschnitt ist der Knopf gesperrt mit Grund, Tippen zeigt den Philipp-Hinweis und zeichnet nicht', async () => {
    const s = neu(1);
    expect(s.stand.abschnitt ?? null, 'Vorbedingung: kein Bauabschnitt').toBeNull();
    const vorher = serialisieren(s.stand);
    const k = await karte(s, bad(s), (k) => { const l = legenKnopf(k, 'd40'); if (l.length) tippe(l[0].el); });
    expect(legenKnopf(k, 'd40')).toEqual([expect.objectContaining({ aus: true, text: `40er-Leitung legen${OHNE_ABSCHNITT}` })]);
    expect(k.toasts).toEqual([SELBST_HINWEIS]);
    expect(k.gestempelt).toEqual([]);
    expect(serialisieren(s.stand)).toBe(vorher);
  });

  it('A92: K1 – ohne Bauabschnitt startet auch Enter kein Zeichnen (Stufe 3)', async () => {
    const s = neu(3);
    const k = await karte(s, bad(s), (k) => { for (const x of k.knoepfe.filter((x) => x.text.includes(' legen'))) enter(x.el); });
    const legen = k.knoepfe.filter((x) => x.text.includes('-Leitung legen'));
    expect(legen.length, 'genau ein Legen-Knopf').toBe(1);
    expect(legen[0].aus).toBe(true);
    expect(k.gestempelt).toEqual([]);
  });

  for (const phase of ['planung', 'bestellen', 'bau'] as const) {
    it(`A92: K1 – Abschnitt in Phase „${phase}“ (nicht offen): Knopf gesperrt, Tippen zeichnet nicht`, async () => {
      const s = neu(1);
      s.stand.abschnitt = { phase, bau: phase === 'bestellen' ? null : { art: 'neu', start_ms: T0, ende_ms: T0 + 60_000 } };
      const k = await karte(s, bad(s), (k) => { const l = legenKnopf(k, 'd40'); if (l.length) tippe(l[0].el); });
      expect(legenKnopf(k, 'd40')).toEqual([expect.objectContaining({ aus: true })]);
      expect(k.gestempelt).toEqual([]);
    });
  }

  it('A92: K1 – mit offenem Bauabschnitt ist der Knopf frei und startet das Zeichnen mit der passenden Leitung, ohne Hinweis', async () => {
    const s = neu(1);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    const k = await karte(s, bad(s), (k) => tippe(legenKnopf(k, 'd40')[0].el));
    expect(legenKnopf(k, 'd40')).toEqual([expect.objectContaining({ aus: false, text: '40er-Leitung legen' })]);
    expect(k.gestempelt).toEqual(['d40']);
    expect(k.toasts).toEqual([]);
  });
});
