# Fotocheck Designer – Tutorial Kapitel 3 (NR20/NR21), Stand P5e

**Ampel: 🟡** Das Tutorial läuft auf beiden Handygrößen von T12 bis T14 durch, auch die Umwege „über den Abzweig hinaus“ und „eigener Abgang“ funktionieren. Karte, Texte und Knöpfe passen. Zwei Punkte widersprechen aber genau Simons Klage („Man sieht nicht, wo man hin soll“) und sollten vor der Veröffentlichung behoben werden (🔴 1 und 2).

Modus `treue`, Designer, 2026-11-07. Maßstab: DESIGN 13.17.1 (B1–B6), 13.17.6, 13.17.8.

## Grundlage
- **Gelesen:** die 18 Fotos `docs/pruefberichte/20261107-p5e-*.png` im Worktree `agent-a9e837b27178c3883` (9 Szenen × 844×390 und 667×375), vergrößert angesehen.
- **Selbst aufgenommen** mit einer Kopie des Browser-Skripts `tests/browser/nr20-tutorial.browser.cjs` im Arbeitsordner (Projektcode nicht geändert):
  - Lauf A bei 844 und 667: alle 18 Prüfpunkte OK. Dazu Kamera-Werte gemessen und 12 Bilder im Abstand von 150 ms von T13, um die Finger-Bewegung zu sehen.
  - Lauf A und C bei 844 mit Gerätefaktor 3: scharfe Bilder für Feinheiten wie Streifen, Pfeil und Raute.
  - Lauf C bei 844 und 667: Leitungen vor und nach [Zurück] aus dem Spielstand ausgelesen.
- **Gemessen in T13:**

  | | 844×390 | 667×375 |
  |---|---|---|
  | Zoom | 2,70 | 2,54 |
  | Feldbreite | 70 px | 64 px |
  | Oberkante der Anleiter-Karte | 286 | 271 |
  | Kartenhöhe | 92 | 92 |
  | Kartenbreite | 460 | 427 |

  Unterkante des Wegs (Haus 2) bei 844: etwa y 229, also 57 px Abstand zur Karte.
- **Nicht geprüft:**
  - „Weniger Bewegung“: kein Foto vorhanden.
  - Ob der Finger nach [Zurück] nach 4 s ab (10|13) wieder zieht: Auf meinem einen Bild nach 4,6 s war er gerade nicht zu sehen. Eine Bildreihe dazu habe ich nicht gemacht.

## 🔴 Muss vor der Veröffentlichung behoben werden

**🔴 1 – In T13 stehen zwei gleiche Zielscheiben direkt übereinander (Sicherheit 80).**
- **Foto:** t13 (844 und 667) und meine Bildreihe.
- **Was man sieht:** Das Ziel von T13 ist die kleine Zielscheibe im Band auf dem Abzweig (10|12). Auf dem Bildschirm steht Haus 2 aber genau darunter: (10|12) liegt bei x 296 / y 141, Haus 2 bei x 296 / y 211. Deshalb sitzt der Ziel-Stecker von Haus 2, also dasselbe Zeichen nur größer und mit Spitze, nur etwa 20 px unter der Zielscheibe. Über Haus 1 steht ein drittes gleiches Zeichen.
- **Folge:** Auf einen Blick gibt es drei gleiche Ziele, und das größte davon ist das falsche (ein Haus). Genau davor sollte die Fassung 2 schützen („kein Ring um ein Haus in T13“). Das Spiel fängt das Weiterziehen zwar ab (Foto ueber-abzweig), aber der Spieler wird erst einmal auf einen Umweg geschickt.
- **Abhilfe:** In T13 und T13w die Ziel-Stecker beider Häuser „ruhend“ zeigen, wie die ruhenden Bandstücke: Deckkraft 0,35, gleiche Größe. Voll sichtbar werden sie erst ab T13h, wenn das Haus dran ist. Die Zielscheibe im Band dafür auf Durchmesser `b × 1,1` vergrößern und mit dem Lochrand-Schein versehen (16 px, `#ffe08a`), damit sie das hellste Ziel im Bild ist. Ändert DESIGN B4. Den Text dazu passe ich in DESIGN an, sobald der Projektleiter zustimmt.

