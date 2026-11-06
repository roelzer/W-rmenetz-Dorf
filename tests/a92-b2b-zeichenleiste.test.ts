import { afterEach, describe, expect, it, vi } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { altesStartdorf } from './hilfen/altes-startdorf';
import { HELFER, KATALOG } from '../src/core/katalog';
import { laden, serialisieren } from '../src/core/speichern';
import type { Objekt } from '../src/core/typen';
import { SYMBOLE } from '../src/ui/symbole';
import { echteSteuerung, type EchteUmgebung } from './hilfen/echte-steuerung';
import { sichtbar, type El } from './hilfen/dom-attrappe';
import { gesperrtMitHinweis } from './hilfen/gesperrt';

// Tester-Vorarbeit NR16-B2b (A92): Zeichenleiste, Helfer-Geldsperre, „nächster Sperrgrund“, Reiter-Rollen, Meldungsdauer.
// Grundlage: DESIGN.md 12.16–12.18, 12.20 (B1–B4, B7, H7, Regel 4) und vor allem 12.21 (Punkte 1–4 und Prüfkriterium).
// Echte Steuerung, echtes Blatt, echter Toast, echte Kontextkarte und echtes Baumenü (ENTSCHEIDUNGEN 2026-11-05, Antwort 8)
// auf der DOM-Nachbildung; nur Lage und Breiten (Kamera, Toast-Lage, Tippflächen) prüft tests/browser/a92-b2b.browser.cjs.
// Erwartete Texte stehen wörtlich in DESIGN.md 12.20/12.21; Zahlen (Preise, Kapazitäten, Zeiten) von Hand aus
// src/core/katalog.ts eingesetzt. In Meldungen sind normales und geschütztes Leerzeichen erlaubt (Antwort 2) – Vergleich nach `norm`.
// Elemente werden nur über das gefunden, was die Vorgabe festlegt (Knopfname, aria-label, aria-expanded, role), nicht über Klassen.

const T0 = 1_000_000_000_000;
const norm = (t: string): string => t.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const ABSCHLIESSEN = 'Abschnitt abschließen';
const B1_HINWEIS = 'Erst mit Philipp einen Bauabschnitt planen: Bauen → Leitungen.';
const B3_HINWEIS = 'Abschnitt wartet auf Lauras Bestellung. Ändern: Bauen → Leitungen → Weiter einzeichnen.';
const B6_HINWEIS = 'Noch nichts gezeichnet. Wähle eine Leitung und zieh sie in der Karte.';
const B7_HINWEIS = 'Noch nichts gezeichnet – es gibt nichts zurückzunehmen.';
const H3_HINWEIS = (zeit: string): string => `Alle Helfer sind gerade beschäftigt. Der nächste ist in ${zeit} frei.`;
const H4_HINWEIS = 'Dieses Haus hat noch keine Übergabestation. Wähle oben im Blatt erst eine.';
const GELD_HINWEIS = (betrag: string): string => `Dir fehlen noch ${betrag}. Am Monatsende zahlen deine Kunden ihre Wärmerechnung.`;

type Uhr = { t: number };
const neu = (stufe = 1, uhr: Uhr = { t: T0 }): Spiel => {
  const s = new Spiel(altesStartdorf(T0), () => uhr.t);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  s.ereignisse.splice(0);
  return s;
};
const offen = (s: Spiel): Spiel => { s.stand.abschnitt = { phase: 'offen', bau: null }; return s; };

afterEach(() => { vi.useRealTimers(); });

