import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { Kamera } from '../src/render/kamera';
import type { Szene } from '../src/render/szene';
import { animationBedarf } from '../src/render/szene-schluessel';
import { neu } from './hilfen';
import { neuerTakt, sollZeichnen, sparHinweisNoetig, type BildProbe, type TaktEingabe, type TaktZustand } from '../src/render/takt';

// NR12 / A90 Paket P1 (Bauplan docs/bauplaene/NR12-fluessig.md, Abschnitt 7 „P1“, Regeln 1–8 für sollZeichnen).
// Erwartete Bildzahlen von Hand hergeleitet: Grenze G gilt als erreicht bei Abstand ≥ G − 8 ms.
// 30-Bilder-Grenze also ab 25,33 ms: 60 Hz → jedes 2., 90 Hz → jedes 3. (22,2 < 25,33 ≤ 33,3), 120 Hz → jedes 4. (25,0 < 25,33 ≤ 33,3).

const ruhig: TaktEingabe = {
  jetzt_ms: 0, szene: 'S', kamera: 'K', bedarf: 'keine', effekte_aktiv: false,
  animation: 'an', sparmodus: false, verdeckt: false, erzwingen: false,
};

/** Ruft sollZeichnen für jede Bildzeit auf; `eingabe(i)` liefert die Abweichungen von `ruhig`. Gibt die Zeiten gezeichneter Bilder zurück. */
function lauf(zeiten: number[], eingabe: (i: number) => Partial<TaktEingabe> = () => ({}), start: TaktZustand = neuerTakt()): number[] {
  let z = start;
  const gezeichnet: number[] = [];
  zeiten.forEach((t, i) => {
    const r = sollZeichnen(z, { ...ruhig, ...eingabe(i), jetzt_ms: t });
    z = r.zustand;
    if (r.zeichnen) gezeichnet.push(t);
  });
  return gezeichnet;
}
/** n Bildzeiten mit festem Abstand ab 1000 ms (Startwert ungleich 0, damit nichts zufällig an der Null hängt). */
const takt = (n: number, abstand_ms: number): number[] => Array.from({ length: n }, (_, i) => 1000 + i * abstand_ms);

