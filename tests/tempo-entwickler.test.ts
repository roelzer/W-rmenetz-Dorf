import { afterEach, describe, expect, it, vi } from 'vitest';

// Simon 2026-11-12: Ohne Entwicklercode gibt es höchstens „Schnell ×10“; „Vorführung ×60“ nur im Entwicklermodus.
async function tempoMitSpeicher(gespeichert?: { faktor: number; offset_ms: number }) {
  const speicher = new Map<string, string>();
  if (gespeichert) speicher.set('waermedorf-tempo-v1', JSON.stringify(gespeichert));
  vi.resetModules();
  vi.stubGlobal('localStorage', { getItem: (k: string) => speicher.get(k) ?? null, setItem: (k: string, v: string) => { speicher.set(k, v); }, removeItem: (k: string) => { speicher.delete(k); } });
  return { t: await import('../src/tempo'), speicher };
}

describe('Spieltempo und Entwicklermodus', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('ohne Entwicklercode: nur Normal und ×10 wählbar', async () => {
    const { t } = await tempoMitSpeicher();
    expect(t.tempoStufen(false).map((s) => s.faktor)).toEqual([1, 10]);
    expect(t.tempoStufen(true).map((s) => s.faktor)).toEqual([1, 10, 60]);
  });

  it('gespeichertes ×60 fällt ohne Entwicklercode auf ×10 zurück und wird so gespeichert', async () => {
    const { t, speicher } = await tempoMitSpeicher({ faktor: 60, offset_ms: 0 });
    expect(t.tempo()).toBe(60);
    t.tempoBegrenzen(false);
    expect(t.tempo()).toBe(10);
    expect(JSON.parse(speicher.get('waermedorf-tempo-v1')!).faktor).toBe(10);
  });

  it('im Entwicklermodus bleibt ×60, ×10 und Normal bleiben immer unverändert', async () => {
    const a = await tempoMitSpeicher({ faktor: 60, offset_ms: 0 });
    a.t.tempoBegrenzen(true);
    expect(a.t.tempo()).toBe(60);
    const b = await tempoMitSpeicher({ faktor: 10, offset_ms: 0 });
    b.t.tempoBegrenzen(false);
    expect(b.t.tempo()).toBe(10);
  });
});

describe('istEntwickler', () => {
  it('erkennt beide Testcodes im Spielstand', async () => {
    vi.resetModules();
    const { istEntwickler } = await import('../src/ui/einstellungen');
    expect(istEntwickler({})).toBe(false);
    expect(istEntwickler({ entwickler_kasse_gefuellt: true })).toBe(true);
    expect(istEntwickler({ entwickler_unbegrenzt: true })).toBe(true);
  });
});
