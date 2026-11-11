import { describe, expect, it, vi } from 'vitest';
import { istLeitung, KATALOG, type TypId } from '../src/core/katalog';
import { berechneNetz } from '../src/core/netz';
import { Spiel, WANDSTATION_TUTORIAL } from '../src/core/spiel';
import { ERSTE_HAEUSER, neuerSpielstand, neuesSpielMitTutorial } from '../src/core/start';
import type { Bedienung, TippMeldung, TutorialBandFeld } from '../src/core/tutorial-vertrag';
import type { Objekt } from '../src/core/typen';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { animationBedarf, szenenSchluessel } from '../src/render/szene-schluessel';
import type { Sperre } from '../src/ui/bausteine';
import { neu } from './hilfen';
import { domAttrappe, El, sichtbar, type DomAttrappe } from './hilfen/dom-attrappe';

// Bauplan docs/bauplaene/NR13-tutorial.md (Fassung 3.1), Bauplan P3 Teil b: Blätter (HUD, Baumenü, Hausblatt, Blatt-[X]),
// Meldungen stumm, Kamera (Einpassen, Grenze, Fahrt) und Szene (Spur, „Erreicht“-Zeichen).
// Echte Oberflächen-Module auf der DOM-Nachbildung tests/hilfen/dom-attrappe.ts; nur das Katalogbild ist ersetzt (kann nicht
// zeichnen). Die Oberfläche (`Ui`) ist ein Spion: Er schreibt Tipp-Meldungen, Sperr-Fragen und Aktionen in eine Liste.

const T0 = 1_000_000_000_000;

type Umgebung = { dom: DomAttrappe };

async function mitDom(arbeit: (u: Umgebung) => Promise<void>): Promise<void> {
  const dom = domAttrappe();
  const ebene = new El('div');
  ebene.attrs.id = 'ebene';
  dom.app.append(ebene);
  vi.resetModules();
  vi.stubGlobal('document', dom.doc);
  vi.stubGlobal('DOMParser', dom.Parser);
  vi.stubGlobal('HTMLElement', El);
  vi.stubGlobal('HTMLButtonElement', El);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  const matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal('matchMedia', matchMedia);
  // Zeitgeber laufen nie ab: Die Tests prüfen den Zustand direkt nach der Handlung (kein Nachlaufen nach dem Test).
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('window', { matchMedia, setTimeout: () => 0, clearTimeout: () => {}, devicePixelRatio: 1, innerWidth: 844, innerHeight: 390, addEventListener: () => {}, removeEventListener: () => {} });
  vi.doMock('../src/ui/bild', () => ({ katalogBild: () => new El('canvas') }));
  try { await arbeit({ dom }); } finally {
    vi.unstubAllGlobals();
    vi.doUnmock('../src/ui/bild');
  }
}

type Spion = { ui: Record<string, unknown>; log: string[]; gefragt: Bedienung[] };

/** Ui-Spion: `gesperrt` = Bedienungen, für die das Tutorial den Knopf sperrt (Hinweis-Funktion liefert '' wie in §6). */
function spion(s: Spiel, gesperrt: Bedienung[] = []): Spion {
  const log: string[] = [], gefragt: Bedienung[] = [];
  const ui = {
    spiel: s, jetzt_ms: () => T0, geaendert: () => s.neuBerechnen(),
    toast: (t: string) => log.push(`toast:${t}`), platzieren: (t: string) => log.push(`platzieren:${t}`),
    stempeln: (t: string) => log.push(`stempeln:${t}`), verschieben: () => {}, katalog: () => {}, kontext: () => {},
    tutorialMelden: (m: TippMeldung) => log.push(`melden:${m.tipp}${m.typ ? `:${m.typ}` : ''}`),
    tutorialSperreKnopf: (b: Bedienung): Sperre | null => {
      gefragt.push(b);
      return gesperrt.includes(b) ? { grund: 'im Tutorial nicht', schloss: false, hinweis: () => { log.push(`gesperrt:${b}`); return ''; } } : null;
    },
  };
  return { ui, log, gefragt };
}

const T = (e: El): string => e.textContent.replace(/ /g, ' ');
const knoepfe = (w: El): El[] => w.querySelectorAll('button');
const knopfMit = (w: El, anfang: string): El => {
  const k = knoepfe(w).filter((b) => T(b).startsWith(anfang));
  expect(k, `genau ein Knopf „${anfang}…“`).toHaveLength(1);
  return k[0];
};
const gesperrt = (k: El): boolean => k.getAttribute('aria-disabled') === 'true';

