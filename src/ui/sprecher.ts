import { h } from './dom';

const FOTOS: Readonly<Record<string, number>> = {
  christian: 222, laura: 205, manfred: 300, philipp: 178, sebastian: 247, simon: 198,
};

/** Auch die eigenständige HTML-Vorschau benutzt dieselben Porträts. */
function fotoAdresse(name: string): string {
  const eingebettet = (window as unknown as { __figuren?: Record<string, string> }).__figuren?.[name];
  return eingebettet ?? `figuren/${name}.webp`;
}

export function sprecherFotosVorladen(): void {
  for (const name of Object.keys(FOTOS)) {
    const foto = new Image();
    foto.fetchPriority = name === 'simon' ? 'high' : 'low';
    foto.src = fotoAdresse(name);
  }
}

export function sprecherFigur(name: string): HTMLElement {
  const dateiname = name.toLowerCase(), breite = FOTOS[dateiname];
  if (breite) {
    // Das Foto ist von Anfang an der einzige Inhalt; auch bei langsamem Netz bleibt seine Größe stabil.
    const foto = h('img', {
      src: fotoAdresse(dateiname), alt: '', width: breite, height: 200,
      onerror: () => foto.style.visibility = 'hidden',
    });
    return h('div', { class: 'sprecher-bild foto' }, foto);
  }

  const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="100" height="100" fill="#dfe8d3"/>
    <path d="M12 100c2-24 18-34 38-34s36 10 38 34z" fill="#5a8f5a"/>
    <ellipse cx="50" cy="48" rx="22" ry="25" fill="#e8bf9d"/>
    <path d="M28 44c0-22 12-28 24-28s20 8 20 28c-6-10-14-14-22-14s-16 4-22 14z" fill="#4a3526"/>
    <circle cx="41" cy="52" r="2.6" fill="#2b2118"/><circle cx="59" cy="52" r="2.6" fill="#2b2118"/>
    <path d="M42 63c5 5 11 5 16 0" stroke="#7a3d2b" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`;
  return h('div', { class: 'sprecher-bild' },
    document.importNode(new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement, true));
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
  const karte = h('div', { class: 'sprecher-karte' }, sprecherFigur(n.figur), h('div', { class: 'sprecher-blase' }, h('strong', {}, n.figur), h('span', {}, n.text)));
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

/** Spricht gerade eine Figur (oder wartet noch eine)? Dann blendet steuerung.ts die Anleiter-Karte aus (DESIGN 13.3). */
export function sprecherAktiv(): boolean {
  return laeuft;
}
