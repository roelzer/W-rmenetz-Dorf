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

// NR27 P5b4 Erfolgsmoment „Querung fertig“ (DESIGN 14.8, 14.15 Punkt 16, 22). Auslöser ist allein der Wechsel der Kulisse
// (stand.nordviertel false → true) im selben Spiel, kein Kernereignis. Muster wie tests/nr27-p5b3-zug.test.ts.
//
// Werte von Hand: Dunst hebt sich in 1200 ms (`dunst_heben`). Bildzeiten 0,0625 s (im Gleitkomma exakt, Lektion Grenzwerte):
// nach 18 Bildern = 1,125 s ist noch Dunst da, nach 20 Bildern = 1,25 s nicht mehr. Funken je Grube 24 Teilchen, jede vierte in
// '#9be36a' (effekte.ts) → 6 je Grube, 12 an beiden Gruben. Weniger Bewegung: keine Funken, kein Dunst und (Fix-Runde NR27)
// auch kein Aufleuchten der Grubenfelder mehr (früher 0,4 s in '#ffe14d').
const DT = 0.0625, FUNKE = 'fillStyle=#9be36a', LEUCHTEN = 'fillStyle=#ffe14d';

function kamera(winkel_rad = 0): Kamera {
  const k = new Kamera();
  k.winkel_rad = winkel_rad;
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = 1.4; k.zentrieren(10, -3, 1);
  return k;
}
const HZ = neu('hz', 11, 30), NETZ = berechneNetz([HZ], [], 1);
const szene = (spiel: Szene['spiel'], mit_kulisse: boolean): Szene => ({
  objekte: [HZ] as Objekt[], innen: [], netz: NETZ, spiel, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 50_000, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46,
  bahn: bahnFelder(), kulisse: mit_kulisse ? NORD_PLAN : [],
});
const neuesSpiel = () => leeresDorf(1_700_000_000_000).s;

/** Ein Bildschirm mit bleibender Darstellung (Effekte, Maler) über mehrere Bilder. */
function darstellung(reduziert: boolean, winkel_rad = 0) {
  const e = new Effekte();
  return {
    e,
    bild(s: Szene, dt_s = DT): string[] {
      const a = aufnahme(), m = new Maler(a.X);
      m.reduziert = reduziert;
      bodenEbeneEinrichten(null);
      zeichneSzene(m, kamera(winkel_rad), s, e, dt_s);
      return a.befehle;
    },
  };
}
const zahl = (b: string[], c: string): number => b.filter((x) => x === c).length;
/** Stelle in der Aufnahme, an der der Dunst gezeichnet wird, sonst −1. */
function dunstStelle(b: string[]): number {
  // Kennzeichen des Dunsts (zeichneDunst): der Verlauf beginnt genau am ersten Eckpunkt der Fläche, der Südwestecke am Zaun.
  const args = (c: string): string[] => c.slice(c.indexOf('(') + 1, -1).split(',');
  const i = b.findIndex((c, j) => {
    if (!c.startsWith('createLinearGradient(')) return false;
    const ecke = b.slice(j + 1, j + 4).find((x) => x.startsWith('moveTo('));
    return !!ecke && args(ecke).join() === args(c).slice(0, 2).join();
  });
  return i;
}
/** Wird der Dunst gezeichnet, und mit welcher Deckkraft (1 = wie vor der Erschließung)? */
function dunst(b: string[]): number | null {
  const i = dunstStelle(b);
  if (i < 0) return null;
  const vorher = b.slice(Math.max(0, i - 3), i).reverse().find((c) => c.startsWith('globalAlpha='));
  return vorher ? Number(vorher.slice(12)) : 1;
}

