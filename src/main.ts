import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import './ui/stil.css';

import { ladenMitBefund, serialisieren, SPEICHER_SCHLUESSEL, speichernErlaubt } from './core/speichern';
import { Spiel } from './core/spiel';
import { neuesSpielMitTutorial } from './core/start';
import { Maler } from './render/maler';
import { grafikenLaden } from './render/grafiken';
import { bodenEbeneEinrichten, bodenEbeneVerwerfen, zeichneSzene } from './render/szene';
import { animationBedarf, szenenSchluessel } from './render/szene-schluessel';
import { neuerTakt, sollZeichnen, type BildProbe } from './render/takt';
import { animationAus, bildAbschluss, sparHinweisSchritt } from './render/schleife';
import { aufloesungGeaendert, zeichenAufloesung, type Aufloesung } from './render/aufloesung';
import { Steuerung } from './steuerung';
import { tokensAnwenden } from './ui/tokens';
import { sprecherFotosVorladen } from './ui/sprecher';
import { vorspannZeigen } from './ui/vorspann';
import { hinweisMitKnopf } from './ui/toast';
import { beiEinstellungsAenderung, einstellungenLesen, type Einstellungen } from './ui/einstellungen';
import { tempoSpeichern, uhr } from './tempo';
import { installationStarten } from './ui/installation';

tokensAnwenden();
/** Nur lesen: Änderungen kommen über beiEinstellungsAenderung; geschrieben wird von der Oberfläche, nie von hier. */
let einstellungen: Einstellungen = einstellungenLesen();
vorspannZeigen(einstellungen.weniger_bewegung);
sprecherFotosVorladen();

const lesen = (): string | null => { try { return localStorage.getItem(SPEICHER_SCHLUESSEL); } catch { return null; } };
/** Einen unbrauchbaren Spielstand sichern, bevor er vom neuen Spiel überschrieben wird. */
function sichern(text: string | null): void {
  if (!text) return;
  try { localStorage.setItem(`${SPEICHER_SCHLUESSEL}-defekt`, text); } catch (fehler) { console.warn('Sicherung des alten Spielstands fehlgeschlagen', fehler); }
}
let startHinweis = '';
/** Defekter oder abgestürzter Stand: muss auch im Tutorial erscheinen (AE-NR13-8), darum über toastWichtig. */
let startWichtig = false;
let weg: { geld_eur: number; seit_ms: number; bau: number } | null = null;
const gelesen = lesen();
const geladen = ladenMitBefund(gelesen, uhr());
let spiel: Spiel;
if (geladen.befund === 'defekt') { sichern(gelesen); startWichtig = true; startHinweis = 'Dein alter Spielstand ließ sich nicht lesen. Es beginnt ein neues Dorf (der alte Stand ist gesichert).'; }
else if (geladen.befund === 'migriert') startHinweis = 'Das Dorf hat jetzt Straßen und einen Fluss: Gebäude auf Straße oder Wasser wurden verschoben, Leitungen im Fluss entfernt und ihr Preis erstattet. Prüfe die Anschlüsse.';
try {
  spiel = new Spiel(geladen.stand, uhr);
  weg = { geld_eur: geladen.stand.geld_eur, seit_ms: geladen.stand.zuletzt_ms, bau: geladen.stand.objekte.filter((o) => o.bau).length };
  spiel.gartenumbauRueckgaengig();
  const umzug = spiel.neubaugebietUmziehen();
  if (umzug && !startHinweis) startHinweis = umzug;
  spiel.bis(uhr());
} catch (fehler) {
  console.warn('Spielstand führte zu einem Fehler, neues Dorf', fehler);
  sichern(gelesen);
  startWichtig = true;
  startHinweis = 'Dein alter Spielstand ließ sich nicht öffnen. Es beginnt ein neues Dorf (der alte Stand ist gesichert).';
  spiel = new Spiel(neuesSpielMitTutorial(uhr()), uhr);
}

const leinwand = document.getElementById('karte') as HTMLCanvasElement;
const maler = new Maler(leinwand.getContext('2d')!);
const steuerung = new Steuerung(spiel, leinwand, maler, uhr);
// Der Installationshinweis darf das Tutorial und dessen Ziele nie verdecken. Bei bestehenden Dörfern startet er sofort,
// bei neuen Spielern erst nach dem vollständigen Tutorial.
steuerung.nachTutorial(() => installationStarten());
const kamera = steuerung.kamera;
let ersteMeldung = startHinweis;
// K6 (DESIGN 13.15): Im Tutorial entfällt „Willkommen zurück“ ganz und wird nicht nachgeholt.
if (!ersteMeldung && weg && !spiel.tutorialAktiv() && uhr() - weg.seit_ms > 5 * 60_000) {
  // A38: Willkommen zurück – was ist während der Abwesenheit passiert?
  const min = Math.round((uhr() - weg.seit_ms) / 60_000), dauer = min >= 120 ? `${Math.round(min / 60)} Std.` : `${min} Min.`;
  const diff = Math.round(spiel.stand.geld_eur - weg.geld_eur);
  ersteMeldung = `Willkommen zurück! Du warst ${dauer} weg: ${diff >= 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('de-DE')} € auf dem Konto${weg.bau && !spiel.stand.objekte.some((o) => o.bau) ? ', der Bau ist fertig' : ''}. Deine Kunden haben ihre Monatsrechnungen automatisch bezahlt.`;
}
if (ersteMeldung && startWichtig) steuerung.toastWichtig(ersteMeldung);
else if (ersteMeldung) steuerung.toast(ersteMeldung);
// NR18-D: Spielstand, in dem die Start-Meldung noch aussteht (Namensfenster schon erledigt) – nach der ersten Meldung zeigen
steuerung.startTippPlanen(ersteMeldung || undefined);

