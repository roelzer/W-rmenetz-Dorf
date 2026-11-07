import { describe, expect, it } from 'vitest';
import { berechneNetz } from '../src/core/netz';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import type { InnenQuelle, Objekt } from '../src/core/typen';
import { Kamera } from '../src/render/kamera';
import type { Szene } from '../src/render/szene';
import { animationBedarf, bodenSchluessel, szenenSchluessel } from '../src/render/szene-schluessel';
import { neu, quelle } from './hilfen';

// NR12 / A90 Paket P0 (Bauplan docs/bauplaene/NR12-fluessig.md, Abschnitt 7 „P0 Vertrag Schlüssel“).
// Echte Kernfunktionen (berechneNetz, Spiel), keine Attrappen. Erwartete Ergebnisse von Hand aus dem Bauplan.

const JETZT = 100_000;

/** Szene mit Heizzentrale (10,10) und einem Einfamilienhaus (5,5); alle Felder mit festen Startwerten. */
function grundSzene(teile: Partial<Szene> = {}): Szene {
  const objekte: Objekt[] = teile.objekte ?? [neu('hz', 10, 10), neu('efh', 5, 5, { zufriedenheit_pct: 80, upgrade: 0 })];
  const innen: InnenQuelle[] = teile.innen ?? [];
  return {
    objekte, innen, netz: berechneNetz(objekte, innen, 2), spiel: null,
    auswahl_id: null, modus: 'normal', geist: null, verschiebe_id: null, stempel: null,
    jetzt_ms: JETZT, strassen: [[0, 1], [1, 1]], fluss: [[3, 0]], kw_anzeigen: true,
    ...teile,
  };
}
const haus = (s: Szene): Objekt => s.objekte[1];

