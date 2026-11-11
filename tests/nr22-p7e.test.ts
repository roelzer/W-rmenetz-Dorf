// Tester-Vorarbeit P7e (DESIGN 13.17.11 H1–H5, Fotocheck docs/pruefberichte/20261108-designer-nr20-22-final.md, ENTSCHEIDUNGEN
// 2026-11-11) und Nachträge aus dem Review P5g (G7 Pfeillänge, stecker_blass_ids im Szenen-Schlüssel).
// Geprüft wird Verhalten: aufgezeichnete Canvas-Befehle (Breite, Farbe, Deckkraft je Strich), Text und Knöpfe im echten
// Leitungsblatt, Geometrie des Bandpfeils auf dem Bildschirm. Rot bis P7e sind die Tests mit „(rot bis P7e)“ im Namen.
import { afterEach, describe, expect, it, vi } from 'vitest';
import tokens from '../design/tokens.json';
import { KONSTANTEN, istLeitung, passendeStation, type TypId } from '../src/core/katalog';
import { bedarfKw, berechneNetz } from '../src/core/netz';
import type { Spiel } from '../src/core/spiel';
import type { TutorialBandFeld } from '../src/core/tutorial-vertrag';
import type { Objekt } from '../src/core/typen';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { szenenSchluessel } from '../src/render/szene-schluessel';
import { neu } from './hilfen';
import type { El } from './hilfen/dom-attrappe';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import { abschnittOeffnen, objektBei, vorstellen, type Uhr } from './hilfen/nr18';
import { aufnahme, leeresDorf } from './hilfen/nr22';

const N = KONSTANTEN.feldanzahl;
// Von Hand: 25er '#d8392f', 40er '#6ec6ff', 32er '#4caf3e' (core/katalog.ts), Warngelb '#ffc531' und Kontur '#3b1d0a'
// (design/tokens.json menue.farbe), dunkle Rohrkante 'rgba(40,34,26,.4)' (heute ohne Überlast, bleibt).
const D25 = '#d8392f', D40 = '#6ec6ff', D32 = '#4caf3e', GELB = '#ffc531', KONTUR = '#3b1d0a', GLANZ = 'rgba(255,255,255,.45)';

// ---------------------------------------------------------------- Hilfe: Striche mit dem Zustand, der beim stroke() gilt
type Strich = { i: number; farbe: string; breite: number; alpha: number; dash: string };
/** Spielt die Aufnahme ab wie ein Canvas (save/restore sichern Farbe, Breite, Deckkraft und Strichmuster) und liefert je stroke()
 *  den dann gültigen Zustand. */
function striche(b: string[]): Strich[] {
  type Z = { farbe: string; breite: number; alpha: number; dash: string };
  let z: Z = { farbe: '#000', breite: 1, alpha: 1, dash: '[]' };
  const stapel: Z[] = [], r: Strich[] = [];
  b.forEach((x, i) => {
    if (x === 'save()') stapel.push({ ...z });
    else if (x === 'restore()') z = stapel.pop() ?? z;
    else if (x.startsWith('strokeStyle=')) z.farbe = x.slice(12);
    else if (x.startsWith('lineWidth=')) z.breite = Number(x.slice(10));
    else if (x.startsWith('globalAlpha=')) z.alpha = Number(x.slice(12));
    else if (x.startsWith('setLineDash(')) z.dash = x.slice(12, -1);
    else if (x === 'stroke()') r.push({ i, ...z });
  });
  return r;
}
const gleich = (a: number, c: number): boolean => Math.abs(a - c) < 1e-9;

