# Design-Treue A66 – Logo, Ladebildschirm, Spielkarte, Handy-Bedienung

Stand 2026-11-05 · Designer, Modus `treue` plus Richtungsvorschlag · Grundlage: `docs/DESIGN.md` (Fassung 2), `design/tokens.json`, `docs/DESIGN_TREUE_F5.md`, Lastenheft A60–A66.
**Geprüft:** laufende Vorschau `http://localhost:4173` (Build vom Projektleiter), Playwright/Chromium, **844×390** (Handy quer, Touch, Bildfaktor 1 und 2) und 1280×800. Frischer Browser ohne Spielstand (Startdorf „Hilpoltstein“, 29.999 €). Maße = `getBoundingClientRect` im Browser.
**Fotos** (nicht im Repo): `/tmp/claude-0/-home-user-W-rmenetz-Dorf/028b951e-104d-54e1-8d62-e759251bd526/scratchpad/design/` – `01_laden`, `05_laden_2x_ausschnitt`, `02_karte_start`, `03_karte_zoom`, `04_karte_weit`, `06_karte_maxzoom_2x`, `10/11_katalog*`, `12_kontext_haus`, `14_doerfer`, `20–22_desktop*`, `30/31_platzieren*`, `40_logo_groessen`.

Schwere: **hoch** = sichtbar kaputt oder Bedienung blockiert · **mittel** = weicht vom Entwurf ab und stört beim Spielen · **niedrig** = Feinschliff. Zahl in Klammern = Sicherheit 0–100.

---

## 1. Kurzurteil

