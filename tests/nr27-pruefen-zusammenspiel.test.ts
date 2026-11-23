import { describe, expect, it } from 'vitest';

// NR27 Tester-Modus „pruefen“ (2026-11-23), Schwerpunkte 2 und 3: Zusammenspiel der Querung mit Speichern/Laden mitten im
// Bau, Rohrtausch (Querung kostet erneut), Zurück/Radierer auf Bahnfeldern, Express/„Sofort fertig“ gesperrt; Leitungen und
// Objekte auf Bahnfeldern, Brücke, nur Querungsstelle x = 10. Erwartungen aus Lastenheft NR27 (c)(e)(f)(g), Bauplan P3 und
// Prüf-Schwerpunkt Abschnitt 7. Alle Rechenwerte aus den Konstanten (keine erfundenen Spielwerte).
//
// Welche Fehler machen diese Tests rot?
// - Nach dem Laden eines Stands mit fertiger Querung (offline fertig geworden) fehlt das Viertel oder es entsteht doppelt.
// - Rohrtausch unter der Bahn ohne Aufpreis/Zuschlag oder mit Express beschleunigbar; Tausch legt das Viertel neu an.
// - Zurück/Radierer lässt den Querungspreis oder -zuschlag stehen; Verwerfen lässt mit_querung zurück.
// - Irgendein Leitungstyp kommt auf ein Bahnfeld außerhalb x = 10, auf die Brücke oder vor Stufe 6; ein Nicht-Leitungsobjekt
//   (auch 2×2) steht auf einem Bahnfeld; vor der Querung steht irgendetwas hinter der Bahn.

import { KATALOG, KONSTANTEN, LEITUNGEN, type TypId } from '../src/core/katalog';
import { KARTE_OBEN_Y } from '../src/core/feld';
import { nordText } from '../src/core/nord-texte';
import { BAHN_ZEILEN_Y, BRUECKE_X, QUERUNG_X } from '../src/core/nordviertel';
import { Spiel } from '../src/core/spiel';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { neuerSpielstand } from '../src/core/start';

const T0 = 1_000_000_000_000;
const N = KONSTANTEN.feldanzahl;
const QUERUNG_MS = (KONSTANTEN.abschnitt_bau_s + KONSTANTEN.querung_bau_s) * KONSTANTEN.bauzeit_faktor * 1000;
const PLANUNG_MS = KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor * 1000;
type Uhr = { t: number };
const EXPRESS = nordText('EXPRESS') as string;

function spiel(stufe: number, uhr: Uhr, offen = true): Spiel {
  const s = neuerSpielstand(T0);
  s.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  s.geld_eur = 2_000_000; s.taler = 100_000;
  if (offen) s.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(s, () => uhr.t);
  sp.ereignisse.splice(0);
  return sp;
}
function querungBestellen(sp: Spiel, typ: TypId = 'd90'): void {
  for (const y of [-1, -2, -3]) expect(sp.platzieren(typ, 10, y), `(10|${y})`).toEqual({ ok: true });
  expect(sp.abschnittAbschliessen().ok).toBe(true);
  expect(sp.materialBestellen()).toEqual({ ok: true });
}
function neuerAbschnitt(sp: Spiel, uhr: Uhr): void {
  expect(sp.abschnittPlanen().ok).toBe(true);
  uhr.t += PLANUNG_MS + 1; sp.bis(uhr.t);
  expect(sp.stand.abschnitt!.phase).toBe('offen');
}
const nordHaeuser = (sp: Spiel) => sp.stand.objekte.filter((o) => o.y <= -4 && KATALOG[o.typ].kategorie === 'haus');

