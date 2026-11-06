/**
 * Testhilfe NR18-P0 (Bauplan NR18 Fassung 3, Abschnitt 7 Vorarbeit): neue Kern-Aufrufe aus NR18 nur über diese Datei,
 * mit Typumweg, damit `npm run typecheck` vor P1/P2 grün bleibt. Gibt es die Methode noch nicht, wirft der Aufruf
 * einen sprechenden Fehler – der Test ist dann rot, bis das genannte Paket gebaut ist.
 */
import type { Ergebnis, Spiel } from '../../src/core/spiel';
import { KONSTANTEN, type TypId } from '../../src/core/katalog';
import type { Objekt } from '../../src/core/typen';

type Nr18Kern = {
  ersatzPlanen?(id: number, neu: TypId): Ergebnis;
  geplanteLeitungTyp?(id: number, neu: TypId): Ergebnis;
  abschnittWarnungen?(): string[];
  erreichteHaeuser?(): number[];
};

function methode<K extends keyof Nr18Kern>(s: Spiel, name: K, paket: string): NonNullable<Nr18Kern[K]> {
  const f = (s as unknown as Nr18Kern)[name];
  if (typeof f !== 'function') throw new Error(`NR18: Spiel.${String(name)} fehlt noch (kommt mit ${paket})`);
  return (f as (...a: unknown[]) => unknown).bind(s) as NonNullable<Nr18Kern[K]>;
}

/** P2: Ersatz (dickere Leitung) für eine gebaute Leitung im offenen Bauabschnitt planen. */
export const ersatzPlanen = (s: Spiel, id: number, neu: TypId): Ergebnis => methode(s, 'ersatzPlanen', 'NR18-P1/P2')(id, neu);
/** P2: Typ einer geplanten Leitung im offenen Abschnitt ändern. */
export const geplanteLeitungTyp = (s: Spiel, id: number, neu: TypId): Ergebnis => methode(s, 'geplanteLeitungTyp', 'NR18-P1/P2')(id, neu);
/** P1 (leer) / P2: Warnliste des Bauabschnitts. */
export const abschnittWarnungen = (s: Spiel): string[] => methode(s, 'abschnittWarnungen', 'NR18-P1/P2')();
/** P2: Häuser, die über gebaute und eingezeichnete Leitungen mit der Heizzentrale verbunden sind. */
export const erreichteHaeuser = (s: Spiel): number[] => methode(s, 'erreichteHaeuser', 'NR18-P1/P2')();
/** AE-NR18-4: geplanter Ersatz an einer gebauten Leitung (Feld `ersatz`, ab P1 im Typ). */
export const ersatzVon = (o: Objekt | undefined): { typ: TypId; nr: number } | undefined =>
  (o as (Objekt & { ersatz?: { typ: TypId; nr: number } }) | undefined)?.ersatz;

/** Uhr für Abläufe mit Bauzeiten. */
export type Uhr = { t: number };

/** Uhr in 10-s-Schritten vorstellen (wie die bestehenden A91-Tests), damit Bauenden in der richtigen Reihenfolge fallen. */
export function vorstellen(s: Spiel, z: Uhr, sek: number): void {
  for (let i = 0; i < Math.ceil(sek / 10); i++) { z.t += 10_000; s.bis(z.t); }
}

/** Bauabschnitt bei Philipp planen und warten, bis er offen ist. Gibt false zurück, wenn das Planen abgelehnt wurde. */
export function abschnittOeffnen(s: Spiel, z: Uhr): boolean {
  if (!s.abschnittPlanen().ok) return false;
  vorstellen(s, z, KONSTANTEN.abschnitt_planung_s * KONSTANTEN.bauzeit_faktor + 10);
  return s.stand.abschnitt?.phase === 'offen';
}

/** Offenen Abschnitt abschließen, Material bestellen und die Bauzeit abwarten. */
export function abschnittBauen(s: Spiel, z: Uhr): { abschliessen: Ergebnis; bestellen: Ergebnis } {
  const abschliessen = s.abschnittAbschliessen();
  const bestellen = s.materialBestellen();
  vorstellen(s, z, KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor + 10);
  return { abschliessen, bestellen };
}

/** Objekt auf einem Feld (Leitung oder Gebäude, dessen linke obere Ecke dort liegt). */
export const objektBei = (s: Spiel, x: number, y: number, pruefe: (o: Objekt) => boolean = () => true): Objekt | undefined =>
  s.stand.objekte.find((o) => o.x === x && o.y === y && pruefe(o));
