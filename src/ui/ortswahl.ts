import { KATALOG } from '../core/katalog';
import { ORTE } from '../core/orte';
import { chip, knopf } from './bausteine';
import { blattOeffnen } from './blatt';
import { h, zahl } from './dom';
import type { Ui } from './schnittstelle';

/** Ortswahl zum Spielstart (A21): Der Spieler sucht sich aus, wo er das Wärmenetz baut. */
export function ortswahl(ui: Ui, fertig: () => void): void {
  const b = blattOeffnen({ titel: 'Wo baust du dein Wärmenetz?', art: 'popup', schliessbar: false });
  const liste = h('div', { class: 'start-karten' });
  for (const ort of ORTE) {
    const haeuser = ort.haeuser.length;
    const verbrauch_kw = ort.haeuser.reduce((a, x) => a + (KATALOG[x.typ].bedarf_kw ?? 0), 0);
    liste.append(h('div', { class: 'bkarte' },
      h('div', { class: 'info' },
        h('span', { class: 'titel' }, ort.name), h('br'),
        h('span', { class: 'werte' }, `${haeuser} Häuser · ca. ${zahl(verbrauch_kw)} kW Wärmebedarf`), h('br'),
        h('span', {}, ort.beschreibung),
        ort.platzhalter ? h('div', { class: 'chips' }, chip('Beispielhäuser – echte Gebäude folgen', 'blau')) : null,
        h('div', { class: 'knopfreihe' }, knopf('Hier bauen', () => { ui.spiel.ortWechseln(ort.id); ui.geaendert(); b.zu(); fertig(); }, 'los', { klein: true })))));
  }
  b.inhalt.append(h('p', {}, 'Jeder Ort hat andere Häuser und Großabnehmer. Schau, wo viel Wärme auf kurzem Weg gebraucht wird – dort lohnt sich dein Netz.'), liste);
}
