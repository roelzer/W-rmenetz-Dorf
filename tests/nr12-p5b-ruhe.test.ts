import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { ortHolen } from '../src/core/orte';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import type { Flaeche, FlaechenFabrik } from '../src/render/ebenen';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { animationAus, bildAbschluss } from '../src/render/schleife';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { animationBedarf, szenenSchluessel } from '../src/render/szene-schluessel';
import { neuerTakt, sollZeichnen } from '../src/render/takt';

// NR12 / A90 Nachbesserung P5b „Bodenebene erst nach echter Ruhe neu aufbauen“ (Entscheidung Projektleiter 2026-11-05):
// Neuaufbau nach Zoomen/Drehen erst, wenn kein Finger auf der Karte liegt, ≥ 0,15 s ohne Kameraänderung vergangen sind und
// – nach einer Fingergeste – ≥ 3 gezeichnete Bilder ohne Kameraänderung (und ohne Finger) kamen. Ohne Geste wie bisher.

const T0 = 1_000_000;
const BILD_MS = 1000 / 60;

/** Aufzeichnungs-Kontext: protokolliert Methodenaufrufe und gesetzte Eigenschaften. */
function aufnahme(): { X: CanvasRenderingContext2D; befehle: string[] } {
  const befehle: string[] = [];
  const zustand = new Map<PropertyKey, unknown>();
  const text = (a: unknown): string => (typeof a === 'object' && a !== null ? String((a as { name?: string }).name ?? 'objekt') : String(a));
  const X = new Proxy({}, {
    get(_z, p) {
      if (zustand.has(p)) return zustand.get(p);
      return (...a: unknown[]) => {
        befehle.push(`${String(p)}(${a.map(text).join(',')})`);
        if (p === 'measureText') return { width: String(a[0]).length * 6 };
        if (p === 'createRadialGradient' || p === 'createLinearGradient') return { name: 'verlauf', addColorStop: () => {} };
        return undefined;
      };
    },
    set(_z, p, v) { zustand.set(p, v); befehle.push(`${String(p)}=${text(v)}`); return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { X, befehle };
}

function testFabrik() {
  const flaechen: Array<Flaeche & { befehle: string[] }> = [];
  const fabrik: FlaechenFabrik = (b, h) => {
    const a = aufnahme();
    const f = { name: `flaeche${flaechen.length + 1}`, width: b, height: h, befehle: a.befehle, getContext: () => a.X };
    flaechen.push(f);
    return f;
  };
  /** Befehle auf allen Ebenen-Flächen zusammen: wächst genau dann, wenn der Boden neu gemalt wird. */
  const befehle = (): number => flaechen.reduce((n, f) => n + f.befehle.length, 0);
  return { fabrik, flaechen, befehle };
}

function kamera(): Kamera {
  const k = new Kamera();
  k.groesseSetzen(844, 390, 2);
  k.zentrieren(11, 10, 2);
  return k;
}
function spielSzene(sp: Spiel, jetzt_ms: number): Szene {
  const ort = ortHolen(sp.stand.ort);
  return {
    objekte: sp.stand.objekte, innen: sp.stand.innen, netz: sp.netz, spiel: sp, auswahl_id: null, modus: 'normal',
    verschiebe_id: null, jetzt_ms, geist: null, stempel: null, strassen: ort.strassen, fluss: ort.fluss, kw_anzeigen: true,
  };
}
const drawImage = (b: string[]): string[] => b.filter((x) => x.startsWith('drawImage('));
const methoden = (b: string[]): number => b.filter((x) => /^\w+\(/.test(x)).length;

/** Ein gezeichnetes Bild mit `dt_s` seit dem vorigen gezeichneten Bild; `finger`: liegt gerade ein Finger auf der Karte. */
function bild(k: Kamera, s: Szene, dt_s: number, finger: boolean): string[] {
  const a = aufnahme(), m = new Maler(a.X);
  m.zeit_s = 1.7;
  zeichneSzene(m, k, s, new Effekte(), dt_s, finger);
  return a.befehle;
}

/** Aufbau für die Einzelbild-Tests: Ebene eingerichtet, erstes Bild gemalt. */
function start() {
  const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
  const sp = new Spiel(neuerSpielstand(T0), () => T0);
  const k = kamera(), s = spielSzene(sp, T0);
  bild(k, s, 0.016, false);
  expect(f.befehle()).toBeGreaterThan(1000);
  return { f, k, s };
}

afterEach(() => bodenEbeneEinrichten(null));

describe('NR12 P5b Bodenebene erst nach echter Ruhe neu aufbauen (A90)', () => {
  it('NR12 P5b: langes Bild (200 ms) ohne Kameraänderung während aktiver Geste → kein Neuaufbau, Boden direkt gezeichnet', () => {
    const { f, k, s } = start();
    k.zoomUm(1.1, 400, 200);
    bild(k, s, 0.016, true);
    const gemalt = f.befehle();
    for (let i = 0; i < 3; i++) {
      const b = bild(k, s, 0.2, true); // Ruckler: 200 ms, Finger liegt noch, Kamera unverändert
      expect(f.befehle()).toBe(gemalt);
      expect(drawImage(b)).toEqual([]);
      expect(methoden(b)).toBeGreaterThan(5000); // Bild trotzdem vollständig: Boden direkt auf der Hauptleinwand
    }
  });

  it('NR12 P5b: Finger gehoben + ≥ 150 ms + 3 ruhige Bilder → genau ein Neuaufbau, danach nur auflegen', () => {
    const { f, k, s } = start();
    k.zoomUm(1.1, 400, 200);
    bild(k, s, 0.016, true);
    const gemalt = f.befehle();
    bild(k, s, 0.2, true); // Finger hält still: 0,2 s Ruhe, aber Geste läuft
    expect(f.befehle()).toBe(gemalt);
    bild(k, s, 0.016, false); // 1. ruhiges Bild ohne Finger
    bild(k, s, 0.016, false); // 2.
    expect(f.befehle()).toBe(gemalt);
    const aufbau = bild(k, s, 0.016, false); // 3. → Neuaufbau
    expect(f.befehle()).toBeGreaterThan(gemalt);
    expect(drawImage(aufbau)).toHaveLength(1);
    const danach = f.befehle();
    expect(drawImage(bild(k, s, 0.016, false))).toHaveLength(1);
    expect(f.befehle()).toBe(danach);
  });

  it('NR12 P5b: Finger gehoben, nur ein langes Bild → noch kein Neuaufbau; er kommt mit dem dritten ruhigen Bild', () => {
    const { f, k, s } = start();
    k.zoomUm(1.1, 400, 200);
    bild(k, s, 0.016, true);
    const gemalt = f.befehle();
    const lang = bild(k, s, 0.2, false); // Ruckler direkt nach dem Heben
    expect(f.befehle()).toBe(gemalt);
    expect(drawImage(lang)).toEqual([]);
    bild(k, s, 0.016, false);
    expect(f.befehle()).toBe(gemalt);
    bild(k, s, 0.016, false);
    expect(f.befehle()).toBeGreaterThan(gemalt);
  });

  it('NR12 P5b: Bewegung und Heben im selben Bild – die Geste zählt trotzdem (ein langes Bild reicht nicht)', () => {
    const { f, k, s } = start();
    k.zoomUm(1.05, 400, 200);
    bild(k, s, 0.016, true);
    k.zoomUm(1.05, 400, 200);
    bild(k, s, 0.016, false); // letzte Kameraänderung, Finger schon weg
    const gemalt = f.befehle();
    bild(k, s, 0.2, false);
    expect(f.befehle()).toBe(gemalt);
    bild(k, s, 0.016, false);
    expect(f.befehle()).toBe(gemalt);
    bild(k, s, 0.016, false);
    expect(f.befehle()).toBeGreaterThan(gemalt);
  });

  it('NR12 P5b: Finger in der Ruhe erneut aufgelegt → Bildzählung beginnt nach dem Heben von vorn', () => {
    const { f, k, s } = start();
    k.drehenUm(0.1);
    bild(k, s, 0.016, true);
    const gemalt = f.befehle();
    bild(k, s, 0.1, false);
    bild(k, s, 0.1, false);
    bild(k, s, 0.016, true); // Finger wieder auf der Karte, Kamera unverändert
    expect(f.befehle()).toBe(gemalt);
    bild(k, s, 0.016, false);
    bild(k, s, 0.016, false);
    expect(f.befehle()).toBe(gemalt);
    bild(k, s, 0.016, false);
    expect(f.befehle()).toBeGreaterThan(gemalt);
  });

  it('NR12 P5b: nach der Geste reichen 3 ruhige Bilder nicht vor 150 ms Ruhe', () => {
    const { f, k, s } = start();
    k.zoomUm(1.1, 400, 200);
    bild(k, s, 0.016, true);
    const gemalt = f.befehle();
    for (let i = 1; i <= 9; i++) bild(k, s, 0.016, false); // 9 · 0,016 = 0,144 s
    expect(f.befehle()).toBe(gemalt);
    bild(k, s, 0.016, false); // 0,160 s
    expect(f.befehle()).toBeGreaterThan(gemalt);
  });

  it('NR12 P5b: ohne Geste (Mausrad, Tasten) unverändert – ein langes ruhiges Bild baut sofort neu', () => {
    const { f, k, s } = start();
    for (const geste of [() => k.zoomUm(1.1, 400, 200), () => k.drehenUm(0.1)]) {
      geste();
      const gemalt = f.befehle();
      bild(k, s, 0.016, false);
      expect(f.befehle()).toBe(gemalt);
      const aufbau = bild(k, s, 0.2, false);
      expect(f.befehle()).toBeGreaterThan(gemalt);
      expect(drawImage(aufbau)).toHaveLength(1);
    }
  });

  it('NR12 P5b: Verschieben mit dem Finger ohne Zoom nutzt die Ebene weiter (nur auflegen, über den Rand hinaus neu)', () => {
    const { f, k, s } = start();
    const gemalt = f.befehle();
    k.schiebe_x += 10;
    expect(drawImage(bild(k, s, 0.016, true))).toEqual(['drawImage(flaeche1,-402,-195)']);
    expect(f.befehle()).toBe(gemalt);
    k.schiebe_x += 202; // 424 Gerätepixel seit dem Malen > Rand 422
    expect(drawImage(bild(k, s, 0.016, true))).toHaveLength(1);
    expect(f.befehle()).toBeGreaterThan(gemalt);
  });

  it('NR12 P5b: bodenEbeneEinrichten mitten in der Gestenruhe → das erste Bild baut sofort auf', () => {
    const { k, s } = start();
    k.zoomUm(1.1, 400, 200);
    bild(k, s, 0.016, true);
    const neu = testFabrik(); bodenEbeneEinrichten(neu.fabrik);
    expect(drawImage(bild(k, s, 0.016, true))).toHaveLength(1);
    expect(neu.befehle()).toBeGreaterThan(1000);
  });

  it('NR12 P5b: Bildschleife mit Takt („Weniger Bewegung“) – nach der Geste baut das dritte Sicherheitsbild neu, nicht schon das erste', () => {
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const sp = new Spiel(neuerSpielstand(T0), () => T0);
    const k = kamera(), effekte = new Effekte(), maler = new Maler(aufnahme().X);
    let takt = neuerTakt(), letzt_gezeichnet_ms = 0, erzwingen = false, jetzt_ms = 0;
    const einstellungen = { weniger_bewegung: true, sparmodus: false };
    const schritt = (finger: boolean): boolean => {
      jetzt_ms += BILD_MS;
      const szene = spielSzene(sp, T0), aus = animationAus(einstellungen);
      maler.reduziert = aus;
      const r = sollZeichnen(takt, {
        jetzt_ms, szene: szenenSchluessel(szene), kamera: k.schluessel(), bedarf: animationBedarf(szene, effekte.aktiv()),
        effekte_aktiv: effekte.aktiv(), animation: aus ? 'aus' : 'an', sparmodus: false, verdeckt: false, erzwingen,
      });
      takt = r.zustand;
      const b = bildAbschluss({ zeichnen: r.zeichnen, jetzt_ms, letzt_gezeichnet_ms, erzwingen });
      if (r.zeichnen) { maler.X = aufnahme().X; maler.zeit_s = 0; zeichneSzene(maler, k, szene, effekte, b.dt_s, finger); }
      letzt_gezeichnet_ms = b.letzt_gezeichnet_ms; erzwingen = b.erzwingen;
      return r.zeichnen;
    };
    schritt(false);
    const vorZoom = f.befehle();
    for (let i = 0; i < 10; i++) { k.zoomUm(1.02, 422, 195); expect(schritt(true)).toBe(true); }
    expect(f.befehle()).toBe(vorZoom);
    // Finger gehoben; ohne Animation zeichnet der Takt nur noch Sicherheitsbilder (alle 500 ms = 30 Aufrufe).
    const gezeichnet: number[] = [];
    let neuBei = -1;
    for (let i = 1; i <= 120 && neuBei < 0; i++) {
      if (!schritt(false)) continue;
      gezeichnet.push(i);
      if (f.befehle() > vorZoom) neuBei = i;
    }
    expect(gezeichnet).toEqual([30, 60, 90]);
    expect(neuBei).toBe(90);
  });

  it('NR12 P5b: main.ts reicht den Finger-Zustand der Steuerung an zeichneSzene; Steuerung zählt Finger und Mitteltasten-Drehen', () => {
    const ohneKommentare = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const main = ohneKommentare(readFileSync('src/main.ts', 'utf8'));
    expect(main).toMatch(/zeichneSzene\(\s*maler\s*,\s*kamera\s*,\s*szene\s*,\s*steuerung\.effekte\s*,\s*abschluss\.dt_s\s*,\s*steuerung\.fingerAufKarte\(\)\s*\)/);
    const steuerung = ohneKommentare(readFileSync('src/steuerung.ts', 'utf8'));
    expect(steuerung).toMatch(/fingerAufKarte\(\)\s*:\s*boolean\s*\{\s*return\s+this\.zeiger\.size\s*>\s*0\s*\|\|\s*this\.mitteDreh\s*!==\s*null\s*;\s*\}/);
    // Die Render-Seite bekommt den Zustand nur als Wert, sie fragt keinen Browser.
    for (const f of ['src/render/szene.ts', 'src/render/ebenen.ts']) {
      expect(ohneKommentare(readFileSync(f, 'utf8'))).not.toMatch(/\b(document|window|navigator|PointerEvent|TouchEvent)\b/);
    }
  });
});
