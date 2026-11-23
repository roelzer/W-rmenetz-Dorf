# Eingefrorene Spielstände NR27 (Tester-Vorarbeit V2)

**Nie neu erzeugen, nie ändern.** Diese Dateien sind das Orakel für Q1 / AE-NR27-7 („alte Spielstände laden unverändert“).
Geprüft von `tests/nr27-altstand-v2.test.ts` (heute) und später von `test_nr27_g_alter_stand` (P3).

- Erzeugt: 2026-11-23, vom Tester, im Worktree `vorarbeit/p1`
- Code-Stand: Commit `4fff77f0c15b1548cca875baf12118ba2457d0f2` (vor P1; noch ohne `src/core/feld.ts`, Raster nur y ≥ 0)
- Wie: einmaliger Erzeuger als Vitest-Datei (Quelltext unten), über die echte Spiel-Schnittstelle
  (`neuerSpielstand`, `Spiel.platzieren`, `abschnittPlanen/Abschliessen`, `materialBestellen`, `bis`, `stationKaufen`,
  `upgradeKaufen`) und am Ende `serialisieren(stand)`. Feste Uhrzeiten, kein Zufall außer dem festen Startwert des Dorfs.
  Die Erzeuger-Datei wurde danach gelöscht (nicht eingecheckt).

| Datei | sha256 | Inhalt |
|---|---|---|
| `altstand-stufe6-layout3.json` | `8e4be681…44e5` | Heizzentrale Stufe 6 bei (11\|10); alter Stand mit Layout 2, über `neubaugebietUmziehen()` auf Layout 3 umgezogen (Haus mit Station blieb auf (8\|27) → `neubau_strassenluecken: [656]`); gebaute Leitung d110 auf x = 10 von y = 11 bis an den Nordrand (10\|0), dazu d50 auf (9\|0) und (8\|0) abseits der Straße → `gestattungen: [9, 8]`; kein Bauabschnitt, kein `nordviertel`. 118 Objekte. |
| `altstand-mitten-im-bau.json` | `76edbba0…4761` | Heizzentrale Stufe 4; ein gebauter Abschnitt (d63 auf (14..16\|11)), Haus Id 19 mit Station `st_25` und laufendem Rücklauf-Helfer-Auftrag (`upgrade_auftrag.ende_ms` 3.650.000); zweiter Abschnitt in Phase `bau` (Start 3.050.000, Ende 3.950.000, `zuletzt_ms` 3.500.000 = halbe Bauzeit) mit 4 geplanten d50 auf (10\|10..7). 71 Objekte. |

Hinweis: „Laufender Ausbau“ am Haus ist hier der Rücklauf-Helfer-Auftrag (`upgrade_auftrag`); Häuser haben keine Stufen-Baustelle (`bau` mit `art: 'ausbau'` gibt es nur bei Heizzentrale und Erzeugern).

## Quelltext des Erzeugers (lief einmal als `tests/zz-erzeugen-nr27.test.ts`)

