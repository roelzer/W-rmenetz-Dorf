# Bauplan NR18 – Kein automatischer Hausanschluss, Warnung statt Sperre, dickere Leitung nur im Bauabschnitt

Stand 2026-11-06, Architekt, Fassung 1. Grundlage: Lastenheft NR18, ENTSCHEIDUNGEN 2026-11-06 (drei Einträge), Bauplan NR17 (geht hierin auf).
**Basis: B2b komplett auf dem Hauptstand** (Branch-Kette `nr16-b2b-final` 40a83f8 → … → `nr16-b2b-nach` d32123a, enthält Fix 1). Alle Zeilenangaben beziehen sich auf d32123a. Noch nicht vom Kritiker geprüft.

## 1. Ziel und Abnahme (Vorschlag Lastenheft-Zeile, Tests mit „NR18“ im Namen)
1. **Kein Knopf „Hausanschluss ziehen“** mehr, keine automatische Wegsuche im Kern. Der Spieler zeichnet die Leitung im Bauabschnitt selbst bis ans Haus und kauft die Übergabestation.
2. **Warnung, keine Sperre**: Wird eine Leitung durch den Stationskauf oder durch den Bauabschnitt zu dünn, sagt das Spiel welches Stück und wie viele kW fehlen, und markiert das Stück auf der Karte. Gekauft bzw. gebaut wird trotzdem.
3. **Dickere Leitung nur im Bauabschnitt**: Im offenen Abschnitt eine dickere Leitung über eine gebaute zeichnen (oder Knopf „Ersetzen“ in der Leitungskarte) plant den Ersatz. Bezahlt wird mit der Materialbestellung, getauscht wird beim Bauende. Der Sofort-Tausch außerhalb eines Abschnitts (`leitungTauschen`) entfällt.
4. Abnahme: (a) neues Spiel, Hausblatt ohne „Hausanschluss ziehen“; (b) Leitung zu (13|12) gezeichnet + Station gekauft + Bauzeit → Haus warm, Auftrag c2 erledigt; (c) zu dünne Leitung → Warnung mit Stück und fehlenden kW, Haus nach dem Bau kalt wegen Leitung; (d) im nächsten Abschnitt dickere Leitung darüber gezeichnet → nach dem Bau warm.

## 2. Bestand (gelesen, Datei:Zeile auf d32123a)
- Automatische Wegsuche: `spiel.ts:649–778` (`feldKosten_eur`, `hausanschlussPlanen`: Dijkstra, Probe-Netz, A89/A91-Prüfung, Rückfall, `gruppe`).
- `gruppe`: `typen.ts:39–40`, `spiel.ts:485` (Zurück nimmt Gruppe als Ganzes), `spiel.ts:1051` (Bauende löscht `gruppe`).
- Sofort-Tausch: `spiel.ts:862–875` `leitungTauschen` (A30, 50 % Rückkauf). Knöpfe `kontext.ts:382` „Tauschen: …“.
- Hausblatt: `kontext.ts:216–229` `anschlussWeg` (Knöpfe „Hausanschluss ziehen“ / „Hausanschluss geplant“ / „Leitung selbst legen“), `sperrtexte.ts:67` `ANSCHLUSS_GEPLANT`.
- Stationskauf: `spiel.ts:510–527`, prüft keine Leitungslast (Befund NR15-P3, NR17).
- Netzrechnung „wie nach dem Bau“: `berechneNetz` mit allen Objekten (geplant zählt wie gebaut), heute nur in der Wegsuche (`spiel.ts:687`). Live-Netz ohne geplante: `spiel.ts:238`.
- Zeichnen: `steuerung.ts:397–428` `stempelnBei`; belegte Felder werden übersprungen (`:424`).
- Wiederverwendbar aus NR17: Engstellen-Ermittlung über `netz.eltern`, Texte, Markierung (Ereignis statt Grafik), Architekturtest.
- Tutorial NR13 ist noch nicht gebaut (kein Code). Auftrag c2 (`auftraege.ts:14`) sagt heute „lass mit Philipp einen Bauabschnitt planen, der die Leitung dorthin legt“ – klingt nach automatischem Anschluss.

**Prototyp (getestet, Wegwerf-Kopie im Scratchpad, nicht im Projekt):** B2b-Stand d32123a, `npx vitest run tests` → 1017 passed. Danach Wegsuche, `hausanschlussGeplant`-Knopf „ziehen“, `gruppe`, `leitungTauschen` entfernt, Ersatz und Warnung beim Stationskauf/Abschließen grob eingebaut, Überzeichnen in `stempelnBei` → **49 failed / 968 passed** in 15 Dateien (Liste in Abschnitt 7). Kein Test scheiterte an der neuen Warnmeldung oder am Überzeichnen; alle Fehler hängen an entfernter Wegsuche, entferntem Tausch oder entferntem Knopf. `tsc` zusätzlich: `tools/a91-laufzeit.messung.ts` (5 Stellen) nutzt `hausanschlussPlanen`.

## 3. Festlegungen
**AE-NR18-1 Warnen entscheidet nichts.** Bindet `stationKaufen`, `abschnittAbschliessen`. Verhindert, dass eine Sperre (NR17-Variante A) zurückkommt. Regel: Beide Aktionen laufen wie heute; die Prüfung kommt **nach** der Aktion und ändert weder Geld noch Spielstand. Ergebnis `{ ok: true, hinweis?: string }`.

