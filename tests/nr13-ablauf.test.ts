import { describe, expect, it } from 'vitest';
import { KATALOG } from '../src/core/katalog';
import { laden, serialisieren } from '../src/core/speichern';
import { Spiel } from '../src/core/spiel';
import { ERSTE_HAEUSER, TUTORIAL_SPUR, neuesSpielMitTutorial } from '../src/core/start';
import { Tutorial } from '../src/core/tutorial';
import type { TippMeldung } from '../src/core/tutorial-vertrag';
import { altesStartdorf } from './hilfen/altes-startdorf';

// Bauplan NR13 Fassung 3.1, Paket P4: Ablauf mit echtem Spiel und echtem Tutorial, ohne Oberfläche, Uhr von Hand.
// Die Ereignisse des Spiels gehen wie in steuerung.ts ans Tutorial; Tipps meldet der Test so, wie die Oberfläche sie meldet.
// Neu laden wie main.ts: Text lesen → new Spiel → spiel.bis(jetzt) → Tutorial mit Wiedereinstieg.
const T0 = 1_000_000;

function fahrer(s: Spiel, uhr: { t: number }, opt?: { wiedereinstieg?: boolean }) {
  const t = new Tutorial(s, opt);
  const melden = (): void => { for (const ev of s.ereignisse.splice(0)) if (ev.art === 'schritt') t.schritt(ev); };
  const jetzt = (): string | undefined => t.ansicht(uhr.t)?.schritt;
  const tippe = (m: Omit<TippMeldung, 'art'>): void => { t.tipp({ art: 'tipp', ...m } as TippMeldung); melden(); };
  const haus = (k: readonly [number, number]) => s.stand.objekte.find((o) => o.x === k[0] && o.y === k[1] && KATALOG[o.typ].kategorie === 'haus')!;
  const [h1, h2] = ERSTE_HAEUSER.map(haus);
  return { t, melden, jetzt, tippe, h1, h2, warte: (ms: number): void => { uhr.t += ms; s.bis(uhr.t); melden(); } };
}
type Fahrer = ReturnType<typeof fahrer>;

function neuesSpiel(uhr: { t: number }): Spiel {
  const s = new Spiel(neuesSpielMitTutorial(T0), () => uhr.t);
  s.namenSetzen('Anna', 'Heatville'); // ohne Namen zeigt das Tutorial noch keine Blase (Namensfenster zuerst)
  return s;
}
/** Neu laden wie main.ts; die erste Blase ist der Wiedereinstieg, [Weiter] führt zum Schritt aus dem Zustand */
function neuLaden(s: Spiel, uhr: { t: number }, spaeter_ms: number): { s: Spiel; f: Fahrer } {
  const text = serialisieren(s.stand);
  uhr.t += spaeter_ms;
  const neu = new Spiel(laden(text, uhr.t), () => uhr.t);
  neu.bis(uhr.t);
  const f = fahrer(neu, uhr, { wiedereinstieg: true });
  expect(f.t.ansicht(uhr.t)?.wiedereinstieg).toBe(true);
  f.tippe({ tipp: 'weiter' });
  return { s: neu, f };
}

const bisT11 = (s: Spiel, f: Fahrer): void => {
  f.tippe({ tipp: 'heizzentrale' });
  for (let i = 0; i < 6; i++) f.tippe({ tipp: 'weiter' });
  expect(f.jetzt()).toBe('T08');
  f.tippe({ tipp: 'baumenue' }); f.tippe({ tipp: 'reiter_leitungen' });
  expect(f.jetzt()).toBe('T10');
  expect(s.abschnittPlanen().ok).toBe(true); f.melden();
  expect(f.jetzt()).toBe('T11');
};
/** ab T11: Planung abwarten, Spur einzeichnen, abschließen → T15 */
const t11BisT15 = (s: Spiel, f: Fahrer): void => {
  f.warte(10_000); // Tutorial-Planung 10 s (tests/nr13-kern.test.ts, test_nr13_tutorial_zeiten)
  f.tippe({ tipp: 'weiter' });
  const typ = s.tutorialWerte().leitung;
  f.tippe({ tipp: 'leitungskarte', typ });
  expect(f.jetzt()).toBe('T13');
  for (const [x, y] of TUTORIAL_SPUR) { expect(s.platzieren(typ, x, y).ok).toBe(true); f.melden(); }
  expect(f.jetzt()).toBe('T14');
  expect(s.abschnittAbschliessen().ok).toBe(true); f.melden();
  expect(s.abschnittWarnungen()).toEqual([]);
  expect(f.jetzt()).toBe('T15');
};
const t15BisT18 = (s: Spiel, f: Fahrer): void => {
  f.tippe({ tipp: 'haus', objekt_id: f.h1.id }); f.tippe({ tipp: 'weiter' });
  expect(f.jetzt()).toBe('T17');
  expect(s.stationKaufen(f.h1.id, 'hp_800').ok).toBe(true); f.melden();
  expect(f.jetzt()).toBe('T18');
};
const t18BisT23 = (s: Spiel, f: Fahrer): void => {
  f.tippe({ tipp: 'haus', objekt_id: f.h2.id });
  expect(f.jetzt()).toBe('T19');
  expect(s.stationKaufen(f.h2.id, 'hp_800').ok).toBe(true); f.melden();
  expect(f.jetzt()).toBe('T20');
  f.tippe({ tipp: 'baumenue' });
  expect(f.jetzt()).toBe('T21');
  expect(s.materialBestellen().ok).toBe(true); f.melden();
  expect(f.jetzt()).toBe('T22');
  f.tippe({ tipp: 'weiter' });
  expect(f.jetzt()).toBe('T23');
};
const t24BisEnde = (s: Spiel, f: Fahrer): void => {
  for (const id of ['T24', 'T25', 'T26']) { expect(f.jetzt()).toBe(id); f.tippe({ tipp: 'weiter' }); }
  expect(f.t.aktiv()).toBe(false);
  expect(s.stand.tutorial).toBeUndefined();
  expect(s.netz.warm.has(f.h1.id) && s.netz.warm.has(f.h2.id)).toBe(true);
};

