/**
 * Katalog aller Bau- und Spielobjekte.
 * Alle Zahlen sind SPIELZAHLEN (nicht kalibriert, nicht aus echten Projekten), siehe docs/ENTSCHEIDUNGEN.md.
 * Einheiten stehen im Namen: _kw (Leistung), _eur (Geld), _s (Sekunden), _pct (Prozent).
 * Reine Daten, keine Browser-Abhängigkeit.
 */

export type Kategorie =
  | 'innen' | 'waerme' | 'netz' | 'haus' | 'gross' | 'dorf' | 'deko' | 'hindernis';

export type TypId =
  | 'hz' | 'kessel' | 'wpg' | 'ptk' | 'pellet' | 'gas' | 'bhkw'
  | 'pv' | 'puffer' | 'solar' | 'sonde'
  | 'd25' | 'd32' | 'd40' | 'd50' | 'd63' | 'd75' | 'd90' | 'd110'
  | 'efh' | 'rh' | 'baeck' | 'mfh'
  | 'bad' | 'gewerbe' | 'klinik'
  | 'buero' | 'huette'
  | 'baum' | 'blumen' | 'hecke' | 'bank' | 'laterne' | 'brunnen'
  | 'stein' | 'busch';

export interface Definition {
  name: string;
  /** Kantenlänge in Feldern (1 = 1×1, 2 = 2×2) */
  groesse?: number;
  kategorie: Kategorie;
  /** Stückzahl-Obergrenze je Heizzentralen-Stufe 1..5 */
  grenze?: number[];
  /** Kosten je Stufe 1..5 in € */
  kosten_eur?: number[];
  /** Bauzeit je Stufe in Sekunden */
  bauzeit_s?: number[];
  /** Kosten in Dorftalern je Anzahl vorhandener Hütten (nur Monteurhütte) */
  kosten_taler?: number[];
  /** Plätze im Heizhaus je Stufe (nur Heizzentrale) */
  plaetze?: number[];
  /** Wärmeleistung je Stufe in kW */
  leistung_kw?: number[];
  /** Stromerzeugung je Stufe in kW (PV) */
  strom_kw?: number[];
  /** Kraft-Wärme-Kopplung: erzeugte Stromleistung je kW Wärme (BHKW) */
  strom_je_waerme?: number;
  /** Betriebskosten in € je erzeugter kW und Minute */
  betriebskosten_eur_je_kw_min?: number;
  /** Quelle braucht Strom (profitiert von PV) */
  elektrisch?: boolean;
  /** Übertragungsleistung einer Leitung in kW */
  kapazitaet_kw?: number;
  /** Leitungsdurchmesser in mm (25er … 110er) */
  durchmesser_mm?: number;
  /** Zeichenbreite und -farbe der Leitung */
  breite?: number;
  farbe?: string;
  /** Wärmebedarf (Auslegung) in kW */
  /** A71: Wärmebedarf (Anschlussleistung) in kW – aus dem Jahresverbrauch berechnet (verbrauch_kwh_a ÷ Volllaststunden ohne Puffer). */
  bedarf_kw?: number;
  /** A71: Jahreswärmeverbrauch in kWh (Spielwert). */
  verbrauch_kwh_a?: number;
  /** Einnahmen je Stufe in €/min bei Preisstufe „fair“ */
  einnahmen_eur_min?: number[];
  /** Abwärme-Einspeisung in kW (Sägewerk) */
  abwaerme_kw?: number;
  /** Großabnehmer: nötige Heizzentralen-Stufe und nötiger Ruf */
  min_hz_stufe?: number;
  min_ruf_pct?: number;
  /** Kassenspeicher des Abrechnungsbüros je Stufe in € */
  kassenspeicher_eur?: number[];
  /** Hindernisse wegräumen */
  raeumen_eur?: number;
  raeumen_taler?: number;
  /** wird ohne Bauzeit sofort gesetzt */
  sofort?: boolean;
  vorteil?: string;
  nachteil?: string;
  beschreibung: string;
}

