# Bericht fachpruefer – 2026-11-04 15:44

🟡 **Ampel: Gelb.** Die Spielregeln im Kern stimmen fachlich, und die Tests sichern sie ab. Aber einige Texte, die der Spieler sieht, sind falsch oder irreführend. Deshalb ist A18 („Fachprüfer bestätigt alle Wissens-Texte“) noch **nicht** erfüllt. Gegen eine bestätigte Regel wird nicht verstoßen, und es wurden keine Referenzwerte verändert. Darum gelb und nicht rot.

**docs/FACHPRUEFUNG_F5.md habe ich nicht geschrieben.** Als Fachprüfer darf ich keine Dateien ändern. Der Projektleiter kann diesen Bericht 1:1 als `/home/user/W-rmenetz-Dorf/docs/FACHPRUEFUNG_F5.md` übernehmen. Am Projekt habe ich nichts verändert (`git status` ist leer). Die Probedatei für Fall A–F (unten) liegt nur im Scratchpad.

---

## Was ich getan habe
- **Gelesen:** alle genannten Dateien, die Fachwissen-Bibliothek `waermenetz.md`, die Lessons-Datei, A18 im Lastenheft und `docs/ENTSCHEIDUNGEN.md`.
- **Getestet:** `npm test` ergab 112 von 112 Tests grün. Dazu fünf Fehlerproben an den Kernregeln (siehe Frage 2).
- **Probelauf:** Ich habe die Netzberechnung mit sechs eigenen Fällen ausgeführt (Datei nur im Scratchpad: `/tmp/claude-0/-home-user-W-rmenetz-Dorf/0f22298d-d754-58d5-a139-ea7ff6b6cb63/scratchpad/probe.test.ts`). Ergebnisse:
  - A) Solarthermie mit 100 kW über eine 25er-Leitung (bis 12 kW): **100 kW kommen an**.
  - B) Sägewerk-Abwärme 60 kW über eine 25er-Leitung: **60 kW kommen an**.
  - C) PV zählt nur, wenn eine **Wärmeleitung** zur Heizzentrale liegt: 20 kW mit Leitung, 0 kW ohne.
  - D) Pufferspeicher ganz ohne Wärmequelle: 70 kW verfügbar, ein Haus wird warm, Betriebskosten 0.
  - E) Ein Abschnitt hinter einer überlasteten Leitung: eigene Last 10 von 12 kW, gilt trotzdem als „überlastet“.
  - F) Erdsondenfeld: Betriebskosten 0, kein Strom nötig.

---

## Liste der Aussagen
Urteile: richtig · vereinfacht-ok · irreführend · falsch · Lücke

### Heizhaus-Quellen
| # | Aussage / Fundstelle | Urteil | Begründung | Textvorschlag |
|---|---|---|---|---|
| 1 | Kessel: „Verbrennt Holzhackschnitzel. Viel Leistung, aber laufende Brennstoffkosten.“ und Vorteil „Holz aus der Region“ (`src/core/katalog.ts:89-91`) | richtig | Stimmt. | – |
| 2 | Wärmepumpe: „Holt Wärme aus der Umgebung und braucht dafür Strom. Eigener Solarstrom (PV) senkt die Stromkosten.“ sowie „günstig im Betrieb / teuer in der Anschaffung“ (`katalog.ts:101-104`) | richtig | Stimmt. | – |
| 3 | Power-to-Heat: „eine kWh Strom ergibt höchstens eine kWh Wärme“ (`katalog.ts:117`) | richtig | Ein Heizstab macht nie mehr Wärme als Strom hineingeht. Gerade das ist der Unterschied zur Wärmepumpe. | Gern ergänzen: „… – eine Wärmepumpe macht aus einer kWh Strom mehrere kWh Wärme.“ |

