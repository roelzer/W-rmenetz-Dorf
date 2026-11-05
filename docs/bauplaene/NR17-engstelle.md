# Bauplan NR17 (wird A93) – Engstelle erklären, Station nur, wenn das Netz sie trägt

Stand 2026-11-05, Architekt, Fassung 1 (nach Neustart neu geschrieben). Grundlage: `docs/lastenheft.md` NR17, ENTSCHEIDUNGEN 2026-11-05 („Wahrscheinliche Ursache …“, „NR15-P3 gebaut … Wichtiger Befund für NR17“, „Reviewer bestätigt NR17-Kern“), NR15-Bauplan Abschnitt 11 (letzter Punkt).
Noch nicht vom Kritiker geprüft. Offene Punkte sind mit **offen** markiert.

## 1. Ziel und Abnahme (Vorschlag A93-Zeile)
1. **Station kaufen** an einer vorbeilaufenden Leitung prüft die Leitungslast wie die Hausanschluss-Planung: Würde danach ein anderes Haus (oder das Haus selbst) wegen der Leitung kalt, geht der Kauf nicht. Im Hausblatt ist der Knopf gesperrt (DESIGN 12.19/12.20) und nennt die Engstelle.
2. **Hausanschluss ziehen** scheitert nicht mehr stumm: Statt „Kein Weg gefunden, bei dem alle Häuser warm bleiben“ nennt der Hinweis das zu dünne Leitungsstück (Durchmesser, Ort, Leistung) und was zu tun ist. Die Engstelle wird auf der Karte kurz markiert.
3. Abnahme: Startdorf, mehrere Häuser anschließen → beim nächsten erscheint der Engstellen-Hinweis mit Ort → nach Tausch der genannten Leitung gelingt der Anschluss, kein Haus ist wegen der Leitung kalt.

## 2. Befund (getestet im Prototyp, Wegwerf-Kopie im Scratchpad, nicht im Projekt)
Ablauf: neues Spiel (Wärmlingen), Kessel Stufe 5 (Wärme reicht immer), Geld 1e8, Bauabschnitt offen, alle Häuser ohne Station der Reihe nach (Reihenfolge in `stand.objekte`): `hausanschlussPlanen`, bei Erfolg oder „liegt schon an einer Leitung“ `stationKaufen`, dann geplante Leitungen als gebaut.
- **Heute (Stufe 1):** ab dem 5. Haus (9|15, „liegt schon an einer Leitung“) 2 Häuser kalt; danach jede weitere Station an einer vorbeilaufenden Leitung +1…+3 kalte Häuser; am Ende **24 Kunden, 24 kalt** wegen Leitung, 4 Planungswarnungen. Das 8. Haus (9|4) bekommt „Kein Weg gefunden …“. Bestätigt Befund 2 (Zahlen weichen wegen anderer Reihenfolge leicht ab: Reviewer 3 kalt / 30 kalt).
- **Mit Prüfung (Prototyp):** 0 kalte Häuser im ganzen Durchlauf. Stationen an vorbeilaufender Leitung werden abgelehnt und nennen die Engstelle.
- **Wo die Engstellen liegen (wichtig):** Nur ein Teil ist die Start-Hauptleitung (40er (10|12)–(10|13), 50 statt 40 kW). Die meisten sind **frühere automatische Hausanschlüsse**, die seit NR15-P3 direkt an der Heizzentrale andocken (25er/32er, Tiefe 1) und an denen danach Nachbarhäuser „schon an einer Leitung liegen“. Diese Stücke sind teils sehr lang (bis 35 Felder).
- **Tausch hilft (Stufe 3):** 8. Haus (9|4): Engstelle 25er ab der Heizzentrale (11|9),(10|9),(10|8),(10|7),(10|6), 20 statt 15 kW → alle 5 Felder auf 32er getauscht → `hausanschlussPlanen` ok, danach 0 kalt. Ebenso bei den Häusern 11, 13, 18, 26. Zweimal (27, 31) erscheint nach dem Tausch die **nächste** Engstelle weiter draußen – das ist richtig, der Hinweis nennt immer die erste ab der Heizzentrale.
- **Laufzeit heute** (`npx vitest run --config tools/vitest.messung.config.ts`, ausgeführt): M1 0,53 ms, M2 4,54, M3 1,82, M4 19,45 (10 Netzrechnungen), M5 19,76 (10), M6 4,01 / M6b 1,67 / M6c 2,27 ms.

