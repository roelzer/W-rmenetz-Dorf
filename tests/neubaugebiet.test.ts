import { expect, it, vi } from 'vitest';
import { KATALOG, KONSTANTEN, passendeStation } from '../src/core/katalog';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { bedarfKw } from '../src/core/netz';
import { laden, serialisieren } from '../src/core/speichern';
import { neu, quelle } from './hilfen';

it('erweitert erst nach dem Ausbau auf Stufe 6, hält die Straße frei und ermöglicht Vorsehungen', () => {
  let jetzt = 1_000_000;
  const stand = neuerSpielstand(jetzt);
  const hz = neu('hz', 10, 10, { stufe: 5 });
  const leitungen = Array.from({ length: 11 }, (_, i) => neu('d160', 10, i + 13));
  stand.objekte = [hz, neu('huette', 2, 2), ...leitungen];
  stand.naechste_id = Math.max(...stand.objekte.map(o => o.id)) + 1;
  stand.innen = [quelle('kessel', 5)];
  stand.geld_eur = KATALOG.hz.kosten_eur![5] + 100_000;
  const spiel = new Spiel(stand, () => jetzt);
  expect(spiel.hzZiele().length).toBeGreaterThan(0);
  expect(spiel.kannPlatzieren('d160', 10, 24)).toBe(false);
  expect(spiel.ausbauen(hz.id).ok).toBe(false);
  vi.spyOn(spiel, 'hzZiele').mockReturnValueOnce([]);
  expect(spiel.ausbauen(hz.id).ok).toBe(true);
  jetzt = hz.bau!.ende_ms - 1;
  spiel.bis(jetzt);
  expect(stand.neubaugebiet).toBeUndefined();

  jetzt++;
  spiel.bis(jetzt);
  expect(hz.stufe).toBe(6);
  expect(spiel.kartenHoehe).toBe(KONSTANTEN.neubau_hoehe);
  expect(spiel.istStrasse(10, 24)).toBe(true);
  expect(spiel.kannPlatzieren('d160', 10, 24)).toBe(true);
  expect(spiel.kannPlatzieren('d160', 10, 46)).toBe(false);
  expect(spiel.kannPlatzieren('d160', 10, 45)).toBe(true);
  const haeuser = stand.objekte.filter(o => spiel.istNeubau(o));
  expect(haeuser).toHaveLength(40);
  expect(haeuser.filter(o => o.bau).length).toBeGreaterThan(8);
  expect(stand.neubaugebiet_layout).toBe(3);
  expect(spiel.istStrasse(5, 34)).toBe(true);
  expect(spiel.istStrasse(15, 27)).toBe(true);
  expect(spiel.istStrasse(15, 41)).toBe(true);
  expect(spiel.istStrasse(15, 32)).toBe(false);
  expect(spiel.istStrasse(5, 35)).toBe(false);
  expect(spiel.beschaeftigt()).toBe(0);
  const haus = haeuser.find(o => o.x === 12 && o.y === 25)!;
  expect(spiel.stationKaufen(haus.id, passendeStation(bedarfKw(haus)).id).ok).toBe(false);

  stand.abschnitt = { phase: 'offen', bau: null };
  expect(spiel.platzieren('d160', 10, 24).ok).toBe(true);
  expect(spiel.platzieren('d160', 10, 25).ok).toBe(true);
  const erstes = stand.objekte.find(o => o.x === 10 && o.y === 24)!;
  expect(spiel.trassenUmschalten(erstes.id, leitungen.at(-1)!.id).ok).toBe(true);
  // NR23: Das erste Haus an der Sammelstraße steht jetzt bei (12|25) – die Vorsehung kommt ins Feld daneben.
  const vorbereitet = stand.objekte.find(o => o.x === 10 && o.y === 25)!;
  expect(spiel.vorsehungUmschalten(vorbereitet.id).ok).toBe(true);
  expect(spiel.abschnittAbschliessen().ok).toBe(true);
  expect(spiel.materialBestellen().ok).toBe(true);
  jetzt = Math.max(stand.abschnitt.bau!.ende_ms, haus.bau!.ende_ms);
  spiel.bis(jetzt);
  expect(spiel.netz.tiefe.has(24 * KONSTANTEN.feldanzahl + 10)).toBe(true);
  expect(vorbereitet.vorsehung).toBe(true);
  expect(haus.bau).toBeNull();
  expect(haus.ohne_station).toBe(true);

  stand.abschnitt = { phase: 'offen', bau: null };
  expect(spiel.platzieren('d50', 11, 25).ok).toBe(true);
  const abzweig = stand.objekte.find(o => o.x === 11 && o.y === 25)!;
  expect(spiel.trassenUmschalten(abzweig.id, vorbereitet.id).ok).toBe(true);
  expect(spiel.anbohrungsFelder()).toEqual([]);
  expect(spiel.abschnittAbschliessen().ok).toBe(true);
  expect(spiel.materialBestellen().ok).toBe(true);
  jetzt = stand.abschnitt.bau!.ende_ms;
  spiel.bis(jetzt);
  expect(spiel.stationKaufen(haus.id, passendeStation(bedarfKw(haus)).id).ok).toBe(true);
  expect(spiel.netz.warm.has(haus.id)).toBe(true);

  const geladen = new Spiel(laden(serialisieren(stand), jetzt), () => jetzt);
  expect(geladen.stand.objekte.filter(o => geladen.istNeubau(o))).toHaveLength(40);
  expect(geladen.netz.warm.has(haus.id)).toBe(true);
});

it('ergänzt das neue Straßenviertel in bereits erschlossenen Spielständen genau einmal', () => {
  const jetzt = 1_000_000;
  const stand = neuerSpielstand(jetzt);
  const alt = neu('efh', 8, 30, { bestand: true, ohne_station: true });
  const leitung = neu('d160', 10, 31, { vorsehung: true });
  stand.objekte = [neu('hz', 10, 10, { stufe: 6 }), alt, leitung];
  stand.naechste_id = Math.max(...stand.objekte.map(o => o.id)) + 1;
  stand.neubaugebiet = true;
  const spiel = new Spiel(stand, () => jetzt);
  expect(spiel.objekt(alt.id)).toEqual(alt);
  expect(spiel.objekt(leitung.id)).toEqual(leitung);
  expect(spiel.istStrasse(10, 32)).toBe(true);
  expect(stand.objekte.filter(o => o.y >= 32)).toHaveLength(24);
  const erneut = new Spiel(laden(serialisieren(stand), jetzt), () => jetzt);
  expect(erneut.stand.objekte.filter(o => o.y >= 32)).toHaveLength(24);
});
