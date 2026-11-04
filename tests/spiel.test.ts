import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG, KONSTANTEN } from '../src/core/katalog';

const T0 = 1_000_000_000_000;
function start(): { s: Spiel; zeit: { t: number } } {
  const zeit = { t: T0 };
  const s = new Spiel(neuerSpielstand(T0), () => zeit.t);
  return { s, zeit };
}
/** Spiel mit gewählter Startquelle und einem warmen Haus. */
function laufend() {
  const g = start();
  g.s.ersteQuelleWaehlen('kessel');
  verlegeStartnetz(g.s);
  return g;
}
/** Legt die Leitung zum dritten Starthaus; die ersten zwei sind von Anfang an angeschlossen (A29). */
function verlegeStartnetz(s: Spiel): void {
  // A41: Leitungen entstehen in Bauabschnitten; das Startnetz liegt hier der Einfachheit halber schon.
  for (const [x, y] of [[12, 12]]) s.stand.objekte.push({ id: s.stand.naechste_id++, typ: 'd50', x, y, stufe: 1, bau: null, kasse_eur: 0 });
  s.neuBerechnen();
}
/** Bau-/Ausbauzeit in Millisekunden inkl. Spieltempo-Faktor (A26). */
const ms = (sek: number): number => sek * KONSTANTEN.bauzeit_faktor * 1000;
/** n-tes freies 1×1-Feld im Südwesten der Karte (unabhängig von zufälligen Hindernissen). */
function frei(s: Spiel, n = 0): [number, number] {
  const r: Array<[number, number]> = [];
  for (let y = 22; y >= 0 && r.length <= n; y--) for (let x = 0; x < 6 && r.length <= n; x++) if (s.kannPlatzieren('baum', x, y)) r.push([x, y]);
  return r[n];
}
const finde = (s: Spiel, typ: string) => s.stand.objekte.find((o) => o.typ === typ)!;

describe('A3 Startquelle', () => {
  it('neues Spiel hat noch keine Quelle gewählt', () => {
    const { s } = start();
    expect(s.stand.quelle_gewaehlt).toBe(false);
    expect(s.stand.innen).toHaveLength(0);
    expect(s.netz.verfuegbar_kw).toBe(0);
  });
  it('gewählte Quelle steht im Heizhaus, ist gratis und liefert Wärme', () => {
    const { s } = start();
    const geld = s.stand.geld_eur;
    expect(s.ersteQuelleWaehlen('wpg').ok).toBe(true);
    expect(s.stand.innen.map((k) => k.typ)).toEqual(['wpg']);
    expect(s.stand.geld_eur).toBe(geld);
    expect(s.netz.verfuegbar_kw).toBe(45);
    expect(s.stand.quelle_gewaehlt).toBe(true);
  });
});

describe('A4 Bauen und Platzieren', () => {
  it('Platzieren auf freiem Feld funktioniert und kostet Geld', () => {
    const { s } = laufend();
    const geld = s.stand.geld_eur;
    expect(s.platzieren('baum', ...frei(s)).ok).toBe(true);
    expect(s.stand.geld_eur).toBe(geld - 40);
  });
  it('belegtes Feld und Kartenrand werden abgelehnt', () => {
    const { s } = laufend();
    const hz = s.hz;
    expect(s.platzieren('baum', hz.x, hz.y).ok).toBe(false);
    expect(s.platzieren('mfh', 23, 23).ok).toBe(false);
    expect(s.platzieren('baum', -1, 0).ok).toBe(false);
  });
  it('ohne genug Geld wird nicht gebaut und nichts abgezogen', () => {
    const { s } = laufend();
    s.stand.geld_eur = 10;
    expect(s.platzieren('baum', ...frei(s)).ok).toBe(false);
    expect(s.stand.geld_eur).toBe(10);
  });
  it('Obergrenze je Heizzentralen-Stufe gilt', () => {
    const { s } = laufend();
    expect(s.platzieren('rh', ...frei(s)).ok).toBe(false); // Reihenhaus erst ab Stufe 2
    expect(s.platzieren('d110', ...frei(s)).ok).toBe(false); // Hauptleitung erst ab Stufe 2
  });
  it('Deko lässt sich entfernen, Großabnehmer nicht verschieben', () => {
    const { s } = laufend();
    s.platzieren('baum', ...frei(s));
    const baum = s.stand.objekte.at(-1)!;
    expect(s.entfernen(baum.id).ok).toBe(true);
    expect(s.verschieben(finde(s, 'bad').id, 5, 5).ok).toBe(false);
  });
  it('Hindernis wegräumen kostet Geld und bringt Dorftaler', () => {
    const { s } = laufend();
    const h = s.stand.objekte.find((o) => o.typ === 'stein' || o.typ === 'busch')!;
    const taler = s.stand.taler;
    expect(s.hindernisRaeumen(h.id).ok).toBe(true);
    expect(s.stand.taler).toBeGreaterThan(taler);
    expect(s.objekt(h.id)).toBeUndefined();
  });
});

