# Testnachweis

Automatisch von der Test-Schranke geschrieben (Tabelle „Läufe der Test-Schranke“ unten; neue Zeilen kommen ans Dateiende).

## NR12 Messung

Werkzeug: `werkzeuge/messe-bildrate.cjs` (A90, Zielwerte Z1–Z10 aus `docs/bauplaene/NR12-fluessig.md`, Abschnitt 6). Ablauf: `npm run build`, `npx vite preview --port 4317`, dann `node werkzeuge/messe-bildrate.cjs` (Vorher-Lauf: `--vorher-speichern --nur-bericht`). Nicht Teil von `npm test`; Laufzeit etwa 4–5 Minuten.

**Messaufbau:** Playwright-Chromium kopflos, 844×390, Touch, Faktor 3, Service Worker gesperrt; Laptop-Fall 1920×1000, Faktor 2, ohne Touch. Großer Spielstand vom Werkzeug erzeugt (229 Objekte, 164 Leitungen d40 auf allen freien Straßenfeldern, 42 Häuser mit passender Station, 6× Gaskessel Stufe 3, Namensfrage erledigt). Zählfälle (Z1–Z3, Z6, Z10) zählen alle Methoden von `CanvasRenderingContext2D` und `OffscreenCanvasRenderingContext2D`; Zeitfälle (Z4, Z5, Z8, Z9) laufen ohne Zählung (die Zählung kostet selbst Zeit) in 5 frischen Seiten, die Werte werden zusammengelegt. JS/Bild = `FireAnimationFrame` > 0,3 ms auf dem Hauptthread (CDP-Ablaufverfolgung). Z10 läuft mit „Weniger Bewegung“, weil dort ohne Eingabe kein Pixel wechselt (Leerprobe) – sonst würde jede Animation den Tipp-Vergleich grün machen.

**Grenzen der Messung:** Der Messrechner hat keine Grafikkarte (Software-Rasterung) – absolute Bildraten sind schlechter als auf einem Handy; übertragbar sind Befehle je Bild, JS-Zeit, Pixelzahl und vorher/nachher. **WebKit (Safari) nicht geprüft:** startet auf dem Messrechner nicht (Systembibliotheken fehlen: libgtk-4, libgraphene, libevent, gstreamer-gl). Messrauschen: Zwischen zwei Läufen desselben Stands schwankten einzelne p95-Werte mit 3 Seiten je Fall um bis zu 35 % (JS 10,2 ↔ 13,8 ms; Bildabstand 66,7 ↔ 83,3 ms, weil die Abstände in 16,7-ms-Stufen liegen); mit 5 Seiten lagen zwei Folgeläufe innerhalb der 10 %, einer knapp (13,2 bei Grenze 13,3 ms).

### Vorher – Basis-Commit bc612e8 (2026-11-05, gespeichert in `werkzeuge/nr12-vorher.json`)

`node werkzeuge/messe-bildrate.cjs --vorher-speichern --nur-bericht` → Exit 0

| Fall | Fenster × s | Bildaufrufe | Bildabstand p50 / p95 ms | > 17,5 / > 34 ms % | gezeichnet/s | Befehle/Bild alle (Auswahl Abschn. 1) | JS/Bild p50 / p95 ms | Übergabe p50 ms | Long Tasks |
|---|---|---|---|---|---|---|---|---|---|
| 1x Ruhe normal (Zählung) | 1 × 4,1 | 71 | 50 / 83,4 | 100 / 94 | 17,2 | 29495 (17006) | – / – | – | 37 |
| 1x Ruhe Sparmodus (Zählung) | 1 × 4 | 84 | 50 / 66,6 | 100 / 82 | 20,5 | 29495 (17006) | – / – | – | 14 |
| 1x Ruhe Weniger Bewegung (Zählung) | 1 × 4 | 82 | 50 / 66,6 | 100 / 84 | 20,1 | 29493 (17005) | – / – | – | 18 |
| 1x Ruhe | 5 × 4 | 376 | 50 / 83,3 | 100 / 91 | – | – | 7 / 12,4 | 41,3 | 178 |
| 1x Verschieben | 5 × 3,2 | 315 | 50 / 66,7 | 100 / 84 | – | – | 6,4 / 11,9 | 40,5 | 119 |
| 1x Zoomen+Drehen | 5 × 3,2 | 461 | 33,3 / 50,1 | 76 / 17 | – | – | 5,3 / 12,1 | 22,4 | 29 |
| 4x Ruhe | 5 × 4,1 | 86 | 233,4 / 300 | 100 / 100 | – | – | 31,6 / 51,1 | 196,8 | 85 |
| 4x Verschieben | 5 × 4 | 84 | 233,4 / 300 | 100 / 100 | – | – | 31,6 / 47,1 | 197,4 | 81 |
| 4x Zoomen+Drehen | 5 × 3,7 | 89 | 200 / 299,9 | 100 / 100 | – | – | 28,1 / 45,5 | 166 | 90 |

