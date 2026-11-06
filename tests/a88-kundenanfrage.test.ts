import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Spiel, type Ereignis } from '../src/core/spiel';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { bedarfKw } from '../src/core/netz';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { KATALOG, KONSTANTEN, PREISSTUFEN } from '../src/core/katalog';
import type { Objekt } from '../src/core/typen';

// A88/F2 Kundenanfrage (Bauplan docs/bauplaene/A88-freischalt-leiter.md, Abschnitt 6b/7b, T11).
// Nutzt das echte Kernmodul (kein vi.mock).
// Erwartete Leistungen von Hand: Einfamilienhaus 15.000 kWh/a ÷ 1.500 h = 10 kW;
// Kamin aus × 1,5 = 15 kW; Aufstockung × 1,4 = 14 kW; beides = 21 kW (katalog.ts KONSTANTEN).

const T0 = 1_000_000_000_000;
const mitUhr = () => { const z = { t: T0 }; const s = new Spiel(altesStartdorf(T0), () => z.t); s.ersteQuelleWaehlen('kessel'); return { s, z }; };
const lauf = (s: Spiel, z: { t: number }, sek: number) => { for (let i = 0; i < sek / 10; i++) { z.t += 10_000; s.bis(z.t); } };
const startHaeuser = (s: Spiel) => s.stand.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus' && o.station);
const startHaus = (s: Spiel) => startHaeuser(s)[0];
const schwelleAufstockung_s = (o: Objekt) => KONSTANTEN.aufstockung_nach_s + (o.id % 4) * 300;
const hinweise = (s: Spiel) => s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'hinweis' }> => e.art === 'hinweis').map((e) => e.text);
const schwebtexte = (s: Spiel) => s.ereignisse.filter((e): e is Extract<Ereignis, { art: 'schwebtext' }> => e.art === 'schwebtext');
/** Starthaus mit offener Kamin-Anfrage: sehr günstiger Preis, Lauf wie im alten A34-Test. */
const mitKaminAnfrage = () => {
  const { s, z } = mitUhr(); const h = startHaus(s);
  s.preisSetzen(0);
  lauf(s, z, KONSTANTEN.vollversorgung_nach_s + 1200);
  return { s, z, h };
};

