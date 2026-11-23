import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

// NR27 P3 (Bauplan docs/bauplaene/NR27-bahnquerung-entwurf.md, Abschnitt 6 P3): Bahnregeln im Kern.
// Erwartungswerte aus Konstanten und Texttabelle, keine eigenen Rechenwerte (Bauplan). Der Fachtext-Schalter wird nur hier im
// Test umgeschaltet (Nachtrag 3.1 Punkt 4): nordText wird durch die echte Funktion mit `freigegeben = schalter.frei` ersetzt.
const schalter = vi.hoisted(() => ({ frei: false }));
vi.mock('../src/core/nord-texte', async (orig) => {
  const echt = await orig<typeof import('../src/core/nord-texte')>();
  return { ...echt, nordText: (id: Parameters<typeof echt.nordText>[0], werte?: Record<string, string | number>, frei?: boolean) => echt.nordText(id, werte, frei ?? schalter.frei) };
});

import { KATALOG, KONSTANTEN, LEITUNGEN, type TypId } from '../src/core/katalog';
import { KARTE_OBEN_Y } from '../src/core/feld';
import { sperrgrund } from '../src/core/freischaltung';
import { neubauPlan, neubauStrassen } from '../src/core/neubaugebiet';
import { nordText, type NordTextId } from '../src/core/nord-texte';
import { BAHN_ZEILEN_Y, bahnFelder, NORD_PLAN, nordFluss, nordStrassen } from '../src/core/nordviertel';
import { ortHolen, STANDARD_ORT } from '../src/core/orte';
import { Spiel } from '../src/core/spiel';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { neuerSpielstand } from '../src/core/start';
import type { Spielstand } from '../src/core/typen';

const T0 = 1_000_000_000_000;
const N = KONSTANTEN.feldanzahl;
type Uhr = { t: number };
const t = (id: NordTextId, werte?: Record<string, string>): string => nordText(id, werte, true) as string;

/** Startdorf mit Heizzentrale auf `stufe`, viel Geld und Talern; Abschnitt offen, wenn `offen`. */
function spiel(stufe: number, uhr: Uhr, offen = true): Spiel {
  const s = neuerSpielstand(T0);
  s.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  s.geld_eur = 1_000_000; s.taler = 10_000;
  if (offen) s.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(s, () => uhr.t);
  sp.ereignisse.splice(0);
  return sp;
}
function vorstellen(sp: Spiel, uhr: Uhr, sek: number): void {
  for (let i = 0; i < Math.ceil(sek / 10); i++) { uhr.t += 10_000; sp.bis(uhr.t); }
}
/** Zeichnet (10|-1) … (10|-3), schließt ab und bestellt. */
function querungBestellen(sp: Spiel): void {
  for (const y of [-1, -2, -3]) expect(sp.platzieren('d40', 10, y), `(10|${y})`).toEqual({ ok: true });
  expect(sp.abschnittAbschliessen().ok).toBe(true);
  expect(sp.materialBestellen()).toEqual({ ok: true });
}
const hinweise = (sp: Spiel): string[] => sp.ereignisse.flatMap((e) => (e.art === 'hinweis' ? [e.text] : []));
const sprecher = (sp: Spiel) => sp.ereignisse.filter((e) => e.art === 'sprecher');

