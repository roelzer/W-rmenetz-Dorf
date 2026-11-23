import { nordHinweisText, nordText } from '../core/nord-texte';
import type { AnleiterPlatz } from './anleiter';
import { knopf } from './bausteine';
import { h } from './dom';
import { sprecherFigur } from './sprecher';
import { T } from './tokens';

/**
 * NR27 (DESIGN 13.13 A, 14.15 Punkt 20): Mini-Tutorial „Bahnquerung“ bei der Freischaltung – Anleiter-Karte mit Simon über
 * abgedunkeltem Bild. Mit Fachtext-Freigabe drei Blasen (TUTORIAL_1, TUTORIAL_2, TUTORIAL_BEDIEN), ohne nur TUTORIAL_BEDIEN:
 * TUTORIAL_2 hinge ohne den Fachsatz davor in der Luft. Kennt den Spielstand nicht; den Merker setzt der Aufrufer. Den Platz
 * rechnet steuerung.ts (Werte aus ui/anleiter holt nur sie, U7); eigene Texte schreibt das Modul nur ohne Bahn-Bezug (AE-NR27-12).
 */
export interface BahnTutorialAktionen { zeigMir(): void; spaeter(): void }

let ebene: HTMLElement | null = null;

export const bahnTutorialOffen = (): boolean => ebene !== null;

function blasen(): string[] {
  const fach = nordText('TUTORIAL_1');
  const bedien = nordHinweisText('TUTORIAL_BEDIEN');
  return fach === null ? [bedien] : [fach, nordHinweisText('TUTORIAL_2'), bedien];
}

export function bahnTutorialZeigen(platz: AnleiterPlatz, aktionen: BahnTutorialAktionen): void {
  if (ebene) throw new Error('Mini-Tutorial ist schon offen');
  const texte = blasen();
  const karte = h('div', { class: 'anleiter bahn-tutorial-karte', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Neu freigeschaltet' });
  karte.style.left = `${platz.links}px`;
  karte.style.width = `${platz.breite}px`;
  karte.style.bottom = `calc(${platz.unten!}px + env(safe-area-inset-bottom))`;
  karte.classList.toggle('figur-klein', platz.figur_px === T.menue.mass_px.anleiter_figur_klein);
  let knoepfe: HTMLButtonElement[] = [];

  const schliessen = (danach: () => void): void => {
    ebene?.remove();
    ebene = null;
    danach();
  };
  const blase = (i: number): void => {
    const letzte = i === texte.length - 1;
    knoepfe = letzte
      ? [knopf('Zeig’s mir', () => schliessen(aktionen.zeigMir), 'los', { klein: true }), knopf('Später', () => schliessen(aktionen.spaeter), '', { klein: true })]
      : [knopf('Weiter', () => blase(i + 1), 'los', { klein: true })];
    karte.replaceChildren(h('div', { class: 'anleiter-figur' }, sprecherFigur('Simon')),
      h('div', { class: 'anleiter-blase' },
        h('div', { class: 'anleiter-kopf' }, h('strong', { class: 'anleiter-name' }, 'Simon')),
        i === 0 ? h('span', { class: 'chip gold' }, 'Neu freigeschaltet') : null,
        h('p', { class: 'anleiter-text' }, texte[i]),
        h('div', { class: 'anleiter-knopfzeile bahn-tutorial-knoepfe' }, ...knoepfe)));
    knoepfe[0].focus({ preventScroll: true });
  };

  // Esc gilt wie [Später] (13.13 A: nicht Pflicht); Esc und Tab gehören allein der Karte, wie bei der Erklärkarte.
  karte.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); schliessen(aktionen.spaeter); return; }
    if (e.key !== 'Tab') return;
    e.stopPropagation();
    const erst = knoepfe[0], letzt = knoepfe[knoepfe.length - 1];
    if (e.shiftKey && document.activeElement === erst) { e.preventDefault(); letzt.focus(); }
    else if (!e.shiftKey && document.activeElement === letzt) { e.preventDefault(); erst.focus(); }
  });
  // Tippen neben die Karte: Im Browser fiele der Fokus auf body und Tab liefe aus der Karte heraus – er bleibt in der Karte.
  ebene = h('div', { id: 'bahn-tutorial' }, h('div', { class: 'abdunkeln', onclick: () => knoepfe[0].focus({ preventScroll: true }) }), karte);
  document.getElementById('app')!.append(ebene);
  blase(0);
}
