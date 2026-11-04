# Veröffentlichen mit Cloudflare Pages

**Einstellungen (Pages → Projekt → Build):**
- Framework: keines (Vite)
- Build-Befehl: `npm run build`
- Ausgabeordner: `dist`
- Node-Version: 22 (Umgebungsvariable `NODE_VERSION=22`)
- Branch: `claude/youthful-feynman-jaegcj` (oder nach dem Zusammenführen `main`)

**Hinweise**
- Das Spiel ist eine installierbare Web-App (PWA): auf dem Handy im Browser „Zum Startbildschirm“, danach läuft es auch offline.
- Der Spielstand liegt **im Browser des jeweiligen Geräts** (localStorage). Handy und Laptop haben deshalb getrennte Spielstände; es gibt kein Konto und keine Synchronisierung. Wird der Browser-Speicher gelöscht, ist der Stand weg.
- `public/_headers` sorgt dafür, dass Cloudflare `index.html` und den Service Worker nicht zwischenspeichert – neue Versionen kommen so beim nächsten Öffnen an.
- Nur Querformat; am Handy erscheint im Hochformat ein Dreh-Hinweis.