**🔴 2 – Die Streifen am „eigenen Abgang“ sind auf Handygröße kaum zu erkennen (Sicherheit 80).**
- **Foto:** abgang-vor-zurueck (844 und 667), dazu meine Aufnahme mit Gerätefaktor 3.
- **Was man sieht:** Vom „Absperrband“ bleiben nur einzelne dunkle Schrägstriche rechts und links vom roten Rohr. Das Rohr selbst liegt deutlich sichtbar darüber bzw. deckt die Streifen. Bei 667 wirkt die Stelle nur wie ein unscharfer brauner Rand.
- **Folge:** Der Satz verlangt ausdrücklich: „Nimm das **gestreifte** Stück … weg“. Wenn man die Streifen nicht sieht, passen Satz und Bild nicht zusammen. Der Ring an [Zurück] rettet zwar die Bedienung, aber man versteht nicht, *welches* Stück falsch ist.
- **Abhilfe:** So bauen, wie es DESIGN 13.17.8 Teil 2 verlangt:
  - Die Streifen liegen **über** dem Rohr, mit Deckkraft 0,85; das Rohr scheint nur leicht durch.
  - Abweichend vom bisherigen Entwurf: Hülle Rohrbreite + 12 px statt + 8 px, Streifen 5 px statt 4 px breit. Ich trage das in DESIGN nach, wenn der Projektleiter einverstanden ist.
  - Danach ein neues Foto bei 667 zum Gegencheck.

## 🟡 Kleine Abweichungen (mit Vorschlag)

**🟡 3 – Frage 1: Ring und Satz wechseln schon während des Zugs (Sicherheit 85).**
- **Foto:** abgang-im-zug. Der Finger liegt noch auf (12|13), da erscheinen schon der Ring um Haus 2, der Ring an [Zurück] und der Satz. Die Streifen kommen erst beim Abheben.
- **Folge:** Der Ring um ein Haus heißt im ganzen Tutorial „hier hin“. Wer gerade falsch zu Haus 2 zieht, liest den aufleuchtenden Ring als „richtig so“. Erst nach dem Abheben heißt es dann „weg damit“. Den Satz liest beim Ziehen sowieso niemand.
- **Antwort:** **Ja, warten.** Der ganze Zustand „eigener Abgang“ soll in einem Moment beim Abheben wechseln: Satz, Ring ums Haus, Ring an [Zurück], Zielscheibe, Raute und Streifen zusammen. Das passt auch zur Regel von T13 („Wechsel erst, wenn der Finger abhebt“). Während des Zugs bleibt das Bild, wie es vorher war.

**🟡 4 – Frage 2: Der „Gang“ im Schleier ist zu groß, aber nicht unruhig (Sicherheit 80).**
- **Foto:** t13 und meine Aufnahme mit Gerätefaktor 3.
- **Was man sieht:** Die Aussparung ist ein einziger großer, weicher heller Fleck, keine Gasse entlang des Wegs. Den größten Teil macht die Ellipse um die Heizzentrale aus, samt Gebäudehöhe. Darin liegen auch drei bis vier fremde Häuser, zum Beispiel das Haus direkt unter der Heizzentrale und das oben rechts. Unruhig wirkt das nicht, weil der Rand weich ist und es nur eine Form gibt. Es führt aber kaum: Der Blick geht auf die Heizzentrale, nicht auf den Weg.
- **Die Rauten-Aussparung** (Ellipse + 12 px) passt.
- **Vorschlag:**
  - Die Heizzentrale nur über ihre Grundfläche (2×2 Felder als Raute) + 12 px aussparen, nicht über das ganze Gebäude mit Dach.
  - Die Tutorial-Häuser bleiben, wie sie sind.
  - Dann treten die fremden Häuser zurück, und der Gang folgt dem Weg.

**🟡 5 – Frage 3: Die Karte ist nicht klein gezoomt; das Startfeld liegt aber halb hinter der Heizzentrale (Sicherheit 85).**
- **Zoom:** Gemessen 2,70 (844) bzw. 2,54 (667). Das ist **größer** als entworfen (rund 2,4 bzw. 2,3). Das Feld ist 70 bzw. 64 px breit, der Rand zur Anleiter-Karte 57 px (verlangt sind mindestens 24). Der Eindruck „klein“ hat zwei Gründe:
  - Die Hauptleitung ist nur zwei Felder lang, auf dem Bildschirm etwa 50 px.
  - Rechts von der Heizzentrale bleibt viel leere Fläche.
- **Das eigentliche Problem ist das Startfeld:** Das erste Feld (10|11) mit der leuchtenden Raute liegt zu etwa einem Drittel hinter der Wand der Heizzentrale. Das grüne 32er-Band ist deshalb fast nicht zu sehen. Auf dem Startfeld steckt es unter dem Gebäude, sichtbar ist nur ein schmaler grüner Streifen zwischen Raute und Zielscheibe. Die Verbindung „grünes Band = grüner 32-Knopf“, die ohne Text erklären soll, welche Größe man nimmt, kommt so kaum an.
- **Raute:** Innen ist keine gelbe Füllung zu erkennen. Pixel gemessen: innen olivgrau (102,103,57); erwartet wäre ein deutlich gelblicher Ton (`#ffe08a`, 0,55). Sie wirkt hohl.
- **Ist das Ziel trotzdem klar?** Der Weg schon, durch Raute, Finger und kurze Strecke. Das Ziel nicht eindeutig, siehe 🔴 1.
- **Vorschlag:**
  - (a) Band und Raute auf dem Startfeld **über** die Heizzentrale legen (nur in T13), oder die Heizzentrale in T13 auf der Seite zum Weg halb durchsichtig zeichnen (Deckkraft 0,6).
  - (b) Die Rautenfüllung nachziehen wie in B3.
  - Die Kamera muss nicht geändert werden.

