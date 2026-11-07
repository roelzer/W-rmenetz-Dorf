import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KATALOG } from '../src/core/katalog';
import { groesse } from '../src/core/netz';
import { laden, serialisieren } from '../src/core/speichern';
import { Spiel } from '../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_SPUR, neuesSpielMitTutorial } from '../src/core/start';
import { Tutorial } from '../src/core/tutorial';
import type { TippMeldung } from '../src/core/tutorial-vertrag';
import type { Objekt } from '../src/core/typen';
import type { El } from './hilfen/dom-attrappe';
import { echteSteuerung } from './hilfen/echte-steuerung';

// Produktprüfer NR13, Muss M1 (ENTSCHEIDUNGEN 2026-11-06): Beim Wiedereinstieg stellt jeder Schritt sein Ziel selbst her.
// Neuladen in T12 (und in T13 mit Strichen → Einstieg T12) ließ das Baumenü zu, die Leitungskarte fehlte, das Tutorial hing.
// Ablauf: Spielstand ohne Oberfläche bis zur gewünschten Lage spielen, speichern, mit der echten Steuerung neu laden
// (wie main.ts: Text lesen → new Spiel → bis(jetzt) → Steuerung mit Wiedereinstieg), [Weiter] der Wiedereinstiegs-Blase,
// dann muss jedes Ziel des Schritts da und im Loch sein und der Tipp darauf den Schritt weiterschalten.
const T0 = 1_000_000;

type St = {
  tick(t: number): void;
  kamera: { mitte(x: number, y: number): [number, number] };
  anleitungAnsicht(): { schritt: string; art: 'W' | 'H'; ziele: string[]; weiter: string | null; leitung_typ?: string; wiedereinstieg: boolean } | null;
};

/** Spielt ohne Oberfläche (wie tests/nr13-ablauf.test.ts): Ereignisse des Spiels gehen ans Tutorial, Tipps meldet der Test. */
function fahrer(s: Spiel, uhr: { t: number }) {
  const t = new Tutorial(s);
  const melden = (): void => { for (const ev of s.ereignisse.splice(0)) if (ev.art === 'schritt') t.schritt(ev); };
  const tippe = (m: Omit<TippMeldung, 'art'>): void => { t.tipp({ art: 'tipp', ...m } as TippMeldung); melden(); };
  const haus = (k: readonly [number, number]) => s.stand.objekte.find((o) => o.x === k[0] && o.y === k[1] && KATALOG[o.typ].kategorie === 'haus')!;
  const [h1, h2] = ERSTE_HAEUSER.map(haus);
  const jetzt = (): string | undefined => t.ansicht(uhr.t)?.schritt;
  const warte = (ms: number): void => { uhr.t += ms; s.bis(uhr.t); melden(); };
  return { t, melden, tippe, h1, h2, jetzt, warte };
}

/** Lagen der Wiedereinstiegs-Tabelle (DESIGN 13.7, einstieg() in src/core/tutorial.ts): Name, erwarteter Schritt, Weg dorthin. */
type Lage = { name: string; schritt: string; spielen(s: Spiel, f: ReturnType<typeof fahrer>): void };
const bisT08 = (s: Spiel, f: ReturnType<typeof fahrer>): void => {
  f.tippe({ tipp: 'heizzentrale' });
  for (let i = 0; i < 6; i++) f.tippe({ tipp: 'weiter' });
  expect(f.jetzt()).toBe('T08');
};
const bisT11 = (s: Spiel, f: ReturnType<typeof fahrer>): void => {
  bisT08(s, f);
  f.tippe({ tipp: 'baumenue' }); f.tippe({ tipp: 'reiter_leitungen' });
  expect(s.abschnittPlanen().ok).toBe(true); f.melden();
  expect(f.jetzt()).toBe('T11');
};
const bisT12 = (s: Spiel, f: ReturnType<typeof fahrer>): void => {
  bisT11(s, f);
  f.warte(10_000); // Tutorial-Planung 10 s (tests/nr13-kern.test.ts)
  f.tippe({ tipp: 'weiter' });
  expect(f.jetzt()).toBe('T12');
};
const striche = (s: Spiel, f: ReturnType<typeof fahrer>, anzahl: number): void => {
  bisT12(s, f);
  const typ = s.tutorialWerte().haupt;
  f.tippe({ tipp: 'leitungskarte', typ });
  expect(f.jetzt()).toBe('T13');
  for (const [x, y] of TUTORIAL_SPUR.slice(0, anzahl)) { expect(s.platzieren(typ, x, y).ok).toBe(true); f.melden(); }
};
const bisT15 = (s: Spiel, f: ReturnType<typeof fahrer>): void => {
  striche(s, f, TUTORIAL_SPUR.length);
  expect(f.jetzt()).toBe('T14');
  expect(s.abschnittAbschliessen().ok).toBe(true); f.melden();
  expect(f.jetzt()).toBe('T15');
};
const bisT18 = (s: Spiel, f: ReturnType<typeof fahrer>): void => {
  bisT15(s, f);
  f.tippe({ tipp: 'haus', objekt_id: f.h1.id }); f.tippe({ tipp: 'weiter' });
  expect(s.stationKaufen(f.h1.id, 'hp_800').ok).toBe(true); f.melden();
  expect(f.jetzt()).toBe('T18');
};
const bisT20 = (s: Spiel, f: ReturnType<typeof fahrer>): void => {
  bisT18(s, f);
  f.tippe({ tipp: 'haus', objekt_id: f.h2.id });
  expect(s.stationKaufen(f.h2.id, 'hp_800').ok).toBe(true); f.melden();
  expect(f.jetzt()).toBe('T20');
};
const bisT22 = (s: Spiel, f: ReturnType<typeof fahrer>): void => {
  bisT20(s, f);
  f.tippe({ tipp: 'baumenue' });
  expect(s.materialBestellen().ok).toBe(true); f.melden();
  expect(f.jetzt()).toBe('T22');
};

