# Bauplan NR13 – Pflicht-Tutorial „Simon zeigt dir dein erstes Netz“

Stand 2026-11-06, Architekt, **Fassung 3** (F3 = Antwort auf Kritiker-Nachprüfung `docs/pruefberichte/20261106-120649-kritiker-a92c5aa886f76cdd1.md` und ENTSCHEIDUNGEN 2026-11-06 „T14-Geldmangel Weg b“; F2 = Antwort auf `…-114059-kritiker-a46afa1f8187f3f64.md` und DESIGN 13.15 K1–K10). Geänderte Stellen tragen „(F3)“ bzw. „(F2)“. F3 gelesen auf b3741ac. Basis Fassung 1: 67aa359; F2 gelesen auf 3eedb1c. Grundlage: Lastenheft NR13 (mit Präzisierung 06.11.), A29, NR18-D (1); DESIGN.md Abschnitt 13 (13.1–13.15, **13.15 geht 13.2–13.11 vor**); Bauplan NR18 Fassung 3 (AE-NR13-1, AE-NR13-2, 5.4 Zuordnung T01–T26); ENTSCHEIDUNGEN 2026-11-06 (Simon: T-F1 ohne Leitung, T-F2 Wandstation gesperrt bis 3. Haus, T-F3 „Ohne Tutorial“ nur mit Vorführ-Tempo, T-F4 kein Abgleich, T-F5 Foto folgt).

## 1. Ziel und Abnahme (Tests mit „nr13“ im Namen)
1. Ein **neues Spiel** startet nach dem Namensfenster im Tutorial (T01); ein **alter Stand** (ohne Merke) sieht es nie, sein Dorf bleibt unverändert.
2. Das Tutorial führt durch die Schritte T01–T26 aus DESIGN 13.5; jeder Schritt schaltet **nur** mit seiner Handlung weiter (13.12 Punkt 5); kein Überspringen, kein Wegtippen.
3. Am Ende: genau die zwei `ERSTE_HAEUSER` warm, ohne NR18-Warnung, Tutorial als fertig gemerkt; neu laden → kein Tutorial (13.12 Punkt 6).
4. Neu laden mitten im Tutorial setzt nach der Tabelle „Wiedereinstieg“ (13.7) wieder ein.
5. Wandstation ist im Tutorial gesperrt (Kern lehnt ab, Hausblatt zeigt „später wählbar“), danach frei.
6. Erster Bauabschnitt im Tutorial: Planung 10 s, Bau 20 s (NR2 „erster Abschnitt in ca. 1 Minute“); danach normale Zeiten.
7. Texte ≤ 120 Zeichen auch mit 20 Zeichen langem Namen, höchstens 2 Sätze nach K2, Zahlen aus dem Spiel (Katalogwert ändern → Text ändert sich).
8. „Ohne Tutorial starten“ gibt es nur, wenn das Vorführ-Tempo (×10/×60) an ist.
9. (F2) Die Karte lässt sich im Tutorial nur in T13 bewegen, und dort nur im Rahmen der Kamera-Grenze (K5).
10. (F2) Ein Klickweg durch die echte Oberfläche (Steuerung + DOM-Attrappe) endet mit zwei warmen Häusern. (F3) Dazu ein Browser-Durchklick (Playwright, echte Lage, echte Eingabesperre) in 844×390.
11. (F3) Fehlt in T13 Geld, bleibt das Tutorial in T13 (Geld-Satz, Zurück/Radierer frei) – kein Festhängen; T14 erst, wenn beide Häuser erreicht sind **und** das Geld reicht.

## 2. Abgrenzung
- **Nicht in NR13:** NR2 (Auftragstexte/-reihenfolge über c1/c2 hinaus), NR3 (Begriffsliste, Info-Knopf, Mini-Tutorials 13.13), „Abgleich“ (T-F4), „Einführung ansehen“ (13.8 Kann), Simons echtes Foto (Platzhalter-Figur reicht; ein Foto unter `public/figuren/simon.webp` greift automatisch wie bei A52).
- NR3 soll später die fett markierten Sätze aus `TUTORIAL_SCHRITTE` per Schritt-Kennung lesen, nicht abschreiben (13.9 „eine Quelle“).
- Keine Änderung an Netzrechnung, Katalogpreisen, Speicherschlüssel (`waermedorf-spielstand-v1` bleibt), `SPEICHER_VERSION` (bleibt 3 – neues Feld ist optional wie `namen_gefragt`).
- (F2) Pfeil am Bildrand entfällt (K5, durch Kamera-Grenze ersetzt). Kann-Punkte aus K9 (Pille hüpft, Heizzentrale federt) sind **Kann** in P4; (F3) K7 „Loch wandert auf Zurück“ entfällt mit Weg b (in T13 ist Zurück ohnehin frei) – ohne Test, nicht abnahmerelevant.

## 3. Bestand (gelesen)
- Spielstart: `src/core/start.ts:15` `neuerSpielstand` (ohne Leitung, ohne Station, Kessel vorgewählt), `:13` `ERSTE_HAEUSER = [[9,13],[12,14]]`. Aufrufer in Produktion: `src/core/speichern.ts:132,158` (Befund `neu`/`defekt`), `src/main.ts:48` (Absturz beim Öffnen; Import `main.ts:8` aus `./core/spiel`). 29 Testdateien rufen `neuerSpielstand` direkt.
- Vertrag: `src/core/tutorial-vertrag.ts` (`Schritt`, `Tipp`, nur Typen); Kern sendet `schritt` (u. a. `spiel.ts:809` Planung, `:820` Abschließen, `:860` Material, `stationKaufen :644`); `erreichteHaeuser()` `spiel.ts:91`; `passendeLeitung` `:96` (`>=`).
- Vorbild „Merke nur in neuen Spielen“: `namen_gefragt` (`typen.ts:118`). Start-Meldung NR18-D: `spiel.ts:367–377`, `steuerung.ts:110–117`.
- Steuerung (F2 nachgelesen): Ereignisschleife `steuerung.ts:501–517`; Namensfenster `:90–107`; Erst-Hilfe der Zeichenleiste `:192–193` (setzt `zeichenhilfe_gesehen` beim ersten Öffnen); `leisteAbschliessen` öffnet danach das Baumenü `:250`; Kartentipp → `kontext(o.id)` `:474`, Kamera dort auf 58 % Höhe `:151`; Gesten: Verschieben `:366`, Zwei-Finger-Zoom/Drehen `:352–359`, Mitteltaste-Drehen `:335`, Mausrad `:378`, Pfeiltasten/+/−/Q/E `:380–393`. Direkte `toast()`-Aufrufe `:78, :97, :114, :280, :318, :469, :504`.
- `main.ts:56–62` „Willkommen zurück“, `:38/:46` Start-Hinweise (defekt), `:181` Speicher-Warnung, `:198` Update-Hinweis (`hinweisMitKnopf`).
- Zeiten (F2): `KONSTANTEN.abschnitt_planung_s 30`, `abschnitt_bau_s 360`, `bauzeit_faktor 2.5` (`katalog.ts:344–354`); `neuerBau` multipliziert immer mit dem Faktor (`spiel.ts:394–396`); `liefertage()` fest aus Konstanten (`:382`), `SPIELTAG_MS` = 19.726 ms (`:37`, Spieljahr 120 min) → 20 s = 1 Tag. `stationspreis_eur` `:1198` (Nachlass Interessent, Rückkauf).
- Darstellung (F2): `render/szene.ts:258` zeichnet Leitungen in der jedes Bild neu gezeichneten Ebene, danach Gebäude, `:345` „oben“-Liste; Bodenebene-Schlüssel ohne Leitungen (`szene-schluessel.ts:59–66`), Neuzeichnen-Schlüssel `szenenSchluessel` `:37`. Kamera-Begrenzung `kamera.ts:96`, Zoom fest 1–4 `:100`. Blatt-[X] ohne Sperre `ui/blatt.ts:44`. Gesperrter Knopf: `hinweis` als Funktion, Rückgabe `''` = wackeln ohne Meldung (`ui/bausteine.ts:41–64`).
- Testhilfe (F2): `tests/hilfen/echte-steuerung.ts:71` – `window.addEventListener` ist dort ein Leerlauf (Capture-Sperre wirkt in diesen Tests nicht); `:76–79` schreibt `meldungen` **vor** dem echten `toast` mit → „stumm“ prüft man am DOM (`meldung()`), nicht an `meldungen`. Kartentipps per `canvas.ausloesen('pointerdown'|'pointerup')` wie `tests/nr18-oberflaeche.test.ts:69–75`.
- Architekturtests, die NR13 berühren: `tests/architektur/nr18-f2-struktur.test.ts` F1, F2a–d; `tests/architektur.test.ts` A19. (F3) Bestehende Tests, die Quelltext-Muster, Modul-Attrappen oder Ersatz-Oberflächen nutzen: vollständige Liste in **§3a** (auf b3741ac per Suche nach `readFileSync`, `vi.doMock(`, `new Katalog(`/`new Kontext(` geprüft).

## 3a. (F3) Bestehende Tests, die NR13 nicht brechen darf (Kritiker-Befund 1)
Gefunden mit `grep readFileSync|vi.doMock(|new Katalog(|new Kontext(` in `tests/` (b3741ac). Bricht einer davon → STOP im betroffenen Paket (Eskalation P3/P4), nie selbst ändern.

**A. Quelltext-Muster (Text muss so in der Datei stehen bzw. darf nicht stehen)**
| Datei (Paket) | Test | Regel für den Entwickler |
|---|---|---|
| `steuerung.ts` (P4) | `anpassungen.test.ts:1141` | Zeile `if (spiel.stand.namen_gefragt === false) this.namenFragen();` wörtlich |
| `steuerung.ts` (P4) | `nr12-p5b-ruhe.test.ts:270` | `fingerAufKarte(): boolean { return this.zeiger.size > 0 \|\| this.mitteDreh !== null; }` unverändert (Gesten-Sperre also **nicht** hier einbauen) |
| `steuerung.ts` (P4) | `anpassungen.test.ts:1289`, `a91-hausanschluss-satz.test.ts:84/92`, `a92-sperrtexte.test.ts:661ff`, `a92-sperre.test.ts:191`, `menue-v2.test.ts:101` | kein „einsammeln“/„Abholen“, kein alter Hausanschluss-Satz, nichts mit „dicksten Weg“, kein `.disabled = true`, kein `'heiss'` |
| `main.ts` (P4) | `anpassungen.test.ts:1334–1339` | `hinweisMitKnopf('Neue Version von Heatville ist da.', 'Neu laden'` wörtlich – P4 schreibt den Aufruf **in** die Hülle: `steuerung.nachTutorial(() => hinweisMitKnopf('Neue Version von Heatville ist da.', 'Neu laden', …))`; dazu bleiben `controllerchange`, `navigator.storage?.persist`, `if (!hatteVersion) return;`, `speichern(); location.reload()` |
| `main.ts` (P4) | `nr12-p5b-ruhe.test.ts:268`, `a90-fluessig.test.ts:375`, `a92-b2b-fix-treue.test.ts:105`, `pwa.test.ts:19`, `anpassungen.test.ts:1286` | Aufruf `zeichneSzene(maler, kamera, szene, steuerung.effekte, abschluss.dt_s, steuerung.fingerAufKarte())`, Sparhinweis-Schlüssel, Manrope-Importe, `serviceWorker.register('./sw.js')`, kein „Münze“ |
| `render/szene.ts` (P3) | `nr12-p5b-ruhe.test.ts:273` | kein `document`/`window`/`navigator`/`PointerEvent`/`TouchEvent` – „Weniger Bewegung“ für das Erreicht-Federn kommt über das vorhandene `m.reduziert` (`render/maler.ts:18`, gesetzt in `steuerung.ts:125`), kein neues Szene-Feld |
| `render/szene.ts` (P3) | `anpassungen.test.ts:651`, `:819`; `oberflaeche.test.ts:52/58` | Zeile `kwSchildZeigen(o, DK.kategorie, DK.bedarf_kw, tw, s.kw_anzeigen, relevant)` bleibt; Animation über `zeit_s`/`jetzt_ms` (kein `frame++`); Haken als gezeichnete Form, kein Emoji, kein `✕★▼` |
| `render/gebaeude.ts` (P3) | `a88-kundenanfrage.test.ts:266`, `anpassungen.test.ts:747`, `oberflaeche.test.ts:58/64` | eine neue Blasenart steht **in derselben** `export type Blase = …`-Anweisung wie `'anfrage'`; `anfrage: '#…'` bleibt; höchstens 2× `m.wolke(` |
| `ui/katalog.ts` (P3) | `menue-v2.test.ts:61–63`, `:95`, `:107–110` | `knopf(` + Text der Knöpfe Planen/Material/Express wörtlich, Variante `'geld'` (bzw. bei `knopf('Sofort fertig'` `'taler'`) in **derselben Zeile** wie `knopf(`; neue Sperre als letzter Teil des Zusatz-Objekts (`sperre: ersteSperre(this.ui.tutorialSperreKnopf('express'), …bisherige)`); Preis-Chip-, Schloss- und `'Bauabschnitt'`-Zeilen bleiben; `data-ziel` per `setAttribute` am Rückgabewert, nicht durch Umbau des `knopf(`-Aufrufs |
| `ui/kontext.ts` (P3) | `anpassungen.test.ts:1066/1164`, `a88-kundenanfrage.test.ts:352`, `menue-v2.test.ts:46/57`, `oberflaeche.test.ts:79` | `blattOeffnen({ titel: D.name` bleibt der Anfang des Aufrufs (`zuSperre` dahinter anhängen), `if (this.blatt !== b) return;` und `this.blatt = b; this.id = id;` danach; übrige Texte unverändert |
| `ui/hud.ts` (P3) | `anpassungen.test.ts:1117`, `menue-v2.test.ts:114`, `oberflaeche.test.ts:79` | kein „Vergrößern/Verkleinern/… drehen“, `kwknopf` und `symbol('zahnrad', 'zahnrad')` bleiben |
| `ui/stil.css` (P3) | `a92-sperre:200`, `a92-anschlussweg:339`, `a92-b2b-fix-treue:97`, `anpassungen:1012/1122`, `design-kann12:15`, `nr12-vorspann:7`, `nr18-d:195`, `a88-design-treue:48–59`, `oberflaeche:99` | nur **neue** Regeln anhängen, bestehende nicht umschreiben |
| alle (P0–P4) | `architektur.test.ts` (Kern ohne Browser/`Date.now`/`Math.random`/UI), `architektur/nr12-zeichentakt.test.ts` R1 (`requestAnimationFrame` mit Namen nur in `main.ts` → Finger/Kamerafahrt laufen über die Bildschleife bzw. CSS-Animation), R2 (kein `shadowBlur`/`.filter=` in `render/`), R3 (kein `setInterval` < 1 s), R5, R8, R9 (Schlüssel nur in `szene-schluessel.ts`); `architektur/nr18-f2-struktur.test.ts` F1–F3; `architektur/nr13-tutorial.test.ts` U1–U7 | |

