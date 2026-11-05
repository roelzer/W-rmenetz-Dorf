# Bauplan NR15 → A91 „Haus hängt an seiner Leitung“

Stand 2026-11-05, Architekt. Basis: Branch `claude/keen-mccarthy-f4p5us`, Commit 292b13b, 794 Tests grün.
Alle Messwerte unten sind **getestet** (Wegwerf-Kopie im Scratchpad, Prototyp der Regeln, nicht im Projekt). Kein Produktivcode in diesem Plan.

## 1. Ziel und Abnahme (Vorschlag für die A91-Zeile)
**A91** (Soll, aus NR15) – Ein Haus hängt an der Leitung, die es versorgen kann: zuerst an seinem eigenen Leitungsende (A57), sonst an der dickeren Leitung; eine Hauptleitung wird nicht über eine dünnere Leitung gespeist, wenn es einen dickeren Weg zur Heizzentrale gibt.
Abnahme:
1. Eine neben ein warmes Haus gelegte dünne Leitung macht es nicht kalt (Test a91, Aufbau 6 / T1).
2. Hausanschluss Reihenhaus (4|12) im neuen Spiel: 5 Felder 32er statt 13 Felder (T4).
3. Nach P2+P3: Hausanschluss (13|12) im neuen Spiel 2 Felder statt 10, alle drei Starthäuser warm (T8).
4. Alte Spielstände laden unverändert (gleicher Schlüssel, gleiche Version) (T5).

## 2. Ursache (gelesen + nachgemessen)
Es sind **drei verschiedene Ursachen**. NR15 nennt nur die erste; die A89-Fälle verteilen sich auf alle drei.

| Fall aus dem A89-Durchlauf | Ursache | Beleg |
|---|---|---|
| (4\|12) Reihenhaus macht (9\|13) kalt | **U1 Anschlusswahl:** Bei Gleichstand (beide Felder „durchlaufend“, gleiche Tiefe 3) gewinnt das erste Feld in der Reihenfolge von `rund()` – „oben“ vor „seitlich“. (9\|13) wandert von der 40er (10\|13) auf die neue 32er (9\|12) und überlastet sie (10 + 16 kW > 25 kW). | `src/core/netz.ts:122-140` (Wertung Z. 137: nur Leitungsende + Tiefe, Dicke zählt nicht), Reihenfolge `rund` Z. 91-96 |
| (13\|12) macht (9\|13), (12\|14) kalt | **U2 Netzbaum:** Jede Leitung direkt an der Heizzentrale ist ein Einspeisepunkt; die Breitensuche hängt jedes Feld an das *zuerst gefundene* Nachbarfeld. Die neue 25er (11\|12) wird Elternfeld der 40er (10\|12) – die Hauptleitung wird über die 25er gespeist (verstößt nebenbei gegen W1). Anschlusswahl unverändert. | `src/core/netz.ts:98-118`; gemessen: Eltern von (10\|12) wechselt von (10\|11) auf (11\|12) |
| (8\|18) Mehrfamilienhaus macht (9\|13), (12\|14) kalt | **U3 echte Überlast, kein Modellfehler:** Die Start-40er (40 kW) müsste 20 kW Bestand + 30 kW MFH tragen. Weder Anschlusswahl noch Baum ändern sich. Der teure A89-Umweg (23 Felder, dockt an (10\|10), das als eigener Einspeisepunkt volle 40 kW hat) ist die richtige Reaktion der Probe-Rechnung. | Messung: Anschluss und Eltern unverändert; Last 50 kW > 40 kW |

Belegte Zahlen (Wegsuche, `abschnittKosten_eur()`, Stufe 1): (4\|12) heute 13 Felder / 7.280 €; (13\|12) 10 Felder / 4.000 €; (8\|18) 23 Felder / 18.400 € (der Tester nannte 20.900 € gegen 5.700 € – Unterschied 2.500 € = Anbohrung; das Verhältnis passt).

**Folge für die NR15-Annahme „danach können die Umwege entfallen“:** stimmt nur teilweise. U1 und U2 lassen sich im Netzmodell beheben, U3 nicht – die Probe-Rechnung aus A89 bleibt nötig.

