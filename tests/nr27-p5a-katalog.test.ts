import { describe, expect, it } from 'vitest';
import { KONSTANTEN } from '../src/core/katalog';
import { nordText } from '../src/core/nord-texte';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import { dauerText } from '../src/render/gebaeude';
import { echteSteuerung, tippe, type EchteUmgebung } from './hilfen/echte-steuerung';

// NR27 P5a (DESIGN 14.5, 14.15 Punkt 13; Bauplan P3 Regel 9): Infozeile im Kasten „Bauabschnitt“, Bauzeit mit Zuschlag,
// [Express] und [Sofort fertig] grau bei einem Abschnitt mit Querung. Ohne Fachtext-Freigabe gibt es keinen (i)-Knopf.
const T0 = 1_700_000_000_000;
const t = (id: Parameters<typeof nordText>[0], werte?: Record<string, string>): string => nordText(id, werte) as string;
const eur = (n: number): string => `${n.toLocaleString('de-DE')} €`;

function spiel(stufe: number): Spiel {
  const s = neuerSpielstand(T0);
  s.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  s.geld_eur = 1_000_000; s.taler = 10_000;
  s.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(s, () => T0);
  sp.ereignisse.splice(0);
  return sp;
}
const kasten = (u: EchteUmgebung): string => u.dom.html.querySelectorAll('[data-ziel="kasten_abschnitt"]')[0]?.textContent ?? '';
const knopfMit = (u: EchteUmgebung, wort: string) => u.knoepfe().find((k) => k.textContent.includes(wort));

describe('NR27 P5a – Kasten „Bauabschnitt“', () => {
  // Fehler, die ihn rot machen: Infozeile fehlt, falscher Text je Stufe, Infozeile bleibt nach der Erschließung.
  it('vor Stufe 6: KATALOG_ZEILE', async () => {
    await echteSteuerung(spiel(5), (u) => { u.st.katalog('netz'); expect(kasten(u)).toContain(t('KATALOG_ZEILE')); });
  });
  it('ab Stufe 6 ohne Bahnfeld: KATALOG_PREIS mit Preis je Gleisfeld', async () => {
    await echteSteuerung(spiel(6), (u) => {
      u.st.katalog('netz');
      expect(kasten(u)).toContain(t('KATALOG_PREIS', { preis: eur(KONSTANTEN.querung_eur_je_feld) }));
    });
  });
  it('mit Bahnfeld: KOSTEN_ZUSATZ mit Summe und Zuschlag', async () => {
    const sp = spiel(6);
    for (const y of [-1, -2, -3]) expect(sp.platzieren('d40', 10, y).ok).toBe(true);
    await echteSteuerung(sp, (u) => {
      u.st.katalog('netz');
      expect(kasten(u)).toContain(t('KOSTEN_ZUSATZ', { querung_eur: eur(2 * KONSTANTEN.querung_eur_je_feld), querung_zeit: dauerText(KONSTANTEN.querung_bau_s * KONSTANTEN.bauzeit_faktor) }));
    });
  });
  it('nach der Erschließung keine Infozeile', async () => {
    const sp = spiel(6);
    sp.stand.nordviertel = true;
    await echteSteuerung(sp, (u) => {
      u.st.katalog('netz');
      expect(kasten(u)).not.toContain(t('KATALOG_PREIS', { preis: eur(KONSTANTEN.querung_eur_je_feld) }));
    });
  });
  it('ohne Freigabe kein (i)-Knopf', async () => {
    await echteSteuerung(spiel(6), (u) => {
      u.st.katalog('netz');
      expect(u.dom.html.querySelectorAll('[data-ziel="bahn_info"]').length).toBe(0);
    });
  });
  // Fehler: Bauzeit-Text aus abschnitt_bau_s statt abschnittBau_s() → ohne Zuschlag.
  it('Bestellen zeigt die Bauzeit mit Zuschlag', async () => {
    const sp = spiel(6);
    for (const y of [-1, -2, -3]) expect(sp.platzieren('d40', 10, y).ok).toBe(true);
    expect(sp.abschnittAbschliessen().ok).toBe(true);
    await echteSteuerung(sp, (u) => {
      u.st.katalog('netz');
      expect(kasten(u)).toContain(`dauert der Bau etwa ${dauerText((KONSTANTEN.abschnitt_bau_s + KONSTANTEN.querung_bau_s) * KONSTANTEN.bauzeit_faktor)}`);
    });
  });
  // Fehler: Knöpfe bleiben normal (Antippen bezahlt nichts, sagt aber nichts) oder zeigen ein Schloss.
  it('im Bau mit Querung: [Express] und [Sofort fertig] grau mit SOFORT_GRUND, Antippen → EXPRESS', async () => {
    const sp = spiel(6);
    for (const y of [-1, -2, -3]) expect(sp.platzieren('d40', 10, y).ok).toBe(true);
    expect(sp.abschnittAbschliessen().ok).toBe(true);
    expect(sp.materialBestellen().ok).toBe(true);
    await echteSteuerung(sp, (u) => {
      u.st.katalog('netz');
      for (const wort of ['Expresslieferung', 'Sofort fertig']) {
        const k = knopfMit(u, wort);
        expect(k?.textContent, wort).toContain(t('SOFORT_GRUND'));
        u.meldungen.splice(0);
        tippe(k!);
        expect(u.meldungen, wort).toEqual([t('EXPRESS')]);
      }
    });
  });
});
