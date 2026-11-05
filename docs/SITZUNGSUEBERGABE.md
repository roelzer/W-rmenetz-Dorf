# Sitzungsübergabe

**Übergeben am:** 2026-11-05 nachmittags · **Auftrag:** Heatnet – Simons Wünsche A71–A81 · **Dev-Team-Version:** 3.8
**Durchlauf:** an (Simon gibt laufend neue Wünsche, „bau das erstmal“; Push nach main erlaubt, wenn geprüft)

## Wo wir stehen
- **Arbeitsbranch:** claude/keen-mccarthy-f4p5us · **Letzter Commit:** efd321d + Agenten-Log (gepusht) · main = c6894fc (noch alter Stand)
- **Letzter grüner Stand:** efd321d, 248 Tests. Im Arbeitsordner (nicht committet): A80 (Treffer per Gebäudeform src/render/treffer.ts, leeres Fenster in src/ui/kontext.ts behoben, Ladebild-Unterzeile einzeilig in stil.css), Tests A80 grün.

## Nächster Schritt
A80 durch die Schranke, committen, pushen; dann Fachprüfer-Befunde 1–3 (kontext.ts:236 Text „-25 % mehr“ bei niedrigem Vorlauf, Upgrade-Knopf zeigt nominal statt tatsächlichen Spreizungsgewinn, Hallenbad-Volllaststunden als Frage) beheben; Reviewer-Ergebnis A71–A79 abwarten; dann A81 Abrechnung bauen.

## A81 (neu, noch nicht im Lastenheft)
Simon: „Es gibt einen jährlichen Verbrauch und einen Wärmepreis pro kWh, außerdem eine Grundgebühr, die man auch festlegen kann, ca. 30–35 €, dann Verbrauch auf Monate aufgeteilt und Abrechnung pro Monat, das Geld wird automatisch überwiesen.“ Offen: Spieltempo (Spieljahr = 16,8 h echt → Monat 1,4 h; reale Beträge ~2.200 €/Jahr je EFH wären ~7× weniger Geld als heute) – Simon zur Balance fragen oder Tempo-Faktor vorschlagen; Monatsanteile nach Gradtagen (Spielwert, Recherche).

## Laufende Agenten
- reviewer „Review A71–A79“ (c6894fc..efd321d), Bericht kommt als Nachricht.
- Fachprüfer A71–A76: fertig (Gelb, Befunde oben).

## Fallstricke
- Spielstand-Schlüssel `waermedorf-…` nie umbenennen; kein innerHTML.
- vitest läuft in node (kein DOM) – UI nur per Quelltext-Test oder Playwright prüfen.
- Artefakt: npm run build; node werkzeuge/artefakt-einzeldatei.cjs <scratchpad>/waermedorf.html; veröffentlichen an https://claude.ai/artifact/WiLVUTFj9uMdA9MXr9ZqQS.

## Erst lesen
`docs/STATUS.md`, `docs/lastenheft.md` (A71–A80), `docs/ENTSCHEIDUNGEN.md`, `docs/OFFENE_FRAGEN.md` (Q6, Q7, F3)
