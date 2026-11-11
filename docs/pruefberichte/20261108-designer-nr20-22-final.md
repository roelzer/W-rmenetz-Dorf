# Fotocheck Designer – NR20–22 final (Tutorial P5g + Überlast P7/P7d)

**Ampel: 🟡**
- **Tutorial:** fertig. Alle Punkte aus G1–G7 sind gebaut. Simons Klage „man sieht nicht, wo man hin soll“ ist aus meiner Sicht gelöst.
- **Überlast:** gebaut wie entworfen und gut bedienbar. Ein Fehler betrifft aber genau Simons Wunsch: Die überlastete 25er wirkt durch den gelben Saum **dicker als eine 40er** und überwiegend gelb. Das muss vor der Veröffentlichung schmaler werden (🔴 1). Die Abhilfe ist klein und steht in DESIGN 13.17.11 H1.

Modus `treue`, Designer, 2026-11-08. Maßstab: DESIGN 13.17.10 (G1–G7) und 13.17.3.

## Grundlage
- **Getestet, Teil 1:** `nr20-tutorial.browser.cjs --paket p5gfinal` im Worktree `/home/user/wt-p5gz` (Branch `nr20-p5gz`, Kopf 016e2b3).
  - Ergebnis: **68 OK, 0 FEHLT**, keine Fehler in der Browser-Konsole.
  - 22 Fotos `docs/pruefberichte/20261108-p5gfinal-*.png`.
  - Ausschnitte vergrößert und Farben per Pipette gemessen.
- **Getestet, Teil 2:** eigenes Playwright-Skript im Arbeitsordner (Projektcode nicht geändert): `/tmp/claude-0/-home-user-W-rmenetz-Dorf/689e9066-6050-59dc-abe0-ac861071fa0f/scratchpad/p7final/ueberlast.cjs`.
  - Es nutzt den Spielstand von P7b mit `zuletzt_ms` = jetzt (Lektion P7b).
  - Ergebnis: ein überlastetes Stück aus 6 Feldern (25er, 26 / 15 kW, empfohlen 40er), ein Dreieck auf dem Feld an der Heizzentrale.
  - Ablauf: Antippen in der Mitte des Dreiecks öffnete das Leitungsblatt. Antippen von „Auf 40er vergrößern“ wechselte zu „Wird auf 40er vergrößert“.
  - Keine Konsolenfehler.
  - Fotos in Gerätefaktor 1: `docs/pruefberichte/20261108-p7final-{karte,blatt,geplant}-{844x390,667x375}.png`.
  - Dazu scharfe Fotos in Gerätefaktor 3 unter `/tmp/claude-0/-home-user-W-rmenetz-Dorf/689e9066-6050-59dc-abe0-ac861071fa0f/scratchpad/p7final/x3/`.
- **Nicht geprüft** (dieser Spielstand hat das nicht hergegeben):
  - Überlast an einer 40er, 75er oder 110er;
  - Zoom 1 und Zoom 3;
  - ein langes Stück mit mehreren Dreiecken;
  - die Blatt-Zustände „kein offener Bauabschnitt“, „Größe noch nicht frei“, „Zu viel für eine Leitung“ und „Wird gerade vergrößert“;
  - „Weniger Bewegung“ und das Federn des Dreiecks;
  - die Tippfläche am Rand. Den 44-px-Bereich habe ich nur im Code gelesen (`src/render/ueberlast.ts` Zeile 61–72). Getippt habe ich nur in die Mitte.

## Teil 1 – Tutorial (G1–G7)
| Punkt | Stand | Beleg |
|---|---|---|
| G1 Streifen über den halb durchsichtigen Gebäuden | erfüllt | abgang-vor-zurueck (beide Größen) |
| G2 kein Haken bei eigenem Abgang bis aufs Haus | erfüllt, im Zug und nach dem Abheben | abgang-bis-haus, Prüfpunkte D |
| G3 zwei Häuser + Rest: nur der erste Satz, keine Zielscheibe | erfüllt, Ring an [Radierer] | zwei-haeuser-rest |
| G4 Raute ohne Füllung, Grün satt | erfüllt. In der Raute misst die Pipette Grün (76,175,62) und kein Gelb. Der Rand misst genau `#ffe08a` | t13 |
| G5 Stecker von Haus 2 blass unter der Zielscheibe | erfüllt | abgang-vor-zurueck, Ausschnitt |
| G6 nur die Anzeigenreihe abgedunkelt | erfüllt. Dorfschild (130,118,103), also abgedunkelt. Zeichenleiste `#fff4df` voll, Gang hell | t13 |
| G7 Pfeil zeigt zum nächsten Feld | erfüllt. Auf (10\|11) zeigt die Spitze nach links unten zur Zielscheibe. In T13w zeigen alle 25er-Pfeile in Laufrichtung, auch an der Ecke | t13, t13w, Ausschnitte |

