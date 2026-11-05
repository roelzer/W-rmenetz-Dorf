import { describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand, type Ereignis } from '../src/core/spiel';
import { BAU_KATEGORIEN, KATALOG, KONSTANTEN, passendeStation, STATIONEN, type TypId } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import { pruefeAuftraege } from '../src/core/auftraege';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { abStufe, FREISCHALTUNGEN, FUNKTION_NAME, freigeschaltet, neuBeiStufe, sperrgrund, type Funktion, type Merkmal } from '../src/core/freischaltung';
import { blase } from '../src/render/szene';
import type { Objekt } from '../src/core/typen';
import { SYMBOLE } from '../src/ui/symbole';

// A88 Freischalt-Leiter (Bauplan docs/bauplaene/A88-freischalt-leiter.md, Abschnitt 4, 6a, 9 T1–T10, 10).
// Nutzt das echte Kernmodul (kein vi.mock). Erwartete Stufen von Hand aus der Tabelle in Abschnitt 4.

const T0 = 1_000_000_000_000;
const neu = (stufe = 1) => {
  const z = { t: T0 };
  const s = new Spiel(neuerSpielstand(T0), () => z.t);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  return { s, z };
};
const hinweise = (s: Spiel) => s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'hinweis' }> => e.art === 'hinweis').map((e) => e.text);
const offenerAbschnitt = (s: Spiel) => { s.stand.abschnitt = { phase: 'offen', bau: null }; };
const lege = (s: Spiel, typ: TypId, x: number, y: number, extra: Partial<Objekt> = {}): Objekt => {
  const o: Objekt = { id: s.stand.naechste_id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra };
  s.stand.objekte.push(o); return o;
};
const startHaeuser = (s: Spiel) => s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.station);
const FUNKTIONEN: Funktion[] = ['stationstypen', 'express', 'gestattung', 'spuelbohrung', 'vorlauf', 'ruecklauf_helfer', 'hauspuffer', 'vorsehung', 'dach_pv', 'baugebiet'];

describe('A88 Freischalt-Leiter – Tabelle', () => {
  it('A88: test_a88_tabelle_stufen – abStufe je Merkmal wie Abschnitt 4', () => {
    const soll: Record<number, Merkmal[]> = {
      1: ['d25', 'd32', 'd40', 'kessel', 'buero', 'huette', 'baum', 'blumen', 'hecke', 'bank', 'laterne', 'efh'],
      2: ['d50', 'd63', 'stationstypen', 'express', 'gestattung', 'spuelbohrung', 'wpg', 'puffer', 'solar', 'bad', 'gewerbe', 'brunnen'],
      3: ['d75', 'd90', 'd110', 'vorlauf', 'ruecklauf_helfer', 'hauspuffer', 'pellet', 'gas', 'sonde', 'klinik'],
      4: ['vorsehung', 'bhkw', 'ptk', 'pv', 'dach_pv', 'baugebiet'],
    };
    for (const [stufe, liste] of Object.entries(soll)) for (const m of liste) expect(abStufe(m), m).toBe(Number(stufe));
  });
  it('A88: test_a88_jede_funktion_hat_namen', () => {
    for (const f of FUNKTIONEN) { expect(FREISCHALTUNGEN[f], f).toBeGreaterThan(1); expect(FUNKTION_NAME[f], f).toBeTruthy(); }
    expect(FUNKTION_NAME.express).toBe('Expresslieferung');
  });
  it('A88: test_a88_grenze_null_nur_unter_freischaltung (T1c)', () => {
    const kats = new Set(BAU_KATEGORIEN.map(([k]) => k));
    for (const t of Object.keys(KATALOG) as TypId[]) {
      if (!kats.has(KATALOG[t].kategorie)) continue;
      (KATALOG[t].grenze ?? []).forEach((g, i) => { if (g === 0) expect(i + 1, t).toBeLessThan(abStufe(t)); });
    }
  });
  it('A88: neuBeiStufe in Tabellenreihenfolge', () => {
    expect(neuBeiStufe(4)).toEqual(['vorsehung', 'bhkw', 'ptk', 'pv', 'dach_pv', 'baugebiet']);
    expect(neuBeiStufe(2).slice(0, 4)).toEqual(['d50', 'd63', 'stationstypen', 'express']);
    expect(neuBeiStufe(5)).toEqual([]);
  });
});

describe('A88 Freischalt-Leiter – je Stufe, was baubar ist (T2)', () => {
  const welt: Merkmal[] = [...(Object.keys(KATALOG) as TypId[]).filter((t) => t !== 'hz' && (BAU_KATEGORIEN.some(([k]) => k === KATALOG[t].kategorie) || KATALOG[t].kategorie === 'gross')), ...FUNKTIONEN];
  const s1: Merkmal[] = ['kessel', 'd25', 'd32', 'd40', 'buero', 'huette', 'baum', 'blumen', 'hecke', 'bank', 'laterne'];
  const s2: Merkmal[] = [...s1, 'wpg', 'puffer', 'solar', 'd50', 'd63', 'bad', 'gewerbe', 'brunnen', 'stationstypen', 'express', 'gestattung', 'spuelbohrung'];
  const s3: Merkmal[] = [...s2, 'pellet', 'gas', 'sonde', 'd75', 'd90', 'd110', 'klinik', 'vorlauf', 'ruecklauf_helfer', 'hauspuffer'];
  const s4: Merkmal[] = [...s3, 'bhkw', 'ptk', 'pv', 'vorsehung', 'dach_pv', 'baugebiet'];
  for (const [n, soll] of [[1, s1], [2, s2], [3, s3], [4, s4], [5, s4]] as Array<[number, Merkmal[]]>) {
    it(`A88: test_a88_stufe_${n}_baubar`, () => {
      const { s } = neu(n);
      expect(welt.filter((m) => freigeschaltet(s.stand, m)).sort()).toEqual([...soll].sort());
      expect(s.freigeschaltet('d50')).toBe(n >= 2);
      expect(s.sperrgrund('d50')).toBe(n >= 2 ? null : 'ab Heizzentrale Stufe 2');
    });
  }
  it('A88: HZ-Ausbau läuft gerade – es gilt die alte Stufe', () => {
    const { s } = neu(1);
    s.hz.bau = { art: 'ausbau', start_ms: T0, ende_ms: T0 + 1e9 };
    expect(sperrgrund(s.stand, 'express')).toBe('ab Heizzentrale Stufe 2');
  });
});

