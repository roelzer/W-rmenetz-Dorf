import { describe, expect, it } from 'vitest';
import { berechneNetz, dorfwert } from '../src/core/netz';
import { KATALOG, PREISSTUFEN } from '../src/core/katalog';
import { dorf, neu, quelle } from './hilfen';

const ID = (n: ReturnType<typeof berechneNetz>, o: { id: number }) => n.warm.has(o.id);

describe('A6 Verbindung: nur wer durchgehend an der Heizzentrale hängt, wird versorgt', () => {
  it('Haus ohne Leitung bleibt kalt und zählt nicht als Kunde mit Anschluss', () => {
    const h = neu('efh', 13, 10);
    const n = berechneNetz(dorf(h), [quelle('kessel')], 2);
    expect(ID(n, h)).toBe(false);
    expect(n.anschluss.has(h.id)).toBe(false);
  });
  it('Haus an durchgehender Leitung wird warm', () => {
    const h = neu('efh', 14, 10);
    const n = berechneNetz(dorf(neu('d50', 12, 10), neu('d50', 13, 10), h), [quelle('kessel')], 2);
    expect(ID(n, h)).toBe(true);
  });
  it('Lücke in der Leitung trennt das Haus vom Netz', () => {
    const h = neu('efh', 15, 10);
    const n = berechneNetz(dorf(neu('d50', 12, 10), neu('d50', 14, 10), h), [quelle('kessel')], 2);
    expect(ID(n, h)).toBe(false);
  });
  it('Haus direkt am Heizhaus braucht keine Leitung', () => {
    const h = neu('efh', 12, 10);
    const n = berechneNetz(dorf(h), [quelle('kessel')], 2);
    expect(ID(n, h)).toBe(true);
  });
  it('Leitung, die nicht am Heizhaus beginnt, ist nicht verbunden', () => {
    const p = neu('d50', 16, 16);
    const n = berechneNetz(dorf(p), [quelle('kessel')], 2);
    expect(n.tiefe.has(16 * 24 + 16)).toBe(false);
  });
});

describe('A7 Leitungskapazität: Last über Nennleistung macht Kunden dahinter kalt', () => {
  it('zwei Einfamilienhäuser (je 10 kW) überlasten einen Hausanschluss (12 kW)', () => {
    const a = neu('efh', 13, 10), b = neu('efh', 12, 9);
    const n = berechneNetz(dorf(neu('d25', 12, 10), a, b), [quelle('kessel', 5)], 2);
    expect(ID(n, a)).toBe(false);
    expect(ID(n, b)).toBe(false);
    expect(n.kalt.get(a.id)).toBe('leitung');
    expect(n.einnahmen_eur_min).toBe(0);
  });
  it('dieselbe Last über eine Verteilleitung (50 kW) funktioniert', () => {
    const a = neu('efh', 13, 10), b = neu('efh', 12, 9);
    const n = berechneNetz(dorf(neu('d50', 12, 10), a, b), [quelle('kessel', 5)], 2);
    expect(ID(n, a) && ID(n, b)).toBe(true);
  });
  it('ein Engpass weiter vorn macht alles dahinter kalt', () => {
    const fern = neu('efh', 16, 10);
    const dazu = neu('efh', 12, 9), dazu2 = neu('efh', 13, 9), dazu3 = neu('efh', 14, 9);
    // dünner Hausanschluss direkt am Heizhaus trägt Last von 4 Häusern = 40 kW > 12
    const n = berechneNetz(
      dorf(neu('d25', 12, 10), neu('d25', 13, 10), neu('d25', 14, 10), neu('d25', 15, 10), fern, dazu, dazu2, dazu3),
      [quelle('kessel', 5)], 2,
    );
    expect(ID(n, fern)).toBe(false);
  });
  it('Last wird nach oben summiert', () => {
    const a = neu('efh', 14, 10);
    const n = berechneNetz(dorf(neu('d50', 12, 10), neu('d50', 13, 10), a), [quelle('kessel')], 2);
    expect(n.last_kw.get(10 * 24 + 12)).toBe(10);
    expect(n.last_kw.get(10 * 24 + 13)).toBe(10);
  });
});

describe('A8 Dimensionierung in Fließrichtung', () => {
  it('dünn vor dick wird als Planungsfehler markiert (beide Abschnitte)', () => {
    const n = berechneNetz(dorf(neu('d25', 12, 10), neu('d50', 13, 10)), [quelle('kessel')], 2);
    expect(n.engpass.has(10 * 24 + 12)).toBe(true);
    expect(n.engpass.has(10 * 24 + 13)).toBe(true);
  });
  it('dick vor dünn ist korrekt', () => {
    const n = berechneNetz(dorf(neu('d110', 12, 10), neu('d50', 13, 10), neu('d25', 14, 10)), [quelle('kessel')], 2);
    expect(n.engpass.size).toBe(0);
  });
  it('gleichbleibende Größe ist korrekt', () => {
    const n = berechneNetz(dorf(neu('d50', 12, 10), neu('d50', 13, 10)), [quelle('kessel')], 2);
    expect(n.engpass.size).toBe(0);
  });
  it('die dünne Stelle begrenzt trotzdem alles dahinter (Kapazität)', () => {
    const h1 = neu('efh', 14, 10), h2 = neu('efh', 13, 9);
    // p1 (12 kW) vorn, p2 dahinter, zwei Häuser (20 kW) hinten → vorn überlastet
    const n = berechneNetz(dorf(neu('d25', 12, 10), neu('d50', 13, 10), h1, h2), [quelle('kessel', 5)], 2);
    expect(ID(n, h1) || ID(n, h2)).toBe(false);
  });
});

