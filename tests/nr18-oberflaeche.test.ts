import { afterEach, describe, expect, it, vi } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { KONSTANTEN, type TypId } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';
import { gesperrtMitHinweis } from './hilfen/gesperrt';

// NR18-P3 (Bauplan NR18 Fassung 3, Abschnitt 5.1, 6 und „Bauplan P3“): Oberfläche ohne „Hausanschluss ziehen“, Ersatz dickerer
// Leitungen nur im offenen Bauabschnitt, Warnliste im Baumenü, Markierung zu dünner Stellen. Echte Steuerung mit echtem Blatt
// (tests/hilfen/echte-steuerung.ts) auf dem alten Startdorf. Die Kern-Methoden aus P2 (ersatzPlanen, geplanteLeitungTyp,
// abschnittWarnungen) werden per vi.spyOn ersetzt – geprüft wird nur, was die Oberfläche damit macht.
// Preise von Hand aus src/core/katalog.ts: Rohpreis × kosten_faktor 40 → 25er 400 €, 32er 560 €, 40er 800 €, 50er 1.120 €;
// Ersatz (E1) = Neupreis − 50 % des Altpreises; Spülbohrung 8.000 € je Flussfeld (Fluss auf x = 19 und 20, orte.ts).

const T0 = 1_000_000_000_000;
const N = KONSTANTEN.feldanzahl;
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const B1_HINWEIS = 'Erst mit Philipp einen Bauabschnitt planen: Bauen → Leitungen.';
// umgebaut NR18-D 06.11.: Im Hausblatt zeigt der Hinweis ohne Abschnitt auf den Philipp-Knopf direkt darüber (DESIGN 12.22);
// die Leitungskarte behält B1_HINWEIS.
const B1_HINWEIS_HAUS = 'Erst mit Philipp einen Bauabschnitt planen – Knopf direkt darüber.';

type Uhr = { t: number };
const neu = (stufe = 1, uhr: Uhr = { t: T0 }): Spiel => {
  const s = new Spiel(altesStartdorf(T0), () => uhr.t);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
const offen = (s: Spiel): Spiel => { s.stand.abschnitt = { phase: 'offen', bau: null }; return s; };
const bei = (s: Spiel, x: number, y: number): Objekt => s.stand.objekte.find((o) => o.x === x && o.y === y)!;
const lege = (s: Spiel, typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}): Objekt => {
  const o: Objekt = { id: s.stand.naechste_id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra };
  s.stand.objekte.push(o); return o;
};
const PHASEN = [
  { name: 'ohne Abschnitt', abschnitt: undefined, kurz: 'kein Bauabschnitt', hinweis: B1_HINWEIS },
  { name: 'Planung', abschnitt: { phase: 'planung', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 30_000 } }, kurz: 'wird noch geplant', hinweis: 'Philipp plant den Bauabschnitt noch (30s). Danach kannst du zeichnen.' },
  { name: 'Bestellen', abschnitt: { phase: 'bestellen', bau: null }, kurz: 'Bestellung offen', hinweis: 'Abschnitt wartet auf Lauras Bestellung. Ändern: Bauen → Leitungen → Weiter einzeichnen.' },
  { name: 'Bau', abschnitt: { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 30_000 } }, kurz: 'Abschnitt im Bau', hinweis: 'Der Bauabschnitt wird gerade gebaut (30s). Danach kannst du den nächsten planen.' },
] as const;
const phaseSetzen = (s: Spiel, p: (typeof PHASEN)[number]): void => {
  if (p.abschnitt) s.stand.abschnitt = structuredClone(p.abschnitt) as typeof s.stand.abschnitt; else delete s.stand.abschnitt;
};

afterEach(() => { vi.restoreAllMocks(); });