### Außenanlagen
| # | Aussage / Fundstelle | Urteil | Begründung | Textvorschlag |
|---|---|---|---|---|
| 4 | PV: „Liefert Sonnenstrom und senkt damit die Stromkosten …“ (`katalog.ts:126`) | richtig | Stimmt. | – |
| 5 | PV-Karte und Kontextkarte zeigen „20 kW Strom“ (`src/ui/katalog.ts:12`, `src/ui/kontext.ts:153`) | vereinfacht-ok | Bei PV ist das die Spitzenleistung. Im Spiel liefert sie dauerhaft. | „20 kW Strom (Spitzenleistung)“ |
| 6 | Bei der PV-Anlage erscheint: „Ohne Leitung zur Heizzentrale fließt keine Wärme ins Netz.“ mit dem Knopf „Leitung legen“ (50er) (`kontext.ts:154`, Probe C) | **falsch** | PV liefert keine Wärme, sondern Strom. Sie wird über ein Stromkabel angeschlossen, nicht über eine Wärmeleitung. | Für PV eigener Text: „Verbinde die PV-Anlage mit der Heizzentrale, damit ihr Strom bei Wärmepumpe und Power-to-Heat-Kessel ankommt.“ Den Knopf eventuell „Verbindung legen“ nennen. |
| 7 | Pufferspeicher: „Hebt Wärme für die Spitzenzeiten auf … (im Spiel vereinfacht als zusätzliche Leistung)“ (`katalog.ts:135`, Probe D) | Text vereinfacht-ok, Spielregel irreführend | Ein Speicher erzeugt keine Wärme. Er gibt nur ab, was eine Quelle vorher hineingeladen hat. Im Spiel heizt er sogar ohne jede Quelle, kostenlos und dauerhaft. Wer das spielt, lernt: „Speicher = kostenlose Wärmequelle“. | Text: „Ein Speicher erzeugt selbst keine Wärme: Deine Quellen laden ihn, und er hilft bei Spitzen. Im Spiel vereinfacht als zusätzliche Leistung.“ Spielregel (Entscheidung des Projektleiters): Speicher zählt nur, wenn eine Quelle läuft, und kostet so viel wie die Wärme, mit der er geladen wird. |
| 8 | Solarthermie: „Sonnenwärme direkt ins Netz, ohne Brennstoff (im Spiel vereinfacht: gleichbleibende Leistung)“ (`katalog.ts:144`) | vereinfacht-ok | Die Vereinfachung ist offen benannt. | Optional: „… in Wirklichkeit vor allem im Sommer.“ |
| 9 | Erdsondenfeld: „Wärme aus dem Erdreich, … ohne Brennstoff“. Im Spiel kostenlos und ohne Strom (`katalog.ts:153`, Probe F) | **irreführend** | Die Erdwärme selbst ist ohne Brennstoff, das stimmt. Für ein normales warmes Netz ist sie aber zu kühl. Eine Wärmepumpe muss sie anheben, und die braucht Strom. Im Spiel sieht die Sonde aus wie freie Heizwärme. | „Wärme aus dem Erdreich, über das Jahr gleichmäßig. Im echten Netz hebt eine Wärmepumpe sie mit Strom auf Netztemperatur (im Spiel vereinfacht: kostenlos).“ Alternativ die Sonde als „elektrisch“ markieren. |

