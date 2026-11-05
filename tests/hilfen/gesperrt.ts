// Gemeinsame Prüfhilfe für gesperrte Knöpfe (DESIGN.md 12.5 und 12.19).
// 12.19: Ein gesperrter Knopf mit Erklärung trägt `aria-disabled="true"` statt des HTML-Attributs `disabled`,
// damit Tippen, Enter und Leertaste ankommen und einen Hinweis zeigen können.
// Funktioniert mit der DOM-Attrappe (attrs-Objekt) und mit echten Elementen (getAttribute/hasAttribute).

type MitAttributen = { attrs?: Record<string, string>; getAttribute?: (k: string) => string | null; hasAttribute?: (k: string) => boolean };

const attr = (e: MitAttributen, k: string): string | null => {
  if (e.attrs) return k in e.attrs ? e.attrs[k] : null;
  return e.getAttribute ? e.getAttribute(k) : null;
};

/** Knopf ist gesperrt – egal ob alt (`disabled`) oder nach 12.19 (`aria-disabled="true"`). */
export const gesperrt = (e: MitAttributen): boolean => attr(e, 'disabled') !== null || attr(e, 'aria-disabled') === 'true';

/** Knopf ist gesperrt genau nach 12.19: `aria-disabled="true"` und KEIN `disabled` (sonst kommt kein Tippen an). */
export const gesperrtMitHinweis = (e: MitAttributen): boolean => attr(e, 'aria-disabled') === 'true' && attr(e, 'disabled') === null;

/** Gerät/Attrappe hat das HTML-Attribut `disabled` gesetzt. */
export const htmlDisabled = (e: MitAttributen): boolean => attr(e, 'disabled') !== null;