describe('A88 Freischalt-Leiter – neues Spiel und Durchsetzung im Kern (T3, T4)', () => {
  it('A88: test_a88_neues_spiel_nur_stufe1', () => {
    const { s } = neu(1);
    offenerAbschnitt(s);
    const r = s.platzieren('d50', 12, 12);
    expect(r.ok).toBe(false);
    expect(r.hinweis).toBe('50er-Leitung ab Heizzentrale Stufe 2');
    expect(s.innenEinbauen('pellet').ok).toBe(false);
    expect(s.innenEinbauen('kessel').ok).toBe(true);
  });
  it('A88: test_a88_startnetz_bleibt (A74)', () => {
    const { s } = neu(1);
    expect(s.stand.objekte.find((o) => o.typ === 'd40' && o.x === 10 && o.y === 14)?.vorsehung).toBe(true);
    for (const h of startHaeuser(s)) expect(s.netz.warm.has(h.id)).toBe(true);
    expect(startHaeuser(s).length).toBe(2);
  });
  it('A88: test_a88_kern_setzt_durch – Stufe 1 mit genug Geld', () => {
    const { s, z } = neu(1);
    const start40 = s.stand.objekte.find((o) => o.typ === 'd40' && o.x === 10 && o.y === 12)!;
    expect(s.leitungTauschen(start40.id, 'd50').ok).toBe(false);
    const haus = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station)!;
    expect(bedarfKw(haus)).toBe(10);
    expect(s.stationKaufen(haus.id, 'st_25').ok).toBe(false);
    expect(s.stationKaufen(haus.id, 'st_15').ok).toBe(true);
    s.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: z.t + 10 * 24 * 3600 * 1000 }, material_eur: 1000 };
    expect(s.expressLiefern().ok).toBe(false);
    offenerAbschnitt(s);
    const geplant = lege(s, 'd25', 3, 3, { geplant: true });
    expect(s.vorsehungUmschalten(geplant.id).ok).toBe(false);
    expect(geplant.vorsehung).toBeUndefined();
    const start = startHaeuser(s)[0];
    expect(s.upgradeKaufen(start.id).ok).toBe(false);
    expect(s.hauspufferEinbauen(start.id).ok).toBe(false);
    const v = s.vorlaufSetzen(65);
    expect(v.ok).toBe(false);
    expect(v.hinweis).toContain('ab Heizzentrale Stufe 3');
    expect(s.vorlauf_c).toBe(75);
    expect(s.dachPvKaufen().ok).toBe(false);
    expect(s.foerderungBeantragen('pellet').ok).toBe(false);
    expect(s.foerderungBeantragen('kessel').ok).toBe(true);
    const fluss = s.platzieren('d25', 19, 3);
    expect(fluss.ok).toBe(false);
    expect(fluss.hinweis).toBe('Über den Fluss geht es erst mit Spülbohrung – ab Heizzentrale Stufe 2');
    expect(s.baugebietBedingungen().fehlt).toContain('Heizzentrale Stufe 4');
    const bad = s.stand.objekte.find((o) => o.typ === 'bad')!;
    expect(s.vertragBedingungen(bad).fehlt).toContain('Heizzentrale Stufe 2');
  });
  it('A88: ab Stufe 2 geht die Fluss-Leitung und die freie Stationswahl', () => {
    const { s } = neu(2);
    offenerAbschnitt(s);
    expect(s.platzieren('d25', 19, 3).ok).toBe(true);
    const haus = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station)!;
    expect(s.stationKaufen(haus.id, 'st_25').ok).toBe(true);
  });
  it('A88: passendeLeitung – kleinste freigeschaltete, sonst die dickste freigeschaltete', () => {
    expect(neu(1).s.passendeLeitung(45)).toBe('d40');
    expect(neu(1).s.passendeLeitung(12)).toBe('d25');
    expect(neu(1).s.passendeLeitung(15)).toBe('d25');
    expect(neu(1).s.passendeLeitung(16)).toBe('d32');
    expect(neu(2).s.passendeLeitung(45)).toBe('d50');
    expect(neu(2).s.passendeLeitung(500)).toBe('d63');
    expect(neu(3).s.passendeLeitung(500)).toBe('d110');
  });
});

describe('A88 Freischalt-Leiter – Kosten vor der Freischaltung (T5)', () => {
  const abseits = (stufe: number) => { const { s } = neu(stufe); offenerAbschnitt(s); expect(s.platzieren('d25', 12, 15).ok).toBe(true); return s; };
  it('A88: test_a88_stufe1_ohne_gestattung', () => {
    const s = abseits(1);
    expect(s.istStrasse(12, 15)).toBe(false);
    expect(s.gestattung_eur()).toBe(0);
    expect(s.abschnittKosten_eur()).toBe((KATALOG.d25.kosten_eur as number[])[0]);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    expect(s.stand.gestattungen ?? []).toEqual([]);
  });
  it('A88: test_a88_ab_stufe2_gestattung', () => {
    expect(abseits(2).gestattung_eur()).toBe(KONSTANTEN.gestattung_eur_je_feld);
  });
  it('A88: test_a88_stufe1_ohne_anbohrung / ab Stufe 4 genau ein Anbohrfeld', () => {
    for (const [stufe, n] of [[1, 0], [3, 0], [4, 1]]) {
      const { s } = neu(stufe); offenerAbschnitt(s);
      expect(s.platzieren('d25', 9, 11).ok).toBe(true); // seitlich an die Start-40er (10|11)
      expect(s.anbohrungsFelder().length, `Stufe ${stufe}`).toBe(n);
    }
  });
  it('A88: Hausanschluss jenseits des Flusses auf Stufe 1 – Hinweis mit Spülbohrung statt stillem „kein Weg“', () => {
    const { s } = neu(1); offenerAbschnitt(s);
    const ost = s.stand.objekte.find((o) => o.typ === 'gewerbe')!;
    const r = s.hausanschlussPlanen(ost.id);
    expect(r.ok).toBe(false);
    expect(r.hinweis).toBe('Über den Fluss geht es erst mit Spülbohrung – ab Heizzentrale Stufe 2');
    expect(s.stand.objekte.some((o) => o.geplant)).toBe(false);
  });
});

