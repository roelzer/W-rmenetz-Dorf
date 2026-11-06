import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { HELFER, KATALOG, PREISSTUFEN } from '../src/core/katalog';
import type { Nachbardorf } from '../src/core/nachbarn';
import type { Objekt } from '../src/core/typen';
import { SYMBOLE } from '../src/ui/symbole';
import { attrappe, type Attrappe, type AttrappenElement } from './hilfen/kontext-attrappe';
import { echteSteuerung } from './hilfen/echte-steuerung';
import { gesperrtMitHinweis } from './hilfen/gesperrt';
import { UI_LEERLAUF } from './hilfen/ui-leerlauf';

// Tester-Vorarbeit NR16-B2a (A92): Sperrtexte nach DESIGN.md 12.20 und Hausanschluss-Erklärsätze (ENTSCHEIDUNGEN 2026-11-05).
// Je Tabellenzeile: Zeile 2 (Grund im Knopf), Schloss ja/nein, wörtlicher Hinweis beim Antippen. Dazu Regel 4 (Rangfolge),
// Regel 3 (≤ 90 Zeichen, Werte zum Zeitpunkt des Antippens), Regel 5 (Fehlbetrag aufgerundet, Dorftaler) und Antwort (7)
// (kam das Geld inzwischen, läuft beim Tippen die normale Aktion). Echtes Kernmodul, echte Blätter (Antwort 8), ohne Browser.
// Erwartete Texte stehen wörtlich in DESIGN.md 12.20 bzw. ENTSCHEIDUNGEN; Zahlen (Stufen, Preise, Grenzen) aus den Tabellen dort
// bzw. src/core/katalog.ts und freischaltung.ts, von Hand eingesetzt.
// Leerzeichen: In Meldungen sind normales und geschütztes Leerzeichen erlaubt (Antwort 2) – Vergleich nach `norm`.
// Im Seitenblatt steht in Zeile 2 ein normales Leerzeichen (Antwort 1) – dort wird für die Stufen-Gründe roh verglichen.

const T0 = 1_000_000_000_000;
const norm = (t: string): string => t.replace(/ /g, ' ');
const GELD_HINWEIS = (betrag: string): string => `Dir fehlen noch ${betrag}. Am Monatsende zahlen deine Kunden ihre Wärmerechnung.`;
const TALER_HINWEIS = (n: number): string => `Dir fehlen noch ${n} Dorftaler. Du bekommst sie für Aufträge und beim Wegräumen.`;
const B1_HINWEIS = 'Erst mit Philipp einen Bauabschnitt planen: Bauen → Leitungen.';
// umgebaut NR18-D 06.11.: Im Hausblatt steht der Philipp-Knopf direkt darüber – dort zeigt der Hinweis auf ihn (DESIGN 12.22);
// Großabnehmer und andere Stellen behalten B1_HINWEIS.
const B1_HINWEIS_HAUS = 'Erst mit Philipp einen Bauabschnitt planen – Knopf direkt darüber.';
const HA_LANG_1 = 'Grenzt eine Leitung an ein Haus, kann es darüber Wärme bekommen – den kurzen Abzweig setzt das Spiel selbst.';
const HA_LANG_2 = 'Endet ein eigenes Leitungsstück am Haus, ist es sein Hausanschluss; er muss dick genug für das Haus sein.';
const HA_KURZ = 'Endet eine Leitung an einem Haus, ist es sein Hausanschluss – er muss dick genug für das Haus sein.';

type Uhr = { t: number };
const neu = (stufe = 1, uhr: Uhr = { t: T0 }) => {
  const s = new Spiel(altesStartdorf(T0), () => uhr.t);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
const haus = (s: Spiel) => s.stand.objekte.find((o) => o.x === 9 && o.y === 15)!;
const bad = (s: Spiel) => s.stand.objekte.find((o) => o.typ === 'bad')!;
const hz = (s: Spiel) => s.stand.objekte.find((o) => o.typ === 'hz')!;
const puffer = (s: Spiel, stufe: number): Objekt => {
  s.stand.objekte.push({ id: 9201, typ: 'puffer', x: 30, y: 30, stufe, bau: null, kasse_eur: 0 });
  s.neuBerechnen();
  return s.stand.objekte.find((o) => o.id === 9201)!;
};

type Handler = (e?: unknown) => void;
const ev = { preventDefault: () => {}, stopPropagation: () => {} };

/** Attrappe mit classList, textContent, document.body und getElementById('app') (Muster tests/a92-sperre-schloss.test.ts). */
function attrappePlus(): { a: Attrappe; app: AttrappenElement } {
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
  return { a, app };
}

type B = {
  a: Attrappe; c: AttrappenElement; app: AttrappenElement; toasts: string[]; gestempelt: string[];
  /** Knöpfe, deren Text mit `anfang` beginnt */
  mit: (anfang: string) => AttrappenElement[];
  /** genau ein Knopf mit diesem Anfang */
  einer: (anfang: string) => AttrappenElement;
  /** Stufenknopf über sein aria-label */
  stepper: (label: string) => AttrappenElement;
  /** antippen und die neue Meldung (oder undefined) liefern */
  tippe: (k: AttrappenElement) => string | undefined;
};

/** Oberflächen-Module frisch mit der Attrappe laden; `arbeit` läuft, solange die Attrappe aktiv ist (Tippen nur dort). */
async function mitAttrappe(uhr: Uhr, arbeit: (b: Omit<B, 'c'> & { ui: Record<string, unknown> }, s?: Spiel) => Promise<void>, s?: Spiel): Promise<void> {
  const { a, app } = attrappePlus();
  const toasts: string[] = [], gestempelt: string[] = [];
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
    ...UI_LEERLAUF, spiel: s, jetzt_ms: () => uhr.t, geaendert: () => s?.neuBerechnen(), stempeln: (t: string) => gestempelt.push(t),
    toast: (t: string) => toasts.push(t), katalog: () => {}, verschieben: () => {},
  };
  const knoepfeIn = (root: AttrappenElement) => a.alle(root).filter((e) => e.tag === 'button');
  const helfer = (root: () => AttrappenElement) => ({
    mit: (anfang: string) => knoepfeIn(root()).filter((e) => a.text(e).startsWith(anfang)),
    einer: (anfang: string) => { const k = knoepfeIn(root()).filter((e) => a.text(e).startsWith(anfang)); expect(k, `genau ein Knopf „${anfang}…“`).toHaveLength(1); return k[0]; },
    stepper: (label: string) => { const k = knoepfeIn(root()).filter((e) => e.attrs['aria-label'] === label); expect(k, `Stufenknopf „${label}“`).toHaveLength(1); return k[0]; },
  });
  let wurzel: AttrappenElement = app;
  const tippe = (k: AttrappenElement): string | undefined => {
    const vorher = toasts.length;
    if (!('disabled' in k.attrs)) (k.on.click as Handler | undefined)?.(ev);
    return toasts.length > vorher ? toasts[toasts.length - 1] : undefined;
  };
  try {
    await arbeit({ a, app, toasts, gestempelt, ui, tippe, ...helfer(() => wurzel), setzeWurzel: (w: AttrappenElement) => { wurzel = w; } } as unknown as Omit<B, 'c'> & { ui: Record<string, unknown> }, s);
  } finally {
    vi.unstubAllGlobals();
    for (const m of ['../src/ui/blatt', '../src/ui/bild', '../src/ui/toast', '../src/ui/sprecher']) vi.doUnmock(m);
  }
}

