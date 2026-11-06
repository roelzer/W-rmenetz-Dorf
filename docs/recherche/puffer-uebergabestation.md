# Recherche: Puffer-Übergabestationen HP / ÜP 800 / 1000 (ENERPIPE) und Wandstation

Stand: 2026-11-06 · Modus: recherche (Gegenprüfung steht aus) · Ampel: GRÜN für Begriffe, Größen, Leistungen und Maße (Primärquelle selbst geöffnet); GELB für Preise (keine Listenpreise gefunden) und für die Deutung der kW-Spalte "HP" (siehe 2).

## Hauptquelle (selbst geöffnet und Seite für Seite gelesen)
ENERPIPE GmbH, "Haus- / Übergabetechnik – Technische Information", Ausgabe 04/26 (Doku-Nr. 821000112).
URL: https://www.enerpipe.de/fileadmin/daten/02_produkte/01_Nahwaermepufferspeicher/Haustechnik_TI_821000112.pdf
Gelesen wurden die Seiten 1-13 und 18-27 als Bild. Das Datenblatt auf S. 24 ist im PDF gedreht und klein; Zahlen daraus sind mit "mittel" eingestuft, weil ich sie am Bild abgelesen habe. Seiten 14-17 und 28-34 nicht gelesen.
Ältere Fassung (04/21) nicht geöffnet (Abruf lieferte nur Binärdaten, nicht ausgewertet).

## 1. Was sind HP und ÜP?
| Aussage | Quelle | Sicherheit | Einschränkung |
|---|---|---|---|
| Abkürzungen ausdrücklich definiert: SP = Schichtspeicher, **HP = Hochleistungsspeicher**, **ÜP = Übergabespeicher**, ZL = zentrale Ladung, DL = dezentrale Ladung, H = Hygienewendel, FRIWA = Frischwasser. NHP/NÜP = Niedertemperatur-Varianten. | ENERPIPE TI 04/26, S. 7 (und S. 9) | hoch (Primärquelle, wörtlich) | Korrigiert die frühere Deutung "HP = Hochleistungs-Pufferspeicher" (enerpipe_rohre_stationen.md) leicht: Es heißt Hochleistungs**speicher**. |
| Beide sind Nahwärme-Pufferspeicher mit angebauter Übergabeeinheit (Verrohrung, Schmutzfänger, 3-Wege-Kugelhahn, Volumenstromregler bzw. Ladepumpe, Ultraschall-Wärmemengenzähler, Regelung EPC), werkseitig verdrahtet und gedämmt. | TI 04/26, S. 3, 4, 20 | hoch | |
| **HP**: Systemtrennung über innenliegende **Hochleistungs-Rohrwendel** (Heizwendel-Wärmetauscher) im Speicher, kein Heizwassermischen; drehzahlgeregelte Ladepumpe (DL) bzw. Volumenstromregler (ZL). | TI 04/26, S. 3, 6, 7 | hoch | |
| **ÜP**: Systemtrennung über externen **Plattenwärmetauscher**, "hohe Leistung", "optimal bei Gebäuden mit hohem Wärmebedarf", drehzahlgeregelte Pufferladepumpe. | TI 04/26, S. 6, 7 | hoch | |
| Netzpumpe: DL = Pumpe in der Einheit (Netz ohne zentrale Netzpumpe, "kleine Wärmenetze mit 2-5 Gebäuden"); ZL = zentrale Netzpumpe im Heizhaus, Einheit hat Volumenstromregler ("Wärmenetze"). Auf der Produktseite: ZL ab ca. 5 Anschlüssen. | TI 04/26, S. 4, 6, 7; https://www.enerpipe.de/enerpipe-produkt/pufferspeicher-mit-zentraler-ladung | hoch | Produktseite nur per Zusammenfassung gelesen (mittel) |
| Warmwasser: Variante "mit Friwa" = externe Frischwasserstation (FWS 30/35/40) am Speicher; Variante "-H" = Hygienewendel (Edelstahl-Wellrohr) im Speicher, Durchlaufprinzip. Trinkwasser wird nicht bevorratet (Legionellen). | TI 04/26, S. 7, 21, 27 | hoch | |
| Weitere Reihen im gleichen Katalog: SP (Schichtspeicher, ohne Systemtrennung, "für ein Gebäude/Nebengebäude"), NHP/NÜP (Niedertemperatur), CaldoTHERM (Kompaktgerät Neubau), NÜGS (Niedertemperatur-Wandstation). | TI 04/26, S. 6-9 | hoch | |
| Hersteller: ENERPIPE GmbH, Hilpoltstein (Rohr-/Systemhersteller Nahwärme). Konkurrenzprodukte mit gleichen Namen nicht gefunden; die Typkürzel sind ENERPIPE-Katalogsprache. | TI 04/26 (Metadaten/Titel) | mittel | Ob andere Hersteller ähnliche Produkte mit anderen Namen haben: nicht untersucht |