describe('A9 Wärmeerzeugung: Verteilung nur bis zur verfügbaren Leistung', () => {
  const siebenHaeuser = () => {
    const l = [neu('d110', 12, 10)];
    const haeuser = [] as ReturnType<typeof neu>[];
    for (let i = 0; i < 7; i++) {
      l.push(neu('d110', 13 + i, 10));
      haeuser.push(neu('efh', 13 + i, 9));
    }
    return { objekte: dorf(...l, ...haeuser), haeuser };
  };
  it('genutzte Leistung übersteigt nie die verfügbare (Energieerhaltung)', () => {
    const { objekte } = siebenHaeuser();
    for (const k of ['kessel', 'wpg', 'ptk'] as const) {
      const n = berechneNetz(objekte, [quelle(k)], 2);
      expect(n.genutzt_kw).toBeLessThanOrEqual(n.verfuegbar_kw);
    }
  });
  it('60 kW Kessel versorgt sechs von sieben Häusern, das ferne bleibt kalt (nah zuerst)', () => {
    const { objekte, haeuser } = siebenHaeuser();
    const n = berechneNetz(objekte, [quelle('kessel')], 2);
    expect(n.warm.size).toBe(6);
    expect(n.genutzt_kw).toBe(60);
    expect(ID(n, haeuser[0])).toBe(true);
    expect(ID(n, haeuser[6])).toBe(false);
    expect(n.kalt.get(haeuser[6].id)).toBe('waerme');
  });
  it('Leistung mehrerer Innenquellen addiert sich', () => {
    const n = berechneNetz(dorf(), [quelle('kessel'), quelle('wpg')], 2);
    expect(n.verfuegbar_kw).toBe(60 + 45);
  });
  it('Quelle im Bau liefert noch nichts', () => {
    const k = quelle('kessel');
    k.bau = { art: 'neu', start_ms: 0, ende_ms: 1 };
    expect(berechneNetz(dorf(), [k], 2).verfuegbar_kw).toBe(0);
  });
  it('Außenanlage zählt nur, wenn sie angeschlossen ist', () => {
    const lose = neu('solar', 20, 20);
    expect(berechneNetz(dorf(lose), [], 2).verfuegbar_kw).toBe(0);
    const dran = neu('solar', 12, 10);
    expect(berechneNetz(dorf(dran), [], 2).verfuegbar_kw).toBe(KATALOG.solar.leistung_kw![0]);
  });
  it('Ausbau einer Quelle (Stufe 2 im Umbau) liefert weiter Stufe-1-Leistung nicht, nur Neubau pausiert', () => {
    const k = quelle('kessel');
    k.bau = { art: 'ausbau', start_ms: 0, ende_ms: 1 };
    expect(berechneNetz(dorf(), [k], 2).verfuegbar_kw).toBe(60);
  });
});

describe('A10 Wirtschaft: Einnahmen nur für gelieferte Wärme, Kosten nur für erzeugte', () => {
  const eines = () => {
    const h = neu('efh', 13, 10);
    return { h, objekte: dorf(neu('d50', 12, 10), h) };
  };
  it('warmer Kunde zahlt, Preisstufe skaliert die Einnahmen', () => {
    const { objekte } = eines();
    PREISSTUFEN.forEach((p, i) => {
      const n = berechneNetz(objekte, [quelle('kessel')], i);
      expect(n.einnahmen_eur_min).toBeCloseTo(20 * p.einnahmefaktor, 6);
    });
  });
  it('kalter Kunde zahlt nichts', () => {
    const { objekte } = eines();
    const n = berechneNetz(objekte, [], 2);
    expect(n.einnahmen_eur_min).toBe(0);
  });
  it('Betriebskosten: keine Last → keine Kosten', () => {
    expect(berechneNetz(dorf(), [quelle('kessel')], 2).betriebskosten_eur_min).toBe(0);
  });
  it('Betriebskosten: 10 kW Last am Kessel = 10 × 0,4 € je min', () => {
    const { objekte } = eines();
    expect(berechneNetz(objekte, [quelle('kessel')], 2).betriebskosten_eur_min).toBeCloseTo(4, 6);
  });
  it('PV senkt die Stromkosten des Power-to-Heat-Kessels', () => {
    const { h, objekte } = eines();
    const ohne = berechneNetz(objekte, [quelle('ptk')], 2);
    const pv = neu('pv', 12, 8);
    const mit = berechneNetz([...objekte, pv], [quelle('ptk')], 2);
    expect(ohne.betriebskosten_eur_min).toBeCloseTo(10 * 0.9, 6);
    expect(mit.betriebskosten_eur_min).toBeLessThan(ohne.betriebskosten_eur_min);
    expect(mit.pv_faktor).toBeCloseTo(0.6, 6);
    expect(ID(mit, h)).toBe(true);
  });
  it('PV senkt Kosten nie unter 25 % (Faktor-Untergrenze)', () => {
    const n = berechneNetz([...dorf(neu('pv', 12, 10), neu('pv', 12, 12), neu('pv', 14, 12))], [quelle('ptk')], 2);
    expect(n.pv_faktor).toBeGreaterThanOrEqual(0.25);
  });
  it('kostenlose Außenanlage deckt die Last, dann fallen keine Brennstoffkosten an', () => {
    const { objekte } = eines();
    const n = berechneNetz([...objekte, neu('solar', 12, 8)], [quelle('kessel')], 2);
    expect(n.betriebskosten_eur_min).toBe(0);
  });
  it('günstigste Innenquelle läuft zuerst (Wärmepumpe vor Kessel)', () => {
    const { objekte } = eines();
    const k = quelle('kessel'), w = quelle('wpg');
    const n = berechneNetz(objekte, [k, w], 2);
    expect(n.laeuft_mit_kw.get(w)).toBe(10);
    expect(n.laeuft_mit_kw.get(k)).toBe(0);
  });
});

