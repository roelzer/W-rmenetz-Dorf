# NR23 – Neubaugebiet weniger dicht (Entwurf Designer, 2026-11-11)

**Auftrag (Simon, 2026-11-11):** „Das Neubaugebiet ist viel zu dicht gebaut, mach das breiter.“
**Grundlage:** Stand `origin/main` a4c56ef. Code nur gelesen (`git show origin/main:…`), nichts geändert.
**Art:** Entwurf. Die Koordinaten unten sind geprüft (Skript: keine Überschneidung, nichts auf Straße oder Fluss, jedes Haus hat ein freies Abzweigfeld zur Straße, zu allen Nachbarn mindestens ein freies Feld). Code, Tests und Spielstand-Umzug baut der Projektleiter.

---

## 1. Ist-Zustand

### Wo es steht
| Was | Datei (origin/main) | Inhalt |
|---|---|---|
| Kartengröße | `src/core/katalog.ts` Z. 339–340 | `feldanzahl: 24` (Breite **und** Zeilenlänge aller Feldschlüssel `y*24+x`), `neubau_hoehe: 40` |
| Häuser, Straßen, Fluss | `src/core/neubaugebiet.ts` | Liste `parzellen` (aus 9e227c5) + `suedblock` (aus d1abb46), Straßen und Fluss für y = 24 … 39 |
| Einbau in den Spielstand | `src/core/neubaugebiet.ts` `neubaugebietAnlegen()` | Merker `neubaugebiet_layout = 2`; alte Stände mit nur den 16 Häusern bekommen den Südblock nachgereicht |
| Kartenhöhe im Spiel | `src/core/spiel.ts` Z. 397 | `kartenHoehe` = 40 nach Stufe 6, sonst 24 |
| Feldlänge | `src/core/katalog.ts` Z. 406 | 1 Feld = 10 m (Simon, Q2) |
| Kamera „Zum Neubaugebiet“ | `src/steuerung.ts` Z. 268–273 | `zentrieren(10, (24 + kartenHoehe − 1) / 2)` beim gerade eingestellten Zoom |

### Plan (Ausschnitt y = 24 … 39; `=` Straße, `~` Fluss, `E` Einfamilienhaus, `R` Reihenhaus, `M` Mehrfamilienhaus 2×2)
```
      x 012345678901234567890123
   y=24 ........E.=.R......~~...
   y=25 ........R.=.E......~~...
   y=26 ........R.=.R......~~...
   y=27 ........E.=.R......~~...
   y=28 ........R.=.E......~~...
   y=29 ........R.=.R......~~...
   y=30 ........E.=.R......~~...
   y=31 ........R.=.E......~~...
   y=32 .....=============.~~...
   y=33 .....=....=........~~...
   y=34 .....=RRER=ERMMR...~~...
   y=35 .....=RERR=RRMMR...~~...
   y=36 .....=....=........~~...
   y=37 .....=============.~~...
   y=38 ..........=........~~...
   y=39 ......ERRE=RERRE...~~...
```

### Befund in Zahlen
| Merkmal | Ist |
|---|---|
| Häuser | 40 (13 EFH, 26 RH, 1 MFH) |
| Abstand Haus zu Haus | **0 Felder** überall: an der Hauptstraße 16 Häuser lückenlos untereinander (x = 8 und 12, y = 24–31), im Südblock lückenlose Reihen (x = 6–9 und 11–15) |
| Reihen 34 und 35 | Rücken an Rücken ohne Garten, dazwischen kein freies Feld |
| Reihe 39 | steht in der letzten Kartenzeile, kein Rand bis zur Wolkenkante |
| Gärten | keine. Die gezeichneten Gärten und Zäune hat b389b68 („Gärten entfernen“) wieder herausgenommen; jedes Haus füllt sein Feld |
| Straße bis Haus | 1 Feld Vorgarten (für den Hausanschluss) – das ist gut und bleibt |
| Ungenutzter Platz | x = 0–4 und 16–18 fast leer; Ostufer x = 21–23 leer |
| Vergleich Altdorf | Die Häuser im Dorf haben immer mindestens 1 freies Feld zueinander (`orte.ts` Z. 87–90). Das Neubaugebiet ist damit das einzige Viertel ohne Lücken |