**AE-NR18-2 Ein Ort für die Engstelle** [aus AE-A93-2]. `engstellenFinden`, `engstelleText`, `ENGPASS_ERSATZ`, Typ `Engstelle` nur in `src/core/engstelle.ts` (rein, importiert nur `./katalog`, `./typen`). Aufgerufen nur in `spiel.ts`. Architekturtest R1–R3.

**AE-NR18-3 Eine Probe-Rechnung.** Jede Rechnung „wie nach dem Bau“ läuft durch `private probeNetz(anpassen?: (o: Objekt) => Objekt): Netz` in `spiel.ts`: alle Objekte inkl. geplanter Leitungen, gebaute Leitungen mit `ersatz` als `{ ...o, typ: o.ersatz.typ }`. Verhindert, dass eine Warnung den geplanten Ersatz vergisst. Regel: `berechneNetz(` steht in `spiel.ts` höchstens zweimal (`neuBerechnen`, `probeNetz`) – Architekturtest R4, gilt schon heute.

**AE-NR18-4 Ersatz ist ein Feld an der gebauten Leitung, kein zweites Objekt.** `Objekt.ersatz?: { typ: TypId; nr: number }`. `nr` = `stand.naechste_id++` beim Planen (Reihenfolge für „Zurück“). Verhindert zwei Objekte auf einem Feld (Belegungskarte, Anbohrung, Antippen, Zeichnen würden sonst das falsche Objekt finden). Live-Netz rechnet bis zum Bauende mit dem alten Typ (E2).

**AE-NR18-5 Warnliste des Abschnitts nur im Spiel-Objekt, nie im Spielstand.** `abschnittAbschliessen` und der Konstruktor (Phase `bestellen` nach dem Laden) berechnen sie einmal; `abschnittWiederOeffnen`, `abschnittVerwerfen`, `materialBestellen` und Bauende leeren sie. Die Oberfläche liest nur `abschnittWarnungen()`; kein Netz je Blatt-Aufbau (das Blatt baut sich alle 250 ms neu).

**AE-NR18-6 Ereignis statt Grafik** [aus AE-A93-4]. Kern meldet `{ art: 'engstelle'; felder: number[] }`. Darstellung markiert; bei „Weniger Bewegung“ ohne Puls, aber nicht weggelassen.

## 4. Was wegfällt
| Was | Wo | Paket |
|---|---|---|
| `hausanschlussPlanen`, `feldKosten_eur`, `BIEGUNG_EUR`, A89/A91-Wegprüfung, Rückfall, Meldungen „Hausanschluss geplant: N Felder“, „Kein Weg gefunden, bei dem alle Häuser warm bleiben“, „Kein Weg zu einer Leitung gefunden“, „Das Haus liegt schon an einer Leitung“, „Zu viele Leitungen für diese Heizzentralen-Stufe“ (nur Wegsuche) | `spiel.ts:649–778` | P2 |
| `gruppe` (Typ, Schreiben, Zurück als Gruppe, Löschen bei Bauende) | `typen.ts:39–40`, `spiel.ts:485`, `:1051` | P1 (Typ), P2 |
| `leitungTauschen` (Sofort-Tausch) | `spiel.ts:862–875` | P2 |
| Knopf „Hausanschluss ziehen“ samt `unter: 'zur nächsten Leitung'` | `kontext.ts:225` | P3 |
| Knöpfe „Tauschen: …“ außerhalb des Abschnitts | `kontext.ts:382` | P3 |
| Messungen M4/M5 (Hausanschluss im Extremnetz) | `tools/a91-laufzeit.messung.ts` | P2 |

**Bleibt:** „Leitung selbst legen“ (Simons Wortlaut „selbst ziehen“, spart Testumbau), „Hausanschluss geplant“ (gesperrt, `ANSCHLUSS_GEPLANT`) – der Text stimmt auch für eine selbst gezeichnete Leitung. `abschnittAnschluesse`/`hausanschlussGeplant` bleiben (Zählung im Baumenü, Knopf „geplant“), Kommentar `spiel.ts:507` anpassen. Automatisches Abzweig-Zeichnen (A47 „läuft gerade durch, verbindet sich“, A65) bleibt; Erklärsätze `HAUSANSCHLUSS_KURZ`, T-Stück-Hinweis bleiben richtig. Anbohrungskosten (A69) bleiben, nur „Wegsuche bevorzugt Vorsehungen“ entfällt.

**Lastenheft-Anpassung (Projektleiter, beim Merge von P2):** A47 Abnahme ohne „Hausanschluss ziehen plant …“; A69 ohne „der automatische Hausanschluss rechnet die Anbohrung ein und bevorzugt Vorsehungen“; A89 „entfallen durch NR18“; A92 Abnahme „erste Häuser über selbst gezeichnete Leitung anschließbar“; A30 „Tausch nur im Bauabschnitt, bezahlt mit der Materialbestellung“ (nach E1); NR17 „aufgegangen in NR18“.

