/**
 * Katalog aller Bau- und Spielobjekte.
 * Alle Zahlen sind SPIELZAHLEN (nicht kalibriert, nicht aus echten Projekten), siehe docs/ENTSCHEIDUNGEN.md.
 * Einheiten stehen im Namen: _kw (Leistung), _eur (Geld), _s (Sekunden), _pct (Prozent).
 * Reine Daten, keine Browser-Abhängigkeit.
 */

export type Kategorie =
  | 'innen' | 'waerme' | 'netz' | 'haus' | 'gross' | 'dorf' | 'deko' | 'hindernis';

export type TypId =
  | 'hz' | 'kessel' | 'wpg' | 'ptk'
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
  bedarf_kw?: number;
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
    plaetze: [1, 2, 2, 3, 4],
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
    name: '25er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 12, durchmesser_mm: 25,
    kosten_eur: [10], sofort: true, grenze: [60, 90, 130, 180, 240], breite: 0.06, farbe: '#d8392f',
    beschreibung: 'Für ein einzelnes Haus. Durchmesser 25 mm (rot), überträgt bis 12 kW.',
  },
  d32: {
    name: '32er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 20, durchmesser_mm: 32,
    kosten_eur: [14], sofort: true, grenze: [60, 90, 130, 180, 240], breite: 0.07, farbe: '#4caf3e',
    beschreibung: 'Für ein bis zwei Häuser. Durchmesser 32 mm (grün), überträgt bis 20 kW.',
  },
  d40: {
    name: '40er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 30, durchmesser_mm: 40,
    kosten_eur: [20], sofort: true, grenze: [60, 90, 130, 180, 240], breite: 0.08, farbe: '#6ec6ff',
    beschreibung: 'Für eine kurze Stichleitung. Durchmesser 40 mm (hellblau), überträgt bis 30 kW.',
  },
  d50: {
    name: '50er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 50, durchmesser_mm: 50,
    kosten_eur: [28], sofort: true, grenze: [60, 90, 130, 180, 240], breite: 0.09, farbe: '#1f4fa8',
    beschreibung: 'Für eine Straße mit mehreren Häusern. Durchmesser 50 mm (dunkelblau), überträgt bis 50 kW.',
  },
  d63: {
    name: '63er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 80, durchmesser_mm: 63,
    kosten_eur: [38], sofort: true, grenze: [60, 90, 130, 180, 240], breite: 0.11, farbe: '#e86aa0',
    beschreibung: 'Für ein Wohngebiet. Durchmesser 63 mm (pink), überträgt bis 80 kW.',
  },
  d75: {
    name: '75er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 110, durchmesser_mm: 75,
    kosten_eur: [50], sofort: true, grenze: [0, 90, 130, 180, 240], breite: 0.125, farbe: '#f6c22c',
    beschreibung: 'Verbindet mehrere Straßen. Durchmesser 75 mm (gelb), überträgt bis 110 kW.',
  },
  d90: {
    name: '90er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 160, durchmesser_mm: 90,
    kosten_eur: [68], sofort: true, grenze: [0, 90, 130, 180, 240], breite: 0.145, farbe: '#8a5a2b',
    beschreibung: 'Starke Verteilleitung. Durchmesser 90 mm (braun), überträgt bis 160 kW.',
  },
  d110: {
    name: '110er-Leitung', groesse: 1, kategorie: 'netz', kapazitaet_kw: 220, durchmesser_mm: 110,
    kosten_eur: [90], sofort: true, grenze: [0, 90, 130, 180, 240], breite: 0.165, farbe: '#1f6b3a',
    beschreibung: 'Dickste Leitung (110 mm, dunkelgrün), überträgt im Spiel bis 220 kW. Nur dort sinnvoll, wo viel Wärme fließt – für ein einzelnes Haus ist sie zu teuer.',
  },
  efh: {
    name: 'Einfamilienhaus', groesse: 1, kategorie: 'haus', bedarf_kw: 10,
    einnahmen_eur_min: [20, 30, 42, 58, 80],
    kosten_eur: [120, 300, 700, 1600, 3500], bauzeit_s: [4, 15, 40, 100, 240],
    grenze: [5, 8, 12, 16, 20],
    beschreibung: 'Zahlt für seine Wärme, wenn es angeschlossen und warm ist.',
  },
  rh: {
    name: 'Reihenhaus', groesse: 1, kategorie: 'haus', bedarf_kw: 16,
    einnahmen_eur_min: [34, 50, 70, 96, 130],
    kosten_eur: [300, 600, 1300, 2800, 6000], bauzeit_s: [8, 25, 60, 150, 300],
    grenze: [0, 3, 5, 7, 9],
    beschreibung: 'Drei Häuser Wand an Wand – spart Leitung und Fläche.',
  },
  baeck: {
    name: 'Bäckerei', groesse: 1, kategorie: 'haus', bedarf_kw: 20,
    einnahmen_eur_min: [45, 65, 90, 125, 170],
    kosten_eur: [400, 800, 1700, 3500, 7000], bauzeit_s: [10, 30, 80, 180, 360],
    grenze: [0, 1, 1, 1, 1],
    beschreibung: 'Braucht schon früh am Morgen viel Wärme.',
  },
  mfh: {
    name: 'Mehrfamilienhaus', groesse: 2, kategorie: 'haus', bedarf_kw: 30,
    einnahmen_eur_min: [60, 90, 125, 170, 230],
    kosten_eur: [700, 1200, 2500, 5000, 10000], bauzeit_s: [15, 40, 100, 240, 480],
    grenze: [0, 1, 2, 3, 4],
    beschreibung: 'Viele Wohnungen, viel Wärmebedarf.',
  },
  bad: {
    name: 'Hallenbad', groesse: 2, kategorie: 'gross', bedarf_kw: 45,
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
    name: 'Klinik', groesse: 2, kategorie: 'gross', bedarf_kw: 70,
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
  ['haus', 'Häuser'], ['dorf', 'Dorf'], ['deko', 'Deko'],
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
  startgeld_eur: 100000,
  /** Preise von Technik (Leitungen, Quellen, Häuser, Heizzentrale) in Spiel-Euro gegenüber den Rohwerten im Katalog (A29: realistischer Rahmen mit 100.000 € Start) */
  kosten_faktor: 40,
  /** Rückkauf beim Verkaufen / Leitungstausch: Anteil des Einkaufspreises (A30/A31) */
  rueckkauf_anteil: 0.5,
  starttaler: 100,
  hoechststufe: 5,
} as const;

