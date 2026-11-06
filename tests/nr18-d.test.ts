import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand, type Ereignis } from '../src/core/spiel';
import { KATALOG, KONSTANTEN, istLeitung, passendeStation, type TypId } from '../src/core/katalog';
import { berechneNetz, bedarfKw } from '../src/core/netz';
import type { Objekt } from '../src/core/typen';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { dauerText } from '../src/render/gebaeude';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { toastDauer_ms } from '../src/ui/toast';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import type { El } from './hilfen/dom-attrappe';
import { neu as neuesObjekt } from './hilfen';
import { abschnittOeffnen, objektBei, type Uhr } from './hilfen/nr18';

// NR18-D – Designer-Nacharbeit (Lastenheft NR18-D, DESIGN.md 12.22). Texte von Hand aus dem Lastenheft übernommen.

const T0 = 1_000_000_000_000;
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const START_TIPP = 'Tipp ein Haus an – Philipp plant dort deinen ersten Bauabschnitt.';
const HAUSBLATT_SPERRE = 'Erst mit Philipp einen Bauabschnitt planen – Knopf direkt darüber.';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

/** Altes Startdorf (zwei Häuser mit Station, Leitungen gebaut), Kessel gewählt, viel Geld. */
const altesDorf = (stufe = 1, uhr: Uhr = { t: T0 }): Spiel => {
  const s = new Spiel(altesStartdorf(T0), () => uhr.t);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
const bei = (s: Spiel, x: number, y: number): Objekt => s.stand.objekte.find((o) => o.x === x && o.y === y)!;
const knoepfe = (u: EchteUmgebung): El[] => u.knoepfe().filter((k) => k.isConnected);
const mit = (u: EchteUmgebung, anfang: string): El[] => knoepfe(u).filter((k) => norm(k.textContent).startsWith(anfang));
const blattText = (u: EchteUmgebung): string => norm(u.dom.html.querySelectorAll('.blatt').filter((b) => b.isConnected).map((b) => b.textContent).join(' '));

describe('NR18-D (1) Einmalige Start-Meldung', () => {
  it('NR18-D: Text ≤ 90 Zeichen; neues Spiel – erst nach der Begrüßung fällig, genau einmal', () => {
    expect(START_TIPP.length).toBeLessThanOrEqual(90);
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    expect(s.startTippFaellig(), 'vor der Begrüßung (Namensfenster offen)').toBe(false);
    expect(s.startTippNehmen()).toBeNull();
    s.namenSetzen('Anna', 'Heatville');
    expect(s.startTippFaellig()).toBe(true);
    expect(s.startTippNehmen()).toBe(START_TIPP);
    expect(s.stand.start_tipp_gezeigt).toBe(true);
    expect(s.startTippFaellig()).toBe(false);
    expect(s.startTippNehmen(), 'zweites Mal').toBeNull();
  });

  it('NR18-D: neues Spiel – hat der Spieler vor dem Tipp schon ein Haus angeschlossen, entfällt er', () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    s.namenSetzen('Anna', '');
    expect(s.startTippFaellig(), 'neues Spiel: kein Haus mit Station').toBe(true);
    const haus = s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus')!;
    delete haus.ohne_station; haus.station = passendeStation(bedarfKw(haus)).id;
    expect(s.startTippFaellig()).toBe(false);
    expect(s.startTippNehmen()).toBeNull();
  });

  it('NR18-D: alter Stand ohne Feld – mit angeschlossenen Häusern nie, ohne angeschlossenes Haus einmal', () => {
    const alt = altesStartdorf(T0);
    delete alt.namen_gefragt;
    const s = new Spiel(alt, () => T0);
    expect(s.stand.objekte.some((o) => KATALOG[o.typ].kategorie === 'haus' && !o.ohne_station), 'Vorbedingung: Häuser mit Station').toBe(true);
    expect(s.startTippFaellig()).toBe(false);
    expect(s.startTippNehmen()).toBeNull();

    const leer = neuerSpielstand(T0);
    delete leer.namen_gefragt;
    const s2 = new Spiel(leer, () => T0);
    expect(s2.startTippFaellig()).toBe(true);
    expect(s2.startTippNehmen()).toBe(START_TIPP);
    expect(s2.startTippNehmen()).toBeNull();
  });

  it('NR18-D: nach „Los geht’s“ erst die Begrüßung, nach ihrer Lesezeit die Start-Meldung – einmal', async () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    await echteSteuerung(s, (u) => {
      vi.useFakeTimers();
      s.stand.namen_gefragt = false; // die Hilfe schaltet das Namensfenster ab; hier geht es genau darum
      (u.st as unknown as { namenFragen(): void }).namenFragen();
      mit(u, 'Los geht’s')[0].click();
      expect(u.meldungen).toHaveLength(1);
      const gruss = u.meldungen[0];
      expect(gruss).toMatch(/^Viel Erfolg, /);
      vi.advanceTimersByTime(toastDauer_ms(gruss) - 1);
      expect(u.meldungen, 'Begrüßung steht noch').toEqual([gruss]);
      vi.advanceTimersByTime(1);
      expect(u.meldungen).toEqual([gruss, START_TIPP]);
      expect(s.stand.start_tipp_gezeigt).toBe(true);
      (u.st as unknown as { startTippPlanen(v?: string): void }).startTippPlanen();
      vi.advanceTimersByTime(60_000);
      expect(u.meldungen, 'kein zweites Mal').toEqual([gruss, START_TIPP]);
    });
  });

  it('NR18-D: startTippPlanen ohne Meldung davor zeigt den Tipp sofort (Stand ohne angeschlossenes Haus)', async () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    await echteSteuerung(s, (u) => {
      vi.useFakeTimers();
      (u.st as unknown as { startTippPlanen(v?: string): void }).startTippPlanen();
      vi.advanceTimersByTime(0);
      expect(u.meldungen).toEqual([START_TIPP]);
    });
  });
});

