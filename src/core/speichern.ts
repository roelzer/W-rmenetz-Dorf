import { KATALOG, KONSTANTEN, istLeitung, type TypId } from './katalog';
import { belegungskarte, groesse } from './netz';
import { ortHolen } from './orte';
import { neuerSpielstand } from './spiel';
import type { Spielstand } from './typen';

export const SPEICHER_SCHLUESSEL = 'waermedorf-spielstand-v1';
/** Aktuelle Form des Spielstands. Bei jeder Änderung des Datenmodells erhöhen und unten migrieren. */
export const SPEICHER_VERSION = 3;

/** Zustand → JSON. Nur der Spielstand, keine Darstellungsfelder. */
export function serialisieren(stand: Spielstand): string {
  return JSON.stringify(stand, (k, v) => (k === '_pop' ? undefined : v));
}

export type LadeBefund = 'neu' | 'ok' | 'migriert' | 'defekt';

/** Leitungs-Namen der Versionen 1 (p1/p2/p3) → Durchmesser (etwa gleiche Rohrgröße). */
const ALTE_LEITUNGEN: Record<string, TypId> = { p1: 'd25', p2: 'd50', p3: 'd110' };

const ALTE_PREISE_CT = [10, 12, 14, 16, 18];
const istZahl = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Prüft jedes Objekt und jede Heizhaus-Quelle gegen den Katalog. Ein unbekannter Typ macht den Stand unbrauchbar. */
function gueltig(d: Partial<Spielstand>): d is Spielstand {
  if (!d || !Array.isArray(d.objekte) || !Array.isArray(d.innen)) return false;
  if (!istZahl(d.geld_eur) || !istZahl(d.taler) || !istZahl(d.naechste_id) || !istZahl(d.zuletzt_ms) || !istZahl(d.preisstufe)) return false;
  if (typeof d.name !== 'string' || !d.erledigt || typeof d.erledigt !== 'object' || !d.gemocht || !d.antraege) return false;
  for (const o of d.objekte) {
    if (!o || !(o.typ in KATALOG) || !istZahl(o.x) || !istZahl(o.y) || !istZahl(o.id) || !istZahl(o.stufe)) return false;
  }
  for (const k of d.innen) if (!k || !(k.typ in KATALOG) || KATALOG[k.typ].kategorie !== 'innen' || !istZahl(k.stufe)) return false;
  // Neue optionale Felder (A33, A41): unbrauchbare Werte machen den Stand unbrauchbar, statt Bauabschnitte für immer zu blockieren
  if (d.vorlauf_c !== undefined && !istZahl(d.vorlauf_c)) return false;
  if (d.abschnitt !== undefined) {
    const a = d.abschnitt as { phase?: unknown; bau?: { ende_ms?: unknown } | null };
    if (!a || !['planung', 'offen', 'bestellen', 'bau'].includes(a.phase as string)) return false;
    if ((a.phase === 'planung' || a.phase === 'bau') && !(a.bau && istZahl(a.bau.ende_ms))) return false;
  }
  for (const o of d.objekte) if (o.upgrade !== undefined && !istZahl(o.upgrade)) return false;
  return d.objekte.some((o) => o.typ === 'hz');
}

/**
 * NR18: Die automatische Wegsuche ist weg, ihr Merkmal `gruppe` (gemeinsam zurücknehmen) auch. Ein geplanter Ersatz gilt nur
 * an einer gebauten Leitung, mit einem dickeren Leitungstyp und einer Zahl als Nummer – alles andere würde das Netz mit einem
 * fremden Typ rechnen oder „Zurück“ verwirren. Ein kaputter Ersatz kostet nur den Plan, nicht den ganzen Stand.
 */
function nr18Aufraeumen(stand: Spielstand): void {
  const kapazitaet = (t: TypId): number => KATALOG[t].kapazitaet_kw ?? 0;
  for (const o of stand.objekte) {
    delete (o as { gruppe?: unknown }).gruppe;
    if (o.ersatz === undefined) continue;
    const e = o.ersatz as { typ?: unknown; nr?: unknown } | null;
    const typ = e && typeof e === 'object' ? e.typ : undefined;
    const gueltigerErsatz = typeof typ === 'string' && istLeitung(typ as TypId) && istLeitung(o.typ) && !o.geplant
      && kapazitaet(typ as TypId) > kapazitaet(o.typ) && istZahl((e as { nr?: unknown }).nr);
    if (!gueltigerErsatz) delete o.ersatz;
  }
}

