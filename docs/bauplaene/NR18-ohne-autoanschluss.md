# Bauplan NR18 + Spielstart ohne Häuser (NR13-Präzisierung) + NR19 Puffer-Übergabestation

Stand 2026-11-06, Architekt, **Fassung 3** (ersetzt Fassung 2 von c84b274; Fassung 1 war 57ef29a). Grundlage: Lastenheft NR18, NR19, NR13 mit Präzisierung 06.11., A71; ENTSCHEIDUNGEN 2026-11-06 (Einträge 161–169); Recherche `docs/recherche/puffer-uebergabestation.md` mit Gegenprüfung.
**Basis: 124952e** (main mit B2b komplett). Zeilenangaben aus Fassung 1 beziehen sich auf d32123a; die betroffenen Stellen in `src/` sind seitdem unverändert (gelesen: `spiel.ts:35–72` Spielstart, `:510–527` Stationskauf, `:626–637` Puffer, `katalog.ts:393–415`, `netz.ts:397–404, 450–455`, `kontext.ts:186, 207–240, 290–312`, `auftraege.ts:11–16`). Fassung 2 geprüft von Kritiker (🟡, W1–W5, K1, K2) und Fachprüfer (🟡); Fassung 3 arbeitet die angenommenen Befunde ein (ENTSCHEIDUNGEN 06.11. „Fachprüfung NR18 F2“, „Kritik NR18 F2“). Der Tutorial-Ablauf liegt jetzt in DESIGN.md Abschnitt 13; die Ereignis-Schnittstelle (5.4) ist Schritt für Schritt daran ausgerichtet. Den Ablauf selbst baut NR13.

## Änderungen Fassung 3
| Nr | Befund | Änderung | Wo |
|---|---|---|---|
| 1 | Kritik W1 | P0 ergänzt: `a91-hausanschluss` (1 Test umbauen, 5 löschen), `anpassungen` „A47: Eine geplante Leitung am Haus …“ (:553) umbauen, `a92-anschlussweg` 12.19-Fall „Hauskarte mit geplantem Hausanschluss“ umbauen; Abgleich per `grep` war unvollständig, jetzt vollständig (gelesen, alle 14 Dateien mit `hausanschlussPlanen`/`leitungTauschen`) | 7 P0 Punkt 4.23–4.25 |
| 2 | Kritik W2 | Abnahme (c): Engstelle = Felder (10\|11), (10\|12), (10\|13), `an_heizzentrale`, genauer Text; (10\|10) ist ein lastfreier Stummel | 1, 7 P0 Teil B |
| 3 | Kritik W3 + DESIGN 13 | Schritt-Liste an DESIGN 13 ausgerichtet: neu `haus_erreicht`, `haus_getrennt`; `quelle_gewaehlt` entfällt (kommt im Tutorial nicht vor). Kern-Abfrage `erreichteHaeuser()`. Eigener Oberflächen-Kanal `tipp` für reine Tipp-Schritte. Typen in neuer Datei `src/core/tutorial-vertrag.ts`. Zuordnungstabelle T01–T26 | 3 AE-NR13-2, 5.4, P1, P2 |
| 4 | Kritik W3 | AE-NR13-2 neu gefasst: Tutorial liest Zustand nur über Kern-Abfragen, rechnet keine Spielregel nach; Architekturtest F2 erweitert (F2a–F2d) | 3, `tests/architektur/nr18-f2-struktur.test.ts` |
| 5 | Kritik W4 | In Phase `bestellen` füllen `stationKaufen` und `entfernen` (Leitung) die Warnliste neu – ohne zusätzliche Netzrechnung | 5.1, P2 |
| 6 | Kritik W5 | Leitung mit Ersatz: Entfernen in Phase `bau` abgelehnt, in `offen`/`bestellen` verfällt der Ersatz | 5.1, 6, P2 |
| 7 | Kritik K1 | `gruppe` entfernt P2; `typen.ts` steht jetzt in der Dateiliste von P2 | 4, 7 |
| 8 | Kritik K2 | `ERSTE_HAEUSER = [[9, 13], [12, 14]]` fest (Reihenfolge der Spur, nicht „die nächsten“; (13\|12) liegt näher, aber nicht an der Spur) | 5.2, P5 |
| 9 | PL-Entscheidung | Neues Spiel startet mit vorgewähltem Hackschnitzelkessel (`innen` mit Kessel Stufe 1, `quelle_gewaehlt: true`); gemessen: nur 3 Tests rot, alle in `spiel.test.ts` → P0 | 5.2, P0 Punkt 3, P5 |
| 10 | PL-Entscheidungen Rückfragen | Andocken an Leitung im Ersatz kostet Anbohrung wie heute; `engstelleText` unterscheidet „empfohlene Leitung ab Stufe n“ und „keine Leitung reicht“; Puffer-Knopf „Puffer-Übergabestation HP 800“, Zeile 2 Netzbedarf des Hauses | 5.1, 5.5, 6, P1 |
| 11 | Fachprüfung | „Leg einen getrennten Abgang.“; `ENGPASS_ERSATZ` mit „werden“; Quellenkommentar 1.500 h / 1.700 h; ÜP-Beschreibung „im Haus“; Katalogtest in P6 | 5.5, 6, P6 |
| 12 | Kritik Pflichtfrage 4 | Zusammenspiel-Test „Tutorial-Reihenfolge“ in P6 | P6 |
| 13 | Simon 2026-11-06 | E1–E6 wie empfohlen entschieden; Tutorial: Wandstation gesperrt bis 3. Haus, „Ohne Tutorial“ nur mit Vorführ-Tempo, kein „Abgleich“ im ersten Tutorial (NR13) | 9 |

## 1. Ziel und Abnahme
**NR18** (Tests mit „nr18“ im Namen):
1. Kein Knopf „Hausanschluss ziehen“, keine automatische Wegsuche. Der Spieler zeichnet die Leitung im Bauabschnitt selbst bis ans Haus und kauft die Übergabestation.
2. Warnung, keine Sperre: Wird eine Leitung durch Stationskauf oder Bauabschnitt zu dünn, nennt das Spiel das Stück und die fehlenden kW und markiert es auf der Karte. Gekauft bzw. gebaut wird trotzdem.
3. Dickere Leitung nur im Bauabschnitt: über eine gebaute Leitung dicker zeichnen (oder Knopf „Ersetzen“) plant den Ersatz; bezahlt mit der Materialbestellung, getauscht beim Bauende. Der Sofort-Tausch (`leitungTauschen`) entfällt.

**Spielstart (NR13-Präzisierung, Tests mit „nr13“):**
4. Neues Spiel ohne Leitungen und ohne Haus mit Station. Heizzentrale mit vorgewähltem Hackschnitzelkessel (Stufe 1, 60 kW), Büro, Monteurhütte, 30.000 €, alle Häuser heizen mit Öl. Alte Spielstände behalten ihr Netz und ihre Stationen (nichts wird umgebaut).
5. Aufträge passen zum leeren Start: c1 „erstes Haus“, c2 „zweites Haus“ (statt „drittes Starthaus“).

**Tutorial-Schnittstelle (NR13, nur Vertrag):**
6. Der Kern meldet die Handlungen, auf die ein Tutorial-Schritt aus DESIGN 13.5 warten kann, als Ereignis `schritt`, und beantwortet „welche Häuser erreicht die eingezeichnete Leitung?“ (`erreichteHaeuser()`). Reine Tipp-Schritte laufen über den Oberflächen-Kanal `tipp` (nur Vertrag). Zuordnung je Schritt in 5.4. Kein Tutorial-Ablauf in diesem Plan.

**NR19** (Tests mit „nr19“):
7. Beim Anschluss eines Hauses wählt man **Puffer-Station** (Pufferspeicher mit angebauter Übergabe, HP 800 / HP 1000 / ÜP 1000) oder **Wandstation** (wie bisher). Großabnehmer bekommen weiter nur Wand-/CAD-Stationen.
8. Mit Puffer 2.000 Volllaststunden, ohne 1.500 (A71 neu). Puffer-Stationen führen zwei Leistungen getrennt: **Netz-Ladeleistung** (zählt fürs Netz) und **Spitze im Haus**.
9. Kein nachträglicher Pufferkauf („Puffer einbauen“ entfällt). Alte Stände mit Puffer behalten ihn.

**Abnahme NR18 auf dem leeren Dorf** (Tests in `tests/nr18-abnahme.test.ts`, Abschnitt 7 P0 Teil B): (a) Hausblatt ohne „Hausanschluss ziehen“; (b) 25er von der Heizzentrale zu (12|14) gezeichnet + Station + Bauzeit → Haus warm, Auftrag c1 erledigt; (c) zweites Haus (9|13) an derselben 25er mit Wandstation → Warnung „Die 25er an der Heizzentrale ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.“, markiert (10|11), (10|12), (10|13), nach dem Bau kalt wegen Leitung; (d) nächster Abschnitt, 32er über die 25er gezeichnet → nach dem Bau beide warm, c2 erledigt.

## 2. Bestand (gelesen bzw. gemessen)
- Alles aus Fassung 1 gilt weiter (Wegsuche `spiel.ts:649–778`, `gruppe`, `leitungTauschen :862–875`, Hausblatt `kontext.ts:216–229`, Stationskauf ohne Lastprüfung, Zeichnen `steuerung.ts:397–428`).
- Spielstart: `neuerSpielstand` `spiel.ts:35–72` legt 5×40er (10|10…14, Vorsehung bei 14) + 25er (11|14) und Stationen für die Häuser (9|13), (12|14) an. Hilfsfunktion `ueberlappt` (`:74`) wird nur dort benutzt. `speichern.ts:4` importiert `neuerSpielstand` aus `./spiel`, 35 Testdateien ebenso.
- Ereignisse: Typ `spiel.ts:20–26`; `steuerung.ts:467–482` leert die Liste je Bild und **übergeht unbekannte Arten still** – ein neues Ereignis `schritt` stört heute nichts.
- Puffer heute: Feld `hauspuffer` (`typen.ts:55`), gelesen nur in `bedarfKw` (`netz.ts:453`) und für Anzeigen (`kontext.ts:186, 235`); gesetzt nur in `hauspufferEinbauen` (`spiel.ts:626–637`, Merkmal `hauspuffer` ab Stufe 3, `freischaltung.ts:11, 29, 47`, Preis `KONSTANTEN.hauspuffer_eur` 1.800 €).
- Stationen: `STATIONEN` (`katalog.ts:405–412`, Wand 15–80 kW + CAD 150 kW), `passendeStation`, Stationsprüfung im Netz `netz.ts:402–403` (`st.leistung_kw < n` → kalt „station“). Tests greifen über Index zu (`STATIONEN[0]`, `STATIONEN.at(-1)` in `anpassungen.test.ts:139, 591`), `tests/hilfen/a91-netze.ts:66, 103` nutzt `passendeStation` → **Puffer-Stationen kommen in eine eigene Liste**, sonst kippen diese Tests.
- Bedarfe (Katalog): EFH 15.000 kWh/a, RH 24.000, Bäckerei 30.000, MFH 45.000; Vollversorgung ×1,5, Aufstockung ×1,4.

**Messungen (getestet, Wegwerf-Kopie unter dem Scratchpad, nicht im Projekt; Basis 124952e, `npx vitest run tests`):**
1. Nur Startnetz und Startstationen aus `neuerSpielstand` entfernt → **128 rot / 923 grün** in 19 Dateien (anpassungen 44, a88-kundenanfrage 21, a88-kundenanfrage-abnahme 16, a88-freischalt-leiter 15, a92-anschlussweg 5, a92-b2b-zeichenleiste 4, a89-hausanschluss 3, a92-sperrtexte 3, spiel 3, a88-review-p2-luecken 2, a89-hausanschluss-meldung 2, a91-hausanschluss 2, nr12-ebenen 2, je 1: a88-wegsuche, a89-mehrfach, a91-anschluss, a91-netzbaum, a91-vergleich, a92-sperre-weg-aktion-laeuft). Die Zahl weicht von den 98 aus Fassung 1 ab, weil dort die Wegsuche schon entfernt war (Überschneidung).
2. Dazu Testhilfe `altesStartdorf` (Entwurf in Abschnitt 7) und in genau diesen 19 Dateien `neuerSpielstand(` → `altesStartdorf(` → **1 rot / 1.050 grün**; der eine Rest ist `a88-wegsuche` (wird in P0 ohnehin gelöscht). Die Testhilfe trägt also.
3. Zusätzlich `VOLLLASTSTUNDEN.mit_puffer_h` 1.800 → 2.000 → nur **ein** weiterer roter Test: `anpassungen` „A71: … ÷ 1.800 h“.

