import { ausbauZieleKasten } from './ziele';
import { ANDI_BUDGET_SCHRITT, ABSCHNITT_HELFER, istLeitung, DACH_PV, UPGRADES, VORLAUF, VOLLLASTSTUNDEN, MIN_RUECKLAUF_C, GRUNDGEBUEHR, HELFER, KATALOG, LEITUNGEN, KONSTANTEN, PREISSTUFEN, PUFFER_STATIONEN, STATIONEN, hatStufen, istPufferStation, passendePufferStation, passendeStation, stationHolen, type PufferStation, type Station, type TypId } from '../core/katalog';
import { bedarfKw, eigenerAnschlussZuDuenn, groesse, istAktiv, istKunde, nutzungsfaktor, pufferStationReicht, spreizungHaus_k, stationReicht } from '../core/netz';
import { abStufe, merkmalName, type Merkmal } from '../core/freischaltung';
import { WANDSTATION_TUTORIAL, type Spiel } from '../core/spiel';
import type { Objekt } from '../core/typen';
import { balken, chip, knopf, kasten, sperrChip, sperrHinweis, stepper, symbol, zeile, type Sperre } from './bausteine';
import { ANSCHLUSS_GEPLANT, OHNE_ABSCHNITT_HINWEIS_HAUS, OHNE_STATION, RAND, ZIELE_OFFEN, abschnittSperre, abschnittSperreKurz, baugebietSperre, ersteSperre, geldSperre, helferSperre, stufenHinweis, stufenSperre, vertragSperre } from './sperrtexte';
import { blattOeffnen, type Blatt } from './blatt';
import { eur, h, zahl } from './dom';
/** kW mit einer Nachkommastelle (8,3 kW). Erst auf 12 gültige Stellen glätten, dann auf eine Nachkommastelle runden: 15,75 kW
 *  entsteht als 15,7499…, und toLocaleString allein zeigte dann „15,7“. */
const kw = (n: number): string => (Math.round(Number(n.toPrecision(12)) * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 });
/** Kurzname einer Leitung ohne „-Leitung“ („40er“), wie in den NR18-Sätzen (Bauplan NR18 Abschnitt 6). */
const kurzname = (t: TypId): string => KATALOG[t].name.replace(/-Leitung$/, '');
import type { Ui } from './schnittstelle';
import { zeitText } from '../render/gebaeude';

const QUELLEN: TypId[] = ['kessel', 'pellet', 'gas', 'bhkw', 'wpg', 'ptk', 'pv', 'puffer', 'solar', 'sonde'];

/** A88/F2: Kasten „Anfrage“ der Hauskarte – Satz des Kunden, Leistung vorher → nachher, Annehmen/Später (DESIGN.md 12.5/12.7). */
export function anfrageKasten(sp: Spiel, o: Objekt, nachAktion: () => void): HTMLDivElement | null {
  if (o.anfrage !== 'vollversorgung' && o.anfrage !== 'aufstockung') return null;
  const vorher_kw = bedarfKw(o), nachher_kw = sp.anfrageBedarf_kw(o), st = stationHolen(o.station);
  const k = kasten('Anfrage', h('p', {}, o.anfrage === 'vollversorgung'
    ? 'Darf ich meinen Kaminofen abschalten und ganz mit Fernwärme heizen?'
    : 'Wir bauen ein Stockwerk auf – könnt ihr mehr Wärme liefern?'),
  zeile('Anschlussleistung danach', `${kw(vorher_kw)} → ${kw(nachher_kw)} kW`));
  if (st && !stationReicht(st, sp.anfrageObjekt(o))) k.append(chip('Station dann zu klein', 'rot'));
  k.append(h('div', { class: 'knopfreihe' },
    knopf('Annehmen', () => { sp.anfrageAnnehmen(o.id); nachAktion(); }, 'los', { klein: true, unter: `+${kw(nachher_kw - vorher_kw)} kW Bedarf` }),
    knopf('Später', () => { sp.anfrageAblehnen(o.id); nachAktion(); }, '', { klein: true, unter: 'fragt später wieder' })));
  return k;
}

/** NR19/DESIGN 12.23: Kurzform „Puffer HP 800“ für Knöpfe und Hauskarte; der Katalogname bleibt lang, weil die Sätze des Kerns ihn nennen.
 *  Kürzel und Zahl sind die letzten beiden Wörter des Katalognamens, mit geschütztem Leerzeichen gebunden. */
function pufferKurzname(st: PufferStation): string {
  const [kuerzel, groesse_l] = st.name.split(' ').slice(-2);
  return `Puffer ${kuerzel}\u00a0${groesse_l}`;
}

/** DESIGN 12.23 Nachfoto: Zeile 1 der Wandstations-Knöpfe. Zwei Knöpfe nebeneinander sind schmal; der Text darf nur nach
 *  „Wandstation“ und nach „·“ umbrechen („Wandstation“ / „Typ 15 · 15 kW“). Der lange CAD-Katalogname läuft im Knopf über,
 *  deshalb dort kurz „CAD-Station“; Katalog und Hauskarte nennen weiter den langen Namen. */
function wandKnopfName(st: Station): string {
  const name = st.id === 'st_cad' ? 'CAD-Station' : st.name.replace(/ Typ (\d)/, ' Typ\u00a0$1');
  return `${name}\u00a0· ${st.leistung_kw}\u00a0kW`;
}

/** NR19: Zeile(n) „Übergabestation“ der Hauskarte – Puffer-Station zweizeilig mit beiden Leistungen (DESIGN 12.23 Punkt 3),
 *  alter Stand „Puffer + Wandstation“ mit Zusatz. */
function stationZeilen(st: Station | undefined, o: Objekt): HTMLDivElement[] {
  if (istPufferStation(st)) return [zeile('Übergabestation', pufferKurzname(st)), zeile('Leistung Station', `${st.leistung_kw}\u00a0kW\u00a0Netz\u00a0· ${st.spitze_kw}\u00a0kW\u00a0Haus`)];
  return [zeile('Übergabestation', st ? `${st.name} · ${st.leistung_kw} kW${o.hauspuffer ? ', mit Puffer' : ''}` : 'keine')];
}

/** DESIGN 12.23: Zwischenüberschrift im Kasten (Manrope 800, 14 px, Farbe text, Abstand oben 16, unten 4) – nur Tokens, keine neue Klasse. */
const ZWISCHEN_STIL = 'margin:var(--abstand-px-3) 0 var(--abstand-px-0);font-family:var(--schrift-text);font-weight:800;font-size:var(--schrift-groesse-px-text);color:var(--menue-farbe-text)';
const zwischenueberschrift = (text: string): HTMLHeadingElement => h('h4', { style: ZWISCHEN_STIL }, text);
/** Preis mit geschütztem Leerzeichen vor „€“, damit der Umbruch nicht zwischen Zahl und Währung fällt (DESIGN 12.20 Regel 1, Zusatz 12.23). */
const eurGebunden = (n: number): string => eur(n).replace(/ €$/, '\u00a0€');

/** A92 (NR16): Hinweis beim Antippen des gesperrten T-Stück-Knopfs – Spieler hielten das T-Stück für nötig zum Anschließen.
 *  Fachgeprüft, höchstens 90 Zeichen; den späteren Nutzen (Anbohren sparen) verschweigt er vor der Freischaltung bewusst
 *  (ENTSCHEIDUNGEN 2026-11-05, wie A88/F1). */
export const tStueckHinweis = (): string =>
  `Für Hausanschlüsse nicht nötig, den Abzweig setzt das Spiel. Frei ab Heizzentrale Stufe ${abStufe('vorsehung')}.`;

/** 12.20 S1 (Seitenblatt) und S2 (Heizhaus-Quelle, `imHeizhaus`): Gebäude hat schon die Stufe der Heizzentrale. */
const hzStufeSperre = (naechste: number, imHeizhaus: boolean): Sperre => ({
  grund: 'erst Heizzentrale ausbauen', schloss: true,
  hinweis: `Stufe ${naechste} gibt es, sobald die Heizzentrale Stufe ${naechste} hat. ${imHeizhaus ? 'Der Ausbau steht unten im Blatt.' : 'Baue sie zuerst aus.'}`,
});

/** Kurzer Sperrgrund für enge Leisten und Chips (DESIGN.md 12.15); die Stufe kommt aus dem Kern. Geschütztes Leerzeichen
 *  vor der Zahl, damit sie in schmalen Knöpfen nicht allein in die nächste Zeile rutscht. */
export const kurzGrund = (m: Merkmal): string => `ab Stufe\u00a0${abStufe(m)}`;