/** Kontextkarte (Seitenblatt) eines Objekts aufbauen; `tun` läuft mit aktiver Attrappe. */
async function karte(s: Spiel, o: Objekt, uhr: Uhr, tun: (b: B) => void | Promise<void>): Promise<void> {
  await mitAttrappe(uhr, async (b) => {
    const { Kontext } = await import('../src/ui/kontext');
    const k = new Kontext(b.ui as unknown as ConstructorParameters<typeof Kontext>[0], () => {});
    const c = new b.a.El('div');
    (k as unknown as { inhalt: (c: unknown, o: Objekt) => void }).inhalt(c, o);
    (b as unknown as { setzeWurzel: (w: AttrappenElement) => void }).setzeWurzel(c);
    await tun({ ...b, c });
  }, s);
}

/** Baumenü (Katalog) mit Reiter `reiter` aufbauen. */
async function baumenue(s: Spiel, reiter: string, uhr: Uhr, tun: (b: B & { katalog: unknown }) => void | Promise<void>): Promise<void> {
  await mitAttrappe(uhr, async (b) => {
    const { Katalog } = await import('../src/ui/katalog');
    const k = new Katalog(b.ui as unknown as ConstructorParameters<typeof Katalog>[0]);
    k.oeffnen(reiter);
    const c = (k as unknown as { blatt: { inhalt: AttrappenElement } }).blatt.inhalt;
    (b as unknown as { setzeWurzel: (w: AttrappenElement) => void }).setzeWurzel(c);
    await tun({ ...b, c, katalog: k });
  }, s);
}

/** Zeile 2 = das `small` im Knopf (ohne Symbol). */
function zeile2(a: Attrappe, k: AttrappenElement): string | null {
  const z = k.kinder.find((x): x is AttrappenElement => x instanceof a.El && x.tag === 'small');
  return z ? a.text(z) : null;
}
/** Schloss-Symbol in Zeile 2 (DESIGN.md 12.19/12.20 Regel 2). */
function schlossInZeile2(a: Attrappe, k: AttrappenElement): boolean {
  const z = k.kinder.find((x): x is AttrappenElement => x instanceof a.El && x.tag === 'small');
  return !!z && a.alle(z).some((e) => e.attrs.quelle === SYMBOLE.schloss);
}
const irgendeinSchloss = (a: Attrappe, k: AttrappenElement): boolean => a.alle(k).some((e) => e.attrs.quelle === SYMBOLE.schloss);

/** Prüft eine Tabellenzeile: gesperrt nach 12.19, Zeile 2, Schloss ja/nein, Hinweis wörtlich (Leerzeichenart egal). */
function pruefeZeile(b: B, k: AttrappenElement, soll: { zeile2?: string | null; schloss: boolean; hinweis: string }, name: string): void {
  expect(gesperrtMitHinweis(k), `${name}: aria-disabled ohne disabled`).toBe(true);
  if (soll.zeile2 !== undefined) expect(zeile2(b.a, k) === null ? null : norm(zeile2(b.a, k)!), `${name}: Zeile 2`).toBe(soll.zeile2);
  expect(soll.schloss ? schlossInZeile2(b.a, k) : irgendeinSchloss(b.a, k), `${name}: Schloss ${soll.schloss ? 'ja' : 'nein'}`).toBe(soll.schloss);
  const t = b.tippe(k);
  expect(t === undefined ? undefined : norm(t), `${name}: Hinweis beim Antippen`).toBe(soll.hinweis);
}

// ───────────────────────────── Tabelle 12.20, Stufen und Ziele ─────────────────────────────

