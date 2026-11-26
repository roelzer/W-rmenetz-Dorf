import { geburtstagsschildAktiv } from '../core/geburtstag';
import { h } from './dom';

/** Einzige Stelle des Schildtextes. Entwurf: kleine obere Zeile, darunter Zahl und Anlass, zuletzt groß der Name. */
const TEXT = { oben: 'Alles Gute zum', zahl: '9.', rest: 'Geburtstag,', name: 'Phili!' } as const;
const GANZER_TEXT = `${TEXT.oben} ${TEXT.zahl} ${TEXT.rest} ${TEXT.name}`;

/** Zierde wie im Entwurf: Lage in Prozent der Bildfläche; Konfetti-Farbe = Index in farbe.geburtstag.konfetti. */
const ZIERDE = [
  { zeichen: '🎈', links: 6, oben: 22 }, { zeichen: '🎈', links: 88, oben: 18 },
  { zeichen: '🎉', links: 12, oben: 70 }, { zeichen: '🎂', links: 84, oben: 72 },
] as const;
const KONFETTI = [
  { links: 20, oben: 14, drehung: 25 }, { links: 34, oben: 8, drehung: -30 }, { links: 66, oben: 10, drehung: 40 },
  { links: 78, oben: 80, drehung: -15 }, { links: 28, oben: 82, drehung: 20 },
] as const;

/**
 * Zeigt das Geburtstagsschild über der Karte, wenn `datum` der 26.11.2026 ist; sonst passiert nichts (Rückgabe null).
 * Das ✕ entfernt die ganze Ebene aus dem Dokument. Gemerkt wird nichts: Ein Neustart am selben Tag zeigt es wieder.
 */
export function geburtstagsschildZeigen(datum: Date, weniger_bewegung: boolean): HTMLElement | null {
  if (!geburtstagsschildAktiv(datum)) return null;
  const ruhig = weniger_bewegung || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ebene = h('div', { class: ruhig ? 'geburtstagsschild ruhig' : 'geburtstagsschild' });
  const zierde = ZIERDE.map((z, i) => h('span', { class: 'gs-zier', 'aria-hidden': 'true', style: `left:${z.links}%;top:${z.oben}%;--gs-versatz:${i}` }, z.zeichen));
  const konfetti = KONFETTI.map((k, i) => h('span', { class: 'gs-konfetti', 'aria-hidden': 'true', style: `left:${k.links}%;top:${k.oben}%;transform:rotate(${k.drehung}deg);background:var(--farbe-geburtstag-konfetti-${i})` }));
  const schliessen = h('button', { type: 'button', class: 'gs-schliessen', 'aria-label': 'Geburtstagsschild schließen', onclick: () => ebene.remove() }, '✕');
  const schild = h('aside', { class: 'gs-schild', 'aria-label': GANZER_TEXT },
    schliessen,
    h('span', { class: 'gs-zeile gs-oben' }, h('span', { 'aria-hidden': 'true' }, '🎂 '), TEXT.oben, h('span', { 'aria-hidden': 'true' }, ' 🎂')),
    h('span', { class: 'gs-zeile gs-mitte' }, h('span', { class: 'gs-neun' }, TEXT.zahl), ` ${TEXT.rest}`),
    h('span', { class: 'gs-zeile gs-name' }, TEXT.name));
  ebene.append(...zierde, ...konfetti, schild);
  document.body.append(ebene);
  return ebene;
}