/** A88: freigeschaltete Leitungen als Knöpfe (ohne `ohne`) plus höchstens ein deaktivierter Knopf „Dickere“ mit dem Grund –
 *  für Zeichenleiste und Leitungskarte. LEITUNGEN ist dünn → dick sortiert, die erste gesperrte ist also die nächste Freischaltung.
 *  `kurz`: In der engen Zeichenleiste reicht „ab Stufe X“ (DESIGN.md 12.15), die Leitungskarte behält den langen Grund.
 *  `nurDicker`: nur Leitungen, die dicker sind als `ohne` (Ersetzen auf der Leitungskarte). */
export function leitungsKnoepfe(sp: Spiel, ohne: TypId | null, knopfFuer: (t: TypId) => HTMLButtonElement, kurz = false, nurDicker = false): HTMLButtonElement[] {
  // Auf der Leitungskarte zählt nur eine gesperrte Leitung, die dicker ist als die vorhandene (`ohne`) – sonst gäbe es dort nichts „Dickeres“.
  const ab = ohne ? LEITUNGEN.indexOf(ohne) + 1 : 0;
  // NR18 `nurDicker`: Ersetzen lohnt nur mit einer dickeren Leitung, der Kern lehnt dünnere ohnehin ab.
  const knoepfe = LEITUNGEN.filter((t, i) => t !== ohne && sp.freigeschaltet(t) && (!nurDicker || i >= ab)).map(knopfFuer);
  const naechste = LEITUNGEN.slice(ab).find((t) => !sp.freigeschaltet(t));
  const grund = naechste ? (kurz ? kurzGrund(naechste) : sp.sperrgrund(naechste)) : null;
  // DESIGN.md 12.19: Hinweis beim Antippen nennt die volle Stufe, auch wenn der Knopf nur den kurzen Grund trägt
  if (naechste && grund) knoepfe.push(knopf('Dickere', () => undefined, '', { klein: true, aus: true, schloss: true, unter: grund, hinweis: stufenHinweis(naechste, 'Dickere Leitungen') }));
  return knoepfe;
}

/** Zeichenleiste (DESIGN.md 12.18): die gesperrten dickeren Leitungen als EIN grauer Farbknopf mit Schloss über „St. N“
 *  (geschütztes Leerzeichen); der Vorleser hört den ganzen Satz, Tippen zeigt den Hinweis mit der vollen Stufe (12.19).
 *  `null`, wenn alle Leitungen frei sind. Gleiche Regel wie in `leitungsKnoepfe`: die erste gesperrte ist die nächste Freischaltung. */
export function dickereFarbknopf(sp: Spiel): HTMLButtonElement | null {
  const naechste = LEITUNGEN.find((t) => !sp.freigeschaltet(t));
  if (!naechste) return null;
  const k = knopf(h('span', { class: 'farb-sperre' }, symbol('schloss', 'sym schloss-klein'), `St.\u00a0${abStufe(naechste)}`), () => undefined, '', { aus: true, hinweis: stufenHinweis(naechste, 'Dickere Leitungen') });
  k.classList.add('farbknopf');
  k.setAttribute('aria-label', `Dickere Leitungen ab Heizzentrale Stufe ${abStufe(naechste)}`);
  return k;
}

function signatur(c: HTMLElement): string {
  const k = c.cloneNode(true) as HTMLElement;
  k.querySelectorAll('[data-live]').forEach((e) => {
    e.textContent = ''; e.removeAttribute('style'); e.removeAttribute('aria-valuenow');
  });
  // Wackeln nach dem Antippen (12.19) ist kein neuer Inhalt – sonst baute der nächste Takt das Blatt mitten im Wackeln neu
  k.querySelectorAll('.wackelt').forEach((e) => e.classList.remove('wackelt'));
  return k.innerHTML;
}

/** Kontextkarte: je Objekttyp die passenden Auskünfte und Aktionen. Baut sich bei Änderungen neu auf, Zeitwerte laufen live. */
export class Kontext {
  private blatt: Blatt | null = null;
  private id: number | null = null;
  private sig = '';

  constructor(private readonly ui: Ui, private readonly beiZu: () => void) {}

  get offenFuer(): number | null { return this.id; }

  oeffnen(id: number): void {
    const o = this.ui.spiel.objekt(id);
    if (!o) return;
    const D = KATALOG[o.typ];
    // A80: Das alte Blatt wird beim Öffnen des neuen geschlossen – sein Schließen darf das neue nicht leeren (früher: weißes Fenster).
    this.blatt = null;
    const b: Blatt = blattOeffnen({ titel: D.name, stufe: hatStufen(o.typ) ? `Stufe ${o.stufe}` : '', beiZu: () => { if (this.blatt !== b) return; this.blatt = null; this.id = null; this.beiZu(); }, zuSperre: () => this.ui.tutorialSperreKnopf('blatt_schliessen') });
    this.blatt = b; this.id = id;
    this.sig = '';
    this.aktualisieren();
  }

  schliessen(): void { this.blatt?.zu(); }

  aktualisieren(): void {
    if (!this.blatt || this.id == null) return;
    const o = this.ui.spiel.objekt(this.id);
    if (!o) { this.schliessen(); return; }
    const neu = h('div', {});
    this.inhalt(neu, o);
    const s = signatur(neu);
    if (s !== this.sig) {
      this.sig = s;
      this.blatt.stufe.textContent = hatStufen(o.typ) ? `Stufe ${o.stufe}` : '';
      const scroll = this.blatt.inhalt.scrollTop;
      this.blatt.inhalt.replaceChildren(...neu.childNodes);
      this.blatt.inhalt.scrollTop = scroll;
    } else {
      neu.querySelectorAll<HTMLElement>('[data-live]').forEach((e) => {
        const alt = this.blatt!.inhalt.querySelector<HTMLElement>(`[data-live="${e.dataset.live}"]`);
        if (!alt) return;
        if (e.getAttribute('role') === 'progressbar') {
          alt.setAttribute('aria-valuenow', e.getAttribute('aria-valuenow')!);
          alt.firstElementChild?.setAttribute('style', e.firstElementChild?.getAttribute('style') ?? '');
        } else {
          alt.textContent = e.textContent;
          if (e.getAttribute('style')) alt.setAttribute('style', e.getAttribute('style')!);
        }
      });
    }
  }

  // ---------- Inhalte ----------
  private inhalt(c: HTMLElement, o: Objekt): void {
    const { spiel: sp } = this.ui, D = KATALOG[o.typ], n = sp.netz;
    c.append(h('p', {}, D.beschreibung));
    if (o.bau) { this.baustelle(c, o); return; }
    const kat = D.kategorie;
    if (o.typ === 'hz') this.heizzentrale(c, o);
    else if (istLeitung(o.typ)) this.leitung(c, o);
    else if (o.typ === 'buero') this.buero(c, o);
    else if (o.typ === 'huette') c.append(zeile('Monteure insgesamt', `${sp.monteure()}`), h('p', { class: 'gedaempft' }, `Gerade beschäftigt: ${sp.beschaeftigt()}`));
    else if (kat === 'haus') this.haus(c, o);
    else if (kat === 'gross') this.gross(c, o);
    else if (kat === 'waerme') this.aussenquelle(c, o);
    else if (kat === 'hindernis') {
      c.append(h('div', { class: 'knopfreihe' }, knopf(`Wegräumen · ${eur(D.raeumen_eur ?? 0)} + ${D.raeumen_taler ?? 0} Taler`, () => { if (sp.hindernisRaeumen(o.id).ok) { this.ui.geaendert(); this.schliessen(); } }, 'geld')));
    } else if (kat === 'deko') {
      c.append(h('div', { class: 'knopfreihe' }, knopf('Verschieben', () => this.ui.verschieben(o.id)), knopf('Entfernen', () => { sp.entfernen(o.id); this.ui.geaendert(); this.schliessen(); })));
    }
    if (sp.istAusbauUmzug(o) || (['buero', 'huette'].includes(o.typ) && sp.hzAusbauBlocker().includes(o))) {
      c.append(h('p', {}, 'Steht auf der Ausbaureserve der Heizzentrale.'),
        h('div', { class: 'knopfreihe' }, knopf('Aus der Ausbaufläche verschieben', () => this.ui.verschieben(o.id))));
    }
    if (!istAktiv(o)) return;
    void n;
  }

