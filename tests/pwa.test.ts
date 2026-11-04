import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { erzeugeServiceWorker, FESTE_DATEIEN } from '../tools/sw';

const lies = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('A16 – installierbar (PWA) und offline spielbar', () => {
  it('A16: Manifest nennt Namen, Querformat, Start-Adresse und Symbole in 192 und 512 px', () => {
    const m = JSON.parse(lies('public/manifest.webmanifest'));
    expect(m.name).toBeTruthy();
    expect(m.orientation).toBe('landscape');
    expect(m.start_url).toBeTruthy();
    const groessen = m.icons.map((i: { sizes: string }) => i.sizes);
    expect(groessen).toContain('192x192'); expect(groessen).toContain('512x512');
    for (const i of m.icons) expect(existsSync(new URL(`../public/${i.src}`, import.meta.url))).toBe(true);
  });
  it('A16: Die Seite verweist auf das Manifest und die Anwendung meldet den Service Worker an', () => {
    expect(lies('index.html')).toContain('manifest.webmanifest');
    expect(lies('src/main.ts')).toContain("serviceWorker.register('./sw.js')");
  });
  it('A16: Der Service Worker legt beim Einrichten die komplette Dateiliste des Builds ab (nicht erst beim zweiten Laden)', () => {
    const vorlage = lies('tools/sw-vorlage.js');
    expect(vorlage).toContain('c.addAll(DATEIEN)');
    const sw = erzeugeServiceWorker(vorlage, ['assets/index-abc.js', 'assets/index-abc.css', 'assets/baloo-2-latin-700-normal-x.woff2'], 'v1');
    expect(sw).not.toContain('__DATEIEN__'); expect(sw).not.toContain('__VERSION__');
    for (const d of ['assets/index-abc.js', 'assets/index-abc.css', 'assets/baloo-2-latin-700-normal-x.woff2', ...FESTE_DATEIEN]) expect(sw).toContain(JSON.stringify(d));
    expect(sw).toContain("'waermedorf-' + VERSION");
  });
  it('A16: Nach einem Build liegt sw.js mit Skript, Stil und Schriften in der Dateiliste (läuft nur, wenn dist/ existiert)', () => {
    if (!existsSync(new URL('../dist/sw.js', import.meta.url))) return;
    const sw = lies('dist/sw.js');
    const assets = readdirSync(new URL('../dist/assets', import.meta.url));
    expect(assets.some((a) => a.endsWith('.js'))).toBe(true);
    for (const a of assets) expect(sw).toContain(`assets/${a}`);
  });
});
