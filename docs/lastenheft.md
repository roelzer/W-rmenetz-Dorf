# Lastenheft – Wärmenetz-Dorf

Stand: 2026-11-04 · Vorlage für Optik und Spielgefühl: Prototyp „Mein Wärmedorf“ (Simon, 2026-11-04).
Simons Auftrag: „Nimm den aktuellsten Artefakt (Mein Wärmedorf) … dann fang jetzt an zu bauen.“
Das Spielkonzept „Wärmenetz-Tycoon“ ist verworfen und gelöscht; nur seine Fachideen gelten als Ideensammlung.

Muss = für die erste spielbare Fassung · Soll = danach · Idee = nur notiert.

| Nr. | Stufe | Anforderung | Abnahmekriterium |
|---|---|---|---|
| A1 | Muss | Das Spiel läuft im Handy-Browser **nur im Querformat** (Entscheidung Simon 2026-11-04; Prüfgröße 844×390 px, im Hochformat erscheint „Bitte drehe dein Handy“) mit Touch-Bedienung: Schieben, Zwei-Finger-Zoomen, Antippen. | Bei 844×390 px kein Scrollen der Seite; alle Tippflächen ≥ 44 px (Bildschirmfoto + Messung); Pinch und Ziehen bewegen die Karte. |
| A2 | Muss | Isometrische Dorfansicht im Stil von „Mein Wärmedorf“: warme Farben, Umrisse, Schatten, Bewegung (Rauch, Wasser, Münzen). | Designer bestätigt Treue zu `docs/DESIGN.md` per Bildschirmfoto; Animation läuft flüssig (60 Bilder/s Ziel). |
| A3 | Muss | Zum Start wählt der Spieler seine erste Wärmequelle (Hackschnitzelkessel, Großwärmepumpe, Power-to-Heat-Kessel) mit Vor- und Nachteil. | Neues Spiel zeigt die Auswahl; die gewählte Quelle steht danach im Heizhaus und liefert Wärme. |
| A4 | Muss | Bauen aus einem Katalog mit Kategorien (Heizhaus, Außenanlagen, Leitungen, Häuser, Dorf, Deko); Platzieren mit Vorschau (grün/rot), Verschieben, Entfernen. | Jedes Objekt lässt sich platzieren, verschieben (außer Großabnehmer), wo sinnvoll entfernen; ungültige Plätze werden abgelehnt. |
| A5 | Muss | Bauzeiten als Timer mit absoluter Zeit; gleichzeitige Baustellen sind durch Monteur-Trupps (Monteurhütten) begrenzt; Beschleunigen mit Dorftalern. | Mit 1 Hütte nur 1 Baustelle; Timer laufen auch bei geschlossenem Spiel weiter. |
| A6 | Muss | Leitungsnetz mit acht Durchmessern (25er rot, 32er grün, 40er hellblau, 50er dunkelblau, 63er pink, 75er gelb, 90er braun, 110er dunkelgrün; Vorgabe Simon) mit je eigener Leistung in kW; Kunden werden nur über eine durchgehende Leitung von der Heizzentrale versorgt. | Haus ohne durchgehende Leitung wird nicht warm; Leitung außerhalb des Netzes ist grau. |
| A7 | Muss | Fachregel Leitungskapazität: Ein Abschnitt kann höchstens seine Nennleistung übertragen; zu wenig Kapazität lässt Kunden dahinter kalt. | Test: Last > Kapazität ⇒ Kunden hinter dem Engpass sind kalt und zahlen nichts. |
| A8 | Muss | Fachregel Dimensionierung in Fließrichtung: wird die Leitung Richtung Kunde dünner und danach wieder dicker, wird der Abschnitt als Planungsfehler markiert. | Test + sichtbare rote Markierung mit Erklärung. |
| A9 | Muss | Wärmeerzeugung: Quellen im Heizhaus (Kessel, Wärmepumpe, Power-to-Heat) und außerhalb (Solarthermie, Erdsonde, Pufferspeicher, PV); Heizzentralen-Stufe bestimmt Plätze und Obergrenzen. | Summe der Quellleistung = verfügbare Wärme; Kunden werden nah-zuerst versorgt, solange Wärme reicht. |
| A10 | Muss | Wirtschaft: Einnahmen nur für tatsächlich gelieferte Wärme; Betriebskosten je Quelle (Brennstoff/Strom); PV senkt die Stromkosten elektrischer Quellen; Kasse im Abrechnungsbüro mit Obergrenze; Wärmepreis in 5 Stufen. | Test: kalter Kunde bringt 0 €; Betriebskosten entstehen nur für tatsächlich erzeugte Wärme; Kasse ist gedeckelt. |
| A11 | Muss | Kunden: Zufriedenheit und Ruf; dauerhaft kalte oder überteuerte Versorgung führt zur Kündigung; Zurückgewinnen möglich. | Test: Zufriedenheit sinkt bei kalt/teuer, unter Schwelle kündigt der Kunde. |
| A12 | Muss | Großabnehmer (Hallenbad, Klinik) mit Vertragsbedingungen; Sägewerk liefert Abwärme als günstige Quelle. | Vertrag nur bei erfüllten Bedingungen; Abwärme zählt als Quelle und ist günstig. |
| A13 | Muss | Förderung als Mechanik: Antrag → Bewilligungs-Timer → bauen → anteilige Rückzahlung; vorzeitiger Baubeginn verfällt den Antrag. | Test der drei Pfade (bewilligt, vorzeitig, ohne Antrag). |
| A14 | Muss | Aufträge (Quests) führen den Spieler durch das Spiel und geben Dorftaler. | Aufträge werden automatisch erkannt und belohnt; genau einer ist aktiv sichtbar. |
| A15 | Muss | Spielstand lokal im Gerät, kein Konto; Fortschritt läuft offline weiter und wird beim Zurückkommen nachgerechnet. | Test: Spielstand speichern/laden; Offline-Zeit ergibt gleiche Einnahmen wie Echtzeit. |
| A16 | Muss | Installierbar als App (PWA) und offline spielbar. | Manifest + Service Worker; nach erstem Laden startet das Spiel ohne Netz. |
| A17 | Soll | Nachbardörfer besuchen und „Gefällt mir“ geben (Beispieldörfer, kein Server). | Besuchsliste mit Rangfolge nach Dorfwert; Besuch zeigt Dorf schreibgeschützt. |
| A18 | Muss | Spiel-Wissen ist fachlich richtig und trägt Einheiten (kW, kWh, €, ct/kWh); Hinweis „Alle Wärmenetze und Werte sind fiktiv“. | Fachprüfer bestätigt alle Wissens-Texte; Hinweis ist im Spiel erreichbar. |
| A19 | Muss | Spiellogik ist von Darstellung getrennt und ohne Grafik testbar. | `src/core` importiert nichts aus Browser/DOM (Architekturtest). |
| A20 | Idee | Wärmeansicht (Boden durchsichtig, Vorlauf/Rücklauf), Jahreszeiten, Kältewelle, echte Dörfer aus OSM, Mehrspieler. | Nicht Teil der ersten Fassung. |
| A21 | Muss | **Ortswahl statt fester Karte** (Simon 2026-11-04: „man sucht nach einer Stadt, wo man anfangen will, die wird geladen“): Spieler sucht einen Ort, dieser wird als Karte geladen und dort gespielt. Häuser mit Größe und geschätztem Verbrauch (Wohn- oder Großverbraucher), damit der Standort des Netzes taktisch gewählt werden kann. (Ersetzt Lesart (a) in OFFENE_FRAGEN; A20 „echte Dörfer“ wird dadurch zur Muss-Anforderung, Datenquelle z. B. OSM – Lizenz und Offline-Fähigkeit klären.) | Entschieden (Simon 2026-11-04): erste Orte **Hilpoltstein, Dornhausen, Obermässing** (vorbereitet, nicht freie Suche). Offen: Datenquelle (OSM per Overpass), Ladeweg (einmal beim Bauen holen und als Datei ins Spiel legen = offline). |
| A22 | Muss | Spielstart klein: Heizhaus (klein) und 2–3 Häuser, **keine** vorgebauten 50er-Leitungen. | Neues Spiel enthält höchstens Heizhaus + 3 Häuser. |
| A23 | Muss | Leitungslogik wie in echt: Hauptleitung dicker, Hausanschluss dünner; der Durchmesser der Hausanschlussleitung ist unabhängig vom Anschluss am Haus; **keine Kreuzungen**, nur T-Stücke. | Test: Kreuzung wird abgelehnt/als T-Stück behandelt; Hausanschluss darf dünner sein als die Hauptleitung ohne Planungsfehler. |
| A24 | Soll | Pufferspeicher (und andere Außenanlagen) sind automatisch mit der Heizzentrale verbunden. | Test: Außen gebauter Speicher zählt ohne eigene Leitung. |
| A25 | Muss | Verbrauch je Haus ist sichtbar (kW, Wohn-/Großverbraucher). | Kontextkarte und Karte zeigen den Verbrauch. |
| A26 | Muss | Spieltempo langsamer: Warten über längere Zeit, Verbesserungen und Ausbau schalten sich nach und nach frei. | Bau-/Einnahmezeiten neu abgestimmt (Balancing-Test). |
| A27 | Muss | Optik moderner, detailreicher, weniger klobig/kindlich (Simon wiederholt) – Entwurf „Ruhige Miniatur“, Umsetzung steht aus. | Designer-Treueprüfung 844×390. |