  private baustelle(c: HTMLElement, o: Objekt): void {
    const b = o.bau!, sp = this.ui.spiel, jetzt = this.ui.jetzt_ms();
    const f = Math.max(0, Math.min(1, (jetzt - b.start_ms) / (b.ende_ms - b.start_ms)));
    const bal = balken(f), i = bal.querySelector('i') as HTMLElement;
    i.dataset.live = 'bar';
    const rest = h('span', { 'data-live': 'rest' }, zeitText((b.ende_ms - jetzt) / 1000));
    c.append(chip(b.art === 'neu' ? 'wird gebaut' : `wird ausgebaut auf Stufe ${o.stufe + 1}`, 'blau'), bal,
      h('p', {}, 'Noch ', rest));
    if (sp.istNeubau(o)) {
      c.append(h('p', {}, 'Dieses Haus entsteht von selbst. Lege in der Haupttrasse schon eine Vorsehung für den späteren Anschluss.'));
      return;
    }
    const kosten = h('span', { 'data-live': 'taler' }, String(sp.beschleunigungskosten_taler(b)));
    c.append(h('div', { class: 'knopfreihe' }, knopf(h('span', {}, 'Beschleunigen · ', kosten, ' Taler'), () => { sp.beschleunigen(o.bau); this.ui.geaendert(); }, 'taler')));
  }

  private ausbauKnopf(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, D = KATALOG[o.typ];
    if (!D.kosten_eur || !D.bauzeit_s) return;
    if (o.stufe >= sp.maxStufe(o)) {
      // gesperrt: deaktivierter Knopf mit Grund statt grauem Text an Knopfstelle (DESIGN.md 12.13 Punkt 5)
      c.append(o.stufe >= KONSTANTEN.hoechststufe ? h('p', { class: 'gedaempft' }, 'Höchste Stufe erreicht.')
        : h('div', { class: 'knopfreihe' }, knopf(`Stufe ${o.stufe + 1}`, () => undefined, '', { sperre: hzStufeSperre(o.stufe + 1, false) })));
      return;
    }
    const k = D.kosten_eur[o.stufe], zeit = D.bauzeit_s[o.stufe];
    const ziel = o.typ === 'hz' ? sp.hzZiele().some((z) => !z.erreicht) : false;
    c.append(h('div', { class: 'knopfreihe' }, knopf(`Ausbauen auf Stufe ${o.stufe + 1}`, () => { sp.ausbauen(o.id); this.ui.geaendert(); }, 'geld', { unter: `${eur(k)} · ${zeitText(zeit)}`, sperre: ersteSperre(ziel ? ZIELE_OFFEN : null, geldSperre(sp, k)) })));
  }

  private haus(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, D = KATALOG[o.typ], n = sp.netz;
    const warm = n.warm.has(o.id), an = n.anschluss.has(o.id);
    const chips = h('div', { class: 'chips' });
    if (o.gekuendigt) chips.append(chip('hat gekündigt', 'rot'));
    else if (!an) chips.append(chip('heizt mit Öl', 'rot'));
    else if (o.ohne_station) chips.append(chip('Übergabestation fehlt', 'rot'));
    else if (n.kalt.get(o.id) === 'station') chips.append(chip('Station zu klein', 'rot'));
    else if (n.kalt.get(o.id) === 'leitung') chips.append(chip('Leitung zu dünn', 'rot'));
    else if (!warm) chips.append(chip('kalt', 'blau'));
    else chips.append(chip('warm', 'gruen'));
    c.append(chips);
    const st = stationHolen(o.station);
    const vlh = o.hauspuffer ? VOLLLASTSTUNDEN.mit_puffer_h : VOLLLASTSTUNDEN.ohne_puffer_h;
    c.append(zeile('Jahresverbrauch', `${zahl((D.verbrauch_kwh_a ?? 0) * nutzungsfaktor(o))} kWh`), zeile('Anschlussleistung', `${kw(bedarfKw(o))} kW (÷ ${zahl(vlh)} h)`), ...stationZeilen(st, o));
    const anfrage = anfrageKasten(sp, o, () => this.ui.geaendert());
    if (anfrage) c.append(anfrage);
    if (istKunde(o) && an) this.rechnungBereich(c, o); // A81: nur angeschlossene Kunden bekommen eine Rechnung
    if (o.anfrage) chips.append(h('span', { class: 'chip gold' }, 'fragt an'));
    if (o.interessent) chips.append(chip('möchte anschließen', 'blau'));
    if (o.vollversorgung) chips.append(chip('Kamin aus', 'gruen'));
    if (o.aufgestockt) chips.append(chip('aufgestockt', 'blau'));
    const z = o.zufriedenheit_pct ?? 80;
    const zufriedenheit = balken(z / 100);
    zufriedenheit.setAttribute('data-live', 'zufriedenheit-balken');
    c.append(zeile('Zufriedenheit', h('span', { 'data-live': 'zufriedenheit' }, `${zahl(z)} %`)), zufriedenheit);
    if (o.gekuendigt) {
      c.append(h('p', {}, 'Der Kunde ist wieder bei seinem Öl-Kessel. Mit einem fairen Preis und guter Wärme kommt er zurück.'),
        h('div', { class: 'knopfreihe' }, knopf('Zurückgewinnen', () => { sp.zurueckgewinnen(o.id); this.ui.geaendert(); }, 'geld', { unter: eur(KONSTANTEN.zurueckgewinnen_eur) })));
      return;
    }
    if (!an) c.append(h('p', {}, 'Heizt noch mit Öl. Leg eine Leitung von der Heizzentrale bis an das Haus und kaufe danach eine passende Übergabestation.'), ...this.anschlussWeg(o));
    else if (n.kalt.get(o.id) === 'leitung') c.append(h('p', {}, eigenerAnschlussZuDuenn(n, o)
      ? 'Sein Hausanschluss ist zu dünn für dieses Haus. Ersetze ihn durch eine dickere Leitung – das Haus bekommt seine Wärme nur über diesen Anschluss.'
      : 'Angeschlossen, aber eine Leitung auf dem Weg ist zu dünn. Ersetze sie durch eine dickere Leitung.'));
    else if (!warm) c.append(h('p', {}, 'Angeschlossen, aber es kommt zu wenig Wärme an. Baue eine weitere Wärmequelle oder erhöhe die Leistung.'));
    if (o.ohne_station || o.station) this.stationswahl(c, o);
    this.upgradeBereich(c, o);
    this.ausbauKnopf(c, o);
    c.append(h('p', { class: 'gedaempft' }, 'Gebäude stehen fest. Wer näher am Netz liegt, hat es leichter – wer weit weg ist, braucht eine lange Leitung.'));
  }

  /** A92 (NR16): Knöpfe zum Anschließen eines Hauses ohne Anschluss. Ohne offenen Bauabschnitt ist „Leitung selbst legen“ gesperrt und nennt den Grund;
   *  gibt es noch gar keinen Abschnitt, lässt er sich hier gleich planen (dieselbe Aktion und derselbe Preis wie im Baumenü). */
  private anschlussWeg(o: Objekt): HTMLElement[] {
    const sp = this.ui.spiel, kurz = abschnittSperreKurz(sp, () => this.ui.jetzt_ms());
    // DESIGN 12.22: Ohne Abschnitt steht der Philipp-Knopf direkt darüber – der Hinweis zeigt dorthin statt ins Baumenü.
    const sperre = kurz && !sp.abschnitt ? { ...kurz, hinweis: OHNE_ABSCHNITT_HINWEIS_HAUS } : kurz;
    const reihen: HTMLElement[] = [];
    if (!sp.abschnitt) {
      const preis = KONSTANTEN.abschnitt_planung_eur;
      reihen.push(h('div', { class: 'knopfreihe' }, knopf(`${ABSCHNITT_HELFER.planung}: Bauabschnitt planen lassen`, () => { sp.abschnittPlanen(); this.ui.geaendert(); }, 'geld', { klein: true, unter: eur(preis), sperre: geldSperre(sp, preis) })));
    }
    // NR18: Keine automatische Wegsuche – der Spieler zeichnet die Leitung selbst bis ans Haus.
    reihen.push(h('div', { class: 'knopfreihe' }, sp.hausanschlussGeplant(o.id)
      ? knopf('Hausanschluss geplant', () => undefined, '', { klein: true, sperre: ANSCHLUSS_GEPLANT })
      : knopf('Leitung selbst legen', () => this.ui.stempeln('d25'), '', { klein: true, sperre })));
    return reihen;
  }