### Fotos (844×390, Gerätefaktor 2, Playwright, Dev-Server auf origin/main, alle Baustellen fertig gestellt)
- `docs/bauplaene/NR23-fotos/ist-neubaugebiet-zoom2.2.png` – Knopf „Zum Neubaugebiet“ (Zoom 2,2). Man sieht zwei lückenlose Hauszeilen entlang der Hauptstraße und den zusammengeballten Südblock.
- `docs/bauplaene/NR23-fotos/ist-neubaugebiet-zoom1.1.png` – herausgezoomt. Neben dem Altdorf mit seinen Lücken wirken die Zeilen wie Bauklötze in einer Reihe; links und unten liegt viel leere Wiese.

---

## 2. Soll-Zustand

### Leitbild
Ein echtes Neubaugebiet: eine **Sammelstraße** (die Hauptstraße läuft weiter nach Süden) und davon abgehend **drei Wohnstraßen** nach Westen und Osten. An jeder Wohnstraße liegen auf beiden Seiten Grundstücke. Jedes Grundstück ist so aufgebaut:

```
 Straße   (1 Feld, 10 m)
 Vorgarten mit Hausanschluss  (1 Feld)
 Haus     (1 Feld)
 Garten   (1 Feld)      ← trifft hinten auf den Garten der Nachbarstraße
```
- **Grundstück:** 2 Felder breit × 3 Felder tief = 20 m × 30 m = 600 m². Das ist ein übliches Einfamilienhaus-Grundstück.
- **Zwischen zwei Häusern an derselben Straße:** genau 1 freies Feld (Raster 2). Das ergibt einen Hausabstand von 10 m, so viel wie im Altdorf.
- **Zwischen zwei Hausreihen Rücken an Rücken:** 2 freie Felder (die beiden Gärten).
- **Über die Straße:** Vorgarten + Straße + Vorgarten = 3 Felder.
- **Mehrfamilienhaus:** 2×2 Felder, daneben 2 Felder Quartiersgrün (Platz x = 14–17, y = 36–37 bleibt leer).
- **Ostufer und Uferstreifen bleiben frei:** x = 17–18 (Wohnstraßen enden an x = 17), x = 21–23 bleibt Aue. Kein Haus direkt am Fluss.
- **Gezeichnete Gärten oder Zäune nicht wieder einführen.** Simon hat sie gestern entfernt. Die Grundstücke liest man allein an den Abständen (Foto-Attrappe zeigt: reicht).

### Plan (y = 24 … 45)
```
      x 012345678901234567890123
   y=24 ..........=........~~...
   y=25 ..E.R.R.E.=.R.E.R..~~...
   y=26 ..........=........~~...
   y=27 .=================.~~...      Wohnstraße Nord
   y=28 ..........=........~~...
   y=29 ..R.E.R.R.=.R.R.E..~~...
   y=30 ..........=........~~...
   y=31 ..........=........~~...
   y=32 ..R.E.R.R.=.R.R.E..~~...
   y=33 ..........=........~~...
   y=34 .=================.~~...      Wohnstraße Mitte
   y=35 ..........=........~~...
   y=36 ..R.R.E.R.=.MM.....~~...
   y=37 ..........=.MM.....~~...
   y=38 ..........=........~~...
   y=39 ..R.R.E.R.=.E.R.R..~~...
   y=40 ..........=........~~...
   y=41 .=================.~~...      Wohnstraße Süd
   y=42 ...................~~...
   y=43 ..E.R.R.E...R.E.R..~~...
   y=44 ...................~~...      Gärten der letzten Reihe
   y=45 ...................~~...      Ortsrand (ein Feld bis zur Wolkenkante)
```

### Kartengröße
- `neubau_hoehe`: **40 → 46** (+6 Zeilen = +60 m nach Süden).
- `feldanzahl` (Breite 24) **bleibt**. Grund: Die Zahl ist zugleich die Zeilenlänge aller Feldschlüssel `y*24+x`, und solche Schlüssel stehen im Spielstand (`gestattungen` in `typen.ts`). Eine breitere Karte würde alte Spielstände beschädigen. „Breiter“ heißt hier: breitere Abstände; Platz kommt aus den heute leeren Rändern x = 1–5 und 14–18 und aus 6 neuen Zeilen im Süden.
- Fluss x = 19/20 wächst automatisch mit (Schleife bis `neubau_hoehe`), die Wolkenkante auch (Foto-Attrappe geprüft).

