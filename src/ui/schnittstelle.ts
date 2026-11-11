import type { Spiel } from '../core/spiel';
import type { TypId } from '../core/katalog';
import type { Bedienung, TippMeldung } from '../core/tutorial-vertrag';
import type { Sperre } from './bausteine';

/** Was die Oberflächenteile von der Steuerung brauchen (und nicht mehr). */
export interface Ui {
  readonly spiel: Spiel;
  /** aktuelle Zeit in ms (für Restzeiten) */
  jetzt_ms(): number;
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
  neubaugebietZeigen?(): void;
  /** NR13: Blätter melden reine Bedienschritte an das Tutorial (AE-NR13-5) */
  tutorialMelden(m: TippMeldung): void;
  /** NR13: Sperre eines Knopfs durch das Tutorial; null = frei */
  tutorialSperreKnopf(b: Bedienung): Sperre | null;
}
