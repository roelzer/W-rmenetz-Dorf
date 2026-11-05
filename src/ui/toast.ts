import { T } from './tokens';
import { h } from './dom';

let wurzel: HTMLElement | null = null;
let timer = 0;

/** Kurze Rückmeldung mittig auf 30 % Höhe. Lange Texte bekommen Pergament-Grund (M11). */
export function toast(text: string): void {
  if (!wurzel) {
    wurzel = h('div', { id: 'toast', 'aria-live': 'polite', role: 'status' });
    document.getElementById('app')!.append(wurzel);
  }
  const lang = text.length > 48;
  const t = h('div', { class: `toast ${lang ? 'lang' : 'umriss'}` }, text);
  wurzel.replaceChildren(t);
  requestAnimationFrame(() => t.classList.add('sichtbar'));
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    t.classList.remove('sichtbar');
    timer = window.setTimeout(() => t.remove(), T.zeit_ms.toast_blende);
  }, T.zeit_ms.toast_sichtbar + (lang ? 1200 : 0));
}

/** A83: Bleibender Hinweis mit Knopf (z. B. „Neue Version da – Neu laden“). */
export function hinweisMitKnopf(text: string, knopfText: string, aktion: () => void): void {
  const leiste = h('div', { class: 'update-hinweis', role: 'status', 'aria-live': 'polite' }, h('span', {}, text));
  const k = h('button', { class: 'knopf los klein', type: 'button' }, knopfText);
  k.addEventListener('click', aktion);
  leiste.append(k);
  document.querySelector('.update-hinweis')?.remove();
  document.getElementById('app')!.append(leiste);
}
