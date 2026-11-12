import { serialisieren, SICHERUNG_MAX_ZEICHEN, sicherungEinspielen, sicherungsDateiname, speicherLoeschen } from '../core/speichern';
import { knopf } from './bausteine';
import { blattOeffnen } from './blatt';
import { h } from './dom';
import { logoElement, schriftzug } from './vorspann';
import { tempo, tempoSetzen, tempoStufen } from '../tempo';
import type { Ui } from './schnittstelle';
import { installationsKasten } from './installation';

const SCHLUESSEL = 'waermedorf-einstellungen-v1';

export interface Einstellungen { weniger_bewegung: boolean; kw_anzeigen: boolean; sparmodus: boolean }

const abonnenten: Array<(e: Einstellungen) => void> = [];
/** Wer Einstellungen nur liest (Bildschleife), erfährt hier jede Änderung – egal, wer sie schreibt. */
export function beiEinstellungsAenderung(f: (e: Einstellungen) => void): void { abonnenten.push(f); }

export function einstellungenLesen(): Einstellungen {
  let gespeichert: Partial<Einstellungen> = {};
  try { gespeichert = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? '{}'); } catch (fehler) { console.warn('Einstellungen nicht lesbar, Standard gilt', fehler); }
  const system = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { weniger_bewegung: gespeichert.weniger_bewegung ?? system, kw_anzeigen: gespeichert.kw_anzeigen ?? true, sparmodus: gespeichert.sparmodus ?? false };
}

/** Speichert und meldet die Änderung allen Abonnenten – auch wenn das Speichern scheitert, gilt sie für diese Sitzung. */
export function einstellungenSchreiben(e: Einstellungen): boolean {
  let gespeichert: boolean;
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(e)); gespeichert = true; } catch { gespeichert = false; }
  for (const f of abonnenten) f(e);
  return gespeichert;
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
  const spar = h('input', { type: 'checkbox', id: 'sparmodus', role: 'switch' }) as HTMLInputElement;
  spar.checked = e.sparmodus;
  spar.addEventListener('change', () => { e.sparmodus = spar.checked; einstellungenSchreiben(e); geaendert(e); });
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
    h('label', { class: 'schalter', for: 'sparmodus' }, spar, 'Sparmodus'),
    h('p', { class: 'gedaempft' }, '30 Bilder/s, keine Hintergrund-Animationen, etwas geringere Schärfe – für ältere Handys'),
    h('div', { class: 'kasten' }, h('h3', {}, 'Spieltempo'),
      h('p', { class: 'gedaempft' }, 'Für Vorführungen: Die Spielzeit läuft schneller. Normal ist das vorgesehene Tempo.'),
      h('div', { class: 'knopfreihe' }, ...tempoStufen(istEntwickler(ui.spiel.stand)).map((t) => knopf(t.name, () => { tempoSetzen(t.faktor); ui.toast(`Tempo: ${t.name}`); b.zu(); }, tempo() === t.faktor ? 'gewaehlt' : '', { klein: true })))),
    installationsKasten(),
    sicherungKasten(ui),
    entwicklerKasten(ui),
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
    if (f.size > SICHERUNG_MAX_ZEICHEN) { ui.toast('Die Datei ist zu groß für einen Spielstand.'); return; } // vor dem Einlesen prüfen
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

/** Entwicklermodus = einer der Testcodes wurde in diesem Spielstand angewendet. */
export function istEntwickler(stand: { entwickler_kasse_gefuellt?: true; entwickler_unbegrenzt?: true }): boolean {
  return stand.entwickler_kasse_gefuellt === true || stand.entwickler_unbegrenzt === true;
}

/** Lokale Testcodes. Die Prüfsummen sind kein Zugriffsschutz für das öffentliche Spiel. */
const TESTCODES = new Map<string, 'kasse' | 'unbegrenzt'>([
  ['0875e09f45ecd97336ade0dfa6204e95fcc4f3d88defc583a6886ddb75fe314b', 'kasse'],
  ['047162feacc99f4d7817de7862dfcf2e2208a1386857e49bcc00cddb5fa08c5e', 'unbegrenzt'],
]);

function entwicklerKasten(ui: Ui): HTMLElement {
  const feld = h('input', { class: 'feld', type: 'password', id: 'entwicklerpasswort', autocomplete: 'off', maxlength: 80 });
  const status = h('p', { role: 'status', class: 'gedaempft' }, ui.spiel.testwaehrungUnbegrenzt ? 'Unbegrenzte Währung ist aktiv.' : '');
  const form = h('form', {},
    h('label', { for: 'entwicklerpasswort' }, 'Entwicklerpasswort'), feld,
    h('div', { class: 'knopfreihe' }, h('button', { type: 'submit', class: 'knopf los klein' }, 'Code anwenden')),
    status);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = feld.value.trim();
    feld.value = '';
    try {
      const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)));
      const hash = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
      const art = TESTCODES.get(hash);
      if (!art) { status.textContent = 'Entwicklerpasswort ungültig.'; return; }
      const ergebnis = ui.spiel.entwicklerhilfeAnwenden(art);
      status.textContent = ergebnis.hinweis ?? '';
      if (ergebnis.ok) ui.geaendert();
    } catch {
      status.textContent = 'Der Code konnte in diesem Browser nicht geprüft werden.';
    }
  });
  return h('div', { class: 'kasten' }, h('h3', {}, 'Entwicklermodus'), form);
}
