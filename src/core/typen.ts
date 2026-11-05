import type { TypId } from './katalog';

/** Eine laufende Baustelle. Zeiten sind absolute Zeitstempel (ms), nie heruntergezählt. */
export interface Bau {
  art: 'neu' | 'ausbau';
  start_ms: number;
  ende_ms: number;
}

/** Ein Objekt auf der Karte. */
export interface Objekt {
  id: number;
  typ: TypId;
  x: number;
  y: number;
  stufe: number;
  bau: Bau | null;
  /** aufgelaufene, noch nicht abgeholte Einnahmen in € */
  kasse_eur: number;
  /** Zufriedenheit 0..100 (Häuser und Großabnehmer) */
  zufriedenheit_pct?: number;
  gekuendigt?: boolean;
  /** Großabnehmer: 'gesperrt' (kein Vertrag) oder 'vertrag' */
  zustand?: 'gesperrt' | 'vertrag';
  /** bei bewilligter Förderung: Baukosten in €, von denen die Quote zurückfließt */
  foerderung_eur?: number;
  /** Bäume der Landschaft: zählen nicht zur Deko-Obergrenze */
  landschaft?: boolean;
  /** A33: Anzahl durchgeführter Hausupgrades (0–3) */
  upgrade?: number;
  /** A40: laufender Helferauftrag für das nächste Upgrade */
  upgrade_auftrag?: { helfer: string; ende_ms: number };
  /** A32: Haus/Großabnehmer hat noch keine Übergabestation und ist deshalb kein Wärmekunde */
  ohne_station?: boolean;
  /** gekaufte Übergabestation (Id aus STATIONEN) */
  station?: string;
  /** Gebäude des Ortes (A21): zählen nicht gegen die Baugrenzen der Heizzentralen-Stufe */
  bestand?: boolean;
  /** A69: Leitungsfeld mit T-Stück und verschlossenem Abgang (Vorsehung) für einen späteren Anschluss */
  vorsehung?: boolean;
  /** A41: Leitung gehört zum laufenden Bauabschnitt und ist erst nach dem Bau Teil des Netzes */
  geplant?: boolean;
  /** Sekunden als warmer Kunde / Sekunden dauerhaft sehr zufrieden (A34, Aufstockung) */
  warm_s?: number;
  voll_s?: number;
  /** A34: Kamin ist aus, das Haus bezieht seine ganze Wärme aus dem Netz */
  vollversorgung?: boolean;
  /** Das Haus hat ein Stockwerk aufgesetzt: höherer Bedarf */
  aufgestockt?: boolean;
  /** A50: Nachbarhaus, das gern ans Netz möchte (leuchtet gelb) */
  interessent?: boolean;
  /** A36: PV-Anlage auf dem Dach */
  dach_pv?: boolean;
  /** nur Darstellung: Zeitpunkt für Aufpop-Animation */
  _pop?: number;
}

/** Wärmequelle im Heizhaus. */
export interface InnenQuelle {
  typ: TypId;
  stufe: number;
  bau: Bau | null;
  foerderung_eur?: number;
}

export interface Foerderantrag {
  stand: 'wartet' | 'bewilligt';
  bewilligt_ms: number;
}

/** A41: Ein Bauabschnitt durchläuft Planung (Philipp) → Einzeichnen → Bestellung (Laura) → Bau. */
export interface Abschnitt {
  phase: 'planung' | 'offen' | 'bestellen' | 'bau';
  /** läuft nur in 'planung' und 'bau' */
  bau: Bau | null;
  /** A62: bezahlter Materialpreis (Grundlage für den Express-Aufpreis) und ob schon Express bestellt ist */
  material_eur?: number;
  express?: boolean;
}

export interface Spielstand {
  version: 3;
  name: string;
  /** gewählter Ort (A21); fehlt bei alten Spielständen */
  ort?: string;
  geld_eur: number;
  taler: number;
  objekte: Objekt[];
  naechste_id: number;
  innen: InnenQuelle[];
  preisstufe: number;
  /** A33: Vorlauftemperatur der Heizzentrale in °C (fehlt bei alten Ständen = Startwert) */
  vorlauf_c?: number;
  /** A41: aktueller Bauabschnitt (höchstens einer) */
  abschnitt?: Abschnitt;
  /** A43: Baugebiet bereits erschlossen */
  baugebiet?: boolean;
  /** Felder abseits öffentlicher Straßen, für die die Gestattung des Grundstückseigentümers geklärt und bezahlt ist (A45) */
  gestattungen?: number[];
  /** Version des Kartenlayouts (Straßen, Fluss); ältere Spielstände werden beim Laden angepasst (A46) */
  karte?: number;
  /** Name des Spielers, mit dem die Helfer ihn ansprechen (A51) */
  spieler?: string;
  /** A50: Sekunden, in denen die Anschlussnehmer zufrieden waren (Mundpropaganda) */
  zufrieden_s?: number;
  antraege: Partial<Record<TypId, Foerderantrag>>;
  zuletzt_ms: number;
  erledigt: Record<string, boolean>;
  gemocht: Record<string, boolean>;
  quelle_gewaehlt: boolean;
  deko_anzahl: number;
}

/** Ergebnis der Netzberechnung für einen Zustand. */
export interface Netz {
  /** Leitungsfeld (y*N+x) → Tiefe ab Heizzentrale (1 = direkt am Heizhaus) */
  tiefe: Map<number, number>;
  eltern: Map<number, number>;
  reihenfolge: number[];
  /** Last in kW, die durch das Leitungsfeld fließen muss */
  last_kw: Map<number, number>;
  kapazitaet_ok: Map<number, boolean>;
  /** A49: Leitungen schaffen bei größerer Spreizung mehr (Faktor 1 = Basisspreizung) */
  spreizung_faktor: number;
  /** Leitungsfelder, die ein Planungsfehler sind (dünn → dick in Fließrichtung) */
  engpass: Set<number>;
  /** A67: Leitungsfelder, an denen die Leitung ohne Abzweig dünner wird (Planungsfehler) */
  reduzierung: Set<number>;
  /** Anschlusspunkt je Gebäude-ID (-1 = direkt am Heizhaus) */
  anschluss: Map<number, { feld: number; tiefe: number }>;
  warm: Set<number>;
  /** kalt: 'leitung' (Engpass) oder 'waerme' (Erzeugung reicht nicht) */
  kalt: Map<number, 'leitung' | 'waerme' | 'station'>;
  verfuegbar_kw: number;
  genutzt_kw: number;
  bedarf_kw: number;
  betriebskosten_eur_min: number;
  einnahmen_eur_min: number;
  pv_faktor: number;
  strom_kw: number;
  /** A36: Strom, der über den Eigenbedarf hinaus ins Stromnetz geht */
  einspeisung_kw: number;
  /** Laststärke je Innenquelle */
  laeuft_mit_kw: Map<InnenQuelle, number>;
  belegung: Int32Array;
  nachId: Map<number, Objekt>;
}
