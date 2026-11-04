# DESIGN – Wärmenetz-Dorf

Stand 2026-11-04 · Designer, Modus `entwurf` (Überarbeitung) und `vorgabe` · Werte: `design/tokens.json`, Fassung 2. Im Code stehen keine Farben, Maße oder Zeiten direkt.
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