// ================================================================= H1 – Saum schmal, Gesamtbreite wie ohne Überlast
// Lage wie tests/nr22-darstellung.test.ts: Kamera 844×390, Zoom 2 → Feldbreite tw = 52; 25er w = max(2, 52 × 0,06) = 3,12.
// Ohne Überlast: dunkle Kante w + 2 = 5,12, darin das Rohr w. Mit Überlast (13.17.11 H1): Gelb w + 2 × saum_px = w + 2 = 5,12
// statt der dunklen Kante, keine Außenlinie, Rohr w in der Mitte, Glanzstrich bleibt.
describe('P7e H1: Überlast-Saum ersetzt nur die dunkle Kante', () => {
  const objekte = [neu('hz', 11, 10), ...[10, 9, 8, 7, 6].map((x) => neu('d25', x, 10))];
  const F = (x: number): number => 10 * N + x;
  const netz = berechneNetz(objekte, [], 1);
  for (const x of [10, 9, 8, 7, 6]) netz.kapazitaet_ok.set(F(x), false);
  const STUECK = { felder: [F(10), F(9), F(8), F(7), F(6)], dreiecke: [F(10)], geplant: false, seit_ms: 0 };
  const szene = (extra: Partial<Szene>): Szene => ({
    objekte, innen: [], netz, spiel: null, auswahl_id: null, modus: 'normal', geist: null,
    verschiebe_id: null, stempel: null, jetzt_ms: 10_000, strassen: [], fluss: [], kw_anzeigen: false, ...extra,
  });
  function bild(s: Szene): string[] {
    const a = aufnahme(), m = new Maler(a.X), k = new Kamera();
    k.groesseSetzen(844, 390, 1); k.zoom = 2; k.zentrieren(9, 10, 1);
    bodenEbeneEinrichten(null);
    zeichneSzene(m, k, s, new Effekte(), 0.016);
    return a.befehle;
  }
  /** Querschnitt je Rohrfeld: alle Striche zwischen dem Rohrbett (fillStyle rgba(140,100,55,.35), szene.ts) und dem Glanzstrich */
  function querschnitte(b: string[]): Strich[][] {
    const alle = striche(b), r: Strich[][] = [];
    b.forEach((x, i) => {
      if (x !== 'fillStyle=rgba(140,100,55,.35)') return;
      const glanz = alle.find((s) => s.i > i && s.farbe === GLANZ);
      if (glanz) r.push(alle.filter((s) => s.i > i && s.i < glanz.i));
    });
    return r;
  }
  const breiteste = (q: Strich[]): number => Math.max(...q.map((s) => s.breite));

  // Vorprobe der Lage: ohne Überlast fünf Querschnitte mit dunkler Kante 5,12 und Rohr 3,12 in leitung.d25
  it('test_h1_vorprobe_ohne_ueberlast: fünf Rohrfelder, breitester Strich 5,12 (dunkle Kante), innen 25er-Farbe 3,12', () => {
    const q = querschnitte(bild(szene({})));
    expect(q).toHaveLength(5);
    for (const f of q) {
      expect(breiteste(f)).toBeCloseTo(5.12, 9);
      expect(f[f.length - 1]).toMatchObject({ farbe: D25, alpha: 1 });
      expect(f[f.length - 1].breite).toBeCloseTo(3.12, 9);
    }
  });

  // Fehler, der ihn rot macht: Saum außen breiter als die Leitung ohne Überlast (heute 9,12 statt 5,12), Gelb schmaler als die
  // Kante (dann bliebe dunkler Rand sichtbar außen) oder dunkle Außenlinie in `kontur`.
  it('test_h1_gesamtbreite_wie_ohne_ueberlast (rot bis P7e): je Feld breitester Strich = 5,12, und der ist gelb und voll deckend', () => {
    const ohne = querschnitte(bild(szene({}))), mit = querschnitte(bild(szene({ ueberlast: [STUECK] })));
    expect(mit).toHaveLength(5);
    mit.forEach((f, n) => {
      expect(breiteste(f), `Feld ${n}: Gesamtbreite`).toBeCloseTo(breiteste(ohne[n]), 9);
      const aussen = f.filter((s) => gleich(s.breite, breiteste(f)));
      expect(aussen.map((s) => [s.farbe, s.alpha]), `Feld ${n}: oberster der breitesten Striche`).toContainEqual([GELB, 1]);
      expect(aussen[aussen.length - 1].farbe, `Feld ${n}: Gelb liegt zuletzt auf der Kantenbreite`).toBe(GELB);
    });
  });

  it('test_h1_keine_aussenlinie (rot bis P7e): auf den Feldern des Stücks kein Strich in `kontur`, keine Deckkraft 0,55', () => {
    const mit = querschnitte(bild(szene({ ueberlast: [STUECK] })));
    for (const f of mit) {
      expect(f.filter((s) => s.farbe === KONTUR)).toEqual([]);
      expect(f.filter((s) => gleich(s.alpha, 0.55))).toEqual([]);
    }
  });

  // Prüfzweck aus 13.17.3 bleibt: Rohrfarbe in der Mitte, Gelb erkennbar (1 px je Seite = Kantenbreite − Rohrbreite = 2)
  it('test_h1_rohrfarbe_mitte_gelb_ein_px (rot bis P7e): innen 25er 3,12 voll deckend über dem Gelb, Gelb je Seite 1 px breiter', () => {
    const mit = querschnitte(bild(szene({ ueberlast: [STUECK] })));
    for (const f of mit) {
      const letzter = f[f.length - 1];
      expect(letzter).toMatchObject({ farbe: D25, alpha: 1 });
      expect(letzter.breite).toBeCloseTo(3.12, 9);
      const gelb = f.filter((s) => s.farbe === GELB);
      expect(gelb).toHaveLength(1);
      expect((gelb[0].breite - letzter.breite) / 2, 'Gelb je Seite 1 px (13.17.11 H1)').toBeCloseTo(1, 9);
      expect(gelb[0].i).toBeLessThan(letzter.i);
    }
  });

  it('test_h1_token_saum_px_1 (rot bis P7e): karte.ueberlast.saum_px = 1', () => {
    expect(tokens.karte.ueberlast.saum_px).toBe(1);
  });

  it('test_h1_glanz_bleibt: auch auf überlasteten Feldern folgt dem Rohr der Glanzstrich', () => {
    const b = bild(szene({ ueberlast: [STUECK] }));
    expect(querschnitte(b)).toHaveLength(5);
    expect(striche(b).filter((s) => s.farbe === GLANZ).length).toBeGreaterThanOrEqual(5);
  });
});

