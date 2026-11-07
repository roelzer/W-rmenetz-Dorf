import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { echteSteuerung } from './hilfen/echte-steuerung';
import { ZUG_HAUS1, abheben, bisT13h, knopfMitId, neuesSpiel, st, wischeFelder } from './hilfen/tutorial-zug';

// Paket P5f-3 (DESIGN 13.17.9 F8 sinngemäß, ENTSCHEIDUNGEN 2026-11-07 „P5f-2c“): Auch Zeile 2 von [Abschnitt abschließen]
// wechselt erst beim Abheben, wie Satz, Ringe, Zielscheibe, Raute, Band und Streifen.

// Wörtlich aus src/core/tutorial.ts (KURZ_EIN_HAUS mit geschütztem Leerzeichen vor „Haus“, KURZ_WEG)
const KURZ_EIN_HAUS = 'noch 1\u00a0Haus fehlt';
const KURZ_WEG = 'Stück muss weg';
// Eigener Abgang zu Haus 2 direkt unter der Heizzentrale (DESIGN 13.17.8, Beispiel (12|12)→(12|13))
const EIGENER_ABGANG: ReadonlyArray<readonly [number, number]> = [[12, 12], [12, 13]];

type U = Parameters<Parameters<typeof echteSteuerung>[1]>[0];
type Anleitung = { sperre(b: string): { kurz: string } | null };
const zeile2 = (u: U): string => knopfMitId(u, 'abschliessen')?.querySelector('small')?.textContent ?? '';
const kernSperreKurz = (u: U): string | null => ((u.st as unknown as { anleitung: Anleitung | null }).anleitung?.sperre('abschliessen')?.kurz ?? null);

describe('P5f-3: Knopfzeile von [Abschnitt abschließen] im Zug halten', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('eigener Abgang im Zug: Zeile 2 bleibt „noch 1 Haus fehlt“, erst nach dem Abheben „Stück muss weg“', async () => {
    const uhr = { t: 1_000_000 }, spiel = neuesSpiel(uhr);
    await echteSteuerung(spiel, (u) => {
      bisT13h(u, spiel, uhr);
      wischeFelder(u, ZUG_HAUS1); st(u).tick(uhr.t);
      expect(zeile2(u), 'vor dem Zug: Haus 1 richtig, Haus 2 fehlt').toBe(KURZ_EIN_HAUS);
      wischeFelder(u, EIGENER_ABGANG, false);
      expect(kernSperreKurz(u), 'Vorprobe: der Kern sperrt im Zug schon mit „Stück muss weg“').toBe(KURZ_WEG);
      expect(zeile2(u), 'im Zug direkt nach dem Strich').toBe(KURZ_EIN_HAUS);
      st(u).tick(uhr.t);
      expect(zeile2(u), 'im Zug nach dem nächsten Bild').toBe(KURZ_EIN_HAUS);
      abheben(u, EIGENER_ABGANG[1]);
      expect(zeile2(u), 'beim Abheben').toBe(KURZ_WEG);
    }, { uhr: () => uhr.t });
  });
});
