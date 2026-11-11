import { describe, expect, it } from 'vitest';
import tokens from '../design/tokens.json';
import { KATALOG } from '../src/core/katalog';
import { groesse } from '../src/core/netz';
import { Spiel } from '../src/core/spiel';
import {
  ERSTE_HAEUSER, TUTORIAL_ABZWEIG, TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT, TUTORIAL_HAUPTLEITUNG,
  neuesSpielMitTutorial,
} from '../src/core/start';
import { Tutorial } from '../src/core/tutorial';
import type { Objekt } from '../src/core/typen';

// Bauplan docs/bauplaene/NR20-22.md Fassung 2.2, Paket P0 (Vertrag): Spur-Konstanten nach E1, Tokens nach DESIGN 13.17.4,
// dazu die Leerwerte, die P0 setzt und die auch nach P1/P2 so bleiben (kw_summe; Ansicht außerhalb von Kapitel 3).
const T0 = 1_000_000;

type Feld = readonly [number, number];
const nebeneinander = (a: Feld, b: Feld): boolean => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
/** Feld liegt waagrecht/senkrecht neben einem Objekt (Objekte können größer als ein Feld sein, z. B. die Heizzentrale 2×2). */
const nebenObjekt = (f: Feld, o: Objekt): boolean => {
  const n = groesse(o);
  const felder: Feld[] = [];
  for (let dx = 0; dx < n; dx++) for (let dy = 0; dy < n; dy++) felder.push([o.x + dx, o.y + dy]);
  return felder.some((g) => nebeneinander(f, g));
};

function tutorialSpiel(): Spiel {
  const s = new Spiel(neuesSpielMitTutorial(T0), () => T0);
  s.namenSetzen('Anna', 'Heatville');
  return s;
}
const hausBei = (s: Spiel, [x, y]: Feld): Objekt => {
  const h = s.stand.objekte.find((o) => o.x === x && o.y === y && KATALOG[o.typ].kategorie === 'haus');
  if (!h) throw new Error(`kein Haus bei (${x}|${y})`);
  return h;
};

