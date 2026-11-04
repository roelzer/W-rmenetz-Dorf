import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG, KONSTANTEN, PREISSTUFEN, istLeitung } from '../src/core/katalog';

const T0 = 1_000_000_000_000;
const neuesSpiel = (): Spiel => new Spiel(neuerSpielstand(T0), () => T0);

describe('A22/A29 Start', () => {
  it('A29: Start mit 100.000 €, Wärmepreis 12 ct/kWh, zwei angeschlossene Häuser, ein weiteres nicht', () => {
    const s = neuesSpiel();
    expect(s.stand.geld_eur).toBe(100_000);
    expect(PREISSTUFEN[s.stand.preisstufe].ct_je_kwh).toBe(12);
    s.ersteQuelleWaehlen('kessel');
    const nah = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && Math.hypot(o.x - 11, o.y - 10) < 5);
    expect(nah).toHaveLength(3);
    expect(nah.filter((o) => s.netz.warm.has(o.id))).toHaveLength(2);
    expect(s.stand.quelle_gewaehlt).toBe(true);
  });
  it('A29: Wärmepreis reicht von 7 bis 15 ct/kWh; die Vergütung folgt dem Preis je kWh', () => {
    expect(PREISSTUFEN[0].ct_je_kwh).toBe(7);
    expect(PREISSTUFEN.at(-1)!.ct_je_kwh).toBe(15);
    for (const p of PREISSTUFEN) expect(p.einnahmefaktor).toBeCloseTo(p.ct_je_kwh / 14, 9);
  });
  it('A30: Leitungstausch kostet den Neupreis minus 50 % des Altpreises', () => {
    const s = neuesSpiel();
    s.ersteQuelleWaehlen('kessel');
    const leitung = s.stand.objekte.find((o) => o.typ === 'd50')!;
    const vorher = s.stand.geld_eur;
    expect(s.leitungTauschen(leitung.id, 'd63').ok).toBe(true);
    expect(vorher - s.stand.geld_eur).toBe(KATALOG.d63.kosten_eur![0] - Math.round(KATALOG.d50.kosten_eur![0] * KONSTANTEN.rueckkauf_anteil));
  });
});

/** Mittelpunkt (mx, my) eines freien Plus-Zeichens (5 Felder) irgendwo auf der Karte. */
function freiesPlus(s: Spiel): [number, number] {
  for (let y = 1; y < 23; y++) for (let x = 1; x < 23; x++)
    if ([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => s.kannPlatzieren('d50', x + dx, y + dy))) return [x, y];
  throw new Error('kein freier Platz');
}

describe('A23 Leitungen wie in echt', () => {
  it('A23: ein T-Stück ist erlaubt, die Kreuzung (vierter Arm) wird abgelehnt', () => {
    const s = neuesSpiel();
    s.stand.geld_eur = 10_000;
    const [mx, my] = freiesPlus(s);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 0]]) expect(s.platzieren('d50', mx + dx, my + dy).ok).toBe(true); // T-Stück
    expect(s.machtKreuzung(mx, my + 1)).toBe(true);
    const r = s.platzieren('d50', mx, my + 1);
    expect(r.ok).toBe(false);
    expect(r.hinweis).toMatch(/Kreuzung/);
  });
  it('A23: Hausanschluss darf dünner sein als die Hauptleitung (kein Planungsfehler)', () => {
    const s = neuesSpiel();
    s.stand.geld_eur = 10_000;
    s.ersteQuelleWaehlen('kessel');
    for (const [x, y] of [[11, 12], [11, 13]]) s.platzieren('d50', x, y);
    for (const [x, y] of [[10, 13]]) s.platzieren('d25', x, y);
    expect(s.netz.engpass.size).toBe(0);
    expect(s.netz.warm.size).toBeGreaterThanOrEqual(1);
  });
});

describe('A31 Verkaufen zu 50 %', () => {
  it('A31: Außenanlage und Heizhaus-Quelle werden zu 50 % des Einkaufspreises zurückgekauft', () => {
    const s = neuesSpiel();
    s.stand.geld_eur = 100_000;
    s.ersteQuelleWaehlen('kessel');
    s.stand.objekte.push({ id: 900, typ: 'puffer', x: 2, y: 2, stufe: 1, bau: null, kasse_eur: 0 });
    const vor = s.stand.geld_eur;
    expect(s.verkaufen(900).ok).toBe(true);
    expect(s.stand.geld_eur - vor).toBe(Math.round(KATALOG.puffer.kosten_eur![0] * 0.5));
    s.hz.stufe = 2;
    s.innenEinbauen('wpg', true);
    const v2 = s.stand.geld_eur;
    expect(s.innenVerkaufen(1).ok).toBe(true);
    expect(s.stand.geld_eur - v2).toBe(Math.round(KATALOG.wpg.kosten_eur![0] * 0.5));
    expect(s.innenVerkaufen(0).ok).toBe(false);
  });
  it('A30: entfernte Leitung bringt 50 % zurück', () => {
    const s = neuesSpiel();
    const l = s.stand.objekte.find((o) => o.typ === 'd50')!;
    const vor = s.stand.geld_eur;
    s.entfernen(l.id);
    expect(s.stand.geld_eur - vor).toBe(Math.round(KATALOG.d50.kosten_eur![0] * 0.5));
  });
});

describe('A24 Pufferspeicher außen', () => {
  it('A24: Puffer zählt ohne eigene Leitung als mit der Heizzentrale verbunden', () => {
    const s = neuesSpiel();
    s.stand.geld_eur = 10_000;
    s.ersteQuelleWaehlen('kessel');
    s.stand.objekte.push({ id: 900, typ: 'puffer', x: 2, y: 2, stufe: 1, bau: null, kasse_eur: 0 });
    s.neuBerechnen();
    expect(s.netz.anschluss.has(900)).toBe(true);
  });
});

describe('A26 Spieltempo', () => {
  it('A26: Bauzeiten sind mit dem Tempo-Faktor verlängert', () => {
    expect(KONSTANTEN.bauzeit_faktor).toBeGreaterThan(1);
    const s = neuesSpiel();
    s.stand.geld_eur = 10_000;
    s.ersteQuelleWaehlen('kessel');
    s.platzieren('efh', 1, 1);
    const b = s.stand.objekte.at(-1)!.bau!;
    expect(b.ende_ms - b.start_ms).toBe(KATALOG.efh.bauzeit_s![0] * KONSTANTEN.bauzeit_faktor * 1000);
  });
});
