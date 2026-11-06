# Bauplan NR13 – Pflicht-Tutorial „Simon zeigt dir dein erstes Netz“

Stand 2026-11-06, Architekt, Fassung 1. **Basis 67aa359** (= bd1121b main + zwei Doku-Zeilen). Grundlage: Lastenheft NR13 (mit Präzisierung 06.11.), A29, NR18-D (1); DESIGN.md Abschnitt 13 (13.1–13.12); Bauplan NR18 Fassung 3 (AE-NR13-1, AE-NR13-2, 5.4 Zuordnung T01–T26, Abschnitt 9 Tutorial-Fragen); ENTSCHEIDUNGEN 2026-11-06 (Simon: T-F1 ohne Leitung, T-F2 Wandstation gesperrt bis 3. Haus, T-F3 „Ohne Tutorial“ nur mit Vorführ-Tempo, T-F4 kein Abgleich, T-F5 Foto folgt).

## 1. Ziel und Abnahme (Tests mit „nr13“ im Namen)
1. Ein **neues Spiel** startet nach dem Namensfenster im Tutorial (T01); ein **alter Stand** (ohne Merke) sieht es nie, sein Dorf bleibt unverändert.
2. Das Tutorial führt durch genau die Schritte T01–T26 aus DESIGN 13.5; jeder Schritt schaltet **nur** mit seiner Handlung weiter (13.12 Punkt 5); kein Überspringen, kein Wegtippen.
3. Am Ende: genau die zwei `ERSTE_HAEUSER` warm, ohne NR18-Warnung, Tutorial als fertig gemerkt; neu laden → kein Tutorial (13.12 Punkt 6).
4. Neu laden mitten im Tutorial setzt nach der Tabelle „Wiedereinstieg“ (13.7) wieder ein.
5. Wandstation ist im Tutorial gesperrt (Kern lehnt ab, Hausblatt zeigt „später wählbar“), danach frei.
6. Erster Bauabschnitt im Tutorial: Planung 10 s, Bau 20 s (NR2 „erster Abschnitt in ca. 1 Minute“); danach normale Zeiten.
7. Texte ≤ 120 Zeichen auch mit 20 Zeichen langem Namen, Zahlen aus dem Spiel (Katalogwert ändern → Text ändert sich).
8. „Ohne Tutorial starten“ gibt es nur, wenn das Vorführ-Tempo (×10/×60) an ist.

## 2. Abgrenzung
- **Nicht in NR13:** NR2 (Auftragstexte/-reihenfolge über c1/c2 hinaus), NR3 (Begriffsliste, Info-Knopf, Mini-Tutorials 13.13), „Abgleich“ (T-F4, später beim Rücklauf-Helfer), „Einführung ansehen“ (13.8 Kann), Simons echtes Foto (Platzhalter-Figur reicht; ein Foto unter `public/figuren/simon.webp` greift automatisch wie bei A52).
- NR3 soll später die fett markierten Sätze aus `TUTORIAL_SCHRITTE` per Schritt-Kennung lesen, nicht abschreiben (13.9 „eine Quelle“).
- Keine Änderung an Netzrechnung, Katalogpreisen, Speicherschlüssel (`waermedorf-spielstand-v1` bleibt), `SPEICHER_VERSION` (bleibt 3 – neues Feld ist optional wie `namen_gefragt`).

## 3. Bestand (gelesen)
- Spielstart: `src/core/start.ts:15` `neuerSpielstand` (ohne Leitung, ohne Station, Kessel vorgewählt), `:13` `ERSTE_HAEUSER = [[9,13],[12,14]]`. Aufrufer in Produktion: `src/core/speichern.ts:132,158` (Befund `neu`/`defekt`), `src/main.ts:48` (Absturz beim Öffnen). 29 Testdateien rufen `neuerSpielstand` direkt.
- Vertrag: `src/core/tutorial-vertrag.ts` (`Schritt`, `Tipp`, nur Typen); Kern sendet `schritt` (`spiel.ts` u. a. `:809, :820, :860, :1072, :1080`, `stationKaufen :644`); `erreichteHaeuser()` `spiel.ts:91`.
- Vorbild „Merke nur in neuen Spielen“: `namen_gefragt` (`typen.ts:118`, gesetzt nur in `start.ts`, alte Stände ohne Feld = nicht fragen). Start-Meldung NR18-D: `spiel.ts:367–377`, `steuerung.ts:110–117`.
- Ereignisschleife: `steuerung.ts:501–517` (`splice(0)`, `schritt` hat noch keinen Zweig); Namensfenster `steuerung.ts:90–107`; Zeichenleiste mit [Abschnitt abschließen] `steuerung.ts:245`; Baumenü-Knöpfe Philipp/Laura `ui/katalog.ts:82,107`; Sprecher-Karte `ui/sprecher.ts` (Figur per DOMParser, Foto-Erkennung); Tempo `src/tempo.ts:7` (`TEMPO_STUFEN` 1/10/60).
- Zeiten: `KONSTANTEN.abschnitt_planung_s 30`, `abschnitt_bau_s 360`, `bauzeit_faktor 2.5` (`katalog.ts:344–354`) → heute 75 s / 900 s.
- Architekturtests, die NR13 berühren: `tests/architektur/nr18-f2-struktur.test.ts` F1, F2a–d; `tests/architektur.test.ts` A19 (Kern ohne Browser, ohne `Date.now`). Quelltext-Prüfungen, die die Einbindung nicht brechen darf: `anpassungen.test.ts:1141` (Zeile `if (spiel.stand.namen_gefragt === false) this.namenFragen();` muss wörtlich bleiben), `a92-sperre.test.ts:191` (kein `.disabled = true`, Sperren über `sperre` am Knopf), `menue-v2.test.ts:101` (kein `'heiss'`).

## 4. Festlegungen
**AE-NR13-1 (erweitert) Spielstart an einer Stelle.** Neu: `neuesSpielMitTutorial(jetzt_ms, ortId?)` in `start.ts` = `neuerSpielstand(…)` plus `tutorial: { kapitel: 1 }`. Jeder Produktionsweg zu einem neuen Spiel (speichern.ts `neu`/`defekt`, main.ts-Notfall) ruft **nur** diese Funktion. `neuerSpielstand` bleibt das reine Startdorf (Tests). *Verhindert:* dass ein Produktionsweg ohne Tutorial startet, und dass 29 Testdateien plötzlich im Tutorial laufen (gemessen, Abschnitt 8). Architekturtest `nr13-tutorial` U4. *(Weicht bewusst von DESIGN 13.8 „nur neuerSpielstand setzt …“ ab – gleiche Wirkung für Spieler.)*

