# DESIGN – Wärmenetz-Dorf

Stand 2026-11-04 · Designer, Modus `entwurf` · Werte: `design/tokens.json` (keine Farben, Maße oder Zeiten direkt im Code).
Vorlage: Simons Prototyp „Mein Wärmedorf“. Der Stil ist **gewählt und wird übernommen**, nicht neu erfunden. Unten steht nur, wie wir ihn ordnen und wo wir ihn reparieren.

## 1. Richtung und Spielgefühl
**Ein sonniges Spielzeug-Dorf zum Anfassen**: Die Dorfwiese ist hell und warm. Alles Bedienbare sieht aus wie ein dickes, greifbares Spielteil, mit dunklem Umriss und hartem Schatten nach unten (Aufbau-Spiel-Look wie Clash of Clans).
- Warum: Gespielt wird kurz zwischendurch am Handy, im Hochformat, mit dem Daumen. Das Wärmenetz ist eigentlich unsichtbare Technik, deshalb muss das Spiel **Wärme sichtbar machen**: gelbe Fenster, Rauch, Münzen, glühende Leitungen.
- Gefühl: Jede Aktion gibt sofort eine Antwort, etwa „Plopp“ beim Bauen, Münzflug beim Einsammeln oder Funken bei Fertigstellung. Nie hektisch, nie bestrafend. Fehler werden als Hinweis am Objekt gezeigt.
- **Erkennungsmerkmal:** *Wärme wird sichtbar.* Ein warmes Haus hat gelbe Fenster (`fenster_warm`). Ein kaltes Haus hat blaue Fenster und eine Schneeflocken-Blase. Wer noch mit Öl heizt, hat dunklen Rauch (`rauch_oel`). In versorgten Leitungen laufen weiße Punkte von der Heizzentrale weg.
- Bewusste Abweichung vom Oberflächen-Standard (`wissen/oberflaeche.md`): Statt feiner 1-px-Linien und dezenter Schatten gibt es dicke Umrisse (3 px), harte Schatten, Verläufe und mehrere Rollenfarben (Wärme, Geld, Taler, Kalt). Grund: Simons Wahl des Spielstils. Es gibt keinen Dunkelmodus, weil die Spielwelt Tageslicht ist. Weiter gelten aus dem Standard: Abstandsraster, gleich breite Ziffern, alle Zustände, 44-px-Tippflächen, Kontrast, Fokus.

