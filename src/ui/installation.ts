import { knopf } from './bausteine';
import { h } from './dom';

interface InstallationsEreignis extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const AUSGEBLENDET_BIS = 'heatville-installation-ausgeblendet-bis-v1';
const DREI_TAGE_MS = 3 * 24 * 60 * 60 * 1000;
let angebot: InstallationsEreignis | null = null;
let banner: HTMLElement | null = null;

const navigatorMitAppModus = (): Navigator & { standalone?: boolean; maxTouchPoints?: number } =>
  (typeof navigator === 'undefined' ? { userAgent: '', platform: '', maxTouchPoints: 0 } : navigator) as Navigator & { standalone?: boolean; maxTouchPoints?: number };

/** Eine installierte PWA hat keine Browserleiste. Safari meldet das über navigator.standalone. */
export function laeuftAlsApp(): boolean {
  return (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches)
    || navigatorMitAppModus().standalone === true;
}

export function istHandyOderTablet(): boolean {
  if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) return true;
  return navigatorMitAppModus().maxTouchPoints! > 0;
}

export function istAppleMobil(): boolean {
  const n = navigatorMitAppModus();
  const kennung = n.userAgent;
  return /iPhone|iPad|iPod/i.test(kennung)
    || (n.platform === 'MacIntel' && n.maxTouchPoints! > 1);
}

function ausgeblendet(): boolean {
  try { return Number(localStorage.getItem(AUSGEBLENDET_BIS) ?? 0) > Date.now(); }
  catch { return false; }
}

function ausblenden(): void {
  banner?.remove(); banner = null;
  try { localStorage.setItem(AUSGEBLENDET_BIS, String(Date.now() + DREI_TAGE_MS)); } catch { /* Hinweis darf ohne Speicher trotzdem schließen. */ }
}

async function installieren(): Promise<void> {
  if (angebot) {
    const jetzt = angebot;
    angebot = null;
    await jetzt.prompt();
    const wahl = await jetzt.userChoice;
    if (wahl.outcome === 'accepted') banner?.remove();
    return;
  }
  const text = banner?.querySelector<HTMLElement>('.install-text');
  if (!text) return;
  text.textContent = istAppleMobil()
    ? 'Tippe in Safari auf Teilen und danach auf „Zum Home-Bildschirm“. Starte Heatville anschließend über das neue Symbol.'
    : 'Öffne das Browsermenü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.';
}

function bannerZeigen(): void {
  if (banner || laeuftAlsApp() || !istHandyOderTablet() || ausgeblendet()) return;
  const text = h('p', { class: 'install-text' }, 'Ohne Browserleiste spielen und mehr von deinem Dorf sehen.');
  const aktion = knopf(angebot ? 'Als App installieren' : 'So geht’s', () => { void installieren(); }, '', { klein: true });
  aktion.classList.add('install-aktion');
  const schliessen = h('button', { type: 'button', class: 'install-schliessen', 'aria-label': 'Installationshinweis schließen', onclick: ausblenden }, '×');
  banner = h('aside', { class: 'install-hinweis', 'aria-label': 'Heatville als App öffnen' },
    h('div', { class: 'install-symbol', 'aria-hidden': 'true' }, '↗'),
    h('div', { class: 'install-inhalt' }, h('strong', {}, 'Mehr Platz zum Spielen'), text),
    aktion, schliessen);
  document.body.append(banner);
}

/** Zeigt den Hinweis erst nach dem Vorspann, damit der Spielstart ruhig bleibt. */
export function installationStarten(): void {
  if (laeuftAlsApp() || !istHandyOderTablet()) return;
  window.setTimeout(bannerZeigen, 3200);
}

/** Dauerhaft auffindbare Hilfe in den Dorf-Einstellungen. */
export function installationsKasten(): HTMLElement {
  if (laeuftAlsApp()) {
    return h('div', { class: 'kasten app-kasten' }, h('h3', {}, 'Handy-App'), h('p', { class: 'gedaempft' }, 'Heatville läuft bereits ohne Browserleiste als App.'));
  }
  const erklaerung = h('p', { class: 'gedaempft' }, istAppleMobil()
    ? 'In Safari: Teilen → „Zum Home-Bildschirm“. Danach Heatville über das Symbol starten.'
    : 'Installiere Heatville auf dem Startbildschirm. Danach startet es ohne Adressleiste und funktioniert auch offline.');
  return h('div', { class: 'kasten app-kasten' }, h('h3', {}, 'Mehr Platz auf dem Handy'), erklaerung,
    knopf(angebot ? 'Heatville installieren' : 'Anleitung anzeigen', () => { banner?.remove(); banner = null; bannerZeigen(); void installieren(); }, '', { klein: true }));
}

// Android/Chromium: Das native Installationsfenster darf nur nach einem Klick geöffnet werden.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    angebot = e as InstallationsEreignis;
    const warSichtbar = banner !== null;
    banner?.remove(); banner = null;
    if (warSichtbar) bannerZeigen();
  });
  window.addEventListener('appinstalled', () => { angebot = null; banner?.remove(); banner = null; });
}
