# Entscheidungen des Projektleiters

Format: `- Datum | was entschieden | warum | was es kostet, wenn es falsch ist`

## Auftrag: Spiel bauen nach „Mein Wärmedorf“
- 2026-11-04 | Besetzung bleibt Solo | eigenes Spielprojekt, keine Spielerdaten, kein Store (CLAUDE.md) | muss vor einer Veröffentlichung auf Kunde + Sicherheitsprüfer hochgestuft werden
- 2026-11-04 | Simons „fang jetzt an zu bauen“ gilt als Startfreigabe | ausdrückliche Aufforderung, Vorlage ist von ihm gewählt | Simon kann Optik und Technik nach der ersten spielbaren Fassung ändern
- 2026-11-04 | Technik: Vite + TypeScript + Vitest, Darstellung mit Canvas 2D (Code aus der Vorlage übernommen), PWA mit eigenem Service Worker; kein Three.js, kein Phaser | Vorlage ist Canvas-2D und läuft flüssig auf dem Handy; schnellster Weg zur spielbaren Fassung; Capacitor bleibt später möglich | Bei großen Dörfern (OSM-Import) könnte eine GPU-Engine nötig werden; die Trennung Logik/Darstellung macht den Tausch möglich
- 2026-11-04 | Spielzahlen bleiben die der Vorlage (Spielzahlen, nicht kalibriert), aber mit Einheit im Namen (kW, €) | CLAUDE.md verlangt Einheiten; Vorlage nennt sie nur „Wärme“ | Zahlen müssen ggf. vom Fachprüfer nachjustiert werden
- 2026-11-04 | Währung „Dorftaler“ (Vorlage) statt „Förderbescheide“ (verworfenes Konzept) | folgt der gewählten Vorlage | Umbenennung ist eine Textänderung

- 2026-11-04 – Querformat statt Hochformat: Handy-Layout 844×390 (Anzeigen in einer Reihe oben, Bau-Katalog und Kontextkarte als Seitenfläche rechts, Startzoom 2,2); im Hochformat Hinweis „Bitte drehe dein Handy“; Drehsperre wo der Browser sie erlaubt – Simon wünscht nur Querformat. Die Prüfgröße 390 px im Designentwurf gilt damit als 844×390.

- 2026-11-04 – Leitungen in acht Durchmessern (25er–110er) mit Farben nach Simons Vorgabe ersetzen Hausanschluss/Verteil-/Hauptleitung. Leistungen sind Spielzahlen (12/20/30/50/80/110/160/220 kW, ungefähr mit dem Querschnitt wachsend); 75er–110er ab Heizzentrale Stufe 2. Der Fachprüfer soll Durchmesser und Leistungen prüfen (A18).

- 2026-11-04 – Schriften-Pakete `@fontsource/baloo-2` und `@fontsource/nunito-sans` (Version 5.3.0, fest) aufgenommen, damit die Schriften offline mitgeliefert werden (A16, M10). Die automatische Download-Zahl-Prüfung der Schranke ist in dieser Umgebung nicht erreichbar („nicht abrufbar“); von mir von Hand geprüft: offizielles Fontsource-Projekt, Lizenz SIL OFL, npm audit ohne Befunde. Bitte beim Abschluss vom Reviewer gegenlesen.
- 2026-11-04 – Bestehende Tests `netz.test.ts` und `spiel.test.ts` nur umbenannt (Leitungs-IDs p1/p2/p3 → d25/d50/d110, gleiche Leistungen 12/50/220 kW), nicht abgeschwächt – Folge der acht Leitungsdurchmesser.

2026-11-04 – Erste Orte: Hilpoltstein, Dornhausen, Obermässing, vorbereitet statt freier Suche – Simon. Gebäudedaten aus OpenStreetMap (ODbL, Quellenangabe) einmal abrufen und als Datei einbinden; Zugriff auf overpass-api.de ist in dieser Cloud-Umgebung gesperrt (Netzwerkregel), muss freigegeben werden.