export const KATALOG: Record<TypId, Definition> = {
  hz: {
    name: 'Heizzentrale', groesse: 2, kategorie: 'dorf' /* wird speziell behandelt */,
    grenze: [1, 1, 1, 1, 1],
    kosten_eur: [0, 1200, 3500, 9000, 20000],
    bauzeit_s: [0, 30, 90, 240, 480],
    plaetze: [2, 3, 4, 5, 6],
    beschreibung:
      'Dein Heizhaus. Drinnen stehen die Wärmequellen; die Stufe bestimmt, wie viele hineinpassen und wie groß sie sein dürfen. Ab Stufe 3 wird es auf 3×3 Felder vergrößert.',
  },
  kessel: {
    name: 'Hackschnitzelkessel', kategorie: 'innen',
    leistung_kw: [60, 90, 130, 180, 240],
    kosten_eur: [500, 900, 1800, 3500, 7000],
    bauzeit_s: [8, 25, 60, 150, 300],
    betriebskosten_eur_je_kw_min: 0.4,
    grenze: [9, 9, 9, 9, 9],
    vorteil: 'viel Leistung, Holz aus der Region',
    nachteil: 'Brennstoff kostet laufend',
    beschreibung: 'Verbrennt Holzhackschnitzel. Viel Leistung, aber laufende Brennstoffkosten.',
  },
  wpg: {
    name: 'Großwärmepumpe', kategorie: 'innen',
    leistung_kw: [45, 70, 100, 140, 190],
    kosten_eur: [1200, 1800, 3200, 6000, 11000],
    bauzeit_s: [12, 35, 80, 180, 360],
    betriebskosten_eur_je_kw_min: 0.15,
    elektrisch: true,
    grenze: [9, 9, 9, 9, 9],
    vorteil: 'günstig im Betrieb',
    nachteil: 'teuer in der Anschaffung',
    beschreibung:
      'Holt Wärme aus der Umgebung und braucht dafür Strom. Eigener Solarstrom (PV) senkt die Stromkosten.',
  },
  ptk: {
    name: 'Power-to-Heat-Kessel', kategorie: 'innen',
    leistung_kw: [50, 75, 105, 145, 195],
    kosten_eur: [250, 600, 1300, 2600, 5200],
    bauzeit_s: [6, 20, 50, 120, 240],
    betriebskosten_eur_je_kw_min: 0.9,
    elektrisch: true,
    grenze: [9, 9, 9, 9, 9],
    vorteil: 'sehr günstig zu bauen',
    nachteil: 'Strom ist teuer im Betrieb',
    beschreibung:
      'Macht direkt aus Strom Wärme (eine kWh Strom ergibt höchstens eine kWh Wärme). Billig zu bauen, teuer im Betrieb – außer mit viel PV.',
  },
  pellet: {
    name: 'Pelletkessel', kategorie: 'innen',
    leistung_kw: [40, 60, 90, 125, 170],
    kosten_eur: [700, 1200, 2400, 4600, 9000],
    bauzeit_s: [8, 25, 60, 150, 300],
    betriebskosten_eur_je_kw_min: 0.55,
    grenze: [9, 9, 9, 9, 9],
    vorteil: 'sauber, wenig Asche, wenig Wartung',
    nachteil: 'Pellets kosten mehr als Hackschnitzel',
    beschreibung: 'Verbrennt genormte Holzpellets. Kleiner und pflegeleichter als der Hackschnitzelkessel, aber der Brennstoff ist teurer.',
  },
  gas: {
    name: 'Gas-Spitzenlastkessel', kategorie: 'innen',
    leistung_kw: [80, 120, 170, 230, 300],
    kosten_eur: [400, 800, 1600, 3200, 6400],
    bauzeit_s: [6, 20, 50, 120, 240],
    betriebskosten_eur_je_kw_min: 1.0,
    grenze: [9, 9, 9, 9, 9],
    vorteil: 'billig zu bauen, viel Leistung für kalte Tage',
    nachteil: 'fossil: teurer Brennstoff und CO₂',
    beschreibung: 'Erdgaskessel für Lastspitzen an kalten Tagen. Er ist im Spiel die teuerste Quelle und springt deshalb erst an, wenn die anderen Quellen nicht reichen.',
  },
  bhkw: {
    name: 'Biogas-BHKW', kategorie: 'innen',
    leistung_kw: [35, 55, 80, 110, 150],
    strom_je_waerme: 0.8,
    kosten_eur: [2500, 4000, 7000, 12000, 20000],
    bauzeit_s: [15, 40, 90, 200, 400],
    betriebskosten_eur_je_kw_min: 0.3,
    min_hz_stufe: 2,
    grenze: [9, 9, 9, 9, 9],
    vorteil: 'macht Strom und Wärme zugleich',
    nachteil: 'teuer in der Anschaffung',
    beschreibung: 'Blockheizkraftwerk: Ein Motor verbrennt Biogas und treibt einen Generator an. Es liefert Strom und Wärme zugleich (Kraft-Wärme-Kopplung). Der Strom senkt die Kosten von Wärmepumpe und Power-to-Heat-Kessel.',
  },
  pv: {
    name: 'PV-Anlage', groesse: 2, kategorie: 'waerme',
    strom_kw: [20, 35, 50, 70, 95],
    kosten_eur: [350, 700, 1400, 2800, 5600],
    bauzeit_s: [8, 25, 60, 150, 300],
    grenze: [1, 2, 2, 3, 4],
    beschreibung:
      'Liefert Sonnenstrom und senkt damit die Stromkosten von Wärmepumpe und Power-to-Heat-Kessel.',
  },
  puffer: {
    name: 'Pufferspeicher', groesse: 1, kategorie: 'waerme',
    leistung_kw: [15, 25, 35, 50, 70],
    kosten_eur: [300, 650, 1300, 2600, 5200],
    bauzeit_s: [6, 20, 50, 120, 240],
    grenze: [1, 1, 2, 2, 3],
    beschreibung:
      'Hebt Wärme für die Spitzenzeiten auf. Er erzeugt selbst keine Wärme: Im Spiel hilft er nur, solange mindestens eine Wärmequelle läuft (vereinfacht).',
  },
  solar: {
    name: 'Solarthermie', groesse: 2, kategorie: 'waerme',
    leistung_kw: [25, 40, 55, 75, 100],
    kosten_eur: [800, 1300, 2500, 5000, 10000],
    bauzeit_s: [12, 35, 80, 180, 360],
    grenze: [0, 1, 2, 2, 3],
    beschreibung:
      'Sonnenwärme direkt ins Netz, ohne Brennstoff (im Spiel vereinfacht: gleichbleibende Leistung).',
  },
  sonde: {
    name: 'Erdsondenfeld', groesse: 2, kategorie: 'waerme',
    leistung_kw: [30, 45, 60, 80, 105],
    kosten_eur: [1500, 2200, 4000, 7500, 14000],
    bauzeit_s: [15, 45, 100, 220, 420],
    grenze: [0, 0, 1, 2, 2],
    beschreibung:
      'Wärme aus dem Erdreich, über das Jahr weitgehend gleichmäßig. In der Praxis hebt meist eine Wärmepumpe sie auf Netztemperatur – im Spiel vereinfacht ohne Strombedarf.',
  },
  d25: {
    name: '25er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 15, durchmesser_mm: 25,
    kosten_eur: [10], sofort: true, grenze: [60, 90, 130, 180, 240], breite: 0.06, farbe: '#d8392f',
    beschreibung: 'Für ein einzelnes Haus. Durchmesser 25 mm (rot), überträgt im Spiel bis 15 kW.',
  },
  d32: {
    name: '32er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 25, durchmesser_mm: 32,
    kosten_eur: [14], sofort: true, grenze: [60, 90, 130, 180, 240], breite: 0.07, farbe: '#4caf3e',
    beschreibung: 'Für ein bis zwei Häuser. Durchmesser 32 mm (grün), überträgt im Spiel bis 25 kW.',
  },
  d40: {
    name: '40er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 40, durchmesser_mm: 40,
    kosten_eur: [20], sofort: true, grenze: [60, 90, 130, 180, 240], breite: 0.08, farbe: '#6ec6ff',
    beschreibung: 'Für eine kurze Stichleitung. Durchmesser 40 mm (hellblau), überträgt im Spiel bis 40 kW.',
  },
  d50: {
    name: '50er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 60, durchmesser_mm: 50,
    kosten_eur: [28], sofort: true, grenze: [60, 90, 130, 180, 240], breite: 0.09, farbe: '#1f4fa8',
    beschreibung: 'Für eine Straße mit mehreren Häusern. Durchmesser 50 mm (dunkelblau), überträgt im Spiel bis 60 kW.',
  },
  d63: {
    name: '63er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 95, durchmesser_mm: 63,
    kosten_eur: [38], sofort: true, grenze: [60, 90, 130, 180, 240], breite: 0.11, farbe: '#e86aa0',
    beschreibung: 'Für ein Wohngebiet. Durchmesser 63 mm (pink), überträgt im Spiel bis 95 kW.',
  },
  d75: {
    name: '75er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 135, durchmesser_mm: 75,
    kosten_eur: [50], sofort: true, grenze: [0, 90, 130, 180, 240], breite: 0.125, farbe: '#f6c22c',
    beschreibung: 'Verbindet mehrere Straßen. Durchmesser 75 mm (gelb), überträgt im Spiel bis 135 kW.',
  },
  d90: {
    name: '90er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 195, durchmesser_mm: 90,
    kosten_eur: [68], sofort: true, grenze: [0, 90, 130, 180, 240], breite: 0.145, farbe: '#8a5a2b',
    beschreibung: 'Starke Verteilleitung. Durchmesser 90 mm (braun), überträgt im Spiel bis 195 kW.',
  },
  d110: {
    name: '110er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 290, durchmesser_mm: 110,
    kosten_eur: [90], sofort: true, grenze: [0, 90, 130, 180, 240], breite: 0.165, farbe: '#1f6b3a',
    beschreibung: 'Dickste Leitung (110 mm, dunkelgrün), überträgt im Spiel bis 290 kW. Nur dort sinnvoll, wo viel Wärme fließt – für ein einzelnes Haus ist sie zu teuer.',
  },
  efh: {
    name: 'Einfamilienhaus', groesse: 1, kategorie: 'haus', verbrauch_kwh_a: 15000,
    einnahmen_eur_min: [20, 30, 42, 58, 80],
    kosten_eur: [120, 300, 700, 1600, 3500], bauzeit_s: [4, 15, 40, 100, 240],
    grenze: [5, 8, 12, 16, 20],
    beschreibung: 'Zahlt für seine Wärme, wenn es angeschlossen und warm ist.',
  },
  rh: {
    name: 'Reihenhaus', groesse: 1, kategorie: 'haus', verbrauch_kwh_a: 24000,
    einnahmen_eur_min: [34, 50, 70, 96, 130],
    kosten_eur: [300, 600, 1300, 2800, 6000], bauzeit_s: [8, 25, 60, 150, 300],
    grenze: [0, 3, 5, 7, 9],
    beschreibung: 'Drei Häuser Wand an Wand – spart Leitung und Fläche.',
  },
  baeck: {
    name: 'Bäckerei', groesse: 1, kategorie: 'haus', verbrauch_kwh_a: 30000,
    einnahmen_eur_min: [45, 65, 90, 125, 170],
    kosten_eur: [400, 800, 1700, 3500, 7000], bauzeit_s: [10, 30, 80, 180, 360],
    grenze: [0, 1, 1, 1, 1],
    beschreibung: 'Braucht schon früh am Morgen viel Wärme.',
  },
  mfh: {
    name: 'Mehrfamilienhaus', groesse: 2, kategorie: 'haus', verbrauch_kwh_a: 45000,
    einnahmen_eur_min: [60, 90, 125, 170, 230],
    kosten_eur: [700, 1200, 2500, 5000, 10000], bauzeit_s: [15, 40, 100, 240, 480],
    grenze: [0, 1, 2, 3, 4],
    beschreibung: 'Viele Wohnungen, viel Wärmebedarf.',
  },
  bad: {
    name: 'Hallenbad', groesse: 2, kategorie: 'gross', verbrauch_kwh_a: 67500,
    einnahmen_eur_min: [160], min_hz_stufe: 2, min_ruf_pct: 55,
    beschreibung: 'Großabnehmer. Braucht dauerhaft viel Wärme und zahlt entsprechend.',
  },
  gewerbe: {
    name: 'Sägewerk', groesse: 2, kategorie: 'gross', abwaerme_kw: 60,
    einnahmen_eur_min: [0], min_hz_stufe: 2, min_ruf_pct: 0,
    beschreibung:
      'Hat Abwärme übrig. Angeschlossen liefert es dir günstige Wärme ins Netz – solange der Betrieb läuft.',
  },
  klinik: {
    name: 'Klinik', groesse: 2, kategorie: 'gross', verbrauch_kwh_a: 105000,
    einnahmen_eur_min: [240], min_hz_stufe: 3, min_ruf_pct: 65,
    beschreibung: 'Großabnehmer mit strengem Vertrag: Wird sie kalt, sinkt dein Ruf stark.',
  },
  buero: {
    name: 'Abrechnungsbüro', groesse: 2, kategorie: 'dorf',
    kassenspeicher_eur: [3000, 8000, 20000, 50000, 100000],
    kosten_eur: [400, 1200, 3000, 8000, 20000], bauzeit_s: [6, 25, 80, 200, 400],
    grenze: [1, 1, 1, 2, 2],
    beschreibung: 'Kasse, Wärmepreis und Förderanträge.',
  },
  huette: {
    name: 'Monteurhütte', groesse: 1, kategorie: 'dorf',
    kosten_taler: [0, 0, 120, 250, 450], sofort: true, grenze: [5, 5, 5, 5, 5],
    beschreibung: 'Jede Hütte ist ein Monteur-Trupp, der gleichzeitig bauen kann.',
  },
  baum: { name: 'Baum', groesse: 1, kategorie: 'deko', kosten_eur: [40], sofort: true, grenze: [12, 20, 30, 40, 60], beschreibung: 'Schatten und ein bisschen Wald.' },
  blumen: { name: 'Blumenbeet', groesse: 1, kategorie: 'deko', kosten_eur: [30], sofort: true, grenze: [12, 20, 30, 40, 60], beschreibung: 'Farbe fürs Dorf.' },
  hecke: { name: 'Hecke', groesse: 1, kategorie: 'deko', kosten_eur: [20], sofort: true, grenze: [20, 30, 40, 60, 80], beschreibung: 'Grenzt Gärten ab.' },
  bank: { name: 'Parkbank', groesse: 1, kategorie: 'deko', kosten_eur: [60], sofort: true, grenze: [4, 8, 12, 16, 20], beschreibung: 'Zum Ausruhen.' },
  laterne: { name: 'Laterne', groesse: 1, kategorie: 'deko', kosten_eur: [50], sofort: true, grenze: [6, 10, 16, 24, 30], beschreibung: 'Licht für die Dorfstraße.' },
  brunnen: { name: 'Dorfbrunnen', groesse: 2, kategorie: 'deko', kosten_eur: [500], sofort: true, grenze: [0, 1, 1, 2, 2], beschreibung: 'Der Treffpunkt in der Dorfmitte.' },
  stein: { name: 'Felsbrocken', groesse: 1, kategorie: 'hindernis', raeumen_eur: 60, raeumen_taler: 4, beschreibung: 'Wegräumen bringt Dorftaler.' },
  busch: { name: 'Gestrüpp', groesse: 1, kategorie: 'hindernis', raeumen_eur: 30, raeumen_taler: 2, beschreibung: 'Wegräumen bringt Dorftaler.' },
};