**AE-NR13-2 [ÜBERNOMMEN]** Tutorial hört zu (`schritt`, `tipp`) und fragt den Kern; rechnet keine Spielregel nach (F2a–F2d).

**AE-NR13-3 Tutorial-Merke an einer Stelle.** Bindet `Spielstand.tutorial?: { kapitel: number }`. Fehlt das Feld = kein Tutorial (alte Stände, fertig, übersprungen). Geschrieben wird es **nur** über Spiel-Methoden (`tutorialKapitelSetzen`, `tutorialBeenden`, `tutorialUeberspringen`), angelegt nur in `start.ts`, repariert nur in `speichern.ts`. Kein aktueller Schritt im Spielstand – der Wiedereinstieg liest den Zustand (13.7). Regel: Zuweisung/`delete` an `.tutorial` nur in `spiel.ts`, `start.ts`, `speichern.ts` (U1).

**AE-NR13-4 Schrittlogik nur im Kern, ohne Kreis.** Schrittfolge, Texte, Bedingungen, Wiedereinstieg, Fehltipp-Zähler und Sperren stehen in `src/core/tutorial.ts` (Klasse `Tutorial`), ohne Grafik testbar. Die Oberfläche kennt keine Schritt-Kennung, sie zeigt nur `TutorialAnsicht` und meldet `tipp`. `spiel.ts` importiert `./tutorial` nicht; `tutorial.ts` liest das Spiel über die Schnittstelle `TutorialLage` (Spiel erfüllt sie) und importiert nur `./tutorial-vertrag`, `./start`, `./typen`, `./katalog`. Regeln U2, U3, dazu F2c.

**AE-NR13-5 Bausteine sind dumm.** `src/ui/anleiter.ts` und `src/ui/spotlight.ts` bekommen fertige Werte (Ansicht, Rechtecke) und kennen weder `Spiel` noch `Tutorial` (U5). Die Verdrahtung macht nur `steuerung.ts`.

**AE-NR13-6 Eingabesperre an einer Stelle.** Berührungen außerhalb der Löcher und der Anleiter-Karte fängt **ein** Capture-Listener auf `window` (`pointerdown`, `pointerup`, `click`, `touchstart`, `wheel`, `keydown` außer Tab/Enter auf Ziel/[Weiter]) in `spotlight.ts` ab und meldet `tipp: 'daneben'`. Keine verstreuten `if (tutorial)`-Abfragen in Blättern für das Blockieren; Blätter fragen nur `ui.tutorialSperre(b)` für Sperren **innerhalb** eines Lochs (Zeichenleiste [X]/[?], [Abschnitt abschließen]).

**AE-NR13-7 Wandstation-Sperre setzt der Kern durch** (wie AE-A88-2): `stationKaufen` lehnt im Tutorial jede Nicht-Puffer-Station für Häuser ab; die Oberfläche fragt `spiel.wandstationFrei()`.

Konventionen wie bisher: kein `innerHTML`-Schreiben, SVG nur per DOMParser (U6); Sperren über `sperre` am Knopf (12.19), nie `disabled`; Texte mit Fachbegriff als `**Wort**` markiert, die Oberfläche baut daraus `<strong>`-Knoten per `textContent`.

## 5. Datenmodell und Migration
```ts
// typen.ts, Spielstand
/** NR13: Tutorial läuft (nur neue Spiele, AE-NR13-3). kapitel 1–6 = zuletzt begonnenes Kapitel (DESIGN 13.5).
 *  Fehlt = kein Tutorial (alte Stände, fertig, übersprungen). */
tutorial?: { kapitel: number };
```
- **Laden (`speichern.ts`, `nr13Aufraeumen`, nach `nr19Aufraeumen`):** `tutorial` vorhanden, aber kein Objekt oder `kapitel` keine ganze Zahl 1–6 → Feld **löschen** (nie ein altes Dorf ins Tutorial zwingen). Feld vorhanden, aber an einer der `ERSTE_HAEUSER`-Koordinaten steht kein Objekt der Kategorie `haus` → löschen. Kein Befund `migriert`, kein `defekt`.
- Alte Stände: keine Umwandlung, kein Tutorial. Sicherung einspielen (A83) mit laufendem Tutorial: läuft weiter (Wiedereinstieg).
- Kein Versionssprung (`SPEICHER_VERSION` bleibt 3).

