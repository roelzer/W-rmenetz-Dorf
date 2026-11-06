import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Spiel } from '../src/core/spiel';
import { neuesSpielMitTutorial } from '../src/core/start';
import { echteSteuerung } from './hilfen/echte-steuerung';

// Bauplan NR13 Fassung 3.1, Paket P4 (Einbindung) – Teil 1: Steuerung hält das Tutorial, Meldungen stumm, nachTutorial,
// „Willkommen zurück“ entfällt im Tutorial (K6).
const T0 = 1_000_000;
const ohneKommentare = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

type St = {
  anleitungAnsicht(): { wiedereinstieg: boolean; art: string } | null;
  nachTutorial(f: () => void): void;
  toast(t: string): void;
  toastWichtig(t: string): void;
};

describe('NR13 P4 Einbindung', () => {
  it('test_nr13_kein_willkommen_zurueck: die A38-Meldung hängt an !spiel.tutorialAktiv()', () => {
    const main = ohneKommentare(readFileSync('src/main.ts', 'utf8'));
    const zeile = main.split('\n').find((z) => z.includes('5 * 60_000'));
    expect(zeile).toBeDefined();
    expect(zeile).toContain('!spiel.tutorialAktiv()');
  });

  it('test_nr13_meldungen_stumm: im Tutorial schweigt toast(), toastWichtig erscheint', async () => {
    const uhr = (): number => T0;
    await echteSteuerung(new Spiel(neuesSpielMitTutorial(T0), uhr), ({ st, meldung }) => {
      const s = st as unknown as St;
      s.toast('Gewöhnliche Meldung');
      expect(meldung()).toBe('');
      s.toastWichtig('Speichern geht gerade nicht');
      expect(meldung()).toBe('Speichern geht gerade nicht');
    }, { uhr });
  });

  it('test_nr13_anleitung_ansicht: Stand mit Merke und namen_gefragt → erste Blase ist der Wiedereinstieg', async () => {
    const uhr = (): number => T0;
    await echteSteuerung(new Spiel(neuesSpielMitTutorial(T0), uhr), ({ st }) => {
      const a = (st as unknown as St).anleitungAnsicht();
      expect(a?.wiedereinstieg).toBe(true);
      expect(a?.art).toBe('W');
    }, { uhr });
  });

  it('test_nr13_ohne_tutorial_kein_stumm: ohne Merke keine Ansicht, toast() sichtbar, nachTutorial sofort', async () => {
    const uhr = (): number => T0;
    const spiel = new Spiel(neuesSpielMitTutorial(T0), uhr);
    spiel.tutorialUeberspringen();
    await echteSteuerung(spiel, ({ st, meldung }) => {
      const s = st as unknown as St;
      expect(s.anleitungAnsicht()).toBeNull();
      s.toast('Hallo');
      expect(meldung()).toBe('Hallo');
      let gerufen = 0;
      s.nachTutorial(() => { gerufen++; });
      expect(gerufen).toBe(1);
    }, { uhr });
  });

  it('test_nr13_nach_tutorial_wartet: solange das Tutorial läuft, wird nachTutorial nicht sofort ausgeführt', async () => {
    const uhr = (): number => T0;
    await echteSteuerung(new Spiel(neuesSpielMitTutorial(T0), uhr), ({ st }) => {
      let gerufen = 0;
      (st as unknown as St).nachTutorial(() => { gerufen++; });
      expect(gerufen).toBe(0);
    }, { uhr });
  });
});

describe('NR13 P4 Einbindung – Ende', () => {
  it('test_nr13_ende_stumm_aus_und_nach_tutorial: endet das Tutorial, ist toast() wieder sichtbar und nachTutorial läuft nach 600 ms', async () => {
    vi.useFakeTimers();
    try {
      const uhr = (): number => T0;
      const spiel = new Spiel(neuesSpielMitTutorial(T0), uhr);
      await echteSteuerung(spiel, ({ st, meldung }) => {
        const s = st as unknown as St & { tick(t: number): void };
        let gerufen = 0;
        s.nachTutorial(() => { gerufen++; });
        spiel.tutorialBeenden();
        s.tick(T0);
        expect(s.anleitungAnsicht()).toBeNull();
        vi.advanceTimersByTime(599);
        expect(gerufen).toBe(0);
        vi.advanceTimersByTime(1);
        expect(gerufen).toBe(1);
        s.toast('Wieder da');
        expect(meldung()).toBe('Wieder da');
      }, { uhr });
    } finally { vi.useRealTimers(); }
  });
});
