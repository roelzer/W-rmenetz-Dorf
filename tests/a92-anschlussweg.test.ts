import { describe, expect, it, vi } from 'vitest';
import { Spiel, type Ereignis } from '../src/core/spiel';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { ABSCHNITT_HELFER, KATALOG, KONSTANTEN, type TypId } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';
import { readFileSync } from 'node:fs';
import { SYMBOLE } from '../src/ui/symbole';
import { attrappe, type Attrappe, type AttrappenElement } from './hilfen/kontext-attrappe';
import { gesperrt, gesperrtMitHinweis, htmlDisabled } from './hilfen/gesperrt';
import { serialisieren } from '../src/core/speichern';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import { sichtbar, type El } from './hilfen/dom-attrappe';

// A92 (NR16) – Der Weg zum Hausanschluss erklärt sich: T-Stück-Hinweis beim Antippen, Sperren mit Grund ohne offenen
// Bauabschnitt, Planungsstand zählt live, „Angeschlossen …“ nur bei angeschlossenen Häusern, „Hausanschluss geplant“
// und richtig gebeugtes „1 Feld“. Echtes Kernmodul; ohne Browser über die DOM-Attrappe der Testhilfen.

const T0 = 1_000_000_000_000;
// DESIGN.md 12.20 S5, fachgeprüft (ENTSCHEIDUNGEN 2026-11-05): 90 Zeichen, der Nutzen (Anbohren sparen) bleibt vor Stufe 4 unerwähnt.
const TSTUECK_HINWEIS = 'Für Hausanschlüsse nicht nötig, den Abzweig setzt das Spiel. Frei ab Heizzentrale Stufe 4.';
// Hausblatt: zwei Knöpfe nebeneinander → Zeile 2 in der Kurzform aus DESIGN.md 12.21 (Designer-Treue B2b Muss 1, 12.20 Regel 1).
const OHNE_ABSCHNITT = 'kein Bauabschnitt';
// Hinweistexte beim Antippen gesperrter Knöpfe, wörtlich aus DESIGN.md 12.19 (Punkt 2) bzw. 12.18 (Leitung selbst legen).
// umgebaut NR18-D 06.11.: im Hausblatt zeigt der Hinweis ohne Abschnitt auf den Philipp-Knopf direkt darüber (DESIGN 12.22)
const SELBST_HINWEIS = 'Erst mit Philipp einen Bauabschnitt planen – Knopf direkt darüber.';
const DICKERE_HINWEIS = 'Dickere Leitungen gibt es ab Heizzentrale Stufe 2. Baue die Heizzentrale aus.';

const neu = (stufe = 1) => {
  const z = { t: T0 };
  const s = new Spiel(altesStartdorf(T0), () => z.t);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return { s, z };
};
const hinweise = (s: Spiel) => s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'hinweis' }> => e.art === 'hinweis').map((e) => e.text);
const offen = (s: Spiel) => { s.stand.abschnitt = { phase: 'offen', bau: null }; };
const objektBei = (s: Spiel, x: number, y: number) => s.stand.objekte.find((o) => o.x === x && o.y === y)!;
const lege = (s: Spiel, typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}): Objekt => {
  const o: Objekt = { id: s.stand.naechste_id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra };
  s.stand.objekte.push(o); return o;
};

/** Attrappe mit `textContent` wie im Browser (setzen ersetzt die Kinder durch einen Textknoten, lesen liefert den Text). */
function attrappeMitText(): Attrappe {
  const a = attrappe();
  Object.defineProperty(a.El.prototype, 'textContent', {
    get(this: AttrappenElement) { return a.text(this); },
    set(this: AttrappenElement, v: string) { this.kinder = [{ text: v }]; },
    configurable: true,
  });
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
  // document.body wie im Browser (steuerung.ts setzt dort die Klasse „weniger-bewegung“)
  (a.doc as unknown as { body: AttrappenElement }).body = new a.El('body');
  return a;
}

/** „Weniger Bewegung“: aus der Einstellung (Klasse am body, wie steuerung.ts) oder vom System (prefers-reduced-motion, stil.css). */
type Bewegung = 'normal' | 'einstellung' | 'system';

