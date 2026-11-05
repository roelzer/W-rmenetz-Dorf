import { describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand, type Ereignis } from '../src/core/spiel';
import { ABSCHNITT_HELFER, KATALOG, KONSTANTEN, type TypId } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';
import { readFileSync } from 'node:fs';
import { SYMBOLE } from '../src/ui/symbole';
import { attrappe, type Attrappe, type AttrappenElement } from './hilfen/kontext-attrappe';

// A92 (NR16) – Der Weg zum Hausanschluss erklärt sich: T-Stück-Hinweis beim Antippen, Sperren mit Grund ohne offenen
// Bauabschnitt, Planungsstand zählt live, „Angeschlossen …“ nur bei angeschlossenen Häusern, „Hausanschluss geplant“
// und richtig gebeugtes „1 Feld“. Echtes Kernmodul; ohne Browser über die DOM-Attrappe der Testhilfen.

const T0 = 1_000_000_000_000;
const TSTUECK_HINWEIS = 'Für Hausanschlüsse nicht nötig – den Abzweig setzt das Spiel selbst. Ein T-Stück mit Vorsehung legt einen Abzweig für später bereit und spart dann das Anbohren. Frei ab Heizzentrale Stufe 4.';
const OHNE_ABSCHNITT = 'braucht offenen Bauabschnitt';

const neu = (stufe = 1) => {
  const z = { t: T0 };
  const s = new Spiel(neuerSpielstand(T0), () => z.t);
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
  return a;
}

