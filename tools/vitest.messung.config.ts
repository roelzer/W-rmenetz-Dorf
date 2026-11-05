import { defineConfig } from 'vitest/config';

// Laufzeitmessungen (A91): nicht Teil von `npm test`, Aufruf `npx vitest run --config tools/vitest.messung.config.ts`.
export default defineConfig({
  test: {
    include: ['tools/**/*.messung.ts'],
    environment: 'node',
  },
});