**G7 – Halblänge 1,8:** Passt, so lassen.
- Bei 1,8 ist die Spitze eindeutig. Auch im unscharfen Bild mit Gerätefaktor 1 liest man sie nicht mehr als ▲.
- In der Startraute bleibt der Pfeil ganz innerhalb des Rands.
- **Eine Nebenwirkung (🟡 3):** Auf dem Eckfeld (10\|14) in T13w ragt die hintere Kante des Pfeils rund 3 px aus der Bandecke auf die Straße.
- Nachgerechnet:
  - Hintere Ecken bei 1,8: 12,1 px von der Feldmitte; die runde Bandecke hat 9,8 px Radius.
  - Bei 1,3 waren es 9,7 px, deshalb trat das vorher nicht auf.
- Abhilfe H5: Den Pfeil nur auf Eckfeldern um 0,6 × Halblänge nach vorn schieben.

**Ist Simons Klage endgültig gelöst?** Aus Sicht der Gestaltung: ja.
- In T13 gibt es genau ein hellstes Ziel, die Zielscheibe mit Schein.
- Das Startfeld ist eine gelbe Raute mit sattem Grün und einem dunklen Pfeil, der zur Zielscheibe zeigt.
- Der Gang ist hell, nur die Anzeigenreihe ist dunkel, die fremden Häuser treten zurück.
- Der Finger zeigt den Zug.
- Danach sagt in jedem Schritt (T13w, T13h, eigener Abgang, Rest) genau ein Zeichen, wohin es geht.
- Die Fehler aus dem letzten Fotocheck (dunkle Fläche überall, falsche Pfeile, ausgewaschenes Grün) sind weg.
- Ob echte Spieler es ohne Hilfe schaffen, beurteilt der Produktprüfer, nicht ich.

## Teil 2 – Überlast (13.17.3)
| Prüffrage | Ergebnis | Beleg |
|---|---|---|
| Rohrfarbe bleibt | **teilweise.** Die Rohrmitte ist rot (225,90,46), und es blinkt nichts: In zwei Fotos im Abstand von 250 ms ist die Zahl der roten Pixel gleich (344 / 367, Unterschied nur durch die wandernden Flusspunkte). Aber der Saum ist breiter als das Rohr selbst, siehe 🔴 1 | p7final-karte, x3/c-karte |
| Dreieck gut sichtbar | ja. Kantenlänge 19,4 px bei 844 und 18,7 px bei 667, dunkler Rand, steht über der Heizzentrale. Es ist klar vom roten Planungsfehler-Dreieck zu unterscheiden, das auf demselben Stück zweimal vorkommt | p7final-karte |
| Tippfläche ≥ 44 px | im Code 44 × 44 (gelesen). Ein Tipp auf die Mitte öffnete das Blatt (getestet) | — |
| Kasten „Überlastet“ mit Symbol | ja. Warndreieck 16 × 16 px im Kopf, Titel „Hier auf 40er vergrößern“, Satz „Hier sollen 26 kW durch, die 25er schafft 15 kW. Häuser dahinter bleiben kalt.“ | p7final-blatt |
| Knopf ohne Scrollen | ja. „Auf 40er vergrößern“ mit „6 Felder · 3.600 €“, Oberkante 257 px, Unterkante 313 px bei beiden Größen (Bild 390 bzw. 375 hoch) | gemessen |
| Vorschau-Rauten 0,5 | **zu blass**, siehe 🟡 1 | p7final-blatt, x3/c-blatt |
| Zustand „Wird auf 40er vergrößert“ | ja, mit Satz und [Zurücknehmen]. Das Dreieck steht mit Deckkraft 0,5 da, die Rauten mit 0,8 sind deutlich | p7final-geplant, x3/c-geplant |
| Titel bei von Hand dickerer Planung | so nicht lassen, siehe 🟡 2 | gelesen `src/ui/kontext.ts` Zeile 482–485 |
| [Zurücknehmen] und [Ersatz zurücknehmen] | doppelt, siehe 🟡 4 | Messung: [Ersatz zurücknehmen] bei y 451 bzw. 469, also unter dem sichtbaren Bereich |

## Befunde
**🔴 1 – Die überlastete 25er wirkt dicker als die 40er und fast gelb (Sicherheit 85).**
- **Gemessen** bei Startzoom am Handy (Feldbreite 57 px):
  - Das 25er-Rohr ist 3,4 px breit.
  - Mit Saum kommen je Seite 2 px Gelb und 1 px dunkle Linie dazu: zusammen rund 9,4 px.
  - Die 40er daneben ist 6,6 px breit.
  - Im Querschnitt sind nur 2 Pixel rot, aber 4 Pixel gelb.
