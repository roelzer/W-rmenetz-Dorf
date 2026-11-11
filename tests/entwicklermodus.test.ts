import { expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { laden, serialisieren } from '../src/core/speichern';
import { geldSperre, talerSperre } from '../src/ui/sperrtexte';

const JETZT = 1_000_000;

it('füllt den aktuellen Kassenspeicher nur einmal, auch nach dem Laden', () => {
  const stand = neuerSpielstand(JETZT);
  const spiel = new Spiel(stand, () => JETZT);
  expect(spiel.entwicklerhilfeAnwenden('kasse').ok).toBe(true);
  expect(stand.geld_eur).toBe(spiel.kassengrenze_eur());
  stand.geld_eur -= 123;
  const erneut = new Spiel(laden(serialisieren(stand), JETZT), () => JETZT);
  expect(erneut.entwicklerhilfeAnwenden('kasse').ok).toBe(false);
  expect(erneut.stand.geld_eur).toBe(stand.geld_eur);
});

it('erlaubt Euro-Käufe und Taleraktionen mit leerem Konto und speichert endliche Beträge', () => {
  const stand = neuerSpielstand(JETZT);
  stand.geld_eur = 0;
  stand.taler = 0;
  const spiel = new Spiel(stand, () => JETZT);
  const [x, y] = Array.from({ length: 24 * 24 }, (_, i) => [i % 24, Math.floor(i / 24)])
    .find(([x, y]) => spiel.kannPlatzieren('blumen', x, y))!;
  const bau = { art: 'neu' as const, start_ms: JETZT, ende_ms: JETZT + 60_000 };
  expect(spiel.platzieren('blumen', x, y).ok).toBe(false);
  expect(spiel.beschleunigen(bau).ok).toBe(false);
  spiel.entwicklerhilfeAnwenden('unbegrenzt');
  expect(geldSperre(spiel, 1000)).toBeNull();
  expect(talerSperre(spiel, () => 1000)).toBeNull();
  expect(spiel.platzieren('blumen', x, y).ok).toBe(true);
  expect(spiel.beschleunigen(bau).ok).toBe(true);
  const erneut = new Spiel(laden(serialisieren(stand), JETZT), () => JETZT);
  expect(erneut.testwaehrungUnbegrenzt).toBe(true);
  expect(erneut.stand.geld_eur).toBe(0);
  expect(erneut.stand.taler).toBe(0);
});