describe('NR12 P1 Takt: sollZeichnen', () => {
  it('NR12 P1: ohne Änderung und ohne Animation 2 Bilder je Sekunde', () => {
    // erstes Bild (noch nie gezeichnet), dann Sicherheitsbild bei 500 ms (Bild 30); Bild 29 = 483,3 ms < 492 ms
    expect(lauf(takt(60, 1000 / 60))).toEqual([1000, 1500]);
  });

  it('NR12 P1: fließende Animation bei exakt 1000/60 → 30 Bilder/s', () => {
    const t = lauf(takt(60, 1000 / 60), () => ({ bedarf: 'fluessig' }));
    expect(t).toHaveLength(30);
    for (let i = 1; i < t.length; i++) expect(t[i] - t[i - 1]).toBeCloseTo(1000 / 30, 6);
  });

  it('NR12 P1: fließende Animation bei abwechselnd 16,6/16,7 ms → 30', () => {
    const zeiten = [1000];
    for (let i = 1; i < 60; i++) zeiten.push(zeiten[i - 1] + (i % 2 ? 16.6 : 16.7));
    expect(lauf(zeiten, () => ({ bedarf: 'fluessig' }))).toHaveLength(30);
  });

  it('NR12 P1: 90 Hz (1000/90) → Animation 30, laufende Kamera 90', () => {
    expect(lauf(takt(90, 1000 / 90), () => ({ bedarf: 'fluessig' }))).toHaveLength(30);
    expect(lauf(takt(90, 1000 / 90), (i) => ({ bedarf: 'fluessig', kamera: `K${i}` }))).toHaveLength(90);
  });

  it('NR12 P1: 120 Hz (1000/120) → Animation 30', () => {
    expect(lauf(takt(120, 1000 / 120), () => ({ bedarf: 'fluessig' }))).toHaveLength(30);
  });

  it("NR12 P1: Animation aus → 2 Bilder/s; Baubalken ('langsam') bei Animation aus → 4 Bilder/s", () => {
    // Fließende Umgebungsanimation steht bei Animation aus still → nur Sicherheitsbild (Zielwerte Z1 ≤ 3/s, Z2 ≤ 5/s)
    expect(lauf(takt(60, 1000 / 60), () => ({ bedarf: 'fluessig', animation: 'aus' }))).toHaveLength(2);
    expect(lauf(takt(60, 1000 / 60), () => ({ bedarf: 'keine', animation: 'aus' }))).toHaveLength(2);
    // 250-ms-Grenze ab 242 ms: Bild 15 (250 ms) ja, Bild 14 (233,3 ms) nein → Bilder 0, 15, 30, 45
    expect(lauf(takt(60, 1000 / 60), () => ({ bedarf: 'langsam', animation: 'aus' }))).toEqual([1000, 1250, 1500, 1750]);
  });

  it('NR12 P1: Effekte aktiv bei Animation aus → 30 Bilder/s', () => {
    expect(lauf(takt(60, 1000 / 60), () => ({ effekte_aktiv: true, animation: 'aus' }))).toHaveLength(30);
    expect(lauf(takt(60, 1000 / 60), () => ({ effekte_aktiv: true, animation: 'aus', sparmodus: true }))).toHaveLength(30);
  });

  it('NR12 P1: Sparmodus, Kamera ändert sich jedes Bild (60 Hz) → 30', () => {
    expect(lauf(takt(60, 1000 / 60), (i) => ({ kamera: `K${i}`, sparmodus: true }))).toHaveLength(30);
    expect(lauf(takt(60, 1000 / 60), (i) => ({ kamera: `K${i}` }))).toHaveLength(60); // ohne Sparmodus kein Deckel
  });

  it('NR12 P1: Kameraänderung zeichnet im selben Aufruf', () => {
    const a = sollZeichnen(neuerTakt(), { ...ruhig, jetzt_ms: 1000 });
    expect(a.zeichnen).toBe(true);
    expect(sollZeichnen(a.zustand, { ...ruhig, jetzt_ms: 1001 }).zeichnen).toBe(false);
    expect(sollZeichnen(a.zustand, { ...ruhig, jetzt_ms: 1001, kamera: 'K2' }).zeichnen).toBe(true);
    expect(sollZeichnen(a.zustand, { ...ruhig, jetzt_ms: 1001, szene: 'S2' }).zeichnen).toBe(true);
  });

  it('NR12 P1: Szenenänderung während Sparmodus-Wartezeit wird im nächsten erlaubten Bild nachgeholt', () => {
    const d = 1000 / 60;
    // Bild 0 gezeichnet; ab Bild 1 neue Szene: Bild 1 (16,7 ms) gesperrt, Bild 2 (33,3 ms) holt nach; danach Ruhe bis zum Sicherheitsbild
    const t = lauf(takt(10, d), (i) => ({ sparmodus: true, szene: i === 0 ? 'S' : 'S2' }));
    expect(t).toEqual([1000, 1000 + 2 * d]);
  });

  it('NR12 P1: erzwingen → sofort zeichnen, auch 1 ms nach dem letzten Bild', () => {
    const a = sollZeichnen(neuerTakt(), { ...ruhig, jetzt_ms: 1000 }).zustand;
    expect(sollZeichnen(a, { ...ruhig, jetzt_ms: 1001, erzwingen: true }).zeichnen).toBe(true);
    expect(sollZeichnen(a, { ...ruhig, jetzt_ms: 1001, erzwingen: true, sparmodus: true }).zeichnen).toBe(true);
  });

  it('NR12 P1: verdeckt → genau ein Bild, danach keins; erzwingen während verdeckt → ein weiteres', () => {
    // auch Szenen- und Kameraänderungen und laufende Animation zeichnen unter dem Vorspann nicht
    const zeiten = takt(180, 1000 / 60);
    expect(lauf(zeiten, (i) => ({ verdeckt: true, szene: `S${i}`, kamera: `K${i}`, bedarf: 'fluessig', effekte_aktiv: true }))).toEqual([1000]);
    expect(lauf(zeiten, (i) => ({ verdeckt: true, erzwingen: i === 100 }))).toEqual([1000, zeiten[100]]);
  });

  it('NR12 P1: Wechsel des Animationsbedarfs zeichnet einmal sofort (endende Animation bleibt nicht bis zum Sicherheitsbild stehen)', () => {
    const d = 1000 / 60;
    // Bilder 0–2 fließend (0 und 2 gezeichnet), ab Bild 3 'keine': Bild 3 zeichnet sofort, danach erst wieder das Sicherheitsbild
    const t = lauf(takt(20, d), (i) => ({ bedarf: i < 3 ? 'fluessig' : 'keine' }));
    expect(t).toEqual([1000, 1000 + 2 * d, 1000 + 3 * d]);
  });

  it('NR12 P1: Zustand übernimmt Schlüssel und Zeit nur beim Zeichnen', () => {
    const a = sollZeichnen(neuerTakt(), { ...ruhig, jetzt_ms: 1000 }).zustand;
    expect(a).toEqual({ letztes_bild_ms: 1000, szene: 'S', kamera: 'K', bedarf: 'keine', gezeichnet: true });
    const b = sollZeichnen(a, { ...ruhig, jetzt_ms: 1010, szene: 'neu', sparmodus: true });
    expect(b).toEqual({ zeichnen: false, zustand: a });
  });

  it('NR12 P1: Grenze genau bei G − 8 ms zählt als erreicht, knapp darunter nicht', () => {
    const a = sollZeichnen(neuerTakt(), { ...ruhig, jetzt_ms: 1000 }).zustand;
    expect(sollZeichnen(a, { ...ruhig, jetzt_ms: 1492 }).zeichnen).toBe(true);
    expect(sollZeichnen(a, { ...ruhig, jetzt_ms: 1491.5 }).zeichnen).toBe(false);
    const l = sollZeichnen(neuerTakt(), { ...ruhig, jetzt_ms: 1000, bedarf: 'langsam' }).zustand;
    expect(sollZeichnen(l, { ...ruhig, jetzt_ms: 1242, bedarf: 'langsam' }).zeichnen).toBe(true);
    expect(sollZeichnen(l, { ...ruhig, jetzt_ms: 1241.5, bedarf: 'langsam' }).zeichnen).toBe(false);
  });
  it('NR22 E7 (Zusammenspiel Szene → Takt): Überlast federt 450 ms flüssig, danach nur noch das Sicherheitsbild', () => {
    // Bauplan NR20-22 E7/P7: kein Dauerblinken. Szene mit überlasteter Leitung (kapazitaet_ok false) und Überlast-Stück ab 1000 ms.
    // Von Hand (Grenze G erreicht ab G − 8 ms, Kopf dieser Datei): Federn < 450 ms → 'fluessig' = 30 Bilder/s, bei 60 Hz jedes
    // 2. Bild: i = 0, 2, … 26 (1000 … 1433,3 ms); i = 27 (1450 ms) Wechsel des Bedarfs → ein Bild; danach 'keine' → Sicherheitsbild
    // alle 500 ms: ab 1450 + 492 = 1942 → i = 57 (1950), dann i = 87, i = 117.
    // Mit dem alten Blinken ('langsam', 4/s) kämen nach dem Federn Bilder alle 250 ms dazu.
    const objekte = [neu('hz', 10, 10)];
    const netz = berechneNetz(objekte, [], 2);
    netz.kapazitaet_ok.set(5 * 20 + 6, false);
    const szene = (jetzt_ms: number): Szene => ({
      objekte, innen: [], netz, spiel: null, auswahl_id: null, modus: 'normal', geist: null, verschiebe_id: null, stempel: null,
      jetzt_ms, strassen: [], fluss: [], kw_anzeigen: false,
      ueberlast: [{ felder: [5 * 20 + 6, 5 * 20 + 7], dreiecke: [5 * 20 + 6], geplant: false, seit_ms: 1000 }],
    });
    const zeiten = takt(120, 1000 / 60);
    const gezeichnet = lauf(zeiten, (i) => ({ bedarf: animationBedarf(szene(zeiten[i]), false) }));
    const erwartet = [...Array.from({ length: 14 }, (_, i) => 2 * i), 27, 57, 87, 117].map((i) => zeiten[i]);
    expect(gezeichnet).toEqual(erwartet);
  });
});

