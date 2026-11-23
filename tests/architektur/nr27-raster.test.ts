import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * NR27 Bahnquerung – Architekturregeln für das Raster nach Norden (Bauplan docs/bauplaene/NR27-bahnquerung-entwurf.md, Fassung 3).
 * Die Karte wächst nach Norden in Zeilen mit NEGATIVEM y. Die Schlüsselformel y*24+x bleibt (alte Spielstände unverändert),
 * aber diese alten Annahmen gelten dann nicht mehr:
 *   AE-NR27-2  Ein Feldschlüssel wird nur in src/core/feld.ts zurückgerechnet (feldVon). `k % N` liefert für y < 0 ein falsches x.
 *              Gilt auch für Abkürzungen wie `const N_ = N` – Abkürzungen von N sind verboten.
 *              Restwerte von Ausdrücken mit y/Schlüssel, die als Index oder Bruchteil dienen, laufen über mod() aus feld.ts
 *              (`(x + y) % 2` ist für y < 0 gleich -1 → `farben[-1]` ist undefined).
 *   AE-NR27-3  „Kein Feld“ heißt KEIN_FELD aus feld.ts, nie -1 und nie „< 0“: Schlüssel im Norden SIND negativ.
 *   AE-NR27-4  Die Belegungskarte wird nur über belegtId(bel, k) gelesen und nur über alleSchluessel(bel) durchlaufen:
 *              ein Int32Array verwirft negative Indizes still, eine Schleife ab 0 übersieht die Nordzone.
 *   AE-NR27-1  Eine Datei, die den Nordrand kennt (KARTE_OBEN_Y / kartenOben), prüft den oberen Rand nicht mehr mit 0.
 *   AE-NR27-12 Spielertexte zu Bahn und Querung stehen nur in src/core/nord-texte.ts (eine Texttabelle).
 *   AE-NR27-13 Fachtexte (Wissen) erscheinen nur mit Schalter NORD_FACHTEXTE_FREIGEGEBEN; der darf nur mit Simons Freigabe auf true.
 * Die Regeln greifen, sobald src/core/feld.ts (Paket P1) bzw. src/core/nord-texte.ts (Paket P2) existiert.
 * Liest nur Dateien, führt keinen Spielcode aus.
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
const TEXT_MODUL = join('src', 'core', 'nord-texte.ts');
const FREISCHALT_MODUL = join('src', 'core', 'freischaltung.ts');
/** Kleines Beispieldorf mit eigenem 24×24-Raster ohne Nordzone (A17) – gehört nicht zur Spielkarte. */
const NACHBAR_MODUL = join('src', 'core', 'nachbarn.ts');