### Straßen (Felder)
| Straße | Felder |
|---|---|
| Hauptstraße (Sammelstraße) | x = 10, y = 24 … 41 (bisher bis 39) |
| Wohnstraße Nord | y = 27, x = 1 … 17 |
| Wohnstraße Mitte | y = 34, x = 1 … 17 |
| Wohnstraße Süd | y = 41, x = 1 … 17 |
| entfällt | y = 32 und y = 37 (x = 5 … 17), x = 5 (y = 33 … 36) |

Die Wohnstraßen enden an x = 1 und x = 17 als Stich (Wendeanlage = einfach das Straßenende). Keine Ringstraße im Westen, sonst stünden die Häuser bei x = 2 ohne Vorgarten an der Straße.

### Hausliste (40 Häuser, dieselbe Mischung wie heute: 13 EFH, 26 RH, 1 MFH)
Typregel bleibt wie im Südblock heute: `(x + y) % 3 === 0 ? 'efh' : 'rh'` – sie ergibt mit diesen Plätzen genau 13 EFH und 26 RH (nachgerechnet).

| Reihe y | an Straße | Häuser (x: Typ) |
|---|---|---|
| 25 | Nord (Vorgarten y = 26) | 2 E · 4 R · 6 R · 8 E · 12 R · 14 E · 16 R |
| 29 | Nord (Vorgarten y = 28) | 2 R · 4 E · 6 R · 8 R · 12 R · 14 R · 16 E |
| 32 | Mitte (Vorgarten y = 33) | 2 R · 4 E · 6 R · 8 R · 12 R · 14 R · 16 E |
| 36 | Mitte (Vorgarten y = 35) | 2 R · 4 R · 6 E · 8 R · **MFH 12 (2×2: x 12–13, y 36–37)** |
| 39 | Süd (Vorgarten y = 40) | 2 R · 4 R · 6 E · 8 R · 12 E · 14 R · 16 R |
| 43 | Süd (Vorgarten y = 42) | 2 E · 4 R · 6 R · 8 E · 12 R · 14 E · 16 R |

Als Liste zum Abtippen (`typ x y`):
```
efh 2 25, rh 4 25, rh 6 25, efh 8 25, rh 12 25, efh 14 25, rh 16 25,
rh 2 29, efh 4 29, rh 6 29, rh 8 29, rh 12 29, rh 14 29, efh 16 29,
rh 2 32, efh 4 32, rh 6 32, rh 8 32, rh 12 32, rh 14 32, efh 16 32,
rh 2 36, rh 4 36, efh 6 36, rh 8 36, mfh 12 36,
rh 2 39, rh 4 39, efh 6 39, rh 8 39, efh 12 39, rh 14 39, rh 16 39,
efh 2 43, rh 4 43, rh 6 43, efh 8 43, rh 12 43, efh 14 43, rh 16 43
```
Bauzeiten gestaffelt wie heute (Regel `bau_s` aus `suedblock` übernehmen); das MFH zuletzt (900 s).

Zum Altdorf bleibt Abstand: Die südlichsten Dorfhäuser stehen bei y = 20 (rh 4|19, rh 6|20, efh 12|20), das Neubaugebiet beginnt mit Gärten bei y = 24.

### Kamera auf 844×390
Gemessen in der Attrappe (siehe Fotos unten):
| Punkt | Ist | Soll |
|---|---|---|
| Kamera-Grenze | wächst mit `kartenHoehe` mit | unverändert; alle vier Ecken (2\|25), (16\|25), (2\|43), (16\|43) lassen sich bei Zoom 2,2 in die Bildmitte holen (gemessen) |
| „Zum Neubaugebiet“ heute | Zoom bleibt, Mitte (10\|31,5): bei 2,2 sieht man etwa die Hälfte des Viertels | Mitte (10\|34,5): bei 2,2 nur noch etwa ein Drittel |
| **Vorschlag** | – | „Zum Neubaugebiet“ passt den Rahmen x 1–17, y 24–44 in die freie Fläche ein (vorhandene `kamera.einpassenZiel`/`einpassen`, Rand 8 px, freie Fläche ohne HUD oben ~48 px und ohne rechte Knopfspalte ~72 px, ohne offenes Blatt). Ergebnis: **Zoom ≈ 1,39**, Mitte ≈ (9\|34). Fahrt mit `menue.kurve.weich` wie die übrigen Kamerafahrten |
| Gleicher Rahmen heute | Zoom ≈ 2,09 für x 6–15, y 24–39 | – |

