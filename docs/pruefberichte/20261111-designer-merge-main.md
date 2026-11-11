# Designer-Fotocheck nach dem Merge main ↔ NR20–22 (2026-11-11)

**Ampel: 🟡** – Aus Sicht der Gestaltung kann veröffentlicht werden. Es gibt zwei kleine Befunde (kW-Knopf hinter der Figur, fehlendes geschütztes Leerzeichen vor „kW“). Beide sind schnell behoben und blockieren nicht.

Stand: eigener Worktree auf c3239cf (Branch `nr20-mm-dev2`), Build grün. Fotos mit Playwright, Gerätefaktor 2, Touch, Querformat 844×390 und 667×375. Den Code habe ich nicht geändert. Hilfsskripte liegen nur im Scratchpad.

## Antworten zu den Prüfpunkten

**1. Überlast (getestet).** Dafür habe ich einen Spielstand gebaut: eine überlastete 25er (6 Felder, 26 kW auf 15 kW) und daneben das Tutorial-Netz mit normaler 32er und normalen 25ern.
- Die Rohrbreite bleibt gleich. Im Code steht für beide die Breite w + 1,25 (`szene.ts` ca. Zeile 857). In der Lupe sind die Unterschiede nur Kantenglättung.
- Das gelbe Saumband ist schmal, je Seite rund 0,6 px. Trotzdem wirkt die überlastete 25er sichtbar **orange-glühend** neben der rein roten normalen 25er. Für den Zweck „wie weit reicht das Stück“ genügt das. Auf Schnee ist es schwächer als auf der Straße, aber erkennbar.
- Das gelbe Warndreieck mit dunklem Rand ist bei Zoom 2,2 und 3 auf beiden Größen sofort erkennbar. Es steht am ersten Feld, also auf dem Dach der Heizzentrale.
- Fotos: `mmfinal-ueberlast-ohne-planungsfehler-{844x390,667x375}.png`, `mmfinal-ueberlast-zoom3-{844x390,667x375}.png`, `mmfinal-ueberlast-ausschnitt-844x390.png`, `mmfinal-ueberlast-lupe-25ueberlast-32-25.png` (links die überlastete 25er, Mitte die 32er, rechts die normale 25er).
- Das rote Planungsfehler-Dreieck bewerte ich nicht mehr, weil es laut Entscheidung des Projektleiters (c4335c9) im freien Spiel wegfällt. Es ist auf `mmfinal-ueberlast-mit-planungsfehler-*` und `-zoom3-*` noch zu sehen, weil der Spielstand alt ist. Bitte nicht als Soll lesen.

**2. Tutorial T13/T13w/T13h (getestet).** Die Karte ist ganz hell, ohne Schleier; das Skript hat das in allen drei Schritten bestätigt.
- Die Führung ist trotzdem klar. Die Zielscheibe ist das stärkste Element im Bild (gelb mit dunklem Ring) und liegt direkt am Ende der Raute.
- Das Band hebt sich auf Schnee blass, aber deutlich ab. Es trägt die Rohrfarbe: grün für die Hauptleitung, rot für die Hausanschlüsse.
- In T13h umschließt ein großer Ring das erste Haus, dazu kommen Raute und Finger.
- Simons Klage „man sieht nicht, wo man hin soll“ ist aus meiner Sicht gelöst.
- Fotos: `mmfinal-t13-*`, `mmfinal-t13w-*`, `mmfinal-t13h-*`, `mmfinal-t13-lupe-844x390.png`, `mmfinal-t13h-lupe-844x390.png`.

**3. Anleiter-Figur 96 px (getestet: T05, T07, T11, T13, T13w, T13h, T14, beide Größen).** Die Figur wirkt gut. Nichts ist abgeschnitten, und sie verdeckt kein Ziel und kein Loch.
- Über die Blase ragt sie nur bei kurzen Blasen hinaus, zum Beispiel in T14 bei 667 um etwa 22 px. Bei Blasen mit [Weiter] ist die Blase höher als die Figur.
- Der neue T07-Text passt in 3 Zeilen. Das Schild „15.000 kWh im Jahr · bis 10 kW“ hält Abstand zur Blase (667: etwa 22 px).
- Siehe Befund B1.
- Fotos: `mmfinal-t05-*`, `mmfinal-t07-*`, `mmfinal-t11-*`, `mmfinal-t14-*`.

