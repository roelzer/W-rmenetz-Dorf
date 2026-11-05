# Bauplan NR15 → A91 „Haus hängt an seiner Leitung“ (Fassung 3)

Stand 2026-11-05, Architekt. Basis: Branch `claude/keen-mccarthy-f4p5us`; `src/core/netz.ts` und `src/core/spiel.ts` seit 042e419 unverändert (getestet: `git diff 042e419..HEAD -- src/core/netz.ts src/core/spiel.ts` leer). **843 Tests grün** (getestet im Prototyp, Wegwerf-Kopie im Scratchpad: `npx vitest run --exclude 'tests/proto-*'` → 843 passed).
Fassung 3 arbeitet die Kritiker-Nachprüfung `docs/pruefberichte/20261105-175123-kritiker-ad725001787fa6abd.md` (Befunde 1–7, Rückfragen P1 1–15, P2 1–5, P3 1–3) und die Entscheidung `docs/ENTSCHEIDUNGEN.md` vom 2026-11-05 („Kritiker-Nachprüfung Fassung 2 → Fassung 3“, Variante (a)) ein. Alle Zahlen in Abschnitt 6 sind **getestet** am Prototyp. Kein Produktivcode in diesem Plan.

## 0. Was sich gegenüber Fassung 2 ändert
| Punkt | Umgang in Fassung 3 |
|---|---|
| Befund 1 (Wärmemangel, Verdrängung) | **Variante (a), AE-A91-4:** Wer erst durch A91 warm werden kann („begünstigt“), wird bei der Wärmeverteilung zuletzt bedient. Gemessen: 0 Häuser warm→kalt; ohne diese Regel 106 Häuser warm→kalt und 6 Netze mit weniger warmen Häusern (Abschnitt 6). Der Satz „Zahl warmer Häuser sinkt nie“ aus Fassung 2 war damit **falsch**, er ist jetzt durch die Regel garantiert. |
| **Neu gefunden: Rest „mit eigener Last“ verhindert Abnahme 2** | Fassung 2 rechnete die Restkapazität des neuen Felds *mit* der eigenen Last noch auf dem alten Weg. Auf dem gemeinsamen Wegstück zählt sie dann doppelt: (9\|13) wechselt nicht, (4\|12) bekommt wieder 13 Felder / 7.280 € (getestet). Fassung 3: Rest **ohne** die eigene Last, Sicherheit über die exakte Endprüfung (AE-A91-1, Schritt 4). Danach 5 Felder / 2.800 € (getestet). |
| Befund 2 (Generator zahm) | Vorpaket **P0** mit festgeschriebenem Generator-Inhalt, Mindestzahlen und Prüfer-Selbsttest; Gegenproben einmalig in einer Wegwerf-Kopie. |
| Befund 3 (Quellen im umgehängten Teilbaum) | P2 hängt keinen Teilbaum um, in dem eine Wärmequelle, ein Puffer oder Abwärme angeschlossen ist. Neue Bedingung (e) `verfuegbar_kw` neu **gleich** alt (nicht nur ≥, Begründung in AE-A91-4). |
| Befund 4 (Tests lösen nichts aus) | Neue Pflichttests mit Koordinaten, Lastwerten und Gegenstück (Abschnitt 7). |
| Befund 5 (P3 erzeugt Planungsfehler) | Probe-Rechnung lehnt Wege mit neuen Feldern in `engpass`/`reduzierung`/`aufteilung` ab, mit Rückfall (Abschnitt 5). Test „Abkürzung neben der Heizzentrale“. |
| Befund 6 (Laufzeit) | Absolute Grenzen: M1 ≤ 2 ms, M2 ≤ 10 ms, M3 ≤ 8 ms, M4 ≤ 100 ms, alle hart (Eskalation). |
| Befund 7 | Abhängigkeit „NR16-B2 gemergt“; Messskript nach `tools/` (steht in `tsconfig.json:14`). |
| Gleitkomma (Kritik, unsicher 65) | Behalten wird ein Wechsel/Umhängen nur, wenn die **Endprüfung selbst** (dieselbe Funktion, dieselbe Summierreihenfolge) danach besteht. |

## 1. Ziel und Abnahme (Vorschlag für die A91-Zeile im Lastenheft)
**A91** (Soll, aus NR15) – **Haus hängt an der Leitung, die es versorgen kann.** Ein Haus hängt an seinem eigenen Leitungsende (Hausanschluss, A57), auch wenn das zu dünn ist (dann kalt mit „Leitung zu dünn“). Hat es keins und wäre es an der zuerst gefundenen Leitung wegen Überlast kalt, hängt es an einer anderen angrenzenden Leitung, die es mit der übrigen Last noch trägt. Eine Leitung wird nicht über ein dünneres Feld gespeist, wenn ein gleich naher, mindestens so dicker Nachbar die Last dahinter trägt. Häuser, die erst dadurch warm werden können, bekommen bei Wärmemangel als letzte Wärme. Kein bisher warmes Haus wird durch die neue Regel kalt, auch nicht beim Laden alter Spielstände.
Abnahme:
1. Eine neben ein warmes Haus gelegte dünne Leitung macht es nicht kalt (Aufbau 6) – P1.
2. Hausanschluss Reihenhaus (4\|12) im neuen Spiel: 5 Felder 32er für 2.800 € statt 13 Felder für 7.280 € – P1.
3. Vergleich alte gegen neue Regel auf 3.000 Zufallsnetzen: kein Haus warm→kalt, gleiche verfügbare Wärme, keine neue Planungsfehler-Warnung – P0 (Werkzeug), P1 und P2 (Wirkung).
4. Bei Wärmemangel bleibt ein Haus, das schon warm war, warm, auch wenn ein Großabnehmer durch A91 versorgbar wird (Klinik-Test) – P1.
5. Nach P3: Hausanschluss (13\|12) im neuen Spiel 2 Felder 25er für 800 € statt 10 Felder für 4.000 €, alle drei Starthäuser warm, Auftrag c2 erledigt – P3.
6. Alte Spielstände laden ohne Migration (Schlüssel `waermedorf-spielstand-v1`, Version 3, `src/core/speichern.ts:7-9`) – P1.

## 2. Ursache (unverändert gültig)
| Fall (A89-Durchlauf) | Ursache | Beleg |
|---|---|---|
| (4\|12) macht (9\|13) kalt | **U1 Anschlusswahl:** Gleichstand (beide durchlaufend, gleiche Tiefe) → erste Fundstelle in `rund()`; (9\|13) wandert auf die neue 32er (9\|12) und überlastet sie (10 + 16 kW > 25 kW). | `netz.ts:122-143`, `rund` Z. 94-99 |
| (13\|12) macht (9\|13), (12\|14) kalt | **U2 Netzbaum:** Breitensuche hängt ein Feld an den zuerst gefundenen Nachbarn gleicher Tiefe; die 25er (11\|12) wird Elternfeld der 40er (10\|12). | `netz.ts:98-118` |
| (8\|18) Mehrfamilienhaus | **U3 echte Überlast**, kein Modellfehler; Umweg (23 Felder, 18.400 €) bleibt. | Prototyp unverändert |

