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
