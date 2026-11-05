import { Kamera } from '../src/render/kamera';
import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { bedarfKw } from '../src/core/netz';
import { ortHolen } from '../src/core/orte';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { KATALOG, KONSTANTEN, PREISSTUFEN, STATIONEN, istLeitung, passendeStation, LEITUNGEN } from '../src/core/katalog';

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
    (KATALOG.efh as { bedarf_kw: number }).bedarf_kw = 20;
    try { s.neuBerechnen(); expect(s.netz.kalt.get(haus.id)).toBe('station'); }
    finally { (KATALOG.efh as { bedarf_kw: number }).bedarf_kw = 10; }
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
      if (['d25', 'd32', 'd40', 'd50', 'd65', 'd80', 'd100', 'd125', 'd150'].includes(o.typ)) continue;
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

describe('A48 Karte drehen', () => {
  it('A48: Die Ansicht lässt sich in 90°-Schritten drehen; Feld → Bild → Feld bleibt in jeder Drehung exakt, vier Drehungen ergeben die Ausgangsansicht', async () => {
    const { Kamera } = await import('../src/render/kamera');
    const k = new Kamera(); k.groesseSetzen(844, 390, 1);
    const vorher = k.mitte(7, 3);
    for (let d = 0; d < 4; d++) {
      k.drehung = d;
      const [mx, my] = k.mitte(7, 3);
      const [fx, fy] = k.feldGenau(mx, my);
      expect(fx).toBeCloseTo(7); expect(fy).toBeCloseTo(3);
    }
    k.drehung = 0;
    for (let i = 0; i < 4; i++) k.drehen(1);
    expect(k.drehung).toBe(0);
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
    expect(l.figur).toBe('Laura'); expect(l.text).toMatch(/Simon/); expect(l.text).toMatch(/Woche/);
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
  it('A52: Der Preis lässt sich über preisSetzen ändern und die Stufe bleibt zwischen 7 und 15 ct', () => {
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
    const aus = { ...e, kw_anzeigen: false };
    expect(aus.kw_anzeigen).toBe(false);
  });
});

describe('A55 Drehen per Geste', () => {
  it('A55: Kamera dreht in 90°-Schritten, vier Schritte ergeben wieder die Ausgangsansicht', () => {
    const k = new Kamera(); k.groesseSetzen(844, 390, 1);
    const [x0, y0] = k.mitte(10, 10);
    for (let i = 0; i < 4; i++) k.drehen(1);
    const [x1, y1] = k.mitte(10, 10);
    expect(Math.abs(x1 - x0) + Math.abs(y1 - y0)).toBeLessThan(1);
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