// ───────────── Suchhilfen (nur öffentliche Merkmale) ─────────────
const knoepfe = (u: EchteUmgebung): El[] => u.knoepfe().filter((k) => k.isConnected);
/** genau ein Knopf, dessen Name mit `anfang` beginnt (Leerzeichenart egal) */
function einer(u: EchteUmgebung, anfang: string): El {
  const k = knoepfe(u).filter((e) => norm(e.textContent).startsWith(anfang));
  expect(k.map((e) => norm(e.textContent)), `genau ein Knopf „${anfang}…“`).toHaveLength(1);
  return k[0];
}
function perLabel(u: EchteUmgebung, label: string): El {
  const k = knoepfe(u).filter((e) => e.attrs['aria-label'] === label);
  expect(k, `genau ein Knopf mit aria-label „${label}“`).toHaveLength(1);
  return k[0];
}
const abschliessen = (u: EchteUmgebung): El => einer(u, ABSCHLIESSEN);
/** Zeile 2 = alles nach dem Knopfnamen */
const zeile2 = (k: El, name: string): string => norm(norm(k.textContent).slice(name.length));
const schloss = (k: El): boolean => k.querySelectorAll('svg').some((s) => s.attrs.quelle === SYMBOLE.schloss);
/** Die Zeichenleiste = der Dialog bzw. Abschnitt, in dem „Abschnitt abschließen“ steht */
const leiste = (u: EchteUmgebung): El => {
  const l = abschliessen(u).closest('section,[role="dialog"],aside');
  expect(l, 'Zeichenleiste (Dialog um „Abschnitt abschließen“)').not.toBeNull();
  return l!;
};
const hilfeKnopf = (u: EchteUmgebung): El => {
  const k = leiste(u).querySelectorAll('button').filter((e) => e.hasAttribute('aria-expanded'));
  expect(k, '[?]-Knopf mit aria-expanded in der Zeichenleiste (12.21 Punkt 4)').toHaveLength(1);
  return k[0];
};
const verstandenSichtbar = (u: EchteUmgebung): El | undefined => knoepfe(u).find((k) => norm(k.textContent) === 'Verstanden' && sichtbar(k));
/** Erste-Nutzung-Hilfe schließen, falls sie offen ist (Tests, in denen sie nicht Thema ist) */
const hilfeZu = (u: EchteUmgebung): void => { verstandenSichtbar(u)?.click(); };
const zurueck = (u: EchteUmgebung): El => perLabel(u, 'Letzte Leitung zurück');

