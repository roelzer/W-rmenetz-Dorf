type Punkt = readonly [x: number, y: number, hoehe?: number];

const bild = ([x, y, z = 0]: Punkt): string => `${500 + (x - y) * 45},${246 + (x + y) * 22 - z * 44}`;
const flaeche = (farbe: string, ...punkte: Punkt[]): string =>
  `<polygon points="${punkte.map(bild).join(' ')}" fill="${farbe}"/>`;
const linie = (farbe: string, breite: number, punkte: Punkt[], attribute = ''): string =>
  `<polyline points="${punkte.map(bild).join(' ')}" fill="none" stroke="${farbe}" stroke-width="${breite}" stroke-linejoin="round" stroke-linecap="round" ${attribute}/>`;
const feld = (x: number, y: number, b: number, t: number, farbe: string, z = 0): string =>
  flaeche(farbe, [x, y, z], [x + b, y, z], [x + b, y + t, z], [x, y + t, z]);

interface Haus {
  x: number;
  y: number;
  dach: readonly [string, string];
  anschluss?: { trasse: Punkt[]; ankunft: number };
}

const haeuser: Haus[] = [
  { x: -3.7, y: -2.45, dach: ['#79748e', '#48465f'] },
  { x: -2.1, y: -2.35, dach: ['#6a8da0', '#3e6074'] },
  { x: 0.4, y: -3.3, dach: ['#a37683', '#684d62'] },
  { x: 2.2, y: -3.2, dach: ['#577c97', '#39536e'] },
  { x: 3.7, y: -2.25, dach: ['#b17d77', '#715461'] },
  { x: -3.75, y: -0.1, dach: ['#a7757d', '#714958'], anschluss: { trasse: [[-2.1, 1.4], [-3.4, 1.4], [-3.4, .78]], ankunft: 920 } },
  { x: 1.02, y: -0.02, dach: ['#7797a7', '#46697e'], anschluss: { trasse: [[.1, 1.4], [1.45, 1.4], [1.45, .85]], ankunft: 1020 } },
  { x: 3.1, y: -0.2, dach: ['#b17b76', '#724858'], anschluss: { trasse: [[.1, 1.4], [3.48, 1.4], [3.48, .65]], ankunft: 1430 } },
  { x: -3.25, y: 2.35, dach: ['#6996a5', '#44667a'] },
  { x: -1.45, y: 2.22, dach: ['#b47d74', '#785367'], anschluss: { trasse: [[-2.1, 1.4], [-.85, 1.4], [-.85, 2.33]], ankunft: 930 } },
  { x: 1.2, y: 2.35, dach: ['#a28191', '#6e546d'], anschluss: { trasse: [[.1, 1.4], [1.86, 1.4], [1.86, 2.48]], ankunft: 1100 } },
  { x: 3.16, y: 2.23, dach: ['#708da8', '#445f7e'] },
];

const stamm: Punkt[] = [[-2.05, .52], [-2.05, 1.4], [.1, 1.4]];
const vorlauf: Punkt[] = [[-3.4, 1.4], [3.48, 1.4]];
const daecher = (x: number, y: number, b: number, t: number, h: number, spitze: number, dach: readonly [string, string]): string => {
  const mitte = x + b / 2;
  return flaeche(dach[0], [x - .07, y - .08, h], [mitte, y - .08, spitze], [mitte, y + t + .08, spitze], [x - .07, y + t + .08, h])
    + flaeche(dach[1], [mitte, y - .08, spitze], [x + b + .07, y - .08, h], [x + b + .07, y + t + .08, h], [mitte, y + t + .08, spitze]);
};

function fenster(x: number, y: number, breite: number, z: number, hoehe: number, farbe: string): string {
  return flaeche(farbe, [x, y, z], [x + breite, y, z], [x + breite, y, z + hoehe], [x, y, z + hoehe]);
}

function wohnfenster({ x, y }: Haus, farbe: string): string {
  return fenster(x + .16, y + .884, .22, .31, .22, farbe) + fenster(x + .62, y + .884, .27, .31, .22, farbe);
}

