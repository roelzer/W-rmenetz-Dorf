import { expect, it } from 'vitest';
import { laden, serialisieren } from '../src/core/speichern';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import type { Objekt } from '../src/core/typen';

function vorbereiten() {
  let jetzt = 1_000_000;
  const stand = neuerSpielstand(jetzt);
  const hz = stand.objekte.find((o) => o.typ === 'hz')!;
  const saegewerk = stand.objekte.find((o) => o.typ === 'gewerbe')!;
  hz.stufe = 2;
  saegewerk.x = 16;
  saegewerk.y = 10;
  const bestand: Objekt = { id: stand.naechste_id++, typ: 'd50', x: 13, y: 10, stufe: 1, bau: null, kasse_eur: 0 };
  stand.objekte = [hz, saegewerk, bestand];
  stand.geld_eur = 1_000_000;
  stand.abschnitt = { phase: 'offen', bau: null };
  const spiel = new Spiel(stand, () => jetzt);
  expect(spiel.platzieren('d50', 14, 10).ok).toBe(true);
  const neu = stand.objekte.at(-1)!;
  expect(spiel.platzieren('d50', 15, 10).ok).toBe(true);
  expect(spiel.vertragUnterschreiben(saegewerk.id).ok).toBe(true);
  const bauen = (s: Spiel) => {
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    jetzt = s.abschnitt!.bau!.ende_ms;
    s.bis(jetzt);
  };
  const neuLaden = (s: Spiel) => new Spiel(laden(serialisieren(s.stand), jetzt), () => jetzt);
  return { spiel, bestand, neu, saegewerk, bauen, neuLaden };
}

it('verbindet eine gebaute Sägewerkstrasse erst nach manueller Freigabe mit dem Bestandsnetz', () => {
  const { spiel, bestand, neu, saegewerk, bauen, neuLaden } = vorbereiten();
  bauen(spiel);
  const geladen = neuLaden(spiel);
  expect(geladen.netz.anschluss.has(saegewerk.id)).toBe(false);
  expect(geladen.netz.verfuegbar_kw).toBe(60);
  expect(geladen.trassenUmschalten(bestand.id, neu.id).ok).toBe(true);
  expect(geladen.netz.anschluss.has(saegewerk.id)).toBe(true);
  expect(geladen.netz.verfuegbar_kw).toBe(120);
  expect(neuLaden(geladen).netz.anschluss.has(saegewerk.id)).toBe(true);
});

it('speichert den geplanten Übergang, aktiviert ihn aber erst beim Bauende', () => {
  const { spiel, bestand, neu, saegewerk, bauen, neuLaden } = vorbereiten();
  expect(spiel.trassenUmschalten(neu.id, bestand.id).ok).toBe(true);
  expect(spiel.trassenUmschalten(neu.id, bestand.id).ok).toBe(true);
  expect(spiel.trassenNachbarn(neu)[0].verbunden).toBe(false);
  expect(spiel.trassenUmschalten(neu.id, bestand.id).ok).toBe(true);
  const geladen = neuLaden(spiel);
  expect(geladen.netz.anschluss.has(saegewerk.id)).toBe(false);
  bauen(geladen);
  expect(geladen.netz.anschluss.has(saegewerk.id)).toBe(true);
});
