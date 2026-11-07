# DESIGN – Wärmenetz-Dorf

Stand 2026-11-04 · Designer, Modus `entwurf` (Überarbeitung) und `vorgabe` · Werte: `design/tokens.json`, Fassung 2. Im Code stehen keine Farben, Maße oder Zeiten direkt.
**Nachtrag 2026-11-05: Für alle Menüs und Bedienoberflächen (DOM) gilt ab jetzt Abschnitt 12 „Menü-Stil v2“.** Wo die Abschnitte 1, 4 und 9 für Menüs etwas anderes sagen (Haarlinien, kein Textumriss, eine Schrift), gilt Abschnitt 12. Die Kartengrafik (Abschnitt 3) bleibt unverändert.
**Nachtrag 2026-11-06: Abschnitt 13 „Tutorial (NR13)“** – Ablauf, Texte, Spotlight und Zustände des Pflicht-Tutorials für neue Spiele.
**Nachtrag 2026-11-07: Abschnitt 13.17 (NR20–NR22)** – Geisterleitung und Ziel-Häuser in T13, Hauptleitung + Hausanschluss im Tutorial, Überlast mit gelbem Warndreieck statt Rot-Blinken. Ersetzt die Überlast-Angaben in Abschnitt 3 und 9.
Anlass: Simon wünscht „mach die Optik mehr modern, weniger kindlich“. Der Spielablauf, die Bildschirme und die Zustände aus Fassung 1 bleiben gleich. Neu sind Look, Schrift und Farben. Die offenen Mängel 3, 4, 7 und 14 aus `docs/DESIGN_TREUE_F5.md` sind hier fest eingeplant.

## 1. Richtung und Spielgefühl
**Ruhige Miniatur**: Das Dorf wirkt wie ein kleines Architekturmodell auf dem Tisch. Die Flächen sind flach eingefärbt, der Schatten ist weich, die Farben sind gedämpft. Die Bedienung schwebt leise darüber. Vorbilder: Townscaper, Islanders, Monument Valley.
- **Warum:** Wärmenetze sind ruhige Infrastruktur, die verlässlich funktionieren muss. Gespielt wird kurz zwischendurch im Querformat. Ein ruhiges Bild ermüdet weniger, macht Zustände (kalt, Engpass) leichter erkennbar und wirkt erwachsener als der bisherige Spielzeug-Look mit dicken Umrissen. Freundlich bleibt es durch warme Grundtöne, runde Formen und weiche Bewegung.
- **Gefühl:** Jede Aktion bekommt sofort eine Antwort, aber leise: ein kurzes Federn beim Bauen (Stärke 8 % statt 18 %), Münzen fliegen zur Geld-Anzeige, ein paar Funken bei Fertigstellung. Nichts blinkt grell, nichts bestraft. Fehler zeigt das Spiel als Hinweis am Objekt.
- **Erkennungsmerkmal: Wärme ist das einzige Leuchten.** Die Welt ist kühl-gedämpft (Salbei, Steingrau, gebrochenes Weiß). Warm leuchten nur versorgte Häuser: bernsteinfarbene Fenster (`objekt.fenster_warm`) mit weichem Schein (`objekt.fenster_schein`), dazu die Fließpunkte in den Leitungen. Ein kaltes Haus hat blassgraue Fenster und eine Schneeflocken-Blase. Wer mit Öl heizt, hat grauen Rauch. Abends wäre das Dorf ohne Netz dunkel. Man **sieht** also, wo das Netz wirkt.
- **Oberflächen-Standard** (`wissen/oberflaeche.md`) gilt jetzt weitgehend: 1-px-Linien, dezente Schatten, eine Schriftfamilie, Abstandsraster, Radien 8–14 px. Bewusst bleiben einige Spiel-Rollenfarben (Wärme, Geld, Taler, Kalt), weil sie Spielzustände tragen. Es gibt keinen Dunkelmodus, weil die Spielwelt bei Tageslicht spielt (bleibt aus Fassung 1).
- **Ausdrücklich nicht:** dicke dunkle Umrisse, harte Versatz-Schatten, Glanz-Verläufe auf Knöpfen, weiße Schrift mit Textumriss, Comic-Schrift, lila Verläufe, Emojis.

## 2. Schrift
- **Eine Familie: Manrope**, npm-Paket **`@fontsource/manrope`**. Selbst gehostet, im Service Worker vorgehalten (offline, A16). Einbinden: `latin-500`, `latin-600`, `latin-700` (Untermenge „latin“ enthält €, ä, ö, ü, ß).
- Rollen: Titel 600/700, Text 500, Zahlen 600 mit `tabular-nums`. Auf der Karte (Canvas) 700 (`schrift.schnitt_karte`).
- Größen: `schrift.groesse_px`, kleinste Größe 11 px. Titel mit Laufweite −0,01 em.
- Die Pakete `@fontsource/baloo-2` und `@fontsource/nunito-sans` fallen weg (Abhängigkeits-Schranke beachten).

## 3. Grafikstil der Karte (Canvas)
- **Kamera:** isometrisch 2:1, 24×24 Felder. Zoom 1–4: am Handy startet die Kamera mit 3, am Desktop mit 1,9, mittig auf der Heizzentrale. Ziehen verschiebt die Karte (erst ab 7 px Bewegung, sonst zählt es als Tippen). Zwei Finger zoomen um den Mittelpunkt, am Desktop zoomt das Mausrad um den Mauszeiger. Das Dorf verschwindet nie ganz aus dem Bild. (unverändert)
- **Grund:** Hinter der Karte liegt ein leiser radialer Verlauf von `karte.hintergrund` (Mitte) zu `karte.hintergrund_rand` (Ecken). Das Dorf wirkt dadurch wie eine Insel im Dunst. Das ist der **einzige** Verlauf im Bild.
- **Boden:** Schachbrett aus `wiese_a`/`wiese_b`. Der Unterschied ist bewusst kaum sichtbar, die Felder lesen sich trotzdem. **Keine Grashalme** (`grashalme_ab_kachelbreite: 9999`). Blumen nur vereinzelt (`blumen_dichte` 2,5 % der Felder). Außerhalb des Baugebiets liegt `aussen_a/b` mit Baumring. Der Rand ist ein heller Sandweg (`weg_rand`). Im Baumodus erscheint ein Raster aus 1-px-Linien (`raster_baumodus`).
- **Licht:** Die Sonne steht oben links. **Jede Fläche ist flach eingefärbt, ohne senkrechten Verlauf.** Oberseite +14 %, linke Wand in Grundfarbe, rechte Wand −16 %. Dach: Lichtseite +6 %, Schattenseite −18 % (`karte.licht_faktor`). Dachfirste bekommen eine feine Lichtkante (`kante_licht`).
- **Schatten:** weich statt hart. Ein radialer Verlauf von `karte.schatten` (Kern) zu `schatten_rand` (durchsichtig), leicht nach rechts unten versetzt (`schatten_form`). Er gilt ausnahmslos für jedes Objekt.
- **Umriss:** Es gibt **keinen dunklen Umriss** mehr. Flächen bekommen nur eine Haarlinie in `karte.umriss` (12 % Deckkraft, Stärke `max(0.75, Kachel × 0,008)`). Sie schließt die Fugen zwischen den Flächen und ist kaum zu sehen.
- **Objekte:** klare Grundkörper (Quader, Satteldach, Zylinder) ohne Strukturen. Die Stufe erkennt man an Höhe, Dachfarbe (`objekt.dach_stufe`, gedämpft), Sternen an der Heizzentrale und Anbauten. Alle Objektfarben stehen in `objekt.*` (Wände, Tür, Schornstein, Heizzentrale, Büro, PV, Solar, Puffer, Sonde, Heizhaus-Quellen, Deko, Großabnehmer, Monteur). Eine Baustelle steht in einem hellen Holzgerüst (`geruest`), ein Monteur hämmert, darüber liegt ein heller Bautimer (siehe 4).
- **Leitungen:** acht Durchmesser in Simons Farben, im Ton gedämpft (`leitung.d25` … `d110`): 25er rot, 32er grün, 40er hellblau, 50er dunkelblau, 63er pink, 75er gelb, 90er braun, 110er dunkelgrün. Je dicker, desto breiter gezeichnet. Aufbau von unten nach oben: Sandstreifen `graben` (Rohrbreite + 6 px), dünne Kante `leitung.umriss` (1,5 px je Seite), Rohrfarbe, feiner Glanzstrich `glanz`. Nicht verbunden: grau. Überlast: ~~Wechsel zwischen `ueberlast_a` und `ueberlast_b` (2 Hz) plus rotes Warndreieck~~ → **ersetzt durch 13.17.3** (Farbe bleibt, gelbes Warndreieck am Pfosten, gelber Saum, kein Blinken). Die dünne Kante bleibt, weil Hellblau, Gelb und Pink sich sonst nicht von der Wiese abheben (gemessen ohne Kante 1,0–1,5:1).
- **Bewegung (Karte):** Rauch, Wasser im Brunnen, Lüfter der Wärmepumpe, Blasen (wippen nur ±1,5 px), Fließpunkte, Münzflug, Funken (`effekt.funken`, Pastelltöne). Beim Platzieren ein kurzes Federn (450 ms, Stärke `plopp_staerke`). Alle Zeiten stehen in `zeit_ms`. Bewegung läuft nach Uhrzeit, nicht nach Bildern (M9).
- **Text auf der Karte** (Bautimer-Restzeit, Schwebetext „+120 €“, „BAD“, „H“, „€“): Manrope 700 in `effekt.schwebetext` (tinte) mit hellem Halo `effekt.text_halo`, wie Beschriftungen auf einer Landkarte. Kein dunkler Textumriss mehr. Geld-Schwebetext in `effekt.schwebetext_geld`.
- **Kunden-Blasen:** weiße Scheibe mit Spitze, **ohne dunklen Rand**, mit weichem Schatten (`blase.schatten`). Innen eine farbige Scheibe mit weißem, gezeichnetem Symbol (`blase.symbol`). Je Objekt genau eine Blase, die wichtigste zuerst:
  1. gekündigt ✕ (`gekuendigt`)
  2. kein Anschluss ! (`kein_anschluss`)
  3. Leitung zu dünn ! (`leitung_zu_duenn`)
  4. kalt, Schneeflocke (`kalt`)
  5. unzufrieden ! (`unzufrieden`)
  6. Münze zum Einsammeln (`muenze`, „€“ in `muenze_text`)
  7. Großabnehmer-Angebot ? (`angebot`)

  Die Symbole sind gezeichnete Formen, keine Schriftzeichen (M7).

## 4. Oberflächen-Bausteine (DOM)
Grundregel: **helle, flache Flächen** (`ui.pergament`, Karten `ui.pergament_hell`), **1-px-Linie** in `ui.pergament_rand`, **weicher Schatten** nur bei schwebenden Teilen (`schatten.*`), Radien aus `radius_px`. Text in `ui.tinte`. Gedrückt: `transform: scale(0.98)` und Fläche `[1]`, Schatten `knopf_gedrueckt`. Kein Textumriss, keine Verläufe.

| Baustein | Aussehen | Maße / Zustände |
|---|---|---|
| **HUD-Pille** | helle, leicht durchscheinende Kapsel (`ui.hud_pille`, Linie `hud_pille_rand`), Symbol 22 px **innen links**, Wert rechtsbündig in tinte (600, gleich breite Ziffern), darunter eine 3 px dünne Füllspur (Geld, Wärme, Ruf) | Höhe 44 (`hud_pille_hoehe`), Radius 22. Einheit steht im Wert („10/60 kW“). Am Desktop steht das Etikett gedämpft links in der Pille. Tippbare Pillen (Geld, Ruf → Abrechnungsbüro) haben dieselbe Form plus Fokusring. Mangel: Füllspur `waerme_mangel`/`ruf_schlecht`, Wert in `rolle.fehler` |
| **Dorfschild** | helle Kapsel wie die Pillen (`dorfschild_*`). Dorfname 16 px/700, darunter einzeilig „Stufe N · Dorfwert N“ in `dorfschild_untertext` | ≤ 52 px hoch, Tippen öffnet die Dorf-Einstellungen |
| **Auftragskarte** | helle Karte, links ein 24-px-Kreis in `rolle.geld` mit dunklem „!“, Text höchstens 2 Zeilen, Belohnung „+10“ in `rolle.taler` (600) | Die ganze Karte ist tippbar. Fertig: Stern-Symbol und „Alle Aufträge erledigt“ |
| **Rundknopf** | Bauen: gefüllter Kreis `knopf.rund_bauen`, weißes Symbol. Besuchen: weißer Kreis `rund_besuch`, Symbol in tinte, 1-px-Linie. Schatten `schatten.rund`. Beschriftung darunter 12 px auf heller Mini-Kapsel (sonst unlesbar auf der Wiese) | Bauen 64, Besuchen 52 |
| **Zoomknopf** | weißes abgerundetes Quadrat, „+“ / „−“ als Linien-Symbol in tinte | 48×48, Abstand 8 |
| **Knopf** | flache Fläche, Varianten: `standard` (weiß, Linie), `los` (grün: bauen, abholen), `heiss` (orange: ausbauen, wegräumen), `taler` (violett: mit Talern beschleunigen), `blau` (Förderantrag), `gewaehlt` (heller Bernstein plus 2 px Linie unten in `ui.gewaehlt_linie`, Schrift 700: aktiver Reiter, Preisstufe). Weißer Text nur auf los/heiss/taler/blau | Mindesthöhe 44, Radius 12. Zweite Zeile 12 px für Preis oder Zeit („1.200 € · 30 s“). Gesperrt: Fläche `pergament_2`, Text gedämpft, Grund in der zweiten Zeile |
| **Seitenblatt / Popup** | Fläche `pergament`, Radius 20 (Seitenblatt nur oben links und unten links), Schatten `popup`. **Kopf:** flach, Titel 17/700 in tinte, rechts das Stufen-Etikett (`stufe_text` auf `stufe_grund`, Radius 8) und der Schließen-Knopf, darunter eine 1-px-Linie. **Inhalt** scrollt. **Aktionsleiste** fest unten (siehe 5) | Schließen: runder, neutraler Knopf `knopf.schliessen` mit ✕-Linie in tinte, 44 px |
| **Chip** | kleine Kapsel, Varianten neutral/rot/grün/blau, 1-px-Linie | Nur Anzeige, nie tippbar |
| **Kasten** | Fläche `pergament_hell`, 1-px-Linie, Radius 14 | Für „Im Heizhaus“, „Bedingungen“, „Förderanträge“, „Planungsfehler“ |
| **Bau-Katalog-Karte** | Bild auf Wiesengrund (`karte.wiese_a`), Radius 8, Name 14/700, Werte gedämpft, Preis 600 | Bild 96 px (Desktop) bzw. **64 px quer** (`katalog_bild_hoehe_quer`). Zustände wie Fassung 1: kaufbar / zu teuer (Preis in `rolle.fehler`, bleibt tippbar) / voll / gesperrt (nur das Bild blass) / Abzeichen Förderung |
| **Fortschrittsbalken** | Spur `fortschritt_grund`, Füllung `fortschritt`, keine Linie | 8 px hoch, voll gerundet. Restzeit als Text darüber |
| **Bautimer (Karte)** | helle Kapsel `effekt.balken_grund` mit weichem Schatten, Spur `bautimer_grund`, Füllung `bautimer`, Restzeit darüber in tinte mit Halo | ersetzt den dunklen Balken |
| **Toast** | dunkle Kapsel (`ui.toast_grund`), weißer Text 15/600, Radius 22, Schatten `popup` | Mittig auf 30 % Höhe, 2 s, `aria-live="polite"`. Lange Texte brechen in der Kapsel um (max. 420 px). Bei offenem Seitenblatt mittig über der freien Kartenfläche |
| **Banner** (Besuch) | helle Karte, Radius 14, Schatten `schild` | Querformat unten, Desktop oben |

Abstände nur aus `abstand_px` (4/8/12/16/24/32).

## 5. Querformat-Aufbau (844×390, verbindlich seit 2026-11-04)
Hochformat zeigt nur „Bitte drehe dein Handy ins Querformat.“ in tinte auf `karte.hintergrund`.

```
┌───────────────────────────────────────────────────────────────────────────┐
│(Dorfname     ) (€ 1.199)(W 10/60 kW)(R 79 %)(T 100)(M 2/2 frei)          │  Reihe 12..56 px
│(! Auftrag +10)                                                             │
│                                                                            │
│                         K A R T E                                          │
│                                                                            │
│ [+]                                                              (Karte)   │
│ [−]                                                              (BAUEN)   │
└───────────────────────────────────────────────────────────────────────────┘
```

**Seitenblatt offen** (Katalog, Kontext, Dörfer, Einstellungen) – Mängel 3 und 4:
```
┌───────────────────────────────────────────────────────────────────────────┐
│(Dorfname) (€ 1.199)(W 10/60 kW)(R 79 %)(T 100)(M 2/2)                     │  Anzeigen bleiben frei
│(! Auftrag)                                  ┌─────────────────────────────┤  top = 64 px
│                                             │ Haus Müller   [Stufe 2] (✕) │  Kopf fest
│        freie Kartenfläche                   ├─────────────────────────────┤
│        (gewähltes Objekt in deren Mitte)    │ braucht 8 kW · 120 €/min    │  Inhalt scrollt
│                                             │ [Chip] [Chip]  ▓▓▓▓░ 80 %   │
│                                             │ Verschieben · Entfernen     │
│                                             ├─────────────────────────────┤
│                                             │ [   Leitung legen   ][Abh.] │  Aktionsleiste fest
└─────────────────────────────────────────────┴─────────────────────────────┘
```
- **Seitenblatt:** rechts, Breite min(46 %, 400 px) (`layout_quer.blatt_breite_prozent`, `groesse_px.blatt_breite_quer_max`). Es **beginnt bei 64 px** (`groesse_px.blatt_oben_quer` = 12 Rand + 44 Pille + 8 Abstand) und reicht bis zum unteren Rand. Rundung 20 px oben links, keine Linie rechts. Die Anzeigenreihe ist **nie** verdeckt. Wird die Pillenreihe breiter als die freie Fläche links vom Blatt, darf sie über dem Blatt liegen, weil das Blatt erst darunter beginnt.
- **Aufbau im Blatt** (Flex-Spalte): Kopf (fest) → bei Katalog die Reiterleiste (fest unter dem Kopf, Abstand 4 px, aktiver Reiter immer im Bild) → Inhalt (`overflow-y: auto`, `flex: 1`) → **Aktionsleiste** (fest am Blattende).
- **Aktionsleiste:** Fläche `ui.aktionsleiste_grund`, oben 1-px-Linie `ui.aktionsleiste_linie`, Innenabstand 8/12, Mindesthöhe 60 (`aktionsleiste_min_hoehe`), höchstens 2 Knöpfe nebeneinander (`layout_quer.aktionsleiste_knoepfe_max`). Die Hauptaktion steht links und breit (Variante los/heiss/taler), eine Nebenaktion rechts. Hauptaktionen je Kontext: Haus ohne Anschluss → [Leitung legen]; Haus mit Münzen → [Abholen]; Ausbau möglich → [Ausbauen auf Stufe N · Preis]; gekündigt → [Zurückgewinnen]; Leitung → [Tauschen] (nach der Wahl im Raster); Baustelle → [Sofort fertig · 3 Taler]; Großabnehmer → [Vertrag unterschreiben]; Hindernis → [Wegräumen]. „Verschieben“ und „Entfernen“ bleiben unten im scrollenden Teil (seltene Aktionen). Ohne Aktion (z. B. Besuch) entfällt die Leiste.
- **Katalog quer:** 2 Spalten, Bild 64 px, Karten-Innenabstand 8. Damit sind 2 Reihen sichtbar.
- **Modus-Leiste** (Platzieren, Verschieben, Leitung legen): kompakt unten rechts, gleiche Breite wie das Blatt, Höhe nach Inhalt, höchstens 132 px (`modusleiste_max_hoehe`), Rundung oben links. Einzeiliger Hilfetext 12 px. Bei „Leitung legen“: 8 Farbknöpfe je 44×44 (`farbknopf_leitung`, Farbstreifen `leitung.dNN`, Zahl „25“ … „110“), darunter „25er · bis 12 kW · 10 €“, rechts [Fertig].
- **Kamera:** Das gewählte Objekt bzw. der Bau-Geist liegt in der Mitte der freien Fläche (Bildschirm minus Blatt-Rechteck), am Desktop über dem unten liegenden Blatt.
- **Popups** (Startwahl, Willkommen zurück, Spielstand-Fehler) mittig mit 12 px Rand, abgedunkelter Hintergrund `ui.abdunkeln`.
- **Rundknöpfe und Zoom** sind ausgeblendet, solange ein Blatt oder eine Modus-Leiste offen ist (M3).

**Desktop (1280×800):** gleicher Aufbau. Das Etikett steht links in der Pille. Die Kontextkarte schwebt unten mittig (max. 580 px, Radius 20 rundum), der Katalog ist fest 80 % hoch. Aktionsleiste auch hier fest unten.

## 6. Bildschirme und Zustände
(Inhalt wie Fassung 1. Neu ist nur das Aussehen nach Abschnitt 4.)

| Bildschirm | Zustände (alle bauen) |
|---|---|
| **S0 Laden** | Grund `karte.hintergrund` mit Radialverlauf, Schriftzug „Wärmenetz-Dorf“ 17/700 in tinte, Ladebalken (8 px, `bautimer`). Fehler beim Laden: Popup „Dein Spielstand ließ sich nicht lesen. Neues Dorf anfangen?“ mit [Neues Dorf] und [Nochmal versuchen]. Der kaputte Stand wird nie still überschrieben |
| **S1 Startwahl** (A3) | Popup mittig, HUD ausgeblendet. Titel „Deine erste Wärmequelle“. 3 Karten (Hackschnitzelkessel, Großwärmepumpe, Power-to-Heat-Kessel) mit Bild, Leistung in kW, „+ Vorteil“, „− Nachteil“, Knopf [Gratis zum Start] (los) unten bündig. Quer: 3 Spalten ab 900 px, sonst waagrecht scrollbar mit Hinweis „Weiter rechts: 2 weitere“. Nach der Wahl: Funken, Toast „Hackschnitzelkessel läuft!“ |
| **S2 Dorf** (A1, A2) | **leer/neu:** Heizzentrale, 2–3 Häuser mit grauem Öl-Rauch und „kein Anschluss“-Blase; der erste Auftrag zeigt auf die Leitung. **Baustelle:** Gerüst, Monteur, heller Bautimer; die Pille „Monteure 0/1“ zeigt den Wert in `rolle.fehler`. **warm:** Bernsteinfenster mit Schein, kein Rauch, später eine Münzblase. **kalt:** blassgraue Fenster, Schneeflocken-Blase. **Engpass:** Leitung wechselt rot, „Leitung zu dünn“-Blase dahinter. **Planungsfehler:** rotes Dreieck auf dem Abschnitt. **Kasse voll:** Geld-Spur voll, Wert „voll“; Antippen einer Münze → Toast „Kasse voll – Abrechnungsbüro ausbauen“. **gekündigt:** ✕-Blase, grauer Rauch. **Willkommen zurück** (A15): Popup „Während du weg warst (3 h 12 min)“ mit Einnahmen, Betriebskosten (−), fertigen Baustellen und [Weiter] |
| **S3 Kontextkarte** | Je Objekttyp: Haus (Bedarf kW, Einnahme €/min, Zufriedenheit, [Abholen]) · Heizzentrale (Plätze „1/1“, Quellen mit [Stufe +1], Einbau) · Leitung (Last „12 / 20 kW“, Tauschraster mit 4 Spalten aus Farbknöpfen, Kasten Planungsfehler) · Abrechnungsbüro (Kasse, Wärmepreis in 5 Stufen, Förderanträge) · Großabnehmer (Bedingungen ✕/✓, [Vertrag unterschreiben]) · Hindernis ([Wegräumen]). **Baustelle:** Fortschritt, Restzeit, [Sofort fertig · 3 Taler]. **gesperrt:** Knopf gesperrt mit Grund. **zu wenig Geld:** Knopf bleibt tippbar, Toast „Es fehlen 300 €. Sammle Münzen ein oder warte auf Einnahmen.“ Hauptaktion immer in der Aktionsleiste |
| **S4 Bau-Katalog** (A4) | Reiter Heizhaus · Außenanlagen · Leitungen · Häuser · Dorf · Deko (fest unter dem Kopf, waagrecht scrollbar, Ausblendmaske nur bei echtem Überlauf). Raster quer 2 Spalten, Desktop automatisch ab 150 px. **leer:** „Hier gibt es ab Heizzentrale Stufe 2 mehr.“ **voll:** „Heizhaus voll (1/1) – Heizzentrale ausbauen“ |
| **S5 Platzieren / Verschieben / Leitung legen** | HUD bleibt, Rundknöpfe weg, Raster an. Bau-Geist halbtransparent, Bodenraute deutlich gefüllt `vorschau_ok`/`vorschau_nein`, darüber ein wippender Pfeil in `pfeil_ok`/`pfeil_nein`. Modus-Leiste: „Hausanschluss platzieren – tippe auf die Wiese oder zieh das Gebäude“, [Hier bauen] (gesperrt bei Rot, zweite Zeile „Hier ist kein Platz“) und [Abbrechen]. **Leitung:** 8 Farbknöpfe, Zeile mit kW und Preis, [Fertig] |
| **S6 Dörfer in der Nähe** (A17) | Liste nach Dorfwert: Rang, Name, „Dorf von Anna · Heizzentrale 3 · Dorfwert 410“, [Besuchen]. Eigene Zeile „Dein Dorf“ auf `knopf.gewaehlt[0]`. **leer:** „Noch keine Nachbardörfer.“ |
| **S7 Besuch** | Fremdes Dorf, schreibgeschützt. Eigenes HUD, Rundknöpfe und Zoomknöpfe ausgeblendet (Gesten bleiben). Banner: Name, „Dorf von …“, [Gefällt mir] / „Gefällt dir“ (taler), [Nach Hause]. Antippen zeigt nur Name und Beschreibung |
| **S8 Dorf-Einstellungen** | Dorfname (Feld 44 px, 1-px-Linie, Fokus 2 px tinte), Schalter „Weniger Bewegung“, Spielstand löschen (mit Rückfrage), Hinweis **„Alle Wärmenetze und Werte sind fiktiv.“** (A18) |

## 7. Abläufe (Start → Ziel, Rückmeldung nach jedem Schritt)
Unverändert aus Fassung 1:
1. **Neustart → Quellenwahl:** S0 → S1, Karte tippen → Popup schließt, Funken, Toast „… läuft!“ → Kamera auf die Heizzentrale, Rauch steigt, Auftrag 1 erscheint.
2. **Bauen:** [Bauen] → S4 Reiter → Karte tippen (zu teuer: Toast mit Fehlbetrag; Monteure belegt: „Alle Monteure sind beschäftigt – warte oder baue eine Monteurhütte“) → S5 Geist in der freien Fläche → schieben → [Hier bauen] → Federn, Gerüst, Timer → fertig: Funken, Toast „Fertig: …“.
3. **Anschließen:** Haus mit „!“ tippen → Karte „Heizt noch mit Öl. Leg eine Leitung …“ → Aktionsleiste [Leitung legen] → ziehen → Leitung farbig, Fließpunkte, Fenster leuchten bernstein, Öl-Rauch weg. Zu dünn: Abschnitt wechselt rot, Blase „!“, die Karte nennt die passende Dicke.
4. **Einsammeln:** Münzblase tippen → Münzen fliegen zur Geld-Pille, Schwebetext „+120 €“ → Spur füllt sich. Volle Kasse: Toast und „voll“.
5. **Auftrag:** Bedingung erfüllt → Toast „Auftrag geschafft! +10 Dorftaler“, Taler-Pille zählt hoch → nächster Auftrag.
6. **Förderung (A13):** Büro → [Antrag stellen] → Chip „in Prüfung · 2 min“ → Chip „bewilligt“, im Katalog Abzeichen „−40 % Förderung“ → bauen → Toast „Förderung ausgezahlt: +480 €“. Wer vorher baut: „Vorzeitiger Baubeginn – der Förderantrag ist verfallen“.
7. **Besuch:** [Karte] → S6 → [Besuchen] → S7 → [Gefällt mir] → [Nach Hause] → Kamera zurück, eigenes HUD wieder da.

## 8. Texte
Du-Form, kurz, ruhig, keine Platzhalter. **Jede Wärmezahl mit Einheit** (A18): „10 / 60 kW“, „bis 20 kW“, „braucht 8 kW“, „120 €/min“, „14 ct/kWh“. Geld wird abgerundet, nie aufgerundet. Fehlermeldungen sagen, was los ist und was hilft:
- „Hier ist kein Platz – such dir freie Wiese.“
- „Es fehlen 300 €. Sammle Münzen ein oder warte auf Einnahmen.“
- „Kein Platz mehr im Heizhaus – baue erst die Heizzentrale aus.“
- „Angeschlossen, aber eine Leitung auf dem Weg ist zu dünn. Ersetze sie durch eine dickere Leitung.“

## 9. Barrierefreiheit (Pflichtboden)
- **Kontrast** (gemessen, WCAG-Formel): tinte auf Fläche 14,1:1; gedämpfter Text 5,6:1 (auf `pergament_2` 5,1:1); Absatz 9,0:1; Taler-Text 6,7:1; Stufen-Etikett 6,0:1; Weiß auf los 5,2 / heiss 4,7 / taler 7,0 / blau 5,6:1; Chips 6,1–7,3:1; tinte auf Wiese 7,6:1. **Kein Text mit Umriss nötig.**
- **Leitungen:** Die Farben unterscheiden sich durch Ton **und** Breite. Die dünne Kante sorgt für die Abgrenzung zur Wiese.
- **Tippflächen** ≥ 44 px: Pillen, Reiter, Schließen, Preisstufen, Farbknöpfe, Knöpfe in Zeilen, Zoom 48, Rundknöpfe 64/52.
- **Fokus:** 2 px Ring in `ui.fokus` (tinte) mit 2 px Abstand, überall (auf der Wiese 7,6:1; Weiß wäre dort nur 1,9:1). Reihenfolge HUD → Auftrag → Karte → Rundknöpfe. Popups halten den Fokus, Esc schließt. Das Blatt selbst zeigt keinen Fokusring.
- **Tastatur am Desktop:** Pfeiltasten verschieben, +/− zoomen, B öffnet Bauen, Esc bricht ab, Platzieren mit Pfeiltasten und Enter.
- **Beschriftungen:** Jede Pille mit Vorlesetext („Geld 1.199 von 4.000 Euro“). Rundknöpfe beschriftet. Toasts über `aria-live`.
- **Weniger Bewegung:** `bewegung_reduziert` vollständig. Überlast: siehe 13.17.3 (blinkt nie, Dreieck ohne Federn).
- **Farbe nie allein:** kalt = blasse Fenster **und** Schneeflocke; Überlast = gelbes Dreieck **und** Saum, Rohrfarbe bleibt (13.17.3); gewählter Reiter = Bernstein **und** Linie **und** fett; Vorschau = Farbe **und** gesperrter Knopf mit Text.

## 10. Mängel des Prototyps (Fassung 1, Stand)
M1–M9 und M11 wie in `docs/DESIGN_TREUE_F5.md` (erfüllt bzw. dort benannt). **M10 neu:** Schrift Manrope über `@fontsource/manrope` selbst hosten und im Service Worker vorhalten. **M11 neu:** Der Toast ist eine dunkle Kapsel, damit ist kein Textumriss mehr nötig.

## 11. Übergabe an Projektleiter / Bau
- **Reihenfolge:** (1) Tokens und Schrift tauschen, CSS auf Haarlinie/Flachfläche umstellen (Abschnitt 4). (2) Seitenblatt und Aktionsleiste (Abschnitt 5, Mängel 3 und 4). (3) Kartengrafik liest `T.farbe.karte/objekt/leitung/blase/effekt` und `T.karte.licht_faktor/schatten_form` (Mangel 14). (4) Danach Treue-Prüfung bei 844×390 und 1280×800.
- Die Karte und die Katalogbilder (`src/ui/bild.ts`) zeichnen mit denselben Funktionen und Tokens.
- Zustände zum Fotografieren wie in Fassung 1 (Test-Spielstände: neu, Baustelle, Engpass, Kasse voll, gekündigt, Besuch, Offline-Rückkehr).
- **Lastenheft A2** nennt noch „warme Farben, Umrisse, Schatten“. Die neue Richtung hat nur Haarlinien statt Umrissen und weiche Schatten. Ob der Text von A2 angepasst wird, entscheidet Simon bzw. der Projektleiter. Der Designer ändert das Lastenheft nicht.

## 12. Menü-Stil v2 „Spielzeugkiste mit Rohrnaht“ (2026-11-05)
Anlass: Simon: „Die Menüs sind noch recht hässlich … gerne an sowas wie Clash of Clans orientieren.“ Designer, Modus `vorgabe`. Werte: `design/tokens.json` → Gruppe **`menue`** (CSS-Variablen `--menue-…`). Fertige Regeln zum Einsetzen: **`design/menue-v2-referenz.md`** (auf 844×390 fotografiert).

### 12.1 Richtung
**Plastische Spielmenüs wie Spielzeug aus der Kiste:** dicke dunkelbraune Kontur, Knöpfe mit Unterkante, die sich beim Tippen eindrücken, cremefarbene Tafeln mit blauem Kopfband, Titel in dicker Spielschrift mit Kontur. Das passt zum Ladebild (`src/ui/vorspann.ts`: Kontur `#3b1d0a`, Schrift Lilita One, Heat-Orange und net-Blau) und zur Kartengrafik, die schon dunkle Umrisse hat. Menüs und Ladebild sprechen damit eine Sprache.
- **Erkennungsmerkmal: die Rohrnaht.** Unter jedem Kopfband liegt ein 4 px Streifen, links Orange (Vorlauf, „Heat“), rechts Blau (Rücklauf, „ville“ – seit 2026-11-05 heißt das Spiel Heatville, das Farbpaar bleibt), hart in der Mitte geteilt. Das ist das Logo-Paar als Leitung und gibt es so in keinem anderen Spiel.
- **Nur Genre, keine Kopie:** keine fremde Schrift (Lilita One ist frei, OFL, und schon im Projekt), keine Holz- oder Steintexturen, keine Wappen- oder Schildformen, keine Figuren, keine fremden Namen, kein fremdes Layout. Unser Aufbau (Seitenfläche rechts, Anzeigen oben) bleibt.
- **Bewusste Abweichung vom Oberflächen-Standard** (`wissen/oberflaeche.md`: „Bewegung nie verspielt“, eine Schrift, keine Rahmen plus Schatten): Simon wünscht ausdrücklich den verspielten Genre-Look. Lesbarkeit, Kontrast, Tastatur, Fokus und Tippflächen gelten unverändert (12.10). Der Projektleiter trägt das in `docs/ENTSCHEIDUNGEN.md` ein.