## 3. Festlegungen
**AE-NR18-1 Warnen entscheidet nichts.** Bindet `stationKaufen`, `abschnittAbschliessen`. Verhindert, dass eine Sperre zurückkommt. Regel: Die Prüfung läuft **nach** der Aktion und ändert weder Geld noch Spielstand; Ergebnis `{ ok: true, hinweis?: string }`. Einzige Ablehnung, die NR18 neu einführt: Entfernen einer Leitung mit Ersatz in Phase `bau` (W5) – das ist keine Lastsperre, sondern schützt bezahltes Material.

**AE-NR18-2 Ein Ort für die Engstelle** [aus AE-A93-2]. `engstellenFinden`, `engstelleText`, `ENGPASS_ERSATZ`, `WEITERE_STELLEN`, Typ `Engstelle` nur in `src/core/engstelle.ts` (importiert nur `./katalog`, `./typen`), aufgerufen nur in `spiel.ts`. Architekturtest `nr18-engstelle` R1–R3.

**AE-NR18-3 Eine Probe-Rechnung.** Jede Rechnung „wie nach dem Bau“ läuft durch `private probeNetz(anpassen?: (o: Objekt) => Objekt): Netz`. `berechneNetz(` steht in `spiel.ts` höchstens zweimal. Architekturtest `nr18-engstelle` R4.

**AE-NR18-4 Ersatz ist ein Feld an der gebauten Leitung.** `Objekt.ersatz?: { typ: TypId; nr: number }`, `nr` = `stand.naechste_id++`. Live-Netz rechnet bis Bauende mit dem alten Typ (E2).

**AE-NR18-5 Warnliste des Abschnitts nur im Spiel-Objekt**, nie im Spielstand (wie Fassung 1).

**AE-NR18-6 Ereignis statt Grafik.** `{ art: 'engstelle'; felder: number[] }`; bei „Weniger Bewegung“ ohne Puls, nicht weggelassen.

**AE-NR13-1 Spielstart an einer Stelle (neu).** Bindet `neuerSpielstand`. Verhindert, dass Spielstart, Tutorial-Start und Tests auseinanderlaufen und dass P2 und P5 in derselben Datei arbeiten. Regel: `neuerSpielstand` ist genau einmal definiert, ab P1 in `src/core/start.ts`; `spiel.ts` reicht nur weiter (`export { neuerSpielstand } from './start';`, damit `speichern.ts` und 35 Testdateien unverändert bleiben). `start.ts` importiert nicht `./spiel` (kein Kreis). Spätere Tutorial-Startdaten (NR13) kommen auch hierher. Architekturtest `nr18-f2-struktur` F1.

**AE-NR13-2 Tutorial hört zu und fragt den Kern (neu, Fassung 3 neu gefasst).** Bindet `Schritt`, `Tipp`, `erreichteHaeuser`. Verhindert, dass ein Tutorial eigene Spielregeln nachrechnet (eigene Erreichbarkeit, eigenes Netz, eigene Kosten) und dass Kern und Oberfläche sich gegenseitig Ereignisse unterschieben. Regeln:
- Nur der Kern (`src/core/`) erzeugt `{ art: 'schritt', … }`, und zwar erst **nach** dem Gelingen der Aktion, nie bei Ablehnung (F2a).
- Reine Bedienschritte (Antippen von Heizzentrale, Knopf, Reiter, Katalogkarte, Haus, [Weiter]) meldet nur die Oberfläche als `{ art: 'tipp', … }`; der Kern erzeugt nie `tipp` (F2b).
- Zustand (Wiedereinstieg 13.7, „noch 1 Haus fehlt“) liest das Tutorial nur über Kern-Abfragen: öffentliche Felder des Spielstands (Phase, Station eines Hauses, `netz.warm`) und Methoden wie `erreichteHaeuser()`. Dateien mit „tutorial“ im Namen importieren weder `netz.ts` noch `engstelle.ts` und rufen kein `berechneNetz` (F2c).
- Die Namen stehen an genau einer Stelle: `src/core/tutorial-vertrag.ts` (nur Typen) und entsprechen wörtlich Abschnitt 5.4 (F2d).

**AE-NR19-1 Puffer ist ein Merkmal des Hauses, die Bauart steht an der Station (neu).** Bindet `hauspuffer`, `PUFFER_STATIONEN`. Verhindert zwei Wahrheiten über „hat Puffer“. Regel: `bedarfKw` liest nur `o.hauspuffer` (wie heute). `stationKaufen` setzt `hauspuffer = true`, wenn eine Puffer-Station gekauft wird; `hauspuffer` wird nie gelöscht. Haus mit `hauspuffer` darf jede passende Station bekommen (auch Wandstation – so bleiben alte Stände „Puffer + Wandstation“ gültig); Haus ohne `hauspuffer`, das schon eine Station hat, bekommt keine Puffer-Station mehr (kein Nachrüsten). Puffer-Stationen nur für Kategorie `haus`.

**AE-NR19-2 Eine Prüfung „Station reicht“ (neu).** Bindet jede Frage „schafft diese Station dieses Haus?“. Verhindert, dass Netz (kalt „Station zu klein“), Kauf und Hausblatt unterschiedlich rechnen. Regel: `export function stationReicht(st: Station, o: Objekt): boolean` in `src/core/netz.ts`; außerhalb von `netz.ts` und `katalog.ts` vergleicht kein Code `leistung_kw` mit einer Bedarfszahl. Architekturtest `nr18-f2-struktur` F3 (greift, sobald `stationReicht` existiert).

**AE-NR19-3 Zwei Leistungen getrennt.** `PufferStation.leistung_kw` = **Netz-Ladeleistung** (Dauerheizleistung, gegen `bedarfKw` mit 2.000 h), `spitze_kw` = **Spitze im Haus** (Spitzenheizleistung, gegen die Leistung des Hauses ohne Puffer = Verbrauch ÷ 1.500 h × Nutzung) [F]. Kein Feld heißt nur „kw“.

## 4. Was wegfällt
| Was | Wo | Paket |
|---|---|---|
| Wegsuche `hausanschlussPlanen`, `feldKosten_eur`, `BIEGUNG_EUR`, A89/A91-Wegprüfung, Rückfall, zugehörige Meldungen | `spiel.ts:649–778` | P2 |
| `gruppe` (Typ, Schreiben, Zurück als Gruppe, Löschen bei Bauende) | `typen.ts:39–40`, `spiel.ts:485, :1051` | P2 (auch der Typ) |
| `leitungTauschen` | `spiel.ts:862–875` | P2 |
| Knopf „Hausanschluss ziehen“, Knöpfe „Tauschen: …“ außerhalb des Abschnitts | `kontext.ts:225, :382` | P3 |
| Messungen M4/M5 | `tools/a91-laufzeit.messung.ts` | P2 |
| Startnetz (5×40er, 25er) und Startstationen | `neuerSpielstand` (nach P1 in `start.ts`) | P5 |
| `hauspufferEinbauen`, `KONSTANTEN.hauspuffer_eur`, Merkmal `hauspuffer`, Kasten „Pufferspeicher im Haus“ | `spiel.ts:626–637`, `katalog.ts:385`, `freischaltung.ts:11, 29, 47`, `kontext.ts:209, 232–241` | P6 |

**Bleibt:** „Leitung selbst legen“, „Hausanschluss geplant“ (gesperrt), `abschnittAnschluesse`/`hausanschlussGeplant`, automatisches Abzweig-Zeichnen (A47/A65), Anbohrungskosten (A69), Feld `hauspuffer`.

**Lastenheft-Anpassung (Projektleiter):** beim Merge von P2: A47, A69, A89, A92, A30, NR17 wie Fassung 1. Beim Merge von P5: A29 „zwei Starthäuser angeschlossen“ → „kein Haus angeschlossen (NR13)“, A59/A67/A74 (Startnetz) → „entfallen für neue Spiele durch NR13; alte Stände behalten ihr Netz“. Beim Merge von P6: A71 2.000 h, Puffer nur beim Anschluss; A88-Tabelle ohne „Puffer im Haus“ (Stufe 3).

## 5. Was neu kommt
### 5.1 NR18 (inhaltlich wie Fassung 1)
- **Warnung beim Stationskauf** (nur wenn das Haus vorher `ohne_station` war): `vorher = probeNetz(Haus als ohne_station)`, `nachher = probeNetz()`. `neu` = Kunden mit `kalt === 'leitung'` in `nachher`, die es in `vorher` nicht waren. Ist `neu` nicht leer: `engstellenFinden(nachher, neu)`; Text der ersten Engstelle, sonst `ENGPASS_ERSATZ`; Ereignisse `hinweis` + `engstelle` (Felder aller gefundenen Stücke). Rechnet mit geplanten Leitungen und geplantem Ersatz.
- **Warnung beim Abschluss des Bauabschnitts:** nach `phase = 'bestellen'`: `nachher = probeNetz()`, alle Kunden mit `kalt === 'leitung'` → Warnliste (AE-NR18-5). Hinweis = erster Text; bei mehr als einem Stück dazu `WEITERE_STELLEN`; Ereignis `engstelle` mit allen Feldern. Baumenü (Phase `bestellen`) listet alle Texte über der Bestell-Schaltfläche.
- **Warnliste bleibt aktuell (Fassung 3, W4):** In Phase `bestellen` füllen ein gelungenes `stationKaufen` und ein gelungenes `entfernen` einer Leitung die Liste neu – mit demselben `nachher`-Netz, das die Aktion ohnehin rechnet (beim Entfernen ein `probeNetz()` mehr). Eine private Methode `warnlisteFuellen(nachher: Netz): void` für Abschließen, Laden, Stationskauf und Entfernen. Der Hinweis beim Stationskauf bleibt der stationsbezogene aus dem ersten Punkt.
- **Engstellen-Anzeige:** Rauten-Umriss je Feld, Warnrot `#d8392f`, Linie 3 px, 6 s, Puls 1,5 Hz, bei „Weniger Bewegung“ fest; eine neue Markierung ersetzt die alte (Designer bestätigt in der Fotoprüfung).
- **Ersatz:** `ersatzPlanen(id, neu)`: nur gebaute Leitung, Abschnitt `offen`, `neu` dicker (`kapazitaet_kw` größer) und freigeschaltet, sonst Ablehnung mit Hinweis. Überzeichnen in der Zeichenleiste ruft es für gebaute Felder auf; über eine **geplante** Leitung zeichnen setzt deren Typ neu (`geplanteLeitungTyp`); dünner oder gleich über gebaut → still übersprungen. Radierer/„Zurück“ nehmen auch Ersatz zurück. Kosten im Abschnitt: Material neu, minus 50 % Altpreis (E1), plus Spülbohrung auf Flussfeldern [F]; keine Gestattung. Bauende: `typ = ersatz.typ`, `ersatz` löschen, Vorsehung bleibt.
- **Leitung mit Ersatz entfernen (Fassung 3, W5):** Phase `bau` → Ablehnung „Diese Leitung wird gerade ersetzt – warte, bis der Abschnitt gebaut ist.“ (Geld, Leitung und Ersatz unverändert). Phase `offen` oder `bestellen` → Leitung wird wie heute entfernt (50 % Rückkauf des alten Typs), der Ersatz verfällt mit ihr (noch nicht bezahlt). Andocken einer neuen Leitung an eine Leitung mit Ersatz kostet die Anbohrung wie heute (`anbohrungsFelder` unverändert, PL-Entscheidung).
- Der c2-Text gehört jetzt zu P5 (Abschnitt 5.3).