Bei Zoom 1,39 ist ein Feld etwa 36 px breit. Das ist eine Übersicht; zum Antippen einzelner Häuser zoomt man hinein. Darum nicht kleiner als 1,39 einpassen.

### Fotos der Attrappe (844×390)
Für diese Fotos habe ich im Browser die Datei `neubaugebiet.ts` durch eine Attrappe mit dem Soll-Plan ersetzt und `neubau_hoehe` auf 46 gesetzt. Das lief nur im Browser über Netzabfang, das Projekt ist unverändert. Sie zeigen also die echte Spielgrafik mit dem neuen Plan:
- `docs/bauplaene/NR23-fotos/soll-attrappe-zoom2.2.png` – heutiger Knopf „Zum Neubaugebiet“ mit neuem Plan. Zwischen allen Häusern liegt Wiese, die Wohnstraßen lesen sich klar. Das Ganze wirkt wie das Altdorf.
- `docs/bauplaene/NR23-fotos/soll-attrappe-eingepasst-zoom1.39.png` – vorgeschlagene Übersicht (eingepasst). Alle drei Wohnstraßen und der Fluss sind zu sehen; die Südreihe liegt knapp über dem Hinweisband „Mehr Platz zum Spielen“.

---

## 3. Folgen

### Wärmebedarf
**Unverändert**, weil Zahl und Mischung der Häuser gleich bleiben: 13 × 15.000 + 26 × 24.000 + 1 × 45.000 = **864.000 kWh/a**. Anschlussleistung im Spiel (÷ 1.500 h): 13 × 10 + 26 × 16 + 30 = **576 kW**. Die Stufe-6-Ziele (`HZ_ZIELE`) beziehen sich nicht auf das Neubaugebiet.

### Leitungslängen (kürzestes Netz, das jedes Haus mit einem 1-Feld-Abzweig erreicht; ab Feld (10|24), Zubringer aus dem Dorf gleich)
| Teil | Ist | Soll |
|---|---|---|
| Hauptstraße x = 10 | y 24–37 = 14 Felder | y 24–41 = 18 Felder |
| Querleitungen | y 32 und y 37, je x 6–15 ohne 10 = 2 × 9 Felder | y 27, 34, 41, je x 2–16 ohne 10 = 3 × 14 Felder |
| **Verteilleitung** | **32 Felder = 320 m** | **60 Felder = 600 m** |
| Hausanschlüsse (Vorgarten) | 40 × 1 Feld = 400 m | 40 × 1 Feld = 400 m |
| **Summe** | **720 m** | **1.000 m (+280 m, +39 %)** |
| Wärme je Meter Leitung | 864 MWh/a ÷ 720 m = 1,2 MWh/(m·a) | 864 MWh/a ÷ 1.000 m ≈ 0,86 MWh/(m·a) |

Was das im Spiel bedeutet: 28 Leitungsfelder mehr kosten Material (je nach Rohr 10 € bis 185 € je Feld, `katalog.ts`) und Bauabschnitte. Gestattungen bleiben gleich (je Haus ein Vorgartenfeld). Die Spiel-Rechnung kennt keine längenabhängigen Wärmeverluste, darum ändert sich am Wärmeabsatz nichts. Die Kennzahl „Wärme je Meter“ ist nur nachgerechnet. Soll sie im Spiel als Wissen erscheinen (z. B. „Neubaugebiete sind weniger dicht, jeder Meter Leitung bringt weniger Wärme“), muss der Fachprüfer sie vorher freigeben.

### Ausbaureserve
**Keine Auswirkung.** Die Ausbaureserve gilt nur, solange die Heizzentrale 2×2 groß ist (`spiel.ts` Z. 440–441, `groesse(hz) !== 2`). Bei Stufe 6 ist sie 3×3, und sie liegt im Altdorf (11|10).

