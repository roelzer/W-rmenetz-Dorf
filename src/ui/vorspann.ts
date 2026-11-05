import '@fontsource/lilita-one/latin-400.css';
import logoQuelle from './logo.svg?raw';
import { h } from './dom';

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

// ---------- Ladebild (A64): gezeichnete Dorfszene im Stil der Spiel-Ladebildschirme ----------
const W = 1600, H = 740;
let saat = 7;
const zz = (): number => { saat = (saat * 16807) % 2147483647; return (saat - 1) / 2147483646; };

function wolke(x: number, y: number, s: number, dauer: number): string {
  const kreise = [[0, 0, 46], [44, -18, 52], [96, -4, 44], [58, 16, 40], [-34, 12, 32], [130, 14, 30]]
    .map(([dx, dy, r]) => `<circle cx="${dx * s}" cy="${dy * s}" r="${r * s}"/>`).join('');
  return `<g class="vs-wolke" style="animation-duration:${dauer}s"><g transform="translate(${x} ${y})"><g fill="#c9dcef" transform="translate(0 ${10 * s})">${kreise}</g><g fill="#fff">${kreise}</g></g></g>`;
}

function haus(x: number, y: number, s: number, dach: string, warm: boolean): string {
  const w = 70 * s, hh = 50 * s, t = 34 * s, ex = x + w / 2 + 8 * s, ey = y - hh + 2 * s, gx = x, gy = y - hh - 40 * s;
  const licht = warm ? '#ffd45c' : '#9fb3c4';
  const fenster = (fx: number) => `<rect x="${fx}" y="${y - hh * 0.72}" width="${12 * s}" height="${14 * s}" rx="${2 * s}" fill="${licht}" stroke="#3b1d0a" stroke-width="${2.5 * s}"/>`;
  const herz = warm ? `<g class="vs-freude" style="animation-delay:${(x % 7) * 0.2}s"><g transform="translate(${x + 4 * s} ${gy - 34 * s}) scale(${s})">
      <path d="M-24 -20h48a10 10 0 0 1 10 10v20a10 10 0 0 1-10 10h-16l-8 10-8-10h-16a10 10 0 0 1-10-10v-20a10 10 0 0 1 10-10z" fill="#fff" stroke="#3b1d0a" stroke-width="3.5"/>
      <path d="M0 8c-14-9-16-16-12-20 3-3 9-2 12 3 3-5 9-6 12-3 4 4 2 11-12 20z" fill="#f0453a"/></g></g>` : '';
  return `<g>
    <ellipse cx="${x + w * 0.2}" cy="${y + 4 * s}" rx="${w * 0.8}" ry="${10 * s}" fill="#000" opacity=".18"/>
    <path d="M${x - w / 2} ${y}h${w}v${-hh}h${-w}z" fill="#fbf1de" stroke="#3b1d0a" stroke-width="${3 * s}"/>
    <path d="M${x + w / 2} ${y}l${t} ${-t * 0.45}v${-hh}l${-t} ${t * 0.45}z" fill="#e2d2b4" stroke="#3b1d0a" stroke-width="${3 * s}" stroke-linejoin="round"/>
    <path d="M${gx} ${gy}l${t} ${-t * 0.45}L${ex + t} ${ey - t * 0.45}L${ex} ${ey}z" fill="${dach}" stroke="#3b1d0a" stroke-width="${3 * s}" stroke-linejoin="round" opacity=".8"/>
    <rect x="${x + w * 0.18}" y="${y - hh - 30 * s}" width="${10 * s}" height="${24 * s}" fill="#9c5a3c" stroke="#3b1d0a" stroke-width="${2.5 * s}"/>
    <path d="M${x - w / 2 - 8 * s} ${ey}L${gx} ${gy}L${ex} ${ey}z" fill="${dach}" stroke="#3b1d0a" stroke-width="${3 * s}" stroke-linejoin="round"/>
    ${fenster(x - w * 0.36)}${fenster(x + w * 0.2)}
    <rect x="${x - 8 * s}" y="${y - 24 * s}" width="${16 * s}" height="${24 * s}" rx="${3 * s}" fill="#8a5a2b" stroke="#3b1d0a" stroke-width="${2.5 * s}"/>
    ${herz}
  </g>`;
}