/** Reihenfolge und Beschriftung der Bau-Kategorien im Katalog-Fenster */
export const BAU_KATEGORIEN: ReadonlyArray<readonly [Kategorie, string]> = [
  ['innen', 'Heizhaus'], ['waerme', 'Außenanlagen'], ['netz', 'Leitungen'],
  ['dorf', 'Dorf'], ['deko', 'Deko'],
];

/** Wärmepreisstufen: Preis in ct/kWh, Einnahme-Faktor, Ziel-Zufriedenheit in % */
export interface Preisstufe { name: string; ct_je_kwh: number; einnahmefaktor: number; zufriedenheit_pct: number }
export const PREISSTUFEN: ReadonlyArray<Preisstufe> = [
  { name: 'sehr günstig', ct_je_kwh: 7, einnahmefaktor: 7 / 14, zufriedenheit_pct: 97 },
  { name: 'sehr günstig', ct_je_kwh: 8, einnahmefaktor: 8 / 14, zufriedenheit_pct: 94 },
  { name: 'günstig', ct_je_kwh: 9, einnahmefaktor: 9 / 14, zufriedenheit_pct: 90 },
  { name: 'günstig', ct_je_kwh: 10, einnahmefaktor: 10 / 14, zufriedenheit_pct: 85 },
  { name: 'fair', ct_je_kwh: 11, einnahmefaktor: 11 / 14, zufriedenheit_pct: 80 },
  { name: 'fair', ct_je_kwh: 12, einnahmefaktor: 12 / 14, zufriedenheit_pct: 72 },
  { name: 'üblich', ct_je_kwh: 13, einnahmefaktor: 13 / 14, zufriedenheit_pct: 60 },
  { name: 'teuer', ct_je_kwh: 14, einnahmefaktor: 1, zufriedenheit_pct: 45 },
  { name: 'sehr teuer', ct_je_kwh: 15, einnahmefaktor: 15 / 14, zufriedenheit_pct: 30 },
];
/** Index der Startpreisstufe (12 ct/kWh). */
export const START_PREISSTUFE = 5;