// ───────────── Suchhilfen ─────────────
const knoepfe = (u: EchteUmgebung): El[] => u.knoepfe().filter((k) => k.isConnected);
const mit = (u: EchteUmgebung, anfang: string): El[] => knoepfe(u).filter((k) => norm(k.textContent).startsWith(anfang));
const namen = (u: EchteUmgebung, anfang: string): string[] => mit(u, anfang).map((k) => norm(k.textContent));
/** Zeile 2 = Text des <small> im Knopf */
const zeile2 = (k: El): string => norm(k.querySelector('small')?.textContent ?? '');
const istGold = (k: El): boolean => k.classList.contains('geld');
/** Text der offenen Karte (Seitenblatt), ohne Leerzeichenart */
const blattText = (u: EchteUmgebung): string => norm(u.dom.html.querySelectorAll('.blatt').filter((b) => b.isConnected).map((b) => b.textContent).join(' '));
/** Feld (x|y) wie ein Finger antippen bzw. wischen (echte Zeigerereignisse auf der Leinwand) */
function punkt(u: EchteUmgebung, x: number, y: number): [number, number] {
  const k = u.st.kamera as unknown as { mitte(x: number, y: number): [number, number]; feld(a: number, b: number): [number, number] };
  const [mx, my] = k.mitte(x, y);
  expect(k.feld(mx, my), `Testaufbau: Feld (${x}|${y}) ist auf der Leinwand sichtbar`).toEqual([x, y]);
  return [mx, my];
}
function wische(u: EchteUmgebung, felder: Array<[number, number]>): void {
  const canvas = u.dom.app.querySelector('canvas')!;
  const evs = felder.map(([x, y]) => { const [mx, my] = punkt(u, x, y); return { pointerId: 7, clientX: mx, clientY: my, pointerType: 'touch', button: 0 }; });
  canvas.ausloesen('pointerdown', evs[0]);
  for (const ev of evs.slice(1)) canvas.ausloesen('pointermove', ev);
  canvas.ausloesen('pointerup', evs[evs.length - 1]);
}
const hilfeZu = (u: EchteUmgebung): void => { knoepfe(u).find((k) => norm(k.textContent) === 'Verstanden')?.click(); };

describe('NR18-P3 Hausblatt – kein „Hausanschluss ziehen“', () => {
  it('test_nr18_hausblatt_knoepfe: je Phase genau „Leitung selbst legen“ (gesperrt mit Kurzform und Hinweis), offen frei, mit eingezeichneter Leitung „Hausanschluss geplant“', async () => {
    const uhr = { t: T0 };
    for (const p of PHASEN) {
      const s = neu(1, uhr); phaseSetzen(s, p);
      await echteSteuerung(s, (u) => {
        u.st.kontext(bei(s, 9, 15).id);
        expect(namen(u, 'Hausanschluss ziehen'), p.name).toEqual([]);
        const k = mit(u, 'Leitung selbst legen');
        expect(k, p.name).toHaveLength(1);
        expect(gesperrtMitHinweis(k[0]), p.name).toBe(true);
        expect(zeile2(k[0]), p.name).toBe(p.kurz);
        k[0].click();
        const hinweis = p.abschnitt ? p.hinweis : B1_HINWEIS_HAUS; // umgebaut NR18-D 06.11.: Hausblatt ohne Abschnitt
        expect(norm(u.meldung()), p.name).toBe(hinweis);
        if (p.abschnitt) expect(norm(u.meldung()), `${p.name}: Philipp-Knopf-Hinweis nur ohne Abschnitt`).not.toContain('Knopf direkt darüber');
        expect(hinweis.length, 'Hinweis ≤ 90 Zeichen (Abschnitt 6)').toBeLessThanOrEqual(90);
      }, { uhr: () => uhr.t });
    }
    const s = offen(neu(1, uhr));
    await echteSteuerung(s, (u) => {
      u.st.kontext(bei(s, 9, 15).id);
      expect(namen(u, 'Hausanschluss ziehen')).toEqual([]);
      const k = mit(u, 'Leitung selbst legen');
      expect(k).toHaveLength(1);
      expect(gesperrtMitHinweis(k[0])).toBe(false);
    }, { uhr: () => uhr.t });
    // Eine eingezeichnete Leitung endet am Haus (9|15): (10|15) unter der Vorsehung (10|14)
    expect(s.platzieren('d25', 10, 15).ok).toBe(true);
    await echteSteuerung(s, (u) => {
      u.st.kontext(bei(s, 9, 15).id);
      expect(namen(u, 'Leitung selbst legen')).toEqual([]);
      expect(namen(u, 'Hausanschluss ziehen')).toEqual([]);
      expect(namen(u, 'Hausanschluss geplant')).toHaveLength(1);
    }, { uhr: () => uhr.t });
  });
});

