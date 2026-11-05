# Bericht architekt – 2026-11-05 18:19

🟡 **Fassung 3 des NR15-Bauplans ist geschrieben und vollständig. Ein Prototyp hat Variante (a) bestätigt. Gelb, weil zwei neue Pflichttests nicht im Prototyp nachgerechnet sind und drei Punkte noch eine Entscheidung brauchen.**

Geändert habe ich nur `/home/user/W-rmenetz-Dorf/docs/bauplaene/NR15-netzmodell.md`. Die Übergabedatei `docs/bauplaene/NR15-uebergabe-fassung3.md` habe ich gelöscht. Nichts committet. `docs/DESIGN.md` ist ebenfalls geändert, das war nicht ich. Mein Kontext war am Ende voll; der Plan ist trotzdem fertig, es bleibt nur das Offene unten.

## Prototyp-Ergebnis (getestet)
Der Prototyp ist eine Wegwerf-Kopie des Projekts im Scratchpad (`/tmp/claude-0/-home-user-W-rmenetz-Dorf/689e9066-6050-59dc-abe0-ac861071fa0f/scratchpad/proto`). Der Zufallsgenerator erzeugt jetzt auch Wärmequellen, Abwärme, Upgrades, Hauspuffer, wechselnde Vorlauftemperaturen und zwei Leitungen nebeneinander mit Häusern dazwischen.

**Vergleich alte gegen neue Regel, 3.000 Zufallsnetze:**
- 0 Häuser werden von warm auf kalt.
- Die verfügbare Wärme ist in allen 3.000 Netzen gleich.
- 0 Netze haben eine neue Planungsfehler-Warnung.
- 340 Netze sind besser als heute.
- Die neuen Regeln wurden tatsächlich ausgelöst: 375 Netze mit Anschlusswechsel, 180 mit Umhängen, 2.673 mit Wärmemangel, 37 Großabnehmer-Wechsel.

**Gegenproben (der Test muss dann rot werden):**
- Ohne „zuletzt bedienen“: 106 Häuser von warm auf kalt, 6 Netze mit weniger warmen Häusern. Die Behauptung aus Fassung 2 „die Zahl warmer Häuser sinkt nie“ war also falsch.
- Ohne Sperre für Teilstücke mit Wärmequelle: 13 Netze mit anderer verfügbarer Wärme.
- Ohne Schutz vor A67-Warnungen beim Wechsel: 9 Netze mit neuer Warnung.

**Neuer Befund (Sicherheit 95):** Die Regel aus Fassung 2 rechnete die eigene Last des Hauses auf dem gemeinsamen Leitungsstück doppelt. Dann wechselt (9|13) nicht, und (4|12) bekommt wieder 13 Felder für 7.280 €. Abnahme 2 wäre damit nie erreicht worden. Mit der Korrektur in Fassung 3 sind es 5 Felder 32er für 2.800 €. (13|12) nach P3: 2 Felder für 800 €.

**Herleitung der 560 € je Feld:** 14 € Material für die 32er mal Kostenfaktor 40 (`katalog.ts:197, 347, 398`). Gestattung, Anbohrung und Bohrung sind dort 0.

**Laufzeit (Laptop):**
| Messung | alt | neu | Grenze im Plan |
|---|---|---|---|
| Netzrechnung Startdorf voll | 0,32–0,51 ms | 0,81–0,94 ms | ≤ 2 ms |
| Netzrechnung Extremnetz | 1,3–1,4 ms | 2,4–2,7 ms | ≤ 8 ms |
| Hausanschluss (8|18) | 5,1–6,3 ms | 4,7–5,0 ms | ≤ 10 ms |
| Hausanschluss im Extremnetz | 44 ms | 51 ms bei 19 Netzrechnungen | ≤ 100 ms |

Eine erste Version der Korrektur brauchte im Extremnetz 12 ms. Der Plan schreibt deshalb ausdrücklich vor, die Restkapazität nicht für jeden Kandidaten neu über das ganze Netz zu rechnen.

**Durchlauf Hausanschluss, alle Orte:** Stufe 1 hat 41 Wege, Stufe 2 hat 42 Wege. In keinem Fall wird ein vorher warmes Haus kalt. Anschlüsse mit neuer Warnung in Stufe 2: heute 2, mit der neuen Warnprüfung 1.

Gesamtlauf mit allen Fassung-3-Regeln: 843 von 843 Tests grün.

## Was in Fassung 3 steht
- **Neues Vorpaket P0** (eingefrorene alte Rechnung, Zufallsgenerator, Vergleichstest). Es läuft parallel zu NR16-B2. Darin:
  - Inhalt des Generators ist festgeschrieben, mit Mindestzahlen für die Abdeckung.
  - Ein Selbsttest zeigt, dass die Prüfung einen Verstoß auch erkennt.
  - Die eingefrorene Kopie bringt alle Hilfsfunktionen selbst mit und holt nichts aus `src/core/netz.ts`.
- **Variante (a):** Häuser, die erst durch die neue Regel warm werden können, bekommen bei Wärmemangel zuletzt Wärme. Die Bedingung „verfügbare Wärme“ heißt jetzt „gleich“ statt „mindestens so viel“: Bei der Verteilung kann mehr Wärme sonst ein Haus verdrängen, das vorher noch Platz hatte.
- **Gleitkomma:** Es gibt nur noch eine Prüffunktion für alle Stellen. Ein Wechsel oder Umhängen bleibt nur, wenn diese Prüfung danach besteht.
- P2 hängt keine Leitungsstücke mehr um, an denen eine Wärmequelle, ein Puffer oder Abwärme hängt.
- Alle Tests sind mit Koordinaten, Lastwerten und dem Ergebnis der alten Rechnung beschrieben: Klinik bei Wärmemangel, Ring trägt / trägt nicht, volle Leitung, Abkürzung neben der Heizzentrale.
- P3: Die Hausanschluss-Suche lehnt Wege ab, die neue Planungsfehler erzeugen, mit Rückfall (siehe unten).
- Messskript liegt in `tools/`, alle vier Zeitgrenzen sind hart.
- Alle Rückfragen des Kritikers (P1 1–15, P2 1–5, P3 1–3) sind beantwortet, als Tabelle am Ende des Plans.

## Nicht geprüft
Zwei P2-Pflichttests habe ich nur beschrieben, nicht im Prototyp nachgerechnet:
- „kein Umhängen mit Wärmequelle im Leitungsstück“: Die genaue Lage der Solaranlage überlässt der Plan dem Entwickler.
- „Heizzentrale 3×3 mit mehreren Einspeisepunkten“.

Der Entwickler muss für beide Aufbau und erwartete Werte erst selbst bestätigen.

## Offene Fragen
1. **Projektleiter: Rückfall in P3 bestätigen?** Gibt es keinen Weg ohne neue Warnung, nimmt die Suche den Weg wie heute. Ohne Rückfall kann in Stufe 2 ein Haus nicht mehr angeschlossen werden (41 statt 42 Wege). Mit Rückfall kosten alle Anschlüsse in Stufe 2 zusammen 22.680 € mehr als ohne Warnprüfung.
2. **Projektleiter:** Die Bestätigung des Fachprüfers für die Regel „eigener zu dünner Hausanschluss bleibt kalt“ steht laut `ENTSCHEIDUNGEN.md:119` noch aus.
3. **Simon:** Variante (a) „zuletzt bedienen“ ist eingeplant. Er kann noch auf „wer näher liegt, zuerst“ umentscheiden.
4. **Optionaler Architekturtest:** „`src/` importiert nichts aus `tests/`“, damit die eingefrorene Kopie nie ins Spiel gerät.