**4. Offene Frage T13h „Zurück“ (getestet).** Der Text wechselt wirklich. Das Spiel ist in Ordnung.
- Eigener Ablauf bei 844×390 und 667×375: Zug bis Haus 1 → Zwischentext „Das erste Haus hat seinen Hausanschluss …“ → [Zurück] getippt → schon nach **75 ms** steht wieder der Grundtext „Jedes Haus bekommt seinen eigenen Hausanschluss …“. Danach habe ich 2 s lang alle 50 ms nachgelesen, und er blieb stabil. Fotos: `mmfinal-t13h-zwischen-*`, `mmfinal-t13h-nach-zurueck-*`.
- `tests/browser/nr13-tutorial.browser.cjs` habe ich unverändert **dreimal** laufen lassen (852×393, mit neuer Figur). Die Prüfung „T13h: Zurück → Text wechselt …“ war jedes Mal **OK**. Der Fehler des Entwicklers ist also nicht reproduzierbar, was zu einem Zeitrennen im Skript passt.
- **Was in allen drei Läufen wirklich scheitert, ist „T13w: Erklärsatz“.** Ursache: Beim Merge ist das geschützte Leerzeichen zwischen Zahl und Einheit verloren gegangen, siehe Befund B2. Dazu kamen Bildraten-Prüfungen unter 50 Bilder/s. Die kommen von der Sandbox ohne Grafikkarte und sind nicht aussagekräftig.

**5. Gesamteindruck nach dem Merge (gelesen an allen Fotos).** Die NR20–22-Zeichen passen zur neuen main-Grafik. Raute, Zielscheibe und Warndreieck haben dieselbe dunkle Kontur und dasselbe warme Gelb wie Knöpfe und Pillen. Das Band ist durchscheinend und deckt die schlanken Rohre und Gebäude nicht zu. Auf der Winterkarte mit Schnee wirkt alles stimmig.

## Befunde

| Nr | Schwere | Sicherheit | Was | Abhilfe | Foto |
|---|---|---|---|---|---|
| B1 | klein | 85 | Der „kW“-Knopf aus main (unten links) schaut im Tutorial halb hinter Simon hervor (T05, T07; immer, wenn kein Blatt offen ist). Das wirkt unaufgeräumt: Man sieht eine Knopfkante mit „k“ hinter der Figur. | Den kW-Knopf ausblenden, solange die Anleiter-Karte steht. „Dörfer“ wird im Tutorial ja auch schon ausgeblendet. | `mmfinal-t05-ecke-kw-knopf-844x390.png`, `mmfinal-t05-*`, `mmfinal-t07-*` |
| B2 | klein | 85 | Zwischen Zahl und Einheit im Anleitertext („15 kW“, „7,5 kW“) steht ein normales Leerzeichen. Auf `nr20-int` war es ein geschütztes Leerzeichen. Folge: Zahl und Einheit können in der Blase auf zwei Zeilen getrennt werden. Das ist auch der Grund für die rote Prüfung „T13w: Erklärsatz“. Beleg: `src/core/tutorial.ts` Zeile 181 (Funktion `zahl`), Vergleich mit `git show nr20-int:src/core/tutorial.ts`. | Das geschützte Leerzeichen ` ` in `zahl()` wiederherstellen (Merge-Rückfall). | `mmfinal-t13w-*` (dort zufällig nicht umgebrochen) |

## Unsichere Beobachtungen (unter 80)
- **Planungsmarken (Sicherheit 60).** Die blauen gestrichelten Rauten der eingezeichneten Felder (1,5 px, `#2a6fb0`) sind mit den schlanken main-Rohren auffälliger als das Rohr selbst. In T14 liest sich das selbst gezeichnete Netz dadurch eher wie ein blauer Bauplan als wie „meine Leitung“. Das schaue ich mit NR24 (Dimensions-Vorschau) wieder an. Fotos: `mmfinal-t14-lupe-844x390.png`, `mmfinal-t13h-lupe-844x390.png`.
- **Raute-Pfeil in Schrägsicht (Sicherheit 50).** Der Pfeil in der Raute ist in der Schrägsicht verkürzt. Seine Spitze zeigt richtig (gemessen in T13), wirkt aber auf den ersten Blick mehrdeutig. Er bleibt laut Festlegung 1,8, und die Zielscheibe trägt die Richtung.

## Nicht geschafft bzw. nicht geprüft
- Nachtkulisse und die anderen Jahreszeiten: Es gab nur die heutige Winterkarte. Keine Fotos, weil der Projektleiter den Fotostopp verfügt hat.
- Überlast an anderen Größen (40er, 75er usw.), langes Stück mit mehreren Dreiecken, „weniger Bewegung“ und das Federn des Dreiecks.
- Video der Abläufe.
- 852×393 nur über das Entwickler-Skript, nicht mit eigenen Fotos.

## Veröffentlichung
Aus Sicht der Gestaltung: **ja**. B1 und B2 sollten vorher noch hinein, wenn der Aufwand klein bleibt. Sie sind aber kein Hindernis.
