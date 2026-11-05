# Bauplan NR15 → A91 „Haus hängt an seiner Leitung“ (Fassung 2)

Stand 2026-11-05, Architekt. Basis: Branch `claude/keen-mccarthy-f4p5us`, Commit 042e419 (nach NR16-A/A92), **843 Tests grün** (getestet: `npx vitest run` in einer Wegwerf-Kopie).
Fassung 2 arbeitet Kritik (B1–B6) und Fachprüfung (B1–B3) aus `docs/ENTSCHEIDUNGEN.md` (Einträge 2026-11-05 „NR15-Plan Kritik“, „NR15 Fachprüfung“) und die Spielregel des Projektleiters ein. Alle Messwerte sind **getestet** an einem Prototyp in einer Wegwerf-Kopie im Scratchpad (nicht im Projekt). Kein Produktivcode in diesem Plan.

## 0. Was sich gegenüber Fassung 1 ändert (Kurzliste)
| Befund | Umgang in Fassung 2 |
|---|---|
| Kritik B1 („trägt“ ohne Last, Regel 4 „dicker zuerst“) | **Beide Regeln gestrichen.** Neu: Ein Haus behält die Leitung nach der heutigen Regel; nur ein Haus, das dort wegen Überlast kalt wäre und **kein eigenes Leitungsende** hat, wechselt, und nur auf eine Leitung, deren **Restkapazität** (mit der ganzen übrigen Last) es trägt. AE-A91-1. |
| Spielregel PL (eigener zu dünner Hausanschluss) | Ein Haus mit eigenem Leitungsende bleibt dort, auch wenn es zu dünn ist → kalt, Chip „Leitung zu dünn“ (gibt es schon, `src/ui/kontext.ts:159`). Test `test_a91_eigener_zu_duenner_hausanschluss_bleibt_kalt`. |
| Kritik B2 (kein Test für alte Stände) | Pflicht-Vergleichstest alte gegen neue Netzregel auf 3.000 Netzen mit festem Startwert (P1, erweitert in P2). Prototyp: 0 Netze schlechter. |
| Kritik B3 (Tiefe) | Tiefe bleibt **kürzester Abstand** (Breitensuche unverändert). P2 ändert nur das Elternfeld. |
| Kritik B4 (zwei Abgänge, Masche) | P2 hängt ein Feld nur um, wenn der neue Weg die ganze Last dahinter trägt → keine Bündelung bis zur Überlast möglich. Pflichttest „zwei Abgänge mit Ring und Last“. R1 neu bewertet (Abschnitt 10). |
| Kritik B5 (Laufzeit) | Messskript festgelegt (Abschnitt 8): Median aus 50 Läufen, alt und neu im selben Lauf. |
| Kritik B6 (NR16 zuerst) | Erledigt: NR16-A ist als A92 gemergt, Plan steht auf 042e419. Die Ursache von NR16 war die Bedienung, nicht die Sperre neben der Heizzentrale – P3 bleibt deshalb ein NR15-Paket. Kollisionen mit NR16-B: Abschnitt 9. |
| Fachprüfung B1 (Text „Leitung am Haus ist sein Hausanschluss“) | Textänderung wandert **in NR16-B** (gleiche Stellen werden dort umgebaut); P1 prüft nur, dass der alte Satz weg ist. Wortlaut-Vorschlag in Abschnitt 9. |
| Fachprüfung B2 (Meldung „darf nicht neben der Heizzentrale“) | P3 entfernt Sperre und Meldung (`src/core/spiel.ts:670-679`, `:767`). |
| Fachprüfung B3 (W1 als Begründung falsch herum) | Umformuliert: Die Fließrichtung ist eine **Modellannahme**; W1 wird entlang dieser Richtung geprüft. Regel V-NR15-a als AE-A91-3 übernommen. |
| Fassung 1: neues Feld `Netz.engstelle_kw` | **Entfällt.** Die Schnittstelle `Netz` (`src/core/typen.ts:135`) bleibt unverändert; `typen.ts` wird nicht angefasst. |

## 1. Ziel und Abnahme (Vorschlag für die A91-Zeile im Lastenheft)
**A91** (Soll, aus NR15) – **Haus hängt an der Leitung, die es versorgen kann.** Ein Haus hängt an seinem eigenen Leitungsende (Hausanschluss, A57), auch wenn das zu dünn ist (dann kalt mit „Leitung zu dünn“). Hat es keins und wäre es an der zuerst gefundenen Leitung wegen Überlast kalt, hängt es an einer anderen angrenzenden Leitung, die es mit der übrigen Last noch trägt. Eine Leitung wird nicht über ein dünneres Feld gespeist, wenn ein gleich naher, mindestens so dicker Nachbar die Last dahinter trägt. Kein bisher warmes Haus wird durch die neue Regel kalt.
Abnahme:
1. Eine neben ein warmes Haus gelegte dünne Leitung macht es nicht kalt (Aufbau 6) – P1.
2. Hausanschluss Reihenhaus (4|12) im neuen Spiel: 5 Felder 32er für 2.800 € statt 13 Felder für 7.280 € – P1.
3. Vergleich alte gegen neue Regel auf 3.000 Netzen: kein Netz mit weniger warmen Häusern, kein Haus von warm auf „kalt: Leitung“, keine neue Planungsfehler-Warnung – P1 und P2.
4. Nach P3: Hausanschluss (13|12) im neuen Spiel 2 Felder 25er für 800 € statt 10 Felder für 4.000 €, alle drei Starthäuser warm, Auftrag c2 erledigt – P3.
5. Alte Spielstände laden ohne Migration (Schlüssel `waermedorf-spielstand-v1`, Version 3, `src/core/speichern.ts:7-9`) – P1.

