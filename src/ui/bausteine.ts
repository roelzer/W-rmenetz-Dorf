import { h } from './dom';
import { SYMBOLE, type SymbolName } from './symbole';
import { toast } from './toast';

/** Symbol als SVG-Element. Per DOMParser als SVG geparst: keine Zeichenfolge gelangt je als HTML ins Dokument. */
export function symbol(name: SymbolName, klasse = 'sym'): HTMLSpanElement {
  const doc = new DOMParser().parseFromString(SYMBOLE[name], 'image/svg+xml');
  return h('span', { class: klasse, 'aria-hidden': 'true' }, document.importNode(doc.documentElement, true));
}

/** „Weniger Bewegung“ aus der Einstellung (Klasse am body, steuerung.ts) oder vom System – dann wackelt nichts. */
const ruhig = (): boolean => document.body.classList.contains('weniger-bewegung') || matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Meldung beim Antippen eines gesperrten Knopfs (DESIGN.md 12.19/12.20). Als Funktion wird sie erst beim Tippen erzeugt,
 *  damit Fehlbetrag und Restzeit stimmen, auch wenn das Blatt länger offen war. Liefert die Funktion `null`, gilt die Sperre
 *  beim Tippen nicht mehr (z. B. das Geld kam inzwischen) – dann läuft die normale Aktion (ENTSCHEIDUNGEN 2026-11-05, Antwort 7). */
export type Hinweis = string | (() => string | null);

/** Warum ein Knopf gesperrt ist (DESIGN.md 12.20): `grund` = Zeile 2; `null` heißt, Zeile 2 bleibt wie im freien Zustand
 *  (Preis samt Münze bzw. Taler, Regel 5). `schloss` nur, wenn erst Fortschritt die Sperre löst (Regel 2). */
export interface Sperre { grund: string | null; schloss: boolean; hinweis: Hinweis }

/** Hinweise gesperrter Knöpfe; `sperren` kann ihn nachträglich setzen (D1: „Gefällt mir“ ist nach dem Tippen gesperrt). */
const hinweise = new WeakMap<HTMLButtonElement, Hinweis>();

/** Sperre, die beim Antippen neu gelesen wird (DESIGN.md 12.21 Punkt 3): alle Gründe des Knopfs in der Rangfolge von 12.20 Regel 4. */
export type SperreJetzt = () => Sperre | null;

/** Kennung (`id`) des Knopfs, der nach dem Neuaufbau des Blatts weiterwackeln soll – nur während `neuAufbau` gesetzt. */
let wackelnNachAufbau: string | null = null;

const zeile2 = (s: Sperre | null): string => (s ? `${s.grund ?? ''}|${s.schloss}` : '');
const hinweisText = (hw: Hinweis | undefined): string | null | undefined => (typeof hw === 'function' ? hw() : hw);

/** DESIGN.md 12.19: Ein gesperrter Knopf trägt `aria-disabled="true"` statt `disabled`, damit Tippen, Enter und Leertaste
 *  ankommen und Tastatur-Nutzer ihn per Tab erreichen. Ein Klick führt dann nie die Aktion aus: Der Knopf wackelt kurz
 *  (stil.css, nicht bei „Weniger Bewegung“ – sonst käme nie ein animationend und die Klasse bliebe hängen) und zeigt den
 *  Hinweis, falls es einen gibt. Der Zustand wird beim Klick gelesen, damit auch `sperren` nachträglich wirkt.
 *  Mit `jetzt` (12.21 Punkt 3) werden beim Tippen alle Gründe neu gelesen: Gilt keiner mehr, läuft die Aktion; gilt ein
 *  anderer als der angezeigte, baut `neuAufbau` das Blatt neu, damit Zeile 2 denselben Grund nennt wie die Meldung. */
function sperrbar(k: HTMLButtonElement, bei: () => void, aus: boolean, hinweis: Hinweis | undefined, jetzt?: { sperre: SperreJetzt; gebaut: Sperre | null; neuAufbau?: () => void; id?: string }): HTMLButtonElement {
  if (hinweis !== undefined) hinweise.set(k, hinweis);
  if (aus) sperren(k);
  k.addEventListener('click', () => {
    if (jetzt) {
      const s = jetzt.sperre();
      const text = s ? hinweisText(s.hinweis) : null;
      if (!s || text === null) { bei(); return; }
      if (jetzt.neuAufbau && zeile2(s) !== zeile2(jetzt.gebaut)) {
        wackelnNachAufbau = jetzt.id ?? null;
        try { jetzt.neuAufbau(); } finally { wackelnNachAufbau = null; }
      } else if (!ruhig()) k.classList.add('wackelt');
      if (text) toast(text);
      return;
    }
    if (!k.hasAttribute('aria-disabled')) { bei(); return; }
    const text = hinweisText(hinweise.get(k));
    if (text === null) { bei(); return; }
    if (!ruhig()) k.classList.add('wackelt');
    if (text) toast(text);
  });
  k.addEventListener('animationend', () => k.classList.remove('wackelt'));
  return k;
}