## 3. AE-A91-1 Anschlusswahl (U1)
**Bindet:** `berechneNetz` (`netz.ts:122-165`). **Verhindert:** dass eine neue Leitung ein versorgtes Haus „wegzieht“, und dass ein Wechsel eine Leitung neu überlastet.
**Begriffe (Festlegung):**
- **Endprüfung** = die heutige Prüfung `kapazitaet_ok` (`netz.ts:161-165`): Last je Feld aus der Baumsumme (eigene Kunden des Felds, dann rückwärts über `reihenfolge` zum Elternfeld), ok wenn Elternfeld ok und `last ≤ kapazitaet_kw × spreizung_faktor`. Sie wird in eine **lokale Funktion** `endpruefung(anschluss, eltern): Map<number, boolean>` gezogen und an *allen* Stellen benutzt (Auslöser, Wechsel-Prüfung, Umhängen-Prüfung, Endergebnis, Begünstigt). Ein einziger Ausdruck, eine Summierreihenfolge → kein Gleitkomma-Widerspruch (Lektion „Grenzwerte mit Gleitkomma“).
- **Eigenes Leitungsende:** Das Anschlussfeld aus Durchgang 1 hat ≤ 1 Leitungsnachbarn (`leitungsNachbarn`, Heizzentrale zählt nicht). Alle Leitungsnachbarn eines erreichten Felds sind selbst erreicht, es zählt also automatisch nur der angebundene Teil. Weil Durchgang 1 Enden vorzieht, ist das gleichbedeutend mit „irgendein angrenzendes erreichtes Feld ist ein Ende“. Ein Hauptstrang, der an einem Haus endet, ist dessen eigenes Ende; das Haus wechselt dann nie (bewusst angenommen, Kritik-Beobachtung 55).
- **Kandidatenfelder:** nur erreichte Felder (mit `tiefe`), die an den Kunden grenzen.
**Regel (prüfbar):**
1. **Durchgang 1 = heutige Regel, unverändert** (Heizzentrale `-1`, Ende vor durchlaufend, kleinere Tiefe, erste Fundstelle in `rund()`; Puffer ohne Leitung `-1`). Dabei Zustand sichern: `anschlussAlt` und `elternAlt` (Kopien vor jeder Änderung).
2. **Auslöser:** `okAlt = endpruefung(anschlussAlt, elternAlt)`. Hat kein Feld `false` → Durchgang 2 entfällt ganz (Laufzeit).
3. **Teilnehmer**, in aufsteigender Objekt-ID: `istKunde`, kein eigenes Ende, ≥ 2 Kandidatenfelder, und `okAlt(altFeld) = false`. Nicht teilnehmen: Wärmequellen, Puffer, Gewerbe (kein Kunde), Häuser ohne Station, Häuser mit eigenem Ende (Spielregel PL: eigener Hausanschluss bleibt, auch zu dünn).
4. Je Teilnehmer: Besteht das alte Feld die **aktuelle** Endprüfung (nach früheren Wechseln) → bleibt. Sonst:
   - Vorfilter je Kandidat k ≠ alt: `restOhne(k)` = kleinster Wert von `kapazitaet_kw × spreizung_faktor − last` über den Weg von k zur Heizzentrale, wobei auf Feldern, die auch auf dem alten Weg liegen, die eigene Last **nicht** mitzählt (dort `+ bedarf`). Rechnen: vom Kandidaten aufwärts bis zum ersten Feld des alten Wegs, ab dort den gespeicherten Rest + Bedarf nehmen (kein voller Neulauf je Kandidat – sonst 12 ms im Extremnetz, gemessen).
   - Zulässig, wenn `restOhne(k) ≥ bedarf` und am alten Feld keine neue A67-Warnung entsteht (Bedingung wie `netz.ts:183-186` auf dem Baum der Breitensuche: altes Feld hätte danach kein angebundenes Haus, < 2 Kinder, keine Vorsehung, und ein Kind ist dünner).
   - Wahl: größter `restOhne`, bei Gleichstand erste Fundstelle in `rund()`.
   - **Probehalber umhängen, `endpruefung` neu rechnen; behalten nur, wenn das neue Feld besteht**, sonst zurück und kein Wechsel. (Gemessen: 0 von 602 Wechseln zurückgenommen – die Prüfung ist Absicherung, nicht Regel.)
5. Die Tiefe des Hauses ist die Tiefe seines neuen Felds.
**Warum sicher:** Ein Wechsel bleibt nur, wenn die Endprüfung selbst ihn trägt; der alte Weg wird nur leichter (Gleitkomma-Addition positiver Werte ist monoton). Also wird kein Feld neu überlastet, kein Haus neu „kalt: Leitung“. Die Wärmeseite sichert AE-A91-4.
**Nachbardörfer** (`src/core/nachbarn.ts:70`) bekommen die Regel automatisch. Geplante Leitungen wie heute (`neuBerechnen` ohne, Probe in `hausanschlussPlanen` mit).

## 4. AE-A91-2 Netzbaum (U2), AE-A91-3 Modellannahme, AE-A91-4 Wärmeverteilung
**AE-A91-2 Bindet:** Elternwahl in `berechneNetz` nach der Anschlusswahl. **Verhindert:** „dünn speist dick“ bei gleich nahem dickerem Weg; Bündelung bis zur Überlast; weniger Einspeisung.
- Breitensuche, `tiefe`, `reihenfolge` **unverändert** (Tiefe = kürzester Abstand).
- Danach ein Durchgang über `reihenfolge`: Feld k mit Elternfeld p, Rang(p) < Rang(k) (`LEITUNGSRANG`). Kandidaten q: Nachbar mit `tiefe(q) = tiefe(k) − 1`, q ≠ p, Rang(q) ≥ Rang(k).
- **Restkapazität über q wird auf dem aktuellen Baum gerechnet, die Last hinter k noch über p** (wie in P1 vorsichtig: das gemeinsame Stück ab dem gemeinsamen Vorfahren zählt doppelt; das ist hier gewollt, weil ein Umhängen nie nötig ist, damit etwas warm bleibt). Zulässig, wenn `Rest(q) ≥ Last(k)`.
- **Nie umhängen**, wenn im Teilbaum von k (Baum der Breitensuche) ein Objekt der Kategorie `waerme` (Wärmequelle, Puffer) oder ein `gewerbe` angeschlossen ist (Befund 3). Den Teilbaum vorab einmal rückwärts über `reihenfolge` markieren; er ändert sich während des Durchgangs nicht (Umhängen geht nur zu kleinerer Tiefe).
- **Keine neue Warnung** an p, k, q, konkret:
  - p verliert k: hat p danach < 2 Kinder, kein angebundenes Haus und keine Vorsehung, und ist ein verbleibendes Kind dünner als p → neue A67 an p → nicht umhängen.
  - k an q: ist k dünner als q und q (mit k) kein Abzweig (< 2 Kinder, kein Haus, keine Vorsehung) → neue A67 → nicht umhängen.
  - q bekommt k: hätte q danach ≥ 2 Kinder mit Rang ≥ Rang(q), vorher < 2 → neue A76 → nicht umhängen.