**🟡 6 – Frage 4: „Band füllt sich hinter dem Finger“ (B5) fehlt (Sicherheit 80).**
- **Belegt:** In meiner Bildreihe (12 Bilder in T13) zieht der Finger von der Raute zur Zielscheibe, hinter ihm entsteht nichts.
- **Antwort:**
  - In T13h ist das Band rot und gut sichtbar, dort fehlt die Füllung nicht spürbar.
  - In T13 würde sie genau das ausgleichen, was 🟡 5 verdeckt, nämlich das Grün.
  - **Empfehlung:** Die Füllung darf entfallen, **wenn** 🟡 5 (a) gebaut wird. Sonst ist die Füllung der einfachste Weg, das Grün zu zeigen. Entfällt sie, streiche ich den Satz in DESIGN B5.

**🟡 7 – Zielscheibe nach [Zurück] zu früh weg (Sicherheit 85).**
- **Foto:** abgang-vor-zurueck und abgang-nach-zurueck. Vorher steht die kleine Zielscheibe auf (10|12), nachher ist sie weg.
- **DESIGN 13.17.8** (Tabelle Rückführung) sagt: Sie „bleibt, bis das betroffene Haus richtig angeschlossen ist“.
- **Folge:** gering, denn Raute und Band zeigen weiter den Weg ab (10|13).
- **Vorschlag:** Die Zielscheibe stehen lassen, bis Haus 2 richtig angeschlossen ist. Gerade nach einem Fehler hilft „hier geht es ab“.

**🟡 8 – Nach [Zurück] bleibt ein 25er-Stummel an der Heizzentrale liegen (Sicherheit 90).**
- **Getestet:** Leitungen aus dem Spielstand ausgelesen.
  - Vorher: d25 auf (12|12) und (12|13).
  - Nach einem Tipp auf [Zurück]: nur noch d25 auf (12|12).
  - Gleich bei 844 und 667. Zu sehen als rotes Stück rechts unter der Heizzentrale.
- **Bekannt und angenommen:** Der Bauplan legt das so fest ([2.3] K-c: Zurück nimmt ein Feld, das beendet schon den eigenen Abgang).
- **Aus Sicht des Spielers:** Der Satz sagte „nimm das Stück weg“. Nach einem Tipp sind Streifen und Satz weg, aber ein Rest Rohr bleibt liegen. Er ist nicht markiert, nicht erklärt und wird mitgebaut.
- **Vorschlag**, einer von beiden:
  - Solange ein eigener Abgang liegt, nimmt [Zurück] den ganzen letzten Zug weg.
  - Oder die Streifen bleiben auf dem Rest, solange er an der Heizzentrale hängt und kein Haus versorgt, mit demselben Satz.
- Entscheidung beim Projektleiter.

**🟡 9 – Lage von Ring und Dach (Sicherheit 80).**
- **Foto:** t13h und abgang-*.
- Der Ring um das Ziel-Haus liegt als Ellipse am Fuß des Hauses. Dach und Stecker ragen oben heraus. Das liest sich als „Ziel-Platz am Boden“ und ist in Ordnung.
- **Problem:** In T13h schneidet der Ring um Haus 1 die leuchtende Raute auf (9|12). Ring, Raute, Band und Finger liegen dort übereinander, das wirkt unruhig. Die rote Farbe des Bands ist auf diesem Feld kaum noch zu sehen.
- **Vorschlag:** Den Ring unter der Raute zeichnen und um das Haus enger fassen, also Ellipse um die Grundfläche des Hauses + 8 px statt + 12 px. Dann berühren sich Ring und Raute nur noch.

**🟡 10 – Kontrast der 32er-Kontur (Sicherheit 85).**
- Die Regel stimmt: Weiß erreicht auf der 32er nur 2,80:1, deshalb ist der Pfeil dunkel (`kontur`).
- DESIGN 13.17.1 B2 nannte noch „32er 3,3“. **Das habe ich berichtigt** (siehe unten).
- Im Foto liegt der Pfeil auf dem Startfeld allerdings blass-braun auf olivgrau. Gemessen sind etwa 1,5:1, weil er halb in der hohlen Raute und neben der Heizzentrale sitzt. Das löst sich mit 🟡 5 (Band sichtbar, Raute gefüllt).