/** Spiel mit gewählter Quelle und viel Geld; `tutorial` = neuer Stand mit Tutorial-Merke. */
function spiel(tutorial: boolean): Spiel {
  const s = new Spiel(tutorial ? neuesSpielMitTutorial(T0) : neuerSpielstand(T0), () => T0);
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  return s;
}
const ersteHaus = (s: Spiel): Objekt =>
  s.stand.objekte.find((o) => o.x === ERSTE_HAEUSER[0][0] && o.y === ERSTE_HAEUSER[0][1] && KATALOG[o.typ].kategorie === 'haus')!;

async function baumenue(s: Spiel, sp: Spion, dom: DomAttrappe): Promise<{ wurzel: El; zu(): void }> {
  const { Katalog } = await import('../src/ui/katalog');
  const k = new Katalog(sp.ui as never);
  k.oeffnen('netz');
  const wurzel = dom.html.querySelector('section.blatt')!;
  return { wurzel, zu: () => k.schliessen() };
}
async function hausblatt(s: Spiel, sp: Spion, dom: DomAttrappe, o: Objekt): Promise<El> {
  const { Kontext } = await import('../src/ui/kontext');
  new Kontext(sp.ui as never, () => {}).oeffnen(o.id);
  return dom.html.querySelector('section.blatt')!;
}

const LEITUNGEN = (Object.keys(KATALOG) as TypId[]).filter((t) => KATALOG[t].kategorie === 'netz' && istLeitung(t));