// ================================================================= H2 – Vorschau-Rauten deckend mit dunkler Unterlinie
// Lage wie tests/nr22-vorschau.test.ts: 25er (10|10) → (6|10), (10|10) mit 32er-Ersatz. Planraute: Linie 1,5 px (szene.ts
// planRaute) → Unterlinie 1,5 + 2 = 3,5 px in `kontur`, Deckkraft 0,5, gleiches Strichmuster; Farbstrich Deckkraft 1.
describe('P7e H2: Vorschau-Rauten', () => {
  const F = (x: number): number => 10 * N + x;
  const objekte = [neu('hz', 11, 10), neu('d25', 10, 10, { ersatz: { typ: 'd32', nr: 99 } }), ...[9, 8, 7, 6].map((x) => neu('d25', x, 10))];
  const netz = berechneNetz(objekte, [], 1);
  const szene = (extra: Partial<Szene>): Szene => ({
    objekte, innen: [], netz, spiel: null, auswahl_id: null, modus: 'normal', geist: null,
    verschiebe_id: null, stempel: null, jetzt_ms: 10_000, strassen: [], fluss: [], kw_anzeigen: false, ...extra,
  });
  function bild(s: Szene): string[] {
    const a = aufnahme(), m = new Maler(a.X), k = new Kamera();
    k.groesseSetzen(844, 390, 1); k.zoom = 2; k.zentrieren(9, 10, 1);
    bodenEbeneEinrichten(null);
    zeichneSzene(m, k, s, new Effekte(), 0.016);
    return a.befehle;
  }
  const VORSCHAU = { felder: [F(9), F(8), F(7)], typ: 'd40' as TypId };

  // Fehler, der ihn rot macht: Farbstrich weiter mit 0,5 (heute, Kontrast ≈ 1,1:1).
  it('test_h2_farbstrich_voll_deckend (rot bis P7e): drei gestrichelte 40er-Rauten mit Deckkraft 1', () => {
    const r = striche(bild(szene({ ueberlast_vorschau: VORSCHAU }))).filter((s) => s.farbe === D40);
    expect(r).toHaveLength(3);
    for (const s of r) { expect(s.alpha).toBe(1); expect(s.dash).not.toBe('[]'); }
  });

  // Fehler, der ihn rot macht: keine Unterlinie, Unterlinie in anderer Breite/Deckkraft, durchgezogen statt im Strichrhythmus
  // oder über statt unter dem Farbstrich.
  it('test_h2_unterlinie (rot bis P7e): direkt vor jedem Farbstrich eine Linie `kontur`, 3,5 px, Deckkraft 0,5, gleiches Muster', () => {
    const alle = striche(bild(szene({ ueberlast_vorschau: VORSCHAU })));
    const farbe = alle.filter((s) => s.farbe === D40);
    expect(farbe).toHaveLength(3);
    for (const s of farbe) {
      const davor = alle[alle.indexOf(s) - 1];
      expect(davor.farbe).toBe(KONTUR);
      expect(davor.breite).toBeCloseTo(s.breite + 2, 9);
      expect(davor.breite).toBeCloseTo(3.5, 9);
      expect(davor.alpha).toBe(0.5);
      expect(davor.dash).toBe(s.dash);
    }
  });

  it('test_h2_ersatzraute_unveraendert: ohne Vorschau 32er-Ersatzraute mit 0,8, ohne Unterlinie (12.22 bleibt)', () => {
    const alle = striche(bild(szene({})));
    const ersatz = alle.filter((s) => s.farbe === D32);
    expect(ersatz).toHaveLength(1);
    expect(ersatz[0].alpha).toBe(0.8);
    expect(alle.filter((s) => s.farbe === KONTUR && gleich(s.breite, 3.5))).toEqual([]);
  });

  it('test_h2_tokens (rot bis P7e): faktor.ueberlast_vorschau_deckkraft = 1, faktor.ueberlast_vorschau_unterlinie = 0,5', () => {
    expect(tokens.menue.faktor).toMatchObject({ ueberlast_vorschau_deckkraft: 1, ueberlast_vorschau_unterlinie: 0.5 });
  });
});

