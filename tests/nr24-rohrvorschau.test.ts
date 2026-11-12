import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { START_PREISSTUFE, passendeStation, istLeitung, type TypId } from '../src/core/katalog';
import { berechneNetz, bedarfKw } from '../src/core/netz';
import { rohrVorschau, rohrVorschauText } from '../src/core/rohrvorschau';
import type { Spiel } from '../src/core/spiel';
import type { Netz, Objekt } from '../src/core/typen';
import { dorf, neu, quelle } from './hilfen';
import { abschnittOeffnen, objektBei } from './hilfen/nr18';
import { leeresDorf } from './hilfen/nr22';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';

// NR24 (Lastenheft, Simon 2026-11-11, Reihenfolge A per Sprache 2026-11-12): Beim Leitungsziehen zeigt das Spiel, welche
// Leitungsgröße an der Stelle unter dem Finger mindestens nötig ist, damit alle Häuser dahinter versorgt sind.
// Katalogwerte von Hand: d25 15 kW, d32 25 kW, d40 40 kW, d160 900 kW; EFH 15.000 kWh/a ÷ 1.500 h = 10 kW.
// Netze mit tests/hilfen.ts: Heizzentrale bei (10|10) belegt x 10–11, y 10–11. Feldnummer = y·24 + x.
const f = (x: number, y: number): number => y * 24 + x;
const netzAus = (objekte: Objekt[]): Netz => berechneNetz(objekte, [quelle('kessel')], START_PREISSTUFE);

/** 25er-Strang (12|10)…(15|10); EFH (14|11) hängt an (14|10), EFH (16|10) am Ende (15|10). */
const strang = (efh1: Partial<Objekt> = {}, efh2: Partial<Objekt> = {}): Objekt[] => dorf(
  neu('d25', 12, 10), neu('d25', 13, 10), neu('d25', 14, 10), neu('d25', 15, 10),
  neu('efh', 14, 11, efh1), neu('efh', 16, 10, efh2),
);

describe('NR24 Kern: rohrVorschau', () => {
  it('an der Heizzentrale zählt die Last aller Häuser dahinter: 2 EFH = 20 kW → 32er nötig', () => {
    const o = strang();
    expect(rohrVorschau(netzAus(o), o, f(12, 10))).toEqual({ last_kw: 20, haeuser: 2, noetig: 'd32' });
  });

  it('am Strangende nur das letzte Haus: 10 kW → 25er reicht', () => {
    const o = strang();
    expect(rohrVorschau(netzAus(o), o, f(15, 10))).toEqual({ last_kw: 10, haeuser: 1, noetig: 'd25' });
  });

  it('Häuser ohne Übergabestation zählen mit (sie sollen ja angeschlossen werden), gekündigte nicht', () => {
    const o = strang({ ohne_station: true }, { gekuendigt: true });
    expect(rohrVorschau(netzAus(o), o, f(12, 10))).toEqual({ last_kw: 10, haeuser: 1, noetig: 'd25' });
  });

  it('Feld ohne verbundene Leitung → null; Leitung ohne Haus dahinter → 0 kW, kleinste Leitung', () => {
    const o = dorf(neu('d25', 12, 10), neu('d25', 20, 20));
    const netz = netzAus(o);
    expect(rohrVorschau(netz, o, f(20, 20))).toBeNull();
    expect(rohrVorschau(netz, o, f(5, 5))).toBeNull();
    expect(rohrVorschau(netz, o, f(12, 10))).toEqual({ last_kw: 0, haeuser: 0, noetig: 'd25' });
  });

  it('nutzt den Spreizungsfaktor wie die Netzrechnung; reicht keine Leitung → noetig null', () => {
    const o = strang();
    const netz = netzAus(o);
    expect(rohrVorschau({ ...netz, spreizung_faktor: 2 }, o, f(12, 10))?.noetig).toBe('d25');
    expect(rohrVorschau({ ...netz, spreizung_faktor: 0.01 }, o, f(12, 10))?.noetig).toBeNull();
  });
});

describe('NR24 Kern: rohrVorschauText', () => {
  it('Größe, Häuser und kW; mit gewählter dünnerer Leitung eine Warnung', () => {
    const v = { last_kw: 26, haeuser: 2, noetig: 'd40' as TypId };
    expect(rohrVorschauText(v, 'd40', null)).toEqual({ zeile: 'Hier nötig: 40er', klein: '2 Häuser · 26 kW', warnung: null });
    expect(rohrVorschauText(v, 'd25', null).warnung).toBe('Deine 25er ist hier zu dünn.');
    expect(rohrVorschauText(v, 'd50', null).warnung).toBeNull();
  });
  it('gesperrte Größe nennt die Stufe, ein Haus in Einzahl, kW aufgerundet', () => {
    expect(rohrVorschauText({ last_kw: 10.4, haeuser: 1, noetig: 'd50' }, 'd50', 3))
      .toEqual({ zeile: 'Hier nötig: 50er (ab Stufe 3)', klein: '1 Haus · 11 kW', warnung: null });
  });
  it('ohne Haus dahinter und wenn keine Leitung reicht', () => {
    expect(rohrVorschauText({ last_kw: 0, haeuser: 0, noetig: 'd25' }, 'd25', null)).toEqual({ zeile: 'Noch kein Haus dahinter', klein: '', warnung: null });
    expect(rohrVorschauText({ last_kw: 950, haeuser: 60, noetig: null }, 'd160', null))
      .toEqual({ zeile: 'Keine Leitung reicht hier', klein: '60 Häuser · 950 kW', warnung: 'Leg einen getrennten Abgang.' });
  });
});

