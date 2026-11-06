import { describe, expect, it } from 'vitest';
import { KATALOG, KONSTANTEN, passendeStation } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { Spiel, WANDSTATION_TUTORIAL, type Ereignis } from '../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_SPUR, neuesSpielMitTutorial, neuerSpielstand } from '../src/core/start';
import type { Objekt, Spielstand } from '../src/core/typen';
import { vorstellen, type Uhr } from './hilfen/nr18';

// Bauplan docs/bauplaene/NR13-tutorial.md, Fassung 3.1, „Bauplan P2 – Kern-Anbindung“.
// Werte von Hand aus dem Katalog: Startgeld 30.000 €, Planung 2.000 €, 25er-Leitung 400 € je Feld (6 Felder = 2.400 €),
// Puffer-Station HP 800 für ein EFH 5.570 € (NR19-Abnahme), EFH 15.000 kWh/a → 10 kW ohne Puffer (1.500 h), 7,5 kW mit (2.000 h),
// 25er trägt 15 kW, 32er 25 kW, Hackschnitzelkessel Stufe 1 = 60 kW.
const T0 = 1_000_000;

const istHaus = (o: Objekt): boolean => KATALOG[o.typ].kategorie === 'haus';
const hausBei = (st: Spielstand, [x, y]: readonly [number, number]): Objekt => {
  const h = st.objekte.find((o) => o.x === x && o.y === y && istHaus(o));
  if (!h) throw new Error(`kein Haus bei (${x}|${y})`);
  return h;
};
const sprecherTexte = (s: Spiel): string[] =>
  s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'sprecher' }> => e.art === 'sprecher').map((e) => e.text);

function tutorialSpiel(): { s: Spiel; z: Uhr; h1: Objekt; h2: Objekt } {
  const z = { t: T0 };
  const s = new Spiel(neuesSpielMitTutorial(T0), () => z.t);
  s.namenSetzen('Anna', 'Heatville');
  const [h1, h2] = ERSTE_HAEUSER.map((k) => hausBei(s.stand, k));
  return { s, z, h1, h2 };
}
/** Planung im Tutorial: 10 s Uhrzeit, ohne Spieltempo-Faktor. */
function tutorialOffen(): ReturnType<typeof tutorialSpiel> {
  const t = tutorialSpiel();
  expect(t.s.abschnittPlanen().ok).toBe(true);
  t.z.t += 10_000; t.s.bis(t.z.t);
  expect(t.s.stand.abschnitt?.phase).toBe('offen');
  return t;
}
function spurZeichnen(s: Spiel, typ = s.tutorialWerte().leitung): void {
  for (const [x, y] of TUTORIAL_SPUR) expect(s.platzieren(typ, x, y).ok).toBe(true);
}
/** Mit gesetztem Katalogwert ausführen und ihn danach sicher zurücksetzen. */
function mitKatalog<T>(typ: 'd25' | 'efh', feld: 'kapazitaet_kw' | 'verbrauch_kwh_a', wert: number, f: () => T): T {
  const d = KATALOG[typ] as unknown as Record<string, unknown>;
  const alt = d[feld];
  d[feld] = wert;
  try { return f(); } finally { d[feld] = alt; }
}

