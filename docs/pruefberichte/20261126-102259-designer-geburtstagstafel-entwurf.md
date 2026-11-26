# Designer – Entwurf „Werbetafel Geburtstage“ (Modus `entwurf`, 2026-11-26)

🟡 **Entwurf fertig, zwei Punkte brauchen eine Entscheidung** (Datenschutz der Geburtstagsliste – nur Simon; Feldsperre im Spielkern – Projektleiter/Architekt).

## 1. Richtung in einem Satz
Eine Plakatwand auf Holzstelzen am Rand der Querstraße Nord, der einzige „Jahrmarkt“ im ruhigen Miniatur-Dorf: Am Geburtstag mit Glühbirnen-Lauflicht und zwei Ballons in den Rohrnaht-Farben, sonst ein ruhiges Plakat des eigenen Wärmenetzes. So ist sie ein festes Wahrzeichen und keine Einblendung, die das Spiel unterbricht.

## 2. Angelegt / geändert
- `docs/entwuerfe/geburtstagstafel-entwurf.html` – neues Mock. Hintergrund sind **echte Bildschirmfotos** der Startansicht (844×390 und 667×375, Zoom 2,2, Winter), die Tafel liegt an der gemessenen Stelle darüber. Neun Bilder für 844 (heute, heute angetippt, zwei Geburtstage, zwei angetippt, bald, bald angetippt, neutral, neutral angetippt, Bauen mit durchsichtiger Tafel), fünf Bilder für 667, eine Reihe Detailstufen (Zoom 1 bis 4).
- `docs/DESIGN.md` – neuer Abschnitt **15 „Werbetafel Geburtstage“** (15.1 Entscheidungen, 15.2 Aussehen, 15.3 Zustände, 15.4 Texte mit Längen, 15.5 Antippen, 15.6 Bewegung, 15.7 Barrierefreiheit, 15.8 Werte-Vorschlag, 15.9 Abläufe, 15.10 Prüfliste) und eine Nachtragszeile im Kopf.
- `design/tokens.json` **nicht** geändert: Die neuen Werte stehen als Vorschlag in 15.8, so wie bei 13.10. Der Projektleiter trägt sie beim Bauen ein.

## 3. Bildschirme und Zustände
| Zustand | Tafel im Dorf | Überlagerung (Antippen) | 844×390 | 667×375 |
|---|---|---|---|---|
| heute (1) | „Alles Gute zum / 9. Geburtstag, / Phili!“, Lauflicht, Ballons | groß + „Heute feiert das ganze Dorf mit.“ | getestet (Mock-Foto) | getestet |
| mehrere heute | „… / Phili & Lena!“ | Liste mit Alter | getestet | gelesen (gleiche Regeln) |
| bald (1–6 Tage) | „Bald Geburtstag / Phili / wird am Samstag 10“, Birnen aus | ganzer Satz mit Datum | getestet | getestet |
| neutral | „Heatville“ + Rohrnaht + „Wärme fürs ganze Dorf“ | erklärt, wofür die Tafel da ist | getestet | getestet |
| Bauen/Leitung legen | 40 % durchsichtig, nicht antippbar | – | getestet | gelesen |
| Zoom 1 … 4 | unter tw 52 nur die große Zeile | – | getestet (Detailreihe) | – |
| keine Tafel (alter Spielstand, Feld belegt) | – | Meldung H1 am Geburtstag | nicht gezeichnet (nur Text) | – |
„Getestet“ heißt: Das Mock im Chromium (Playwright) geöffnet, alle 18 Bilder einzeln fotografiert und angesehen; Schriften Lilita One und Manrope geladen, keine Fehler auf der Seite. Graustufen- und Unschärfe-Probe am Bild „heute“ 844 gemacht: Name und Tafel bleiben das Auffälligste im Bild. **Das Spiel selbst habe ich nicht verändert.** Die Lage der Tafel ist mit der Kamera des Spiels gemessen (Startspielstand, Dev-Server), das Aussehen im Spiel gibt es erst nach dem Bauen.

### Platzwahl – so entschieden
- Der erste Gedanke war (14|8) direkt neben der Heizzentrale. Im Mock mit 40 % Deckkraft sah ich, dass die Tafel dort **das Monteurhäuschen und das EFH (13|7) verdeckt**. Darum verworfen.
- Danach habe ich per Skript alle freien Felder geprüft: Die Tafel samt Ballons muss bei beiden Größen ganz im Bild sein, darf Anzeigen, Auftragskarte, Zoom und Rundknöpfe nicht überschneiden und kein eigenes Gebäude verdecken. Übrig blieben 4 Felder. **(15|5)** verdeckt am wenigsten: Teile von RH (15|3), EFH (14|5) und MFH (11|4), alles Kunden am Nordrand.
- Bahndamm/Nordzone: verworfen, weil der Grünstreifen beim Start nicht bzw. nur unter der Anzeigenreihe im Bild ist.

