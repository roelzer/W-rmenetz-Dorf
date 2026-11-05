import { defineConfig } from 'vite';
import { serviceWorker } from './tools/sw';
import { readFileSync } from 'node:fs';

// A83: Versionsnummer für Tester (Paketversion + Baudatum)
const paket = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
const SPIELVERSION = `${paket.version} · ${new Date().toISOString().slice(0, 10)}`;

export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: false },
  plugins: [serviceWorker()],
  define: { __SPIELVERSION__: JSON.stringify(SPIELVERSION) },
});