**B. Modul-Attrappen (feste Ersatz-Module ohne `...original`)** – `vi.doMock('../src/ui/toast', () => ({ toast, hinweisMitKnopf }))` und `vi.doMock('../src/ui/sprecher', () => ({ sprecherZeigen }))` in `a91-hausanschluss-satz.test.ts:66–67`, `a92-anschlussweg.test.ts:88–89`, `a92-grossabnehmer-abschnitt.test.ts:81–82`, `a92-sperre.test.ts:80–81`, `a92-sperre-schloss.test.ts:71–72`, `a92-sperre-weg-aktion-laeuft.test.ts:74–75`, `a92-sperrtexte.test.ts:105–106`; `ui/blatt` als Attrappe nur mit `blattOeffnen`/`blattOffen` (in `a88-freischalt-leiter.test.ts:380/405` sogar nur `blattOeffnen` mit `{ inhalt }`); `ui/bild` nur `katalogBild`. **Regel P3:** `ui/katalog.ts`, `ui/kontext.ts` und was sie importieren (`bausteine`, `sperrtexte`, `dom`, `blatt`, `render/gebaeude`) holen **keine neuen Namen** aus `toast`, `sprecher`, `blatt`, `bild` und greifen beim Aufbau nicht auf `blatt.wurzel`/`blatt.zu` zu. Architekturtest **U7** sichert `meldungenStumm`/`toastWichtig`/`sprecherAktiv` ab (nur `steuerung.ts`). `nr19-puffer-oberflaeche.test.ts:39` und `tests/hilfen/echte-steuerung.ts:62` reichen das echte Modul durch – unkritisch.

**C. Ersatz-Oberflächen ohne `tutorialMelden`/`tutorialSperreKnopf`** (Objekt statt `Ui`, per `as unknown as` übergeben): `a88-freischalt-leiter.test.ts:385, :410` (Katalog), `:453` (Kontext); `a91-hausanschluss-satz.test.ts:120` (Katalog); `a92-anschlussweg.test.ts:128` (Kontext), `:474`, `:497` (Katalog); `a92-grossabnehmer-abschnitt.test.ts:86` (Kontext); `a92-sperre-schloss.test.ts:86` (Kontext); `a92-sperre-weg-aktion-laeuft.test.ts:76–79` (für beide); `a92-sperre.test.ts:95` (Kontext), `:268` (Katalog); `a92-sperrtexte.test.ts:107ff` (für beide); `tests/hilfen/kontext-attrappe.ts:40`; `nr19-puffer-oberflaeche.test.ts:42`. Ab P3 ruft das Baumenü `tutorialSperreKnopf` beim Aufbau (Verwerfen, Weiter einzeichnen, Express, Sofort fertig, [X]) und Baumenü wie Hausblatt geben `zuSperre` an `blattOeffnen` → **Tester-Vorarbeit V1 vor P3** (§10).

## 4. Festlegungen
**AE-NR13-1 (erweitert) Spielstart an einer Stelle.** `neuesSpielMitTutorial(jetzt_ms, ortId?)` in `start.ts` = `neuerSpielstand(…)` plus `tutorial: { kapitel: 1 }` – **sonst nichts** (F2, Rückfrage P0-1: kein `zeichenhilfe_gesehen` beim Start). Jeder Produktionsweg zu einem neuen Spiel ruft nur diese Funktion. Architekturtest U4. *(Weicht bewusst von DESIGN 13.8 „nur neuerSpielstand setzt …“ ab – gleiche Wirkung für Spieler.)*

**AE-NR13-2 [ÜBERNOMMEN]** Tutorial hört zu (`schritt`, `tipp`) und fragt den Kern; rechnet keine Spielregel nach (F2a–F2d).

**AE-NR13-3 Tutorial-Merke an einer Stelle.** `Spielstand.tutorial?: { kapitel: number }`. Fehlt = kein Tutorial. Geschrieben nur über Spiel-Methoden, angelegt nur in `start.ts`, repariert nur in `speichern.ts`. Regel U1 (jede Zuweisung/`delete` an `.tutorial` nur in diesen drei Dateien). **(F2)** Darum heißt das Feld in `Steuerung` **`anleitung`** (nicht `tutorial`); U1 bleibt bewusst breit, weil `const s = spiel.stand; s.tutorial = …` sonst durchrutschen würde. Fehlerprobe: `this.tutorial = null` in `steuerung.ts` → U1 rot, `this.anleitung = null` → grün.

**AE-NR13-4 Schrittlogik nur im Kern, ohne Kreis.** Schrittfolge, Texte, Bedingungen, Wiedereinstieg, Fehltipps, Sperren und **(F2) alle Darstellungsentscheidungen je Schritt** stehen in `src/core/tutorial.ts`. Die Oberfläche kennt weder Schritt-Kennung (U2) noch Kapitelnummer (U2b, F2: `.kapitel` nur im Kern und in `ui/anleiter.ts` für die Kapitel-Punkte). Sie entscheidet nur nach Feldern der `TutorialAnsicht` oder nach „Tutorial aktiv ja/nein“. `tutorial.ts` importiert nur `./tutorial-vertrag`, `./start`, `./typen`, `./katalog` (U3) – Zahlformat schreibt P1 selbst (Rückfrage P1-9).

**AE-NR13-5 Bausteine sind dumm.** `ui/anleiter.ts`, `ui/spotlight.ts` kennen weder `Spiel` noch `Tutorial` (U5). Die Verdrahtung macht nur `steuerung.ts`. (F2) Blätter (`hud`, `katalog`, `kontext`) melden Tipps und fragen Sperren nur über die `Ui`-Schnittstelle.

**AE-NR13-6 Eingabesperre an einer Stelle.** Ein Capture-Listener auf `window` in `spotlight.ts` fängt Berührungen außerhalb der Löcher und der Anleiter-Karte ab (`pointerdown`, `pointermove`, `pointerup`, `click`, `touchstart`, `wheel`; `keydown` außer Tab/Enter) und meldet `daneben`. **(F2)** In Erklär-Schritten (`art 'W'`) sind Löcher nur Zeigen: Erlaubt ist dann nur die Anleiter-Karte (ein Tipp ins Loch zählt als `daneben`). **(F2) Gesten-Sperre an der Karte zusätzlich in `steuerung.ts`** (Kritiker-Befund 5): Verschieben, Zwei-Finger-Zoom, Mausrad, Pfeil-/Zoomtasten fragen `tutorialSperre('karte_gesten')`; Drehen (Zwei-Finger, Mitteltaste, Q/E) ist im ganzen Tutorial aus. In T13 gilt statt Sperre die Kamera-Grenze (K5).
**(F3) Wer darf durch – abschließend (Kritiker-Befund 3)**, entschieden in der reinen Funktion `eingabeErlaubtBei` (P3), in dieser Reihenfolge:
| Fall | durch | sonst |
|---|---|---|
| 1. Kamerafahrt läuft (DESIGN 13.6 „keine Eingabe“) | nichts, auch nicht die Anleiter-Karte | abgefangen, **kein** `daneben` |
| 2. Punkt auf der Anleiter-Karte | immer | – |
| 3. `abdunkeln 'nur_hud'` (nur T13) | alles, was **nicht** in `#hud` liegt: Karte, Zeichenleiste (Farbknöpfe, Radierer, Zurück, [Abschließen], [X]/[?] – deren Sperre macht `zuSperre`/`tutorialSperreKnopf`), Ränder | Ziel des Ereignisses in `#hud` (Pillen, Dorfschild, Auftragskarte, [Bauen], [Dörfer], kW-Schalter) → `daneben` |
| 4. `abdunkeln 'alles'` **oder** `'nichts'` | H-Schritt: Punkt in einem Loch; W-Schritt: nichts (Loch nur Zeigen) | `daneben` |
`'nichts'` ändert nur das Bild (T22 Baustelle, T26 Dorf), nicht die Sperre: Die Schritte warten weiter auf [Weiter]/[Los geht’s] (13.12 Punkt 5). Maßgeblich ist `ansicht.abdunkeln`, nicht das während einer Fahrt kurz auf `'nichts'` gesetzte Bild. „In `#hud`“ prüft der Listener am Ereignisziel (`closest('#hud')`), nicht an Rechtecken – so verdeckt ein HUD-Rechteck nie die Zeichenleiste. `keydown`: immer nur Tab/Enter (auch in T13; Pfeiltasten bleiben aus, §14).

**AE-NR13-7 Wandstation-Sperre setzt der Kern durch** (wie AE-A88-2): `stationKaufen` lehnt im Tutorial jede Nicht-Puffer-Station für Häuser ab; die Oberfläche fragt `spiel.wandstationFrei()`.

**AE-NR13-8 (F2) Meldungen stumm an einer Stelle.** `ui/toast.ts` bekommt einen Schalter `meldungenStumm(an)`; solange er an ist, zeigt `toast()` nichts – damit sind auch alle direkten `toast()`-Aufrufe still. Fehler beim Speichern/Laden (S0) laufen über `toastWichtig()` und erscheinen immer, über der Anleiter-Karte.

Konventionen wie bisher: kein `innerHTML`-Schreiben, kein `createElementNS`, SVG nur per DOMParser (U6); Sperren über `sperre` am Knopf (12.19), nie `disabled`; Fett-Marken `**Wort**` → `<strong>`-Knoten per `textContent`.

## 5. Datenmodell und Migration
```ts
// typen.ts, Spielstand
/** NR13: Tutorial läuft (nur neue Spiele, AE-NR13-3). kapitel 1–6 = zuletzt begonnenes Kapitel (DESIGN 13.5).
 *  Fehlt = kein Tutorial (alte Stände, fertig, übersprungen). */
tutorial?: { kapitel: number };
```
- **Laden (`speichern.ts`, `nr13Aufraeumen`, nach `nr19Aufraeumen`):** `tutorial` kein Objekt oder `kapitel` keine ganze Zahl 1–6 → Feld **löschen**. An einer der `ERSTE_HAEUSER`-Koordinaten kein Objekt der Kategorie `haus` → löschen. Kein Befund `migriert`, kein `defekt`.
- Alte Stände: keine Umwandlung, kein Tutorial. Sicherung einspielen (A83) mit laufendem Tutorial: läuft weiter (Wiedereinstieg).
- `zeichenhilfe_gesehen` (F2, K9): wird wie heute beim ersten Öffnen der Zeichenleiste gesetzt (`steuerung.ts:193`), im Tutorial also in T12; im Tutorial klappt die Hilfe dabei nicht auf. Nie beim Spielstart.

