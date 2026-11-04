# Wow- und Langzeitideen – Wärmenetz-Dorf

Stand 2026-11-04 · Ergebnis des Gastgebers (Modus `ideen`), vom Projektleiter gekürzt übernommen. Alles sind **Vorschläge**, nichts ist entschieden. Mit [FP] markierte Punkte muss der Fachprüfer prüfen, bevor Zahlen ins Spiel kommen.

**Ampel gelb:** Das Fundament trägt einen guten Abend, für Wochen noch nicht.

## Lücken im Fundament
| Nr | Lücke | Warum es zählt |
|---|---|---|
| L1 | Wärmebedarf ist immer gleich (kein Tag/Nacht, Sommer/Winter) | Ohne wechselnden Bedarf sind Speicher und Spitzenlast sinnlos; hier liegt der Kern aller Langzeit-Ideen |
| L2 | Speicher ist eine kostenlose Wärmequelle (Regel V2 mildert das, ist aber nur vorgeschlagen) | fachlich falsch und nimmt die spannendste Entscheidung vorweg |
| L3 | Einspeisung ignoriert Leitungsgröße (Regel V1 ist vorläufig umgesetzt) | sonst lohnen sich Solarthermie/Abwärme ohne Netzplanung |
| L4 | Kein „Danach“: nach 13 Aufträgen ist Schluss | Langzeitziel und Wiederkehrendes fehlen |
| L5 | Orte haben erfundene Häuser | Simons Wunsch Nr. 1; Datenquelle OSM, Overpass aus der Cloud nicht erreichbar |
| L6 | Keine Sicherung des Spielstands | Safari kann lokale Daten nach ca. 7 Tagen ohne Besuch löschen, wenn die Seite nicht auf dem Startbildschirm liegt; Vorschlag: Hinweis „Zum Startbildschirm“, Export/Import oder Sicherungscode (Aufwand S) |
| L7 | Hausupgrades ohne Grundlage | Recherche liegt vor (docs/recherche/hausupgrades.md), Gegenprüfung steht aus |

## Top-5 Ideen
1. **Wetter und Jahreszeiten mit Kältewelle samt Vorwarnung** (Aufwand L). Fester, vorhersagbarer Wetterkalender (Startwert, damit die Offline-Nachrechnung A15 testbar bleibt). Bedarf = Warmwasser-Grundlast + Heizanteil nach Außentemperatur. Spitzenlastkessel als neues Objekt (billig kaufen, teuer betreiben), Speicher wird nötig. Prüfkriterien: Bedarf bei −10 °C > bei +10 °C; Kältewelle mind. 1 Spieltag vorher angezeigt; offline gerechnet = gespielt. Risiko: Strafe ohne Schuld → immer vorwarnen, offline nur Einnahmeausfall statt Kündigung. [FP] Grenztemperatur, Warmwasser-Anteil.
2. **Hausakte mit Upgrades für die Rücklauftemperatur (A28)** (Aufwand M). Steckbrief je Haus (Typ, Baujahr-Klasse, Heizsystem, Rücklauf °C, Hausstation); Upgrades senken den Rücklauf, mehr Spreizung = mehr Leistung durch dieselbe Leitung (P = ṁ·cp·ΔT), weniger Verlust. Prüfkriterium: Leistung proportional zur Spreizung; mind. ein Fall, in dem ein Upgrade einen Leitungstausch erspart. Risiko: zu viele Zahlen auf 390 px → höchstens drei Werte im Steckbrief, ab Heizzentralen-Stufe 3.
3. **Bürgerversammlung, Anschlussquote, Bauabschnitte (Genossenschaft)** (Aufwand M). Straßenzüge als Bauabschnitte; Ölhaus-Bereitschaft (Alter, Nachbarn schon angeschlossen, Ruf, Preis); Vorverträge; Bau erst ab Mindestquote; Ereignis „Ölheizung kaputt im Winter“. [FP] Mindestquote als Spielwert, Förderprogramme nur nach Prüfung benennen.
4. **Jahresbericht der Genossenschaft** (Aufwand S–M). Bilanz zum Jahreswechsel: gelieferte Wärme (MWh), Anschlussquote, Verluste (%), ersetzte Öl-Liter/CO₂ (vereinfacht, mit Quelle), Rücklauf im Mittel, Zufriedenheit; Dorfchronik als Sammelalbum; drei selbst gewählte Jahresziele.
5. **Die drei Orte als Kapitel mit Mitnahme** (Aufwand M, erst nach echten Häusern). Ort 2 schaltet nach Abschlussziel von Ort 1 frei; Technik-Freischaltungen und Chronik werden mitgenommen, kein Geld; alte Orte bleiben besuchbar.

Weitere (je eine Zeile): Wärmeansicht (Vorlauf warm, Rücklauf kühl, Engpässe leuchten, A20); Leitwarte mit Lastgang der letzten 7 Spieltage; Gleichzeitigkeit als späte Freischaltung [FP]; „Was lohnt sich jetzt?“-Hinweis des Büros (S); Dorf bei Nacht, nur versorgte Häuser leuchten.

## Spielschleife
| Zeitraum | Tun | Zurückholen |
|---|---|---|
| Minuten | Münzen, Baustelle, Leitung, Engpass beheben, Wetterbericht, Upgrade | Bautimer, gedeckelte Kasse |
| Tage | Bauabschnitt, Vorverträge, Förderantrag, Kältewelle, Ereignisse | Vorwarnung, Förderbescheid |
| Wochen | Spieljahr Sommer/Winter, Jahresbericht, Jahresziele, nächste Stufe | Jahresbericht |
| Monate | Ort fertig (Meisterbrief), nächster Ort, Sammelziele | neues Kapitel |

Freischalt-Reihenfolge: Leitungen/Häuser → Wirtschaft/Förderung → Jahreszeiten (ab Stufe 2) → Speicher/Spitzenlast → Hausakte/Rücklauf (ab Stufe 3) → Bauabschnitte → Gleichzeitigkeit/Wärmeansicht.

## Risiken
Grind (immer etwas Sinnvolles tun, solange etwas wartet; Taler nur durch Spielen); Pay-to-win (kein Echtgeld, falls später doch nur Kosmetik); Überforderung (schrittweise freischalten, max. drei Kennzahlen je Blatt); Offline-Strafen (Vorwarnung, Bereitschaftsdienst); fachlich Falsches (jede Mechanik vor dem Bau zum Fachprüfer); Datenverlust (L6); Offline-Nachrechnung mit Wetter/Ereignissen braucht feste Startwerte und Zeitschritte.

Bewusst nicht vorgeschlagen: tägliche Login-Belohnungen, Mehrspieler/Server-Ranglisten, Katastrophen ohne Vorwarnung, nur mehr Deko als „Langzeit“, Live-Preise aus dem Netz.

## Fragen an Simon
S1 Spielst nur du oder später auch Laien (Bürger, Gemeinderat)? S2 Spielzeit: 1 Spieljahr ≈ 2–3 Wochen echt, oder echter Kalender? S3 Gibt es in Hilpoltstein, Dornhausen, Obermässing echte Netze, auf die sich das Spiel beziehen soll oder nicht darf? S4 Dauerhaft ohne Echtgeld? S5 Echte Förderprogramme/Recht im Spiel oder fiktive Namen?
