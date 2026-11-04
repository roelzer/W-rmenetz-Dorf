import type { Spiel } from '../core/spiel';
import type { TypId } from '../core/katalog';

/** Was die Oberflächenteile von der Steuerung brauchen (und nicht mehr). */
export interface Ui {
  readonly spiel: Spiel;
  /** Spielstand wurde durch eine Aktion verändert */
  geaendert(): void;
  toast(text: string): void;
  /** Gebäude platzieren (Vorschau + Bestätigen) */
  platzieren(typ: TypId): void;
  /** Leitungen legen (Tippen oder Ziehen) */
  stempeln(typ: TypId): void;
  verschieben(id: number): void;
  katalog(kategorie?: string): void;
  kontext(id: number | null): void;
  /** Münzflug zum Geld-Symbol und Funken */
  einsammeln(id: number): void;
}
