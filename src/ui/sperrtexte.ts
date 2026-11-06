import { ABSCHNITT_HELFER, GRUNDGEBUEHR, KONSTANTEN, PREISSTUFEN, VORLAUF } from '../core/katalog';
import { abStufe, merkmalName, type Merkmal } from '../core/freischaltung';
import type { Spiel } from '../core/spiel';
import { zeitText } from '../render/gebaeude';
import type { Sperre } from './bausteine';
import { eur } from './dom';

// Sperrgründe (Zeile 2) und Hinweise beim Antippen gesperrter Knöpfe nach DESIGN.md 12.20 – an einer Stelle, damit das Spiel
// überall gleich spricht. Werte stammen aus Kern und Katalog, nie fest im Text. Im Seitenblatt normale Leerzeichen
// (ENTSCHEIDUNGEN 2026-11-05, Antwort 1).

/** Grund an Knöpfen, die ohne offenen Bauabschnitt nichts tun können (Hausblatt, Zeichenleiste). */
export const OHNE_ABSCHNITT = 'braucht offenen Bauabschnitt';

/** DESIGN.md 12.18/12.19: Hinweis beim Antippen von Knöpfen, die ohne Bauabschnitt gesperrt sind. */
export const OHNE_ABSCHNITT_HINWEIS = `Erst mit ${ABSCHNITT_HELFER.planung} einen Bauabschnitt planen: Bauen → Leitungen.`;

/** Hausanschluss-Erklärsatz, kurze Fassung für die Zeichenleiste (Fachprüfung, ENTSCHEIDUNGEN 2026-11-05). */
export const HAUSANSCHLUSS_KURZ = 'Endet eine Leitung an einem Haus, ist es sein Hausanschluss – er muss dick genug für das Haus sein.';

/** 12.20 Regel 6: Stufen-Hinweis; `name` nur, wenn der Satz einen Artikel braucht („Den Vorlauf-Regler …“). */
export const stufenHinweis = (m: Merkmal, name = merkmalName(m)): string => `${name} gibt es ab Heizzentrale Stufe ${abStufe(m)}. Baue die Heizzentrale aus.`;

/** 12.20 Regel 5: Fehlbetrag auf ganze Euro aufgerundet – die Geldanzeige rundet ab, mit diesem Betrag reicht es sicher.
 *  `null`, wenn nichts mehr fehlt. */
export const geldHinweis = (fehlt_eur: number): string | null =>
  fehlt_eur > 0 ? `Dir fehlen noch ${eur(Math.ceil(fehlt_eur))}. Am Monatsende zahlen deine Kunden ihre Wärmerechnung.` : null;

/** 12.20 Regel 5, Taler; `null`, wenn nichts mehr fehlt. */
export const talerHinweis = (fehlt: number): string | null =>
  fehlt > 0 ? `Dir fehlen noch ${fehlt} Dorftaler. Du bekommst sie für Aufträge und beim Wegräumen.` : null;

/** 12.20 Regel 4: Von mehreren Gründen zählt der erste – Aufrufer geben sie in der Rangfolge Stufe › Bauabschnitt ›
 *  Bedingung/Ziel › beschäftigt/Bau läuft › Geld/Taler an. */
export const ersteSperre = (...gruende: Array<Sperre | null>): Sperre | null => gruende.find((g) => g !== null) ?? null;

/** Gesperrt, solange die Heizzentrale die Stufe für `m` nicht hat (Schloss, Grund aus dem Kern). */
export function stufenSperre(sp: Spiel, m: Merkmal, name?: string): Sperre | null {
  const grund = sp.sperrgrund(m);
  return grund === null ? null : { grund, schloss: true, hinweis: stufenHinweis(m, name) };
}

/** Fehlt nur Geld: Preis bleibt in Zeile 2, kein Schloss; der Fehlbetrag wird erst beim Antippen berechnet. */
export function geldSperre(sp: Spiel, preis_eur: number): Sperre | null {
  return sp.stand.geld_eur < preis_eur ? { grund: null, schloss: false, hinweis: () => geldHinweis(preis_eur - sp.stand.geld_eur) } : null;
}

/** Fehlen Taler: wie Geld; der Preis kann beim Tippen ein anderer sein (Sofort fertig wird mit der Zeit billiger). */
export function talerSperre(sp: Spiel, preis: () => number): Sperre | null {
  return sp.stand.taler < preis() ? { grund: null, schloss: false, hinweis: () => talerHinweis(preis() - sp.stand.taler) } : null;
}

const restText = (ende_ms: number, jetzt_ms: number): string => zeitText(Math.ceil(Math.max(0, ende_ms - jetzt_ms) / 1000));

/** 12.20 B1–B4: Knöpfe, die einen offenen Bauabschnitt brauchen; Restzeiten gelten zum Zeitpunkt des Antippens. */
export function abschnittSperre(sp: Spiel, jetzt_ms: () => number): Sperre | null {
  const a = sp.abschnitt, { planung, material } = ABSCHNITT_HELFER;
  if (!a) return { grund: OHNE_ABSCHNITT, schloss: true, hinweis: OHNE_ABSCHNITT_HINWEIS };
  const rest = (): string => restText(a.bau?.ende_ms ?? 0, jetzt_ms());
  if (a.phase === 'planung') return { grund: `${planung} plant noch`, schloss: true, hinweis: () => `${planung} plant den Bauabschnitt noch (${rest()}). Danach kannst du zeichnen.` };
  if (a.phase === 'bestellen') return { grund: 'Abschnitt ist geplant', schloss: true, hinweis: `Abschnitt wartet auf ${material}s Bestellung. Ändern: Bauen → Leitungen → Weiter einzeichnen.` };
  if (a.phase === 'bau') return { grund: 'Abschnitt wird gebaut', schloss: true, hinweis: () => `Der Bauabschnitt wird gerade gebaut (${rest()}). Danach kannst du den nächsten planen.` };
  return null;
}

