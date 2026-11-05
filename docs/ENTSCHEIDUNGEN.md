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