  /** A33: Hausupgrades senken die nötige Vorlauftemperatur (Rücklauf). */
  /** A81: Wärmerechnung des Kunden – Jahresverbrauch, Wärmepreis, Grundgebühr, Zähler im laufenden Monat. */
  private rechnungBereich(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, m = sp.monat(), ct = PREISSTUFEN[sp.stand.preisstufe].ct_je_kwh;
    const k = kasten('Wärmerechnung');
    const jahr_eur = sp.jahresverbrauch_kwh(o) * ct / 100 + 12 * sp.grundgebuehr_eur;
    k.append(zeile('Wärmepreis', `${zahl(ct)} ct/kWh`), zeile('Grundgebühr', `${eur(sp.grundgebuehr_eur)} im Monat`),
      zeile(`${sp.monatsname(m.nr)} bisher`, h('span', { 'data-live': 'zaehler' }, `${zahl(o.zaehler_kwh ?? 0)} kWh`)),
      zeile(`Rechnung ${sp.monatsname(m.nr)} (erwartet)`, h('span', { 'data-live': 'monatsbetrag' }, eur(sp.monatsbetrag_eur(o, m.nr)))),
      h('p', { class: 'gedaempft' }, `Im Jahr etwa ${eur(jahr_eur)}. Im Winter wird mehr geheizt als im Sommer – die Rechnung schwankt. Im Spiel wird jeden Monat abgerechnet, der Kunde zahlt automatisch (in echt meist Abschlag plus Jahresabrechnung).`));
    c.append(k);
  }
  private upgradeBereich(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, n = o.upgrade ?? 0, mind = sp.mindestVorlauf_c(o);
    const k = kasten('Rücklauf und Heizflächen');
    // A88: Ein laufender Auftrag läuft zu Ende und wird gezeigt; sonst gesperrt = deaktivierter Knopf mit Grund, kein Erklärtext
    const sperre = sp.sperrgrund('ruecklauf_helfer');
    if (sperre && !o.upgrade_auftrag && n < UPGRADES.length) {
      k.append(h('div', { class: 'knopfreihe' }, knopf('Helfer beauftragen', () => undefined, '', { klein: true, sperre: stufenSperre(sp, 'ruecklauf_helfer') })));
      c.append(k);
      return;
    }
    k.append(zeile('Braucht mindestens', `${mind} °C Vorlauf`), h('p', { class: 'gedaempft' }, `Die Heizzentrale fährt gerade ${sp.vorlauf_c} °C.${mind > sp.vorlauf_c ? ' Das ist diesem Haus zu kalt – die Zufriedenheit sinkt.' : ''}`));
    if (o.upgrade_auftrag) {
      const u = UPGRADES[n], rest = Math.max(0, o.upgrade_auftrag.ende_ms - this.ui.jetzt_ms());
      k.append(h('p', {}, `${o.upgrade_auftrag.helfer} arbeitet an: ${u.name} · noch `, h('span', { 'data-live': 'hausupgrade-rest' }, zeitText(Math.ceil(rest / 1000)))));
    } else if (n < UPGRADES.length) {
      const u = UPGRADES[n], frei = sp.freierHelfer();
      // DESIGN.md 12.20 H3 vor H4: Sind alle Helfer beschäftigt, nennt der Knopf das zuerst (so legt es tests/a92-sperrtexte H3 fest)
      // Fachprüfung A73: tatsächlicher Spreizungsgewinn beim aktuellen Vorlauf (Rücklauf nie unter 40 °C)
      const gewinn = Math.round(spreizungHaus_k({ ...o, upgrade: n + 1 }, sp.vorlauf_c) - spreizungHaus_k(o, sp.vorlauf_c));
      if (gewinn < u.senkung_k) k.append(h('p', { class: 'gedaempft' }, gewinn > 0 ? `Bei ${sp.vorlauf_c} °C Vorlauf bringt das nur +${gewinn} K Spreizung: Der Rücklauf fällt nicht unter ${MIN_RUECKLAUF_C} °C. Das Haus braucht danach aber ${u.senkung_k} K weniger Vorlauf.` : `Der Rücklauf liegt bei ${sp.vorlauf_c} °C Vorlauf schon bei ${MIN_RUECKLAUF_C} °C – mehr Spreizung geht nicht. Das Haus braucht danach aber ${u.senkung_k} K weniger Vorlauf.`));
      k.append(h('p', { class: 'gedaempft' }, u.beschreibung), h('div', { class: 'knopfreihe' }, knopf(frei ? `${frei} beauftragen · ${gewinn > 0 ? `Spreizung +${gewinn} K` : 'weniger Vorlauf nötig'}` : 'Alle Helfer beschäftigt', () => { sp.upgradeKaufen(o.id); this.ui.geaendert(); }, 'geld', { klein: true, unter: `${eur(u.kosten_eur)} · ${zeitText(u.dauer_s * KONSTANTEN.bauzeit_faktor)}`, id: 'helfer', neuAufbau: () => this.ui.geaendert(),
        // 12.21 Punkt 2/3: Rangfolge beschäftigt › ohne Station › Geld (H7), beim Tippen neu gelesen
        sperre: () => ersteSperre(helferSperre(() => this.naechsterHelferFrei_ms(), () => this.ui.jetzt_ms()), o.ohne_station ? OHNE_STATION : null, geldSperre(sp, u.kosten_eur)) })));
    } else k.append(h('p', { class: 'gedaempft' }, 'Alle Upgrades erledigt.'));
    c.append(k);
  }

  /** Frühestes Auftragsende der Helfer (12.20 H3) oder `null`, wenn einer frei ist. */
  private naechsterHelferFrei_ms(): number | null {
    const sp = this.ui.spiel;
    if (sp.freierHelfer()) return null;
    return Math.min(...HELFER.map((name) => sp.helferFreiAb_ms(name)));
  }

  /** A32/NR19: Auswahl der Übergabestation – Reihe „Mit Pufferspeicher“ (nur Häuser, nur beim Anschluss) und die Wandstationen wie bisher;
   *  nur Typen, die den Bedarf schaffen, die kleinste passende je Reihe ist empfohlen. */
  private stationswahl(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, bedarf = bedarfKw(o), alt = stationHolen(o.station);
    // NR19 (Review P6, Weg a): Mit Puffer-Station gibt es Wandstationen erst, wenn keine Puffer-Station mehr reicht; dann fällt der
    // Puffer weg und die Wandstation braucht die Leistung ohne Puffer (1.500 h).
    const pufferAlt = istPufferStation(alt), pufferWeg = pufferAlt && !pufferStationReicht(o);
    const wandObjekt = pufferWeg ? { ...o, hauspuffer: false } : o, wandBedarf = bedarfKw(wandObjekt);
    const empfohlen = passendeStation(wandBedarf).id;
    const frei = sp.freigeschaltet('stationstypen');
    const k = kasten(alt ? 'Übergabestation tauschen' : 'Übergabestation wählen');
    k.setAttribute('data-ziel', 'kasten_station');
    // AE-NR13-7: Im Tutorial lehnt der Kern Wandstationen ab – die Reihe zeigt das vorab (12.19)
    const wandSperre: Sperre | null = sp.wandstationFrei() ? null : { grund: 'später wählbar', schloss: true, hinweis: WANDSTATION_TUTORIAL };
    k.append(h('p', { class: 'gedaempft' }, alt
      ? `Aktuell: ${istPufferStation(alt) ? pufferKurzname(alt) : alt.name} (${alt.leistung_kw}\u00a0kW), das Gebäude braucht ${kw(bedarf)}\u00a0kW. Fragt der Kunde nach mehr Wärme und du stimmst zu, steigt der Bedarf – dann brauchst du eine größere Station. Die alte wird zu ${Math.round(KONSTANTEN.rueckkauf_anteil * 100)}\u00a0% zurückgekauft.`
      : `Das Gebäude braucht ${kw(bedarf)} kW.${frei ? ' Eine größere Station kostet mehr, hat aber Reserve für einen späteren Anbau.' : ''}`));
    const zuKlein = !!alt && !stationReicht(alt, o);
    if (zuKlein) k.append(chip('Station zu klein', 'rot'));
    const groesser = (st: Station): boolean => !alt || st.leistung_kw > alt.leistung_kw;
    const pufferReihe = this.pufferKnoepfe(o, frei, !alt || zuKlein, groesser);
    const wand: HTMLButtonElement[] = [];
    // A88: Ohne freie Stationswahl gibt es nur die kleinste passende Station – so bleibt jedes Haus versorgbar.
    const wandErlaubt = !pufferAlt || pufferWeg;
    if (wandErlaubt && !frei && (!alt || zuKlein)) {
      const st = passendeStation(wandBedarf);
      wand.push(knopf(alt ? 'Größere Station einbauen' : 'Station einbauen', () => { sp.stationKaufen(o.id, st.id); this.ui.geaendert(); }, 'geld', { klein: true, unter: `${st.name} · ${eur(sp.stationspreis_eur(o, st))}`, sperre: wandSperre }));
    }
    if (wandErlaubt && frei) for (const st of STATIONEN.filter((x) => stationReicht(x, wandObjekt) && groesser(x)).slice(0, 3)) {
      const preis = sp.stationspreis_eur(o, st);
      wand.push(knopf(wandKnopfName(st), () => { sp.stationKaufen(o.id, st.id); this.ui.geaendert(); }, st.id === empfohlen ? 'geld' : '', { klein: true, unter: eur(preis), sperre: wandSperre }));
    }
    const kwh = (KATALOG[o.typ].verbrauch_kwh_a ?? 0) * nutzungsfaktor(o);
    const ohnePuffer = (): HTMLParagraphElement => h('p', { class: 'gedaempft' }, `Ohne Puffer: ${zahl(kwh)}\u00a0kWh ÷ ${zahl(VOLLLASTSTUNDEN.ohne_puffer_h)}\u00a0h = ${kw(bedarfKw({ ...o, hauspuffer: false }))}\u00a0kW – das Netz muss die Spitze liefern.`);
    if (pufferReihe) {
      k.append(zwischenueberschrift('Mit Pufferspeicher'));
      if (!alt) k.append(h('p', { class: 'gedaempft' }, `Mit Puffer: ${zahl(kwh)}\u00a0kWh ÷ ${zahl(VOLLLASTSTUNDEN.mit_puffer_h)}\u00a0h = ${kw(bedarfKw({ ...o, hauspuffer: true }))}\u00a0kW aus dem Netz. Der Speicher fängt die Spitze ab.`));
      k.append(pufferReihe);
      // Ein altes Haus mit Puffer (mit Wandstation oder noch ohne Station) behält seinen Puffer auch mit einer neuen Wandstation –
      // deshalb dort keine Rechnung „ohne Puffer“.
      if (wand.length) k.append(zwischenueberschrift(o.hauspuffer ? 'Wandstation' : 'Wandstation ohne Puffer'));
      if (!alt && !o.hauspuffer) k.append(ohnePuffer());
    } else if (pufferWeg) {
      k.append(zwischenueberschrift('Wandstation ohne Puffer'), h('p', { class: 'gedaempft' }, 'Keine Puffer-Station reicht mehr. Mit der Wandstation fällt der Puffer weg.'), ohnePuffer());
    }
    k.append(h('div', { class: 'knopfreihe' }, ...wand));
    if (pufferReihe && !alt) k.append(h('p', { class: 'gedaempft' }, 'Den Puffer wählst du nur beim Anschluss.'));
    c.append(k);
  }

