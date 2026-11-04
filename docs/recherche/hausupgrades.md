# Recherche: Haus-Upgrades und Rücklauftemperatur (Spielmechanik)

Stand: 2026-11-04 · Modus: recherche · Ampel: GELB

## Wichtige Einschränkung (ehrlich vorweg)
- Das Öffnen der Quellseiten war in dieser Sitzung gesperrt (Rechner `redundancy.webcms.tu-dresden.de`, `www.ait.ac.at`, `www.rehau.com`, `www.sw-aalen.de` ließen sich nicht erreichen).
- Alle Zahlen unten stammen daher aus **Suchergebnis-Zusammenfassungen**, nicht aus selbst gelesenen Dokumenten. Das drückt die Sicherheit. Es gab **keine** Gegenprüfung durch zweite, unabhängige Quelle.
- Keine Zahl hier ist als Fachregel bestätigt. Alles ist Vorschlag.
- Die Fachwissen-Bibliothek (`waermenetz.md`) enthält zu Temperaturen nichts. Die Lessons-Datei enthält nichts Einschlägiges.

## Aussagen: Quelle, Sicherheit, Einschränkung

| Nr | Aussage | Quelle (Nummer in Quellenliste) | Sicherheit | Einschränkung |
|---|---|---|---|---|
| A1 | Rücklauftemperatur = Temperatur, mit der das Heizwasser nach der Wärmeabgabe im Haus ins Netz zurückkehrt. Sie ergibt sich aus der Kundenanlage (Abnehmeranlagen bestimmen die Auskühlung des Primärstroms). | Q9 (FFG), Grundphysik | 85 % | Definition allgemein bekannt; Q9 nur über Suchzusammenfassung. |
| A2 | Leistung P = ṁ·cp·ΔT. Bei gleichem Massenstrom (gleiche Leitung, gleiche Pumpe) steigt die Leistung proportional zur Spreizung. Beispiel: ΔT 30 K auf 40 K = +33 % Leistung. cp Wasser ca. 4,18 kJ/(kg·K). | Physik (eigene Rechnung, Lehrbuchwissen); Q3 nennt Spreizung als bestimmend für die transportierbare Leistung | 95 % | Reale Grenze zusätzlich durch Druckverlust und Fließgeschwindigkeit (W4/W5 noch offen). |
| A3 | Wärmeverlust einer Leitung wächst mit (Mediumtemperatur minus Bodentemperatur). Niedrigere Temperaturen = geringere Verluste. Rücklauf trägt etwa 40 % der Verluste (Folie TU Dresden), ca. 2,2 % weniger Verlust pro K Absenkung. | Q4 (TU Dresden, Folien), Q5 (stadt+werk, nur Titel), Physik | Prinzip 90 %; Zahl 2,2 %/K und 40 %: 40 % | Folien aus Suchtreffer ohne Kontext, Bezug (Rücklauf-K oder Netz-K) unklar. Nicht als Zahl ins Spiel übernehmen ohne Prüfung. |
| A4 | Rücklaufabsenkung wirkt auf vier Dinge: Wärmeverluste, Effizienz von KWK, Solarthermie/Erneuerbaren, Pumpenergie. | Q2 (TU Dresden Skript, Titel/Zusammenfassung) | 75 % | Nur Aufzählung gelesen, keine Zahlen geprüft. |
| A5 | Bei Anlagen mit Kondensationswärmerückgewinnung bringt 1 K weniger Rücklauf etwa 1 % mehr Ertrag. | Q6 (AEE INTEC, QM-Fachtagung 2023) | 55 % | Einzelquelle, nur Zusammenfassung. Gilt nur für Kondensationswärmerückgewinnung. |
| A6 | Wärmepumpe: höhere Systemtemperatur senkt den COP (Herstellerbeispiel: 2,83 auf 2,10 bei +20 K). Rechenzentrumsabwärme: Jahresarbeitszahl bis 7 in Simulation. | Q7 (Herstellerangabe), Q8 (Pressemeldung DekaHEAT) | 45 % | Herstellerwerbung bzw. Simulation; Richtung (niedriger = besser) ist Physik, Größe nicht belegt. Meldung DekaHEAT trägt Datum 29.10.2026, nicht geprüft. |
| A7 | Generationen: Bestandsnetze (2./3. Gen.) Vorlauf bis etwa 100 °C; 4. Gen. Vorlauf etwa 70 °C oder darunter; 5. Gen. (kalte Nahwärme) 5 bis 35 °C, Wärmepumpe je Gebäude. | Q1 (EHP-Fachartikel 11-12/2025), Q10 (Wikipedia-Grafik) | 70 % | Definitionen schwanken: ältere Quelle Q11 nennt "Wärmenetze 4.0" mit ca. 50/20 °C. |
| A8 | Typischer Rücklauf im Bestand: **keine belastbare deutsche Statistik gefunden.** Einzelwerte: Beispiel vor Abgleich ca. 55 °C, danach unter 40 °C (Stift Millstatt, Österreich). Anforderungen in TAB: 40 °C (Erlangen ESTW), 45 °C (Buch), 50 °C (Penzberg Jahresmittel, OLG-Fall), 60 °C Begrenzung (Vorlage Herten). | Q12, Q13, Q14, Q15, Q16 | Einzelwerte 65 %; "typischer Bestandswert" 0 % (nicht belegt) | Lokale Vorgaben, nicht allgemeingültig. |
| A9 | Ein Netz mit Auslegung "Heizflächen für 70 °C Vorlauf / 40 °C Rücklauf" und Verbot von Bypass/Überströmventilen auf Kundenseite (Buch). Referenzfall Fachartikel: 80 °C Vorlauf, 30 K Spreizung. Wien: Standardauslegung 60/40. | Q13, Q3, Q17 | 65 % | Je Netzbetreiber verschieden. |
| A10 | Etwa 95 % der Anlagen in D/AT seien nicht hydraulisch abgeglichen; Einsparpotenzial ca. 5 bis 15 % Wärme. | Q18 (Fachartikel, Zusammenfassung) | 45 % | Quelle unklar, Bezug "Wärme" (Gebäude oder Netz?) offen. |
| A11 | Hydraulischer Abgleich senkt Rücklauf deutlich: Beispiel 100 kW, 57 auf 37 °C, Volumenstrom 4300 auf 1620 l/h. | Q6 | 40 % | Zahlen intern nicht nachrechenbar (Vorlauftemperaturen unterschiedlich?). Nicht übernehmen. Hydraulischer Abgleich als Voraussetzung für Niedertemperatur: Q19 (Rehau). 65 %. |
| A12 | Absenkung der Netz-Vorlauftemperatur (enercity: 8 bis 10 K, ca. 9 % Energieeinsparung; Kassel-Studie: Wärmegestehungskosten ca. -20 % bei Vorlauf 75 auf 40 °C). | Q20 (Firmenseite), Q21 (Uni Kassel) | 45 % | Betrifft Vorlauf/Netzbetrieb, nicht Haus-Upgrade. Als Hintergrund. |
| A13 | Wirtschaftlicher Wert: 0,04 bis 0,4 €/(MWh·K) Rücklaufabsenkung; Beispiel 1 TWh Absatz und 10 K = rechnerisch ca. 1,4 Mio. € pro Jahr. | Q22 (FH Burgenland, Literaturbericht) | 45 % | Österreichische Zusammenfassung; Beispielrechnung widerspricht der Spanne nicht grob (1 TWh x 10 K x 0,14 = 1,4 Mio.), mittlere Spanne. |
| A14 | Anreize der Netzbetreiber (Deutschland): meist Pflicht in TAB/Ergänzenden Bedingungen (Rücklaufgrenze, Kunde muss einhalten, ab Inbetriebnahme: Aalen). Preisblatt-Beispiele: Penzberg (Jahresmittel Rücklauf über 50 °C: gesonderter Preis im Einzelfall), Jena-Pößneck (Basisleistungspreis 4 €/MWh netto für Wärmemengen über vereinbarter Rücklaufgrenze). Südtirol Franzensfeste: Bonus 0,0025 €/kWh bei Rücklauf unter 55 °C, nur Verträge über 100 kW. Zürich ewz: Zuschlag bis max. 20 % auf Arbeitspreis, z. B. 62,4 minus 50 °C = 12 %. | Q14, Q15, Q23, Q24, Q25, Q26 | 65 % | Kein einheitlicher deutscher Standard gefunden. Bonus für niedrige Rücklaufwerte nur im Ausland-Beispiel. Details AVBFernwärmeV (§ 6, § 30) nicht selbst gelesen. |
| A15 | AVBFernwärmeV: Entwurf zur Novelle (Wirtschaftsministerium, Nov. 2024), Stand Inkrafttreten nicht geprüft. OLG Nürnberg 2025 (3 U 1380/24): Zurückbehaltung der Zahlung bei zu hohem Rücklauf (über 50 °C sekundär) für zulässig gehalten. | Q27, Q28 | 40 % | Nur Suchzusammenfassung; Urteil nicht gelesen. Nicht im Spiel als Rechtsaussage verwenden. |
| A16 | Förderung Gebäude (BEG EM, BAFA): Heizungsoptimierung inkl. hydraulischer Abgleich und Heizkurve 15 %; Anschluss an Wärmenetz 30 % (35 % bei mindestens 55 % erneuerbar); Gebäudehülle 15 %, förderfähig bis 30.000 € je Wohneinheit. | Q29 bis Q31 (Beratungs-/Herstellerseiten, 2022 bis 2025) | 55 % | Quellen widersprechen sich teils (Gebäudenetz 25 % oder 30 %); Stand teils veraltet; BAFA-Richtlinie nicht selbst geprüft. |
| A17 | BEW (Netzseite): Modul 2 bis 40 % der förderfähigen Ausgaben, Hausübergabestationen können zu den Maßnahmen gehören; Modul 1 (Transformationsplan) 50 %, ab 01.04.2026 widersprüchliche Angaben. | Q32, Q33 | 55 % | Hausübergabestation in BEW vs. BEG nicht eindeutig belegt. Für Spiel: Förderung vereinfachen. |
| A18 | Kosten einer Hausübergabestation, Heizkörpertausch, Fußbodenheizung, Abgleich in Euro: **nicht belegt gefunden.** | – | 0 % | Lücke. Im Spiel nur als Spielwerte. |
| A19 | Hausübergabestation: Aufgabe Vor-/Rücklauftemperatur, Druck, Durchfluss regeln; indirekte Station mit Wärmeübertrager. Kaskadenschaltung und Absorptionskreislauf (TeTra-Projekt) können Rücklauf zusätzlich abkühlen. | Q34 (co2online), Q35 (TeTra, FFG), Q36 (tga-fachplaner, nur Titel) | 60 % | Wirkung in K nicht belegt. |
| A20 | Dämmung/Fenster senken den Wärmebedarf; Wirkung auf Rücklauf indirekt. Prozentwert: **nicht belegt.** Frischwasserstation vs. Speicher: **nicht belegt gefunden** (Fachwissen allgemein: Durchfluss-Erwärmung nutzt Trinkwasser-Kaltwasser als Kühlung; Speicherladung kann Rücklauf anheben). Smart-Meter/Monitoring: nur als Hilfsmittel, Wirkung in K nicht belegt. | – | 30 % | Als Lücke führen. |

