import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { bahnFelder } from '../src/core/nordviertel';
import type { Objekt } from '../src/core/typen';
import { zugImBild, zugLage } from '../src/render/bahn';
import { Kamera } from '../src/render/kamera';
import { animationBedarf } from '../src/render/szene-schluessel';
import { neuerTakt, sollZeichnen, type TaktEingabe } from '../src/render/takt';
import { neu } from './hilfen';
import { leeresDorf } from './hilfen/nr22';

// NR27 P5d (Review P5b K2): Takt der Querungs-Baustelle. DESIGN 14.5 „Bau“: Haube zittert und Abgas nur bei Animation an,
// „Takt ‚flüssig‘ nur, solange die Baustelle im Bild ist“; die Bohrlinie ist Information und läuft auch bei weniger Bewegung und
// im Sparmodus mit Takt „langsam“. DESIGN 14.8: Bohrlinie „Takt ‚langsam‘ (4 Bilder/s)“, weniger Bewegung/Sparmodus „bleibt“.
// Muster wie tests/nr27-p5b3-zug.test.ts.
//
// Werte von Hand: Baustelle in Spalte x = 10, Startgrube (10|−1) bis Zielgrube (10|−4) (DESIGN 14.5 Skizze). Bildschirm 844 × 390.
// 4 Bilder/s → spätestens nach 1000 / 4 = 250 ms ein neues Bild. Bauzeit −1000 … 3 600 000 ms, also bei 50 000 ms mitten im
// Bau; bei 50 000 ms fährt ohnehin kein Zug (Fahrplan tests/nr27-p5b3-zug.test.ts), so zählt allein die Baustelle.
// Zug bei 9000 ms (Takt 0, Gleis 2 nach Osten, Spitze bei −2 + 3 · 9 = 25): ohne Baustelle reicht er von x = 21 bis 25.
const BAU = { start_ms: -1000, ende_ms: 3_600_000 }, RUHIG_MS = 50_000, ZUG_MS = 9000, BAUSTELLE: Array<[number, number]> = [[10, -1], [10, -2], [10, -3], [10, -4]];

const hz = [neu('hz', 11, 30)];
const szene = (extra: Partial<Parameters<typeof animationBedarf>[0]>, objekte: Objekt[] = hz): Parameters<typeof animationBedarf>[0] => ({
  objekte, innen: [], netz: berechneNetz(objekte, [], 1), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: RUHIG_MS, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46,
  bahn: bahnFelder(), ...extra,
});
function kamera(mitte: [number, number], zoom: number): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = zoom; k.zentrieren(mitte[0], mitte[1], 1);
  return k;
}
/** Spiel, in dem gerade der Abschnitt mit der Bahnquerung gebaut wird (oder ein Abschnitt ohne Querung). */
function spielImBau(mit_querung: boolean) {
  const { s } = leeresDorf(1_700_000_000_000);
  s.stand.abschnitt = mit_querung ? { phase: 'bau', mit_querung: true, bau: { art: 'neu', ...BAU } } : { phase: 'bau', bau: { art: 'neu', ...BAU } };
  return s;
}
const IM_BILD = (): Kamera => kamera([10, -2.5], 1.4), WEG = (): Kamera => kamera([10, 40], 2.2), AUF_ZUG = (): Kamera => kamera([25, -2.5], 3.5);
/** Abstand in Bildpunkten, den ein Feld mindestens vom Bildrand haben muss, um sicher außerhalb zu liegen (2 Kacheln). */
const ausserhalb = (k: Kamera, [x, y]: [number, number]): boolean => {
  const [px, py] = k.mitte(x, y), r = 2 * k.tw;
  return px < -r || px > 844 + r || py < -r || py > 390 + r;
};
const innerhalb = (k: Kamera, [x, y]: [number, number]): boolean => {
  const [px, py] = k.mitte(x, y);
  return px > 0 && px < 844 && py > 0 && py < 390;
};