function haus(h: Haus): string {
  const { x, y, dach } = h;
  return feld(x + .13, y + .1, 1.2, 1.01, '#112b39')
    + flaeche('#849baf', [x, y + .88], [x + 1, y + .88], [x + 1, y + .88, .68], [x + .5, y + .88, 1.1], [x, y + .88, .68])
    + flaeche('#43586e', [x + 1, y + .88], [x + 1, y], [x + 1, y, .68], [x + 1, y + .88, .68])
    + daecher(x, y, 1, .88, .68, 1.1, dach)
    + fenster(x + .43, y + .884, .14, 0, .36, '#3a465b')
    + wohnfenster(h, '#233d58')
    + flaeche('#30475c', [x + 1, y + .24, .29], [x + 1, y + .53, .29], [x + 1, y + .53, .49], [x + 1, y + .24, .49]);
}

function heizhaus(): string {
  const x = -2.65, y = -.82, b = 1.92, t = 1.43, h = 1.12;
  return feld(x + .15, y + .1, b + .22, t + .16, '#0e2937')
    + flaeche('#62778a', [x + b, y], [x + b, y + t], [x + b, y + t, h], [x + b, y, h])
    + flaeche('#a9bac4', [x, y + t], [x + b, y + t], [x + b, y + t, h], [x, y + t, h])
    + feld(x - .07, y - .07, b + .14, t + .14, '#3c6c77', h)
    + linie('#6396a0', 2, [[x - .07, y + t + .07, h], [x + b + .07, y + t + .07, h]])
    + fenster(x + .16, y + t + .002, .67, .17, .53, '#334759')
    + fenster(x + .22, y + t + .004, .55, .26, .36, '#ffb150')
    + fenster(x + .99, y + t + .004, .64, .44, .25, '#ffd891')
    + fenster(x + 1.27, y + t + .006, .035, .44, .25, '#a26148')
    + fenster(x + .16, y + t + .004, 1.58, .83, .08, '#5d8d97')
    + linie('#4e697e', 13, [[x + 1.53, y + .23, h], [x + 1.53, y + .23, 1.97]])
    + linie('#d59c8a', 13, [[x + 1.53, y + .23, 1.85], [x + 1.53, y + .23, 1.97]]);
}

function baum(x: number, y: number, groesse: number): string {
  return `<g transform="translate(${bild([x, y]).replace(',', ' ')}) scale(${groesse})">
    <ellipse cx="6" rx="17" ry="6" fill="#122b3c"/>
    <path d="M-2 0v-15h4V0" fill="#475465"/>
    <path d="M0-43 15-12Q0-3-15-12Z" fill="#254d5e"/>
    <path d="M0-51 12-23Q0-15-12-23Z" fill="#366575"/>
    <path d="M0-51 12-23 2-20Z" fill="#214554"/>
  </g>`;
}

const baeume: ReadonlyArray<readonly [number, number, number]> = [
  [-4.7, -2.9, .9], [-4.35, -3.25, .65], [-.65, -3.5, .88], [2.7, -3.7, .7], [4.4, -3, .8],
  [-4.7, .15, .7], [2.34, -.3, .64], [4.5, .02, .72], [-4.2, 3.15, .9], [-.1, 3.55, .73], [4.43, 3.1, .95], [3.9, 3.65, .76],
];

const zweig = ({ anschluss }: Haus): Punkt[] => anschluss?.trasse.slice(-2) ?? [];

function strassenleuchte(x: number, y: number): string {
  const [cx, cy] = bild([x, y, .7]).split(',');
  return `<ellipse cx="${cx}" cy="${Number(cy) + 27}" rx="23" ry="9" fill="url(#vs-laterne)"/>`
    + linie('#758697', 2, [[x, y], [x, y, .7]])
    + `<circle cx="${cx}" cy="${cy}" r="3" fill="#ffce85"/>`;
}

function svg(inhalt: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500" aria-hidden="true">${inhalt}</svg>`;
}

