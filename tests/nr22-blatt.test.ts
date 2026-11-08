import { afterEach, describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KONSTANTEN, istLeitung, passendeStation, type TypId } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import type { Objekt } from '../src/core/typen';
import type { Engstelle } from '../src/core/engstelle';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';
import { gesperrtMitHinweis } from './hilfen/gesperrt';
import { abschnittOeffnen, objektBei, vorstellen, type Uhr } from './hilfen/nr18';

// Bauplan docs/bauplaene/NR20-22.md, P7 (Leitungsblatt, E5, E6) und DESIGN 13.17.3 „Leitungsblatt beim Antippen“ und
// „Zustände des Blatts“. Echte Steuerung mit echtem Blatt (tests/hilfen/echte-steuerung.ts), echter Kern.
//
// Lage, von Hand aus dem Startdorf (neuerSpielstand) hergeleitet: Heizzentrale 2×2 ab (11|10). Eine 25er läuft von (11|9)
// nach Westen bis (3|9) und dann nach Norden bis (3|7) – 11 Felder. Einziger Kunde ist das Reihenhaus (4|7) mit 16 kW
// (ohne Puffer); es hängt am Leitungsende (3|7). Alle 11 Felder tragen 16 kW, die 25er schafft 15 kW (Katalog, 20 K
// Spreizung) → ein Stück mit 11 Feldern. Die 32er schafft 25 kW ≥ 16 kW → empfohlen 32er.
// Preis je Feld (NR18 E1): 32er 560 € − 50 % der 25er (400 €) = 360 €; kein Fluss auf diesen Feldern.
// → 11 Felder 3.960 €, 10 Felder 3.600 €, 9 Felder 3.240 €, 4 Felder 1.440 €, 1 Feld 360 €.
const T0 = 1_000_000_000_000;
const N = KONSTANTEN.feldanzahl;
const WEG: ReadonlyArray<[number, number]> = [[11, 9], [10, 9], [9, 9], [8, 9], [7, 9], [6, 9], [5, 9], [4, 9], [3, 9], [3, 8], [3, 7]];
const KUNDE: [number, number] = [4, 7];
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const SATZ = 'Hier sollen 16 kW durch, die 25er schafft 15 kW. Häuser dahinter bleiben kalt.';
const B1_HINWEIS = 'Erst mit Philipp einen Bauabschnitt planen: Bauen → Leitungen.';

function leeresDorf(): { s: Spiel; z: Uhr } {
  const z = { t: T0 };
  const st = neuerSpielstand(T0);
  st.objekte = st.objekte.filter((o) => !istLeitung(o.typ));
  for (const o of st.objekte) if (o.station) { delete o.station; o.ohne_station = true; }
  const s = new Spiel(st, () => z.t);
  if (!s.stand.quelle_gewaehlt) s.ersteQuelleWaehlen('kessel');
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.length = 0;
  return { s, z };
}
const leitung = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => istLeitung(o.typ))!;
const wegLeitungen = (s: Spiel): Objekt[] => WEG.map(([x, y]) => leitung(s, x, y));
const ersatzTypen = (s: Spiel): Array<TypId | undefined> => wegLeitungen(s).map((o) => o.ersatz?.typ);
/** Weg gebaut, Kunde mit Station; der Stamm ist überlastet. Ohne offenen Abschnitt. */
function gebaut(): { s: Spiel; z: Uhr } {
  const d = leeresDorf();
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  for (const [x, y] of WEG) expect(d.s.platzieren('d25', x, y).ok, `platzieren (${x}|${y})`).toBe(true);
  const h = objektBei(d.s, KUNDE[0], KUNDE[1], (o) => !istLeitung(o.typ))!;
  expect(bedarfKw(h)).toBe(16);
  expect(d.s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id).ok).toBe(true);
  expect(d.s.abschnittAbschliessen().ok).toBe(true);
  expect(d.s.materialBestellen().ok).toBe(true);
  vorstellen(d.s, d.z, KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
  expect(d.s.stand.abschnitt).toBeUndefined();
  // Testaufbau: genau das erwartete Stück
  expect(d.s.ueberlastStuecke().map((e) => ({ n: e.felder.length, typ: e.typ, last: e.last_kw, kap: e.kapazitaet_kw, empf: e.empfohlen })))
    .toEqual([{ n: 11, typ: 'd25', last: 16, kap: 15, empf: 'd32' }]);
  d.s.ereignisse.length = 0;
  return d;
}
function gebautOffen(): { s: Spiel; z: Uhr } {
  const d = gebaut();
  expect(abschnittOeffnen(d.s, d.z)).toBe(true);
  return d;
}

