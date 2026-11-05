# Sitzungsübergabe (2026-11-05)

Stand: A1–A55 umgesetzt, 197 Tests grün, Schranke OK. Branch `claude/youthful-feynman-jaegcj`.

## Zuletzt gebaut
- A54: kW-Schalter (Knopf „kW“ links unten, Taste K, gespeichert), Zebrastreifen auf ein Sechstel reduziert.
- A55: Drehen per Zwei-Finger-Geste / Mittelmaustaste (90°-Schritte), Gartenränder um Häuser entfernt.

## Offen
- Frage an Simon: Stationen HP/ÜP 800/1000 (Recherche ohne Ergebnis).
- Fachprüfer für Gestattung 1.500 €, Bohrung 8.000 €, Spreizungsfaktor, Upgrades.
- Wirtschaftsabgleich Startgeld 30.000 €.
- Optik: Häuser, Heizzentrale, Bäume, Autos; Designer-Mängel 4–9, 11, 12, 15–22.
- „Nur Simon“: Einverständnis der fünf fotografierten Personen vor Cloudflare-Veröffentlichung.
- Merge nach main nur auf Zuruf.

## Arbeitsweise
Artefakt: `node $SP/einzeln.cjs $SP/waermedorf.html`, dann Artifact-Tool mit demselben Pfad. Vor Commit/Push/Publish `/tmp/gate.txt` mit grep auf „OK – alles“ prüfen.