## Antworten auf die Fragen (kurz)
1. **Temperaturen:** Vorlauf Bestand bis etwa 100 °C, 4. Gen. um 70 °C, 5. Gen. 5 bis 35 °C (A7). Rücklauf: Anforderungen in TAB oft 40 bis 50 °C (A8); Ist-Durchschnitt in Deutschland nicht gefunden. Spreizung als Beispiel 30 K (80/50 °C), Wien-Auslegung 60/40 = 20 K.
2. **Wirkung:** Leistung ist proportional zur Spreizung (A2, sicher). Verluste sinken mit niedrigerer Temperatur (A3, Prinzip sicher, Zahl nicht). Mehr Ertrag bei Kondensation, besserer COP bei Wärmepumpen, besser für Solar/Abwärme (A4 bis A6, Größenordnung unsicher).
3. **Maßnahmen:** Wirkungen in K und % sind nur als Einzelbeispiele oder Fachwissen belegt (A8, A10, A11, A19, A20); Kosten fehlen (A18). Förderung grob (A16, A17).
4. **Netzbetreiber:** Rücklaufgrenze in TAB/Ergänzenden Bedingungen, Preisblatt mit Aufpreis bei Überschreitung, Bonus selten (A14).
5. **Spielmechanik:** siehe unten (Vorschlag).