## 3. Lösungsvarianten Anschlusswahl (U1)
| | V1 Gespeicherte Zuordnung Haus → Anschlussfeld | V2 Regel ohne Speicher (**Empfehlung**) |
|---|---|---|
| Idee | Neues Feld `Objekt.anschluss_feld`, gesetzt beim Hausanschluss bzw. beim ersten Anschluss; `berechneNetz` nimmt es, solange das Feld noch erreichbar ist | `berechneNetz` wählt unter den angrenzenden Leitungsfeldern nach fester Rangfolge (unten) |
| Fachlich | am nächsten an „genau ein Hausanschluss“ | auch genau ein Anschluss je Haus (die Zuordnung ist eine Map); stabil, weil nur bessere Felder gewinnen |
| Spielstand | neues Feld, Rückschreiben aus der reinen Rechnung in den Stand nötig, Umgang mit abgerissenen/getauschten Leitungen, von Hand gezeichnete Hausanschlüsse werden nicht erkannt | **keine Änderung**, keine Migration |
| Nachbardörfer (`nachbarn.ts:70`) | brauchen trotzdem eine Regel | gleiche Regel |
| Risiko | zwei Wahrheiten (gespeichert vs. gezeichnet) | eine Wahrheit: das, was auf der Karte liegt |

Verworfen außerdem: **„nur dickste Leitung“** – bricht A57 (Haus mit eigenem 25er-Ende hinge an der vorbeilaufenden 50er; Test `anpassungen.test.ts:704`).

**Regel V2 (AE-A91-1), Rangfolge unter den erreichten Nachbarfeldern eines Gebäudes:**
1. Grenzt das Gebäude an die Heizzentrale → direkt (`feld -1`, wie heute).
2. **Trägt:** `engstelle_kw(feld) × spreizung_faktor ≥ bedarfKw(o)` vor „trägt nicht“.
3. **Leitungsende** (`leitungsNachbarn ≤ 1`) vor durchlaufend (A57, wie heute).
4. Größere `engstelle_kw` (Nennkapazität der engsten Leitung auf dem Weg zur Heizzentrale) zuerst.
5. Kleinere Tiefe.
6. Danach erste Fundstelle in `rund()` (wie heute, deterministisch).

Punkt 2 schließt den Rest von NR15: ein neues dünnes *Leitungsende*, das ein großes Haus nicht tragen kann, zieht es nicht von seiner Leitung weg. Hat das Haus nur ein zu dünnes Ende, bleibt es dort und ist kalt („Leitung zu klein“) – der Lerneffekt bleibt.

## 4. Lösung Netzbaum (U2) – P2
**AE-A91-2:** Der Baum wird nicht mehr per Breitensuche gebildet, sondern als „dickster Weg“: Jedes Leitungsfeld hängt an dem Nachbarn, über den die engste Stelle bis zur Heizzentrale am größten ist; bei Gleichstand kleinere Tiefe, dann kleinere Feldnummer. Einspeisepunkte bleiben alle Leitungsfelder an der Heizzentrale. `reihenfolge` bleibt „Eltern vor Kind“.
Fachlich gestützt durch **W1** (bestätigt): DN nimmt in Fließrichtung nie zu – der neue Baum vermeidet „dünn speist dick“, wo ein dicker Weg existiert. Vereinfachung: Im echten vermaschten Netz teilt sich der Fluss nach Widerstand auf; das Spiel behauptet dazu nichts im Text.

## 5. Folgen für A89
- **Probe-Rechnung (`spiel.ts:686-707`) bleibt.** Sie fängt U3 (echte Überlast) und ist billig abgesichert. Mit V2 findet sie für (4\|12) sofort den kurzen Weg (gemessen: 5 Felder / 2.800 €).
- **Feldsperre neben der Heizzentrale (`spiel.ts:668-678`) kann nach P2 entfallen** (P3). Gemessen mit Prototyp P1+P2, Sperre aus, Probe an: (13\|12) 2 Felder / 800 € statt 10 / 4.000 €; über alle Häuser des Orts auf Stufe 1 und 2 wird kein Haus neu kalt. Die Sperre steht aber im A89-Abnahmetext → **Entscheidung Projektleiter** (Spielregel aus A89, kein Fachwissen) und Lastenheft-Anpassung.
- **(8\|18) bleibt ein Umweg.** Ob statt des Umwegs ein Hinweis „Die Hauptleitung ist zu dünn – erst tauschen“ kommen soll, ist Spielgefühl; nicht Teil von A91 (siehe 11).

