import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { domAttrappe, El, sichtbarerText, type DomAttrappe } from './hilfen/dom-attrappe';
import { neuerSpielstand } from '../src/core/start';
import { abStufe, FUNKTION_NAME, neuBeiStufe, sperrgrund } from '../src/core/freischaltung';
import { spielOrt } from '../src/core/neubaugebiet';
import { NORD_FACHTEXTE_FREIGEGEBEN, NORD_TEXTE, nordText, type NordTextId } from '../src/core/nord-texte';
import {
  BAHN_ZEILEN_Y, BRUECKE_X, bahnFelder, hinterDerBahn, istBahn, istBruecke, NORD_PLAN, nordFluss, nordInfo, nordKulisse,
  nordSperre, nordStrassen, nordviertelAnlegen, QUERUNG_X, querungGebaut, querungImBau,
} from '../src/core/nordviertel';
import type { TypId } from '../src/core/katalog';
import type { Objekt, Spielstand } from '../src/core/typen';

// NR27 P2 (Bauplan docs/bauplaene/NR27-bahnquerung-entwurf.md, Abschnitt 6 P2): Daten, Sperrgründe und Texte der Nordzone.
// Alle erwarteten Zahlen sind aus dem Bauplan von Hand abgeleitet (Kartenzeilen, Hausliste), nicht aus dem Code gerechnet.

const T0 = 1_000_000_000_000;
const stand = (stufe: number): Spielstand => {
  const s = neuerSpielstand(T0);
  const hz = s.objekte.find((o) => o.typ === 'hz');
  if (!hz) throw new Error('Startdorf ohne Heizzentrale');
  hz.stufe = stufe;
  return s;
};
const leitung = (s: Spielstand, x: number, y: number, geplant = false, typ: TypId = 'd40'): void => {
  const o: Objekt = { id: s.naechste_id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0 };
  if (geplant) o.geplant = true;
  s.objekte.push(o);
};
const SCHLUESSEL = (x: number, y: number): string => `${x}|${y}`;