describe('NR21 Vertrag (P0)', () => {
  it('test_nr21_spur_konstanten: Felder wie E1, Abzweig = letztes Feld der Hauptleitung, jedes Anschlussstück endet an seinem Haus', () => {
    // E1: Hauptleitung 32er (10|11) → (10|12); Haus 1 (9|12) → (9|13); Haus 2 (10|13) → (10|14) → (11|14) → (12|14).
    expect(TUTORIAL_HAUPTLEITUNG).toBe('d32');
    expect(TUTORIAL_HAUPT).toEqual([[10, 11], [10, 12]]);
    expect(TUTORIAL_ANSCHLUSS_1).toEqual([[9, 12]]);
    expect(TUTORIAL_ANSCHLUSS_2).toEqual([[10, 13], [10, 14], [11, 14]]);
    expect(TUTORIAL_ABZWEIG).toEqual([10, 12]);
    expect(TUTORIAL_ABZWEIG).toEqual(TUTORIAL_HAUPT[TUTORIAL_HAUPT.length - 1]);
    expect(ERSTE_HAEUSER).toEqual([[9, 13], [12, 14]]);

    const s = tutorialSpiel();
    const hz = s.stand.objekte.find((o) => o.typ === 'hz')!;
    const [h1, h2] = ERSTE_HAEUSER.map((k) => hausBei(s, k));
    // Zugrichtung: Hauptleitung beginnt an der Heizzentrale, jedes Stück ist lückenlos.
    expect(nebenObjekt(TUTORIAL_HAUPT[0], hz)).toBe(true);
    for (const stueck of [TUTORIAL_HAUPT, TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2]) {
      for (let i = 1; i < stueck.length; i++) expect(nebeneinander(stueck[i - 1], stueck[i])).toBe(true);
    }
    // Jedes Anschlussstück beginnt neben dem Abzweig und endet neben „seinem“ Haus, nicht neben dem anderen.
    expect(nebeneinander(TUTORIAL_ANSCHLUSS_1[0], TUTORIAL_ABZWEIG)).toBe(true);
    expect(nebeneinander(TUTORIAL_ANSCHLUSS_2[0], TUTORIAL_ABZWEIG)).toBe(true);
    const ende1 = TUTORIAL_ANSCHLUSS_1[TUTORIAL_ANSCHLUSS_1.length - 1];
    const ende2 = TUTORIAL_ANSCHLUSS_2[TUTORIAL_ANSCHLUSS_2.length - 1];
    expect(nebenObjekt(ende1, h1)).toBe(true);
    expect(nebenObjekt(ende1, h2)).toBe(false);
    expect(nebenObjekt(ende2, h2)).toBe(true);
    expect(nebenObjekt(ende2, h1)).toBe(false);
  });

  it('test_nr22_tokens_da: alle Tokens aus DESIGN 13.17.4 mit den Werten der Tabelle', () => {
    const m = tokens.menue;
    expect(m.farbe.schleier_leicht).toBe('rgba(28,14,4,.30)');
    expect(m.farbe.ueberlast_zeichen).toBe('#ffc531');
    expect(m.farbe.ueberlast_zeichen).toBe(m.knopf.geld[0]);
    expect(m.farbe.ziel).toBe('#ffe08a');
    expect(m.farbe.ziel).toBe(m.farbe.fokus_auf_dunkel);
    expect(m.mass_px).toMatchObject({
      geist_band_faktor: 0.28, geist_band_min: 12, geist_rand_hell: 1.5, geist_rand_dunkel: 1.5, gang_rand: 12,
      anleiter_kompakt_hoehe: 92, anleiter_kompakt_zeichen: 96, druckpunkt: 10,
    });
    expect(m.faktor).toMatchObject({ geist_deckkraft: 0.75, geist_ruhend: 0.35, naechstes_feld: 0.92 });
    expect(m.zeit_ms).toMatchObject({ finger_je_feld: 400, finger_aufdruecken: 200, finger_wieder: 4000 });
    expect(tokens.karte.ueberlast).toEqual({
      zeichen_faktor: 0.34, zeichen_min: 16, zeichen_max: 28, pfosten_faktor: 0.18, saum_px: 1, // saum_px 1 seit DESIGN 13.17.11 H1 (Tester P7e)
      wiederholen_felder: 8, abstand_ende_min: 4, geplant_deckkraft: 0.5,
    });
    expect(tokens.karte.fremd).toEqual({
      dunkel: '#3b1d0a', hell: '#fff4df', streifen_px: 5, winkel_grad: 45, huelle_zusatz_px: 12, rand_px: 1.5, deckkraft: 0.85,
    });
    expect(tokens.karte.fremd.dunkel).toBe(m.farbe.kontur);
    expect(tokens.karte.fremd.hell).toBe(m.farbe.tafel);
  });

  it('test_nr21_werte_kw_summe: kw_summe = Puffer-Bedarf Haus 1 + Haus 2 (2 × 7,5 kW = 15 kW; EFH 18.000 kWh → 2 × 9 kW)', () => {
    const s = tutorialSpiel();
    expect(s.tutorialWerte().kw_summe).toBe(15);
    const efh = KATALOG.efh as unknown as Record<string, unknown>;
    const alt = efh.verbrauch_kwh_a;
    efh.verbrauch_kwh_a = 18_000;
    try { expect(s.tutorialWerte().kw_summe).toBeCloseTo(18, 6); } finally { efh.verbrauch_kwh_a = alt; }
  });

  it('test_nr21_ansicht_leerwerte: außerhalb von Kapitel 3 (T01) sind alle neuen Ansicht-Felder leer bzw. aus', () => {
    const a = new Tutorial(tutorialSpiel()).ansicht(T0);
    expect(a?.schritt).toBe('T01');
    expect(a).toMatchObject({
      band: [], naechstes_feld: null, zielscheibe: null, finger_weg: [], fremd: [], ziel_stecker: [], ziel_ring: null,
      erreicht_ids: [], farbknopf_ring: null, zeichenleiste: null, zeichnen_ruht: false, kompakt: false, ruhe: false,
    });
  });
});