## 2. Daten je Typ (600 / 800 / 1000)
"800" und "1000" sind das Speichervolumen: Bruttoinhalt in Litern (Datenblatt S. 24, Zeile "Bruttoinhalt", Einheit l). Typ 600 gibt es ebenfalls. Weitere Größen: keine gefunden (nur 600/800/1000).

### 2a. Leistung (Auslegungshilfe, S. 19) – Einheit kW
Quelle: TI 04/26, S. 19 "Auslegungshilfe". Beispiel 1: Netz VL 80 °C / RL 60 °C, Haus VL 70 / RL 55 °C. Beispiel 2: Netz 80/50 °C, Haus 70/45 °C. Der Hersteller schreibt: Werte sind Grundlage für die erste Auslegung und müssen planerisch durch ein Ingenieurbüro bestätigt werden; technische Änderungen vorbehalten.

| Typ | Volumen | Beispiel 1 (80/60 – 70/55) | Beispiel 2 (80/50 – 70/45) |
|---|---|---|---|
| HP / HP-H | 600 l | 15 kW | 22 kW |
| HP / HP-H | **800 l** | **19 kW** | **28 kW** |
| HP / HP-H | **1000 l** | **27 kW** | **40 kW** |
| ÜP / ÜP-H | 600 / 800 / 1000 l | 40 kW (jeweils gleich) | 60 kW (jeweils gleich) |
| SP / SP-H | 600 / 800 / 1000 l | 54 kW | 81 kW |
| NHP | 600 / 800 / 1000 l | Beladen 54 kW; Entladen 15 / 19 / 27 kW | Beladen 81 kW; Entladen 19 / 24 / 34 kW |
| NÜP | 600 / 800 / 1000 l | 40 kW (mit * 40 kW bei RL 56 °C) | 60 kW |