describe('NR13 P2 Kern-Anbindung', () => {
  it('test_nr13_tutorial_zeiten: Planung 10 s, Bau 20 s, Laura „1 Tag“; nach dem Ende wieder 75 s / 900 s', () => {
    const { s, z } = tutorialSpiel();
    expect(s.abschnittPlanen().ok).toBe(true);
    s.bis(T0 + 9_900);
    expect(s.stand.abschnitt?.phase).toBe('planung');
    s.bis(T0 + 10_000);
    expect(s.stand.abschnitt?.phase).toBe('offen');
    z.t = T0 + 10_000;
    spurZeichnen(s, 'd25');
    expect(s.abschnittAbschliessen().ok).toBe(true);
    s.ereignisse.length = 0;
    expect(s.materialBestellen().ok).toBe(true);
    expect(sprecherTexte(s)).toEqual(['Hey Anna, dein Material ist bestellt. Lieferzeit: 1 Tag.']);
    s.bis(z.t + 19_900);
    expect(s.stand.abschnitt?.phase).toBe('bau');
    s.bis(z.t + 20_000);
    expect(s.stand.abschnitt).toBeUndefined();

    s.tutorialBeenden();
    z.t += 20_000;
    expect(s.abschnittPlanen().ok).toBe(true);
    s.bis(z.t + 74_900);
    expect(s.stand.abschnitt?.phase).toBe('planung');
    s.bis(z.t + 75_000);
    expect(s.stand.abschnitt?.phase).toBe('offen');
    z.t += 75_000;
    expect(s.platzieren('d25', 10, 15).ok).toBe(true);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    s.ereignisse.length = 0;
    expect(s.materialBestellen().ok).toBe(true);
    expect(sprecherTexte(s)).toEqual(['Hey Anna, dein Material ist bestellt. Lieferzeit: 46 Tage.']);
    s.bis(z.t + 899_000);
    expect(s.stand.abschnitt?.phase).toBe('bau');
    s.bis(z.t + 900_000);
    expect(s.stand.abschnitt).toBeUndefined();
  });

  it('test_nr13_liefertage: ohne Argument wie bisher 46 Tage, mit 20 s Dauer 1 Tag, nie unter 1', () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    expect(s.liefertage()).toBe(46);
    expect(s.liefertage(20_000)).toBe(1);
    expect(s.liefertage(0)).toBe(1);
  });

  it('test_nr13_wandstation_gesperrt: im Tutorial abgelehnt mit Hinweis, Puffer geht; danach und im alten Stand erlaubt', () => {
    const { s, h1 } = tutorialSpiel();
    const wand = passendeStation(bedarfKw({ ...h1, hauspuffer: false })).id;
    const geld = s.stand.geld_eur;
    expect(s.wandstationFrei()).toBe(false);
    expect(s.stationKaufen(h1.id, wand)).toEqual({ ok: false, hinweis: WANDSTATION_TUTORIAL });
    expect(s.stand.geld_eur).toBe(geld);
    expect(h1.station).toBeUndefined();
    expect(s.stationKaufen(h1.id, 'hp_800').ok).toBe(true);
    expect(h1.station).toBe('hp_800');

    s.tutorialBeenden();
    expect(s.wandstationFrei()).toBe(true);
    const dritte = s.stand.objekte.find((o) => istHaus(o) && o.ohne_station && o.id !== h1.id && !ERSTE_HAEUSER.some(([x, y]) => o.x === x && o.y === y))!;
    expect(s.stationKaufen(dritte.id, passendeStation(bedarfKw(dritte)).id).ok).toBe(true);

    const alt = new Spiel(neuerSpielstand(T0), () => T0);
    const ah = hausBei(alt.stand, ERSTE_HAEUSER[0]);
    expect(alt.stationKaufen(ah.id, wand).ok).toBe(true);
  });

  it('test_nr13_start_tipp_nicht_im_tutorial: nach dem Namen im Tutorial nicht fällig, nach Überspringen fällig', () => {
    const { s } = tutorialSpiel();
    expect(s.startTippFaellig()).toBe(false);
    expect(s.startTippNehmen()).toBeNull();
    s.tutorialUeberspringen();
    expect(s.stand.tutorial).toBeUndefined();
    expect(s.tutorialAktiv()).toBe(false);
    expect(s.startTippFaellig()).toBe(true);
  });

  it('test_nr13_werte: Startdorf 60 kW, 15.000 kWh, 10 / 7,5 kW, 25er; Katalogwerte ändern die Werte', () => {
    const { s, h1 } = tutorialSpiel();
    expect(s.tutorialWerte()).toEqual({ kessel_kw: 60, kwh: 15_000, kw_ohne: 10, kw_puffer: 7.5, leitung: 'd25', kap_kw: 15 });
    expect(s.tutorialWerte().kw_puffer).toBe(bedarfKw({ ...h1, hauspuffer: true }));
    mitKatalog('d25', 'kapazitaet_kw', 12, () => {
      const w = s.tutorialWerte();
      expect(w.leitung).toBe('d32');
      expect(w.kap_kw).toBe(KATALOG.d32.kapazitaet_kw);
      expect(w.kap_kw).toBe(25);
    });
    mitKatalog('efh', 'verbrauch_kwh_a', 15_000 * 1.2, () => {
      const w = s.tutorialWerte();
      expect(w.kwh).toBeCloseTo(18_000, 2);
      expect(w.kw_ohne).toBeCloseTo(12, 2);
      expect(w.kw_puffer).toBeCloseTo(9, 2);
      expect(w.leitung).toBe('d32'); // 2 × 9 kW = 18 kW > 15 kW
    });
    expect(s.tutorialWerte().leitung).toBe('d25');
    // Kessel Stufe 2 = 90 kW (Katalog): die Zahl im Text folgt dem Netz, nicht einer festen 60
    s.stand.innen[0].stufe = 2;
    s.aenderung();
    expect(s.tutorialWerte().kessel_kw).toBe(90);
  });

  it('test_nr13_leitung_traegt_ohne_warnung: Spur mit berechneter Leitung, keine Warnung, beide Häuser warm (auch mit 32er)', () => {
    for (const kap of [15, 12]) {
      mitKatalog('d25', 'kapazitaet_kw', kap, () => {
        const { s, z, h1, h2 } = tutorialOffen();
        const typ = s.tutorialWerte().leitung;
        expect(typ).toBe(kap === 15 ? 'd25' : 'd32');
        spurZeichnen(s, typ);
        expect(s.abschnittAbschliessen()).toEqual({ ok: true });
        expect(s.abschnittWarnungen()).toEqual([]);
        expect(s.stationKaufen(h1.id, 'hp_800').ok).toBe(true);
        expect(s.stationKaufen(h2.id, 'hp_800').ok).toBe(true);
        expect(s.materialBestellen().ok).toBe(true);
        vorstellen(s, z, 20);
        expect(s.stand.abschnitt).toBeUndefined();
        expect(s.netz.warm.has(h1.id) && s.netz.warm.has(h2.id)).toBe(true);
        expect(s.ereignisse.filter((e) => e.art === 'engstelle')).toEqual([]);
      });
    }
  });

  it('test_nr13_geld_reicht: Ablauf kostet 15.540 €, Rest 14.460 €; Fehlbetrag 0, bei 1.000 € von Hand gerechnet', () => {
    const { s, h1, h2 } = tutorialOffen();
    expect(s.tutorialGeldFehlt_eur()).toBe(0);
    spurZeichnen(s, 'd25');
    expect(s.tutorialGeldFehlt_eur()).toBe(0);
    const geld = s.stand.geld_eur;
    expect(geld).toBe(28_000);
    s.stand.geld_eur = 1_000;
    expect(s.tutorialGeldFehlt_eur()).toBe(2_400 + 2 * 5_570 - 1_000);
    s.stand.geld_eur = geld;
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.tutorialGeldFehlt_eur()).toBe(0);
    expect(s.stationKaufen(h1.id, 'hp_800').ok).toBe(true);
    expect(s.stand.geld_eur).toBe(28_000 - 5_570);
    s.stand.geld_eur = 1_000;
    expect(s.tutorialGeldFehlt_eur()).toBe(2_400 + 5_570 - 1_000);
    s.stand.geld_eur = 28_000 - 5_570;
    expect(s.stationKaufen(h2.id, 'hp_800').ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    expect(s.tutorialGeldFehlt_eur()).toBe(0); // Phase bau
    expect(s.stand.geld_eur).toBe(14_460);
    expect(30_000 - s.stand.geld_eur).toBeLessThanOrEqual(30_000 - 5_000);
  });

  it('test_nr13_geld_fehlt_nur_im_tutorial_und_passenden_phasen: ohne Tutorial, ohne Abschnitt, in Planung 0', () => {
    const { s } = tutorialSpiel();
    s.stand.geld_eur = 0;
    expect(s.tutorialGeldFehlt_eur()).toBe(0); // kein Abschnitt
    s.stand.geld_eur = 30_000;
    expect(s.abschnittPlanen().ok).toBe(true);
    s.stand.geld_eur = 0;
    expect(s.tutorialGeldFehlt_eur()).toBe(0); // Planung
    const alt = new Spiel(neuerSpielstand(T0), () => T0);
    expect(alt.abschnittPlanen().ok).toBe(true);
    vorstellen(alt, { t: T0 }, KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(alt.stand.abschnitt?.phase).toBe('offen');
    alt.stand.geld_eur = 0;
    expect(alt.tutorialGeldFehlt_eur()).toBe(0);
  });

  it('test_nr13_geld_fehlt_mit_nachlass: Interessent zahlt den ermäßigten Stationspreis – genau den, den stationKaufen abbucht', () => {
    const { s, h1, h2 } = tutorialOffen();
    spurZeichnen(s, 'd25');
    h1.interessent = true;
    const preis1 = s.stationspreis_eur(h1, { kosten_eur: 5_570 });
    expect(preis1).toBe(Math.round(5_570 * (1 - KONSTANTEN.interessent_nachlass)));
    expect(preis1).toBeLessThan(5_570);
    s.stand.geld_eur = 0;
    expect(s.tutorialGeldFehlt_eur()).toBe(2_400 + preis1 + 5_570);
    s.stand.geld_eur = 28_000;
    expect(s.stationKaufen(h1.id, 'hp_800').ok).toBe(true);
    expect(s.stand.geld_eur).toBe(28_000 - preis1);
    expect(h2.station).toBeUndefined();
  });

  it('test_nr13_geld_bleibt_bis_material: zwischen Abschließen und Material bucht nichts ab, auch über den Monatswechsel', () => {
    const { s, z, h1, h2 } = tutorialOffen();
    spurZeichnen(s, 'd25');
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.stand.abschnitt?.phase).toBe('bestellen');
    const geld = s.stand.geld_eur;
    const monat = s.monat();
    vorstellen(s, z, monat.rest_ms / 1000 + 60);
    expect(s.monat().nr).toBe(monat.nr + 1);
    expect(s.stand.geld_eur).toBe(geld);
    expect(s.stationKaufen(h1.id, 'hp_800').ok).toBe(true);
    expect(s.stationKaufen(h2.id, 'hp_800').ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    expect(s.stand.geld_eur).toBe(30_000 - 2_000 - 2_400 - 2 * 5_570);
  });

  it('test_nr13_kapitel_setzen: nur im Tutorial und nur ganze Zahlen 1–6', () => {
    const { s } = tutorialSpiel();
    s.tutorialKapitelSetzen(3);
    expect(s.stand.tutorial).toEqual({ kapitel: 3 });
    for (const k of [0, 7, 2.5, Number.NaN, Number.POSITIVE_INFINITY, -1]) s.tutorialKapitelSetzen(k);
    expect(s.stand.tutorial).toEqual({ kapitel: 3 });
    s.tutorialKapitelSetzen(6);
    expect(s.stand.tutorial).toEqual({ kapitel: 6 });
    s.tutorialKapitelSetzen(1);
    expect(s.stand.tutorial).toEqual({ kapitel: 1 });
    s.tutorialBeenden();
    expect(s.stand.tutorial).toBeUndefined();
    s.tutorialKapitelSetzen(2);
    expect(s.stand.tutorial).toBeUndefined();
    expect(s.tutorialAktiv()).toBe(false);
  });

  it('test_nr13_ueberspringen_mitten_im_bau: laufender Abschnitt behält seine kurze Restzeit', () => {
    const { s, z } = tutorialOffen();
    spurZeichnen(s, 'd25');
    expect(s.abschnittAbschliessen().ok).toBe(true);
    for (const h of ERSTE_HAEUSER) expect(s.stationKaufen(hausBei(s.stand, h).id, 'hp_800').ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    s.tutorialUeberspringen();
    s.bis(z.t + 20_000);
    expect(s.stand.abschnitt).toBeUndefined();
  });

  it('test_nr13_merke_laden: kaputte Merke oder verschobenes Haus 1 → Feld weg, nicht defekt; gültige Merke bleibt', () => {
    const kaputt: unknown[] = ['x', { kapitel: 9 }, { kapitel: 1.5 }, [], null, 3, { kapitel: '2' }, { kapitel: 0 }, { kapitel: 7 }, {}];
    for (const merke of kaputt) {
      const st = { ...neuesSpielMitTutorial(T0), tutorial: merke };
      const { stand, befund } = ladenMitBefund(serialisieren(st as unknown as Spielstand), T0);
      expect(befund, JSON.stringify(merke)).toBe('ok');
      expect('tutorial' in stand, JSON.stringify(merke)).toBe(false);
    }
    for (const nr of [0, 1]) {
      const st = neuesSpielMitTutorial(T0);
      const h = hausBei(st, ERSTE_HAEUSER[nr]);
      h.x = 0; h.y = 0;
      const { stand, befund } = ladenMitBefund(serialisieren(st), T0);
      expect(befund).not.toBe('defekt');
      expect(stand.tutorial).toBeUndefined();
    }
    const ersetzt = neuesSpielMitTutorial(T0);
    hausBei(ersetzt, ERSTE_HAEUSER[0]).typ = 'buero';
    expect(ladenMitBefund(serialisieren(ersetzt), T0).stand.tutorial).toBeUndefined();
    for (const k of [1, 6]) {
      const st = neuesSpielMitTutorial(T0);
      st.tutorial = { kapitel: k };
      const { stand, befund } = ladenMitBefund(serialisieren(st), T0);
      expect(befund).toBe('ok');
      expect(stand.tutorial).toEqual({ kapitel: k });
      expect(ladenMitBefund(serialisieren(stand), T0).stand.tutorial).toEqual({ kapitel: k });
    }
    const alt = neuerSpielstand(T0);
    expect('tutorial' in ladenMitBefund(serialisieren(alt), T0).stand).toBe(false);
  });

  it('test_nr13_speicherschluessel_unveraendert: Schlüssel und Version bleiben', async () => {
    const m = await import('../src/core/speichern');
    expect(m.SPEICHER_SCHLUESSEL).toBe('waermedorf-spielstand-v1');
    expect(m.SPEICHER_VERSION).toBe(3);
  });
});