/** Ein freies Feld im sichtbaren Kartenteil links der Leiste antippen (echte Zeigerereignisse auf der Leinwand). */
function zeichneEinFeld(u: EchteUmgebung, s: Spiel): [number, number] {
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
const geplante = (s: Spiel): number => s.stand.objekte.filter((o) => o.geplant).length;

// ───────────── 12.21 Punkt 1: „Abschnitt abschließen“ in der Zeichenleiste ─────────────

describe('A92 / 12.21 Punkt 1 – Abschließen und Zurück ohne Zeichnung', () => {
  it('a92 B6: Zeichenleiste frisch geöffnet – Abschließen gesperrt (aria-disabled), Zeile 2 „nichts gezeichnet“, kein Schloss', async () => {
    const s = offen(neu(1));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      const k = abschliessen(u);
      expect(gesperrtMitHinweis(k), 'aria-disabled="true" ohne disabled (12.19)').toBe(true);
      expect(zeile2(k, ABSCHLIESSEN)).toBe('nichts gezeichnet');
      expect(schloss(k), 'B6: kein Schloss (12.20 Regel 2)').toBe(false);
    });
  });

  it('a92 B6: Abschließen mit 0 Leitungen antippen – Meldung B6, Leiste bleibt offen, Abschnitt bleibt „offen“, kein Kerntext', async () => {
    const s = offen(neu(1));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      abschliessen(u).click();
      expect(norm(u.meldung())).toBe(B6_HINWEIS);
      expect(abschliessen(u).isConnected, 'Leiste bleibt offen').toBe(true);
      expect(s.abschnitt?.phase).toBe('offen');
      expect(s.ereignisse.map((e) => ('text' in e ? e.text : '')).join(' ')).not.toContain('Zeichne erst Leitungen');
    });
  });

  it('a92 B7: „Zurück“ ohne Zeichnung – aria-label „Letzte Leitung zurück“, gesperrt, Meldung mit dem neuen B7-Text', async () => {
    const s = offen(neu(1));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      hilfeZu(u);
      const k = zurueck(u);
      expect(gesperrtMitHinweis(k), 'aria-disabled="true" ohne disabled').toBe(true);
      expect(norm(k.textContent), 'kein Zeile-2-Grund im schmalen Knopf (12.21 B7)').toBe('Zurück');
      expect(schloss(k)).toBe(false);
      k.click();
      expect(norm(u.meldung())).toBe(B7_HINWEIS);
      expect(zurueck(u).isConnected, 'Leiste bleibt offen').toBe(true);
    });
  });

  it('a92 B6/B7 sofort: erster Strich gibt Abschließen und Zurück frei, ohne die Leiste neu zu öffnen; „Zurück“ der letzten Leitung sperrt beide wieder', async () => {
    const s = offen(neu(1));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      hilfeZu(u);
      const titelVorher = leiste(u);
      zeichneEinFeld(u, s);
      expect(geplante(s), 'Testaufbau: eine Leitung gezeichnet').toBe(1);
      expect(leiste(u), 'dieselbe Leiste, nicht neu geöffnet').toBe(titelVorher);
      expect(gesperrtMitHinweis(abschliessen(u)), 'Abschließen frei').toBe(false);
      expect(abschliessen(u).hasAttribute('aria-disabled') && abschliessen(u).attrs['aria-disabled'] === 'true').toBe(false);
      expect(zeile2(abschliessen(u), ABSCHLIESSEN), 'frei: einzeilig, ohne Grund').toBe('');
      expect(gesperrtMitHinweis(zurueck(u)), 'Zurück frei').toBe(false);
      zurueck(u).click();
      expect(geplante(s), 'Zurück nimmt die Leitung weg').toBe(0);
      expect(gesperrtMitHinweis(abschliessen(u)), 'Abschließen wieder gesperrt').toBe(true);
      expect(zeile2(abschliessen(u), ABSCHLIESSEN)).toBe('nichts gezeichnet');
      expect(gesperrtMitHinweis(zurueck(u)), 'Zurück wieder gesperrt').toBe(true);
    });
  });

  it('a92 B6/B7 sofort: mit dem Radierer die einzige Leitung weg → beide gesperrt; mit Leitung schließt Abschließen den Abschnitt ab', async () => {
    const s = offen(neu(1));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      hilfeZu(u);
      zeichneEinFeld(u, s);
      zeichneEinFeld(u, s); // zweites Feld, damit nach dem Radieren noch eine bleibt
      expect(geplante(s)).toBe(2);
      einer(u, 'Radierer').click();
      hilfeZu(u);
      const k = u.st.kamera, canvas = u.dom.app.querySelector('canvas')!;
      const radiere = (o: Objekt): void => { const [mx, my] = k.mitte(o.x, o.y); const ev = { pointerId: 2, clientX: mx, clientY: my, pointerType: 'touch', button: 0 }; canvas.ausloesen('pointerdown', ev); canvas.ausloesen('pointerup', ev); };
      radiere(s.stand.objekte.filter((o) => o.geplant)[0]);
      expect(geplante(s)).toBe(1);
      expect(gesperrtMitHinweis(abschliessen(u)), 'eine Leitung übrig → frei').toBe(false);
      radiere(s.stand.objekte.filter((o) => o.geplant)[0]);
      expect(geplante(s)).toBe(0);
      expect(gesperrtMitHinweis(abschliessen(u)), 'Radierer entfernt letzte → Abschließen gesperrt').toBe(true);
      expect(gesperrtMitHinweis(zurueck(u)), 'Radierer entfernt letzte → Zurück gesperrt').toBe(true);
    });
    // Gegenprobe: mit Leitung führt Tippen das Abschließen aus (normale Aktion)
    const s2 = offen(neu(1));
    await echteSteuerung(s2, (u) => {
      u.st.stempeln('d25');
      hilfeZu(u);
      zeichneEinFeld(u, s2);
      abschliessen(u).click();
      expect(s2.abschnitt?.phase).toBe('bestellen');
    });
  });

  // B1–B4: Der Zustand ändert sich, während die Leiste offen ist (12.21 Punkt 1 Regeln, Punkt 3). Beim Tippen werden alle
  // Gründe neu gelesen; Meldung = Hinweis des ersten geltenden Grundes, Zeile 2 danach dieselbe Kurzform mit Schloss.
  const faelle: Array<{ nr: string; setze: (s: Spiel, uhr: Uhr) => void; zeile2: string; hinweis: string; vorTippen?: number }> = [
    { nr: 'B1', setze: (s) => { delete s.stand.abschnitt; }, zeile2: 'kein Bauabschnitt', hinweis: B1_HINWEIS },
    // Planung endet bei T0 + 9 min; getippt wird bei T0 + 1 min 30 s → Restzeit zum Tippzeitpunkt 7m 30s (nicht 9m)
    { nr: 'B2', setze: (s) => { s.stand.abschnitt = { phase: 'planung', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 540_000 } }; }, zeile2: 'wird noch geplant', hinweis: 'Philipp plant den Bauabschnitt noch (7m 30s). Danach kannst du zeichnen.', vorTippen: 90_000 },
    { nr: 'B3', setze: (s) => { s.stand.abschnitt = { phase: 'bestellen', bau: null }; }, zeile2: 'Bestellung offen', hinweis: B3_HINWEIS },
    { nr: 'B4', setze: (s) => { s.stand.abschnitt = { phase: 'bau', bau: { art: 'neu', start_ms: T0, ende_ms: T0 + 200_000 } }; }, zeile2: 'Abschnitt im Bau', hinweis: 'Der Bauabschnitt wird gerade gebaut (2m 20s). Danach kannst du den nächsten planen.', vorTippen: 60_000 },
  ];
  for (const f of faelle) {
    it(`a92 ${f.nr} (Rangfolge vor B6): Abschnitt ändert sich bei offener Leiste – Tippen zeigt ${f.nr}-Hinweis, Zeile 2 danach „${f.zeile2}“ mit Schloss`, async () => {
      const uhr = { t: T0 }, s = offen(neu(1, uhr));
      await echteSteuerung(s, (u) => {
        u.st.stempeln('d25');
        f.setze(s, uhr);
        const vorher = JSON.stringify(s.stand.abschnitt ?? null);
        uhr.t = T0 + (f.vorTippen ?? 0);
        abschliessen(u).click();
        expect(norm(u.meldung()), `${f.nr}: Hinweis (nicht B6, nicht Kerntext)`).toBe(f.hinweis);
        const k = abschliessen(u);
        expect(gesperrtMitHinweis(k)).toBe(true);
        expect(zeile2(k, ABSCHLIESSEN), `${f.nr}: Kurzform ≤ 18 Zeichen`).toBe(f.zeile2);
        expect(f.zeile2.length).toBeLessThanOrEqual(18);
        expect(schloss(k), `${f.nr}: Schloss`).toBe(true);
        expect(JSON.stringify(s.stand.abschnitt ?? null), 'Abschnitt unverändert').toBe(vorher);
      }, { uhr: () => uhr.t });
    });
  }
});

