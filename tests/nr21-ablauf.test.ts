import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { laden, serialisieren } from '../src/core/speichern';
import { ERSTE_HAEUSER } from '../src/core/start';
import { echteSteuerung } from './hilfen/echte-steuerung';
import {
  ZUG_HAUS1, ZUG_HAUS2, abT14Bauen, abheben, bisT12, bisT13, bisT13h, farbknopf, hausBei, kameraLage, knopfMitId, knopfRechteck,
  neuesSpiel, ringMitten, schritt, st, weiterTippen, wischeFelder, zielEl, type U,
} from './hilfen/tutorial-zug';

// Bauplan NR20-22 P5, Testliste tests/nr21-ablauf.test.ts (1)–(12): Abläufe im Tutorial mit der echten Steuerung (echte
// Gesten auf der Leinwand, echte Knöpfe). Sätze stehen wörtlich in src/core/tutorial.ts (Bauplan E8); Platzhalter von Hand
// eingesetzt mit den Tutorial-Werten (32er Hauptleitung, 25er Hausanschluss, Puffer-Bedarf je Haus).

const typAuf = (spiel: Spiel, [x, y]: readonly [number, number]): string | undefined =>
  spiel.stand.objekte.find((o) => o.x === x && o.y === y && (o.typ === 'd25' || o.typ === 'd32' || o.typ === 'd40'))?.typ;
const text = (u: U): string => st(u).anleitungAnsicht()!.text;
const ZWISCHENSTAND = 'Das erste Haus hat seinen Hausanschluss. Jetzt zieh die 25er zum zweiten Haus.';
// {kw_summe} 15 kW = 2 × 7,5 kW Puffer-Bedarf je Einfamilienhaus (Bauplan E2: Summe beider Häuser), {anschluss} = 25er
// Zahl und Einheit trennt ein geschütztes Leerzeichen (src/core/tutorial.ts, Zahlformat der Tutorial-Texte)
const ERKLAERSATZ = 'Bis hier fließen 15\u00a0kW für beide Häuser, ab hier **je Haus nur** 7,5\u00a0kW. Dafür reicht die 25er.';

/** Nach jeder Geste ein Bild: merkt Schritt und Text, damit „nie zu dünn, nie zurück nach T13“ über den ganzen Ablauf gilt. */
function protokoll(u: U, uhr: { t: number }) {
  const gesehen: Array<{ schritt: string | undefined; text: string; zu_duenn: boolean }> = [];
  const bild = (): void => {
    st(u).tick(uhr.t);
    const a = st(u).anleitungAnsicht();
    if (a) gesehen.push({ schritt: a.schritt, text: a.text, zu_duenn: a.text.includes('randvoll') });
  };
  return { gesehen, bild };
}