### 5.2 Neuer Spielstart (P5)
`neuerSpielstand` ohne die Zeilen für Startnetz und Startstationen; alle Häuser `ohne_station: true`. Alles andere gleich (Geld, Taler, Preisstufe, Deko mit gleichem Zufallsstart – die Deko liegt nie im Bereich 6–16, das Startnetz hat sie nie verdrängt).
**Kessel vorgewählt (Fassung 3, PL-Entscheidung, vorläufig – Simon kann umentscheiden):** `innen: [{ typ: 'kessel', stufe: 1, bau: null }]`, `quelle_gewaehlt: true` – genau das, was `ersteQuelleWaehlen('kessel')` heute im Spielstand hinterlässt (`spiel.ts:400–404`, gratis). Grund: Das Tutorial setzt ab T01–T03 den Hackschnitzelkessel und „0 / 60 kW“ voraus; die Wahl der Wärmequelle kommt später. `steuerung.ts:85` (automatische Wahl, wenn `quelle_gewaehlt` fehlt) bleibt für alte Stände. `ersteQuelleWaehlen` bleibt; sein erneuter Aufruf leert `innen` zuerst und ist deshalb harmlos (29 Testdateien rufen es auf).
Gemessen (Wegwerf-Kopie unter dem Scratchpad, Basis ab0f53b, nur Kessel vorgewählt, Startnetz noch da, `npx vitest run tests`): **3 rot / 1.051 grün**, alle in `spiel.test.ts` (A3 „neues Spiel hat noch keine Quelle gewählt“, A81 „warme Kunden zahlen …“ Teil „keine Quelle: alle kalt“, A15 „kaputte oder fremde Daten …“ `quelle_gewaehlt === false`) → P0 Punkt 3.
**`ERSTE_HAEUSER: ReadonlyArray<readonly [number, number]> = [[9, 13], [12, 14]]`** (Fassung 3, K2 – fest, nicht „die nächsten“). Haus 1 = (9|13), Haus 2 = (12|14): Das sind die zwei Häuser an der Tutorial-Spur (10|10)…(10|14), (11|14) in der Reihenfolge, in der eine von der Heizzentrale nach Süden gezogene Leitung sie erreicht ((9|13) über (10|13), (12|14) über (11|14)). (13|12) liegt mit einem Feld näher an der Heizzentrale, aber nicht an der Spur; es kann versehentlich erreicht werden – harmlos, solange es keine Station hat. Ändert der Designer die Häuser, ändert sich nur diese Konstante.
**Alte Stände:** keine Umwandlung. `speichern.ts` lädt gespeicherte Objekte wie sie sind; Startnetz und Stationen bleiben.
**Geld (gerechnet, nicht gemessen – Entwickler misst in P5):** Planung 2.000 € + 6 Felder 25er à 400 € + 2 Wandstationen à 2.400 € = 9.200 €; mit zwei Puffer-Stationen HP 800 (nach P6) 15.540 €. Vom Startgeld 30.000 € bleiben 14.460–20.800 €. Bisher bekam der Spieler ca. 9.200 € Netz und Stationen geschenkt (E4).

### 5.3 Aufträge (P5)
- c1 (≥ 1 warmes Haus): „Versorge dein erstes Haus: Leitung von der Heizzentrale bis ans Haus legen, Station kaufen“.
- c2 (**≥ 2** warme Häuser, bisher 3): „Versorge ein zweites Haus – reicht die Leitung für beide?“
- h3 (≥ 4, unverändert): Text „Schließ zwei weitere Häuser an: Station kaufen und Leitung im Bauabschnitt legen“.
Folge für alte Stände: wer c2 noch offen und schon 2 warme Häuser hat, bekommt c2 sofort (+10 Taler) – harmlos.

### 5.4 Tutorial-Schnittstelle (Vertrag P1, Aussenden P2) – Fassung 3, ausgerichtet an DESIGN 13.5/13.7
**Vertrag `src/core/tutorial-vertrag.ts`** (nur Typen, importiert höchstens `type TypId` aus `./katalog`):
```ts
/** Kern meldet nach dem Gelingen einer Handlung (AE-NR13-2). */
export type Schritt =
  | 'abschnitt_geplant'        // abschnittPlanen ok (Philipp plant)
  | 'abschnitt_offen'          // Planung fertig, Phase planung → offen (Takt)
  | 'leitung_gezeichnet'       // platzieren einer geplanten Leitung ok, geplanteLeitungTyp ok, ersatzPlanen ok; objekt_id = Leitung
  | 'haus_erreicht'            // Haus neu in erreichteHaeuser(); objekt_id = Haus
  | 'haus_getrennt'            // Haus nicht mehr in erreichteHaeuser(); objekt_id = Haus
  | 'station_gekauft'          // stationKaufen ok; objekt_id = Haus
  | 'abschnitt_abgeschlossen'  // abschnittAbschliessen ok
  | 'material_bestellt'        // materialBestellen ok
  | 'abschnitt_gebaut'         // Bauende des Abschnitts (Takt)
  | 'haus_warm';               // Kunde neu in netz.warm; objekt_id = Kunde
/** Nur die Oberfläche meldet reine Bedienschritte (AE-NR13-2). */
export type Tipp =
  | 'heizzentrale'             // Heizzentrale auf der Karte angetippt
  | 'baumenue'                 // Rundknopf [Bauen] angetippt
  | 'reiter_leitungen'         // Reiter „Leitungen“ im Baumenü
  | 'leitungskarte'            // Katalogkarte einer Leitung; typ = Leitungstyp
  | 'haus'                     // Haus auf der Karte angetippt; objekt_id = Haus
  | 'weiter'                   // [Weiter] bzw. [Los geht’s] der Anleiter-Karte
  | 'daneben';                 // Berührung außerhalb des Lochs (für „Hilfe nach drei Fehltipps“)
```
- Kern-Ereignis (`spiel.ts`): `| { art: 'schritt'; schritt: Schritt; objekt_id?: number }`. Der Kanal `{ art: 'tipp'; tipp: Tipp; objekt_id?: number; typ?: TypId }` ist **kein** Kern-Ereignis; die Oberfläche reicht ihn in NR13 an die Tutorial-Logik weiter. In diesem Plan nur der Typ, kein Aussenden.
- **Kern-Abfrage `erreichteHaeuser(): number[]`** (P2, `spiel.ts`): Ids aller Objekte der Kategorie `haus` und `gross`, für die `probeNetz().anschluss` einen Eintrag hat – „über gebaute **und eingezeichnete** Leitungen mit der Heizzentrale verbunden“, mit oder ohne Station (`netz.ts:125–153` setzt `anschluss` unabhängig von der Station). Aufsteigend sortiert. Dieselbe Rechnung wie die Warnprüfung (AE-NR18-3), keine zweite.
- **`haus_erreicht` / `haus_getrennt`:** private Menge `erreicht?: Set<number>`; `erreichtAbgleichen()` am Ende von `platzieren` (geplante Leitung), `geplanteLeitungEntfernen`, `letzteLeitungZurueck`, `abschnittVerwerfen` und `entfernen` (Leitung), nur wenn die Aktion gelang. Ist die Menge noch `undefined` (erster Abgleich nach Konstruktor/Laden), nur merken, nichts melden (wie `haus_warm`). Je Haus neu und nicht alt ein `haus_erreicht`, je Haus alt und nicht neu ein `haus_getrennt`.
- `haus_warm` entsteht in `neuBerechnen` durch Vergleich alt/neu von `netz.warm`; **nicht** bei der ersten Rechnung im Konstruktor (sonst meldet jedes Laden alle warmen Häuser). Kein zusätzlicher `berechneNetz`-Aufruf (R4).
- Je gezeichnetem Feld ein `leitung_gezeichnet` (Wischen erzeugt mehrere); das Tutorial wertet nur das erste aus.
- `quelle_gewaehlt` entfällt (stand in Fassung 2): Ein neues Spiel startet mit Kessel (5.2), kein Tutorial-Schritt wartet darauf.

**Zuordnung DESIGN 13.5/13.7 → Kanal** (W = Erklär-Schritt):
| Schritt | weiter mit | Kanal |
|---|---|---|
| T01 | Heizzentrale antippen | `tipp: 'heizzentrale'` |
| T02–T07, T16, T22, T24, T25 (W) | [Weiter] | `tipp: 'weiter'` |
| T08, T20 | [Bauen] antippen | `tipp: 'baumenue'` |
| T09 | Reiter „Leitungen“ | `tipp: 'reiter_leitungen'` |
| T10 | Philipp-Knopf | `schritt: 'abschnitt_geplant'` |
| T11 (W, wartet) | [Weiter] erst, wenn Philipp fertig | `schritt: 'abschnitt_offen'` gibt [Weiter] frei, dann `tipp: 'weiter'` |
| T12 | Katalogkarte {leitung} | `tipp: 'leitungskarte'` mit `typ` |
| T13 / T13b | beide Häuser über eingezeichnete Leitungen verbunden | `schritt: 'haus_erreicht'` für beide `ERSTE_HAEUSER` (nach dem ersten: T13b); das erste `leitung_gezeichnet` beendet die Fingerfahrt |
| 13.7 „Zurück nimmt ein Haus weg“ | – | `schritt: 'haus_getrennt'` |
| 13.7 „Abschließen zu früh“ („noch 1 Haus fehlt“) | – | Abfrage `erreichteHaeuser()` ∩ `ERSTE_HAEUSER` |
| T14 | [Abschnitt abschließen] | `schritt: 'abschnitt_abgeschlossen'` |
| T15, T18 | Haus 1 / Haus 2 antippen | `tipp: 'haus'` mit `objekt_id` |
| T17, T19 | Kauf Puffer-Übergabestation | `schritt: 'station_gekauft'`, `objekt_id` = Haus 1 / Haus 2 |
| T21 | Laura-Knopf | `schritt: 'material_bestellt'` |
| T23 (W, wartet) | [Weiter] erst, wenn der Bau fertig ist | `schritt: 'abschnitt_gebaut'` gibt [Weiter] frei, dann `tipp: 'weiter'` |
| T24 (Höhepunkt) | – | `schritt: 'haus_warm'` für beide Häuser |
| T26 | [Los geht’s] | `tipp: 'weiter'` |
| 13.5 „Hilfe nach drei Fehltipps“ | – | `tipp: 'daneben'` |
| 13.7 Wiedereinstieg | Zustand → Schritt | Abfragen `stand.abschnitt?.phase`, `erreichteHaeuser()`, `station` der zwei Häuser, `netz.warm` |

- Nicht in diesem Plan: Tutorial-Zustand im Spielstand, Tutorial-Zeiten (10 s / 20 s), `{leitung}` aus T12, Bediensperren, Kamerafahrt, Aussenden von `tipp` – das plant NR13. Eine Abfrage `tutorialStand()` (Wiedereinstieg als fertiger Schritt) ist Tutorial-Logik und gehört in NR13. Hinweis für NR13: `steuerung.ts:469` leert die Ereignisliste je Bild (`splice(0)`); das Tutorial hängt sich dort ein, liest nicht selbst in `spiel.ereignisse`.

### 5.5 NR19 Puffer-Übergabestation (P6)
**Katalog (`katalog.ts`), Spielwerte mit Quelle:**
```ts
export const VOLLLASTSTUNDEN = { ohne_puffer_h: 1500, mit_puffer_h: 2000 } as const;
// Quelle: Simon 2026-11-06; mit Puffer: ENERPIPE TI 04/26 S. 18 (2.000–2.200 h, Herstellerwert);
// ohne Puffer: üblich 1.500 h, 1.700 h mit Warmwasser (Fraunhofer UMSICHT Leitfaden Nahwärme S. 11, ohne Puffer-Bezug).
export interface PufferStation extends Station { spitze_kw: number; speicher_l: number }
export const PUFFER_STATIONEN: ReadonlyArray<PufferStation> = [...]
export const istPufferStation = (st: Station | undefined): st is PufferStation => !!st && 'spitze_kw' in st;
export const passendePufferStation = (netz_kw: number, spitze_kw: number): PufferStation | null => …; // kleinste mit leistung_kw ≥ netz_kw und spitze_kw ≥ spitze_kw
// stationHolen sucht in STATIONEN und PUFFER_STATIONEN; passendeStation bleibt unverändert (nur STATIONEN).
```
| id | name | leistung_kw (Netz) | spitze_kw (Haus) | speicher_l | kosten_eur | Herleitung |
|---|---|---|---|---|---|---|
| `hp_800` | Puffer-Übergabestation HP 800 | 14 | 19 | 800 | 5.570 | 2.000 + 3.570 |
| `hp_1000` | Puffer-Übergabestation HP 1000 | 20 | 27 | 1000 | 6.570 | 3.000 + 3.570 |
| `up_1000` | Puffer-Übergabestation ÜP 1000 | 40 | 54 | 1000 | 7.570 | 4.000 + 3.570 |

Quellen: Leistungen ENERPIPE „Pufferspeichersysteme“ 06/18 S. 13 Tab. 4 (Netz 80/60 °C; Dauer- = Netz-Ladeleistung, Spitzen- = Haus), Gegenprüfung 2026-11-06; im Code-Kommentar dazu (Fachprüfung F2): „Ausgabe 04/26 beschriftet anders (ÜP nur 40 kW, keine Spitze genannt)“. Preis = „Station allein“ nach Netz-Ladeleistung (Adelsdorf 2024: 2.000 € bis 15 kW, 3.000 € 15–25 kW, 4.000 € 25–50 kW, Differenz mit/ohne Übergabestation) + Speicher-Aufpreis 3.570 € (Donauwörth Q3/2026, Variante 3 − 1), brutto, regional, **Spielannahme** – Simon 2026-11-06 „erst mal okay“. Wandstationen und CAD bleiben unverändert (E6).
Beschreibungen [F] (≤ 90 Zeichen, kein Firmenname – A87):
- HP 800: „800-l-Speicher mit Rohrwendel: lädt mit 14 kW, gibt im Haus bis 19 kW ab.“
- HP 1000: „1.000-l-Speicher mit Rohrwendel: lädt mit 20 kW, gibt im Haus bis 27 kW ab.“
- ÜP 1000: „1.000-l-Speicher mit Plattentauscher: lädt mit 40 kW, gibt im Haus bis 54 kW ab.“ (80, Fachprüfung F2)