describe('NR12 P0 szenenSchluessel (A90)', () => {
  it('NR12 P0: gleicher Stand ergibt gleichen Schlüssel', () => {
    const s = grundSzene();
    expect(szenenSchluessel(s)).toBe(szenenSchluessel(s));
    // gleiche Werte in frisch kopierten Objekten, gleiches Netz → gleicher Schlüssel
    const kopie: Szene = { ...s, objekte: s.objekte.map((o) => ({ ...o })), innen: s.innen.map((q) => ({ ...q })) };
    expect(szenenSchluessel(kopie)).toBe(szenenSchluessel(s));
  });

  const bau = { art: 'neu' as const, start_ms: JETZT - 1000, ende_ms: JETZT + 1000 };
  const felder: Array<[string, (s: Szene) => void]> = [
    ['id', (s) => { haus(s).id = 9999; }],
    ['typ', (s) => { haus(s).typ = 'rh'; }],
    ['x', (s) => { haus(s).x = 6; }],
    ['y', (s) => { haus(s).y = 6; }],
    ['stufe', (s) => { haus(s).stufe = 2; }],
    ['bau', (s) => { haus(s).bau = bau; }],
    ['geplant', (s) => { haus(s).geplant = true; }],
    ['gekuendigt', (s) => { haus(s).gekuendigt = true; }],
    ['interessent', (s) => { haus(s).interessent = true; }],
    ['anfrage', (s) => { haus(s).anfrage = 'aufstockung'; }],
    ['ohne_station', (s) => { haus(s).ohne_station = true; }],
    ['station', (s) => { haus(s).station = 'kompakt'; }],
    ['zustand', (s) => { haus(s).zustand = 'vertrag'; }],
    ['vorsehung', (s) => { haus(s).vorsehung = true; }],
    ['upgrade', (s) => { haus(s).upgrade = 1; }],
    ['hauspuffer', (s) => { haus(s).hauspuffer = true; }],
    ['vollversorgung', (s) => { haus(s).vollversorgung = true; }],
    ['aufgestockt', (s) => { haus(s).aufgestockt = true; }],
    ['zufriedenheit unter 40', (s) => { haus(s).zufriedenheit_pct = 39; }],
    ['Plopp aktiv', (s) => { haus(s)._pop = JETZT - 100; }],
    ['Objekt dazu', (s) => { s.objekte.push(neu('baum', 1, 1)); }],
    ['innen dazu', (s) => { s.innen.push(quelle('kessel')); }],
    ['modus', (s) => { s.modus = 'stempel'; }],
    ['auswahl_id', (s) => { s.auswahl_id = haus(s).id; }],
    ['verschiebe_id', (s) => { s.verschiebe_id = haus(s).id; }],
    ['geist gesetzt', (s) => { s.geist = { typ: 'efh', x: 2, y: 2, kante: 1, ok: true }; }],
    ['stempel gesetzt', (s) => { s.stempel = { x: 2, y: 2, ok: true }; }],
    ['kw_anzeigen', (s) => { s.kw_anzeigen = false; }],
    ['strassen-Länge', (s) => { s.strassen = [[0, 1]]; }],
    ['fluss-Länge', (s) => { s.fluss = []; }],
  ];
  for (const [name, aendern] of felder) {
    it(`NR12 P0: jedes Schlüsselfeld ändert den Schlüssel – ${name}`, () => {
      const s = grundSzene();
      const vorher = szenenSchluessel(s);
      aendern(s);
      expect(szenenSchluessel(s)).not.toBe(vorher);
    });
  }

  const innenFelder: Array<[string, (q: InnenQuelle) => void]> = [
    ['typ', (q) => { q.typ = 'wpg'; }],
    ['stufe', (q) => { q.stufe = 2; }],
    ['bau', (q) => { q.bau = { art: 'ausbau', start_ms: 0, ende_ms: 1 }; }],
  ];
  for (const [name, aendern] of innenFelder) {
    it(`NR12 P0: jedes Schlüsselfeld ändert den Schlüssel – innen ${name}`, () => {
      const s = grundSzene({ innen: [quelle('kessel')] });
      const vorher = szenenSchluessel(s);
      aendern(s.innen[0]);
      expect(szenenSchluessel(s)).not.toBe(vorher);
    });
  }

  const geistFelder: Array<[string, (g: NonNullable<Szene['geist']>) => void]> = [
    ['typ', (g) => { g.typ = 'rh'; }], ['x', (g) => { g.x = 3; }], ['y', (g) => { g.y = 3; }],
    ['kante', (g) => { g.kante = 2; }], ['ok', (g) => { g.ok = false; }],
  ];
  for (const [name, aendern] of geistFelder) {
    it(`NR12 P0: jedes Schlüsselfeld ändert den Schlüssel – geist ${name}`, () => {
      const s = grundSzene({ modus: 'platzieren', geist: { typ: 'efh', x: 2, y: 2, kante: 1, ok: true } });
      const vorher = szenenSchluessel(s);
      aendern(s.geist as NonNullable<Szene['geist']>);
      expect(szenenSchluessel(s)).not.toBe(vorher);
    });
  }

  const stempelFelder: Array<[string, (st: NonNullable<Szene['stempel']>) => void]> = [
    ['x', (st) => { st.x = 3; }], ['y', (st) => { st.y = 3; }], ['ok', (st) => { st.ok = false; }],
  ];
  for (const [name, aendern] of stempelFelder) {
    it(`NR12 P0: jedes Schlüsselfeld ändert den Schlüssel – stempel ${name}`, () => {
      const s = grundSzene({ modus: 'stempel', stempel: { x: 2, y: 2, ok: true } });
      const vorher = szenenSchluessel(s);
      aendern(s.stempel as NonNullable<Szene['stempel']>);
      expect(szenenSchluessel(s)).not.toBe(vorher);
    });
  }

  it('NR12 P0: jedes Schlüsselfeld ändert den Schlüssel – Phase des Bauabschnitts', () => {
    const spiel = new Spiel(neuerSpielstand(JETZT), () => JETZT);
    const s = grundSzene({ spiel });
    const vorher = szenenSchluessel(s);
    spiel.stand.abschnitt = { phase: 'offen', bau: null };
    expect(szenenSchluessel(s)).not.toBe(vorher);
    const offen = szenenSchluessel(s);
    spiel.stand.abschnitt = { phase: 'bau', bau: null };
    expect(szenenSchluessel(s)).not.toBe(offen);
  });

  it('NR12 P0: Zufriedenheit zählt nur als Schwelle unter 40 (80 → 40 gleich, 40 → 39 anders)', () => {
    const s = grundSzene();
    const bei80 = szenenSchluessel(s);
    haus(s).zufriedenheit_pct = 40;
    expect(szenenSchluessel(s)).toBe(bei80);
    haus(s).zufriedenheit_pct = 39;
    expect(szenenSchluessel(s)).not.toBe(bei80);
  });

  it('NR12 P0: neues Netz-Objekt → anderer Schlüssel, gleiches Netz-Objekt → gleicher', () => {
    const s = grundSzene();
    const vorher = szenenSchluessel(s);
    expect(szenenSchluessel({ ...s })).toBe(vorher);
    s.netz = berechneNetz(s.objekte, s.innen, 2);
    const zweites = szenenSchluessel(s);
    expect(zweites).not.toBe(vorher);
    s.netz = berechneNetz(s.objekte, s.innen, 2);
    expect(szenenSchluessel(s)).not.toBe(zweites);
  });

  it('NR12 P0: jetzt_ms ändert den Schlüssel nicht, außer ein Plopp endet', () => {
    const s = grundSzene();
    const ohne = szenenSchluessel(s);
    s.jetzt_ms = JETZT + 60_000;
    expect(szenenSchluessel(s)).toBe(ohne);

    haus(s)._pop = JETZT;
    s.jetzt_ms = JETZT;
    const start = szenenSchluessel(s);
    s.jetzt_ms = JETZT + 449;
    expect(szenenSchluessel(s)).toBe(start);
    s.jetzt_ms = JETZT + 451;
    const vorbei = szenenSchluessel(s);
    expect(vorbei).not.toBe(start);
    // genau 450 ms: Plopp ist vorbei (gebaeude.ts: 1 − 450/450 = 0)
    s.jetzt_ms = JETZT + 450;
    expect(szenenSchluessel(s)).toBe(vorbei);
  });

  it('NR12 P0: Besuch im Nachbardorf (spiel null, keine Straßen, kein Fluss) ergibt einen Schlüssel', () => {
    const s = grundSzene({ strassen: undefined, fluss: undefined, kw_anzeigen: undefined });
    expect(typeof szenenSchluessel(s)).toBe('string');
    expect(szenenSchluessel(s)).not.toBe(szenenSchluessel(grundSzene({ netz: s.netz })));
  });
});

