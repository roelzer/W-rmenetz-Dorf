import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { bahnFelder, NORD_PLAN } from '../src/core/nordviertel';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { neu } from './hilfen';
import { aufnahme } from './hilfen/nr22';

// Nachtrag aus dem Review NR27 P4 (Lücken, die Fehlerproben nicht erkannten). Muster wie tests/nr27-darstellung.test.ts.
// Farben von Hand: Gehweg = tokens farbe.karte.gehweg '#cbc6ba'; Schwelle = DESIGN 14.9 `schwelle` '#cfcac0'.
const GEHWEG = 'fillStyle=#cbc6ba', SCHWELLE = 'strokeStyle=#cfcac0';
const objekte = [neu('hz', 11, 30)];
const szene = (extra: Partial<Szene>): Szene => ({
  objekte, innen: [], netz: berechneNetz(objekte, [], 1), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 10_000, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46, ...extra,
});
function bild(s: Szene, mitte: [number, number], zoom: number): string[] {
  const a = aufnahme(), m = new Maler(a.X), k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = zoom; k.zentrieren(mitte[0], mitte[1], 1);
  m.reduziert = true;
  bodenEbeneEinrichten(null);
  zeichneSzene(m, k, s, new Effekte(), 0.016);
  return a.befehle;
}
const zahl = (b: string[], marke: string): number => b.filter((x) => x === marke).length;

describe('NR27 P4 Nachtrag', () => {
  // Fehler, der ihn rot macht: die Gehweg-Schleife läuft nur über s.objekte, nicht über die Kulisse.
  it('test_nr27_kulisse_gehweg: ein Kulissenhaus an der Straße bekommt seinen Gehweg', () => {
    expect(NORD_PLAN[0]).toEqual({ typ: 'efh', x: 2, y: -9 });
    const strassen: Array<[number, number]> = [[2, -8]];
    const mit = bild(szene({ strassen, kulisse: [NORD_PLAN[0]] }), [2, -9], 2.2);
    const ohne = bild(szene({ strassen, kulisse: [] }), [2, -9], 2.2);
    expect(zahl(mit, GEHWEG)).toBe(zahl(ohne, GEHWEG) + 1);
  });

  // Fehler, der ihn rot macht: Detailstufe der Gleise hängt nicht mehr an der Kachelbreite (32 px).
  it('test_nr27_gleise_zoomstufe: bei Zoom 1,0 (26 px) keine Schwellen, bei Zoom 2,2 schon', () => {
    expect(zahl(bild(szene({ bahn: bahnFelder() }), [10, -2], 1.0), SCHWELLE)).toBe(0);
    expect(zahl(bild(szene({ bahn: bahnFelder() }), [10, -2], 2.2), SCHWELLE)).toBeGreaterThan(0);
  });
});