### Stufe 6
- Auslöser, Hinweistext („Neubaugebiet Süd erschlossen · Folge der Hauptstraße nach Süden“) und Freischaltung (`freischaltung.ts`, `neubaugebiet: 6`) bleiben; der Text stimmt weiter.
- `istNeubau()` (bestand, y ≥ 24, Haus) bleibt richtig.
- Neue Spiele bekommen beim Erreichen von Stufe 6 direkt den neuen Plan (neue Layout-Nummer **3**).

### Alte Spielstände (Abnahme: „laden ohne Verlust“) – Bitte an Projektleiter/Architekt
Das Neubaugebiet gibt es erst seit 2026-11-10, trotzdem kann ein Stand schon Leitungen und Stationen dort haben (Simons eigener Stand wahrscheinlich). Vorschlag für die Umstellung von Layout 2 (oder der älteren 16-Häuser-Fassung) auf Layout 3:
1. **Alte Pläne einfrieren:** Die heutigen Listen `parzellen`/`suedblock` als „Layout 2“ unverändert im Code behalten. `gartenumbauRueckgaengig()` (`spiel.ts` Z. 891–932) rekonstruiert die Ursprungsplätze durch zweimaliges Aufrufen von `neubaugebietAnlegen()` und Abgleich über die ID-Reihenfolge. Liefert diese Funktion künftig den neuen Plan, findet der Rückbau falsche Plätze und kann ein Haus um bis zu 2 Felder an einen falschen Platz setzen.
2. **Reihenfolge beim Laden:** Heute läuft `neubaugebietAnlegen()` im `Spiel`-Konstruktor (Z. 78), der Garten-Rückbau erst danach in `main.ts` Z. 50. Die Umstellung auf Layout 3 muss **nach** dem Garten-Rückbau laufen.
3. **Haus für Haus umziehen, nur wenn es sicher ist** (gleiches Muster wie im Garten-Rückbau): altes Haus über die feste Reihenfolge seinem Layout-2-Platz zuordnen und dem nächsten freien Layout-3-Platz **gleichen Typs** zuweisen (beide Pläne haben 13/26/1). Ein Haus zieht nur um, wenn es keine Station hat (`ohne_station`), kein Leitungsfeld (gebaut oder geplant) an seinem Rand liegt, kein Ausbau läuft und der Zielplatz frei und keine Straße ist. Sonst bleibt es stehen, und sein Zielplatz bleibt leer. Kein Haus geht verloren, keine Leitung wird verschoben.
4. **Bleibt ein Haus auf einem neuen Straßenfeld stehen** (betrifft alte Plätze in Zeile y = 27 und y = 34): Das Straßenfeld unter dem Haus wird für diesen Stand nicht gezeichnet (Lücke in der Straße). Das ist die Entscheidung mit dem geringsten Schaden; Alternativen (Haus samt Anschluss versetzen) bedeuten Verlust. **Entscheidet der Projektleiter.**
5. Nach dem Umzug eine einmalige Meldung, z. B. „Das Neubaugebiet ist großzügiger geplant: 31 Häuser sind auf breitere Grundstücke umgezogen. 9 Häuser mit Anschluss bleiben, wo sie sind.“ (echte Zahlen einsetzen).

### Tests mit festen Koordinaten oder Zahlen des Neubaugebiets
| Datei | Was betroffen ist | Anpassung |
|---|---|---|
| `tests/neubaugebiet.test.ts` (Test 1) | `kannPlatzieren('d160', 10, 40)` erwartet `false` (Kartenende) | auf `10, 46` |
| | `istStrasse(5, 35)`, `(15, 32)`, `(15, 37)` | werden falsch → `istStrasse(5, 34)`, `(15, 27)`, `(15, 41)`; zusätzlich `istStrasse(15, 32) === false` (Hausreihe) |
| | Haus bei (12\|24), Leitung (10\|24)/(10\|25), Abzweig `d50` bei (11\|24) | Haus (12\|24) gibt es nicht mehr → Haus (12\|25), Abzweig (11\|25) |
| | `haeuser.toHaveLength(40)` (zweimal) | bleibt 40 |
| | `spiel.netz.tiefe.has(24 * feldanzahl + 10)` | bleibt |
| `tests/neubaugebiet.test.ts` (Test 2 „ergänzt das neue Straßenviertel … genau einmal“) | Stand ohne Layout-Merker, Haus efh (8\|30), Leitung (10\|31); erwartet 24 Objekte mit y ≥ 32 | neu schreiben für den Umzug auf Layout 3: Haus ohne Anschluss zieht um, Haus mit Leitung am Rand bleibt, Zahl der Häuser gleich, zweites Laden ändert nichts |
| `tests/gartenumbau.test.ts` (Test 3 „ordnet ein verschobenes Haus im Neubaugebiet … zu“) | ruft `neubaugebietAnlegen()` und erwartet, dass der Rückbau das Haus an den Ursprungsplatz zurücksetzt | auf den eingefrorenen Layout-2-Plan stellen (siehe Punkt 1) |
| neu | – | Test „Layout 3“: 40 Häuser, 13/26/1, kein Haus auf Straße/Fluss, Chebyshev-Abstand ≥ 2 zwischen allen Hausflächen, jedes Haus hat ein freies Randfeld neben einer Straße, Kartenhöhe 46 |
| neu | – | Test Ladereihenfolge: Stand mit `garten_layout: 1` und Layout 2 → erst Rückbau, dann Umzug |

