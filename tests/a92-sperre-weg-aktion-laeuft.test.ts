import { describe, expect, it, vi } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { HELFER, KATALOG, UPGRADES } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';
import { attrappe, type Attrappe, type AttrappenElement } from './hilfen/kontext-attrappe';
import { gesperrtMitHinweis } from './hilfen/gesperrt';
import { UI_LEERLAUF } from './hilfen/ui-leerlauf';

// Tester-Nachzug NR16-B2a (A92, ENTSCHEIDUNGEN 2026-11-05 Antwort 7): Fällt der Sperrgrund weg, während das Blatt offen ist,
// läuft beim Tippen die normale Aktion – keine Meldung. Der Review hat das für Taler („Sofort fertig“), Vertrag („Vertrag
// unterschreiben“) und Helfer („Alle Helfer beschäftigt“) als fehlend gemeldet. Je Fall: (1) die Hinweis-Funktion aus
// src/ui/sperrtexte.ts liefert `null`, sobald nichts mehr fehlt; (2) am echten Knopf im echten Blatt (Hausblatt,
// Großabnehmer-Blatt, Baumenü) läuft dann die Aktion im Kern. Gegenprobe jeweils: solange der Grund noch besteht, kommt die
// Meldung und der Kern bleibt unverändert – so ist sichergestellt, dass der Knopf vorher wirklich gesperrt war.
// Erwartete Texte wörtlich aus DESIGN.md 12.20 (H1, H3, Regel 5); Preise aus src/core/katalog.ts von Hand.

const T0 = 1_000_000_000_000;
const norm = (t: string): string => t.replace(/ /g, ' ');
type Uhr = { t: number };
type Handler = (e?: unknown) => void;
const ev = { preventDefault: () => {}, stopPropagation: () => {} };

