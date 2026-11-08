import { istLeitung, KATALOG } from '../core/katalog';
import type { Netz, Objekt } from '../core/typen';
import type { Kamera } from './kamera';
import { blase } from './blase';
import type { Szene } from './szene';

/** Wie oft muss neu gezeichnet werden, damit sichtbare Bewegung weiterläuft? */
export type AnimBedarf = 'keine' | 'langsam' | 'fluessig';

/** Dauer der Aufpop-Animation und des Federns der Warndreiecke in ms (gebaeude.ts FEDERN_MS: `1 − (jetzt − _pop) / 450`). */
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

/** DESIGN 13.17.8 Punkt 2: Die Streifen blenden 200 ms ein, ab dem ersten Bild, in dem ein Feld neu in `tutorial_fremd` steht. */
export const FREMD_EINBLENDEN_MS = 200;

/**
 * Einzige Stelle, die sich die Streifen-Einblendung merkt: welche Felder zuletzt gezeichnet wurden und seit wann eingeblendet
 * wird. Schreiben darf nur das Zeichnen (szene.ts, zeichneTutorialEbene über fremdEinblendungMerken); der Takt liest nur.
 */
const fremdStreifen = { felder: new Set<string>(), seit_ms: 0 };

const hatNeue = (felder: ReadonlyArray<readonly [number, number]>): boolean => felder.some(([x, y]) => !fremdStreifen.felder.has(`${x},${y}`));
const anteil = (seit_ms: number, jetzt_ms: number): number => Math.min(1, Math.max(0, (jetzt_ms - seit_ms) / FREMD_EINBLENDEN_MS));

/**
 * Reine Abfrage: Anteil 0…1 der Einblendung, den das nächste Bild zeigt. Felder, die noch nie gezeichnet wurden, stehen bei 0 –
 * ihr Einblenden beginnt erst mit dem Bild, das sie zeichnet.
 */
export function fremdEinblendung(felder: ReadonlyArray<readonly [number, number]>, jetzt_ms: number): number {
  if (hatNeue(felder)) return 0;
  return anteil(fremdStreifen.seit_ms, jetzt_ms);
}

/** Vom Zeichnen je Bild aufgerufen: Kommt ein Feld neu hinzu, beginnt das Einblenden mit diesem Bild. Gibt den Anteil 0…1 zurück. */
export function fremdEinblendungMerken(felder: ReadonlyArray<readonly [number, number]>, jetzt_ms: number): number {
  if (hatNeue(felder)) fremdStreifen.seit_ms = jetzt_ms;
  fremdStreifen.felder = new Set(felder.map(([x, y]) => `${x},${y}`));
  return anteil(fremdStreifen.seit_ms, jetzt_ms);
}

/** Vergisst die gemerkten Felder, damit Tests ohne Vorgeschichte beginnen. */
export function fremdEinblendungZuruecksetzen(): void {
  fremdStreifen.felder = new Set();
  fremdStreifen.seit_ms = 0;
}