## 2. Ursache (gelesen + nachgemessen, unverändert gültig)
`src/core/netz.ts` ist seit Fassung 1 nicht geändert (gelesen, `git diff 292b13b..HEAD` ohne `netz.ts`); die Zeilennummern unten gelten.

| Fall aus dem A89-Durchlauf | Ursache | Beleg |
|---|---|---|
| (4\|12) Reihenhaus macht (9\|13) kalt | **U1 Anschlusswahl:** Bei Gleichstand (beide Felder durchlaufend, Tiefe 3) gewinnt das erste Feld in der Reihenfolge von `rund()`. (9\|13) wandert von der 40er (10\|13) auf die neue 32er (9\|12) und überlastet sie (10 + 16 kW > 25 kW). | `netz.ts:122-143` (Wertung Z. 137), `rund` Z. 91-96 |
| (13\|12) macht (9\|13), (12\|14) kalt | **U2 Netzbaum:** Die Breitensuche hängt ein Feld an das zuerst gefundene Nachbarfeld gleicher Tiefe. Die 25er (11\|12) direkt an der Heizzentrale wird Elternfeld der 40er (10\|12). Heute nur von Hand möglich, weil A89 die Felder neben der Heizzentrale sperrt. | `netz.ts:98-118` |
| (8\|18) Mehrfamilienhaus | **U3 echte Überlast:** Die Start-40er müsste 20 + 30 kW tragen. Kein Modellfehler; der Umweg (23 Felder, 18.400 €) bleibt richtig. | Prototyp: unverändert 23 Felder |

## 3. Anschlusswahl (U1) – AE-A91-1
**Bindet:** `berechneNetz` (`netz.ts:122-143`). **Verhindert:** dass eine neue Leitung ein versorgtes Haus „wegzieht“, und dass ein Haus auf eine schon volle Leitung wechselt und andere kalt macht (Kritik B1).
**Regel (prüfbar):**
1. **Erster Durchgang = heutige Regel, unverändert:** Heizzentrale direkt (`feld -1`), sonst Leitungsende (`leitungsNachbarn ≤ 1`) vor durchlaufend, dann kleinere Tiefe, dann erste Fundstelle in `rund()`. Puffer ohne Leitung `-1` (A24).
2. **Zweiter Durchgang nur für Kunden (`istKunde`) ohne eigenes Leitungsende, mit mehr als einer angrenzenden Leitung**, in aufsteigender Objekt-ID:
   - Rest(feld) = kleinster Wert von `kapazitaet_kw × spreizung_faktor − Last` über alle Felder vom `feld` über `eltern` bis zur Heizzentrale; Last = Bedarf aller Kunden nach dem bisherigen Stand der Zuordnung.
   - Ist Rest(bisheriges Feld) ≥ 0 → bleibt.
   - Sonst wechselt das Haus auf das angrenzende Feld mit Rest ≥ eigener Bedarf (gerechnet **mit** der eigenen Last noch auf dem alten Weg – vorsichtig, nie zu optimistisch); bei mehreren das mit dem größten Rest, bei Gleichstand das erste in `rund()`.
   - Kein Wechsel, wenn dadurch am alten Feld eine neue A67-Warnung entstünde (altes Feld hätte dann kein angebundenes Haus mehr, weniger als zwei Kinder, keine Vorsehung, und ein Kind ist dünner).
   - Nach jedem Wechsel Last umbuchen (alter Weg −, neuer Weg +).
3. Wärmequellen, Häuser ohne Station und Häuser mit eigenem Leitungsende nehmen am zweiten Durchgang **nicht** teil (Spielregel PL: eigener Hausanschluss bleibt, auch zu dünn).
**Warum das sicher ist:** Ein Wechsel geschieht nur auf einen Weg, der die zusätzliche Last mit allen übrigen Lasten trägt; der alte Weg wird nur leichter. Damit kann kein Feld neu überlastet werden → kein Haus wird neu „kalt: Leitung“. Gemessen (Abschnitt 6): 0 von 3.000 Netzen schlechter.
**Nachbardörfer** (`src/core/nachbarn.ts:70`) rufen dieselbe Funktion auf und bekommen die Regel automatisch.
**Geplante Leitungen:** `berechneNetz` rechnet mit den Objekten, die es bekommt (wie heute). `neuBerechnen` (`spiel.ts:236`) lässt geplante weg, die Probe in `hausanschlussPlanen` (`spiel.ts:691-708`) nimmt sie mit.

Verworfen: gespeicherte Zuordnung Haus → Feld (zwei Wahrheiten, Migration), „dickste Leitung zuerst“ (bricht A57, und Kritik B1 Regel 4), „trägt nur nach eigenem Bedarf“ (Kritik B1).

