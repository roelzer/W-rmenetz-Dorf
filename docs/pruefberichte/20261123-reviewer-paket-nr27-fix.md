# Review Fix-Runde NR27 (Modus paket, f232a8a..f49f037) – 🔴 Nachbesserung klein

Plan-Treue: M1, M2, M3, M5/W1, M7, M8, K1–K3, Wortlaut umgesetzt; M4 halb. Keine kritischen Befunde.

## Wichtig
- W1: Erklärkarte (bahn-karte.ts:44–48, stil.css:527–529): KARTE_5 bei 844×390 verdeckt, bei 667×375 unsichtbar. Fix: KARTE_5 in rechte Textspalte, kein Scrollen auf Prüfgrößen.
- W2: Längenregeln DESIGN 12.20/13.13 verletzt: N2 92 (max 90), TUTORIAL_2 125 (max 120), KATALOG_ZEILE 97. Vorschläge: N2 „Zeichne im Bauabschnitt eine Leitung quer über die Gleise – an der Hauptstraße.“; TUTORIAL_2 „Gut für die Häuser hinter der Bahn. Teuer und langsam – im Spiel kostet ein Rohrtausch dort die Querung erneut.“; KATALOG_ZEILE „Hinter die Bahn nur quer unter den Gleisen hindurch – ab Heizzentrale Stufe {stufe}.“ Dazu Längentest für alle NORD_TEXTE (Meldungen ≤ 90, Blasen ≤ 120).

## Klein
1. steuerung.ts:898–901: zurückgehaltene Meldungen – toast ersetzt die vorige, nur die letzte sichtbar; Kommentar „keine geht verloren“ falsch.
2. Bauplan Z. 123 und DESIGN 14.5/14.11/14.12/14.13 beschreiben alten Chip/Wortlaut; Token schotter_koernung fehlt in DESIGN 14.9 (Projektleiter/Designer).
3. sperrtexte.ts:22–23 Kommentar veraltet (Chip gibt es nicht mehr).
4. Entfernen-Regel doppelt (kontext.ts:545 / spiel.ts:764), Phase „planung“ ungetestet → eine Kernabfrage nutzen.
5. effekte.ts:71 ungenutzter Parameter `_felder`; szene.ts:402 `th` ungenutzt (vorbestehend).

Unsicher: Antippen der Startgrube (10|−1) zeigt Leitungsblatt ohne Q5.
