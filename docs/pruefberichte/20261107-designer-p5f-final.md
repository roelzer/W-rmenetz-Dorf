# Fotocheck Designer – Tutorial-Feinschliff P5f (Integrationsstand)

**Ampel: 🟡** Alle 11 Punkte aus dem letzten Fotocheck sind gebaut, und die Streifen sind jetzt auch auf dem kleinen Handy klar zu sehen. Simons Klage („man sieht nicht, wo man hin soll“) ist im Aufbau gelöst. Drei Fehler schwächen das Bild aber noch deutlich:
- Der ganze Bildschirm liegt unter einer dunklen Fläche, auch Karte und Zeichenleiste.
- Die Pfeile im Band zeigen in die falsche Richtung.
- Das Grün der 32er ist auf dem Startfeld so hell wie die Wiese.

Alle drei lassen sich klein beheben und können mit P7 mitlaufen. Ein Probebild ohne die dunkle Fläche zeigt, dass das Bild dann so wirkt wie entworfen.

Modus `treue`, Designer, 2026-11-07. Maßstab: DESIGN 13.17.9 (F1–F8) samt Prüfliste und mein Bericht `20261107-designer-nr20-fotocheck.md`.

## Grundlage
- **Getestet:** Das Browser-Skript lief im Integrations-Worktree `/home/user/wt-int` (Branch `nr20-int`, Kopf d711a3a). Ergebnis: **44 OK, 0 FEHLT**, keine Fehler in der Browser-Konsole.
  - 18 Fotos `docs/pruefberichte/20261107-p5ffinal-*.png`, je 844×390 und 667×375.
  - Die Kennung heißt `p5ffinal` statt `p5f-final`, weil das Skript nur Buchstaben und Ziffern annimmt.
- **Selbst aufgenommen** mit einer Kopie des Skripts im Arbeitsordner (Projektcode nicht geändert):
  - Alle Szenen mit Gerätefaktor 3 (scharf).
  - Dazu: 14 Bilder von T13 im Abstand von 180 ms (Finger an und weg), „Haus 1 im Zug“, Zwischenstand, „Haus 2 im Zug mit Rest“ und „zwei Häuser plus Rest“.
  - Ein Probelauf, in dem ich nur die dunkle Fläche ausgeblendet habe (Befund N1).
  - Aus der laufenden Seite ausgelesen: die Ebenen über der Karte, die Maske des Schleiers und die Banddaten.
  - Bilder: `/tmp/claude-0/-home-user-W-rmenetz-Dorf/689e9066-6050-59dc-abe0-ac861071fa0f/scratchpad/pf/`
- **Nicht geprüft:**
  - „Weniger Bewegung“ und das Einblenden in 200 ms (keine Bildreihe dazu).
  - Rücksprung nach T13/T13w (F2, zweiter Satz).
  - Zug mit eigenem Abgang bis aufs Haus (wichtig für die Bedingung zum Haken, G2).