### 12.2 Farben (`menue.farbe`, `menue.knopf`, `menue.chip`)
| Rolle | Token | Wert |
|---|---|---|
| Kontur (alle Ränder, Textkontur, Sockel) | `kontur` | `#3b1d0a` |
| Tafel (Seitenfläche, Popup, Dorfschild, Auftrag) | `tafel` | `#fff4df` |
| Kasten innen / Kasten-Kopf / Linie | `tafel_innen` / `kasten_kopf` / `tafel_linie` | `#fffaf0` / `#f6e6c8` / `#e4cfa6` |
| Text / gedämpft | `text` / `text_gedaempft` | `#3b1d0a` / `#6e4e30` |
| Kopfband | `kopfband` | `#2f6fb8` |
| Rohrnaht | `naht_vorlauf` / `naht_ruecklauf` | `#ff8a1f` / `#3a92ea` |
| HUD-Grund / Spur / Text / Mangel | `hud_grund` / `hud_spur` / `hud_text` / `hud_text_mangel` | `rgba(59,29,10,.80)` / `rgba(255,255,255,.22)` / `#fff` / `#ffb4a8` |
| Abdunkeln hinter Popups | `abdunkeln` | `rgba(28,14,4,.55)` |
| Fokus auf hell / auf dunkel | `fokus` / `fokus_auf_dunkel` | `#3b1d0a` / `#ffe08a` |
| Knopf-Flächen [Fläche, Unterkante] | `haupt` `geld` `gefahr` `taler` `info` `neutral` `gewaehlt` `aus` | `#2c8638/#1c5c25` · `#ffc531/#c98a0c` · `#d23a2c/#8f2117` · `#7656d4/#4b3399` · `#2a77c2/#1b4f85` · `#fffaf0/#e4cfa6` · `#ffe08a/#e9bf45` · `#d9d0c1/#b8ad9a` (Rand `#8c7f6d`, Text `#5e5246`) |
| Chips [Grund, Text] | `neutral` `gruen` `rot` `blau` `gold` | `#f6e6c8/#3b1d0a` · `#d3f0c6/#1f5e1a` · `#ffd9d1/#8f2117` · `#d6eaff/#17497f` · `#ffe08a/#3b1d0a` |
| HUD-Symbolkreise | `hud_symbol.*` | Geld `#ffc531`, Wärme `#ff8a1f`, Ruf `#e8504a`, Taler `#7656d4`, Monteure `#2a77c2` |
| Glanzkante oben | `glanz` | `rgba(255,255,255,.35)` (nur als 3-px-Innenkante, nie als Verlauf hinter Text) |

### 12.3 Schrift
- **Lilita One** (`menue.schrift.anzeige`, schon geladen über `vorspann.ts`) **nur** für: Tafel-Titel 22 px (Popup 26), Knopf-Beschriftung 18 px (klein 16), Kasten-Titel 16, Dorfname 18, Stufen-Abzeichen 15, Rundknopf-Etikett 15, Katalog-Kartentitel 16. Laufweite +0,02 em. Umlaute, ß, €, ’ und − sind enthalten (gemessen im Browser).
- **Manrope** für alles andere: Fließtext 13–14 px/500, gedämpft 600, Zeilenwert 15/800, Chip 13/800, Knopf-Zweitzeile 12/800, **HUD-Wert 16/800** (im Querformat bis 900 px Breite 14/800, Treueprüfung 2026-11-05: bei 16 px passen die fünf Anzeigen auf 844 px nicht mehr neben das Dorfschild). Jede Zahl, die sich ändert, in Manrope mit `tabular-nums` (Lilita hat keine gleich breiten Ziffern, die Anzeige würde zappeln).
- Höchstens zwei Schriftgrößen je Kasten (Titel + Text).

### 12.4 Kontur, Schatten, Sockel
- Rand: 3 px `kontur` (`mass_px.kontur`) an Knöpfen, Tafeln, Katalogkarten, Dorfschild, Auftrag. 2 px (`kontur_fein`) an Chips, Balken, HUD, Stufen-Abzeichen. Kästen innerhalb der Tafel nur 2 px `tafel_linie` (sonst wird es unruhig).
- **Textkontur:** `-webkit-text-stroke` mit `paint-order: stroke fill` (die Kontur liegt hinter der Füllung, die Buchstaben werden nicht dünner). Breite: Titel 5 px (sichtbar 2,5), Knopf 4 px, klein 3 px (`schrift.kontur_px`). Dazu `text-shadow: 0 2px 0 kontur` (Titel 3 px). Nur weiße Schrift bekommt Kontur; dunkle Schrift auf Gold/Creme nicht.
- **Sockel (Unterkante):** innen `inset 0 -4px 0 Unterkante` + Glanz `inset 0 3px 0 glanz` + außen `0 3px 0 kontur`. Kein weicher Schatten an Knöpfen. Weicher Schatten nur an schwebenden Tafeln.

### 12.5 Knopfarten (`.knopf` + Variante)
**Regel für die Wahl:** kostenlose Hauptaktion = Haupt (grün) · kostet € = Geld (gold) · kostet Taler = Taler (violett) · nicht umkehrbar = Gefahr (rot) · alles andere = Neutral · Auswahl/Umschalter an = Gewählt.

| Art | Klasse | Fläche / Schrift | Maße | Einsatz |
|---|---|---|---|---|
| **Haupt** | `los` | grün, weiße Schrift mit Kontur | Höhe ≥ 48 (klein 44), Radius 12, Innenabstand 6/14/8, Sockel 4 | Leitung legen, Quelle einbauen, Los geht’s, Vertrag unterschreiben, Nach Hause |
| **Kaufen/Geld** | `geld` (neu; `heiss` bleibt als Alias, bis alle Stellen umgestellt sind) | gold, Schrift `kontur`, Preis in Zeile 2 („1.200 € · 30 s“) | wie Haupt | Ausbauen, Stufe +1, Wegräumen, Bauabschnitt planen, Material bestellen, Expresslieferung, Zurückgewinnen, Baugebiet erschließen, Station kaufen |
| **Taler** | `taler` | violett, weiß mit Kontur | wie Haupt | Sofort fertig, Beschleunigen |
| **Gefahr** | `gefahr` (neu) | rot, weiß mit Kontur | wie Haupt | Ja, löschen; Bestätigung zum Entfernen |
| **Info** | `blau` | blau, weiß mit Kontur | klein 44 | Besuchen, Antrag stellen |
| **Neutral** | (keine) | Creme, Schrift `kontur` | wie Haupt | Verschieben, Entfernen (erster Schritt), Abbrechen, Reiter |
| **Gewählt** | `gewaehlt` | helles Gold, **eingedrückt** (3 px tiefer, kein Sockel) | wie Haupt | Preisstufe, Tempo, Radierer an, T-Stück an. Im Reiter: Kopfband-Blau, weiß mit Kontur, eingedrückt |
| **Deaktiviert** | `:disabled` | Grau `aus`, Rand `aus_rand`, Text `aus_text`, **keine Deckkraft-Absenkung**, kein Druck | wie Haupt | Grund steht immer in Zeile 2 („Erst Heizzentrale Stufe 2“) |
| **Stufenknopf** | `stepper` (neu) | Neutral, Symbol Plus/Minus 22 px | 48×48 | Vorlauftemperatur, Wärmepreis, Grundgebühr |

### 12.6 Tafel (Seitenfläche und Popup)
```
┌─────────────────────────────────────┐ 3 px Kontur, Radius 18 links (Seitenfläche) / rundum (Popup)
│ Einfamilienhaus      (Stufe 1) [ X ]│ Kopfband 56 px, Blau, Titel Lilita 22 weiß mit Kontur
│▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│ Rohrnaht 4 px: links Orange | rechts Blau, darunter 3 px Kontur
│ Text 14/500                          │ Inhalt Creme, Innenabstand 12, scrollt
│ (warm)  (kalt)                       │ Chips
│ Jahresverbrauch ········· 15.000 kWh │ Zeilen 44 px, gepunktete Trennlinie
│ ╭ Wärmerechnung ──────────────────╮  │ Kasten: Mini-Kopfband #f6e6c8, Lilita 16
│ │ Wärmepreis ·········· 12 ct/kWh │  │
│ ╰─────────────────────────────────╯  │
│ [▓▓▓ Leitung legen ▓▓▓] [Verschieben]│ Knöpfe mit Sockel
└─────────────────────────────────────┘
```
- **Seitenfläche:** Breite, Lage und Aufbau wie Abschnitt 5 (min(46 %, 400 px), beginnt bei 64 px). Neu: Tafel-Look, Schatten `-4px 0 0 rgba(59,29,10,.25)` + weicher Schatten.
- **Kopfband:** Höhe ≥ 56 (`kopfband_hoehe`), Innenabstand 6/8/10/16, Glanzkante oben 3 px. Rechts das **Stufen-Abzeichen** (Gold-Kapsel 30 px hoch, 2 px Kontur, Lilita 15) und der **Schließen-Knopf**: 44×44, rotes Quadrat Radius 12, 3 px Kontur, Sockel, weißes X 24 px mit 2 px Schatten. Fokus im Kopfband: weißer Ring (Kontur auf Blau wäre nur 2,99:1).
- **Popup** (Willkommen/Startwahl, Rückfragen): gleiche Tafel, Titel 26 px, außen `0 6px 0 kontur` plus weicher Schatten, Hintergrund `abdunkeln`.
- **Aktionsleiste** (Abschnitt 5) bekommt Fläche `kasten_kopf` und oben 2 px `tafel_linie`.

### 12.7 Kasten, Zeile, Chip, Balken, Reiter, Katalogkarte, Feld, Schalter
- **Kasten:** `tafel_innen`, 2 px `tafel_linie`, Radius 14, unten `0 3px 0 tafel_linie`. `h3` wird ein Mini-Kopfband über die volle Breite (`kasten_kopf`, Lilita 16 in Kontur, Innenabstand 8/12/6).
- **Zeile:** 44 px hoch, Etikett links Manrope 600 `text_gedaempft`, Wert rechts Manrope 800 15 px `kontur`, gleich breite Ziffern. Trennlinie 2 px gepunktet `tafel_linie`.
- **Chip:** 26 px hoch, Kapsel, 2 px Kontur, Manrope 800 13 px, kleiner Sockel `0 2px 0 rgba(59,29,10,.35)`. Varianten neutral/grün/rot/blau/gold. Nur Anzeige, nie tippbar. Wo es passt, ein Symbol 14 px vorn (warm = Flamme, kalt = Schneeflocke).
- **Balken:** 14 px, Kapsel, 2 px Kontur, Spur `balken_spur` `#d9c4a0` mit innerem Schatten oben, Füllung in der Rollenfarbe mit Glanzkante oben (3 px weiß 40 %). Restzeit/Wert als Text daneben, nie im Balken.
- **Reiter:** Leiste auf `kasten_kopf`, Knöpfe neutral klein; aktiver Reiter blau eingedrückt (siehe 12.5).
- **Katalogkarte:** wie ein großer neutraler Knopf (3 px Kontur, Sockel, drückt sich ein). Titel Lilita 16. **Preis als Gold-Chip** mit Münzsymbol; zu teuer = roter Chip. Gesperrt: Bild blass und Schloss-Symbol plus Grund, Karte bleibt tippbar.
- **Feld:** 48 px, weiß, 2 px `feld_rand`, eingelassen (`inset 0 3px 0 rgba(59,29,10,.08)`); Fokus: Rand Kontur plus 3 px Ring `naht_ruecklauf`.
- **Schalter** („Weniger Bewegung“): Checkbox bleibt im HTML (Tastatur, Vorlesen), nur per CSS als Schalter 52×30 in einer 44-px-Zeile: Spur Grau / an Grün, Knopf weiß mit 2 px Kontur. `role="switch"` am Eingabefeld ergänzen.

### 12.8 HUD
- **Anzeigen-Chips:** Kapsel 44 hoch (wie bisher), Grund `hud_grund` (dunkel, 80 %), 2 px Kontur, Sockel `0 3px 0 rgba(59,29,10,.45)`. Symbol als **Kreis 32 px**, der links 18 px herausragt, Fläche in `hud_symbol.*`, 2 px Kontur, Sockel 2 px. Wert Manrope 800 16 px weiß mit `text-shadow 0 2px 0 kontur`. Füllspur 5 px, Spur `hud_spur`. Mangel: Wert in `hud_text_mangel` **und** rote Spur.
- **Dorfschild und Auftragskarte:** Tafel-Look (Creme, 3 px Kontur, Sockel). Dorfname Lilita 18. Zahnrad als gezeichnetes Symbol `zahnrad` statt Zeichen „⚙“. Auftrag: Marker Gold-Kreis mit „!“ in Lilita; Belohnung als violetter Chip „+10“ (24 px, Manrope 800 12).
- **Rundknöpfe:** Bauen grün, Dörfer Creme, 3 px Kontur, Sockel; Etikett Lilita 15 weiß mit 3 px Kontur, ohne Kapsel. **Zoom/kW:** Creme-Quadrat mit Kontur und Sockel, Lilita.
- **Meldung (Toast):** dunkle Kapsel `hud_grund`, 2 px Kontur, Radius 16, weiß Manrope 700 15.

### 12.9 Bewegung
| Was | Wie | Zeit / Kurve |
|---|---|---|
| Druck | Knopf 3 px nach unten, Sockel weg | runter 70 ms, hoch 140 ms `kurve.plopp` (kleines Nachfedern) |
| Seitenfläche öffnen | von rechts 24 px + einblenden | 200 ms `kurve.weich` |
| Popup öffnen | von 90 % auf 100 % + einblenden | 220 ms `kurve.plopp` |
| Schalter | Knopf gleitet, Spur färbt um | 140 ms |
| HUD-Wert steigt (optional) | Wert hüpft kurz auf 115 % | 240 ms |
Nichts blinkt, nichts pulsiert dauerhaft. **Weniger Bewegung** (Systemeinstellung `prefers-reduced-motion` **und** Spiel-Schalter `.weniger-bewegung` am `body`): keine Einblend-Animation, keine Verschiebung beim Druck – stattdessen färbt sich der Knopf in seine Unterkantenfarbe. Regeln stehen fertig in der Referenz-Datei.

### 12.10 Barrierefreiheit (gemessen, WCAG-Formel)
- Weiß auf Haupt 4,59 · Gefahr 4,79 · Taler 5,18 · Info 4,65 · Kopfband 5,14 – also **auch ohne Kontur ≥ 4,5:1**; die Kontur ist Zugabe. Kontur auf Gold 9,72 · auf Gewählt 11,9 · auf Neutral 14,8 · auf Tafel 14,1. Gedämpft auf Tafel 6,9 · auf Kasten-Kopf 6,1. Deaktiviert-Text 4,96. Chips: grün 6,4 · rot 6,7 · blau 7,4 · neutral 12,5 · gold 11,9. HUD-Wert weiß auf `hud_grund` über hellstem Kartengrund ≥ 8,2; Mangel-Text 4,8. Balken-Rand auf Spur 9,0.
- Fokus: 3 px Ring in Kontur (14,1:1 auf Tafel), auf dem dunklen HUD hellgelb (6,4:1), im blauen Kopfband weiß (5,1:1).
- Tippflächen: Knöpfe ≥ 48 (klein 44), Schließen 44, Stufenknopf 48, Reiter 44, Schalter-Zeile 44, HUD 44.
- Nie nur Farbe: Gewählt = eingedrückt **und** Farbe; deaktiviert = grau **und** Grund in Worten; Mangel = Farbe **und** rote Spur; Preis zu teuer = rot **und** Toast mit Fehlbetrag.

### 12.11 Baubeschreibung für den Projektleiter
1. **`design/tokens.json`:** Gruppe `menue` ist angelegt (nichts weiter zu tun). Die alten Gruppen bleiben für die Karte.
2. **`src/ui/stil.css`:** die Abschnitte Knöpfe, Rundbuttons/Zoom (nur Aussehen), HUD (nur Aussehen, Positionen bleiben), Blatt/Popup, Chips/Kasten/Zeile/Balken, Reiter+Katalog, Toast, Eingabe und den Block `.weniger-bewegung` durch die Regeln aus `design/menue-v2-referenz.md` **ersetzen**. Positionen, Breiten und Querformat-Regeln (Abschnitt 5) nicht anfassen. Die alte Regel `.umriss{…}` auf `font-family:var(--menue-schrift-anzeige);font-weight:400` umstellen (Titel und HUD-Werte tragen die Klasse).
3. **`src/ui/blatt.ts`:** die Zeile `titel.style.fontSize = …` entfernen (Inline-Stil überschreibt die Titelgröße). Das leere Stufen-Element wird per CSS ausgeblendet.
4. **`src/ui/bausteine.ts`:** `Variante` um `'geld' | 'gefahr'` erweitern. Bei `geld`/`taler` vor die Zweitzeile ein Symbol (`geld` bzw. `taler`, 14 px) setzen. Neuer Helfer oder Zusatz `stepper` für Plus/Minus-Knöpfe (Klasse `knopf stepper`, Symbol statt Zeichen). In `symbole.ts` `plus`, `minus`, `schloss` ergänzen (gleicher Linienstil wie die vorhandenen).
5. **Varianten umstellen** (Regel 12.5): `kontext.ts:106` Ausbauen → `geld` · `kontext.ts:280` Stufe +1 → `geld` · `kontext.ts:77` Wegräumen → `geld` · `kontext.ts:132` Zurückgewinnen → `geld` · `kontext.ts:197` empfohlene Station → `geld` · `kontext.ts:301` Baugebiet erschließen → `geld` · `kontext.ts:288/324/331` Minus/Plus → `stepper` · `katalog.ts:56/69/77` Planen, Material, Express → `geld` · `katalog.ts:78` Sofort fertig (kostet Taler!) → `taler` · `einstellungen.ts:38` Ja, löschen → `gefahr` · `steuerung.ts:151/152` Radierer an / T-Stück an → `gewaehlt`. `kontext.ts:279` „Heizzentrale ausbauen“ (bisher grauer Text, sieht aus wie ein Knopf ohne Rahmen) → deaktivierter Knopf `Stufe N+1` mit Zweitzeile „Erst Heizzentrale ausbauen“.
6. **`src/ui/hud.ts`:** Zeichen „⚙“ durch `symbol('zahnrad')` ersetzen.
7. **`src/ui/einstellungen.ts`:** am Häkchen „Weniger Bewegung“ `role: 'switch'` ergänzen.
8. **`src/ui/katalog.ts`:** Preis-Element als Chip mit Münzsymbol; gesperrte Karte mit Schloss-Symbol.
9. Danach Fotos nach 12.13 und Treue-Prüfung durch den Designer.

### 12.12 Vorher-Bewertung (Fotos 2026-11-05, 844×390)
| Bildschirm | Größte Schwächen |
|---|---|
| **HUD oben** | Weiße Kapseln verschwinden fast auf der hellen Wiese; Werte dünn und klein; Symbolkreise alle weiß, nicht nach Bedeutung gefärbt; Zahnrad ist ein Schriftzeichen. Wirkt wie eine Web-App, nicht wie ein Spiel. |
| **Hauskarte** | Kopf ist eine weiße Leiste ohne Gewicht; „Stufe 1“ nur orange Schrift; Schließen-Knopf grau und unauffällig; lange Zeilenliste ohne Gliederung, Kästen kaum vom Grund zu unterscheiden. Die Meldung „Viel Erfolg …“ liegt **über** der Seitenfläche und verdeckt eine Zeile (siehe Hinweis unten). |
| **Heizzentralen-Karte** | „Heizzentrale ausbauen“ ist grauer Text in Knopfposition – man weiß nicht, ob man tippen kann; Plus/Minus sind leere weiße Kästen mit winzigem Zeichen; Quellenname bricht unschön um („Stufe / 1“). Einziger farbiger Knopf ist grün, egal ob er Geld kostet. |
| **Baumenü** | Reiter sehen aus wie normale Knöpfe, der aktive nur hellorange getönt; letzter Reiter abgeschnitten ohne Hinweis; Katalogkarten flach, Preis nicht hervorgehoben; Bauabschnitt-Knopf (kostet 2.000 €) sieht genauso aus wie kostenlose Aktionen. |
| **Einstellungen** | Standard-Browser-Häkchen statt Schalter; Felder und Beschriftungen wie ein Webformular; das Heatnet-Logo ist das einzig Spielhafte. |
| **Namensfenster beim Start** | Erster Eindruck nach dem bunten Ladebild fällt ab: weißes Formular mit dünner Titelzeile, harter schwarzer Außenrand ohne Bezug zum Rest; der Knopf „Los geht’s“ ist flach. |

### 12.13 Abnahme mit Fotos (844×390, Playwright, Gerätefaktor 2)
Fotos: HUD oben · Hauskarte (oben und ganz unten gescrollt) · Heizzentralen-Karte · Baumenü (Reiter „Leitungen“) · Einstellungen · Namensfenster beim Start · ein Knopf gedrückt (Maus unten halten) · „Weniger Bewegung“ an.
1. Jede Tafel hat das blaue Kopfband mit Titel in Lilita One weiß mit Kontur und darunter die Rohrnaht Orange|Blau.
2. Schließen-Knopf rot, 44×44, mit Kontur und Sockel; Stufen-Abzeichen als Gold-Kapsel (nur wenn es eine Stufe gibt).
3. Jeder Knopf hat 3 px Kontur und sichtbare Unterkante; gedrückt sitzt er 3 px tiefer ohne Unterkante.
4. Knopffarbe folgt der Regel 12.5: Ausbauen, Stufe +1, Bauabschnitt planen = Gold mit Preis; Sofort fertig = Violett; Ja, löschen = Rot; Radierer an = Gewählt.
5. Deaktivierte Knöpfe grau mit Grund in Zeile 2, nicht durchscheinend; kein grauer Text mehr an Knopfstelle.
6. Plus/Minus sind 48×48 mit gezeichnetem Symbol.
7. Kästen haben ein Mini-Kopfband; Zeilen zeigen Etikett gedämpft links, Wert fett rechts, Ziffern bündig.
8. HUD: dunkle Kapseln, farbige Symbolkreise mit Kontur, weiße fette Werte; alle fünf Anzeigen auf 844 px in einer Reihe, nichts überlappt das Dorfschild.
9. Aktiver Reiter blau und eingedrückt; Preis in der Katalogkarte als Gold-Chip.
10. „Weniger Bewegung“ ist ein Schalter; mit „an“ gibt es kein Hereinfahren und keine Druckbewegung (Foto direkt nach dem Öffnen zeigt die Tafel ohne Versatz).
11. Fokus mit Tab sichtbar: auf Tafel braun, im Kopfband weiß, im HUD hellgelb.
12. Kein Text abgeschnitten, keine waagrechte Scrollleiste, Tippflächen ≥ 44 px (per Skript gemessen: `getBoundingClientRect` aller `button` in der Tafel).
13. Keine Farbe, Größe oder Zeit steht direkt in `stil.css` außer den in der Referenz-Datei genannten Schatten-Deckkräften; der Test „A2 – Design-Variablen“ bleibt grün.

### 12.14 Entscheidungen aus der Treueprüfung A84 (2026-11-05)
- Plus/Minus: Symbol einfarbig dunkel (keine helle Füllung auf Creme), Strichstärke 3,5 im 24er-Raster.
- HUD-Wert 14 px im Querformat angenommen (siehe 12.3).
- Fokusrahmen angenommen; Ausnahme: die Tafel selbst bekommt beim Öffnen keinen Rahmen, nur ihre Bedienelemente.
- Gold für alles, was Euro kostet, angenommen (Regel 12.5). Münzsymbol in Zeile 2 nur, wenn dort ein Preis steht – nicht vor einem Grund.
- Gesperrte Ausbau-Stufe ist überall ein deaktivierter Knopf mit Grund in Zeile 2 (auch in der Hauskarte), nie grauer Text.
- Sprechblase und Banner ziehen im nächsten Abschnitt auf den Tafel-Look nach: Creme `tafel`, 2 px `kontur`, Sockel `0 3px 0 kontur`, Radius 14 (Ecke zum Sprecher 4), Name in Lilita 15 `kontur`, Text Manrope 600 14 `text`.
- Update-Hinweis darf nie über einer offenen Tafel liegen: bei Seitenfläche links daneben, bei Popup ausgeblendet bis zum Schließen.
- Popups mittig (Abschnitt 5), nicht rechtsbündig.

### 12.15 Entscheidungen aus der Treueprüfung A88 P2 (2026-11-05)
- In Listen mit vielen gesperrten Zeilen (z. B. Büro/Förderquellen) Chip statt Knopf: rechts in der Zeile ein neutraler Chip „Schloss · ab Stufe X“ (26 px, nicht tippbar); nur freie Einträge behalten den Knopf. Sortierung: frei zuerst, dann nach Stufe. Ergänzt 12.5 (dort weiter: einzelne gesperrte Aktion = grauer Knopf mit Grund in Zeile 2).
- In engen Leisten (Zeichenleiste) kurzer Grund „ab Stufe X“.
- Gesperrte Hinweiszeilen einheitlich gedämpft mit Schloss 14 px davor, 8 px Abstand nach oben.
- Grund auf Katalogkarten in `menue.farbe.text`.

### 12.16 Baumenü-Reiter: eine Reihe, Symbol + Wort, nie scrollen (Produktprüfung NR16, 2026-11-05)
Anlass: Bei 844×390 liegen „Dorf“ und „Deko“ außerhalb der Leiste, bei 667×375 ist schon „Leitungen“ abgeschnitten (Fotos 04-bauen, 24-reiter-Dorf, 51-667-bauen). Auf Foto 24-reiter-Dorf ist sogar der **aktive** Reiter nicht zu sehen. Neue Spieler finden Büro und Deko nicht. **Ersetzt** in Abschnitt 6 (S4) „waagrecht scrollbar, Ausblendmaske“ und in 12.7 den Punkt „Reiter“.

**Entscheidung: alle fünf Reiter immer in einer Reihe, jeder mit Symbol oben und Wort darunter. Die Leiste scrollt nie.**
Warum nicht die anderen Wege:
- *Zwei Reihen* kosten rund 56 px Höhe. Im Querformat ist die Höhe das Knappste (390 px, davon 63 px Kopfband). Dann passt nur noch eine Reihe Katalogkarten ins Bild.
- *Reiter senkrecht links im Blatt* kosten rund 60 px Breite. Das Blatt ist bei 667 nur 306 px breit; der Katalog mit 2 Spalten würde zu eng (Karten unter 110 px).
- *Nur schmalere Schrift* reicht nicht: „Außenanlagen“ allein braucht 86 px Text.
- *Symbol + Wort* bleibt so hoch wie heute (64 px Leiste), alle fünf sind sofort sichtbar, und das Symbol hilft beim Wiederfinden.

**Gemessen** (Chrome, echte Schriften, Manrope 800 12 px): Heizhaus 54,9 · Außen 38,3 · Netz 27,8 · Dorf 25,6 · Deko 29,9 · Leitungen 60,2 · Außenanlagen 85,8 px.

```
667×375, Blatt 306 px, Leiste innen 287 px (kurze Wörter):
┌───────────────────────────────────────┐
│ Bauen                           [ X ] │ Kopfband 56
│▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│ Rohrnaht
│ ┌────────┐┌──────┐┌─────┐┌────┐┌────┐ │ Leiste 64 (Innenabstand 6 oben/unten, 8 seitlich)
│ │ Flamme ││Sonne ││Rohr ││Haus││Baum│ │ Reiter 52 hoch, Symbol 20
│ │Heizhaus││Außen ││Netz ││Dorf││Deko│ │ Wort Manrope 800 12
│ └────────┘└──────┘└═════┘└────┘└────┘ │ aktiver Reiter blau, eingedrückt
│  Katalog (2 Spalten) …                │
```
844×390 (Blatt 388 px, Leiste innen 369 px): gleiche Leiste, aber mit den **langen Wörtern** Heizhaus · Außenanlagen · Leitungen · Dorf · Deko (Summe gemessen 355 px ≤ 369).

| Teil | Vorgabe | Token |
|---|---|---|
| Leiste | eine Reihe, `display:flex`, **kein** `overflow-x`, **keine** Ausblendmaske. Fläche `kasten_kopf`, unten 2 px `tafel_linie`, Innenabstand 6 oben/unten, 8 seitlich | `menue.mass_px.reiter_leiste_innen` |
| Reiter | Kleiner neutraler Knopf (3 px Kontur, Sockel), **Höhe 52**, Mindestbreite 48, `flex: 1 1 auto` (Breite nach Wort, der Rest wird verteilt), Innenabstand seitlich 4, Lücke 4 | `reiter_hoehe`, `reiter_min_breite`, `reiter_innen_seite`, `reiter_luecke` |
| Inhalt Reiter | Symbol 20 px oben mittig, 2 px darunter das Wort, Manrope 800 12, Farbe `kontur`, eine Zeile, kein Umbruch | `reiter_symbol`, `schrift.groesse_px.reiter` |
| Symbole | Heizhaus = `waerme` (Flamme, vorhanden) · Außenanlagen = **`sonne`** (neu) · Leitungen = **`rohr`** (neu, orange über blau wie die Rohrnaht) · Dorf = `haus` (vorhanden) · Deko = **`baum`** (neu). Vorlage zum Abzeichnen: `design/reiter-symbole.svg` | – |
| Wort-Stufen | Leiste innen ≥ 356 px: lange Wörter. 281–355 px: kurze Wörter **Heizhaus · Außen · Netz · Dorf · Deko**. Unter 281 px (z. B. 568 px breite Geräte): nur Symbol, 48 breit. Umschalten per Container-Abfrage auf der Leiste (beide Wörter im HTML, eins ausgeblendet) | `reiter_lang_ab`, `reiter_nur_symbol_unter` |
| Beschriftung für Vorleser | `aria-label` immer der volle Name („Außenanlagen“, „Leitungen“), `role="tab"`, `aria-selected` | – |

**Zustände:**
- *normal:* Creme, Sockel. *gedrückt:* 3 px tiefer, ohne Sockel (12.9).
- *aktiv:* Kopfband-Blau, Wort weiß mit 3 px Kontur, eingedrückt (wie 12.5 „Gewählt“ im Reiter). Das Symbol bleibt farbig.
- *Fokus:* 3 px Ring in `kontur`, auf dem aktiven blauen Reiter weiß.
- *Reiter ohne Inhalt in dieser Stufe:* bleibt tippbar, Inhalt zeigt den Leer-Text aus S4 („Hier gibt es ab Heizzentrale Stufe 2 mehr.“).
- *Weniger Bewegung:* kein Eindrücken, Farbe wechselt (12.9).

**Prüfkriterium (Foto):** 844×390 und 667×375, Baumenü offen, je einmal Reiter „Heizhaus“ und „Deko“ aktiv. Alle fünf Reiter vollständig sichtbar, kein Wort abgeschnitten, keine Ausblendmaske, aktiver Reiter blau. Per Skript: jeder Reiter `getBoundingClientRect()` liegt ganz innerhalb der Leiste, Höhe ≥ 44, Breite ≥ 44; `scrollWidth === clientWidth` an der Leiste.

### 12.17 Meldung (Toast): nie über einem offenen Blatt (Produktprüfung NR16, 2026-11-05)
Anlass: Die Meldung steht mittig auf 30 % Höhe über dem ganzen Bildschirm und deckt Blattinhalt ab („Viel Erfolg, Tester! …“ über den Einstellungs-Feldern, Foto 20-einstellungen; „Hausanschluss geplant …“ über dem Haus-Text, Foto 13). Abschnitt 4 verlangte schon „bei offenem Seitenblatt über der freien Kartenfläche“, das ist aber nicht gebaut. **Ersetzt** Lage und Dauer in Abschnitt 4 (Zeile „Toast“). Das Aussehen bleibt wie 12.8 (dunkle Kapsel `hud_grund`, 2 px Kontur, Radius 16, Manrope 700 15, weiß).

**Lage – Grundregel: unten mittig in der freien Kartenfläche.**
| Lage | Wo steht die Meldung? |
|---|---|
| Kein Blatt offen | unten mittig auf dem Bildschirm, 12 px über dem unteren Rand (plus Sicherheitsabstand des Geräts). Breite höchstens min(420 px, Bildschirmbreite − 176 px), damit Bauen-Knopf und Zoom frei bleiben |
| Seitenblatt oder Zeichenleiste offen | unten mittig in der **freien Fläche links vom Blatt**. Freie Breite = Bildschirmbreite − tatsächliche Blattbreite (aus dem Blatt-Rechteck lesen, nicht nachrechnen). Breite höchstens min(420 px, freie Breite − 24 px). Die Meldung berührt das Blatt nie |
| Popup offen (Willkommen, Rückfrage) | oben mittig, 8 px unter dem oberen Rand, über dem Abdunkeln. Sie liegt dann auf dem Kopfband des Popups (nur Titel), nie auf Text oder Knöpfen |
| Unten steht schon etwas (Sprecher-Karte, Besuchs-Banner, Update-Hinweis) | Die Meldung rückt 8 px **über** das oberste dieser Elemente, in derselben freien Fläche |

Lange Texte brechen in der Kapsel um (höchstens 3 Zeilen). Gemessen: „Hausanschluss geplant: 1 Felder, 25er-Leitung“ = 334 px, passt bei 844 einzeilig in die freie Fläche (456 − 24 = 432 px), bei 667 zweizeilig.

**Dauer:** sichtbar = 1000 ms + 60 ms je Zeichen, mindestens 2000 ms, höchstens 6000 ms (Lesetempo rund 15 Zeichen pro Sekunde). Beispiele: „Tempo: Normal“ 2,0 s · „Hausanschluss geplant …“ (46 Zeichen) 3,8 s · Hinweis zum gesperrten T-Stück (rund 110 Zeichen) 6,0 s. Die bisherige Regel „2 s, lang + 1,2 s“ entfällt.

**Verhalten:**
- Es gibt höchstens **eine** Meldung. Eine neue ersetzt die alte sofort; derselbe Text erneut startet nur die Zeit neu (kein Stapeln, kein Flackern).
- Die Meldung fängt keine Berührungen ab (`pointer-events: none`): Zeichnen und Verschieben der Karte gehen unter ihr weiter.
- Öffnet oder schließt sich ein Blatt, während eine Meldung steht, gleitet sie in 200 ms in die neue Lage (`kurve.weich`).
- Einblenden: von 8 px tiefer nach oben + Einblenden, 200 ms. Ausblenden: nur Blende 200 ms.
- *Weniger Bewegung:* nur Blende, kein Versatz, kein Gleiten (springt in die neue Lage).
- Vorleser: weiter `role="status"`, `aria-live="polite"`.

Tokens: `menue.mass_px.toast_max_breite` 420, `toast_rand` 12, `toast_stapel_luecke` 8, `toast_versatz_ein` 8; `menue.zeit_ms.toast_grund` 1000, `toast_je_zeichen` 60, `toast_min` 2000, `toast_max` 6000, `toast_blende` 200, `toast_wandern` 200.

**Prüfkriterium (Foto):** 844×390 und 667×375, je ein Foto mit Meldung bei (a) offenem Haus-Blatt direkt nach „Hausanschluss ziehen“, (b) offenen Einstellungen direkt nach dem Start („Viel Erfolg …“), (c) ohne Blatt, (d) offener Zeichenleiste. Per Skript: Rechteck der Meldung und Rechteck des Blatts überschneiden sich nicht (`toast.right ≤ blatt.left`); Meldung liegt nicht über dem Bauen-Knopf. Zeitmessung: Meldung mit 46 Zeichen ist nach 3,5 s noch da und nach 4,2 s weg.

