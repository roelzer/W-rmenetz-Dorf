import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NORD_TEXTE } from '../src/core/nord-texte';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/start';
import type { Spielstand } from '../src/core/typen';
import { echteSteuerung, tippe, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';

// NR27 Fix-Runde (docs/pruefberichte/20261123-designer-treue-nr27.md):
// M6 – Erfolgsmoment: Beim Fertigwerden der Querung steht F1 als Meldung („Abschnitt fertig“ darf F1 nicht verdrängen), auch
//      bei „Weniger Bewegung“. Wache für ein Verhalten, das heute schon stimmt.
// M8 – Solange das Mini-Tutorial „Bahnquerung“ offen ist, wird eine Meldung („Auftrag geschafft …“) zurückgehalten und erst nach
//      dem Schließen gezeigt (nachTutorial-Muster). Muster Mini-Tutorial mit Fake-Timern: tests/nr27-p5a4-ui.test.ts.

const T0 = 1_700_000_000_000;
const F1 = 'Bahnquerung fertig! Die Häuser hinter der Bahn kannst du jetzt anschließen.';
const norm = (s: string): string => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
type St = EchteUmgebung['st'] & { tick(t: number): void };
type Uhr = { t: number };

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

function stand(): Spielstand {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
  st.geld_eur = 2_000_000; st.taler = 100_000;
  st.abschnitt = { phase: 'offen', bau: null };
  return st;
}

describe('NR27 Fix M6 – Erfolgsmoment zeigt F1', () => {
  for (const bewegung of ['normal', 'einstellung'] as const) {
    // Fehler, der ihn rot macht: „Bauabschnitt fertig …“ (oder eine andere Meldung im selben Bild) überschreibt F1; oder F1 fehlt
    // bei „Weniger Bewegung“, weil es am Effekt hängt.
    it(`test_nr27_fix_m6_querung_fertig_meldung_f1_${bewegung}`, async () => {
      expect(NORD_TEXTE.F1.text).toBe(F1);
      const uhr: Uhr = { t: T0 };
      const st = stand();
      st.bahn_hilfe_gesehen = true; // Mini-Tutorial ist nicht Gegenstand dieses Tests
      const sp = new Spiel(st, () => uhr.t);
      for (const y of [-1, -2, -3]) expect(sp.platzieren('d90', 10, y), `(10|${y})`).toEqual({ ok: true });
      expect(sp.abschnittAbschliessen().ok).toBe(true);
      expect(sp.materialBestellen()).toEqual({ ok: true });
      const ende = sp.stand.abschnitt!.bau!.ende_ms;
      sp.ereignisse.splice(0);
      await echteSteuerung(sp, (u) => {
        const s = u.st as St;
        s.tick(uhr.t); vi.advanceTimersByTime(20_000); s.tick(uhr.t); // erste Bilder: Auftragsmeldungen abklingen lassen
        // Kurz vor dem Bauende einmal ticken (die lange Bauzeit zählt sonst als Abwesenheit und bringt die Offline-Meldung
        // „Während du weg warst …“), Meldung abklingen lassen, dann genau auf ende_ms.
        uhr.t = ende - 1;
        s.tick(uhr.t);
        expect(sp.stand.nordviertel, 'Testaufbau: vor ende_ms noch nicht erschlossen').toBeUndefined();
        vi.advanceTimersByTime(20_000);
        uhr.t = ende;
        s.tick(uhr.t);
        expect(sp.stand.nordviertel, 'Testaufbau: erschlossen').toBe(true);
        expect(u.meldung()).toBe(F1);
      }, { uhr: () => uhr.t, bewegung });
    });
  }
});

describe('NR27 Fix M8 – Meldung wartet, solange das Mini-Tutorial offen ist', () => {
  const AUFTRAG = 'Auftrag geschafft! +5 Dorftaler';
  const tut = (u: EchteUmgebung): El | null => u.dom.html.querySelector('#bahn-tutorial');
  const knopfMitText = (w: El, t: string): El | undefined => w.querySelectorAll('button').find((k) => norm(k.textContent) === t);

  // Fehler, der ihn rot macht: die Meldung erscheint sofort über den Tutorial-Knöpfen (bei 667×375 verdeckt sie [Später]).
  it('test_nr27_fix_m8_meldung_zurueckgehalten_solange_tutorial_offen', async () => {
    const sp = new Spiel(stand(), () => T0);
    sp.neuBerechnen(); sp.ereignisse.splice(0);
    await echteSteuerung(sp, (u) => {
      const s = u.st as St;
      s.tick(T0); vi.advanceTimersByTime(20_000); s.tick(T0);
      expect(tut(u), 'Testaufbau: Mini-Tutorial offen').not.toBeNull();
      sp.ereignisse.push({ art: 'hinweis', text: AUFTRAG } as never);
      s.tick(T0);
      expect(tut(u)).not.toBeNull();
      expect(u.meldung()).not.toBe(AUFTRAG);
      vi.advanceTimersByTime(1_000); s.tick(T0);
      expect(tut(u)).not.toBeNull();
      expect(u.meldung()).not.toBe(AUFTRAG);
    }, { breite: 667, hoehe: 375 });
  });

  // Fehler: die zurückgehaltene Meldung geht verloren (wird verworfen statt nachgeholt).
  it('test_nr27_fix_m8_meldung_nach_spaeter_nachgeholt', async () => {
    const sp = new Spiel(stand(), () => T0);
    sp.neuBerechnen(); sp.ereignisse.splice(0);
    await echteSteuerung(sp, (u) => {
      const s = u.st as St;
      s.tick(T0); vi.advanceTimersByTime(20_000); s.tick(T0);
      expect(tut(u), 'Testaufbau: Mini-Tutorial offen').not.toBeNull();
      sp.ereignisse.push({ art: 'hinweis', text: AUFTRAG } as never);
      s.tick(T0);
      tippe(knopfMitText(tut(u)!, 'Später')!);
      expect(tut(u)).toBeNull();
      vi.advanceTimersByTime(1_000); s.tick(T0); vi.advanceTimersByTime(1_000);
      expect(u.meldungen).toContain(AUFTRAG);
      expect(u.meldung()).toBe(AUFTRAG);
    }, { breite: 667, hoehe: 375 });
  });
});
