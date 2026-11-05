<!-- Stand 2026-11-05 abends: A71–A83 gebaut und (bis auf A83) geprüft, A84 Menü-Stil v2 in Arbeit, NR1–NR10 vorgemerkt, 268 Tests grün -->
# Status

**Auftrag:** Heatnet (Wärmenetz-Spiel) · **Zuletzt aktualisiert:** 2026-11-05

> **Jetzt (2026-11-05 abends):** main = c20ec80, live auf heatville.pages.dev: A88 P2, A89, Designer-Treue 1+2, ruhiger Start, NR12/A90 P0–P5b (flüssig: Takt, Pixel-Obergrenze, Bodenebene, Sparmodus, Messanzeige ?messen=1). 794 Tests grün.
> Wartet auf Simon: Messung am iPhone mit heatville.pages.dev/?messen=1 (Ziel p50 ≤ 17,5 ms, p95 ≤ 25 ms) – entscheidet Z4/Z5/Z8-4× und ob P3b (Gebäude-Ebene) nötig ist.
> Läuft (2026-11-05 spät): main d214666 live mit A92 Teil A + B1 (Anschlussweg erklärt, gesperrte Knöpfe mit Hinweis/Schloss, Großabnehmer-Sperre; 886 Tests). Jetzt: Designer schreibt Sperrtexte für B2 (DESIGN 12.19/12.20); danach Tester-Vorarbeit (menue-v2.test.ts:201 u. a.) → Entwickler B2 (Reiter 12.16, Toast 12.17, Zeichenleiste 12.18, Rest-Sperrtexte, W1c, Hausanschluss-Satz aus ENTSCHEIDUNGEN). Parallel: Architekt schreibt NR15/A91 Fassung 3 (Übergabe docs/bauplaene/NR15-uebergabe-fassung3.md), dann Kritiker, dann P0→P1→P2→P3. Danach NR11, NR13.
> Danach: NR15 bauen, NR11 Vollbild, NR13 Pflicht-Tutorial mit NR2/NR3, kleine Punkte.
> Sammelliste: P2-Testlücken; Kommentar spiel.ts:653 (A89 K1); Stationspreis-Test mit Interessenten-Rabatt; Designer Kann 4/7; NR12: Test Geste→Neuaufbau→Mausrad, Zeigerliste bei lostpointercapture/App verstecken leeren, Gerätetest App-Wechsel mitten in Geste, Speicher Bodenebene iPhone; Tipp „erst dickere Leitung legen“ für NR13; Hausanschluss „kein Weg“ (~30 ms) am Handy messen.
> Offen an Simon: Q11 Abgleich, Bild Anleiter-Figur, Dorfname Wärmlingen, Cloudflare-Werkzeuge in settings.json.

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