describe('NR12 P0 bodenSchluessel (A90)', () => {
  const kamera = (): Kamera => { const k = new Kamera(); k.groesseSetzen(844, 390, 2); return k; };

  it('NR12 P0: Bodenschlüssel – Leitung dazu/Station gekauft → gleich', () => {
    const s = grundSzene(), k = kamera();
    const vorher = bodenSchluessel(s, k);
    s.objekte.push(neu('d25', 12, 10));
    expect(bodenSchluessel(s, k)).toBe(vorher);
    haus(s).station = 'kompakt'; haus(s).ohne_station = false;
    expect(bodenSchluessel(s, k)).toBe(vorher);
    s.netz = berechneNetz(s.objekte, s.innen, 2);
    s.jetzt_ms += 5000;
    expect(bodenSchluessel(s, k)).toBe(vorher);
  });

  it('NR12 P0: Bodenschlüssel – Verschiebung → gleich', () => {
    const s = grundSzene(), k = kamera();
    const vorher = bodenSchluessel(s, k);
    k.schiebe_x += 37.5; k.schiebe_y -= 12.25;
    expect(bodenSchluessel(s, k)).toBe(vorher);
  });

  const anders: Array<[string, (s: Szene, k: Kamera) => void]> = [
    ['Haus fertig gebaut', (s) => { haus(s).bau = null; }],
    ['Zoom', (_s, k) => { k.zoom += 0.5; }],
    ['Drehung', (_s, k) => { k.winkel_rad = 0.3; }],
    ['Breite', (_s, k) => { k.breite = 900; }],
    ['Höhe', (_s, k) => { k.hoehe = 400; }],
    ['Pixelverhältnis', (_s, k) => { k.pixelverhaeltnis = 1.25; }],
    ['Besuch (andere Straßen, gleiche Anzahl)', (s) => { s.strassen = [[0, 2], [1, 2]]; }],
    ['Besuch (anderer Fluss, gleiche Anzahl)', (s) => { s.fluss = [[4, 0]]; }],
    ['Modus platzieren', (s) => { s.modus = 'platzieren'; }],
    ['Haus verschoben (x)', (s) => { haus(s).x = 7; }],
    ['Haus verschoben (y)', (s) => { haus(s).y = 7; }],
    ['Haustyp', (s) => { haus(s).typ = 'mfh'; }],
    ['Hausstufe', (s) => { haus(s).stufe = 2; }],
    ['Haus dazu', (s) => { s.objekte.push(neu('rh', 2, 7)); }],
  ];
  for (const [name, aendern] of anders) {
    it(`NR12 P0: Bodenschlüssel – ${name} → anders`, () => {
      const s = grundSzene(), k = kamera();
      haus(s).bau = { art: 'neu', start_ms: 0, ende_ms: JETZT + 1 };
      const vorher = bodenSchluessel(s, k);
      aendern(s, k);
      expect(bodenSchluessel(s, k)).not.toBe(vorher);
    });
  }

  it('NR12 P0: Bodenschlüssel – nur „Modus normal oder nicht“ zählt, Deko und Großabnehmer nicht', () => {
    const s = grundSzene({ modus: 'platzieren' }), k = kamera();
    const vorher = bodenSchluessel(s, k);
    s.modus = 'stempel';
    expect(bodenSchluessel(s, k)).toBe(vorher);
    s.objekte.push(neu('baum', 1, 8), neu('bad', 14, 14));
    expect(bodenSchluessel(s, k)).toBe(vorher);
  });

  it('NR12 P0: Bodenschlüssel – Kamera auf 1e-4 gerundet (Rauschen unter der Rundung → gleich)', () => {
    const s = grundSzene(), k = kamera();
    k.winkel_rad = 0;
    const vorher = bodenSchluessel(s, k);
    k.winkel_rad = 0.00004; // × 1e4 = 0,4 → 0
    expect(bodenSchluessel(s, k)).toBe(vorher);
    k.winkel_rad = 0.00006; // × 1e4 = 0,6 → 1
    expect(bodenSchluessel(s, k)).not.toBe(vorher);
  });

  it('NR12 P0: Bodenschlüssel beim Besuch ohne Straßen und Fluss (undefined) geht und unterscheidet sich von leer nicht', () => {
    const k = kamera();
    const ohne = grundSzene({ strassen: undefined, fluss: undefined });
    const leer = grundSzene({ strassen: [], fluss: [], objekte: ohne.objekte });
    expect(typeof bodenSchluessel(ohne, k)).toBe('string');
    expect(bodenSchluessel(ohne, k)).toBe(bodenSchluessel(leer, k));
  });
});