## 5. Was neu kommt
- **Warnung beim Stationskauf** (nur wenn das Haus vorher `ohne_station` war): `vorher = probeNetz(Haus als ohne_station)`, `nachher = probeNetz()`. `neu` = Kunden mit `kalt === 'leitung'` in `nachher`, die es in `vorher` nicht waren. Ist `neu` nicht leer: Engstellen über `engstellenFinden(nachher, neu)`; Text der ersten, sonst `ENGPASS_ERSATZ`; Ereignisse `hinweis` + `engstelle` (Felder aller gefundenen Stücke). Rechnet mit geplanten Leitungen und geplantem Ersatz – Station kaufen, solange die Leitung nur eingezeichnet ist, warnt also schon richtig.
- **Warnung beim Abschluss des Bauabschnitts:** nach `phase = 'bestellen'`: `nachher = probeNetz()`, alle Kunden mit `kalt === 'leitung'` → Warnliste (AE-NR18-5). Hinweis = erster Text; bei mehr als einem Stück dazu „Weitere zu dünne Stellen stehen im Baumenü.“; Ereignis `engstelle` mit allen Feldern. Baumenü (Phase `bestellen`) listet alle Texte über der Bestell-Schaltfläche.
- **Engstellen-Anzeige:** Rauten-Umriss je Feld, Warnrot `#d8392f`, Linie 3 px, 6 s, Puls 1,5 Hz, bei „Weniger Bewegung“ fest; eine neue Markierung ersetzt die alte (wie NR17, Designer bestätigt in der Fotoprüfung).
- **Upgrade-Weg (Ersatz):** `ersatzPlanen(id, neu)`: nur gebaute Leitung, Abschnitt `offen`, `neu` dicker (`kapazitaet_kw` größer) und freigeschaltet (`gesperrt(neu)`), sonst Ablehnung mit Hinweis. Überzeichnen in der Zeichenleiste ruft es für gebaute Felder auf; über eine **geplante** Leitung zeichnen setzt einfach deren `typ` neu (`geplanteLeitungTyp`), dünner oder gleich über gebaut → still übersprungen (kein Meldungs-Schwall beim Wischen). Radierer/„Zurück“ nehmen auch Ersatz zurück. Kosten im Abschnitt: Material neu, minus 50 % Altpreis (E1), plus Spülbohrung auf Flussfeldern [F]; keine Gestattung (liegt schon). Bauende: `typ = ersatz.typ`, `ersatz` löschen, Vorsehung bleibt.
- **Auftrag c2**: „Versorge alle drei Starthäuser: zeichne im Bauabschnitt eine Leitung zum dritten Haus und kaufe ihm eine Übergabestation“ (Text, kein [F]).

## 6. Texte (≤ 90 Zeichen, **[F]** = Fachprüfer)
`{t}`/`{e}` = Kurzname ohne „-Leitung“ („25er“). `{f}` = `max(1, ⌈last_kw − kapazitaet_kw⌉)`, `kapazitaet_kw` = Katalog × `spreizung_faktor`. `{e}` = kleinste Leitung des Katalogs mit Kapazität × Faktor ≥ `last_kw`, dicker als `{t}`.
- Satz 1 [F]: an der Heizzentrale (Tiefe 1) „Die {t} an der Heizzentrale ist zu dünn, es fehlen {f} kW.“ · weiter draußen „Eine {t} auf dem Weg ist zu dünn, es fehlen {f} kW.“ · Stück enthält geplante Leitung oder geplanten Ersatz „Die eingezeichnete {t} ist zu dünn, es fehlen {f} kW.“
- Satz 2: `{e}` frei „Zeichne eine {e} darüber.“ · `{e}` gesperrt „Die {e} gibt es ab Stufe {n}.“ · keine reicht „Leg eine zweite Leitung.“ [F]
- Beispiel: „Die 25er an der Heizzentrale ist zu dünn, es fehlen 5 kW. Zeichne eine 32er darüber.“ (84). Längster gültiger Fall 90 (geprüft per Skript: 90er, `{e}` 110er, `{f}` 9999).
- `ENGPASS_ERSATZ` [F]: „Mit diesem Haus würden andere Häuser kalt. Eine Leitung auf dem Weg ist zu dünn.“ (80)
- Mehrere Stellen: „Weitere zu dünne Stellen stehen im Baumenü.“ (43)
- Ersatz außerhalb des offenen Abschnitts (Hinweis des gesperrten Knopfs „Dickere Leitung“ in der Leitungskarte): Sperre wie `abschnittSperre` (DESIGN 12.20 B1–B4), Zeile 2 Kurzform 12.21. Kern-Ablehnung: „Dickere Leitungen entstehen nur im Bauabschnitt – lass Philipp einen planen.“ (76)
- Leitungskarte mit geplantem Ersatz: „Wird im Bauabschnitt durch eine {e} ersetzt.“ (≤ 46), Knopf „Ersatz zurücknehmen“.
- Baumenü-Überschrift der Warnliste: „Nach dem Bau zu dünn“.

## 7. Pakete
| Paket | Dateien | Abhängig von | Parallel mit | Schwierigkeit |
|---|---|---|---|---|
| P0 Tester-Vorarbeit | `tests/**` (Liste unten), neu `tests/hilfen/nr18.ts`, neu `tests/nr18-abnahme.test.ts` | B2b auf Hauptstand | P1 | mittel |
| P1 Engstelle + Vertrag | neu `src/core/engstelle.ts`, neu `tests/nr18-engstelle-kern.test.ts`; `src/core/typen.ts` (Feld `ersatz`), `src/core/spiel.ts` nur Vertrag, `src/render/effekte.ts` nur leere Methode | B2b | P0 | mittel |
| P2 Kern | `src/core/spiel.ts`, `src/core/speichern.ts`, `src/core/auftraege.ts`, `tools/a91-laufzeit.messung.ts`, neu `tests/nr18-kern.test.ts`, neu `tests/nr18-spielstand.test.ts` | P0 + P1 gemergt | P3, P4 | **schwer** |
| P3 Oberfläche | `src/ui/kontext.ts`, `src/ui/katalog.ts`, `src/ui/sperrtexte.ts`, `src/steuerung.ts`, neu `tests/nr18-oberflaeche.test.ts` | P0 + P1 gemergt | P2, P4 | mittel |
| P4 Darstellung | `src/render/effekte.ts`, `src/render/szene.ts`, neu `tests/nr18-darstellung.test.ts` | P1 | P2, P3 | mittel |