describe('NR21 Ablauf: zu weit gezogen, falsch dick (B3, E4)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr21_zu_weit_gezogen_finger_folgen (2): 32er (10|11)→(10|13), T13w erst nach dem Abheben, dann dem Finger folgen ab (10|13) → (10|13) wird 25er, T14 ohne „zu dünn“', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const p = protokoll(u, uhr);
      wischeFelder(u, [[10, 11], [10, 12], [10, 13]], false); p.bild();
      expect(schritt(u), 'bis zum Abheben').toBe('T13');
      abheben(u, [10, 13]); p.bild();
      expect(schritt(u)).toBe('T13w');
      expect(typAuf(spiel, [10, 13])).toBe('d32');
      expect(text(u), 'Erklärsatz als Grundtext').toBe(ERKLAERSATZ);
      farbknopf(u, 'd25').click(); p.bild();
      expect(schritt(u)).toBe('T13h');
      wischeFelder(u, ZUG_HAUS1); p.bild();
      expect(text(u)).toBe(ZWISCHENSTAND);
      wischeFelder(u, [[10, 13], [10, 14], [11, 14], ERSTE_HAEUSER[1]]); p.bild();
      expect(typAuf(spiel, [10, 13])).toBe('d25');
      const lg = spiel.tutorialLeitungen();
      expect([lg.haus1_ok, lg.haus2_ok]).toEqual([true, true]);
      expect(schritt(u)).toBe('T14');
      expect(p.gesehen.filter((g) => g.zu_duenn)).toEqual([]);
    }, { uhr: () => uhr.t });
  });

  it('test_nr21_zu_weit_gezogen_am_abzweig (3): wie (2), aber der Zug zu Haus 2 beginnt auf dem Abzweig (10|12) → (10|12) bleibt 32er, T14', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      const p = protokoll(u, uhr);
      wischeFelder(u, [[10, 11], [10, 12], [10, 13]]); p.bild();
      expect(schritt(u)).toBe('T13w');
      farbknopf(u, 'd25').click(); p.bild();
      wischeFelder(u, ZUG_HAUS1); p.bild();
      wischeFelder(u, [[10, 12], [10, 13], [10, 14], [11, 14], ERSTE_HAEUSER[1]]); p.bild();
      expect(typAuf(spiel, [10, 12])).toBe('d32');
      expect(typAuf(spiel, [10, 13])).toBe('d25');
      expect(schritt(u)).toBe('T14');
      expect(p.gesehen.filter((g) => g.zu_duenn)).toEqual([]);
    }, { uhr: () => uhr.t });
  });

  it('test_nr21_falsch_dickes_9_12 (4): (9|12) als 32er, dann Zug ab (9|12) aufs Haus 1 mit der 25er → (9|12) wird 25er (E4 Regel 1: falsch im Band)', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13(u, spiel, uhr);
      wischeFelder(u, [[10, 11], [10, 12]]); st(u).tick(uhr.t);
      // noch mit der 32er in T13w ruht das Zeichnen – also (9|12) nach dem Farbknopf mit der 32er aus der Leiste
      farbknopf(u, 'd25').click(); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T13h');
      farbknopf(u, 'd32').click(); st(u).tick(uhr.t);
      wischeFelder(u, [[9, 12]]); st(u).tick(uhr.t);
      expect(typAuf(spiel, [9, 12])).toBe('d32');
      const band = st(u).anleitungAnsicht()!.band.find((f) => f.x === 9 && f.y === 12);
      expect(band?.falsch, '(9|12) steht im Band als falsch').toBe(true);
      farbknopf(u, 'd25').click(); st(u).tick(uhr.t);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      expect(typAuf(spiel, [9, 12])).toBe('d25');
      expect(st(u).anleitungAnsicht()!.erreicht_ids).toEqual([hausBei(spiel, ERSTE_HAEUSER[0]).id]);
    }, { uhr: () => uhr.t });
  });
});

const SATZ_EIGENER_ABGANG = 'Nimm das gestreifte Stück mit Zurück oder Radierer weg. Zieh die 25er von der Abzweigung.';
const KURZ_WEG = 'Stück muss weg';
const FREMD_12: Array<[number, number]> = [[12, 13], [12, 12]];
const abschliessenText = (u: U): string => zielEl(u, 'abschliessen')?.textContent ?? '';

/** Netz nach dem Bau: beide Tutorial-Häuser warm, nichts kalt, keine Überlast, keine Planungsfehler (Abnahme 1.2). */
function nachDemBau(spiel: Spiel): void {
  const n = spiel.netz, [h1, h2] = ERSTE_HAEUSER.map((k) => hausBei(spiel, k));
  expect([n.warm.has(h1.id), n.warm.has(h2.id)]).toEqual([true, true]);
  expect([...n.kalt]).toEqual([]);
  expect([...n.kapazitaet_ok.values()].every(Boolean), 'keine Überlast').toBe(true);
  expect({ reduzierung: [...n.reduzierung], aufteilung: [...n.aufteilung], engpass: [...n.engpass] }).toEqual({ reduzierung: [], aufteilung: [], engpass: [] });
}

/** Stand aus einer ersten Steuerung speichern und in eine zweite laden – wie Neuladen im Browser (main.ts). */
function neuGeladen(spiel: Spiel, uhr: { t: number }): Spiel {
  const text = serialisieren(spiel.stand);
  uhr.t += 1_000;
  const neu = new Spiel(laden(text, uhr.t), () => uhr.t);
  neu.bis(uhr.t);
  return neu;
}
/** Erste Blase nach dem Neuladen ist der Wiedereinstieg; [Weiter] führt in den Schritt. */
function wiedereinstiegWeiter(u: U, uhr: { t: number }): void {
  st(u).tick(uhr.t);
  expect(st(u).anleitungAnsicht()?.wiedereinstieg).toBe(true);
  weiterTippen(u);
  vi.advanceTimersByTime(2_000); st(u).tick(uhr.t);
}

