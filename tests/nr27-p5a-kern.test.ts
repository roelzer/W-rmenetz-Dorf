import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nordHinweisText, nordText } from '../src/core/nord-texte';
import { neuerSpielstand, Spiel } from '../src/core/spiel';

// NR27 P5a, Review-Punkte (a) und (b): ein einziger Abruf für Texte, die nie Fachtext sein dürfen, und der Nord-Sperrgrund
// für alle Felder eines großen Objekts.
const T0 = 1_700_000_000_000;

function spiel(stufe: number): Spiel {
  const s = neuerSpielstand(T0);
  s.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  s.geld_eur = 1_000_000; s.taler = 10_000;
  const sp = new Spiel(s, () => T0);
  sp.ereignisse.splice(0);
  return sp;
}

describe('NR27 P5a – nordHinweisText (Review-Punkt a)', () => {
  // Fehler, die ihn rot machen: Fachtext käme als null oder Text durch statt zu werfen; Platzhalter würden nicht gefüllt.
  it('liefert Spieltexte wie nordText und füllt Platzhalter', () => {
    expect(nordHinweisText('GLEISE')).toBe('Auf den Gleisen kann nichts gebaut werden.');
    expect(nordHinweisText('Q2', { sperrgrund: 'ab Heizzentrale Stufe 6' })).toBe('Über die Bahn geht es erst mit einer Bahnquerung – ab Heizzentrale Stufe 6');
  });
  it('wirft bei einem Fachtext mit der Kennung in der Meldung', () => {
    expect(() => nordHinweisText('KARTE_1')).toThrow(/KARTE_1/);
    expect(() => nordHinweisText('WISSEN_A')).toThrow(/Fachtext/);
  });
  it('spiel.ts und nordviertel.ts haben keine eigene Kopie der Hilfsfunktion mehr', () => {
    const spielQuelle = readFileSync('src/core/spiel.ts', 'utf8'), nordQuelle = readFileSync('src/core/nordviertel.ts', 'utf8');
    expect(spielQuelle).not.toMatch(/const nordHinweis\b/);
    expect(nordQuelle).not.toMatch(/const text = /);
    expect(nordQuelle).toContain('nordHinweisText(');
  });
});

describe('NR27 P5a – platzieren prüft die Nordsperre für jedes Feld (Review-Punkt b)', () => {
  // Fehler, der ihn rot macht: nur das Ursprungsfeld wird geprüft → „Hier ist kein Platz“ statt GLEISE.
  it('2×2-Objekt auf (5|−4) nach der Erschließung ragt auf die Gleise → GLEISE', () => {
    const sp = spiel(6);
    sp.stand.nordviertel = true;
    expect(sp.platzieren('solar', 5, -4)).toEqual({ ok: false, hinweis: nordText('GLEISE') });
  });
  it('vor der Erschließung meldet das erste Feld (hinter der Bahn) HINTER', () => {
    const sp = spiel(6);
    expect(sp.platzieren('solar', 5, -4)).toEqual({ ok: false, hinweis: nordText('HINTER') });
  });
  it('2×2-Objekt auf dem Grünstreifen (5|−1) bleibt erlaubt', () => {
    const sp = spiel(6);
    expect(sp.platzieren('solar', 5, -1).hinweis).not.toBe(nordText('GLEISE'));
  });
});
