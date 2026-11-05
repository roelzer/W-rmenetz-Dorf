import { T } from './tokens';
import { h } from './dom';

let wurzel: HTMLElement | null = null;
let timer = 0;

/** DESIGN.md 12.17: sichtbar = Grundzeit + Zeit je Zeichen (Lesetempo rund 15 Zeichen je Sekunde), begrenzt nach unten und oben. */
export const toastDauer_ms = (text: string): number => {
  const z = T.menue.zeit_ms;
  return Math.min(z.toast_max, Math.max(z.toast_min, z.toast_grund + z.toast_je_zeichen * text.length));
};

/** Kurze Rückmeldung (DESIGN.md 12.17). Höchstens eine: Eine neue ersetzt die alte; derselbe Text startet nur die Zeit neu. */
export function toast(text: string): void {
  if (!wurzel) {
    wurzel = h('div', { id: 'toast', 'aria-live': 'polite', role: 'status' });
    document.getElementById('app')!.append(wurzel);
  }
  const alt = wurzel.firstElementChild as HTMLElement | null;
  const t = alt && alt.textContent === text ? alt : h('div', { class: 'toast' }, text);
  if (t !== alt) {
    wurzel.replaceChildren(t);
    requestAnimationFrame(() => t.classList.add('sichtbar'));
  } else t.classList.add('sichtbar');
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    t.classList.remove('sichtbar');
    timer = window.setTimeout(() => t.remove(), T.menue.zeit_ms.toast_blende);
  }, toastDauer_ms(text));
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