/**
 * A46: Ältere Spielstände kennen Straßen und Fluss nicht. Gebäude auf Straße/Fluss ziehen auf das nächste freie Feld um,
 * Landschaft (Bäume, Steine, Büsche) und Leitungen im Fluss verschwinden, Pläne für Leitungen im Fluss werden verworfen.
 */
export function karteAnpassen(stand: Spielstand): boolean {
  if (stand.karte === 2) return false;
  const ort = ortHolen(stand.ort), N = KONSTANTEN.feldanzahl;
  const strasse = new Set(ort.strassen.map(([x, y]) => y * N + x)), fluss = new Set(ort.fluss.map(([x, y]) => y * N + x));
  const istLeit = (t: string): boolean => KATALOG[t as keyof typeof KATALOG].kategorie === 'netz';
  const kante = (o: Spielstand['objekte'][number]): number => groesse(o);
  const blockiert = (o: Spielstand['objekte'][number], x: number, y: number): boolean => {
    const k = kante(o);
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) { const f = (y + dy) * N + x + dx; if (fluss.has(f) || strasse.has(f)) return true; }
    return false;
  };
  let geaendert = false;
  stand.objekte = stand.objekte.filter((o) => {
    if (!(o.typ in KATALOG)) return true;
    if (istLeit(o.typ)) {
      if (!fluss.has(o.y * N + o.x)) return true;
      // Review: Gebaute Leitungen im Fluss verschwinden, ihr Preis wird erstattet (geplante waren noch nicht bezahlt).
      if (!o.geplant) stand.geld_eur += (KATALOG[o.typ].kosten_eur ?? [0])[0];
      geaendert = true; return false;
    }
    if (!blockiert(o, o.x, o.y)) return true;
    const kat = KATALOG[o.typ].kategorie;
    if (o.landschaft || ['stein', 'busch', 'baum'].includes(o.typ) || kat === 'deko' && fluss.has(o.y * N + o.x)) { geaendert = true; return false; }
    return true;
  });
  const frei = (o: Spielstand['objekte'][number], x: number, y: number): boolean => {
    const k = kante(o);
    if (x < 0 || y < 0 || x + k > N || y + k > N || blockiert(o, x, y)) return false;
    const bel = belegungskarte(stand.objekte, o);
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) if (bel[(y + dy) * N + x + dx]) return false;
    return true;
  };
  for (const o of stand.objekte) {
    if (!(o.typ in KATALOG) || istLeit(o.typ) || !blockiert(o, o.x, o.y)) continue;
    let ziel: [number, number] | null = null;
    // Review: Großabnehmer ziehen auf ihren Platz im neuen Ortsplan (z. B. das Sägewerk über den Fluss hinweg an seine Straße).
    const platz = ort.gross.find((g) => g.typ === o.typ);
    if (platz && frei(o, platz.x, platz.y)) ziel = [platz.x, platz.y];
    for (let r = 1; r < N && !ziel; r++) for (let dy = -r; dy <= r && !ziel; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (frei(o, o.x + dx, o.y + dy)) { ziel = [o.x + dx, o.y + dy]; break; }
    }
    if (ziel) { o.x = ziel[0]; o.y = ziel[1]; geaendert = true; }
  }
  stand.karte = 2;
  return geaendert;
}

/**
 * JSON → Spielstand mit Befund. Version 1 wird umgeschrieben, kaputte oder fremde Daten ergeben ein neues Spiel
 * (Befund 'defekt', damit die Oberfläche den Spieler informiert und den alten Text sichern kann).
 */
