import { describe, expect, it } from 'vitest';
import { LEITUNGEN, START_PREISSTUFE, type TypId } from '../src/core/katalog';
import { berechneNetz } from '../src/core/netz';
import { ENGPASS_ERSATZ, WEITERE_STELLEN, engstelleText, engstellenFinden, type Engstelle } from '../src/core/engstelle';
import * as start from '../src/core/start';
import { Spiel, neuerSpielstand, type Ereignis } from '../src/core/spiel';
import type { Schritt, Tipp } from '../src/core/tutorial-vertrag';
import type { Netz, Objekt } from '../src/core/typen';
import { Effekte } from '../src/render/effekte';
import { dorf, neu, quelle } from './hilfen';

// Bauplan docs/bauplaene/NR18-ohne-autoanschluss.md, Fassung 3, Paket P1 (AE-NR18-2, AE-NR13-1, Abschnitt 5.4, Texte Abschnitt 6).
// Netze mit tests/hilfen.ts: Heizzentrale bei (10|10) belegt x 10–11, y 10–11. Kartenbreite 24 Felder, Feldnummer = y·24 + x.
// Katalogwerte (von Hand abgeschrieben): d25 15 kW, d32 25 kW, d40 40 kW, d50 60 kW; EFH 15.000 kWh/a ÷ 1.500 h = 10 kW.
const f = (x: number, y: number): number => y * 24 + x;
const netzAus = (objekte: Objekt[], vorlauf_c?: number): Netz => berechneNetz(objekte, [quelle('kessel')], START_PREISSTUFE, vorlauf_c);
const kundenIds = (objekte: Objekt[]): number[] => objekte.filter((o) => o.typ === 'efh').map((o) => o.id);

/** 25er-Strang (12|10)…(15|10) ab der Heizzentrale; EFH bei (14|11) hängt an (14|10), EFH bei (16|10) am Ende (15|10).
 *  Last: (15|10) 10 kW, (14|10) bis (12|10) je 20 kW > 15 kW. */
function strang25(extra: Partial<Record<'x12' | 'x13' | 'x14' | 'x15', Partial<Objekt>>> = {}): Objekt[] {
  return dorf(
    neu('d25', 12, 10, extra.x12), neu('d25', 13, 10, extra.x13), neu('d25', 14, 10, extra.x14), neu('d25', 15, 10, extra.x15),
    neu('efh', 14, 11), neu('efh', 16, 10),
  );
}