describe('NR21 Ablauf: Klickweg, Neuladen, T14 erst beim Abheben', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr21_klickweg_e1 (1): T01–T26 auf der Spur E1 → 32er bis zum Abzweig, je ein eigenes 25er-Stück, nach dem Bau warm ohne Überlast und Planungsfehler (Abnahme 1.2)', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, ZUG_HAUS2); st(u).tick(uhr.t);
      abT14Bauen(u, spiel, uhr);
      for (const id of ['T24', 'T25', 'T26']) { st(u).tick(uhr.t); expect(schritt(u)).toBe(id); weiterTippen(u); }
      st(u).tick(uhr.t);
      expect(st(u).anleitungAnsicht()).toBeNull();
      const leitungen = spiel.stand.objekte.filter((o) => o.typ === 'd25' || o.typ === 'd32' || o.typ === 'd40').map((o) => `${o.typ}@${o.x}|${o.y}`).sort();
      expect(leitungen).toEqual(['d25@10|13', 'd25@10|14', 'd25@11|14', 'd25@9|12', 'd32@10|11', 'd32@10|12']);
      nachDemBau(spiel);
    }, { uhr: () => uhr.t });
  });

  for (const ziel of ['T12', 'T13', 'T13w', 'T13h', 'T14'] as const) {
    it(`test_nr21_neuladen_ziel_erreichbar (5): Neuladen in ${ziel} → Leiste offen in der verlangten Größe, jedes Bedien-Ziel im Dokument`, async () => {
      const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
      await echteSteuerung(spiel, (u) => {
        if (ziel === 'T12') bisT12(u, spiel, uhr);
        else if (ziel === 'T13') { bisT13(u, spiel, uhr); wischeFelder(u, [[10, 11]]); st(u).tick(uhr.t); }
        else if (ziel === 'T13w') { bisT13(u, spiel, uhr); wischeFelder(u, [[10, 11], [10, 12]]); st(u).tick(uhr.t); }
        else { bisT13h(u, spiel, uhr); wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t); if (ziel === 'T14') { wischeFelder(u, ZUG_HAUS2); st(u).tick(uhr.t); } }
        expect(schritt(u)).toBe(ziel);
      }, { uhr: () => uhr.t });
      const neu = neuGeladen(spiel, uhr);
      vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); // die erste Steuerung hat die globalen Attrappen abgeräumt
      await echteSteuerung(neu, (u) => {
        wiedereinstiegWeiter(u, uhr);
        const a = st(u).anleitungAnsicht()!;
        if (a.zeichenleiste) {
          expect(zielEl(u, 'zeichenleiste'), `${a.schritt}: Zeichenleiste offen`).not.toBeNull();
          expect(farbknopf(u, a.zeichenleiste.typ).getAttribute('aria-pressed'), `${a.schritt}: ${a.zeichenleiste.typ} gewählt`).toBe('true');
        }
        for (const z of a.ziele.filter((z) => !['heizzentrale', 'haus1', 'haus2', 'leitungsstueck'].includes(z))) {
          expect(zielEl(u, z, z === 'leitungskarte' ? a.leitung_typ : undefined), `${a.schritt}: Ziel ${z} im Dokument`).not.toBeNull();
        }
        expect(a.zeichenleiste !== null || a.ziele.length > 0, `${a.schritt} hat ein Ziel`).toBe(true);
      }, { uhr: () => uhr.t });
    });
  }

  it('test_nr21_t14_erst_nach_abheben (12): der Zug, der Haus 2 als letztes anschließt, bleibt bis zum Abheben in T13h, danach T14', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, ZUG_HAUS2, false); st(u).tick(uhr.t);
      expect(spiel.tutorialLeitungen().haus2_ok, 'Haus 2 schon angeschlossen').toBe(true);
      expect(schritt(u)).toBe('T13h');
      abheben(u, ERSTE_HAEUSER[1]); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T14');
    }, { uhr: () => uhr.t });
  });
});