// ───────────── 12.18 / 12.21 Punkt 4: Bedienung und Vorleser ─────────────

describe('A92 / 12.18 + 12.21 Punkt 4 – Zeichenleiste: Titel, Reihenfolge, aria-pressed, Hilfe', () => {
  it('a92 12.18: Titel „Zeichnen“, Tab-Reihenfolge [?] → [X] → Farbknöpfe → Radierer → Zurück → T-Stück → Abschließen', async () => {
    const s = offen(neu(1));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      hilfeZu(u);
      const l = leiste(u);
      expect(l.querySelectorAll('h1,h2,h3').map((h) => norm(h.textContent))).toContain('Zeichnen');
      const reihe = l.querySelectorAll('button');
      const i = (k: El): number => reihe.indexOf(k);
      const farbe = perLabel(u, '25er-Leitung, bis 15 kW');
      const folge = [hilfeKnopf(u), perLabel(u, 'Schließen'), farbe, einer(u, 'Radierer'), zurueck(u), einer(u, 'T-Stück mit Vorsehung'), abschliessen(u)].map(i);
      expect(folge.every((x) => x >= 0), 'alle in der Leiste').toBe(true);
      expect([...folge].sort((a, b) => a - b), 'Reihenfolge im Dokument = Tab-Reihenfolge').toEqual(folge);
    });
  });

  it('a92 12.18: Farbknöpfe zeigen die Zahl, aria-label = Name + Kennwert aus dem Katalog, gewählter aria-pressed="true"; gesperrter „St. 2“ mit Vorleser-Text', async () => {
    const s = offen(neu(1));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d32');
      hilfeZu(u);
      // Kapazitäten aus src/core/katalog.ts: d25 15 kW, d32 25 kW, d40 40 kW; gewählt d32: Spielpreis 14 € × kosten_faktor 40 = 560 €/Feld
      const [d25, d32, d40] = ['25er-Leitung, bis 15 kW', '32er-Leitung, bis 25 kW', '40er-Leitung, bis 40 kW'].map((l) => perLabel(u, l));
      expect([d25, d32, d40].map((k) => norm(k.textContent))).toEqual(['25', '32', '40']);
      expect([d25, d32, d40].map((k) => k.attrs['aria-pressed'])).toEqual(['false', 'true', 'false']);
      const dick = perLabel(u, 'Dickere Leitungen ab Heizzentrale Stufe 2');
      expect(gesperrtMitHinweis(dick)).toBe(true);
      expect(dick.textContent, 'kurz „St. 2“ mit geschütztem Leerzeichen (12.18, Antwort 1)').toBe('St. 2');
      expect(schloss(dick)).toBe(true);
      expect(leiste(u).textContent, 'Kennzeile der gewählten Leitung').toContain('bis 25 kW · 560 €/Feld');
    });
  });

  it('a92 12.18: Radierer an – Wort bleibt „Radierer“, aria-pressed="true", Kennzeile „Leitung antippen = löschen“', async () => {
    const s = offen(neu(1));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      hilfeZu(u);
      expect(einer(u, 'Radierer').attrs['aria-pressed']).toBe('false');
      einer(u, 'Radierer').click();
      hilfeZu(u);
      const r = einer(u, 'Radierer');
      expect(norm(r.textContent)).toBe('Radierer');
      expect(r.attrs['aria-pressed']).toBe('true');
      expect(norm(leiste(u).textContent)).toContain('Leitung antippen = löschen');
    });
  });

  it('a92 12.18: T-Stück an (Stufe 4) – aria-pressed="true", Kennzeile „Geplante Leitung antippen“', async () => {
    const s = offen(neu(4));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      hilfeZu(u);
      expect(einer(u, 'T-Stück mit Vorsehung').attrs['aria-pressed']).toBe('false');
      einer(u, 'T-Stück mit Vorsehung').click();
      hilfeZu(u);
      expect(einer(u, 'T-Stück mit Vorsehung').attrs['aria-pressed']).toBe('true');
      expect(norm(leiste(u).textContent)).toContain('Geplante Leitung antippen');
    });
  });

  it('a92 12.18 Erste Nutzung: neues Spiel zeigt die Hilfe ([?] aria-expanded="true"), [Verstanden] schließt sie und gibt den Fokus an [?]', async () => {
    const s = offen(neu(1));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      expect(hilfeKnopf(u).attrs['aria-expanded']).toBe('true');
      expect(norm(leiste(u).textContent)).toContain('Zieh die Leitung mit dem Finger');
      const v = verstandenSichtbar(u);
      expect(v, '[Verstanden] sichtbar').toBeDefined();
      expect(sichtbar(abschliessen(u)), 'Aktionsleiste bleibt sichtbar').toBe(true);
      v!.click();
      expect(hilfeKnopf(u).attrs['aria-expanded']).toBe('false');
      expect(verstandenSichtbar(u)).toBeUndefined();
      expect(u.dom.doc.activeElement, 'Fokus zurück auf [?]').toBe(hilfeKnopf(u));
      expect(sichtbar(zurueck(u)), 'Bedienelemente sichtbar').toBe(true);
      hilfeKnopf(u).click();
      expect(hilfeKnopf(u).attrs['aria-expanded'], '[?] öffnet die Hilfe wieder').toBe('true');
      expect(verstandenSichtbar(u)).toBeDefined();
    });
  });

  it('a92 12.18 Erste Nutzung: Karte ist bei offener Hilfe schon bedienbar (Strich zählt, Abschließen wird frei)', async () => {
    const s = offen(neu(1));
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      expect(verstandenSichtbar(u), 'Hilfe offen').toBeDefined();
      zeichneEinFeld(u, s);
      expect(geplante(s)).toBe(1);
      expect(gesperrtMitHinweis(abschliessen(u))).toBe(false);
    });
  });

  it('a92 12.21 Erste Nutzung je Spielstand: Merke steht im Spielstand und übersteht Neuladen (leerer localStorage)', async () => {
    const s = offen(neu(1));
    let text = '';
    await echteSteuerung(s, (u) => {
      u.st.stempeln('d25');
      expect(verstandenSichtbar(u), 'erstes Öffnen: Hilfe').toBeDefined();
      verstandenSichtbar(u)!.click();
      text = serialisieren(s.stand);
    });
    const geladen = new Spiel(laden(text, T0), () => T0);
    await echteSteuerung(geladen, (u) => {
      u.st.stempeln('d25');
      expect(verstandenSichtbar(u), 'nach Neuladen: keine Hilfe').toBeUndefined();
      expect(hilfeKnopf(u).attrs['aria-expanded']).toBe('false');
      expect(sichtbar(perLabel(u, '25er-Leitung, bis 15 kW')), 'Bedienelemente').toBe(true);
    }, { speicher: new Map() });
    // Gegenprobe: ein anderer, neuer Spielstand zeigt die Hilfe wieder (Merke gilt je Spielstand, nicht je Gerät)
    await echteSteuerung(offen(neu(1)), (u) => {
      u.st.stempeln('d25');
      expect(verstandenSichtbar(u)).toBeDefined();
    });
  });
});

