import { expect, it } from 'vitest';
import { KATALOG } from '../src/core/katalog';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { laden, serialisieren } from '../src/core/speichern';

it('schaltet einen stärkeren Kessel als eigenständigen Kauf frei und berechnet den Rückkauf aus seinem Preis', () => {
  let jetzt = 1_000_000;
  const stand = neuerSpielstand(jetzt);
  const spiel = new Spiel(stand, () => jetzt);
  spiel.ersteQuelleWaehlen('kessel');
  expect(spiel.innenEinbauen('kessel', false, 2).ok).toBe(false);
  expect(stand.innen[0].stufe).toBe(1);

  spiel.hz.stufe = 2;
  stand.geld_eur = 100_000;
  expect(spiel.innenVerkaufen(0).ok).toBe(true);
  const vorher = stand.geld_eur;
  expect(spiel.innenEinbauen('kessel', false, 2).ok).toBe(true);
  const preis = KATALOG.kessel.kosten_eur![1];
  expect(stand.geld_eur).toBe(vorher - preis);
  expect(stand.innen[0].bau?.art).toBe('neu');
  jetzt = stand.innen[0].bau!.ende_ms;
  spiel.bis(jetzt);
  expect(spiel.netz.verfuegbar_kw).toBe(90);

  const erneut = new Spiel(laden(serialisieren(stand), jetzt), () => jetzt);
  const vorVerkauf = erneut.stand.geld_eur;
  expect(erneut.innenVerkaufen(0).ok).toBe(true);
  expect(erneut.stand.geld_eur).toBe(vorVerkauf + Math.round(preis / 2));
});
