# Sitzungsübergabe – Heatnet (früher „Wärmenetz-Dorf“)

**Stand:** 2026-11-05 · **Branch:** `claude/youthful-feynman-jaegcj` (nie nach `main` ohne Simons Wort) · **Tests:** 212 grün, Schranke `--rolle projektleiter` OK · **Besetzung:** Solo

## Für die neue Sitzung zuerst lesen
1. `CLAUDE.md` (Projektregeln: Querformat 844×390, Tippflächen ≥ 44 px, Spiellogik in `src/core` ohne DOM/Zeit/Zufall, Einheiten im Namen)
2. diese Datei, dann `docs/lastenheft.md` (A1–A66), `docs/ENTSCHEIDUNGEN.md`, `docs/OFFENE_FRAGEN.md`
3. `.claude/dev-team.json` (Test-, Typ- und Build-Befehle)

## Was Simon testet
- Artefakt (eine HTML-Datei, privat): https://claude.ai/artifact/WiLVUTFj9uMdA9MXr9ZqQS – zuletzt **Version 30**
- Später Veröffentlichung über Cloudflare Pages aus dem Repo (Spielstand je Browser im localStorage)
- Er stellt das Spiel seinem Chef vor; läuft am Handy (quer) und am Laptop

## Arbeitsablauf (bewährt)
1. Ändern, `npx tsc --noEmit`, `npx vitest run`
2. Jede neue Anforderung bekommt eine A-Nummer in `docs/lastenheft.md`, eine Zeile in `docs/ENTSCHEIDUNGEN.md` und **einen Test, der die A-Nummer im Namen trägt** (sonst meldet die Schranke rot)
3. `npx vite build`, dann Schranke: `bash /root/.cache/roelz-plugins/plugins/dev-team/scripts/pruefe-tests.sh --basis HEAD --rolle projektleiter > /tmp/gate.txt 2>&1` und **erst bei** `grep -q "OK – alles" /tmp/gate.txt` committen, pushen, veröffentlichen (früher zweimal vor der Prüfung veröffentlicht – Lektion)
4. Sicherheitsprüfung der Schranke meldet `innerHTML` → SVG/HTML immer per `DOMParser` einsetzen
5. Artefakt neu bauen: `node werkzeuge/artefakt-einzeldatei.cjs <scratchpad>/waermedorf.html`, dann Artifact-Tool mit `url: https://claude.ai/artifact/WiLVUTFj9uMdA9MXr9ZqQS` (neue Sitzung muss das Artefakt vorher einmal mit `action: read` lesen)
6. Bildschirmfotos: `npx vite preview --port 4173` im Hintergrund, dann `node werkzeuge/bildschirmfoto.cjs <präfix>` (wartet den Ladebildschirm ab, zoomt hinein)
7. Commit-Nachrichten enden mit den Attributionszeilen aus dem System-Hinweis; kein Modellname in Commits