afterEach(() => { vi.restoreAllMocks(); });

// ───────────── Suchhilfen ─────────────
const knoepfe = (u: EchteUmgebung): El[] => u.knoepfe().filter((k) => k.isConnected);
const mit = (u: EchteUmgebung, anfang: string): El[] => knoepfe(u).filter((k) => norm(k.textContent).startsWith(anfang));
const zeile2 = (k: El): string => norm(k.querySelector('small')?.textContent ?? '');
const blatt = (u: EchteUmgebung): El => u.dom.html.querySelectorAll('.blatt').filter((b) => b.isConnected)[0];
const blattText = (u: EchteUmgebung): string => norm(blatt(u).textContent);
/** Der Kasten „Überlastet“ im offenen Blatt (h3-Titel) */
const ueberlastKasten = (u: EchteUmgebung): El | undefined =>
  blatt(u).querySelectorAll('.kasten').find((k) => norm(k.querySelector('h3')?.textContent ?? '') === 'Überlastet');
/** Kasten in Teilen: Kopf (h3), Titelzeile, Satz – je Kind-Element ein Text */
const kastenTeile = (u: EchteUmgebung): string[] => (ueberlastKasten(u)?.children ?? []).map((c) => norm(c.textContent));
const oeffne = (u: EchteUmgebung, s: Spiel, x: number, y: number): void => { u.st.kontext(leitung(s, x, y).id); };

