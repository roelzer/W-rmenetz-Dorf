import { istLeitung, KATALOG, LEITUNGEN, KONSTANTEN, PREISSTUFEN, hatStufen, type TypId } from '../core/katalog';
import { groesse, istAktiv } from '../core/netz';
import type { Objekt } from '../core/typen';
import { balken, chip, knopf, kasten, zeile } from './bausteine';
import { blattOeffnen, type Blatt } from './blatt';
import { eur, h, zahl } from './dom';
import type { Ui } from './schnittstelle';
import { zeitText } from '../render/gebaeude';

const QUELLEN: TypId[] = ['kessel', 'wpg', 'ptk', 'pv', 'puffer', 'solar', 'sonde'];

function signatur(c: HTMLElement): string {
  const k = c.cloneNode(true) as HTMLElement;
  k.querySelectorAll('[data-live]').forEach((e) => { e.textContent = ''; e.removeAttribute('style'); });
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
    this.id = id;
    const D = KATALOG[o.typ];
    this.blatt = blattOeffnen({ titel: D.name, stufe: hatStufen(o.typ) ? `Stufe ${o.stufe}` : '', beiZu: () => { this.blatt = null; this.id = null; this.beiZu(); } });
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
      this.blatt.inhalt.replaceChildren(...neu.childNodes);
    } else {
      neu.querySelectorAll<HTMLElement>('[data-live]').forEach((e) => {
        const alt = this.blatt!.inhalt.querySelector<HTMLElement>(`[data-live="${e.dataset.live}"]`);
        if (alt) { alt.textContent = e.textContent; if (e.getAttribute('style')) alt.setAttribute('style', e.getAttribute('style')!); }
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
      c.append(h('div', { class: 'knopfreihe' }, knopf(`Wegräumen · ${eur(D.raeumen_eur ?? 0)} + ${D.raeumen_taler ?? 0} Taler`, () => { if (sp.hindernisRaeumen(o.id).ok) { this.ui.geaendert(); this.schliessen(); } }, 'heiss')));
    } else if (kat === 'deko') {
      c.append(h('div', { class: 'knopfreihe' }, knopf('Verschieben', () => this.ui.verschieben(o.id)), knopf('Entfernen', () => { sp.entfernen(o.id); this.ui.geaendert(); this.schliessen(); })));
    }
    if (!istAktiv(o)) return;
    void n;
  }

  private baustelle(c: HTMLElement, o: Objekt): void {
    const b = o.bau!, sp = this.ui.spiel, jetzt = Date.now();
    const f = Math.max(0, Math.min(1, (jetzt - b.start_ms) / (b.ende_ms - b.start_ms)));
    const bal = balken(f), i = bal.querySelector('i') as HTMLElement;
    i.dataset.live = 'bar';
    const rest = h('span', { 'data-live': 'rest' }, zeitText((b.ende_ms - jetzt) / 1000));
    c.append(chip(b.art === 'neu' ? 'wird gebaut' : `wird ausgebaut auf Stufe ${o.stufe + 1}`, 'blau'), bal,
      h('p', {}, 'Noch ', rest));
    const kosten = h('span', { 'data-live': 'taler' }, String(sp.beschleunigungskosten_taler(b)));
    c.append(h('div', { class: 'knopfreihe' }, knopf(h('span', {}, 'Beschleunigen · ', kosten, ' Taler'), () => { sp.beschleunigen(o.bau); this.ui.geaendert(); }, 'taler')));
  }

  private ausbauKnopf(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, D = KATALOG[o.typ];
    if (!D.kosten_eur || !D.bauzeit_s) return;
    if (o.stufe >= sp.maxStufe(o)) {
      c.append(h('p', { class: 'gedaempft' }, o.stufe >= KONSTANTEN.hoechststufe ? 'Höchste Stufe erreicht.' : 'Für die nächste Stufe erst die Heizzentrale ausbauen.'));
      return;
    }
    const k = D.kosten_eur[o.stufe], zeit = D.bauzeit_s[o.stufe];
    c.append(h('div', { class: 'knopfreihe' }, knopf(`Ausbauen auf Stufe ${o.stufe + 1}`, () => { sp.ausbauen(o.id); this.ui.geaendert(); }, 'heiss', { unter: `${eur(k)} · ${zeitText(zeit)}`, aus: sp.stand.geld_eur < k })));
  }

  private haus(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, D = KATALOG[o.typ], n = sp.netz;
    const warm = n.warm.has(o.id), an = n.anschluss.has(o.id);
    const chips = h('div', { class: 'chips' });
    if (o.gekuendigt) chips.append(chip('hat gekündigt', 'rot'));
    else if (!an) chips.append(chip('heizt mit Öl', 'rot'));
    else if (n.kalt.get(o.id) === 'leitung') chips.append(chip('Leitung zu dünn', 'rot'));
    else if (!warm) chips.append(chip('kalt', 'blau'));
    else chips.append(chip('warm', 'gruen'));
    c.append(chips);
    const einnahme = (D.einnahmen_eur_min as number[])[o.stufe - 1] * PREISSTUFEN[sp.stand.preisstufe].einnahmefaktor;
    c.append(zeile('Wärmebedarf', `braucht ${D.bedarf_kw} kW`), zeile('Einnahmen', `${zahl(einnahme)} €/min`));
    const z = o.zufriedenheit_pct ?? 80;
    c.append(zeile('Zufriedenheit', `${zahl(z)} %`), balken(z / 100));
    if (o.gekuendigt) {
      c.append(h('p', {}, 'Der Kunde ist wieder bei seinem Öl-Kessel. Mit einem fairen Preis und guter Wärme kommt er zurück.'),
        h('div', { class: 'knopfreihe' }, knopf('Zurückgewinnen', () => { sp.zurueckgewinnen(o.id); this.ui.geaendert(); }, 'los', { unter: eur(KONSTANTEN.zurueckgewinnen_eur) })));
      return;
    }
    if (!an) c.append(h('p', {}, 'Heizt noch mit Öl. Leg eine Leitung von der Heizzentrale bis an das Haus.'), h('div', { class: 'knopfreihe' }, knopf('Leitung legen', () => this.ui.stempeln('d25'), 'los')));
    else if (n.kalt.get(o.id) === 'leitung') c.append(h('p', {}, 'Angeschlossen, aber eine Leitung auf dem Weg ist zu dünn. Ersetze sie durch eine dickere Leitung.'));
    else if (!warm) c.append(h('p', {}, 'Angeschlossen, aber es kommt zu wenig Wärme an. Baue eine weitere Wärmequelle oder erhöhe die Leistung.'));
    if (o.kasse_eur >= 1) c.append(h('div', { class: 'knopfreihe' }, knopf(`Abholen · ${eur(o.kasse_eur)}`, () => { this.ui.einsammeln(o.id); }, 'los')));
    this.ausbauKnopf(c, o);
    c.append(h('div', { class: 'knopfreihe' }, knopf('Verschieben', () => this.ui.verschieben(o.id), '', { klein: true })));
  }

  private gross(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, D = KATALOG[o.typ], n = sp.netz;
    if (o.zustand !== 'vertrag') {
      const b = sp.vertragBedingungen(o);
      const kasten_ = kasten('Bedingungen für den Vertrag');
      if (b.ok) kasten_.append(h('p', {}, 'Alles erfüllt – du kannst unterschreiben.'));
      else for (const f of b.fehlt) kasten_.append(zeile(chip('fehlt', 'rot'), f));
      c.append(kasten_);
      if (!n.anschluss.has(o.id)) c.append(h('p', {}, 'Noch nicht angeschlossen. Großabnehmer brauchen eine Leitung, die genug Wärme schafft.'), h('div', { class: 'knopfreihe' }, knopf('110er-Leitung legen', () => this.ui.stempeln('d110'), 'los')));
      c.append(h('div', { class: 'knopfreihe' }, knopf('Vertrag unterschreiben', () => { sp.vertragUnterschreiben(o.id); this.ui.geaendert(); }, 'los', { aus: !b.ok })));
      return;
    }
    c.append(h('div', { class: 'chips' }, chip('Vertrag läuft', 'gruen'), chip(n.anschluss.has(o.id) ? (n.warm.has(o.id) || o.typ === 'gewerbe' ? 'angeschlossen' : 'kalt') : 'nicht angeschlossen', n.anschluss.has(o.id) ? '' : 'rot')));
    if (D.bedarf_kw) c.append(zeile('Wärmebedarf', `braucht ${D.bedarf_kw} kW`), zeile('Einnahmen', `${zahl((D.einnahmen_eur_min as number[])[0] * PREISSTUFEN[sp.stand.preisstufe].einnahmefaktor)} €/min`));
    if (D.abwaerme_kw) c.append(zeile('Abwärme ins Netz', `bis ${D.abwaerme_kw} kW`));
    if (o.kasse_eur >= 1) c.append(h('div', { class: 'knopfreihe' }, knopf(`Abholen · ${eur(o.kasse_eur)}`, () => this.ui.einsammeln(o.id), 'los')));
  }

  private aussenquelle(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, D = KATALOG[o.typ], n = sp.netz;
    c.append(h('div', { class: 'chips' }, chip(n.anschluss.has(o.id) ? 'angeschlossen' : 'nicht angeschlossen', n.anschluss.has(o.id) ? 'gruen' : 'rot')));
    if (D.leistung_kw) c.append(zeile('Wärmeleistung', `${D.leistung_kw[o.stufe - 1]} kW`));
    if (D.strom_kw) c.append(zeile('Spitzenleistung Strom', `${D.strom_kw[o.stufe - 1]} kW`));
    const stromQuelle = !!D.strom_kw && !D.leistung_kw;
    if (!n.anschluss.has(o.id)) c.append(h('p', {}, stromQuelle ? 'Der Sonnenstrom muss über eine Verbindung zur Heizzentrale gelangen, sonst spart er dort nichts.' : 'Ohne Leitung zur Heizzentrale fließt keine Wärme ins Netz.'), h('div', { class: 'knopfreihe' }, knopf(stromQuelle ? 'Verbindung legen' : 'Leitung legen', () => this.ui.stempeln('d50'), 'los')));
    this.ausbauKnopf(c, o);
    c.append(h('div', { class: 'knopfreihe' }, knopf('Verschieben', () => this.ui.verschieben(o.id), '', { klein: true }),
      knopf('Verkaufen', () => { sp.verkaufen(o.id); this.ui.geaendert(); this.ui.kontext(null); }, '', { klein: true, unter: `+${eur(sp.rueckkauf_eur(o.typ, o.stufe))}`, aus: !!o.bau })));
  }

  private leitung(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, n = sp.netz, D = KATALOG[o.typ], key = o.y * KONSTANTEN.feldanzahl + o.x;
    const last = n.last_kw.get(key) ?? 0, kap = D.kapazitaet_kw ?? 0;
    c.append(zeile('Last', `${zahl(last)} / ${kap} kW`), balken(kap ? last / kap : 0));
    if (n.engpass.has(key)) c.append(kasten('Planungsfehler', h('p', {}, 'Hinter dieser Leitung wird es zum Kunden hin dünner und danach wieder dicker. Wärme kommt nur durch den dünnsten Abschnitt – tausche ihn gegen eine dickere Leitung.')));
    else if (n.tiefe.has(key) && n.kapazitaet_ok.get(key) === false) c.append(kasten('Überlastet', h('p', {}, 'Durch diese Stelle soll mehr Wärme fließen, als die Leitung schafft. Tausche sie gegen eine dickere.')));
    else if (!n.tiefe.has(key)) c.append(h('p', {}, 'Diese Leitung ist noch nicht mit der Heizzentrale verbunden.'));
    const tausch = LEITUNGEN.filter((t) => t !== o.typ && sp.grenze(t) > 0);
    if (tausch.length) c.append(h('div', { class: 'knopfreihe' }, ...tausch.map((t) => knopf(`Tauschen: ${KATALOG[t].name}`, () => { sp.leitungTauschen(o.id, t); this.ui.geaendert(); }, '', { unter: eur(KATALOG[t].kosten_eur![0]), klein: true }))));
    c.append(h('div', { class: 'knopfreihe' }, knopf('Entfernen', () => { sp.entfernen(o.id); this.ui.geaendert(); this.schliessen(); }, '', { klein: true })));
  }

  private heizzentrale(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, s = sp.stand, plaetze = KATALOG.hz.plaetze![sp.hzStufe - 1];
    const k = kasten(`Im Heizhaus · ${s.innen.length}/${plaetze} Plätze`);
    s.innen.forEach((q, i) => {
      const D = KATALOG[q.typ];
      const leistung = D.leistung_kw![q.stufe - 1];
      const rechts = q.bau ? h('span', {}, 'wird gebaut …') :
        q.stufe >= sp.hzStufe || q.stufe >= KONSTANTEN.hoechststufe ? h('span', { class: 'gedaempft' }, q.stufe >= KONSTANTEN.hoechststufe ? 'Höchste Stufe' : 'Heizzentrale ausbauen') :
          knopf(`Stufe ${q.stufe + 1}`, () => { sp.innenAusbauen(i); this.ui.geaendert(); }, 'heiss', { klein: true, unter: eur(D.kosten_eur![q.stufe]), aus: s.geld_eur < D.kosten_eur![q.stufe] });
      const verkauf = s.innen.length > 1 && !q.bau ? knopf('Verkaufen', () => { sp.innenVerkaufen(i); this.ui.geaendert(); }, '', { klein: true, unter: `+${eur(sp.rueckkauf_eur(q.typ, q.stufe))}` }) : null;
      k.append(zeile(h('span', {}, `${D.name} · Stufe ${q.stufe}`, h('br'), h('small', { class: 'gedaempft' }, `${leistung} kW`)), h('span', { class: 'rechts' }, rechts, verkauf)));
    });
    if (s.innen.length < plaetze) k.append(h('div', { class: 'knopfreihe' }, knopf('Quelle einbauen', () => this.ui.katalog('innen'), 'los')));
    else k.append(h('p', { class: 'gedaempft' }, 'Kein Platz mehr im Heizhaus – baue erst die Heizzentrale aus.'));
    c.append(k, zeile('Verfügbare Wärme', `${zahl(sp.netz.verfuegbar_kw)} kW`), zeile('Davon genutzt', `${zahl(sp.netz.genutzt_kw)} kW`));
    this.ausbauKnopf(c, o);
    void groesse;
  }

  private buero(c: HTMLElement, o: Objekt): void {
    const sp = this.ui.spiel, s = sp.stand;
    c.append(zeile('Kassenspeicher', eur(sp.kassengrenze_eur())));
    const P = PREISSTUFEN[s.preisstufe];
    const preis = kasten(`Wärmepreis · ${P.ct_je_kwh} ct/kWh`);
    preis.append(h('div', { class: 'knopfreihe' },
      knopf('−', () => { sp.preisSetzen(s.preisstufe - 1); this.ui.geaendert(); }, '', { klein: true, aus: s.preisstufe <= 0 }),
      h('span', { class: 'preiswert' }, `${P.ct_je_kwh} ct je kWh`),
      knopf('+', () => { sp.preisSetzen(s.preisstufe + 1); this.ui.geaendert(); }, '', { klein: true, aus: s.preisstufe >= PREISSTUFEN.length - 1 })));
    preis.append(h('p', { class: 'gedaempft' }, `Du bekommst die Vergütung für jede Kilowattstunde, die ein Abnehmer verbraucht (zwischen ${PREISSTUFEN[0].ct_je_kwh} und ${PREISSTUFEN.at(-1)!.ct_je_kwh} ct). Je höher der Preis, desto mehr Einnahmen – aber desto unzufriedener werden die Kunden (${P.name}).`));
    c.append(preis);
    const f = kasten('Förderanträge');
    f.append(h('p', { class: 'gedaempft' }, `Bewilligte Förderung: ${Math.round(KONSTANTEN.foerderquote * 100)} % der Baukosten fließen zurück – nur, wenn du erst nach dem Bescheid baust.`));
    for (const t of QUELLEN) {
      const a = s.antraege[t];
      const rechts = a ? chip(a.stand === 'wartet' ? 'in Prüfung' : 'bewilligt', a.stand === 'wartet' ? 'blau' : 'gruen') : knopf('Antrag stellen', () => { sp.foerderungBeantragen(t); this.ui.geaendert(); }, 'blau', { klein: true });
      f.append(zeile(KATALOG[t].name, rechts));
    }
    c.append(f);
    this.ausbauKnopf(c, o);
  }
}
