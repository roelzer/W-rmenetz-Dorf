import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { bahnFelder, NORD_PLAN } from '../src/core/nordviertel';
import type { Objekt } from '../src/core/typen';
import { zugLage } from '../src/render/bahn';
import { Kamera } from '../src/render/kamera';
import { animationBedarf } from '../src/render/szene-schluessel';
import { neu } from './hilfen';
import { leeresDorf } from './hilfen/nr22';

// NR27 Fix-Runde M7 (docs/pruefberichte/20261123-designer-treue-nr27.md): Die Kulisse raucht nicht mehr und braucht daher keinen
// Takt. Zusammenspiel Kulisse + Bahn + Querungsbau: „flüssig“ kommt nur noch von der Baustelle (solange sie im Bild ist,
// DESIGN 14.5 „Leben“), nicht von der Kulisse. Muster und Kameras wie tests/nr27-p5d-baustelle-takt.test.ts:
// Baustelle (10|−1) … (10|−4); bei 50 000 ms fährt kein Zug (dort geprüft und hier erneut als Testaufbau).

const BAU = { start_ms: -1000, ende_ms: 3_600_000 }, RUHIG_MS = 50_000;
const hz = [neu('hz', 11, 30)];
const szene = (extra: Partial<Parameters<typeof animationBedarf>[0]>, objekte: Objekt[] = hz): Parameters<typeof animationBedarf>[0] => ({
  objekte, innen: [], netz: berechneNetz(objekte, [], 1), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: RUHIG_MS, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46,
  bahn: bahnFelder(), kulisse: NORD_PLAN, ...extra,
});
function kamera(mitte: [number, number], zoom: number): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = zoom; k.zentrieren(mitte[0], mitte[1], 1);
  return k;
}
function querungImBau() {
  const { s } = leeresDorf(1_700_000_000_000);
  s.stand.abschnitt = { phase: 'bau', mit_querung: true, bau: { art: 'neu', ...BAU } };
  return s;
}
const IM_BILD = (): Kamera => kamera([10, -2.5], 1.4), WEG = (): Kamera => kamera([10, 40], 2.2), KULISSE = (): Kamera => kamera([8, -7], 1.4);

describe('NR27 Fix M7 – Takt mit Kulisse', () => {
  it('Testaufbau: bei 50 000 ms fährt kein Zug', () => {
    expect(zugLage(RUHIG_MS, null)).toBeNull();
  });

  // Fehler, der ihn rot macht: mit Kulisse geht der Baustellen-Takt verloren (z. B. Kulisse schaltet Takt ab).
  it('test_nr27_fix_m7_kulisse_bahn_querungsbau_im_bild_fluessig', () => {
    expect(animationBedarf(szene({ spiel: querungImBau() }), false, IM_BILD())).toBe('fluessig');
  });

  // Fehler: die Kulisse hält den flüssigen Takt, obwohl die Baustelle außer Sicht ist (heute: Kulisse → immer flüssig).
  it('test_nr27_fix_m7_kulisse_bahn_querungsbau_ausser_sicht_nicht_fluessig', () => {
    expect(animationBedarf(szene({ spiel: querungImBau() }), false, WEG())).not.toBe('fluessig');
  });

  // Fehler: Kulisse allein (kein Bau, kein Zug) fordert einen Takt an.
  it('test_nr27_fix_m7_kulisse_allein_keine', () => {
    expect(animationBedarf(szene({ spiel: null }), false, KULISSE())).toBe('keine');
    expect(animationBedarf(szene({ spiel: null }), false)).toBe('keine');
  });
});