## 4. Netzbaum (U2) – AE-A91-2 und AE-A91-3
**AE-A91-2 Bindet:** Elternwahl in `berechneNetz` (`netz.ts:98-118`). **Verhindert:** „dünn speist dick“, wo ein gleich naher, dickerer Weg existiert; aber auch Bündelung bis zur Überlast (Kritik B4) und neue Warnungen in alten Ständen (Kritik B3).
**Regel (prüfbar):**
- Breitensuche, `tiefe` und `reihenfolge` bleiben **unverändert** (Tiefe = kürzester Abstand, bestimmt weiter die Reihenfolge bei Wärmemangel, `netz.ts:234-236`).
- Danach ein Durchgang über `reihenfolge` (nach der Anschlusswahl, mit deren Lasten): Ist das Elternfeld p dünner als das Feld k (`LEITUNGSRANG`), sucht man unter den Nachbarn q mit `tiefe(q) = tiefe(k) − 1` und Rang(q) ≥ Rang(k) einen, dessen Rest(q) ≥ Last(k) (ganze Last hinter k). Gibt es mehrere, den mit dem größten Rest; sonst erste Fundstelle in `NACHBARN`.
- Kein Umhängen, wenn dadurch eine neue A67- oder A76-Warnung entstünde (an p, an k oder an q).
- Einspeisepunkte (Tiefe 1, `eltern = -1`) werden nie umgehängt.
- `reihenfolge` bleibt „Eltern vor Kind“, weil q eine kleinere Tiefe hat als k.
**AE-A91-3 (Fachprüfung B3, V-NR15-a):** Die Fließrichtung ist eine **Modellannahme** des Spiels. W1 („Rohr wird in Fließrichtung nie dicker“) wird entlang dieser angenommenen Richtung geprüft, sie legt die Richtung nicht fest. Kein Spieltext und kein Code-Kommentar behauptet, dass sich Wasser in einem echten Netz den dicksten Weg sucht. In einer Masche teilt sich der Fluss in Wirklichkeit nach Widerstand auf (Recherche L2 vorgemerkt, nicht nötig für A91).

## 5. Folgen für A89 (`spiel.ts:655-779`)
- **Probe-Rechnung bleibt** (`spiel.ts:688-708`): Sie fängt U3. Mit P1 findet sie für (4\|12) den kurzen Weg.
- **Sperre neben der Heizzentrale entfällt mit P3** (`spiel.ts:670-679`, Parameter `nebenHzOk` in `frei`/`suche` Z. 678-679, 713, 723, 757, Ersatzsuche und Meldung Z. 767). Gemessen (Prototyp P1+P2, Sperre aus): (13\|12) 2 Felder / 800 €; A89-Durchlauf über alle Orte, Stufe 1 und 2: weiterhin 41 bzw. 42 Wege, kein Anschluss macht ein vorher warmes Haus kalt. Fachlich auch gewünscht (Fachprüfung B2: keine Fachregel). Die Sperre steht im A89-Abnahmetext → Projektleiter passt das Lastenheft an (Abschnitt 8, Vorarbeit).
- **(8\|18) bleibt ein Umweg** (U3). Hinweis „Hauptleitung zu dünn – erst tauschen“ wäre Spielgefühl, nicht Teil von A91.

## 6. Prototyp-Beleg (getestet, Wegwerf-Kopie im Scratchpad)
| Was | Befehl | Ergebnis |
|---|---|---|
| Grundlinie heute | `npx vitest run` | 843/843 grün |
| Prototyp P1+P2 (Regeln aus 3 und 4) | dito | 843/843 grün (plus eigene Analysedateien) |
| Vergleich alt/neu, 3.000 Zufallsnetze (Heizzentrale 2×2 und 3×3, 1–6 Abgänge, Maschen, Häuser, Großabnehmer, Puffer, Wärmemangel) | eigene Analysedatei | **nur P1:** 0 schlechter, 45 besser, 0 Häuser warm→„kalt: Leitung“, 4 warm→„kalt: Wärme“ (alle bei Wärmemangel, Zahl warmer Häuser nicht kleiner), 0 Netze mit neuer Warnung. **P1+P2:** 0 schlechter, 90 besser, 0 warm→„Leitung“, 5 warm→„Wärme“ (alle bei Wärmemangel), 0 neue Warnungen (150 Netze mit weniger Warnungen) |
| Gegenprobe: Fassung-1-Regeln („trägt“ nach eigenem Bedarf, dickster Weg) | dito | P1: 16 Netze schlechter; dickster Weg: 54 Netze schlechter, 473 mit geänderten Warnungen – Kritik B1/B4 bestätigt |
| Aufbau 6 | eigene Testdatei | heute A an (1\|4), A und B „kalt: Leitung“; Prototyp A an (2\|5), beide warm |
| (4\|12) | dito | heute 13 Felder d32 / 7.280 €; P1: 5 Felder d32 (9\|12)…(5\|12) / 2.800 €, kein Haus kalt |
| (13\|12) | dito | heute und P1+P2: 10 Felder / 4.000 €; P1+P2+P3: 2 Felder d25 (11\|12),(12\|12) / 800 €, (9\|13),(12\|14),(13\|12) warm |
| Bäckerei mit eigenem 25er-Ende neben vorbeilaufender 50er | dito | heute und neu: bleibt am 25er-Ende, „kalt: Leitung“ (Spielregel PL) |
| Ring aus 50er und 32er an der Heizzentrale mit Last | dito | Lasten alt = neu (50er 30 kW, 32er 20 kW), alle warm; W1-Warnung an (5\|4)/(6\|4) entfällt |
| Laufzeit `hausanschlussPlanen` (8\|18), Median 25 | dito | alt ≈ 5,2–5,5 ms; P1+P2 0,92–1,22×; mit P3 0,81–0,94× |
| Laufzeit `berechneNetz`, Median 50, alt/neu abwechselnd | dito | kleines Netz (Startdorf): 1,09–1,32×, absolut ≈ 0,35 ms; Extremnetz (24×24 voll, fast alles überlastet): 1,6–2,3×, absolut ≈ 2–3 ms. Messung auf dem ausgelasteten Rechner schwankt um bis zu ±50 % |
**Folge für die Laufzeit:** Der Mehraufwand entsteht nur, wenn ein Feld überlastet ist. Im Bau deshalb: zweiten Durchgang (P1) und Umhängen (P2) **ganz überspringen**, wenn kein Feld überlastet bzw. kein Elternfeld dünner ist; Rest je Feld einmal in einem Durchlauf über `reihenfolge` rechnen und nur nach einem Wechsel neu (keine Wegschleife je Kandidat). `berechneNetz` läuft nur bei Änderungen, nicht je Bild (`spiel.ts:236`, Aufrufe nur aus Aktionen und `takt` bei Bauende) – 3 ms im Extremfall gefährden A90 nicht.