const LAGEN: Lage[] = [
  { name: 'kein Abschnitt, Kapitel 1', schritt: 'T01', spielen: () => {} },
  { name: 'kein Abschnitt, Kapitel 2', schritt: 'T08', spielen: bisT08 },
  { name: 'Planung läuft', schritt: 'T11', spielen: bisT11 },
  { name: 'offen, nichts gezeichnet (Neuladen in T12)', schritt: 'T12', spielen: bisT12 },
  { name: 'offen, Striche im Netz (Neuladen in T13)', schritt: 'T12', spielen: (s, f) => striche(s, f, 3) },
  { name: 'offen, beide verbunden', schritt: 'T12', spielen: (s, f) => striche(s, f, TUTORIAL_SPUR.length) },
  { name: 'bestellen, Haus 1 ohne Station', schritt: 'T15', spielen: bisT15 },
  { name: 'bestellen, Haus 2 ohne Station', schritt: 'T18', spielen: bisT18 },
  { name: 'bestellen, beide Stationen', schritt: 'T20', spielen: bisT20 },
  { name: 'Bau läuft', schritt: 'T22', spielen: bisT22 },
  { name: 'kein Abschnitt, beide warm', schritt: 'T24', spielen: (s, f) => { bisT22(s, f); f.tippe({ tipp: 'weiter' }); for (let i = 0; i < 2; i++) f.warte(10_000); } },
];

/** Spielt die Lage, speichert und lädt neu wie main.ts. */
function geladen(lage: Lage, uhr: { t: number }): Spiel {
  const s = new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);
  s.namenSetzen('Anna', 'Heatville');
  lage.spielen(s, fahrer(s, uhr));
  const text = serialisieren(s.stand);
  uhr.t += 1_000;
  const neu = new Spiel(laden(text, uhr.t), () => uhr.t);
  neu.bis(uhr.t);
  return neu;
}

type Werkzeug = {
  st: St; doc: { getElementById(id: string): El | null; querySelector(s: string): El | null };
  eingabeErlaubt(x: number, y: number): boolean; tippeKarte(o: Objekt): void; karte: Record<string, Objekt>; mitte(o: Objekt): [number, number];
};

