<!-- Stand 2026-11-05 abends: A71–A83 gebaut und (bis auf A83) geprüft, A84 Menü-Stil v2 in Arbeit, NR1–NR10 vorgemerkt, 268 Tests grün -->
# Status

**Auftrag:** Heatnet (Wärmenetz-Spiel) · **Zuletzt aktualisiert:** 2026-11-05

> **Jetzt (2026-11-05 abends):** main = c20ec80, live auf heatville.pages.dev: A88 P2, A89, Designer-Treue 1+2, ruhiger Start, NR12/A90 P0–P5b (flüssig: Takt, Pixel-Obergrenze, Bodenebene, Sparmodus, Messanzeige ?messen=1). 794 Tests grün.
> Wartet auf Simon: Messung am iPhone mit heatville.pages.dev/?messen=1 (Ziel p50 ≤ 17,5 ms, p95 ≤ 25 ms) – entscheidet Z4/Z5/Z8-4× und ob P3b (Gebäude-Ebene) nötig ist.
> Läuft (2026-11-05 spät): main d214666 live (A92 Teil A + B1, 886 Tests). Jetzt parallel: (1) Tester-Vorarbeit NR16-B2a (Sperrtexte 12.20, Erklärsätze, T-Stück 90 Z.) im Worktree agent-ab0c2ae3fe316af94 → danach Entwickler B2a → Review → main; dann B2b (Reiter 12.16, Toast 12.17, Zeichenleiste 12.18, Fotos) mit eigener Vorarbeit. (2) Tester baut NR15-P0 (Branch tester-nr15-p0). (3) Architekt bessert NR15-Plan nach Kritiker Fassung 3 (N1 P2-Tests, N2, P1-1..5, P3 M5) – danach P1 → P2 → P3. Danach NR11, NR13. Vorarbeiten unter .dev-team/vorarbeit eintragen, sobald angenommen.
> 2026-11-05 nachts: NR15-P1+P2 und B2a auf main (941 Tests), B2a gemergt, beides live auf main. Neu NR17 (→A93) Engstelle Hauptleitung (wohl Ursache von Simons Beschwerde) direkt nach P3.
> 2026-11-05 nachts: NR15 (A91) P0–P3 komplett auf main. B2b komplett auf main (06.11.). Simon 06.11.: kein Auto-Hausanschluss (NR18, Architekt plant), Puffer-Übergabestation als Standard (NR19, Recherche läuft); NR17 geht in NR18 auf. NR18 im Bau: Welle 1 (P0–P5, NR18-W) gemergt, Schranke grün; Designer-Prüfung 🟡 → NR18-D gemergt (bd4a179); NR19-P0b gemergt (5 Rote bis P6); P6 gemergt + Abnahme grün (1237 Tests); Fachprüfer 🟢, auf main (live). NR19-K auf main; NR13 Tutorial: Plan F2 fertig, Kritiker-Nachprüfung + verdeckte Abnahme, Designer 13.15 + Fachprüfer 🟢 2 P6 (NR19). Danach NR13 Tutorial (Design fertig).
> 2026-11-06 nachmittags: NR13 Tutorial – P0–P3 gemergt; P4 (+P4b Browser-Durchklick, Fix 1–3) fertig auf Zweig nr13-p4-fix3 @ deec2dd, Nachprüfung + Designer-Fotos laufen. Verdeckte Abnahme im Probelauf 38/38. Danach: Merge, Aufdecken, Produktprüfer, main. Für Simon: Bildrate am Handy prüfen.
> 2026-11-06 abends: **NR13 Tutorial fertig und auf main (f009a2b), live auf heatville.pages.dev.** 1448 Tests grün, verdeckte Abnahme 38/38, Produktprüfer 🟢 (inkl. Neuladen-Fix T11/T12/T13), Designer M1/K4 erfüllt. Bildrate bei Kamerafahrten im Testbrowser 26–46 B/s – Ursache Leinwand-Malen der Häuser, kein Umbau vor Handy-Messung. Wartet auf Simon: Handy-Messung ?messen=1 (Kamerafahrt T05/T22), Ziehen aufs letzte Feld bei Zoom 2, nächster Auftrag (offen: NR2–NR4, NR7–NR11). Sammelliste NR13: Designer K1–K7, Reviewer K-1–K-4 und K1–K3, Produktprüfer K-a–K-c.
> 2026-11-07: NR20–NR22 (Simon-Rückmeldung Tutorial-Leitungen/Überlast) in Planung. Erledigt: Lastenheft, DESIGN 13.17 F2, Fachprüfer (32er-Hauptleitung, Texte), Bauplan NR20-22 F2. Kritiker F2 🔴 M1–M4 → Entscheidungen (ENTSCHEIDUNGEN 07.11.). Läuft: Architekt F2.1, Designer Satz „eigener Abgang“. Danach: Fachprüfer Satz, Kritiker F2.1, bei 🟢 Bau ohne Rückfrage (Simon: „entscheide selber“): V0+P0 → P1‖P2‖P4 → P3‖P6 → P5 → P7, Review je Paket, Produktprüfer, main.
> Danach: NR17, NR11 Vollbild, NR13 Pflicht-Tutorial mit NR2/NR3, kleine Punkte.
> Sammelliste: P2-Testlücken; Kommentar spiel.ts:653 (A89 K1); Stationspreis-Test mit Interessenten-Rabatt; Designer Kann 4/7; NR12: Test Geste→Neuaufbau→Mausrad, Zeigerliste bei lostpointercapture/App verstecken leeren, Gerätetest App-Wechsel mitten in Geste, Speicher Bodenebene iPhone; Tipp „erst dickere Leitung legen“ für NR13; Hausanschluss „kein Weg“ (~30 ms) am Handy messen. NR18-P3 klein: kurzname nach core/katalog.ts (Duplikat kontext.ts:13 / engstelle.ts:92), Test „Ablehnung des Kerns“ toHaveBeenCalledTimes(4), kurzname zwischen Imports; Zeichenleiste kürzt Ereignisliste (steuerung.ts:445) – im Gesamt-Review ansehen; Frage Simon/Designer: Wischen mit dünnerer Leitung macht geplante dicke dünner. P5: erster Start ohne Funken/Hinweis „Kessel läuft“ (Designer). NR18-P2 klein: Test haus_getrennt beim Verwerfen (spiel.ts:791), Test Warnliste bei Stationstausch in „bestellen“ (spiel.ts:581), Mehrfach-Hinweis bis 134 Zeichen (Designer), Spülbohrung des Ersatzes nicht in Kostenzeile „Spülbohrung“ (spiel.ts:667), M10 3,80/4 ms unbestätigt, verspätete haus_erreicht bei Anfrage/Kündigung. NR18-D klein: START_TIPP-Block verschiebt Kommentar in spiel.ts:39–41; stil.css:165 Radius-Token statt 12px; WEITERE_STELLEN entfernen; geschütztes Leerzeichen vor kW (engstelle.ts); DESIGN 12.22 Grenze 64→65.
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
- 2026-11-07: Bauplan NR20-22 F2.1 committet; Kritiker-Nachprobe läuft. Bei 🟢 Bau starten (V0+P0 → P1‖P2‖P4 → P2-Nachzug → P3‖P6 → P5 → P7).
- 2026-11-07: Bauplan F2.2 fertig, Kritiker-Probe 3 läuft.
- 2026-11-07: Bau gestartet: V0 (Tester) ‖ P0 (Entwickler); parallel Bauplan 2.3 (M1). Nachprobe M1 vor P1.
- 2026-11-07: Bauplan 2.3 (M1) fertig; kurze Kritiker-Nachprobe zu M1 läuft. V0 ‖ P0 laufen.
- 2026-11-07: Bauplan 2.3 🟢. Warte auf V0/P0, dann P1‖P2‖P4.
- 2026-11-07: P0 gebaut (8f681d0), Stopp wegen Architekturtest F2d (7 Tipp-Arten) → Architekt passt an. V0 läuft.
- 2026-11-07: P0 + Architekturtest-Anpassung (78ee473) → Review läuft. V0 Teil 1 (fb4b901, Kontext voll) → V0 2a (tutorial-logik) ‖ 2b (übrige Dateien) laufen.
- 2026-11-07: P0 🟢 (78ee473). Warte auf V0 2a/2b, dann nr20-int = P0+V0, dann P1‖P2‖P4.
- 2026-11-07: V0 2a fertig (3e79784), Nachbesserung 'abgehoben' läuft; V0 2b läuft.
- 2026-11-07: V0 2a komplett (5612a1e). Warte auf V0 2b.
- 2026-11-07: nr20-int = P0+V0(1,2a,2b) bei 41b1c4a, Typprüfung grün (Worktree /home/user/wt-int). Laufen: V0 2c (Tester, wt-v0c), P1 (wt-p1), P2 (wt-p2), P4 (wt-p4). Danach Review je Paket, Merge in nr20-int, dann P2-Nachzug, P3‖P6, P5, P7.
- 2026-11-07: P4 abgebrochen (Kontext), geteilt in P4a (läuft) und P4b (nach P1/P2).
- 2026-11-07: V0 komplett (2c b26e414) in nr20-int gemergt.
- 2026-11-07: P2 Zwischenstand e0dca00 (7 rot), Fortsetzung läuft; Tester korrigiert beide_haeuser in nr20-int.
- 2026-11-07: P1 gebaut (d257e03), Stopp wegen F2c (tutorial-netz.ts darf netz nicht importieren) → Architekt passt an + klärt N1-umgehängt. P4b gestartet. Laufen: P2-Fortsetzung, P4a, P4b, Architekt.