// ================================================================= H3, H4 – Leitungsblatt
// Lage wie tests/nr22-blatt.test.ts (dort von Hand hergeleitet): 25er von (11|9) bis (3|7), 11 Felder, Reihenhaus (4|7) mit
// 16 kW am Ende; die 25er schafft 15 kW → ein Stück, empfohlen 32er.
const T0 = 1_000_000_000_000;
const WEG: ReadonlyArray<[number, number]> = [[11, 9], [10, 9], [9, 9], [8, 9], [7, 9], [6, 9], [5, 9], [4, 9], [3, 9], [3, 8], [3, 7]];
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const leitung = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => istLeitung(o.typ))!;
const wegLeitungen = (s: Spiel): Objekt[] => WEG.map(([x, y]) => leitung(s, x, y));
const mit = (u: EchteUmgebung, anfang: string): El[] => u.knoepfe().filter((k) => k.isConnected && norm(k.textContent).startsWith(anfang));
const blatt = (u: EchteUmgebung): El => u.dom.html.querySelectorAll('.blatt').filter((b) => b.isConnected)[0];
const blattText = (u: EchteUmgebung): string => norm(blatt(u).textContent);
const kastenTeile = (u: EchteUmgebung): string[] => (blatt(u).querySelectorAll('.kasten')
  .find((k) => norm(k.querySelector('h3')?.textContent ?? '') === 'Überlastet')?.children ?? []).map((c) => norm(c.textContent));
const SATZ_GEPLANT = 'Der Tausch kommt mit dem Bauabschnitt. Bis dahin bleibt es hier zu eng.';

