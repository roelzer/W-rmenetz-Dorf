import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aufloesungGeaendert } from '../src/render/aufloesung';
import { flaechenGroesse } from '../src/render/ebenen';
import { Kamera } from '../src/render/kamera';
import { animationAus, bildAbschluss, sparHinweisSchritt } from '../src/render/schleife';
import { neuerTakt, sollZeichnen, type BildProbe, type TaktEingabe } from '../src/render/takt';

// NR12 / A90 Paket P5: Entscheidungen der Bildschleife aus src/main.ts als reine Funktionen (Review P1 K1),
// Kamera übernimmt den wirksamen Faktor ungedeckelt (Review P1 K2), eine Quelle für die Größe der Bodenfläche (Review P3a).

const ruhe = (jetzt_ms: number, teile: Partial<TaktEingabe> = {}): TaktEingabe => ({
  jetzt_ms, szene: 's', kamera: 'k', bedarf: 'keine', effekte_aktiv: false, animation: 'an', sparmodus: false, verdeckt: false, erzwingen: false, ...teile,
});
const probe = (raf_abstand_ms: number, kamera_bewegt = true): BildProbe => ({ raf_abstand_ms, zeichen_ms: 2, kamera_bewegt });
const offen = { verdeckt: false, sparmodus: false };

describe('NR12 P5 Bildschleife: reine Entscheidungen', () => {
  it('NR12 P5: Leinwand nur bei echter Änderung von Breite, Höhe oder Faktor neu setzen', () => {
    const a = { faktor: 2, breite_px: 1688, hoehe_px: 780 };
    expect(aufloesungGeaendert(a, { ...a })).toBe(false);
    expect(aufloesungGeaendert(a, { ...a, breite_px: 1687 })).toBe(true);
    expect(aufloesungGeaendert(a, { ...a, hoehe_px: 781 })).toBe(true);
    // Gleiche Pixelzahl, anderer Faktor: Kamera und Ebene rechnen mit dem Faktor, also neu.
    expect(aufloesungGeaendert(a, { ...a, faktor: 2.0005 })).toBe(true);
    // Start: noch keine Leinwand gesetzt (Faktor 0) → die erste echte Größe gilt als Änderung.
    expect(aufloesungGeaendert({ faktor: 0, breite_px: 0, hoehe_px: 0 }, a)).toBe(true);
  });

  it('NR12 P5: erzwingen wird nach dem gezeichneten Bild zurückgesetzt, dt zählt ab dem letzten gezeichneten Bild', () => {
    // Gezeichnet 1250 ms, letztes Bild 1000 ms: dt = 0,25 s, Merker aus, neues letztes Bild 1250.
    expect(bildAbschluss({ zeichnen: true, jetzt_ms: 1250, letzt_gezeichnet_ms: 1000, erzwingen: true }))
      .toEqual({ dt_s: 0.25, letzt_gezeichnet_ms: 1250, erzwingen: false });
    // Nicht gezeichnet: Merker bleibt, bis wirklich gezeichnet wurde; letztes Bild bleibt.
    expect(bildAbschluss({ zeichnen: false, jetzt_ms: 1266, letzt_gezeichnet_ms: 1250, erzwingen: true }))
      .toEqual({ dt_s: 0, letzt_gezeichnet_ms: 1250, erzwingen: true });
  });

  it('NR12 P5: mit dem Takt – dt seit dem letzten gezeichneten Bild, nicht seit dem ausgelassenen Aufruf', () => {
    let takt = neuerTakt(), letzt_gezeichnet_ms = 1000, erzwingen = true;
    const schritt = (e: TaktEingabe) => {
      const r = sollZeichnen(takt, { ...e, erzwingen });
      takt = r.zustand;
      const b = bildAbschluss({ zeichnen: r.zeichnen, jetzt_ms: e.jetzt_ms, letzt_gezeichnet_ms, erzwingen });
      letzt_gezeichnet_ms = b.letzt_gezeichnet_ms; erzwingen = b.erzwingen;
      return { zeichnen: r.zeichnen, dt_s: b.dt_s };
    };
    expect(schritt(ruhe(1250))).toEqual({ zeichnen: true, dt_s: 0.25 });
    expect(erzwingen).toBe(false);
    expect(schritt(ruhe(1266))).toEqual({ zeichnen: false, dt_s: 0 });
    // Kamera bewegt 1350 ms: dt = 0,1 s seit 1250.
    expect(schritt(ruhe(1350, { kamera: 'k2' }))).toEqual({ zeichnen: true, dt_s: 0.1 });
    // Vorspann deckt, schon gezeichnet: nichts; Ereignis (Rückkehr in die App) setzt den Merker → genau ein Bild, dann aus.
    expect(schritt(ruhe(1366, { kamera: 'k2', verdeckt: true })).zeichnen).toBe(false);
    erzwingen = true;
    expect(schritt(ruhe(1400, { kamera: 'k2', verdeckt: true })).zeichnen).toBe(true);
    expect(erzwingen).toBe(false);
    expect(schritt(ruhe(1416, { kamera: 'k2', verdeckt: true })).zeichnen).toBe(false);
  });

  it('NR12 P5: Umgebungsanimation aus bei „Weniger Bewegung“ oder Sparmodus (überschreibt steuerung)', () => {
    expect(animationAus({ weniger_bewegung: false, sparmodus: false })).toBe(false);
    expect(animationAus({ weniger_bewegung: true, sparmodus: false })).toBe(true);
    expect(animationAus({ weniger_bewegung: false, sparmodus: true })).toBe(true);
    expect(animationAus({ weniger_bewegung: true, sparmodus: true })).toBe(true);
  });

  it('NR12 P5: Sparhinweis – erst nach dem Vorspann, nur ohne Sparmodus, nur Kamerabilder', () => {
    const start: BildProbe[] = [];
    expect(sparHinweisSchritt(start, probe(40), { verdeckt: true, sparmodus: false })).toEqual({ proben: [], zeigen: false });
    expect(sparHinweisSchritt(start, probe(40), { verdeckt: false, sparmodus: true })).toEqual({ proben: [], zeigen: false });
    expect(sparHinweisSchritt(start, probe(40, false), offen)).toEqual({ proben: [], zeigen: false });
    expect(sparHinweisSchritt(start, probe(40), offen).proben).toHaveLength(1);
  });

  it('NR12 P5: Sparhinweis – 59 langsame Kamerabilder kein Hinweis, das 60. zeigt ihn genau einmal', () => {
    let proben: readonly BildProbe[] | null = [];
    for (let i = 0; i < 59; i++) {
      const r = sparHinweisSchritt(proben, probe(40), offen);
      expect(r.zeigen).toBe(false);
      proben = r.proben;
    }
    expect(proben).toHaveLength(59);
    const sechzig = sparHinweisSchritt(proben, probe(40), offen);
    expect(sechzig).toEqual({ proben: null, zeigen: true });
    // Danach ist die Messung beendet (null = schon entschieden oder schon einmal auf dem Gerät gezeigt).
    expect(sparHinweisSchritt(null, probe(40), offen)).toEqual({ proben: null, zeigen: false });
  });

  it('NR12 P5: Sparhinweis – 60 flüssige Kamerabilder (16,7 ms) beenden die Messung ohne Hinweis', () => {
    let r: { proben: readonly BildProbe[] | null; zeigen: boolean } = { proben: [], zeigen: false };
    for (let i = 0; i < 60; i++) r = sparHinweisSchritt(r.proben, probe(16.7), offen);
    expect(r).toEqual({ proben: null, zeigen: false });
  });

  it('NR12 P5: src/render/schleife.ts ist rein (kein Browser, keine Oberfläche, kein Spielkern)', () => {
    const t = readFileSync(new URL('../src/render/schleife.ts', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(t).not.toMatch(/\b(document|window|requestAnimationFrame|performance|localStorage|matchMedia|navigator)\b/);
    expect(t).not.toMatch(/from\s+['"]\.\.\/(ui|steuerung|core)/);
  });
});

describe('NR12 P5 Kamera und Bodenfläche', () => {
  it('NR12 P5: Kamera übernimmt den wirksamen Faktor aus zeichenAufloesung ohne eigenen Deckel', () => {
    const k = new Kamera();
    k.groesseSetzen(844, 390, 3);
    expect(k.pixelverhaeltnis).toBe(3);
    k.groesseSetzen(844, 390, 1.25);
    expect(k.pixelverhaeltnis).toBe(1.25);
    k.groesseSetzen(844, 390, 0);
    expect(k.pixelverhaeltnis).toBe(1);
  });

  it('NR12 P5: Größe der Bodenfläche aus einer Quelle – aufgerundete Bildgröße plus Rand auf beiden Seiten', () => {
    // 1688,6 → 1689 + 2·422 = 2533; 780,4 → 781 + 2·195 = 1171.
    expect(flaechenGroesse(1688.6, 780.4, 422, 195)).toEqual({ breite_px: 2533, hoehe_px: 1171 });
    // Ganzzahlige Größe bleibt: 1688 + 844 = 2532; 780 + 390 = 1170.
    expect(flaechenGroesse(1688, 780, 422, 195)).toEqual({ breite_px: 2532, hoehe_px: 1170 });
  });
});