/** 12.20 B5 */
export const ANSCHLUSS_GEPLANT: Sperre = { grund: 'kommt mit dem Bauabschnitt', schloss: false, hinweis: 'Der Hausanschluss ist schon eingeplant. Gebaut wird er mit dem Bauabschnitt.' };

/** DESIGN.md 12.21 Punkt 1: Kurzformen für Zeile 2 in der engen Zeichenleiste (≤ 18 Zeichen); Hinweise wie im Seitenblatt. */
const ABSCHNITT_KURZ = { keiner: 'kein Bauabschnitt', planung: 'wird noch geplant', bestellen: 'Bestellung offen', bau: 'Abschnitt im Bau' } as const;
export function abschnittSperreKurz(sp: Spiel, jetzt_ms: () => number): Sperre | null {
  const s = abschnittSperre(sp, jetzt_ms), phase = sp.abschnitt?.phase ?? 'keiner';
  return s && phase !== 'offen' ? { ...s, grund: ABSCHNITT_KURZ[phase] } : s;
}

/** 12.20 B6 */
export const NICHTS_GEZEICHNET: Sperre = { grund: 'noch nichts gezeichnet', schloss: false, hinweis: 'Noch nichts gezeichnet. Wähle eine Leitung und zieh sie in der Karte.' };

/** 12.21 Punkt 1 B6 in der Zeichenleiste (Kurzform) */
export const NICHTS_GEZEICHNET_KURZ: Sperre = { ...NICHTS_GEZEICHNET, grund: 'nichts gezeichnet' };

/** 12.21 Punkt 1 B7: „Zurück“ ohne geplante Leitung – der schmale Knopf hat keine Zeile 2 */
export const NICHTS_ZURUECK: Sperre = { grund: null, schloss: false, hinweis: 'Noch nichts gezeichnet – es gibt nichts zurückzunehmen.' };

/** 12.20 S3 */
export const ZIELE_OFFEN: Sperre = { grund: 'Ziele noch offen', schloss: true, hinweis: 'Erst alle Ziele für die nächste Stufe erreichen – sie stehen weiter oben im Blatt.' };

/** 12.20 H1: Die fehlenden Bedingungen werden beim Antippen neu gelesen; sind alle erfüllt, läuft das Unterschreiben. */
export function vertragSperre(fehlt: readonly string[], fehltJetzt: () => readonly string[]): Sperre | null {
  if (!fehlt.length) return null;
  return {
    grund: `noch ${fehlt.length} ${fehlt.length === 1 ? 'Bedingung' : 'Bedingungen'} offen`, schloss: true,
    hinweis: () => { const f = fehltJetzt(); return f.length ? `Für den Vertrag fehlt noch: ${f[0]}${f.length > 1 ? ` (und ${f.length - 1} weitere)` : ''}.` : null; },
  };
}

/** 12.20 H3: Zeile 2 nennt die kürzeste Restzeit beim Aufbau, der Hinweis die beim Antippen; ist inzwischen ein Helfer frei,
 *  läuft der Auftrag. `naechsterFrei_ms` liefert das früheste Auftragsende oder `null`, wenn ein Helfer frei ist. */
export function helferSperre(naechsterFrei_ms: () => number | null, jetzt_ms: () => number): Sperre | null {
  const ende = naechsterFrei_ms();
  if (ende === null) return null;
  return {
    grund: `nächster frei in ${restText(ende, jetzt_ms())}`, schloss: false,
    hinweis: () => { const e = naechsterFrei_ms(); return e === null ? null : `Alle Helfer sind gerade beschäftigt. Der nächste ist in ${restText(e, jetzt_ms())} frei.`; },
  };
}

/** 12.20 H4 */
export const OHNE_STATION: Sperre = { grund: 'erst Station wählen', schloss: true, hinweis: 'Dieses Haus hat noch keine Übergabestation. Wähle oben im Blatt erst eine.' };

/** 12.20 Z3 */
export function baugebietSperre(ist: number): Sperre | null {
  const soll = KONSTANTEN.baugebiet_anschluesse;
  return ist >= soll ? null : { grund: `${ist}/${soll} Häuser versorgt`, schloss: true, hinweis: `Für das Baugebiet brauchst du ${soll} versorgte Häuser – dir fehlen noch ${soll - ist}.` };
}

/** 12.20 R2–R4: Hinweise an den Rändern der Regler; Grenzen aus dem Katalog. */
export const RAND = {
  vorlaufMin: `Im Spiel geht der Vorlauf nur bis ${VORLAUF.min_c} °C hinunter.`,
  vorlaufMax: `Im Spiel geht der Vorlauf nur bis ${VORLAUF.max_c} °C hinauf.`,
  preisMin: `Günstiger geht es im Spiel nicht: ${PREISSTUFEN[0].ct_je_kwh} ct/kWh ist der niedrigste Preis.`,
  preisMax: `Teurer geht es im Spiel nicht: ${PREISSTUFEN[PREISSTUFEN.length - 1].ct_je_kwh} ct/kWh ist der höchste Preis.`,
  gebuehrMin: `Die Grundgebühr geht im Spiel nicht unter ${GRUNDGEBUEHR.min_eur} € im Monat.`,
  gebuehrMax: `Die Grundgebühr geht im Spiel nicht über ${GRUNDGEBUEHR.max_eur} € im Monat.`,
} as const;

/** 12.20 D1 */
export const schonGemocht = (dorf: string): string => `Du hast ${dorf} schon ein Gefällt mir gegeben.`;
