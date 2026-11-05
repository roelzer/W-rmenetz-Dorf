import { afterEach, describe, expect, it } from 'vitest';
import { KATALOG, passendeStation } from '../src/core/katalog';
import { nachbardoerfer } from '../src/core/nachbarn';
import { ortHolen } from '../src/core/orte';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import { Effekte } from '../src/render/effekte';
import type { Flaeche, FlaechenFabrik } from '../src/render/ebenen';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { animationAus, bildAbschluss } from '../src/render/schleife';
import { bodenEbeneEinrichten, bodenEbeneVerwerfen, zeichneSzene, type Szene } from '../src/render/szene';
import { animationBedarf, szenenSchluessel } from '../src/render/szene-schluessel';
import { neuerTakt, sollZeichnen } from '../src/render/takt';

// NR12 / A90 Paket P5 „Zusammenspiel“ (Bauplan docs/bauplaene/NR12-fluessig.md, Abschnitt 7 „P5“):
// echtes Spiel, Szene wie steuerung.szene(), Kamera wie am Handy, Takt und Bodenebene zusammen – so wie die Bildschleife in main.ts.

const T0 = 1_000_000;
const BILD_MS = 1000 / 60;

/** Aufzeichnungs-Kontext: protokolliert Methodenaufrufe und gesetzte Eigenschaften mit Argumenten. */
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

interface TestFlaeche extends Flaeche { name: string; befehle: string[] }
function testFabrik() {
  const flaechen: TestFlaeche[] = [];
  const fabrik: FlaechenFabrik = (b, h) => {
    const a = aufnahme();
    const f: TestFlaeche = { name: `flaeche${flaechen.length + 1}`, width: b, height: h, befehle: a.befehle, getContext: () => a.X };
    flaechen.push(f);
    return f;
  };
  const befehle = (): number => flaechen.reduce((n, f) => n + f.befehle.length, 0);
  return { fabrik, flaechen, befehle };
}

function spielSzene(sp: Spiel, jetzt_ms: number): Szene {
  const ort = ortHolen(sp.stand.ort);
  return {
    objekte: sp.stand.objekte, innen: sp.stand.innen, netz: sp.netz, spiel: sp, auswahl_id: null, modus: 'normal',
    verschiebe_id: null, jetzt_ms, geist: null, stempel: null, strassen: ort.strassen, fluss: ort.fluss, kw_anzeigen: true,
  };
}
function besuchSzene(jetzt_ms: number): Szene {
  const v = nachbardoerfer()[0];
  return { objekte: v.objekte, innen: v.innen, netz: v.netz, spiel: null, auswahl_id: null, modus: 'normal', verschiebe_id: null, jetzt_ms, geist: null, stempel: null };
}

/**
 * Bildschleife wie main.ts: je Aufruf Takt fragen (sollZeichnen, danach bildAbschluss), bei Ja zeichnen; `neuAufbauen` wie die Ereignis-Abos
 * (visibilitychange/pageshow/contextrestored). Die Spieluhr steht, damit gleiche Szenen gleiche Befehle ergeben.
 */
