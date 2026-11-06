# Bericht reviewer – 2026-11-06 15:40

**Ampel: GELB – freigegeben mit kleinen Punkten.** Der Code ist in Ordnung. Ein Punkt muss vor dem Abschluss noch geklärt und richtig aufgeschrieben werden: Die gemeldete Abweichung beim Rand ist zu klein beschrieben.

**Plan-Treue: im Wesentlichen erfüllt, mit einer Abweichung, die der Plan selbst erzwingt.**
- M1 ist umgesetzt. In T13 setzt die Kamera Spur, Heizzentrale und beide Häuser zwischen die Anzeigenreihe (64 px) und die Linie 16 px über der Karte. Die Kamera zoomt dafür bis 2 heraus, und die Kamera-Grenze übernimmt diese Bildmitte. Die Regel „Karte nie über dem Ziel“ stimmt jetzt auf beiden Bildschirmgrößen. Das ist im Browser getestet.
- K4 ist umgesetzt. „Verwerfen“, „Sofort fertig“, „Express“ und „Weiter einzeichnen“ zeigen „nach dem Tutorial“. Die übrigen Sperren und die Wandstation bleiben bei „später wählbar“.
- Fehlt nichts, ist nichts zu viel, ist nichts missverstanden.
- Hinweis zur Basis: Der echte Abzweigpunkt ist 3851c95, nicht e630c3b. Mit e630c3b rechnet die Schranke die Änderung an docs/ENTSCHEIDUNGEN.md (K6) fälschlich dem Entwickler zu. Ich habe deshalb mit 3851c95 geprüft.

**Stärken**
- Die neue Browserprüfung `t13KarteFrei` findet den alten Fehler wirklich. Ich habe sie gegen den Code vor dem Fix laufen lassen. Ergebnis: FEHLT auf 844×390 (Haus 2 und drei Spurfelder verdeckt) und auf 667×375 (alles verdeckt außer dem ersten Spurfeld). Mit dem Fix: OK auf beiden Größen.
- `t13Einpassen` ist kurz und klar. Die Rechnung über den Umriss ist richtig, weil der Umriss gleichmäßig mit dem Zoom wächst. Die Kamera-Grenze nutzt dieselbe Fläche (`t13Flaeche`), deshalb gibt es kein Zurückschieben.
- Die Zahlen im Kommentar der Einbindungstests habe ich nachgerechnet. Sie stimmen: Umriss 65 px hoch, freie Fläche 64 bis 200 px, ohne Untergrenze passender Zoom 88/65 ≈ 1,35.

## Muss (vor dem Abschluss)

**M-1 – Die Abweichung beim 24-px-Rand gilt für beide Größen, nicht nur für 667.** Sicherheit 95. Belege: src/steuerung.ts:762–765 und der Kommentar in tests/nr13-einbindung.test.ts:322–324. Nachgerechnet mit Kamera-Formel und Größen aus der Gestaltungsvorlage:

| | 844×390 | 667×375 |
|---|---|---|
| Rand oben unter der Anzeigenreihe | 3 px | −2 px |
| Rand unten zur Linie „Karte − 16“ | 3 px | −2 px |
| Abstand zur Karte (Rechenhöhe 162 px) | 19 px | 14 px |
| Abstand zur echt gemessenen Karte (148 px hoch) | 33 px | 28 px |

Verlangt waren 24 px Rand plus 16 px, also 40 px bis zur Karte. Der Grund: Mit Zoom 2 als Untergrenze passt der Rand auf keiner der beiden Größen. Dafür bräuchte es etwa Zoom 1,35 (844) bzw. 1,17 (667). Der Plan widerspricht sich hier selbst; der Code hält die Zoom-Grenze ein und sagt das im Kommentar ehrlich. Die Kennzeichnung „vom Plan vorgegeben“ kommt deshalb vom Plan, nicht vom Entwickler.

Meine Bewertung: Die Absicht ist erfüllt. Die Karte verdeckt nichts, und es bleiben mindestens 14 px sichtbarer Abstand zur Karte. Oben verdeckt die Anzeigenreihe nichts, denn die Pillen enden bei 56 px und das erste Spurfeld beginnt bei 62 px.

