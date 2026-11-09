import { ABSCHNITT_HELFER, BAU_KATEGORIEN, istLeitung, KATALOG, KONSTANTEN, type Kategorie, type TypId } from '../core/katalog';
import { chip, knopf, symbol } from './bausteine';
import { NICHTS_GEZEICHNET, ersteSperre, geldHinweis, geldSperre, stufenSperre, talerHinweis, talerSperre } from './sperrtexte';
import { blattOeffnen, type Blatt } from './blatt';
import { katalogBild } from './bild';
import { eur, h } from './dom';
import { dauerText, zeitText } from '../render/gebaeude';
import type { Ui } from './schnittstelle';
import type { SymbolName } from './symbole';

/** DESIGN.md 12.16: Symbol und kurzes Wort je Reiter (kurze Wörter für schmale Leisten, z. B. 667 px breite Geräte). */
const REITER: Partial<Record<Kategorie, { symbol: SymbolName; kurz: string }>> = {
  innen: { symbol: 'waerme', kurz: 'Heizhaus' }, waerme: { symbol: 'sonne', kurz: 'Außen' }, netz: { symbol: 'rohr', kurz: 'Netz' },
  dorf: { symbol: 'haus', kurz: 'Dorf' }, deko: { symbol: 'baum', kurz: 'Deko' },
};

function werte(t: TypId): string {
  const D = KATALOG[t];
  const teile: string[] = [];
  if (D.leistung_kw) teile.push(`${D.leistung_kw[0]} kW`);
  if (D.strom_kw) teile.push(`${D.strom_kw[0]} kW Strom`);
  if (D.strom_je_waerme && D.leistung_kw) teile.push(`+ ${Math.round(D.leistung_kw[0] * D.strom_je_waerme)} kW Strom`);
  if (D.kapazitaet_kw) teile.push(`bis ${D.kapazitaet_kw} kW`);
  if (D.bedarf_kw) teile.push(D.verbrauch_kwh_a ? `${D.verbrauch_kwh_a.toLocaleString('de-DE')} kWh im Jahr = ${Math.round(D.bedarf_kw * 10) / 10} kW` : `braucht ${D.bedarf_kw} kW`);
  if (D.groesse && D.groesse > 1) teile.push(`${D.groesse}×${D.groesse} Felder`);
  return teile.join(' · ');
}

/** NR13: Ziel-Name fürs Tutorial (Loch, Finger) an einem fertigen Knopf – der `knopf(`-Aufruf selbst bleibt unverändert. */
const ziel = (k: HTMLButtonElement, name: string): HTMLButtonElement => { k.setAttribute('data-ziel', name); return k; };

/** Bau-Katalog (S4): Blatt von unten mit Reitern. Jede Karte ist ein Knopf und erklärt, warum etwas nicht geht. */
export class Katalog {
  private blatt: Blatt | null = null;
  private kategorie: Kategorie = 'netz';
  /** A92: Phase des Bauabschnitts beim letzten Aufbau und die Restzeit-Anzeige darin – fürs Auffrischen ohne Neuaufbau. */
  private gebautePhase: string | undefined;
  private restzeit: HTMLElement | null = null;

  constructor(private readonly ui: Ui) {}

  oeffnen(kategorie?: string): void {
    if (kategorie && BAU_KATEGORIEN.some(([k]) => k === kategorie)) this.kategorie = kategorie as Kategorie;
    this.blatt = blattOeffnen({ titel: 'Bauen', art: 'hoch', beiZu: () => { this.blatt = null; }, zuSperre: () => this.ui.tutorialSperreKnopf('blatt_schliessen') });
    this.aufbauen();
  }
  schliessen(): void { this.blatt?.zu(); }

  /** A92: Läuft der Bauabschnitt weiter, zählt nur die Restzeit; wechselt seine Phase (z. B. Planung fertig), wird das Blatt einmal neu gebaut.
   *  Tut bei geschlossenem Blatt nichts. */
  aktualisieren(): void {
    if (!this.blatt || this.kategorie !== 'netz') return;
    if (this.ui.spiel.abschnitt?.phase !== this.gebautePhase) { this.aufbauen(); return; }
    if (this.restzeit) this.restzeit.textContent = this.restText();
  }
  private restText(): string {
    return zeitText(Math.ceil(Math.max(0, (this.ui.spiel.abschnitt?.bau?.ende_ms ?? 0) - this.ui.jetzt_ms()) / 1000));
  }