## VORSCHLAG Spielmechanik (kein Fachbeschluss, alle Zahlen "Spielwerte")

Grundidee: Jedes Haus hat eine **Rücklauftemperatur** `ruecklauf_c` (Startwert z. B. 60 °C, Spielwert) bei festem Vorlauf des Netzes (z. B. 80 °C, Spielwert). Spreizung `spreizung_k` = Vorlauf minus Rücklauf. Ein Upgrade senkt den Rücklauf oder den Bedarf.

Effekte (vereinfacht, physikalisch gedeckt):
- **Leitungskapazität:** `leistung_kw` einer Leitung bei festem Massenstrom wächst proportional zur Spreizung der Häuser daran (A2). Beispiel Spielwert: Spreizung 20 K auf 30 K = 1,5-fache Leistung. Das erlaubt mehr Häuser an derselben Leitung.
- **Netzverlust:** proportional zur mittleren Netztemperatur über Boden. Einfache Spielregel: 1 K weniger Rücklauf = ca. 1 % weniger Verlust (eigene Überschlagsrechnung: Mitteltemperatur sinkt um 0,5 K bei ca. 55 K Differenz; Spielwert, nicht belegt, A3-Zahl 2,2 % bewusst nicht übernommen).
- **Einnahmen:** Rücklauf unter der Netzgrenze (z. B. 50 °C, angelehnt an A14) = Bonus; darüber = Aufpreis/Abzug (Vorbild Penzberg, Jena-Pößneck, Zürich; Spielwert, nur Prinzip belegt).
- **Zufriedenheit:** Spielwert; nicht fachlich belegt, nur Spielziel.

