import { describe, expect, it } from 'vitest';
import { berechneNetz, istKunde } from '../src/core/netz';
import { KATALOG } from '../src/core/katalog';
import { berechneNetzAlt } from './hilfen/netz-alt-a91';
import { zufallsNetz } from './hilfen/a91-netze';

// A91 P1 (Bauplan NR15, Fassung 3 Nachtrag 1): Die neue Anschlusswahl muss auf den 3.000 Zufallsnetzen aus P0 tatsächlich
// greifen – sonst prüft der Vergleichstest (tests/a91-vergleich.test.ts) nur „alt gegen alt“. Mindestzahlen aus dem Bauplan
// (Prototyp: 375 Netze mit Wechsel, 37 Großabnehmer-Wechsel).

describe('A91 P1 – Wirkung im Generator', () => {
  it('A91: test_a91_p1_wirkt_im_generator', () => {
    let netzeMitWechsel = 0, grossWechsel = 0;
    for (let seed = 1; seed <= 3000; seed++) {
      const { objekte, innen, vorlauf_c } = zufallsNetz(seed);
      const alt = berechneNetzAlt(objekte, innen, 2, vorlauf_c);
      const neu = berechneNetz(objekte, innen, 2, vorlauf_c);
      let gewechselt = false;
      for (const o of objekte) {
        if (!istKunde(o) || alt.anschluss.get(o.id)?.feld === neu.anschluss.get(o.id)?.feld) continue;
        gewechselt = true;
        if (KATALOG[o.typ].kategorie === 'gross') grossWechsel++;
      }
      if (gewechselt) netzeMitWechsel++;
    }
    expect(netzeMitWechsel).toBeGreaterThanOrEqual(100);
    expect(grossWechsel).toBeGreaterThanOrEqual(30);
  }, 60_000);
});
