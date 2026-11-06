import { afterEach, describe, expect, it, vi } from 'vitest';
import { GRUNDGEBUEHR, istLeitung, KATALOG, KONSTANTEN, passendeStation, PREISSTUFEN, VORLAUF } from '../src/core/katalog';
import { nachbardoerfer } from '../src/core/nachbarn';
import { berechneNetz } from '../src/core/netz';
import { ortHolen, STANDARD_ORT } from '../src/core/orte';
import { Spiel } from '../src/core/spiel';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { Effekte } from '../src/render/effekte';
import { BodenEbene, type Flaeche, type FlaechenFabrik } from '../src/render/ebenen';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, bodenEbeneVerwerfen, zeichneSzene, type Szene } from '../src/render/szene';
import { animationBedarf, bodenSchluessel, szenenSchluessel } from '../src/render/szene-schluessel';
import { neu } from './hilfen';

// Upgrades (Rücklauf-Helfer) sind mit der A88-Leiter erst ab HZ-Stufe 3 frei; der Ablauf-Test braucht sie ab Stufe 1.
vi.mock('../src/core/freischaltung', async (orig) => (await import('./ohne-leiter')).ohneLeiter(await orig()));

// NR12 / A90 Paket P3a „Bodenebene“ (Bauplan docs/bauplaene/NR12-fluessig.md, Abschnitt 7 „P3a“).
// Aufzeichnungs-Kontext per Proxy: protokolliert jeden Canvas-Aufruf und jede gesetzte Eigenschaft mit Argumenten.

const N = KONSTANTEN.feldanzahl;
const T0 = 1_000_000;

