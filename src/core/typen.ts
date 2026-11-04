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
  /** Leitungsfelder, die ein Planungsfehler sind (dünn → dick in Fließrichtung) */
  engpass: Set<number>;
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
  /** Laststärke je Innenquelle */
  laeuft_mit_kw: Map<InnenQuelle, number>;
  belegung: Int32Array;
  nachId: Map<number, Objekt>;
}
