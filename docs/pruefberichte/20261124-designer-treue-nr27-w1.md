# Designer – Treue kurz NR27 W1 (Erklärkarte) + Doku-Nachzug – 2026-11-24

Ampel: 🟡 (Erklärkarte grün; die Doku ist nachgezogen; eine Abweichung im Code bleibt offen: Funken im Erfolgsmoment)

## 1. Erklärkarte „Warum so teuer?“ – nur Standbild
Grundlage: zwei Fotos des Projektleiters (844×390 und 667×375, Gerätefaktor 2), mit dem Lesewerkzeug angesehen. Selbst aufgenommen habe ich nichts, die Karte nicht bedient. Das Urteil beruht also nur auf dem Standbild.
- **Lesbar:** ja. Vier Fachsätze in Manrope 14/20 auf Creme, links das Bild 176×132, darunter die Chips „45.000 € je Gleisfeld“ (gold) und „Bauzeit +1 Std.“ (neutral) untereinander. Kein Wort ist abgeschnitten, keine Silbentrennung stört.
- **Ohne Scrollen:** ja, in beiden Größen. `KARTE_5` („Preis und Bauzeit sind im Spiel vereinfacht.“) steht als letzte Zeile rechts, klein und gedämpft. Bei 667×375 bleibt Luft bis zur Aktionsleiste.
- **Maske:** in Ordnung. `KARTE_5` ist voll deckend, die Ausblendung unten greift keine Schrift an.
- **Rand:** 8 px zum Bildschirm, Kopfband mit Rohrnaht, [Verstanden] mit sichtbarem Fokusrahmen (Startfokus) und mindestens 44 px hoch. ✕ ist gut 44 px groß.
- Schwere der Abweichungen: keine. Sicherheit 85 (nur Standbild).

## 2. Doku nachgezogen (nur Dokumente)
`docs/DESIGN.md` (Abschnitte 14.4–14.15):
- 14.5: Den Chip in der Zeichenleiste gibt es nicht mehr. „+ Bahnquerung“ ist die zweite Zeile im Knopf [Abschnitt abschließen]. Die Strichellinie ist deckend grün `karte.pfeil_ok` (#2e7a4e) statt `vorschau_ok`.
- 14.6: Längenregeln (Meldungen ≤ 90 inklusive `N2`, Tutorial-Blasen ≤ 120) mit den heutigen Zählungen. Zuordnung `CHIP`, `KARTE_CHIP_*` und `HOECHSTSTUFE` ergänzt. Die alte Wortlaut-Meldung ist als überholt markiert, `KOSTEN_ZUSATZ` lautet jetzt „davon …“.
- 14.7: neuer Bauplan der Karte (Bild und Chips links; Text und `KARTE_5` rechts; Rand 8, Innenabstand 12/16, Maske 12), Zustände angepasst, 667×375 höchstens 359 px hoch.
- 14.8/14.4/14.11/14.13/14.15: Erfolgsmoment ohne Blasen und ohne Aufleuchten, Funken an den neuen Häusern.
- 14.9: als eingetragen markiert, neue Tokens `schotter_koernung`, `schranke_weiss`, `haarlinie`, `zug_schatten`, `nord_dunst_klar`, `schleier_raster`. `blase_versatz` wird nicht mehr gebraucht.
- 14.12/14.13/14.15: Es wird kein Chip mehr verlangt. „Loch“ aus 14.15/20 gestrichen, Blasen ≤ 120.

`docs/bauplaene/NR27-bahnquerung-entwurf.md`: Die Texttabelle ist auf den Stand von `src/core/nord-texte.ts` gebracht (STELLE, EXPRESS, KATALOG_ZEILE, KATALOG_PREIS, N2, KOSTEN_ZUSATZ, TUTORIAL_BEDIEN, TUTORIAL_2; neu KARTE_CHIP_FELD, KARTE_CHIP_ZUSCHLAG, HOECHSTSTUFE; Verwendung von CHIP). Ein Skript hat jede Tabellenzeile mit dem Code verglichen: keine Abweichung mehr (KARTE_1–4 stehen als Sammelzeile mit Verweis auf die Recherche).

## 3. Befunde
1. **Erfolgsmoment: Funken an den Gruben statt an den Häusern** (Schwere 2, Sicherheit 85, Code nur gelesen). Laut Entscheidung 4 aus der Designer-Treue vom 23.11. gehören die Funken an alle 14 neuen Häuser. `src/render/szene.ts:439` setzt sie aber an `grubenFelder()`, und die Gruben sind in diesem Moment schon zugeschüttet. Blasen erscheinen im Ergebnis nicht, weil neue Häuser ohne Anfrage keine Blase haben. Der Versatz-Code (`blaseFrei`, `effekte.ts:76`) ist damit toter Rest. Abhilfe: In `szene.ts:437–440` je neues Haus (`s.objekte.filter(istNeu)`) einmal `effekte.funken(k.mitte(o.x, o.y), tw)` setzen, gern um `zeit_ms.blase_versatz` je Haus versetzt (dann bleibt das Token sinnvoll). Bei „Weniger Bewegung“ entfällt das. Der Kommentar in `szene.ts:434` („leuchten sie stattdessen kurz auf“) ist veraltet.

## Unsichere Beobachtungen
- `WISSEN_A` + `WISSEN_B` ergeben zusammen eine Sprecherblase mit rund 192 Zeichen (`spiel.ts:1505`). Ob dafür die 120er-Grenze der Tutorial-Blasen gilt, ist in 14.6 nicht geregelt. Die Texte sind ohnehin ausgeschaltet (Schalter aus). Sicherheit 50.