## 3. Festlegungen
**AE-A93-1 Prüfen entscheidet die Probe, erklären der Pfad.**
- Bindet: `stationKaufen`, `hausanschlussPlanen`, neues `src/core/engstelle.ts`.
- Verhindert: dass Erklärung und Entscheidung auseinanderlaufen, und dass der Hinweis wegen A91-Umhängen ein anderes Stück nennt, als der Spieler erwartet. Im Prototyp nannte ein Vergleich „vorher/nachher“ beim Haus (9|15) eine 25er mit 50 kW. Grund war das Umhängen. Der Pfad nennt richtig die Start-40er.
- Regel: **Ob** gesperrt wird, entscheidet die Probe-Netzrechnung wie A89: Gerechnet wird mit allen Objekten inkl. geplanter Leitungen, einmal ohne und einmal mit dem Haus als Kunde. Gesperrt wird, wenn die Menge `kalt === 'leitung'` danach nicht Teilmenge von vorher ist. **Welches Stück** genannt wird, sagt `engstelleFinden(vorher, start_feld, zusatz_kw)`: der Weg im Vorher-Baum vom Anschlussfeld bis zur Heizzentrale, Felder mit `last_kw + zusatz_kw > kapazitaet_kw × spreizung_faktor`. Findet der Pfad nichts, die Probe sperrt aber trotzdem, kommt ein fester Ersatztext. Gesperrt wird dann trotzdem.
- Nur Wärmemangel (`kalt === 'waerme'`) sperrt nicht (wie A89; eigener Hinweis „zu wenig Wärme“ besteht).

**AE-A93-2 Ein Ort.** `engstelleFinden`, `engstelleText`, `ENGSTELLE_GRUND`, Typ `Engstelle` stehen nur in `src/core/engstelle.ts` (rein: importiert nur `./katalog`, `./typen`). Aufgerufen wird `engstelleFinden` nur in `src/core/spiel.ts`. Oberfläche und Darstellung rechnen kein Netz (kein `berechneNetz` außerhalb `src/core`). Architekturtest `tests/architektur/a93-engstelle.test.ts` R1–R3 (siehe Abschnitt 8).

**AE-A93-3 Zwischenspeicher nur im Spiel-Objekt.** `stationEngpass(id)` merkt sich sein Ergebnis je Haus. Der Speicher gilt, solange `this.netz`, `stand.objekte.length` und `stand.naechste_id` gleich sind. Ändert sich eins davon, wird er geleert. Er kommt nie in den Spielstand. Grund: Das Hausblatt baut sich alle 250 ms neu (`steuerung.ts:377`), und `hausanschlussPlanen` bzw. eingezeichnete Leitungen ändern die Objekte, ohne `neuBerechnen` aufzurufen (`spiel.ts:342`, `:783`).

**AE-A93-4 Ereignis statt Grafik im Kern.** Der Kern meldet `{ art: 'engstelle'; felder: number[] }` in `ereignisse`. Die Darstellung markiert die Felder. Bei „Weniger Bewegung“ wird ohne Pulsieren markiert, aber **nicht** weggelassen (das ist eine Information, keine Zierde).