| Aussage | Quelle | Sicherheit | Einschränkung |
|---|---|---|---|
| ÜP-Leistung ist unabhängig vom Speichervolumen (40 bzw. 60 kW), HP-Leistung wächst mit dem Volumen (Rohrwendel-Fläche: 4,8 m² bei 800 l, 6,0 m² bei 1000 l). | S. 19, S. 24 | mittel-hoch | Rohrwendel-Flächen aus gedrehtem Datenblatt abgelesen |
| **Deutung unsicher:** In der Tabelle heißt die Spalte für HP/ÜP/SP "Maximale Beladeleistung". Die HP-Werte 15/19/27 sind aber identisch mit den "Endladeleistungen" des NHP, und im Diagramm (S. 19) hat "Verlaufsbeispiel HP1000" 27 kW **Spitzenheizleistung** und 20 kW **Dauerheizleistung**. Ob 19/27 kW also die Leistung ist, die der Speicher im Haus abgeben kann (Spitze), oder die Ladeleistung aus dem Netz, geht aus dem Text nicht eindeutig hervor. Die Begriffsdefinition auf S. 19: "Spitzenheizleistung = durch den Pufferspeicher im Gebäude zur Verfügung stehende Spitzenwärmeleistung; Dauerheizleistung = für die Heizleistung nötige Ladeleistung vom Wärmenetz". | S. 19 | unsicher (als Lesart) | Beim Hersteller (Tel. +49 9174 976507-0) klären oder Simon fragen |
| Beispiel-Tagesgang HP1000: Dauerheizleistung (Netz) 20 kW konstant, Spitzenheizleistung 27 kW, Beladung nachts/zwischen den Spitzen (10 kW Achsenstart), Entladung in den Spitzen um ca. 6 und 18 Uhr. | S. 19, Diagramm "Lade- und Entladeverhalten Pufferspeicher" | hoch (als Hersteller-Beispiel) | Beispiel mit Netz 80/60 °C; kein Rechenwert für alle Fälle |
| Warmwasser (Hygienewendel/Friwa): Zapfmenge 10 °C auf 45 °C bei Puffertemperatur 50 °C, 10 l/min, ohne Nachladung: HP800 mit Friwa ca. 460 l, HP1000 ca. 581 l (bei 20 l/min: 440 / 556 l; bei Puffer 65 °C, 20 l/min: 600 / 758 l). ÜP800 mit Friwa dieselben 460 l, ÜP1000 581 l. | S. 24 Datenblatt | mittel | gedrehte Tabelle abgelesen |
| Frischwasserstation FWS 30 / 35 / 40: Zapfleistung 1,5-30 / 1,5-35 / 1,5-40 l/min, 400×550×260 mm, 17 / 18 / 19 kg, max. 10 bar. Zapfleistung hängt von Puffertemperatur ab (Beispiel 45 °C Zapf, 10 °C Kalt, 15 K höhere Pufferwassertemperatur). | S. 27 | hoch | kW nicht angegeben |

### 2b. Maße, Gewicht, Druck (Datenblatt S. 24, Aufstellmaße S. 20/21)
Alle mm, kg, bar. Höhe "mit Isolierung", Durchmesser mit Isolierung.

| Typ | Volumen | Durchm. mit Dämmung | Höhe mit Dämmung | Tiefe A × Breite B (Aufstellmaß inkl. Einheit; mit Friwa-Station: B) | Gewicht Puffer ohne Dämmung | Quelle |
|---|---|---|---|---|---|---|
| HP-ZL/DL mit Friwa | 800 l | 1040 | 1750 | A 1306 × B 1310 | ca. 176,5 kg | S. 20, S. 24 (mittel) |
| HP-H (Hygienewendel) | 800 l | 1040 | 1750 | A 1306 × B 1040 | ca. 192 kg (HP800-H, Ablesung unsicher) | S. 21, S. 24 |
| HP-ZL/DL mit Friwa | 1000 l | 1040 | 2090 | A 1306 × B 1310 | ca. 211,5 kg | S. 20, S. 24 (mittel) |
| HP1000-H | 1000 l | 1040 | 2090 | A 1306 × B 1040 | ca. 241,7 kg | S. 21, S. 24 (mittel) |
| ÜP (mit Friwa) | 800 l | 1040 | 1750 | A 1465 × B 1310 | ca. 110,8 kg | S. 20, S. 24 (mittel) |
| ÜP (mit Friwa) | 1000 l | 1040 | 2090 | A 1465 × B 1310 | ca. 129,8 kg | S. 20, S. 24 (mittel) |
| Typ 600 (zum Vergleich) | 600 l | 950 | 1750 | HP A 1186, ÜP A 1370 × B 1210 | HP ca. 154 kg, ÜP ca. 97 kg | S. 20, S. 24 |