### 12.18 Zeichenleiste: schmal, alles ohne Scrollen sichtbar (Produktprüfung NR16, 2026-11-05)
Anlass: Im Zeichenmodus ist die Leiste so breit wie ein normales Blatt (388 px bei 844, Foto 43-gezeichnet); die Karte zum Zeichnen ist nur rund 450 px breit. Der lange Erklärtext oben schiebt „Letzte zurück“ unten aus dem Bild. **Ersetzt** für den Zeichenmodus die Blattbreite aus Abschnitt 5 (die anderen Blätter bleiben bei min(46 %, 400 px)).

**Entscheidung:** eigene **Zeichenleiste 216 px breit**, volle Höhe rechts. Die Karte wird damit 628 px (844) bzw. 451 px (667) breit statt 456 bzw. 361 px. Der Erklärtext wandert hinter einen „?“-Knopf; die Bedienelemente stehen fest und brauchen kein Scrollen.

```
844×390 (667×375 gleich, nur die Karte ist schmaler)
┌──────────────────────────────────────────────────┬──────────────────────────┐
│(Dorfschild)        (Geld)                        │ Zeichnen        [?] [ X ]│ Kopfband 48, Titel Lilita 20
│(Auftrag)                                         │▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│ Rohrnaht 4 + Kontur 3
│                                                  │ [25][32][40][Schl.]      │ Farbknöpfe 44×44, Lücke 6, 4 je Reihe
│            K A R T E  (628 px)                   │ [..][..][..][..]         │ 2. Reihe nur, wenn > 4 Knöpfe
│                                                  │ bis 12 kW · 10 €/Feld    │ Kennzeile Manrope 600 12, gedämpft
│                                                  │ [Radierer] [↶ Zurück]    │ 2 Spalten, je 94 breit, Höhe 44
│                                                  │ [ T-Stück mit Vorsehung ]│ volle Breite, 2 Zeilen, Höhe 52
│                                                  │ [ Schloss ab Stufe 4 ]   │ (Stand 12.20: kurzer Grund)
│          (Meldung unten mittig)                  ├──────────────────────────┤
│                                                  │ [Abschnitt abschließen]  │ Aktionsleiste fest, Knopf 48
└──────────────────────────────────────────────────┴──────────────────────────┘
```

**Maße** (Leiste innen 216 − 3 Kontur − 2×8 = 197 px; Breiten mit echten Schriften gemessen):
| Teil | Vorgabe | gemessen / passt |
|---|---|---|
| Leiste | rechts, volle Höhe, Breite 216, Tafel-Look wie 12.6 (3 px Kontur links/oben/unten, Radius 18 links) | `zeichenleiste_breite` |
| Kopfband (kompakt) | Höhe 48 statt 56 (Ausnahme nur hier). Titel **„Zeichnen“** Lilita 20 weiß mit Kontur. Rechts [?] (neutral, 44×44, Fragezeichen-Symbol) und [X] (rot, 44×44) | Titel 76,7 px + 2×44 + Lücken → 201 ≤ 213 |
| Farbknöpfe (Durchmesser) | 44×44, Lücke 6, 4 je Reihe. Zahl „25“ Lilita 16 in `kontur`, unten ein 6 px Streifen in `leitung.dNN`. Gewählt: eingedrückt, Fläche `gewaehlt`. Gesperrte dickere Leitungen: **ein** grauer Knopf mit Schloss 14 px und „St. 2“ (Manrope 800 11), Vorleser-Text „Dickere Leitungen ab Heizzentrale Stufe 2“, Tippen zeigt Hinweis nach 12.19 | 4×44 + 3×6 = 194 ≤ 197 |
| Kennzeile | eine Zeile Manrope 600 12 `text_gedaempft`: Werte der gewählten Leitung („bis 12 kW · 10 €/Feld“, Zahlen aus dem Katalog). Im Radierer-Modus: „Leitung antippen = löschen“. Im T-Stück-Modus: „Geplante Leitung antippen“ | 111 / 157 / 152 px ≤ 197 |
| Radierer · Zurück | 2 Spalten, Höhe 44, Schrift Lilita 16, Innenabstand seitlich 8. Radierer an = `gewaehlt` (Wort bleibt „Radierer“, die Kennzeile erklärt). „Zurück“ mit Pfeil-Symbol 18 px davor, Vorleser-Text „Letzte Leitung zurück“ | Radierer 59 + 22 = 81 ≤ 94 · Zurück 48 + 22 + 22 = 92 ≤ 94 |
| T-Stück | volle Breite, Höhe 52, zwei Zeilen: „T-Stück mit Vorsehung“ (Lilita 16) und darunter Preis mit Münze oder Sperrgrund mit Schloss (Manrope 800 12). An = `gewaehlt`, Kennzeile wechselt | 157 + 22 = 179 ≤ 197; Grund „ab Stufe 4“ (geschütztes Leerzeichen vor der Zahl, Kann 2b / ENTSCHEIDUNGEN 2026-11-05) rund 70 + 18 ≤ 197 |
| Aktionsleiste | fest unten, 2 px Linie oben, Innenabstand 6/8, ein Knopf **„Abschnitt abschließen“** (`los`, Höhe 48, Schrift 16 statt 18) über die volle Breite | 151 + 34 = 185 ≤ 197 (bei 18 px wären es 204, zu breit) |
| Erklärtext | der heutige Absatz („Zieh die Leitung mit dem Finger …“) steht **nicht** mehr fest in der Leiste. [?] tauscht den Mittelteil (Farbknöpfe bis T-Stück) gegen den Text (Manrope 500 14, scrollt) und einen Knopf [Verstanden] (neutral). Kopf und Aktionsleiste bleiben | – |

**Höhe** (2 Reihen Farbknöpfe, schlechtester Fall): 3 + 48 + 4 + 3 + 8 + 94 + 4 + 16 + 8 + 44 + 8 + 52 + 8 + 62 + 3 = **365 px**. Passt in 375 (667×375) und mit 21 px unterem Gerätespielraum in 390 (= 386). Mit einer Reihe Farbknöpfe (heute Stufe 1) 315 px. Wird es doch zu eng (kleinere Geräte), scrollt nur der Mittelteil, Kopf und Aktionsleiste bleiben fest – kein Knopf wird angeschnitten.

**Zustände:**
- *Erste Nutzung* (erstes Öffnen je Spielstand): Mittelteil zeigt den Erklärtext mit [Verstanden]; die Karte ist trotzdem schon bedienbar.
- *Normal:* wie Skizze. *Radierer an* / *T-Stück an:* Knopf `gewaehlt`, Kennzeile mit Handlungssatz.
- *Nichts gezeichnet:* „Zurück“ gesperrt-grau nach 12.19, Tippen → „Noch nichts gezeichnet.“
- *Kein offener Bauabschnitt:* Die Leiste öffnet sich gar nicht; „Leitung selbst legen“ ist vorher gesperrt nach 12.19 (Grund „braucht offenen Bauabschnitt“, Hinweis „Erst mit Philipp einen Bauabschnitt planen: Bauen → Leitungen.“). Inhaltliche Umsetzung entscheidet der Projektleiter (Prüfbericht Punkt a).
- *Fehler beim Abschließen:* Meldung nach 12.17 in der freien Fläche, Leiste bleibt offen. *(Mit 0 Leitungen jetzt gesperrt, siehe 12.21 Punkt 1.)*
- *Kamera:* Der Abschnitt liegt in der Mitte der freien Fläche (Bildschirm − 216 px), nicht mehr mit festen 46 % rechnen (`steuerung.ts` nutzt heute `0.46` und `400`). *(Genaue, prüfbare Regel: 12.21 Punkt 4.)*
- *Weniger Bewegung:* wie 12.9.

Tokens: `menue.mass_px.zeichenleiste_breite` 216, `zeichenleiste_kopf` 48, `farbknopf` 44, `farbknopf_luecke` 6, `farbknopf_streifen` 6, `zeichen_knopf_innen_seite` 8, `schloss_klein` 14; `menue.schrift.groesse_px.zeichen_titel` 20, `farbknopf` 16, `farbknopf_sperre` 11. Neue Symbole in `symbole.ts` (gleicher Linienstil): `frage` (Fragezeichen im Kreis) und `zurueck` (Bogenpfeil nach links).

*Kann (nicht Teil dieses Auftrags):* Platzieren/Verschieben nutzen heute ebenfalls ein volles Blatt. Dieselbe 216-px-Leiste (Kopf, Kennzeile, Aktionsleiste mit [Hier bauen] über [Abbrechen]) würde dort auch Kartenfläche schaffen.

**Prüfkriterium (Foto):** 844×390 und 667×375: Zeichenmodus frisch geöffnet (Erste Nutzung), nach dem Zeichnen (Foto 43 nachstellen), Radierer an, Hilfe offen. Alle Knöpfe vollständig sichtbar, „Zurück“ und „Abschnitt abschließen“ ganz im Bild, kein Scrollbalken. Per Skript: Breite der Leiste = 216; jedes `button`-Rechteck liegt ganz im Bildschirm (`bottom ≤ innerHeight`) und ist ≥ 44×44; Kartenfläche links ≥ 620 px (844) bzw. ≥ 450 px (667).

### 12.19 Gesperrter Knopf mit Hinweis beim Antippen (Produktprüfung NR16, 2026-11-05)
Anlass: „T-Stück mit Vorsehung“ ist grau, Antippen tut nichts (Foto 40, 43). Spieler denken, sie kämen nicht weiter. **Ergänzt** 12.5 „Deaktiviert“: Das Aussehen bleibt, neu ist die Antwort beim Antippen. Gilt für **jeden** gesperrten Knopf (T-Stück, dickere Leitungen, Stufe +1, Leitung selbst legen ohne Abschnitt, Zurück ohne Zeichnung).

**Aussehen** (wie 12.5, ergänzt):
- Fläche `knopf.aus`, Rand `aus_rand`, Text `aus_text`, Sockel bleibt sichtbar (der Knopf wirkt antippbar, nicht durchsichtig), keine Deckkraft-Absenkung.
- Zeile 1: Name wie im freien Zustand. Zeile 2: **Schloss-Symbol 14 px** (`schloss`, vorhanden) + 4 px + kurzer Grund (Manrope 800 12): im Seitenblatt „ab Heizzentrale Stufe 4“, in engen Leisten (Zeichenleiste) „ab Stufe 4“ mit geschütztem Leerzeichen vor der Zahl (12.15, 12.20). In sehr kleinen Knöpfen (Farbknopf 44×44) Schloss über „St. 2“ (11 px).
- Gleiche Größe wie der freie Knopf, Tippfläche ≥ 44.

**Antippen** (Maus, Finger, Enter, Leertaste):
1. Der Knopf drückt sich **nicht** ein. Stattdessen wackelt er waagrecht ±3 px, zwei Mal, 240 ms – das Zeichen für „geht gerade nicht“.
2. Gleichzeitig erscheint eine Meldung nach 12.17 mit **Grund + was man tun kann**. Für das T-Stück (Textvorschlag aus der Produktprüfung; ob die Aussage fachlich so stimmt, prüft der Projektleiter bzw. Fachprüfer):
   *Überholt durch den fachgeprüften Text in `docs/ENTSCHEIDUNGEN.md` (2026-11-05, T-Stück-Hinweistext); Kürzungsvorschlag siehe 12.20.* Alle übrigen Hinweistexte stehen vollständig in **12.20**.
3. Mehrmaliges Tippen: dieselbe Meldung startet nur die Zeit neu (12.17), kein Stapeln.
- *Weniger Bewegung:* kein Wackeln, nur die Meldung.
- *Technik-Hinweis:* **nicht** das HTML-Attribut `disabled` verwenden (dann kommt kein Tippen an und Tastatur-Nutzer erreichen den Knopf nicht), sondern `aria-disabled="true"` plus Klasse für das Aussehen; der Klick führt die Aktion nicht aus, sondern zeigt den Hinweis. Kein zusätzliches `aria-describedby` – der Grund steht in Zeile 2 und ist damit Teil des Knopfnamens (Begründung 12.20). Fokus bleibt sichtbar (12.10).

Tokens: `menue.mass_px.schloss_klein` 14, `wackeln_weg` 3; `menue.zeit_ms.wackeln` 240.

**Prüfkriterium (Foto):** 844×390, Zeichenleiste in Stufe 1: Foto des grauen T-Stück-Knopfs (Schloss + „ab Stufe 4“ in Zeile 2, geschütztes Leerzeichen – „4“ steht nie allein in einer Zeile) und Foto direkt nach dem Antippen (Meldung in der freien Kartenfläche, nicht über der Leiste). Per Skript: Knopf hat `aria-disabled="true"` und kein `disabled`; nach `click()` erscheint `#toast` mit dem Grund; Tab erreicht den Knopf, Enter zeigt dieselbe Meldung.

### 12.20 Sperrgründe und Hinweise für alle gesperrten Knöpfe (Vorgabe NR16-B2, 2026-11-05)
Anlass: Seit NR16-B1 wackeln alle gesperrten Knöpfe, aber nur T-Stück, „Dickere“, Stufe +1 im Heizhaus und die Bauabschnitt-Knöpfe sagen auch, warum. Alle anderen wackeln stumm – für Spieler sieht das aus wie „kaputt“. **Ergänzt** 12.19; dort stehen Aussehen und Verhalten, hier stehen die Texte. Grundlage: Suche nach `aus:` (alle Stellen, auch `aus: <Bedingung>`), `sperren(` und `stepper(` in `src/`, Stand d214666.

**Regeln**
1. **Zeile 2 = Grund**, klein geschrieben wie die vorhandenen („ab …“, „braucht …“). Seitenblatt: höchstens 28 Zeichen. Enge Stellen (Zeichenleiste, zwei Knöpfe nebeneinander, Knopf rechts in einer Zeile): höchstens 18 Zeichen, sonst die Kurzform aus der Tabelle. Umbruch nur an Wortgrenzen, höchstens 2 Zeilen; Zahl und Wort davor mit geschütztem Leerzeichen verbinden (`\u00a0`, z. B. „Stufe 4“, „noch 3“). Ausnahme (12.23): Bei zwei Knöpfen nebeneinander darf eine Zeile 2 mit Preis bis 28 Zeichen haben, wenn sie genau vor dem Preis zweizeilig umbricht.
2. **Schloss ja** = die Sperre fällt erst durch Fortschritt (Stufe der Heizzentrale, Bauabschnitt, Bedingungen, Ziele). **Schloss nein** = vorübergehend oder schon erledigt (Geld, Taler, Helfer beschäftigt, Bau läuft, schon geplant, schon gemocht, Rand eines Reglers, nichts gezeichnet). So bedeutet das Schloss überall dasselbe: „Hier musst du erst etwas anderes schaffen.“
3. **Hinweis (Meldung beim Antippen)** = was los ist + was man tun kann, Du-Form, höchstens 90 Zeichen. Das sind nach 12.17 höchstens 6 s Anzeige und höchstens 3 Zeilen auch bei 667×375 mit offenem Seitenblatt (freie Breite 667 − 306 = 361 px, Meldung 337 px, rund 42 Zeichen je Zeile). `{…}` = Wert aus dem Spiel, zum Zeitpunkt des **Antippens** berechnet (Geld und Restzeiten ändern sich, während das Blatt offen ist).
4. **Mehrere Gründe zugleich:** Es zählt nur der oberste nach dieser Reihenfolge – Stufe › Bauabschnitt › Bedingung/Ziel › beschäftigt/Bau läuft › Geld/Taler. Zeile 2 und Hinweis nennen **denselben** Grund. (Beispiel Puffer auf Stufe 1 ohne Geld: „ab Heizzentrale Stufe 3“, nicht der Fehlbetrag.) Fällt der erste Grund bis zum Antippen weg, zählt der nächste noch geltende (12.21 Punkt 3).
5. **Geld- und Taler-Regel (für jeden Knopf mit Preis):** Fehlt nur Geld, bleibt in Zeile 2 der **Preis** stehen (mit Münze bzw. Taler, in `aus_text`), kein Schloss – der Spieler sieht so, wie viel er braucht. Hinweis: **„Dir fehlen noch {Fehlbetrag}. Am Monatsende zahlen deine Kunden ihre Wärmerechnung.“** Fehlbetrag = Preis − Geld, auf ganze Euro **aufgerundet** (die Geldanzeige rundet ab; aufrunden heißt: mit diesem Betrag reicht es sicher), mit Tausenderpunkt und €. Taler: **„Dir fehlen noch {n} Dorftaler. Du bekommst sie für Aufträge und beim Wegräumen.“** Derselbe Wortlaut gilt auch für die Katalogkarte (`katalog.ts` ~131, heute „Es fehlen …“), damit das Spiel überall gleich spricht.
6. **Stufen-Regel:** Hinweis „{Name} gibt es ab Heizzentrale Stufe {n}. Baue die Heizzentrale aus.“ – `{Name}` aus `merkmalName`, `{n}` aus `abStufe`, nie fest im Text.
7. Texte, die etwas über echte Wärmenetze sagen könnten, sind unten mit **[F]** markiert (Fachprüfer). Spielgrenzen sind ausdrücklich als „im Spiel“ gekennzeichnet.

**Tabelle Knopf → Grund (Zeile 2) → Hinweis → Schloss**
| Nr | Knopf (Stelle) | gesperrt, wenn | Zeile 2 | Hinweis beim Antippen | Schloss |
|---|---|---|---|---|---|
| S1 | Gebäude „Stufe {n+1}“ (`kontext.ts` ~148) | Gebäude hat schon die Stufe der Heizzentrale | „erst Heizzentrale ausbauen“ | „Stufe {n+1} gibt es, sobald die Heizzentrale Stufe {n+1} hat. Baue sie zuerst aus.“ | ja (neu) |
| S2 | Heizhaus-Quelle „Stufe {n+1}“ (~369, rechts in der Zeile) | wie S1 | „erst Heizzentrale ausbauen“, darf zweizeilig umbrechen („erst Heizzentrale / ausbauen“) | „Stufe {n+1} gibt es, sobald die Heizzentrale Stufe {n+1} hat. Der Ausbau steht unten im Blatt.“ (ersetzt den heutigen Text) | ja (neu) |
| S3 | „Ausbauen auf Stufe {n+1}“ Heizzentrale (~153) | Ziele offen | „Ziele noch offen“ | „Erst alle Ziele für die nächste Stufe erreichen – sie stehen weiter oben im Blatt.“ | ja |
| S3g | dito, sonstige Gebäude | Geld fehlt | Preis · Zeit (wie frei) | Geld-Regel 5 | nein |
| S4 | „Dickere“ (~55) | nächste Leitung noch gesperrt | Blatt: „ab Heizzentrale Stufe {n}“ · Leiste: „ab Stufe {n}“ | bleibt: „Dickere Leitungen gibt es ab Heizzentrale Stufe {n}. Baue die Heizzentrale aus.“ | ja |
| S5 | „T-Stück mit Vorsehung“ (Zeichenleiste `steuerung.ts` ~158, Leitungsblatt `kontext.ts` ~353) | `vorsehung` gesperrt | Leiste: „ab Stufe 4“ · Blatt: „ab Heizzentrale Stufe 4“ | fachgeprüfter Text (ENTSCHEIDUNGEN 2026-11-05) – **190 Zeichen, siehe Hinweis unten** | ja |
| B1 | „Hausanschluss ziehen“, „Leitung selbst legen“ (~206/207), Großabnehmer „{Leitung} legen“ (~296), Zeichenleiste „Abschnitt abschließen“ (`steuerung.ts` ~150) | **kein** Bauabschnitt | „braucht offenen Bauabschnitt“ | bleibt: „Erst mit {Planung} einen Bauabschnitt planen: Bauen → Leitungen.“ | ja |
| B2 | dito | Abschnitt in Planung | „{Planung} plant noch“ | „{Planung} plant den Bauabschnitt noch ({Restzeit}). Danach kannst du zeichnen.“ | ja |
| B3 | dito | Abschnitt wartet auf Bestellung | „Abschnitt ist geplant“ | „Abschnitt wartet auf {Material}s Bestellung. Ändern: Bauen → Leitungen → Weiter einzeichnen.“ | ja |
| B4 | dito | Abschnitt wird gebaut | „Abschnitt wird gebaut“ | „Der Bauabschnitt wird gerade gebaut ({Restzeit}). Danach kannst du den nächsten planen.“ | ja |
| B5 | „Hausanschluss geplant“ (~205) | Anschluss ist schon im Abschnitt | „kommt mit dem Bauabschnitt“ | „Der Hausanschluss ist schon eingeplant. Gebaut wird er mit dem Bauabschnitt.“ | nein |
| B6 | „Abschnitt abschließen“ im Baumenü (`katalog.ts` ~86) | 0 Leitungen eingezeichnet | „noch nichts gezeichnet“ (neu) | „Noch nichts gezeichnet. Wähle eine Leitung und zieh sie in der Karte.“ | nein |
| B7 | „↶ Zurück“ in der Zeichenleiste (W1c, 12.18; heute „Letzte zurück“, nie gesperrt) | keine geplante Leitung im Abschnitt | – (Knopf zu schmal, 94 px) | „Noch nichts gezeichnet – es gibt nichts zurückzunehmen.“ (12.21) | nein |
| B8 | „{Planung}: Bauabschnitt planen (lassen)“ (`kontext.ts` ~202, `katalog.ts` ~71), „{Material}: Material bestellen“ (~92) | Geld fehlt | Preis | Geld-Regel 5 | nein |
| B9 | „{Material}: Expresslieferung“ (~102) | `express` gesperrt / Geld | „ab Heizzentrale Stufe 2“ / Preis | „Expresslieferung gibt es ab Heizzentrale Stufe 2. Baue die Heizzentrale aus.“ / Geld-Regel | ja / nein |
| B10 | „Sofort fertig“ (~103) | Taler fehlen | „{c} Taler“ | Taler-Regel 5 | nein |
| H1 | „Vertrag unterschreiben“ (~297) | Bedingungen nicht erfüllt | „noch {k} Bedingung(en) offen“ (1 → „Bedingung“) | „Für den Vertrag fehlt noch: {erste fehlende}.“ – bei mehr: „… und {k−1} weitere.“ Beispiel: „Für den Vertrag fehlt noch: Ruf 60 % (jetzt 45 %).“ [F] nur, solange der Satz „freie Leistung“ auf der Sammelliste steht | ja (neu) |
| H2 | „Helfer beauftragen“ (~242) | `ruecklauf_helfer` gesperrt | „ab Heizzentrale Stufe 3“ | „Rücklauf-Helfer gibt es ab Heizzentrale Stufe 3. Baue die Heizzentrale aus.“ | ja (neu) |
| H3 | „Alle Helfer beschäftigt“ (~255) | kein Helfer frei | „nächster frei in {Zeit}“ (statt Preis) | „Alle Helfer sind gerade beschäftigt. Der nächste ist in {Zeit} frei.“ | nein |
| H4 | „{Helfer} beauftragen · …“ (~255) | Haus ohne Übergabestation | „erst Station wählen“ | „Dieses Haus hat noch keine Übergabestation. Wähle oben im Blatt erst eine.“ | ja |
| H7 | „{Helfer} beauftragen · …“ (~261, Nachtrag 12.21 Punkt 2) | Geld fehlt | Preis · Zeit (wie frei) | Geld-Regel 5 | nein |
| H5 | „Puffer einbauen“ (~220) | `hauspuffer` gesperrt / Geld | „ab Heizzentrale Stufe 3“ / Preis | „Puffer im Haus gibt es ab Heizzentrale Stufe 3. Baue die Heizzentrale aus.“ / Geld-Regel | ja (neu) / nein |
| H6 | „Verkaufen“ (~317) | Gebäude wird gebaut | „erst nach dem Bau“ (statt Erlös) | „Während des Baus kannst du nicht verkaufen. Warte, bis er fertig ist.“ | nein |
| Z1 | „PV aufs Dach · {kWp}“ (~386) | `dach_pv` gesperrt / Geld | „ab Heizzentrale Stufe 4“ / Preis | „PV auf dem Heizhaus-Dach gibt es ab Heizzentrale Stufe 4. Baue die Heizzentrale aus.“ / Geld-Regel | ja (neu) / nein |
| Z2 | „Baugebiet erschließen“ (~392) | `baugebiet` gesperrt | „ab Heizzentrale Stufe 4“ | „Baugebiet gibt es ab Heizzentrale Stufe 4. Baue die Heizzentrale aus.“ | ja (neu) |
| Z3 | dito | zu wenig versorgte Häuser | „{ist}/{soll} Häuser versorgt“ (heute steht dort fälschlich der Preis) | „Für das Baugebiet brauchst du {soll} versorgte Häuser – dir fehlen noch {soll−ist}.“ | ja |
| Z4 | dito | Geld fehlt | Preis | Geld-Regel 5 | nein |
| R1 | Stepper Vorlauf −/+ (~379/381) | `vorlauf` gesperrt | – (48×48, die Schloss-Zeile darunter gibt es schon) | „Den Vorlauf-Regler gibt es ab Heizzentrale Stufe 3. Baue die Heizzentrale aus.“ | nein (Zeile darunter hat es) |
| R2 | Stepper Vorlauf − / + | am Rand | – | „Im Spiel geht der Vorlauf nur bis {min} °C hinunter.“ / „… nur bis {max} °C hinauf.“ [F] | nein |
| R3 | Stepper Wärmepreis − / + (~418/420) | am Rand | – | „Günstiger geht es im Spiel nicht: {min} ct/kWh ist der niedrigste Preis.“ / „Teurer geht es im Spiel nicht: {max} ct/kWh ist der höchste Preis.“ | nein |
| R4 | Stepper Grundgebühr − / + (~425/427) | am Rand | – | „Die Grundgebühr geht im Spiel nicht unter {min} € im Monat.“ / „… nicht über {max} € im Monat.“ | nein |
| D1 | „Gefällt dir“ (`steuerung.ts` ~217, `sperren(`) | schon gemocht | – | „Du hast {Dorf} schon ein Gefällt mir gegeben.“ | nein |

Bewusst **ohne** Eintrag: Katalogkarten (`bkarte`, kein `aus`, eigene Meldung beim Antippen – nur Wortlaut nach Regel 5/6 angleichen: „{Name} ab Heizzentrale Stufe {n}. Baue die Heizzentrale aus.“) und Büro-Förderquellen (Chip statt Knopf, 12.15).

**T-Stück-Hinweis ist zu lang (Vorschlag an Projektleiter und Fachprüfer, nicht eigenmächtig geändert):** Der festgelegte Text hat 190 Zeichen. Nach 12.17 bräuchte er rund 12,7 s Lesezeit, die Meldung steht aber höchstens 6 s, und bei offener Zeichenleiste (freie Fläche 628 bzw. 451 px) braucht er 4–5 Zeilen statt höchstens 3. Vorschlag für die Meldung (98 Zeichen, nur gekürzt, kein neuer Inhalt): „Für Hausanschlüsse nicht nötig – den Abzweig setzt das Spiel selbst. Frei ab Heizzentrale Stufe 4.“ Der Satz zum Anbohren bleibt im Leitungsblatt (dort steht er schon, `kontext.ts` ~345) und im [?]-Text der Zeichenleiste.

**aria-describedby – Entscheidung: nicht verwenden.** Zeile 2 steht im `button`, ist also schon Teil des Knopfnamens („Stufe 3, erst Heizzentrale ausbauen, nicht verfügbar“). Ein zusätzliches `aria-describedby` auf denselben Text würde ihn doppelt vorlesen. Die Meldung beim Antippen kommt über `role="status"` / `aria-live` (12.17) und erreicht Vorleser ohnehin. Für die Stepper ohne Zeile 2 reicht `aria-label` + `aria-disabled`; der Wert steht vorlesbar daneben. Das Schloss-Symbol bleibt `aria-hidden`. 12.19 ist entsprechend angepasst.

**Übergabe Bau (NR16-B2):**
- `stepper()` braucht wie `knopf()` einen Hinweis; `sperren()` (D1) muss einen Hinweis mitnehmen können – heute wackelt „Gefällt dir“ ohne Meldung.
- Hinweise mit `{Fehlbetrag}`/`{Restzeit}` beim Antippen erzeugen (Funktion statt fester Zeichenfolge), sonst nennt die Meldung einen veralteten Betrag.
- Alle Texte zentral (wie `OHNE_ABSCHNITT_HINWEIS`, `tStueckHinweis`), Namen der Helfer aus `ABSCHNITT_HELFER`, Grenzwerte aus `VORLAUF`, `PREISSTUFEN`, `GRUNDGEBUEHR`, `KONSTANTEN.baugebiet_anschluesse`.

Tokens: keine neuen; es gelten `menue.mass_px.schloss_klein`, `wackeln_weg`, `menue.zeit_ms.wackeln` und die Toast-Zeiten aus 12.17.

**Prüfkriterium (Foto):** 844×390 und 667×375, je ein Foto vor und direkt nach dem Antippen von S1, S2 (Heizhaus mit Quelle auf Stufe der HZ), H1, H5, Z3, R2 und einem Geld-Knopf (B8 ohne Geld). Zeile 2 vollständig sichtbar, höchstens 2 Zeilen, kein abgeschnittener Text, Knopf ≥ 44 px hoch; S2 passt rechts in die Zeile, ohne die Quellenbezeichnung zu überdecken. Per Skript: Jeder `button[aria-disabled="true"]` in Haus-, Großabnehmer-, Heizhaus-, Leitungs-, Baumenü- und Zeichenblatt zeigt nach `click()` eine Meldung (`#toast` nicht leer, ≤ 90 Zeichen außer S5); kein gesperrter Knopf ohne Meldung. Geld-Knopf: Meldung enthält den aufgerundeten Fehlbetrag.

### 12.21 Nachträge zu 12.16–12.20 für den Bau NR16-B2b (A92, 2026-11-05)
Anlass: offene Punkte aus dem Bau und Review NR16-B2a (ENTSCHEIDUNGEN 2026-11-05) und Lücken, die für Abnahmetests fehlen. **Ergänzt** 12.16–12.20; wo etwas ersetzt wird, steht es dabei.

**1. „Abschnitt abschließen“ in der Zeichenleiste – Zeile 2 und Hinweise**
Der **Knopfname bleibt „Abschnitt abschließen“** (gleiches Wort wie im Baumenü, B6; gemessen 185 ≤ 197 px bei Lilita 16, 12.18). Die 18-Zeichen-Regel (12.20 Regel 1) gilt für **Zeile 2**; dafür gelten in der Zeichenleiste diese Kurzformen. Der Name des Planers steht bewusst nicht in Zeile 2 (ein längerer Name würde die 18 Zeichen sprengen), sondern nur im Hinweis.
| Nr | gesperrt, wenn | Zeile 2 in der Leiste (≤ 18 Zeichen) | Hinweis beim Antippen | Schloss |
|---|---|---|---|---|
| B1 | kein Bauabschnitt | „kein Bauabschnitt“ (17) | wie 12.20 B1: „Erst mit {Planung} einen Bauabschnitt planen: Bauen → Leitungen.“ | ja |
| B2 | Abschnitt in Planung | „wird noch geplant“ (17) | wie 12.20 B2: „{Planung} plant den Bauabschnitt noch ({Restzeit}). Danach kannst du zeichnen.“ | ja |
| B3 | wartet auf Bestellung | „Bestellung offen“ (16) | wie 12.20 B3 | ja |
| B4 | wird gebaut | „Abschnitt im Bau“ (16) | wie 12.20 B4 | ja |
| B6 | Abschnitt offen, 0 Leitungen eingezeichnet | „nichts gezeichnet“ (17) | wie 12.20 B6: „Noch nichts gezeichnet. Wähle eine Leitung und zieh sie in der Karte.“ | nein |
| B7 | „↶ Zurück“: keine geplante Leitung im Abschnitt | – (Knopf 94 px, keine Zeile 2) | **neu:** „Noch nichts gezeichnet – es gibt nichts zurückzunehmen.“ (ersetzt „Noch nichts gezeichnet.“ aus 12.18/12.20 B7) | nein |

Regeln dazu:
- Reihenfolge B1–B4 › B6 (Bauabschnitt vor „nichts gezeichnet“, 12.20 Regel 4). Die Leiste öffnet sich heute nur im offenen Abschnitt (B6 ist der Regelfall); B1–B4 sind die Absicherung, falls sich der Zustand ändert, während die Leiste offen ist (z. B. Spielstand geladen).
- **Ersetzt** in 12.18 „Fehler beim Abschließen“: Mit 0 Leitungen ist der Knopf gesperrt (B6); er schließt die Leiste **nicht** mehr und ruft das Abschließen nicht auf. Heute schließt Tippen ohne Leitung die Leiste und meldet erst danach „Zeichne erst Leitungen …“ – das entfällt.
- B6 (Abschließen) und B7 (Zurück) nutzen **dieselbe** Abfrage („gibt es eine geplante Leitung im Abschnitt?“). Sie werden nach jeder Änderung neu gesetzt, ohne die Leiste neu zu öffnen: erste Leitung gezeichnet → beide frei; letzte mit „Zurück“ entfernt → beide wieder gesperrt.
- Höhe des Knopfs: **immer 52 px** (`zeichen_abschluss_hoehe`), auch frei (dann einzeilig, senkrecht mittig). So springt die Aktionsleiste nicht, wenn Zeile 2 kommt oder geht. Höhe der Leiste im schlechtesten Fall damit 369 px statt 365 (12.18): passt in 375 und mit 21 px Gerätespielraum genau in 390.
- Zeile 2 Manrope 800 12, Schloss 14 + 4 davor; Breite geschätzt (nicht gemessen) höchstens rund 135 px ≤ 197 – im Test messen (Prüfkriterium unten).
- „Zurück“ gesperrt: Pfeil-Symbol und Wort in `aus_text`, `aria-label` bleibt „Letzte Leitung zurück“, dazu `aria-disabled="true"`.

**2. Helfer-Knopf im Hausblatt: bekommt die Geld-Sperre – ja.**
Grund: Regel 5 gilt für **jeden** Knopf mit Preis; der Knopf zeigt einen Preis („{Preis} · {Zeit}“). Ohne Sperre sieht er frei aus, Tippen führt den Kauf aus und der Kern lehnt mit eigenem Text („Zu wenig Geld“-Fall) ab – das Spiel spräche hier anders als bei Puffer, Material und Planung. Mit Sperre: Zeile 2 bleibt „{Preis} · {Zeit}“ (wie 12.20 S3g), kein Schloss, Hinweis nach Regel 5 „Dir fehlen noch {Fehlbetrag}. Am Monatsende zahlen deine Kunden ihre Wärmerechnung.“, Fehlbetrag beim Antippen berechnet. Reihenfolge am Knopf (bestätigt die angenommene Abweichung aus B2a): **H3 beschäftigt › H4 ohne Station › Geld**. 12.20 bekommt damit die Zeile **H7 | „{Helfer} beauftragen“ | Geld fehlt | Preis · Zeit | Geld-Regel 5 | nein**.

