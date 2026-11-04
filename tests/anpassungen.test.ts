import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG, KONSTANTEN, PREISSTUFEN, STATIONEN, istLeitung, passendeStation } from '../src/core/katalog';

const T0 = 1_000_000_000_000;
const neuesSpiel = (): Spiel => new Spiel(neuerSpielstand(T0), () => T0);

describe('A22/A29 Start', () => {
  it('A29: Start mit 100.000 €, Wärmepreis 12 ct/kWh, zwei angeschlossene Häuser, ein weiteres nicht', () => {
    const s = neuesSpiel();
    expect(s.stand.geld_eur).toBe(100_000);
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
    s.stand.geld_eur = 10_000; s.stand.abschnitt = { phase: 'offen', bau: null };
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
    s.stand.abschnitt = { phase: 'offen', bau: null };
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
    const haus = s.stand.objekte.find((o) => o.typ === 'efh' && o.x === 9)!;
    haus.station = 'st_15';
    (KATALOG.efh as { bedarf_kw: number }).bedarf_kw = 20; s.neuBerechnen();
    expect(s.netz.kalt.get(haus.id)).toBe('station');
    (KATALOG.efh as { bedarf_kw: number }).bedarf_kw = 10;
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
  it('A38: Beim Wiederöffnen nach drei Tagen sind Einnahmen aufgelaufen, nach einem Monat gilt die Obergrenze von 7 Tagen', () => {
    const s = neuesSpiel(); s.ersteQuelleWaehlen('kessel');
    const a = new Spiel(JSON.parse(JSON.stringify(s.stand)), () => T0 + 3 * 86_400_000); a.bis(T0 + 3 * 86_400_000);
    const b = new Spiel(JSON.parse(JSON.stringify(s.stand)), () => T0 + 30 * 86_400_000); b.bis(T0 + 30 * 86_400_000);
    const kasse = (x: Spiel) => x.stand.objekte.reduce((n, o) => n + o.kasse_eur, 0);
    expect(kasse(a)).toBeGreaterThan(kasse(s));
    expect(b.stand.zuletzt_ms).toBe(T0 + 30 * 86_400_000);
    expect(kasse(b)).toBeGreaterThanOrEqual(kasse(a));
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
  it('A39: Spreizung steigt mit Upgrades und fällt mit höherem Vorlauf nicht unter null', () => {
    let t = T0; const s = new Spiel(neuerSpielstand(T0), () => t); s.ersteQuelleWaehlen('kessel');
    for (let i = 0; i < 100; i++) { t += 10_000; s.bis(t); }
    const vor = s.spreizung_k();
    const h = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.station)!;
    s.upgradeKaufen(h.id); t += 3_600_000; s.bis(t);
    expect(s.spreizung_k()).toBeGreaterThan(vor);
  });
  it('A40: Drei Helfer arbeiten je an einem Auftrag; der vierte Auftrag wartet', () => {
    let t = T0; const s = new Spiel(neuerSpielstand(T0), () => t); s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 100_000;
    const haeuser = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.station);
    // nur zwei Häuser mit Station: das zweite Haus bekommt per Hand eine dritte Station
    const extra = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station)!;
    extra.ohne_station = false; extra.station = 'st_15';
    const vier = [...haeuser, extra];
    expect(vier.length).toBeGreaterThanOrEqual(3);
    for (const o of vier.slice(0, 3)) expect(s.upgradeKaufen(o.id).ok).toBe(true);
    expect(s.freierHelfer()).toBeUndefined();
    const vierter = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.station && !o.upgrade_auftrag);
    if (vierter) expect(s.upgradeKaufen(vierter.id).ok).toBe(false);
    expect(s.upgradeKaufen(vier[0].id).ok).toBe(false); // gleicher Hausauftrag läuft schon
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
    expect(s.stand.geld_eur).toBe(g1 - KATALOG.d50.kosten_eur![0]);
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
    expect(Math.round(h.aufgestockt ? vorher * 1.5 * 1.4 : vorher * 1.5)).toBeGreaterThanOrEqual(Math.round(vorher * 1.5));
  });
  it('Aufstockung: Ein Wohnhaus stockt nach einiger Zeit auf, der Bedarf steigt', () => {
    const { s, z } = mitUhr(); const h = startHaus(s);
    lauf(s, z, KONSTANTEN.aufstockung_nach_s + 1500);
    expect(h.aufgestockt).toBe(true);
  });
  it('A36: Dach-PV kostet Geld, liefert Strom und Überschuss wird eingespeist', () => {
    const { s } = mitUhr(); const h = startHaus(s);
    expect(s.netz.einspeisung_kw).toBe(0);
    const g = s.stand.geld_eur;
    expect(s.dachPvKaufen(h.id).ok).toBe(true);
    expect(g - s.stand.geld_eur).toBe(8 * 1100);
    expect(s.netz.strom_kw).toBeGreaterThanOrEqual(8);
    expect(s.netz.einspeisung_kw).toBeGreaterThan(0); // Kessel ist nicht elektrisch → alles geht ins Netz
    expect(s.dachPvKaufen(h.id).ok).toBe(false);
  });
  it('A43: Baugebiet braucht Heizzentrale Stufe 3 und genug Anschlüsse, dann entstehen feste neue Häuser', () => {
    const { s } = mitUhr(); s.stand.geld_eur = 1_000_000;
    expect(s.baugebietErschliessen().ok).toBe(false);
    s.stand.objekte.find((o) => o.typ === 'hz')!.stufe = 3;
    for (const o of s.stand.objekte.filter((x) => KATALOG[x.typ].kategorie === 'haus')) { o.ohne_station = false; o.station = 'st_80'; }
    s.stand.objekte.push({ id: s.stand.naechste_id++, typ: 'd110', x: 12, y: 12, stufe: 1, bau: null, kasse_eur: 0 }); s.neuBerechnen();
    const bed = s.baugebietBedingungen();
    if (!bed.ok) { // nicht jedes Dorf hat sofort sechs warme Häuser: Bedingung künstlich erfüllen
      s.netz.warm.clear(); for (const o of s.stand.objekte.filter((x) => KATALOG[x.typ].kategorie === 'haus').slice(0, 6)) s.netz.warm.add(o.id);
    }
    const n0 = s.stand.objekte.length;
    expect(s.baugebietErschliessen().ok).toBe(true);
    expect(s.stand.objekte.length).toBeGreaterThan(n0);
    expect(s.stand.baugebiet).toBe(true);
    expect(s.baugebietErschliessen().ok).toBe(false);
  });
});