- **Logo:** gelungen. Flamme im Rohrring (Vorlauf rot oben, Rücklauf blau unten) ist bei 192, 96, 48 und 32 px gut erkennbar (Foto `40_logo_groessen`). Der Ring liegt innerhalb der runden Sicherheitszone für das Android-Symbol (Ring-Außenradius 198 von 256). Erfüllt A63/A64.
- **Ladebildschirm:** gelungen und genau das, was Simon wollte: kräftige Farben, **dunkelbraune Konturen (#3b1d0a)**, Schlagschatten, Herzblasen, Dampf, fließende Leitungen. Kleine Mängel: Emoji 🌿 in der Unterzeile, DESIGN.md beschreibt S0 noch alt.
- **Spielkarte:** sie spricht eine **andere Sprache** als der Ladebildschirm. Ladebild = Konturen, satte Farben, Details. Karte = keine Konturen (Haarlinie 18 %), gedämpfte Salbei-Wiese, alle Starthäuser mit demselben roten Dach, winzige Fenster, flache Kugelbäume. Dazu ca. 35 dunkle kW-Schilder im Startbild – sie sind das Lauteste auf der Karte. Das erklärt Simons Eindruck „flacher, ruhiger, unruhig“.
- **Bedienung am Handy:** Alle tippbaren Knöpfe sind ≥ 44 px. Aber die Auftragskarte überlappt den Zoom-Knopf, bei offenem Blatt ist keine Anzeige mehr zu sehen, und die Hauptaktion im Blatt liegt weiter unter dem Rand.

---

## 2. Neue Befunde (diese Prüfung)

| Nr | Schwere | Was (Beleg) | Fundstelle | Soll |
|---|---|---|---|---|
| N1 | mittel (95) | **Auftragskarte und Zoom-Knopf „+“ überlappen um 11 px.** Gemessen: Auftrag y 70–117, „+“ y 106–154 (Foto `02_karte_start`, die Kante von „+“ liegt auf der Karte). Die linke Spalte ist zu voll: 5 Knöpfe à 48 px reichen bis y 378, also 12 px vor dem unteren Rand | `src/ui/hud.ts`, `stil.css` Querformat-Block | Knöpfe **paarweise nebeneinander**: Reihe 1 [+][−], Reihe 2 [⟲][⟳], Reihe 3 [kW]. Start bei y = Auftrag-Unterkante + 12 (= 129). Dann: 129 + 3×48 + 2×8 = 289 px, viel Luft. Abstand zwischen Knöpfen 8 (`abstand_px` 8) |
| N2 | hoch (90) | **Bei offenem Seitenblatt ist im Querformat keine Anzeige mehr zu sehen.** Laut Nachtrag zu Mangel 3 bleibt die Geld-Pille stehen. Gemessen: Geld-Pille x 738, y 12 – sie liegt **unter** dem Blatt (Blatt x 456–844, y 0–390). Fotos `11_katalog_deko`, `12_kontext_haus`, `31_platzieren_belegt`: rechts oben nur der Blattkopf, keine Pille. Wer im Katalog einkauft, sieht sein Geld nicht | `stil.css` Zeile 176–178 (`.blatt-offen .pillen .pille+.pille{display:none}`), `.blatt` Querformat | Entweder wie in DESIGN 5 vorgesehen das Blatt bei `top: 64px` beginnen lassen, **oder** (kleinere Änderung) die verbleibende Geld-Pille links neben das Blatt setzen: `right: calc(min(46%,400px) + 12px)`. Ich empfehle die zweite Lösung, weil sie 64 px Blatthöhe spart, die das Blatt am Handy dringend braucht (siehe Mangel 4) |
| N3 | mittel (85) | **Am Startbild ist auf einen Blick kaum zu sehen, welche Häuser warm sind.** Die warmen Fenster sind 5–6 px kleine gelbe Flecken; warm (#ffd45c) gegen kalt (#93b4d0) unterscheidet sich fast nur im Farbton (Helligkeitskontrast 1,5:1). Das Erkennungsmerkmal „Wärme ist das einzige Leuchten“ (DESIGN 1) kommt auf der Karte nicht an (Fotos `03_karte_zoom`, `06_karte_maxzoom_2x`) | `src/render/gebaeude.ts` `haus()`, `maler.ts` `fenster()` | Siehe Optik-Vorschlag O3 (größere Fenster mit Rahmen und warmem Schein) |
| N4 | mittel (90) | **kW-Schilder an jedem Haus, auch an nicht angeschlossenen.** Im Startbild ca. 35 dunkle Kapseln (Foto `02_karte_start`); sie überdecken Häuser dahinter (z. B. „30 kW“ am Mehrfamilienhaus, Schilder am Bildrand halb abgeschnitten). Weiße Schrift mit dunklem Textumriss widerspricht DESIGN 3 („kein dunkler Textumriss“) | `src/render/szene.ts` Zeile 259–267 | Siehe Abschnitt 5 |
| N5 | niedrig (90) | **Emoji 🌿 in der Unterzeile des Ladebildschirms.** Emojis sehen auf jedem Gerät anders aus (Android, iOS, Windows), widerspricht M7 und dem Oberflächen-Standard („keine Emojis als Symbole“) | `src/ui/vorspann.ts` (`vs-blattzeichen`) | Kleines SVG-Blatt im Stil des Ladebilds: Pfad wie `vs-blatt`, Füllung #8be06a, Kontur #2c6e22 2 px, 18×18 px |
| N6 | niedrig (85) | **Symbole als Schriftzeichen:** Drehknöpfe „⟲ ⟳“ und das Zahnrad „⚙“ im Dorfschild sind Textzeichen (gemessen: Schriftgröße 26 bzw. 16 px). „★“ für „alle Aufträge erledigt“ (`hud.ts` Zeile 89) ebenso | `src/ui/hud.ts`, `src/ui/symbole.ts` | Als SVG in `symbole.ts` ergänzen (Linienstärke wie die übrigen HUD-Symbole) |
| N7 | niedrig (90) | **DESIGN.md beschreibt den Ladebildschirm und die Richtung veraltet.** S0 sagt „Schriftzug 17/700 in tinte, Ladebalken 8 px“; Abschnitt 1/3 sagt „keine Umrisse, keine Strukturen, einziger Verlauf“. Gebaut ist (zu Recht, A64) etwas anderes. Außerdem stehen alle Farben des Ladebilds und des Schriftzugs fest im Code (`vorspann.ts`, `stil.css` Zeile 200–239), nicht in `tokens.json` | `docs/DESIGN.md`, `design/tokens.json` | Nach Simons Entscheidung zu Abschnitt 4 schreibe ich DESIGN.md Fassung 3 und einen Token-Block `farbe.spielwelt` (Konturfarbe, Ladebild-Palette), den Ladebild **und** Karte lesen |
| N8 | niedrig (80) | **Gebäude und Bäume lesen weiter keine Tokens** (Rest von Mangel 14): warme Fenster `#ffd45c` im Code gegen Token `fenster_warm #ffc65c`; `DACHFARBEN` (#c4553e) gegen `dach_stufe` (#c46a55) | `src/render/farben.ts`, `gebaeude.ts`, `maler.ts` | Bei der Umsetzung von Abschnitt 4 gleich mit erledigen: neue Werte nur in `tokens.json` |

---

## 3. Stand der alten Mängel aus `DESIGN_TREUE_F5.md`

„getestet“ = in dieser Prüfung im Browser gesehen/gemessen; „gelesen“ = nur im Code nachgesehen.

| Nr | Stand | Beleg |
|---|---|---|
| 3 | **rückfällig** (siehe N2) | getestet: Geld-Pille liegt unter dem Blatt |
| 4 | **offen** | getestet: Kontext „Einfamilienhaus“ – alle Kaufknöpfe (Wandstation 15/25/40 kW) liegen bei y 493–799, sichtbar ist nur bis 390 (Foto `12_kontext_haus`). Im Code gibt es keine Aktionsleiste |
| 5 | **offen** | getestet 1280×800: angetippte Heizzentrale liegt unter der Kontextkarte (Foto `22_desktop_kontext`) |
| 6 | **offen** | getestet: Reiter „Deko“ ist gewählt, liegt aber bei x 877 außerhalb des Bildes (Bild 844 breit); keiner der sichtbaren Reiter ist hervorgehoben (Foto `11_katalog_deko`) |
| 7 | **offen** | getestet: im Katalog quer ist nur **eine** Kartenreihe sichtbar, Bild ca. 96 px hoch (Foto `11_katalog_deko`) |
| 8 | **offen** | getestet 1280×800: Katalog-Höhe je Reiter 511 / 509 / 621 / 344 / 492 px |
| 9 | **offen** | getestet: „Baum platzieren“ belegt die volle Blatthöhe 390 px für einen Satz und zwei Knöpfe (Foto `31_platzieren_belegt`) |
| 11 | **teilweise** | gelesen: Im Katalog bleibt die Karte tippbar und meldet „Es fehlen … €“ (`katalog.ts` Zeile 111). In Kontext und Bauabschnitt sind Knöpfe weiter gesperrt statt tippbar (`kontext.ts` Zeile 241, 262; `katalog.ts` Zeile 70, 78: `aus: geld < kosten`). Nicht getestet, weil das Startdorf 29.999 € hat |
| 12 | **teilweise** | gelesen: volle Karten sind jetzt blass mit „n/m · mehr ab nächster Stufe“; ob Antippen sofort meldet, nicht geprüft |
| 15 | **nicht geprüft** | Die Startwahl erscheint bei einem neuen Dorf nicht mehr (Start direkt mit Hackschnitzelkessel). Falls die Startwahl entfallen ist: Mangel erledigt sich |
| 16 | **erledigt** | getestet: Dorfschild 50 px hoch, einzeilig „Stufe 1 · Wert 466“ |
| 17 | **offen** | gelesen: `#toast` hat links/rechts 0, keine Verschiebung bei offenem Blatt (`stil.css` Zeile 108) |
| 18 | **offen** | gelesen: Leitung-Kontext zeigt weiter Textknöpfe „Tauschen: 32er-Leitung“ (`kontext.ts` Zeile 228). Im Zeichenmodus gibt es das 4er-Raster schon (`.durchmesser`) – dasselbe Raster hier verwenden |
| 19 | **offen** | getestet: Baum auf die Heizzentrale gesetzt → roter Pfeil, aber „Hier bauen“ bleibt aktiv (`disabled = false`); die Bodenraute ist kaum gefüllt (Foto `31_platzieren_belegt`) |
| 20 | **offen** | gelesen: eigene Zeile „Dorf von Du“ (`steuerung.ts` Zeile 182/187) |
| 21 | **erledigt** | getestet 1280×800: kein Ring um das Blatt (Outline „none“), Fokus liegt trotzdem auf dem Blatt |
| 22 | **offen** | getestet: Pillen sind keine Knöpfe (nicht tippbar, kein Weg zum Büro); „★“ als Textzeichen (`hud.ts` Zeile 89) |

**Reihenfolge-Empfehlung für die Bedienung:** N2 + 4 (zusammen lösen: Geld-Pille links vom Blatt, Aktionsleiste fest unten) → N1 → 19 → 6/7 → 9 → 5 → Rest.

---

## 4. Richtung: Die Karte auf das Niveau des Ladebildschirms bringen

### 4.1 Eine Richtung statt zwei
Bisher (DESIGN Fassung 2): **„Ruhige Miniatur“** – flach, gedämpft, ohne Umrisse. Simon will jetzt **„mehr Biss“** und hat für Logo und Ladebild bewusst Clash-of-Clans-Niveau bestellt. Zwei Stile nebeneinander wirken wie zwei Spiele.

**Vorschlag: „Lebendige Miniatur“** – dasselbe isometrische Modelldorf, aber mit der **Handschrift des Ladebildschirms**: eine warme dunkelbraune Silhouetten-Kontur, sattere Farben, sichtbare Details an Häusern, Heizzentrale, Bäumen und Wiese, ein kräftiger Bodenschatten. Ruhig bleibt es durch drei Regeln: (1) die Kontur nur außen um das Objekt, innen nur feine Fugen; (2) Details erst ab einer Zoomstufe; (3) Text auf der Karte nur, wenn er gerade gebraucht wird.
**Warum:** Zielgruppe spielt am Handy kurz zwischendurch; ein Spiel wird über das Bild gekauft und behalten. Der Ladebildschirm ist das Versprechen, die Karte muss es halten. Das Erkennungsmerkmal bleibt: **Wärme leuchtet** – warme Fenster mit Schein und fließende Punkte in den Leitungen.

> **Bitte an den Projektleiter:** Das ist eine Richtungsänderung gegenüber DESIGN Fassung 2 (und Lastenheft A2 nennt „warme Farben, Umrisse, Schatten“ – passt damit wieder). Bitte Simon kurz bestätigen lassen; danach schreibe ich DESIGN.md Fassung 3 und die Tokens im Modus `vorgabe`.

### 4.2 Voraussetzung für flüssige 60 Bilder/s (vor O2–O6)
Mehr Details kosten Zeichenzeit, wenn jedes Haus in jedem Bild neu gezeichnet wird.
- **V1 – Gebäude als fertige Bildchen zwischenspeichern** (Aufwand **M**): Jedes Gebäude einmal in eine kleine unsichtbare Zeichenfläche malen, Schlüssel = Typ · Stufe · warm/kalt · Dachfarbe · Drehung · Zoomstufe (gerundet auf 0,25). In jedem Bild nur noch das fertige Bildchen kopieren. Animiertes (Rauch, Lüfter, Blasen, Fließpunkte) bleibt live darüber.
- **V2 – Boden einmal zeichnen** (Aufwand **M**): Wiese, Straßen, Fluss, Wiesenmuster in eine große Zeichenfläche, neu nur bei Zoom-, Dreh- oder Straßenänderung.
Ohne V1/V2 empfehle ich nur O1, O3 und O7 umzusetzen. Messen: Bildzeit am Handy vorher/nachher (Chrome-Leistungsanzeige), Ziel ≤ 16 ms.

### 4.3 Priorisierte Optik-Vorschläge

| Prio | Was | Warum | Aufwand |
|---|---|---|---|
| **O1** | **Silhouetten-Kontur in Ladebild-Braun** für Gebäude, Bäume, Deko | Größter Einzeleffekt: verbindet Karte, Ladebild und Logo zu einer Handschrift, Objekte lösen sich von der Wiese | S–M |
| **O2** | **Wiese satter und mit Struktur** | Die Salbei-Wiese ist der flachste Teil; sie nimmt 70 % der Fläche ein | S (Farben) / M (Muster) |
| **O3** | **Fenster, Türen, Dachdetails am Haus**; warme Fenster mit Schein | „Biss“ an Häusern **und** das Spielsignal „warm“ wird endlich sichtbar (N3) | M |
| **O4** | **Dachfarben gemischt** statt alle gleich | Startbild wirkt wie ein Reißbrett: 30 gleiche rote Dächer | S |
| **O5** | **Heizzentrale wie im Ladebild** | Sie ist der Held des Spiels, steht in der Mitte und ist heute ein grauer Kasten | M |
| **O6** | **Bäume mit mehr Form** (Kronen aus 4–5 Blasen, Lichtfleck, Nadelbäume) | Waldrand und Deko-Bäume sind heute gleichförmige Kugelhaufen | S–M |
| **O7** | **Bodenschatten in zwei Teilen** (Kontaktschatten + Wurfschatten) | Häuser „stehen“ heute nicht, sie schweben auf einem diffusen Fleck | S |
| **O8** | **Wasser und Straßenrand** mit Glanzkante und Rasenkante | Fluss wirkt wie eine blaue Fläche; Straßen liegen ohne Übergang im Gras | S |
| **O9** | **Spiel-Schrift für Spielmomente** (Lilita One) | Ladebild und Karte teilen dann auch die Schrift, ohne die Lesbarkeit der Anzeigen zu opfern | S |

#### O1 – Silhouetten-Kontur (S–M)
- **Farbe:** `#3b1d0a` (gleich wie Ladebild, Logo, Leitungs-Unterstrich im Ladebild), Deckkraft **0,70**.
- **Stärke:** `max(1, tw × 0,018)` px – bei Startzoom (Kachel ca. 50–60 px) gut 1 px, bei Höchstzoom ca. 3 px. Linienenden und Ecken rund (`lineJoin = 'round'`).
- **Nur außen:** Pro Gebäude den Umriss **einmal** um die Gesamtform (Wand links + Wand rechts + Dachkontur) ziehen. Innere Kanten (Wand/Wand, Wand/Dach, Fenster) mit `rgba(59,29,10,0.22)`, `max(0.75, tw × 0,008)`. Technisch am einfachsten: Silhouette als Pfad aus den bekannten Eckpunkten (`quader()` liefert L/B/R/T, `dach()` P1/P2) mit dickerer Linie **zuerst** zeichnen, Flächen darüber.
- **Bäume:** Kronen-Kontur `#2c5e22` (wie Ladebild), Stamm `#3b1d0a` 0,7.
- **Nicht** für Boden, Straßen, Wasser (sonst wird es unruhig).
- Konstante `KONTUR` in `farben.ts` durch Tokens ersetzen: `farbe.spielwelt.kontur`, `kontur_innen`, `umriss_px.silhouette_faktor`.

#### O2 – Wiese (S / M)
- **Farben** (Richtung Ladebild, eine Stufe ruhiger, damit Leitungen und Blasen vorne bleiben):
  `wiese_a #8cc456`, `wiese_b #87bf52` (Schachbrett weiter kaum sichtbar), `aussen_a #74ad48`, `aussen_b #70a944`, `hintergrund_rand #5f9a3e`.
  Kontrast Tinte #1f2a2e auf `#8cc456` = **7,1:1** (gemessen per WCAG-Formel) – Beschriftungen bleiben lesbar.
- **Muster (M, nur mit V2):** weiche Flecken in zwei Tönen über die Wiese verteilt (fester Zufall wie heute `GRAS`): dunkler `rgba(40,90,30,0.10)`, heller `rgba(255,255,200,0.08)`, Durchmesser 0,6–1,4 Kacheln. Ab Kachelbreite ≥ 70 px kleine Grasbüschel (3 Halme, `#6aa83f`, 1 px) und Blumengruppen (3–5 Punkte zusammen statt einzeln: `#ffffff`, `#ffd45c`, `#ff8fa8`).
- **Rasenkante** entlang Gehweg/Straße: 1 Kachelrand-Streifen `rgba(40,80,25,0.18)`, 2 px – das Gras „hört auf“, statt nur zu enden.
- Token `grashalme_ab_kachelbreite` von 9999 auf **70**.

#### O3 – Häuser mit Details (M)
- **Wände:** Lichtseite `#fbf1de`, Schattenseite `#e2d2b4` (Ladebild). Reihenhaus `#f3dccd`, Mehrfamilienhaus `#e9edf0`, Bäckerei `#f6dfae`.
- **Fenster** doppelt so groß wie heute (Breite `tw × 0,11`, Höhe `hp × 0,38`), mit Rahmen `#3b1d0a` 0,6 Deckkraft und hellem Fensterbrett (`#ffffff`, 1,5 px unter dem Fenster).
  - **warm:** Füllung `#ffd45c` + **Schein**: weicher Kreis `rgba(255,200,80,0.45)` → durchsichtig, Radius 1,6 × Fensterbreite, hinter dem Fenster. Das ist das Erkennungsmerkmal; ein warmes Haus soll man aus 1 m Abstand erkennen.
  - **kalt:** `#9fb3c4`, ohne Schein, mit diagonalem Glanzstrich `rgba(255,255,255,0.5)`.
- **Tür:** `#8a5a2b`, oben leicht gerundet, kleiner Türgriff `#ffd45c`, davor eine Stufe (Quader `#cbc6ba`, 0,15 × 0,06 Kachel). Ab Stufe 2 ein Vordach (Dreieck in Dachfarbe).
- **Dach:** Dachüberstand 6 % der Kachel an Traufe und Giebel, unter dem Überstand ein Schattenstreifen `rgba(59,29,10,0.25)`, 2 px. Ziegelreihen von heute 3 Linien `rgba(0,0,0,.07)` auf 4–5 Linien `rgba(59,29,10,0.14)`; erst ab Kachelbreite ≥ 60 px.
- **Schornstein:** `#9c5a3c` mit heller Abdeckplatte `#cbc6ba` (kein Rauch, A60).
- **Stufen** sichtbar an Anbauten statt nur an der Dachfarbe: Stufe 2 Zaun (gibt es), Stufe 3 Gaube, Stufe 4 Solardach (gibt es), Stufe 5 Wintergarten/Carport.
- Bei Kachelbreite < 40 px Fenster-Details weglassen (nur Farbflächen), damit es beim Herauszoomen nicht flimmert.

#### O4 – Dachfarben gemischt (S)
- Dachfarbe je Haus aus seiner `id` (fest, ändert sich nie): Palette wie Ladebild, gewichtet
  `#e2582b` Orange-Terrakotta, `#c4553e` Ziegelrot, `#d8392f` Rot (zusammen 70 %), `#2f6aa8` Schieferblau (15 %), `#7a4e9a` Pflaume (8 %), `#5d6b78` Anthrazit (7 %).
- Lichtseite +6 %, Schattenseite −18 % (wie heute).
- Die Stufe zeigt dann **nicht** mehr die Dachfarbe, sondern Höhe + Anbauten (O3) + Stufen-Etikett in der Kontextkarte. DESIGN 3 wird entsprechend geändert.

#### O5 – Heizzentrale (M)
Übernehmen aus dem Ladebild (`vorspann.ts` `heizzentrale()`):
- Wand `#eef1f3`, Schattenseite `#c9d0d6`, **grünes Dachband** `#3fa15a` an der Oberkante (heute ein dünner Streifen), Ziegelsockel `#a8553c` / `#86412e` (gibt es).
- **Große warme Fenster** in einer Reihe (3 Stück, `#ffd45c` mit Rahmen und Schein), wenn die Anlage läuft; sonst `#bfe0f5`.
- **Schornstein höher** (heute 0,55 Kachel → 0,8), Kontur, Ring rot `#e8463a` / weiß wie im Ladebild, Abdeckplatte.
- **Rolltor** `#5d6b78` mit hellen Lamellen `#8796a3` (gibt es, mit Kontur verstärken).
- **Brennstofflager passend zur Quelle** (nur was fachlich stimmt): Hackschnitzel → Haufen `#c8913f` mit Punkten `#9a6838` neben dem Tor; Pellet → Silo (Zylinder `#d6dde3`); Wärmepumpe → Außengerät mit Lüfter (gibt es); BHKW → grüner Container (gibt es). PV-Module auf dem Dach **nur**, wenn PV gebaut ist.
- Stufen-Sterne größer (Radius `tw × 0,05`) mit Kontur `#3b1d0a`.
- Die Heizzentrale bekommt als einziges Gebäude einen **sanften warmen Bodenschein** unter sich (`rgba(255,190,90,0.18)` → durchsichtig, Radius 1,2 × Größe), solange Wärme fließt. Sie ist das Herz des Netzes.

#### O6 – Bäume (S–M)
- **Laubbaum:** Krone aus 4–5 Kreisen (wie Ladebild `baum()`), drei Töne statt Verlauf: Schatten unten rechts `#3f9c45`, Mitte `#5cbf55`, Lichtfleck oben links `#8be06a` (kleiner Kreis, 25 % Deckkraft weiß darüber). Kontur `#2c5e22`, `max(1, tw × 0,018)`. Stamm `#7a4e2c` mit Kontur.
- **Nadelbaum** (jeder 4. Baum im Waldrand): 3 gestapelte Dreiecke `#2f7a45` / Schattenseite `#24613a`, Kontur `#1d4a2c`.
- **Größe streuen:** 0,85–1,15 × (fest je Position), damit der Waldrand nicht wie eine Hecke aussieht.
- Selten (1 von 15) ein Baum mit Herbstton `#e0a13a` – nur Deko, keine Spielbedeutung.
- Sanftes Wiegen (±1° über 4 s) nur ohne „Weniger Bewegung“ und nur für Bäume im Bild.

#### O7 – Bodenschatten (S)
- **Kontaktschatten:** flache Ellipse direkt am Fuß, `rgba(20,30,15,0.30)`, Breite 0,9 × Grundfläche, Höhe 0,35 × – das Haus „steht“.
- **Wurfschatten:** Parallelogramm nach rechts unten (Sonne oben links, wie `karte.licht`), Länge 0,4 × Gebäudehöhe, `rgba(30,50,25,0.16)`, Kanten weich (einmal mit `filter: blur(2px)` ins Zwischenbild aus V1 zeichnen, nicht live).
- Bäume nur Kontaktschatten (wie Ladebild: Ellipse `#000` 0,2).

#### O8 – Wasser und Ränder (S)
- Uferlinie heller und mit Glanz: Kante `#5f93ad` 2 px, darüber 1 px `rgba(255,255,255,0.5)` versetzt.
- Statt waagrechter Glitzerstriche kleine **Wellenbögen** (2 Halbbögen, `rgba(255,255,255,0.45)`, 1,5 px), langsam wandernd.
- Wasser etwas klarer: `wasser_a #7fb8d6`, `wasser_b #79b2d0`.

#### O9 – Spiel-Schrift (S)
- **Lilita One** (ist schon eingebunden) für: Schwebetext „+120 €“, Toast „Auftrag geschafft!“, Bautimer-Restzeit, Stufen-Aufstieg. Mit Kontur `#3b1d0a` wie im Ladebild – das ist hier gewollt (Spielmoment), Text ≥ 16 px.
- **Manrope bleibt** für Anzeigen, Blätter, Knöpfe und alle Zahlen (gleich breite Ziffern, bessere Lesbarkeit).

### 4.4 Was bewusst **nicht** übernommen wird
- Keine Kontur um Straßen, Wasser, Wiesenkacheln.
- Keine Vignette und kein Himmel auf der Karte (würde Fläche kosten und Ränder verdunkeln, wo die Rundknöpfe liegen).
- Keine Herzblasen an jedem Haus: auf der Karte zeigt eine Blase immer eine **Aufgabe** (Rangfolge DESIGN 3). Ein kurzes Herz darf nach dem Anschließen 1,5 s aufsteigen und verschwinden (Belohnung), dann Ruhe.

---

## 5. kW-Schilder: lesbarer und ruhiger

**Heute:** dunkle Kapsel `rgba(42,33,24,.72)`, weiße Schrift mit dunklem Umriss, an **jedem** Haus ab Kachelbreite 36 px, Standard „an“. Ca. 35 Schilder im Startbild.

**Wozu braucht der Spieler die Zahl?** Fast nur beim **Planen von Leitungen** (welcher Durchmesser reicht?) und beim Antippen eines Hauses. Im normalen Spiel ist sie Rauschen.

**Vorschlag (Aufwand S):**
1. **Standard aus im Normalmodus.** Automatisch **an**, solange geplant oder gezeichnet wird (Bauabschnitt „offen“, Modus Leitung/Stempel) – genau dann ist die Zahl nützlich. Der kW-Knopf bleibt als Schalter für „immer zeigen“.
2. **Nur sinnvolle Häuser:** angeschlossene Häuser und Interessenten (gelb leuchtend) sowie Häuser direkt an einer geplanten Leitung. Nicht angeschlossene Häuser ohne Interesse: kein Schild.
3. **Erst ab Kachelbreite ≥ 56 px** (statt 36), darunter überlappen die Schilder zwangsläufig.
4. **Helles, kleines Schild statt dunkler Kapsel:** Fläche `#fbfaf7` mit 92 % Deckkraft (= `ui.hud_pille`), 1-px-Linie `rgba(31,42,46,0.12)`, Radius 6, Schrift Manrope 700 **11 px** in Tinte `#1f2a2e` (Kontrast 14:1), **ohne** Textumriss. Davor ein 6-px-Punkt in Zustandsfarbe: warm `#ffc65c`, kalt `#4a86c5`, nicht angeschlossen `#a7afb4`. So trägt das Schild zusätzlich Information, ohne lauter zu werden.
5. **Position:** an der vorderen Hausecke (unten rechts versetzt), nicht mittig auf der Wand; Schilder hinter einem höheren Gebäude ausblenden, wenn sie mit dessen Grundfläche überlappen.
6. Bei Großabnehmern Schild etwas größer (12 px) – sie sind die wichtigen Lasten.

Abnahme: Startbild bei 844×390 im Normalmodus ohne kW-Schilder; beim Zeichnen einer Leitung erscheinen sie an angeschlossenen/geplanten Häusern; kein Schild überdeckt ein anderes bei Startzoom.

---

## 6. Handy-Bedienung (844×390)

| Punkt | Ergebnis |
|---|---|
| Tippflächen ≥ 44 px | **erfüllt** (getestet): Zoom/Drehen/kW 48×48, Bauen 64, Dörfer 52, Dorfschild 210×50, Auftrag 210×47, Reiter 44, Blattknöpfe 44–54, Schließen 44×44 |
| Abstand zwischen Tippflächen | **verletzt**: Auftrag und „+“ überlappen 11 px (N1) |
| Anzeigen oben lesbar | **erfüllt**: Werte Manrope 14/700 in Tinte auf heller Pille (#fbfaf7, 92 %), Kontrast ca. 14:1; Füllspur 3 px darunter sichtbar. **Aber:** Pillen 32 px hoch statt 44 (DESIGN 4) und nicht tippbar (Mangel 22) |
| Anzeigen bei offenem Blatt | **verletzt**: keine Anzeige sichtbar (N2) |
| Anzeigen auf satter Wiese (nach O2) | bleibt lesbar, weil die Pillen eine eigene helle Fläche haben; die Etiketten der Rundknöpfe („Dörfer“, „Bauen“) brauchen weiter ihre helle Mini-Kapsel (heute vorhanden) |
| Pillen-Breite | Pillen 281–832 px, bei 844 Breite 12 px Rand – passt. Wird eine sechste Anzeige ergänzt, passt sie nicht mehr: dann Taler und Monteure zu einer Pille zusammenfassen |

**Empfehlung Pillenhöhe:** auf 40 px anheben (statt 44), wenn Geld/Ruf tippbar werden: die Tippfläche per unsichtbarem Rand (`padding` 2 px oben/unten, `::before`) auf 44 bringen. So bleibt die Reihe schlank.

---

## 7. Pflichtfragen

1. **Eine klare Richtung?** Ja: „Lebendige Miniatur“ – Modelldorf mit der Handschrift des Ladebilds (Kontur #3b1d0a, satte Farben, Details ab Zoom), begründet aus Simons Wunsch, der Handy-Zielgruppe und dem Erkennungsmerkmal „Wärme leuchtet“. Braucht Simons Bestätigung, weil sie DESIGN Fassung 2 ablöst.
2. **Abläufe und Zustände?** Unverändert aus DESIGN 6/7. Neu festgelegt: kW-Schilder je Modus (Abschnitt 5), Haus warm/kalt deutlicher (O3).
3. **Farben nur aus Tokens?** Nein. Ladebild, Schriftzug, Gebäude und Bäume haben feste Werte im Code (N7, N8). Die hier genannten Werte gehören nach Bestätigung in `tokens.json` (`farbe.spielwelt.*`, `farbe.karte.*`, `farbe.objekt.*`).
4. **Kontrast, Tastatur, Fokus, Beschriftungen, Tippflächen?** Tippflächen erfüllt; Überlappung N1; Anzeigen lesbar, aber bei Blatt verdeckt (N2). Kontrast der neuen Wiese mit Tinte 7,1:1. Achtung: Leitungen Hellblau/Gelb/Pink haben auf der satteren Wiese nur 1,0–1,4:1 – die dunkle Leitungskante (1,5 px) **muss** bleiben, am besten in `#3b1d0a` wie im Ladebild. Tastatur/Fokus nicht neu geprüft.
5. **Echte Texte?** Ja, keine Platzhalter gesehen. Offen: „Dorf von Du“ (Mangel 20).
6. **Abweichungen mit Beleg?** Ja, Abschnitte 2 und 3 mit Fotos und Messwerten.

---

## 8. Übergabe an den Projektleiter (Bau)

**Reihenfolge:**
1. Bedienung: N2 + Mangel 4 (Geld-Pille links vom Blatt, feste Aktionsleiste), N1 (Knöpfe paarweise), Mangel 19, 6, 7.
2. Simon die Richtung „Lebendige Miniatur“ bestätigen lassen (am besten mit einem Probebild: ein Haus, ein Baum, ein Stück Wiese mit O1–O4).
3. kW-Schilder nach Abschnitt 5 (klein, schnell, sofort ruhiger).
4. V1/V2 (Zwischenspeicher), dann O1 → O4 → O3 → O7 → O2 → O5 → O6 → O8 → O9.
5. Danach Treue-Prüfung bei 844×390 (Bildfaktor 2 und 3) mit Bildzeitmessung.

**Für jeden Optik-Schritt fotografieren:** Startzoom, Höchstzoom, ganz herausgezoomt; Haus warm/kalt/nicht angeschlossen; Heizzentrale mit jeder Quellenart; Planungsmodus mit kW-Schildern; „Weniger Bewegung“ an.

**Tests, die ohne Grafik gehen:** Dachfarbe je Haus-ID ist fest (gleiche ID → gleiche Farbe nach Neuladen); kW-Schild-Regel als reine Funktion (Modus, angeschlossen, Interessent, Kachelbreite → zeigen ja/nein).

---

## Unsichere Beobachtungen (unter 80)

- (70) Kontextkarte „Einfamilienhaus“ (Foto `12_kontext_haus`): Chip „Übergabestation fehlt“, Zeile „Übergabestation: keine“, darunter aber der Satz „Angeschlossen, aber es kommt zu wenig Wärme an …“. Wirkt widersprüchlich; Bitte an den Produktprüfer, den Text für den Zustand „Leitung da, Station fehlt“ anzusehen.
- (60) Tipp-Zeile im Ladebild schneidet lange Tipps mit „…“ ab (`white-space: nowrap`). Bei 844 px passte der gesehene Tipp (424 px). Der längste Tipp („Leitungen gehören in die öffentliche Straße …“) könnte auf kleineren Handys (667 px quer) abgeschnitten werden – nicht gemessen. Vorschlag: zwei Zeilen erlauben.
- (60) Das Ladebild-Haus ist frontal gezeichnet, die Karte isometrisch. Das ist üblich (Titelbild ≠ Spielansicht) und nach O1–O5 kein Bruch mehr; nur falls Simon „genau wie im Ladebild“ meint, nachfragen.
