import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { istLeitung, KATALOG, KONSTANTEN, passendeStation } from '../src/core/katalog';
import { ortHolen } from '../src/core/orte';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import { zeichenAufloesung } from '../src/render/aufloesung';
import type { Flaeche, FlaechenFabrik } from '../src/render/ebenen';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { animationAus, bildAbschluss } from '../src/render/schleife';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { animationBedarf, szenenSchluessel } from '../src/render/szene-schluessel';
import { neuerTakt, sollZeichnen } from '../src/render/takt';

// A90 „Flüssig auf Handy und Laptop“ (Lastenheft A90, Bauplan docs/bauplaene/NR12-fluessig.md Abschnitt 6 Z1–Z10,
// Entscheidungen 2026-11-05 zu NR12 P1/P4). Abnahmetests aus Nutzersicht über die echten Module, ohne Browser:
// echtes Spiel, Szene wie steuerung.szene(), Takt + bildAbschluss + zeichneSzene wie die Bildschleife in src/main.ts.
// Erwartete Werte von Hand hergeleitet (Kommentar je Test), nie mit dem geprüften Code ausgerechnet.

const T0 = 1_000_000;

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
/** Nur Methodenaufrufe (so zählt auch das Messwerkzeug „Befehle je Bild“). */
const methoden = (b: string[]): number => b.filter((x) => /^\w+\(/.test(x)).length;

function testFabrik() {
  const flaechen: Array<Flaeche & { befehle: string[] }> = [];
  const fabrik: FlaechenFabrik = (b, h) => {
    const a = aufnahme();
    const f = { name: `flaeche${flaechen.length + 1}`, width: b, height: h, befehle: a.befehle, getContext: () => a.X };
    flaechen.push(f);
    return f;
  };
  return { fabrik, flaechen, befehle: (): number => flaechen.reduce((n, f) => n + f.befehle.length, 0) };
}

/** Szene wie steuerung.szene(). */
function spielSzene(sp: Spiel, jetzt_ms: number, auswahl_id: number | null): Szene {
  const ort = ortHolen(sp.stand.ort);
  return {
    objekte: sp.stand.objekte, innen: sp.stand.innen, netz: sp.netz, spiel: sp, auswahl_id, modus: 'normal',
    verschiebe_id: null, jetzt_ms, geist: null, stempel: null, strassen: ort.strassen, fluss: ort.fluss, kw_anzeigen: true,
  };
}

interface Optionen { weniger_bewegung?: boolean; sparmodus?: boolean; hz?: number; sp?: Spiel }

/**
 * Bildschleife wie src/main.ts: je Bildaufruf Szene bauen, Takt fragen, bildAbschluss, bei Ja zeichnen.
 * `verdeckt` steht für den Vorspann (vorspannDeckt()), `auswahl` für ein angetipptes Gebäude. Die Spieluhr steht.
 */
function schleife(o: Optionen = {}) {
  const sp = o.sp ?? new Spiel(neuerSpielstand(T0), () => T0);
  const k = new Kamera();
  k.groesseSetzen(844, 390, 2);
  k.zentrieren(11, 10, 2);
  const effekte = new Effekte();
  const maler = new Maler(aufnahme().X);
  const einstellungen = { weniger_bewegung: o.weniger_bewegung ?? false, sparmodus: o.sparmodus ?? false };
  const abstand_ms = 1000 / (o.hz ?? 60);
  let takt = neuerTakt(), letzt_gezeichnet_ms = 0, erzwingen = false, jetzt_ms = 0;
  const lage = { verdeckt: false, auswahl: null as number | null };
  const s = {
    sp, k, lage, einstellungen,
    bedarf: () => animationBedarf(spielSzene(sp, T0, lage.auswahl), effekte.aktiv()),
    /** Ein Bildaufruf; liefert, ob gezeichnet wurde, und die Befehle der Hauptleinwand. */
    bild(abstand = abstand_ms): { zeichnen: boolean; befehle: string[] } {
      jetzt_ms += abstand;
      const szene = spielSzene(sp, T0, lage.auswahl);
      const aus = animationAus(einstellungen);
      maler.reduziert = aus;
      effekte.sparsam = einstellungen.sparmodus;
      const r = sollZeichnen(takt, {
        jetzt_ms, szene: szenenSchluessel(szene), kamera: k.schluessel(), bedarf: animationBedarf(szene, effekte.aktiv()),
        effekte_aktiv: effekte.aktiv(), animation: aus ? 'aus' : 'an', sparmodus: einstellungen.sparmodus, verdeckt: lage.verdeckt, erzwingen,
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
    /** Zählt gezeichnete Bilder über `sekunden` Sekunden Bildaufrufe. */
    zaehle(sekunden: number): number {
      let n = 0;
      const aufrufe = Math.round(sekunden * (o.hz ?? 60));
      for (let i = 0; i < aufrufe; i++) if (s.bild().zeichnen) n++;
      return n;
    },
  };
  return s;
}

/** Dorf mit Wärme: Kessel gewählt, Häuser warm (Rauch, Wärmepunkte → Animation läuft normalerweise flüssig). */
function dorfMitWaerme(): Spiel {
  const sp = new Spiel(neuerSpielstand(T0), () => T0);
  expect(sp.ersteQuelleWaehlen('kessel').ok).toBe(true);
  return sp;
}

afterEach(() => { bodenEbeneEinrichten(null); vi.unstubAllGlobals(); });

describe('A90 Ruhe: nur zeichnen, wenn sich etwas ändert', () => {
  // Ohne Zutun des Spielers sind Sparmodus und „Weniger Bewegung“ ruhig: Umgebungsanimation steht, nur das Sicherheitsbild
  // alle 500 ms → 2 Bilder/s (Entscheidung NR12 P1). Grenzen: Z1 Sparmodus ≤ 3/s (P4: ≤ 5/s), Z2 Weniger Bewegung ≤ 5/s.
  for (const [name, o, grenze] of [
    ['Sparmodus', { sparmodus: true }, 3],
    ['Weniger Bewegung', { weniger_bewegung: true }, 5],
  ] as const) {
    for (const hz of [60, 90, 120]) {
      it(`A90: Ruhe im ${name} bei ${hz} Hz zeichnet höchstens ${grenze} Bilder je Sekunde (Dorf mit laufender Wärme)`, () => {
        const s = schleife({ ...o, hz, sp: dorfMitWaerme() });
        // Vorbedingung: ohne die Einstellung würde das Dorf flüssig animieren – sonst prüft der Test nichts.
        expect(s.bedarf()).toBe('fluessig');
        s.zaehle(1); // Anlauf (erstes Bild)
        const n = s.zaehle(6);
        expect(n / 6).toBeLessThanOrEqual(grenze);
        expect(n).toBeGreaterThanOrEqual(6); // Sicherheitsbild: mindestens 1 je Sekunde, Bild bleibt nicht ewig stehen
      });
    }
  }

  it('A90: Gegenprobe – ohne Sparmodus läuft dasselbe Dorf flüssig mit rund 30 Bildern je Sekunde (höchstens 31)', () => {
    const s = schleife({ sp: dorfMitWaerme() });
    s.bild();
    const n = s.zaehle(2);
    // 60 Hz, 30-Bilder-Grenze ab 33,3 − 8 ms → jedes 2. Bild → 30/s (Z3 ≤ 31/s)
    expect(n / 2).toBeGreaterThanOrEqual(29);
    expect(n / 2).toBeLessThanOrEqual(31);
  }, 30_000); // echtes Zeichnen vieler Bilder: unter voller Last der Testsuite langsamer als 5 s Standard

  it('A90: Sparmodus begrenzt auch beim Verschieben auf 30 Bilder je Sekunde, ohne ihn folgt jedes Bild der Kamera', () => {
    const spar = schleife({ sparmodus: true, sp: dorfMitWaerme() });
    const normal = schleife({ sp: dorfMitWaerme() });
    let n_spar = 0, n_normal = 0;
    for (let i = 0; i < 60; i++) {
      spar.k.schiebe_x += 3; normal.k.schiebe_x += 3;
      if (spar.bild().zeichnen) n_spar++;
      if (normal.bild().zeichnen) n_normal++;
    }
    // 60 Aufrufe = 1 s bei 60 Hz: Sparmodus jedes 2. Bild = 30, normal jedes = 60
    expect(n_spar).toBe(30);
    expect(n_normal).toBe(60);
  }, 30_000); // echtes Zeichnen vieler Bilder: unter voller Last der Testsuite langsamer als 5 s Standard
});

describe('A90 Änderung wird sofort sichtbar', () => {
  const ersteHausOhneStation = (sp: Spiel) => sp.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station)!;

  it('A90: Station kaufen in Ruhe → das nächste Bild wird gezeichnet und zeigt etwas anderes', () => {
    const s = schleife({ weniger_bewegung: true, sp: dorfMitWaerme() });
    const vorher = s.bild();
    expect(vorher.zeichnen).toBe(true);
    expect(s.bild().zeichnen).toBe(false); // Ruhe
    const haus = ersteHausOhneStation(s.sp);
    expect(s.sp.stationKaufen(haus.id, passendeStation(KATALOG[haus.typ].bedarf_kw as number).id).ok).toBe(true);
    const danach = s.bild();
    expect(danach.zeichnen).toBe(true);
    expect(danach.befehle).not.toEqual(vorher.befehle);
  });

  it('A90: Station kaufen im Sparmodus → spätestens im zweiten Bildaufruf gezeichnet (30-Bilder-Deckel, nicht erst Sicherheitsbild)', () => {
    const s = schleife({ sparmodus: true, sp: dorfMitWaerme() });
    s.bild();
    const haus = ersteHausOhneStation(s.sp);
    expect(s.sp.stationKaufen(haus.id, passendeStation(KATALOG[haus.typ].bedarf_kw as number).id).ok).toBe(true);
    // Letztes Bild bei 16,7 ms; Aufruf 2 bei 33,3 ms: Abstand 16,7 < 25,3 → gesperrt; Aufruf 3 bei 50 ms: 33,3 ≥ 25,3 → gezeichnet
    const a = s.bild(), b = s.bild();
    expect(a.zeichnen || b.zeichnen).toBe(true);
  });

  it('A90: Gebäude antippen (Auswahl) → innerhalb von 2 Bildaufrufen ein neues, anderes Bild (Z10)', () => {
    for (const o of [{ weniger_bewegung: true }, { sparmodus: true }, {}]) {
      const s = schleife({ ...o, sp: dorfMitWaerme() });
      const vorher = s.bild();
      s.bild();
      s.lage.auswahl = ersteHausOhneStation(s.sp).id;
      const r = [s.bild(), s.bild()].find((x) => x.zeichnen);
      expect(r, JSON.stringify(o)).toBeDefined();
      expect(r!.befehle).not.toEqual(vorher.befehle);
    }
  });

  it('A90: Kamerabewegung wird im selben Bildaufruf gezeichnet (Weniger Bewegung an und aus)', () => {
    for (const weniger_bewegung of [true, false]) {
      const s = schleife({ weniger_bewegung, sp: dorfMitWaerme() });
      s.bild(); s.bild(); s.bild();
      for (let i = 0; i < 10; i++) {
        s.k.schiebe_x += 7; // Finger zieht die Karte
        expect(s.bild().zeichnen, `Aufruf ${i}`).toBe(true);
      }
    }
  }, 30_000); // echtes Zeichnen vieler Bilder: unter voller Last der Testsuite langsamer als 5 s Standard

  it('A90: Drehen um 0,01 rad und Zoomen zeichnen im selben Aufruf, ohne Änderung kein zusätzliches Bild', () => {
    const s = schleife({ weniger_bewegung: true, sp: dorfMitWaerme() });
    s.bild();
    expect(s.bild().zeichnen).toBe(false);
    s.k.winkel_rad += 0.01;
    expect(s.bild().zeichnen).toBe(true);
    expect(s.bild().zeichnen).toBe(false);
    s.k.zoomUm(1.05, 422, 195);
    expect(s.bild().zeichnen).toBe(true);
    expect(s.bild().zeichnen).toBe(false);
  });
});

describe('A90 Vorspann: Spiel ruht unter dem Ladebild', () => {
  it('A90: unter dem Vorspann wird nach dem ersten Bild nicht mehr gezeichnet – auch bei Kamera-, Szenen- und Animationsänderung', () => {
    const s = schleife({ sp: dorfMitWaerme() });
    s.lage.verdeckt = true;
    expect(s.bild().zeichnen).toBe(true); // erstes Kartenbild liegt bereit, wenn der Vorspann ausblendet
    let weitere = 0;
    for (let i = 0; i < 240; i++) { // 4 s Vorspann
      s.k.schiebe_x += 1;
      if (i === 100) s.lage.auswahl = s.sp.stand.objekte[0].id;
      if (s.bild().zeichnen) weitere++;
    }
    expect(weitere).toBe(0);
  });

  it('A90: nach dem Ausblenden des Vorspanns zeichnet das Spiel wieder', () => {
    const s = schleife({ sp: dorfMitWaerme() });
    s.lage.verdeckt = true;
    s.bild();
    for (let i = 0; i < 30; i++) s.bild();
    s.lage.verdeckt = false;
    s.k.schiebe_x += 5;
    expect(s.bild().zeichnen).toBe(true);
    s.lage.verdeckt = false;
    expect(s.zaehle(1)).toBeGreaterThanOrEqual(29); // flüssige Animation wieder 30/s
  }, 30_000); // echtes Zeichnen vieler Bilder: unter voller Last der Testsuite langsamer als 5 s Standard
});

describe('A90 Pixel-Obergrenze (Z7)', () => {
  // Fläche = breite_px · hoehe_px der Leinwand.
  const mp = (b: number, h: number, dpr: number, spar: boolean): number => { const a = zeichenAufloesung(b, h, dpr, spar); return a.breite_px * a.hoehe_px; };

  it('A90: Handy 844×390 bei Faktor 3 → höchstens 1,5 MP', () => {
    expect(mp(844, 390, 3, false)).toBeLessThanOrEqual(1_500_000);
  });
  it('A90: Laptop 1920×1000 bei Faktor 2 → höchstens 2,0 MP', () => {
    expect(mp(1920, 1000, 2, false)).toBeLessThanOrEqual(2_000_000);
  });
  it('A90: Sparmodus 844×390 bei Faktor 3 → höchstens 0,55 MP', () => {
    expect(mp(844, 390, 3, true)).toBeLessThanOrEqual(550_000);
  });

  it('A90: andere Handys im Querformat (Faktor 2–3,5) bleiben unter 1,5 MP und werden nie unscharf (Faktor ≥ 1)', () => {
    // Querformat-Handys: 932×430 (iPhone Pro Max), 915×412, 800×360, 740×360; Faktor 2, 2,625, 3, 3,5
    for (const [b, h] of [[932, 430], [915, 412], [800, 360], [740, 360], [667, 375]]) {
      for (const dpr of [2, 2.625, 3, 3.5]) {
        const a = zeichenAufloesung(b, h, dpr, false);
        // Rundung auf ganze Pixel darf je Achse +0,5 px ausmachen (932×430@2: Faktor 1,9347 → 1803×832 = 1 500 096)
        expect(a.breite_px * a.hoehe_px, `${b}×${h}@${dpr}`).toBeLessThanOrEqual(1_500_000 + b + h + 1);
        expect(a.breite_px, `${b}×${h}@${dpr}`).toBeGreaterThanOrEqual(b);
        expect(a.hoehe_px, `${b}×${h}@${dpr}`).toBeGreaterThanOrEqual(h);
      }
    }
  });

  it('A90: viele zufällige Bildschirme (fester Startwert) – nie mehr Pixel als max(1,5 MP, CSS-Fläche); Sparmodus nie schärfer als normal', () => {
    let saat = 42; // fester Startwert, einfacher LCG
    const zufall = (): number => { saat = (Math.imul(saat, 1664525) + 1013904223) >>> 0; return saat / 2 ** 32; };
    const faelle: Array<[number, number, number]> = [[1, 1, 1], [320, 240, 1], [7680, 4320, 1], [750, 500, 2], [751, 500, 2], [844, 390, 1], [844, 390, 4]];
    for (let i = 0; i < 500; i++) faelle.push([Math.round(320 + zufall() * 3500), Math.round(240 + zufall() * 2000), 1 + Math.round(zufall() * 12) / 4]);
    for (const [b, h, dpr] of faelle) {
      const n = zeichenAufloesung(b, h, dpr, false), sp = zeichenAufloesung(b, h, dpr, true);
      // Rundung auf ganze Pixel: je Achse höchstens +0,5 px → Spielraum b + h + 1 Pixel
      const grenze = Math.max(1_500_000, b * h) + b + h + 1;
      expect(n.breite_px * n.hoehe_px, `${b}×${h}@${dpr}`).toBeLessThanOrEqual(grenze);
      expect(sp.breite_px * sp.hoehe_px, `${b}×${h}@${dpr} Spar`).toBeLessThanOrEqual(n.breite_px * n.hoehe_px);
      expect(n.faktor).toBeGreaterThanOrEqual(1);
      expect(n.faktor).toBeLessThanOrEqual(Math.max(1, dpr));
    }
  });
});

describe('A90 Boden-Ebene: ruhende Karte zwischengespeichert', () => {
  it('A90: großes Dorf in Ruhe – ein Bild mit Boden-Ebene braucht höchstens 55 % der Zeichenbefehle von direkt', () => {
    const N = KONSTANTEN.feldanzahl;
    const sp = dorfMitWaerme();
    // Großer Stand: Leitung d40 auf jedem freien Straßenfeld, jedes Haus mit Station, 6 Gaskessel.
    const ort = ortHolen(sp.stand.ort);
    const belegt = new Set<number>();
    for (const o of sp.stand.objekte) { const g = o.typ === 'hz' ? 2 : 1; for (let dy = 0; dy < g; dy++) for (let dx = 0; dx < g; dx++) belegt.add((o.y + dy) * N + o.x + dx); }
    for (const [x, y] of ort.strassen) if (sp.kannPlatzieren('d40', x, y) && !belegt.has(y * N + x)) sp.stand.objekte.push({ id: sp.stand.naechste_id++, typ: 'd40', x, y, stufe: 1, bau: null, kasse_eur: 0 });
    for (const o of sp.stand.objekte) if (KATALOG[o.typ].kategorie === 'haus' && o.ohne_station) { delete o.ohne_station; o.station = passendeStation(KATALOG[o.typ].bedarf_kw as number).id; }
    for (let i = 0; i < 6; i++) sp.stand.innen.push({ typ: 'gas', stufe: 3, bau: null });
    sp.aenderung();
    expect(sp.stand.objekte.filter((o) => istLeitung(o.typ)).length).toBeGreaterThan(100);

    const direkt = schleife({ sp });
    const d = methoden(direkt.bild().befehle);

    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const mitEbene = schleife({ sp });
    mitEbene.bild(); // erstes Bild malt den Boden in die Ebene
    let ruhe = -1;
    for (let i = 0; i < 10 && ruhe < 0; i++) { const b = mitEbene.bild(); if (b.zeichnen) ruhe = methoden(b.befehle); }
    expect(ruhe).toBeGreaterThan(0);
    expect(ruhe).toBeLessThanOrEqual(d * 0.55);
    expect(f.flaechen).toHaveLength(1); // Ruhe baut die Ebene nicht neu
  });
});

describe('A90 Sparmodus-Einstellung', () => {
  const SCHLUESSEL = 'waermedorf-einstellungen-v1';
  function speicher(start: Record<string, string> = {}) {
    const daten = new Map(Object.entries(start));
    return { daten, getItem: (k: string) => daten.get(k) ?? null, setItem: (k: string, v: string) => { daten.set(k, v); } };
  }
  async function frischesModul(s: ReturnType<typeof speicher>) {
    vi.resetModules();
    vi.stubGlobal('localStorage', s);
    return import('../src/ui/einstellungen');
  }

  it('A90: Sparmodus einschalten bleibt nach Neustart der App eingeschaltet, ausschalten ebenso', async () => {
    const s = speicher();
    const m1 = await frischesModul(s);
    m1.einstellungenSchreiben({ ...m1.einstellungenLesen(), sparmodus: true });
    const m2 = await frischesModul(s); // „Neustart“: Modul neu geladen, gleicher Gerätespeicher
    expect(m2.einstellungenLesen().sparmodus).toBe(true);
    m2.einstellungenSchreiben({ ...m2.einstellungenLesen(), sparmodus: false });
    expect((await frischesModul(s)).einstellungenLesen().sparmodus).toBe(false);
  });

  it('A90: alte Einstellungen ohne Sparmodus-Feld → Sparmodus aus, übrige Einstellungen bleiben erhalten', async () => {
    const s = speicher({ [SCHLUESSEL]: JSON.stringify({ weniger_bewegung: true, kw_anzeigen: false }) });
    const e = (await frischesModul(s)).einstellungenLesen();
    expect(e).toEqual({ weniger_bewegung: true, kw_anzeigen: false, sparmodus: false });
  });

  it('A90: kaputter Einstellungsspeicher → Sparmodus aus, kein Absturz', async () => {
    const s = speicher({ [SCHLUESSEL]: '{kaputt' });
    expect((await frischesModul(s)).einstellungenLesen().sparmodus).toBe(false);
  });

  it('A90: Einstellungen liegen unter dem Speicherschlüssel waermedorf-einstellungen-v1 (bestehende Geräte behalten ihre Wahl)', async () => {
    const s = speicher({ [SCHLUESSEL]: JSON.stringify({ sparmodus: true, weniger_bewegung: false, kw_anzeigen: true }) });
    const m = await frischesModul(s);
    expect(m.einstellungenLesen().sparmodus).toBe(true);
    m.einstellungenSchreiben({ weniger_bewegung: true, kw_anzeigen: true, sparmodus: false });
    expect([...s.daten.keys()]).toEqual([SCHLUESSEL]);
    expect(JSON.parse(s.daten.get(SCHLUESSEL)!)).toEqual({ weniger_bewegung: true, kw_anzeigen: true, sparmodus: false });
  });

  it('A90: Sparhinweis-Merker liest und schreibt denselben Schlüssel waermedorf-sparhinweis-v1 (Hinweis nur einmal je Gerät)', () => {
    // main.ts ist ohne Browser nicht ladbar; geprüft wird die Verdrahtung im Quelltext: Konstante, gelesen und geschrieben.
    const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    const m = /const (\w+) = 'waermedorf-sparhinweis-v1';/.exec(main);
    expect(m).not.toBeNull();
    expect(main).toContain(`localStorage.getItem(${m![1]})`);
    expect(main).toContain(`localStorage.setItem(${m![1]},`);
  });
});
