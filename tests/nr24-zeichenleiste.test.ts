import { describe, expect, it } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { istLeitung } from '../src/core/katalog';
import { rohrVorschauText } from '../src/core/engstelle';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import { sichtbar, type El } from './hilfen/dom-attrappe';

// NR24 in der echten Zeichenleiste: Nach einem Zug steht unter der Kennzeile „Nötig hier: …“ (Text aus dem Kern) und der
// Farbknopf der nötigen Größe trägt data-noetig. Beim Radierer gibt es keine Vorschau.
const T0 = 1_000_000_000_000;
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const neu = (): Spiel => {
  const s = new Spiel(altesStartdorf(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.stand.geld_eur = 1_000_000;
  s.stand.abschnitt = { phase: 'offen', bau: null };
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
const vorschau = (u: EchteUmgebung): El | undefined => u.dom.app.querySelectorAll('p').find((p) => p.klassen().includes('vorschau') && p.isConnected);
const hilfeZu = (u: EchteUmgebung): void => { u.knoepfe().find((k) => k.isConnected && norm(k.textContent) === 'Verstanden' && sichtbar(k))?.click(); };

/** Ein freies Feld im sichtbaren Kartenteil antippen; liefert das Feld. */
function tippeFeld(u: EchteUmgebung, s: Spiel): [number, number] {
  const k = u.st.kamera;
  const canvas = u.dom.app.querySelector('canvas')!;
  for (let r = 0; r < 12; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = s.hz.x + 3 + dx, y = s.hz.y + 3 + dy;
      if (x < 0 || y < 0 || x >= 24 || y >= 24 || !s.kannPlatzieren('d25', x, y)) continue;
      const [mx, my] = k.mitte(x, y);
      if (mx < 10 || mx > k.breite - 230 || my < 10 || my > k.hoehe - 10) continue;
      const f = (k as unknown as { feld(a: number, b: number): [number, number] }).feld(mx, my);
      if (f[0] !== x || f[1] !== y) continue;
      const ev = { pointerId: 1, clientX: mx, clientY: my, pointerType: 'touch', button: 0 };
      canvas.ausloesen('pointerdown', ev);
      canvas.ausloesen('pointerup', ev);
      return [x, y];
    }
  }
  throw new Error('kein freies Feld zum Zeichnen gefunden (Testaufbau)');
}

describe('NR24 Vorschau in der Zeichenleiste', () => {
  it('vor dem ersten Zug keine Vorschau; nach dem Zug der Kern-Text, nötiger Farbknopf markiert', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      hilfeZu(u);
      expect(vorschau(u) && sichtbar(vorschau(u)!)).toBeFalsy();
      const [x, y] = tippeFeld(u, s);
      const v = s.rohrVorschau(x, y);
      expect(v).not.toBeNull();
      const erwartet = rohrVorschauText(v!, 'd25', v!.noetig_ab_stufe);
      const p = vorschau(u)!;
      expect(sichtbar(p)).toBe(true);
      expect(norm(p.textContent)).toBe(erwartet.text);
      expect(p.klassen().includes('zu-duenn')).toBe(erwartet.zu_duenn);
      expect(p.attrs['aria-live']).toBe('polite');
      const markiert = u.knoepfe().filter((k) => k.isConnected && 'data-noetig' in k.attrs).map((k) => k.attrs['data-id']);
      expect(markiert).toEqual(v!.noetig && v!.last_kw > 0 && s.freigeschaltet(v!.noetig) ? [`farbe-${v!.noetig}`] : []);
    });
  });

  it('Radierer an → keine Vorschau', async () => {
    const s = neu();
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      hilfeZu(u);
      tippeFeld(u, s);
      expect(sichtbar(vorschau(u)!)).toBe(true);
      u.knoepfe().find((k) => k.isConnected && norm(k.textContent) === 'Radierer')!.click();
      hilfeZu(u);
      const p = vorschau(u);
      expect(p && sichtbar(p)).toBeFalsy();
    });
  });

  it('Finger auf eine eingezeichnete Leitung an der Heizzentrale → „Nötig hier: …“ mit den Häusern dahinter', async () => {
    const st = neuerSpielstand(T0);
    st.objekte = st.objekte.filter((o) => !istLeitung(o.typ));
    for (const o of st.objekte) if (o.station) { delete o.station; o.ohne_station = true; }
    const s = new Spiel(st, () => T0);
    if (!s.stand.quelle_gewaehlt) s.ersteQuelleWaehlen('kessel');
    s.stand.geld_eur = 1_000_000;
    s.stand.abschnitt = { phase: 'offen', bau: null };
    for (const [x, y] of [[10, 11], [10, 12], [10, 13], [10, 14], [11, 14]] as const) expect(s.platzieren('d25', x, y).ok).toBe(true);
    s.neuBerechnen();
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      hilfeZu(u);
      const [mx, my] = u.st.kamera.mitte(10, 11);
      const f = (u.st.kamera as unknown as { feld(a: number, b: number): [number, number] }).feld(mx, my);
      expect(f).toEqual([10, 11]);
      u.dom.app.querySelector('canvas')!.ausloesen('pointerdown', { pointerId: 1, clientX: mx, clientY: my, pointerType: 'touch', button: 0 });
      const v = s.rohrVorschau(10, 11)!;
      expect(v.verbunden && v.last_kw > 0).toBe(true);
      const p = vorschau(u)!;
      expect(sichtbar(p)).toBe(true);
      expect(norm(p.textContent)).toMatch(/^Nötig hier: \d+er · \d+ kW/);
      expect(norm(p.textContent)).toBe(rohrVorschauText(v, 'd25', v.noetig_ab_stufe).text);
    });
  });
});