describe('A92 / 12.20 S1–S3 – Ausbau-Knöpfe', () => {
  it('A92 S1: Pufferspeicher Stufe 1 bei Heizzentrale Stufe 1 – „erst Heizzentrale ausbauen“, Schloss, Hinweis nennt Stufe 2', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr), o = puffer(s, 1);
    await karte(s, o, uhr, (b) => {
      pruefeZeile(b, b.einer('Stufe 2'), { zeile2: 'erst Heizzentrale ausbauen', schloss: true, hinweis: 'Stufe 2 gibt es, sobald die Heizzentrale Stufe 2 hat. Baue sie zuerst aus.' }, 'S1');
    });
    expect(o.stufe).toBe(1);
  });

  it('A92 S1: andere Werte – Puffer Stufe 3 bei Heizzentrale Stufe 3 nennt Stufe 4 (nicht fest „2“)', async () => {
    const uhr = { t: T0 }, s = neu(3, uhr), o = puffer(s, 3);
    await karte(s, o, uhr, (b) => {
      pruefeZeile(b, b.einer('Stufe 4'), { zeile2: 'erst Heizzentrale ausbauen', schloss: true, hinweis: 'Stufe 4 gibt es, sobald die Heizzentrale Stufe 4 hat. Baue sie zuerst aus.' }, 'S1/3');
    });
  });

  it('A92 S1 + Regel 4: ohne Geld zählt trotzdem die Stufe (Zeile 2 und Hinweis), nicht der Fehlbetrag', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr), o = puffer(s, 1);
    s.stand.geld_eur = 0;
    await karte(s, o, uhr, (b) => {
      pruefeZeile(b, b.einer('Stufe 2'), { zeile2: 'erst Heizzentrale ausbauen', schloss: true, hinweis: 'Stufe 2 gibt es, sobald die Heizzentrale Stufe 2 hat. Baue sie zuerst aus.' }, 'S1 ohne Geld');
    });
  });

  it('A92 S2: Heizhaus, Kessel Stufe 2 bei Heizzentrale Stufe 2 – „Stufe 3“ mit Schloss, Hinweis verweist auf den Ausbau unten im Blatt', async () => {
    const uhr = { t: T0 }, s = neu(2, uhr);
    s.stand.innen[0].stufe = 2; s.neuBerechnen();
    await karte(s, hz(s), uhr, (b) => {
      const k = b.mit('Stufe 3').filter((e) => norm(zeile2(b.a, e) ?? '').toLowerCase() === 'erst heizzentrale ausbauen');
      expect(k, 'genau ein gesperrter Knopf „Stufe 3“ im Heizhaus').toHaveLength(1);
      pruefeZeile(b, k[0], { zeile2: 'erst Heizzentrale ausbauen', schloss: true, hinweis: 'Stufe 3 gibt es, sobald die Heizzentrale Stufe 3 hat. Der Ausbau steht unten im Blatt.' }, 'S2');
    });
    expect(s.stand.innen[0].stufe).toBe(2);
  });

  it('A92 S3: Heizzentrale mit offenen Zielen – „Ziele noch offen“, Schloss, Hinweis auf die Ziele oben im Blatt', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    expect(s.hzZiele().some((z) => !z.erreicht), 'Vorbedingung: Ziele offen').toBe(true);
    await karte(s, hz(s), uhr, (b) => {
      pruefeZeile(b, b.einer('Ausbauen auf Stufe 2'), { zeile2: 'Ziele noch offen', schloss: true, hinweis: 'Erst alle Ziele für die nächste Stufe erreichen – sie stehen weiter oben im Blatt.' }, 'S3');
    });
    expect(hz(s).stufe).toBe(1);
  });

  it('A92 S3g: Puffer Stufe 1 bei Heizzentrale Stufe 2, „Ausbauen auf Stufe 2“, Geld fehlt 0,5 € – Preis bleibt in Zeile 2, kein Schloss, Fehlbetrag aufgerundet „1 €“', async () => {
    const uhr = { t: T0 }, s = neu(2, uhr), o = puffer(s, 1);
    s.stand.geld_eur = 26_000 - 0.5; // Preis Stufe 2 = 650 € × kosten_faktor 40 = 26.000 € (katalog.ts)
    await karte(s, o, uhr, (b) => {
      const k = b.einer('Ausbauen auf Stufe 2');
      expect(norm(zeile2(b.a, k) ?? '')).toContain('26.000 €');
      pruefeZeile(b, k, { schloss: false, hinweis: GELD_HINWEIS('1 €') }, 'S3g');
    });
    expect(o.stufe).toBe(1);
  });
});

// ───────────────────────────── Bauabschnitt (B1–B5, B8–B10) ─────────────────────────────

// NR18-P0 (Bauplan NR18 4.15): Der Knopf „Hausanschluss ziehen“ entfällt; im Hausblatt bleibt genau „Leitung selbst legen“ mit derselben
// Zeile 2 und demselben Hinweis. Die Prüfung „kein Knopf Hausanschluss ziehen“ ist rot bis NR18-P3.
const ZEICHNEN_KNOEPFE = ['Leitung selbst legen'];
const KEIN_ZIEHEN = (b: B, lage: string): void => { expect(b.mit('Hausanschluss ziehen'), `${lage}: kein Knopf „Hausanschluss ziehen“ (NR18)`).toEqual([]); };
/** NR18-P0 (4.11): Hausanschluss selbst zeichnen – (10|15) unter der Vorsehung (10|14), Leitungsende neben dem Haus (9|15). */
const anschlussZeichnen = (s: Spiel) => s.platzieren('d25', 10, 15);

