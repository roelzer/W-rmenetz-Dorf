import logoQuelle from './logo.svg?raw';
import { h } from './dom';

/** A63: Logo als SVG-Element (ohne innerHTML, damit keine fremden Inhalte ausgeführt werden). */
export function logoElement(groesse_px: number): SVGSVGElement {
  const doc = new DOMParser().parseFromString(logoQuelle, 'image/svg+xml');
  const svg = document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
  svg.setAttribute('width', String(groesse_px)); svg.setAttribute('height', String(groesse_px));
  svg.setAttribute('aria-hidden', 'true'); svg.classList.add('logo-bild');
  return svg;
}

/** Schriftzug „Heatnet“: „Heat“ in Vorlauf-Rot, „net“ in Rücklauf-Blau. */
export function schriftzug(): HTMLElement {
  return h('span', { class: 'schriftzug', 'aria-label': 'Heatnet' }, h('span', { class: 'heat' }, 'Heat'), h('span', { class: 'net' }, 'net'));
}

/** A63: Kurzer Vorspann mit Logo beim Start; Tippen überspringt ihn. */
export function vorspannZeigen(weniger_bewegung: boolean): void {
  const v = h('div', { id: 'vorspann', role: 'img', 'aria-label': 'Heatnet' }, logoElement(140), schriftzug(), h('span', { class: 'unterzeile' }, 'Baue dein Wärmenetz'));
  document.body.append(v);
  let weg = false;
  const schliessen = (): void => { if (weg) return; weg = true; v.classList.add('aus'); setTimeout(() => v.remove(), weniger_bewegung ? 0 : 450); };
  v.addEventListener('pointerdown', schliessen);
  setTimeout(schliessen, weniger_bewegung ? 900 : 1700);
}