## 4. Empfehlung zu (a): sperren (Entscheidung E1 für Simon)
| | Variante | Spielspaß | Ehrlichkeit |
|---|---|---|---|
| **A (empfohlen)** | **Sperre** mit Grund und Hinweis, Engstelle markiert, kein Geld weg | klarer nächster Schritt („tausche die 25er“) statt 20 kalter Häuser, die man nicht versteht | entspricht der Praxis: Vor einem Anschluss wird geprüft, ob das Netz die Leistung trägt; sonst wird erst verstärkt. Gleiche Regel wie beim Hausanschluss (A89), also keine zwei Maßstäbe |
| B | Kaufen erlaubt, Warnung „3 Häuser werden kalt“ | Spieler entscheidet frei | ehrlich, aber Simon hat genau diesen Zustand als „kaputt“ erlebt; ohne Sperre bleibt die Falle |
| C | Kaufen erlaubt, nur das neue Haus bleibt kalt, bis getauscht ist | angenehm | Netzmodell müsste umgebaut werden (Vorrang Altkunden), großer Umbau, nicht in NR17 |

## 5. Texte (alle mit **[F]** für den Fachprüfer: Aussagen über Leitungsleistung)
`{t}` = Kurzname aus dem Katalog ohne „-Leitung“ („25er“). `{kap}` = abgerundet, `{last}` = aufgerundet. So ist die angezeigte „nötig“-Zahl immer größer als die „schafft“-Zahl.
Hinweis = Satz 1 + Satz 2, **höchstens 90 Zeichen** (geprüft für alle Typen, `last` bis 4 Stellen; längster Fall 90).

Satz 1 [F]:
- an der Heizzentrale (Tiefe 1): „Die {t} an der Heizzentrale schafft nur {kap} statt {last} kW.“
- weiter draußen: „Eine {t} auf dem Weg schafft nur {kap} statt {last} kW.“ (der Ort steht auf der Karte)
- Stück enthält eine geplante Leitung: „Die eingezeichnete {t} schafft nur {kap} statt {last} kW.“

Satz 2:
- empfohlene Leitung frei, gebaut: „Tausche sie gegen eine {e}.“
- empfohlen frei, eingezeichnet: „Zeichne sie als {e} neu.“ (geplante Leitungen lassen sich nicht tauschen, `spiel.ts:872`)
- empfohlen noch gesperrt: „Die {e} gibt es ab Stufe {n}.“ (kürzer als 12.20 Regel 6 – **Designer bestätigt**)
- keine Leitung reicht: „Leg eine zweite Leitung.“ [F]

`{e}` = kleinste Leitung des Katalogs mit `kapazitaet_kw × spreizung_faktor ≥ last`.
Beispiel: „Die 25er an der Heizzentrale schafft nur 15 statt 20 kW. Tausche sie gegen eine 32er.“ (85)

Weitere Texte:
- Zeile 2 (Sperrgrund, Stationsknopf): **„Leitung zu dünn“** (15 Zeichen, passt auch eng ≤18). Schloss **ja** (Regel 2: erst etwas anderes schaffen). Rang nach Regel 4: „Bedingung“, also vor Geld.
- Ersatztext Station (Pfad findet nichts) [F]: „Mit diesem Haus würden andere Häuser kalt. Eine Leitung auf dem Weg ist zu dünn.“ (82)
- „Liegt schon an einer Leitung“ bei Haus ohne Station: Gibt es eine Engstelle, kommt der Engstellen-Hinweis. Sonst: „Das Haus liegt schon an einer Leitung. Wähle unten im Blatt eine Übergabestation.“ (81). Mit Station bleibt der alte Satz.
- „Kein Weg gefunden, bei dem alle Häuser warm bleiben“ bleibt nur als Rückfall, wenn keine Engstelle gefunden wird.

Markierung (Vorschlag, **Designer bestätigt** in der Fotoprüfung): Rauten-Umriss je Feld des Stücks, Warnrot `#d8392f` (wie die Planungswarnung `szene.ts:427`), Linie 3 px, 6 s (= längste Meldung 12.17), Pulsieren 1,5 Hz. Bei „Weniger Bewegung“ fest, ohne Puls. Es gibt immer nur eine Markierung; eine neue ersetzt die alte.

