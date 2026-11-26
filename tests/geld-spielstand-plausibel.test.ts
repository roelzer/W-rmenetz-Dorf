import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { SPIELMONAT_MS } from '../src/core/katalog';
import { ortHolen } from '../src/core/orte';
import { altesStartdorf } from './hilfen/altes-startdorf';

// Spielerbericht 26.11. „seit 3 Tagen kein Geld mehr“, Risiko 5: unplausible Werte im Spielstand.
// JSON kennt kein NaN/Infinity: JSON.stringify macht daraus null, und „1e999“ liest JSON.parse als Infinity. Bisher machte ein
// einziger solcher Wert den ganzen Stand 'defekt' (neues Dorf) – oder er rutschte durch und verdarb das Geld bei der nächsten
// Monatsabrechnung (fehlende Münzkasse → NaN). Erwartung: Werte werden auf sichere Werte gesetzt, das Dorf bleibt, Befund
// 'repariert' (die Oberfläche sagt es dem Spieler), nie ein Absturz.
// Feste Werte: 9 Preisstufen 0–8 (katalog.ts PREISSTUFEN), Startpreisstufe 5 (START_PREISSTUFE), Spielmonat 10 min.

const T0 = 1_000_000_000_000;
const roh = (): Record<string, unknown> & { objekte: Array<Record<string, unknown>> } => JSON.parse(serialisieren(altesStartdorf(T0)));
const laden = (d: unknown) => ladenMitBefund(JSON.stringify(d), T0);

