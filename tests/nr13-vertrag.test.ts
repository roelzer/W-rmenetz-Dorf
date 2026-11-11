import { describe, expect, it } from 'vitest';
import { ladenMitBefund, serialisieren } from '../src/core/speichern';
import { neuerSpielstand, Spiel, WANDSTATION_TUTORIAL } from '../src/core/spiel';
import { neuesSpielMitTutorial, TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT } from '../src/core/start';
import { altesStartdorf } from './hilfen/altes-startdorf';

// Bauplan docs/bauplaene/NR13-tutorial.md (Fassung 3), Paket P0: Merke `tutorial` nur in neuen Spielen (AE-NR13-1, AE-NR13-3).
const T0 = 1_700_000_000_000;

describe('NR13 Vertrag (P0)', () => {
  it('test_nr13_neues_spiel_hat_merke: ohne Spielstand startet ein neues Spiel mit Tutorial-Kapitel 1', () => {
    const { stand, befund } = ladenMitBefund(null, T0);
    expect(befund).toBe('neu');
    expect(stand.tutorial).toEqual({ kapitel: 1 });
    const s = new Spiel(stand, () => T0);
    expect(s.tutorialAktiv()).toBe(true);
    expect(s.wandstationFrei()).toBe(false);
  });

  it('test_nr13_kaputter_stand_hat_merke: kaputter Text ergibt ein neues Spiel mit Tutorial', () => {
    const { stand, befund } = ladenMitBefund('{kaputt', T0);
    expect(befund).toBe('defekt');
    expect(stand.tutorial).toEqual({ kapitel: 1 });
  });

  it('test_nr13_alter_stand_ohne_merke: ein alter Stand bekommt kein Tutorial, Wandstation bleibt frei', () => {
    const { stand, befund } = ladenMitBefund(serialisieren(altesStartdorf(T0)), T0);
    expect(befund).not.toBe('defekt');
    expect(stand.tutorial).toBeUndefined();
    const s = new Spiel(stand, () => T0);
    expect(s.tutorialAktiv()).toBe(false);
    expect(s.wandstationFrei()).toBe(true);
  });

  it('test_nr13_startdorf_gleich: neuesSpielMitTutorial ist neuerSpielstand plus genau die Merke', () => {
    const mit = neuesSpielMitTutorial(T0);
    expect(mit.tutorial).toEqual({ kapitel: 1 });
    const { tutorial, ...rest } = mit;
    expect(tutorial).toBeDefined();
    expect(rest).toEqual(neuerSpielstand(T0));
    expect(Object.keys(rest)).not.toContain('tutorial');
  });

  it('test_nr13_spur_und_wandstation_text: feste Werte aus dem Vertrag', () => {
    // NR20-22 E1: die alte durchgehende Spur ist in Hauptleitung und zwei Hausanschlüsse geteilt.
    expect(TUTORIAL_HAUPT).toEqual([[10, 11], [10, 12]]);
    expect(TUTORIAL_ANSCHLUSS_1).toEqual([[9, 12]]);
    expect(TUTORIAL_ANSCHLUSS_2).toEqual([[10, 13], [10, 14], [11, 14]]);
    expect(WANDSTATION_TUTORIAL).toBe('Im Tutorial nimmst du den Standard. Die Wandstation kannst du später wählen.');
  });
});