/**
 * Einziger Merker „sofort neu zeichnen“ (A90): nach echter Größenänderung, Einstellungswechsel, Rückkehr in die App und
 * Leinwand-Verlust. Wird dem Takt übergeben und nach dem Zeichnen zurückgesetzt.
 */
let erzwingen = false;
let aufloesung: Aufloesung = { faktor: 0, breite_px: 0, hoehe_px: 0 };
function groesseAnpassen(): void {
  const r = leinwand.parentElement!.getBoundingClientRect();
  const a = zeichenAufloesung(r.width, r.height, window.devicePixelRatio, einstellungen.sparmodus);
  if (aufloesungGeaendert(aufloesung, a)) {
    aufloesung = a;
    leinwand.width = a.breite_px; leinwand.height = a.hoehe_px;
    erzwingen = true;
  }
  if (kamera.groesseSetzen(r.width, r.height, a.faktor)) steuerung.zentrieren();
}
window.addEventListener('resize', groesseAnpassen);
// Die mobile Browserleiste verändert den sichtbaren Bereich nicht in jeder iOS-Version über ein zuverlässiges
// window.resize. Bleiben Kamera/Leinwand auf dem alten Seitenverhältnis, streckt CSS das Bild und Häuser wirken verzerrt.
window.visualViewport?.addEventListener('resize', groesseAnpassen);
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(groesseAnpassen).observe(leinwand.parentElement!);
groesseAnpassen();
beiEinstellungsAenderung((e) => {
  const sparWechsel = e.sparmodus !== einstellungen.sparmodus;
  einstellungen = { ...e };
  if (sparWechsel) groesseAnpassen();
  erzwingen = true; // „Weniger Bewegung“ friert die Zeit ein – das Bild soll das sofort zeigen
});
/** Rückkehr in die App oder Leinwand-Verlust: der zwischengespeicherte Boden kann leer sein – freigeben und sofort neu zeichnen. */
const neuAufbauen = (): void => { bodenEbeneVerwerfen(); erzwingen = true; };
void grafikenLaden().then(neuAufbauen);
// Zweitleinwand für den ruhenden Boden; sie kann ihren Inhalt wie die Karte verlieren (Speicherdruck auf dem Handy).
bodenEbeneEinrichten((b, h) => {
  const c = document.createElement('canvas');
  c.width = b; c.height = h;
  c.addEventListener('contextrestored', neuAufbauen);
  return c;
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) neuAufbauen(); });
// Nur bei Rückkehr aus dem Seiten-Zwischenspeicher; beim ersten Laden soll unter dem Vorspann kein zweites Bild entstehen.
window.addEventListener('pageshow', (e) => { if (e.persisted) neuAufbauen(); });
leinwand.addEventListener('contextrestored', neuAufbauen);

const vorspannDeckt = (): boolean => { const v = document.getElementById('vorspann'); return !!v && !v.classList.contains('aus'); };

/** Messanzeige für die Abnahme auf dem Handy (`?messen=1`): Bildabstand der Bildaufrufe und gezeichnete Bilder je Sekunde. */
const messfeld = new URLSearchParams(location.search).get('messen') === '1' ? document.createElement('div') : null;
if (messfeld) {
  messfeld.id = 'messanzeige';
  messfeld.style.cssText = 'position:fixed;left:4px;top:4px;z-index:9999;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,.65);color:#fff;font:12px/1.3 monospace;pointer-events:none';
  document.body.append(messfeld);
}
const messAbstaende: number[] = [];
let messGezeichnet = 0, messStart = performance.now();
const perzentil = (sortiert: number[], p: number): number => sortiert[Math.min(sortiert.length - 1, Math.floor(p * sortiert.length))] ?? 0;
function messen(jetzt: number, abstand_ms: number, gezeichnet: boolean): void {
  if (!messfeld) return;
  messAbstaende.push(abstand_ms);
  if (gezeichnet) messGezeichnet++;
  if (jetzt - messStart < 1000) return;
  const s = messAbstaende.sort((a, b) => a - b);
  messfeld.textContent = `p50 ${perzentil(s, 0.5).toFixed(1)} ms · p95 ${perzentil(s, 0.95).toFixed(1)} ms · gezeichnet ${Math.round(messGezeichnet * 1000 / (jetzt - messStart))}/s`;
  messAbstaende.length = 0; messGezeichnet = 0; messStart = jetzt;
}

