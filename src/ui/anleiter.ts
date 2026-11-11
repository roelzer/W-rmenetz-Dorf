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

export interface AnleiterPlatz { links: number; unten?: number; oben?: number; breite: number; figur_px: 112 | 96 }
/** Figurgrößen nur aus den Tokens (`anleiter_figur` 112, `anleiter_figur_klein` 96), damit die Zahl nicht mehrfach fest im Code steht. */
const FIGUR_GROSS_PX = M.anleiter_figur as AnleiterPlatz['figur_px'], FIGUR_KLEIN_PX = M.anleiter_figur_klein as AnleiterPlatz['figur_px'];

/** Platzregel 13.3: unten links in der freien Fläche; mit offenem Blatt bzw. offener Zeichenleiste (freie Fläche schmaler
 *  als das Bild) freie Breite − 2 × Rand, sonst Bildbreite − 112 (88 px frei für [Bauen] plus Rand), höchstens 460.
 *  Liegt das Ziel im unteren Teil (Unterkante > Oberkante der Karte − 16), steht die Karte oben unter der Anzeigenreihe. */
export function anleiterPlatz(frei: Rechteck, ziel: Rechteck | null, bild: { breite: number; hoehe: number }): AnleiterPlatz {
  const rand = M.anleiter_rand;
  const blattOffen = frei.x + frei.b < bild.breite;
  const verfuegbar = blattOffen ? frei.b - 2 * rand : bild.breite - M.anleiter_platz_bauen - 2 * rand;
  const breite = Math.floor(Math.min(M.anleiter_karte_max, verfuegbar));
  const figur_px = frei.b < M.anleiter_figur_klein_unter ? FIGUR_KLEIN_PX : FIGUR_GROSS_PX;
  const kartenOben = bild.hoehe - rand - M.anleiter_hoehe;
  const links = frei.x + rand;
  if (ziel && ziel.y + ziel.h > kartenOben - M.anleiter_ziel_abstand) return { links, oben: T.groesse_px.blatt_oben_quer, breite, figur_px };
  return { links, unten: rand, breite, figur_px };
}

/** Die beiden Plätze aus 13.3 in Reihenfolge der Wahl: unten links, dann oben links unter der Anzeigenreihe. */
export function anleiterPlaetze(frei: Rechteck, bild: { breite: number; hoehe: number }): AnleiterPlatz[] {
  const { links, breite, figur_px } = anleiterPlatz(frei, null, bild);
  return [{ links, unten: M.anleiter_rand, breite, figur_px }, { links, oben: T.groesse_px.blatt_oben_quer, breite, figur_px }];
}

/** Bildschirm-Rechteck der Karte auf einem Platz bei gegebener Höhe. */
export function anleiterKasten(p: AnleiterPlatz, hoehe_px: number, bild: { breite: number; hoehe: number }): Rechteck {
  const y = p.oben !== undefined ? p.oben : bild.hoehe - (p.unten ?? M.anleiter_rand) - hoehe_px;
  return { x: p.links, y, b: p.breite, h: hoehe_px };
}

const ueberlappen = (a: Rechteck, b: Rechteck): boolean => a.x < b.x + b.b && b.x < a.x + a.b && a.y < b.y + b.h && b.y < a.y + a.h;

/** 13.3 „nie über dem Ziel“: erster Platz, dessen Karte (mit echter Höhe) keinen Lochrand berührt; `null`, wenn keiner frei ist –
 *  dann muss die Kamera die Ziele aus dem Weg nehmen. `loecher` sind die gezeichneten Lochränder inklusive Abstand. */
export function anleiterPlatzFrei(frei: Rechteck, loecher: Rechteck[], bild: { breite: number; hoehe: number }, hoehe_px: number): AnleiterPlatz | null {
  return anleiterPlaetze(frei, bild).find((p) => {
    const k = anleiterKasten(p, hoehe_px, bild);
    return !loecher.some((l) => ueberlappen(k, l));
  }) ?? null;
}

/** Abstand zur Karte gegen Rundungsfehler der Kamera-Rechnung: so berühren sich Lochrand und Karte nie wieder knapp. */
const FREI_SICHERHEIT_PX = 1;

/** Wohin die Kamera die Lochränder `loch` (Umriss aller Kartenziele) schieben muss, damit sie neben einer der Karten in `karten`
 *  und innerhalb von `flaeche` liegen. Geprüft werden die Lücken über, unter und rechts neben jeder Karte; liegt das Loch schon
 *  teils außerhalb der Fläche (z. B. unter der Anzeigenreihe), zählt diese Lage mit, wird aber nicht verschlimmert.
 *  Passt es nirgends in voller Größe, wird so wenig wie nötig verkleinert: `faktor` gilt für den Zoom; `zugabe_px` ist der Teil
 *  des Umrisses, der nicht mitwächst (Abstand des Lochrands, beide Seiten). Gewählt wird die Lücke mit dem kleinsten Weg plus
 *  Verkleinerung (1 − faktor, gemessen in Flächenbreiten). `von` → `nach`: Bildpunkt der Lochmitte vorher und nachher.
 *  `null`, wenn neben keiner Karte Platz ist. */
