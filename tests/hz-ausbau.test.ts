import { describe, expect, it } from 'vitest';
import { groesse } from '../src/core/netz';
import { laden, serialisieren } from '../src/core/speichern';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import type { Objekt } from '../src/core/typen';

const START = 1_000_000;

function spielVorAusbau() {
  const stand = neuerSpielstand(START);
  const hz = stand.objekte.find((o) => o.typ === 'hz')!;
  hz.stufe = 2;
  stand.innen[0].stufe = 2;
  stand.geld_eur = 1_000_000;
  stand.objekte = stand.objekte.filter((o) => o.typ === 'hz' || o.typ === 'huette');
  const objekt = (typ: Objekt['typ'], x: number, y: number, extra: Partial<Objekt> = {}): Objekt => {
    const o = { id: stand.naechste_id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0, ...extra };
    stand.objekte.push(o);
    return o;
  };
  const haeuser: Objekt[] = [];
  for (let y = 8; y <= 12; y++) {
    objekt('d110', 10, y);
    haeuser.push(objekt('rh', 9, y, { station: 'st_25' }));
  }
  return { spiel: new Spiel(stand, () => START), objekt, haeuser };
}

describe('Heizzentrale auf Stufe 3 ausbauen', () => {
  it('wächst nach Norden, wenn im Süden eine Leitung liegt, und versorgt dieselben Häuser', () => {
    const { spiel, objekt, haeuser } = spielVorAusbau();
    const leitung = objekt('d25', 11, 12);
    expect(spiel.hzZiele().map((ziel) => ziel.erreicht)).toEqual([true, true]);

    expect(spiel.ausbauen(spiel.hz.id).ok).toBe(true);
    expect([spiel.hz.x, spiel.hz.y, groesse(spiel.hz)]).toEqual([11, 9, 3]);
    expect(spiel.objekt(leitung.id)).toBe(leitung);
    expect(haeuser.every((haus) => spiel.netz.warm.has(haus.id))).toBe(true);

    const geladen = new Spiel(laden(serialisieren(spiel.stand), START), () => START);
    geladen.bis(geladen.hz.bau!.ende_ms);
    expect([geladen.hz.x, geladen.hz.y, geladen.hz.stufe, groesse(geladen.hz)]).toEqual([11, 9, 3, 3]);
    expect(haeuser.every((haus) => geladen.netz.warm.has(haus.id))).toBe(true);
  });

  it('lässt Gebäude, Karte und Budget bei blockierten Flächen intakt', () => {
    const { spiel, objekt } = spielVorAusbau();
    objekt('efh', 11, 12);
    objekt('efh', 11, 9);
    const vorher = serialisieren(spiel.stand);

    expect(spiel.ausbauen(spiel.hz.id)).toMatchObject({ ok: false, hinweis: expect.stringContaining('freie 3×3-Fläche') });
    expect(serialisieren(spiel.stand)).toBe(vorher);
  });
});