Probe mit den Katalog-Bedarfen (Tabelle zur Kontrolle, gerechnet aus Katalogwerten, Fachprüfer bestätigt): EFH 7,5 kW Netz / 10 kW Spitze → HP 800; RH 12 / 16 → HP 800; Bäckerei 15 / 20 → HP 1000; MFH 22,5 / 30 → ÜP 1000; EFH mit Kamin aus und aufgestockt (×2,1) 15,75 / 21 → HP 1000; MFH ×2,1 47,25 / 63 → keine Puffer-Station, nur Wandstation.

**Netz (`netz.ts`):**
- `export function stationReicht(st: Station, o: Objekt): boolean` – Wandstation/CAD: `st.leistung_kw >= bedarfKw(o)`. Puffer-Station: zusätzlich `st.spitze_kw >= bedarfKw({ ...o, hauspuffer: false })` (Spitze des Hauses = Leistung ohne Puffer) [F].
- `netz.ts:403`: `if (st && !stationReicht(st, o)) kalt.set(o.id, 'station')`.

**Kern (`spiel.ts`) `stationKaufen(id, stationId)`** (Signatur bleibt):
- Puffer-Station nur für Kategorie `haus`; nicht für ein Haus, das schon eine Station und kein `hauspuffer` hat → Ablehnung „Den Puffer gibt es nur beim Anschluss. Für dieses Haus geht nur eine Wandstation.“ (79).
- Prüfobjekt `p = { ...o, hauspuffer: o.hauspuffer || istPufferStation(st) }`; `!stationReicht(st, p)` → Ablehnung mit dem bisherigen Satz „{name} schafft nur {kw} kW, das Gebäude braucht {b} kW“ bzw. bei Puffer-Spitze „{name} gibt im Haus nur {spitze} kW ab, das Haus braucht in der Spitze {s} kW“ [F].
- Ohne `stationstypen` erlaubt: `passendeStation(bedarfKw(p_ohne))` **und** `passendePufferStation(bedarfKw(p_mit), bedarfKw(p_ohne))` (beide „kleinste passende“). Mit `stationstypen`: jede, die reicht.
- „Größere Station“-Regel bleibt (`alt.leistung_kw >= st.leistung_kw` → Ablehnung), Rückkauf 50 % über `stationspreis_eur` (unverändert).
- Bei Erfolg: `if (istPufferStation(st)) o.hauspuffer = true;` vor `neuBerechnen` und vor der NR18-Warnprüfung (die Warnung rechnet so mit 2.000 h).
- `hauspufferEinbauen` entfällt.

**Spielstand (`speichern.ts`, nach `gueltig`):** Haus mit Puffer-Station ohne `hauspuffer` → `hauspuffer = true` (Reparatur). Puffer-Station an einem Großabnehmer → Station löschen, `ohne_station = true`. Version bleibt 3. Alte Stände mit `hauspuffer` + Wandstation bleiben unverändert.

**Freischaltung:** Merkmal `hauspuffer` entfällt (Puffer-Stationen sind ab Stufe 1 frei – Standard laut Simon und Teil des Tutorials).

**Hausblatt (`kontext.ts`):**
- `stationswahl`: Kasten „Übergabestation wählen“ mit zwei Reihen. Reihe 1 „Mit Pufferspeicher“ (nur Kategorie `haus`, nur wenn eine Puffer-Station reicht und AE-NR19-1 sie erlaubt), Knopf Zeile 1 = `{name}` (z. B. „Puffer-Übergabestation HP 800“; DESIGN T17/T19 suchen den Knopf über den Anfang „Puffer-Übergabestation“), Zeile 2 = **Netzbedarf des Hauses** wie in T17, „{bedarfKw mit Puffer} kW aus dem Netz · {Preis}“ (z. B. „7,5 kW aus dem Netz · 5.570 €“; PL-Entscheidung zur Kritiker-Rückfrage P6); die kleinste passende ist `geld` (empfohlen). Reihe 2 „Wandstation ohne Puffer“, wie heute. Ohne `stationstypen` je Reihe ein Knopf, mit höchstens zwei je Reihe. Erklärzeilen [F]:
  - „Mit Puffer: {kwh} kWh ÷ 2.000 h = {kw} kW aus dem Netz. Der Speicher fängt die Spitze ab.“
  - „Ohne Puffer: {kwh} kWh ÷ 1.500 h = {kw} kW – das Netz muss die Spitze liefern.“
  - „Den Puffer wählst du nur beim Anschluss.“ (Spielregel, kein [F])
- Zeile „Übergabestation“: Puffer-Station „{name} · {leistung_kw} kW Netz, {spitze_kw} kW im Haus“; Wandstation wie heute; alter Stand mit `hauspuffer` + Wandstation: „{name} · {kw} kW, mit Puffer“.
- Kasten „Pufferspeicher im Haus“ (`pufferBereich`) entfällt; Zeile „Anschlussleistung … (÷ 2.000 h)“ bleibt (liest `VOLLLASTSTUNDEN`).
- `anfrageKasten` (`kontext.ts:25`) und der Chip „Station zu klein“ nutzen `stationReicht` (mit dem Bedarf nach der Anfrage: `stationReicht(st, { ...o, vollversorgung/aufgestockt wie nach Annahme })` – P6 baut dafür `spiel.anfrageObjekt(o): Objekt` oder rechnet über den vorhandenen `anfrageBedarf_kw`; Entscheidung des Entwicklers, aber nur über `stationReicht`).

## 6. Texte (≤ 90 Zeichen, **[F]** = Fachprüfer)
**NR18** – `{t}`/`{e}` = Kurzname ohne „-Leitung“ („25er“). `{f}` = `max(1, ⌈last_kw − kapazitaet_kw⌉)`, `kapazitaet_kw` = Katalog × `spreizung_faktor`. `{e}` = kleinste Leitung des Katalogs mit Kapazität × Faktor ≥ `last_kw`, dicker als `{t}`.
- Satz 1 [F]: an der Heizzentrale (Tiefe 1) „Die {t} an der Heizzentrale ist zu dünn, es fehlen {f} kW.“ · weiter draußen „Eine {t} auf dem Weg ist zu dünn, es fehlen {f} kW.“ · Stück enthält geplante Leitung oder geplanten Ersatz „Die eingezeichnete {t} ist zu dünn, es fehlen {f} kW.“
- Satz 2 (Fassung 3 ausdrücklich): `e.empfohlen === null` (keine Leitung des Katalogs reicht) → „Leg einen getrennten Abgang.“ [F, Fachprüfung F2: im Spiel verbinden sich anliegende Felder zu einem Baum, nur ein getrennter Abgang hilft] · sonst `empfohlenAbStufe === null` (frei) → „Zeichne eine {e} darüber.“ · sonst „Die {e} gibt es ab Stufe {n}.“ mit `n = empfohlenAbStufe`. `empfohlenAbStufe` berechnet der Aufrufer in `spiel.ts`: `freigeschaltet(stand, e.empfohlen) ? null : abStufe(e.empfohlen)`; bei `e.empfohlen === null` wird `null` übergeben und nicht gelesen.
- Fassung 4 (Entscheidung W1, 06.11.): `engstellen` meldet **alle** zusammenhängenden zu vollen Stücke auf den Wegen aller Kunden (zusammengelegt nach erstem Feld, sortiert nach Tiefe und Feldnummer), nicht nur das erste. Ein Stück kann Felder mehrerer Äste berühren; Aufrufer (P2 Warnliste, P4 Markierung) zeigen alle Einträge.
- Beispiel: „Die 25er an der Heizzentrale ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.“ (84). Längster Fall 90 (Satz 1 lang + „Leg einen getrennten Abgang.“, Fachprüfer gezählt).
- `ENGPASS_ERSATZ` [F]: „Mit diesem Haus werden andere Häuser kalt. Eine Leitung auf dem Weg ist zu dünn.“ (80; „werden“, weil die Station schon gekauft ist – Fachprüfung F2)
- `WEITERE_STELLEN`: „Weitere zu dünne Stellen stehen im Baumenü.“ (43)
- Kern-Ablehnung Ersatz außerhalb des offenen Abschnitts: „Dickere Leitungen entstehen nur im Bauabschnitt – lass Philipp einen planen.“ (76); gesperrter Knopf „Dickere Leitung“ in der Leitungskarte mit Sperre wie `abschnittSperre` (DESIGN 12.20 B1–B4), Zeile 2 Kurzform 12.21.
- Leitungskarte mit geplantem Ersatz: „Wird im Bauabschnitt durch eine {e} ersetzt.“, Knopf „Ersatz zurücknehmen“. Kern-Ablehnung Entfernen in Phase `bau` (W5): „Diese Leitung wird gerade ersetzt – warte, bis der Abschnitt gebaut ist.“ (72) Baumenü-Überschrift der Warnliste: „Nach dem Bau zu dünn“.
Spielstart: Auftragstexte 5.3 (kein [F]). Hausblatt-Satz „Heizt noch mit Öl. Leg eine Leitung von der Heizzentrale bis an das Haus und kaufe danach eine passende Übergabestation.“ bleibt.
NR19: Beschreibungen und Erklärzeilen 5.5 [F]; Ablehnungen 5.5 (Spitzen-Satz [F]).
Fachprüfer zusätzlich: „Spitze des Hauses = Verbrauch ÷ 1.500 h“ (Spielvereinfachung), Lesart HP/ÜP-kW (Netz = Dauer-, Haus = Spitzenheizleistung, 80/60 °C), „mit Puffer 2.000 h“ als Herstellerwert kennzeichnen.

## 7. Pakete
Zwei Wellen, je Paket ein Entwicklerlauf.

| Paket | Dateien | Abhängig von | Parallel mit | Schwierigkeit |
|---|---|---|---|---|
| **P0** Tester-Vorarbeit NR18 + Start | `tests/**` (Liste unten), neu `tests/hilfen/altes-startdorf.ts`, `tests/hilfen/nr18.ts`, `tests/nr18-abnahme.test.ts`; löschen `tests/architektur/a93-engstelle.test.ts` | – | P1 | mittel |
| **P1** Engstelle + Vertrag + Start verschieben | neu `src/core/engstelle.ts`, neu `src/core/start.ts`, neu `src/core/tutorial-vertrag.ts`, `src/core/typen.ts` (nur `ersatz`), `src/core/spiel.ts` (nur Vertrag + Verschieben), `src/render/effekte.ts` (leere Methode), neu `tests/nr18-engstelle-kern.test.ts` | – | P0 | mittel |
| **P2** Kern NR18 + Schritt-Ereignisse | `src/core/spiel.ts`, `src/core/typen.ts` (`gruppe` weg), `src/core/speichern.ts`, `tools/a91-laufzeit.messung.ts`, neu `tests/nr18-kern.test.ts`, `tests/nr18-spielstand.test.ts`, `tests/nr13-schritte.test.ts` | P0, P1 | P3, P4, P5 | **schwer** |
| **P3** Oberfläche NR18 | `src/ui/kontext.ts`, `src/ui/katalog.ts`, `src/ui/sperrtexte.ts`, `src/steuerung.ts`, neu `tests/nr18-oberflaeche.test.ts` | P0, P1 | P2, P4, P5 | mittel |
| **P4** Darstellung NR18 | `src/render/effekte.ts`, `src/render/szene.ts`, neu `tests/nr18-darstellung.test.ts` | P1 | P2, P3, P5 | mittel |
| **P5** Neuer Spielstart | `src/core/start.ts`, `src/core/auftraege.ts`, neu `tests/nr13-start.test.ts` | P0, P1 | P2, P3, P4 | einfach |
| **P0b** Tester-Vorarbeit NR19 | `tests/**` (Liste unten) | Welle 1 gemergt | – | einfach |
| **P6** NR19 Puffer-Übergabestation | `src/core/katalog.ts`, `src/core/netz.ts`, `src/core/spiel.ts`, `src/core/speichern.ts`, `src/core/freischaltung.ts`, `src/ui/kontext.ts`, neu `tests/nr19-puffer-kern.test.ts`, `tests/nr19-puffer-oberflaeche.test.ts` | P0b, Welle 1 | – | mittel |

