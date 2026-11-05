import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Kamera } from '../src/render/kamera';
import tokens from '../design/tokens.json';

const lies = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('A1 – Handy-Bedienung (Querformat 844×390, Touch, Tippflächen ≥ 44 px)', () => {
  it('A1: alle Tippflächen in den Design-Tokens sind mindestens 44 px', () => {
    const g = tokens.groesse_px;
    expect(g.tippflaeche_min).toBeGreaterThanOrEqual(44);
    expect(g.zoomknopf).toBeGreaterThanOrEqual(44);
    expect(g.schliessen_x).toBeGreaterThanOrEqual(44);
    expect(g.rundknopf_bauen).toBeGreaterThanOrEqual(44);
    expect(g.rundknopf_besuch).toBeGreaterThanOrEqual(44);
  });

  it('A1: Karte lässt sich mit Ziehen schieben und mit Zoom vergrößern (Handy startet mit Zoom 2,2, nur Querformat)', () => {
    const k = new Kamera();
    expect(k.groesseSetzen(844, 390, 2)).toBe(true);
    expect(k.zoom).toBe(2.2);
    const vorher = k.mitte(5, 5);
    k.schiebe_x += 30; k.begrenzen();
    expect(k.mitte(5, 5)[0]).toBeCloseTo(vorher[0] + 30, 5);
    k.zoomUm(1.25, 195, 400);
    expect(k.zoom).toBeCloseTo(2.75, 5);
  });

  it('A1: Zoom bleibt zwischen 1 und 4, der Punkt unter dem Finger bleibt beim Zoomen stehen', () => {
    const k = new Kamera(); k.groesseSetzen(390, 844, 1);
    const feld = k.feldGenau(250, 300);
    k.zoomUm(1.3, 250, 300);
    const [nx, ny] = k.feldGenau(250, 300);
    expect(nx).toBeCloseTo(feld[0], 5); expect(ny).toBeCloseTo(feld[1], 5);
    for (let i = 0; i < 20; i++) k.zoomUm(2, 195, 400);
    expect(k.zoom).toBeLessThanOrEqual(4);
    for (let i = 0; i < 20; i++) k.zoomUm(0.5, 195, 400);
    expect(k.zoom).toBeGreaterThanOrEqual(1);
  });

  it('A1: Tippen trifft das richtige Feld (Umrechnung Bildschirm ↔ Feld ist umkehrbar)', () => {
    const k = new Kamera(); k.groesseSetzen(390, 844, 1);
    for (const [x, y] of [[0, 0], [3, 7], [23, 23], [11, 10]]) {
      const [px, py] = k.mitte(x, y);
      expect(k.feld(px, py)).toEqual([x, y]);
    }
  });
});

describe('A2 – isometrische Dorfansicht im Stil von „Mein Wärmedorf“', () => {
  it('A2: Animation läuft über Zeit, nicht über Bildzähler (gleiche Geschwindigkeit auf 60 und 120 Hz)', () => {
    const quellen = ['src/render/maler.ts', 'src/render/gebaeude.ts', 'src/render/szene.ts', 'src/render/effekte.ts'].map(lies).join('\n');
    expect(quellen).toContain('zeit_s');
    expect(quellen).not.toMatch(/anim\s*\+=|frame\s*\+\+|\bframeCount\b/);
  });

  it('A2: Spielgrafik nutzt Formen statt Emoji-Schrift (Mangel M7 des Prototyps)', () => {
    const quellen = ['src/render/gebaeude.ts', 'src/render/szene.ts', 'src/render/maler.ts'].map(lies).join('\n');
    expect(quellen).not.toMatch(/[\u{1F300}-\u{1FAFF}❄⚡✕★▼]/u);
  });

  it('A2: Das Gebäude-Aussehen deckt jeden Typ des Katalogs ab (nichts bleibt unsichtbar)', async () => {
    const { KATALOG } = await import('../src/core/katalog');
    const quelle = lies('src/render/gebaeude.ts');
    for (const [typ, d] of Object.entries(KATALOG)) {
      if (d.kategorie === 'innen' || d.kategorie === 'netz') continue; // Heizhaus-Quellen und Leitungen zeichnet die Szene
      const behandelt = quelle.includes(`'${typ}'`) || ['haus', 'gross'].includes(d.kategorie);
      expect(behandelt, `Kein Aussehen für ${typ}`).toBe(true);
    }
  });
});

describe('A18 – Hinweis „fiktiv“ und Einheiten', () => {
  it('A18: Der Hinweis „Alle Wärmenetze und Werte sind fiktiv“ steht in den Einstellungen', () => {
    expect(lies('src/ui/einstellungen.ts')).toContain('Alle Wärmenetze und Werte sind fiktiv');
  });

  it('A18: Wärmezahlen in der Oberfläche tragen eine Einheit (kW)', () => {
    const quelle = lies('src/ui/kontext.ts') + lies('src/ui/katalog.ts') + lies('src/ui/hud.ts');
    expect(quelle).toMatch(/braucht \$\{[^}]+\} kW/);
    expect(quelle).toContain('ct/kWh'); // A81: Geld als Wärmepreis je kWh statt €/min
    expect(quelle).toContain(' kW`');
  });
});

describe('A2 – Jede Design-Variable im Stylesheet entsteht aus den Tokens', () => {
  it('A2: alle var(--…) aus stil.css sind Tokens oder im Stylesheet selbst definiert', () => {
    const erzeugt = new Set<string>();
    const gehe = (o: Record<string, unknown>, pfad: string[]): void => {
      for (const [k, v] of Object.entries(o)) {
        if (k.startsWith('$')) continue;
        const teil = [...pfad, k.replace(/_/g, '-')];
        if (Array.isArray(v)) v.forEach((_, i) => erzeugt.add(`--${teil.join('-')}-${i}`));
        else if (v && typeof v === 'object') gehe(v as Record<string, unknown>, teil);
        else erzeugt.add(`--${teil.join('-')}`);
      }
    };
    gehe(tokens as unknown as Record<string, unknown>, []);
    const css = lies('src/ui/stil.css');
    const eigene = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const fehlend = [...new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]))].filter((n) => !erzeugt.has(n) && !eigene.has(n));
    expect(fehlend).toEqual([]);
  });
});