export function nachtdorfSvg(): string {
  const boden = 'url(#vs-boden)';
  const lampen: Punkt[] = [[-4.04, 1.77], [-.4, 1.77], [2.7, 1.77], [.46, -1.55]];
  const objekte = [
    ...haeuser.map((h) => ({ tiefe: h.x + h.y + 1, zeichnung: haus(h) })),
    ...baeume.map(([x, y, s]) => ({ tiefe: x + y, zeichnung: baum(x, y, s) })),
    ...lampen.map(([x, y]) => ({ tiefe: x + y, zeichnung: strassenleuchte(x, y) })),
    { tiefe: -1.7, zeichnung: heizhaus() },
  ].sort((a, b) => a.tiefe - b.tiefe);
  const strassen: Punkt[][] = [[[-4.65, 1.4], [4.57, 1.4]], [[.1, -2.75], [.1, 3.72]]];
  const leitungen = [stamm, vorlauf, ...haeuser.filter((h) => h.anschluss).map(zweig)];
  const sterne = Array.from({ length: 29 }, (_, i) =>
    `<circle cx="${68 + (i * 83) % 864}" cy="${20 + (i * 47) % 144}" r="${i % 7 === 0 ? 1.7 : .9}" opacity="${i % 3 === 0 ? .78 : .34}"/>`).join('');
  return svg(`<defs>
    <linearGradient id="vs-boden" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop stop-color="#3e6676"/><stop offset="1" stop-color="#234654"/>
    </linearGradient>
    <radialGradient id="vs-laterne"><stop stop-color="#ffc173" stop-opacity=".42"/><stop offset="1" stop-color="#ffc173" stop-opacity="0"/></radialGradient>
    <radialGradient id="vs-mond"><stop stop-color="#b5d8ff" stop-opacity=".21"/><stop offset="1" stop-color="#b5d8ff" stop-opacity="0"/></radialGradient>
  </defs>
  <g fill="#d5e8ff">${sterne}</g>
  <circle cx="753" cy="101" r="63" fill="url(#vs-mond)"/>
  <path d="M761 78a25 25 0 1 0 17 36 25 25 0 0 1-17-36Z" fill="#d5e5fa"/>
  ${flaeche('#122333', [-5.2, -4.2, -.44], [5.05, -4.2, -.44], [5.05, 4.15, -.44], [-5.2, 4.15, -.44])}
  ${flaeche('#152e40', [5.05, -4.2], [5.05, 4.15], [5.05, 4.15, -.44], [5.05, -4.2, -.44])}
  ${flaeche('#1e3749', [-5.2, 4.15], [5.05, 4.15], [5.05, 4.15, -.44], [-5.2, 4.15, -.44])}
  ${feld(-5.2, -4.2, 10.25, 8.35, boden)}
  ${haeuser.map(({ x, y }) => feld(x - .14, y - .14, 1.29, 1.18, '#3b6165')).join('')}
  ${strassen.map((p) => linie('#708393', 28, p)).join('')}
  ${strassen.map((p) => linie('#334557', 22, p)).join('')}
  ${strassen.map((p) => linie('#8b9aa6', 1, p, 'stroke-dasharray="6 9" opacity=".44"')).join('')}
  ${leitungen.map((p) => linie('#589aca', 2.4, p, 'transform="translate(0 4)"')).join('')}
  ${leitungen.map((p) => linie('#f0a666', 3, p)).join('')}
  ${objekte.map((o) => o.zeichnung).join('')}`);
}

export function waermeSvg(bewegt: boolean): string {
  const impuls = (p: Punkt[], dauer: number, start = 0): string => bewegt
    ? linie('#fff1b7', 4.5, p, `pathLength="100" class="vs-impuls" style="--vs-laufzeit:${dauer}ms;--vs-start:${start}ms"`)
    : '';
  return svg(impuls(stamm, 680, 130) + haeuser.map((h) => {
    if (!h.anschluss) return '';
    const { trasse, ankunft } = h.anschluss;
    const start = trasse[0][0] < 0 ? 335 : 810;
    return impuls(trasse, ankunft - start, start)
      + `<g${bewegt ? ` class="vs-licht" style="--vs-start:${ankunft}ms"` : ''}>${wohnfenster(h, '#ffce7c')}</g>`;
  }).join(''));
}