**Kritischer Pfad Welle 1:** P1 (≈ 45 min) → P2. P0 gleichzeitig mit P1; P3, P4, P5 gleichzeitig mit P2 (keine gemeinsamen Dateien: P5 arbeitet nur in `start.ts`/`auftraege.ts`, dafür verschiebt P1 den Spielstart; keine gemeinsamen Ports oder Dateien zur Laufzeit). 2 von 5 Entwicklerpaketen nacheinander. **Welle 2:** P0b → P6 (NR19 berührt `spiel.ts` und `kontext.ts`, die P2/P3 gerade umbauen – deshalb danach; Simons Reihenfolge „NR18 (+NR19) zuerst, dann Tutorial“ bleibt gewahrt).
**Merge-Reihenfolge:** P0 Teil A → P1 → P2, P3, P4, P5 (beliebig; P0 Teil A muss vor P2/P3/P5 drin sein) → P0 Teil B (Abnahme) → Designer-Fotoprüfung + Fachprüfer [F] → P0b → P6 → Designer-Fotoprüfung Stationswahl + Fachprüfer.
**Überschneidungen außerhalb:** NR13 (Tutorial) baut auf `start.ts`, `tutorial-vertrag.ts` (`Schritt`, `Tipp`), `erreichteHaeuser()` und `ERSTE_HAEUSER` auf – erst nach Welle 1 planen.

### Vorarbeit (nicht für die Entwickler)
**Tester-Vorarbeit P0** (Betreff „Tester-Vorarbeit NR18-P0“). Neue Kern-Aufrufe nur über `tests/hilfen/nr18.ts` (Typumweg wie Fassung 1), damit `npm run typecheck` vor P1/P2 grün bleibt.

*Teil A – auf 124952e grün, oder rot nur bis zum genannten Paket:*
0. **Löschen `tests/architektur/a93-engstelle.test.ts`** (ganz; abgedeckt durch `tests/architektur/nr18-engstelle.test.ts` R1–R4). Die Schranke wertet sonst das Umbenennen als Löschen.
1. **Testhilfe `tests/hilfen/altes-startdorf.ts`:** `export function altesStartdorf(jetzt_ms: number, ortId?: string): Spielstand` – ruft `neuerSpielstand` und ergänzt, **nur wo frei**, 40er auf (10|10)…(10|14) (Vorsehung auf (10|14)), 25er auf (11|14), und gibt den Häusern (9|13) und (12|14), falls `ohne_station`, die Station `passendeStation(KATALOG[typ].bedarf_kw)` (ohne `ohne_station`). **Fassung 3:** setzt außerdem `innen = []` und `quelle_gewaehlt = false` (alter Start ohne gewählte Quelle; Tests, die das brauchen, rufen weiter `ersteQuelleWaehlen`). Vor P5 ändert sie nichts, nach P5 stellt sie das alte Startdorf her (gemessen, Abschnitt 2 Messung 2). Importiert nur `src/core/spiel`, `src/core/katalog`, `src/core/typen` (nicht `start.ts`, das es vor P1 nicht gibt).
2. **Umstellen auf die Testhilfe:** In diesen 19 Dateien jedes `neuerSpielstand(` → `altesStartdorf(` (Import ergänzen): anpassungen, a88-kundenanfrage, a88-kundenanfrage-abnahme, a88-freischalt-leiter, a92-anschlussweg, a92-b2b-zeichenleiste, a92-sperrtexte, spiel, a88-review-p2-luecken, nr12-ebenen, a91-hausanschluss, a91-anschluss, a91-netzbaum, a91-vergleich, a92-sperre-weg-aktion-laeuft (die übrigen vier – a88-wegsuche, a89-hausanschluss, a89-hausanschluss-meldung, a89-mehrfach – werden gelöscht). Ausnahmen Punkt 3. Probe des Testers: Wegwerf-Kopie, in `neuerSpielstand` Startnetz und Startstationen entfernen, Suite laufen lassen → nur die bewusst roten Tests aus Teil A/B rot.
3. **Start-Tests, die den alten Start festschreiben:** `anpassungen` „A29: Start mit 30.000 € …“ → mit `neuerSpielstand` lassen, Prüfungen auf Häuser/Stationen entfernen (Geld, Preis, Quelle bleiben; neuer Start in P5-Test). Löschen: `anpassungen` „A59: Die Hauptleitung am Start ist eine 40er …“, „A67: Das Startnetz wird nur am Abzweig dünner …“, „A74: Startnetz – 40er bis vor das letzte Haus …“, `a88-freischalt-leiter` „test_a88_startnetz_bleibt (A74)“ (Ersatz: P5 `test_nr13_alter_stand_behaelt_netz`).
   **Kessel vorgewählt (Fassung 3, gemessen 3 rot, alle `spiel.test.ts`):** A3 „neues Spiel hat noch keine Quelle gewählt“ → umbenennen in „Stand ohne gewählte Quelle hat keine Wärme“, Aufbau über `altesStartdorf` (Prüfungen bleiben; neuer Start in P5 `test_nr13_start_mit_kessel`). A81 „warme Kunden zahlen …“: der zweite Aufbau „keine Quelle: alle kalt“ über `altesStartdorf` (fällt mit der Umstellung in Punkt 2 ohnehin an). A15 „kaputte oder fremde Daten …“ (:333): `expect(st.quelle_gewaehlt).toBe(neuerSpielstand(T0).quelle_gewaehlt)` – grün vor und nach P5. Alle drei grün sofort.
4. **NR18-Liste** (aus Fassung 1, gesucht nach Verhalten per Prototyp, nicht nur nach Namen). Bei allen Umbauten auf dem `altesStartdorf` zeichnen.
   *Löschen (Verhalten entfällt), grün sofort:* 4.1 `tests/a88-wegsuche.test.ts` (ganz). 4.2 `tests/a89-hausanschluss.test.ts` (ganz). 4.3 `tests/a89-hausanschluss-meldung.test.ts` (ganz). 4.4 `tests/a89-mehrfach.test.ts` (ganz; Ersatz: Abnahme (d)/mehrere Häuser). 4.5 `anpassungen`: „A47: Der Hausanschluss führt vom Haus zur nächsten Leitung …“, „A47: Ohne offenen Bauabschnitt wird kein Anschluss geplant“, „A47: Der automatische Hausanschluss läuft gerade …“, „A69: Der automatische Hausanschluss rechnet die Anbohrung ein …“, „A49: ‚Letzte zurück‘ nimmt einen automatisch gezogenen Hausanschluss als Ganzes zurück“. 4.6 `a92-anschlussweg`: „A92: Hausanschluss-Meldung beugt ‚Feld‘ richtig“. 4.7 `a91-anschluss`: `test_a91_hausanschluss_4_12_ohne_umweg`. 4.8 `a91-vergleich`: `test_a91_vergleich_a89_durchlauf`. 4.9 `a88-freischalt-leiter`: „Hausanschluss jenseits des Flusses auf Stufe 1 – Hinweis mit Spülbohrung“ – vorher prüfen, ob ein Test „Leitung im Fluss auf Stufe 1 zeichnen → Hinweis Spülbohrung“ (`platzieren`) besteht; sonst als solcher umbauen.
   *Umbauen, Wegsuche war nur Werkzeug (Leitung per `platzieren` im offenen Abschnitt, Erwartung gleich), grün sofort:* 4.10 `a88-freischalt-leiter` `test_a88_stufe1_durchspielbar`. 4.11 `a92-sperrtexte`: B5 „Hausanschluss schon im Abschnitt“, B8 „Material bestellen mit 0,25 € zu wenig“, Regel 3 „jeder aria-disabled-Knopf …“, „Baumenü mit einem geplanten Anschluss – Zählung …“. 4.12 `a92-anschlussweg`: „Hauskarte mit geplantem Hausanschluss – gesperrte Knöpfe …“, „hausanschlussGeplant – nur das Haus mit geplantem Anschluss …“, „nach ‚Hausanschluss ziehen‘ zeigt das Haus ‚Hausanschluss geplant‘“ → „nach selbst gezeichneter Leitung …“. 4.13 `nr12-ebenen`: „Ablauf – gleicher Schlüssel ⇒ gleiche Befehlsfolge“ (Spielaktion Hausanschluss → gezeichnete Leitung). 4.14 `tests/browser/a92-b2b.browser.cjs:29` `TEXT_46` durch eine bleibende Meldung gleicher Länge ersetzen.
   *Umbauen, Knopf „Hausanschluss ziehen“ fehlt (nur „Leitung selbst legen“ bzw. „Hausanschluss geplant“), rot bis P3:* 4.15 `a92-sperrtexte`: 12.20 B1, B2, B3 und 12.21 B1–B4 (→ genau ein Knopf „Leitung selbst legen“ mit derselben Zeile 2/Hinweis). 4.16 `a92-anschlussweg`: „ohne Bauabschnitt – ‚Leitung selbst legen‘ gesperrt …“, „in Planung, beim Bestellen und im Bau …“. 4.17 `a92-sperre-schloss`: „Hauskarte ohne Bauabschnitt …“, „Hauskarte mit offenem Bauabschnitt – beide Knöpfe frei“ (→ ein Knopf). 4.18 `a92-sperre`: „Hauskarte ohne Abschnitt – ‚Hausanschluss ziehen‘ zeigt den Philipp-Hinweis“ → an „Leitung selbst legen“.
   *Umbauen, Sofort-Tausch → Ersatz im Bauabschnitt (Kern-Teile rot bis P2, Knopf-Teile rot bis P3):* 4.19 `a88-freischalt-leiter`: `test_a88_kern_setzt_durch` (Ersatz auf d50 bei Stufe 1 abgelehnt, im offenen Abschnitt), `test_a88_flussleitung_tauschbar` (Ersatz einer Flussleitung im Abschnitt erlaubt), `test_a88_gebautes_bleibt`, „Leitungskarte – Tausch nur auf freigeschaltete …“ (Knöpfe „Ersetzen: …“ nur im offenen Abschnitt). 4.20 `a88-review-p2-luecken`: K4 „Leitungskarte zeigt ‚Dickere‘ nur, wenn …“ (im offenen Abschnitt prüfen). 4.21 `anpassungen`: „A30: Leitungstausch kostet den Neupreis minus 50 % des Altpreises“ → `abschnittKosten_eur()` steigt um Neupreis − 50 % Altpreis (E1), Geld erst bei `materialBestellen`, Typ erst nach Bauende. 4.22 `menue-v2`: W2 „Was Euro kostet, ist Gold – auch … Leitung tauschen“ (Quelltext-Muster `Tauschen:` → `Ersetzen:`).
   *Nachtrag Fassung 3 (Kritik W1; vollständiger Abgleich aller 14 Dateien mit `hausanschlussPlanen`/`leitungTauschen`, gelesen):* 4.23 `tests/a91-hausanschluss.test.ts`: `test_a91_hausanschluss_13_12_zwei_felder` umbauen (Leitung per `platzieren` im offenen Abschnitt, Erwartung „3 warm, c2“ bleibt; auf `altesStartdorf`), grün sofort; löschen `test_a91_keine_abkuerzung_neben_heizzentrale`, `test_a91_rueckfall_ohne_warnpruefung_wenn_nur_warnender_weg`, `test_a91_keine_neue_aufteilung_mitten_auf_gleich_dicker_leitung`, `test_a91_keine_neue_reduzierung_am_ende_einer_dickeren_leitung`, `test_a91_durchlauf_ohne_sperre` (Verhalten entfällt); `test_a91_kein_hinweis_auf_heizzentrale_mehr` bleibt. 4.24 `anpassungen` „A47: Eine geplante Leitung am Haus wird als Hausanschluss dieses Abschnitts erkannt“ (:553): Leitung per `platzieren` statt Wegsuche, Erwartung gleich, grün sofort. 4.25 `a92-anschlussweg` 12.19-Fallliste (:381) Fall „Hauskarte mit geplantem Hausanschluss“: Leitung per `platzieren`, grün sofort.
5. Nach P0: `grep -rn "hausanschlussPlanen\|leitungTauschen" tests` findet nur Prüfungen der Form `'hausanschlussPlanen' in s` bzw. Quelltext-Muster; in den 19 Dateien kein `neuerSpielstand(` außer im A29- und A15-Test.