## Die 11 Punkte aus dem letzten Fotocheck
| Nr. | Punkt | Stand | Beleg |
|---|---|---|---|
| 🔴 1 | Drei gleiche Zielscheiben in T13 | **erledigt.** Die Zielscheibe ist das hellste Ziel, mit Schein. Beide Stecker sind blass (F1, F2). Neuer Rest im eigenen Abgang: siehe N5 | t13, t13w |
| 🔴 2 | Streifen kaum sichtbar | **erledigt.** Breite Hülle, dunkel und hell im Wechsel, über dem Rohr. Auch bei 667 und Gerätefaktor 1 klar als „Absperrband“ zu erkennen (F3) | abgang-vor-zurueck-667x375 |
| 🟡 3 | Ring und Satz wechseln im Zug | **erledigt.** Im Zug bleibt alles wie vorher: kein Satz, keine Streifen, keine Zielscheibe, kein Ring an [Zurück]. Erst beim Abheben wechselt alles zusammen (F8) | abgang-im-zug, abgang-vor-zurueck |
| 🟡 4 | Gang an der Heizzentrale zu groß | **erledigt.** Ausgespart ist nur die Grundfläche. Fremde Häuser treten zurück (F5) | t13, Maske ausgelesen |
| 🟡 5 | Startfeld hinter der Heizzentrale | **erledigt.** Raute, Band und Pfeil liegen über dem Gebäude (F5). Das Grün bleibt aber schwach (N3) | t13 |
| 🟡 6 | Band füllt sich hinter dem Finger | **erledigt:** entfällt, wie entschieden (F4) | Bildreihe T13 |
| 🟡 7 | Zielscheibe nach [Zurück] zu früh weg | **erledigt.** Sie bleibt nach [Zurück] stehen. Neu: Sie bleibt zu lange, siehe N4 | abgang-nach-zurueck |
| 🟡 8 | Stummel nach [Zurück] | **erledigt.** Der Rest (12\|12) bleibt gestreift, Satz und „Stück muss weg“ bleiben (F3) | abgang-nach-zurueck, 44 OK |
| 🟡 9 | Ring schneidet die Raute | **erledigt.** Der Ring liegt unter der Raute und ist enger (F6) | t13h, haus1-im-zug |
| 🟡 10 | Pfeil auf der 32er blass | **erledigt.** Der Pfeil ist dunkel mit hellem Rand und gut zu sehen. Seine Richtung stimmt aber nicht (N2) | Ausschnitt t13 |
| 🟡 11 | Ring verdeckt „bis 25 kW“ | **erledigt.** Ring 2 px vom Knopf, Zeile frei. Die Hand geht nach rechts oben (F7) | t13w beide Größen |

## Neue Befunde
**N1 – In T13, T13w und T13h liegt die dunkle Fläche über dem ganzen Bildschirm (Sicherheit 95).**
- **Was man sieht:** Alles auf der Karte, auch Raute, Zielscheibe und Ringe, ist nur halb so hell wie vorgesehen. Das Gelb `#ffe08a` erscheint als Ocker (130/109/64). Auch die Zeichenleiste mit den Farbknöpfen ist abgedunkelt.
- **Belegt:** Aus der laufenden Seite ausgelesen. Das Abdunkeln (`.spot-dunkel`, 0,55) hat in T13 den Umriss „ganzer Bildschirm“ ohne Löcher (`M 0 0 H 844 V 390 H 0 Z`). Laut Pipette ist das Dorfschild-Weiß genau um 0,55 abgedunkelt, ebenso der Rand der Raute.
- **Ursache (gelesen):** Bei „nur HUD“ wird das Rechteck des ganzen HUD-Behälters genommen, und dieser Behälter ist so groß wie der Bildschirm (`src/steuerung.ts` Zeile 1036: `this.hud.wurzel.getBoundingClientRect()`).
- **Soll** (13.5, 13.17.1, jetzt klargestellt in G6): Abgedunkelt wird nur die Anzeigenreihe oben. Über der Karte liegt nur der leichte Schleier (0,30).
- **Folge:** Der Gang setzt sich nur schwach ab, und alle Zeichen für „hier hin“ wirken stumpf. Das ist ein Hauptgrund für den Eindruck „man sieht nicht, wo man hin soll“.
- **Probe:** Mit ausgeblendeter Fläche (`.../scratchpad/pf/sim/20261107-sim-t13sim-844x390.png`) ist das Bild hell, der Gang deutlich und die Zielscheibe klar das hellste Ziel, so wie entworfen.
- **Berichtigung meines letzten Berichts:** Die „hohle Raute“ (🟡 5 damals) hatte sehr wahrscheinlich diese Ursache, nicht eine fehlende Füllung.

**N2 – Die Pfeile im Band zeigen nicht zum nächsten Feld (Sicherheit 90).**
- **Was man sieht:** Alle Spitzen zeigen nur nach oben (▲) oder nach links (◀).
  - Auf (10\|11) geht der Weg nach links unten zur Zielscheibe, der Pfeil zeigt aber nach oben.
  - Auf (10\|14) geht es nach rechts unten, der Pfeil zeigt nach links.
