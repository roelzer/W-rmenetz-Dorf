import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { bedarfKw } from '../src/core/netz';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { KATALOG, KONSTANTEN, PREISSTUFEN } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';

/**
 * A88 / F2 Kundenanfrage – verdeckte Abnahmetests (Bauplan docs/bauplaene/A88-freischalt-leiter.md, 6b, 7b, T11).
 * Ersetzt die alten A34-Automatik-Tests aus tests/anpassungen.test.ts. Nutzt das ECHTE Freischalt-Modul (kein vi.mock).
 *
 * Handwerte (aus katalog.ts/orte.ts gelesen, nicht mit dem Code gerechnet):
 *   Starthäuser: Einfamilienhaus, 15.000 kWh/a, ohne Hauspuffer 1.500 Volllaststunden → 10 kW; Station st_15 (15 kW).
 *   Kamin aus ×1,5 → 15 kW · Aufstockung ×1,4 → 14 kW · beides → 21 kW.
 *   Zwei Starthäuser angeschlossen → Netzbedarf 20 kW.
 *   Kamin-Wartezeit 900 s mit Zufriedenheit ≥ 95 %; Aufstockung nach 1.800 s + (id % 4) × 300 s warmer Zeit.
 */

const T0 = 1_000_000_000_000;
type Uhr = { t: number };

function spiel(preisstufe?: number): { s: Spiel; z: Uhr } {
  const z = { t: T0 };
  const s = new Spiel(neuerSpielstand(T0), () => z.t);
  s.ersteQuelleWaehlen('kessel');
  if (preisstufe !== undefined) s.preisSetzen(preisstufe);
  return { s, z };
}
/** Spielzeit in 10-s-Schritten (keine Abwesenheit). */
const lauf = (s: Spiel, z: Uhr, sek: number) => { for (let i = 0; i < sek / 10; i++) { z.t += 10_000; s.bis(z.t); } };
const takt = (s: Spiel, z: Uhr) => lauf(s, z, 10);
/** Die angeschlossenen Starthäuser (haben ab Start eine Station). */
const starthaeuser = (s: Spiel): Objekt[] => s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.station);
const hinweiseAb = (s: Spiel, ab: number): string[] =>
  s.ereignisse.slice(ab).flatMap((e) => (e.art === 'hinweis' ? [e.text] : []));
const schwebtexteAb = (s: Spiel, ab: number) =>
  s.ereignisse.slice(ab).flatMap((e) => (e.art === 'schwebtext' ? [e] : []));
const schwelleAufstockung = (o: Objekt) => KONSTANTEN.aufstockung_nach_s + (o.id % 4) * 300;
const ANFRAGE_KAMIN = KONSTANTEN.vollversorgung_nach_s + 1200; // Muster aus dem alten A34-Test