describe('A92 / 12.20 B1–B5 – Knöpfe, die einen offenen Bauabschnitt brauchen', () => {
  // Stand B2b (Designer-Treue Muss 1, 12.20 Regel 1 / 12.21): Im Hausblatt stehen zwei Knöpfe nebeneinander – Zeile 2 nutzt dort
  // die Kurzform aus 12.21 („kein Bauabschnitt“ …). Der Großabnehmer-Knopf steht allein und behält die lange Form. Hinweis überall lang.
  it('A92 B1: kein Bauabschnitt – Hausblatt Kurzform „kein Bauabschnitt“, Großabnehmer „braucht offenen Bauabschnitt“, Schloss, Hinweis', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    await karte(s, haus(s), uhr, (b) => {
      for (const n of ZEICHNEN_KNOEPFE) pruefeZeile(b, b.einer(n), { zeile2: 'kein Bauabschnitt', schloss: true, hinweis: B1_HINWEIS_HAUS }, n); // umgebaut NR18-D 06.11.
      KEIN_ZIEHEN(b, 'B1');
    });
    await karte(s, bad(s), uhr, (b) => {
      pruefeZeile(b, b.einer('40er-Leitung legen'), { zeile2: 'braucht offenen Bauabschnitt', schloss: true, hinweis: B1_HINWEIS }, 'Großabnehmer');
    });
  });

  it('A92 B2: in Planung – Hausblatt Kurzform „wird noch geplant“, Schloss; Hinweis nennt die Restzeit zum Zeitpunkt des Antippens', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.abschnitt = { phase: 'planung', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 30_000 } };
    await karte(s, haus(s), uhr, (b) => {
      const k = b.einer('Leitung selbst legen');
      uhr.t = T0 + 12_000; // Blatt bleibt offen, die Zeit läuft weiter: 18 s übrig
      pruefeZeile(b, k, { zeile2: 'wird noch geplant', schloss: true, hinweis: 'Philipp plant den Bauabschnitt noch (18s). Danach kannst du zeichnen.' }, 'B2');
      uhr.t = T0 + 29_500; // aufgerundet 1 s
      expect(norm(b.tippe(k) ?? '')).toBe('Philipp plant den Bauabschnitt noch (1s). Danach kannst du zeichnen.');
      uhr.t = T0;
      pruefeZeile(b, b.einer('Leitung selbst legen'), { zeile2: 'wird noch geplant', schloss: true, hinweis: 'Philipp plant den Bauabschnitt noch (30s). Danach kannst du zeichnen.' }, 'B2 volle Restzeit');
      KEIN_ZIEHEN(b, 'B2');
    });
  });

  it('A92 B3: Abschnitt wartet auf die Bestellung – Hausblatt Kurzform „Bestellung offen“, Schloss, Hinweis mit Laura', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.abschnitt = { phase: 'bestellen', bau: null };
    await karte(s, haus(s), uhr, (b) => {
      for (const n of ZEICHNEN_KNOEPFE) pruefeZeile(b, b.einer(n), { zeile2: 'Bestellung offen', schloss: true, hinweis: 'Abschnitt wartet auf Lauras Bestellung. Ändern: Bauen → Leitungen → Weiter einzeichnen.' }, n);
      KEIN_ZIEHEN(b, 'B3');
    });
  });

  it('A92 B4: Abschnitt wird gebaut – Hausblatt Kurzform „Abschnitt im Bau“, Großabnehmer „Abschnitt wird gebaut“, Schloss, Restzeit beim Antippen (7m 30s statt 10m)', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 600_000 } };
    await karte(s, haus(s), uhr, (b) => {
      const k = b.einer('Leitung selbst legen');
      uhr.t = T0 + 150_000;
      pruefeZeile(b, k, { zeile2: 'Abschnitt im Bau', schloss: true, hinweis: 'Der Bauabschnitt wird gerade gebaut (7m 30s). Danach kannst du den nächsten planen.' }, 'B4');
    });
    await karte(s, bad(s), uhr, (b) => {
      pruefeZeile(b, b.einer('40er-Leitung legen'), { zeile2: 'Abschnitt wird gebaut', schloss: true, hinweis: 'Der Bauabschnitt wird gerade gebaut (7m 30s). Danach kannst du den nächsten planen.' }, 'B4 Großabnehmer');
    });
  });

  it('A92 B5: Hausanschluss schon im Abschnitt – „kommt mit dem Bauabschnitt“, kein Schloss, Hinweis', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    expect(anschlussZeichnen(s).ok).toBe(true);
    await karte(s, haus(s), uhr, (b) => {
      pruefeZeile(b, b.einer('Hausanschluss geplant'), { zeile2: 'kommt mit dem Bauabschnitt', schloss: false, hinweis: 'Der Hausanschluss ist schon eingeplant. Gebaut wird er mit dem Bauabschnitt.' }, 'B5');
    });
  });
});

describe('A92 / 12.21 Kurzformen B1–B4 – Hausblatt kurz, Großabnehmer lang, Hinweis überall lang', () => {
  // Designer-Treue B2b Muss 1: Im Hausblatt stehen zwei Knöpfe nebeneinander (135 px bei 667×375); „braucht offenen Bauabschnitt“
  // bräche dort auf 3 Zeilen um (erlaubt 2, 12.20 Regel 1). Entscheidung: Hausblatt nutzt die Kurzformen aus 12.21 (≤ 18 Zeichen),
  // der Großabnehmer-Knopf (allein, volle Breite) die lange Form aus 12.20; der Hinweis beim Antippen ist überall die lange Form.
  // Restzeiten bewusst andere als in den übrigen Tests: Ende nach 250 s, getippt nach 40 s → 3m 30s.
  const FAELLE = [
    // umgebaut NR18-D 06.11.: hinweisHaus = Hinweis im Hausblatt; nur bei B1 anders (Philipp-Knopf direkt darüber, DESIGN 12.22)
    { nr: 'B1', abschnitt: null, kurz: 'kein Bauabschnitt', lang: 'braucht offenen Bauabschnitt', hinweis: B1_HINWEIS, hinweisHaus: B1_HINWEIS_HAUS },
    { nr: 'B2', abschnitt: { phase: 'planung', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 250_000 } }, kurz: 'wird noch geplant', lang: 'Philipp plant noch', hinweis: 'Philipp plant den Bauabschnitt noch (3m 30s). Danach kannst du zeichnen.', hinweisHaus: 'Philipp plant den Bauabschnitt noch (3m 30s). Danach kannst du zeichnen.' },
    { nr: 'B3', abschnitt: { phase: 'bestellen', bau: null }, kurz: 'Bestellung offen', lang: 'Abschnitt ist geplant', hinweis: 'Abschnitt wartet auf Lauras Bestellung. Ändern: Bauen → Leitungen → Weiter einzeichnen.', hinweisHaus: 'Abschnitt wartet auf Lauras Bestellung. Ändern: Bauen → Leitungen → Weiter einzeichnen.' },
    { nr: 'B4', abschnitt: { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 250_000 } }, kurz: 'Abschnitt im Bau', lang: 'Abschnitt wird gebaut', hinweis: 'Der Bauabschnitt wird gerade gebaut (3m 30s). Danach kannst du den nächsten planen.', hinweisHaus: 'Der Bauabschnitt wird gerade gebaut (3m 30s). Danach kannst du den nächsten planen.' },
  ] as const;

  for (const f of FAELLE) {
    it(`A92 ${f.nr}: Hausblatt-Zeile 2 „${f.kurz}“ (≤ 18 Zeichen), Großabnehmer „${f.lang}“, Hinweis beim Tippen in beiden lang`, async () => {
      expect(f.kurz.length, 'Kurzform höchstens 18 Zeichen (12.20 Regel 1)').toBeLessThanOrEqual(18);
      const uhr = { t: T0 }, s = neu(1, uhr);
      if (f.abschnitt) s.stand.abschnitt = structuredClone(f.abschnitt) as typeof s.stand.abschnitt;
      else delete s.stand.abschnitt;
      await karte(s, haus(s), uhr, (b) => {
        uhr.t = T0 + 40_000;
        for (const n of ZEICHNEN_KNOEPFE) pruefeZeile(b, b.einer(n), { zeile2: f.kurz, schloss: true, hinweis: f.hinweisHaus }, `${f.nr} Hausblatt ${n}`);
        KEIN_ZIEHEN(b, `${f.nr} Hausblatt`);
      });
      uhr.t = T0;
      await karte(s, bad(s), uhr, (b) => {
        uhr.t = T0 + 40_000;
        pruefeZeile(b, b.einer('40er-Leitung legen'), { zeile2: f.lang, schloss: true, hinweis: f.hinweis }, `${f.nr} Großabnehmer`);
      });
      expect(s.abschnitt?.phase ?? null, 'nichts geändert').toBe(f.abschnitt?.phase ?? null);
    });
  }
});