- Einspeisepunkte (Tiefe 1) nie umhängen. Mehrere: erster in `NACHBARN`-Reihenfolge mit größtem Rest.
- Probehalber umhängen, `endpruefung` neu; behalten nur, wenn q besteht (gemessen 0 von 268 zurückgenommen).
- Durchgang überspringen, wenn kein Feld ein dünneres Elternfeld hat.

**AE-A91-3 (Fachprüfung B3):** Die Fließrichtung ist eine Modellannahme. W1 wird entlang dieser Richtung geprüft. Kein Text und kein Kommentar behauptet, Wasser suche sich den dicksten Weg.

**AE-A91-4 (Entscheidung Variante (a), PL 2026-11-05) Bindet:** Wärmeverteilung `netz.ts:230-245`. **Verhindert:** dass ein durch A91 versorgbar gewordenes Haus näheren, bisher warmen Häusern die Wärme wegnimmt (auch beim Laden alter Stände).
- **Begünstigt** = Kunde, dessen Anschlussfeld in `okAlt` (Durchgang 1, Baum der Breitensuche) `false` ist und im Endergebnis nicht (oder neu `-1`). Nur rechnen, wenn P1 oder P2 etwas geändert hat; sonst leer.
- Sortierung: erst nicht begünstigt vor begünstigt, dann Tiefe, dann ID. Sonst unverändert (wer nicht passt, wird übersprungen, spätere kleinere dürfen noch).
- **Garantie:** Die nicht Begünstigten, die Wärme anfragen, sind genau die, die es heute tun (Wechsler sind alle alt „kalt: Leitung“), mit gleicher Tiefe und ID, also gleicher Reihenfolge; `verfuegbar_kw` ist gleich (P1 bewegt keine Quellen, P2 keine Teilbäume mit Quellen). Dann bekommen sie genau dieselbe Wärme. **Gleich, nicht nur ≥**: Die Verteilung überspringt Häuser, die nicht passen; mit *mehr* Wärme kann ein vorne gewonnenes Haus ein späteres verdrängen (90 kW: 8+5 passt, danach 2 nicht mehr). Deshalb Bedingung (e) als Gleichheit.
- Der Prototyp misst: ohne Sperre der Quellen-Teilbäume 13 Netze mit mehr verfügbarer Wärme (nie weniger) – mit Sperre 0.

## 5. Folgen für A89 (`spiel.ts:655-779`) – P3
- Probe-Rechnung bleibt und fängt U3.
- Sperre neben der Heizzentrale entfällt (`spiel.ts:670-679`, Parameter `nebenHzOk` Z. 678-679, 713, 723, 757, Ersatzsuche + Meldung Z. 767).
- **Neu (Befund 5):** Ein Weg trägt nur, wenn danach kein Haus neu „kalt: Leitung“ ist **und** keine Feld-Kennung in `engpass`, `reduzierung` oder `aufteilung` neu ist (verglichen mit der Rechnung `kaltVorher` auf `probeObjekte`, also derselben Grundlage). Cache-Schlüssel enthält, ob die Warnprüfung aktiv ist.
- **Rückfall (Empfehlung Architekt, Projektleiter bestätigt):** Findet die Suche keinen Weg ohne neue Warnung, läuft sie einmal ohne Warnprüfung (wie heute). Grund, gemessen: ohne Rückfall verliert Stufe 2 einen anschließbaren Hausanschluss (42 → 41). Kein neuer Spieltext; die Planungsfehler-Anzeige zeigt die Warnung wie heute.
- Gemessen (A89-Durchlauf alle Orte, getestet): Stufe 1: heute 41 Wege / 205.280 € / 0 mit neuer Warnung → F3+P3 41 / 197.600 € / 0. Stufe 2: heute 42 / 259.860 € / **2** mit neuer Warnung → F3+P3 mit Warnprüfung und Rückfall 42 / 276.360 € / 1. In allen Varianten 0 Anschlüsse mit neu kaltem Haus.
- A89-Lastenheft-Satz „belegt keine Felder direkt neben der Heizzentrale“: Projektleiter streicht ihn **beim Merge von P3** (gilt nach `ENTSCHEIDUNGEN.md:129`; Fassung 2 Abschnitt 7 sagte „vorher“ – damit erledigt).

## 6. Prototyp-Beleg (getestet, Wegwerf-Kopie im Scratchpad)
Prototyp = Projekt-Kopie mit Schaltern in `netz.ts`/`spiel.ts`; Generator wie in P0 beschrieben (Abschnitt 7) mit 3.000 Startwerten.
| Was | Ergebnis |
|---|---|
| Gesamtlauf mit allen F3-Regeln | 843/843 grün |
| Vergleich alt/neu, **F3 (P1+P2)** | 0 Netze mit weniger warmen Häusern, **0 Häuser warm→kalt**, `verfuegbar_kw` in 0 Netzen anders, 0 Netze mit neuer Warnung; 340 Netze besser. Abdeckung: 375 Netze mit Anschlusswechsel (602 Wechsel), 180 mit Umhängen (268), 2.673 mit Wärmemangel, 37 Großabnehmer-Wechsel, 1.753 mit Quelle/Abwärme an einem Leitungsfeld, 493 Umhäng-Fälle wegen Quelle gesperrt |
| nur P1 | 0 warm→kalt, 0 neue Warnungen, 280 besser |
| Gegenprobe ohne AE-A91-4 | **106 Häuser warm→kalt, 6 Netze mit weniger warmen Häusern** → Test rot |
| Gegenprobe ohne Quellen-Sperre | 13 Netze mit anderer `verfuegbar_kw` (alle mehr) → (e) rot |
| Gegenprobe ohne A67-Schutz in P1 | 9 Netze mit neuer Warnung → (d) rot |
| Exakte Endprüfung als Absicherung | 0 Rücknahmen; ohne sie gleiche Zahlen |
| Kandidaten im Generator (aus alter Rechnung) | 2.684 Netze mit Wechsel-Kandidat, 1.845 mit Großabnehmer-Kandidat, 566 mit Umhäng-Kandidat, 115 mit Umhäng-Kandidat mit Quelle im Teilbaum, 2.979 mit Upgrade |
| (4\|12) | heute 13 Felder / 7.280 €; F2-Regel („mit eigener Last“) ebenso 13 / 7.280 €; **F3: 5 Felder d32 (9..5\|12) / 2.800 €**, alle warm |
| (13\|12) | F3 ohne P3: 10 Felder / 4.000 €; F3+P3: 2 Felder d25 (11\|12),(12\|12) / 800 €, Starthäuser warm |
| Kosten je Feld | 560 € = Material d32 `kosten_eur [14]` (`katalog.ts:197`) × `kosten_faktor 40` (`katalog.ts:347`, angewandt `katalog.ts:398-399`); Gestattung 0 (Straße), Anbohrung 0 (vor Freischaltung, A88), Bohrung 0 → `spiel.ts:588-591`. d25: 10 × 40 = 400 €/Feld → 800 € |
| Laufzeit `berechneNetz` (Median 50, F3) | Startdorf voll (6 Anschlüsse, 156 Objekte): 0,81–0,94 ms (alt 0,32–0,51); Extremnetz 568 Objekte: 2,4–2,7 ms (alt 1,3–1,4) |
| Laufzeit `hausanschlussPlanen` (8\|18), Median 25 | alt 5,1–6,3 ms, F3+P3 4,7–5,0 ms |
| M4 Hausanschluss im Extremnetz (Median 9) | F3+P3: 51 ms, 19 Netzrechnungen (alt 44 ms, 19) |