describe('NR18-D (2) Ersetzen-Knopf mit Kurzname', () => {
  it('NR18-D: Leitungskarte im offenen Abschnitt – „Ersetzen: 32er“ und „Ersetzen: 40er“', async () => {
    const s = altesDorf(1);
    s.stand.abschnitt = { phase: 'offen', bau: null };
    await echteSteuerung(s, (u) => {
      u.st.kontext(bei(s, 11, 14).id); // gebaute 25er
      expect(mit(u, 'Ersetzen:').map((k) => norm(k.firstChild?.textContent ?? ''))).toEqual(['Ersetzen: 32er', 'Ersetzen: 40er']);
    });
  });
});

/** Aufzeichnungs-Kontext wie tests/nr18-darstellung.test.ts: protokolliert Methodenaufrufe und gesetzte Eigenschaften. */
function aufnahme(): { X: CanvasRenderingContext2D; befehle: string[] } {
  const befehle: string[] = [];
  const zustand = new Map<PropertyKey, unknown>();
  const text = (a: unknown): string => (Array.isArray(a) ? JSON.stringify(a)
    : typeof a === 'object' && a !== null ? String((a as { name?: string }).name ?? 'objekt') : String(a));
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

describe('NR18-D (3) Ersatz-Raute in der Farbe der neuen Leitung', () => {
  function szeneMit(leitung: Partial<Objekt>): string[] {
    const objekte = [neuesObjekt('hz', 10, 10), neuesObjekt('d25', 12, 10, leitung), neuesObjekt('d25', 13, 10), neuesObjekt('efh', 14, 10)];
    const s: Szene = {
      objekte, innen: [], netz: berechneNetz(objekte, [], 2), spiel: null, auswahl_id: null, modus: 'normal', geist: null,
      verschiebe_id: null, stempel: null, jetzt_ms: 1000, strassen: [], fluss: [], kw_anzeigen: true,
    };
    const k = new Kamera();
    k.groesseSetzen(844, 390, 2);
    k.zentrieren(12, 10, 2);
    const a = aufnahme();
    bodenEbeneEinrichten(null);
    zeichneSzene(new Maler(a.X), k, s, new Effekte(), 0.016);
    return a.befehle;
  }
  // Farben von Hand aus src/core/katalog.ts: 32er #4caf3e, 40er #6ec6ff; Plan-Blau #2a6fb0.
  for (const [typ, farbe] of [['d32', '#4caf3e'], ['d40', '#6ec6ff']] as const) {
    it(`NR18-D: Ersatz durch ${typ} – gestrichelte Raute in ${farbe}, Deckkraft 0,8, kein Plan-Blau`, () => {
      const ohne = szeneMit({}), mitErsatz = szeneMit({ ersatz: { typ: typ as TypId, nr: 1 } });
      expect(ohne.filter((b) => b === `strokeStyle=${farbe}`).length, 'ohne Ersatz kommt die Farbe nicht vor').toBe(0);
      expect(mitErsatz.filter((b) => b === 'strokeStyle=#2a6fb0').length, 'kein Plan-Blau').toBe(0);
      expect(mitErsatz.filter((b) => b === `strokeStyle=${farbe}`).length).toBe(1);
      const i = mitErsatz.indexOf(`strokeStyle=${farbe}`);
      expect(mitErsatz.slice(0, i).filter((b) => b.startsWith('setLineDash(')).pop()).toMatch(/^setLineDash\(\[[^\]]+\]\)$/);
      expect(mitErsatz.slice(0, i).filter((b) => b.startsWith('globalAlpha=')).pop()).toBe('globalAlpha=0.8');
    });
  }
});

