import { expect, it } from 'vitest';
import { SPIELMONAT_MS, UPGRADES } from '../src/core/katalog';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { laden, serialisieren } from '../src/core/speichern';
import { neu } from './hilfen';

it('Andi spart seinen Anteil und beauftragt nur bezahlbare hydraulische Abgleiche', () => {
  let zeit = 100 * SPIELMONAT_MS;
  const stand = neuerSpielstand(zeit);
  const haus = neu('efh', 14, 10);
  stand.objekte = [neu('hz', 10, 10, { stufe: 3 }), neu('d50', 13, 10), haus];
  const spiel = new Spiel(stand, () => zeit);
  expect(spiel.netz.anschluss.has(haus.id)).toBe(true);
  spiel.andiEinstellen();
  spiel.andiKonfigurieren(10, 'abgleich');

  haus.zaehler_eur = 10000;
  zeit += SPIELMONAT_MS;
  spiel.bis(zeit);
  const erstesBudget = Math.floor(stand.letzte_abrechnung!.eingang_eur! * 0.1);
  expect(stand.andi?.budget_eur).toBe(erstesBudget);
  expect(haus.upgrade_auftrag).toBeUndefined();

  haus.zaehler_eur = 10000;
  zeit += SPIELMONAT_MS;
  spiel.bis(zeit);
  expect(haus.upgrade_auftrag?.ende_ms).toBeGreaterThan(zeit);
  expect(stand.andi?.budget_eur).toBe(erstesBudget + Math.floor(stand.letzte_abrechnung!.eingang_eur! * 0.1) - UPGRADES[0].kosten_eur);
  expect(laden(serialisieren(stand), zeit).andi).toEqual(stand.andi);
});

it('speichert die Aufgabe über eine sichtbare Taste und markiert danach die Auswahl', async () => {
  const { kontextKarte } = await import('./hilfen/kontext-attrappe');
  const zeit = 100 * SPIELMONAT_MS;
  const stand = neuerSpielstand(zeit);
  const hz = neu('hz', 10, 10, { stufe: 3 });
  stand.objekte = [hz];
  const spiel = new Spiel(stand, () => zeit);
  spiel.andiEinstellen();

  const vorher = await kontextKarte(spiel, hz, zeit);
  const taste = vorher.a.alle(vorher.c).find(el => el.tag === 'button' && vorher.a.text(el) === 'Hydraulische Abgleiche');
  expect(taste?.attrs['aria-pressed']).toBe('false');
  taste?.on.click();
  expect(stand.andi?.aufgabe).toBe('abgleich');
  expect(stand.andi?.anteil_pct).toBe(10);

  const nachher = await kontextKarte(spiel, hz, zeit);
  expect(nachher.a.alle(nachher.c).find(el => el.tag === 'button' && nachher.a.text(el) === 'Hydraulische Abgleiche')?.attrs['aria-pressed']).toBe('true');
});
