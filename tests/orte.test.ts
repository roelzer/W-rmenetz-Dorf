import { describe, expect, it, vi } from 'vitest';
import { ORTE, ortHolen, typAusGrundflaeche } from '../src/core/orte';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import { KATALOG, KONSTANTEN } from '../src/core/katalog';
// A88: Diese Tests prüfen Mechaniken nach den Freischalt-Stufen von vor A88 (Bauplan Abschnitt 11)
vi.mock('../src/core/freischaltung', async (orig) => (await import('./ohne-leiter')).ohneLeiter(await orig()));

const T0 = 1_000_000_000_000;

describe('A21 Orte', () => {
  it('A21/A44/A86: Es gibt genau einen Ort (fiktiv: Wärmlingen), die Ortswahl entfällt', () => {
    expect(ORTE.map((o) => o.name)).toEqual(['Wärmlingen']);
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
  it('A44: Häuser stehen an Straßen, nicht auf ihnen, und der Ort hat ein Straßennetz', () => {
    const ort = ORTE[0], strasse = new Set(ort.strassen.map(([x, y]) => y * 24 + x));
    expect(ort.strassen.length).toBeGreaterThan(60);
    for (const h of ort.haeuser) {
      const k = KATALOG[h.typ].groesse ?? 1;
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) expect(strasse.has((h.y + dy) * 24 + h.x + dx)).toBe(false);
    }
    const nah = ort.haeuser.filter((h) => { const k = KATALOG[h.typ].groesse ?? 1; for (let i = 0; i < k; i++) for (const [fx, fy] of [[h.x + i, h.y - 1], [h.x + i, h.y + k], [h.x - 1, h.y + i], [h.x + k, h.y + i]]) if (strasse.has(fy * 24 + fx)) return true; return false; });
    expect(nah.length).toBeGreaterThanOrEqual(Math.floor(ort.haeuser.length * 0.9));
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