describe('A92 / 12.20 B6, B8–B10 – Baumenü und Geld', () => {
  it('A92 B6: Baumenü, offener Abschnitt ohne Leitung – „Abschnitt abschließen“: „noch nichts gezeichnet“, kein Schloss, Hinweis', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    await baumenue(s, 'netz', uhr, (b) => {
      pruefeZeile(b, b.einer('Abschnitt abschließen'), { zeile2: 'noch nichts gezeichnet', schloss: false, hinweis: 'Noch nichts gezeichnet. Wähle eine Leitung und zieh sie in der Karte.' }, 'B6');
    });
    expect(s.abschnitt?.phase).toBe('offen');
  });

  it('A92 B8: Hausblatt „Bauabschnitt planen lassen“ mit 1.999,50 € – Preis in Zeile 2, kein Schloss, Fehlbetrag aufgerundet „1 €“', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.geld_eur = 1_999.5;
    await karte(s, haus(s), uhr, (b) => {
      pruefeZeile(b, b.einer('Philipp: Bauabschnitt planen lassen'), { zeile2: '2.000 €', schloss: false, hinweis: GELD_HINWEIS('1 €') }, 'B8');
    });
    expect(s.abschnitt).toBeFalsy();
  });

  it('A92 B8: Baumenü „Neuen Bauabschnitt planen“ mit 765,50 € – Fehlbetrag 1.234,50 → „1.235 €“ mit Tausenderpunkt', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.geld_eur = 765.5;
    await baumenue(s, 'netz', uhr, (b) => {
      pruefeZeile(b, b.einer('Philipp: Neuen Bauabschnitt planen'), { zeile2: '2.000 €', schloss: false, hinweis: GELD_HINWEIS('1.235 €') }, 'B8 Baumenü');
    });
  });

  it('A92 B8: „Material bestellen“ mit 0,25 € zu wenig – Fehlbetrag „1 €“, kein „0 €“', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    expect(anschlussZeichnen(s).ok).toBe(true);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    const kost = s.abschnittKosten_eur();
    expect(kost).toBeGreaterThan(1);
    s.stand.geld_eur = kost - 0.25;
    await baumenue(s, 'netz', uhr, (b) => {
      pruefeZeile(b, b.einer('Laura: Material bestellen'), { schloss: false, hinweis: GELD_HINWEIS('1 €') }, 'B8 Material');
    });
    expect(s.abschnitt?.phase).toBe('bestellen');
  });

  it('A92 B9 + Regel 4: Expresslieferung auf Stufe 1 ohne Geld – Stufen-Grund mit Schloss, nicht der Fehlbetrag', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 600_000 } };
    s.stand.geld_eur = 0;
    await baumenue(s, 'netz', uhr, (b) => {
      const k = b.einer('Laura: Expresslieferung');
      expect(zeile2(b.a, k), 'Seitenblatt: normales Leerzeichen (Antwort 1)').toBe('ab Heizzentrale Stufe 2');
      pruefeZeile(b, k, { schloss: true, hinweis: 'Expresslieferung gibt es ab Heizzentrale Stufe 2. Baue die Heizzentrale aus.' }, 'B9');
    });
  });

  it('A92 B9: Expresslieferung auf Stufe 2, Geld fehlt 10,20 € – Preis, kein Schloss, Fehlbetrag „11 €“', async () => {
    const uhr = { t: T0 }, s = neu(2, uhr);
    s.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 600_000 } };
    const ex = s.expresskosten_eur();
    expect(ex).toBeGreaterThan(20);
    s.stand.geld_eur = ex - 10.2;
    await baumenue(s, 'netz', uhr, (b) => {
      pruefeZeile(b, b.einer('Laura: Expresslieferung'), { schloss: false, hinweis: GELD_HINWEIS('11 €') }, 'B9 Geld');
    });
  });

  it('A92 B10: „Sofort fertig“ mit 3 Talern zu wenig – „{c} Taler“ in Zeile 2, kein Schloss, Taler-Hinweis', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    const bau = { art: 'neu' as const, start_ms: T0, ende_ms: T0 + 600_000 };
    s.stand.abschnitt = { phase: 'bau', bau };
    const c = s.beschleunigungskosten_taler(bau);
    expect(c).toBeGreaterThan(3);
    s.stand.taler = c - 3;
    await baumenue(s, 'netz', uhr, (b) => {
      pruefeZeile(b, b.einer('Sofort fertig'), { zeile2: `${c} Taler`, schloss: false, hinweis: TALER_HINWEIS(3) }, 'B10');
    });
    expect(s.abschnitt?.phase).toBe('bau');
  });

  it('A92 Regel 6: Katalogkarte Pufferspeicher auf Stufe 1 – „Pufferspeicher ab Heizzentrale Stufe 2. Baue die Heizzentrale aus.“', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    await baumenue(s, 'netz', uhr, (b) => {
      (b.katalog as { waehlen: (t: string) => void }).waehlen('puffer');
      expect(b.toasts.map(norm)).toEqual(['Pufferspeicher ab Heizzentrale Stufe 2. Baue die Heizzentrale aus.']);
    });
  });

  it('A92 Regel 5: Katalogkarten sprechen wie die Knöpfe – „Dir fehlen noch 255 €.“ und „Dir fehlen noch 7 Dorftaler.“', async () => {
    const uhr = { t: T0 }, s = neu(2, uhr);
    s.stand.geld_eur = 12_000 - 254.5; // Pufferspeicher Stufe 1: 300 € × kosten_faktor 40 = 12.000 €
    for (let i = 0; i < 5 && (s.kosten('huette').taler ?? 0) < 8; i++) s.stand.objekte.push({ id: 9300 + i, typ: 'huette', x: 40 + i, y: 40, stufe: 1, bau: null, kasse_eur: 0 });
    const preis = s.kosten('huette').taler ?? 0;
    expect(preis).toBeGreaterThan(7);
    s.stand.taler = preis - 7;
    await baumenue(s, 'netz', uhr, (b) => {
      const waehlen = (t: string) => (b.katalog as { waehlen: (t: string) => void }).waehlen(t);
      waehlen('puffer');
      waehlen('huette');
      expect(b.toasts.map(norm)).toEqual([GELD_HINWEIS('255 €'), TALER_HINWEIS(7)]);
    });
  });

  it('A92 Antwort (7): Geld kam, während das Blatt offen war – Tippen führt die Aktion aus, keine „0 €“-Meldung', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.geld_eur = 0;
    await karte(s, haus(s), uhr, (b) => {
      const k = b.einer('Philipp: Bauabschnitt planen lassen');
      expect(gesperrtMitHinweis(k)).toBe(true);
      s.stand.geld_eur = 5_000;
      const t = b.tippe(k);
      expect(t ?? '').not.toMatch(/fehlen/);
    });
    expect(s.abschnitt?.phase).toBe('planung');
    expect(s.stand.geld_eur).toBe(3_000);
  });
});