type Knopf = { text: string; aus: boolean; klick?: () => void; el: AttrappenElement };
/** Oberflächen-Module frisch mit der Attrappe laden; Toasts werden gesammelt. */
async function mitAttrappe<E>(arbeit: (a: Attrappe, toasts: string[], blatt: { inhalt: AttrappenElement; zu: () => void }) => Promise<E>): Promise<E> {
  const a = attrappeMitText();
  const toasts: string[] = [];
  vi.resetModules();
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
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
const knoepfeIn = (a: Attrappe, c: AttrappenElement): Knopf[] => a.alle(c).filter((e) => e.tag === 'button').map((e) => ({ text: a.text(e), aus: e.attrs.disabled !== undefined, klick: e.on.click, el: e }));
const mit = (k: Knopf[], anfang: string) => k.filter((x) => x.text.startsWith(anfang));
/** Das Element, das ein Tippen auf den Knopf empfängt: Ein deaktivierter Knopf meldet im Browser kein Tippen, also nur eine
 *  Hülle mit eigenem Klick; ein freier Knopf empfängt es selbst. */
const tippziel = (a: Attrappe, c: AttrappenElement, knopf: AttrappenElement): AttrappenElement | undefined =>
  knopf.attrs.disabled !== undefined ? a.alle(c).find((e) => e.kinder.includes(knopf) && e.on.click !== undefined) : knopf.on.click ? knopf : undefined;

/** Kontextkarte eines Objekts aufbauen; liefert Text, Knöpfe, gestempelte Leitungen und Toasts. */
async function karte(s: Spiel, o: Objekt, jetzt_ms = T0) {
  return mitAttrappe(async (a, toasts) => {
    const { Kontext } = await import('../src/ui/kontext');
    const gestempelt: string[] = [];
    const ui = { spiel: s, jetzt_ms: () => jetzt_ms, geaendert: () => s.neuBerechnen(), stempeln: (t: string) => gestempelt.push(t), toast: (t: string) => toasts.push(t), katalog: () => {} };
    const k = new Kontext(ui as unknown as ConstructorParameters<typeof Kontext>[0], () => {});
    const c = new a.El('div');
    (k as unknown as { inhalt: (c: unknown, o: Objekt) => void }).inhalt(c, o);
    return { a, c, text: a.text(c), knoepfe: knoepfeIn(a, c), gestempelt, toasts };
  });
}

describe('A92 Kern – Meldungen und Zustand des Hausanschlusses', () => {
  it('A92: Hausanschluss-Meldung beugt „Feld“ richtig – 1 Feld, 4 Felder', () => {
    // Startdorf: Das Haus (9|15) liegt ein Feld neben der Hauptleitung, das Haus (8|7) vier Felder (Wegsuche wie A89).
    const { s } = neu(1); offen(s);
    expect(s.hausanschlussPlanen(objektBei(s, 9, 15).id).ok).toBe(true);
    expect(hinweise(s)).toEqual(['Hausanschluss geplant: 1 Feld, 25er-Leitung']);
    s.ereignisse.splice(0);
    expect(s.hausanschlussPlanen(objektBei(s, 8, 7).id).ok).toBe(true);
    expect(hinweise(s)).toEqual(['Hausanschluss geplant: 4 Felder, 25er-Leitung']);
  });

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
    s.hausanschlussPlanen(haus.id);
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
    expect(mit(k.knoepfe, 'Hausanschluss ziehen')).toEqual([expect.objectContaining({ aus: true, text: `Hausanschluss ziehen${OHNE_ABSCHNITT}` })]);
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

  it('A92: in Planung, beim Bestellen und im Bau – kein Planen-Knopf, „Leitung selbst legen“ gesperrt', async () => {
    for (const phase of ['planung', 'bestellen', 'bau'] as const) {
      const { s } = neu(1);
      s.stand.abschnitt = { phase, bau: phase === 'bestellen' ? null : { art: 'neu', start_ms: T0, ende_ms: T0 + 60_000 } };
      const k = await karte(s, objektBei(s, 9, 15));
      expect(mit(k.knoepfe, PLANEN), phase).toEqual([]);
      expect(mit(k.knoepfe, 'Leitung selbst legen'), phase).toEqual([expect.objectContaining({ aus: true, text: `Leitung selbst legen${OHNE_ABSCHNITT}` })]);
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

  it('A92: nach „Hausanschluss ziehen“ zeigt das Haus „Hausanschluss geplant“ statt eines aktiven Knopfs', async () => {
    const { s } = neu(1); offen(s);
    const haus = objektBei(s, 9, 15);
    const vorher = await karte(s, haus);
    const ziehen = mit(vorher.knoepfe, 'Hausanschluss ziehen');
    expect(ziehen).toEqual([expect.objectContaining({ aus: false })]);
    ziehen[0].klick!();
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
    const k = await karte(s, l);
    const t = mit(k.knoepfe, 'T-Stück mit Vorsehung setzen');
    expect(t).toEqual([expect.objectContaining({ aus: true, text: 'T-Stück mit Vorsehung setzenab Heizzentrale Stufe 4' })]);
    const ziel = tippziel(k.a, k.c, t[0].el);
    expect(ziel).toBeDefined();
    ziel!.on.click();
    expect(k.toasts).toEqual([TSTUECK_HINWEIS]);
    expect(l.vorsehung).toBeUndefined();
  });

  it('A92: Leitungskarte auf Stufe 4 – Knopf frei, kein Hinweis, Tippen setzt die Vorsehung', async () => {
    const { s } = neu(4); offen(s);
    const l = lege(s, 'd25', 3, 3, { geplant: true });
    const k = await karte(s, l);
    const t = mit(k.knoepfe, 'T-Stück mit Vorsehung setzen');
    expect(t[0].aus).toBe(false);
    tippziel(k.a, k.c, t[0].el)!.on.click();
    expect(k.toasts).toEqual([]);
    expect(l.vorsehung).toBe(true);
  });

  const zeichenleiste = (stufe: number, abschnitt: boolean) => mitAttrappe(async (a, toasts, blatt) => {
    const { Steuerung } = await import('../src/steuerung');
    const { s } = neu(stufe);
    if (abschnitt) offen(s);
    const st = Object.assign(Object.create(Steuerung.prototype), { spiel: s, katalogUi: { schliessen: () => {} }, kontextUi: { schliessen: () => {} }, modusBlatt: null, vorsehen: false });
    (st as { stempeln: (t: TypId) => void }).stempeln('d25');
    return { a, toasts, c: blatt.inhalt, knoepfe: knoepfeIn(a, blatt.inhalt), st: st as { vorsehen: boolean } };
  });

  it('A92: Zeichenleiste Stufe 1 – gesperrter T-Stück-Knopf behält den Grund und zeigt beim Antippen den Hinweis', async () => {
    const z = await zeichenleiste(1, true);
    const t = mit(z.knoepfe, 'T-Stück mit Vorsehung');
    expect(t).toEqual([expect.objectContaining({ aus: true, text: 'T-Stück mit Vorsehungab Heizzentrale Stufe 4' })]);
    const ziel = tippziel(z.a, z.c, t[0].el);
    expect(ziel).toBeDefined();
    ziel!.on.click();
    expect(z.toasts).toEqual([TSTUECK_HINWEIS]);
    expect(z.st.vorsehen).toBe(false);
    // DESIGN.md 12.19: Schloss vor dem Grund, Wackeln beim Antippen, nach der Animation wieder ruhig
    expect(z.a.alle(t[0].el).some((e) => e.tag === 'svg' && e.attrs.quelle === SYMBOLE.schloss)).toBe(true);
    expect(ziel!.className.split(' ')).toContain('wackelt');
    ziel!.on.animationend();
    expect(ziel!.className.split(' ')).not.toContain('wackelt');
  });

  it('A92: stil.css – Wackeln ±3 px / 240 ms aus den Tokens, nicht bei „Weniger Bewegung“', () => {
    const css = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.sperr-tipp\.wackelt\{[^}]*animation:wackeln var\(--menue-zeit-ms-wackeln\)/);
    expect(css).toMatch(/@keyframes wackeln\{[^@]*var\(--menue-mass-px-wackeln-weg\)/);
    expect(css).toMatch(/\.weniger-bewegung \.sperr-tipp\.wackelt\{animation:none\}/);
    expect(css).toMatch(/\.schloss-klein\{[^}]*width:var\(--menue-mass-px-schloss-klein\)/);
  });

  it('A92: Zeichenleiste Stufe 4 – T-Stück-Knopf frei, keine Hülle mit Hinweis', async () => {
    const z = await zeichenleiste(4, true);
    const t = mit(z.knoepfe, 'T-Stück mit Vorsehung');
    expect(t[0].aus).toBe(false);
    expect(z.a.alle(z.c).some((e) => e.kinder.includes(t[0].el) && e.on.click !== undefined)).toBe(false);
  });

  it('A92: Zeichenleiste ohne offenen Bauabschnitt – „Abschnitt abschließen“ gesperrt mit Grund, mit offenem frei', async () => {
    expect(mit((await zeichenleiste(1, false)).knoepfe, 'Abschnitt abschließen')).toEqual([expect.objectContaining({ aus: true, text: `Abschnitt abschließen${OHNE_ABSCHNITT}` })]);
    expect(mit((await zeichenleiste(1, true)).knoepfe, 'Abschnitt abschließen')).toEqual([expect.objectContaining({ aus: false, text: 'Abschnitt abschließen' })]);
  });
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
    await mitAttrappe(async () => {
      const { Steuerung } = await import('../src/steuerung');
      const { s } = neu(1);
      let katalog = 0, kontext = 0;
      const st = Object.assign(Object.create(Steuerung.prototype), {
        spiel: s, katalogUi: { aktualisieren: () => { katalog++; } }, kontextUi: { aktualisieren: () => { kontext++; } },
        hud: { aktualisieren: () => {} }, einstellungen: { weniger_bewegung: true }, auftrag: null,
        letzteHudMs: 0, letzterAuftragMs: 0, letzterKatalogMs: 0,
      }) as { tick: (t: number) => void };
      for (let t = T0; t < T0 + 1000; t += 16) st.tick(t); // eine Sekunde mit 60 Bildern
      expect(katalog).toBe(1);
      expect(kontext).toBeGreaterThan(1); // die Kontextkarte bleibt bei 250 ms
      st.tick(T0 + 1000);
      expect(katalog).toBe(2);
    });
  });
});
