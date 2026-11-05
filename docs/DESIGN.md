# DESIGN – Wärmenetz-Dorf

Stand 2026-11-04 · Designer, Modus `entwurf` (Überarbeitung) und `vorgabe` · Werte: `design/tokens.json`, Fassung 2. Im Code stehen keine Farben, Maße oder Zeiten direkt.
**Nachtrag 2026-11-05: Für alle Menüs und Bedienoberflächen (DOM) gilt ab jetzt Abschnitt 12 „Menü-Stil v2“.** Wo die Abschnitte 1, 4 und 9 für Menüs etwas anderes sagen (Haarlinien, kein Textumriss, eine Schrift), gilt Abschnitt 12. Die Kartengrafik (Abschnitt 3) bleibt unverändert.
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
