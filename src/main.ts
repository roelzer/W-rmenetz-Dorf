import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import './ui/stil.css';

import { ladenMitBefund, serialisieren, SPEICHER_SCHLUESSEL, speichernErlaubt } from './core/speichern';
import { neuerSpielstand, Spiel } from './core/spiel';
import { Maler } from './render/maler';
import { zeichneSzene } from './render/szene';
import { Steuerung } from './steuerung';
import { tokensAnwenden } from './ui/tokens';
import { vorspannZeigen } from './ui/vorspann';
import { hinweisMitKnopf } from './ui/toast';
import { einstellungenLesen } from './ui/einstellungen';
import { tempoSpeichern, uhr } from './tempo';

tokensAnwenden();
vorspannZeigen(einstellungenLesen().weniger_bewegung);

const lesen = (): string | null => { try { return localStorage.getItem(SPEICHER_SCHLUESSEL); } catch { return null; } };
/** Einen unbrauchbaren Spielstand sichern, bevor er vom neuen Spiel überschrieben wird. */
function sichern(text: string | null): void {
  if (!text) return;
  try { localStorage.setItem(`${SPEICHER_SCHLUESSEL}-defekt`, text); } catch (fehler) { console.warn('Sicherung des alten Spielstands fehlgeschlagen', fehler); }
}
let startHinweis = '';
let weg: { geld_eur: number; seit_ms: number; bau: number } | null = null;
const gelesen = lesen();
const geladen = ladenMitBefund(gelesen, uhr());
let spiel: Spiel;
if (geladen.befund === 'defekt') { sichern(gelesen); startHinweis = 'Dein alter Spielstand ließ sich nicht lesen. Es beginnt ein neues Dorf (der alte Stand ist gesichert).'; }
else if (geladen.befund === 'migriert') startHinweis = 'Das Dorf hat jetzt Straßen und einen Fluss: Gebäude auf Straße oder Wasser wurden verschoben, Leitungen im Fluss entfernt und ihr Preis erstattet. Prüfe die Anschlüsse.';
try {
  spiel = new Spiel(geladen.stand, uhr);
  weg = { geld_eur: geladen.stand.geld_eur, seit_ms: geladen.stand.zuletzt_ms, bau: geladen.stand.objekte.filter((o) => o.bau).length };
  spiel.bis(uhr());
} catch (fehler) {
  console.warn('Spielstand führte zu einem Fehler, neues Dorf', fehler);
  sichern(gelesen);
  startHinweis = 'Dein alter Spielstand ließ sich nicht öffnen. Es beginnt ein neues Dorf (der alte Stand ist gesichert).';
  spiel = new Spiel(neuerSpielstand(uhr()), uhr);
}

const leinwand = document.getElementById('karte') as HTMLCanvasElement;
const maler = new Maler(leinwand.getContext('2d')!);
const steuerung = new Steuerung(spiel, leinwand, maler, uhr);
const kamera = steuerung.kamera;
if (startHinweis) steuerung.toast(startHinweis);
else if (weg && uhr() - weg.seit_ms > 5 * 60_000) {
  // A38: Willkommen zurück – was ist während der Abwesenheit passiert?
  const min = Math.round((uhr() - weg.seit_ms) / 60_000), dauer = min >= 120 ? `${Math.round(min / 60)} Std.` : `${min} Min.`;
  const diff = Math.round(spiel.stand.geld_eur - weg.geld_eur);
  steuerung.toast(`Willkommen zurück! Du warst ${dauer} weg: ${diff >= 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('de-DE')} € auf dem Konto${weg.bau && !spiel.stand.objekte.some((o) => o.bau) ? ', der Bau ist fertig' : ''}. Deine Kunden haben ihre Monatsrechnungen automatisch bezahlt.`);
}

function groesseAnpassen(): void {
  const r = leinwand.parentElement!.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  leinwand.width = Math.round(r.width * dpr); leinwand.height = Math.round(r.height * dpr);
  if (kamera.groesseSetzen(r.width, r.height, dpr)) steuerung.zentrieren();
}
window.addEventListener('resize', groesseAnpassen);
groesseAnpassen();

let letzt = performance.now();
const t0 = letzt;
function bild(jetzt: number): void {
  const dt = (jetzt - letzt) / 1000; letzt = jetzt;
  steuerung.tick(uhr());
  kamera.schritt(dt);
  maler.zeit_s = maler.reduziert ? 0 : (jetzt - t0) / 1000;
  zeichneSzene(maler, kamera, steuerung.szene(), steuerung.effekte, dt);
  requestAnimationFrame(bild);
}
requestAnimationFrame(bild);

/** Scheitert das Speichern (Speicher voll/gesperrt), erscheint einmal pro Sitzung ein Hinweis; „gespeichert“ wird nie angezeigt. */
let warnungGezeigt = false;
function speichern(): void {
  if (!speichernErlaubt()) return;
  tempoSpeichern();
  try { localStorage.setItem(SPEICHER_SCHLUESSEL, serialisieren(spiel.stand)); }
  catch (fehler) {
    console.warn('Speichern fehlgeschlagen', fehler);
    if (!warnungGezeigt) { warnungGezeigt = true; steuerung.toast('Speichern ist auf diesem Gerät gerade nicht möglich – dein Fortschritt geht beim Schließen verloren.'); }
  }
}
setInterval(speichern, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) speichern(); });
window.addEventListener('pagehide', speichern);

// Das Spiel läuft nur im Querformat; wo der Browser es erlaubt, wird die Drehung festgehalten.
try { void (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch((f: unknown) => console.warn('Drehsperre abgelehnt', f)); } catch (fehler) { console.warn('Drehsperre nicht verfügbar', fehler); }

// Offline spielbar (A16): Service Worker nur im fertigen Build, nicht im Entwicklungsserver.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch((f) => console.warn('Offline-Modus nicht verfügbar', f)); });
  // A83: Kommt eine neue Version an, übernimmt der neue Service Worker; der Spieler lädt neu, wann es ihm passt (der Spielstand bleibt).
  const hatteVersion = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hatteVersion) return;
    hinweisMitKnopf('Neue Version von Heatville ist da.', 'Neu laden', () => { speichern(); location.reload(); });
  });
}
// A83: Den Browser bitten, den Spielstand dauerhaft zu behalten (vor allem iPhone/Safari räumen sonst auf).
void navigator.storage?.persist?.().catch((f: unknown) => console.warn('Dauerhafter Speicher abgelehnt', f));