*Teil B – Abnahme `tests/nr18-abnahme.test.ts` auf dem leeren Dorf (rot bis P2 + P3 + P5; eigener Commit, der Projektleiter merged ihn nach P5):* Aufbau: `new Spiel(neuerSpielstand(T0), uhr)` (Kessel ist nach P5 vorgewählt, **kein** `ersteQuelleWaehlen`), `abschnittPlanen()`, Uhr bis Phase `offen`. Werte nur aus dem Katalog (d25 15 kW, d32 25 kW, EFH 15.000 kWh/a ÷ 1.500 h = 10 kW über `bedarfKw`); Vorbedingung `netz.spreizung_faktor === 1` und beide Häuser `efh` prüfen.
- `test_nr18_kein_knopf_hausanschluss_ziehen` (a): Hausblatt jedes Hauses ohne Station bei offenem Abschnitt hat keinen Knopf mit „Hausanschluss ziehen“; `'hausanschlussPlanen' in s` ist `false`.
- `test_nr18_selbst_gezogen_warm` (b): 25er per `platzieren` auf (10|10)…(10|14), (11|14); `stationKaufen(haus(12|14), passendeStation(10).id)` → kein Hinweis; abschließen ohne Hinweis, bestellen, Bauzeit → Haus (12|14) warm, `erledigt.c1`.
- `test_nr18_zu_duenn_warnt` (c): Fortsetzung; neuer Abschnitt nicht nötig – `stationKaufen(haus(9|13), 'st_15')` → `ok === true`, Geld um den Stationspreis gesunken, `hinweis` ist genau „Die 25er an der Heizzentrale ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.“, Ereignis `engstelle` mit `felder` genau `[11*N+10, 12*N+10, 13*N+10]` = (10|11), (10|12), (10|13) (Fassung 3, W2: (10|10) grenzt auch an die Heizzentrale, ist aber ein lastfreier Stummel; (10|14), (11|14) tragen nur 10 kW); danach `netz.kalt.get(9|13) === 'leitung'`.
- `test_nr18_ersatz_macht_warm` (d): neuer Abschnitt, 32er per echter Steuerung über (10|10)…(10|13) → Typ bleibt bis Bauende `d25`, `abschnittKosten_eur() > 0`; nach Bau Typ `d32`, beide Häuser warm, keins kalt wegen Leitung, `erledigt.c2`.
- `test_nr18_mehrere_haeuser_warnung_beim_abschliessen`: leeres Dorf, ein Abschnitt: 25er wie (b), beide Stationen, dazu (13|12) per Leitung und Station → `abschnittAbschliessen` ok, Hinweis nennt die 25er, Phase `bestellen`, `abschnittWarnungen()` nicht leer.

**Tester-Vorarbeit P0b** (Betreff „Tester-Vorarbeit NR19-P0b“, unmittelbar vor P6; Änderungen auf neue Erwartungen sind rot bis P6):
1. `anpassungen` „A71: … ÷ 1.800 h“ (gemessen rot): `VOLLLASTSTUNDEN` = `{ 1500, 2000 }`; statt `hauspufferEinbauen`: `stationKaufen(efh, 'hp_800')` → `hauspuffer === true`, `bedarfKw` = 15.000 ÷ 2.000, Geld − `stationspreis_eur`; Haus mit Wandstation → `stationKaufen(…, 'hp_800')` abgelehnt; Büro abgelehnt. Zeilen 1139–1141 (RH mit Puffer → 24.000 ÷ 2.000 = 12 kW, Kommentar anpassen), 1154–1155 (zu wenig Geld für `hp_800`).
2. `a88-freischalt-leiter`: `'hauspuffer'` aus `FUNKTIONEN` (:35), Stufe-3-Liste (:42), `s3` (:69); `:118` Zeile `hauspufferEinbauen` streichen; `:568–578` Knopf „Puffer einbauen“ → Hausblatt Stufe 1 zeigt Reihe „Mit Pufferspeicher“ frei.
3. `a92-sperrtexte` „H2 + H5 + Regel 4“ (:462): Puffer-Teil streichen; „H5: Stufe 3, 1.799 € …“ (:475) löschen.
4. `menue-v2` :53: `'Puffer einbauen'` aus der Musterliste.
5. `tests/ohne-leiter.ts`: Schlüssel `hauspuffer` entfernen.
6. Danach: `grep -rn "hauspufferEinbauen\|hauspuffer_eur\|'Puffer einbauen'" tests` leer, außer `a92-b2a-sperrgrenzen` (nutzt den Text nur als Beispielbeschriftung).

**Architekt-Vorarbeit:** erledigt (Fassung 2 angelegt, Fassung 3 angepasst): `tests/architektur/nr18-f2-struktur.test.ts` – F1 Spielstart an einer Stelle; F2a `schritt` nur im Kern; F2b `tipp` nie im Kern; F2c Tutorial-Dateien rechnen nicht selbst (kein Import von `netz`/`engstelle`, kein `berechneNetz`); F2d `Schritt`/`Tipp` in `tutorial-vertrag.ts` wörtlich wie 5.4, Datei nur Typen (greift, sobald die Datei existiert); F3 Stationsprüfung an einer Stelle (greift ab `stationReicht`).

### Bauplan P1 – Engstelle, Vertrag, Spielstart verschieben (mittel: reine Funktion mit vielen Randfällen)
- **Liefert `src/core/engstelle.ts`:**
  - `export interface Engstelle { felder: number[] /* y*N+x, ab Heizzentrale geordnet */; typ: TypId; last_kw: number /* am ersten Feld */; kapazitaet_kw: number /* Katalog × spreizung_faktor */; an_heizzentrale: boolean /* tiefe(erstes) === 1 */; geplant: boolean /* ein Feld-Objekt hat geplant oder ersatz */; empfohlen: TypId | null }`
  - `export function engstellenFinden(netz: Netz, kunden: Iterable<number>): Engstelle[]` – je Kunde Weg `netz.anschluss.get(id).feld` über `netz.eltern` bis −1; zu voll = `last_kw > kapazitaet_kw`; Stück = erstes zu volles Feld ab der Heizzentrale plus anschließende zu volle Felder gleichen Typs. Doppelte Stücke (gleiches erstes Feld) einmal. Sortiert nach Tiefe, dann Feldnummer. Kunden ohne Anschluss/Feld −1 übersprungen. Typ über `netz.nachId.get(netz.belegung[f])`; Großabnehmer-Felder sind keine Leitung.
  - `export function engstelleText(e: Engstelle, empfohlenAbStufe: number | null): string` – Abschnitt 6; Satz 2 nach der Reihenfolge dort (zuerst `e.empfohlen === null`, dann `empfohlenAbStufe`).
  - `export const ENGPASS_ERSATZ`, `export const WEITERE_STELLEN`.
- **Liefert `src/core/start.ts`:** `neuerSpielstand(jetzt_ms: number, ortId: string = STANDARD_ORT): Spielstand` und `ueberlappt` **wörtlich** aus `spiel.ts:35–77` verschoben (Verhalten gleich, Startnetz bleibt bis P5). `spiel.ts`: `export { neuerSpielstand } from './start';`. Importe von `start.ts`: `./katalog`, `./netz` (`groesse`), `./orte`, `./zufall`, `./typen` – nicht `./spiel`.
- **Vertrag `src/core/tutorial-vertrag.ts`:** `Schritt` und `Tipp` wörtlich aus 5.4, nur Typen. **Vertrag in `spiel.ts`:** Ereignis `| { art: 'engstelle'; felder: number[] } | { art: 'schritt'; schritt: Schritt; objekt_id?: number }` (`import type { Schritt } from './tutorial-vertrag'`); `erreichteHaeuser(): number[]` wirft `new Error('NR18-P2 noch nicht gebaut')`; `ersatzPlanen(id: number, neu: TypId): Ergebnis` und `geplanteLeitungTyp(id: number, neu: TypId): Ergebnis` werfen `new Error('NR18-P2 noch nicht gebaut')`; `abschnittWarnungen(): string[] { return []; }`. `typen.ts`: `ersatz?: { typ: TypId; nr: number }`; `gruppe` bleibt (entfernt P2). `effekte.ts`: `engstelle(felder: ReadonlyArray<readonly [number, number]>, ruhig: boolean): void {}`.
- **Tests `tests/nr18-engstelle-kern.test.ts`** (Netze mit `tests/hilfen.ts`, gerechnet mit `berechneNetz`; Katalog d25 15, d32 25, d40 40, d50 60 kW; EFH 10 kW): `test_nr18_engstelle_ab_heizzentrale` (25er-Strang, 2 EFH → last 20, kap 15, an_heizzentrale, empfohlen d32), `test_nr18_engstelle_erste_von_zwei` (32er dann 25er, beide zu voll → zwei Einträge, 32er zuerst), `test_nr18_typwechsel_trennt_stueck`, `test_nr18_doppelt_einmal`, `test_nr18_leer` (alles passt / Kunde ohne Anschluss / Feld −1), `test_nr18_spreizung` (Faktor ≠ 1), `test_nr18_geplant`, `test_nr18_text` (genaue Sätze 3 Orte × 3 Enden, darunter „Leg einen getrennten Abgang.“ bei `empfohlen === null` auch dann, wenn `empfohlenAbStufe` eine Zahl ist; `{f}` bei last 20,5 / kap 15 → 6; bei last 15,5 → 1; Erzeuger: alle gültigen Typpaare × last 1…9999 → Länge ≤ 90), dazu `test_nr13_start_verschoben`: `neuerSpielstand` aus `spiel` und aus `start` ist dieselbe Funktion, `neuerSpielstand(0)` liefert dasselbe wie vor dem Verschieben (Objektzahl, Startnetz noch vorhanden).
- **Eskalation:** ein vorhandener Test wird durch das Verschieben rot.
- **Risiko-Auslöser:** nein.

### Bauplan P2 – Kern: Rückbau, Ersatz, Warnungen, Schritt-Ereignisse (schwer: Netzregeln, Spielstand, Laufzeit)
- **Nutzt:** alles aus P1.
- **Entfernt:** Abschnitt 4 (Kern-Zeilen), `gruppe` überall.
- **Liefert** (`spiel.ts`):
  - `private probeNetz(anpassen?: (o: Objekt) => Objekt): Netz` (AE-NR18-3): alle Objekte inkl. geplanter, gebaute Leitungen mit `ersatz` als `{ ...o, typ: o.ersatz.typ }`.
  - `ersatzPlanen(id: number, neu: TypId): Ergebnis` – Regeln 5.1; ersetzt einen schon geplanten Ersatz, wenn `neu` dicker ist.
  - `geplanteLeitungTyp(id: number, neu: TypId): Ergebnis` – geplante Leitung im offenen Abschnitt bekommt neuen Typ (freigeschaltet, Grenze bleibt gleich).
  - `geplanteLeitungEntfernen(x, y)`: ohne geplantes Objekt auf dem Feld nimmt es den Ersatz der gebauten Leitung zurück. `letzteLeitungZurueck()`: das jüngste von geplanter Leitung (größte `id`) und Ersatz (größte `ersatz.nr`). `abschnittLeitungen()` zählt Ersatz mit. `abschnittVerwerfen()` löscht alle `ersatz`.
  - `ersatz_eur(): number` = Σ (Neupreis − 50 % Altpreis (E1)) + Spülbohrung je Flussfeld; in `abschnittKosten_eur()` addiert.
  - `stationKaufen`: Warnung nach AE-NR18-1/5.1, `Ergebnis.hinweis` = Text. Größere Station für ein Haus mit Station prüft nicht. In Phase `bestellen` zusätzlich `warnlisteFuellen(nachher)` (W4).
  - `entfernen(id)` (Leitung): mit `ersatz` in Phase `bau` abgelehnt (Text 6); sonst wie heute, Ersatz verfällt; in Phase `bestellen` danach `warnlisteFuellen(probeNetz())` (W5, W4).
  - `erreichteHaeuser(): number[]` und `haus_erreicht`/`haus_getrennt` nach 5.4.
  - `abschnittAbschliessen`: Warnliste + Hinweis + Ereignis; `abschnittWarnungen(): string[]`. Die Liste füllen `abschnittAbschliessen` und der Konstruktor (Phase `bestellen` nach dem Laden); `abschnittWiederOeffnen`, `abschnittVerwerfen`, `materialBestellen` und Bauende leeren sie.
  - Bauende (`spiel.ts:1058`): Ersatz anwenden, `_pop`; danach `neuBerechnen`. Leitungsgrenze: Ersatz zählt nicht als neue Leitung.