```ts
// EINMALIGER ERZEUGER (nicht einchecken): schreibt tests/referenz/nr27/*.json mit dem heutigen Code.
import { writeFileSync, mkdirSync } from 'node:fs';
import { it, expect } from 'vitest';
import { KONSTANTEN, passendeStation } from '../src/core/katalog';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { neubaugebietLayout2Anlegen } from '../src/core/neubaugebiet';
import { bedarfKw } from '../src/core/netz';
import { serialisieren } from '../src/core/speichern';

const N = KONSTANTEN.feldanzahl;
const ZIEL = 'tests/referenz/nr27';
const pruef = (r: { ok: boolean }, was: string) => { if (!r.ok) throw new Error(`${was}: ${JSON.stringify(r)}`); };

function abschnittBauen(spiel: Spiel, uhr: { t: number }, felder: Array<[string, number, number]>, fertig: boolean) {
  pruef(spiel.abschnittPlanen(), 'planen');
  uhr.t = spiel.stand.abschnitt!.bau!.ende_ms; spiel.bis(uhr.t);
  expect(spiel.stand.abschnitt!.phase).toBe('offen');
  for (const [t, x, y] of felder) pruef(spiel.platzieren(t as never, x, y), `platzieren ${t} ${x}|${y}`);
  pruef(spiel.abschnittAbschliessen(), 'abschliessen');
  pruef(spiel.materialBestellen(), 'bestellen');
  if (fertig) { uhr.t = spiel.stand.abschnitt!.bau!.ende_ms; spiel.bis(uhr.t); expect(spiel.stand.abschnitt).toBeUndefined(); }
}

it('erzeugt altstand-stufe6-layout3.json', () => {
  const uhr = { t: 1_000_000 };
  const stand = neuerSpielstand(uhr.t);
  stand.namen_gefragt = true;
  stand.geld_eur = 9_000_000;
  const hz = stand.objekte.find((o) => o.typ === 'hz')!;
  hz.stufe = 6;
  // alter Stand: dichtes Layout 2, ein Haus mit Station auf der späteren Wohnstraße Nord (8|27)
  neubaugebietLayout2Anlegen(stand, uhr.t);
  const fest = stand.objekte.find((o) => o.bestand && o.x === 8 && o.y === 27)!;
  fest.ohne_station = false; fest.station = passendeStation(bedarfKw(fest)).id;
  const spiel = new Spiel(stand, () => uhr.t);
  console.log(spiel.neubaugebietUmziehen());
  expect(stand.neubaugebiet_layout).toBe(3);
  expect(stand.neubau_strassenluecken?.length).toBeGreaterThan(0);
  console.log('hz', hz.x, hz.y, hz.stufe);
  // Leitung von der Heizzentrale nach Norden bis an den Rand (10|0)
  const felder: Array<[string, number, number]> = [];
  for (let y = 11; y >= 0; y--) felder.push(['d110', 10, y]);
  felder.push(['d50', 9, 0], ['d50', 8, 0]);
  abschnittBauen(spiel, uhr, felder, true);
  console.log('gestattungen', stand.gestattungen, 'luecken', stand.neubau_strassenluecken);
  expect(stand.gestattungen?.length).toBeGreaterThan(0);
  expect(stand.objekte.some((o) => o.y === 0 && o.typ.startsWith('d') && !o.geplant)).toBe(true);
  expect(stand.nordviertel).toBeUndefined;
  mkdirSync(ZIEL, { recursive: true });
  writeFileSync(`${ZIEL}/altstand-stufe6-layout3.json`, serialisieren(stand) + '\n');
});

it('erzeugt altstand-mitten-im-bau.json', () => {
  const uhr = { t: 2_000_000 };
  const stand = neuerSpielstand(uhr.t);
  stand.namen_gefragt = true;
  stand.geld_eur = 3_000_000;
  const hz = stand.objekte.find((o) => o.typ === 'hz')!;
  hz.stufe = 4;
  const spiel = new Spiel(stand, () => uhr.t);
  console.log('hz', hz.x, hz.y, spiel.stand.objekte.filter((o) => o.bestand).slice(0, 8).map((o) => `${o.typ}${o.x}|${o.y}`).join(' '));
  // 1. Abschnitt: gebaut; Haus anschließen, Station, Rücklauf-Helfer läuft
  const haus = stand.objekte.find((o) => o.bestand && o.x === 14 && o.y === 8) ?? null;
  console.log('haus14|8', haus?.typ);
  const felder: Array<[string, number, number]> = [];
  for (let x = 14; x <= 16; x++) felder.push(['d63', x, 11]);
  abschnittBauen(spiel, uhr, felder, true);
  const erreicht = spiel.erreichteHaeuser();
  console.log('erreicht', erreicht);
  const h = stand.objekte.find((o) => o.id === erreicht[0])!;
  pruef(spiel.stationKaufen(h.id, passendeStation(bedarfKw(h)).id), 'station');
  // 2. Abschnitt: geplant und bestellt, Uhr läuft (halbe Bauzeit)
  const felder2: Array<[string, number, number]> = [];
  for (let y = 10; y >= 7; y--) felder2.push(['d50', 10, y]);
  abschnittBauen(spiel, uhr, felder2, false);
  const a = stand.abschnitt!;
  uhr.t = Math.floor((a.bau!.start_ms + a.bau!.ende_ms) / 2); spiel.bis(uhr.t);
  pruef(spiel.upgradeKaufen(h.id), 'upgrade');
  expect(stand.abschnitt?.phase).toBe('bau');
  expect(stand.objekte.some((o) => o.geplant)).toBe(true);
  expect(h.upgrade_auftrag && h.upgrade_auftrag.ende_ms > uhr.t).toBe(true);
  console.log('abschnitt', JSON.stringify(a), 'upgrade', JSON.stringify(h.upgrade_auftrag), 'jetzt', uhr.t);
  writeFileSync(`${ZIEL}/altstand-mitten-im-bau.json`, serialisieren(stand) + '\n');
});
void N;
```
