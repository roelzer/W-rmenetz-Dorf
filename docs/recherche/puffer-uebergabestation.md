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

---

## Gegenprüfung 2026-11-06

Modus: gegenpruefung (frischer Aufruf, Pfad der Recherche war die einzige Eingabe). Alle Quellen unten habe ich selbst geöffnet und als Bild gelesen, außer wo "Suchzusammenfassung" steht. Ampel: **GELB**. Die Recherche ist in ihren ENERPIPE-Zahlen sauber, aber (a) die Deutung der kW-Spalte war falsch/offen und ist jetzt geklärt (siehe 1), (b) Zahlen "mit Puffer 2000-2200 h" haben weiter nur eine Herstellerquelle, (c) für HP/ÜP gibt es weiter keinen Preis.

### Zusammenfassung je Aussage (bestätigt / widersprochen / offen)

| Aussage der Recherche | Urteil | Quelle(n) der Gegenprüfung | Einstufung |
|---|---|---|---|
| HP800 = 19/28 kW, HP1000 = 27/40 kW, ÜP = 40/60 kW, Typ 600 HP 15/22 kW (TI 04/26, S. 19) | **bestätigt** (Zahlen stimmen mit S. 19 überein, selbst gelesen) | ENERPIPE TI 04/26, S. 19 | hoch (Zahlen) |
| "Deutung der kW-Spalte unsicher: Beladeleistung aus Netz oder Spitze im Haus?" | **geklärt, mit Korrektur** (siehe Abschnitt 1): HP-Werte (Beispiel 1) sind die **Spitzenabgabe im Haus**, die Netz-Ladeleistung ist deutlich kleiner (HP800 14 kW, HP1000 20 kW). Die Überschrift "Maximale Beladeleistung" in 04/26 ist für HP irreführend. Für ÜP ist es umgekehrt (40 kW = Netz-Dauerleistung). | ENERPIPE-Broschüre 06/18, S. 13 (Tab. 4/5); TI 04/26, S. 19 | mittel (gleicher Hersteller, ältere Ausgabe; keine zweite unabhängige Quelle) |
| Frühere Recherche "04/21: Typ 600 mit 68 kW Spitze / 60 kW Dauer" widerspricht 04/26 | **Widerspruch aufgelöst**: 68/60 kW ist der **Schichtspeicher SP Typ 600, Beispiel 2** (80/50 °C), nicht HP/ÜP. Ausgabe 04/21 selbst nicht gefunden/geöffnet; ich konnte nur 06/18 öffnen. | Broschüre 06/18, S. 13, Tab. 5 | mittel |
| Vollbenutzungsstunden ohne Puffer 1500-1700 h | **bestätigt** durch unabhängige Quelle | Fraunhofer UMSICHT, Leitfaden Nahwärme (Dötsch/Taschenberger/Schönberg), S. 11: "Typische Vollbenutzungsstunden der Anschlußwerte betragen 1500 h/a bzw. 1700 h/a (mit Brauchwasser)" | hoch für 1500-1700 h als Richtwert ohne Puffer |
| Vollbenutzungsstunden mit Puffer 2000-2200 h | **offen** (nur ENERPIPE: TI 04/26 S. 18, Broschüre 06/18 S. 12; keine unabhängige Zahl gefunden) | - | unsicher (Herstellerangabe) |
| Mechanismus: Puffer im Haus glättet Spitzen, deshalb kleinere Anschlussleistung und schlankeres Netz | **qualitativ bestätigt** durch zwei unabhängige Quellen, **zahlenmäßig offen** | (a) BWK 12/2012 (Springer-VDI, REHAU-Sonderdruck), "Gleichzeitigkeit - der unterschätzte Faktor", Abschnitt "Einsatz von Pufferspeicher", Bild 2: Speicher beim Abnehmer wirken auf Erzeugung **und** Verteilung, Erzeugungsanlagen, Rohre und Pumpen können kleiner werden; Speicher nur am Heizhaus wirkt nicht aufs Netz. (b) Fraunhofer UMSICHT Leitfaden, S. 8: Speichersysteme sind länger in Betrieb, dadurch verringern sich die Spitzen des Volumenstroms im Netz (dort für Warmwasser) | mittel (REHAU ist Rohrhersteller mit Eigeninteresse, aber kein ENERPIPE-Abschreiber) |
| Simons A71: 1500 h ohne, 1800 h mit Puffer | **ohne Puffer bestätigt (1500 = unterer Wert beider Quellen); mit Puffer 1800 h nicht belegt**: liegt unter ENERPIPEs 2000-2200 h, also vorsichtig, aber ohne Quelle. | s. oben | 1500: hoch; 1800: unsicher (Spielwert, kein Fachwert) |
| Rechenbeispiel EFH 20.000 kWh/a: 13 kW ohne, 10 kW mit Puffer | **bestätigt als Herstellerbeispiel** (S. 18 selbst gelesen; 20.000/1500 = 13,3; 20.000/2000 = 10,0). Gleiche Zahlen in Broschüre 06/18, S. 12 (nur wiederholt, nicht unabhängig). | TI 04/26 S. 18; Broschüre 06/18 S. 12 | hoch als Beispiel, kein Beleg für Allgemeingültigkeit |
| "Abstrahlverluste bis zu 40 % geringer (15.135 gegen 9.105 kWh/a)" | **bestätigt als Hersteller-Beispiel**; 9.105/15.135 = 0,60, also genau -40 %. Betriebstemperaturen im Beispiel unterschiedlich (Sommer 70/55 gegen 70/35 °C), der Effekt ist nicht nur "Puffer". Gleiche Aussage schon 2014 als Hersteller-Pressetext (baulinks 12.06.2014, Enerpipe) - nicht unabhängig. | TI 04/26 S. 18; baulinks 2014 | mittel |
| Beispiel-Tagesgang HP1000: Netz konstant 20 kW, Spitze 27 kW | **bestätigt** (identisch in 06/18 S. 13 Abb. 44 und 04/26 S. 19) | beide Ausgaben | hoch |
| Maße/Gewichte Stichprobe (Datenblatt S. 24, 04/26) | **bestätigt**: Gewicht Puffer HP800 mit Friwa 176,54 kg, HP800-H 192,2 kg, HP1000 mit Friwa 211,45 kg, HP1000-H 241,7 kg, ÜP800 110,78 kg, ÜP1000 129,78 kg; Durchmesser mit Dämmung 1040 mm; Höhe mit Dämmung 1750 (800 l) / 2090 mm (1000 l); Heizregister HP800 4,8 m², HP1000 6,0 m²; ErP-Verlust 2,12 / 2,3 kWh/24 h, Klasse B | TI 04/26, S. 24 (gedrehte Tabelle, Bild gelesen) | mittel-hoch |
| "Dämmung 105 mm (Datenblatt) gegen 125 mm (S. 3) = Widerspruch" | **kein Widerspruch**: Datenblatt nennt "Neopor 105 mm + Vlies 20 mm" = 125 mm. Passt auch rechnerisch: Durchmesser 790 mm ohne, 1040 mm mit Dämmung = 125 mm je Seite. | TI 04/26 S. 24 | hoch |
| Aufstellmaße A/B (ÜP A 1465 x B 1310, HP A 1306 x B 1310) | **nicht neu geprüft** (04/26 S. 20/21 nicht erneut geöffnet). Hinweis: Ausgabe 06/18 nennt andere Werte (ÜP A 1390, B 1295; HP A 1306, B 1295; Höhe 1735 statt 1750), also ändern sich Maße zwischen Ausgaben um einige cm. | Broschüre 06/18 S. 14 | offen (für Spiel unkritisch) |
| Warmwasser-Zapfmengen (460 l / 581 l usw.), FWS 30/35/40 (17/18/19 kg, 400x550x260 mm) | **bestätigt** (S. 24, S. 27 gelesen). Zusatz: Kaskade FWS 80/120/160 bis 160 l/min (S. 28). | TI 04/26 S. 24, 27, 28 | hoch (FWS), mittel (Zapfmengen) |
| Übergabestation Typ 100-500: 100-500 kW (80/60 – 55/75), z. B. Typ 100 1260x600x1470 mm, 80 kg; Typ 500 2360x940x1470 mm, 276 kg | **bestätigt** (S. 26 gelesen) | TI 04/26 S. 26 | hoch |
| Seiten 14-17 und 28-34 (bisher ungelesen) | **jetzt gelesen**, keine Widersprüche zur Recherche; relevant: S. 14-17 Regelung EPC, E-Control, "Pufferfunktion Sommerschaltung" (Netz läuft nur bei Wärmeanforderung, alle Speicher werden auf Anforderung gemeinsam vollgeladen), S. 28 FWS-Kaskade, S. 30 Solarpufferstation (Kollektor bis 25 m²), S. 31-32 Inbetriebnahme-/Druckprüfprotokoll (Prüfdruck 1,5 x max. Betriebsdruck, 30 min, danach 0,5 x, 120 min), S. 33 Normen (u. a. AGFW FW 527/521), S. 34 Erhebungsbogen | TI 04/26 | hoch |

