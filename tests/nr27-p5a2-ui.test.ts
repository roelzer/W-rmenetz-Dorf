import { describe, expect, it, vi } from 'vitest';

// NR27 P5a2 (DESIGN 14.5, 14.7, 14.15 Punkte 11, 13, 17, 18, 19; Bauplan P3 Regel 9 Rest): Oberfläche rund um die Querung.
// Der Fachtext-Schalter wird nur hier im Test umgeschaltet (Bauplan Nachtrag 3.1 Punkt 4): nordText wird durch die echte
// Funktion mit `freigegeben = schalter.frei` ersetzt. Im Spielcode gibt es keinen Schalter.
const schalter = vi.hoisted(() => ({ frei: false }));
vi.mock('../src/core/nord-texte', async (orig) => {
  const echt = await orig<typeof import('../src/core/nord-texte')>();
  return { ...echt, nordText: (id: Parameters<typeof echt.nordText>[0], werte?: Record<string, string | number>, frei?: boolean) => echt.nordText(id, werte, frei ?? schalter.frei) };
});

import { istLeitung, KATALOG, type TypId } from '../src/core/katalog';
import { nordText, type NordTextId } from '../src/core/nord-texte';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';

const T0 = 1_700_000_000_000;
/** Text aus der echten Tabelle; Fachtexte immer mit Freigabe, damit „kommt nicht vor“ etwas Echtes prüft. */
const t = (id: NordTextId, werte?: Record<string, string | number>): string => nordText(id, werte, true) as string;
const norm = (s: string): string => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function spiel(stufe: number): Spiel {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  st.geld_eur = 10_000_000; st.taler = 10_000;
  st.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(st, () => T0);
  sp.neuBerechnen();
  sp.ereignisse.splice(0);
  return sp;
}
const leitungBei = (s: Spiel, x: number, y: number) => s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === x && o.y === y);
const blick = (u: EchteUmgebung, x: number, y: number): void => (u.st.kamera as unknown as { zentrieren(x: number, y: number, k: number): void }).zentrieren(x, y, 1);
function punkt(u: EchteUmgebung, x: number, y: number): [number, number] {
  const k = u.st.kamera as unknown as { mitte(x: number, y: number): [number, number]; feld(a: number, b: number): [number, number] };
  const [mx, my] = k.mitte(x, y);
  expect(k.feld(mx, my), `Testaufbau: Feld (${x}|${y})`).toEqual([x, y]);
  return [mx, my];
}
/** Zug des Fingers über die Felder (Muster tests/nr27-darstellung.test.ts). */
function zeichne(u: EchteUmgebung, typ: TypId, felder: Array<[number, number]>): void {
  u.st.stempeln(typ);
  u.knoepfe().filter((k) => k.isConnected).find((k) => norm(k.textContent) === 'Verstanden')?.click();
  const canvas = u.dom.app.querySelector('canvas')!;
  const evs = felder.map(([x, y]) => { const [mx, my] = punkt(u, x, y); return { pointerId: 7, clientX: mx, clientY: my, pointerType: 'touch', button: 0 }; });
  canvas.ausloesen('pointerdown', evs[0]);
  for (const ev of evs.slice(1)) canvas.ausloesen('pointermove', ev);
  canvas.ausloesen('pointerup', evs[evs.length - 1]);
}
const chipKnopf = (u: EchteUmgebung) => u.dom.html.querySelectorAll('[data-ziel="bahn_chip"]')[0];

const abschlussKnopf = (u: EchteUmgebung) => u.dom.html.querySelectorAll('[data-ziel="abschliessen"]')[0];

describe('NR27 P5a2 Punkt 11 – „+ Bahnquerung“ in der Zeichenleiste', () => {
  // Fix-Runde NR27 (Designer-Treue M1, Abhilfe A): Der Chip ist keine eigene Zeile mehr, „+ Bahnquerung“ steht als zweite Zeile im
  // Knopf „Abschnitt abschließen“. Das Antippen des Chips (Meldung KOSTEN_ZUSATZ) entfällt, T04 steht im Baumenü.
  // Fehler, die ihn rot machen: Text fehlt, falscher Text, erscheint auch ohne Bahnfeld, eigener Chip-Knopf bleibt.
  it('erscheint erst, wenn der Abschnitt ein Bahnfeld enthält – im Knopf „Abschnitt abschließen“, ohne eigenen Chip', async () => {
    schalter.frei = false;
    const s = spiel(6);
    await echteSteuerung(s, (u) => {
      blick(u, 10, -1);
      zeichne(u, 'd40', [[10, 1], [10, 0], [10, -1]]);
      expect(leitungBei(s, 10, -1), 'Testaufbau').toBeDefined();
      expect(chipKnopf(u), 'ohne Bahnfeld kein Chip').toBeUndefined();
      expect(norm(abschlussKnopf(u).textContent), 'ohne Bahnfeld kein Zusatz im Abschlussknopf').not.toContain(t('CHIP'));
      zeichne(u, 'd40', [[10, -1], [10, -2], [10, -3]]);
      expect(leitungBei(s, 10, -3), 'Testaufbau').toBeDefined();
      expect(chipKnopf(u), 'kein eigener Chip mehr').toBeUndefined();
      expect(norm(abschlussKnopf(u).textContent), 'zweite Zeile im Abschlussknopf').toContain(t('CHIP'));
    });
  });
});
