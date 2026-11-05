# Sitzungsübergabe

**Übergeben am:** 2026-11-05 abends · **Auftrag:** Heatnet – laufende Wünsche von Simon (A71–A84) · **Dev-Team-Version:** 3.8
**Durchlauf:** an (Simon gibt laufend Wünsche, Projektleiter baut, prüft, committet, pusht)

## Wo wir stehen
- **Arbeitsbranch:** claude/keen-mccarthy-f4p5us · **Letzter Commit:** 7b93494 + Doku-Commit (gepusht: ja)
- **Letzter grüner Stand:** 7b93494, 268 Tests, Schranke projektleiter OK
- **main:** d27798e (Review-Chat-Doku) – noch NICHT auf unserem Stand. main darf nach Prüfung bekommen: Merge-Stand inkl. A71–A83, sobald A83 vom Reviewer freigegeben ist (`git push origin claude/keen-mccarthy-f4p5us:main`, vorher `git fetch origin main` und prüfen, dass main ein Vorfahr ist).
- Artefakt (Einzeldatei-Vorschau): https://claude.ai/artifact/WiLVUTFj9uMdA9MXr9ZqQS, zuletzt Version 37 (Stand A84–A87). Bauen: `npm run build && node werkzeuge/artefakt-einzeldatei.cjs <scratchpad>/waermedorf.html`, dann gleiche Datei veröffentlichen.

## Nächster Schritt
Ergebnis des Entwicklers „Menü-Stil v2 (A84)“ abwarten, seinen Worktree-Branch prüfen (Fotos in scratchpad/v2bau/, Schranke), in den Arbeitsbranch mergen, Designer-Treueprüfung (DESIGN.md 12.13) beauftragen; parallel Reviewer-Ergebnis zu A83 abarbeiten.

## Pakete
| Nr. | Stand | Branch / Worktree | Was noch fehlt |
|---|---|---|---|
| A71–A80 | gemergt, reviewt (🟡) | Arbeitsbranch | kleine Punkte K3/K4/K7 (A80-Tests), Typprüfung neuer Felder beim Laden |
| A81 Monatsabrechnung | gemergt, Review 🟡 frei, Fachprüfer GELB | Arbeitsbranch | Simon-Fragen Q8–Q10 (Warmwasser-Sockel, Grundgebühr je kW, Verlustkosten), Hausstufe = mehr Verbrauch? |
| A82 Ladebild | gemergt, reviewt | Arbeitsbranch | – |
| A83 Cloudflare-Vorbereitung | gemergt, im Review | Arbeitsbranch | Reviewer-Ergebnis; Simon richtet Cloudflare Pages ein (docs/CLOUDFLARE.md) |
| A84 Menü-Stil v2 | in Arbeit (Entwickler) | eigener Worktree | Merge, Fotos, Designer-Treue |
| NR1–NR10 | vorgemerkt (aus Review-Chat) | – | bekommen beim Bau nächste A-Nummer; Reihenfolge wie Nummern |

## Laufende Agenten
- reviewer „Review A83 Cloudflare-Vorbereitung“ – Basis bcf1c76..dcb0c85, eigene Kopie.
- entwickler „Menü-Stil v2 umsetzen“ (A84) – Worktree, Basis 7b93494, Vorgabe DESIGN.md Abschnitt 12 + design/menue-v2-referenz.md.

## Nur in dieser Sitzung entschieden oder besprochen
- Simon: Zeitraffer (1 Spielmonat = 10 min) „erstmal so, falls zu schnell durchgespielt, anpassen“ (steht in ENTSCHEIDUNGEN).
- Simon: Spruch „Heize dein Dorf klimaneutral“ (steht in ENTSCHEIDUNGEN; vor Store rechtlich prüfen, L3).
- Simon: Cloudflare Pages einrichten – Antwort gegeben: Pages (nicht Workers), Production branch main, Preview an, Build `npm run build`, Output `dist`, NODE_VERSION 22; Simon schickt Adresse, dann ersten Durchlauf prüfen.
- Offene Frage an Simon: Großkunden-Grundgebühr je 10 kW? Warmwasser-Anteil nach Recherche? Hausausbau = mehr Verbrauch?
- Ein anderer Claude-Chat (Review-Chat, Session …RMTrQFLrwQepR8ZBAN) schreibt auf main Doku. Vor jedem Push auf main `git fetch origin main` und mergen.

## Fallstricke
- Schranke verlangt für jede `**A<Nr>**`-Zeile im Lastenheft einen Test mit der Nummer → neue Anforderung erst eintragen, wenn der Test dabei ist (oder als NR/Vormerkung).
- Spielstand-Schlüssel `waermedorf-…` nie umbenennen; kein innerHTML; SVG nur per DOMParser.
- Playwright-Tipp-Koordinaten (844×390, Einzeldatei): Haus (330,262), danach Heizzentrale (415,215); Zahnrad Dorfschild (177,22). Skripte im Scratchpad: rechnung.cjs, einst.cjs, lade.cjs, tipp.cjs.
- Vitest-Umgebung node (kein DOM); UI nur über Quelltext-Tests oder Playwright prüfbar.

## Erst lesen
`docs/STATUS.md`, `docs/ENTSCHEIDUNGEN.md` (Ende), `docs/OFFENE_FRAGEN.md` (Q8–Q10), `docs/lastenheft.md` (A80–A83, NR1–NR10), `docs/DESIGN.md` Abschnitt 12, `docs/CLOUDFLARE.md`