## 2. Grafikstil der Karte (Canvas)
- **Kamera:** isometrisch 2:1, 24×24 Felder. Zoom 1–4: am Handy startet sie mit 3, am Desktop mit 1,9, mittig auf der Heizzentrale. Bedienung: Ziehen verschiebt die Karte (erst ab 7 px Bewegung, sonst zählt es als Tippen). Mit zwei Fingern wird um den Mittelpunkt gezoomt, am Desktop mit dem Mausrad um den Mauszeiger. Die Karte lässt sich nur so weit schieben, dass das Dorf nie ganz aus dem Bild verschwindet.
- **Boden:** Schachbrett aus `wiese_a`/`wiese_b` mit Grashalmen und vereinzelten Blumen (Halme nur, wenn eine Kachel mehr als 34 px breit ist). Außerhalb des Baugebiets liegt dunklere Wiese mit einem Baumring. Die Grenze ist ein Sandweg (`weg_rand`). Im Baumodus wird ein Raster eingeblendet (`raster_baumodus`).
- **Licht:** Die Sonne steht immer oben links. Linke Wände sind hell, rechte dunkel (Werte: `karte.licht`). Unter jedem Objekt liegt ein ovaler Schlagschatten nach rechts unten (`schatten`). Dachfirste bekommen eine weiße Lichtkante. Das gilt ohne Ausnahme für jedes neue Objekt.
- **Umriss:** Jede Fläche hat den Umriss `umriss`, Stärke `max(1, Kachel × 0,018)`, mit runden Ecken. Leitungen, Blasen und Timer bekommen einen kräftigeren Umriss in `tinte_tief`.
- **Objekte:** Klare Grundkörper (Quader, Satteldach, Zylinder) mit senkrechtem Verlauf, keine Fotostrukturen. Die Stufe erkennt man an Höhe und Dachfarbe (`dach_stufe`), an Sternen an der Heizzentrale und an Anbauten wie Schornsteinen, Wärmepumpen oder PV. Ein Objekt im Bau steht im Holzgerüst (`geruest`), ein kleiner Monteur hämmert, darüber läuft ein Bautimer-Balken.
- **Leitungen:** Drei Dicken und Farben: Hausanschluss `#f39a45` (dünn), Verteilleitung `#e2582b`, Hauptleitung `#b8352a` (dick). Alle mit 4 px dunklem Rand und einem Graben darunter. Nicht verbunden: grau. Überlast: blinkt rot (2 Hz) und bekommt ein rotes Warndreieck. Ein **Planungsfehler** (A8) bekommt dasselbe Warndreieck. Die Ursache steht in der Kontextkarte.
- **Bewegung (Karte):** Rauch aus Schornsteinen, Wasser im Brunnen, rotierende Lüfter der Wärmepumpe, wippende Blasen, Fließpunkte, Münzflug zur Geld-Pille, Funken bei Fertigstellung. Kurzes Federn („Plopp“, 450 ms) beim Platzieren und Verschieben. Alle Zeiten stehen in `zeit_ms`. **Bewegung läuft nach Uhrzeit, nicht nach Bildern**, sonst läuft sie auf 120-Hz-Handys doppelt so schnell (Mangel M9).
- **Kunden-Blasen** (weißer Kreis mit Spitze, über dem Objekt). Je Objekt zeigt das Spiel genau eine Blase, die wichtigste zuerst, in dieser Rangfolge:
  1. gekündigt ✕ (`gekuendigt`)
  2. kein Anschluss ! (`kein_anschluss`)
  3. Leitung zu dünn ! (`leitung_zu_duenn`)
  4. kalt, Schneeflocke (`kalt`)
  5. unzufrieden ! (`unzufrieden`)
  6. Münze zum Einsammeln (`muenze`)
  7. Großabnehmer-Angebot ? (`angebot`)

  Die Symbole werden als **gezeichnete Formen** umgesetzt, nicht als Schriftzeichen (Mangel M7).

## 3. Oberflächen-Bausteine
Alle Bausteine haben 3 px `tinte`-Umriss und einen harten Schatten (`schatten.*`). Gedrückt rutscht der Baustein 2–3 px nach unten, der Schatten schrumpft. Weiße Schrift steht nur mit vollem Umriss (`schrift.umriss_text`).

