# Sitzungsübergabe

**Übergeben am:** 2026-11-04 · **Auftrag:** Wärmenetz-Dorf bauen nach „Mein Wärmedorf“ · **Dev-Team-Version:** 3.16.3
**Durchlauf:** an (Simons „fang jetzt an zu bauen“ gilt als Freigabe; Besetzung Solo)

## Wo wir stehen
- **Phase:** Solo-Bauen · F1 und F2 fertig und gepusht, F3 (Darstellung) beginnt
- **Arbeitsbranch:** claude/youthful-feynman-jaegcj · **Letzter Commit:** 92c3340 (gepusht: ja)
- **Letzter grüner Stand:** 92 Tests bestanden, tsc und Build grün

## Nächster Schritt
F3: Darstellung nach src/render/ übernehmen (Canvas-2D-Code des Prototyps, Felder auf neue Namen umstellen), danach F4 Oberfläche in src/ui/ nach docs/DESIGN.md.

## Features
| Nr. | Stand | Was fehlt |
|---|---|---|
| F1 Gerüst, Katalog, Netz | fertig | – |
| F2 Spielablauf (src/core/spiel.ts, auftraege.ts, speichern.ts) | fertig | – |
| F3 Darstellung (src/render) | offen | Kamera, Boden, Objekte, Leitungen, Effekte aus Prototyp |
| F4 Oberfläche (src/ui) | offen | HUD, Katalog, Kontextkarte, Quellenwahl, Aufträge, Einstellungen mit Fiktiv-Hinweis |
| F5 PWA, Nachbardörfer | offen | Manifest, Service Worker, Schriften lokal (offline), Beispieldörfer (src/core/nachbarn.ts) |
| F6 Abschluss | offen | Designer treue (Test-Spielstände: neu, Baustelle, Engpass, Kasse voll, gekündigt, Besuch), Reviewer gesamt, Fachprüfer, Schranke projektleiter |

## Laufende Agenten
keine.

## Nur in dieser Sitzung entschieden
- Vorlage ist Artefakt „Mein Wärmedorf“ (HTML liegt unter /root/.claude/projects/-home-user-W-rmenetz-Dorf/0f22298d-d754-58d5-a139-ea7ff6b6cb63/tool-results/artifact-73a196c8-1793803700-7861.html, nur in dieser Sitzung vorhanden; Zeilen 330-500 sind der Zeichencode). Die anderen drei Spiel-Artefakte hat Simon löschen lassen.
- Landschaftsbäume tragen Objekt.landschaft=true und zählen nicht zur Deko-Grenze.
- Kalt-Abzug der Zufriedenheit: Haus 55, Großabnehmer 70 Prozentpunkte (Prototyp 45 hätte bei fairem Preis nie zur Kündigung geführt).
- Designer: Hinweis „Alle Wärmenetze und Werte sind fiktiv“ bleibt in den Einstellungen (S8).

## Fallstricke
- Kern (src/core) darf keine Browser-API, kein Date.now, kein Math.random nutzen (Architekturtest); Uhr wird dem Spiel als Funktion übergeben.
- Darstellung mit Zeit statt Bildzähler animieren (Designer M9), Schriften lokal einbinden, Symbole als Formen statt Emoji.
- Dependency-Schranke meldet „Downloadzahl nicht abrufbar“ (kein Netz zur npm-Statistik): bekannte Einschränkung, nicht beheben.
- Schranke bei Rolle solo meldet dev-team.json geändert (einmalige Ersteinrichtung durch den Projektleiter, erlaubt bei Rolle projektleiter).
- Vor dem Fertigmelden: Lastenheft-Nummern A1…A20 müssen in Testnamen vorkommen (Schranke projektleiter), also auch für A1, A2, A16, A17, A18 Tests/Kommentare mit der Nummer.

## Erst lesen
docs/STATUS.md, docs/lastenheft.md, docs/DESIGN.md, design/tokens.json, docs/ENTSCHEIDUNGEN.md