**3. Fällt der erste Sperrgrund beim Antippen weg, zählt der nächste – bestätigt, gilt als Vorgabe.**
Ergänzt 12.20 Regel 4 und ENTSCHEIDUNGEN Antwort 7: Beim Antippen werden **alle** Gründe des Knopfs neu gelesen, in der Reihenfolge der Regel 4.
- Gilt noch irgendein Grund: Knopf wackelt, Meldung = Hinweis des **ersten noch geltenden** Grundes (Wortlaut nach 12.20, nicht der Kerntext), und das Blatt baut sich neu auf, damit Zeile 2 denselben Grund zeigt (Regel 4: Zeile 2 und Hinweis nennen denselben Grund).
- Gilt kein Grund mehr: die normale Aktion läuft (wie bisher).
- Grund: Sonst führt das Tippen eine Aktion aus, die der Kern ablehnt, die Meldung kommt im Kernwortlaut („Erst eine Übergabestation einbauen“) und Zeile 2 nennt noch den alten Grund. Das wirkt wie zwei verschiedene Spiele.
- Beispiel: Haus ohne Station, alle Helfer beschäftigt, Zeile 2 „nächster frei in 1m“. Ein Helfer wird frei, der Spieler tippt → Wackeln, Meldung H4 „Dieses Haus hat noch keine Übergabestation. Wähle oben im Blatt erst eine.“, Zeile 2 jetzt „erst Station wählen“ mit Schloss, kein Geld abgezogen, kein Auftrag.
- Gilt für alle Knöpfe mit mehreren Gründen (Helfer, B9, H5, Z1–Z4, Zeichenleiste B1–B6).

**4. Was für Abnahmetests fehlte (12.16–12.18)**
*Prüfumgebung (gilt für alle Fotos und Skripte 12.16–12.21):* Playwright, Chromium, Fenster 844×390 und 667×375, Gerätefaktor 2, Touch an (`hasTouch`), Querformat. Vor jedem Messen `document.fonts.ready` abwarten (sonst stimmen die Breiten nicht). Messtoleranz 1 px für Lagen und Breiten (Teilpixel). Je einmal mit `reducedMotion: 'reduce'`. Sicherheitsabstand des Geräts ist im Test 0.

*12.16 Reiter – ergänzt:*
- Die Leiste hat `role="tablist"`, jeder Reiter `role="tab"`; genau **ein** Reiter hat `aria-selected="true"`, und das ist der blaue.
- Wort-Stufe prüfbar: bei 844×390 ist das sichtbare Wort des zweiten Reiters „Außenanlagen“ und des dritten „Leitungen“, bei 667×375 „Außen“ und „Netz“ (sichtbar = nicht `display:none`). `aria-label` in beiden Größen der volle Name.
- Jeder Reiter enthält ein Symbol (`svg`, 20×20 ±1) über dem Wort; Symbol-Unterkante ≤ Wort-Oberkante.
- Tastatur: Tab erreicht jeden Reiter, Enter und Leertaste wählen ihn (aria-selected wechselt, Inhalt wechselt). Fokusring sichtbar (3 px).
- Höhe der Leiste 64 ±1 px in beiden Größen (die Reiter dürfen die Leiste nicht wachsen lassen).

*12.17 Meldung – ergänzt (Zahlen zum Nachrechnen):*
| Lage | 844×390 | 667×375 |
|---|---|---|
| kein Blatt | Mitte x = 422, Breite ≤ 420 | Mitte x = 333,5, Breite ≤ 420 |
| Seitenblatt (388 bzw. 306,8 px) | Mitte x = 228, Breite ≤ 420 | Mitte x = 180, Breite ≤ 336 |
| Zeichenleiste (216 px) | Mitte x = 314, Breite ≤ 420 | Mitte x = 225,5, Breite ≤ 420 |
- Mitte x = halbe freie Breite (aus dem Rechteck des Blatts), Toleranz ±2 px. Unterkante = Fensterhöhe − 12 ±2 px (bzw. 8 px über dem obersten unteren Element). Abstand zum Blatt `blatt.left − toast.right ≥ 12`.
- Höchstens 3 Zeilen: Kapsel höchstens **74 px** hoch (3 × 18 px Zeilenhöhe bei 15 px und Zeilenhöhe 1,2 + 2 × 8 Innenabstand + 2 × 2 Kontur, Stand `stil.css`).
- Popup offen: Oberkante 8 ±2 px; die Kapsel überschneidet keinen Knopf und keinen Absatz des Popups.
- Dauer = Zeit bis zum **Beginn** des Ausblendens; die 200 ms Blende kommen dazu. 46 Zeichen: 3,76 s sichtbar, nach 3,96 s weg – daher die Prüfpunkte 3,5 s (da) und 4,2 s (weg). Dafür im Test die Uhr steuern (Fake-Timer), nicht echte Wartezeit.
- Immer genau ein Element `#toast .toast` (zweimal schnell hintereinander verschiedene Texte → eins, mit dem zweiten Text).
- Berührung geht durch: `document.elementFromPoint` an der Mitte der Kapsel liefert die Karte (`canvas`), nicht die Meldung.
- Blatt öffnet sich bei stehender Meldung: nach 250 ms steht sie in der neuen Lage (mit „weniger Bewegung“ sofort).
- Meldung beim Antippen eines gesperrten Knopfs in der Zeichenleiste liegt links der Leiste (Mitte x 314 bzw. 225,5).

*12.18 Zeichenleiste – ergänzt:*
- Tab-Reihenfolge = Lesereihenfolge: [?] → [X] → Farbknöpfe → Radierer → Zurück → T-Stück → Abschnitt abschließen. Gesperrte Knöpfe sind dabei (aria-disabled, nicht `disabled`).
- Umschaltknöpfe haben `aria-pressed`: gewählter Farbknopf, Radierer an, T-Stück an = `true`. Farbknopf-`aria-label` = Leitungsname mit Kennwerten („25er-Leitung, bis 12 kW“), weil die Zahl allein nichts sagt.
- [?] hat `aria-expanded` (Hilfe offen = `true`); [Verstanden] schließt die Hilfe und gibt den Fokus an [?] zurück.
- *Erste Nutzung* „je Spielstand“: die Merke steht im Spielstand (an der einen Stelle, Architekturregel). Prüfbar: neues Spiel → Leiste zeigt Hilfe; schließen, neu laden, Leiste öffnen → Bedienelemente, keine Hilfe.
- **Kamera** (ersetzt den Punkt „Kamera“ in 12.18): Öffnet sich die Leiste aus dem Hausblatt („Leitung selbst legen“), steht das Haus danach in der Mitte der freien Fläche: Bildschirm-x = (Fensterbreite − 216) / 2 ±16 px (= 314 bzw. 225,5), y = Fensterhöhe × 0,5 ±16 px, Zoom unverändert. Öffnet sie sich aus dem Baumenü, rückt die zuletzt geplante Leitung des Abschnitts so in die freie Fläche; gibt es keine, bleibt die Kamera, wo sie ist. Beim Schließen der Leiste springt die Kamera nicht zurück. Dieselbe Rechnung (Breite aus dem tatsächlichen Blatt-Rechteck statt `0.46`/`400`) gilt auch für das Hausblatt; Prüfung: Haus nach dem Antippen bei 844 auf x = 228 ±16, bei 667 auf x = 180 ±16.
- Prüfbar „kein Scrollbalken“: an der Leiste und am Mittelteil `scrollHeight ≤ clientHeight + 1` (bei 844×390 und 667×375 in Stufe 1 und mit 2 Reihen Farbknöpfen – dafür Spielstand Stufe 3 direkt setzen).
- Abschließen-Knopf: Höhe 52 ±1, Name einzeilig (Höhe der Namenszeile < 2 × Zeilenhöhe), Zeile 2 nicht abgeschnitten (`scrollWidth ≤ clientWidth` am Zeile-2-Element).

*Tippflächen (alle drei Abschnitte):* Jedes tippbare Element in Reiterleiste, Zeichenleiste und Blattkopf (Knopf, Reiter, Farbknopf, [?], [X], Stepper) misst ≥ 44 × 44 px, auch gesperrt. Ausnahme nur nicht tippbare Chips (12.15). Die Meldung zählt nicht (nicht tippbar).

Tokens: neu `menue.mass_px.zeichen_abschluss_hoehe` 52. Sonst keine neuen.

**Prüfkriterium (Foto), zusätzlich zu 12.16–12.20:** 844×390 und 667×375: Zeichenleiste frisch geöffnet ohne Leitung (Abschließen grau mit „nichts gezeichnet“, Zurück grau) und direkt nach dem Antippen von beiden (Meldung links der Leiste, Leiste bleibt offen); nach dem ersten Strich (beide frei, Aktionsleiste gleich hoch); Hausblatt mit Helfer-Knopf ohne Geld (Preis in Zeile 2, kein Schloss) und nach dem Antippen (Meldung mit aufgerundetem Fehlbetrag). Per Skript: Abschließen mit 0 Leitungen → Leiste noch offen, Abschnitt-Phase unverändert `offen`, Meldung = B6-Text; Zurück mit 0 Leitungen → Meldung = neuer B7-Text; Helfer ohne Geld → Geld unverändert, kein Auftrag; Fall „Helfer frei, Haus ohne Station“ aus Punkt 3 → Meldung H4, Zeile 2 danach „erst Station wählen“.

### 12.22 NR18 Ersatz, Engstelle, Warnliste – Vorgaben aus der Sichtprüfung (2026-11-06, Stand e99e48f)
Fotos 844×390 und 667×375, Gerätefaktor 2. Bestätigt: Engstellen-Raute `#d8392f` 3 px (auch auf der 25er gut lesbar, weil sie feldgroß ist und über Wiese/Straße läuft); goldene Ersetzen-Knöpfe (`knopf.geld`); „Hausanschluss geplant“ grau ohne Schloss; Sperre „Dickere Leitung · kein Bauabschnitt“.
- **Ersetzen-Knopf:** Aufschrift mit Kurzname, `Ersetzen: 32er` (nicht „32er-Leitung“ – bricht sonst als „32er-/Leitung“ dreizeilig um, 67 px hoch).
- **Planraute bei Ersatz in Zielfarbe:** gestrichelte Raute in der Farbe der neuen Leitung (`leitung.d32` …), Deckkraft 0,8, statt Plan-Blau. Grund: Ersatz sieht sonst aus wie eine neu eingezeichnete Leitung, und man sieht nicht, welche Dicke kommt.
- **Warnliste im Baumenü:** kein Kasten im Kasten. Ein Streifen im Kasten „Bauabschnitt“: Grund `chip.rot` (`#ffd9d1`), Überschrift „Nach dem Bau zu dünn“ in `#8f2117` mit Symbol „!“, Sätze in `text`, Radius 12, Innenabstand 8/12.
- **Mehrfach-Hinweis beim Abschließen:** höchstens 3 Zeilen Meldung (12.17). Bei mehr als einem Stück nur „{n} Stellen sind nach dem Bau zu dünn – die Liste steht im Baumenü.“ (≤ 64); bei genau einem Stück der Satz selbst (≤ 90).
- **Prüfung:** Meldung mit Warnliste bei 667×375 neben offenem Baumenü ≤ 74 px hoch.

**Nachfoto (2026-11-06, Stand 105d4dc, 667×375 und 844×390, Gerätefaktor 2).** *Ersatz-Raute:* erfüllt. Die gestrichelte Raute steht in der Farbe der neuen Leitung (32er grün, 40er hellblau) mit Deckkraft 0,8 um die weiterhin sichtbare alte rote 25er; neue und alte Dicke sind auf einen Blick getrennt, auch auf der kleinen 667er. Neben einer neu eingezeichneten 40er (Plan-Blau-Raute plus hellblaues Rohr) bleibt Ersatz unterscheidbar, weil darin das alte Rohr liegt; nur die beiden Blautöne der Rauten liegen bei der 40er nah beieinander – hinnehmbar, kein Umbau. *Mehrfach-Hinweis:* erfüllt. „2 Stellen sind nach dem Bau zu dünn – die Liste steht im Baumenü.“ (65 Zeichen) steht bei 667×375 in zwei Zeilen, 56 px hoch (Grenze 74), links vom Blatt (Meldung bis 348, Blatt ab 360), nichts abgeschnitten; bei 844×390 ebenso zwei Zeilen, 56 px. Die Warnliste ist ein Streifen im Kasten „Bauabschnitt“ (rosa Grund, „!“ und rote Überschrift), kein Kasten im Kasten. Fotos: `scratchpad/nr18-d/nachfoto-*.png`.

### 12.23 NR19 Stationswahl – Fotoprüfung (2026-11-06, Stand 960c7b8)
Fotos 667×375 und 844×390, Gerätefaktor 2, Playwright mit geladenen Schriften; Einfamilienhaus 15.000 kWh (10 kW ohne, 7,5 kW mit Puffer). Fotos: `scratchpad/p6/*.png`. Varianten „aus dem Netz“, Kurzform und „Vorschlag“ sind nur im Foto per DOM-Tausch eingesetzt, nicht gebaut.

**1. Kasten „Übergabestation wählen“ – teilweise erfüllt.** Alle Knöpfe ≥ 49 px hoch, Fehlbetrag-Zustand richtig (grau, Preis bleibt, Münze, kein Schloss; Meldung „Dir fehlen noch 2.970 €. …“ aufgerundet, 12.20 Regel 5). Der Kasten passt nicht auf eine Bildschirmhöhe (Stufe 1: 400 bzw. 347 px, freie Wahl: 629 bzw. 507 px bei 375/390 px Höhe) – das ist hinnehmbar, weil die Puffer-Reihe oben steht und man im Blatt weiterscrollt. Drei Mängel:
- **Knopfname zu lang.** „Puffer-Übergabestation HP 800“ bricht bei 667 als „… HP / 800“ (Zahl abgetrennt, Verstoß 12.20 Regel 1) und bei 844 in zwei Knöpfen nebeneinander dreizeilig („Puffer- / Übergabestation / HP 800“), Knopf 98 px hoch. **Abhilfe:** Zeile 1 = „Puffer HP 800“ / „Puffer HP 1000“ / „Puffer ÜP 1000“ mit ` ` zwischen Kürzel und Zahl. Die Reihenüberschrift „Mit Pufferspeicher“ und der Kastentitel sagen schon „Übergabestation“. Per DOM-Tausch gemessen: 844 → 63 px, 667 → 50 px, einzeilig.
- **Reihenüberschriften kleben an der Reihe davor.** „Wandstation ohne Puffer“ steht rund 6 px unter den Puffer-Knöpfen und 16 px über der eigenen Erklärzeile – sie sieht aus wie eine Bildunterschrift zu den Puffer-Knöpfen. Außerdem sind beide Überschriften normale Textzeilen. **Abhilfe:** „Mit Pufferspeicher“ und „Wandstation (ohne Puffer)“ als Zwischenüberschrift: Manrope 800 14 in `text`, Abstand oben 16 (`abstand_px` 16), unten 4, die Erklärzeile direkt darunter.
- Erklärzeilen trennen „7,5 / kW“ (667) und „10 / kW“. **Abhilfe:** ` ` zwischen Zahl und Einheit auch in den Erklärzeilen.

**2. Wortlaut Zeile 2 – Entscheidung: „{n} kW vom Netz · {Preis}“ (gebaute Fassung).** Gemessen:
| Fassung | 667 (ein Knopf je Zeile, 252 px) | 844 (zwei nebeneinander, 162 px) |
|---|---|---|
| „7,5 kW vom Netz · 5.570 €“ (25 Z.) | 1 Zeile | 2 Zeilen, Umbruch vor dem Preis |
| „13,3 kW vom Netz · 7.570 €“ (26 Z., schlimmster Fall) | 1 Zeile | 2 Zeilen, Umbruch vor dem Preis |
| „7,5 kW aus dem Netz · 5.570 €“ (29 Z.) | 1 Zeile | 2 Zeilen, Umbruch vor dem Preis |
| „13,3 kW aus dem Netz · 5.570 €“ (30 Z.) | 1 Zeile | 2 Zeilen, aber **„13,3 kW aus dem / Netz · 5.570 €“** – die Wortgruppe reißt; mit geschützten Leerzeichen würden es 3 Zeilen |
| „7,5 kW · 5.570 €“ (16 Z.) | 1 Zeile | 1 Zeile |
Begründung: „aus dem Netz“ hält die Regel „höchstens 2 Zeilen, Umbruch an sinnvoller Stelle“ bei zweistelliger Leistung nicht ein. Die Kurzform ist **irreführend**: die Wandknöpfe daneben zeigen mit „Typ 15 · 15 kW“ die Leistung der *Station*; „HP 800 · 7,5 kW“ würde genauso gelesen, obwohl die HP 800 14 kW hat. „vom Netz“ bleibt eindeutig, passt immer und bricht immer vor dem Preis um. Der volle Satz „… = 7,5 kW aus dem Netz“ steht in der Erklärzeile darüber; der Plan-Wortlaut geht also nicht verloren. Bitte im Plan/Abnahmetest auf „vom Netz“ umstellen.
**Regel 12.20 Regel 1 angepasst (Zusatz):** Bei zwei Knöpfen nebeneinander darf eine Zeile 2 mit Preis bis 28 Zeichen haben, wenn sie zweizeilig genau **vor dem Preis** umbricht: Wortgruppe davor mit ` ` gebunden („7,5 kW vom Netz ·“), Preis mit ` ` vor „€“. Sonst gilt weiter die 18.

**3. Zeile „Übergabestation“ im Hausblatt – Wandstation erfüllt, Puffer-Station nicht.** Wandstation: „Wandstation Typ 15 · 15 kW“ einzeilig (44 px) auf beiden Größen. Puffer-Station: „Puffer-Übergabestation HP 800 · 14 kW Netz, 19 kW im Haus“ (57 Z.) – bei 844 zwei Zeilen, ordentlich; bei **667 vier Zeilen (86 px)** mit „HP / 800“ und „19 / kW“. **Abhilfe:** zwei Zeilen im Blatt: „Übergabestation“ → „Puffer HP 800“; neue Zeile „Leistung Station“ → „14 kW Netz · 19 kW Haus“ (geschützte Leerzeichen zwischen Zahl und kW). Alter Stand Wandstation mit Puffer bleibt „Wandstation Typ 15 · 15 kW, mit Puffer“.

Tokens: keine neuen.

**Nachfoto (2026-11-06, Stand 62b0ac9).** Gleiche Fotobedingungen, alles echt gebaut (kein DOM-Tausch); Zeilen pro Zeichen-Rechteck gemessen. Fotos `scratchpad/p6/nach-*.png`, Messlog `scratchpad/p6/nach-lauf*.txt`. Fälle: EFH 7,5 kW (Stufe 1/2, mit und ohne Geld), EFH Kamin aus + aufgestockt 15,8 kW (neu, frei, wenig Geld), EFH mit HP 800 (passt / zu klein), MFH mit ÜP 1000 Kamin aus + aufgestockt (Stufe 1/2).
1. **Puffer-Knöpfe – erfüllt.** Zeile 1 „Puffer HP 800/1000“, „Puffer ÜP 1000“ überall einzeilig. 667: Zeile 2 einzeilig, auch „15,8 kW vom Netz · 6.570 €“. 844 (zwei nebeneinander, 162 px): immer genau „… kW vom Netz ·“ / „6.570 €“, Knopf 62–63 px statt 98. Grau bei Fehlbetrag gleich, Meldung „Dir fehlen noch 3.570 €. …“ richtig.
2. **Zwischenüberschriften – erfüllt.** Manrope 800 14 in `text`, Abstand oben 16 / unten 4 gemessen; „Wandstation ohne Puffer“ steht jetzt klar als Überschrift der unteren Reihe.
3. **Erklärzeilen – erfüllt.** „Mit Puffer: … = 15,8 kW aus dem Netz“, „Ohne Puffer: … = 63 kW – …“: nirgends ein Umbruch zwischen Zahl und Einheit.
4. **Stationszeile – teilweise.** Zwei Zeilen „Übergabestation: Puffer HP 800“ (einzeilig) und „Leistung Station“ wie vorgegeben. 844: beide einzeilig. **667:** „Leistung Station“ bricht links in „Leistung / Station“ und rechts in „14 kW Netz · 19 kW / Haus“ – „Haus“ steht allein (auch „40 kW Netz · 54 kW / Haus“). **Abhilfe:** Wert mit geschützten Leerzeichen als zwei Wortgruppen: `${netz} kW Netz · ${haus} kW Haus` mit `\u00a0` zwischen Zahl, kW und Netz bzw. Haus – dann „14 kW Netz ·“ / „19 kW Haus“.
5. **Puffer fällt weg (MFH, ÜP 1000) – erfüllt.** Chip „Station zu klein“, Überschrift „Wandstation ohne Puffer“, darunter „Keine Puffer-Station reicht mehr. Mit der Wandstation fällt der Puffer weg.“ (2 Zeilen) und die Rechnung „Ohne Puffer: 94.500 kWh ÷ 1.500 h = 63 kW“. Lesbar und passend: zuerst der Grund, dann die Folge, dann die Zahl.
6. **„Aktuell“ – erfüllt.** „Aktuell: Puffer HP 800 (14 kW), das Gebäude braucht 7,5 kW. …“ – Kurzname, Zahl nicht abgetrennt. Hinweis: „(14 kW)“, „15,8 kW“ und „50 %“ stehen dort noch mit normalem Leerzeichen; in keinem Foto bricht es, beim nächsten Anfassen bitte `\u00a0` setzen.
**Neuer Mangel (älter als NR19, im Fall 5 sichtbar): Wandstations-Knöpfe nebeneinander (844).** „Wandstation Typ / 15 · 15 kW“ trennt „Typ“ von der Zahl (alle Fälle mit freier Wahl), und „CAD-Großabnehmerstation · 150 kW“ läuft über: „CAD- / Großabnehmerstatio|n / · 150 kW“, Text am Rand abgeschnitten (Knopf 84 px). Bei 667 „CAD-Großabnehmerstation · / 150 kW“. **Abhilfe:** Zeile 1 `Wandstation Typ 15 · 15 kW` mit `\u00a0` in „Typ 15“, „15 kW“ und vor „·“ (bricht dann als „Wandstation“ / „Typ 15 · 15 kW“); CAD im Knopf kurz „CAD-Station · 150 kW“ (`\u00a0` in „150 kW“), der lange Name bleibt in der Hauskarte.

## 13. Tutorial (NR13) – „Simon zeigt dir dein erstes Netz“ (Entwurf 2026-11-06)
Anlass: Lastenheft NR13 mit Präzisierung Simon 2026-11-06 („ganz wichtig“), dazu NR2 (die ersten Minuten) und NR3 (Begriffe, „Wusstest du?“). Grundlage für den Ablauf mit Leitung und Station: Bauplan NR18 Fassung 1 (selbst zeichnen, Station kaufen, Warnung statt Sperre) und NR19 (Puffer-Übergabestation als Standard). Designer, Modus `entwurf`. **Ergänzt** Abschnitt 7 Ablauf 1 und S2 „leer/neu“: Für ein **neues Spiel** startet nach dem Namensfenster (A79) dieses Tutorial statt des ersten Auftrags. Alte Spielstände sind nicht betroffen (13.8). **Klärungen zum Bauplan NR13 vom 06.11. stehen in 13.15 und gehen bei Widerspruch den Einzelstellen in 13.2–13.11 vor.**

### 13.1 Wer, wo, was
- **Wer:** auch Menschen ohne jede Ahnung von Wärme (Simon). Sie kennen weder kW noch Übergabestation und wollen nach fünf Minuten nicht das Gefühl haben, eine Prüfung zu schreiben. Sie spielen am Handy im Querformat, oft nebenbei.
- **Ziel:** In rund 4–5 Minuten hat der Spieler **selbst** zwei Häuser warm gemacht und dabei sieben Begriffe einmal gehört: Wärmeerzeuger, kW, kWh, Wärmenetz, Bauabschnitt, Übergabestation, Pufferspeicher (plus Vorlauf/Rücklauf als „Wusstest du?“ am Ende).
- **Haltung:** Simon steht als Figur daneben und redet wie ein freundlicher Netzmeister auf der Baustelle: kurz, Du-Form, ein Gedanke pro Blase. Jede Erklärung hängt an etwas, das man **gerade sieht** (Rauch, Anzeige, Leitung). Keine Formeln, keine Tabellen.
- **Pflicht:** Jeder Schritt wartet auf die richtige Handlung (Tippen auf das Leuchtende oder [Weiter]). Es gibt kein „Überspringen“ und kein Wegtippen (Ausnahme nur für Tester, Frage T-F3).

### 13.2 Bausteine des Tutorials
Alle Bausteine im Menü-Stil v2 (Abschnitt 12). Neue Werte stehen in 13.10 als Vorschlag für `design/tokens.json`.

**Anleiter-Karte** (Simon spricht). Baut auf der Sprecher-Karte aus A51/A52 auf (`sprecher.ts`), bleibt aber stehen, bis der Schritt erledigt ist (kein Zeitablauf).
```
┌──────────┐ ┌───────────────────────────────────────────────┐
│          │ │ Simon                          ● ● ○ ○ ○ ○    │  Name Lilita 15 kontur · Kapitel-Punkte 8 px
│  Figur   │ │ Text Manrope 600 14, Zeilenhöhe 18,           │
│  Simon   │ │ höchstens 4 Zeilen, höchstens 120 Zeichen.    │
│ (112 px) │ │                                  [ Weiter ]   │  nur bei Erklär-Schritten, Knopf `los` klein 44
└──────────┘ └───────────────────────────────────────────────┘
               ↑ Spitze zur Figur (Ecke unten links Radius 4)
```
- **Blase:** Tafel-Look nach 12.14: Fläche `tafel`, 2 px `kontur`, Sockel `0 3px 0 kontur`, Radius 14 (Ecke zur Figur 4), Innenabstand 8/12. Name „Simon“ Lilita 15 in `kontur`, Text Manrope 600 14 in `text`. Fachbegriffe beim ersten Auftauchen **fett (800)** – so erkennt man „das ist ein Wort zum Merken“.
- **Kapitel-Punkte** rechts im Namenszeile: sechs Punkte 8 px, Lücke 4. Erledigt und aktuell = `naht_vorlauf` gefüllt, offen = nur 2 px Ring `tafel_linie`. Nicht tippbar. Vorlesetext „Kapitel 2 von 6“.
- **[Weiter]** rechts unten in der Blase, Variante `los` klein (Höhe 44, Lilita 16). Nur in Erklär-Schritten. In Handlungs-Schritten gibt es **keinen** Knopf – die Blase sagt, was zu tippen ist, und der Finger zeigt es.
- **„Wusstest du?“-Variante** (NR3): über dem Text ein Gold-Chip „Wusstest du?“ (12.7 Chip `gold`, 26 px), sonst gleich. Dieselbe Variante nutzen später alle Freischalt-Karten (NR3), damit das Spiel überall gleich spricht.
- **Figur:** Bis Simons Foto da ist, ein **Platzhalter im Stil der gezeichneten Sprecher-Figuren** (`sprecher.ts`, `AUSSEHEN`): kurze dunkelbraune Haare, Haut wie Philipp, Jacke in Heat-Orange `#ff8a1f` (`naht_vorlauf`) mit 6 px Kragen in ville-Blau `#3a92ea` (`naht_ruecklauf`) – Simon trägt das Logo-Paar und ist damit von Philipp (blau) und Laura (rot) sofort zu unterscheiden. Kein Helm (er erklärt, er baut nicht). Mit Foto: freigestellt wie A52 (`public/figuren/simon.webp`, Oberkörper, Transparenz), 112 px hoch; der Designer zeichnet daraus die endgültige Figur im Spielstil, sobald das Bild da ist (offene Frage Q11 Teil 2).
- **Größen:** Figur 112 px hoch; ist die freie Breite unter 400 px (667×375 mit offenem Blatt), 72 px. Karte höchstens 460 px breit.

**Spotlight** (Abdunkeln mit Loch).
- Fläche `menue.farbe.abdunkeln` (`rgba(28,14,4,.55)`) über Karte und HUD, mit einem oder mehreren **Löchern** um das Ziel. Die Anleiter-Karte liegt **über** dem Abdunkeln.
- **Loch um ein Kartenobjekt** (Heizzentrale, Haus): Ellipse um das Bildschirm-Rechteck des Objekts + 12 px. **Loch um ein Bedienelement** (Knopf, Reiter, Katalogkarte): Rechteck des Elements + 8 px, Radius = Radius des Elements + 8.
- **Rand des Lochs:** 3 px hellgelb `fokus_auf_dunkel` `#ffe08a`, außen 2 px `kontur`, dazu ein weicher warmer Schein (16 px, `#ffe08a` 55 %). Das passt zum Erkennungsmerkmal „Wärme ist das einzige Leuchten“ (Abschnitt 1): Was du tun sollst, **leuchtet warm**.
- Wechsel zwischen zwei Zielen: altes Loch blendet aus, neues ein, je 200 ms (`kurve.weich`). Bei Kamerafahrt verschwindet das Abdunkeln ganz und kommt am Ziel zurück.
- Berührungen außerhalb der Löcher kommen **nicht** beim Spiel an (13.7 „falsch getippt“). Im Loch geht die Berührung normal an das Element darunter.

**Zeigefinger.** Gezeichnete Hand (neues Symbol `finger` in `symbole.ts`, gleicher Linienstil wie die übrigen: Fläche `tafel`, 2 px `kontur`), 40 px. Die Fingerspitze sitzt auf der Mitte des Ziels, die Hand kommt von rechts unten (bei Zielen am rechten Rand von links unten). Erscheint 600 ms nach Schrittbeginn (erst lesen, dann tippen). Bewegung: tippt 6 px in Richtung Ziel und zurück (400 ms), dann 1.200 ms Ruhe, wiederholt. Das ist die **einzige** dauernde Bewegung im Spiel – eine bewusste Ausnahme von 12.9 („nichts pulsiert dauerhaft“), nur solange ein Handlungs-Schritt wartet. Kein Finger bei Erklär-Schritten.

**Leitungs-Spur** (nur Kapitel 3) – *ersetzt durch die Geisterleitung 13.17.1 B2.* Bisher: Gestrichelte Linie auf der Karte vom Abgang der Heizzentrale durch die Straße bis an beide Häuser: 4 px `naht_vorlauf`, Striche 10/8, heller Halo 2 px (`effekt.text_halo`), alle drei Felder eine kleine Pfeilspitze in Zugrichtung. Ein Feld der Spur verschwindet, sobald dort eine Leitung eingezeichnet ist. Der genaue Feldverlauf kommt aus dem Bau (Startdorf-Koordinaten, Projektleiter); er läuft nur über Straße und kostet keine Gestattung.

**„Erreicht“-Zeichen.** Erreicht die eingezeichnete Leitung ein Tutorial-Haus, erscheint über dem Haus eine Kunden-Blase (Abschnitt 3) mit grüner Scheibe (`menue.chip.gruen` Grund) und gezeichnetem Haken, dazu ein kurzes Federn (450 ms, `plopp_staerke`). Die „kein Anschluss“-Blase des Hauses tritt dafür zurück.

### 13.3 Platz der Anleiter-Karte im Querformat
Grundregel: **unten links in der freien Kartenfläche**, nie über einer offenen Seitenfläche, nie über der Anzeigenreihe, nie über dem Ziel.
| Lage | Wo steht die Karte? | Breite |
|---|---|---|
| Kein Blatt offen | links 12, unten 12 (plus Sicherheitsabstand des Geräts). Rechts bleiben 88 px frei für den [Bauen]-Knopf | min(460, Bildschirmbreite − 112) |
| Seitenfläche offen (388 bzw. 306,8 px) | links 12, unten 12, **in der freien Fläche links vom Blatt** (Breite aus dem Blatt-Rechteck lesen wie 12.17) | freie Breite − 24 → 432 bzw. 336 |
| Zeichenleiste offen (216 px) | wie Seitenfläche | min(460, freie Breite − 24) → 460 bzw. 427 |
| Ziel liegt im unteren Teil der freien Fläche (Unterkante Ziel > Oberkante Karte − 16) | Karte wechselt nach **oben links**, direkt unter die Anzeigenreihe (top 64). Wechsel per Blende 200 ms | wie oben |
| Sprecher A51 (Philipp, Laura) meldet sich | Sprecher-Karte erscheint **auf demselben Platz**; die Anleiter-Karte blendet so lange aus (200 ms) und kommt danach zurück. Nie zwei Sprechblasen gleichzeitig | – |

**Höhe:** Figur 112 bzw. 72; Blase bei 4 Zeilen 8 + 18 + 4 + 72 + 8 + 44 + 8 = **162 px**. Bei 844×390 liegt die Oberkante damit bei 216 px, bei 667×375 bei 201 px. Darüber bleibt für das Ziel die Fläche von 64 px bis rund 200 px.
**Kamera-Regel dazu:** Das Ziel eines Schritts steht in der Mitte der freien Breite und auf **38 % der Bildschirmhöhe** (statt 50 % wie in 12.21), damit es über der Karte liegt. Zoom bleibt 3 (Handy), außer der Schritt sagt etwas anderes.
**Meldungen (Toast)** sind im Tutorial stumm: Simon spricht statt der Meldung (keine zwei Stimmen). Ausnahme: Fehler beim Speichern/Laden (S0) erscheinen wie immer, nach 12.17 über der Anleiter-Karte.

### 13.4 Skizzen 844×390
**A – Schritt T01: Begrüßung, Kamera auf der Heizzentrale (kein Blatt)**
```
┌────────────────────────────────────────────────────────────────────────────────┐
│(Dorfschild)(€ 30.000)(W 0/60 kW)(R 80 %)(T 0)(M 1/1)  ← abgedunkelt, nicht tippbar│ 12..56
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░.────────────.░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░(  HEIZZENTRALE  )░░░░  Loch: Ellipse + 12 px  ░│ Ziel auf 38 % Höhe
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░'────────────'\░░░░  Rand hellgelb + Schein  ░│ (≈ 148 px)
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░[Finger]░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░┌────────┐ ┌───────────────────────────────────────────┐░░░░░░░░░░░░░░░░░░░░░░░│ top 216
│░░│ Figur  │ │ Simon                        ● ○ ○ ○ ○ ○  │░░░░░░░░░░░░░░░░░░(Bau)░│
│░░│ Simon  │ │ Hallo Anna! Ich bin Simon und zeige dir,  │░░░░░░░░░░░░░░░░░░ en ░│ [Bauen] abgedunkelt
│░░│        │ │ wie dein Dorf warm wird. Tippe auf die    │░░░░░░░░░░░░░░░░░░░░░░░│
│░░│        │ │ Heizzentrale.                             │░░░░░░░░░░░░░░░░░░░░░░░│
│░░└────────┘ └───────────────────────────────────────────┘░░░░░░░░░░░░░░░░░░░░░░░│ unten 12
└────────────────────────────────────────────────────────────────────────────────┘
 Zoomknöpfe und [Dörfer] sind im Tutorial ausgeblendet; der Auftrag ist ausgeblendet.
```

**B – Schritt T10: Baumenü offen, Philipp-Knopf im Licht (Seitenfläche 388 px)**
```
┌───────────────────────────────────────────────┬────────────────────────────────┐
│(Dorfschild)(€ 30.000)(W 0/60 kW)… abgedunkelt │                                │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ Bauen                    [ X ] │ Kopfband (X gesperrt)
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│
│░░░░░░ freie Kartenfläche 456 px ░░░░░░░░░░░░░░│ [Heizhaus][Außen..][LEITUNGEN].│ Reiter abgedunkelt
│░░░░░░ (abgedunkelt, Karte steht still) ░░░░░░░│ ╭ Bauabschnitt ──────────────╮ │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ │ Leitungen werden abschnitts-│ │ Text abgedunkelt
│░░┌──────┐┌──────────────────────────────────┐░│ │ ┏━━━━━━━━━━━━━━━━━━━━━━━━┓ │ │
│░░│Figur │ │ Simon                ● ● ○ ○ ○ ○ │░│ │ ┃ Philipp: Neuen Bauab-  ┃ │ │ Loch: Knopf + 8 px
│░░│Simon │ │ Philipp plant, wo die Leitung in │░│ │ ┃ schnitt planen ·2.000 €┃ │ │ Rand hellgelb
│░░│      │ │ der Straße liegen soll. Tippe auf│░│ │ ┗━━━━━━━━━━━━━━━━━━[Finger] │
│░░│      │ │ seinen Knopf.                    │░│ ╰─────────────────────────────╯ │
│░░└──────┘└──────────────────────────────────┘░│                                │
└───────────────────────────────────────────────┴────────────────────────────────┘
 Karte 432 px breit, links 12 / unten 12, berührt das Blatt nie.
```