describe('A88/F2 Kundenanfrage – Kern', () => {
  it('A88: Kamin aus wird zur Anfrage – kein Flag, Bedarf unverändert, Meldung und Schwebtext', () => {
    const { s, h } = mitKaminAnfrage();
    expect(h.anfrage).toBe('vollversorgung');
    expect(h.vollversorgung).toBeFalsy();
    expect(bedarfKw(h)).toBe(10);
    expect(hinweise(s)).toContain('Einfamilienhaus fragt an: Kamin abschalten und ganz mit Fernwärme heizen? Bedarf dann 15 kW');
    expect(schwebtexte(s).some((e) => e.text === 'fragt an' && e.farbe === '#ffd166' && e.x === h.x && e.y === h.y)).toBe(true);
    expect(s.stand.objekte.some((o) => o.vollversorgung || o.aufgestockt)).toBe(false);
  });

  it('A88: Annehmen schaltet den Kamin ab – Bedarf × 1,5, Netzbedarf steigt, auf Stufe 1', () => {
    const { s, h } = mitKaminAnfrage();
    const netzVorher = s.netz.bedarf_kw;
    expect(s.hzStufe).toBe(1);
    const r = s.anfrageAnnehmen(h.id);
    expect(r.ok).toBe(true);
    expect(h.vollversorgung).toBe(true);
    expect(h.anfrage).toBeUndefined();
    expect(bedarfKw(h)).toBe(15);
    expect(s.netz.bedarf_kw).toBeCloseTo(netzVorher + 5, 9);
    expect(hinweise(s)).toContain('Einfamilienhaus hat den Kamin abgeschaltet und heizt nur noch mit Fernwärme (+50 % Verbrauch)');
    expect(schwebtexte(s).some((e) => e.text === 'Kamin aus')).toBe(true);
  });

  it('A88: Annehmen kostet nichts', () => {
    const { s, h } = mitKaminAnfrage();
    const geld = s.stand.geld_eur, taler = s.stand.taler;
    expect(s.anfrageAnnehmen(h.id).ok).toBe(true);
    expect(s.stand.geld_eur).toBe(geld);
    expect(s.stand.taler).toBe(taler);
  });

  it('A88: Ablehnen löscht die Anfrage, setzt voll_s zurück, ohne Strafe; die Anfrage kommt nach derselben Wartezeit wieder', () => {
    const a = mitKaminAnfrage(), b = mitKaminAnfrage();
    const geld = a.s.stand.geld_eur;
    const r = a.s.anfrageAblehnen(a.h.id);
    expect(r.ok).toBe(true);
    expect(a.h.anfrage).toBeUndefined();
    expect(a.h.vollversorgung).toBeFalsy();
    expect(a.h.voll_s).toBe(0);
    expect(a.s.stand.geld_eur).toBe(geld);
    expect(hinweise(a.s)).toContain('Einfamilienhaus wartet und fragt später wieder');
    // Die warme Zeit liegt schon über der Aufstockungs-Schwelle; ohne Zurücksetzen käme zuerst die Aufstockung (eigener Test).
    a.h.warm_s = 0; b.h.warm_s = 0;
    lauf(a.s, a.z, 60); lauf(b.s, b.z, 60);
    expect(a.h.zufriedenheit_pct).toBeCloseTo(b.h.zufriedenheit_pct!, 2);
    lauf(a.s, a.z, KONSTANTEN.vollversorgung_nach_s - 200);
    expect(a.h.anfrage).toBeUndefined();
    lauf(a.s, a.z, 440);
    expect(a.h.anfrage).toBe('vollversorgung');
  });

  it('A88: Kamin abgelehnt und warme Zeit über der Schwelle → als Nächstes fragt das Haus nach der Aufstockung', () => {
    const { s, z, h } = mitKaminAnfrage();
    h.warm_s = schwelleAufstockung_s(h) + 100;
    expect(s.anfrageAblehnen(h.id).ok).toBe(true);
    lauf(s, z, 10);
    expect(h.anfrage).toBe('aufstockung');
    expect(h.aufgestockt).toBeFalsy();
  });

  it('A88: Aufstockung wird zur Anfrage genau auf der Schwelle; Annehmen × 1,4; Ablehnen setzt warm_s zurück', () => {
    const ohneVoll = PREISSTUFEN.findIndex((p) => p.zufriedenheit_pct < 95);
    const vorbereiten = (abstand_s: number) => {
      const { s, z } = mitUhr(); s.preisSetzen(ohneVoll); const h = startHaus(s);
      h.warm_s = schwelleAufstockung_s(h) - abstand_s;
      lauf(s, z, 10);
      return { s, z, h };
    };
    const knapp = vorbereiten(20); // nach dem Takt 10 s unter der Schwelle
    expect(knapp.h.anfrage).toBeUndefined();
    const { s, h } = vorbereiten(10); // nach dem Takt genau auf der Schwelle
    expect(h.anfrage).toBe('aufstockung');
    expect(h.aufgestockt).toBeFalsy();
    expect(bedarfKw(h)).toBe(10);
    expect(hinweise(s)).toContain('Einfamilienhaus baut ein Stockwerk auf und fragt nach mehr Wärme: Bedarf dann 14 kW');
    expect(s.anfrageAnnehmen(h.id).ok).toBe(true);
    expect(h.aufgestockt).toBe(true);
    expect(bedarfKw(h)).toBeCloseTo(14, 9);
    expect(hinweise(s)).toContain('Einfamilienhaus stockt auf: Bedarf 14 kW – reicht die Übergabestation noch?');
    expect(schwebtexte(s).some((e) => e.text === 'Aufstockung')).toBe(true);
    const zweit = vorbereiten(10);
    expect(zweit.s.anfrageAblehnen(zweit.h.id).ok).toBe(true);
    expect(zweit.h.warm_s).toBe(0);
    expect(zweit.h.aufgestockt).toBeFalsy();
    expect(zweit.h.anfrage).toBeUndefined();
  });

  it('A88: Höchstens eine Anfrage je Haus – Kamin zuerst, nach dem Annehmen die Aufstockung', () => {
    const { s, z } = mitUhr(); s.preisSetzen(0); const h = startHaus(s);
    h.zufriedenheit_pct = 97;
    h.voll_s = KONSTANTEN.vollversorgung_nach_s - 10;
    h.warm_s = schwelleAufstockung_s(h) + 100;
    lauf(s, z, 10);
    expect(h.anfrage).toBe('vollversorgung');
    lauf(s, z, 30);
    expect(h.anfrage).toBe('vollversorgung');
    expect(h.aufgestockt).toBeFalsy();
    expect(s.anfrageAnnehmen(h.id).ok).toBe(true);
    lauf(s, z, 10);
    expect(h.anfrage).toBe('aufstockung');
  });

  it('A88: Keine Anfrage für schon Gewährtes', () => {
    const { s, z } = mitUhr(); s.preisSetzen(0); const h = startHaus(s);
    h.vollversorgung = true; h.aufgestockt = true; h.station = 'st_25';
    s.neuBerechnen();
    h.zufriedenheit_pct = 97; h.voll_s = 5000; h.warm_s = 5000;
    lauf(s, z, 30);
    expect(s.netz.warm.has(h.id)).toBe(true);
    expect(h.anfrage).toBeUndefined();
  });

  it('A88: Annehmen/Ablehnen ohne Anfrage, auf dem Büro, bei unbekanntem Wert oder gekündigtem Haus → nein', () => {
    const { s } = mitUhr(); const h = startHaus(s);
    expect(s.anfrageAnnehmen(h.id).ok).toBe(false);
    expect(s.anfrageAblehnen(h.id).ok).toBe(false);
    const buero = s.stand.objekte.find((o) => o.typ === 'buero')!;
    buero.anfrage = 'aufstockung';
    expect(s.anfrageAnnehmen(buero.id).ok).toBe(false);
    expect(s.anfrageAblehnen(buero.id).ok).toBe(false);
    expect(s.anfrageAnnehmen(99_999).ok).toBe(false);
    expect(s.anfrageAblehnen(99_999).ok).toBe(false);
    (h as { anfrage?: string }).anfrage = 'kaffee';
    expect(s.anfrageAnnehmen(h.id).ok).toBe(false);
    expect(h.anfrage).toBeUndefined();
    expect(h.vollversorgung).toBeFalsy(); expect(h.aufgestockt).toBeFalsy();
    (h as { anfrage?: string }).anfrage = 'kaffee';
    expect(s.anfrageAblehnen(h.id).ok).toBe(false);
    expect(h.anfrage).toBeUndefined();
    h.anfrage = 'vollversorgung'; h.gekuendigt = true;
    expect(s.anfrageAnnehmen(h.id).ok).toBe(false);
    expect(s.anfrageAblehnen(h.id).ok).toBe(false);
    expect(h.vollversorgung).toBeFalsy();
  });

  it('A88: Kündigt der Kunde, verschwindet seine Anfrage', () => {
    const { s, z } = mitUhr(); const h = startHaus(s);
    s.preisSetzen(PREISSTUFEN.length - 1);
    // Ziel bei 15 ct ist 30 %; von 5 % aus liegt die Zufriedenheit nach dem ersten Takt noch unter der Kündigungsgrenze
    h.anfrage = 'aufstockung'; h.zufriedenheit_pct = 5;
    lauf(s, z, 10);
    expect(h.gekuendigt).toBe(true);
    expect(h.anfrage).toBeUndefined();
  });

  it('A88: Anfrage an einem kalten Haus bleibt stehen, Annehmen bleibt möglich', () => {
    const { s, z } = mitUhr(); const h = startHaus(s);
    h.anfrage = 'vollversorgung'; h.ohne_station = true; delete h.station;
    s.neuBerechnen();
    lauf(s, z, 30);
    expect(s.netz.warm.has(h.id)).toBe(false);
    expect(h.anfrage).toBe('vollversorgung');
    expect(s.anfrageAnnehmen(h.id).ok).toBe(true);
    expect(h.vollversorgung).toBe(true);
  });

  it('A88: anfrageBedarf_kw – Bedarf nach dem Annehmen, ohne Anfrage der heutige Bedarf', () => {
    const { s } = mitUhr(); const h = startHaus(s);
    expect(s.anfrageBedarf_kw(h)).toBe(10);
    h.anfrage = 'vollversorgung';
    expect(s.anfrageBedarf_kw(h)).toBe(15);
    h.anfrage = 'aufstockung';
    expect(s.anfrageBedarf_kw(h)).toBeCloseTo(14, 9);
    h.vollversorgung = true;
    expect(s.anfrageBedarf_kw(h)).toBeCloseTo(21, 9);
    expect(h.aufgestockt).toBeFalsy(); // nur gerechnet, nicht gesetzt
    (h as { anfrage?: string }).anfrage = 'kaffee';
    expect(s.anfrageBedarf_kw(h)).toBe(15);
  });

  it('A88: Alter Stand – aufgestockt und Kamin aus bleiben, Bedarf × 1,5 × 1,4, nach 1 h keine Anfrage', () => {
    const { s } = mitUhr(); const h = startHaus(s);
    h.aufgestockt = true; h.vollversorgung = true; h.station = 'st_25';
    const { stand, befund } = ladenMitBefund(serialisieren(s.stand), T0);
    expect(befund).toBe('ok');
    const z = { t: T0 }; const s2 = new Spiel(stand, () => z.t);
    const h2 = s2.objekt(h.id)!;
    expect(h2.aufgestockt).toBe(true); expect(h2.vollversorgung).toBe(true);
    expect(bedarfKw(h2)).toBeCloseTo(21, 9);
    lauf(s2, z, 3600);
    expect(s2.netz.warm.has(h2.id)).toBe(true);
    expect(h2.anfrage).toBeUndefined();
    expect(h2.aufgestockt).toBe(true); expect(h2.vollversorgung).toBe(true);
  });

  it('A88: Offene Anfrage wird gespeichert und geladen', () => {
    const { s } = mitUhr(); const h = startHaus(s);
    h.anfrage = 'aufstockung';
    const { stand } = ladenMitBefund(serialisieren(s.stand), T0);
    expect(stand.objekte.find((o) => o.id === h.id)!.anfrage).toBe('aufstockung');
  });

  it('A88: Abwesenheit – keine Einzelmeldung, eine Sammelmeldung für zwei Kunden', () => {
    const { s, z } = mitUhr();
    const [a, b] = startHaeuser(s);
    expect(b).toBeDefined();
    a.warm_s = 5000; b.warm_s = 5000;
    s.ereignisse.splice(0);
    z.t += 600_000; s.bis(z.t);
    expect(a.anfrage).toBe('aufstockung'); expect(b.anfrage).toBe('aufstockung');
    const h = hinweise(s);
    expect(h.some((t) => t.includes('fragt an') || t.includes('fragt nach mehr Wärme:'))).toBe(false);
    expect(schwebtexte(s).some((e) => e.text === 'fragt an')).toBe(false);
    expect(h.filter((t) => t.includes('Kunden fragen nach mehr Wärme'))).toEqual(['Während du weg warst: 2 Kunden fragen nach mehr Wärme']);
    s.ereignisse.splice(0);
    lauf(s, z, 60);
    expect(hinweise(s).some((t) => t.includes('Während du weg warst') && t.includes('Wärme'))).toBe(false);
  });

  it('A88: Abwesenheit mit einer Anfrage – Sammelmeldung in der Einzahl; ohne neue Anfrage keine Meldung', () => {
    const { s, z } = mitUhr(); const [a] = startHaeuser(s);
    a.warm_s = 5000;
    s.ereignisse.splice(0);
    z.t += 600_000; s.bis(z.t);
    expect(hinweise(s).filter((t) => t.includes('nach mehr Wärme'))).toEqual(['Während du weg warst: 1 Kunde fragt nach mehr Wärme']);
    s.ereignisse.splice(0);
    z.t += 600_000; s.bis(z.t); // Anfrage steht schon offen → keine neue
    expect(hinweise(s).some((t) => t.includes('nach mehr Wärme'))).toBe(false);
  });
});