## 7. Pakete
Alle drei ändern `src/core/netz.ts` bzw. `spiel.ts` im selben Bereich → **nacheinander**. Kritischer Pfad P1 → P2 → P3 (100 % nacheinander; zulässig, weil klein: zusammen etwa ein halber Tag, und kein anderes NR15-Paket wartet). Kein Vertragspaket: `Netz` ändert sich nicht.

| Paket | Dateien | Abhängig von | Parallel möglich mit |
|---|---|---|---|
| P1 Anschlusswahl | ändern `src/core/netz.ts` (Z. 122-143 Anschlusswahl; Z. 159-160 `spreizung_faktor` nach oben ziehen); neu `tests/a91-anschluss.test.ts`, `tests/a91-vergleich.test.ts`, `tests/hilfen/netz-alt-a91.ts`, `tests/hilfen/a91-netze.ts`, `werkzeuge/a91-laufzeit.messung.ts`, `werkzeuge/vitest.messung.config.ts` | NR16-B gemergt (Abschnitt 9) | Paketen, die `netz.ts` nicht berühren (z. B. NR11) |
| P2 Netzbaum | ändern `src/core/netz.ts` (neuer Block zwischen Anschlusswahl und Lastrechnung, vor Z. 145); neu `tests/a91-netzbaum.test.ts`; erweitern eigene `tests/a91-vergleich.test.ts` | P1 | wie P1 |
| P3 A89 aufräumen | ändern `src/core/spiel.ts` (Z. 655-779 `hausanschlussPlanen`); neu `tests/a91-hausanschluss.test.ts` | P2, Tester-Vorarbeit P3, Lastenheft A89 angepasst | – |

