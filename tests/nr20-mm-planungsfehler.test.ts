import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Spiel } from '../src/core/spiel';
import { KONSTANTEN, istLeitung, type TypId } from '../src/core/katalog';
import { berechneNetz } from '../src/core/netz';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { neu } from './hilfen';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';
import { objektBei } from './hilfen/nr18';
import { aufnahme, leeresDorf } from './hilfen/nr22';

// ENTSCHEIDUNGEN 2026-11-11 „Review Merge (W1/W2)“, W2: Simon hat auf main (c4335c9, 10.11.) im freien Spiel den Kasten
// „Planungsfehler“ (Engpass, Aufteilung, Reduzierung) im Leitungsblatt und das rote Planungsfehler-Dreieck auf der Karte
// entfernt. Im freien Spiel bleibt nur „Überlastet“ (NR22: gelbes Warndreieck, Saum, Kasten). Der Kern rechnet die drei
// Kennungen weiter (das Tutorial braucht sie: tutorial-netz.ts `planungsfehler`, Rest-/Fremdstücke) – geprüft wird hier nur,
// dass das freie Spiel sie nicht mehr zeigt. Hauptleitungstext wörtlich wie main c4335c9 (src/ui/kontext.ts).
//
// Lagen von Hand (Startdorf, Heizzentrale 2×2 ab (11|10), Abgang westlich (10|10)); die Leitungen sind gebaut und haben keinen
// Kunden, also keine Last und keine Überlast. Welche Kennung der Kern setzt, prüft jeder Test als Testaufbau:
// - Reduzierung (A67): 32er (10|10),(10|9),(9|9), danach 25er (8|9),(7|9) – dünner mitten auf der Strecke.
// - Engpass: 25er (10|10),(10|9),(9|9), danach 32er (8|9),(7|9) – dünn vor dick.
// - Aufteilung (A76): 32er (10|10),(10|9), von (10|9) zwei 32er-Abgänge (9|9) und (10|8).

const T0 = 1_000_000_000_000;
const N = KONSTANTEN.feldanzahl;
const norm = (t: string): string => t.replace(/\s+/g, ' ').trim();
const HAUPT_MAIN = 'Hauptleitung: versorgt weiter hinten mehrere Häuser. Entscheidend ist, ob ihre Kapazität für die benötigte Wärme ausreicht.';
const HAUPT_ALT = 'deshalb dick. Dünner werden darf sie nur an einem Abzweig';
// Die drei Planungsfehler-Sätze (vor c4335c9), je ein unverwechselbarer Teil
const SAETZE = ['Wärme kommt nur durch den dünnsten Abschnitt', 'So plant das niemand', 'Wie in echt wechselt der Durchmesser nur an einem Abzweig'];

type Lage = { name: 'reduzierung' | 'engpass' | 'aufteilung'; leitungen: Array<[TypId, number, number]>; feld: [number, number] };
const LAGEN: Lage[] = [
  { name: 'reduzierung', feld: [9, 9], leitungen: [['d32', 10, 10], ['d32', 10, 9], ['d32', 9, 9], ['d25', 8, 9], ['d25', 7, 9]] },
  { name: 'engpass', feld: [9, 9], leitungen: [['d25', 10, 10], ['d25', 10, 9], ['d25', 9, 9], ['d32', 8, 9], ['d32', 7, 9]] },
  { name: 'aufteilung', feld: [10, 9], leitungen: [['d32', 10, 10], ['d32', 10, 9], ['d32', 9, 9], ['d32', 10, 8]] },
];

/** Freies Spiel (kein Tutorial) mit den gebauten Leitungen der Lage; prüft, dass der Kern genau die erwartete Kennung setzt. */
function freiesSpiel(l: Lage): Spiel {
  const { s } = leeresDorf(T0);
  expect(s.stand.tutorial, 'Testaufbau: freies Spiel ohne Tutorial').toBeFalsy();
  for (const [typ, x, y] of l.leitungen) {
    expect(s.stand.objekte.some((o) => o.x === x && o.y === y), `Testaufbau: (${x}|${y}) frei`).toBe(false);
    s.stand.objekte.push(neu(typ, x, y, { id: s.stand.objekte.reduce((m, o) => Math.max(m, o.id), 0) + 1 }));
  }
  s.neuBerechnen();
  const key = l.feld[1] * N + l.feld[0];
  expect(s.netz[l.name].has(key), `Testaufbau: Kern setzt ${l.name} auf (${l.feld[0]}|${l.feld[1]})`).toBe(true);
  expect(s.netz.tiefe.has(key), 'Testaufbau: an die Heizzentrale angebunden').toBe(true);
  expect(s.ueberlastStuecke(), 'Testaufbau: keine Überlast').toEqual([]);
  return s;
}
const blatt = (u: EchteUmgebung): El => u.dom.html.querySelectorAll('.blatt').filter((b) => b.isConnected)[0];
const kastenTitel = (u: EchteUmgebung): string[] => blatt(u).querySelectorAll('.kasten').map((k) => norm(k.querySelector('h3')?.textContent ?? ''));