## 6. Pakete
| Paket | Dateien | Abhängig von | Parallel mit | Schwierigkeit |
|---|---|---|---|---|
| P0 Tester-Vorarbeit | `tests/a89-hausanschluss-meldung.test.ts:31`, `tests/a89-mehrfach.test.ts:81` | – | P1 | einfach |
| P1 Kern + Vertrag | neu `src/core/engstelle.ts`, `tests/a93-engstelle-kern.test.ts`; ändern `src/core/spiel.ts` nur: Ereignis-Typ (Z. 19–26) + zwei Platzhalter-Methoden | – | P0 | mittel |
| P2 Spiel prüft | `src/core/spiel.ts` (stationKaufen ~510–526, hausanschlussPlanen ~658–786, Platzhalter aus P1 ersetzen), `tools/a91-laufzeit.messung.ts` (M7/M8 anhängen), neu `tests/a93-engstelle-spiel.test.ts` | P1, P0 gemergt | P3 | **schwer** |
| P3 Hausblatt + Karte | `src/ui/sperrtexte.ts` (neue Funktion am Ende), `src/ui/kontext.ts` (nur `stationswahl` ~287/291), `src/steuerung.ts` (nur `ereignisse()` ~389), `src/render/effekte.ts`, neu `tests/a93-engstelle-ui.test.ts` | P1 | P2 | mittel |
| P4 Tester-Abnahme | neu `tests/a93-abnahme.test.ts` | P2 + P3 gemergt | – | mittel |

Kritischer Pfad: P1 (≈30–45 min) → P2 → P4. P3 läuft gleichzeitig mit P2. P2 und P3 haben keine gemeinsame Datei. **Merge-Reihenfolge:** P0, P1, P2, P3, P4.

### Vorarbeit (nicht für die Entwickler)
**Tester-Vorarbeit P0** – getestet: ganze Testsuite gegen den Prototyp mit neuer Prüfung (Kern und Hausblatt-Sperre). Es wurde nach **Verhalten** gesucht, nicht nur nach Namen. Rot wurden nur diese 2 von 1010 Tests; alle 22 Stellen mit `stationKaufen(...).ok === true` in 11 Testdateien bleiben grün:
1. `tests/a89-hausanschluss-meldung.test.ts:31` erwartet künftig genau „Die 32er an der Heizzentrale schafft nur 25 statt 30 kW. Tausche sie gegen eine 40er.“ (Prototyp: 32er (10|11)–(10|13), Last 30, Kapazität 25; 40er ab Stufe 1 frei, `freischaltung.ts`).
2. `tests/a89-mehrfach.test.ts:81` erwartet genau „Die 25er an der Heizzentrale schafft nur 15 statt 20 kW. Tausche sie gegen eine 32er.“ (25er (13|10)–(15|10); 2 EFH × 10 kW = 20 kW > 15 kW, Katalog).
Beide sind bewusst rot bis P2. Der Tester prüft vorher `spreizung_faktor === 1` im jeweiligen Aufbau (sonst andere Zahlen) und lässt den Testnamen „Hinweis ‚bei dem alle Häuser warm bleiben‘“ sinngemäß anpassen.
**Architekt-Vorarbeit:** keine. Der Architekturtest steht schon im Repo und greift, sobald `engstelle.ts` existiert.