describe('A88 Freischalt-Leiter – Stufe 1 ist durchspielbar (T6)', () => {
  it('A88: test_a88_stufe1_durchspielbar', () => {
    const z = { t: T0 };
    const s = new Spiel(neuerSpielstand(T0), () => z.t);
    s.ersteQuelleWaehlen('kessel');
    const vor = (sek: number) => { for (let i = 0; i < sek / 10; i++) { z.t += 10_000; s.bis(z.t); } };
    expect(s.abschnittPlanen().ok).toBe(true);
    vor(KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor + 10);
    const haus = s.stand.objekte.find((o) => o.x === 13 && o.y === 12)!;
    expect(s.hausanschlussPlanen(haus.id).ok).toBe(true);
    expect(s.stand.objekte.filter((o) => o.geplant).every((o) => s.freigeschaltet(o.typ))).toBe(true);
    expect(s.stationKaufen(haus.id, passendeStation(bedarfKw(haus)).id).ok).toBe(true);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    vor(KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
    // A89: Der automatische Hausanschluss macht kein Haus kalt – ohne Leitungstausch sind nach der Bauzeit alle drei Häuser warm
    // (die beiden Starthäuser und das neu angeschlossene (13|12)).
    const warm = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && s.netz.warm.has(o.id));
    expect(warm.map((o) => `${o.x}|${o.y}`).sort()).toEqual(['12|14', '13|12', '9|13']);
    pruefeAuftraege(s); // K2: Auftrag c2 („drittes Haus anschließen“) ist damit erledigt
    expect(s.stand.erledigt.c2).toBe(true);
    expect(s.hzZiele()[0]).toMatchObject({ ist: 3, erreicht: true });
    vor(3 * 3600);
    expect(warm.every((o) => s.netz.warm.has(o.id))).toBe(true);
    expect(s.stand.objekte.some((o) => o.aufgestockt || o.vollversorgung)).toBe(false);
    expect(warm.some((o) => o.anfrage)).toBe(true);
  });
});

describe('A88 Freischalt-Leiter – Auftragsreihe braucht nur Freies (T7)', () => {
  it('A88: test_a88_auftraege_brauchen_nur_freies', () => {
    const jeder: Array<[string, number, Merkmal[]]> = [['c2', 1, ['d25', 'd32', 'd40']], ['h3', 1, ['d40']], ['main', 2, ['bad', 'd50']], ['saw', 2, ['gewerbe', 'spuelbohrung']], ['hz3', 2, ['d63']]];
    for (const [auftrag, stufe, ms] of jeder) for (const m of ms) expect(freigeschaltet(neu(stufe).s.stand, m), `${auftrag}: ${m}`).toBe(true);
    expect((['kessel', 'wpg', 'puffer', 'solar'] as Merkmal[]).some((m) => freigeschaltet(neu(2).s.stand, m))).toBe(true);
    expect(freigeschaltet(neu(1).s.stand, 'gestattung')).toBe(false); // c2/h3: Gestattung kostet auf Stufe 1 nichts (F1)
  });
});

describe('A88 Freischalt-Leiter – alte Stände und Bestand (T8, F3)', () => {
  it('A88: test_a88_alter_stand_bekommt_leiter', () => {
    const { s } = neu(1);
    const text = serialisieren(s.stand);
    expect(text).not.toContain('freischalt_leiter');
    const g = ladenMitBefund(text, T0);
    expect(g.befund).toBe('ok');
    const s2 = new Spiel(g.stand, () => T0);
    offenerAbschnitt(s2);
    expect(s2.platzieren('d50', 12, 12).ok).toBe(false);
  });
  it('A88: test_a88_gebautes_bleibt', () => {
    const { s, z } = neu(1);
    const l50 = lege(s, 'd50', 9, 12);
    s.stand.innen.push({ typ: 'pellet', stufe: 1, bau: null });
    lege(s, 'puffer', 2, 2); s.hz.dach_pv = true;
    const [h1, h2] = startHaeuser(s);
    h1.hauspuffer = true;
    h2.upgrade_auftrag = { helfer: 'Sebastian', ende_ms: z.t + 1000 };
    s.neuBerechnen();
    expect(s.dachPvLeistung_kw()).toBe(10);
    z.t += 3600_000; s.bis(z.t);
    expect(h2.upgrade).toBe(1);
    expect(s.stand.objekte.some((o) => o.typ === 'puffer')).toBe(true);
    const r = s.innenAusbauen(s.stand.innen.findIndex((k) => k.typ === 'pellet'));
    expect(r.hinweis ?? '').not.toContain('ab Heizzentrale Stufe');
    expect(s.leitungTauschen(l50.id, 'd40').ok).toBe(true);
    expect(s.entfernen(l50.id).ok).toBe(true);
  });
  it('A88: test_a88_flussleitung_tauschbar', () => {
    const { s } = neu(1);
    const l = lege(s, 'd40', 19, 3);
    expect(s.istFluss(19, 3)).toBe(true);
    expect(s.leitungTauschen(l.id, 'd32').ok).toBe(true);
  });
  it('A88: test_a88_vorsehung_ausschalten', () => {
    const { s } = neu(1); offenerAbschnitt(s);
    const l = lege(s, 'd25', 3, 3, { geplant: true, vorsehung: true });
    expect(s.vorsehungUmschalten(l.id).ok).toBe(true);
    expect(l.vorsehung).toBeUndefined();
    expect(s.vorsehungUmschalten(l.id).ok).toBe(false);
  });
  it('A88: test_a88_station_ohne_stationstypen', () => {
    const { s } = neu(1);
    const h = startHaeuser(s)[0];
    h.aufgestockt = true; h.vollversorgung = true; h.station = 'st_15';
    expect(bedarfKw(h)).toBeCloseTo(21, 9);
    expect(s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
    expect(h.station).toBe('st_25');
  });
  it('A88: test_a88_ueberlast_ausweg_stufe1', () => {
    const { s } = neu(1);
    for (const h of startHaeuser(s)) { h.aufgestockt = true; h.vollversorgung = true; h.station = 'st_25'; }
    s.neuBerechnen();
    for (const h of startHaeuser(s)) expect(s.netz.kalt.get(h.id)).toBe('leitung');
    lege(s, 'd40', 12, 12); lege(s, 'd40', 12, 13);
    s.neuBerechnen();
    for (const h of startHaeuser(s)) expect(s.netz.warm.has(h.id)).toBe(true);
  });
  it('A88: test_a88_vorlauf_bestandsschutz', () => {
    const { s } = neu(1);
    s.stand.vorlauf_c = 65;
    expect(s.freigeschaltet('vorlauf')).toBe(true);
    expect(s.vorlaufSetzen(75).ok).toBe(true);
    expect(s.freigeschaltet('vorlauf')).toBe(false);
    expect(s.vorlaufSetzen(70).ok).toBe(false);
    expect(neu(3).s.vorlaufSetzen(65).ok).toBe(true);
  });
});

describe('A88 Freischalt-Leiter – Meldung beim Ausbau (T9)', () => {
  it('A88: test_a88_meldung_bei_stufe2', () => {
    const { s, z } = neu(1);
    s.hz.bau = { art: 'ausbau', start_ms: z.t, ende_ms: z.t + 1000 };
    z.t += 2000; s.bis(z.t);
    expect(s.hzStufe).toBe(2);
    expect(hinweise(s)).toContain('Neu ab Stufe 2: 50er-Leitung, 63er-Leitung, Freie Stationswahl, Expresslieferung …');
  });
  it('A88: Ausbau auf Stufe 5 meldet nichts Neues, andere Ausbauten auch nicht', () => {
    const { s, z } = neu(4);
    s.hz.bau = { art: 'ausbau', start_ms: z.t, ende_ms: z.t + 1000 };
    z.t += 2000; s.bis(z.t);
    expect(hinweise(s).some((t) => t.startsWith('Neu ab Stufe'))).toBe(false);
    const n4 = neu(3);
    n4.s.hz.bau = { art: 'ausbau', start_ms: n4.z.t, ende_ms: n4.z.t + 1000 };
    n4.z.t += 2000; n4.s.bis(n4.z.t);
    expect(hinweise(n4.s)).toContain('Neu ab Stufe 4: T-Stück mit Vorsehung, Biogas-BHKW, Power-to-Heat-Kessel, PV-Anlage …');
  });
});

describe('A88 Review P1 – Blase und ungültige Anfrage', () => {
  it('A88: Haus mit Anfrage und Zufriedenheit 30 % zeigt „wuetend“, nicht die Anfrage', () => {
    const { s } = neu(1);
    const h = startHaeuser(s)[0];
    h.anfrage = 'vollversorgung'; h.zufriedenheit_pct = 30;
    expect(blase(s, s.netz, h, true, true)).toBe('wuetend');
    h.zufriedenheit_pct = 40;
    expect(blase(s, s.netz, h, true, true)).toBe('anfrage');
  });
  it('A88: ungültiger anfrage-Wert aus dem Spielstand wird beim Laden gelöscht', () => {
    const st = neuerSpielstand(T0);
    const h = st.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.station)!;
    (h as { anfrage?: string }).anfrage = 'kaputt';
    const s = new Spiel(st, () => T0);
    expect(h.anfrage).toBeUndefined();
    expect(blase(s, s.netz, h, true, true)).toBeNull();
  });
  it('A88: ungültiger anfrage-Wert wird im Takt gelöscht, gültige bleiben', () => {
    const { s, z } = neu(1);
    const [h1, h2] = startHaeuser(s);
    (h1 as { anfrage?: string }).anfrage = 'kaputt';
    h2.anfrage = 'aufstockung';
    s.bis(z.t);
    expect(h1.anfrage).toBeUndefined();
    expect(h2.anfrage).toBe('aufstockung');
  });
});

