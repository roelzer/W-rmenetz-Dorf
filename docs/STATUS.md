<!-- Stand 2026-11-05: A45–A66 fertig, 212 Tests grün; zuletzt Logo/Ladebildschirm (A63/A64), Abzweig-Darstellung (A65), Autos raus (A66); Details docs/SITZUNGSUEBERGABE.md -->
# Status

**Auftrag:** Heatnet (Wärmenetz-Spiel) · **Zuletzt aktualisiert:** 2026-11-05

> **Jetzt:** Sitzungswechsel – Übergabe in docs/SITZUNGSUEBERGABE.md · **Zuletzt fertig:** A45–A66 (Straßen/Fluss, Heizhaus-Ausbau, Express, Logo, Ladebildschirm, Abzweige) · **Als Nächstes:** Simons nächste Wünsche; Fachprüfer, Designer-Treue, Reviewer über A45–A66 · **Fortschritt:** 212 Tests grün, Schranke projektleiter OK · **Artefakt:** Version 30 · **Frage an Simon:** docs/OFFENE_FRAGEN.md

## Gerade läuft
Nichts – Sitzung wird übergeben. Kein Agent läuft.

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

## Stand 2026-11-04 spät
Jetzt: Demo-Fassung für Simons Chef (morgen früh). Fertig: Wirtschaft (100.000 €, ct/kWh), Leitungstausch/Verkauf 50 %, Übergabestationen, ruhigere Optik. Als Nächstes: Stufen über Netzgröße, Vorlauf/Rücklauf-Regler, PV-Einspeisung, Sichtbarkeit hinter Gebäuden, Designer-Mängel.

## Nachtrag 2026-11-05 (A44)
Straßennetz mit an Straßen ausgerichteten Häusern, nur noch ein Dorf (Hilpoltstein, keine Ortswahl), kleinere Anzeigen oben, Leitungskarte nennt Hausanschluss- bzw. Hauptleitung. 173 Tests grün.