| Baustein | Aussehen | Maße / Zustände |
|---|---|---|
| **HUD-Pille** | Symbol (34 px, rund, eigener Umriss) links überlappend, dunkle Spur `hud_pille`, Wert rechtsbündig weiß mit Umriss, gleich breite Ziffern, optional Füllstand (Geld/Kasse, Wärme genutzt/da, Ruf) | Höhe 36. Etikett oben rechts (Desktop) bzw. als Kurzeinheit im Wert (Handy, siehe 5). Interaktive Pillen (Ruf → Abrechnungsbüro, Geld → Abrechnungsbüro) haben eine Tippfläche von ≥ 44 px Höhe. Zustand Mangel: Füllung `waerme_mangel` bzw. `ruf_schlecht` |
| **Dorfschild** | grünes Holzschild (`dorfschild_*`), Dorfname groß (Anzeige 18), darunter „Heizzentrale Stufe N · Dorfwert N“ | Tippen öffnet „Dorf-Einstellungen“ (Name, Info). Der Name wird nicht direkt im Schild bearbeitet, das ist zu klein (M5) |
| **Auftragskarte** | Pergament, gelber runder Marker „!“ links, Text höchstens 2 Zeilen, Belohnung „+10“ in `taler` | Ganze Karte ist tippbar und öffnet die Auftragsdetails. Zustand fertig: ★ und „Alle Aufträge erledigt“ |
| **Rundbutton** | Kreis mit radialem Verlauf, Symbol mit Schatten, darunter Beschriftung | Bauen 72 px (Handy) / 76 (Desktop), Besuchen 56 / 64. Fokus: 3 px weißer Ring mit 2 px Abstand |
| **Zoomknopf** | Pergament-Quadrat, „+“ / „−“ | **48×48** (Prototyp 40, M1), Abstand 8 |
| **Knopf** | Verlaufsknopf, Varianten `standard`, `los` (grün: bauen, abholen), `heiss` (orange: ausbauen, wegräumen), `taler` (lila: mit Talern beschleunigen), `blau` (Förderantrag), `gewaehlt` (gelb: aktiver Reiter, Preisstufe) | Mindesthöhe 44. Zweite Zeile `small` für Preis oder Zeit („1.200 € · 30 s“). Gesperrt: Graustufe, Grund steht in der zweiten Zeile („ab Heizzentrale 2“) |
| **Pergament-Popup / Kontextkarte** | Kopf mit goldenem Verlauf (`kopf_*`), weißer Titel mit Umriss, rechts Stufen-Etikett und roter Schließen-Kreis. Darin: Absatz, Chips, Kasten, Knopfreihe | Schließen-Kreis hat 44 px Tippfläche (Bild 32, M2). Inhalt scrollt ab 50 % der Bildhöhe. Unten einrasten wie ein Blatt (Handy) bzw. schwebend unten mittig, max. 580 px (Desktop) |
| **Chip** | kleines Pergament-Etikett, Varianten neutral/rot/grün/blau | Nur Anzeige, nie tippbar |
| **Kasten** | hellere Fläche `pergament_hell`, 2 px `pergament_rand` | Für „Im Heizhaus“, „Bedingungen“, „Förderanträge“, „Planungsfehler“ |
| **Bau-Katalog-Karte** | Bild (96 px, gezeichnet mit derselben Kartengrafik auf Wiesengrund), Name, Werte (gedämpft), Preis | Ganze Karte ist ein Knopf. Zustände: kaufbar / zu teuer (Preis rot, Karte bleibt tippbar und erklärt) / voll („3/3“) / gesperrt („ab Heizzentrale 2“) / Abzeichen „−40 % Förderung“ bzw. „Antrag läuft“ |
| **Fortschrittsbalken** | Pergament-Spur, 3 px Umriss, Füllung `fortschritt` (im Popup) bzw. `bautimer` mit Restzeit darüber (auf der Karte) | Höhe 14. Restzeit als „4 min 12 s“ |
| **Toast** | großer weißer Text mit Umriss, mittig auf 30 % Höhe, 2 s | Für Erfolg und kurze Ablehnungen. Mit `aria-live="polite"` vorgelesen |
| **Banner** | Pergament oben mittig | Nur im Besuchsmodus |

Abstände nur aus `abstand_px` (4/8/12/16/24/32). Die Prototyp-Werte 6/7/10/14 werden auf 8/8/12/16 gerundet.

## 4. Bildschirme und Zustände (Handy 390×844 zuerst)
**Grundaufbau Handy:** Die Karte füllt den ganzen Bildschirm.
- Oben links: Dorfschild und Auftragskarte, bis zur Mitte minus 4 px.
- Oben rechts: die Pillenspalte, 150 px breit.
- Unten rechts: die Rundbuttons. Unten links: der Zoom.
- Zwischen allen Ecken bleiben mindestens 8 px Abstand. Alles hält sichere Ränder ein (`env(safe-area-inset-*)`).

```
┌──────────────────────────────┐
│[Dorfschild    ]  (€)▓▓ 1.199 │
│[! Auftrag  +10]  (W)▓ 10/60 kW│
│                  (R)▓▓  79 % │
│                  (T)    100  │
│        Karte     (M)    2/2  │
│                              │
│ [+]                    (Map) │
│ [−]                  (BAUEN) │
└──────────────────────────────┘
```

