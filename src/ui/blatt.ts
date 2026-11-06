import { h } from './dom';
import { symbol, type SperreJetzt } from './bausteine';
import { meldungNebenBlatt, toast } from './toast';

export interface BlattOptionen {
  titel: string;
  stufe?: string;
  /** 'blatt' = von unten (Handy: ≤ 50 % Höhe), 'hoch' = 80 %, 'popup' = mittig mit abgedunkeltem Grund */
  art?: 'blatt' | 'hoch' | 'popup';
  schliessbar?: boolean;
  /** zusätzliche Klasse am Blatt (z. B. 'zeichenleiste', DESIGN.md 12.18) */
  klasse?: string;
  /** zusätzlicher Knopf im Kopf vor [X] (Zeichenleiste: [?], DESIGN.md 12.18) – steht so auch in der Tab-Reihenfolge davor */
  kopfKnopf?: HTMLElement;
  beiZu?: () => void;
  /** NR13: Sperre für [X] und Esc, beim Tippen gelesen – gesperrt wackelt [X], der Hinweis kommt, das Blatt bleibt offen (12.19) */
  zuSperre?: SperreJetzt;
}

export interface Blatt {
  wurzel: HTMLElement;
  inhalt: HTMLElement;
  titel: HTMLElement;
  stufe: HTMLElement;
  zu(): void;
}

let aktuell: Blatt | null = null;
let vorherFokus: Element | null = null;

export const blattOffen = (): boolean => aktuell !== null;
export const blattSchliessen = (): void => aktuell?.zu();
/** Tatsächliche Breite des offenen Blatts in px (DESIGN.md 12.21 Punkt 4: aus dem Rechteck lesen, nicht nachrechnen); 0 ohne Blatt. */
export const blattBreite_px = (): number => (aktuell ? aktuell.wurzel.getBoundingClientRect().width : 0);

/** Öffnet genau ein Blatt (ein neues ersetzt das alte). Fokus bleibt gefangen, Esc schließt. */
export function blattOeffnen(opt: BlattOptionen): Blatt {
  aktuell?.zu();
  const ebene = document.getElementById('ebene')!;
  vorherFokus = document.activeElement;
  const art = opt.art ?? 'blatt';
  ebene.classList.toggle('mitte', art === 'popup');
  const titel = h('h2', { id: 'blatt-titel' }, opt.titel);
  const stufe = h('span', { class: 'stufe' }, opt.stufe ?? '');
  const inhalt = h('div', { class: 'inhalt' });
  const zuKnopf = h('button', { type: 'button', class: 'schliessen', 'aria-label': 'Schließen', onclick: () => zuWennFrei() }, symbol('schliessen'));
  zuKnopf.addEventListener('animationend', () => zuKnopf.classList.remove('wackelt'));
  /** Wie ein gesperrter Knopf (bausteine.ts sperrbar): liefert der Hinweis `null`, gilt die Sperre nicht mehr. */
  const zuWennFrei = (): void => {
    const s = opt.zuSperre?.() ?? null;
    const text = s ? (typeof s.hinweis === 'function' ? s.hinweis() : s.hinweis) : null;
    if (!s || text === null) { b.zu(); return; }
    // Klasse neu setzen, damit das Wackeln auch beim zweiten Tippen wieder anläuft
    zuKnopf.classList.remove('wackelt'); void zuKnopf.offsetWidth; zuKnopf.classList.add('wackelt');
    if (text) toast(text);
  };
  const kopf = h('div', { class: 'kopf' }, h('span', { class: 'umriss', style: 'display:contents' }, titel), stufe, opt.kopfKnopf ?? null, opt.schliessbar === false ? null : zuKnopf);
  titel.classList.add('umriss');
  const wurzel = h('section', { class: `blatt ${art === 'hoch' ? 'hoch' : art === 'popup' ? 'popup' : ''} ${opt.klasse ?? ''}`.trim(), role: 'dialog', 'aria-modal': art === 'popup' ? 'true' : null, 'aria-labelledby': 'blatt-titel', tabindex: -1 }, kopf, inhalt);
  const abdunkeln = art === 'popup' ? h('div', { class: 'abdunkeln' }) : null;
  const tasten = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && opt.schliessbar !== false) { e.preventDefault(); zuWennFrei(); return; }
    if (e.key !== 'Tab') return;
    const f = [...wurzel.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((x) => !x.hasAttribute('disabled') && x.offsetParent !== null);
    if (!f.length) return;
    const erst = f[0], letzt = f[f.length - 1];
    if (e.shiftKey && document.activeElement === erst) { e.preventDefault(); letzt.focus(); }
    else if (!e.shiftKey && document.activeElement === letzt) { e.preventDefault(); erst.focus(); }
  };
  const b: Blatt = {
    wurzel, inhalt, titel, stufe,
    zu() {
      if (aktuell !== b) return;
      aktuell = null;
      document.removeEventListener('keydown', tasten);
      wurzel.remove(); abdunkeln?.remove(); ebene.classList.remove('mitte');
      document.body.classList.remove('blatt-offen');
      if (vorherFokus instanceof HTMLElement) vorherFokus.focus({ preventScroll: true });
      meldungNebenBlatt(null);
      opt.beiZu?.();
    },
  };
  aktuell = b;
  document.addEventListener('keydown', tasten);
  if (abdunkeln) ebene.append(abdunkeln);
  ebene.append(wurzel);
  document.body.classList.add('blatt-offen');
  wurzel.focus({ preventScroll: true });
  meldungNebenBlatt(wurzel, art === 'popup');
  return b;
}
