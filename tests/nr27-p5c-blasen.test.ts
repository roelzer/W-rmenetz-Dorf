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
// Fassung bis 2026-11-23: Blasen der neuen Häuser erst nach dem Dunst-Heben, je Haus 60 ms später. Seit DESIGN 14.8 vom
// 2026-11-24 entfällt der Versatz: die Blasen folgen sofort den normalen Regeln, mit und ohne „Weniger Bewegung“.
// Muster wie tests/nr27-p5b4-erfolg.test.ts. Bildzeiten 0,0625 s.
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
  // Tester-Vorarbeit NR27 Feinschliff (DESIGN 14.8 Stand 2026-11-24: „Entfallen … Blasen mit Versatz“; 14.4: „Danach verhalten
  // sich die Häuser wie alle anderen“): die Blasen der neuen Häuser warten nicht mehr auf den Dunst, sie folgen den normalen Regeln.
  // Ersetzt die Tests „keine Blase bis 1,2 s, dann je 60 ms ein Haus mehr“ und „der Moment läuft, bis ein Bild alle Blasen gezeigt
  // hat“ (beide schrieben den Versatz fest).
  // Fehler, die ihn rot machen: die Blasen warten noch (1,2 s oder je Haus versetzt), oder sie verschwinden im Lauf des Moments.
  it('test_nr27_p5c_blasen_sofort: alle Blasen der neuen Häuser schon im Auslösebild und danach durchgehend', () => {
    const d = darstellung(false), sp = neuesSpiel();
    d.bild(szene(sp, true));
    const je: number[] = [];
    for (let j = 0; j <= 23; j++) je.push(blasen(d.bild(szene(sp, false))));
    expect(je, 'Bild 0 … 23 (0 … 1,4375 s)').toEqual(new Array(24).fill(3));
  });

  // Fehler, der ihn rot macht: im Erfolgsmoment verschwinden Blasen im Dorf, oder die neuen Häuser warten noch.
  it('test_nr27_p5c_blasen_dorf_bleiben: Dorfhaus und neue Häuser zeigen ihre Blasen im Auslösebild', () => {
    const d = darstellung(false), sp = neuesSpiel(), dorf = neu('efh', 5, 3, { station: 'klein', ohne_station: true });
    const mit = (kulisse: boolean): Szene => ({ ...szene(sp, kulisse), objekte: [...szene(sp, kulisse).objekte, dorf] });
    expect(blasen(d.bild(mit(true))), 'vorher: nur das Dorfhaus').toBe(1);
    expect(blasen(d.bild(mit(false))), 'Auslösebild: Dorfhaus und drei neue Häuser').toBe(4);
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