describe('NR27 pruefen: Querung × Speichern/Laden', () => {
  it('test_nr27_f_laden_nach_offline_bauende: Querung wird offline fertig → beim Laden genau einmal 14 Häuser', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    querungBestellen(sp);
    const ende = sp.stand.abschnitt!.bau!.ende_ms;
    const text = serialisieren(sp.stand);
    const spaeter = ende + 3_600_000;
    const { befund, stand } = ladenMitBefund(text, spaeter);
    expect(befund).toBe('ok');
    const neu = new Spiel(stand, () => spaeter);
    neu.bis(spaeter);
    expect(neu.stand.abschnitt).toBeUndefined();
    expect(neu.stand.nordviertel).toBe(true);
    expect(nordHaeuser(neu)).toHaveLength(14);
    // erneut speichern und laden: nichts doppelt
    const zweit = new Spiel(ladenMitBefund(serialisieren(neu.stand), spaeter + 1).stand, () => spaeter + 1);
    zweit.bis(spaeter + 1);
    expect(nordHaeuser(zweit)).toHaveLength(14);
    expect(new Set(zweit.stand.objekte.map((o) => o.id)).size).toBe(zweit.stand.objekte.length);
  });

  it('test_nr27_e_laden_mitten_im_bau: hinter der Bahn bleibt gesperrt (Q5), Bauende unverändert, danach erschlossen', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    querungBestellen(sp);
    const bau = { ...sp.stand.abschnitt!.bau! };
    uhr.t = bau.start_ms + Math.floor(QUERUNG_MS / 2); sp.bis(uhr.t);
    const neu = new Spiel(ladenMitBefund(serialisieren(sp.stand), uhr.t).stand, () => uhr.t);
    expect(neu.stand.abschnitt!.bau).toEqual(bau);
    expect(neu.stand.abschnitt!.mit_querung).toBe(true);
    expect(neu.platzieren('baum', 3, -6)).toEqual({ ok: false, hinweis: nordText('Q5') });
    expect(neu.stand.nordviertel).toBeUndefined();
    uhr.t = bau.ende_ms; neu.bis(uhr.t);
    expect(neu.stand.nordviertel).toBe(true);
    expect(nordHaeuser(neu)).toHaveLength(14);
  });

  it('test_nr27_f_nur_eine_gleiszeile: halbe Querung (nur (10|−2)) erschließt nicht; zweite Hälfte später kostet und erschließt', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    for (const y of [-1, -2]) expect(sp.platzieren('d90', 10, y).ok).toBe(true);
    expect(sp.querung_eur()).toBe(KONSTANTEN.querung_eur_je_feld);
    sp.abschnittAbschliessen(); expect(sp.materialBestellen().ok).toBe(true);
    uhr.t = sp.stand.abschnitt!.bau!.ende_ms; sp.bis(uhr.t);
    expect(sp.stand.nordviertel).toBeUndefined();
    expect(nordHaeuser(sp)).toHaveLength(0);
    neuerAbschnitt(sp, uhr);
    expect(sp.platzieren('d90', 10, -3).ok).toBe(true);
    expect(sp.querung_eur()).toBe(KONSTANTEN.querung_eur_je_feld);
    expect(sp.abschnittBau_s()).toBe(KONSTANTEN.abschnitt_bau_s + KONSTANTEN.querung_bau_s);
    sp.abschnittAbschliessen(); expect(sp.materialBestellen().ok).toBe(true);
    expect(sp.expressLiefern()).toEqual({ ok: false, hinweis: EXPRESS });
    uhr.t = sp.stand.abschnitt!.bau!.ende_ms; sp.bis(uhr.t);
    expect(sp.stand.nordviertel).toBe(true);
    expect(nordHaeuser(sp)).toHaveLength(14);
  });
});

