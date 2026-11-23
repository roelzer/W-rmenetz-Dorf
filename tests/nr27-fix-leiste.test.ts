import { describe, expect, it } from 'vitest';
import { istLeitung, type TypId } from '../src/core/katalog';
import { NORD_TEXTE } from '../src/core/nord-texte';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import { El } from './hilfen/dom-attrappe';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';

// NR27 Fix-Runde M1 (docs/pruefberichte/20261123-designer-treue-nr27.md, Abhilfe A): Der Chip „+ Bahnquerung“ belegt keine eigene
// Zeile in der Zeichenleiste mehr (Radierer/Zurück rutschten sonst unter den Abschlussknopf), sondern steht als zweite Zeile im
// Knopf „Abschnitt abschließen“. Zeichnen per Fingerzug wie tests/nr27-p5a2-ui.test.ts.

const T0 = 1_700_000_000_000;
const CHIP = NORD_TEXTE.CHIP.text;
const norm = (s: string): string => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function spiel(): Spiel {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = 6;
  st.geld_eur = 10_000_000; st.taler = 10_000;
  st.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(st, () => T0);
  sp.neuBerechnen();
  sp.ereignisse.splice(0);
  return sp;
}
const leitungBei = (s: Spiel, x: number, y: number) => s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === x && o.y === y);
function punkt(u: EchteUmgebung, x: number, y: number): [number, number] {
  const k = u.st.kamera as unknown as { mitte(x: number, y: number): [number, number]; feld(a: number, b: number): [number, number]; zentrieren(x: number, y: number, z: number): void };
  const [mx, my] = k.mitte(x, y);
  expect(k.feld(mx, my), `Testaufbau: Feld (${x}|${y})`).toEqual([x, y]);
  return [mx, my];
}
function zeichne(u: EchteUmgebung, typ: TypId, felder: Array<[number, number]>): void {
  u.st.stempeln(typ);
  u.knoepfe().filter((k) => k.isConnected).find((k) => norm(k.textContent) === 'Verstanden')?.click();
  (u.st.kamera as unknown as { zentrieren(x: number, y: number, z: number): void }).zentrieren(felder[0][0], felder[0][1], 1);
  const canvas = u.dom.app.querySelector('canvas')!;
  const evs = felder.map(([x, y]) => { const [mx, my] = punkt(u, x, y); return { pointerId: 7, clientX: mx, clientY: my, pointerType: 'touch', button: 0 }; });
  canvas.ausloesen('pointerdown', evs[0]);
  for (const ev of evs.slice(1)) canvas.ausloesen('pointermove', ev);
  canvas.ausloesen('pointerup', evs[evs.length - 1]);
}
const werkzeug = (u: EchteUmgebung): El => u.dom.html.querySelectorAll('.zeichen-werkzeug')[0];
/** Gestalt der Kinder: Tag und Klassen, in Reihenfolge – Texte (Kennzeile) dürfen sich ändern. */
const kinderGestalt = (e: El): string[] => e.kinder.filter((k): k is El => k instanceof El).map((k) => `${k.tag.toLowerCase()}.${k.klassen().slice().sort().join('.')}`);
const abschlussKnopf = (u: EchteUmgebung): El => u.dom.html.querySelectorAll('[data-ziel="abschliessen"]')[0];
function nachfahren(e: El): El[] {
  const alle: El[] = [];
  for (const k of e.kinder) if (k instanceof El) alle.push(k, ...nachfahren(k));
  return alle;
}

describe('NR27 Fix M1 – Zeichenleiste mit Bahnfeld', () => {
  // Fehler, der ihn rot macht: mit Bahnfeld kommt ein zusätzliches Kind (Chip-Zeile) in das Werkzeug (heute .bahn-chip).
  it('test_nr27_fix_m1_werkzeug_kinder_mit_und_ohne_bahnfeld_gleich', async () => {
    const s = spiel();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd40', [[10, 1], [10, 0], [10, -1]]);
      expect(leitungBei(s, 10, -1), 'Testaufbau').toBeDefined();
      const ohne = kinderGestalt(werkzeug(u));
      zeichne(u, 'd40', [[10, -1], [10, -2], [10, -3]]);
      expect(leitungBei(s, 10, -3), 'Testaufbau: Bahnfeld gezeichnet').toBeDefined();
      expect(s.querungsFelder().length, 'Testaufbau').toBeGreaterThan(0);
      expect(kinderGestalt(werkzeug(u))).toEqual(ohne);
    });
  });

  // Fehler: beim Umbau fällt die Reihe Radierer/Zurück weg oder verliert einen der beiden Knöpfe.
  it('test_nr27_fix_m1_zeichen_reihe_radierer_zurueck_vorhanden', async () => {
    const s = spiel();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd40', [[10, 0], [10, -1], [10, -2], [10, -3]]);
      const reihe = werkzeug(u).querySelectorAll('.zeichen-reihe')[0];
      expect(reihe, '.zeichen-reihe im Werkzeug').toBeDefined();
      const texte = reihe.querySelectorAll('button').map((k) => norm(k.textContent));
      expect(texte.some((t) => t.includes('Radierer'))).toBe(true);
      expect(texte.some((t) => t.includes('Zurück'))).toBe(true);
    });
  });

  // Fehler: „+ Bahnquerung“ wird nur an den Knopftext angehängt (keine eigene Zeile) oder steht vor „Abschnitt abschließen“.
  it('test_nr27_fix_m1_chip_eigenes_element_zweite_zeile_im_abschlussknopf', async () => {
    const s = spiel();
    await echteSteuerung(s, (u) => {
      zeichne(u, 'd40', [[10, 0], [10, -1], [10, -2], [10, -3]]);
      const k = abschlussKnopf(u);
      expect(k, 'Abschlussknopf').toBeDefined();
      const zeile = nachfahren(k).filter((e) => norm(e.textContent) === CHIP);
      expect(zeile.length, 'eigenes Element mit genau dem Text CHIP').toBeGreaterThanOrEqual(1);
      const text = norm(k.textContent);
      expect(text.indexOf('Abschnitt abschließen'), 'Hauptzeile vorhanden').toBeGreaterThanOrEqual(0);
      expect(text.indexOf(CHIP)).toBeGreaterThan(text.indexOf('Abschnitt abschließen'));
    });
  });
});