describe('NR18 engstellenFinden', () => {
  it('test_nr18_engstelle_ab_heizzentrale: 25er-Strang mit zwei EFH – Stück ab der Heizzentrale bis zum letzten zu vollen Feld', () => {
    const objekte = strang25();
    const netz = netzAus(objekte);
    expect(netz.spreizung_faktor).toBe(1);
    const erwartet: Engstelle = {
      felder: [f(12, 10), f(13, 10), f(14, 10)], typ: 'd25', last_kw: 20, kapazitaet_kw: 15, an_heizzentrale: true, geplant: false, empfohlen: 'd32',
    };
    expect(engstellenFinden(netz, kundenIds(objekte))).toEqual([erwartet]);
  });

  it('test_nr18_engstelle_erste_von_zwei: zwei zu volle Stücke – nach Tiefe sortiert (32er an der Heizzentrale zuerst, obwohl die 25er die kleinere Feldnummer hat)', () => {
    const objekte = dorf(
      // rechts: 32er (12|10), (13|10) mit drei EFH am Ende → 30 kW > 25 kW
      neu('d32', 12, 10), neu('d32', 13, 10), neu('efh', 14, 10), neu('efh', 13, 9), neu('efh', 13, 11),
      // oben: 40er (10|9) an der Heizzentrale, dahinter 25er (10|8) mit drei EFH → 30 kW > 15 kW (die 40er trägt 30 kW)
      neu('d40', 10, 9), neu('d25', 10, 8), neu('efh', 10, 7), neu('efh', 9, 8), neu('efh', 11, 8),
    );
    const e = engstellenFinden(netzAus(objekte), kundenIds(objekte));
    expect(e).toEqual([
      { felder: [f(12, 10), f(13, 10)], typ: 'd32', last_kw: 30, kapazitaet_kw: 25, an_heizzentrale: true, geplant: false, empfohlen: 'd40' },
      { felder: [f(10, 8)], typ: 'd25', last_kw: 30, kapazitaet_kw: 15, an_heizzentrale: false, geplant: false, empfohlen: 'd40' },
    ]);
  });

  it('test_nr18_sortierung_gleiche_tiefe: zwei Stücke direkt an der Heizzentrale – kleinere Feldnummer zuerst', () => {
    const objekte = dorf(
      neu('d25', 12, 10), neu('efh', 13, 10), neu('efh', 12, 9),
      neu('d25', 10, 9), neu('efh', 10, 8), neu('efh', 9, 9),
    );
    // Die Kunden rechts (Feld 252) kommen zuerst, das Ergebnis beginnt trotzdem mit Feld 226 (10|9).
    const e = engstellenFinden(netzAus(objekte), kundenIds(objekte));
    expect(e.map((s) => s.felder)).toEqual([[f(10, 9)], [f(12, 10)]]);
  });

  it('test_nr18_grenze: Last genau gleich der Kapazität ist nicht zu voll, ein Haus mehr schon', () => {
    // 40er (12|10), (13|10): drei EFH am Ende (13|10), ein EFH bei (12|9) an (12|10) → (12|10) trägt genau 40 kW.
    const genau = dorf(neu('d40', 12, 10), neu('d40', 13, 10), neu('efh', 14, 10), neu('efh', 13, 9), neu('efh', 13, 11), neu('efh', 12, 9));
    const netz = netzAus(genau);
    expect(netz.last_kw.get(f(12, 10))).toBe(40);
    expect(engstellenFinden(netz, kundenIds(genau))).toEqual([]);
    // Reihenhaus statt EFH bei (12|9): 24.000 kWh/a ÷ 1.500 h = 16 kW → 30 + 16 = 46 kW > 40 kW.
    const mehr = dorf(neu('d40', 12, 10), neu('d40', 13, 10), neu('efh', 14, 10), neu('efh', 13, 9), neu('efh', 13, 11), neu('rh', 12, 9));
    const ueber = netzAus(mehr);
    expect(ueber.last_kw.get(f(12, 10))).toBe(46);
    const ids = mehr.filter((o) => o.typ === 'efh' || o.typ === 'rh').map((o) => o.id);
    expect(engstellenFinden(ueber, ids).map((s) => s.felder)).toEqual([[f(12, 10)]]);
  });

  it('test_nr18_verzweigt: hinter dem ersten Feld verzweigt – der erste Kunde bestimmt die Fortsetzung', () => {
    // 25er (12|10), (13|10); Abzweig nach rechts (14|10) mit zwei EFH, nach unten (13|11), (13|12) mit zwei EFH:
    // Abzweige je 20 kW, Stamm 40 kW – alle Felder über 15 kW.
    const objekte = dorf(
      neu('d25', 12, 10), neu('d25', 13, 10), neu('d25', 14, 10), neu('d25', 13, 11), neu('d25', 13, 12),
      neu('efh', 15, 10), neu('efh', 14, 9), neu('efh', 13, 13), neu('efh', 12, 12),
    );
    const netz = netzAus(objekte);
    expect(netz.last_kw.get(f(12, 10))).toBe(40);
    const [r1, r2, u1, u2] = kundenIds(objekte);
    expect(engstellenFinden(netz, [r1, u1, r2, u2]).map((s) => s.felder)).toEqual([[f(12, 10), f(13, 10), f(14, 10)]]);
    expect(engstellenFinden(netz, [u2, r1]).map((s) => s.felder)).toEqual([[f(12, 10), f(13, 10), f(13, 11), f(13, 12)]]);
  });

  it('test_nr18_typwechsel_trennt_stueck: 32er dann 25er, beide zu voll – das Stück endet am Typwechsel', () => {
    const objekte = dorf(
      neu('d32', 12, 10), neu('d32', 13, 10), neu('d25', 14, 10), neu('d25', 15, 10),
      neu('efh', 16, 10), neu('efh', 15, 11), neu('efh', 15, 9),
    );
    expect(engstellenFinden(netzAus(objekte), kundenIds(objekte))).toEqual([
      { felder: [f(12, 10), f(13, 10)], typ: 'd32', last_kw: 30, kapazitaet_kw: 25, an_heizzentrale: true, geplant: false, empfohlen: 'd40' },
    ]);
  });

  it('test_nr18_doppelt_einmal: mehrere Kunden hinter demselben Stück (und doppelte Ids) ergeben einen Eintrag', () => {
    const objekte = strang25();
    const [a, b] = kundenIds(objekte);
    const netz = netzAus(objekte);
    const e = engstellenFinden(netz, [a, b, a, b]);
    expect(e).toHaveLength(1);
    expect(e[0].felder).toEqual([f(12, 10), f(13, 10), f(14, 10)]);
    expect(engstellenFinden(netz, new Set([b, a]))).toEqual(e);
  });

  it('test_nr18_leer: alles passt, Kunde ohne Anschluss, Kunde direkt an der Heizzentrale (Feld −1), unbekannte Id, keine Kunden', () => {
    const passt = dorf(neu('d25', 12, 10), neu('efh', 13, 10));
    expect(engstellenFinden(netzAus(passt), kundenIds(passt))).toEqual([]);

    const objekte = [...strang25(), neu('efh', 20, 20), neu('efh', 12, 11)];
    const netz = netzAus(objekte);
    const fern = objekte.find((o) => o.x === 20)!.id, amHeizhaus = objekte.find((o) => o.x === 12 && o.y === 11)!.id;
    expect(netz.anschluss.has(fern)).toBe(false);
    expect(netz.anschluss.get(amHeizhaus)?.feld).toBe(-1);
    expect(engstellenFinden(netz, [fern, amHeizhaus, 99999])).toEqual([]);
    expect(engstellenFinden(netz, [])).toEqual([]);
  });

  it('test_nr18_keine_leitung_im_weg: ein Feld, dessen Objekt keine Leitung ist, zählt nicht als zu voll (künstliches Netz)', () => {
    const objekte = strang25();
    const netz = netzAus(objekte);
    const nachId = new Map(netz.nachId);
    const mitte = objekte.find((o) => o.x === 12 && o.y === 10)!;
    nachId.set(mitte.id, { ...mitte, typ: 'gewerbe' });
    const e = engstellenFinden({ ...netz, nachId }, kundenIds(objekte));
    expect(e.map((s) => s.felder)).toEqual([[f(13, 10), f(14, 10)]]);
    expect(e[0].an_heizzentrale).toBe(false);
  });

  it('test_nr18_spreizung: Faktor 0,75 (Vorlauf 55 °C) – Kapazität und Empfehlung rechnen mit Katalog × Faktor', () => {
    // Spreizung je Haus min(20 K, 55 − 40 K) = 15 K → Faktor 15/20 = 0,75. 32er: 25 × 0,75 = 18,75 kW < 20 kW.
    // Empfehlung: 40er (40 × 0,75 = 30 kW ≥ 20 kW); die 32er reicht ohne Faktor, deshalb prüft das den Faktor.
    const objekte = dorf(neu('d32', 12, 10), neu('d32', 13, 10), neu('efh', 14, 10), neu('efh', 13, 11));
    const netz = netzAus(objekte, 55);
    expect(netz.spreizung_faktor).toBe(0.75);
    expect(engstellenFinden(netz, kundenIds(objekte))).toEqual([
      { felder: [f(12, 10), f(13, 10)], typ: 'd32', last_kw: 20, kapazitaet_kw: 18.75, an_heizzentrale: true, geplant: false, empfohlen: 'd40' },
    ]);
    expect(engstellenFinden(netzAus(objekte), kundenIds(objekte))).toEqual([]);
  });

  it('test_nr18_empfohlen_keine_reicht: keine Leitung des Katalogs trägt die Last → empfohlen null', () => {
    // 25er (12|10), dahinter 110er (13|10), ein EFH. Die Last wird im Netz künstlich auf 300 kW gesetzt (so viele Häuser
    // passen nicht übersichtlich auf die Testkarte); die dickste Leitung des Katalogs (110er) trägt 290 kW.
    const objekte = dorf(neu('d25', 12, 10), neu('d110', 13, 10), neu('efh', 14, 10));
    const netz = netzAus(objekte);
    const kunde = objekte.find((o) => o.typ === 'efh')!;
    const last_kw = new Map(netz.last_kw);
    last_kw.set(f(12, 10), 300); last_kw.set(f(13, 10), 300);
    const e = engstellenFinden({ ...netz, last_kw }, [kunde.id]);
    expect(e).toHaveLength(1);
    expect(e[0]).toEqual({ felder: [f(12, 10)], typ: 'd25', last_kw: 300, kapazitaet_kw: 15, an_heizzentrale: true, geplant: false, empfohlen: null });
    // genau auf der Grenze: 290 kW trägt die 110er noch
    last_kw.set(f(12, 10), 290);
    expect(engstellenFinden({ ...netz, last_kw }, [kunde.id])[0].empfohlen).toBe('d110');
  });

  it('test_nr18_geplant: geplante Leitung oder geplanter Ersatz im Stück → geplant; außerhalb des Stücks nicht', () => {
    const ids = (o: Objekt[]): number[] => kundenIds(o);
    const mitGeplant = strang25({ x13: { geplant: true } });
    expect(engstellenFinden(netzAus(mitGeplant), ids(mitGeplant))[0].geplant).toBe(true);
    const mitErsatz = strang25({ x14: { ersatz: { typ: 'd32', nr: 7 } } });
    expect(engstellenFinden(netzAus(mitErsatz), ids(mitErsatz))[0].geplant).toBe(true);
    const nurDahinter = strang25({ x15: { geplant: true } });
    const e = engstellenFinden(netzAus(nurDahinter), ids(nurDahinter));
    expect(e[0].felder).toEqual([f(12, 10), f(13, 10), f(14, 10)]);
    expect(e[0].geplant).toBe(false);
  });
});