Leinwand: Handy 1688×780 · Laptop 3840×2000 · Sparmodus 1688×780. Vorspann: 41 gezeichnete Bilder unter dem Vorspann; laufende Animationen nach 1,16 s: vs-blatt, vs-dampf, vs-drehen, vs-fluss, vs-laden, vs-wippen, vs-wolke.

### Prüflauf auf demselben Stand gegen die gespeicherten Vorher-Werte

`node werkzeuge/messe-bildrate.cjs` → Exit 1 (erwartet: die absoluten Ziele sind vor dem Umbau nicht erfüllt; die Relativziele Z8/Z9 sind gegen sich selbst erfüllt)

| Ziel | Fall | Grenze | gemessen | Ergebnis |
|---|---|---|---|---|
| Z1 | Ruhe, Sparmodus, 1× | ≤ 3 gezeichnete Bilder/s | 17,1 gezeichnete Bilder/s | NICHT ERFÜLLT |
| Z2 | Ruhe, Weniger Bewegung, 1× | ≤ 5 gezeichnete Bilder/s | 16 gezeichnete Bilder/s | NICHT ERFÜLLT |
| Z3 | Ruhe, normal, 1× | ≤ 31 gezeichnete Bilder/s | 19 gezeichnete Bilder/s | erfüllt (nur, weil der Messrechner ohne Grafikkarte keine 60 schafft) |
| Z3 | Ruhe, normal, 1× | ≤ 9000 Befehle je gezeichnetem Bild | 29495 Befehle je gezeichnetem Bild | NICHT ERFÜLLT |
| Z4 | Ruhe, normal, 4× | ≤ 32 ms JS je Bild p95 | 46,8 ms JS je Bild p95 | NICHT ERFÜLLT |
| Z5 | Verschieben, normal, 4× | ≤ 36 ms JS je Bild p95 | 41,8 ms JS je Bild p95 | NICHT ERFÜLLT |
| Z6 | Vorspann, 1× | ≤ 0 weitere Bilder unter dem Vorspann | 49 weitere Bilder unter dem Vorspann | NICHT ERFÜLLT |
| Z6 | Vorspann, 1×, 1063 ms nach Start | ≤ 2 laufende Animationen, nur vs-laden/vs-plopp | 8: vs-blatt, vs-dampf, vs-drehen, vs-fluss, vs-laden, vs-plopp, vs-wippen, vs-wolke | NICHT ERFÜLLT |
| Z7 | Leinwand 844×390 @3 | ≤ 1500000 Pixel | 1316640 Pixel | erfüllt |
| Z7 | Leinwand 1920×1000 @2 | ≤ 2000000 Pixel | 7680000 Pixel | NICHT ERFÜLLT |
| Z7 | Leinwand Sparmodus 844×390 @3 | ≤ 550000 Pixel | 1316640 Pixel | NICHT ERFÜLLT |
| Z8 | Zoomen+Drehen, 1× (vorher 12,1) | ≤ 13,3 ms JS je Bild p95 | 13,2 ms JS je Bild p95 | erfüllt |
| Z8 | Zoomen+Drehen, 1× (vorher 50,1) | ≤ 55,1 ms Bildabstand p95 | 50,1 ms Bildabstand p95 | erfüllt |
| Z8 | Zoomen+Drehen, 4× (vorher 45,5) | ≤ 50,1 ms JS je Bild p95 | 45,3 ms JS je Bild p95 | erfüllt |
| Z8 | Zoomen+Drehen, 4× (vorher 299,9) | ≤ 329,9 ms Bildabstand p95 | 283,3 ms Bildabstand p95 | erfüllt |
| Z9 | Ruhe, 1× (vorher 83,3) | ≤ 91,6 ms Bildabstand p95 | 83,2 ms Bildabstand p95 | erfüllt |
| Z9 | Verschieben, 1× (vorher 66,7) | ≤ 73,4 ms Bildabstand p95 | 66,7 ms Bildabstand p95 | erfüllt |
| Z10 | Gebäude antippen (422\|225), Weniger Bewegung, 1× | Stichprobe 40×40 ändert sich in 2 Bildaufrufen | 6374 von 6400 Pixeln anders, Blatt „Einfamilienhaus“ (ohne Tipp: 0 anders) | erfüllt |

