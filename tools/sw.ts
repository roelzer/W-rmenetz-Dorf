import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** Dateien aus public/, die nicht im Bündel stehen, aber offline da sein müssen. */
export const FESTE_DATEIEN = [
  './', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'art/heatville-modern-v1.webp',
  'figuren/christian.webp', 'figuren/laura.webp', 'figuren/manfred.webp', 'figuren/philipp.webp',
  'figuren/sebastian.webp', 'figuren/simon.webp',
];

/** Setzt Version und Dateiliste in die Vorlage ein. Rein und testbar. */
export function erzeugeServiceWorker(vorlage: string, dateien: string[], version: string): string {
  const liste = [...new Set([...FESTE_DATEIEN, ...dateien])].sort();
  return vorlage.replace('__VERSION__', version).replace('__DATEIEN__', JSON.stringify(liste));
}

/** Vite-Plugin: schreibt beim Build `sw.js` mit allen erzeugten Dateien. */
export function serviceWorker(): Plugin {
  const version = Date.now().toString(36);
  return {
    name: 'waermedorf-service-worker',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { name: 'heatville-build', content: version }, injectTo: 'head' }];
    },
    generateBundle(_o, bundle) {
      const vorlage = readFileSync(new URL('./sw-vorlage.js', import.meta.url), 'utf8');
      const dateien = Object.keys(bundle).filter((n) => !n.endsWith('.map'));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: erzeugeServiceWorker(vorlage, dateien, version) });
    },
  };
}