// Realistische Preisklasse: Technik kostet mehr als die Rohwerte oben (A29). Deko und Hindernisse bleiben günstig.
for (const D of Object.values(KATALOG)) {
  if (D.kosten_eur && ['netz', 'waerme', 'innen', 'haus', 'dorf'].includes(D.kategorie) || (D.kosten_eur && D.name === 'Heizzentrale'))
    D.kosten_eur = D.kosten_eur.map((k) => Math.round(k * KONSTANTEN.kosten_faktor));
  if (D.kassenspeicher_eur) D.kassenspeicher_eur = D.kassenspeicher_eur.map((k) => k * KONSTANTEN.kosten_faktor);
}

export const LEITUNGEN: ReadonlyArray<TypId> = ['d25', 'd32', 'd40', 'd50', 'd63', 'd75', 'd90', 'd110'];
export const istLeitung = (t: TypId): boolean => LEITUNGEN.includes(t);
export const istQuelle = (t: TypId): boolean =>
  KATALOG[t].kategorie === 'innen' || KATALOG[t].kategorie === 'waerme';
/** Rang der Leitung: 1 dünn (25er) … 8 dick (110er) */
export const LEITUNGSRANG: Record<string, number> = { d25: 1, d32: 2, d40: 3, d50: 4, d63: 5, d75: 6, d90: 7, d110: 8 };
/** Hat das Objekt eine Stufenleiter (Ausbau)? */
export const hatStufen = (t: TypId): boolean => t === 'hz' || !!KATALOG[t].bauzeit_s;
