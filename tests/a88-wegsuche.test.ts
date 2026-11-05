import { describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG } from '../src/core/katalog';

// A88 Freischalt-Leiter – Wegsuche beim Hausanschluss (Entscheidung Projektleiter zu T6):
// Anbohr- und Gestattungskosten bleiben reines Gewicht der Wegsuche wie vor A88; nur der Preis für den Spieler ist vor der
// Freischaltung 0. Vergleich: echtes Kernmodul gegen eine zweite Kopie des Spiels mit den Stufen von vor A88 (tests/ohne-leiter.ts).

const T0 = 1_000_000_000_000;
type SpielKlasse = typeof Spiel;
type NeuerStand = typeof neuerSpielstand;

async function spielVorA88(): Promise<{ Spiel: SpielKlasse; neuerSpielstand: NeuerStand }> {
  vi.resetModules();
  vi.doMock('../src/core/freischaltung', async (orig) => (await import('./ohne-leiter')).ohneLeiter(await orig()));
  const m = await import('../src/core/spiel');
  vi.doUnmock('../src/core/freischaltung');
  return m;
}

function anschluss(K: SpielKlasse, neuStand: NeuerStand, hausIndex: number) {
  const s = new K(neuStand(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.stand.geld_eur = 1_000_000;
  s.stand.abschnitt = { phase: 'offen', bau: null };
  s.neuBerechnen();
  const haus = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station)[hausIndex];
  const r = s.hausanschlussPlanen(haus.id);
  const felder = s.stand.objekte.filter((o) => o.geplant).map((o) => `${o.x}|${o.y}`).sort();
  return { ok: r.ok, felder, ueberFluss: s.stand.objekte.some((o) => o.geplant && s.istFluss(o.x, o.y)), s };
}

describe('A88 Wegsuche wie vor A88', () => {
  it('A88: Hausanschluss auf Stufe 1 nimmt denselben Weg wie vor A88, Gestattung und Anbohrung kosten den Spieler nichts', async () => {
    const vor = await spielVorA88();
    const anzahl = new Spiel(neuerSpielstand(T0), () => T0).stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station).length;
    let verglichen = 0, vorherMitKosten = 0;
    for (let i = 0; i < anzahl; i++) {
      const alt = anschluss(vor.Spiel, vor.neuerSpielstand, i);
      // Über den Fluss geht es auf Stufe 1 bewusst nicht mehr (Spülbohrung ab Stufe 2) – dort ist der Weg absichtlich anders.
      if (!alt.ok || alt.ueberFluss) continue;
      const jetzt = anschluss(Spiel, neuerSpielstand, i);
      expect(jetzt.felder, `Haus Nr. ${i}`).toEqual(alt.felder);
      expect(jetzt.s.gestattung_eur() + jetzt.s.anbohrung_eur(), `Haus Nr. ${i}`).toBe(0);
      if (alt.s.gestattung_eur() + alt.s.anbohrung_eur() > 0) vorherMitKosten++;
      verglichen++;
    }
    expect(verglichen).toBeGreaterThan(5);
    // Ohne solche Fälle prüfte der Vergleich nicht, dass die Kosten weiter als Gewicht zählen.
    expect(vorherMitKosten).toBeGreaterThan(2);
  });
});