describe('A88/F2 Kundenanfrage – Kennzeichen am Haus', () => {
  it('A88: Blase „anfrage“ am warmen Haus; Probleme (kalt) haben Vorrang', async () => {
    const { blase } = await import('../src/render/szene');
    const { s } = mitUhr(); const h = startHaus(s);
    expect(blase(s, s.netz, h, true, true)).toBeNull();
    h.anfrage = 'vollversorgung';
    expect(blase(s, s.netz, h, true, true)).toBe('anfrage');
    expect(blase(s, s.netz, h, false, true)).toBe('kalt');
    h.gekuendigt = true;
    expect(blase(s, s.netz, h, true, true)).toBe('weg');
  });
  it('A88: zeichneBlase kennt die Art „anfrage“ (Farbe und Symbol)', () => {
    const q = readFileSync(new URL('../src/render/gebaeude.ts', import.meta.url), 'utf8');
    expect(q).toMatch(/export type Blase = [^;]*'anfrage'/);
    expect(q).toMatch(/anfrage: '#[0-9a-f]{6}'/);
  });
});

// ---- Oberfläche: Anfrage-Kasten der Hauskarte, mit winziger DOM-Nachbildung (Vitest läuft ohne Browser) ----
function attrappe() {
  class El {
    tag: string; className = ''; attrs: Record<string, string> = {}; kinder: unknown[] = []; ereignisse: Record<string, () => void> = {};
    constructor(tag: string) { this.tag = tag; }
    setAttribute(k: string, v: string) { this.attrs[k] = v; }
    hasAttribute(k: string) { return k in this.attrs; }
    addEventListener(k: string, f: () => void) { this.ereignisse[k] = f; }
    append(...k: unknown[]) { this.kinder.push(...k); }
  }
  const doc = { createElement: (t: string) => new El(t), createTextNode: (t: string) => ({ text: t }), importNode: (n: unknown) => n };
  class Parser { parseFromString() { return { documentElement: new El('svg') }; } }
  return { doc, Parser, El };
}
type El = InstanceType<ReturnType<typeof attrappe>['El']>;
const text = (n: unknown): string => {
  if (!n || typeof n !== 'object') return '';
  if ('text' in n) return String((n as { text: string }).text);
  return ((n as El).kinder ?? []).map(text).join('');
};
const alle = (n: unknown, f: (e: El) => boolean, aus: El[] = []): El[] => {
  if (n && typeof n === 'object' && 'kinder' in n) { const e = n as El; if (f(e)) aus.push(e); e.kinder.forEach((k) => alle(k, f, aus)); }
  return aus;
};

