import { describe, expect, it } from 'vitest';
import { istLeitung, type TypId } from '../src/core/katalog';
import { Spiel } from '../src/core/spiel';
import { neuerSpielstand } from '../src/core/start';
import { sichtbar, sichtbarerText, type El } from './hilfen/dom-attrappe';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';

// NR27 Fix-Runde M3 (docs/pruefberichte/20261123-designer-treue-nr27.md): „Antippen der Querung im Bau öffnet Blatt mit
// [Entfernen]“. Der Spielkern lehnt Entfernen geplanter Leitungen im Bau ab (spiel.ts entfernen: „Der Abschnitt ist schon
// bestellt …“); die Oberfläche darf den Knopf deshalb gar nicht erst anbieten. Beim Antippen eines Gleisfelds im Bau erscheint
// der Hinweis Q5 (Wortlaut von Hand aus der Texttabelle, Stand 2026-11-23).
// Muster: querungBestellen aus tests/nr27-pruefen-zusammenspiel.test.ts, tippeFeld aus tests/nr27-p5a-antippen-rand.test.ts.

const T0 = 1_700_000_000_000;
const Q5 = 'Die Bahnquerung wird noch gebaut. Danach geht es hinter der Bahn weiter.';
type K = { mitte(x: number, y: number): [number, number]; feld(a: number, b: number): [number, number]; zentrieren(x: number, y: number, z: number): void };

function tippeFeld(u: EchteUmgebung, x: number, y: number): void {
  const k = u.st.kamera as unknown as K;
  k.zentrieren(x, y, 1);
  const [mx, my] = k.mitte(x, y);
  expect(k.feld(mx, my), `Testaufbau: Feld (${x}|${y})`).toEqual([x, y]);
  const canvas = u.dom.app.querySelector('canvas')!, ev = { pointerId: 3, clientX: mx, clientY: my, pointerType: 'touch', button: 0 };
  canvas.ausloesen('pointerdown', ev); canvas.ausloesen('pointerup', ev);
}

function spielMitQuerungImBau(): Spiel {
  const s = neuerSpielstand(T0);
  s.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
  s.geld_eur = 2_000_000; s.taler = 100_000;
  s.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(s, () => T0);
  const typ: TypId = 'd90';
  for (const y of [-1, -2, -3]) expect(sp.platzieren(typ, 10, y), `(10|${y})`).toEqual({ ok: true });
  expect(sp.abschnittAbschliessen().ok).toBe(true);
  expect(sp.materialBestellen()).toEqual({ ok: true });
  expect(sp.stand.abschnitt?.phase, 'Testaufbau: Querung im Bau').toBe('bau');
  expect(sp.stand.abschnitt?.mit_querung).toBe(true);
  sp.ereignisse.splice(0);
  return sp;
}

const sichtbareEntfernen = (u: EchteUmgebung): El[] => u.knoepfe().filter((k) => sichtbar(k) && /entfernen/i.test(sichtbarerText(k)));
const leitungAuf = (sp: Spiel, x: number, y: number) => sp.stand.objekte.find((o) => istLeitung(o.typ) && o.x === x && o.y === y);

describe('NR27 Fix M3 – Antippen der Querung im Bau', () => {
  // Fehler, der ihn rot macht: Tipp auf (10|−2) öffnet das normale Leitungsblatt mit [Entfernen] (heute so).
  it('test_nr27_fix_m3_tipp_querung_im_bau_kein_entfernen', async () => {
    const sp = spielMitQuerungImBau();
    await echteSteuerung(sp, (u) => {
      tippeFeld(u, 10, -2);
      expect(sichtbareEntfernen(u).map((k) => sichtbarerText(k))).toEqual([]);
    });
  });

  // Fehler: Tipp auf die Querung im Bau bleibt stumm oder zeigt N2 („Zeichne … eine Leitung …“) statt Q5.
  it('test_nr27_fix_m3_tipp_querung_im_bau_zeigt_q5', async () => {
    const sp = spielMitQuerungImBau();
    await echteSteuerung(sp, (u) => {
      tippeFeld(u, 10, -2);
      expect(u.meldungen).toContain(Q5);
      expect(u.meldung()).toBe(Q5);
    });
  });

  // Fehler: Tipp entfernt die Leitung oder ändert sie (z. B. Blatt mit Sofort-Aktion).
  it('test_nr27_fix_m3_tipp_querung_im_bau_leitung_bleibt', async () => {
    const sp = spielMitQuerungImBau();
    const vorher = { ...leitungAuf(sp, 10, -2)! };
    await echteSteuerung(sp, (u) => {
      tippeFeld(u, 10, -2);
      for (const k of sichtbareEntfernen(u)) k.click(); // falls doch ein Knopf da ist: auch dann darf nichts verschwinden
    });
    expect(leitungAuf(sp, 10, -2)).toEqual(vorher);
    expect(sp.stand.abschnitt?.phase).toBe('bau');
  });

  // Fehler: das Blatt einer geplanten Leitung im Bau (auch neben der Bahn) bietet [Entfernen] an, das der Kern ablehnt.
  it('test_nr27_fix_m3_alle_geplanten_leitungen_im_bau_ohne_entfernen', async () => {
    const sp = spielMitQuerungImBau();
    const geplant = sp.stand.objekte.filter((o) => istLeitung(o.typ) && o.geplant);
    expect(geplant.length, 'Testaufbau: drei geplante Querungsfelder').toBeGreaterThanOrEqual(3);
    await echteSteuerung(sp, (u) => {
      for (const o of geplant) {
        u.st.kontext(o.id);
        expect(sichtbareEntfernen(u).map((k) => sichtbarerText(k)), `Leitung (${o.x}|${o.y})`).toEqual([]);
        u.st.kontext(null);
      }
    });
  });
});
