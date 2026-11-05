<!-- Stand 2026-11-05 abends: A71–A83 gebaut und (bis auf A83) geprüft, A84 Menü-Stil v2 in Arbeit, NR1–NR10 vorgemerkt, 268 Tests grün -->
# Status

**Auftrag:** Heatnet (Wärmenetz-Spiel) · **Zuletzt aktualisiert:** 2026-11-05

> **Jetzt (2026-11-05 nachmittags):** Branch claude/keen-mccarthy-f4p5us enthält gemergt: A88 P2 Freischalt-Leiter, A89 (Hausanschluss ohne kalte Häuser), A88-Reviewlücken, Designer-Treue Teil 1, NR12 P0 (Szenen-Schlüssel), NR12 P2 (Startbildschirm ruhig) – 663 Tests grün. **Noch nicht auf main.**
> Offen vor main: (1) Tester-Test A89 W1 „mehrere Anschlüsse im selben Abschnitt“ + gemeinsame Testhilfe (läuft, Branch tester-a89-w1); (2) Designer-Treue Teil 2 (Branch design2-bau 6980499) im Review + Designer-Nachprüfung auf Worktree scratchpad/vorschau (dba9c76); dann Merge → main.
> NR12/A90 (Ruckeln, Simon: „ruckelt sogar am Laptop“): Bauplan docs/bauplaene/NR12-fluessig.md Fassung 2. Läuft: P3a Bodenebene (Branch nr12-p3a auf 44463cc, inkl. P0-Review K1–K3), P4 Messwerkzeug (Branch nr12-p4). Danach P1 Takt/Auflösung/Sparmodus (nach P0 baubar), dann P5 Verdrahtung + Zusammenspieltest, dann Messung am Handy (Messanzeige ?messen=1).
> Sammelliste: P2-Testlücken + tote CSS stil.css:330–331; Kommentar spiel.ts:653 (A89 K1); Designer Kann 4/7; NR15 Netzmodell „Haus an seiner Leitung“ (nach NR12).
> Offen an Simon: Q11 Abgleich, Bild Anleiter-Figur, Dorfname Wärmlingen, Cloudflare-Werkzeuge in settings.json; E2/E3 NR12 mit Empfehlung angenommen (E1 = ruhiger Startbildschirm ohne Dampf).

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
Jetzt: Weiter in neuer Sitzung (Kontext voll). A88 P2 Zwischenstand als Patch in docs/bauplaene/A88-P2-zwischenstand.patch; siehe SITZUNGSUEBERGABE.md

## Nachtrag 2026-11-05 (A44)
Straßennetz mit an Straßen ausgerichteten Häusern, nur noch ein Dorf (Hilpoltstein, keine Ortswahl), kleinere Anzeigen oben, Leitungskarte nennt Hausanschluss- bzw. Hauptleitung. 173 Tests grün.