/** Winzige DOM-Nachbildung (Muster tests/menue-v2.test.ts, Review A84 W1). */
function attrappe() {
  class El {
    tag: string; className = ''; attrs: Record<string, string> = {}; kinder: unknown[] = []; style: Record<string, string> = {};
    on: Record<string, () => void> = {};
    constructor(tag: string) { this.tag = tag; }
    setAttribute(k: string, v: string) { this.attrs[k] = v; }
    hasAttribute(k: string) { return k in this.attrs; }
    addEventListener(n: string, f: () => void) { this.on[n] = f; }
    append(...k: unknown[]) { this.kinder.push(...k); }
    replaceChildren(...k: unknown[]) { this.kinder = [...k]; }
  }
  const doc = { createElement: (t: string) => new El(t), createTextNode: (t: string) => ({ text: t }), importNode: (n: unknown) => n, addEventListener: () => {} };
  // Die SVG-Quelle wird am Element vermerkt, damit Tests ein bestimmtes Symbol (z. B. das Schloss) erkennen können.
  class Parser { parseFromString(q: string) { const svg = new El('svg'); svg.attrs.quelle = q; return { documentElement: svg }; } }
  const text = (n: unknown): string => (n && typeof n === 'object' && 'text' in n ? String((n as { text: string }).text) : n instanceof El ? n.kinder.map(text).join('') : '');
  const alle = (n: unknown): El[] => (n instanceof El ? [n, ...n.kinder.flatMap(alle)] : []);
  return { doc, Parser, El, text, alle };
}

describe('A88 Oberfläche fragt nur ab (T10, ohne Browser)', () => {
  it('A88: Baumenü auf Stufe 1 – 50er-Karte gesperrt mit „ab Heizzentrale Stufe 2“, 40er frei', async () => {
    const a = attrappe();
    vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
    vi.doMock('../src/ui/bild', () => ({ katalogBild: () => new a.El('canvas') }));
    vi.doMock('../src/ui/blatt', () => ({ blattOeffnen: () => ({ inhalt: new a.El('div') }) }));
    try {
      const { Katalog } = await import('../src/ui/katalog');
      const { s } = neu(1);
      const toasts: string[] = [];
      const ui = { spiel: s, toast: (t: string) => toasts.push(t), jetzt_ms: () => T0 } as unknown as ConstructorParameters<typeof Katalog>[0];
      const k = new Katalog(ui);
      k.oeffnen('netz');
      const blatt = (k as unknown as { blatt: { inhalt: InstanceType<typeof a.El> } }).blatt;
      const karten = a.alle(blatt.inhalt).filter((e) => e.className.startsWith('bkarte'));
      const karte = (name: string) => karten.find((e) => (e.attrs['aria-label'] ?? '').startsWith(name))!;
      expect(karte('50er-Leitung').className).toContain('gesperrt');
      expect(a.text(karte('50er-Leitung'))).toContain('ab Heizzentrale Stufe 2');
      expect(a.text(karte('75er-Leitung'))).toContain('ab Heizzentrale Stufe 3');
      expect(karte('40er-Leitung').className).not.toContain('gesperrt');
      (k as unknown as { waehlen: (t: TypId, g: boolean) => void }).waehlen('d50', true);
      expect(toasts).toEqual(['50er-Leitung ab Heizzentrale Stufe 2']);
    } finally { vi.unstubAllGlobals(); vi.doUnmock('../src/ui/bild'); vi.doUnmock('../src/ui/blatt'); }
  });
  const bauKasten = async (stufe: number, phase: 'offen' | 'bau') => {
    const a = attrappe();
    vi.resetModules(); // jede Attrappe braucht frisch geladene Oberflächen-Module, sonst bauen sie Elemente der vorigen Attrappe
    vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
    vi.doMock('../src/ui/bild', () => ({ katalogBild: () => new a.El('canvas') }));
    vi.doMock('../src/ui/blatt', () => ({ blattOeffnen: () => ({ inhalt: new a.El('div') }) }));
    try {
      const { Katalog } = await import('../src/ui/katalog');
      const { s } = neu(stufe);
      s.stand.abschnitt = phase === 'offen' ? { phase: 'offen', bau: null } : { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 10 * 86_400_000 } };
      const ui = { spiel: s, toast: () => {}, jetzt_ms: () => T0 } as unknown as ConstructorParameters<typeof Katalog>[0];
      const k = new Katalog(ui);
      k.oeffnen('netz');
      const inhalt = (k as unknown as { blatt: { inhalt: InstanceType<typeof a.El> } }).blatt.inhalt;
      const kasten = a.alle(inhalt).find((e) => e.className === 'kasten')!;
      return { text: a.text(kasten), knoepfe: a.alle(kasten).filter((e) => e.tag === 'button').map((e) => ({ text: a.text(e), aus: e.attrs.disabled !== undefined })) };
    } finally { vi.unstubAllGlobals(); vi.doUnmock('../src/ui/bild'); vi.doUnmock('../src/ui/blatt'); }
  };
  it('A88: Bauabschnitt auf Stufe 1 erwähnt Gestattung, Spülbohrung, Anbohrung und Vorsehung nicht, auf Stufe 4 schon', async () => {
    const eins = (await bauKasten(1, 'offen')).text, vier = (await bauKasten(4, 'offen')).text;
    for (const wort of ['Gestattung', 'Spülbohrung', 'angebohrt', 'Vorsehung']) {
      expect(eins, wort).not.toContain(wort);
      expect(vier, wort).toContain(wort);
    }
    expect((await bauKasten(2, 'offen')).text).toContain('Gestattung');
    expect((await bauKasten(2, 'offen')).text).not.toContain('angebohrt');
  });
  it('A88: Express-Knopf auf Stufe 1 deaktiviert mit Grund, auf Stufe 2 frei', async () => {
    const eins = (await bauKasten(1, 'bau')).knoepfe.find((k) => k.text.includes('Expresslieferung'))!;
    expect(eins).toMatchObject({ aus: true });
    expect(eins.text).toContain('ab Heizzentrale Stufe 2');
    const zwei = (await bauKasten(2, 'bau')).knoepfe.find((k) => k.text.includes('Expresslieferung'))!;
    expect(zwei.aus).toBe(false);
    expect(zwei.text).not.toContain('ab Heizzentrale');
  });
});

