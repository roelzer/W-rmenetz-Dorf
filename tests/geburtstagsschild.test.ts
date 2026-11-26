// Geburtstagsschild für Phili (Simon 2026-11-26: „bau das schild ein“, Vorlage docs/entwuerfe/geburtstagsschild-entwurf.html).
// Regeln aus dem Auftrag: erscheint nur am 26.11.2026 nach lokalem Gerätedatum; Prüfung als reine Funktion im Kern mit Datum von
// außen; ✕ schließt es für die Sitzung (kein Spielstand, kein Speicher), ein Neustart am selben Tag zeigt es wieder;
// geschlossen blockiert es nichts; bei „Weniger Bewegung“ keine Animation; Text an genau einer Stelle; Farben nur aus tokens.json.
// Erwartete Farbwerte von Hand aus dem Entwurf abgeschrieben (Stand Commit fda2d2b).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tokens from '../design/tokens.json';
import { geburtstagsschildAktiv } from '../src/core/geburtstag';
import { domAttrappe, sichtbar, sichtbarerText, type DomAttrappe, type El } from './hilfen/dom-attrappe';

const lokal = (j: number, m: number, t: number, h = 0, min = 0, s = 0, ms = 0): Date => new Date(j, m - 1, t, h, min, s, ms);

describe('geburtstagsschildAktiv – nur am 26.11.2026 (lokales Datum)', () => {
  // Fehler, die rot machen: falscher Monat (getMonth ist 0-basiert: 11 statt 10), UTC statt Ortszeit, Jahr nicht geprüft,
  // Vergleich mit < / > statt Gleichheit des Kalendertags.
  it('26.11.2026 ab 00:00:00,000 bis 23:59:59,999 aktiv', () => {
    expect(geburtstagsschildAktiv(lokal(2026, 11, 26, 0, 0, 0, 0))).toBe(true);
    expect(geburtstagsschildAktiv(lokal(2026, 11, 26, 12, 30))).toBe(true);
    expect(geburtstagsschildAktiv(lokal(2026, 11, 26, 23, 59, 59, 999))).toBe(true);
  });
  it('25.11.2026 bis zur letzten Millisekunde nicht aktiv', () => {
    expect(geburtstagsschildAktiv(lokal(2026, 11, 25, 12))).toBe(false);
    expect(geburtstagsschildAktiv(lokal(2026, 11, 25, 23, 59, 59, 999))).toBe(false);
  });
  it('27.11.2026 ab Mitternacht nicht aktiv', () => {
    expect(geburtstagsschildAktiv(lokal(2026, 11, 27, 0, 0, 0, 0))).toBe(false);
    expect(geburtstagsschildAktiv(lokal(2026, 11, 27, 12))).toBe(false);
  });
  it('gleicher Tag in anderem Monat oder Jahr nicht aktiv', () => {
    expect(geburtstagsschildAktiv(lokal(2026, 10, 26))).toBe(false);
    expect(geburtstagsschildAktiv(lokal(2026, 12, 26))).toBe(false);
    expect(geburtstagsschildAktiv(lokal(2025, 11, 26))).toBe(false);
    expect(geburtstagsschildAktiv(lokal(2027, 11, 26))).toBe(false);
  });
  it('ungültiges Datum nicht aktiv', () => {
    expect(geburtstagsschildAktiv(new Date(Number.NaN))).toBe(false);
  });
});

type Modul = typeof import('../src/ui/geburtstagsschild');

