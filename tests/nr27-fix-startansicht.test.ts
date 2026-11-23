import { describe, expect, it } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/start';
import { echteSteuerung } from './hilfen/echte-steuerung';

// NR27 Fix-Runde, Wache Startansicht (DESIGN 14.13 Punkt 2: „Startbild: Zoom 2,2 auf die Heizzentrale: Zeile y = 0 so sichtbar
// wie heute“). Die Karte wuchs nach Norden; die Startkamera darf sich dadurch nicht verschieben. Erwartete Schlüssel vom Projektleiter
// am Stand 79469fd (vor NR27) gemessen und vorgegeben – Ist-Verhalten jenes Stands festgeschrieben (Vergleich alt gegen neu).
// Schlüssel = Breite, Höhe, Pixelverhältnis, Zoom, Winkel, Verschiebung x, Verschiebung y (src/render/kamera.ts schluessel()).

const T0 = 1_700_000_000_000;

describe('NR27 Fix – Startansicht unverändert', () => {
  for (const [b, h, erwartet] of [[844, 390, '844,390,2,2.2,0,-28.6,58.6'], [667, 375, '667,375,2,2.2,0,-27.5,57.5']] as const) {
    // Fehler, der ihn rot macht: zentrieren() rechnet mit dem neuen Kartenrand (y = −10) statt mit dem Dorf → Startbild verrutscht;
    // oder Startzoom ändert sich.
    it(`test_nr27_fix_startansicht_${b}x${h}`, async () => {
      const sp = new Spiel(neuerSpielstand(T0), () => T0);
      await echteSteuerung(sp, (u) => {
        expect((u.st.kamera as unknown as { schluessel(): string }).schluessel()).toBe(erwartet);
      }, { breite: b, hoehe: h });
    });
  }
});