## 6. Schnittstellen (Vertrag, P0 legt sie an; Namen verbindlich)
**`src/core/tutorial-vertrag.ts` – ergänzen (nur Typen; `Schritt`/`Tipp` unverändert, F2d):**
```ts
export type TutorialSchrittId = 'T01' | 'T02' | … | 'T26';          // 26 Werte; T13b ist kein Schritt (Text von T13)
export type ZielName =
  | 'heizzentrale' | 'haus1' | 'haus2' | 'leitungsstueck'             // Karte (Rechteck aus Kamera)
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
  art: 'W' | 'H';
  text: string;                  // (F2) fertiger Blasentext nach Vorrang K4: Sperr-Satz > Hilfe (nur H) > T13b > Grundtext;
                                 //      (F3) in T13 bei fehlendem Geld der Geld-Satz (K7, Weg b). **fett**-Marken, ≤ 120 Zeichen ohne Marken
  knopf_hinweis?: string;        // (F2) K4 Erklär-Schritt nach 3 Fehltipps: „Tippe auf Weiter.“ gedämpft in der Knopfzeile
  wusstest_du: boolean;          // T25
  ziele: ZielName[];             // Löcher; Fingerziel = ziele[0]
  finger: 'aus' | 'tippen' | 'spur';  // (F2) 'tippen' auf ziele[0]; 'spur' = fährt TUTORIAL_SPUR ab (T13 bis zum ersten eigenen Strich)
  abdunkeln: 'alles' | 'nur_hud' | 'nichts';
  weiter: 'weiter' | 'los' | 'wartet' | null;   // null = Handlungs-Schritt; 'wartet' = [Weiter] noch nicht frei (T11/T23)
  warte_text?: string; warte_bis_ms?: number;   // (F2) warte_text enthält genau einmal „{Restzeit}“, die Oberfläche setzt ein
  kamera: 'steht' | 'fahrt' | 'frei';
  kamera_ziele: ZielName[];      // (F3) [] = Kamera bleibt; 1 Ziel = Mitte auf 38 % Höhe der freien Fläche, Zoom 3 (Desktop 1,9);
                                 //      ≥ 2 Ziele = Rahmen der Ziele einpassen (24 px Rand, Zoom ≤ 3) – Regel P4 „Kamera“
  kamera_grenze: boolean;        // (F2) K5, nur T13: Bildmitte im Rahmen Heizzentrale + beide Häuser, Zoom ≥ Startansicht
  spur: boolean;                 // (F2) K10: nur T13
  erreicht_zeigen: boolean;      // (F2) nur T13: „Erreicht“-Zeichen über erreichten Tutorial-Häusern
  info_kapsel?: string;          // (F2) K9: T06/T07 „{kwh} im Jahr · bis {kw_ohne}“ fertig eingesetzt
  effekt?: 'hz_federn' | 'pille_huepfen';     // (F2) einmal beim Eintritt (T02 hz_federn, T03 pille_huepfen) – Darstellung ist Kann
  nach_handlung_schliessen?: 'blatt' | 'baumenue';  // (F2) T17/T19 'blatt' (200 ms nach dem Kauf), T21 'baumenue'
  leitung_typ?: TypId;           // T12: Ziel 'leitungskarte' ist die Karte dieses Typs
  objekt_ids: { heizzentrale: number; haus1: number; haus2: number; leitungsstueck: number[] };  // (F2) leitungsstueck s. P1
  normale_aktion: boolean;       // (F2) true nur T15/T18: Kartentipp auf das Haus öffnet das Hausblatt; sonst öffnet ein Kartentipp nichts
  wiedereinstieg: boolean;       // true = Blase „Weiter geht’s, {Name}! …“ vor dem eigentlichen Schritt
}
```
(F2) Das Feld `hilfe?` aus F1 entfällt (steckt jetzt in `text` bzw. `knopf_hinweis`), `finger: boolean` wird zur Art.

**(F2) Wie P4 ohne Schritt-Kennung entscheidet** (Kritiker-Befund 2, Rückfrage P4-2):
| Darstellungsfrage | woher |
|---|---|
| Spur zeigen, Haken zeigen, Finger fährt Spur ab | `spur`, `erreicht_zeigen`, `finger === 'spur'` |
| Info-Kapsel, Einmal-Effekt | `info_kapsel`, `effekt` (abspielen, wenn `schritt` wechselt) |
| Blatt/Baumenü schließen nach der Handlung | `nach_handlung_schliessen` der Ansicht **vor** der Handlung (P4 merkt sie vor `tipp`/`schritt`; wechselt danach der Schritt, schließt es) |
| Blatt scrollt zum Ziel | allgemeine Regel K9 für **jedes** Ziel in einem Blatt – kein eigenes Feld |
| Zeichenhilfe aus, Baumenü nach Abschließen zu (K8) | „Tutorial aktiv“ (die Leiste öffnet im Tutorial nur in Kapitel 3) – kein Feld |
| Hilfe je Schritt-Art | P1 liefert sie fertig: H → `text`, W → `knopf_hinweis` |
| Kartentipp öffnet Blatt? | `normale_aktion` |
| Kamera stehen/fahren/frei, Grenze | `kamera`, `kamera_ziele`, `kamera_grenze` |
| Ziel Leitungsstück T25 | `objekt_ids.leitungsstueck` |
| Meldungen stumm, „Willkommen zurück“ weg, Update wartet | „Tutorial aktiv“ |

**`src/core/tutorial.ts` (P1):**
```ts
export interface TutorialLage {               // Spiel erfüllt sie strukturell
  readonly stand: Spielstand; readonly netz: { readonly warm: ReadonlySet<number> }; readonly spielerName: string;
  erreichteHaeuser(): number[]; tutorialWerte(): TutorialWerte; tutorialGeldFehlt_eur(): number;
  tutorialKapitelSetzen(kapitel: number): void; tutorialBeenden(): void;
}
export const TUTORIAL_TEXT_MAX = 120;
export const TUTORIAL_ZURUFE: ReadonlyArray<string>;   // (F2) K2: 'Hallo {Name}!', 'Prima!', 'Fertig geplant!', 'Geschafft, {Name}!', 'Weiter geht’s, {Name}!'
export const TUTORIAL_SCHRITTE: ReadonlyArray<{ id: TutorialSchrittId; kapitel: number; art: 'W' | 'H'; text: string; hilfe: string; … }>;
export function einstieg(lage: TutorialLage): TutorialSchrittId;     // Tabelle 13.7 „Wiedereinstieg“
export class Tutorial {
  constructor(lage: TutorialLage, opt?: { wiedereinstieg?: boolean });
  aktiv(): boolean;
  ansicht(jetzt_ms: number): TutorialAnsicht | null;  // null, wenn nicht aktiv oder namen_gefragt === false
  tipp(m: TippMeldung): void;
  schritt(e: { schritt: Schritt; objekt_id?: number }): void;
  sperre(b: Bedienung): TutorialSperre | null;        // null = frei; außerhalb des Tutorials immer null
  gesperrtGetippt(b: Bedienung): void;                // (F2) Sperr-Satz von sperre(b) in die Blase (K4 Vorrang)
  handlung(): void;                                   // (F2) Handlung im Loch (Strich, Knopf der Leiste) – Sperr-Satz weg
  zustandPruefen(): void;                             // (F3) Übergänge ohne Ereignis (T13 ↔ T14, Geld/Häuser); außerhalb T13/T14 ohne Wirkung
}
```
**`src/core/spiel.ts`:** P0: `tutorialAktiv(): boolean` (= `!!stand.tutorial`), `wandstationFrei(): boolean` (= `!stand.tutorial`), `export const WANDSTATION_TUTORIAL = 'Im Tutorial nimmst du den Standard. Die Wandstation kannst du später wählen.'` (F2: nach P0 verlegt, damit P3 ohne P2 bauen kann). P2: `tutorialWerte(): TutorialWerte`, `tutorialGeldFehlt_eur(): number`, `tutorialKapitelSetzen(kapitel: number): void`, `tutorialBeenden(): void`, `tutorialUeberspringen(): void`; (F2) `liefertage(dauer_ms?: number): number`, privat `neuerBau(art, dauer_s, faktor = KONSTANTEN.bauzeit_faktor)`.
**`src/core/start.ts` (P0):** `neuesSpielMitTutorial(jetzt_ms: number, ortId?: string): Spielstand`; `TUTORIAL_SPUR: ReadonlyArray<readonly [number, number]> = [[10,10],[10,11],[10,12],[10,13],[10,14],[11,14]]` (NR18 5.2; Reihenfolge = Zugrichtung, erst an Haus 1 vorbei, dann Haus 2).
**`src/core/katalog.ts` (P2):** `KONSTANTEN.tutorial_planung_s: 10`, `tutorial_bau_s: 20` – Sekunden **ohne** `bauzeit_faktor` (Tempo wirkt weiter über die Uhr).
**`src/render/szene.ts` `Szene` (P0, optional):** `tutorial_spur?: ReadonlyArray<readonly [number, number]>` (noch freie Spurfelder), (F2) `erreicht?: ReadonlyArray<{ id: number; seit_ms: number }>` (statt `erreicht_ids`; `seit_ms` für das 450-ms-Federn).
**`src/ui/schnittstelle.ts` `Ui` (P0):** `tutorialMelden(m: TippMeldung): void;` (F2) `tutorialSperreKnopf(b: Bedienung): Sperre | null;` (fertige `Sperre` aus `ui/bausteine.ts`: `grund` = `kurz`, `schloss: false`, `hinweis` = Funktion, die `anleitung.gesperrtGetippt(b)` ruft und `''` liefert → Knopf wackelt, keine Meldung). In `Steuerung` ab P0 als Leerlauf (melden tut nichts, Sperre `null`), echt ab P4.

## 7. Pakete
| Paket | Inhalt | Dateien | Abhängig von | Parallel mit | Schwierigkeit |
|---|---|---|---|---|---|
| **P0** Vertrag (≤ 30 min) | Typen, Merke-Feld, Startfunktion, Aufrufer umstellen, Szene-/Ui-Felder, (F2) 2 Spiel-Einzeiler + Konstante | `core/tutorial-vertrag.ts`, `core/typen.ts`, `core/start.ts`, `core/speichern.ts` (2 Aufrufe), `core/spiel.ts` (F2: nur `tutorialAktiv`, `wandstationFrei`, `WANDSTATION_TUTORIAL`), `main.ts` (1 Aufruf), `render/szene.ts` (Typ), `ui/schnittstelle.ts`, `steuerung.ts` (2 Leerlauf-Methoden), neu `tests/nr13-vertrag.test.ts` | – | – | einfach |
| **P1** Schrittlogik | Klasse `Tutorial`, Schrittliste mit Texten und Ansicht-Feldern, Wiedereinstieg, Sperren, Fehltipps | neu `core/tutorial.ts`, neu `tests/nr13-tutorial-logik.test.ts` | P0 | P2, P3 | schwer |
| **P2** Kern-Anbindung | Zeiten, Wandstation-Sperre, Start-Meldung aus, Werte/Geld, Merke-Methoden, Laden reparieren | `core/spiel.ts`, `core/katalog.ts` (2 Konstanten), `core/speichern.ts` (`nr13Aufraeumen`), neu `tests/nr13-kern.test.ts` | P0 | P1, P3 | mittel |
| **P3** Bausteine und Blätter (F2 erweitert) | Anleiter-Karte, Spotlight (CSS) + Eingabesperre + Ersatz-Ziele, Finger, Info-Kapsel, Simon-Figur, Spur, „Erreicht“, Kamerafahrt + Grenze, Tokens, Toast-Stille; (F2) Ziel-Markierungen, Tipp-Meldungen und Sperren in HUD, Baumenü, Hausblatt, Blatt-[X] | neu `ui/anleiter.ts`, neu `ui/spotlight.ts`, `ui/sprecher.ts`, `ui/symbole.ts`, `ui/stil.css`, `ui/tokens.ts` + `design/tokens.json` (13.10), `ui/toast.ts`, `ui/hud.ts`, `ui/katalog.ts`, `ui/kontext.ts`, `ui/blatt.ts`, `render/szene.ts` (Zeichnen), `render/szene-schluessel.ts`, `render/gebaeude.ts`, `render/kamera.ts`, neu `tests/nr13-bausteine.test.ts`, neu `tests/nr13-blaetter.test.ts` | P0 | P1, P2 | mittel |
| **P4** Einbindung (F2 verkleinert) | Lebenszyklus, Ereignisse → Tutorial, Kartentipps, Zeichenleiste, Gesten-Sperre, Kamera, Ansicht anwenden, Fokus, `main.ts` | `steuerung.ts`, `main.ts`, neu `tests/nr13-einbindung.test.ts`, neu `tests/nr13-ablauf.test.ts`, neu `tests/nr13-klickweg.test.ts` | P1, P2, P3 | – | schwer |

