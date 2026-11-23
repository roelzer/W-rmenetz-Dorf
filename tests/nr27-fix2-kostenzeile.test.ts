import { describe, expect, it } from 'vitest';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import { El } from './hilfen/dom-attrappe';
import { echteSteuerung } from './hilfen/echte-steuerung';

// NR27 Fix-Runde 2, Produktabnahme Befund 2 (docs/pruefberichte/20261123-produktabnahme-nr27.md): Nach „Abschnitt
// abschließen“ (Phase „bestellen“) stand „davon Bahnquerung … · Bauzeit +…“ unter den Knöpfen und war bei 844×390 und
// 667×375 nur nach Scrollen zu sehen. Sie gehört direkt unter die Kostenangabe, vor die Knöpfe – wie in der Phase „offen“
// (tests/nr27-fix-infozeile.test.ts). Erwartet von Hand: 2 Gleisfelder × 45.000 € = 90.000 €.

const T0 = 1_700_000_000_000;
const norm = (s: string): string => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function spielBestellen(): Spiel {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
  st.geld_eur = 10_000_000; st.taler = 10_000;
  st.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(st, () => T0);
  for (const y of [-1, -2, -3]) expect(sp.platzieren('d90', 10, y), `Testaufbau (10|${y})`).toEqual({ ok: true });
  sp.abschnittAbschliessen();
  expect(sp.abschnitt?.phase, 'Testaufbau: Phase bestellen').toBe('bestellen');
  sp.neuBerechnen();
  sp.ereignisse.splice(0);
  return sp;
}
function dokumentReihe(e: El): El[] {
  const alle: El[] = [];
  for (const k of e.kinder) if (k instanceof El) alle.push(k, ...dokumentReihe(k));
  return alle;
}

describe('NR27 Fix 2 – Kostenzeile der Querung beim Bestellen über den Knöpfen', () => {
  // Fehler, der ihn rot macht: die Infozeile wird in der Phase „bestellen“ weiter ans Ende des Kastens gehängt (nach den Knöpfen).
  it('test_nr27_fix2_kostenzeile_bestellen_vor_knoepfen', async () => {
    await echteSteuerung(spielBestellen(), (u) => {
      u.st.katalog('netz');
      const kasten = u.dom.html.querySelectorAll('[data-ziel="kasten_abschnitt"]')[0];
      expect(kasten, 'Kasten Bauabschnitt').toBeDefined();
      const reihe = dokumentReihe(kasten);
      const info = reihe.findIndex((e) => e.klassen().includes('bahn-info'));
      const knoepfe = reihe.findIndex((e) => e.klassen().includes('knopfreihe'));
      const kosten = reihe.findIndex((e) => e.tag.toLowerCase() === 'p' && e.textContent.includes('Leitungsfelder'));
      expect(info, 'Infozeile vorhanden').toBeGreaterThanOrEqual(0);
      expect(norm(reihe[info].textContent)).toContain('davon Bahnquerung 90.000 €');
      expect(knoepfe, 'Knopfreihe vorhanden').toBeGreaterThanOrEqual(0);
      expect(kosten, 'Kostenangabe vorhanden').toBeGreaterThanOrEqual(0);
      expect(kosten).toBeLessThan(info);
      expect(info).toBeLessThan(knoepfe);
    });
  });
});