describe('NR27 Nordzone: Plan und Flächen', () => {
  it('test_nr27_a_plan: 14 Häuser an den im Bauplan festgelegten Plätzen', () => {
    expect(NORD_PLAN).toHaveLength(14);
    // Der Bauplan nennt „6 EFH, 8 RH“, seine Hausliste (verbindlich für die Lage) enthält aber 5 EFH und 9 RH.
    // Gebaut ist die Liste wörtlich; die Abweichung steht im Bericht (Entscheidung Projektleiter).
    expect(NORD_PLAN.filter((h) => h.typ === 'efh')).toHaveLength(5);
    expect(NORD_PLAN.filter((h) => h.typ === 'rh')).toHaveLength(9);
    expect(NORD_PLAN.map((h) => `${h.typ} ${h.x} ${h.y}`)).toEqual([
      'efh 2 -9', 'rh 4 -9', 'rh 6 -9', 'efh 8 -9', 'rh 12 -9', 'rh 14 -9', 'efh 16 -9',
      'rh 2 -5', 'efh 4 -5', 'rh 6 -5', 'rh 8 -5', 'efh 12 -5', 'rh 14 -5', 'rh 16 -5',
    ]);
    const strasse = new Set(nordStrassen().map(([x, y]) => SCHLUESSEL(x, y)));
    const fluss = new Set(nordFluss().map(([x, y]) => SCHLUESSEL(x, y)));
    for (const h of NORD_PLAN) {
      expect(strasse.has(SCHLUESSEL(h.x, h.y)), `Haus ${h.x}|${h.y} auf Straße`).toBe(false);
      expect(fluss.has(SCHLUESSEL(h.x, h.y)), `Haus ${h.x}|${h.y} im Fluss`).toBe(false);
      expect(istBahn(h.x, h.y), `Haus ${h.x}|${h.y} auf der Bahn`).toBe(false);
      expect(h.y).toBeGreaterThanOrEqual(-9);
      expect(h.y).toBeLessThanOrEqual(-5);
    }
    for (const a of NORD_PLAN) for (const b of NORD_PLAN) {
      if (a !== b) expect(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)), `${a.x}|${a.y} zu ${b.x}|${b.y}`).toBeGreaterThanOrEqual(2);
    }
    // Jedes Haus hat ein freies Nachbarfeld, das selbst Straße ist oder an eine Straße grenzt.
    const haus = new Set(NORD_PLAN.map((h) => SCHLUESSEL(h.x, h.y)));
    const anStrasse = (x: number, y: number): boolean => strasse.has(SCHLUESSEL(x, y))
      || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => strasse.has(SCHLUESSEL(x + dx, y + dy)));
    for (const h of NORD_PLAN) {
      let frei = false;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const nx = h.x + dx, ny = h.y + dy;
        if ((dx || dy) && !haus.has(SCHLUESSEL(nx, ny)) && !fluss.has(SCHLUESSEL(nx, ny)) && !istBahn(nx, ny) && anStrasse(nx, ny)) frei = true;
      }
      expect(frei, `Haus ${h.x}|${h.y} ohne freies Nachbarfeld an der Straße`).toBe(true);
    }
    // Querungsweg (10|-4) … (10|-6) frei.
    for (const y of [-4, -5, -6]) {
      expect(haus.has(SCHLUESSEL(QUERUNG_X, y)), `Haus auf Querungsweg 10|${y}`).toBe(false);
      expect(strasse.has(SCHLUESSEL(QUERUNG_X, y))).toBe(false);
      expect(fluss.has(SCHLUESSEL(QUERUNG_X, y))).toBe(false);
    }
  });

  it('Straßen und Fluss haben genau die Felder der Kartenzeilen im Bauplan', () => {
    const s = nordStrassen();
    // x = 10 für y = -10 … -8 (3 Felder) + Wohnstraße y = -7 für x = 1 … 17 (17 Felder) = 20
    expect(s).toHaveLength(20);
    expect(new Set(s.map(([x, y]) => SCHLUESSEL(x, y))).size).toBe(20);
    for (const [x, y] of s) {
      const stich = x === QUERUNG_X && y >= -10 && y <= -8;
      const wohn = y === -7 && x >= 1 && x <= 17;
      expect(stich || wohn, `Straßenfeld ${x}|${y} nicht im Plan`).toBe(true);
    }
    // x = 19, 20 für y = -10 … -4 (7 Zeilen) und y = -1 (1 Zeile) = 16 Felder
    const f = nordFluss();
    expect(f).toHaveLength(16);
    expect(new Set(f.map(([x, y]) => SCHLUESSEL(x, y))).size).toBe(16);
    for (const [x, y] of f) {
      expect(x === 19 || x === 20).toBe(true);
      expect(y >= -10 && y <= -1 && y !== -3 && y !== -2, `Flussfeld ${x}|${y}`).toBe(true);
    }
  });

  it('test_nr27_e_flaechen_getrennt: Bahn, Straße und Fluss überschneiden sich nicht', () => {
    const bahn = bahnFelder();
    expect(bahn).toHaveLength(48);
    expect(new Set(bahn.map(([x, y]) => SCHLUESSEL(x, y))).size).toBe(48);
    expect(BAHN_ZEILEN_Y).toEqual([-3, -2]);
    expect(BRUECKE_X).toEqual([19, 20]);
    expect(QUERUNG_X).toBe(10);
    const bahnSet = new Set(bahn.map(([x, y]) => SCHLUESSEL(x, y)));
    for (const [x, y] of nordStrassen()) expect(bahnSet.has(SCHLUESSEL(x, y))).toBe(false);
    for (const [x, y] of nordFluss()) expect(bahnSet.has(SCHLUESSEL(x, y))).toBe(false);
    for (const x of BRUECKE_X) for (const y of BAHN_ZEILEN_Y) expect(bahnSet.has(SCHLUESSEL(x, y))).toBe(true);
    expect(BRUECKE_X).not.toContain(QUERUNG_X);
  });

  it('istBahn, istBruecke und hinterDerBahn liegen genau auf der Grenze', () => {
    expect(istBahn(0, -3)).toBe(true);
    expect(istBahn(23, -2)).toBe(true);
    expect(istBahn(10, -4)).toBe(false);
    expect(istBahn(10, -1)).toBe(false);
    expect(istBahn(24, -3)).toBe(false);
    expect(istBahn(-1, -3)).toBe(false);
    expect(istBruecke(19, -3)).toBe(true);
    expect(istBruecke(20, -2)).toBe(true);
    expect(istBruecke(18, -3)).toBe(false);
    expect(istBruecke(21, -3)).toBe(false);
    expect(istBruecke(19, -4)).toBe(false);
    expect(hinterDerBahn(-4)).toBe(true);
    expect(hinterDerBahn(-10)).toBe(true);
    expect(hinterDerBahn(-3)).toBe(false);
    expect(hinterDerBahn(0)).toBe(false);
  });
});

