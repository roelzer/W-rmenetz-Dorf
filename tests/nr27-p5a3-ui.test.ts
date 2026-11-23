import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

// NR27 P5a3 (DESIGN 14.5, 14.7; Bauplan P5 „Erklärkarte“, Nachtrag 3.1 Punkt 4): Erklärkarte, (i)-Knopf, Leitungsblatt,
// Katalog bei Höchststufe, Sprecherblase. Der Fachtext-Schalter wird nur hier im Test umgeschaltet: nordText wird durch die
// echte Funktion mit `freigegeben = schalter.frei` ersetzt. Im Spielcode gibt es keinen Schalter.
const schalter = vi.hoisted(() => ({ frei: false }));
vi.mock('../src/core/nord-texte', async (orig) => {
  const echt = await orig<typeof import('../src/core/nord-texte')>();
  return { ...echt, nordText: (id: Parameters<typeof echt.nordText>[0], werte?: Record<string, string | number>, frei?: boolean) => echt.nordText(id, werte, frei ?? schalter.frei) };
});

import tokens from '../design/tokens.json';
import { KONSTANTEN } from '../src/core/katalog';
import { nordText, type NordTextId } from '../src/core/nord-texte';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import { dauerText } from '../src/render/gebaeude';
import { echteSteuerung, tippe, type EchteUmgebung } from './hilfen/echte-steuerung';
import { sichtbarerText, type El } from './hilfen/dom-attrappe';