## Was diese Sitzung gebaut hat (A45–A66, Kurzfassung)
| Nr. | Inhalt |
|---|---|
| A45–A47 | Straßen und Fluss; Leitungen gehören auf öffentliche Straße, sonst Gestattung 1.500 €/Feld; Fluss nur per Spülbohrung 8.000 €/Feld; Startgeld 30.000 €; automatischer Hausanschluss; alte Spielstände werden an Straßen/Fluss angepasst |
| A48 | Karte in 90°-Schritten drehen (⟲ ⟳, Q/E) |
| A49 | Gerade Leitungen beim Ziehen, Radierer und „Letzte zurück“, Anschlüsse im Bauabschnitt erkannt, Station tauschen, niedriger Rücklauf bringt Leitungskapazität |
| A50 | Volle Stadt (40 Häuser), Interessenten leuchten gelb und bekommen Nachlass |
| A51 | Helfer (Philipp, Laura, Techniker) mit echten, freigestellten Fotos und Sprechblase |
| A52 | Wärmepreis in der Heizzentrale einstellen |
| A53 | Detailreichere Straßen, Gärten, Zahnrad am Dorfschild |
| A54 | kW-Schilder an/aus (Knopf „kW“ links unten, Taste K), weniger Zebrastreifen |
| A55 | Drehen per Zwei-Finger-Geste und Mittelmaustaste; Gartenränder entfernt |
| A56 | „Spielstand löschen“ bleibt gelöscht (Neuladen schrieb den alten Stand zurück) |
| A57 | Hauptleitung am Haus vorbei ist kein Anschluss; Haus hängt an seinem eigenen Leitungsende |
| A58 | Heizhaus: Plätze 2/3/4/5/6; neu Pelletkessel, Gas-Spitzenlastkessel, Biogas-BHKW (ab Stufe 2, liefert Strom 0,8 × Wärme) |
| A59 | Startleitungen: 40er-Hauptleitung in der Straße, 25er-Hausanschluss |
| A60 | Kein Rauch aus Hauskaminen (nur Heizzentrale) |
| A61 | Spielname „Heatnet“ (ohne „Clash“ wegen Markenrisiko) |
| A62 | Expresslieferung bei Laura: 30 % Aufpreis aufs Material (min. 500 €), Restlieferzeit × 0,35, einmal je Abschnitt; Taler-Knopf heißt „Sofort fertig“ |
| A63/A64 | Logo (Flammen-Figur im Rohrring rot/blau), Schrift „Lilita One“, Ladebildschirm als gezeichnete Dorfszene wie im Spiel (Hauptleitung 63er→50er→40er in der Straße, rote 25er-Anschlüsse, Herz-Sprechblasen, PV, Windräder), Unterzeile „Heize dein Dorf klimaneutral“, Tipps |
| A65 | Abzweig-Darstellung: dünnere Leitung läuft in ihrer Farbe bis in die dickere; Haus direkt an dicker Leitung bekommt optisch eigenen dünnen Anschluss |
| A66 | Autos entfernt |

## Wichtige Stellen im Code
- `src/core/spiel.ts` – Spiel, Bauabschnitte (`abschnitt…`, `materialBestellen`, `expressLiefern`), `hausanschlussPlanen`, `innenEinbauen`, Startaufstellung in `neuerSpielstand`
- `src/core/netz.ts` – Netzberechnung, Anschlusspunkt je Gebäude (A57), BHKW-Strom (A58)
- `src/core/katalog.ts` – alle Spielzahlen (`KONSTANTEN`, Leitungen 25er … 110er mit Farben, Quellen)
- `src/render/szene.ts`, `src/render/anschluss.ts`, `src/render/gebaeude.ts` – Zeichnen
- `src/ui/vorspann.ts` + `src/ui/logo.svg` – Logo und Ladebildschirm; `public/icon*.png` daraus gerendert
- `src/ui/kontext.ts` (Karten zu Gebäuden), `src/ui/katalog.ts` (Bauen, Bauabschnitt), `src/ui/einstellungen.ts`, `src/ui/sprecher.ts`
- Spielstand-Schlüssel bleiben `waermedorf-…` (nicht umbenennen, sonst sind Spielstände weg)

## Offen / nächste Schritte
- **Frage an Simon:** Stationen „HP 800/1000, ÜP 800/1000“ – Recherche fand nichts; Katalog unverändert (Wandstationen 15–80 kW)
- **Simon bestätigen lassen:** BHKW 0,8 kW Strom je kW Wärme; Leistungen 25er = 12 kW, 40er = 30 kW (Spielwerte); Slogan „klimaneutral“ vs. „erneuerbar“
- **Fachprüfer** (`fachpruefer`) für: Gestattung 1.500 €, Spülbohrung 8.000 €, Spreizungsfaktor, Upgrades, PV, neue Kessel, Ladebildschirm-Tipps, „klimaneutral“
- **Designer** (`designer` Modus `treue`): Logo und Ladebildschirm prüfen; alte Mängel 4–9, 11, 12, 15–22
- **Reviewer** (`reviewer` Modus `gesamt`) über A45–A66 steht aus
- Optik: Häuser, Heizzentrale, Bäume, Wiese detailreicher (Simon wünscht „mehr Biss“)
- Wirtschaftsabgleich mit Startgeld 30.000 € (nicht simuliert)
- Lieferzeit im Bauabschnitt zeigt meist ~1 Woche (Bauzeit vs. Spieljahr)
- Alte Spielstände behalten alte Startleitungen (Simon setzt über Zahnrad → „Spielstand löschen“ zurück)
- **Nur Simon:** Einverständnis der fünf fotografierten Personen vor Cloudflare-Veröffentlichung; App-Store nur nach Markenprüfung; GitHub-Repo umbenennen nur er
- Merge nach `main` nur auf Simons ausdrücklichen Wunsch
