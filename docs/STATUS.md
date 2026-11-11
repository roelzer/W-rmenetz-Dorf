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
- 2026-11-07: Bauplan 2.4 (N1-umgehängt bestätigt, anschluss nach Haus 1). P1 + F2c-Ausnahme (03ee0bd) → Review läuft.
- 2026-11-07: P2 fertig (1211c4b, Branch worktree-agent-ad859f109bd6d2630), 3 Testkorrekturen durch Tester, dann Review.
- 2026-11-07: P4a fertig (e88504b, Branch nr20-p4a) → Review.
- 2026-11-07: P2-Testkorrekturen (122bcd0), Logik 48/48 grün → Review P2 läuft. Reviews P1, P4a laufen; P4b in Bau.
- 2026-11-07: P1 Review 🔴 (Muss 1 Rollen-Überschneidung, Muss 2 Phasentest) → Nachbesserung läuft.
- 2026-11-07: P4a Review 🔴 (W1 Band-Eingang am Stückanfang) → Nachbesserung läuft (inkl. K1–K3). Designer: DESIGN 13.17.1 B2 Kontrastliste (32er kontur statt weiß) berichtigen – später mit Fotoprüfung.
- 2026-11-07: P4b fertig (a1f69db, nr20-p4b) → Review.
- 2026-11-07: P2 Review 🟡 → in nr20-int gemergt (122bcd0). Tester schließt P2-Testlücken K1–K5. Für P5 sammeln: Kommentare tutorial-vertrag.ts:99/108 (T13b, erster Strich) veraltet.
- 2026-11-07: P4b Review 🟡 (Merge nach Tester-Lauf in wt-int). Für P5 sammeln: Test Aussparung (Maske Löcher schwarz), Foto 667×375, Schleier-Neuaufbau bei Kamerafahrt (Werte runden/messen), knopf_hinweis in kompakter Karte unsichtbar, 96-Zeichen-Test über alle Kap.-3-Texte.
- 2026-11-07: nr20-int = P0+V0+P2(+Testlücken 7192800)+P4b bei cefa9e5; typecheck grün, 67 rot/1436 grün (alle warten auf P1/P4a/P5/P7). Offen: P1-Nachbesserung, P4a-Nachbesserung.
- 2026-11-07: P1-Nachbesserung 8f51830 (Branch worktree-agent-afc10940b72120937) → Nachprüfung läuft.
- 2026-11-07: P1 🟢 gemergt → nr20-int 41d8025, typecheck grün, 21 rot/1517 grün. Start: P2-Nachzug ‖ P3. P4a-Nachbesserung läuft. Danach P6, P5, P7.
- 2026-11-07: P4a-Nachbesserung db8ab43 (Branch worktree-agent-a58ad11270cd69bf0) → Nachprüfung. Laufen: P2-Nachzug, P3.
- 2026-11-07: P2-Nachzug fertig a0f71fb (Branch nr20-nachzug, unverändert 21 rot) → Review läuft. Danach Tester toEqual (inkl. Kommentar nr13-kern:133), dann P6. Merkposten: veralteter Kommentar „T13b“ tutorial-vertrag.ts:31 → in P5 mitnehmen.
- 2026-11-07: P4a-Nachprüfung 🟢 → gemergt, nr20-int 1bf6f3a, typecheck grün, 20 rot/1538 grün. Sammelliste P5/P7 +: Test Bandfeld (10|11) ohne festen Vorgänger (szene.ts:429).
- 2026-11-07: P2-Nachzug 🟢 → gemergt, nr20-int 3ecff9e, typecheck grün. Laufen: Tester K3 toEqual (Branch nr20-k3), P6 NR22-Kern (Branch nr20-p6), P3. Danach P5, P7.
- 2026-11-07: P3 fertig b086c7b (Branch nr20-p3, 21 rot unverändert, +10 Tests) → Review läuft. Zu bewerten: F = erstes Feld neben S beim Wischen; pointercancel = Tippen.
- 2026-11-07: Tester K3 (toEqual) ff9ff43 gemergt → nr20-int, 20 rot unverändert, Gegenprobe erkannt.
- 2026-11-07: P3 🟡 gemergt → nr20-int (P3-Merge), typecheck grün. Sammelliste P5 +: P3-K1 Kartenrand, K2 Wisch-Test, K3 HZ-Nachbarschaftstests. Läuft: P6. Danach P5, P7.
- 2026-11-07: P5 gestartet (Branch nr20-p5 ab a65c362, Teilschritt-Commits, Sammelliste docs/bauplaene/NR20-22-sammelliste-P5.md). Läuft parallel: P6 (Branch nr20-p6 ab 3ecff9e, überschneidungsfrei). Danach P7.
- 2026-11-07: P6 fertig 2e10c25 (Branch nr20-p6): 25 Tests, +N2 rot bis P7 (Entscheidung). Review läuft. P7-Liste +: Blinken szene.ts:586 weg, kontext.ts:464 → ersatzPreis_eur, dreieckMitte exportieren.
- 2026-11-07: P6 🟢 gemergt → nr20-int, typecheck grün (erwartet 20 V0 + N2 rot). Merkposten: zwei wackelige Tests unter Last (A38 Abwesenheit anpassungen.test.ts, NR12 P3a nr12-ebenen) – vor der Schranke vom Tester ansehen lassen. Läuft: P5.
- 2026-11-07: P5 Teil 1 BLOCKIERT (Kontext) bei 751f88a (worktree-agent-ae7bb693c4acf7bb0 / nr20-p5): 3 rot (2× E7 wartet auf P7, 1× nr13-abnahme W1 → Tester). Start: P5c (Rest Teilschritt 3 + nr21-ablauf) ‖ Tester (nr13-abnahme Grenzfall, tutorial_spur aus nr20-darstellung). Danach P5d (Sammelliste, SPUR löschen, Browser), dann P7.
- 2026-11-07: Tester nr20-t5 b879a41 gemergt → nr20-int (120-Zeichen-Test auf 25.000 kWh Grenze W1, tutorial_spur-Nutzung aus nr20-darstellung raus). nr20-int 20 rot (17 warten auf P5, 3 auf P7). Läuft: P5c.
- 2026-11-07: P5c fertig b740fed (Branch nr20-p5c auf 751f88a): Punkte 1–4, Ablauftests (1)–(10),(12), 3 rot unverändert. Start: P5d (ab b740fed) ‖ Zwischen-Review P5 Teil 1 + P5c. Danach P5e, dann P7.
- 2026-11-07: Zwischen-Review P5 Teil 1+c 🟡 (K1 → Sammelliste 12, Designer-Frage Ring-Zeitpunkt → 13). Merge gegen nr20-int konfliktfrei, dort 3 rot (alle P7). Läuft: P5d.
- 2026-11-07: P5d fertig d66fe46 (Branch nr20-p5d): Test (11) + zugBeginnt, Finger 400 ms, Sammelliste 1,4,5,6,8,9,10; 3 rot unverändert. Start P5e (ab d66fe46): Schleier, SPUR löschen, Browser-Fotos, Sammelliste 12–14.
- 2026-11-07: Laufen: P5e (Entwickler) ‖ Review P5d.
- 2026-11-07: Review P5d 🟡 (Tests pointercancel/Wiedereinstieg fehlen → an P5e nachgereicht). Merge nr20-int+P5d konfliktfrei, dort 3 rot (alle P7). Läuft: P5e.
- 2026-11-07: P5e fertig cc61792 (Branch nr20-p5e): Schleier, SPUR weg (N1 grün), Band von Osten, Browser 42 OK, 18 Fotos, Zusatztests; 3 rot unverändert. tutorial_spur-Feld → P7. Start: Review P5e ‖ Designer-Fotocheck.
- 2026-11-07: P5 komplett 🟡 gemergt → nr20-int 8ec71f9: 1643 grün, 3 rot (E7×2, N2 → P7). Warte auf Designer-Fotocheck, dann P7 mit Sammelliste-Nachträgen.
- 2026-11-07: Designer-Fotocheck 🟡 mit 2× 🔴 (drei gleiche Ziele in T13; Streifen kaum sichtbar). Entscheidung: P5f Feinschliff (9 Punkte, ENTSCHEIDUNGEN) vor P7. Designer zieht DESIGN B4/B5/13.17.8 nach.
- 2026-11-07: DESIGN 13.17.9 (F1–F8) vom Designer, Rest-Stück-Regel bestätigt. Start P5f (ab nr20-int 8ec71f9).
- 2026-11-07: P5f läuft geteilt: P5f-1 Kern (Rest-Stück fremd, Zielscheibe bleibt; Branch nr20-p5f1) ‖ P5f-2 Darstellung/Steuerung (F1–F8, Schleier-Tests; Branch nr20-p5f2), beide ab 8ec71f9. Danach Reviews, neuer Designer-Fotocheck, dann P7.
- 2026-11-07: P5f-1 fertig 69f6547 (Rest-Stück fremd, T14 erst bei fremd leer, Zielscheibe bleibt bis Haus ok; Merker nicht gespeichert). 14 alte Tests rot (alte Regel 13.7) → Tester passt an (Branch nr20-p5f1t). P5f-2 läuft.
- 2026-11-07: P5f-2 Teil 1 BLOCKIERT (Kontext) bei d820bf3: F2, F6, F5-Schleier, Review-P5e-Tests; Widersprüche entschieden. Nächst: Tester nr20-darstellung (F1/F3-Werte) → P5f-2b (F1, F3, F5-Rest, F7, F8, Fotos).
- 2026-11-07: Laufen: Tester nr20-p5f1t (14 Tests), Tester nr20-p5f2t (3 Darstellungstests), P5f-2b (Rest F1/F3/F5/F7/F8 + Fotos).
- 2026-11-07: Tester nr20-p5f1t b298fbf: 14 Tests an neue Regel, 3 rot (P7), Gegenproben ok. Tester nr20-p5f2t 75a9838 (3 Darstellungstests, für P5f-2b). Review P5f-1+Tests läuft; P5f-2b läuft.
- 2026-11-07: Review P5f-1 🔴 W1 (Regel auch in T13/T13w → widersprüchliche Führung). Entscheidung (a): erst ab T13h. Nachbesserung läuft (Branch nr20-p5f1n ab b298fbf).
- NÄCHSTE SCHRITTE (Stand 2026-11-07 spät): (1) P5f-1-Nachbesserung (nr20-p5f1n ab b298fbf) → Nachprüfung → merge nr20-p5f1n in nr20-int. (2) P5f-2b (nr20-p5f2b ab d820bf3, mit Tester nr20-p5f2t) → Review → merge in nr20-int. (3) Designer-Fotocheck neu (13.17.9 Prüfliste). (4) P7 (NR22 Darstellung) mit Sammelliste-Nachträgen (docs/bauplaene/NR20-22-sammelliste-P5.md Abschnitte P7, ENTSCHEIDUNGEN N2/P6, stecker_blass im Schlüssel, Chip-Regel). (5) Tester: wackelige Tests A38/NR12 P3a. (6) Schranke projektleiter auf nr20-int → merge auf claude/keen-mccarthy-f4p5us → main. (7) lastenheft NR20–22 Status, Bericht an Simon inkl. Handy-Check ?messen=1.
- 2026-11-07: P5f-2b BLOCKIERT (Kontext + Widerspruch nr21-vertrag:86 Streifen 4/8 vs 5/12) bei 7d89cf7 (Branch nr20-p5f2b): F1, F5, F7, F8, Raute 0,35 fertig. Start: Tester nr21-vertrag:86 (Branch nr20-p5f2t2) ‖ P5f-2c (Tokens 5/12, Hüllen-Test, Browser-Fotos).
- 2026-11-07: Tester nr20-p5f2t2 081eb7b fertig (Vertrag 5/12). Laufen: P5f-2c (Tokens, Hülle, Fotos), P5f-1-Nachbesserung.
- 2026-11-07: P5f-2c fertig d7ea70e (Branch nr20-p5f2c): Streifen 5/12, Hüllentest, 18 Fotos p5f, 3 rot (P7). Offen nach Zusammenführung mit P5f-1n: Browser-Skript :269 auf F3, Knopfzeile im Zug halten. Dann Review P5f-2 gesamt + Designer-Fotocheck.
- P5f-1n fertig af087c3 (W1 ab T13h, K1–K3), 3 rot (P7). Nachprüfung läuft; Review P5f-2 gesamt läuft parallel.
- Nachprüfung P5f-1 🟡 → nr20-p5f1n in nr20-int gemergt (af087c3). Warte auf Review P5f-2 gesamt, dann Zusammenführung p5f2c + Nachträge (Skript :269, Knopfzeile, Test T13h→T14, Satz T13h).
- Review P5f-2 🟡 → p5f2c in nr20-int (5a7b24f). Laufen parallel: Entwickler P5f-3 (nr20-p5f3) + Tester nr20-p5ft. Danach Review P5f-3, Designer-Fotocheck (inkl. K3 Streifen über Gebäuden, Haken im Zug), dann P7.
- Tester nr20-p5ft 🟢 (21f7be6): Browser-Skript auf F3 (44/44 OK), Test T13h→T14 mit Stummel (Fehlerprobe erkannt) → in nr20-int gemergt. Warte auf P5f-3.
- P5f-3 in nr20-int (d711a3a, 3 rot = P7). Laufen: Review P5f-3 + Designer-Fotocheck 13.17.9 auf nr20-int. Danach P7.
- Review P5f-3 🟡 freigegeben. Warte auf Designer-Fotocheck, dann P7.
- Designer-Fotocheck 🟡 (Bericht 20261107-designer-p5f-final.md, DESIGN 13.17.10 G1–G7). Starte parallel: Tester P5g (nr20-p5gt ab d711a3a) und Entwickler P7 (nr20-p7 ab d711a3a). Danach Entwickler P5g auf Tester-Stand.
- Tester P5g Teil 1 fertig (f351a42); Teil 2 läuft (frischer Tester, Entwurf im Scratchpad). P7-Entwickler läuft.
- P7 Teil 1 fertig (d4e53e1, Darstellung, 0 rot). Laufen: P7b Steuerung (nr20-p7b), P7c Blatt (nr20-p7c), Tester P5g Teil 2.
- P7c fertig (d1ebe12). Warte auf P7b und Tester P5g Teil 2. Dann: P7b+P7c zusammenführen → Review P7 gesamt + Nacharbeit (Gesamtlänge-Satz, Symbol im Kasten).
- P7b fertig; P7 komplett auf nr20-p7z (6c08d28, 1716 grün). Review P7 gesamt läuft; Tester P5g Teil 2 läuft.
- Tester P5g Teil 2 fertig (67571f6). Laufen: Entwickler P5g (nr20-p5g), Review P7 gesamt (nr20-p7z).
- P7 in nr20-int (6c08d28, 1716 grün). Laufen: Entwickler P5g, Tester P7t (nr20-p7t ab 6c08d28). Danach P7d.
- Tester P7t fertig (58759b2). Laufen: P5g-Entwickler, P7d-Entwickler.
- P5g + P7d fertig, Probe-Merge nr20-p5gz (016e2b3, 1749 grün). Laufen: Review P5g+P7d, Designer-Fotocheck. Danach: nr20-p5gz → nr20-int → Schranke projektleiter → claude/keen-mccarthy-f4p5us → main.
- 2026-11-11: Review P5g+P7d und Designer-Fotocheck nach Wochenlimit fortgesetzt. Neue Wünsche NR23–25 im Lastenheft, Plan nach Veröffentlichung NR20–22.
- Review P5g+P7d 🟡. Läuft: Tester P7et (H1–H5 + Review-Testlücken). Danach Entwickler P7e → Review → Designer kurz (H1) → nr20-int → Schranke → main.
- 2026-11-11: Tester P7et fertig (910c4ab, Vorarbeit eingetragen). Läuft: Entwickler P7e (nr20-p7e ab 910c4ab). Danach: Review P7e (kurz) + Designer kurz H1 → nr20-p5gz+P7e nach nr20-int (bzw. p5gz ist Obermenge: 6c08d28+P5g+P7d) → Schranke projektleiter → claude/keen-mccarthy-f4p5us → main → Lastenheft NR20–22 Status → Bericht Simon (Handy-Check, ?messen=1). Dann NR23–25 Solo.
- P7e fertig (d6e2962, 1793 grün). Laufen: Review P7e, Designer-Kurzcheck H1/H2. Danach nr20-p7e → nr20-int → Schranke → main.
- Designer P7e 🟢. Warte auf Review P7e.
- 2026-11-11 Review P7e 🟡 angenommen, Schranke auf nr20-int grün (1793). Feature-Branch enthält NR20–22 (565f09a, gepusht). Merge mit main (Cloudflare-Änderungen) läuft beim Entwickler, Branch nr20-main-merge. Danach: Review Merge, Schranke, main, Lastenheft-Status, Bericht an Simon, dann NR23–25 solo.
- 2026-11-11 Merge cf28180 auf nr20-main-merge: 65 NR20–22-Tests rot wegen neuer main-Regeln → Tester passt an.
- 2026-11-11 main inzwischen a4c56ef (Tutorial-Fix der Cloudflare-Sitzung in steuerung.ts, neuer Test nr13-einbindung). Nach dem Tester muss a4c56ef zusätzlich in nr20-mm gemergt werden. Cloudflare-Sitzung gebeten, steuerung/tutorial/szene/kontext auf main bis zu unserem Merge ruhen zu lassen.
- 2026-11-11 Tester Teil 1 cce9059 (1868 grün, 4 rot). Teil 2 an frischen Tester: Darstellungstests, Saum = Kantenbreite, Karte hell T13.
- 2026-11-11 Designer-Entwurf NR23 fertig (docs/bauplaene/NR23-neubaugebiet-entwurf.md): Grundstücke 2×3, 1 Feld Abstand, drei Wohnstraßen, Karte 40→46 hoch, Leitungen +39 %. Bau nach NR20–22-Veröffentlichung.
- 2026-11-11 Simon (über Cloudflare-Sitzung): Tutorialtexte T05 (Rauch streichen) und T07 (Wasser als Bild) ändern → kommt mit dem Merge-Entwickler nach Tester Teil 2; T07 beim Fachprüfer.
- 2026-11-11 Simon (über Cloudflare): Anleiter-Figur Simon im Tutorial am Handy größer → mit Entwickler nach Tester Teil 2, Browser-Durchklick 844/667 (Karte verdeckt kein Loch/Ziel), Designer-Fotos.
- 2026-11-11 Tester Teil 2 9f3c4b8 (10 erwartet rot, 3 Code-Änderungen). Entwickler: Änderungen + main a4c56ef mergen.
- 2026-11-11 Fachprüfer: T05 🟢, T07 mit Zusatz 'kein Leitungswasser' (übernommen), NR23 Verbrauch Neubau vermutlich zu hoch → Frage an Simon in OFFENE_FRAGEN.
