<!-- Stand 2026-11-05 nachmittags: A71–A79 gebaut (kWh/Volllaststunden, Leitungen, Rücklauf 40 °C, Startnetz, freies Drehen, Aufteilung, Knöpfe weg, Ladebild, Namensfrage), 248 Tests grün -->
# Status

**Auftrag:** Heatnet (Wärmenetz-Spiel) · **Zuletzt aktualisiert:** 2026-11-05

> **Jetzt:** A71–A79 fertig, Reviewer-Prüfung steht an · **Als Nächstes:** Reviewer + Fachprüfer über A71–A79, Antworten Q6/Q7 · **Fortschritt:** 248 Tests grün, Schranke projektleiter OK · **Arbeitsbranch:** claude/keen-mccarthy-f4p5us

## Ampel
🟢 läuft

## Features
| Nr. | Was | Stand |
|---|---|---|
| F1 | Gerüst (Vite/TS/Vitest) + Katalog + Netzberechnung mit Fachregel-Tests (A6–A10, A19) | ✅ |
| F2 | Spielzustand, Bauen, Timer, Wirtschaft, Kunden, Förderung, Quests, Speichern/Offline (A3–A5, A11–A15) | ✅ |
| F3 | Darstellung: isometrische Karte, Gebäude, Leitungen, Effekte (A1, A2) | ⏳ |
| F4 | Oberfläche: HUD, Bau-Katalog, Kontextkarten, Startauswahl, Aufträge | ⏳ |
| F5 | PWA/offline, Nachbardörfer besuchen (A16, A17) | ⏳ |
| F6 | Designer-Treue, Reviewer, Fachprüfer (A18) | ⏳ |

## Zurückgestellte kleine Befunde
(keine)

## Offene Fragen
Siehe `docs/OFFENE_FRAGEN.md` (0 offen).

## Stand 2026-11-04 (nach Zwischenstand)
Gebaut und getestet (139 Tests, Gate solo grün): kleiner Start (A22), T-Stück ohne Kreuzungen (A23), Puffer automatisch verbunden (A24), Verbrauch je Haus auf Karte und Karte (A25), langsameres Tempo ×2,5 (A26), Ortswahl mit drei Orten und Beispielhäusern (A21). Offen: echte OSM-Daten, moderner Stil umsetzen (A27), Designer-Mängel, Reviewer, Fachprüfung der T-Stück-Regel.

## Stand 2026-11-04 spät
Jetzt: Demo-Fassung für Simons Chef (morgen früh). Fertig: Wirtschaft (100.000 €, ct/kWh), Leitungstausch/Verkauf 50 %, Übergabestationen, ruhigere Optik. Als Nächstes: Stufen über Netzgröße, Vorlauf/Rücklauf-Regler, PV-Einspeisung, Sichtbarkeit hinter Gebäuden, Designer-Mängel.

## Nachtrag 2026-11-05 (A44)
Straßennetz mit an Straßen ausgerichteten Häusern, nur noch ein Dorf (Hilpoltstein, keine Ortswahl), kleinere Anzeigen oben, Leitungskarte nennt Hausanschluss- bzw. Hauptleitung. 173 Tests grün.