## 6. Prototyp-Beleg (getestet, Wegwerf-Kopie)
| Stand | Befehl | Ergebnis |
|---|---|---|
| Prototyp V2 (nur Anschlusswahl) | `npx vitest run` (ohne Analyse-Dateien) | 794/794 grün |
| Prototyp V2 + Baum + „trägt“ | dito | 794/794 grün |
| Analyse ohne A89-Schutz, alle Häuser, Stufe 1+2 | eigene Analyse-Testdatei | heute 3 Fälle kalt; mit V2: (4\|12) behoben; mit V2+Baum: nur noch (8\|18) (U3) |
| Aufbau 6/T1 (unten) | eigene Testdatei | heute: A und B kalt „leitung“, A an (1\|4); Prototyp: beide warm, A an (2\|5) |
| Laufzeit A89-Tests | `npx vitest run tests/a89-*.test.ts` | 1,0 s → 1,4 s mit naivem Prototyp (lineare Suche, Spreizung je Kandidat neu) – im echten Bau Prioritätswarteschlange und Spreizung einmal rechnen |

## 7. Pakete
Alle drei Pakete ändern `src/core/netz.ts` bzw. danach `spiel.ts` im selben Abschnitt → **nacheinander**, kein Parallelbau. Kritischer Pfad P1 → P2 → P3 (alles klein, zusammen etwa ein halber Tag). Ein Vertragspaket lohnt nicht: es gibt nur eine neue Schnittstelle (`engstelle_kw`), P1 liefert sie.

| Paket | Dateien | Abhängig von | Parallel möglich mit |
|---|---|---|---|
| P1 Anschlusswahl | ändern `src/core/netz.ts` (Z. 122-143, 159-160, 198-204), `src/core/typen.ts` (Interface `Netz`); neu `tests/a91-anschluss.test.ts` | – | anderen Paketen, die `netz.ts`/`typen.ts` nicht berühren |
| P2 Netzbaum dickster Weg | ändern `src/core/netz.ts` (Z. 98-118); neu `tests/a91-netzbaum.test.ts` | P1 | wie P1 |
| P3 A89 aufräumen | ändern `src/core/spiel.ts` (Z. 653-707 Kommentare, Z. 668-678 Sperre, Z. 765 Meldung); Tester-Vorarbeit in `tests/a89-hausanschluss.test.ts` | P2 + Entscheidung PL | – |

### Bauplan P1 – Anschlusswahl (Schwierigkeit: mittel – Fachregel im Netzmodell, aber eng begrenzt und durch Prototyp abgesichert)
**Liefert:**
- `Netz.engstelle_kw: Map<number, number>` – je erreichtem Leitungsfeld die kleinste **Nenn**kapazität (kW, ohne Spreizungsfaktor) auf dem Weg über `eltern` bis zur Heizzentrale. Berechnet in einem Durchlauf über `reihenfolge` (Eltern vor Kind): `engstelle(k) = min(kap(k), engstelle(eltern(k)))`.
- Anschlusswahl nach AE-A91-1 (Abschnitt 3). Signatur von `berechneNetz` **unverändert**.
**Ändern:**
- `spreizung_faktor` (heute Z. 160) vor die Anschlusswahl ziehen – er hängt nicht von `anschluss` ab.
- `wegKapazitaet_kw` (Z. 200-204) durch `engstelle_kw.get(feld) × spreizung_faktor` ersetzen (gleicher Wert, keine zweite Rechnung). Für `feld -1` (Puffer direkt an der Heizzentrale, A24) bleibt es `Infinity` wie heute.
- Kommentar Z. 122 und Z. 133-134 auf die neue Rangfolge.
**Tests** (`tests/a91-anschluss.test.ts`, synthetisch wie `anpassungen.test.ts:704`, `berechneNetz` direkt, Kessel Stufe 1, Preisstufe 2):
- `A91: test_a91_duenne_leitung_neben_warmem_haus_macht_es_nicht_kalt` – **Aufbau 6:** `hz` (0\|0); `d40` auf x=2, y=0…7; EFH A (1\|5) mit `passendeStation(10)`; dazu `d25` (1\|4), (0\|4) und EFH B (0\|5) mit Station. Erwartet: `anschluss(A).feld = 5·N+2`, A und B in `warm`, `kalt` leer. Herleitung: B 10 kW an 25er (15 kW), Hauptleitung 20 kW ≤ 40 kW. Gegenprobe heute: A an (1\|4), A und B kalt „leitung“ (gemessen).
- `A91: test_a91_gleichstand_entscheidet_die_dickere_leitung` – Haus mit zwei durchlaufenden Nachbarn gleicher Tiefe, d25 und d40 → Anschluss an d40.
- `A91: test_a91_zu_duennes_leitungsende_zieht_haus_nicht_weg` – Bäckerei `baeck` (20 kW, Katalog 30.000 kWh/a ÷ 1.500 h) mit eigenem d25-Ende (15 kW) und vorbeilaufender d50 → Anschluss an d50, warm.
- `A91: test_a91_eigenes_ende_reicht_dann_bleibt_es` – wie A57 (EFH 10 kW, d25-Ende, d50 vorbei) → Anschluss am d25-Ende (bestehender A57-Test bleibt unverändert grün).
- `A91: test_a91_nur_zu_duennes_ende_bleibt_kalt` – Bäckerei nur an d25-Ende → Anschluss d25, `kalt` = „leitung“.
- `A91: test_a91_hausanschluss_4_12_ohne_umweg` – neues Spiel, Kessel, Stufe 1, Abschnitt offen, Hausanschluss (4\|12): Weg = (9\|12),(8\|12),(7\|12),(6\|12),(5\|12), Typ d32, `abschnittKosten_eur()` = 2.800 (5 × 560 € laut Katalog); nach Bau kein Haus kalt.
- `A91: test_a91_alte_spielstaende_laden_unveraendert` – `SPEICHER_SCHLUESSEL === 'waermedorf-spielstand-v1'`, `SPEICHER_VERSION === 3`, ein serialisierter Stand aus `neuerSpielstand` lädt mit Befund `ok`.
- `A91: test_a91_engstelle_kw` – Start-Dorf: `engstelle_kw` an (11\|14) = 15, an (10\|13) = 40.
**Randfälle:** Großabnehmer 2×2 mit Nachbarn auf mehreren Seiten; Wärmequellen (Bedarf 0 → „trägt“ immer); Puffer ohne Leitung (A24, bleibt `-1`); Haus ohne Station (bekommt weiter einen Anschluss für die Anzeige).
**Eskalation:** Stoppen, wenn ein bestehender Test rot wird (im Prototyp blieben alle 794 grün) oder der A89-Durchlauf ein neu kaltes Haus meldet.
**Risiko-Auslöser:** nein (keine Anmeldung, keine Daten von außen, keine neue Außenschnittstelle).