### Bauplan P1 – Anschlusswahl (Schwierigkeit: mittel – Fachregel im Netzmodell, eng begrenzt, durch Prototyp und Vergleichstest abgesichert)
**Ändern:** `src/core/netz.ts`
- Z. 159-160 `spreizung_faktor` vor die Anschlusswahl ziehen (hängt nicht vom Anschluss ab).
- Z. 122-143 nach AE-A91-1 (Abschnitt 3): erster Durchgang wörtlich die heutige Regel; dabei je Kunde ohne Leitungsende die Liste der angrenzenden erreichten Leitungsfelder merken; zweiter Durchgang nur, wenn mindestens ein Feld überlastet ist.
- Kommentare Z. 122 und Z. 133-134 auf die neue Regel; kein Satz „Wärme sucht den dicksten Weg“ (AE-A91-3).
- Signatur `berechneNetz(objekte, innen, preisstufe, vorlauf_c?, grundgebuehr_eur?): Netz` und Typ `Netz` **unverändert**.
**Liefert:** `tests/hilfen/netz-alt-a91.ts` – eingefrorene Kopie von `berechneNetz` aus Commit 042e419 als `berechneNetzAlt` (gleiche Signatur), Kopfkommentar „eingefroren für den A91-Vergleich, nicht anpassen“. `tests/hilfen/a91-netze.ts` mit `zufallsNetz(seed: number): { objekte: Objekt[]; innen: InnenQuelle[] }` (eigener Zufall mit Startwert, kein `Math.random`) – P2 nutzt beides.
**Tests** `tests/a91-anschluss.test.ts` (Kessel Stufe 1, Preisstufe 2, `berechneNetz` direkt, synthetisch wie `tests/anpassungen.test.ts:704`; Bedarf = Katalog-Jahresverbrauch ÷ 1.500 h: EFH 10 kW, Reihenhaus 16 kW, Bäckerei 20 kW; Kapazität d25 15, d32 25, d40 40, d50 60 kW, `src/core/katalog.ts:191-206`):
- `A91: test_a91_duenne_leitung_neben_warmem_haus_macht_es_nicht_kalt` – Aufbau 6: `hz` (0\|0); `d40` x=2, y=0…7; EFH A (1\|5) mit `passendeStation(10)`; `d25` (1\|4),(0\|4); EFH B (0\|5) mit Station. Erwartet: `anschluss(A).feld = 5·24+2`, A und B in `warm`, `kalt` leer. Herleitung: B 10 kW ≤ 15 kW (25er); Hauptleitung 20 kW ≤ 40 kW. Gegenprobe heute (gemessen): A an (1\|4), beide „leitung“.
- `A91: test_a91_haus_wechselt_nur_wenn_es_dort_kalt_waere` – Haus mit zwei durchlaufenden Nachbarn gleicher Tiefe, beide tragen es → Anschluss = erste Fundstelle in `rund()` wie heute (keine Änderung ohne Not).
- `A91: test_a91_haus_wechselt_nicht_auf_volle_leitung` (Kritik B1, zweites Szenario) – Haus zwischen 25er (leer, Rest 15) und 40er, auf der schon 35 kW liegen (Rest 5); erste Fundstelle ist die 25er → bleibt an der 25er, warm; kein anderes Haus kalt.
- `A91: test_a91_eigener_zu_duenner_hausanschluss_bleibt_kalt` (Spielregel PL) – `hz` (0\|0); `d50` x=2, y=0…6; Bäckerei (1\|4) mit `passendeStation(20)`; `d25` (0\|2),(0\|3),(0\|4) (eigenes Ende an der Bäckerei). Erwartet: `anschluss.feld = 4·24+0`, `kalt.get(baeck) = 'leitung'`. Herleitung: 20 kW > 15 kW. Dazu Oberflächen-Prüfung über `tests/hilfen/kontext-attrappe.ts`: Hausblatt zeigt den Chip „Leitung zu dünn“ (`kontext.ts:159`).
- `A91: test_a91_eigenes_ende_reicht_dann_bleibt_es` – wie A57 (EFH 10 kW, d25-Ende, d50 vorbei) → Anschluss am 25er-Ende; der A57-Test `anpassungen.test.ts:704` bleibt unverändert grün.
- `A91: test_a91_hausanschluss_4_12_ohne_umweg` – `neuerSpielstand`, Kessel, Stufe 1, Abschnitt offen, `hausanschlussPlanen` für (4\|12): geplante Felder (9\|12),(8\|12),(7\|12),(6\|12),(5\|12), Typ `d32` (gemessen: `passendeLeitung(16)` liefert auf Stufe 1 d32), `abschnittKosten_eur() = 2800` (5 × 560 € laut Prototyp-Messung; Material + Gestattung je Feld aus `feldKosten`/`abschnittKosten_eur`, der Entwickler bestätigt die Zusammensetzung im Bericht); nach Station + Bau kein Haus „kalt: Leitung“.
- `A91: test_a91_spielstand_format_unveraendert` – `SPEICHER_SCHLUESSEL === 'waermedorf-spielstand-v1'`, `SPEICHER_VERSION === 3`.
- `A91: test_a91_alter_hausanschluss_satz_ist_weg` – liest `src/steuerung.ts` und `src/ui/katalog.ts` als Text: weder „ist sein Hausanschluss“ noch „ist das sein Hausanschluss“ (Fachprüfung B1; die Änderung selbst macht NR16-B, Abschnitt 9).
**Tests** `tests/a91-vergleich.test.ts` (Kritik B2):
- `A91: test_a91_vergleich_alte_regel_3000_netze` – Startwerte 1…3000 aus `zufallsNetz`; je Netz `berechneNetzAlt` gegen `berechneNetz`. Erwartet: (a) `warm.size` neu ≥ alt; (b) kein Haus warm alt und `kalt = 'leitung'` neu; (c) Haus warm alt und `kalt = 'waerme'` neu nur, wenn `verfuegbar_kw < bedarf_kw` (Wärmemangel); (d) keine Feld-Kennung in `engpass`/`reduzierung`/`aufteilung` neu, die alt nicht drin war. Ausnahmen nur über eine Liste `ERLAUBT` im Test mit Startwert und Begründung, vom Projektleiter freigegeben – zu Beginn leer. Zeitgrenze des Tests 60 s (läuft im Prototyp in ≈ 3 s).
- `A91: test_a91_vergleich_a89_durchlauf` – alle Orte, Stufe 1 und 2, jedes noch nicht angeschlossene Haus: Netz nach dem Bau mit `berechneNetzAlt` und `berechneNetz` gerechnet; dieselben vier Bedingungen.
**Messskript** `werkzeuge/a91-laufzeit.messung.ts` + `werkzeuge/vitest.messung.config.ts` (`include: ['werkzeuge/**/*.messung.ts']`), Aufruf `npx vitest run --config werkzeuge/vitest.messung.config.ts`. **Nicht** Teil von `npm test` (Zeitmessung schwankt auf ausgelasteten Rechnern). Misst je 20 Aufwärmläufe, dann 50 Läufe alt/neu abwechselnd, Median:
- M1 Startdorf mit allen per `hausanschlussPlanen` anschließbaren Häusern, Stufe 3: neu ≤ 1,2 × alt (Entscheidung PL, Kritik B5).
- M2 `hausanschlussPlanen` für (8\|18), neues Spiel, Stufe 1, Median aus 25 Läufen: Der Entwickler führt das Skript **vor** seiner Änderung (Stand 042e419 bzw. nach NR16-B) und danach aus, im selben Rechner, und nennt beide Werte; Grenze neu ≤ 1,2 × vorher. (Ein Vergleich im selben Lauf ginge nur mit einem Eingriff in `spiel.ts`, das lohnt nicht.)
- M3 Extremnetz 24×24 voll, fast alles überlastet: **nur berichtet**, feste Obergrenze Median ≤ 8 ms (halbes Bildbudget). Begründung der Abweichung von „≤ 1,2 ×“: Der Mehraufwand ist hier der eigentliche Nutzen (zweiter Durchgang); gemessen 1,6–2,3 ×, absolut ≈ 2–3 ms; `berechneNetz` läuft nicht je Bild.
Ergebnis M1–M3 mit Rechner und Zahlen in den Bericht des Entwicklers.
**Randfälle:** Großabnehmer 2×2 mit Nachbarn auf mehreren Seiten; Haus direkt an der Heizzentrale (`-1`, kein zweiter Durchgang); Wärmequellen (unverändert erster Durchgang); Puffer ohne Leitung (`-1`); Haus ohne Station (bekommt weiter einen Anschluss für die Anzeige, wechselt aber nicht); Spreizungsfaktor < 1 (A73) geht in Rest ein.
**Eskalation:** Stoppen und an den Projektleiter, wenn ein bestehender Test rot wird (im Prototyp blieben alle 843 grün), der Vergleichstest ein Gegenbeispiel findet (Startwert melden, nicht in `ERLAUBT` eintragen) oder M1/M2 über 1,2 × liegen.
**Risiko-Auslöser:** nein (keine Anmeldung, keine Daten von außen, keine neue Schnittstelle, keine Geheimnisse).