2026-11-04 – A38 Weiterlauf: Nachrechnung höchstens 7 Tage; bei Abwesenheit über 5 Minuten fließen die Einnahmen direkt aufs Konto (statt in die Hauskassen) – Grund: Reviewer fand, dass die Betriebskosten sonst die Kasse leeren, während die gedeckelten Hauskassen nichts auffangen.
2026-11-04 – A39 Spreizung = Grundwert 20 K + Rücklauf-Senkung durch Upgrades, unabhängig vom Vorlauf-Regler – Grund: sonst wäre das Ziel durch Hochdrehen des Vorlaufs erreichbar. Spielwert, dem Fachprüfer vorzulegen.
2026-11-04 – Vorführ-Tempo (×1/×10/×60) liegt außerhalb des Spielkerns (src/tempo.ts) und gilt nicht bei verborgenem Fenster.
- 2026-11-05 – Spielstart immer mit Hackschnitzelkessel, keine Quellenwahl (A3 geändert) – Simon: „man startet immer mit nem Hackschnitzelkessel“
- 2026-11-05 – Leitungskarte: Hauptleitung bis zum letzten Abzweig, Hausanschluss ab dem Abknick zum einzelnen Haus (dort darf das Rohr dünner sein; Regel „dünner in Fließrichtung ok“ gilt schon) – Simon
- 2026-11-05 – Starthäuser: am Netz angeschlossene haben eine Übergabestation, nicht angeschlossene keine (Regel statt feste Reihenfolge) – Simon
- 2026-11-05 – A45: Leitungen nur auf öffentlicher Straße; abseits Gestattung 1.500 € je Feld (Spielwert, offen für Fachprüfer), bei Materialbestellung fällig; komplexeres Straßennetz (Ringe, Stich-, Sackgassen) – Simon
- 2026-11-05 – A46: Fluss (2 Felder breit, Nord–Süd östlich der Stadt), Brücke trägt Straße aber keine Leitung, Spülbohrung 8.000 € je Feld (Spielwert, Fachprüfer offen); nichts außer Leitungen/Laternen/Bänken auf Straßen; Startgeld 30.000 € – Simon („100k für den Start ist viel zu viel“); Wert ist ein Schätzwert, Wirtschaftsabgleich per Bot-Simulation steht aus
- 2026-11-05 – A47: Kreuzungsverbot (A23) entfällt; „Hausanschluss ziehen“ sucht per Wegsuche den günstigsten Weg (Euro-Kosten je Feld) zur nächsten Leitung, Rohr = kleinster freigeschalteter Durchmesser, der den Hausbedarf trägt – Simon
- 2026-11-05 – Alte Spielstände (ohne Karten-Version 2) werden beim Laden angepasst: Gebäude auf Straße/Fluss ziehen aufs nächste freie Feld, Landschaft und Leitungen im Fluss verschwinden – Simon meldete Häuser auf Straße/im Fluss im gespeicherten Stand
- 2026-11-05 – A48: Karte in 90°-Schritten drehbar (Knöpfe unten links, Tasten Q/E); Gebäude-Grafik bleibt dieselbe aus jeder Richtung – Simon: Leitungen hinter Häusern
- 2026-11-05 – A49: Leitungskapazität × (mittlere Spreizung ÷ 20 K) – physikalisch Q = m·c·ΔT; Rücklauf-Upgrades erhöhen so die Kapazität (max. +90 % mit allen drei Upgrades). Verluste/Effizienz bewusst noch nicht modelliert; Faktor ist Spielwert, Fachprüfer offen – Simon fragte, ob Rücklaufsenkung wirklich etwas bringt (vorher nur Voraussetzung für HZ-Stufe 4/5)
- 2026-11-05 – A50: 40 statt 18 Häuser; Interessent alle 600 s Zufriedenheit (≥ 75 %), max. 4, 20 % Stationsnachlass (Spielwerte)
- 2026-11-05 – A47: Hausanschluss-Wegsuche mit Biegungsaufschlag 900 €, Ziehen mit Achsensperre (Knick erst bei 2 Feldern Seitenzug), Radierer und „Letzte zurück“ im offenen Bauabschnitt
- 2026-11-05 – A51: Helfer erscheinen mit gezeichnetem Gesicht und Sprechblase (Foto-Ersatz per Datei public/figuren/<name>.jpg, Einverständnis nötig); Lieferzeit = Bauzeit des Abschnitts in Spielwochen (1 Spieljahr = 52 Wochen), mindestens 1
- 2026-11-05 – A51: Echte Fotos von Sebastian, Manfred, Christian, Laura, Philipp (von Simon geliefert, in der Reihenfolge seiner Nachricht zugeordnet) als public/figuren/<name>.jpg; Einverständnis der Personen vor Veröffentlichung bei Cloudflare ist Simons Sache (Recht am eigenen Bild)
- 2026-11-05 – A52: Wärmepreis-Regler von Büro in Heizzentrale verschoben; Fotos mit Hintergrundentfernung (lokales Segmentierungsmodell u2net_human_seg, nur einmalig zur Bildaufbereitung genutzt) als webp mit Transparenz
- 2026-11-05 – A53: Straße neu (Asphalt/Gehweg/Bordstein/Markierung/Zebra/Laternen/Autos), Gärten mit Zaun und Weg; Zahnrad im Dorfschild, weil Einstellungen vorher nur über das Antippen des Dorfschilds erreichbar waren – Simon fand das Zurücksetzen nicht
- 2026-11-05 – A54: kW-Schalter als Knopf links unten und Taste K (gespeichert in den Einstellungen); Zebrastreifen auf rund ein Sechstel reduziert – Simon: viel zu viele Zebrastreifen
- 2026-11-05 – A55: Freies Drehen als Gestenschritte à 90° (Zwei-Finger-Drehung, Mittelmaustaste), nicht stufenlos – stufenlos würde das gesamte Zeichnen der Felder umbauen; Gartenränder entfernt – Simon: sehen schlimm aus
