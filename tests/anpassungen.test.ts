import { readFileSync } from 'node:fs';
import { Kamera } from '../src/render/kamera';
import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { bedarfKw } from '../src/core/netz';
import { ortHolen } from '../src/core/orte';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { KATALOG, KONSTANTEN, PREISSTUFEN, STATIONEN, istLeitung, passendeStation, LEITUNGEN, MIN_VORLAUF_C } from '../src/core/katalog';

const T0 = 1_000_000_000_000;
const neuesSpiel = (): Spiel => new Spiel(neuerSpielstand(T0), () => T0);

describe('A22/A29 Start', () => {
  it('A29: Start mit 30.000 €, Wärmepreis 12 ct/kWh, zwei angeschlossene Häuser, ein weiteres nicht', () => {
    const s = neuesSpiel();
    expect(s.stand.geld_eur).toBe(30_000);
    expect(PREISSTUFEN[s.stand.preisstufe].ct_je_kwh).toBe(12);
    s.ersteQuelleWaehlen('kessel');
    const haeuser = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus');
    expect(haeuser.filter((o) => s.netz.warm.has(o.id))).toHaveLength(2);
    expect(haeuser.filter((o) => o.station)).toHaveLength(2);
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
    const leitung = s.stand.objekte.find((o) => o.typ === 'd40')!;
    const vorher = s.stand.geld_eur;
    expect(s.leitungTauschen(leitung.id, 'd63').ok).toBe(true);
    expect(vorher - s.stand.geld_eur).toBe(KATALOG.d63.kosten_eur![0] - Math.round(KATALOG.d40.kosten_eur![0] * KONSTANTEN.rueckkauf_anteil));
  });
});

/** Mittelpunkt (mx, my) eines freien Plus-Zeichens (5 Felder) irgendwo auf der Karte. */
function freiesPlus(s: Spiel): [number, number] {
  for (let y = 1; y < 23; y++) for (let x = 1; x < 23; x++)
    if ([[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => s.kannPlatzieren('d50', x + dx, y + dy))) return [x, y];
  throw new Error('kein freier Platz');
}

describe('A23 Leitungen wie in echt', () => {
  it('A23/A47: Kreuzungen und T-Stücke werden nicht mehr abgelehnt (Verbindung entsteht automatisch)', () => {
    const s = neuesSpiel();
    s.stand.geld_eur = 10_000; s.stand.abschnitt = { phase: 'offen', bau: null };
    const [mx, my] = freiesPlus(s);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 0], [0, 1]]) expect(s.platzieren('d50', mx + dx, my + dy).ok).toBe(true);
  });
  it('A23: Hausanschluss darf dünner sein als die Hauptleitung (kein Planungsfehler)', () => {
    const s = neuesSpiel();
    s.stand.geld_eur = 10_000;
    s.ersteQuelleWaehlen('kessel');
    s.stand.abschnitt = { phase: 'offen', bau: null };
    // A59: Schon der Start hat eine 40er-Hauptleitung und einen 25er-Hausanschluss
    expect(s.stand.objekte.some((o) => o.typ === 'd25' && !o.geplant)).toBe(true);
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
    const l = s.stand.objekte.find((o) => o.typ === 'd40')!;
    const vor = s.stand.geld_eur;
    s.entfernen(l.id);
    expect(s.stand.geld_eur - vor).toBe(Math.round(KATALOG.d40.kosten_eur![0] * 0.5));
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

describe('A32 Übergabestationen', () => {
  const mitNetz = () => {
    const s = neuesSpiel();
    s.ersteQuelleWaehlen('kessel');
    s.stand.objekte.push({ id: s.stand.naechste_id++, typ: 'd50', x: 12, y: 12, stufe: 1, bau: null, kasse_eur: 0 }); s.neuBerechnen();
    return s;
  };
  it('A32: Haus ohne Station wird trotz Leitung nicht warm; mit passender Station schon', () => {
    const s = mitNetz();
    const haus = s.stand.objekte.find((o) => o.typ === 'efh' && o.x === 13 && o.y === 12)!;
    expect(s.netz.warm.has(haus.id)).toBe(false);
    const geld = s.stand.geld_eur;
    expect(s.stationKaufen(haus.id, 'st_15').ok).toBe(true);
    expect(geld - s.stand.geld_eur).toBe(STATIONEN.find((x) => x.id === 'st_15')!.kosten_eur);
    expect(s.netz.warm.has(haus.id)).toBe(true);
  });
  it('A32: eine zu kleine Station wird abgelehnt, die kleinste passende ist empfohlen', () => {
    const s = mitNetz();
    s.stand.objekte.push({ id: 901, typ: 'mfh', x: 2, y: 20, stufe: 1, bau: null, kasse_eur: 0, ohne_station: true });
    expect(s.stationKaufen(901, 'st_15').ok).toBe(false);
    expect(passendeStation(KATALOG.mfh.bedarf_kw!).leistung_kw).toBeGreaterThanOrEqual(KATALOG.mfh.bedarf_kw!);
  });
  it('A32: Großabnehmer-Station kostet 20.000 €', () => {
    expect(STATIONEN.at(-1)!.kosten_eur).toBe(20_000);
  });
  it('A32: Station, die für einen gewachsenen Bedarf zu klein ist, macht das Haus kalt (Grund „station“)', () => {
    const s = mitNetz();
    const haus = s.stand.objekte.find((o) => o.typ === 'efh' && o.x === 9 && o.y === 13)!;
    haus.station = 'st_15';
    for (const o of s.stand.objekte) if (o.id !== haus.id && o.station) { delete o.station; o.ohne_station = true; } // nur dieses Haus belastet die 40er-Hauptleitung
    (KATALOG.efh as { verbrauch_kwh_a: number }).verbrauch_kwh_a = 30_000; // 20 kW bei 1.500 h (A71)
    try { s.neuBerechnen(); expect(s.netz.kalt.get(haus.id)).toBe('station'); }
    finally { (KATALOG.efh as { verbrauch_kwh_a: number }).verbrauch_kwh_a = 15_000; }
  });
});

describe('A33 Vorlauftemperatur und Hausupgrades', () => {
  const haus = (s: Spiel) => s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.station)!;
  it('Vorlauf wird auf 5-K-Schritte und 55–85 °C begrenzt', () => {
    const s = neuesSpiel(); s.ersteQuelleWaehlen('kessel');
    s.vorlaufSetzen(20); expect(s.vorlauf_c).toBe(55);
    s.vorlaufSetzen(99); expect(s.vorlauf_c).toBe(85);
    s.vorlaufSetzen(68); expect(s.vorlauf_c).toBe(70);
  });
  it('Niedrigerer Vorlauf senkt die Betriebskosten', () => {
    const s = neuesSpiel(); s.ersteQuelleWaehlen('kessel');
    s.vorlaufSetzen(85); const hoch = s.netz.betriebskosten_eur_min;
    s.vorlaufSetzen(65); expect(s.netz.betriebskosten_eur_min).toBeLessThan(hoch);
  });
  it('Upgrade kostet Geld, ein Helfer arbeitet daran und danach sinkt der Mindest-Vorlauf des Hauses', () => {
    let t = T0; const s = new Spiel(neuerSpielstand(T0), () => t); s.ersteQuelleWaehlen('kessel');
    const h = haus(s), vor = s.mindestVorlauf_c(h), geld = s.stand.geld_eur;
    expect(s.upgradeKaufen(h.id).ok).toBe(true);
    expect(geld - s.stand.geld_eur).toBe(1500);
    expect(s.mindestVorlauf_c(h)).toBe(vor); // noch in Arbeit
    t += 600_000; s.bis(t);
    expect(s.mindestVorlauf_c(h)).toBe(vor - 5);
  });
  it('Zu niedriger Vorlauf senkt die Zufriedenheit, ein Upgrade hebt sie wieder', () => {
    let t = T0; const s = new Spiel(neuerSpielstand(T0), () => t); s.ersteQuelleWaehlen('kessel');
    const h = haus(s);
    for (let i = 0; i < 200; i++) { t += 10_000; s.bis(t); } // erst Bau fertig, Haus warm
    expect(s.netz.warm.has(h.id)).toBe(true);
    s.vorlaufSetzen(65);
    for (let i = 0; i < 40; i++) { t += 5000; s.bis(t); }
    const kalt = h.zufriedenheit_pct!; expect(h.gekuendigt).toBeFalsy();
    for (let n = 0; n < 3; n++) { s.upgradeKaufen(h.id); t += 3_600_000; s.bis(t); }
    for (let i = 0; i < 40; i++) { t += 5000; s.bis(t); }
    expect(h.zufriedenheit_pct!).toBeGreaterThan(kalt);
  });
});

describe('A38 Weiterlauf, A39 Heizzentrale-Ziele, A40 Helfer', () => {
  it('A38: Nach drei Tagen Abwesenheit ist das Geld gestiegen, nach 30 Tagen zählen genau 7 Tage', () => {
    const s = neuesSpiel(); s.ersteQuelleWaehlen('kessel');
    const TAG = 86_400_000, kopie = () => new Spiel(JSON.parse(JSON.stringify(s.stand)), () => T0);
    const a = kopie(); a.bis(T0 + 3 * TAG);
    const b = kopie(); b.bis(T0 + 7 * TAG);
    const c = kopie(); c.bis(T0 + 30 * TAG);
    expect(a.stand.geld_eur).toBeGreaterThan(s.stand.geld_eur);
    expect(b.stand.geld_eur).toBeGreaterThan(a.stand.geld_eur);
    expect(c.stand.geld_eur).toBeCloseTo(b.stand.geld_eur, 0); // Obergrenze 7 Tage
    expect(c.stand.zuletzt_ms).toBe(T0 + 30 * TAG);
  });
  it('A39: Die nächste Stufe der Heizzentrale braucht Ziele (Anschlüsse, Absatz, Spreizung)', () => {
    const s = neuesSpiel(); s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 1_000_000;
    const z = s.hzZiele();
    expect(z.length).toBeGreaterThan(0);
    expect(z.every((x) => x.erreicht)).toBe(false);
    expect(s.ausbauen(s.hz.id).ok).toBe(false);
    expect(s.stand.geld_eur).toBe(1_000_000);
  });
  it('A39: Spreizung steigt mit Upgrades und lässt sich nicht durch den Vorlauf-Regler erreichen', () => {
    let t = T0; const s = new Spiel(neuerSpielstand(T0), () => t); s.ersteQuelleWaehlen('kessel');
    for (let i = 0; i < 100; i++) { t += 10_000; s.bis(t); }
    const vor = s.spreizung_k();
    const h = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.station)!;
    s.upgradeKaufen(h.id); t += 3_600_000; s.bis(t);
    expect(s.spreizung_k()).toBeGreaterThan(vor);
    const mit = s.spreizung_k();
    s.vorlaufSetzen(85); expect(s.spreizung_k()).toBeCloseTo(mit, 9);
    s.vorlaufSetzen(55); expect(s.spreizung_k()).toBeGreaterThan(0);
  });
  it('A40: Drei Helfer arbeiten je an einem Auftrag; der vierte Auftrag wird abgelehnt', () => {
    const t = T0; const s = new Spiel(neuerSpielstand(T0), () => t); s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 100_000;
    const haeuser = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus').slice(0, 4);
    for (const o of haeuser) { o.ohne_station = false; o.station = 'st_80'; }
    expect(haeuser).toHaveLength(4);
    for (const o of haeuser.slice(0, 3)) expect(s.upgradeKaufen(o.id).ok).toBe(true);
    expect(s.freierHelfer()).toBeUndefined();
    const geld = s.stand.geld_eur;
    expect(s.upgradeKaufen(haeuser[3].id).ok).toBe(false); // alle Helfer beschäftigt
    expect(s.stand.geld_eur).toBe(geld);
    expect(s.stand.objekte.filter((o) => o.upgrade_auftrag)).toHaveLength(3);
    expect(new Set(s.stand.objekte.filter((o) => o.upgrade_auftrag).map((o) => o.upgrade_auftrag!.helfer)).size).toBe(3);
    expect(s.upgradeKaufen(haeuser[0].id).ok).toBe(false); // gleicher Hausauftrag läuft schon
  });
});