// ───────────── 12.21 Punkt 2 und 3: Helfer-Knopf im Hausblatt ─────────────

const hausMitStation = (s: Spiel): Objekt => s.stand.objekte.find((o) => KATALOG[o.typ].kategorie === 'haus' && o.station && !o.ohne_station)!;
const andereHaeuser = (s: Spiel, o: Objekt): Objekt[] => s.stand.objekte.filter((x) => KATALOG[x.typ].kategorie === 'haus' && x !== o);
const helferKnopf = (u: EchteUmgebung): El => {
  const k = knoepfe(u).filter((e) => / beauftragen|Alle Helfer beschäftigt/.test(e.textContent));
  expect(k.map((e) => e.textContent), 'genau ein Helfer-Knopf im Hausblatt').toHaveLength(1);
  return k[0];
};
const helferName = (k: El): string => norm(k.textContent).split(' · ')[0];

describe('A92 / 12.21 Punkt 2 – H7 Helfer-Knopf mit Geld-Sperre', () => {
  it('a92 H7: 1.234,40 € statt 1.500 € – gesperrt, Zeile 2 bleibt Preis · Zeit, kein Schloss, Fehlbetrag aufgerundet 266 €, nichts gekauft', async () => {
    const uhr = { t: T0 }, s = neu(3, uhr), o = hausMitStation(s);
    expect(o, 'Testaufbau: Haus mit Station').toBeDefined();
    s.stand.geld_eur = 1_234.4;
    await echteSteuerung(s, (u) => {
      u.st.kontext(o.id);
      const k = helferKnopf(u);
      expect(norm(k.textContent)).toMatch(/^(Sebastian|Christian|Manfred) beauftragen/);
      expect(gesperrtMitHinweis(k), 'aria-disabled ohne disabled').toBe(true);
      expect(norm(k.textContent), 'Zeile 2 = Preis · Zeit wie frei (Hydraulischer Abgleich 1.500 €)').toMatch(/1\.500 € · \d/);
      expect(schloss(k), 'Geld: kein Schloss').toBe(false);
      k.click();
      expect(norm(u.meldung())).toBe(GELD_HINWEIS('266 €'));
    }, { uhr: () => uhr.t });
    expect(s.stand.geld_eur).toBe(1_234.4);
    expect(o.upgrade_auftrag).toBeFalsy();
  });

  it('a92 H7 + Antwort 7: Geld kommt bei offenem Blatt – Tippen beauftragt den Helfer und bucht 1.500 € ab', async () => {
    const uhr = { t: T0 }, s = neu(3, uhr), o = hausMitStation(s);
    s.stand.geld_eur = 1_499;
    await echteSteuerung(s, (u) => {
      u.st.kontext(o.id);
      const k = helferKnopf(u);
      expect(gesperrtMitHinweis(k)).toBe(true);
      k.click();
      expect(norm(u.meldung())).toBe(GELD_HINWEIS('1 €'));
      s.stand.geld_eur = 1_700;
      helferKnopf(u).click();
    }, { uhr: () => uhr.t });
    expect(o.upgrade_auftrag?.helfer).toBe(HELFER[0]);
    expect(s.stand.geld_eur).toBe(200);
  });

  it('a92 H7 Rangfolge: beschäftigt › ohne Station › Geld', async () => {
    // (a) alle drei Gründe → H3
    const uhr = { t: T0 }, s = neu(3, uhr), o = hausMitStation(s);
    o.ohne_station = true; delete o.station; s.stand.geld_eur = 0; s.neuBerechnen();
    HELFER.forEach((h, i) => { andereHaeuser(s, o)[i].upgrade_auftrag = { helfer: h, ende_ms: T0 + 120_000 + i * 60_000 }; });
    await echteSteuerung(s, (u) => {
      u.st.kontext(o.id);
      const k = helferKnopf(u);
      expect(norm(k.textContent)).toContain('nächster frei in 2m');
      k.click();
      expect(norm(u.meldung())).toBe(H3_HINWEIS('2m'));
    }, { uhr: () => uhr.t });
    // (b) ohne Station + kein Geld → H4, nicht Geld
    const s2 = neu(3), o2 = hausMitStation(s2);
    o2.ohne_station = true; delete o2.station; s2.stand.geld_eur = 0; s2.neuBerechnen();
    await echteSteuerung(s2, (u) => {
      u.st.kontext(o2.id);
      const k = helferKnopf(u);
      expect(norm(k.textContent)).toContain('erst Station wählen');
      expect(schloss(k)).toBe(true);
      k.click();
      expect(norm(u.meldung())).toBe(H4_HINWEIS);
    });
  });
});