## 7. Pakete
| Paket | Dateien | Abhängig von | Parallel möglich mit |
|---|---|---|---|
| P0 Vergleichswerkzeug | neu `tests/hilfen/netz-alt-a91.ts`, `tests/hilfen/a91-netze.ts`, `tests/a91-vergleich.test.ts` | – | NR16-B2 (keine gemeinsamen Dateien) |
| P1 Anschlusswahl + Verteilung | ändern `src/core/netz.ts` (Z. 122-165, 230-245); neu `tests/a91-anschluss.test.ts`, `tests/a91-wirkung-p1.test.ts`, `tools/a91-laufzeit.messung.ts`, `tools/vitest.messung.config.ts` | P0, NR16-B2 gemergt | Paketen ohne `netz.ts` |
| P2 Netzbaum | ändern `src/core/netz.ts` (neuer Block nach der Anschlusswahl); neu `tests/a91-netzbaum.test.ts` | P1 | wie P1 |
| P3 A89 aufräumen | ändern `src/core/spiel.ts` (nur `hausanschlussPlanen`); neu `tests/a91-hausanschluss.test.ts` | P2, Tester-Vorarbeit P3 | – |
Kritischer Pfad P0 → P1 → P2 → P3; P0 läuft neben NR16-B2. Mehr Parallelität geht nicht: P1–P3 ändern dieselbe Funktion bzw. bauen auf deren Verhalten. Zulässig, weil klein (zusammen etwa ein Tag). Kein Vertragspaket: `Netz` (`typen.ts:135`) ändert sich nicht.

### Bauplan P0 – Vergleichswerkzeug (Schwierigkeit: mittel – Generator mit nachgewiesener Abdeckung, sonst prüft der Test nichts)
**Dateien:** neu `tests/hilfen/netz-alt-a91.ts`, `tests/hilfen/a91-netze.ts`, `tests/a91-vergleich.test.ts`.
**Liefert:**
- `berechneNetzAlt(objekte: Objekt[], innen: InnenQuelle[], preisstufe: number, vorlauf_c?: number, grundgebuehr_eur?: number): Netz` – wörtliche Kopie von `src/core/netz.ts` aus 042e419 (ganze Datei, 311 Zeilen, inkl. eigener `istKunde`, `bedarfKw`, `nutzungsfaktor`, `leitungsNachbarn`, `mittlereSpreizung_k`, `spreizungHaus_k`, `groesse`, `belegungskarte`, `heizzentrale`, `istAktiv`), `berechneNetz` umbenannt. **Importiert nichts aus `src/core/netz.ts`**, nur Daten aus `src/core/katalog.ts` und Typen aus `src/core/typen.ts`. Kopfkommentar „eingefroren für den A91-Vergleich, nicht anpassen“.
- `zufallsNetz(seed: number): { objekte: Objekt[]; innen: InnenQuelle[]; vorlauf_c: number }` – eigener Zufall (LCG mit Startwert, kein `Math.random`). Inhalt (Pflicht):
  - Heizzentrale bei (10\|10), je zur Hälfte Stufe 1 (2×2) und Stufe 3 (3×3).
  - 1–6 Zufallsstränge ab den Feldern rund um die Heizzentrale oder ab bestehenden Leitungen, Länge 3–15, Richtungswechsel, Typ zufällig aus `LEITUNGEN[0..4]`, unterwegs dünner werdend; Kreuzungen erzeugen Maschen.
  - **Parallelstrang** (in 60 % der Netze, nötig für genug Wechsel): zwei Abgänge an derselben Heizzentralen-Seite, einer auf Höhe y = 10, einer über einen Knick auf y = 12 oder 13, Länge 4–10, Typen zufällig; dazwischen Häuser (Lücke 1: EFH/RH/Bäckerei, Lücke 2: MFH/Hallenbad/Klinik), die an beide grenzen.
  - 6–23 weitere Gebäude neben Leitungen, 25 % Großabnehmer (MFH, Hallenbad, Klinik, `zustand: 'vertrag'`), sonst EFH/RH/Bäckerei; Station `passendeStation(bedarf)`, 10 % `ohne_station`; 40 % mit `upgrade` 1–3, 15 % `hauspuffer`.
  - In 50 % 1–3 Wärmequellen (PV, Solarthermie, Erdsonde, Puffer; Stufe 1–2) neben Leitungen; in 30 % ein `gewerbe` mit `zustand: 'vertrag'`; in 30 % ein Puffer.
  - Kessel Stufe 1 in 35 %, sonst 1–5 (Wärmemangel); `vorlauf_c` 75 in 70 %, sonst 55–85 in 5er-Schritten.
- `pruefeVergleich(alt: Netz, neu: Netz): string[]` – Liste der Verstöße (leer = gut), exportiert aus `tests/hilfen/a91-netze.ts`:
  - (a) `neu.warm.size ≥ alt.warm.size`;
  - (b)+(c) jedes in `alt.warm` ist in `neu.warm` (streng, Variante (a));
  - (d) keine Feld-Kennung in `engpass`/`reduzierung`/`aufteilung` neu, die alt fehlt;
  - (e) `neu.verfuegbar_kw === alt.verfuegbar_kw`.
