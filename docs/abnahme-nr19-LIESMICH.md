# Verdeckte Abnahmetests

| Datei | Kriterium | Zielort |
|---|---|---|
| `nr19-abnahme.test.ts.verdeckt` | NR19 Puffer-Übergabestation (Lastenheft NR19; Bauplan `docs/bauplaene/NR18-ohne-autoanschluss.md` Fassung 3, Abschnitt 5.5, Bauplan P6, Prüf-Schwerpunkt 8.1/8.3/8.4, Fachentscheidungen E5/E6) | `tests/abnahme/nr19-abnahme.test.ts` (Endung `.verdeckt` weg, Inhalt unverändert), nach dem Merge von NR19-P6 |

Herkunft: Tester-Vorarbeit NR19-P0b, 2026-11-06, auf Stand e99e48f (NR18 Welle 1 zusammengeführt).
Erwartete Werte von Hand aus Bauplan 5.5 und Simons Werten vom 06.11. (HP 800 14/19 kW 5.570 €, HP 1000 20/27 kW 6.570 €,
ÜP 1000 40/54 kW 7.570 €; 2.000 h mit Puffer, 1.500 h ohne), nicht mit dem Spielcode gerechnet.

Stand auf e99e48f (als `.test.ts` ausgeführt): 34 Tests, 30 rot bis P6 (jeweils an der ersten NR19-Prüfung, nicht am Aufbau),
4 grün als Gegenproben (Wandstationen unverändert, Großabnehmer ohne Puffer-Station, zwei Wandstationen an einer 25er warnen,
keine Puffer-Reihe für Großabnehmer/Wandhaus/zu großes MFH). `npx tsc --noEmit` mit der Datei als `.test.ts`: fehlerfrei
(neue Kern-Namen über Typumweg).

Anpassung 2026-11-06 (Branch nr19-abnahme-texte, auf c122461), Grundlage DESIGN 12.23 und ENTSCHEIDUNGEN (Designer-Fotoprüfung, W1 Weg a):
Knopf-Zeile 1 „Puffer HP 800 / HP 1000 / ÜP 1000“, Zeile 2 „{x} kW vom Netz · {Preis}“, Stationszeile zweizeilig
(„Übergabestation“ → „Puffer HP 800“, „Leistung Station“ → „14 kW Netz · 19 kW Haus“), Wandreihe „Wandstation (ohne Puffer)“
oder wie bisher. Texte normalisiert verglichen; geschützte Leerzeichen an den Stellen geprüft, die 12.23 nennt (Kürzel–Zahl,
Zahl–kW, vom–Netz, Preis–€, normales Leerzeichen nach „·“ als Umbruchstelle; Zahl–kW in Erklär- und Stationszeile).
Neu: 4 Tests test_nr19_w1_* (Puffer-Haus tauscht nicht auf Wandstation; keine Wandreihe, solange eine Puffer-Station reicht;
reicht keine, Wandstation nach Bedarf bei 1.500 h und hauspuffer weg; Altstand Puffer + Wandstation unverändert). 38 Tests.
Katalogname „Puffer-Übergabestation HP 800“ und Ablehnungssatz bleiben (12.23 ändert nur Knopf- und Stationszeile).
Prüfsumme: keine – die Liste docs/ABNAHME_PRUEFSUMMEN.txt erfasst nur .dev-team/verdeckt im Hauptordner, nicht diese Datei.

Aktiviert 2026-11-06 durch den Projektleiter nach Merge P6 (2fd3b56): 38/38 grün.