**C – Schritt T13: Leitung ziehen (Zeichenleiste 216 px, Karte nicht abgedunkelt)**
```
┌────────────────────────────────────────────────────────┬─────────────────────────┐
│(Dorfschild)(€ 28.000)(W 0/60 kW)…  abgedunkelt         │ Zeichnen    [?] [ X ]   │ [?] und [X] gesperrt
│┌──────┐┌──────────────────────────────────────────────┐│▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│
││Figur │ │ Simon                         ● ● ● ○ ○ ○    ││ [25][32][40][Schl.]     │ frei
││Simon │ │ Zieh die Leitung mit dem Finger von der      ││ bis 15 kW · 10 €/Feld   │
││      │ │ Heizzentrale bis an beide Häuser. Folge der  ││ [Radierer] [↶ Zurück]   │ frei
│└──────┘ │ gelben Spur.                                 ││ [T-Stück · ab Stufe 4]  │ wie immer gesperrt
│         └──────────────────────────────────────────────┘│                         │
│  [HZ]═ ═ ═ ═ ═ ═ ═ ═ ═ ═>┐                              │                         │ Spur 4 px orange,
│                          ┆   (Haus 1)    (Haus 2)        │                         │ gestrichelt, Pfeile
│    [Finger] fährt ═ ═ ═ ═└═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═>┘        ├─────────────────────────┤
│                                                         │ [Abschnitt abschließen] │ gesperrt bis beide
└────────────────────────────────────────────────────────┴─────────────────────────┘ erreicht (13.7)
 Ziel (Spur + beide Häuser) liegt unten → Karte wechselt nach oben links (13.3).
 Kamera: Zoom so, dass Heizzentrale und beide Häuser mit 24 px Rand in die freie Fläche (628 px) passen, Zoom 2–3.
```

**D – Schritt T17: Hausblatt offen, Puffer-Übergabestation im Licht**
```
┌───────────────────────────────────────────────┬────────────────────────────────┐
│(Dorfschild)(€ 27.500)… abgedunkelt            │ Einfamilienhaus   (Stufe 1)[X] │
│░░░░░░░░░░░░░░░.───────.░░░░░░░░░░░░░░░░░░░░░░░│▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│
│░░░░░░░░░░░░░░( Haus 1  )░ Haus bleibt leicht │ (kein Anschluss) abgedunkelt   │
│░░░░░░░░░░░░░░░'───────'░  beleuchtet (2. Loch,│ ╭ Übergabestation wählen ────╮ │
│░░░░░░░░░░░░░░░░░░░░░░░░░  ohne Finger)        │ │ ┏━━━━━━━━━━━━━━━━━━━━━━━━┓ │ │ Loch + Finger
│░░┌──────┐┌──────────────────────────────────┐░│ │ ┃ Puffer-Übergabestation ┃ │ │ (`geld`, Preis)
│░░│Figur │ │ Simon                ● ● ● ● ○ ○ │░│ │ ┃ 7,5 kW · 5.570 €       ┃ │ │ Zahlen = Spielwerte
│░░│Simon │ │ Nimm die mit **Pufferspeicher**. │░│ │ ┗━━━━━━━━━━━━━━━━━━━━━━━━┛ │ │ aus NR19
│░░│      │ │ Ihr Tank sammelt Wärme vorab, so │░│ │ [Wandstation · später  S] │ │ Tutorial-Sperre
│░░│      │ │ reichen 7,5 kW statt 10 kW aus   │░│ │ (abgedunkelt)               │ │
│░░│      │ │ dem Netz – genauso warm.         │░│ ╰─────────────────────────────╯ │
│░░└──────┘└──────────────────────────────────┘░│                                │
└───────────────────────────────────────────────┴────────────────────────────────┘
 (S = gezeichnetes Schloss-Symbol `schloss`, kein Schriftzeichen.)
```
**667×375:** gleicher Aufbau. Seitenfläche 306,8 px, freie Fläche 360 px → Karte 336 px breit, Figur 72 px, Blase 256 px (innen rund 32 Zeichen je Zeile → 120 Zeichen = 4 Zeilen, 162 px hoch, Oberkante 201 px). Zeichenleiste: freie Fläche 451 px → Karte 427 px.

### 13.5 Schritt-Liste
Legende: **[W]** = Erklär-Schritt, weiter mit [Weiter]. **[H]** = Handlungs-Schritt, weiter nur mit der genannten Handlung (Finger zeigt sie). **Fett** = Fachbegriff beim ersten Auftauchen. **[F]** = Satz sagt etwas über echte Wärmenetze → Fachprüfer. `{…}` = Wert aus dem Spiel, nie fest im Text (Beispielwerte in Klammern: Einfamilienhaus 15.000 kWh/Jahr, ohne Puffer 1.500 h → 10 kW, mit Puffer 2.000 h → 7,5 kW, Kessel Stufe 1 60 kW, 25er bis 15 kW). `{Name}` = Spielername aus dem Namensfenster (Standard „Chef“). Alle Texte ≤ 120 Zeichen auch mit 20 Zeichen langem Namen, höchstens 2 Sätze.

**Gesperrt während des ganzen Tutorials** (Grundzustand, gilt in jedem Schritt zusätzlich): Anzeigen-Pillen und Dorfschild (sichtbar, unter dem Abdunkeln, nicht tippbar), Auftragskarte, [Dörfer], Zoomknöpfe (ausgeblendet), Schließen-[X] und [?] in Blättern und Zeichenleiste, „Verwerfen“, „Sofort fertig“, „Expresslieferung“ (Stufe 1 ohnehin gesperrt), „Weiter einzeichnen“, Wandstation. Gesten: Ziehen und Zoomen der Karte nur in Kapitel 3 (Zeichnen, dort Zwei-Finger-Zoom); sonst steht die Kamera, damit das Ziel im Bild bleibt.

**Kapitel 1 – Die Heizzentrale**
| Nr | Art | Text (Simon) | Licht / Finger | Weiter mit | Kamera, Sonstiges |
|---|---|---|---|---|---|
| T01 | H | „Hallo {Name}! Ich bin Simon und zeige dir, wie dein Dorf warm wird. Tippe auf die Heizzentrale.“ | Loch Heizzentrale, Finger | Heizzentrale antippen (öffnet hier **kein** Blatt) | Kamera steht auf der Heizzentrale (Zoom 3, Ziel 38 % Höhe). Karte blendet nach dem Namensfenster ein. Nach dem Tippen: kurzes Federn der Heizzentrale, Rauch wird für 2 s kräftiger |
| T02 | W | „Hier steht dein **Wärmeerzeuger**, ein **Hackschnitzelkessel**. Er verbrennt Holzreste und macht damit Wasser heiß.“ **[F]** | Loch Heizzentrale | [Weiter] | – |
| T03 | W | „Wie viel Wärme er in jedem Moment schafft, misst man in **Kilowatt (kW)**. Dein Kessel schafft {kessel_kw}.“ **[F]** (60 kW; Platzhalter mit Einheit, 13.15 K3) | Löcher Heizzentrale **und** Wärme-Pille („0 / 60 kW“) | [Weiter] | Die Wärme-Pille hüpft einmal (240 ms, 12.9) |
| T04 | W | „Das heiße Wasser fließt durch Rohre unter der Straße zu den Häusern. Das nennt man **Wärmenetz** oder **Nahwärme**.“ **[F]** | Loch Heizzentrale | [Weiter] | Nach [Weiter] fährt die Kamera (13.6) |
| T05 | W | „Diese Häuser heizen noch mit Öl – siehst du den grauen Rauch? Du willst die ersten zwei anschließen.“ | Löcher um beide Tutorial-Häuser | [Weiter] | **Kamerafahrt** zur Mitte der beiden Häuser, 1.200 ms. Abdunkeln erst nach der Ankunft |
| T06 | W | „Ein Haus braucht im Jahr {kwh} Wärme. An den kältesten Tagen braucht es bis zu {kw_ohne} gleichzeitig.“ **[F]** (15.000 kWh / 10 kW) | Loch Haus 1; darüber eine Info-Kapsel (Chip `neutral`, 26 px) „15.000 kWh im Jahr · bis 10 kW“ | [Weiter] | **kWh** wird hier eingeführt (fett) |
| T07 | W | „**kW** ist, wie viel Wasser gerade aus dem Hahn läuft. **kWh** ist, wie voll der Eimer am Ende ist.“ **[F]** | wie T06 | [Weiter] | Kein Bild nötig; der Vergleich steht für sich |

**Kapitel 2 – Planen mit Philipp**
| Nr | Art | Text | Licht / Finger | Weiter mit | Kamera, Sonstiges |
|---|---|---|---|---|---|
| T08 | H | „Leitungen baust du in **Bauabschnitten**. Tippe auf Bauen.“ | Loch [Bauen]-Rundknopf, Finger von links unten | [Bauen] antippen | Kamera bleibt |
| T09 | H | „Hier ist alles für dein Netz. Tippe auf Leitungen.“ | Loch Reiter „Leitungen“ | Reiter antippen | Entfällt, wenn das Baumenü schon auf „Leitungen“ steht |
| T10 | H | „Philipp plant, wo die Leitung in der Straße liegen soll. Tippe auf seinen Knopf.“ | Loch Knopf „Philipp: Neuen Bauabschnitt planen · {Preis}“ | Knopf antippen | Philipp (A51) sagt „Alles klar, {Name}, ich kümmere mich um die Planung“ auf dem Platz der Anleiter-Karte (13.3) |
| T11 | W | „Je mehr Häuser an einer Leitung hängen, desto mehr kW muss sie tragen – und desto dicker muss sie sein.“ **[F]** | Loch Kasten „Bauabschnitt“ mit Restzeit | [Weiter] erscheint erst, **wenn Philipp fertig ist**; bis dahin steht unten in der Blase gedämpft „Philipp plant noch … {Restzeit}“ (Manrope 600 12, `text_gedaempft`) | Planungszeit im Tutorial: **10 s** (Vorschlag, passt zu NR2 „erster Bauabschnitt in ca. 1 Minute“) |

**Kapitel 3 – Leitung ziehen**
| Nr | Art | Text | Licht / Finger | Weiter mit | Kamera, Sonstiges |
|---|---|---|---|---|---|
| T12 | H | „Fertig geplant! Nimm die {leitung} – sie trägt im Spiel bis {kap_kw}, genug für beide Häuser.“ **[F]** („25er“, 15 kW; 13.15 K3) | Loch Katalogkarte {leitung} | Karte antippen → Zeichenleiste öffnet | `{leitung}` = dünnste Leitung, die beide Tutorial-Häuser **mit Puffer** trägt (aus dem Katalog gerechnet, nicht fest „25er“; siehe Hinweis 13.9). Die Erst-Hilfe der Zeichenleiste (12.18 „Erste Nutzung“) erscheint im Tutorial nicht und gilt danach als gesehen |
| T13 | H | „Zieh die Leitung mit dem Finger von der Heizzentrale bis an beide Häuser. Folge der gelben Spur.“ | **Kein** Abdunkeln über der Karte; HUD abgedunkelt. Leitungs-Spur, Finger fährt die Spur ab (2.400 ms je Durchgang) bis zum ersten eigenen Strich | Beide Tutorial-Häuser sind über eingezeichnete Leitungen mit der Heizzentrale verbunden | Kamera: Heizzentrale + beide Häuser passen mit 24 px Rand in die freie Fläche (Zoom 2–3). Zwei-Finger-Zoom erlaubt. Farbknöpfe, Radierer, Zurück frei |
| T13b | (Zwischenmeldung) | „Das erste Haus ist erreicht. Jetzt weiter bis zum zweiten.“ | „Erreicht“-Zeichen über Haus 1 | ersetzt den T13-Text, sobald ein Haus erreicht ist; Schritt bleibt T13 | – |
| T14 | H | „Beide Häuser sind erreicht. Tippe auf Abschnitt abschließen.“ | Loch [Abschnitt abschließen] (Aktionsleiste der Zeichenleiste), Finger | Knopf antippen | Leiste schließt, das Baumenü öffnet **nicht** wieder (13.15 K8), Kamera bleibt. Eine NR18-Warnung darf hier nicht kommen (13.9) |

**Kapitel 4 – Übergabestationen**
| Nr | Art | Text | Licht / Finger | Weiter mit | Kamera, Sonstiges |
|---|---|---|---|---|---|
| T15 | H | „Damit ein Haus die Wärme nehmen kann, braucht es eine **Übergabestation**. Tippe auf das erste Haus.“ | Loch Haus 1, Finger | Haus 1 antippen → Hausblatt öffnet | Kamera: Haus 1 in die Mitte der freien Fläche (12.21 Punkt 4, aber 38 % Höhe) |
| T16 | W | „Sie holt die Wärme aus dem Netz ins Haus. Ein **Wärmetauscher** trennt dabei das Netzwasser vom Heizwasser im Haus.“ **[F]** | Loch Kasten „Übergabestation wählen“ | [Weiter] | Das Blatt scrollt so, dass der Kasten ganz sichtbar ist |
| T17 | H | „Nimm die mit **Pufferspeicher**. Ihr Tank sammelt Wärme vorab, so reichen {kw_puffer} statt {kw_ohne} aus dem Netz – genauso warm.“ **[F]** (7,5 kW / 10 kW; gekürzt 06.11., 13.15 K1) | Loch Knopf „Puffer-Übergabestation“ (Variante `geld`, Preis in Zeile 2); zweites Loch ohne Finger um Haus 1 auf der Karte | Knopf antippen (Kauf) | Wandstation sichtbar, aber gesperrt nach 12.19 mit Zeile 2 „später wählbar“ und Hinweis „Im Tutorial nimmst du den Standard. Die Wandstation kannst du später wählen.“ (siehe Frage T-F2). Nach dem Kauf schließt das Blatt von selbst (200 ms) |
| T18 | H | „Prima! Jetzt bekommt das zweite Haus auch eine. Tippe darauf.“ | Loch Haus 2, Finger | Haus 2 antippen | Kamera: Haus 2 in die Mitte der freien Fläche |
| T19 | H | „Wieder die Puffer-Übergabestation, bitte.“ | Loch Knopf „Puffer-Übergabestation“ | Kauf | Blatt schließt von selbst |

**Kapitel 5 – Bauen**
| Nr | Art | Text | Licht / Finger | Weiter mit | Kamera, Sonstiges |
|---|---|---|---|---|---|
| T20 | H | „Fehlt nur noch das Material. Tippe auf Bauen.“ | Loch [Bauen] | [Bauen] antippen | Baumenü öffnet auf „Leitungen“ (zuletzt gewählter Reiter); sonst Zwischenschritt wie T09 |
| T21 | H | „Tippe auf Laura. Sie bestellt Rohre und Stationen, dann wird gebaut.“ | Loch Knopf „Laura: Material bestellen · {Preis}“ | Knopf antippen | Laura (A51) meldet sich auf dem Platz der Anleiter-Karte. Danach schließt das Baumenü von selbst; Kamera fährt auf die Mitte der Baustelle (1.200 ms) |
| T22 | W | „In echt dauert so ein Bau einige Wochen. Für dich geht es heute schneller.“ **[F]** | kein Abdunkeln; Gerüst, Monteur und Bautimer laufen | [Weiter] | Bauzeit im Tutorial: **20 s** (Vorschlag). „Sofort fertig“ gesperrt |
| T23 | W | „Deine Kunden zahlen für jede kWh, die bei ihnen ankommt, und eine feste Grundgebühr. Das ist deine Einnahme.“ **[F]** | Loch Geld-Pille | [Weiter] erscheint erst, **wenn der Bau fertig ist**; bis dahin gedämpft „Gebaut wird … noch {Restzeit}“ | verbindet kWh mit Geld |

**Kapitel 6 – Warm!**
| Nr | Art | Text | Licht / Finger | Weiter mit | Kamera, Sonstiges |
|---|---|---|---|---|---|
| T24 | W | „Geschafft, {Name}! Beide Häuser heizen jetzt mit Wärme aus deinem Netz statt mit Öl.“ | Löcher um beide Häuser | [Weiter] | Bau fertig: Funken, Fenster leuchten bernstein, Öl-Rauch hört auf, Fließpunkte in der Leitung, Wärme-Pille zählt auf „15 / 60 kW“ hoch (bzw. Spielwert). Das ist der Höhepunkt – das Erkennungsmerkmal „Wärme leuchtet“ wird hier zum ersten Mal sichtbar |
| T25 | W, „Wusstest du?“ | „In jeder Leitung liegen zwei Rohre: Heißes Wasser fließt hin (**Vorlauf**), abgekühltes zurück (**Rücklauf**).“ **[F]** | Loch um ein Leitungsstück mit Fließpunkten | [Weiter] | Vorlauf/Rücklauf erst hier, weil man jetzt die Fließpunkte sieht und nicht vorher etwas Unsichtbares lernen muss |
| T26 | W | „Am Monatsende zahlen deine Kunden ihre Wärmerechnung. Damit schließt du die nächsten Häuser an.“ | kein Loch, Abdunkeln blendet aus | Knopf **[Los geht’s]** (`los`, statt [Weiter]) | Tutorial ist fertig (Merke im Spielstand). Anleiter-Karte gleitet hinaus, Zoomknöpfe, [Dörfer] und Auftragskarte kommen zurück, der erste Auftrag nach NR2 erscheint mit kurzem Federn |

**Hilfe nach drei Fehltipps** (13.7) – genaue Regel in 13.15 K4 (Handlungs-Schritt: Hilfe-Satz ersetzt den ganzen Blasentext; Erklär-Schritt: Text bleibt, „Tippe auf Weiter.“ gedämpft in der Knopfzeile):
| Schritt | Hilfe-Satz |
|---|---|
| T01 | „Tippe auf das große Gebäude, das gelb leuchtet.“ |
| T08, T20 | „Der Knopf Bauen ist unten rechts – er leuchtet gelb.“ |
| T09 | „Leitungen ist der Reiter mit dem Rohr – oben im Blatt.“ |
| T10, T21 | „Tippe auf den leuchtenden Knopf im Blatt.“ |
| T12 | „Tippe auf die leuchtende Leitungs-Karte.“ |
| T13 | „Leg den Finger auf die Heizzentrale und zieh ihn die gelbe Spur entlang.“ |
| T14 | „Unten in der Leiste: Abschnitt abschließen.“ |
| T15, T18 | „Tippe auf das leuchtende Haus.“ |
| T17, T19 | „Tippe auf Puffer-Übergabestation.“ |
| Erklär-Schritte | „Tippe auf Weiter.“ (gedämpft in der Knopfzeile, Text bleibt stehen – 13.15 K4) |

### 13.6 Kamera
- **Steht** in allen Schritten außer Kapitel 3 (Gesten aus). Ziel: Mitte der freien Breite, 38 % der Höhe, Zoom 3 am Handy, 1,9 am Desktop (Abschnitt 3).
- **Fahrten** (T05, T21): 1.200 ms, `kurve.weich`, Zoom darf sich dabei ändern. Während der Fahrt kein Abdunkeln, keine Eingabe, Anleiter-Karte bleibt stehen.
- **Weniger Bewegung:** statt Fahrt ein Schnitt mit Blende (Bild 150 ms dunkel → neue Lage → 150 ms hell).
- Geht die App während einer Fahrt in den Hintergrund, steht die Kamera beim Zurückkommen am Ziel.
- Nach dem Tutorial bleibt die Kamera, wo sie ist (auf den warmen Häusern); Gesten sind ab dann frei.

### 13.7 Zustände
| Zustand | Verhalten |
|---|---|
| **Erster Start** | Ladebild → Namensfenster (A79, Toast „Viel Erfolg …“ entfällt im Tutorial) → T01. Startdorf nach NR13: **keine Leitung**, beide Tutorial-Häuser ohne Anschluss und ohne Station, grauer Öl-Rauch; Wärme-Pille „0 / {kessel_kw} kW“ (Annahme, Frage T-F1) |
| **Falsch getippt** (außerhalb des Lochs) | Die Berührung kommt nicht beim Spiel an. Der Lochrand „stupst“ einmal (Rand wächst kurz auf 108 %, 240 ms), der Finger erscheint sofort neu. Kein Ton, keine Meldung, kein Rot – es ist kein Fehler. Nach **drei** Fehltipps im selben Schritt erscheint der Hilfe-Satz aus 13.5. *Weniger Bewegung:* statt Stupsen wird der Rand für 600 ms 5 px dick |
| **Gesperrter Knopf im Licht-Bereich** (z. B. Wandstation, [X]) | liegt unter dem Abdunkeln → wie „falsch getippt“. Liegt er im Loch (nur die Zeichenleiste, T13), gilt 12.19: Wackeln + Hinweis, aber als Simon-Satz in der Blase statt als Meldung: [X]/[?]: „Die Leiste bleibt offen, bis beide Häuser erreicht sind.“ |
| **Abschließen zu früh** (T13, noch nicht beide Häuser erreicht) | [Abschnitt abschließen] gesperrt nach 12.19/12.21, Zeile 2 „noch 1 Haus fehlt“ (17 Zeichen) bzw. „2 Häuser fehlen“ (15 Zeichen; Klärung 13.15 K11) (≤ 18 Zeichen, geschütztes Leerzeichen), Hinweis in der Blase: „Zieh die Leitung bis an beide Häuser – folge der gelben Spur.“ Mit 0 Leitungen gilt weiter B6 „nichts gezeichnet“ |
| **Leitung neben der Spur** | erlaubt (kostet nur etwas mehr). Radierer und Zurück funktionieren normal. Der Schritt prüft nur „beide Häuser verbunden“ |
| **Zurück nimmt ein Haus wieder weg** | „Erreicht“-Zeichen verschwindet, Blase springt auf den T13-Text zurück |
| **Kamera verlassen** (nur Kapitel 3 möglich) | Ersetzt durch eine **Kamera-Grenze** in Kapitel 3 (13.15 K5): Die Bildmitte bleibt im Rahmen um Heizzentrale und beide Häuser, weiter hinaus als die Startansicht von T13 lässt sich nicht zoomen. Der Pfeil am Bildrand entfällt (nur nötig, falls die Grenze nicht baubar ist – dann Muss, kein Folgepaket) |
| **Warten** (Planung T11, Bau T23) | Restzeit gedämpft in der Blase, [Weiter] erst bei „fertig“. Die Wartezeit ist absichtlich mit einer Erklärung gefüllt |
| **App mitten im Tutorial geschlossen / neu geladen** | Der Spielstand merkt sich das Kapitel (an der einen Stelle im Spielstand, Architekturregel). Beim Wiederöffnen liest das Spiel den **Zustand** (nicht die letzte Blase) und setzt am Anfang des passenden Schritts wieder ein (Tabelle unten). Erste Blase dann: „Weiter geht’s, {Name}! Wir waren gerade bei: {Kapitelname}.“ mit [Weiter]. „Willkommen zurück“ (A38) entfällt im Tutorial; die Zeit wird trotzdem nachgerechnet (Planung/Bau können fertig sein) |
| **Hochformat** | Dreh-Hinweis wie immer; Tutorial ruht und läuft beim Zurückdrehen im selben Schritt weiter |
| **Update-Hinweis** (A83) | wartet bis nach T26 |
| **Fehler beim Speichern/Laden** | wie S0; der kaputte Stand wird nie still überschrieben |
| **Alter Spielstand** | sieht das Tutorial **nie** (13.8) |
| **Weniger Bewegung** | kein Fingertippen (Finger steht still), keine Spurfahrt (Spur zeigt nur Pfeile), Schnitt statt Kamerafahrt, kein Stupsen, Blasen ohne Gleiten (nur Blende) |
| **Desktop 1280×800** | gleicher Ablauf; Anleiter-Karte unten links (max. 460 px), Ziel auf 38 % Höhe. Tastatur: Enter tippt das Ziel im Loch an (auch Kartenobjekte), Tab erreicht nur Ziel und [Weiter] |

**Wiedereinstieg nach Neustart** (Zustand → Schritt):
| Zustand im Spielstand | weiter bei |
|---|---|
| Kapitel 1 (T01–T07) | T01 (Kapitel 1 ist kurz, rund 40 s) |
| kein Bauabschnitt, Kapitel ≥ 2 | T08 |
| Abschnitt in Planung | T11 (Restzeit läuft weiter) |
| Abschnitt offen, nicht beide Häuser verbunden | T12 (vorhandene Striche bleiben, Spur nur für den Rest) |
| Abschnitt offen, beide verbunden | T12 → T13 schaltet sofort weiter → T14 |
| Abschnitt wartet auf Bestellung, Haus 1 ohne Station | T15 |
| … nur Haus 2 ohne Station | T18 |
| … beide Stationen gekauft | T20 |
| Abschnitt im Bau | T22 |
| Bau fertig, Tutorial nicht als fertig gemerkt | T24 |
| Unbekannter Schrittname (ältere Fassung des Tutorials) | Anfang des gemerkten Kapitels; fehlt auch das, Ermittlung nur aus dem Zustand nach dieser Tabelle |

### 13.8 Alte Spielstände und Wiederholen
- Ein Spielstand **ohne** Tutorial-Merke gilt als „Tutorial fertig“ (alte Stände sehen es nie, Abnahme NR13). Nur `neuerSpielstand` setzt „Tutorial offen“.
- Alte Stände behalten ihr Dorf (auch ihre schon angeschlossenen Starthäuser); das neue Startdorf ohne Anschlüsse gilt nur für neue Spiele.
- „Spielstand löschen“ (S8) führt zu einem neuen Spiel – also wieder ins Tutorial.
- *Kann (nicht Teil dieses Auftrags):* „Einführung ansehen“ in den Dorf-Einstellungen als Wiederholung ohne Pflicht (nur die Erklär-Blasen über dem eigenen Dorf).

### 13.9 Hinweise an Projektleiter, Architekt und Fachprüfer
- **Werte müssen zusammenpassen** (Spielregel, kein Designwunsch, aber Voraussetzung für das Tutorial): Zwei Einfamilienhäuser mit Puffer brauchen 2 × 7,5 = 15 kW; die 25er trägt laut Katalog 15 kW (`kapazitaet_kw`, ggf. mal `spreizung_faktor`). Das ist **genau an der Grenze**. Ob dabei eine NR18-Warnung kommt, hängt an `≤` gegen `<` und am Faktor – nicht geprüft. Darum ist `{leitung}` in T12 berechnet: Reicht die 25er nicht, nennt Simon die 32er, und die Spur bleibt gleich. Test: Tutorial-Ablauf mit `{leitung}` endet ohne Warnung mit zwei warmen Häusern.
- **Geld:** Planung + Leitung + 2 Puffer-Stationen + Material müssen mit dem Startgeld (30.000 €) sicher gehen und danach Geld für den nächsten Schritt lassen. Vorschlag Test: Tutorial-Kosten ≤ Startgeld − 5.000 €. Kann es nie am Geld scheitern, braucht das Tutorial keinen Geld-Zustand.
- **Zeiten im Tutorial:** Planung 10 s, Bau 20 s (statt 30 s bzw. rund ein Spieljahr). Nur für diesen ersten Abschnitt, danach normale Zeiten (NR2).
- **Wo Tutorial-Logik liegt:** Schrittfolge und „Weiter mit“-Bedingungen sind Spiellogik ohne Grafik (Architekturregel) und damit ohne Bild testbar; die Oberfläche liest nur „aktueller Schritt, Ziel(e), Text, gesperrt“.
- **Begriffsliste für NR3:** Die fett markierten Sätze aus 13.5 sind gleichzeitig die Erklärsätze für die Begriffsliste im Kern (eine Quelle, nicht zweimal schreiben): Wärmeerzeuger/Hackschnitzelkessel (T02), kW (T03, T07), Wärmenetz/Nahwärme (T04), kWh (T06, T07), Bauabschnitt (T08), Übergabestation (T16), Pufferspeicher (T17), Vorlauf/Rücklauf (T25).
- **Für den Fachprüfer** (alle **[F]**): T02 „Holz aus Waldresten“ (Hackschnitzel stammen auch aus Sägeresten und Landschaftspflege – reicht die Vereinfachung?), T03/T07 kW als „wie viel auf einmal“ und Wasserhahn/Eimer-Vergleich, T04 „Wärmenetz oder Nahwärme“, T06 „bis zu 10 kW an kalten Tagen“ (= Jahresverbrauch ÷ 1.500 h als Spitze gedeutet), T11 dickere Leitung für mehr kW, T12 „trägt im Spiel bis 15 kW“, T16 Übergabestation trennt Netz- und Hauswasser (gilt für indirekten Anschluss mit Wärmetauscher, wie die Puffer-Station nach NR19), T17 Puffer senkt die nötige Netzleistung, T22 „in echt einige Wochen“, T23 Arbeitspreis je kWh plus Grundgebühr, T25 zwei Rohre Vorlauf/Rücklauf.
- **Fachprüfung übernommen (2026-11-06, vom Projektleiter angenommen):** T02, T03, T06, T07, T16, T17, T23 und PtH-Blase 2 sind auf den geprüften Wortlaut gebracht; T16 ist zugleich der Erklärsatz „Übergabestation“ der Begriffsliste. T06/T17: Der Puffer senkt nur die **Netzleistung**, nicht den Bedarf des Hauses – {kw_ohne} bleibt der Bedarf, {kw_puffer} ist das, was aus dem Netz kommt.
- **Beispielwerte erst nach NR19:** 7,5 kW (Puffer) und die 25er in T12/T17 gelten erst, wenn NR19 umgesetzt ist (Puffer-Station mit 2.000 Volllaststunden). Bis dahin sind es nur Beispiele; die Texte nehmen immer die Platzhalter aus dem Kern.
- **Tests dazu:** (1) „T17-Zahl {kw_puffer} = Jahresverbrauch ÷ `mit_puffer_h`“. (2) „Die in T12 genannte {leitung} trägt 2 × Bedarf mit Puffer **ohne** NR18-Warnung.“
- **Abgleich (Q11):** nicht eingeplant, bis Simon die Bedeutung klärt (Frage T-F4).

### 13.10 Neue Werte (Vorschlag für `design/tokens.json`, Gruppe `menue`)
Noch **nicht** in `tokens.json` eingetragen (dieser Auftrag ändert nur DESIGN.md); der Designer trägt sie mit der Baufreigabe ein oder der Projektleiter beauftragt das.
| Token | Wert | Zweck |
|---|---|---|
| `mass_px.anleiter_figur` / `anleiter_figur_klein` | 112 / 72 | Figur; klein bei freier Breite < 400 |
| `mass_px.anleiter_karte_max` | 460 | größte Kartenbreite |
| `mass_px.anleiter_rand` | 12 | Abstand zum Rand und zum Blatt |
| `mass_px.anleiter_platz_bauen` | 88 | frei für [Bauen] rechts unten |
| `mass_px.spot_abstand_knopf` / `spot_abstand_karte` | 8 / 12 | Loch größer als das Ziel |
| `mass_px.spot_ring` / `spot_ring_kontur` / `spot_schein` | 3 / 2 / 16 | Lochrand |
| `mass_px.finger` / `finger_weg` | 40 / 6 | Zeigefinger |
| `mass_px.spur_breite` / `spur_strich` / `spur_luecke` | 4 / 10 / 8 | Leitungs-Spur |
| `mass_px.kapitel_punkt` | 8 | Kapitel-Punkte |
| `farbe.spot_ring` | `#ffe08a` (= `fokus_auf_dunkel`) | Lochrand |
| `farbe.spot_schein` | `rgba(255,224,138,.55)` | warmer Schein |
| `farbe.spur` | `#ff8a1f` (= `naht_vorlauf`) | Leitungs-Spur |
| `zeit_ms.kamera_fahrt` | 1200 | Kamerafahrt |
| `zeit_ms.spot_wechsel` / `anleiter_wechsel` | 200 / 200 | Blenden |
| `zeit_ms.finger_verzoegerung` / `finger_tipp` / `finger_ruhe` | 600 / 400 / 1200 | Fingertakt |
| `zeit_ms.spur_finger` | 2400 | Finger fährt die Spur ab |
| `zeit_ms.stupsen` | 240 | Antwort auf Fehltipp |
| `faktor.anleiter_ziel_hoehe` | 0.38 | Ziel auf 38 % der Höhe |
| `mass_px.info_knopf` / `info_tippflaeche` | 24 / 44 | Info-Knopf (13.13) |
Spielwerte (Kern, nicht Tokens): Tutorial-Planung 10 s, Tutorial-Bau 20 s.

### 13.11 Barrierefreiheit (Pflichtboden)
- **Kontrast:** Text in der Blase `text` auf `tafel` 14,1:1, gedämpft 6,9:1 (12.10, gemessen). Lochrand hellgelb + 2 px Kontur: gegen die abgedunkelte Wiese und gegen die helle Wiese im Loch je mindestens 3:1 für eine der beiden Linien – **überschlagen, nicht gemessen**; im Foto mit Pipette prüfen.
- **Tippflächen:** [Weiter], [Los geht’s] 44 px hoch; alle Ziele im Loch sind die normalen Bedienelemente (≥ 44). Häuser und Heizzentrale sind bei Zoom 3 größer als 44 px.
- **Fokus:** Erklär-Schritt → Fokus auf [Weiter]. Handlungs-Schritt mit Bedienelement → Fokus auf das Element im Loch (sichtbarer Ring nach 12.10). Tab bleibt im Tutorial auf Ziel und [Weiter].
- **Vorleser:** Blasentext über `role="status"`, `aria-live="polite"` (wie die Sprecher-Karte). Spotlight und Finger `aria-hidden`. Kapitel-Punkte mit Vorlesetext. Kartenobjekte im Loch bekommen für die Dauer des Schritts einen Vorlesenamen („Heizzentrale“, „Haus 1“).
- **Weniger Bewegung:** siehe 13.7. **Farbe nie allein:** Ziel = Loch **und** Ring **und** Finger; „erreicht“ = Haken-Symbol **und** Grün.