Weitere Datenblatt-Werte (S. 24, mittel): max. Betriebsdruck primär HP800/HP1000 und ÜP-Varianten 10 bzw. 16 bar (Ablesung unsicher, welche Variante welchen Wert hat); max. Betriebstemperatur 95 °C; Sekundärdruck 3 bar; ErP-Wärmeverlust ca. 2,12 kWh/24 h (800 l), 2,3 kWh/24 h (1000 l), ErP-Klasse B; Druckverlust Heizregister HP800 ca. 85 mbar, HP1000 ca. 105 mbar; Heizregister-Inhalt ca. 29,5 l (800) / 36,9 l (1000); Dämmung 105 mm Neopor + Vlies (Datenblatt) bzw. EPS-Graphit 125 mm (Einleitung S. 3) – **kleiner Widerspruch im Dokument**. Anschlüsse primär Vor-/Rücklauf Außengewinde 5/4".

### 2c. Preis
| Aussage | Quelle | Sicherheit | Einschränkung |
|---|---|---|---|
| **Kein Listenpreis für HP/ÜP 800/1000 gefunden.** ENERPIPE nennt auf der Produktseite keine Preise (nur Telefonnummer). Auch eine Suche nach Ausschreibungstexten (ausschreiben.de, heinze.de) lieferte keinen Ausschreibungstext für ENERPIPE-Pufferspeicher. | https://www.enerpipe.de/enerpipe-produkt/pufferspeicher-mit-zentraler-ladung (Zusammenfassung); Websuchen 2026-11-06 | mittel | Fehlen eines Treffers ist kein Beweis. Ausschreibungstexte direkt bei ausschreiben.de/heinze nicht durchsucht (Portal-Suche ohne Zugang). |
| Anschlusspauschalen von Netzbetreibern (Station inkl. Wärmetauscher/Speicher): Donauwörth Quartier Alfred Delp, Stand Q3 2026: ca. 5.877-9.447 EUR brutto; Adelsdorf 2024: 6.000-12.000 EUR inkl. Übergabestation und 20 m Leitung (Sofortanschluss) | https://www.donauwoerth.de/wp-content/uploads/2026/08/Preisflyer-Alfred-Delp-Quartier_Q3_26.pdf ; https://gw-adelsdorf.de/wp-content/uploads/2023/11/Aktuelle-Preise_2024.pdf | niedrig-mittel | nur aus Suchzusammenfassung, PDFs nicht selbst geöffnet; Pauschalen, Typ der Station nicht genannt; regional |
| Weitere Preisanhaltspunkte siehe vorhandene Recherchen (Kaufering, Steinen, Kirchheim) – hier nicht erneut geprüft. | docs/recherche/stationen-hp-up.md, enerpipe_rohre_stationen.md | wie dort | |
| Bauteilpreis eines Standard-Pufferspeichers ohne Übergabe (nicht vergleichbar): 1000 l ca. 980 EUR (Hornbach), PSF 600 Listenpreis 3.769 EUR (Guntamatic) | Suchzusammenfassung | niedrig | andere Produkte, nur als Größenordnung |