/** A35: Eine echte Woche entspricht zehn Spieljahren. */
export const SPIELJAHR_MS = (7 * 24 * 3600 * 1000) / 10;

export const KONSTANTEN = {
  /** Karte N×N Felder */
  feldanzahl: 24,
  /** Grundkapazität der Kasse in € (ohne Abrechnungsbüro) */
  grundkasse_eur: 150000,
  /** Anteil der Baukosten, der bei bewilligter Förderung zurückfließt */
  foerderquote: 0.4,
  /** Bewilligungsdauer eines Förderantrags in Sekunden (Prototyp verkürzt) */
  foerderdauer_s: 15,
  /** Betriebskosten der Sägewerk-Abwärme in € je kW und Minute */
  abwaerme_eur_je_kw_min: 0.1,
  /** Zufriedenheit, unter der Häuser kündigen / Großabnehmer den Vertrag beenden */
  kuendigung_haus_pct: 20,
  kuendigung_gross_pct: 15,
  /** Abzug von der Ziel-Zufriedenheit, wenn ein Kunde kalt bleibt (Prozentpunkte) */
  kalt_abzug_haus_pct: 55,
  kalt_abzug_gross_pct: 70,
  /** Kosten, einen gekündigten Kunden zurückzugewinnen */
  zurueckgewinnen_eur: 300,
  /** Sekunden pro Dorftaler beim Beschleunigen */
  beschleunigen_s_je_taler: 10,
  /** Spieltempo (A26): alle Bau- und Ausbauzeiten werden mit diesem Faktor verlängert */
  bauzeit_faktor: 2.5,
  startgeld_eur: 30000,
  /** Preise von Technik (Leitungen, Quellen, Häuser, Heizzentrale) in Spiel-Euro gegenüber den Rohwerten im Katalog (A29: realistischer Rahmen mit 100.000 € Start) */
  kosten_faktor: 40,
  /** Rückkauf beim Verkaufen / Leitungstausch: Anteil des Einkaufspreises (A30/A31) */
  rueckkauf_anteil: 0.5,
  /** A41: Planung durch Philipp (Sekunden vor Spieltempo) und Planungsgebühr in € */
  abschnitt_planung_s: 30,
  abschnitt_planung_eur: 2000,
  /** A41: Bauzeit eines Bauabschnitts nach der Materialbestellung (Sekunden vor Spieltempo; Laura sagt die Lieferzeit in Spieltagen an) */
  abschnitt_bau_s: 360,
  /** A62: Expresslieferung – Aufpreis als Anteil am Material (mindestens express_min_eur), Restlieferzeit schrumpft auf express_faktor */
  express_anteil: 0.3,
  express_min_eur: 500,
  express_faktor: 0.35,
  /** A34: Nach so vielen Sekunden dauerhaft hoher Zufriedenheit schaltet ein Haus seinen Kamin ab (Vollversorgung) */
  vollversorgung_nach_s: 900,
  vollversorgung_faktor: 1.5,
  /** A35/Aufstockung: Nach dieser Zeit als warmer Kunde stockt ein Wohnhaus auf, der Bedarf steigt */
  aufstockung_nach_s: 1800,
  aufstockung_faktor: 1.4,
  /** A36: Vergütung für eingespeisten PV-Strom in € je kW und Minute (Spielwert) */
  einspeisung_eur_je_kw_min: 0.2,
  /** A43: Baugebiet: Mindestanschlüsse, Mindest-Stufe und Erschließungskosten */
  baugebiet_anschluesse: 6, baugebiet_hz_stufe: 3, baugebiet_eur: 40000,
  /** A45: Gestattung (Leitungsrecht) je Feld abseits der öffentlichen Straße; Spielwert, keine Norm */
  gestattung_eur_je_feld: 1500,
  /** A50: Nach so vielen Sekunden zufriedener Kunden möchte ein weiteres Haus anschließen (Spielwert) */
  interesse_alle_s: 600,
  interessenten_max: 4,
  /** A50: Ab dieser Zufriedenheit aller Kunden spricht es sich herum (alle angeschlossenen Kunden warm und so zufrieden; sonst beginnt die Zeit von vorn) */
  interesse_ab_pct: 75,
  /** A50: Nachlass auf die Übergabestation für ein Haus, das selbst angeklopft hat */
  interessent_nachlass: 0.2,
  /** A46: Spülbohrung unter dem Fluss je Feld; teuer, Spielwert */
  bohrung_eur_je_feld: 8000,
  /** A69: T-Stück mit verschlossenem Abgang (Vorsehung), beim Bau der Leitung eingesetzt; Spielwert (Recherche fand keine Baukosten, siehe docs/recherche/vorsehung_anbohrung.md) */
  vorsehung_eur: 300,
  /** A69: Abzweig nachträglich an eine laufende Leitung ohne Vorsehung (Absperren/Anbohren); Spielwert (Recherche fand keine Baukosten, siehe docs/recherche/vorsehung_anbohrung.md) */
  anbohrung_eur: 2500,
  /** A71: Pufferspeicher im Haus einbauen; Spielwert */
  hauspuffer_eur: 1800,
  /** Q2 (Simon 2026-11-05): Ein Feld ist 10 m lang. */
  feldlaenge_m: 10,
  starttaler: 100,
  hoechststufe: 5,
} as const;