describe('A12 Großabnehmer', () => {
  it('Hallenbad ohne Vertrag ist kein Kunde und braucht keine Wärme', () => {
    const bad = neu('bad', 13, 10, { zustand: 'gesperrt' });
    const n = berechneNetz(dorf(neu('d110', 12, 10), bad), [quelle('kessel', 5)], 2);
    expect(n.bedarf_kw).toBe(0);
  });
  it('Hallenbad mit Vertrag wird über die Hauptleitung versorgt und zahlt', () => {
    const bad = neu('bad', 13, 10, { zustand: 'vertrag' });
    const n = berechneNetz(dorf(neu('d110', 12, 10), bad), [quelle('kessel', 5)], 2);
    expect(ID(n, bad)).toBe(true);
    expect(n.einnahmen_eur_min).toBe(160);
  });
  it('Hallenbad (45 kW) an Verteilleitung (50 kW) geht, an Hausanschluss (12 kW) nicht', () => {
    const bad = neu('bad', 13, 10, { zustand: 'vertrag' });
    expect(ID(berechneNetz(dorf(neu('d50', 12, 10), bad), [quelle('kessel', 5)], 2), bad)).toBe(true);
    const bad2 = neu('bad', 13, 10, { zustand: 'vertrag' });
    expect(ID(berechneNetz(dorf(neu('d25', 12, 10), bad2), [quelle('kessel', 5)], 2), bad2)).toBe(false);
  });
  it('Sägewerk mit Vertrag und Anschluss liefert günstige Abwärme', () => {
    const saege = neu('gewerbe', 13, 10, { zustand: 'vertrag' });
    const h = neu('efh', 12, 9);
    const n = berechneNetz(dorf(neu('d50', 12, 10), saege, h), [], 2);
    expect(n.verfuegbar_kw).toBe(60);
    expect(ID(n, h)).toBe(true);
    expect(n.betriebskosten_eur_min).toBeCloseTo(10 * 0.1, 6);
  });
  it('Sägewerk ohne Vertrag liefert nichts', () => {
    const saege = neu('gewerbe', 13, 10, { zustand: 'gesperrt' });
    expect(berechneNetz(dorf(neu('d50', 12, 10), saege), [], 2).verfuegbar_kw).toBe(0);
  });
});

describe('Kunden und Gebäude', () => {
  it('gekündigtes Haus zählt nicht als Kunde', () => {
    const h = neu('efh', 12, 10, { gekuendigt: true });
    const n = berechneNetz(dorf(h), [quelle('kessel')], 2);
    expect(n.bedarf_kw).toBe(0);
    expect(ID(n, h)).toBe(false);
  });
  it('Haus im Bau ist noch kein Kunde', () => {
    const h = neu('efh', 12, 10, { bau: { art: 'neu', start_ms: 0, ende_ms: 1 } });
    expect(berechneNetz(dorf(h), [quelle('kessel')], 2).bedarf_kw).toBe(0);
  });
  it('Berechnung ist deterministisch (gleicher Zustand → gleiches Ergebnis)', () => {
    const o = dorf(neu('d50', 12, 10), neu('efh', 13, 10), neu('efh', 12, 9));
    const a = berechneNetz(o, [quelle('kessel')], 2), b = berechneNetz(o, [quelle('kessel')], 2);
    expect([...a.warm]).toEqual([...b.warm]);
    expect(a.einnahmen_eur_min).toBe(b.einnahmen_eur_min);
  });
  it('Dorfwert steigt mit Stufe und Ausbau', () => {
    const klein = dorfwert(dorf(), [quelle('kessel')]);
    const gross = dorfwert(dorf(neu('efh', 14, 14, { stufe: 3 })), [quelle('kessel', 2)]);
    expect(gross).toBeGreaterThan(klein);
  });
});