describe('NR27 P3 Platzieren auf und hinter der Bahn', () => {
  it('test_nr27_b_gesperrt_vor_stufe6', () => {
    const uhr = { t: T0 }, sp = spiel(5, uhr);
    const r = sp.platzieren('d90', 10, -2);
    expect(r).toEqual({ ok: false, hinweis: t('Q2', { sperrgrund: sperrgrund(sp.stand, 'bahnquerung')! }) });
    expect(r.hinweis).toContain('ab Heizzentrale Stufe 6');
    expect(sp.kannPlatzieren('d90', 10, -2)).toBe(false);
  });

  it('test_nr27_b_frei_ab_stufe6', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    expect(sp.kartenOben).toBe(KARTE_OBEN_Y);
    expect(sp.istBahn(10, -2)).toBe(true);
    expect(sp.istBahn(10, -1)).toBe(false);
    expect(sp.platzieren('d90', 10, -2)).toEqual({ ok: true });
    expect(sp.querungsFelder()).toEqual([-2 * 24 + 10]);
    expect(sp.querung_eur()).toBe(KONSTANTEN.querung_eur_je_feld);
  });

  it('test_nr27_e_nur_querungsstelle', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    expect(sp.platzieren('d40', 5, -2)).toEqual({ ok: false, hinweis: t('STELLE') });
    expect(sp.platzieren('d40', 19, -2)).toEqual({ ok: false, hinweis: t('BRUECKE') });
    expect(sp.kannPlatzieren('baum', 5, -2)).toBe(false);
    expect(sp.platzieren('baum', 5, -2)).toEqual({ ok: false, hinweis: t('GLEISE') });
    expect(sp.platzieren('d40', 10, -2).ok).toBe(true);
    expect(sp.platzieren('d40', 11, -2)).toEqual({ ok: false, hinweis: t('Q4') });
    expect(sp.platzieren('d40', 10, -2).ok).toBe(false);
    expect(sp.querungsFelder()).toEqual([-2 * 24 + 10]);
  });

  it('test_nr27_e_kein_weg_vorbei', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    expect(sp.platzieren('d40', 10, -4)).toEqual({ ok: false, hinweis: t('HINTER') });
    expect(sp.kannPlatzieren('solar', 5, -6)).toBe(false);
    querungBestellen(sp);
    expect(sp.kannPlatzieren('d40', 10, -4)).toBe(false);
    expect(sp.platzieren('baum', 3, -6)).toEqual({ ok: false, hinweis: t('Q5') });
  });

  it('obere Kartengrenze ist KARTE_OBEN_Y: (10|-1) und (3|-10) frei, (3|-11) nicht', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    expect(sp.kannPlatzieren('d40', 10, -1)).toBe(true);
    expect(sp.kannPlatzieren('d40', 0, -1)).toBe(true);
    sp.stand.nordviertel = true;
    expect(sp.kannPlatzieren('baum', 3, KARTE_OBEN_Y)).toBe(true);
    expect(sp.kannPlatzieren('baum', 3, KARTE_OBEN_Y - 1)).toBe(false);
    expect(sp.rohrVorschau(10, -1)).toBeNull(); // Nordfeld ohne Leitung: keine Vorschau, kein Absturz
  });
});

describe('NR27 P3 Preis und Bauzeit', () => {
  it('test_nr27_c_teurer', () => {
    expect(KONSTANTEN.querung_eur_je_feld).toBeGreaterThanOrEqual(4 * KONSTANTEN.bohrung_eur_je_feld);
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    for (const y of [-1, -2, -3]) sp.platzieren('d40', 10, y);
    const material = 3 * (KATALOG.d40.kosten_eur as number[])[0];
    // (10|-1) ist Grünstreifen, keine Straße → Gestattung; die Bahnfelder brauchen keine
    expect(sp.gestattungsFelder()).toEqual([-1 * N + 10]);
    expect(sp.abschnittKosten_eur()).toBe(material + 2 * KONSTANTEN.querung_eur_je_feld + KONSTANTEN.gestattung_eur_je_feld + sp.anbohrung_eur());
    const teuerste = Math.max(...LEITUNGEN.filter((l) => sp.freigeschaltet(l)).map((l) => (KATALOG[l].kosten_eur as number[])[0]));
    expect(2 * KONSTANTEN.querung_eur_je_feld + 3 * teuerste + KONSTANTEN.abschnitt_planung_eur).toBeLessThanOrEqual(KONSTANTEN.grundkasse_eur);
  });

  it('test_nr27_c_bauzeit', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    expect(sp.abschnittBau_s()).toBe(KONSTANTEN.abschnitt_bau_s);
    querungBestellen(sp);
    const a = sp.stand.abschnitt!;
    expect(a.mit_querung).toBe(true);
    expect(a.bau!.ende_ms - a.bau!.start_ms).toBe((KONSTANTEN.abschnitt_bau_s + KONSTANTEN.querung_bau_s) * KONSTANTEN.bauzeit_faktor * 1000);

    const ohne = spiel(6, uhr);
    ohne.platzieren('d40', 10, 1);
    ohne.abschnittAbschliessen(); ohne.materialBestellen();
    const b = ohne.stand.abschnitt!;
    expect(b.bau!.ende_ms - b.bau!.start_ms).toBe(KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor * 1000);
    expect('mit_querung' in b).toBe(false);
  });

  it('test_nr27_c_keine_abkuerzung', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    querungBestellen(sp);
    const geld = sp.stand.geld_eur, taler = sp.stand.taler, ende = sp.stand.abschnitt!.bau!.ende_ms;
    expect(sp.expressLiefern()).toEqual({ ok: false, hinweis: t('EXPRESS') });
    expect(sp.beschleunigen(sp.stand.abschnitt!.bau)).toEqual({ ok: false, hinweis: t('EXPRESS') });
    expect([sp.stand.geld_eur, sp.stand.taler, sp.stand.abschnitt!.bau!.ende_ms]).toEqual([geld, taler, ende]);
    expect(sp.stand.abschnitt!.express).toBeUndefined();
  });

  it('Randfall: Neuladen während Querung im Bau – mit_querung bleibt, Abkürzungen bleiben gesperrt', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    querungBestellen(sp);
    const { befund, stand } = ladenMitBefund(serialisieren(sp.stand), uhr.t);
    expect(befund).toBe('ok');
    const neu = new Spiel(stand, () => uhr.t);
    expect(neu.stand.abschnitt!.mit_querung).toBe(true);
    expect(neu.expressLiefern().hinweis).toBe(t('EXPRESS'));
    expect(neu.beschleunigen(neu.stand.abschnitt!.bau).hinweis).toBe(t('EXPRESS'));
  });

  it('Randfall: Kasse reicht nicht → übliche Meldung, nichts bestellt', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    for (const y of [-1, -2, -3]) sp.platzieren('d40', 10, y);
    sp.abschnittAbschliessen();
    sp.stand.geld_eur = 1000;
    const r = sp.materialBestellen();
    expect(r.ok).toBe(false);
    expect(r.hinweis).toMatch(/^Es fehlen /);
    expect(sp.stand.abschnitt!.phase).toBe('bestellen');
    expect(sp.stand.abschnitt!.mit_querung).toBeUndefined();
  });

  it('test_nr27_ersatz_unter_bahn', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    querungBestellen(sp);
    vorstellen(sp, uhr, (KONSTANTEN.abschnitt_bau_s + KONSTANTEN.querung_bau_s) * KONSTANTEN.bauzeit_faktor + 10);
    const rohr = sp.stand.objekte.find((o) => o.x === 10 && o.y === -2)!;
    const neben = sp.stand.objekte.find((o) => o.x === 10 && o.y === -1)!;
    const ohneAufpreis = sp.ersatzPreis_eur(neben, 'd50');
    expect(sp.ersatzPreis_eur(rohr, 'd50')).toBe(ohneAufpreis + KONSTANTEN.querung_eur_je_feld);
    sp.abschnittPlanen(); vorstellen(sp, uhr, KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(sp.abschnittBau_s()).toBe(KONSTANTEN.abschnitt_bau_s);
    expect(sp.ersatzPlanen(rohr.id, 'd50').ok).toBe(true);
    expect(sp.abschnittBau_s()).toBe(KONSTANTEN.abschnitt_bau_s + KONSTANTEN.querung_bau_s);
    expect(sp.querungsFelder()).toEqual([]);
  });
});