## 3. Warum senkt der Puffer die Netz-Anschlussleistung?
| Aussage | Quelle | Sicherheit | Einschränkung |
|---|---|---|---|
| Mit dezentralem Pufferspeicher ist die Vollbenutzungsstundenzahl höher und deshalb die Anschlussleistung geringer als bei Netzen mit herkömmlichen Übergabestationen, weil der Pufferspeicher die Wärmespitzen im Gebäude abfängt. Bei Wohngebäuden im Bestand liegt die Vollbenutzungsstundenzahl zwischen 1500 und 2200 h. | ENERPIPE TI 04/26, S. 19 "Bemessung der Anschlussleistung" | hoch (Hersteller, Primärquelle) | Herstellerangabe; Vollbenutzungsstunden-Spannen sind Herstellerwerte |
| Rechenbeispiel des Herstellers (S. 18): Anschlussleistung = Jahresarbeit / Vollbenutzungsstunden. Ohne Puffer 1500-1700 h, mit Puffer 2000-2200 h. Haus A 24.000 kWh/a: **16 kW ohne, 12 kW mit Puffer**; Haus B 36.000 kWh/a: **24 kW ohne, 18 kW mit Puffer**; **Haus C (EFH) 20.000 kWh/a: 13 kW ohne, 10 kW mit Puffer.** Nachrechnung: 20.000/1500 = 13,3 kW; 20.000/2000 = 10,0 kW. | TI 04/26, S. 18 | hoch (Zahlen und Rechnung stimmen) | Zuordnung "ohne/mit" aus Fußnoten gelesen: Fußnote "mit Pufferspeicher: 2000-2200 h; ohne: 1500-1700 h". Haus A und B haben in der Grafik einen Hygiene-/Friwa-Puffer. |
| Folge fürs Netz: schlankere Rohre. Beispiel S. 18: gleiche Trassen mit Puffer einen Rohrdurchmesser kleiner (32+32/111 statt 40+40/126, 25+25/111 statt 32+32/111) bei gleichem Druckverlust (0,70 bar); Abstrahlverluste "um bis zu 40 % reduziert" (15.135 kWh/a ohne gegen 9.105 kWh/a mit; Gesamtverlust im Einzelfall zu betrachten). Betriebstemperaturen im Beispiel unterschiedlich (ohne Puffer 70/55 bzw. 75/55 °C, mit 70/35 bzw. 75/50 °C) - der Vergleich ist also nicht nur "Puffer ja/nein". | TI 04/26, S. 18 | hoch (Zahlen); Aussagekraft "mittel" | Herstellerbeispiel mit Werbeabsicht; Temperaturen unterscheiden sich |
| Ladung mit kleiner, konstanter Leistung: Diagramm HP1000: Beladung mit 20 kW Dauerleistung, Spitzenabgabe im Haus 27 kW. Zusätzlich "intelligente Ladestrategie" senkt Anschlussleistung, Netzspitzen, Betriebszeiten, Netzpumpenstrom. | TI 04/26, S. 3, S. 19 | hoch | Hersteller |
| Ohne Puffer: Übergabestation muss die Spitze liefern, deshalb "Rohrdimensionierung ... größer", wenn nur Übergabestationen verbaut werden. | TI 04/26, S. 10, S. 12 (Anwendung) | hoch | |
| Unabhängige zweite Quelle für den Mechanismus: nicht gefunden (Suche nach Fachliteratur zu Puffer und Vollbenutzungsstunden lieferte nur Einzelgebäude-Pufferspeicher). | Websuche 2026-11-06 | - | offen: AGFW/Fachartikel, Bundesförderung BEW |

## 4. Bis zu welcher Leistung Puffer-Übergabe, was darüber?
| Aussage | Quelle | Sicherheit | Einschränkung |
|---|---|---|---|
| Der Pufferspeicher mit Übergabe liefert nach Auslegungshilfe: HP 800 l 19-28 kW, HP 1000 l 27-40 kW, ÜP 40-60 kW (je nach Temperaturspreizung). Das passt zu Simons Aussage "Standard bis ca. 40 kW"; ein Beleg für "ab 40 kW wird anders verbaut" ist das nicht ausdrücklich. | TI 04/26, S. 19 | mittel | Schlussfolgerung aus Tabelle, kein Satz im Dokument |
| Darüber: **Übergabestation Typ 100-500** (Heizleistung 100, 150, 200, 250, 300, 400, 500 kW bei Netz 80/60 °C, Haus 55/75 °C), bodenstehend auf Rahmen, Plattenwärmetauscher; Maße z. B. Typ 100: 1260 × 600 × 1470 mm, 80 kg; Typ 500: 2360 × 940 × 1470 mm, 276 kg. Dazwischen (15-80 kW): Wandstationen "Typ 15-80". | TI 04/26, S. 26, S. 11 | hoch | Preise nicht angegeben |
| Das Dokument empfiehlt die Pufferlösung "bei geringer Wärmebedarfsdichte"; die Übergabestation (ohne Puffer) wird genannt, wenn kein Platz für einen Puffer ist. Es nennt keine feste kW-Grenze. | TI 04/26, S. 3, S. 10 | hoch | |
| Bauhöhe: HP/ÜP 1000 l ca. 2,09 m hoch, Durchmesser 1,04 m mit Dämmung; bei 800 l 1,75 m. Kippmaß 1750 bzw. 2070 mm (ohne Dämmung). Platzbedarf damit eine Grenze für große MFH. | S. 20-23 | hoch | Folgerung (Platz) ist Interpretation |
| Mehrere HP/ÜP je Haus (Kaskade) oder Aufteilung: nicht gefunden. | - | - | offen |