**Kontextkarte offen (Handy):** Sie liegt als Blatt unten, über die volle Breite, höchstens 50 % der Höhe. Solange sie offen ist, sind Rundbuttons und Zoom **ausgeblendet** (im Prototyp liegen sie verdeckt darunter, M3). Die Kamera schiebt das gewählte Objekt in die obere Bildhälfte (M4).

| Bildschirm | Zustände (alle bauen) |
|---|---|
| **S0 Laden** | Grüner Grund `karte.hintergrund`, Dorfschild-Form mit „Wärmenetz-Dorf“, Ladebalken (`bautimer`). Fehler beim Laden des Spielstands: Popup „Dein Spielstand ließ sich nicht lesen. Neues Dorf anfangen?“ mit [Neues Dorf] und [Nochmal versuchen]. Der kaputte Stand wird nie still überschrieben |
| **S1 Startwahl** (A3) | Popup mittig, abgedunkelter Hintergrund, HUD ausgeblendet. Titel „Deine erste Wärmequelle“. 3 Karten (Hackschnitzelkessel, Großwärmepumpe, Power-to-Heat-Kessel) mit Bild, Leistung in kW, „+ Vorteil“, „− Nachteil“, Knopf „Gratis zum Start“. Handy: 1 Spalte und Scrollen; ein Hinweis „Weiter unten: 2 weitere“ zeigt, dass mehr kommt. Desktop: 3 Spalten. Nach der Wahl: Funken an der Heizzentrale, Toast „Hackschnitzelkessel läuft!“ |
| **S2 Dorf** (A1, A2) | **leer/neu:** Heizzentrale, 2–3 Häuser mit Öl-Rauch und „kein Anschluss“-Blase. Erster Auftrag zeigt auf die Leitung. **Baustelle:** Gerüst, Monteur, Timer. Die Pille „Monteure 0/1“ wird rot gefüllt. **warm:** gelbe Fenster, kein Rauch, später eine Münzblase. **kalt:** blaue Fenster, Schneeflocken-Blase. **Engpass:** Leitung blinkt rot, „Leitung zu dünn“-Blase an den Häusern dahinter. **Planungsfehler:** rotes Dreieck auf dem dünnen Abschnitt. **Kasse voll:** Geld-Pille ganz gefüllt, Etikett „voll“. Münzblasen bleiben stehen, beim Tippen erscheint der Toast „Kasse voll – Abrechnungsbüro ausbauen“. **gekündigt:** ✕-Blase, dunkler Rauch. **Willkommen zurück** (A15): Pergament-Karte „Während du weg warst (3 h 12 min): +1.240 € eingenommen, 2 Baustellen fertig“ mit [Einsammeln] |
| **S3 Kontextkarte** | Je Objekttyp: Haus (Bedarf kW, Einnahme €/min, Zufriedenheit, [Abholen]) · Heizzentrale (Plätze „1/1“, Quellen mit [Stufe +1], Einbau) · Leitung (Last „12 / 20 kW“, Tausch auf andere Dicke, Kasten Planungsfehler) · Abrechnungsbüro (Kasse, Wärmepreis in 5 Stufen, Förderanträge) · Großabnehmer (Bedingungen ✕/✓, [Vertrag unterschreiben]) · Hindernis ([Wegräumen]). **Baustelle:** Fortschritt, Restzeit, [Sofort fertig · 3 Taler]. **gesperrt:** Knopf ausgegraut mit Grund. **zu wenig Geld:** Knopf bleibt tippbar, Toast „Es fehlen 300 €“ |
| **S4 Bau-Katalog** (A4) | Blatt von unten, 80 % Höhe, Reiter Heizhaus · Außenanlagen · Leitungen · Häuser · Dorf · Deko (waagrecht scrollbar, rechter Rand blendet aus). Karten-Raster: Handy 2 Spalten, Desktop automatisch ab 150 px. **leer:** In Kategorien ohne Einträge steht „Hier gibt es ab Heizzentrale Stufe 2 mehr.“ Gesperrt, voll und Förderung wie in Abschnitt 3 |
| **S5 Platzieren / Verschieben / Leitung ziehen** | HUD bleibt, Rundbuttons verschwinden, Raster an. Geist-Vorschau grün/rot, darüber ein wippender Pfeil. Blatt unten: „Hausanschluss platzieren – tippe auf die Wiese oder zieh das Gebäude“ mit [Hier bauen] (gesperrt, solange rot) und [Abbrechen]. **kein Platz:** Vorschau rot, Toast „Hier ist kein Platz“. **Leitung (Stempel):** Ziehen setzt Feld für Feld. Das Blatt zeigt die drei Dicken als Knöpfe mit „bis 20 kW · 15 €“ und [Fertig] |
| **S6 Dörfer in der Nähe** (A17) | Blatt, Liste nach Dorfwert: Rang, Name, „Dorf von Anna · Heizzentrale 3 · Dorfwert 410“, [Besuchen]. Die eigene Zeile ist gelb hervorgehoben. **leer:** „Noch keine Nachbardörfer.“ |
| **S7 Besuch** | Fremdes Dorf, schreibgeschützt. Eigenes HUD, Rundbuttons und Zoomknöpfe sind ausgeblendet (Zoom bleibt per Geste). Banner oben: Name, „Dorf von …“, [Gefällt mir] / „Gefällt dir“ (taler-lila), [Nach Hause]. Tippen auf ein Objekt zeigt nur Name und Beschreibung, keine Aktionen. Handy: Banner zweizeilig, Knöpfe in der zweiten Zeile |
| **S8 Dorf-Einstellungen / Info** | Dorfname (Eingabefeld 44 px), Schalter „Weniger Bewegung“ (Standard = Systemeinstellung), Spielstand löschen (mit Rückfrage), Hinweis **„Alle Wärmenetze und Werte sind fiktiv.“** (A18). Kein OSM, deshalb keine Namensnennung nötig |