### Leitungen
| # | Aussage / Fundstelle | Urteil | Begründung | Textvorschlag |
|---|---|---|---|---|
| 10 | Leistung wächst mit dem Querschnitt: 12/20/30/50/80/110/160/220 kW (`katalog.ts:155-194`) | vereinfacht-ok | Nachgerechnet (Frage 5): Die Werte liegen um höchstens 5 % neben „Leistung im Verhältnis zur Fläche“. In echten Netzen wächst die Leistung eher noch stärker, weil in dicken Rohren schneller gepumpt werden darf. Ob die absoluten kW zu echten Rohren passen, kann ich nicht beurteilen (Lücke 1). | Der Text darf so bleiben. Der Hinweis „Werte fiktiv“ in den Einstellungen deckt das ab. |
| 11 | „Durchmesser 25 mm“ … „110 mm“ (`katalog.ts:158-193`) | vereinfacht-ok (Sicherheit 75) | Die Reihe 25/32/40/50/63/75/90/110 ist nach meinem Wissen die übliche Reihe der **Außendurchmesser** von Kunststoffrohren. Die Bibliothek belegt das nicht. | „Rohr 25 mm (außen)“ oder einfach „25er-Leitung“ ohne mm-Angabe. |
| 12 | 25er „Für ein einzelnes Haus“ und 32er „ein bis zwei Häuser“ (`katalog.ts:158,163`) | richtig im Spiel | Passt zu den Spielzahlen: Einfamilienhaus 10 kW, 12 bzw. 20 kW Leitung. Achtung: Ein Reihenhaus (16 kW) passt nicht durch die 25er. | „Für ein Einfamilienhaus.“ |
| 13 | 110er „von der Heizzentrale weg **und zu Großabnehmern**“ (`katalog.ts:193`), „Großabnehmer brauchen eine dicke Leitung (110er)“ (`kontext.ts:139`), Auftrag „Verlege eine dicke Leitung (110er) zum Hallenbad“ (`src/core/auftraege.ts:20`) | **irreführend** | Das Hallenbad braucht 45 kW, die Klinik 70 kW. Eine 50er bzw. 63er reicht; ein Test belegt sogar Hallenbad an einer 50er (`tests/netz.test.ts`, Fall Hallenbad an d50). Schlimmer: Wer einen 110er-Abzweig an eine dünnere Leitung hängt, bekommt nach Regel W1 einen Planungsfehler. Der Auftrag lenkt also in einen Planungsfehler. | 110er: „Dickste Leitung: die Hauptleitung direkt an der Heizzentrale, durch die die Wärme fürs ganze Dorf fließt.“ Kontext: „Großabnehmer brauchen viel Leistung – wähle eine Leitung, die ihren Bedarf schafft, und achte darauf, dass die Leitung davor mindestens genauso dick ist.“ Auftrag: „Schließ das Hallenbad mit einer ausreichend dicken Leitung an und unterschreib den Vertrag.“ |
| 14 | Planungsfehler: „Hinter dieser Leitung wird es zum Kunden hin dünner und danach wieder dicker. Wärme kommt nur durch den dünnsten Abschnitt …“ (`kontext.ts:163`) | Regel richtig, Text vereinfacht-ok bis irreführend | Der Code prüft genau W1: „wird in Fließrichtung dicker“ (`src/core/netz.ts:137`). Das tritt auch ohne vorheriges Dünnerwerden auf, z. B. 25er direkt an der Heizzentrale, dann 50er. Dann stimmt „dünner und danach wieder dicker“ nicht. Der Satz „Wärme kommt nur durch den dünnsten Abschnitt“ ist als Bild für eine Reihe von Leitungen richtig. | „Planungsfehler: Von der Heizzentrale aus wird die Leitung hier dicker. Zum Kunden hin dürfen Leitungen nur gleich dick bleiben oder dünner werden – mehr Wärme als durch den dünnsten Abschnitt davor kommt nicht an. Tausche den dünnen Abschnitt gegen eine dickere Leitung.“ |
| 15 | „Überlastet: Hier soll mehr Wärme durch, als die Leitung schafft.“ (`kontext.ts:164`, Probe E) | **irreführend** | Die Meldung erscheint auch an Abschnitten, die selbst gar nicht überlastet sind, wenn nur eine Leitung **davor** überlastet ist. Probe E: Last 10 von 12 kW, trotzdem „überlastet“. Der Spieler tauscht dann die falsche Leitung. | Zwei Fälle trennen. Eigene Last zu hoch: Text wie bisher. Nur die Leitung davor überlastet: „Eine Leitung davor ist überlastet – hier kommt deshalb keine Wärme an.“ |
| 16 | Kapazität gilt nur für Wärme zu den Kunden, nicht für Wärme, die Außenanlagen und Sägewerk einspeisen (`netz.ts:146,153`, Probe A/B) | **irreführend** (Regellücke) | Das Spiel zeigt „25er … überträgt bis 12 kW“. Trotzdem kommen 100 kW Solarwärme durch dieselbe 25er. Das widerspricht der eigenen, angezeigten Regel aus A7. | Spielregel: Einspeisung höchstens so viel, wie die dünnste Leitung auf dem Weg zur Heizzentrale schafft. Oder offen als Vereinfachung benennen. Entscheidung beim Projektleiter, ggf. Simon. |
| 17 | Hausanschluss mit „Leitung zu dünn … Ersetze sie durch eine dickere“ (`kontext.ts:124`) | richtig | Passt zur Spielregel. | – |

