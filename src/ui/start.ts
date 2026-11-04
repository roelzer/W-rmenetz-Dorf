import { KATALOG, type TypId } from '../core/katalog';
import { knopf } from './bausteine';
import { blattOeffnen } from './blatt';
import { katalogBild } from './bild';
import { h } from './dom';
import type { Ui } from './schnittstelle';

/** Quellenwahl zum Spielstart (S1): ein Popup, das sich erst mit einer Wahl schließt. */
export function startwahl(ui: Ui, fertig: () => void): void {
  const b = blattOeffnen({ titel: 'Deine erste Wärmequelle', art: 'popup', schliessbar: false });
  const karten = h('div', { class: 'start-karten' });
  for (const t of ['kessel', 'wpg', 'ptk'] as TypId[]) {
    const D = KATALOG[t];
    karten.append(h('div', { class: 'bkarte' },
      katalogBild(t, 96, 80),
      h('div', { class: 'info' },
        h('span', { class: 'titel' }, D.name), h('br'),
        h('span', { class: 'werte' }, `${D.leistung_kw![0]} kW`), h('br'),
        h('span', { class: 'vorteil' }, `+ ${D.vorteil}`), h('br'),
        h('span', { class: 'nachteil' }, `− ${D.nachteil}`),
        h('div', { class: 'knopfreihe' }, knopf('Wählen', () => { ui.spiel.ersteQuelleWaehlen(t); ui.geaendert(); b.zu(); fertig(); }, 'los', { klein: true })))));
  }
  b.inhalt.append(h('p', {}, 'Jedes Heizhaus beginnt mit einer Quelle. Später baust du weitere dazu – die Wahl ist keine Sackgasse.'), karten);
}
