import { MIN_KAMERA_PROBEN, sparHinweisNoetig, type BildProbe } from './takt';

/**
 * Entscheidungen der Bildschleife aus main.ts (A90), rein – ohne Browser, damit sie in Node testbar sind.
 * main.ts liest nur noch Uhr, Einstellungen und DOM und reicht die Werte hier durch.
 */

/**
 * Nach der Entscheidung von sollZeichnen: dt für zeichneSzene seit dem letzten **gezeichneten** Bild (Animationen laufen mit der
 * Zeit, nicht mit den Aufrufen) und der Merker `erzwingen`, der erst mit einem gezeichneten Bild erlischt.
 * main.ts übernimmt beide Werte nach dem Zeichnen.
 */
export function bildAbschluss(e: { zeichnen: boolean; jetzt_ms: number; letzt_gezeichnet_ms: number; erzwingen: boolean }):
  { dt_s: number; letzt_gezeichnet_ms: number; erzwingen: boolean } {
  if (!e.zeichnen) return { dt_s: 0, letzt_gezeichnet_ms: e.letzt_gezeichnet_ms, erzwingen: e.erzwingen };
  return { dt_s: (e.jetzt_ms - e.letzt_gezeichnet_ms) / 1000, letzt_gezeichnet_ms: e.jetzt_ms, erzwingen: false };
}

/** Der Sparmodus schaltet die Umgebungsanimation ebenfalls ab (main.ts überschreibt damit steuerung.bewegungAnwenden je Bild). */
export function animationAus(e: { weniger_bewegung: boolean; sparmodus: boolean }): boolean {
  return e.weniger_bewegung || e.sparmodus;
}

/**
 * Sammelt Proben für den Sparhinweis. `proben === null`: Messung beendet (schon entschieden oder auf dem Gerät schon gezeigt).
 * Gezählt wird nur nach dem Vorspann, ohne Sparmodus und nur bei Kamerabewegung – so wächst die Liste in Ruhe nicht.
 */
export function sparHinweisSchritt(proben: readonly BildProbe[] | null, probe: BildProbe, lage: { verdeckt: boolean; sparmodus: boolean }):
  { proben: readonly BildProbe[] | null; zeigen: boolean } {
  if (!proben || lage.verdeckt || lage.sparmodus || !probe.kamera_bewegt) return { proben, zeigen: false };
  const neu = [...proben, probe];
  if (neu.length < MIN_KAMERA_PROBEN) return { proben: neu, zeigen: false };
  return { proben: null, zeigen: sparHinweisNoetig(neu) };
}
