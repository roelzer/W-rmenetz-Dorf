import '@fontsource/lilita-one/latin-400.css';
import logoQuelle from './logo.svg?raw';
import { h } from './dom';
import { nachtdorfSvg, waermeSvg } from './vorspann-dorf';

/** SVG-Text (nur eigene, feste Inhalte) per DOMParser als Element einsetzen. */
function svgAus(quelle: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(quelle, 'image/svg+xml');
  return document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
}

/** A63: Logo als SVG-Element. */
export function logoElement(groesse_px: number): SVGSVGElement {
  const svg = svgAus(logoQuelle);
  svg.setAttribute('width', String(groesse_px)); svg.setAttribute('height', String(groesse_px));
  svg.setAttribute('aria-hidden', 'true'); svg.classList.add('logo-bild');
  return svg;
}

/** Schriftzug „Heatville“ (A85): „Heat“ warm (Vorlauf), „ville“ kühl (Rücklauf). */
export function schriftzug(): HTMLElement {
  return h('span', { class: 'schriftzug', 'aria-label': 'Heatville' }, h('span', { class: 'heat' }, 'Heat'), h('span', { class: 'ville' }, 'ville'));
}

/** Spieltipps für den Ladebildschirm – nur fachlich richtige Aussagen. */
const TIPPS = [
  'Je kälter der Rücklauf, desto mehr Wärme passt durch dieselbe Leitung.',
  'Niedrigere Vorlauftemperatur senkt die Wärmeverluste im Netz.',
  'Leitungen liegen meist in der öffentlichen Straße – über fremde Grundstücke brauchst du die Gestattung des Eigentümers.',
  'Ein BHKW erzeugt Strom und Wärme gleichzeitig.',
  'Unter einem Fluss hindurch geht es meist mit einer Spülbohrung – das ist teuer.',
  'Jedes Haus braucht eine Übergabestation, die zu seinem Wärmebedarf passt.',
];

/** Großer Schriftzug als SVG (Verlauf, dicker Rand, Schatten) – für den Ladebildschirm. */
function schriftzugGross(): SVGSVGElement {
  const t = (fill: string, extra = '') => `<text x="12" y="92" font-family="Lilita One, sans-serif" font-size="100" letter-spacing="2" ${extra}><tspan fill="${fill === 'v' ? 'url(#sz-h)' : fill}">Heat</tspan><tspan fill="${fill === 'v' ? 'url(#sz-n)' : fill}">ville</tspan></text>`;
  const svg = svgAus(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 120" width="500" height="120">
    <defs><linearGradient id="sz-h" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="#fff3a0"/><stop offset=".5" stop-color="#ffc23a"/><stop offset="1" stop-color="#ff7a1a"/></linearGradient>
    <linearGradient id="sz-n" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="#e2f4ff"/><stop offset=".5" stop-color="#6cc0ff"/><stop offset="1" stop-color="#2c7fe0"/></linearGradient></defs>
    <g transform="translate(0 9)" opacity=".35">${t('#000', 'stroke="#000" stroke-width="18" stroke-linejoin="round"')}</g>
    <g transform="translate(0 6)">${t('#3b1d0a', 'stroke="#3b1d0a" stroke-width="18" stroke-linejoin="round"')}</g>
    ${t('#3b1d0a', 'stroke="#3b1d0a" stroke-width="18" stroke-linejoin="round"')}
    ${t('v')}
    <path d="M30 40q60-14 120-6" stroke="#fff" stroke-opacity=".6" stroke-width="6" fill="none" stroke-linecap="round"/>
  </svg>`);
  svg.classList.add('vs-schriftzug'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Heatville');
  return svg;
}

/** A63/A64: Ladebildschirm mit gezeichnetem Dorf, Logo, Ladebalken und Tipp; Tippen überspringt ihn. */
export function vorspannZeigen(weniger_bewegung: boolean, tippNr = Math.floor(Math.random() * TIPPS.length)): void {
  const still = weniger_bewegung || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const szene = h('div', { class: 'vs-buehne', 'aria-hidden': 'true' }, svgAus(nachtdorfSvg()), svgAus(waermeSvg(!still)));
  const balken = h('div', { class: 'vs-balken' }, h('div', { class: 'vs-fuellung' }));
  const v = h('div', { id: 'vorspann', class: still ? 'still' : '', role: 'img', 'aria-label': 'Heatville wird geladen' },
    szene,
    h('div', { class: 'vs-kopf' }, h('div', { class: 'vs-titel' }, schriftzugGross(), h('span', { class: 'unterzeile' }, 'Heize dein Dorf klimaneutral'))),
    h('div', { class: 'vs-fuss' }, h('span', { class: 'vs-prozent' }, 'Lädt …'), balken, h('p', { class: 'vs-tipp' }, h('b', {}, 'Tipp: '), TIPPS[tippNr % TIPPS.length])));
  document.body.append(v);
  let weg = false;
  const schliessen = (): void => { if (weg) return; weg = true; v.classList.add('aus'); setTimeout(() => v.remove(), still ? 0 : 500); };
  v.addEventListener('pointerdown', schliessen);
  setTimeout(schliessen, still ? 1200 : 2800);
}
