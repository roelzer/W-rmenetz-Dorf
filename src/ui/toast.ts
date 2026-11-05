import { T } from './tokens';
import { h } from './dom';

let wurzel: HTMLElement | null = null;
let timer = 0;
/** Offenes Blatt, neben dem die Meldung stehen muss (blatt.ts meldet es beim Öffnen und Schließen) */
let nebenBlatt: { wurzel: HTMLElement; popup: boolean } | null = null;

/** DESIGN.md 12.17 Lage: unten mittig in der freien Kartenfläche; mit Seitenblatt oder Zeichenleiste in der Fläche links
 *  davon (Breite aus dem Blatt-Rechteck, nicht nachgerechnet), bei einem Popup oben. Liegt unten schon etwas (Sprecher,
 *  Besuchs-Banner, Update-Hinweis), rückt sie darüber. */
function lageAnwenden(): void {
  if (!wurzel) return;
  const m = T.menue.mass_px, breite = window.innerWidth, hoehe = window.innerHeight;
  const st = wurzel.style;
  if (nebenBlatt?.popup) {
    st.setProperty('top', `${m.toast_stapel_luecke}px`); st.setProperty('bottom', 'auto');
    st.setProperty('width', '100%'); st.setProperty('--toast-max', `${Math.min(m.toast_max_breite, breite - 2 * m.toast_rand)}px`);
    return;
  }
  // Breite statt linker Kante: Beim Einschieben (tafel-ein) ist das Blatt kurz verschoben, die Breite stimmt schon.
  // Ein Blatt über die ganze Breite (Hochformat) lässt links nichts frei – dann gilt die Lage ohne Blatt.
  const blatt_px = nebenBlatt ? nebenBlatt.wurzel.getBoundingClientRect().width : 0;
  const seitlich = blatt_px > 0 && blatt_px < breite;
  const frei_px = seitlich ? breite - blatt_px : breite;
  // ohne Blatt bleiben Bauen-Knopf und Zoom frei (176 px), neben dem Blatt 12 px Abstand je Seite
  const max_px = Math.min(m.toast_max_breite, seitlich ? frei_px - 2 * m.toast_rand : breite - 176);
  let oben_px = hoehe - m.toast_rand;
  for (const e of document.querySelectorAll<HTMLElement>('#sprecher, .banner, .update-hinweis')) {
    const r = e.getBoundingClientRect();
    if (r.height > 0 && r.left < frei_px) oben_px = Math.min(oben_px, r.top - m.toast_stapel_luecke);
  }
  st.setProperty('top', 'auto'); st.setProperty('bottom', `${hoehe - oben_px}px`);
  st.setProperty('width', `${frei_px}px`); st.setProperty('--toast-max', `${max_px}px`);
}

/** blatt.ts: ein Blatt hat sich geöffnet (`null` = geschlossen) – eine stehende Meldung gleitet in die neue Lage (12.17). */
export function meldungNebenBlatt(blatt: HTMLElement | null, popup = false): void {
  nebenBlatt = blatt ? { wurzel: blatt, popup } : null;
  lageAnwenden();
}

/** DESIGN.md 12.17: sichtbar = Grundzeit + Zeit je Zeichen (Lesetempo rund 15 Zeichen je Sekunde), begrenzt nach unten und oben. */
export const toastDauer_ms = (text: string): number => {
  const z = T.menue.zeit_ms;
  return Math.min(z.toast_max, Math.max(z.toast_min, z.toast_grund + z.toast_je_zeichen * text.length));
};

/** Kurze Rückmeldung (DESIGN.md 12.17). Höchstens eine: Eine neue ersetzt die alte; derselbe Text startet nur die Zeit neu. */
export function toast(text: string): void {
  if (!wurzel) {
    wurzel = h('div', { id: 'toast', 'aria-live': 'polite', role: 'status' });
    document.getElementById('app')!.append(wurzel);
  }
  lageAnwenden();
  const alt = wurzel.firstElementChild as HTMLElement | null;
  const t = alt && alt.textContent === text ? alt : h('div', { class: 'toast' }, text);
  if (t !== alt) {
    wurzel.replaceChildren(t);
    requestAnimationFrame(() => t.classList.add('sichtbar'));
  } else { t.classList.remove('weg'); t.classList.add('sichtbar'); }
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    // Ausblenden nur als Blende, ohne Versatz (12.17)
    t.classList.add('weg');
    timer = window.setTimeout(() => t.remove(), T.menue.zeit_ms.toast_blende);
  }, toastDauer_ms(text));
}

/** A83: Bleibender Hinweis mit Knopf (z. B. „Neue Version da – Neu laden“). */
export function hinweisMitKnopf(text: string, knopfText: string, aktion: () => void): void {
  const leiste = h('div', { class: 'update-hinweis', role: 'status', 'aria-live': 'polite' }, h('span', {}, text));
  const k = h('button', { class: 'knopf los klein', type: 'button' }, knopfText);
  k.addEventListener('click', aktion);
  leiste.append(k);
  document.querySelector('.update-hinweis')?.remove();
  document.getElementById('app')!.append(leiste);
}