describe('NR27 pruefen: Rohrtausch, Zurück, Radierer, Verwerfen', () => {
  function erschlossen(uhr: Uhr): Spiel {
    const sp = spiel(6, uhr);
    querungBestellen(sp, 'd63');
    uhr.t = sp.stand.abschnitt!.bau!.ende_ms; sp.bis(uhr.t);
    expect(sp.stand.nordviertel).toBe(true);
    return sp;
  }

  it('test_nr27_c_rohrtausch_unter_der_bahn: kostet die Querung je Gleisfeld erneut, Zuschlag, keine Abkürzung, Viertel nicht doppelt', () => {
    const uhr = { t: T0 }, sp = erschlossen(uhr);
    const ids = nordHaeuser(sp).map((o) => o.id).sort();
    neuerAbschnitt(sp, uhr);
    const r2 = sp.stand.objekte.find((o) => o.x === 10 && o.y === -2)!, r3 = sp.stand.objekte.find((o) => o.x === 10 && o.y === -3)!;
    const r1 = sp.stand.objekte.find((o) => o.x === 10 && o.y === -1)!;
    expect(sp.ersatzPlanen(r2.id, 'd90').ok).toBe(true);
    expect(sp.ersatzPlanen(r3.id, 'd90').ok).toBe(true);
    // Erwartung von Hand: Neupreis d90 − 50 % von d63, je Bahnfeld + querung_eur_je_feld
    const tausch = (KATALOG.d90.kosten_eur as number[])[0] - Math.round((KATALOG.d63.kosten_eur as number[])[0] * KONSTANTEN.rueckkauf_anteil);
    expect(sp.ersatz_eur()).toBe(2 * (tausch + KONSTANTEN.querung_eur_je_feld));
    expect(sp.ersatzPreis_eur(r1, 'd90')).toBe(tausch); // Grünstreifen: ohne Aufpreis
    expect(sp.abschnittBau_s()).toBe(KONSTANTEN.abschnitt_bau_s + KONSTANTEN.querung_bau_s);
    const geld = sp.stand.geld_eur;
    expect(sp.abschnittAbschliessen().ok).toBe(true);
    const kosten = sp.abschnittKosten_eur();
    expect(sp.materialBestellen().ok).toBe(true);
    expect(sp.stand.geld_eur).toBe(geld - kosten);
    expect(sp.stand.abschnitt!.mit_querung).toBe(true);
    const taler = sp.stand.taler, ende = sp.stand.abschnitt!.bau!.ende_ms;
    expect(sp.expressLiefern()).toEqual({ ok: false, hinweis: EXPRESS });
    expect(sp.beschleunigen(sp.stand.abschnitt!.bau)).toEqual({ ok: false, hinweis: EXPRESS });
    expect([sp.stand.taler, sp.stand.abschnitt!.bau!.ende_ms]).toEqual([taler, ende]);
    uhr.t = ende; sp.bis(uhr.t);
    expect(sp.objekt(r2.id)!.typ).toBe('d90');
    expect(sp.objekt(r3.id)!.typ).toBe('d90');
    expect(nordHaeuser(sp).map((o) => o.id).sort()).toEqual(ids);
  });

  it('test_nr27_c_zurueck_nimmt_querung_mit: Preis und Zuschlag gehen mit der letzten Bahn-Leitung weg', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    for (const y of [-1, -2, -3]) sp.platzieren('d90', 10, y);
    expect(sp.querung_eur()).toBe(2 * KONSTANTEN.querung_eur_je_feld);
    expect(sp.letzteLeitungZurueck().ok).toBe(true);
    expect(sp.querung_eur()).toBe(KONSTANTEN.querung_eur_je_feld);
    expect(sp.letzteLeitungZurueck().ok).toBe(true);
    expect(sp.querung_eur()).toBe(0);
    expect(sp.abschnittBau_s()).toBe(KONSTANTEN.abschnitt_bau_s);
    // danach darf dieselbe Stelle wieder gezeichnet werden
    expect(sp.platzieren('d90', 10, -2).ok).toBe(true);
  });

  it('test_nr27_c_radierer_geplant: geplante Bahn-Leitung radieren senkt den Preis um genau ein Gleisfeld', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    for (const y of [-1, -2, -3]) sp.platzieren('d90', 10, y);
    const vorher = sp.abschnittKosten_eur();
    expect(sp.geplanteLeitungEntfernen(10, -3).ok).toBe(true);
    expect(sp.abschnittKosten_eur()).toBe(vorher - KONSTANTEN.querung_eur_je_feld - (KATALOG.d90.kosten_eur as number[])[0]);
  });

  it('test_nr27_e_radierer_gebaut: gebaute Querung entfernen → Häuser bleiben, Merker bleibt, Neubau kostet wieder, nichts doppelt', () => {
    const uhr = { t: T0 }, sp = erschlossen(uhr);
    const ids = nordHaeuser(sp).map((o) => o.id).sort();
    const r2 = sp.stand.objekte.find((o) => o.x === 10 && o.y === -2)!;
    expect(sp.entfernen(r2.id).ok).toBe(true);
    expect(sp.stand.nordviertel).toBe(true);
    expect(nordHaeuser(sp).map((o) => o.id).sort()).toEqual(ids);
    neuerAbschnitt(sp, uhr);
    expect(sp.platzieren('d63', 10, -2).ok).toBe(true);
    expect(sp.querung_eur()).toBe(KONSTANTEN.querung_eur_je_feld);
    sp.abschnittAbschliessen(); sp.materialBestellen();
    expect(sp.stand.abschnitt!.mit_querung).toBe(true);
    uhr.t = sp.stand.abschnitt!.bau!.ende_ms; sp.bis(uhr.t);
    expect(nordHaeuser(sp).map((o) => o.id).sort()).toEqual(ids);
  });

  it('test_nr27_c_verwerfen: Abschnitt mit Querung verwerfen → kein Bahnfeld geplant, kein Zuschlag, Gleise wieder frei', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    for (const y of [-1, -2, -3]) sp.platzieren('d90', 10, y);
    expect(sp.abschnittVerwerfen().ok).toBe(true);
    expect(sp.stand.objekte.some((o) => o.y < 0)).toBe(false);
    expect(sp.stand.abschnitt).toBeUndefined();
    neuerAbschnitt(sp, uhr);
    expect(sp.abschnittBau_s()).toBe(KONSTANTEN.abschnitt_bau_s);
    expect(sp.querungsFelder()).toEqual([]);
  });

  it('test_nr27_c_sofort_fertig_nach_laden: neues bau-Objekt aus dem geladenen Stand bleibt gesperrt (Taler unverändert)', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    querungBestellen(sp);
    const neu = new Spiel(ladenMitBefund(serialisieren(sp.stand), uhr.t).stand, () => uhr.t);
    const taler = neu.stand.taler;
    expect(neu.beschleunigungskosten_taler(neu.stand.abschnitt!.bau!)).toBeGreaterThan(0);
    expect(neu.beschleunigen(neu.stand.abschnitt!.bau).ok).toBe(false);
    expect(neu.stand.taler).toBe(taler);
    expect(neu.stand.nordviertel).toBeUndefined();
  });

  it('test_nr27_c_ohne_bahnfeld_bleibt_express_moeglich: normaler Abschnitt nach der Querung hat wieder Express', () => {
    const uhr = { t: T0 }, sp = erschlossen(uhr);
    neuerAbschnitt(sp, uhr);
    expect(sp.platzieren('d63', 10, -4).ok).toBe(true);
    sp.abschnittAbschliessen(); expect(sp.materialBestellen().ok).toBe(true);
    expect(sp.stand.abschnitt!.mit_querung).toBeUndefined();
    expect(sp.expressLiefern().ok).toBe(true);
  });
});

