import { describe, expect, it } from 'vitest';
import { NORD_TEXTE, nordText, type NordTextId } from '../src/core/nord-texte';

// NR27 Fix-Runde 2 (Review W2, docs/pruefberichte/20261123-reviewer-paket-nr27-fix.md). Längenregeln aus docs/DESIGN.md:
// 12.20 Regel 3 – Meldung beim Antippen höchstens 90 Zeichen (3 Zeilen bei 667×375 mit offenem Seitenblatt);
// 13.13 A – Blase eines Mini-Tutorials höchstens 120 Zeichen. Gemessen wird der fertige Text, also mit eingesetzten
// Platzhaltern; die Werte sind die längsten, die das Spiel heute zeigt ({stufe} setzt nordText selbst ein).
//
// Nicht in diesem Test: WISSEN_A/WISSEN_B und KARTE_1–4 sind Fachtexte (Wortlaut Fachprüfer, Freigabe Simon); ihre Länge
// entscheidet der Projektleiter, nicht der Entwickler. Kurze Beschriftungen (CHIP, KARTE_TITEL …) sind keine Meldung,
// liegen aber weit unter 90 und laufen deshalb mit.

const WERTE = {
  // längster Sperrgrund von sperrgrund(…, 'bahnquerung') ist „ab Heizzentrale Stufe 6“ (freischaltung.ts)
  sperrgrund: 'ab Heizzentrale Stufe 6',
  // 45.000 € je Gleisfeld (katalog.ts querung_eur_je_feld), zwei Gleisfelder = 90.000 €; sechsstellig mit Reserve
  preis: '999.999 €',
  querung_eur: '999.999 €',
  // längste Form von dauerText (render/gebaeude.ts); heute 1440 s × 2,5 = 1 Std.
  querung_zeit: '9 Std. 59 Min.',
  laenge_m: 999,
};

const BLASEN: readonly NordTextId[] = ['TUTORIAL_1', 'TUTORIAL_BEDIEN', 'TUTORIAL_2'];
const FACHTEXTE_OHNE_REGEL: readonly NordTextId[] = ['WISSEN_A', 'WISSEN_B', 'KARTE_1', 'KARTE_2', 'KARTE_3', 'KARTE_4'];
const fertig = (id: NordTextId): string => nordText(id, WERTE, true)!;
const laenge = (t: string): number => [...t].length;

describe('NR27 Fix 2 – Längen aller Nord-Texte', () => {
  const ids = Object.keys(NORD_TEXTE) as NordTextId[];

  for (const id of ids.filter((i) => !BLASEN.includes(i) && !FACHTEXTE_OHNE_REGEL.includes(i))) {
    // Fehler, der ihn rot macht: eine Meldung wird länger als 90 Zeichen (z. B. N2 mit „in Verlängerung der Hauptstraße“).
    it(`${id}: Meldung höchstens 90 Zeichen`, () => {
      expect(laenge(fertig(id)), fertig(id)).toBeLessThanOrEqual(90);
    });
  }

  for (const id of BLASEN) {
    // Fehler: eine Tutorial-Blase wird länger als 120 Zeichen (z. B. TUTORIAL_2 mit „Teuer und langsam“ = 125).
    it(`${id}: Blase höchstens 120 Zeichen`, () => {
      expect(laenge(fertig(id)), fertig(id)).toBeLessThanOrEqual(120);
    });
  }
});