### Bauplan P2 – Netzbaum „dickster Weg“ (Schwierigkeit: schwer – Algorithmus, der Engpass-, Reduzierungs- und Aufteilungsprüfung A67/A76 speist)
**Nutzt:** `engstelle_kw` aus P1.
**Ändern:** Z. 98-118 nach AE-A91-2: Prioritätswarteschlange mit Schlüssel (Engstelle absteigend, Tiefe aufsteigend, Feldnummer aufsteigend); ein Feld wird beim ersten Herausnehmen festgelegt (`tiefe`, `eltern`, `engstelle_kw`, `reihenfolge`). Die `engstelle_kw`-Nachrechnung aus P1 entfällt dann (fällt beim Aufbau mit ab). Höchstens 576 Felder – einfache Warteschlange reicht, aber keine lineare Suche je Schritt.
**Tests** (`tests/a91-netzbaum.test.ts`):
- `A91: test_a91_hauptleitung_nicht_ueber_duenne_leitung_gespeist` – neues Spiel, `d25` auf (11\|12),(12\|12) gebaut, Station an (13\|12): `eltern(10|12) = 11·N+10`, `engpass` leer, (9\|13),(12\|14),(13\|12) warm. Gegenprobe heute: Eltern (11\|12), zwei Häuser kalt.
- `A91: test_a91_masche_nimmt_den_dicken_weg` – zwei Wege von der Heizzentrale zu einem Feld, einer ganz d40, einer mit d25-Stück → Feld hängt am d40-Weg.
- `A91: test_a91_reihenfolge_eltern_vor_kind` – für jedes Feld steht `eltern` vorher in `reihenfolge` (Start-Dorf und Aufbau 6).
- `A91: test_a91_baum_ist_deterministisch` – gleiche Objekte in anderer Array-Reihenfolge → gleiche `eltern`.
**Randfälle:** mehrere Einspeisepunkte an der Heizzentrale (Heizzentrale 3×3 ab Stufe 3); Vorsehung (A69) unverändert; Leitungen ohne Verbindung bleiben ohne Tiefe.
**Eskalation:** Stoppen und melden, wenn ein bestehender A67/A76-Test rot wird oder ein Aufbau entsteht, in dem ein vorher warmes Haus kalt wird (siehe Risiko R1).
**Risiko-Auslöser:** nein.