describe('NR27 pruefen: Bahnfelder, Brücke, einzige Querungsstelle (alle Typen, alle Felder, alle Stufen)', () => {
  const nichtLeitungen = (Object.keys(KATALOG) as TypId[]).filter((t) => !LEITUNGEN.includes(t) && KATALOG[t].kategorie !== 'innen' && t !== 'hz');

  for (const stufe of [1, 2, 3, 4, 5, 6]) {
    it(`test_nr27_e_leitung_auf_bahn_stufe${stufe}: nur x = ${QUERUNG_X} und nur ab Stufe 6, Brücke nie`, () => {
      const uhr = { t: T0 }, sp = spiel(stufe, uhr);
      let erlaubt = 0;
      for (const t of LEITUNGEN) for (const y of BAHN_ZEILEN_Y) for (let x = -1; x <= N; x++) {
        const soll = stufe >= 6 && x === QUERUNG_X;
        expect(sp.kannPlatzieren(t, x, y), `${t} ${x}|${y} Stufe ${stufe}`).toBe(soll);
        if (soll) erlaubt++;
      }
      expect(erlaubt).toBe(stufe >= 6 ? LEITUNGEN.length * BAHN_ZEILEN_Y.length : 0);
      for (const x of BRUECKE_X) for (const y of BAHN_ZEILEN_Y) {
        const r = sp.platzieren('d90', x, y);
        expect(r.ok).toBe(false);
        expect(r.hinweis).toBe(stufe >= 6 ? nordText('BRUECKE') : r.hinweis);
      }
    });
  }

  it('test_nr27_e_kein_objekt_auf_gleisen: kein Nicht-Leitungs-Typ auf einem Feld, das die Bahn berührt (auch 2×2, auch nach Erschließung)', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    sp.stand.nordviertel = true; // hinter der Bahn frei, damit nur die Gleisregel wirkt
    for (const t of nichtLeitungen) {
      const s = KATALOG[t].groesse ?? 1;
      for (let y = BAHN_ZEILEN_Y[0] - s + 1; y <= BAHN_ZEILEN_Y[BAHN_ZEILEN_Y.length - 1]; y++) for (let x = 0; x + s <= N; x++)
        expect(sp.kannPlatzieren(t, x, y), `${t} ${x}|${y}`).toBe(false);
    }
  });

  it('test_nr27_e_vor_querung_hinter_bahn_nichts: kein Typ auf y = −10 … −4 vor der Erschließung (Stufe 6)', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    for (const t of [...LEITUNGEN, ...nichtLeitungen]) for (let y = KARTE_OBEN_Y; y <= -4; y++) for (let x = 0; x < N; x++)
      expect(sp.kannPlatzieren(t, x, y), `${t} ${x}|${y}`).toBe(false);
  });

  it('test_nr27_e_entlang_der_gleise: nach (10|−2) bleiben (9|−2), (11|−2) und alle anderen Gleisfelder gesperrt', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    expect(sp.platzieren('d90', 10, -2).ok).toBe(true);
    expect(sp.platzieren('d90', 10, -3).ok).toBe(true);
    for (const y of BAHN_ZEILEN_Y) for (let x = 0; x < N; x++) if (x !== QUERUNG_X) {
      const r = sp.platzieren('d90', x, y);
      expect(r.ok, `${x}|${y}`).toBe(false);
    }
    expect(sp.platzieren('d90', 9, -2).hinweis).toBe(nordText('Q4'));
    expect(sp.querungsFelder().sort((a, b) => a - b)).toEqual([-3 * N + 10, -2 * N + 10]);
  });

  it('test_nr27_e_verschieben_auf_gleise: Deko/Außenanlage lässt sich nicht auf die Gleise oder hinter die Bahn verschieben', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr, false);
    expect(sp.platzieren('bank', 5, -1).ok).toBe(true);
    const bank = sp.stand.objekte.find((o) => o.typ === 'bank' && o.x === 5 && o.y === -1)!;
    expect(sp.verschieben(bank.id, 5, -2).ok).toBe(false);
    expect(sp.verschieben(bank.id, 5, -5).ok).toBe(false);
    expect(sp.objekt(bank.id)).toMatchObject({ x: 5, y: -1 });
  });

  it('test_nr27_e_obere_kante: oberhalb y = −10 und links/rechts außerhalb nichts, auch nach Erschließung', () => {
    const uhr = { t: T0 }, sp = spiel(6, uhr);
    sp.stand.nordviertel = true;
    for (const t of LEITUNGEN) {
      expect(sp.kannPlatzieren(t, 10, KARTE_OBEN_Y - 1)).toBe(false);
      expect(sp.kannPlatzieren(t, -1, -5)).toBe(false);
      expect(sp.kannPlatzieren(t, N, -5)).toBe(false);
    }
  });
});
