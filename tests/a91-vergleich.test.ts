import { describe, expect, it } from 'vitest';
import { berechneNetz, bedarfKw } from '../src/core/netz';
import { KATALOG, LEITUNGSRANG, istLeitung, passendeStation } from '../src/core/katalog';
import { Spiel } from '../src/core/spiel';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { ORTE } from '../src/core/orte';
import type { Netz, Objekt } from '../src/core/typen';
import { berechneNetzAlt, belegungskarte, istKunde, leitungsNachbarn } from './hilfen/netz-alt-a91';
import { pruefeVergleich, zufallsNetz } from './hilfen/a91-netze';

// A91 Vergleichswerkzeug (Bauplan docs/bauplaene/NR15-netzmodell.md, Fassung 3, Paket P0, Abnahme 3).
// Alte Regel (eingefrorene Kopie von src/core/netz.ts aus 042e419) gegen die aktuelle berechneNetz auf 3.000 Zufallsnetzen:
// kein Haus warm→kalt, gleiche verfügbare Wärme, keine neue Planungsfehler-Warnung. Vor P1 sind alt und neu gleich, der Test
// ist dann grün; er wird rot, sobald eine A91-Änderung ein bisher warmes Haus kalt macht, Wärme verschiebt oder Warnungen erzeugt.
// Die Abdeckungs-Mindestzahlen zählen nur aus der alten Rechnung und der Geometrie und gelten deshalb schon vor P1.

const N = 24;
const T0 = 1_000_000_000_000;
const STARTWERTE = 3000;

/** Ausnahmen vom Vergleich: nur mit Startwert, Begründung und Freigabe des Projektleiters. Zu Beginn leer. */
const ERLAUBT: ReadonlyArray<{ seed: number; grund: string; freigabe: string }> = [];