describe('NR22 P7 Leitungsblatt: Kasten „Überlastet“ und Hauptaktion', () => {
  it('test_nr22_blatt_titel: Kasten oben mit „Hier auf 32er vergrößern“ und Satz aus der Engstelle, Knopf direkt darunter', async () => {
    const { s, z } = gebautOffen();
    await echteSteuerung(s, (u) => {
      oeffne(u, s, 8, 9);
      const k = ueberlastKasten(u);
      expect(k, 'Kasten „Überlastet“').toBeDefined();
      // 11 Felder · 3.960 € sind 19 Zeichen > 18 → Zeile 2 nur der Preis, der Satz nennt die Länge (DESIGN 13.17.3)
      expect(kastenTeile(u)).toEqual(['Überlastet', 'Hier auf 32er vergrößern', `${SATZ} Das Stück ist 11 Felder lang.`]);
      expect(blattText(u)).not.toContain('Durch diese Stelle soll mehr Wärme');
      // Kasten steht vor dem bestehenden Inhalt („Hauptleitung: …“)
      expect(blattText(u).indexOf('Überlastet')).toBeLessThan(blattText(u).indexOf('Hauptleitung:'));
      const haupt = mit(u, 'Auf 32er vergrößern');
      expect(haupt).toHaveLength(1);
      expect(zeile2(haupt[0])).toBe('3.960 €');
      expect(haupt[0].classList.contains('geld')).toBe(true);
      expect(gesperrtMitHinweis(haupt[0])).toBe(false);
      // direkt unter dem Kasten: die Knopfreihe ist das nächste Element nach dem Kasten
      const geschwister = k!.parentElement!.children;
      expect(geschwister[geschwister.indexOf(k!) + 1].querySelectorAll('button').includes(haupt[0])).toBe(true);
      // „Ersetzen: …“ ohne die empfohlene 32er (Stufe 1: frei sind 25er, 32er, 40er)
      expect(mit(u, 'Ersetzen:').map((e) => norm(e.textContent))).toEqual(['Ersetzen: 40er600 €']);
    }, { uhr: () => z.t });
  });

  it('test_nr22_blatt_titel: Tipp auf eine andere Leitung des Stücks zeigt denselben Kasten', async () => {
    const { s, z } = gebautOffen();
    await echteSteuerung(s, (u) => {
      for (const [x, y] of [[11, 9], [3, 7]] as const) {
        oeffne(u, s, x, y);
        expect(kastenTeile(u), `(${x}|${y})`).toEqual(['Überlastet', 'Hier auf 32er vergrößern', `${SATZ} Das Stück ist 11 Felder lang.`]);
        expect(mit(u, 'Auf 32er vergrößern').map(zeile2), `(${x}|${y})`).toEqual(['3.960 €']);
      }
    }, { uhr: () => z.t });
  });

  it('test_nr22_blatt_vorlauf_unter_60: Satz nennt last_kw und kapazitaet_kw aus der Engstelle (mit Spreizungsfaktor)', async () => {
    const { s, z } = gebautOffen();
    s.stand.vorlauf_c = 55; // Rücklauf mindestens 40 °C → 15 K statt 20 K → Faktor 0,75: 25er 11,25 kW, angezeigt 11,3 kW
    s.neuBerechnen();
    expect(s.netz.spreizung_faktor).toBeCloseTo(0.75);
    await echteSteuerung(s, (u) => {
      oeffne(u, s, 8, 9);
      // 32er: 25 kW × 0,75 = 18,75 kW ≥ 16 kW → weiter 32er
      expect(kastenTeile(u)).toEqual(['Überlastet', 'Hier auf 32er vergrößern', 'Hier sollen 16 kW durch, die 25er schafft 11,3 kW. Häuser dahinter bleiben kalt. Das Stück ist 11 Felder lang.']);
    }, { uhr: () => z.t });
  });

  it('test_nr22_blatt_knopf_ersetzt_alle: Antippen plant alle 11 Felder, Zustand „Wird auf 32er vergrößert“, Zurücknehmen nimmt alles zurück', async () => {
    const { s, z } = gebautOffen();
    await echteSteuerung(s, (u) => {
      oeffne(u, s, 6, 9);
      mit(u, 'Auf 32er vergrößern')[0].click();
      expect(ersatzTypen(s)).toEqual(Array(11).fill('d32'));
      expect(s.ersatz_eur()).toBe(3960);
      expect(kastenTeile(u)).toEqual(['Überlastet', 'Wird auf 32er vergrößert', 'Der Tausch kommt mit dem Bauabschnitt. Bis dahin bleibt es hier zu eng.']);
      expect(mit(u, 'Auf 32er vergrößern')).toEqual([]);
      const zurueck = mit(u, 'Zurücknehmen');
      expect(zurueck).toHaveLength(1);
      expect(zurueck[0].classList.contains('geld')).toBe(false);
      zurueck[0].click();
      expect(ersatzTypen(s)).toEqual(Array(11).fill(undefined));
      expect(mit(u, 'Auf 32er vergrößern').map(zeile2)).toEqual(['3.960 €']);
    }, { uhr: () => z.t });
  });

  it('test_nr22_blatt_vergroessern_ohne_geld: Geld 0 → Knopf ohne Sperre, Antippen → „Wird auf 32er vergrößert“; Lauras Bestellung scheitert am Geld', async () => {
    const { s, z } = gebautOffen();
    s.stand.geld_eur = 0;
    await echteSteuerung(s, (u) => {
      oeffne(u, s, 8, 9);
      const k = mit(u, 'Auf 32er vergrößern');
      expect(gesperrtMitHinweis(k[0])).toBe(false);
      expect(zeile2(k[0])).toBe('3.960 €');
      k[0].click();
      expect(kastenTeile(u)[1]).toBe('Wird auf 32er vergrößert');
      expect(ersatzTypen(s)).toEqual(Array(11).fill('d32'));
    }, { uhr: () => z.t });
    expect(s.abschnittAbschliessen().ok).toBe(true);
    // 11 × 360 € Ersatz, nichts eingezeichnet
    expect(s.materialBestellen()).toEqual({ ok: false, hinweis: 'Es fehlen 3.960 €' });
    expect(ersatzTypen(s)).toEqual(Array(11).fill('d32'));
  });

  it('test_nr22_blatt_teilweise_geplant: Zeile 2 zählt nur offene Felder; Grenze 18 Zeichen; „1 Feld“', async () => {
    const faelle: Array<{ geplant: number; zeile: string; satzZusatz: string }> = [
      { geplant: 7, zeile: '4 Felder · 1.440 €', satzZusatz: '' },
      { geplant: 2, zeile: '9 Felder · 3.240 €', satzZusatz: '' },                                // genau 18 Zeichen
      { geplant: 1, zeile: '3.600 €', satzZusatz: ' Das Stück ist 10 Felder lang.' },            // 19 Zeichen → nur Preis
      { geplant: 10, zeile: '1 Feld · 360 €', satzZusatz: '' },
    ];
    for (const f of faelle) {
      const { s, z } = gebautOffen();
      // die letzten Felder schon auf 32er geplant (Ersatz ≥ empfohlen zählt nicht mehr, E6)
      for (const o of wegLeitungen(s).slice(11 - f.geplant)) expect(s.ersatzPlanen(o.id, 'd32').ok).toBe(true);
      await echteSteuerung(s, (u) => {
        oeffne(u, s, 11, 9);
        expect(kastenTeile(u), `${f.geplant} geplant`).toEqual(['Überlastet', 'Hier auf 32er vergrößern', `${SATZ}${f.satzZusatz}`]);
        const k = mit(u, 'Auf 32er vergrößern');
        expect(k.map(zeile2), `${f.geplant} geplant`).toEqual([f.zeile]);
        k[0].click();
        expect(ersatzTypen(s), `${f.geplant} geplant`).toEqual(Array(11).fill('d32'));
      }, { uhr: () => z.t });
    }
  });
});