function windrad(x: number, y: number, s: number): string {
  const fl = [0, 120, 240].map((r) => `<path d="M0 0L-5 -70Q0 -78 5 -70Z" transform="rotate(${r})" fill="#fff" stroke="#6d8296" stroke-width="2"/>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-4 0L-2 -120h4L4 0z" fill="#f4f7fa" stroke="#6d8296" stroke-width="2"/><g transform="translate(0 -120)"><g class="vs-rotor">${fl}</g><circle r="6" fill="#dfe6ec" stroke="#6d8296" stroke-width="2"/></g></g>`;
}

function baum(x: number, y: number, s: number): string {
  const g = ['#4caf50', '#5cbf55', '#3f9c45'][Math.floor(zz() * 3)];
  return `<g><ellipse cx="${x + 10 * s}" cy="${y + 4 * s}" rx="${34 * s}" ry="${9 * s}" fill="#000" opacity=".2"/>
    <rect x="${x - 6 * s}" y="${y - 40 * s}" width="${12 * s}" height="${42 * s}" rx="${4 * s}" fill="#7a4e2c" stroke="#3b1d0a" stroke-width="${3 * s}"/>
    <circle cx="${x}" cy="${y - 70 * s}" r="${40 * s}" fill="${g}" stroke="#2c5e22" stroke-width="${4 * s}"/>
    <circle cx="${x - 26 * s}" cy="${y - 48 * s}" r="${26 * s}" fill="${g}" stroke="#2c5e22" stroke-width="${4 * s}"/>
    <circle cx="${x + 26 * s}" cy="${y - 50 * s}" r="${28 * s}" fill="${g}" stroke="#2c5e22" stroke-width="${4 * s}"/>
    <circle cx="${x - 12 * s}" cy="${y - 84 * s}" r="${12 * s}" fill="#fff" opacity=".25"/></g>`;
}

function heizzentrale(x: number, y: number): string {
  const dampf = [0, 1, 2, 3].map((i) => `<circle class="vs-dampf" style="animation-delay:${i * 0.6}s" cx="${x + 118}" cy="${y - 250}" r="22" fill="#fff"/>`).join('');
  return `<g>
    <ellipse cx="${x + 40}" cy="${y + 10}" rx="220" ry="30" fill="#000" opacity=".2"/>
    <rect x="${x + 100}" y="${y - 250}" width="36" height="200" rx="6" fill="#d7dde2" stroke="#3b1d0a" stroke-width="5"/>
    <rect x="${x + 100}" y="${y - 236}" width="36" height="14" fill="#e8463a"/><rect x="${x + 100}" y="${y - 214}" width="36" height="10" fill="#fff"/>
    ${dampf}
    <path d="M${x - 150} ${y}h260v-130h-260z" fill="#eef1f3" stroke="#3b1d0a" stroke-width="5"/>
    <path d="M${x + 110} ${y}l90 -40v-130l-90 40z" fill="#c9d0d6" stroke="#3b1d0a" stroke-width="5" stroke-linejoin="round"/>
    <path d="M${x - 160} ${y - 128}h280l90 -40h-280z" fill="#3fa15a" stroke="#3b1d0a" stroke-width="5" stroke-linejoin="round"/>
    <rect x="${x - 150}" y="${y - 108}" width="260" height="16" fill="#3fa15a"/>
    ${[0, 1, 2].map((i) => `<rect x="${x - 130 + i * 62}" y="${y - 80}" width="40" height="34" rx="4" fill="#ffd45c" stroke="#3b1d0a" stroke-width="4"/>`).join('')}
    <path d="M${x + 130} ${y - 12}l52 -23v-70l-52 23z" fill="#5d6b78" stroke="#3b1d0a" stroke-width="4"/>
    ${[0, 1, 2, 3].map((i) => `<path d="M${x + 130} ${y - 30 - i * 16}l52 -23" stroke="#8796a3" stroke-width="3"/>`).join('')}
    <path d="M${x - 330} ${y + 2}q30 -54 70 -40q34 -30 58 8q22 6 18 32z" fill="#c8913f" stroke="#3b1d0a" stroke-width="4"/>
    ${Array.from({ length: 14 }, () => `<circle cx="${x - 310 + zz() * 100}" cy="${y - 10 - zz() * 30}" r="4" fill="#9a6838"/>`).join('')}
    ${[0, 1, 2, 3].map((i) => `<path d="M${x - 140 + i * 66} ${y - 134}l58 0l24 -11h-58z" fill="#2a4f8a" stroke="#cfe3ff" stroke-width="2"/>`).join('')}
    <g transform="translate(${x - 26} ${y - 20})"><rect x="-34" y="-40" width="68" height="40" rx="8" fill="#3fa15a" stroke="#3b1d0a" stroke-width="4"/>
      <path d="M0 -8c-16-4-18-20-6-28 6 10 16 12 14 20-2 6-6 8-8 8z" fill="#c8ff8a" stroke="#1d5a2c" stroke-width="2.5"/></g>
  </g>`;
}

function ladebildSvg(): string {
  saat = 7;
  const strasse_y = 612, hz: [number, number] = [790, 584];
  const FARBE: Record<string, [string, number]> = { d40: ['#6ec6ff', 11], d32: ['#4caf3e', 9], d25: ['#d8392f', 7] };
  const rohr = (d: string, typ: string, fluss = true): string => {
    const [f, b] = FARBE[typ];
    return `<path d="${d}" stroke="#3b1d0a" stroke-width="${b + 6}" fill="none" stroke-linecap="round" opacity=".55"/><path d="${d}" stroke="${f}" stroke-width="${b}" fill="none" stroke-linecap="round"/>`
      + `<path d="${d}" stroke="#fff" stroke-opacity=".45" stroke-width="${Math.max(2, b * 0.25)}" fill="none" stroke-linecap="round" transform="translate(0 ${-b * 0.25})"/>`
      + (fluss ? `<path class="vs-fluss" d="${d}" stroke="#fff" stroke-width="${Math.max(3, b * 0.35)}" fill="none" stroke-linecap="round" stroke-dasharray="1 34"/>` : '');
  };
  // Hauptleitung in der Straße: nahe der Heizzentrale dick, nach außen dünner – wie im Spiel
  // Simon 2026-11-05: Rohrgrößen passend zu den angeschlossenen Häusern (je ca. 10 kW: 25er bis 15 kW, 32er bis 25 kW, 40er bis 40 kW),
  // zwei eigene Abgänge aus der Heizzentrale statt einer dicken Sammelleitung, die Leitung endet am letzten Haus (keine Vorsehung).
  const [hx, hy] = hz;
  const haupt = [rohr(`M${hx - 14} ${hy}V${strasse_y}H480`, 'd40'), rohr(`M480 ${strasse_y}H250`, 'd32'), rohr(`M250 ${strasse_y}H170`, 'd25'),
    rohr(`M${hx + 14} ${hy}V${strasse_y}H1110`, 'd40'), rohr(`M1110 ${strasse_y}H1270`, 'd32'), rohr(`M1270 ${strasse_y}H1350`, 'd25')].join('');
  const daecher = ['#e2582b', '#c4553e', '#d8392f', '#2f6aa8', '#7a4e9a', '#e2582b'];
  // [x, Fußpunkt y, Größe, angeschlossen]; hinten = oberhalb der Straße, vorne = unterhalb
  const hinten: Array<[number, number, number, boolean]> = [[170, 566, 0.8, true], [320, 560, 0.78, false], [480, 566, 0.82, true], [1110, 566, 0.82, true], [1270, 560, 0.78, true], [1430, 566, 0.8, false]];
  const vorne: Array<[number, number, number, boolean]> = [[250, 720, 1.05, true], [520, 712, 1.0, false], [1070, 712, 1.0, true], [1350, 720, 1.05, true]];
  const anschluss = (x: number, y: number, oben: boolean): string => rohr(oben ? `M${x} ${strasse_y}V${y - 4}` : `M${x} ${strasse_y}V${y - 40}`, 'd25', false); // A78: ohne Fließpunkte – sie lägen in der bewegten Ebene sonst über den vorderen Häusern
  const fernHaeuser: Array<[number, number, number]> = [[300, 470, 0.5], [420, 462, 0.45], [1180, 462, 0.45], [1300, 470, 0.5], [620, 480, 0.5], [980, 480, 0.5]];
  const strahlen = Array.from({ length: 12 }, (_, i) => `<path d="M0 0L${Math.cos((i * Math.PI) / 6 - 0.08) * 900} ${Math.sin((i * Math.PI) / 6 - 0.08) * 900}L${Math.cos((i * Math.PI) / 6 + 0.08) * 900} ${Math.sin((i * Math.PI) / 6 + 0.08) * 900}z"/>`).join('');
  const blumen = Array.from({ length: 70 }, () => {
    const x = zz() * W, y = 660 + zz() * 150, f = ['#ff6b8a', '#ffd45c', '#fff', '#b18cff'][Math.floor(zz() * 4)];
    return `<circle cx="${x}" cy="${y}" r="${3 + zz() * 3}" fill="${f}"/>`;
  }).join('');
  const blaetter = Array.from({ length: 10 }, (_, i) => `<path class="vs-blatt" style="animation-delay:${i * 0.45}s;animation-duration:${5 + (i % 3)}s" transform="translate(${80 + i * 150} ${300 + (i % 4) * 40})" d="M0 0c-14-4-16-18-5-25 5 9 14 11 12 18-1 5-5 7-7 7z" fill="#8be06a" stroke="#2c6e22" stroke-width="2"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="vs-himmel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f8ff0"/><stop offset=".55" stop-color="#9fd4ff"/><stop offset="1" stop-color="#ffe2a8"/></linearGradient>
    <radialGradient id="vs-sonne"><stop offset="0" stop-color="#fff6c0"/><stop offset=".35" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>
    <linearGradient id="vs-wiese" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd25a"/><stop offset="1" stop-color="#3f9c35"/></linearGradient>
    <radialGradient id="vs-vignette" cx="50%" cy="45%" r="75%"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#vs-himmel)"/>
  <g transform="translate(1280 150)"><g class="vs-strahlen" fill="#fff" opacity=".18">${strahlen}</g><circle r="190" fill="url(#vs-sonne)"/><circle r="62" fill="#fff1a8" stroke="#ffcf3a" stroke-width="6"/></g>
  ${wolke(140, 120, 1, 90)}${wolke(620, 70, 0.8, 120)}${wolke(980, 170, 0.6, 100)}${wolke(1380, 260, 0.7, 140)}
  <path d="M0 400L180 250L320 360L520 210L720 380L900 240L1100 370L1300 230L1480 350L1600 280V520H0z" fill="#8fb4d6"/>
  <path d="M520 210l-50 45 22 -6 18 18 20 -24 30 10zM900 240l-44 40 22 -6 20 16 18 -22 26 8zM1300 230l-44 38 20 -4 20 14 18 -20 26 8z" fill="#fff"/>
  ${windrad(250, 430, 0.8)}${windrad(1460, 420, 0.9)}${windrad(1060, 405, 0.6)}
  <rect y="480" width="${W}" height="${H - 480}" fill="#4fae3e"/>
  <g transform="translate(0 -80)">
  <path d="M0 470Q200 400 420 440T860 420T1260 430T1600 410V820H0z" fill="#66b84a"/>
  ${fernHaeuser.map(([x, y, sc], i) => haus(x, y, sc, daecher[i % daecher.length], false)).join('')}
  <path d="M0 520Q260 480 560 505T1100 500T1600 488V820H0z" fill="url(#vs-wiese)"/>
  ${[60, 1540, 930, 650].map((x, i) => baum(x, 520 + (i % 2) * 10, 0.6)).join('')}
  <path d="M0 586H1600V640H0z" fill="#cbc6ba"/><path d="M0 592H1600V634H0z" fill="#6c7075"/>
  ${Array.from({ length: 20 }, (_, i) => `<rect x="${i * 84 + 20}" y="611" width="40" height="4" rx="2" fill="#f2efe6" opacity=".8"/>`).join('')}
  ${hinten.filter((h0) => h0[3]).map(([x, y]) => anschluss(x, y, true)).join('')}
  ${hinten.map(([x, y, sc, an], i) => haus(x, y, sc, daecher[i % daecher.length], an)).join('')}
  ${heizzentrale(hz[0], hz[1])}
  ${haupt}
  ${vorne.filter((h0) => h0[3]).map(([x, y]) => anschluss(x, y, false)).join('')}
  ${vorne.map(([x, y, sc, an], i) => haus(x, y, sc, daecher[(i + 3) % daecher.length], an)).join('')}
  ${blumen}
  ${blaetter}
  ${baum(40, 790, 1.4)}${baum(1560, 790, 1.4)}
  </g>
  <rect width="${W}" height="${H}" fill="url(#vs-vignette)"/>
</svg>`;
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

const BEWEGT = '.vs-wolke,.vs-dampf,.vs-fluss,.vs-rotor,.vs-freude,.vs-blatt';
/** A78: Teilt das Ladebild in ein ruhendes Bild (wird nur einmal gemalt) und eine kleine Ebene mit allem, was sich bewegt.
 *  Eine Animation in einem großen SVG lässt sonst in jedem Bild das ganze Dorf neu malen – das ruckelt auf dem Handy. */
export function bewegteEbene(szene: SVGSVGElement): SVGSVGElement {
  const ebene = szene.cloneNode(true) as SVGSVGElement;
  for (const el of Array.from(szene.querySelectorAll(BEWEGT))) el.remove();
  szene.querySelector('.vs-strahlen')?.classList.remove('vs-strahlen'); // Sonnenstrahlen ruhen (große Fläche)
  const behalten = (el: Element): boolean => {
    if (el.matches(BEWEGT) || el.tagName.toLowerCase() === 'defs') return true;
    let irgendwas = false;
    for (const k of Array.from(el.children)) { if (behalten(k)) irgendwas = true; else k.remove(); }
    return irgendwas;
  };
  for (const k of Array.from(ebene.children)) if (!behalten(k)) k.remove();
  ebene.classList.add('vs-bewegt');
  return ebene;
}

/** A63/A64: Ladebildschirm mit gezeichnetem Dorf, Logo, Ladebalken und Tipp; Tippen überspringt ihn. */
export function vorspannZeigen(weniger_bewegung: boolean, tippNr = Math.floor(Math.random() * TIPPS.length)): void {
  const szene = svgAus(ladebildSvg()); szene.classList.add('vs-szene'); szene.setAttribute('aria-hidden', 'true');
  const bewegt = bewegteEbene(szene);
  const balken = h('div', { class: 'vs-balken' }, h('div', { class: 'vs-fuellung' }), h('span', { class: 'vs-prozent' }, 'Lädt …'));
  const v = h('div', { id: 'vorspann', class: weniger_bewegung ? 'still' : '', role: 'img', 'aria-label': 'Heatville wird geladen' },
    szene, bewegt,
    h('div', { class: 'vs-kopf' }, logoElement(96), h('div', { class: 'vs-titel' }, schriftzugGross(), h('span', { class: 'unterzeile' }, h('span', { class: 'vs-blattzeichen', 'aria-hidden': 'true' }, '🌿'), 'Heize dein Dorf klimaneutral'))),
    h('div', { class: 'vs-fuss' }, balken, h('p', { class: 'vs-tipp' }, h('b', {}, 'Tipp: '), TIPPS[tippNr % TIPPS.length])));
  document.body.append(v);
  let weg = false;
  const schliessen = (): void => { if (weg) return; weg = true; v.classList.add('aus'); setTimeout(() => v.remove(), weniger_bewegung ? 0 : 500); };
  v.addEventListener('pointerdown', schliessen);
  setTimeout(schliessen, weniger_bewegung ? 1200 : 2800);
}