**Desktop (1280×800):** Gleicher Aufbau. Die Pillen bekommen ihre Etiketten über der Pille (mit 12 px Abstand zur Pille darüber, im Prototyp berühren sie sich, M6). Die Kontextkarte schwebt unten mittig (max. 580 px), die Rundbuttons bleiben sichtbar, wenn sie nicht überdeckt werden. Mausrad zoomt, Tastatur siehe Abschnitt 7.

## 5. Abläufe (Start → Ziel, Rückmeldung nach jedem Schritt)
1. **Neustart → Quellenwahl:** S0 Laden → S1 Startwahl, eine Karte tippen → Popup schließt, Funken, Toast „… läuft!“ → Kamera auf die Heizzentrale, Rauch steigt auf, Auftrag 1 erscheint.
2. **Bauen:** [Bauen] → S4 Reiter → Karte tippen (zu teuer: Toast mit Fehlbetrag; alle Monteure belegt: Toast „Alle Monteure sind beschäftigt – warte oder baue eine Monteurhütte“) → S5 Geist erscheint am nächsten freien Platz → schieben → [Hier bauen] → Plopp, Gerüst, Timer, Monteur-Pille zählt herunter → fertig: Funken, Toast „Fertig: …“.
3. **Anschließen:** Haus mit „!“ tippen → Karte „Heizt noch mit Öl. Leg eine Leitung …“ → [Leitung legen] (Abkürzung in den Stempelmodus) → von der Heizzentrale zum Haus ziehen → Leitung wird farbig, Fließpunkte laufen, Fenster werden gelb, Öl-Rauch verschwindet. Ist die Leitung zu dünn, blinkt der Abschnitt rot, die Blase zeigt „!“, die Karte nennt die passende Dicke.
4. **Einsammeln:** Münzblase tippen → Münzen fliegen zur Geld-Pille, Schwebetext „+120 €“ → Pille füllt sich. Bei voller Kasse: Toast und Pille „voll“.
5. **Auftrag:** Bedingung erfüllt → Toast „Auftrag geschafft! +10 Dorftaler“, Taler-Pille zählt hoch → nächster Auftrag erscheint in der Auftragskarte.
6. **Förderung (A13):** Büro → [Antrag stellen] → Chip „in Prüfung · 2 min“ → Chip „bewilligt“, im Katalog Abzeichen „−40 % Förderung“ → bauen → Toast „Förderung ausgezahlt: +480 €“. Wer vorher baut, bekommt den Toast „Vorzeitiger Baubeginn – der Förderantrag ist verfallen“.
7. **Besuch:** [Karte] → S6 → [Besuchen] → S7 → [Gefällt mir] → [Nach Hause] → Kamera springt zurück, eigenes HUD ist wieder da.

