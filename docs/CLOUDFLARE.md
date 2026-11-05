# Heatville über Cloudflare Pages veröffentlichen (A83)

## Einmal einrichten (nur Simon)
1. Kostenloses Konto auf cloudflare.com anlegen.
2. „Workers & Pages“ → „Erstellen“ → Reiter **Pages** → „Mit Git verbinden“ → GitHub-Projekt `roelzer/W-rmenetz-Dorf` wählen.
3. Einstellungen:
   - Projektname: `heatville` (Spielname seit A85; wird Teil der Adresse `<name>.pages.dev`; eine neue Adresse = leerer Spielstand bei den Spielern)
   - Production branch: `main`
   - Framework preset: None
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Umgebungsvariable: `NODE_VERSION` = `22` (steht auch in `.node-version`)
   - Preview deployments: für alle anderen Branches an
4. Optional später: eigene Domain unter „Benutzerdefinierte Domains“ – vor dem ersten Testlauf mit Mitspielern entscheiden.

## Ablauf danach
- Projektleiter baut auf dem Arbeitsbranch → Cloudflare legt einen Vorschau-Link an → dort testen.
- Nach Prüfung (Schranke, Reviewer) kommt der Stand auf `main` → Cloudflare baut automatisch → wer das Spiel neu öffnet, hat meist sofort die neue Version; wer es gerade offen hat, sieht „Neue Version von Heatville ist da – Neu laden“. Der Spielstand bleibt in beiden Fällen.

## Spielstand
- Liegt im Browser des Spielers (Schlüssel `waermedorf-spielstand-v1`, nie umbenennen); Updates ändern ihn nicht, alte Stände werden beim Laden umgestellt.
- iPhone: zum Home-Bildschirm hinzufügen, sonst kann Safari Daten nach längerer Nichtnutzung löschen.
- Einstellungen → „Spielstand sichern/laden“ als Rettung bei Handywechsel.
- Sammelt das Spiel später Daten (Ranglisten, Konten, Auswertung): vorher Sicherheits- und Datenschutzprüfung (Besetzung Kunde).

## Stand 2026-11-05 (für eine Sitzung mit Cloudflare-Plugin)
- Simon hat versehentlich einen **Worker** `w-rmenetz-dorf` angelegt (Repo verbunden, Deploy command `npx wrangler deploy`). Der soll weg.
- Ziel: **Pages-Projekt `heatville`** aus Repo `roelzer/W-rmenetz-Dorf`, Production branch `main`, Build `npm run build`, Output `dist`, Umgebungsvariable `NODE_VERSION=22`, Preview-Deployments an → Adresse `heatville.pages.dev`.
- Worker löschen und Projekt anlegen nur nach ausdrücklicher Bestätigung durch Simon. Danach ersten Build prüfen (Protokoll, Seite lädt, Service Worker, `_headers`).