describe('NR27 Nordzone: Querung, Anlegen, Kulisse', () => {
  it('test_nr27_f_querung_gebaut', () => {
    const s = stand(6);
    expect(querungGebaut(s.objekte)).toBe(false);
    leitung(s, 10, -3, true); leitung(s, 10, -2, true);
    expect(querungGebaut(s.objekte), 'nur geplant').toBe(false);
    const t = stand(6);
    leitung(t, 10, -3); // nur eine Zeile
    expect(querungGebaut(t.objekte), 'nur eine Zeile').toBe(false);
    leitung(t, 10, -2, true);
    expect(querungGebaut(t.objekte), 'zweite Zeile nur geplant').toBe(false);
    const u = stand(6);
    leitung(u, 5, -3); leitung(u, 5, -2);
    expect(querungGebaut(u.objekte), 'falsche Spalte').toBe(false);
    const v = stand(6);
    leitung(v, 10, -3); leitung(v, 10, -2);
    expect(querungGebaut(v.objekte)).toBe(true);
    const w = stand(6);
    leitung(w, 10, -3); w.objekte.push({ id: 900, typ: 'baum', x: 10, y: -2, stufe: 1, bau: null, kasse_eur: 0 });
    expect(querungGebaut(w.objekte), 'Baum zählt nicht als Leitung').toBe(false);
  });

  it('querungImBau gilt nur für einen Abschnitt mit Querung in der Bauphase', () => {
    const bau = { art: 'neu' as const, start_ms: T0, ende_ms: T0 + 1000 };
    expect(querungImBau({})).toBe(false);
    expect(querungImBau({ abschnitt: { phase: 'bau', bau } })).toBe(false);
    expect(querungImBau({ abschnitt: { phase: 'planung', bau: null, mit_querung: true } })).toBe(false);
    expect(querungImBau({ abschnitt: { phase: 'bau', bau, mit_querung: true } })).toBe(true);
  });

  it('test_nr27_f_anlegen_einmal: zweimal anlegen ergibt 14 Häuser und 14 neue Ids', () => {
    const s = stand(6);
    const vorher = s.objekte.length, id0 = s.naechste_id;
    expect(nordviertelAnlegen(s)).toBe(true);
    expect(s.objekte).toHaveLength(vorher + 14);
    expect(s.naechste_id).toBe(id0 + 14);
    expect(s.nordviertel).toBe(true);
    expect(nordviertelAnlegen(s)).toBe(false);
    expect(s.objekte).toHaveLength(vorher + 14);
    expect(s.naechste_id).toBe(id0 + 14);
    const neu = s.objekte.slice(vorher);
    expect(neu.map((o) => `${o.typ} ${o.x} ${o.y}`)).toEqual(NORD_PLAN.map((h) => `${h.typ} ${h.x} ${h.y}`));
    for (const o of neu) {
      expect(o).toMatchObject({ bestand: true, ohne_station: true, zufriedenheit_pct: 80, kasse_eur: 0, bau: null, stufe: 1 });
    }
    expect(new Set(neu.map((o) => o.id)).size).toBe(14);
  });

  it('nordviertelAnlegen überspringt einen belegten Platz', () => {
    const s = stand(6);
    leitung(s, 2, -9, false, 'd25'); // belegt den Platz des ersten Hauses
    const vorher = s.objekte.length, id0 = s.naechste_id;
    expect(nordviertelAnlegen(s)).toBe(true);
    expect(s.objekte).toHaveLength(vorher + 13);
    expect(s.objekte.filter((o) => o.x === 2 && o.y === -9)).toHaveLength(1);
    expect(s.naechste_id).toBe(id0 + 13);
  });

  it('nordKulisse zeigt den Plan bis zur Erschließung, dann nichts', () => {
    expect(nordKulisse({})).toHaveLength(14);
    expect(nordKulisse({ nordviertel: true })).toEqual([]);
  });
});

