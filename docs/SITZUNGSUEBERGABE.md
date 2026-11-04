# Sitzungsübergabe – Wärmenetz-Dorf (Stand 2026-11-04, nach F5)

## Lage
Solo-Durchlauf (stiller Durchlauf, `.dev-team/durchlauf` besteht). Arbeitsbranch `claude/youthful-feynman-jaegcj`, nur dorthin pushen, kein PR. Commit-Nachrichten enden mit den Zeilen `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` und `Claude-Session: https://claude.ai/code/session_01LNTyRMMFnSVN6BzAwYHrbm`. Gate: `bash /root/.cache/roelz-plugins/plugins/dev-team/scripts/pruefe-tests.sh --basis <Commit> --rolle solo` (Schrift-Pakete scheitern an der Download-Zahl-Prüfung: Umgebungsproblem, in ENTSCHEIDUNGEN begründet; Abschluss mit `--rolle projektleiter`).

## Fertig (committet und gepusht bis F5)
F1–F5: Kern (`src/core`), Darstellung (`src/render`), Oberfläche (`src/ui`, `src/steuerung.ts`), Nachbardörfer, PWA-Dateien, Schriften (`@fontsource`), Leitungen in 8 Durchmessern (d25…d110, Farben nach Simon). 119 Tests grün.

## Neue Vorgaben von Simon (alle in docs/ENTSCHEIDUNGEN.md bzw. OFFENE_FRAGEN.md, außer die letzte)
1. **Nur Querformat** am Handy (844×390). Umgesetzt.
2. Leitungen 25er rot, 32er grün, 40er hellblau, 50er dunkelblau, 63er pink, 75er gelb, 90er braun, 110er dunkelgrün. Umgesetzt.
3. „in den jeweiligen Orten dann das alles gebaut“ – unklar, Frage steht in docs/OFFENE_FRAGEN.md.
4. **„mach die Optik mehr modern, weniger kindlich“ – NEU, noch offen.** Heißt: Oberfläche (Knöpfe, Pillen, Blätter, Schrift) und Kartenstil sachlicher/moderner: weniger dicke Umrisse, harte Schatten und Verläufe, weniger Cartoon-Schrift (Baloo 2 → ruhigere Schrift, z. B. Nunito Sans/Inter-artig), gedecktere Farben, flache Flächen, feine Linien, dezente Schatten; Karte weniger bunt/verspielt. Designer (`entwurf`-Überarbeitung von docs/DESIGN.md + design/tokens.json) einbinden, dann umsetzen (CSS-Variablen kommen aus tokens.json via src/ui/tokens.ts; Zeichenfunktionen in src/render/).

## Offene Arbeit (in dieser Reihenfolge)
A. **Reviewer-Befunde (rot)**, Bericht nur im Verlauf; Stand der Behebung:
 - K1 Offline erst ab 2. Laden: Dateiliste im Build. IN ARBEIT: `tools/sw.ts` (Vite-Plugin + `erzeugeServiceWorker`), `tools/sw-vorlage.js` sind angelegt, `public/sw.js` entfernt. Noch: Plugin in `vite.config.ts` eintragen (`plugins: [serviceWorker()]`), Test für A16 (tests/pwa.test.ts: Manifest, Vorlage, erzeugeServiceWorker, Dateiliste enthält Skript/CSS/Schriften nach Build; Test mit Namen „A16“), echten Offline-Test mit Playwright (1. Laden online, dann offline neu laden), `main.ts` registriert `./sw.js` (schon da).
 - H1/M1 alter/defekter Spielstand: ERLEDIGT (Version 2, Migration p1/p2/p3, Prüfung gegen Katalog, Sicherung unter `…-defekt`, Hinweis in main.ts).
 - M2: Warndreieck bei Überlast (`kapazitaet_ok === false`) in `src/render/szene.ts` zeichnen (nicht nur bei `engpass`).
 - M3 + Fachprüfer (docs/FACHPRUEFUNG_F5.md): Texte korrigieren (Reihenhaus, PV-Karte „Verbindung legen“, Erdsonde, Puffer, 110er-Beschreibung/Kontext-Text/Auftrag „main“, Planungsfehler-Text, „Überlastet“ in zwei Fälle trennen, „bis zu 40 %“); Einnahmefaktoren = ct/14 (0,714/0,857/1/1,143/1,286) plus Test (B7). Regeln V1/V2 im Kern ERLEDIGT (netz.ts, Tests im Block „A7 Fachregeln V1/V2“); V1–V4 stehen Simon zur Bestätigung in der Abschlussmeldung.
 - M4: Ausbau-/Kaufknöpfe bei zu wenig Geld tippbar lassen und Toast „Es fehlen … €“ (src/ui/kontext.ts, `aus:` entfernen).
 - M5: Tastatur in `src/steuerung.ts`: Enter/Pfeile/B ignorieren, wenn Fokus auf Knopf/Blatt oder Besuch aktiv.
 - M6: Test „Besuch verändert Spielstand nicht“ ersetzen; „Gefällt mir“ als `Spiel.moegen(name)` im Kern + Test.
 - Niedrig: toter Code (`void n/groesse/s/tp`, `voll ? X : X` in hud.ts, `classList.add('waerme')`), Regel „Münze ab 8 %“ doppelt (steuerung.ts/szene.ts → Kernfunktion), `Date.now()` in kontext.ts, Einstellungen-Speicherfehler, Fokusfalle Shift+Tab, Testnamen „Hausanschluss“.
B. **Designer-Bericht** (Agent `a8caf8244e36025c9`, Modus treue) steht noch aus; Datei `docs/DESIGN_TREUE_F5.md` erwartet. Mängel einarbeiten (wenn sie die neue „moderne“ Optik nicht überholt).
C. Optik modern/weniger kindlich (siehe oben, Punkt 4).
D. Reviewer `nachpruefung` bei kritisch/hoch; Tests mit A-Nummern für A16 (offen), A20 (Idee, braucht Simons Abdeckung); Gate `--rolle projektleiter`; Abschlussbericht; Merge nach `main` nur nach Skill-Regeln (Phase 9); am Ende `.dev-team/durchlauf` und diese Datei löschen.

## Wichtige Befehle
`npm test`, `npx tsc --noEmit`, `npm run build`, `npx vite preview --port 4173` (Build ansehen), Playwright: `require('playwright')`, Querformat-Skripte liegen im Scratchpad (`ql.cjs`, `ql2.cjs`).

## Zwischenstand auf Simons Wunsch (2026-11-04)
Simon wollte einen ersten Zwischenstand ("kurze Einleitung, bisschen bauen"); Durchlauf angehalten. Erledigt: Offline-Start (K1), Balken-Farben, Texte B1–B8, Einnahmefaktoren, "Gefällt mir" im Kern. Offen: Designer-Mängel 2–22 (docs/DESIGN_TREUE_F5.md), moderner Stil (Designer-Entwurf läuft/liegt vor), M2, M4, M5, Reviewer, Abschlussgate.