/** A71 (Simon 2026-11-05): Anschlussleistung = Jahresverbrauch ÷ Volllaststunden. Mit Pufferspeicher im Haus 1.800 h, nur Übergabestation ohne Puffer 1.500 h. */
export const VOLLLASTSTUNDEN = { ohne_puffer_h: 1500, mit_puffer_h: 1800 } as const;
for (const D of Object.values(KATALOG)) if (D.verbrauch_kwh_a) D.bedarf_kw = D.verbrauch_kwh_a / VOLLLASTSTUNDEN.ohne_puffer_h;

// Realistische Preisklasse: Technik kostet mehr als die Rohwerte oben (A29). Deko und Hindernisse bleiben günstig.
for (const D of Object.values(KATALOG)) {
  if (D.kosten_eur && ['netz', 'waerme', 'innen', 'haus', 'dorf'].includes(D.kategorie) || (D.kosten_eur && D.name === 'Heizzentrale'))
    D.kosten_eur = D.kosten_eur.map((k) => Math.round(k * KONSTANTEN.kosten_faktor));
  if (D.kassenspeicher_eur) D.kassenspeicher_eur = D.kassenspeicher_eur.map((k) => k * KONSTANTEN.kosten_faktor);
}

/** Hausübergabestationen (A32). Leistung = größter Hausbedarf, den die Station übergibt. Preise sind Spielwerte nach der ENERPIPE-Recherche (docs/recherche/enerpipe_rohre_stationen.md, Preise nicht aus Katalog, Gegenprüfung steht aus). */
export interface Station { id: string; name: string; leistung_kw: number; kosten_eur: number; beschreibung: string }
export const STATIONEN: ReadonlyArray<Station> = [
  { id: 'st_15', name: 'Wandstation Typ 15', leistung_kw: 15, kosten_eur: 2400, beschreibung: 'Kleine Hausstation für ein Einfamilienhaus.' },
  { id: 'st_25', name: 'Wandstation Typ 25', leistung_kw: 25, kosten_eur: 3600, beschreibung: 'Für Reihenhaus, Bäckerei und Einfamilienhaus mit Reserve.' },
  { id: 'st_40', name: 'Wandstation Typ 40', leistung_kw: 40, kosten_eur: 4800, beschreibung: 'Für kleine Mehrfamilienhäuser.' },
  { id: 'st_60', name: 'Wandstation Typ 60', leistung_kw: 60, kosten_eur: 7000, beschreibung: 'Für größere Gebäude und Gewerbe.' },
  { id: 'st_80', name: 'Wandstation Typ 80', leistung_kw: 80, kosten_eur: 9000, beschreibung: 'Größte Wandstation, für große Mehrfamilienhäuser.' },
  { id: 'st_cad', name: 'CAD-Großabnehmerstation', leistung_kw: 150, kosten_eur: 20000, beschreibung: 'Für Hallenbad, Klinik und Industrie (ab ca. 100 kW, nach ENERPIPE-Systematik).' },
];
export const stationHolen = (id: string | undefined): Station | undefined => STATIONEN.find((s) => s.id === id);
/** Kleinste Station, die den Bedarf übergibt. */
export const passendeStation = (bedarf_kw: number): Station => STATIONEN.find((s) => s.leistung_kw >= bedarf_kw) ?? STATIONEN[STATIONEN.length - 1];