function schleife(weniger_bewegung: boolean) {
  const z = { t: T0 };
  const sp = new Spiel(neuerSpielstand(T0), () => z.t);
  const k = new Kamera();
  k.groesseSetzen(844, 390, 2);
  k.zentrieren(11, 10, 2);
  const effekte = new Effekte();
  const maler = new Maler(aufnahme().X);
  let takt = neuerTakt(), letzt_gezeichnet_ms = 0, erzwingen = false, jetzt_ms = 0, besuch = false;
  const einstellungen = { weniger_bewegung, sparmodus: false };
  return {
    sp, k,
    besuchen(an: boolean) { besuch = an; },
    neuAufbauen() { bodenEbeneVerwerfen(); erzwingen = true; },
    /** Ein Bildaufruf `abstand_ms` nach dem vorigen; liefert, ob gezeichnet wurde, und die Befehle der Hauptleinwand. */
    bild(abstand_ms = BILD_MS): { zeichnen: boolean; befehle: string[] } {
      jetzt_ms += abstand_ms;
      const szene = besuch ? besuchSzene(z.t) : spielSzene(sp, z.t);
      const aus = animationAus(einstellungen);
      maler.reduziert = aus;
      const r = sollZeichnen(takt, {
        jetzt_ms, szene: szenenSchluessel(szene), kamera: k.schluessel(), bedarf: animationBedarf(szene, effekte.aktiv()),
        effekte_aktiv: effekte.aktiv(), animation: aus ? 'aus' : 'an', sparmodus: einstellungen.sparmodus, verdeckt: false, erzwingen,
      });
      takt = r.zustand;
      const b = bildAbschluss({ zeichnen: r.zeichnen, jetzt_ms, letzt_gezeichnet_ms, erzwingen });
      const a = aufnahme();
      if (r.zeichnen) {
        maler.X = a.X;
        maler.zeit_s = aus ? 0 : jetzt_ms / 1000;
        zeichneSzene(maler, k, szene, effekte, b.dt_s);
      }
      letzt_gezeichnet_ms = b.letzt_gezeichnet_ms; erzwingen = b.erzwingen;
      return { zeichnen: r.zeichnen, befehle: a.befehle };
    },
  };
}
const drawImage = (b: string[]): string[] => b.filter((x) => x.startsWith('drawImage('));

afterEach(() => bodenEbeneEinrichten(null));

