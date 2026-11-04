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