describe('NR27 Nordzone: Freischaltung und Ort', () => {
  it('test_nr27_b_freischaltung', () => {
    expect(abStufe('bahnquerung')).toBe(6);
    expect(FUNKTION_NAME.bahnquerung).toBe('Bahnquerung');
    expect(sperrgrund(stand(5), 'bahnquerung')).toBe('ab Heizzentrale Stufe 6');
    expect(sperrgrund(stand(6), 'bahnquerung')).toBeNull();
    const neu = neuBeiStufe(6);
    expect(neu).toContain('neubaugebiet');
    expect(neu).toContain('bahnquerung');
  });

  it('test_nr27_a_spielort: ohne Neubaugebiet hängen Bahn, Nordstraßen und Nordfluss am Ort', () => {
    const s = stand(1);
    expect(s.neubaugebiet).toBeFalsy();
    const ort = spielOrt(s);
    expect(ort.bahn).toHaveLength(48);
    const strassen = new Set(ort.strassen.map(([x, y]) => SCHLUESSEL(x, y)));
    expect(strassen.has(SCHLUESSEL(1, -7))).toBe(true);
    expect(strassen.has(SCHLUESSEL(10, -9))).toBe(true);
    expect(strassen.has(SCHLUESSEL(10, 5))).toBe(true); // Bestand bleibt
    const fluss = new Set(ort.fluss.map(([x, y]) => SCHLUESSEL(x, y)));
    expect(fluss.has(SCHLUESSEL(19, -10))).toBe(true);
    expect(fluss.has(SCHLUESSEL(20, -1))).toBe(true);
    expect(fluss.has(SCHLUESSEL(19, -3))).toBe(false);
  });

  it('mit Neubaugebiet bleiben Nord- und Süd-Felder beide da', () => {
    const s = stand(6);
    s.neubaugebiet = true; s.neubaugebiet_layout = 3;
    const ort = spielOrt(s);
    expect(ort.bahn).toHaveLength(48);
    expect(ort.strassen.some(([x, y]) => x === 10 && y === -9)).toBe(true);
    expect(ort.strassen.some(([x, y]) => x === 10 && y === 30)).toBe(true);
  });
});

