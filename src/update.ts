/**
 * Der Browser prüft den Service Worker nur beim Navigieren auf eine neue Fassung. Eine installierte App, die am Handy tagelang
 * im Hintergrund bleibt und nur wieder hervorgeholt wird, navigiert nie und bliebe alt (Spielerbericht 26.11.). Darum fragt das
 * Spiel bei jeder Rückkehr nach; eine neue Fassung übernimmt danach der vorhandene Weg (skipWaiting → controllerchange → Hinweis).
 * Rückgabe: ob die Prüfung gelaufen ist.
 */
export async function aktualisierungPruefen(sw: { getRegistration(): Promise<{ update(): Promise<unknown> } | undefined> }): Promise<boolean> {
  try {
    const registrierung = await sw.getRegistration();
    if (!registrierung) return false;
    await registrierung.update();
    return true;
  } catch (fehler) {
    // Offline ist der Normalfall eines Offline-Spiels: kein Spielerhinweis, nur das Protokoll
    console.warn('Prüfung auf neue Version fehlgeschlagen', fehler);
    return false;
  }
}