**Kritischer Pfad:** P0 (≤ 30 min) → P1 → P4. Das sind 3 von 5 Paketen; P0 ist kurz, lang sind P1 und P4. **(F2) Prüfung P4a/P4b (Kritiker 10):** `steuerung.ts` ist nicht sauber teilbar – Lebenszyklus, Kartentipps, Zeichenleiste und Gesten hängen an denselben Methoden (`tippen`, `leisteAufbauen`, `ereignisse`). Statt eines Schnitts in der Datei ist alles, was **nicht** in `steuerung.ts` liegt (HUD, Baumenü, Hausblatt, Blatt-[X], Toast), nach P3 gewandert. Es braucht nur den P0-Vertrag. Das macht P4 deutlich kleiner. Parallel-Check: P1 nur `core/tutorial.ts`; P2 `spiel.ts`/`katalog.ts`/`speichern.ts` (nach P0); P3 nur `ui/*`, `render/*`, Tokens – keine gemeinsame Datei, kein Port, keine Datenbank. `spiel.ts`, `speichern.ts`, `szene.ts`, `steuerung.ts` fassen P0 und später P2/P3/P4 nur nacheinander an.

## 8. Baupläne

### Bauplan P0 – Vertrag (einfach: nur Typen, eine Drei-Zeilen-Funktion, drei Aufrufe, zwei Einzeiler)
- **Dateien:** wie Tabelle. `tutorial-vertrag.ts` bekommt die Typen aus Abschnitt 6 (nur `type`/`interface`, Import nur `type TypId` aus `./katalog`; die Wörter `function|class|const|let|var` dürfen nicht vorkommen, F2d).
- **Liefert:** alle Namen aus Abschnitt 6, die P0 zugeordnet sind. `neuesSpielMitTutorial` = `{ ...neuerSpielstand(jetzt_ms, ortId), tutorial: { kapitel: 1 } }`. `speichern.ts:132,158` und `main.ts:48` rufen sie (Rückfrage P0-3: Import in beiden aus `./core/start` bzw. `./start`; `main.ts` behält `Spiel` aus `./core/spiel`). `Steuerung.tutorialMelden(_m) {}`, `tutorialSperreKnopf(_b) { return null; }`. (F2) `spiel.ts`: `tutorialAktiv`, `wandstationFrei`, `WANDSTATION_TUTORIAL`.
- **Tests `tests/nr13-vertrag.test.ts`:** `test_nr13_neues_spiel_hat_merke` (`ladenMitBefund(null, T0)` → Befund `neu`, `tutorial` = `{ kapitel: 1 }`); `test_nr13_kaputter_stand_hat_merke` (`'{kaputt'` → `defekt`, Merke da); `test_nr13_alter_stand_ohne_merke` (`serialisieren(altesStartdorf(T0))` laden → `tutorial` undefined, `tutorialAktiv()` false, `wandstationFrei()` true); `test_nr13_startdorf_gleich` (`neuesSpielMitTutorial(T0)` ohne `tutorial` deep-gleich `neuerSpielstand(T0)` – F2: kein weiteres Feld erlaubt).
- **Eskalation:** Wird nach P0 irgendein bestehender Test rot → STOP, melden (gemessen F1: keiner).
- **Risiko-Auslöser:** nein.

### Bauplan P1 – Schrittlogik (schwer: Zustandsautomat mit 26 Schritten, Wiedereinstieg, Pflicht-Regeln)
- **Dateien:** neu `src/core/tutorial.ts`, neu `tests/nr13-tutorial-logik.test.ts`.
- **Nutzt:** Vertragstypen (P0), `ERSTE_HAEUSER`, `TUTORIAL_SPUR` (start.ts), `KATALOG`, `istLeitung` (katalog.ts), `Spielstand`. **Nicht** `spiel.ts`, `netz.ts`, `engstelle.ts`, nichts aus `ui/` (U3, F2c).
- **Liefert:** `TutorialLage`, `TUTORIAL_SCHRITTE`, `TUTORIAL_TEXT_MAX`, `TUTORIAL_ZURUFE`, `einstieg`, `Tutorial` (Abschnitt 6).
- **Regeln:**
  - Schrittliste = DESIGN 13.5 wörtlich in der Fassung **nach 13.15** (T17 nach K1, T03/T12 nach K3). Kapitelnamen: „Die Heizzentrale“, „Planen mit Philipp“, „Leitung ziehen“, „Übergabestationen“, „Bauen“, „Warm!“.
  - (F2) **Ansicht je Schritt** (Rest aus 13.5; nicht genannte Felder: `finger 'aus'`, `abdunkeln 'alles'`, `kamera 'steht'`, `kamera_ziele []`, Booleans false):

    | Schritt | ziele | finger | sonst |
    |---|---|---|---|
    | T01 | heizzentrale | tippen | kamera_ziele [heizzentrale] |
    | T02, T04 | heizzentrale | – | kamera_ziele [heizzentrale]; T02 `effekt 'hz_federn'` |
    | T03 | heizzentrale, waerme_pille | – | kamera_ziele [heizzentrale]; `effekt 'pille_huepfen'` |
    | T05 | haus1, haus2 | – | `kamera 'fahrt'`, kamera_ziele [haus1, haus2] |
    | T06, T07 | haus1 | – | kamera_ziele [haus1]; `info_kapsel` |
    | T08, T20 | bauen | tippen | |
    | T09 | reiter_leitungen | tippen | |
    | T10 / T21 | philipp / laura | tippen | T21 `nach_handlung_schliessen 'baumenue'` |
    | T11 | kasten_abschnitt | – | `weiter 'wartet'` bis Phase ≠ planung |
    | T12 | leitungskarte | tippen | `leitung_typ`, kamera_ziele [heizzentrale, haus1, haus2] (= Startansicht T13) |
    | T13 | – | spur (nach erstem `leitung_gezeichnet` in diesem Schritt: aus) | `abdunkeln 'nur_hud'`, `kamera 'frei'`, (F3) kamera_ziele [heizzentrale, haus1, haus2] (Startansicht = eingepasst bei Eintritt), `kamera_grenze`, `spur`, `erreicht_zeigen` |
    | T14 | abschliessen | tippen | (F3) kommt nur bei reichendem Geld vor |
    | T15 / T18 | haus1 / haus2 | tippen | kamera_ziele [haus1] / [haus2], `normale_aktion` |
    | T16 | kasten_station | – | kamera_ziele [haus1] |
    | T17 / T19 | puffer_knopf, haus1 / puffer_knopf | tippen | kamera_ziele [haus1] / [haus2], `nach_handlung_schliessen 'blatt'` |
    | T22 | – | – | `abdunkeln 'nichts'`, `kamera 'fahrt'`, kamera_ziele [heizzentrale, haus1, haus2] (Mitte der Baustelle) |
    | T23 | geld_pille | – | `weiter 'wartet'` bis kein Abschnitt |
    | T24 | haus1, haus2 | – | |
    | T25 | leitungsstueck | – | `wusstest_du` |
    | T26 | – | – | `abdunkeln 'nichts'`, `weiter 'los'` |
  - (F2) **T25 Leitungsstück** (K9, Rückfrage P1-6): gebautes Leitungsfeld (nicht `geplant`), dessen Mitte der Mitte zwischen Heizzentrale und Haus 1 am nächsten liegt (Gleichstand: kleinere id). `objekt_ids.leitungsstueck` = dieses Feld plus seine bis zu zwei Leitungsnachbarn (gleiches x±1/y±1). Außerhalb T25 `[]`.
  - (F2) **Texte (K2/K3):** Platzhalter liefern Zahl **mit** Einheit (`{kessel_kw}` → „60 kW“, `{kap_kw}`, `{kwh}` → „15.000 kWh“, `{kw_ohne}`, `{kw_puffer}` → „7,5 kW“); eigenes Format in `tutorial.ts`: Tausenderpunkt, Dezimalkomma, höchstens eine Nachkommastelle, „,0“ fällt weg, U+00A0 vor der Einheit. `{leitung}` = Kurzform aus dem Katalognamen („25er“), `{Name}` = `lage.spielerName`. Satzregel K2: Satzende = `.`/`!`/`?` vor Leerzeichen oder Textende; ein Zuruf aus `TUTORIAL_ZURUFE` am Anfang zählt nicht.
  - Weiterschalten: W-Schritt nur mit `tipp: 'weiter'` (T26 heißt der Knopf `los`); H-Schritt nach NR18 5.4. Wo es einen Zustand gibt, entscheidet **der Zustand**: T10 Abschnitt vorhanden; T11 frei, sobald Phase ≠ `planung`; (F3) T13 → T14 genau dann, wenn beide Tutorial-Häuser in `erreichteHaeuser()` **und** `tutorialGeldFehlt_eur() === 0`; T14 → T13 zurück, sobald eins davon nicht mehr gilt (T14 kennt damit keinen Geldmangel); T14 → T15 Phase `bestellen`; T17/T19 Haus 1 bzw. 2 hat `station`; T21 Phase `bau`; T23 frei, sobald kein Abschnitt mehr da ist. Reine Tipps: T01 `heizzentrale`, T08/T20 `baumenue`, T09 `reiter_leitungen`, T12 `leitungskarte` **mit** `typ === leitung`, T15/T18 `haus` **mit** `objekt_id` des richtigen Hauses.
  - Beim Eintritt in einen H-Schritt, dessen Zustand schon erfüllt ist, sofort weiter. T09 wird durchlaufen, wenn direkt nach `baumenue` ein `reiter_leitungen` kommt (P4 sendet beides sofort, weil das Baumenü im Tutorial immer auf „Leitungen“ öffnet – K9). (F2, Rückfrage P1-7) **Nach T20 gibt es keinen Zwischenschritt:** `baumenue` in T20 → T21.
  - T13b: Text wechselt, solange genau ein Tutorial-Haus erreicht ist; `haus_getrennt` → T13-Text.
  - (F3) **Weg b (ENTSCHEIDUNGEN 2026-11-06):** Die T13/T14-Bedingung wird bei **jedem** `schritt`/`tipp`/`handlung` und in `zustandPruefen()` neu bewertet (Geld ändert sich auch ohne Ereignis, z. B. durch Zurück, das kein `haus_getrennt` auslöst). Blasentext in T13, Vorrang: Sperr-Satz > **Geld-Satz** (immer, wenn `tutorialGeldFehlt_eur() > 0`, egal wie viele Häuser erreicht sind – K7 „Weiterzeichnen macht es nur schlimmer“) > T13b > Hilfe > Grundtext. Der Geld-Satz ist derselbe Text wie der Sperr-Satz der Geld-Sperre (K7, 91 Zeichen). (F3, K12 Muss) Sind beide Häuser erreicht und fehlt Geld, weichen **alle** Häuser-Sätze dem Geld-Satz – auch der Sperr-Satz von [X]/[?] (`blatt_schliessen`) und der Hilfe-Satz nach drei Fehltipps. **Tester:** verdeckte Abnahme „in T14 steht der Geld-Satz“ umstellen auf „Schritt bleibt T13, Blase = Geld-Satz; nach Zurück (Geld reicht) → T14-Text“. Beim Rückfall T14 → T13 zählt das als Schrittwechsel (Fehltipps auf 0), Finger bleibt aus (der erste Strich ist schon gemacht).
  - (F2) **Fehltipps (K4):** `daneben` zählt je Schritt. Ab drei Fehltipps: im H-Schritt ersetzt der Hilfe-Satz den ganzen `text`; im W-Schritt `knopf_hinweis = 'Tippe auf Weiter.'`, `text` bleibt; bei `weiter: 'wartet'` keine Hilfe. In T13 geht T13b der Hilfe vor (Zähler läuft weiter). Schrittwechsel setzt zurück. Falscher Tipp/falsches Objekt zählt nicht und schaltet nicht.
  - (F2) **Sperr-Satz:** `gesperrtGetippt(b)` legt `sperre(b).satz` als `text` (Vorrang vor allem) bis `handlung()`, einem `schritt`-Ereignis oder einem Schrittwechsel.
  - Kapitelwechsel → `lage.tutorialKapitelSetzen(k)`. T26 `los` → `lage.tutorialBeenden()`; danach `aktiv()` false, `ansicht()` null.
  - `sperre(b)`: im Tutorial `zoom`, `doerfer`, `auftrag`, `verwerfen`, `sofort`, `express`, `weiter_einzeichnen` immer gesperrt; (F2) `karte_gesten` außer in **T13**; `blatt_schliessen` in T13 mit Satz „Die Leiste bleibt offen, bis beide Häuser erreicht sind.“; `abschliessen` in T13 mit `kurz` „noch 1 Haus fehlt“/(F3, K11) „2 Häuser fehlen“ (U+00A0 zwischen Zahl und Wort) und Satz „Zieh die Leitung bis an beide Häuser – folge der gelben Spur.“; (F2, K7; F3 nur noch T13) wenn `tutorialGeldFehlt_eur() > 0` in T13: `kurz` „Geld reicht nicht“, Satz „Dann reicht dein Geld nicht mehr für die Stationen. Nimm mit Zurück ein paar Leitungen weg.“ – die Geld-Sperre geht der Häuser-Sperre vor.
  - `einstieg(lage)` nach Tabelle 13.7 (F3: Zeile „offen, beide verbunden“ → T12; T13 → T14 nur, wenn das Geld reicht, sonst bleibt T13 mit Geld-Satz). (F2, K9) Mit `wiedereinstieg: true` zeigt die erste Ansicht „Weiter geht’s, {Name}! Wir waren gerade bei: {Kapitelname}.“ (Kapitel des **berechneten** Schritts; endet der Name auf „!“, kein Schlusspunkt – K2) als W mit [Weiter], `ziele []`, danach den Schritt.
