import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KATALOG } from '../src/core/katalog';
import { groesse } from '../src/core/netz';
import { Spiel } from '../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_SPUR, neuesSpielMitTutorial } from '../src/core/start';
import type { Objekt } from '../src/core/typen';
import { echteSteuerung } from './hilfen/echte-steuerung';

// Bauplan NR13 Fassung 3.1, Paket P4 (F2, Befund 6): einmal T01–T26 nur über die echte Oberfläche – Kartenziele per
// pointerdown/pointerup an kamera.mitte, Bedienelemente per Klick auf [data-ziel], Erklär-Schritte per #anleiter-weiter,
// T13 per Wischen. Grenze: die DOM-Nachbildung rechnet kein Layout, die Lage der Löcher prüft der Browser-Test.
const T0 = 1_000_000;

type St = {
  tick(t: number): void;
  kamera: { mitte(x: number, y: number): [number, number] };
  anleitungAnsicht(): { schritt: string; art: 'W' | 'H'; ziele: string[] } | null;
};
type U = Parameters<Parameters<typeof echteSteuerung>[1]>[0];

describe('NR13 P4 Klickweg', () => {
  // Fensteruhr von Hand (Sprecher-Blasen, Blatt-Schließen); Simons Foto lädt die DOM-Nachbildung nicht
  beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Image', class { src = ''; alt = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; }); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('test_nr13_klickweg_t01_bis_t26: jeder Schritt nur über die echte Oberfläche, am Ende beide Tutorial-Häuser warm', async () => {
    const uhr = { t: T0 };
    // Die Kamerafahrt (T05, T22) läuft nach der Bildzeit, nicht nach der Spieluhr – darum auch sie von Hand
    let bild = 50_000;
    vi.spyOn(performance, 'now').mockImplementation(() => bild);
    const spiel = new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);
    await echteSteuerung(spiel, async (u: U) => {
      const { eingabeErlaubt } = await import('../src/ui/spotlight');
      const st = u.st as unknown as St, doc = u.dom.doc;
      const leinwand = u.dom.app.querySelector('canvas')!;
      const ansicht = () => st.anleitungAnsicht();
      const haus = (k: readonly [number, number]) => spiel.stand.objekte.find((o) => o.x === k[0] && o.y === k[1] && KATALOG[o.typ].kategorie === 'haus')!;
      const [h1, h2] = ERSTE_HAEUSER.map(haus);
      const mitte = (o: Objekt): [number, number] => { const g = groesse(o); return st.kamera.mitte(o.x + (g - 1) / 2, o.y + (g - 1) / 2); };
      const karte: Record<string, Objekt> = { heizzentrale: spiel.hz, haus1: h1, haus2: h2 };
      const zeiger = (id: number, [x, y]: readonly [number, number]) => ({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch', button: 0 });

      const gesehen: string[] = [];
      /** Bild weiter, Schritt prüfen und merken; im Handlungs-Schritt lässt jedes Kartenziel im Loch die Eingabe durch (W zeigt nur, AE-NR13-6) */
      const schritt = (id: string): void => {
        st.tick(uhr.t);
        bild += 1_300; st.tick(uhr.t); // eine begonnene Kamerafahrt (1.200 ms) ist vorbei, bevor der Spieler handelt
        expect(ansicht()?.schritt).toBe(id);
        gesehen.push(id);
        if (ansicht()!.art === 'H') for (const z of ansicht()!.ziele) if (karte[z]) expect(eingabeErlaubt(...mitte(karte[z])), `${id}: Loch ${z}`).toBe(true);
      };
      const weiter = (): void => { const k = doc.getElementById('anleiter-weiter'); expect(k, `[Weiter] in ${ansicht()?.schritt}`).not.toBeNull(); k!.click(); };
      const tippeKarte = (o: Objekt): void => { const p = mitte(o); leinwand.ausloesen('pointerdown', zeiger(3, p)); leinwand.ausloesen('pointerup', zeiger(3, p)); };
      const klicke = (name: string, typ?: string): void => {
        const el = doc.querySelector(`[data-ziel="${name}"]${typ ? `[data-typ="${typ}"]` : ''}`);
        expect(el, `[data-ziel=${name}] in ${ansicht()?.schritt}`).not.toBeNull();
        el!.click();
      };

      // Erste Blase: Wiedereinstieg (die Testhilfe setzt namen_gefragt = true)
      st.tick(uhr.t);
      expect(ansicht()?.schritt).toBe('T01');
      weiter();
      schritt('T01'); tippeKarte(spiel.hz);
      for (const id of ['T02', 'T03', 'T04', 'T05', 'T06', 'T07']) { schritt(id); weiter(); }
      schritt('T08'); klicke('bauen');
      schritt('T10'); klicke('philipp');
      schritt('T11');
      expect(doc.getElementById('anleiter-weiter'), 'T11: erst nach der Planung').toBeNull();
      vi.advanceTimersByTime(7_000); // Philipps Blase (höchstens 3.800 + 2.500 + 350 ms, src/ui/sprecher.ts)
      uhr.t += 10_000; st.tick(uhr.t); weiter();
      schritt('T12'); klicke('leitungskarte', spiel.tutorialWerte().haupt);
      schritt('T13');
      // Spur wischen und weiter auf Haus 2 (A47: das letzte Feld legt erst der Zug auf das Haus)
      const weg = [...TUTORIAL_SPUR, ERSTE_HAEUSER[1]].map(([x, y]) => st.kamera.mitte(x, y));
      leinwand.ausloesen('pointerdown', zeiger(7, weg[0]));
      for (const p of weg.slice(1)) leinwand.ausloesen('pointermove', zeiger(7, p));
      leinwand.ausloesen('pointerup', zeiger(7, weg[weg.length - 1]));
      schritt('T14'); klicke('abschliessen');
      expect(spiel.abschnittWarnungen()).toEqual([]);
      schritt('T15'); tippeKarte(h1);
      schritt('T16'); weiter();
      schritt('T17'); klicke('puffer_knopf');
      schritt('T18'); tippeKarte(h2);
      schritt('T19'); klicke('puffer_knopf');
      schritt('T20'); klicke('bauen');
      schritt('T21'); klicke('laura');
      schritt('T22');
      vi.advanceTimersByTime(7_000); st.tick(uhr.t); // Lauras Blase ist vorbei, Simon kommt mit [Weiter] zurück
      weiter();
      schritt('T23');
      expect(doc.getElementById('anleiter-weiter'), 'T23: erst nach dem Bau').toBeNull();
      vi.advanceTimersByTime(7_000); // Lauras Blase
      for (let i = 0; i < 2; i++) { uhr.t += 10_000; st.tick(uhr.t); } // Tutorial-Bau 20 s
      weiter();
      for (const id of ['T24', 'T25', 'T26']) { schritt(id); weiter(); }
      st.tick(uhr.t);

      expect(gesehen).toEqual(['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T10', 'T11', 'T12', 'T13', 'T14', 'T15', 'T16',
        'T17', 'T18', 'T19', 'T20', 'T21', 'T22', 'T23', 'T24', 'T25', 'T26']);
      expect(ansicht()).toBeNull();
      expect(spiel.stand.tutorial).toBeUndefined();
      expect(spiel.netz.warm.has(h1.id) && spiel.netz.warm.has(h2.id)).toBe(true);
      expect(doc.getElementById('anleiter')).toBeNull();
    }, { uhr: () => uhr.t });
  });
});
