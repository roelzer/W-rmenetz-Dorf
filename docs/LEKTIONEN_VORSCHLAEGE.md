
- 2026-11-05 [Prozess] Tester-Vorarbeit passt alle bestehenden Tests an, die eine geänderte Regel prüfen – vor Übergabe per grep nach der alten Form suchen (hier `attrs.disabled`, `.sperr-tipp`). Anlass: NR16-B blockiert, weil tests/a92-anschlussweg.test.ts übersehen wurde.
- 2026-11-05 [Prozess] Tester-Vorarbeit für eine Fix-Runde setzt auf der letzten Vorarbeit des Paketzweigs auf (nicht auf dem Hauptstand) und wird sofort beim Annehmen unter .dev-team/vorarbeit eingetragen – sonst zieht der Merge fremde Commits ins Paket und die Entwickler-Schranke kann nicht grün werden (NR16-B1, a6794f7).
- 2026-11-05 [Werkzeuge] Vitest zeigt console.log aus bestandenen Tests nicht an – Messskripte mit --silent=false aufrufen (NR15-P1).
- 2026-11-05 [Tests] Indizes von Spieltabellen im Test aus der Tabelle ableiten (LISTE.length - 1), nicht als feste Zahl – Setter, die ungültige Werte still ignorieren, verbergen sonst falsche Indizes (B2a R3).
- [Tests] Für Regeln mit eingebauter Absicherung (Probe mit Rücknahme) zeigen Fehlerproben am Vorfilter oft nichts – Gegenproben über Wegwerf-Varianten im Generator suchen (alter gegen neuer Stand). (NR15-P2, 2026-11-05)
- [Tests] Für schrittweise Rechnungen eine Wegwerf-Gleichheitsprüfung gegen den alten Stand fahren und Wegwerf-Varianten (je eine Nachführung weglassen) über den Generator suchen lassen – liefert gezielte Testfälle. (NR15-P2 Fix 1, 2026-11-05)
- [Prozess] Fix-Runden und Fortsetzungen: Agenten können nicht im Worktree eines anderen Agenten arbeiten (Wächter). Immer isolation: worktree und im Auftrag `git checkout -B <neu> <letzter Commit>` vorgeben. (NR15-P2/NR16-B2b, 2026-11-05)
- [Tests] Erwartete Preise im Spiel immer nach dem Kostenfaktor (KONSTANTEN.kosten_faktor) von Hand rechnen, nicht den Rohwert aus katalog.ts nehmen; gilt auch für Beispiele in DESIGN.md. (NR16-B2b, 2026-11-05)
- [Bauplan/Projektleiter] Tester-Vorarbeit aus dem Bauplan immer vor dem Entwickler beauftragen; vor dem Entfernen einer Sperre alle Tests suchen, die sie voraussetzen (nicht nur nach Stichwort im Namen). (NR15-P3, 2026-11-05)
- [Prozess] Verlangt eine Design-Nachbesserung einen anderen sichtbaren Text, der in bestehenden Tests wörtlich steht, vor dem Entwickler-Auftrag eine Tester-Vorarbeit einplanen. (NR16-B2b, 2026-11-05)
- [Prozess] Schweres Paket bekommt frischen Lauf und knappe Bauplan-Auszüge, sonst ist der Kontext beim Lesen verbraucht (NR18-P2, 06.11.)
- [Pläne] Beispieltexte für Knopf-Zeile 2 vor der Freigabe gegen die Zeichengrenze (≤ 28, eng ≤ 18) prüfen. (NR19 Zeile 2 hatte 29 Zeichen, 2026-11-06)
- [Schranke] Hat ein Paket-Branch den Arbeitsbranch hereingemergt, im Auftrag den Abzweigpunkt (merge-base) als Schranken-Basis nennen. (Fixrunde P6, 2026-11-06)
- [Tutorial] Jeder Schritt, der Wiedereinstiegs-Ziel sein kann, braucht einen Test „neu laden → Ziel da und antippbar“; Ziele in Blättern stellt die Steuerung selbst her. (NR13 M1, 2026-11-06)
- [Leistung] Bei Bildraten aus Chromium ohne Grafikkarte zuerst im Trace das Malen (LayerTreeHost::DoUpdateLayers) gegen die JS-Zeit stellen, bevor JS optimiert wird. (NR13-fps, 2026-11-06)
- [Prozess] Pakete mit vielen Zeichendateien bekommen nur einen knappen Auszug aus Bauplan und DESIGN (Abschnitt + Zeilen), nicht die ganzen Dokumente – sonst ist der Kontext vor dem ersten Test voll. (NR20 P4, 2026-11-07)
- [Tests] Nach Massen-Ersetzungen in Testdateien prüfen, ob geschützte Leerzeichen (U+00A0) erhalten bleiben (grep -c $'\xc2\xa0' vorher/nachher). (NR20 V0 fb4b901, 2026-11-07)

- [Bauplan] Architekturregeln, die erst beim Anlegen einer Datei greifen („greift ab Datei X“), gegen alle Pakete prüfen: Darf das Paket, das X anlegt, die verbotene Stelle nicht entfernen, wird ein Test zwischen den Paketen rot. (NR22, N2 gegen szene.ts, 2026-11-07)

- [Prozess] Ändert ein Tester einen Zahlenwert nach neuem Design, alle Tests mitprüfen, die dasselbe Token festschreiben (z. B. Vertragstests der Tokens) – sonst Widerspruch zwischen zwei Tests. (P5f-2 Streifen 4→5, 2026-11-07)
- [Prozess] Paketaufträge „berichtigen, Test zuerst“ vorher gegen bestehende Tests prüfen, die das alte Verhalten wörtlich festschreiben – sonst ist es Tester-Arbeit (Tester zuerst). (P5f-3 Satz T13h, 2026-11-07)