describe('Risiko 5: Spielstand-Plausibilität beim Laden', () => {
  it('intakter Stand mit Geld, Zählern und Abrechnungsmonat bleibt in diesen Werten unverändert und ok', () => {
    const d = roh();
    d.geld_eur = 12_345.5; d.taler = 7; d.preisstufe = 3; d.grundgebuehr_eur = 30;
    d.abrechnung_monat = Math.floor(T0 / SPIELMONAT_MS);
    d.objekte[0].kasse_eur = 12; d.objekte[0].zaehler_eur = 1.5; d.objekte[0].zaehler_kwh = 20; d.objekte[0].zaehler_grund_eur = 0.25;
    const r = laden(d);
    expect(r.befund).toBe('ok');
    const s = r.stand;
    expect([s.geld_eur, s.taler, s.preisstufe, s.grundgebuehr_eur, s.abrechnung_monat, s.zuletzt_ms, s.naechste_id])
      .toEqual([12_345.5, 7, 3, 30, Math.floor(T0 / SPIELMONAT_MS), T0, d.naechste_id]);
    const o = s.objekte[0];
    expect([o.kasse_eur, o.zaehler_eur, o.zaehler_kwh, o.zaehler_grund_eur]).toEqual([12, 1.5, 20, 0.25]);
  });

  it('Geld null (aus NaN) → 0 €, Dorf bleibt, Befund repariert', () => {
    const d = roh(); d.geld_eur = null;
    const r = laden(d);
    expect(r.befund).toBe('repariert');
    expect(r.stand.geld_eur).toBe(0);
    expect(r.stand.objekte.length).toBe(laden(roh()).stand.objekte.length);
  });

  it('Geld Infinity (1e999 im Text) → 0 €', () => {
    const text = serialisieren(altesStartdorf(T0)).replace(/"geld_eur":[^,]+/, '"geld_eur":1e999');
    const r = ladenMitBefund(text, T0);
    expect(r.befund).toBe('repariert');
    expect(r.stand.geld_eur).toBe(0);
  });

  it('negatives Geld → 0 €', () => {
    const d = roh(); d.geld_eur = -500;
    const r = laden(d);
    expect(r.befund).toBe('repariert');
    expect(r.stand.geld_eur).toBe(0);
  });

  it('fehlendes Geld und fehlende/negative Taler → 0', () => {
    const d = roh(); delete d.geld_eur; d.taler = -3;
    const r = laden(d);
    expect(r.befund).toBe('repariert');
    expect(r.stand.geld_eur).toBe(0);
    expect(r.stand.taler).toBe(0);
    const e = roh(); delete e.taler;
    expect(laden(e).stand.taler).toBe(0);
  });

  it('Geld als Text ist kein Geld → 0 €', () => {
    const d = roh(); d.geld_eur = '5000';
    const r = laden(d);
    expect(r.befund).toBe('repariert');
    expect(r.stand.geld_eur).toBe(0);
  });

  it('Preisstufe außerhalb 0–8 oder krumm wird begrenzt, fehlend = Startpreisstufe 5', () => {
    const a = roh(); a.preisstufe = 99;
    expect(laden(a).stand.preisstufe).toBe(8);
    const b = roh(); b.preisstufe = -2;
    expect(laden(b).stand.preisstufe).toBe(0);
    const c = roh(); c.preisstufe = 2.4;
    expect(laden(c).stand.preisstufe).toBe(2);
    const d = roh(); delete d.preisstufe;
    const r = laden(d);
    expect(r.befund).toBe('repariert');
    expect(r.stand.preisstufe).toBe(5);
  });

  it('fehlende Spielzeit = jetzt, fehlende nächste Nummer = höchste Objektnummer + 1', () => {
    const d = roh(); delete d.zuletzt_ms; delete d.naechste_id;
    const hoechste = Math.max(...d.objekte.map((o) => o.id as number));
    const r = laden(d);
    expect(r.befund).toBe('repariert');
    expect(r.stand.zuletzt_ms).toBe(T0);
    expect(r.stand.naechste_id).toBe(hoechste + 1);
  });

  it('fehlender Name, Aufgaben, Gemocht und Anträge werden ergänzt', () => {
    const d = roh(); delete d.name; delete d.erledigt; delete d.gemocht; delete d.antraege;
    const r = laden(d);
    expect(r.befund).toBe('repariert');
    expect(r.stand.name).toBe(ortHolen(r.stand.ort).name);
    expect(r.stand.erledigt).toEqual({});
    expect(r.stand.gemocht).toEqual({});
    expect(r.stand.antraege).toEqual({});
  });

  it('Abrechnungsmonat weit vor der Spielzeit wird auf den laufenden Monat gesetzt (sonst keine Abrechnung bis zum Aufholen)', () => {
    const d = roh(); d.abrechnung_monat = Math.floor(T0 / SPIELMONAT_MS) + 432;
    const r = laden(d);
    expect(r.befund).toBe('repariert');
    expect(r.stand.abrechnung_monat).toBe(Math.floor(T0 / SPIELMONAT_MS));
    const e = roh(); e.abrechnung_monat = null;
    const r2 = laden(e);
    expect(r2.befund).toBe('repariert');
    expect(r2.stand.abrechnung_monat).toBeUndefined();
  });

  it('kaputte Münzkasse, Zähler und Grundgebühr: Stand wird repariert, die nächste Abrechnung ergibt endliches Geld', () => {
    const d = roh();
    for (const o of d.objekte) delete o.kasse_eur;
    d.objekte[0].zaehler_eur = null; d.objekte[0].zaehler_kwh = null; d.objekte[0].zaehler_grund_eur = null;
    d.grundgebuehr_eur = null;
    const r = laden(d);
    expect(r.befund).toBe('repariert');
    expect(r.stand.objekte.every((o) => o.kasse_eur === 0)).toBe(true);
    expect(r.stand.objekte[0].zaehler_eur).toBeUndefined();
    expect(r.stand.grundgebuehr_eur).toBeUndefined();
    const z = { t: T0 };
    const s = new Spiel(r.stand, () => z.t);
    s.ersteQuelleWaehlen('kessel');
    for (let t = T0; t <= T0 + 2 * SPIELMONAT_MS; t += 10_000) { z.t = t; s.bis(t); }
    expect(Number.isFinite(s.stand.geld_eur)).toBe(true);
    expect(s.stand.letzte_abrechnung!.eingang_eur).toBeGreaterThan(0);
  });

  it('Müll stürzt nie ab: falsche Typen ergeben ein neues Spiel (defekt)', () => {
    for (const text of ['null', '[]', '42', '"x"', '{}', '{"version":3}', '{"version":3,"objekte":"x","innen":[]}']) {
      expect(() => ladenMitBefund(text, T0), text).not.toThrow();
      expect(ladenMitBefund(text, T0).befund, text).toBe('defekt');
    }
  });

  it('Start: ein reparierter Stand wird dem Spieler gemeldet (main.ts ist ohne Browser nicht ladbar, geprüft im Quelltext)', () => {
    const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(main).toContain("geladen.befund === 'repariert'");
    expect(main).toContain("'Dein Spielstand hatte unlesbare Werte – sie sind jetzt auf sichere Werte gesetzt, dein Dorf bleibt.'");
  });
});