  /** NR19: Knöpfe der Reihe „Mit Pufferspeicher“ – ohne freie Stationswahl die kleinste passende, sonst höchstens zwei; `null` = keine Reihe.
   *  Zeile 2 nennt die Leistung aus dem Netz (mit Puffer) und den Preis – kurz „vom Netz“, weil Zeile 2 höchstens 28 Zeichen hat (DESIGN 12.20); fehlt Geld, bleibt der Preis stehen und der Hinweis nennt den Fehlbetrag. */
  private pufferKnoepfe(o: Objekt, frei: boolean, noetig: boolean, groesser: (st: Station) => boolean): HTMLDivElement | null {
    const sp = this.ui.spiel;
    if (KATALOG[o.typ].kategorie !== 'haus' || (o.station && !o.hauspuffer)) return null;
    const mit = { ...o, hauspuffer: true }, netz_kw = bedarfKw(mit);
    const empfohlen = passendePufferStation(netz_kw, bedarfKw({ ...o, hauspuffer: false }));
    const wahl = frei
      ? PUFFER_STATIONEN.filter((st) => stationReicht(st, mit) && groesser(st)).slice(0, 2)
      : noetig && empfohlen && groesser(empfohlen) ? [empfohlen] : [];
    if (!wahl.length) return null;
    return h('div', { class: 'knopfreihe' }, ...wahl.map((st) => {
      const preis = sp.stationspreis_eur(o, st);
      const k = knopf(pufferKurzname(st), () => { sp.stationKaufen(o.id, st.id); this.ui.geaendert(); }, st.id === empfohlen?.id ? 'geld' : '',
        { klein: true, unter: `${kw(netz_kw)}\u00a0kW\u00a0vom\u00a0Netz\u00a0· ${eurGebunden(preis)}`, sperre: geldSperre(sp, preis) });
      if (st.id === empfohlen?.id) k.setAttribute('data-ziel', 'puffer_knopf');
      return k;
    }));
  }

  private gross(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, D = KATALOG[o.typ], n = sp.netz;
    if (o.zustand !== 'vertrag') {
      const b = sp.vertragBedingungen(o);
      const kasten_ = kasten('Bedingungen für den Vertrag');
      if (b.ok) kasten_.append(h('p', {}, 'Alles erfüllt – du kannst unterschreiben.'));
      else for (const f of b.fehlt) kasten_.append(zeile(chip('fehlt', 'rot'), f));
      c.append(kasten_);
      // A88: kleinste freigeschaltete Leitung, die den Bedarf (beim Sägewerk die Abwärme) trägt – der Kern entscheidet
      const leitung = sp.passendeLeitung(Math.max(bedarfKw(o), D.abwaerme_kw ?? 0));
      // A92: Leitungen entstehen nur im offenen Bauabschnitt – ohne ihn gesperrt wie „Leitung selbst legen“ am Haus
      if (o.typ === 'gewerbe' && !n.anschluss.has(o.id)) c.append(this.saegewerkAnschluss(o));
      else if (!n.anschluss.has(o.id)) c.append(h('p', {}, 'Noch nicht angeschlossen. Großabnehmer brauchen eine Leitung, die genug Wärme schafft.'), leitung ? h('div', { class: 'knopfreihe' }, knopf(`${KATALOG[leitung].name} legen`, () => this.ui.stempeln(leitung), 'los', { sperre: abschnittSperre(sp, () => this.ui.jetzt_ms()) })) : '');
      c.append(h('div', { class: 'knopfreihe' }, knopf('Vertrag unterschreiben', () => { sp.vertragUnterschreiben(o.id); this.ui.geaendert(); }, 'los', { sperre: vertragSperre(b.fehlt, () => sp.vertragBedingungen(o).fehlt) })));
      return;
    }
    c.append(h('div', { class: 'chips' }, chip('Vertrag läuft', 'gruen'), chip(n.anschluss.has(o.id) ? (n.warm.has(o.id) || o.typ === 'gewerbe' ? 'angeschlossen' : 'kalt') : 'nicht angeschlossen', n.anschluss.has(o.id) ? '' : 'rot')));
    if (o.typ === 'gewerbe' && !n.anschluss.has(o.id)) c.append(this.saegewerkAnschluss(o));
    if (D.bedarf_kw && (o.ohne_station || n.kalt.get(o.id) === 'station')) this.stationswahl(c, o);
    if (D.bedarf_kw) c.append(zeile('Jahresverbrauch', `${zahl(D.verbrauch_kwh_a ?? 0)} kWh`), zeile('Anschlussleistung', `${kw(bedarfKw(o))} kW`));
    if (istKunde(o) && sp.netz.anschluss.has(o.id)) this.rechnungBereich(c, o);
    if (D.abwaerme_kw && n.anschluss.has(o.id)) c.append(zeile('Abwärme ins Netz', `bis ${D.abwaerme_kw} kW`));
  }

  private saegewerkAnschluss(o: Objekt): HTMLElement {
    const sp = this.ui.spiel;
    const { rohr, uebergang } = sp.saegewerkTrasse(o);
    const k = kasten('Netzanschluss');
    if (uebergang) {
      const { von, nach, kosten } = uebergang;
      k.append(h('p', {}, `Die Leitung liegt. Der Übergang bei (${von.x}|${von.y}) zum bestehenden Wärmenetz ist noch nicht verbunden.`),
        knopf('Mit Wärmenetz verbinden', () => {
          sp.trassenUmschalten(von.id, nach.id);
          this.ui.geaendert();
        }, 'los', { unter: kosten ? eur(kosten) : undefined, sperre: kosten ? geldSperre(sp, kosten) : null }));
      return k;
    }
    if (rohr) {
      k.append(h('p', {}, rohr.geplant
        ? 'Ein Rohr ist bis ans Sägewerk eingezeichnet. Schließe den Bauabschnitt ab, bestelle Material und warte, bis die Leitung gebaut ist.'
        : 'Ein Rohr liegt am Sägewerk. Folge der Trasse bis zur Heizzentrale und verbinde offene Übergänge im Rohrmenü. Fehlende Rohrfelder kannst du im Bauabschnitt ergänzen.'),
        knopf('Leitung am Sägewerk anzeigen', () => this.ui.kontext(rohr.id)));
      if (rohr.geplant) return k;
    } else {
      k.append(h('p', {}, 'Am Sägewerk fehlt ein Rohr direkt an der Gebäudekante. Zieh die Leitung bis an eine der vier Seiten.'));
    }
    const leitung = sp.passendeLeitung(KATALOG.gewerbe.abwaerme_kw!);
    if (!sp.abschnitt) {
      const preis = KONSTANTEN.abschnitt_planung_eur;
      k.append(knopf(`${ABSCHNITT_HELFER.planung}: Bauabschnitt planen lassen`, () => {
        sp.abschnittPlanen();
        this.ui.geaendert();
      }, 'geld', { unter: eur(preis), sperre: geldSperre(sp, preis) }));
    }
    if (leitung) k.append(knopf(`${KATALOG[leitung].name} legen`, () => this.ui.stempeln(leitung), 'los',
      { sperre: abschnittSperre(sp, () => this.ui.jetzt_ms()) }));
    return k;
  }