**Tests** `tests/a91-vergleich.test.ts` (Zeitgrenze 60 s je Test; Prototyp ≈ 8 s):
- `A91: test_a91_vergleich_alte_regel_3000_netze` – Startwerte 1…3000, `pruefeVergleich(berechneNetzAlt(…), berechneNetz(…))` mit `preisstufe 2` und `vorlauf_c` aus dem Netz; erwartet keine Verstöße. Ausnahmen nur über Liste `ERLAUBT` (Startwert + Begründung, Freigabe Projektleiter), zu Beginn leer.
- `A91: test_a91_generator_deckt_faelle_ab` – Mindestzahlen über die 3.000 Netze, nur aus der alten Rechnung und der Geometrie gezählt (gilt schon vor P1): ≥ 500 Netze mit Wechsel-Kandidat (Kunde alt „kalt: Leitung“, kein eigenes Ende, ≥ 2 erreichte angrenzende Felder), ≥ 300 mit Großabnehmer-Kandidat, ≥ 300 mit Umhäng-Kandidat (Feld mit dünnerem Elternfeld und Nachbar q mit Tiefe −1, q ≠ Elternfeld, Rang ≥), ≥ 50 mit Umhäng-Kandidat, in dessen Teilbaum eine Quelle hängt, ≥ 300 mit Wärmemangel (`verfuegbar_kw < bedarf_kw`), ≥ 300 mit Quelle/Abwärme an einem Leitungsfeld, ≥ 300 mit Upgrade. (Prototyp: 2.684 / 1.845 / 566 / 115 / 2.673 / 1.753 / 2.979.)
- `A91: test_a91_pruefer_findet_verstoss` – Selbsttest: Kopie eines echten Ergebnisses mit einem aus `warm` entfernten Haus → (b) gemeldet; mit `verfuegbar_kw + 1` → (e) gemeldet; mit zusätzlicher `engpass`-Kennung → (d) gemeldet.
- `A91: test_a91_vergleich_a89_durchlauf` – alle Orte, Stufe 1 und 2, jedes Haus/Großabnehmer `ohne_station`: Weg mit dem **aktuellen** `hausanschlussPlanen` planen; „nach dem Bau“ = `geplant` entfernen, Station mit `stationKaufen(id, passendeStation(bedarfKw(h)).id)` (nur Kategorie `haus`), keine Bauzeit; dieselbe Objektliste mit `berechneNetzAlt` und `berechneNetz` rechnen, `pruefeVergleich` leer.
**Gegenprobe (einmalig, Wegwerf-Kopie, nicht im Projekt):** In P0 genügt der Selbsttest. Der P1-Entwickler zeigt in seinem Bericht, dass `test_a91_vergleich_alte_regel_3000_netze` rot wird, wenn er in einer Kopie AE-A91-4 abschaltet (Prototyp: 106 Verstöße); der P2-Entwickler ebenso mit abgeschalteter Quellen-Sperre (Prototyp: 13).
**Randfälle:** Generator legt nie auf belegte Felder, Gebäude 2×2 vollständig frei; Netze ohne Kunden sind erlaubt.
**Eskalation:** Erreicht der Generator eine Mindestzahl nicht, Generator verbessern (Parallelstrang), nicht die Zahl senken; geht es nicht, an den Projektleiter.
**Risiko-Auslöser:** nein (nur Tests).