describe('NR13 P3 Blätter: Ziele, Meldungen, Sperren', () => {
  it('test_nr13_ziele_markiert: HUD, Baumenü (alle Phasen) und Hausblatt tragen data-ziel; Leitungskarten mit data-typ', async () => {
    await mitDom(async ({ dom }) => {
      const s = spiel(true);
      const { Hud } = await import('../src/ui/hud');
      const hud = new Hud(() => s, { bauen() {}, besuchen() {}, einstellungen() {}, auftrag() {}, kwUmschalten: () => true, kwAn: () => true });
      dom.app.append(hud.wurzel);
      hud.aktualisieren(null);
      expect(hud.wurzel.querySelector('[data-ziel="waerme_pille"]')?.getAttribute('data-res')).toBe('waerme');
      expect(hud.wurzel.querySelector('[data-ziel="geld_pille"]')?.getAttribute('data-res')).toBe('geld');
      expect(hud.wurzel.querySelector('[data-ziel="bauen"]')?.className).toContain('bauen');

      const sp = spion(s);
      let b = await baumenue(s, sp, dom);
      const reiter = b.wurzel.querySelector('[data-ziel="reiter_leitungen"]')!;
      expect(reiter.getAttribute('aria-label')).toBe('Leitungen');
      expect(T(b.wurzel.querySelector('[data-ziel="philipp"]')!)).toContain('Neuen Bauabschnitt planen');
      expect(T(b.wurzel.querySelector('[data-ziel="kasten_abschnitt"]')!)).toContain('Bauabschnitt');
      const karten = b.wurzel.querySelectorAll('[data-ziel="leitungskarte"]');
      expect(karten.map((k) => k.getAttribute('data-typ'))).toEqual(LEITUNGEN);
      expect(LEITUNGEN.length).toBeGreaterThan(1);
      b.zu();

      s.stand.abschnitt = { phase: 'bestellen', bau: null };
      b = await baumenue(s, sp, dom);
      expect(T(b.wurzel.querySelector('[data-ziel="laura"]')!)).toContain('Material bei Laura bestellen');
      b.zu();

      const blatt = await hausblatt(s, sp, dom, ersteHaus(s));
      expect(T(blatt.querySelector('[data-ziel="kasten_station"]')!)).toContain('Übergabestation wählen');
      const puffer = blatt.querySelectorAll('[data-ziel="puffer_knopf"]');
      expect(puffer).toHaveLength(1);
      // kleinste passende Puffer-Station = der empfohlene Knopf (Knopfart 'geld')
      expect(puffer[0].className.split(' ')).toContain('geld');
    });
  });

  it('test_nr13_reiter_und_karte_melden: Reiter „Leitungen“ und Leitungskarte melden über ui.tutorialMelden', async () => {
    await mitDom(async ({ dom }) => {
      const s = spiel(true);
      const sp = spion(s);
      s.stand.abschnitt = { phase: 'offen', bau: null };
      const b = await baumenue(s, sp, dom);
      knopfMit(b.wurzel, 'Heizhaus').click();
      expect(sp.log.filter((l) => l.startsWith('melden'))).toEqual([]);
      dom.html.querySelector('[data-ziel="reiter_leitungen"]')!.click();
      expect(sp.log.filter((l) => l.startsWith('melden'))).toEqual(['melden:reiter_leitungen']);
      const karte = dom.html.querySelectorAll('[data-ziel="leitungskarte"]')[1];
      karte.click();
      expect(sp.log.filter((l) => l.startsWith('melden'))).toEqual(['melden:reiter_leitungen', `melden:leitungskarte:${LEITUNGEN[1]}`]);
    });
  });

  it('test_nr13_leitungskarte_erst_aktion_dann_melden: beim Melden ist die Zeichenleiste schon offen (stempeln vorher)', async () => {
    await mitDom(async ({ dom }) => {
      const s = spiel(true);
      const sp = spion(s);
      s.stand.abschnitt = { phase: 'offen', bau: null };
      await baumenue(s, sp, dom);
      dom.html.querySelectorAll('[data-ziel="leitungskarte"]')[0].click();
      expect(sp.log).toEqual([`stempeln:${LEITUNGEN[0]}`, `melden:leitungskarte:${LEITUNGEN[0]}`]);
    });
  });

  it('test_nr13_baumenue_sperren: Verwerfen, Express und Sofort fertig fragen tutorialSperreKnopf und sind dann gesperrt', async () => {
    await mitDom(async ({ dom }) => {
      const s = spiel(true);
      s.stand.abschnitt = { phase: 'offen', bau: null };
      let sp = spion(s, ['verwerfen']);
      let b = await baumenue(s, sp, dom);
      const verwerfen = knopfMit(b.wurzel, 'Verwerfen');
      expect(gesperrt(verwerfen)).toBe(true);
      verwerfen.click();
      expect(s.stand.abschnitt?.phase, 'Verwerfen gesperrt: Abschnitt bleibt').toBe('offen');
      expect(sp.log).toContain('gesperrt:verwerfen');
      b.zu();

      s.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 600_000 } };
      s.hz.stufe = 4; // Express freigeschaltet, sonst sperrt schon die Stufe
      sp = spion(s, ['express', 'sofort']);
      b = await baumenue(s, sp, dom);
      expect(sp.gefragt).toEqual(expect.arrayContaining(['express', 'sofort']));
      const sofort = knopfMit(b.wurzel, 'Sofort fertig');
      expect(gesperrt(sofort)).toBe(true);
      expect(T(sofort)).toContain('im Tutorial nicht');
      const taler = s.stand.taler;
      sofort.click();
      expect(s.stand.taler, 'Sofort fertig gesperrt: keine Taler weg').toBe(taler);
      const express = knopfMit(b.wurzel, 'Laura: Expresslieferung');
      expect(gesperrt(express)).toBe(true);
      b.zu();

      sp = spion(s);
      b = await baumenue(s, sp, dom);
      expect(gesperrt(knopfMit(b.wurzel, 'Sofort fertig')), 'ohne Tutorial-Sperre frei').toBe(false);
    });
  });

  it('test_nr13_weiter_einzeichnen_gesperrt: Spion sperrt weiter_einzeichnen → Knopf gesperrt, Klick öffnet den Abschnitt nicht', async () => {
    await mitDom(async ({ dom }) => {
      const s = spiel(true);
      s.stand.abschnitt = { phase: 'bestellen', bau: null };
      let sp = spion(s, ['weiter_einzeichnen']);
      let b = await baumenue(s, sp, dom);
      const k = knopfMit(b.wurzel, 'Weiter einzeichnen');
      expect(gesperrt(k)).toBe(true);
      k.click();
      expect(s.stand.abschnitt?.phase).toBe('bestellen');
      expect(sp.log).toContain('gesperrt:weiter_einzeichnen');
      b.zu();
      sp = spion(s);
      b = await baumenue(s, sp, dom);
      knopfMit(b.wurzel, 'Weiter einzeichnen').click();
      expect(s.stand.abschnitt?.phase, 'ohne Sperre wie heute').toBe('offen');
    });
  });

  it('test_nr13_wandreihe_spaeter_waehlbar: mit Merke Wandreihe gesperrt („später wählbar“, Schloss, Hinweis); alter Stand frei', async () => {
    await mitDom(async ({ dom }) => {
      const s = spiel(true);
      const sp = spion(s);
      let blatt = await hausblatt(s, sp, dom, ersteHaus(s));
      let wand = knopfMit(blatt, 'Station einbauen');
      expect(gesperrt(wand)).toBe(true);
      expect(T(wand)).toContain('später wählbar');
      expect(wand.querySelector('.schloss-klein'), 'Schloss vor Zeile 2').not.toBeNull();
      const haus = ersteHaus(s);
      wand.click();
      expect(haus.station, 'gesperrt: keine Station gekauft').toBeUndefined();
      expect(dom.doc.getElementById('toast')?.textContent).toBe(WANDSTATION_TUTORIAL);
      // freie Stationswahl: alle Wandstationen der Reihe gesperrt, die Puffer-Station frei
      s.hz.stufe = 4;
      blatt = await hausblatt(s, sp, dom, haus);
      const wandKnoepfe = knoepfe(blatt).filter((k) => T(k).startsWith('Wandstation'));
      expect(wandKnoepfe.length).toBeGreaterThan(0);
      expect(wandKnoepfe.every(gesperrt)).toBe(true);
      expect(gesperrt(blatt.querySelector('[data-ziel="puffer_knopf"]')!)).toBe(false);

      const alt = spiel(false);
      blatt = await hausblatt(alt, spion(alt), dom, ersteHaus(alt));
      wand = knopfMit(blatt, 'Station einbauen');
      expect(gesperrt(wand)).toBe(false);
      expect(T(wand)).not.toContain('später wählbar');
    });
  });

  // Merge B1 (Designer 2026-11-11, übernommen): auch der kW-Knopf aus main ist im Tutorial weg – er schaute hinter der
  // Anleiter-Karte hervor. Gleicher Mechanismus wie [Dörfer]: Klasse „versteckt“ am Knopf selbst.
  it('test_nr13_hud_tutorialmodus: versteckt Auftragskarte, [Dörfer] und kW-Knopf; aktualisieren/sichtbar holen sie nicht zurück', async () => {
    await mitDom(async ({ dom }) => {
      const s = spiel(true);
      const { Hud } = await import('../src/ui/hud');
      const hud = new Hud(() => s, { bauen() {}, besuchen() {}, einstellungen() {}, auftrag() {}, kwUmschalten: () => true, kwAn: () => true });
      dom.app.append(hud.wurzel);
      const auftrag = { text: 'Schließe 3 Häuser an', taler: 5 } as never;
      hud.aktualisieren(auftrag);
      const q = (sel: string): El => (hud.wurzel as unknown as El).querySelector(sel)!;
      const karte = q('.auftrag'), doerfer = q('.rund.besuch'), bauen = q('.rund.bauen'), pillen = q('.pillen'), kw = q('.kwknopf'), schild = q('.dorfschild');
      expect([karte, doerfer, bauen, pillen, kw, schild].every(sichtbar), 'Vorbedingung: alles sichtbar').toBe(true);

      hud.tutorialModus(true);
      expect(sichtbar(karte)).toBe(false);
      expect(sichtbar(doerfer)).toBe(false);
      expect(karte.classList.contains('versteckt'), 'Klasse am Element selbst').toBe(true);
      expect(doerfer.classList.contains('versteckt')).toBe(true);
      expect(sichtbar(kw), 'kW-Knopf im Tutorial weg (B1)').toBe(false);
      expect(kw.classList.contains('versteckt'), 'kW: Klasse am Knopf selbst').toBe(true);
      expect([bauen, pillen, schild].every(sichtbar)).toBe(true);

      hud.aktualisieren(auftrag);
      expect(sichtbar(karte), 'aktualisieren holt die Auftragskarte nicht zurück').toBe(false);
      hud.sichtbar({ eigene: true });
      expect(sichtbar(karte)).toBe(false);
      expect(sichtbar(doerfer)).toBe(false);
      expect(sichtbar(kw), 'sichtbar() holt den kW-Knopf nicht zurück').toBe(false);
      expect([bauen, pillen, schild].every(sichtbar)).toBe(true);

      hud.tutorialModus(false);
      hud.aktualisieren(auftrag);
      expect(sichtbar(karte)).toBe(true);
      expect(sichtbar(doerfer)).toBe(true);
      expect(sichtbar(kw)).toBe(true);
    });
  });

  it('test_nr13_blatt_zu_sperre: [X] und Esc mit Sperre schließen nicht und wackeln; ohne Sperre wie heute; Baumenü/Hausblatt geben zuSperre mit', async () => {
    await mitDom(async ({ dom }) => {
      const { blattOeffnen, blattOffen } = await import('../src/ui/blatt');
      let sperre: Sperre | null = { grund: 'x', schloss: false, hinweis: 'Die Leiste bleibt offen.' };
      let zu = 0;
      blattOeffnen({ titel: 'Probe', zuSperre: () => sperre, beiZu: () => { zu++; } });
      const x = dom.html.querySelector('button.schliessen')!;
      x.click();
      expect(blattOffen()).toBe(true);
      expect(zu).toBe(0);
      expect(x.classList.contains('wackelt')).toBe(true);
      expect(dom.doc.getElementById('toast')?.textContent).toBe('Die Leiste bleibt offen.');
      dom.taste('Escape');
      expect(blattOffen(), 'Esc mit Sperre').toBe(true);
      sperre = null;
      x.click();
      expect(blattOffen(), 'Sperre weg → schließt').toBe(false);
      expect(zu).toBe(1);

      blattOeffnen({ titel: 'Ohne' });
      dom.html.querySelector('button.schliessen')!.click();
      expect(blattOffen(), 'ohne zuSperre wie heute').toBe(false);

      const s = spiel(true);
      const sp = spion(s, ['blatt_schliessen']);
      await baumenue(s, sp, dom);
      dom.html.querySelector('button.schliessen')!.click();
      expect(blattOffen(), 'Baumenü bleibt offen').toBe(true);
      expect(sp.log).toContain('gesperrt:blatt_schliessen');
      await hausblatt(s, sp, dom, ersteHaus(s));
      sp.log.length = 0;
      dom.taste('Escape');
      expect(blattOffen(), 'Hausblatt bleibt offen').toBe(true);
      expect(sp.log).toEqual(['gesperrt:blatt_schliessen']);
    });
  });

  it('test_nr13_meldungen_stumm_und_wichtig: stumm → #toast leer (auch stehende Meldung weg); toastWichtig erscheint immer', async () => {
    await mitDom(async ({ dom }) => {
      const { toast, meldungenStumm, toastWichtig } = await import('../src/ui/toast');
      const text = (): string => dom.doc.getElementById('toast')?.textContent ?? '';
      toast('Vorher');
      expect(text()).toBe('Vorher');
      meldungenStumm(true);
      expect(text(), 'stehende Meldung weg').toBe('');
      toast('Neu gebaut');
      expect(text()).toBe('');
      toastWichtig('Speichern fehlgeschlagen');
      expect(text()).toBe('Speichern fehlgeschlagen');
      expect(dom.doc.getElementById('toast')!.firstElementChild!.classList.contains('wichtig')).toBe(true);
      meldungenStumm(false);
      toast('Wieder da');
      expect(text()).toBe('Wieder da');
    });
  });
});

