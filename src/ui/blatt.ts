import { h } from './dom';
import { symbol } from './bausteine';

export interface BlattOptionen {
  titel: string;
  stufe?: string;
  /** 'blatt' = von unten (Handy: ≤ 50 % Höhe), 'hoch' = 80 %, 'popup' = mittig mit abgedunkeltem Grund */
  art?: 'blatt' | 'hoch' | 'popup';
  schliessbar?: boolean;
  beiZu?: () => void;
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
  const zuKnopf = h('button', { type: 'button', class: 'schliessen', 'aria-label': 'Schließen', onclick: () => b.zu() }, symbol('schliessen'));
  const kopf = h('div', { class: 'kopf' }, h('span', { class: 'umriss', style: 'display:contents' }, titel), stufe, opt.schliessbar === false ? null : zuKnopf);
  titel.classList.add('umriss');
  const wurzel = h('section', { class: `blatt ${art === 'hoch' ? 'hoch' : art === 'popup' ? 'popup' : ''}`.trim(), role: 'dialog', 'aria-modal': art === 'popup' ? 'true' : null, 'aria-labelledby': 'blatt-titel', tabindex: -1 }, kopf, inhalt);
  const abdunkeln = art === 'popup' ? h('div', { class: 'abdunkeln' }) : null;
  const tasten = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && opt.schliessbar !== false) { e.preventDefault(); b.zu(); return; }
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
      opt.beiZu?.();
    },
  };
  aktuell = b;
  document.addEventListener('keydown', tasten);
  if (abdunkeln) ebene.append(abdunkeln);
  ebene.append(wurzel);
  document.body.classList.add('blatt-offen');
  wurzel.focus({ preventScroll: true });
  return b;
}
