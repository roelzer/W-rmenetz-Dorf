import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import type { TypId } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';
import { attrappe, type Attrappe, type AttrappenElement } from './hilfen/kontext-attrappe';
import { gesperrtMitHinweis } from './hilfen/gesperrt';
import { echteSteuerung, tippe as echtTippe, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';
import { UI_LEERLAUF } from './hilfen/ui-leerlauf';

/** Leerzeichenarten angleichen (ENTSCHEIDUNGEN 2026-11-05 Antwort 2: in Meldungen beide erlaubt). */
const leer = (t: string): string => t.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
/** Vorlesetext eines Knopfs: aria-label, sonst der sichtbare Text (wie ein Bildschirmleser). */
const vorlesetext = (k: El): string => leer(k.attrs['aria-label'] ?? k.textContent);
/** genau ein sichtbar eingehängter Knopf, dessen Vorlesetext mit `anfang` beginnt */
function perVorlesetext(u: EchteUmgebung, anfang: string): El {
  const k = u.knoepfe().filter((e) => e.isConnected && vorlesetext(e).startsWith(anfang));
  expect(k.map(vorlesetext), `genau ein Knopf „${anfang}…“`).toHaveLength(1);
  return k[0];
}

// A92 / DESIGN.md 12.19 (NR16-B1): Gesperrte Knöpfe tragen aria-disabled="true" statt disabled, führen beim Antippen nie die
// Aktion aus, wackeln und zeigen – wo es einen Hinweistext gibt – eine Meldung. Dazu K2 (Baumenü auf einem anderen Reiter
// baut beim Phasenwechsel nicht neu).
// Echtes Kernmodul; ohne Browser über die DOM-Attrappe der Testhilfen.

const T0 = 1_000_000_000_000;
const OHNE_ABSCHNITT = 'braucht offenen Bauabschnitt';
// DESIGN.md 12.18/12.19, wörtlich
const SELBST_HINWEIS = 'Erst mit Philipp einen Bauabschnitt planen: Bauen → Leitungen.';
// umgebaut NR18-D 06.11.: im Hausblatt zeigt der Hinweis auf den Philipp-Knopf direkt darüber (DESIGN 12.22)
const HAUS_HINWEIS = 'Erst mit Philipp einen Bauabschnitt planen – Knopf direkt darüber.';

const neu = (stufe = 1) => {
  const s = new Spiel(neuerSpielstand(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
type Ev = { preventDefault: () => void; stopPropagation: () => void };
const ev: Ev = { preventDefault: () => {}, stopPropagation: () => {} };
type Handler = (e?: unknown) => void;
/** Tippen wie im Browser: ein Knopf mit HTML-disabled bekommt keinen Klick. */
const tippe = (el: AttrappenElement): void => { if (!('disabled' in el.attrs)) (el.on.click as Handler | undefined)?.(ev); };

/** Attrappe mit classList und document.body (für Wackeln und „Weniger Bewegung“). */
function attrappeMitKlassen(): Attrappe {
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
  (a.doc as unknown as { body: AttrappenElement }).body = new a.El('body');
  return a;
}

/** Oberflächen-Module frisch mit der Attrappe laden; Meldungen werden gesammelt. */
async function mitAttrappe<E>(arbeit: (a: Attrappe, toasts: string[], blatt: { inhalt: AttrappenElement }) => Promise<E>): Promise<E> {
  const a = attrappeMitKlassen();
  const toasts: string[] = [];
  vi.resetModules();
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  const matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('window', { matchMedia, setTimeout, clearTimeout, devicePixelRatio: 1 });
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

describe('A92 Bausteine – gesperrter Knopf nach DESIGN.md 12.19', () => {
  it('A92: knopf gesperrt – aria-disabled="true" ohne disabled; Tippen führt die Aktion nicht aus, zeigt den Hinweis und wackelt', async () => {
    await mitAttrappe(async (_a, toasts) => {
      const { knopf } = await import('../src/ui/bausteine');
      let aktion = 0;
      const k = knopf('Ausbauen', () => { aktion++; }, 'los', { aus: true, unter: 'Grund', hinweis: 'So geht es weiter.' }) as unknown as AttrappenElement;
      expect(gesperrtMitHinweis(k)).toBe(true);
      tippe(k);
      expect(aktion).toBe(0);
      expect(toasts).toEqual(['So geht es weiter.']);
      expect(k.className.split(' ')).toContain('wackelt');
      (k.on.animationend as Handler)(ev);
      expect(k.className.split(' ')).not.toContain('wackelt');
    });
  });

  it('A92: knopf frei – kein aria-disabled, Tippen führt die Aktion aus, keine Meldung, kein Wackeln', async () => {
    await mitAttrappe(async (_a, toasts) => {
      const { knopf } = await import('../src/ui/bausteine');
      let aktion = 0;
      const k = knopf('Bauen', () => { aktion++; }, 'los', { hinweis: 'nie zu sehen' }) as unknown as AttrappenElement;
      expect('aria-disabled' in k.attrs).toBe(false);
      tippe(k);
      expect(aktion).toBe(1);
      expect(toasts).toEqual([]);
      expect(k.className.split(' ')).not.toContain('wackelt');
    });
  });

  it('A92: knopf gesperrt ohne Hinweistext – keine Aktion, keine leere Meldung, aber Wackeln', async () => {
    await mitAttrappe(async (_a, toasts) => {
      const { knopf } = await import('../src/ui/bausteine');
      let aktion = 0;
      const k = knopf('Kaufen', () => { aktion++; }, 'geld', { aus: true, unter: '100 €' }) as unknown as AttrappenElement;
      tippe(k);
      expect(aktion).toBe(0);
      expect(toasts).toEqual([]);
      expect(k.className.split(' ')).toContain('wackelt');
    });
  });

  it('A92: stepper gesperrt – aria-disabled="true" ohne disabled, keine Aktion, wackelt; frei führt aus', async () => {
    await mitAttrappe(async (_a, toasts) => {
      const { stepper } = await import('../src/ui/bausteine');
      let aktion = 0;
      const aus = stepper('minus', 'Senken', () => { aktion++; }, true) as unknown as AttrappenElement;
      expect(gesperrtMitHinweis(aus)).toBe(true);
      tippe(aus);
      expect(aktion).toBe(0);
      expect(toasts).toEqual([]);
      expect(aus.className.split(' ')).toContain('wackelt');
      const an = stepper('plus', 'Erhöhen', () => { aktion++; }, false) as unknown as AttrappenElement;
      expect('aria-disabled' in an.attrs).toBe(false);
      tippe(an);
      expect(aktion).toBe(1);
    });
  });

  it('A92: sperren – ein erst frei gebauter Knopf ist danach gesperrt (z. B. „Gefällt dir“ beim Besuch)', async () => {
    await mitAttrappe(async () => {
      const { knopf, sperren } = await import('../src/ui/bausteine');
      let aktion = 0;
      const k = knopf('Gefällt mir', () => { aktion++; }, 'taler', { klein: true });
      tippe(k as unknown as AttrappenElement);
      expect(aktion).toBe(1);
      sperren(k);
      expect(gesperrtMitHinweis(k as unknown as AttrappenElement)).toBe(true);
      tippe(k as unknown as AttrappenElement);
      expect(aktion).toBe(1);
    });
  });

  it('A92: „Weniger Bewegung“ (Klasse am body) – gesperrter Knopf wackelt nicht, die Meldung kommt trotzdem', async () => {
    await mitAttrappe(async (a, toasts) => {
      (a.doc as unknown as { body: AttrappenElement }).body.className = 'weniger-bewegung';
      const { knopf } = await import('../src/ui/bausteine');
      const k = knopf('Stufe 2', () => {}, '', { aus: true, hinweis: 'Erst Heizzentrale ausbauen' }) as unknown as AttrappenElement;
      tippe(k);
      expect(k.className.split(' ')).not.toContain('wackelt');
      expect(toasts).toEqual(['Erst Heizzentrale ausbauen']);
    });
  });

  it('A92: Quelltext – keine Hülle erklaerKnopf mehr, kein HTML-disabled in knopf/stepper und kein „.disabled = true“ in der Oberfläche', () => {
    const b = readFileSync(new URL('../src/ui/bausteine.ts', import.meta.url), 'utf8');
    expect(b).not.toContain('erklaerKnopf');
    expect(b).not.toMatch(/\bdisabled:/);
    for (const datei of ['../src/steuerung.ts', '../src/ui/kontext.ts', '../src/ui/katalog.ts']) {
      const q = readFileSync(new URL(datei, import.meta.url), 'utf8');
      expect(q, datei).not.toContain('erklaerKnopf');
      expect(q, datei).not.toMatch(/\.disabled\s*=\s*true/);
    }
  });
});

describe('A92 stil.css – ein Sperr-Aussehen für alle Knopfarten (K4)', () => {
  const css = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');
  it('A92: aria-disabled bekommt dasselbe graue Aussehen wie disabled, ohne Deckkraft-Absenkung', () => {
    expect(css).toMatch(/\.knopf:disabled,\.knopf\[aria-disabled="true"\]\{--f:var\(--menue-knopf-aus-0\);[^}]*opacity:1;[^}]*-webkit-text-stroke:0;text-shadow:none/);
    expect(css).not.toContain('.knopf:disabled{opacity:.55');
  });
  it('A92: Zeile 2 eines gesperrten Knopfs ohne Schrift-Schatten – auch bei „los“, „taler“, „blau“, „gefahr“ (Regel steht danach)', () => {
    const variante = css.indexOf('.knopf.los small,.knopf.taler small,.knopf.blau small,.knopf.gefahr small{');
    const sperre = css.indexOf('.knopf[aria-disabled="true"] small{text-shadow:none}');
    expect(variante).toBeGreaterThan(-1);
    expect(sperre).toBeGreaterThan(variante);
  });
  it('A92: gesperrter Knopf drückt sich nicht ein; die Druckregel für freie Knöpfe bleibt (ergänzt, nicht ersetzt)', () => {
    expect(css).toContain('.knopf:active:not(:disabled):not([aria-disabled="true"]){transform:translateY(3px)');
    expect(css).toMatch(/\.weniger-bewegung \.knopf:active:not\(:disabled\):not\(\[aria-disabled="true"\]\)[^{]*\{transform:none;background:var\(--u\)\}/);
    expect(css).not.toContain('sperr-tipp');
  });
  it('A92: Wackeln auch bei Systemeinstellung „Weniger Bewegung“ aus', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{\.knopf\[aria-disabled="true"\]\.wackelt\{animation:none\}\}/);
  });
});

describe('A92 Hinweise beim Antippen gesperrter Knöpfe ohne offenen Bauabschnitt', () => {
  // NR18-P0 (4.18): „Hausanschluss ziehen“ entfällt; der Hinweis hängt an „Leitung selbst legen“. Rot bis NR18-P3 (Knopf noch da).
  it('A92: Hauskarte ohne Abschnitt – „Leitung selbst legen“ zeigt den Philipp-Hinweis, plant nichts, kein Knopf „Hausanschluss ziehen“', async () => {
    const s = neu(1);
    const haus = s.stand.objekte.find((o) => o.x === 9 && o.y === 15)!;
    let ziehen = -1;
    const k = await karte(s, haus, (a, c) => { ziehen = mit(a, c, 'Hausanschluss ziehen').length; tippe(mit(a, c, 'Leitung selbst legen')[0]); });
    expect(ziehen).toBe(0);
    expect(k.toasts).toEqual([HAUS_HINWEIS]);
    expect(s.abschnittLeitungen()).toBe(0);
  });

  it('A92: Zeichenleiste ohne Abschnitt – „Abschnitt abschließen“ zeigt den Philipp-Hinweis', async () => {
    // Stand NR16-B2b: echte Steuerung (tests/hilfen/echte-steuerung.ts) statt Object.create(Steuerung.prototype). Die Leiste
    // öffnet sich nur im offenen Bauabschnitt (12.18); der Abschnitt fällt bei offener Leiste weg (12.21 Punkt 1, B1) –
    // beim Tippen werden die Gründe neu gelesen (12.21 Punkt 3). Heute rot: Steuerung liest die Sperre nur beim Öffnen.
    const s = neu(1);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      delete s.stand.abschnitt;
      echtTippe(perVorlesetext(u, 'Abschnitt abschließen'));
      expect(leer(u.meldung())).toBe(SELBST_HINWEIS);
    });
  });
});

describe('A92 Hinweis „Dickere“ nennt die nächste Freischaltung', () => {
  it('A92: Zeichenleiste Stufe 2 – Tippen auf „Dickere“ nennt Stufe 3 (nicht fest Stufe 2)', async () => {
    const s = neu(2);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      echtTippe(perVorlesetext(u, 'Dickere'));
      expect(leer(u.meldung())).toBe('Dickere Leitungen gibt es ab Heizzentrale Stufe 3. Baue die Heizzentrale aus.');
    });
  });
});

