import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { bahnFelder, NORD_PLAN } from '../src/core/nordviertel';
import type { Objekt } from '../src/core/typen';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { neu } from './hilfen';
import { aufnahme, leeresDorf } from './hilfen/nr22';

// NR27 P5c (Review P5b4 Bedenken 3; DESIGN 14.8 Zeile „Erfolgsmoment“, design/tokens.json zeit_ms.dunst_heben 1200, blase_versatz 60):
// Die Blasen der neuen Häuser hinter der Bahn erscheinen erst nach dem Dunst-Heben, je Haus 60 ms später; bei „Weniger Bewegung“
// sofort. Muster wie tests/nr27-p5b4-erfolg.test.ts.
//
// Werte von Hand: Bildzeiten 0,0625 s (im Gleitkomma exakt). Im Bild Nummer j nach dem Auslösebild (j = 0) gilt die Erfolgszeit
// t = j · 0,0625 s. Haus 1 ab 1,20 s → erst ab j = 20 (1,25 s; j = 19 ist 1,1875 s); Haus 2 ab 1,26 s → ab j = 21 (1,3125 s);
// Haus 3 ab 1,32 s → ab j = 22 (1,375 s). Abstand jeder Grenze zum Bildraster ≥ 5 ms, weit über dem Rundungsfehler.
// Erkennungszeichen der „kein Anschluss“-Blase (gebaeude.ts zeichneBlase, Art 'stecker'): Scheibe in '#8d99a5'.
const DT = 0.0625, STECKER = 'fillStyle=#8d99a5';

function kamera(): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = 1.4; k.zentrieren(10, -3, 1);
  return k;
}
const HZ = neu('hz', 11, 30), NETZ = berechneNetz([HZ], [], 1);
/** Drei neue Häuser aus dem Nordplan; mit Station, aber ohne Anschluss → „kein Anschluss“-Blase (blase.ts). */
const NEUE: Objekt[] = NORD_PLAN.filter((h) => h.y === -5).slice(0, 3)
  .map((h) => neu(h.typ, h.x, h.y, { station: 'klein', ohne_station: true }));
const szene = (spiel: Szene['spiel'], mit_kulisse: boolean): Szene => ({
  objekte: mit_kulisse ? [HZ] : [HZ, ...NEUE], innen: [], netz: NETZ, spiel, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 50_000, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46,
  bahn: bahnFelder(), kulisse: mit_kulisse ? NORD_PLAN : [],
});
const neuesSpiel = () => leeresDorf(1_700_000_000_000).s;

function darstellung(reduziert: boolean) {
  const e = new Effekte();
  return {
    e,
    bild(s: Szene, dt_s = DT): string[] {
      const a = aufnahme(), m = new Maler(a.X);
      m.reduziert = reduziert;
      bodenEbeneEinrichten(null);
      zeichneSzene(m, kamera(), s, e, dt_s);
      return a.befehle;
    },
  };
}
const blasen = (b: string[]): number => b.filter((c) => c === STECKER).length;

describe('NR27 P5c Blasen der neuen Häuser im Erfolgsmoment (DESIGN 14.8)', () => {
  // Fehler, die ihn rot machen: die Blasen kommen sofort (Altverhalten), alle auf einmal statt versetzt, der Versatz beginnt nicht
  // nach den 1200 ms des Dunsts, oder der Erfolgsmoment endet, bevor das letzte Haus seine Blase bekommen hat.
  it('test_nr27_p5c_blasen_versetzt: keine Blase bis 1,2 s, dann je 60 ms ein Haus mehr', () => {
    const d = darstellung(false), sp = neuesSpiel();
    d.bild(szene(sp, true));
    const je: number[] = [];
    for (let j = 0; j <= 23; j++) je.push(blasen(d.bild(szene(sp, false))));
    expect(je[0], 'Auslösebild').toBe(0);
    expect(je[19], 'bei 1,1875 s').toBe(0);
    expect(je[20], 'bei 1,25 s').toBe(1);
    expect(je[21], 'bei 1,3125 s').toBe(2);
    expect(je[22], 'bei 1,375 s').toBe(3);
    expect(je[23], 'danach bleiben alle').toBe(3);
    expect(d.e.aktiv(), 'nach dem letzten Haus vorbei').toBe(false);
  });

  // Fehler, der ihn rot macht: der Erfolgsmoment endet nach der Zeit statt nach dem Bild, das die letzte Blase zeigt. Bei langen
  // Bildern (3/32 s, exakt darstellbar) zeigt das Bild bei 1,3125 s erst zwei Blasen (Haus 3 ab 1,32 s); danach ist die Zeit
  // 1,40625 s schon über 1,2 + 3 · 0,06 = 1,38 s. Endete der Effekt hier, fiele der Grund für das nächste Bild weg (effekte_aktiv).
  it('test_nr27_p5c_blasen_letztes_bild: der Moment läuft, bis ein Bild alle Blasen gezeigt hat', () => {
    const d = darstellung(false), sp = neuesSpiel(), dt = 3 / 32;
    d.bild(szene(sp, true), dt);
    for (let j = 0; j < 14; j++) d.bild(szene(sp, false), dt);
    expect(blasen(d.bild(szene(sp, false), dt)), 'bei 1,3125 s').toBe(2);
    expect(d.e.aktiv(), 'läuft weiter').toBe(true);
    expect(blasen(d.bild(szene(sp, false), dt)), 'bei 1,40625 s').toBe(3);
    expect(d.e.aktiv(), 'jetzt vorbei').toBe(false);
  });

  // Fehler, der ihn rot macht: bei „Weniger Bewegung“ warten die Blasen trotzdem (Versatz ist Bewegung, DESIGN 14.8 rechte Spalte).
  it('test_nr27_p5c_blasen_weniger_bewegung: alle Blasen im Auslösebild', () => {
    const d = darstellung(true), sp = neuesSpiel();
    d.bild(szene(sp, true));
    expect(blasen(d.bild(szene(sp, false)))).toBe(3);
  });

  // Fehler, der ihn rot macht: die Sperre greift auch ohne Erfolgsmoment (z. B. beim Laden eines erschlossenen Stands).
  it('test_nr27_p5c_blasen_beim_laden: erstes Bild eines erschlossenen Stands zeigt alle Blasen', () => {
    const d = darstellung(false);
    expect(blasen(d.bild(szene(neuesSpiel(), false)))).toBe(3);
  });
});