describe('NR13 P3 Kamera', () => {
  const HZ = { x0: 9, y0: 10, x1: 12, y1: 14 }; // Rahmen um HZ (11|10) und ERSTE_HAEUSER (9|13), (12|14)
  const MITTEN: Array<[number, number]> = [[11, 10], [9, 13], [12, 14]];

  it('test_nr13_einpassen_ziel: rein rechnend; nach Anwenden liegen alle drei Feldmitten in frei minus 24 px, Zoom ≤ 3', () => {
    for (const [b, hoehe] of [[844, 390], [667, 375]] as const) {
      const k = new Kamera();
      k.groesseSetzen(b, hoehe, 1);
      const frei = { x: 0, y: 0, b: b - 216, h: hoehe };
      const vorher = k.schluessel();
      const z = k.einpassenZiel(HZ, frei, 24, 3);
      expect(k.schluessel(), 'Kamera unverändert').toBe(vorher);
      // Mitte des Rahmens in (x−y, x+y): u ∈ [−5, 2], v ∈ [19, 26] → u = −1,5, v = 22,5 → Feld (10,5 | 12)
      expect(z.mitte_x).toBeCloseTo(10.5, 6);
      expect(z.mitte_y).toBeCloseTo(12, 6);
      expect(z.zoom).toBe(3);
      k.einpassen(HZ, frei, 24, 3);
      expect(k.zoom).toBe(3);
      for (const [x, y] of MITTEN) {
        const [px, py] = k.mitte(x, y);
        expect(px).toBeGreaterThanOrEqual(frei.x + 24 - 1);
        expect(px).toBeLessThanOrEqual(frei.x + frei.b - 24 + 1);
        expect(py).toBeGreaterThanOrEqual(frei.y + 24 - 1);
        expect(py).toBeLessThanOrEqual(frei.y + frei.h - 24 + 1);
      }
    }
    // Zoom aus dem Platz (zoom_max hoch): 844×390 → basis = min(844/26, 390/15) = 26; Breite 628 − 48 = 580 für 7 Einheiten
    // zu je basis·zoom/2 → 580 / (3,5 · 26) = 6,3736; Höhe 342 / (7 · 26/4) = 7,5165 → kleinerer Wert
    const k = new Kamera();
    k.groesseSetzen(844, 390, 1);
    expect(k.einpassenZiel(HZ, { x: 0, y: 0, b: 628, h: 390 }, 24, 10).zoom).toBeCloseTo(580 / 91, 6);
    // 667×375 → basis 25; 403 / 87,5 = 4,6057 (Höhe 327 / 43,75 = 7,47)
    const k2 = new Kamera();
    k2.groesseSetzen(667, 375, 1);
    expect(k2.einpassenZiel(HZ, { x: 0, y: 0, b: 451, h: 375 }, 24, 10).zoom).toBeCloseTo(403 / 87.5, 6);
  });

  it('test_nr13_kamera_grenze: Mitte bleibt im Rechteck, Zoom in [zoom_min, zoom_max]; grenzeSetzen(null) wie vorher', () => {
    const k = new Kamera();
    k.groesseSetzen(844, 390, 1);
    k.zoom = 3;
    k.zentrieren(11, 12, 1);
    const g = { ...HZ, mitte_px: [314, 195] as const, zoom_min: 2.2, zoom_max: 3 };
    k.grenzeSetzen(g);
    expect(k.grenze).toEqual(g);
    for (const [dx, dy] of [[5000, 0], [-5000, 0], [0, 5000], [0, -5000], [3000, -4000]]) {
      k.schiebe_x += dx; k.schiebe_y += dy; k.begrenzen();
      const [fx, fy] = k.feldGenau(314, 195);
      expect(fx).toBeGreaterThanOrEqual(9 - 1e-6); expect(fx).toBeLessThanOrEqual(12 + 1e-6);
      expect(fy).toBeGreaterThanOrEqual(10 - 1e-6); expect(fy).toBeLessThanOrEqual(14 + 1e-6);
    }
    // ganz nach rechts geschoben → Mitte bleibt genau an der Kante x0 = 9 stehen (kein Rückfedern)
    k.zentrieren(11, 12, 1);
    k.schiebe_x += 5000; k.begrenzen();
    const [fx] = k.feldGenau(314, 195);
    expect(Math.min(fx - 9, 12 - fx, 1)).toBeCloseTo(0, 6);
    k.zoomUm(0.1, 314, 195);
    expect(k.zoom).toBe(2.2);
    k.zoomUm(10, 314, 195);
    expect(k.zoom).toBe(3);
    k.grenzeSetzen(null);
    expect(k.grenze).toBeNull();
    k.zoomUm(10, 314, 195);
    expect(k.zoom).toBe(4);
    k.zoomUm(0.01, 314, 195);
    expect(k.zoom).toBe(1);
  });

  it('test_nr13_kamerafahrt_endet_am_ziel: Fahrt nach Uhr mit kurve.weich, am Ende genau am Ziel, auch nach langer Pause', () => {
    const k = new Kamera();
    k.groesseSetzen(844, 390, 1);
    k.zoom = 2.2;
    k.zentrieren(11, 10, 2);
    expect(k.fahrtLaeuft(T0)).toBe(false);
    k.fahrtZu(9, 13, 1, 300, 150, 3, 1200, T0);
    expect(k.fahrtLaeuft(T0)).toBe(true);
    expect(k.zoom).toBeCloseTo(2.2, 6);
    expect(k.fahrtLaeuft(T0 + 600)).toBe(true);
    // cubic-bezier(.2,.9,.3,1) bei halber Zeit: x(t) = 0,5 bei t ≈ 0,689 → y ≈ 0,95 → Zoom ≈ 2,2 + 0,8 · 0,95 = 2,96
    expect(k.zoom).toBeGreaterThan(2.94);
    expect(k.zoom).toBeLessThan(2.98);
    expect(k.fahrtLaeuft(T0 + 1200)).toBe(false);
    expect(k.zoom).toBe(3);
    const [px, py] = k.mitte(9, 13);
    expect(px).toBeCloseTo(300, 6); expect(py).toBeCloseTo(150, 6);

    // App war im Hintergrund: erster Aufruf lange nach dem Ende → sofort am Ziel
    k.fahrtZu(11, 10, 2, 422, 148, null, 1200, T0 + 5000);
    expect(k.fahrtLaeuft(T0 + 99_000)).toBe(false);
    const [qx, qy] = k.mitte(11.5, 10.5);
    expect(qx).toBeCloseTo(422, 6); expect(qy).toBeCloseTo(148, 6);
    expect(k.zoom, 'zoom null = Zoom bleibt').toBe(3);
  });
});