describe('NR27 P5d Baustelle: „flüssig“ nur, solange sie im Bild ist (DESIGN 14.5 „Leben“)', () => {
  it('Testaufbau: Kameras – Baustelle ganz im Bild, weit außerhalb; Zug-Kamera sieht den Zug, aber nicht die Baustelle', () => {
    for (const f of BAUSTELLE) expect(innerhalb(IM_BILD(), f), `im Bild ${f}`).toBe(true);
    for (const f of BAUSTELLE) expect(ausserhalb(WEG(), f), `weg ${f}`).toBe(true);
    for (const f of BAUSTELLE) expect(ausserhalb(AUF_ZUG(), f), `Zug-Kamera ${f}`).toBe(true);
    expect(zugLage(ZUG_MS, null)).toEqual({ gleis_y: -2.72, kopf_x: 25, richtung: 1 });
    expect(zugImBild(AUF_ZUG(), { gleis_y: -2.72, kopf_x: 25, richtung: 1 }), 'Zug im Bild der Zug-Kamera').toBe(true);
    expect(zugLage(RUHIG_MS, null), 'bei 50 000 ms fährt kein Zug').toBeNull();
  });

  // Fehler, der ihn rot macht: animationBedarf kennt die Querungs-Baustelle nicht (Zittern und Abgas stünden still).
  it('test_nr27_baustelle_takt: Querung im Bau, Baustelle im Bild → flüssig', () => {
    expect(animationBedarf(szene({ spiel: spielImBau(true) }), false, IM_BILD())).toBe('fluessig');
  });

  // Fehler, der ihn rot macht: die Baustelle hält die Karte dauerhaft auf 30 Bildern/s, auch wenn sie außer Sicht ist.
  it('test_nr27_baustelle_takt: Baustelle außerhalb der Kamera → nicht flüssig', () => {
    expect(animationBedarf(szene({ spiel: spielImBau(true) }), false, WEG())).not.toBe('fluessig');
  });

  // Fehler, die ihn rot machen: flüssig auch ohne Querungsbau (Abschnitt ohne Querung, kein Spiel) oder ohne Bahn – dort zeichnet
  // die Szene keine Baustelle (szene.ts zeichnet sie nur mit Bahn und laufendem Querungsbau).
  it('test_nr27_baustelle_takt: Gegenproben – ohne Querungsbau oder ohne Bahn kein Bedarf durch die Baustelle', () => {
    expect(animationBedarf(szene({ spiel: null }), false, IM_BILD()), 'kein Spiel').toBe('keine');
    expect(animationBedarf(szene({ spiel: spielImBau(false) }), false, IM_BILD()), 'Abschnitt ohne Querung').not.toBe('fluessig');
    expect(animationBedarf(szene({ spiel: spielImBau(true), bahn: undefined }), false, IM_BILD()), 'ohne Bahn').toBe('keine');
  });

  // Fehler, der ihn rot macht: während der Querungsbau läuft, zählt ein (pausierter) Zug doch als Grund für flüssig.
  it('test_nr27_baustelle_takt: Querung im Bau – der pausierte Zug allein macht nichts flüssig; ohne Querungsbau schon', () => {
    expect(animationBedarf(szene({ spiel: spielImBau(true), jetzt_ms: ZUG_MS }), false, AUF_ZUG()), 'Querung im Bau').not.toBe('fluessig');
    expect(animationBedarf(szene({ spiel: spielImBau(false), jetzt_ms: ZUG_MS }), false, AUF_ZUG()), 'Gegenprobe: Zug fährt').toBe('fluessig');
  });
});

describe('NR27 P5d Bohrlinie: bei weniger Bewegung und im Sparmodus mindestens 4 Bilder/s (DESIGN 14.5, 14.8)', () => {
  // So rechnet die Bildschleife (main.ts): Bedarf aus animationBedarf, Entscheidung in sollZeichnen. Nach dem ersten Bild ändert
  // sich weder Szene noch Kamera; spätestens 250 ms später muss das nächste Bild kommen, sonst wächst die Bohrlinie mit weniger
  // als 4 Bildern/s.
  // Fehler, die ihn rot machen: die Baustelle liefert bei ausgeschalteter Animation nur das Sicherheitsbild (2 Bilder/s) oder gar
  // keinen Grund für neue Bilder.
  it.each([
    ['weniger Bewegung', false],
    ['Sparmodus', true],
  ])('test_nr27_baustelle_takt: %s, Baustelle im Bild → nach 250 ms ein neues Bild', (_name, sparmodus) => {
    const bedarf = animationBedarf(szene({ spiel: spielImBau(true) }), false, IM_BILD());
    const eingabe = (jetzt_ms: number): TaktEingabe => ({
      jetzt_ms, szene: 's', kamera: 'k', bedarf, effekte_aktiv: false, animation: 'aus', sparmodus, verdeckt: false, erzwingen: false,
    });
    const erstes = sollZeichnen(neuerTakt(), eingabe(10_000));
    expect(erstes.zeichnen, 'Testaufbau: erstes Bild').toBe(true);
    expect(sollZeichnen(erstes.zustand, eingabe(10_250)).zeichnen, `nach 250 ms (Bedarf ${bedarf})`).toBe(true);
  });
});