describe('NR18 engstelleText (Abschnitt 6, Fassung 3)', () => {
  const basis: Engstelle = { felder: [f(12, 10)], typ: 'd25', last_kw: 20, kapazitaet_kw: 15, an_heizzentrale: true, geplant: false, empfohlen: 'd32' };
  const mit = (e: Partial<Engstelle>): Engstelle => ({ ...basis, ...e });

  it('test_nr18_text: drei Orte × drei Enden wörtlich', () => {
    const orte: Array<[Partial<Engstelle>, string]> = [
      [{ an_heizzentrale: true }, 'Die 25er an der Heizzentrale ist zu dünn, es fehlen 5 kW.'],
      [{ an_heizzentrale: false }, 'Eine 25er auf dem Weg ist zu dünn, es fehlen 5 kW.'],
      [{ an_heizzentrale: false, geplant: true }, 'Die eingezeichnete 25er ist zu dünn, es fehlen 5 kW.'],
    ];
    for (const [ort, satz1] of orte) {
      expect(engstelleText(mit({ ...ort, empfohlen: 'd32' }), null)).toBe(`${satz1} Zeichne eine 32er darüber.`);
      expect(engstelleText(mit({ ...ort, empfohlen: 'd50' }), 2)).toBe(`${satz1} Die 50er gibt es ab Stufe 2.`);
      expect(engstelleText(mit({ ...ort, empfohlen: null }), null)).toBe(`${satz1} Leg eine getrennte zweite Leitung.`);
    }
    expect(engstelleText(basis, null)).toBe('Die 25er an der Heizzentrale ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.');
  });

  it('test_nr18_text_reihenfolge: ohne Empfehlung „Leg eine getrennte zweite Leitung.“, auch wenn eine Stufe übergeben wird; eingezeichnet geht vor Heizzentrale', () => {
    expect(engstelleText(mit({ empfohlen: null, an_heizzentrale: false }), 3)).toBe('Eine 25er auf dem Weg ist zu dünn, es fehlen 5 kW. Leg eine getrennte zweite Leitung.');
    expect(engstelleText(mit({ geplant: true, an_heizzentrale: true }), null)).toBe('Die eingezeichnete 25er ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.');
    expect(engstelleText(mit({ typ: 'd110', empfohlen: null, an_heizzentrale: false, last_kw: 300, kapazitaet_kw: 290 }), null))
      .toBe('Eine 110er auf dem Weg ist zu dünn, es fehlen 10 kW. Leg eine getrennte zweite Leitung.');
  });

  it('test_nr18_text_fehlende_kw: aufgerundet, mindestens 1', () => {
    const fehlt = (last_kw: number, kapazitaet_kw: number): string => engstelleText(mit({ last_kw, kapazitaet_kw }), null);
    expect(fehlt(20.5, 15)).toContain('es fehlen 6 kW.');
    expect(fehlt(15.5, 15)).toContain('es fehlen 1 kW.');
    expect(fehlt(15, 15)).toContain('es fehlen 1 kW.');
    expect(fehlt(20, 18.75)).toContain('es fehlen 2 kW.');
    expect(fehlt(16, 15)).toContain('es fehlen 1 kW.');
    expect(fehlt(1015, 15)).toContain('es fehlen 1000 kW.');
  });

  it('test_nr18_text_feste_saetze', () => {
    expect(ENGPASS_ERSATZ).toBe('Mit diesem Haus werden andere Häuser kalt. Eine Leitung auf dem Weg ist zu dünn.');
    expect(WEITERE_STELLEN).toBe('Weitere zu dünne Stellen stehen im Baumenü.');
    expect(ENGPASS_ERSATZ.length).toBeLessThanOrEqual(90);
  });

  it('test_nr18_text_laenge: alle Typpaare × Last 1…9999 × Orte × Stufe – höchstens 90 Zeichen (Ausnahme siehe Kommentar)', () => {
    // Offene Frage an Projektleiter/Fachprüfer: „Die {t} an der Heizzentrale …“ + „Leg eine getrennte zweite Leitung.“ hat schon
    // mit 1 kW 92 Zeichen, „Die eingezeichnete 110er …“ + derselbe Satz ab 1.000 kW 91. Diese Kombinationen prüft der Test
    // nicht, bis die Texte entschieden sind; alle anderen müssen passen.
    const kap: Record<string, number> = { d25: 15, d32: 25, d40: 40, d50: 60, d63: 95, d75: 135, d90: 195, d110: 290 };
    const orte: Array<Pick<Engstelle, 'an_heizzentrale' | 'geplant'>> = [
      { an_heizzentrale: true, geplant: false }, { an_heizzentrale: false, geplant: false }, { an_heizzentrale: false, geplant: true },
    ];
    let laengste = 0, geprueft = 0;
    LEITUNGEN.forEach((t, i) => {
      const enden: Array<TypId | null> = [...LEITUNGEN.slice(i + 1), null];
      for (const empfohlen of enden) {
        for (const ort of orte) {
          if (empfohlen === null && ort.an_heizzentrale) continue;
          for (const stufe of empfohlen === null ? [null] : [null, 4]) {
            for (let last_kw = 1; last_kw <= 9999; last_kw++) {
              if (empfohlen === null && ort.geplant && t === 'd110' && last_kw - kap[t] >= 1000) continue;
              const text = engstelleText({ felder: [0], typ: t, last_kw, kapazitaet_kw: kap[t], empfohlen, ...ort }, stufe);
              laengste = Math.max(laengste, text.length); geprueft++;
            }
          }
        }
      }
    });
    expect(geprueft).toBeGreaterThan(1_000_000);
    expect(laengste).toBeLessThanOrEqual(90);
  });
});