### 13.12 Prüfkriterien (Fotos 844×390 und 667×375, Prüfumgebung wie 12.21 Punkt 4)
*Hinweis 06.11.: Die vom Projektleiter als „13.12“ angefragten Klärungen zum Bauplan stehen in **13.15** – die Nummer 13.12 bleibt bei den Prüfkriterien, weil der Bauplan NR13 auf „13.12 Punkt 4/5/6“ verweist.*
Fotos: T01, T03 (zwei Löcher), T05 nach der Fahrt, T10, T11 wartend und fertig, T13 frisch und nach dem ersten Haus, T13 [Abschließen] gesperrt, T14, T17, T21 mit Laura-Sprecher, T23 wartend, T24, T25, T26; dazu „falsch getippt“ nach drei Fehltipps; Wiedereinstieg nach Neuladen in T11 und T18; „Weniger Bewegung“ an bei T13.
1. Anleiter-Karte überdeckt nie Ziel, Seitenfläche, Zeichenleiste oder Anzeigenreihe (per Skript: Rechtecke schneiden sich nicht).
2. Text höchstens 4 Zeilen, nichts abgeschnitten, keine Scrollleiste in der Blase.
3. Erklär-Schritt: [Weiter] sichtbar und ≥ 44 px; Handlungs-Schritt: kein [Weiter], Finger auf dem Ziel.
4. Tippen außerhalb des Lochs ändert den Spielstand nicht (Spielstand vor/nach gleich).
5. Jeder Schritt schaltet nur mit seiner Handlung weiter (Abnahme NR13 „jeder Schritt wartet auf die richtige Handlung“).
6. Neues Spiel endet nach T26 mit genau zwei warmen Tutorial-Häusern, ohne NR18-Warnung, Tutorial als fertig gemerkt; neu laden → kein Tutorial.
7. Alter Spielstand (ohne Merke) → kein Tutorial, Dorf unverändert.
8. Alle Texte ≤ 120 Zeichen mit 20 Zeichen langem Namen, Zahlen aus dem Spiel (Test ändert einen Katalogwert → Text ändert sich mit).

### 13.13 Muster für Mini-Tutorials und Info-Knopf (NR3, erweitert Simon 2026-11-06)
Simon: Jede neu freigeschaltete Funktion bekommt beim ersten Mal ein kurzes Mini-Tutorial („was ist das, wofür ist es gut“); jedes Bauteil im Katalog hat einen Erklärsatz oder einen Info-Knopf (wofür gut, wofür nicht). Hier steht das **Muster**; die Texte je Funktion entstehen mit NR3 (Fachprüfer).

**A – Mini-Tutorial bei einer Freischaltung**
- **Auslöser:** Eine Funktion wird zum ersten Mal frei (Heizzentralen-Stufe nach NR1/A88, z. B. „Power-to-Heat-Kessel“, „Förderung“, „Spülbohrung“). Erscheint, sobald kein Blatt offen ist und kein Pflicht-Tutorial läuft; mehrere warten in einer Reihe (je Freischaltung eine, nie zwei gleichzeitig).
- **Aufbau:** dieselbe Anleiter-Karte wie 13.2 (Simon), **höchstens drei Blasen**, jede ≤ 120 Zeichen, ≤ 2 Sätze:
  1. **Was ist das?** – mit Loch um die Stelle, wo es die Funktion gibt (z. B. Katalogkarte im Reiter Heizhaus). Gold-Chip oben: „Neu freigeschaltet“.
  2. **Wofür gut – und wofür nicht?** – ein Satz Vorteil, ein Satz Grenze. Dieselbe Aussage steht später hinter dem Info-Knopf (eine Quelle).
  3. **„Wusstest du?“** (optional) – Bezug zur echten Welt nach NR3, Gold-Chip „Wusstest du?“.
- **Bedienung:** [Weiter] zwischen den Blasen; in der letzten Blase zwei Knöpfe: **[Zeig’s mir]** (`los`, öffnet Baumenü/Blatt an der Stelle) und **[Später]** (neutral). Anders als NR13 **nicht Pflicht**: Abdunkeln ja, aber [Später] beendet sofort; das Mini-Tutorial gilt dann als gesehen. Kein Handlungs-Schritt, kein Finger (Ausnahme [Zeig’s mir]: danach ein Loch mit Finger auf dem Bedienelement, bis es angetippt oder das Blatt geschlossen wird).
- **Merke:** „gesehen“ je Funktion im Spielstand (an der einen Stelle). Alte Spielstände: Funktionen, die schon frei sind, gelten als gesehen (kein Schwall von Mini-Tutorials nach einem Update).
- **Platz, Kamera, Zustände:** wie 13.3, 13.6, 13.7 (Neustart mittendrin → Mini-Tutorial kommt beim nächsten Öffnen von vorn; „Weniger Bewegung“ wie dort).

**B – Info-Knopf auf Katalogkarten und in Blättern**
Entscheidung: **beides** – ein kurzer Satz direkt auf der Karte **und** ein Info-Knopf für „wofür gut / wofür nicht“. Der Satz allein reicht nicht für die Grenze, ein Knopf allein wird übersehen.
```
Katalogkarte (quer, 2 Spalten, Bild 64 px – 12.7):
┌──────────────────────────────────┐
│ ┌──────────┐ Power-to-Heat   (i) │  Titel Lilita 16 · Info-Knopf rechts oben
│ │  Bild    │ Macht aus Strom      │  Erklärsatz Manrope 600 12, gedämpft,
│ │  64 px   │ Wärme.               │  höchstens 2 Zeilen, ≤ 52 Zeichen
│ └──────────┘ (Münze 250 €) 50 kW  │  Preis-Chip wie bisher
└──────────────────────────────────┘
```
- **Info-Knopf:** sichtbar 24 px Kreis, Fläche `tafel_innen`, 2 px `kontur`, gezeichnetes „i“ (neues Symbol `info`, Linienstil wie die übrigen – kein Schriftzeichen). **Tippfläche 44×44** (unsichtbar erweitert, ragt in den Kartenrand). Sitzt rechts oben in der Karte, 4 px vom Rand; der Titel kürzt davor nicht, er bricht um. Vorlesetext „Info zu Power-to-Heat-Kessel“.
- **Antippen:** Die Karte wird **nicht** gewählt (Info-Knopf fängt das Tippen ab). Es öffnet sich ein **Info-Kasten** über dem Katalog, im Blatt unter der Reiterleiste (nicht als zweites Blatt): Kasten nach 12.7 mit Mini-Kopfband (Name), darin zwei Zeilen mit Symbol 14 px davor: **Daumen hoch – „Gut für: …“** und **Daumen quer – „Nicht gut für: …“** (je ≤ 90 Zeichen), darunter optional „Wusstest du?“ und ein Knopf [Schließen] (neutral, 44). Tippen außerhalb oder erneut auf (i) schließt. Fokus geht in den Kasten und beim Schließen zurück auf (i); Esc schließt.
- **Gesperrte Karte:** Info-Knopf funktioniert trotzdem (man darf wissen, worauf man hinarbeitet); der Sperrgrund bleibt wie 12.19/12.20 auf der Karte.
- **Wo noch:** Gleicher Knopf im Kopf von Kästen in Blättern (z. B. „Übergabestation wählen“, „Wärmepreis“), rechts im Mini-Kopfband. Nicht an Knöpfen selbst (sonst zwei Ziele dicht nebeneinander).
- **Texte:** Erklärsatz und Gut/Nicht-gut stehen zentral im Kern (eine Quelle für Karte, Info-Kasten und Mini-Tutorial Blase 2), Fachaussagen **[F]**.

**Beispieltext Power-to-Heat-Kessel** (für den Fachprüfer, alle **[F]**):
| Stelle | Text | Zeichen |
|---|---|---|
| Erklärsatz auf der Karte | „Macht aus Strom Wärme – wie ein großer Tauchsieder.“ | 51 |
| Gut für | „Gut für: Zeiten mit viel billigem Ökostrom und schnelles Zuheizen an Spitzentagen.“ | 82 |
| Nicht gut für | „Nicht gut für: Dauerbetrieb – aus 1 kWh Strom wird nur 1 kWh Wärme, das wird teuer.“ | 83 |
| Mini-Tutorial Blase 1 | „Neu: der **Power-to-Heat-Kessel**. Er macht aus Strom Wärme, ähnlich wie ein Tauchsieder.“ | 85 |
| Mini-Tutorial Blase 2 | „Lohnt sich bei billigem Strom, etwa vom PV-Dach. Dauernd laufen lassen wird teuer – dafür ist dein Holzkessel da.“ | 113 |
| „Wusstest du?“ | „Manche Wärmenetze nutzen so Windstrom, der sonst abgeregelt würde, weil das Stromnetz ihn gerade nicht aufnimmt.“ **Erst mit Quelle (Recherche R2) freigeben.** | 112 |
Fachprüfer bitte prüfen: Wirkungsgrad „1 kWh Strom → 1 kWh Wärme“ (Elektrodenkessel nahe 100 %), „billiger Ökostrom“ als Vorteil, Abregelung von Windstrom als Praxisbezug, und ob „Dauerbetrieb teuer“ zur Spielregel `betriebskosten_eur_je_kw_min` passt.

### 13.14 Offene Fragen an Simon (mit Empfehlung)
- **T-F1 Startdorf ohne jede Leitung?** Bisher lag eine 40er-Hauptleitung mit T-Stück in der Straße (deine Wünsche A67/A74). Für NR13 ohne angeschlossene Häuser: **Empfehlung:** ganz ohne Leitung starten – der Spieler zieht seine allererste Leitung selbst ab der Heizzentrale. Eine liegende Hauptleitung ohne Häuser wäre im Tutorial schwer zu erklären. (Ladebild A82 bleibt, wie es ist.)
- **T-F2 Wandstation im Tutorial gesperrt?** NR19 sagt: Beim Anschluss wählt man. **Empfehlung:** Im Tutorial nur die Puffer-Übergabestation (Wandstation sichtbar, „später wählbar“), damit der erste Versuch sicher klappt; Simon erklärt dabei den Unterschied in kW. Ab dem dritten Haus frei wählbar.
- **T-F3 Überspringen für Tester?** Wer oft neu anfängt (du, Mitspieler beim Testen), muss jedes Mal ~5 Minuten Tutorial spielen. **Empfehlung:** kein Überspringen für Spieler; nur wenn in den Einstellungen das Vorführ-Tempo (×10/×60) an ist, gibt es im Namensfenster „Ohne Tutorial starten“.
- **T-F4 (= Q11) „Abgleich“:** Was meinst du damit? **Empfehlung:** Ist der hydraulische Abgleich gemeint, gehört er nicht ins erste Tutorial (zu viel auf einmal), sondern als kurze geführte Szene zum Rücklauf-Helfer ab Heizzentrale Stufe 3.
- **T-F5 Bild für die Figur:** Für die Figur brauche ich ein Foto von dir, Oberkörper, möglichst vor ruhigem Hintergrund, Blick leicht zur Seite (die Figur steht links und schaut nach rechts zur Sprechblase). Bis dahin der Platzhalter aus 13.2.

### 13.15 Klärungen zum Bauplan (06.11.)
Anlass: Kritiker-Bericht zum Bauplan NR13 Fassung 1 (`docs/pruefberichte/20261106-114059-kritiker-a46afa1f8187f3f64.md`). Designer, Modus `entwurf`. Diese Klärungen gehen bei Widerspruch den Einzelstellen in 13.2–13.11 vor; die betroffenen Zellen in 13.5/13.7 sind schon angepasst. (Angefragt als „13.12“; die Nummer bleibt bei den Prüfkriterien, auf die der Bauplan verweist.)
Zeichen sind mit einem Zählskript nachgezählt (sichtbarer Text ohne `**`, Name mit 20 Zeichen, Zahlen mit Einheit).

**K1 – T17 gekürzt.** Neuer Wortlaut:
„Nimm die mit **Pufferspeicher**. Ihr Tank sammelt Wärme vorab, so reichen {kw_puffer} statt {kw_ohne} aus dem Netz – genauso warm.“
- 117 Zeichen mit den Spielwerten („7,5 kW“, „10 kW“), 120 Zeichen im schlechtesten Fall (je 7 Zeichen, z. B. „12,5 kW“ / „17,5 kW“). Zwei Sätze.
- Fachlich unverändert: Mit Puffer kommen {kw_puffer} statt {kw_ohne} **aus dem Netz**, das Haus wird genauso warm. Der Satz „Tank sammelt Wärme vorab“ bleibt, weil T17 zugleich der Erklärsatz „Pufferspeicher“ der Begriffsliste ist (13.9). Nichts Neues behauptet; nur „zieht nur … – warm wird es genauso“ wurde zu „reichen … – genauso warm“. **Bitte an den Projektleiter:** Fachprüfer kurz den neuen Wortlaut bestätigen lassen (nur Wortlaut, keine neue Aussage).

**K2 – Satzregel „höchstens 2 Sätze“.**
- Satzende = „.“, „!“ oder „?“, gefolgt von Leerzeichen oder Textende. „…“ ist kein Satzende. Abkürzungen mit Punkt („z. B.“) sind in Blasen verboten.
- Ein **Zuruf** am Textanfang zählt **nicht** mit. Erlaubte Zurufe (feste Liste, damit der Test zählen kann): „Hallo {Name}!“, „Prima!“, „Fertig geplant!“, „Geschafft, {Name}!“, „Weiter geht’s, {Name}!“. Höchstens ein Zuruf je Blase, nur am Anfang.
- Damit bleibt **T01 unverändert** (Zuruf + 2 Sätze, 109 Zeichen mit 20-Zeichen-Namen). Die Regel deckt auch T18 („Prima! Jetzt bekommt … Tippe darauf.“), das sonst ebenfalls drei Sätze hätte.
- Wiedereinstieg: Endet der Kapitelname mit „!“ („Warm!“), entfällt der Schlusspunkt: „Weiter geht’s, {Name}! Wir waren gerade bei: Warm!“

**K3 – Platzhalter enthalten die Einheit.**
- Jeder Platzhalter für eine Größe liefert die **fertig formatierte Zahl mit Einheit**; im Text steht nie eine Einheit hinter einem Platzhalter. Der Name trägt die Einheit (Architekturregel): `{kessel_kw}` → „60 kW“, `{kap_kw}` (bisher `{kap}`) → „15 kW“, `{kwh}` → „15.000 kWh“, `{kw_ohne}` → „10 kW“, `{kw_puffer}` → „7,5 kW“, `{Preis}` → „2.000 €“, `{Restzeit}` → „8 s“. Ohne Einheit: `{Name}`, `{leitung}` („25er“), `{Kapitelname}`.
- Format: Tausenderpunkt, Dezimalkomma, höchstens eine Nachkommastelle, „,0“ fällt weg; zwischen Zahl und Einheit ein **geschütztes Leerzeichen** (U+00A0, zählt als 1 Zeichen), damit „7,5“ und „kW“ nie auf zwei Zeilen stehen. Gleiche Schreibweise wie in den Anzeigen-Pillen.
- Angepasst: T03 „Dein Kessel schafft {kessel_kw}.“, T12 „… bis {kap_kw}, genug für beide Häuser.“ T06 und T17 waren schon so.
- Gilt für Blasentexte, Hilfe-Sätze und die Info-Kapsel (K9). Die Anzeigen-Pillen zeigen weiter wie heute.

**K4 – Hilfe nach drei Fehltipps, genau.**
- **Handlungs-Schritt:** Der Hilfe-Satz aus 13.5 **ersetzt den ganzen Blasentext** (auch den Zuruf). Die Hilfe-Sätze stehen jeder für sich (längster 72 Zeichen, T13), die 120er-Grenze ist damit immer eingehalten. Grund: Eine Hälfte-Regel ergibt bei T13 146 Zeichen (gezählt) und ist bei Ein-Satz-Schritten (T19) nicht definiert. Nach drei Fehlversuchen braucht der Spieler eine klare Anweisung, keine Wiederholung der Erklärung.
- **Erklär-Schritt:** Der Text bleibt ganz stehen (er ist der Inhalt). Links in der Knopfzeile neben [Weiter] erscheint gedämpft „Tippe auf Weiter.“ (Manrope 600 12, `text_gedaempft`, 17 Zeichen, passt auch bei 256 px Blasenbreite neben den Knopf). Die Blase wird nicht höher. Während des Wartens (T11, T23, noch kein [Weiter]) steht dort die Restzeit; dann gibt es keine Hilfe.
- **Dauer:** Die Hilfe bleibt, bis der Schritt wechselt. In T13 ersetzt der Zwischenstand T13b („Das erste Haus ist erreicht …“) die Hilfe, weil die Rückmeldung wichtiger ist. Der Zähler läuft weiter; beim nächsten Fehltipp kommt die Hilfe zurück.
- **Vorrang in der Blase:** Sperr-Satz (gesperrter Knopf im Loch angetippt, 13.7 und K7) vor Hilfe-Satz vor T13b vor Grundtext. Ein Sperr-Satz bleibt bis zur nächsten Handlung im Loch (Strich, Zurück, Radierer, anderer Knopf).

**K5 – Pfeil am Bildrand: entfällt, ersetzt durch eine Kamera-Grenze (Muss).**
- Zweck des Pfeils war: Niemand verliert in Kapitel 3 die Häuser. Das erreicht eine Grenze einfacher und ohne zusätzliches Bedienelement.
- **Muss:** In Kapitel 3 bleibt die Bildmitte im Rechteck um Heizzentrale und beide Tutorial-Häuser. Hinauszoomen geht höchstens bis zur Startansicht von T13 (in der alles mit 24 px Rand passt), hineinzoomen bis 3. Am Rand bleibt die Karte einfach stehen, ohne Rückfedern. Gilt für Ziehen, Zwei-Finger-Zoom und Mausrad.
- Ist die Grenze technisch nicht baubar, ist der Pfeil nach der alten Fassung von 13.7 Pflicht in NR13 – **kein** Folgepaket, weil ein Pflicht-Tutorial ohne Rückweg festhängen kann.

**K6 – „Willkommen zurück“ (A38) entfällt im Tutorial ganz.** Es wird nicht für die Zeit nach T26 aufgehoben. Die Zeit wird trotzdem nachgerechnet (13.7). Grund: Nach T26 käme eine Abwesenheits-Bilanz aus dem Nichts; der Spieler war ja gerade da. Erst beim nächsten echten Wiederöffnen nach dem Tutorial erscheint A38 wie gewohnt. Der Update-Hinweis (A83) wartet weiter bis nach T26 und erscheint erst, wenn der erste Auftrag ausgefedert ist (frühestens 600 ms nach [Los geht’s]).

**K7 – Geld-Sperre beim Abschließen (neue Spielregel E-NR13-d), Wortlaut bestätigt und gefasst.**
- [Abschnitt abschließen] gesperrt nach 12.19, Zeile 2 (kurz, ≤ 18 Zeichen): **„Geld reicht nicht“** (17 Zeichen, statt „zu teuer“ – sagt, was fehlt).
- Satz in der Blase (wie die anderen Sperr-Sätze): **„Dann reicht dein Geld nicht mehr für die Stationen. Nimm mit Zurück ein paar Leitungen weg.“** (91 Zeichen, 2 Sätze). Simons Wort „nimm mit Zurück ein paar weg“ bleibt; „für die Stationen“ erklärt, warum es fehlt, obwohl noch Geld da ist.
- Fehlen gleichzeitig Häuser und Geld, gilt die Geld-Sperre (Zeile 2 und Satz), weil Weiterzeichnen es nur schlimmer macht.
- In T14 (beide Häuser erreicht, Geld fehlt) zeigt der Finger nicht auf einen gesperrten Knopf. **Muss:** Die Blase zeigt den Geld-Satz statt des T14-Textes. **Kann:** Loch und Finger wandern auf [↶ Zurück]. Sobald das Geld reicht, kommen T14-Text, Loch und Finger zurück.

**K8 – Nach „Abschnitt abschließen“ im Tutorial:** Die Zeichenleiste schließt, **das Baumenü öffnet nicht wieder**, die Kamera bleibt stehen. Danach kommt sofort T15. Grund: Ein offenes Baumenü würde das Hausblatt-Ziel in T15 verdecken und bräuchte ein eigenes [X], das im Tutorial gesperrt ist. Außerhalb des Tutorials bleibt das heutige Verhalten.

**K9 – Sichtbare Kleinigkeiten: Muss/Kann und Vorgabe** (für die Paketzuordnung durch den Architekten)
| Punkt | Muss/Kann | Vorgabe |
|---|---|---|
| Info-Kapsel T06/T07 | **Muss** | Chip `neutral` 26 px (12.7), Text „{kwh} im Jahr · bis {kw_ohne}“ (Spielwert 30 Zeichen) aus dem Kern. Sitzt mittig 8 px über dem oberen Rand des Lochs um Haus 1; reicht der Platz unter der Anzeigenreihe (top 64) nicht, 8 px unter dem Loch. Blendet mit T06 ein (200 ms), bleibt in T07, blendet mit T08 aus. Nicht tippbar, `aria-hidden` (die Blase sagt dasselbe). Bewegt sich mit der Kamera (in T06/T07 steht sie). |
| Erst-Hilfe der Zeichenleiste in T12/T13 | **Muss** | Öffnet die Zeichenleiste im Tutorial, klappt die Erst-Hilfe (12.18) **nicht** auf. Nach dem Tutorial gilt sie als gesehen: Auch beim nächsten Öffnen außerhalb des Tutorials erscheint sie nicht von selbst; [?] öffnet sie wie immer. Wann das Merkmal gesetzt wird (beim ersten Öffnen im Tutorial oder bei T26), entscheidet der Architekt – Hauptsache nicht beim Spielstart (Test „Startdorf gleich“). Wer mit „Ohne Tutorial starten“ beginnt, sieht die Erst-Hilfe normal. |
| Blatt scrollt zum Ziel (T16, auch T17/T19) | **Muss** | Allgemeine Regel: Liegt ein Ziel in einem scrollbaren Blatt nicht ganz im sichtbaren Bereich, scrollt das Blatt zuerst (kürzester Weg, 200 ms weich; bei „Weniger Bewegung“ sofort), **dann** erscheint das Loch. Während das Blatt scrollt, ist das Abdunkeln schon da, aber noch ohne Loch. Nach dem Scrollen 8 px Abstand zur Kante. |
| Vorlesenamen und Fokus (13.11) | **Muss** (Pflichtboden) | Fokus wie 13.11: Erklär-Schritt → [Weiter]; Handlungs-Schritt mit Bedienelement → das Element im Loch, mit sichtbarem Ring. Für Kartenobjekte im Loch (Heizzentrale, Haus 1, Haus 2) liegt für die Dauer des Schritts ein unsichtbares, fokussierbares Ersatz-Element über dem Loch, Name „Heizzentrale“ / „Haus 1“ / „Haus 2“. Enter löst den Tipp aus. Das Element lässt Fingertipps durch auf die Karte (`pointer-events: none`), der sichtbare Ring zeigt sich nur bei Tastaturfokus. Tab wechselt nur zwischen Ziel und [Weiter]. Blasentext über `aria-live="polite"`, Spotlight, Finger, Spur und Kapsel `aria-hidden`. |
| Finger fährt die Spur ab (T13) | **Muss** | Finger startet am Abgang der Heizzentrale, fährt die Spur in 2.400 ms gleichmäßig ab (über die Abzweigung zuerst zu Haus 1, dann weiter zu Haus 2), blendet am Ende aus, 600 ms Pause, von vorn. Verschwindet beim ersten eigenen Strich. „Weniger Bewegung“: Finger steht still am Abgang. |
| Wärme-Pille hüpft (T03) | Kann | Einmal 240 ms, Größe 1 → 1,08 → 1, `kurve.weich` (12.9). „Weniger Bewegung“: entfällt. Das Loch um die Pille zeigt sie auch ohne Hüpfen. |
| Heizzentrale federt, Rauch kräftiger (T01) | Kann | Nach dem Tipp: Federn 450 ms mit `plopp_staerke` (wie das „Erreicht“-Zeichen), Rauch 2 s mit doppelter Menge. „Weniger Bewegung“: entfällt. Die Rückmeldung auf den Tipp ist schon der Wechsel zu T02 (neue Blase, [Weiter]). |
| Loch um das Leitungsstück (T25) | **Muss** | Ziel ist das eingezeichnete Leitungsfeld auf dem Weg Heizzentrale → Haus 1, das der Mitte zwischen beiden am nächsten liegt; Loch als Ellipse um dieses Feld und seine beiden Nachbarfelder + 12 px. Darin laufen die Fließpunkte. |
| Wiedereinstieg „Wir waren gerade bei: {Kapitelname}“ | **Muss** | Kapitelname des Schritts, an dem es tatsächlich weitergeht (berechnet aus dem Zustand, 13.7), nicht aus der Merke. Beispiel: Merke 2, Zustand ergibt T15 → „Übergabestationen“. |
| Zwischenschritt Reiter „Leitungen“ (T09 / bei T20) | – | Öffnet das Baumenü im Tutorial immer auf „Leitungen“ (Bauplan), entfallen beide Schritte. Wird er doch gebraucht, gilt der T09-Text und die T09-Hilfe. |
| Technik der Löcher im Abdunkeln | – | Frei (Canvas oder CSS), solange das Bild 13.2 entspricht: Ellipse/Rechteck, 3 px hellgelb, 2 px Kontur außen, 16 px Schein. |

**K10 – Leitungs-Spur T13 (nur Gestaltung).**
- **Wann:** erscheint mit T13 (Zeichenleiste offen), **nicht** in T12 (da ist die Karte abgedunkelt und das Ziel ist die Katalogkarte). Ab T14 ist sie ganz weg, auch wenn noch Spurfelder übrig sind (der Spieler darf neben der Spur zeichnen, 13.7).
- **Ebene:** Sie wird in der **oberen, jedes Bild neu gezeichneten Ebene** gezeichnet, nicht in der zwischengespeicherten Bodenebene. Reihenfolge von unten: Boden/Straße → eingezeichnete Leitungen → **Spur** → Strich, der gerade gezogen wird → Gebäude → Kunden-Blasen und „Erreicht“-Zeichen → Finger. So liegt die Spur auf der Straße, endet sichtbar **an** den Häusern statt darüber, und der eigene Strich liegt über ihr.
- **Verschwinden:** Ein Spurfeld verschwindet, sobald auf diesem Feld eine Leitung eingetragen ist – auch schon während des Ziehens, wenn das Spiel die Felder dabei einträgt. Zurück oder Radierer bringen das Spurfeld zurück. Bleiben in einem Abschnitt der Spur nur einzelne Felder übrig, behalten sie ihre Pfeilspitzen (alle drei Felder, gezählt ab dem Abgang).
- **Wiedereinstieg** in T12/T13: Spur nur für die noch freien Felder (13.7).
- „Weniger Bewegung“: Die Spur ist ohnehin unbewegt; nur der Finger steht still (K9).

**K11 – Zeile 2 „Abschließen zu früh“ (Nachtrag 06.11., Tester-Bericht 20261106-121604):** „noch 2 Häuser fehlen“ (20 Zeichen) wird **„2 Häuser fehlen“** (15 Zeichen, geschütztes Leerzeichen zwischen „2“ und „Häuser“). „noch 1 Haus fehlt“ (17 Zeichen) bleibt. Die Grenze von 18 Zeichen bleibt, ein Umbruch ist nicht erlaubt. Grund: Auf 667 px ist die Zeichenleiste so schmal, dass Zeile 2 (Schloss 14 px + 4 px + Manrope 800 12) bei mehr als 18 Zeichen umbrechen würde. Der Knopf hätte dann drei Zeilen, und die Aktionsleiste müsste scrollen. Genau das schließt 12.18 aus. „noch“ sagt nichts Neues, die Zahl zeigt schon, was fehlt. Die verdeckte Abnahme (Zeile 730) und der Bauplan stellen auf den neuen Wortlaut um.

**K12 – T14-Geldmangel, Weg (b) des Projektleiters:** Einverstanden. Weg (b) ersetzt in K7 den Punkt „In T14 …“. Den Punkt „Kann: Loch und Finger auf [↶ Zurück]“ gibt es dann nicht mehr. Einwand (Muss): Solange in T13 beide Häuser erreicht sind, das Geld aber fehlt, müssen **alle** Häuser-Sätze dem Geld-Satz aus K7 weichen. Das gilt auch für den Sperr-Satz bei [X] („Die Leiste bleibt offen, bis beide Häuser erreicht sind.“) und für den Hilfe-Satz nach drei Fehltipps. Sonst sagt die Blase „zieh bis an beide Häuser“, obwohl beide schon erreicht sind.

### 13.16 Treue-Prüfung NR13 per Bildschirmfotos (Designer, Modus `treue`, 2026-11-06)
**Stand:** Commit `deec2dd` (Worktree `agent-ad2c2bb3b999e9c37`), Vite-Dev-Server, Chromium (Playwright), Touch an, Gerätefaktor 1, Vorführ-Tempo ×10, Spielername „Mila“. Ganzer Durchlauf T01–T26 in **844×390** und **667×375**, je mit Neuladen in T18 (Wiedereinstieg). Fotos: `docs/fotos/nr13/<Größe>_<Schritt>.png` (83 Stück). Messwerte je Foto per Skript (Kartenrechteck, Lochränder, Zeilenzahl, Überlauf, Tippflächen); Abdunkeln per Pipette nachgemessen. Keine Konsolenfehler in beiden Läufen.

**Ergebnis je Prüfpunkt**
| Prüfpunkt | Ergebnis | Beleg |
|---|---|---|
| Lesbarkeit Blase | Manrope 14 auf `tafel`, Fachbegriffe fett, Kapitel-Punkte zählen richtig (1 → 6). Höchstens 4 Zeilen (T17, T11/T16 auf 667), nie Überlauf, längster Text 117 Zeichen | alle `*_T*.png` |
| Abdunkeln | Pipette auf dem Dorfschild: 255/244/223 → 130/118/103 = genau `rgba(28,14,4,.55)` aus den Tokens. Lochrand hellgelb + Kontur + Schein wie 13.2; Rand gegen abgedunkelte Wiese rund 5:1 | `844x390_T01.png`, `_T05.png`, `_T24.png` |
| Löcher | T03 zwei Löcher, T05/T24 zwei Hausellipsen, T17 Knopf + Haus 1, T25 Leitungsstück mit Fließpunkten – wie entworfen. Abweichungen T01/T16 siehe Kann | `*_T03.png`, `*_T17.png`, `*_T25.png` |
| Anleiter-Karte nie über Ziel | In allen Schritten mit Loch frei (gemessen). **T13 nicht** (Muss M1) | `*_T13_spur.png` |
| Tippflächen ≥ 44 px | Kein sichtbarer Knopf unter 44 px (gemessen in jedem Foto) | Messliste |
| Farben/Tokens | Abdunkeln, Lochrand, Spur orange, [Weiter]/[Los geht’s] grün `los`, „Wusstest du?“-Chip gold – wie Vorgabe | `*_T13_spur.png`, `*_T25.png`, `*_T26.png` |
| Zeile 2 der Knöpfe | „noch 1 Haus fehlt“, „Geld reicht nicht“, „nichts gezeichnet“, „später wählbar“ jeweils eine Zeile, nichts abgeschnitten, auch auf 667 | `667x375_T13b.png`, `_T13_geldmangel.png` |
| Wackeln [X] (T13) | Wackelt einmal waagrecht (Bild nach 40 ms verschoben, danach wieder ruhig); Satz kommt als Simon-Blase, kein Toast | `*_T13_X_wackeln_40ms.png`, `*_T13_X_satz.png` |
| Hilfe nach 3 Fehltipps | T01: Hilfe-Satz ersetzt den Text. T02: Text bleibt, „Tippe auf Weiter.“ gedämpft links neben [Weiter] (K4). T13: Sperr-Satz hat Vorrang vor der Hilfe (K4 Vorrang) – richtig | `*_T01_hilfe_nach_3_fehltipps.png`, `*_T02_hilfe_erklaerschritt.png`, `*_T13_hilfe_nach_3_fehltipps.png` |
| T13b / Abschließen zu früh | T13b-Text mit Haken über Haus 1; Tipp auf gesperrtes [Abschließen] → „Zieh die Leitung bis an beide Häuser – folge der gelben Spur.“ | `*_T13b.png`, `667x375_T13b_abschliessen_gesperrt.png` |
| T13 Geldmangel (K7/K12) | Blase zeigt den Geld-Satz, Zeile 2 „Geld reicht nicht“, auch [X] und [Abschließen] zeigen den Geld-Satz statt Häuser-Satz; Schritt bleibt T13, nach Geld-Rückgabe T14 | `*_T13_geldmangel*.png`, `*_T14.png` |
| T16 Stationswahl | Wandstation sichtbar, Schloss, „später wählbar“, Satz darunter. Loch siehe Kann K2 | `*_T16.png`, `*_T17.png` |
| T22 / T24 / T25 / T26 | Höhepunkt sichtbar (Fenster bernstein, Fließpunkte, 15/60 kW), T26 ohne Loch mit [Los geht’s] | `*_T22.png` … `*_T26.png` |
| Ende | Auftragskarte federt (150/300 ms größer, ab 600 ms ruhig), [Dörfer] und kW-Schalter zurück, kein Abdunkeln | `*_Ende_150ms.png` … `_1500ms.png` |
| Wiedereinstieg | „Weiter geht’s, Mila! Wir waren gerade bei: Übergabestationen.“ mit [Weiter] und sichtbarem Fokusring, danach T18 | `*_Wiedereinstieg.png` |

**Muss**
- **M1 – T13: Anleiter-Karte verdeckt Haus 2 und das Ende der Spur.** Auf 667×375 liegt Haus 2 (Feld 12|14, Bildschirm 207|253) ganz unter der Karte (12…439 × 215…363), ebenso die Spurfelder 10|14 und 11|14; man sieht nur noch den Haken darüber. Auf 844×390 ist Haus 2 etwa zur Hälfte verdeckt. Verstößt gegen 13.3 „nie über dem Ziel“ und Skizze 13.4 C. Der Browser-Test merkt das nicht, weil T13 kein Loch hat. Fotos: `667x375_T13_spur.png`, `667x375_T13_geldmangel.png`, `844x390_T13_spur.png`, `844x390_T13b.png`. **Abhilfe:** Die Regel „Karte nach oben links“ hilft hier nicht, weil die Spur fast die ganze Höhe braucht (oben würde die Karte Heizzentrale und Haus 1 verdecken). Darum in T13 die **Kamera** anpassen (13.4 C, 13.6): Rechteck aus Heizzentrale + beiden Häusern + 24 px Rand in die freie Fläche **zwischen Anzeigenreihe (64) und Oberkante Karte − 16** und links von der Zeichenleiste setzen, Zoom dafür bis 2 senken; diese Lage gilt zugleich als Grenze für K5. Test dazu: In T13 schneidet die Karte keinen Bildschirmpunkt von Spur, Heizzentrale und beiden Häusern (feldPunkt ± halbe Feldbreite) – 844 und 667.