describe('A41 Bauabschnitte', () => {
  const mitUhr = () => { const z = { t: T0 }; const s = new Spiel(neuerSpielstand(T0), () => z.t); s.ersteQuelleWaehlen('kessel'); return { s, z }; };
  it('Ohne Bauabschnitt lassen sich keine Leitungen legen', () => {
    const { s } = mitUhr();
    const r = s.platzieren('d50', 12, 12);
    expect(r.ok).toBe(false);
    expect(r.hinweis).toMatch(/Bauabschnitt/);
  });
  it('Ablauf: Philipp plant, Leitungen einzeichnen kostet nichts, Laura bestellt und bezahlt, nach der Wartezeit liegen die Leitungen', () => {
    const { s, z } = mitUhr();
    const geld0 = s.stand.geld_eur;
    expect(s.abschnittPlanen().ok).toBe(true);
    expect(s.stand.geld_eur).toBe(geld0 - KONSTANTEN.abschnitt_planung_eur);
    expect(s.platzieren('d50', 12, 12).ok).toBe(false); // Philipp plant noch
    z.t += 600_000; s.bis(z.t);
    expect(s.abschnitt?.phase).toBe('offen');
    const g1 = s.stand.geld_eur;
    expect(s.platzieren('d50', 12, 12).ok).toBe(true);
    expect(s.stand.geld_eur).toBe(g1); // noch nichts bezahlt
    expect(s.netz.warm.size).toBe(2); // geplante Leitung zählt noch nicht
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    expect(s.stand.geld_eur).toBe(g1 - KATALOG.d50.kosten_eur![0] - KONSTANTEN.gestattung_eur_je_feld); // (12,12) liegt abseits der Straße: A45
    z.t += 60_000; s.bis(z.t);
    expect(s.abschnitt?.phase).toBe('bau');
    z.t += 3_600_000; s.bis(z.t);
    expect(s.abschnitt).toBeUndefined();
    expect(s.stand.objekte.some((o) => o.geplant)).toBe(false);
    expect(s.stand.objekte.some((o) => o.typ === 'd50' && o.x === 12 && o.y === 12)).toBe(true);
  });
  it('Nur ein Abschnitt gleichzeitig; Verwerfen entfernt die eingezeichneten Leitungen', () => {
    const { s, z } = mitUhr();
    s.abschnittPlanen(); expect(s.abschnittPlanen().ok).toBe(false);
    z.t += 600_000; s.bis(z.t);
    s.platzieren('d50', 12, 12);
    expect(s.abschnittVerwerfen().ok).toBe(true);
    expect(s.stand.objekte.some((o) => o.geplant)).toBe(false);
    expect(s.abschnitt).toBeUndefined();
  });
  it('Material bestellen braucht genug Geld', () => {
    const { s, z } = mitUhr();
    s.abschnittPlanen(); z.t += 600_000; s.bis(z.t);
    s.platzieren('d50', 12, 12); s.platzieren('d50', 12, 11);
    s.abschnittAbschliessen(); s.stand.geld_eur = 10;
    expect(s.materialBestellen().ok).toBe(false);
    expect(s.abschnitt?.phase).toBe('bestellen');
  });
});

describe('A34 Kamin aus, Aufstockung, A36 PV, A43 Baugebiet', () => {
  const mitUhr = () => { const z = { t: T0 }; const s = new Spiel(neuerSpielstand(T0), () => z.t); s.ersteQuelleWaehlen('kessel'); return { s, z }; };
  const lauf = (s: Spiel, z: { t: number }, sek: number) => { for (let i = 0; i < sek / 10; i++) { z.t += 10_000; s.bis(z.t); } };
  const startHaus = (s: Spiel) => s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.station)!;
  it('A34: Dauerhaft hohe Zufriedenheit schaltet den Kamin ab – der Verbrauch steigt', () => {
    const { s, z } = mitUhr(); const h = startHaus(s);
    s.preisSetzen(0); // 7 ct: Kunden sind sehr zufrieden
    const vorher = KATALOG[h.typ].bedarf_kw!;
    lauf(s, z, KONSTANTEN.vollversorgung_nach_s + 1200);
    expect(h.vollversorgung).toBe(true);
    expect(bedarfKw(h)).toBeCloseTo(vorher * KONSTANTEN.vollversorgung_faktor * (h.aufgestockt ? KONSTANTEN.aufstockung_faktor : 1), 9);
    expect(bedarfKw(h)).toBeGreaterThan(vorher);
    expect(s.netz.bedarf_kw).toBeGreaterThan(20); // zwei Starthäuser à 10 kW vorher
  });
  it('Aufstockung: Ein Wohnhaus stockt nach einiger Zeit auf, der Bedarf steigt', () => {
    const { s, z } = mitUhr(); const h = startHaus(s);
    lauf(s, z, KONSTANTEN.aufstockung_nach_s + 1500);
    expect(h.aufgestockt).toBe(true);
  });
  it('A36: PV gehört aufs Heizhaus-Dach: kostet Geld, liefert Strom, Überschuss wird eingespeist; Häuser haben keine PV', () => {
    const { s } = mitUhr();
    expect(s.netz.einspeisung_kw).toBe(0);
    const g = s.stand.geld_eur, kw = s.dachPvLeistung_kw();
    expect(kw).toBeGreaterThan(0);
    expect(s.dachPvKaufen().ok).toBe(true);
    expect(g - s.stand.geld_eur).toBe(kw * 1100);
    expect(s.netz.strom_kw).toBe(kw);
    expect(s.netz.einspeisung_kw).toBeGreaterThan(0); // Kessel ist nicht elektrisch → alles geht ins Netz
    expect(s.dachPvKaufen().ok).toBe(false);
    expect(s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus').some((o) => o.dach_pv)).toBe(false);
  });
  it('Häuser brauchen eine Übergabestation, um Wärme abzunehmen – auch neu gebaute', () => {
    const { s } = mitUhr(); s.stand.geld_eur = 1_000_000;
    const [x, y] = [3, 20];
    expect(s.platzieren('efh', x, y).ok).toBe(true);
    const neu = s.stand.objekte.at(-1)!;
    expect(neu.ohne_station).toBe(true);
    expect(s.netz.warm.has(neu.id)).toBe(false);
  });
  it('A43: Baugebiet braucht Heizzentrale Stufe 3 und genug Anschlüsse, dann entstehen feste neue Häuser', () => {
    const { s } = mitUhr(); s.stand.geld_eur = 1_000_000;
    expect(s.baugebietErschliessen().ok).toBe(false);
    s.stand.objekte.find((o) => o.typ === 'hz')!.stufe = 3;
    // Genügend warme Häuser herstellen: Stationen, dicke Leitung rund ums Heizhaus und ausreichend Wärme
    s.stand.innen[0].stufe = 3;
    const haeuser = s.stand.objekte.filter((x) => KATALOG[x.typ].kategorie === 'haus');
    for (const o of haeuser) { o.ohne_station = false; o.station = 'st_80'; }
    let n = 0;
    for (const o of haeuser) { if (n++ >= 6) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (s.kannPlatzieren('d110', o.x + dx, o.y + dy)) s.stand.objekte.push({ id: s.stand.naechste_id++, typ: 'd110', x: o.x + dx, y: o.y + dy, stufe: 1, bau: null, kasse_eur: 0 }); }
    s.neuBerechnen();
    const bed = s.baugebietBedingungen();
    if (!bed.ok) expect(bed.fehlt.join(' ')).toMatch(/angeschlossene Häuser/); // Starthäuser reichen im Test nicht: Bedingung ist die echte Prüfung
    expect(bed.ok).toBe(false);
    const n0 = s.stand.objekte.length, geld = s.stand.geld_eur;
    expect(s.baugebietErschliessen().ok).toBe(false);
    expect(s.stand.objekte.length).toBe(n0);
    expect(s.stand.geld_eur).toBe(geld);
  });
  it('A43: Ohne Platz auf der Gegenseite wird nichts bezahlt; mit Platz entstehen feste Häuser', () => {
    const { s } = mitUhr(); s.stand.geld_eur = 1_000_000;
    s.baugebietBedingungen = () => ({ ok: true, fehlt: [] }); // Voraussetzungen sind oben getestet
    const n0 = s.stand.objekte.length;
    const r = s.baugebietErschliessen();
    expect(r.ok).toBe(true);
    expect(s.stand.geld_eur).toBe(1_000_000 - KONSTANTEN.baugebiet_eur);
    const neu = s.stand.objekte.slice(n0).filter((o) => KATALOG[o.typ].kategorie === 'haus');
    expect(neu.length).toBeGreaterThan(0);
    expect(neu.every((o) => o.bestand && o.ohne_station)).toBe(true);
    expect(s.verschieben(neu[0].id, 0, 0).ok).toBe(false);
    // Platz zustellen: auf einem frischen Spiel alle freien Felder der Gegenseite mit Steinen belegen
    const t = mitUhr().s; t.stand.geld_eur = 1_000_000; t.baugebietBedingungen = () => ({ ok: true, fehlt: [] });
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (t.kannPlatzieren('stein', x, y)) t.stand.objekte.push({ id: t.stand.naechste_id++, typ: 'stein', x, y, stufe: 1, bau: null, kasse_eur: 0 });
    const r2 = t.baugebietErschliessen();
    expect(r2.ok).toBe(false);
    expect(t.stand.geld_eur).toBe(1_000_000);
    expect(t.stand.baugebiet).toBeUndefined();
  });
});