Nicht betroffen (geprüft per Suche): `tests/a92-sperre-schloss.test.ts`, `tests/a92-sperrtexte.test.ts`, `tests/menue-v2.test.ts` nutzen (30\|30) als Feld außerhalb der Karte. x = 30 bleibt außerhalb, weil die Breite 24 bleibt. Browser-Prüfungen (`tests/browser/*.cjs`) nutzen keine Neubau-Koordinaten. Dateien mit `.verdeckt` im Namen nicht geöffnet.

Code-Stellen, die sich durch `neubau_hoehe` von selbst anpassen (nur gelesen): `netz.ts` `MAX_Y`, `szene.ts` Z. 75 (Feldspeicher), `spiel.ts` `kartenHoehe`, Kamera-Grenze `kamera.ts` Z. 122. Fest im Code und anzupassen: `neubaugebiet.ts` (Plan), `steuerung.ts` `neubaugebietZeigen()` (Einpassen statt Zentrieren).

---

## 4. Prüfkriterien für das Foto nach dem Bau (Designer-Treue)
Aufnahme: 844×390, Gerätefaktor 2, Touch, Querformat. Stand mit Heizzentrale Stufe 6, alle Neubau-Baustellen fertig. Hinweisband „Mehr Platz zum Spielen“ vorher schließen.
1. **Übersicht (Knopf „Zum Neubaugebiet“):** Alle drei Wohnstraßen, die Hauptstraße bis y = 41 und alle 6 Hausreihen sind ganz zu sehen, nichts liegt unter HUD oder rechter Knopfspalte. Zoom zwischen 1,35 und 1,5.
2. **Kein Haus berührt ein anderes:** Zwischen allen Häusern liegt sichtbar mindestens ein Wiesenfeld, auch über Eck. Zwischen Reihen Rücken an Rücken liegen zwei Felder.
3. **Vorgarten:** Jedes Haus hat genau ein Wiesenfeld zur Straße; kein Haus steht direkt an der Straße.
4. **Dichte wie das Altdorf:** Auf dem herausgezoomten Bild (Zoom 1,1) wirkt das Neubaugebiet nicht dichter als das Dorf darüber. Vergleich mit `docs/bauplaene/NR23-fotos/soll-attrappe-*.png`: gleiche Anordnung.
5. **Ränder:** Unter der letzten Reihe (y = 43) liegen zwei Felder Wiese bis zur Wolkenkante; östlich der Häuser bei x = 16 zwei freie Felder bis zum Fluss; das Ostufer ist frei.
6. **MFH** steht an der Mitte-Straße östlich der Hauptstraße mit freier Grünfläche daneben.
7. **Bei Zoom 2,2** lassen sich alle vier Eckhäuser in die Bildmitte schieben, ohne dass die Karte vorher stoppt.
8. **Alter Stand:** Ein Stand aus Layout 2 mit mindestens einem angeschlossenen Neubauhaus lädt; das angeschlossene Haus bleibt warm an seinem Platz, die übrigen sind umgezogen, die Meldung erscheint einmal.
9. **Flüssig:** Beim Ziehen über das größere Gebiet keine sichtbaren Ruckler (Prüfung wie NR12).
