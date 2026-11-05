
- 2026-11-05 [Prozess] Tester-Vorarbeit passt alle bestehenden Tests an, die eine geänderte Regel prüfen – vor Übergabe per grep nach der alten Form suchen (hier `attrs.disabled`, `.sperr-tipp`). Anlass: NR16-B blockiert, weil tests/a92-anschlussweg.test.ts übersehen wurde.
- 2026-11-05 [Prozess] Tester-Vorarbeit für eine Fix-Runde setzt auf der letzten Vorarbeit des Paketzweigs auf (nicht auf dem Hauptstand) und wird sofort beim Annehmen unter .dev-team/vorarbeit eingetragen – sonst zieht der Merge fremde Commits ins Paket und die Entwickler-Schranke kann nicht grün werden (NR16-B1, a6794f7).
- 2026-11-05 [Werkzeuge] Vitest zeigt console.log aus bestandenen Tests nicht an – Messskripte mit --silent=false aufrufen (NR15-P1).
- 2026-11-05 [Tests] Indizes von Spieltabellen im Test aus der Tabelle ableiten (LISTE.length - 1), nicht als feste Zahl – Setter, die ungültige Werte still ignorieren, verbergen sonst falsche Indizes (B2a R3).
