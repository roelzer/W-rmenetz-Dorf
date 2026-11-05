import { serialisieren, sicherungEinspielen, sicherungsDateiname, speicherLoeschen } from '../core/speichern';
import { knopf } from './bausteine';
import { blattOeffnen } from './blatt';
import { h } from './dom';
import { logoElement, schriftzug } from './vorspann';
import { tempo, tempoSetzen, TEMPO_STUFEN } from '../tempo';
import type { Ui } from './schnittstelle';

const SCHLUESSEL = 'waermedorf-einstellungen-v1';

export interface Einstellungen { weniger_bewegung: boolean; kw_anzeigen: boolean }

export function einstellungenLesen(): Einstellungen {
  let gespeichert: Partial<Einstellungen> = {};
  try { gespeichert = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? '{}'); } catch (fehler) { console.warn('Einstellungen nicht lesbar, Standard gilt', fehler); }
  const system = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { weniger_bewegung: gespeichert.weniger_bewegung ?? system, kw_anzeigen: gespeichert.kw_anzeigen ?? true };
}

export function einstellungenSchreiben(e: Einstellungen): boolean {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(e)); return true; } catch { return false; }
}

/** Dorf-Einstellungen / Info (S8). */
export function einstellungenOeffnen(ui: Ui, e: Einstellungen, geaendert: (e: Einstellungen) => void): void {
  const b = blattOeffnen({ titel: 'Dorf-Einstellungen', art: 'hoch' });
  const name = h('input', { class: 'feld', type: 'text', maxlength: 24, value: ui.spiel.stand.name, 'aria-label': 'Dorfname', id: 'dorfname' }) as HTMLInputElement;
  const spieler = h('input', { class: 'feld', type: 'text', maxlength: 20, placeholder: 'Chef', value: ui.spiel.stand.spieler ?? '', 'aria-label': 'Dein Name', id: 'spielername' }) as HTMLInputElement;
  spieler.addEventListener('change', () => { ui.spiel.stand.spieler = spieler.value.trim().slice(0, 20); ui.geaendert(); });
  name.addEventListener('change', () => { const n = name.value.trim().slice(0, 24); if (n) { ui.spiel.stand.name = n; ui.geaendert(); } else name.value = ui.spiel.stand.name; });
  const bewegung = h('input', { type: 'checkbox', id: 'bewegung', role: 'switch' }) as HTMLInputElement;
  bewegung.checked = e.weniger_bewegung;
  bewegung.addEventListener('change', () => { e.weniger_bewegung = bewegung.checked; einstellungenSchreiben(e); geaendert(e); });
  const loeschen = knopf('Spielstand löschen', () => {
    b.inhalt.replaceChildren(
      h('p', {}, 'Wirklich alles löschen? Dein Dorf, dein Geld und alle Aufträge sind danach weg.'),
      h('div', { class: 'knopfreihe' },
        knopf('Ja, löschen', () => { try { speicherLoeschen(localStorage); } catch (fehler) { console.warn('Spielstand ließ sich nicht entfernen', fehler); } location.reload(); }, 'gefahr'),
        knopf('Abbrechen', () => b.zu())));
  }, '', { klein: true });
  b.inhalt.append(
    h('div', { class: 'einst-logo' }, logoElement(44), schriftzug()),
    h('label', { for: 'dorfname', class: 'gedaempft' }, 'Dorfname'), name,
    h('label', { for: 'spielername', class: 'gedaempft' }, 'Dein Name (so sprechen dich Philipp, Laura und die Techniker an)'), spieler,
    h('label', { class: 'schalter', for: 'bewegung' }, bewegung, 'Weniger Bewegung'),
    h('p', { class: 'gedaempft' }, 'Rauch, Wasser und Münzflug stehen still. Wichtige Hinweise bleiben sichtbar.'),
    h('div', { class: 'kasten' }, h('h3', {}, 'Spieltempo'),
      h('p', { class: 'gedaempft' }, 'Für Vorführungen: Die Spielzeit läuft schneller. Normal ist das vorgesehene Tempo.'),
      h('div', { class: 'knopfreihe' }, ...TEMPO_STUFEN.map((t) => knopf(t.name, () => { tempoSetzen(t.faktor); ui.toast(`Tempo: ${t.name}`); b.zu(); }, tempo() === t.faktor ? 'gewaehlt' : '', { klein: true })))),
    sicherungKasten(ui),
    h('div', { class: 'knopfreihe' }, loeschen),
    h('div', { class: 'kasten' }, h('h3', {}, 'Hinweis'), h('p', {}, 'Alle Wärmenetze und Werte sind fiktiv. Das Spiel vereinfacht stark und ersetzt keine echte Planung.'),
      h('p', { class: 'gedaempft' }, 'Dein Spielstand liegt nur auf diesem Gerät. Es gibt kein Konto und es werden keine Daten gesendet.'),
      h('p', { class: 'gedaempft' }, `Version ${typeof __SPIELVERSION__ === 'string' ? __SPIELVERSION__ : 'Entwicklung'}`)));
}

/** A83: Spielstand als Datei sichern und wieder laden (Handywechsel, gelöschter Browser). */
function sicherungKasten(ui: Ui): HTMLElement {
  const datei = h('input', { type: 'file', accept: '.json,application/json', class: 'versteckt', id: 'sicherung-datei', 'aria-label': 'Sicherungsdatei wählen' }) as HTMLInputElement;
  datei.addEventListener('change', () => {
    const f = datei.files?.[0];
    if (!f) return;
    f.text().then((text) => {
      const r = sicherungEinspielen(localStorage, text, Date.now());
      if (!r.ok) { ui.toast(r.grund); return; }
      ui.toast(`Spielstand „${r.stand.name}“ geladen – das Spiel startet neu`);
      setTimeout(() => location.reload(), 900);
    }).catch((fehler: unknown) => { console.warn('Sicherung nicht lesbar', fehler); ui.toast('Die Datei ließ sich nicht lesen.'); });
  });
  const sichern = knopf('Spielstand sichern', () => {
    const blob = new Blob([serialisieren(ui.spiel.stand)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: sicherungsDateiname(ui.spiel.stand, new Date()) }) as HTMLAnchorElement;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ui.toast('Sicherung gespeichert – heb die Datei gut auf');
  }, '', { klein: true });
  const laden = knopf('Spielstand laden', () => datei.click(), '', { klein: true });
  return h('div', { class: 'kasten' }, h('h3', {}, 'Sicherung'),
    h('p', { class: 'gedaempft' }, 'Speichere dein Dorf als Datei, z. B. vor einem Handywechsel. Beim Laden wird der jetzige Spielstand ersetzt.'),
    h('div', { class: 'knopfreihe' }, sichern, laden), datei);
}
