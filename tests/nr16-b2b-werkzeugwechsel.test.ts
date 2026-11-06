import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';

// NR16-B2b (A92, DESIGN.md 12.18): Werkzeugwechsel in der offenen Zeichenleiste (Farbknopf, Radierer, T-Stück) bleibt im
// Zeichenmodus. Früher öffnete jeder Wechsel ein neues Blatt; das schloss die Leiste und setzte den Modus zurück.
// Geprüft wird, dass es danach noch DIESELBE Leiste ist (gleiches Element) und das gewählte Werkzeug gilt.

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
const knopfMit = (u: EchteUmgebung, test: (k: El) => boolean): El => {
  const k = u.knoepfe().filter((e) => e.isConnected && test(e));
  expect(k).toHaveLength(1);
  return k[0];
};
const leisteVon = (u: EchteUmgebung): El | null => knopfMit(u, (k) => k.textContent.trim().startsWith('Abschnitt abschließen')).closest('section');

describe('NR16-B2b – Werkzeugwechsel bleibt in derselben Zeichenleiste', () => {
  it('Radierer, Farbknopf und T-Stück wechseln das Werkzeug, ohne die Leiste zu schließen', async () => {
    await echteSteuerung(neu(4), (u) => {
      u.st.stempeln('d25');
      const leiste = leisteVon(u);
      expect(leiste).not.toBeNull();
      knopfMit(u, (k) => k.textContent.trim() === 'Radierer').click();
      expect(leisteVon(u), 'nach Radierer dieselbe Leiste').toBe(leiste);
      expect(knopfMit(u, (k) => k.textContent.trim() === 'Radierer').attrs['aria-pressed']).toBe('true');
      knopfMit(u, (k) => k.attrs['aria-label'] === '32er-Leitung, bis 25 kW').click();
      expect(leisteVon(u), 'nach Farbknopf dieselbe Leiste').toBe(leiste);
      expect(knopfMit(u, (k) => k.attrs['aria-label'] === '32er-Leitung, bis 25 kW').attrs['aria-pressed']).toBe('true');
      expect(knopfMit(u, (k) => k.textContent.trim() === 'Radierer').attrs['aria-pressed'], 'Farbe wählen schaltet den Radierer aus').toBe('false');
      knopfMit(u, (k) => k.textContent.startsWith('T-Stück mit Vorsehung')).click();
      expect(leisteVon(u), 'nach T-Stück dieselbe Leiste').toBe(leiste);
      expect(knopfMit(u, (k) => k.textContent.startsWith('T-Stück mit Vorsehung')).attrs['aria-pressed']).toBe('true');
    });
  });
});