describe('A88/F2 Kundenanfrage – Hauskarte', () => {
  const mitDom = async <T>(f: (k: typeof import('../src/ui/kontext')) => T): Promise<T> => {
    const a = attrappe();
    vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
    try { return f(await import('../src/ui/kontext')); } finally { vi.unstubAllGlobals(); }
  };

  it('A88: Ohne Anfrage kein Kasten', async () => {
    const { s } = mitUhr(); const h = startHaus(s);
    expect(await mitDom((k) => k.anfrageKasten(s, h, () => {}))).toBeNull();
  });

  it('A88: Kasten „Anfrage“ – Satz des Kunden, Leistung vorher → nachher, Knöpfe Annehmen (grün) und Später, beide ≥ 44 px (klein)', async () => {
    const { s } = mitUhr(); const h = startHaus(s);
    h.anfrage = 'vollversorgung'; h.station = 'st_15';
    const kasten = await mitDom((k) => k.anfrageKasten(s, h, () => {})) as unknown as El;
    expect(kasten.className).toBe('kasten');
    const t = text(kasten);
    expect(t).toContain('Anfrage');
    expect(t).toContain('Darf ich meinen Kaminofen abschalten und ganz mit Fernwärme heizen?');
    expect(t).toContain('Anschlussleistung danach');
    expect(t).toContain('10 → 15 kW');
    expect(t).not.toContain('Station dann zu klein'); // 15 kW passt in die 15er
    const knoepfe = alle(kasten, (e) => e.tag === 'button');
    expect(knoepfe.map((b) => b.className.split(/\s+/))).toEqual([['knopf', 'los', 'klein'], ['knopf', 'klein']]);
    expect(text(knoepfe[0])).toBe('Annehmen+5 kW Bedarf');
    expect(text(knoepfe[1])).toBe('Späterfragt später wieder');
  });

  it('A88: Aufstockung mit zu kleiner Station → Satz zur Aufstockung und roter Hinweis „Station dann zu klein“', async () => {
    const { s } = mitUhr(); const h = startHaus(s);
    h.anfrage = 'aufstockung'; h.vollversorgung = true; h.station = 'st_15';
    const kasten = await mitDom((k) => k.anfrageKasten(s, h, () => {})) as unknown as El;
    const t = text(kasten);
    expect(t).toContain('Wir bauen ein Stockwerk auf – könnt ihr mehr Wärme liefern?');
    expect(t).toContain('15 → 21 kW');
    const warn = alle(kasten, (e) => e.className === 'chip rot');
    expect(warn.map(text)).toEqual(['Station dann zu klein']);
  });

  it('A88: „Annehmen“ nimmt an, „Später“ lehnt ab – danach wird die Karte neu gezeichnet', async () => {
    for (const [nr, flag] of [[0, 'vollversorgung'], [1, null]] as const) {
      const { s } = mitUhr(); const h = startHaus(s);
      h.anfrage = 'vollversorgung'; h.voll_s = 1000;
      let neu = 0;
      const kasten = await mitDom((k) => k.anfrageKasten(s, h, () => { neu++; })) as unknown as El;
      alle(kasten, (e) => e.tag === 'button')[nr].ereignisse.click();
      expect(neu).toBe(1);
      expect(h.anfrage).toBeUndefined();
      if (flag) expect(h.vollversorgung).toBe(true);
      else { expect(h.vollversorgung).toBeFalsy(); expect(h.voll_s).toBe(0); }
    }
  });

  it('A88: Hauskarte zeigt Chip „fragt an“ (gold) und den Anfrage-Kasten; neuer Erklärtext in der Stationswahl', () => {
    const q = readFileSync(new URL('../src/ui/kontext.ts', import.meta.url), 'utf8');
    expect(q).toMatch(/if \(o\.anfrage\) chips\.append\(h\('span', \{ class: 'chip gold' \}, 'fragt an'\)\)/);
    expect(q).toContain('anfrageKasten(sp, o, () => this.ui.geaendert())');
    expect(q).toContain('Fragt der Kunde nach mehr Wärme und du stimmst zu, steigt der Bedarf – dann brauchst du eine größere Station.');
    expect(q).not.toContain('Schaltet der Kunde seinen Ofen ab oder baut an');
  });
});