export function ladenMitBefund(text: string | null, jetzt_ms: number): { stand: Spielstand; befund: LadeBefund } {
  if (!text) return { stand: neuerSpielstand(jetzt_ms), befund: 'neu' };
  try {
    const d = JSON.parse(text) as Omit<Partial<Spielstand>, 'version'> & { version?: number };
    let migriert = false;
    if (d && d.version === 1 && Array.isArray(d.objekte)) {
      d.version = 2 as number;
      for (const o of d.objekte) if (o && typeof o.typ === 'string' && o.typ in ALTE_LEITUNGEN) { o.typ = ALTE_LEITUNGEN[o.typ]; migriert = true; }
      migriert = true;
    }
    if (d && d.version === 2 && istZahl(d.preisstufe)) {
      // Version 3: Wärmepreis 7–15 ct/kWh in neun Stufen (vorher fünf Stufen 10–18 ct)
      d.preisstufe = Math.max(0, Math.min(8, Math.round(ALTE_PREISE_CT[d.preisstufe] ?? 12) - 7));
      d.version = SPEICHER_VERSION; migriert = true;
    }
    if (d && d.version === SPEICHER_VERSION && gueltig(d as Partial<Spielstand>)) {
      nr18Aufraeumen(d as Spielstand);
      if (karteAnpassen(d as Spielstand)) migriert = true;
      // A86: Wer den alten Vorgabenamen behalten hat, bekommt den fiktiven Dorfnamen (selbst gewählte Namen bleiben).
      // Bewusst kein 'migriert': der Start-Hinweis dazu spricht von Straßen und Fluss; der neue Name wird beim nächsten Speichern geschrieben.
      if ((d as Spielstand).name === 'Hilpoltstein') (d as Spielstand).name = ortHolen((d as Spielstand).ort).name;
      return { stand: d as Spielstand, befund: migriert ? 'migriert' : 'ok' };
    }
  } catch (fehler) {
    console.warn('Spielstand nicht lesbar', fehler);
  }
  return { stand: neuerSpielstand(jetzt_ms), befund: 'defekt' };
}

export function laden(text: string | null, jetzt_ms: number): Spielstand {
  return ladenMitBefund(text, jetzt_ms).stand;
}

/** Nach „Spielstand löschen“ darf beim Neuladen (pagehide) nichts mehr zurückgeschrieben werden (A56). */
let geloescht = false;
export function speicherLoeschen(speicher: Pick<Storage, 'removeItem'>): void {
  geloescht = true;
  speicher.removeItem(SPEICHER_SCHLUESSEL);
}
export function speichernErlaubt(): boolean { return !geloescht; }

/** A83: Dateiname für eine Sicherung des Spielstands (Dorfname + Datum, nur sichere Zeichen). */
export function sicherungsDateiname(stand: Spielstand, datum: Date): string {
  const dorf = (stand.name || 'dorf').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'dorf';
  return `heatville-${dorf}-${datum.toISOString().slice(0, 10)}.json`;
}

/** A83: größte Sicherungsdatei in Zeichen bzw. Byte (ein Spielstand hat wenige 10 kB) */
export const SICHERUNG_MAX_ZEICHEN = 5_000_000;

/** A83: Eine Sicherungsdatei einspielen. Nur ein lesbarer Spielstand wird übernommen; danach ist das Zurückschreiben
 *  des alten Stands gesperrt (wie beim Löschen), damit beim Neuladen nichts überschrieben wird. */
export function sicherungEinspielen(speicher: Pick<Storage, 'setItem'>, text: string, jetzt_ms: number): { ok: true; stand: Spielstand } | { ok: false; grund: string } {
  if (text.length > SICHERUNG_MAX_ZEICHEN) return { ok: false, grund: 'Die Datei ist zu groß für einen Spielstand.' };
  const { stand, befund } = ladenMitBefund(text, jetzt_ms);
  if (befund === 'defekt' || befund === 'neu') return { ok: false, grund: 'Die Datei ist kein lesbarer Heatville-Spielstand.' };
  try { speicher.setItem(SPEICHER_SCHLUESSEL, serialisieren(stand)); } catch (fehler) {
    console.warn('Sicherung ließ sich nicht schreiben', fehler);
    return { ok: false, grund: 'Der Speicher auf dem Gerät ist voll – die Sicherung wurde nicht übernommen.' };
  }
  geloescht = true;
  return { ok: true, stand };
}
