import { describe, expect, it } from 'vitest';
import tokens from '../design/tokens.json';

// NR27 P5a4 (DESIGN 14.9 „Zeiten (`zeit_ms`)“, 14.15 Punkt 21): Bewegungszeiten der Bahnquerung stehen als Tokens bereit.
describe('NR27 P5a4 Tokens zeit_ms (DESIGN 14.9)', () => {
  // Fehler, die ihn rot machen: Wert fehlt, falsche Zahl (z. B. 120 statt 1200), unter menue.zeit_ms statt zeit_ms.
  it('test_nr27_tokens_zeit_ms: dunst_heben 1200, blase_versatz 60, bohrgeraet_zittern 180, abgas_zyklus 2400', () => {
    const z = tokens.zeit_ms as Record<string, unknown>;
    expect(z.dunst_heben).toBe(1200);
    expect(z.blase_versatz).toBe(60);
    expect(z.bohrgeraet_zittern).toBe(180);
    expect(z.abgas_zyklus).toBe(2400);
  });

  // Fehler, die ihn rot machen: bestehende Zeit versehentlich überschrieben (z. B. funken, rauch_zyklus beim Einfügen).
  it('bestehende Zeiten bleiben unverändert', () => {
    expect(tokens.zeit_ms).toMatchObject({ funken: 1000, rauch_zyklus: 3600, blase_wippen_zyklus: 2100, fliesspunkt_zyklus: 1670, auswahl_strich_px_pro_s: 20 });
  });
});
