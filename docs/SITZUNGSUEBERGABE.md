# Sitzungsübergabe

**Übergeben am:** 2026-11-05 nachmittags · **Auftrag:** Heatville – laufende Wünsche von Simon · **Dev-Team-Version:** 3.8
**Durchlauf:** an

## Wo wir stehen
- **Online:** https://heatville.pages.dev (Cloudflare Pages, baut automatisch von `main`). main = 1e9f10c (A71–A88 P1, alles geprüft).
- **Arbeitsbranch:** claude/keen-mccarthy-f4p5us (gepusht). Eine zweite Sitzung („Heatville: Cloudflare Pages einrichten“, session_01LNTyRK1Wam2u84s7FfXHYo) schreibt ggf. auch auf diesen Branch → vor Push `git fetch` + mergen.
- Artefakt-Vorschau: https://claude.ai/artifact/WiLVUTFj9uMdA9MXr9ZqQS (Version 37, Stand A84–A87).

## Nächster Schritt
A88 P2 „Freischalt-Leiter“ fertig bauen: Zwischenstand auf Branch `worktree-agent-ae8ab8968e37aeaad` (Commit 7415bc4, Worktree .claude/worktrees/agent-ae8ab8968e37aeaad). Kern fertig, 2 Tests rot (T6: Wegsuche wählt ohne Anbohrkosten einen Weg neben der Heizzentrale → Starthäuser kalt), Oberfläche (Bauplan 7a) fehlt. Entscheidung Projektleiter: Wegsuche behält die Anbohr-/Gestattungs-Gewichte als Routing-Gewicht, nur der Preis für den Spieler ist vor Freischaltung 0; Hilfe `laeuftDurch` wieder raus, falls nutzlos. Danach Review, Designer-Fotos, main.

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