function gebautOffen(): { s: Spiel; z: Uhr } {
  const d = leeresDorf(T0);
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  for (const [x, y] of WEG) expect(d.s.platzieren('d25', x, y).ok).toBe(true);
  const h = objektBei(d.s, 4, 7, (o) => !istLeitung(o.typ))!;
  expect(d.s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
  expect(d.s.abschnittAbschliessen().ok).toBe(true);
  expect(d.s.materialBestellen().ok).toBe(true);
  vorstellen(d.s, d.z, KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  expect(d.s.ueberlastStuecke().map((e) => [e.felder.length, e.empfohlen]), 'Testaufbau').toEqual([[11, 'd32']]);
  return d;
}
/** Ersatz je Feld des Wegs in der Reihenfolge von WEG */
function planen(s: Spiel, typen: TypId[]): void {
  // Die 50er ist erst ab Heizzentrale Stufe 2 frei (tests/a88-freischalt-leiter.test.ts); das Stück bleibt dabei dasselbe
  if (typen.includes('d50')) {
    s.hz.stufe = 2; s.neuBerechnen();
    expect(s.ueberlastStuecke().map((e) => [e.felder.length, e.empfohlen]), 'Testaufbau Stufe 2').toEqual([[11, 'd32']]);
  }
  wegLeitungen(s).forEach((o, i) => expect(s.ersatzPlanen(o.id, typen[i]).ok, `Ersatz ${typen[i]} auf (${o.x}|${o.y})`).toBe(true));
}
const alle = (t: TypId): TypId[] => Array<TypId>(11).fill(t);

describe('P7e H3: Titel nennt die tatsächlich geplante Größe', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  // Fehler, der ihn rot macht: Titel nennt immer die empfohlene Größe (heute „Wird auf 32er vergrößert“).
  for (const t of ['d40', 'd50'] as TypId[]) {
    const kurz = `${t.slice(1)}er`;
    it(`test_h3_alle_${kurz}_titel (rot bis P7e): alle 11 Felder von Hand auf ${kurz} → „Wird auf ${kurz} vergrößert“, Satz unverändert`, async () => {
      const { s, z } = gebautOffen();
      planen(s, alle(t));
      await echteSteuerung(s, (u) => {
        u.st.kontext(leitung(s, 8, 9).id);
        expect(kastenTeile(u)).toEqual(['Überlastet', `Wird auf ${kurz} vergrößert`, SATZ_GEPLANT]);
        expect(mit(u, 'Zurücknehmen'), 'kein [Zurücknehmen] ohne empfohlenen Ersatz (P7d bleibt)').toHaveLength(0);
      }, { uhr: () => z.t });
    });
  }

  // Fehler, der ihn rot macht: Titel nimmt die Größe des angetippten oder des ersten Felds statt „Wird vergrößert“.
  it('test_h3_gemischt_40_50 (rot bis P7e): 6 × 40er, 5 × 50er → „Wird vergrößert“, egal welches Feld angetippt ist', async () => {
    const { s, z } = gebautOffen();
    planen(s, [...alle('d40').slice(0, 6), ...alle('d50').slice(0, 5)]);
    await echteSteuerung(s, (u) => {
      for (const [x, y] of [[11, 9], [3, 7]] as const) {
        u.st.kontext(leitung(s, x, y).id);
        expect(kastenTeile(u), `angetippt (${x}|${y})`).toEqual(['Überlastet', 'Wird vergrößert', SATZ_GEPLANT]);
      }
    }, { uhr: () => z.t });
  });

  // „verschiedene Größen“ wörtlich: auch empfohlene 32er gemischt mit von Hand 40er. [Zurücknehmen] bleibt (P7d: ein Feld 32er).
  it('test_h3_gemischt_mit_empfohlen (rot bis P7e): 10 × 40er, 1 × 32er → „Wird vergrößert“, [Zurücknehmen] da', async () => {
    const { s, z } = gebautOffen();
    planen(s, [...alle('d40').slice(0, 10), 'd32']);
    await echteSteuerung(s, (u) => {
      u.st.kontext(leitung(s, 8, 9).id);
      expect(kastenTeile(u)).toEqual(['Überlastet', 'Wird vergrößert', SATZ_GEPLANT]);
      expect(mit(u, 'Zurücknehmen')).toHaveLength(1);
    }, { uhr: () => z.t });
  });

  it('test_h3_alle_empfohlen_bleibt: alle 11 Felder 32er → weiter „Wird auf 32er vergrößert“ mit [Zurücknehmen]', async () => {
    const { s, z } = gebautOffen();
    planen(s, alle('d32'));
    await echteSteuerung(s, (u) => {
      u.st.kontext(leitung(s, 8, 9).id);
      expect(kastenTeile(u)).toEqual(['Überlastet', 'Wird auf 32er vergrößert', SATZ_GEPLANT]);
      expect(mit(u, 'Zurücknehmen')).toHaveLength(1);
    }, { uhr: () => z.t });
  });
});

describe('P7e H4: kein [Ersatz zurücknehmen] neben [Zurücknehmen], wenn der Ersatz die empfohlene Größe hat', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  const ZEILE = (kurz: string): string => `Wird im Bauabschnitt durch eine ${kurz} ersetzt.`;

  // Fehler, der ihn rot macht: Zeile und Knopf je Feld bleiben (heute) – das Feld einzeln zurückzunehmen erzeugt eine Reduzierung.
  it('test_h4_empfohlen_ohne_feldknopf (rot bis P7e): alle 11 Felder 32er → weder Zeile noch [Ersatz zurücknehmen]', async () => {
    const { s, z } = gebautOffen();
    planen(s, alle('d32'));
    await echteSteuerung(s, (u) => {
      for (const [x, y] of [[8, 9], [3, 7]] as const) {
        u.st.kontext(leitung(s, x, y).id);
        expect(kastenTeile(u)[1], 'Vorprobe: Zustand geplant').toBe('Wird auf 32er vergrößert');
        expect(blattText(u), `(${x}|${y})`).not.toContain(ZEILE('32er'));
        expect(mit(u, 'Ersatz zurücknehmen'), `(${x}|${y})`).toHaveLength(0);
        expect(mit(u, 'Zurücknehmen'), 'das ganze Stück bleibt rücknehmbar').toHaveLength(1);
      }
    }, { uhr: () => z.t });
  });

  // Fehler, der ihn rot macht: Knopf je Feld pauschal weg, sobald das Stück geplant ist.
  it('test_h4_von_hand_bleibt: alle 11 Felder 40er → Zeile „… durch eine 40er ersetzt.“ und [Ersatz zurücknehmen] bleiben', async () => {
    const { s, z } = gebautOffen();
    planen(s, alle('d40'));
    await echteSteuerung(s, (u) => {
      u.st.kontext(leitung(s, 8, 9).id);
      expect(blattText(u)).toContain(ZEILE('40er'));
      expect(mit(u, 'Ersatz zurücknehmen')).toHaveLength(1);
    }, { uhr: () => z.t });
  });

  // Gemischt: Es zählt der Ersatz des angetippten Felds. (8|9) ist das 4. Feld von WEG.
  it('test_h4_gemischt_je_feld (rot bis P7e): (8|9) 32er, Rest 40er → auf (8|9) kein Feldknopf, auf (7|9) Feldknopf da', async () => {
    const { s, z } = gebautOffen();
    planen(s, WEG.map(([x, y]) => (x === 8 && y === 9 ? 'd32' : 'd40')));
    await echteSteuerung(s, (u) => {
      u.st.kontext(leitung(s, 8, 9).id);
      expect(blattText(u)).not.toContain(ZEILE('32er'));
      expect(mit(u, 'Ersatz zurücknehmen')).toHaveLength(0);
      u.st.kontext(leitung(s, 7, 9).id);
      expect(blattText(u)).toContain(ZEILE('40er'));
      expect(mit(u, 'Ersatz zurücknehmen')).toHaveLength(1);
    }, { uhr: () => z.t });
  });

  // H4 gilt nur im Zustand „geplant“: Solange noch Felder offen sind, gibt es kein [Zurücknehmen] fürs Stück – der Feldknopf bleibt.
  it('test_h4_nur_im_zustand_geplant: (8|9) 32er, übrige Felder offen → Zeile und [Ersatz zurücknehmen] bleiben', async () => {
    const { s, z } = gebautOffen();
    expect(s.ersatzPlanen(leitung(s, 8, 9).id, 'd32').ok).toBe(true);
    await echteSteuerung(s, (u) => {
      u.st.kontext(leitung(s, 8, 9).id);
      expect(kastenTeile(u)[1], 'Vorprobe: Zustand offen').toBe('Hier auf 32er vergrößern');
      expect(blattText(u)).toContain(ZEILE('32er'));
      expect(mit(u, 'Ersatz zurücknehmen')).toHaveLength(1);
    }, { uhr: () => z.t });
  });
});

