import { SPEICHER_SCHLUESSEL } from '../core/speichern';
import { knopf } from './bausteine';
import { blattOeffnen } from './blatt';
import { h } from './dom';
import { tempo, tempoSetzen, TEMPO_STUFEN } from '../tempo';
import type { Ui } from './schnittstelle';

const SCHLUESSEL = 'waermedorf-einstellungen-v1';

export interface Einstellungen { weniger_bewegung: boolean }

export function einstellungenLesen(): Einstellungen {
  let gespeichert: Partial<Einstellungen> = {};
  try { gespeichert = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? '{}'); } catch (fehler) { console.warn('Einstellungen nicht lesbar, Standard gilt', fehler); }
  const system = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { weniger_bewegung: gespeichert.weniger_bewegung ?? system };
}

export function einstellungenSchreiben(e: Einstellungen): boolean {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(e)); return true; } catch { return false; }
}

/** Dorf-Einstellungen / Info (S8). */
export function einstellungenOeffnen(ui: Ui, e: Einstellungen, geaendert: (e: Einstellungen) => void): void {
  const b = blattOeffnen({ titel: 'Dorf-Einstellungen', art: 'hoch' });
  const name = h('input', { class: 'feld', type: 'text', maxlength: 24, value: ui.spiel.stand.name, 'aria-label': 'Dorfname', id: 'dorfname' }) as HTMLInputElement;
  name.addEventListener('change', () => { const n = name.value.trim().slice(0, 24); if (n) { ui.spiel.stand.name = n; ui.geaendert(); } else name.value = ui.spiel.stand.name; });
  const bewegung = h('input', { type: 'checkbox', id: 'bewegung' }) as HTMLInputElement;
  bewegung.checked = e.weniger_bewegung;
  bewegung.addEventListener('change', () => { e.weniger_bewegung = bewegung.checked; einstellungenSchreiben(e); geaendert(e); });
  const loeschen = knopf('Spielstand löschen', () => {
    b.inhalt.replaceChildren(
      h('p', {}, 'Wirklich alles löschen? Dein Dorf, dein Geld und alle Aufträge sind danach weg.'),
      h('div', { class: 'knopfreihe' },
        knopf('Ja, löschen', () => { try { localStorage.removeItem(SPEICHER_SCHLUESSEL); } catch (fehler) { console.warn('Spielstand ließ sich nicht entfernen', fehler); } location.reload(); }, 'heiss'),
        knopf('Abbrechen', () => b.zu())));
  }, '', { klein: true });
  b.inhalt.append(
    h('label', { for: 'dorfname', class: 'gedaempft' }, 'Dorfname'), name,
    h('label', { class: 'schalter', for: 'bewegung' }, bewegung, 'Weniger Bewegung'),
    h('p', { class: 'gedaempft' }, 'Rauch, Wasser und Münzflug stehen still. Wichtige Hinweise bleiben sichtbar.'),
    h('div', { class: 'kasten' }, h('h3', {}, 'Spieltempo'),
      h('p', { class: 'gedaempft' }, 'Für Vorführungen: Die Spielzeit läuft schneller. Normal ist das vorgesehene Tempo.'),
      h('div', { class: 'knopfreihe' }, ...TEMPO_STUFEN.map((t) => knopf(t.name, () => { tempoSetzen(t.faktor); ui.toast(`Tempo: ${t.name}`); b.zu(); }, tempo() === t.faktor ? 'los' : '', { klein: true })))),
    h('div', { class: 'knopfreihe' }, loeschen),
    h('div', { class: 'kasten' }, h('h3', {}, 'Hinweis'), h('p', {}, 'Alle Wärmenetze und Werte sind fiktiv. Das Spiel vereinfacht stark und ersetzt keine echte Planung.'),
      h('p', { class: 'gedaempft' }, 'Dein Spielstand liegt nur auf diesem Gerät. Es gibt kein Konto und es werden keine Daten gesendet.')));
}