### Bauplan P1 – Anschlusswahl und Wärmeverteilung (Schwierigkeit: schwer – Fachregel im Netzmodell mit Gleitkomma-Grenzen und Garantie für alte Stände)
**Nutzt:** `berechneNetzAlt`, `zufallsNetz`, `pruefeVergleich` aus P0.
**Ändern:** `src/core/netz.ts`
- `spreizung_faktor` (Z. 160) vor die Anschlusswahl ziehen; Endprüfung Z. 161-165 als lokale Funktion `endpruefung` (AE-A91-1), die das Endergebnis ebenfalls benutzt.
- Z. 122-143 nach AE-A91-1; Z. 234-236 Sortierung nach AE-A91-4.
- Kommentare Z. 122, 133-134, 230 auf die neue Regel; nichts von „Wärme sucht den dicksten Weg“ (AE-A91-3).
- Signatur `berechneNetz(objekte, innen, preisstufe, vorlauf_c?, grundgebuehr_eur?): Netz` und Typ `Netz` unverändert; keine neuen Exporte.
**Tests** `tests/a91-anschluss.test.ts` (`berechneNetz` direkt, `preisstufe 2`; Bedarf = Jahresverbrauch ÷ 1.500 h: EFH 10, RH 16, Bäckerei 20, MFH 30, Hallenbad 45, Klinik 70 kW; Kapazität d25 15, d32 25, d40 40, d50 60, d75 135 kW, `katalog.ts:191-216`; Kessel 60/90/130/180/240 kW je Stufe, `katalog.ts:83`; Großabnehmer mit `zustand: 'vertrag'`, Station `passendeStation(bedarf)`). Jeder Test nennt das Ergebnis der alten Rechnung als Gegenstück (gemessen):
- `test_a91_duenne_leitung_neben_warmem_haus_macht_es_nicht_kalt` – Aufbau 6: `hz` (0\|0); `d40` x=2, y=0…7; EFH A (1\|5); `d25` (1\|4),(0\|4); EFH B (0\|5); Kessel 5. Erwartet `anschluss(A).feld = 5·24+2`, A und B warm. Alt: A an (1\|4), beide „leitung“.
- `test_a91_haus_wechselt_auf_leitung_mit_rest` (V2) – `hz` (0\|0); `d25` x=0, y=2…7; `d40` x=2, y=0…7; RH (1\|5); EFH (3\|4),(3\|5); Kessel 5. Erwartet RH an (2\|5) = 5·24+2, alle drei warm, `kalt` leer. Herleitung: alt an (0\|5) (Tiefe 4 < 6), 16 > 15; d40 trägt 20 + 16 = 36 ≤ 40. Alt: RH „leitung“.
- `test_a91_haus_wechselt_nicht_auf_volle_leitung` (V1, Befund 4) – wie V2, aber EFH (3\|4),(3\|5),(3\|6). Erwartet RH an (0\|5) = 5·24+0, `kalt.get(RH) = 'leitung'`, die drei EFH warm. Herleitung: d40 hätte 30 + 16 = 46 > 40. Alt gleich; Gegenstück ist V2 (und eine Regel ohne Restprüfung machte hier alle EFH kalt).
- `test_a91_grossabnehmer_bei_waermemangel_zuletzt` (Befund 1, Variante (a)) – `hz` (4\|0) Stufe 1; `d50` x=3, y=0…6; `d75` x=6, y=0…6; Klinik (4\|3); EFH (7\|4),(7\|5),(7\|6); **Kessel 2 (90 kW)**. Erwartet: Klinik an (6\|3) = 3·24+6, `kalt.get(Klinik) = 'waerme'`, alle drei EFH warm. Herleitung: alt Klinik an (3\|3) (erste Fundstelle, Tiefe gleich 3), 70 > 60 → „leitung“, EFH 30 kW warm; neu begünstigt → zuletzt: 30 + 70 = 100 > 90. Mit Kessel 5 (240 kW): alle vier warm. Gegenstück ohne AE-A91-4 (gemessen): Klinik warm, EFH (7\|6) „waerme“.
- `test_a91_haus_wechselt_nur_wenn_es_dort_kalt_waere` – wie V2, aber RH durch EFH ersetzt (10 ≤ 15): Anschluss (0\|5) wie alt, warm.
- `test_a91_eigener_zu_duenner_hausanschluss_bleibt_kalt` – `hz` (0\|0); `d50` x=2, y=0…6; Bäckerei (1\|4); `d25` (0\|2),(0\|3),(0\|4). Erwartet `anschluss.feld = 4·24+0`, `kalt = 'leitung'`; Oberfläche über `tests/hilfen/kontext-attrappe.ts`: Chip „Leitung zu dünn“ (`kontext.ts:159`).
- `test_a91_eigenes_ende_reicht_dann_bleibt_es` – A57-Fall; `anpassungen.test.ts:704` bleibt unverändert grün.
- `test_a91_hausanschluss_4_12_ohne_umweg` – `neuerSpielstand`, Kessel, Stufe 1, Abschnitt offen, `hausanschlussPlanen` für (4\|12): geplant (9\|12),(8\|12),(7\|12),(6\|12),(5\|12), Typ `d32`, `abschnittKosten_eur() = 2800` (5 × 560 €, Herleitung Abschnitt 6); nach Station + `geplant` entfernt kein Haus „kalt: Leitung“. Alt: 13 Felder, 7.280 €.
- `test_a91_spielstand_format_unveraendert` – `SPEICHER_SCHLUESSEL === 'waermedorf-spielstand-v1'`, `SPEICHER_VERSION === 3`.
- `test_a91_alter_hausanschluss_satz_ist_weg` – liest `src/steuerung.ts` und `src/ui/katalog.ts`: die Sätze „Eine Leitung, die an ein Haus grenzt, ist sein Hausanschluss“ und „Grenzt eine Leitung an ein Haus, ist das sein Hausanschluss“ kommen nicht vor; Prüfmuster `/ist (das )?sein Hausanschluss/`. Selbstprobe im Test: das Muster trifft den neuen Satz aus `ENTSCHEIDUNGEN.md:130` („…, ist es sein Hausanschluss“) **nicht**.
**Tests** `tests/a91-wirkung-p1.test.ts`: `test_a91_p1_wirkt_im_generator` – über Startwerte 1…3000: ≥ 100 Netze, in denen ein Kunde in `berechneNetz` ein anderes `anschluss.feld` hat als in `berechneNetzAlt`; ≥ 30 Großabnehmer mit anderem Anschlussfeld (Prototyp: 375 bzw. 37).
**Messskript** `tools/a91-laufzeit.messung.ts` + `tools/vitest.messung.config.ts` (`include: ['tools/**/*.messung.ts']`), Aufruf `npx vitest run --config tools/vitest.messung.config.ts`. Nicht in `npm test` (`vitest.config.ts` nimmt nur `tests/**/*.test.ts`); `npm run typecheck` erfasst `tools/`. Je 20 Aufwärmläufe, dann Median; alle Grenzen **hart** (Laptop):
- M1 Startdorf voll: `neuerSpielstand`, Kessel, Geld 1e8, `hz.stufe = 3`, Abschnitt offen, jedes EFH/RH/Bäckerei/MFH `ohne_station` per `hausanschlussPlanen`, bei Erfolg Station `passendeStation(16)`; danach alle `geplant` entfernen; `berechneNetz` mit Kessel 5, Median 50: **≤ 2 ms** (Prototyp 0,81–0,94 ms, Rechner schwankt bis ±50 %).
- M2 `hausanschlussPlanen` (8\|18), neues Spiel Stufe 1, Median 25: **≤ 10 ms** (Prototyp 4,7–6,3 ms).
- M3 Extremnetz: `hz` (10\|10) Stufe 3; jedes Feld mit `y % 3 = 0` oder `x % 4 = 1` Leitung (`d63` wenn `x % 8 = 1` oder `y % 6 = 0`, sonst `d32`), alle übrigen EFH mit `passendeStation(10)`; Kessel 5; Median 50: **≤ 8 ms** (Prototyp 2,4–2,7 ms).
- M4 Hausanschluss im Extremnetz: wie M3, aber Ecke x ≥ 17 und y ≥ 17 leer, EFH `ohne_station` auf (21\|21); `Spiel` mit `stand.objekte` ersetzt, Abschnitt offen; Median 9: **≤ 100 ms**, Zahl der Netzrechnungen berichten (Zähler über `vi.mock('../src/core/netz', …)` mit durchgereichtem `berechneNetz`). Prototyp: 51 ms, 19 Rechnungen. Handy grob 3–5× langsamer (Schätzung, nicht gemessen); die Netzrechnung läuft nur bei Aktionen, nicht je Bild (`spiel.ts:236`).
Ergebnis M1–M4 mit Rechner und Zahlen in den Bericht (P1 und erneut P2, P3).
**Randfälle:** Großabnehmer 2×2 mit Feldern auf mehreren Seiten; Haus direkt an der Heizzentrale (`-1`); Haus ohne Station (Anschluss nur für die Anzeige, wechselt nicht); Spreizungsfaktor < 1 (A73) steckt in `endpruefung`; Netz ohne Überlast (Durchgang 2 und Begünstigt-Rechnung entfallen).
**Eskalation:** Stoppen und an den Projektleiter, wenn ein bestehender Test rot wird (Prototyp: alle 843 grün), der Vergleichstest einen Verstoß findet (Startwert melden, nicht in `ERLAUBT`) oder eine M-Grenze reißt.
**Risiko-Auslöser:** nein (keine Anmeldung, keine Daten von außen, keine neue Schnittstelle, keine Geheimnisse).

