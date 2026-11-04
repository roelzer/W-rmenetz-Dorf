import { BAU_KATEGORIEN, KATALOG, type Kategorie, type TypId } from '../core/katalog';
import { chip, knopf } from './bausteine';
import { blattOeffnen, type Blatt } from './blatt';
import { katalogBild } from './bild';
import { eur, h, zahl } from './dom';
import type { Ui } from './schnittstelle';

function werte(t: TypId): string {
  const D = KATALOG[t];
  const teile: string[] = [];
  if (D.leistung_kw) teile.push(`${D.leistung_kw[0]} kW`);
  if (D.strom_kw) teile.push(`${D.strom_kw[0]} kW Strom`);
  if (D.kapazitaet_kw) teile.push(`bis ${D.kapazitaet_kw} kW`);
  if (D.bedarf_kw) teile.push(`braucht ${D.bedarf_kw} kW`);
  if (D.einnahmen_eur_min && D.kategorie === 'haus') teile.push(`${D.einnahmen_eur_min[0]} €/min`);
  if (D.groesse && D.groesse > 1) teile.push(`${D.groesse}×${D.groesse} Felder`);
  return teile.join(' · ');
}

/** Bau-Katalog (S4): Blatt von unten mit Reitern. Jede Karte ist ein Knopf und erklärt, warum etwas nicht geht. */
export class Katalog {
  private blatt: Blatt | null = null;
  private kategorie: Kategorie = 'haus';

  constructor(private readonly ui: Ui) {}

  oeffnen(kategorie?: string): void {
    if (kategorie && BAU_KATEGORIEN.some(([k]) => k === kategorie)) this.kategorie = kategorie as Kategorie;
    this.blatt = blattOeffnen({ titel: 'Bauen', art: 'hoch', beiZu: () => { this.blatt = null; } });
    this.aufbauen();
  }
  schliessen(): void { this.blatt?.zu(); }

  private aufbauen(): void {
    if (!this.blatt) return;
    const { spiel: sp } = this.ui, s = sp.stand;
    const reiter = h('div', { class: 'reiter', role: 'tablist' }, ...BAU_KATEGORIEN.map(([k, name]) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': k === this.kategorie, class: `knopf klein ${k === this.kategorie ? 'gewaehlt' : ''}`, onclick: () => { this.kategorie = k; this.aufbauen(); } }, name)));
    const raster = h('div', { class: 'raster' });
    const typen = (Object.keys(KATALOG) as TypId[]).filter((t) => KATALOG[t].kategorie === this.kategorie && t !== 'hz');
    for (const t of typen) raster.append(this.karte(t));
    if (!typen.length) raster.append(h('p', {}, 'In dieser Kategorie gibt es noch nichts zu bauen.'));
    this.blatt.inhalt.replaceChildren(reiter, h('div', { style: 'height:8px' }), raster);
    void s;
  }

  private karte(t: TypId): HTMLElement {
    const { spiel: sp } = this.ui, s = sp.stand, D = KATALOG[t];
    const innen = D.kategorie === 'innen';
    const anzahl = sp.anzahl(t), grenze = innen ? 99 : (t === 'p1' || t === 'p2' || t === 'p3') ? sp.grenze(t) : sp.grenze(t);
    const gesamtLeitungen = (t === 'p1' || t === 'p2' || t === 'p3') ? sp.leitungsanzahl() : anzahl;
    const gesperrt = !innen && grenze === 0;
    const voll = !innen && !gesperrt && gesamtLeitungen >= grenze;
    const c = sp.kosten(t, 1);
    const kostetText = c.taler != null ? `${c.taler} Taler` : eur(c.eur ?? 0);
    const zuTeuer = c.taler != null ? s.taler < c.taler : s.geld_eur < (c.eur ?? 0);
    const antrag = s.antraege[t];
    const kind = h('button', { type: 'button', class: `bkarte ${gesperrt || voll ? 'gesperrt' : ''}`, 'aria-label': `${D.name}, ${kostetText}`, onclick: () => this.waehlen(t, gesperrt) },
      katalogBild(t),
      h('span', { class: 'titel' }, D.name),
      h('span', { class: 'werte' }, werte(t)),
      gesperrt ? h('span', { class: 'grund' }, `ab Heizzentrale Stufe ${(D.grenze as number[]).findIndex((g) => g > 0) + 1}`)
        : voll ? h('span', { class: 'grund' }, `${gesamtLeitungen}/${grenze} · mehr ab nächster Stufe`)
          : h('span', { class: `preis ${zuTeuer ? 'zuteuer' : ''}` }, kostetText, !innen && D.kategorie !== 'netz' ? h('span', { class: 'gedaempft' }, ` · ${gesamtLeitungen}/${grenze}`) : null),
      antrag?.stand === 'bewilligt' ? h('span', { class: 'abzeichen' }, chip('−40 % Förderung', 'gruen')) : antrag ? h('span', { class: 'abzeichen' }, chip('Antrag in Prüfung', 'blau')) : null);
    return kind;
  }

  private waehlen(t: TypId, gesperrt: boolean): void {
    const { spiel: sp } = this.ui, D = KATALOG[t], s = sp.stand;
    if (gesperrt) { this.ui.toast(`${D.name} gibt es erst mit einer größeren Heizzentrale`); return; }
    const c = sp.kosten(t, 1);
    if (c.eur != null && s.geld_eur < c.eur) { this.ui.toast(`Es fehlen ${zahl(c.eur - s.geld_eur)} €. Sammle Münzen ein oder warte auf Einnahmen.`); return; }
    if (c.taler != null && s.taler < c.taler) { this.ui.toast(`Es fehlen ${c.taler - s.taler} Dorftaler.`); return; }
    if (D.kategorie === 'innen') {
      const r = sp.innenEinbauen(t);
      this.ui.geaendert();
      if (r.ok) this.schliessen();
      return;
    }
    if (!D.sofort && sp.beschaeftigt() >= sp.monteure()) { this.ui.toast('Alle Monteure sind beschäftigt – warte oder baue eine Monteurhütte'); return; }
    if (t === 'p1' || t === 'p2' || t === 'p3') { this.ui.stempeln(t); return; }
    this.ui.platzieren(t);
  }
}