// ================================================================= H5 + G7 – Bandpfeil
// Lage wie tests/nr20-p5g.test.ts (G7): Startdorf-Ausschnitt, Kamera 844×390 um (11|12). Spur (tests/nr21-kern.test.ts Kopf):
// Haupt (10|11),(10|12), Haus 1 (9|12), Haus 2 (10|13),(10|14),(11|14); Vorgänger: (10|11) ← Heizzentrale (11|11) (Osten,
// ENTSCHEIDUNGEN 2026-11-07), (9|12) ← Abzweig (10|12), (10|13) ← (10|12), (10|14) ← (10|13), (11|14) ← (10|14).
// Eckfeld = Richtung zum Vorgänger und zum Nachfolger nicht entgegengesetzt: (10|11), (9|12), (10|14). Gerade: (10|13), (11|14).
describe('P7e H5 / G7: Bandpfeil', () => {
  const objekte = [neu('hz', 11, 10), neu('efh', 9, 13), neu('efh', 12, 14)];
  const szene = (extra: Partial<Szene>): Szene => ({
    objekte, innen: [], netz: berechneNetz(objekte, [], 1), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
    verschiebe_id: null, stempel: null, jetzt_ms: 90_000, strassen: [], fluss: [], kw_anzeigen: false, ...extra,
  });
  function kamera(drehung_rad = 0): Kamera {
    const k = new Kamera();
    k.groesseSetzen(844, 390, 1);
    k.zentrieren(11, 12, 1);
    if (drehung_rad) k.drehenUm(drehung_rad);
    return k;
  }
  function bild(s: Szene, k: Kamera): string[] {
    const a = aufnahme(), m = new Maler(a.X);
    bodenEbeneEinrichten(null);
    zeichneSzene(m, k, s, new Effekte(), 0.016);
    return a.befehle;
  }
  type P = [number, number];
  function vielecke(b: string[]): P[][] {
    const r: P[][] = [];
    b.forEach((x, i) => {
      if (x !== 'beginPath()' || !b[i + 1]?.startsWith('moveTo(')) return;
      const p: P[] = [];
      let j = i + 1;
      for (; j < b.length; j++) {
        const t = /^(moveTo|lineTo)\(([^,]+),([^,]+)\)$/.exec(b[j]);
        if (t) p.push([Number(t[2]), Number(t[3])]); else break;
      }
      if (b[j] === 'closePath()' && b.slice(j, j + 8).includes('fill()') && p.length >= 3) r.push(p);
    });
    return r;
  }
  /** Der eine Pfeil auf dem Feld: neues gefülltes Dreieck nahe der Feldmitte */
  function pfeil(feld: P, richtung: P, k: Kamera): P[] {
    const leer = vielecke(bild(szene({}), k)).map((p) => JSON.stringify(p));
    const band: TutorialBandFeld[] = [{ x: feld[0], y: feld[1], typ: 'd25', aktiv: true, falsch: false, pfeil: richtung }];
    const [mx, my] = k.mitte(feld[0], feld[1]);
    const neue = vielecke(bild(szene({ tutorial_band: band }), k)).filter((p) => !leer.includes(JSON.stringify(p)));
    const r = neue.filter((p) => p.length === 3 && p.every(([x, y]) => Math.hypot(x - mx, y - my) < k.tw * 0.75));
    expect(r.length, `Vorprobe: genau ein Pfeil auf (${feld.join('|')})`).toBe(1);
    return r[0];
  }
  /** Spitze = Ecke am weitesten vom Schwerpunkt (G7-Kriterium); Halblänge = halbe Strecke Spitze → Mitte der Hinterkante,
   *  Halbbreite = halbe Hinterkante; Mitte = Mitte zwischen Spitze und Hinterkante. */
  function mass(p: P[]): { spitze: P; hinten: P[]; halblaenge: number; halbbreite: number; mitte: P } {
    const sx = (p[0][0] + p[1][0] + p[2][0]) / 3, sy = (p[0][1] + p[1][1] + p[2][1]) / 3;
    const d = p.map(([x, y]) => Math.hypot(x - sx, y - sy)), i = d.indexOf(Math.max(...d));
    const spitze = p[i], hinten = p.filter((_q, j) => j !== i);
    const hm: P = [(hinten[0][0] + hinten[1][0]) / 2, (hinten[0][1] + hinten[1][1]) / 2];
    return {
      spitze, hinten, halblaenge: Math.hypot(spitze[0] - hm[0], spitze[1] - hm[1]) / 2,
      halbbreite: Math.hypot(hinten[0][0] - hinten[1][0], hinten[0][1] - hinten[1][1]) / 2,
      mitte: [(spitze[0] + hm[0]) / 2, (spitze[1] + hm[1]) / 2],
    };
  }
  const FAELLE: Array<{ feld: P; pfeil: P; vor: P; ecke: boolean }> = [
    { feld: [10, 11], pfeil: [0, 1], vor: [11, 11], ecke: true },
    { feld: [9, 12], pfeil: [0, 1], vor: [10, 12], ecke: true },
    { feld: [10, 13], pfeil: [0, 1], vor: [10, 12], ecke: false },
    { feld: [10, 14], pfeil: [1, 0], vor: [10, 13], ecke: true },
    { feld: [11, 14], pfeil: [1, 0], vor: [10, 14], ecke: false },
  ];

  // Review P5g. Fehler, der ihn rot macht: Halblänge zurück auf 1,3 (oder 1) × Halbbreite – die Spitze wird mehrdeutig.
  for (const f of FAELLE) {
    it(`test_g7_pfeillaenge_1_8: (${f.feld.join('|')}) Halblänge = 1,8 × Halbbreite`, () => {
      const m = mass(pfeil(f.feld, f.pfeil, kamera()));
      expect(m.halblaenge / m.halbbreite).toBeCloseTo(1.8, 6);
    });
  }

  // Fehler, der ihn rot macht: keine Verschiebung (heute), Verschiebung auch auf geraden Feldern, falscher Betrag oder nach hinten.
  for (const drehung of [0, Math.PI / 2]) {
    for (const f of FAELLE) {
      const name = `${f.ecke ? 'Eckfeld' : 'gerades Feld'} (${f.feld.join('|')})${drehung ? ', Karte um 90° gedreht' : ''}`;
      it(`test_h5_pfeil_verschoben${f.ecke ? ' (rot bis P7e)' : ''}: ${name} → Pfeilmitte ${f.ecke ? '0,6 × Halblänge vor' : 'auf'} der Feldmitte`, () => {
        const k = kamera(drehung), m = mass(pfeil(f.feld, f.pfeil, k));
        const [ax, ay] = k.mitte(f.feld[0], f.feld[1]), [bx, by] = k.mitte(f.feld[0] + f.pfeil[0], f.feld[1] + f.pfeil[1]);
        const l = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / l, uy = (by - ay) / l;
        const weg = f.ecke ? 0.6 * m.halblaenge : 0;
        expect(m.mitte[0], 'x der Pfeilmitte').toBeCloseTo(ax + ux * weg, 6);
        expect(m.mitte[1], 'y der Pfeilmitte').toBeCloseTo(ay + uy * weg, 6);
      });
    }
  }

  /** Abstand eines Punkts zur Strecke a–c */
  function abstand([px, py]: P, [ax, ay]: P, [cx, cy]: P): number {
    const vx = cx - ax, vy = cy - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(px - ax - t * vx, py - ay - t * vy);
  }
  // Fehler, der ihn rot macht: Auf dem Eckfeld ragt die hintere Ecke aus dem Band (heute (10|14): Abstand 0,62 × b > b / 2).
  // Band = Weg Eingang (Kante zum Vorgänger) → Mitte → Ausgang (Kante zum Nachfolger), Breite b = max(12, round(tw × 0,28))
  // (tokens menue.mass_px geist_band_min / geist_band_faktor, DESIGN 13.17.4). Der Rand des Pfeils zählt nicht mit.
  for (const f of FAELLE) {
    it(`test_h5_pfeil_im_band${f.ecke ? ' (rot bis P7e)' : ''}: (${f.feld.join('|')}) alle Ecken höchstens b / 2 vom Bandweg`, () => {
      const k = kamera(), p = pfeil(f.feld, f.pfeil, k);
      const b = Math.max(tokens.menue.mass_px.geist_band_min, Math.round(k.tw * tokens.menue.mass_px.geist_band_faktor));
      expect(b, 'Vorprobe: Bandbreite ab 12 px').toBeGreaterThanOrEqual(12);
      const ein = k.mitte((f.feld[0] + f.vor[0]) / 2, (f.feld[1] + f.vor[1]) / 2), mitte = k.mitte(f.feld[0], f.feld[1]);
      const aus = k.mitte(f.feld[0] + f.pfeil[0] / 2, f.feld[1] + f.pfeil[1] / 2);
      for (const q of p) {
        const d = Math.min(abstand(q, ein, mitte), abstand(q, mitte, aus));
        expect(d, `Ecke (${q.map((v) => v.toFixed(1)).join('|')})`).toBeLessThanOrEqual(b / 2 + 1e-9);
      }
    });
  }
});

