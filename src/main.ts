import { Spiel } from './core/spiel';
import { laden, serialisieren, SPEICHER_SCHLUESSEL } from './core/speichern';
import { groesse } from './core/netz';
import { Effekte } from './render/effekte';
import { Kamera } from './render/kamera';
import { Maler } from './render/maler';
import { zeichneSzene } from './render/szene';

const uhr = (): number => Date.now();
const lesen = (): string | null => { try { return localStorage.getItem(SPEICHER_SCHLUESSEL); } catch { return null; } };
const spiel = new Spiel(laden(lesen(), uhr()), uhr);
spiel.bis(uhr());

const leinwand = document.getElementById('karte') as HTMLCanvasElement;
const kamera = new Kamera();
const maler = new Maler(leinwand.getContext('2d')!);
const effekte = new Effekte();

function groesseAnpassen(): void {
  const r = leinwand.parentElement!.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  leinwand.width = Math.round(r.width * dpr); leinwand.height = Math.round(r.height * dpr);
  if (kamera.groesseSetzen(r.width, r.height, dpr)) {
    const hz = spiel.hz; kamera.zentrieren(hz.x, hz.y, groesse(hz));
  }
}
window.addEventListener('resize', groesseAnpassen);
groesseAnpassen();

// Verschieben mit einem Finger/der Maus, Zoomen mit dem Mausrad (Zwei-Finger-Zoom folgt mit der Oberfläche).
let zieht: { x: number; y: number } | null = null;
leinwand.addEventListener('pointerdown', (e) => { zieht = { x: e.clientX, y: e.clientY }; leinwand.setPointerCapture(e.pointerId); });
leinwand.addEventListener('pointermove', (e) => {
  if (!zieht) return;
  kamera.schiebe_x += e.clientX - zieht.x; kamera.schiebe_y += e.clientY - zieht.y; kamera.begrenzen();
  zieht = { x: e.clientX, y: e.clientY };
});
leinwand.addEventListener('pointerup', () => { zieht = null; });
leinwand.addEventListener('wheel', (e) => { e.preventDefault(); kamera.zoomUm(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });

let letzt_ms = performance.now();
const t0 = performance.now();
function bild(jetzt: number): void {
  const dt = (jetzt - letzt_ms) / 1000; letzt_ms = jetzt;
  const nun = uhr();
  spiel.bis(nun);
  for (const ev of spiel.ereignisse.splice(0)) {
    if (ev.art === 'funken') {
      const o = ev.objekt_id === 'heizzentrale' ? spiel.hz : spiel.objekt(ev.objekt_id);
      if (o) { const [cx, cy] = kamera.mitte(o.x, o.y); maler.tw = kamera.tw; effekte.funken(cx, cy, kamera.tw, ev.farbe); }
    } else if (ev.art === 'schwebtext') effekte.schwebtext(ev.x, ev.y, ev.text);
  }
  maler.zeit_s = (jetzt - t0) / 1000;
  zeichneSzene(maler, kamera, {
    objekte: spiel.stand.objekte, innen: spiel.stand.innen, netz: spiel.netz, spiel,
    auswahl_id: null, modus: 'normal', geist: null, verschiebe_id: null, stempel: null, jetzt_ms: nun,
  }, effekte, dt);
  requestAnimationFrame(bild);
}
requestAnimationFrame(bild);

/** false, sobald Speichern scheitert (Speicher voll/gesperrt). Die Oberfläche zeigt dann einen Hinweis (F4); „gespeichert“ erscheint nie fälschlich. */
let speichernGelungen = true;
function speichern(): void {
  try { localStorage.setItem(SPEICHER_SCHLUESSEL, serialisieren(spiel.stand)); speichernGelungen = true; }
  catch (fehler) { speichernGelungen = false; console.warn('Speichern fehlgeschlagen', fehler); }
}
void speichernGelungen;
setInterval(speichern, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) speichern(); });