describe('NR12 P1 Takt: Sparhinweis', () => {
  const proben = (n: number, p: BildProbe): BildProbe[] => Array.from({ length: n }, () => ({ ...p }));

  it('NR12 P1: Sparhinweis – 30-Bilder-Takt ohne Kamerabewegung → kein Hinweis; Kamera bei 16,7 ms → kein Hinweis; Kamera bei 40 ms → Hinweis; 59 Kamera-Proben → kein Hinweis', () => {
    expect(sparHinweisNoetig(proben(300, { raf_abstand_ms: 1000 / 30, zeichen_ms: 20, kamera_bewegt: false }))).toBe(false);
    expect(sparHinweisNoetig(proben(60, { raf_abstand_ms: 16.7, zeichen_ms: 5, kamera_bewegt: true }))).toBe(false);
    expect(sparHinweisNoetig(proben(60, { raf_abstand_ms: 40, zeichen_ms: 5, kamera_bewegt: true }))).toBe(true);
    expect(sparHinweisNoetig(proben(59, { raf_abstand_ms: 40, zeichen_ms: 5, kamera_bewegt: true }))).toBe(false);
  });

  it('NR12 P1: Sparhinweis – lange Zeichendauer allein reicht, Grenzwerte selbst noch nicht', () => {
    expect(sparHinweisNoetig(proben(60, { raf_abstand_ms: 16.7, zeichen_ms: 13, kamera_bewegt: true }))).toBe(true);
    expect(sparHinweisNoetig(proben(60, { raf_abstand_ms: 25, zeichen_ms: 12, kamera_bewegt: true }))).toBe(false);
  });

  it('NR12 P1: Sparhinweis – Median, nicht Mittelwert; Proben ohne Kamerabewegung zählen nicht mit', () => {
    // 31 schnelle, 29 sehr langsame Kamera-Proben: Mittel 16,7·31/60 + 500·29/60 ≈ 250 ms, Median 16,7 → kein Hinweis
    const gemischt = [...proben(31, { raf_abstand_ms: 16.7, zeichen_ms: 5, kamera_bewegt: true }), ...proben(29, { raf_abstand_ms: 500, zeichen_ms: 5, kamera_bewegt: true })];
    expect(sparHinweisNoetig(gemischt)).toBe(false);
    // 60 langsame Kamera-Proben + 200 schnelle ohne Bewegung → Median der gewerteten = 40 → Hinweis
    const mitRuhe = [...proben(200, { raf_abstand_ms: 16.7, zeichen_ms: 1, kamera_bewegt: false }), ...proben(60, { raf_abstand_ms: 40, zeichen_ms: 5, kamera_bewegt: true })];
    expect(sparHinweisNoetig(mitRuhe)).toBe(true);
  });

  it('NR12 P1: Sparhinweis – leere Liste → kein Hinweis', () => {
    expect(sparHinweisNoetig([])).toBe(false);
  });
});