**🟡 11 – In T13w verdeckt der Ring am Farbknopf 25 den Anfang der Zeile „bis 25 kW · 560 €/Feld“ (Sicherheit 85).**
- **Foto:** t13w und ueber-abzweig, bei 844 und 667. Das „b“ von „bis“ liegt unter dem Ring.
- **Vorschlag:** Die Zeile in T13w 6 px tiefer setzen, oder den Ring auf 3 px Abstand zum Knopf begrenzen.

## ✅ Passt
- **Anleiter-Karte kompakt** in T13, T13w und T13h, genau wie entworfen (Maße oben). Alle Sätze stehen in höchstens 3 Zeilen, auch bei 667, auch `satz_eigener_abgang`. Nichts ist abgeschnitten.
- **Kamera:** Weg, Heizzentrale und beide Häuser sind ganz im Bild. Der Rand zur Karte ist mindestens 24 px, der Zoom mindestens 2 (13.17.6 Punkt 1). Die Kamera bleibt von T13 bis T14 stehen.
- **T13:** kein Ring um ein Haus, Raute auf (10|11), Zielscheibe auf (10|12), Finger zieht und hebt auf der Zielscheibe ab (13.17.6 Punkt 4a).
- **T13w:** Ring am Farbknopf 25, beide roten Hausanschluss-Bänder aktiv mit weißen Pfeilen, Raute auf dem Abzweig. Die Abschließen-Zeile lautet „2 Häuser fehlen“.
- **Über den Abzweig hinaus:** T13w mit Erklärsatz, gestrichelte rote Raute auf (10|13), „Größe passt nicht“ am Abschließen-Knopf. Das entspricht dem Bauplan 2.1 (B5: in T13w immer der Erklärsatz).
- **T13h:** Ring um Haus 1, Raute (9|12), Finger. Zwischenstand mit Haken über Haus 1.
- **T14:** Der Knopf [Abschnitt abschließen] ist hervorgehoben, der Text ist richtig.
- **Eigener Abgang** (13.17.6 Punkt 9):
  - Satz richtig, Abschließen-Zeile „Stück muss weg“, Ring um Haus 2 und um [Zurück], Raute auf (10|13).
  - Kein Größen-Satz, kein Wechsel nach T14.
  - Nach [Zurück] erscheint der Zwischenstand-Satz.
  - Der Ring springt nicht: Er bleibt vor und nach [Zurück] an derselben Stelle um Haus 2.
- **Zielscheibe nur, solange ein fremdes Stück liegt:** Die Zielscheibe erscheint, solange das fremde Stück liegt. Sie verschwindet danach aber zu früh, siehe 🟡 7.
- **Tippflächen:** Farbknöpfe etwa 44×44, Radierer und Zurück mindestens 44 hoch. Das habe ich im Foto mit Pixeln abgezählt, nicht im DOM gemessen.
- **Browser-Konsole:** In allen Läufen ohne Fehler.

## Pflichtfragen
1. **Eine Richtung?** Ja, unverändert: „Der Weg leuchtet, der Rest tritt zurück.“ Die Umsetzung schwächt sie an zwei Stellen: drei gleiche Ziele (🔴 1) und ein zu großer Gang (🟡 4).
2. **Alle Zustände?**
   - Fotografiert sind alle Zustände aus 13.17.6 Punkt 9 und T12 bis T14.
   - Es fehlen „T13 halb gezeichnet“, „25er auf der Hauptleitung“, „T13h mit 32er zu Haus 2“ und „Weniger Bewegung“ (nicht geprüft).
3. **Farben nur aus der Vorgabe?** Nicht im Code geprüft. Im Bild entsprechen Band, Raute und Ringe den Tokens. Ausnahme ist die fehlende Rautenfüllung (🟡 5).
4. **Kontrast, Tippflächen, Fokus?**
   - Tippflächen passen.
   - Kontrast: Pfeil auf dem Startfeld schwach (🟡 10), Streifen schwach (🔴 2).
   - Fokus und Tastatur: nicht geprüft (nur Touch-Fotos).
5. **Echte Texte?** Ja, alle Sätze sind echt und passen in 3 Zeilen.
6. **Abweichungen vom Entwurf?** Ja: 🔴 1–2 und 🟡 3–11, jeweils mit Foto oben.

## Geändert
- `docs/DESIGN.md` 13.17.1 B2: Pfeilfarbe der 32er auf `kontur` berichtigt (2,80:1 statt 3,3). Das war laut ENTSCHEIDUNGEN 2026-11-07 (P4a W1) mein offener Punkt.
- Sonst nur dieser Bericht. Kein Code geändert.
- Meine Bilder liegen nur im Arbeitsordner unter `/tmp/claude-0/-home-user-W-rmenetz-Dorf/689e9066-6050-59dc-abe0-ac861071fa0f/scratchpad/dz/`.