Kritischer Pfad: P1 (≈ 45 min) → P2. P0 läuft gleichzeitig mit P1, P3 und P4 gleichzeitig mit P2 (keine gemeinsamen Dateien, keine gemeinsamen Ressourcen). **Merge-Reihenfolge:** P0, P1, P2, P3, P4; P0 muss vor P2/P3 drin sein, weil P2/P3 die Methoden entfernen, die alte Tests aufrufen. Danach Designer-Fotoprüfung (844×390, 667×375) und Fachprüfer [F]-Texte. **Überschneidungen:** B2b (gleiche Dateien `steuerung.ts`, `kontext.ts`, `sperrtexte.ts`, `ui/katalog.ts`, a92-Tests) – kommt nach B2b noch eine Fix-Runde, muss P0 die betroffenen a92-Tests neu abgleichen. NR19 (Puffer-Übergabestation) ändert `stationswahl`/`stationKaufen` – nach NR18 bauen; NR18 hängt die Warnung nur ans Ende von `stationKaufen`.

### Vorarbeit (nicht für die Entwickler)
**Tester-Vorarbeit P0** (Betreff „Tester-Vorarbeit NR18-P0“). Gesucht wurde nach **Verhalten** (Prototyp, ganze Suite), nicht nur nach Namen. Neue Aufrufe neuer Kern-Methoden nur über `tests/hilfen/nr18.ts`, damit `npm run typecheck` vor P1/P2 grün bleibt, z. B. `export const ersatzPlanen = (s: Spiel, id: number, t: TypId): Ergebnis => (s as unknown as { ersatzPlanen(id: number, t: TypId): Ergebnis }).ersatzPlanen(id, t);` (ebenso `abschnittWarnungen`). Nach P0 gibt es im Ordner `tests/` keinen Aufruf von `hausanschlussPlanen` oder `leitungTauschen` mehr.

*Löschen (Verhalten entfällt ganz):*
1. `tests/a88-wegsuche.test.ts` (ganze Datei).
2. `tests/a89-hausanschluss.test.ts` (ganze Datei, 5 Tests).
3. `tests/a89-hausanschluss-meldung.test.ts` (ganze Datei, 3 Tests).
4. `tests/a89-mehrfach.test.ts` (ganze Datei, 2 Tests) – Ersatz: Abnahmetest NR18-d unten.
5. `tests/anpassungen.test.ts`: „A47: Der Hausanschluss führt vom Haus zur nächsten Leitung …“, „A47: Ohne offenen Bauabschnitt wird kein Anschluss geplant“, „A47: Der automatische Hausanschluss läuft gerade …“, „A69: Der automatische Hausanschluss rechnet die Anbohrung ein …“, „A49: ‚Letzte zurück‘ nimmt einen automatisch gezogenen Hausanschluss als Ganzes zurück“.
6. `tests/a92-anschlussweg.test.ts`: „A92: Hausanschluss-Meldung beugt ‚Feld‘ richtig“.
7. `tests/a91-anschluss.test.ts`: `test_a91_hausanschluss_4_12_ohne_umweg`.
8. `tests/a91-vergleich.test.ts`: `test_a91_vergleich_a89_durchlauf` (Netze aus der Wegsuche; Abdeckung bleibt über die 3.000 Zufallsnetze).
9. `tests/a88-freischalt-leiter.test.ts`: „Hausanschluss jenseits des Flusses auf Stufe 1 – Hinweis mit Spülbohrung“ – vorher prüfen, ob ein Test „Leitung im Fluss auf Stufe 1 zeichnen → Hinweis Spülbohrung“ (`platzieren`) besteht; sonst als solcher umbauen.

*Umbauen – Aufbau nutzte die Wegsuche nur als Werkzeug (Leitung stattdessen per `platzieren` im offenen Abschnitt zeichnen, Erwartung sonst gleich):*
10. `a88-freischalt-leiter`: `test_a88_stufe1_durchspielbar`.
11. `a92-sperrtexte`: B5 „Hausanschluss schon im Abschnitt“, B8 „Material bestellen mit 0,25 € zu wenig“, Regel 3 „jeder aria-disabled-Knopf …“, „Baumenü mit einem geplanten Anschluss – Zählung …“.
12. `a92-anschlussweg`: „Hauskarte mit geplantem Hausanschluss – gesperrte Knöpfe …“, „hausanschlussGeplant – nur das Haus mit geplantem Anschluss …“, „nach ‚Hausanschluss ziehen‘ zeigt das Haus ‚Hausanschluss geplant‘“ → „nach selbst gezeichneter Leitung …“.
13. `nr12-ebenen`: „Ablauf – gleicher Schlüssel ⇒ gleiche Befehlsfolge“ (Spielaktion Hausanschluss → gezeichnete Leitung).
14. `tests/browser/a92-b2b.browser.cjs:29` `TEXT_46` ist ein Mustertext der entfallenden Meldung – durch eine bleibende Meldung gleicher Länge ersetzen.

