import { expect, it, vi } from 'vitest';
import { Maler } from '../src/render/maler';

it('zeigt vor dem Giebel beide Dachhälften und nutzt auch beim Querfirst denselben Umriss', () => {
  const m = new Maler({ beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} } as unknown as CanvasRenderingContext2D);
  const flaeche = vi.spyOn(m, 'flaeche').mockImplementation(() => {});
  const umriss = vi.spyOn(m, 'silhouette').mockImplementation(() => {});
  for (const quer of [false, true]) {
    const winkel = quer ? -Math.PI / 4 : Math.PI / 4;
    m.dreh_cos = Math.cos(winkel);
    m.dreh_sin = Math.sin(winkel);
    const quader = m.quader(50, 50, 1, 30, '#fff', false);
    flaeche.mockClear();
    m.quaderUmriss(50, 50, 1, 30, 20, quer);
    const { P1, P2 } = m.dach(quader, 20, '#553333', quer);
    expect(flaeche.mock.calls.map(([punkte]) => punkte.length)).toEqual([3, 4, 4]);
    expect(umriss.mock.lastCall?.[0].slice(-2)).toEqual([P1, P2]);
  }
});
