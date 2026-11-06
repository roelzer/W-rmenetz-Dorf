import { describe, expect, it, vi } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { KATALOG } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { attrappe, type AttrappenElement } from './hilfen/kontext-attrappe';
import { gesperrt, gesperrtMitHinweis } from './hilfen/gesperrt';
import { objektBei } from './hilfen/nr18';

// NR19 Puffer-Übergabestation, Hausblatt (Bauplan docs/bauplaene/NR18-ohne-autoanschluss.md, Abschnitt 5.5 und „Bauplan P6“).
// Echte Kontextkarte mit dem echten Kern ohne Browser; ersetzt werden nur Seitenblatt und Toast (Hinweis beim Antippen mitlesen).
// Zahlen von Hand: EFH 15.000 kWh ÷ 2.000 h = 7,5 kW, ÷ 1.500 h = 10 kW; HP 800 kostet 2.000 € + 3.570 € = 5.570 €.
// Geschützte Leerzeichen (\u00a0) nach DESIGN 12.23: Zahl–Einheit, Knopf-Zeile 2 bricht nur vor dem Preis um.

const T0 = 1_000_000_000_000;

function altesDorf(stufe = 1): Spiel {
  const s = new Spiel(altesStartdorf(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 100_000;
  s.neuBerechnen();
  return s;
}
const bei = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => KATALOG[o.typ].kategorie === 'haus')!;
const ohneStation = (s: Spiel): Objekt => { const o = bei(s, 13, 12); expect(o.ohne_station).toBe(true); return o; };
const mitWand = (s: Spiel): Objekt => { const o = bei(s, 9, 13); expect(o.station).toBe('st_15'); return o; };

type Knopf = { z1: string; z2: string; klasse: string; aus: boolean; mitHinweis: boolean; schloss: boolean; tippen: () => void };

/** Hauskarte aufbauen; liefert Text, Knöpfe (Zeile 1 / Zeile 2) und die Toasts, wenn `antippen` einen Knopf wählt (solange die Attrappe aktiv ist). */
async function karte(s: Spiel, o: Objekt, antippen?: (k: Knopf[]) => Knopf | undefined) {
  const a = attrappe(), toasts: string[] = [];
  vi.resetModules();
  // „Weniger Bewegung“ an: gesperrte Knöpfe wackeln nicht (die Attrappe kennt keine classList)
  vi.stubGlobal('document', { ...a.doc, body: { classList: { contains: () => true } } }); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  vi.doMock('../src/ui/blatt', () => ({ blattOeffnen: () => ({ inhalt: new a.El('div'), zu: () => {} }), blattOffen: () => false }));
  vi.doMock('../src/ui/toast', async (orig) => ({ ...(await orig<typeof import('../src/ui/toast')>()), toast: (t: string) => { toasts.push(t); } }));
  try {
    const { Kontext } = await import('../src/ui/kontext');
    const ui = { spiel: s, jetzt_ms: () => T0, geaendert: () => {}, stempeln: () => {}, toast: () => {}, katalog: () => {} };
    const k = new Kontext(ui as unknown as ConstructorParameters<typeof Kontext>[0], () => {});
    const c = new a.El('div');
    (k as unknown as { inhalt: (c: unknown, o: Objekt) => void }).inhalt(c, o);
    const istSmall = (n: unknown) => n instanceof a.El && n.tag === 'small';
    const knoepfe: Knopf[] = a.alle(c).filter((e) => e.tag === 'button').map((e: AttrappenElement) => ({
      z1: e.kinder.filter((n) => !istSmall(n)).map(a.text).join(''),
      z2: e.kinder.filter(istSmall).map(a.text).join(''),
      klasse: e.className, aus: gesperrt(e), mitHinweis: gesperrtMitHinweis(e),
      schloss: a.alle(e).some((x) => x.className.includes('schloss')),
      tippen: () => e.on.click?.(),
    }));
    const absaetze = a.alle(c).filter((e) => e.tag === 'p').map(a.text);
    const ueberschriften = a.alle(c).filter((e) => e.tag === 'h4').map((e) => ({ text: a.text(e), stil: e.attrs.style }));
    antippen?.(knoepfe)?.tippen();
    return { text: a.text(c), knoepfe, absaetze, ueberschriften, toasts };
  } finally { vi.unstubAllGlobals(); vi.doUnmock('../src/ui/blatt'); vi.doUnmock('../src/ui/toast'); }
}
const puffer = (k: { knoepfe: Knopf[] }) => k.knoepfe.filter((x) => x.z1.startsWith('Puffer-Übergabestation'));
const MIT = 'Mit Puffer: 15.000\u00a0kWh ÷ 2.000\u00a0h = 7,5\u00a0kW aus dem Netz. Der Speicher fängt die Spitze ab.';
const OHNE = 'Ohne Puffer: 15.000\u00a0kWh ÷ 1.500\u00a0h = 10\u00a0kW – das Netz muss die Spitze liefern.';
const KEIN_PUFFER_REICHT = 'Keine Puffer-Station reicht mehr. Mit der Wandstation fällt der Puffer weg.';
/** Knopf-Zeile 2 der Puffer-Reihe: „{kW} kW vom Netz ·“ gebunden, Umbruch nur vor dem Preis, Preis gebunden vor „€“. */
const z2 = (kw: string, preis: string) => `${kw}\u00a0kW\u00a0vom\u00a0Netz\u00a0· ${preis}\u00a0€`;
/** Zwischenüberschrift DESIGN 12.23: Manrope 800, 14 px, Farbe text, Abstand oben 16, unten 4 (Tokens). */
const ZWISCHEN = 'margin:var(--abstand-px-3) 0 var(--abstand-px-0);font-family:var(--schrift-text);font-weight:800;font-size:var(--schrift-groesse-px-text);color:var(--menue-farbe-text)';
const reihen = (k: { ueberschriften: { text: string; stil: string }[] }) => k.ueberschriften.map((u) => u.text);
const NUR_BEIM_ANSCHLUSS = 'Den Puffer wählst du nur beim Anschluss.';

describe('NR19 Hausblatt – Stationswahl mit zwei Reihen', () => {
  it('NR19: Haus ohne Station auf Stufe 1 – Reihe „Mit Pufferspeicher“ mit HP 800 (Gold), darunter die Wandstation', async () => {
    const s = altesDorf(1), k = await karte(s, ohneStation(s));
    expect(k.text).toContain('Übergabestation wählen');
    const p = puffer(k);
    expect(p.map(({ z1, z2, aus }) => ({ z1, z2, aus }))).toEqual([{ z1: 'Puffer-Übergabestation HP 800', z2: z2('7,5', '5.570'), aus: false }]);
    expect(p[0].klasse.split(' ')).toContain('geld');
    const wand = k.knoepfe.filter((x) => x.z1 === 'Station einbauen');
    expect(wand.map((x) => x.z2)).toEqual(['Wandstation Typ 15 · 2.400 €']);
    expect(k.ueberschriften).toEqual([{ text: 'Mit Pufferspeicher', stil: ZWISCHEN }, { text: 'Wandstation ohne Puffer', stil: ZWISCHEN }]);
    expect(k.absaetze).not.toContain('Mit Pufferspeicher');
    expect(k.knoepfe.indexOf(p[0])).toBeLessThan(k.knoepfe.indexOf(wand[0]));
  });

  it('NR19: freie Stationswahl – Puffer-Reihe höchstens 2 Knöpfe, nur die kleinste passende in Gold; Wandreihe bis 3', async () => {
    const s = altesDorf(2), k = await karte(s, ohneStation(s));
    const p = puffer(k);
    expect(p.map((x) => [x.z1, x.z2])).toEqual([
      ['Puffer-Übergabestation HP 800', z2('7,5', '5.570')],
      ['Puffer-Übergabestation HP 1000', z2('7,5', '6.570')],
    ]);
    expect(p.map((x) => x.klasse.split(' ').includes('geld'))).toEqual([true, false]);
    expect(k.knoepfe.filter((x) => x.z1.startsWith('Wandstation')).map((x) => x.z1)).toEqual(['Wandstation Typ 15 · 15 kW', 'Wandstation Typ 25 · 25 kW', 'Wandstation Typ 40 · 40 kW']);
  });

  it('NR19: Texte [F] wörtlich – Erklärzeilen mit und ohne Puffer und der Satz zum Anschluss', async () => {
    const s = altesDorf(1), k = await karte(s, ohneStation(s));
    expect(k.absaetze).toContain(MIT);
    expect(k.absaetze).toContain(OHNE);
    expect(k.absaetze).toContain(NUR_BEIM_ANSCHLUSS);
    for (const t of [MIT, OHNE, NUR_BEIM_ANSCHLUSS]) expect(t.length).toBeLessThanOrEqual(90);
  });

  it('NR19: Erklärzeile „Ohne Puffer: …“ nur bei der Stationswahl – nicht mit Wandstation, Puffer-Station oder am Großabnehmer', async () => {
    const s = altesDorf(2), w = mitWand(s);
    const h = ohneStation(s);
    expect(s.stationKaufen(h.id, 'hp_800').ok).toBe(true);
    const g = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'gross' && o.ohne_station)!;
    g.zustand = 'vertrag';
    for (const o of [w, h, g]) {
      const k = await karte(s, o);
      expect(k.text).not.toContain('Ohne Puffer:');
      expect(k.text).not.toContain(NUR_BEIM_ANSCHLUSS);
    }
  });

  it('NR19: Großabnehmer – nur Stationen ohne Puffer', async () => {
    const s = altesDorf(2);
    const g = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'gross' && o.ohne_station)!;
    g.zustand = 'vertrag';
    const k = await karte(s, g);
    expect(k.text).toContain('Übergabestation wählen');
    expect(k.knoepfe.length).toBeGreaterThan(0);
    expect(puffer(k)).toEqual([]);
    expect(k.text).not.toContain('Mit Pufferspeicher');
  });

  it('NR19: Haus mit Wandstation ohne Puffer – keine Puffer-Reihe, auch wenn die Station zu klein wird', async () => {
    const s = altesDorf(2), w = mitWand(s);
    w.vollversorgung = true; w.aufgestockt = true; s.neuBerechnen(); // 21 kW > 15 kW
    const k = await karte(s, w);
    expect(k.text).toContain('Station zu klein');
    expect(puffer(k)).toEqual([]);
    expect(k.text).not.toContain('Mit Pufferspeicher');
    expect(k.knoepfe.filter((x) => x.z1.startsWith('Wandstation')).map((x) => x.z1)).toEqual(['Wandstation Typ 25 · 25 kW', 'Wandstation Typ 40 · 40 kW', 'Wandstation Typ 60 · 60 kW']);
  });

  it('NR19: MFH Kamin aus und aufgestockt (47,25 kW Netz) – keine Puffer-Station reicht, nur die Wandreihe', async () => {
    const s = altesDorf(1), m = ohneStation(s);
    m.typ = 'mfh'; m.vollversorgung = true; m.aufgestockt = true; s.neuBerechnen();
    const k = await karte(s, m);
    expect(puffer(k)).toEqual([]);
    expect(k.text).not.toContain('Mit Pufferspeicher'); expect(k.text).not.toContain('Ohne Puffer:');
    expect(k.knoepfe.filter((x) => x.z1 === 'Station einbauen').map((x) => x.z2)).toEqual(['Wandstation Typ 80 · 9.000 €']);
  });

  it('NR19: Haus mit HP 800 – Tausch nur gegen größere Puffer-Stationen, keine Wandreihe (Review P6 W1, Weg a)', async () => {
    const s = altesDorf(2), h = ohneStation(s);
    expect(s.stationKaufen(h.id, 'hp_800').ok).toBe(true);
    const k = await karte(s, h);
    expect(k.text).toContain('Übergabestation tauschen');
    // Rückkauf der HP 800 zu 50 %: 6.570 − 2.785 = 3.785 €, 7.570 − 2.785 = 4.785 €
    expect(puffer(k).map((x) => [x.z1, x.z2])).toEqual([
      ['Puffer-Übergabestation HP 1000', z2('7,5', '3.785')],
      ['Puffer-Übergabestation ÜP 1000', z2('7,5', '4.785')],
    ]);
    expect(reihen(k)).toEqual(['Mit Pufferspeicher']);
    expect(k.knoepfe.filter((x) => x.z1.startsWith('Wandstation') || x.z2.startsWith('Wandstation'))).toEqual([]);
  });

  it('NR19: Haus mit HP 800, Kamin aus und aufgestockt, ohne Stationswahl – nur „HP 1000“, keine größere Wandstation', async () => {
    const s = altesDorf(1), h = ohneStation(s);
    expect(s.stationKaufen(h.id, 'hp_800').ok).toBe(true);
    h.vollversorgung = true; h.aufgestockt = true; s.neuBerechnen(); // 15,75 kW Netz > 14 kW, 21 kW Spitze > 19 kW
    const k = await karte(s, h);
    expect(k.text).toContain('Station zu klein');
    // Nur Name und Preis: 15,75 kW zeigt kw() wegen der Gleitkommazahl 15,749… als „15,7“ (eigener Befund, nicht Teil dieser Regel).
    expect(puffer(k).map((x) => x.z1)).toEqual(['Puffer-Übergabestation HP 1000']);
    expect(puffer(k)[0].z2.endsWith('\u00a0· 3.785\u00a0€')).toBe(true);
    expect(k.knoepfe.filter((x) => x.z1 === 'Größere Station einbauen')).toEqual([]);
    expect(reihen(k)).toEqual(['Mit Pufferspeicher']);
  });

  it('NR19: Haus mit ÜP 1000, keine Puffer-Station reicht mehr – Wandstation nach Bedarf ohne Puffer mit Hinweis', async () => {
    // MFH 45.000 kWh × 1,5 × 1,4 = 94.500 kWh: mit Puffer 47,25 kW > 40 kW, ohne Puffer 63 kW → Typ 80; 9.000 − 7.570 ÷ 2 = 5.215 €
    const s = altesDorf(1), m = ohneStation(s);
    m.typ = 'mfh'; s.neuBerechnen();
    expect(s.stationKaufen(m.id, 'up_1000').ok).toBe(true);
    m.vollversorgung = true; m.aufgestockt = true; s.neuBerechnen();
    const k = await karte(s, m);
    expect(puffer(k)).toEqual([]);
    expect(k.knoepfe.filter((x) => x.z1 === 'Größere Station einbauen').map((x) => x.z2)).toEqual(['Wandstation Typ 80 · 5.215 €']);
    expect(k.absaetze).toContain(KEIN_PUFFER_REICHT);
    expect(k.absaetze).toContain('Ohne Puffer: 94.500\u00a0kWh ÷ 1.500\u00a0h = 63\u00a0kW – das Netz muss die Spitze liefern.');
    expect(reihen(k)).toEqual(['Wandstation ohne Puffer']);
    expect(KEIN_PUFFER_REICHT.length).toBeLessThanOrEqual(90);
  });

  it('NR19: alter Stand mit Puffer ohne Station – Wandstation rechnet mit dem Puffer, kein Satz „Ohne Puffer: … 1.500 h“', async () => {
    const s = altesDorf(1), h = ohneStation(s);
    h.hauspuffer = true; s.neuBerechnen();
    const k = await karte(s, h);
    expect(k.absaetze).toContain(MIT);
    expect(k.absaetze.filter((t) => t.startsWith('Ohne Puffer:'))).toEqual([]);
    expect(reihen(k)).toEqual(['Mit Pufferspeicher', 'Wandstation']);
    expect(k.knoepfe.filter((x) => x.z1 === 'Station einbauen').map((x) => x.z2)).toEqual(['Wandstation Typ 15 · 2.400 €']);
  });

  it('NR19: Puffer-Knopf mit zu wenig Geld – Preis bleibt, kein Schloss, Hinweis nennt den Fehlbetrag', async () => {
    const s = altesDorf(1), h = ohneStation(s);
    s.stand.geld_eur = 1000;
    const k = await karte(s, h, (kn) => puffer({ knoepfe: kn })[0]);
    const [p] = puffer(k);
    expect(p.mitHinweis).toBe(true);
    expect(p.z2).toBe(z2('7,5', '5.570'));
    expect(p.schloss).toBe(false);
    expect(k.toasts).toEqual(['Dir fehlen noch 4.570 €. Am Monatsende zahlen deine Kunden ihre Wärmerechnung.']);
    expect(h.station).toBeUndefined();
  });
});

