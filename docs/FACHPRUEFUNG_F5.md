# Fachprüfung F5 (A18) – Ergebnis des `fachpruefer`

Stand: 2026-11-04 · Ampel **gelb**: Kernregeln stimmen und sind getestet, einige Spieltexte sind falsch oder irreführend. Keine bestätigte Regel verletzt, keine Referenzwerte verändert. Das Ergebnis des Fachprüfers wird hier gekürzt festgehalten; die Umsetzung steht unten.

## Befunde (Sicherheit ≥ 80) und Umsetzung
| Nr | Befund | Umsetzung |
|---|---|---|
| B1 | Bei PV stand „Ohne Leitung fließt keine Wärme ins Netz“ – PV liefert Strom | Eigener Text für PV |
| B2 | Reihenhaus „Drei Wohnungen unter einem Dach“ ist falsch | „Drei Häuser Wand an Wand …“ |
| B3 | Erdsonde wirkt wie kostenlose Heizwärme ohne Wärmepumpe | Text nennt die Wärmepumpe; als Vereinfachung benannt |
| B4 | Einspeisung von Außenanlagen/Abwärme ignoriert die Leitungsgrenze (100 kW durch eine 25er) | Regel V1 (siehe unten) |
| B5 | „110er für Großabnehmer“ führt in einen Planungsfehler; Hallenbad braucht nur 45 kW | Texte und Auftrag umformuliert |
| B6 | „Überlastet“ erscheint auch hinter der überlasteten Stelle | Zwei Fälle getrennt |
| B7 | Einnahmefaktor passt nicht zum Preis (1,2 / 1,45 statt 1,14 / 1,29); kein Test | Faktoren = Preis ÷ 14 ct, Test ergänzt |
| B8 | Pufferspeicher heizt ohne Quelle und kostenlos | Regel V2 (siehe unten) |

Weitere Textvorschläge (Planungsfehler-Text, „bis zu 40 %“, Spitzenleistung PV, 25er nur für Einfamilienhaus) wurden übernommen.

## Vorgeschlagene Regeln (Simon bestätigt – bis dahin „vorgeschlagen“, im Spiel vorläufig umgesetzt)
- **V1** Von außen eingespeiste Wärme ist höchstens so groß wie die kleinste Leitungskapazität auf dem Weg zur Heizzentrale.
- **V2** Ein Speicher erzeugt keine Wärme: Er zählt nur, wenn mindestens eine Quelle läuft (Vereinfachung, siehe Text im Spiel).
- **V3** Einnahme ist proportional zum Wärmepreis in ct/kWh.
- **V4** PV ist eine Stromquelle; Texte über „Wärme ins Netz“ gelten für sie nicht.

## Wissenslücken (Recherchefragen, offen)
1. Wärmeleistung von Kunststoff-Nahwärmerohren 25–110 mm bei üblicher Spreizung und Druckverlust (kW).
2. Jahresarbeitszahl von Großwärmepumpen in Nahwärmenetzen (Luft / Erdsonde / Abwärme).
3. Üblicher Arbeitspreis Nahwärme in Deutschland (ct/kWh, brutto).
4. Förderquote und Baubeginn-Regel der Bundesförderung für effiziente Wärmenetze (BEW).
5. Brauchen Erdsondenfelder in warmen Netzen (> 50 °C) immer eine Wärmepumpe?

Bis zur Klärung sind alle Zahlen im Spiel „Spielzahlen“; der Hinweis „Alle Wärmenetze und Werte sind fiktiv“ steht in den Einstellungen.