- **Tests (`TutorialLage` als einfaches Objekt nachgebaut, keine Grafik):**
  - `test_nr13_reihenfolge_t01_bis_t26` – alle richtigen Handlungen ergeben genau T01…T26, danach `tutorialBeenden` einmal gerufen, `ansicht` null.
  - `test_nr13_jeder_schritt_wartet` – je Schritt: `weiter` in H-Schritten, jeder andere `Tipp`, jedes andere `Schritt`-Ereignis und das richtige mit falscher `objekt_id` schalten nicht.
  - `test_nr13_wartet_auf_planung_und_bau` – T11/T23 `weiter: 'wartet'`, `warte_bis_ms` = Abschnittsende, `warte_text` enthält „{Restzeit}“; `weiter` wirkungslos; nach Phasenwechsel `'weiter'`.
  - `test_nr13_t13_beide_haeuser` – ein Haus → T13b-Text, Schritt bleibt; `haus_getrennt` → T13-Text; beide → T14.
  - `test_nr13_fehltipps_hilfe` (F2) – H (T01): zwei `daneben` ohne, drittes → `text` = Hilfe-Satz; W (T02): `text` unverändert, `knopf_hinweis` = „Tippe auf Weiter.“; T11 wartend: keine Hilfe; nach Schrittwechsel weg.
  - `test_nr13_texte_laenge` (F2) – alle Texte, Hilfe-Sätze, Sperr-Sätze, Wiedereinstiegs-Sätze (alle sechs Kapitel) und die Info-Kapsel mit 20-Zeichen-Namen und den Werten `kwh` 99.999, `kw_ohne` 17,5, `kw_puffer` 12,5, `kessel_kw` 999 ≤ 120 Zeichen ohne `**`; höchstens 2 Sätze nach K2.
  - `test_nr13_texte_aus_werten` (F2) – `kessel_kw` 60 → „60 kW“ (mit U+00A0) in T03; 75 → „75 kW“; `kw_puffer` 7,5 → „7,5 kW“ in T17; `leitung 'd32'`, `kap_kw` 30 → „32er“ und „30 kW“ in T12, `leitung_typ 'd32'`; Info-Kapsel T06 „15.000 kWh im Jahr · bis 10 kW“.
  - `test_nr13_ansicht_felder` (F2) – Tabelle oben Zeile für Zeile: `ziele`, `finger`, `abdunkeln`, `kamera`, `kamera_ziele`, `kamera_grenze`, `spur`, `erreicht_zeigen`, `info_kapsel`, `effekt`, `nach_handlung_schliessen`, `normale_aktion`; T13 `finger` nach erstem `leitung_gezeichnet` 'aus'.
  - `test_nr13_leitungsstueck_t25` (F2) – Lage mit gebauter Spur → id des Felds nächst der Mitte HZ/Haus 1 plus Nachbarn; geplante Felder zählen nicht.
  - `test_nr13_wiedereinstieg_tabelle` – je Zeile der 13.7-Tabelle ein Fall → erwarteter Schritt; (F2) Merke 2 + Zustand T15 → „Wir waren gerade bei: Übergabestationen.“; Kapitel 6 → „… bei: Warm!“.
  - `test_nr13_sperren` (F2) – je Schritt wie oben; `karte_gesten` nur in T13 frei; Geld-Sperre (`tutorialGeldFehlt_eur() = 1`) vor Häuser-Sperre; (F3) in T14 nie Geld-Sperre; außerhalb des Tutorials alle `null`.
  - `test_nr13_sperr_satz_vorrang` (F2) – `gesperrtGetippt('abschliessen')` in T13 → `text` = Sperr-Satz, auch bei drei Fehltipps; nach `handlung()` wieder T13-Text bzw. Hilfe.
  - `test_nr13_ohne_namen_keine_ansicht` – `namen_gefragt: false` → `ansicht` null.
  - (F3) `test_nr13_t13_weg_b_geldmangel` – Lage: beide Häuser erreicht, `tutorialGeldFehlt_eur() = 500` → nach `haus_erreicht` bleibt `schritt` T13, `text` = Geld-Satz, `sperre('abschliessen').kurz` = „Geld reicht nicht“; Geld auf 0 + `zustandPruefen()` → T14 mit T14-Text und `finger 'tippen'`; in T14 Geld wieder 1 + `zustandPruefen()` → T13 mit Geld-Satz; in T14 nur noch ein Haus erreicht + `zustandPruefen()` → T13 mit T13b-Text; ein Haus + Geld fehlt → Geld-Satz; `zustandPruefen()` in T01/T15 ändert nichts.
  - (F3) `test_nr13_geld_satz_laenge` – Geld-Satz mit 20-Zeichen-Namen ≤ 120 Zeichen, ≤ 2 Sätze (gehört in `texte_laenge`, hier eigens, weil er jetzt Blasentext ist).
  - (F3) `test_nr13_kamera_ziele_t05_t13_t22` – `kamera_ziele`: T05 [haus1, haus2], T13 [heizzentrale, haus1, haus2], T22 [heizzentrale, haus1, haus2]; T13 `kamera 'frei'`, T05/T22 `'fahrt'`.
- (F2, Rückfrage P1-8) Tutorial-Häuser = Objekt der Kategorie `haus` mit **genau** `o.x/o.y` = Koordinate aus `ERSTE_HAEUSER` (wie `nr13Aufraeumen`), keine Flächenprüfung; Heizzentrale = Objekt `typ 'hz'`.
- **Randfälle:** Tutorial-Häuser fehlen in der Lage → `aktiv()` false (kein Absturz); viele `leitung_gezeichnet` beim Wischen schalten höchstens einmal.
- **Eskalation:** Ein Text passt mit den Prüfwerten nicht in 120 Zeichen → nicht kürzen, melden (laut K1 passt T17 mit 120 knapp).
- **Risiko-Auslöser:** nein (keine Daten von außen, kein Netz).

### Bauplan P2 – Kern-Anbindung (mittel: kleine Eingriffe an bestehenden Aktionen, Spielstand-Laden)
- **Dateien:** `src/core/spiel.ts`, `src/core/katalog.ts` (nur `KONSTANTEN.tutorial_planung_s/tutorial_bau_s`), `src/core/speichern.ts` (nur `nr13Aufraeumen` und sein Aufruf), neu `tests/nr13-kern.test.ts`.
- **Nutzt:** `ERSTE_HAEUSER`, `neuesSpielMitTutorial`, `WANDSTATION_TUTORIAL` (P0), `passendeLeitung` (`spiel.ts:96`), `passendePufferStation`, `bedarfKw`, `abschnittKosten_eur` (`:726`), `stationspreis_eur` (`:1198`), `jahresverbrauch_kwh` (`:116`).
- **Liefert:** P2-Methoden aus Abschnitt 6.
- **Regeln:**
  - (F2, Rückfrage P2-1/2) **Zeiten:** `neuerBau(art, dauer_s, faktor = KONSTANTEN.bauzeit_faktor)` – neuer dritter Parameter mit Standardwert, alle bisherigen Aufrufe bleiben unverändert. `abschnittPlanen`: bei `stand.tutorial` `neuerBau('neu', KONSTANTEN.tutorial_planung_s, 1)`; `materialBestellen`: bei `stand.tutorial` `neuerBau('neu', KONSTANTEN.tutorial_bau_s, 1)`. `liefertage(dauer_ms = KONSTANTEN.abschnitt_bau_s * KONSTANTEN.bauzeit_faktor * 1000)` = `max(1, round(dauer_ms / SPIELTAG_MS))`; `materialBestellen` übergibt immer die tatsächliche Dauer `a.bau.ende_ms − a.bau.start_ms` (normal unverändert 46 Tage, Tutorial „1 Tag“). Bestehender Test `anpassungen.test.ts:956` ruft `liefertage()` ohne Argument – bleibt gleich.
  - `stationKaufen`: bei `stand.tutorial`, Kategorie `haus` und Nicht-Puffer-Station → `this.nein(WANDSTATION_TUTORIAL)`, nichts bezahlt.
  - `startTippFaellig()` false, solange `stand.tutorial` da ist.
  - `tutorialWerte()`: `kessel_kw` = `netz.verfuegbar_kw`; für Haus 1: `kwh` = `jahresverbrauch_kwh`, `kw_ohne` = `bedarfKw` ohne Puffer, `kw_puffer` = mit Puffer; `leitung` = `passendeLeitung(Summe kw_puffer beider Tutorial-Häuser)`, `kap_kw` deren `kapazitaet_kw`. Keine zweite Netzrechnung (AE-NR18-3).
  - (F2, Rückfrage P2-3) `tutorialGeldFehlt_eur()` = max(0, `abschnittKosten_eur()` + Σ `stationspreis_eur(haus, passendePufferStation(…))` für jedes Tutorial-Haus ohne `station` − `geld_eur`) – **derselbe Preis, den `stationKaufen` abbucht** (mit Nachlass bei Interessenten), nicht der Listenpreis. 0 außerhalb der Phasen `offen`/`bestellen` und ohne Tutorial.
  - `tutorialKapitelSetzen(k)` nur bei laufendem Tutorial und ganzer Zahl 1–6; `tutorialBeenden()`/`tutorialUeberspringen()` löschen das Feld.
  - `speichern.ts` `nr13Aufraeumen` nach Abschnitt 5.
- **Tests:**
  - `test_nr13_tutorial_zeiten` – Stand aus `neuesSpielMitTutorial`: Planung endet nach 10 s (`abschnitt_offen` bei 10,0 s, nicht bei 9,9 s), Bau nach 20 s; Laura sagt „Lieferzeit: 1 Tag.“; zweiter Abschnitt nach `tutorialBeenden` wieder 75 s / 900 s.
  - `test_nr13_wandstation_gesperrt` – im Tutorial Wandstation abgelehnt (Geld gleich, Hinweis = `WANDSTATION_TUTORIAL`), Puffer-Station geht; nach `tutorialBeenden` Wandstation am dritten Haus erlaubt; alter Stand: erlaubt.
  - `test_nr13_start_tipp_nicht_im_tutorial` – nach `namenSetzen` im Tutorial `startTippFaellig()` false; nach `tutorialUeberspringen` true.
  - `test_nr13_werte` (F2) – Startdorf: `kessel_kw` 60, `kw_puffer` = `bedarfKw({…haus1, hauspuffer: true})`, `leitung` 'd25' (DESIGN 13.9). **Mit geändertem Katalogwert** (im Test setzen, in `finally` zurücksetzen): `KATALOG.d25.kapazitaet_kw = 12` → `leitung` 'd32', `kap_kw` = `KATALOG.d32.kapazitaet_kw`; `KATALOG.efh.verbrauch_kwh_a` × 1,2 → `kwh`, `kw_ohne`, `kw_puffer` je × 1,2 (auf 0,01 genau).
  - `test_nr13_leitung_traegt_ohne_warnung` – Spur `TUTORIAL_SPUR` mit `tutorialWerte().leitung` einzeichnen, abschließen → `abschnittWarnungen()` leer; zwei Puffer-Stationen, bestellen, bauen → beide `ERSTE_HAEUSER` warm; dasselbe mit `d25.kapazitaet_kw = 12` (dann 'd32').
  - `test_nr13_geld_reicht` – Kosten des Tutorial-Ablaufs ≤ Startgeld − 5.000 € (erwartet Rest 14.460 € laut NR19-Abnahme); `tutorialGeldFehlt_eur()` dabei 0; bei Geld 1.000 € > 0; (F2) nach Kauf von Station 1 zählt nur noch Station 2.
  - `test_nr13_merke_laden` – kaputte Merke (`'x'`, `{kapitel: 9}`, `{kapitel: 1.5}`, `[]`) → Feld weg, Befund nicht `defekt`; Haus 1 verschoben → weg; gültige Merke bleibt nach Speichern/Laden gleich.