### Bauplan P2 – Netzbaum (Schwierigkeit: schwer – Algorithmus, der W1/A67/A76 und die Einspeisung speist)
**Nutzt:** P0-Hilfen; in `netz.ts` `endpruefung`, Lasten und Rest aus P1 (lokal, nicht exportiert).
**Ändern:** `src/core/netz.ts` – neuer Block nach der Anschlusswahl, vor „Last in den Leitungen“, nach AE-A91-2. Breitensuche Z. 98-118 unverändert. Begünstigt-Rechnung aus P1 berücksichtigt geänderte `eltern` (Endergebnis auf dem neuen Baum, `okAlt` auf `elternAlt`).
**Tests** `tests/a91-netzbaum.test.ts` (Kessel 5 wenn nicht anders genannt):
- `test_a91_hauptleitung_nicht_ueber_duenne_leitung_gespeist` – neues Spiel, Kessel, Stufe 1; `d25` (11\|12),(12\|12) von Hand; (13\|12) mit Station. Erwartet `eltern.get(12·24+10) = 11·24+10`, `tiefe.get(12·24+10) = 2`, `engpass` leer, (9\|13),(12\|14),(13\|12) warm. Alt: Elternfeld (11\|12), zwei Häuser kalt.
- `test_a91_ring_last_hinter_umgehaengtem_feld_traegt` (Befund 4) – `hz` (0\|0); `d50` (2..6\|0), (6\|1..6); `d32` (0\|2..4), (1..5\|4); EFH (3\|1),(5\|1),(7\|3),(3\|5),(5\|5),(7\|5),(7\|6). Erwartet `eltern.get(4·24+6) = 3·24+6`, `tiefe.get(4·24+6) = 9`, `last_kw.get(2) = 50`, `last_kw.get(2·24) = 20`, alle 7 warm, `engpass` leer. Alt (gemessen): Elternfeld (5\|4), Last 30 / 40, (3\|5),(5\|5),(7\|5),(7\|6) „leitung“, `engpass` (6\|4),(5\|4).
- `test_a91_ring_last_hinter_umgehaengtem_feld_traegt_nicht` – wie oben, `d50` bis (6\|7), zusätzlich EFH (7\|7),(5\|7). Erwartet Ergebnis gleich alt: Elternfeld (5\|4), Last 30 / 60, die sechs Häuser an d32-Seite und hinter (6\|4) „leitung“. Herleitung: Last hinter (6\|4) 40 > Rest 60 − 30.
- `test_a91_kein_umhaengen_mit_quelle_im_teilbaum` (Befund 3) – Ring „trägt“, zusätzlich Solarthermie (2×2) angeschlossen an (6\|5) (Platz (7\|7)…(8\|8) oder passend frei, Entwickler wählt freie Felder an (6\|6)), Kessel 1: Erwartet Elternfeld (6\|4) unverändert (5\|4), `verfuegbar_kw` = alt.
- `test_a91_heizzentrale_3x3_mehrere_einspeisepunkte` – `hz` Stufe 3 bei (0\|0); zwei Abgänge an verschiedenen Seiten, die sich zu einem Ring schließen (Aufbau wie Ring, um eine Zeile verschoben); Erwartet Einspeisepunkte (Tiefe 1) haben `eltern = -1` wie alt; `pruefeVergleich` leer.
- `test_a91_tiefe_bleibt_kuerzester_abstand` – Startdorf, Aufbau 6, beide Ringe: `tiefe` neu = alt.
- `test_a91_reihenfolge_eltern_vor_kind` – Startdorf, Ring, Startwerte 1…200: jedes `eltern` steht vorher in `reihenfolge`.
- `test_a91_p2_wirkt_im_generator` – Startwerte 1…3000: ≥ 100 Netze mit anderem `eltern` als alt (Prototyp 180).
`tests/a91-vergleich.test.ts` aus P0 muss unverändert grün bleiben.
**Randfälle:** Vorsehung (A69) zählt als Abzweig; nicht verbundene Leitungen ohne Tiefe; Puffer zählt als Quelle.
**Eskalation:** wie P1; zusätzlich, wenn ein bestehender A67/A76-Test rot wird.
**Risiko-Auslöser:** nein.

### Bauplan P3 – A89 aufräumen (Schwierigkeit: mittel – Sperre weg, dafür Warnprüfung mit Rückfall in der Wegsuche)
Erst nach P2 und Tester-Vorarbeit. Lastenheft-Satz streicht der Projektleiter beim Merge.
**Ändern:** `src/core/spiel.ts`, nur `hausanschlussPlanen` (Z. 655-779):
- Sperre `nebenHz` samt Kommentar (Z. 670-677), Parameter `nebenHzOk` (Z. 678-679, 713, 723, 757), Ersatzsuche und Meldung Z. 767 entfernen.
- `leitungKalt`/`traegt` (Z. 692-708): zusätzlich Warnungs-Kennungen merken und neue ablehnen (Abschnitt 5); Rückfall: zweite `suche(spuel)` ohne Warnprüfung, wenn die erste keinen Weg findet. Kommentare Z. 688-690, 697 anpassen.
- Meldungen „Kein Weg gefunden, bei dem alle Häuser warm bleiben“ und „Kein Weg zu einer Leitung gefunden“ bleiben.
**Tests** `tests/a91-hausanschluss.test.ts`:
- `test_a91_hausanschluss_13_12_zwei_felder` – neues Spiel, Kessel, Stufe 1, Abschnitt offen: geplant (11\|12),(12\|12), `d25`, `abschnittKosten_eur() = 800` (2 × 10 € × 40); nach Station + Bau (9\|13),(12\|14),(13\|12) warm, `pruefeAuftraege` meldet c2 erledigt.
- `test_a91_keine_abkuerzung_neben_heizzentrale` (Befund 5) – `Spiel` mit ersetzten Objekten: `hz` (10\|10) Stufe 1; `d40` (10\|9),(10\|8),(11\|8),(12\|8),(13\|8),(13\|9),(13\|10),(13\|11); EFH mit Station (9\|8); EFH `ohne_station` (13\|12) und (11\|12) als Hindernisse; Ziel-EFH `ohne_station` (12\|12). Erwartet: geplant **nicht** (12\|11); nach Bau `engpass`, `reduzierung`, `aufteilung` leer, kein Haus kalt. Gemessen: ohne Warnprüfung 1 Feld (12\|11) mit `engpass` (13\|11),(12\|11); mit Warnprüfung 5 Felder (14\|11),(14\|12),(14\|13),(13\|13),(12\|13), keine Warnung.
- `test_a91_kein_hinweis_auf_heizzentrale_mehr` – `src/core/spiel.ts` enthält „darf der Hausanschluss nicht liegen“ nicht.
- `test_a91_durchlauf_ohne_sperre` – alle Orte, Stufe 1/2 (Aufbau wie P0-Durchlauf): ≥ 41 bzw. ≥ 42 Wege, 0 Anschlüsse mit neu kaltem Haus, Anschlüsse mit neuer Warnung ≤ 0 (Stufe 1) bzw. ≤ 1 (Stufe 2; heute 2), `pruefeVergleich` leer.
**Eskalation:** Stoppen, wenn der Durchlauf ein neu kaltes Haus oder weniger Wege meldet.
**Risiko-Auslöser:** nein.