/** Vorlauftemperatur der Heizzentrale (A33). Niedriger spart Verlustkosten, ist aber für schlecht gedämmte Häuser zu kalt. Spielwerte. */
export const VORLAUF = { min_c: 55, max_c: 85, start_c: 75, schritt_c: 5, ersparnis_je_k: 0.012 } as const;
/** Mindest-Vorlauftemperatur, die ein Haus für warme Räume braucht, bevor Upgrades die Rücklauf-/Heizflächen verbessern (Spielwerte). */
export const MIN_VORLAUF_C: Partial<Record<TypId, number>> = { efh: 75, rh: 75, baeck: 75, mfh: 70, bad: 70, klinik: 70 };
/** Hausupgrades (A33): senken die nötige Vorlauftemperatur (Rücklauf sinkt). Kosten = Arbeiter und Material, Spielwerte. */
export const UPGRADES: ReadonlyArray<{ name: string; kosten_eur: number; senkung_k: number; dauer_s: number; beschreibung: string }> = [
  { name: 'Hydraulischer Abgleich', dauer_s: 60, kosten_eur: 1500, senkung_k: 5, beschreibung: 'Ein Monteur stellt alle Heizkörper aufeinander ab. Der Rücklauf wird kälter.' },
  { name: 'Neue Hausstation einstellen', dauer_s: 120, kosten_eur: 3500, senkung_k: 5, beschreibung: 'Regelung und Wärmeübertrager der Station werden optimiert.' },
  { name: 'Größere Heizflächen', dauer_s: 240, kosten_eur: 9000, senkung_k: 8, beschreibung: 'Größere Heizkörper oder Fußbodenheizung: Das Haus wird schon mit niedriger Vorlauftemperatur warm.' },
];