describe('NR18-P3 Leitungskarte – Ersetzen nur im offenen Bauabschnitt', () => {
  it('test_nr18_leitungskarte_ersetzen: offen – nur dickere freie Leitungen, Gold, Preis nach E1, Tippen plant den Ersatz', async () => {
    const s = offen(neu(1));
    const ersatz = vi.spyOn(s, 'ersatzPlanen').mockReturnValue({ ok: true });
    await echteSteuerung(s, (u) => {
      u.st.kontext(bei(s, 11, 14).id); // gebaute 25er
      const k = mit(u, 'Ersetzen:');
      expect(k.map((e) => norm(e.textContent))).toEqual(['Ersetzen: 32er360 €', 'Ersetzen: 40er600 €']); // umgebaut NR18-D 06.11.: Kurzname (DESIGN 12.22)
      expect(k.map(istGold)).toEqual([true, true]);
      expect(k.map(zeile2)).toEqual(['360 €', '600 €']);
      expect(namen(u, 'Tauschen:')).toEqual([]);
      expect(namen(u, 'Dickere Leitung')).toEqual([]);
      k[1].click();
      expect(ersatz).toHaveBeenCalledWith(bei(s, 11, 14).id, 'd40');
      expect(ersatz).toHaveBeenCalledTimes(1);
      // Gebaute 40er auf Stufe 1: nichts Dickeres ist frei – keine dünneren Ersetzen-Knöpfe, nur der gesperrte „Dickere“
      u.st.kontext(bei(s, 10, 12).id);
      expect(namen(u, 'Ersetzen:')).toEqual([]);
      expect(namen(u, 'Dickere')).toEqual(['Dickereab Heizzentrale Stufe 2']);
    });
  });

  it('test_nr18_leitungskarte_ersetzen: Flussfeld – Preis mit Spülbohrung', async () => {
    const s = offen(neu(2));
    const fluss = lege(s, 'd25', 19, 2);
    expect(s.istFluss(19, 2), 'Testaufbau: (19|2) liegt im Fluss').toBe(true);
    await echteSteuerung(s, (u) => {
      u.st.kontext(fluss.id);
      // 560 − 200 + 8.000 = 8.360 €; 800 − 200 + 8.000 = 8.600 €; 1.120 − 200 + 8.000 = 8.920 €; 1.520 − 200 + 8.000 = 9.320 €
      expect(mit(u, 'Ersetzen:').map(zeile2)).toEqual(['8.360 €', '8.600 €', '8.920 €', '9.320 €']);
    });
  });

  it('test_nr18_leitungskarte_ersetzen: außerhalb des offenen Abschnitts – ein gesperrter Knopf „Dickere Leitung“ mit Grund und Hinweis', async () => {
    const uhr = { t: T0 };
    for (const p of PHASEN) {
      const s = neu(1, uhr); phaseSetzen(s, p);
      await echteSteuerung(s, (u) => {
        u.st.kontext(bei(s, 11, 14).id);
        expect(namen(u, 'Ersetzen:'), p.name).toEqual([]);
        expect(namen(u, 'Tauschen:'), p.name).toEqual([]);
        const k = mit(u, 'Dickere Leitung');
        expect(k, p.name).toHaveLength(1);
        expect(gesperrtMitHinweis(k[0]), p.name).toBe(true);
        expect(zeile2(k[0]), p.name).toBe(p.kurz);
        expect(k[0].querySelectorAll('svg').length, `${p.name}: Schloss vor dem Grund`).toBe(1);
        k[0].click();
        expect(norm(u.meldung()), p.name).toBe(p.hinweis);
      }, { uhr: () => uhr.t });
    }
    // Nichts ist dicker als die 110er: kein Knopf
    const s = neu(3);
    const dick = lege(s, 'd110', 3, 20);
    await echteSteuerung(s, (u) => {
      u.st.kontext(dick.id);
      expect(namen(u, 'Dickere Leitung')).toEqual([]);
      expect(namen(u, 'Ersetzen:')).toEqual([]);
    });
  });

  it('test_nr18_leitungskarte_ersetzen: geplanter Ersatz – Satz mit Kurzname, „Ersatz zurücknehmen“ nimmt ihn über den Radierer-Weg zurück', async () => {
    const s = offen(neu(1));
    const l = bei(s, 11, 14);
    l.ersatz = { typ: 'd40', nr: s.stand.naechste_id++ };
    const zurueck = vi.spyOn(s, 'geplanteLeitungEntfernen').mockReturnValue({ ok: true });
    await echteSteuerung(s, (u) => {
      u.st.kontext(l.id);
      expect(blattText(u)).toContain('Wird im Bauabschnitt durch eine 40er ersetzt.');
      expect(namen(u, 'Ersetzen:')).toEqual([]);
      const k = mit(u, 'Ersatz zurücknehmen');
      expect(k).toHaveLength(1);
      expect(gesperrtMitHinweis(k[0])).toBe(false);
      k[0].click();
      expect(zurueck).toHaveBeenCalledWith(11, 14);
    });
    // Abschnitt abgeschlossen: Satz bleibt, Zurücknehmen und Dickere gibt es dort nicht
    s.stand.abschnitt = { phase: 'bestellen', bau: null };
    await echteSteuerung(s, (u) => {
      u.st.kontext(l.id);
      expect(blattText(u)).toContain('Wird im Bauabschnitt durch eine 40er ersetzt.');
      expect(namen(u, 'Ersatz zurücknehmen')).toEqual([]);
      expect(namen(u, 'Dickere Leitung')).toEqual([]);
    });
  });

  it('test_nr18_leitungskarte_ersetzen: eingezeichnete Leitung bekommt keine Ersetzen-Knöpfe', async () => {
    const s = offen(neu(1));
    expect(s.platzieren('d25', 10, 15).ok).toBe(true);
    await echteSteuerung(s, (u) => {
      u.st.kontext(bei(s, 10, 15).id);
      expect(namen(u, 'Ersetzen:')).toEqual([]);
      expect(namen(u, 'Dickere Leitung')).toEqual([]);
    });
  });
});