## 6. Schnittstellen (Vertrag, P0 legt sie an; Namen verbindlich)
**`src/core/tutorial-vertrag.ts` – ergänzen (nur Typen; `Schritt`/`Tipp` unverändert, F2d):**
```ts
export type TutorialSchrittId = 'T01' | 'T02' | … | 'T26';          // 26 Werte, keine T13b (Zwischenmeldung von T13)
export type ZielName =
  | 'heizzentrale' | 'haus1' | 'haus2' | 'leitungsstueck' | 'karte'  // Karte (Rechteck aus Kamera)
  | 'waerme_pille' | 'geld_pille' | 'bauen'                          // HUD
  | 'reiter_leitungen' | 'philipp' | 'kasten_abschnitt' | 'leitungskarte' | 'laura'  // Baumenü
  | 'zeichenleiste' | 'abschliessen'                                 // Zeichenleiste
  | 'kasten_station' | 'puffer_knopf';                               // Hausblatt
export type Bedienung = 'zoom' | 'doerfer' | 'auftrag' | 'blatt_schliessen' | 'verwerfen' | 'sofort' | 'express'
  | 'weiter_einzeichnen' | 'abschliessen' | 'karte_gesten';
export interface TippMeldung { art: 'tipp'; tipp: Tipp; objekt_id?: number; typ?: TypId }
export interface TutorialWerte { kessel_kw: number; kwh: number; kw_ohne: number; kw_puffer: number; leitung: TypId; kap_kw: number }
export interface TutorialSperre { kurz: string; satz: string }   // kurz = Knopfzeile 2 (≤ 18 Z.), satz = Simon-Satz in der Blase
export interface TutorialAnsicht {
  schritt: TutorialSchrittId; kapitel: number; kapitel_name: string;
  art: 'W' | 'H'; text: string;                 // fertig eingesetzt, **fett**-Marken, ≤ 120 Zeichen ohne Marken
  wusstest_du: boolean;                         // T25
  ziele: ZielName[];                            // Löcher; bei art 'H' zeigt der Finger auf ziele[0]
  finger: boolean;
  abdunkeln: 'alles' | 'nur_hud' | 'nichts';
  weiter: 'weiter' | 'los' | 'wartet' | null;   // null = Handlungs-Schritt; 'wartet' = [Weiter] noch nicht frei (T11/T23)
  warte_text?: string; warte_bis_ms?: number;   // „Philipp plant noch …“ + Ende; Restzeit formatiert die Oberfläche
  hilfe?: string;                               // nach drei Fehltipps (13.5 Hilfe-Tabelle)
  kamera: 'steht' | 'fahrt' | 'frei'; kamera_ziele: ZielName[];
  leitung_typ?: TypId;                          // T12: Ziel 'leitungskarte' ist die Karte dieses Typs
  objekt_ids: { heizzentrale: number; haus1: number; haus2: number };
  normale_aktion: boolean;                      // false nur T01 (Heizzentrale öffnet kein Blatt)
  wiedereinstieg: boolean;                      // true = Blase „Weiter geht’s, {Name}! …“ vor dem eigentlichen Schritt
}
```
**`src/core/tutorial.ts` (P1):**
```ts
export interface TutorialLage {               // Spiel erfüllt sie strukturell
  readonly stand: Spielstand; readonly netz: { readonly warm: ReadonlySet<number> }; readonly spielerName: string;
  erreichteHaeuser(): number[]; tutorialWerte(): TutorialWerte; tutorialGeldFehlt_eur(): number;
  tutorialKapitelSetzen(kapitel: number): void; tutorialBeenden(): void;
}
export const TUTORIAL_TEXT_MAX = 120;
export const TUTORIAL_SCHRITTE: ReadonlyArray<{ id: TutorialSchrittId; kapitel: number; art: 'W' | 'H'; text: string; hilfe: string; … }>;
export function einstieg(lage: TutorialLage): TutorialSchrittId;     // Tabelle 13.7 „Wiedereinstieg“
export class Tutorial {
  constructor(lage: TutorialLage, opt?: { wiedereinstieg?: boolean });
  aktiv(): boolean;                                   // lage.stand.tutorial vorhanden
  ansicht(jetzt_ms: number): TutorialAnsicht | null;  // null, wenn nicht aktiv oder namen_gefragt === false
  tipp(m: TippMeldung): void;
  schritt(e: { schritt: Schritt; objekt_id?: number }): void;
  sperre(b: Bedienung): TutorialSperre | null;        // null = frei; außerhalb des Tutorials immer null
}
```
**`src/core/spiel.ts` (P2) – neue öffentliche Methoden:** `tutorialAktiv(): boolean`, `wandstationFrei(): boolean`, `tutorialWerte(): TutorialWerte`, `tutorialGeldFehlt_eur(): number`, `tutorialKapitelSetzen(kapitel: number): void`, `tutorialBeenden(): void`, `tutorialUeberspringen(): void`. Konstante `WANDSTATION_TUTORIAL = 'Im Tutorial nimmst du den Standard. Die Wandstation kannst du später wählen.'`.
**`src/core/start.ts` (P0):** `neuesSpielMitTutorial(jetzt_ms: number, ortId?: string): Spielstand`; `TUTORIAL_SPUR: ReadonlyArray<readonly [number, number]> = [[10,10],[10,11],[10,12],[10,13],[10,14],[11,14]]` (NR18 5.2).
**`src/core/katalog.ts` (P2):** `KONSTANTEN.tutorial_planung_s: 10`, `tutorial_bau_s: 20` – Echtzeit-Sekunden, **ohne** `bauzeit_faktor` (Tempo wirkt weiter über die Uhr).
**`src/render/szene.ts` `Szene` (P0, optional):** `tutorial_spur?: ReadonlyArray<readonly [number, number]>` (noch nicht eingezeichnete Spurfelder), `erreicht_ids?: ReadonlyArray<number>`.
**`src/ui/schnittstelle.ts` (P0):** `tutorialMelden(m: TippMeldung): void; tutorialSperre(b: Bedienung): TutorialSperre | null;` – in `Steuerung` als harmlose Leerlauf-Methoden (melden tut nichts, Sperre `null`), echt ab P4.

## 7. Pakete
| Paket | Inhalt | Dateien | Abhängig von | Parallel mit | Schwierigkeit |
|---|---|---|---|---|---|
| **P0** Vertrag (≤ 30 min) | Typen, Merke-Feld, Startfunktion, Aufrufer umstellen, Szene-/Schnittstellen-Felder | `core/tutorial-vertrag.ts`, `core/typen.ts`, `core/start.ts`, `core/speichern.ts` (2 Aufrufe), `main.ts` (1 Aufruf), `render/szene.ts` (Typ), `ui/schnittstelle.ts`, `steuerung.ts` (2 Leerlauf-Methoden), neu `tests/nr13-vertrag.test.ts` | – | – | einfach |
| **P1** Schrittlogik | Klasse `Tutorial`, Schrittliste T01–T26 mit Texten, Wiedereinstieg, Sperren, Fehltipps | neu `core/tutorial.ts`, neu `tests/nr13-tutorial-logik.test.ts` | P0 | P2, P3 | schwer |
| **P2** Kern-Anbindung | Zeiten, Wandstation-Sperre, Start-Meldung aus, Werte/Geld, Merke-Methoden, Laden reparieren | `core/spiel.ts`, `core/katalog.ts` (2 Konstanten), `core/speichern.ts` (`nr13Aufraeumen`), neu `tests/nr13-kern.test.ts` | P0 | P1, P3 | mittel |
| **P3** Bausteine | Anleiter-Karte, Spotlight + Eingabesperre, Finger, Simon-Figur, Spur, „Erreicht“-Zeichen, Kamerafahrt, Tokens | neu `ui/anleiter.ts`, neu `ui/spotlight.ts`, `ui/sprecher.ts`, `ui/symbole.ts`, `ui/stil.css`, `ui/tokens.ts` + `design/tokens.json` (13.10), `render/szene.ts` (Zeichnen, nicht Typ), `render/gebaeude.ts`, `render/kamera.ts`, neu `tests/nr13-bausteine.test.ts` | P0 | P1, P2 | mittel |
| **P4** Einbindung | Lebenszyklus, Ereignisse → Tutorial, Tipps, Namensfenster, Kamera, Toast-Stille, Ziele in Blättern, Zusammenspiel | `steuerung.ts`, `main.ts`, `ui/hud.ts`, `ui/katalog.ts`, `ui/kontext.ts`, neu `tests/nr13-einbindung.test.ts`, neu `tests/nr13-ablauf.test.ts` | P1, P2, P3 | – | schwer |