## 4. Pflichtfragen
1. **Eine Richtung?** Ja: Plakatwand als einziges Festobjekt im ruhigen Miniatur-Dorf (Abschnitt 1 bleibt gültig). Der Stil ist aus dem Kartenstil abgeleitet (flach, Licht links oben, weicher Schatten) und aus dem Menü-Stil v2 (Lilita One, Rohrnaht).
2. **Ablauf je Anforderung, alle Zustände?** Ja: 15.9 (sehen, genauer lesen, bauen trotz Tafel, Gebäude aufs Tafelfeld, unglückliche Wege) und 15.3 (heute, mehrere, 4+, bald, morgen, ohne Jahrgang, neutral, keine Tafel, Tutorial, Nachbardorf). Einen Lade- oder Fehlerzustand gibt es nicht, weil die Liste fest im Spiel steht. Hochformat: Es gilt der Dreh-Hinweis wie überall.
3. **Werte nur aus der Vorgabe?** Ja, bis auf 6 neue Farbwerte und die Maße in `karte.tafel`. Sie stehen als Vorschlag in 15.8. Die alten `geburtstag.konfetti` (Tailwind-Standardfarben) fallen weg; der Schmuck nutzt die vorhandenen Menüfarben.
4. **Kontrast, Tastatur, Fokus, Tippflächen:** Kontraste nach WCAG-Formel gerechnet (Text 6,7–14,1:1, Name 4,3:1 bei ≥ 24 px). Auf der Sommerwiese hätte der rote Rahmen nur 2,3:1, darum ist eine äußere Konturlinie vorgegeben. Tippfläche 149×77 px, mindestens 44×44; ✕ 44×44; Tastatur über einen unsichtbaren DOM-Knopf mit Fokusring auf dem Canvas; Weniger Bewegung und Sparmodus vorgegeben.
5. **Echte Texte?** Ja, 18 Texte mit gezählten Längen (höchstens 71 Zeichen, Grenze 90). Echt ist nur „Phili, 26.11.“; „Lena“, „Max“ und „Opa Hans“ sind als Testbeispiele gekennzeichnet.
6. bis 7. nur `treue` – entfällt.
8. **Vorbilder und Bewegungssprache:** Die Vorbilder aus Abschnitt 1 (Townscaper, Islanders) und 12 (Genre-Menüs) gelten weiter, ich habe keine neuen gesucht. Übernommenes Prinzip: genau ein Festobjekt, Belohnung in den Details statt Vollbild-Einblendung. Bewegung in 15.6: Lauflicht in 500-ms-Schritten (Takt „langsam“, nicht „flüssig“), ein Konfetti-Puff je App-Start, Überlagerung 240/180 ms.

## 5. Befunde
| # | Befund | Schwere | Sicherheit |
|---|---|---|---|
| B1 | **Datenschutz (möglicher kritischer Punkt, nur Simon):** Rufname, Geburtstag und Jahrgang eines Kindes stehen im Quellcode und sind für alle sichtbar, die das Spiel öffnen. Das Spiel liegt auf Cloudflare Pages (`docs/CLOUDFLARE.md`), das Repo vielleicht öffentlich. Das gilt schon heute für das alte Schild, mit der „Bald“-Anzeige wird es dauerhaft. Vorschlag: nur Rufnamen ohne Nachnamen (ist so), den Jahrgang weglassen, wo Simon unsicher ist (die Texte gehen auch ohne Alter), und Simon bestätigt es. | 3 | 65 (hängt davon ab, ob Repo und Adresse öffentlich sind – nicht geprüft) |
| B2 | Das Tafelfeld (15|5) muss im **Spielkern** für Gebäude gesperrt werden (neue Sperrregel, Sperrtext S1). Ohne diese Sperre kann ein Spieler dort bauen, dann verschwindet die Tafel. Das ist eine Spielregel und Arbeit für Architekt und Projektleiter, kein Design. | 2 | 90 |

## Unsichere Beobachtungen
- Bei 667×375 stehen die Tafelpfosten 7 px über dem Knopf „Dörfer“. Im Foto wirkt das nicht gedrängt; im Spiel prüfe ich es bei der Treue-Prüfung mit echtem Zeichnen. (Sicherheit 50)
- Am Desktop (1280×800) nicht geprüft. Gerechnet liegt die Tafel dort frei, weil der Zoom kleiner und die Fläche größer ist.

## 6. Übergabe an Architekt und Projektleiter
- **Kern** (`src/core/geburtstage.ts`, ersetzt `geburtstag.ts`): Liste `{ name, tag, monat, jahrgang? }` (Simon pflegt sie durch Zuruf) und eine reine Funktion `tafelInhalt(datum, liste)` → `heute | bald | neutral` mit Namen, Alter und Wochentag. Datum kommt von außen. Tests: Mitternachtsränder, 29.02., „morgen“, 6 und 7 Tage, mehrere am Tag, ohne Jahrgang, Jahreswechsel (31.12. → 2.1.).
- **Feldsperre** (15|5) für Gebäude, Leitungen erlaubt; altes Gebäude dort → keine Tafel, Meldung H1.
- **Szene:** Tafel als Objekt nach Tiefe; Zwischenleinwand je Text/Zoom/Jahreszeit/Birnenphase; Takt „langsam“ nur heute + im Bild + Animation an; 40 % und nicht antippbar bei `istDurchsichtig` und jeder Modus-Leiste; Fokusring bei Tastaturfokus.
- **Oberfläche:** Überlagerung als DOM-Popup (15.5), Esc/Zurück/daneben tippen, Fokus aufs ✕ und zurück.
- **Entfernen:** `src/ui/geburtstagsschild.ts`, der CSS-Block `.geburtstagsschild` in `stil.css`, der Aufruf in `main.ts`, `zeit_ms.geburtstag_schweben_zyklus` und die entfallenden `farbe.geburtstag`-Werte (15.8).
- **Bitte an den Projektleiter:** B1 in `docs/OFFENE_FRAGEN.md` unter „Nur Simon“ eintragen (mein Schreibbereich erlaubt das nicht). Danach Treue-Prüfung nach 15.10 einplanen.