### Bauplan P1 – Kern-Abfrage und Vertrag
- **Liefert** (`src/core/engstelle.ts`):
  - `export interface Engstelle { felder: number[] /* Feld y*N+x, ab Heizzentrale geordnet */; typ: TypId; last_kw: number /* inkl. Zusatz, am ersten Feld */; kapazitaet_kw: number /* Katalog × spreizung_faktor */; an_heizzentrale: boolean /* tiefe(erstes Feld) === 1 */; geplant: boolean /* ein Feld des Stücks geplant */; weitere: number /* weitere zu dünne Stücke auf dem Weg */; empfohlen: TypId | null }`
  - `export function engstelleFinden(netz: Netz, start_feld: number, zusatz_kw: number): Engstelle | null`. Weg über `netz.eltern` bis −1. Ein Stück = aufeinanderfolgende zu volle Felder **gleichen Typs**. Genannt wird das erste ab der Heizzentrale. `null`, wenn `start_feld < 0`, nicht in `netz.tiefe` oder nichts zu voll. Typ über `netz.nachId.get(netz.belegung[f])`.
  - `export function engstelleText(e: Engstelle, empfohlenAbStufe: number | null): string` – Abschnitt 5; `empfohlenAbStufe` null = frei.
  - `export const ENGSTELLE_GRUND = 'Leitung zu dünn'`, `export const ENGPASS_ERSATZ = 'Mit diesem Haus würden andere Häuser kalt. Eine Leitung auf dem Weg ist zu dünn.'`
- **Vertrag in `spiel.ts`** (nur das):
  - Ereignis `| { art: 'engstelle'; felder: number[] }`
  - `stationEngpass(id: number): { text: string; engstelle: Engstelle | null } | null { return null; }`
  - `engpassMelden(id: number): string | null { return null; }`
  - Platzhalter liefern `null` = heutiges Verhalten. Bewusst kein Fehlerwurf: Das Hausblatt ruft sie bei jedem Aufbau auf; ein Wurf würde in P3 alle Hausblatt-Tests rot machen.
- **Tests** `tests/a93-engstelle-kern.test.ts`. Netze mit `dorf()`/`neu()` aus `tests/hilfen.ts` aufbauen, mit `berechneNetz` rechnen. Erwartungen aus den Katalogwerten d25 15, d32 25, d40 40, d50 60 kW, EFH 10 kW. Vorbedingung `spreizung_faktor === 1` prüfen.
  - `test_a93_engstelle_stueck_ab_heizzentrale`: 25er-Strang ab der Heizzentrale mit 1 EFH angeschlossen, Zusatz 10 → typ d25, last 20, kap 15, an_heizzentrale true, alle Strangfelder bis zum Abzweig, weitere 0, empfohlen d32.
  - `test_a93_engstelle_erste_von_zwei`: 32er an der Heizzentrale, dahinter 25er, beide zu voll → genannt 32er, weitere 1.
  - `test_a93_engstelle_typwechsel_trennt_stueck`: gleiche Last über 32er→25er, nur die 25er zu voll → nur 25er-Felder.
  - `test_a93_engstelle_null`: Zusatz passt / `start_feld` −1 / Feld nicht im Baum → null.
  - `test_a93_engstelle_spreizung`: `spreizung_faktor` ≠ 1 (Upgrades) → kap = 15 × Faktor, empfohlen mit Faktor.
  - `test_a93_engstelle_geplant`: ein geplantes Feld im Stück → geplant true.
  - `test_a93_engstelle_text`: genaue Sätze für die 3 Orte × 4 Enden (25er, 15/20 kW). Runden: kap 19,5 → 19, last 20,1 → 21. Erzeuger über alle Leitungstypen × last 1…9999 × alle Enden → jede Länge ≤ 90; `ENGSTELLE_GRUND.length ≤ 18`.
- **Randfälle:** Großabnehmer-Felder (größe > 1) sind keine Leitungen; Feld −1 (direkt am Heizhaus) hat keine Leitung.
- **Risiko-Auslöser:** nein (keine Daten von außen, keine Rechte, keine Geheimnisse).

### Bauplan P2 – Spiel prüft und meldet (schwer: Netzregeln, Zwischenspeicher, Laufzeit)
- **Nutzt:** alles aus P1.
- **`stationEngpass(id)`:**
  - Nur bei `o.ohne_station` und Kategorie haus/gross, sonst `null`.
  - `vorher = berechneNetz(stand.objekte …)`, d. h. alle Objekte inkl. geplanter Leitungen, wie `spiel.ts:687`. `nachher` = dieselben Objekte mit dem Haus ohne `ohne_station`.
  - Sperre (AE-A93-1), wenn neue `'leitung'`-Kalte entstehen. Dann `engstelle = engstelleFinden(vorher, vorher.anschluss.get(id).feld, bedarfKw(o))`, `text = engstelle ? engstelleText(engstelle, freigeschaltet(stand, empfohlen) ? null : abStufe(empfohlen)) : ENGPASS_ERSATZ`.
  - Zwischenspeicher nach AE-A93-3.