Vorgeschlagene Upgrades (jeweils pro Haus; Zahlen = Spielwerte, Hintergrund in Klammern):

| Stufe | Upgrade | Wirkung (Spielwert) | Kosten (Spielwert, aufsteigend) | Freischaltung | Fachlicher Hintergrund |
|---|---|---|---|---|---|
| 1 | Hydraulischer Abgleich + Heizkurve | Rücklauf -5 K | 1 (günstig) | von Anfang an | A10, A11, A16: Voraussetzung für fast alles andere |
| 2 | Monitoring / Smart-Meter | zeigt Rücklauf je Haus an; macht Stufen 3 bis 6 sichtbar, -1 K Rücklauf (Regelgüte) | 1 | nach Stufe 1 | A20 (Wirkung unbelegt, darum nur Anzeige, Nebeneffekt klein) |
| 3 | Moderne Hausübergabestation (Wärmeübertrager, Regelventil, Rücklaufbegrenzung) | Rücklauf -5 K | 3 | nach Stufe 1 und Netz-Ausbau | A14, A19 (Rücklaufbegrenzung in TAB) |
| 4 | Warmwasser: Frischwasserstation | Rücklauf -3 K (im Sommer stärker) | 2 | nach Stufe 3 | A20 (Behauptung nur als Fachwissen, im Spiel vorsichtig formulieren) |
| 5 | Größere Heizkörper oder Flächenheizung | Rücklauf -8 K | 5 (teuer, größter Hebel) | nach Stufe 3 | A9 (Auslegung 70/40), A16 |
| 6 | Dämmung und Fenster | Wärmebedarf -20 % (Spielwert), Rücklauf nicht direkt | 5 | nach Stufe 1 | A16 (Förderung), Bedarfswert nicht belegt |

Kosten-Staffelung: Spielwerte, z. B. Basis 100 Münzen, mit Faktor 1/2/3/5 je Stufe; pro Haus mit Haustyp-Faktor (Altbau teurer). Es gibt keinen belegten Euro-Wert (A18), daher **keine Euro-Beträge im Spiel nennen**.

Hinweise, damit das Spiel nichts Falsches behauptet:
- Nicht schreiben: "In Deutschland liegt der typische Rücklauf bei X °C" (nicht belegt).
- Nicht schreiben: konkrete Euro-Kosten, Förderquoten als verbindlich, Rechtsaussagen zur AVBFernwärmeV.
- Rücklauf kann nicht unter die Heizkreis-Temperatur im Haus fallen (Untergrenze; Spiel: Mindestwert, z. B. 30 °C).
- Dämmung allein senkt den Rücklauf nicht automatisch; Wirkung auf Rücklauf im Spiel nur über Stufe 5 und 3 abbilden.
- Das Wort "Spielwert" bzw. "vereinfacht" im Hilfetext verwenden.