- **Was man sieht:** In den Fotos mit Gerätefaktor 1 liest sich die Leitung als orange-gelber Strich, dicker als die blaue 40er. Die 75er ist im Spiel gelb (`#f6c22c`).
- **Folge:** Simons Wunsch war „Farbe bzw. Durchmesser behalten“. Bei der häufigsten Überlast (der dünnen 25er) geht genau das verloren.
- **Abhilfe (DESIGN 13.17.11 H1):**
  - Das Gelb ersetzt nur die dunkle Kante, Breite w + 2, also 1 px je Seite, ohne zusätzliche Außenlinie.
  - Damit ist die Leitung genauso breit wie ohne Überlast.
  - Token `karte.ueberlast.saum_px` = 1.
  - Gesehen wird die Überlast weiter über das Dreieck.
- Betrifft im Code nur die Kantenliste in `src/render/szene.ts` Zeile 748 (gelesen).

**🟡 1 – Vorschau-Rauten mit 0,5 sind zu blass (Sicherheit 85).**
- Hellblau mit Deckkraft 0,5 auf der Wiese hat rund 1,1:1 Kontrast.
- Bei Gerätefaktor 1 sind die Rauten kaum zu erkennen, erst im scharfen Foto mit Gerätefaktor 3.
- Damit fehlt die Antwort auf „wo genau ist ‚Hier‘?“.
- **Abhilfe H2:** Farbstrich voll deckend, darunter eine dunkle Linie mit 0,5 im gleichen Strichrhythmus.

**🟡 2 – Titel „Wird auf 40er vergrößert“, obwohl von Hand eine 50er geplant ist (Sicherheit 85, gelesen, nicht fotografiert).**
- Der Titel nennt immer die empfohlene Größe.
- Hat der Spieler selbst dicker geplant, steht im Blatt eine falsche Größe.
- **Abhilfe H3:**
  - Alle Felder haben dieselbe Größe: Titel nennt die tatsächlich geplante Größe.
  - Verschiedene Größen: „Wird vergrößert“.

**🟡 3 – Pfeil ragt an Bandecken heraus (Sicherheit 85).** Siehe G7 oben; Abhilfe H5.

**🟡 4 – Zweimal „Zurücknehmen“ im selben Blatt (Sicherheit 85).**
- Oben steht [Zurücknehmen] fürs ganze Stück.
- Weiter unten, erst nach dem Scrollen, stehen „Wird im Bauabschnitt durch eine 40er ersetzt.“ und [Ersatz zurücknehmen] nur für dieses eine Feld.
- Das zweite macht aus dem Stück wieder eine Reduzierung und verwirrt.
- **Abhilfe H4:** Die Zeile und den Knopf je Feld ausblenden, wenn der Ersatz die empfohlene Größe hat. Bei einer von Hand gewählten anderen Größe bleiben sie.

## Unsichere Beobachtungen (unter 80)
- T13w: Die Hand des Fingers deckt die „5“ auf dem Farbknopf 25 halb zu (Sicherheit 50). Der Knopf ist durch Ring, rote Leiste und Satz trotzdem klar. Ist so entworfen (F7).
- Die Kamera fährt beim Öffnen des Blatts nicht zum Dreieck. Das ist laut ENTSCHEIDUNGEN zurückgestellt. Im Foto bleibt das Dreieck links neben dem Blatt sichtbar, bei längeren Stücken ist das nicht sicher (Sicherheit 60).

## Pflichtfragen
1. **Eine Richtung?** Ja, unverändert (ruhige, moderne Spielgrafik, Menü-Stil v2). Gelb = Achtung, Rot = Planungsfehler; auf der Karte bleiben die beiden unterscheidbar.
2. **Abläufe und Zustände?**
   - Tutorial: alle Fotos laut 13.17.6, 13.17.9 und 13.17.10 gemacht, bei 844 und 667.
   - Überlast: drei Zustände fotografiert (Karte, Blatt offen, geplant), die anderen nicht (siehe oben).
3. **Werte aus der Vorgabe?** Pipette: `#ffe08a`, `#fff4df`, `#ffc531` und `kontur` stimmen. Neue Tokens: siehe 13.17.11.
4. **Kontrast, Tippflächen, Fokus?**
   - Dreieck-Tippfläche 44 (gelesen), Knöpfe im Blatt 48–56 px hoch (gemessen).
   - Vorschau-Rauten zu kontrastarm (🟡 1).
   - Fokus und Tastatur in diesem Durchgang nicht geprüft.
5. **Echte Texte?** Ja, alle Sätze wie in 13.17.3. Falsche Größe im Sonderfall: 🟡 2.
6. **Abweichungen?** 🔴 1, 🟡 1–4.
   - Zwei angenommene Abweichungen sind in 13.17.11 eingetragen: Knopf unter dem Kasten statt in der Aktionsleiste, Einleitungssatz über dem Kasten.

## Übergabe
- DESIGN 13.17.11 (H1–H5) ist eingetragen, Nachtrag oben im Kopf der Datei.
- H1 ist der einzige Punkt vor der Veröffentlichung. H2–H5 können in ein gemeinsames kleines Folgepaket.
- Beim nächsten Fotocheck brauche ich einen Spielstand mit langem Stück und mit Überlast an einer dickeren Leitung, um die nicht geprüften Fälle nachzuholen.