  private aussenquelle(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, D = KATALOG[o.typ], n = sp.netz;
    c.append(h('div', { class: 'chips' }, chip(n.anschluss.has(o.id) ? 'angeschlossen' : 'nicht angeschlossen', n.anschluss.has(o.id) ? 'gruen' : 'rot')));
    if (D.leistung_kw) c.append(zeile('Wärmeleistung', `${D.leistung_kw[o.stufe - 1]} kW`));
    if (D.strom_kw) c.append(zeile('Spitzenleistung Strom', `${D.strom_kw[o.stufe - 1]} kW`));
    const stromQuelle = !!D.strom_kw && !D.leistung_kw;
    const leitung = sp.passendeLeitung(D.leistung_kw?.[o.stufe - 1] ?? 0); // A88: freigeschaltet und passend zur Leistung
    if (!n.anschluss.has(o.id)) c.append(h('p', {}, stromQuelle ? 'Der Sonnenstrom muss über eine Verbindung zur Heizzentrale gelangen, sonst spart er dort nichts.' : 'Ohne Leitung zur Heizzentrale fließt keine Wärme ins Netz.'), leitung ? h('div', { class: 'knopfreihe' }, knopf(stromQuelle ? 'Verbindung legen' : 'Leitung legen', () => this.ui.stempeln(leitung), 'los')) : '');
    this.ausbauKnopf(c, o);
    c.append(h('div', { class: 'knopfreihe' }, knopf('Verschieben', () => this.ui.verschieben(o.id), '', { klein: true }),
      knopf('Verkaufen', () => { sp.verkaufen(o.id); this.ui.geaendert(); this.ui.kontext(null); }, '', { klein: true, unter: `+${eur(sp.rueckkauf_eur(o.typ, o.stufe))}`, aus: !!o.bau })));
  }

  private leitung(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, n = sp.netz, D = KATALOG[o.typ], key = o.y * KONSTANTEN.feldanzahl + o.x;
    const last = n.last_kw.get(key) ?? 0, kap = Math.round((D.kapazitaet_kw ?? 0) * n.spreizung_faktor);
    // Hauptleitung bis zum letzten Abzweig, danach Hausanschluss: Ab dem Abknick zum einzelnen Haus darf das Rohr kleiner sein.
    const kinder = new Map<number, number[]>();
    for (const [k, p] of n.eltern) if (p >= 0) kinder.set(p, [...(kinder.get(p) ?? []), k]);
    let ende = key, verzweigt = false;
    for (let kd = kinder.get(ende) ?? []; kd.length > 0; kd = kinder.get(ende) ?? []) { if (kd.length > 1) { verzweigt = true; break; } ende = kd[0]; }
    const ex = ende % KONSTANTEN.feldanzahl, ey = Math.floor(ende / KONSTANTEN.feldanzahl);
    const haeuser = sp.stand.objekte.filter((k) => {
      if (!['haus', 'gross'].includes(KATALOG[k.typ].kategorie)) return false;
      const g = groesse(k);
      return ex >= k.x - 1 && ex <= k.x + g && ey >= k.y - 1 && ey <= k.y + g && !(ex >= k.x && ex < k.x + g && ey >= k.y && ey < k.y + g);
    });
    const anHaus = !verzweigt && haeuser.length === 1;
    c.append(h('p', { class: 'gedaempft' }, anHaus ? 'Hausanschlussleitung: ab dem Abzweig zum einzelnen Haus, hier darf das Rohr dünner sein.' : 'Hauptleitung: versorgt weiter hinten mehrere Häuser. Entscheidend ist, ob ihre Kapazität für die benötigte Wärme ausreicht.'));
    c.append(zeile('Last', `${zahl(last)} / ${kap} kW`), balken(kap ? last / kap : 0));
    // Fachprüfung A73: Unter 1 liegt der Faktor, wenn der Vorlauf so niedrig ist, dass bis 40 °C Rücklauf wenig Spreizung bleibt.
    if (n.spreizung_faktor > 1.01) c.append(h('p', { class: 'gedaempft' }, `Bei der Spreizung deines Netzes (kälterer Rücklauf) schafft die Leitung ${Math.round((n.spreizung_faktor - 1) * 100)} % mehr als nominal.`));
    else if (n.spreizung_faktor < 0.99) c.append(h('p', { class: 'gedaempft' }, `Der Vorlauf ist so niedrig, dass bis zum Rücklauf (mindestens ${MIN_RUECKLAUF_C} °C) wenig Spreizung bleibt – die Leitung schafft ${Math.round((1 - n.spreizung_faktor) * 100)} % weniger als nominal.`));
    if (n.tiefe.has(key) && n.kapazitaet_ok.get(key) === false) c.append(kasten('Überlastet', h('p', {}, 'Durch diese Stelle soll mehr Wärme fließen, als die Leitung schafft. Tausche sie gegen eine dickere.')));
    else if (o.geplant) c.append(h('p', {}, `Geplante Leitung: Sie ist Teil des Bauabschnitts und kostet erst mit der Materialbestellung${sp.freigeschaltet('gestattung') ? ' (abseits der Straße samt Gestattung)' : ''}. Zählt noch nicht fürs Netz.`));
    else if (!n.tiefe.has(key)) c.append(h('p', {}, 'Diese Leitung ist noch nicht mit der Heizzentrale verbunden.'));
    // A69: T-Stück mit Vorsehung (verschlossener Abgang für einen späteren Anschluss)
    if (o.vorsehung) c.append(h('p', {}, o.geplant
      ? `T-Stück mit Vorsehung geplant (${eur(KONSTANTEN.vorsehung_eur)}): Hier kann später ein Anschluss andocken, ohne die laufende Leitung anzubohren. Die Leitung darf hier auch dünner werden.`
      : 'T-Stück mit Vorsehung: Ein späterer Anschluss dockt hier ohne Anbohrung an – die Leitung läuft dabei weiter.'));
    else if (!o.geplant && n.tiefe.has(key) && sp.freigeschaltet('vorsehung')) c.append(h('p', { class: 'gedaempft' }, `Ohne Vorsehung muss für einen neuen Abzweig die laufende Leitung angebohrt werden (${eur(KONSTANTEN.anbohrung_eur)}). Am Leitungsende geht es ohne.`));
    // A88: Eine gesetzte Vorsehung lässt sich immer wegnehmen; neu setzen erst, wenn die Vorsehung freigeschaltet ist.
    const sperreVorsehung = o.vorsehung ? null : sp.sperrgrund('vorsehung');
    if (o.geplant && sp.abschnitt?.phase === 'offen') c.append(h('div', { class: 'knopfreihe' }, knopf(o.vorsehung ? 'Vorsehung entfernen' : 'T-Stück mit Vorsehung setzen', () => { sp.vorsehungUmschalten(o.id); this.ui.geaendert(); }, o.vorsehung ? '' : 'geld', { klein: true, schloss: true, aus: sperreVorsehung !== null, hinweis: tStueckHinweis(), unter: sperreVorsehung ?? (o.vorsehung ? `−${eur(KONSTANTEN.vorsehung_eur)}` : `+${eur(KONSTANTEN.vorsehung_eur)}`) })));
    const uebergaenge = sp.trassenNachbarn(o);
    if (uebergaenge.length) {
      const k = kasten('Trassen verbinden');
      for (const { nachbar, verbunden, kosten } of uebergaenge) {
        const richtung = nachbar.x > o.x ? 'Osten' : nachbar.x < o.x ? 'Westen' : nachbar.y > o.y ? 'Süden' : 'Norden';
        k.append(knopf(verbunden ? `Verbindung nach ${richtung} zurücknehmen` : `Nach ${richtung} verbinden`, () => {
          sp.trassenUmschalten(o.id, nachbar.id); this.ui.geaendert();
        }, 'los', { unter: kosten ? eur(kosten) : `${KATALOG[nachbar.typ].name} · Feld ${nachbar.x}|${nachbar.y}`, sperre: kosten ? geldSperre(sp, kosten) : null }));
      }
      c.append(k);
    }
    if (!o.geplant) this.ersatzBereich(c, o);
    c.append(h('div', { class: 'knopfreihe' }, knopf('Entfernen', () => { sp.entfernen(o.id); this.ui.geaendert(); this.schliessen(); }, '', { klein: true })));
  }