describe('NR12 P5 Zusammenspiel Takt + Bodenebene + Spiel (A90)', () => {
  it('NR12 P5: Aktion → Takt erlaubt das nächste Bild und die Befehle ändern sich', () => {
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const s = schleife(true);
    const erstes = s.bild();
    expect(erstes.zeichnen).toBe(true);
    // Ruhe ohne Animation: nächstes Bild erst mit dem Sicherheitsbild (500 ms); das zeigt genau dasselbe.
    expect(s.bild().zeichnen).toBe(false);
    const sicherheit = s.bild(500);
    expect(sicherheit.zeichnen).toBe(true);
    expect(sicherheit.befehle).toEqual(erstes.befehle);
    const boden = f.befehle();

    const haus = s.sp.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station)!;
    expect(s.sp.stationKaufen(haus.id, passendeStation(KATALOG[haus.typ].bedarf_kw as number).id).ok).toBe(true);
    const danach = s.bild();
    expect(danach.zeichnen).toBe(true);
    expect(danach.befehle).not.toEqual(erstes.befehle);
    expect(f.befehle()).toBe(boden); // Station gehört nicht zum Boden: die Fläche wird nur aufgelegt
  });

  it('NR12 P5: Gebäude platziert → nächstes Bild gezeichnet, Boden und Hauptleinwand aktuell', () => {
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const s = schleife(true);
    const ok = (r: { ok: boolean; hinweis?: string }) => expect(r.ok, r.hinweis).toBe(true);
    ok(s.sp.ersteQuelleWaehlen('kessel'));
    const erstes = s.bild();
    expect(s.bild().zeichnen).toBe(false);
    ok(s.sp.platzieren('huette', 15, 15));
    const danach = s.bild();
    expect(danach.zeichnen).toBe(true);
    expect(danach.befehle).not.toEqual(erstes.befehle);
  });

  it('NR12 P5: Ruhe → nach dem Neuaufbau zeichnet ein Bild nur noch auflegen + Bewegtes', () => {
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const s = schleife(false);
    const erstes = s.bild();
    expect(f.flaechen).toHaveLength(1);
    expect(f.befehle()).toBeGreaterThan(1000);
    expect(drawImage(erstes.befehle)).toHaveLength(1);
    const gemalt = f.befehle();
    let gezeichnet = 0;
    for (let i = 0; i < 120; i++) {
      const b = s.bild();
      if (!b.zeichnen) continue;
      gezeichnet++;
      expect(drawImage(b.befehle)).toEqual([drawImage(erstes.befehle)[0]]);
    }
    expect(gezeichnet).toBeGreaterThan(0);
    expect(f.befehle()).toBe(gemalt); // Fabrik-Kontext: 0 neue Befehle
    expect(f.flaechen).toHaveLength(1);
  });

  it('NR12 P5: Verwerfen (Rückkehr in die App) → erzwungenes Bild baut den Boden neu', () => {
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const s = schleife(true);
    s.bild();
    expect(s.bild().zeichnen).toBe(false);
    s.neuAufbauen();
    expect(f.flaechen[0].width).toBe(0); // alte Fläche sofort freigegeben (iOS-Speicher)
    expect(f.flaechen[0].height).toBe(0);
    const zurueck = s.bild(1);
    expect(zurueck.zeichnen).toBe(true);
    expect(f.flaechen).toHaveLength(2);
    expect(f.flaechen[1].befehle.length).toBeGreaterThan(1000);
    expect(drawImage(zurueck.befehle)).toEqual(['drawImage(flaeche2,-422,-195)']);
    // Der Merker ist nach dem Bild zurückgesetzt: das nächste Bild 1 ms später entfällt.
    expect(s.bild(1).zeichnen).toBe(false);
  });

  it('NR12 P5: Ereignis vor dem ersten Bild setzt nur den Merker; das erste Bild baut genau eine Fläche', () => {
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const s = schleife(true);
    s.neuAufbauen();
    expect(f.flaechen).toHaveLength(0);
    const erstes = s.bild();
    expect(erstes.zeichnen).toBe(true);
    expect(f.flaechen).toHaveLength(1);
    expect(drawImage(erstes.befehle)).toEqual(['drawImage(flaeche1,-422,-195)']);
  });

  for (const weniger_bewegung of [true, false]) {
    it(`NR12 P5: nach Zoomen baut die Ebene neu, auch wenn danach nur unveränderte Bilder kommen (Weniger Bewegung ${weniger_bewegung ? 'an' : 'aus'})`, () => {
      const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
      const s = schleife(weniger_bewegung);
      s.bild();
      const vorZoom = f.befehle();
      for (let i = 0; i < 10; i++) {
        s.k.zoomUm(1.02, 422, 195);
        expect(s.bild().zeichnen).toBe(true); // Kamera ändert sich: jedes Bild
      }
      expect(f.befehle()).toBe(vorZoom); // während der Geste direkt gezeichnet
      let neuNachBildern = -1;
      for (let i = 1; i <= 60 && neuNachBildern < 0; i++) {
        const b = s.bild();
        if (b.zeichnen && f.befehle() > vorZoom) {
          neuNachBildern = i;
          expect(drawImage(b.befehle)).toHaveLength(1);
        }
      }
      // Ruhe ≥ 0,15 s wird über die dt der gezeichneten Bilder gezählt: frühestens nach 9 Aufrufen (9 · 16,7 ms = 150 ms),
      // spätestens das Sicherheitsbild nach 30 Aufrufen (500 ms, Takt-Toleranz 8 ms) baut neu.
      expect(neuNachBildern).toBeGreaterThanOrEqual(9);
      expect(neuNachBildern).toBeLessThanOrEqual(30);
    });
  }

  it('NR12 P5: Besuch im Nachbardorf → nächstes Bild gezeichnet, Boden neu; zurück → wieder neu', () => {
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const s = schleife(true);
    s.bild();
    expect(s.bild().zeichnen).toBe(false);
    const daheim = f.befehle();
    s.besuchen(true);
    expect(s.bild().zeichnen).toBe(true);
    const besuch = f.befehle();
    expect(besuch).toBeGreaterThan(daheim);
    s.besuchen(false);
    expect(s.bild().zeichnen).toBe(true);
    expect(f.befehle()).toBeGreaterThan(besuch);
  });
});