// ───────────────────────────── Haus, Großabnehmer, Heizhaus (H, Z, R) ─────────────────────────────

describe('A92 / 12.20 H1–H5 – Haus und Großabnehmer', () => {
  // Die Liste der fehlenden Bedingungen liefert der Kern (vertragBedingungen); geprüft wird, wie das Blatt sie in Zeile 2
  // und Hinweis umsetzt – deshalb hier mit fest vorgegebener Liste (Texte im Format des Kerns, Beispiel aus 12.20 H1).
  const vertragMit = (s: Spiel, fehlt: string[]) => { s.vertragBedingungen = () => ({ ok: fehlt.length === 0, fehlt }); };

  it('A92 H1: drei Bedingungen offen – „noch 3 Bedingungen offen“, Schloss, Hinweis „… (und 2 weitere).“', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr), o = bad(s);
    vertragMit(s, ['Ruf 60 % (jetzt 45 %)', '120 kW freie Leistung (frei: 30 kW)', 'Heizzentrale Stufe 2']);
    await karte(s, o, uhr, (b) => {
      pruefeZeile(b, b.einer('Vertrag unterschreiben'), { zeile2: 'noch 3 Bedingungen offen', schloss: true, hinweis: 'Für den Vertrag fehlt noch: Ruf 60 % (jetzt 45 %) (und 2 weitere).' }, 'H1/3');
    });
    expect(o.zustand).not.toBe('vertrag');
  });

  it('A92 H1: genau eine Bedingung offen – Einzahl „Bedingung“, ohne „und … weitere“', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr), o = bad(s);
    vertragMit(s, ['Ruf 55 % (jetzt 41 %)']);
    await karte(s, o, uhr, (b) => {
      pruefeZeile(b, b.einer('Vertrag unterschreiben'), { zeile2: 'noch 1 Bedingung offen', schloss: true, hinweis: 'Für den Vertrag fehlt noch: Ruf 55 % (jetzt 41 %).' }, 'H1/1');
    });
  });

  it('A92 H2 + H5 + Regel 4: Haus auf Stufe 1 ohne Geld – Helfer und Puffer mit Stufen-Grund und Schloss', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.geld_eur = 0;
    await karte(s, haus(s), uhr, (b) => {
      const helfer = b.einer('Helfer beauftragen');
      expect(zeile2(b.a, helfer), 'Seitenblatt: normales Leerzeichen').toBe('ab Heizzentrale Stufe 3');
      pruefeZeile(b, helfer, { schloss: true, hinweis: 'Rücklauf-Helfer gibt es ab Heizzentrale Stufe 3. Baue die Heizzentrale aus.' }, 'H2');
      // NR19-P0b (P0b Punkt 3): Puffer-Teil (H5) gestrichen – „Puffer einbauen“ entfällt, die Puffer-Übergabestation ist ab Stufe 1 frei. Rot bis P6.
      expect(b.mit("Puffer einbauen")).toHaveLength(0);
    });
  });

  it('A92 H3: alle Helfer beschäftigt – „nächster frei in {Zeit}“, kein Schloss, Hinweis mit der kürzesten Restzeit beim Antippen', async () => {
    const uhr = { t: T0 }, s = neu(3, uhr);
    const andere = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o !== haus(s));
    expect(andere.length).toBeGreaterThanOrEqual(HELFER.length);
    HELFER.forEach((h, i) => { andere[i].upgrade_auftrag = { helfer: h, ende_ms: T0 + 120_000 + i * 60_000 }; });
    await karte(s, haus(s), uhr, (b) => {
      const k = b.einer('Alle Helfer beschäftigt');
      expect(norm(zeile2(b.a, k) ?? '')).toBe('nächster frei in 2m');
      uhr.t = T0 + 45_000;
      pruefeZeile(b, k, { schloss: false, hinweis: 'Alle Helfer sind gerade beschäftigt. Der nächste ist in 1m 15s frei.' }, 'H3');
    });
  });

  it('A92 H4: Haus ohne Übergabestation – Helfer-Knopf „erst Station wählen“, Schloss, Hinweis', async () => {
    const uhr = { t: T0 }, s = neu(3, uhr), o = haus(s);
    o.ohne_station = true; delete o.station; s.neuBerechnen();
    await karte(s, o, uhr, (b) => {
      const k = b.mit('').filter((e) => / beauftragen/.test(b.a.text(e)));
      expect(k, 'genau ein Knopf „{Helfer} beauftragen …“').toHaveLength(1);
      pruefeZeile(b, k[0], { zeile2: 'erst Station wählen', schloss: true, hinweis: 'Dieses Haus hat noch keine Übergabestation. Wähle oben im Blatt erst eine.' }, 'H4');
    });
    expect(o.upgrade_auftrag).toBeFalsy();
  });
});

