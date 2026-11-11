# Fotocheck Designer – P7e (H1–H5 aus DESIGN 13.17.11)

**Ampel: 🟢** Aus Sicht der Gestaltung kann veröffentlicht werden. H1 bis H5 sind so gebaut wie entworfen. Vor der Veröffentlichung ist nichts mehr nötig.

Modus `treue`, Designer, 2026-11-11. Prüfstand: Worktree `.claude/worktrees/agent-a7e71a0eb7050b815`, Branch `nr20-p7e`, Kopf d6e2962. Projektcode habe ich nicht geändert.

## Grundlage
- **Überlast, getestet:** mein Skript von neulich, nur den Pfad zum Worktree angepasst (`/tmp/claude-0/-home-user-W-rmenetz-Dorf/689e9066-6050-59dc-abe0-ac861071fa0f/scratchpad/p7e/ueberlast.cjs`), mit dem P7b-Spielstand. Größen 844×390 und 667×375, jeweils in Gerätefaktor 1 und 3.
  - Ergebnis wie beim letzten Mal: ein überlastetes Stück aus 6 Feldern (25er, 26 / 15 kW), ein Dreieck. Antippen öffnet das Blatt. „Auf 40er vergrößern“ führt zu „Wird auf 40er vergrößert“.
  - Keine Fehler in der Browser-Konsole.
  - Fotos: `/tmp/claude-0/-home-user-W-rmenetz-Dorf/689e9066-6050-59dc-abe0-ac861071fa0f/scratchpad/p7e/x1/` und `/tmp/claude-0/-home-user-W-rmenetz-Dorf/689e9066-6050-59dc-abe0-ac861071fa0f/scratchpad/p7e/x3/`.
- **Tutorial, getestet:** `nr20-tutorial.browser.cjs --paket p7efinal`. Ergebnis: **68 OK, 0 FEHLT**, keine Konsolenfehler. Die Fotos liegen unter `docs/pruefberichte/20261111-p7efinal-*.png`.
- **H3, getestet:** `vitest run tests/nr22-p7e.test.ts tests/nr22-p7e-h4-phase.test.ts` → 42 von 42 bestanden.

## Ergebnis je Punkt
| Punkt | Stand | Beleg |
|---|---|---|
| **H1** Saum schmal | erfüllt | Gemessen mit der Pipette senkrecht durchs Rohr, Foto in Gerätefaktor 3 bei 844×390: Die überlastete 25er ist 18–19 px breit, die normale 25er oben links 17–18 px. Das liegt innerhalb ± 1 px. Die 40er ist 21 px breit. Bei Gerätefaktor 1 ist die überlastete 25er also so breit wie eine normale 25er und etwa 1 px schmaler als die 40er. Mehr Unterschied gibt die Größenstufe 25 → 40 auch ohne Überlast nicht her. Die Rohrmitte hat dieselbe Farbe wie bei der normalen 25er (gemessen 216/57/47). Gelb ist nur noch die schmale Kante, etwa 1 px je Seite. Im Bild wirkt das Rohr klar rot mit gelbem Rand und nicht mehr wie eine 75er. Das Dreieck bleibt gut sichtbar. |
| **H2** Vorschau-Rauten | erfüllt | Foto „blatt“ bei beiden Größen in Gerätefaktor 1: Die hellblauen Strichrauten mit dunkler Unterlinie sind auf Wiese und Straße klar zu sehen. Beim letzten Mal waren sie fast unsichtbar. |
| **H3** Titel bei Hand-Ersatz | erfüllt (Tests) | Fotografiert habe ich nur den Fall mit der empfohlenen Größe: Titel „Wird auf 40er vergrößert“. Die gemischten Fälle („Wird vergrößert“) gibt mein Spielstand nicht her. Sie sind durch die bestandenen Tests belegt. |
| **H4** kein doppeltes Zurücknehmen | erfüllt | Zustand „geplant“ bei beiden Größen: Im Blatt stehen nur noch [Zurücknehmen] und [Entfernen]. Die Feldzeile und [Ersatz zurücknehmen] fehlen, so wie entworfen (Liste der Knöpfe aus dem Skript). |
| **H5** Eckpfeil im Band | erfüllt | T13w-Foto, auf das Fünffache vergrößert, bei 844×390 und 667×375: Alle vier Pfeile liegen ganz im roten Band, auch auf dem Eckfeld links. Nichts ragt auf die Straße. |

**Knopf [Bauen] im Tutorial (Folge von G6):** Er ist auf keinem der Tutorial-Fotos zu sehen. In diesen Schritten verdeckt ihn das Blatt rechts. Auf den Fotos stört er also nicht.

## Unsichere Beobachtungen (unter 80, keine Befunde)
- Wenn [Bauen] irgendwo voll farbig, aber gesperrt zu sehen ist, sollte ein Tipp darauf eine Antwort geben, etwa einen Hinweis oder ein kurzes Wackeln. Sonst wirkt er kaputt. Nicht geprüft, weil der Knopf auf keinem Foto sichtbar war. (Sicherheit 50)
- Bei 667×375 ist die Auftragskarte oben links sehr knapp („Versorge dein…“). Das war schon vorher so und gehört nicht zu P7e. (Sicherheit 60)

## Nicht geprüft
- Wie beim letzten Mal: Überlast an dickeren Leitungen, mehrere Dreiecke, Zoom 1 und 3, „Weniger Bewegung“. Der Spielstand gibt das nicht her.
