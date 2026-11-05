import type { Auftrag } from '../core/auftraege';
import type { Spiel } from '../core/spiel';
import { h, zahl } from './dom';
import { symbol } from './bausteine';
import type { SymbolName } from './symbole';

export interface HudAktionen {
  bauen(): void;
  besuchen(): void;
  einstellungen(): void;
  auftrag(): void;
  kwUmschalten(): boolean;
  kwAn(): boolean;
}

interface Pille { wurzel: HTMLElement; wert: HTMLElement; fuell: HTMLElement; }

function pille(art: string, sym: SymbolName, etikett: string): Pille {
  const wert = h('span', { class: 'wert umriss' });
  const fuell = h('i');
  const wurzel = h('div', { class: `pille ${art}`, role: 'group', 'data-res': art },
    symbol(sym), h('span', { class: 'etikett' }, etikett), wert, h('span', { class: 'fuell' }, fuell));
  return { wurzel, wert, fuell };
}

/** Obere Anzeigen, Rundbuttons und Zoom. Liest nur vom Spiel, ändert nichts. */
export class Hud {
  readonly wurzel = h('div', { id: 'hud' });
  private geld = pille('geld', 'geld', 'Geld');
  private waerme = pille('waerme', 'waerme', 'Wärme');
  private ruf = pille('ruf', 'ruf', 'Ruf');
  private taler = pille('taler', 'taler', 'Taler');
  private monteure = pille('monteure', 'monteur', 'Monteure');
  private name = h('span', { class: 'name umriss' });
  private unter = h('span', { class: 'unter' });
  private auftragText = h('span', { class: 'text' });
  private auftragLohn = h('span', { class: 'lohn' });
  private auftragKarte: HTMLButtonElement;
  private runde: HTMLElement;
  private zoom: HTMLElement;
  private kwKnopf!: HTMLButtonElement;
  /** Zustand des kW-Schalters im Knopf spiegeln */
  kwZeigen(an: boolean): void { this.kwKnopf.setAttribute('aria-pressed', String(an)); this.kwKnopf.classList.toggle('aus', !an); }
  private links: HTMLElement;
  private pillen: HTMLElement;

  constructor(private readonly spiel: () => Spiel, a: HudAktionen) {
    const schild = h('button', { type: 'button', class: 'dorfschild', 'aria-label': 'Dorf-Einstellungen', onclick: a.einstellungen }, this.name, this.unter, symbol('zahnrad', 'zahnrad'));
    this.auftragKarte = h('button', { type: 'button', class: 'auftrag pergament', onclick: a.auftrag },
      h('span', { class: 'marker', 'aria-hidden': 'true' }, '!'), this.auftragText, this.auftragLohn);
    this.links = h('div', { class: 'hud-links' }, schild, this.auftragKarte);
    this.pillen = h('div', { class: 'pillen' }, this.geld.wurzel, this.waerme.wurzel, this.ruf.wurzel, this.taler.wurzel, this.monteure.wurzel);
    const rund = (art: string, sym: SymbolName, text: string, bei: () => void): HTMLButtonElement =>
      h('button', { type: 'button', class: `rund ${art}`, onclick: bei, 'aria-label': text }, h('span', { class: 'kreis' }, symbol(sym)), h('span', { class: 'etikett umriss' }, text));
    this.runde = h('div', { class: 'runde' }, rund('besuch', 'karte', 'Dörfer', a.besuchen), rund('bauen', 'bauen', 'Bauen', a.bauen));
    this.kwKnopf = h('button', { type: 'button', class: 'zoomknopf kwknopf', 'aria-label': 'Verbrauch der Häuser anzeigen', 'aria-pressed': String(a.kwAn()), onclick: () => this.kwZeigen(a.kwUmschalten()) }, 'kW');
    this.kwZeigen(a.kwAn());
    // A77 (Simon): keine Knöpfe für Zoomen und Drehen – das geht mit zwei Fingern (am Rechner Mausrad, mittlere Maustaste, Q/E); nur der kW-Schalter bleibt.
    this.zoom = h('div', { class: 'zoom' }, this.kwKnopf);
    this.wurzel.append(this.links, this.pillen, this.zoom, this.runde);
  }