- **`engpassMelden(id)`:** frisch abfragen. Bei Engstelle Ereignis `engstelle` mit `felder` schicken. Text zurückgeben. **Kein** `hinweis`-Ereignis, sonst erscheint die Meldung doppelt (die Oberfläche zeigt den Rückgabewert selbst).
- **`stationKaufen`:** Prüfung nach den Stationsgrößen-Prüfungen und **vor** `bezahlen` (`spiel.ts:519`), nur bei `o.ohne_station`. Gesperrt → `this.nein(text)` + Ereignis `engstelle`. Kein Geld weg, `interessent` bleibt. Eine größere Station für ein Haus, das schon eine hat, ändert die Last nicht und wird nicht geprüft.
- **`hausanschlussPlanen`:**
  - `probe()` gibt zusätzlich das `Netz` zurück. Die Vorher-Rechnung (`vorher`) wird wiederverwendet: **0 zusätzliche Netzrechnungen**.
  - `traegt()` merkt sich den ersten Weg mit `kaltOk === false` (Suchen mit `flussOk = spuel`).
  - Bei `ziel < 0 && verworfen`: Startfeld = Leitungsnachbar von `weg[0]` mit kleinster Tiefe in `vorher`, bei Gleichstand kleinere Feldnummer. Dann `engstelleFinden(vorherNetz, start, bedarfKw(haus))`. Gefunden → Engstellen-Text + Ereignis, sonst der alte Text.
  - Die Fluss-Meldung behält ihren Vorrang (Reihenfolge `spiel.ts:777–779`).
  - „Liegt schon an einer Leitung“ (Z. 675): bei `ohne_station` erst `stationEngpass`, sonst die Texte aus Abschnitt 5.
- **Tests** `tests/a93-engstelle-spiel.test.ts`:
  - `test_a93_startdorf_engstelle_und_tausch` (Abnahme 1 und 3): Ablauf wie Abschnitt 2, `hz.stufe = 3`. Das 8. Haus ohne Station (EFH 9|4) liefert ok=false, `hinweis === engstelleText(...)`, Ereignis `engstelle` mit Feldern = gebaute 25er, erstes Feld neben der Heizzentrale, last 20, kap 15. Alle Felder per `leitungTauschen` auf d32 → `hausanschlussPlanen` ok → Station → als gebaut → `kalt` ohne `'leitung'`. Prototyp-Beleg: (11|9),(10|9),(10|8),(10|7),(10|6). Koordinaten nur als Kommentar, geprüft wird über Eigenschaften.
  - `test_a93_station_an_vorbeilaufender_leitung_gesperrt` (Abnahme 1): derselbe Ablauf, Haus (9|15) → `stationKaufen` ok=false, Geld gleich, `ohne_station` bleibt, keine neuen kalten Häuser, Hinweis nennt die 40er an der Heizzentrale (50 statt 40 kW).
  - `test_a93_station_ohne_engpass_frei`: Haus, dessen Weg trägt → ok, wie heute.
  - `test_a93_station_ersatztext`: `vi.mock('../src/core/engstelle', …)` mit `engstelleFinden → null` bei echter Überlast → gesperrt mit `ENGPASS_ERSATZ`.
  - `test_a93_station_geplante_leitung_zaehlt`: Haus nur an einer **eingezeichneten** Leitung (A89-W1-Muster) → Prüfung greift.
  - `test_a93_zwischenspeicher`: zweiter Aufruf ohne Änderung → 0 Netzrechnungen (Zählermuster aus `tools/a91-laufzeit.messung.ts:13`). Nach `hausanschlussPlanen` eines Nachbarn (ohne `neuBerechnen`) → neues Ergebnis.
  - `test_a93_liegt_schon_texte`: beide Fassungen.
  - `test_a93_warmemangel_sperrt_nicht`: Kessel zu klein, Leitung reicht → Kauf ok.