describe('NR22 P7 Leitungsblatt: Zusammenspiel', () => {
  it('test_nr22_blatt_planungsfehler_zuerst: Feld mit Planungsfehler und Überlast → „Planungsfehler“ zuerst, darunter „Überlastet“, beide oben', async () => {
    const { s, z } = gebautOffen();
    const key = 9 * N + 8;
    await echteSteuerung(s, (u) => {
      // Reduzierung auf (8|9) nachgestellt: die Lage selbst ist für den Kern kein Planungsfehler, geprüft wird nur die Reihenfolge im Blatt
      s.netz.reduzierung.add(key);
      oeffne(u, s, 8, 9);
      const titel = blatt(u).querySelectorAll('.kasten').map((k) => norm(k.querySelector('h3')?.textContent ?? ''));
      expect(titel).toEqual(['Planungsfehler', 'Überlastet']);
      expect(blattText(u).indexOf('Überlastet')).toBeLessThan(blattText(u).indexOf('Hauptleitung:'));
    }, { uhr: () => z.t });
  });

  it('test_nr22_blatt_kern_lehnt_ab: lehnt der Kern trotz freiem Knopf ab, erscheint sein Hinweis', async () => {
    const { s, z } = gebautOffen();
    vi.spyOn(s, 'stueckVergroessern').mockReturnValue({ ok: false, hinweis: 'Kern sagt nein' });
    await echteSteuerung(s, (u) => {
      oeffne(u, s, 8, 9);
      mit(u, 'Auf 32er vergrößern')[0].click();
      expect(norm(u.meldung())).toBe('Kern sagt nein');
    }, { uhr: () => z.t });
  });
});