- **Randfälle:** `tutorialUeberspringen` mitten im Tutorial (laufender Abschnitt behält seine kurze Restzeit – harmlos); Tempo ×60 wirkt über die Uhr.
- **Eskalation:** `passendeLeitung` liefert für das Startdorf nicht 'd25' oder es kommt eine Warnung → STOP, melden.
- **Risiko-Auslöser:** (F2) **ja, eingeschränkt – Spielstand-Reparatur an der Grenze** (`nr13Aufraeumen` liest ein Feld aus dem gespeicherten Text; wie NR18 P6). Sicherheitsprüfer schaut nur auf: Feld wird nur gelöscht, nie interpretiert; kein Absturz bei beliebigem Inhalt.

### Bauplan P3 – Bausteine und Blätter (mittel: viele Maße aus DESIGN 13.2/13.3/13.15, Eingabesperre, Barrierefreiheit)
- **Dateien:** wie Tabelle. Nur DOM über `h()`/`textContent`, kein `createElementNS`, SVG nur per DOMParser (U6).
- **Nutzt:** Vertragstypen, Szene-Felder, `Ui.tutorialMelden`/`tutorialSperreKnopf`, `spiel.wandstationFrei()`, `WANDSTATION_TUTORIAL` (alles P0); bestehend `h`, `knopf`, `ersteSperre`, `zeitText`, Tokens.
- **Liefert (P4 baut darauf):**
  ```ts
  // ui/spotlight.ts
  export interface Rechteck { x: number; y: number; b: number; h: number }
  export interface Loch { r: Rechteck; form: 'ellipse' | 'rund'; radius_px?: number }
  export type Finger = { art: 'tippen'; ziel: Rechteck } | { art: 'spur'; punkte: ReadonlyArray<readonly [number, number]> };  // (F2) Bildschirm-px
  export function spotlightSetzen(z: { loecher: Loch[]; abdunkeln: 'alles' | 'nur_hud' | 'nichts'; finger: Finger | null; ruhig: boolean; hud: Rechteck | null }): void;
  export function spotlightAus(): void;
  export function abdunkelPfad(breite: number, hoehe: number, loecher: Loch[], nur: Rechteck | null): string;  // (F2) rein rechnend
  export function eingabeSperre(s: { erlaubt: (x: number, y: number) => boolean; daneben: () => void; tab_ziele: () => HTMLElement[] } | null): void;
  export function eingabeErlaubt(x: number, y: number): boolean;                 // (F2) aktueller Zustand, true ohne Sperre (für Tests)
  export function stupsen(ruhig: boolean): void;
  export function ersatzZiel(z: { r: Rechteck; name: string; enter: () => void } | null): void;  // (F2) 13.11/K9
  export function infoKapsel(text: string | null, loch: Rechteck | null): void;  // (F2) K9
  export function zielSichtbarMachen(el: HTMLElement, ruhig: boolean, fertig: () => void): void;  // (F2) K9 Blatt scrollt
  export const KARTEN_VORLESENAME: Readonly<Record<'heizzentrale' | 'haus1' | 'haus2', string>>;  // „Heizzentrale“, „Haus 1“, „Haus 2“
  // ui/anleiter.ts
  export interface AnleiterPlatz { links: number; unten?: number; oben?: number; breite: number; figur_px: 112 | 72 }
  export function anleiterPlatz(frei: Rechteck, ziel: Rechteck | null, bild: { breite: number; hoehe: number }): AnleiterPlatz;
  export function anleiterZeigen(a: TutorialAnsicht, platz: AnleiterPlatz, aktionen: { weiter(): void }, jetzt_ms: number): void;
  export function anleiterRechteck(): Rechteck | null;
  export function anleiterAusblenden(): void;
  // ui/sprecher.ts
  export function sprecherAktiv(): boolean;
  // ui/toast.ts (F2)
  export function meldungenStumm(an: boolean): void;
  export function toastWichtig(text: string): void;
  // ui/hud.ts (F2)
  Hud.tutorialModus(an: boolean): void;            // Zoomknöpfe, [Dörfer], Auftragskarte aus/ein
  // ui/blatt.ts (F2)
  BlattOptionen.zuSperre?: SperreJetzt;              // [X] und Esc: bei Sperre wackeln + hinweis, nicht schließen
  // render/kamera.ts
  fahrtZu(x: number, y: number, kante: number, ziel_x_px: number, ziel_y_px: number, zoom: number | null, dauer_ms: number, jetzt_ms: number): void;
  fahrtLaeuft(jetzt_ms: number): boolean;
  einpassen(f: { x0: number; y0: number; x1: number; y1: number }, frei: { x: number; y: number; b: number; h: number }, rand_px: number, zoom_max: number): void;  // (F2)
  grenzeSetzen(g: { x0: number; y0: number; x1: number; y1: number; mitte_px: readonly [number, number]; zoom_min: number; zoom_max: number } | null): void;  // (F2) K5
  ```
- **Regeln:**
  - Maße/Farben/Zeiten nur aus Tokens (13.10 eintragen); Platzregel 13.3 vollständig in `anleiterPlatz` (rein rechnend). Anleiter: `role="status"`, `aria-live="polite"`, Kapitel-Punkte mit Vorlesetext „Kapitel n von 6“, [Weiter] (`id="anleiter-weiter"`) bzw. [Los geht’s] ≥ 44 px; (F2) Fokus auf [Weiter], sobald er erscheint (13.11); `knopf_hinweis` bzw. Wartetext gedämpft links in der Knopfzeile (`{Restzeit}` per `zeitText` aus `warte_bis_ms − jetzt_ms`); „Wusstest du?“-Chip; Fett-Marken → `<strong>`.
  - (F2, U6/Rückfrage P3-4) **Spotlight-Technik:** ein `div` über Karte und HUD mit `clip-path: path(evenodd, …)` aus `abdunkelPfad` (Außenrechteck + je Loch Ellipse bzw. abgerundetes Rechteck als Bögen; bei `nur_hud` nur das HUD-Rechteck). Lochränder (3 px `spot_ring`, 2 px Kontur, 16 px Schein) als je ein `div` mit `border-radius`. Kein Canvas, kein SVG. Spotlight, Finger, Ringe, Kapsel `aria-hidden`.
  - (F2) Finger `tippen` nach 13.2 (600 ms Verzögerung, 6 px/400 ms, 1.200 ms Ruhe); `spur` fährt `punkte` in 2.400 ms gleichmäßig ab, 600 ms Pause, von vorn (K9); `ruhig`: Finger steht still (bei `spur` am ersten Punkt).
  - Eingabesperre nach AE-NR13-6; `tab_ziele` bildet die Tab-Reihenfolge (nur Ziel und [Weiter]); Enter auf `ersatzZiel` ruft `enter`. `ersatzZiel`: unsichtbares, fokussierbares Element über dem Loch, `aria-label` = Name, `pointer-events: none`, Ring nur bei Tastaturfokus.
  - (F2) `infoKapsel`: Chip `neutral` 26 px, mittig 8 px über dem Loch; reicht der Platz unter top 64 nicht, 8 px darunter; Blende 200 ms.
  - (F2) `zielSichtbarMachen`: nächster scrollender Vorfahr (`.inhalt`), kürzester Weg, 8 px Abstand, 200 ms weich (`ruhig`: sofort), danach `fertig()`.
  - (F2) **Spur in der oberen Ebene (K10, Rückfrage P3-1):** `szene.ts` zeichnet `tutorial_spur` direkt **nach** `zeichneLeitungen` (`szene.ts:258`) und vor den Gebäuden – nie in `zeichneBoden`/Bodenebene, `bodenSchluessel` bleibt unverändert. Pfeilspitze alle drei Felder ab dem Abgang. `szenenSchluessel` (`szene-schluessel.ts:37`) bekommt Anzahl der Spurfelder und die `erreicht`-ids, damit das Bild neu gezeichnet wird. `erreicht`: Kunden-Blase mit grünem Haken statt „kein Anschluss“-Blase, 450 ms Federn ab `seit_ms` (bei „Weniger Bewegung“ ohne).
  - (F2) **Toast:** `meldungenStumm(true)` → `toast()` zeigt nichts (auch keine stehende Meldung); `toastWichtig` zeigt immer; `#anleiter` kommt in die Liste der Elemente, über die die Meldung rückt (`toast.ts` `lageAnwenden`).
  - (F2) **Kamera-Grenze (K5):** Mit `grenze` hält `begrenzen()` das Feld unter `mitte_px` im Rechteck (ohne Rückfedern) und `zoomUm` den Zoom in `[zoom_min, zoom_max]`; ohne Grenze wie heute (1–4). Kamerafahrt 1.200 ms `kurve.weich`, `ruhig`: Schnitt mit Blende (13.6); Fahrt hängt nur an `jetzt_ms` (nach Rückkehr aus dem Hintergrund am Ziel).
  - Simon-Platzhalter in `AUSSEHEN` (Jacke `#ff8a1f`, Kragen `#3a92ea`, kein Helm; Feld `kragen?`), Foto-Erkennung wie bisher; `sprecherAktiv()`.
  - (F2) **Blätter:** `data-ziel` an: HUD Wärme-Pille `waerme_pille`, Geld-Pille `geld_pille`, [Bauen] `bauen`; Baumenü Reiter „Leitungen“ `reiter_leitungen`, Philipp-Knopf `philipp`, Kasten „Bauabschnitt“ `kasten_abschnitt`, **jede** Leitungskarte `leitungskarte` mit `data-typ="<TypId>"`, Laura-Knopf `laura`; Hausblatt Kasten „Übergabestation wählen“ `kasten_station`, Knopf der kleinsten passenden Puffer-Station `puffer_knopf`. Reiter-Klick „Leitungen“ meldet `{tipp:'reiter_leitungen'}`, Leitungskarte `{tipp:'leitungskarte', typ}` über `ui.tutorialMelden` (zusätzlich zur normalen Aktion). Verwerfen/Sofort fertig/Express: `ersteSperre(ui.tutorialSperreKnopf(b), …bisherige)`. Hausblatt: ist `!spiel.wandstationFrei()`, ist die Wandreihe gesperrt (12.19, Zeile 2 „später wählbar“, Schloss, Hinweis `WANDSTATION_TUTORIAL`). `Hud.tutorialModus`. `blatt.ts` `zuSperre`.
- **Tests `tests/nr13-bausteine.test.ts` (DOM-Attrappe, eigener `window`-Stub mit Listener-Liste):** `test_nr13_platz_ohne_blatt`, `test_nr13_platz_mit_seitenflaeche_844_und_667` (432 bzw. 336 px), `test_nr13_platz_ziel_unten_wechselt_nach_oben`, `test_nr13_anleiter_weiter_nur_bei_erklaer` (H ohne Knopf; `wartet` zeigt Wartetext mit Restzeit, kein Knopf; W: Fokus auf `#anleiter-weiter`; `knopf_hinweis` sichtbar), `test_nr13_fett_ohne_html`, `test_nr13_sperre_faengt_daneben` (Berührung außerhalb → `daneben` einmal, kommt nicht an; im Loch → kommt an; `eingabeErlaubt` passend), `test_nr13_abdunkel_pfad` (F2: zwei Löcher → Pfad mit Außenrechteck und zwei geschlossenen Teilpfaden; `nur_hud` → nur HUD-Rechteck), `test_nr13_finger_spur` (F2: `spur` mit 6 Punkten → Lage nach 1.200 ms auf halber Strecke; `ruhig` am ersten Punkt), `test_nr13_ersatz_ziel_vorlesename` (F2: `aria-label` „Haus 1“, Enter ruft `enter`), `test_nr13_info_kapsel_lage` (F2: über dem Loch; bei Loch-Oberkante < 64 + Kapsel darunter), `test_nr13_blatt_scrollt_zum_ziel` (F2), `test_nr13_simon_figur_platzhalter`, `test_nr13_kamerafahrt_endet_am_ziel`, `test_nr13_kamera_grenze` (F2: weit schieben → Mitte bleibt im Rechteck; `zoomUm(0.1)` → `zoom_min`; `zoomUm(10)` → `zoom_max`; `grenzeSetzen(null)` → wie vorher), `test_nr13_spur_und_haken_nur_mit_feldern`, `test_nr13_meldungen_stumm_und_wichtig` (F2: stumm → `#toast` leer; `toastWichtig` sichtbar).
- **Tests `tests/nr13-blaetter.test.ts` (F2, `echteSteuerung` mit Leerlauf-Methoden bzw. Ui-Attrappe mit Spion):** `test_nr13_ziele_markiert` (alle `data-ziel` aus der Liste vorhanden; Leitungskarten mit `data-typ`), `test_nr13_reiter_und_karte_melden` (Spion bekommt `reiter_leitungen` bzw. `leitungskarte` mit `typ`), `test_nr13_wandreihe_spaeter_waehlbar` (Stand mit Merke: Wandreihe gesperrt mit „später wählbar“; alter Stand frei), `test_nr13_hud_tutorialmodus` (Zoom, Dörfer, Auftrag versteckt und zurück), `test_nr13_blatt_zu_sperre` ([X] mit Sperre schließt nicht, wackelt; ohne Sperre wie heute).
- **Eskalation:** Eine Maßangabe aus 13.3 ist in 667×375 nicht einhaltbar → melden (Designer). Unterstützt das Ziel-WebView `clip-path: path()` nicht (Prüfen im Browser-Foto) → melden, nicht auf SVG ausweichen.
- **Risiko-Auslöser:** nein.