### Bauplan P2 – Netzbaum: kein „dünn speist dick“ (Schwierigkeit: schwer – Algorithmus, der die Prüfungen W1/A67/A76 speist)
**Nutzt:** aus P1 `berechneNetzAlt` (`tests/hilfen/netz-alt-a91.ts`), `zufallsNetz` (`tests/hilfen/a91-netze.ts`); in `netz.ts` die Lasten nach der Anschlusswahl und die Rest-Rechnung aus P1 (lokale Hilfsfunktion, nicht exportiert).
**Ändern:** `src/core/netz.ts` – neuer Block nach der Anschlusswahl, vor „Last in den Leitungen“ (heute Z. 145), nach AE-A91-2. Die Breitensuche Z. 98-118 bleibt **unverändert**. Kommentar mit AE-A91-3 (Modellannahme). Block überspringen, wenn kein Feld ein dünneres Elternfeld hat.
**Tests** `tests/a91-netzbaum.test.ts`:
- `A91: test_a91_hauptleitung_nicht_ueber_duenne_leitung_gespeist` – neues Spiel, Kessel, Stufe 1; `d25` auf (11\|12),(12\|12) von Hand gesetzt; (13\|12) mit Station. Erwartet: `eltern.get(12·24+10) = 11·24+10` (also (10\|11)), `tiefe.get(12·24+10) = 2` wie heute, `engpass` leer, (9\|13),(12\|14),(13\|12) warm. Herleitung: 40er-Strang trägt 20 kW (9\|13)+(12\|14) ≤ 40; 25er trägt 10 kW (13\|12) ≤ 15. Gegenprobe heute: Elternfeld (11\|12), zwei Häuser kalt.
- `A91: test_a91_zwei_abgaenge_ring_last_bleibt_verteilt` (Kritik B4) – `hz` (0\|0) 2×2; `d50` (2..6\|0) und (6\|1..4); `d32` (0\|2..4) und (1..5\|4); EFH mit Station an (3\|1),(5\|1),(7\|3),(3\|5),(5\|5); Kessel Stufe 5. Erwartet: `last_kw.get(2) = 30` (50er-Abgang: (3\|1),(5\|1),(7\|3)), `last_kw.get(2·24) = 20` (32er-Abgang: (3\|5),(5\|5)), alle 5 warm, `engpass` leer, `eltern.get(4·24+6) = 3·24+6`. Gegenprobe heute (gemessen): Lasten gleich, aber W1-Warnung an (5\|4),(6\|4).
- `A91: test_a91_umhaengen_nur_wenn_neuer_weg_traegt` – wie Ring, aber Last so, dass der dicke Weg die Last hinter k nicht trägt → Elternfeld bleibt wie heute.
- `A91: test_a91_tiefe_bleibt_kuerzester_abstand` – für Start-Dorf, Aufbau 6 und Ring: `tiefe` neu = `tiefe` aus `berechneNetzAlt` (Kritik B3).
- `A91: test_a91_reihenfolge_eltern_vor_kind` – für jedes Feld steht `eltern` vorher in `reihenfolge` (Start-Dorf, Ring, 200 Zufallsnetze).
**Erweitern (eigene Datei aus P1):** `tests/a91-vergleich.test.ts` läuft unverändert weiter und muss mit P2 grün bleiben (Prototyp: 0 schlechter, 0 neue Warnungen).
**Randfälle:** Heizzentrale 3×3 (ab Stufe 3, mehrere Einspeisepunkte); Vorsehung (A69) zählt als Abzweig wie heute; nicht verbundene Leitungen bleiben ohne Tiefe.
**Eskalation:** Stoppen, wenn ein bestehender A67/A76-Test rot wird, der Vergleichstest ein Gegenbeispiel findet oder M1/M2 über 1,2 × liegen.
**Risiko-Auslöser:** nein.