**Kritischer Pfad:** P0 (≤ 30 min) → P1 (längstes Paket der Welle) → P4. P1, P2, P3 laufen mit drei Entwicklern gleichzeitig (keine gemeinsamen Dateien: `render/szene.ts` ändert P0 nur im Typ `Szene`, P3 nur Zeichenfunktionen – P3 startet nach dem P0-Merge; `speichern.ts` ändert P0 nur die zwei Aufrufe, P2 danach `nr13Aufraeumen`). Die Einbindung P4 kommt zwangsläufig zuletzt, weil sie die drei Teile zusammensteckt; der Vertrag ist so geschnitten, dass P1–P3 je eigene Tests ohne die anderen haben (P1 mit nachgebauter `TutorialLage`, P3 mit DOM-Attrappe).

## 8. Baupläne

### Bauplan P0 – Vertrag (einfach: nur Typen, eine Drei-Zeilen-Funktion, drei Aufrufe)
- **Dateien:** wie Tabelle. `tutorial-vertrag.ts` bekommt die Typen aus Abschnitt 6 (nur `type`/`interface`, Import nur `type TypId` aus `./katalog`; die Wörter `function|class|const|let|var` dürfen auch außerhalb von Kommentaren nicht vorkommen, F2d).
- **Liefert:** alle Namen aus Abschnitt 6, die P0 zugeordnet sind. `neuesSpielMitTutorial` echt: `{ ...neuerSpielstand(jetzt_ms, ortId), tutorial: { kapitel: 1 } }`. `speichern.ts:132,158` und `main.ts:48` rufen sie statt `neuerSpielstand` (Import `main.ts` aus `./core/start`). `Steuerung.tutorialMelden(_m) {}` und `tutorialSperre(_b) { return null; }`.
- **Tests `tests/nr13-vertrag.test.ts`:** `test_nr13_neues_spiel_hat_merke` (`ladenMitBefund(null, T0)` → Befund `neu`, `stand.tutorial` = `{ kapitel: 1 }`); `test_nr13_kaputter_stand_hat_merke` (`'{kaputt'` → Befund `defekt`, Merke da); `test_nr13_alter_stand_ohne_merke` (`serialisieren(altesStartdorf(T0))` laden → `tutorial` undefined); `test_nr13_startdorf_gleich` (`neuesSpielMitTutorial(T0)` ohne `tutorial` deep-gleich `neuerSpielstand(T0)`).
- **Eskalation:** Wird nach P0 irgendein bestehender Test rot → STOP, melden (gemessen: keiner, Abschnitt 9).

### Bauplan P1 – Schrittlogik (schwer: Zustandsautomat mit 26 Schritten, Wiedereinstieg, Pflicht-Regeln)
- **Dateien:** neu `src/core/tutorial.ts`, neu `tests/nr13-tutorial-logik.test.ts`.
- **Nutzt:** Vertragstypen (P0), `ERSTE_HAEUSER` (start.ts), `KATALOG` (Kategorie, Leitungsname), `Spielstand` (typen.ts). **Nicht** `spiel.ts`, `netz.ts`, `engstelle.ts` (U3, F2c).
- **Liefert:** `TutorialLage`, `TUTORIAL_SCHRITTE`, `TUTORIAL_TEXT_MAX`, `einstieg`, `Tutorial` (Abschnitt 6).
- **Regeln:**
  - Schrittliste = DESIGN 13.5 wörtlich (Texte nach Fachprüfung, Stand 57dc2c5), mit Kapitel, Art, Löchern, Finger, Abdunkeln, Kamera (13.6: T01–T04 Heizzentrale steht; T05 Fahrt zu beiden Häusern; T06–T07 Haus 1; T08–T11 steht; T12–T14 frei mit Ziel Heizzentrale + beide Häuser; T15–T17 Haus 1; T18–T19 Haus 2; T20 steht; T21 Fahrt Mitte Häuser; T22–T26 steht), Hilfe-Satz (13.5-Tabelle). Kapitelnamen: „Die Heizzentrale“, „Planen mit Philipp“, „Leitung ziehen“, „Übergabestationen“, „Bauen“, „Warm!“.
  - Platzhalter aus `lage.tutorialWerte()` und `lage.spielerName`; Zahlen deutsch formatiert mit geschütztem Leerzeichen vor der Einheit („15.000 kWh“, „7,5 kW“); `{leitung}` = Kurzform aus dem Katalognamen („25er“).
  - Weiterschalten: W-Schritt nur mit `tipp: 'weiter'` (T26 heißt der Knopf `los`); H-Schritt nach Zuordnungstabelle NR18 5.4. Wo es einen Zustand gibt, entscheidet **der Zustand**, das Ereignis löst nur die Prüfung aus: T10 Abschnitt vorhanden; T11 [Weiter] frei, sobald Phase ≠ `planung`; T13 beide Häuser in `erreichteHaeuser()`; T14 Phase `bestellen`; T17/T19 Haus 1 bzw. 2 hat `station`; T21 Phase `bau`; T23 [Weiter] frei, sobald kein Abschnitt mehr da ist. Reine Tipps: T01 `heizzentrale`, T08/T20 `baumenue`, T09 `reiter_leitungen`, T12 `leitungskarte` **mit** `typ === leitung`, T15/T18 `haus` **mit** `objekt_id` des richtigen Hauses.
  - Beim Eintritt in einen H-Schritt, dessen Zustandsbedingung schon erfüllt ist, sofort weiter (13.7 „T12 → T13 schaltet sofort weiter → T14“); T09 entfällt, wenn direkt nach `baumenue` ein `reiter_leitungen` kommt (sendet P4).
  - T13b: Text wechselt, solange genau ein Tutorial-Haus erreicht ist; `haus_getrennt` → zurück auf T13-Text.
  - Fehltipps: `tipp: 'daneben'` zählt je Schritt; ab drei steht `hilfe` in der Ansicht; Schrittwechsel setzt zurück. Falscher Tipp oder falsches Objekt zählt **nicht** als Fehltipp und schaltet nicht.
  - Kapitelwechsel → `lage.tutorialKapitelSetzen(k)`. T26 `los` → `lage.tutorialBeenden()`; danach `aktiv()` false, `ansicht()` null.
  - `sperre(b)`: im Tutorial `zoom`, `doerfer`, `auftrag`, `verwerfen`, `sofort`, `express`, `weiter_einzeichnen` immer gesperrt; `karte_gesten` außer T12–T14; `blatt_schliessen` in T13 mit Satz „Die Leiste bleibt offen, bis beide Häuser erreicht sind.“; `abschliessen` in T13 mit `kurz` „noch 1 Haus fehlt“/„noch 2 Häuser fehlen“ (geschütztes Leerzeichen) und Satz „Zieh die Leitung bis an beide Häuser – folge der gelben Spur.“; zusätzlich gesperrt, wenn `tutorialGeldFehlt_eur() > 0`: kurz „zu teuer“, Satz „Das sind zu viele Leitungen – nimm mit Zurück ein paar weg.“
  - `einstieg(lage)` nach Tabelle 13.7 (Kapitel 1 → T01; kein Abschnitt und nicht beide Häuser mit Station → T08; Planung → T11; offen → T12; bestellen + Haus 1 ohne Station → T15, nur Haus 2 → T18, beide → T20; Bau → T22; kein Abschnitt und beide Häuser mit Station → T24). Mit `wiedereinstieg: true` zeigt die erste Ansicht den Satz „Weiter geht’s, {Name}! Wir waren gerade bei: {Kapitelname}.“ mit [Weiter], danach den Schritt.
