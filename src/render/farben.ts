/** Farbhilfen der Spielgrafik. */
export const KONTUR = 'rgba(40,36,30,.18)';

/** Hellt eine Farbe (a>0) auf oder dunkelt sie ab (a<0). Erwartet '#rrggbb'. */
export function schatten(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (a < 0) { r *= 1 + a; g *= 1 + a; b *= 1 + a; }
  else { r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export const DACHFARBEN = ['#c4553e', '#c4553e', '#3f72b8', '#4f8f4a', '#8a5cc0', '#d9a12a'];

/** O4 (Designer): gemischte Dachfarben wie im Ladebild, fest je Haus-ID (70 % Rottöne, dann Schieferblau, Pflaume, Anthrazit). */
const DACH_PALETTE: ReadonlyArray<readonly [string, number]> = [['#e2582b', 24], ['#c4553e', 23], ['#d8392f', 23], ['#2f6aa8', 15], ['#7a4e9a', 8], ['#5d6b78', 7]];
export function dachfarbe(id: number): string {
  let h = Math.imul(id ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  h = (h >>> 0) % 100;
  for (const [farbe, anteil] of DACH_PALETTE) { if (h < anteil) return farbe; h -= anteil; }
  return DACH_PALETTE[0][0];
}
