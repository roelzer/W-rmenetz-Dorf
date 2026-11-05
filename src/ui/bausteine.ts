import { h } from './dom';
import { SYMBOLE, type SymbolName } from './symbole';

/** Symbol als SVG-Element. Per DOMParser als SVG geparst: keine Zeichenfolge gelangt je als HTML ins Dokument. */
export function symbol(name: SymbolName, klasse = 'sym'): HTMLSpanElement {
  const doc = new DOMParser().parseFromString(SYMBOLE[name], 'image/svg+xml');
  return h('span', { class: klasse, 'aria-hidden': 'true' }, document.importNode(doc.documentElement, true));
}

/** Knopfarten nach DESIGN.md 12.5: kostenlos = los, kostet € = geld, kostet Taler = taler, nicht umkehrbar = gefahr, Auswahl an = gewaehlt. */
type Variante = '' | 'los' | 'geld' | 'taler' | 'gefahr' | 'blau' | 'gewaehlt';
export function knopf(text: string | Node, bei: () => void, variante: Variante = '', zusatz: { klein?: boolean; aus?: boolean; unter?: string; id?: string } = {}): HTMLButtonElement {
  const k = h('button', { type: 'button', class: `knopf ${variante} ${zusatz.klein ? 'klein' : ''}`.trim(), disabled: zusatz.aus || undefined, onclick: bei, 'data-id': zusatz.id }, text);
  // Preiszeile mit Münze bzw. Taler davor: Der Preis ist so auch ohne Farbe als Preis erkennbar (gesperrt steht dort ein Grund, kein Preis)
  if (zusatz.unter) k.append(h('small', {}, (variante === 'geld' || variante === 'taler') && !zusatz.aus ? symbol(variante, 'sym preis-sym') : null, zusatz.unter));
  return k;
}

/** Stufenknopf (48×48) mit gezeichnetem Plus/Minus; der Text für Vorlesen steht in `label`. */
export function stepper(art: 'plus' | 'minus', label: string, bei: () => void, aus = false): HTMLButtonElement {
  return h('button', { type: 'button', class: 'knopf stepper', 'aria-label': label, disabled: aus || undefined, onclick: bei }, symbol(art));
}

/** Gesperrte Hinweiszeile (DESIGN.md 12.15): gedämpft, Schloss davor – überall gleich, damit Sperren auf einen Blick erkennbar sind. */
export const sperrHinweis = (text: string): HTMLParagraphElement => h('p', { class: 'gedaempft sperrhinweis' }, symbol('schloss'), text);

/** Gesperrter Listeneintrag (DESIGN.md 12.15): neutraler Chip mit Schloss, kein Knopf – es gibt nichts zu tippen. */
export const sperrChip = (text: string): HTMLSpanElement => h('span', { class: 'chip sperr' }, symbol('schloss'), text);

export const chip = (text: string, farbe: '' | 'rot' | 'gruen' | 'blau' = ''): HTMLSpanElement => h('span', { class: `chip ${farbe}`.trim() }, text);

export function kasten(titel: string | null, ...inhalt: Array<Node | string>): HTMLDivElement {
  return h('div', { class: 'kasten' }, titel ? h('h3', {}, titel) : null, ...inhalt);
}

export function balken(anteil: number): HTMLDivElement {
  const i = h('i'); i.style.width = `${Math.max(0, Math.min(1, anteil)) * 100}%`;
  return h('div', { class: 'balken', role: 'progressbar', 'aria-valuenow': Math.round(anteil * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, i);
}

export const zeile = (links: string | Node, rechts?: string | Node | null): HTMLDivElement => h('div', { class: 'zeile' }, h('span', {}, links), rechts ? h('span', {}, rechts) : null);