- **Tests (`TutorialLage` als einfaches Objekt nachgebaut, keine Grafik):**
  - `test_nr13_reihenfolge_t01_bis_t26` – Kette aller richtigen Handlungen ergibt genau die Folge T01…T26, danach `beenden` einmal gerufen, `ansicht` null.
  - `test_nr13_jeder_schritt_wartet` – je Schritt: `weiter` in H-Schritten, jeder andere `Tipp`, jedes andere `Schritt`-Ereignis und das richtige Ereignis mit falscher `objekt_id` schalten nicht.
  - `test_nr13_wartet_auf_planung_und_bau` – T11/T23 `weiter: 'wartet'` mit `warte_bis_ms` = Abschnittsende; `weiter` dabei wirkungslos; nach Phasenwechsel `'weiter'`.
  - `test_nr13_t13_beide_haeuser` – erst ein Haus erreicht → Text T13b, Schritt bleibt T13; `haus_getrennt` → T13-Text; beide → T14.
  - `test_nr13_fehltipps_hilfe` – zwei `daneben` ohne, drittes mit Hilfe-Satz aus 13.5; nach Schrittwechsel weg.
  - `test_nr13_texte_laenge` – alle Texte mit 20-Zeichen-Namen und größten realistischen Werten (`kwh` 99.999) ≤ 120 Zeichen ohne `**`, höchstens 2 Sätze.
  - `test_nr13_texte_aus_werten` – `kessel_kw` 60 → „60 kW“ in T03; auf 75 geändert → „75 kW“; `leitung 'd32'` → „32er“ in T12 und `leitung_typ 'd32'`.
  - `test_nr13_wiedereinstieg_tabelle` – je Zeile der 13.7-Tabelle ein Fall → erwarteter Schritt; Kapitel 1 → T01; Ansicht mit `wiedereinstieg` zuerst.
  - `test_nr13_sperren` – Sperren wie oben je Schritt; außerhalb des Tutorials alle `null`; Geld-Sperre bei `tutorialGeldFehlt_eur() = 1`.
  - `test_nr13_ohne_namen_keine_ansicht` – `namen_gefragt: false` → `ansicht` null.
- **Randfälle:** Tutorial-Häuser fehlen in der Lage → `aktiv()` false (kein Absturz); doppelte Ereignisse (Wischen erzeugt viele `leitung_gezeichnet`) schalten höchstens einmal.
- **Eskalation:** Ein Text aus 13.5 passt mit 20-Zeichen-Namen nicht in 120 Zeichen → nicht kürzen, melden (Designer/Fachprüfer).
- **Risiko-Auslöser:** nein (keine Daten von außen, kein Netz).

### Bauplan P2 – Kern-Anbindung (mittel: kleine Eingriffe an bestehenden Aktionen, Spielstand-Laden)
- **Dateien:** `src/core/spiel.ts`, `src/core/katalog.ts` (nur `KONSTANTEN.tutorial_planung_s/tutorial_bau_s`), `src/core/speichern.ts` (nur `nr13Aufraeumen` und sein Aufruf), neu `tests/nr13-kern.test.ts`.
- **Nutzt:** `ERSTE_HAEUSER`, `neuesSpielMitTutorial` (P0), `passendeLeitung` (`spiel.ts:96`), `passendePufferStation`, `bedarfKw`, `abschnittKosten_eur` (`:726`), `stationspreis_eur`.
- **Liefert:** Methoden aus Abschnitt 6 (spiel.ts), `WANDSTATION_TUTORIAL`.
- **Regeln:**
  - `abschnittPlanen`/`materialBestellen`: bei `stand.tutorial` Dauer `tutorial_planung_s`/`tutorial_bau_s` × 1000 ms ohne `bauzeit_faktor`; `liefertage()` rechnet aus der tatsächlichen Dauer (im Tutorial „1 Tag“).
  - `stationKaufen`: bei `stand.tutorial`, Kategorie `haus` und Nicht-Puffer-Station → `this.nein(WANDSTATION_TUTORIAL)`, nichts bezahlt. `wandstationFrei()` = `!stand.tutorial`.
  - `startTippFaellig()` false, solange `stand.tutorial` da ist.
  - `tutorialWerte()`: `kessel_kw` = `netz.verfuegbar_kw`; für Haus 1: `kwh` = Jahresverbrauch, `kw_ohne` = `bedarfKw` ohne Puffer, `kw_puffer` = mit Puffer; `leitung` = `passendeLeitung(Summe kw_puffer beider Häuser)`, `kap_kw` deren `kapazitaet_kw`. Keine zweite Netzrechnung (AE-NR18-3).
  - `tutorialGeldFehlt_eur()` = max(0, Abschnittskosten + Preis der kleinsten passenden Puffer-Station je Tutorial-Haus ohne Station − Geld); 0 außerhalb der Phasen `offen`/`bestellen`.
  - `tutorialKapitelSetzen(k)` nur bei laufendem Tutorial und ganzer Zahl 1–6; `tutorialBeenden()`/`tutorialUeberspringen()` löschen das Feld.
  - `speichern.ts` `nr13Aufraeumen` nach Abschnitt 5.