describe('NR27 Nordzone: Sperrgründe (AE-NR27-9, -10)', () => {
  const frage = (s: Spielstand, t: TypId, x: number, y: number): string | null => nordSperre(s, t, x, y);

  it('test_nr27_e_sperre: Gleise, Brücke, Freischaltung', () => {
    expect(frage(stand(6), 'baum', 5, -2)).toBe(nordText('GLEISE'));
    expect(frage(stand(6), 'efh', 10, -3)).toBe(nordText('GLEISE'));
    expect(frage(stand(6), 'd40', 19, -2)).toBe(nordText('BRUECKE'));
    expect(frage(stand(6), 'd40', 20, -3)).toBe(nordText('BRUECKE'));
    expect(frage(stand(5), 'd40', 10, -2)).toBe(nordText('Q2', { sperrgrund: 'ab Heizzentrale Stufe 6' }));
    expect(frage(stand(5), 'd40', 10, -2)).toBe('Über die Bahn geht es erst mit einer Bahnquerung – ab Heizzentrale Stufe 6');
    expect(frage(stand(6), 'd40', 10, -2)).toBeNull();
    expect(frage(stand(6), 'd40', 10, -3)).toBeNull();
  });

  it('test_nr27_e_sperre: nur eine Stelle und nicht entlang der Gleise', () => {
    expect(frage(stand(6), 'd40', 5, -2)).toBe(nordText('STELLE'));
    const s = stand(6);
    leitung(s, 12, -2, true);
    expect(frage(s, 'd40', 11, -2)).toBe(nordText('Q4'));
    const r = stand(6);
    leitung(r, 10, -2); // gebaute Leitung rechts-links daneben zählt auch
    expect(frage(r, 'd40', 11, -2)).toBe(nordText('Q4'));
    expect(frage(r, 'd40', 9, -2)).toBe(nordText('Q4'));
    expect(frage(r, 'd40', 9, -3), 'andere Bahnzeile: keine Nachbarleitung').toBe(nordText('STELLE'));
    const q = stand(6);
    leitung(q, 12, -2, true);
    expect(frage(q, 'd40', 13, -2)).toBe(nordText('Q4'));
    expect(frage(q, 'd40', 14, -2), 'zwei Felder Abstand ist kein Nachbar').toBe(nordText('STELLE'));
  });

  it('test_nr27_e_sperre: hinter der Bahn und der Rest der Karte', () => {
    expect(frage(stand(6), 'd40', 10, -4)).toBe(nordText('HINTER'));
    expect(frage(stand(6), 'efh', 5, -9)).toBe(nordText('HINTER'));
    const bau = stand(6);
    const dauer = { art: 'neu' as const, start_ms: T0, ende_ms: T0 + 1000 };
    bau.abschnitt = { phase: 'bau', bau: dauer, mit_querung: true };
    expect(frage(bau, 'd40', 10, -4)).toBe(nordText('Q5'));
    const ohneQuerung = stand(6);
    ohneQuerung.abschnitt = { phase: 'bau', bau: dauer };
    expect(frage(ohneQuerung, 'd40', 10, -4)).toBe(nordText('HINTER'));
    const erschlossen = stand(6);
    erschlossen.nordviertel = true;
    expect(frage(erschlossen, 'd40', 10, -4)).toBeNull();
    expect(frage(erschlossen, 'd40', 10, -9)).toBeNull();
    expect(frage(stand(6), 'd40', 10, -1)).toBeNull();
    expect(frage(stand(6), 'd40', 10, 5)).toBeNull();
    // Auch nach der Erschließung bleibt die Bahn selbst geregelt.
    expect(frage(erschlossen, 'baum', 5, -2)).toBe(nordText('GLEISE'));
  });
});

describe('NR27 Nordzone: Antipp-Hinweise', () => {
  it('test_nr27_info: vor und ab Stufe 6, nach der Erschließung nichts', () => {
    expect(nordInfo(stand(5), 5, -2)).toBe(nordText('N1'));
    expect(nordInfo(stand(5), 2, -9)).toBe(nordText('N1'));
    expect(nordInfo(stand(5), 2, -9)).toBe('Hinter der Bahn: Diese Häuser erreichst du über eine Bahnquerung ab Heizzentrale Stufe 6.');
    expect(nordInfo(stand(6), 5, -2)).toBe(nordText('N2'));
    expect(nordInfo(stand(6), 2, -9)).toBe(nordText('N2'));
    const erschlossen = stand(6);
    erschlossen.nordviertel = true;
    expect(nordInfo(erschlossen, 2, -9)).toBeNull();
    expect(nordInfo(erschlossen, 5, -2)).toBeNull();
    expect(nordInfo(stand(6), 5, 5)).toBeNull();
    expect(nordInfo(stand(6), 10, -1)).toBeNull();
  });
});