describe('NR27 P3 Wissenstext beim ersten Bahnfeld', () => {
  it('test_nr27_d_wissenstext_ohne_freigabe', () => {
    schalter.frei = false;
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    sp.platzieren('d40', 10, -2);
    expect(sprecher(sp)).toEqual([]);
  });

  it('test_nr27_d_wissenstext_mit_freigabe', () => {
    schalter.frei = true;
    try {
      const uhr = { t: T0 }, sp = spiel(6, uhr);
      sp.platzieren('d40', 10, -1);
      expect(sprecher(sp)).toEqual([]);
      sp.platzieren('d40', 10, -2);
      expect(sprecher(sp)).toEqual([{ art: 'sprecher', figur: 'Philipp', text: `${t('WISSEN_A')} ${t('WISSEN_B')}` }]);
      sp.ereignisse.splice(0);
      sp.platzieren('d40', 10, -3);
      expect(sprecher(sp)).toEqual([]);
    } finally { schalter.frei = false; }
  });
});

describe('NR27 P3 Erschließen und alte Stände', () => {
  it('test_nr27_f_erschliessen', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    querungBestellen(sp);
    sp.ereignisse.splice(0);
    vorstellen(sp, uhr, (KONSTANTEN.abschnitt_bau_s + KONSTANTEN.querung_bau_s) * KONSTANTEN.bauzeit_faktor + 10);
    expect(sp.stand.nordviertel).toBe(true);
    const nord = sp.stand.objekte.filter((o) => o.y <= -4);
    expect(nord).toHaveLength(14);
    expect(nord.every((o) => o.y <= -5 && o.ohne_station && o.bestand)).toBe(true);
    expect(hinweise(sp)).toContain(t('F1'));
    // Randfall: Querung gebaut, nicht angeschlossen → Häuser kalt, kein Fehler
    expect(nord.every((o) => !sp.netz.anschluss.has(o.id))).toBe(true);
    sp.abschnittPlanen(); vorstellen(sp, uhr, KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(sp.platzieren('d40', 10, -4)).toEqual({ ok: true });
    const { stand } = ladenMitBefund(serialisieren(sp.stand), uhr.t);
    const neu = new Spiel(stand, () => uhr.t);
    expect(neu.stand.objekte.filter((o) => o.y <= -5)).toHaveLength(14);
  });

  it('Randfall: Querungs-Leitung später entfernt → Häuser und Merker bleiben, Häuser getrennt', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    querungBestellen(sp);
    vorstellen(sp, uhr, (KONSTANTEN.abschnitt_bau_s + KONSTANTEN.querung_bau_s) * KONSTANTEN.bauzeit_faktor + 10);
    sp.stand.objekte = sp.stand.objekte.filter((o) => !(o.x === 10 && o.y === -2));
    const neu = new Spiel(sp.stand, () => uhr.t);
    expect(neu.stand.nordviertel).toBe(true);
    expect(neu.stand.objekte.filter((o) => o.y <= -5)).toHaveLength(14);
  });

  it.each(['altstand-stufe6-layout3.json', 'altstand-mitten-im-bau.json'])('test_nr27_g_alter_stand %s', (datei) => {
    const text = readFileSync(new URL(`./referenz/nr27/${datei}`, import.meta.url), 'utf8');
    const roh = JSON.parse(text) as Spielstand;
    const { befund, stand } = ladenMitBefund(text, roh.zuletzt_ms);
    expect(befund).toBe('ok');
    const sp = new Spiel(stand, () => roh.zuletzt_ms);
    expect(sp.stand.objekte).toEqual(roh.objekte);
    expect(sp.stand.gestattungen).toEqual(roh.gestattungen);
    expect(sp.stand.neubau_strassenluecken).toEqual(roh.neubau_strassenluecken);
    expect(sp.stand.objekte.some((o) => o.y < 0)).toBe(false);
    expect(sp.kartenOben).toBe(-10);
    expect(sp.stand.nordviertel).toBeUndefined();
    if (roh.abschnitt) {
      expect(sp.stand.abschnitt!.bau).toEqual(roh.abschnitt.bau);
      expect(sp.stand.abschnitt!.mit_querung).toBeUndefined();
      expect(sp.abschnittBau_s()).toBe(KONSTANTEN.abschnitt_bau_s);
    }
  });
});