describe('NR18-P3 Zeichnen über vorhandene Leitungen', () => {
  it('verbindet beim Ziehen über die Naht nur den gewählten Übergang zum Bestand', async () => {
    const s = offen(neu(2));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d40'); hilfeZu(u);
      wische(u, [[9, 11], [9, 12]]);
      const neuOben = bei(s, 9, 11), altOben = bei(s, 10, 11);
      const neuUnten = bei(s, 9, 12), altUnten = bei(s, 10, 12);
      expect(s.trassenNachbarn(neuOben)).toContainEqual(expect.objectContaining({ nachbar: altOben, verbunden: false }));
      expect(s.trassenNachbarn(neuUnten)).toContainEqual(expect.objectContaining({ nachbar: altUnten, verbunden: false }));

      wische(u, [[10, 11], [9, 11]]);
      wische(u, [[9, 11], [10, 11]]);
      expect(s.trassenNachbarn(neuOben)).toContainEqual(expect.objectContaining({ nachbar: altOben, verbunden: true }));
      expect(s.trassenNachbarn(neuUnten)).toContainEqual(expect.objectContaining({ nachbar: altUnten, verbunden: false }));
    });
  });

  it('test_nr18_ueberzeichnen: dicker über gebaut → Ersatz je Feld; dünner oder gleich → nichts, keine Meldung', async () => {
    const s = offen(neu(2));
    const ersatz = vi.spyOn(s, 'ersatzPlanen').mockReturnValue({ ok: true });
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d50'); hilfeZu(u);
      wische(u, [[10, 10], [10, 11], [10, 12]]);
      expect(ersatz.mock.calls).toEqual([[bei(s, 10, 10).id, 'd50'], [bei(s, 10, 11).id, 'd50'], [bei(s, 10, 12).id, 'd50']]);
      ersatz.mockClear();
      u.st.stempeln('d25');
      wische(u, [[10, 11], [10, 12], [10, 13]]); // 25er über gebaute 40er
      u.st.stempeln('d40');
      wische(u, [[10, 12]]); // gleich dick
      expect(ersatz).not.toHaveBeenCalled();
      expect(u.meldungen).toEqual([]);
    });
  });

  it('test_nr18_ueberzeichnen: schneller Wisch über drei Felder ersetzt auch die übersprungenen Felder dazwischen', async () => {
    const s = offen(neu(2));
    const ersatz = vi.spyOn(s, 'ersatzPlanen').mockReturnValue({ ok: true });
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d50'); hilfeZu(u);
      wische(u, [[10, 10], [10, 13]]);
      expect(ersatz.mock.calls.map((c) => c[0])).toEqual([10, 11, 12, 13].map((y) => bei(s, 10, y).id));
    });
  });

  it('test_nr18_ueberzeichnen: schon geplanter Ersatz – nur ein noch dickerer Stempel plant neu', async () => {
    const s = offen(neu(2));
    bei(s, 11, 14).ersatz = { typ: 'd40', nr: s.stand.naechste_id++ };
    const ersatz = vi.spyOn(s, 'ersatzPlanen').mockReturnValue({ ok: true });
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d32'); hilfeZu(u);
      wische(u, [[11, 14]]);
      u.st.stempeln('d40');
      wische(u, [[11, 14]]);
      expect(ersatz).not.toHaveBeenCalled();
      u.st.stempeln('d50');
      wische(u, [[11, 14]]);
      expect(ersatz.mock.calls).toEqual([[bei(s, 11, 14).id, 'd50']]);
    });
  });

  it('test_nr18_ueberzeichnen: über eingezeichnete Leitung anderen Typs → Typ neu; gleicher Typ → nichts', async () => {
    const s = offen(neu(1));
    expect(s.platzieren('d25', 10, 15).ok).toBe(true);
    const typ = vi.spyOn(s, 'geplanteLeitungTyp').mockReturnValue({ ok: true });
    const ersatz = vi.spyOn(s, 'ersatzPlanen');
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25'); hilfeZu(u);
      wische(u, [[10, 15]]);
      expect(typ).not.toHaveBeenCalled();
      u.st.stempeln('d32');
      wische(u, [[10, 15]]);
      expect(typ.mock.calls).toEqual([[bei(s, 10, 15).id, 'd32']]);
      expect(ersatz).not.toHaveBeenCalled();
    });
  });

  it('test_nr18_ueberzeichnen: Ablehnung des Kerns – Meldung nur beim ersten Feld der Geste', async () => {
    const s = offen(neu(2));
    const ersatz = vi.spyOn(s, 'ersatzPlanen').mockImplementation(() => {
      const text = 'Dickere Leitungen entstehen nur im Bauabschnitt – lass Philipp einen planen.';
      s.ereignisse.push({ art: 'hinweis', text });
      return { ok: false, hinweis: text };
    });
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d50'); hilfeZu(u);
      wische(u, [[10, 10], [10, 11], [10, 12], [10, 13]]);
      (u.st as unknown as { ereignisse(): void }).ereignisse();
      expect(ersatz.mock.calls.length, 'Kern wird je Feld gefragt').toBeGreaterThanOrEqual(1);
      expect(u.meldungen).toEqual(['Dickere Leitungen entstehen nur im Bauabschnitt – lass Philipp einen planen.']);
      // Gegenprobe: Ein Feld mitten in der Strecke als Start einer neuen Geste meldet wieder
      wische(u, [[10, 12]]);
      expect(u.meldungen).toHaveLength(2);
    });
  });
});