describe('NR19 Hausblatt – Zeile „Übergabestation“, alter Kasten, Anfrage', () => {
  it('NR19: Zeile „Übergabestation“ für Puffer-Station, Wandstation mit altem Puffer und Wandstation', async () => {
    const s = altesDorf(1), h = ohneStation(s), w = mitWand(s);
    expect((await karte(s, w)).text).toContain('Übergabestation' + 'Wandstation Typ 15 · 15 kW');
    expect((await karte(s, w)).text).not.toContain('mit Puffer');
    expect(s.stationKaufen(h.id, 'hp_800').ok).toBe(true);
    const kp = await karte(s, h);
    expect(kp.text).toContain('Übergabestation' + 'Puffer HP\u00a0800' + 'Leistung Station' + '14\u00a0kW Netz · 19\u00a0kW Haus');
    w.hauspuffer = true;
    expect((await karte(s, w)).text).toContain('Wandstation Typ 15 · 15 kW, mit Puffer');
  });

  it('NR19: kein Kasten „Pufferspeicher im Haus“ und kein Knopf „Puffer einbauen“ mehr', async () => {
    for (const stufe of [1, 3]) {
      const s = altesDorf(stufe);
      for (const o of [ohneStation(s), mitWand(s)]) {
        const k = await karte(s, o);
        expect(k.text).not.toContain('Pufferspeicher im Haus');
        expect(k.knoepfe.some((x) => x.z1.includes('Puffer einbauen'))).toBe(false);
      }
    }
  });

  it('NR19: Anfrage-Kasten – Chip „Station dann zu klein“ über stationReicht mit dem Bedarf nach der Anfrage', async () => {
    const s = altesDorf(1), h = mitWand(s);
    h.station = 'hp_800'; h.hauspuffer = true; s.neuBerechnen();
    h.anfrage = 'vollversorgung'; // danach 11,25 kW Netz ≤ 14, 15 kW Spitze ≤ 19
    expect((await karte(s, h)).text).not.toContain('Station dann zu klein');
    h.vollversorgung = true; h.anfrage = 'aufstockung'; // danach 15,75 kW Netz > 14
    expect((await karte(s, h)).text).toContain('Station dann zu klein');
  });
});