Zu tun für den Projektleiter: die Abweichung in docs/ENTSCHEIDUNGEN.md mit beiden Größen und diesen Zahlen eintragen. Dann entscheiden, ob „Zoom bis 2“ oder „24 px Rand“ Vorrang hat. Der Designer bestätigt es im Nachfoto. Am Code ist nichts zu ändern, wenn Zoom 2 Vorrang behält.

## Kann (blockiert nicht)

- **K-1 – Fehlender Test, ob die Spur in den Umriss eingeht.** Sicherheit 90, Folgen gering. Fehlerprobe NICHT ERKANNT: Ich habe `TUTORIAL_SPUR` aus `felder` entfernt (src/steuerung.ts:759), und alle Tests blieben grün. Fast der ganze Spurweg liegt ohnehin im Umriss von Heizzentrale und Häusern. Nur das oberste Feld (10|10) verschiebt das Bild um etwa 13 px. Fix: Im Test nr13-t13-anleiter-frei zusätzlich prüfen, dass jeder Punkt unten mindestens N px Abstand zur Karte hat und oben ≥ 56 px liegt, also unter den Pillen.
- **K-2 – Die Anzeigenreihe oben prüft kein Test.** Sicherheit 85. Die neue Browserprüfung und der neue Einzeltest prüfen nur die Überlappung mit der Karte, waagrecht die Leiste und den linken Rand. Dass nichts unter der Anzeigenreihe liegt, steht in M1, wird aber nirgends geprüft (tests/browser/nr13-tutorial.browser.cjs:335–347, tests/nr13-t13-anleiter-frei.test.ts:91–95). Fix: senkrechte Prüfung ergänzen.
- **K-3 – Eine Testzeile prüft nichts.** Sicherheit 90. tests/nr13-t13-anleiter-frei.test.ts:109 `expect('nach dem Tutorial'.length).toBeLessThanOrEqual(18)` prüft eine feste Zeichenkette gegen sich selbst. Fix: streichen oder die Länge von `t.sperre(b).kurz` prüfen.
- **K-4 – Veralteter Kommentar.** Sicherheit 85. src/steuerung.ts:717: Der Kommentar „1 Ziel → …; ≥ 2 Ziele → Rahmen einpassen“ nennt die neue Sonderregel für T13 (Zeile 722) nicht. Der Kommentar von `t13Einpassen` sagt „der Rand wird kleiner“; auf 667 wird er aber leicht negativ (−2 px).
- **K-5 – Reihenfolge der Commits.** Sicherheit 85. Die Lektion sagt: Tests passt der Tester vorab in einem eigenen Commit an. Hier kam der Tester-Commit f5b56d9 nach dem Entwickler-Commit c4c8e49. Damit ist c4c8e49 allein sehr wahrscheinlich rot: Der alte Test erwartet Zoom 3, der Code liefert 2 (gelesen, nicht ausgeführt). Die Trennung in eigene Commits ist eingehalten, nur „vorab“ nicht.

## Unsichere Beobachtungen (unter 80)

- Sicherheit 60: Das Dach der Heizzentrale könnte oben hinter der Geld-Pille liegen. Das Gebäude ragt über sein Feld hinaus. Gerechnet reicht es bis etwa y = 41 px (844) bzw. 37 px (667) bei etwa x = 380; die Geld-Pille liegt bei x ≈ 396 und y 12 bis 56. M1 misst nach Feldern, nicht nach Gebäudebild, deshalb ist es keine Verletzung der Vorgabe. **Bitte an den Projektleiter:** Der Designer soll das im Nachfoto T13 ansehen.
- Ob „nach dem Tutorial“ auf 667 in die Knöpfe passt, habe ich nicht geprüft. Dafür braucht es ein Foto; das gehört ins Designer-Nachfoto.

## Antworten auf deine Prüfpunkte

