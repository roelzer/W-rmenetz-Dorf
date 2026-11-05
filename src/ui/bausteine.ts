import { h } from './dom';
import { SYMBOLE, type SymbolName } from './symbole';
import { toast } from './toast';

/** Symbol als SVG-Element. Per DOMParser als SVG geparst: keine Zeichenfolge gelangt je als HTML ins Dokument. */
export function symbol(name: SymbolName, klasse = 'sym'): HTMLSpanElement {
  const doc = new DOMParser().parseFromString(SYMBOLE[name], 'image/svg+xml');
  return h('span', { class: klasse, 'aria-hidden': 'true' }, document.importNode(doc.documentElement, true));
}

/** „Weniger Bewegung“ aus der Einstellung (Klasse am body, steuerung.ts) oder vom System – dann wackelt nichts. */
const ruhig = (): boolean => document.body.classList.contains('weniger-bewegung') || matchMedia('(prefers-reduced-motion: reduce)').matches;

/** DESIGN.md 12.19: Ein gesperrter Knopf trägt `aria-disabled="true"` statt `disabled`, damit Tippen, Enter und Leertaste
 *  ankommen und Tastatur-Nutzer ihn per Tab erreichen. Ein Klick führt dann nie die Aktion aus: Der Knopf wackelt kurz
 *  (stil.css, nicht bei „Weniger Bewegung“ – sonst käme nie ein animationend und die Klasse bliebe hängen) und zeigt den
 *  Hinweis, falls es einen gibt. Der Zustand wird beim Klick gelesen, damit auch `sperren` nachträglich wirkt. */
function sperrbar(k: HTMLButtonElement, bei: () => void, aus: boolean, hinweis: string | undefined): HTMLButtonElement {
  if (aus) sperren(k);
  k.addEventListener('click', () => {
    if (!k.hasAttribute('aria-disabled')) { bei(); return; }
    if (!ruhig()) k.classList.add('wackelt');
    if (hinweis) toast(hinweis);
  });
  k.addEventListener('animationend', () => k.classList.remove('wackelt'));
  return k;
}

/** Sperrt einen schon gebauten Knopf (DESIGN.md 12.19), z. B. „Gefällt dir“ nach dem Tippen. */
export function sperren(k: HTMLButtonElement): void { k.setAttribute('aria-disabled', 'true'); }

/** Knopfarten nach DESIGN.md 12.5: kostenlos = los, kostet € = geld, kostet Taler = taler, nicht umkehrbar = gefahr, Auswahl an = gewaehlt.
 *  `hinweis`: Meldung beim Antippen des gesperrten Knopfs (Grund + was man tun kann, DESIGN.md 12.19). */
type Variante = '' | 'los' | 'geld' | 'taler' | 'gefahr' | 'blau' | 'gewaehlt';
export function knopf(text: string | Node, bei: () => void, variante: Variante = '', zusatz: { klein?: boolean; aus?: boolean; unter?: string; id?: string; schloss?: boolean; hinweis?: string } = {}): HTMLButtonElement {
  const k = sperrbar(h('button', { type: 'button', class: `knopf ${variante} ${zusatz.klein ? 'klein' : ''}`.trim(), 'data-id': zusatz.id }, text), bei, !!zusatz.aus, zusatz.hinweis);
  // Preiszeile mit Münze bzw. Taler davor: Der Preis ist so auch ohne Farbe als Preis erkennbar (gesperrt steht dort ein Grund, kein Preis)
  // `schloss`: gesperrter Knopf mit Schloss vor dem Grund (DESIGN.md 12.19)
  if (zusatz.unter) k.append(h('small', {}, (variante === 'geld' || variante === 'taler') && !zusatz.aus ? symbol(variante, 'sym preis-sym') : zusatz.aus && zusatz.schloss ? symbol('schloss', 'sym schloss-klein') : null, zusatz.unter));
  return k;
}

/** Stufenknopf (48×48) mit gezeichnetem Plus/Minus; der Text für Vorlesen steht in `label`. */
export function stepper(art: 'plus' | 'minus', label: string, bei: () => void, aus = false): HTMLButtonElement {
  return sperrbar(h('button', { type: 'button', class: 'knopf stepper', 'aria-label': label }, symbol(art)), bei, aus, undefined);
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
