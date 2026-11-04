import { defineConfig } from 'vite';
import { serviceWorker } from './tools/sw';

export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: false },
  plugins: [serviceWorker()],
});