/** Einmal je Gerät: Ruckelt das Spiel beim Verschieben, wird der Sparmodus empfohlen (Messung nach dem Vorspann). */
const SPARHINWEIS_SCHLUESSEL = 'waermedorf-sparhinweis-v1';
function sparHinweisSchonGezeigt(): boolean {
  try { return localStorage.getItem(SPARHINWEIS_SCHLUESSEL) !== null; }
  catch (fehler) { console.warn('Merker für den Sparhinweis nicht lesbar, Hinweis entfällt', fehler); return true; }
}
let sparProben: readonly BildProbe[] | null = sparHinweisSchonGezeigt() ? null : [];
function sparHinweisPruefen(probe: BildProbe, verdeckt: boolean): void {
  const r = sparHinweisSchritt(sparProben, probe, { verdeckt, sparmodus: einstellungen.sparmodus });
  sparProben = r.proben;
  if (!r.zeigen) return;
  steuerung.toast('Das Spiel ruckelt auf diesem Gerät. Tipp: Sparmodus in den Dorf-Einstellungen einschalten.');
  try { localStorage.setItem(SPARHINWEIS_SCHLUESSEL, '1'); } catch (fehler) { console.warn('Merker für den Sparhinweis nicht speicherbar', fehler); }
}

let takt = neuerTakt();
let letzt = performance.now(), letztGezeichnet = letzt, letzteKamera = '';
const t0 = letzt;
function bild(jetzt: number): void {
  const raf_abstand_ms = jetzt - letzt; letzt = jetzt;
  steuerung.tick(uhr(), jetzt);
  kamera.schritt(raf_abstand_ms / 1000);
  // Überschreibt steuerung.bewegungAnwenden je Bild absichtlich: der Sparmodus schaltet die Umgebungsanimation ebenfalls ab.
  maler.reduziert = animationAus(einstellungen);
  steuerung.effekte.sparsam = einstellungen.sparmodus;
  const szene = steuerung.szene(), kameraSchluessel = kamera.schluessel(), effekte_aktiv = steuerung.effekte.aktiv(), verdeckt = vorspannDeckt();
  const r = sollZeichnen(takt, {
    jetzt_ms: jetzt, szene: szenenSchluessel(szene), kamera: kameraSchluessel, bedarf: animationBedarf(szene, effekte_aktiv),
    effekte_aktiv, animation: maler.reduziert ? 'aus' : 'an', sparmodus: einstellungen.sparmodus, verdeckt, erzwingen,
  });
  takt = r.zustand;
  const abschluss = bildAbschluss({ zeichnen: r.zeichnen, jetzt_ms: jetzt, letzt_gezeichnet_ms: letztGezeichnet, erzwingen });
  let zeichen_ms = 0;
  if (r.zeichnen) {
    maler.zeit_s = maler.reduziert ? 0 : (jetzt - t0) / 1000;
    const start = performance.now();
    zeichneSzene(maler, kamera, szene, steuerung.effekte, abschluss.dt_s, steuerung.fingerAufKarte());
    zeichen_ms = performance.now() - start;
  }
  letztGezeichnet = abschluss.letzt_gezeichnet_ms; erzwingen = abschluss.erzwingen;
  sparHinweisPruefen({ raf_abstand_ms, zeichen_ms, kamera_bewegt: kameraSchluessel !== letzteKamera }, verdeckt);
  letzteKamera = kameraSchluessel;
  messen(jetzt, raf_abstand_ms, r.zeichnen);
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
    if (!warnungGezeigt) { warnungGezeigt = true; steuerung.toastWichtig('Speichern ist auf diesem Gerät gerade nicht möglich – dein Fortschritt geht beim Schließen verloren.'); }
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
    // Mitten im Tutorial wartet der Hinweis bis zum Ende (Bauplan NR13 P4)
    steuerung.nachTutorial(() => hinweisMitKnopf('Neue Version von Heatville ist da.', 'Neu laden', () => { speichern(); location.reload(); }));
  });
}
// A83: Den Browser bitten, den Spielstand dauerhaft zu behalten (vor allem iPhone/Safari räumen sonst auf).
void navigator.storage?.persist?.().catch((f: unknown) => console.warn('Dauerhafter Speicher abgelehnt', f));

// Der Startstatus funktioniert auch ohne Spielskript. Erst nach erfolgreichem Start übernimmt die Oberfläche.
document.getElementById('startstatus')?.setAttribute('hidden', '');
document.getElementById('drehen')?.removeAttribute('hidden');