describe('NR27 P3 Leitungsgrenze und Balance', () => {
  it('test_nr27_leitungsgrenze_stufe6', () => {
    const uhr = { t: T0 };
    expect(spiel(6, uhr).grenze('d25')).toBe(360);
    expect(spiel(5, uhr).grenze('d25')).toBe(240);
    for (const l of LEITUNGEN) expect(KATALOG[l].grenze![5], l).toBe(360);
    const sp = spiel(6, uhr);
    for (let i = 0; i < 360; i++) sp.stand.objekte.push({ id: sp.stand.naechste_id++, typ: 'd25', x: 0, y: 100 + i, stufe: 1, bau: null, kasse_eur: 0 });
    const r = sp.platzieren('d25', 10, 1);
    expect(r).toEqual({ ok: false, hinweis: 'Mehr Leitungen gehen nicht – die Heizzentrale hat schon die höchste Stufe' });
    const fuenf = spiel(5, uhr);
    for (let i = 0; i < 240; i++) fuenf.stand.objekte.push({ id: fuenf.stand.naechste_id++, typ: 'd25', x: 0, y: 100 + i, stufe: 1, bau: null, kasse_eur: 0 });
    expect(fuenf.platzieren('d25', 10, 1).hinweis).toBe('Mehr Leitungen ab der nächsten Heizzentralen-Stufe');
  });

  it('Meldung bei Höchststufe auch für andere Typen ohne „nächste Stufe“', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr, false);
    const typ: TypId = 'baum';
    const frei = KATALOG[typ].grenze![4];
    for (let i = 0; i < frei; i++) sp.stand.objekte.push({ id: sp.stand.naechste_id++, typ, x: 0, y: 100 + i, stufe: 1, bau: null, kasse_eur: 0 });
    expect(sp.platzieren(typ, 10, 1).hinweis).toBe(`Mehr ${KATALOG[typ].name} gehen nicht – die Heizzentrale hat schon die höchste Stufe`);
  });

  it('test_nr27_balance_leitungen', () => {
    const dorf = ortHolen(STANDARD_ORT);
    const strassen = new Set([...dorf.strassen, ...neubauStrassen(3), ...nordStrassen()].map(([x, y]) => `${x}|${y}`)).size;
    const haeuser = dorf.haeuser.length + neubauPlan(3).length + NORD_PLAN.length;
    const obergrenze = strassen + haeuser + BAHN_ZEILEN_Y.length;
    expect(obergrenze).toBeLessThanOrEqual(360);
    expect(360).toBeLessThanOrEqual(1.25 * obergrenze);
  });

  it('test_nr27_konsistenz', () => {
    for (const [x, y] of [...bahnFelder(), ...nordStrassen(), ...nordFluss(), ...NORD_PLAN.map((h): [number, number] => [h.x, h.y])]) {
      expect(y, `${x}|${y}`).toBeGreaterThanOrEqual(KARTE_OBEN_Y);
      expect(y, `${x}|${y}`).toBeLessThan(0);
    }
  });
});
