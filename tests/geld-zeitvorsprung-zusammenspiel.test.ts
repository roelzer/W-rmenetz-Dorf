import { describe, expect, it } from 'vitest';
import { KONSTANTEN, SPIELMONAT_MS } from '../src/core/katalog';
import { Spiel } from '../src/core/spiel';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { neuerSpielstand } from '../src/core/start';
import { altesStartdorf } from './hilfen/altes-startdorf';

// Härtung Spielerbericht 26.11. „seit 3 Tagen kein Geld mehr“ – Prüfung des Testers (Gegenprobe-Lücke und Zusammenspiel).
// Weg wie in der App (src/main.ts): gespeicherter Text → ladenMitBefund(text, Uhr) → new Spiel(stand, Uhr) → bis(Uhr).
// Erwartungen von Hand: Ein Spielmonat = 10 min (SPIELMONAT_MS). Wer bis zum Zeitpunkt t fortgerechnet hat, hat alle Monate
// vor dem laufenden abgerechnet: letzte Abrechnung = Monat floor(t / SPIELMONAT_MS) − 1. Nach dem Neuansetzen bleibt jede
// Restdauer (Ende − gespeicherte Spielzeit) gleich, gemessen ab der neuen Uhrzeit.

const T0 = 1_000_000_000_000;
const DREI_TAGE_MS = 3 * 24 * 3600 * 1000;
const monat = (t: number): number => Math.floor(t / SPIELMONAT_MS);
const hinweise = (sp: Spiel): string[] => sp.ereignisse.flatMap((e) => (e.art === 'hinweis' ? [e.text] : []));
/** In 10-s-Schritten bis `ziel` (wie die Bildschleife, nur gröber). */
function bisZu(sp: Spiel, uhr: { t: number }, ziel: number): void {
  while (uhr.t < ziel) { uhr.t = Math.min(ziel, uhr.t + 10_000); sp.bis(uhr.t); }
}

describe('Zeitvorsprung: Abrechnungsmonat aus der Zukunft (Gegenprobe-Lücke spiel.ts zeitNeuAnsetzen)', () => {
  it('geld_zusammenspiel: Stand mit Abrechnungsmonat der Zukunft rechnet nach dem Laden spätestens nach einem Spielmonat ab', () => {
    // Fehler, den der Test findet: zeitNeuAnsetzen setzt abrechnung_monat nicht zurück → 3 Tage (432 Monate) keine Abrechnung.
    const zukunft = T0 + DREI_TAGE_MS;
    const st = altesStartdorf(zukunft);
    st.abrechnung_monat = monat(zukunft); // so speichert ein Gerät, das bis „zukunft“ gespielt hat
    const { stand, befund } = ladenMitBefund(serialisieren(st), T0);
    expect(befund).toBe('ok'); // Abrechnungsmonat passt zur gespeicherten Spielzeit, der Lader repariert nichts
    expect(stand.abrechnung_monat).toBe(monat(zukunft));
    const uhr = { t: T0 };
    const sp = new Spiel(stand, () => uhr.t);
    sp.bis(T0);
    expect(sp.stand.abrechnung_monat).toBe(monat(T0));
    bisZu(sp, uhr, T0 + SPIELMONAT_MS);
    expect(sp.stand.letzte_abrechnung?.monat).toBe(monat(T0 + SPIELMONAT_MS) - 1);
  });
});

