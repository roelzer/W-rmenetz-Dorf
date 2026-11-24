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
// nach 18 Bildern = 1,125 s ist noch Dunst da, nach 20 Bildern = 1,25 s nicht mehr. Funken an den neuen Häusern (Feinschliff,
// Werte im Block unten). Weniger Bewegung: keine Funken, kein Dunst und (Fix-Runde NR27)
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
/** Startpunkte der grünen Funken (Kreis direkt nach fillStyle=#9be36a, siehe Effekte.zeichne) in Zeichenreihenfolge. */
const gruen = (b: string[]): number[][] =>
  b.flatMap((c, i) => (c.startsWith('arc(') && b[i - 2] === FUNKE ? [c.slice(4, -1).split(',').map(Number).slice(0, 2)] : []));
const KURZ = 1 / 1024;
/** Drei neue Häuser aus dem Nordplan (Zeile −5, je 1 Feld groß) und ein Dorfhaus vor der Bahn. */
const NEUE: Objekt[] = NORD_PLAN.filter((h) => h.y === -5).slice(0, 3).map((h) => neu(h.typ, h.x, h.y));
const DORFHAUS = neu('efh', 5, 3);
/** Vor dem Wechsel: Kulisse, keine echten Häuser hinter der Bahn; danach: die neuen Häuser stehen (wie nordviertelAnlegen). */
const mitHaeusern = (sp: Szene['spiel'], mit_kulisse: boolean, dazu: Objekt[] = []): Szene =>
  ({ ...szene(sp, mit_kulisse), objekte: [HZ, ...dazu, ...(mit_kulisse ? [] : NEUE)] });
/** Abstand eines Punkts vom Funken-Start des Hauses o (0,4 Kachel über der Mitte). */
const abstand = (k: Kamera, o: Objekt, x: number, y: number): number => {
  const [cx, cy] = k.mitte(o.x, o.y);
  return Math.hypot(x - cx, y - (cy - k.tw * 0.4));
};
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

  // Tester-Vorarbeit NR27 Feinschliff (DESIGN 14.8 Stand 2026-11-24, Designer-Treue NR27 W1 Befund 1): die Funken stehen an den
  // neuen Häusern, nicht mehr an den Gruben. Die Funken-Tests mit Häusern stehen im eigenen Block unten.
  // Fehler, die ihn rot machen: der Wechsel wird nicht erkannt (kein Dunst, kein laufender Effekt) oder er löst ein zweites Mal aus.
  it('test_nr27_erfolg_wechsel: Kulisse → leer im selben Spiel: Dunst noch ganz da, Effekt läuft, nur einmal', () => {
    const d = darstellung(false), sp = neuesSpiel();
    expect(dunst(d.bild(mitHaeusern(sp, true))), 'vorher: Dunst über der Kulisse').toBe(1);
    const b = d.bild(mitHaeusern(sp, false), KURZ);
    expect(dunst(b), 'erstes Bild des Wechsels').toBe(1);
    expect(d.e.aktiv(), 'läuft').toBe(true);
    // einmalig: über 0,3 s ohne Kulisse kommen nie mehr als 3 × 6 grüne Funken zusammen (Funken leben mindestens 0,8 s)
    let n = 0;
    for (let i = 0; i < 300; i++) n = gruen(d.bild(mitHaeusern(sp, false), KURZ)).length;
    expect(n, 'keine zweite Auslösung').toBe(18);
  });
});

