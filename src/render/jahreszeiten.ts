import tokens from '../../design/tokens.json';
import type { Kamera } from './kamera';
import type { Maler } from './maler';

export type Jahreszeit = 'fruehling' | 'sommer' | 'herbst' | 'spaetherbst' | 'winter';

const KALENDER: readonly Jahreszeit[] = [
  'winter', 'winter', 'fruehling', 'fruehling', 'fruehling', 'sommer',
  'sommer', 'sommer', 'herbst', 'herbst', 'spaetherbst', 'winter',
];

export function jahreszeit(monat: number): Jahreszeit {
  return KALENDER[((monat % 12) + 12) % 12];
}

export const istHerbst = (saison: Jahreszeit): boolean => saison === 'herbst' || saison === 'spaetherbst';

const KARTE = tokens.farbe.karte;
export const LANDSCHAFT = {
  fruehling: { wiese: ['#a6ca75', '#add27d'], halm: '#719c51', garten: '#a8cd72', rand: '#5b8342' },
  sommer: { wiese: [KARTE.wiese_b, KARTE.wiese_a], halm: KARTE.halm, garten: '#9bbd70', rand: '#52763f' },
  herbst: { wiese: ['#a6ac65', '#b0b56c'], halm: '#898446', garten: '#b7ad6d', rand: '#837545' },
  spaetherbst: { wiese: ['#a2a574', '#a9a87a'], halm: '#8d8057', garten: '#aea47b', rand: '#827153' },
  winter: { wiese: ['#dfe9ed', '#e9f0f3'], halm: '#b9ccd5', garten: '#f0f5f6', rand: '#aebfc5' },
} satisfies Record<Jahreszeit, { wiese: string[]; halm: string; garten: string; rand: string }>;

export const LAUB = ['#bf652b', '#db8739', '#efb750', '#ad5730'] as const;
export const SCHNEE = '#eaf3f7';

export function blatt(m: Maler, x: number, y: number, r: number, farbe: string, neigung: number): void {
  m.flaeche([[x - r, y - r * neigung], [x, y - r * .56], [x + r, y + r * neigung], [x, y + r * .56]], farbe, false);
}

/** Eine kleine Zahl Flocken im sichtbaren Dorf. Die Wolken außerhalb der Karte bleiben unbewegt. */
export function schneefall(m: Maler, k: Kamera, breite: number, hoehe: number): void {
  const { X } = m;
  X.fillStyle = 'rgba(255,255,255,.82)';
  X.beginPath();
  const t = m.zeit_s;
  for (let i = 0; i < 36; i++) {
    const x = (((i * .618 + t * (.012 + (i % 4) * .004)) % 1) * k.breite) + Math.sin(i + t) * 7;
    const y = ((i * .381 + t * (.055 + (i % 5) * .008)) % 1) * k.hoehe;
    const [fx, fy] = k.feldGenau(x, y);
    if (fx < -.5 || fy < -.5 || fx >= breite - .5 || fy >= hoehe - .5) continue;
    const r = 1 + (i % 4) * .43;
    X.moveTo(x + r, y); X.arc(x, y, r, 0, Math.PI * 2);
  }
  X.fill();
}