**Kann**
- **K1 – T01/T02/T03: Loch um die Heizzentrale ragt in die Anzeigenreihe.** Die Ellipse (227 px, Oberkante −12) lässt Teile der Geld- und Wärme-Pille hell; das Ziel steht auf rund 26 % statt 38 % der Höhe. Abhilfe: Kamera wie 13.3 auf 38 % (Mitte bei 148 bzw. 143 px), dann bleibt die Ellipse unter 64. Fotos `*_T01.png`, `*_T03.png`.
- **K2 – T16: Loch umfasst das ganze Blatt samt Kopfband und [X].** Der Kasten „Übergabestation wählen“ ist höher als das Blatt; das Loch wird so groß wie das Blatt (667: Rand außerhalb des Bildes, gar kein Leuchten zu sehen). Abhilfe: Loch auf den sichtbaren Inhaltsbereich unter dem Kopfband beschneiden (8 px Abstand), Kopfband und [X] bleiben abgedunkelt. Fotos `844x390_T16.png`, `667x375_T16.png`.
- **K3 – kW-Schalter schaut hinter Simons Figur hervor** (unten links, dunkle Ecke neben dem Kreis), in jedem Schritt. Abhilfe: im Tutorial ausblenden wie Zoomknöpfe und [Dörfer] (13.5 Grundzustand), mit T26 zurück. Foto `844x390_T01.png` (unten links).
- **K4 – „später wählbar“ an den immer gesperrten Aktions-Knöpfen** (Verwerfen, Weiter einzeichnen, Sofort fertig, Expresslieferung): sichtbar unter dem Abdunkeln, verständlich, also **zulässig** (Rückfrage Entwickler-Bericht 12:49 damit bestätigt). „wählbar“ passt aber nur zu einer Auswahl (Wandstation). Besser für Aktionen: „nach dem Tutorial“ (17 Zeichen, ≤ 18). Wandstation behält „später wählbar“. Fotos `844x390_T12.png`, `844x390_T21.png`. Am [X] erscheint keine Zeile 2 – richtig.
- **K5 – Finger verdeckt die Preiszeile** beim Philipp- und Puffer-Knopf („2.0█ €“, „vom █etz“). Abhilfe: bei zweizeiligen Knöpfen Fingerspitze auf die Mitte von Zeile 1. Fotos `*_T10.png`, `*_T17.png`, `*_T19.png`.
- **K6 – Hauschip „8 kW“ neben Simons „7,5 kW“** (T17 sagt 7,5 kW, die Kundenschilder ab T22 zeigen gerundet 8 kW). Abhilfe: Schild mit einer Nachkommastelle nach K3-Format. Fotos `*_T24.png`, `*_T26.png`. (Für den Fachprüfer nur Hinweis, keine neue Aussage.)

**Nicht geprüft (mit Grund):** Wartezustand T11/T23 mit Restzeit in der Blase (bei Tempo ×10 schon fertig, bevor das Foto kommt – das Planungs-„noch 3 s“ im Kasten ist in `*_T10_philipp_spricht.png` zu sehen); „Weniger Bewegung“, Desktop 1280×800 und Hochformat (nicht beauftragt); Fokusring je Schritt außer Wiedereinstieg; Kamerafahrt-Blende.

### 13.17 NR20–NR22: Spur, zwei Leitungsgrößen im Tutorial, Überlast-Zeichen (Entwurf 2026-11-07, Fassung 2.1)
**Fassung 2.1 (2026-11-07, nach Kritiker M1 / Entscheidung Projektleiter):** Neu ist nur 13.17.8 „Eigener Abgang“: Satz `satz_eigener_abgang`, Streifen-Markierung auf dem fremden Stück, Rückführung zum Abzweig. Dazu angepasst: Vorrang der Sätze (13.17.2), Zustands-Tabelle (13.17.1), Tokens (13.17.4), Prüfkriterien (13.17.6). Alles andere gilt unverändert wie Fassung 2.
**Fassung 2 (2026-11-07, nach Bauplan `docs/bauplaene/NR20-22.md`):** Spur nach Befund B1 neu (Abzweig (10\|12), jedes Haus ein eigenes 25er-Stück, (10\|10) entfällt), Texte T13/T13w/T13h/Zwischenstand, Fachprüfer-Sätze „randvoll“ und „passt nicht zum Plan“ übernommen, „Vergrößern“ ohne eigene Geld-Sperre. Neu gegenüber dem Bauplan: Zielscheibe im Band statt Ring um Haus 1 in T13, Zug-Ende am Abzweig (13.17.2 „Zug über den Abzweig hinaus“). Geändert sind nur die markierten Stellen; 13.17.0 bleibt der Messbefund mit der alten Spur.
Anlass: Lastenheft NR20, NR21, NR22 mit Simons Antworten Q20–Q22. Designer, Modus `entwurf`. Grundlage: eigener Messlauf (Vite-Dev-Server, Chromium per Playwright, Gerätefaktor 2, Touch, Vorführ-Tempo ×10) bis T13 in 844×390 und 667×375, dazu ein Zug mit zwei Größen (32er bis zum ersten Haus, dann 25er). Fotos nur im Arbeitsordner (`scratchpad/t13-844.png`, `t13-667.png`, `t13-844-haupt32.png`, `t13-844-zwei.png`), nicht im Projekt. **13.17 geht bei Widerspruch den Stellen 13.2 (Leitungs-Spur), 13.3 (Karte in T13), 13.5 (T12–T14), 13.15 K9/K10 und Abschnitt 3/9 (Überlast rot) vor.**

#### 13.17.0 Befund heute (gemessen, 844×390, Zoom 2, Feld 52×26 px)
- Der ganze Weg (Heizzentrale, 6 Spurfelder, 2 Häuser) liegt in einem Fleck von rund **180×130 px** mitten in einem Dorf mit über 40 gleich aussehenden Häusern. Jedes Haus trägt dasselbe graue Schild „10 kW“. Die zwei Tutorial-Häuser unterscheiden sich durch **nichts** von den Nachbarn.
- Die Spur ist 4 px orange gestrichelt – im selben Ton wie die Dächer. Die „10 kW“-Schilder liegen zum Teil auf der Spur, der Finger deckt ihren Anfang zu.
- Die Anleiter-Karte ist 148 px hoch (Figur 112 px), die Blase aber nur zu 3 Zeilen gefüllt. Sie nimmt der Karte fast 40 % der Höhe; deshalb darf die Kamera nicht über Zoom 2 gehen (M1-Abweichung).
- Eingezeichnete Leitungen sind dünn und halbdurchsichtig (Plan). Nach dem Zug sieht man kaum, was man schon gezeichnet hat.
- Neu gemessen: Beginnt ein zweiter Zug auf dem **Ende** der eigenen Leitung, wird dieses Feld mit der neuen Größe **überschrieben**. Belegt: Erst 32er (10|10)–(10|13), dann 25er ab (10|13) ergibt `d32` auf (10|10)–(10|12) und `d25` auf (10|13). Das ist für NR21 wichtig (13.17.2 V1).

#### 13.17.1 NR20 – „Man sieht, wo man hin soll“ (T13)
**Grundidee:** Der Weg leuchtet, der Rest tritt zurück. Dafür gibt es fünf Bausteine, die alle die Sprache des Tutorials sprechen: *hell-dunkler Doppelrand mit warmem Schein = hier* (13.2 Lochrand).

**B1 – Ruhe im Bild (Muss)**
- **Leichter Schleier mit Gang:** Über der Karte liegt ein leichter Schleier `rgba(28,14,4,.30)` (neues Token `menue.farbe.schleier_leicht`, halb so stark wie das Abdunkeln). Ausgespart bleibt ein **Gang**: jede Raute der Spur × 1,5, die Heizzentrale und beide Tutorial-Häuser als Ellipse + 12 px. Der Rand ist weich (12 px Verlauf). Der Schleier **sperrt nichts**: Zeichnen bleibt überall erlaubt (13.7 „Leitung neben der Spur“). Er dunkelt nur den Hintergrund ab, damit die 40 anderen Häuser zurücktreten. Gemessen: Wiese mit Schleier zu Wiese ohne Schleier = 1,85:1 – der Gang ist klar zu sehen, die Nachbarschaft bleibt lesbar.
- **kW-Schilder aus** in Kapitel 3 (T12 bis T14), egal wie der kW-Schalter steht. Die Einstellung selbst bleibt unverändert, ab T15 gilt sie wieder.
- **Nur die zwei Tutorial-Häuser haben eine Blase** (den Ziel-Stecker aus B4). Andere Kunden-Blasen ruhen in Kapitel 3.
- Die Anzeigenreihe bleibt wie heute abgedunkelt (`abdunkeln` .55).

**B2 – Geisterleitung statt gestrichelter Linie (Muss, ersetzt die Leitungs-Spur aus 13.2 und K10)**
Die Spur zeigt **die Leitung, die hier hingehört, in ihrer echten Farbe** – wie eine Schablone zum Nachmalen. Mit NR21 hat sie **drei Stücke** (Fassung 2): **Hauptleitung** (10\|11) → (10\|12) in der Farbe von `{haupt}` (32er grün); **Hausanschluss Haus 1** (9\|12) → Haus (9\|13) und **Hausanschluss Haus 2** (10\|13) → (10\|14) → (11\|14) → Haus (12\|14), beide in der Farbe von `{anschluss}` (25er rot). Abzweig = (10\|12), das letzte Feld der Hauptleitung. Die Farbe stimmt mit dem Farbstreifen am Farbknopf der Zeichenleiste überein. So sieht man ohne Text, welchen Knopf man nimmt.
- **Band:** Breite `b = max(12, round(Feldbreite × 0,28))`, erwartet 17 px (844) bzw. 16 px (667). Aufbau von außen nach innen: 1,5 px `kontur` (Deckkraft 0,8), 1,5 px `tafel` `#fff4df`, Füllung in der Zielfarbe mit Deckkraft 0,75. **Warum der Doppelrand:** In der Zielfarbe allein hebt sich das Band nicht von der Straße ab (gerechnet: 1,0–1,6:1 bei allen acht Farben). Der helle Rand hat zur Straße 5,0:1, der dunkle zur Wiese 8,0:1.
- **Pfeile:** Je Feld eine Pfeilspitze in der Bandmitte, Breite `b × 0,6`. Sie zeigt zum **nächsten** Feld des Stücks, auf dem letzten Feld zum Ziel-Haus (also auf (9\|12) nach Süden, auf (10\|14) nach Osten). Ausnahme: Das Abzweig-Feld (10\|12) trägt statt des Pfeils die **Zielscheibe** (B4). Weiß mit 1,5 px `kontur`, wenn Weiß auf der Zielfarbe mindestens 3:1 erreicht (25er 4,1, 32er 3,3, 50er 6,3, 90er 4,8, 110er 6,5). Sonst in `kontur` (40er, 63er, 75er).
- **Aktives und ruhendes Stück:** Das Stück, das gerade dran ist, ist voll sichtbar. Die anderen haben Deckkraft 0,35 und keine Pfeile. Aktiv ist in T13 die Hauptleitung, in T13w beide Hausanschlüsse, in T13h zuerst der Hausanschluss Haus 1, nach dem Zwischenstand der für Haus 2. Man sieht also den ganzen Weg und weiß trotzdem, was jetzt dran ist.
- **Verschwinden:** Ein Feld des Bands verschwindet, sobald dort eine Leitung **in der richtigen Größe** liegt (Regel in 13.17.2). Liegt dort eine falsche Größe, bleibt das Band, und das Feld bekommt die gestrichelte Raute in der Zielfarbe (12.22, Deckkraft 0,8). Zurück und Radierer bringen das Band zurück.
- **Ebene:** wie K10. Reihenfolge von unten: Boden/Straße → eingezeichnete Leitungen → Band → Strich, der gerade gezogen wird → Gebäude → Blasen → Finger.
- ~~Kurzes A65-Bandstück zu Haus 1~~ – entfällt in Fassung 2: Haus 1 hat jetzt ein echtes Spurfeld (9\|12).

**B3 – Nächstes Feld (Muss)**
- Das erste noch offene Feld des aktiven Stücks bekommt eine **leuchtende Raute**: Raute × 0,92, Füllung `#ffe08a` mit Deckkraft 0,55, 3 px Rand `#ffe08a`, außen 2 px `kontur` (wie der Lochrand). Zur Straße 3,9:1. Ruhig, ohne Pulsieren.
- „Offen“ heißt: Auf dem Feld liegt keine Leitung der richtigen Größe. „Erste“ heißt: in Zugrichtung das erste offene Feld nach dem letzten richtigen Feld, das mit der Heizzentrale verbunden ist. Am Anfang ist das (10|11) direkt an der Heizzentrale (Fassung 2; (10|10) gehört nicht mehr zur Spur). Ist die Leitung neben die Spur gelaufen, gilt das offene Spurfeld, das dem Ende der eigenen Leitung am nächsten liegt.
- In T13w trägt das **Abzweig-Feld** (10|12) die Raute (der „Hier“-Punkt des Erklärsatzes; die Zielscheibe darin tritt so lange zurück). In T13h steht sie zuerst auf (9|12), nach dem Zwischenstand auf (10|13).

**B4 – Ziel-Häuser (Muss)**
- **Ziel-Stecker** über beiden Tutorial-Häusern vom Beginn von T13 an: dieselbe Form wie die Kunden-Blase (weiße Scheibe mit Spitze, weicher Schatten, Abschnitt 3). Innen eine Scheibe `#ffe08a` mit 2 px `kontur`, darin eine gezeichnete **Zielscheibe** (Ring + Punkt) in `kontur`, 11,9:1. Neues Symbol `zielscheibe` in `symbole.ts`, Linienstil wie die übrigen, kein Schriftzeichen. Er sitzt auf dem Platz des Erreicht-Zeichens und wird beim Erreichen zum grünen Haken (13.2, Federn 450 ms). Bei „Weniger Bewegung“ wechselt er ohne Federn.
- **Ring um das aktive Ziel-Haus:** Ellipse um das Haus + 12 px, 3 px `#ffe08a`, 2 px `kontur`, 16 px Schein – genau wie ein Lochrand, nur ohne Abdunkeln. **Fassung 2:** In T13 und T13w hat **kein** Haus den Ring – das Ziel von T13 ist der Abzweig, ein Ring um Haus 1 würde dazu verleiten, die 32er bis ans Haus zu ziehen. In T13h hat ihn zuerst Haus 1, nach dem Zwischenstand Haus 2. Ist ein Haus erreicht, verschwindet sein Ring. (Abweichung vom Bauplan P2 `ziel_ring` „in T13 Haus 1“ → in T13/T13w `null`.)
- **Zielscheibe im Band (neu, Fassung 2):** Auf dem Abzweig-Feld (10|12) sitzt in der Bandmitte das Symbol `zielscheibe` (Ring + Punkt) in `kontur` auf einer Scheibe `#ffe08a`, Durchmesser `b × 0,9`, ohne Blase. Es zeigt in T13 „bis hierher“. Bleibt sichtbar, wenn das Band auf (10|12) verschwindet (die 32er liegt richtig), und geht erst beim Wechsel nach T13h weg. In T13w liegt die Raute darüber.

**B5 – Finger zieht vor (Muss, ersetzt K9 „Finger fährt die Spur ab“)**
- Der Finger zeigt **Ziehen, nicht Tippen**. An der Fingerspitze liegt ein Druckpunkt (Kreis 10 px `#ffe08a`, 2 px `kontur`). Er drückt auf dem nächsten Feld auf (200 ms) und zieht dann das aktive Stück entlang bis auf das Ziel, 400 ms je Feld (Fassung 2 – T13: (10|11) → (10|12), endet **auf der Zielscheibe**, nicht am Haus = 800 ms; T13h Haus 1: (9|12) und aufs Haus = 800 ms; T13h Haus 2: (10|13), (10|14), (11|14) und aufs Haus = 1.600 ms). Hinter ihm füllt sich das Band in voller Zielfarbe (Deckkraft 1) – so sieht man, was beim Ziehen entsteht. Am Ende hebt er ab, die Füllung blendet in 200 ms aus, 600 ms Pause, dann von vorn.
- Er verschwindet beim ersten Berühren der Karte. Nach **4 s ohne Berührung** kommt er zurück und startet am **nächsten Feld** (B3), nicht am Anfang. Neues Token `zeit_ms.finger_wieder` 4000.
- Hand von rechts unten. Steht das Ziel näher als 60 px an der Zeichenleiste, kommt sie von links unten (13.2).
- **Weniger Bewegung:** Der Finger steht still mit Druckpunkt auf dem nächsten Feld. Kein Ziehen, keine Füllung. Die Richtung zeigen die Pfeile im Band.

**B6 – Kompakte Anleiter-Karte und größere Kamera in Kapitel 3 (Muss, ändert 13.3 und die M1-Abweichung)**
- In T13, T13w und T13h ist die Karte **kompakt**: Figur 72 px, Blase höchstens **3 Zeilen**, kein [Weiter]. Höhe 8 + 18 + 4 + 3 × 18 + 8 = **92 px**. Lage: links 12, unten 12. Breite min(460, freie Breite − 24) → 460 (844) bzw. 427 (667). Oberkante 286 (844) bzw. 271 (667). Alle Texte in Kapitel 3 (Grundtexte, Zwischenstände, Größen-, Sperr-, Hilfe- und Geld-Sätze) haben **≤ 96 Zeichen**. Damit passen sie in 3 Zeilen, auch bei 667 (Blase rund 347 px, innen rund 38 Zeichen je Zeile).
- **Kamera T13:** wie die heutige T13-Einpassung (Heizzentrale, Spur, beide Häuser, je Feldmitte ± halbe Feldbreite), aber in die freie Fläche **x 0 … Zeichenleiste, y 64 … Kartenoberkante − 16** mit **24 px Rand**, und zwar mit dem **größten Zoom ≤ 3, der passt**. Untergrenze 2 wie bisher. Gerechnet aus den Messwerten: rund **2,4 (844)** bzw. **2,3 (667)** statt 2. **Fassung 2: unverändert.** Der Rahmen umfasst weiter die Felder x 9 … 12, y 10 … 14 (Heizzentrale reicht bis y 10, Haus 1 liegt auf x 9, Haus 2 auf x 12/y 14); dass (10|10) wegfällt und (9|12) dazukommt, ändert die Außenkanten nicht. Damit ist der Weg rund 20 % größer, das Feld zum Treffen 62×31 statt 52×26 px, und der 24-px-Rand aus M1 ist wieder eingehalten. *Gerechnet, nicht gemessen* – der Bau misst nach. Die Kamera bleibt von T13 bis T14 stehen, ohne Sprung. Die Kamera-Grenze K5 gilt mit dieser Lage.

**Skizze 844×390 – T13 frisch (Zeichenleiste 216 px, Karte kompakt)**
```
┌──────────────────────────────────────────────────────────────┬─────────────────────────┐
│(Dorfschild)(€ 28.000)…  abgedunkelt .55                      │ Zeichnen     [?] [ X ]  │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│
│░░░ Schleier .30 ░░░░░░░░░░░░ ╭───────────╮ ░░░░░░░░░░░░░░░░░░│ [25][(32)][40][St.2]    │ 32 gewählt
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  HEIZZENTR.│ ░░░░░░░░░░░░░░░░░░│ bis 25 kW · 560 €/Feld  │
│░░░░░░░░░░░░░░░░░░░░░░░░░ ◆◆▼╯───────────╯ ← nächstes Feld    │ [Radierer] [↶ Zurück]   │
│░░░░░░░░░░░░░░░░░░░ ┄┄┄ ⊙ ══ (10|12) Abzweig, Zielscheibe     │ [T-Stück · ab Stufe 4]  │
│░░░░░░░ ◎ ( Haus 1 ) ┊  ┄ 25er rot, blass (Gang ohne Schleier)│                         │
│░░░░░░░░░░░░░░░░░░░░░░░░┄┄┄┄┄┄ 25er rot, blass ◎ ( Haus 2 )░░░│                         │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│                         │ y 270
│┌────┐┌───────────────────────────────────────────────┐░░░░░░░│                         │ y 286
││Fig.││ Simon                             ● ● ● ○ ○ ○ │░░░░░░░├─────────────────────────┤
││72  ││ Zieh die 32er von der Heizzentrale bis zur    │░░░░░░░│ [Abschnitt abschließen] │
│└────┘│ Abzweigung. Folge der Spur.                   │░░░░░░░│  nichts gezeichnet      │
└──────┴───────────────────────────────────────────────┴───────┴─────────────────────────┘
 ◎ = Ziel-Stecker · ◆◆ = leuchtende Raute (nächstes Feld) · ══ = Geisterleitung aktiv (32er, 2 Felder) · ⊙ = Zielscheibe im Band · ┄┄ = ruhend
 Finger: drückt auf ◆◆ (10|11), zieht bis auf ⊙ (10|12) (800 ms), Band füllt sich hinter ihm. Kein Ring um ein Haus.
```
**Feldplan der Spur (Fassung 2, Draufsicht, Grundlage für Band, Raute und Pfeile)**
```
         x=9            x=10                     x=11          x=12
 y=10    ·              Straße (kein Spurfeld)   ┌ HEIZZENTRALE 2×2 ┐
 y=11    ·              32er ▼  ◆◆ Start T13     └──────────────────┘
 y=12    25er ▼         32er ⊙  Abzweig          ·             ·
 y=13    ( Haus 1 ) ◎   25er ▼                   ·             ·
 y=14    ·              25er ▶                   25er ▶        ( Haus 2 ) ◎
```
Haus 1 hängt am Leitungsende (9|12), nicht an der vorbeilaufenden (10|13) (A57, `netz.ts` – laut Bauplan; Beleg kommt mit dem Test `test_nr21_spur_b1_nach_bau`). (10|12) liegt nur schräg an Haus 1 und schließt es nicht an (Nachbarschaft im Netz nur waagrecht/senkrecht, `netz.ts` `rund`, gelesen). Alle sechs Spurfelder sind im Standard-Startdorf frei (Probelauf mit `neuerSpielstand`, Ergebnis gesehen).
**667×375:** gleicher Aufbau. Zeichenleiste 216 px, freie Breite 451, Karte 427 × 92 (Oberkante 271), freie Fläche für den Weg y 64 … 255, Zoom rund 2,3. Die Pfeile und der Doppelrand bleiben gleich groß (Mindestband 12 px).

**Zustände NR20** (alle bei 844 und 667)
| Zustand | Bild |
|---|---|
| T13 frisch | wie Skizze: Gang, Band Hauptleitung aktiv, beide Hausanschlüsse blass, Raute auf (10\|11), Zielscheibe auf (10\|12), **kein** Ring um ein Haus, Stecker über beiden Häusern, Finger zieht bis zur Zielscheibe |
| teilweise gezeichnet | Band nur noch auf den offenen Feldern, Raute auf dem nächsten Feld, Finger weg (kommt nach 4 s wieder, ab Raute) |
| neben der Spur gezeichnet | erlaubt; Band bleibt auf den Spurfeldern, Raute auf dem Spurfeld, das dem Leitungsende am nächsten liegt |
| Hauptleitung bis Abzweig mit `{haupt}` (Fassung 2) | Band der Hauptleitung weg, Zielscheibe bleibt, Häuser behalten ihre Stecker (noch nicht erreicht) → **T13w** |
| Zug läuft über den Abzweig hinaus (Fassung 2) | Schritt bleibt T13, bis der Finger abhebt; Felder hinter dem Abzweig in `{haupt}` zeigen die gestrichelte Raute, Satz „Hausanschluss zu dick“, Ring ohne Finger um `{anschluss}` (13.17.2 „Zug über den Abzweig hinaus“) |
| falsche Größe gezeichnet | Feld zeigt die gezeichnete Leitung **und** die gestrichelte Raute in Zielfarbe, Band bleibt; Größen-Satz in der Blase (13.17.2); Ring ohne Finger um den richtigen Farbknopf |
| falsche Größe gewählt, noch nicht gezeichnet | Ring ohne Finger um den Farbknopf des aktiven Stücks; die Blase bleibt, wie sie ist |
| Zurück/Radierer nimmt ein Feld der Hauptleitung weg | Band kommt dort zurück, Schritt springt auf T13 zurück (auch aus T13w/T13h), Ring an keinem Haus |
| Zurück/Radierer nimmt einen Hausanschluss weg (T13h/T14) | Haken → Stecker, Band zurück, Ring auf dieses Haus, Schritt T13h (bei Haus 1 ohne Zwischenstand) |
| Eigener Abgang von der Heizzentrale zu einem Tutorial-Haus (Fassung 2.1) | fremdes Stück gestreift, Satz `satz_eigener_abgang`, Zielscheibe auf (10\|12) wieder da, Band und Raute des betroffenen Hauses ab dem Abzweig, Ring um das Haus, Ring ohne Finger um [Zurück] bzw. [Radierer] (13.17.8) |
| Geld fehlt (K7/K12) | Geld-Satz hat Vorrang vor allem anderen, sonst unverändert |
| Wiedereinstieg T12/T13 | Band nur für offene Felder, Schritt aus dem Zustand (Tabelle 13.17.2) |
| Weniger Bewegung | Finger steht auf der Raute, kein Federn am Stecker, Pfeile zeigen die Richtung |
| Desktop 1280×800 | gleich; Karte unten links, kompakt, Zoom nach derselben Regel |

#### 13.17.2 NR21 – Hauptleitung und Hausanschluss (T12–T14)
**Prinzip:** Ein einziger zusätzlicher Handgriff (Größe wechseln). Den Rest erklären Farbe und Band. Die Größen: `{haupt}` = **feste Tutorial-Vorgabe 32er** (Spielentscheidung mit Reserve, keine Fachregel – Fachprüfer/Projektleiter 2026-11-07; nicht „dünnste, die trägt“, das wäre die 25er). `{anschluss}` = dünnste Leitung, die ein Haus mit Puffer trägt (25er). Neue Platzhalter `{kw_summe}` (Netzleistung beider Häuser, Beispiel „15 kW“) und `{kw_puffer}` (wie T17, „7,5 kW“). Format nach K3.

**Schritte** (ersetzen T12–T14 in 13.5; T13b entfällt)
| Nr | Art | Text (Simon) | Zeichen | Licht / Finger | Weiter mit |
|---|---|---|---|---|---|
| T12 | H | „Fertig geplant! Zuerst die **Hauptleitung**: Nimm die dicke {haupt}, sie trägt die Wärme für beide Häuser.“ **[F]** | 99 | Loch Katalogkarte `{haupt}`, Fingerspitze auf Zeile 1 (13.16 K5) | Karte antippen → Zeichenleiste mit `{haupt}` gewählt |
| T13 | H | „Zieh die {haupt} von der Heizzentrale bis zur Abzweigung. Folge der Spur.“ (Fassung 2, Bauplan E8 – bestätigt) | 70 | 13.17.1: Band Hauptleitung aktiv, Raute (10\|11), Zielscheibe (10\|12), kein Haus-Ring, Finger zieht bis zur Zielscheibe | alle Felder der Hauptleitung (Heizzentrale bis einschließlich Abzweig) mindestens `{haupt}`; Wechsel erst, wenn der Finger abhebt |
| T13w | H | „Bis hier fließen {kw_summe} für beide Häuser, ab hier **je Haus nur** {kw_puffer}. Dafür reicht die {anschluss}.“ **[F]** (Fassung 2: „je Haus“ statt „nur … für eins“, weil jetzt zwei Stücke abgehen) | 91 (93 bei „12,5 kW“/„6,3 kW“) | **Ring um den Farbknopf `{anschluss}`** (Lochrand-Stil, Leiste nicht abgedunkelt), Finger tippt von links unten; Raute auf dem Abzweig-Feld (10\|12); beide Hausanschluss-Bänder werden aktiv | Farbknopf `{anschluss}` antippen |
| T13h | H | „Jedes Haus bekommt seinen eigenen **Hausanschluss**. Zieh die {anschluss} bis ans erste Haus.“ (Fassung 2) | 82 | Band Hausanschluss Haus 1 aktiv, Haus 2 blass; Raute (9\|12), Ring Haus 1, Finger zieht von (9\|12) aufs Haus | – (Zwischenstand, sobald Haus 1 richtig) |
| T13h Zwischenstand (ersetzt T13b) | H | „Das erste Haus hat seinen Hausanschluss. Jetzt zieh die {anschluss} zum zweiten Haus.“ (Fassung 2) | 78 | Haken über Haus 1 (Federn); Band Haus 2 aktiv, Raute (10\|13), Ring Haus 2, Finger zieht von (10\|13) bis auf Haus 2 | beide Häuser richtig angeschlossen: je ein eigenes Stück, das am Haus endet, genau `{anschluss}`, über den Abzweig |
| T14 | H | unverändert („Beide Häuser sind erreicht. Tippe auf Abschnitt abschließen.“) | 60 | unverändert | unverändert |

- **Der Erklärsatz ist T13w** (91 bzw. 93 Zeichen ≤ 96 für die kompakte Karte; bestätigt, Bauplan E8 / Entscheidung 2026-11-07). Er sagt mit den kW aus Kapitel 1, *warum* die Leitung dünner werden darf: Die Hauptleitung trägt die Summe, ab der Abzweigung trägt jedes Stück nur sein Haus. Das ist derselbe Inhalt wie der 120-Zeichen-Satz des Fachprüfers („… darum ist die Leitung dort dicker. Ab da reicht je Haus eine 25er.“), nur mit Zahlen statt „darum“. Der 120-Zeichen-Satz passt nicht in 3 Zeilen bei 667 (rund 38 Zeichen je Zeile) und wird nicht verwendet. Summe ohne Gleichzeitigkeit ist als Vereinfachung zulässig (Fachprüfer, Lücke G1 offen). **[F]** nur für die neue Wendung „je Haus nur“.
- **Fachbegriffe** neu in der Begriffsliste (NR3, 13.9): **Hauptleitung** (T12), **Hausanschluss** (T13h).
- **In T13w ruht das Zeichnen:** Ein Zug auf der Karte zählt als Fehltipp (der Ring am Farbknopf „stupst“, 13.7). So zieht niemand aus Schwung mit der dicken Leitung weiter. Radierer und Zurück bleiben frei.
- **Kapitel-Punkte** unverändert (Kapitel 3).

**Wann ist eine Größe richtig?** (nach der Rolle im Netz, nicht nach Spurfeldern – gilt auch neben der Spur)
- **Hauptleitung** = jedes Feld, über das Wärme für **beide** Häuser fließt (Heizzentrale bis einschließlich Abzweig-Feld). Richtig ab `{haupt}`. Dicker ist erlaubt (kostet nur mehr), dünner nicht.
- **Hausanschluss** = jedes Feld, das **nur ein Haus** versorgt (Fassung 2: Haus 1 **oder** Haus 2), und das Stück endet am Haus. Richtig ist genau `{anschluss}` – das ist die Lehre des Schritts.
- ~~Dieselbe Regel wie das Leitungsblatt nutzen~~ – Fassung 2: Der Architekt nimmt eine engere eigene Regel im Kern (Bauplan E3), weil die Blatt-Regel eine schräg neben Haus 1 endende Hauptleitung als Hausanschluss zählt. Einverstanden; Hauptsache, Satz, Band und Raute lesen dieselbe Regel.
- **Zug über den Abzweig hinaus (neu, Fassung 2, Muss):** Das Ende der Hauptleitung liegt mitten auf der Straße; wer im Schwung weiterzieht, malt die 32er auf (10\|13) oder (9\|12). Regel: Der Schritt wechselt erst beim **Abheben** des Fingers nach T13w. Felder, die derselbe Zug nach dem Abzweig noch belegt, gelten als „Hausanschluss zu dick“ (Satz unten, gestrichelte Raute) – keine stillen Sonderregeln, kein Fehltipp-Zählen. Der Zug selbst wird nicht abgebrochen. Zielscheibe, die farbig wechselnden Bänder (grün → rot) und der Finger, der auf der Zielscheibe abhebt, sollen das Überziehen selten machen. *Nicht geprüft*, wie oft es vorkommt – der Produktprüfer schaut darauf.

**Größen-Sätze** (Vorrang nach K4, Fassung 2.1: Geld-Satz > Sperr-Satz > **Eigener-Abgang-Satz (13.17.8)** > Größen-Satz > Hilfe-Satz > Zwischenstand > Grundtext)
| Fall | Satz | Zeichen |
|---|---|---|
| Hauptleitung zu dünn (z. B. 25er vor dem Abzweig) | „Hier fließt Wärme für beide Häuser, die {anschluss} wäre randvoll. Nimm die {haupt} und zieh drüber.“ (Fachprüfer, gesetzt) | 90 |
| Hausanschluss zu dick | „Für ein Haus reicht die {anschluss}. Tippe auf {anschluss_zahl} und zieh noch mal über dieses Stück.“ | 79 |
| [Abschnitt abschließen] bei falscher Größe | gesperrt nach 12.19, Zeile 2 **„Größe passt nicht“** (17 Zeichen); Satz: „Ein Stück passt nicht zum Plan. Zieh mit der richtigen Größe noch mal drüber.“ (Fachprüfer, gesetzt) | 77 |

(`{anschluss_zahl}` = „25“, die Aufschrift des Farbknopfs.) Die falschen Felder zeigen die gestrichelte Raute in Zielfarbe (12.22). Der richtige Farbknopf hat einen Ring ohne Finger.

**Neue und geänderte Sätze in Kapitel 3** (alle ≤ 96)
| Stelle | Satz | Zeichen |
|---|---|---|
| Hilfe T13, T13h (ersetzt 13.5) | „Leg den Finger auf das leuchtende Feld und zieh ihn die Spur entlang.“ | 69 |
| Hilfe T13w | „Tippe rechts in der Leiste auf {anschluss_zahl}.“ | 34 |
| Abschließen zu früh (ersetzt 13.7) | „Zieh die Leitung bis an beide Häuser – folge der Spur.“ | 54 |
| [X]/[?] (unverändert) | „Die Leiste bleibt offen, bis beide Häuser erreicht sind.“ | 56 |
„gelbe Spur“ kommt nirgends mehr vor: Die Spur hat jetzt die Farbe der Leitung.

**V1 – Voraussetzung im Spiel (entschieden: Weg (a), erweitert auf jede vorhandene Leitung, Bauplan E4).** Fassung 2: Die Erweiterung ist nötig, weil (10\|12) nach dem Anschluss von Haus 1 kein Leitungsende mehr ist und der Zug für Haus 2 dort ansetzen kann. Weg (b) unten ist erledigt. Ursprünglicher Text: Gemessen (13.17.0): Ein Zug, der auf dem eigenen Leitungsende beginnt, überschreibt dieses Feld mit der gewählten Größe. Wer nach T13w mit der 25er am Abzweig-Feld ansetzt (dort, wo die Leitung endet – das ist der natürliche Griff), macht den Abzweig zur 25er. Nach dem Bau wird die Leitung dann **vor** dem Abzweig dünner: Das ist eine Reduzierung mitten auf der Strecke (A67, Planungsfehler-Dreieck). Das Tutorial würde in seinen eigenen Fehler führen. Zwei Wege, Entscheidung beim Projektleiter:
- (a) **Empfehlung:** Ein Zug, der auf einem vorhandenen Leitungsende beginnt, lässt dieses Startfeld unverändert und zeichnet erst ab dem nächsten Feld. Das hilft auch außerhalb des Tutorials, weil Weiterzeichnen sonst still den Anfang umbaut.
- (b) Nur im Tutorial: Finger und Raute setzen auf (10|14) an (gemacht in T13h). Setzt jemand trotzdem am Abzweig an, greift „Hauptleitung zu dünn“ samt Raute. Das ist schlechter, weil es eine Fehlerschleife einbaut.
*Nicht geprüft:* ob ein Zug, der auf einem leeren Feld neben dem Leitungsende beginnt, sich anschließt (für Weg b nötig).

**Wiedereinstieg** (ergänzt die Tabelle in 13.7)
| Zustand | weiter bei |
|---|---|
| Abschnitt offen, Haus 1 nicht über richtige Hauptleitung verbunden | T12 (öffnet das Baumenü auf „Leitungen“, Regel 2026-11-06) |
| Hauptleitung richtig bis zum Abzweig (10\|12), nicht beide Häuser richtig angeschlossen | **T13w** (nach dem Neuladen ist die zuletzt gewählte Größe nicht bekannt). Von dort T13h; ist Haus 1 schon richtig, gleich mit dem Zwischenstand-Satz |
| beide richtig verbunden | T14 |