### Bauplan P4 – Einbindung (schwer: verbindet Kern und Oberfläche über viele Zustände, Lebenszyklus, Wiedereinstieg)
- **Dateien:** `src/steuerung.ts`, `src/main.ts`, neu `tests/nr13-einbindung.test.ts`, neu `tests/nr13-ablauf.test.ts`, neu `tests/nr13-klickweg.test.ts`.
- **Nutzt:** alles aus P0–P3.
- **Liefert:** `Steuerung.anleitungAnsicht(): TutorialAnsicht | null` (nur lesen, für Tests), `Steuerung.nachTutorial(f: () => void): void` (sofort, wenn kein Tutorial läuft, sonst 600 ms nach [Los geht’s]), `Steuerung.toastWichtig(text)`.
- **Regeln:**
  - (F2) `Steuerung` hält **`anleitung: Tutorial | null`** (U1), angelegt im Konstruktor, wenn `spiel.tutorialAktiv()`; `wiedereinstieg` = `namen_gefragt !== false`. Die Zeile `if (spiel.stand.namen_gefragt === false) this.namenFragen();` bleibt wörtlich. Solange aktiv: `meldungenStumm(true)`, `hud.tutorialModus(true)`; nach T26 beides aus.
  - `ereignisse()`: Zweig `ev.art === 'schritt'` → `anleitung.schritt(ev)`; `hinweis` geht weiter an `toast()` (stumm durch AE-NR13-8 – keine eigene Abfrage); `sprecher` weiter zeigen, Anleiter blendet aus, solange `sprecherAktiv()`.
  - **Ansicht anwenden** nach jeder Verarbeitung und wenn sich Kamera-Schlüssel oder Blatt ändern (je Bild prüfen, nur bei Änderung setzen): Löcher aus `ziele` (Kartenziele über `kamera.mitte`, Bedienelemente über `[data-ziel]`, Leitungskarte über `[data-ziel="leitungskarte"][data-typ="<leitung_typ>"]`, Leitungsstück über `objekt_ids.leitungsstueck`); liegt ein Ziel in einem Blatt, zuerst `zielSichtbarMachen`, dann Loch (K9). Finger `tippen` auf `ziele[0]`, `spur` mit `TUTORIAL_SPUR` → `kamera.mitte`. Szene: `tutorial_spur` = `TUTORIAL_SPUR` ohne Felder mit Leitung, nur bei `spur`; `erreicht` = `erreichteHaeuser()` ∩ Tutorial-Häuser mit Zeitpunkt des ersten Auftauchens, nur bei `erreicht_zeigen`. `infoKapsel(info_kapsel, Loch Haus 1)`. `effekt` beim Schrittwechsel abspielen (Kann).
  - **Kamera:** ändern sich `kamera_ziele` (nicht leer) oder die freie Breite → Mitte der Ziele auf Mitte der freien Breite / 38 % Höhe (`faktor.anleiter_ziel_hoehe`), Zoom 3 Handy bzw. 1,9 Desktop; bei `kamera 'fahrt'` per `fahrtZu`, Abdunkeln `'nichts'` bis `!fahrtLaeuft`. Für T12 (`kamera_ziele` mit drei Zielen) `einpassen` mit 24 px Rand, Zoom ≤ 3. (F2) `kamera_grenze` wird true → `grenzeSetzen` mit Rahmen um Heizzentrale + beide Häuser, `mitte_px` = Mitte der freien Fläche, `zoom_min` = Zoom in diesem Moment (Startansicht), `zoom_max` 3; false → `grenzeSetzen(null)`. Im Tutorial öffnet `kontext()` die Kamera auf 38 % statt 58 %.
  - (F2) **Gesten-Sperre (Befund 5):** `pointermove`-Verschieben (`:366`), Zwei-Finger-Zoom (`:352–355`), Mausrad (`:378`), Pfeiltasten und +/− fragen `tutorialSperre('karte_gesten')` (intern `anleitung?.sperre(...)`) und tun bei Sperre nichts; Drehen (Zwei-Finger `:356–358`, Mitteltaste `:335`, Q/E) ist bei aktiver `anleitung` immer aus. Zeichnen im Stempel-Modus bleibt.
  - **Tipps:** Kartentipp (`tippen`): trifft er Heizzentrale/Tutorial-Haus, `tutorialMelden({tipp:'heizzentrale'})` bzw. `{tipp:'haus', objekt_id}`; das Blatt öffnet nur bei `normale_aktion` (F2), sonst öffnet ein Kartentipp im Tutorial nichts. [Bauen]: `tutorialMelden({tipp:'baumenue'})`, im Tutorial `katalog('netz')` und direkt danach `{tipp:'reiter_leitungen'}`. [Weiter]/[Los geht’s] → `{tipp:'weiter'}`; `daneben` aus `eingabeSperre` → `{tipp:'daneben'}` + `stupsen`. `nach_handlung_schliessen` wie in der Tabelle in Abschnitt 6 (Blatt nach 200 ms, Baumenü sofort).
  - (F2) **Zeichenleiste im Tutorial:** Erst-Hilfe klappt nicht auf (`hilfeOffen = false`; `zeichenhilfe_gesehen` wird wie heute gesetzt, K9); `data-ziel="zeichenleiste"` an der Leiste, `abschliessen` am Knopf; Sperre [Abschnitt abschließen] = `ersteSperre(abschnittSperreKurz, nichts gezeichnet, tutorialSperreKnopf('abschliessen'))` (13.7: B6 zuerst); [X] über `zuSperre` und [?] mit `tutorialSperreKnopf('blatt_schliessen')`; Farbknöpfe, Radierer, Zurück und jeder Strich (`pointerdown` im Stempel-Modus) rufen `anleitung.handlung()`. (F2, K8) `leisteAbschliessen` öffnet im Tutorial **kein** Baumenü (`steuerung.ts:250`), die Kamera bleibt.
  - **Namensfenster:** im Tutorial keine Begrüßungs-Meldung, kein Start-Tipp, danach Ansicht anwenden (T01). „Ohne Tutorial starten“ nur bei `tempo() > 1` → `spiel.tutorialUeberspringen()`, `anleitung = null`, dann wie heute (Begrüßung + Start-Tipp).
  - (F2) **Fokus (13.11/K9):** H-Schritt mit Bedienelement → Fokus auf das `[data-ziel]`-Element im Loch; H-Schritt mit Kartenziel → `ersatzZiel` mit `KARTEN_VORLESENAME`, Enter = derselbe Tipp wie Antippen; W-Schritt: Fokus setzt `anleiterZeigen`. `tab_ziele` = Ziel + [Weiter].
  - (F2, K6) **`main.ts`:** „Willkommen zurück“ (A38) nur, wenn `!spiel.tutorialAktiv()` – im Tutorial entfällt sie ganz und wird nicht nachgeholt. Start-Hinweise „defekt/Absturz“ und die Speicher-Warnung (`:181`) über `steuerung.toastWichtig`. Update-Hinweis (`:198`) über `steuerung.nachTutorial(() => hinweisMitKnopf(…))`.
  - Nach T26: Spotlight/Anleiter/Kapsel/Ersatz weg, `grenzeSetzen(null)`, Stummschaltung und Tutorial-Modus aus, erster offener Auftrag federt; Kamera bleibt.
- **Tests:**
  - `tests/nr13-ablauf.test.ts` (echtes `Spiel` + echtes `Tutorial`, ohne Oberfläche, Uhr von Hand): `test_nr13_ablauf_neues_spiel_bis_warm`, `test_nr13_ablauf_neu_laden_t11_und_t18`, `test_nr13_alter_stand_nie` (wie F1).
  - `tests/nr13-klickweg.test.ts` (F2, Befund 6): `test_nr13_klickweg_t01_bis_t26` – `echteSteuerung(new Spiel(neuesSpielMitTutorial(T0), uhr), …, { uhr })` mit Uhr von Hand (`t` wird gesetzt, dann `st.tick(t)`); erste Blase = Wiedereinstieg (die Hilfe setzt `namen_gefragt = true`) → `#anleiter-weiter`. Danach jeder Schritt **nur** über die echte Oberfläche: Kartenziele per `pointerdown`/`pointerup` auf der Leinwand an `kamera.mitte(...)`, Bedienelemente per Klick auf `[data-ziel=…]`, W-Schritte per `#anleiter-weiter`, T13 per Wischen entlang `TUTORIAL_SPUR` (wie `nr18-oberflaeche.test.ts:69`). Nach jedem Schritt `anleitungAnsicht().schritt` = erwartete Folge **T01–T08, T10–T26** (T09 wird im selben Takt durchlaufen) und für jedes Loch-Ziel `eingabeErlaubt(Mitte) === true`. T11/T23: Uhr +10 s/+20 s, erst dann ist `#anleiter-weiter` da. Ende: beide `ERSTE_HAEUSER` in `spiel.netz.warm`, `abschnittWarnungen()` nach T14 leer, `stand.tutorial` undefined, kein `#anleiter` mehr. *(Grenze: die Attrappe rechnet kein Layout und `window`-Listener sind dort Leerlauf – die Lage der Löcher prüfen die Browser-Fotos, die Capture-Sperre der P3-Test.)*
  - `tests/nr13-einbindung.test.ts` (`echteSteuerung`, Stand mit Merke): `test_nr13_daneben_aendert_nichts`; `test_nr13_t01_heizzentrale_ohne_blatt`; (F2) `test_nr13_w_schritt_kartentipp_oeffnet_nichts` (T05 Tipp auf Haus 1 → kein Blatt); (F2) `test_nr13_meldungen_stumm` (Hinweis-Ereignis, direkter Aufruf über `bestaetigen`-Pfad und `steuerung.toast()` → `meldung()` leer; `toastWichtig` sichtbar); `test_nr13_abschliessen_gesperrt_noch_ein_haus` (Zeile 2, Satz in der Blase, keine Meldung); (F2) `test_nr13_abschliessen_geld_sperre` (Geld knapp → „Geld reicht nicht“); (F2) `test_nr13_nach_abschliessen_kein_baumenue`; (F2) `test_nr13_zeichenhilfe_aus` (Leiste in T12 geöffnet → `.zeichen-hilfe` versteckt, `zeichenhilfe_gesehen` true; danach außerhalb des Tutorials öffnet sie nicht von selbst); (F2) `test_nr13_karte_steht_ausser_t13` (T01: Ziehen 100 px, Mausrad, Zwei-Finger → `schiebe_x/y`, `zoom`, `winkel_rad` unverändert; T13: weit ziehen → Mitte bleibt im Rahmen, Zwei-Finger-Zoom heraus → `zoom` = Startzoom, Drehen → `winkel_rad` unverändert); (F2) `test_nr13_blatt_schliesst_nach_kauf` (T17 Kauf → nach 200 ms kein Blatt; T21 Laura → Baumenü zu); (F2) `test_nr13_fokus_und_vorlesename` (T01: Ersatz-Element „Heizzentrale“ fokussiert, Enter → T02; T02: Fokus auf `#anleiter-weiter`); `test_nr13_ohne_tutorial_nur_vorfuehrtempo`; `test_nr13_nach_ende_knoepfe_zurueck`; (F2) `test_nr13_kein_willkommen_zurueck` (nur, falls `main.ts` dafür testbar ist – sonst Quelltext-Prüfung, dass die A38-Meldung an `!spiel.tutorialAktiv()` hängt).