### Häuser, Großabnehmer, Wirtschaft
| # | Aussage / Fundstelle | Urteil | Begründung | Textvorschlag |
|---|---|---|---|---|
| 18 | Reihenhaus: „Drei Wohnungen unter einem Dach.“ (`katalog.ts:207`) | **falsch** | Ein Reihenhaus ist ein eigenes Haus in einer Reihe, Wand an Wand mit den Nachbarn. „Drei Wohnungen unter einem Dach“ beschreibt ein Dreifamilienhaus. | „Drei Häuser Wand an Wand, die sich einen Anschluss teilen.“ |
| 19 | Einfamilienhaus „Zahlt für seine Wärme, wenn es angeschlossen und warm ist“; Mehrfamilienhaus „Viele Wohnungen, viel Wärmebedarf“; Bäckerei „Braucht schon früh am Morgen viel Wärme“ (`katalog.ts:200,221,214`) | richtig / vereinfacht-ok | Stimmt im Kern. Den Ofen heizt eine Bäckerei meist nicht mit Nahwärme; die Wärme für Räume und Wasser schon. | – |
| 20 | Hallenbad „Braucht dauerhaft viel Wärme“; Klinik „strenger Vertrag“ (`katalog.ts:226,237`) | richtig | Stimmt. | – |
| 21 | Sägewerk: „Hat Abwärme übrig. … liefert dir günstige Wärme ins Netz – solange der Betrieb läuft.“ (`katalog.ts:232`) | vereinfacht-ok | Abwärme aus Betrieben ist als günstige Quelle richtig. Ein Sägewerk braucht selbst oft Wärme zum Holztrocknen. Überschüsse hat es eher aus der Restholz-Feuerung. Als Spielbild in Ordnung. | Optional: „Hat Wärme aus seiner Restholz-Feuerung übrig.“ |
| 22 | Ein nicht angeschlossenes Haus „heizt mit Öl“, gekündigte Kunden „wieder bei seinem Öl-Kessel“ (`kontext.ts:109,119,123`) | vereinfacht-ok | Ein plausibles Bild. | – |
| 23 | Preisstufen 10/12/14/16/18 ct/kWh (`katalog.ts:270-274`) | vereinfacht-ok, Größenordnung Lücke | Ob das zu echten Nahwärme-Preisen passt, steht nicht in der Bibliothek (Lücke 3). | – |
| 24 | Einnahme-Faktor passt nicht zum Preis: 16 ct gibt den Faktor 1,2 statt 16/14 = 1,14; 18 ct gibt 1,45 statt 1,29 (`katalog.ts:273-274`) | **irreführend** | Bei gleicher gelieferter Wärme gilt: Einnahmen = Preis × Menge. 18 ct sind 29 % mehr als 14 ct, im Spiel gibt es aber 45 % mehr. Bei 10 und 12 ct stimmt es fast (0,70 statt 0,714; 0,85 statt 0,857). | Faktoren auf ct ÷ 14 setzen (0,714 / 0,857 / 1 / 1,143 / 1,286). Ist ein Bonus gewollt, die Preise in ct passend anzeigen. Keine neuen Zahlen von mir; das ist reine Umrechnung. |
| 25 | „Je höher der Preis, desto mehr Einnahmen – aber die Kunden werden unzufriedener.“ (`kontext.ts:194`) | richtig | Stimmt. | – |
| 26 | Förderung: „40 % der Baukosten fließen zurück – nur, wenn du erst nach dem Bescheid baust.“ (`kontext.ts:197`) | vereinfacht-ok (Sicherheit 70) | Nach meinem Wissen passt das zur Bundesförderung für effiziente Wärmenetze: bis 40 %, kein Baubeginn vor der Bewilligung. Die Bibliothek belegt das nicht (Lücke 4). | „bis zu 40 %“ |
| 27 | Heizzentrale „Verfügbare Wärme / Davon genutzt“ in kW (`kontext.ts:184`), Vertrag „… kW freie Leistung“ (`src/core/spiel.ts:300`) | richtig | Saubere Einheiten. | – |
| 28 | Startwahl: „Jedes Heizhaus beginnt mit einer Quelle … keine Sackgasse.“ (`src/ui/start.ts:23`) | richtig | Spieltext, keine Fachaussage. | – |
| 29 | Hinweis „Alle Wärmenetze und Werte sind fiktiv. Das Spiel vereinfacht stark …“ (`src/ui/einstellungen.ts:42`) | richtig | Erfüllt diesen Teil von A18; der Hinweis ist in den Einstellungen erreichbar. | – |
| 30 | Aufträge (`auftraege.ts:12-26`) | richtig, außer „main“ (siehe #13) | „25er-Leitung bis ans Haus“ passt zu einem Einfamilienhaus mit 10 kW. | – |
| 31 | Einnahmen in €/min zu einem Preis in ct/kWh | vereinfacht-ok | Ein Haus mit 10 kW nimmt 20 €/min ein. Bei 14 ct/kWh wären es echt etwa 2,3 ct/min, also rund das 860-fache. Für ein Spiel mit Zeitraffer in Ordnung. | Optional im Hinweis: „Die Spielzeit läuft stark gerafft.“ |

### Spielregeln in `src/core/netz.ts`
| # | Regel / Fundstelle | Urteil | Begründung |
|---|---|---|---|
| 32 | Versorgung nur über eine durchgehende Leitung (`netz.ts:74-111`) | richtig | – |
| 33 | Kapazität: Last ≤ Nennleistung; eine Überlastung davor macht alles dahinter kalt (`netz.ts:127-132`) | vereinfacht-ok | Echt würden zuerst die fernsten Kunden zu wenig bekommen, nicht alle gleichzeitig. Probleme: Einspeisung (#16) und Anzeige (#15). |
| 34 | Planungsfehler „dicker in Fließrichtung“ (`netz.ts:133-140`) | richtig, entspricht W1 | Nur der Text ist ungenau (#14). |
| 35 | Nähe zuerst bei zu wenig Wärme (`netz.ts:160-173`) | vereinfacht-ok | Plausibel, denn die fernen Häuser am Netzende leiden in der Praxis zuerst. |
| 36 | Merit-Order: die günstigste Quelle läuft zuerst (`netz.ts:175-191`) | richtig | – |
| 37 | Abwärme ist günstig, nach den kostenlosen Außenanlagen (`netz.ts:182-184`) | vereinfacht-ok | – |
| 38 | PV senkt die Stromkosten: Faktor ≥ 0,25, bezogen auf die eingebaute elektrische Leistung (`netz.ts:177`) | vereinfacht-ok | PV liefert im Spiel dauerhaft, nicht nur tagsüber. |
| 39 | Wärmeverluste der Leitungen | Lücke (keine Falschaussage) | Verluste gehören zum Fachgebiet, kommen im Spiel aber nicht vor und werden auch nirgends behauptet. Idee für später. |

---

## Pflichtfragen

**1. Betroffene bestätigte Regeln**

| Regel | Umsetzung im Code | Test | Status |
|---|---|---|---|
| W1: Die Rohrdimension nimmt in Fließrichtung nie zu | `netz.ts:133-140` (Rang Kind > Rang Eltern ergibt Planungsfehler) | `tests/netz.test.ts` „A8“ (3 Fälle) | Umgesetzt und getestet. Der Text (#14) und der Hallenbad-Auftrag (#13) passen nicht dazu. |

W2, W3, W6 und W7 sind nur „offen“, keine Prüfpflicht. Am nächsten am Spiel ist W2 (Anschluss nie größer als die Leitung, an der er hängt): Der 110er-Hinweis für Großabnehmer verstößt gegen W2. W4 und W5 (Grenzwerte) sind im Spiel nicht nachgebildet.

**2. Automatische Plausibilitätsprüfung?** Teilweise. Ein Test prüft „genutzt ≤ verfügbar“ (Energieerhaltung, `tests/netz.test.ts:101`). Es gibt aber keine Prüfung, die über jedes Ergebnis läuft, etwa „Einspeisung ≤ Leitungskapazität“ oder „Einnahme im Verhältnis zum Preis“. Fehlerproben (getestet):
- W1-Vergleich umgedreht (`netz.ts:137`): ERKANNT
- Kapazität verdoppelt (`netz.ts:131`): ERKANNT
- Merit-Order umgedreht (`netz.ts:186`): ERKANNT
- Nähe-zuerst umgedreht (`netz.ts:165`): ERKANNT
- PV-Wirkung abgeschaltet (`netz.ts:177`): ERKANNT
- Einnahmefaktor „teuer“ 1,2 → 0,9 (`katalog.ts:273`): **NICHT ERKANNT**, hier fehlt ein Test. Ein „teurer“ Preis könnte also weniger einbringen als „fair“, und kein Test würde es merken.

**3. Referenzfälle?** `tests/referenz/` gibt es nicht. Bei bewusst nicht kalibrierten Spielzahlen gibt es keine echten Sollwerte; die Regel-Tests in `tests/netz.test.ts` decken die Kernlogik ab. 112 von 112 Tests sind grün (`npm test`, getestet).

**4. Erwartete Werte verändert?** Ja, in F5 (`dd9285f`) wurden `tests/netz.test.ts` und `tests/spiel.test.ts` geändert. Geprüft per `git show`: Es wurden nur die Namen p1/p2/p3 durch d25/d50/d110 ersetzt; Leistungen und Erwartungen sind unverändert. Das ist in `docs/ENTSCHEIDUNGEN.md` dokumentiert. Echte Referenzwerte gibt es nicht. Deshalb ist das kein Rot-Fall.

**5. Unabhängig nachgerechnet**
- Leitungen nach Querschnitt (12 kW × (d/25)²) ergeben 12 / 19,7 / 30,7 / 48 / 76,2 / 108 / 155,5 / 232,3 kW. Die Spielwerte weichen davon um 0,95 bis 1,05 ab, also höchstens ±5 %.
- Preis ÷ 14 ct ergibt 0,714 / 0,857 / 1 / 1,143 / 1,286. Die Spielfaktoren sind 0,7 / 0,85 / 1 / 1,2 / 1,45. Die oberen zwei weichen ab (#24).

**6. Wissenslücken (fertige Recherchefragen)**
1. Welche Wärmeleistung in kW überträgt ein Kunststoff-Nahwärmerohr mit Außendurchmesser 25 / 32 / 40 / 50 / 63 / 75 / 90 / 110 mm bei üblicher Temperaturspreizung (Vorlauf minus Rücklauf, in K) und üblichem Druckverlust (in Pa/m)? Gilt für: Verteilnetz und Hausanschlüsse im ländlichen Nahwärmenetz. Einheit: kW.
2. Welche Jahresarbeitszahl (kWh Wärme je kWh Strom) haben Großwärmepumpen in Nahwärmenetzen, getrennt nach Wärmequelle Luft / Erdsonde / Abwärme? Gilt für: Netze mit 60–80 °C Vorlauf. Einheit: dimensionslos. Hintergrund: Im Spiel ist die Wärmepumpe sechsmal günstiger als Power-to-Heat (0,15 gegen 0,9), was einem Faktor 6 entspräche.
3. Wie hoch ist der Arbeitspreis für Nahwärme in Deutschland, ohne Grundpreis? Gilt für: Haushaltskunden in ländlichen Netzen, aktuelles Jahr. Einheit: ct/kWh brutto.
4. Wie hoch ist die Investitionsförderung der Bundesförderung für effiziente Wärmenetze (BEW), und ab wann darf gebaut werden? Gilt für: Neubau eines Wärmenetzes. Einheit: % der förderfähigen Ausgaben.
5. Brauchen Erdsondenfelder in warmen Nahwärmenetzen immer eine Wärmepumpe? Gilt für: Netze mit über 50 °C Vorlauf. Einheit: ja/nein mit Quelle.

**7. Vorgeschlagene Regeln (vorgeschlagen, Simon bestätigt)**
- V1: Wärme, die von außen eingespeist wird, ist höchstens so groß wie die kleinste Leitungskapazität auf dem Weg zur Heizzentrale.
- V2: Ein Speicher erzeugt keine Wärme. Er gibt höchstens ab, was Quellen vorher hineingeladen haben.
- V3: Die Einnahme ist proportional zum Wärmepreis in ct/kWh (bei gleicher Liefermenge).
- V4: Eine PV-Anlage ist eine Stromquelle; Texte über „Wärme ins Netz“ gelten für sie nicht.

---

## Befunde (Sicherheit ab 80)
| Befund | Sicherheit | Beleg | Praktische Folge | Was tun |
|---|---|---|---|---|
| B1: PV-Text „keine Wärme ins Netz“ ist falsch | 90 | `kontext.ts:154`, Probe C | Der Spieler lernt, PV mache Wärme | Text #6 |
| B2: „Reihenhaus = drei Wohnungen unter einem Dach“ ist falsch | 90 | `katalog.ts:207` | Falscher Begriff | Text #18 |
| B3: Erdsonde als kostenlose Heizwärme ohne Wärmepumpe | 85 | `katalog.ts:153`, Probe F | Falsches Bild von Erdwärme | Text #9 |
| B4: Einspeisung ohne Leitungsgrenze | 90 | `netz.ts:146,153`, Probe A/B | Widerspricht der angezeigten Regel „überträgt bis 12 kW“ | V1 umsetzen oder als Vereinfachung benennen |
| B5: 110er-Pflicht für Großabnehmer führt in einen Planungsfehler | 85 | `katalog.ts:193`, `kontext.ts:139`, `auftraege.ts:20`, Test „Hallenbad an d50“ | Falsche Lehre; widerspricht W1/W2 | Texte #13 |
| B6: „Überlastet“ erscheint auch hinter der Überlastung | 85 | `kontext.ts:164`, Probe E | Der Spieler tauscht die falsche Leitung | #15 |
| B7: Einnahme-Faktor passt nicht zum Preis und wird von keinem Test geprüft | 85 | `katalog.ts:273-274`, Fehlerprobe „NICHT ERKANNT“ | Preis × Menge stimmt nicht | #24, Test ergänzen |
| B8: Pufferspeicher heizt ohne Quelle und kostenlos | 85 | Probe D | „Speicher = Gratis-Wärme“ | Text und Regel #7 |

## Unsichere Beobachtungen (unter 80)
- Die mm-Angaben sind vermutlich Außendurchmesser (75).
- Die Förderquote von 40 % passt nach meinem Wissen zur BEW, belegt habe ich das nicht (70).
- Das Verhältnis der Betriebskosten Wärmepumpe zu Power-to-Heat (1 : 6) wirkt hoch (60, Lücke 2).
- Der Text zum Planungsfehler ist im Sonderfall „dünn direkt an der Heizzentrale“ ungenau (80, dort unter #14 eingeordnet).

## Bitten an den Projektleiter
- Bericht als `/home/user/W-rmenetz-Dorf/docs/FACHPRUEFUNG_F5.md` ablegen; das darf ich als Fachprüfer selbst nicht.
- B4 und B8 sind Spielregel-Entscheidungen: festlegen, ggf. mit Simon. Danach kann ich erneut prüfen.
- Die Vorschläge V1–V4 Simon zur Bestätigung vorlegen.
