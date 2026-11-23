import { describe, expect, it } from 'vitest';
import { NORD_TEXTE, type NordTextId } from '../src/core/nord-texte';
import { nordInfo } from '../src/core/nordviertel';
import { neuerSpielstand } from '../src/core/start';
import type { Spielstand } from '../src/core/typen';

// NR27 Fix-Runde (Tester-Vorarbeit Teil B, 2026-11-23). Quelle: docs/ENTSCHEIDUNGEN.md (Designer-Treue NR27 übernommen,
// Wortlaut Fachprüfer: TUTORIAL_2/EXPRESS „im Spiel“; „über die Gleise“ → „unter den Gleisen“, wo es das Bauen/Tippen nicht
// verfälscht) und docs/pruefberichte/20261123-designer-treue-nr27.md (M3: nordInfo kennt Q5 nicht).
// Die Texte lesen wir roh aus der Tabelle (NORD_TEXTE), Platzhalter wie {stufe} bleiben stehen – geprüft wird nur der Wortlaut.

const roh = (id: NordTextId): string => NORD_TEXTE[id].text;

describe('NR27 Fix – Wortlaut nach Fachprüfer', () => {
  // Fehler, der ihn rot macht: EXPRESS behauptet allgemein „lässt sich nicht beschleunigen“ (fachlich falsch, in echt geht es
  // mit Aufwand); oder der Satz wird anders formuliert als vom Projektleiter festgelegt.
  it('test_nr27_fix_express_genau_im_spiel', () => {
    expect(roh('EXPRESS')).toBe('Eine Bahnquerung lässt sich im Spiel nicht beschleunigen.');
  });

  // Fehler: TUTORIAL_2 behauptet ohne „im Spiel“, ein Rohrtausch koste die Querung in echt noch einmal.
  it('test_nr27_fix_tutorial2_im_spiel_rohrtausch', () => {
    expect(roh('TUTORIAL_2').toLowerCase()).toContain('im spiel kostet ein späterer rohrtausch dort die querung noch einmal');
  });

  // Fehler: Katalog- und Sperrtexte sprechen weiter von „über die Gleise“ (die Leitung liegt unter den Gleisen).
  for (const id of ['KATALOG_ZEILE', 'KATALOG_PREIS', 'STELLE'] as const) {
    it(`test_nr27_fix_${id.toLowerCase()}_unter_den_gleisen`, () => {
      const t = roh(id).toLowerCase();
      expect(t).not.toContain('über die gleise');
      expect(t).toContain('unter den gleisen');
    });
  }

  // Fehler: Zeichen-Anweisungen sagen „eine Leitung über die Gleise“ (klingt nach Brücke/Freileitung); erlaubt ist nur
  // „quer über die Gleise“ (Bedienrichtung beim Zeichnen). Die Prüfung entfernt alle erlaubten Vorkommen und sucht den Rest.
  for (const id of ['N2', 'TUTORIAL_BEDIEN'] as const) {
    it(`test_nr27_fix_${id.toLowerCase()}_ueber_die_gleise_nur_quer`, () => {
      const t = roh(id).toLowerCase();
      expect(t.replaceAll('quer über die gleise', '')).not.toContain('über die gleise');
    });
  }

  // Fehler: beim Umformulieren wird eine Kennung umbenannt, gelöscht oder neu angelegt (Aufrufer und Tests verlieren den Text).
  it('test_nr27_fix_kennungsliste_unveraendert', () => {
    const erwartet = [
      'Q2', 'Q4', 'STELLE', 'BRUECKE', 'GLEISE', 'HINTER', 'Q5', 'EXPRESS', 'SOFORT_GRUND', 'KATALOG_ZEILE', 'KATALOG_PREIS',
      'N1', 'N2', 'F1', 'WISSEN_A', 'WISSEN_B', 'KARTE_1', 'KARTE_2', 'KARTE_3', 'KARTE_4', 'KARTE_5', 'TUTORIAL_1',
      'KOSTEN_ZUSATZ', 'TUTORIAL_BEDIEN', 'BLATT_ZEILE', 'KARTE_TITEL', 'KARTE_ALT', 'CHIP', 'KARTE_CHIP_FELD',
      'KARTE_CHIP_ZUSCHLAG', 'HOECHSTSTUFE', 'TUTORIAL_2',
    ];
    expect(Object.keys(NORD_TEXTE).sort()).toEqual([...erwartet].sort());
  });
});

describe('NR27 Fix M3 – nordInfo während des Querungsbaus', () => {
  const imBau = (): Spielstand => {
    const s = neuerSpielstand(1_700_000_000_000);
    s.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
    s.abschnitt = { phase: 'bau', mit_querung: true, bau: null } as Spielstand['abschnitt'];
    return s;
  };
  // Erwartet ist der Text Q5 aus der Tabelle, Wortlaut hier von Hand festgehalten (Tabelle Stand 2026-11-23).
  const Q5 = 'Die Bahnquerung wird noch gebaut. Danach geht es hinter der Bahn weiter.';

  // Fehler, der ihn rot macht: nordInfo zeigt im Bau weiter N2 („Zeichne … eine Leitung …“), obwohl schon gebaut wird.
  it('test_nr27_fix_m3_nordinfo_bahnfeld_im_bau_q5', () => {
    expect(roh('Q5')).toBe(Q5);
    expect(nordInfo(imBau(), 5, -2)).toBe(Q5);
  });
  it('test_nr27_fix_m3_nordinfo_kulisse_im_bau_q5', () => {
    expect(nordInfo(imBau(), 2, -9)).toBe(Q5);
  });
  // Fehler: nach der Erschließung erscheint weiter ein Hinweis.
  it('test_nr27_fix_m3_nordinfo_erschlossen_null', () => {
    const s = imBau();
    s.nordviertel = true;
    expect(nordInfo(s, 5, -2)).toBeNull();
    expect(nordInfo(s, 2, -9)).toBeNull();
  });
  // Fehler: Q5 auch ohne Querung im Abschnitt (normaler Bau ohne mit_querung) → dann gilt weiter N2.
  it('test_nr27_fix_m3_nordinfo_bau_ohne_querung_kein_q5', () => {
    const s = imBau();
    s.abschnitt = { phase: 'bau', bau: null } as Spielstand['abschnitt'];
    expect(nordInfo(s, 5, -2)).not.toBe(Q5);
    expect(nordInfo(s, 5, -2)).toBe(NORD_TEXTE.N2.text);
  });
});