- **Tests:**
  - `test_nr13_tutorial_zeiten` – Stand aus `neuesSpielMitTutorial`: Planung endet nach 10 s (`abschnitt_offen` bei 10,0 s, nicht bei 9,9 s), Bau nach 20 s; zweiter Abschnitt nach `tutorialBeenden` wieder 75 s / 900 s.
  - `test_nr13_wandstation_gesperrt` – im Tutorial Wandstation abgelehnt (Geld gleich, Hinweis = `WANDSTATION_TUTORIAL`), Puffer-Station geht; nach `tutorialBeenden` Wandstation am dritten Haus erlaubt; alter Stand: erlaubt.
  - `test_nr13_start_tipp_nicht_im_tutorial` – nach `namenSetzen` im Tutorial `startTippFaellig()` false; nach `tutorialUeberspringen` true.
  - `test_nr13_werte` – `tutorialWerte()` für das Startdorf: `kessel_kw` 60, `kw_puffer` = `kwh` ÷ `VOLLLASTSTUNDEN.mit_puffer_h` (× Nutzungsfaktor, wie `bedarfKw`), `leitung` 'd25' (DESIGN 13.9: 2 × 7,5 = 15 kW; ENTSCHEIDUNGEN 06.11. Kritik NR18 F2).
  - `test_nr13_leitung_traegt_ohne_warnung` – Tutorial-Spur mit `tutorialWerte().leitung` einzeichnen, abschließen → `abschnittWarnungen()` leer; zwei Puffer-Stationen, bestellen, bauen → beide `ERSTE_HAEUSER` warm (13.9 Test 2).
  - `test_nr13_geld_reicht` – Kosten des Tutorial-Ablaufs ≤ Startgeld − 5.000 € (13.9; erwartet Rest 14.460 € laut NR19-Abnahme); `tutorialGeldFehlt_eur()` dabei 0; bei Geld 1.000 € > 0.
  - `test_nr13_merke_laden` – kaputte Merke (`'x'`, `{kapitel: 9}`, `{kapitel: 1.5}`) → Feld weg, Befund nicht `defekt`; Merke bei verschobenem Haus 1 → weg; gültige Merke bleibt nach Speichern/Laden gleich.
- **Randfälle:** `tutorialUeberspringen` mitten im Tutorial (laufender Abschnitt behält seine kurze Restzeit – harmlos); Tempo ×60 wirkt über die Uhr.
- **Eskalation:** Liefert `passendeLeitung` für das Startdorf nicht 'd25' oder kommt eine Warnung → STOP, melden (dann stimmen Texte/Fachprüfung nicht).
- **Risiko-Auslöser:** nein (Spielstand lokal; Laden von außen ist schon über `gueltig` abgesichert, neues Feld wird nur gelöscht, nie interpretiert).

### Bauplan P3 – Bausteine (mittel: viele Maße aus DESIGN 13.2/13.3, Eingabesperre, Barrierefreiheit)
- **Dateien:** wie Tabelle. Nur DOM über `h()`/`textContent`, SVG per DOMParser (U6).
- **Nutzt:** Vertragstypen (`TutorialAnsicht`, `ZielName`), Szene-Felder (P0), bestehend `h` (`ui/dom.ts`), `knopf` (`ui/bausteine.ts`), Token-Zugriff wie heute.
- **Liefert (P4 baut darauf):**
  ```ts
  // ui/spotlight.ts
  export interface Rechteck { x: number; y: number; b: number; h: number }
  export interface Loch { r: Rechteck; form: 'ellipse' | 'rund'; radius_px?: number }
  export function spotlightSetzen(z: { loecher: Loch[]; abdunkeln: 'alles' | 'nur_hud' | 'nichts'; finger: Rechteck | null; ruhig: boolean; hud: Rechteck | null }): void;
  export function spotlightAus(): void;
  export function eingabeSperre(s: { erlaubt: (x: number, y: number) => boolean; daneben: () => void } | null): void;
  export function stupsen(ruhig: boolean): void;                 // 13.7 „falsch getippt“
  // ui/anleiter.ts
  export interface AnleiterPlatz { links: number; unten?: number; oben?: number; breite: number; figur_px: 112 | 72 }
  export function anleiterPlatz(frei: Rechteck, ziel: Rechteck | null, bild: { breite: number; hoehe: number }): AnleiterPlatz;
  export function anleiterZeigen(a: TutorialAnsicht, platz: AnleiterPlatz, aktionen: { weiter(): void }, restzeit?: string): void;
  export function anleiterRechteck(): Rechteck | null;          // für eingabeSperre und Toast-Lage
  export function anleiterAusblenden(): void;
  // ui/sprecher.ts
  export function sprecherAktiv(): boolean;                      // Anleiter blendet aus, solange Philipp/Laura sprechen (13.3)
  // render/kamera.ts
  fahrtZu(x: number, y: number, kante: number, ziel_x_px: number, ziel_y_px: number, zoom: number | null, dauer_ms: number, jetzt_ms: number): void;
  fahrtLaeuft(jetzt_ms: number): boolean;
  ```
  Szene zeichnet `tutorial_spur` (13.2 Leitungs-Spur, Pfeile alle drei Felder) und über `erreicht_ids` die Kunden-Blase mit grünem Haken (13.2 „Erreicht“-Zeichen); ohne die Felder zeichnet sie wie heute.