describe('A92 K2 – Baumenü: Phasenwechsel auf einem anderen Reiter baut nicht neu', () => {
  it('A92: Reiter „Außenanlagen“ (waerme) offen, Planung wird fertig → aktualisieren lässt den Inhalt unverändert', async () => {
    await mitAttrappe(async (_a, _t, blatt) => {
      const { Katalog } = await import('../src/ui/katalog');
      const z = { t: T0 };
      const s = new Spiel(neuerSpielstand(T0), () => z.t);
      s.ersteQuelleWaehlen('kessel'); s.stand.geld_eur = 1_000_000; s.neuBerechnen();
      s.abschnittPlanen();
      const k = new Katalog({ ...UI_LEERLAUF, spiel: s, toast: () => {}, jetzt_ms: () => z.t, geaendert: () => {} } as unknown as ConstructorParameters<typeof Katalog>[0]);
      k.oeffnen('waerme');
      const vorher = [...blatt.inhalt.kinder];
      z.t = T0 + 75_000; s.bis(z.t);
      expect(s.abschnitt?.phase).toBe('offen'); // Vorbedingung: die Phase hat gewechselt
      k.aktualisieren();
      expect(blatt.inhalt.kinder).toHaveLength(vorher.length);
      blatt.inhalt.kinder.forEach((kind, i) => expect(kind).toBe(vorher[i]));
    });
  });
});
