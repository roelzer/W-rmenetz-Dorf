# Sitzungsübergabe Wärmenetz-Dorf (Stand 2026-11-04 abends)

Branch `claude/youthful-feynman-jaegcj`, Besetzung Solo. Simon will **morgen früh dem Chef eine spielbare Fassung zeigen**; Demo-Link: Artifact https://claude.ai/artifact/WiLVUTFj9uMdA9MXr9ZqQS (Einzeldatei-Bau mit Skript im Scratchpad `einzeln.cjs`, aus `dist/` erzeugt; nach jedem Build neu erzeugen und mit Artifact-Tool neu veröffentlichen).

## Gebaut (alles getestet, 147 Tests, Gate solo grün zuletzt bei A21)
Offline-Start (SW), Ortswahl Hilpoltstein/Dornhausen/Obermässing mit **erfundenen Beispielhäusern** (platzhalter, OSM nicht erreichbar), Start 100.000 € / zwei Häuser angeschlossen, Wärmepreis 7–15 ct/kWh (Regler im Büro), Technikpreise ×40 (`kosten_faktor`), Leitungstausch/Entfernen/Verkaufen mit 50 % Rückkauf, T-Stück ohne Kreuzungen, Puffer automatisch verbunden, Verbrauchsschilder auf der Karte, Übergabestationen (6 Typen, Spielwerte aus ENERPIPE-Recherche; Haus ohne Station = kein Kunde), Bauzeit ×2,5, Speicherformat Version 3 mit Migration, ruhigere Optik (Manrope, Haarlinien, flache Wände, weiche Schatten; Tokens vom Designer).

## Offen (Reihenfolge)
1. Designer-Mängel 2–22 (docs/DESIGN_TREUE_F5.md), Seitenblatt verdeckt HUD, Aktionsleiste unten.
2. A31 Stufe über Netzgröße; A33 Vorlauf-/Rücklauftemperatur-Regler und Upgrades; A34 Kamin abstellen/Vollversorgung; A35 Zeitmaßstab (1 Woche ≈ 10 Jahre; Kassen-/Zeit-Balancing); A36 PV Dach/Einspeisung; A37 Sicht hinter Gebäuden (Durchsicht/Drehen).
3. Echte OSM-Häuser (A21), Overpass antwortet aus Cloud nicht.
4. Gegenprüfung der Recherchen (docs/recherche/*), Fachprüfer für T-Stück, Kosten, Stationen; Simons Fragen S1–S5 in docs/OFFENE_FRAGEN.md; Bestätigung V1–V4; Lastenheft A2 (Umrisse) anpassen.
5. Reviewer `nachpruefung`, Gate `--rolle projektleiter`, Bericht, Merge-Regeln (Phase 9), `.dev-team/durchlauf` ist aus (Simon wollte Zwischenstand).

## Stolpersteine
Bash-Check blockiert Skripte mit `$$` (Playwright `p.$$`) – `locator` nutzen. Preview-Server: `nohup npx vite preview --port 4173 &`. Screenshots/Skripte im Scratchpad `shot2.cjs`.
