# Heatnet über Cloudflare Pages veröffentlichen (A83)

## Einmal einrichten (nur Simon)
1. Kostenloses Konto auf cloudflare.com anlegen.
2. „Workers & Pages“ → „Erstellen“ → Reiter **Pages** → „Mit Git verbinden“ → GitHub-Projekt `roelzer/W-rmenetz-Dorf` wählen.
3. Einstellungen:
   - Projektname: endgültig wählen (wird Teil der Adresse `<name>.pages.dev`; eine neue Adresse = leerer Spielstand bei den Spielern)
   - Production branch: `main`
   - Framework preset: None
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Umgebungsvariable: `NODE_VERSION` = `22` (steht auch in `.node-version`)
   - Preview deployments: für alle anderen Branches an
4. Optional später: eigene Domain unter „Benutzerdefinierte Domains“ – vor dem ersten Testlauf mit Mitspielern entscheiden.

## Ablauf danach
- Projektleiter baut auf dem Arbeitsbranch → Cloudflare legt einen Vorschau-Link an → dort testen.
- Nach Prüfung (Schranke, Reviewer) kommt der Stand auf `main` → Cloudflare baut automatisch → Spieler sehen beim nächsten Öffnen „Neue Version ist da – Neu laden“.

## Spielstand
- Liegt im Browser des Spielers (Schlüssel `waermedorf-spielstand-v1`, nie umbenennen); Updates ändern ihn nicht, alte Stände werden beim Laden umgestellt.
- iPhone: zum Home-Bildschirm hinzufügen, sonst kann Safari Daten nach längerer Nichtnutzung löschen.
- Einstellungen → „Spielstand sichern/laden“ als Rettung bei Handywechsel.
- Sammelt das Spiel später Daten (Ranglisten, Konten, Auswertung): vorher Sicherheits- und Datenschutzprüfung (Besetzung Kunde).