type Knopf = { text: string; aus: boolean; klick?: () => void; el: AttrappenElement };
/** Oberflächen-Module frisch mit der Attrappe laden; Toasts werden gesammelt. */
async function mitAttrappe<E>(arbeit: (a: Attrappe, toasts: string[], blatt: { inhalt: AttrappenElement; zu: () => void }) => Promise<E>, bewegung: Bewegung = 'normal'): Promise<E> {
  const a = attrappeMitText();
  const toasts: string[] = [];
  vi.resetModules();
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  if (bewegung === 'einstellung') (a.doc as unknown as { body: AttrappenElement }).body.className = 'weniger-bewegung';
  const matchMedia = (q: string) => ({ matches: bewegung === 'system' && q.includes('prefers-reduced-motion') && q.includes('reduce'), media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} });
  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('window', { matchMedia, setTimeout: (f: () => void, ms?: number) => setTimeout(f, ms), clearTimeout: (t: ReturnType<typeof setTimeout>) => clearTimeout(t), devicePixelRatio: 1 });
  const blatt = { inhalt: new a.El('div'), zu: () => {} };
  vi.doMock('../src/ui/blatt', () => ({ blattOeffnen: () => blatt, blattOffen: () => false }));
  vi.doMock('../src/ui/bild', () => ({ katalogBild: () => new a.El('canvas') }));
  vi.doMock('../src/ui/toast', () => ({ toast: (t: string) => toasts.push(t), hinweisMitKnopf: () => {} }));
  vi.doMock('../src/ui/sprecher', () => ({ sprecherZeigen: () => {} }));
  try { return await arbeit(a, toasts, blatt); } finally {
    vi.unstubAllGlobals();
    for (const m of ['../src/ui/blatt', '../src/ui/bild', '../src/ui/toast', '../src/ui/sprecher']) vi.doUnmock(m);
  }
}
const knoepfeIn = (a: Attrappe, c: AttrappenElement): Knopf[] => a.alle(c).filter((e) => e.tag === 'button').map((e) => ({ text: a.text(e), aus: gesperrt(e), klick: e.on.click, el: e }));
const mit = (k: Knopf[], anfang: string) => k.filter((x) => x.text.startsWith(anfang));
/** Das Element, das ein Tippen auf den Knopf empfängt. DESIGN.md 12.19: Der gesperrte Knopf trägt aria-disabled="true" statt
 *  disabled und empfängt das Tippen selbst (keine Hülle mehr). Mit HTML-disabled kommt im Browser kein Tippen an. */
const tippziel = (_a: Attrappe, _c: AttrappenElement, knopf: AttrappenElement): AttrappenElement | undefined =>
  !htmlDisabled(knopf) && knopf.on.click ? knopf : undefined;
type Ereignis_ = { key?: string; target: AttrappenElement; currentTarget: AttrappenElement; defaultPrevented: boolean; preventDefault: () => void; stopPropagation: () => void };
/** Ereignis-Attrappe wie im Browser (preventDefault merkt sich die Absage). */
const ereignis = (el: AttrappenElement, key?: string): Ereignis_ => {
  const ev: Ereignis_ = { key, target: el, currentTarget: el, defaultPrevented: false, preventDefault() { ev.defaultPrevented = true; }, stopPropagation() {} };
  return ev;
};
type Handler = (ev?: unknown) => void;
/** Tippen wie im Browser: Ein Knopf mit HTML-disabled bekommt keinen Klick, sonst läuft sein click-Handler. */
const tippe = (el: AttrappenElement): void => { if (!htmlDisabled(el)) (el.on.click as Handler | undefined)?.(ereignis(el)); };
/** Taste auf dem fokussierten Knopf wie im Browser: Enter löst nach keydown einen Klick aus, die Leertaste nach keyup –
 *  außer ein Handler sagt per preventDefault ab. Ein Knopf mit HTML-disabled ist nicht fokussierbar, also passiert nichts. */
const taste = (el: AttrappenElement, key: 'Enter' | ' '): void => {
  if (htmlDisabled(el)) return;
  const runter = ereignis(el, key); (el.on.keydown as Handler | undefined)?.(runter);
  const hoch = ereignis(el, key); (el.on.keyup as Handler | undefined)?.(hoch);
  if ((key === 'Enter' && !runter.defaultPrevented) || (key === ' ' && !runter.defaultPrevented && !hoch.defaultPrevented)) tippe(el);
};
/** Per Tab erreichbar: kein HTML-disabled und nicht aus der Tab-Reihenfolge genommen. */
const perTabErreichbar = (el: AttrappenElement): boolean => !htmlDisabled(el) && el.attrs.tabindex !== '-1';

/** Kontextkarte eines Objekts aufbauen; liefert Text, Knöpfe, gestempelte Leitungen und Toasts. */
type Karte = { a: Attrappe; c: AttrappenElement; text: string; knoepfe: Knopf[]; gestempelt: string[]; toasts: string[] };
/** `tun` läuft noch mit der Attrappe (Tippen darf auf document zugreifen, z. B. für „Weniger Bewegung“). */
async function karte(s: Spiel, o: Objekt, jetzt_ms = T0, tun?: (k: Karte) => void, bewegung: Bewegung = 'normal'): Promise<Karte> {
  return mitAttrappe(async (a, toasts) => {
    const { Kontext } = await import('../src/ui/kontext');
    const gestempelt: string[] = [];
    const ui = { spiel: s, jetzt_ms: () => jetzt_ms, geaendert: () => s.neuBerechnen(), stempeln: (t: string) => gestempelt.push(t), toast: (t: string) => toasts.push(t), katalog: () => {} };
    const k = new Kontext(ui as unknown as ConstructorParameters<typeof Kontext>[0], () => {});
    const c = new a.El('div');
    (k as unknown as { inhalt: (c: unknown, o: Objekt) => void }).inhalt(c, o);
    const kk: Karte = { a, c, text: a.text(c), knoepfe: knoepfeIn(a, c), gestempelt, toasts };
    tun?.(kk);
    return kk;
  }, bewegung);
}