- **Belegt:** Die Banddaten im Spiel sind richtig, zum Beispiel `pfeil [0,1]` auf (10\|11) und `[1,0]` auf (10\|14). Die Feldmitten stimmen laut Maske des Schleiers. Falsch ist also nur die Zeichnung.
- **Folge:** Der Pfeil soll sagen „hier lang“, er schickt aber in die falsche Richtung. Das widerspricht direkt der Klage.
- **Soll:** B2, klargestellt in G7.

**N3 – Das Grün der 32er ist auf dem Startfeld praktisch so hell wie die Wiese (Sicherheit 90; der Reviewer hat recht).**
- **Gemessen** im Probebild ohne N1: Grün in der Raute zur Wiese **1,06:1**.
- **Ursache:** Das gelbe 0,35 der Raute liegt über einem Band mit Deckkraft 0,75 und wäscht das Grün aus.
- **Abhilfe (neu, G4):** Die Raute ohne Füllung zeichnen und das Band auf dem Rautenfeld voll deckend. Dann misst das Grün zur Wiese 1,43:1, dazu kommt der dunkle Rand mit 8:1. N1 allein reicht nicht.

**N4 – Zwei Häuser fertig, aber noch ein Rest: Die Zielscheibe steht noch da (Sicherheit 90).**
- **Foto:** stummel-zwei-haeuser. Beide Haken sind da, und der Satz verlangt noch „Zieh die 25er von der Abzweigung“.
- Dabei gibt es nichts mehr zu ziehen.
- **Abhilfe (G3):** Satz kürzen, Zielscheibe weg.

**N5 – Im eigenen Abgang stehen Zielscheibe und Stecker von Haus 2 wieder übereinander (Sicherheit 80).**
- **Foto:** abgang-vor-zurueck und abgang-nach-zurueck. Es ist dasselbe Bild wie beim alten 🔴 1, nur in kleinerem Umfang.
- **Abhilfe (G5):** Den Stecker blass zeigen, solange die Zielscheibe da ist. Der Ring um das Haus markiert es ohnehin schon als Ziel.

## Ist Simons Klage gelöst?
**Im Aufbau ja, im Bild noch nicht ganz.**
- **Was jetzt stimmt:**
  - Es gibt ein einziges hellstes Ziel (die Zielscheibe).
  - Die Häuser treten in T13 zurück.
  - Das Startfeld liegt frei, der Gang folgt dem Weg.
  - Der Finger zeigt den Zug.
  - Falsche Stücke sind klar gestreift.
- **Was noch fehlt:**
  - Die dunkle Fläche über allem (N1) nimmt die Leuchtkraft.
  - Die Pfeile zeigen falsch (N2).
  - Das Grün als Hinweis auf die Größe kommt nicht an (N3).
- **Nach N1–N3** trägt das Bild die Klage. Das zeigt das Probebild für N1; N2 und N3 sind beschrieben, aber noch nicht als Probe gebaut.

## Entscheidungen (für ENTSCHEIDUNGEN, Text steht in DESIGN 13.17.10)
- **K3 – Streifen über den halb durchsichtigen Gebäuden: Ja, angenommen (G1).**
  - Der zweite Leitungs-Durchgang malt die Rohre über die Gebäude. Lägen die Streifen darunter, würde das Rohr sie genau dort zudecken, wo sie gebraucht werden.
  - „Das muss weg“ ist in dem Moment die wichtigste Aussage, und die Fläche ist klein.
  - Weiter **unter** Steckern, Haken, Zielscheibe, Finger, Karte und dem gerade gezogenen Strich. Im Foto ist keine Überdeckung eines solchen Zeichens zu sehen.
- **Haken während des Zugs: Nein, er gehört nicht zu F8. Er bleibt live (G2).**
  - F8 soll verhindern, dass während des Zugs eine *Anweisung* wechselt. Der Haken ist keine Anweisung, sondern die Antwort auf die eigene Hand: „angekommen, loslassen“.
  - **Bedingung:** Bei einem eigenen Abgang bis aufs Haus erscheint kein Haken, auch nicht kurz. Sonst blitzt „richtig“ auf, und nach dem Abheben kommt „weg damit“.
  - Ob das heute so ist, habe ich **nicht geprüft**.
