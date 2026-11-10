import { afterEach, describe, expect, it, vi } from 'vitest';
import { neu } from './hilfen';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('Moderne Dorf-Grafiken', () => {
  it('bleibt bei Ladefehlern spielbar und verwendet den bisherigen Renderer', async () => {
    vi.stubGlobal('Image', class { onerror?: () => void; set src(_v: string) { this.onerror?.(); } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const g = await import('../src/render/grafiken');
    await g.grafikenLaden();
    const drawImage = vi.fn();
    expect(g.grafikZeichnen({ drawImage } as unknown as CanvasRenderingContext2D, 'haus', 10, 20, 100)).toBe(false);
    expect(drawImage).not.toHaveBeenCalled();
    expect(g.grafikHoehe(neu('hz', 10, 10))).toBeUndefined();
    warn.mockRestore();
  });

  it('lädt nur einmal und erhält Proportionen und Transparenz beim Zoomen', async () => {
    const geladen = vi.fn();
    vi.stubGlobal('Image', class { onload?: () => void; set src(_v: string) { geladen(); this.onload?.(); } });
    const g = await import('../src/render/grafiken');
    await Promise.all([g.grafikenLaden(), g.grafikenLaden()]);
    expect(geladen).toHaveBeenCalledTimes(1);
    const drawImage = vi.fn(), x = { drawImage, globalAlpha: 0.25 } as unknown as CanvasRenderingContext2D;
    g.grafikZeichnen(x, 'haus', 100, 200, 80);
    g.grafikZeichnen(x, 'haus', 100, 200, 160);
    const a = drawImage.mock.calls[0], b = drawImage.mock.calls[1];
    expect(a[7] / a[8]).toBeCloseTo(555 / 540);
    expect(b[8]).toBeCloseTo(a[8] * 2);
    expect(a[6] + a[8]).toBeCloseTo(200 + 80 * 0.24);
    expect(x.globalAlpha).toBe(0.25);
    expect(g.grafikHoehe(neu('hz', 10, 10, { stufe: 3 }))).toBeGreaterThan(g.grafikHoehe(neu('hz', 10, 10))!);
  });
});
