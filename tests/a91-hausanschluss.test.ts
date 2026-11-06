import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { KATALOG, KONSTANTEN, passendeStation } from '../src/core/katalog';
import { bedarfKw } from '../src/core/netz';
import { pruefeAuftraege } from '../src/core/auftraege';
import type { Objekt } from '../src/core/typen';

// A91 P3 (Bauplan docs/bauplaene/NR15-netzmodell.md, Fassung 3 Nachtrag 1, Abschnitt 5): Die automatische Hausanschluss-Planung
// (A89) sperrt die Felder neben der Heizzentrale nicht mehr. Dafür trägt ein Weg nur, wenn danach kein Haus neu „kalt: Leitung“
// ist und keine Planungsfehler-Warnung (W1-Engpass, A67-Reduzierung, A76-Aufteilung) neu dazukommt. Gibt es keinen solchen Weg,
// nimmt die Suche den Weg wie vor P3 (nur „kein Haus neu kalt“) – Anschließbarkeit geht vor, die Warnung bleibt sichtbar.
// NR18-P0: Die automatische Wegsuche entfällt (Bauplan NR18 4.23); es bleiben der Durchlauf mit selbst gezeichneter Leitung
// und die Prüfung, dass der alte Hinweis nicht zurückkommt.

const T0 = 1_000_000_000_000;
const feld = (o: Pick<Objekt, 'x' | 'y'>): string => `${o.x}|${o.y}`;

describe('A91 P3 – Hausanschluss ohne Sperre neben der Heizzentrale', () => {
  it('A91: test_a91_hausanschluss_13_12_zwei_felder', () => {
    const z = { t: T0 };
    const s = new Spiel(altesStartdorf(T0), () => z.t);
    s.ersteQuelleWaehlen('kessel');
    const vor = (sek: number): void => { for (let i = 0; i < sek / 10; i++) { z.t += 10_000; s.bis(z.t); } };
    expect(s.abschnittPlanen().ok).toBe(true);
    vor(KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(s.stand.abschnitt?.phase).toBe('offen');
    const haus = s.stand.objekte.find((o) => o.x === 13 && o.y === 12) as Objekt;
    // NR18-P0 (4.23): Die Leitung zeichnet der Spieler selbst (keine automatische Wegsuche mehr) – derselbe Weg wie früher.
    expect(s.platzieren('d25', 11, 12).ok).toBe(true);
    expect(s.platzieren('d25', 12, 12).ok).toBe(true);
    const geplant = s.stand.objekte.filter((o) => o.geplant);
    expect(geplant.map(feld).sort()).toEqual(['11|12', '12|12']);
    expect(geplant.every((o) => o.typ === 'd25')).toBe(true);
    // 2 Felder × 400 € (Material d25 10 € × Kostenfaktor 40, katalog.ts; Straße, Anbohrung vor Freischaltung 0 €)
    expect(s.abschnittKosten_eur()).toBe(800);
    expect(s.stationKaufen(haus.id, passendeStation(bedarfKw(haus)).id).ok).toBe(true);
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    vor(KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
    expect(s.stand.abschnitt).toBeUndefined();
    const warm = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && s.netz.warm.has(o.id)).map(feld).sort();
    expect(warm).toEqual(['12|14', '13|12', '9|13']);
    pruefeAuftraege(s);
    expect(s.stand.erledigt.c2).toBe(true);
  });

  it('A91: test_a91_kein_hinweis_auf_heizzentrale_mehr', () => {
    const quelle = readFileSync(new URL('../src/core/spiel.ts', import.meta.url), 'utf8');
    expect(quelle).not.toContain('darf der Hausanschluss nicht liegen');
  });
});