describe('A88/F2 Kundenanfrage: Kunden wachsen nur, wenn der Spieler zustimmt', () => {
  it('test_a88_f2_vorbedingung_startdorf: zwei Starthäuser à 10 kW, Netzbedarf 20 kW, Station 15 kW', () => {
    const { s } = spiel();
    const hs = starthaeuser(s);
    expect(hs).toHaveLength(2);
    for (const h of hs) {
      expect(h.typ).toBe('efh');
      expect(bedarfKw(h)).toBeCloseTo(10, 9);
      expect(h.station).toBe('st_15');
      expect(s.netz.warm.has(h.id)).toBe(true);
    }
    expect(s.netz.bedarf_kw).toBeCloseTo(20, 6);
    expect(s.hzStufe).toBe(1);
  });

  it('test_a88_f2_kamin_wird_anfrage: sehr zufriedener Kunde fragt an, der Bedarf bleibt 10 kW', () => {
    const { s, z } = spiel(0);
    const ab = s.ereignisse.length;
    const [h, h2] = starthaeuser(s);
    lauf(s, z, 600); // noch unter der Wartezeit
    expect(h.anfrage).toBeUndefined();
    lauf(s, z, ANFRAGE_KAMIN - 600);
    expect(h.anfrage).toBe('vollversorgung');
    expect(h2.anfrage).toBe('vollversorgung');
    expect(h.vollversorgung).toBeFalsy();
    expect(h.aufgestockt).toBeFalsy();
    expect(bedarfKw(h)).toBeCloseTo(10, 9);
    expect(s.netz.bedarf_kw).toBeCloseTo(20, 6);
    expect(s.netz.warm.has(h.id)).toBe(true);
    const texte = hinweiseAb(s, ab);
    const anfragen = texte.filter((t) => t.includes('fragt an'));
    expect(anfragen).toHaveLength(2);
    expect(anfragen[0]).toMatch(/Kamin/);
    expect(anfragen[0]).toMatch(/\b15([,.]0)? kW/);
    expect(texte.some((t) => t.includes('hat den Kamin abgeschaltet'))).toBe(false);
    expect(texte.some((t) => t.includes('Kunden fragen nach mehr Wärme'))).toBe(false); // nicht abwesend
    expect(schwebtexteAb(s, ab).some((e) => e.text === 'fragt an' && e.farbe === '#ffd166')).toBe(true);
  });

  it('test_a88_f2_annehmen: Kamin aus wird gewährt, kostenlos, Bedarf 15 kW, Netz rechnet neu, Stufe 1', () => {
    const { s, z } = spiel(0);
    const [h] = starthaeuser(s);
    lauf(s, z, ANFRAGE_KAMIN);
    expect(h.anfrage).toBe('vollversorgung');
    const geld = s.stand.geld_eur, ab = s.ereignisse.length;
    expect(s.anfrageAnnehmen(h.id).ok).toBe(true);
    expect(s.stand.geld_eur).toBe(geld);
    expect(h.vollversorgung).toBe(true);
    expect(h.aufgestockt).toBeFalsy();
    expect(h.anfrage).toBeUndefined();
    expect(bedarfKw(h)).toBeCloseTo(15, 9);
    expect(s.netz.bedarf_kw).toBeCloseTo(25, 6);
    expect(s.hzStufe).toBe(1);
    expect(hinweiseAb(s, ab).some((t) => t.includes('Kamin'))).toBe(true);
    expect(schwebtexteAb(s, ab).some((e) => e.text === 'Kamin aus')).toBe(true);
  });

  it('test_a88_f2_doppelt_annehmen: zweites Annehmen wird abgelehnt, der Bedarf steigt nicht zweimal', () => {
    const { s, z } = spiel(0);
    const [h] = starthaeuser(s);
    lauf(s, z, ANFRAGE_KAMIN);
    expect(s.anfrageAnnehmen(h.id).ok).toBe(true);
    expect(s.anfrageAnnehmen(h.id).ok).toBe(false);
    expect(s.anfrageAblehnen(h.id).ok).toBe(false);
    expect(h.vollversorgung).toBe(true);
    expect(bedarfKw(h)).toBeCloseTo(15, 9);
    expect(s.netz.bedarf_kw).toBeCloseTo(25, 6);
  });

  it('test_a88_f2_ablehnen_kommt_wieder: Ablehnen ist kostenlos und ohne Strafe, nach der Wartezeit fragt der Kunde erneut', () => {
    const a = spiel(0), b = spiel(0);
    const [ha] = starthaeuser(a.s), [hb] = starthaeuser(b.s);
    lauf(a.s, a.z, ANFRAGE_KAMIN); lauf(b.s, b.z, ANFRAGE_KAMIN);
    expect(ha.anfrage).toBe('vollversorgung');
    const geld = a.s.stand.geld_eur, warm = ha.warm_s, ab = a.s.ereignisse.length;
    expect(a.s.anfrageAblehnen(ha.id).ok).toBe(true);
    expect(a.s.stand.geld_eur).toBe(geld);
    expect(ha.anfrage).toBeUndefined();
    expect(ha.vollversorgung).toBeFalsy();
    expect(ha.voll_s).toBe(0);
    expect(ha.warm_s).toBe(warm); // Kamin-Ablehnung setzt nur den Kamin-Zähler zurück
    expect(ha.zufriedenheit_pct!).toBeCloseTo(hb.zufriedenheit_pct!, 2);
    expect(bedarfKw(ha)).toBeCloseTo(10, 9);
    expect(hinweiseAb(a.s, ab).some((t) => /wartet/.test(t) && /später/.test(t))).toBe(true);
    // Die Aufstockung dieses Hauses käme sonst nach 1.800 s + Versatz zuerst; hier wird nur das Wiederkommen der Kamin-Anfrage geprüft.
    ha.warm_s = 0;
    lauf(a.s, a.z, 600);
    expect(ha.anfrage).toBeUndefined(); // Zähler steht wirklich auf 0, nicht nur die Anfrage gelöscht
    lauf(a.s, a.z, KONSTANTEN.vollversorgung_nach_s + 300 - 600);
    expect(ha.anfrage).toBe('vollversorgung');
    expect(ha.vollversorgung).toBeFalsy();
  });

  it('test_a88_f2_aufstockung_wird_anfrage: genau an der Schwelle (mit Versatz je Haus) fragt der Kunde, Annehmen ergibt 14 kW', () => {
    const PREIS = 2;
    expect(PREISSTUFEN[PREIS].zufriedenheit_pct).toBeLessThan(95); // Kamin-Anfrage kommt hier nicht
    const { s, z } = spiel(PREIS);
    const h = starthaeuser(s)[1]; // zweites Starthaus: anderer Versatz als das erste
    const schwelle = schwelleAufstockung(h);
    h.warm_s = schwelle - 15;
    takt(s, z); // warm_s = Schwelle − 5
    expect(h.anfrage).toBeUndefined();
    const ab = s.ereignisse.length;
    takt(s, z); // warm_s = Schwelle + 5
    expect(h.anfrage).toBe('aufstockung');
    expect(h.aufgestockt).toBeFalsy();
    expect(bedarfKw(h)).toBeCloseTo(10, 9);
    const anfrage = hinweiseAb(s, ab).find((t) => t.includes('Stockwerk'));
    expect(anfrage).toBeDefined();
    expect(anfrage).toMatch(/\b14([,.]0)? kW/);
    expect(s.anfrageAnnehmen(h.id).ok).toBe(true);
    expect(h.aufgestockt).toBe(true);
    expect(h.vollversorgung).toBeFalsy();
    expect(h.anfrage).toBeUndefined();
    expect(bedarfKw(h)).toBeCloseTo(14, 9);
    expect(s.netz.bedarf_kw).toBeCloseTo(24, 6);
  });

  it('test_a88_f2_aufstockung_ablehnen: setzt die warme Zeit auf 0, keine neue Anfrage gleich danach', () => {
    const { s, z } = spiel(2);
    const h = starthaeuser(s)[0];
    h.warm_s = schwelleAufstockung(h) + 1;
    takt(s, z);
    expect(h.anfrage).toBe('aufstockung');
    const geld = s.stand.geld_eur;
    expect(s.anfrageAblehnen(h.id).ok).toBe(true);
    expect(s.stand.geld_eur).toBe(geld);
    expect(h.warm_s).toBe(0);
    expect(h.anfrage).toBeUndefined();
    expect(h.aufgestockt).toBeFalsy();
    lauf(s, z, 600);
    expect(h.anfrage).toBeUndefined();
    expect(bedarfKw(h)).toBeCloseTo(10, 9);
  });

  it('test_a88_f2_eine_anfrage_je_haus: beide Bedingungen erfüllt → erst Kamin, nach Annehmen die Aufstockung', () => {
    const { s, z } = spiel(0);
    const [h] = starthaeuser(s);
    h.zufriedenheit_pct = 99;
    h.voll_s = KONSTANTEN.vollversorgung_nach_s;
    h.warm_s = schwelleAufstockung(h);
    takt(s, z);
    expect(h.anfrage).toBe('vollversorgung');
    expect(h.vollversorgung).toBeFalsy();
    expect(h.aufgestockt).toBeFalsy();
    takt(s, z);
    expect(h.anfrage).toBe('vollversorgung'); // offene Anfrage wird nicht überschrieben
    expect(s.anfrageAnnehmen(h.id).ok).toBe(true);
    takt(s, z);
    expect(h.anfrage).toBe('aufstockung');
    expect(h.aufgestockt).toBeFalsy();
    expect(s.anfrageAnnehmen(h.id).ok).toBe(true);
    expect(bedarfKw(h)).toBeCloseTo(21, 9);
    lauf(s, z, 600);
    expect(h.anfrage).toBeUndefined(); // nichts mehr zu fragen
  });

  it('test_a88_f2_ohne_anfrage_nein: ohne Anfrage, auf dem Büro, unbekannte Nummer, unbekannter Wert, gekündigt → abgelehnt, nichts geändert', () => {
    const { s } = spiel(0);
    const [h] = starthaeuser(s);
    const geld = s.stand.geld_eur;
    expect(s.anfrageAnnehmen(h.id).ok).toBe(false);
    expect(s.anfrageAblehnen(h.id).ok).toBe(false);
    const buero = s.stand.objekte.find((o) => o.typ === 'buero')!;
    expect(s.anfrageAnnehmen(buero.id).ok).toBe(false);
    expect(s.anfrageAblehnen(buero.id).ok).toBe(false);
    expect(s.anfrageAnnehmen(987_654).ok).toBe(false);
    expect(s.anfrageAblehnen(-1).ok).toBe(false);
    // manipulierter Spielstand
    (h as { anfrage?: string }).anfrage = 'kaputt';
    expect(s.anfrageAnnehmen(h.id).ok).toBe(false);
    expect(h.anfrage).toBeUndefined();
    (h as { anfrage?: string }).anfrage = "' OR 1=1 --";
    expect(s.anfrageAblehnen(h.id).ok).toBe(false);
    // gekündigtes Haus
    h.anfrage = 'vollversorgung'; h.gekuendigt = true;
    expect(s.anfrageAnnehmen(h.id).ok).toBe(false);
    expect(s.anfrageAblehnen(h.id).ok).toBe(false);
    expect(h.vollversorgung).toBeFalsy();
    expect(h.aufgestockt).toBeFalsy();
    expect(bedarfKw(h)).toBeCloseTo(10, 9);
    expect(s.stand.geld_eur).toBe(geld);
  });

  it('test_a88_f2_kuendigung_loescht_anfrage: kündigt der Kunde, verschwindet seine offene Anfrage', () => {
    const { s, z } = spiel(PREISSTUFEN.length - 1); // teuerste Stufe
    const [h] = starthaeuser(s);
    h.anfrage = 'aufstockung';
    h.zufriedenheit_pct = 0;
    takt(s, z);
    expect(h.gekuendigt).toBe(true);
    expect(h.anfrage).toBeUndefined();
    expect(h.aufgestockt).toBeFalsy();
  });

  it('test_a88_f2_altstand_bleibt_aufgestockt: alter Stand mit beiden Flags lädt unverändert (21 kW) und fragt nicht erneut', () => {
    const { s, z } = spiel(0);
    const [h] = starthaeuser(s);
    h.aufgestockt = true; h.vollversorgung = true;
    const text = serialisieren(s.stand);
    const geladen = ladenMitBefund(text, z.t);
    expect(geladen.befund).toBe('ok');
    const s2 = new Spiel(geladen.stand, () => z.t);
    const h2 = s2.stand.objekte.find((o) => o.id === h.id)!;
    expect(h2.aufgestockt).toBe(true);
    expect(h2.vollversorgung).toBe(true);
    expect(bedarfKw(h2)).toBeCloseTo(21, 9);
    lauf(s2, z, 3600);
    expect(h2.anfrage).toBeUndefined();
    expect(h2.aufgestockt).toBe(true);
    expect(h2.vollversorgung).toBe(true);
  });

  it('test_a88_f2_anfrage_wird_gespeichert: offene Anfrage übersteht Speichern und Laden und lässt sich danach annehmen', () => {
    const { s, z } = spiel(2);
    const h = starthaeuser(s)[1];
    h.anfrage = 'aufstockung';
    const geladen = ladenMitBefund(serialisieren(s.stand), z.t);
    expect(geladen.befund).toBe('ok');
    const s2 = new Spiel(geladen.stand, () => z.t);
    const h2 = s2.stand.objekte.find((o) => o.id === h.id)!;
    expect(h2.anfrage).toBe('aufstockung');
    expect(h2.aufgestockt).toBeFalsy();
    expect(s2.anfrageAnnehmen(h2.id).ok).toBe(true);
    expect(h2.aufgestockt).toBe(true);
    expect(bedarfKw(h2)).toBeCloseTo(14, 9);
  });

  it('test_a88_f2_abwesend_eine_meldung: zwei Anfragen während der Abwesenheit → eine Sammelzeile, keine Einzelmeldung', () => {
    const { s, z } = spiel(0);
    const ab = s.ereignisse.length;
    z.t = T0 + ANFRAGE_KAMIN * 1000; // ein einziger Sprung, deutlich über der Abwesenheitsschwelle (300 s)
    s.bis(z.t);
    const hs = starthaeuser(s);
    expect(hs.filter((h) => h.anfrage === 'vollversorgung')).toHaveLength(2);
    expect(hs.some((h) => h.vollversorgung || h.aufgestockt)).toBe(false);
    const texte = hinweiseAb(s, ab);
    expect(texte.filter((t) => t.includes('fragt an'))).toHaveLength(0);
    const sammel = texte.filter((t) => t.includes('Kunden fragen nach mehr Wärme'));
    expect(sammel).toHaveLength(1);
    expect(sammel[0]).toMatch(/\b2 Kunden fragen nach mehr Wärme/);
    expect(sammel[0]).toMatch(/Während du weg warst/);
  });

  it('test_a88_f2_anfrage_bedarf: anfrageBedarf_kw zeigt den Bedarf nach Annahme, ohne das Haus zu verändern', () => {
    const { s } = spiel();
    const [h] = starthaeuser(s);
    expect(s.anfrageBedarf_kw(h)).toBeCloseTo(10, 9);
    h.anfrage = 'vollversorgung';
    expect(s.anfrageBedarf_kw(h)).toBeCloseTo(15, 9);
    h.anfrage = 'aufstockung';
    expect(s.anfrageBedarf_kw(h)).toBeCloseTo(14, 9);
    h.aufgestockt = true; h.anfrage = 'vollversorgung';
    expect(s.anfrageBedarf_kw(h)).toBeCloseTo(21, 9);
    expect(h.vollversorgung).toBeFalsy(); // nur gerechnet, nicht gesetzt
    expect(h.anfrage).toBe('vollversorgung');
    expect(bedarfKw(h)).toBeCloseTo(14, 9);
  });

  it('test_a88_f2_anfrage_bedarf_viele_faelle: Bedarf nach Annahme = Bedarf heute × Faktor der Anfrage (400 erzeugte Häuser, fester Startwert)', () => {
    const { s } = spiel();
    let x = 42; // fester Startwert, lineare Kongruenz
    const zufall = () => { x = (x * 1_103_515_245 + 12_345) % 2_147_483_648; return x / 2_147_483_648; };
    const typen = ['efh', 'rh', 'baeck', 'mfh'] as const;
    for (let i = 0; i < 400; i++) {
      const o: Objekt = { id: 50_000 + i, typ: typen[Math.floor(zufall() * typen.length)], x: 0, y: 0, stufe: 1, bau: null, kasse_eur: 0 };
      if (zufall() < 0.5) o.hauspuffer = true;
      const art = zufall();
      if (art < 0.33) { o.aufgestockt = zufall() < 0.5; o.anfrage = 'vollversorgung'; }
      else if (art < 0.66) { o.vollversorgung = zufall() < 0.5; o.anfrage = 'aufstockung'; }
      else { o.aufgestockt = zufall() < 0.5; o.vollversorgung = zufall() < 0.5; }
      const heute = bedarfKw(o);
      const faktor = o.anfrage === 'vollversorgung' ? 1.5 : o.anfrage === 'aufstockung' ? 1.4 : 1;
      expect(heute).toBeGreaterThan(0);
      expect(s.anfrageBedarf_kw(o)).toBeCloseTo(heute * faktor, 9);
      expect(s.anfrageBedarf_kw(o)).toBeGreaterThanOrEqual(heute);
    }
  });

  it('test_a88_f2_zusammenspiel_station_zu_klein: angenommene Anfrage macht das Haus kalt, wenn die Station nicht reicht', () => {
    const { s } = spiel();
    const [h] = starthaeuser(s);
    h.aufgestockt = true; // alter Stand: 14 kW, Station 15 kW reicht noch
    s.neuBerechnen();
    expect(s.netz.warm.has(h.id)).toBe(true);
    h.anfrage = 'vollversorgung';
    expect(s.anfrageAnnehmen(h.id).ok).toBe(true); // keine Kapazitätsprüfung, der Spieler entscheidet
    expect(bedarfKw(h)).toBeCloseTo(21, 9);
    expect(s.netz.warm.has(h.id)).toBe(false);
    expect(s.netz.kalt.get(h.id)).toBe('station');
  });

  it('test_a88_f2_drei_stunden_ohne_annehmen: ohne Zustimmung wächst kein Bedarf, alle bleiben warm, jedes Starthaus fragt an', () => {
    const { s, z } = spiel(0);
    lauf(s, z, 3 * 3600);
    const hs = starthaeuser(s);
    for (const h of hs) {
      expect(s.netz.warm.has(h.id)).toBe(true);
      expect(h.aufgestockt).toBeFalsy();
      expect(h.vollversorgung).toBeFalsy();
      expect(h.anfrage).toBeDefined();
      expect(bedarfKw(h)).toBeCloseTo(10, 9);
    }
    expect(s.netz.bedarf_kw).toBeCloseTo(20, 6);
  });
});
