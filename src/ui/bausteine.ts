import { h } from './dom';
import { SYMBOLE, type SymbolName } from './symbole';

export function symbol(name: SymbolName, klasse = 'sym'): HTMLSpanElement {
  const s = h('span', { class: klasse, 'aria-hidden': 'true' });
  s.innerHTML = SYMBOLE[name]; // dev-team: sicher – feste SVG-Zeichenfolgen aus symbole.ts, keine Daten von außen
  return s;
}

type Variante = '' | 'los' | 'heiss' | 'taler' | 'blau' | 'gewaehlt';
export function knopf(text: string | Node, bei: () => void, variante: Variante = '', zusatz: { klein?: boolean; aus?: boolean; unter?: string; id?: string } = {}): HTMLButtonElement {
  const k = h('button', { type: 'button', class: `knopf ${variante} ${zusatz.klein ? 'klein' : ''}`.trim(), disabled: zusatz.aus || undefined, onclick: bei, 'data-id': zusatz.id }, text);
  if (zusatz.unter) k.append(h('small', {}, zusatz.unter));
  return k;
}

export const chip = (text: string, farbe: '' | 'rot' | 'gruen' | 'blau' = ''): HTMLSpanElement => h('span', { class: `chip ${farbe}`.trim() }, text);

export function kasten(titel: string | null, ...inhalt: Array<Node | string>): HTMLDivElement {
  return h('div', { class: 'kasten' }, titel ? h('h3', {}, titel) : null, ...inhalt);
}

export function balken(anteil: number): HTMLDivElement {
  const i = h('i'); i.style.width = `${Math.max(0, Math.min(1, anteil)) * 100}%`;
  return h('div', { class: 'balken', role: 'progressbar', 'aria-valuenow': Math.round(anteil * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, i);
}

export const zeile = (links: string | Node, rechts?: string | Node | null): HTMLDivElement => h('div', { class: 'zeile' }, h('span', {}, links), rechts ? h('span', {}, rechts) : null);
