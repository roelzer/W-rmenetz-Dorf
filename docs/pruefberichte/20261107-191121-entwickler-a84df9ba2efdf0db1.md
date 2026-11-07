# Bericht entwickler – 2026-11-07 19:11

**Status: 🔴 BLOCKIERT.** P0 ist vollständig gebaut und committet. Ein bestehender Architekturtest wird durch den Vertrag aber rot, und die Tester-Vorarbeit V0 kann ihn nicht beheben. Laut den STOP-Regeln aus P0 heißt das: anhalten und melden. Ich habe nichts daran repariert.

**Branch, Commit, Ort**
- Branch `nr20-p0`, Commit **`8f681d0798e50a31532f56c6d1e38f92798ef4b5`**.
- Gearbeitet habe ich direkt in meinem schon angelegten, sauberen Worktree `/home/user/W-rmenetz-Dorf/.claude/worktrees/agent-a84df9ba2efdf0db1`. Er stand bereits auf 1ddd110, deshalb habe ich kein zusätzliches `../wt-p0` angelegt. Der Worktree ist sauber.

**Der Grund für den Stopp (Sicherheit 98)**
- Der Test `tests/architektur/nr18-f2-struktur.test.ts`, Fall **F2d**, verlangt, dass im Vertrag genau 7 Tipp-Arten stehen (Zeile 25, `TIPPS`, nach Bauplan NR18 Abschnitt 5.4).
- Bauplan §5 verlangt aber zwei neue Tipp-Arten: `'farbknopf'` und `'abgehoben'`. Beides zugleich geht nicht.
- V0 darf `tests/architektur` nicht anfassen (§6). Ändern muss den Test also der Architekt.
- **Bitte an den Projektleiter:** Der Architekt ergänzt in diesem Test bei `TIPPS` die beiden Einträge `'farbknopf', 'abgehoben'`. Die übrigen Bedingungen von F2d erfüllt der Vertrag; geprüft habe ich das nur durch Lesen: weiter nur Typen in der Datei, nur der Import `./katalog`.

**Geänderte Dateien**
- `src/core/tutorial-vertrag.ts`
  - Schritte `T13w` und `T13h`, Tipps `farbknopf` und `abgehoben`.
  - `TutorialWerte` mit `kw_summe`, `haupt`, `anschluss`; `leitung` und `kap_kw` sind jetzt optional und als veraltet markiert.
  - Neue Typen `Feld`, `TutorialLeitungsLage`, `TutorialBandFeld` und alle 13 neuen Ansicht-Felder.
- `src/core/start.ts`: `TUTORIAL_HAUPTLEITUNG = 'd32'`, `TUTORIAL_HAUPT`, `TUTORIAL_ANSCHLUSS_1`, `TUTORIAL_ANSCHLUSS_2`, `TUTORIAL_ABZWEIG`. `TUTORIAL_SPUR` bleibt bis P5 stehen.
- `src/core/tutorial.ts`
  - Die Lage, die das Tutorial vom Spiel abfragt, verlangt jetzt `tutorialLeitungen()`.
  - Leerwerte in beiden Ansichts-Zweigen (Wiedereinstieg und normal), mit jedes Mal neuen Listen.
  - `einsetzen` liest vorläufig `w.leitung ?? w.haupt` bzw. `w.kap_kw ?? KATALOG[w.haupt].kapazitaet_kw`.
- `src/core/spiel.ts`
  - `kw_summe` ist die Summe der Puffer-Bedarfe beider Häuser.
  - `haupt` und `anschluss` sind vorläufig gleich der bisherigen `leitung`; `leitung` und `kap_kw` werden weiter befüllt.
  - `tutorialLeitungen()` ist ein Platzhalter und wirft `Error('NR21 P1: tutorialLeitungen noch nicht gebaut')`.
- `src/render/szene.ts`: nur Typfelder `tutorial_band`, `naechstes_feld`, `zielscheibe`, `ziel`, `ruhe`, `tutorial_fremd`, `ueberlast`. `tutorial_spur` bleibt.
- `design/tokens.json`: alle Tokens aus DESIGN 13.17.4, einschließlich `karte.ueberlast.*` und `karte.fremd.*`, dazu je ein `$hinweis_1317`. Der Leicht-Schleier steht wörtlich wie in der Tabelle als `rgba(28,14,4,.30)`.
- Neu: `tests/nr21-vertrag.test.ts` mit 4 Tests.
- `src/ui/tokens.ts` musste ich nicht ändern; es gibt die JSON-Datei nur weiter.