## 6. Texte
Du-Form, kurz, Dorfsprache, keine Platzhalter. **Jede Wärmezahl mit Einheit** (A18): „10 / 60 kW“, „bis 20 kW“, „braucht 8 kW“, „120 €/min“, „14 ct/kWh“. Der Prototyp schreibt nur „Wärme“; der Fachprüfer bestätigt die Zahlen. Fehlermeldungen sagen, was los ist und was hilft:
- „Hier ist kein Platz – such dir freie Wiese.“
- „Es fehlen 300 €. Sammle Münzen ein oder warte auf Einnahmen.“
- „Kein Platz mehr im Heizhaus – baue erst die Heizzentrale aus.“
- „Angeschlossen, aber eine Leitung auf dem Weg ist zu dünn. Ersetze sie durch eine Verteilleitung.“

## 7. Barrierefreiheit (Pflichtboden)
- **Kontrast:** Text auf Pergament mindestens 4,5:1. Gedämpfter Text wird `#6b5a3f` (Prototyp `#7d6a50` hat auf den Karten nur 4,27:1). Die Taler-Zahl „+10“ wird `#7a3fd6` (Prototyp `#8b5cf0`: 3,83:1).
- **Weiße Schrift auf hellen Verläufen** (Prototyp: auf hellem Grün 1,65:1, auf Gold 1,46:1, auf hellem Orange 1,8:1) ist nur mit **vollem 2-px-Umriss** in `tinte_tief` erlaubt. Zusätzlich wird die untere Verlaufsfarbe der Knöpfe so dunkel gesetzt, dass Weiß darauf ≥ 4,5:1 erreicht: `los` `#2f7d1f`, `heiss` `#b8501c`, `taler` `#5b3fc4`, `blau` `#2c6fb8`. Kopfzeile: `#b98236` plus Umriss.
- **Tippflächen** ≥ 44 px, auch für Pillen-Knöpfe, Reiter, Schließen, Preisstufen, Knöpfe in Zeilen.
- **Fokus:** Auf Grün und Karte 3 px weißer Ring, auf Pergament 3 px `tinte`-Ring, jeweils 2 px Abstand. Die Reihenfolge folgt dem Bildschirm (HUD → Auftrag → Karte → Rundbuttons). Popups halten den Fokus gefangen, Esc schließt sie.
- **Tastatur am Desktop:** Pfeiltasten verschieben die Karte, +/− zoomen, B öffnet Bauen, Esc bricht ab. Platzieren geht mit Pfeiltasten und Enter.
- **Beschriftungen:** Jede Pille hat einen Text für Vorleser („Geld 1.199 von 4.000 Euro“). Rundbuttons mit Beschriftung. Die Karte hat einen Text, Toasts werden über `aria-live` vorgelesen.
- **Weniger Bewegung:** Bei `prefers-reduced-motion` oder dem Schalter in S8 gilt `bewegung_reduziert` aus den Tokens. Zustände bleiben trotzdem erkennbar: Überlast ist dauerhaft rot mit Warnsymbol statt blinkend.
- **Farbe nie allein:** kalt = blaue Fenster **und** Schneeflocke, Überlast = Rot **und** Dreieck, Vorschau = Farbe **und** Pfeilfarbe plus gesperrter Knopf.

