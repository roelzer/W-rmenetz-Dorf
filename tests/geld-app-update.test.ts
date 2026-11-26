import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { aktualisierungPruefen } from '../src/update';

// Spielerbericht 26.11., Risiko 4 (veraltete App): Der Browser prüft den Service Worker nur beim Navigieren auf eine neue
// Fassung. Eine installierte App, die am Handy tagelang im Hintergrund bleibt und nur wieder hervorgeholt wird, navigiert
// nie – sie bliebe auf der alten Fassung. Erwartung: Bei jeder Rückkehr in die App wird nach einer neuen Fassung gefragt;
// der vorhandene Weg (skipWaiting → controllerchange → „Neue Version … Neu laden“ mit Speichern) übernimmt dann.

describe('Risiko 4: Update-Prüfung bei Rückkehr in die App', () => {
  it('fragt die Registrierung nach einer neuen Fassung', async () => {
    const update = vi.fn(async () => undefined);
    await aktualisierungPruefen({ getRegistration: async () => ({ update }) });
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('ohne Registrierung (erster Besuch, Entwicklungsserver) passiert nichts und nichts wirft', async () => {
    await expect(aktualisierungPruefen({ getRegistration: async () => undefined })).resolves.toBe(false);
  });

  it('offline: ein gescheitertes Update wird sichtbar protokolliert, nicht geworfen', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fehler = new Error('offline');
    await expect(aktualisierungPruefen({ getRegistration: async () => ({ update: async () => { throw fehler; } }) })).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith('Prüfung auf neue Version fehlgeschlagen', fehler);
    warn.mockRestore();
  });

  it('erfolgreiche Prüfung meldet true', async () => {
    await expect(aktualisierungPruefen({ getRegistration: async () => ({ update: async () => undefined }) })).resolves.toBe(true);
  });

  it('main.ts prüft bei Rückkehr in die App (Quelltext; main.ts ist ohne Browser nicht ladbar)', () => {
    const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    expect(main).toMatch(/from '\.\/update'/);
    expect(main).toMatch(/visibilitychange', \(\) => \{ if \(!document\.hidden\) void aktualisierungPruefen\(navigator\.serviceWorker\); \}/);
  });
});