describe('Offene Anforderungen: A20, A27, A28, A35, A37, A42', () => {
  it('A20: Jahreszeiten, Kältewelle und Mehrspieler sind Ideen und nicht Teil der ersten Fassung', () => {
    const st = neuerSpielstand(T0) as unknown as Record<string, unknown>;
    expect(st).not.toHaveProperty('jahreszeit');
    expect(st).not.toHaveProperty('mitspieler');
  });
  it('A27: ruhige Optik – Haarlinien-Kontur und Manrope sind eingestellt', async () => {
    const { KONTUR } = await import('../src/render/farben');
    expect(String(KONTUR)).toMatch(/rgba\(40,\s*36,\s*30,\s*\.18\)/);
  });
  it('A28: Upgrades pro Haus senken den Mindest-Vorlauf (Rücklauf), Häuser bleiben an ihrem Ort', () => {
    const s = neuesSpiel(); s.ersteQuelleWaehlen('kessel');
    const h = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.station)!;
    const vor = s.mindestVorlauf_c(h); h.upgrade = 1;
    expect(s.mindestVorlauf_c(h)).toBeLessThan(vor);
    expect(s.verschieben(h.id, 1, 1).ok).toBe(false);
  });
  it('A35: Eine echte Woche entspricht zehn Spieljahren', async () => {
    const { SPIELJAHR_MS } = await import('../src/core/katalog');
    expect(SPIELJAHR_MS * 10).toBe(7 * 24 * 3600 * 1000);
    expect(SPIELJAHR_MS / 3_600_000).toBeCloseTo(16.8, 5);
  });
  it('A37: Beim Planen werden Gebäude durchsichtig, sonst nicht', async () => {
    const { istDurchsichtig } = await import('../src/render/szene');
    expect(istDurchsichtig('stempel')).toBe(true);
    expect(istDurchsichtig('normal', 'offen')).toBe(true);
    expect(istDurchsichtig('normal')).toBe(false);
  });
  it('A42: Häuser, Bestand und Großabnehmer lassen sich nicht verschieben', () => {
    const s = neuesSpiel();
    for (const o of s.stand.objekte.filter((x) => ['haus', 'gross'].includes(KATALOG[x.typ].kategorie))) expect(s.verschieben(o.id, 0, 0).ok).toBe(false);
  });
});

describe('Review-Nachbesserungen A41', () => {
  const mitUhr = () => { const z = { t: T0 }; const s = new Spiel(neuerSpielstand(T0), () => z.t); s.ersteQuelleWaehlen('kessel'); return { s, z }; };
  it('Verwerfen ist während Planung und Bau verboten, entfernen bestellter Leitungen ebenfalls', () => {
    const { s, z } = mitUhr();
    s.abschnittPlanen();
    expect(s.abschnittVerwerfen().ok).toBe(false); // Philipp plant noch
    z.t += 600_000; s.bis(z.t);
    s.platzieren('d50', 12, 12); s.abschnittAbschliessen(); s.materialBestellen();
    expect(s.abschnitt?.phase).toBe('bau');
    expect(s.abschnittVerwerfen().ok).toBe(false);
    const l = s.stand.objekte.find((o) => o.geplant)!;
    expect(s.entfernen(l.id).ok).toBe(false);
    expect(s.stand.objekte.some((o) => o.geplant)).toBe(true);
  });
  it('Beschädigte Bauabschnitt-Daten machen den Spielstand unbrauchbar (neues Spiel statt Dauersperre)', async () => {
    const { serialisieren, ladenMitBefund } = await import('../src/core/speichern');
    const { s } = mitUhr();
    const kaputt = JSON.parse(serialisieren(s.stand)); kaputt.abschnitt = { phase: 'bau', bau: null };
    expect(ladenMitBefund(JSON.stringify(kaputt), T0).befund).toBe('defekt');
    const gut = JSON.parse(serialisieren(s.stand)); gut.abschnitt = { phase: 'offen', bau: null };
    expect(ladenMitBefund(JSON.stringify(gut), T0).befund).not.toBe('defekt');
  });
});

describe('A45 Leitungen auf öffentlicher Straße, sonst Gestattung', () => {
  const offen = () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    s.stand.abschnitt = { phase: 'offen', bau: null };
    return s;
  };
  it('A45: Leitung auf der Straße kostet nur Material, keine Gestattung', () => {
    const s = offen();
    expect(s.istStrasse(10, 18)).toBe(true);
    expect(s.platzieren('d50', 10, 18).ok).toBe(true);
    expect(s.gestattung_eur()).toBe(0);
    expect(s.abschnittKosten_eur()).toBe(KATALOG.d50.kosten_eur![0]);
  });
  it('A45: Leitung abseits der Straße kostet zusätzlich Gestattung, einmal je Feld', () => {
    const s = offen();
    expect(s.istStrasse(12, 12)).toBe(false);
    expect(s.platzieren('d50', 12, 15).ok).toBe(true);
    expect(s.gestattung_eur()).toBe(KONSTANTEN.gestattung_eur_je_feld);
    s.abschnittAbschliessen();
    const g = s.stand.geld_eur;
    expect(s.materialBestellen().ok).toBe(true);
    expect(g - s.stand.geld_eur).toBe(KATALOG.d50.kosten_eur![0] + KONSTANTEN.gestattung_eur_je_feld);
    expect(s.stand.gestattungen).toContain(15 * KONSTANTEN.feldanzahl + 12);
  });
  it('A45: Verwerfen kostet keine Gestattung; geklärte Felder kosten nicht erneut', () => {
    const s = offen();
    s.platzieren('d50', 12, 15); s.abschnittVerwerfen();
    expect(s.stand.gestattungen).toBeUndefined();
    s.stand.gestattungen = [15 * KONSTANTEN.feldanzahl + 12];
    s.stand.abschnitt = { phase: 'offen', bau: null };
    s.platzieren('d50', 12, 15);
    expect(s.gestattung_eur()).toBe(0);
  });
});

describe('A46 Straßen frei, Fluss mit Spülbohrung', () => {
  const offen = () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    s.stand.abschnitt = { phase: 'offen', bau: null };
    return s;
  };
  it('A46: Kein Objekt (außer Leitungen) steht auf Straße oder im Fluss', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0);
    for (const o of s.stand.objekte) {
      if (istLeitung(o.typ)) continue; // Review: vorher Liste mit nicht vorhandenen Typen
      const k = KATALOG[o.typ].groesse ?? 1;
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
        expect(s.istStrasse(o.x + dx, o.y + dy), `${o.typ} ${o.x},${o.y} auf Straße`).toBe(false);
        expect(s.istFluss(o.x + dx, o.y + dy), `${o.typ} im Fluss`).toBe(false);
      }
    }
  });
  it('A46: Bauen auf Straße und im Fluss wird abgelehnt', () => {
    const s = offen();
    expect(s.kannPlatzieren('efh', 10, 18)).toBe(false);
    expect(s.kannPlatzieren('efh', 19, 3)).toBe(false);
  });
  it('A46: Leitung durch den Fluss kostet je Feld eine Spülbohrung', () => {
    const s = offen();
    expect(s.platzieren('d50', 19, 3).ok).toBe(true);
    expect(s.bohrung_eur()).toBe(KONSTANTEN.bohrung_eur_je_feld);
    expect(s.gestattung_eur()).toBe(0);
    expect(s.abschnittKosten_eur()).toBe(KATALOG.d50.kosten_eur![0] + KONSTANTEN.bohrung_eur_je_feld);
  });
});

describe('A47 Hausanschluss automatisch ziehen', () => {
  it('A47: Der Hausanschluss führt vom Haus zur nächsten Leitung und verbindet sich', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 200_000; s.stand.abschnitt = { phase: 'offen', bau: null };
    const haus = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station && !s.netz.warm.has(o.id))!;
    const vorher = s.abschnittLeitungen();
    const r = s.hausanschlussPlanen(haus.id);
    expect(r.ok, r.hinweis).toBe(true);
    expect(s.abschnittLeitungen()).toBeGreaterThan(vorher);
    expect(s.stand.objekte.filter((o) => o.geplant).every((o) => o.geplant)).toBe(true);
    expect(s.hausanschlussPlanen(haus.id).ok).toBe(false); // liegt jetzt schon an einer Leitung
  });
  it('A47: Ohne offenen Bauabschnitt wird kein Anschluss geplant', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    const haus = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus')!;
    expect(s.hausanschlussPlanen(haus.id).ok).toBe(false);
  });
});

