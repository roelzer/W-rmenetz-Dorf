# Produktabnahme NR27 (Bahnstrecke + Bahnquerung) – 2026-11-23

Ampel: GELB. Stand: Branch claude/hopeful-cori-3pa92y, f49f037. Geprüft mit `npm run dev` (Port 5199), Chromium, 844x390 und 667x375 (je Faktor 2, Touch), Hochformat 375x667. Bildschirmfotos: /tmp/claude-0/pb/*.png (außerhalb des Projekts).
Tests: `npm test` 166 Dateien / 2625 Tests grün, `npm run typecheck` ohne Fehler (beides selbst ausgeführt). Konsole/Netz: keine Fehler, keine 4xx/5xx, keine Browser-Dialoge.

| Abnahme | Ergebnis | Nachweis |
|---|---|---|
| a Bahn im Norden von Anfang an, Wohngebiet dahinter | erfüllt | Frischer Start: Gleise mit Masten oben rechts; Stufe 5/6 Kamera Nord: 2 Gleise, Oberleitungsmasten, Zug, dahinter Häuser + Wohnstraße im Dunst (st5-nord-844/667.png) |
| b Querung nur ab HZ 6, davor Sperrtext | erfüllt | Stufe 5: Bauen-Blatt "… – ab Heizzentrale Stufe 6" (bl5-844-a.png); Ziehen auf Bahnfeld zeigt Toast "Über die Bahn geht es erst mit einer Bahnquerung – ab Heizzentrale Stufe 6"; Tippen auf Haus dahinter: "Diese Häuser erreichst du über eine Bahnquerung ab Heizzentrale Stufe 6". Stufe 6: zeichenbar |
| c deutlich teurer, braucht Bauzeit | erfüllt | Abschnitt mit Querung 97.580 EUR (davon Bahnquerung 90.000 EUR, 2 Gleisfelder x 45.000), Bauzeit "etwa 1 Std. 15 Min." (+1 Std.); normale 63er-Leitung 1.520 EUR je Feld. Express und "Sofort fertig" gesperrt ("nicht bei Bahnquerung") – gesehen im Bau (e3-844.png) |
| d Erklärung/Wissenstext | nicht bewertbar (Schalter aus, laut Auftrag kein Mangel) | Keine Karte "Warum so teuer?" sichtbar (Suche im Seitentext negativ). Sichtbar bleiben nur Preiszeile "Unter den Gleisen hindurch nur per Bahnquerung an der Hauptstraße: 45.000 EUR je Gleisfeld", Kostenzeile und Tutorial-Satz "Neu: Bahnquerung…". Siehe Befund 1 |
| e Kreuzen nur über die Querung | erfüllt | In-Seite-Probe mit echter Spiellogik (Stufe 6): Brücke x=19 abgelehnt, Stelle x=8 abgelehnt, Haus auf Gleisen abgelehnt, entlang der Bahn (x=11) abgelehnt, x=10 erlaubt – jeweils mit lesbarem Grund |
| f Häuser dahinter erst nach Querung anschließbar | erfüllt | Vor Querung: 0 Objekte hinter der Bahn, Platzieren abgelehnt ("Hinter der Bahn geht es erst weiter…"). Nach Bau (Zeit vorgestellt): 14 Häuser im Spielstand, kW-Schilder, Leitung bis zum Haus zeichenbar ohne Bahn-Aufpreis (g1-844.png) |
| g Alte Spielstände | erfüllt | Beide eingefrorenen Altstände (tests/referenz/nr27) geladen und neu geladen: Objektzahl 71 bzw. 118 unverändert, Name gleich, keine Fehler; Geld im Stand "mitten im Bau" ändert sich durch weitergelaufene Zeit (erwartbar) |
| h Designer-Foto 844x390 | erfüllt | Fotos erstellt und angesehen; Gleise, Masten, Kulisse, Querungs-Vorschau lesbar, kein Überlappen auf der Karte. Die Designer-Freigabe selbst nicht geprüft |

## Pflichtfragen
2. Start: `npm run dev` startet (Vite ready); auch Build/Typecheck laufen im Testbefehl grün.
3. Kernablauf (Stufe 6 -> Tutorial -> Querung zeichnen -> Abschnitt abschließen -> Material bestellen -> Bau -> Häuser hinten anschließen): durchgespielt, funktioniert. Zeit nur durch Vorstellen der Uhr beschleunigt.
4. Desktop/Querformat 844x390: in Ordnung.
5. 667x375: in Ordnung, kein waagrechtes Scrollen (scrollWidth geprüft). Hochformat zeigt "Bitte drehe dein Handy ins Querformat".
6. Fehlermeldungen: jede Ablehnung hat einen verständlichen Grund. Leerzustände ok. Siehe Befund 2 (Kostenzeile verdeckt).
7. Datenverlust: Neuladen mitten im Planen der Querung: 4 geplante Felder bleiben erhalten. Zurück-Taste im Browser nicht aussagekräftig geprüft (Einzelseite).
8. Barrierefreiheit (nur Stichprobe): Knöpfe haben Beschriftungen; Tastatur/Fokus/Kontrast nicht systematisch geprüft, axe-core nicht eingesetzt.

## Befunde
1. Lastenheft-Lücke / Simons Wunsch "da soll was dazu erklärt werden" (Schwere 2 solange der Schalter aus ist, Sicherheit 85): Ohne Fachtexte erklärt das Spiel nur den Preis, nicht das Warum. Bewusst, aber Simon muss BQ1–BQ3 freigeben, sonst fehlt der Teil seines Wunsches.
2. Kostenaufschlüsselung außerhalb des Bildes (Schwere 2, Sicherheit 90): Im Bauabschnitt-Blatt steht "davon Bahnquerung 90.000 EUR · Bauzeit +1 Std." UNTER dem Verwerfen-Knopf. Bei 844x390 und 667x375 (y=474 bei Höhe 375) nur nach Scrollen sichtbar. Der Spieler sieht "97.580 EUR" ohne Begründung. Beleg: e2-844.png, e2-667.png, e2s-667.png. Vorschlag: Zeile direkt unter die Kostenangabe/über die Knöpfe.
3. Beim Zeichnen der Querung zeigt der Knopf nur "+ Bahnquerung", keinen Preis (Schwere 1–2, Sicherheit 75): Preis erst nach "Abschnitt abschließen".
4. Meldung "Hinter der Bahn geht es erst weiter…" bleibt nach Abschließen länger stehen, obwohl nicht mehr passend (Schwere 1, Sicherheit 70).

## Unsichere Beobachtungen
- Wortwahl: Tutorial "quer über die Gleise", Katalog "unter den Gleisen hindurch" (Sicherheit 60).
- Laura sagt "Lieferzeit: 228 Tage" bei Anzeige "noch 1h 14m" (Spieltage, bestehendes Verhalten, nicht NR27).
- Geldanzeige-Pille 32 px hoch (< 44 px), bestehend, nicht NR27.
- In der Testkopie überdeckte ein Start-Hinweis ("Tipp ein Haus an…") kurz die Tutorial-Knöpfe bei 667x375; vermutlich Folge meines gebauten Spielstands.

## Nicht durchgespielt / nicht geprüft
- Fehlerprobe (Absicherung durch Tests): die Ausführung wurde vom System nicht erlaubt; Testabdeckung nur über grüne Gesamtläufe belegt.
- Ersatz (Rohrtausch) unter der Bahn, Spieltempo-Wechsel, a88-Prüfsumme (bekannt), Tastatur/axe, echte Geräte, 60 Bilder/s.

## Empfehlung
Befund 2 beheben (kleiner Eingriff). Fachtexte erst nach Simons Entscheidung zu BQ1–BQ3 freischalten. Kurzer Test mit 2–3 Menschen (Aufgabe: "Erschließe die Häuser hinter der Bahn"), da der Ablauf neu ist.
