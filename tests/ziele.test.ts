import { expect, it } from 'vitest';
import { AUFTRAEGE } from '../src/core/auftraege';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import { echteSteuerung } from './hilfen/echte-steuerung';

it('zeigt beim Auftrag zum Ausbau auf Stufe 3 die tatsächlichen Voraussetzungen und öffnet die Heizzentrale', async () => {
  const jetzt = 1_000_000;
  const stand = neuerSpielstand(jetzt);
  stand.objekte.find((o) => o.typ === 'hz')!.stufe = 2;
  stand.erledigt = Object.fromEntries(AUFTRAEGE.filter((a) => a.id !== 'hz3').map((a) => [a.id, true]));
  const spiel = new Spiel(stand, () => jetzt);

  await echteSteuerung(spiel, ({ dom }) => {
    dom.app.querySelector('.auftrag')!.click();
    const inhalt = dom.app.querySelector('.blatt .inhalt')!;
    expect(dom.app.querySelector('#blatt-titel')?.textContent).toBe('Ziele');
    expect(inhalt.textContent).toContain('Voraussetzungen für Stufe 3');
    expect(inhalt.textContent).toContain('Warm versorgte Häuser0 / 5');
    expect(inhalt.textContent).toContain('Wärmeabsatz in kW0 / 80');
    expect(inhalt.textContent).toContain('Offene Dorfaufträge');
    expect(inhalt.textContent).toContain('Vergrößere die Heizzentrale auf Stufe 3');
    expect(inhalt.textContent).not.toContain('Sägewerk');

    inhalt.querySelector('button')!.click();
    expect(dom.app.querySelector('#blatt-titel')?.textContent).toBe('Heizzentrale');
    expect(dom.app.querySelector('.blatt .inhalt')?.textContent).toContain('Voraussetzungen für Stufe 3');
  });
});