// Zeichenleiste: echte Steuerung mit echtem Blatt und echter Meldung (tests/hilfen/echte-steuerung.ts) statt
// Object.create(Steuerung.prototype) – Tester-Vorarbeit NR16-B2b, damit der Ausbau der Steuerung keine Tests bricht.
/** Leerzeichenarten angleichen (ENTSCHEIDUNGEN 2026-11-05 Antwort 2: in Meldungen beide erlaubt). */
const leer = (t: string): string => t.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
/** Knopf der echten Oberfläche: name = Vorlesetext (aria-label, sonst Text), text = sichtbarer Text */
type LKnopf = { name: string; text: string; aus: boolean; el: El };
type Leiste = { toasts: string[]; knoepfe: () => LKnopf[]; st: { vorsehen: boolean }; s: Spiel };
const lKnoepfe = (u: EchteUmgebung): LKnopf[] => u.knoepfe().filter((k) => k.isConnected).map((el) => ({ name: leer(el.attrs['aria-label'] ?? el.textContent), text: el.textContent, aus: gesperrt(el), el }));
const lmit = (k: LKnopf[], anfang: string): LKnopf[] => k.filter((x) => x.name.startsWith(anfang));
/** Tippen wie im Browser: ein Knopf mit HTML-disabled bekommt keinen Klick. */
const lTippe = (el: El): void => { if (!htmlDisabled(el)) el.ausloesen('click'); };
/** Taste auf dem fokussierten Knopf wie im Browser (Enter nach keydown, Leertaste nach keyup, außer preventDefault). */
const lTaste = (el: El, key: 'Enter' | ' '): void => {
  if (htmlDisabled(el)) return;
  const runter = el.ausloesen('keydown', { key });
  const hoch = el.ausloesen('keyup', { key });
  if ((key === 'Enter' && !runter.defaultPrevented) || (key === ' ' && !runter.defaultPrevented && !hoch.defaultPrevented)) lTippe(el);
};
const ABSCHLIESSEN = 'Abschnitt abschließen';
/** Zeichenleiste öffnen (die Leiste öffnet sich nur im offenen Bauabschnitt, DESIGN 12.18); `abschnitt = false` heißt: der
 *  Abschnitt fällt bei offener Leiste weg (12.21 Punkt 1, B1). `tun` läuft, solange die Oberfläche lebt. */
const zeichenleiste = async (stufe: number, abschnitt: boolean, tun?: (z: Leiste) => void, bewegung: Bewegung = 'normal'): Promise<Leiste> => {
  const { s } = neu(stufe);
  offen(s);
  let z: Leiste | undefined;
  await echteSteuerung(s, (u) => {
    u.st.stempeln('d25');
    u.knoepfe().find((k) => k.isConnected && leer(k.textContent) === 'Verstanden' && sichtbar(k))?.click(); // Erste-Nutzung-Hilfe zu
    if (!abschnitt) delete s.stand.abschnitt;
    u.meldungen.splice(0);
    z = { toasts: u.meldungen, knoepfe: () => lKnoepfe(u), st: u.st as unknown as { vorsehen: boolean }, s };
    tun?.(z);
  }, { bewegung });
  return z!;
};

describe('A92 Kern – Meldungen und Zustand des Hausanschlusses', () => {
  it('A92: Fertige Planung meldet „Bauabschnitt bereit – jetzt Häuser anschließen“', () => {
    const { s, z } = neu(1);
    expect(s.abschnittPlanen().ok).toBe(true);
    // Planung 30 s × Bauzeitfaktor 2,5 = 75 s (katalog.ts); eine Sekunde vorher noch nicht fertig
    z.t = T0 + 74_000; s.bis(z.t);
    expect(s.abschnitt?.phase).toBe('planung');
    expect(hinweise(s)).toEqual([]);
    z.t = T0 + 75_000; s.bis(z.t);
    expect(s.abschnitt?.phase).toBe('offen');
    expect(hinweise(s)).toEqual(['Bauabschnitt bereit – jetzt Häuser anschließen']);
  });

  it('A92: hausanschlussGeplant – nur das Haus mit geplantem Anschluss, bis die Leitung gebaut ist', () => {
    const { s } = neu(1); offen(s);
    const haus = objektBei(s, 9, 15), anderes = objektBei(s, 8, 7);
    expect(s.hausanschlussGeplant(haus.id)).toBe(false);
    // NR18-P0 (4.12): Leitung selbst gezeichnet – (10|15) unter der Vorsehung (10|14), Leitungsende neben dem Haus (9|15)
    expect(s.platzieren('d25', 10, 15).ok).toBe(true);
    expect(s.hausanschlussGeplant(haus.id)).toBe(true);
    expect(s.hausanschlussGeplant(anderes.id)).toBe(false);
    for (const o of s.stand.objekte) delete o.geplant; // wie nach dem Bau
    expect(s.hausanschlussGeplant(haus.id)).toBe(false);
  });
});