## 5. Wandstation (ohne Puffer) – Ergänzung zur vorhandenen Recherche
Quelle: ENERPIPE TI 04/26, S. 10-13 (selbst geöffnet).
| Aussage | Quelle | Sicherheit | Einschränkung |
|---|---|---|---|
| Standard-Wandstationen Typ 15 / 25 / 40 / 60 / 80: Heizleistung 15 / 25 / 40 / 60 / 80 kW (Netz 80/60 °C, Haus 55/75 °C); Gewicht 32 / 33 / 36 / 54 / 55 kg; Maße Typ 15-40: 600 × 790 × 370 mm (B × H × T), Typ 60/80: 770 × 810 × 340 mm; Netz-Volumenstrom 0,7 / 1,1 / 1,8 / 2,6 / 3,5 m³/h; Temperaturbeständigkeit 95 °C; Edelstahl-Plattenwärmetauscher; ein Heizkreis plus Warmwasser; PUR-gedämmt; Wärmemengenzähler optional | TI 04/26, S. 10, S. 11 | hoch | Preis nicht angegeben |
| Leistung hängt von der Temperaturspreizung ab: z. B. Typ 40 liefert bei Netz 80/60 °C / Haus 55/75 °C 40 kW, bei 80/50 °C / 40/70 °C 82 kW; Typ 80 bei 80/50 / 40/70: 154 kW. | TI 04/26, S. 11 | hoch | Auslegung durch Fachplaner |
| Hochtemperatur-Wandstation Typ 15-80 (140 °C, Heizleistung bei Netz 90/60 °C: 22 / 41 / 68 / 122 / 143 kW) | TI 04/26, S. 13 | hoch | Netz-Temperaturen höher |
| Bei Station ohne Puffer muss die Rohrdimensionierung des Netzes größer ausfallen; Puffer fehlt als Spitzenpuffer (bestätigt Simons Aussage sinngemäß) | TI 04/26, S. 10, S. 12 | hoch | Dokument sagt "größer ausfallen", nennt keinen Prozentwert |
| Der Stationstyp 15 und 25 existiert beim Hersteller (Wandstation ab 15 kW) – das widerspricht Simons "Wandstation erst ab 40 kW" nicht zwingend, aber Typ 15/25 sind für kleine Häuser verfügbar. | TI 04/26, S. 11 | hoch | Simons Aussage evtl. auf Puffer-Übergabe vs. Wandstation bezogen |
| Wandstation-Preise: nur Netzbetreiber-Pauschalen aus den vorhandenen Recherchen (z. B. Kirchheim 7.000 / 8.000 / 10.000 EUR netto bis 15 / 30 / 50 kW; Steinen 4.800 EUR brutto bis 30 kW). In dieser Recherche nicht erneut geprüft; Kaufering: früher notiert 2.000 / 3.000 / 7.000 EUR netto für 25 / 60 / 150 kW. | vorhandene Recherchen | niedrig-mittel | aus Suchzusammenfassungen, regional, teils widersprüchlich (Kaufering vs. Kirchheim um Faktor 2-3) |
| Andere Hersteller (Varmeco 40/80 kW, Danfoss bis 75 kW, Caleffi 40 kW, MVV TAURUS bis 50 kW) | aus stationen-hp-up.md | mittel/niedrig | hier nicht neu geprüft |