describe('A92 / 12.21 Punkt 3 – beim Tippen alle Gründe neu prüfen, der nächste geltende wird gezeigt', () => {
  it('a92 Punkt 3: Helfer wird frei, Haus ohne Station – Tippen zeigt H4 (nicht Kerntext), Blatt baut neu auf mit „erst Station wählen“, kein Auftrag, kein Geld weg', async () => {
    const uhr = { t: T0 }, s = neu(3, uhr), o = hausMitStation(s);
    o.ohne_station = true; delete o.station; s.neuBerechnen();
    HELFER.forEach((h, i) => { andereHaeuser(s, o)[i].upgrade_auftrag = { helfer: h, ende_ms: T0 + 60_000 + i * 60_000 }; });
    await echteSteuerung(s, (u) => {
      u.st.kontext(o.id);
      const alt = helferKnopf(u);
      expect(norm(alt.textContent)).toContain('nächster frei in 1m');
      uhr.t = T0 + 60_000; s.bis(uhr.t); // der erste Helfer ist fertig, das Blatt steht noch
      const geld = s.stand.geld_eur;
      alt.click();
      expect(norm(u.meldung()), 'Meldung = H4 im Wortlaut 12.20').toBe(H4_HINWEIS);
      const neuK = helferKnopf(u);
      expect(norm(neuK.textContent), 'Zeile 2 nennt denselben Grund').toContain('erst Station wählen');
      expect(schloss(neuK)).toBe(true);
      expect(s.stand.geld_eur).toBe(geld);
      expect(helferName(neuK)).not.toBe('');
    }, { uhr: () => uhr.t });
    expect(o.upgrade_auftrag).toBeFalsy();
  });
});