/** Spreizung (Vorlauf minus Rücklauf) eines Hauses ohne Upgrades in K (Spielwert); Upgrades senken den Rücklauf und erhöhen sie um ihre Kelvin-Zahl (A33/A39). */
export const SPREIZUNG_BASIS_K = 20;
/** A73 (Simon 2026-11-05): Ein gut eingestelltes Haus erreicht höchstens 40 °C Rücklauf – kälter geht er nicht. Spreizung ≤ Vorlauf − 40 K. */
export const MIN_RUECKLAUF_C = 40;
/** Helfer für die Bauabschnitte (A41): Philipp plant, Laura bestellt das Material. */
export const ABSCHNITT_HELFER = { planung: 'Philipp', material: 'Laura' } as const;
/** Die drei Helfer (A40): Sie senken auf Auftrag den Rücklauf eines Hauses. */
export const HELFER: ReadonlyArray<string> = ['Sebastian', 'Christian', 'Manfred'];
/** Bedingungen für den Ausbau der Heizzentrale (A39, „Rathaus“-Prinzip): Anschlüsse, Wärmeabsatz, Spreizung (Vorlauf minus mittlerer Rücklauf). Spielwerte. */
export const HZ_ZIELE: ReadonlyArray<{ stufe: number; anschluesse: number; absatz_kw: number; spreizung_k: number }> = [
  { stufe: 2, anschluesse: 3, absatz_kw: 0, spreizung_k: 0 },
  { stufe: 3, anschluesse: 5, absatz_kw: 80, spreizung_k: 0 },
  { stufe: 4, anschluesse: 8, absatz_kw: 140, spreizung_k: 25 },
  { stufe: 5, anschluesse: 11, absatz_kw: 200, spreizung_k: 30 },
];

/** PV auf dem Dach der Heizzentrale (A36, Simon: PV gehört an die Heizzentrale, nicht an einzelne Häuser): Leistung in kWp je Heizzentralen-Stufe und Preis je kWp in € (Spielwerte). */
export const DACH_PV = { kw_je_stufe: [10, 15, 25, 40, 60] as ReadonlyArray<number>, eur_je_kw: 1100 };

export const LEITUNGEN: ReadonlyArray<TypId> = ['d25', 'd32', 'd40', 'd50', 'd63', 'd75', 'd90', 'd110'];
export const istLeitung = (t: TypId): boolean => LEITUNGEN.includes(t);
export const istQuelle = (t: TypId): boolean =>
  KATALOG[t].kategorie === 'innen' || KATALOG[t].kategorie === 'waerme';
/** Rang der Leitung: 1 dünn (25er) … 8 dick (110er) */
export const LEITUNGSRANG: Record<string, number> = { d25: 1, d32: 2, d40: 3, d50: 4, d63: 5, d75: 6, d90: 7, d110: 8 };
/** Hat das Objekt eine Stufenleiter (Ausbau)? */
export const hatStufen = (t: TypId): boolean => t === 'hz' || !!KATALOG[t].bauzeit_s;
