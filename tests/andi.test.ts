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
  const erstesBudget = Math.floor(stand.letzte_abrechnung!.eingang_eur! * 0.1) * 0.9;
  expect(stand.andi?.budget_eur).toBeCloseTo(erstesBudget);
  expect(haus.upgrade_auftrag).toBeUndefined();

  haus.zaehler_eur = 10000;
  zeit += SPIELMONAT_MS;
  spiel.bis(zeit);
  expect(haus.upgrade_auftrag?.ende_ms).toBeGreaterThan(zeit);
  expect(stand.andi?.budget_eur).toBeCloseTo(erstesBudget + Math.floor(stand.letzte_abrechnung!.eingang_eur! * 0.1) * 0.9 - UPGRADES[0].kosten_eur);
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

it('sperrt den Techniker ab Ende eines Abgleichs genau zehn Spielminuten und speichert die Pause', () => {
  let zeit = 100 * SPIELMONAT_MS;
  const stand = neuerSpielstand(zeit);
  const haus = neu('efh', 14, 10), zweites = neu('efh', 14, 11);
  stand.objekte = [neu('hz', 10, 10, { stufe: 3 }), haus, zweites];
  const spiel = new Spiel(stand, () => zeit);
  expect(spiel.upgradeKaufen(haus.id, 'Sebastian').ok).toBe(true);
  const ende = haus.upgrade_auftrag!.ende_ms;
  zeit = ende - 1;
  spiel.bis(zeit);
  expect(haus.upgrade_auftrag).toBeDefined();
  expect(spiel.helferPauseBis_ms('Sebastian')).toBe(0);
  zeit = ende;
  spiel.bis(zeit);
  expect(spiel.helferPauseBis_ms('Sebastian') - zeit).toBe(600_000);
  expect(haus.upgrade).toBe(1);
  expect(spiel.helferFreiAb_ms('Sebastian')).toBe(ende + 600_000);
  expect(laden(serialisieren(stand), zeit).helfer_pause_bis_ms?.Sebastian).toBe(ende + 600_000);
  expect(spiel.freierHelfer()).toBe('Christian');
  zeit = ende + 599_999;
  expect(spiel.upgradeKaufen(zweites.id, 'Sebastian').ok).toBe(false);
  zeit++;
  expect(spiel.upgradeKaufen(zweites.id, 'Sebastian').ok).toBe(true);
});

it('rundet Andis alten und neu eingestellten Anteil auf 10-Prozentpunkt-Schritte', () => {
  const zeit = 100 * SPIELMONAT_MS;
  const stand = neuerSpielstand(zeit);
  stand.objekte = [neu('hz', 10, 10, { stufe: 3 })];
  const spiel = new Spiel(stand, () => zeit);
  spiel.andiEinstellen();
  stand.andi!.anteil_pct = 24;
  expect(laden(serialisieren(stand), zeit).andi?.anteil_pct).toBe(20);
  spiel.andiKonfigurieren(26, 'abgleich');
  expect(stand.andi?.anteil_pct).toBe(30);
});

it('zieht Andis Vergütung nur von neu zugeteiltem Budget ab und bucht sie vom Konto', () => {
  let zeit = 100 * SPIELMONAT_MS;
  const stand = neuerSpielstand(zeit);
  const haus = neu('efh', 14, 10);
  stand.objekte = [neu('hz', 10, 10, { stufe: 3 }), haus];
  stand.innen = [];
  const spiel = new Spiel(stand, () => zeit);
  spiel.andiEinstellen();
  stand.andi!.budget_eur = 500;
  haus.zaehler_eur = 1000;
  const vorher = stand.geld_eur;
  zeit += SPIELMONAT_MS;
  spiel.bis(zeit);
  expect(stand.letzte_abrechnung?.eingang_eur).toBe(1000);
  expect(stand.geld_eur).toBe(vorher + 990);
  expect(stand.andi?.budget_eur).toBe(590);

  zeit += SPIELMONAT_MS;
  spiel.bis(zeit);
  expect(stand.geld_eur).toBe(vorher + 990);
  expect(stand.andi?.budget_eur).toBe(590);
});
