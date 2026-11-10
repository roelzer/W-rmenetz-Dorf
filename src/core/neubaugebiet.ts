import { KONSTANTEN, type TypId } from './katalog';
import { ortHolen } from './orte';
import type { Spielstand } from './typen';

const N = KONSTANTEN.feldanzahl;
const strassen: Array<[number, number]> = [];
const fluss: Array<[number, number]> = [];
const parzellen: Array<{ typ: TypId; x: number; y: number; bau_s: number }> = [];
for (let y = N; y < KONSTANTEN.neubau_hoehe; y++) {
  strassen.push([10, y]);
  fluss.push([19, y], [20, y]);
  // Ein Feld Vorland bleibt für den Abzweig zwischen Haupttrasse und Haus.
  for (const [seite, x] of [8, 12].entries()) {
    const i = (y - N) * 2 + seite;
    parzellen.push({ typ: i % 3 === 0 ? 'efh' : 'rh', x, y, bau_s: (y - N + seite) % 2 ? 90 + Math.floor(i / 2) * 90 : 0 });
  }
}

const erweitert = new Map<string, ReturnType<typeof ortHolen>>();
export function spielOrt(stand: Pick<Spielstand, 'ort' | 'neubaugebiet'>): ReturnType<typeof ortHolen> {
  const ort = ortHolen(stand.ort);
  if (!stand.neubaugebiet) return ort;
  let plan = erweitert.get(ort.id);
  if (!plan) {
    plan = { ...ort, strassen: [...ort.strassen, ...strassen], fluss: [...ort.fluss, ...fluss] };
    erweitert.set(ort.id, plan);
  }
  return plan;
}

export function neubaugebietAnlegen(stand: Spielstand, zeit_ms: number): void {
  if (stand.neubaugebiet) return;
  for (const { typ, x, y, bau_s } of parzellen) {
    stand.objekte.push({
      id: stand.naechste_id++, typ, x, y, stufe: 1, bestand: true, ohne_station: true,
      kasse_eur: 0, zufriedenheit_pct: 80,
      bau: bau_s ? { art: 'neu', start_ms: zeit_ms, ende_ms: zeit_ms + bau_s * 1000 } : null,
    });
  }
  stand.neubaugebiet = true;
}