- `speichern.ts` (nach `gueltig`): `gruppe` an allen Objekten löschen; `ersatz` löschen, wenn Objekt keine gebaute Leitung, `ersatz.typ` keine Leitung oder nicht dicker, `nr` keine Zahl. Version bleibt 3.
- `tools/a91-laufzeit.messung.ts`: M4/M5 raus; neu M10 eine geplante Leitung `platzieren` inkl. `erreichtAbgleichen` im Extremnetz (Aufbau M3) ≤ 4 ms; neu M7 `stationKaufen` mit Warnprüfung im vollen alten Startdorf (Aufbau M1) ≤ 4 ms; M8 dasselbe im Extremnetz (Aufbau M3) ≤ 12 ms; M9 `abschnittAbschliessen` im Extremnetz ≤ 8 ms. M1–M3, M6 unverändert. Bezug: NR17-Messung M1 0,53 ms, M3 1,82 ms je Netzrechnung (aus dem NR17-Plan gelesen, nicht neu gemessen).
- **Nicht mehr in P2:** `auftraege.ts` (geht an P5).
- **Neu: Schritt-Ereignisse** an den Stellen aus 5.4, jeweils nach Erfolg. `haus_warm` in `neuBerechnen`: vorher `this.netz?.warm` merken; ist es `undefined` (erste Rechnung im Konstruktor), nichts melden; sonst je Id in neu-warm und nicht alt-warm ein Ereignis.
- **Tests** `tests/nr18-kern.test.ts`: `test_nr18_station_warnt_ohne_sperre` (Geld weg, `ohne_station` weg, Hinweis = `engstelleText`, Ereignis), `test_nr18_station_mit_geplanter_leitung` (nur eingezeichnete Leitung → Warnung schon jetzt; auch Variante „Leitung läuft am Haus vorbei“), `test_nr18_station_ohne_leitung` (keine Leitung am Haus → gekauft, keine Warnung, kein Fehler), `test_nr18_station_alte_kalte_nicht_genannt`, `test_nr18_station_ersatztext` (`vi.mock` `engstellenFinden → []` bei echter Überlast → `ENGPASS_ERSATZ`), `test_nr18_waermemangel_warnt_nicht`, `test_nr18_ersatz_regeln` (nicht offen / dünner / gleich / gesperrt / geplant → abgelehnt; dicker → `ersatz` gesetzt, Typ und Live-Netz unverändert), `test_nr18_ersatz_kosten` (E1, Flussfeld mit Bohrung, keine Gestattung), `test_nr18_ersatz_zurueck_radierer_verwerfen`, `test_nr18_ersatz_bauende` (Typ neu, Vorsehung bleibt, warme Häuser bleiben während der Bauzeit warm), `test_nr18_ersatz_in_probe`, `test_nr18_abschliessen_warnliste` (Liste, Hinweis, „Weitere …“ bei 2 Stellen, Leeren bei Wieder-öffnen/Verwerfen/Bestellen; **W4:** leeres Dorf, 25er wie Abnahme (b) ohne Stationen abschließen → Liste leer; dann in Phase `bestellen` zwei Wandstationen an (9|13), (12|14) → nach der zweiten nennt `abschnittWarnungen()` die 25er; dann geplante Leitung (11|14) per `entfernen` → (12|14) getrennt, Liste wieder leer), `test_nr18_ersatz_entfernen` (W5: Phase `bau` → abgelehnt mit Text 6, Geld/Leitung/Ersatz unverändert, nach Bauende neuer Typ; Phase `offen` und `bestellen` → Leitung weg, Ersatz weg, Rückkauf 50 % des alten Typs, `abschnittKosten_eur()` ohne den Ersatz), `test_nr18_keine_wegsuche` (`'hausanschlussPlanen' in s === false`, `'leitungTauschen' in s === false`).
  `tests/nr18-spielstand.test.ts`: alter Stand mit offenem Abschnitt und geplanten Leitungen mit `gruppe` → lädt, `gruppe` weg, „Zurück“ nimmt nur ein Feld; Stand in Phase `bestellen` → `abschnittWarnungen()` nach dem Laden gefüllt; kaputtes `ersatz` (Typ `hz`, an geplanter Leitung, `nr` Text) → entfernt, Stand gültig.
  Aufbau über `tests/hilfen.ts` (`dorf`, `neu`) oder `altesStartdorf`, **nicht** über die Erwartung „neues Spiel hat ein Startnetz“ (P5 läuft parallel). Neu `tests/nr13-schritte.test.ts`: `test_nr13_schritt_je_handlung` (jede der zehn Arten genau nach ihrer Handlung, `objekt_id` bei Leitung/Station/Haus), `test_nr13_erreicht_und_getrennt` (Abschnitt offen, Leitung Feld für Feld von (10|11) nach Süden: bei (10|13) genau ein `haus_erreicht` für (9|13), bei (11|14) eins für (12|14); `erreichteHaeuser()` enthält beide; „Zurück“ auf (11|14) → genau ein `haus_getrennt` für (12|14); Radierer auf (10|12) → `haus_getrennt` für (9|13); kein Ereignis beim ersten Abgleich nach dem Laden; Haus ohne Station zählt als erreicht), `test_nr13_erreicht_gleich_probe` (für 20 Zufallsnetze aus `tests/hilfen/a91-netze.ts`: `erreichteHaeuser()` = Häuser/Großabnehmer mit Eintrag in `berechneNetz(alle Objekte inkl. geplanter).anschluss`), `test_nr13_kein_schritt_bei_ablehnung` (Leitung ohne offenen Abschnitt, Station ohne Geld, Entfernen mit Ersatz in Phase `bau` → kein `haus_getrennt`), `test_nr13_haus_warm_nicht_beim_laden` (Konstruktor auf `altesStartdorf` → kein `haus_warm`; danach Bau → genau ein `haus_warm`).
- **Eskalation:** ein Test außerhalb der P0-Liste wird rot; M2 oder eine neue Zeitgrenze reißt.
- **Risiko-Auslöser:** ja, eingeschränkt – Spielstand ist Eingabe von außen; Prüfung an der Grenze in `speichern.ts`.

### Bauplan P3 – Oberfläche (mittel: viele Zustände, Sperrtexte-Regeln aus B2b)
- **Nutzt:** `ersatzPlanen`, `geplanteLeitungTyp`, `abschnittWarnungen`, Ereignis `engstelle`, `effekte.engstelle` (P1-Vertrag; Tests ersetzen Kern-Methoden per `vi.spyOn`).
- `leitungsKnoepfe` (Ergänzung Review 06.11.): Ersetzen-Knöpfe **nur für dickere, freigeschaltete** Leitungen, nur im offenen Abschnitt (Tests a88-review-p2-luecken, a88-freischalt-leiter).
- `kontext.ts` `anschlussWeg`: Knopf „Hausanschluss ziehen“ weg; Reihe = „Hausanschluss geplant“ (gesperrt) wenn `hausanschlussGeplant`, sonst „Leitung selbst legen“. Leitungskarte (gebaute Leitung): im offenen Abschnitt `leitungsKnoepfe` mit `Ersetzen: {Name}` (Gold, `unter` = Nettopreis nach E1) bzw. bei geplantem Ersatz Satz + „Ersatz zurücknehmen“; außerhalb ein Knopf „Dickere Leitung“ mit Sperre wie `abschnittSperre`/Kurzform 12.21.
- `ui/katalog.ts` (Baumenü, Phase `bestellen`): Kasten „Nach dem Bau zu dünn“ mit `abschnittWarnungen()`, nur wenn nicht leer.
- `sperrtexte.ts`: Sperre „Dickere Leitung“ (Grund/Kurzform aus den vorhandenen Abschnitt-Sperren, nichts Neues erfinden).
- `steuerung.ts` `stempelnBei` (`:424`): belegtes Feld → gebaute Leitung: `ersatzPlanen` nur, wenn Stempeltyp dicker; geplante Leitung anderen Typs: `geplanteLeitungTyp`; sonst still weiter. Hinweis nur beim ersten Feld einer Geste. `ereignisse()`: Zweig `engstelle` → `effekte.engstelle(felder → [f % N, ⌊f / N⌋], ruhig)`, auch bei `ruhig`. Ereignis `schritt` bekommt **keinen** Zweig (wird still übergangen, NR13 hängt sich später ein).
- **Tests** `tests/nr18-oberflaeche.test.ts` (echtes Blatt, `tests/hilfen/echte-steuerung.ts`, Aufbau auf `altesStartdorf` oder eigenem Dorf): `test_nr18_hausblatt_knoepfe` (je Phase), `test_nr18_leitungskarte_ersetzen` (offen/zu, Gold, Preis, gesperrt mit Grund ≤ 90, Ersatz zurücknehmen), `test_nr18_ueberzeichnen` (dicker über gebaut → Ersatz; dünner → nichts, keine Meldung; über geplant → Typ neu), `test_nr18_baumenue_warnliste`, `test_nr18_ereignis_markiert` (auch bei „Weniger Bewegung“).
- **Eskalation:** ein a92-/nr12-Test außerhalb der P0-Liste wird rot.
- **Risiko-Auslöser:** nein. Designer-Fotoprüfung: Hausblatt, Leitungskarte offen/zu/mit Ersatz, Baumenü mit Warnliste, Markierung neben offenem Blatt.

### Bauplan P4 – Darstellung (mittel)
- `effekte.ts`: `engstelle(...)` mit Markierung 5.1, `ENGSTELLE_DAUER_S = 6`, `aktiv()` zählt mit. `szene.ts`: gebaute Leitung mit `ersatz` zusätzlich im Stil „geplant“ zeichnen (Designer bestätigt).
- **Tests** `tests/nr18-darstellung.test.ts` (Maler-Attrappe wie `tests/nr12-*`): Markierung aktiv 6 s, ruhig ohne Puls; Ersatz-Leitung im Befehlsstrom; NR12-Taktgrenzen bleiben grün.
- **Eskalation:** NR12-Takt- oder Schlüssel-Test rot.
- **Risiko-Auslöser:** nein.

### Bauplan P5 – Neuer Spielstart (einfach: zwei Zeilen weg, Texte, aber Wirkung auf 128 Tests – Vorarbeit P0 trägt sie)
- **Dateien:** `src/core/start.ts` (Startnetz-Zeilen und `starthaeuser` weg, alle Häuser `ohne_station: true`, Kessel vorgewählt nach 5.2, Kommentar A29/A59/A67/A74 → NR13), `src/core/auftraege.ts` (c1, c2 ≥ 2, h3-Text nach 5.3), neu `tests/nr13-start.test.ts`.
- **Liefert:** `export const ERSTE_HAEUSER: ReadonlyArray<readonly [number, number]> = [[9, 13], [12, 14]]` in `start.ts` (5.2).
- **Tests:** `test_nr13_start_ohne_leitung_und_station` (keine Leitung, kein Objekt mit `station`, jedes Haus `ohne_station`; `netz.warm.size === 0`; Geld 30.000, Taler, Preisstufe wie vorher); `test_nr13_start_mit_kessel` (ohne `ersteQuelleWaehlen`: `quelle_gewaehlt === true`, `innen` = genau ein `kessel` Stufe 1 ohne Bau, `netz.verfuegbar_kw === KATALOG.kessel.leistung_kw[0]` (60), Geld unverändert 30.000; danach `ersteQuelleWaehlen('kessel')` → weiter genau ein Kessel); `test_nr13_erste_haeuser` (`ERSTE_HAEUSER` = `[[9, 13], [12, 14]]`, beide Felder sind `efh` ohne Station; eine Leitung (10|10)…(10|14), (11|14) erreicht beide, (13|12) nicht – über `erreichteHaeuser()` erst nach P2, deshalb hier über `berechneNetz(...).anschluss`); `test_nr13_alter_stand_behaelt_netz` (Stand aus `altesStartdorf` → `serialisieren` → `ladenMitBefund` → Leitungen, Vorsehung, Stationen gleich, beide Häuser warm); `test_nr13_auftraege` (c1 beim Start offen, c1 nach einem warmen Haus, c2 nach zwei; Texte enthalten keine „Starthäuser“); `test_nr13_geld_reicht` (leeres Dorf: zwei nächste Häuser per 25er und Wandstation anschließen und bauen → Geld ≥ 0, Restgeld im Test-Namen-Kommentar festhalten, Messwert in den Bericht).
- **Randfälle:** Deko-Zufall unverändert (Probe: Deko-Positionen gleich wie vor P5); `naechste_id` passt zur Objektzahl; kaputter Spielstand → `laden` liefert neues Spiel mit Kessel.
- **Eskalation:** mehr als die bewusst roten Tests aus P0 Teil B werden rot (dann fehlt etwas in P0); Restgeld nach zwei Häusern unter 5.000 €.
- **Risiko-Auslöser:** nein (keine Umwandlung alter Stände).

