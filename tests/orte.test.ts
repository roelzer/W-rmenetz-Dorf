import { describe, expect, it } from 'vitest';
import { ORTE, ortHolen, typAusGrundflaeche } from '../src/core/orte';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG, KONSTANTEN } from '../src/core/katalog';

const T0 = 1_000_000_000_000;

describe('A21 Orte', () => {
  it('A21: Hilpoltstein, Dornhausen und Obermässing sind wählbar', () => {
    expect(ORTE.map((o) => o.name)).toEqual(['Hilpoltstein', 'Dornhausen', 'Obermässing']);
    expect(ortHolen('dornhausen').name).toBe('Dornhausen');
    expect(ortHolen('gibtesnicht').id).toBe('hilpoltstein');
  });
  it('A21: jeder Ort hat Häuser und ein Hallenbad, alles liegt auf der Karte, nichts überlappt', () => {
    for (const ort of ORTE) {
      const s = new Spiel(neuerSpielstand(T0, ort.id), () => T0);
      expect(s.stand.name).toBe(ort.name);
      expect(s.stand.ort).toBe(ort.id);
      const haeuser = s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus');
      expect(haeuser.length).toBeGreaterThanOrEqual(10);
      expect(s.stand.objekte.some((o) => o.typ === 'bad')).toBe(true);
      const N = KONSTANTEN.feldanzahl;
      for (const o of s.stand.objekte) {
        const k = KATALOG[o.typ].groesse ?? 1;
        expect(o.x >= 0 && o.y >= 0 && o.x + k <= N && o.y + k <= N).toBe(true);
      }
    }
  });
  it('A21: Ortsgebäude zählen nicht gegen die Baugrenze der Heizzentralen-Stufe', () => {
    const s = new Spiel(neuerSpielstand(T0, 'hilpoltstein'), () => T0);
    expect(s.anzahl('efh')).toBe(0);
  });
  it('A21: Ort wechseln geht nur vor der Quellenwahl', () => {
    const s = new Spiel(neuerSpielstand(T0), () => T0);
    expect(s.ortWechseln('dornhausen').ok).toBe(true);
    expect(s.stand.name).toBe('Dornhausen');
    s.ersteQuelleWaehlen('kessel');
    expect(s.ortWechseln('obermaessing').ok).toBe(false);
    expect(s.stand.name).toBe('Dornhausen');
  });
  it('A21/A25: Haustyp (und damit der geschätzte Verbrauch) folgt der Grundfläche', () => {
    expect(typAusGrundflaeche(20)).toBeNull();
    expect(typAusGrundflaeche(100)).toBe('efh');
    expect(typAusGrundflaeche(200)).toBe('rh');
    expect(typAusGrundflaeche(400)).toBe('mfh');
    expect(KATALOG.mfh.bedarf_kw!).toBeGreaterThan(KATALOG.efh.bedarf_kw!);
  });
  it('A21: solange die Gebäudedaten nicht echt sind, ist der Ort als Platzhalter gekennzeichnet', () => {
    for (const o of ORTE) if (o.platzhalter) expect(o.quelle).toBeUndefined();
    expect(ORTE.every((o) => typeof o.platzhalter === 'boolean')).toBe(true);
  });
});