// Werte von Hand (DESIGN 14.8 „Funken an allen neuen Häusern“, Entscheidung PL: je Haus um zeit_ms.blase_versatz = 60 ms versetzt):
// Effekte.funken setzt 24 Teilchen, jedes vierte in '#9be36a' → 6 grüne je Haus. Start 0,4 Kachel über der Hausmitte
// (efh/rh sind 1 Feld groß, Mitte = k.mitte(x, y)). Bildzeit KURZ = 1/1024 s (exakt): Funken fliegen je Bild höchstens
// 60 × 1/1024 × (|v| ≤ 6 + Auftrieb 4) ≈ 0,59 px, im Bild ihres Entstehens liegt jede Funke also < 1 px vom Start.
// Versatz: Haus 2 ab 60 ms = 61,44 Bilder, Haus 3 ab 120 ms = 122,88 Bilder nach dem Auslösebild (Bild 0). Je nachdem, ob die
// Umsetzung die Zeit des Auslösebilds mitzählt und vor oder nach dem Weiterzählen prüft, erscheinen sie in Bild 61–63 bzw.
// 122–124; die Tests lassen je ein Bild Spielraum (60–64, 121–125). Welches Haus zuerst kommt, legt DESIGN nicht fest – geprüft
// wird, dass jeder Schritt an einem anderen neuen Haus sprüht und am Ende alle drei dran waren.
// Gruben (10|−1), (10|−4) aus grubenFelder(); die drei Häuser (2|−5), (4|−5), (6|−5) liegen weit weg (≥ 4 Felder).
describe('NR27 Feinschliff Erfolgsmoment: Funken an den neuen Häusern, je 60 ms versetzt (DESIGN 14.8)', () => {
  // Fehler, die ihn rot machen: Funken weiter an den Gruben, an allen Häusern auf einmal, auch an Dorfhäusern, an der falschen
  // Stelle (nicht 0,4 Kachel über der Mitte) oder gar keine.
  it('test_nr27_erfolg_funken_erstes_haus: Auslösebild: 6 grüne Funken an genau einem neuen Haus, keine an Gruben oder im Dorf', () => {
    const d = darstellung(false), sp = neuesSpiel(), k = kamera();
    d.bild(mitHaeusern(sp, true, [DORFHAUS]));
    const g = gruen(d.bild(mitHaeusern(sp, false, [DORFHAUS]), KURZ));
    expect(g, 'grüne Funken im Auslösebild').toHaveLength(6);
    const treffer = NEUE.filter((o) => g.every(([x, y]) => abstand(k, o, x, y) < 1));
    expect(treffer, 'alle sechs am selben neuen Haus').toHaveLength(1);
    for (const [gx, gy] of [[10, -1], [10, -4]] as const) {
      const [cx, cy] = k.mitte(gx, gy), oy = cy - k.tw * 0.4;
      expect(g.filter(([x, y]) => Math.hypot(x - cx, y - oy) < 1), `Grube (${gx}|${gy})`).toHaveLength(0);
    }
    expect(g.filter(([x, y]) => abstand(k, DORFHAUS, x, y) < 1), 'Dorfhaus').toHaveLength(0);
  });

  // Fehler, die ihn rot machen: alle Häuser sprühen auf einmal (kein Versatz), der Versatz ist nicht 60 ms (z. B. 1 Bild, 100 ms
  // oder über Bilder statt Zeit gezählt), ein Haus sprüht doppelt oder ein Haus wird ausgelassen, oder die Warteliste geht verloren.
  it('test_nr27_erfolg_funken_versetzt: Haus 2 nach 60 ms, Haus 3 nach 120 ms, jedes an einem anderen Haus', () => {
    const d = darstellung(false), sp = neuesSpiel(), k = kamera();
    d.bild(mitHaeusern(sp, true));
    const zahlen: number[] = [], neueStellen: Array<{ bild: number; punkte: number[][] }> = [];
    for (let n = 0; n <= 200; n++) {
      const g = gruen(d.bild(mitHaeusern(sp, false), KURZ));
      const vorher = zahlen.length ? zahlen[zahlen.length - 1] : 0;
      if (g.length > vorher) neueStellen.push({ bild: n, punkte: g.slice(vorher) });
      zahlen.push(g.length);
    }
    expect(zahlen[0], 'Auslösebild: ein Haus').toBe(6);
    expect(zahlen[59], 'bei 59 ms noch ein Haus').toBe(6);
    expect(zahlen[65], 'bei 65 ms zwei Häuser').toBe(12);
    expect(zahlen[120], 'bei 120 Bildern (117 ms) noch zwei Häuser').toBe(12);
    expect(zahlen[126], 'bei 126 Bildern (123 ms) drei Häuser').toBe(18);
    expect(zahlen[200], 'danach keine weiteren').toBe(18);
    expect(neueStellen.map((s) => s.punkte.length), 'je Schritt sechs neue grüne Funken').toEqual([6, 6, 6]);
    expect(neueStellen[1].bild, 'Haus 2 frühestens').toBeGreaterThanOrEqual(60);
    expect(neueStellen[1].bild, 'Haus 2 spätestens').toBeLessThanOrEqual(64);
    expect(neueStellen[2].bild, 'Haus 3 frühestens').toBeGreaterThanOrEqual(121);
    expect(neueStellen[2].bild, 'Haus 3 spätestens').toBeLessThanOrEqual(125);
    const haus = neueStellen.map(({ punkte }) => NEUE.findIndex((o) => punkte.every(([x, y]) => abstand(k, o, x, y) < 1)));
    expect(haus.every((i) => i >= 0), 'jeder Schritt an einem neuen Haus').toBe(true);
    expect(new Set(haus).size, 'drei verschiedene Häuser').toBe(3);
  });

  // Fehler, der ihn rot macht: ohne neue Häuser fällt die Umsetzung auf Funken an den Gruben (oder anderswo) zurück.
  it('test_nr27_erfolg_ohne_neue_haeuser: keine Funken, der Dunst hebt sich trotzdem', () => {
    const d = darstellung(false), sp = neuesSpiel();
    d.bild(szene(sp, true));
    const b = d.bild(szene(sp, false), KURZ);
    expect(dunst(b), 'Wechsel erkannt').toBe(1);
    let summe = zahl(b, FUNKE);
    for (let i = 0; i < 200; i++) summe += zahl(d.bild(szene(sp, false), KURZ), FUNKE);
    expect(summe, 'keine grünen Funken in 0,2 s').toBe(0);
  });

  // Fehler, der ihn rot macht: bei „Weniger Bewegung“ sprühen die Häuser trotzdem (sofort oder aus der Warteliste).
  it('test_nr27_erfolg_ruhig_keine_funken: weniger Bewegung mit neuen Häusern: 0 Funken, auch nicht verspätet', () => {
    const d = darstellung(true), sp = neuesSpiel();
    d.bild(mitHaeusern(sp, true));
    let summe = 0;
    for (let i = 0; i <= 200; i++) summe += zahl(d.bild(mitHaeusern(sp, false), KURZ), FUNKE);
    expect(summe).toBe(0);
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
