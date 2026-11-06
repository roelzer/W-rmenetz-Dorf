import { describe, expect, it } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { istLeitung, KATALOG, KONSTANTEN, UPGRADES, type TypId } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';
import { kontextKarte } from './hilfen/kontext-attrappe';
import { gesperrt } from './hilfen/gesperrt';

// A88 – Testlücken aus dem Review A88 P2 (K1, K3, K4). Eigene Datei, weil tests/a88-freischalt-leiter.test.ts als bestehender
// Test gesperrt ist; die Kartenhilfe kommt aus tests/hilfen/kontext-attrappe.ts (echtes Kernmodul, winzige DOM-Nachbildung ohne Browser).

const T0 = 1_000_000_000_000;
const neu = (stufe = 1) => {
  const s = new Spiel(altesStartdorf(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  return s;
};
const lege = (s: Spiel, typ: TypId, x: number, y: number): Objekt => {
  const o: Objekt = { id: s.stand.naechste_id++, typ, x, y, stufe: 1, bau: null, kasse_eur: 0 };
  s.stand.objekte.push(o); return o;
};
const startHaeuser = (s: Spiel) => s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.station);

type Knopf = { text: string; aus: boolean };
/** Kontextkarte eines Objekts aufbauen (gemeinsame Hilfe tests/hilfen/kontext-attrappe.ts); liefert Text und Knöpfe. */
async function karte(s: Spiel, o: Objekt): Promise<{ text: string; knoepfe: Knopf[] }> {
  const { a, c } = await kontextKarte(s, o, T0);
  const knoepfe = a.alle(c).filter((e) => e.tag === 'button').map((e) => ({ text: a.text(e), aus: gesperrt(e) }));
  return { text: a.text(c), knoepfe };
}
const mit = (k: Knopf[], anfang: string) => k.filter((x) => x.text.startsWith(anfang));

describe('A88 Review P2 – Testlücken', () => {
  it('A88 (Review P2, K1): voll ausgebautes Haus aus altem Stand auf Stufe 1 – kein gesperrter Knopf „Helfer beauftragen“', async () => {
    const s = neu(1), h = startHaeuser(s)[0];
    h.upgrade = UPGRADES.length;
    const k = await karte(s, h);
    expect(k.knoepfe.filter((x) => x.text.includes('beauftragen'))).toEqual([]);
    expect(k.text).toContain('Alle Upgrades erledigt.');
  });

  it('A88 (Review P2, K3): Gebautes bleibt – alte 50er trägt weiter, alter Pelletkessel liefert weiter (Stufe 1)', () => {
    const s = neu(1);
    // Start-40er an der Heizzentrale (10|11) wird zur 50er aus einem alten Stand; sie speist die Strecke zu beiden Starthäusern.
    s.stand.objekte.find((o) => istLeitung(o.typ) && o.x === 10 && o.y === 11)!.typ = 'd50';
    s.stand.innen.push({ typ: 'pellet', stufe: 1, bau: null });
    s.neuBerechnen();
    const feld = 11 * KONSTANTEN.feldanzahl + 10;
    expect(s.netz.tiefe.get(feld)).toBe(1);
    expect(s.netz.last_kw.get(feld)).toBe(20); // zwei Starthäuser à 10 kW hängen dahinter
    expect(s.netz.kapazitaet_ok.get(feld)).toBe(true);
    expect(startHaeuser(s).every((o) => s.netz.warm.has(o.id))).toBe(true);
    // Hackschnitzelkessel Stufe 1 = 60 kW, Pelletkessel Stufe 1 = 40 kW (katalog.ts) → 100 kW Erzeugerleistung
    expect(s.netz.verfuegbar_kw).toBe(100);
  });

  it('A88 (Review P2, K4): Leitungskarte zeigt „Dickere“ nur, wenn es eine dickere gesperrte Leitung gibt', async () => {
    const s = neu(2);
    // NR18-P0 (4.20): geprüft im offenen Bauabschnitt; „Ersetzen: …“ (statt „Tauschen: …“) nur für dickere, freigeschaltete Leitungen
    // (rot bis NR18-P3).
    s.stand.abschnitt = { phase: 'offen', bau: null };
    // 110er ist die dickste Leitung (LEITUNGEN in katalog.ts): auf Stufe 2 sind 75er/90er/110er gesperrt, aber keine ist dicker.
    const k110 = await karte(s, lege(s, 'd110', 3, 3));
    expect(mit(k110.knoepfe, 'Dickere')).toEqual([]);
    expect(mit(k110.knoepfe, 'Ersetzen:')).toEqual([]); // nichts ist dicker als die 110er
    // 90er auf Stufe 2: die 110er ist dicker und erst ab Stufe 3 frei.
    const k90 = await karte(s, lege(s, 'd90', 5, 3));
    expect(mit(k90.knoepfe, 'Dickere')).toEqual([expect.objectContaining({ text: 'Dickereab Heizzentrale Stufe 3', aus: true })]);
    expect(mit(k90.knoepfe, 'Ersetzen:')).toEqual([]); // dicker ist nur die gesperrte 110er
    // 40er auf Stufe 2: dicker und frei sind 50er und 63er.
    const k40 = await karte(s, lege(s, 'd40', 7, 3));
    expect(mit(k40.knoepfe, 'Ersetzen:').map((k) => k.text.replace(/[\d.]+\s€$/, ''))).toEqual(['Ersetzen: 50er-Leitung', 'Ersetzen: 63er-Leitung']);
    expect(mit(k40.knoepfe, 'Tauschen:')).toEqual([]);
  });
});