### Bauplan P3 – A89 aufräumen (Schwierigkeit: einfach – Sperre und Meldung entfernen, Verhalten durch Probe-Rechnung abgesichert)
Erst nach P2, Tester-Vorarbeit und angepasstem A89-Abnahmetext (Abschnitt 8).
**Ändern:** `src/core/spiel.ts`, nur `hausanschlussPlanen` (Z. 655-779):
- Sperre `nebenHz` samt Kommentar entfernen (Z. 670-677), `frei` ohne Parameter `nebenHzOk` (Z. 678-679), `suche` ohne zweiten Parameter (Z. 713, 723, 757).
- Ersatzsuche und Meldung „direkt neben der Heizzentrale darf …“ entfernen (Z. 767; Fachprüfung B2).
- Kommentar Z. 697 („Ersatzsuchen … neben der Heizzentrale“) und Z. 688-690 auf den neuen Stand; Probe-Rechnung bleibt.
- Die Meldungen „Kein Weg gefunden, bei dem alle Häuser warm bleiben“ und „Kein Weg zu einer Leitung gefunden“ bleiben.
**Tests** `tests/a91-hausanschluss.test.ts`:
- `A91: test_a91_hausanschluss_13_12_zwei_felder` – neues Spiel, Kessel, Stufe 1, Abschnitt offen: geplante Felder (11\|12),(12\|12), Typ `d25`, `abschnittKosten_eur() = 800` (gemessen); nach Station + Bau (9\|13),(12\|14),(13\|12) warm, `pruefeAuftraege` meldet c2 erledigt.
- `A91: test_a91_kein_hinweis_auf_heizzentrale_mehr` – Quelltext von `src/core/spiel.ts` enthält „darf der Hausanschluss nicht liegen“ nicht mehr.
- `A91: test_a91_durchlauf_ohne_sperre` – alle Orte, Stufe 1 und 2: mindestens 41 bzw. 42 Wege, kein Anschluss macht ein vorher warmes Haus kalt (gemessen: 41/42, 0).
**Eskalation:** Stoppen, wenn der Durchlauf ein neu kaltes Haus meldet.
**Risiko-Auslöser:** nein.

## 8. Vorarbeit (nicht für den Entwickler)
- **P1, P2:** keine (nur neue Test- und Hilfsdateien).
- **P3 → Tester-Vorarbeit** (eigener Commit vor P3, Lektion „Tester vorab“):
  - `tests/a89-hausanschluss.test.ts`: Tests Z. 56 („legt kein Feld direkt neben die Heizzentrale“) und Z. 68 („geht es nur über ein Feld neben der Heizzentrale, wird kein Weg geplant“) entfernen; Durchlauf Z. 85: Teil „keiner liegt neben der Heizzentrale“ streichen, „kein Haus neu kalt“ und Mindestzahl Wege bleiben; Konstante `NEBEN_HZ` und `nebenHzVon` entfernen, falls unbenutzt.
  - `tests/a89-hausanschluss-meldung.test.ts`: Test Z. 55 („nennt der Hinweis die Heizzentrale als Grund“) entfernen (fehlte in Fassung 1).
- **P3 → Projektleiter:** A89-Zeile im Lastenheft (`docs/lastenheft.md:107`) ohne den Satz „belegt keine Felder direkt neben der Heizzentrale“; Grund: NR15 behebt die Ursache im Netzmodell, die Probe-Rechnung bleibt.
- **Architekt:** keine Änderung an `tests/architektur/` nötig. Vorschlag (optional, Architekt-Vorarbeit P1): Architekturtest „`src/` importiert nichts aus `tests/`“ – verhindert, dass die eingefrorene Kopie `netz-alt-a91.ts` versehentlich ins Spiel gerät. Heute gibt es keinen solchen Import (gelesen).

## 9. NR16-B: Kollisionen und Reihenfolge
NR16-B baut nach DESIGN 12.16–12.19 Reiter, Meldungsposition, Zeichenleiste 216 px und `aria-disabled` statt `disabled`, dazu die Kleinpunkte K1–K4 aus dem A92-Review.