- **Laufzeit** (an `tools/a91-laufzeit.messung.ts` anhängen; harte Grenzen):
  - M7 `stationEngpass` Startdorf voll (Aufbau M1) ≤ 4 ms, zweiter Aufruf 0 Netzrechnungen.
  - M8 Extremnetz (Aufbau M3) ≤ 16 ms.
  - M2 ≤ 10 ms und M5 ≤ 100 ms bleiben; M5-Netzrechnungen bleiben 10.
- **Eskalation:** wenn ein bestehender Test außer P0 rot wird; wenn M2/M5 die Grenze reißen; wenn das Startdorf-Ergebnis nicht wie in Abschnitt 2 ist (dann nicht die Erwartung anpassen, sondern melden).
- **Risiko-Auslöser:** nein.

### Bauplan P3 – Hausblatt-Sperre und Karten-Markierung
- **Nutzt:** `sp.stationEngpass(id)`, `sp.engpassMelden(id)`, Ereignis `engstelle`, `ENGSTELLE_GRUND` (Platzhalter aus P1; Tests ersetzen sie per `vi.spyOn`).
- **Liefert:**
  - `src/ui/sperrtexte.ts`: `export function engpassSperre(sp: Spiel, id: number): Sperre | null` → `{ grund: ENGSTELLE_GRUND, schloss: true, hinweis: () => sp.engpassMelden(id) }`. Hinweis `null` beim Tippen → die Aktion läuft (12.21).
  - `kontext.ts` `stationswahl`: beide Knopfarten bekommen `sperre: o.ohne_station ? engpassSperre(sp, o.id) : null`.
  - `effekte.ts`: `engstelle(felder: ReadonlyArray<readonly [number, number]>, ruhig: boolean): void`. Zeichnet über `mitte` und `m.raute` (Abschnitt 5), Konstante `ENGSTELLE_DAUER_S = 6`. `aktiv()` zählt die Markierung mit.
  - `steuerung.ts` `ereignisse()`: Zweig `engstelle` → `this.effekte.engstelle(felder → [f % N, ⌊f / N⌋], ruhig)`, auch bei `ruhig`.
- **Tests** `tests/a93-engstelle-ui.test.ts` (`kontextKarte` aus `tests/hilfen/kontext-attrappe.ts`, echtes Spiel, `vi.spyOn(s, 'stationEngpass')`):
  - `test_a93_stationsknopf_gesperrt`: Stufe 1 (ein Knopf) und Stufe 2 (3 Knöpfe) → alle `aria-disabled="true"`, kein `disabled`, Zeile 2 „Leitung zu dünn“, Schloss-Symbol.
  - `test_a93_stationsknopf_tippen`: Tippen → Meldung = Text von `engpassMelden`, `stationKaufen` nicht aufgerufen.
  - `test_a93_stationsknopf_frei_ohne_engpass`: unverändert wie der a88-Test 516–551.
  - `test_a93_effekt_markierung`: `Effekte.engstelle` → `aktiv()` true, nach 6 s false; „ruhig“ zeichnet mit fester Deckkraft (Maler-Attrappe wie in `tests/nr12-*`).
- **Eskalation:** wenn ein `nr12`-Taktgrenzen-Test rot wird.
- **Risiko-Auslöser:** nein. Designer-Fotoprüfung 844×390 und 667×375: Hausblatt mit gesperrtem Stationsknopf vor/nach dem Tippen, Markierung sichtbar neben dem offenen Blatt.