// ───────────── 12.16 / 12.21 Punkt 4: Reiter ─────────────

describe('A92 / 12.16 + 12.21 Punkt 4 – Baumenü-Reiter (Rollen und Auswahl)', () => {
  const NAMEN = ['Heizhaus', 'Außenanlagen', 'Leitungen', 'Dorf', 'Deko'];
  it('a92 12.16: tablist mit fünf tab, aria-label voller Name, je ein Symbol, genau einer aria-selected="true" (die übrigen "false")', async () => {
    const s = neu(1);
    await echteSteuerung(s, (u) => {
      u.st.katalog('netz');
      const listen = u.dom.html.querySelectorAll('[role="tablist"]');
      expect(listen).toHaveLength(1);
      const tabs = listen[0].querySelectorAll('[role="tab"]');
      expect(tabs.map((t) => t.attrs['aria-label'])).toEqual(NAMEN);
      for (const t of tabs) expect(t.querySelectorAll('svg').length, `Symbol in ${t.attrs['aria-label']}`).toBeGreaterThanOrEqual(1);
      expect(tabs.map((t) => t.attrs['aria-selected'])).toEqual(['false', 'false', 'true', 'false', 'false']);
    });
  });

  it('a92 12.16: Reiter „Deko“ antippen – danach ist genau „Deko“ ausgewählt', async () => {
    const s = neu(1);
    await echteSteuerung(s, (u) => {
      u.st.katalog('innen');
      const tab = (n: string): El => u.dom.html.querySelectorAll('[role="tab"]').find((t) => t.attrs['aria-label'] === n)!;
      expect(tab('Heizhaus').attrs['aria-selected']).toBe('true');
      tab('Deko').click();
      const sel = u.dom.html.querySelectorAll('[role="tab"]').filter((t) => t.attrs['aria-selected'] === 'true').map((t) => t.attrs['aria-label']);
      expect(sel).toEqual(['Deko']);
    });
  });
});

