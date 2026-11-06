import type { TutorialAnsicht } from '../core/tutorial-vertrag';
import { zeitText } from '../render/gebaeude';
import { knopf } from './bausteine';
import { h } from './dom';
import type { Rechteck } from './spotlight';
import { sprecherFigur } from './sprecher';
import { T } from './tokens';

/** Anleiter-Karte des Tutorials: Simon mit Blase, Kapitel-Punkten und [Weiter] (DESIGN 13.2, 13.3, 13.11). Kennt weder Spiel
 *  noch Tutorial – sie zeigt nur, was die Ansicht sagt. */

const M = T.menue.mass_px, Z = T.menue.zeit_ms;
/** Gleiche Bedingung wie die CSS-Regeln `.weniger-bewegung …` und `prefers-reduced-motion` für das Erscheinen der Karte. */
const wenigerBewegung = (): boolean => document.body.classList.contains('weniger-bewegung') || matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Das Tutorial hat sechs Kapitel (DESIGN 13.5). */
const KAPITEL_ANZAHL = 6;

export interface AnleiterPlatz { links: number; unten?: number; oben?: number; breite: number; figur_px: 112 | 72 }

/** Platzregel 13.3: unten links in der freien Fläche; mit offenem Blatt bzw. offener Zeichenleiste (freie Fläche schmaler
 *  als das Bild) freie Breite − 2 × Rand, sonst Bildbreite − 112 (88 px frei für [Bauen] plus Rand), höchstens 460.
 *  Liegt das Ziel im unteren Teil (Unterkante > Oberkante der Karte − 16), steht die Karte oben unter der Anzeigenreihe. */
export function anleiterPlatz(frei: Rechteck, ziel: Rechteck | null, bild: { breite: number; hoehe: number }): AnleiterPlatz {
  const rand = M.anleiter_rand;
  const blattOffen = frei.x + frei.b < bild.breite;
  const verfuegbar = blattOffen ? frei.b - 2 * rand : bild.breite - M.anleiter_platz_bauen - 2 * rand;
  const breite = Math.floor(Math.min(M.anleiter_karte_max, verfuegbar));
  const figur_px = frei.b < M.anleiter_figur_klein_unter ? 72 : 112;
  const kartenOben = bild.hoehe - rand - M.anleiter_hoehe;
  const links = frei.x + rand;
  if (ziel && ziel.y + ziel.h > kartenOben - M.anleiter_ziel_abstand) return { links, oben: T.groesse_px.blatt_oben_quer, breite, figur_px };
  return { links, unten: rand, breite, figur_px };
}

let wurzel: HTMLElement | null = null;
let warteZeile: HTMLElement | null = null;
let gebaut = '';

/** `**Wort**` → fett als eigener Knoten (Fachbegriff zum Merken, 13.2). Alles Übrige bleibt reiner Text, nie HTML. */
function mitFett(text: string): Array<Node | string> {
  return text.split(/\*\*(.+?)\*\*/).map((teil, i) => (i % 2 === 1 ? h('strong', {}, teil) : teil)).filter((t) => t !== '');
}

function warteText(a: TutorialAnsicht, jetzt_ms: number): string {
  if (a.warte_text === undefined) return '';
  const rest_s = Math.max(0, ((a.warte_bis_ms ?? jetzt_ms) - jetzt_ms) / 1000);
  return a.warte_text.replace('{Restzeit}', zeitText(rest_s));
}

function platzSetzen(el: HTMLElement, p: AnleiterPlatz): void {
  el.style.left = `${p.links}px`;
  el.style.width = `${p.breite}px`;
  // Unten zusätzlich der Sicherheitsabstand des Geräts (13.3)
  el.style.bottom = p.unten !== undefined ? `calc(${p.unten}px + env(safe-area-inset-bottom))` : '';
  el.style.top = p.oben !== undefined ? `${p.oben}px` : '';
  el.classList.toggle('figur-klein', p.figur_px === 72);
}