  /** NR18: Eine gebaute Leitung wird nur im offenen Bauabschnitt dicker (bezahlt mit der Materialbestellung, getauscht beim
   *  Bauende). Außerhalb zeigt ein gesperrter Knopf „Dickere Leitung“, woran es hängt. */
  private ersatzBereich(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, offen = sp.abschnitt?.phase === 'offen';
    if (o.ersatz) {
      c.append(h('p', {}, `Wird im Bauabschnitt durch eine ${kurzname(o.ersatz.typ)} ersetzt.`));
      if (offen) c.append(h('div', { class: 'knopfreihe' }, knopf('Ersatz zurücknehmen', () => { sp.geplanteLeitungEntfernen(o.x, o.y); this.ui.geaendert(); }, '', { klein: true })));
      return;
    }
    if (offen) {
      // E1: Neupreis minus 50 % des Altpreises; im Fluss kommt die Spülbohrung dazu (Bauplan NR18 5.1)
      const preis = (t: TypId): number => KATALOG[t].kosten_eur![0] - sp.rueckkauf_eur(o.typ, 1) + (sp.istFluss(o.x, o.y) ? KONSTANTEN.bohrung_eur_je_feld : 0);
      const ersatz = leitungsKnoepfe(sp, o.typ, (t) => knopf(`Ersetzen: ${kurzname(t)}`, () => { sp.ersatzPlanen(o.id, t); this.ui.geaendert(); }, 'geld', { unter: eur(preis(t)), klein: true }), false, true);
      if (ersatz.length) c.append(h('div', { class: 'knopfreihe' }, ...ersatz));
    } else if (LEITUNGEN.indexOf(o.typ) < LEITUNGEN.length - 1) {
      c.append(h('div', { class: 'knopfreihe' }, knopf('Dickere Leitung', () => undefined, '', { klein: true, sperre: abschnittSperreKurz(sp, () => this.ui.jetzt_ms()) })));
    }
  }

  private heizzentrale(c: HTMLElement, o: Objekt): void {
    const hzObj = o;
    const sp = this.ui.spiel, s = sp.stand, plaetze = KATALOG.hz.plaetze![sp.hzStufe - 1];
    const k = kasten(`Im Heizhaus · ${s.innen.length}/${plaetze} Plätze`);
    s.innen.forEach((q, i) => {
      const D = KATALOG[q.typ];
      const leistung = D.leistung_kw![q.stufe - 1];
      const verkauf = !q.bau && (!s.tutorial || s.innen.length > 1)
        ? knopf('Verkaufen', () => { sp.innenVerkaufen(i); this.ui.geaendert(); }, '', { klein: true, unter: `+${eur(sp.innenRueckkauf_eur(q))}` }) : null;
      k.append(zeile(`${D.name} · ${leistung} kW`, q.bau ? 'wird eingebaut …' : verkauf ?? ''));
    });
    if (s.innen.length === 1 && !s.tutorial) k.append(h('p', { class: 'gedaempft' }, 'Beim Verkauf der letzten Anlage fällt ihre Wärmeleistung weg, bis Ersatz läuft.'));
    if (s.innen.length < plaetze) k.append(h('div', { class: 'knopfreihe' }, knopf('Wärmeerzeuger kaufen', () => this.ui.katalog('innen'), 'los')));
    else k.append(h('p', { class: 'gedaempft' }, 'Kein Platz mehr im Heizhaus – baue erst die Heizzentrale aus.'));
    const sperreVorlauf = sp.sperrgrund('vorlauf'); // A88: gesperrt = Stepper deaktiviert, Grund darunter
    // DESIGN.md 12.20 R1/R2: Die Stufe geht vor dem Rand des Reglers (Regel 4)
    const vlStufe = sperreVorlauf ? stufenHinweis('vorlauf', `Den ${merkmalName('vorlauf')}`) : null;
    const vlMinus = vlStufe ?? (sp.vorlauf_c <= VORLAUF.min_c ? RAND.vorlaufMin : undefined);
    const vlPlus = vlStufe ?? (sp.vorlauf_c >= VORLAUF.max_c ? RAND.vorlaufMax : undefined);
    const vl = kasten(`Vorlauftemperatur · ${sp.vorlauf_c} °C`);
    vl.append(h('div', { class: 'knopfreihe' },
      stepper('minus', 'Vorlauftemperatur senken', () => { sp.vorlaufSetzen(sp.vorlauf_c - VORLAUF.schritt_c); this.ui.geaendert(); }, vlMinus !== undefined, vlMinus),
      h('span', { class: 'preiswert' }, `${sp.vorlauf_c} °C`),
      stepper('plus', 'Vorlauftemperatur erhöhen', () => { sp.vorlaufSetzen(sp.vorlauf_c + VORLAUF.schritt_c); this.ui.geaendert(); }, vlPlus !== undefined, vlPlus)),
      sperreVorlauf ? sperrHinweis(`${merkmalName('vorlauf')} ${sperreVorlauf}`) : h('p', { class: 'gedaempft' }, 'Niedrigere Vorlauftemperatur spart Strom und Verluste. Schlecht gedämmte Häuser werden dann aber nicht mehr richtig warm und unzufrieden. Mit Hausupgrades kommen sie mit weniger aus.'));
    const pvk = kasten('Solarstrom');
    const pvKw = sp.dachPvLeistung_kw();
    if (hzObj.dach_pv) pvk.append(h('p', {}, `PV-Anlage auf dem Heizhaus-Dach: ${pvKw} kWp. Sie senkt die Stromkosten von Wärmepumpe und Power-to-Heat-Kessel, Überschuss wird ins Stromnetz eingespeist.`));
    else pvk.append(h('p', { class: 'gedaempft' }, 'PV auf dem Dach der Heizzentrale liefert Strom für Wärmepumpe und Power-to-Heat. Überschuss wird vergütet. Die Anlage wächst mit der Heizzentrale.'), h('div', { class: 'knopfreihe' }, knopf(`PV aufs Dach · ${pvKw} kWp`, () => { sp.dachPvKaufen(); this.ui.geaendert(); }, 'geld', { klein: true, unter: eur(pvKw * DACH_PV.eur_je_kw), sperre: ersteSperre(stufenSperre(sp, 'dach_pv'), geldSperre(sp, pvKw * DACH_PV.eur_je_kw)) })));
    const bg = kasten('Baugebiet');
    const bb = sp.baugebietBedingungen(), sperreBg = sp.sperrgrund('baugebiet');
    if (sp.stand.baugebiet) bg.append(h('p', { class: 'gedaempft' }, 'Das Baugebiet ist erschlossen. Verbinde die neuen Häuser mit einem Bauabschnitt.'));
    else bg.append(h('p', { class: 'gedaempft' }, 'Ein zweiter Strang in die Gegenrichtung mit neuen Grundstücken. Der Wärmeerzeuger muss dafür mitwachsen.'),
      ...(bb.ok || sperreBg ? [] : [h('p', {}, `Fehlt noch: ${bb.fehlt.join(', ')}`)]),
      h('div', { class: 'knopfreihe' }, knopf('Baugebiet erschließen', () => { sp.baugebietErschliessen(); this.ui.geaendert(); }, 'geld', { klein: true, unter: eur(KONSTANTEN.baugebiet_eur), sperre: ersteSperre(stufenSperre(sp, 'baugebiet'), baugebietSperre(sp.versorgteHaeuser()), geldSperre(sp, KONSTANTEN.baugebiet_eur)) })));
    if (sp.stand.neubaugebiet) {
      const neu = kasten('Neubaugebiet Süd');
      neu.append(h('p', {}, 'Vier Straßen erschließen die Häuserblöcke. Führe die Haupttrasse nach Süden und zweige an den Querstraßen ab. Setze Vorsehungen für die laufenden Baustellen.'),
        knopf('Zum Neubaugebiet', () => this.ui.neubaugebietZeigen?.(), 'los', { klein: true }));
      bg.append(neu);
    }
    const hk = kasten('Helfer');
    if (sp.freigeschaltet('ruecklauf_helfer')) hk.append(h('p', { class: 'gedaempft' }, 'Die zehnminütige Pause beginnt erst, wenn der hydraulische Abgleich fertig ist.'));
    const sperreHelfer = sp.sperrgrund('ruecklauf_helfer');
    // A88: gesperrt = eine Zeile mit Grund; laufende Aufträge aus einem alten Stand werden trotzdem gezeigt
    if (sperreHelfer && !HELFER.some((name) => sp.helferAuftrag(name))) hk.append(sperrHinweis(`${merkmalName('ruecklauf_helfer')} ${sperreHelfer}`));
    else for (const name of HELFER) {
      const a = sp.helferAuftrag(name);
      const pause = sp.helferPauseBis_ms(name) - this.ui.jetzt_ms();
      const status = a ? `${KATALOG[a.objekt.typ].name}: noch ${zeitText(Math.ceil(Math.max(0, a.ende_ms - this.ui.jetzt_ms()) / 1000))}`
        : pause > 0 ? `Pause · noch ${zeitText(Math.ceil(pause / 1000))}` : 'frei';
      hk.append(zeile(name, h('span', { class: a ? '' : 'gedaempft', 'data-live': `helfer-${name}` }, status)));
    }
    c.append(ausbauZieleKasten(sp), k, vl, this.preisKasten(), pvk, hk, this.andiKasten(), bg, ...(sp.netz.strom_kw > 0 ? [zeile('Solarstrom', `${zahl(sp.netz.strom_kw)} kW · eingespeist ${zahl(sp.netz.einspeisung_kw)} kW`)] : []), zeile('Verfügbare Wärme', `${zahl(sp.netz.verfuegbar_kw)} kW`), zeile('Davon genutzt', `${zahl(sp.netz.genutzt_kw)} kW`));
    this.ausbauKnopf(c, o);
    void groesse;
  }

