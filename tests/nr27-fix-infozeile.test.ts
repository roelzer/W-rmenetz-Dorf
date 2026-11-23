import { describe, expect, it } from 'vitest';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import { El } from './hilfen/dom-attrappe';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';

// NR27 Fix-Runde M2 (docs/pruefberichte/20261123-designer-treue-nr27.md): Die Infozeile zur Bahnquerung klebte unter den Knöpfen;
// sie gehört direkt unter „Eingezeichnet … Kosten …“ (DESIGN 14.5). Reihenfolge im Kasten „Bauabschnitt“, Phase „offen“:
// .abschnitt-kurz < .bahn-info < details.abschnitt-hilfe < erste .knopfreihe (Dokumentreihenfolge).

const T0 = 1_700_000_000_000;

function spiel(querung: boolean): Spiel {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
  st.geld_eur = 10_000_000; st.taler = 10_000;
  st.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(st, () => T0);
  if (querung) for (const y of [-1, -2, -3]) expect(sp.platzieren('d90', 10, y), `Testaufbau (10|${y})`).toEqual({ ok: true });
  sp.neuBerechnen();
  sp.ereignisse.splice(0);
  return sp;
}
function dokumentReihe(e: El): El[] {
  const alle: El[] = [];
  for (const k of e.kinder) if (k instanceof El) alle.push(k, ...dokumentReihe(k));
  return alle;
}
function positionen(u: EchteUmgebung): Record<string, number> {
  const kasten = u.dom.html.querySelectorAll('[data-ziel="kasten_abschnitt"]')[0];
  expect(kasten, 'Kasten Bauabschnitt').toBeDefined();
  const reihe = dokumentReihe(kasten);
  const erst = (p: (e: El) => boolean): number => reihe.findIndex(p);
  const hat = (e: El, k: string): boolean => e.klassen().includes(k);
  return {
    kurz: erst((e) => hat(e, 'abschnitt-kurz')),
    info: erst((e) => hat(e, 'bahn-info')),
    hilfe: erst((e) => e.tag.toLowerCase() === 'details' && hat(e, 'abschnitt-hilfe')),
    knoepfe: erst((e) => hat(e, 'knopfreihe')),
  };
}

describe('NR27 Fix M2 – Infozeile unter der Kostenzeile', () => {
  // Fehler, der ihn rot macht: Infozeile wird weiter am Ende des Kastens angehängt (nach den Knöpfen) oder nach den Tipps.
  for (const querung of [false, true]) {
    it(`test_nr27_fix_m2_reihenfolge_offen_${querung ? 'mit' : 'ohne'}_bahnfeld`, async () => {
      await echteSteuerung(spiel(querung), (u) => {
        u.st.katalog('netz');
        const p = positionen(u);
        for (const [name, i] of Object.entries(p)) expect(i, `${name} vorhanden`).toBeGreaterThanOrEqual(0);
        expect(p.kurz).toBeLessThan(p.info);
        expect(p.info).toBeLessThan(p.hilfe);
        expect(p.hilfe).toBeLessThan(p.knoepfe);
      });
    });
  }
});