## Pflichtfragen
1. **Belegt?** Begriffe, Größen, Leistungstabelle, Rechenbeispiel, Maße der Wandstationen: ja, aus selbst geöffnetem Hersteller-PDF (04/26), mit Seitenangabe. Datenblatt S. 24 nur am Bild abgelesen (mittel). Preise: nicht belegt (keine Listenpreise, nur regionale Pauschalen aus Suchtreffern).
2. **Einheiten?** 800/1000 = Liter Speichervolumen. Leistung in kW, gilt nur für die genannten Temperaturen (Beispiel 1: Netz 80/60, Haus 70/55 °C; Beispiel 2: 80/50, 70/45 °C). Maße mm, Gewichte kg. Preise EUR netto/brutto je Quelle gekennzeichnet. Nicht gültig: Werte gelten nur für ENERPIPE-Geräte, nicht herstellerübergreifend.
3. **Widersprüche?** (a) Bedeutung der kW-Spalte "HP" (Beladeleistung vs. Abgabe/Spitze, siehe 2a). (b) Dämmung 105 mm Neopor (S. 24) vs. 125 mm EPS (S. 3). (c) Kaufering vs. Kirchheim bei Pauschalpreisen. (d) Frühere Recherche (04/21: Typ 600 mit 68 kW Spitze/60 kW Dauer) passt nicht zu 04/26 (Typ 600 HP: 15-22 kW, ÜP: 40-60 kW); Ausgaben vermutlich unterschiedlich; 04/21-PDF nicht geprüft.
4. **Zweite unabhängige Quelle?** Nein, bisher nur ENERPIPE (Modus recherche). Für Mechanismus "Puffer senkt Anschlussleistung" keine unabhängige Quelle gefunden.
5. **Offen:** Listen- oder Ausschreibungspreise für HP/ÜP; Klärung der kW-Spalte beim Hersteller; seriöse Grenze "ab 40 kW anders" (nur indirekt belegt); Konkurrenzprodukte anderer Hersteller; Seiten 14-17 und 28-34 des PDFs (Regelung, Solar, Planung/Erhebungsbogen) nicht gelesen; Ausschreibungsportale (ausschreiben.de, heinze) nicht direkt durchsucht.

## Kandidaten für Fachregeln (nur Vorschlag, noch nicht bestätigt)
- Puffer-Übergabe (HP/ÜP, 600/800/1000 l) ist Standard für Gebäude bis etwa 40-60 kW; darüber Wandstation (bis 80 kW) bzw. Übergabestation Typ 100-500 (100-500 kW). (mittel, ENERPIPE)
- Netz-Anschlussleistung = Jahreswärme / Vollbenutzungsstunden; mit Puffer 2000-2200 h, ohne 1500-1700 h; EFH 20.000 kWh/a: 10 kW mit Puffer gegen 13 kW ohne. (hoch als Herstellerbeispiel; vor Fachregel zweite Quelle)
- Spielbezogen: Puffer-Station als Alternative zur Wandstation: kleinere Netzleistung je Haus, dafür Platz und Speicherkosten (Preis offen).

Quellenliste: siehe Hauptquelle oben; https://www.enerpipe.de/enerpipe-produkt/pufferspeicher-mit-zentraler-ladung ; https://www.donauwoerth.de/wp-content/uploads/2026/08/Preisflyer-Alfred-Delp-Quartier_Q3_26.pdf ; https://gw-adelsdorf.de/wp-content/uploads/2023/11/Aktuelle-Preise_2024.pdf ; https://www.hornbach.de/c/bad-sanitaer/warmwassergeraete/warmwasserspeicher/pufferspeicher/S33771/ ; https://www.guntamatic.com/fileadmin/PDF_Produkte/Preislisten/PSF.pdf