describe('A92 / 12.20 Z1–Z3, R1–R4 – Heizhaus', () => {
  it('A92 Z1 + Z2 + Regel 4: Stufe 1 ohne Geld – PV aufs Dach und Baugebiet mit Stufen-Grund und Schloss', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.geld_eur = 0;
    await karte(s, hz(s), uhr, (b) => {
      const pv = b.einer('PV aufs Dach');
      expect(zeile2(b.a, pv)).toBe('ab Heizzentrale Stufe 4');
      pruefeZeile(b, pv, { schloss: true, hinweis: 'PV auf dem Heizhaus-Dach gibt es ab Heizzentrale Stufe 4. Baue die Heizzentrale aus.' }, 'Z1');
      const bg = b.einer('Baugebiet erschließen');
      expect(zeile2(b.a, bg)).toBe('ab Heizzentrale Stufe 4');
      pruefeZeile(b, bg, { schloss: true, hinweis: 'Baugebiet gibt es ab Heizzentrale Stufe 4. Baue die Heizzentrale aus.' }, 'Z2');
    });
  });

  it('A92 Z3: Stufe 4, zu wenig versorgte Häuser – „{ist}/6 Häuser versorgt“ statt Preis, Schloss, Hinweis mit Fehlmenge', async () => {
    const uhr = { t: T0 }, s = neu(4, uhr);
    const ist = s.stand.objekte.filter((o) => s.netz.warm.has(o.id) && KATALOG[o.typ].kategorie === 'haus').length;
    expect(ist).toBeLessThan(6);
    await karte(s, hz(s), uhr, (b) => {
      pruefeZeile(b, b.einer('Baugebiet erschließen'), { zeile2: `${ist}/6 Häuser versorgt`, schloss: true, hinweis: `Für das Baugebiet brauchst du 6 versorgte Häuser – dir fehlen noch ${6 - ist}.` }, 'Z3');
    });
    expect(s.stand.baugebiet).toBeFalsy();
  });

  it('A92 R1: Vorlauf-Regler auf Stufe 1 – beide Stufenknöpfe melden die Stufe, Vorlauf bleibt', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr), vorher = s.vorlauf_c;
    await karte(s, hz(s), uhr, (b) => {
      for (const l of ['Vorlauftemperatur senken', 'Vorlauftemperatur erhöhen']) {
        pruefeZeile(b, b.stepper(l), { schloss: false, hinweis: 'Den Vorlauf-Regler gibt es ab Heizzentrale Stufe 3. Baue die Heizzentrale aus.' }, l);
      }
    });
    expect(s.vorlauf_c).toBe(vorher);
  });

  it('A92 R2: Vorlauf am Rand (55 °C bzw. 85 °C) – Hinweis mit der Spielgrenze', async () => {
    const uhr = { t: T0 }, s = neu(3, uhr);
    s.vorlaufSetzen(55);
    expect(s.vorlauf_c).toBe(55);
    await karte(s, hz(s), uhr, (b) => {
      pruefeZeile(b, b.stepper('Vorlauftemperatur senken'), { schloss: false, hinweis: 'Im Spiel geht der Vorlauf nur bis 55 °C hinunter.' }, 'R2 min');
    });
    s.vorlaufSetzen(85);
    expect(s.vorlauf_c).toBe(85);
    await karte(s, hz(s), uhr, (b) => {
      pruefeZeile(b, b.stepper('Vorlauftemperatur erhöhen'), { schloss: false, hinweis: 'Im Spiel geht der Vorlauf nur bis 85 °C hinauf.' }, 'R2 max');
    });
  });

  it('A92 R3: Wärmepreis am Rand (7 bzw. 15 ct/kWh) – Hinweis mit dem Grenzpreis', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.preisSetzen(0);
    expect(s.stand.preisstufe, 'Vorbedingung: unterste Preisstufe gesetzt').toBe(0);
    await karte(s, hz(s), uhr, (b) => {
      pruefeZeile(b, b.stepper('Wärmepreis senken'), { schloss: false, hinweis: 'Günstiger geht es im Spiel nicht: 7 ct/kWh ist der niedrigste Preis.' }, 'R3 min');
    });
    s.preisSetzen(PREISSTUFEN.length - 1); // letzte Stufe der Tabelle (15 ct/kWh)
    expect(s.stand.preisstufe, 'Vorbedingung: oberste Preisstufe gesetzt').toBe(PREISSTUFEN.length - 1);
    expect(PREISSTUFEN[s.stand.preisstufe].ct_je_kwh).toBe(15);
    await karte(s, hz(s), uhr, (b) => {
      pruefeZeile(b, b.stepper('Wärmepreis erhöhen'), { schloss: false, hinweis: 'Teurer geht es im Spiel nicht: 15 ct/kWh ist der höchste Preis.' }, 'R3 max');
    });
  });

  it('A92 R4: Grundgebühr am Rand (25 € bzw. 40 €) – Hinweis mit der Grenze', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.grundgebuehrSetzen(25);
    expect(s.grundgebuehr_eur, 'Vorbedingung: Grundgebühr 25 €').toBe(25);
    await karte(s, hz(s), uhr, (b) => {
      pruefeZeile(b, b.stepper('Grundgebühr senken'), { schloss: false, hinweis: 'Die Grundgebühr geht im Spiel nicht unter 25 € im Monat.' }, 'R4 min');
    });
    s.grundgebuehrSetzen(40);
    expect(s.grundgebuehr_eur, 'Vorbedingung: Grundgebühr 40 €').toBe(40);
    await karte(s, hz(s), uhr, (b) => {
      pruefeZeile(b, b.stepper('Grundgebühr erhöhen'), { schloss: false, hinweis: 'Die Grundgebühr geht im Spiel nicht über 40 € im Monat.' }, 'R4 max');
    });
  });
});

describe('A92 / 12.20 D1 – „Gefällt dir“', () => {
  it('A92 D1: schon gemocht – Tippen auf „Gefällt dir“ sagt es, mag nicht noch einmal', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.gemocht = { Wiesental: true };
    let gemocht = 0;
    const echt = s.moegen.bind(s);
    s.moegen = (name: string) => { gemocht++; return echt(name); };
    // Echte Steuerung (tests/hilfen/echte-steuerung.ts) statt Object.create(Steuerung.prototype), Tester-Vorarbeit NR16-B2b.
    const dorf: Nachbardorf = { name: 'Wiesental', besitzer: 'Ana', stufe: 2, objekte: [hz(s)], innen: [], netz: s.netz, dorfwert: 1 };
    await echteSteuerung(s, (u) => {
      (u.st as unknown as { besuchStarten: (v: Nachbardorf) => void }).besuchStarten(dorf);
      const k = u.knoepfe().filter((e) => e.isConnected && e.textContent.trim() === 'Gefällt dir');
      expect(k, 'genau ein Knopf „Gefällt dir“').toHaveLength(1);
      expect(gesperrtMitHinweis(k[0])).toBe(true);
      u.meldungen.splice(0);
      k[0].click();
      expect(u.meldungen).toEqual(['Du hast Wiesental schon ein Gefällt mir gegeben.']);
    }, { uhr: () => uhr.t });
    expect(gemocht).toBe(0);
  });
});