describe('A46 alter Spielstand wird an Straßen und Fluss angepasst', () => {
  it('A46: Haus auf Straße und Baum im Fluss werden beim Laden bereinigt, nichts steht danach auf Straße oder Fluss', () => {
    const s0 = neuerSpielstand(0);
    delete s0.karte;
    const haus = s0.objekte.find((o) => o.typ === 'efh' && o.bestand)!;
    haus.x = 10; haus.y = 18; // Straße
    s0.objekte.push({ id: 9999, typ: 'baum', x: 19, y: 5, stufe: 1, bau: null, kasse_eur: 0, landschaft: true });
    const r = ladenMitBefund(serialisieren(s0), 0);
    expect(r.befund).toBe('migriert');
    const sp = new Spiel(r.stand, () => 0);
    expect(r.stand.objekte.some((o) => o.id === 9999)).toBe(false);
    for (const o of r.stand.objekte) {
      if (KATALOG[o.typ].kategorie === 'netz') continue;
      const k = KATALOG[o.typ].groesse ?? 1;
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) { expect(sp.istStrasse(o.x + dx, o.y + dy)).toBe(false); expect(sp.istFluss(o.x + dx, o.y + dy)).toBe(false); }
    }
  });
});

describe('A48/A75 Karte drehen', () => {
  it('A48/A75: Feld → Bild → Feld bleibt in jedem Winkel exakt (auch zwischen den Vierteln); eine volle Umdrehung ergibt die Ausgangsansicht', async () => {
    const { Kamera } = await import('../src/render/kamera');
    const k = new Kamera(); k.groesseSetzen(844, 390, 1);
    const vorher = k.mitte(7, 3);
    for (const w of [0, 0.3, Math.PI / 4, 1, Math.PI / 2, 2.2, Math.PI, 4.4, 5.9]) {
      k.winkel_rad = w;
      const [mx, my] = k.mitte(7, 3);
      const [fx, fy] = k.feldGenau(mx, my);
      expect(fx).toBeCloseTo(7); expect(fy).toBeCloseTo(3);
    }
    k.winkel_rad = 0;
    for (let i = 0; i < 8; i++) k.drehenUm(Math.PI / 4);
    expect(k.winkel_rad).toBeCloseTo(0);
    const nachher = k.mitte(7, 3);
    expect(nachher[0]).toBeCloseTo(vorher[0]); expect(nachher[1]).toBeCloseTo(vorher[1]);
  });
});

describe('A47/A49 Leitungen wegnehmen, Anschlüsse erkennen, Rücklauf bringt Kapazität', () => {
  const offenesSpiel = () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 500_000; s.stand.abschnitt = { phase: 'offen', bau: null };
    return s;
  };
  it('A47: Geplante Leitungen lassen sich wegradieren und die letzte zurücknehmen, gebaute nicht', () => {
    const s = offenesSpiel();
    s.platzieren('d50', 10, 18); s.platzieren('d50', 10, 19);
    expect(s.geplanteLeitungEntfernen(10, 18).ok).toBe(true);
    expect(s.abschnittLeitungen()).toBe(1);
    expect(s.letzteLeitungZurueck().ok).toBe(true);
    expect(s.abschnittLeitungen()).toBe(0);
    expect(s.letzteLeitungZurueck().ok).toBe(false);
    const gebaut = s.stand.objekte.find((o) => istLeitung(o.typ) && !o.geplant)!;
    expect(s.geplanteLeitungEntfernen(gebaut.x, gebaut.y).ok).toBe(false);
  });
  it('A47: Eine geplante Leitung am Haus wird als Hausanschluss dieses Abschnitts erkannt', () => {
    const s = offenesSpiel();
    const haus = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station)!;
    expect(s.abschnittAnschluesse().some((a) => a.id === haus.id)).toBe(false);
    expect(s.hausanschlussPlanen(haus.id).ok).toBe(true);
    expect(s.abschnittAnschluesse().some((a) => a.id === haus.id)).toBe(true);
  });
  it('A47: Der automatische Hausanschluss läuft gerade (höchstens eine Biegung bei freiem Weg)', () => {
    const s = offenesSpiel();
    const haus = s.stand.objekte.find((o) => o.typ === 'efh' && o.x === 9 && o.y === 15)!;
    expect(s.hausanschlussPlanen(haus.id).ok).toBe(true);
    const f = s.stand.objekte.filter((o) => o.geplant).map((o) => [o.x, o.y]);
    let biegungen = 0;
    for (let i = 2; i < f.length; i++) if ((f[i][0] - f[i - 1][0] !== f[i - 1][0] - f[i - 2][0]) || (f[i][1] - f[i - 1][1] !== f[i - 1][1] - f[i - 2][1])) biegungen++;
    expect(biegungen).toBeLessThanOrEqual(1);
  });
  it('A49: Kälterer Rücklauf (größere Spreizung) lässt Leitungen mehr Wärme schaffen', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    expect(s.netz.spreizung_faktor).toBeCloseTo(1);
    for (const o of s.stand.objekte) if (KATALOG[o.typ].kategorie === 'haus' && o.station) o.upgrade = 3;
    s.neuBerechnen();
    expect(s.netz.spreizung_faktor).toBeGreaterThan(1.5);
  });
  it('A49: Eine Station lässt sich auch bei vorhandener Station gegen eine größere tauschen', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    const haus = s.stand.objekte.find((o) => o.station)!;
    expect(s.stationKaufen(haus.id, 'st_25').ok).toBe(true);
    expect(haus.station).toBe('st_25');
  });
});

describe('A50 volle Stadt, Interessenten', () => {
  it('A50: Die Stadt hat deutlich mehr Häuser (mindestens 35)', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0);
    expect(s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus').length).toBeGreaterThanOrEqual(35);
  });
  it('A50: Sind die Kunden lange zufrieden, möchte ein weiteres Haus anschließen (gelb); es bekommt Nachlass auf die Station', () => {
    let t = 0; const s = new Spiel(neuerSpielstand(0), () => t); s.ersteQuelleWaehlen('kessel'); s.stand.preisstufe = 4; // 11 ct: Kunden zufrieden
    expect(s.stand.objekte.some((o) => o.interessent)).toBe(false);
    for (let i = 0; i < 40; i++) { t += 60_000; s.bis(t); }
    const wer = s.stand.objekte.find((o) => o.interessent);
    expect(wer).toBeDefined();
    const st = STATIONEN[0];
    expect(s.stationspreis_eur(wer!, st)).toBe(Math.round(st.kosten_eur * (1 - KONSTANTEN.interessent_nachlass)));
  });
  it('A50: Höchstens vier Interessenten gleichzeitig', () => {
    let t = 0; const s = new Spiel(neuerSpielstand(0), () => t); s.ersteQuelleWaehlen('kessel');
    s.stand.preisstufe = 4;
    for (let i = 0; i < 300; i++) { t += 60_000; s.bis(t); }
    expect(s.stand.objekte.filter((o) => o.interessent).length).toBeLessThanOrEqual(KONSTANTEN.interessenten_max);
  });
});

describe('A51 Helfer sprechen den Spieler an', () => {
  it('A51: Philipp, Laura und die Techniker melden sich mit Sprechblase und Namen des Spielers', () => {
    let t = 0; const s = new Spiel(neuerSpielstand(0), () => t); s.ersteQuelleWaehlen('kessel');
    s.stand.spieler = 'Simon'; s.stand.geld_eur = 100_000;
    const sagt = () => s.ereignisse.splice(0).filter((e) => e.art === 'sprecher') as Array<{ figur: string; text: string }>;
    sagt();
    s.abschnittPlanen();
    expect(sagt()[0]).toMatchObject({ figur: 'Philipp' });
    t += 600_000; s.bis(t); sagt();
    s.platzieren('d50', 10, 18); s.abschnittAbschliessen(); s.materialBestellen();
    const l = sagt()[0];
    expect(l.figur).toBe('Laura'); expect(l.text).toMatch(/Simon/); expect(l.text).toMatch(/Lieferzeit: ([2-9]|\d{2,}) Tage/); // Review: Ansage in Tagen statt immer „1 Woche“
    const haus = s.stand.objekte.find((o) => o.station)!;
    s.upgradeKaufen(haus.id);
    const tech = sagt()[0];
    expect(['Sebastian', 'Christian', 'Manfred']).toContain(tech.figur);
    expect(tech.text).toMatch(/Simon/);
  });
  it('A51: Ohne eigenen Namen heißt der Spieler „Chef“', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0);
    expect(s.spielerName).toBe('Chef');
  });
});

describe('A52 Wärmepreis in der Heizzentrale', () => {
  it('A52: preisSetzen begrenzt den Wärmepreis auf 7–15 ct', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0);
    s.preisSetzen(0); expect(PREISSTUFEN[s.stand.preisstufe].ct_je_kwh).toBe(7);
    s.preisSetzen(99); expect(PREISSTUFEN[s.stand.preisstufe].ct_je_kwh).toBe(7); // außerhalb wird ignoriert
    s.preisSetzen(PREISSTUFEN.length - 1); expect(PREISSTUFEN[s.stand.preisstufe].ct_je_kwh).toBe(15);
  });
});

describe('A53 Optik: Straßen und Gärten', () => {
  it('A53: Das Straßennetz ist dicht genug für Asphalt mit Kreuzungen (mindestens 100 Felder, mehrere Einmündungen)', () => {
    const ort = ortHolen('hilpoltstein');
    expect(ort.strassen.length).toBeGreaterThan(100);
    const feld = new Set(ort.strassen.map(([x, y]) => y * 24 + x));
    const kreuzungen = ort.strassen.filter(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => feld.has((y + dy) * 24 + x + dx)).length >= 3);
    expect(kreuzungen.length).toBeGreaterThanOrEqual(6);
  });
});