/** Echte Steuerung auf dem geladenen Stand; erste Blase = Wiedereinstieg, danach [Weiter]. */
async function nachNeuladen(spiel: Spiel, uhr: { t: number }, arbeit: (w: Werkzeug) => void): Promise<void> {
  await echteSteuerung(spiel, async (u) => {
    const { eingabeErlaubt } = await import('../src/ui/spotlight');
    const st = u.st as unknown as St, doc = u.dom.doc as unknown as Werkzeug['doc'];
    const leinwand = u.dom.app.querySelector('canvas')!;
    const haus = (k: readonly [number, number]) => spiel.stand.objekte.find((o) => o.x === k[0] && o.y === k[1] && KATALOG[o.typ].kategorie === 'haus')!;
    const [h1, h2] = ERSTE_HAEUSER.map(haus);
    const mitte = (o: Objekt): [number, number] => { const g = groesse(o); return st.kamera.mitte(o.x + (g - 1) / 2, o.y + (g - 1) / 2); };
    const zeiger = (id: number, [x, y]: readonly [number, number]) => ({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch', button: 0 });
    const tippeKarte = (o: Objekt): void => { const p = mitte(o); leinwand.ausloesen('pointerdown', zeiger(3, p)); leinwand.ausloesen('pointerup', zeiger(3, p)); };
    st.tick(uhr.t);
    expect(st.anleitungAnsicht()?.wiedereinstieg, 'erste Blase nach dem Neuladen').toBe(true);
    doc.getElementById('anleiter-weiter')!.click();
    vi.advanceTimersByTime(2_000); st.tick(uhr.t); // eine begonnene Kamerafahrt ist vorbei
    arbeit({ st, doc, eingabeErlaubt, tippeKarte, karte: { heizzentrale: spiel.hz, haus1: h1, haus2: h2 }, mitte });
  }, { uhr: () => uhr.t });
}

/** Bedienelement-Ziel: im Dokument; im Handlungs-Schritt lässt das Loch den Tipp an seinem Rechteck durch (im Erklär-Schritt
 *  zeigt das Loch nur, AE-NR13-6 – dort ist [Weiter] das Bedienziel). */
function elementZiel(w: Werkzeug, uhr: { t: number }, art: 'W' | 'H', z: string, typ?: string): El {
  const el = w.doc.querySelector(`[data-ziel="${z}"]${typ ? `[data-typ="${typ}"]` : ''}`);
  expect(el, `Ziel ${z}${typ ? ` (${typ})` : ''} nach dem Neuladen im Dokument`).not.toBeNull();
  // Die Nachbildung rechnet kein Layout: Rechteck vorgeben, dann muss das Loch genau dort durchlassen
  el!.rechteck = { left: 600, top: 200, right: 700, bottom: 260, width: 100, height: 60, x: 600, y: 200 };
  w.st.tick(uhr.t);
  if (art === 'H') expect(w.eingabeErlaubt(650, 230), `Ziel ${z}: Loch lässt den Tipp durch`).toBe(true);
  return el!;
}

describe('NR13 Neuladen: jeder Wiedereinstiegs-Schritt hat ein erreichbares Ziel (Muss M1)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  for (const [titel, anzahl] of [['Neuladen in T12', 0], ['Neuladen in T13 mit Strichen', 3]] as const) {
    it(`test_nr13_neuladen_baumenue: ${titel} → Baumenü auf „Leitungen“ offen, Leitungskarte im Loch, Tipp darauf → T13`, async () => {
      const uhr = { t: T0 };
      const lage = LAGEN.find((l) => l.schritt === 'T12' && (anzahl ? l.name.includes('Striche') : l.name.includes('nichts')))!;
      const spiel = geladen(lage, uhr);
      await nachNeuladen(spiel, uhr, (w) => {
        const a = w.st.anleitungAnsicht()!;
        expect(a.schritt).toBe('T12');
        const reiter = w.doc.querySelector('[data-ziel="reiter_leitungen"]');
        expect(reiter, 'Baumenü offen').not.toBeNull();
        expect(reiter!.getAttribute('aria-selected'), 'Reiter „Leitungen“ gewählt').toBe('true');
        const karte = elementZiel(w, uhr, a.art, 'leitungskarte', a.leitung_typ);
        karte.click();
        w.st.tick(uhr.t);
        expect(w.st.anleitungAnsicht()?.schritt).toBe('T13');
      });
    });
  }

  for (const lage of LAGEN) {
    it(`test_nr13_neuladen_ziel_erreichbar: ${lage.name} → ${lage.schritt}, jedes Ziel da und im Loch, Schritt geht weiter`, async () => {
      const uhr = { t: T0 };
      const spiel = geladen(lage, uhr);
      await nachNeuladen(spiel, uhr, (w) => {
        const a = w.st.anleitungAnsicht()!;
        expect(a.schritt).toBe(lage.schritt);
        let erstes: (() => void) | null = null;
        for (const z of a.ziele) {
          const o = w.karte[z];
          if (o) {
            if (a.art === 'H') expect(w.eingabeErlaubt(...w.mitte(o)), `${a.schritt}: Loch ${z}`).toBe(true);
            erstes ??= () => w.tippeKarte(o);
          } else {
            const el = elementZiel(w, uhr, a.art, z, z === 'leitungskarte' ? a.leitung_typ : undefined);
            erstes ??= () => el.click();
          }
        }
        if (a.art === 'H') {
          expect(erstes, `${a.schritt}: Handlungs-Schritt ohne Ziel`).not.toBeNull();
          erstes!();
        } else {
          // Erklär-Schritt: [Weiter] ist das Ziel; wartet er (Planung/Bau), kommt [Weiter] nach Ablauf der Zeit
          if (a.weiter === 'wartet') { for (let i = 0; i < 3; i++) { uhr.t += 10_000; vi.advanceTimersByTime(7_000); w.st.tick(uhr.t); } }
          vi.advanceTimersByTime(7_000); w.st.tick(uhr.t);
          const weiter = w.doc.getElementById('anleiter-weiter');
          expect(weiter, `${a.schritt}: [Weiter] da`).not.toBeNull();
          weiter!.click();
        }
        vi.advanceTimersByTime(2_000); w.st.tick(uhr.t);
        expect(w.st.anleitungAnsicht()?.schritt, `${lage.schritt} ist nach dem Tipp aufs Ziel weitergegangen`).not.toBe(lage.schritt);
        // auch der nächste Schritt steht nicht ohne Ziel da (Neuladen in T11 → [Weiter] → T12 braucht die Leitungskarte)
        const b = w.st.anleitungAnsicht();
        for (const z of b?.ziele ?? []) {
          if (w.karte[z] || z === 'leitungsstueck') continue;
          expect(w.doc.querySelector(`[data-ziel="${z}"]${z === 'leitungskarte' ? `[data-typ="${b!.leitung_typ}"]` : ''}`), `${b!.schritt}: Ziel ${z} da`).not.toBeNull();
        }
      });
    });
  }
});