*Umbauen – Erwartung ändert sich (Knopf „Hausanschluss ziehen“ fehlt, nur „Leitung selbst legen“ bzw. „Hausanschluss geplant“):*
15. `a92-sperrtexte`: 12.20 B1, B2, B3 und 12.21 B1, B2, B3, B4 („genau ein Knopf ‚Hausanschluss ziehen…‘“ → genau ein Knopf „Leitung selbst legen“ mit derselben Zeile 2/Hinweis).
16. `a92-anschlussweg`: „ohne Bauabschnitt – ‚Leitung selbst legen‘ gesperrt …“, „in Planung, beim Bestellen und im Bau …“.
17. `a92-sperre-schloss`: „Hauskarte ohne Bauabschnitt …“, „Hauskarte mit offenem Bauabschnitt – beide Knöpfe frei“ (→ ein Knopf).
18. `a92-sperre`: „Hauskarte ohne Abschnitt – ‚Hausanschluss ziehen‘ zeigt den Philipp-Hinweis“ → an „Leitung selbst legen“.

*Umbauen – Sofort-Tausch → Ersatz im Bauabschnitt:*
19. `a88-freischalt-leiter`: `test_a88_kern_setzt_durch` (Ersatz auf d50 bei Stufe 1 abgelehnt, im offenen Abschnitt), `test_a88_flussleitung_tauschbar` (Ersatz einer Flussleitung im Abschnitt erlaubt), `test_a88_gebautes_bleibt`, „Leitungskarte – Tausch nur auf freigeschaltete …“ (Knöpfe „Ersetzen: …“ nur im offenen Abschnitt).
20. `a88-review-p2-luecken`: K4 „Leitungskarte zeigt ‚Dickere‘ nur, wenn …“ (im offenen Abschnitt prüfen).
21. `anpassungen`: „A30: Leitungstausch kostet den Neupreis minus 50 % des Altpreises“ → `abschnittKosten_eur()` steigt um Neupreis − 50 % Altpreis (E1), Geld erst bei `materialBestellen`, Typ erst nach Bauende.
22. `menue-v2`: W2 „Was Euro kostet, ist Gold – auch … Leitung tauschen“ (Quelltext-Muster `Tauschen:` → `Ersetzen:`).

*Neu (bewusst rot bis P2/P3):* `tests/nr18-abnahme.test.ts` nur über öffentliche Wege (Spiel-API von heute, `tests/hilfen/nr18.ts`, `tests/hilfen/echte-steuerung.ts`, Blatt-DOM):
- `test_nr18_kein_knopf_hausanschluss_ziehen` (Abnahme a): neues Spiel, Hausblatt jedes Hauses ohne Station, offener Abschnitt → kein Knopf mit „Hausanschluss ziehen“; `'hausanschlussPlanen' in s` ist `false`.
- `test_nr18_selbst_gezogen_warm` (b): Startdorf, Abschnitt offen, 25er per `platzieren` von der Start-40er bis an (13|12) (Leitungsende am Haus), Station `passendeStation`, Abschnitt abschließen → kein Warnhinweis, bestellen, Bauzeit → Haus warm, `erledigt.c2`.
- `test_nr18_zu_duenn_warnt` (c): Haus mit Bedarf > 15 kW per 25er anschließen; `stationKaufen` → `ok === true`, Geld abgezogen, `hinweis` beginnt mit „Eine 25er“ oder „Die eingezeichnete 25er“ und enthält „es fehlen {⌈bedarf − 15⌉} kW“, Ereignis `engstelle` mit den 25er-Feldern; nach Bau `netz.kalt.get(id) === 'leitung'`.
- `test_nr18_ersatz_macht_warm` (d): Fortsetzung von (c): neuer Abschnitt, 32er/40er per echter Steuerung über die 25er gezeichnet → Felder behalten bis Bauende Typ d25, `abschnittKosten_eur()` > 0; nach Bau Typ neu, Haus warm, kein Haus wegen Leitung kalt.
- `test_nr18_mehrere_haeuser_warnung_beim_abschliessen`: drei Häuser über eine gemeinsame 25er im selben Abschnitt mit Station → `abschnittAbschliessen` ok, Hinweis nennt die 25er, Phase `bestellen`, `abschnittWarnungen()` nicht leer.
Werte: Kapazitäten aus dem Katalog (d25 15, d32 25, d40 40 kW), Bedarf aus `bedarfKw` – keine eigenen Rechenwerte des Architekten. Vorbedingung `spreizung_faktor === 1` prüfen.

**Architekt-Vorarbeit:** erledigt in diesem Commit: `tests/architektur/a93-engstelle.test.ts` → `tests/architektur/nr18-engstelle.test.ts` (Namen NR18, `engstellenFinden`), neu R4.

### Bauplan P1 – Engstelle und Vertrag (mittel: reine Funktion, viele Randfälle)
- **Liefert** `src/core/engstelle.ts`:
  - `export interface Engstelle { felder: number[] /* y*N+x, ab Heizzentrale geordnet */; typ: TypId; last_kw: number /* am ersten Feld */; kapazitaet_kw: number /* Katalog × spreizung_faktor */; an_heizzentrale: boolean /* tiefe(erstes) === 1 */; geplant: boolean /* ein Feld-Objekt hat geplant oder ersatz */; empfohlen: TypId | null }`
  - `export function engstellenFinden(netz: Netz, kunden: Iterable<number>): Engstelle[]` – je Kunde Weg `netz.anschluss.get(id).feld` über `netz.eltern` bis −1; zu voll = `last_kw > kapazitaet_kw` (Katalog × Faktor); Stück = erstes zu volles Feld ab der Heizzentrale plus anschließende zu volle Felder gleichen Typs. Doppelte Stücke (gleiches erstes Feld) einmal. Sortiert nach Tiefe, dann Feldnummer. Kunden ohne Anschluss/Feld −1 übersprungen.
  - `export function engstelleText(e: Engstelle, empfohlenAbStufe: number | null): string` – Abschnitt 6.
  - `export const ENGPASS_ERSATZ`, `export const WEITERE_STELLEN = 'Weitere zu dünne Stellen stehen im Baumenü.'`