describe('A92 Hausblatt – Weg zum Anschluss', () => {
  const PLANEN = 'Philipp: Bauabschnitt planen lassen';

  it('A92: ohne Bauabschnitt – „Leitung selbst legen“ gesperrt mit Grund, Knopf „Bauabschnitt planen lassen“ plant für 2.000 €', async () => {
    expect(ABSCHNITT_HELFER.planung).toBe('Philipp');
    const { s } = neu(1);
    const haus = objektBei(s, 9, 15);
    const k = await karte(s, haus);
    expect(mit(k.knoepfe, 'Leitung selbst legen')).toEqual([expect.objectContaining({ aus: true, text: `Leitung selbst legen${OHNE_ABSCHNITT}` })]);
    // NR18-P0 (4.16): Der Knopf „Hausanschluss ziehen“ entfällt (NR18). Rot bis NR18-P3.
    expect(mit(k.knoepfe, 'Hausanschluss ziehen')).toEqual([]);
    const planen = mit(k.knoepfe, PLANEN);
    expect(planen).toEqual([expect.objectContaining({ aus: false, text: `${PLANEN}2.000 €` })]);
    planen[0].klick!();
    expect(s.abschnitt?.phase).toBe('planung');
    expect(s.stand.geld_eur).toBe(1_000_000 - 2_000);
  });

  it('A92: Planen-Knopf gesperrt, wenn das Geld nicht reicht (Grenze 2.000 €)', async () => {
    const { s } = neu(1);
    const haus = objektBei(s, 9, 15);
    s.stand.geld_eur = 1_999;
    expect(mit((await karte(s, haus)).knoepfe, PLANEN)[0].aus).toBe(true);
    s.stand.geld_eur = 2_000;
    expect(mit((await karte(s, haus)).knoepfe, PLANEN)[0].aus).toBe(false);
  });

  it('A92: in Planung, beim Bestellen und im Bau – kein Planen-Knopf, „Leitung selbst legen“ gesperrt mit Grund der Phase (12.20 B2–B4)', async () => {
    // DESIGN.md 12.20 B2/B3/B4: Zeile 2 nennt, woran es gerade hängt; im Hausblatt (zwei Knöpfe nebeneinander) in der Kurzform aus 12.21.
    const ZEILE2 = { planung: 'wird noch geplant', bestellen: 'Bestellung offen', bau: 'Abschnitt im Bau' } as const;
    for (const phase of ['planung', 'bestellen', 'bau'] as const) {
      const { s } = neu(1);
      s.stand.abschnitt = { phase, bau: phase === 'bestellen' ? null : { art: 'neu', start_ms: T0, ende_ms: T0 + 60_000 } };
      const k = await karte(s, objektBei(s, 9, 15));
      expect(mit(k.knoepfe, PLANEN), phase).toEqual([]);
      expect(mit(k.knoepfe, 'Leitung selbst legen'), phase).toEqual([expect.objectContaining({ aus: true, text: `Leitung selbst legen${ZEILE2[phase]}` })]);
      // NR18-P0 (4.16): Der Knopf „Hausanschluss ziehen“ entfällt (NR18). Rot bis NR18-P3.
      expect(mit(k.knoepfe, 'Hausanschluss ziehen'), phase).toEqual([]);
    }
  });

  it('A92: offener Bauabschnitt – „Leitung selbst legen“ frei und öffnet das Zeichnen, kein Planen-Knopf', async () => {
    const { s } = neu(1); offen(s);
    const k = await karte(s, objektBei(s, 9, 15));
    expect(mit(k.knoepfe, PLANEN)).toEqual([]);
    const selbst = mit(k.knoepfe, 'Leitung selbst legen');
    expect(selbst).toEqual([expect.objectContaining({ aus: false, text: 'Leitung selbst legen' })]);
    selbst[0].klick!();
    expect(k.gestempelt).toEqual(['d25']);
  });

  // NR18-P0 (4.12): Die Leitung zeichnet der Spieler selbst (keine automatische Wegsuche mehr).
  it('A92: nach selbst gezeichneter Leitung zeigt das Haus „Hausanschluss geplant“ statt eines aktiven Knopfs', async () => {
    const { s } = neu(1); offen(s);
    const haus = objektBei(s, 9, 15);
    const vorher = await karte(s, haus);
    expect(mit(vorher.knoepfe, 'Leitung selbst legen')).toEqual([expect.objectContaining({ aus: false })]);
    expect(mit(vorher.knoepfe, 'Hausanschluss geplant')).toEqual([]);
    expect(s.platzieren('d25', 10, 15).ok).toBe(true);
    expect(s.abschnittLeitungen()).toBe(1);
    const nachher = await karte(s, haus);
    expect(mit(nachher.knoepfe, 'Hausanschluss ziehen')).toEqual([]);
    expect(mit(nachher.knoepfe, 'Hausanschluss geplant')).toEqual([expect.objectContaining({ aus: true })]);
  });

  it('A92: Haus ohne Anschluss bekommt nur den Öl-Satz, nicht „Angeschlossen, aber es kommt zu wenig Wärme an“', async () => {
    const { s } = neu(1);
    const haus = objektBei(s, 9, 15);
    expect(s.netz.anschluss.has(haus.id)).toBe(false);
    const k = await karte(s, haus);
    expect(k.text).toContain('Heizt noch mit Öl.');
    expect(k.text).not.toContain('Angeschlossen, aber');
  });

  it('A92: angeschlossenes, kaltes Haus (keine Wärmequelle) behält „Angeschlossen, aber es kommt zu wenig Wärme an“', async () => {
    const { s } = neu(1);
    const haus = objektBei(s, 9, 13); // Starthaus an der Hauptleitung, mit Station
    s.stand.innen = [];
    s.neuBerechnen();
    expect(s.netz.anschluss.has(haus.id)).toBe(true);
    expect(s.netz.warm.has(haus.id)).toBe(false);
    expect(s.netz.kalt.get(haus.id)).not.toBe('leitung');
    const k = await karte(s, haus);
    expect(k.text).toContain('Angeschlossen, aber es kommt zu wenig Wärme an.');
    expect(k.text).not.toContain('Heizt noch mit Öl.');
  });
});

