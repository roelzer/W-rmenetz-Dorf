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

interface Plan { id: string; name: string; beschreibung: string; seed: number; anzahl: number; mfhAnteil: number; klinik: boolean }

/** Erfundene Häuser rund um die Dorfmitte – nur bis die echten Gebäudedaten eingebunden sind. */
function platzhalterOrt(p: Plan): Ort {
  const r = zufall(p.seed);
  const haeuser = [...STARTHAEUSER];
  const gross: Ort['gross'] = [{ typ: 'bad', x: 3, y: 3 }, { typ: 'gewerbe', x: 19, y: 4 }];
  if (p.klinik) gross.push({ typ: 'klinik', x: 18, y: 18 });
  const belegt = (x: number, y: number, s: number): boolean =>
    [...haeuser, ...gross].some((o) => {
      const so = o.typ === 'mfh' || o.typ === 'bad' || o.typ === 'gewerbe' || o.typ === 'klinik' ? 2 : 1;
      return x < o.x + so + 1 && o.x < x + s + 1 && y < o.y + so + 1 && o.y < y + s + 1;
    }) || (x >= 10 && x <= 14 && y >= 9 && y <= 12) || (x >= 6 && x <= 8 && y >= 9 && y <= 11) || (x >= 10 && x <= 12 && y >= 6 && y <= 8);
  let versuche = 0;
  while (haeuser.length < p.anzahl + STARTHAEUSER.length && versuche++ < 4000) {
    const typ: TypId = r() < p.mfhAnteil ? 'mfh' : r() < 0.3 ? 'rh' : 'efh';
    const s = typ === 'mfh' ? 2 : 1;
    const x = 2 + Math.floor(r() * (N - 5)), y = 2 + Math.floor(r() * (N - 5));
    if (Math.hypot(x - 11, y - 10) > 9 || belegt(x, y, s)) continue;
    haeuser.push({ typ, x, y });
  }
  return { id: p.id, name: p.name, platzhalter: true, beschreibung: p.beschreibung, haeuser, gross };
}

export const ORTE: ReadonlyArray<Ort> = [
  platzhalterOrt({ id: 'hilpoltstein', name: 'Hilpoltstein', beschreibung: 'Kreisstadt: viele Wohnhäuser, Hallenbad, Klinik und ein Sägewerk als Großabnehmer.', seed: 91, anzahl: 18, mfhAnteil: 0.25, klinik: true }),
  platzhalterOrt({ id: 'dornhausen', name: 'Dornhausen', beschreibung: 'Kleines Dorf: wenige Häuser, ein Sägewerk mit Abwärme und ein Hallenbad.', seed: 17, anzahl: 8, mfhAnteil: 0.08, klinik: false }),
  platzhalterOrt({ id: 'obermaessing', name: 'Obermässing', beschreibung: 'Mittelgroßes Dorf mit Hallenbad und Sägewerk; die Häuser stehen etwas verstreut.', seed: 44, anzahl: 11, mfhAnteil: 0.12, klinik: false }),
];

export const STANDARD_ORT = 'hilpoltstein';
export function ortHolen(id: string | undefined): Ort {
  return ORTE.find((o) => o.id === id) ?? (ORTE.find((o) => o.id === STANDARD_ORT) as Ort);
}
