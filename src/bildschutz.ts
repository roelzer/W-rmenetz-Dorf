/**
 * Schutz der Bildschleife (Spielerbericht 26.11. „seit 3 Tagen kein Geld mehr“): Warf ein Schritt einmal einen Fehler, wurde
 * kein neues Bild mehr angefordert – Spielzeit und Einnahmen standen bis zum Neuladen. Jeder Schritt läuft darum in eigenem
 * Schutz, der Spielkern zuerst, und das nächste Bild wird immer angefordert. Rein und ohne Browser testbar.
 */

export const FEHLER_SPIELERHINWEIS = 'Ein Fehler wurde abgefangen – das Spiel läuft weiter.';
/** Ein Fehler, der in jedem Bild auftritt, würde sonst 60-mal je Sekunde protokolliert und gemeldet. */
const MELDE_ABSTAND_MS = 60_000;

export type FehlerMelden = (bereich: string, fehler: unknown) => void;

/** Protokolliert je Bereich höchstens einmal je Minute (mit Zahl der unterdrückten) und meldet dem Spieler höchstens einmal je Minute. */
export function fehlerMelder(umgebung: {
  jetzt_ms: () => number;
  protokoll: (text: string, fehler: unknown) => void;
  spieler: (text: string) => void;
}): FehlerMelden {
  const zuletzt = new Map<string, { ms: number; unterdrueckt: number }>();
  let spieler_ms = -Infinity;
  return (bereich, fehler) => {
    const jetzt = umgebung.jetzt_ms(), z = zuletzt.get(bereich);
    if (!z || jetzt - z.ms >= MELDE_ABSTAND_MS) {
      const weitere = z?.unterdrueckt ? ` (${z.unterdrueckt} weitere seit der letzten Meldung)` : '';
      zuletzt.set(bereich, { ms: jetzt, unterdrueckt: 0 });
      umgebung.protokoll(`Bildschleife: Fehler in ${bereich}${weitere}`, fehler);
    } else z.unterdrueckt++;
    if (jetzt - spieler_ms >= MELDE_ABSTAND_MS) { spieler_ms = jetzt; umgebung.spieler(FEHLER_SPIELERHINWEIS); }
  };
}

/** Führt die Schritte eines Bildes nacheinander aus, jeden in eigenem Schutz; das nächste Bild wird in jedem Fall angefordert. */
export function bildSchritte(schritte: ReadonlyArray<readonly [string, () => void]>, melden: FehlerMelden, naechstesBild: () => void): void {
  try {
    for (const [bereich, schritt] of schritte) {
      try { schritt(); } catch (fehler) { melden(bereich, fehler); }
    }
  } finally {
    naechstesBild();
  }
}