describe('NR18-D (4) Warnliste als Streifen', () => {
  const W = ['Die 25er an der Heizzentrale ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.', 'Eine 32er auf dem Weg ist zu dünn, es fehlen 3 kW. Zeichne eine 40er darüber.'];

  it('NR18-D: Phase bestellen – Streifen (kein Kasten) mit Überschrift und allen Sätzen im Kasten „Bauabschnitt“', async () => {
    const s = altesDorf(1); s.stand.abschnitt = { phase: 'bestellen', bau: null };
    vi.spyOn(s, 'abschnittWarnungen').mockReturnValue([...W]);
    await echteSteuerung(s, (u) => {
      u.st.katalog('netz');
      const streifen = u.dom.html.querySelectorAll('.warnstreifen').filter((e) => e.isConnected);
      expect(streifen).toHaveLength(1);
      const st = streifen[0];
      expect(st.classList.contains('kasten'), 'Streifen ist selbst kein Kasten').toBe(false);
      expect(st.querySelectorAll('h3').map((e) => norm(e.textContent))).toEqual(['Nach dem Bau zu dünn']);
      expect(st.querySelectorAll('p').map((p) => norm(p.textContent))).toEqual(W);
      expect(st.closest('.kasten'), 'liegt im Kasten „Bauabschnitt“').not.toBeNull();
    });
  });

  it('NR18-D: Stil des Streifens – Grund chip.rot, Überschrift #8f2117 mit „!“, Radius 12, Innenabstand 8/12', () => {
    const css = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');
    const regel = (sel: string): string => css.match(new RegExp(`(?:^|[}\\n])${sel.replace(/[.:()]/g, '\\$&')}\\{([^}]*)\\}`))?.[1] ?? '';
    const s = regel('.warnstreifen');
    expect(s).toContain('background:var(--menue-chip-rot-0)');
    expect(s).toContain('border-radius:12px');
    expect(s).toContain('padding:8px 12px');
    expect(regel('.warnstreifen h3')).toContain('color:var(--menue-chip-rot-1)');
    expect(regel('.warnstreifen h3::before')).toContain('content:"!"');
    expect(regel('.warnstreifen p')).toContain('color:var(--menue-farbe-text)');
  });
});

describe('NR18-D (5) Mehrfach-Hinweis beim Abschließen', () => {
  const TEXT_EINZELN = 'Die eingezeichnete 25er ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.';
  const ZWEI = '2 Stellen sind nach dem Bau zu dünn – die Liste steht im Baumenü.';
  /** Leeres Dorf wie tests/nr18-kern.test.ts: Startdorf ohne Leitungen und ohne Stationen, mit Kessel. */
  function leeresDorf(): { s: Spiel; z: Uhr } {
    const z = { t: T0 };
    const st = neuerSpielstand(T0);
    st.objekte = st.objekte.filter((o) => !istLeitung(o.typ));
    for (const o of st.objekte) if (o.station) { delete o.station; o.ohne_station = true; }
    const s = new Spiel(st, () => z.t);
    s.stand.geld_eur = 1_000_000;
    s.neuBerechnen();
    s.ereignisse.length = 0;
    return { s, z };
  }
  const haus = (s: Spiel, x: number, y: number): Objekt => objektBei(s, x, y, (o) => KATALOG[o.typ].kategorie === 'haus')!;
  const zeichne = (s: Spiel, typ: TypId, weg: ReadonlyArray<[number, number]>): void => {
    for (const [x, y] of weg) expect(s.platzieren(typ, x, y).ok).toBe(true);
  };
  const wand = (s: Spiel, h: Objekt) => s.stationKaufen(h.id, passendeStation(bedarfKw(h)).id);
  const hinweise = (s: Spiel): string[] => s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'hinweis' }> => e.art === 'hinweis').map((e) => e.text);
  /** Abschnitt mit 25er von der Heizzentrale zu zwei Häusern (je 10 kW → 5 kW zu viel), wie Abnahme (b) in NR18. */
  function mitEinerEngstelle(): { s: Spiel; z: Uhr } {
    const d = leeresDorf();
    expect(abschnittOeffnen(d.s, d.z)).toBe(true);
    zeichne(d.s, 'd25', [[10, 11], [10, 12], [10, 13], [10, 14], [11, 14]]);
    expect(wand(d.s, haus(d.s, 12, 14)).ok).toBe(true);
    expect(wand(d.s, haus(d.s, 9, 13)).ok).toBe(true);
    expect(d.s.platzieren('d25', 10, 15).ok).toBe(true);
    d.s.ereignisse.length = 0;
    return d;
  }

  it('NR18-D: genau ein Stück – der Einzelsatz bleibt', () => {
    const { s } = mitEinerEngstelle();
    expect(s.abschnittAbschliessen()).toEqual({ ok: true, hinweis: TEXT_EINZELN });
    expect(hinweise(s)).toEqual([TEXT_EINZELN]);
  });

  it('NR18-D: zwei Stücke – nur „2 Stellen sind nach dem Bau zu dünn – die Liste steht im Baumenü.“', () => {
    const { s } = mitEinerEngstelle();
    // zweites Stück: 25er-Stichleitung mit Mehrfamilienhaus (über 15 kW) am Ende, wie tests/nr18-kern.test.ts
    zeichne(s, 'd25', [[12, 12]]);
    const c = haus(s, 13, 12);
    c.aufgestockt = true; c.vollversorgung = true;
    expect(bedarfKw(c)).toBeGreaterThan(15);
    expect(wand(s, c).ok).toBe(true);
    s.ereignisse.length = 0;
    const e = s.abschnittAbschliessen();
    expect(s.abschnittWarnungen()).toHaveLength(2);
    expect(e).toEqual({ ok: true, hinweis: ZWEI });
    expect(hinweise(s)).toEqual([ZWEI]);
    // DESIGN 12.22 nennt „≤ 64“; der vorgegebene Wortlaut hat mit n = 2 genau 65 Zeichen – Grenze des Auftrags: 90.
    expect(ZWEI.length).toBe(65);
  });
});