describe('NR18-P3 Baumenü – Warnliste „Nach dem Bau zu dünn“', () => {
  const W = ['Die 25er an der Heizzentrale ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.', 'Eine 32er auf dem Weg ist zu dünn, es fehlen 3 kW. Zeichne eine 40er darüber.'];

  it('test_nr18_baumenue_warnliste: Phase bestellen – Kasten mit allen Sätzen über der Bestell-Schaltfläche', async () => {
    const s = neu(1); s.stand.abschnitt = { phase: 'bestellen', bau: null };
    vi.spyOn(s, 'abschnittWarnungen').mockReturnValue([...W]);
    await echteSteuerung(s, (u) => {
      u.st.katalog('netz');
      const titel = u.dom.html.querySelectorAll('h3').filter((e) => e.isConnected && norm(e.textContent) === 'Nach dem Bau zu dünn');
      expect(titel).toHaveLength(1);
      const kasten = titel[0].parentNode!;
      expect(kasten.querySelectorAll('p').map((p) => norm(p.textContent))).toEqual(W);
      // Reihenfolge im Dokument: Warnliste vor „Laura: Material bestellen“
      const folge = u.dom.html.querySelectorAll('h3,button').filter((e) => e.isConnected).map((e) => norm(e.textContent));
      const iWarn = folge.indexOf('Nach dem Bau zu dünn'), iBest = folge.findIndex((t) => t.startsWith('Laura: Material bestellen'));
      expect(iWarn).toBeGreaterThanOrEqual(0);
      expect(iBest).toBeGreaterThan(iWarn);
    });
  });

  it('test_nr18_baumenue_warnliste: leere Liste oder andere Phase – kein Kasten', async () => {
    const s = neu(1); s.stand.abschnitt = { phase: 'bestellen', bau: null };
    const warn = vi.spyOn(s, 'abschnittWarnungen').mockReturnValue([]);
    const titel = (u: EchteUmgebung) => u.dom.html.querySelectorAll('h3').filter((e) => e.isConnected && norm(e.textContent) === 'Nach dem Bau zu dünn');
    await echteSteuerung(s, (u) => { u.st.katalog('netz'); expect(titel(u)).toEqual([]); });
    warn.mockReturnValue([...W]);
    offen(s);
    await echteSteuerung(s, (u) => { u.st.katalog('netz'); expect(titel(u)).toEqual([]); });
  });
});

describe('NR18-P3 Ereignis „engstelle“ markiert die Felder', () => {
  for (const [name, bewegung, ruhig] of [['normal', 'normal', false], ['Weniger Bewegung', 'einstellung', true]] as const) {
    it(`test_nr18_ereignis_markiert (${name}): Felder als (x|y) an effekte.engstelle, „schritt“ still übergangen`, async () => {
      const s = neu(1);
      await echteSteuerung(s, (u) => {
        const st = u.st as unknown as { ereignisse(): void; effekte: { engstelle(f: ReadonlyArray<readonly [number, number]>, r: boolean): void } };
        const mark = vi.spyOn(st.effekte, 'engstelle');
        s.ereignisse.push({ art: 'engstelle', felder: [11 * N + 10, 12 * N + 10, 13 * N + 10] });
        s.ereignisse.push({ art: 'schritt', schritt: 'station_gekauft', objekt_id: 5 });
        st.ereignisse();
        expect(mark.mock.calls).toEqual([[[[10, 11], [10, 12], [10, 13]], ruhig]]);
        expect(u.meldungen).toEqual([]);
        expect(s.ereignisse).toEqual([]);
      }, { bewegung, uhr: () => T0 });
    });
  }
});
