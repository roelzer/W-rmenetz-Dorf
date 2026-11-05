/**
 * Eine Regel für die Pixelgröße der Karte (A90). Rein – ohne Browser. Die Übergabezeit der Leinwand wächst mit der Fläche,
 * deshalb Deckel auf Faktor und Gesamtpixel; nie unter Faktor 1, damit die Karte nie unscharf hochskaliert wird.
 */
export interface Aufloesung { faktor: number; breite_px: number; hoehe_px: number }

/** Faktor 2 reicht für Handys (Faktor 3 ist mit bloßem Auge kaum schärfer, kostet aber 2,25-mal so viele Pixel). */
export const MAX_FAKTOR = 2;
/** 1,5 MP: Handy 844×390 bei Faktor 2 (1,32 MP) passt, Laptops mit 7,7 MP werden begrenzt. */
export const MAX_PIXEL = 1_500_000;
/** Sparmodus: etwas geringere Schärfe für ältere Handys. */
export const SPAR_FAKTOR = 1.25;

/** Breite/Höhe der Leinwand setzen leert sie – iOS meldet `resize` oft ohne echte Änderung. */
export function aufloesungGeaendert(alt: Aufloesung, neu: Aufloesung): boolean {
  return alt.breite_px !== neu.breite_px || alt.hoehe_px !== neu.hoehe_px || alt.faktor !== neu.faktor;
}

export function zeichenAufloesung(css_breite: number, css_hoehe: number, dpr: number, spar: boolean): Aufloesung {
  let f = Math.min(dpr || 1, spar ? SPAR_FAKTOR : MAX_FAKTOR);
  const flaeche = css_breite * css_hoehe;
  if (flaeche * f * f > MAX_PIXEL) f = Math.sqrt(MAX_PIXEL / flaeche);
  f = Math.max(1, f);
  return { faktor: f, breite_px: Math.round(css_breite * f), hoehe_px: Math.round(css_hoehe * f) };
}