// Dorf wie tests/nr22-steuerung.test.ts: Heizzentrale ab (11|10), Stamm (10|10) → (6|9), Ende bis (2|8);
// Reihenhaus (3|10) 16 kW + EFH (2|7) 10 kW.
const T0 = 1_000_000_000_000;
const STAMM: ReadonlyArray<[number, number]> = [[10, 10], [10, 9], [9, 9], [8, 9], [7, 9], [6, 9]];
const ENDE: ReadonlyArray<[number, number]> = [[5, 9], [4, 9], [3, 9], [2, 9], [2, 8]];
const zeichne = (s: Spiel, typ: TypId, weg: ReadonlyArray<[number, number]>): void => {
  for (const [x, y] of weg) expect(s.platzieren(typ, x, y).ok, `platzieren ${typ} (${x}|${y})`).toBe(true);
};
const haus = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => !istLeitung(o.typ) && o.typ !== 'hz')!;

function eingezeichnet(): Spiel {
  const d = leeresDorf(T0);
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  zeichne(d.s, 'd25', STAMM);
  zeichne(d.s, 'd40', ENDE);
  for (const [x, y] of [[3, 10], [2, 7]]) {
    const h = haus(d.s, x, y);
    expect(d.s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
  }
  return d.s;
}

describe('NR24 Spiel: rohrVorschau rechnet mit eingezeichneten Leitungen', () => {
  // Am ersten Stammfeld (10|10) hängt zusätzlich das EFH (9|10) ohne Station über die vorbeilaufende Leitung: 36 kW.
  it('erstes Stammfeld 36 kW (3 Häuser) → 40er; zweites 26 kW → 40er; am Ende nur das EFH: 10 kW → 25er; außerhalb null', () => {
    const s = eingezeichnet();
    expect(s.rohrVorschau(10, 10)).toEqual({ last_kw: 36, haeuser: 3, noetig: 'd40', frei_ab_stufe: null });
    expect(s.rohrVorschau(10, 9)).toEqual({ last_kw: 26, haeuser: 2, noetig: 'd40', frei_ab_stufe: null });
    expect(s.rohrVorschau(2, 8)).toEqual({ last_kw: 10, haeuser: 1, noetig: 'd25', frei_ab_stufe: null });
    expect(s.rohrVorschau(0, 0)).toBeNull();
  });
  it('gesperrte nötige Größe nennt die Stufe: RH mit Kamin aus (16 × 1,5 = 24 kW) → 44 kW an (10|10) → 50er, frei ab Stufe 2', () => {
    const s = eingezeichnet();
    s.hz.stufe = 1;
    haus(s, 3, 10).vollversorgung = true;
    s.neuBerechnen();
    expect(s.rohrVorschau(10, 10)).toEqual({ last_kw: 44, haeuser: 3, noetig: 'd50', frei_ab_stufe: 2 });
    s.hz.stufe = 2;
    s.neuBerechnen();
    expect(s.rohrVorschau(10, 10)?.frei_ab_stufe).toBeNull();
  });
});

// ───────────── Zeichenleiste ─────────────
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const vorschau = (u: EchteUmgebung): El | undefined =>
  u.dom.app.querySelectorAll('[data-ziel="rohrvorschau"]').find((e) => e.isConnected);
function tippeFeld(u: EchteUmgebung, x: number, y: number): void {
  const k = u.st.kamera as unknown as { mitte(a: number, b: number): [number, number]; feld(a: number, b: number): [number, number]; zentrierenBei(x: number, y: number, k: number, mx: number, my: number): void; breite: number; hoehe: number };
  k.zentrierenBei(x, y, 1, k.breite / 4, k.hoehe / 2);
  const [mx, my] = k.mitte(x, y);
  expect(k.feld(mx, my), 'Feld unter dem Finger (Testaufbau)').toEqual([x, y]);
  const canvas = u.dom.app.querySelector('canvas')!;
  const ev = { pointerId: 1, clientX: mx, clientY: my, pointerType: 'touch', button: 0 };
  canvas.ausloesen('pointerdown', ev);
  canvas.ausloesen('pointerup', ev);
}

describe('NR24 Zeichenleiste: Vorschau unter dem Finger', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('frisch geöffnet keine Vorschau; Finger auf dem Stamm → „Hier nötig: 40er“, Warnung für die 25er, 40er-Knopf markiert', async () => {
    const s = eingezeichnet();
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      const leer = vorschau(u);
      expect(!leer || leer.hidden, 'ohne Feld keine Vorschau').toBe(true);
      tippeFeld(u, 8, 9);
      const v = vorschau(u)!;
      expect(v, 'Vorschau in der Zeichenleiste').toBeDefined();
      expect(v.hidden).toBe(false);
      expect(v.attrs.role).toBe('status');
      const text = norm(v.textContent);
      expect(text).toContain('Hier nötig: 40er');
      expect(text).toContain('2 Häuser · 26 kW');
      expect(text).toContain('Deine 25er ist hier zu dünn.');
      const knopf40 = u.knoepfe().find((k) => k.isConnected && k.attrs['data-id'] === 'farbe-d40');
      if (s.freigeschaltet('d40')) expect(knopf40?.attrs['data-noetig']).toBe('ja');
    });
  });

  it('mit der passenden 40er gewählt: keine Warnung', async () => {
    const s = eingezeichnet();
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d40');
      tippeFeld(u, 8, 9);
      const text = norm(vorschau(u)!.textContent);
      expect(text).toContain('Hier nötig: 40er');
      expect(text).not.toContain('zu dünn');
    });
  });
});