describe('NR27 Texte (AE-NR27-12, -13)', () => {
  const FACH: NordTextId[] = ['WISSEN_A', 'WISSEN_B', 'KARTE_1', 'KARTE_2', 'KARTE_3', 'KARTE_4', 'TUTORIAL_1'];
  const ids = Object.keys(NORD_TEXTE) as NordTextId[];
  const WERTE = { sperrgrund: 'ab Heizzentrale Stufe 6', preis: '45.000 €', querung_eur: '90.000 €', querung_zeit: '24 min', laenge_m: 2 };

  it('test_nr27_d_texte: die Tabelle hat genau die Kennungen aus dem Bauplan', () => {
    expect([...ids].sort()).toEqual([
      'BLATT_ZEILE', 'BRUECKE', 'CHIP', 'EXPRESS', 'F1', 'GLEISE', 'HINTER', 'KARTE_1', 'KARTE_2', 'KARTE_3', 'KARTE_4', 'KARTE_5',
      'KARTE_ALT', 'KARTE_TITEL', 'KATALOG_PREIS', 'KATALOG_ZEILE', 'KOSTEN_ZUSATZ', 'N1', 'N2', 'Q2', 'Q4', 'Q5', 'SOFORT_GRUND',
      'STELLE', 'TUTORIAL_1', 'TUTORIAL_2', 'TUTORIAL_BEDIEN', 'WISSEN_A', 'WISSEN_B',
      // P5a3 (Entscheidung 23.11.): Chips der Erklärkarte und die Katalogzeile bei Höchststufe – keine Fachtexte.
      'HOECHSTSTUFE', 'KARTE_CHIP_FELD', 'KARTE_CHIP_ZUSCHLAG',
    ].sort());
  });

  it('jeder Text liefert mit Werten einen Text ohne Platzhalter-Klammern', () => {
    for (const id of ids) {
      const t = nordText(id, WERTE, true);
      expect(t, id).not.toBeNull();
      expect(t, id).not.toMatch(/[{}]/);
      expect((t as string).length, id).toBeGreaterThan(0);
    }
  });

  it('Platzhalter werden an der richtigen Stelle ersetzt', () => {
    expect(nordText('KOSTEN_ZUSATZ', WERTE)).toBe('dazu eine Bahnquerung (90.000 €) · Bauzeit +24 min');
    expect(nordText('BLATT_ZEILE', WERTE)).toBe('Bahnquerung · unter den Gleisen · 2 m');
    expect(nordText('KATALOG_PREIS', WERTE)).toBe('Über die Gleise nur per Bahnquerung an der Hauptstraße: 45.000 € je Gleisfeld.');
    expect(nordText('KATALOG_ZEILE')).toBe('Über die Bahn kommt eine Leitung nur quer über die Gleise – ab Heizzentrale Stufe 6.');
    expect(nordText('SOFORT_GRUND')?.length).toBeLessThanOrEqual(28);
  });

  // P5a3: Fehler, die ihn rot machen: Chip ohne Wert-Platzhalter (fester Betrag im Text), falscher Platzhaltername,
  // Kennung als Fachtext markiert (dann fehlte der Chip ohne Freigabe), Höchststufen-Zeile ohne Text.
  it('test_nr27_d_texte P5a3: Chips tragen {preis} bzw. {querung_zeit}, keine der drei neuen Kennungen ist Fachtext', () => {
    const neu = ['KARTE_CHIP_FELD', 'KARTE_CHIP_ZUSCHLAG', 'HOECHSTSTUFE'] as string[] as NordTextId[];
    for (const id of neu) {
      expect(ids, id).toContain(id);
      expect(NORD_TEXTE[id]?.fach, id).toBeUndefined();
      expect(nordText(id, WERTE, false), id).not.toBeNull();
    }
    expect(NORD_TEXTE['KARTE_CHIP_FELD' as NordTextId]?.text).toContain('{preis}');
    expect(NORD_TEXTE['KARTE_CHIP_ZUSCHLAG' as NordTextId]?.text).toContain('{querung_zeit}');
    expect(nordText('KARTE_CHIP_FELD' as NordTextId, { preis: '12.345 €' })).toContain('12.345 €');
    expect(nordText('KARTE_CHIP_ZUSCHLAG' as NordTextId, { querung_zeit: '7 min' })).toContain('7 min');
    expect(() => nordText('KARTE_CHIP_FELD' as NordTextId)).toThrow(/KARTE_CHIP_FELD.*preis/);
    expect(() => nordText('KARTE_CHIP_ZUSCHLAG' as NordTextId)).toThrow(/KARTE_CHIP_ZUSCHLAG.*querung_zeit/);
    expect(nordText('HOECHSTSTUFE' as NordTextId)?.toLowerCase()).toContain('höchste stufe');
  });

  it('ein fehlender Platzhalterwert wirft mit Kennung und Platzhalter', () => {
    expect(() => nordText('KOSTEN_ZUSATZ', { querung_eur: 'x' })).toThrow(/KOSTEN_ZUSATZ.*querung_zeit/);
    expect(() => nordText('Q2')).toThrow(/Q2.*sperrgrund/);
  });

  it('ohne Freigabe liefert jede Fach-Kennung null, mit Freigabe den Text', () => {
    expect(NORD_FACHTEXTE_FREIGEGEBEN).toBe(false);
    expect(ids.filter((id) => NORD_TEXTE[id].fach).sort()).toEqual([...FACH].sort());
    for (const id of FACH) {
      expect(nordText(id), id).toBeNull();
      expect(nordText(id, {}, false), id).toBeNull();
      expect(typeof nordText(id, {}, true), id).toBe('string');
    }
    for (const id of ids.filter((i) => !FACH.includes(i))) expect(NORD_TEXTE[id].fach, id).toBeUndefined();
    expect(nordText('WISSEN_B', {}, true)).toBe('Vorher muss die Bahn den Plan prüfen und zustimmen. Das braucht Zeit.');
    expect(nordText('KARTE_1', {}, true)).toBe('Gleise werden in der Regel nicht aufgegraben wie eine Straße.');
  });
});