describe('Geburtstagsschild in der Oberfläche', () => {
  let dom: DomAttrappe;
  let reduziert = false;
  let speicherZugriffe: string[];
  const speicher = (name: string) => new Proxy({}, { get: (_t, k) => { speicherZugriffe.push(`${name}.${String(k)}`); return () => null; } });
  /** Frisches Modul je Aufruf = neuer Seitenstart (Sitzung). */
  const laden = async (): Promise<Modul> => { vi.resetModules(); return import('../src/ui/geburtstagsschild'); };
  const schild = (): El | null => dom.body.querySelector('.geburtstagsschild');

  beforeEach(() => {
    dom = domAttrappe();
    reduziert = false;
    speicherZugriffe = [];
    vi.stubGlobal('document', dom.doc);
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('prefers-reduced-motion') && reduziert, media: q }));
    vi.stubGlobal('localStorage', speicher('localStorage'));
    vi.stubGlobal('sessionStorage', speicher('sessionStorage'));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  // Fehler: Schild hängt nicht im Dokument, Text fehlt oder Zeilen in falscher Reihenfolge, Zierde wird vorgelesen/mitgezählt.
  it('am 26.11.2026 erscheint es mit dem Text in drei Zeilen', async () => {
    const m = await laden();
    const el = m.geburtstagsschildZeigen(lokal(2026, 11, 26, 9), false) as unknown as El;
    expect(el).not.toBeNull();
    expect(sichtbar(schild()!)).toBe(true);
    const zeilen = schild()!.querySelectorAll('.gs-zeile').map((z) => sichtbarerText(z).replace(/\s+/g, ' ').trim());
    expect(zeilen).toEqual(['Alles Gute zum', '9. Geburtstag,', 'Phili!']);
    // Außer den drei Zeilen steht nur das ✕ als sichtbarer Text auf dem Schild.
    expect(sichtbarerText(schild()!).replace(/\s+/g, '')).toBe('✕AllesGutezum9.Geburtstag,Phili!');
    expect(schild()!.querySelector('.gs-schild')!.attrs['aria-label']).toBe('Alles Gute zum 9. Geburtstag, Phili!');
  });

  it('am 25.11. und 27.11.2026 erscheint nichts', async () => {
    const m = await laden();
    expect(m.geburtstagsschildZeigen(lokal(2026, 11, 25, 23, 59, 59, 999), false)).toBeNull();
    expect(m.geburtstagsschildZeigen(lokal(2026, 11, 27, 0, 0, 0, 0), false)).toBeNull();
    expect(schild()).toBeNull();
  });

  // Fehler: ✕ fehlt, ist kein Knopf, schließt nicht oder lässt eine (unsichtbare) Fläche zurück, die Tipps abfängt.
  it('✕ schließt das Schild und entfernt es ganz aus dem Dokument', async () => {
    const m = await laden();
    m.geburtstagsschildZeigen(lokal(2026, 11, 26, 9), false);
    const x = schild()!.querySelector('button.gs-schliessen')!;
    expect(x.attrs.type).toBe('button');
    expect(x.attrs['aria-label']).toBe('Geburtstagsschild schließen');
    expect(sichtbarerText(x)).toBe('✕');
    x.click();
    expect(schild()).toBeNull();
    expect(dom.body.nachfahren.some((e) => e.klassen().some((k) => k.startsWith('gs-') || k === 'geburtstagsschild'))).toBe(false);
  });

  // Fehler: Schließen wird gespeichert (dann fehlt es beim Neustart) oder das Schild liest/schreibt einen Spielstand.
  it('kein Speicherzugriff; nach Neustart am selben Tag wieder da', async () => {
    let m = await laden();
    m.geburtstagsschildZeigen(lokal(2026, 11, 26, 9), false);
    schild()!.querySelector('button.gs-schliessen')!.click();
    expect(schild()).toBeNull();
    dom = domAttrappe();
    vi.stubGlobal('document', dom.doc);
    m = await laden();
    m.geburtstagsschildZeigen(lokal(2026, 11, 26, 18), false);
    expect(schild()).not.toBeNull();
    expect(speicherZugriffe).toEqual([]);
  });

  // Fehler: Einstellung „Weniger Bewegung“ oder Systemvorgabe wird nicht beachtet.
  it('bei weniger Bewegung (Einstellung oder System) trägt das Schild die Klasse „ruhig“, sonst nicht', async () => {
    const m = await laden();
    m.geburtstagsschildZeigen(lokal(2026, 11, 26, 9), false);
    expect(schild()!.classList.contains('ruhig')).toBe(false);
    schild()!.remove();
    m.geburtstagsschildZeigen(lokal(2026, 11, 26, 9), true);
    expect(schild()!.classList.contains('ruhig')).toBe(true);
    schild()!.remove();
    reduziert = true;
    m.geburtstagsschildZeigen(lokal(2026, 11, 26, 9), false);
    expect(schild()!.classList.contains('ruhig')).toBe(true);
  });
});