describe('NR13 P4 Ablauf ohne Oberfläche', () => {
  it('test_nr13_ablauf_neues_spiel_bis_warm: T01 bis T26 in einem Zug, danach beide Tutorial-Häuser warm und die Merke weg', () => {
    const uhr = { t: T0 }, s = neuesSpiel(uhr), f = fahrer(s, uhr);
    expect(f.jetzt()).toBe('T01');
    bisT11(s, f);
    t11BisT15(s, f);
    t15BisT18(s, f);
    t18BisT23(s, f);
    expect(f.t.ansicht(uhr.t)?.weiter).toBe('wartet');
    for (let i = 0; i < 2; i++) f.warte(10_000); // Tutorial-Bau 20 s
    expect(s.stand.abschnitt).toBeUndefined();
    f.tippe({ tipp: 'weiter' });
    t24BisEnde(s, f);
  });

  it('test_nr13_ablauf_neu_laden_t11_und_t18: Neuladen in T11, T18 und während des Baus → Wiedereinstieg am Schritt aus dem Zustand; im Bau-Fall T24 mit nachgerechneter Wärme', () => {
    const uhr = { t: T0 };
    let s = neuesSpiel(uhr), f = fahrer(s, uhr);
    bisT11(s, f);
    ({ s, f } = neuLaden(s, uhr, 1_000));
    expect(f.jetzt()).toBe('T11');
    t11BisT15(s, f);
    t15BisT18(s, f);
    ({ s, f } = neuLaden(s, uhr, 1_000));
    expect(f.jetzt()).toBe('T18');
    t18BisT23(s, f);
    // App mitten im Bau geschlossen, Stunden später geöffnet: Bau nachgerechnet, Einstieg T24 (nicht T22, Bauplan Abschnitt 12)
    expect(s.netz.warm.has(f.h1.id)).toBe(false);
    ({ s, f } = neuLaden(s, uhr, 3 * 3_600_000));
    expect(s.stand.abschnitt).toBeUndefined();
    expect(s.netz.warm.has(f.h1.id) && s.netz.warm.has(f.h2.id)).toBe(true);
    t24BisEnde(s, f);
    // neu laden nach dem Ende → kein Tutorial mehr
    const danach = new Spiel(laden(serialisieren(s.stand), uhr.t), () => uhr.t);
    expect(danach.tutorialAktiv()).toBe(false);
  });

  it('test_nr13_alter_stand_nie: ein alter Stand ohne Merke bekommt nie ein Tutorial – auch nicht nach Speichern, Laden und Zeit; ein neues Spiel immer', () => {
    const uhr = { t: T0 };
    const alt = new Spiel(laden(serialisieren(altesStartdorf(T0)), T0), () => uhr.t);
    expect(alt.tutorialAktiv()).toBe(false);
    uhr.t += 24 * 3_600_000; alt.bis(uhr.t);
    const wieder = new Spiel(laden(serialisieren(alt.stand), uhr.t), () => uhr.t);
    expect(wieder.tutorialAktiv()).toBe(false);
    expect(wieder.stand.tutorial).toBeUndefined();
    expect(new Spiel(neuesSpielMitTutorial(uhr.t), () => uhr.t).tutorialAktiv()).toBe(true);
  });
});
