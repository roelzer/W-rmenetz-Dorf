import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Bauplan docs/bauplaene/NR18-ohne-autoanschluss.md, Fassung 3. Die Regeln lesen Dateien, sie führen keinen Code aus.
// F1 (AE-NR13-1): Spielstart an genau einer Stelle, start.ts ohne Kreis zu spiel.ts.
// F2 (AE-NR13-2): a) „schritt“ erzeugt nur der Kern; b) „tipp“ (Oberflächen-Kanal) nie der Kern;
//    c) Tutorial-Dateien rechnen keine Spielregel nach; d) Schritt/Tipp an einer Stelle, wörtlich wie Abschnitt 5.4.
// F3 (AE-NR19-2): „Station reicht?“ an genau einer Stelle (greift, sobald netz.ts stationReicht exportiert).

const ohneKommentare = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const lesen = (f: string): string => ohneKommentare(readFileSync(f, 'utf8'));
const norm = (f: string): string => f.replace(/\\/g, '/');
function dateien(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? dateien(p) : p.endsWith('.ts') ? [p] : [];
  });
}
const importe = (f: string): string[] => [...lesen(f).matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

/** Bauplan 5.4 – die einzigen erlaubten Namen. TIPPS ergänzt um 'farbknopf' und 'abgehoben' (NR20-22 §5, Paket P0). */
const SCHRITTE = ['abschnitt_geplant', 'abschnitt_offen', 'leitung_gezeichnet', 'haus_erreicht', 'haus_getrennt', 'station_gekauft',
  'abschnitt_abgeschlossen', 'material_bestellt', 'abschnitt_gebaut', 'haus_warm'];
const TIPPS = ['heizzentrale', 'baumenue', 'reiter_leitungen', 'leitungskarte', 'haus', 'weiter', 'daneben',
  'farbknopf', 'abgehoben'];
const VERTRAG = 'src/core/tutorial-vertrag.ts';
/** Werte eines String-Literal-Typs `export type Name = | 'a' | 'b';` */
function literale(quelle: string, name: string): string[] | null {
  const m = new RegExp(`export\\s+type\\s+${name}\\s*=([^;]*);`).exec(quelle);
  return m ? [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]) : null;
}

describe('NR18 Fassung 3: Struktur', { timeout: 30000 }, () => {
  it('F1: neuerSpielstand ist in src genau einmal definiert (spiel.ts oder start.ts); start.ts importiert nicht ./spiel', () => {
    const orte = dateien('src').map(norm).filter((f) => /\bfunction\s+neuerSpielstand\s*\(/.test(lesen(f)));
    expect(orte).toHaveLength(1);
    expect(['src/core/spiel.ts', 'src/core/start.ts']).toContain(orte[0]);
    const imp = existsSync('src/core/start.ts') ? importe('src/core/start.ts') : [];
    expect(imp.filter((i) => i === './spiel')).toEqual([]);
  });

  it("F2a: Ereignisse { art: 'schritt' } entstehen nur in src/core", () => {
    const fremd = dateien('src').map(norm).filter((f) => !f.startsWith('src/core/') && /art\s*:\s*['"]schritt['"]/.test(lesen(f)));
    expect(fremd).toEqual([]);
  });

  it("F2b: Der Oberflächen-Kanal { art: 'tipp' } entsteht nie in src/core", () => {
    const kern = dateien('src/core').map(norm).filter((f) => f !== VERTRAG && /art\s*:\s*['"]tipp['"]/.test(lesen(f)));
    expect(kern).toEqual([]);
  });

  it('F2c: Dateien mit „tutorial“ im Namen rechnen keine Spielregel nach (kein Import von netz/engstelle, kein berechneNetz; Ausnahme N4)', () => {
    const verstoesse: string[] = [];
    // Einzige Ausnahme (NR20-22 §4 N4, AE-NR21-1, Paket P1): tutorial-netz.ts darf genau ./netz importieren
    // (für leitungsNachbarn). engstelle und berechneNetz/engstellenFinden bleiben auch dort verboten; N4 prüft die Datei eng.
    const ausnahme = (f: string, i: string): boolean => f === 'src/core/tutorial-netz.ts' && i === './netz';
    for (const f of dateien('src').map(norm).filter((x) => /tutorial/i.test(basename(x)))) {
      for (const i of importe(f)) if (/(^|\/)(netz|engstelle)$/.test(i) && !ausnahme(f, i)) verstoesse.push(`${f}: importiert ${i}`);
      if (/\b(berechneNetz|engstellenFinden)\s*\(/.test(lesen(f))) verstoesse.push(`${f}: rechnet selbst`);
    }
    expect(verstoesse).toEqual([]);
  });

  it('F2d: Schritt und Tipp stehen nur in tutorial-vertrag.ts, wörtlich wie Bauplan 5.4; die Datei enthält nur Typen (greift ab der Datei)', () => {
    const definiert = dateien('src').map(norm).filter((f) => /export\s+type\s+(Schritt|Tipp)\b/.test(lesen(f)));
    if (!existsSync(VERTRAG)) { expect(definiert).toEqual([]); return; }
    expect(definiert).toEqual([VERTRAG]);
    const q = lesen(VERTRAG);
    expect(literale(q, 'Schritt')).toEqual(SCHRITTE);
    expect(literale(q, 'Tipp')).toEqual(TIPPS);
    expect(importe(VERTRAG).filter((i) => i !== './katalog')).toEqual([]);
    expect(/\b(function|class|const|let|var)\b/.test(q)).toBe(false);
  });

  it('F3: außerhalb von netz.ts und katalog.ts vergleicht kein Code leistung_kw mit einem Bedarf (greift ab stationReicht)', () => {
    if (!/export\s+function\s+stationReicht\s*\(/.test(lesen('src/core/netz.ts'))) return;
    const verstoesse: string[] = [];
    for (const f of dateien('src').map(norm)) {
      if (f === 'src/core/netz.ts' || f === 'src/core/katalog.ts') continue;
      lesen(f).split('\n').forEach((zeile, i) => {
        for (const m of zeile.matchAll(/([\w.()]+)\s*(<=|>=|<|>)\s*([\w.()]+)/g)) {
          const links = m[1].includes('leistung_kw'), rechts = m[3].includes('leistung_kw');
          if (links !== rechts) verstoesse.push(`${f}:${i + 1}: ${m[0]}`);
        }
      });
    }
    expect(verstoesse).toEqual([]);
  });
});
