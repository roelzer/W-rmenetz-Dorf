import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// NR27 Tester-Modus „pruefen“ (2026-11-23), Schwerpunkt 1: alte Spielstände (vor NR27, eingefroren in tests/referenz/nr27)
// auf Heizzentrale Stufe 1, 5 und 6 laden. Anforderung NR27 (g) „alte Spielstände laden ohne Verlust“ und (f)/(AE-NR27-8)
// „Häuser hinter der Bahn entstehen erst durch die Querung“. Erwartungen aus Lastenheft/Bauplan, nicht aus dem Code.
//
// Welche Fehler machen diese Tests rot?
// - Laden/Konstruktor legt das Nordviertel schon an (z. B. nordviertelAnlegen im Konstruktor ohne Querung-Prüfung).
// - Laden verschiebt/entfernt Objekte (karteAnpassen o. ä. hält die Nordzone für „Straße/Fluss“ oder y-Wächter falsch).
// - Das Fertigwerden des alten Bauabschnitts (ohne Bahnfeld) setzt mit_querung oder erschließt das Viertel.
// - Ein alter Stand auf Stufe < 6 kann die Bahn queren; auf Stufe 6 nicht.

import { KONSTANTEN } from '../src/core/katalog';
import { nordKulisse, NORD_PLAN } from '../src/core/nordviertel';
import { Spiel } from '../src/core/spiel';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import type { Objekt, Spielstand } from '../src/core/typen';

const DATEIEN = ['altstand-stufe6-layout3.json', 'altstand-mitten-im-bau.json'] as const;
const STUFEN = [1, 5, 6] as const;

function roh(datei: string): string {
  return readFileSync(new URL(`./referenz/nr27/${datei}`, import.meta.url), 'utf8');
}
/** Eingefrorener Stand, Heizzentrale auf `stufe` gesetzt (nur das eine Feld; sonst unverändert). */
function altText(datei: string, stufe: number): { text: string; d: Spielstand } {
  const d = JSON.parse(roh(datei)) as Spielstand;
  d.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  return { text: JSON.stringify(d), d };
}
const ohneFluechtiges = (o: Objekt): Partial<Objekt> => { const { _pop: _p, ...rest } = o as Objekt & { _pop?: number }; return rest; };