- **Randfälle:** App geht während Kamerafahrt in den Hintergrund → Kamera am Ziel (13.6); Hochformat → Tutorial ruht (CSS-Dreh-Hinweis wie heute); Philipp/Laura sprechen → Anleiter blendet aus und kommt zurück.
- **Eskalation:** Bricht eine der Quelltext-Prüfungen aus Abschnitt 3 oder ein bestehender Oberflächentest → STOP, Tester-Vorarbeit anfordern, Test nicht selbst ändern. Braucht der Klickweg-Test eine Änderung an `tests/hilfen/*` → STOP (Tester-Vorarbeit).
- **Risiko-Auslöser:** nein (keine neue Schnittstelle nach außen).

## 9. (F2) Muss-Zeilen aus DESIGN 13.5 / 13.11 / 13.15 → Paket und Test
| Muss | Paket | Test |
|---|---|---|
| Jeder Schritt wartet, kein Wegtippen (13.1, 13.12/5) | P1, P3, P4 | `jeder_schritt_wartet`, `sperre_faengt_daneben`, `daneben_aendert_nichts` |
| Gesperrter Grundzustand (Auftrag, Dörfer, Zoom, X/?, Verwerfen, Sofort, Express, Wandstation) | P1, P3, P4 | `sperren`, `hud_tutorialmodus`, `blatt_zu_sperre`, `wandreihe_spaeter_waehlbar` |
| Gesten nur in Kapitel 3 (T13), Kamera-Grenze statt Pfeil (13.5, K5) | P1, P3, P4 | `sperren`, `kamera_grenze`, `karte_steht_ausser_t13` |
| T01 Heizzentrale öffnet kein Blatt; Kartentipp in W-Schritten öffnet nichts | P1, P4 | `ansicht_felder`, `t01_heizzentrale_ohne_blatt`, `w_schritt_kartentipp_oeffnet_nichts` |
| T03 zwei Löcher | P1, P3 | `ansicht_felder`, `abdunkel_pfad` |
| T05/T22 Kamerafahrt 1.200 ms, Abdunkeln erst danach | P1, P3, P4 | `ansicht_felder`, `kamerafahrt_endet_am_ziel` |
| T06/T07 Info-Kapsel (K9) | P1, P3, P4 | `texte_aus_werten`, `info_kapsel_lage` |
| T09 entfällt (Baumenü öffnet auf Leitungen) | P1, P4 | `reihenfolge`, `klickweg` |
| T10/T21 Sprecher auf dem Platz der Anleiter-Karte | P3, P4 | `sprecherAktiv` in `bausteine`, Randfall |
| T11/T23 Warten mit Restzeit, [Weiter] erst danach | P1, P3 | `wartet_auf_planung_und_bau`, `anleiter_weiter_nur_bei_erklaer` |
| T11/T22 Zeiten 10 s / 20 s, danach normal | P2 | `tutorial_zeiten` |
| T12 `{leitung}` berechnet, Leitungskarte des Typs | P1, P2, P3 | `texte_aus_werten`, `werte`, `ziele_markiert` |
| T12 Erst-Hilfe der Zeichenleiste aus, danach gesehen (K9) | P4 | `zeichenhilfe_aus` |
| T13 Spur (obere Ebene, K10), Finger fährt Spur ab (K9), Erreicht-Zeichen, T13b | P1, P3, P4 | `ansicht_felder`, `spur_und_haken_nur_mit_feldern`, `finger_spur`, `t13_beide_haeuser` |
| T13 [X]/[?] gesperrt mit Satz; Abschließen „noch n Häuser“ / Geld (K7) | P1, P4 | `sperren`, `abschliessen_gesperrt_noch_ein_haus`, `abschliessen_geld_sperre` |
| T14 Leiste schließt, kein Baumenü (K8), keine Warnung | P2, P4 | `leitung_traegt_ohne_warnung`, `nach_abschliessen_kein_baumenue` |
| T16 Blatt scrollt zum Ziel (K9) | P3, P4 | `blatt_scrollt_zum_ziel` |
| T17 Wandstation gesperrt „später wählbar“; Blatt schließt nach Kauf (200 ms) | P2, P3, P4 | `wandstation_gesperrt`, `wandreihe_spaeter_waehlbar`, `blatt_schliesst_nach_kauf` |
| T21 Baumenü schließt nach Laura | P1, P4 | `blatt_schliesst_nach_kauf` |
| T25 Loch um Leitungsstück (K9) | P1, P4 | `leitungsstueck_t25`, `klickweg` |
| T26 Ende: Merke weg, Knöpfe zurück, Auftrag federt | P1, P2, P4 | `reihenfolge`, `nach_ende_knoepfe_zurueck` |
| Hilfe nach drei Fehltipps je Art, Vorrang (K4) | P1 | `fehltipps_hilfe`, `sperr_satz_vorrang` |
| Texte ≤ 120, ≤ 2 Sätze, Einheiten im Platzhalter (K1–K3) | P1 | `texte_laenge`, `texte_aus_werten` |
| Wiedereinstieg nach Zustand, Kapitelname berechnet (13.7, K9) | P1, P4 | `wiedereinstieg_tabelle`, `ablauf_neu_laden_t11_und_t18` |
| Meldungen stumm, S0 sichtbar (13.3) | P3, P4 | `meldungen_stumm_und_wichtig`, `meldungen_stumm` |
| „Willkommen zurück“ entfällt (K6), Update-Hinweis nach T26 | P4 | `kein_willkommen_zurueck` |
| Fokus, Vorlesenamen, `aria-live`, `aria-hidden` (13.11, K9) | P3, P4 | `anleiter_weiter_nur_bei_erklaer`, `ersatz_ziel_vorlesename`, `fokus_und_vorlesename` |
| Tippflächen ≥ 44, Weniger Bewegung (13.7) | P3 | `anleiter_weiter_nur_bei_erklaer`, `finger_spur` (ruhig), `kamerafahrt_endet_am_ziel` (ruhig) |
| Anleiter-Platz 13.3 | P3 | `platz_*` |
| Alter Stand nie (13.8), neues Spiel immer | P0, P4 | `alter_stand_ohne_merke`, `alter_stand_nie` |
| Durchklick durch die echte Oberfläche | P4 | `klickweg_t01_bis_t26` |

## 10. Vorarbeit (nicht für die Entwickler)
- **Tester-Vorarbeit: keine nötig.** Alle neuen Tests sind neue Dateien; `liefertage()` ohne Argument bleibt gleich (`anpassungen.test.ts:956`); `neuerBau` bekommt nur einen Standard-Parameter. Gemessen in F1: `ladenMitBefund` mit Merke → alle bestehenden Tests grün.
- **Architekt-Vorarbeit: erledigt (F2).** `tests/architektur/nr13-tutorial.test.ts` U1–U6 plus **U2b** (`.kapitel` nur in `src/core` und `src/ui/anleiter.ts`). Fehlerproben in einer Wegwerf-Kopie im Scratchpad: U1 rot bei `this.tutorial = null` in `steuerung.ts`, grün bei `this.anleitung = null`; U2b rot bei `a.kapitel === 3` in `steuerung.ts`, grün bei `.kapitel` in `ui/anleiter.ts`. F1-Proben (U2–U6) unverändert gültig.

## 11. Vorschlag verdeckte Abnahmetests (Tester, Datei `tests/abnahme/nr13-abnahme.test.ts.verdeckt`)
1. Neues Spiel (`ladenMitBefund(null)`) → nach Namen Ansicht T01, Kapitel 1, `weiter: null`, Ziel `heizzentrale`; alter Stand mit Netz → keine Ansicht, Dorf deep-gleich vor/nach Laden.
2. Kompletter Ablauf T01–T26 mit echten Aktionen; nach jedem Schritt: 3 falsche Tipps + `weiter` in H-Schritten ändern Schritt nicht; Ende: genau (9|13) und (12|14) warm, sonst kein Haus, keine Warnung, Merke weg, Laden → kein Tutorial.
3. Kauf Wandstation für Haus 1 im Tutorial → abgelehnt, Geld unverändert; nach Ende Wandstation am dritten Haus → erlaubt.
4. Zeiten: Planung genau 10 s, Bau genau 20 s (Uhr von Hand), zweiter Abschnitt 75 s/900 s.
5. Neu laden in jeder Zeile der Wiedereinstiegs-Tabelle 13.7 → erwarteter Schritt; Ansicht zuerst mit „Weiter geht’s“ und Kapitelname des berechneten Schritts.
6. `kapazitaet_kw` der 25er auf 12 → T12 nennt „32er“, Ablauf endet trotzdem ohne Warnung.
7. Name mit 20 Zeichen → alle Texte ≤ 120 Zeichen; Kessel-Leistung geändert → T03-Zahl ändert sich.
8. Merke manipuliert (`{kapitel: 'a'}`, `[]`, Haus 1 verschoben) → kein Tutorial, Befund nicht `defekt`.
9. (F2) Zu viel gezeichnet (Geld knapp) → [Abschnitt abschließen] gesperrt mit „Geld reicht nicht“, nach Zurück frei.
10. (F2) Im Tutorial außerhalb T13: Ziehen/Mausrad an der Karte ändert die Kamera nicht.

## 12. Prüf-Schwerpunkt (nicht in den Anforderungen, trifft echte Spieler)
| Fall | erwartetes Verhalten | Test in |
|---|---|---|
| App mitten im Bau geschlossen, Stunden später geöffnet | Bau nachgerechnet, Einstieg T24 (nicht T22), **kein** „Willkommen zurück“ | P4 `nr13-ablauf`, `kein_willkommen_zurueck` + P1 Tabelle |
| Spieler wischt kreuz und quer, Geld reicht nicht mehr für Material + Stationen | Abschließen gesperrt „Geld reicht nicht“, Satz in der Blase; kein Festhängen bei Laura | P1 `sperren`, P2 `geld_reicht`, P4 `abschliessen_geld_sperre` |
| Finger landet in T01/T15 im Loch und zieht | Karte bleibt stehen, Ziel bleibt im Loch | P4 `karte_steht_ausser_t13` |
| Kaputter/fremder Spielstand beim Start | neues Dorf **mit** Tutorial, Hinweis „alter Stand gesichert“ sichtbar trotz Stummschaltung | P0 `kaputter_stand_hat_merke`, P3/P4 `toastWichtig` |
| Tester mit Vorführ-Tempo überspringt | Merke weg, Start-Tipp NR18-D, Wandstation frei, Erst-Hilfe der Zeichenleiste normal | P2 `start_tipp…`, P4 `ohne_tutorial…` |

## 13. Entscheidungen (technisch, Projektleiter; keine tragende Frage an Simon offen)
- **E-NR13-a Tutorial-Merke über eigene Startfunktion** statt in `neuerSpielstand`. Empfehlung: so.
- **E-NR13-b Kaputter Stand → neues Dorf mit Tutorial.** Empfehlung: mit.
- **E-NR13-c Nur Kapitel im Spielstand, kein Schrittname.** Die 13.7-Zeile „unbekannter Schrittname“ entfällt damit.
- **E-NR13-d Geld-Sperre beim Abschließen** – (F2) Wortlaut vom Designer bestätigt (K7).
- (F2) **E-NR13-e Feldname `anleitung`** statt U1 aufzuweichen (U1 fängt so auch Umwege über Zwischenvariablen).
- (F2) **E-NR13-f Spotlight per CSS `clip-path: path(evenodd)`** + Ring-`div`s statt Canvas (in der Attrappe nicht prüfbar) oder SVG (U6). Rest-Risiko: Unterstützung im Ziel-WebView, wird im Browser-Foto geprüft (P3-Eskalation).
- (F2) **E-NR13-g Toast-Stille im Toast-Modul** statt Abfragen an jedem Aufruf – fängt auch direkte `toast()`-Aufrufe.
- (F2) **E-NR13-h Kein P4a/P4b-Schnitt**; stattdessen Blätter nach P3 (Begründung Abschnitt 7).
- (F2) **E-NR13-i Drehen im ganzen Tutorial aus** (in 13.5 nicht genannt; hält Spur und Kamera-Grenze einfach). Designer kann widersprechen.
- Offen bei Simon (blockiert nicht): T-F5 Foto. Bitte an den Projektleiter: Fachprüfer bestätigt den gekürzten T17-Wortlaut (K1).

## 14. Zurückgestellt
NR2-Auftragsfolge nach dem Tutorial, NR3-Begriffsliste und Info-Knopf, „Einführung ansehen“, Abgleich (T-F4), Desktop-Tastatur-Feinheiten über Enter/Tab hinaus (Pfeiltasten in T13 bleiben durch die Eingabesperre aus), Kann-Punkte K7 „Loch wandert auf Zurück“, K9 Pille hüpft / Heizzentrale federt (Feld `effekt` liefert P1 trotzdem).