- **Vertrag** (nur das): `typen.ts` `ersatz?: { typ: TypId; nr: number }` (Kommentar NR18). `spiel.ts`: Ereignis `| { art: 'engstelle'; felder: number[] }`; `ersatzPlanen(id: number, neu: TypId): Ergebnis { throw new Error('NR18-P2 noch nicht gebaut'); }`; `abschnittWarnungen(): string[] { return []; }` (kein Wurf: das Baumenü ruft es bei jedem Aufbau). `effekte.ts`: `engstelle(felder: ReadonlyArray<readonly [number, number]>, ruhig: boolean): void {}`.
- **Tests** `tests/nr18-engstelle-kern.test.ts` (Netze mit `tests/hilfen.ts`, gerechnet mit `berechneNetz`; Katalogwerte d25 15, d32 25, d40 40, d50 60 kW; EFH 10 kW): `test_nr18_engstelle_ab_heizzentrale` (25er-Strang, 2 EFH → last 20, kap 15, an_heizzentrale, empfohlen d32), `test_nr18_engstelle_erste_von_zwei` (32er dann 25er, beide zu voll → zwei Einträge, 32er zuerst), `test_nr18_typwechsel_trennt_stueck`, `test_nr18_doppelt_einmal` (zwei Kunden hinter demselben Stück → 1), `test_nr18_leer` (alles passt / Kunde ohne Anschluss / Feld −1), `test_nr18_spreizung` (Faktor ≠ 1), `test_nr18_geplant` (geplant bzw. ersatz → geplant true), `test_nr18_text` (genaue Sätze 3 Orte × 3 Enden; `{f}` bei last 20,1 / kap 15 → 6; bei last 15,2 → 1), Erzeuger: alle gültigen Typpaare × last 1…9999 → Länge ≤ 90.
- **Randfälle:** Großabnehmer-Felder sind keine Leitung; Typ über `netz.nachId.get(netz.belegung[f])`.
- **Risiko-Auslöser:** nein (keine Daten von außen, keine Rechte, keine Geheimnisse).

### Bauplan P2 – Kern: Rückbau, Ersatz, Warnungen (schwer: Netzregeln, Spielstand, Laufzeit)
- **Nutzt:** alles aus P1.
- **Entfernt:** Abschnitt 4 (Kern-Zeilen), `gruppe` überall.
- **Liefert** (`spiel.ts`):
  - `private probeNetz(anpassen?: (o: Objekt) => Objekt): Netz` (AE-NR18-3).
  - `ersatzPlanen(id: number, neu: TypId): Ergebnis` – Regeln Abschnitt 5; ersetzt einen schon geplanten Ersatz, wenn `neu` dicker als der alte Typ ist.
  - `geplanteLeitungTyp(id: number, neu: TypId): Ergebnis` – geplante Leitung im offenen Abschnitt bekommt neuen Typ (freigeschaltet, Grenze bleibt gleich).
  - `geplanteLeitungEntfernen(x, y)`: ohne geplantes Objekt auf dem Feld nimmt es den Ersatz der gebauten Leitung zurück. `letzteLeitungZurueck()`: das jüngste von geplanter Leitung (größte `id`) und Ersatz (größte `ersatz.nr`). `abschnittLeitungen()` zählt Ersatz mit. `abschnittVerwerfen()` löscht alle `ersatz`.
  - `ersatz_eur(): number` = Σ (Neupreis − Rückkauf alt (E1)) + Spülbohrung je Flussfeld; in `abschnittKosten_eur()` addiert.
  - `stationKaufen`: Warnung nach AE-NR18-1/Abschnitt 5, `Ergebnis.hinweis` = Text. Eine größere Station für ein Haus mit Station prüft nicht.
  - `abschnittAbschliessen`: Warnliste + Hinweis + Ereignis; `abschnittWarnungen(): string[]` (Texte mit `freigeschaltet`/`abStufe` für `{e}`).
  - Bauende (`spiel.ts:1051`): Ersatz anwenden, `_pop`; danach `neuBerechnen` wie heute.
  - Leitungsgrenze: Ersatz zählt nicht als neue Leitung.
