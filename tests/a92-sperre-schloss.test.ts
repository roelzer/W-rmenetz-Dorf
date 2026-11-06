import { describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import type { Nachbardorf } from '../src/core/nachbarn';
import type { Objekt } from '../src/core/typen';
import { SYMBOLE } from '../src/ui/symbole';
import { attrappe, type Attrappe, type AttrappenElement } from './hilfen/kontext-attrappe';
import { gesperrtMitHinweis } from './hilfen/gesperrt';
import { echteSteuerung, tippe as echtTippe } from './hilfen/echte-steuerung';
import { UI_LEERLAUF } from './hilfen/ui-leerlauf';

// A92 / DESIGN.md 12.19 (NR16-B1, Nachbesserung nach Review W1/K-b):
// - Jeder gesperrte Knopf zeigt in Zeile 2 das Schloss vor dem Grund („Dickere“, „Hausanschluss ziehen“, „Leitung selbst legen“,
//   Großabnehmer „<Leitung> legen“); freie Knöpfe zeigen kein Schloss.
// - „Stufe X“ einer Quelle im Heizhaus, die erst nach dem Ausbau der Heizzentrale geht, erklärt sich beim Antippen.
// - „Gefällt mir“ beim Dorfbesuch: zweimal tippen mag nur einmal, der Knopf ist danach gesperrt.
// Echtes Kernmodul und echte Oberflächen-Module; ohne Browser über die DOM-Attrappe der Testhilfen.

const T0 = 1_000_000_000_000;
// DESIGN.md 12.20 S2: Heizhaus-Quelle „Stufe {n+1}“, Hinweis nennt die nötige Stufe und wo der Ausbau steht.
const HZ_HINWEIS = 'Stufe 2 gibt es, sobald die Heizzentrale Stufe 2 hat. Der Ausbau steht unten im Blatt.';

const neu = (stufe = 1) => {
  const s = new Spiel(neuerSpielstand(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
type Handler = (e?: unknown) => void;
const ev = { preventDefault: () => {}, stopPropagation: () => {} };
/** Tippen wie im Browser: ein Knopf mit HTML-disabled bekommt keinen Klick. */
const tippe = (el: AttrappenElement): void => { if (!('disabled' in el.attrs)) (el.on.click as Handler | undefined)?.(ev); };

/** Attrappe mit classList, textContent, document.body und getElementById('app'). */
function attrappePlus(): { a: Attrappe; app: AttrappenElement } {
  const a = attrappe();
  Object.defineProperty(a.El.prototype, 'classList', {
    get(this: AttrappenElement) {
      const liste = () => this.className.split(' ').filter(Boolean);
      return {
        add: (k: string) => { if (!liste().includes(k)) this.className = [...liste(), k].join(' '); },
        remove: (k: string) => { this.className = liste().filter((x) => x !== k).join(' '); },
        contains: (k: string) => liste().includes(k),
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
  return { a, app };
}

/** Oberflächen-Module frisch mit der Attrappe laden; Meldungen werden gesammelt. */
async function mitAttrappe<E>(arbeit: (a: Attrappe, toasts: string[], app: AttrappenElement) => Promise<E>): Promise<E> {
  const { a, app } = attrappePlus();
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
  try { return await arbeit(a, toasts, app); } finally {
    vi.unstubAllGlobals();
    for (const m of ['../src/ui/blatt', '../src/ui/bild', '../src/ui/toast', '../src/ui/sprecher']) vi.doUnmock(m);
  }
}
const knoepfe = (a: Attrappe, c: AttrappenElement) => a.alle(c).filter((e) => e.tag === 'button');
const mit = (a: Attrappe, c: AttrappenElement, anfang: string) => knoepfe(a, c).filter((e) => a.text(e).startsWith(anfang));

/** Kontextkarte bauen; `tun` läuft noch mit der Attrappe. */
async function karte(s: Spiel, o: Objekt, tun?: (a: Attrappe, c: AttrappenElement) => void) {
  return mitAttrappe(async (a, toasts) => {
    const { Kontext } = await import('../src/ui/kontext');
    const gestempelt: string[] = [];
    const ui = { ...UI_LEERLAUF, spiel: s, jetzt_ms: () => T0, geaendert: () => s.neuBerechnen(), stempeln: (t: string) => gestempelt.push(t), toast: (t: string) => toasts.push(t), katalog: () => {} };
    const k = new Kontext(ui as unknown as ConstructorParameters<typeof Kontext>[0], () => {});
    const c = new a.El('div');
    (k as unknown as { inhalt: (c: unknown, o: Objekt) => void }).inhalt(c, o);
    tun?.(a, c);
    return { a, c, toasts, gestempelt };
  });
}

/** Zeile 2 (small) des Knopfs beginnt mit dem Schloss-Symbol (DESIGN.md 12.19: Schloss vor dem Grund). */
function schlossVorGrund(a: Attrappe, knopf: AttrappenElement): boolean {
  const zeile2 = knopf.kinder.find((k): k is AttrappenElement => k instanceof a.El && k.tag === 'small');
  const erstes = zeile2?.kinder[0];
  if (!(erstes instanceof a.El) || !erstes.className.split(' ').includes('schloss-klein')) return false;
  const svg = erstes.kinder[0];
  return svg instanceof a.El && svg.attrs.quelle === SYMBOLE.schloss;
}
/** Irgendwo im Knopf ein Schloss? (für freie Knöpfe: es darf keins geben) */
const hatSchloss = (a: Attrappe, knopf: AttrappenElement): boolean => a.alle(knopf).some((e) => e.attrs.quelle === SYMBOLE.schloss);

const bad = (s: Spiel) => s.stand.objekte.find((o) => o.typ === 'bad')!;
const haus = (s: Spiel) => s.stand.objekte.find((o) => o.x === 9 && o.y === 15)!;
const leitungOhneDickere = (s: Spiel): Objekt => {
  s.stand.objekte.push({ id: 9001, typ: 'd25', x: 30, y: 30, stufe: 1, bau: null, kasse_eur: 0 });
  s.neuBerechnen();
  return s.stand.objekte.find((o) => o.id === 9001)!;
};

describe('A92 / 12.19 – Schloss in Zeile 2 bei gesperrten Knöpfen', () => {
  it('A92: Großabnehmer ohne Bauabschnitt – „40er-Leitung legen“ gesperrt mit Schloss vor dem Grund', async () => {
    const s = neu(1);
    const { a, c } = await karte(s, bad(s));
    const k = mit(a, c, '40er-Leitung legen');
    expect(k).toHaveLength(1);
    expect(gesperrtMitHinweis(k[0])).toBe(true);
    expect(schlossVorGrund(a, k[0])).toBe(true);
  });

  it('A92: Großabnehmer mit offenem Bauabschnitt – „40er-Leitung legen“ frei, ohne Schloss', async () => {
    const s = neu(1);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    const { a, c } = await karte(s, bad(s));
    const k = mit(a, c, '40er-Leitung legen');
    expect(k).toHaveLength(1);
    expect('aria-disabled' in k[0].attrs).toBe(false);
    expect(hatSchloss(a, k[0])).toBe(false);
  });

  it('A92: Hauskarte ohne Bauabschnitt – „Hausanschluss ziehen“ und „Leitung selbst legen“ mit Schloss vor dem Grund', async () => {
    const s = neu(1);
    const { a, c } = await karte(s, haus(s));
    // NR18-P0 (4.17): „Hausanschluss ziehen“ entfällt, es bleibt ein Knopf „Leitung selbst legen“ – rot bis NR18-P3
    expect(mit(a, c, 'Hausanschluss ziehen')).toHaveLength(0);
    for (const name of ['Leitung selbst legen']) {
      const k = mit(a, c, name);
      expect(k, name).toHaveLength(1);
      expect(gesperrtMitHinweis(k[0]), name).toBe(true);
      expect(schlossVorGrund(a, k[0]), name).toBe(true);
    }
  });

  it('A92: Hauskarte mit offenem Bauabschnitt – beide Knöpfe frei, ohne Schloss', async () => {
    const s = neu(1);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    const { a, c } = await karte(s, haus(s));
    // NR18-P0 (4.17): „Hausanschluss ziehen“ entfällt, es bleibt ein Knopf „Leitung selbst legen“ – rot bis NR18-P3
    expect(mit(a, c, 'Hausanschluss ziehen')).toHaveLength(0);
    for (const name of ['Leitung selbst legen']) {
      const k = mit(a, c, name);
      expect(k, name).toHaveLength(1);
      expect('aria-disabled' in k[0].attrs, name).toBe(false);
      expect(hatSchloss(a, k[0]), name).toBe(false);
    }
  });

  it('A92: „Dickere“ (Leitungskarte und Zeichenleiste über leitungsKnoepfe) mit Schloss vor dem Grund', async () => {
    await mitAttrappe(async (a) => {
      const { leitungsKnoepfe } = await import('../src/ui/kontext');
      const { knopf } = await import('../src/ui/bausteine');
      const s = neu(1);
      for (const kurz of [false, true]) {
        const liste = leitungsKnoepfe(s, null, (t) => knopf(t, () => {}), kurz) as unknown as AttrappenElement[];
        const dickere = liste.filter((k) => a.text(k).startsWith('Dickere'));
        expect(dickere, `kurz=${kurz}`).toHaveLength(1);
        expect(schlossVorGrund(a, dickere[0]), `kurz=${kurz}`).toBe(true);
      }
    });
  });

  it('A92: Leitungskarte einer 25er auf Stufe 1 – „Dickere“ trägt das Schloss auch in der echten Karte', async () => {
    const s = neu(1);
    const o = leitungOhneDickere(s);
    const { a, c } = await karte(s, o);
    const k = mit(a, c, 'Dickere');
    expect(k).toHaveLength(1);
    expect(schlossVorGrund(a, k[0])).toBe(true);
  });
});

describe('A92 / 12.19 – „Stufe X“ im Heizhaus erklärt sich beim Antippen', () => {
  it('A92: Kessel Stufe 1 bei Heizzentrale Stufe 1 – Tippen auf „Stufe 2“ zeigt den Hinweis und baut nicht aus', async () => {
    const s = neu(1);
    const hz = s.stand.objekte.find((o) => o.typ === 'hz')!;
    const geld = s.stand.geld_eur;
    const { toasts, a, c } = await karte(s, hz, (a, c) => {
      const k = knopfStufe2(a, c);
      expect(k, 'genau ein gesperrter Knopf „Stufe 2“ im Heizhaus').toHaveLength(1);
      tippe(k[0]);
    });
    expect(gesperrtMitHinweis(knopfStufe2(a, c)[0])).toBe(true);
    expect(toasts).toEqual([HZ_HINWEIS]);
    expect(s.stand.innen[0].stufe).toBe(1);
    expect(s.stand.geld_eur).toBe(geld);
  });

  it('A92: Heizzentrale Stufe 2 – Kessel „Stufe 2“ ist frei, Tippen zeigt keinen Hinweis', async () => {
    const s = neu(2);
    const hz = s.stand.objekte.find((o) => o.typ === 'hz')!;
    const { toasts } = await karte(s, hz, (a, c) => {
      const k = mit(a, c, 'Stufe 2').filter((e) => !a.text(e).includes('erst Heizzentrale ausbauen'));
      expect(k.length).toBeGreaterThan(0);
      for (const x of k) expect('aria-disabled' in x.attrs).toBe(false);
    });
    expect(toasts).toEqual([]);
  });
});
const knopfStufe2 = (a: Attrappe, c: AttrappenElement) => mit(a, c, 'Stufe 2').filter((e) => a.text(e) === 'Stufe 2erst Heizzentrale ausbauen');

describe('A92 / K-b – „Gefällt mir“ beim Dorfbesuch', () => {
  it('A92: zweimal tippen → einmal mögen, eine Meldung, Knopf danach gesperrt mit „Gefällt dir“', async () => {
    // Echte Steuerung (tests/hilfen/echte-steuerung.ts) statt Object.create(Steuerung.prototype), Tester-Vorarbeit NR16-B2b.
    const s = neu(1);
    let gemocht = 0;
    const echt = s.moegen.bind(s);
    s.moegen = (name: string) => { gemocht++; return echt(name); };
    const hz = s.stand.objekte.find((o) => o.typ === 'hz')!;
    const dorf: Nachbardorf = { name: 'Lindenau', besitzer: 'Ana', stufe: 2, objekte: [hz], innen: [], netz: s.netz, dorfwert: 1 };
    await echteSteuerung(s, (u) => {
      (u.st as unknown as { besuchStarten: (v: Nachbardorf) => void }).besuchStarten(dorf);
      u.meldungen.splice(0);
      const knopf = u.knoepfe().filter((e) => e.isConnected && e.textContent.startsWith('Gefällt mir'));
      expect(knopf).toHaveLength(1);
      expect('aria-disabled' in knopf[0].attrs, 'vorher frei').toBe(false);
      echtTippe(knopf[0]);
      echtTippe(knopf[0]);
      expect(gemocht).toBe(1);
      expect(s.stand.gemocht).toEqual({ Lindenau: true });
      expect(u.meldungen).toEqual(['Lindenau gefällt dir!']);
      expect(knopf[0].textContent).toBe('Gefällt dir');
      expect(gesperrtMitHinweis(knopf[0])).toBe(true);
    });
  });
});