const T0 = 1_700_000_000_000;
/** Text aus der echten Tabelle; Fachtexte immer mit Freigabe, damit „kommt nicht vor“ etwas Echtes prüft. */
const t = (id: NordTextId, werte?: Record<string, string | number>): string => nordText(id, werte, true) as string;
const eur = (n: number): string => `${n.toLocaleString('de-DE')} €`;
const norm = (s: string): string => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function spiel(stufe: number): Spiel {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  st.geld_eur = 10_000_000; st.taler = 10_000;
  st.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(st, () => T0);
  sp.neuBerechnen();
  sp.ereignisse.splice(0);
  return sp;
}
const infoKnopf = (u: EchteUmgebung): El | undefined => u.dom.html.querySelectorAll('[data-ziel="bahn_info"]')[0];
const karte = (u: EchteUmgebung): El | null => u.dom.html.querySelector('#bahn-karte');
const knopfMitText = (wurzel: El, text: string): El | undefined => wurzel.querySelectorAll('button').find((k) => norm(k.textContent) === text);
const katalogOffen = (u: EchteUmgebung): boolean => u.dom.html.querySelector('[data-ziel="kasten_abschnitt"]')?.isConnected === true;
const lies = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const regeln = (css: string, selektor: string): string => {
  const esc = selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|[}\\s,])${esc}\\{([^}]*)\\}`, 'gm'))].map((m) => m[1]).join(';');
};

/** Katalog „netz“ öffnen und die Erklärkarte über das (i) aufrufen; liefert (i) und Karte. */
function karteOeffnen(u: EchteUmgebung): { info: El; k: El } {
  u.st.katalog('netz');
  const info = infoKnopf(u);
  expect(info, 'Testaufbau: (i) im Kasten „Bauabschnitt“').toBeDefined();
  info!.focus();
  tippe(info!);
  const k = karte(u);
  expect(k, 'Erklärkarte offen').not.toBeNull();
  return { info: info!, k: k! };
}

describe('NR27 P5a3 Erklärkarte mit Fachtext-Freigabe (DESIGN 14.7)', () => {
  // Fehler, die ihn rot machen: Karte fehlt, ein Satz/Chip/„vereinfacht“ fehlt, Chip ohne Wert aus dem Kern, Bild fehlt oder
  // ohne Alt-Text, Karte über blattOeffnen (schlösse den Katalog darunter), kein Dialog/aria-modal, Fokus nicht auf [Verstanden].
  it('test_nr27_erklaerkarte_mit_freigabe: eigenes Popup mit Bild, KARTE_1–5, Chips und [Verstanden]; Katalog bleibt offen', async () => {
    schalter.frei = true;
    await echteSteuerung(spiel(6), (u) => {
      const { k } = karteOeffnen(u);
      expect(katalogOffen(u), 'Katalog darunter bleibt offen').toBe(true);
      const dialog = k.querySelector('[role="dialog"]');
      expect(dialog, 'Dialog').not.toBeNull();
      expect(dialog!.getAttribute('aria-modal')).toBe('true');
      expect(k.querySelectorAll('.abdunkeln')).toHaveLength(1);
      const text = norm(sichtbarerText(k));
      for (const id of ['KARTE_TITEL', 'KARTE_1', 'KARTE_2', 'KARTE_3', 'KARTE_4', 'KARTE_5'] as NordTextId[]) expect(text, id).toContain(t(id));
      const chips = k.querySelectorAll('.chip').map((c) => norm(c.textContent));
      expect(chips).toEqual([
        t('KARTE_CHIP_FELD', { preis: eur(KONSTANTEN.querung_eur_je_feld) }),
        t('KARTE_CHIP_ZUSCHLAG', { querung_zeit: dauerText(KONSTANTEN.querung_bau_s * KONSTANTEN.bauzeit_faktor) }),
      ]);
      expect(chips[0]).toBe('45.000 € je Gleisfeld');
      const bild = k.querySelectorAll('svg').find((s) => s.getAttribute('role') === 'img') ?? null;
      expect(bild, 'Erklärbild').not.toBeNull();
      expect(bild!.getAttribute('quelle'), 'Bild aus design/nr27-erklaerbild-querschnitt.svg').toContain('viewBox="0 0 176 132"');
      expect(bild!.getAttribute('role')).toBe('img');
      expect(bild!.getAttribute('aria-label')).toBe(t('KARTE_ALT'));
      const verstanden = knopfMitText(k, 'Verstanden');
      expect(verstanden, '[Verstanden]').toBeDefined();
      expect(u.dom.doc.activeElement, 'Fokus beim Öffnen auf [Verstanden]').toBe(verstanden);
    });
  });

  // Fehler, die ihn rot machen: Schließen entfernt die Karte nicht, Fokus bleibt irgendwo, Katalog geht mit zu.
  it('[Verstanden] und ✕ schließen nur die Karte, Fokus zurück aufs (i)', async () => {
    schalter.frei = true;
    await echteSteuerung(spiel(6), (u) => {
      let { info, k } = karteOeffnen(u);
      tippe(knopfMitText(k, 'Verstanden')!);
      expect(karte(u), 'nach [Verstanden] zu').toBeNull();
      expect(katalogOffen(u)).toBe(true);
      expect(u.dom.doc.activeElement).toBe(info);
      ({ info, k } = karteOeffnen(u));
      tippe(k.querySelector('button.schliessen')!);
      expect(karte(u), 'nach ✕ zu').toBeNull();
      expect(katalogOffen(u)).toBe(true);
      expect(u.dom.doc.activeElement).toBe(info);
    });
  });

  // Fehler, die ihn rot machen: Esc erreicht das Blatt darunter (kein stopPropagation – im Browser schlösse es den Katalog),
  // Esc schließt nicht, Tab läuft aus dem Popup heraus.
  it('Esc schließt die Karte ohne Weitergabe; Tab bleibt im Popup', async () => {
    schalter.frei = true;
    await echteSteuerung(spiel(6), (u) => {
      const { info, k } = karteOeffnen(u);
      const dialog = k.querySelector('[role="dialog"]')!;
      const zu = k.querySelector('button.schliessen')!, verstanden = knopfMitText(k, 'Verstanden')!;
      const stopp = vi.fn();
      const tab = dialog.ausloesen('keydown', { key: 'Tab', shiftKey: false, stopPropagation: stopp });
      expect(tab.defaultPrevented).toBe(true);
      expect(u.dom.doc.activeElement, 'Tab vom letzten auf das erste').toBe(zu);
      const zurueck = dialog.ausloesen('keydown', { key: 'Tab', shiftKey: true, stopPropagation: stopp });
      expect(zurueck.defaultPrevented).toBe(true);
      expect(u.dom.doc.activeElement, 'Umschalt+Tab vom ersten auf das letzte').toBe(verstanden);
      expect(stopp).toHaveBeenCalledTimes(2);
      dialog.ausloesen('keydown', { key: 'Escape', stopPropagation: stopp });
      expect(stopp).toHaveBeenCalledTimes(3);
      expect(karte(u), 'Esc schließt').toBeNull();
      expect(katalogOffen(u)).toBe(true);
      expect(u.dom.doc.activeElement).toBe(info);
    });
  });

  // Fehler, der ihn rot macht: (i) nur 24 px groß (Symbolgröße) statt 44 px Tippfläche (DESIGN 14.15, CLAUDE.md).
  it('Tippfläche des (i) mindestens 44 × 44 px', () => {
    const r = regeln(lies('src/ui/stil.css'), '.info-knopf');
    expect(r).toMatch(/(?:^|;)width:var\(--groesse-px-tippflaeche-min\)/);
    expect(r).toMatch(/(?:^|;)height:var\(--groesse-px-tippflaeche-min\)/);
    expect(tokens.groesse_px.tippflaeche_min).toBeGreaterThanOrEqual(44);
  });
});

describe('NR27 P5a3 (i)-Knopf im Katalog „netz“ (DESIGN 14.5, 14.7)', () => {
  // Fehler, die ihn rot machen: (i) fehlt trotz Freigabe, falsche Beschriftung für Vorleser, kein echter Knopf,
  // Antippen öffnet nichts; ohne Freigabe dürfte es ihn nicht geben (Gegenstück in tests/nr27-p5a-katalog.test.ts).
  it('mit Freigabe: [data-ziel="bahn_info"] mit aria-label „Info: Warum so teuer?“ öffnet die Erklärkarte', async () => {
    schalter.frei = true;
    await echteSteuerung(spiel(6), (u) => {
      u.st.katalog('netz');
      const knoepfe = u.dom.html.querySelectorAll('[data-ziel="bahn_info"]');
      expect(knoepfe).toHaveLength(1);
      const info = knoepfe[0];
      expect(info.tag.toLowerCase()).toBe('button');
      expect(info.getAttribute('aria-label')).toBe('Info: Warum so teuer?');
      expect(info.closest('[data-ziel="bahn_infozeile"]'), 'sitzt in der Infozeile').not.toBeNull();
      expect(karte(u)).toBeNull();
      tippe(info);
      expect(karte(u), 'Antippen öffnet die Erklärkarte').not.toBeNull();
    });
  });
});

describe('NR27 P5a3 Leitungsblatt der Querung (DESIGN 14.6 T20, 14.7)', () => {
  /** Spiel mit Leitungen auf den Feldern; `geplant` wie im Bauabschnitt. Liefert Spiel und die Kennungen der Leitungen. */
  function mitLeitungen(felder: Array<[number, number, boolean]>): { sp: Spiel; ids: number[] } {
    const sp = spiel(6);
    const ids = felder.map(([x, y, geplant]) => {
      const id = sp.stand.naechste_id++;
      sp.stand.objekte.push({ id, typ: 'd40', x, y, stufe: 1, bau: null, kasse_eur: 0, ...(geplant ? { geplant: true } : {}) });
      return id;
    });
    sp.neuBerechnen();
    return { sp, ids };
  }
  const blattText = (u: EchteUmgebung): string => norm(sichtbarerText(u.dom.html.querySelector('.blatt')!));
  const kartenKasten = (u: EchteUmgebung): El | undefined => u.dom.html.querySelectorAll('.blatt .kasten').find((k) => norm(k.querySelector('h3')?.textContent ?? '') === t('KARTE_TITEL'));

  // Fehler, die ihn rot machen: Zeile fehlt, Länge falsch (feste Zahl, nur dieses Feld, geplante mitgezählt), Zeile auch auf
  // normalen oder geplanten Leitungen.
  it('gebaute Leitung auf Bahnfeld zeigt BLATT_ZEILE mit Länge aller gebauten Bahn-Leitungen; sonst keine Zeile', async () => {
    schalter.frei = false;
    expect(KONSTANTEN.feldlaenge_m).toBe(10);
    const zwei = mitLeitungen([[10, -2, false], [10, -3, false], [10, -1, false]]);
    await echteSteuerung(zwei.sp, (u) => {
      u.st.kontext(zwei.ids[0]);
      expect(blattText(u)).toContain(t('BLATT_ZEILE', { laenge_m: 20 }));
      expect(blattText(u)).toContain('Bahnquerung · unter den Gleisen · 20 m');
      u.st.kontext(zwei.ids[2]);
      expect(blattText(u), 'Leitung neben der Bahn').not.toContain('unter den Gleisen');
    });
    const eine = mitLeitungen([[10, -2, false], [10, -3, true]]);
    await echteSteuerung(eine.sp, (u) => {
      u.st.kontext(eine.ids[0]);
      expect(blattText(u), 'geplante zählt nicht').toContain('Bahnquerung · unter den Gleisen · 10 m');
      u.st.kontext(eine.ids[1]);
      expect(blattText(u), 'geplante Leitung auf Bahnfeld').not.toContain('unter den Gleisen');
    });
  });

  // Fehler, die ihn rot machen: Kasten/(i) auch ohne Freigabe (Platzhalter vor Spielern), mit Freigabe fehlend, (i) öffnet
  // nichts oder schließt das Leitungsblatt.
  it('Kasten „Warum so teuer?“ mit (i) nur mit Freigabe; (i) öffnet die Karte über dem Blatt', async () => {
    const { sp, ids } = mitLeitungen([[10, -2, false], [10, -3, false]]);
    schalter.frei = false;
    await echteSteuerung(sp, (u) => {
      u.st.kontext(ids[0]);
      expect(kartenKasten(u)).toBeUndefined();
      expect(u.dom.html.querySelectorAll('[data-ziel="bahn_info"]')).toHaveLength(0);
      expect(blattText(u)).not.toContain(t('KARTE_TITEL'));
    });
    schalter.frei = true;
    await echteSteuerung(sp, (u) => {
      u.st.kontext(ids[0]);
      const kasten = kartenKasten(u);
      expect(kasten, 'Kasten mit Titel KARTE_TITEL').toBeDefined();
      const info = kasten!.querySelector('[data-ziel="bahn_info"]');
      expect(info?.getAttribute('aria-label')).toBe('Info: Warum so teuer?');
      tippe(info!);
      expect(karte(u), 'Erklärkarte offen').not.toBeNull();
      expect(kasten!.isConnected, 'Leitungsblatt bleibt offen').toBe(true);
    });
  });
});

describe('NR27 P5a3 Katalogkarte bei Höchststufe (Bauplan P3 Regel 9, ENTSCHEIDUNGEN 23.11.)', () => {
  /** Spiel mit `n` gebauten 25er-Leitungen außerhalb des Dorfs (Muster tests/nr27-bahnquerung.test.ts „Leitungsgrenze“). */
  function voll(stufe: number, n: number): Spiel {
    const sp = spiel(stufe);
    for (let i = 0; i < n; i++) sp.stand.objekte.push({ id: sp.stand.naechste_id++, typ: 'd25', x: 0, y: 100 + i, stufe: 1, bau: null, kasse_eur: 0 });
    return sp;
  }
  const grund = (u: EchteUmgebung): string => norm(u.dom.html.querySelector('.bkarte[data-typ="d25"] .grund')?.textContent ?? '');

  // Fehler, die ihn rot machen: bei Stufe 6 weiter „mehr ab nächster Stufe“ (es gibt keine nächste), Text nicht aus der
  // Tabelle, Zähler fehlt; die Prüfung mit Stufe 5 fängt den umgekehrten Fehler (Höchststufen-Text schon vorher).
  it('volle Leitungsgrenze: Stufe 6 zeigt HOECHSTSTUFE, Stufe 5 weiter „mehr ab nächster Stufe“', async () => {
    schalter.frei = false;
    expect(KONSTANTEN.heizzentrale_hoechststufe).toBe(6);
    await echteSteuerung(voll(6, 360), (u) => {
      u.st.katalog('netz');
      expect(grund(u)).toBe(`360/360 · ${t('HOECHSTSTUFE')}`);
      expect(grund(u)).toBe('360/360 · höchste Stufe erreicht');
    });
    await echteSteuerung(voll(5, 240), (u) => {
      u.st.katalog('netz');
      expect(grund(u)).toBe('240/240 · mehr ab nächster Stufe');
    });
  });
});