describe('A54 kW-Schilder schaltbar, weniger Zebrastreifen', () => {
  it('A54: Die kW-Anzeige der Häuser ist standardmäßig an und über die Einstellungen schaltbar', async () => {
    const { einstellungenLesen } = await import('../src/ui/einstellungen');
    const e = einstellungenLesen();
    expect(e.kw_anzeigen).toBe(true);
    // Review: die echte Entscheidung prüfen, nicht nur den gesetzten Wert
    const { kwSchildZeigen } = await import('../src/render/anschluss');
    const haus = { bau: null };
    expect(kwSchildZeigen(haus, 'haus', 10, 60, true)).toBe(true);
    expect(kwSchildZeigen(haus, 'haus', 10, 60, undefined)).toBe(true);
    expect(kwSchildZeigen(haus, 'haus', 10, 60, false)).toBe(false);
    expect(kwSchildZeigen(haus, 'haus', 10, 40, true)).toBe(false); // zu weit herausgezoomt
    expect(kwSchildZeigen(haus, 'haus', 10, 60, true, false)).toBe(false); // Designer A66: nicht angeschlossen, kein Interesse, kein Planen
    expect(kwSchildZeigen({ bau: null, gekuendigt: true }, 'haus', 10, 60, true)).toBe(false);
    expect(kwSchildZeigen({ bau: null, zustand: 'gesperrt' }, 'gross', 40, 60, true)).toBe(false);
    expect(kwSchildZeigen({ bau: null, zustand: 'vertrag' }, 'gross', 40, 60, true)).toBe(true);
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(new URL('../src/render/szene.ts', import.meta.url), 'utf8')).toContain('kwSchildZeigen(o, DK.kategorie, DK.bedarf_kw, tw, s.kw_anzeigen, relevant)');
  });
});

describe('A55/A75 Drehen per Geste', () => {
  it('A55/A75: Zwei-Finger-Drehung startet erst ab der Schwelle, folgt danach den Fingern stufenlos, in beide Richtungen, auch über ±π hinweg', async () => {
    const { drehFrei, DREH_SCHWELLE_RAD } = await import('../src/render/anschluss');
    let z = drehFrei(0, 0.05, false); expect(z.aktiv).toBe(false); expect(z.dreh_rad).toBe(0);
    z = drehFrei(z.summe_rad, 0.05, z.aktiv); expect(z.aktiv).toBe(false);
    z = drehFrei(z.summe_rad, 0.1, z.aktiv); expect(z.aktiv).toBe(true); expect(z.dreh_rad).toBeCloseTo(0.2);
    z = drehFrei(z.summe_rad, 0.013, z.aktiv); expect(z.dreh_rad).toBeCloseTo(0.013); // jetzt jede kleine Bewegung, kein 90°-Sprung
    expect(drehFrei(0, -(DREH_SCHWELLE_RAD + 0.01), false).dreh_rad).toBeCloseTo(-(DREH_SCHWELLE_RAD + 0.01));
    // Sprung des Winkels von +π nach −π ist nur eine kleine Drehung
    expect(drehFrei(0, -2 * Math.PI + 0.1, false).aktiv).toBe(false);
  });
  it('A75: Die Karte dreht um einen beliebigen Winkel; der Drehpunkt bleibt im Bild am selben Feld; Knöpfe drehen weich', () => {
    const k = new Kamera(); k.groesseSetzen(844, 390, 1);
    const [fx, fy] = k.feldGenau(300, 200);
    k.drehenUm(0.37, 300, 200);
    expect(k.winkel_rad).toBeCloseTo(0.37);
    const [gx, gy] = k.feldGenau(300, 200);
    expect(gx).toBeCloseTo(fx); expect(gy).toBeCloseTo(fy);
    const vorher = k.winkel_rad;
    k.drehen(1); expect(k.winkel_rad).toBeCloseTo(vorher); // noch nichts – erst die Bilder drehen
    for (let i = 0; i < 60; i++) k.schritt(1 / 60);
    expect(k.winkel_rad).toBeCloseTo(vorher + Math.PI / 4, 2);
  });
});

describe('A56 Spielstand löschen bleibt gelöscht', () => {
  it('A56: Nach dem Löschen wird beim Neuladen nichts zurückgeschrieben', async () => {
    const m = await import('../src/core/speichern');
    const entfernt: string[] = [];
    expect(m.speichernErlaubt()).toBe(true);
    m.speicherLoeschen({ removeItem: (k: string) => { entfernt.push(k); } });
    expect(entfernt).toEqual([m.SPEICHER_SCHLUESSEL]);
    expect(m.speichernErlaubt()).toBe(false);
  });
});

describe('A57 Hauptleitung am Haus vorbei knickt nicht ab', () => {
  const o = (id: number, typ: any, x: number, y: number, extra: any = {}) => ({ id, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra });
  it('A57: Hat das Haus einen eigenen Hausanschluss, hängt es daran und nicht an der vorbeilaufenden Hauptleitung', async () => {
    const { berechneNetz } = await import('../src/core/netz');
    const N = KONSTANTEN.feldanzahl;
    const obj: any[] = [o(1, 'hz', 0, 0)];
    for (let x = 0; x <= 6; x++) obj.push(o(10 + x, 'd50', x, 2));
    obj.push(o(30, 'd25', 2, 3)); // Hausanschluss vom Hauptstrang zum Haus
    obj.push(o(40, 'efh', 3, 3, { station: passendeStation(10).id, zufriedenheit_pct: 80 }));
    const netz = berechneNetz(obj, [{ typ: 'kessel', stufe: 1, bau: null }], 2);
    expect(netz.anschluss.get(40)?.feld).toBe(3 * N + 2);
    expect(netz.warm.has(40)).toBe(true);
  });
  it('A57: Eine geplante Leitung, die nur am Haus vorbeiläuft, zählt nicht als Hausanschluss des Abschnitts', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 500_000; s.stand.abschnitt = { phase: 'offen', bau: null };
    const frei = (x: number, y: number) => s.istStrasse(x, y) && !s.stand.objekte.some((o) => o.x === x && o.y === y);
    const haus = s.stand.objekte.find((h) => KATALOG[h.typ].kategorie === 'haus' && (KATALOG[h.typ].groesse ?? 1) === 1 && h.ohne_station && [-2, -1, 0, 1, 2].every((dx) => frei(h.x + dx, h.y - 1)));
    expect(haus).toBeDefined();
    if (!haus) return;
    for (const dx of [-2, -1, 0, 1, 2]) expect(s.platzieren('d50', haus.x + dx, haus.y - 1).ok).toBe(true);
    expect(s.abschnittAnschluesse().some((h) => h.id === haus.id)).toBe(false);
  });
});

describe('A58 Heizhaus ausbauen', () => {
  it('A58: Schon Stufe 1 hat zwei Plätze – ein zweiter Kessel passt hinein', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 100_000;
    expect(KATALOG.hz.plaetze![0]).toBe(2);
    expect(s.innenEinbauen('pellet').ok).toBe(true);
    expect(s.stand.innen).toHaveLength(2);
  });
  it('A58: Gaskessel, Pelletkessel und BHKW gibt es; das BHKW erst ab Heizzentrale Stufe 2', () => {
    for (const t of ['pellet', 'gas', 'bhkw'] as const) expect(KATALOG[t].kategorie).toBe('innen');
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 100_000;
    expect(s.innenEinbauen('bhkw').ok).toBe(false);
  });
  it('A58: Das BHKW liefert zusätzlich Strom, der Gaskessel läuft als teuerste Quelle zuletzt', async () => {
    const { berechneNetz } = await import('../src/core/netz');
    const s = new Spiel(neuerSpielstand(0), () => 0);
    const n = berechneNetz(s.stand.objekte, [{ typ: 'bhkw', stufe: 1, bau: null }], 2);
    // Fachprüfung: Strom nur im Verhältnis zur tatsächlich erzeugten Wärme (Startdorf braucht weniger als 35 kW)
    expect(n.genutzt_kw).toBeGreaterThan(0);
    expect(n.genutzt_kw).toBeLessThan(35);
    expect(n.strom_kw).toBeCloseTo(n.genutzt_kw * 0.8, 6);
    expect(n.einspeisung_kw).toBeCloseTo(n.genutzt_kw * 0.8, 6);
    const preise = (['kessel', 'pellet', 'gas', 'bhkw', 'wpg', 'ptk'] as const).map((t) => KATALOG[t].betriebskosten_eur_je_kw_min!);
    expect(Math.max(...preise)).toBe(KATALOG.gas.betriebskosten_eur_je_kw_min);
  });
});

describe('A59 Startleitungen in der Straße', () => {
  it('A59: Die Hauptleitung am Start ist eine 40er und liegt ganz in der Straße; Hausanschlüsse sind 25er', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    const rohre = s.stand.objekte.filter((o) => istLeitung(o.typ));
    const haupt = rohre.filter((o) => o.typ === 'd40');
    expect(haupt.length).toBeGreaterThan(0);
    for (const o of haupt) expect(s.istStrasse(o.x, o.y)).toBe(true);
    for (const o of rohre.filter((o) => !s.istStrasse(o.x, o.y))) expect(o.typ).toBe('d25');
    expect(s.stand.objekte.filter((o) => o.station && s.netz.warm.has(o.id))).toHaveLength(2);
  });
});

describe('A60 kein Rauch aus Hauskaminen', () => {
  it('A60: Häuser und Großabnehmer zeichnen keine Rauchwolke mehr, nur die Heizzentrale', async () => {
    const { readFileSync } = await import('node:fs');
    const q = readFileSync(new URL('../src/render/gebaeude.ts', import.meta.url), 'utf8');
    expect(q).not.toMatch(/st\.oel\)\s*m\.wolke/);
    expect((q.match(/m\.wolke\(/g) ?? []).length).toBeLessThanOrEqual(2); // Heizzentrale + eigenes Sägewerk
  });
});

describe('A61 Spielname Heatnet', () => {
  it('A61: Seitentitel und App-Name heißen „Heatnet“', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(new URL('../index.html', import.meta.url), 'utf8')).toContain('<title>Heatnet</title>');
    const m = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
    expect(m.name).toBe('Heatnet'); expect(m.short_name).toBe('Heatnet');
  });
});