/** CSS-Regeln (Selektor, Inhalt) aus stil.css, auch innerhalb von @media; Kommentare entfernt. */
function regeln(css: string): Array<{ sel: string; inhalt: string; media: string }> {
  const ohne = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Array<{ sel: string; inhalt: string; media: string }> = [];
  const re = /(@media[^{]*)\{((?:[^{}]*\{[^{}]*\})*)\s*\}|([^{}@]+)\{([^{}]*)\}/g;
  for (const m of ohne.matchAll(re)) {
    if (m[1]) for (const r of m[2].matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push({ sel: r[1].trim(), inhalt: r[2], media: m[1].trim() });
    else out.push({ sel: m[3].trim(), inhalt: m[4], media: '' });
  }
  return out;
}

describe('Geburtstagsschild – Gestaltung und Regeln im Code', () => {
  const css = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');
  const gs = regeln(css).filter((r) => /\.(geburtstagsschild|gs-)/.test(r.sel));

  it('es gibt Stilregeln für das Schild', () => expect(gs.length).toBeGreaterThan(3));

  // Fehler: eine Animation läuft auch bei „ruhig“, bei der Einstellung „Weniger Bewegung“ oder bei der Systemvorgabe.
  it('Animation nur ohne „ruhig“; abgeschaltet über .weniger-bewegung und prefers-reduced-motion', () => {
    const animiert = gs.filter((r) => /(^|;)\s*animation\s*:(?!\s*none)/.test(r.inhalt));
    expect(animiert.length).toBeGreaterThan(0);
    for (const r of animiert) {
      expect(r.media, r.sel).toBe('');
      for (const teil of r.sel.split(',')) expect(teil, teil).toContain('.geburtstagsschild:not(.ruhig)');
    }
    const aus = gs.filter((r) => /animation\s*:\s*none/.test(r.inhalt));
    expect(aus.some((r) => r.media === '' && r.sel.split(',').some((s) => s.trim().startsWith('.weniger-bewegung .geburtstagsschild')))).toBe(true);
    expect(aus.some((r) => /prefers-reduced-motion\s*:\s*reduce/.test(r.media))).toBe(true);
  });

  // Fehler: ✕ kleiner als 44 px, Schild nicht ~78 % breit, Schild nicht über der Karte, Ebene fängt Tipps neben dem Schild ab.
  it('✕ 44 × 44 px, Schild 78 % breit und leicht schräg, Ebene lässt Tipps neben dem Schild durch', () => {
    const x = gs.find((r) => r.sel === '.gs-schliessen')!;
    expect(x.inhalt).toMatch(/width:var\(--groesse-px-schliessen-x\)/);
    expect(x.inhalt).toMatch(/height:var\(--groesse-px-schliessen-x\)/);
    expect(tokens.groesse_px.schliessen_x).toBe(44);
    const s = gs.find((r) => r.sel === '.gs-schild')!;
    expect(s.inhalt).toMatch(/width:78%/);
    expect(s.inhalt).toMatch(/rotate\(-2deg\)/);
    expect(s.inhalt).toMatch(/pointer-events:auto/);
    const ebene = gs.find((r) => r.sel === '.geburtstagsschild')!;
    expect(ebene.inhalt).toMatch(/position:fixed/);
    expect(ebene.inhalt).toMatch(/pointer-events:none/);
  });

  // Fehler: Im Hochformat verdeckt das Schild (Ebene 95) den Dreh-Hinweis (#drehen, Ebene 10) – gleiche Bedingung wie dort.
  it('im Hochformat mit Dreh-Hinweis ist das Schild ausgeblendet', () => {
    const r = gs.find((x) => x.media.replace(/\s+/g, ' ') === '@media (orientation:portrait) and (max-width:600px)' && x.sel === '.geburtstagsschild');
    expect(r?.inhalt).toMatch(/display:none/);
  });

  // Fehler: Farbe als Literal in CSS oder Modul statt aus tokens.json.
  it('keine Farbliterale in den Schild-Regeln und im Modul', () => {
    for (const r of gs) {
      expect(r.inhalt, r.sel).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(r.inhalt, r.sel).not.toMatch(/rgba?\(/);
    }
    const modul = readFileSync(new URL('../src/ui/geburtstagsschild.ts', import.meta.url), 'utf8');
    expect(modul).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(modul).not.toMatch(/rgba?\(/);
  });

  // Fehler: Token fehlt oder hat nicht den Wert aus dem Entwurf.
  it('Farb-Tokens aus dem Entwurf in design/tokens.json', () => {
    const g = (tokens.farbe as unknown as Record<string, Record<string, unknown>>).geburtstag;
    expect(g).toEqual({
      schild_oben: '#ffe27a', schild_unten: '#ffc83d', rand: '#d9461f', rand_tief: '#a8321a', text: '#7a1f10',
      glanz: 'rgba(255,255,255,0.53)', schatten: 'rgba(0,0,0,0.6)', knopf: '#ffffff', knopf_schatten: 'rgba(0,0,0,0.44)',
      konfetti: ['#e5484d', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b'],
    });
    expect((tokens.zeit_ms as Record<string, number>).geburtstag_schweben_zyklus).toBe(3000);
  });

  // Fehler: der Schildtext steht doppelt (z. B. in main.ts und im Modul) – dann driftet er bei einer Änderung auseinander.
  it('Text „Phili!“ und „Geburtstag,“ an genau einer Stelle in src', () => {
    const dateien = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? dateien(p) : [p]; });
    const treffer = (wort: string) => dateien('src').flatMap((f) => (readFileSync(f, 'utf8').match(new RegExp(wort, 'g')) ?? []).map(() => f));
    expect(treffer('Phili!')).toEqual([join('src', 'ui', 'geburtstagsschild.ts')]);
    expect(treffer('Geburtstag,')).toEqual([join('src', 'ui', 'geburtstagsschild.ts')]);
  });

  // Fehler: Schild ist gebaut, aber nicht eingehängt, oder main.ts prüft ein festes statt des Gerätedatums.
  it('main.ts hängt das Schild mit dem aktuellen Gerätedatum und der Bewegungs-Einstellung ein', () => {
    const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(main).toMatch(/geburtstagsschildZeigen\(new Date\(\), einstellungen\.weniger_bewegung\)/);
  });
});
