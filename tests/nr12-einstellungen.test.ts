import { afterEach, describe, expect, it, vi } from 'vitest';
import { Effekte } from '../src/render/effekte';
import type { Maler } from '../src/render/maler';
import { attrappe, type AttrappenElement } from './hilfen/kontext-attrappe';

// NR12 / A90 Paket P1 (Bauplan docs/bauplaene/NR12-fluessig.md, „Einstellungen“ und „effekte.ts sparsam“).
// Echte Module; ersetzt werden nur Browser-Teile (localStorage, document) und das Seitenblatt.

const SCHLUESSEL = 'waermedorf-einstellungen-v1';

function speicher(start: Record<string, string> = {}) {
  const daten = new Map(Object.entries(start));
  return { daten, getItem: (k: string) => daten.get(k) ?? null, setItem: (k: string, v: string) => { daten.set(k, v); } };
}

async function einstellungenModul(start: Record<string, string> = {}) {
  vi.resetModules();
  const s = speicher(start);
  vi.stubGlobal('localStorage', s);
  return { s, m: await import('../src/ui/einstellungen') };
}

afterEach(() => { vi.unstubAllGlobals(); vi.doUnmock('../src/ui/blatt'); vi.doUnmock('../src/ui/vorspann'); });

describe('NR12 P1 Einstellungen: Sparmodus', () => {
  it('NR12 P1: Einstellungen ohne sparmodus-Feld lesen → false', async () => {
    const { m } = await einstellungenModul({ [SCHLUESSEL]: JSON.stringify({ weniger_bewegung: true, kw_anzeigen: false }) });
    expect(m.einstellungenLesen()).toEqual({ weniger_bewegung: true, kw_anzeigen: false, sparmodus: false });
  });

  it('NR12 P1: gespeicherter Sparmodus wird gelesen; kein Speicher → false', async () => {
    const mit = await einstellungenModul({ [SCHLUESSEL]: JSON.stringify({ sparmodus: true }) });
    expect(mit.m.einstellungenLesen().sparmodus).toBe(true);
    const ohne = await einstellungenModul();
    expect(ohne.m.einstellungenLesen().sparmodus).toBe(false);
  });

  it('NR12 P1: einstellungenSchreiben ruft Abonnenten mit neuem Sparmodus', async () => {
    const { s, m } = await einstellungenModul();
    const a: boolean[] = [], b: boolean[] = [];
    m.beiEinstellungsAenderung((e) => a.push(e.sparmodus));
    m.beiEinstellungsAenderung((e) => b.push(e.sparmodus));
    expect(m.einstellungenSchreiben({ weniger_bewegung: false, kw_anzeigen: true, sparmodus: true })).toBe(true);
    m.einstellungenSchreiben({ weniger_bewegung: false, kw_anzeigen: true, sparmodus: false });
    expect(a).toEqual([true, false]);
    expect(b).toEqual([true, false]);
    expect(JSON.parse(s.daten.get(SCHLUESSEL)!)).toEqual({ weniger_bewegung: false, kw_anzeigen: true, sparmodus: false });
  });

  it('NR12 P1: Speichern scheitert → Abonnenten erfahren die Änderung trotzdem (gilt für diese Sitzung)', async () => {
    const { m } = await einstellungenModul();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('voll'); } });
    const a: boolean[] = [];
    m.beiEinstellungsAenderung((e) => a.push(e.sparmodus));
    expect(m.einstellungenSchreiben({ weniger_bewegung: false, kw_anzeigen: true, sparmodus: true })).toBe(false);
    expect(a).toEqual([true]);
  });

  it('NR12 P1: Schalter „Sparmodus“ unter „Weniger Bewegung“ ändert das übergebene Objekt, speichert und meldet', async () => {
    const dom = attrappe();
    vi.resetModules();
    const s = speicher();
    vi.stubGlobal('localStorage', s); vi.stubGlobal('document', dom.doc); vi.stubGlobal('DOMParser', dom.Parser);
    const inhalt = new dom.El('div');
    vi.doMock('../src/ui/blatt', () => ({ blattOeffnen: () => ({ inhalt, zu: () => {} }), blattOffen: () => false }));
    vi.doMock('../src/ui/vorspann', () => ({ logoElement: () => new dom.El('svg'), schriftzug: () => new dom.El('span') }));
    const m = await import('../src/ui/einstellungen');
    const gemeldet: boolean[] = [], abo: boolean[] = [];
    m.beiEinstellungsAenderung((e) => abo.push(e.sparmodus));
    const e = { weniger_bewegung: false, kw_anzeigen: true, sparmodus: false };
    const ui = { spiel: { stand: { name: 'Testdorf', spieler: '' } }, geaendert: () => {}, toast: () => {} };
    m.einstellungenOeffnen(ui as unknown as Parameters<typeof m.einstellungenOeffnen>[0], e, (neu) => gemeldet.push(neu === e && neu.sparmodus));

    const alle = dom.alle(inhalt);
    const schalter = alle.find((x) => x.attrs.id === 'sparmodus') as AttrappenElement & { checked?: boolean };
    expect(schalter).toBeDefined();
    expect(schalter.attrs).toMatchObject({ type: 'checkbox', role: 'switch' });
    const labels = alle.filter((x) => x.tag === 'label' && x.className === 'schalter');
    expect(labels.map((l) => dom.text(l))).toEqual(['Weniger Bewegung', 'Sparmodus']);
    expect(labels[1].attrs.for).toBe('sparmodus');
    const texte = alle.map((x) => dom.text(x));
    expect(texte).toContain('30 Bilder/s, keine Hintergrund-Animationen, etwas geringere Schärfe – für ältere Handys');

    schalter.checked = true;
    schalter.on.change();
    expect(e.sparmodus).toBe(true);
    expect(gemeldet).toEqual([true]);
    expect(abo).toEqual([true]);
    expect(JSON.parse(s.daten.get(SCHLUESSEL)!).sparmodus).toBe(true);
  });
});