## 8. Vorarbeit (nicht für den Entwickler)
- **P0, P1, P2:** keine.
- **P3 → Tester-Vorarbeit** (eigener Commit vor P3): `tests/a89-hausanschluss.test.ts` Tests Z. 56 und Z. 68 entfernen, im Durchlauf Z. 85 den Teil „keiner liegt neben der Heizzentrale“ streichen, `NEBEN_HZ`/`nebenHzVon` entfernen, falls unbenutzt; `tests/a89-hausanschluss-meldung.test.ts` Test Z. 55 entfernen.
- **P3 → Projektleiter beim Merge:** A89-Zeile `docs/lastenheft.md:107` ohne „belegt keine Felder direkt neben der Heizzentrale“.
- **Architekt (optional, vor P0):** Architekturtest „`src/` importiert nichts aus `tests/`“, damit `netz-alt-a91.ts` nicht ins Spiel gerät. Heute kein solcher Import (gelesen).

## 9. NR16-B2: Kollision und Reihenfolge
Die Sätze in `src/steuerung.ts:150` und `src/ui/katalog.ts:79` ändert NR16-B2 nach `ENTSCHEIDUNGEN.md:130` (Wortlaut dort festgelegt). P1 enthält nur den Prüftest und hängt deshalb an „NR16-B2 gemergt“. P0 berührt keine Datei von NR16-B2 und kann sofort laufen. Reihenfolge: NR16-B1 → B2 ∥ P0 → P1 → P2 → P3.

## 10. Risiken
- **R1 (P2, Sicherheit 15):** Bündelung bis zur Überlast und geringere Einspeisung sind durch Rest-Prüfung, Endprüfung und Quellen-Sperre ausgeschlossen; Vergleichstest (b)/(e) sichert ab.
- **R2 (geklärt durch Kritiker):** Der Abzweig in der Zeichnung folgt dem berechneten Anschluss (`szene.ts:374-375`) und springt sichtbar, wenn ein Haus wechselt.
- **R3 Laufzeit:** M1–M4 hart. Der Rest-Vorfilter darf keinen vollen Neulauf je Kandidat machen (gemessen 12 ms statt 2,7 ms im Extremnetz).
- **R4:** `netz-alt-a91.ts` ist doppelter Code nur für A91. Ändert ein späteres Paket `berechneNetz` absichtlich, entscheidet der Projektleiter, ob der Vergleichstest angepasst oder entfernt wird. Katalogwerte liest die Kopie aus `katalog.ts` mit; ändern die sich, ändern sie sich für beide gleich.
- **R5 (P3):** Mit Warnprüfung werden manche Anschlüsse teurer (Stufe 2 gesamt +22.680 € über alle Orte gegenüber ohne Prüfung); dafür keine selbst erzeugten Planungsfehler.

## 11. Offene Punkte
- **Projektleiter:** Rückfall in P3 bestätigen (Abschnitt 5) oder ohne Rückfall bauen (dann Stufe 2: 41 statt 42 Wege).
- **Projektleiter:** Fachprüfer-Bestätigung der Spielregel „eigener zu dünner Hausanschluss bleibt kalt“ (`ENTSCHEIDUNGEN.md:119` „ausstehend“) – nachweislich einholen oder als erledigt vermerken.
- **Simon (kann umentscheiden):** Variante (a) „neu versorgbare Häuser zuletzt“ statt „nah zuerst“.
- **Fachprüfer** nach dem Bau: Kommentare in `netz.ts` gegen AE-A91-3.
- Recherchen L1, L2, L3 bleiben vorgemerkt, für A91 nicht nötig.
- Später, Spielgefühl: bei echter Überlast wie (8\|18) Hinweis „Hauptleitung zu dünn – erst tauschen“ (eigenes NR).

## 12. Prüf-Schwerpunkt
1. Alter Spielstand mit Großabnehmer an überlasteter Leitung bei Wärmemangel: kein bisher warmes Haus wird kalt – P1 (Klinik-Test, Vergleichstest).
2. Wärmequelle hinter einem umhängbaren Feld: verfügbare Wärme bleibt gleich – P2.
3. Haus an der Kapazitätsgrenze mit Nachkommazahlen (Hauspuffer, Spreizung < 1): Wechsel nur, wenn die Endprüfung besteht – P1 (Generator mit Hauspuffer/Upgrades/Vorlauf).
4. Automatischer Hausanschluss neben der Heizzentrale: keine neue W1/A67/A76-Warnung, wenn es einen Weg ohne gibt – P3.
5. Viele überlastete Häuser im großen Netz: Rechenzeit bleibt unter den Grenzen – P1 (M3, M4).

## Antworten auf die Rückfragen des Kritikers
| Frage | Antwort |
|---|---|
| P1-1/2/3 | V1/V2 mit Koordinaten; erste Fundstelle (0\|5) überlastet, Alternative durchlaufend (Abschnitt 7). |
| P1-4 | „Eigenes Leitungsende“ festgelegt (AE-A91-1, Begriffe); unangebundene Leitungen können nicht angrenzen. |
| P1-5 | nur erreichte Felder. |
| P1-6 | Auslöser: `endpruefung` auf Durchgang 1 + Baum der Breitensuche hat ein `false`; mit Spreizungsfaktor. |
| P1-7 | eine Funktion `endpruefung` für alles; Wechsel nur, wenn sie danach besteht. |
| P1-8 | Bedingung wie `netz.ts:183-186` auf dem Baum der Breitensuche und dem aktuellen Anschlussstand. |
| P1-9 | AE-A91-4: nicht begünstigt vor begünstigt, dann Tiefe, ID. |
| P1-10 | 560 € = 14 € × Faktor 40 (Abschnitt 6). |
| P1-11/12 | P0-Bauplan: Generator-Inhalt, Mindestzahlen; Kopie bringt alle Hilfsfunktionen selbst mit. |
| P1-13 | Weg aus aktuellem `hausanschlussPlanen`; „nach dem Bau“ = `geplant` weg + Station, ohne Bauzeit. |
| P1-14 | M1–M4 Aufbau und harte Grenzen im Messskript. |
| P1-15 | Ordner `tools/`. |
| P2-1 | Rest über q auf dem aktuellen Baum, Last hinter k noch über p (bewusst vorsichtig). |
| P2-2 | drei konkrete Bedingungen (AE-A91-2). |
| P2-3 | Teilbäume mit Quellen/Puffer/Gewerbe nicht umhängen. |
| P2-4/5 | Ring-Tests „trägt“/„trägt nicht“ mit Lasten; Test Heizzentrale 3×3. |
| P3-1 | ja, mit Rückfall. |
| P3-2 | Lastenheft beim Merge von P3. |
| P3-3 | Durchlauf prüft Warnungen und `pruefeVergleich`. |