describe('NR27 pruefen: alte Stände laden auf Stufe 1, 5, 6', () => {
  for (const datei of DATEIEN) for (const stufe of STUFEN) {
    it(`test_nr27_g_${datei}_stufe${stufe}: Befund ok, alle Objekte gleich, kein Objekt im Norden, Kulisse sichtbar`, () => {
      const { text, d } = altText(datei, stufe);
      const { befund, stand } = ladenMitBefund(text, d.zuletzt_ms);
      expect(befund).toBe('ok');
      const sp = new Spiel(stand, () => d.zuletzt_ms);
      // Jedes alte Objekt bleibt unverändert. Einzige erlaubte Ergänzung: Stufe 6 ohne Neubaugebiet (künstlich hochgesetzter
      // Stand „mitten im Bau“) legt wie vor NR27 das Neubaugebiet Süd an – das sind neue Häuser im Süden (y ≥ 24), nie im Norden.
      const alt = new Map(d.objekte.map((o) => [o.id, ohneFluechtiges(o)]));
      for (const [id, o] of alt) expect(ohneFluechtiges(sp.objekt(id)!), `Objekt ${id}`).toEqual(o);
      const neu = sp.stand.objekte.filter((o) => !alt.has(o.id));
      if (d.neubaugebiet || stufe < 6) expect(neu).toEqual([]);
      else expect(neu.every((o) => o.y >= KONSTANTEN.feldanzahl && o.bestand)).toBe(true);
      expect(sp.stand.innen).toEqual(d.innen);
      expect(sp.stand.geld_eur).toBe(d.geld_eur);
      expect(sp.stand.gestattungen).toEqual(d.gestattungen);
      expect(sp.stand.neubau_strassenluecken).toEqual(d.neubau_strassenluecken);
      expect(sp.stand.objekte.filter((o) => o.y < 0)).toEqual([]);
      expect(sp.stand.nordviertel).toBeUndefined();
      expect(nordKulisse(sp.stand)).toHaveLength(14);
    });

    it(`test_nr27_g_${datei}_stufe${stufe}: Speichern → Laden ist verlustfrei (zweite Runde gleich der ersten)`, () => {
      const { text, d } = altText(datei, stufe);
      const sp = new Spiel(ladenMitBefund(text, d.zuletzt_ms).stand, () => d.zuletzt_ms);
      const eins = serialisieren(sp.stand);
      const zwei = ladenMitBefund(eins, d.zuletzt_ms);
      expect(zwei.befund).toBe('ok');
      const sp2 = new Spiel(zwei.stand, () => d.zuletzt_ms);
      expect(serialisieren(sp2.stand)).toBe(eins);
      expect(sp2.stand.objekte).toHaveLength(sp.stand.objekte.length);
      expect(sp2.stand.objekte.filter((o) => o.y < 0)).toEqual([]);
    });
  }

  for (const stufe of STUFEN) {
    it(`test_nr27_f_mitten_im_bau_stufe${stufe}: alter Abschnitt wird fertig – kein Viertel, kein mit_querung, Bauende unverändert`, () => {
      const { text, d } = altText('altstand-mitten-im-bau.json', stufe);
      const uhr = { t: d.zuletzt_ms };
      const sp = new Spiel(ladenMitBefund(text, uhr.t).stand, () => uhr.t);
      const ende = sp.stand.abschnitt!.bau!.ende_ms;
      expect(ende).toBe(d.abschnitt!.bau!.ende_ms);
      expect(sp.stand.abschnitt!.mit_querung).toBeUndefined();
      uhr.t = ende + 1000; sp.bis(uhr.t);
      expect(sp.stand.abschnitt).toBeUndefined();
      expect(sp.stand.nordviertel).toBeUndefined();
      expect(sp.stand.objekte.filter((o) => o.y < 0)).toEqual([]);
      // Die vier geplanten d50 auf (10|10..7) liegen jetzt als gebaute Leitungen da (nichts verloren).
      for (let y = 7; y <= 10; y++) expect(sp.stand.objekte.some((o) => o.x === 10 && o.y === y && o.typ === 'd50' && !o.geplant), `(10|${y})`).toBe(true);
    });
  }

  it('test_nr27_b_alter_stand_stufe5: Querung gesperrt mit „ab Heizzentrale Stufe 6“, Grünstreifen (10|−1) frei', () => {
    const { text, d } = altText('altstand-stufe6-layout3.json', 5);
    const sp = new Spiel(ladenMitBefund(text, d.zuletzt_ms).stand, () => d.zuletzt_ms);
    sp.stand.abschnitt = { phase: 'offen', bau: null };
    expect(sp.kannPlatzieren('d110', 10, -1)).toBe(true);
    const r = sp.platzieren('d110', 10, -2);
    expect(r.ok).toBe(false);
    expect(r.hinweis).toContain('ab Heizzentrale Stufe 6');
  });

  it('test_nr27_b_alter_stand_stufe1: auch ganz unten keine Leitung auf die Gleise', () => {
    const { text, d } = altText('altstand-mitten-im-bau.json', 1);
    const sp = new Spiel(ladenMitBefund(text, d.zuletzt_ms).stand, () => d.zuletzt_ms);
    for (const y of [-2, -3]) for (let x = 0; x < KONSTANTEN.feldanzahl; x++) expect(sp.kannPlatzieren('d25', x, y), `${x}|${y}`).toBe(false);
  });

  it('test_nr27_f_alter_stand_stufe6: Querung an die alte Leitung (10|0) bauen → Viertel entsteht genau dann, alte Objekte bleiben', () => {
    const d = JSON.parse(roh('altstand-stufe6-layout3.json')) as Spielstand;
    const uhr = { t: d.zuletzt_ms };
    const sp = new Spiel(ladenMitBefund(roh('altstand-stufe6-layout3.json'), uhr.t).stand, () => uhr.t);
    const vorher = new Map(sp.stand.objekte.map((o) => [o.id, { typ: o.typ, x: o.x, y: o.y }]));
    expect(sp.abschnittPlanen().ok).toBe(true);
    uhr.t = sp.stand.abschnitt!.bau!.ende_ms; sp.bis(uhr.t);
    for (const y of [-1, -2, -3]) expect(sp.platzieren('d110', 10, y), `(10|${y})`).toEqual({ ok: true });
    // Anschluss an die gebaute Leitung (10|0) herstellen (Trassenübergang, A-Regel vor NR27: standardmäßig getrennt)
    const an = sp.stand.objekte.find((o) => o.x === 10 && o.y === -1)!, alt0 = sp.stand.objekte.find((o) => o.x === 10 && o.y === 0)!;
    expect(sp.trassenUmschalten(an.id, alt0.id).ok).toBe(true);
    expect(sp.abschnittAbschliessen().ok).toBe(true);
    expect(sp.materialBestellen()).toEqual({ ok: true });
    const a = sp.stand.abschnitt!;
    expect(a.mit_querung).toBe(true);
    expect(a.bau!.ende_ms - a.bau!.start_ms).toBe((KONSTANTEN.abschnitt_bau_s + KONSTANTEN.querung_bau_s) * KONSTANTEN.bauzeit_faktor * 1000);
    // eine Millisekunde vor Bauende: noch kein Viertel
    uhr.t = a.bau!.ende_ms - 1; sp.bis(uhr.t);
    expect(sp.stand.nordviertel).toBeUndefined();
    uhr.t += 1; sp.bis(uhr.t);
    expect(sp.stand.nordviertel).toBe(true);
    const nord = sp.stand.objekte.filter((o) => o.y <= -4);
    expect(nord.map((o) => `${o.typ}@${o.x}|${o.y}`).sort()).toEqual(NORD_PLAN.map((h) => `${h.typ}@${h.x}|${h.y}`).sort());
    for (const [id, alt] of vorher) {
      const o = sp.objekt(id);
      expect(o, `Objekt ${id}`).toBeDefined();
      expect({ typ: o!.typ, x: o!.x, y: o!.y }).toEqual(alt);
    }
    // Die alte Leitung (10|0) ist mit der Querung verbunden: (10|-3) gehört zum gebauten Netz.
    expect(sp.netz.tiefe.has(-3 * KONSTANTEN.feldanzahl + 10)).toBe(true);
  });
});