export function zielFlaecheNebenKarte(loch: Rechteck, karten: Rechteck[], flaeche: Rechteck, zugabe_px: number):
  { faktor: number; von: [number, number]; nach: [number, number] } | null {
  const x0 = Math.min(flaeche.x, loch.x), y0 = Math.min(flaeche.y, loch.y);
  const x1 = Math.max(flaeche.x + flaeche.b, loch.x + loch.b), y1 = Math.max(flaeche.y + flaeche.h, loch.y + loch.h);
  const cx = loch.x + loch.b / 2, cy = loch.y + loch.h / 2;
  const anteil = (platz: number, groesse: number): number => (groesse > zugabe_px ? (platz - zugabe_px) / (groesse - zugabe_px) : Infinity);
  const klemmen = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
  let beste: { faktor: number; von: [number, number]; nach: [number, number] } | null = null, besteKosten = Infinity;
  for (const k of karten) {
    const luecken: Rechteck[] = [
      { x: x0, y: y0, b: x1 - x0, h: k.y - y0 },
      { x: x0, y: k.y + k.h, b: x1 - x0, h: y1 - (k.y + k.h) },
      { x: k.x + k.b, y: y0, b: x1 - (k.x + k.b), h: y1 - y0 },
    ];
    for (const l of luecken) {
      const r = { x: l.x + FREI_SICHERHEIT_PX, y: l.y + FREI_SICHERHEIT_PX, b: l.b - 2 * FREI_SICHERHEIT_PX, h: l.h - 2 * FREI_SICHERHEIT_PX };
      const faktor = Math.min(1, anteil(r.b, loch.b), anteil(r.h, loch.h));
      if (!(faktor > 0)) continue;
      const b = faktor * (loch.b - zugabe_px) + zugabe_px, h = faktor * (loch.h - zugabe_px) + zugabe_px;
      const nx = klemmen(cx, r.x + b / 2, r.x + r.b - b / 2), ny = klemmen(cy, r.y + h / 2, r.y + r.h - h / 2);
      const kosten = Math.hypot(nx - cx, ny - cy) + (1 - faktor) * flaeche.b;
      if (kosten < besteKosten) { besteKosten = kosten; beste = { faktor, von: [cx, cy], nach: [nx, ny] }; }
    }
  }
  return beste;
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
  el.classList.toggle('figur-klein', p.figur_px === FIGUR_KLEIN_PX);
}

/** Zeigt die Karte für die Ansicht. Bei gleichem Inhalt wird nur die Restzeit erneuert – so springt der Fokus nicht und der
 *  Vorleser liest den Text nicht bei jedem Aufruf neu. */
export function anleiterZeigen(a: TutorialAnsicht, platz: AnleiterPlatz, aktionen: { weiter(): void }, jetzt_ms: number): void {
  if (!wurzel) {
    wurzel = h('div', { id: 'anleiter', class: 'anleiter', role: 'status', 'aria-live': 'polite' });
    document.getElementById('app')!.append(wurzel);
  }
  wurzel.classList.toggle('handlung', a.art === 'H' && a.weiter === null);
  platzSetzen(wurzel, platz);
  // Kapitel 3 (DESIGN 13.17.1 B6): kleine Figur und feste Höhe für drei Zeilen, damit die Karte die Spur nicht verdeckt
  wurzel.classList.toggle('kompakt', a.kompakt);
  if (a.kompakt) wurzel.classList.add('figur-klein');
  wurzel.style.height = a.kompakt ? `${M.anleiter_kompakt_hoehe}px` : '';
  const inhalt = JSON.stringify([a.schritt, a.kapitel, a.text, a.weiter, a.knopf_hinweis ?? '', a.wusstest_du, a.warte_text ?? '', a.wiedereinstieg, a.kompakt]);
  if (inhalt === gebaut && warteZeile) { warteZeile.textContent = a.weiter === 'wartet' ? warteText(a, jetzt_ms) : a.knopf_hinweis ?? ''; return; }
  gebaut = inhalt;
  const punkte = h('span', { class: 'kapitel-punkte', role: 'img', 'aria-label': `Kapitel ${a.kapitel} von ${KAPITEL_ANZAHL}` },
    ...Array.from({ length: KAPITEL_ANZAHL }, (_, i) => h('i', { class: i < a.kapitel ? 'punkt an' : 'punkt' })));
  warteZeile = h('span', { class: 'gedaempft' }, a.weiter === 'wartet' ? warteText(a, jetzt_ms) : a.knopf_hinweis ?? '');
  let weiterKnopf: HTMLButtonElement | null = null;
  if (!a.kompakt && (a.weiter === 'weiter' || a.weiter === 'los')) {
    weiterKnopf = knopf(a.weiter === 'los' ? 'Los geht’s' : 'Weiter', () => aktionen.weiter(), 'los', { klein: true });
    weiterKnopf.setAttribute('id', 'anleiter-weiter');
  }
  const zeileZeigen = weiterKnopf !== null || a.weiter === 'wartet' || !!a.knopf_hinweis;
  const blase = h('div', { class: 'anleiter-blase' },
    h('div', { class: 'anleiter-kopf' }, h('strong', { class: 'anleiter-name' }, 'Simon'), punkte),
    // Sammelliste P5 Punkt 5: kein Chip auf der kompakten Karte – ihre drei Zeilen gehören dem Satz
    !a.kompakt && a.wusstest_du ? h('span', { class: 'chip gold' }, 'Wusstest du?') : null,
    h('p', { class: 'anleiter-text' }, ...mitFett(a.text)),
    zeileZeigen ? h('div', { class: 'anleiter-knopfzeile' }, warteZeile, weiterKnopf) : null);
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
