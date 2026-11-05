# Offene Fragen

Der Projektleiter rät nicht, sondern notiert hier – vollständig ausgeschrieben – und macht mit unabhängigen Paketen weiter.
Die Team-Tafel zeigt, wie viele Punkte offen sind.

## Fragen an Simon
Je Frage: was zu entscheiden ist, die Empfehlung des Teams, was ohne Antwort passiert. Erledigte Fragen mit ✅ und Antwort markieren.

- **Q1 (blockiert: ja/nein):** [Frage in einem Satz] – Empfehlung: [ … ] – ohne Antwort: [ … ]

## Fachliche Bestätigungen für Simon
Nur fachliche Sollwerte (erwartete Rechenergebnisse) und Fachregeln – technische Freigaben prüft der Kritiker, der Projektleiter trägt sie ein. Erledigte mit ✅ markieren.

- **F1:** [Regel oder Sollwert in einem Satz] – Quelle: [ … ] – Empfehlung: [bestätigen / ändern]

## Nur Simon
Was nur ein Mensch tun kann. Hält den Lauf nie an. Erledigt: `- [x]`.

- [ ] [Was] – so geht es: 1. … 2. … 3. …

## Frage an Simon: „in den jeweiligen Orten dann das alles gebaut“
Simon schrieb nach dem Querformat-Wunsch: „und wie gesagt in den jeweiligen orten dann das alles gebaut“. Ich bin nicht sicher, was gemeint ist. Zwei Lesarten: (a) Man baut im eigenen Dorf und die Nachbardörfer (A17) zeigen ihre eigenen gebauten Dinge – so ist es geplant; (b) es sollen **echte Orte** gespielt werden (Karte eines echten Dorfes mit seinen Häusern, z. B. aus OpenStreetMap) – das steht bisher als Idee A20 und wäre eine große Erweiterung. Empfehlung: erst (a) fertig bauen, (b) danach als eigenes Vorhaben planen. Bitte kurz sagen, welche gemeint ist.

## Beantwortet durch Simon (2026-11-04)
Frage „in den jeweiligen Orten“: Es ist Lesart (b): Man sucht einen Ort, er wird geladen und dort gespielt (A21). Offen für Simon/Planung: Datenquelle (Empfehlung OpenStreetMap, braucht Netz beim Laden; Lizenz ODbL mit Quellenangabe), Umfang der ersten Version (ein paar vorbereitete Orte vs. freie Suche). Zudem T-Stück-Regel (A23) fachlich zu bestätigen.

## Fragen aus dem Ideen-Lauf (docs/wow-ideen.md)
S1 Spielst nur du oder später auch Laien? S2 Spielzeit: 1 Spieljahr ≈ 2–3 Wochen echt (Empfehlung) oder echter Kalender? S3 Echte Netze in Hilpoltstein/Dornhausen/Obermässing, auf die sich das Spiel beziehen darf? S4 Dauerhaft ohne Echtgeld (Empfehlung: ja)? S5 Echte Förderprogramm-Namen oder fiktive? Zusätzlich: typische Rücklauftemperatur in einem normalen Dorfnetz (für A28).

- **Bauzeit eines Bauabschnitts (A41):** Aktuell 15 Minuten echt (vor der Vorführung verkürzt; „ein Spieljahr“ wären ca. 17 Stunden). Soll der Wert so bleiben oder länger sein? Mit `KONSTANTEN.abschnitt_bau_s` leicht änderbar.
- **Heizzentrale-Ziele (A39):** Stufe 2: 3 Anschlüsse; 3: 5 Anschlüsse + 80 kW; 4: 8 + 140 kW + 25 K Spreizung; 5: 11 + 200 kW + 30 K. Spielwerte, bitte prüfen.
- **Fachprüfung offen (Reviewer-Hinweis):** PV-Leistung (Dach und Außenanlage) wird im Spiel als Dauerleistung gerechnet; real liefert PV im Jahresmittel nur etwa 10–12 % der Spitzenleistung. Soll das im Spiel vereinfacht bleiben oder mit Ertragsfaktor gerechnet werden? Dazu Spreizung (Grundwert 20 K) und Upgrade-Werte dem Fachprüfer vorlegen.

## Stationen „HP 1000 / ÜP 1000 / HP 800 / ÜP 800“ (2026-11-05)
Recherche (docs/recherche/stationen-hp-up.md, Sicherheit gelb): Die Bezeichnungen sind im Netz nicht eindeutig belegt, kein Hersteller-Treffer. Frage an Simon: Von welchem Hersteller/Projekt stammen die Namen, und was bedeuten HP/ÜP und 800/1000 (Liter? l/h? kW passt nicht zu „ab 40 kW“)? Gefunden: Wandstationen gibt es real etwa von 10 bis 50–80 kW (indirekt, mit Wärmeübertrager). Bis zur Antwort bleibt der Stationskatalog unverändert (Wandstationen 15–80 kW). Umsetzung „Wandstation erst ab 40 kW, darunter HP/ÜP“ wartet auf Simons Antwort.

## Nur Simon: Fotos der Mitarbeiter (2026-11-05)
Die Fotos in public/figuren/ zeigen echte Personen und werden mit dem Spiel öffentlich bei Cloudflare ausgeliefert. Bitte vor der Veröffentlichung das Einverständnis aller fünf einholen (Recht am eigenen Bild, DSGVO). Zum Entfernen: Dateien löschen, dann erscheinen automatisch die gezeichneten Gesichter.