// ================================================================= Review P5g: stecker_blass_ids im Szenen-Schlüssel
describe('P7e: Szenen-Schlüssel kennt stecker_blass_ids', () => {
  const objekte = [neu('hz', 11, 10), neu('efh', 9, 13), neu('efh', 12, 14)];
  const netz = berechneNetz(objekte, [], 1); // ein Netz für alle Schlüssel: die Netznummer gehört zum Schlüssel
  const szene = (extra: Partial<Szene>): Szene => ({
    objekte, innen: [], netz, spiel: null, auswahl_id: null, modus: 'normal', geist: null,
    verschiebe_id: null, stempel: null, jetzt_ms: 90_000, strassen: [], fluss: [], kw_anzeigen: false,
    ziel: { stecker: [objekte[1].id, objekte[2].id], ring: objekte[1].id }, zielscheibe: [10, 12], ...extra,
  });
  // Fehler, der ihn rot macht: Schlüssel liest nur `stecker_blass` – wird der Stecker eines Hauses blass, kommt kein neues Bild.
  it('test_schluessel_stecker_blass_ids (rot bis P7e): Schlüssel ändert sich mit stecker_blass_ids, bei gleicher Liste gleich', () => {
    const ohne = szenenSchluessel(szene({}));
    const h1 = szenenSchluessel(szene({ stecker_blass_ids: [objekte[1].id] }));
    const h2 = szenenSchluessel(szene({ stecker_blass_ids: [objekte[2].id] }));
    expect(h1).not.toBe(ohne);
    expect(h2).not.toBe(h1);
    expect(szenenSchluessel(szene({ stecker_blass_ids: [objekte[1].id] }))).toBe(h1);
  });
});
