import { istLeitung, KATALOG } from '../core/katalog';
import type { Netz, Objekt } from '../core/typen';
import type { Kamera } from './kamera';
import { blase, type Szene } from './szene';

/** Wie oft muss neu gezeichnet werden, damit sichtbare Bewegung weiterläuft? */
export type AnimBedarf = 'keine' | 'langsam' | 'fluessig';

/** Dauer der Aufpop-Animation in ms (gebaeude.ts: `1 − (jetzt − _pop) / 450`). */
const PLOPP_MS = 450;

/** Kamerawerte auf 1e-4 runden: Gleitkomma-Rauschen soll den Boden nicht neu bauen (wie der Kameraschlüssel). */
const runde = (v: number): number => Math.round(v * 1e4) / 1e4;

/**
 * Jedes Netz-Objekt bekommt eine fortlaufende Nummer. `Spiel.neuBerechnen` erzeugt bei jeder Änderung ein neues Netz;
 * damit erfasst der Schlüssel Wärme, Anschlüsse, Lasten und Überlast, ohne das ganze Netz zu verketten.
 */
const netzNummern = new WeakMap<Netz, number>();
let naechsteNetzNummer = 0;
function netzNummer(n: Netz): number {
  let nr = netzNummern.get(n);
  if (nr === undefined) { nr = ++naechsteNetzNummer; netzNummern.set(n, nr); }
  return nr;
}

function ploppAktiv(o: Objekt, jetzt_ms: number): boolean {
  return !!o._pop && jetzt_ms - o._pop < PLOPP_MS;
}

const ja = (b: boolean | undefined): string => (b ? '1' : '0');
const koordinaten = (felder: ReadonlyArray<readonly [number, number]> | undefined): string =>
  (felder ?? []).map(([x, y]) => `${x},${y}`).join(';');

/** Ändert sich genau dann, wenn sich etwas Sichtbares an der Szene ändert (Kamera NICHT). */
export function szenenSchluessel(s: Szene): string {
  const teile: string[] = [];
  for (const o of s.objekte) {
    teile.push([
      o.id, o.typ, o.x, o.y, o.stufe, ja(!!o.bau), ja(o.geplant), ja(o.gekuendigt), ja(o.interessent), o.anfrage ?? '',
      ja(o.ohne_station), o.station ?? '', o.zustand ?? '', ja(o.vorsehung), o.upgrade ?? 0, ja(o.hauspuffer),
      ja(o.vollversorgung), ja(o.aufgestockt), ja((o.zufriedenheit_pct ?? 80) < 40), ja(ploppAktiv(o, s.jetzt_ms)),
    ].join(','));
  }
  teile.push('innen');
  for (const q of s.innen) teile.push(`${q.typ},${q.stufe},${ja(!!q.bau)}`);
  const g = s.geist, st = s.stempel;
  teile.push(
    `netz,${netzNummer(s.netz)}`, s.modus, `${s.auswahl_id ?? ''}`, `${s.verschiebe_id ?? ''}`,
    g ? `${g.typ},${g.x},${g.y},${g.kante},${ja(g.ok)}` : '', st ? `${st.x},${st.y},${ja(st.ok)}` : '',
    `${s.kw_anzeigen ?? ''}`, s.spiel?.abschnitt?.phase ?? '', `${s.strassen?.length ?? 0}`, `${s.fluss?.length ?? 0}`,
  );
  return teile.join('|');
}

/** Schlüssel der Bodenebene: alles, was zeichneBoden liest, plus Kamera ohne Verschiebung. */
export function bodenSchluessel(s: Szene, k: Kamera): string {
  // Leitungen gehören bewusst nicht hinein: sonst baut jede neue Leitung beim Einzeichnen den Boden neu.
  const haeuser = s.objekte.filter((o) => KATALOG[o.typ].kategorie === 'haus')
    .map((o) => `${o.x},${o.y},${o.typ},${o.stufe},${ja(!!o.bau)}`).join(';');
  return [
    runde(k.tw), runde(k.winkel_rad), runde(k.breite), runde(k.hoehe), runde(k.pixelverhaeltnis),
    koordinaten(s.strassen), koordinaten(s.fluss), haeuser, ja(s.modus !== 'normal'),
  ].join('|');
}

/** Schnellste Animation, die gerade sichtbar ist. Jeder Grund verweist auf die Stelle, die mit der Zeit zeichnet. */
export function animationBedarf(s: Szene, effekte_aktiv: boolean): AnimBedarf {
  const netz = s.netz;
  if (effekte_aktiv) return 'fluessig';
  if (netz.genutzt_kw > 0) return 'fluessig'; // Rauch der Heizzentrale (gebaeude.ts:144)
  for (const last of netz.last_kw.values()) if (last > 0) return 'fluessig'; // Wärmepunkte (szene.ts:427)
  if (s.modus === 'platzieren' || s.modus === 'verschieben') return 'fluessig'; // Pfeil der Vorschau (szene.ts:292)
  if (s.auswahl_id != null) return 'fluessig'; // laufender Auswahlring (szene.ts:218)
  if (s.fluss?.length) return 'fluessig'; // Wasserglitzern (szene.ts:83)
  if (s.innen.some((q) => q.typ === 'wpg')) return 'fluessig'; // Rotor der Großwärmepumpe (gebaeude.ts:135)
  for (const o of s.objekte) {
    if (o.bau) return 'fluessig'; // Gerüst mit Arbeiterarm (gebaeude.ts:274)
    if (ploppAktiv(o, s.jetzt_ms)) return 'fluessig';
    if (o.typ === 'brunnen') return 'fluessig'; // Wasserspiel (gebaeude.ts:98)
    const kat = KATALOG[o.typ].kategorie;
    if (kat === 'gross' && o.zustand === 'vertrag' && o.typ !== 'bad' && o.typ !== 'klinik') return 'fluessig'; // Rauch (gebaeude.ts:205)
    const angeschlossen = netz.anschluss.has(o.id);
    if (o.interessent && !angeschlossen) return 'fluessig'; // gelber Puls (szene.ts:240)
    if (s.spiel && !istLeitung(o.typ) && blase(s.spiel, netz, o, netz.warm.has(o.id), angeschlossen)) return 'fluessig'; // Wippen (gebaeude.ts:217)
  }
  if (s.innen.some((q) => q.bau)) return 'langsam'; // Baubalken am Heizhaus
  if (s.objekte.some((o) => o.upgrade_auftrag)) return 'langsam';
  for (const ok of netz.kapazitaet_ok.values()) if (!ok) return 'langsam'; // Überlast blinkt 4/s (szene.ts:374)
  return 'keine';
}