**Tests (ausgeführt mit `npm test`)**
- Ausgangslage auf 1ddd110 war grün: 1454 bestanden, Typprüfung grün.
- Jetzt: 1456 bestanden, 2 rot.
  - **F2d** (oben): nicht durch V0 lösbar, das ist der Stopp-Grund.
  - **`test_nr13_werte`** (`tests/nr13-kern.test.ts:127`): erwartbar. Der Test vergleicht `tutorialWerte()` mit `toEqual` mit dem alten Objekt, und P0 muss neue Felder hinzufügen. Er steht in der V0-Liste (grün mit P1).
- Meine 4 neuen Tests waren erst aus dem richtigen Grund rot und sind jetzt grün:
  - `test_nr21_spur_konstanten`
  - `test_nr22_tokens_da`
  - `test_nr21_werte_kw_summe`: 15 kW, mit veränderter Katalog-Zahl 18 kW, beides von Hand gerechnet.
  - `test_nr21_ansicht_leerwerte`: geprüft in T01, damit der Test auch nach P1/P2 gültig bleibt.
- Gegenproben mit `fehlerprobe.py`, also absichtlich falscher Code, den der Test bemerken muss:
  - `kw_summe` mit Bedarf ohne Puffer → ERKANNT.
  - `TUTORIAL_ABZWEIG` auf (10|11) → ERKANNT.
  - Leerwert `ruhe` auf `true`: Der Test wurde rot, aber die ERKANNT-Zeile habe ich nicht herausgefiltert; das zählt also nur als Hinweis, nicht als belegte Gegenprobe.

**Typprüfung (`tsc --noEmit`)**
- **In `src`: 0 Fehler.**
- 11 Fehler, alle in alten Testdateien und alle erwartbar nur durch die noch fehlende V0-Anpassung:
  - `nr13-tutorial-logik.test.ts`, 4 Fehler: `WERTE` ohne die neuen Pflichtfelder (Z. 13), Testlage ohne `tutorialLeitungen` (Z. 39), zwei Tabellen ohne `T13w`/`T13h` (Z. 293, 419).
  - `nr13-bausteine.test.ts:60`: neue Pflichtfelder der Ansicht (N4).
  - `nr13-kern:41`, `nr13-ablauf:59`, `nr13-neuladen:62`, `nr13-einbindung:455/461` (3 Fehler): Diese Stellen lesen `TutorialWerte.leitung`, das jetzt optional ist.
- Keine Typfehler außerhalb der V0-Liste. `npm run build` scheitert aus demselben Grund, weil es `tsc` vorschaltet.

**Test-Schranke für 8f681d0:** `ERGEBNIS: NICHT OK (Rolle entwickler, Basis 1ddd1101a0, Stand 8f681d0, Worktree)`. Rot wegen F2d, `test_nr13_werte` und den V0-Typfehlern.

**Was du noch wissen solltest**
- **`leitung_typ` (T12):** §5 sagt, das ist die Hauptleitung. Ich setze vorläufig `w.leitung ?? w.haupt`, weil der Wert sonst schon vor V0 zwei bestehende Tests rot macht. Der Wert ist in P0 derselbe; endgültig auf die Hauptleitung stellt ihn P2.
- **Unsichere Beobachtung (Sicherheit 60):** `tutorial.ts:287` prüft in T12 weiter gegen `tutorialWerte().leitung`. Lassen neue V0-Testlagen `leitung` weg, schaltet T12 dort nicht weiter. Das betrifft nur die Zeit zwischen V0 und P2; ich habe es nicht geändert, weil P0 es nicht vorsieht.
- Der Platzhalter `tutorialLeitungen()` hat absichtlich keinen eigenen Test. Ein solcher Test würde mit P1 falsch und müsste dann geändert werden.
- Keine neuen Abhängigkeiten, kein innerHTML, Spielstand-Schlüssel unverändert, keine `.verdeckt`-Dateien gelesen.

**Selbstprüfung**
- Plan-Treue erledigt. Grenzfälle: in einem reinen Vertragspaket nicht zutreffend. Sichtprüfung nicht zutreffend, weil nichts gezeichnet wird.
- Keine Duplikate: Die Tokens `ziel` und `ueberlast_zeichen` wiederholen absichtlich die Werte `fokus_auf_dunkel` und `knopf.geld[0]`, weil DESIGN es so festlegt.
- Bestehende Tests nicht geändert. Sicherheit: keine Eingaben von außen.
