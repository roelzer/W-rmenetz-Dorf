// Auftrag 2026-11-11 (Tester Teil 3): Die Anleiter-Figur ist am Handy größer – die kleine Figur (schmale freie Fläche,
// kompakte Karte in Kapitel 3) und die Figur in Antipp-Schritten bei niedriger Höhe (Querformat, max-height 430 px) sind
// 96 px statt 72 px. Die Figur ragt nach oben über die Blase hinaus (unten bündig); die Karte wird dadurch NICHT höher.
// Ohne Browser prüfbar: Token, CSS-Regeln (über die Token aufgelöst) und dass der Überstand nicht in die Kartenhöhe zählt.
// Die Sichtprüfung im Browser (Bildschirmfoto 844×390) bleibt beim Designer.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import tokens from '../design/tokens.json';

const stil = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const MASS = tokens.menue.mass_px as Record<string, number>;
/** Bisherige Höhe der kleinen Figur: so viel Platz nimmt sie in der Karte weiter ein (Überstand 96 − 72 = 24 px). */
const ALT_PX = 72;
const NEU_PX = 96;
const MEDIA_NIEDRIG = '@media (orientation:landscape) and (max-height:430px)';

/** Inhalt eines Blocks ab der öffnenden Klammer nach `ab` (Klammern gezählt). */
function blockNach(css: string, ab: number): { innen: string; ende: number } {
  const auf = css.indexOf('{', ab);
  let tiefe = 0;
  for (let i = auf; i < css.length; i++) {
    if (css[i] === '{') tiefe++;
    else if (css[i] === '}' && --tiefe === 0) return { innen: css.slice(auf + 1, i), ende: i + 1 };
  }
  throw new Error('Klammer nicht geschlossen');
}

/** Regeln der obersten Ebene (ohne @-Blöcke) bzw. die @-Blöcke mit Kopf. */
function zerlege(css: string): { regeln: Array<{ sel: string[]; decl: string }>; at: Array<{ kopf: string; innen: string }> } {
  const regeln: Array<{ sel: string[]; decl: string }> = [], at: Array<{ kopf: string; innen: string }> = [];
  let i = 0;
  while (i < css.length) {
    const auf = css.indexOf('{', i);
    if (auf < 0) break;
    const kopf = css.slice(i, auf).trim();
    const { innen, ende } = blockNach(css, i);
    if (kopf.startsWith('@')) at.push({ kopf, innen });
    else regeln.push({ sel: kopf.split(',').map((s) => s.trim().replace(/\s+/g, ' ')), decl: innen });
    i = ende;
  }
  return { regeln, at };
}

/** Eigenschaften aller Regeln, deren Selektorliste genau `selektor` enthält (spätere überschreiben frühere). */
function eigenschaften(regeln: Array<{ sel: string[]; decl: string }>, selektor: string): Record<string, string> {
  const aus: Record<string, string> = {};
  for (const r of regeln.filter((x) => x.sel.includes(selektor))) {
    for (const teil of r.decl.split(';')) {
      const k = teil.indexOf(':');
      if (k > 0) aus[teil.slice(0, k).trim()] = teil.slice(k + 1).trim().replace(/\s*!important$/, '');
    }
  }
  return aus;
}