afterEach(() => { vi.restoreAllMocks(); });

describe('Merge W2: Leitungsblatt im freien Spiel ohne Planungsfehler-Kasten (wie main c4335c9)', () => {
  // Fehler, die ihn rot machen: Das Blatt hängt bei Engpass, Aufteilung oder Reduzierung wieder einen Kasten „Planungsfehler“
  // an oder zeigt einen der alten Sätze; oder der Hauptleitungstext ist nicht der aus main.
  it.each(LAGEN)('test_mm_w2_blatt_ohne_planungsfehler ($name): kein Kasten „Planungsfehler“, kein alter Satz, Hauptleitungstext wie main', async (l) => {
    const s = freiesSpiel(l);
    await echteSteuerung(s, (u) => {
      const o = objektBei(s, l.feld[0], l.feld[1], (x) => istLeitung(x.typ))!;
      u.st.kontext(o.id);
      const text = norm(blatt(u).textContent);
      expect(kastenTitel(u), 'kein Kasten im Blatt (kein Planungsfehler, keine Überlast)').not.toContain('Planungsfehler');
      expect(text).not.toContain('Planungsfehler');
      for (const satz of SAETZE) expect(text).not.toContain(satz);
      expect(text).toContain(HAUPT_MAIN);
      expect(text).not.toContain(HAUPT_ALT);
    }, { uhr: () => T0 });
  });
});

// ───────────── Karte ─────────────
// Kamera 844×390, Zoom 2 (wie tests/nr22-darstellung.test.ts). Das rote Planungsfehler-Dreieck war eine Fläche in
// '#d8392f' (src/render/szene.ts vor dem Merge-Fix: fillStyle '#d8392f', dann symbol 'ausruf'). Die 25er-Rohrfarbe ist zwar
// auch '#d8392f', wird aber als Strich gezeichnet (strokeStyle) – eine Fläche in dieser Farbe gibt es ohne Dreieck nicht.
// Das gelbe Überlast-Warndreieck (NR22) ist eine Fläche in '#ffc531' (menue.farbe.ueberlast_zeichen).
const ROT = '#d8392f', GELB = '#ffc531';
const objekteVon = (l: Lage) => [neu('hz', 11, 10), ...l.leitungen.map(([typ, x, y]) => neu(typ, x, y))];
function bild(l: Lage, extra: Partial<Szene> = {}): string[] {
  const objekte = objekteVon(l), netz = berechneNetz(objekte, [], 1);
  const a = aufnahme(), m = new Maler(a.X), k = new Kamera();
  k.groesseSetzen(844, 390, 1); k.zoom = 2; k.zentrieren(9, 9, 1);
  bodenEbeneEinrichten(null);
  const szene: Szene = {
    objekte, innen: [], netz, spiel: null, auswahl_id: null, modus: 'normal', geist: null,
    verschiebe_id: null, stempel: null, jetzt_ms: 10_000, strassen: [], fluss: [], kw_anzeigen: false, ...extra,
  };
  zeichneSzene(m, k, szene, new Effekte(), 0.016);
  return a.befehle;
}

describe('Merge W2: Karte im freien Spiel ohne rotes Planungsfehler-Dreieck (wie main c4335c9)', () => {
  // Fehler, der ihn rot macht: Die Szene zeichnet bei Engpass, Aufteilung oder Reduzierung wieder das rote Dreieck.
  it.each(LAGEN)('test_mm_w2_karte_ohne_rotes_dreieck ($name): keine rote Dreiecksfläche', (l) => {
    const objekte = objekteVon(l), netz = berechneNetz(objekte, [], 1);
    expect(netz[l.name].has(l.feld[1] * N + l.feld[0]), `Testaufbau: Kern setzt ${l.name}`).toBe(true);
    const b = bild(l);
    expect(b.filter((x) => x === `fillStyle=${ROT}`), 'rote Dreiecksfläche').toEqual([]);
    expect(b.some((x) => x.startsWith('strokeStyle=')), 'Vorprobe: Leitungen gezeichnet').toBe(true);
  });

  // Fehler, der ihn rot macht: Mit dem roten Dreieck fällt auch das gelbe Überlast-Warndreieck (NR22) weg.
  it('test_mm_w2_gelbes_warndreieck_bleibt: Überlast-Stück auf einer Lage mit Planungsfehler → genau ein gelbes Dreieck, kein rotes', () => {
    const l = LAGEN[0];
    const felder = l.leitungen.map(([, x, y]) => y * N + x);
    const b = bild(l, { ueberlast: [{ felder, dreiecke: [felder[0]], geplant: false, seit_ms: 0 }] });
    expect(b.filter((x) => x === `fillStyle=${GELB}`)).toHaveLength(1);
    expect(b.filter((x) => x === `fillStyle=${ROT}`)).toEqual([]);
  });
});
