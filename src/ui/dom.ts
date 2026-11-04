type Kind = Node | string | number | null | false | undefined;
type Attr = Record<string, unknown>;

/** Kleine Hilfe zum Bauen von DOM-Elementen. `on…` = Ereignis, `class`, `data-…`, `aria-…` als Attribut. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attr: Attr = {}, ...kinder: Kind[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attr)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') e.className = String(v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kinder) {
    if (c == null || c === false) continue;
    e.append(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  return e;
}

export const eur = (n: number): string => `${Math.floor(n).toLocaleString('de-DE')} €`;
export const zahl = (n: number): string => Math.round(n).toLocaleString('de-DE');