Ein zweiter Prüflauf ergab bei Z8/Z9 ebenfalls „erfüllt“ (JS 1× 10,2 ms, 4× 45,5 ms; Bildabstand 50 / 283,4 / 66,7 / 66,7 ms).

**Entscheidungen Projektleiter 2026-11-05 (docs/ENTSCHEIDUNGEN.md), im Werkzeug umgesetzt:** Z1 ≤ 5 gezeichnete Bilder/s (Regel 7 zeigt Information auch im Sparmodus mit 4/s). Z3 prüft die 11 Zeichenbefehle wie in Abschnitt 1 (≤ 9 000); die Zahl aller Methoden wird nur berichtet. Z8/Z9: Bildabstand p95 ≤ vorher × 1,10 + 16,7 ms (ein Bildintervall), JS p95 weiter ≤ vorher × 1,10; 5 Seiten je Zeitfall. Die Tabelle oben ist der Lauf vor diesen Entscheidungen.

**Prüflauf mit den Entscheidungen, gegen die gespeicherten Vorher-Werte** (2026-11-05, nach Review-Nachbesserung; `node werkzeuge/messe-bildrate.cjs` → Exit 1, 9 von 18 Prüfungen nicht erfüllt, erwartet): Z1 19,1/s (≤ 5) · Z2 19,4/s · Z3 18,3/s erfüllt, 17 006 Zeichenbefehle (≤ 9 000) nicht erfüllt · Z4 51,4 ms · Z5 45,8 ms · Z6 41 weitere Bilder, 7 Animationen (#vorspann beim Messen vorhanden) · Z7 Handy erfüllt, Laptop/Sparmodus nicht · **Z8** JS 1× 11,5 (≤ 13,3), Bildabstand 1× 50 (≤ 71,8), JS 4× 46,8 (≤ 50,1), Bildabstand 4× 300 (≤ 346,6) – erfüllt · **Z9** Ruhe 66,7 (≤ 108,3), Verschieben 66,7 (≤ 90,1) – erfüllt · Z10 erfüllt (6 374 von 6 400 Pixeln anders, Blatt „Einfamilienhaus“, ohne Tipp 0). Strengere Bedingungen seit der Nachbesserung: Z10 gilt nur noch als erfüllt, wenn zusätzlich die Leerprobe ohne Tipp 0 Pixel Änderung zeigt und vor dem Tipp kein Blatt offen war (sonst „Leerprobe unruhig“ / „Blatt schon offen“); beide Z6-Prüfungen gelten nur, wenn #vorspann 1 s nach dem Start im Dokument war (sonst „kein #vorspann beim Messen“).

**Auffälligkeit für die Folgepakete:** Im großen Stand sind alle 164 Leitungen überlastet und kein Kunde warm (d40 trägt die 42 Häuser nicht) – Überlast-Blinken läuft dauernd (vom Projektleiter so angenommen).

## Läufe der Test-Schranke

| Zeit | Stand | Rolle | Ergebnis | bestanden | Fehler | Freigabe |
|---|---|---|---|---|---|---|
| 2026-11-04 15:16 | 2df3314 | solo | 🔴 | 46 | 2 | – |
| 2026-11-04 15:16 | 2df3314 | projektleiter | 🔴 | 46 | 4 | – |
| 2026-11-04 15:26 | f619a2b | solo | 🟢 | 92 | 0 | – |
| 2026-11-04 15:33 | 203a2ca | solo | 🔴 | 101 | 1 | – |
| 2026-11-04 15:33 | 203a2ca | solo | 🟢 | 101 | 0 | – |
| 2026-11-04 15:35 | 203a2ca | solo | 🟢 | 101 | 0 | – |
| 2026-11-04 15:38 | 563d698 | solo | 🔴 | 112 | 1 | – |
| 2026-11-04 15:38 | dd9285f | solo | 🔴 | 112 | 1 | – |
| 2026-11-04 16:33 | cd5b0fc | solo | 🟢 | 139 | 0 | – |
| 2026-11-04 20:41 | 61821f8 | projektleiter | 🔴 | 163 | 1 | – |
| 2026-11-04 20:42 | 46b0041 | projektleiter | 🟢 | 169 | 0 | – |
| 2026-11-04 20:42 | 46b0041 | entwickler | 🔴 | 169 | 5 | – |
| 2026-11-04 20:49 | 3dc6b6e | projektleiter | 🟢 | 172 | 0 | – |
| 2026-11-05 06:32 | 22ed36f | projektleiter | 🟢 | 173 | 0 | – |
| 2026-11-05 06:37 | c9b79eb | projektleiter | 🟢 | 173 | 0 | – |
| 2026-11-05 06:48 | 9ec0b04 | projektleiter | 🟢 | 173 | 0 | – |
| 2026-11-05 06:49 | f4b4030 | projektleiter | 🟢 | 173 | 0 | – |
| 2026-11-05 06:54 | 9c45f3f | projektleiter | 🟢 | 176 | 0 | – |
| 2026-11-05 07:06 | 87c8e65 | projektleiter | 🟢 | 181 | 0 | – |
| 2026-11-05 07:08 | 2703d1f | projektleiter | 🟢 | 182 | 0 | – |
| 2026-11-05 07:34 | 8b122c3 | projektleiter | 🟢 | 183 | 0 | – |
| 2026-11-05 07:46 | 82d7102 | projektleiter | 🟢 | 191 | 0 | – |
| 2026-11-05 07:51 | 826b092 | projektleiter | 🔴 | 193 | 1 | – |
| 2026-11-05 07:51 | a2beee5 | projektleiter | 🔴 | 193 | 1 | – |
| 2026-11-05 07:52 | a2beee5 | projektleiter | 🟢 | 193 | 0 | – |
| 2026-11-05 07:55 | d8e8d11 | projektleiter | 🟢 | 193 | 0 | – |
| 2026-11-05 08:04 | 990ca46 | projektleiter | 🟢 | 194 | 0 | – |
| 2026-11-05 08:07 | c1aa9a9 | projektleiter | 🔴 | 194 | 1 | – |
| 2026-11-05 08:08 | c1aa9a9 | projektleiter | 🔴 | 194 | 1 | – |
| 2026-11-05 08:08 | c1aa9a9 | projektleiter | 🟢 | 195 | 0 | – |
| 2026-11-05 08:12 | 6b2d22d | projektleiter | 🟢 | 197 | 0 | – |
| 2026-11-05 08:14 | 6be2922 | projektleiter | 🟢 | 198 | 0 | – |
| 2026-11-05 08:27 | 2690c6f | projektleiter | 🟢 | 203 | 0 | – |
| 2026-11-05 08:32 | 850204c | projektleiter | 🟢 | 204 | 0 | – |
| 2026-11-05 09:00 | 765ebad | projektleiter | 🟢 | 205 | 0 | – |
| 2026-11-05 09:03 | cbba258 | projektleiter | 🟢 | 206 | 0 | – |
| 2026-11-05 09:08 | 99ec7ec | projektleiter | 🟢 | 209 | 0 | – |
| 2026-11-05 09:16 | 3723289 | projektleiter | 🔴 | ? | 2 | – |
| 2026-11-05 09:19 | 3723289 | projektleiter | 🟢 | 212 | 0 | – |
| 2026-11-05 09:29 | cbfd8d1 | entwickler | 🔴 | 218 | 7 | – |
| 2026-11-05 09:29 | cbfd8d1 | projektleiter | 🟢 | 218 | 0 | – |
| 2026-11-05 09:29 | cbfd8d1 | solo | 🟢 | 218 | 0 | – |
| 2026-11-05 09:33 | d1c3ffb | projektleiter | 🟢 | 219 | 0 | – |
| 2026-11-05 09:38 | 1d11c4b | projektleiter | 🟢 | 225 | 0 | – |
| 2026-11-05 09:41 | 2ed41e8 | projektleiter | 🟢 | 229 | 0 | – |
| 2026-11-05 09:43 | 07c97bf | projektleiter | 🟢 | 231 | 0 | – |
| 2026-11-05 09:45 | fbc4682 | entwickler | 🔴 | 231 | 4 | – |
| 2026-11-05 09:45 | fbc4682 | solo | 🟢 | 231 | 0 | – |
| 2026-11-05 09:47 | fbc4682 | projektleiter | 🔴 | ? | 2 | – |
| 2026-11-05 09:48 | fbc4682 | projektleiter | 🟢 | 233 | 0 | – |
| 2026-11-05 09:55 | 11d06d0 | projektleiter | 🟢 | 237 | 0 | – |
| 2026-11-05 10:10 | c6894fc | projektleiter | 🔴 | 245 | 1 | – |
| 2026-11-05 10:18 | c6894fc | projektleiter | 🟢 | 248 | 0 | – |
| 2026-11-05 10:26 | c610de4 | projektleiter | 🟢 | 250 | 0 | – |
| 2026-11-05 10:28 | 6c3cbc0 | projektleiter | 🟢 | 250 | 0 | – |
| 2026-11-05 10:30 | 6c3cbc0 | projektleiter | 🟢 | 252 | 0 | – |
| 2026-11-05 10:35 | 46abf89 | projektleiter | 🟢 | 253 | 0 | – |
| 2026-11-05 10:38 | 941a5e8 | projektleiter | 🔴 | 254 | 1 | – |
| 2026-11-05 10:38 | 941a5e8 | projektleiter | 🟢 | 254 | 0 | – |
| 2026-11-05 10:46 | a8821c6 | projektleiter | 🟢 | 260 | 0 | – |
| 2026-11-05 10:51 | 9cea779 | projektleiter | 🟢 | 260 | 0 | – |
| 2026-11-05 10:57 | 2ebf1dc | projektleiter | 🟢 | 265 | 0 | – |
| 2026-11-05 10:59 | bcf1c76 | projektleiter | 🟢 | 268 | 0 | – |
| 2026-11-05 11:00 | dcb0c85 | projektleiter | 🟢 | 268 | 0 | – |
| 2026-11-05 11:01 | 34c6ace | projektleiter | 🟢 | 268 | 0 | – |
| 2026-11-05 11:14 | 85b4ca7 | projektleiter | 🟢 | 269 | 0 | – |
| 2026-11-05 11:15 | ded00d6 | projektleiter | 🟢 | 270 | 0 | – |
| 2026-11-05 11:16 | 3349c96 | projektleiter | 🟢 | 285 | 0 | – |
| 2026-11-05 11:19 | 267212b | projektleiter | 🟢 | 285 | 0 | – |
| 2026-11-05 11:26 | 6b6ea56 | projektleiter | 🟢 | 291 | 0 | – |
| 2026-11-05 11:28 | e025631 | projektleiter | 🟢 | 291 | 0 | – |
| 2026-11-05 11:29 | e79ae5f | projektleiter | 🟢 | 293 | 0 | – |
| 2026-11-05 11:30 | 5b3e38b | projektleiter | 🟢 | 294 | 0 | – |
| 2026-11-05 11:32 | b1fa459 | projektleiter | 🟢 | 294 | 0 | – |
| 2026-11-05 11:34 | 47c60b5 | projektleiter | 🟢 | 295 | 0 | – |
| 2026-11-05 11:48 | bf75230 | projektleiter | 🟢 | 296 | 0 | – |
| 2026-11-05 12:23 | 9e3d8a7 | projektleiter | 🟢 | 296 | 0 | – |
| 2026-11-05 12:29 | d522ef7 | tester | 🔴 | 294 | 1 | – |
| 2026-11-05 12:31 | 11e648d | projektleiter | 🔴 | 294 | 1 | – |
| 2026-11-05 12:33 | 6e96369 | projektleiter | 🔴 | 294 | 1 | 2026-11-05 / A88-V1 / testzahl / Kritiker (Modus freigabe) 🟢: F2 (Simon) schafft |
| 2026-11-05 12:33 | 39afb7e | projektleiter | 🟢 | 294 | 0 | 2026-11-05 / A88-V1 / testzahl / Kritiker (Modus freigabe) 🟢: F2 (Simon) schafft |
| 2026-11-05 12:48 | c97b453 | projektleiter | 🟢 | 334 | 0 | – |
| 2026-11-05 13:34 | 8995c0f | projektleiter | 🟢 | 537 | 0 | – |
| 2026-11-05 13:45 | 610b232 | projektleiter | 🔴 | 542 | 1 | – |
| 2026-11-05 13:45 | 610b232 | projektleiter | 🟢 | 542 | 0 | – |
| 2026-11-05 14:03 | 91c9ba2 | projektleiter | 🟢 | 544 | 0 | – |
| 2026-11-05 14:06 | 3cb5345 | projektleiter | 🟢 | 544 | 0 | – |
| 2026-11-05 14:12 | 66b1be3 | projektleiter | 🟢 | 559 | 0 | – |
| 2026-11-05 14:13 | f441cb6 | entwickler | 🔴 | 559 | 5 | – |
| 2026-11-05 14:19 | e173345 | projektleiter | 🟢 | 657 | 0 | – |
| 2026-11-05 14:24 | bc4d3d7 | projektleiter | 🟢 | 663 | 0 | – |
| 2026-11-05 14:29 | bb61920 | projektleiter | 🟢 | 665 | 0 | – |
| 2026-11-05 14:30 | ec96d69 | projektleiter | 🟢 | 669 | 0 | – |
| 2026-11-05 14:36 | cfe7454 | projektleiter | 🟢 | 669 | 0 | – |
| 2026-11-05 14:42 | a5d034a | projektleiter | 🟢 | 708 | 0 | – |
| 2026-11-05 14:53 | 44c8c6b | projektleiter | 🟢 | 759 | 0 | – |
| 2026-11-05 14:59 | 06c2f60 | projektleiter | 🟢 | 759 | 0 | – |
| 2026-11-05 15:10 | 4fee92a | projektleiter | 🟢 | 782 | 0 | – |
| 2026-11-05 15:28 | c584d10 | projektleiter | 🟢 | 782 | 0 | – |
| 2026-11-05 15:42 | 5bf53d0 | projektleiter | 🟢 | 794 | 0 | – |
| 2026-11-05 16:56 | e2631b6 | projektleiter | 🟢 | 798 | 0 | – |
| 2026-11-05 16:59 | 639bbb9 | projektleiter | 🟢 | 824 | 0 | – |
| 2026-11-05 17:26 | dc0c085 | projektleiter | 🟢 | 843 | 0 | – |
| 2026-11-05 18:14 | d214666 | projektleiter | 🟢 | 886 | 0 | – |
| 2026-11-05 18:36 | 0560871 | projektleiter | 🟢 | 895 | 0 | – |
| 2026-11-05 19:09 | 078d908 | projektleiter | 🟢 | 914 | 0 | – |
| 2026-11-05 19:10 | 789e7b7 | projektleiter | 🔴 | 963 | 1 | – |
| 2026-11-05 19:11 | e0ce48b | projektleiter | 🟢 | 963 | 0 | – |
| 2026-11-05 19:24 | 9d59132 | projektleiter | 🟢 | 974 | 0 | – |
| 2026-11-05 20:35 | a675f02 | projektleiter | 🟢 | 1001 | 0 | – |
| 2026-11-05 21:03 | 47de547 | projektleiter | 🟢 | 1005 | 0 | – |
| 2026-11-06 06:57 | 20a3fc5 | projektleiter | 🟢 | 1049 | 0 | – |
| 2026-11-06 07:08 | 57ef29a | projektleiter | 🔴 | 1050 | 1 | – |
| 2026-11-06 07:08 | 57ef29a | projektleiter | 🟢 | 1051 | 0 | – |
| 2026-11-06 07:26 | a62b36b | projektleiter | 🟢 | 1054 | 0 | – |
| 2026-11-06 07:49 | 91bbc70 | projektleiter | 🟢 | 1057 | 0 | – |
| 2026-11-06 08:30 | 621be38 | projektleiter | 🔴 | ? | 8 | – |
| 2026-11-06 08:45 | 6fa5925 | projektleiter | 🔴 | ? | 2 | – |
| 2026-11-06 09:21 | 01a2968 | projektleiter | 🟢 | 1146 | 0 | – |
| 2026-11-06 10:01 | bd4a179 | projektleiter | 🔴 | ? | 3 | – |
