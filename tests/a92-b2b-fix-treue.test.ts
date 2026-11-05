import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';

// A92 / NR16-B2b, Nachbesserung nach der Designer-Fotoprüfung (docs/pruefberichte/20261105-205825-designer-treue-b2b.md):
// Mängel, die sich ohne Browser prüfen lassen – Münze am T-Stück-Preis (12.18) und die Meldung, die Leitungsnamen
// nicht am Bindestrich trennt.

const T0 = 1_000_000_000_000;
const neu = (stufe: number): Spiel => {
  const s = new Spiel(neuerSpielstand(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.stand.abschnitt = { phase: 'offen', bau: null };
  s.stand.zeichenhilfe_gesehen = true;
  s.neuBerechnen();
  return s;
};
const leer = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const tStueck = (u: EchteUmgebung): El => {
  const k = u.knoepfe().filter((e) => e.isConnected && e.textContent.startsWith('T-Stück mit Vorsehung'));
  expect(k).toHaveLength(1);
  return k[0];
};
/** Zeile 2 (small) des Knopfs: Klassen des ersten Kinds (Münze/Schloss) und Text */
const zeile2 = (k: El): { sym: string | null; text: string } => {
  const small = k.nachfahren.find((e) => e.tagName === 'SMALL');
  expect(small, 'Zeile 2 vorhanden').toBeDefined();
  const erstes = small!.children[0];
  return { sym: erstes ? erstes.className : null, text: leer(small!.textContent) };
};

describe('A92 / DESIGN 12.18 – T-Stück zeigt den Preis mit Münze', () => {
  it('a92: Stufe 4, T-Stück frei – Zeile 2 „300 €“ mit Münze davor, auch wenn es angeschaltet ist', async () => {
    await echteSteuerung(neu(4), (u) => {
      u.st.stempeln('d25');
      // 300 € = KONSTANTEN.vorsehung_eur (katalog.ts), von Hand aus dem Katalog abgelesen
      expect(zeile2(tStueck(u))).toEqual({ sym: 'sym preis-sym', text: '300 €' });
      tStueck(u).click();
      expect(tStueck(u).attrs['aria-pressed']).toBe('true');
      expect(zeile2(tStueck(u))).toEqual({ sym: 'sym preis-sym', text: '300 €' });
    });
  });

  it('a92: Stufe 3, T-Stück gesperrt – Schloss statt Münze, Grund statt Preis', async () => {
    await echteSteuerung(neu(3), (u) => {
      u.st.stempeln('d25');
      expect(zeile2(tStueck(u))).toEqual({ sym: 'sym schloss-klein', text: 'ab Stufe 4' });
    });
  });
});