describe('Zeitvorsprung 3 Tage mit Bahnquerung im Bau (Zusammenspiel)', () => {
  /** Gerät A (Uhr 3 Tage vor): Heizzentrale Stufe 6, Querung (10|-1…-3) bestellt, ein Spielmonat gespielt, gespeichert. */
  function sicherungVonGeraetA() {
    const zukunft = T0 + DREI_TAGE_MS;
    const a = { t: zukunft };
    const s = neuerSpielstand(zukunft);
    s.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
    s.geld_eur = 1_000_000; s.taler = 10_000;
    s.abschnitt = { phase: 'offen', bau: null };
    const sp = new Spiel(s, () => a.t);
    for (const y of [-1, -2, -3]) expect(sp.platzieren('d40', 10, y), `(10|${y})`).toEqual({ ok: true });
    expect(sp.abschnittAbschliessen().ok).toBe(true);
    expect(sp.materialBestellen()).toEqual({ ok: true });
    expect(sp.stand.abschnitt?.mit_querung).toBe(true);
    bisZu(sp, a, zukunft + SPIELMONAT_MS + 30_000); // mindestens eine Abrechnung auf Gerät A, abrechnung_monat in der Zukunft
    expect(sp.stand.abschnitt?.phase).toBe('bau');
    sp.stand.geld_eur = 0; // weit unter der Kassengrenze: jede Abrechnung darf ankommen
    const rest_ms = sp.stand.abschnitt!.bau!.ende_ms - sp.stand.zuletzt_ms;
    return { text: serialisieren(sp.stand), rest_ms, vorsprung_ms: sp.stand.zuletzt_ms - T0 };
  }

  it('geld_zusammenspiel: nach dem Laden auf Gerät B rückt die Querungs-Frist mit, Restdauer bleibt', () => {
    const { text, rest_ms } = sicherungVonGeraetA();
    // Restdauer der Querung muss noch deutlich mehr als ein Spielmonat sein, sonst prüft der Test das Mitrücken nicht
    expect(rest_ms).toBeGreaterThan(SPIELMONAT_MS);
    expect(rest_ms).toBeLessThan((KONSTANTEN.abschnitt_bau_s + KONSTANTEN.querung_bau_s) * KONSTANTEN.bauzeit_faktor * 1000);
    const { stand, befund } = ladenMitBefund(text, T0);
    expect(befund).toBe('ok');
    const uhr = { t: T0 };
    const sp = new Spiel(stand, () => uhr.t);
    sp.bis(T0);
    expect(sp.stand.zuletzt_ms).toBe(T0);
    expect(sp.stand.abschnitt?.phase).toBe('bau');
    expect(sp.stand.abschnitt?.mit_querung).toBe(true);
    expect(sp.stand.abschnitt!.bau!.ende_ms).toBe(T0 + rest_ms);
    expect(sp.stand.geld_eur).toBe(0);
    expect(hinweise(sp).some((h) => h.startsWith('Spieluhr war 3 Tage voraus'))).toBe(true);
  });

  it('geld_zusammenspiel: Abrechnung läuft gleich weiter, die Querung wird genau nach der Restdauer fertig, Nordviertel erscheint', () => {
    const { text, rest_ms } = sicherungVonGeraetA();
    const { stand } = ladenMitBefund(text, T0);
    const uhr = { t: T0 };
    const sp = new Spiel(stand, () => uhr.t);
    sp.bis(T0);
    // ein Spielmonat später: eine Abrechnung ist gelaufen (nicht erst in 3 Tagen)
    bisZu(sp, uhr, T0 + SPIELMONAT_MS);
    expect(sp.stand.letzte_abrechnung?.monat).toBe(monat(T0 + SPIELMONAT_MS) - 1);
    expect(Number.isFinite(sp.stand.geld_eur)).toBe(true);
    expect(sp.stand.geld_eur).toBeGreaterThanOrEqual(0);
    // kurz vor Ende der Restdauer: Querung noch im Bau, Nordviertel noch nicht da
    bisZu(sp, uhr, T0 + rest_ms - 10_000);
    expect(sp.stand.abschnitt?.phase).toBe('bau');
    expect(sp.stand.nordviertel).toBeFalsy();
    // nach der Restdauer: fertig, die 14 Häuser hinter der Bahn sind da (Zahl aus NR27-Plan, tests/nr27-bahnquerung.test.ts)
    bisZu(sp, uhr, T0 + rest_ms + 10_000);
    expect(sp.stand.abschnitt?.phase).not.toBe('bau');
    expect(sp.stand.nordviertel).toBe(true);
    expect(sp.stand.objekte.filter((o) => o.y <= -5)).toHaveLength(14);
    expect(hinweise(sp)).toContain('Bahnquerung fertig! Die Häuser hinter der Bahn kannst du jetzt anschließen.');
    // und die Abrechnung ist bis hierher lückenlos mitgelaufen
    expect(sp.stand.letzte_abrechnung?.monat).toBe(monat(uhr.t) - 1);
  });

  it('geld_zusammenspiel: Speichern und erneutes Laden nach dem Neuansetzen verschiebt nichts ein zweites Mal', () => {
    const { text, rest_ms } = sicherungVonGeraetA();
    const uhr = { t: T0 };
    const sp = new Spiel(ladenMitBefund(text, T0).stand, () => uhr.t);
    sp.bis(T0);
    bisZu(sp, uhr, T0 + 60_000);
    const zweit = new Spiel(ladenMitBefund(serialisieren(sp.stand), uhr.t).stand, () => uhr.t);
    zweit.bis(uhr.t);
    expect(zweit.stand.abschnitt!.bau!.ende_ms).toBe(T0 + rest_ms);
    expect(hinweise(zweit).some((h) => h.startsWith('Spieluhr war'))).toBe(false);
  });
});