## Quellenliste (alle nur über Suchergebnis gesehen, nicht geöffnet; Abruf 2026-11-04)
- Q1 EHP-Fachartikel 11-12/2025: https://2-g.com/downloads/de/Pressespiegel/2025/2025_11_EHP_Seiten%2029-33%20aus%20EHPde_11-12_2025.pdf
- Q2 TU Dresden, Skript (Rühling u. a.): https://redundancy.webcms.tu-dresden.de/ing/maschinenwesen/iet/gewv/ressourcen/dateien/veroefftlg/100315-Skript-CD-Ruehling-et_al_rev.pdf
- Q3 ingenieur.de: https://www.ingenieur.de/?p=3260
- Q4 TU Dresden, Folien Wirths (Netzrücklauf): https://tu-dresden.de/ing/maschinenwesen/iet/gewv/ressourcen/dateien/forschung_und_projekte/projekte/mldh/vortraege/2008_02_19_wirths_versorgung_aus_dem_netzruecklauf.pdf?lang=en
- Q5 stadt+werk: https://www.stadt-und-werk.de/k21-meldungen/niedrigere-temperaturen-senken-waermeverluste/
- Q6 AEE INTEC: https://www.aee-intec.at/0uploads/dateien1784.pdf
- Q7 Herstellerbeispiel COP (über energie.de/EuroHeat&Power): https://www.energie.de/euroheatpower/news-detailansicht/nsctrl/detail/News/senkung-der-ruecklauftemperatur-im-fernwaermenetz
- Q8 DekaHEAT: idw-online https://idw-online.de/de/pdfnews843990
- Q9 FFG-Projekt: https://projekte.ffg.at/projekt/3863333/pdf
- Q10 Wikipedia-Grafik Generationen: https://en.wikipedia.org/wiki/File:Generations_of_district_heating_systems_EN.svg
- Q11 BWK-Fachartikel Wärmenetze 4.0: https://www.rehau.com/downloads/99858/bwk-fachartikel-waermenetze.pdf
- Q12 Stift Millstatt (Praxisbeispiel, in Q19-Umfeld): https://www.rehau.com/downloads/1016388/massnahmen-fuer-mehr-netzeffizienz.pdf
- Q13 TAB Buch (Stadtwerke Buchen): https://www.sw-bb.de/_Resources/Persistent/4/9/d/a/49da6fab5ae5da2d02e99d005684ae847a901691/tab-fernwaerme_buch.pdf
- Q14 Preisblatt Penzberg 2026: https://www.stadtwerke-penzberg.de/fileadmin/Webdata/fernwaerme/Preisblatt_Nr._116_Bestandskunden_FWV_ab_2026.pdf
- Q15 Ergänzende Bestimmungen Aalen 04/2024: https://www.sw-aalen.de/uploads/attachment/download/281/Erg%C3%A4nzende_Bestimmungen_AVBFernw%C3%A4rmeV_W%C3%A4rmenetz_Aalen_04-2024.pdf
- Q16 TAB Herten: https://www.copacabackum.de/fileadmin/hertener-stadtwerke/downloads/03_netze/02_service/Fernwaermenetz/Vertraege_und_Bestimmungen/TAB_Prima__r.pdf ; ESTW Erlangen: https://netze.estw.de/erlangenGips/Erlangen/estw2.de/Energie-Wasser/Hausanschluss/Fernwaerme/Aktuelle-Preise-fuer-Fernwaerme-Hausanschluesse/20231002-Ergaenzung-zu-den-TAB-HW-Auslegungsparameter.pdf
- Q17 Wien Energie Auslegungsbedingungen 2013: https://dokumente.wienenergie.at/link/technische-auslegungsbedingungen-2013
- Q18 Salzburg AG / Uni Leoben: https://pureadmin.unileoben.ac.at/portal/en/publications/massnahmen-zur-senkung-der-rucklauftemperatur-im-fernwarmeverbundnetz-der-salzburg-ag(671f0f49-b236-418b-aba7-837ce52bde16).html
- Q19 Rehau, Maßnahmen für mehr Netzeffizienz: siehe Q12
- Q20 ki-syndikat (enercity): https://www.ki-syndikat.de/usecases/energie/25-nahwaermenetz-waermeverlust-modellierung/
- Q21 Uni Kassel: https://kobra.uni-kassel.de/handle/123456789/14270
- Q22 FH Burgenland: https://fhburgenland.contentdm.oclc.org/digital/api/collection/p15425dc/id/96480/download
- Q23 Jena-Pößneck Preisblatt: https://www.stadtwerke-jena.de/en/dam/jcr:5cfcb305-8a06-453a-87a8-5ed8f20a6654/FWPB_PoessneckWaerme_20210801.pdf
- Q24 Franzensfeste Tarif 2022: https://www.asmb.it/export/sites/asmb2/.downloads/de/waerme/information/Tarif-Fernwaerme-Franzensfeste-2022.pdf
- Q25 ewz Zürich Tarif: https://www.ewz.ch/dam/ewz/meinewz/Dokumentencenter/now-fit/wv-kva-holz-tarifsystem-2027.pdf
- Q26 Infra Fürth AVBFernwärmeV Anlage: https://infra-fuerth.de/fileadmin/pdf/produkte/waerme/fernwaerme/avbfernwaermev_anlage1_Juli_2024.pdf
- Q27 OLG Nürnberg 3 U 1380/24 (BeckRS 2025, 12695): https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2025-N-12695?hl=true
- Q28 Grant Thornton zur AVBFernwärmeV-Novelle: https://www.grantthornton.de/themen/2025/novellierung-der-avbfernwarmev-was-sie-jetzt-wissen-muessen/
- Q29 Verbraucherzentrale NRW Heizungsförderung: https://verbraucherzentrale.nrw/heizungsfoerderung
- Q30 co2online BEG Heizungsoptimierung: https://www.co2online.de/foerdermittel/details/55575432/
- Q31 Dr. Klein BEG EM: https://www.drklein.de/bundesfoerderung-fuer-effiziente-gebaeude-einzelmassnahmen.html
- Q32 Förderdatenbank BEW: https://www.foerderdatenbank.de/FDB/Content/DE/Foerderprogramm/Bund/BMWi/bundesfoerderung-effiziente-waermenetze.html
- Q33 Rödl, BEW-Merkblatt 01.04.2026: https://www.roedl.com/insights/neues-bew-merkblatt-01-04-2026-mehr-klarheit-praxisnaehe/
- Q34 co2online Übergabestation: https://www.co2online.de/modernisieren-und-bauen/heizung/fernwaerme/fernwaermeuebergabestation/
- Q35 FFG TeTra: https://projekte.ffg.at/projekt/2926645/pdf
- Q36 tga-fachplaner Kaskade: https://www.tga-fachplaner.de/heizungstechnik/hocheffizienz-fernwaermeuebergabestation-kaskade-senkt-die-ruecklauftemperatur