  /** Ein- und Ausblenden für Startwahl und Besuch (S1, S7). */
  sichtbar(teile: { alles?: boolean; eigene?: boolean }): void {
    this.wurzel.classList.toggle('versteckt', teile.alles === false);
    for (const e of [this.links, this.pillen, this.zoom, this.runde]) e.classList.toggle('versteckt', teile.eigene === false);
  }

  geldPillePunkt(): [number, number] {
    const r = this.geld.wurzel.querySelector('.sym')!.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }

  aktualisieren(auftrag: Auftrag | null): void {
    const sp = this.spiel(), s = sp.stand, n = sp.netz;
    this.name.textContent = s.name;
    this.unter.textContent = `Stufe ${sp.hzStufe} · Wert ${zahl(sp.dorfwert())}`;
    if (auftrag) {
      this.auftragKarte.classList.remove('versteckt');
      this.auftragText.textContent = auftrag.text;
      this.auftragLohn.textContent = `+${auftrag.taler}`;
      this.auftragKarte.setAttribute('aria-label', `Auftrag: ${auftrag.text}. Belohnung ${auftrag.taler} Dorftaler`);
    } else {
      this.auftragText.textContent = 'Alle Aufträge erledigt';
      this.auftragLohn.textContent = '★';
    }
    // A81: Keine Münzen mehr an den Häusern – der Balken zeigt, wie voll das Konto im Verhältnis zum Kassenspeicher ist
    const grenze = sp.kassengrenze_eur(), voll = s.geld_eur >= grenze - 0.5;
    this.setze(this.geld, `${zahl(s.geld_eur)} €`, s.geld_eur / grenze, `Geld ${zahl(s.geld_eur)} Euro von höchstens ${zahl(grenze)} Euro im Kassenspeicher${voll ? ' – Kasse voll' : ''}. Die Kunden zahlen am Monatsende automatisch`);
    this.geld.wurzel.classList.toggle('mangel', voll);
    const da = n.verfuegbar_kw, gebraucht = n.genutzt_kw;
    this.setze(this.waerme, `${zahl(gebraucht)}/${zahl(da)} kW`, da > 0 ? gebraucht / da : 0, `Wärme: ${zahl(gebraucht)} von ${zahl(da)} Kilowatt genutzt. Bedarf ${zahl(n.bedarf_kw)} Kilowatt`);
    this.waerme.wurzel.classList.toggle('mangel', n.bedarf_kw > da + 0.01);
    const ruf = sp.ruf_pct();
    this.setze(this.ruf, `${zahl(ruf)} %`, ruf / 100, `Ruf ${zahl(ruf)} Prozent`);
    this.ruf.wurzel.classList.toggle('schlecht', ruf < 45);
    this.setze(this.taler, zahl(s.taler), 0, `${zahl(s.taler)} Dorftaler`);
    const frei = Math.max(0, sp.monteure() - sp.beschaeftigt());
    this.setze(this.monteure, `${frei}/${sp.monteure()} frei`, sp.monteure() ? (sp.monteure() - frei) / sp.monteure() : 0, `Monteure: ${frei} von ${sp.monteure()} frei`);
    this.monteure.wurzel.classList.toggle('mangel', frei === 0);
    this.monteure.wurzel.classList.add('waerme');
  }

  private setze(p: Pille, text: string, anteil: number, label: string): void {
    if (p.wert.textContent !== text) p.wert.textContent = text;
    p.fuell.style.width = `${Math.max(0, Math.min(1, anteil)) * 100}%`;
    p.wurzel.setAttribute('aria-label', label);
  }
}