describe('A92 T-Stück mit Vorsehung – der gesperrte Knopf erklärt sich beim Antippen', () => {
  it('A92: Leitungskarte (geplante Leitung, Stufe 1) – Tippen auf den gesperrten Knopf zeigt den Hinweis', async () => {
    const { s } = neu(1); offen(s);
    const l = lege(s, 'd25', 3, 3, { geplant: true });
    let ziel: AttrappenElement | undefined;
    const k = await karte(s, l, T0, (k) => {
      const t = mit(k.knoepfe, 'T-Stück mit Vorsehung setzen');
      ziel = t.length ? tippziel(k.a, k.c, t[0].el) : undefined;
      if (ziel) tippe(ziel);
    });
    const t = mit(k.knoepfe, 'T-Stück mit Vorsehung setzen');
    expect(t).toEqual([expect.objectContaining({ aus: true, text: 'T-Stück mit Vorsehung setzenab Heizzentrale Stufe 4' })]);
    // DESIGN.md 12.19: aria-disabled="true" statt disabled; die breite Karte behält den langen Grund
    expect(gesperrtMitHinweis(t[0].el), 'aria-disabled="true" ohne disabled').toBe(true);
    expect(ziel, 'der Knopf selbst empfängt das Tippen').toBe(t[0].el);
    expect(k.toasts).toEqual([TSTUECK_HINWEIS]);
    expect(l.vorsehung).toBeUndefined();
  });

  it('A92: Leitungskarte auf Stufe 4 – Knopf frei, kein Hinweis, Tippen setzt die Vorsehung', async () => {
    const { s } = neu(4); offen(s);
    const l = lege(s, 'd25', 3, 3, { geplant: true });
    const k = await karte(s, l, T0, (k) => tippe(mit(k.knoepfe, 'T-Stück mit Vorsehung setzen')[0].el));
    const t = mit(k.knoepfe, 'T-Stück mit Vorsehung setzen');
    expect(t[0].aus).toBe(false);
    expect(k.toasts).toEqual([]);
    expect(l.vorsehung).toBe(true);
  });


  it('A92: Zeichenleiste Stufe 1 – gesperrter T-Stück-Knopf mit kurzem Grund zeigt beim Antippen den Hinweis', async () => {
    // DESIGN.md 12.15 / Kann 2b: enge Leiste → kurzer Grund „ab Stufe 4“ (geschütztes Leerzeichen U+00A0, wie a88)
    await zeichenleiste(1, true, (z) => {
      const t = lmit(z.knoepfe(), 'T-Stück mit Vorsehung');
      expect(t.map((k) => ({ aus: k.aus, text: k.text }))).toEqual([{ aus: true, text: 'T-Stück mit Vorsehungab Stufe\u00a04' }]);
      expect(gesperrtMitHinweis(t[0].el), 'aria-disabled="true" ohne disabled (12.19)').toBe(true);
      const ziel = !htmlDisabled(t[0].el) && (t[0].el.ereignisse.click?.length ?? 0) > 0 ? t[0].el : undefined;
      expect(ziel, 'der Knopf selbst empfängt das Tippen').toBe(t[0].el);
      lTippe(t[0].el);
      expect(z.toasts.map(leer)).toEqual([TSTUECK_HINWEIS]);
      expect(z.st.vorsehen).toBe(false);
      // DESIGN.md 12.19: Schloss vor dem Grund, Wackeln beim Antippen (Klasse am Knopf), nach der Animation wieder ruhig
      const jetzt = lmit(z.knoepfe(), 'T-Stück mit Vorsehung')[0].el; // der Knopf, der nach dem Tippen zu sehen ist
      expect(jetzt.querySelectorAll('svg').some((e) => e.attrs.quelle === SYMBOLE.schloss)).toBe(true);
      expect(jetzt.className.split(' ')).toContain('wackelt');
      jetzt.ausloesen('animationend');
      expect(jetzt.className.split(' ')).not.toContain('wackelt');
    });
  });

  it('A92: stil.css – Wackeln ±3 px / 240 ms aus den Tokens, nicht bei „Weniger Bewegung“', () => {
    const css = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.knopf\[aria-disabled="true"\]\.wackelt\{[^}]*animation:wackeln var\(--menue-zeit-ms-wackeln\)/);
    expect(css).toMatch(/@keyframes wackeln\{[^@]*var\(--menue-mass-px-wackeln-weg\)/);
    expect(css).toMatch(/\.weniger-bewegung \.knopf\[aria-disabled="true"\]\.wackelt\{animation:none\}/);
    expect(css).toMatch(/\.schloss-klein\{[^}]*width:var\(--menue-mass-px-schloss-klein\)/);
  });

  it('A92: Zeichenleiste Stufe 4 – T-Stück-Knopf frei, keine Hülle mit Hinweis', async () => {
    const z = await zeichenleiste(4, true);
    const t = lmit(z.knoepfe(), 'T-Stück mit Vorsehung');
    expect(t[0].aus).toBe(false);
    expect(t[0].el.attrs['aria-disabled'], 'frei: kein aria-disabled="true"').not.toBe('true');
    expect((t[0].el.parentNode?.ereignisse.click?.length ?? 0) > 0, 'keine Hülle mit eigenem Klick').toBe(false);
  });

  it('A92: Zeichenleiste ohne offenen Bauabschnitt – „Abschnitt abschließen“ gesperrt, Zeile 2 „kein Bauabschnitt“; offen ohne Zeichnung „nichts gezeichnet“', async () => {
    // Stand NR16-B2b, DESIGN 12.21 Punkt 1: Kurzformen in Zeile 2 (≤ 18 Zeichen); B1–B4 vor B6; beim Tippen werden die Gründe
    // neu gelesen und Zeile 2 zeigt denselben Grund (Punkt 3). Ersetzt „braucht offenen Bauabschnitt“ (zu lang für 197 px).
    const zeile2 = (k: LKnopf): string => leer(leer(k.text).slice(ABSCHLIESSEN.length));
    await zeichenleiste(1, false, (z) => {
      lTippe(lmit(z.knoepfe(), ABSCHLIESSEN)[0].el);
      const k = lmit(z.knoepfe(), ABSCHLIESSEN);
      expect(k.map((x) => ({ aus: x.aus, zeile2: zeile2(x) }))).toEqual([{ aus: true, zeile2: 'kein Bauabschnitt' }]);
    });
    const offenOhne = lmit((await zeichenleiste(1, true)).knoepfe(), ABSCHLIESSEN);
    expect(offenOhne.map((x) => ({ aus: x.aus, zeile2: zeile2(x) }))).toEqual([{ aus: true, zeile2: 'nichts gezeichnet' }]);
  });
});