**2. Wurden die geänderten bestehenden Tests lockerer?** Nein (gelesen und verglichen).
- tests/nr13-einbindung.test.ts:322–334: Vorher kam der Zoom aus derselben Code-Rechnung (`einpassenZiel`), jetzt steht die feste, von Hand hergeleitete Zahl 2. Die Bildmitte geht von 195 auf 132, ebenfalls fest. Gleich viele Prüfungen, alle exakt. Eher strenger, weil die Prüfung nicht mehr auf eine Rechnung im Code zurückgreift.
- tests/nr13-tutorial-logik.test.ts:567–593: Beide Schleifen prüfen weiter jede Sperre einzeln mit exaktem Text. Nur der erwartete Text hängt jetzt an der Liste `NACH_TUTORIAL`. Nicht lockerer.

**3. Würde `t13KarteFrei` den Fehler finden?** Ja, getestet. Gegen den Stand vor dem Fix meldet sie FEHLT auf beiden Größen (Zahlen oben unter „Stärken“). Grenzen: Sie prüft nicht die Anzeigenreihe (K-2), und sie läuft nicht in `npm test`, sondern nur von Hand.

**4. Codequalität.** src/steuerung.ts:753–773 und src/core/tutorial.ts:120 und 340 sind sauber: Es werden keine Fehler verschluckt, keine Logik doppelt gebaut, keine Testdaten eingebaut, und alle Größen haben ihre Einheit im Namen. Die Kamera-Grenze gibt es nur in T13 und sie wird beim Schrittwechsel neu gesetzt, deshalb kann ein alter Zoom-Wert nicht stören. In T13 gibt es keine Ziele (`ziele: []`) und die Kamera ist frei, also greift das Ausweichen neben die Karte dort nicht. Das passt zu „nie in T13“ aus der Kamera-Regel (gelesen).

## Pflichtfragen

1. **Plan-Treue:** ja, bis auf M-1, das der Plan selbst erzwingt.
2. **Schranke selbst ausgeführt:** Testbefehl grün, 1397 Tests bestanden, Typprüfung und Build grün, Sicherheits-Schranke ohne Fehler, Prüfsummen der Abnahmetests stimmen. Das Gesamtergebnis ist „NICHT OK“ wegen drei geänderter bestehender Testdateien. Die stammen alle aus dem Tester-Commit f5b56d9, nicht vom Entwickler, und sind laut Prüfpunkt 2 nicht lockerer. Mit Basis e630c3b kommt zusätzlich ein Fehler zu ENTSCHEIDUNGEN.md hinzu; der stammt aus 3851c95 und ist ein Basis-Artefakt.
3. **Testdaten-Sonderfälle:** keine. `TUTORIAL_SPUR` ist die echte Spieldefinition.
4. **Verschluckte Fehler:** keine.
5. **Duplikate:** keine. `t13Flaeche` ähnelt der Fläche in `zieleFreistellen`, rechnet aber den Kartenabstand anders; das ist fachlich so gewollt.
6. **Korrektheit:** Die Rechnung stimmt. Die Randwerte stehen unter M-1.
7. **Testqualität:** gut, mit den Lücken K-1 bis K-3. 5 von 6 Fehlerproben wurden erkannt.
8. **Sicherheit:** Schranke ohne Fehler, keine Stelle mit „dev-team: sicher“, keine neuen Zugriffe auf Daten.
9. **Neue Abhängigkeiten:** keine.
10. **Struktur:** Die Spiellogik (`tutorial.ts`) bleibt von der Darstellung getrennt. Keine neue Riesendatei.
11. **Projektregeln aus CLAUDE.md:** eingehalten (Einheit im Namen, Querformat-Prüfgrößen).
12. **Datenmodell, Kommentare, Verlauf:** Datenmodell unverändert. Kommentare: K-4. Verlauf: Die Ausnahme „nie in T13“ der Kamera-Regel bleibt gewahrt; es wird kein früher behobener Fehler wieder eingebaut.
13. **Selbstprüfung des Entwicklers:** nicht geprüft, weil mir der Entwicklerbericht nicht übergeben wurde. Die gemeldete Abweichung bei 667 habe ich selbst nachgerechnet; sie ist zu eng gefasst (M-1). **Bitte an den Projektleiter:** Wenn eine Selbstprüfung existiert, nachreichen.
14. **Bestehende Tests geändert:** ja, drei Dateien vom Tester. Verlangt wurden die Änderungen von DESIGN 13.16 M1/K4. Alle prüfen danach mindestens so streng wie vorher (Prüfpunkt 2).