**Werte-Hinweise (Projektleiter/Fachprüfer, keine Designfrage):** Die Kosten steigen. Gemessen: Die 32er kostet 560 €/Feld statt 400 €. Fassung 2: 2 Felder 32er + 4 Felder 25er (statt 6 × 25er) = rund 2 × 160 = 320 € mehr als die alte Spur. Test 13.9 „Tutorial-Kosten ≤ Startgeld − 5.000 €“ neu rechnen. Test 13.9 (2) wird zu: „`{haupt}` trägt 2 × Bedarf mit Puffer, `{anschluss}` trägt 1 × Bedarf mit Puffer, beide ohne NR18-Warnung, nach dem Bau weder Überlast noch Planungsfehler.“

#### 13.17.3 NR22 – Überlast: Farbe bleibt, Warnzeichen dazu
**Entscheidung:** Eine überlastete Leitung behält ihre Durchmesserfarbe. Sie bekommt (1) ein **gelbes Warndreieck** an einem Pfosten über der Leitung und (2) einen **gelben Saum** an den Rändern des überlasteten Stücks. Nichts blinkt dauerhaft. Antippen öffnet das Leitungsblatt mit „Hier auf {Größe} vergrößern“ und Knopf.

**Warum gelb und nicht rot:** Rot ist schon zweimal besetzt: die 25er und das **Planungsfehler-Dreieck** (rot `#d8392f` mit weißem „!“, auf jedem Feld von Engpass, Reduzierung, Aufteilung – `szene.ts`). Gelb mit dunklem „!“ ist das bekannte Achtung-Schild. Die beiden Dreiecke unterscheiden sich nicht nur im Farbton, sondern auch in der **Helligkeit** (Gelb: relative Leuchtdichte 0,61, Rot 0,18) und in der Zeichenfarbe (dunkel auf hell gegen hell auf dunkel). So bleiben sie auch bei Rot-Grün-Schwäche unterscheidbar. Heute zeichnet der Code bei Überlast kein Dreieck, sondern lässt das Rohr rot blinken (4 Wechsel/s). Abschnitt 3 und 9 beschreiben ein Dreieck, das es nicht gibt.

**Warndreieck – Maße und Farben**
- Gleichseitiges Dreieck mit gerundeten Ecken (Radius 2), Kantenlänge `s = clamp(Feldbreite × 0,34, 16, 28)` px. Bei Zoom 2 (Feld 52) sind das 18 px, bei Zoom 3 (Startzoom Handy, Feld rund 78) 26 px, bei Zoom 1 der Mindestwert 16.
- Füllung **`#ffc531`** (= `menue.knopf.geld[0]`, neues Token `menue.farbe.ueberlast_zeichen`), Rand 2 px `kontur` `#3b1d0a`. Innen ein gezeichnetes „!“ in `kontur` (Strich + Punkt, Höhe 0,5 s) – 9,7:1 auf der Füllung. Neues Symbol `ausruf_dunkel` oder `ausruf` mit Farbangabe, kein Schriftzeichen.
- **Pfosten:** 2 px `kontur`, von der Leitungsmitte senkrecht nach oben, Länge `Feldbreite × 0,18`. Darauf sitzt die Unterkante des Dreiecks. So deckt das Zeichen nur einen 2-px-Strich der Leitung. Die Farbe bleibt links und rechts sichtbar.
- **Ebene:** in der Ebene der Blasen (über Gebäuden), damit kein Haus davor das Zeichen verdeckt.
- **Tippfläche:** 44 × 44 px um die Dreiecksmitte, unsichtbar erweitert. Das Antippen der Leitung selbst geht weiter wie heute.

**Kontrast auf allen acht Leitungsfarben** (WCAG-Formel gerechnet; für grafische Zeichen reicht nach 1.4.11 eine der beiden Linien mit ≥ 3:1)
| Untergrund | Füllung `#ffc531` | Rand `#3b1d0a` | erfüllt durch |
|---|---|---|---|
| 25er `#cf5646` | 2,6 | 3,7 | Rand |
| 32er `#4f9e62` | 2,1 | 4,7 | Rand |
| 40er `#78bde3` | 1,3 | 7,5 | Rand |
| 50er `#35609f` | 4,0 | 2,4 | Füllung |
| 63er `#dd79a9` | 1,8 | 5,4 | Rand |
| 75er `#e6b93f` | 1,2 | 8,3 | Rand |
| 90er `#946a45` | 3,0 | 3,2 | beide |
| 110er `#2b6a47` | 4,1 | 2,4 | Füllung |
| Straße `#6c7075` | 3,2 | 3,1 | beide |
| Wiese `#a8c486` | 1,2 | 8,0 | Rand |
Das Dreieck steht am Pfosten über der Leitung und hat deshalb meist Wiese oder Straße als Hintergrund. Die Tabelle gilt auch für den ungünstigen Fall, dass es über einer zweiten Leitung steht.

**Saum am überlasteten Stück**
- Auf jedem überlasteten Feld wird die dunkle Kante des Rohrs (heute `rgba(40,34,26,.4)`, Breite w + 2) ersetzt durch: außen `kontur` mit Deckkraft 0,55 (Breite w + 6), darin `#ffc531` (Breite w + 4), innen das Rohr in seiner Farbe (Breite w). Es bleiben also 2 px Gelb auf jeder Seite. Der Glanzstrich bleibt.
- Der Saum zeigt, **wie weit** die Überlast reicht, und die Farbe in der Mitte bleibt. Gelb zur Straße 3,2:1, die dunkle Außenlinie zur Wiese 8,0:1. Bei der 75er (gelb) wirkt das Rohr mit Saum nur breiter. Das ist hinnehmbar, weil das Dreieck dort mit dem Rand 8,3:1 erreicht.

**Bewegung**
- Erscheint eine Überlast neu, **federt** das Dreieck einmal (Größe 0 → 1,08 → 1, 450 ms, `plopp_staerke`). Danach steht es still.
- **Kein Blinken mehr**, auch nicht bei normaler Bewegung. Gründe: 12.9 („nichts pulsiert dauerhaft“) und NR12. Das heutige Blinken zwingt die Karte zum Dauerneuzeichnen (`szene-schluessel.ts` Zeile 94: Überlast = „langsam“). Aufmerksamkeit holen das Federn, die Engstellen-Raute (6 s nach Abschließen/Bestellen) und die Kunden-Blase „Leitung zu dünn“ an den kalten Häusern. → Frage an Simon F-NR22-1.
- **Weniger Bewegung:** kein Federn, Dreieck erscheint sofort.

**Wie oft auf langen Leitungen**
- Ein **Stück** = zusammenhängende überlastete Felder gleicher Größe (derselbe Begriff wie in `engstelle.ts`).
- Ein Dreieck steht auf dem **ersten Feld** des Stücks, von der Heizzentrale aus gezählt. Dort ist die Last am größten, und dort beginnt man beim Vergrößern.
- Bei langen Stücken kommt alle **8 Felder** ein weiteres Dreieck dazu (Feld 0, 8, 16 …), aber nicht, wenn es weniger als 4 Felder vor dem Ende des Stücks läge. Grund: Bei Startzoom 3 zeigt das Handy rund 10 Felder in der Breite. So ist von jedem Stück fast immer ein Dreieck im Bild, ohne dass eine Kette von Schildern entsteht. Der Saum zeigt den Rest.
- Treffen zwei Stücke mit unterschiedlicher Größe aufeinander, bekommt jedes sein eigenes Dreieck. Liegen zwei Dreiecke näher als 1,5 Felder beieinander, entfällt das spätere.

**Leitungsblatt beim Antippen** (Seitenfläche wie 5, Menü-Stil v2)
```
844×390: Seitenfläche 388 px                       667×375: 306,8 px (gleich, Text bricht früher um)
┌────────────────────────────────────┐
│ 25er-Leitung                 [ X ] │  Kopfband
│▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│
│ ╭ ▲ Überlastet ──────────────────╮ │  Kasten (12.7), Symbol = das Warndreieck 16 px
│ │ Hier auf 32er vergrößern        │ │  Manrope 800 15, `text`
│ │ Hier sollen 22 kW durch, die    │ │  Manrope 600 13, `text`
│ │ 25er schafft 15 kW. Häuser      │ │
│ │ dahinter bleiben kalt.          │ │
│ ╰─────────────────────────────────╯ │
│ Hauptleitung: versorgt weiter …    │  (bestehender Inhalt, scrollt)
│ Last  22 / 15 kW  ▓▓▓▓▓▓▓▓▓▓▓▓     │
│ [Ersetzen: 40er]  (ohne die 32er)  │
├────────────────────────────────────┤
│ [ Auf 32er vergrößern            ] │  Aktionsleiste, Variante `geld`
│ [ 6 Felder · 1.920 €             ] │  Zeile 2
└────────────────────────────────────┘
```
- **Kasten „Überlastet“ steht ganz oben** im Inhalt (vor „Hauptleitung …“). Gerechnet: Kopf 56 + Kasten rund 120 + Aktionsleiste 64 = 240 px. Das passt bei 667×375 (Blatt 311 px hoch) ohne Scrollen.
- **Titelzeile:** „Hier auf {Größe} vergrößern“ (Simons Wortlaut). {Größe} = `empfohlen` aus `engstelle.ts`, die kleinste Größe, die die Last trägt.
- **Satz:** „Hier sollen {last_kw} durch, die {typ} schafft {kap_kw}. Häuser dahinter bleiben kalt.“ (78 Zeichen mit Beispielwerten, 82 im langen Fall „1.120 kW … 980 kW“). Zahlen nach K3 mit geschütztem Leerzeichen. Ersetzt den heutigen Satz „Durch diese Stelle soll mehr Wärme fließen …“.
- **Hauptaktion in der Aktionsleiste** (Regel aus 5): Zeile 1 „Auf {Größe} vergrößern“ (höchstens 20 Zeichen, „Auf 110er vergrößern“), Zeile 2 „{n} Felder · {Preis}“. Werden das mehr als 18 Zeichen (z. B. „12 Felder · 11.520 €“), steht in Zeile 2 nur „{Preis}“, und der Satz im Kasten bekommt „Das Stück ist {n} Felder lang.“ angehängt. Bei 1 Feld: „1 Feld · {Preis}“.
- **Der Knopf plant den Ersatz für das ganze Stück** (alle Felder, Preis = Summe nach NR18 E1). Feld für Feld zu tauschen wäre bei langen Stücken mühsam, und ein halb vergrößertes Stück wäre wieder eine Reduzierung (A67). → Frage an Simon F-NR22-2.
- In der Reihe „Ersetzen: …“ darunter fehlt die empfohlene Größe, weil sie oben steht. Die anderen dickeren Größen bleiben für freie Wahl.
- **Auf der Karte**, solange das Blatt offen ist: Alle Felder des Stücks zeigen die gestrichelte Raute in der Farbe von {Größe} mit Deckkraft 0,5 (Vorschau, Sprache von 12.22). So sieht man, was „Hier“ meint. Die Kamera stellt das erste Dreieck des Stücks in die Mitte der freien Fläche (12.21 Punkt 4).

**Zustände des Blatts**
| Zustand | Kasten | Aktionsleiste |
|---|---|---|
| Bauabschnitt offen | wie oben | [Auf 32er vergrößern · 6 Felder · 1.920 €] `geld` → Antippen: Ersatz geplant für alle Felder, Rauten auf Deckkraft 0,8 (12.22), Kasten wechselt auf „geplant“ |
| Ersatz geplant | Titel „Wird auf 32er vergrößert“, Satz „Der Tausch kommt mit dem Bauabschnitt. Bis dahin bleibt es hier zu eng.“ (71) | [Zurücknehmen] neutral (wie „Ersatz zurücknehmen“) |
| kein offener Bauabschnitt | wie oben | Knopf gesperrt nach 12.19 mit dem heutigen NR18-Sperrgrund (`abschnittSperreKurz`). Antippen: Hinweis wie heute |
| Geld fehlt (Fassung 2) | wie oben | **keine eigene Geld-Sperre** am Knopf: Er bleibt aktiv wie heute „Ersetzen: …“, Zeile 2 zeigt den Preis. Bezahlt wird mit der Materialbestellung (NR18 E1); fehlt dort das Geld, greift die Geld-Sperre der Bestellung bzw. von [Abschnitt abschließen] wie überall. Grund: Der Knopf plant nur, er kauft nicht – eine Sperre hier wäre die einzige Stelle, die vor dem Bestellen nach Geld fragt (Bauplan E6, einverstanden) |
| Größe noch nicht frei | Titel unverändert | gesperrt, Zeile 2 „ab Stufe {n}“ (12.20) |
| keine Größe reicht (`empfohlen` = null) | Titel „Zu viel für eine Leitung“, Satz „Selbst die dickste Leitung reicht hier nicht. Leg einen getrennten Abgang.“ (74, Wortlaut wie `engstelleText`) | keine Hauptaktion |
| Stück im Bau | Titel „Wird gerade vergrößert“ | keine Hauptaktion |

**Zusammenspiel mit Engstellen-Raute und Warnliste (12.22)**
| Lage | Zeichen auf der Karte | Liste/Meldung |
|---|---|---|
| **Eingezeichnet, nicht gebaut**, wäre nach dem Bau zu dünn | **kein Dreieck** (eingezeichnete Leitungen gehören noch nicht zum Netz); rote Engstellen-Raute 6 s nach Abschließen/Bestellen wie heute | Warnliste „Nach dem Bau zu dünn“ im Baumenü wie heute |
| **Gebaut und überlastet** | gelbes Dreieck + Saum, dauerhaft bis behoben | Kunden-Blase „Leitung zu dünn“ an den kalten Häusern wie heute |
| Gebaut, überlastet, **Ersatz geplant** | Dreieck mit **Deckkraft 0,5** („erkannt, in Arbeit“), Saum bleibt, gestrichelte Raute in der Zielfarbe (12.22) | Reicht der geplante Ersatz nicht, steht das Stück in der Warnliste wie heute |
| beides gleichzeitig (gebautes Stück überlastet, Plan macht es schlimmer) | die rote Raute liegt 6 s **über** dem Saum, das Dreieck bleibt sichtbar | Warnliste wie heute |
| Planungsfehler (Engpass, Reduzierung, Aufteilung) | rotes Dreieck auf jedem Feld wie heute | Ist das Feld zugleich überlastet, steht das gelbe Dreieck am Pfosten darüber, das rote bleibt auf der Leitung. Das Leitungsblatt zeigt zuerst den Kasten „Planungsfehler“, darunter „Überlastet“ |
- **Gleiche Wörter überall:** Karte und Blatt sagen „Überlastet“ und „vergrößern“, Warnliste und Meldungen sagen „zu dünn“ und „Zeichne eine 32er darüber“ (geprüfter Wortlaut NR18, bleibt). Beide nennen dieselbe Größe, weil beide `empfohlen` nutzen.
- **Kann:** Im Hausblatt eines Hauses mit „Leitung zu dünn“ ein Knopf **[Zeig mir die Stelle]** (neutral, 19 Zeichen). Er fährt die Kamera zum ersten Dreieck des verantwortlichen Stücks und öffnet dessen Leitungsblatt. Das ist die Brücke vom kalten Haus zur richtigen Leitung.

#### 13.17.4 Neue Werte (Vorschlag für `design/tokens.json`, noch nicht eingetragen – wie 13.10)
| Token | Wert | Zweck |
|---|---|---|
| `menue.farbe.schleier_leicht` | `rgba(28,14,4,.30)` | Schleier mit Gang (T13) |
| `menue.farbe.ueberlast_zeichen` | `#ffc531` (= `knopf.geld[0]`) | Warndreieck und Saum |
| `menue.farbe.ziel` | `#ffe08a` (= `fokus_auf_dunkel`) | nächstes Feld, Ziel-Stecker, Ring, Druckpunkt |
| `menue.mass_px.geist_band_faktor` / `geist_band_min` | 0.28 / 12 | Geisterleitung |
| `menue.mass_px.geist_rand_hell` / `geist_rand_dunkel` | 1.5 / 1.5 | Doppelrand |
| `menue.faktor.geist_deckkraft` / `geist_ruhend` | 0.75 / 0.35 | aktives / ruhendes Stück |
| `menue.faktor.naechstes_feld` | 0.92 | Rautengröße |
| `menue.mass_px.gang_rand` | 12 | weicher Rand des Gangs |
| `menue.mass_px.anleiter_kompakt_hoehe` / `anleiter_kompakt_zeichen` | 92 / 96 | kompakte Karte Kapitel 3 |
| `menue.mass_px.druckpunkt` | 10 | Druckpunkt am Finger |
| `menue.zeit_ms.finger_je_feld` / `finger_aufdruecken` / `finger_wieder` | 400 / 200 / 4000 | Finger zieht vor |
| `karte.ueberlast.zeichen_faktor` / `zeichen_min` / `zeichen_max` | 0.34 / 16 / 28 | Kantenlänge Dreieck |
| `karte.ueberlast.pfosten_faktor` | 0.18 | Pfostenlänge |
| `karte.ueberlast.saum_px` | 2 | gelber Saum je Seite |
| `karte.ueberlast.wiederholen_felder` / `abstand_ende_min` | 8 / 4 | Wiederholung auf langen Stücken |
| `karte.ueberlast.geplant_deckkraft` | 0.5 | Dreieck bei geplantem Ersatz |
| `karte.fremd.dunkel` / `karte.fremd.hell` (Fassung 2.1) | Verweis auf `menue.farbe.kontur` `#3b1d0a` / `menue.farbe.tafel` `#fff4df` | Streifen auf dem fremden Stück (13.17.8) |
| `karte.fremd.streifen_px` / `winkel_grad` | 4 / 45 | Streifenbreite, Schräge |
| `karte.fremd.huelle_zusatz_px` / `rand_px` / `deckkraft` | 8 / 1.5 / 0.85 | Hülle = Rohrbreite + 8, Außenlinie, Deckkraft der Streifen |
Wegfallen: `leitung.ueberlast_a/b`, `zeit_ms.ueberlast_blinken_zyklus`, `bewegung_reduziert.ueberlast_blinken`, `menue.farbe.spur` (die Spur hat jetzt die Leitungsfarbe). Die Farben `#ff4a3a`/`#b8221a` stehen heute fest im Code (`szene.ts`) und nicht aus den Tokens – sie fallen mit NR22 weg.

#### 13.17.5 Barrierefreiheit
- **Farbe nie allein:** Weg = Gang **und** Band mit Doppelrand **und** Pfeile **und** Finger. Nächstes Feld = Raute **und** Doppelrand. Ziel = Stecker mit Zielscheibe **und** Ring. Richtige Größe = Farbe **und** Zahl am Farbknopf **und** Satz. Überlast = Dreieck **und** Saum (die Farbe des Rohrs ändert sich nicht mehr).
- **Kontraste** wie in den Tabellen oben, gerechnet mit der WCAG-Formel, noch nicht per Pipette im Foto.
- **Vorleser:** Ein überlastetes Stück im Leitungsblatt wird gelesen als „Überlastet. Hier auf 32er vergrößern. …“. Das Dreieck selbst ist `aria-hidden`, weil man es am Bildschirm über die Leitung antippt. T13w setzt den Fokus auf den Farbknopf `{anschluss}` (13.11).
- **Tippflächen:** Farbknöpfe 44, Dreieck 44 × 44, Aktionsknopf ≥ 44.
- **Weniger Bewegung:** Finger steht still, kein Federn (Stecker, Dreieck), kein Blinken (gibt es nicht mehr).

#### 13.17.6 Prüfkriterien (Fotos 844×390 und 667×375, Prüfumgebung wie 12.21 Punkt 4)
Fotos: T12, T13 frisch, T13 halb gezeichnet, T13 mit 25er auf der Hauptleitung (Größen-Satz), T13 mit 32er über den Abzweig hinaus gezogen, T13w, T13h frisch, T13h Zwischenstand nach Haus 1, T13h mit 32er zum Haus 2, T14; „Weniger Bewegung“ bei T13; Überlast an einer 25er, 40er, 75er und 110er (Zoom 3 und Zoom 1); langes Stück (≥ 17 Felder); Leitungsblatt in allen Zuständen der Tabelle; Überlast mit geplantem Ersatz; Überlast + Planungsfehler auf demselben Feld.
1. Kapitel 3: Die kompakte Karte schneidet keinen Punkt von Spur, Heizzentrale und beiden Häusern (Test aus M1). Der Rand zur Kartenoberkante beträgt mindestens 24 px, Zoom ≥ 2.
2. Alle Texte in Kapitel 3 ≤ 96 Zeichen, höchstens 3 Zeilen in der Blase bei 667.
3. Das Band verschwindet nur unter Leitungen der richtigen Größe. Die Raute steht auf genau einem Feld.
4. Ein neues Spiel endet nach T26 mit `{haupt}` vom Abgang bis zum Abzweig (10|12) und je einem eigenen `{anschluss}`-Stück zu beiden Häusern, nach dem Bau ohne Überlast und ohne Planungsfehler (Abnahme NR21).
4a. (Fassung 2) In T13 hat kein Haus einen Ring; die Zielscheibe steht auf (10|12). Der Kamera-Zoom ist derselbe wie vor Fassung 2 (rund 2,4 bzw. 2,3).
5. In T13w ändert ein Zug auf der Karte den Spielstand nicht.
6. Eine überlastete Leitung zeigt ihre Durchmesserfarbe (Pipette in der Rohrmitte = `leitung.dNN`), dazu Dreieck und Saum. Im Bild ist kein Wechsel zwischen zwei Rots zu sehen (zwei Fotos im Abstand von 250 ms gleich).
7. Je Stück höchstens ⌈n / 8⌉ Dreiecke, das erste auf dem Feld an der Heizzentrale.
8. Die Blatt-Aktion nennt dieselbe Größe wie die Warnliste für dasselbe Stück.
9. (Fassung 2.1) Mit eigenem Abgang (12\|12)→(12\|13) zu Haus 2 nach richtigem Haus 1: Blase zeigt `satz_eigener_abgang` (3 Zeilen bei 667), genau (12\|12) und (12\|13) sind gestreift, Zielscheibe auf (10\|12), Raute auf (10\|13), Ring um Haus 2, Ring um [Zurück]; kein Größen-Satz, keine gestrichelte Raute auf den gestreiften Feldern; kein Wechsel nach T14. Nach Zurück: Streifen und Satz weg, Zwischenstand-Satz, Finger zieht ab (10\|13). Zusätzliche Fotos: dieser Zustand vor und nach Zurück, bei 844 und 667.

#### 13.17.7 Offene Fragen an Simon (mit Empfehlung)
- **F-NR22-1 Blinken:** Du hast gesagt „bei Weniger Bewegung blinkt nichts“. **Empfehlung:** Es blinkt gar nicht mehr dauerhaft, auch nicht bei normaler Bewegung. Das Dreieck federt einmal, wenn die Überlast entsteht. Dauerblinken ist im übrigen Spiel tabu, und es kostet am Handy Rechenzeit (NR12). Wenn du doch Blinken willst: nur das Dreieck, 1-mal pro Sekunde, nie das Rohr.
- **F-NR22-2 Ganzes Stück vergrößern:** **Empfehlung:** Der Knopf „Auf 32er vergrößern“ tauscht das ganze überlastete Stück auf einmal (z. B. 6 Felder, Preis steht auf dem Knopf). Feld für Feld wäre mühsam, und ein halb vergrößertes Stück wäre wieder ein Planungsfehler.

#### 13.17.8 Eigener Abgang – zurück zum Abzweig (neu, Fassung 2.1)
**Anlass:** Kritiker M1, Entscheidung Projektleiter 2026-11-07. Zieht der Spieler einen Hausanschluss direkt von der Heizzentrale statt vom Abzweig (10\|12), zum Beispiel (12\|12)→(12\|13) zu Haus 2, versorgt die 32er bis (10\|12) nur noch Haus 1. Dann wird die Leitung mitten auf der Strecke dünner (Reduzierung (10\|12)→(9\|12), A67; Probe im Bauplan Abschnitt 2, gelesen). Das Tutorial nimmt das nicht an. Es zeigt das fremde Stück und führt zurück zum Abzweig. Kein Hängen, kein gebauter Planungsfehler.

**Wann gilt der Zustand?** In T13, T13w, T13h und T14: Es gibt ein Tutorial-Haus, dessen Hausweg (E3) **nicht** über `TUTORIAL_ABZWEIG` läuft und mit der Heizzentrale verbunden ist. Auslöser ist der eigene Abgang selbst, nicht erst der Planungsfehler. Grund: Wird Haus 2 zuerst so angeschlossen, entsteht die Reduzierung erst mit Haus 1. Der Satz käme dann zu spät, mitten in einem richtigen Zug. Laut Entscheidung löst hier jeder eigene Abgang eine Reduzierung aus, also ist die Regel gleichwertig. Das betroffene Haus gilt als **nicht** angeschlossen: sein Haken wird zum Stecker, ohne Federn (wie Bauplan Abschnitt 7 „Zustand vor Verlauf“).
*Nicht abgedeckt (wie Bauplan Abschnitt 11 „zurückgestellt“):* ein Abzweig an einer anderen Stelle der Hauptleitung, etwa ab (10\|11). Der teilt Felder mit dem Hauptweg und ist kein eigener Abgang.

**1. Satz `satz_eigener_abgang`** (kompakte Karte, Rang direkt nach dem Sperr-Satz, vor dem Größen-Satz)
| Schlüssel | Satz | Zeichen |
|---|---|---|
| `satz_eigener_abgang` | „Nimm das gestreifte Stück mit Zurück oder Radierer weg. Zieh die {anschluss} von der Abzweigung.“ **[F]** | **89** mit „25er“ (gezählt mit Python, inkl. Leerzeichen und Satzzeichen); 90 bei einer dreistelligen Größe |
- Zwei Sätze, zwei Handgriffe: erst wegnehmen, dann neu ziehen. „Zurück“ und „Radierer“ sind die Aufschriften der Knöpfe in der Zeichenleiste. „Abzweigung“ ist das Wort aus T13. „gestreift“ beschreibt, was man sieht – ohne Vorwissen über Planungsfehler.
- Das *Warum* trägt das Bild: Die Zielscheibe auf dem Abzweig kommt zurück, Band und Pfeile laufen von dort zum Haus. Ein Grund-Satz („Häuser hängen an der Abzweigung …“) passt nicht mehr unter 96 Zeichen (gezählt: 97–103).
- 667: rund 38 Zeichen je Zeile, also 3 Zeilen („Nimm das gestreifte Stück mit Zurück / oder Radierer weg. Zieh die 25er von / der Abzweigung.“). *Gerechnet, nicht gemessen.*
- **[F]** Fachprüfer: Der Satz behauptet nichts Fachliches. Er prüft nur, ob „von der Abzweigung“ zum Erklärsatz T13w passt.
- **Abschließen gesperrt** (Entscheidung „Sperre Planungsfehler erst nach Häuser fehlen“): Liegt ein eigener Abgang vor und tippt der Spieler auf [Abschnitt abschließen], zeigt die Blase ebenfalls `satz_eigener_abgang`. Zeile 2 am Knopf: **„Stück muss weg“** (14 Zeichen, nach 12.19/12.20) statt „Größe passt nicht“, denn die Größe stimmt ja. Vorschlag an den Architekten. Bleibt es bei „Größe passt nicht“, ist das kein Blocker.
- **Kein Größen-Satz** für Felder des fremden Stücks. Sonst würde „Hausanschluss zu dick … zieh noch mal drüber“ bei einem 32er-Abgang dazu verleiten, den falschen Weg in 25er nachzumalen.

**2. Markierung des fremden Stücks: Streifen („Absperrband“)**
- **Welche Felder:** alle Felder des Hauswegs des betroffenen Hauses, die **kein** Spurfeld seines eigenen Hausanschlusses sind. Beispiel: (12\|12) und (12\|13). Der Kern liefert die Liste in der Lage (Vorschlag: `fremd: Feld[]`, leer = kein eigener Abgang). Satz, Streifen und Rückführung lesen dieselbe Liste.
- **Form:** eine Hülle, die dem Rohr folgt wie das Band, Breite = Rohrbreite + 8 px. Darin 45°-Schrägstreifen, abwechselnd dunkel und hell, je 4 px breit, Deckkraft 0,85. Das Rohr scheint leicht durch. Außen eine Linie von 1,5 px in `kontur`. Keine Raute und kein Dreieck, damit es sich in der Form unterscheidet: Raute = „hier fehlt etwas / anders bauen“, Dreieck = Planungsfehler bzw. Überlast, Band = „hier hin“, **Streifen = „das muss weg“**.
- **Farbe:** dunkel `kontur` `#3b1d0a`, hell `tafel` `#fff4df`. Es gibt **keinen neuen Farbton**. Rot (25er, Planungsfehler) und Gelb (Überlast) bleiben frei. Auch `#ffe08a` (Ziel, Raute, Ring = „hier hin“) wird nicht verwendet. Das Muster unterscheidet sich durch den Hell-Dunkel-Wechsel und nicht durch den Farbton, also auch bei Rot-Grün-Schwäche.
- **Kontrast** (WCAG-Formel, gerechnet mit Python): dunkel/hell untereinander 14,1:1. `kontur` zur Wiese 8,0, zur 25er 3,7, zur 32er 4,7. `tafel` zur Straße 4,6, zur 25er 3,8. Damit erreicht auf jedem Untergrund mindestens eine der beiden Streifenfarben ≥ 3:1 (1.4.11). Noch nicht per Pipette im Foto geprüft.
- **Tokens:** `karte.fremd.*` (13.17.4). Die Farben sind Verweise auf `menue.farbe.kontur` und `tafel`, keine neuen Werte.
- **Ebene:** über den eingezeichneten Leitungen, auf der Höhe des Bands (auf diesen Feldern liegt kein Band). Unter dem Strich, der gerade gezogen wird, unter Gebäuden und Blasen.
- **Bewegung:** Die Streifen erscheinen beim Abheben des Fingers mit 200 ms Einblenden und stehen dann still. Kein Wandern der Streifen, kein Blinken (12.9, NR12). Bei „Weniger Bewegung“ erscheinen sie sofort.
- **Auf den gestreiften Feldern** gibt es kein Band und keine gestrichelte Raute.

**3. Rückführung: Ring, Band, Raute (und Zielscheibe, Finger)**
| Zeichen | solange das fremde Stück liegt | nach dem Wegnehmen |
|---|---|---|
| Zielscheibe | kommt auf (10\|12) zurück (auch in T13h, wo sie sonst fehlt) – „hier geht es ab“ | bleibt, bis das betroffene Haus richtig angeschlossen ist; dann weg wie in T13h |
| Band | Hausanschluss-Stück des **betroffenen** Hauses ist aktiv (voll, mit Pfeilen ab dem Abzweig), das andere nach der normalen Regel; Hauptleitung nur, wo sie offen ist | unverändert |
| Raute (nächstes Feld) | erstes offenes Spurfeld des betroffenen Hauses ab dem Abzweig: (10\|13) bei Haus 2, (9\|12) bei Haus 1. Bei offener Hauptleitung gilt die normale Regel (Hauptleitung zuerst) | unverändert |
| Ring um Haus | um das betroffene Haus (Haken → Stecker, ohne Federn) | unverändert, bis es richtig angeschlossen ist |
| Ring ohne Finger in der Zeichenleiste | um **[↶ Zurück]**, wenn der letzte Zug alle gestreiften Felder enthält (ein Tipp nimmt das Stück ganz weg); sonst um **[Radierer]** | weg |
| Finger (B5) | **aus** – er würde Ziehen zeigen, gerade muss aber erst etwas weg | kommt nach 4 s wieder und zieht ab der Raute bis aufs Haus |
| Satz | `satz_eigener_abgang` | Grundtext bzw. Zwischenstand-Satz des Schritts (Haus 1 richtig → „Das erste Haus hat seinen Hausanschluss …“) |
- **Teilweise weggenommen:** Ist der Hausweg unterbrochen, gibt es keinen eigenen Abgang mehr. Satz und Streifen verschwinden. Reste ohne Verbindung zur Heizzentrale bekommen keine eigene Markierung. *Nicht geprüft*, ob solche Reste den späteren Zug vom Abzweig stören (sie liegen im Beispiel nicht neben der Spur) – der Produktprüfer schaut darauf.
- **Zeichnen bleibt frei**, solange das fremde Stück liegt (keine Sperre, 13.7). Zieht der Spieler zusätzlich die richtige Leitung vom Abzweig, bleiben Streifen und Satz, bis das fremde Stück weg ist.
- **Wiedereinstieg:** Mit eigenem Abgang geht es nie nach T14 (Entscheidung). Nach dem Neuladen gilt T13h (bzw. T13/T13w, wenn die Hauptleitung offen ist), und der Zustand stellt Streifen, Satz und Rückführung selbst her.
- **T14:** Entsteht der eigene Abgang erst in T14 (dort ist Zeichnen frei), fällt das Tutorial nach T13h zurück, wie beim Wegnehmen eines Hausanschlusses (Zustands-Tabelle 13.17.1).

**Skizze 844×390 – T13h, Haus 1 richtig, Haus 2 mit eigenem Abgang**
```
┌──────────────────────────────────────────────────────────────┬─────────────────────────┐
│(Dorfschild)(€ …)  abgedunkelt .55                            │ Zeichnen     [?] [ X ]  │
│░░░ Schleier .30 ░░░░░░░░░░░░ ╭──────────────╮ ░░░░░░░░░░░░░░│▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ HEIZZENTRALE │ ░░░░░░░░░░░░░░│ [(25)][32][40][St.2]    │
│░░░░░░░░░░░░░░░░░░░░░░░░ ══ ╰──────┬───────╯ ░░░░░░░░░░░░░░│ bis 15 kW · 400 €/Feld  │
│░░░░░░░░░░░░░░ (9|12) ── ⊙ (10|12)   ▨ (12|12) gestreift    │ [Radierer] (↶ Zurück)   │ ( ) = Ring ohne Finger
│░░░ ✓ ( Haus 1 )         ◆◆ (10|13) ▨ (12|13) gestreift      │ [T-Stück · ab Stufe 4]  │
│░░░░░░░░░░░░░░░░░░░░░░░░ ▶▶ (10|14) ▶ (11|14) ◎ ( Haus 2 )○ │                         │ ○ = Ring um Haus 2
│┌────┐┌───────────────────────────────────────────────┐░░░░░░├─────────────────────────┤
││Fig.││ Nimm das gestreifte Stück mit Zurück oder     │░░░░░░│ [Abschnitt abschließen] │
││72  ││ Radierer weg. Zieh die 25er von der Abzweigung│░░░░░░│  Stück muss weg         │
│└────┘└───────────────────────────────────────────────┘░░░░░░│                         │
└──────────────────────────────────────────────────────────────┴─────────────────────────┘
 ▨ = Streifen (kontur/tafel 45°) · ⊙ = Zielscheibe wieder da · ◆◆ = Raute · ▶ = Band Haus 2 aktiv · kein Finger
```
**667×375:** gleicher Aufbau, Satz in 3 Zeilen. Gestreifte Felder bleiben im Kamera-Rahmen: (12\|12) und (12\|13) liegen innerhalb x 9 … 12, y 10 … 14 (13.17.1 B6). Andere eigene Abgänge können außerhalb liegen. Dann bleibt die Kamera trotzdem stehen (kein Sprung in T13–T14); der Satz und der Ring an [Zurück] tragen allein.
**Desktop 1280×800:** gleich, Karte kompakt unten links.