// Abnahme DESIGN.md 12.19 (NR16-B): Ein gesperrter Knopf bekommt Tippen und Tasten (aria-disabled statt disabled). Deshalb muss
// die Oberfläche selbst dafür sorgen, dass die Aktion nie ausgeführt wird, und stattdessen den Hinweis zeigen.
// Tippen/Enter/Leertaste werden wie im Browser nachgestellt (tippe/taste oben): Mit HTML-disabled käme nichts an.
describe('A92 / DESIGN 12.19 – gesperrte Knöpfe: nie die Aktion, immer der Hinweis', () => {
  /** Alle gesperrten Knöpfe antippen und per Enter und Leertaste auslösen. */
  const alleAusloesen = (knoepfe: Knopf[]) => { for (const k of knoepfe.filter((x) => x.aus)) { tippe(k.el); taste(k.el, 'Enter'); taste(k.el, ' '); } };
  const faelle: Array<[string, () => { s: Spiel; o: Objekt }]> = [
    ['Hauskarte ohne Bauabschnitt (Leitung selbst legen, Hausanschluss ziehen)', () => { const { s } = neu(1); return { s, o: objektBei(s, 9, 15) }; }],
    ['Hauskarte, Geld reicht nicht für die Planung (1.999 €)', () => { const { s } = neu(1); s.stand.geld_eur = 1_999; return { s, o: objektBei(s, 9, 15) }; }],
    // NR18-P0 (4.25): Hausanschluss selbst gezeichnet statt automatisch
    ['Hauskarte mit geplantem Hausanschluss', () => { const { s } = neu(1); offen(s); s.platzieren('d25', 10, 15); s.ereignisse.splice(0); return { s, o: objektBei(s, 9, 15) }; }],
    ['Hauskarte Starthaus Stufe 1 (Puffer, Helfer)', () => { const { s } = neu(1); return { s, o: objektBei(s, 9, 13) }; }],
    ['Leitungskarte geplante 25er Stufe 1 (T-Stück setzen)', () => { const { s } = neu(1); offen(s); return { s, o: lege(s, 'd25', 3, 3, { geplant: true }) }; }],
    ['Leitungskarte 40er Stufe 1 (Dickere)', () => { const { s } = neu(1); return { s, o: s.stand.objekte.find((x) => x.typ === 'd40' && x.x === 10 && x.y === 12)! }; }],
    ['Heizzentrale Stufe 1', () => { const { s } = neu(1); return { s, o: s.stand.objekte.find((x) => x.typ === 'hz')! }; }],
  ];
  for (const [name, aufbau] of faelle) {
    it(`A92: ${name} – gesperrte Knöpfe ändern per Tippen, Enter und Leertaste nichts am Spielstand`, async () => {
      const { s, o } = aufbau();
      const vorher = serialisieren(s.stand);
      let gesperrte = 0;
      const k = await karte(s, o, T0, (k) => { gesperrte = k.knoepfe.filter((x) => x.aus).length; alleAusloesen(k.knoepfe); });
      expect(gesperrte, 'Vorbedingung: mindestens ein gesperrter Knopf').toBeGreaterThan(0);
      expect(serialisieren(s.stand)).toBe(vorher);
      expect(k.gestempelt, 'kein Zeichnen gestartet').toEqual([]);
    });
  }

  it('A92: Zeichenleiste Stufe 1 ohne Bauabschnitt – gesperrte Knöpfe (Dickere, T-Stück, Abschnitt abschließen) ändern nichts', async () => {
    // Abschnitt fällt bei offener Leiste weg (12.21 Punkt 1, B1). „Abschnitt abschließen“ zeigt die Sperre spätestens nach dem
    // ersten Tippen (Punkt 3: Gründe beim Tippen neu lesen); daher werden die drei Knöpfe über den Namen ausgelöst.
    let vorher = '', gesperrteVorher: string[] = [], gesperrteNachher: string[] = [], leisteOffen = false;
    const z = await zeichenleiste(1, false, (z) => {
      vorher = serialisieren(z.s.stand);
      gesperrteVorher = z.knoepfe().filter((x) => x.aus).map((x) => x.name);
      for (const name of ['Dickere', 'T-Stück mit Vorsehung', ABSCHLIESSEN]) {
        for (const art of ['tippen', 'Enter', ' '] as const) {
          const k = lmit(z.knoepfe(), name)[0];
          expect(k, `„${name}“ noch da vor ${art === ' ' ? 'Leertaste' : art} (Leiste nicht geschlossen)`).toBeDefined();
          if (art === 'tippen') lTippe(k.el); else lTaste(k.el, art);
        }
      }
      gesperrteNachher = z.knoepfe().filter((x) => x.aus).map((x) => x.name);
      leisteOffen = lmit(z.knoepfe(), ABSCHLIESSEN).length === 1;
    });
    expect(gesperrteVorher.some((t) => t.startsWith('Dickere')), 'Dickere gesperrt').toBe(true);
    expect(gesperrteVorher.some((t) => t.startsWith('T-Stück mit Vorsehung')), 'T-Stück gesperrt').toBe(true);
    expect(gesperrteNachher.some((t) => t.startsWith(ABSCHLIESSEN)), 'Abschnitt abschließen gesperrt').toBe(true);
    expect(serialisieren(z.s.stand)).toBe(vorher);
    expect(z.st.vorsehen, 'T-Stück-Werkzeug bleibt aus').toBe(false);
    expect(leisteOffen, 'Zeichnen nicht abgebrochen (Leiste noch offen)').toBe(true);
  });

  it('A92: Zeichenleiste Stufe 1 – T-Stück per Tab erreichbar, Enter und Leertaste zeigen denselben Hinweis wie Tippen', async () => {
    let erreichbar = false, nachEnter: string[] = [];
    const z = await zeichenleiste(1, true, (z) => {
      const t = lmit(z.knoepfe(), 'T-Stück mit Vorsehung')[0].el;
      erreichbar = !htmlDisabled(t) && t.attrs.tabindex !== '-1';
      lTaste(t, 'Enter'); nachEnter = z.toasts.map(leer);
      lTaste(lmit(z.knoepfe(), 'T-Stück mit Vorsehung')[0].el, ' ');
    });
    expect(erreichbar, 'kein disabled, kein tabindex=-1').toBe(true);
    expect(nachEnter).toEqual([TSTUECK_HINWEIS]);
    expect(z.toasts.map(leer)).toEqual([TSTUECK_HINWEIS, TSTUECK_HINWEIS]);
    expect(z.st.vorsehen).toBe(false);
  });

  it('A92: Hauskarte ohne Bauabschnitt – Tippen auf „Leitung selbst legen“ zeigt den Philipp-Hinweis und zeichnet nicht', async () => {
    const { s } = neu(1);
    const k = await karte(s, objektBei(s, 9, 15), T0, (k) => tippe(mit(k.knoepfe, 'Leitung selbst legen')[0].el));
    expect(gesperrtMitHinweis(mit(k.knoepfe, 'Leitung selbst legen')[0].el), 'aria-disabled="true" ohne disabled').toBe(true);
    expect(k.toasts).toEqual([SELBST_HINWEIS]);
    expect(k.gestempelt).toEqual([]);
  });

  it('A92: Zeichenleiste Stufe 1 – Tippen auf „Dickere“ zeigt den Ausbau-Hinweis', async () => {
    // Knopf über den Vorlesetext „Dickere …“ (ab NR16-B2b sichtbar nur „St. 2“, DESIGN 12.18)
    const z = await zeichenleiste(1, true, (z) => lTippe(lmit(z.knoepfe(), 'Dickere')[0].el));
    expect(gesperrtMitHinweis(lmit(z.knoepfe(), 'Dickere')[0].el), 'aria-disabled="true" ohne disabled').toBe(true);
    expect(z.toasts.map(leer)).toEqual([DICKERE_HINWEIS]);
  });

  for (const bewegung of ['einstellung', 'system'] as const) {
    it(`A92: „Weniger Bewegung“ (${bewegung}) – nach dem Tippen bleibt keine Klasse „wackelt“ hängen, der Hinweis kommt trotzdem`, async () => {
      // Ohne Animation kommt nie ein animationend (stil.css: animation:none) – die Klasse darf also gar nicht erst bleiben.
      let klasse = '';
      const z = await zeichenleiste(1, true, (z) => {
        vi.useFakeTimers();
        try {
          lTippe(lmit(z.knoepfe(), 'T-Stück mit Vorsehung')[0].el);
          vi.advanceTimersByTime(1_000);
          klasse = lmit(z.knoepfe(), 'T-Stück mit Vorsehung')[0].el.className;
        } finally { vi.useRealTimers(); }
      }, bewegung);
      expect(klasse.split(' ')).not.toContain('wackelt');
      expect(z.toasts.map(leer)).toEqual([TSTUECK_HINWEIS]);
    });
  }
});