describe('A91 Vergleich alte gegen neue Netzrechnung', () => {
  it('A91: test_a91_vergleich_alte_regel_3000_netze', () => {
    const erlaubt = new Set(ERLAUBT.map((e) => e.seed));
    const verstoesse: string[] = [];
    let geprueft = 0;
    for (let seed = 1; seed <= STARTWERTE; seed++) {
      if (erlaubt.has(seed)) continue;
      const { objekte, innen, vorlauf_c } = zufallsNetz(seed);
      const alt = berechneNetzAlt(objekte, innen, 2, vorlauf_c);
      const neu = berechneNetz(objekte, innen, 2, vorlauf_c);
      geprueft++;
      for (const v of pruefeVergleich(alt, neu)) verstoesse.push(`Startwert ${seed}: ${v}`);
    }
    expect(geprueft).toBe(STARTWERTE - erlaubt.size);
    // Bei Rot: die ersten Verstöße mit Startwert stehen in der Meldung, die Gesamtzahl darunter.
    expect({ anzahl: verstoesse.length, erste: verstoesse.slice(0, 15) }).toEqual({ anzahl: 0, erste: [] });
  }, 60_000);

  it('A91: test_a91_generator_deckt_faelle_ab', () => {
    const z = { wechselKandidat: 0, grossKandidat: 0, umhaengKandidat: 0, umhaengMitQuelle: 0, waermemangel: 0, quelleAnLeitung: 0, upgrade: 0 };
    for (let seed = 1; seed <= STARTWERTE; seed++) {
      const { objekte, innen, vorlauf_c } = zufallsNetz(seed);
      const a = berechneNetzAlt(objekte, innen, 2, vorlauf_c);
      const bel = belegungskarte(objekte);
      const nachId = new Map(objekte.map((o) => [o.id, o]));
      const leitung = (f: number): Objekt | undefined => { const o = nachId.get(bel[f]); return o && istLeitung(o.typ) ? o : undefined; };
      const rang = (f: number): number => LEITUNGSRANG[(leitung(f) as Objekt).typ];

      // Wechsel-Kandidat: Kunde alt „kalt: Leitung“, kein eigenes Leitungsende, mindestens zwei erreichte angrenzende Felder.
      let wechsel = false, gross = false;
      for (const o of objekte) {
        if (!istKunde(o) || a.kalt.get(o.id) !== 'leitung') continue;
        const g = KATALOG[o.typ].groesse ?? 1;
        const felder: number[] = [];
        let eigenesEnde = false;
        for (let i = 0; i < g; i++) {
          for (const [x, y] of [[o.x + i, o.y - 1], [o.x + i, o.y + g], [o.x - 1, o.y + i], [o.x + g, o.y + i]]) {
            if (x < 0 || y < 0 || x >= N || y >= N) continue;
            const f = y * N + x;
            if (!a.tiefe.has(f)) continue;
            felder.push(f);
            if (leitungsNachbarn(x, y, (k) => !!leitung(k)) <= 1) eigenesEnde = true;
          }
        }
        if (!eigenesEnde && felder.length >= 2) { wechsel = true; if (KATALOG[o.typ].kategorie === 'gross') gross = true; }
      }

      // Felder, an denen eine Wärmequelle, ein Puffer oder Abwärme (Sägewerk) hängt; Teilbaum-Markierung zur Heizzentrale hin.
      const quellFeld = new Set<number>();
      for (const o of objekte) {
        if (KATALOG[o.typ].kategorie !== 'waerme' && o.typ !== 'gewerbe') continue;
        const an = a.anschluss.get(o.id);
        if (an && an.feld >= 0) quellFeld.add(an.feld);
      }
      const mitQuelle = new Set(quellFeld);
      for (const k of [...a.tiefe.keys()].sort((p, q) => (a.tiefe.get(q) as number) - (a.tiefe.get(p) as number))) {
        const p = a.eltern.get(k) as number;
        if (p >= 0 && mitQuelle.has(k)) mitQuelle.add(p);
      }

      // Umhäng-Kandidat: Feld mit dünnerem Elternfeld und einem Nachbarn q (Tiefe − 1, nicht das Elternfeld, Rang ≥).
      let umh = false, umhQ = false;
      for (const [k, t] of a.tiefe) {
        const p = a.eltern.get(k) as number;
        if (p < 0 || rang(p) >= rang(k)) continue;
        const x = k % N, y = Math.floor(k / N);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const q = ny * N + nx;
          if (q === p || a.tiefe.get(q) !== t - 1 || rang(q) < rang(k)) continue;
          umh = true;
          if (mitQuelle.has(k)) umhQ = true;
        }
      }
      if (wechsel) z.wechselKandidat++;
      if (gross) z.grossKandidat++;
      if (umh) z.umhaengKandidat++;
      if (umhQ) z.umhaengMitQuelle++;
      if (a.verfuegbar_kw < a.bedarf_kw) z.waermemangel++;
      if (quellFeld.size > 0) z.quelleAnLeitung++;
      if (objekte.some((o) => (o.upgrade ?? 0) > 0)) z.upgrade++;
    }
    // Mindestzahlen laut Bauplan P0 (Prototyp: 2.684 / 1.845 / 566 / 115 / 2.673 / 1.753 / 2.979).
    expect(z.wechselKandidat).toBeGreaterThanOrEqual(500);
    expect(z.grossKandidat).toBeGreaterThanOrEqual(300);
    expect(z.umhaengKandidat).toBeGreaterThanOrEqual(300);
    expect(z.umhaengMitQuelle).toBeGreaterThanOrEqual(50);
    expect(z.waermemangel).toBeGreaterThanOrEqual(300);
    expect(z.quelleAnLeitung).toBeGreaterThanOrEqual(300);
    expect(z.upgrade).toBeGreaterThanOrEqual(300);
  }, 60_000);

  it('A91: test_a91_generator_verteilung_wie_im_bauplan', () => {
    // Zusätzlich zu den Mindestzahlen des Bauplans (die z. B. auch ohne Wärmequellen oder mit immer großem Kessel noch erreicht
    // werden, Fehlerprobe): die festgeschriebene Verteilung muss im Generator wirklich ankommen. Erwartungswerte aus den
    // Bauplan-Anteilen über 3.000 Netze; Grenze jeweils deutlich darunter (Zufallsschwankung, Startwerte 1…3000 aufeinanderfolgend).
    const z = { hz2: 0, hz3: 0, kessel1: 0, vorlaufAnders: 0, kaltWaerme: 0, quelleAnLeitung: 0, saegewerkAnLeitung: 0, spreizungUnter1: 0, hauspuffer: 0, zwischenZweiStraengen: 0 };
    for (let seed = 1; seed <= STARTWERTE; seed++) {
      const { objekte, innen, vorlauf_c } = zufallsNetz(seed);
      const a = berechneNetzAlt(objekte, innen, 2, vorlauf_c);
      const anLeitung = (o: Objekt): boolean => (a.anschluss.get(o.id)?.feld ?? -1) >= 0;
      const hz = objekte.find((o) => o.typ === 'hz') as Objekt;
      if (hz.stufe === 1) z.hz2++;
      if (hz.stufe === 3) z.hz3++;
      if (innen.length === 1 && innen[0].typ === 'kessel' && innen[0].stufe === 1) z.kessel1++;
      if (vorlauf_c !== 75) z.vorlaufAnders++;
      if ([...a.kalt.values()].includes('waerme')) z.kaltWaerme++;
      if (objekte.some((o) => ['pv', 'solar', 'sonde'].includes(o.typ) && anLeitung(o))) z.quelleAnLeitung++;
      if (objekte.some((o) => o.typ === 'gewerbe' && o.zustand === 'vertrag' && anLeitung(o))) z.saegewerkAnLeitung++;
      if (a.spreizung_faktor < 1) z.spreizungUnter1++;
      if (objekte.some((o) => o.hauspuffer)) z.hauspuffer++;
      // Parallelstrang: ein Kunde grenzt oben und unten an je ein erreichtes Leitungsfeld (Haus zwischen zwei Strängen).
      const zwischen = objekte.some((o) => {
        if (!istKunde(o)) return false;
        const g = KATALOG[o.typ].groesse ?? 1;
        let oben = false, unten = false;
        for (let i = 0; i < g; i++) {
          if (o.y - 1 >= 0 && a.tiefe.has((o.y - 1) * N + o.x + i)) oben = true;
          if (o.y + g < N && a.tiefe.has((o.y + g) * N + o.x + i)) unten = true;
        }
        return oben && unten;
      });
      if (zwischen) z.zwischenZweiStraengen++;
    }
    expect(z.hz2).toBeGreaterThanOrEqual(1000); // erwartet ≈ 1.500 (Hälfte Stufe 1)
    expect(z.hz3).toBeGreaterThanOrEqual(1000); // erwartet ≈ 1.500 (Hälfte Stufe 3)
    expect(z.kessel1).toBeGreaterThanOrEqual(1000); // erwartet ≈ 3.000 × (0,35 + 0,65 / 5) = 1.440
    expect(z.vorlaufAnders).toBeGreaterThanOrEqual(500); // erwartet ≈ 3.000 × 0,3 × 6/7 ≈ 771
    expect(z.kaltWaerme).toBeGreaterThanOrEqual(250); // echter Wärmemangel: mindestens ein Haus „kalt: Wärme“ (gemessen 503)
    expect(z.quelleAnLeitung).toBeGreaterThanOrEqual(450); // PV/Solarthermie/Erdsonde an einem Leitungsfeld (gemessen 920)
    expect(z.saegewerkAnLeitung).toBeGreaterThanOrEqual(250); // Abwärme an einem Leitungsfeld (gemessen 500)
    expect(z.spreizungUnter1).toBeGreaterThanOrEqual(60); // Prüf-Schwerpunkt 3: Spreizungsfaktor < 1 (gemessen 134)
    expect(z.hauspuffer).toBeGreaterThanOrEqual(1500); // Nachkommazahlen beim Bedarf (gemessen 2.592)
    expect(z.zwischenZweiStraengen).toBeGreaterThanOrEqual(1200); // Parallelstrang in 60 % (gemessen 1.952; ohne Parallelstrang 415)
  }, 60_000);

  it('A91: test_a91_generator_gleicher_startwert_gleiches_netz_und_nie_ueberlappend', () => {
    // Fehler, die das rot machen: Math.random statt Startwert; Gebäude auf belegten Feldern (Belegung verdeckt Objekte).
    for (const seed of [1, 2, 17, 999, 3000]) {
      expect(JSON.stringify(zufallsNetz(seed))).toBe(JSON.stringify(zufallsNetz(seed)));
    }
    expect(JSON.stringify(zufallsNetz(1))).not.toBe(JSON.stringify(zufallsNetz(2)));
    for (let seed = 1; seed <= 300; seed++) {
      const { objekte } = zufallsNetz(seed);
      const belegt = new Map<number, number>();
      for (const o of objekte) {
        const g = o.typ === 'hz' ? (o.stufe >= 3 ? 3 : 2) : (KATALOG[o.typ].groesse ?? 1);
        for (let dy = 0; dy < g; dy++) for (let dx = 0; dx < g; dx++) {
          const x = o.x + dx, y = o.y + dy;
          expect(x >= 0 && y >= 0 && x < N && y < N, `Startwert ${seed}: Objekt ${o.id} ragt aus dem Feld`).toBe(true);
          const f = y * N + x;
          expect(belegt.get(f), `Startwert ${seed}: Feld ${x}|${y} doppelt belegt`).toBeUndefined();
          belegt.set(f, o.id);
        }
      }
    }
  });

  it('A91: test_a91_pruefer_findet_verstoss', () => {
    // Echtes Ergebnis mit mindestens einem warmen Haus und einem Leitungsfeld suchen.
    let echt: Netz | null = null;
    for (let seed = 1; seed <= 200 && !echt; seed++) {
      const { objekte, innen, vorlauf_c } = zufallsNetz(seed);
      const n = berechneNetzAlt(objekte, innen, 2, vorlauf_c);
      if (n.warm.size >= 2 && n.reihenfolge.length > 0) echt = n;
    }
    expect(echt).not.toBeNull();
    const a = echt as Netz;
    const kopie = (aenderung: Partial<Netz>): Netz => ({ ...a, warm: new Set(a.warm), engpass: new Set(a.engpass), reduzierung: new Set(a.reduzierung), aufteilung: new Set(a.aufteilung), ...aenderung });

    // Kontrolle: unveränderte Kopie → keine Verstöße.
    expect(pruefeVergleich(a, kopie({}))).toEqual([]);

    // (b): ein Haus aus warm entfernt.
    const weg = [...a.warm][0];
    const ohne = new Set(a.warm); ohne.delete(weg);
    const vb = pruefeVergleich(a, kopie({ warm: ohne }));
    expect(vb.some((v) => v.startsWith('(b)') && v.includes(`Haus ${weg} `))).toBe(true);
    expect(vb.some((v) => v.startsWith('(a)'))).toBe(true);

    // (b) streng: gleich viele warme Häuser, aber ein anderes → trotzdem gemeldet, (a) nicht.
    const getauscht = new Set(ohne); getauscht.add(-12345);
    const vt = pruefeVergleich(a, kopie({ warm: getauscht }));
    expect(vt.some((v) => v.startsWith('(b)'))).toBe(true);
    expect(vt.some((v) => v.startsWith('(a)'))).toBe(false);

    // (e): eine Kilowattstunde mehr oder weniger verfügbare Wärme.
    expect(pruefeVergleich(a, kopie({ verfuegbar_kw: a.verfuegbar_kw + 1 })).some((v) => v.startsWith('(e)'))).toBe(true);
    expect(pruefeVergleich(a, kopie({ verfuegbar_kw: a.verfuegbar_kw - 0.5 })).some((v) => v.startsWith('(e)'))).toBe(true);

    // (d): je eine zusätzliche Kennung in engpass, reduzierung, aufteilung.
    const frei = [...Array(N * N).keys()].find((f) => !a.engpass.has(f) && !a.reduzierung.has(f) && !a.aufteilung.has(f)) as number;
    for (const art of ['engpass', 'reduzierung', 'aufteilung'] as const) {
      const s = new Set(a[art]); s.add(frei);
      const vd = pruefeVergleich(a, kopie({ [art]: s }));
      expect(vd).toEqual([`(d) neue Warnung ${art} ${frei}`]);
    }
    // Eine Warnung, die nur die Art wechselt (engpass → reduzierung am selben Feld), ist neu.
    if (a.engpass.size > 0) {
      const f = [...a.engpass][0];
      const r = new Set(a.reduzierung); r.add(f);
      if (!a.reduzierung.has(f)) expect(pruefeVergleich(a, kopie({ reduzierung: r }))).toEqual([`(d) neue Warnung reduzierung ${f}`]);
    }
    // Weggefallene Warnungen und mehr warme Häuser sind kein Verstoß.
    const mehr = new Set(a.warm); mehr.add(-1);
    expect(pruefeVergleich(a, kopie({ warm: mehr, engpass: new Set() , reduzierung: new Set(), aufteilung: new Set() }))).toEqual([]);
  });

});
