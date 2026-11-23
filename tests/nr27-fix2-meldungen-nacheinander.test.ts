import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/start';
import type { Spielstand } from '../src/core/typen';
import { echteSteuerung, tippe, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';

// NR27 Fix-Runde 2, Review Klein 1 (docs/pruefberichte/20261123-reviewer-paket-nr27-fix.md): Kommen während des Mini-Tutorials
// „Bahnquerung“ zwei Meldungen, ersetzte beim Nachholen die zweite sofort die erste – nur die letzte war zu lesen. Jetzt
// nacheinander: die zweite erst, wenn die erste ihre Zeit gestanden hat und ausgeblendet ist.
// Zeiten von Hand (design/tokens.json, DESIGN 12.17): Pause nach dem Tutorial 600 ms (NACH_TUTORIAL_MS in steuerung.ts);
// „Auftrag geschafft! +5 Dorftaler“ hat 31 Zeichen → 1000 + 60 × 31 = 2860 ms sichtbar, danach 200 ms Blende.
// Die zweite Meldung kommt also bei 600 + 2860 + 200 = 3660 ms nach [Später]. Muster: tests/nr27-fix-meldung.test.ts.

const T0 = 1_700_000_000_000;
const ERSTE = 'Auftrag geschafft! +5 Dorftaler';
const ZWEITE = 'Neuer Auftrag: Versorge drei Häuser.';
const norm = (s: string): string => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
type St = EchteUmgebung['st'] & { tick(t: number): void };

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

function stand(): Spielstand {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
  st.geld_eur = 2_000_000; st.taler = 100_000;
  st.abschnitt = { phase: 'offen', bau: null };
  return st;
}
const tut = (u: EchteUmgebung): El | null => u.dom.html.querySelector('#bahn-tutorial');
const knopfMitText = (w: El, t: string): El | undefined => w.querySelectorAll('button').find((k) => norm(k.textContent) === t);

describe('NR27 Fix 2 – zurückgehaltene Meldungen nacheinander', () => {
  // Fehler, der ihn rot macht: alle zurückgehaltenen Meldungen werden im selben Augenblick gezeigt (die letzte ersetzt die
  // erste), oder die zweite kommt, bevor die erste ihre Lesezeit gestanden hat.
  it('test_nr27_fix2_zwei_meldungen_nacheinander_nach_spaeter', async () => {
    const sp = new Spiel(stand(), () => T0);
    sp.neuBerechnen(); sp.ereignisse.splice(0);
    await echteSteuerung(sp, (u) => {
      const s = u.st as St;
      s.tick(T0); vi.advanceTimersByTime(20_000); s.tick(T0);
      expect(tut(u), 'Testaufbau: Mini-Tutorial offen').not.toBeNull();
      sp.ereignisse.push({ art: 'hinweis', text: ERSTE } as never, { art: 'hinweis', text: ZWEITE } as never);
      s.tick(T0);
      tippe(knopfMitText(tut(u)!, 'Später')!);
      expect(tut(u)).toBeNull();
      vi.advanceTimersByTime(600);
      expect(u.meldung(), 'nach der Pause steht die erste').toBe(ERSTE);
      vi.advanceTimersByTime(2_800); // 3400 ms: die erste hat ihre 2860 ms noch nicht ganz gestanden
      expect(u.meldung()).toBe(ERSTE);
      expect(u.meldungen).not.toContain(ZWEITE);
      vi.advanceTimersByTime(200); // 3600 ms: Lesezeit vorbei (3460), Blende noch nicht (3660)
      expect(u.meldung()).toBe(ERSTE);
      vi.advanceTimersByTime(100); // 3700 ms: nach Lesezeit und Blende
      expect(u.meldung()).toBe(ZWEITE);
      expect(u.meldungen.filter((m) => m === ERSTE || m === ZWEITE)).toEqual([ERSTE, ZWEITE]);
    }, { breite: 667, hoehe: 375 });
  });
});