### Bauplan P3 – A89 aufräumen (Schwierigkeit: einfach – Sperre und Kommentare entfernen, Verhalten durch Probe abgesichert)
Nur nach Entscheidung des Projektleiters (Abschnitt 5) und angepasster A89-Abnahme.
**Ändern:** `spiel.ts` Sperre `nebenHz` (Z. 668-678) und Ersatzsuche/Meldung „direkt neben der Heizzentrale“ (Z. 765) entfernen; Probe-Rechnung (Z. 686-707) bleibt; Kommentare Z. 653 (offener Review-Punkt K1) und Z. 686-688 auf den neuen Stand.
**Tests:** `A91: test_a91_hausanschluss_13_12_zwei_felder` (neue Datei `tests/a91-hausanschluss.test.ts`) – neues Spiel, Stufe 1: Weg (11\|12),(12\|12), d25, 800 € (2 × 400 €), nach Bau alle drei Starthäuser warm, c2 erledigt.
**Eskalation:** Stoppen, wenn der A89-Durchlauf (Stufe 1+2, alle Orte) ein neu kaltes Haus meldet.
**Risiko-Auslöser:** nein.

## 8. Vorarbeit (nicht für den Entwickler)
- P1, P2: keine (neue Testdateien; Prototyp ließ alle bestehenden Tests grün).
- P3 → **Tester-Vorarbeit:** in `tests/a89-hausanschluss.test.ts` die Tests „legt kein Feld direkt neben die Heizzentrale“ und „geht es nur über ein Feld neben der Heizzentrale, wird kein Weg geplant“ ersetzen bzw. entfernen; Durchlauf-Test: Bedingung „keiner liegt neben der Heizzentrale“ streichen, „kein Haus neu kalt“ bleibt. **Projektleiter:** A89-Abnahmetext im Lastenheft anpassen.
- Architekt: keine Änderung an `tests/architektur/` nötig (keine neuen Module, keine neuen Abhängigkeiten).

## 9. Spielstand
Keine Änderung am Datenmodell: `SPEICHER_SCHLUESSEL` bleibt `waermedorf-spielstand-v1`, `SPEICHER_VERSION` bleibt 3 (`src/core/speichern.ts:7-9`), keine Migration. Das Netz wird nach dem Laden neu berechnet (`spiel.ts:236`), alte Stände bekommen die neue Regel also automatisch. Sichtbare Folge in alten Ständen: Häuser, die nur wegen U1/U2 kalt waren, werden warm; die Abzweig-Zeichnung zum Haus folgt dem neuen Anschluss (`src/render/szene.ts:370-373`).

## 10. Risiken
- **R1 (P2, Sicherheit 60):** Der dickste Weg beachtet die Last nicht. In einer Masche aus zwei Einspeisungen kann die neue Regel Last auf einen Strang bündeln, die die Breitensuche zufällig verteilt hatte → theoretisch kann ein bisher warmes Haus kalt werden. Im Startdorf und im A89-Durchlauf nicht aufgetreten. Absicherung: Eskalationsregel P2, Durchlauf-Test.
- **R2 (P1):** Ein von Hand zu dünn gezogener Hausanschluss neben einer Hauptleitung bleibt ohne Last (Haus hängt an der Hauptleitung); auf der Karte endet er ohne Abzweig. Gewollt, aber im Spieltest beobachten.
- **R3:** Rechenzeit – `berechneNetz` läuft in der Probe-Rechnung viele Male; Laufzeit der A89-Tests vor/nach im Bericht des Entwicklers angeben (Grenze: höchstens +20 %).

## 11. Offene Punkte (keine Frage an Simon nötig)
- Entscheidung Projektleiter: P3 (Sperre neben der Heizzentrale entfällt) ja/nein.
- Für später, Spielgefühl: Bei echter Überlast wie (8\|18) statt langem Umweg ein Hinweis „Hauptleitung zu dünn – erst tauschen“? Kann als eigenes NR vorgemerkt werden; die Probe-Rechnung macht heute nichts falsch.
- **Fachprüfer:** bestätigen, dass „ein Haus hängt an genau einer Leitung, bevorzugt an seinem eigenen Hausanschluss“ und „Wärme kommt über den dicksten Weg“ als Spielvereinfachung nichts fachlich Falsches behaupten. „Genau ein Hausanschluss je Gebäude“ steht nicht in der Fachwissen-Bibliothek (nur W1 bestätigt, W2 offen).