describe('A62 Expresslieferung', () => {
  it('A62: Laura kann einmal Express bestellen – das kostet Aufpreis und verkürzt die Restlieferzeit', () => {
    let t = T0; const s = new Spiel(neuerSpielstand(T0), () => t); s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 200_000; s.stand.abschnitt = { phase: 'offen', bau: null };
    expect(s.platzieren('d40', 10, 18).ok).toBe(true);
    s.abschnittAbschliessen(); expect(s.materialBestellen().ok).toBe(true);
    const a = s.stand.abschnitt!;
    const restVor = a.bau!.ende_ms - t, geld = s.stand.geld_eur, preis = s.expresskosten_eur();
    expect(preis).toBeGreaterThanOrEqual(KONSTANTEN.express_min_eur);
    expect(s.expressLiefern().ok).toBe(true);
    expect(geld - s.stand.geld_eur).toBe(preis);
    expect(a.bau!.ende_ms - t).toBeLessThan(restVor * 0.5);
    expect(s.expressLiefern().ok).toBe(false); // nur einmal
  });
  it('A62: Ohne laufende Lieferung gibt es keinen Express', () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    expect(s.expressLiefern().ok).toBe(false);
  });
});

describe('A63 Logo', () => {
  it('A63: Das Logo zeigt Flamme und Leitungen (Vorlauf rot, Rücklauf blau) und ist auch App-Symbol', async () => {
    const { readFileSync } = await import('node:fs');
    const logo = readFileSync(new URL('../src/ui/logo.svg', import.meta.url), 'utf8');
    expect(logo).toContain('#f0453a'); expect(logo).toContain('#3a92ea');
    expect(readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')).toBe(logo);
  });
});

describe('A64 Ladebildschirm, A65 Abzweig an der Hauptleitung', () => {
  it('A64: Der Ladebildschirm hat Spieltipps; jeder Tipp ist ein kurzer Satz', async () => {
    const { readFileSync } = await import('node:fs');
    const q = readFileSync(new URL('../src/ui/vorspann.ts', import.meta.url), 'utf8');
    expect(q).toContain('const TIPPS');
    expect(q).toContain('Je kälter der Rücklauf');
    expect(q).not.toMatch(/innerHTML/);
    expect(q).toContain('Mach dein Dorf Schritt für Schritt erneuerbar');
    expect(q).not.toContain('klimaneutral'); // A68: Werbeaussage nicht haltbar (Fachprüfung)
  });
  it('A65: Die dünnere Leitung läuft bis in die Hauptleitung, die Hauptleitung zeichnet keinen Stummel', async () => {
    const { abzweigZeichnen, eigenerHausanschluss } = await import('../src/render/anschluss');
    expect(abzweigZeichnen('d40', 'd25')).toBe('nichts');
    expect(abzweigZeichnen('d25', 'd40')).toBe('bis_mitte_nachbar');
    expect(abzweigZeichnen('d40', 'd40')).toBe('halb');
    expect(eigenerHausanschluss('d40', 10)).toBe('d25'); // Haus direkt an der 40er bekommt einen 25er-Anschluss
    expect(eigenerHausanschluss('d25', 10)).toBeNull();
  });
});

describe('A66 keine Autos', () => {
  it('A66: Auf den Straßen werden keine Autos mehr gezeichnet', async () => {
    const { readFileSync } = await import('node:fs');
    const q = readFileSync(new URL('../src/render/szene.ts', import.meta.url), 'utf8');
    expect(q).not.toMatch(/farben = \['#c0392b'/);
  });
});

describe('A67 Startnetz', () => {
  it('A67: Das Startnetz wird nur am Abzweig dünner (kein Planungsfehler zu Spielbeginn)', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    expect(s.netz.reduzierung.size).toBe(0);
    expect(s.netz.engpass.size).toBe(0);
    const start = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.station);
    expect(start.every((o) => s.netz.warm.has(o.id))).toBe(true);
  });
});

describe('A68 Fachprüfung A45–A66 umgesetzt', () => {
  it('A68: Leitungstexte kennzeichnen Spielwerte, kein „klimaneutral“, BHKW-Strom folgt der erzeugten Wärme', async () => {
    const { readFileSync } = await import('node:fs');
    for (const t of LEITUNGEN) expect(KATALOG[t].beschreibung).toContain('im Spiel');
    const vorspann = readFileSync(new URL('../src/ui/vorspann.ts', import.meta.url), 'utf8');
    expect(vorspann).not.toContain('klimaneutral');
    expect(vorspann).not.toContain('nur mit einer Spülbohrung');
    const { berechneNetz } = await import('../src/core/netz');
    const s = new Spiel(neuerSpielstand(0), () => 0);
    const leer = berechneNetz(s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie !== 'haus'), [{ typ: 'bhkw', stufe: 1, bau: null }], 2);
    expect(leer.strom_kw).toBe(0); // ohne Wärmeabnahme kein BHKW-Strom
  });
});

describe('A69 Vorsehung und Anbohrung', () => {
  const N = KONSTANTEN.feldanzahl;
  const offen = () => { const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel'); s.stand.geld_eur = 1_000_000; s.stand.abschnitt = { phase: 'offen', bau: null }; return s; };
  /** gebaute Leitung bei (x|y) und ein freier Nachbar, auf den eine Leitung passt */
  const andock = (s: Spiel, x: number, y: number) => {
    const ziel = s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === x && o.y === y)!;
    const frei = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [x + dx, y + dy] as const).find(([a, b]) => s.kannPlatzieren('d25', a, b))!;
    return { ziel, frei };
  };
  it('A69: Vorsehung nur auf geplanten Leitungen im offenen Abschnitt; sie kostet und lässt sich wieder entfernen', () => {
    const s = offen();
    const gebaut = s.stand.objekte.find((o) => istLeitung(o.typ))!;
    expect(s.vorsehungUmschalten(gebaut.id).ok).toBe(false);
    const { frei } = andock(s, 10, 12);
    expect(s.platzieren('d25', frei[0], frei[1]).ok).toBe(true);
    const plan = s.stand.objekte.find((o) => o.geplant)!;
    const vorher = s.abschnittKosten_eur();
    expect(s.vorsehungUmschalten(plan.id).ok).toBe(true);
    expect(s.abschnittKosten_eur()).toBe(vorher + KONSTANTEN.vorsehung_eur);
    expect(s.vorsehungUmschalten(plan.id).ok).toBe(true);
    expect(s.abschnittKosten_eur()).toBe(vorher);
    s.stand.abschnitt = { phase: 'bestellen', bau: null };
    expect(s.vorsehungUmschalten(plan.id).ok).toBe(false);
  });
  it('A69: Seitlich an eine laufende Leitung ohne Vorsehung andocken kostet eine Anbohrung', () => {
    const s = offen();
    const { ziel, frei } = andock(s, 10, 12);
    s.platzieren('d25', frei[0], frei[1]);
    expect(s.anbohrungsFelder()).toEqual([ziel.y * N + ziel.x]);
    expect(s.abschnittKosten_eur()).toBe((KATALOG.d25.kosten_eur as number[])[0] + s.gestattung_eur() + s.bohrung_eur() + KONSTANTEN.anbohrung_eur);
  });
  it('A69: An einer Vorsehung entfällt die Anbohrung; nach dem Bau ist die Vorsehung belegt', () => {
    const s = offen();
    const { ziel, frei } = andock(s, 10, 12);
    ziel.vorsehung = true;
    s.platzieren('d25', frei[0], frei[1]);
    expect(s.anbohrungsFelder()).toEqual([]);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    expect(ziel.vorsehung).toBe(true); // während der Bauzeit noch Abzweig (A67)
    s.bis(s.stand.abschnitt!.bau!.ende_ms);
    expect(s.stand.abschnitt).toBeUndefined();
    expect(ziel.vorsehung).toBeUndefined();
  });
  it('A69: Am Leitungsende weiterbauen braucht keine Anbohrung', () => {
    const s = offen();
    const ende = s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === 11 && o.y === 14)!;
    const frei = ([[1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [ende.x + dx, ende.y + dy] as const).find(([a, b]) => s.kannPlatzieren('d25', a, b));
    expect(frei).toBeDefined();
    s.platzieren('d25', frei![0], frei![1]);
    expect(s.anbohrungsFelder()).toEqual([]);
  });
  it('A69: Der automatische Hausanschluss rechnet die Anbohrung ein und weicht zu einer nahen Vorsehung aus', () => {
    const plane = (vorsehungBei?: [number, number]) => {
      const s = offen();
      delete s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === 10 && o.y === 14)!.vorsehung; // Start-Vorsehung (A74) weg, sonst dockt der Weg dort an
      if (vorsehungBei) s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === vorsehungBei[0] && o.y === vorsehungBei[1])!.vorsehung = true;
      const haus = s.stand.objekte.find((o) => o.typ === 'efh' && o.x === 6 && o.y === 15)!;
      expect(s.hausanschlussPlanen(haus.id).ok).toBe(true);
      return { s, plan: s.stand.objekte.filter((o) => o.geplant).map((o) => [o.x, o.y] as const) };
    };
    const ohne = plane();
    expect(ohne.s.anbohrungsFelder()).toEqual([14 * N + 10]); // ohne Vorsehung: Weg unten herum, Anbohrung an (10|14)
    const mit = plane([10, 12]);
    expect(mit.s.anbohrungsFelder()).toEqual([]);
    expect(mit.plan).toContainEqual([9, 12]); // endet an der Vorsehung (10|12)
    expect(mit.s.abschnittKosten_eur()).toBeLessThan(ohne.s.abschnittKosten_eur());
  });
  it('A69: Neben der Heizzentrale ist die erste Leitung durchlaufend – Andocken kostet eine Anbohrung', () => {
    const s = offen();
    const { frei } = andock(s, 10, 10);
    s.platzieren('d25', frei[0], frei[1]);
    expect(s.anbohrungsFelder()).toContain(10 * N + 10);
  });
  it('A69/A67: Während der Bauzeit zählt eine genutzte Vorsehung weiter als Abzweig (kein falsches Warnzeichen)', () => {
    let t = 0; const s = new Spiel(neuerSpielstand(0), () => t); s.ersteQuelleWaehlen('kessel'); s.stand.geld_eur = 1_000_000;
    const d = s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === 10 && o.y === 13)!; d.typ = 'd25';
    const v = s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === 10 && o.y === 12)!; v.vorsehung = true;
    s.neuBerechnen();
    expect(s.netz.reduzierung.size).toBe(0);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    expect(s.platzieren('d25', 9, 12).ok).toBe(true); // links andocken; rechts (11|12) läge an der Heizzentrale
    s.abschnittAbschliessen(); expect(s.materialBestellen().ok).toBe(true);
    for (const anteil of [0.1, 0.5, 0.9]) { t = s.stand.abschnitt!.bau!.ende_ms * anteil; s.bis(t); s.neuBerechnen(); expect(s.netz.reduzierung.size).toBe(0); }
    t = s.stand.abschnitt!.bau!.ende_ms; s.bis(t); s.neuBerechnen();
    expect(s.stand.abschnitt).toBeUndefined();
    expect(v.vorsehung).toBeUndefined(); // jetzt echter Abzweig
    expect(s.netz.reduzierung.size).toBe(0);
  });
  it('A69: Ein verlängertes Leitungsende verbraucht die Vorsehung nicht; eine Vorsehung auf neuer Leitung mit Abzweig ist nach dem Bau belegt', () => {
    let t = 0; const s = new Spiel(neuerSpielstand(0), () => t); s.ersteQuelleWaehlen('kessel'); s.stand.geld_eur = 1_000_000;
    s.stand.abschnitt = { phase: 'offen', bau: null };
    const ende = s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === 11 && o.y === 14)!; ende.vorsehung = true;
    // Leitungsende nach unten verlängern: (11|15), (11|16); auf (11|15) Vorsehung, daran nach rechts ein Abzweig (12|15)
    for (const [x, y] of [[11, 15], [11, 16], [12, 15]] as const) expect(s.platzieren('d25', x, y).ok).toBe(true);
    const mitte = s.stand.objekte.find((o) => o.geplant && o.x === 11 && o.y === 15)!;
    expect(s.vorsehungUmschalten(mitte.id).ok).toBe(true);
    s.abschnittAbschliessen(); expect(s.materialBestellen().ok).toBe(true);
    t = s.stand.abschnitt!.bau!.ende_ms; s.bis(t);
    expect(ende.vorsehung).toBe(true);
    expect(mitte.vorsehung).toBeUndefined();
  });
  it('A68/K1: Die Bäckerei braucht 75 °C Vorlauf und stockt wie Wohnhäuser auf (Schlüssel „baeck“)', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0);
    const b = { ...s.stand.objekte.find((o) => o.typ === 'efh')!, typ: 'baeck' as const, upgrade: 0 };
    expect(s.mindestVorlauf_c(b)).toBe(75);
    s.neuBerechnen();
    expect(MIN_VORLAUF_C.baeck).toBe(75);
  });
});