  private andiKasten(): HTMLElement {
    const sp = this.ui.spiel, andi = sp.stand.andi;
    const k = kasten('Andi · Zweiter Vorstand');
    if (!sp.freigeschaltet('andi')) {
      k.append(sperrHinweis(`Ab Heizzentralenstufe ${abStufe('andi')} verfügbar`));
    } else if (!andi) {
      k.append(knopf('Andi einstellen', () => { sp.andiEinstellen(); this.ui.geaendert(); }, 'los'));
    } else {
      const setzen = (anteil: number, aufgabe: typeof andi.aufgabe): void => {
        sp.andiKonfigurieren(anteil, aufgabe);
        this.ui.geaendert();
      };
      const aufgaben = [
        ['pause', 'Pausieren'],
        ['abgleich', 'Hydraulische Abgleiche'],
        ['verbessern', 'Alle Hausverbesserungen'],
      ] as const;
      k.append(h('p', {}, 'Bei jeder Monatsabrechnung erhält Andi 10 % seiner neuen Budgetzuteilung als Vergütung, auch wenn seine Aufträge pausieren. Die übrigen 90 % stehen für Aufträge bereit. Ungenutztes Budget bleibt verfügbar.'),
        zeile('Verfügbares Budget', h('span', { 'data-live': 'andi-budget' }, eur(andi.budget_eur))),
        zwischenueberschrift('Anteil am Zahlungseingang'),
        h('div', { class: 'knopfreihe' },
          stepper('minus', 'Andis Budgetanteil senken', () => setzen(andi.anteil_pct - ANDI_BUDGET_SCHRITT, andi.aufgabe), andi.anteil_pct <= 0),
          h('span', { class: 'preiswert' }, `${andi.anteil_pct} %`),
          stepper('plus', 'Andis Budgetanteil erhöhen', () => setzen(andi.anteil_pct + ANDI_BUDGET_SCHRITT, andi.aufgabe), andi.anteil_pct >= 100)),
        zwischenueberschrift('Aufgabe'),
        h('div', { class: 'knopfreihe', role: 'group', 'aria-label': 'Andis Aufgabe' }, ...aufgaben.map(([wahl, titel]) => {
          const aktiv = wahl === andi.aufgabe;
          const taste = knopf(titel, () => { if (andi.aufgabe !== wahl) setzen(andi.anteil_pct, wahl); }, aktiv ? 'los' : '', { klein: true });
          taste.setAttribute('aria-pressed', String(aktiv));
          return taste;
        })));
    }
    return k;
  }

  /** Wärmepreis einstellen (A52): gehört zur Heizzentrale, nicht ins Büro. */
  private preisKasten(): HTMLElement {
    const sp = this.ui.spiel, s = sp.stand;
    const P = PREISSTUFEN[s.preisstufe];
    const preis = kasten(`Wärmepreis · ${P.ct_je_kwh} ct/kWh`);
    preis.append(h('div', { class: 'knopfreihe' },
      stepper('minus', 'Wärmepreis senken', () => { sp.preisSetzen(s.preisstufe - 1); this.ui.geaendert(); }, s.preisstufe <= 0, RAND.preisMin),
      h('span', { class: 'preiswert' }, `${P.ct_je_kwh} ct`),
      stepper('plus', 'Wärmepreis erhöhen', () => { sp.preisSetzen(s.preisstufe + 1); this.ui.geaendert(); }, s.preisstufe >= PREISSTUFEN.length - 1, RAND.preisMax)));
    preis.append(h('p', { class: 'gedaempft' }, `Du bekommst die Vergütung für jede Kilowattstunde, die ein Abnehmer verbraucht (zwischen ${PREISSTUFEN[0].ct_je_kwh} und ${PREISSTUFEN.at(-1)!.ct_je_kwh} ct). Je höher der Preis, desto mehr Einnahmen – aber desto unzufriedener werden die Kunden (${P.name}).`));
    // A81: Grundgebühr je Anschluss und Monat
    const g = sp.grundgebuehr_eur;
    preis.append(zeile('Grundgebühr', `${eur(g)} im Monat je Anschluss`), h('div', { class: 'knopfreihe' },
      stepper('minus', 'Grundgebühr senken', () => { sp.grundgebuehrSetzen(g - 1); this.ui.geaendert(); }, g <= GRUNDGEBUEHR.min_eur, RAND.gebuehrMin),
      h('span', { class: 'preiswert' }, `${zahl(g)} €`),
      stepper('plus', 'Grundgebühr erhöhen', () => { sp.grundgebuehrSetzen(g + 1); this.ui.geaendert(); }, g >= GRUNDGEBUEHR.max_eur, RAND.gebuehrMax)));
    const m = sp.monat(), a = s.letzte_abrechnung;
    preis.append(h('p', { class: 'gedaempft' }, `Abgerechnet wird am Monatsende automatisch: verbrauchte kWh × Wärmepreis + Grundgebühr. Nächste Abrechnung (${sp.monatsname(m.nr)}) in ${zeitText(Math.ceil(m.rest_ms / 1000))}.`));
    if (a) preis.append(zeile(`Letzte Abrechnung (${sp.monatsname(a.monat)})`, `${zahl(a.waerme_kwh)} kWh · ${eur(a.summe_eur)}`));
    return preis;
  }

  private buero(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, s = sp.stand;
    c.append(zeile('Kassenspeicher', eur(sp.kassengrenze_eur())));
    c.append(h('p', { class: 'gedaempft' }, 'Den Wärmepreis stellst du jetzt in der Heizzentrale ein.'));
    const f = kasten('Förderanträge');
    f.append(h('p', { class: 'gedaempft' }, `Bewilligte Förderung: ${Math.round(KONSTANTEN.foerderquote * 100)} % der Baukosten fließen zurück – nur, wenn du erst nach dem Bescheid baust.`));
    // DESIGN.md 12.15: frei zuerst, dann gesperrte nach Freischalt-Stufe (sort ist stabil, gleiche Stufe behält die Katalogreihenfolge).
    const rang = (t: TypId): number => (sp.freigeschaltet(t) ? 0 : abStufe(t));
    for (const t of [...QUELLEN].sort((x, y) => rang(x) - rang(y))) {
      const a = s.antraege[t];
      // Gesperrte Quelle = nicht tippbarer Chip statt Knopf (viele gesperrte Zeilen); ein gestellter Antrag bleibt sichtbar.
      const rechts = a ? chip(a.stand === 'wartet' ? 'in Prüfung' : 'bewilligt', a.stand === 'wartet' ? 'blau' : 'gruen')
        : sp.freigeschaltet(t) ? knopf('Antrag stellen', () => { sp.foerderungBeantragen(t); this.ui.geaendert(); }, 'blau', { klein: true })
        : sperrChip(kurzGrund(t));
      f.append(zeile(KATALOG[t].name, rechts));
    }
    c.append(f);
    this.ausbauKnopf(c, o);
  }
}