describe('A5 Bauzeit, Monteure, Beschleunigen', () => {
  it('Haus braucht eine Bauzeit, danach ist es fertig', () => {
    const { s, zeit } = laufend();
    s.platzieren('efh', ...frei(s));
    const h = s.stand.objekte.at(-1)!;
    expect(h.bau).not.toBeNull();
    zeit.t += ms(KATALOG.efh.bauzeit_s![0]) - 2_000; s.bis(zeit.t);
    expect(h.bau).not.toBeNull();
    zeit.t += 3_000; s.bis(zeit.t);
    expect(h.bau).toBeNull();
  });
  it('Timer sind absolute Zeitstempel (Startzeit + Dauer)', () => {
    const { s } = laufend();
    s.platzieren('efh', ...frei(s));
    const b = s.stand.objekte.at(-1)!.bau!;
    expect(b.ende_ms - b.start_ms).toBe(ms(KATALOG.efh.bauzeit_s![0]));
    expect(b.start_ms).toBe(T0);
  });
  it('mit einer Hütte gibt es eine Baustelle, die zweite wird abgelehnt; eine zweite Hütte erlaubt zwei', () => {
    const { s } = laufend();
    expect(s.monteure()).toBe(1);
    expect(s.platzieren('efh', ...frei(s)).ok).toBe(true);
    expect(s.platzieren('efh', ...frei(s)).ok).toBe(false);
  });
  it('Sofort-Objekte (Leitungen) brauchen keinen Monteur', () => {
    const { s } = laufend();
    s.platzieren('efh', ...frei(s)); s.platzieren('efh', ...frei(s));
    s.stand.abschnitt = { phase: 'offen', bau: null };
    expect(s.platzieren('d25', ...frei(s)).ok).toBe(true);
  });
  it('Beschleunigen kostet Dorftaler und beendet die Baustelle sofort', () => {
    const { s } = laufend();
    s.platzieren('efh', ...frei(s));
    const h = s.stand.objekte.at(-1)!;
    const taler = s.stand.taler;
    expect(s.beschleunigen(h.bau).ok).toBe(true);
    expect(h.bau).toBeNull();
    expect(s.stand.taler).toBeLessThan(taler);
  });
  it('ohne Dorftaler kein Beschleunigen', () => {
    const { s } = laufend();
    s.platzieren('efh', ...frei(s));
    s.stand.taler = 0;
    expect(s.beschleunigen(s.stand.objekte.at(-1)!.bau).ok).toBe(false);
  });
  it('Ausbau der Heizzentrale auf Stufe 2 erhöht die Stufe', () => {
    const { s, zeit } = laufend();
    s.stand.geld_eur = 150_000;
    expect(s.ausbauen(s.hz.id).ok).toBe(false); // A39: erst drei Anschlüsse
    const drittes = s.stand.objekte.find((o) => o.typ === 'efh' && o.ohne_station)!;
    drittes.ohne_station = false; drittes.station = 'st_15'; s.neuBerechnen();
    zeit.t += 600_000; s.bis(zeit.t); // Leitung fertig
    expect(s.ausbauen(s.hz.id).ok).toBe(true);
    zeit.t += ms(KATALOG.hz.bauzeit_s![1]) + 1_000; s.bis(zeit.t);
    expect(s.hzStufe).toBe(2);
  });
});