/** Ändert sich genau dann, wenn sich etwas Sichtbares an der Szene ändert (Kamera NICHT). */
export function szenenSchluessel(s: Szene): string {
  const teile: string[] = [];
  for (const o of s.objekte) {
    teile.push([
      o.id, o.typ, o.x, o.y, o.stufe, ja(!!o.bau), ja(o.geplant), ja(o.gekuendigt), ja(o.interessent), o.anfrage ?? '',
      ja(o.ohne_station), o.station ?? '', o.zustand ?? '', ja(o.vorsehung), o.upgrade ?? 0, ja(o.hauspuffer),
      ja(o.vollversorgung), ja(o.aufgestockt), ja((o.zufriedenheit_pct ?? 80) < 40), ja(ploppAktiv(o, s.jetzt_ms)),
      o.ersatz?.typ ?? '', // NR18: geplanter Ersatz zeigt die Planraute
    ].join(','));
  }
  teile.push('innen');
  for (const q of s.innen) teile.push(`${q.typ},${q.stufe},${ja(!!q.bau)}`);
  const g = s.geist, st = s.stempel;
  teile.push(
    `netz,${netzNummer(s.netz)}`, s.modus, `${s.auswahl_id ?? ''}`, `${s.verschiebe_id ?? ''}`,
    g ? `${g.typ},${g.x},${g.y},${g.kante},${ja(g.ok)}` : '', st ? `${st.x},${st.y},${ja(st.ok)}` : '',
    `${s.kw_anzeigen ?? ''}`, s.spiel?.abschnitt?.phase ?? '', `${s.strassen?.length ?? 0}`, `${s.fluss?.length ?? 0}`,
    // NR13/NR20: Tutorial-Zeichen sind sichtbar und ändern sich ohne Objektänderung
    `erreicht,${(s.erreicht ?? []).map((e) => e.id).join(';')}`,
    `band,${(s.tutorial_band ?? []).map((f) => `${f.x},${f.y},${f.typ},${ja(f.aktiv)},${ja(f.falsch)},${f.pfeil?.join(',') ?? ''}`).join(';')}`,
    `raute,${s.naechstes_feld?.join(',') ?? ''}`, `zielscheibe,${s.zielscheibe?.join(',') ?? ''}`,
    `ziel,${s.ziel?.stecker.join(';') ?? ''},${s.ziel?.ring ?? ''}`, `ruhe,${ja(s.ruhe)}`, `fremd,${koordinaten(s.tutorial_fremd)}`,
    `blass,${ja(s.stecker_blass)}`,
    // NR22: Saum, Dreiecke und ihre Deckkraft; `seit_ms` gehört dazu, weil ein neues Federn ein neues Bild braucht
    `ueberlast,${(s.ueberlast ?? []).map((u) => `${u.felder.join(';')}/${u.dreiecke.join(';')}/${ja(u.geplant)}/${u.seit_ms}`).join(':')}`,
    `vorschau,${s.ueberlast_vorschau?.typ ?? ''},${s.ueberlast_vorschau?.felder.join(';') ?? ''}`,
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
  if (s.erreicht?.length) return 'fluessig'; // „Erreicht“-Zeichen wippt und federt (szene.ts, zeichneBlase)
  if (s.ziel?.stecker.length) return 'fluessig'; // Ziel-Stecker wippt wie jede Blase (gebaeude.ts, zeichneBlase)
  // NR22 E7: Überlast blinkt nicht; flüssig nur, solange ein Warndreieck federt (szene.ts, zeichneWarndreiecke)
  if (s.ueberlast?.some((u) => s.jetzt_ms >= u.seit_ms && s.jetzt_ms - u.seit_ms < PLOPP_MS)) return 'fluessig';
  if (s.tutorial_fremd?.length && fremdEinblendung(s.tutorial_fremd, s.jetzt_ms) < 1) return 'fluessig'; // Streifen blenden ein (szene.ts, zeichneFremd)
  if (s.innen.some((q) => q.typ === 'wpg')) return 'fluessig'; // Rotor der Großwärmepumpe (gebaeude.ts:135)
  for (const o of s.objekte) {
    if (o.bau) return 'fluessig'; // Gerüst mit Arbeiterarm (gebaeude.ts:274)
    if (ploppAktiv(o, s.jetzt_ms)) return 'fluessig';
    if (o.typ === 'brunnen') return 'fluessig'; // Wasserspiel (gebaeude.ts:98)
    const kat = KATALOG[o.typ].kategorie;
    if (kat === 'gross' && o.zustand === 'vertrag' && o.typ !== 'bad' && o.typ !== 'klinik') return 'fluessig'; // Rauch (gebaeude.ts:205)
    const angeschlossen = netz.anschluss.has(o.id);
    if (o.interessent && !angeschlossen) return 'fluessig'; // gelber Puls (szene.ts:240)
    if (s.spiel && !s.ruhe && !istLeitung(o.typ) && blase(s.spiel, netz, o, netz.warm.has(o.id), angeschlossen)) return 'fluessig'; // Wippen (gebaeude.ts:217)
  }
  if (s.innen.some((q) => q.bau)) return 'langsam'; // Baubalken am Heizhaus
  if (s.objekte.some((o) => o.upgrade_auftrag)) return 'langsam';
  return 'keine';
}