## Ausgeführte Befehle

- `pruefe-tests.sh --basis e630c3b --rolle entwickler`: Tests und Build grün, Ergebnis NICHT OK (falscher Abzweigpunkt, ENTSCHEIDUNGEN, drei Testdateien).
- `pruefe-tests.sh --basis 3851c95 --rolle entwickler`: 1397 bestanden, Typprüfung und Build grün, Sicherheit OK, Ergebnis NICHT OK nur wegen der drei Tester-Dateien.
- Browser-Durchklick `tests/browser/nr13-tutorial.browser.cjs` auf dem Fix: 317 OK, 2 FEHLT, beide Bildrate bei Kamerafahrten (T05: 26 Bilder/s, T22: 36 Bilder/s). Diese Bildraten-Meldungen gab es auch vor dem Fix (dort 3 Stück), sie gehören also nicht zum Fix; vermutlich liegt es an der Prüfumgebung ohne Grafikkarte. Beide T13-Prüfungen OK (Zoom 2,00).
- Derselbe Durchklick mit dem neuen Browsertest gegen den Code vor dem Fix (Kopie per `git archive` im Scratchpad, danach gelöscht): T13-Prüfung FEHLT auf beiden Größen, wie erwartet.
- Fehlerproben mit den drei NR13-Testdateien:
  - Sonderregel für T13 ausgeschaltet: ERKANNT
  - Bildmitte der Grenze ohne T13-Fläche: ERKANNT
  - `T13_ZOOM_MIN` auf 2,6: ERKANNT
  - Bildmitte um 30 px verschoben: ERKANNT
  - „weiter_einzeichnen“ aus der Aktionssperre entfernt: ERKANNT
  - Spur aus dem Umriss entfernt: NICHT ERKANNT (K-1)
- Nachrechnung der Ränder per Python mit der Formel aus src/render/kamera.ts und den Werten aus design/tokens.json.
- `git status` danach: Arbeitsbaum sauber, nichts geändert.

**Urteil: GELB – freigegeben mit kleinen Punkten.** Den Code kann man so übernehmen. Vor dem Abschluss muss M-1 richtig in docs/ENTSCHEIDUNGEN.md stehen (beide Größen, mit Zahlen) und vom Designer im Nachfoto bestätigt werden. K-1 bis K-5 kommen auf die Sammelliste.

Dateien:
- /home/user/W-rmenetz-Dorf/.claude/worktrees/agent-af9fdd4a8e21d7745/src/steuerung.ts
- /home/user/W-rmenetz-Dorf/.claude/worktrees/agent-af9fdd4a8e21d7745/src/core/tutorial.ts
- /home/user/W-rmenetz-Dorf/.claude/worktrees/agent-af9fdd4a8e21d7745/tests/nr13-t13-anleiter-frei.test.ts
- /home/user/W-rmenetz-Dorf/.claude/worktrees/agent-af9fdd4a8e21d7745/tests/browser/nr13-tutorial.browser.cjs
- /home/user/W-rmenetz-Dorf/.claude/worktrees/agent-af9fdd4a8e21d7745/tests/nr13-einbindung.test.ts
- /home/user/W-rmenetz-Dorf/.claude/worktrees/agent-af9fdd4a8e21d7745/tests/nr13-tutorial-logik.test.ts
- Ausgabe des Browserlaufs: /tmp/claude-0/-home-user-W-rmenetz-Dorf/689e9066-6050-59dc-abe0-ac861071fa0f/scratchpad/browser.txt und /tmp/claude-0/-home-user-W-rmenetz-Dorf/689e9066-6050-59dc-abe0-ac861071fa0f/scratchpad/basis-browser.txt