describe('A10/A11 Einnahmen, Abholen, Kasse, Zufriedenheit', () => {
  /** Ein Haus am Heizhaus, direkt angeschlossen. */
  function mitHaus() {
    const g = laufend();
    const h = g.s.stand.objekte.find((o) => o.typ === 'efh' && o.x === 9)!;
    // bestehendes Startdorf: Leitungen von hz zu Häusern liegen schon
    return { ...g, h };
  }
  it('warme Kunden erzeugen Einnahmen, kalte nicht', () => {
    const { s, zeit } = mitHaus();
    expect(s.netz.einnahmen_eur_min).toBeGreaterThan(0);
    zeit.t += 60_000; s.bis(zeit.t);
    const summe = s.stand.objekte.reduce((a, o) => a + o.kasse_eur, 0);
    expect(summe).toBeGreaterThan(0);
    const { s: s2, zeit: z2 } = start(); // keine Quelle: alle kalt
    z2.t += 60_000; s2.bis(z2.t);
    expect(s2.stand.objekte.reduce((a, o) => a + o.kasse_eur, 0)).toBe(0);
  });
  it('Abholen bucht auf die Kasse und leert das Haus', () => {
    const { s, zeit } = mitHaus();
    zeit.t += 120_000; s.bis(zeit.t);
    const o = s.stand.objekte.find((x) => x.kasse_eur >= 1)!;
    const vorher = s.stand.geld_eur, menge = s.einsammeln(o);
    expect(menge).toBeGreaterThan(0);
    expect(s.stand.geld_eur).toBe(vorher + menge);
  });
  it('Kasse ist gedeckelt: nichts über das Limit', () => {
    const { s } = mitHaus();
    s.stand.geld_eur = s.kassengrenze_eur();
    const o = s.stand.objekte.find((x) => x.typ === 'efh')!;
    o.kasse_eur = 50;
    expect(s.einsammeln(o)).toBe(0);
    expect(s.stand.geld_eur).toBe(s.kassengrenze_eur());
  });
  it('Betriebskosten werden nur für tatsächlich erzeugte Wärme abgezogen', () => {
    const { s, zeit } = laufend();
    // ohne Last: keine Kosten
    const g0 = s.stand.geld_eur;
    s.stand.objekte = s.stand.objekte.filter((o) => !['efh', 'd25', 'd50'].includes(o.typ)); s.neuBerechnen();
    zeit.t += 60_000; s.bis(zeit.t);
    expect(s.stand.geld_eur).toBe(g0);
  });
  it('dauerhaft kaltes Haus wird unzufrieden und kündigt', () => {
    const { s, zeit } = start();
    s.ersteQuelleWaehlen('kessel');
    verlegeStartnetz(s);
    s.stand.innen = []; // keine Wärme
    s.stand.innen.push({ typ: 'kessel', stufe: 1, bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 99_999_999_999 } });
    s.neuBerechnen();
    zeit.t += 30 * 60_000; s.bis(zeit.t);
    expect(s.stand.objekte.filter((o) => o.gekuendigt).length).toBeGreaterThan(0);
  });
  it('Zurückgewinnen kostet Geld, geht aber nicht bei zu hohem Preis', () => {
    const { s } = laufend();
    const h = s.stand.objekte.find((o) => o.typ === 'efh')!;
    h.gekuendigt = true;
    s.preisSetzen(8);
    expect(s.zurueckgewinnen(h.id).ok).toBe(false);
    s.preisSetzen(5);
    const geld = s.stand.geld_eur;
    expect(s.zurueckgewinnen(h.id).ok).toBe(true);
    expect(s.stand.geld_eur).toBe(geld - KONSTANTEN.zurueckgewinnen_eur);
    expect(h.gekuendigt).toBe(false);
  });
});