| Datei | NR16-B (erwartet, aus DESIGN 12.16–12.19 und K1–K4) | NR15 | Kollision |
|---|---|---|---|
| `src/steuerung.ts` | `stempeln` Z. 147-160 (Zeichenleiste, Erklärtext hinter „?“), `modusBlattOeffnen` Z. 163-170, Kamera 0,46/400 (Z. 127) | Fachprüfung B1: Satz „Eine Leitung, die an ein Haus grenzt, ist sein Hausanschluss“ in Z. 150 | **ja, gleiche Zeile** |
| `src/ui/katalog.ts` | Reiter Z. 53-54 (12.16) | Fachprüfung B1: Satz „Grenzt eine Leitung an ein Haus, ist das sein Hausanschluss“ in Z. 79 | ja, gleiche Funktion `aufbauen`/`abschnittKasten` |
| `src/ui/kontext.ts` | gesperrte Knöpfe `anschlussWeg` Z. 190-205, K1 Großabnehmer, `aria-disabled` | P1-Test liest nur den Chip Z. 159 (keine Änderung) | nein (nur lesend) |
| `src/ui/bausteine.ts` | `knopf` Z. 13 `disabled` → `aria-disabled`, Wackeln | – | nein |
| `src/ui/toast.ts`, `src/ui/blatt.ts`, `src/ui/symbole.ts`, `src/ui/stil.css`, `src/ui/tokens.ts` | 12.16–12.19 | – | nein |
| `src/core/spiel.ts` | möglich: Hinweis „Noch nichts gezeichnet“ in `letzteLeitungZurueck`, Sperre Großabnehmer (K1) | P3: nur `hausanschlussPlanen` Z. 655-779 | gleiche Datei, anderer Bereich – kein Merge-Konflikt zu erwarten, aber nacheinander mergen |
| `src/core/netz.ts` | – | P1, P2 | nein |
| `tests/a92-anschlussweg.test.ts`, `tests/oberflaeche.test.ts`, `tests/design-kann12.test.ts` | prüfen heute `disabled` bzw. Blattinhalt → wohl Tester-Vorarbeit NR16-B | – | nein |
| `tests/a89-*.test.ts` | – | Tester-Vorarbeit P3 | nein |

**Empfehlung:**
1. Die Textänderung aus Fachprüfung B1 **wird Teil von NR16-B** (dort werden genau diese Sätze ohnehin umgebaut). Wortlaut-Vorschlag, Projektleiter legt fest: „Grenzt eine Leitung an ein Haus, kann es darüber Wärme bekommen. Am besten endet ein eigenes Leitungsstück am Haus – das ist sein Hausanschluss.“ (gilt schon heute, hängt nicht von A91 ab). P1 enthält dann nur den Prüftest `test_a91_alter_hausanschluss_satz_ist_weg`. Schafft NR16-B das nicht, bekommt P1 die zwei Zeilen dazu – dann aber erst nach dem Merge von NR16-B.
2. Reihenfolge: NR16-B → P1 → P2 → P3. P1/P2 könnten technisch parallel zu NR16-B laufen (keine gemeinsamen Dateien außer dem Prüftest), aber nur, wenn der Text nach Punkt 1 geregelt ist.
3. Die DESIGN-12.19-Vorlage für den T-Stück-Hinweis („die schließen von selbst an die Leitung an“) ist mit A92 durch `tStueckHinweis` (`kontext.ts:35`) ersetzt; NR15 ändert daran nichts.

## 10. Risiken
- **R1 (P2, neu bewertet, Sicherheit 20):** Bündelung bis zur Überlast ist durch die Rest-Prüfung ausgeschlossen; in 3.000 Netzen kein Fall. Rest-Risiko: Wärmemangel-Reihenfolge (Tiefe unverändert, aber angeschlossenes Feld kann wechseln) – gemessen 5 Häuser warm→„kalt: Wärme“, alle bei Wärmemangel, Zahl warmer Häuser nie kleiner; im Vergleichstest als Bedingung (c) abgesichert.
- **R2 (P1):** Ein Haus kann den Anschluss wechseln, wenn sich Lasten ändern (z. B. ein neues Haus auf derselben Leitung). Die Abzweig-Zeichnung zum Haus kann dann springen (nicht geprüft, ob `src/render/szene.ts:375-395` dem Netz-Anschluss oder nur den Nachbarleitungen folgt). Im Spieltest beobachten.
- **R3:** Rechenzeit – Abschnitt 6 und Messskript; Grenze M1/M2 1,2 ×.
- **R4:** Die eingefrorene Kopie im Vergleichstest ist doppelter Code. Sie gilt nur für A91; ändert ein späteres Paket `berechneNetz` absichtlich, entscheidet der Projektleiter, ob der Vergleichstest angepasst oder entfernt wird.

## 11. Offene Punkte
- **Projektleiter:** Wortlaut Fachprüfung B1 (Abschnitt 9) an NR16-B geben; A89-Abnahmetext anpassen (Abschnitt 8); P3 freigeben.
- **Fachprüfer** nach dem Bau (Modus `ergebnis`): neue Kommentare in `netz.ts` gegen AE-A91-3, A67/A76-Tests.
- Recherche L1 (ein Hausanschluss je Gebäude) und L2 (Maschen) bleiben vorgemerkt, für A91 nicht nötig.
- Später, Spielgefühl: bei echter Überlast wie (8\|18) Hinweis „Hauptleitung zu dünn – erst tauschen“ statt langem Umweg (eigenes NR).