## Fragen an Simon (2026-11-05, nach Prüfrunde A45–A66) – beantwortet 2026-11-05
Q2: 10 m · Q3: 40 °C Mindest-Rücklauf (A73) · Q4: passt · Q5: ja, weiter so · F2: bestätigt (W8) · F3: später klären

- **Q2 (blockiert: nein):** Wie viele Meter ist ein Feld lang? – Empfehlung: 10 m (dann wären Gestattung 150 €/m und Spülbohrung 800 €/m; beides eher hoch) – ohne Antwort: Preise bleiben als reine Spielwerte, Fachprüfer kann sie nicht gegen echte Preise prüfen.
- **Q3 (blockiert: nein):** Welche Rücklauftemperatur darf ein Haus mindestens haben? – Hintergrund: Mit 55 °C Vorlauf und allen Upgrades rechnet das Spiel heute 17 °C Rücklauf, das geht real nicht. Empfehlung: Mindest-Rücklauf 30 °C, Spreizung höchstens Vorlauf minus 30 K – ohne Antwort: bleibt wie heute.
- **Q4 (blockiert: nein):** Vorsehung 300 € und Anbohrung 2.500 € (Spielwerte; Recherche fand keine Baukosten, nur Kundenpreise wie Adelsdorf „Abzweig“ 3.000 € brutto) – passen die Größenordnungen aus deiner Praxis?
- **Q5 (blockiert: nein):** Kartenoptik: Designer schlägt die Richtung „Lebendige Miniatur“ vor (Umrisse, kräftige Farben wie im Ladebild). Erster Teil ist eingebaut (A70). Weiter so (sattere Wiese, Heizzentrale wie im Ladebild, detailliertere Bäume)?

## Fachliche Bestätigungen für Simon (2026-11-05)
- **F2:** Eine Leitung wird von der Heizzentrale weg nur an einem Abzweig (T-Stück) kleiner, nie mitten auf der Strecke – Quelle: Simon, Fachprüfer: physikalisch haltbar (zwischen zwei Abzweigen gleiche Wassermenge) – Empfehlung: bestätigen (als Regel W8).
- **F3:** Ein BHKW erzeugt Strom nur im Verhältnis zur tatsächlich erzeugten Wärme (0,8 kW Strom je kW Wärme, Spielwert) – Quelle: Fachprüfer (Kraft-Wärme-Kopplung) – Empfehlung: bestätigen.

## Fragen an Simon (2026-11-05, zu A71–A76)
- **Q6 (blockiert: nein):** Leitungsleistung ab der 40er: von deinen Werten (25er 15 kW, 32er 25 kW) nach Rohrquerschnitt fortgeschrieben: 40er 40, 50er 60, 63er 95, 75er 135, 90er 195, 110er 290 kW. Passt das, oder hast du eine eigene Tabelle?
- **Q7 (blockiert: nein):** Der Puffer ist jetzt eine eigene Einbau-Option im Haus (1.800 €, Spielwert). Sollen stattdessen die Stationstypen HP/ÜP (mit Puffer) als Stationen kaufbar sein? Was bedeuten 800/1000 (Liter Puffer?)
- **F3 (offen, Simon: später):** BHKW – Antwort an Simon: Ein Blockheizkraftwerk erzeugt Strom (Kraft-Wärme-Kopplung, Motor treibt Generator, Abwärme heizt). Strom braucht die Wärmepumpe. Wir klären später, ob die 0,8 kW Strom je kW Wärme passen.

## Fragen an Simon (2026-11-05, Fachprüfung A81 Monatsabrechnung – Ampel GELB, nichts Falsches im Spieltext)
- **Q8 (blockiert: nein):** Warmwasser: Die Monatstabelle gilt nur für Heizwärme; im Sommer wird dadurch zu wenig verbraucht (EFH im Juli 200 kWh). Vorschlag: gleichmäßiger Warmwasser-Sockel (Anteil noch zu recherchieren, L2). – Empfehlung: ja, nach Recherche.
- **Q9 (blockiert: nein):** Grundgebühr: Klinik und Hallenbad zahlen dieselben 32 € wie ein Einfamilienhaus. Real hängt der Grund-/Leistungspreis meist an der Anschlussleistung (kW). Vorschlag: Grundgebühr × kW ÷ 10 kW (EFH = 32 €, Klinik 70 kW = 224 €). – Empfehlung: ja.
- **Q10 (blockiert: nein):** Netzverluste laufen auch im Sommer weiter; im Spiel sinken die Erzeugungskosten im Juli fast auf null. Vorschlag: fester Anteil Verlustkosten übers Jahr. – Empfehlung: später, zusammen mit den Netzverlusten.
- **Rechercheaufträge (Fachprüfer):** L1 echte Nahwärme-Tarife Dorf/Biomasse (Arbeits-, Grund-, Messpreis); L2 Warmwasser-Anteil EFH; L3 „Heize dein Dorf klimaneutral“ rechtlich vor Store-Veröffentlichung (EU-Richtlinie 2024/825, UWG) – an Sicherheitsprüfer/rechtliche Prüfung; L4 aktuelle Norm der Gradtagszahlen-Tabelle und AVBFernwärmeV zur monatlichen Abrechnung.