  private aufbauen(): void {
    if (!this.blatt) return;
    const { spiel: sp } = this.ui, s = sp.stand;
    this.gebautePhase = sp.abschnitt?.phase; this.restzeit = null;
    // DESIGN.md 12.16: alle fünf Reiter in einer Reihe, Symbol über dem Wort; beide Wortlängen stehen im HTML, die
    // Container-Abfrage in stil.css zeigt je nach Leistenbreite das lange, das kurze oder keins. Vorleser hört immer den vollen Namen.
    const reiter = h('div', { class: 'reiter', role: 'tablist' }, ...BAU_KATEGORIEN.map(([k, name]) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(k === this.kategorie), 'aria-label': name, class: `knopf klein ${k === this.kategorie ? 'gewaehlt' : ''}`, 'data-ziel': k === 'netz' ? 'reiter_leitungen' : null, onclick: () => { this.kategorie = k; this.aufbauen(); if (k === 'netz') this.ui.tutorialMelden({ art: 'tipp', tipp: 'reiter_leitungen' }); } },
        symbol(REITER[k]?.symbol ?? 'bauen', 'sym reiter-sym'), h('span', { class: 'wort lang' }, name), h('span', { class: 'wort kurz' }, REITER[k]?.kurz ?? name))));
    const raster = h('div', { class: 'raster' });
    const typen = (Object.keys(KATALOG) as TypId[]).filter((t) => KATALOG[t].kategorie === this.kategorie && t !== 'hz');
    for (const t of typen) raster.append(this.karte(t));
    if (!typen.length) raster.append(h('p', {}, 'In dieser Kategorie gibt es noch nichts zu bauen.'));
    this.blatt.inhalt.replaceChildren(reiter, h('div', { style: 'height:8px' }), ...(this.kategorie === 'netz' ? [this.abschnittKasten(), h('div', { style: 'height:8px' })] : []), raster);
    void s;
  }

  /** A41: Bauabschnitt – Philipp plant, Laura bestellt das Material, dann wird gebaut. */
  private abschnittKasten(): HTMLElement {
    const sp = this.ui.spiel, a = sp.abschnitt, k = h('div', { class: 'kasten', 'data-ziel': 'kasten_abschnitt' });
    const neu = (): void => { this.ui.geaendert(); this.aufbauen(); };
    const rest = (): HTMLElement => { this.restzeit = h('span', {}, this.restText()); return this.restzeit; };
    k.append(h('h3', {}, 'Bauabschnitt')); // Mini-Kopfband wie jeder Kasten (DESIGN.md 12.7)
    if (!a) {
      k.append(h('p', { class: 'gedaempft' }, `Leitungen werden abschnittsweise gebaut: ${ABSCHNITT_HELFER.planung} plant, du zeichnest die Leitungen ein, ${ABSCHNITT_HELFER.material} bestellt das Material, danach dauert der Bau.`),
        h('div', { class: 'knopfreihe' }, ziel(knopf(`${ABSCHNITT_HELFER.planung}: Neuen Bauabschnitt planen`, () => { sp.abschnittPlanen(); neu(); }, 'geld', { unter: eur(KONSTANTEN.abschnitt_planung_eur), sperre: geldSperre(sp, KONSTANTEN.abschnitt_planung_eur) }), 'philipp')));
    } else if (a.phase === 'planung') {
      k.append(h('p', {}, `${ABSCHNITT_HELFER.planung} plant den Abschnitt … noch `, rest()));
    } else if (a.phase === 'offen') {
      const n = sp.abschnittLeitungen();
      // A88/F1: Gestattung, Spülbohrung, Anbohrung und Vorsehung erst erwähnen, wenn sie freigeschaltet sind – vorher kosten sie nichts.
      const anschluesse = sp.abschnittAnschluesse();
      const saetze = [
        `Leitungen liegen am besten in der öffentlichen Straße. Grenzt eine Leitung an ein Haus, kann es darüber Wärme bekommen – den kurzen Abzweig setzt das Spiel selbst. Endet ein eigenes Leitungsstück am Haus, ist es sein Hausanschluss${anschluesse.length ? ` – in diesem Abschnitt: ${anschluesse.length} (${anschluesse.map((a) => KATALOG[a.typ].name).slice(0, 4).join(', ')}${anschluesse.length > 4 ? ' …' : ''})` : ''}; er muss dick genug für das Haus sein.`,
        'Zum Andocken zieh direkt über den Übergang zur Bestandsleitung oder wähle am Rohr „Trassen verbinden“.',
        sp.freigeschaltet('gestattung') ? `Abseits davon brauchst du die Gestattung des Eigentümers (${eur(KONSTANTEN.gestattung_eur_je_feld)} je Feld${sp.gestattungsFelder().length ? `, aktuell ${sp.gestattungsFelder().length} Felder = ${eur(sp.gestattung_eur())}` : ''}).` : '',
        sp.freigeschaltet('spuelbohrung') ? `Über den Fluss kommst du im Spiel nur per Spülbohrung (${eur(KONSTANTEN.bohrung_eur_je_feld)} je Feld${sp.bohrungsFelder().length ? `, aktuell ${eur(sp.bohrung_eur())}` : ''}).` : '',
        sp.freigeschaltet('vorsehung') ? `Dockst du an eine laufende Leitung an, muss sie angebohrt werden (${eur(KONSTANTEN.anbohrung_eur)}${sp.anbohrungsFelder().length ? `, aktuell ${sp.anbohrungsFelder().length}× = ${eur(sp.anbohrung_eur())}` : ''}) – außer an einem Leitungsende oder an einem T-Stück mit Vorsehung (${eur(KONSTANTEN.vorsehung_eur)}), das du jetzt beim Bau mit einplanst.` : '',
      ];
      k.append(h('p', { class: 'gedaempft abschnitt-kurz' }, `Wähle unten eine Leitung und zeichne sie in die Karte. Eingezeichnet: ${n} Stück · Kosten ${eur(sp.abschnittKosten_eur())}.`),
        h('details', { class: 'abschnitt-hilfe' }, h('summary', {}, 'Tipps zu Trassen und Anschlüssen'), h('p', { class: 'gedaempft' }, saetze.filter(Boolean).join(' '))),
        h('div', { class: 'knopfreihe' },
          knopf('Abschnitt abschließen', () => { sp.abschnittAbschliessen(); neu(); }, 'los', { klein: true, sperre: n ? null : NICHTS_GEZEICHNET }),
          knopf('Verwerfen', () => { sp.abschnittVerwerfen(); neu(); }, '', { klein: true, sperre: this.ui.tutorialSperreKnopf('verwerfen') })));
    } else if (a.phase === 'bestellen') {
      const kost = sp.abschnittKosten_eur();
      // NR18: Warnen statt sperren – die zu dünnen Stellen stehen über der Bestellung, bestellt wird trotzdem.
      const warnungen = sp.abschnittWarnungen();
      // DESIGN 12.22: roter Streifen im Kasten „Bauabschnitt“ statt eines Kastens im Kasten
      if (warnungen.length) k.append(h('div', { class: 'warnstreifen', role: 'note' }, h('h3', {}, 'Nach dem Bau zu dünn'), ...warnungen.map((w) => h('p', {}, w))));
      k.append(h('p', { class: 'gedaempft' }, `${sp.abschnittLeitungen()} Leitungsfelder (${sp.abschnittLeitungen() * KONSTANTEN.feldlaenge_m} m Trasse) sind geplant${sp.gestattungsFelder().length ? `, dazu Gestattungen für ${sp.gestattungsFelder().length} Felder über private Grundstücke (${eur(sp.gestattung_eur())})` : ''}${sp.bohrungsFelder().length ? `, dazu eine Spülbohrung unter dem Fluss (${eur(sp.bohrung_eur())})` : ''}${sp.vorsehungen_eur() ? `, dazu ${sp.vorsehungen_eur() / KONSTANTEN.vorsehung_eur} T-Stück(e) mit Vorsehung (${eur(sp.vorsehungen_eur())})` : ''}${sp.anbohrungsFelder().length ? `, dazu ${sp.anbohrungsFelder().length} Anbohrung(en) an laufender Leitung (${eur(sp.anbohrung_eur())})` : ''}. Nach der Bestellung dauert der Bau etwa ${dauerText(KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor)}`),
        h('div', { class: 'knopfreihe' },
          ziel(knopf(`${ABSCHNITT_HELFER.material}: Material bestellen`, () => { sp.materialBestellen(); neu(); }, 'geld', { unter: eur(kost), sperre: geldSperre(sp, kost) }), 'laura'),
          knopf('Weiter einzeichnen', () => { sp.abschnittWiederOeffnen(); neu(); }, '', { klein: true, sperre: this.ui.tutorialSperreKnopf('weiter_einzeichnen') }),
          knopf('Verwerfen', () => { sp.abschnittVerwerfen(); neu(); }, '', { klein: true, sperre: this.ui.tutorialSperreKnopf('verwerfen') })));
    } else {
      const c = a.bau ? sp.beschleunigungskosten_taler(a.bau) : 0;
      const ex = sp.expresskosten_eur();
      k.append(h('p', {}, 'Der Bauabschnitt wird gebaut … noch ', rest(), a.express ? ' (Expresslieferung)' : ''),
        h('div', { class: 'knopfreihe' },
          // A88: gesperrt = deaktiviert mit Grund statt Preis; fehlt nur Geld, bleibt der Preis (DESIGN.md 12.20 Regel 4/5)
          a.express ? null : knopf(`${ABSCHNITT_HELFER.material}: Expresslieferung`, () => { sp.expressLiefern(); neu(); }, 'geld', { klein: true, unter: eur(ex), sperre: ersteSperre(this.ui.tutorialSperreKnopf('express'), stufenSperre(sp, 'express'), geldSperre(sp, ex)) }),
          knopf('Sofort fertig', () => { sp.beschleunigen(a.bau); neu(); }, 'taler', { klein: true, unter: `${c} Taler`, sperre: ersteSperre(this.ui.tutorialSperreKnopf('sofort'), a.bau ? talerSperre(sp, () => sp.beschleunigungskosten_taler(a.bau!)) : null) })));
    }
    return k;
  }

  private karte(t: TypId): HTMLElement {
    const { spiel: sp } = this.ui, s = sp.stand, D = KATALOG[t];
    const innen = D.kategorie === 'innen';
    const anzahl = sp.anzahl(t), grenze = innen ? 99 : sp.grenze(t);
    const gesamtLeitungen = istLeitung(t) ? sp.leitungsanzahl() : anzahl;
    const grund = sp.sperrgrund(t), gesperrt = grund !== null; // A88: der Kern entscheidet, die Karte zeigt nur an
    const voll = !innen && !gesperrt && gesamtLeitungen >= grenze;
    const c = sp.kosten(t, 1);
    const kostetText = c.taler != null ? `${c.taler} Taler` : eur(c.eur ?? 0);
    const zuTeuer = c.taler != null ? s.taler < c.taler : s.geld_eur < (c.eur ?? 0);
    const antrag = s.antraege[t];
    // NR13: erst die normale Aktion (Zeichenleiste öffnet), dann die Meldung – so ist die Leiste offen, wenn das Tutorial weiterzählt
    const leitung = istLeitung(t);
    const kind = h('button', { type: 'button', class: `bkarte ${gesperrt || voll ? 'gesperrt' : ''}`, 'aria-label': `${D.name}, ${kostetText}`, 'data-ziel': leitung ? 'leitungskarte' : null, 'data-typ': leitung ? t : null, onclick: () => { this.waehlen(t); if (leitung) this.ui.tutorialMelden({ art: 'tipp', tipp: 'leitungskarte', typ: t }); } },
      katalogBild(t),
      h('span', { class: 'titel' }, D.name),
      h('span', { class: 'werte' }, werte(t)),
      gesperrt ? h('span', { class: 'grund' }, symbol('schloss'), grund)
        : voll ? h('span', { class: 'grund' }, `${gesamtLeitungen}/${grenze} · mehr ab nächster Stufe`)
          : h('span', { class: `preis ${zuTeuer ? 'zuteuer' : ''}` }, symbol(c.taler != null ? 'taler' : 'geld'), kostetText, !innen && D.kategorie !== 'netz' ? h('span', { class: 'gedaempft' }, ` · ${gesamtLeitungen}/${grenze}`) : null),
      antrag?.stand === 'bewilligt' ? h('span', { class: 'abzeichen' }, chip('−40 % Förderung', 'gruen')) : antrag ? h('span', { class: 'abzeichen' }, chip('Antrag in Prüfung', 'blau')) : null);
    return kind;
  }

  private waehlen(t: TypId): void {
    const { spiel: sp } = this.ui, D = KATALOG[t], s = sp.stand;
    const grund = sp.sperrgrund(t);
    // DESIGN.md 12.20 (Katalogkarten): derselbe Wortlaut wie an den gesperrten Knöpfen (Regel 5/6)
    if (grund) { this.ui.toast(`${D.name} ${grund}. Baue die Heizzentrale aus.`); return; }
    const c = sp.kosten(t, 1);
    const fehltGeld = c.eur != null && !istLeitung(t) ? geldHinweis(c.eur - s.geld_eur) : null;
    if (fehltGeld) { this.ui.toast(fehltGeld); return; }
    const fehltTaler = c.taler != null ? talerHinweis(c.taler - s.taler) : null;
    if (fehltTaler) { this.ui.toast(fehltTaler); return; }
    if (D.kategorie === 'innen') {
      const r = sp.innenEinbauen(t);
      this.ui.geaendert();
      if (r.ok) this.schliessen();
      return;
    }
    if (!D.sofort && sp.beschaeftigt() >= sp.monteure()) { this.ui.toast('Alle Monteure sind beschäftigt – warte oder baue eine Monteurhütte'); return; }
    if (istLeitung(t)) {
      if (sp.abschnitt?.phase !== 'offen') { this.ui.toast(sp.abschnitt ? 'Der Bauabschnitt ist gerade nicht zum Einzeichnen offen' : 'Plane erst einen Bauabschnitt'); return; }
      this.ui.stempeln(t); return;
    }
    this.ui.platzieren(t);
  }
}