interface Aufnahme { X: CanvasRenderingContext2D; befehle: string[] }
function aufnahme(): Aufnahme {
  const befehle: string[] = [];
  const zustand = new Map<PropertyKey, unknown>();
  const text = (a: unknown): string => (typeof a === 'object' && a !== null ? String((a as { name?: string }).name ?? 'objekt') : String(a));
  const X = new Proxy({}, {
    get(_z, p) {
      if (zustand.has(p)) return zustand.get(p);
      return (...a: unknown[]) => {
        befehle.push(`${String(p)}(${a.map(text).join(',')})`);
        if (p === 'measureText') return { width: String(a[0]).length * 6 };
        if (p === 'createRadialGradient' || p === 'createLinearGradient') return { name: 'verlauf', addColorStop: (o: number, c: string) => befehle.push(`addColorStop(${o},${c})`) };
        return undefined;
      };
    },
    set(_z, p, v) { zustand.set(p, v); befehle.push(`${String(p)}=${text(v)}`); return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { X, befehle };
}
/** Nur Methodenaufrufe (so zählt auch das Messwerkzeug „Befehle je Bild“). */
const methoden = (b: string[]): number => b.filter((x) => /^\w+\(/.test(x)).length;
const fnv = (t: string): string => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };

interface TestFlaeche extends Flaeche { name: string; a: Aufnahme }
function testFabrik(mitKontext = true) {
  const flaechen: TestFlaeche[] = [];
  const fabrik: FlaechenFabrik = (b, h) => {
    const a = aufnahme();
    const f: TestFlaeche = { name: `flaeche${flaechen.length + 1}`, width: b, height: h, a, getContext: () => (mitKontext ? a.X : null) };
    flaechen.push(f);
    return f;
  };
  const befehle = (): number => flaechen.reduce((n, f) => n + f.a.befehle.length, 0);
  return { fabrik, flaechen, befehle };
}

/** Kamera wie am Handy (844×390, Faktor 2), auf die Heizzentrale zentriert. */
function kamera(): Kamera {
  const k = new Kamera();
  k.groesseSetzen(844, 390, 2);
  k.zentrieren(11, 10, 2);
  return k;
}
/** Szene wie steuerung.szene() (src/steuerung.ts:353–362). */
function spielSzene(sp: Spiel, jetzt_ms: number, teile: Partial<Szene> = {}): Szene {
  const ort = ortHolen(sp.stand.ort);
  return {
    objekte: sp.stand.objekte, innen: sp.stand.innen, netz: sp.netz, spiel: sp, auswahl_id: null, modus: 'normal',
    verschiebe_id: null, jetzt_ms, geist: null, stempel: null, strassen: ort.strassen, fluss: ort.fluss, kw_anzeigen: true, ...teile,
  };
}
function besuchSzene(jetzt_ms: number): Szene {
  const v = nachbardoerfer()[0];
  return { objekte: v.objekte, innen: v.innen, netz: v.netz, spiel: null, auswahl_id: null, modus: 'normal', verschiebe_id: null, jetzt_ms, geist: null, stempel: null };
}
function bild(k: Kamera, s: Szene, dt_s = 0.016, zeit_s = 1.7): Aufnahme {
  const a = aufnahme(), m = new Maler(a.X);
  m.zeit_s = zeit_s;
  zeichneSzene(m, k, s, new Effekte(), dt_s);
  return a;
}
const mitUhr = () => { const z = { t: T0 }; const sp = new Spiel(altesStartdorf(T0), () => z.t); return { sp, z }; };
const drawImage = (b: string[]): string[] => b.filter((x) => x.startsWith('drawImage('));

// Kamera 844×390, Faktor 2: Rand = round(0,25 · 844 · 2) = 422 px und round(0,25 · 390 · 2) = 195 px;
// Fläche = 1688 + 2·422 = 2532 × 780 + 2·195 = 1170 Gerätepixel.
const RAND_X = 422, RAND_Y = 195;

afterEach(() => bodenEbeneEinrichten(null));

describe('NR12 P3a Bodenebene (A90)', () => {
  it('NR12 P3a: ohne Fabrik ist die Befehlsfolge wie heute (Glitzern eingerechnet)', () => {
    // Nur Boden, Fluss, Straßen, Gitter (keine Gebäude): so hängt der Vergleich nur am Bodenteil.
    // Referenz aufgenommen mit dem Stand vor P3a (Commit 44463cc): 16 689 Einträge, davon 8 Glitzerblöcke à 6 Einträge;
    // 2 davon liegen auf Brückenfeldern (Straße über dem Fluss) und waren dort schon immer verdeckt – sie entfallen.
    // Ohne Glitzer: 16 641 Einträge, Prüfsumme 3bd40a67; die 6 übrigen Glitzerblöcke: Prüfsumme aae3e7a5.
    const ort = ortHolen(STANDARD_ORT);
    const s: Szene = {
      objekte: [], innen: [], netz: berechneNetz([neu('hz', 11, 10)], [], 2), spiel: null, auswahl_id: null, modus: 'stempel',
      geist: null, verschiebe_id: null, stempel: null, jetzt_ms: 100_000, strassen: ort.strassen, fluss: ort.fluss,
    };
    const k = kamera(); k.schiebe_x += 0.37;
    const b = bild(k, s).befehle;
    const glitzer: string[] = [], rest: string[] = [];
    for (let i = 0; i < b.length; i++) {
      if (b[i] === 'strokeStyle=rgba(255,255,255,.35)') { glitzer.push(...b.slice(i, i + 6)); i += 5; } else rest.push(b[i]);
    }
    expect(rest.length).toBe(16641);
    expect(fnv(rest.join('\n'))).toBe('3bd40a67');
    expect(glitzer.length).toBe(36);
    expect(fnv(glitzer.join('\n'))).toBe('aae3e7a5');
  });

  it('NR12 P3a: zweites Bild ohne Änderung malt den Boden nicht neu', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera(), s = spielSzene(sp, T0);
    const erstes = bild(k, s);
    expect(f.flaechen.length).toBe(1);
    expect(f.flaechen[0].width).toBe(2532);
    expect(f.flaechen[0].height).toBe(1170);
    const gemalt = f.befehle();
    expect(gemalt).toBeGreaterThan(1000);
    expect(drawImage(erstes.befehle)).toEqual([`drawImage(flaeche1,${-RAND_X},${-RAND_Y})`]);
    const zweites = bild(k, s);
    expect(f.befehle()).toBe(gemalt);
    expect(drawImage(zweites.befehle)).toEqual([`drawImage(flaeche1,${-RAND_X},${-RAND_Y})`]);
  });

  it('NR12 P3a: Station gekauft → Boden bleibt, Hauptleinwand-Befehle ändern sich', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera();
    const vorher = bild(k, spielSzene(sp, T0)).befehle, gemalt = f.befehle();
    expect(gemalt).toBeGreaterThan(1000);
    const haus = sp.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station)!;
    expect(sp.stationKaufen(haus.id, passendeStation(KATALOG[haus.typ].bedarf_kw as number).id).ok).toBe(true);
    const nachher = bild(k, spielSzene(sp, T0)).befehle;
    expect(f.befehle()).toBe(gemalt);
    expect(nachher.join('\n')).not.toBe(vorher.join('\n'));
  });

  it('NR12 P3a: Haus fertig gebaut → Boden neu (Hausweg erscheint)', () => {
    const { sp, z } = mitUhr();
    // Haus neben einer Straße im Bau (Testdaten); fertig wird es durch den echten Spielablauf (Spiel.bis).
    const ort = ortHolen(sp.stand.ort);
    const frei = (x: number, y: number) => sp.kannPlatzieren('efh', x, y);
    const strassenNah = ort.strassen.map(([x, y]) => [x, y + 1] as const).find(([x, y]) => y < N && frei(x, y) && x > 6 && x < 16 && y > 6 && y < 16)!;
    expect(strassenNah).toBeDefined();
    sp.stand.objekte.push({ id: sp.stand.naechste_id++, typ: 'efh', x: strassenNah[0], y: strassenNah[1], stufe: 1, kasse_eur: 0, zufriedenheit_pct: 80, ohne_station: true, bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 1000 } });
    sp.aenderung();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera();
    bild(k, spielSzene(sp, T0));
    const imBau = f.flaechen.at(-1)!.a.befehle.join('\n');
    z.t = T0 + 5000; sp.bis(z.t);
    expect(sp.stand.objekte.at(-1)!.bau).toBeFalsy();
    const vorher = f.befehle();
    bild(k, spielSzene(sp, T0));
    expect(f.befehle()).toBeGreaterThan(vorher);
    expect(f.flaechen.at(-1)!.a.befehle.join('\n')).not.toBe(imBau);
  });

  it('NR12 P3a: Verschiebung um 10 px → nur auflegen; um mehr als den Rand → neu', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera(), s = spielSzene(sp, T0);
    bild(k, s);
    const gemalt = f.befehle();
    k.schiebe_x += 10; // 10 CSS-px = 20 Gerätepixel
    const a = bild(k, s);
    expect(f.befehle()).toBe(gemalt);
    expect(drawImage(a.befehle)).toEqual([`drawImage(flaeche1,${-RAND_X + 20},${-RAND_Y})`]);
    k.schiebe_x += RAND_X / 2 - 10 + 1; // jetzt 424 Gerätepixel seit dem Malen > Rand 422
    const b = bild(k, s);
    expect(f.befehle()).toBeGreaterThan(gemalt);
    expect(drawImage(b.befehle)).toEqual([`drawImage(flaeche1,${-RAND_X},${-RAND_Y})`]);
  });

  it('NR12 P3a: Verschiebung um Rand − 1 px → Fläche enthält Zeichenbefehle im Randstreifen', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera(), s = spielSzene(sp, T0);
    bild(k, s);
    // Fläche in CSS-px (Transformation × 2): sichtbar ist x 211 … 1055 (Rand 422/2 = 211 CSS-px), y 97,5 … 487,5.
    const xs = f.flaechen[0].a.befehle.filter((b) => /^(moveTo|lineTo)\(/.test(b)).map((b) => Number(b.slice(b.indexOf('(') + 1).split(',')[0]));
    const ys = f.flaechen[0].a.befehle.filter((b) => /^(moveTo|lineTo)\(/.test(b)).map((b) => Number(b.slice(0, -1).split(',')[1]));
    expect(xs.some((x) => x < RAND_X / 2 && x > 0)).toBe(true);
    expect(xs.some((x) => x > 844 + RAND_X / 2 && x < 844 + RAND_X)).toBe(true);
    expect(ys.some((y) => y < RAND_Y / 2 && y > 0)).toBe(true);
    expect(ys.some((y) => y > 390 + RAND_Y / 2 && y < 390 + RAND_Y)).toBe(true);
    const gemalt = f.befehle();
    k.schiebe_x += (RAND_X - 1) / 2; k.schiebe_y -= (RAND_Y - 1) / 2;
    const a = bild(k, s);
    expect(f.befehle()).toBe(gemalt);
    expect(drawImage(a.befehle)).toEqual(['drawImage(flaeche1,-1,-389)']);
  });

  it('NR12 P3a: auflegen rundet auf ganze Gerätepixel', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera(), s = spielSzene(sp, T0);
    bild(k, s);
    k.schiebe_x += 1.7; k.schiebe_y -= 1.8; // 3,4 und −3,6 Gerätepixel → 3 und −4
    expect(drawImage(bild(k, s).befehle)).toEqual([`drawImage(flaeche1,${-RAND_X + 3},${-RAND_Y - 4})`]);
  });

  it('NR12 P3a: Zoom/Drehung → direkt gezeichnet (Fabrik 0 Befehle), nach ≥ 0,15 s Ruhe genau ein Neuaufbau', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera(), s = spielSzene(sp, T0);
    bild(k, s);
    for (const geste of [() => k.zoomUm(1.1, 400, 200), () => k.drehenUm(0.1)]) {
      geste();
      const gemalt = f.befehle();
      const waehrend = bild(k, s, 0.016);
      expect(f.befehle()).toBe(gemalt);
      expect(drawImage(waehrend.befehle)).toEqual([]);
      expect(methoden(waehrend.befehle)).toBeGreaterThan(5000); // Boden direkt auf der Hauptleinwand
      bild(k, s, 0.075); // 0,075 s Ruhe: noch direkt
      expect(f.befehle()).toBe(gemalt);
      const aufbau = bild(k, s, 0.075); // 0,15 s Ruhe: Neuaufbau
      expect(f.befehle()).toBeGreaterThan(gemalt);
      expect(drawImage(aufbau.befehle).length).toBe(1);
      const danach = f.befehle();
      bild(k, s, 0.016);
      expect(f.befehle()).toBe(danach);
    }
  });

  it('NR12 P3a: Pinch-Geste mit Verschiebung je Bild bleibt direkt, bis die Ruhe erreicht ist', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera(), s = spielSzene(sp, T0);
    bild(k, s);
    const gemalt = f.befehle();
    expect(gemalt).toBeGreaterThan(1000);
    for (let i = 0; i < 5; i++) { k.zoomUm(1.01, 400, 200); bild(k, s, 0.1); }
    expect(f.befehle()).toBe(gemalt);
  });

  it('NR12 P3a: zeichneBoden ist zeitlos (Fluss, Bau, Brunnen, Großwärmepumpe, Plopp)', () => {
    const { sp } = mitUhr();
    sp.stand.objekte.push(
      { id: sp.stand.naechste_id++, typ: 'brunnen', x: 13, y: 7, stufe: 1, bau: null, kasse_eur: 0, _pop: T0 },
      { id: sp.stand.naechste_id++, typ: 'huette', x: 14, y: 12, stufe: 1, kasse_eur: 0, bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 60_000 } },
    );
    sp.stand.innen.push({ typ: 'wpg', stufe: 1, bau: null });
    sp.aenderung();
    const folge = (zeit_s: number, jetzt_ms: number): string => {
      const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
      bild(kamera(), spielSzene(sp, jetzt_ms), 0.016, zeit_s);
      expect(f.flaechen.length).toBe(1);
      return f.flaechen[0].a.befehle.join('\n');
    };
    const grund = folge(0, T0);
    expect(grund.length).toBeGreaterThan(1000);
    expect(folge(1.7, T0)).toBe(grund);
    expect(folge(0, T0 + 5000)).toBe(grund);
  });

  it('NR12 P3a: Glitzern liegt nicht in der Fläche, sondern wird jedes Bild auf der Hauptleinwand gezeichnet', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera(), s = spielSzene(sp, T0);
    const glitzer = (b: string[]): number => b.filter((x) => x === 'strokeStyle=rgba(255,255,255,.35)').length;
    const a = bild(k, s, 0.016, 1.7);
    expect(glitzer(f.flaechen[0].a.befehle)).toBe(0);
    expect(glitzer(a.befehle)).toBeGreaterThan(0);
    const b = bild(k, s, 0.016, 4.2);
    expect(glitzer(b.befehle)).toBeGreaterThan(0);
    expect(b.befehle.join('\n')).not.toBe(a.befehle.join('\n'));
  });

  it('NR12 P3a: Ablauf – gleicher Schlüssel ⇒ gleiche Befehlsfolge (echte Spielaktionen)', () => {
    const { sp, z } = mitUhr();
    const BILD_MS = T0 + 100_000_000; // fester Zeitpunkt für alle Bilder: alle Plopps sind vorbei
    const k = kamera();
    const bodenFolge = (s: Szene): string => {
      const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
      bild(k, s, 0.016, 1.7);
      bodenEbeneEinrichten(null);
      return f.flaechen[0].a.befehle.join('\n');
    };
    const szenenFolge = (s: Szene): string => bild(k, s, 0.016, 1.7).befehle.join('\n');
    const lauf = (ms: number) => { for (let t = 0; t < ms; t += 10_000) { z.t += 10_000; sp.bis(z.t); } };
    const haus = () => sp.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.ohne_station && !o.gekuendigt)!;
    const ok = (r: { ok: boolean; hinweis?: string }) => expect(r.ok, r.hinweis).toBe(true);
    const schritte: Array<[string, () => Szene]> = [
      ['Start', () => spielSzene(sp, BILD_MS)],
      ['erste Quelle', () => { ok(sp.ersteQuelleWaehlen('kessel')); return spielSzene(sp, BILD_MS); }],
      ['nochmal gleich (keine Aktion)', () => spielSzene(sp, BILD_MS)],
      ['Station gekauft', () => { const h = haus(); ok(sp.stationKaufen(h.id, passendeStation(KATALOG[h.typ].bedarf_kw as number).id)); return spielSzene(sp, BILD_MS); }],
      ['Abschnitt planen', () => { ok(sp.abschnittPlanen()); return spielSzene(sp, BILD_MS); }],
      ['Abschnitt offen', () => { lauf(600_000); expect(sp.abschnitt?.phase).toBe('offen'); return spielSzene(sp, BILD_MS); }],
      ['Leitung eingezeichnet', () => { ok(sp.platzieren('d50', 12, 12)); return spielSzene(sp, BILD_MS); }],
      // NR18-P0 (4.13): keine automatische Wegsuche mehr – der Spieler zeichnet das Verbindungsstück zur Start-40er (10|12) selbst.
      ['Leitung zum Netz gezeichnet', () => { ok(sp.platzieren('d25', 11, 12)); return spielSzene(sp, BILD_MS); }],
      ['Vorsehung umgeschaltet', () => { const l = sp.stand.objekte.find((o) => o.geplant && o.x === 12 && o.y === 12)!; ok(sp.vorsehungUmschalten(l.id)); return spielSzene(sp, BILD_MS); }],
      ['Abschnitt abgeschlossen', () => { ok(sp.abschnittAbschliessen()); return spielSzene(sp, BILD_MS); }],
      ['Material bestellt', () => { ok(sp.materialBestellen()); return spielSzene(sp, BILD_MS); }],
      ['Abschnitt gebaut', () => { lauf(4_000_000); expect(sp.abschnitt).toBeUndefined(); return spielSzene(sp, BILD_MS); }],
      ['Upgrade beauftragt', () => { const h = sp.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.station && !o.upgrade_auftrag)!; ok(sp.upgradeKaufen(h.id)); return spielSzene(sp, BILD_MS); }],
      ['Hütte gebaut (Bau läuft)', () => { ok(sp.platzieren('huette', 15, 15)); return spielSzene(sp, BILD_MS); }],
      ['Bau fertig', () => { lauf(3_600_000); expect(sp.stand.objekte.some((o) => o.bau)).toBe(false); return spielSzene(sp, BILD_MS); }],
      ['Kunden kündigen (höchster Preis, höchste Grundgebühr, niedrigster Vorlauf)', () => {
        sp.preisSetzen(PREISSTUFEN.length - 1); sp.grundgebuehrSetzen(GRUNDGEBUEHR.max_eur); ok(sp.vorlaufSetzen(VORLAUF.min_c)); lauf(3_600_000);
        expect(sp.stand.objekte.some((o) => o.gekuendigt)).toBe(true);
        return spielSzene(sp, BILD_MS);
      }],
      ['Modus platzieren', () => spielSzene(sp, BILD_MS, { modus: 'platzieren', geist: { typ: 'huette', x: 3, y: 3, kante: 1, ok: true } })],
      ['zurück normal', () => spielSzene(sp, BILD_MS)],
      ['Besuch', () => besuchSzene(BILD_MS)],
      ['wieder zu Hause', () => spielSzene(sp, BILD_MS)],
    ];
    let vorher: { name: string; bs: string; bf: string; ss: string; sf: string } | null = null;
    let bodenGleich = 0, bodenAnders = 0, szeneGleich = 0;
    for (const [name, schritt] of schritte) {
      const s = schritt();
      const jetzt = { name, bs: bodenSchluessel(s, k), bf: bodenFolge(s), ss: szenenSchluessel(s), sf: szenenFolge(s) };
      if (vorher) {
        const gleicherBoden = jetzt.bs === vorher.bs;
        expect(jetzt.bf === vorher.bf, `${vorher.name} → ${name}: Bodenschlüssel gleich = ${gleicherBoden}`).toBe(gleicherBoden);
        if (gleicherBoden) bodenGleich++; else bodenAnders++;
        if (jetzt.ss === vorher.ss) { szeneGleich++; expect(jetzt.sf === vorher.sf, `${vorher.name} → ${name}: gleicher Szenenschlüssel`).toBe(true); }
      }
      vorher = jetzt;
    }
    // Der Ablauf muss beide Fälle wirklich enthalten, sonst prüft er nichts.
    expect(bodenGleich).toBeGreaterThanOrEqual(10);
    expect(bodenAnders).toBeGreaterThanOrEqual(4);
    expect(szeneGleich).toBeGreaterThanOrEqual(2);
  });

  it('NR12 P3a: Befehle je Bild in Ruhe für den großen Stand – Bodenebene halbiert die Befehle (≤ 55 % von direkt)', () => {
    const { sp } = mitUhr();
    sp.ersteQuelleWaehlen('kessel');
    // Großer Stand wie Bauplan Abschnitt 1: Leitung d40 auf jedem freien Straßenfeld, jedes Haus mit Station, 6 Gaskessel.
    const ort = ortHolen(sp.stand.ort);
    const belegt = new Set<number>();
    for (const o of sp.stand.objekte) { const g = o.typ === 'hz' ? 2 : 1; for (let dy = 0; dy < g; dy++) for (let dx = 0; dx < g; dx++) belegt.add((o.y + dy) * N + o.x + dx); }
    for (const [x, y] of ort.strassen) if (sp.kannPlatzieren('d40', x, y) && !belegt.has(y * N + x)) sp.stand.objekte.push({ id: sp.stand.naechste_id++, typ: 'd40', x, y, stufe: 1, bau: null, kasse_eur: 0 });
    for (const o of sp.stand.objekte) if (KATALOG[o.typ].kategorie === 'haus' && o.ohne_station) { delete o.ohne_station; o.station = passendeStation(KATALOG[o.typ].bedarf_kw as number).id; }
    for (let i = 0; i < 6; i++) sp.stand.innen.push({ typ: 'gas', stufe: 3, bau: null });
    sp.aenderung();
    const leitungen = sp.stand.objekte.filter((o) => istLeitung(o.typ)).length;
    expect(leitungen).toBe(164); // wie der Messstand „groß“ in Bauplan Abschnitt 1 (229 Objekte, 164 Leitungen)
    expect(sp.stand.objekte.length).toBe(229);
    const k = kamera(), s = spielSzene(sp, T0 + 10_000);
    const direkt = methoden(bild(k, s).befehle);
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    bild(k, s);
    const ruhe = methoden(bild(k, s).befehle);
    // Grenze aus dem Wegwerf-Versuch (Bauplan Abschnitt 1): 16 900 → 8 600 = 51 % plus Rauschen. Die absolute Zahl 9 000 (Z3) misst
    // das Werkzeug im Browser; dieser Aufzeichner zählt je Bild rund 1,8-mal so viele Aufrufe (direkt 30 152 statt 16 900).
    expect(ruhe).toBeLessThanOrEqual(direkt * 0.55);
  });

  it('NR12 P3a: Größenänderung gibt alte Fläche frei (0×0)', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera(), s = spielSzene(sp, T0);
    bild(k, s);
    k.groesseSetzen(800, 390, 2);
    bild(k, s);
    expect([f.flaechen[0].width, f.flaechen[0].height]).toEqual([0, 0]);
    expect(f.flaechen.length).toBe(2);
    // 800·2 + 2·round(0,25·800·2) = 1600 + 800; Höhe unverändert 1170
    expect([f.flaechen[1].width, f.flaechen[1].height]).toEqual([2400, 1170]);
  });

  it('NR12 P3a: Pixel-Faktor-Wechsel (Sparmodus) → neue Fläche in neuer Größe', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera(), s = spielSzene(sp, T0);
    bild(k, s);
    k.groesseSetzen(844, 390, 1.25);
    const a = bild(k, s);
    // 844·1,25 = 1055 + 2·round(263,75) = 1055 + 528 = 1583; 390·1,25 = 487,5 → 488 + 2·round(121,875) = 488 + 244 = 732
    expect([f.flaechen[1].width, f.flaechen[1].height]).toEqual([1583, 732]);
    expect(drawImage(a.befehle)).toEqual(['drawImage(flaeche2,-264,-122)']);
  });

  it('NR12 P3a: bodenEbeneVerwerfen → nächstes Bild malt neu', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera(), s = spielSzene(sp, T0);
    bild(k, s);
    const gemalt = f.befehle();
    bodenEbeneVerwerfen();
    expect([f.flaechen[0].width, f.flaechen[0].height]).toEqual([0, 0]);
    bild(k, s);
    expect(f.befehle()).toBeGreaterThan(gemalt);
  });

  it('NR12 P3a: Besuch im Nachbardorf → anderer Schlüssel, Boden neu', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = kamera();
    bild(k, spielSzene(sp, T0));
    const gemalt = f.befehle();
    bild(k, besuchSzene(T0));
    expect(f.befehle()).toBeGreaterThan(gemalt);
  });

  it('NR12 P3a: Leinwand 0×0 beim Start → keine Fläche, kein Fehler', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = new Kamera(); k.groesseSetzen(0, 0, 2);
    bild(k, spielSzene(sp, T0));
    expect(f.flaechen.length).toBe(0);
  });

  it('NR12 P3a: Fabrik ohne 2D-Kontext → Ebene aus, direkt zeichnen, einmal console.warn', () => {
    const { sp } = mitUhr();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const f = testFabrik(false); bodenEbeneEinrichten(f.fabrik);
      const k = kamera(), s = spielSzene(sp, T0);
      const a = bild(k, s);
      const b = bild(k, s);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(f.flaechen.length).toBe(1);
      expect([f.flaechen[0].width, f.flaechen[0].height]).toEqual([0, 0]);
      expect(drawImage(a.befehle)).toEqual([]);
      expect(methoden(b.befehle)).toBeGreaterThan(5000);
    } finally { warn.mockRestore(); }
  });
});

