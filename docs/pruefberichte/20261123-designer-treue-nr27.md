# Designer-Treue NR27 (Kopf 5ed5230) – Zusammenfassung des Berichts (🟡)
Belegbilder: docs/fotos/nr27-treue/01–12 (844×390 und 667×375, Sommer/Winter, Zoom 1,0–2,2, gedreht). Grundton „harte Kante in weicher Spielzeugwelt“ kommt an; Bahn, Zug, Baustelle, Erfolgsmoment wirken gut (Noten Karte 8, Baustelle 8, Erfolgsmoment 7; Zeichnen über Bahn 6, Baumenü/Infozeile 5).
## Mängel
- M1 (Schwere 3): Chip „+ Bahnquerung“ belegt eigene 44-px-Zeile, Radierer/Zurück rutschen unter „Abschnitt abschließen“ (667×375 ganz verdeckt). Abhilfe A: Chip entfällt als Zeile; „+ Bahnquerung“ wird zweite Zeile im Knopf „Abschnitt abschließen“.
- M2 (3): Infozeile T02–T04 klebt unter den Knöpfen; gehört direkt unter „Eingezeichnet … Kosten …“, Abstand 8 px (DESIGN 14.5).
- M3 (2): Antippen der Bahn im Bau zeigt N2 statt Q5/T07 (nordInfo kennt Q5 nicht); Antippen der Querung im Bau öffnet Blatt mit [Entfernen] (Entfernen im Bau prüfen).
- M4 (2): Erklärkarte 667×375: Chips halb abgeschnitten → Chips unter das Bild in die linke Spalte, Ausblendmaske.
- M5 (2): Bahnfarben in tokens.json (`farbe.bahn`, `karte.bahn`) statt fest in render/bahn.ts.
- M6 (2): Erfolgsmoment zeigt nur F1; „Abschnitt fertig“ geht verloren → nur F1 behalten (DESIGN anpassen).
- M7 (1): Öl-Rauch der Kulisse endet beim Wechsel (echte unversorgte Häuser rauchen nicht) → Kulisse ohne Rauch oder gleiche Regel.
- M8 (2): Meldung „Auftrag geschafft“ über Tutorial-Knöpfen bei 667×375 → Meldungen zurückhalten, solange Tutorial offen (nachTutorial-Muster).
## Entscheidungen (Projektleiter übernimmt Vorschläge)
1 Strichellinie deckend grün bestätigt, DESIGN 14.5 anpassen. 2 Aufleuchten gelb streichen (effekte.ts AUFLEUCHTEN). 3 KOSTEN_ZUSATZ → „davon Bahnquerung {querung_eur} · Bauzeit +{querung_zeit}“. 4 Keine Blasen an neuen Nordhäusern (wie im Dorf), „Federn“ entfällt; Funken an allen 14 neuen Häusern ins DESIGN. 5 „Loch mit Finger“ streichen (nach M2). 6 Zeichenleiste: M1. 7 Baustelle klein bei Zoom 1,0–1,4: so lassen. 8 Ringe/Pfähle: ok.
## Wow-Ideen (später, Aufwand S/M)
1 Erfolgsmoment „Zeig’s mir“ mit Kamerafahrt zum Viertel (M). 2 Schleier stärker (0,22) + freie Felder mit grünem Strichrand (S). 3 Bohrlinie leuchtet bei 100 % einmal in Vorlauf-Farbe nach (S).
