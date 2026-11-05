import type { TypId } from './katalog';
import { zufall } from './zufall';

/** Ein spielbarer Ort (A21): Gebäude mit Typ (= geschätzter Verbrauch) an Kartenfeldern. */
export interface Ort {
  id: string;
  name: string;
  /** true = noch keine echten Gebäudedaten, die Häuser sind erfunden (Platzhalter) */
  platzhalter: boolean;
  /** Kurzbeschreibung für die Ortswahl */
  beschreibung: string;
  /** Quellenangabe der Gebäudedaten (bei OpenStreetMap-Daten Pflicht) */
  quelle?: string;
  /** Wohn- und Gewerbegebäude als Kunden-Kandidaten (Heizt zunächst mit Öl) */
  haeuser: Array<{ typ: TypId; x: number; y: number }>;
  /** Großverbraucher / Abwärmequellen (immer gesperrt, bis der Vertrag steht) */
  gross: Array<{ typ: TypId; x: number; y: number }>;
  /** Straßenfelder (nur Optik und Lage der Häuser): Häuser stehen an Straßen, Leitungen dürfen darüber liegen */
  strassen: Array<[number, number]>;
  /** Gewässerfelder (Fluss): hier darf nichts gebaut werden; Leitungen kommen nur per Spülbohrung hinüber (A46) */
  fluss: Array<[number, number]>;
}

/** Geschätzter Haustyp aus der Grundfläche des Gebäudes (Spielwert, keine Norm): Wohnverbrauch wächst mit der Fläche. */
export function typAusGrundflaeche(m2: number): TypId | null {
  if (m2 < 40) return null; // Garage, Schuppen: kein Wärmekunde
  if (m2 < 150) return 'efh';
  if (m2 < 260) return 'rh';
  return 'mfh';
}

const N = 24;
const STARTHAEUSER: Array<{ typ: TypId; x: number; y: number }> = [
  { typ: 'efh', x: 9, y: 13 }, { typ: 'efh', x: 12, y: 14 }, { typ: 'efh', x: 13, y: 12 },
];

/** Straßennetz der Stadt (öffentlicher Raum): Hauptstraße, Ring- und Querstraßen, Nebenstraßen und Sackgassen. Nur hier dürfen Leitungen ohne Gestattung liegen. */
export function strassenNetz(): Array<[number, number]> {
  const f: Array<[number, number]> = [];
  const h = (y: number, x0: number, x1: number): void => { for (let x = x0; x <= x1; x++) f.push([x, y]); };
  const v = (x: number, y0: number, y1: number): void => { for (let y = y0; y <= y1; y++) f.push([x, y]); };
  v(10, 0, N - 1);            // Hauptstraße Nord–Süd
  h(6, 0, N - 1);             // Querstraße Nord
  h(17, 0, N - 1);            // Querstraße Süd
  v(17, 0, N - 1);            // Ringstraße Ost
  v(5, 2, 21);                // Ringstraße West
  h(21, 5, 17);               // Südring
  h(2, 5, 17);                // Nordring
  v(13, 18, 22);              // Sackgasse Süd
  v(21, 2, 19);               // Straße am Ostufer
  h(11, 18, 21);              // Brücke über den Fluss
  h(9, 0, 4);                 // Stichstraße West
  v(7, 12, 16);               // Sackgasse West
  const seen = new Set<number>();
  return f.filter(([x, y]) => { const k = y * N + x; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Fluss von Nord nach Süd östlich der Stadt (zwei Felder breit). Die Brücke trägt die Straße, aber keine Leitung. */
export function flussNetz(): Array<[number, number]> {
  const f: Array<[number, number]> = [];
  for (let y = 0; y < N; y++) f.push([19, y], [20, y]);
  return f;
}

interface Plan { id: string; name: string; beschreibung: string; seed: number; anzahl: number; mfhAnteil: number; klinik: boolean }

/** Erfundene Häuser rund um die Dorfmitte – nur bis die echten Gebäudedaten eingebunden sind. */
function platzhalterOrt(p: Plan): Ort {
  const r = zufall(p.seed);
  const haeuser = [...STARTHAEUSER];
  const gross: Ort['gross'] = [{ typ: 'bad', x: 3, y: 3 }, { typ: 'gewerbe', x: 22, y: 3 }];
  if (p.klinik) gross.push({ typ: 'klinik', x: 15, y: 18 });
  const strassen = strassenNetz();
  const fluss = flussNetz();
  const strasse = new Set(strassen.map(([x, y]) => y * N + x));
  const wasser = new Set(fluss.map(([x, y]) => y * N + x));
  const anStrasse = (x: number, y: number, s: number): boolean => {
    for (let i = 0; i < s; i++) for (const [fx, fy] of [[x + i, y - 1], [x + i, y + s], [x - 1, y + i], [x + s, y + i]]) if (strasse.has(fy * N + fx)) return true;
    return false;
  };
  const aufStrasse = (x: number, y: number, s: number): boolean => {
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) if (strasse.has((y + dy) * N + x + dx) || wasser.has((y + dy) * N + x + dx)) return true;
    return false;
  };
  const belegt = (x: number, y: number, s: number): boolean =>
    aufStrasse(x, y, s) || [...haeuser, ...gross].some((o) => {
      const so = o.typ === 'mfh' || o.typ === 'bad' || o.typ === 'gewerbe' || o.typ === 'klinik' ? 2 : 1;
      return x < o.x + so + 1 && o.x < x + s + 1 && y < o.y + so + 1 && o.y < y + s + 1;
    }) || (x >= 10 && x <= 14 && y >= 9 && y <= 12) || (x >= 6 && x <= 8 && y >= 9 && y <= 11) || (x >= 10 && x <= 12 && y >= 6 && y <= 8);
  let versuche = 0;
  while (haeuser.length < p.anzahl + STARTHAEUSER.length && versuche++ < 20000) {
    const typ: TypId = r() < p.mfhAnteil ? 'mfh' : r() < 0.3 ? 'rh' : 'efh';
    const s = typ === 'mfh' ? 2 : 1;
    const x = 2 + Math.floor(r() * (N - 5)), y = 2 + Math.floor(r() * (N - 5));
    if (Math.hypot(x - 11, y - 10) > 10 || !anStrasse(x, y, s) || belegt(x, y, s)) continue;
    haeuser.push({ typ, x, y });
  }
  return { id: p.id, name: p.name, platzhalter: true, beschreibung: p.beschreibung, haeuser, gross, strassen, fluss };
}

export const ORTE: ReadonlyArray<Ort> = [
  platzhalterOrt({ id: 'hilpoltstein', name: 'Hilpoltstein', beschreibung: 'Kreisstadt: viele Wohnhäuser, Hallenbad, Klinik und ein Sägewerk als Großabnehmer.', seed: 91, anzahl: 18, mfhAnteil: 0.25, klinik: true }),
];

export const STANDARD_ORT = 'hilpoltstein';
export function ortHolen(id: string | undefined): Ort {
  return ORTE.find((o) => o.id === id) ?? (ORTE.find((o) => o.id === STANDARD_ORT) as Ort);
}