### 1. HP/ÜP-Leistung: was bedeutet die kW-Angabe?
Befund (Sicherheit 85): Die Recherche hatte die Deutung offen gelassen. Die ältere ENERPIPE-Broschüre "Pufferspeichersysteme" Ausgabe **06/18** (https://nahwaerme-otting.de/fileadmin/Dokumente/pdf/waermeverluste-minimieren-pufferspeichersysteme-web.pdf, S. 13, Tab. 4 und 5, selbst gelesen; Ausgabe "04/21" habe ich nicht gefunden) enthält dieselbe "Auslegungshilfe", aber mit **zwei getrennten Spalten** je Typ:

| Beispiel 1 (Netz 80/60, Haus 70/55 °C; Haus-Temperaturen als 55/70 ausgewiesen) | Spitzenheizleistung (Haus) | Dauerheizleistung (Netz-Ladung) |
|---|---|---|
| HP 600 / 800 / 1000 | 15 / 19 / 27 kW | 12 / 14 / 20 kW |
| ÜP 600 / 800 / 1000 | 45 / 50 / 54 kW | 40 / 40 / 40 kW |
| SP 600 / 800 / 1000 | 45 / 50 / 54 kW | 40 / 40 / 40 kW |

Beispiel 2 (80/50 – 70/45): HP Spitze 16 / 20 / 30, Dauer 13 / 15 / 22 kW; ÜP Spitze 37 / 41 / 45, Dauer 33 kW; SP Spitze 68 / 75 / 81, Dauer 60 kW. Definitionen (gleichlautend in 06/18 und 04/26): "Spitzenheizleistung: Die durch den Pufferspeicher im Gebäude zur Verfügung stehende Spitzenwärmeleistung. Dauerheizleistung: Die für die Heizleistung nötige Ladeleistung vom Wärmenetz."

Folgerung:
- Die HP-Zahlen **15/19/27 kW** (Beispiel 1) der Ausgabe 04/26 sind in 06/18 die **Spitzenheizleistung im Haus**. Die Leistung, die das Netz dafür dauerhaft liefern muss, ist **12/14/20 kW**. Die Überschrift "Maximale Beladeleistung" in 04/26 (Spalte HP) ist für Beispiel 1 also nicht die Netz-Ladeleistung. Passt zum Diagramm (HP1000: 27 kW Spitze, 20 kW Dauer).
- Bei ÜP und SP stimmt 04/26 nicht mit 06/18-Spitze überein: 04/26 nennt ÜP 40 kW, das ist in 06/18 die **Dauerleistung vom Netz**; die Spitze im Haus wäre dort 45-54 kW. Die 04/26-Tabelle mischt also Bedeutungen oder wurde neu definiert. Beispiel 2 hat sich zwischen den Ausgaben auch zahlenmäßig geändert (HP1000: 04/26 40 kW, 06/18 30 kW Spitze).
- Sichere Lesart fürs Spiel: Ein HP1000 kann im Haus kurzzeitig ca. 27 kW abgeben, braucht dafür aber nur rund 20 kW Netzleistung (80/60 °C). Ein ÜP1000 ca. 40 kW Netz bei ca. 54 kW Haus-Spitze. Die 04/26-Werte allein dürfen nicht als Netz-Ladeleistung zitiert werden.
- Plausibilitätsrechnung (keine Quelle): Dauer/Spitze HP1000 = 20/27 = 0,74; 1500 h / 2000 h = 0,75. Das Verhältnis passt zu den Vollbenutzungsstunden-Spannen, ohne dass der Hersteller das schreibt.
- Einschränkung: gleiche Firma, keine zweite unabhängige Quelle für diese Kennzahlen. Hersteller-Rückfrage bleibt der einzige Weg zur letzten Klarheit (Tel. +49 9174 976507-0).

### 2. Puffer senkt Anschlussleistung / erhöht Vollbenutzungsstunden
- Ohne Puffer 1500-1700 h: durch Fraunhofer UMSICHT unabhängig bestätigt (S. 11, Seite im PDF gelesen; Jahr des Leitfadens nicht auf der gelesenen Seite genannt, alte Rechtschreibung "Anschlußwerte" deutet auf ein Dokument vor 2006; das Dokument spricht nicht von Puffer, es nennt nur den üblichen Wert).
- Mit Puffer 2000-2200 h: nur Hersteller. Suche in Mainova-Leitfaden, SWM, Stadtwerke-Jena-Vertrag, Schönwald-FAQ, Forenbeiträgen lieferte nur die Definition (Vollbenutzungsstunden = Jahresverbrauch / Anschlussleistung) und typische Hausanschlussgrößen (Schönwald-FAQ: EFH ca. 12 kW; Forum: 1800 h als Faustwert, wertlos als Quelle). Mainova warnt: Kennzahl ist "nur ein Indikator", niedrige Werte deuten auf Überdimensionierung. Nicht herangezogen: Foren.
- Zusätzlich unabhängig (Praxis): Gemeindewerke Adelsdorf (Preisblatt gültig 01.01.-31.12.2024, S. 2) verlangen einen **bauseitigen Pufferspeicher mit Mindestgröße 300 l (bis 15 kW), 500 l (15-25 kW), 1.000 l (25-50 kW)**, und gewähren 10 % Dauernachlass auf den Leistungspreis bei doppelter Mindestgröße. Das zeigt, dass Netzbetreiber Puffer im Haus als netzdienlich behandeln, und ist ein hilfreicher Grenzwert für Spiel-Größen ("1.000 l bei 25-50 kW"). Es beweist keine Vollbenutzungsstunden.
- Gesamteinstufung "Puffer senkt Netz-Anschlussleistung": **mittel** (Mechanismus unabhängig bestätigt, Zahlen nur vom Hersteller). Für eine Fachregel mit Zahlen "mit Puffer 2000-2200 h" bleibt der Vorbehalt Herstellerangabe.

### 3. Vergleichbare Produkte anderer Hersteller
- Ein anderes Produkt, das wie HP/ÜP einen Nahwärme-Pufferspeicher **mit angebauter Übergabe** liefert, habe ich **nicht gefunden** (Suche, kein Treffer). Das ist kein Beweis, dass es keines gibt.
- Varmeco VARIO eXchange-nova (Flyer 2025-06, selbst gelesen): reine **Wandstation** mit Plattenwärmeübertrager, Speicher wird sekundärseitig extern angeschlossen (kein angebauter Speicher). Typen 40 kW und 80 kW; "Übertragungsleistung" je nach Temperatur: Typ 40: 20-41 kW (20 kW bei 45/35 sekundär, bis 41 kW bei 70-75/50 primär und 60-65 sekundär), Typ 80: 41-82 kW. Der Hersteller wirbt mit besserer Schichtung als bei innenliegender Wendel (HP-Prinzip), also Wettbewerber-Aussage. Bestätigt die frühere Angabe "Varmeco 40/80 kW", ergänzt: der Nennwert gilt nur bei hohen Temperaturen. Einstufung mittel.
- Donauwörth-Flyer zeigt als Variante 3 einen Warmwasserspeicher (Foto mit Danfoss-Logo) als "Komplettlösung für Warmwasser und Raumheizung"; Daten dazu nicht im Flyer. Nicht verwertbar für Leistung.
- Nicht erneut geprüft: Danfoss bis 75 kW, Caleffi 40 kW, MVV TAURUS 50 kW (aus stationen-hp-up.md): offen.

### 4. Preise
- **Donauwörth** (Preisflyer Alfred-Delp-Quartier, "Stand 3. Quartal 2026", selbst geöffnet): Variante 1 = Übergabestation inkl. Wärmetauscher + Leitung bis ins Haus + Wartung: **5.877 EUR** brutto (inkl. 19 % MwSt.), Grundpreis 39,00 EUR/Monat; Variante 2 = zusätzlich Frischwasserstation: **7.662 EUR**, 35,00 EUR/Monat; Variante 3 = zusätzlich Warmwasserspeicher (Frischwasserstation "wird nicht benötigt"): **9.447 EUR**, 29,00 EUR/Monat; Arbeitspreis 13,35 ct/kWh (brutto). **Bestätigt** die Spanne 5.877-9.447 EUR der Recherche. Zusatzbefund: Der Mehrpreis für Speicher (Variante 3 gegenüber 1) beträgt 3.570 EUR brutto, für die Frischwasserstation 1.785 EUR brutto; Kunden, die mehr Gerät kaufen, zahlen weniger Grundpreis. Keine kW-Angabe, kein Pufferspeicher-Typ ENERPIPE. Einstufung mittel, regional, Bruttopreis, enthält Leitung ins Haus.
- **Adelsdorf** (Preisblatt, gültig 01.01.-31.12.2024, selbst geöffnet): "Sofortanschluss einschließlich Übergabestation" **6.000 EUR (bis 15 kW), 9.000 EUR (15-25 kW), 12.000 EUR (25-50 kW)** brutto, enthält 20 m Nahwärmeleitung, Erd- und Oberflächenarbeiten, Mauerdurchbruch; darüber 357 EUR/m brutto; ohne Übergabestation (später): 4.000/6.000/8.000 EUR; Leistungspreis jährlich netto 292,00 / 487,50 / 975,00 EUR; Messpreis 124,80 EUR/a netto; Pufferspeicher bauseits (Kosten nicht enthalten). **Bestätigt** die Recherche (6.000-12.000 EUR, 20 m); Ergänzung: Differenz "mit minus ohne Übergabestation" = 2.000 / 3.000 / 4.000 EUR brutto, das ist der Preis der Station allein bei diesem Betreiber. Einstufung mittel, regional, Stand 2024.
- Beide Pauschalen sind Preise des Kunden an den Netzbetreiber, **keine** Listenpreise für HP/ÜP.
- **HP/ÜP-Listenpreis: weiter nicht gefunden (offen).** ENERPIPE-Seiten nennen keine Preise. Ausschreibungsportale (ausschreiben.de, heinze) lassen sich ohne Zugang nicht durchsuchen; öffentliche Leistungsverzeichnisse (Ilsfeld, Bad Homburg, Raschau, Straßlach-Rahmenvereinbarung 15-120 kW) wurden nur als Titel in Suchtreffern gesehen, nicht geöffnet, also nicht ausgewertet. Verbraucherpreise für reine 800-l-Pufferspeicher ohne Übergabe (z. B. 1.609 EUR Prinz HP-L 800; TWL HLP 800 1.877,78 EUR inkl. MwSt.) stammen nur aus Suchzusammenfassungen und gelten nicht für HP/ÜP (unsicher).
- Die Kaufering/Kirchheim/Steinen-Preise der früheren Recherche habe ich nicht neu geprüft (offen).

### Pflichtfragen (Gegenprüfung)
1. **Belegt (Quelle, Datum, Geltungsbereich)?** Ja für alle ENERPIPE-Zahlen (TI 04/26, selbst Seite für Seite gelesen, jetzt auch S. 14-17, 24-34). Geltungsbereich der kW-Werte ist jetzt klar benannt: Hersteller-Beispiel 80/60 °C (Netz) und 70/55 °C (Haus), Auslegungshilfe, kein Garantiewert. Preise: Datum/Geltung belegt, aber nur regionale Pauschalen.
2. **Einheiten/Geltung?** kW (Leistung), kWh/a, h/a (Vollbenutzungsstunden), l (Speichervolumen), mm/kg, EUR brutto (Donauwörth, Adelsdorf; netto nur Adelsdorf Leistungs-/Messpreis). Wichtigste Klarstellung: Zwei verschiedene kW-Größen (Spitze im Haus gegenüber Dauerlast aus dem Netz) dürfen nicht vermischt werden; in 04/26 sind die Spaltenüberschrift und die Werte für HP und ÜP nicht einheitlich.
3. **Widersprüche?** (a) kW-Spalte: aufgelöst, aber 04/26 und 06/18 sind für ÜP/SP und Beispiel 2 nicht deckungsgleich (Ausgabe geändert; welche gilt, nur 04/26 als aktuell). (b) 68/60 kW: aufgelöst (SP, nicht HP/ÜP). (c) Dämmung 105 gegen 125 mm: aufgelöst. (d) Kaufering gegen Kirchheim (Faktor 2-3): nicht neu geprüft, bleibt offen. (e) Maße A/B und Höhe weichen zwischen 06/18 und 04/26 um einige cm ab (Ausgabenwechsel).
4. **Unabhängige zweite Quelle?** Für 1500-1700 h ohne Puffer: ja (Fraunhofer UMSICHT). Für Wirkmechanismus: ja, qualitativ (BWK/REHAU 2012; Fraunhofer S. 8). Für 2000-2200 h mit Puffer: nein. Für HP/ÜP-Leistungen, Maße, Gewichte: nein (nur ENERPIPE, zwei Ausgaben desselben Herstellers). Für Preise: Pauschalen zweier Betreiber bestätigt, HP/ÜP-Preis nein.
5. **Offen:** (1) Zahl "mit Puffer 2000-2200 h" unabhängig (AGFW-Arbeitsblätter, Fachartikel, Betreiber-TAB mit Vollbenutzungsstunden-Werten). (2) Verbindliche Aussage des Herstellers zu den Spalten in 04/26 (HP/ÜP) und Beispiel 2. (3) HP/ÜP-Listen- oder Ausschreibungspreis. (4) Ausgabe 04/21 des Katalogs (nicht gefunden; geprüft wurde 06/18). (5) Andere Hersteller mit angebautem Speicher. (6) ÜP-Aufstellmaße 04/26 S. 20/21 nicht erneut geöffnet. (7) Kaufering/Kirchheim/Steinen-Pauschalen.

### Kandidaten für Fachregeln (nur Vorschlag, Entscheidung Projektleiter/Simon)
- Hersteller-Beispiel (Netz 80/60 °C): HP800 gibt im Haus bis ca. 19 kW Spitze ab und braucht ca. 14 kW Netzleistung; HP1000 27 kW Spitze / 20 kW Netz; ÜP (alle Größen) 40 kW Netz-Dauerleistung bei bis zu 45-54 kW Haus-Spitze. Quelle ENERPIPE 06/18 S. 13 (Hersteller; Ausgabe 04/26 abweichend beschriftet). Sicherheit mittel.
- "Ohne Puffer typisch 1500-1700 Vollbenutzungsstunden" (Fraunhofer UMSICHT, hoch). "Mit Puffer höher (Hersteller: 2000-2200 h)" nur als Herstellerwert kennzeichnen; Simons Spielwert 1800 h liegt darunter und ist als Spielvereinfachung zu markieren, nicht als Fachwert.
- Netzbetreiber verlangen Puffer im Haus: Adelsdorf 2024 Mindestgröße 300 / 500 / 1.000 l für bis 15 / 25 / 50 kW. Als regionales Beispiel, nicht als Norm.
- Preis-Anker fürs Spiel (regional, brutto): Station allein 2.000-4.000 EUR (Adelsdorf, Differenzrechnung), Speicher-Aufpreis ca. 3.570 EUR (Donauwörth 2026). Kein HP/ÜP-Preis; Spielpreis gilt als Annahme.

Quellen der Gegenprüfung (alle selbst geöffnet, Zugriff 2026-11-06): ENERPIPE TI 04/26 (wie oben); ENERPIPE "Pufferspeichersysteme" 06/18 https://nahwaerme-otting.de/fileadmin/Dokumente/pdf/waermeverluste-minimieren-pufferspeichersysteme-web.pdf ; Fraunhofer UMSICHT, Leitfaden Nahwärme https://www.umsicht.fraunhofer.de/content/dam/umsicht/de/dokumente/kompetenz/energie/leitfaden-nahwaerme.pdf (S. 8, 11); BWK 12/2012 Sonderdruck REHAU https://www.rehau.com/downloads/109808/fachartikel-gleichzeitigkeit.pdf ; Varmeco Flyer https://varmeco.de/wp-content/uploads/2025/07/Flyer-VARIO-eXchange-2025-06-30_final.pdf ; Donauwörth Preisflyer Q3/2026 und Adelsdorf Preise 2024 (URLs oben). Nur aus Suchzusammenfassung (nicht geöffnet): Mainova Leitfaden Anschlussleistung, Schönwald-FAQ, baulinks 2014 (geöffnet, aber Hersteller-Pressetext), Händlerpreise.
