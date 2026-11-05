import type { AnimBedarf } from './szene-schluessel';

/**
 * Taktgeber der Bildschleife (A90): entscheidet je Bildaufruf, ob gezeichnet wird. Rein – ohne Browser, Spielkern und Oberfläche.
 * Schlüssel und Bedarf werden erst beim Zeichnen in den Zustand übernommen; eine gesperrte Änderung bleibt so vorgemerkt.
 */
export interface TaktZustand {
  letztes_bild_ms: number;
  szene: string;
  kamera: string;
  /** Bedarf beim letzten Bild: wechselt er (Animation endet oder beginnt), wird einmal sofort gezeichnet. */
  bedarf: AnimBedarf;
  gezeichnet: boolean;
}
export interface TaktEingabe {
  jetzt_ms: number; szene: string; kamera: string; bedarf: AnimBedarf;
  effekte_aktiv: boolean;
  /** aus = „Weniger Bewegung“ oder Sparmodus */
  animation: 'an' | 'aus';
  /** Deckel 30 Bilder/s für alles */
  sparmodus: boolean;
  /** Vorspann deckt die Karte ab */
  verdeckt: boolean;
  /** nach Größenänderung, Rückkehr in die App, Leinwand-Verlust */
  erzwingen: boolean;
}

export const SICHERHEITSBILD_MS = 500, LANGSAM_MS = 250, FLUESSIG_MS = 1000 / 30;
/**
 * Halbe Bilddauer bei 60 Hz. Browser runden Bildzeiten (16,6/16,7 ms); ohne Toleranz fiele jedes zweite 30er-Bild auf 50 ms
 * und Animationen liefen ungleichmäßig. Mit 8 ms trifft das 30er-Raster bei 60, 90 und 120 Hz genau jedes 2./3./4. Bild.
 */
export const TOLERANZ_MS = 8;

export function neuerTakt(): TaktZustand {
  return { letztes_bild_ms: -Infinity, szene: '', kamera: '', bedarf: 'keine', gezeichnet: false };
}

export function sollZeichnen(z: TaktZustand, e: TaktEingabe): { zeichnen: boolean; zustand: TaktZustand } {
  const abstand = e.jetzt_ms - z.letztes_bild_ms;
  const erreicht = (grenze_ms: number): boolean => abstand >= grenze_ms - TOLERANZ_MS;
  const ja = { zeichnen: true, zustand: { letztes_bild_ms: e.jetzt_ms, szene: e.szene, kamera: e.kamera, bedarf: e.bedarf, gezeichnet: true } };
  const nein = { zeichnen: false, zustand: z };
  const nach = (grenze_ms: number) => (erreicht(grenze_ms) ? ja : nein);

  if (e.verdeckt) return !z.gezeichnet || e.erzwingen ? ja : nein;
  if (e.erzwingen) return ja;
  if (e.sparmodus && !erreicht(FLUESSIG_MS)) return nein;
  if (e.kamera !== z.kamera || e.szene !== z.szene || e.bedarf !== z.bedarf) return ja;
  // Effekte sind Rückmeldung auf eine Aktion: immer flüssig, auch bei „Weniger Bewegung“ und im Sparmodus.
  if (e.effekte_aktiv) return nach(FLUESSIG_MS);
  if (e.animation === 'an' && e.bedarf === 'fluessig') return nach(FLUESSIG_MS);
  // Baubalken sind Information und laufen auch bei ausgeschalteter Animation. Fließende Animation steht dann still
  // (maler.reduziert) und braucht nur das Sicherheitsbild – sonst hielte jedes Dorf mit Fluss den Sparmodus bei 4 Bildern/s.
  if (e.bedarf === 'langsam') return nach(LANGSAM_MS);
  return nach(SICHERHEITSBILD_MS);
}

/** Eine Messung je Bildaufruf: Abstand zum vorigen Aufruf, Dauer des Zeichnens, ob sich die Kamera bewegt hat. */
export interface BildProbe { raf_abstand_ms: number; zeichen_ms: number; kamera_bewegt: boolean }

/** So viele Proben mit Kamerabewegung braucht die Entscheidung (etwa 1 s Verschieben bei 60 Hz). */
export const MIN_KAMERA_PROBEN = 60;
/** Median des Bildabstands darüber: unter 40 Bildern/s beim Verschieben. */
const GRENZE_ABSTAND_MS = 25;
/** Median der Zeichendauer darüber: das Zeichnen allein frisst drei Viertel eines 60-Hz-Bilds. */
const GRENZE_ZEICHNEN_MS = 12;

function median(werte: number[]): number {
  const s = [...werte].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Ruckelt das Gerät wirklich? Gewertet werden nur Bilder mit Kamerabewegung – dort soll jedes Bild gezeichnet werden.
 * Ruhige Bilder mit absichtlichem 30er-Takt würden sonst jedes Gerät als langsam einstufen.
 */
export function sparHinweisNoetig(proben: readonly BildProbe[]): boolean {
  const bewegt = proben.filter((p) => p.kamera_bewegt);
  if (bewegt.length < MIN_KAMERA_PROBEN) return false;
  return median(bewegt.map((p) => p.raf_abstand_ms)) > GRENZE_ABSTAND_MS || median(bewegt.map((p) => p.zeichen_ms)) > GRENZE_ZEICHNEN_MS;
}