describe('NR12 P0 animationBedarf (A90)', () => {
  /** Leeres Dorf: nur Heizzentrale, keine Quelle, kein Fluss, keine Straßen. */
  const leer = (teile: Partial<Szene> = {}): Szene => grundSzene({ objekte: [neu('hz', 10, 10)], fluss: [], strassen: [], ...teile });

  it("NR12 P0: leeres Dorf ohne Last und ohne Fluss → 'keine'", () => {
    expect(animationBedarf(leer(), false)).toBe('keine');
    expect(animationBedarf(grundSzene({ fluss: undefined, strassen: undefined }), false)).toBe('keine');
  });

  it("NR12 P0: Upgrade läuft → 'langsam'", () => {
    const s = leer();
    s.objekte.push(neu('efh', 5, 5, { upgrade_auftrag: { helfer: 'philipp', ende_ms: JETZT + 5000 } }));
    expect(animationBedarf(s, false)).toBe('langsam');
  });

  it("NR12 P0: Innen-Bau → 'langsam'", () => {
    const s = leer({ innen: [{ typ: 'kessel', stufe: 1, bau: { art: 'neu', start_ms: 0, ende_ms: JETZT + 1 } }] });
    s.netz.genutzt_kw = 0;
    expect(animationBedarf(s, false)).toBe('langsam');
  });

  it("NR12 P0 / NR22 E7: Überlast blinkt nicht mehr → ruhend 'keine'; nur während des Federns (450 ms ab seit_ms) 'fluessig'", () => {
    // Bauplan NR20-22 E7 und P7 (szene-schluessel: Überlast nicht mehr „langsam“, „flüssig“ nur während des Federns)
    const s = leer();
    s.netz.kapazitaet_ok.set(5 * 20 + 5, true);
    expect(animationBedarf(s, false)).toBe('keine');
    s.netz.kapazitaet_ok.set(5 * 20 + 6, false);
    expect(animationBedarf(s, false), 'Überlast allein hält die Karte nicht im Takt').toBe('keine');
    const stueck = (seit_ms: number) => [{ felder: [5 * 20 + 6, 5 * 20 + 7], dreiecke: [5 * 20 + 6], geplant: false, seit_ms }];
    expect(animationBedarf(leer({ ueberlast: stueck(JETZT - 100), netz: s.netz }), false), 'Dreieck federt (100 ms)').toBe('fluessig');
    expect(animationBedarf(leer({ ueberlast: stueck(JETZT - 449), netz: s.netz }), false), 'Dreieck federt noch (449 ms)').toBe('fluessig');
    expect(animationBedarf(leer({ ueberlast: stueck(JETZT - 450), netz: s.netz }), false), 'Federn vorbei (450 ms)').toBe('keine');
    expect(animationBedarf(leer({ ueberlast: stueck(JETZT - 60_000), netz: s.netz }), false), 'lange danach ruhend').toBe('keine');
    expect(animationBedarf(leer({ ueberlast: [{ ...stueck(JETZT - 60_000)[0], geplant: true }], netz: s.netz }), false), 'geplant ruht ebenso').toBe('keine');
  });

  it("NR12 P0: Bau läuft (Gerüst) → 'fluessig'", () => {
    const s = leer();
    s.objekte.push(neu('efh', 5, 5, { bau: { art: 'neu', start_ms: JETZT - 1, ende_ms: JETZT + 9000 } }));
    expect(animationBedarf(s, false)).toBe('fluessig');
  });

  it("NR12 P0: flüssig hat Vorrang vor langsam (Upgrade + Brunnen → 'fluessig')", () => {
    const s = leer();
    s.objekte.push(neu('efh', 5, 5, { upgrade_auftrag: { helfer: 'philipp', ende_ms: JETZT + 5000 } }), neu('brunnen', 2, 2));
    expect(animationBedarf(s, false)).toBe('fluessig');
  });

  const fluessig: Array<[string, (s: Szene) => void]> = [
    ['Brunnen', (s) => { s.objekte.push(neu('brunnen', 2, 2)); }],
    ['Großwärmepumpe', (s) => { s.innen.push(quelle('wpg')); }],
    ['Plopp (449 ms)', (s) => { s.objekte.push(neu('efh', 5, 5, { _pop: JETZT - 449 })); }],
    ['Leitung mit last_kw > 0', (s) => { s.netz.last_kw.set(10 * 20 + 12, 0.5); }],
    ['Netz läuft (genutzt_kw > 0)', (s) => { s.netz.genutzt_kw = 0.5; }],
    ['Interessent ohne Anschluss', (s) => { s.objekte.push(neu('efh', 5, 5, { interessent: true })); }],
    ['Blase (Kunde gekündigt)', (s) => { s.spiel = new Spiel(neuerSpielstand(JETZT), () => JETZT); s.objekte.push(neu('efh', 5, 5, { gekuendigt: true })); }],
    ['Auswahl', (s) => { s.auswahl_id = s.objekte[0].id; }],
    ['Fluss vorhanden', (s) => { s.fluss = [[3, 0]]; }],
    ['Platzieren', (s) => { s.modus = 'platzieren'; }],
    ['Verschieben', (s) => { s.modus = 'verschieben'; }],
    ['Großabnehmer mit Rauch (Sägewerk mit Vertrag)', (s) => { s.objekte.push(neu('gewerbe', 2, 2, { zustand: 'vertrag' })); }],
  ];
  for (const [name, aendern] of fluessig) {
    it(`NR12 P0: Brunnen / Großwärmepumpe / Plopp / Leitung mit last_kw > 0 → 'fluessig' – ${name}`, () => {
      const s = leer();
      expect(animationBedarf(s, false)).toBe('keine');
      aendern(s);
      expect(animationBedarf(s, false)).toBe('fluessig');
    });
  }

  it("NR12 P0: laufende Effekte → 'fluessig'", () => {
    expect(animationBedarf(leer(), true)).toBe('fluessig');
  });

  const keine: Array<[string, (s: Szene) => void]> = [
    ['Plopp genau 450 ms alt', (s) => { s.objekte.push(neu('efh', 5, 5, { _pop: JETZT - 450 })); }],
    ['Leitung mit last_kw = 0', (s) => { s.netz.last_kw.set(10 * 20 + 12, 0); }],
    ['Interessent mit Anschluss', (s) => { const o = neu('efh', 5, 5, { interessent: true }); s.objekte.push(o); s.netz.anschluss.set(o.id, { feld: 5 * 20 + 6, tiefe: 1 }); }],
    ['gekündigter Kunde beim Besuch (spiel null, keine Blase)', (s) => { s.objekte.push(neu('efh', 5, 5, { gekuendigt: true })); }],
    ['Stempel-Modus', (s) => { s.modus = 'stempel'; }],
    ['Großabnehmer ohne Vertrag', (s) => { s.objekte.push(neu('gewerbe', 2, 2, { zustand: 'gesperrt' })); }],
    ['Hallenbad mit Vertrag (kein Rauch)', (s) => { s.objekte.push(neu('bad', 2, 2, { zustand: 'vertrag' })); }],
    ['andere Innenquelle (Kessel ohne Last)', (s) => { s.innen.push(quelle('kessel')); }],
  ];
  for (const [name, aendern] of keine) {
    it(`NR12 P0: animationBedarf bleibt 'keine' – ${name}`, () => {
      const s = leer();
      aendern(s);
      expect(animationBedarf(s, false)).toBe('keine');
    });
  }
});
