# DESIGN – Wärmenetz-Dorf

Stand 2026-11-04 · Designer, Modus `entwurf` (Überarbeitung) und `vorgabe` · Werte: `design/tokens.json`, Fassung 2. Im Code stehen keine Farben, Maße oder Zeiten direkt.
**Nachtrag 2026-11-05: Für alle Menüs und Bedienoberflächen (DOM) gilt ab jetzt Abschnitt 12 „Menü-Stil v2“.** Wo die Abschnitte 1, 4 und 9 für Menüs etwas anderes sagen (Haarlinien, kein Textumriss, eine Schrift), gilt Abschnitt 12. Die Kartengrafik (Abschnitt 3) bleibt unverändert.
**Nachtrag 2026-11-06: Abschnitt 13 „Tutorial (NR13)“** – Ablauf, Texte, Spotlight und Zustände des Pflicht-Tutorials für neue Spiele.
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
- **Leitungen:** acht Durchmesser in Simons Farben, im Ton gedämpft (`leitung.d25` … `d110`): 25er rot, 32er grün, 40er hellblau, 50er dunkelblau, 63er pink, 75er gelb, 90er braun, 110er dunkelgrün. Je dicker, desto breiter gezeichnet. Aufbau von unten nach oben: Sandstreifen `graben` (Rohrbreite + 6 px), dünne Kante `leitung.umriss` (1,5 px je Seite), Rohrfarbe, feiner Glanzstrich `glanz`. Nicht verbunden: grau. Überlast: Wechsel zwischen `ueberlast_a` und `ueberlast_b` (2 Hz) plus rotes Warndreieck. Die dünne Kante bleibt, weil Hellblau, Gelb und Pink sich sonst nicht von der Wiese abheben (gemessen ohne Kante 1,0–1,5:1).
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
- **Weniger Bewegung:** `bewegung_reduziert` vollständig. Überlast ist dauerhaft rot mit Dreieck.
- **Farbe nie allein:** kalt = blasse Fenster **und** Schneeflocke; Überlast = Rot **und** Dreieck; gewählter Reiter = Bernstein **und** Linie **und** fett; Vorschau = Farbe **und** gesperrter Knopf mit Text.

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
1. **Zeile 2 = Grund**, klein geschrieben wie die vorhandenen („ab …“, „braucht …“). Seitenblatt: höchstens 28 Zeichen. Enge Stellen (Zeichenleiste, zwei Knöpfe nebeneinander, Knopf rechts in einer Zeile): höchstens 18 Zeichen, sonst die Kurzform aus der Tabelle. Umbruch nur an Wortgrenzen, höchstens 2 Zeilen; Zahl und Wort davor mit geschütztem Leerzeichen verbinden (`\u00a0`, z. B. „Stufe 4“, „noch 3“).
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

## 13. Tutorial (NR13) – „Simon zeigt dir dein erstes Netz“ (Entwurf 2026-11-06)
Anlass: Lastenheft NR13 mit Präzisierung Simon 2026-11-06 („ganz wichtig“), dazu NR2 (die ersten Minuten) und NR3 (Begriffe, „Wusstest du?“). Grundlage für den Ablauf mit Leitung und Station: Bauplan NR18 Fassung 1 (selbst zeichnen, Station kaufen, Warnung statt Sperre) und NR19 (Puffer-Übergabestation als Standard). Designer, Modus `entwurf`. **Ergänzt** Abschnitt 7 Ablauf 1 und S2 „leer/neu“: Für ein **neues Spiel** startet nach dem Namensfenster (A79) dieses Tutorial statt des ersten Auftrags. Alte Spielstände sind nicht betroffen (13.8).

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