describe('NR22 P7 Leitungsblatt: Zustände (DESIGN 13.17.3)', () => {
  it('test_nr22_blatt_kein_abschnitt: Knopf gesperrt mit „kein Bauabschnitt“, Antippen zeigt den Hinweis, plant nichts', async () => {
    const { s, z } = gebaut();
    await echteSteuerung(s, (u) => {
      oeffne(u, s, 8, 9);
      // Zeile 2 trägt hier den Sperrgrund; die Länge steht wie im offenen Abschnitt im Satz (11 Felder · 3.960 € > 18 Zeichen)
      expect(kastenTeile(u)).toEqual(['Überlastet', 'Hier auf 32er vergrößern', `${SATZ} Das Stück ist 11 Felder lang.`]);
      const k = mit(u, 'Auf 32er vergrößern');
      expect(k).toHaveLength(1);
      expect(gesperrtMitHinweis(k[0])).toBe(true);
      expect(zeile2(k[0])).toBe('kein Bauabschnitt');
      k[0].click();
      expect(norm(u.meldung())).toBe(B1_HINWEIS);
      expect(ersatzTypen(s)).toEqual(Array(11).fill(undefined));
    }, { uhr: () => z.t });
  });

  it('test_nr22_blatt_groesse_gesperrt: empfohlene Größe noch nicht frei → gesperrt, Zeile 2 „ab Stufe 2“', async () => {
    const { s, z } = gebautOffen();
    const echt = s.ueberlastStuecke();
    // Lage mit 50er-Empfehlung auf Stufe 1 (die 50er ist ab Stufe 2 frei); nur die Empfehlung wird ersetzt
    vi.spyOn(s, 'ueberlastStuecke').mockReturnValue(echt.map((e): Engstelle => ({ ...e, empfohlen: 'd50' })));
    await echteSteuerung(s, (u) => {
      oeffne(u, s, 8, 9);
      expect(kastenTeile(u)[1]).toBe('Hier auf 50er vergrößern');
      const k = mit(u, 'Auf 50er vergrößern');
      expect(k).toHaveLength(1);
      expect(gesperrtMitHinweis(k[0])).toBe(true);
      expect(zeile2(k[0])).toBe('ab Stufe 2');
      k[0].click();
      expect(norm(u.meldung())).toBe('50er-Leitung gibt es ab Heizzentrale Stufe 2. Baue die Heizzentrale aus.');
      expect(ersatzTypen(s)).toEqual(Array(11).fill(undefined));
    }, { uhr: () => z.t });
  });

  it('test_nr22_blatt_keine_groesse: empfohlen null → „Zu viel für eine Leitung“, keine Hauptaktion', async () => {
    const { s, z } = gebautOffen();
    const echt = s.ueberlastStuecke();
    vi.spyOn(s, 'ueberlastStuecke').mockReturnValue(echt.map((e): Engstelle => ({ ...e, empfohlen: null })));
    await echteSteuerung(s, (u) => {
      oeffne(u, s, 8, 9);
      expect(kastenTeile(u)).toEqual(['Überlastet', 'Zu viel für eine Leitung', 'Selbst die dickste Leitung reicht hier nicht. Leg einen getrennten Abgang.']);
      expect(mit(u, 'Auf ')).toEqual([]);
      expect(mit(u, 'Zurücknehmen')).toEqual([]);
      // ohne Empfehlung fehlt in „Ersetzen“ keine Größe
      expect(mit(u, 'Ersetzen:').map((e) => norm(e.textContent))).toEqual(['Ersetzen: 32er360 €', 'Ersetzen: 40er600 €']);
    }, { uhr: () => z.t });
  });

  it('test_nr22_blatt_im_bau: geplant, bestellt und im Bau → „Wird gerade vergrößert“, keine Hauptaktion', async () => {
    const { s, z } = gebautOffen();
    expect(s.stueckVergroessern(WEG[0][1] * N + WEG[0][0], 'd32').ok).toBe(true);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    // Abgeschlossen, Bestellung offen: geplant, aber Zurücknehmen geht erst wieder im offenen Abschnitt
    await echteSteuerung(s, (u) => {
      oeffne(u, s, 8, 9);
      expect(kastenTeile(u)).toEqual(['Überlastet', 'Wird auf 32er vergrößert', 'Der Tausch kommt mit dem Bauabschnitt. Bis dahin bleibt es hier zu eng.']);
      expect(mit(u, 'Zurücknehmen')).toEqual([]);
      expect(mit(u, 'Auf 32er vergrößern')).toEqual([]);
    }, { uhr: () => z.t });
    expect(s.materialBestellen().ok).toBe(true);
    expect(s.stand.abschnitt?.phase).toBe('bau');
    await echteSteuerung(s, (u) => {
      oeffne(u, s, 8, 9);
      expect(kastenTeile(u)).toEqual(['Überlastet', 'Wird gerade vergrößert']);
      expect(mit(u, 'Auf ')).toEqual([]);
      expect(mit(u, 'Zurücknehmen')).toEqual([]);
    }, { uhr: () => z.t });
  });
});