## Offene Lücken
1. Kein belegter Durchschnittswert für Rücklauf in deutschen Bestandsnetzen (AGFW-Statistik, Bundesnetzagentur oder Umweltbundesamt prüfen).
2. Wirkung je Maßnahme in K (Abgleich, Heizkörpertausch, Flächenheizung, Hausstation, Frischwasserstation) nur als Einzelbeispiele; Primärquelle nötig (z. B. Fraunhofer IEE 2019 "gebäudeseitige Maßnahmen", AGFW-Arbeitsblätter).
3. Euro-Kosten je Maßnahme in Deutschland fehlen vollständig.
4. Verlust pro K Absenkung (2,2 %): Kontext der Folie unklar.
5. AVBFernwärmeV: aktuelle Fassung und Stand der Novelle nicht selbst gelesen (Wortlaut §§ 6, 17, 30).
6. Förderquoten BEG/BEW: aktuelle BAFA-Richtlinie nicht selbst geprüft; Quellen widersprechen sich.
7. Dämmung/Fenster und Frischwasserstation: keine Belege.
8. Gegenprüfung (zweiter, getrennter Aufruf mit Zugriff auf die Quellen) steht aus; erst danach darf eine Zahl Fachregel werden. Dazu muss der Netzzugang für die oben genannten Hosts freigegeben werden.

## Kandidaten für Fachregeln (nur Vorschlag, noch nicht bestätigt)
- F-A: Leistung einer Leitung bei gleichem Massenstrom ist proportional zur Spreizung (P = ṁ·cp·ΔT, cp ≈ 4,18 kJ/(kg·K)). Sicherheit 95 %, Lehrbuchphysik.
- F-B: Wärmeverlust einer Leitung steigt mit der Differenz Mediumtemperatur minus Bodentemperatur. Sicherheit 90 %.
- F-C: Rücklauftemperatur hängt von der Kundenanlage ab; Netzbetreiber begrenzen sie in TAB/Ergänzenden Bedingungen, Grenzen sind lokal verschieden (typisch 40 bis 60 °C in den gefundenen Beispielen). Sicherheit 65 %.
- Alle anderen Zahlen: nur Spielwerte.