// ───────────── 12.17: Meldung (Dauer, nur eine) ─────────────

describe('A92 / 12.17 + 12.21 Punkt 4 – Meldung: Dauer und höchstens eine', () => {
  /** sichtbar = 1000 ms + 60 ms je Zeichen, mindestens 2000, höchstens 6000; danach 200 ms Blende (Werte von Hand) */
  const faelle: Array<[number, number]> = [[13, 2000], [20, 2200], [30, 2800], [46, 3760], [84, 6000], [120, 6000]];
  for (const [laenge, dauer] of faelle) {
    it(`a92 12.17: Meldung mit ${laenge} Zeichen steht ${dauer} ms (+200 ms Blende)`, async () => {
      vi.useFakeTimers();
      const s = neu(1);
      await echteSteuerung(s, async (u) => {
        const { toast } = await import('../src/ui/toast');
        const text = ('Meldung ' + 'x'.repeat(200)).slice(0, laenge);
        toast(text);
        vi.advanceTimersByTime(dauer - 60);
        expect(u.meldung(), `nach ${dauer - 60} ms noch da`).toBe(text);
        vi.advanceTimersByTime(60 + 200 + 60);
        expect(u.meldung(), `nach ${dauer + 260} ms weg`).toBe('');
      });
    });
  }

  it('a92 12.21: 46 Zeichen – nach 3,5 s da, nach 4,2 s weg (Prüfpunkte der Vorgabe)', async () => {
    vi.useFakeTimers();
    await echteSteuerung(neu(1), async (u) => {
      const { toast } = await import('../src/ui/toast');
      const text = 'Hausanschluss geplant: 1 Felder, 25er-Leitung.';
      expect(text.length).toBe(46);
      toast(text);
      vi.advanceTimersByTime(3_500);
      expect(u.meldung()).toBe(text);
      vi.advanceTimersByTime(700);
      expect(u.meldung()).toBe('');
    });
  });

  it('a92 12.17: derselbe Text erneut startet nur die Zeit neu (ein Element, steht ab dem zweiten Aufruf wieder volle Dauer)', async () => {
    vi.useFakeTimers();
    await echteSteuerung(neu(1), async (u) => {
      const { toast } = await import('../src/ui/toast');
      toast('Tempo: Normal'); // 13 Zeichen → 2000 ms
      vi.advanceTimersByTime(1_500);
      toast('Tempo: Normal');
      vi.advanceTimersByTime(1_900);
      expect(u.meldung(), '3,4 s nach dem ersten, 1,9 s nach dem zweiten Aufruf').toBe('Tempo: Normal');
      expect(u.dom.html.querySelectorAll('#toast .toast')).toHaveLength(1);
      vi.advanceTimersByTime(400);
      expect(u.meldung()).toBe('');
    });
  });

  it('a92 12.21: zwei verschiedene Texte schnell hintereinander – genau ein #toast .toast mit dem zweiten Text, role="status", aria-live="polite"', async () => {
    await echteSteuerung(neu(1), async (u) => {
      const { toast } = await import('../src/ui/toast');
      toast('Erste Meldung');
      toast('Zweite Meldung');
      const el = u.dom.html.querySelectorAll('#toast .toast');
      expect(el).toHaveLength(1);
      expect(el[0].textContent).toBe('Zweite Meldung');
      const w = u.dom.doc.getElementById('toast')!;
      expect([w.attrs.role, w.attrs['aria-live']]).toEqual(['status', 'polite']);
    });
  });
});
