import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * NR27 Bahnquerung – Architekturregeln für das Raster nach Norden (Bauplan docs/bauplaene/NR27-bahnquerung-entwurf.md).
 * Die Karte wächst nach Norden in Zeilen mit NEGATIVEM y. Die Schlüsselformel y*24+x bleibt (alte Spielstände unverändert),
 * aber drei alte Annahmen gelten dann nicht mehr:
 *   AE-NR27-2  Ein Feldschlüssel wird nur in src/core/feld.ts zurückgerechnet (feldVon). `k % N` liefert für y < 0 ein falsches x.
 *   AE-NR27-3  „Kein Feld“ heißt KEIN_FELD aus feld.ts, nie -1 und nie „< 0“: Schlüssel im Norden SIND negativ.
 *   AE-NR27-4  Die Belegungskarte wird nur über belegtId(bel, k) gelesen: ein Int32Array verwirft negative Indizes still.
 * Die Regeln greifen, sobald src/core/feld.ts existiert (Paket P1). Liest nur Dateien, führt keinen Spielcode aus.
 */

function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : p.endsWith('.ts') ? [p] : [];
  });
}
const ohneKommentare = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const FELD_MODUL = join('src', 'core', 'feld.ts');
const NETZ_MODUL = join('src', 'core', 'netz.ts');
const NORD_MODUL = join('src', 'core', 'nordviertel.ts');

/** Rückrechnung Schlüssel → x/y: `k % N`, `Math.floor(k / N)`, `(k - x) / N` (auch mit feldanzahl). */
const DEKODIEREN = /%\s*(?:N|feldanzahl|KONSTANTEN\.feldanzahl)\b|Math\.floor\(\s*[\w.]+\s*\/\s*(?:N|feldanzahl|KONSTANTEN\.feldanzahl)\s*\)|\(\s*\w+\s*-\s*[\w.()%\s]+\)\s*\/\s*(?:N|feldanzahl)\b/g;
/** Alte Wächter für „kein Feld / direkt am Heizhaus“: -1 als Wert oder ein Vergleich gegen 0/-1 auf Schlüssel-Variablen. */
const WAECHTER = /\beltern\.set\([^,]+,\s*-1\s*\)|\?\?\s*-1\b|\.feld\s*(?:>=|<|===|!==)\s*-?[01](?![.\d])|\b(?:p|f|fa|fn|s|g|k|feld|best|neu)\s*(?:>=\s*0|<\s*0|===\s*-1|!==\s*-1)(?![.\d])|\b(?:best|neu|p)\s*=\s*-1\b|feld:\s*-1\b/g;
/** Direkter Index in die Belegungskarte. */
const BELEGUNG_INDEX = /\b(?:belegung|bel)\[/g;
/** Feste Untergrenze 0 für y in der Netzrechnung (muss KARTE_OBEN_Y sein). */
const Y_NULL = /(?<![.\w])n?y\s*(?:>=|<)\s*0(?![.\d])/g;

const treffer = (text: string, muster: RegExp): string[] => text.match(muster) ?? [];

describe('NR27 Raster nach Norden: Schlüssel, Wächter, Belegung', { timeout: 30000 }, () => {
  if (!existsSync(FELD_MODUL)) {
    it('NR27 P1 ist noch nicht gebaut – die Regeln greifen, sobald src/core/feld.ts existiert', () => {
      expect(existsSync('src/core')).toBe(true);
    });
    return;
  }

  const alle = dateien('src').filter((f) => f !== FELD_MODUL);
  it('es gibt Dateien neben feld.ts', () => expect(alle.length).toBeGreaterThan(10));

  for (const f of alle) {
    const text = ohneKommentare(readFileSync(f, 'utf8'));
    it(`${f} rechnet Feldschlüssel nicht selbst in x/y zurück (AE-NR27-2)`, () => {
      expect(treffer(text, DEKODIEREN), `AE-NR27-2 verletzt in ${f}: Rückrechnung ${f} → eigenes „% N“. Erlaubter Weg: const [x, y] = feldVon(k) aus src/core/feld.ts (stimmt auch für y < 0).`).toEqual([]);
    });
    it(`${f} nutzt keinen -1/„< 0“-Wächter für Feldschlüssel (AE-NR27-3)`, () => {
      expect(treffer(text, WAECHTER), `AE-NR27-3 verletzt in ${f}: -1 bzw. „>= 0“ als „kein Feld“. Nordfelder haben negative Schlüssel. Erlaubter Weg: KEIN_FELD aus src/core/feld.ts setzen und mit === KEIN_FELD / !== KEIN_FELD vergleichen.`).toEqual([]);
    });
    if (f !== NETZ_MODUL) {
      it(`${f} liest die Belegungskarte nur über belegtId (AE-NR27-4)`, () => {
        expect(treffer(text, BELEGUNG_INDEX), `AE-NR27-4 verletzt in ${f}: direkter Index bel[k]. Ein Int32Array verwirft negative Indizes still. Erlaubter Weg: belegtId(bel, k) aus src/core/netz.ts.`).toEqual([]);
      });
    }
  }

  it('src/core/netz.ts rechnet mit KARTE_OBEN_Y statt mit 0 als oberem Kartenrand (AE-NR27-1)', () => {
    const text = ohneKommentare(readFileSync(NETZ_MODUL, 'utf8'));
    expect(treffer(text, Y_NULL), 'AE-NR27-1 verletzt in src/core/netz.ts: „y < 0“/„y >= 0“ schneidet die Nordzone ab. Erlaubter Weg: y < KARTE_OBEN_Y bzw. y >= KARTE_OBEN_Y aus src/core/feld.ts.').toEqual([]);
  });

  it('src/core/feld.ts hängt nur vom Katalog ab (keine Kreis-Abhängigkeit, AE-NR27-2)', () => {
    const importe = [...readFileSync(FELD_MODUL, 'utf8').matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    expect(importe.filter((i) => i !== './katalog'), 'feld.ts darf nur ./katalog importieren; alle anderen Module hängen von feld.ts ab, nicht umgekehrt.').toEqual([]);
  });

  if (existsSync(NORD_MODUL)) {
    it('src/core/nordviertel.ts kennt weder Spiel noch Darstellung (AE-NR27-5)', () => {
      const importe = [...readFileSync(NORD_MODUL, 'utf8').matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
      expect(importe.filter((i) => !['./katalog', './typen', './freischaltung', './feld'].includes(i)),
        'AE-NR27-5: nordviertel.ts ist reines Datenmodul der Nordzone. Erlaubt: ./katalog, ./typen, ./freischaltung, ./feld. spiel.ts ruft nordviertel.ts auf, nie umgekehrt.').toEqual([]);
    });
  }
});