describe('A12 Großabnehmer-Vertrag', () => {
  it('Hallenbad: ohne Heizzentralen-Stufe 2 kein Vertrag', () => {
    const { s } = laufend();
    const bad = finde(s, 'bad');
    const b = s.vertragBedingungen(bad);
    expect(b.ok).toBe(false);
    expect(b.fehlt.join(' ')).toContain('Heizzentrale Stufe 2');
    expect(s.vertragUnterschreiben(bad.id).ok).toBe(false);
    expect(bad.zustand).toBe('gesperrt');
  });
  it('Hallenbad: mit erfüllten Bedingungen wird der Vertrag geschlossen', () => {
    const { s } = laufend();
    s.hz.stufe = 2;
    s.stand.innen.push({ typ: 'kessel', stufe: 1, bau: null }, { typ: 'kessel', stufe: 1, bau: null });
    s.neuBerechnen();
    const bad = finde(s, 'bad');
    expect(s.vertragBedingungen(bad).ok).toBe(true);
    expect(s.vertragUnterschreiben(bad.id).ok).toBe(true);
    expect(bad.zustand).toBe('vertrag');
  });
});

describe('A13 Förderung', () => {
  const bauePuffer = (g: ReturnType<typeof laufend>) => { g.s.stand.geld_eur = 120_000; return g.s.platzieren('puffer', ...frei(g.s)); };
  it('bewilligter Antrag zahlt nach Fertigstellung 40 % zurück', () => {
    const g = laufend();
    g.s.foerderungBeantragen('puffer');
    g.zeit.t += KONSTANTEN.foerderdauer_s * 1000 + 1; g.s.bis(g.zeit.t);
    expect(g.s.stand.antraege.puffer?.stand).toBe('bewilligt');
    bauePuffer(g);
    const vorher = g.s.stand.geld_eur;
    g.zeit.t += ms(KATALOG.puffer.bauzeit_s![0]) + 1_000; g.s.bis(g.zeit.t);
    expect(g.s.stand.geld_eur).toBeGreaterThanOrEqual(vorher + Math.round(KATALOG.puffer.kosten_eur![0] * KONSTANTEN.foerderquote) - 5);
  });
  it('vorzeitiger Baubeginn lässt den Antrag verfallen', () => {
    const g = laufend();
    g.s.foerderungBeantragen('puffer');
    bauePuffer(g);
    expect(g.s.stand.antraege.puffer).toBeUndefined();
    const o = g.s.stand.objekte.at(-1)!;
    g.zeit.t += 10_000; g.s.bis(g.zeit.t);
    expect(o.foerderung_eur).toBeUndefined();
    expect(g.s.stand.erledigt.funded).toBeUndefined();
  });
  it('ohne Antrag gibt es keine Förderung', () => {
    const g = laufend();
    bauePuffer(g);
    expect(g.s.stand.objekte.at(-1)!.foerderung_eur).toBeUndefined();
  });
});

describe('A15 Offline-Fortschritt', () => {
  it('eine lange Pause rechnet dasselbe wie viele kleine Schritte', () => {
    const a = laufend(), b = laufend();
    a.zeit.t += 10 * 60_000; a.s.bis(a.zeit.t);
    for (let i = 0; i < 600; i++) { b.zeit.t += 1000; b.s.bis(b.zeit.t); }
    const summe = (s: Spiel) => s.stand.objekte.reduce((x, o) => x + o.kasse_eur, 0);
    expect(summe(a.s)).toBeCloseTo(summe(b.s), 3);
    expect(a.s.stand.geld_eur).toBeCloseTo(b.s.stand.geld_eur, 3);
  });
  it('Bauten, die offline fertig wurden, sind beim Zurückkommen fertig', () => {
    const g = laufend();
    g.s.platzieren('efh', ...frei(g.s));
    g.zeit.t += 3600_000; g.s.bis(g.zeit.t);
    expect(g.s.stand.objekte.at(-1)!.bau).toBeNull();
  });
  it('Offline-Zeit ist auf 12 Stunden begrenzt', () => {
    const g = laufend();
    g.zeit.t += 100 * 3600_000; g.s.bis(g.zeit.t);
    expect(g.s.stand.zuletzt_ms).toBe(g.zeit.t);
  });
  it('gleicher Stand + gleiche Zeit = gleiches Ergebnis (deterministisch)', () => {
    const a = laufend(), b = laufend();
    for (const g of [a, b]) { g.zeit.t += 5 * 60_000; g.s.bis(g.zeit.t); }
    expect(JSON.stringify(a.s.stand)).toBe(JSON.stringify(b.s.stand));
  });
});