describe('NR12 P3a BodenEbene (Einheit)', () => {
  const malen = vi.fn();
  it('NR12 P3a: braucht – ohne Fläche ja; Verschiebung genau um den Rand nein, einen Pixel mehr ja; anderer Schlüssel ja', () => {
    const f = testFabrik();
    const e = new BodenEbene(f.fabrik);
    expect(e.braucht('a', 0, 0)).toBe(true);
    e.neu('a', 100, 50, 25, 13, 7, -3, malen);
    expect(malen).toHaveBeenCalledTimes(1);
    expect([f.flaechen[0].width, f.flaechen[0].height]).toEqual([150, 76]);
    expect(e.braucht('a', 7, -3)).toBe(false);
    expect(e.braucht('a', 7 + 25, -3 - 13)).toBe(false);
    expect(e.braucht('a', 7 - 25, -3 + 13)).toBe(false);
    expect(e.braucht('a', 7 + 26, -3)).toBe(true);
    expect(e.braucht('a', 7, -3 - 14)).toBe(true);
    expect(e.braucht('b', 7, -3)).toBe(true);
  });
  it('NR12 P3a: neu mit gleicher Größe nutzt die Fläche weiter; freigeben setzt 0×0', () => {
    const f = testFabrik();
    const e = new BodenEbene(f.fabrik);
    e.neu('a', 100, 50, 25, 13, 0, 0, malen);
    e.neu('b', 100, 50, 25, 13, 0, 0, malen);
    expect(f.flaechen.length).toBe(1);
    e.freigeben();
    expect([f.flaechen[0].width, f.flaechen[0].height]).toEqual([0, 0]);
    expect(e.braucht('b', 0, 0)).toBe(true);
  });
  it('NR12 P3a: auflegen mit Einheitstransformation und zurückgesetztem Zustand', () => {
    const f = testFabrik();
    const e = new BodenEbene(f.fabrik);
    e.neu('a', 100, 50, 25, 13, 10, 10, malen);
    const ziel = aufnahme();
    e.auflegen(ziel.X, 12.5, 9.4);
    // 12,5 − 10 = 2,5 → Math.round 3; 9,4 − 10 = −0,6 → −1
    expect(ziel.befehle).toEqual(['save()', 'setTransform(1,0,0,1,0,0)', 'globalAlpha=1', 'drawImage(flaeche1,-22,-14)', 'restore()']);
  });
});