- **Regeln:** Maße/Farben/Zeiten nur aus Tokens (13.10 eintragen); Platzregel 13.3 vollständig in `anleiterPlatz` (rein rechnend, testbar); Finger 13.2, einzige Dauerbewegung, bei `ruhig` still; Simon-Platzhalter in `AUSSEHEN` (Jacke `#ff8a1f`, Kragen `#3a92ea`, kein Helm; Feld `kragen?` neu), Foto-Erkennung wie bisher; Blase `role="status"`, `aria-live="polite"`, Spotlight/Finger `aria-hidden`; [Weiter]/[Los geht’s] ≥ 44 px; Fett-Marken `**…**` → `<strong>`-Knoten. Kamerafahrt 1.200 ms `kurve.weich`, bei „Weniger Bewegung“ Schnitt mit Blende (13.6).
- **Tests `tests/nr13-bausteine.test.ts` (DOM-Attrappe wie `tests/hilfen/dom-attrappe.ts`):** `test_nr13_platz_ohne_blatt`, `test_nr13_platz_mit_seitenflaeche_844_und_667` (432 bzw. 336 px), `test_nr13_platz_ziel_unten_wechselt_nach_oben`, `test_nr13_anleiter_weiter_nur_bei_erklaer` (H-Schritt ohne Knopf; `wartet` zeigt gedämpften Wartetext, kein Knopf), `test_nr13_fett_ohne_html` (Text mit `<b>` im Namen erscheint als Text, `**kW**` als `<strong>`), `test_nr13_sperre_faengt_daneben` (Berührung außerhalb → `daneben` einmal, Ereignis kommt nicht an; innerhalb → kommt an), `test_nr13_simon_figur_platzhalter`, `test_nr13_kamerafahrt_endet_am_ziel` (nach 1.200 ms Lage = `zentrierenBei`-Lage; `ruhig` sofort), `test_nr13_spur_und_haken_nur_mit_feldern`.
- **Eskalation:** Eine Maßangabe aus 13.3 ist in 667×375 nicht einhaltbar → melden (Designer), nicht selbst ändern.
- **Risiko-Auslöser:** nein.

### Bauplan P4 – Einbindung (schwer: verbindet Kern und Oberfläche über viele Zustände, Lebenszyklus, Wiedereinstieg)
- **Dateien:** `src/steuerung.ts`, `src/main.ts`, `src/ui/hud.ts`, `src/ui/katalog.ts`, `src/ui/kontext.ts`, neu `tests/nr13-einbindung.test.ts`, neu `tests/nr13-ablauf.test.ts`.
- **Nutzt:** alles aus P0–P3.
- **Regeln:**
  - `Steuerung` hält `tutorial: Tutorial | null` (angelegt im Konstruktor, wenn `spiel.tutorialAktiv()`; `wiedereinstieg` = `namen_gefragt !== false`). Die Zeile `if (spiel.stand.namen_gefragt === false) this.namenFragen();` bleibt wörtlich.
  - `ereignisse()`: Zweig für `ev.art === 'schritt'` → `tutorial.schritt(ev)`; `hinweis`-Meldungen werden im Tutorial nicht gezeigt (13.3, Speicherfehler kommen nicht über Ereignisse und bleiben sichtbar); `sprecher` weiter zeigen. Nach jeder Verarbeitung Ansicht neu anwenden (Spotlight, Anleiter, Kamera, Szene-Felder `tutorial_spur` = `TUTORIAL_SPUR` ohne eingezeichnete Felder in T12–T13, `erreicht_ids` = `erreichteHaeuser()` ∩ Tutorial-Häuser in T13).
  - Tipps melden über `tutorialMelden`: Kartentipp auf Heizzentrale/Haus (`steuerung.ts` Tippbehandlung; bei `normale_aktion: false` kein Blatt), [Bauen] in `hud.ts`, Reiter und Leitungskarte (mit `typ`) in `katalog.ts` – öffnet das Baumenü schon auf „Leitungen“, direkt nach `baumenue` auch `reiter_leitungen` senden –, [Weiter]/[Los geht’s] aus der Anleiter-Karte, `daneben` aus `eingabeSperre`.
  - Ziel-Rechtecke: Bedienelemente tragen `data-ziel="<ZielName>"` (hud: `waerme_pille`, `geld_pille`, `bauen`; katalog: `reiter_leitungen`, `philipp`, `kasten_abschnitt`, `leitungskarte` (nur Karte von `leitung_typ`), `laura`; Zeichenleiste: `zeichenleiste`, `abschliessen`; kontext: `kasten_station`, `puffer_knopf`); Kartenobjekte über Kamera.
  - Sperren: Zeichenleiste [X]/[?] und [Abschnitt abschließen] fragen `tutorialSperre` (Zeile 2 = `kurz`, Satz in die Blase statt Meldung); Zoomknöpfe, [Dörfer], Auftragskarte ausgeblendet; Hausblatt zeigt die Wandreihe gesperrt nach 12.19 mit Zeile 2 „später wählbar“, wenn `!spiel.wandstationFrei()`; nach Puffer-Kauf im Tutorial schließt das Blatt nach 200 ms; Baumenü schließt nach Laura.
  - Namensfenster: im Tutorial keine Begrüßungs-Meldung und kein Start-Tipp, danach T01; Knopf „Ohne Tutorial starten“ nur bei `tempo() > 1` → `spiel.tutorialUeberspringen()`, dann Verhalten wie heute (Begrüßung + Start-Tipp).
  - `main.ts`: „Willkommen zurück“ (A38) und Update-Hinweis (A83) warten, solange das Tutorial läuft (Update-Hinweis nach T26 zeigen).
  - Nach T26: Spotlight/Anleiter weg, ausgeblendete Knöpfe zurück, erster offener Auftrag federt (13.5 T26).
- **Tests:**
  - `tests/nr13-ablauf.test.ts` (echtes `Spiel` + echtes `Tutorial`, ohne Oberfläche, Uhr von Hand): `test_nr13_ablauf_neues_spiel_bis_warm` – T01…T26 mit den echten Kern-Aktionen (Spur `TUTORIAL_SPUR`, `tutorialWerte().leitung`, Puffer-Stationen), am Ende genau beide Tutorial-Häuser warm, keine Warnung, `stand.tutorial` weg, Laden ergibt kein Tutorial; `test_nr13_ablauf_neu_laden_t11_und_t18` – Speichern/Laden in Planung und nach erster Station → Einstieg T11 bzw. T18; `test_nr13_alter_stand_nie` – `altesStartdorf` → `tutorialAktiv()` false, Steuerung ohne Spotlight.
  - `tests/nr13-einbindung.test.ts` (`echteSteuerung`, Stand aus `neuesSpielMitTutorial` mit `namen_gefragt: true`): `test_nr13_daneben_aendert_nichts` (13.12 Punkt 4: Spielstand vor/nach gleich), `test_nr13_t01_heizzentrale_ohne_blatt`, `test_nr13_meldungen_stumm`, `test_nr13_abschliessen_gesperrt_noch_ein_haus`, `test_nr13_wandreihe_spaeter_waehlbar`, `test_nr13_ohne_tutorial_nur_vorfuehrtempo`, `test_nr13_nach_ende_knoepfe_zurueck`.