describe('NR27 P5b4 Erfolgsmoment nur beim Wechsel, nie beim Laden (DESIGN 14.8)', () => {
  // Fehler, die ihn rot machen: der Erfolgsmoment löst schon im ersten Bild aus (Laden eines erschlossenen Spielstands) oder beim
  // Wechsel auf ein anderes Spiel, das schon erschlossen ist.
  it('test_nr27_erfolg_nicht_beim_laden: erstes Bild mit erschlossenem Viertel ohne Funken und ohne Dunst', () => {
    const d = darstellung(false), sp = neuesSpiel();
    const b = d.bild(szene(sp, false));
    expect(zahl(b, FUNKE), 'Funken').toBe(0);
    expect(dunst(b), 'Dunst').toBeNull();
    expect(d.e.aktiv(), 'kein laufender Effekt').toBe(false);
    // anderes Spiel geladen: vorher Kulisse, jetzt ein erschlossener Stand – kein Wechsel im selben Spiel
    const d2 = darstellung(false);
    d2.bild(szene(neuesSpiel(), true));
    const b2 = d2.bild(szene(neuesSpiel(), false));
    expect(zahl(b2, FUNKE), 'anderes Spiel').toBe(0);
    expect(d2.e.aktiv(), 'anderes Spiel').toBe(false);
  });

  // Fehler, der ihn rot macht: der Wechsel wird nicht erkannt, die Funken fehlen oder stehen nur an einer Grube.
  it('test_nr27_erfolg_wechsel: Kulisse → leer im selben Spiel: Funken an beiden Gruben, Dunst noch ganz da', () => {
    const d = darstellung(false), sp = neuesSpiel(), k = kamera();
    expect(dunst(d.bild(szene(sp, true))), 'vorher: Dunst über der Kulisse').toBe(1);
    // sehr kurzes Bild (1 ms): Funken fliegen 60 × dt × (|v| ≤ 6 + Auftrieb 4) ≤ 0,6 px weit, ihr Start bleibt prüfbar
    const b = d.bild(szene(sp, false), 0.001);
    expect(zahl(b, FUNKE)).toBe(12);
    expect(dunst(b), 'erstes Bild des Wechsels').toBe(1);
    expect(d.e.aktiv(), 'läuft').toBe(true);
    // Funken starten 0,4 Kachel über der Mitte der Gruben (10|−1) und (10|−4), effekte.ts
    const kreise = b.flatMap((c, i) => (c.startsWith('arc(') && b[i - 2] === FUNKE ? [c.slice(4, -1).split(',').map(Number)] : []));
    for (const y of [-1, -4]) {
      const [cx, cy] = k.mitte(10, y), oy = cy - k.tw * 0.4;
      expect(kreise.filter(([x, yy]) => Math.hypot(x - cx, yy - oy) < 1), `Grube y = ${y}`).toHaveLength(6);
    }
    // einmalig: das nächste Bild ohne Kulisse löst nicht noch einmal aus
    expect(zahl(d.bild(szene(sp, false)), FUNKE), 'keine neuen Funken').toBeLessThanOrEqual(12);
  });
});