describe('NR12 P0 Nachtrag aus dem P0-Review (K1/K2)', () => {
  const leer = (): Szene => {
    const objekte = [neu('hz', 10, 10)];
    return { objekte, innen: [], netz: berechneNetz(objekte, [], 2), spiel: null, auswahl_id: null, modus: 'normal', geist: null, verschiebe_id: null, stempel: null, jetzt_ms: T0, strassen: [], fluss: [] };
  };
  it("NR12 P0: animationBedarf bleibt 'keine' – Klinik mit Vertrag (kein Rauch)", () => {
    const s = leer();
    s.objekte.push(neu('klinik', 2, 2, { zustand: 'vertrag' }));
    expect(animationBedarf(s, false)).toBe('keine');
  });
  it('NR12 P0: Haus ohne zufriedenheit_pct zählt nicht als „unter 40“ (Ersatzwert 80)', () => {
    const s = leer();
    const h = neu('efh', 5, 5, { zufriedenheit_pct: 80 });
    s.objekte.push(h);
    const mit80 = szenenSchluessel(s);
    delete h.zufriedenheit_pct;
    expect(szenenSchluessel(s)).toBe(mit80);
  });
});

describe('NR12 P3a Nachbesserung Review (W1, K1–K3)', () => {
  const zaunStart = (b: string[]): [number, number] => {
    const i = b.indexOf('strokeStyle=#c9a76a');
    const m = b.slice(i).find((x) => x.startsWith('moveTo('))!;
    const [x, y] = m.slice(7, -1).split(',').map(Number);
    return [x, y];
  };
  it('NR12 P3a: zwischengespeicherter Boden liegt genau an der Stelle des direkt gezeichneten (Zaun-Startpunkt, Auflegen bei −Rand)', () => {
    const { sp } = mitUhr();
    const k = kamera(), s = spielSzene(sp, T0);
    const direkt = zaunStart(bild(k, s).befehle);
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const a = bild(k, s);
    const [x, y] = zaunStart(f.flaechen[0].a.befehle);
    // Rand in CSS-px: 422 / 2 = 211 und 195 / 2 = 97,5
    expect(x - RAND_X / 2).toBeCloseTo(direkt[0], 6);
    expect(y - RAND_Y / 2).toBeCloseTo(direkt[1], 6);
    expect(drawImage(a.befehle)).toEqual([`drawImage(flaeche1,${-RAND_X},${-RAND_Y})`]);
  });
  it('NR12 P3a: abgebrochenes Malen lässt die Ebene ungültig', () => {
    const f = testFabrik();
    const e = new BodenEbene(f.fabrik);
    e.neu('a', 100, 50, 25, 13, 0, 0, () => undefined);
    expect(() => e.neu('b', 100, 50, 25, 13, 0, 0, () => { throw new Error('Malfehler'); })).toThrow('Malfehler');
    expect(e.braucht('a', 0, 0)).toBe(true);
    expect(e.braucht('b', 0, 0)).toBe(true);
  });
  it('NR12 P3a: erneutes Einrichten gibt die alte Fläche frei', () => {
    const { sp } = mitUhr();
    const f1 = testFabrik(); bodenEbeneEinrichten(f1.fabrik);
    bild(kamera(), spielSzene(sp, T0));
    const f2 = testFabrik(); bodenEbeneEinrichten(f2.fabrik);
    expect([f1.flaechen[0].width, f1.flaechen[0].height]).toEqual([0, 0]);
    bild(kamera(), spielSzene(sp, T0));
    bodenEbeneEinrichten(null);
    expect([f2.flaechen[0].width, f2.flaechen[0].height]).toEqual([0, 0]);
  });
  it('NR12 P3a: Hintergrund deckt die ganze Fläche, auch den aufgerundeten letzten Pixelstreifen', () => {
    const { sp } = mitUhr();
    const f = testFabrik(); bodenEbeneEinrichten(f.fabrik);
    const k = new Kamera(); k.groesseSetzen(844.3, 390.2, 2); k.zentrieren(11, 10, 2);
    bild(k, spielSzene(sp, T0));
    // 844,3 · 2 = 1688,6 → 1689 + 2 · round(422,15) = 1689 + 844 = 2533; 390,2 · 2 = 780,4 → 781 + 2 · round(195,1) = 781 + 390 = 1171
    expect([f.flaechen[0].width, f.flaechen[0].height]).toEqual([2533, 1171]);
    const b = f.flaechen[0].a.befehle;
    expect(b.slice(0, 3)).toEqual(['setTransform(1,0,0,1,0,0)', 'fillStyle=#b9c8ad', 'fillRect(0,0,2533,1171)']);
  });
});