describe('NR27 Erklärkarte ohne Fachtext-Freigabe (Entscheidung 23.11., DESIGN 14.7)', () => {
  // Regel: Ohne Freigabe gibt es keine Erklärkarte, kein (i) und nie einen Platzhalter – auch keinen Toast mit KARTE_5.
  // Fehler, die ihn rot machen: Toast als Ersatz (alter Platzhalter), Popup/Blatt trotz fehlender Freigabe, irgendein
  // neues Element im Dokument, Absturz beim Aufruf.
  let dom: DomAttrappe;
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks();
    dom = domAttrappe();
    vi.stubGlobal('document', dom.doc); vi.stubGlobal('DOMParser', dom.Parser);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('requestAnimationFrame', (f: () => void) => { f(); return 1; });
  });
  afterEach(() => { vi.doUnmock('../src/ui/toast'); vi.doUnmock('../src/ui/blatt'); vi.unstubAllGlobals(); });

  const knoten = (e: El): number => 1 + e.kinder.reduce((n, k) => n + (k instanceof El ? knoten(k) : 1), 0);

  it('test_nr27_erklaerkarte_ohne_freigabe: bahnKarteZeigen zeigt weder Toast noch Karte noch Popup', async () => {
    expect(NORD_FACHTEXTE_FREIGEGEBEN).toBe(false);
    const toast = vi.fn();
    const blattOeffnen = vi.fn();
    vi.doMock('../src/ui/toast', () => ({ toast }));
    vi.doMock('../src/ui/blatt', async (orig) => ({ ...(await orig<typeof import('../src/ui/blatt')>()), blattOeffnen }));
    const vorher = knoten(dom.html);
    const { bahnKarteZeigen } = await import('../src/ui/bahn-karte');
    expect(() => bahnKarteZeigen({} as never)).not.toThrow();
    expect(toast).not.toHaveBeenCalled();
    expect(blattOeffnen).not.toHaveBeenCalled();
    expect(dom.html.querySelectorAll('#bahn-karte, [role="dialog"], .popup, .abdunkeln')).toHaveLength(0);
    expect(knoten(dom.html)).toBe(vorher);
    expect(sichtbarerText(dom.html)).not.toContain(nordText('KARTE_5') as string);
    expect(sichtbarerText(dom.html)).not.toContain(nordText('KARTE_TITEL') as string);
  });

  // Offen für P5a3 (bewusst kein Platzhalter-Test, die Test-Schranke verbietet ihn): Mit Freigabe (nordText mit freigegeben=true per vi.mock)
  // öffnet bahnKarteZeigen das Popup „Warum so teuer?“ mit KARTE_1–KARTE_5 und den Chips KARTE_CHIP_FELD / KARTE_CHIP_ZUSCHLAG.
  // Den Test schreibt der Entwickler im P5a3-Testsatz, sobald Selektor und Aufbau nach DESIGN 14.7 feststehen.
});
