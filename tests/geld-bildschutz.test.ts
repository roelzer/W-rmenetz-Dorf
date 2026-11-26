import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bildSchritte, fehlerMelder, FEHLER_SPIELERHINWEIS } from '../src/bildschutz';

// Spielerbericht 26.11. „seit 3 Tagen kein Geld mehr“, Risiko 2: Warf in der Bildschleife (src/main.ts) Zeichnen oder
// steuerung.tick einmal einen Fehler, wurde kein neues Bild mehr angefordert: Die Spielzeit stand, keine Einnahmen.
// Erwartung: Spielkern zuerst, jeder Schritt in eigenem Schutz, das nächste Bild wird immer angefordert, Fehler werden
// sichtbar protokolliert (console.error je Bereich höchstens einmal je Minute) und dem Spieler höchstens einmal je Minute gemeldet.

/** Melder mit Protokoll- und Spielerliste und stellbarer Uhr. */
function melder() {
  const uhr = { t: 0 };
  const protokoll: Array<[string, unknown]> = [];
  const spieler: string[] = [];
  const melden = fehlerMelder({ jetzt_ms: () => uhr.t, protokoll: (text, f) => protokoll.push([text, f]), spieler: (t) => spieler.push(t) });
  return { uhr, protokoll, spieler, melden };
}

describe('Risiko 2: Bildschleife läuft trotz Fehler weiter', () => {
  it('Darstellung wirft: Kern und Steuerung liefen vorher, nächstes Bild wird angefordert, Fehler gemeldet', () => {
    const { protokoll, spieler, melden } = melder();
    const lauf: string[] = [];
    const fehler = new Error('Zeichnen kaputt');
    bildSchritte([
      ['Spielkern', () => lauf.push('kern')],
      ['Steuerung', () => lauf.push('steuerung')],
      ['Darstellung', () => { throw fehler; }],
    ], melden, () => lauf.push('naechstes'));
    expect(lauf).toEqual(['kern', 'steuerung', 'naechstes']);
    expect(protokoll).toEqual([['Bildschleife: Fehler in Darstellung', fehler]]);
    expect(spieler).toEqual([FEHLER_SPIELERHINWEIS]);
  });

  it('Kern wirft: Steuerung und Darstellung laufen trotzdem, nächstes Bild wird angefordert', () => {
    const { protokoll, melden } = melder();
    const lauf: string[] = [];
    bildSchritte([
      ['Spielkern', () => { throw new Error('Kern'); }],
      ['Steuerung', () => lauf.push('steuerung')],
      ['Darstellung', () => lauf.push('darstellung')],
    ], melden, () => lauf.push('naechstes'));
    expect(lauf).toEqual(['steuerung', 'darstellung', 'naechstes']);
    expect(protokoll.map(([t]) => t)).toEqual(['Bildschleife: Fehler in Spielkern']);
  });

  it('auch wenn das Melden selbst scheitert, wird das nächste Bild angefordert (finally)', () => {
    const lauf: string[] = [];
    expect(() => bildSchritte([['Darstellung', () => { throw new Error('a'); }]], () => { throw new Error('Melden kaputt'); }, () => lauf.push('naechstes')))
      .toThrow('Melden kaputt');
    expect(lauf).toEqual(['naechstes']);
  });

  it('ohne Fehler: nichts protokolliert, nichts gemeldet', () => {
    const { protokoll, spieler, melden } = melder();
    let n = 0;
    bildSchritte([['Spielkern', () => n++]], melden, () => n++);
    expect(n).toBe(2);
    expect(protokoll).toEqual([]);
    expect(spieler).toEqual([]);
  });

  it('Drosselung: derselbe Fehler in jedem Bild wird je Bereich einmal je Minute protokolliert, mit Zahl der unterdrückten', () => {
    const { uhr, protokoll, melden } = melder();
    const f = new Error('immer');
    for (uhr.t = 0; uhr.t < 60_000; uhr.t += 16) melden('Darstellung', f);
    expect(protokoll.length).toBe(1);
    // 60.000 / 16 = 3.750 Bilder in der ersten Minute, das erste davon wurde protokolliert
    uhr.t = 60_000; melden('Darstellung', f);
    expect(protokoll.length).toBe(2);
    expect(protokoll[1][0]).toBe('Bildschleife: Fehler in Darstellung (3749 weitere seit der letzten Meldung)');
  });

  it('Drosselung je Bereich: ein neuer Bereich wird sofort protokolliert', () => {
    const { uhr, protokoll, melden } = melder();
    melden('Darstellung', new Error('a'));
    uhr.t = 100; melden('Steuerung', new Error('b'));
    expect(protokoll.map(([t]) => t)).toEqual(['Bildschleife: Fehler in Darstellung', 'Bildschleife: Fehler in Steuerung']);
  });

  it('Spielermeldung höchstens einmal je Minute, über alle Bereiche (Grenze genau 60 s)', () => {
    const { uhr, spieler, melden } = melder();
    melden('Darstellung', new Error('a'));
    uhr.t = 59_999; melden('Steuerung', new Error('b'));
    expect(spieler.length).toBe(1);
    uhr.t = 60_000; melden('Darstellung', new Error('c'));
    expect(spieler.length).toBe(2);
  });

  it('Spielerhinweis lautet wie vorgegeben', () => {
    expect(FEHLER_SPIELERHINWEIS).toBe('Ein Fehler wurde abgefangen – das Spiel läuft weiter.');
  });

  it('main.ts nutzt den Schutz: Kern zuerst, Darstellung eigener Schritt, nächstes Bild über bildSchritte (Quelltext)', () => {
    const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(main).toMatch(/from '\.\/bildschutz'/);
    const kern = main.indexOf("['Spielkern'"), steuerung = main.indexOf("['Steuerung'"), darstellung = main.indexOf("['Darstellung'");
    expect(kern).toBeGreaterThan(0);
    expect(kern).toBeLessThan(steuerung);
    expect(steuerung).toBeLessThan(darstellung);
    expect(main).toMatch(/bildSchritte\([\s\S]*?, fehlerMelden, \(\) => requestAnimationFrame\(bild\)\)/);
    expect(main).toContain('console.error');
  });
});