describe('NR18-D (6) Sperrtext im Hausblatt', () => {
  it('NR18-D: Hausblatt ohne Abschnitt – „Leitung selbst legen“ verweist auf den Philipp-Knopf direkt darüber', async () => {
    expect(HAUSBLATT_SPERRE.length).toBeLessThanOrEqual(90);
    const s = altesDorf(1);
    await echteSteuerung(s, (u) => {
      u.st.kontext(bei(s, 9, 15).id);
      const folge = knoepfe(u).map((k) => norm(k.textContent));
      const iPhilipp = folge.findIndex((t) => t.startsWith('Philipp: Bauabschnitt planen lassen'));
      const iSelbst = folge.findIndex((t) => t.startsWith('Leitung selbst legen'));
      expect(iPhilipp).toBeGreaterThanOrEqual(0);
      expect(iSelbst, 'Philipp-Knopf steht davor (darüber)').toBeGreaterThan(iPhilipp);
      mit(u, 'Leitung selbst legen')[0].click();
      expect(norm(u.meldung())).toBe(HAUSBLATT_SPERRE);
    });
  });
});

describe('NR18-D (7) kW im Stationstausch gerundet', () => {
  it('NR18-D: Bedarf mit Gleitkomma-Rest wird wie im Blatt gerundet (höchstens eine Nachkommastelle)', async () => {
    const s = altesDorf(1);
    const h = bei(s, 12, 14);
    // Mehrfamilienhaus-Faktoren ergeben einen krummen Bedarf; geprüft wird nur, dass kein langer Rest im Text steht.
    h.aufgestockt = true; h.vollversorgung = true;
    const roh = bedarfKw(h);
    expect(String(roh), 'Testaufbau: Bedarf hat einen Gleitkomma-Rest').toMatch(/\.\d{4,}/);
    await echteSteuerung(s, (u) => {
      u.st.kontext(h.id);
      const t = blattText(u);
      const m = t.match(/das Gebäude braucht ([\d.,]+) kW/i);
      expect(m, t).not.toBeNull();
      expect(m![1]).toMatch(/^\d+(,\d)?$/);
      expect(m![1]).toBe((Math.round(roh * 10) / 10).toLocaleString('de-DE'));
    });
  });
});

describe('NR18-D (8) Bauzeit „etwa 15 Min.“', () => {
  it('NR18-D: dauerText – Sekunden, Minuten, Stunden (Grenzen 59/60 s, 3.599/3.600 s)', () => {
    expect(dauerText(30)).toBe('30 Sek.');
    expect(dauerText(59)).toBe('59 Sek.');
    expect(dauerText(60)).toBe('1 Min.');
    expect(dauerText(900)).toBe('15 Min.');
    expect(dauerText(3599)).toBe('1 Std.');
    expect(dauerText(3600)).toBe('1 Std.');
    expect(dauerText(5400)).toBe('1 Std. 30 Min.');
  });

  it('NR18-D: Baumenü Phase bestellen – „dauert der Bau etwa 15 Min.“', async () => {
    expect(KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor, 'Testaufbau: 900 s Bauzeit').toBe(900);
    const s = altesDorf(1); s.stand.abschnitt = { phase: 'bestellen', bau: null };
    await echteSteuerung(s, (u) => {
      u.st.katalog('netz');
      const t = blattText(u);
      expect(t).toContain('Nach der Bestellung dauert der Bau etwa 15 Min.');
      expect(t).not.toContain('15m');
    });
  });
});
