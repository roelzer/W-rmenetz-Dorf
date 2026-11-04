import './ui/stil.css';
import { Spiel } from './core/spiel';
import { laden, serialisieren, SPEICHER_SCHLUESSEL } from './core/speichern';
import { Maler } from './render/maler';
import { zeichneSzene } from './render/szene';
import { Steuerung } from './steuerung';
import { tokensAnwenden } from './ui/tokens';

tokensAnwenden();

const uhr = (): number => Date.now();
const lesen = (): string | null => { try { return localStorage.getItem(SPEICHER_SCHLUESSEL); } catch { return null; } };
const spiel = new Spiel(laden(lesen(), uhr()), uhr);
spiel.bis(uhr());

const leinwand = document.getElementById('karte') as HTMLCanvasElement;
const maler = new Maler(leinwand.getContext('2d')!);
const steuerung = new Steuerung(spiel, leinwand, maler, uhr);
const kamera = steuerung.kamera;

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
  maler.zeit_s = maler.reduziert ? 0 : (jetzt - t0) / 1000;
  zeichneSzene(maler, kamera, steuerung.szene(), steuerung.effekte, dt);
  requestAnimationFrame(bild);
}
requestAnimationFrame(bild);

/** false, sobald Speichern scheitert (Speicher voll/gesperrt). Die Oberfläche zeigt dann einen Hinweis; „gespeichert“ erscheint nie fälschlich. */
let speichernGelungen = true;
let warnungGezeigt = false;
function speichern(): void {
  try { localStorage.setItem(SPEICHER_SCHLUESSEL, serialisieren(spiel.stand)); speichernGelungen = true; }
  catch (fehler) {
    speichernGelungen = false;
    console.warn('Speichern fehlgeschlagen', fehler);
    if (!warnungGezeigt) { warnungGezeigt = true; steuerung.toast('Speichern ist auf diesem Gerät gerade nicht möglich – dein Fortschritt geht beim Schließen verloren.'); }
  }
}
void speichernGelungen;
setInterval(speichern, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) speichern(); });
window.addEventListener('pagehide', speichern);

// Das Spiel läuft nur im Querformat; wo der Browser es erlaubt, wird die Drehung festgehalten.
try { void (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch((f: unknown) => console.warn('Drehsperre abgelehnt', f)); } catch (fehler) { console.warn('Drehsperre nicht verfügbar', fehler); }
