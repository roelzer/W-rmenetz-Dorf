# Sitzungsübergabe

**Übergeben am:** 2026-11-05 nachmittags · **Auftrag:** Heatville – laufende Wünsche von Simon · **Dev-Team-Version:** 3.8
**Durchlauf:** an

## Wo wir stehen
- **Online:** https://heatville.pages.dev (Cloudflare Pages, baut automatisch von `main`). main = 1e9f10c (A71–A88 P1, alles geprüft).
- **Arbeitsbranch:** claude/keen-mccarthy-f4p5us (gepusht). Eine zweite Sitzung („Heatville: Cloudflare Pages einrichten“, session_01LNTyRK1Wam2u84s7FfXHYo) schreibt ggf. auch auf diesen Branch → vor Push `git fetch` + mergen.
- Artefakt-Vorschau: https://claude.ai/artifact/WiLVUTFj9uMdA9MXr9ZqQS (Version 37, Stand A84–A87).

## Nächster Schritt
A88 P2 „Freischalt-Leiter“ fertig bauen. Zwischenstand (unfertig, Typprüfung rot) liegt als Patch in `docs/bauplaene/A88-P2-zwischenstand.patch` (gegen 8a4b746, passt auf den aktuellen Branch: `git apply`). Enthält: Kern fertig (`src/core/freischaltung.ts`, Sperren in spiel.ts, Gestattung/Anbohrung vor Freischaltung kostenlos, ungültige `anfrage` wird gelöscht), Tests `tests/a88-freischalt-leiter.test.ts` (2 rot: T6) und angefangen `tests/a88-wegsuche.test.ts`, Anfang ui/katalog.ts.
- Entscheidung Projektleiter zu T6: Wegsuche behält die Anbohr-/Gestattungs-Gewichte von vor A88 als Routing-Gewicht; nur der Preis für den Spieler ist vor Freischaltung 0. Hilfe `laeuftDurch` raus, falls nutzlos. netz.ts nicht ändern.
- Danach Oberfläche nach Bauplan 7a (katalog.ts, steuerung.ts Zeichenleiste, kontext.ts inkl. Großabnehmer/Außenquelle über `passendeLeitung`), `chip('fragt an','gold')`, Test Blase „wuetend“ vor Anfrage. tests/menue-v2.test.ts prüft Quelltext-Stellen – nicht ändern.
- Ablauf: frischer Entwickler im Worktree mit Patch → Schranke → Review → Designer-Fotos → main. Patch-Datei danach löschen.

## Danach (Reihenfolge)
1. NR12 weniger Rechenlast / flüssiger (Simon)
2. NR11 Vollbild-Knopf (Android) bzw. Hinweis Home-Bildschirm (iPhone)
3. NR13 Pflicht-Tutorial mit Simon als Anleiter-Figur (Bild folgt; Q11 „Abgleich“ offen) zusammen mit NR2/NR3
4. Kleinkram: Sprechblase/Banner im Menü-Stil v2 (Designer Nr. 8), Designer-Kann-Punkte, matchMedia-Test

## Offen an Simon
- Cloudflare-Sitzung wollte `mcp__cloudflare__execute` u. a. in .claude/settings.json dauerhaft erlauben – NICHT übernommen, Simon gefragt.
- Q8–Q10 (A81), Q11 (Abgleich), Bild für Anleiter-Figur, Dorfname „Wärmlingen“ ok?

## Fallstricke
- Schranke: jede `**A<Nr>**`-Zeile braucht Test; Testzahl darf nicht sinken (sonst Freigabe nach Kritiker, `--freigabe`).
- Verdeckte Abnahmetests: in `.dev-team/verdeckt/` (gitignored) + Prüfsummen docs/ABNAHME_PRUEFSUMMEN.txt.
- Spielstand-Schlüssel `waermedorf-…` nie ändern; kein innerHTML.
- Playwright-Tipp 844×390: Haus (330,262), Heizzentrale (415,215), Zahnrad (177,22).

## Erst lesen
docs/STATUS.md, docs/ENTSCHEIDUNGEN.md (Ende), docs/bauplaene/A88-freischalt-leiter.md, docs/lastenheft.md (A80–A88, NR1–NR13), docs/CLOUDFLARE.md
