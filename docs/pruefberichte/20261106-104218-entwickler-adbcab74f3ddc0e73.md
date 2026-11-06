# Bericht entwickler – 2026-11-06 10:42

🟡 **Status: FERTIG_MIT_BEDENKEN.** Ein Punkt aus der Designer-Liste ist absichtlich nicht gebaut: die kurze Knopfbeschriftung „Puffer HP 800“. Grund: Sie würde einen bestehenden Test außerhalb meiner zwei NR19-Testdateien rot machen. Laut Auftrag habe ich hier gestoppt.

- **Branch:** `p6-nr19-fix`
- **Commit:** `3bb4bd7e7d599d492cedf58beff88c9d90913003`, baut auf dem Merge-Commit `1f601c6` auf (= 960c7b8 plus c122461).
- **Worktree:** /home/user/W-rmenetz-Dorf/.claude/worktrees/agent-adbcab74f3ddc0e73, sauber.

## Was jetzt anders ist
- **W1 (Weg a), getestet:** Ein Haus mit Puffer-Station kann nur noch gegen eine größere Puffer-Station tauschen. Versucht man es mit einer Wandstation, kommt der Satz: „Dieses Haus hat eine Puffer-Station. Tausch nur gegen eine größere Puffer-Station.“
  - Erst wenn keine Puffer-Station mehr reicht, ist eine Wandstation erlaubt. Dann fällt der Puffer weg, und die Wandstation wird nach Bedarf ohne Puffer (1.500 h) bemessen.
  - Das Hausblatt zeigt die Wandstationen erst in diesem Fall, mit Überschrift „Wandstation ohne Puffer“, dem neuen Satz „Keine Puffer-Station reicht mehr. Mit der Wandstation fällt der Puffer weg.“ und der Rechnung „Ohne Puffer: …“.
  - Alte Spielstände mit Puffer und Wandstation bleiben unverändert (eigener Test).
  - Die Prüfung „reicht noch eine Puffer-Station?“ steht an einer Stelle, als neue Funktion `pufferStationReicht` in src/core/netz.ts. Kauf und Hausblatt nutzen sie beide.
- **Review-Beobachtung (alter Stand mit Puffer, aber ohne Station):** Entschieden: Der vorhandene Puffer bleibt, auch mit Wandstation. So hat sich der Kern schon vorher verhalten; jetzt gibt es einen Test dafür.
  - Die irreführende Zeile „Ohne Puffer: … 1.500 h“ erscheint dort nicht mehr.
  - Die Überschrift heißt nur „Wandstation“, die angebotene Station ist die Typ 15 (Bedarf 7,5 kW).
- **K1:** Nicht umgesetzt, weil die Architekturregel F3 es verbietet. Der Architekturtest `tests/architektur/nr18-f2-struktur.test.ts:72` erlaubt einen Vergleich von `leistung_kw` mit einem Bedarf nur in netz.ts und katalog.ts. Ich habe den Kommentar an der Stelle um diesen Grund ergänzt.
- **K2:** Die Prüfung, die nur den Quelltext durchsucht, ist entfernt, ebenso der dafür nötige Datei-Import.
- **K3:** Beide Stellen schreiben jetzt den gemerkten Originalwert zurück statt der festen 19.
- **Designer 12.23, gebaut:**
  - Knopf-Zeile 2: „7,5 kW vom Netz ·“ mit geschützten Leerzeichen zusammengehalten, ebenso der Preis vor „€“. Nur nach dem „·“ steht ein normales Leerzeichen, dort darf die Zeile umbrechen.
  - Erklärzeilen: geschütztes Leerzeichen zwischen Zahl und Einheit bei kWh, h und kW (also nicht nur bei kW).
  - Reihenüberschriften als Zwischenüberschrift: ein `h4` mit Stilangaben, die nur vorhandene Design-Werte nutzen (Abstand oben 16 px, unten 4 px, Manrope 800, 14 px, Farbe text). Kein innerHTML, keine neue CSS-Klasse.
  - Stationszeile der Puffer-Station zweizeilig: „Übergabestation: Puffer HP 800“ und „Leistung Station: 14 kW Netz · 19 kW Haus“.
  - Die Kurzform kommt aus der neuen Funktion `pufferKurzname` in src/ui/kontext.ts. Der lange Katalogname bleibt, weil die Ablehnungssätze des Kerns ihn nennen und Tests ihn prüfen.

## Was nicht gebaut ist
- **Knopf-Zeile 1 „Puffer HP 800“:** `tests/a88-freischalt-leiter.test.ts:600–602` verlangt, dass der Knopftext mit „Puffer-Übergabestation HP 800“ beginnt. Dieser Test liegt außerhalb meiner Dateien, also habe ich ihn nicht angefasst und die Knöpfe lang gelassen.
  - Sobald der Tester diese Stelle umstellt, ist es eine einzige Änderung in src/ui/kontext.ts, in der Funktion `pufferKnoepfe`: `knopf(st.name, …)` wird zu `knopf(pufferKurzname(st), …)`.
  - Meine eigenen Tests filtern die Knöpfe noch nach dem Wort „Puffer-Übergabestation“ und müssten dann mit angepasst werden.

## Pflichtfragen
1. ✅ Ausgangslage grün: `npx vitest run tests` mit 1190 von 1190 bestanden.
2. ✅ Jeder neue Test war vorher rot, aus dem richtigen Grund: im Kern 4 rot, im Hausblatt 9 rot.
   - Ausnahme: Die beiden Altstand-Tests im Kern beschreiben Verhalten, das schon stimmte. Sie sind durch Fehlerproben abgesichert (Punkt 4b).