- **Randfälle:** App geht während Kamerafahrt in den Hintergrund → Kamera am Ziel (13.6); Hochformat → Tutorial ruht (CSS-Dreh-Hinweis wie heute); Philipp/Laura sprechen → Anleiter blendet aus und kommt zurück.
- **Eskalation:** Bricht eine der Quelltext-Prüfungen aus Abschnitt 3 oder ein bestehender Oberflächentest → STOP, Tester-Vorarbeit anfordern, Test nicht selbst ändern.
- **Risiko-Auslöser:** nein (keine neue Schnittstelle nach außen).

## 9. Vorarbeit (nicht für die Entwickler)
- **Tester-Vorarbeit: keine nötig.** Gemessen in einer Wegwerf-Kopie (Scratchpad, Basis 67aa359): `ladenMitBefund` liefert für `neu`/`defekt` den Stand mit `tutorial: { kapitel: 1 }` → `npx vitest run tests`: 1.241 grün, 2 rot nur wegen in der Kopie fehlender Dateien (`tools/sw`, `.node-version`, `werkzeuge/…`), nicht wegen der Änderung. Kern-Änderungen aus P2 greifen nur bei vorhandener Merke, die kein bestehender Test setzt. Einzige Stolperfallen sind Quelltext-Prüfungen (Abschnitt 3) – P4 hält sie ein.
- **Architekt-Vorarbeit: erledigt.** `tests/architektur/nr13-tutorial.test.ts` (U1–U6), grün auf der Basis; je Regel absichtliche Verstöße in einer Wegwerf-Kopie → alle rot an der Prüfung (U1 zweimal, U2, U3, U4, U5, U6 zweimal).

## 10. Vorschlag verdeckte Abnahmetests (Tester, Datei `tests/abnahme/nr13-abnahme.test.ts.verdeckt`)
1. Neues Spiel (`ladenMitBefund(null)`) → nach Namen Ansicht T01, Kapitel 1, `weiter: null`, Ziel `heizzentrale`; alter Stand mit Netz → keine Ansicht, Dorf deep-gleich vor/nach Laden.
2. Kompletter Ablauf T01–T26 mit echten Aktionen; nach jedem Schritt: 3 falsche Tipps + `weiter` in H-Schritten ändern Schritt nicht; Ende: genau (9|13) und (12|14) warm, sonst kein Haus, keine Warnung, Merke weg, Laden → kein Tutorial.
3. Kauf Wandstation für Haus 1 im Tutorial → abgelehnt, Geld unverändert; nach Ende Wandstation am dritten Haus → erlaubt.
4. Zeiten: Planung genau 10 s, Bau genau 20 s (Uhr von Hand), zweiter Abschnitt 75 s/900 s.
5. Neu laden in jeder Zeile der Wiedereinstiegs-Tabelle 13.7 → erwarteter Schritt; Ansicht zuerst mit „Weiter geht’s“.
6. Katalogwert `kapazitaet_kw` der 25er auf 12 gesetzt (Mock) → T12 nennt „32er“, Ablauf endet trotzdem ohne Warnung.
7. Name mit 20 Zeichen → alle Texte ≤ 120 Zeichen; Kessel-Leistung geändert → T03-Zahl ändert sich.
8. Merke manipuliert (`{kapitel: 'a'}`, `[]`, Haus 1 verschoben) → kein Tutorial, Befund nicht `defekt`.
9. Zu viel gezeichnet (Geld knapp gesetzt) → [Abschnitt abschließen] gesperrt mit „zu teuer“, nach Zurück frei.

## 11. Prüf-Schwerpunkt (nicht in den Anforderungen, trifft echte Spieler)
| Fall | erwartetes Verhalten | Test in |
|---|---|---|
| App mitten im Bau geschlossen, Stunden später geöffnet | Bau nachgerechnet, Einstieg T24 (nicht T22), kein „Willkommen zurück“ | P4 `nr13-ablauf` + P1 Tabelle |
| Spieler wischt kreuz und quer, Geld reicht nicht mehr für Material + Stationen | Abschließen gesperrt mit Satz „zu viele Leitungen – nimm mit Zurück ein paar weg“; kein Festhängen bei Laura | P1 `sperren`, P2 `geld_reicht` |
| Leitung erreicht zusätzlich (13|12) | erlaubt, Schritt prüft nur die zwei Tutorial-Häuser, (13|12) bleibt ohne Station kalt | P4 `nr13-ablauf` |
| Kaputter/fremder Spielstand beim Start | neues Dorf **mit** Tutorial, alter Text gesichert wie heute | P0 `kaputter_stand_hat_merke` |
| Tester mit Vorführ-Tempo überspringt | Merke weg, Start-Tipp NR18-D erscheint, Wandstation frei, normale Zeiten ab nächstem Abschnitt | P2 `start_tipp…`, P4 `ohne_tutorial…` |

## 12. Entscheidungen (technisch, Projektleiter; keine tragende Frage an Simon offen)
- **E-NR13-a Tutorial-Merke über eigene Startfunktion** statt in `neuerSpielstand` (Alternative: Merke in `neuerSpielstand` → alle 29 Testdateien liefen im Tutorial; kürzere Zeiten und Wandstation-Sperre hätten Dutzende Tests umgestellt). Empfehlung: eigene Funktion (so geplant).
- **E-NR13-b Kaputter Stand → neues Dorf mit Tutorial.** Alternative: ohne Tutorial (dann Start-Tipp). Empfehlung: mit, weil das neue Dorf ohne Anschluss genau den Einstieg braucht.
- **E-NR13-c Nur Kapitel im Spielstand, kein Schrittname.** Wiedereinstieg ganz aus dem Zustand; die 13.7-Zeile „unbekannter Schrittname“ entfällt damit. Empfehlung: so.
- **E-NR13-d Geld-Sperre beim Abschließen im Tutorial** (nicht in DESIGN): verhindert ein Festhängen bei Laura. Designer bestätigt den Wortlaut beim Foto.
- Offen bei Simon (blockiert nicht): T-F5 Foto.

## 13. Zurückgestellt
NR2-Auftragsfolge nach dem Tutorial (erster sichtbarer Auftrag ist dann „col“), NR3-Begriffsliste und Info-Knopf, „Einführung ansehen“, Abgleich (T-F4), Pfeil am Bildrand bei verlassener Kamera in Kapitel 3 (13.7 – Kann, falls P4 die Zeit sprengt; dann eigenes Folgepaket), Desktop-Tastatur-Feinheiten über Enter/Tab hinaus.
