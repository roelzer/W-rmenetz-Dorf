# Sitzungsübergabe Wärmenetz-Dorf (Stand 2026-11-05)

**Übergeben am:** 2026-11-05 · **Auftrag:** Spiel bauen (Solo) · **Branch:** `claude/youthful-feynman-jaegcj` (nie woanders pushen, kein PR ohne Auftrag)
Demo-Link (Artifact, privat): https://claude.ai/artifact/WiLVUTFj9uMdA9MXr9ZqQS – nach jedem Build mit Scratchpad-Skript `einzeln.cjs` (aus `dist/`) neu erzeugen und mit dem Artifact-Tool unter demselben Dateipfad neu veröffentlichen. Simon deployt über Cloudflare Pages (docs/VEROEFFENTLICHEN.md), Spielstand liegt im Browser je Gerät.

## Wo wir stehen
Gebaut und getestet (173 Tests, Schranke `--rolle projektleiter` grün, Reviewer-Befunde H1/H2/M1–M6/N1–N4 abgearbeitet): A33 Vorlauf + Hausupgrades, A34 Kamin aus, Aufstockung, A36 PV nur aufs Heizhaus-Dach + Einspeisung, A37 Durchsicht beim Planen, A38 Weiterlauf (7 Tage; über 5 Min. Abwesenheit Einnahmen direkt aufs Konto; „Willkommen zurück“-Toast), A39 Heizzentrale-Ziele (Anschlüsse, Absatz, Spreizung = 20 K + Upgrades), A40 Helfer Sebastian/Christian/Manfred, A41 Bauabschnitte (Philipp plant, Laura bestellt, 15 Min. Bau), A42 Häuser fest, A43 Baugebiet, Vorführ-Tempo ×1/×10/×60 (src/tempo.ts, außerhalb des Kerns), ruhige Optik aus Tokens (Salbei-Wiese).
Zuletzt in Arbeit (noch nicht committet/geprüft): **A44 Straßen** (Ort.strassen, Häuser nur an Straßen, Straßen im Render aus Tokens karte.strasse*), **Ortswahl entfernt** (nur noch Hilpoltstein; ortswahl.ts und ortWechseln gelöscht), Anzeigen (HUD) kleiner machen, Hauptleitung/Hausanschluss in der Leitungskarte benennen.

## Nächster Schritt
Straßen-Render per Bildschirmfoto prüfen (`shot6.cjs` im Scratchpad klickt noch „Hier bauen“ der alten Ortswahl – anpassen), HUD verkleinern (design/tokens.json hud_pille_hoehe 44→34, zahl_hud 15→13, dorfname 16→14, Pillen-min-height lösen), Tests/Schranke, committen, pushen, Artifact neu veröffentlichen.

## Offen (Reihenfolge)
1. Gebäude-Grafik „weniger kindlich“ (Häuser/Bäume/Heizhaus noch Spielzeug-Look, feste Farben in src/render/gebaeude.ts statt Tokens, Mangel 14).
2. Designer-Mängel 4–9, 11, 12, 15–22 (docs/DESIGN_TREUE_F5.md, Nachtrag 2026-11-05).
3. Wirtschaftsabgleich (Spielroboter): Einnahmen ~17–30 €/Min je Haus, Kosten ×40; Dauer bis „durchgespielt“ nur geschätzt (2–4 Tage normal, 1–2 Std. mit ×60).
4. Fachprüfer: Spreizung 20 K, Upgrade-Werte, PV als Dauerleistung (real 10–12 % der Spitze), Stationspreise; Recherche-Gegenprüfung (docs/recherche/*), echte OSM-Daten (Hosts freigeben).
5. Simon fragen: Bauzeit Bauabschnitt (aktuell 15 Min. echt, Spieljahr wäre ~17 h), Starthäuser mit/ohne Station, Offene Fragen S1–S5.

## Nur in dieser Sitzung entschieden
Simon: Häuser verschieben unsinnig → gestrichen; Reiter „Häuser“ weg; Baugebiet = zweiter Strang ab Größe; PV nur an die Heizzentrale; Häuser brauchen Station; Städtewahl raus; Straßen (Haupt-/Hausanschlussleitung = Durchmesserlogik, keine eigenen Typen); Anzeigen zu groß.

## Fallstricke
- `dist/` vor der Schranke neu bauen (`npx vite build`), sonst Warnung „dist älter“.
- Preview-Server: `nohup npx vite preview --port 4173 &`; Playwright aus dem Scratchpad mit `NODE_PATH=$(npm root -g)`.
- Tests mit Leitungen: Leitungen entstehen nur im Bauabschnitt; Tests setzen `s.stand.abschnitt = {phase:'offen', bau:null}` oder pushen Objekte direkt.
- Tempo-Test im Browser: localStorage `waermedorf-tempo-v1` = `{"faktor":60,"offset_ms":0}`.

## Erst lesen
docs/STATUS.md, docs/lastenheft.md (A1–A44), docs/OFFENE_FRAGEN.md, docs/ENTSCHEIDUNGEN.md, docs/DESIGN_TREUE_F5.md