describe('NR13/NR18 Spielstart verschoben und Vertrag', () => {
  // FNV-1a über JSON.stringify(neuerSpielstand(0, ort)), gemessen am Stand 91bbc70 vor dem Verschieben (Wegwerf-Test,
  // nicht im Projekt): Standardort 71 Objekte, naechste_id 76; unbekannter Ort „xyz“ fällt auf den Standardort zurück,
  // würfelt die Deko aber mit anderem Startwert (70 Objekte).
  const fnv = (t: string): number => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };

  it('test_nr13_start_verschoben: neuerSpielstand aus spiel und aus start ist dieselbe Funktion', () => {
    expect(start.neuerSpielstand).toBe(neuerSpielstand);
  });

  it('test_nr13_start_verschoben_wie_vorher: neuerSpielstand(0) liefert dasselbe wie vor dem Verschieben (bis P5 mit Startnetz)', () => {
    const s = start.neuerSpielstand(0);
    expect(s.objekte).toHaveLength(71);
    expect(s.naechste_id).toBe(76);
    const leitungen = s.objekte.filter((o) => o.typ === 'd40' || o.typ === 'd25').map((o) => `${o.typ}@${o.x}|${o.y}${o.vorsehung ? '+v' : ''}`);
    expect(leitungen).toEqual(['d40@10|10', 'd40@10|11', 'd40@10|12', 'd40@10|13', 'd40@10|14+v', 'd25@11|14']);
    expect(s.objekte.filter((o) => o.station).map((o) => `${o.x}|${o.y}`)).toEqual(['9|13', '12|14']);
    expect(fnv(JSON.stringify(s))).toBe(3811215343);
    expect(fnv(JSON.stringify(start.neuerSpielstand(0, 'xyz')))).toBe(499985681);
  });

  it('test_nr18_vertrag: Ereignisse engstelle/schritt, Schritt/Tipp, ersatz am Objekt, Kern-Methoden und Effekt vorhanden', () => {
    const schritt: Schritt = 'haus_warm', tipp: Tipp = 'daneben';
    const ereignisse: Ereignis[] = [{ art: 'engstelle', felder: [f(10, 11)] }, { art: 'schritt', schritt, objekt_id: 3 }];
    const leitung: Objekt = neu('d25', 12, 10, { ersatz: { typ: 'd32', nr: 1 } });
    expect(ereignisse.map((e) => e.art)).toEqual(['engstelle', 'schritt']);
    expect([tipp, leitung.ersatz?.typ]).toEqual(['daneben', 'd32']);
    const s = new Spiel(neuerSpielstand(0), () => 0);
    expect(s.abschnittWarnungen()).toEqual([]);
    expect([typeof s.erreichteHaeuser, typeof s.ersatzPlanen, typeof s.geplanteLeitungTyp]).toEqual(['function', 'function', 'function']);
    const fx = new Effekte();
    expect(() => fx.engstelle([[10, 11]], true)).not.toThrow();
  });
});
