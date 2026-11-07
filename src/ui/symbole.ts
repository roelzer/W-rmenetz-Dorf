/** Eigene SVG-Symbole im Stil der Karte (keine Emoji-Schrift, M7). 24×24, Umriss tinte-tief. */
const U = 'stroke="#1a1208" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';
// xmlns ist nötig: bausteine.ts parst die Symbole per DOMParser als SVG, ohne Namensraum würde nichts gezeichnet
const SVG = (inhalt: string): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" focusable="false">${inhalt}</svg>`;

export const SYMBOLE = {
  geld: SVG(`<circle cx="12" cy="12" r="9" fill="#f6c22c" ${U}/><circle cx="12" cy="12" r="6" fill="none" stroke="#c88a08" stroke-width="1.4"/><path d="M14.6 9.2c-.6-.8-1.5-1.2-2.6-1.2-1.9 0-3 1.5-3 4s1.1 4 3 4c1.1 0 2-.4 2.6-1.2M7.8 11h4.6M7.8 13h4.6" fill="none" stroke="#7a5200" stroke-width="1.5" stroke-linecap="round"/>`),
  waerme: SVG(`<path d="M12 2.5c1 3.2 5.5 5.6 5.5 10.2A5.5 5.5 0 0 1 12 18.5a5.5 5.5 0 0 1-5.500-5.800c0-2.100 1-3.300 2.100-4.500.2 1.400.8 2.200 1.500 2.600C10 8.200 10.600 5 12 2.500z" fill="#e2582b" ${U}/><path d="M12 11.500c.6 1.500 2.200 2.300 2.200 4a2.200 2.200 0 0 1-4.400 0c0-1.700 1.600-2.500 2.200-4z" fill="#ffd45c"/>`),
  ruf: SVG(`<path d="M12 21s-8-5-8-11a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 10c0 6-8 11-8 11z" fill="#ff7a8a" ${U}/><path d="M7.500 8.500c.4-1 1.300-1.500 2.200-1.400" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".8"/>`),
  taler: SVG(`<path d="M12 2.500l8 6-3 12.500H7L4 8.500z" fill="#a67cff" ${U}/><path d="M12 2.500v18.500M4 8.500h16M8.500 8.500L12 21l3.500-12.500" fill="none" stroke="#fff" stroke-width="1.100" opacity=".65"/>`),
  monteur: SVG(`<path d="M4 15a8 8 0 0 1 16 0z" fill="#f6c22c" ${U}/><rect x="3" y="15" width="18" height="3.500" rx="1.500" fill="#e2a312" ${U}/><rect x="10.500" y="5" width="3" height="5" fill="#fff3a8" opacity=".9"/>`),
  bauen: SVG(`<path d="M3 20h18" ${U} fill="none"/><path d="M5 20V10l7-6 7 6v10z" fill="#fff6e2" ${U}/><path d="M9 20v-6h6v6" fill="#c98f52" ${U}/><path d="M12 8v3M10.500 9.500h3" stroke="#e2582b" stroke-width="1.800" stroke-linecap="round"/>`),
  karte: SVG(`<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="#fff6e2" ${U}/><path d="M9 4v14M15 6v14" stroke="#1a1208" stroke-width="1.300" fill="none"/><circle cx="12" cy="11" r="2" fill="#e2582b"/>`),
  haus: SVG(`<path d="M3 11l9-7 9 7v9H3z" fill="#fff6e2" ${U}/><path d="M9.500 20v-6h5v6" fill="#c98f52" ${U}/>`),
  schliessen: SVG(`<path d="M6 6l12 12M18 6L6 18" stroke="#1a1208" stroke-width="5" stroke-linecap="round"/><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="2.800" stroke-linecap="round"/>`),
  stern: SVG(`<path d="M12 2.500l2.800 6 6.500.7-4.900 4.400 1.400 6.400L12 16.600l-5.800 3.400 1.400-6.400L2.700 9.200l6.500-.7z" fill="#f6c22c" ${U}/>`),
  ausruf: SVG(`<circle cx="12" cy="12" r="10" fill="#e2582b" ${U}/><path d="M12 6.500v7" stroke="#fff" stroke-width="2.800" stroke-linecap="round"/><circle cx="12" cy="17.300" r="1.700" fill="#fff"/>`),
  zahnrad: SVG(`<path d="M12 8.500a3.500 3.500 0 1 0 0 7 3.500 3.500 0 0 0 0-7zM10.500 2.500h3l.5 2.300 1.700.7 2-1.300 2.100 2.100-1.300 2 .7 1.700 2.300.5v3l-2.300.5-.7 1.700 1.300 2-2.100 2.100-2-1.300-1.700.7-.5 2.300h-3l-.5-2.300-1.700-.7-2 1.300-2.100-2.100 1.300-2-.7-1.700-2.300-.5v-3l2.300-.5.700-1.700-1.300-2 2.100-2.100 2 1.300 1.700-.7z" fill="#fff6e2" ${U}/>`),
  // Plus/Minus für Stufenknöpfe: ein kräftiges dunkles Zeichen (Designer-Treueprüfung A84 Nr. 4: hell gefüllt wirkte es hohl)
  plus: SVG(`<path d="M12 5v14M5 12h14" stroke="#1a1208" stroke-width="3.5" stroke-linecap="round"/>`),
  minus: SVG(`<path d="M5 12h14" stroke="#1a1208" stroke-width="3.5" stroke-linecap="round"/>`),
  schloss: SVG(`<path d="M8 10V7.500a4 4 0 0 1 8 0V10" fill="none" stroke="#1a1208" stroke-width="2.200" stroke-linecap="round"/><rect x="5" y="10" width="14" height="10" rx="2.500" fill="#f6c22c" ${U}/><circle cx="12" cy="14.300" r="1.500" fill="#7a5200"/><path d="M12 15.500v2" stroke="#7a5200" stroke-width="1.600" stroke-linecap="round"/>`),
  // DESIGN.md 12.16 Reiter (Vorlage design/reiter-symbole.svg) und 12.18 Zeichenleiste – gleicher Linienstil
  sonne: SVG(`<circle cx="12" cy="12" r="4.5" fill="#f6c22c" ${U}/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" ${U} fill="none"/>`),
  rohr: SVG(`<rect x="2.5" y="6" width="19" height="5" rx="1.5" fill="#e2582b" ${U}/><rect x="2.5" y="13" width="19" height="5" rx="1.5" fill="#3d7fd6" ${U}/>`),
  baum: SVG(`<path d="M12 3a6 6 0 0 1 6 6 5 5 0 0 1-2 8.5H8A5 5 0 0 1 6 9a6 6 0 0 1 6-6z" fill="#5fae4a" ${U}/><path d="M12 13v8" stroke="#1a1208" stroke-width="2.4" stroke-linecap="round"/>`),
  frage: SVG(`<circle cx="12" cy="12" r="9.5" fill="#fff6e2" ${U}/><path d="M9.2 9.3a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1v.6" fill="none" stroke="#1a1208" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.3" fill="#1a1208"/>`),
  zurueck: SVG(`<path d="M9 5L4 10l5 5" fill="none" stroke="#1a1208" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 10H14a5.5 5.5 0 0 1 0 11h-3" fill="none" stroke="#1a1208" stroke-width="2.4" stroke-linecap="round"/>`),
  // DESIGN.md 13.2 Zeigefinger: Fläche tafel, 2 px kontur bei 40 px (= 1,2 im 24er-Raster). Schräg gedreht, damit die
  // Fingerspitze oben links (bei 2|2) sitzt – dort setzt spotlight.ts sie auf die Mitte des Ziels.
  // DESIGN.md 13.17.1 B4: Zielscheibe (Ring + Punkt) in kontur auf der Scheibe #ffe08a (menue.farbe.ziel), 2 px kontur
  zielscheibe: SVG(`<circle cx="12" cy="12" r="10" fill="#ffe08a" stroke="#3b1d0a" stroke-width="1.6"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#3b1d0a" stroke-width="1.6"/><circle cx="12" cy="12" r="2" fill="#3b1d0a"/>`),
  finger: SVG(`<g transform="rotate(-45 12 12)" fill="#fff4df" stroke="#3b1d0a" stroke-width="1.2" stroke-linejoin="round"><rect x="7" y="9" width="11" height="12" rx="3"/><rect x="10" y="-2" width="4" height="13" rx="2"/><path d="M7 13H5.5a1.5 1.5 0 0 0 0 3H7"/></g>`),
} as const;

export type SymbolName = keyof typeof SYMBOLE;