import { AUFTRAEGE, pruefeAuftraege } from '../src/core/auftraege';
import { laden, ladenMitBefund, serialisieren } from '../src/core/speichern';

describe('A14 Aufträge', () => {
  it('erster Auftrag ist offen, Belohnung wird einmal gutgeschrieben', () => {
    const { s } = laufend();
    const a = pruefeAuftraege(s);
    expect(a?.id).toBeDefined();
    const taler = s.stand.taler;
    s.stand.erledigt.collect = true; // Auftrag 2 erfüllen, ohne Auftrag 1 zu stören
    pruefeAuftraege(s);
    pruefeAuftraege(s);
    expect(s.stand.taler).toBe(taler + AUFTRAEGE.find((x) => x.id === 'col')!.taler);
  });
  it('Heizzentrale auf Stufe 2 erfüllt den passenden Auftrag', () => {
    const { s } = laufend();
    s.hz.stufe = 2;
    pruefeAuftraege(s);
    expect(s.stand.erledigt.hz2).toBe(true);
  });
});

describe('A15 Speichern und Laden', () => {
  it('Speichern und Laden ergibt denselben Spielstand', () => {
    const { s, zeit } = laufend();
    zeit.t += 60_000; s.bis(zeit.t);
    const geladen = laden(serialisieren(s.stand), zeit.t);
    expect(JSON.parse(serialisieren(geladen))).toEqual(JSON.parse(serialisieren(s.stand)));
  });
  it('kaputte oder fremde Daten ergeben ein neues Spiel statt eines Absturzes', () => {
    for (const t of [null, '', '{', '[]', '{"version":3}', '{"version":2}', '{"version":1}', '{"version":2,"objekte":[],"innen":[],"geld_eur":1}']) {
      const st = laden(t, T0);
      expect(st.objekte.some((o) => o.typ === 'hz')).toBe(true);
      expect(st.quelle_gewaehlt).toBe(false);
    }
  });
  it('H1: Alter Spielstand (Version 1 mit p1/p2/p3) wird umgeschrieben und startet', () => {
    const alt = JSON.parse(serialisieren(neuerSpielstand(T0)));
    alt.version = 1;
    alt.objekte.push({ id: 998, typ: 'p2', x: 1, y: 1, stufe: 1, bau: null, kasse_eur: 0 });
    const r = ladenMitBefund(JSON.stringify(alt), T0);
    expect(r.befund).toBe('migriert');
    expect(r.stand.objekte.some((o) => o.typ === ('p2' as string))).toBe(false);
    expect(() => new Spiel(r.stand, () => T0)).not.toThrow();
  });
  it('H1: Unbekannter Objekttyp macht den Stand unbrauchbar (Befund defekt, neues Spiel, kein Absturz)', () => {
    const s = JSON.parse(serialisieren(neuerSpielstand(T0)));
    s.objekte.push({ id: 999, typ: 'gibtesnicht', x: 1, y: 1, stufe: 1, bau: null, kasse_eur: 0 });
    const r = ladenMitBefund(JSON.stringify(s), T0);
    expect(r.befund).toBe('defekt');
    expect(() => new Spiel(r.stand, () => T0)).not.toThrow();
  });
  it('H1: Ein gültiger Stand hat den Befund ok', () => {
    expect(ladenMitBefund(serialisieren(neuerSpielstand(T0)), T0).befund).toBe('ok');
  });
});
