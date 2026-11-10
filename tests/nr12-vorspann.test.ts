import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { nachtdorfSvg, waermeSvg } from '../src/ui/vorspann-dorf';

const vorspann = readFileSync(new URL('../src/ui/vorspann.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/ui/stil.css', import.meta.url), 'utf8');

/** Vorspann-Abschnitt von stil.css: vom Kommentar „A63/A64“ bis zum nächsten Abschnittskommentar. */
function vorspannAbschnitt(): string {
  const start = css.indexOf('/* A63/A64: Logo, Schriftzug und Ladebildschirm */');
  expect(start).toBeGreaterThanOrEqual(0);
  const ende = css.indexOf('/* A83', start);
  expect(ende).toBeGreaterThan(start);
  return css.slice(start, ende);
}

/** Inhalt des ersten Regelblocks, dessen Selektor genau `selektor` ist. */
function regel(text: string, selektor: string): string {
  const m = new RegExp(`(?:^|[}\\n])${selektor.replace(/[.#*]/g, (z) => `\\${z}`)}\\{([^}]*)\\}`).exec(text);
  expect(m, `Regel ${selektor} fehlt`).not.toBeNull();
  return m![1];
}

describe('Vorspann mit ruhender Dorfkulisse und getrennter Animation', () => {
  it('Die Kulisse bleibt statisch und die Wärmeeffekte liegen in einer eigenen SVG-Ebene', () => {
    expect(nachtdorfSvg()).not.toMatch(/<animate|vs-impuls|vs-licht/);
    expect(waermeSvg(true).match(/class="vs-impuls"/g)).toHaveLength(6);
    expect(waermeSvg(true).match(/class="vs-licht"/g)).toHaveLength(5);
    const ohneBewegung = waermeSvg(false);
    expect(ohneBewegung).not.toMatch(/vs-impuls|vs-licht/);
    expect(ohneBewegung).toContain('#ffce7c');
    expect(vorspann).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
  });

  it('Animiert nur Titel, Ladebalken, Wärmeimpuls und Fensterlicht', () => {
    const abschnitt = vorspannAbschnitt();
    const namen = [...abschnitt.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
    expect(namen.sort()).toEqual(['vs-impuls', 'vs-laden', 'vs-licht', 'vs-plopp']);
    expect(abschnitt).toContain('#vorspann.still *{animation:none!important}');
  });

  it('NR12 P2: Vorspann-CSS ohne filter', () => {
    expect(vorspannAbschnitt()).not.toMatch(/(^|[;{])\s*filter\s*:/);
  });

  it('NR12 P2: Ausblenden nur über Deckkraft', () => {
    const abschnitt = vorspannAbschnitt();
    const aus = regel(abschnitt, '#vorspann.aus');
    expect(aus).toContain('opacity:0');
    expect(aus).not.toContain('transform');
    const grund = regel(abschnitt, '#vorspann');
    expect(grund).toMatch(/transition:opacity \.5s(;|$)/);
    expect(grund).not.toContain('transform');
  });

  it('NR12 P2: Ladebalken weiter über transform, will-change nur dort', () => {
    const abschnitt = vorspannAbschnitt();
    expect(abschnitt).toContain('@keyframes vs-laden{to{transform:scaleX(1)}}');
    expect(regel(abschnitt, '.vs-fuellung')).toContain('will-change:transform');
    expect(abschnitt.match(/will-change/g)).toHaveLength(1);
  });

  it('NR12 P2: vorspannZeigen behält seine Signatur, Logo blendet einmal ein', () => {
    expect(vorspann).toContain('export function vorspannZeigen(weniger_bewegung: boolean, tippNr = Math.floor(Math.random() * TIPPS.length)): void');
    expect(regel(vorspannAbschnitt(), '.vs-kopf')).toMatch(/animation:vs-plopp [^;]* both(;|$)/);
    expect(vorspann).not.toMatch(/innerHTML/);
  });
});