// ───────────────────────────── Regel 3: jede Sperre meldet sich, höchstens 90 Zeichen ─────────────────────────────

describe('A92 / 12.20 Regel 3 – alle gesperrten Knöpfe in vielen Lagen', () => {
  it('A92 Regel 3: jeder aria-disabled-Knopf in Haus-, Großabnehmer-, Heizhaus-, Puffer-, Leitungsblatt und Baumenü meldet sich, ≤ 90 Zeichen; Zeile 2 ≤ 28 Zeichen', async () => {
    const phasen = [null, 'planung', 'offen', 'bestellen', 'bau'] as const;
    const fehler: string[] = [];
    let geprueft = 0;
    for (const stufe of [1, 2, 3, 4]) {
      for (const phase of phasen) {
        for (const arm of [false, true]) {
          const uhr = { t: T0 }, s = neu(stufe, uhr);
          if (phase === 'bestellen') { s.stand.abschnitt = { phase: 'offen', bau: null }; expect(anschlussZeichnen(s).ok).toBe(true); s.abschnittAbschliessen(); }
          else if (phase === 'offen') { s.stand.abschnitt = { phase: 'offen', bau: null }; }
          else if (phase) s.stand.abschnitt = { phase, bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 90_000 } };
          if (arm) { s.stand.geld_eur = 0.5; s.stand.taler = 0; }
          const ziele: Array<[string, Objekt | 'netz']> = [['Haus', haus(s)], ['Großabnehmer', bad(s)], ['Heizhaus', hz(s)], ['Puffer', puffer(s, Math.min(stufe, 4))], ['Baumenü', 'netz']];
          const leitung = s.stand.objekte.find((o) => o.typ.startsWith('d') && KATALOG[o.typ].kategorie === 'netz');
          if (leitung) ziele.push(['Leitung', leitung]);
          for (const [name, ziel] of ziele) {
            const lage = `Stufe ${stufe}, ${phase ?? 'kein Abschnitt'}, ${arm ? 'ohne Geld' : 'mit Geld'}, ${name}`;
            const pruefe = (b: B) => {
              const gesperrte = b.a.alle(b.c).filter((e) => e.tag === 'button' && e.attrs['aria-disabled'] === 'true');
              for (const k of gesperrte) {
                const titel = b.a.text(k) || k.attrs['aria-label'] || '?';
                const z2 = zeile2(b.a, k);
                if (z2 !== null && norm(z2).length > 28) fehler.push(`${lage}: „${titel}“ Zeile 2 hat ${norm(z2).length} Zeichen`);
                const t = b.tippe(k);
                geprueft++;
                if (!t) fehler.push(`${lage}: „${titel}“ meldet nichts`);
                else if (t.length > 90) fehler.push(`${lage}: „${titel}“ Meldung ${t.length} Zeichen`);
              }
            };
            if (ziel === 'netz') await baumenue(s, 'netz', uhr, pruefe); else await karte(s, ziel, uhr, pruefe);
          }
        }
      }
    }
    expect(geprueft, 'es gab gesperrte Knöpfe zu prüfen').toBeGreaterThan(40);
    expect(fehler).toEqual([]);
  }, 60_000);
});

// ───────────────────────────── Hausanschluss-Erklärsätze (ENTSCHEIDUNGEN 2026-11-05) ─────────────────────────────

const srcDateien = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = `${dir}/${n}`;
  return statSync(p).isDirectory() ? srcDateien(p) : p.endsWith('.ts') ? [p] : [];
});
const srcText = (): string => srcDateien(new URL('../src', import.meta.url).pathname).map((p) => readFileSync(p, 'utf8')).join('\n');

describe('A92 / Hausanschluss-Erklärsätze', () => {
  it('A92: Baumenü, offener Abschnitt ohne Anschluss – langer Erklärsatz vollständig, alter Satz weg', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    await baumenue(s, 'netz', uhr, (b) => {
      const t = norm(b.a.text(b.c));
      expect(t).toContain(HA_LANG_1);
      expect(t).toContain(HA_LANG_2);
      expect(t).not.toContain('ist das sein Hausanschluss');
    });
  });

  it('A92: Baumenü mit einem geplanten Anschluss – Zählung „– in diesem Abschnitt: 1“ direkt hinter „Hausanschluss“, Satz geht danach weiter', async () => {
    const uhr = { t: T0 }, s = neu(1, uhr);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    expect(anschlussZeichnen(s).ok).toBe(true);
    await baumenue(s, 'netz', uhr, (b) => {
      const t = norm(b.a.text(b.c));
      expect(t).toContain(HA_LANG_1);
      expect(t).toMatch(/Endet ein eigenes Leitungsstück am Haus, ist es sein Hausanschluss – in diesem Abschnitt: 1\b[^;.]*; er muss dick genug für das Haus sein\./);
    });
  });

  it('A92: kurzer Erklärsatz steht für die Zeichenleiste bereit, die alten Sätze stehen nirgends mehr im Spiel', () => {
    const q = srcText();
    expect(q).toContain(HA_KURZ);
    expect(q).not.toContain('Eine Leitung, die an ein Haus grenzt, ist sein Hausanschluss.');
    expect(q).not.toContain('ist das sein Hausanschluss');
    expect(q).not.toContain('Am besten endet ein eigenes Leitungsstück');
  });

  it('A92 S5: T-Stück-Hinweis höchstens 90 Zeichen, ohne den bewusst verschwiegenen Nutzen (Anbohren)', async () => {
    await mitAttrappe({ t: T0 }, async () => {
      const m = (await import('../src/ui/kontext')) as unknown as { tStueckHinweis: () => string };
      const t = m.tStueckHinweis();
      expect(norm(t)).toBe('Für Hausanschlüsse nicht nötig, den Abzweig setzt das Spiel. Frei ab Heizzentrale Stufe 4.');
      expect(t.length).toBeLessThanOrEqual(90);
      expect(t).not.toMatch(/Anbohr/);
    });
  });
});