/** Zählt Kreise (Funken) und Ellipsen (Münzen), die Effekte.zeichnen auf die Leinwand bringt. */
function zaehlMaler() {
  const zahl = { arc: 0, ellipse: 0 };
  const X = new Proxy({}, {
    get: (_z, name) => (name === 'arc' || name === 'ellipse' ? () => { zahl[name]++; } : () => {}),
    set: () => true,
  });
  return { zahl, m: { X, tw: 50, text: () => {} } as unknown as Maler };
}

describe('NR12 P1 Effekte: sparsam', () => {
  it('NR12 P1: Sparmodus an → effekte.sparsam: funken erzeugt 6, muenzen höchstens 2', () => {
    const normal = new Effekte(), spar = new Effekte();
    expect(normal.sparsam).toBe(false);
    spar.sparsam = true;
    for (const e of [normal, spar]) { e.funken(100, 100, 50); e.muenzen(0, 0, 100, 100, 400); }
    // zeichnen begrenzt dt auf 0,1 s: nach 4 Bildern (0,4 s) sind alle 8 Münzen gestartet (spätester Start 7·0,05 = 0,35 s),
    // keine abgelaufen (0,7 s); Funken leben ≥ 0,8 s. Gezählt wird nur das 4. Bild.
    const vorlauf = zaehlMaler(), n = zaehlMaler(), s = zaehlMaler();
    for (let i = 0; i < 3; i++) { normal.zeichnen(vorlauf.m, 0.1, () => [0, 0]); spar.zeichnen(vorlauf.m, 0.1, () => [0, 0]); }
    normal.zeichnen(n.m, 0.1, () => [0, 0]);
    spar.zeichnen(s.m, 0.1, () => [0, 0]);
    expect(n.zahl).toEqual({ arc: 24, ellipse: 8 }); // 2 + floor(400/40) = 12 → Deckel 8
    expect(s.zahl).toEqual({ arc: 6, ellipse: 2 });
  });

});