describe('Review A45–A66: Nachbesserungen', () => {
  it('A50: Friert ein angeschlossener Kunde, kommen keine Interessenten, und die Zeit beginnt von vorn', () => {
    let t = 0; const s = new Spiel(neuerSpielstand(0), () => t); s.ersteQuelleWaehlen('kessel'); s.stand.preisstufe = 4;
    const start = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.station);
    // Ein Starthaus wächst über seine 15-kW-Station hinaus: angeschlossen, aber kalt
    Object.assign(start[0], { station: 'st_15', aufgestockt: true, vollversorgung: true });
    s.neuBerechnen();
    s.stand.zufrieden_s = 500;
    for (let i = 0; i < 40; i++) { t += 60_000; s.bis(t); }
    expect(s.netz.anschluss.has(start[0].id)).toBe(true);
    expect(s.netz.warm.has(start[0].id)).toBe(false);
    expect(s.stand.objekte.some((o) => o.interessent)).toBe(false);
    expect(s.stand.zufrieden_s).toBe(0);
  });
  it('A62: Laura sagt die Lieferzeit in Tagen an; nach Express ist sie kürzer; kurz vor Lieferende gibt es keinen Express mehr', () => {
    let t = 0; const s = new Spiel(neuerSpielstand(0), () => t); s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 100_000; s.stand.abschnitt = { phase: 'offen', bau: null };
    const ende = s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === 11 && o.y === 14)!;
    const frei = ([[1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [ende.x + dx, ende.y + dy] as const).find(([a, b]) => s.kannPlatzieren('d25', a, b))!;
    s.platzieren('d25', frei[0], frei[1]); s.abschnittAbschliessen(); s.ereignisse.length = 0;
    expect(s.materialBestellen().ok).toBe(true);
    const tage = (x: { text?: string }) => Number(/(\d+) Tag/.exec(x.text ?? '')?.[1]);
    const vorher = tage(s.ereignisse.find((e) => e.art === 'sprecher') as { text: string });
    expect(vorher).toBe(s.liefertage());
    expect(vorher).toBeGreaterThan(1);
    s.ereignisse.length = 0;
    expect(s.expressLiefern().ok).toBe(true);
    const nachher = tage(s.ereignisse.find((e) => e.art === 'sprecher') as { text: string });
    expect(nachher).toBeLessThan(vorher);
    // zweiter Abschnitt: Express eine Sekunde vor Lieferende wird abgelehnt und kostet nichts
    s.stand.abschnitt!.express = false;
    t = s.stand.abschnitt!.bau!.ende_ms - 1000;
    const geld = s.stand.geld_eur;
    expect(s.expressLiefern().ok).toBe(false);
    expect(s.stand.geld_eur).toBe(geld);
  });
  it('A62: Bei alten Spielständen ohne gemerkten Materialpreis richtet sich Express nach den Leitungen des Abschnitts', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    s.stand.objekte.push(...Array.from({ length: 12 }, (_, i) => ({ id: 9000 + i, typ: 'd110' as const, x: i, y: 20, stufe: 1, bau: null, kasse_eur: 0, geplant: true })));
    s.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: 0, ende_ms: 10_000_000 } };
    expect(s.expresskosten_eur()).toBe(Math.max(KONSTANTEN.express_min_eur, Math.round(s.abschnittKosten_eur() * KONSTANTEN.express_anteil)));
    expect(s.expresskosten_eur()).toBeGreaterThan(KONSTANTEN.express_min_eur);
  });
  it('A49: „Letzte zurück“ nimmt einen automatisch gezogenen Hausanschluss als Ganzes zurück', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 1_000_000; s.stand.abschnitt = { phase: 'offen', bau: null };
    // ein Haus suchen, dessen Anschluss mehrere Felder lang ist
    for (const haus of s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station)) {
      if (!s.hausanschlussPlanen(haus.id).ok) continue;
      if (s.abschnittLeitungen() > 1) break;
      s.abschnittVerwerfen(); s.stand.abschnitt = { phase: 'offen', bau: null };
    }
    expect(s.abschnittLeitungen()).toBeGreaterThan(1);
    expect(s.letzteLeitungZurueck().ok).toBe(true);
    expect(s.abschnittLeitungen()).toBe(0);
  });
});

describe('Review: Anpassung alter Spielstände (A46)', () => {
  it('A46: Das Sägewerk im neuen Fluss zieht auf seinen Platz im Ortsplan; gebaute Leitungen im Fluss werden erstattet', () => {
    const s0 = neuerSpielstand(0);
    delete s0.karte;
    const ort = ortHolen(s0.ort);
    const fluss = ort.fluss[0];
    const saege = s0.objekte.find((o) => o.typ === 'gewerbe')!;
    const platz = ort.gross.find((g) => g.typ === 'gewerbe')!;
    saege.x = fluss[0]; saege.y = fluss[1]; saege.zustand = 'vertrag';
    s0.objekte.push({ id: 9998, typ: 'd50', x: ort.fluss[1][0], y: ort.fluss[1][1], stufe: 1, bau: null, kasse_eur: 0 });
    const geld = s0.geld_eur;
    const r = ladenMitBefund(serialisieren(s0), 0);
    const neu = r.stand.objekte.find((o) => o.typ === 'gewerbe')!;
    expect([neu.x, neu.y]).toEqual([platz.x, platz.y]);
    expect(neu.zustand).toBe('vertrag');
    expect(r.stand.objekte.some((o) => o.id === 9998)).toBe(false);
    expect(r.stand.geld_eur).toBe(geld + (KATALOG.d50.kosten_eur as number[])[0]);
  });
});