- **Satz in T13h bei zwei fertigen Häusern plus Rest: Einverstanden, nur der erste Satz (G3).**
  - Er lautet „Nimm das gestreifte Stück mit Zurück oder Radierer weg.“ (55 Zeichen).
  - Dazu ohne Zielscheibe, Raute und Band (N4).
- **Grün der 32er unter der Raute (Reviewer, Foto t13):** Ja, zu schwach (1,06:1). Lösung siehe N3 und G4.

## Nacharbeiten, die mit P7 mitlaufen können
1. **N1 / G6:** Abdunkeln „nur HUD“ nur über der Anzeigenreihe, nicht über den ganzen Bildschirm (`steuerung.ts` Zeile 1036, Rechteck des HUD-Behälters). Wirkt in T13, T13w und T13h.
2. **N2 / G7:** Pfeilspitze zeigt auf dem Bildschirm zur Mitte des nächsten Felds.
3. **N3 / G4:** Raute ohne Füllung. Band auf dem Rautenfeld mit Deckkraft 1. Tokens: `faktor.naechstes_feld_deckkraft` = 0, neu `faktor.geist_deckkraft_raute` = 1.
4. **N4 / G3:** Bei zwei angeschlossenen Häusern mit Rest nur der erste Satz, keine Zielscheibe, keine Raute, kein Band.
5. **N5 / G5:** Stecker des betroffenen Hauses blass, solange die Zielscheibe wegen eines eigenen Abgangs da ist.
6. **G2:** Kein live-Haken bei einem eigenen Abgang bis aufs Haus. Prüffall ins Browser-Skript aufnehmen.
7. **Browser-Skript:** Fall „zwei Häuser plus Rest“ aufnehmen. Der Bindestrich in `--paket` geht nicht (nur ein Hinweis, kein Fehler).

## Pflichtfragen
1. **Eine Richtung?** Ja, unverändert: „Der Weg leuchtet, der Rest tritt zurück.“ N1 dämpft das Leuchten im gebauten Stand.
2. **Alle Zustände?**
   - Fotografiert: T12, T13, T13w, T13h, Zwischenstand, T14, „über den Abzweig“, eigener Abgang (im Zug, nach dem Abheben, nach [Zurück]) und „zwei Häuser plus Rest“, jeweils bei 844 und 667.
   - Nicht geprüft: „Weniger Bewegung“, Rücksprung nach T13, Abgang bis aufs Haus.
3. **Farben nur aus der Vorgabe?** Im Bild ja (Zielscheibe, Ring, Streifen = `spot_ring`, `kontur`, `tafel`). Die Helligkeit stimmt wegen N1 nicht. Im Code nicht geprüft, außer der gelesenen Stelle zu N1.
4. **Kontrast, Tippflächen, Fokus?**
   - Kontrast: Streifen gut. Grün auf dem Startfeld schwach (N3). Pfeil dunkel mit hellem Rand gut.
   - Tippflächen: im Foto unverändert zu P5e (nicht neu gemessen).
   - Fokus und Tastatur: nicht geprüft (nur Touch).
5. **Echte Texte?** Ja. Ein Satz passt im Fall N4 nicht zur Lage (G3).
6. **Abweichungen?** N1–N5 oben, jeweils mit Foto bzw. Messwert.

## Geändert
- `docs/DESIGN.md`:
  - Neuer Abschnitt **13.17.10** (G1–G7 mit Prüfliste) und ein Nachtrag-Hinweis oben.
  - Hinweise an F3 (Ebene) und F5 (Raute-Füllung), dass 13.17.10 sie ändert.
- Dieser Bericht und die 18 Fotos `20261107-p5ffinal-*.png` in `docs/pruefberichte/`.
- Kein Code geändert.