describe('NR13 P3 Szene: Spur und „Erreicht“-Zeichen', () => {
  function aufnahme(): { X: CanvasRenderingContext2D; befehle: string[] } {
    const befehle: string[] = [];
    const zustand = new Map<PropertyKey, unknown>();
    const text = (a: unknown): string => (Array.isArray(a) ? JSON.stringify(a) : typeof a === 'object' && a !== null ? 'objekt' : String(a));
    const X = new Proxy({}, {
      get(_z, p) {
        if (zustand.has(p)) return zustand.get(p);
        return (...a: unknown[]) => {
          befehle.push(`${String(p)}(${a.map(text).join(',')})`);
          if (p === 'measureText') return { width: String(a[0]).length * 6 };
          if (p === 'createRadialGradient' || p === 'createLinearGradient') return { addColorStop: () => {} };
          return undefined;
        };
      },
      set(_z, p, v) { zustand.set(p, v); befehle.push(`${String(p)}=${text(v)}`); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { X, befehle };
  }
  const objekte = [neu('hz', 11, 10), neu('efh', 9, 13), neu('efh', 12, 14)];
  const netz = berechneNetz(objekte, [], 1); // ein Netz für alle Bilder: der Schlüssel enthält seine Nummer
  const szene = (extra: Partial<Szene>): Szene => ({
    objekte, innen: [], netz, spiel: null, auswahl_id: null, modus: 'normal', geist: null,
    verschiebe_id: null, stempel: null, jetzt_ms: 10_000, strassen: [], fluss: [], kw_anzeigen: false, ...extra,
  });
  function bild(s: Szene, reduziert = false): string[] {
    const k = new Kamera();
    k.groesseSetzen(844, 390, 1);
    k.zentrieren(11, 12, 1);
    const a = aufnahme(), m = new Maler(a.X);
    m.reduziert = reduziert;
    bodenEbeneEinrichten(null);
    zeichneSzene(m, k, s, new Effekte(), 0.016);
    return a.befehle;
  }
  const SPUR_FARBE = 'strokeStyle=#ff8a1f';
  const HAKEN_SCHEIBE = 'fillStyle=#d3f0c6';

  it('test_nr13_spur_und_haken_nur_mit_feldern: Band nur mit tutorial_band, Haken-Blase nur mit erreicht; Schlüssel und Takt folgen', () => {
    // NR20-22 P4 / DESIGN 13.17.1 B2 (V0 Teil 2c): Die Spur ist ein Band in der echten Leitungsfarbe (32er #4caf3e, 25er #d8392f,
    // katalog.ts), kein orange gestrichelter Strich mehr. Einzelheiten (Doppelrand, Pfeile, Raute) prüft tests/nr20-darstellung.
    const BAND_E1: TutorialBandFeld[] = [
      { x: 10, y: 11, typ: 'd32', aktiv: true, falsch: false, pfeil: [0, 1] },
      { x: 10, y: 12, typ: 'd32', aktiv: true, falsch: false, pfeil: null },
      { x: 9, y: 12, typ: 'd25', aktiv: false, falsch: false, pfeil: [0, 1] },
      { x: 10, y: 13, typ: 'd25', aktiv: false, falsch: false, pfeil: [0, 1] },
      { x: 10, y: 14, typ: 'd25', aktiv: false, falsch: false, pfeil: [1, 0] },
      { x: 11, y: 14, typ: 'd25', aktiv: false, falsch: false, pfeil: [1, 0] },
    ];
    const NUR_HAUS2 = BAND_E1.slice(3).map((f) => ({ ...f, aktiv: true }));
    // Farbe als #rrggbb oder rgb(a)(r,g,b…) – beides ist erlaubt, die Deckkraft darf im rgba-Wert oder in globalAlpha stehen
    const farbe = (hex: string, rgb: string) => (b: string[]): number => b.filter((x) => /^(fill|stroke)Style=/.test(x) && (x.toLowerCase().includes(hex) || new RegExp(`\\(\\s*${rgb.replace(/,/g, '\\s*,\\s*')}\\s*[,)]`).test(x))).length;
    const gruen32 = farbe('#4caf3e', '76,175,62'), rot25 = farbe('#d8392f', '216,57,47');

    const leer = bild(szene({}));
    expect(gruen32(leer), 'ohne Band keine 32er-Farbe im Bild').toBe(0);
    expect(rot25(leer), 'ohne Band keine 25er-Farbe im Bild').toBe(0);
    expect(leer.filter((b) => b === HAKEN_SCHEIBE)).toHaveLength(0);
    expect(bild(szene({ tutorial_band: [] })), 'leeres Band zeichnet nichts').toEqual(leer);

    const mitBand = bild(szene({ tutorial_band: BAND_E1 }));
    expect(gruen32(mitBand), 'Hauptleitung im Band in 32er-Farbe').toBeGreaterThan(0);
    expect(rot25(mitBand), 'Hausanschlüsse im Band in 25er-Farbe').toBeGreaterThan(0);
    expect(mitBand.filter((b) => b === SPUR_FARBE), 'keine orange Spur mehr (Token menue.farbe.spur entfällt)').toHaveLength(0);
    expect(mitBand, 'kein gestrichelter Spur-Strich 10/8').not.toContain('setLineDash([10,8])');
    expect(mitBand.filter((b) => b === HAKEN_SCHEIBE)).toHaveLength(0);
    const nurHaus2 = bild(szene({ tutorial_band: NUR_HAUS2 }));
    expect(gruen32(nurHaus2), 'nur übergebene Felder: ohne Hauptleitung-Felder keine 32er-Farbe').toBe(0);
    expect(rot25(nurHaus2)).toBeGreaterThan(0);

    const haus1 = objekte[1].id;
    const mitHaken = bild(szene({ erreicht: [{ id: haus1, seit_ms: 0 }] }));
    expect(mitHaken.filter((b) => b === HAKEN_SCHEIBE)).toHaveLength(1);
    expect(mitHaken).toContain('strokeStyle=#1f5e1a');
    expect(gruen32(mitHaken) + rot25(mitHaken), 'Haken ohne Band').toBe(0);

    // Schlüssel: Bandfelder, nächstes Feld, Zielscheibe und erreichte Häuser lösen ein neues Bild aus (P4: neue Felder im Schlüssel)
    const s0 = szenenSchluessel(szene({}));
    expect(szenenSchluessel(szene({})), 'gleiches Bild, gleicher Schlüssel').toBe(s0);
    expect(szenenSchluessel(szene({ tutorial_band: BAND_E1.slice(0, 1) }))).not.toBe(s0);
    expect(szenenSchluessel(szene({ tutorial_band: BAND_E1.slice(0, 1) }))).not.toBe(szenenSchluessel(szene({ tutorial_band: BAND_E1.slice(0, 2) })));
    expect(szenenSchluessel(szene({ tutorial_band: BAND_E1 })), 'Feld wird falsch (gestrichelte Raute)')
      .not.toBe(szenenSchluessel(szene({ tutorial_band: BAND_E1.map((f, i) => (i === 0 ? { ...f, falsch: true } : f)) })));
    expect(szenenSchluessel(szene({ naechstes_feld: [10, 11] }))).not.toBe(s0);
    expect(szenenSchluessel(szene({ naechstes_feld: [10, 11] }))).not.toBe(szenenSchluessel(szene({ naechstes_feld: [9, 12] })));
    expect(szenenSchluessel(szene({ zielscheibe: [10, 12] }))).not.toBe(s0);
    expect(szenenSchluessel(szene({ erreicht: [{ id: haus1, seit_ms: 0 }] }))).not.toBe(s0);
    expect(animationBedarf(szene({}), false)).toBe('keine');
    expect(animationBedarf(szene({ tutorial_band: BAND_E1, naechstes_feld: [10, 11] }), false), 'Band und Raute ruhen (DESIGN 13.17.1 B3)').toBe('keine');
    expect(animationBedarf(szene({ erreicht: [{ id: haus1, seit_ms: 0 }] }), false), 'Haken-Blase wippt').toBe('fluessig');
  });

  it('test_nr13_erreicht_federt: 450 ms Federn ab seit_ms, bei „Weniger Bewegung“ ohne', () => {
    const haus1 = objekte[1].id;
    const kreise = (b: string[]): string[] => b.filter((x) => x.startsWith('arc('));
    const ruhig = kreise(bild(szene({ erreicht: [{ id: haus1, seit_ms: 10_000 - 225 }] }), true));
    const federnd = kreise(bild(szene({ erreicht: [{ id: haus1, seit_ms: 10_000 - 225 }] })));
    const vorbei = kreise(bild(szene({ erreicht: [{ id: haus1, seit_ms: 10_000 - 450 }] })));
    expect(federnd).not.toEqual(ruhig);
    expect(vorbei).toEqual(ruhig);
  });
});
