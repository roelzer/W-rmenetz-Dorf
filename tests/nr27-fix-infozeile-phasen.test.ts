import { describe, expect, it } from 'vitest';
import { KONSTANTEN } from '../src/core/katalog';
import { NORD_TEXTE } from '../src/core/nord-texte';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import type { Spielstand } from '../src/core/typen';
import { echteSteuerung } from './hilfen/echte-steuerung';

// NR27 Fix-Runde M2, Gegenstück zu tests/nr27-fix-infozeile.test.ts: Die Infozeile rückt nur in der Phase „offen“ unter die
// Kostenzeile. Ohne Abschnitt und beim Bestellen bleibt sie im Kasten „Bauabschnitt“ – beim Umstellen darf sie dort nicht
// verloren gehen. Erwarteter Text von Hand: KATALOG_PREIS mit 45.000 € je Gleisfeld (Spielwert in KONSTANTEN).

const T0 = 1_700_000_000_000;
const norm = (s: string): string => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const PREISZEILE = NORD_TEXTE.KATALOG_PREIS.text.replace('{preis}', '45.000 €');

function spiel(abschnitt: Spielstand['abschnitt']): Spiel {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
  st.geld_eur = 10_000_000; st.taler = 10_000;
  st.abschnitt = abschnitt;
  const sp = new Spiel(st, () => T0);
  sp.neuBerechnen();
  sp.ereignisse.splice(0);
  return sp;
}

describe('NR27 Fix M2 – Infozeile in den übrigen Phasen', () => {
  // Fehler, der ihn rot macht: die Infozeile wird nur noch in der Phase „offen“ eingefügt und fehlt sonst ganz.
  for (const [name, abschnitt] of [['ohne_abschnitt', null], ['bestellen', { phase: 'bestellen', bau: null }]] as const) {
    it(`test_nr27_fix_m2_infozeile_${name}`, async () => {
      expect(KONSTANTEN.querung_eur_je_feld, 'Testaufbau: Spielwert').toBe(45_000);
      await echteSteuerung(spiel(abschnitt as Spielstand['abschnitt']), (u) => {
        u.st.katalog('netz');
        const kasten = u.dom.html.querySelectorAll('[data-ziel="kasten_abschnitt"]')[0];
        expect(kasten, 'Kasten Bauabschnitt').toBeDefined();
        const info = kasten.querySelectorAll('.bahn-info');
        expect(info.length).toBe(1);
        expect(norm(info[0].textContent)).toBe(PREISZEILE);
      });
    });
  }
});
