# Status

**Auftrag:** Wärmenetz-Dorf bauen nach „Mein Wärmedorf“ · **Zuletzt aktualisiert:** 2026-11-04

> **Jetzt:** Nachbesserung nach Reviewer/Fachprüfer (Offline-Dateiliste, Texte, Tastatur) und neue Optik „moderner, weniger kindlich“ · **Zuletzt fertig:** F5 (Nachbardörfer, App/Offline-Grundlage, Schriften, 8 Leitungsdurchmesser), Speicherstand-Migration · **Als Nächstes:** Designer-Überarbeitung, Nachprüfung, Abschluss · **Fortschritt:** 5 von 6 Features, Prüfungen in Arbeit · **Frage an Simon:** docs/OFFENE_FRAGEN.md

## Gerade läuft
Phase Solo: Nachbesserung. Designer-Treue-Prüfung läuft noch; Reviewer (rot) und Fachprüfer (gelb) sind fertig, ihre Befunde werden abgearbeitet (siehe docs/SITZUNGSUEBERGABE.md).

**Arbeitsbranch:** claude/youthful-feynman-jaegcj

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