### Bauplan P4 – Tester-Abnahme Gesamtfluss
`tests/a93-abnahme.test.ts`, ohne Attrappen-Spione. Startdorf → Hausblatt eines Hauses an voller Leitung: Knopf gesperrt → Tippen: Meldung + Ereignis → Engstelle tauschen → Hausblatt neu: Knopf frei → Kauf ok, kein Haus wegen Leitung kalt. Dazu die Rückfall-Lücke aus NR15-P3-Review („kein Haus kalt / Engpass angezeigt“).

## 7. Prüf-Schwerpunkt
1. Station für ein Haus, das nur an einer **eingezeichneten** Leitung liegt → Prüfung rechnet mit geplanten Leitungen (P2).
2. Spieler tauscht erst ein Feld von fünf → Knopf bleibt gesperrt, Hinweis nennt das Reststück (P2/P4).
3. Engstelle nur über Stufe lösbar (50 kW auf einer 40er bei Stufe 1) → „Die 50er gibt es ab Stufe 2.“ (P1/P2; im Prototyp bei Haus 9|4 Stufe 1 gesehen).
4. Hausblatt bleibt offen, ein Nachbar wird geplant → Sperre stimmt nach ≤ 250 ms (Zwischenspeicher-Schlüssel, P2).
5. Nachkomma-Last (Hauspuffer, Spreizung) knapp über der Grenze → Anzeige „14 statt 15 kW“ ist nie gleich oder verdreht (P1-Rundungstest).

## 8. Architekturtests
`tests/architektur/a93-engstelle.test.ts` (eingecheckt):
- R1: `engstelle.ts` importiert nur `./katalog`, `./typen`.
- R2: `engstelleFinden(` außerhalb nur in `spiel.ts`.
- R3: kein `berechneNetz` außerhalb `src/core`.

Heute im Projekt: Platzhalter „noch nicht gebaut“ grün (`npx vitest run tests/architektur/a93-engstelle.test.ts` → 1 passed). Im Prototyp mit `engstelle.ts`: 3 passed. Gegenproben im Prototyp: `import './spiel'` in engstelle.ts, Aufruf `engstelleFinden(` und Text `berechneNetz` in `src/ui/toast.ts` → alle 3 rot (3 failed), danach zurück auf grün.

## 9. Zurückgestellt / offen
- **offen (Simon, E1):** Sperre (A, empfohlen) / Warnung (B) / nur Neuer bleibt kalt (C).
- **offen (Simon, E2, Fachfrage):** Der automatische Hausanschluss legt neue 25er-Abgänge direkt an der Heizzentrale. Nachbarn hängen sich daran, und genau diese Stücke werden zu Engstellen, teils 35 Felder lang. Soll der Anschluss lieber an die vorhandene Hauptleitung gehen oder an der Heizzentrale gleich dicker (mit Reserve) bauen? Nicht Teil von NR17; eigenes NR, falls gewünscht.
- **offen (Projektleiter):** „Ganzes Stück tauschen“ in einem Zug. Heute muss jedes Feld einzeln getauscht werden (`kontext.ts:366`), bei 5–35 Feldern mühsam. Vorschlag: Folge-NR.
- **offen (Designer):** Kurzform „ab Stufe {n}“ im Hinweis; Aussehen der Markierung; Kamera fährt nicht zur Engstelle, wenn sie außerhalb des Bildes liegt.
- **offen (Fachprüfer):** alle [F]-Texte; „nötig“ = Summe der Anschlussleistungen ohne Gleichzeitigkeit (Spielvereinfachung).
- Bewusst nicht geprüft in NR17: `anfrageAnnehmen` (`spiel.ts:944`, „ohne Kapazitätsprüfung (der Spieler entscheidet)“, Simon F2) und `vertragUnterschreiben` (`spiel.ts:895`). Auch sie erhöhen die Last ohne Prüfung. Die Abfrage aus P1 ließe sich später dort wiederverwenden.
- `docs/ARCHITEKTUR.md` gibt es im Projekt nicht. Die Festlegungen stehen in diesem Bauplan.