3. ✅ Alles grün: `npm test` 1199 bestanden, `npm run typecheck` und `npm run build` grün, keine Warnungen.
4. ⚠️ Schranke: Mit `--basis 960c7b8f82` und auch mit dem Merge-Commit meldet sie „NICHT OK“. Grund laut Schranke: „Basis … ist nicht der Abzweigpunkt dieses Pakets (c1224617f7)“, dazu Meldungen „bestehende Testdatei geändert“ für meine zwei NR19-Dateien. Mit dem Abzweigpunkt als Basis ist sie grün. Letzte Zeile wörtlich:
   `ERGEBNIS: OK – alles grün (Rolle entwickler, Basis c1224617f7, Stand 3bb4bd7, Worktree)`
5. ✅ Nur 5 Dateien geändert: src/core/netz.ts, src/core/spiel.ts, src/ui/kontext.ts, tests/nr19-puffer-kern.test.ts, tests/nr19-puffer-oberflaeche.test.ts.
6. ⚠️ Schnittstellen: Neu sind nur die Funktion `pufferStationReicht(o)` und zwei Hilfsfunktionen, die nur in kontext.ts gelten. Bestehende Schnittstellen sind unverändert.
7. ✅ Wiederverwendet: `stationReicht`, `passendeStation`, `istPufferStation`, `eur`, `zeile`, `h` und die vorhandenen Design-Werte.
8. ✅ Keine neuen Abhängigkeiten.
9. ✅ Fehler sind sichtbar: Eine Ablehnung kommt mit Satz zurück, nichts wird verschluckt.
10. ⚠️ Selbstprüfung siehe unten; die Sichtprüfung fehlt.

## 4b Selbstprüfung
- **Plan-Treue:** erledigt, bis auf Knopf-Zeile 1. Darüber hinaus nur der neue Satz im Hausblatt für den Fall „Puffer fällt weg“, damit der Spieler den Verlust nicht unbemerkt hinnimmt.
- **Gegenproben:** 16 von 16 ERKANNT (Code absichtlich falsch gemacht, Tests wurden rot):
  - spiel.ts: Tauschsperre, Löschen des Puffers, Bemessung der kleinsten Station, Puffer-Merkmal beim Prüfen, zwei Varianten der Bedingung „Puffer fällt weg“ (diese decken auch beide Altstand-Tests ab).
  - netz.ts: `some` gegen `every` getauscht.
  - kontext.ts: Wandreihe erlaubt, Satz „Ohne Puffer“, Bemessung der Wandstation, gebundenes €, Schriftstärke 800, Zweig „Puffer fällt weg“, Beschriftung „Leistung Station“, Leerzeichen in der Kurzform, Leerzeichen vor dem „·“.
- **Grenzfälle:** erledigt. Auf der Grenze „keine Puffer-Station reicht“ (Mehrfamilienhaus mit 47,25 kW gegen 40 kW) mit und ohne freie Stationswahl, und Typ 60 gegen 63 kW.
- **Sichtprüfung:** nicht geprüft. Dafür hätte ich eine Browser-Umgebung mit vorbereitetem Spielstand gebraucht; das liegt außerhalb dieser Fixrunde. **Bitte Designer-Nachfoto** für die Zwischenüberschrift, die zweizeilige Stationszeile und den Satz „Keine Puffer-Station reicht mehr …“.
- **Keine Duplikate:** erledigt.
- **Texte:** Du-Form. Der neue Satz hat 74 Zeichen, unter der Grenze von 90.
- **Bestehende Tests nicht geändert:** erledigt. Geändert sind nur die zwei NR19-Dateien, wie im Auftrag erlaubt.
- **Schranke:** siehe Pflichtfrage 4.
- **Sicherheit:** keine neue Eingabe von außen. Der Kauf läuft nur über die Knöpfe; ein veränderter Spielstand kann über den Kauf höchstens eine Ablehnung auslösen.

## Bedenken und offene Fragen
- **Rundungsfehler in der Anzeige (Sicherheit 85, nicht behoben, weil außerhalb des Auftrags):** Die kW-Anzeige im Hausblatt zeigt 15,75 kW als „15,7“ statt „15,8“. Der Rechner speichert den Wert als 15,7499…, und die Anzeige rundet ihn ab. Mein Test prüft an dieser Stelle deshalb nur Name und Preis. Behebung wäre einfach: in der Anzeigefunktion `kw` in src/ui/kontext.ts vorher auf eine Nachkommastelle runden.
- **Neuer Spieltext:** Der Satz „Keine Puffer-Station reicht mehr. Mit der Wandstation fällt der Puffer weg.“ ist neu und sollte vom Designer bzw. Fachprüfer angesehen werden.
- **Überschrift:** DESIGN 12.23 schreibt „Wandstation (ohne Puffer)“, Entscheidung und Auftrag schreiben „Wandstation ohne Puffer“. Gebaut ist die Fassung ohne Klammern.
- **Zeile „Aktuell“:** Im Kasten „Übergabestation tauschen“ steht weiter der lange Name („Aktuell: Puffer-Übergabestation HP 800 (14 kW) …“). Das war nicht verlangt.

## Lektionsvorschlag
- [Schranke] Hat ein Paket-Branch den Arbeitsbranch hereingemergt, muss im Auftrag der Abzweigpunkt (merge-base) als Basis der Schranke stehen, nicht der alte Paket-Commit. Sonst meldet die Schranke Prozessdateien und paketeigene Tests als fremde Änderungen. (Fixrunde P6, 2026-11-06)