describe('NR21 Ablauf: Haus 2 zuerst und eigener Abgang (DESIGN 13.17.8)', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr21_haus2_zuerst_ohne_zu_duenn (6): (10|13) aufs Haus 1, dann die Spur zu Haus 2, dann (9|12) → T14 ohne „randvoll“, ohne Rücksprung nach T13; nach dem Bau keine Planungsfehler', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      const p = protokoll(u, uhr), [h1, h2] = ERSTE_HAEUSER.map((k) => hausBei(spiel, k));
      const ohneZuDuenn = (): void => { expect(spiel.tutorialLeitungen().haupt_zu_duenn).toBe(false); };
      wischeFelder(u, [[10, 13], ERSTE_HAEUSER[0]]); p.bild(); ohneZuDuenn();
      expect(text(u)).toBe(ZWISCHENSTAND);
      wischeFelder(u, ZUG_HAUS2); p.bild(); ohneZuDuenn();
      const lg = spiel.tutorialLeitungen();
      expect([lg.haus1_ok, lg.haus2_ok]).toEqual([false, true]);
      const sz = st(u).szene();
      expect(sz.ziel).toEqual({ stecker: [h1.id, h2.id], ring: h1.id });
      expect(sz.erreicht?.map((e) => e.id)).toEqual([h2.id]);
      expect(sz.naechstes_feld).toEqual([9, 12]);
      wischeFelder(u, ZUG_HAUS1); p.bild(); ohneZuDuenn();
      expect([spiel.tutorialLeitungen().haus1_ok, spiel.tutorialLeitungen().haus2_ok]).toEqual([true, true]);
      expect(schritt(u)).toBe('T14');
      expect(p.gesehen.filter((g) => g.zu_duenn || g.schritt === 'T13')).toEqual([]);
      abT14Bauen(u, spiel, uhr);
      nachDemBau(spiel);
    }, { uhr: () => uhr.t });
  });

  it('test_nr21_eigener_abgang_zurueck_zum_abzweig (7): (12|12)→(12|13) → Satz, Streifen, Zielscheibe, Ring Haus 2 und [Zurück], Abschließen gesperrt; [Zurück] → Zwischenstand; Spur zu Haus 2 → T14; Bau → warm', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      const h2 = hausBei(spiel, ERSTE_HAEUSER[1]);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, [[12, 12], [12, 13]]); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T13h');
      expect(text(u)).toBe(SATZ_EIGENER_ABGANG);
      const sz = st(u).szene();
      expect(sz.tutorial_fremd).toEqual(FREMD_12);
      expect(sz.zielscheibe).toEqual([10, 12]);
      expect(sz.ziel?.ring).toBe(h2.id);
      knopfRechteck(knopfMitId(u, 'zurueck')!, 600, 300); st(u).tick(uhr.t);
      expect(ringMitten(u)).toContainEqual([622, 322]);
      expect(abschliessenText(u)).toContain(KURZ_WEG);
      knopfMitId(u, 'zurueck')!.click(); st(u).tick(uhr.t);
      expect(st(u).szene().tutorial_fremd ?? []).toEqual([]);
      expect(text(u)).toBe(ZWISCHENSTAND);
      wischeFelder(u, ZUG_HAUS2); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T14');
      abT14Bauen(u, spiel, uhr);
      nachDemBau(spiel);
    }, { uhr: () => uhr.t });
  });

  it('test_nr21_eigener_abgang_spur_dazu (8): wie (7), aber die Spur zu Haus 2 zusätzlich → Streifen und Satz bleiben, Ring am Radierer, kein T14; Radierer auf (12|13) → T14', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      // Startgeld laut tests/nr13-kern.test.ts:11; 30.000 € reichen für Planung, beide Puffer-Stationen und alle Felder (Bauplan P5 [2.3])
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      expect(spiel.tutorialGeldFehlt_eur()).toBe(0);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, [[12, 12], [12, 13]]); st(u).tick(uhr.t);
      wischeFelder(u, ZUG_HAUS2); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T13h');
      expect(text(u)).toBe(SATZ_EIGENER_ABGANG);
      expect(st(u).szene().tutorial_fremd).toEqual(FREMD_12);
      knopfRechteck(knopfMitId(u, 'zurueck')!, 600, 300); knopfRechteck(knopfMitId(u, 'radierer')!, 680, 300); st(u).tick(uhr.t);
      expect(ringMitten(u)).toContainEqual([702, 322]);
      expect(ringMitten(u)).not.toContainEqual([622, 322]);
      knopfMitId(u, 'radierer')!.click(); st(u).tick(uhr.t);
      wischeFelder(u, [[12, 13]]); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T14');
    }, { uhr: () => uhr.t });
  });

  it('test_nr21_spalte_11_nur_11_12_radiert (11): 25er über Spalte 11 zu Haus 2, Spur (10|13)→(10|14) dazu, Radierer nur auf (11|12) → beide Häuser ok, Streifen (11|13) bleibt, kein T14; Radierer auf (11|13) → T14 erst nach dem Abheben; Bau → warm', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      // Startgeld laut tests/nr13-kern.test.ts:11; 30.000 € reichen für Planung, beide Puffer-Stationen und alle Felder (Bauplan P5 [2.3])
      spiel.stand.geld_eur = 30_000;
      bisT13h(u, spiel, uhr);
      expect(spiel.tutorialGeldFehlt_eur()).toBe(0);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, [[11, 12], [11, 13], [11, 14], ERSTE_HAEUSER[1]]); st(u).tick(uhr.t);
      expect(text(u)).toBe(SATZ_EIGENER_ABGANG);
      wischeFelder(u, [[10, 13], [10, 14]]); st(u).tick(uhr.t);
      knopfMitId(u, 'radierer')!.click(); st(u).tick(uhr.t);
      wischeFelder(u, [[11, 12]]); st(u).tick(uhr.t);
      const lg = spiel.tutorialLeitungen();
      expect([lg.haus1_ok, lg.haus2_ok]).toEqual([true, true]);
      expect(schritt(u)).toBe('T13h');
      expect(text(u)).toBe(SATZ_EIGENER_ABGANG);
      expect(st(u).szene().tutorial_fremd).toEqual([[11, 13]]);
      expect(abschliessenText(u)).toContain(KURZ_WEG);
      wischeFelder(u, [[11, 13]], false); st(u).tick(uhr.t);
      expect(st(u).szene().tutorial_fremd ?? [], 'Streifen weg, sobald (11|13) radiert ist').toEqual([]);
      expect(schritt(u), 'Finger liegt noch: kein Wechsel unter dem Finger').toBe('T13h');
      abheben(u, [11, 13]); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T14');
      abT14Bauen(u, spiel, uhr);
      nachDemBau(spiel);
    }, { uhr: () => uhr.t });
  });

  it('test_nr21_eigener_abgang_neuladen (9): Stand aus (7) speichern und laden → T13h mit Satz, Streifen, Leiste 25 offen; nie T14', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      wischeFelder(u, [[12, 12], [12, 13]]); st(u).tick(uhr.t);
      expect(text(u)).toBe(SATZ_EIGENER_ABGANG);
    }, { uhr: () => uhr.t });
    const neu = neuGeladen(spiel, uhr);
    vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); // die erste Steuerung hat die globalen Attrappen abgeräumt
    await echteSteuerung(neu, (u) => {
      st(u).tick(uhr.t);
      expect(schritt(u), 'Wiedereinstieg').not.toBe('T14');
      wiedereinstiegWeiter(u, uhr);
      expect(schritt(u)).toBe('T13h');
      expect(text(u)).toBe(SATZ_EIGENER_ABGANG);
      expect(st(u).szene().tutorial_fremd).toEqual(FREMD_12);
      expect(zielEl(u, 'zeichenleiste')).not.toBeNull();
      expect(farbknopf(u, 'd25').getAttribute('aria-pressed')).toBe('true');
      vi.advanceTimersByTime(10_000); uhr.t += 10_000; st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T13h');
    }, { uhr: () => uhr.t });
  });

  it('test_nr21_kamera_eigener_abgang (10): T13h → T14 → T13h (eigener Abgang in T14 gezogen) lässt Zoom und Verschiebung unverändert', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      const vorher = kameraLage(u);
      wischeFelder(u, ZUG_HAUS2); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T14');
      expect(kameraLage(u)).toEqual(vorher);
      wischeFelder(u, [[12, 12], [12, 13]]); st(u).tick(uhr.t);
      expect(schritt(u)).toBe('T13h');
      expect(st(u).anleitungAnsicht()!.fremd).toEqual(FREMD_12);
      expect(kameraLage(u)).toEqual(vorher);
    }, { uhr: () => uhr.t });
  });
});