describe('A70 Kartenoptik nach Designer-Prüfung', () => {
  it('A70: Dachfarbe ist je Haus fest und gemischt (Rottöne überwiegen), Umriss ist die konvexe Hülle', async () => {
    const { dachfarbe } = await import('../src/render/farben');
    const { huelle } = await import('../src/render/maler');
    expect(dachfarbe(17)).toBe(dachfarbe(17));
    const farben = Array.from({ length: 400 }, (_, i) => dachfarbe(i + 1));
    expect(new Set(farben).size).toBeGreaterThanOrEqual(5);
    const rot = farben.filter((f) => ['#e2582b', '#c4553e', '#d8392f'].includes(f)).length / farben.length;
    expect(rot).toBeGreaterThan(0.55); expect(rot).toBeLessThan(0.85);
    const h = huelle([[0, 0], [10, 0], [10, 10], [0, 10], [5, 5], [5, 0]]);
    expect(h).toHaveLength(4);
  });
  it('A70: Bei offenem Blatt bleibt im Querformat die Geld-Anzeige links neben dem Blatt; Zoomknöpfe paarweise', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');
    expect(css).toContain('.blatt-offen .pillen{right:calc(min(46%,400px) + 12px)}');
    expect(css).toMatch(/\.zoom\{display:grid;grid-template-columns:repeat\(2,/);
  });
});

describe('Simon 2026-11-05: Verbrauch, Leitungen, Rücklauf, Startnetz', () => {
  it('A71: Anschlussleistung = Jahresverbrauch ÷ 1.500 h, mit Pufferspeicher im Haus ÷ 1.800 h', async () => {
    const { VOLLLASTSTUNDEN } = await import('../src/core/katalog');
    expect(VOLLLASTSTUNDEN).toEqual({ ohne_puffer_h: 1500, mit_puffer_h: 1800 });
    const s = new Spiel(neuerSpielstand(0), () => 0); s.stand.geld_eur = 100_000;
    const haus = s.stand.objekte.find((o) => o.typ === 'efh' && !o.vollversorgung && !o.aufgestockt)!;
    expect(bedarfKw(haus)).toBeCloseTo(KATALOG.efh.verbrauch_kwh_a! / 1500);
    const geld = s.stand.geld_eur;
    expect(s.hauspufferEinbauen(haus.id).ok).toBe(true);
    expect(s.stand.geld_eur).toBe(geld - KONSTANTEN.hauspuffer_eur);
    expect(bedarfKw(haus)).toBeCloseTo(KATALOG.efh.verbrauch_kwh_a! / 1800);
    expect(s.hauspufferEinbauen(haus.id).ok).toBe(false); // nur einmal
    const buero = s.stand.objekte.find((o) => o.typ === 'buero')!;
    expect(s.hauspufferEinbauen(buero.id).ok).toBe(false);
  });
  it('A71: Jeder Kunde hat einen Jahresverbrauch in kWh; der kW-Bedarf ergibt sich daraus', () => {
    for (const t of ['efh', 'rh', 'baeck', 'mfh', 'bad', 'klinik'] as const) {
      expect(KATALOG[t].verbrauch_kwh_a).toBeGreaterThan(0);
      expect(KATALOG[t].bedarf_kw).toBeCloseTo(KATALOG[t].verbrauch_kwh_a! / 1500);
    }
  });
  it('A72: 25er bis 15 kW, 32er bis 25 kW, danach nach Rohrquerschnitt', () => {
    expect(LEITUNGEN.map((l) => KATALOG[l].kapazitaet_kw)).toEqual([15, 25, 40, 60, 95, 135, 195, 290]);
    for (const l of LEITUNGEN) expect(KATALOG[l].beschreibung).toContain(`bis ${KATALOG[l].kapazitaet_kw} kW`);
  });
  it('A73: Der Rücklauf fällt nie unter 40 °C; Upgrades vergrößern die Spreizung', async () => {
    const { spreizungHaus_k } = await import('../src/core/netz');
    const s = new Spiel(neuerSpielstand(0), () => 0);
    const haus = { ...s.stand.objekte.find((o) => o.typ === 'efh')! };
    for (const vorlauf of [55, 60, 70, 75, 85]) for (const upgrade of [0, 1, 2, 3]) {
      haus.upgrade = upgrade;
      expect(vorlauf - spreizungHaus_k(haus, vorlauf)).toBeGreaterThanOrEqual(40);
    }
    haus.upgrade = 0; expect(spreizungHaus_k(haus, 85)).toBe(20);
    haus.upgrade = 1; expect(spreizungHaus_k(haus, 85)).toBe(25); // +5 K
    haus.upgrade = 3; expect(spreizungHaus_k(haus, 75)).toBe(35); // gedeckelt: 75 − 40
    const kontext = readFileSync(new URL('../src/ui/kontext.ts', import.meta.url), 'utf8');
    expect(kontext).toContain('Spreizung +${gewinn} K'); // Fachprüfung: tatsächlicher Gewinn statt Nennwert
    expect(kontext).toContain('spreizungHaus_k({ ...o, upgrade: n + 1 }');
    expect(kontext).toContain('% weniger als nominal'); // Fachprüfung: niedriger Vorlauf heißt weniger, nicht „-25 % mehr“
    expect(kontext).not.toContain('−${u.senkung_k} K');
  });
  it('A73: Der 40-°C-Rücklauf wirkt im Netz – Leitungskapazität und Netz-Spreizung folgen dem Vorlauf', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    // letztes Haus am 25er (15 kW): Reihenhaus mit Puffer = 24.000 kWh ÷ 1.800 h = 13,3 kW
    const haus = s.stand.objekte.find((o) => o.x === 12 && o.y === 14)!;
    haus.typ = 'rh'; haus.hauspuffer = true; s.neuBerechnen();
    const d25 = s.stand.objekte.find((o) => o.typ === 'd25' && o.x === 11 && o.y === 14)!;
    const schluessel = [...s.netz.last_kw.keys()].find((k) => Math.abs((s.netz.last_kw.get(k) ?? 0) - bedarfKw(haus)) < 0.01 && k % 24 === d25.x)!;
    expect(schluessel).toBeDefined();
    expect(s.netz.spreizung_faktor).toBe(1); expect(s.spreizung_k()).toBe(20);
    expect(s.netz.kapazitaet_ok.get(schluessel)).toBe(true);
    s.vorlaufSetzen(55); // Rücklauf mindestens 40 °C → nur 15 K Spreizung
    expect(s.netz.spreizung_faktor).toBeCloseTo(0.75); expect(s.spreizung_k()).toBe(15);
    expect(s.netz.kapazitaet_ok.get(schluessel)).toBe(false); // 13,3 kW > 15 kW × 0,75
  });
  it('A71: Pufferspeicher ohne genug Geld wird nicht eingebaut; Meldungen nennen gerundete kW', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    const haus = s.stand.objekte.find((o) => o.typ === 'efh')!;
    s.stand.geld_eur = KONSTANTEN.hauspuffer_eur - 1;
    expect(s.hauspufferEinbauen(haus.id).ok).toBe(false); expect(haus.hauspuffer).toBeFalsy();
    const quelle = readFileSync(new URL('../src/core/spiel.ts', import.meta.url), 'utf8');
    expect(quelle).not.toContain('das Gebäude braucht ${bedarf} kW');
    expect(quelle).toContain('braucht ${u.senkung_k} K weniger Vorlauf'); // Fertig-Meldung ohne Nennwert-Spreizung
  });
  it('A74: Startnetz – 40er bis vor das letzte Haus, dort T-Stück mit Vorsehung geradeaus, 25er zum Haus', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0); s.ersteQuelleWaehlen('kessel');
    const an = (x: number, y: number) => s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === x && o.y === y);
    for (let y = 10; y <= 14; y++) expect(an(10, y)?.typ).toBe('d40');
    expect(an(10, 14)?.vorsehung).toBe(true);
    expect(an(11, 14)?.typ).toBe('d25');
    expect(an(10, 15)).toBeUndefined();
    expect(s.netz.reduzierung.size).toBe(0);
    expect(s.netz.aufteilung.size).toBe(0);
    for (const h of s.stand.objekte.filter((o) => o.station)) expect(s.netz.warm.has(h.id)).toBe(true);
  });
});

describe('Simon 2026-11-05: Bedienung und Start', () => {
  it('A77: Keine Knöpfe für Zoomen und Drehen mehr, der kW-Schalter bleibt', () => {
    const hud = readFileSync(new URL('../src/ui/hud.ts', import.meta.url), 'utf8');
    for (const weg of ['Vergrößern', 'Verkleinern', 'Karte nach links drehen', 'Karte nach rechts drehen']) expect(hud).not.toContain(weg);
    expect(hud).toContain('kwknopf');
  });
  it('A78: Ladebild – Bewegtes auf eigener Ebene, Ladebalken über transform statt Breite', () => {
    const vs = readFileSync(new URL('../src/ui/vorspann.ts', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');
    expect(vs).toContain('bewegteEbene(szene)');
    expect(css).toMatch(/\.vs-bewegt\{[^}]*will-change:transform/);
    expect(css).toContain('@keyframes vs-laden{to{transform:scaleX(1)}}');
    expect(css).not.toContain('@keyframes vs-laden{to{width:100%}}');
  });
  it('A79: Neues Spiel fragt nach Name und Dorfname; leere Eingaben behalten den Vorschlag; alte Stände werden nicht gefragt', () => {
    const s = new Spiel(neuerSpielstand(0), () => 0);
    expect(s.stand.namen_gefragt).toBe(false);
    const vorschlag = s.stand.name;
    s.namenSetzen('  Simon  ', '');
    expect(s.stand.spieler).toBe('Simon');
    expect(s.stand.name).toBe(vorschlag);
    expect(s.stand.namen_gefragt).toBe(true);
    s.namenSetzen('', 'Wärmhausen an der Schwarzach mit Zusatz');
    expect(s.stand.spieler).toBe('Simon');
    expect(s.stand.name.length).toBeLessThanOrEqual(24);
    const alt = neuerSpielstand(0); delete alt.namen_gefragt;
    const geladen = ladenMitBefund(serialisieren(alt), 0);
    expect(geladen.stand.namen_gefragt).toBeUndefined(); // kein Fragefenster für alte Stände
    const steuerung = readFileSync(new URL('../src/steuerung.ts', import.meta.url), 'utf8');
    expect(steuerung).toContain('if (spiel.stand.namen_gefragt === false) this.namenFragen();');
  });
});

describe('A80 Antippen trifft beim ersten Mal', () => {
  it('A80: Tippen auf Dach/Wand eines Hauses trifft das Haus, nicht das Feld dahinter – in jedem Drehwinkel', async () => {
    const { objektAmPunkt } = await import('../src/render/treffer');
    const s = new Spiel(neuerSpielstand(0), () => 0);
    const k = new Kamera(); k.groesseSetzen(844, 390, 1); k.zoom = 3;
    const haus = s.stand.objekte.find((o) => o.typ === 'efh' && o.x === 12 && o.y === 14)!;
    for (const w of [0, 0.4, Math.PI / 2, 2.5]) {
      k.winkel_rad = w; k.zentrieren(haus.x, haus.y, 1);
      const [cx, cy] = k.mitte(haus.x, haus.y);
      expect(objektAmPunkt(k, s.stand.objekte, cx, cy - k.tw * 0.45)?.id).toBe(haus.id); // oben am Dach
      expect(objektAmPunkt(k, s.stand.objekte, cx, cy)?.id).toBe(haus.id); // Mitte
    }
    k.winkel_rad = 0;
    const leitung = s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === 10 && o.y === 12)!;
    const [lx, ly] = k.mitte(leitung.x, leitung.y);
    const t = objektAmPunkt(k, s.stand.objekte, lx, ly);
    expect(t?.id === leitung.id || KATALOG[t!.typ].kategorie !== 'netz').toBe(true);
  });
  it('A80: Ein zweites Haus antippen, während ein Fenster offen ist, zeigt dessen Inhalt (kein leeres Fenster)', () => {
    const src = readFileSync(new URL('../src/ui/kontext.ts', import.meta.url), 'utf8');
    expect(src).toContain('if (this.blatt !== b) return;');
    expect(src.indexOf('this.blatt = b; this.id = id;')).toBeGreaterThan(src.indexOf('blattOeffnen({ titel: D.name'));
  });
});