/** Sperrt einen schon gebauten Knopf (DESIGN.md 12.19), z. B. „Gefällt mir“ direkt nach dem Mögen; `hinweis` kommt beim Antippen. */
export function sperren(k: HTMLButtonElement, hinweis?: Hinweis): void {
  k.setAttribute('aria-disabled', 'true');
  if (hinweis !== undefined) hinweise.set(k, hinweis);
}

/** Knopfarten nach DESIGN.md 12.5: kostenlos = los, kostet € = geld, kostet Taler = taler, nicht umkehrbar = gefahr, Auswahl an = gewaehlt.
 *  `hinweis`: Meldung beim Antippen des gesperrten Knopfs (Grund + was man tun kann, DESIGN.md 12.19).
 *  `sperre`: gesperrt mit Grund, Schloss und Hinweis aus einer Hand (DESIGN.md 12.20); ersetzt `aus`, `schloss` und `hinweis`. */
type Variante = '' | 'los' | 'geld' | 'taler' | 'gefahr' | 'blau' | 'gewaehlt';
export function knopf(text: string | Node, bei: () => void, variante: Variante = '', zusatz: { klein?: boolean; aus?: boolean; unter?: string; id?: string; schloss?: boolean; hinweis?: Hinweis; sperre?: Sperre | null | SperreJetzt; neuAufbau?: () => void } = {}): HTMLButtonElement {
  const jetzt = typeof zusatz.sperre === 'function' ? zusatz.sperre : null;
  const s: Sperre | null = jetzt ? jetzt() : (zusatz.sperre as Sperre | null | undefined) ?? null;
  const aus = !!zusatz.aus || s !== null, schloss = s ? s.schloss : zusatz.schloss, unter = s?.grund ?? zusatz.unter;
  const k = sperrbar(h('button', { type: 'button', class: `knopf ${variante} ${zusatz.klein ? 'klein' : ''}`.trim(), 'data-id': zusatz.id }, text), bei, aus, s ? s.hinweis : zusatz.hinweis,
    jetzt ? { sperre: jetzt, gebaut: s, neuAufbau: zusatz.neuAufbau, id: zusatz.id } : undefined);
  // Neuaufbau nach dem Antippen (12.21 Punkt 3): Der neue, sichtbare Knopf wackelt weiter, nicht der verschwundene alte.
  if (aus && zusatz.id !== undefined && zusatz.id === wackelnNachAufbau && !ruhig()) k.classList.add('wackelt');
  // Preiszeile mit Münze bzw. Taler davor: Der Preis ist so auch ohne Farbe als Preis erkennbar. Gesperrt steht dort ein Grund,
  // kein Preis – außer es fehlt nur Geld (12.20 Regel 5): Dann bleibt der Preis samt Münze stehen, der Spieler sieht, was er braucht.
  // `schloss`: gesperrter Knopf mit Schloss vor dem Grund (DESIGN.md 12.19)
  const preis = (variante === 'geld' || variante === 'taler') && (!aus || (s !== null && s.grund === null));
  if (unter) k.append(h('small', {}, preis ? symbol(variante as 'geld' | 'taler', 'sym preis-sym') : aus && schloss ? symbol('schloss', 'sym schloss-klein') : null, unter));
  return k;
}

/** Stufenknopf (48×48) mit gezeichnetem Plus/Minus; der Text für Vorlesen steht in `label`. Ohne Zeile 2 erklärt nur der
 *  `hinweis` beim Antippen, warum er gesperrt ist (DESIGN.md 12.20 R1–R4). */
export function stepper(art: 'plus' | 'minus', label: string, bei: () => void, aus = false, hinweis?: Hinweis): HTMLButtonElement {
  return sperrbar(h('button', { type: 'button', class: 'knopf stepper', 'aria-label': label }, symbol(art)), bei, aus, hinweis);
}

/** Gesperrte Hinweiszeile (DESIGN.md 12.15): gedämpft, Schloss davor – überall gleich, damit Sperren auf einen Blick erkennbar sind. */
export const sperrHinweis = (text: string): HTMLParagraphElement => h('p', { class: 'gedaempft sperrhinweis' }, symbol('schloss'), text);

/** Gesperrter Listeneintrag (DESIGN.md 12.15): neutraler Chip mit Schloss, kein Knopf – es gibt nichts zu tippen. */
export const sperrChip = (text: string): HTMLSpanElement => h('span', { class: 'chip sperr' }, symbol('schloss'), text);

export const chip = (text: string, farbe: '' | 'rot' | 'gruen' | 'blau' = ''): HTMLSpanElement => h('span', { class: `chip ${farbe}`.trim() }, text);

export function kasten(titel: string | null, ...inhalt: Array<Node | string>): HTMLDivElement {
  return h('div', { class: 'kasten' }, titel ? h('h3', {}, titel) : null, ...inhalt);
}

export function balken(anteil: number): HTMLDivElement {
  const i = h('i'); i.style.width = `${Math.max(0, Math.min(1, anteil)) * 100}%`;
  return h('div', { class: 'balken', role: 'progressbar', 'aria-valuenow': Math.round(anteil * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, i);
}

export const zeile = (links: string | Node, rechts?: string | Node | null): HTMLDivElement => h('div', { class: 'zeile' }, h('span', {}, links), rechts ? h('span', {}, rechts) : null);
