# Entscheidungen des Projektleiters

Format: `- Datum | was entschieden | warum | was es kostet, wenn es falsch ist`

## Auftrag: Spiel bauen nach „Mein Wärmedorf“
- 2026-11-04 | Besetzung bleibt Solo | eigenes Spielprojekt, keine Spielerdaten, kein Store (CLAUDE.md) | muss vor einer Veröffentlichung auf Kunde + Sicherheitsprüfer hochgestuft werden
- 2026-11-04 | Simons „fang jetzt an zu bauen“ gilt als Startfreigabe | ausdrückliche Aufforderung, Vorlage ist von ihm gewählt | Simon kann Optik und Technik nach der ersten spielbaren Fassung ändern
- 2026-11-04 | Technik: Vite + TypeScript + Vitest, Darstellung mit Canvas 2D (Code aus der Vorlage übernommen), PWA mit eigenem Service Worker; kein Three.js, kein Phaser | Vorlage ist Canvas-2D und läuft flüssig auf dem Handy; schnellster Weg zur spielbaren Fassung; Capacitor bleibt später möglich | Bei großen Dörfern (OSM-Import) könnte eine GPU-Engine nötig werden; die Trennung Logik/Darstellung macht den Tausch möglich
- 2026-11-04 | Spielzahlen bleiben die der Vorlage (Spielzahlen, nicht kalibriert), aber mit Einheit im Namen (kW, €) | CLAUDE.md verlangt Einheiten; Vorlage nennt sie nur „Wärme“ | Zahlen müssen ggf. vom Fachprüfer nachjustiert werden
- 2026-11-04 | Währung „Dorftaler“ (Vorlage) statt „Förderbescheide“ (verworfenes Konzept) | folgt der gewählten Vorlage | Umbenennung ist eine Textänderung