describe('A88 Oberfläche P2 – Karten fragen nur den Kern ab (Bauplan 7a, ohne Browser)', () => {
  type Knopf = { text: string; aus: boolean; klick?: () => void; label?: string };
  /** Attrappe einrichten, Oberflächen-Module frisch laden, danach aufräumen. */
  const mitAttrappe = async <E>(arbeit: (a: ReturnType<typeof attrappe>, blatt: { inhalt: unknown; zu: () => void }) => Promise<E>): Promise<E> => {
    const a = attrappe();
    vi.resetModules();
    vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} }); // steuerung.ts liest beim Laden die Einstellungen
    const blatt = { inhalt: new a.El('div') as unknown, zu: () => {} };
    vi.doMock('../src/ui/blatt', () => ({ blattOeffnen: () => blatt, blattOffen: () => false }));
    try { return await arbeit(a, blatt); } finally { vi.unstubAllGlobals(); vi.doUnmock('../src/ui/blatt'); }
  };
  /** Kontextkarte eines Objekts aufbauen; liefert Text, Knöpfe und gestempelte Leitungstypen. */
  const karte = (s: Spiel, o: Objekt) => mitAttrappe(async (a) => {
    const { Kontext } = await import('../src/ui/kontext');
    const gestempelt: string[] = [];
    const ui = { spiel: s, jetzt_ms: () => T0, geaendert: () => {}, stempeln: (t: string) => gestempelt.push(t), toast: () => {}, katalog: () => {} };
    const k = new Kontext(ui as unknown as ConstructorParameters<typeof Kontext>[0], () => {});
    const c = new a.El('div');
    (k as unknown as { inhalt: (c: unknown, o: Objekt) => void }).inhalt(c, o);
    const knoepfe: Knopf[] = a.alle(c).filter((e) => e.tag === 'button').map((e) => ({ text: a.text(e), aus: e.attrs.disabled !== undefined, klick: e.on.click, label: e.attrs['aria-label'] }));
    return { text: a.text(c), knoepfe, gestempelt, elemente: a.alle(c), a };
  });
  const mit = (k: Knopf[], anfang: string) => k.filter((x) => x.text.startsWith(anfang));

  it('A88: leitungsKnoepfe – nur freigeschaltete Durchmesser und ein deaktivierter Knopf „Dickere“ mit Grund', async () => {
    await mitAttrappe(async (a) => {
      const { leitungsKnoepfe } = await import('../src/ui/kontext');
      const { knopf } = await import('../src/ui/bausteine');
      const liste = (stufe: number, ohne: TypId | null) => leitungsKnoepfe(neu(stufe).s, ohne, (t) => knopf(t, () => {}))
        .map((e) => { const el = e as unknown as InstanceType<typeof a.El>; return { text: a.text(el), aus: el.attrs.disabled !== undefined }; });
      expect(liste(1, null)).toEqual([{ text: 'd25', aus: false }, { text: 'd32', aus: false }, { text: 'd40', aus: false }, { text: 'Dickereab Heizzentrale Stufe 2', aus: true }]);
      expect(liste(2, 'd40').map((k) => k.text)).toEqual(['d25', 'd32', 'd50', 'd63', 'Dickereab Heizzentrale Stufe 3']);
      expect(liste(3, null).map((k) => k.text)).toEqual(['d25', 'd32', 'd40', 'd50', 'd63', 'd75', 'd90', 'd110']);
    });
  });

  it('A88: Zeichenleiste – Durchmesser über den Kern, „Dickere“ mit kurzem Grund „ab Stufe X“, T-Stück-Werkzeug vor Stufe 4 deaktiviert mit langem Grund', async () => {
    // DESIGN.md 12.15: In der engen Zeichenleiste steht der kurze Grund „ab Stufe X“ (ohne „Heizzentrale“).
    // Die Leitungskarte und der direkte Aufruf von leitungsKnoepfe behalten den langen Grund (Tests oben/unten).
    await mitAttrappe(async (a, blatt) => {
      const { Steuerung } = await import('../src/steuerung');
      for (const [stufe, tstueckAus, texte] of [
        [1, true, ['25er', '32er', '40er', 'Dickereab Stufe 2']],
        [2, true, ['25er', '32er', '40er', '50er', '63er', 'Dickereab Stufe 3']],
        [4, false, ['25er', '32er', '40er', '50er', '63er', '75er', '90er', '110er']],
      ] as Array<[number, boolean, string[]]>) {
        blatt.inhalt = new a.El('div');
        const st = Object.assign(Object.create(Steuerung.prototype), { spiel: neu(stufe).s, katalogUi: { schliessen: () => {} }, kontextUi: { schliessen: () => {} }, modusBlatt: null, vorsehen: false });
        (st as { stempeln: (t: TypId) => void }).stempeln('d25');
        const alle = a.alle(blatt.inhalt);
        const durchmesser = alle.find((e) => e.className === 'durchmesser')!;
        const dknoepfe = a.alle(durchmesser).filter((e) => e.tag === 'button');
        expect(dknoepfe.map((e) => a.text(e)), `Stufe ${stufe}`).toEqual(texte);
        // nur der Knopf „Dickere“ ist deaktiviert, alle Durchmesser-Knöpfe sind tippbar
        expect(dknoepfe.map((e) => e.attrs.disabled !== undefined), `Stufe ${stufe}`).toEqual(texte.map((t) => t.startsWith('Dickere')));
        const tstueck = alle.find((e) => e.tag === 'button' && a.text(e).startsWith('T-Stück mit Vorsehung'))!;
        expect(tstueck.attrs.disabled !== undefined, `Stufe ${stufe}`).toBe(tstueckAus);
        expect(a.text(tstueck).includes('ab Heizzentrale Stufe 4'), `Stufe ${stufe}`).toBe(tstueckAus);
      }
    });
  });

  it('A88: Leitungskarte – Tausch nur auf freigeschaltete, Anbohr-Satz erst ab Stufe 4', async () => {
    const eins = neu(1).s, vier = neu(4).s;
    const start40 = (s: Spiel) => s.stand.objekte.find((o) => o.typ === 'd40' && o.x === 10 && o.y === 12)!;
    const k1 = await karte(eins, start40(eins));
    expect(mit(k1.knoepfe, 'Tauschen:').map((k) => k.text.replace(/[\d.]+\s€$/, ''))).toEqual(['Tauschen: 25er-Leitung', 'Tauschen: 32er-Leitung']);
    expect(mit(k1.knoepfe, 'Dickere')).toEqual([expect.objectContaining({ text: 'Dickereab Heizzentrale Stufe 2', aus: true })]);
    expect(k1.text).not.toContain('angebohrt');
    const k4 = await karte(vier, start40(vier));
    expect(mit(k4.knoepfe, 'Tauschen:').length).toBe(7);
    expect(mit(k4.knoepfe, 'Dickere')).toEqual([]);
    expect(k4.text).toContain('angebohrt');
  });

  it('A88: Leitungskarte im offenen Abschnitt – Vorsehung setzen vor Stufe 4 deaktiviert, Wegnehmen immer möglich, Gestattung erst ab 2', async () => {
    const { s } = neu(1); offenerAbschnitt(s);
    const l = lege(s, 'd25', 3, 3, { geplant: true });
    const k1 = await karte(s, l);
    expect(mit(k1.knoepfe, 'T-Stück mit Vorsehung setzen')).toEqual([expect.objectContaining({ aus: true, text: 'T-Stück mit Vorsehung setzenab Heizzentrale Stufe 4' })]);
    expect(k1.text).not.toContain('Gestattung');
    l.vorsehung = true;
    expect(mit((await karte(s, l)).knoepfe, 'Vorsehung entfernen')).toEqual([expect.objectContaining({ aus: false })]);
    const zwei = neu(2).s; offenerAbschnitt(zwei);
    expect((await karte(zwei, lege(zwei, 'd25', 3, 3, { geplant: true }))).text).toContain('Gestattung');
    const vier = neu(4).s; offenerAbschnitt(vier);
    expect(mit((await karte(vier, lege(vier, 'd25', 3, 3, { geplant: true }))).knoepfe, 'T-Stück mit Vorsehung setzen')[0].aus).toBe(false);
  });

  it('A88: Hauskarte – ohne freie Stationswahl genau ein Knopf mit der passenden Station', async () => {
    // Festlegung Stationsknopf (ENTSCHEIDUNGEN „Designer-Treue A88 P2, Teil 2“):
    //   Zeile 1 = Text des <button> ohne das <small>-Kind: genau „Station einbauen“ bzw. „Größere Station einbauen“.
    //   Zeile 2 = Text des <small>-Kinds (knopf-Option `unter`): „<voller Katalogname> · <Preis>“, z. B. „Wandstation Typ 15 · 2.400 €“.
    //   Der Preis ist der zu zahlende Preis aus dem Katalog (bei „Größere Station“ abzüglich Rückkauf der alten Station).
    const haus = (s: Spiel) => s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station)!;
    const eurText = (n: number) => `${n.toLocaleString('de-DE')} €`;
    const kosten = (id: string) => STATIONEN.find((x) => x.id === id)!.kosten_eur;
    type El = { tag: string; kinder: unknown[] };
    const zeilen = (k: Awaited<ReturnType<typeof karte>>) => k.elemente
      .filter((e) => e.tag === 'button' && k.a.text(e).includes('Station einbauen'))
      .map((e) => {
        const kinder = (e as unknown as El).kinder;
        const istSmall = (n: unknown) => !!n && typeof n === 'object' && (n as El).tag === 'small';
        return { z1: kinder.filter((n) => !istSmall(n)).map(k.a.text).join(''), z2: kinder.filter(istSmall).map(k.a.text).join(''), aus: (e as unknown as { attrs: Record<string, string> }).attrs.disabled !== undefined };
      });

    const eins = neu(1).s, neuesHaus = haus(eins);
    expect(neuesHaus.interessent, 'Vorbedingung: kein Interessenten-Nachlass').toBeFalsy();
    expect(bedarfKw(neuesHaus)).toBe(10); // → kleinste passende Station: Typ 15
    const k1 = await karte(eins, neuesHaus);
    expect(zeilen(k1)).toEqual([{ z1: 'Station einbauen', z2: `Wandstation Typ 15 · ${eurText(kosten('st_15'))}`, aus: false }]);
    expect(k1.knoepfe.filter((x) => x.text.includes('Wandstation')).length).toBe(1); // genau ein Stationsknopf

    const zwei = neu(2).s;
    const k2 = await karte(zwei, haus(zwei));
    expect(k2.knoepfe.filter((x) => x.text.includes('Wandstation')).map((x) => x.text.split(' · ')[0])).toEqual(['Wandstation Typ 15', 'Wandstation Typ 25', 'Wandstation Typ 40']);
    expect(zeilen(k2)).toEqual([]); // mit freier Stationswahl kein Einzelknopf „Station einbauen“

    const h = startHaeuser(eins)[0];
    expect(h.station).toBe('st_15');
    h.aufgestockt = true; h.vollversorgung = true; eins.neuBerechnen();
    // Typ 25 kostet laut Katalog 3.600 €, die alte Typ 15 (2.400 €) wird zu rueckkauf_anteil zurückgekauft.
    const preis = Math.round(kosten('st_25') - kosten('st_15') * KONSTANTEN.rueckkauf_anteil);
    expect(zeilen(await karte(eins, h))).toEqual([{ z1: 'Größere Station einbauen', z2: `Wandstation Typ 25 · ${eurText(preis)}`, aus: false }]);
  });

  it('A88: Hauskarte – Puffer und Helfer vor Stufe 3 deaktiviert mit Grund, Bestand und laufender Auftrag zuerst', async () => {
    const eins = neu(1).s, h = startHaeuser(eins)[0];
    const k = await karte(eins, h);
    expect(mit(k.knoepfe, 'Puffer einbauen')).toEqual([expect.objectContaining({ text: 'Puffer einbauenab Heizzentrale Stufe 3', aus: true })]);
    expect(k.text).not.toContain('Ohne Puffer:');
    expect(k.knoepfe.filter((x) => x.text.includes('beauftragen'))).toEqual([expect.objectContaining({ text: 'Helfer beauftragenab Heizzentrale Stufe 3', aus: true })]);
    h.hauspuffer = true; h.upgrade_auftrag = { helfer: 'Sebastian', ende_ms: T0 + 60_000 };
    const bestand = await karte(eins, h);
    expect(bestand.text).toContain('Eingebaut.');
    expect(bestand.text).toContain('Sebastian arbeitet an');
    expect(mit(bestand.knoepfe, 'Puffer einbauen')).toEqual([]);
    const drei = neu(3).s, h3 = startHaeuser(drei)[0];
    const k3 = await karte(drei, h3);
    expect(mit(k3.knoepfe, 'Puffer einbauen')[0].aus).toBe(false);
    expect(mit(k3.knoepfe, 'Sebastian beauftragen')[0].aus).toBe(false);
  });

  it('A88 (Review P1): Hauskarte zeigt bei offener Anfrage den Chip „fragt an“ in Gold', async () => {
    const { s } = neu(1), h = startHaeuser(s)[0];
    h.anfrage = 'vollversorgung';
    const k = await karte(s, h);
    expect(k.elemente.filter((e) => e.className === 'chip gold').map((e) => k.a.text(e))).toEqual(['fragt an']);
  });

  it('A88: Großabnehmer – Knopf legt die passende freigeschaltete Leitung (statt fest 110er)', async () => {
    for (const [stufe, typ] of [[1, 'd40'], [2, 'd50']] as Array<[number, TypId]>) {
      const { s } = neu(stufe), bad = s.stand.objekte.find((o) => o.typ === 'bad')!;
      const k = await karte(s, bad);
      expect(k.knoepfe.some((x) => x.text.includes('110er'))).toBe(false);
      const legen = mit(k.knoepfe, `${KATALOG[typ].name} legen`);
      expect(legen.length, `Stufe ${stufe}`).toBe(1);
      legen[0].klick!();
      expect(k.gestempelt).toEqual([typ]);
    }
  });

  it('A88: Außenquelle ohne Anschluss – Knopf legt die passende freigeschaltete Leitung', async () => {
    const { s } = neu(2), q = lege(s, 'solar', 2, 2);
    s.neuBerechnen();
    const k = await karte(s, q);
    mit(k.knoepfe, 'Leitung legen')[0].klick!();
    expect(k.gestempelt).toEqual(['d32']); // Solarthermie Stufe 1 = 25 kW (katalog.ts) → 25er trägt 15, 32er trägt 25 kW
  });

  it('A88: Heizzentralen-Karte – Vorlauf, Helfer, PV-Dach und Baugebiet gesperrt mit Grund', async () => {
    const hzVon = (s: Spiel) => s.stand.objekte.find((o) => o.typ === 'hz')!;
    const stepper = (k: Knopf[]) => k.filter((x) => (x.label ?? '').startsWith('Vorlauftemperatur')).map((x) => x.aus);
    const eins = neu(1).s;
    const k1 = await karte(eins, hzVon(eins));
    expect(stepper(k1.knoepfe)).toEqual([true, true]);
    expect(k1.text).toContain('Vorlauf-Regler ab Heizzentrale Stufe 3');
    expect(k1.text).toContain('Rücklauf-Helfer ab Heizzentrale Stufe 3');
    expect(k1.text).not.toContain('Sebastian');
    startHaeuser(eins)[0].upgrade_auftrag = { helfer: 'Sebastian', ende_ms: T0 + 60_000 }; // laufender Auftrag aus altem Stand
    expect((await karte(eins, hzVon(eins))).text).toContain('Sebastian');
    delete startHaeuser(eins)[0].upgrade_auftrag;
    expect(mit(k1.knoepfe, 'PV aufs Dach')).toEqual([expect.objectContaining({ aus: true })]);
    expect(mit(k1.knoepfe, 'PV aufs Dach')[0].text).toContain('ab Heizzentrale Stufe 4');
    expect(mit(k1.knoepfe, 'Baugebiet erschließen')[0]).toMatchObject({ aus: true, text: 'Baugebiet erschließenab Heizzentrale Stufe 4' });
    const drei = neu(3).s;
    const k3 = await karte(drei, hzVon(drei));
    expect(stepper(k3.knoepfe)).toEqual([false, false]);
    expect(k3.text).toContain('Sebastian');
    const vier = neu(4).s;
    expect(mit((await karte(vier, hzVon(vier))).knoepfe, 'PV aufs Dach')[0].aus).toBe(false);
  });

  // Festlegung Büro/Förderanträge (DESIGN.md 12.15, ENTSCHEIDUNGEN „Designer-Treue A88 P2, Teil 2“), danach baut der Entwickler:
  //   - Je Förderquelle eine Zeile (Element mit class „zeile“) im Kasten mit Überschrift <h3>Förderanträge</h3>;
  //     erstes Kind der Zeile enthält den Katalognamen der Quelle.
  //   - Freie Quelle ohne Antrag: tippbarer <button> „Antrag stellen“ (nicht deaktiviert).
  //   - Gesperrte Quelle ohne Antrag: KEIN <button> in der Zeile, sondern ein Chip = Element, dessen class die Wörter
  //     „chip“ UND „sperr“ enthält (z. B. class="chip sperr"). Der Chip ist kein <button>, hat keinen Klick-Handler,
  //     enthält das Schloss-Symbol (symbol('schloss'), SVG-Quelle SYMBOLE.schloss) und als Text genau „ab Stufe X“.
  //   - Gestellter Antrag: Chip „in Prüfung“ bzw. „bewilligt“ wie bisher (ohne „sperr“), auch wenn die Quelle gesperrt ist.
  //   - Reihenfolge: freie Quellen zuerst, danach gesperrte nach Freischalt-Stufe aufsteigend (innerhalb einer Stufe beliebig).
  describe('A88: Büro – gesperrte Förderquellen als nicht tippbarer Chip „ab Stufe X“ (DESIGN.md 12.15)', () => {
    type El = { tag: string; className: string; attrs: Record<string, string>; kinder: unknown[]; on: Record<string, () => void> };
    const buero = (s: Spiel) => s.stand.objekte.find((o) => o.typ === 'buero') ?? lege(s, 'buero', 3, 3);
    // Stufen der Quellen von Hand aus der Tabelle Bauplan A88 Abschnitt 4 (siehe test_a88_tabelle_stufen)
    const QUELLEN_JE_STUFE: Record<number, TypId[]> = { 1: ['kessel'], 2: ['wpg', 'puffer', 'solar'], 3: ['pellet', 'gas', 'sonde'], 4: ['bhkw', 'ptk', 'pv'] };
    const name = (t: TypId) => KATALOG[t].name;
    const klassen = (e: El) => e.className.split(/\s+/);
    const zeilen = async (s: Spiel) => {
      const k = await karte(s, buero(s));
      const els = k.elemente as unknown as El[];
      const kasten = els.find((e) => e.kinder.some((c) => !!c && typeof c === 'object' && (c as El).tag === 'h3' && k.a.text(c) === 'Förderanträge'));
      expect(kasten, 'Kasten „Förderanträge“').toBeTruthy();
      return (k.a.alle(kasten) as unknown as El[]).filter((e) => klassen(e).includes('zeile')).map((z) => {
        const innen = k.a.alle(z) as unknown as El[];
        const sperr = innen.filter((e) => klassen(e).includes('chip') && klassen(e).includes('sperr'));
        const chips = innen.filter((e) => klassen(e).includes('chip') && !klassen(e).includes('sperr'));
        const knoepfe = innen.filter((e) => e.tag === 'button');
        return {
          name: k.a.text(z.kinder[0]),
          sperr: sperr.map((c) => ({ text: k.a.text(c).trim(), tag: c.tag, klick: Object.keys(c.on).length > 0, schloss: (k.a.alle(c) as unknown as El[]).some((x) => x.attrs.quelle === SYMBOLE.schloss) })),
          chips: chips.map((c) => k.a.text(c)),
          knoepfe: knoepfe.map((b) => ({ text: k.a.text(b), aus: b.attrs.disabled !== undefined, klick: b.on.click })),
        };
      });
    };
    type Zeile = Awaited<ReturnType<typeof zeilen>>[number];
    const sortiert = (namen: string[]) => [...namen].sort();
    /** Prüft eine Stufe: freie Quellen mit Knopf vorne, gesperrte mit Chip dahinter nach Stufe aufsteigend. */
    const pruefeStufe = (stufe: number, z: Zeile[]) => {
      expect(z.length, `Stufe ${stufe}: zehn Quellen`).toBe(10);
      let pos = 0;
      for (let st = 1; st <= 4; st++) {
        const gruppe = z.slice(pos, pos + QUELLEN_JE_STUFE[st].length);
        pos += QUELLEN_JE_STUFE[st].length;
        if (st <= stufe) continue; // freie Gruppen werden unten gemeinsam geprüft (frei untereinander in beliebiger Reihenfolge)
        expect(sortiert(gruppe.map((x) => x.name)), `Stufe ${stufe}: Gruppe ab Stufe ${st}`).toEqual(sortiert(QUELLEN_JE_STUFE[st].map(name)));
        for (const x of gruppe) {
          expect(x.knoepfe, `${x.name}: kein Knopf`).toEqual([]);
          expect(x.sperr, `${x.name}: Sperr-Chip`).toEqual([{ text: `ab Stufe ${st}`, tag: expect.not.stringMatching(/^button$/), klick: false, schloss: true }]);
        }
      }
      const freiNamen = [1, 2, 3, 4].filter((st) => st <= stufe).flatMap((st) => QUELLEN_JE_STUFE[st].map(name));
      const frei = z.slice(0, freiNamen.length);
      expect(sortiert(frei.map((x) => x.name)), `Stufe ${stufe}: freie Quellen zuerst`).toEqual(sortiert(freiNamen));
      for (const x of frei) {
        expect(x.sperr, `${x.name}: kein Sperr-Chip`).toEqual([]);
        expect(x.knoepfe.map((b) => ({ text: b.text, aus: b.aus })), `${x.name}: Antrag stellen`).toEqual([{ text: 'Antrag stellen', aus: false }]);
      }
    };

    it('A88: Büro Stufe 1 – nur Holzkessel mit „Antrag stellen“, neun Chips „ab Stufe 2/3/4“ mit Schloss, frei zuerst', async () => {
      pruefeStufe(1, await zeilen(neu(1).s));
    });
    it('A88: Büro Stufe 2 – vier freie Quellen mit Knopf, danach Chips „ab Stufe 3“ und „ab Stufe 4“', async () => {
      pruefeStufe(2, await zeilen(neu(2).s));
    });
    it('A88: Büro Stufe 4 – alle zehn Quellen mit tippbarem „Antrag stellen“, kein Chip', async () => {
      const z = await zeilen(neu(4).s);
      pruefeStufe(4, z);
      expect(z.every((x) => x.sperr.length === 0)).toBe(true);
    });
    it('A88: Büro – „Antrag stellen“ einer freien Quelle stellt wirklich den Antrag', async () => {
      const s = neu(1).s;
      const kessel = (await zeilen(s)).find((x) => x.name === name('kessel'))!;
      kessel.knoepfe[0].klick!();
      expect(s.stand.antraege.kessel?.stand).toBe('wartet');
      const danach = (await zeilen(s)).find((x) => x.name === name('kessel'))!;
      expect(danach.knoepfe).toEqual([]);
      expect(danach.chips).toEqual(['in Prüfung']);
    });
    it('A88: Büro – ein gestellter Antrag einer gesperrten Quelle bleibt sichtbar (Chip „in Prüfung“, kein Sperr-Chip)', async () => {
      const s = neu(1).s;
      s.stand.antraege.pellet = { stand: 'wartet', bewilligt_ms: T0 + 1000 };
      const z = await zeilen(s);
      expect(z.length).toBe(10);
      const pellet = z.find((x) => x.name === name('pellet'))!;
      expect(pellet.chips).toEqual(['in Prüfung']);
      expect(pellet.sperr).toEqual([]);
      expect(pellet.knoepfe).toEqual([]);
      expect(z.filter((x) => x.sperr.length > 0).map((x) => x.name).length).toBe(8);
      expect(z.filter((x) => x.knoepfe.length > 0).map((x) => x.name)).toEqual([name('kessel')]);
      expect(z[0].name).toBe(name('kessel'));
    });
  });
});