**Leitungs-Spur** (nur Kapitel 3). Gestrichelte Linie auf der Karte vom Abgang der Heizzentrale durch die Straße bis an beide Häuser: 4 px `naht_vorlauf`, Striche 10/8, heller Halo 2 px (`effekt.text_halo`), alle drei Felder eine kleine Pfeilspitze in Zugrichtung. Ein Feld der Spur verschwindet, sobald dort eine Leitung eingezeichnet ist. Der genaue Feldverlauf kommt aus dem Bau (Startdorf-Koordinaten, Projektleiter); er läuft nur über Straße und kostet keine Gestattung.

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
│░░│Simon │ │ Nimm die mit **Pufferspeicher**: │░│ │ ┗━━━━━━━━━━━━━━━━━━━━━━━━┛ │ │ aus NR19
│░░│      │ │ Der Tank sammelt Wärme vorab. So │░│ │ [Wandstation · später  S] │ │ Tutorial-Sperre
│░░│      │ │ braucht das Haus nur 7,5 statt   │░│ │ (abgedunkelt)               │ │
│░░│      │ │ 10 kW aus dem Netz.              │░│ ╰─────────────────────────────╯ │
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
| T03 | W | „Wie viel Wärme er in jedem Moment schafft, misst man in **Kilowatt (kW)**. Dein Kessel schafft {kessel_kw} kW.“ **[F]** (60) | Löcher Heizzentrale **und** Wärme-Pille („0 / 60 kW“) | [Weiter] | Die Wärme-Pille hüpft einmal (240 ms, 12.9) |
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
| T12 | H | „Fertig geplant! Nimm die {leitung} – sie trägt im Spiel bis {kap} kW, genug für beide Häuser.“ **[F]** („25er“, 15) | Loch Katalogkarte {leitung} | Karte antippen → Zeichenleiste öffnet | `{leitung}` = dünnste Leitung, die beide Tutorial-Häuser **mit Puffer** trägt (aus dem Katalog gerechnet, nicht fest „25er“; siehe Hinweis 13.9). Die Erst-Hilfe der Zeichenleiste (12.18 „Erste Nutzung“) erscheint im Tutorial nicht und gilt danach als gesehen |
| T13 | H | „Zieh die Leitung mit dem Finger von der Heizzentrale bis an beide Häuser. Folge der gelben Spur.“ | **Kein** Abdunkeln über der Karte; HUD abgedunkelt. Leitungs-Spur, Finger fährt die Spur ab (2.400 ms je Durchgang) bis zum ersten eigenen Strich | Beide Tutorial-Häuser sind über eingezeichnete Leitungen mit der Heizzentrale verbunden | Kamera: Heizzentrale + beide Häuser passen mit 24 px Rand in die freie Fläche (Zoom 2–3). Zwei-Finger-Zoom erlaubt. Farbknöpfe, Radierer, Zurück frei |
| T13b | (Zwischenmeldung) | „Das erste Haus ist erreicht. Jetzt weiter bis zum zweiten.“ | „Erreicht“-Zeichen über Haus 1 | ersetzt den T13-Text, sobald ein Haus erreicht ist; Schritt bleibt T13 | – |
| T14 | H | „Beide Häuser sind erreicht. Tippe auf Abschnitt abschließen.“ | Loch [Abschnitt abschließen] (Aktionsleiste der Zeichenleiste), Finger | Knopf antippen | Leiste schließt, Kamera bleibt. Eine NR18-Warnung darf hier nicht kommen (13.9) |

**Kapitel 4 – Übergabestationen**
| Nr | Art | Text | Licht / Finger | Weiter mit | Kamera, Sonstiges |
|---|---|---|---|---|---|
| T15 | H | „Damit ein Haus die Wärme nehmen kann, braucht es eine **Übergabestation**. Tippe auf das erste Haus.“ | Loch Haus 1, Finger | Haus 1 antippen → Hausblatt öffnet | Kamera: Haus 1 in die Mitte der freien Fläche (12.21 Punkt 4, aber 38 % Höhe) |
| T16 | W | „Sie holt die Wärme aus dem Netz ins Haus. Ein **Wärmetauscher** trennt dabei das Netzwasser vom Heizwasser im Haus.“ **[F]** | Loch Kasten „Übergabestation wählen“ | [Weiter] | Das Blatt scrollt so, dass der Kasten ganz sichtbar ist |
| T17 | H | „Nimm die mit **Pufferspeicher**: Der Tank sammelt Wärme vorab. So zieht das Haus nur {kw_puffer} statt {kw_ohne} aus dem Netz – warm wird es genauso.“ **[F]** (7,5 / 10 kW) | Loch Knopf „Puffer-Übergabestation“ (Variante `geld`, Preis in Zeile 2); zweites Loch ohne Finger um Haus 1 auf der Karte | Knopf antippen (Kauf) | Wandstation sichtbar, aber gesperrt nach 12.19 mit Zeile 2 „später wählbar“ und Hinweis „Im Tutorial nimmst du den Standard. Die Wandstation kannst du später wählen.“ (siehe Frage T-F2). Nach dem Kauf schließt das Blatt von selbst (200 ms) |
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

**Hilfe nach drei Fehltipps** (13.7) – ein Satz, ersetzt die zweite Hälfte der Blase, bis richtig getippt wird:
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
| Erklär-Schritte | „Tippe auf Weiter, wenn du bereit bist.“ |

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
| **Abschließen zu früh** (T13, noch nicht beide Häuser erreicht) | [Abschnitt abschließen] gesperrt nach 12.19/12.21, Zeile 2 „noch 1 Haus fehlt“ bzw. „noch 2 Häuser fehlen“ (≤ 18 Zeichen, geschütztes Leerzeichen), Hinweis in der Blase: „Zieh die Leitung bis an beide Häuser – folge der gelben Spur.“ Mit 0 Leitungen gilt weiter B6 „nichts gezeichnet“ |
| **Leitung neben der Spur** | erlaubt (kostet nur etwas mehr). Radierer und Zurück funktionieren normal. Der Schritt prüft nur „beide Häuser verbunden“ |
| **Zurück nimmt ein Haus wieder weg** | „Erreicht“-Zeichen verschwindet, Blase springt auf den T13-Text zurück |
| **Kamera verlassen** (nur Kapitel 3 möglich) | Liegt ein Tutorial-Haus ganz außerhalb des Bildes, zeigt am Bildrand ein kleiner Pfeil (Chip `gold`, 26 px, gezeichneter Pfeil) in seine Richtung; Tippen auf den Pfeil fährt die Kamera zurück |
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
