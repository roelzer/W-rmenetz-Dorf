import { describe, expect, it } from 'vitest';
import { istLeitung } from '../src/core/katalog';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/start';
import type { Spielstand } from '../src/core/typen';
import { sichtbar, sichtbarerText, type El } from './hilfen/dom-attrappe';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';

// NR27 Fix-Runde 2, Review Klein 4 (docs/pruefberichte/20261123-reviewer-paket-nr27-fix.md): Die Regel „eine geplante Leitung
// eines bestellten (Phase „bau“) oder gerade geplanten (Phase „planung“) Abschnitts lässt sich nicht entfernen“ stand doppelt
// (Kern und Leitungsblatt). Jetzt eine Kernabfrage `abschnittSperrtEntfernen`, die beide nutzen; Phase „planung“ war ungetestet.
// Muster: tests/nr27-fix-antippen-bau.test.ts.

const T0 = 1_700_000_000_000;
const sichtbareEntfernen = (u: EchteUmgebung): El[] => u.knoepfe().filter((k) => sichtbar(k) && /entfernen/i.test(sichtbarerText(k)));

/** Drei geplante Leitungen (10|−1 … −3) im offenen Abschnitt, danach die gewünschte Phase. */
function spielMitGeplanten(phase: 'offen' | 'planung' | 'bau'): Spiel {
  const s = neuerSpielstand(T0);
  s.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
  s.geld_eur = 2_000_000; s.taler = 100_000;
  s.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(s, () => T0);
  for (const y of [-1, -2, -3]) expect(sp.platzieren('d90', 10, y), `(10|${y})`).toEqual({ ok: true });
  if (phase !== 'offen') s.abschnitt = { phase, bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 600_000 } } as Spielstand['abschnitt'];
  sp.ereignisse.splice(0);
  return sp;
}
const geplante = (sp: Spiel) => sp.stand.objekte.filter((o) => istLeitung(o.typ) && o.geplant);

describe('NR27 Fix 2 – eine Regel für „nicht entfernen“ im festen Abschnitt', () => {
  // Fehler, der ihn rot macht: die Abfrage fehlt, oder sie kennt eine der Phasen nicht (z. B. nur „bau“).
  for (const [phase, gesperrt] of [['offen', false], ['planung', true], ['bau', true]] as const) {
    it(`test_nr27_fix2_kernabfrage_${phase}`, () => {
      const sp = spielMitGeplanten(phase);
      expect(geplante(sp).length, 'Testaufbau').toBe(3);
      for (const o of geplante(sp)) expect(sp.abschnittSperrtEntfernen(o), `(${o.x}|${o.y})`).toBe(gesperrt);
    });
  }

  // Fehler: gebaute Leitungen (nicht geplant) gelten auch als gesperrt – sie lassen sich in jeder Phase entfernen.
  it('test_nr27_fix2_kernabfrage_gebaute_leitung_frei', () => {
    const sp = spielMitGeplanten('planung');
    const gebaut = geplante(sp)[0];
    delete gebaut.geplant; // künstlich: eine fertige Leitung auf demselben Feld (das Startdorf hat keine)
    expect(sp.abschnittSperrtEntfernen(gebaut)).toBe(false);
  });

  // Fehler: der Kern entfernt in der Phase „planung“ eine geplante Leitung doch.
  it('test_nr27_fix2_planung_kern_lehnt_ab', () => {
    const sp = spielMitGeplanten('planung');
    const o = geplante(sp)[0];
    expect(sp.entfernen(o.id).ok).toBe(false);
    expect(sp.stand.objekte).toContain(o);
  });

  // Fehler: das Leitungsblatt bietet in der Phase „planung“ [Entfernen] an, das der Kern ablehnt.
  it('test_nr27_fix2_planung_blatt_ohne_entfernen', async () => {
    const sp = spielMitGeplanten('planung');
    await echteSteuerung(sp, (u) => {
      for (const o of geplante(sp)) {
        u.st.kontext(o.id);
        expect(sichtbareEntfernen(u).map((k) => sichtbarerText(k)), `Leitung (${o.x}|${o.y})`).toEqual([]);
        u.st.kontext(null);
      }
    });
  });
});