/** Löst `var(--menue-mass-px-…)` über design/tokens.json auf und rechnet einfache px-Ausdrücke (auch calc) aus. */
function px(wert: string | undefined): number {
  if (wert === undefined) return NaN;
  let w = wert.replace(/var\(--menue-mass-px-([a-z0-9-]+)\)/g, (_, n: string) => {
    const v = MASS[n.replace(/-/g, '_')];
    if (typeof v !== 'number') throw new Error(`Token menue.mass_px.${n.replace(/-/g, '_')} fehlt`);
    return `(${v})`;
  });
  w = w.replace(/calc\(/g, '(').replace(/(\d)px/g, '$1');
  if (!/^[\d\s+\-*/().]+$/.test(w)) return NaN;
  return Number(Function(`"use strict";return (${w});`)());
}

const oben = zerlege(stil);
const niedrig = oben.at.find((a) => a.kopf.replace(/\s+/g, ' ') === MEDIA_NIEDRIG);
const regelnNiedrig = niedrig ? zerlege(niedrig.innen).regeln : [];

const KLEIN = '#anleiter.figur-klein .anleiter-figur';
const HANDLUNG = '#anleiter.handlung .anleiter-figur';

/** Höhe, mit der die Figur in die Kartenhöhe eingeht: eigene Höhe plus oberer Rand (negativ = Überstand nach oben).
 *  Absolut gesetzte Figur zählt gar nicht in die Höhe. */
function hoeheInDerKarte(e: Record<string, string>): number {
  if (e.position === 'absolute') return 0;
  const rand = e['margin-top'] ?? e['margin-block-start'] ?? '0';
  return px(e.height) + px(rand);
}

describe('NR20 Anleiter-Figur am Handy 96 px (Auftrag 2026-11-11)', () => {
  // Rot, wenn das Token bei 72 bleibt oder versehentlich die große Figur (112) geändert wird.
  it('test_nr20_figur96_token: anleiter_figur_klein = 96, große Figur bleibt 112, Grenze bleibt 400', () => {
    expect(MASS.anleiter_figur_klein).toBe(NEU_PX);
    expect(MASS.anleiter_figur).toBe(112);
    expect(MASS.anleiter_figur_klein_unter).toBe(400);
  });

  // Rot, wenn die Regel für .figur-klein ein festes 72px statt des Tokens nutzt oder das Token 72 bleibt.
  it('test_nr20_figur96_css_figur_klein: #anleiter.figur-klein .anleiter-figur ist 96 × 96 px', () => {
    const e = eigenschaften(oben.regeln, KLEIN);
    expect(px(e.width), `width: ${e.width}`).toBe(NEU_PX);
    expect(px(e.height), `height: ${e.height}`).toBe(NEU_PX);
  });

  // Rot, wenn in der Media-Query für niedrige Bildschirme weiter width/height 72px steht.
  it('test_nr20_figur96_css_handlung_niedrig: in der Media-Query max-height 430px ist die Handlungs-Figur 96 × 96 px', () => {
    expect(niedrig, `Block ${MEDIA_NIEDRIG} fehlt`).toBeDefined();
    const e = { ...eigenschaften(oben.regeln, HANDLUNG), ...eigenschaften(regelnNiedrig, HANDLUNG) };
    expect(px(e.width), `width: ${e.width}`).toBe(NEU_PX);
    expect(px(e.height), `height: ${e.height}`).toBe(NEU_PX);
  });

  // Rot, wenn die Figur einfach 96 px hoch wird und die Karte mitwächst (kein negativer oberer Rand / keine Entkopplung).
  it('test_nr20_figur96_karte_nicht_hoeher_klein: kleine Figur ragt nach oben hinaus, zählt höchstens 72 px in die Kartenhöhe', () => {
    const e = eigenschaften(oben.regeln, KLEIN);
    expect(hoeheInDerKarte(e), JSON.stringify(e)).toBeLessThanOrEqual(ALT_PX);
  });

  it('test_nr20_figur96_karte_nicht_hoeher_handlung: Handlungs-Figur bei niedriger Höhe zählt höchstens 72 px in die Kartenhöhe', () => {
    const e = { ...eigenschaften(oben.regeln, HANDLUNG), ...eigenschaften(regelnNiedrig, HANDLUNG) };
    expect(hoeheInDerKarte(e), JSON.stringify(e)).toBeLessThanOrEqual(ALT_PX);
  });

  // Rot, wenn die Karte die Figur nicht mehr unten bündig ausrichtet (der Überstand ginge dann nach unten aus dem Bild).
  it('test_nr20_figur96_unten_buendig: Karte richtet die Figur unten aus, die Blase schneidet sie nicht ab', () => {
    const karte = eigenschaften(oben.regeln, '#anleiter');
    expect(karte['align-items']).toBe('flex-end');
    expect(karte.overflow ?? 'visible').toBe('visible');
    const figur = eigenschaften(oben.regeln, '.anleiter-figur');
    expect(figur['align-self'] ?? 'flex-end').toBe('flex-end');
  });
});