## 8. Mängel des Prototyps, beim Nachbau beheben
Geprüft mit Bildschirmfotos bei 390×844 und 1280×800 (Chrome ohne Bildschirm, Prototyp unverändert) und mit Messung der Elemente.

| Nr | Mangel (gemessen) | So richtig |
|---|---|---|
| M1 | Zoomknöpfe 40×40 px | 48×48 (`zoomknopf`) |
| M2 | Schließen-Kreis 30×30; „Schließen“ 97×38; Katalog-Reiter 33 px hoch; Ruf-Pille 34 px hoch; Knöpfe in Zeilen (Heizhaus „Stufe 2“) ca. 36 px | alle ≥ 44 px Tippfläche; Schließen einheitlich als roter Kreis (Bild 32, Tippfläche 44) |
| M3 | Handy: Die Kontextkarte (366 px breit) liegt über Bauen-, Besuch- und Zoomknöpfen; der Bauen-Knopf ist verdeckt | Knöpfe ausblenden, solange ein Blatt offen ist |
| M4 | Das gewählte Objekt verschwindet halb unter der Kontextkarte | Kamera schiebt es in die freie obere Hälfte |
| M5 | Dorfname wird direkt im Schild bearbeitet (Feld ca. 20 px hoch); Auftragskarte wird bei 390 px 82 px hoch (3 Zeilen); linke und rechte HUD-Spalte haben nur 5 px Abstand; zusammen bedecken sie das obere Viertel | Name in S8; Auftrag höchstens 2 Zeilen, ganze Karte tippbar; mindestens 8 px Spaltenabstand |
| M6 | Handy: Pillen-Etiketten ausgeblendet, dadurch Zahlen ohne Bedeutung („10 / 60“). Desktop: Etiketten stoßen an die Pille darüber | Handy: Einheit im Wert („10/60 kW“, „2/2 frei“); Desktop: 12 px Abstand |
| M7 | Symbole als Schriftzeichen (⚡ ❄ ✕ ★ ▼ €), werden je Gerät verschieden oder als bunte Emojis dargestellt | als Formen zeichnen bzw. eigene SVG-Symbole im gleichen Stil |
| M8 | Kontrast: siehe Abschnitt 7; Text im Katalog auf gesperrten Karten (Graustufe + 60 % Deckkraft) kaum lesbar | Deckkraft nur auf dem Bild, Text bleibt voll lesbar, Grund steht in Tinte |
| M9 | Animation zählt Bilder (`anim += 1/60`), auf 120-Hz-Handys doppelt so schnell; Weniger-Bewegung gilt nur für den Toast | zeitbasiert; `bewegung_reduziert` vollständig |
| M10 | Schriften kommen von Google Fonts, offline (A16) fehlen sie | Baloo 2 und Nunito Sans selbst hosten und im Service Worker vorhalten |
| M11 | Toast weiß auf hellem Gras ohne Hintergrund ist beim Ausblenden am Desktop kaum lesbar | Umriss Pflicht; bei langen Texten Pergament-Hintergrund |

## 9. Übergabe an Projektleiter / Bau
- Bausteine aus Abschnitt 3 einmal als DOM-Bausteine bauen. Die Karte und die Bilder der Katalog-Karten zeichnen **dieselben** Zeichenfunktionen. Farben kommen nur aus `tokens.json`.
- Je Bildschirm alle Zustände aus Abschnitt 4 als prüfbaren Zustand anlegen (Test-Spielstände: neu, Baustelle, Engpass, Kasse voll, gekündigt, Besuch, Offline-Rückkehr). Daran macht der Designer im Modus `treue` Fotos bei 390×844 und 1280×800.
- Abnahme A1/A2 erst nach M1–M7 und M9.
