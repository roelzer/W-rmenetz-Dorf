import { h } from './dom';

/** A51: Eine Figur kommt kurz ins Bild und spricht in einer Sprechblase (Philipp, Laura, die Techniker). */
interface Aussehen { haut: string; haar: string; hemd: string; helm?: string; frisur: 'kurz' | 'lang' | 'glatze'; }
const AUSSEHEN: Record<string, Aussehen> = {
  Philipp: { haut: '#e8bf9d', haar: '#4a3526', hemd: '#3f6fa8', frisur: 'kurz' },
  Laura: { haut: '#f0c9ab', haar: '#7a4a28', hemd: '#c0583f', frisur: 'lang' },
  Sebastian: { haut: '#e3b793', haar: '#2f2a26', hemd: '#e29a2b', helm: '#f3c623', frisur: 'kurz' },
  Christian: { haut: '#edc6a4', haar: '#a7743c', hemd: '#e29a2b', helm: '#f3c623', frisur: 'kurz' },
  Manfred: { haut: '#e6b894', haar: '#9a9a9a', hemd: '#e29a2b', helm: '#f3c623', frisur: 'glatze' },
};
const STANDARD: Aussehen = { haut: '#e8bf9d', haar: '#4a3526', hemd: '#5a8f5a', frisur: 'kurz' };

/** Gezeichnetes Gesicht; wird durch ein Foto ersetzt, wenn public/figuren/<Name>.jpg|png|webp existiert. */
function figur(name: string): HTMLElement {
  const a = AUSSEHEN[name] ?? STANDARD;
  const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="100" height="100" fill="#dfe8d3"/>
    <path d="M12 100c2-24 18-34 38-34s36 10 38 34z" fill="${a.hemd}"/>
    ${a.frisur === 'lang' ? `<path d="M26 46c-4 26 2 38 8 40l32 0c6-2 12-14 8-40-4-22-44-22-48 0z" fill="${a.haar}"/>` : ''}
    <ellipse cx="50" cy="48" rx="22" ry="25" fill="${a.haut}"/>
    ${a.frisur === 'kurz' ? `<path d="M28 44c0-22 12-28 24-28s20 8 20 28c-6-10-14-14-22-14s-16 4-22 14z" fill="${a.haar}"/>` : ''}
    ${a.frisur === 'glatze' ? `<path d="M26 46c-3-4-1-8 2-8l2 12zM74 46c3-4 1-8-2-8l-2 12z" fill="${a.haar}"/>` : ''}
    ${a.helm ? `<path d="M26 40c0-18 12-24 24-24s24 6 24 24z" fill="${a.helm}"/><rect x="22" y="38" width="56" height="6" rx="3" fill="${a.helm}"/>` : ''}
    <circle cx="41" cy="52" r="2.6" fill="#2b2118"/><circle cx="59" cy="52" r="2.6" fill="#2b2118"/>
    <path d="M42 63c5 5 11 5 16 0" stroke="#7a3d2b" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`;
  const kasten = h('div', { class: 'sprecher-bild' });
  kasten.innerHTML = svg;
  const foto = new Image();
  const endungen = ['jpg', 'png', 'webp'];
  const probieren = (i: number): void => { if (i < endungen.length) foto.src = `figuren/${name.toLowerCase()}.${endungen[i]}`; };
  foto.onload = () => { foto.alt = name; kasten.replaceChildren(foto); };
  let versuch = 0;
  foto.onerror = () => { versuch++; probieren(versuch); };
  probieren(0);
  return kasten;
}

let wurzel: HTMLElement | null = null;
let timer = 0;
const warteschlange: Array<{ figur: string; text: string }> = [];
let laeuft = false;

function naechste(): void {
  const n = warteschlange.shift();
  if (!n) { laeuft = false; return; }
  laeuft = true;
  if (!wurzel) {
    wurzel = h('div', { id: 'sprecher', 'aria-live': 'polite', role: 'status' });
    document.getElementById('app')!.append(wurzel);
  }
  const karte = h('div', { class: 'sprecher-karte' }, figur(n.figur), h('div', { class: 'sprecher-blase' }, h('strong', {}, n.figur), h('span', {}, n.text)));
  wurzel.replaceChildren(karte);
  requestAnimationFrame(() => karte.classList.add('sichtbar'));
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    karte.classList.remove('sichtbar');
    timer = window.setTimeout(() => { karte.remove(); naechste(); }, 350);
  }, 3800 + Math.min(2500, n.text.length * 20));
}

/** Zeigt die Figur mit Sprechblase; mehrere Aufrufe laufen nacheinander. */
export function sprecherZeigen(name: string, text: string): void {
  warteschlange.push({ figur: name, text });
  if (!laeuft) naechste();
}
