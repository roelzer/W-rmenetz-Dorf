import type { Spiel } from '../core/spiel';
import { KONSTANTEN } from '../core/katalog';
import { nordHinweisText, nordText } from '../core/nord-texte';
import { dauerText } from '../render/gebaeude';
import { chip, knopf, symbol } from './bausteine';
import { eur, h } from './dom';
import erklaerbild from '../../design/nr27-erklaerbild-querschnitt.svg?raw';

const SAETZE = ['KARTE_1', 'KARTE_2', 'KARTE_3', 'KARTE_4'] as const;

/** (i) zur Erklärkarte (Katalog-Infozeile und Leitungsblatt, DESIGN 14.7); ohne Fachtext-Freigabe gibt es ihn nicht. */
export function bahnInfoKnopf(sp: Spiel): HTMLButtonElement | null {
  if (nordText('KARTE_1') === null) return null;
  return h('button', { type: 'button', class: 'info-knopf', 'aria-label': `Info: ${nordHinweisText('KARTE_TITEL')}`, 'data-ziel': 'bahn_info', onclick: () => bahnKarteZeigen(sp) }, symbol('frage'));
}

/**
 * NR27 (DESIGN 14.7): Erklärkarte „Warum so teuer?“. Ohne Fachtext-Freigabe gibt es sie nicht – auch keinen Ersatztext.
 * Sie ist ein eigenes Popup über dem offenen Blatt: blattOeffnen würde das Blatt darunter (Katalog, Leitungsblatt) schließen.
 */
export function bahnKarteZeigen(_sp: Spiel): void {
  const saetze = SAETZE.map((id) => nordText(id));
  if (saetze.some((s) => s === null)) return;
  const vorher = document.activeElement;

  const bild = new DOMParser().parseFromString(erklaerbild, 'image/svg+xml').documentElement;
  // Feste Darstellgröße 176 × 132 (DESIGN 14.7); die Datei selbst trägt die doppelte Größe für scharfe Bildschirme.
  bild.setAttribute('width', '176'); bild.setAttribute('height', '132');
  bild.setAttribute('role', 'img'); bild.setAttribute('aria-label', nordHinweisText('KARTE_ALT'));
  bild.setAttribute('class', 'karte-bild');

  const zu = (): void => {
    ebene.remove();
    if (vorher instanceof HTMLElement) vorher.focus({ preventScroll: true });
  };
  const zuKnopf = h('button', { type: 'button', class: 'schliessen', 'aria-label': 'Schließen', onclick: zu }, symbol('schliessen'));
  const verstanden = knopf('Verstanden', zu, 'los');
  const dialog = h('section', { class: 'blatt popup karte-popup', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'bahn-karte-titel', tabindex: -1 },
    h('div', { class: 'kopf' }, h('h2', { id: 'bahn-karte-titel', class: 'umriss' }, nordHinweisText('KARTE_TITEL')), zuKnopf),
    h('div', { class: 'inhalt' },
      h('div', { class: 'karte-oben' }, document.importNode(bild, true),
        h('div', { class: 'karte-text' }, ...saetze.map((s) => h('p', {}, s)))),
      h('div', { class: 'karte-chips' },
        h('span', { class: 'chip gold' }, symbol('geld', 'sym'), nordHinweisText('KARTE_CHIP_FELD', { preis: eur(KONSTANTEN.querung_eur_je_feld) })),
        chip(nordHinweisText('KARTE_CHIP_ZUSCHLAG', { querung_zeit: dauerText(KONSTANTEN.querung_bau_s * KONSTANTEN.bauzeit_faktor) }))),
      h('p', { class: 'gedaempft karte-hinweis' }, nordHinweisText('KARTE_5'))),
    h('div', { class: 'aktionen' }, verstanden));

  // Esc und Tab gehören allein dem Popup: ohne stopPropagation erreichte Esc auch das Blatt darunter und schlösse es.
  dialog.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); zu(); return; }
    if (e.key !== 'Tab') return;
    e.stopPropagation();
    const erst = zuKnopf, letzt = verstanden;
    if (e.shiftKey && document.activeElement === erst) { e.preventDefault(); letzt.focus(); }
    else if (!e.shiftKey && document.activeElement === letzt) { e.preventDefault(); erst.focus(); }
  });
  const ebene = h('div', { id: 'bahn-karte' }, h('div', { class: 'abdunkeln' }), dialog);
  document.getElementById('app')!.append(ebene);
  verstanden.focus({ preventScroll: true });
}
