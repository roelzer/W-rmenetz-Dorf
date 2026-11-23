import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import type { Objekt } from '../src/core/typen';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { animationBedarf, szenenSchluessel } from '../src/render/szene-schluessel';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { neu } from './hilfen';
import { aufnahme } from './hilfen/nr22';

// NR27 P5c (DESIGN 14.5 „Falsch ziehen: Das abgelehnte Feld wird vorschau_nein“, 14.15 Punkt 12): rotes Feld in der Szene.
// Muster wie tests/nr27-p5b4-baustelle.test.ts.
//
// Werte von Hand: Füllung `karte.vorschau_nein` 'rgba(192,57,43,0.40)', Rand `karte.pfeil_nein` '#c0392b' (design/tokens.json).
// Ausblenden in den letzten 200 ms (`zeit_ms.toast_blende`, wie die Meldung): 100 ms vor bis_ms → Deckkraft 100/200 = 0,5;
// 300 ms vor bis_ms → 1. Bei „Weniger Bewegung“ immer 1, kein Ausblenden.
const FUELLUNG = 'fillStyle=rgba(192,57,43,0.40)', RAND = 'strokeStyle=#c0392b';
const BIS = 50_700;

function kamera(): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = 1.4; k.zentrieren(10, -2.5, 1);
  return k;
}
const HZ = neu('hz', 11, 30), NETZ = berechneNetz([HZ], [], 1);
const szene = (extra: Partial<Szene> = {}): Szene => ({
  objekte: [HZ] as Objekt[], innen: [], netz: NETZ, spiel: null, auswahl_id: null, modus: 'stempel', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 50_000, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46,
  ...extra,
});
function bild(s: Szene, reduziert: boolean): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  m.reduziert = reduziert;
  bodenEbeneEinrichten(null);
  zeichneSzene(m, kamera(), s, new Effekte(), 0.016);
  return a.befehle;
}
/** Deckkraft, mit der die rote Füllung gemalt wird; null = nicht gemalt. Prüft auch, dass die Raute auf (10|−2) liegt. */
function rotesFeld(b: string[]): number | null {
  const i = b.indexOf(FUELLUNG);
  if (i < 0) return null;
  const k = kamera(), [cx, cy] = k.mitte(10, -2);
  // Maler.raute beginnt mit moveTo an der oberen Ecke: Mitte − halbe Kachelhöhe (ohne Drehung)
  const zuege = b.slice(0, i).filter((c) => c.startsWith('moveTo(')).map((c) => c.slice(7, -1).split(',').map(Number));
  const [mx, my] = zuege[zuege.length - 1];
  expect(Math.abs(mx - cx) < 1e-6 && Math.abs(my - (cy - k.th / 2)) < 1e-6, 'Raute auf (10|−2)').toBe(true);
  expect(b.slice(i).includes(RAND), 'roter Rand').toBe(true);
  const alpha = b.slice(0, i).reverse().find((c) => c.startsWith('globalAlpha='));
  return alpha ? Number(alpha.slice(12)) : 1;
}
const feld = (bis_ms = BIS): Szene['abgelehnt_feld'] => ({ x: 10, y: -2, bis_ms });

describe('NR27 P5c rotes Feld in der Szene (DESIGN 14.5, 14.15 Punkt 12)', () => {
  // Fehler, die ihn rot machen: das Feld wird nicht gezeichnet, an falscher Stelle, ohne Rand, oder in einer anderen Farbe.
  it('test_nr27_p5c_rotes_feld_gezeichnet: Raute auf (10|−2) in vorschau_nein mit rotem Rand, volle Deckkraft', () => {
    expect(rotesFeld(bild(szene(), false)), 'ohne Feld').toBeNull();
    expect(rotesFeld(bild(szene({ abgelehnt_feld: feld() }), false))).toBe(1);
  });

  // Fehler, die ihn rot machen: kein Ausblenden, Ausblenden auch bei weniger Bewegung, oder das Feld bleibt nach bis_ms stehen.
  it('test_nr27_p5c_rotes_feld_ausblenden: 100 ms vor Ende halb, bei weniger Bewegung voll, ab bis_ms weg', () => {
    expect(rotesFeld(bild(szene({ abgelehnt_feld: feld(), jetzt_ms: BIS - 300 }), false)), '300 ms vor Ende').toBe(1);
    expect(rotesFeld(bild(szene({ abgelehnt_feld: feld(), jetzt_ms: BIS - 100 }), false)), '100 ms vor Ende').toBe(0.5);
    expect(rotesFeld(bild(szene({ abgelehnt_feld: feld(), jetzt_ms: BIS - 100 }), true)), 'weniger Bewegung').toBe(1);
    expect(rotesFeld(bild(szene({ abgelehnt_feld: feld(), jetzt_ms: BIS }), false)), 'ab bis_ms').toBeNull();
  });

  // Fehler, die ihn rot machen: der Szenenschlüssel kennt das Feld nicht (es erschiene erst mit dem nächsten Sicherheitsbild) oder
  // bleibt nach dem Ablauf gleich (das Feld bliebe bis zur nächsten Änderung stehen).
  it('test_nr27_p5c_rotes_feld_schluessel: Feld an → neuer Schlüssel, abgelaufen → wieder wie ohne', () => {
    const ohne = szenenSchluessel(szene());
    expect(szenenSchluessel(szene({ abgelehnt_feld: feld() })), 'an').not.toBe(ohne);
    expect(szenenSchluessel(szene({ abgelehnt_feld: { x: 11, y: -2, bis_ms: BIS } })), 'anderes Feld').not.toBe(szenenSchluessel(szene({ abgelehnt_feld: feld() })));
    expect(szenenSchluessel(szene({ abgelehnt_feld: feld(), jetzt_ms: BIS })), 'abgelaufen').toBe(szenenSchluessel(szene({ jetzt_ms: BIS })));
  });

  // Fehler, der ihn rot macht: animationBedarf kennt das Ausblenden nicht – bei ruhigem Dorf liefe es nur mit dem Sicherheitsbild.
  it('test_nr27_p5c_rotes_feld_bedarf: solange das Feld steht flüssig, danach wie ohne', () => {
    expect(animationBedarf(szene({ modus: 'normal' }), false), 'Testaufbau: ruhiges Bild').toBe('keine');
    expect(animationBedarf(szene({ modus: 'normal', abgelehnt_feld: feld() }), false)).toBe('fluessig');
    expect(animationBedarf(szene({ modus: 'normal', abgelehnt_feld: feld(), jetzt_ms: BIS }), false)).toBe('keine');
  });
});