describe('NR27 P5b4 Dunst hebt sich in 1,2 s (DESIGN 14.8 „Dunst 1200 ms kurve.weich“)', () => {
  // Fehler, die ihn rot machen: der Dunst verschwindet sofort, bleibt stehen, nimmt zwischendurch zu, läuft nicht über dt_s oder
  // dauert länger als 1,2 s.
  it('test_nr27_dunst_heben: Deckkraft fällt stetig, nach 1,125 s noch da, nach 1,25 s weg', () => {
    const d = darstellung(false), sp = neuesSpiel();
    d.bild(szene(sp, true));
    const werte: number[] = [];
    for (let i = 0; i <= 18; i++) werte.push(dunst(d.bild(szene(sp, false))) ?? 0);
    expect(werte[0]).toBe(1);
    for (let i = 1; i < werte.length; i++) expect(werte[i], `Bild ${i}`).toBeLessThan(werte[i - 1]);
    expect(werte[18], 'nach 1,125 s').toBeGreaterThan(0);
    d.bild(szene(sp, false));
    expect(dunst(d.bild(szene(sp, false))), 'nach 1,25 s').toBeNull();
  });

  // Fehler, die ihn rot machen: die neuen Häuser liegen sofort über dem Dunst (sie sprängen klar heraus, während der Boden noch
  // dunstig ist), oder in der um 180° gedrehten Ansicht kämen sie nach Tiefe zuletzt (die Kulisse lag immer zuerst).
  // Erkennungszeichen: Bäume zeichnen zuerst ihren Schatten mit translate(cx + 0,04 · tw, cy + 0,06 · th) (Maler.schatten, k = 0,5).
  it.each([0, Math.PI])('test_nr27_dunst_ueber_neuen_haeusern: solange er sich hebt, liegt der Dunst über dem Gebiet hinter der Bahn, nicht über dem Dorf (Drehung %f)', (winkel) => {
    const d = darstellung(false, winkel), sp = neuesSpiel(), nord = neu('baum', 8, -5), sued = neu('baum', 7, 1), k = kamera(winkel);
    const mit = (kulisse: boolean): Szene => ({ ...szene(sp, kulisse), objekte: kulisse ? [HZ, sued] : [HZ, nord, sued] });
    d.bild(mit(true));
    d.bild(mit(false));
    const b = d.bild(mit(false));
    const stelle = (o: Objekt): number => {
      const [cx, cy] = k.mitte(o.x, o.y), soll = [cx + k.tw * 0.04, cy + k.th * 0.06];
      return b.findIndex((c) => c.startsWith('translate(') && c.slice(10, -1).split(',').map(Number).every((v, j) => Math.abs(v - soll[j]) < 1e-6));
    };
    const i = dunstStelle(b);
    expect(stelle(nord), 'Baum hinter der Bahn gezeichnet').toBeGreaterThanOrEqual(0);
    expect(stelle(nord), 'Baum hinter der Bahn vor dem Dunst').toBeLessThan(i);
    expect(stelle(sued), 'Dorfbaum nach dem Dunst').toBeGreaterThan(i);
  });

  // Fehler, der ihn rot macht: die Zeit läuft über Bilder statt über dt_s (bei 30 Bildern/s wäre er doppelt so lange zu sehen).
  it('test_nr27_dunst_zeit_ueber_dt: mit 0,1-s-Bildern bei 1,1 s noch da, bei 1,3 s weg', () => {
    const d = darstellung(false), sp = neuesSpiel();
    d.bild(szene(sp, true), 0.1);
    // nach dem auslösenden Bild 10 weitere: das nächste Bild liegt bei 1,1 s (Abstand zur Grenze 1,2 s weit über dem Rundungsfehler)
    for (let i = 0; i < 10; i++) d.bild(szene(sp, false), 0.1);
    expect(dunst(d.bild(szene(sp, false), 0.1)), 'nach 1,1 s').not.toBeNull();
    d.bild(szene(sp, false), 0.1);
    expect(dunst(d.bild(szene(sp, false), 0.1)), 'nach 1,3 s').toBeNull();
  });
});

describe('NR27 P5b4 Erfolgsmoment bei weniger Bewegung (DESIGN 14.8 „Funken aus, Dunst sofort weg“)', () => {
  // Fix-Runde NR27 (Designer-Treue Entscheidung 2): Das gelbe Aufleuchten ist gestrichen (ohne DESIGN-Beleg). Weniger Bewegung:
  // Dunst sofort weg, keine Funken, kein Aufleuchten; die Meldung F1 prüft tests/nr27-fix-meldungen.test.ts.
  // Fehler, die ihn rot machen: Funken oder sich hebender Dunst auch bei weniger Bewegung, oder die Grubenfelder leuchten noch auf.
  it('test_nr27_erfolg_weniger_bewegung: sofortiger Wechsel ohne Funken, ohne Dunst, ohne Aufleuchten', () => {
    const d = darstellung(true), sp = neuesSpiel();
    d.bild(szene(sp, true));
    const b = d.bild(szene(sp, false));
    expect(zahl(b, FUNKE), 'keine Funken').toBe(0);
    expect(dunst(b), 'Dunst sofort weg').toBeNull();
    expect(zahl(b, LEUCHTEN), 'kein Aufleuchten').toBe(0);
    for (let i = 0; i < 8; i++) {
      const weiter = d.bild(szene(sp, false));
      expect(zahl(weiter, LEUCHTEN), `kein Aufleuchten, Bild ${i + 2}`).toBe(0);
      expect(dunst(weiter), `kein Dunst, Bild ${i + 2}`).toBeNull();
    }
  });
});