describe('NR12 P1 Kamera: schluessel und inBewegung', () => {
  it('NR12 P1: kamera.schluessel – Winkeländerung 5e-4 rad ändert ihn, 1e-5 nicht', () => {
    const k = new Kamera();
    k.groesseSetzen(844, 390, 2);
    k.winkel_rad = 0.1;
    const vorher = k.schluessel();
    k.winkel_rad = 0.1 + 1e-5;
    expect(k.schluessel()).toBe(vorher);
    k.winkel_rad = 0.1 + 5e-4;
    expect(k.schluessel()).not.toBe(vorher);
  });

  it('NR12 P1: kamera.schluessel – Zoom, Verschiebung, Größe und Pixelfaktor ändern ihn', () => {
    const k = new Kamera();
    k.groesseSetzen(844, 390, 2);
    k.schiebe_x = 10; k.schiebe_y = 5;
    const vorher = k.schluessel();
    k.schiebe_x = 10.004;
    expect(k.schluessel()).toBe(vorher); // unter 0,01 px
    k.schiebe_x = 10.02;
    expect(k.schluessel()).not.toBe(vorher);
    k.schiebe_x = 10;
    k.schiebe_y = 5.02;
    expect(k.schluessel()).not.toBe(vorher);
    k.schiebe_y = 5;
    expect(k.schluessel()).toBe(vorher);
    const zoom = k.zoom;
    k.zoom = zoom + 5e-4;
    expect(k.schluessel()).not.toBe(vorher);
    k.zoom = zoom;
    k.groesseSetzen(390, 844, 2); // Handy gedreht
    expect(k.schluessel()).not.toBe(vorher);
    k.groesseSetzen(844, 390, 1.25); // Sparmodus
    const spar = k.schluessel();
    expect(spar).not.toBe(vorher);
    k.groesseSetzen(844, 390, 2);
    expect(k.schluessel()).toBe(vorher);
  });

  it('NR12 P1: kamera.inBewegung – nur während einer weichen Drehung', () => {
    const k = new Kamera();
    k.groesseSetzen(844, 390, 2);
    expect(k.inBewegung()).toBe(false);
    k.drehen(1);
    expect(k.inBewegung()).toBe(true);
    for (let i = 0; i < 200; i++) k.schritt(1 / 60);
    expect(k.inBewegung()).toBe(false);
  });
});