- `speichern.ts` (nach `gueltig`): `gruppe` an allen Objekten löschen; `ersatz` löschen, wenn Objekt keine gebaute Leitung, `ersatz.typ` keine Leitung oder nicht dicker, `nr` keine Zahl. Version bleibt 3.
- `auftraege.ts`: c2-Text Abschnitt 5.
- `tools/a91-laufzeit.messung.ts`: M4/M5 raus; neu **M7** `stationKaufen` mit Warnprüfung im vollen Startdorf (Aufbau M1) ≤ 4 ms; **M8** dasselbe im Extremnetz (Aufbau M3) ≤ 12 ms; **M9** `abschnittAbschliessen` im Extremnetz ≤ 8 ms. M1–M3, M6 unverändert mit ihren Grenzen. Bezug: NR17-Messung M1 0,53 ms, M3 1,82 ms je Netzrechnung (gelesen aus NR17-Plan, nicht neu gemessen); Station = 2 Probe-Rechnungen + `neuBerechnen`.
- **Tests** `tests/nr18-kern.test.ts`: `test_nr18_station_warnt_ohne_sperre` (Geld weg, `ohne_station` weg, Hinweis = `engstelleText`, Ereignis), `test_nr18_station_mit_geplanter_leitung` (nur eingezeichnete Leitung → Warnung schon jetzt), `test_nr18_station_alte_kalte_nicht_genannt` (schon vorher wegen Leitung kalte Häuser lösen keine Warnung aus), `test_nr18_station_ersatztext` (`vi.mock` `engstellenFinden → []` bei echter Überlast → `ENGPASS_ERSATZ`), `test_nr18_waermemangel_warnt_nicht`, `test_nr18_ersatz_regeln` (nicht offen / dünner / gleich / gesperrt / geplant → abgelehnt; dicker → `ersatz` gesetzt, Typ unverändert, Live-Netz unverändert), `test_nr18_ersatz_kosten` (E1, Flussfeld mit Bohrung, keine Gestattung), `test_nr18_ersatz_zurueck_radierer_verwerfen`, `test_nr18_ersatz_bauende` (Typ neu, Vorsehung bleibt), `test_nr18_ersatz_in_probe` (Warnung verschwindet, sobald Ersatz geplant ist), `test_nr18_abschliessen_warnliste` (Liste, Hinweis, „Weitere …“ bei 2 Stellen, Leeren bei Wieder-öffnen/Verwerfen/Bestellen), `test_nr18_keine_wegsuche` (`'hausanschlussPlanen' in s === false`, `'leitungTauschen' in s === false`).
- `tests/nr18-spielstand.test.ts`: alter Stand mit offenem Abschnitt und geplanten Leitungen mit `gruppe` → lädt, `gruppe` weg, „Zurück“ nimmt nur ein Feld, Bau macht sie zu gebauten; Stand in Phase `bestellen` → `abschnittWarnungen()` nach dem Laden gefüllt; kaputtes `ersatz` (Typ `hz`, an geplanter Leitung, `nr` Text) → entfernt, Stand bleibt gültig.
- **Eskalation:** ein Test außerhalb der P0-Liste wird rot; M2 oder eine neue Grenze reißt; Startdorf-Abnahme (b) ergibt eine Warnung.
- **Risiko-Auslöser:** ja, eingeschränkt – Spielstand ist Eingabe von außen (Laden aus dem Gerätespeicher); Prüfung an der Grenze in `speichern.ts`. Sonst nein.

### Bauplan P3 – Oberfläche (mittel)
- **Nutzt:** `ersatzPlanen`, `geplanteLeitungTyp`, `abschnittWarnungen`, Ereignis `engstelle`, `effekte.engstelle` (P1-Vertrag; Tests ersetzen Kern-Methoden per `vi.spyOn`).
- `kontext.ts` `anschlussWeg`: Knopf „Hausanschluss ziehen“ weg; Reihe = „Hausanschluss geplant“ (gesperrt) wenn `hausanschlussGeplant`, sonst „Leitung selbst legen“. Leitungskarte (gebaute Leitung): im offenen Abschnitt `leitungsKnoepfe` mit `Ersetzen: {Name}` (Gold, `unter` = Nettopreis nach E1) bzw. bei geplantem Ersatz Satz + „Ersatz zurücknehmen“; außerhalb ein Knopf „Dickere Leitung“ mit Sperre wie `abschnittSperre`/Kurzform 12.21.
- `ui/katalog.ts` (Baumenü, Phase `bestellen`): Kasten „Nach dem Bau zu dünn“ mit `abschnittWarnungen()`, nur wenn nicht leer.
- `sperrtexte.ts`: Sperre „Dickere Leitung“ (Grund/Kurzform aus den vorhandenen Abschnitt-Sperren, nichts Neues erfinden).
- `steuerung.ts` `stempelnBei` (`:424`): belegtes Feld → gebaute Leitung: `ersatzPlanen` nur, wenn Stempeltyp dicker; geplante Leitung anderen Typs: `geplanteLeitungTyp`; sonst still weiter. Hinweis nur beim ersten Feld einer Geste (kein Schwall). `ereignisse()`: Zweig `engstelle` → `effekte.engstelle(felder → [f % N, ⌊f / N⌋], ruhig)`, auch bei `ruhig`.
- **Tests** `tests/nr18-oberflaeche.test.ts` (echtes Blatt, `tests/hilfen/echte-steuerung.ts`): `test_nr18_hausblatt_knoepfe` (je Phase), `test_nr18_leitungskarte_ersetzen` (offen/zu, Gold, Preis, gesperrt mit Grund ≤ 90, Ersatz zurücknehmen), `test_nr18_ueberzeichnen` (dicker über gebaut → Ersatz; dünner → nichts, keine Meldung; über geplant → Typ neu), `test_nr18_baumenue_warnliste`, `test_nr18_ereignis_markiert` (auch bei „Weniger Bewegung“).
- **Eskalation:** ein a92-/nr12-Test außerhalb der P0-Liste wird rot.
- **Risiko-Auslöser:** nein. Designer-Fotoprüfung: Hausblatt, Leitungskarte offen/zu/mit Ersatz, Baumenü mit Warnliste, Markierung neben offenem Blatt.

### Bauplan P4 – Darstellung (mittel)
- `effekte.ts`: `engstelle(...)` mit Markierung Abschnitt 5, `ENGSTELLE_DAUER_S = 6`, `aktiv()` zählt mit. `szene.ts`: gebaute Leitung mit `ersatz` zusätzlich im Stil „geplant“ in neuer Farbe/Breite zeichnen (gleicher Stil wie geplante Leitungen, Designer bestätigt).
- **Tests** `tests/nr18-darstellung.test.ts` (Maler-Attrappe wie `tests/nr12-*`): Markierung aktiv 6 s, ruhig ohne Puls; Ersatz-Leitung im Befehlsstrom; NR12-Taktgrenzen bleiben grün.
- **Eskalation:** NR12-Takt- oder Schlüssel-Test rot.
- **Risiko-Auslöser:** nein.