/** Rückrechnung Schlüssel → x/y: `k % N`, `Math.floor(k / N)`, `(k - x) / N` (auch mit feldanzahl und N_-Abkürzungen). */
const DEKODIEREN = /%\s*(?:N_*|(?:KONSTANTEN\.)?feldanzahl)(?!\w)|Math\.floor\(\s*[\w.]+\s*\/\s*(?:N_*|(?:KONSTANTEN\.)?feldanzahl)\s*\)|\(\s*\w+\s*-\s*[\w.()%\s]+\)\s*\/\s*(?:N_*|feldanzahl)(?!\w)/g;
/** Abkürzung der Kartenbreite unter anderem Namen (`const N_ = N`) – damit entginge jede Rückrechnung der Regel oben. */
const ALIAS = /\b(?:const|let|var)\s+(?!N\b|[xy]\b)[A-Za-z_]\w*\s*=\s*(?:N|KONSTANTEN\.feldanzahl)\s*[,;]|,\s*(?!N\b|[xy]\b)[A-Za-z_]\w*\s*=\s*(?:N|KONSTANTEN\.feldanzahl)\s*[,;]/g;
/** Rest eines Ausdrucks mit y/Schlüssel als Index, Bruchteil oder Vergleich mit 1 (für y < 0 negativ). */
const NEG_REST = /\[\s*\(\s*[^()\n]*\b(?:y|ny|sy|key|k|f|feld)\b[^()\n]*\)\s*%\s*[\w.]+\s*\]|\(\s*[^()\n]*\b(?:y|ny|sy|key|k|f|feld)\b[^()\n]*\)\s*%\s*(?:1(?![\d.])|\w+\s*===?\s*1(?![\d.]))/g;
/** Alte Wächter für „kein Feld / direkt am Heizhaus“: -1 als Wert oder ein Vergleich gegen 0/-1 auf Schlüssel-Variablen. */
const WAECHTER = /\beltern\.set\([^,]+,\s*-1\s*\)|\?\?\s*-1\b|\.feld\s*(?:>=|<|===|!==)\s*-?[01](?![.\d])|\b(?:p|f|fa|fn|s|g|k|feld|best|neu)\s*(?:>=\s*0|<\s*0|===\s*-1|!==\s*-1)(?![.\d])|\b(?:best|neu|p)\s*=\s*-1\b|feld:\s*-1\b/g;
/** Direkter Index in die Belegungskarte. */
const BELEGUNG_INDEX = /\b(?:belegung|bel)\[/g;
/** Schleife über die Belegungskarte ab Index 0 (übersieht negative Schlüssel). */
const BELEGUNG_SCHLEIFE = /<=?\s*(?:[\w.]+\.)?(?:belegung|bel)\.length/g;
/** Feste Untergrenze 0 für y (muss KARTE_OBEN_Y bzw. kartenOben sein). `platz.y` o. Ä. zählt nicht (Punkt davor). */
const Y_NULL = /(?<![.\w])n?y\s*(?:>=|<)\s*0(?![.\d])/g;
/** Datei kennt den Nordrand: KARTE_OBEN_Y oder die Eigenschaft kartenOben (nicht eine gleichnamige lokale Variable). */
const KENNT_NORDRAND = /\bKARTE_OBEN_Y\b|\.kartenOben\b|\bkartenOben\??\s*:/;
/** Ein String-Literal, das von Bahn oder Gleisen spricht. */
const BAHN_TEXT = /(['"`])(?:(?!\1)[^\\\n]|\\.)*?(?:Bahn|Gleis)(?:(?!\1)[^\\\n]|\\.)*?\1/g;

const treffer = (text: string, muster: RegExp): string[] => text.match(muster) ?? [];
const importeVon = (datei: string): string[] => [...readFileSync(datei, 'utf8').matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);

describe('NR27 Raster nach Norden: Schlüssel, Wächter, Belegung', { timeout: 30000 }, () => {
  if (!existsSync(FELD_MODUL)) {
    it('NR27 P1 ist noch nicht gebaut – die Regeln greifen, sobald src/core/feld.ts existiert', () => {
      expect(existsSync('src/core')).toBe(true);
    });
    return;
  }

  const alle = dateien('src').filter((f) => f !== FELD_MODUL && f !== NACHBAR_MODUL);
  it('es gibt Dateien neben feld.ts', () => expect(alle.length).toBeGreaterThan(10));

  for (const f of alle) {
    const text = ohneKommentare(readFileSync(f, 'utf8'));
    it(`${f} rechnet Feldschlüssel nicht selbst in x/y zurück (AE-NR27-2)`, () => {
      expect(treffer(text, DEKODIEREN), `AE-NR27-2 verletzt in ${f}: Rückrechnung ${f} → eigenes „% N“. Erlaubter Weg: const [x, y] = feldVon(k) aus src/core/feld.ts (stimmt auch für y < 0).`).toEqual([]);
      expect(treffer(text, ALIAS), `AE-NR27-2 verletzt in ${f}: Abkürzung der Kartenbreite unter anderem Namen (z. B. „const N_ = N“). Erlaubter Weg: N direkt verwenden und Schlüssel mit feldVon(k) aus src/core/feld.ts zurückrechnen.`).toEqual([]);
    });
    it(`${f} nimmt keinen negativen Rest als Index oder Bruchteil (AE-NR27-2)`, () => {
      expect(treffer(text, NEG_REST), `AE-NR27-2 verletzt in ${f}: Rest „(… y …) % n“ als Index/Bruchteil wird für y < 0 negativ (farben[-1] = undefined). Erlaubter Weg: mod(a, n) aus src/core/feld.ts (immer 0 … n−1 bzw. 0 ≤ r < 1).`).toEqual([]);
    });
    it(`${f} nutzt keinen -1/„< 0“-Wächter für Feldschlüssel (AE-NR27-3)`, () => {
      expect(treffer(text, WAECHTER), `AE-NR27-3 verletzt in ${f}: -1 bzw. „>= 0“ als „kein Feld“. Nordfelder haben negative Schlüssel. Erlaubter Weg: KEIN_FELD aus src/core/feld.ts setzen und mit === KEIN_FELD / !== KEIN_FELD vergleichen.`).toEqual([]);
    });
    if (f !== NETZ_MODUL) {
      it(`${f} liest die Belegungskarte nur über belegtId/alleSchluessel (AE-NR27-4)`, () => {
        expect(treffer(text, BELEGUNG_INDEX), `AE-NR27-4 verletzt in ${f}: direkter Index bel[k]. Ein Int32Array verwirft negative Indizes still. Erlaubter Weg: belegtId(bel, k) aus src/core/netz.ts.`).toEqual([]);
        expect(treffer(text, BELEGUNG_SCHLEIFE), `AE-NR27-4 verletzt in ${f}: Schleife „k < belegung.length“ beginnt bei 0 und übersieht die Nordzone (negative Schlüssel). Erlaubter Weg: for (const k of alleSchluessel(bel)) aus src/core/netz.ts (aufsteigend, inkl. Nordzone).`).toEqual([]);
      });
    }
    if (f === NETZ_MODUL || KENNT_NORDRAND.test(text)) {
      it(`${f} prüft den oberen Kartenrand mit KARTE_OBEN_Y statt mit 0 (AE-NR27-1)`, () => {
        expect(treffer(text, Y_NULL), `AE-NR27-1 verletzt in ${f}: „y < 0“/„y >= 0“ schneidet die Nordzone ab. Erlaubter Weg: y < KARTE_OBEN_Y bzw. y >= KARTE_OBEN_Y aus src/core/feld.ts (Darstellung: kartenOben).`).toEqual([]);
      });
    }
  }

  it('src/core/feld.ts hängt nur vom Katalog ab (keine Kreis-Abhängigkeit, AE-NR27-2)', () => {
    expect(importeVon(FELD_MODUL).filter((i) => i !== './katalog'), 'feld.ts darf nur ./katalog importieren; alle anderen Module hängen von feld.ts ab, nicht umgekehrt.').toEqual([]);
  });

  if (existsSync(NORD_MODUL)) {
    it('src/core/nordviertel.ts kennt weder Spiel noch Darstellung (AE-NR27-5)', () => {
      expect(importeVon(NORD_MODUL).filter((i) => !['./katalog', './typen', './freischaltung', './feld', './nord-texte'].includes(i)),
        'AE-NR27-5: nordviertel.ts ist reines Datenmodul der Nordzone. Erlaubt: ./katalog, ./typen, ./freischaltung, ./feld, ./nord-texte. spiel.ts ruft nordviertel.ts auf, nie umgekehrt.').toEqual([]);
    });
  }
});

describe('NR27 Texte: eine Tabelle, Fachtexte nur mit Freigabe', { timeout: 30000 }, () => {
  if (!existsSync(TEXT_MODUL)) {
    it('NR27 P2 ist noch nicht gebaut – die Regeln greifen, sobald src/core/nord-texte.ts existiert', () => {
      expect(existsSync('src/core')).toBe(true);
    });
    return;
  }

  it('src/core/nord-texte.ts hängt nur von Katalog und Freischaltung ab (AE-NR27-12)', () => {
    expect(importeVon(TEXT_MODUL).filter((i) => !['./katalog', './freischaltung'].includes(i)),
      'AE-NR27-12: nord-texte.ts ist eine reine Texttabelle. Erlaubt: ./katalog, ./freischaltung. Kern, Darstellung und Oberfläche lesen sie, nie umgekehrt.').toEqual([]);
  });

  for (const f of dateien('src').filter((d) => d !== TEXT_MODUL)) {
    const text = ohneKommentare(readFileSync(f, 'utf8'));
    // Erlaubt: der Funktionsname in der Freischalt-Leiter (FUNKTION_NAME.bahnquerung = 'Bahnquerung').
    const funde = treffer(text, BAHN_TEXT).filter((t) => !(f === FREISCHALT_MODUL && /^['"`]Bahnquerung['"`]$/.test(t)));
    it(`${f} schreibt keine eigenen Bahn-Texte (AE-NR27-12)`, () => {
      expect(funde, `AE-NR27-12 verletzt in ${f}: Spielertext zu Bahn/Gleisen außerhalb der Texttabelle. Erlaubter Weg: Eintrag in NORD_TEXTE (src/core/nord-texte.ts) und Abruf mit nordText(id, …).`).toEqual([]);
    });
  }

  it('Fachtexte sind nur mit Simons Freigabe eingeschaltet (AE-NR27-13)', () => {
    const an = /\bNORD_FACHTEXTE_FREIGEGEBEN\s*(?::\s*boolean\s*)?=\s*true\b/.test(ohneKommentare(readFileSync(TEXT_MODUL, 'utf8')));
    const freigaben = existsSync('.claude/freigaben.md') ? readFileSync('.claude/freigaben.md', 'utf8') : '';
    expect(!an || /^.*NR27-Fachtexte.*Simon.*$/m.test(freigaben),
      'AE-NR27-13 verletzt: NORD_FACHTEXTE_FREIGEGEBEN = true ohne Zeile mit „NR27-Fachtexte“ und „Simon“ in .claude/freigaben.md. Fachliche Texte schaltet nur Simon frei (nach Fachprüfer). Erlaubter Weg: Schalter auf false lassen, bis Simon die Freigabe eingetragen hat.').toBe(true);
  });
});