describe('A92 Baumenü – Planungsstand zählt live', () => {
  it('A92: Restzeit zählt herunter, ohne den Kasten neu zu bauen; nach der Planung steht der Abschnitt von selbst auf „offen“', async () => {
    await mitAttrappe(async (a, _toasts, blatt) => {
      const { Katalog } = await import('../src/ui/katalog');
      const { s, z } = neu(1);
      s.abschnittPlanen();
      const ui = { spiel: s, toast: () => {}, jetzt_ms: () => z.t, geaendert: () => {} } as unknown as ConstructorParameters<typeof Katalog>[0];
      const k = new Katalog(ui);
      k.oeffnen('netz');
      const kasten = () => a.alle(blatt.inhalt).find((e) => e.className === 'kasten')!;
      const erster = kasten();
      // 30 s × 2,5 = 75 s Planung
      expect(a.text(erster)).toContain('Philipp plant den Abschnitt … noch 1m 15s');
      z.t = T0 + 10_000; s.bis(z.t); k.aktualisieren();
      expect(kasten()).toBe(erster); // kein Neuaufbau, nur die Zeit
      expect(a.text(erster)).toContain('noch 1m 5s');
      z.t = T0 + 20_000; s.bis(z.t); k.aktualisieren();
      expect(a.text(kasten())).toContain('noch 55s');
      z.t = T0 + 75_000; s.bis(z.t); k.aktualisieren();
      expect(kasten()).not.toBe(erster);
      expect(a.text(kasten())).toContain('Wähle unten eine Leitung');
      expect(knoepfeIn(a, kasten()).map((x) => x.text)).toContain('Verwerfen');
    });
  });

  it('A92: aktualisieren bei geschlossenem Baumenü tut nichts', async () => {
    await mitAttrappe(async (a, _toasts, blatt) => {
      const { Katalog } = await import('../src/ui/katalog');
      const { s } = neu(1);
      const k = new Katalog({ spiel: s, toast: () => {}, jetzt_ms: () => T0 } as unknown as ConstructorParameters<typeof Katalog>[0]);
      k.aktualisieren();
      expect(blatt.inhalt.kinder).toEqual([]);
      void a;
    });
  });

  it('A92: Steuerung frischt das Baumenü höchstens einmal je Sekunde auf', async () => {
    // echte Steuerung (tests/hilfen/echte-steuerung.ts); gezählt wird, wie oft sie Baumenü und Kontextkarte auffrischt
    const { s } = neu(1);
    await echteSteuerung(s, (u) => {
      const st = u.st as unknown as { tick: (t: number) => void; katalogUi: { aktualisieren: () => void }; kontextUi: { aktualisieren: () => void } };
      const katalog = vi.spyOn(st.katalogUi, 'aktualisieren');
      const kontext = vi.spyOn(st.kontextUi, 'aktualisieren');
      for (let t = T0; t < T0 + 1000; t += 16) st.tick(t); // eine Sekunde mit 60 Bildern
      expect(katalog).toHaveBeenCalledTimes(1);
      expect(kontext.mock.calls.length).toBeGreaterThan(1); // die Kontextkarte bleibt bei 250 ms
      st.tick(T0 + 1000);
      expect(katalog).toHaveBeenCalledTimes(2);
    });
  });
});
