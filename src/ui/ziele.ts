import { AUFTRAEGE } from '../core/auftraege';
import type { Spiel } from '../core/spiel';
import { kasten, knopf, zeile } from './bausteine';
import { blattOeffnen } from './blatt';
import { h } from './dom';

export function ausbauZieleKasten(spiel: Spiel): HTMLElement {
  const ziele = spiel.hzZiele();
  if (!ziele.length) return kasten('Heizzentrale', h('p', {}, 'Höchste Stufe erreicht.'));

  const stufe = spiel.hzStufe + 1;
  const k = kasten(`Voraussetzungen für Stufe ${stufe}`);
  for (const ziel of ziele) {
    k.append(zeile(ziel.text, h('span', { class: ziel.erreicht ? 'gruen' : '' },
      `${ziel.ist} / ${ziel.soll}${ziel.erreicht ? ' ✓' : ''}`)));
  }
  if (stufe >= 4) k.append(h('p', { class: 'gedaempft' }, 'Spreizung = Vorlauf minus mittlerer Rücklauf.'));
  return k;
}

export function zieleOeffnen(spiel: Spiel, zurHeizzentrale: () => void): void {
  const blatt = blattOeffnen({ titel: 'Ziele' });
  const auftraege = kasten('Offene Dorfaufträge');
  auftraege.append(h('p', { class: 'gedaempft' }, 'Dorfaufträge bringen Dorftaler. Für den Ausbau zählen die Voraussetzungen oben.'));
  const offen = AUFTRAEGE.filter((a) => !spiel.stand.erledigt[a.id]);
  if (offen.length) {
    for (const a of offen) auftraege.append(zeile(a.text, `+${a.taler} Taler`));
  } else auftraege.append(h('p', {}, 'Alle Aufträge erledigt.'));
  blatt.inhalt.append(ausbauZieleKasten(spiel),
    h('div', { class: 'knopfreihe' }, knopf('Zur Heizzentrale', zurHeizzentrale, 'los')), auftraege);
}