const neu = (stufe: number, uhr: Uhr) => {
  const s = new Spiel(altesStartdorf(T0), () => uhr.t);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
const haus = (s: Spiel) => s.stand.objekte.find((o) => o.x === 9 && o.y === 15)!;
const gewerbe = (s: Spiel) => s.stand.objekte.find((o) => o.typ === 'gewerbe')!;

/** Attrappe mit classList, textContent, document.body (Muster tests/a92-sperrtexte.test.ts). */
function attrappePlus(): Attrappe {
  const a = attrappe();
  Object.defineProperty(a.El.prototype, 'classList', {
    get(this: AttrappenElement) {
      const liste = () => this.className.split(' ').filter(Boolean);
      return {
        add: (k: string) => { if (!liste().includes(k)) this.className = [...liste(), k].join(' '); },
        remove: (k: string) => { this.className = liste().filter((x) => x !== k).join(' '); },
        contains: (k: string) => liste().includes(k),
        toggle: (k: string, an?: boolean) => { const soll = an ?? !liste().includes(k); this.className = soll ? [...new Set([...liste(), k])].join(' ') : liste().filter((x) => x !== k).join(' '); return soll; },
      };
    },
    configurable: true,
  });
  Object.defineProperty(a.El.prototype, 'textContent', {
    get(this: AttrappenElement) { return a.text(this); },
    set(this: AttrappenElement, v: string) { this.kinder = [{ text: v }]; },
    configurable: true,
  });
  const app = new a.El('div');
  Object.assign(a.doc, { body: new a.El('body'), getElementById: (id: string) => (id === 'app' ? app : null) });
  return a;
}

type B = { a: Attrappe; toasts: string[]; einer: (anfang: string) => AttrappenElement; tippe: (k: AttrappenElement) => string | undefined };

/** Echte Oberflächen-Module mit der Attrappe laden; nur Seitenblatt, Bild, Toast und Sprecher sind ersetzt. */
async function mitAttrappe(s: Spiel, uhr: Uhr, arbeit: (a: Attrappe, ui: Record<string, unknown>, toasts: string[]) => Promise<void>): Promise<void> {
  const a = attrappePlus();
  const toasts: string[] = [];
  vi.resetModules();
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  const matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('window', { matchMedia, setTimeout, clearTimeout, devicePixelRatio: 1 });
  vi.doMock('../src/ui/blatt', () => ({ blattOeffnen: () => ({ inhalt: new a.El('div'), zu: () => {} }), blattOffen: () => false }));
  vi.doMock('../src/ui/bild', () => ({ katalogBild: () => new a.El('canvas') }));
  vi.doMock('../src/ui/toast', () => ({ toast: (t: string) => toasts.push(t), hinweisMitKnopf: () => {} }));
  vi.doMock('../src/ui/sprecher', () => ({ sprecherZeigen: () => {} }));
  const ui = {
    ...UI_LEERLAUF, spiel: s, jetzt_ms: () => uhr.t, geaendert: () => s.neuBerechnen(), stempeln: () => {},
    toast: (t: string) => toasts.push(t), katalog: () => {}, verschieben: () => {},
  };
  try { await arbeit(a, ui, toasts); } finally {
    vi.unstubAllGlobals();
    for (const m of ['../src/ui/blatt', '../src/ui/bild', '../src/ui/toast', '../src/ui/sprecher']) vi.doUnmock(m);
  }
}

function bedienung(a: Attrappe, wurzel: AttrappenElement, toasts: string[]): B {
  const knoepfe = () => a.alle(wurzel).filter((e) => e.tag === 'button');
  return {
    a, toasts,
    einer: (anfang) => { const k = knoepfe().filter((e) => a.text(e).startsWith(anfang)); expect(k, `genau ein Knopf „${anfang}…“`).toHaveLength(1); return k[0]; },
    tippe: (k) => {
      const vorher = toasts.length;
      if (!('disabled' in k.attrs)) (k.on.click as Handler | undefined)?.(ev);
      return toasts.length > vorher ? norm(toasts[toasts.length - 1]) : undefined;
    },
  };
}

/** Seitenblatt eines Objekts (echte Kontextkarte). */
async function karte(s: Spiel, o: Objekt, uhr: Uhr, tun: (b: B) => void): Promise<void> {
  await mitAttrappe(s, uhr, async (a, ui, toasts) => {
    const { Kontext } = await import('../src/ui/kontext');
    const k = new Kontext(ui as unknown as ConstructorParameters<typeof Kontext>[0], () => {});
    const c = new a.El('div');
    (k as unknown as { inhalt: (c: unknown, o: Objekt) => void }).inhalt(c, o);
    tun(bedienung(a, c, toasts));
  });
}

/** Baumenü (echter Katalog) mit Reiter `reiter`. */
async function baumenue(s: Spiel, reiter: string, uhr: Uhr, tun: (b: B) => void): Promise<void> {
  await mitAttrappe(s, uhr, async (a, ui, toasts) => {
    const { Katalog } = await import('../src/ui/katalog');
    const k = new Katalog(ui as unknown as ConstructorParameters<typeof Katalog>[0]);
    k.oeffnen(reiter);
    tun(bedienung(a, (k as unknown as { blatt: { inhalt: AttrappenElement } }).blatt.inhalt, toasts));
  });
}

// ───────────────────────────── (1) Hinweis-Funktionen liefern null, sobald nichts mehr fehlt ─────────────────────────────

describe('A92 Antwort 7 – Hinweis-Funktionen in sperrtexte.ts lesen den Stand beim Tippen neu', () => {
  it('A92 H3: helferSperre – Hinweis wird null, sobald ein Helfer frei ist (vorher Restzeit zum Tippzeitpunkt)', async () => {
    const { helferSperre } = await import('../src/ui/sperrtexte');
    let ende: number | null = T0 + 90_000;
    const uhr = { t: T0 };
    const sp = helferSperre(() => ende, () => uhr.t)!;
    expect(sp).not.toBeNull();
    const hinweis = sp.hinweis as () => string | null;
    uhr.t = T0 + 30_000;
    expect(norm(hinweis()!)).toBe('Alle Helfer sind gerade beschäftigt. Der nächste ist in 1m frei.');
    ende = null; // Helfer ist fertig geworden, während das Blatt offen war
    expect(hinweis()).toBeNull();
  });

  it('A92 H1: vertragSperre – Hinweis wird null, sobald keine Bedingung mehr fehlt (vorher die erste fehlende)', async () => {
    const { vertragSperre } = await import('../src/ui/sperrtexte');
    let jetzt: string[] = ['Heizzentrale Stufe 3', 'Ruf 70 % (jetzt 52 %)'];
    const sp = vertragSperre([...jetzt], () => jetzt)!;
    expect(sp.grund).toBe('noch 2 Bedingungen offen');
    const hinweis = sp.hinweis as () => string | null;
    expect(norm(hinweis()!)).toBe('Für den Vertrag fehlt noch: Heizzentrale Stufe 3 (und 1 weitere).');
    jetzt = ['Ruf 70 % (jetzt 52 %)'];
    expect(norm(hinweis()!)).toBe('Für den Vertrag fehlt noch: Ruf 70 % (jetzt 52 %).');
    jetzt = [];
    expect(hinweis()).toBeNull();
  });

  it('A92 Regel 5: talerSperre – Hinweis wird null, sobald die Taler genau reichen; 1 Taler zu wenig nennt „1 Dorftaler“', async () => {
    const { talerSperre } = await import('../src/ui/sperrtexte');
    const s = new Spiel(altesStartdorf(T0), () => T0);
    s.stand.taler = 4;
    const sp = talerSperre(s, () => 11)!;
    expect(sp).toMatchObject({ grund: null, schloss: false });
    const hinweis = sp.hinweis as () => string | null;
    expect(norm(hinweis()!)).toBe('Dir fehlen noch 7 Dorftaler. Du bekommst sie für Aufträge und beim Wegräumen.');
    s.stand.taler = 10;
    expect(norm(hinweis()!)).toBe('Dir fehlen noch 1 Dorftaler. Du bekommst sie für Aufträge und beim Wegräumen.');
    s.stand.taler = 11;
    expect(hinweis()).toBeNull();
    s.stand.taler = 25;
    expect(hinweis()).toBeNull();
  });
});

// ───────────────────────────── (2) Am echten Knopf läuft dann die Aktion ─────────────────────────────

describe('A92 Antwort 7 – Sperre fällt bei offenem Blatt weg → Tippen führt die Aktion aus', () => {
  it('A92 H3: Hausblatt „Alle Helfer beschäftigt“ – 1 ms vor Auftragsende Meldung; ist der Helfer fertig, beauftragt Tippen ihn', async () => {
    // Haus mit Übergabestation (Starthaus), damit kein nachrangiger Grund (H4) die Aktion im Kern ablehnt
    const uhr = { t: T0 }, s = neu(3, uhr), o = s.stand.objekte.find((x) => KATALOG[x.typ].kategorie === 'haus' && x.station && !x.ohne_station)!;
    expect(o).toBeDefined();
    const andere = s.stand.objekte.filter((x) => KATALOG[x.typ].kategorie === 'haus' && x !== o);
    expect(andere.length).toBeGreaterThanOrEqual(HELFER.length);
    // erster Helfer wird nach 3 Minuten frei, die anderen später
    HELFER.forEach((h, i) => { const haus = andere[i]; haus.upgrade = 1; haus.upgrade_auftrag = { helfer: h, ende_ms: T0 + 180_000 + i * 60_000 }; });
    let geld = 0;
    await karte(s, o, uhr, (b) => {
      const k = b.einer('Alle Helfer beschäftigt');
      expect(gesperrtMitHinweis(k)).toBe(true);
      uhr.t = T0 + 179_999; s.bis(uhr.t);
      expect(b.tippe(k)).toBe('Alle Helfer sind gerade beschäftigt. Der nächste ist in 1s frei.');
      expect(o.upgrade_auftrag).toBeFalsy();
      uhr.t = T0 + 180_000; s.bis(uhr.t); // der Kern meldet den ersten Helfer fertig
      geld = s.stand.geld_eur; // Betriebskosten der Wartezeit sind schon abgebucht
      expect(b.tippe(k)).toBeUndefined();
    });
    expect(o.upgrade_auftrag?.helfer).toBe(HELFER[0]);
    expect(o.upgrade_auftrag?.ende_ms).toBeGreaterThan(T0 + 180_000);
    expect(s.stand.geld_eur).toBe(geld - UPGRADES[0].kosten_eur); // Hydraulischer Abgleich 1.500 €
  });

  it('A92 H1: Großabnehmer-Blatt Gewerbe „Vertrag unterschreiben“ – Heizzentrale wird Stufe 2, Tippen unterschreibt', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr), o = gewerbe(s);
    expect(s.vertragBedingungen(o).fehlt).toEqual(['Heizzentrale Stufe 2']);
    await karte(s, o, uhr, (b) => {
      const k = b.einer('Vertrag unterschreiben');
      expect(gesperrtMitHinweis(k)).toBe(true);
      expect(b.tippe(k)).toBe('Für den Vertrag fehlt noch: Heizzentrale Stufe 2.');
      expect(o.zustand).not.toBe('vertrag');
      s.hz.stufe = 2; s.neuBerechnen(); // Ausbau fertig, während das Blatt offen war
      expect(b.tippe(k)).toBeUndefined();
    });
    expect(o.zustand).toBe('vertrag');
  });

  it('A92 Regel 5: Baumenü „Sofort fertig“ – 1 Taler zu wenig: Meldung; mit genau passenden Talern beschleunigt Tippen den Bau', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    const bau = { art: 'neu' as const, start_ms: T0, ende_ms: T0 + 900_000 };
    s.stand.abschnitt = { phase: 'bau', bau };
    const c = s.beschleunigungskosten_taler(bau);
    expect(c).toBeGreaterThan(1);
    s.stand.taler = c - 1;
    await baumenue(s, 'netz', uhr, (b) => {
      const k = b.einer('Sofort fertig');
      expect(gesperrtMitHinweis(k)).toBe(true);
      expect(b.tippe(k)).toBe('Dir fehlen noch 1 Dorftaler. Du bekommst sie für Aufträge und beim Wegräumen.');
      expect(s.abschnitt?.phase).toBe('bau');
      s.stand.taler = c; // Auftrag erledigt, Taler kamen, während das Menü offen war
      expect(b.tippe(k)).toBeUndefined();
    });
    expect(s.stand.taler).toBe(0);
    expect(s.abschnitt).toBeFalsy(); // Bauabschnitt fertig – die Leitungen liegen
  });
});
