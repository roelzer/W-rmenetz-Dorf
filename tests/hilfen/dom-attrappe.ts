// Gemeinsame Testhilfe (Tester-Vorarbeit NR16-B2): eine kleine, aber vollständigere DOM-Nachbildung als
// tests/hilfen/kontext-attrappe.ts – mit Eltern-Zeigern, remove(), classList, textContent, dataset, style, hidden,
// einfachen CSS-Selektoren (querySelector/closest/matches) und Ereignissen mit mehreren Empfängern.
// Damit laufen die echten Oberflächen-Module (blatt.ts, hud.ts, steuerung.ts, toast.ts) ohne Browser.
// Layout (Breiten, Lage) kann diese Nachbildung NICHT rechnen – getBoundingClientRect liefert, was ein Test vorgibt.

type Empfaenger = (ev: unknown) => void;
type Rechteck = { left: number; top: number; right: number; bottom: number; width: number; height: number; x: number; y: number };

export class TextKnoten {
  parentNode: El | null = null;
  constructor(public text: string) {}
  get textContent(): string { return this.text; }
  set textContent(v: string) { this.text = v; }
  remove(): void { this.parentNode?.entfernen(this); }
}

export type Kind = El | TextKnoten;

/** Einfache Selektoren: Liste mit Komma, Nachfahre (Leerzeichen), Kind (>), je Teil Tag, #id, .klasse, [attr], [attr="w"], :not(…). */
function passtEinfach(e: El, teil: string): boolean {
  let rest = teil.trim();
  const nots: string[] = [];
  rest = rest.replace(/:not\(([^)]*)\)/g, (_m, inner: string) => { nots.push(inner); return ''; });
  const attrs: Array<[string, string | null, string]> = [];
  rest = rest.replace(/\[([^\]=^$*~|]+)(?:([\^$*]?=)"?([^"\]]*)"?)?\]/g, (_m, k: string, op: string | undefined, v: string | undefined) => { attrs.push([k.trim(), v ?? null, op ?? '=']); return ''; });
  const m = rest.match(/^([a-zA-Z0-9*-]*)((?:[#.][\w-]+)*)$/);
  if (!m) return false;
  const [, tag, rest2] = m;
  if (tag && tag !== '*' && e.tag.toLowerCase() !== tag.toLowerCase()) return false;
  for (const t of rest2.match(/[#.][\w-]+/g) ?? []) {
    if (t[0] === '#' && e.attrs.id !== t.slice(1)) return false;
    if (t[0] === '.' && !e.klassen().includes(t.slice(1))) return false;
  }
  for (const [k, v, op] of attrs) {
    const ist = k === 'class' ? e.className : e.attrs[k];
    if (ist === undefined) return false;
    if (v !== null) {
      if (op === '=' && ist !== v) return false;
      if (op === '^=' && !ist.startsWith(v)) return false;
      if (op === '$=' && !ist.endsWith(v)) return false;
      if (op === '*=' && !ist.includes(v)) return false;
    }
  }
  return nots.every((n) => !passtEinfach(e, n));
}
function passtKette(e: El, kette: string): boolean {
  const teile = kette.trim().replace(/\s*>\s*/g, ' > ').split(/\s+/);
  const pruefe = (el: El | null, i: number): boolean => {
    if (!el || i < 0) return i < 0;
    if (!passtEinfach(el, teile[i])) return false;
    if (i === 0) return true;
    if (teile[i - 1] === '>') return pruefe(el.parentNode, i - 2);
    for (let p = el.parentNode; p; p = p.parentNode) if (pruefe(p, i - 1)) return true;
    return false;
  };
  return pruefe(e, teile.length - 1);
}
export const passt = (e: El, sel: string): boolean => sel.split(',').some((k) => passtKette(e, k));

export class El {
  tag: string;
  className = '';
  attrs: Record<string, string> = {};
  kinder: Kind[] = [];
  parentNode: El | null = null;
  ereignisse: Record<string, Empfaenger[]> = {};
  /** Vom Test vorgegebenes Rechteck (getBoundingClientRect). */
  rechteck: Rechteck = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
  style: Record<string, unknown> & { setProperty(k: string, v: string): void; removeProperty(k: string): void; getPropertyValue(k: string): string };
  dataset: Record<string, string>;
  scrollTop = 0; scrollLeft = 0;
  constructor(tag: string) {
    this.tag = tag;
    const st: Record<string, unknown> = {};
    st.setProperty = (k: string, v: string) => { st[k] = v; };
    st.removeProperty = (k: string) => { delete st[k]; };
    st.getPropertyValue = (k: string) => String(st[k] ?? '');
    this.style = st as El['style'];
    const self = this;
    this.dataset = new Proxy({}, {
      get: (_t, k: string) => self.attrs[`data-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`],
      set: (_t, k: string, v) => { self.attrs[`data-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`] = String(v); return true; },
      deleteProperty: (_t, k: string) => { delete self.attrs[`data-${k}`]; return true; },
    }) as Record<string, string>;
  }
  get tagName(): string { return this.tag.toUpperCase(); }
  get nodeName(): string { return this.tagName; }
  get id(): string { return this.attrs.id ?? ''; }
  set id(v: string) { this.attrs.id = v; }
  klassen(): string[] { return this.className.split(/\s+/).filter(Boolean); }
  get classList() {
    const setze = (l: string[]) => { this.className = l.join(' '); };
    return {
      add: (...k: string[]) => setze([...this.klassen(), ...k.filter((x) => !this.klassen().includes(x))]),
      remove: (...k: string[]) => setze(this.klassen().filter((x) => !k.includes(x))),
      contains: (k: string) => this.klassen().includes(k),
      toggle: (k: string, an?: boolean) => { const soll = an ?? !this.klassen().includes(k); setze(soll ? [...this.klassen().filter((x) => x !== k), k] : this.klassen().filter((x) => x !== k)); return soll; },
      replace: (alt: string, neu: string) => { setze(this.klassen().map((x) => (x === alt ? neu : x))); return true; },
      get length() { return 0; },
    };
  }
  setAttribute(k: string, v: string): void { if (k === 'class') this.className = String(v); else this.attrs[k] = String(v); }
  getAttribute(k: string): string | null { return k === 'class' ? this.className : k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k: string): boolean { return k === 'class' ? this.className !== '' : k in this.attrs; }
  removeAttribute(k: string): void { delete this.attrs[k]; }
  toggleAttribute(k: string, an?: boolean): boolean { const soll = an ?? !(k in this.attrs); if (soll) this.attrs[k] = ''; else delete this.attrs[k]; return soll; }
  get hidden(): boolean { return 'hidden' in this.attrs; }
  set hidden(v: boolean) { if (v) this.attrs.hidden = ''; else delete this.attrs.hidden; }
  get disabled(): boolean { return 'disabled' in this.attrs; }
  set disabled(v: boolean) { if (v) this.attrs.disabled = ''; else delete this.attrs.disabled; }
  get type(): string { return this.attrs.type ?? ''; }
  set type(v: string) { this.attrs.type = v; }
  value = '';
  addEventListener(n: string, f: Empfaenger): void { (this.ereignisse[n] ??= []).push(f); }
  removeEventListener(n: string, f: Empfaenger): void { this.ereignisse[n] = (this.ereignisse[n] ?? []).filter((x) => x !== f); }
  /** Ereignis an alle Empfänger dieses Elements (kein Aufsteigen). */
  ausloesen(n: string, ev: Record<string, unknown> = {}): { defaultPrevented: boolean } {
    const e = { type: n, target: this, currentTarget: this, defaultPrevented: false, preventDefault() { e.defaultPrevented = true; }, stopPropagation() {}, stopImmediatePropagation() {}, ...ev };
    for (const f of [...(this.ereignisse[n] ?? [])]) f(e);
    return e;
  }
  dispatchEvent(ev: { type: string }): boolean { return !this.ausloesen(ev.type, ev as unknown as Record<string, unknown>).defaultPrevented; }
  click(): void { if (!this.disabled) this.ausloesen('click'); }
  focus(): void { aktiv.el = this; }
  blur(): void { if (aktiv.el === this) aktiv.el = null; }
  private aufnehmen(k: unknown): Kind {
    const kind: Kind = k instanceof El || k instanceof TextKnoten ? k : new TextKnoten(String(k));
    if (kind.parentNode) kind.parentNode.entfernen(kind);
    kind.parentNode = this;
    return kind;
  }
  append(...k: unknown[]): void { for (const x of k) { if (x == null) continue; this.kinder.push(this.aufnehmen(x)); } }
  appendChild<T>(k: T): T { this.append(k); return k; }
  prepend(...k: unknown[]): void { const neu = k.filter((x) => x != null).map((x) => this.aufnehmen(x)); this.kinder.unshift(...neu); }
  insertBefore<T>(k: T, ref: Kind | null): T { const kind = this.aufnehmen(k); const i = ref ? this.kinder.indexOf(ref) : -1; if (i < 0) this.kinder.push(kind); else this.kinder.splice(i, 0, kind); return k; }
  replaceChildren(...k: unknown[]): void { for (const alt of this.kinder) alt.parentNode = null; this.kinder = []; this.append(...k); }
  replaceWith(...k: unknown[]): void { const p = this.parentNode; if (!p) return; const i = p.kinder.indexOf(this); const neu = k.map((x) => (x instanceof El || x instanceof TextKnoten ? x : new TextKnoten(String(x)))); for (const n of neu) { n.parentNode?.entfernen(n); n.parentNode = p; } p.kinder.splice(i, 1, ...neu); this.parentNode = null; }
  before(...k: unknown[]): void { const p = this.parentNode; if (!p) return; for (const x of k) p.insertBefore(x, this); }
  after(...k: unknown[]): void { const p = this.parentNode; if (!p) return; const i = p.kinder.indexOf(this); const neu = k.map((x) => (x instanceof El || x instanceof TextKnoten ? x : new TextKnoten(String(x)))); for (const n of neu) { n.parentNode?.entfernen(n); n.parentNode = p; } p.kinder.splice(i + 1, 0, ...neu); }
  removeChild<T>(k: T): T { this.entfernen(k as unknown as Kind); return k; }
  entfernen(k: Kind): void { const i = this.kinder.indexOf(k); if (i >= 0) this.kinder.splice(i, 1); k.parentNode = null; }
  remove(): void { this.parentNode?.entfernen(this); }
  get parentElement(): El | null { return this.parentNode; }
  get children(): El[] { return this.kinder.filter((k): k is El => k instanceof El); }
  get childNodes(): Kind[] { return [...this.kinder]; }
  get firstChild(): Kind | null { return this.kinder[0] ?? null; }
  get lastChild(): Kind | null { return this.kinder.at(-1) ?? null; }
  get firstElementChild(): El | null { return this.children[0] ?? null; }
  get isConnected(): boolean { let p: El | null = this; while (p.parentNode) p = p.parentNode; return p.tag === 'html'; }
  get offsetParent(): El | null { return this.parentNode; }
  contains(k: unknown): boolean { for (let p = k as El | TextKnoten | null; p; p = p.parentNode) if (p === this) return true; return false; }
  get textContent(): string { return this.kinder.map((k) => k.textContent).join(''); }
  set textContent(v: string) { this.replaceChildren(...(v === '' ? [] : [new TextKnoten(String(v))])); }
  get innerText(): string { return this.textContent; }
  set innerText(v: string) { this.textContent = v; }
  get nachfahren(): El[] { return this.children.flatMap((c) => [c, ...c.nachfahren]); }
  querySelectorAll(sel: string): El[] { return this.nachfahren.filter((e) => passt(e, sel)); }
  querySelector(sel: string): El | null { return this.querySelectorAll(sel)[0] ?? null; }
  matches(sel: string): boolean { return passt(this, sel); }
  closest(sel: string): El | null { for (let p: El | null = this; p; p = p.parentNode) if (passt(p, sel)) return p; return null; }
  getElementsByTagName(t: string): El[] { return this.querySelectorAll(t); }
  getBoundingClientRect(): Rechteck { return { ...this.rechteck }; }
  get clientWidth(): number { return this.rechteck.width; }
  get clientHeight(): number { return this.rechteck.height; }
  get scrollWidth(): number { return this.rechteck.width; }
  get offsetWidth(): number { return this.rechteck.width; }
  get offsetHeight(): number { return this.rechteck.height; }
  setPointerCapture(): void {}
  releasePointerCapture(): void {}
  scrollIntoView(): void {}
  animate(): { finished: Promise<void>; cancel(): void; onfinish: null } { return { finished: Promise.resolve(), cancel() {}, onfinish: null }; }
  cloneNode(tief = false): El {
    const k = new El(this.tag); k.className = this.className; k.attrs = { ...this.attrs };
    if (tief) for (const c of this.kinder) k.append(c instanceof El ? c.cloneNode(true) : new TextKnoten(c.text));
    return k;
  }
  get innerHTML(): string { return this.kinder.map((k) => (k instanceof El ? `<${k.tag} class="${k.className}" ${Object.entries(k.attrs).map(([a, b]) => `${a}="${b}"`).join(' ')}>${k.innerHTML}</${k.tag}>` : k.text)).join(''); }
  // getContext für Canvas (Bildschirmfoto der Kartenbilder brauchen die Tests nicht)
  getContext(): null { return null; }
}

const aktiv: { el: El | null } = { el: null };

/** Dokument mit html > body > #app; Steuerung hängt #hud und #ebene in #app. */
export function domAttrappe() {
  const html = new El('html'), body = new El('body'), app = new El('div');
  app.attrs.id = 'app';
  html.append(body); body.append(app);
  const ereignisse: Record<string, Empfaenger[]> = {};
  const doc = {
    documentElement: html, body,
    get activeElement() { return aktiv.el ?? body; },
    createElement: (t: string) => new El(t),
    createElementNS: (_ns: string, t: string) => new El(t),
    createTextNode: (t: string) => new TextKnoten(t),
    createDocumentFragment: () => new El('#fragment'),
    importNode: (n: unknown) => n,
    getElementById: (id: string) => (html.attrs.id === id ? html : html.querySelector(`#${id}`)),
    querySelector: (s: string) => html.querySelector(s),
    querySelectorAll: (s: string) => html.querySelectorAll(s),
    addEventListener: (n: string, f: Empfaenger) => { (ereignisse[n] ??= []).push(f); },
    removeEventListener: (n: string, f: Empfaenger) => { ereignisse[n] = (ereignisse[n] ?? []).filter((x) => x !== f); },
    visibilityState: 'visible', hidden: false,
    fonts: { ready: Promise.resolve() },
  };
  /** Taste am Dokument (z. B. Escape, Tab) an alle Empfänger. */
  const taste = (key: string): void => { const e = { key, target: aktiv.el ?? body, defaultPrevented: false, preventDefault() { e.defaultPrevented = true; }, stopPropagation() {} }; for (const f of [...(ereignisse.keydown ?? [])]) f(e); };
  // Symbole: Die SVG-Quelle wird am Element vermerkt (Attribut `quelle`), damit Tests ein bestimmtes Symbol erkennen.
  class Parser { parseFromString(q: string) { const svg = new El('svg'); svg.attrs.quelle = q; return { documentElement: svg }; } }
  aktiv.el = null;
  return { doc, Parser, html, body, app, taste };
}

export type DomAttrappe = ReturnType<typeof domAttrappe>;

/** Sichtbar heißt hier: im Dokument und weder das Element noch ein Vorfahr trägt `hidden`, `aria-hidden="true"` oder die Klasse „versteckt“. */
export function sichtbar(e: El): boolean {
  if (!e.isConnected) return false;
  for (let p: El | null = e; p; p = p.parentNode) if (p.hidden || p.attrs['aria-hidden'] === 'true' || p.klassen().includes('versteckt')) return false;
  return true;
}

/** Sichtbarer Text eines Teilbaums (ohne versteckte Teile, s. `sichtbar`). */
export function sichtbarerText(e: El): string {
  if (e.hidden || e.attrs['aria-hidden'] === 'true' || e.klassen().includes('versteckt')) return '';
  return e.kinder.map((k) => (k instanceof El ? sichtbarerText(k) : k.text)).join('');
}