## 8. Prüf-Schwerpunkt
1. Leitung läuft am Haus vorbei statt dort zu enden (A57) → Haus hängt an vorbeilaufender Leitung; Warnung nennt das richtige Stück (P1/P2, `test_nr18_station_mit_geplanter_leitung` mit vorbeilaufender Variante).
2. Station gekauft, Leitung nur eingezeichnet → Warnung schon jetzt; Hausblatt sagt weiter „heizt mit Öl“, bis gebaut ist (P2/P3).
3. Ersatz auf einem Stück, an dem warme Häuser hängen → während der Bauzeit bleiben sie warm, danach mit neuer Größe (P2 `test_nr18_ersatz_bauende`).
4. Nur 3 von 5 Feldern ersetzt → beim Abschließen Warnung für das Reststück, A67-Warnung „dünner ohne Abzweig“ erscheint (P2).
5. Wischen mit dünner Leitung über dicke Hauptleitung → nichts passiert, keine Meldungsflut (P3).

## 9. Offene Fragen an Simon (Fachentscheidungen)
- **E1 Rückkauf beim Ersetzen (A30):** (a) **empfohlen:** 50 % des alten Leitungspreises werden mit der Materialbestellung gutgeschrieben – deine A30-Regel, Ersetzen bleibt bezahlbar; (b) kein Rückkauf – in echt bleibt die alte Leitung meist im Boden oder ist Schrott, Ersetzen wird teurer.
- **E2 Alte Leitung bis Bauende:** (a) **empfohlen:** Die alte Leitung liefert weiter, bis der Abschnitt gebaut ist – Spielvereinfachung (in echt kurze geplante Unterbrechung, meist im Sommer); (b) Häuser am Stück sind während der Bauzeit kalt – ehrlicher, aber straft jedes Ersetzen.

## 10. Zurückgestellt
- „Leitung selbst legen“ stempelt weiter die 25er; Vorauswahl der passenden Größe würde das Nachdenken abnehmen (Simon: gehört zum Spiel).
- Hinweis beim Stationskauf ohne jede Leitung am Haus; „Ganzes Stück ersetzen“ in einem Zug (Überzeichnen deckt es weitgehend ab).
- `anfrageAnnehmen` und `vertragUnterschreiben` erhöhen die Last ohne Warnung; `engstellenFinden` ließe sich dort später nutzen.
- NR13 Tutorial: plant auf diesem Ablauf (selbst zeichnen, Station, Warnung lesen, dicker darüberzeichnen); Tipp „erst dickere Leitung legen“ aus der Sammelliste.
- **Fachprüfer:** alle [F]-Texte; „Ersatz unter dem Fluss braucht neue Spülbohrung, keine neue Gestattung“; „nötig“ = Summe der Anschlussleistungen ohne Gleichzeitigkeit (Spielvereinfachung).
- `docs/ARCHITEKTUR.md` gibt es im Projekt nicht; die Festlegungen stehen in diesem Bauplan.

## 11. Nachtrag Simon 2026-11-06 (unvollständig, Kontext des Architekten voll – Fassung 2 nötig)
- **Start ohne angeschlossene Häuser.** Prototyp (getestet, Scratchpad): Auf den NR18-Prototyp kamen hinzu: kein Startnetz (40er + 25er) mehr und keine Starthäuser mit Station. Ergebnis: **147 rot / 879 grün**, davon **98 zusätzlich** zu den 49 aus Abschnitt 7. Betroffen: anpassungen 38, a88-kundenanfrage 21, a88-kundenanfrage-abnahme 16, a88-freischalt-leiter 10, a92-b2b-zeichenleiste 4, spiel 3, a88-review-p2-luecken 2, a92-anschlussweg 2, a92-sperre-weg-aktion-laeuft 1, nr12-ebenen 1. Offen für Simon (**E3**): Entfällt auch das Startnetz (40er/25er)? Empfehlung: ja, das Tutorial zeigt das Zeichnen ab der Heizzentrale. Für die Tester-Vorarbeit wird eine Testhilfe „altes Startdorf“ empfohlen (`tests/hilfen`), damit die 98 Tests ihren Aufbau behalten. Der Umbau `neuerSpielstand` wäre ein eigenes Paket vor P2. Diese Einschätzung ist nicht durchgeplant.
- **Schnittstelle Tutorial NR13 (Vorschlag):** Ereignis `{ art: 'schritt'; schritt: 'abschnitt_geplant' | 'abschnitt_offen' | 'leitung_gezeichnet' | 'station_gekauft' | 'abschnitt_abgeschlossen' | 'material_bestellt' | 'abschnitt_gebaut' }`, Typ im P1-Vertrag, Aussenden in P2/P3. Nicht durchgeplant.
- **NR19 (Puffer-Übergabestation, 2.000 Volllaststunden mit Puffer, Wahl beim Anschluss, kein Nachrüsten):** Vorschlag: ein eigenes Paket nach NR18-P2. Es berührt `stationKaufen`/`stationswahl`, `VOLLLASTSTUNDEN`, `hauspufferEinbauen` (entfällt) und A71-Tests. Die Recherche `docs/recherche/puffer-uebergabestation.md` ist **nicht gelesen**.
