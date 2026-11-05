import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// A90 / NR12 P2 (Entscheidung E1 b): Der Startbildschirm ist ganz ruhig – nur das Logo blendet einmal ein,
// der Ladebalken läuft über transform. Bewegte SVG-Teile lassen in WebKit sonst in jedem Bild das ganze Dorf neu malen.
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

describe('A90 / NR12 P2: Startbildschirm ganz ruhig', () => {
  it('NR12 P2: Vorspann ohne bewegte SVG-Teile', () => {
    for (const klasse of ['vs-wolke', 'vs-dampf', 'vs-fluss', 'vs-rotor', 'vs-freude', 'vs-blatt', 'vs-strahlen', 'vs-bewegt']) {
      // Wortgrenze: das stehende Blatt-Zeichen der Unterzeile (vs-blattzeichen) ist kein bewegtes Teil
      expect(vorspann, klasse).not.toMatch(new RegExp(`${klasse}(?![\\w-])`));
    }
    expect(vorspann).not.toContain('bewegteEbene');
    expect(vorspann).not.toMatch(/animation-(delay|duration)/);
  });

  it('NR12 P2: im Vorspann-CSS nur die Animationen vs-plopp und vs-laden', () => {
    const abschnitt = vorspannAbschnitt();
    const werte = [...abschnitt.matchAll(/animation:([^;}]+)/g)].map((m) => m[1].trim());
    const benannt = werte.filter((w) => w !== 'none!important');
    expect(benannt).toHaveLength(2);
    expect(benannt.map((w) => w.split(/\s+/)[0]).sort()).toEqual(['vs-laden', 'vs-plopp']);
    expect([...abschnitt.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]).sort()).toEqual(['vs-laden', 'vs-plopp']);
    // Auch außerhalb des Abschnitts keine Reste der alten Bewegungen
    expect(css).not.toMatch(/vs-(wolke|dampf|fluss|rotor|freude|blatt|strahlen|bewegt|drehen|wippen)(?![\w-])/);
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