/** Zeigt die Karte für die Ansicht. Bei gleichem Inhalt wird nur die Restzeit erneuert – so springt der Fokus nicht und der
 *  Vorleser liest den Text nicht bei jedem Aufruf neu. */
export function anleiterZeigen(a: TutorialAnsicht, platz: AnleiterPlatz, aktionen: { weiter(): void }, jetzt_ms: number): void {
  if (!wurzel) {
    wurzel = h('div', { id: 'anleiter', class: 'anleiter', role: 'status', 'aria-live': 'polite' });
    document.getElementById('app')!.append(wurzel);
  }
  platzSetzen(wurzel, platz);
  const inhalt = JSON.stringify([a.schritt, a.kapitel, a.text, a.weiter, a.knopf_hinweis ?? '', a.wusstest_du, a.warte_text ?? '', a.wiedereinstieg]);
  if (inhalt === gebaut && warteZeile) { warteZeile.textContent = a.weiter === 'wartet' ? warteText(a, jetzt_ms) : a.knopf_hinweis ?? ''; return; }
  gebaut = inhalt;
  const punkte = h('span', { class: 'kapitel-punkte', role: 'img', 'aria-label': `Kapitel ${a.kapitel} von ${KAPITEL_ANZAHL}` },
    ...Array.from({ length: KAPITEL_ANZAHL }, (_, i) => h('i', { class: i < a.kapitel ? 'punkt an' : 'punkt' })));
  warteZeile = h('span', { class: 'gedaempft' }, a.weiter === 'wartet' ? warteText(a, jetzt_ms) : a.knopf_hinweis ?? '');
  let weiterKnopf: HTMLButtonElement | null = null;
  if (a.weiter === 'weiter' || a.weiter === 'los') {
    weiterKnopf = knopf(a.weiter === 'los' ? 'Los geht’s' : 'Weiter', () => aktionen.weiter(), 'los', { klein: true });
    weiterKnopf.setAttribute('id', 'anleiter-weiter');
  }
  const blase = h('div', { class: 'anleiter-blase' },
    h('div', { class: 'anleiter-kopf' }, h('strong', { class: 'anleiter-name' }, 'Simon'), punkte),
    a.wusstest_du ? h('span', { class: 'chip gold' }, 'Wusstest du?') : null,
    h('p', { class: 'anleiter-text' }, ...mitFett(a.text)),
    h('div', { class: 'anleiter-knopfzeile' }, warteZeile, weiterKnopf));
  wurzel.replaceChildren(h('div', { class: 'anleiter-figur' }, sprecherFigur('Simon')), blase);
  // 13.11: Erklär-Schritt → Fokus auf [Weiter], sobald er erscheint
  weiterKnopf?.focus();
}

/** Lage der Karte für die Eingabesperre (Fall 2 der Tabelle AE-NR13-6); `null`, wenn keine Karte steht. */
export function anleiterRechteck(): Rechteck | null {
  if (!wurzel) return null;
  const r = wurzel.getBoundingClientRect();
  return { x: r.left, y: r.top, b: r.width, h: r.height };
}

/** Nimmt die Karte weg, z. B. solange eine Sprecher-Karte auf ihrem Platz steht (13.3: blendet in 200 ms aus).
 *  Die alte Karte verliert sofort Kennung und Lage, damit eine neue Karte während der Blende die einzige `#anleiter` ist und
 *  die Eingabesperre die verblassende Karte nicht mehr als Karte zählt. Bei „Weniger Bewegung“ verschwindet sie sofort. */
export function anleiterAusblenden(): void {
  const alt = wurzel;
  wurzel = null; warteZeile = null; gebaut = '';
  if (!alt) return;
  if (wenigerBewegung()) { alt.remove(); return; }
  alt.removeAttribute('id');
  alt.removeAttribute('role');
  alt.removeAttribute('aria-live');
  alt.setAttribute('aria-hidden', 'true');
  alt.style.pointerEvents = 'none';
  alt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: Z.anleiter_wechsel, fill: 'forwards' });
  window.setTimeout(() => alt.remove(), Z.anleiter_wechsel);
}
