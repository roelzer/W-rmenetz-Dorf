<!-- Stand 2026-11-05 abends: A71–A83 gebaut und (bis auf A83) geprüft, A84 Menü-Stil v2 in Arbeit, NR1–NR10 vorgemerkt, 268 Tests grün -->
# Status

**Auftrag:** Heatnet (Wärmenetz-Spiel) · **Zuletzt aktualisiert:** 2026-11-05

> **Jetzt:** A81 freigegeben (Review 🟡), A83 Cloudflare-Vorbereitung im Review, A84 Menü-Stil v2 beim Entwickler; main bekommt den Stand nach A83-Freigabe · Vorgemerkt aus Review-Chat: NR1–NR10 (Freischalt-Leiter, erste 10 Minuten, Begriffe, Öleinsparung, Hilpoltstein raus, Firmenhinweise, Spielname …) · Offene Simon-Fragen: Q8–Q10, Hausstufe = mehr Verbrauch? · **Fortschritt:** 268 Tests · **Arbeitsbranch:** claude/keen-mccarthy-f4p5us

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
Jetzt: A84 Menü-Stil v2 freigegeben (Review 🟡, Designer 🟡, 667-px-Fix gemessen). A86 Wärmlingen, A87 ohne Firmennamen gebaut – Review läuft; danach alles auf main. Nächstes Paket: NR1 Freischalt-Leiter (größer, mit Plan)

## Nachtrag 2026-11-05 (A44)
Straßennetz mit an Straßen ausgerichteten Häusern, nur noch ein Dorf (Hilpoltstein, keine Ortswahl), kleinere Anzeigen oben, Leitungskarte nennt Hausanschluss- bzw. Hauptleitung. 173 Tests grün.