### Bauplan P6 – NR19 Puffer-Übergabestation (mittel: Fachregel mit zwei Leistungen, Spielstand, Oberfläche)
- **Ergänzungen 06.11. (Kritiker P0b, Projektleiter):** Hausblatt Wandreihe wie heute (bis 3 Knöpfe), Puffer-Reihe höchstens 2. Stationspreise ohne kosten_faktor. In `tests/nr19-puffer-oberflaeche.test.ts` zusätzlich: Erklärzeile „Ohne Puffer: …“ nur bei der Stationswahl; Puffer-Knopf mit zu wenig Geld (Preis, kein Schloss, Fehlbetrag). Nach P6 die verdeckte Abnahme `tests/abnahme/nr19-abnahme.test.ts.verdeckt` aktivieren (Projektleiter). Die 5 P0b-Roten müssen genau mit P6 grün werden.
- **Nutzt:** `stationKaufen` mit NR18-Warnung (P2), Hausblatt nach P3, `bedarfKw`.
- **Liefert:** Abschnitt 5.5 – `VOLLLASTSTUNDEN`, `PufferStation`, `PUFFER_STATIONEN`, `istPufferStation`, `passendePufferStation(netz_kw: number, spitze_kw: number): PufferStation | null`, erweitertes `stationHolen`, `stationReicht(st: Station, o: Objekt): boolean`; `stationKaufen`-Regeln; Reparatur in `speichern.ts`; Merkmal `hauspuffer` weg; Hausblatt.
- **Tests** `tests/nr19-puffer-kern.test.ts`: `test_nr19_volllaststunden` (1.500 / 2.000); `test_nr19_katalog` (drei Puffer-Stationen mit den Werten der Tabelle, Namen beginnen mit „Puffer-Übergabestation“, Preis = Station + 3.570, `STATIONEN` unverändert, kein Firmenname, Beschreibung ≤ 90); `test_nr19_katalog_plausibel` (Fachprüfung F2): (a) jede Puffer-Station `spitze_kw > leistung_kw`; (b) für die sechs Zeilen der Probe-Tabelle 5.5 (vom Fachprüfer nachgerechnet) wählt `passendePufferStation(bedarfKw mit Puffer, bedarfKw ohne Puffer)` genau die dort genannte Station: EFH → `hp_800`, RH → `hp_800`, Bäckerei → `hp_1000`, MFH → `up_1000`, EFH ×2,1 → `hp_1000`, MFH ×2,1 → `null`; (c) `{f}` aus `engstelleText` ist für last − kap in (0; 0,001], 0,5, 4,2, 1000 immer ≥ 1 und ganzzahlig; `test_nr19_puffer_kaufen` (EFH ohne Station + `hp_800` → `hauspuffer`, `bedarfKw` 7,5, Netz warm); `test_nr19_wand_kaufen` (EFH + `st_15` → kein `hauspuffer`, 10 kW); `test_nr19_kein_nachruesten` (Haus mit Wandstation → `hp_800` abgelehnt mit Satz 5.5, Geld unverändert); `test_nr19_altstand_puffer_bleibt` (Haus `hauspuffer` + `st_15` → lädt, bleibt, 7,5 kW, darf `hp_1000` kaufen); `test_nr19_spitze` (Bäckerei: `hp_800` abgelehnt – 15 kW Netz > 14; EFH ×2,1: `hp_800` abgelehnt, `hp_1000` ok; Haus mit `hp_800` nach Aufstockung über 19 kW Spitze → kalt „station“); `test_nr19_grossabnehmer_ohne_puffer`; `test_nr19_ohne_stationstypen` (genau zwei erlaubte Ids: kleinste Wand + kleinste Puffer); `test_nr19_zwei_efh_an_25er` (zwei EFH mit `hp_800` an einer 25er: 7,5 + 7,5 = 15 kW ≤ 15 → keine Warnung, beide warm; mit Wandstationen 20 kW → Warnung – Grenzfall genau 15,0, exakt darstellbar); `test_nr19_spielstand_reparatur`; `test_nr19_kein_hauspufferEinbauen` (`'hauspufferEinbauen' in s === false`, Merkmal weg); **`test_nr19_tutorial_reihenfolge`** (Zusammenspiel, Kritik F2 Pflichtfrage 4; Ablauf wie DESIGN 13.5): `new Spiel(neuerSpielstand(T0), uhr)` ohne `ersteQuelleWaehlen`, `abschnittPlanen()`, Uhr bis `offen`; 25er per `platzieren` auf (10|10)…(10|14), (11|14) → beide `ERSTE_HAEUSER` in `erreichteHaeuser()`; `abschnittAbschliessen()` → `ok`, kein `hinweis`, `abschnittWarnungen()` leer; in Phase `bestellen` `stationKaufen(haus1, 'hp_800')` und `stationKaufen(haus2, 'hp_800')` → beide ohne `hinweis`, kein Ereignis `engstelle`, Liste leer (2 × 7,5 = 15,0 kW ≤ 15 kW); `materialBestellen()`, Uhr bis Bauende → beide Häuser in `netz.warm`, keins in `netz.kalt`, in der ganzen Folge kein `engstelle`-Ereignis; Restgeld genau **14.460 €** (30.000 − 2.000 Planung − 6 × 400 Leitung − 2 × 5.570 Station; unabhängig nachgerechnet von Kritiker und Fachprüfer F2) – weicht die Planungsgebühr im Code ab, stoppen und melden statt die Zahl anzupassen.
  `tests/nr19-puffer-oberflaeche.test.ts`: zwei Reihen, Empfehlung Gold, Großabnehmer nur Wand, Haus mit Wandstation ohne Puffer-Reihe, Texte [F] wörtlich, Zeile „Übergabestation“, kein Kasten „Pufferspeicher im Haus“, `anfrageKasten`-Chip über `stationReicht`.
- **Randfälle:** Interessenten-Nachlass gilt auch für Puffer-Stationen; Tausch Puffer → größere Puffer-Station mit 50 % Rückkauf; MFH ×2,1 ohne passende Puffer-Station → nur Wandreihe.
- **Eskalation:** ein Test außerhalb von P0b wird rot; Tabellenwerte widersprechen dem Fachprüfer; Hausblatt passt auf 844×390 nicht ohne Scrollen in die Seitenfläche (Designer fragen).
- **Risiko-Auslöser:** ja, eingeschränkt – Spielstand-Reparatur an der Grenze (`speichern.ts`).

## 8. Prüf-Schwerpunkt
1. Zwei EFH mit Puffer an einer 25er: genau 15,0 kW gegen 15 kW – darf **nicht** warnen; mit Wandstation 20 kW – muss warnen (P6 `test_nr19_zwei_efh_an_25er`).
2. Neues Spiel, Spieler kauft Station, bevor eine Leitung liegt → Station gekauft, Haus bleibt „heizt mit Öl“, kein Absturz, keine Warnung (P2, in `test_nr18_station_*` ergänzen).
3. Alter Spielstand mit Startnetz, `gruppe`-Resten und Haus „Puffer + Wandstation“ lädt ohne Verlust (P2 `nr18-spielstand`, P6 `test_nr19_altstand_puffer_bleibt`).
4. Aufstockung macht eine Puffer-Station zu klein (Spitze) → Haus kalt „Station zu klein“, Hausblatt bietet größere Station an (P6 `test_nr19_spitze`).
5. Wischen mit dünner Leitung über dicke Hauptleitung → nichts passiert, keine Meldungsflut; ebenso keine Flut von `schritt`-Toasts (P3, P2 `test_nr13_schritt_je_handlung`).

## 9. Fragen an Simon (Fachentscheidungen) – **entschieden 2026-11-06**
**Simon hat E1–E6 alle wie empfohlen beantwortet (jeweils Variante a).** Der Plan ist darauf gebaut; es bleibt keine offene Frage. Wortlaut der Fragen unten zur Nachvollziehbarkeit unverändert.
**Tutorial-Fragen (DESIGN 13, für NR13) ebenfalls entschieden (Simon 2026-11-06):** Wandstation im Tutorial gesperrt, frei ab dem 3. Haus (T-F2); „Ohne Tutorial starten“ nur mit Vorführ-Tempo; „Abgleich“ nicht im ersten Tutorial (T-F4). Folge für diesen Plan: keine – die Wandstation bleibt im Kern und im Hausblatt (P6) normal wählbar; Sperre im Tutorial und Freigabe ab dem 3. Haus baut NR13 (Oberfläche liest dazu Kern-Abfragen, AE-NR13-2).
Keine neue Fachfrage in Fassung 3 – der vorgewählte Kessel ist eine vorläufige Entscheidung des Projektleiters (Simon kann umentscheiden); die Rechercheaufträge des Fachprüfers (Volllaststunden mit Puffer, Gestattung bei Erneuerung) stehen auf der Sammelliste.
- **E1 Rückkauf beim Ersetzen (A30):** (a) **empfohlen:** 50 % des alten Leitungspreises werden mit der Materialbestellung gutgeschrieben – deine A30-Regel; (b) kein Rückkauf – ehrlicher (alte Leitung bleibt im Boden), Ersetzen wird teurer.
- **E2 Alte Leitung bis Bauende:** (a) **empfohlen:** Die alte Leitung liefert weiter, bis der Abschnitt gebaut ist (Spielvereinfachung); (b) Häuser am Stück sind während der Bauzeit kalt.
- **E3 Entfällt auch die Hauptleitung am Start?** (a) **empfohlen:** ja, das Dorf startet ganz ohne Leitung – das Tutorial zeigt das Ziehen ab der Heizzentrale, und „reicht die Leitung für zwei Häuser?“ wird gleich die erste Lernfrage; (b) die 40er in der Straße bleibt, nur die Hausanschlüsse fehlen – kürzerer Einstieg, aber das Tutorial zeigt dann nur zwei Felder Leitung. Der Plan ist auf (a) gebaut; (b) hieße in P5 die 40er-Zeile behalten.
- **E4 Startgeld:** Bisher gab es ca. 9.200 € Netz und Stationen geschenkt. Zwei Häuser selbst anschließen kostet ca. 9.200 € (Wandstation) bzw. 15.500 € (Puffer). (a) **empfohlen:** 30.000 € bleiben – es bleiben 14.500–20.800 €, P5 misst nach; (b) 35.000 €, damit der Spieler nach dem Tutorial mehr Spielraum hat.
- **E5 Muss der Puffer die Spitze des Hauses schaffen?** (a) **empfohlen:** ja – eine Puffer-Station passt nur, wenn ihre Netz-Ladeleistung die Anschlussleistung (2.000 h) **und** ihre Spitze die Hausspitze (1.500 h) schafft; so zählen beide Herstellerwerte und die Bäckerei braucht den größeren Speicher; (b) nur die Netz-Ladeleistung zählt, die Spitze steht nur zur Info da – einfacher, aber dann wäre die getrennte Spitzenangabe ohne Wirkung.
- **E6 Preise der Wandstationen:** (a) **empfohlen:** bleiben (2.400 / 3.600 / 4.800 / 7.000 / 9.000 €, bisherige Spielwerte); (b) an Adelsdorf angleichen (2.000 / 3.000 / 4.000 € bis 50 kW) – passt zur Puffer-Herleitung, verschiebt aber das Gleichgewicht und mehrere Tests.

## 10. Zurückgestellt
- „Leitung selbst legen“ stempelt weiter die 25er (Simon: Nachdenken gehört zum Spiel).
- Hinweis beim Stationskauf ohne jede Leitung am Haus; „Ganzes Stück ersetzen“ in einem Zug.
- `anfrageAnnehmen` und `vertragUnterschreiben` erhöhen die Last ohne Engstellen-Warnung.
- ÜP 800 (gleiche Netz-Ladeleistung wie ÜP 1000, im Spiel ohne Unterschied) und HP 600; Puffer-Stationen für Großabnehmer (Übergabestation Typ 100–500 ohne Puffer).
- Tutorial-Ablauf (DESIGN 13), Tutorial-Zustand im Spielstand, Tutorial-Zeiten, `{leitung}` aus T12, Aussenden von `tipp`, `tutorialStand()`, Bediensperren – NR13 auf Grundlage von 5.4.
- Wahl der Wärmequelle beim Start (heute: Kessel vorgewählt, vorläufig).
- Spitzen-Prüfung der Puffer-Station greift mit heutigen Zahlen nie (Verhältnis 1,35 gegen 1,33, Fachprüfung F2); bleibt als Schutz, der Spitzen-Satz ist nur künstlich testbar; sichtbar wird die Spitze über die Hausblatt-Zeile „… kW Netz, … kW im Haus“.
- `docs/ARCHITEKTUR.md` gibt es im Projekt nicht; die Festlegungen stehen in diesem Bauplan (Bitte an den Projektleiter: nach Welle 1 die AE-Regeln dorthin übernehmen lassen).
