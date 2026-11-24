# Was Simon jetzt tun muss (Stand 2026-11-24, NR27 Bahnquerung)

Das Spiel ist fertig gebaut und geprüft (alle Tests grün). Nur diese Punkte kann nur Simon entscheiden:

1. **Fachtexte freigeben (BQ1–BQ3).** Texte lesen in `docs/recherche/bahnquerung-texte.md`. Stimmen sie fachlich? Dann in `.claude/freigaben.md` die Zeile eintragen:
   `2026-11-23 | NR27-Fachtexte | Simon bestätigt Texte aus docs/recherche/bahnquerung-texte.md | Erklärkarte und Wissenstext Bahnquerung`
   und `NORD_FACHTEXTE_FREIGEGEBEN` wird danach vom Projektleiter eingeschaltet. Erst dann erscheinen Erklärkarte „Warum so teuer?“, (i)-Knopf und Tutorial-Text.
   (Dabei: WISSEN_A/B sind als Blase zu lang – Kürzung gemeinsam mit dem Fachprüfer.)
2. **Spielwerte bestätigen:** 45.000 € je Gleisfeld (Platzhalter) und +1 Stunde Bauzeit. Passt das, oder anderer Wert?
3. **a88-Prüfsumme:** `tests/a88-kundenanfrage.test.ts` liegt unter `tests/` statt `tests/abnahme/`; die Schranke meldet deshalb immer „NICHT OK“. Entscheidung: Datei an den richtigen Ort verschieben und Prüfsumme neu festhalten (Empfehlung) – oder alte Prüfsumme gelten lassen.
4. **Ausprobieren:** Spiel starten, bis Heizzentrale Stufe 6, Bahnquerung zeichnen, Abschnitt bauen. Kurz sagen, ob es sich richtig anfühlt (Preis, Bauzeit, Optik der Bahn).

Danach: NR25 (kW-Anzeige), später NR28 (Tal und Höhenübergabe).

Bekannt, kleiner Feinschliff (kein Blocker): Erfolgsmoment-Funken sitzen noch an den Gruben statt an den Häusern (Test vorher anpassen); Preis schon beim Zeichnen; veraltete Meldung nach „Abschließen“.

## Nachtrag 2026-11-24
- Dev-Team auf 3.22.2 aktualisiert. a88 erledigt (Freigabe erteilt, Prüfsumme gesetzt). Schranke `projektleiter` mit Basis 79469fd (Beginn NR27): OK – alles grün.
- Offen für Simon bleiben nur noch: Fachtexte freigeben (1), Spielwerte (2), Ausprobieren (4).
