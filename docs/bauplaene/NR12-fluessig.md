# Bauplan NR12 „Weniger Rechenlast / flüssiger“ → **A90** (Lastenheft-Eintrag NR12a)

Stand 2026-11-05, Architekt, **Fassung 2 nach Kritikerprüfung** (`docs/pruefberichte/20261105-135143-kritiker-a32a3e06ad022d458.md`, Befunde B1–B7 umgesetzt; Entscheidungen Projektleiter siehe Abschnitt 8). Grundlage: Messung auf Stand `dc6dc23` (Darstellung seitdem unverändert).
Architekturtests: `tests/architektur/nr12-zeichentakt.test.ts` (R1–R9, liegen im Repo und greifen je Paket von selbst).

**A90 (Muss):** Das Spiel zeichnet nur, wenn sich etwas ändert oder eine Animation läuft; die Karte hat eine Pixel-Obergrenze; der Boden der Karte wird zwischengespeichert (Stufe 1), Gebäude erst nach Messung auf dem Handy (Stufe 2, eigener Auftrag); der Startbildschirm ist ganz ruhig (Logo + Ladebalken) und das Spiel darunter ruht; Einstellung „Sparmodus“ (30 Bilder/s, keine Umgebungsanimation, weniger Effekte, geringere Auflösung). Abnahme: Messwerkzeug `werkzeuge/messe-bildrate.cjs` hält Z1–Z10 (Abschnitt 6) ein; Tests mit „NR12“ im Namen grün; auf Simons iPhone und dem Android-Handy des Kollegen zeigt die Messanzeige (`?messen=1`) in Ruhe, beim Verschieben und beim Zwei-Finger-Zoomen/Drehen einen Bildabstand p50 ≤ 17,5 ms und p95 ≤ 25 ms, im Sparmodus stabil ≥ 30 Bilder/s.

---

## 1. Messwerte vorher

Aufbau: Playwright-Chromium (kopflos), 844×390, Touch, `deviceScaleFactor 3` (Leinwand wird heute auf Faktor 2 gedeckelt → 1688×780 px), Vorschau-Build. „neu“ = frisches Spiel; „groß“ = 229 Objekte, 164 Leitungen (alle Straßenfelder), 42 Häuser mit Station, 95 Leitungen mit Wärmefluss. Werte je Phase über 3–4 s. **JS/Bild** = Dauer des Bild-Rückrufs (FireAnimationFrame), **Übergabe** = Leinwand-Übergabe/Rasterung (Commit), **Befehle** = Canvas-Aufrufe je Bild (gezählt).

**Wichtig zur Einordnung:** Der Messrechner hat keine Grafikkarte (Software-Rasterung). Absolute Bildraten sind deshalb schlechter als auf einem Handy mit GPU. Übertragbar sind: Befehle je Bild, JS-Zeit je Bild, Pixelzahl und die Verhältnisse (vorher/nachher). WebKit (Safari) ließ sich nicht starten (Systembibliotheken fehlen: libgtk-4, libgraphene, libevent, gstreamer-gl) – **nicht geprüft**.

| Fall | Bilder/s | Bildabstand p50 / p95 ms | > 33 ms | JS/Bild p50 / p95 ms | Übergabe p50 ms | Befehle/Bild |
|---|---|---|---|---|---|---|
| 1× neu – Vorspann | 22 | 50 / 67 | 55 % | 6,8 / 17 | 32 | **13 500** (Spiel zeichnet unter dem Vorspann) |
| 1× neu – Ruhe | 25 | 33 / 50 | 40 % | 6,5 / 9,1 | 32 | 14 100 |
| 1× neu – Ruhe, Leinwand Faktor 1 (844×390) | 48 | 17 / 33 | 1 % | 5,9 / 10,2 | 12 | 14 100 |
| 1× groß – Ruhe | 20 | 50 / 67 | 83 % | 6,7 / 10,6 | 40 | 16 900 |
| 1× groß – Verschieben / Zoomen+Drehen | 21 / 33 | 50 / 67 · 33 / 50 | 71 / 14 % | 6,3 / 5,0 | 38 / 19 | 15 500 / 12 200 |
| **Laptop** 1920×1000, Faktor 2 (Leinwand 3840×2000), groß, 1× | **7,8** | 117 / 183 | 100 % | 7,9 / 13,9 | **113** | 18 000 |
| 4× neu – Vorspann | 4,3 | 217 / 733 | 95 % | 28,6 / 59 | 165 | 13 500 |
| 4× neu – Ruhe | 4,6 | 217 / 233 | 100 % | 27,8 / 36,8 | 173 | 14 100 |
| 4× groß – Ruhe | 3,6 | 267 / 350 | 100 % | 37,4 / 59,3 | 224 | 18 000 |
| 4× groß – Verschieben / Zoomen+Drehen | 4,0 / 6,5 | 250 / 333 · 133 / 250 | 100 % | 32,2 / 23,9 | 203 / 103 | 15 500 / 12 200 |
| 6× neu – Ruhe | 3,1 | 333 / 417 | 100 % | 44,5 / 57,4 | 274 | 14 400 |
| 6× groß – Ruhe / Verschieben / Zoomen+Drehen | 2,4 / 2,6 / 4,2 | 417 / 517 · 383 / 467 · 217 / 367 | 100 % | 57 / 52 / 37 (p95 83 / 73 / 88) | 351 / 316 / 170 | 18 100 / 15 500 / 12 200 |

Lange Aufgaben (> 50 ms) bei 4×: 13–22 je 4 s in Ruhe, ~200 je 3 s beim Verschieben/Zoomen.

Befehle je Bild nach Art (1×, neu): lineTo 8 349 · beginPath 3 394 · moveTo 3 058 · fill 3 010 · closePath 2 616 · stroke 1 446 · arc 303 · createRadialGradient 255 · save/restore 153.

**Wegwerf-Versuch (nicht im Repo):** ruhende Bodenebene (Boden, Fluss, Straßen, Wege, Waldrand, Zaun) einmal in eine Zweitleinwand gemalt und je Bild nur kopiert, Gebäude weiter jedes Bild:

| groß, Ruhe | Befehle/Bild | JS/Bild p50 / p95 | Bilder/s |
|---|---|---|---|
| 1× vorher → nachher | 16 900 → **8 600** | 6,7 / 10,6 → 4,1 / 6,6 | 20 → 29 |
| 4× vorher → nachher | 18 000 → 8 900 | 37,4 / 59,3 → 23,3 / 31,5 | 3,6 → 5,4 |

Beim Verschieben brachte der Versuch nichts (Schlüssel enthielt die Verschiebung → jedes Bild neu). Folgerung: Zwischenspeicher mit Rand (P3) und vor allem „nur zeichnen, wenn nötig“ (P1).

## 2. Ursachen nach Gewicht (mit Beleg)

1. **Dauerschleife zeichnet jedes Bild alles neu, auch wenn sich nichts ändert.** `src/main.ts:67-75` ruft in jedem `requestAnimationFrame` `zeichneSzene` ohne Bedingung. Auch „Weniger Bewegung“ zeichnet weiter 60-mal je Sekunde (setzt nur `zeit_s = 0`, `main.ts:71`). Jedes Bild: ~14 000–18 000 Canvas-Befehle (gemessen).
2. **Ruhende Karte wird jedes Bild neu gemalt.** `src/render/szene.ts:56-210`: bis zu 900 Bodenrauten, Straßen in 4 Durchgängen, Wege, 104 Waldbäume mit je 3 Radialverläufen + Schattenverlauf (`maler.ts:327-339`, `maler.ts:196-204`) → ~255 neue Verläufe je Bild. Versuch: halbiert die Befehle.
3. **Zu viele Pixel.** `main.ts:58` deckelt nur auf Faktor 2, ohne Obergrenze der Fläche. Handy 1688×780 = 1,3 MP; Laptop 3840×2000 = **7,7 MP** (Laptop-Messung 7,8 Bilder/s ohne Drosselung). Übergabezeit wächst mit der Fläche (Faktor 1 vs. 2: 12 ms vs. 32 ms). Erklärt Simons „ruckelt sogar auf dem Laptop“.
4. **Startbildschirm: das Spiel läuft darunter mit voller Last.** `main.ts:18` zeigt den Vorspann, `main.ts:75` startet sofort die Zeichenschleife – die Karte ist 2,8 s komplett verdeckt, wird aber mit 13 500 Befehlen je Bild gezeichnet (gemessen in der Phase „Vorspann“). Dazu 6 Animationsarten im Vorspann-SVG (`vorspann.ts:181`, `stil.css:336-342`, 10 Blätter, 4 Wolken, 3 Rotoren, Herzen, Dampf, Fließpunkte). In Chromium kostet das SVG wenig (Paint 24 ms in 3 s); in **WebKit** werden animierte SVG-Kindelemente nicht auf der Grafikkarte verschoben, sondern die Ebene neu gemalt – nicht gemessen, bekannte Falle.
5. **Dauerhafte Umgebungsanimationen erzwingen Neuzeichnen**: Rauch (`gebaeude.ts:144`, `:205`), Wärmepunkte (`szene.ts:418-429`), Interessenten-Puls (`szene.ts:240`), Blasen-Wippen (`gebaeude.ts:217`), Überlast-Blinken (`szene.ts:374`), Wasserglitzern (`szene.ts:83`), Auswahlring (`szene.ts:218`), Rotor (`gebaeude.ts:135`). Solange eine davon sichtbar ist, muss gezeichnet werden – deshalb Takt (P1) **und** Zwischenspeicher (P3) zusammen.

Kleiner (unter 1 % der Zeit, nicht vorrangig): HUD setzt alle 250 ms Texte auch ohne Änderung (`hud.ts:81-101`, in `steuerung.ts:367`), offenes Kontextblatt baut alle 250 ms seinen Inhalt zur Prüfung neu (`kontext.ts:64-66`), Speichern alle 5 s (`main.ts:88`, 19 kB JSON). Keine CSS-Filter auf großen Flächen im Spiel; `#vorspann .schriftzug{filter:drop-shadow(…14px…)}` (`stil.css:325`) trifft kein Element (der Vorspann nutzt `.vs-schriftzug`) – toter Code.


## 3. Maßnahmen nach Nutzen/Aufwand

| # | Maßnahme | Nutzen | Aufwand | Paket |
|---|---|---|---|---|
| M1 | Nur zeichnen, wenn sich Szene/Kamera ändert oder eine Animation läuft; spätestens alle 500 ms ein Sicherheitsbild; Neuzeichnen erzwingen nach Größenänderung, Rückkehr in die App, Leinwand-Verlust | Ruhe ohne Animation: ~2 statt 60 Bilder/s | mittel | P0+P1, Ereignisse P5 |
| M2 | Pixel-Obergrenze (Faktor ≤ 2 und ≤ 1,5 MP, nie unter Faktor 1; Sparmodus Faktor ≤ 1,25); Leinwand nur bei echter Größenänderung neu anlegen | Laptop 7,7 → ≤ 2 MP; Übergabe ~÷2–4 | klein | P1 |
| M3 | Spiel unter dem Vorspann ruht (ein Bild vorbereiten, dann bis zum Ausblenden nichts) | Startbildschirm: 13 500 → 0 Befehle/Bild | klein | P1 |
| M4 | Startbildschirm ganz ruhig (E1 b): Logo einmal einblenden, Ladebalken über `transform`, sonst nichts bewegt; Ausblenden nur über Deckkraft | weniger Unruhe (Simon), WebKit-sicher | klein | P2 |
| M5 | Umgebungsanimation und Effekte höchstens 30 Bilder/s, mit Toleranz (gleichmäßig auch bei 90/120 Hz); Kamera/Eingaben jedes Bild | Hälfte der Bilder bei laufender Animation | klein | P1 |
| M6a | **Bodenebene** (Boden, Fluss ohne Glitzern, Straßen, Wege, Wald, Zaun, Gitter) zwischenspeichern, mit Rand für Verschieben; auch in der Planungsphase `offen`; während Zoomen/Drehen direkt zeichnen | Befehle je Bild 16 900 → ~8 600 (gemessen im Wegwerf-Versuch) | mittel | P3a |
| M6b | Gebäude in die Ebene (Stufe 2) | Befehle → < 3 000 | groß | **P3b, eigener Auftrag nach Messung auf Simons Handy** |
| M8 | Sparmodus (inkl. weniger Effekte) + einmaliger Hinweis nur bei echt langsamem Gerät | schwache Geräte stabil 30 | klein | P1 |
| M9 | Messanzeige `?messen=1` (Bildabstand p50/p95, gezeichnete Bilder/s) für Simons Handy | Abnahme auf echtem Gerät | klein | P1 |
| M10 | Verdrahtung Zwischenspeicher ↔ `main.ts` + Zusammenspieltest „Aktion → nächstes Bild zeigt sie“ | verhindert stilles Zusammenbauen im Merge | klein | P5 |

Zurückgestellt: Baumvorlage als Bild (M7 alt – pro Zoom 4 Vorlagen, wirft bei jeder Zoomänderung alles weg; erst prüfen, wenn Messung auf dem Handy Zoomen/Drehen als Engpass zeigt); Gebäude in der Ebene (P3b); zweite DOM-Leinwand; HUD nur bei Änderung schreiben (< 1 %); WebGL/Pixi.

## 4. Aufbau (Plan-Abschnitt 4)

Grundmuster bleibt: Spielkern ohne Browser, Darstellung als Canvas-Maler. Neu: **ein reiner Taktgeber entscheidet je Bild, ob gezeichnet wird; die Szene legt den zwischengespeicherten Boden auf und zeichnet alles andere direkt darüber.** Alles in `src/render/`, `src/main.ts`, `src/ui/einstellungen.ts`, `src/ui/vorspann.ts`/`stil.css`; **keine Änderung an Kern und `steuerung.ts`** (A88-Dateien).

Abhängigkeitsrichtung: `main.ts → render/takt.ts, render/aufloesung.ts, render/szene-schluessel.ts, render/szene.ts`; `render/szene.ts → render/ebenen.ts, render/szene-schluessel.ts`; `takt.ts`/`aufloesung.ts` rein (kein Browser, kein Spielkern, keine Oberfläche); `ebenen.ts` ohne `document` (Fabrik wird übergeben). Nur `main.ts` erzeugt Browser-Leinwände für die Ebene.

- **AE-NR12-1 Ein Taktgeber.** Bindet: ob ein Bild gezeichnet wird. Verhindert: zweite Schleife oder verstreute „jetzt neu zeichnen“-Merker. Regel: einzige Dauerschleife in `main.ts` (R1); Entscheidung nur über `sollZeichnen` (R6); `takt.ts` rein (R4); genau **ein** Merker `erzwingen` in `main.ts`, der als `TaktEingabe.erzwingen` übergeben und nach dem Zeichnen zurückgesetzt wird.
- **AE-NR12-2 Eine Auflösungsregel.** Bindet: Leinwandgröße. Verhindert: unterschiedliche Pixelfaktoren in Kamera, Leinwand und Ebene. Regel: `devicePixelRatio` nur einmal in `main.ts`, Umrechnung nur `zeichenAufloesung` (R5); Kamera bekommt den wirksamen Faktor; die Ebene liest `k.pixelverhaeltnis`.
- **AE-NR12-3 Schlüssel an einer Stelle.** Bindet: Erkennung „Szene geändert“, „Boden geändert“ und „Animation nötig“. Verhindert: Takt und Zwischenspeicher erkennen Änderungen verschieden → eingefrorene oder veraltete Bilder. Regel: `szenenSchluessel`, `bodenSchluessel`, `animationBedarf` nur in `src/render/szene-schluessel.ts` (R9); Ablauf-Test „gleicher Schlüssel ⇒ gleiche Befehlsfolge“ über echte Spielaktionen (P3a).
- **AE-NR12-4 Bodenebene ist zeitlos.** Bindet: was zwischengespeichert werden darf. Verhindert: eingefrorene Animationen (Glitzern). Regel: `zeichneBoden` liest weder `zeit_s` noch `jetzt_ms` (R8); `ebenen.ts` bekommt die Leinwand-Fabrik übergeben (R7); `main.ts` richtet die Ebene ein und verwirft sie bei Rückkehr/Leinwand-Verlust (R6b, ab P5).
- **AE-NR12-5 Keine Weichzeichner, keine schnellen Dauer-Timer.** Regel: kein `shadowBlur`/`ctx.filter` in `src/render` (R2), kein `setInterval` < 1000 ms (R3); im Vorspann-CSS kein `filter` (Test P2).
- **AE-NR12-6 Zeitgrenzen mit Toleranz.** Bindet: alle Grenzen in `sollZeichnen`. Verhindert: ungleichmäßige 33/50-ms-Folge durch gerundete Bildzeiten (Lektion Gleitkomma-Grenzwerte). Regel: `abstand ≥ grenze − TOLERANZ_MS` mit `TOLERANZ_MS = 8`; Tests mit exakt `1000/60`, abwechselnd 16,6/16,7, 90 Hz und 120 Hz.

**WebKit-Fallen (Safari/iPhone):** (a) CSS-Animationen auf SVG-Kindelementen → mit E1 b gibt es keine mehr (P2). (b) `transform: scale` auf großer Fläche → Vorspann nur per Deckkraft ausblenden (P2). (c) `filter` mit Unschärfe → keiner im Vorspann (P2). (d) Leinwand-Speicher auf iOS begrenzt → Ebene höchstens 2,25-fache Bildschirmfläche (1688×780 → ~3 MP ≈ 12 MB), alte Fläche bei Größenwechsel und Verwerfen freigeben (`width = height = 0`) (P3a). (e) `will-change` nur noch auf dem Ladebalken; `.vs-bewegt` entfällt (A78-Test wird per Tester-Vorarbeit angepasst).

## 5. Pakete (Plan-Abschnitt 5)

| Paket | Dateien | Abhängig von | Parallel möglich mit | Schwierigkeit |
|---|---|---|---|---|
| **P0 Vertrag Schlüssel** (< 30 min) | neu `src/render/szene-schluessel.ts`, `tests/nr12-szene-schluessel.test.ts` | – | P2, P4 | einfach |
| **P1 Takt, Auflösung, Sparmodus, Messanzeige** | neu `src/render/takt.ts`, `src/render/aufloesung.ts`; ändern `src/main.ts`, `src/render/kamera.ts`, `src/render/effekte.ts`, `src/ui/einstellungen.ts`; Tests `tests/nr12-takt.test.ts`, `tests/nr12-aufloesung.test.ts`, `tests/nr12-einstellungen.test.ts` | P0 | P2, P3a, P4 | mittel |
| **P2 Startbildschirm ganz ruhig** | ändern `src/ui/vorspann.ts`, `src/ui/stil.css` (nur Vorspann-Abschnitt, heute Z. 314–355); Test `tests/nr12-vorspann.test.ts` | Tester-Vorarbeit A78 | P0, P1, P3a, P4 | einfach |
| **P3a Bodenebene** | neu `src/render/ebenen.ts`; ändern `src/render/szene.ts`; Test `tests/nr12-ebenen.test.ts`; darf `src/render/szene-schluessel.ts` ergänzen, wenn der Ablauf-Test ein fehlendes Feld zeigt | P0 | P1, P2, P4 | schwer |
| **P4 Messwerkzeug** | neu `werkzeuge/messe-bildrate.cjs`, `werkzeuge/nr12-vorher.json` (vom Werkzeug geschrieben), Abschnitt „NR12 Messung“ in `docs/TESTNACHWEIS.md` | – | alle | mittel |
| **P5 Verdrahtung + Zusammenspieltest** | ändern `src/main.ts` (nur Ebene einrichten + Ereignis-Abos); Test `tests/nr12-zusammenspiel.test.ts` | P1, P3a | P2, P4 | einfach |

**Sofort parallel startbar:** P0, P2 (nach der kleinen Tester-Vorarbeit) und P4 – keine gemeinsamen Dateien. Nach P0: **P1 und P3a gleichzeitig** (keine gemeinsame Datei; P3a liest Kamera-Felder nur, ändert `kamera.ts` nicht). Nach P1 + P3a: P5.
**Kritischer Pfad:** P0 (≤ 30 min) → P3a → P5 (3 von 6 Paketen; P1 läuft neben P3a). `src/main.ts` gehört nacheinander P1, dann P5. Gemeinsame Ressource nur der Vorschau-Port bei P4 (eigener Port 4317).
**Hinweis Paketzahl:** 6 statt höchstens 5 je Meilenstein, weil P5 auf Anordnung des Projektleiters eigenständig ist. Ausweg, falls gewünscht: P2 als eigener Mini-Meilenstein „NR12-Start“ (berührt keine Datei der anderen Pakete).

**Überschneidung mit A88-Arbeit** (`spiel.ts`, `freischaltung.ts`, `ui/katalog.ts`, `ui/kontext.ts`, `steuerung.ts`): keine Datei gemeinsam. Berührungspunkte nur lesend: `Szene` (aus `steuerung.szene()`), `maler.reduziert` (setzt `steuerung.ts:102`), `steuerung.toast()`, `steuerung.effekte`. Ändert eine A88-Nacharbeit `src/render/szene.ts`, kollidiert sie mit P3a → nacheinander mergen.

**Vorarbeit (nicht für Entwickler):**
- **Tester-Vorarbeit vor P2:** Test `A78` in `tests/anpassungen.test.ts:1175–1181` umstellen. Zeile 1178 (`expect(vs).toContain('bewegteEbene(szene)')`) und Zeile 1179 (`.vs-bewegt{…will-change:transform`) entfallen, weil E1 b die bewegte Ebene abschafft; die beiden Zeilen zum Ladebalken (`@keyframes vs-laden{to{transform:scaleX(1)}}`, nicht `width:100%`) bleiben. Testname z. B. „A78: Ladebalken über transform statt Breite (bewegte Ebene entfällt mit A90/E1 b)“. Kann sofort erfolgen, ist vor und nach P2 grün.
- **Architekt-Vorarbeit:** erledigt in dieser Fassung (R6b, R8 auf `zeichneBoden`, R9 neu).

---

## 6. Messbare Abnahme (Zielwerte für `werkzeuge/messe-bildrate.cjs`)

„Gezeichnetes Bild“ = Bild mit mindestens einem Canvas-Befehl auf `#karte` oder der Ebene. Chromium kopflos, 844×390, Touch, Faktor 3, Spielstand „groß“ (vom Werkzeug erzeugt, siehe P4). „vorher“ = Lauf des Werkzeugs auf dem Basis-Commit des Meilensteins (Stand dieser Fassung `91c9ba2`; Darstellung seit `dc6dc23` unverändert), gespeichert in `werkzeuge/nr12-vorher.json`. „Nicht schlechter“ = ≤ vorher × 1,10 (Messrauschen).

| Ziel | Fall | Grenze | heute |
|---|---|---|---|
| Z1 | Ruhe, Sparmodus, 1× | ≤ 3 gezeichnete Bilder/s | ~20 |
| Z2 | Ruhe, „Weniger Bewegung“, 1× | ≤ 5 gezeichnete Bilder/s (Baubalken 4/s erlaubt) | ~20 |
| Z3 | Ruhe, normal, 1× | ≤ 31 gezeichnete Bilder/s **und** ≤ 9 000 Befehle je gezeichnetem Bild (Mittel) – Zwischenziel Stufe 1; ≤ 3 000 erst mit P3b | ~20 / 16 900 |
| Z4 | Ruhe, normal, **4×** | JS je Bild p95 ≤ 32 ms (Herleitung: Wegwerf-Versuch Bodenebene 31,5 ms) | 59 |
| Z5 | Verschieben, normal, 4× | JS je Bild p95 ≤ 36 ms (Wegwerf-Versuch + Auflegen/Rand-Neubau) | 51 |
| Z6 | Vorspann, 1× | nach dem ersten Kartenbild 0 weitere bis zum Ausblenden; 1 s nach Start höchstens 2 verschiedene `animationName` mit `playState === 'running'` (erlaubt: `vs-laden`, `vs-plopp`) | ~55 Bilder; 20+ Animationen |
| Z7 | Leinwandpixel | 844×390 @3: ≤ 1,5 MP; 1920×1000 @2: ≤ 2,0 MP; Sparmodus 844×390 @3: ≤ 0,55 MP | 1,32 / 7,68 / 1,32 |
| Z8 | Zoomen+Drehen (2 Finger), 1× und 4× | JS je Bild p95 **und** Bildabstand p95 nicht schlechter als vorher | 5,0 / 23,9 ms JS |
| Z9 | Ruhe und Verschieben, 1× | Bildabstand p95 nicht schlechter als vorher (begrenzt Übergabe/Rasterung, die die JS-Zeit nicht zeigt) | 50 / 67 ms |
| Z10 | Zusammenspiel | Antippen eines Gebäudes → Leinwand-Pixel (`getImageData` einer Stichprobe um den Tipp) ändern sich innerhalb von 2 Bildaufrufen | – |

Nur berichten: Anteil > 16,7 / > 33 ms, Long Tasks, Übergabe p50.
**Auf dem Gerät (Simon, manuell, `?messen=1`):** Ruhe, Verschieben, Zwei-Finger-Zoomen/Drehen je ~5 s: Bildabstand p50 ≤ 17,5 ms und p95 ≤ 25 ms; Sparmodus stabil ≥ 30 Bilder/s. Ergebnis entscheidet, ob P3b nötig ist.

---

## 7. Baupläne

### P0 Vertrag Schlüssel — einfach (kleine reine Funktionen; jede vergessene Eigenschaft wird später ein veraltetes Bild)
**Dateien:** neu `src/render/szene-schluessel.ts`; Test `tests/nr12-szene-schluessel.test.ts`.
**Nutzt:** `Szene` (`src/render/szene.ts:16`), `Kamera` (`src/render/kamera.ts`), `istLeitung`, `KATALOG`, `groesse` (`core/netz.ts:26`).
**Liefert:**
```ts
export type AnimBedarf = 'keine' | 'langsam' | 'fluessig';
/** Ändert sich genau dann, wenn sich etwas Sichtbares an der Szene ändert (Kamera NICHT). */
export function szenenSchluessel(s: Szene): string;
/** Schlüssel der Bodenebene: alles, was zeichneBoden liest, plus Kamera ohne Verschiebung. */
export function bodenSchluessel(s: Szene, k: Kamera): string;
export function animationBedarf(s: Szene, effekte_aktiv: boolean): AnimBedarf;
```
**`szenenSchluessel` enthält:** je Objekt `id, typ, x, y, stufe, !!bau, geplant, gekuendigt, interessent, anfrage, ohne_station, station, zustand, vorsehung, upgrade, hauspuffer, vollversorgung, aufgestockt, zufriedenheit_pct < 40`, **Plopp aktiv** (`_pop && s.jetzt_ms − _pop < 450`); `innen` (typ, stufe, !!bau); fortlaufende Nummer je `netz`-Objekt (WeakMap; `Spiel.neuBerechnen` erzeugt ein neues Netz); `modus, auswahl_id, verschiebe_id, geist (typ,x,y,kante,ok), stempel, kw_anzeigen`, `spiel?.abschnitt?.phase`, Länge von `strassen`/`fluss`.
**`bodenSchluessel` enthält:** Kamera `tw, winkel_rad, breite, hoehe, pixelverhaeltnis` (nicht `schiebe_x/y`); Inhalt von `strassen` und `fluss` (Koordinaten verkettet – ändert sich bei Besuch/Ortswechsel); je Objekt mit `KATALOG[typ].kategorie === 'haus'`: `x, y, typ, stufe, !!bau` (wegen Hausweg/Garten, `szene.ts:166–190`); `modus !== 'normal'` (Gitter, `szene.ts:204`). Leitungen gehören **nicht** hinein (sonst baut jede neue Leitung in der Phase `offen` den Boden neu).
**Form:** einfache Verkettung mit Trennzeichen (`|`, `,`), kein `JSON.stringify` ganzer Objekte, kein Hash (keine Kollisionsgefahr). Ziel < 0,2 ms bei 230 Objekten.
**`animationBedarf`:** `'fluessig'`, wenn `effekte_aktiv` oder Netz läuft (`genutzt_kw > 0`, Rauch) oder irgendein `last_kw > 0` (Wärmepunkte) oder Interessent ohne Anschluss, Blase, Auswahl, Fluss vorhanden (Glitzern), Platzieren/Verschieben, **Plopp aktiv**, **Brunnen vorhanden** (`gebaeude.ts:98`, läuft immer), **Großwärmepumpe vorhanden** (Rotor `gebaeude.ts:135`, läuft immer), **Gerüst sichtbar** (jedes Objekt mit `bau` oder anderer Anlass, bei dem `zeichneGeruest` gerufen wird – Arbeiterarm `gebaeude.ts:274`), **Großabnehmer mit Rauch** (`gebaeude.ts:205`, unabhängig von `laeuft`); sonst `'langsam'`, wenn `upgrade_auftrag`, Innen-Bau oder Überlast (`kapazitaet_ok === false`, Blinken 4/s); sonst `'keine'`.
**Tests:** `NR12 P0: gleicher Stand ergibt gleichen Schlüssel`; `NR12 P0: jedes Schlüsselfeld ändert den Schlüssel` (Tabelle, eine Zeile je Feld oben, inkl. hauspuffer/vollversorgung/aufgestockt/Plopp); `NR12 P0: neues Netz-Objekt → anderer Schlüssel`; `NR12 P0: jetzt_ms ändert den Schlüssel nicht, außer ein Plopp endet` (449 → 451 ms nach `_pop` ändert ihn); `NR12 P0: Bodenschlüssel – Leitung dazu/Station gekauft → gleich; Haus fertig gebaut, Zoom, Drehung, Besuch, Modus platzieren → anders; Verschiebung → gleich`; `NR12 P0: leeres Dorf ohne Last und ohne Fluss → 'keine'`; `NR12 P0: Upgrade läuft → 'langsam'`; `NR12 P0: Bau läuft (Gerüst) → 'fluessig'`; `NR12 P0: Brunnen / Großwärmepumpe / Plopp / Leitung mit last_kw > 0 → 'fluessig'` (Tabelle).
**Randfälle:** Besuch im Nachbardorf (`spiel: null`, keine Straßen) – Schlüssel muss gehen; leere `strassen`/`fluss` (undefined).
**Rückfragen (Kritiker) → Antwort:** `_pop`, `hauspuffer`, `vollversorgung`, `aufgestockt` → ja, im Schlüssel. Gründe-Liste → oben vollständig. Hash → einfache Verkettung.
**Risiko-Auslöser:** nein (keine Daten von außen, keine Anmeldung, keine neue Schnittstelle).

### P1 Takt, Auflösung, Sparmodus, Messanzeige — mittel (Zustandslogik mit Zeitgrenzen, Einbau in die Hauptschleife)
**Dateien:** neu `src/render/takt.ts`, `src/render/aufloesung.ts`; ändern `src/main.ts` (Z. 56–75 `groesseAnpassen` und Schleife; Vorspann-Abfrage; Messanzeige; Sparhinweis; Einstellungs-Abo), `src/render/kamera.ts` (`schluessel`, `inBewegung` ergänzen), `src/render/effekte.ts` (Feld `sparsam`), `src/ui/einstellungen.ts` (Feld `sparmodus`, Schalter, Abo); Tests `tests/nr12-takt.test.ts`, `tests/nr12-aufloesung.test.ts`, `tests/nr12-einstellungen.test.ts`.
**Nutzt:** `szenenSchluessel`, `animationBedarf`, `AnimBedarf` (P0); `effekte.aktiv()` (`effekte.ts:29`); `maler.reduziert`, `maler.zeit_s`; `steuerung.szene()`, `steuerung.toast()`, `steuerung.effekte`.
**Liefert:**
```ts
// src/render/takt.ts (rein)
export interface TaktZustand { letztes_bild_ms: number; szene: string; kamera: string; gezeichnet: boolean }
export interface TaktEingabe {
  jetzt_ms: number; szene: string; kamera: string; bedarf: AnimBedarf;
  effekte_aktiv: boolean;
  animation: 'an' | 'aus';   // aus = „Weniger Bewegung“ oder Sparmodus
  sparmodus: boolean;        // Deckel 30 Bilder/s für alles
  verdeckt: boolean;         // Vorspann deckt die Karte ab
  erzwingen: boolean;        // nach Größenänderung, Rückkehr in die App, Leinwand-Verlust
}
export const SICHERHEITSBILD_MS = 500, LANGSAM_MS = 250, FLUESSIG_MS = 1000 / 30, TOLERANZ_MS = 8;
export function neuerTakt(): TaktZustand;
export function sollZeichnen(z: TaktZustand, e: TaktEingabe): { zeichnen: boolean; zustand: TaktZustand };
export interface BildProbe { raf_abstand_ms: number; zeichen_ms: number; kamera_bewegt: boolean }
export function sparHinweisNoetig(proben: readonly BildProbe[]): boolean;

// src/render/aufloesung.ts (rein)
export interface Aufloesung { faktor: number; breite_px: number; hoehe_px: number }
export const MAX_FAKTOR = 2, MAX_PIXEL = 1_500_000, SPAR_FAKTOR = 1.25;
export function zeichenAufloesung(css_breite: number, css_hoehe: number, dpr: number, spar: boolean): Aufloesung;

// src/render/kamera.ts (ergänzen)
schluessel(): string;   // breite, hoehe, pixelverhaeltnis, zoom und winkel_rad auf 1e-4, schiebe_x/y auf 0,01 px gerundet
inBewegung(): boolean;  // dreh_rest_rad ≠ 0

// src/render/effekte.ts (ergänzen)
sparsam: boolean;       // Standard false; true: 6 statt 24 Funken, höchstens 2 Münzen

// src/ui/einstellungen.ts (ergänzen)
export interface Einstellungen { weniger_bewegung: boolean; kw_anzeigen: boolean; sparmodus: boolean } // fehlt → false
export function beiEinstellungsAenderung(f: (e: Einstellungen) => void): void; // einstellungenSchreiben ruft alle Abonnenten
```
**Regeln für `sollZeichnen`** (Reihenfolge; „Abstand“ = `jetzt_ms − letztes_bild_ms`, jede Grenze G gilt als erreicht bei Abstand ≥ G − `TOLERANZ_MS`):
1. `verdeckt` → zeichnen nur, wenn noch nie gezeichnet oder `erzwingen`; sonst nicht.
2. `erzwingen` → zeichnen.
3. `sparmodus` und `FLUESSIG_MS` nicht erreicht → nicht zeichnen (Änderung bleibt vorgemerkt, weil `szene`/`kamera` erst beim Zeichnen in den Zustand übernommen werden).
4. Kamera- oder Szenenschlüssel anders als im Zustand → zeichnen (ohne Deckel, also 60/90/120 Hz).
5. `effekte_aktiv` → zeichnen bei `FLUESSIG_MS` (auch bei `animation 'aus'` und im Sparmodus – Effekte sind Rückmeldung, nie 4/s).
6. `animation 'an'` und `bedarf 'fluessig'` → zeichnen bei `FLUESSIG_MS`.
7. `bedarf ≠ 'keine'` → zeichnen bei `LANGSAM_MS` (auch bei `animation 'aus'`: Balken sind Information).
8. sonst zeichnen bei `SICHERHEITSBILD_MS`.
**`sparHinweisNoetig`:** wertet nur Proben mit `kamera_bewegt`; weniger als 60 solche → `false`; sonst `true`, wenn Median `raf_abstand_ms` > 25 **oder** Median `zeichen_ms` > 12.
**Regeln für `zeichenAufloesung`:** `f = min(dpr || 1, spar ? SPAR_FAKTOR : MAX_FAKTOR)`; wenn `css_breite·css_hoehe·f² > MAX_PIXEL`, dann `f = sqrt(MAX_PIXEL / (css_breite·css_hoehe))`; nie unter 1; `breite_px = round(css_breite·f)`.
**main.ts:**
- `groesseAnpassen` nutzt `zeichenAufloesung` (einzige Stelle mit `devicePixelRatio`), läuft bei `resize` und bei Sparmodus-Wechsel (Abo); setzt `leinwand.width/height` **nur**, wenn sich Pixelgröße oder Faktor wirklich ändern, dann `erzwingen = true`.
- Schleife: `steuerung.tick(uhr())` und `kamera.schritt(dt)` wie heute **jedes** Bild. `const szene = steuerung.szene()` einmal je Bild, an Schlüssel und `zeichneSzene` weitergeben. `sollZeichnen` mit `szenenSchluessel(szene)`, `kamera.schluessel()`, `animationBedarf(szene, steuerung.effekte.aktiv())`, `effekte_aktiv`, `animation: weniger_bewegung || sparmodus ? 'aus' : 'an'`, `sparmodus`, `verdeckt: Vorspann vorhanden und ohne Klasse 'aus'` (`document.getElementById('vorspann')`), `erzwingen`. Nach dem Zeichnen `erzwingen = false`.
- `maler.reduziert = weniger_bewegung || sparmodus` je Bild (überschreibt `steuerung.ts:102` absichtlich, `steuerung.ts` bleibt unverändert); `steuerung.effekte.sparsam = sparmodus`.
- `dt` für `zeichneSzene` = Zeit seit dem **letzten gezeichneten** Bild.
- Einstellungen: `main.ts` liest Startwerte über `einstellungenLesen()` und danach nur über `beiEinstellungsAenderung`; **schreibt nie zurück**.
- Messanzeige nur bei URL-Parameter `messen=1`: kleines Feld oben links, einmal je Sekunde `textContent` = „p50 xx ms · p95 yy ms · gezeichnet zz/s“ (Bildabstand der rAF-Aufrufe der letzten Sekunde). Kein `innerHTML`.
- Sparhinweis: `main.ts` sammelt `BildProbe`s (rAF-Abstand, Dauer von `zeichneSzene` per `performance.now()`, `kamera_bewegt` = Kameraschlüssel anders als im Vorbild), ab Ende des Vorspanns, bis 60 Kamera-Proben vorliegen; dann einmal `sparHinweisNoetig`. Bei `true` und Sparmodus aus, einmal je Gerät `steuerung.toast('Das Spiel ruckelt auf diesem Gerät. Tipp: Sparmodus in den Dorf-Einstellungen einschalten.')`. Merker in localStorage `waermedorf-sparhinweis-v1` (bestehende Schlüssel unverändert).
**Einstellungen:** Schalter „Sparmodus“ unter „Weniger Bewegung“, Beschreibung „30 Bilder/s, keine Hintergrund-Animationen, etwas geringere Schärfe – für ältere Handys“. Muster wie `einstellungen.ts:33`: `e.sparmodus = …` direkt im übergebenen Objekt ändern (das ist `steuerung`s Kopie), dann `einstellungenSchreiben(e); geaendert(e)`. Tippfläche ≥ 44 px.
**Tests (`tests/nr12-takt.test.ts`):**
- `NR12 P1: ohne Änderung und ohne Animation 2 Bilder je Sekunde` (60 Aufrufe à `1000/60` → 2)
- `NR12 P1: fließende Animation bei exakt 1000/60 → 30 Bilder/s` (60 Aufrufe → 30, Abstände alle 33,3 ms)
- `NR12 P1: fließende Animation bei abwechselnd 16,6/16,7 ms → 30`
- `NR12 P1: 90 Hz (1000/90) → Animation 30, laufende Kamera 90`
- `NR12 P1: 120 Hz (1000/120) → Animation 30`
- `NR12 P1: Animation aus → 2 Bilder/s; Baubalken ('langsam') bei Animation aus → 4 Bilder/s`
- `NR12 P1: Effekte aktiv bei Animation aus → 30 Bilder/s`
- `NR12 P1: Sparmodus, Kamera ändert sich jedes Bild (60 Hz) → 30`
- `NR12 P1: Kameraänderung zeichnet im selben Aufruf`; `NR12 P1: Szenenänderung während Sparmodus-Wartezeit wird im nächsten erlaubten Bild nachgeholt`
- `NR12 P1: erzwingen → sofort zeichnen, auch 1 ms nach dem letzten Bild`
- `NR12 P1: verdeckt → genau ein Bild, danach keins; erzwingen während verdeckt → ein weiteres`
- `NR12 P1: Sparhinweis – 30-Bilder-Takt ohne Kamerabewegung → kein Hinweis; Kamera bei 16,7 ms → kein Hinweis; Kamera bei 40 ms → Hinweis; 59 Kamera-Proben → kein Hinweis`
- `NR12 P1: kamera.schluessel – Winkeländerung 5e-4 rad ändert ihn, 1e-5 nicht`
**Tests (`tests/nr12-aufloesung.test.ts`):** `NR12 P1: Handy 844×390 Faktor 3 → Faktor 2, 1688×780`; `NR12 P1: Laptop 1920×1000 Faktor 2 → Faktor 1, 1920×1000` (Herleitung: 1920·1000·4 = 7,68 MP > 1,5 MP → √(1,5/1,92) = 0,88 → nie unter 1 → 1); `NR12 P1: Sparmodus 844×390 Faktor 3 → Faktor 1,25, 1055×488` (844·1,25 = 1055; 390·1,25 = 487,5 → 488); `NR12 P1: dpr 0/undefined → Faktor 1`.
**Tests (`tests/nr12-einstellungen.test.ts`):** `NR12 P1: Einstellungen ohne sparmodus-Feld lesen → false`; `NR12 P1: einstellungenSchreiben ruft Abonnenten mit neuem Sparmodus`; `NR12 P1: Sparmodus an → effekte.sparsam: funken erzeugt 6, muenzen höchstens 2`.
**Randfälle:** Fenster verborgen (rAF pausiert; nach Rückkehr großer `dt` – `effekte.ts:35` begrenzt auf 0,1 s); Handy gedreht → Kameraschlüssel anders; Besuchsmodus; Sparmodus mitten im Spiel umschalten (Leinwand neu, Kamera-Faktor gesetzt, Kamera bleibt am Ort, `erzwingen`).
**Rückfragen (Kritiker) → Antwort:** 60-Deckel bei 90/120 Hz → kein Deckel außer Sparmodus (Regel 3–4). Toleranz → 8 ms für alle Grenzen. Effekte bei `animation 'aus'` → 30/s (Regel 5). Sparhinweis-Messgröße → `sparHinweisNoetig`. Rundung Kameraschlüssel → 1e-4 / 0,01 px. Nach `visibilitychange`/`contextrestored` → `erzwingen` (Ereignisse verdrahtet P5; P1 liefert die Eingabe und setzt sie selbst nur nach echter Größenänderung). `groesseAnpassen` → nur bei echter Änderung. Kopie der Einstellungen in `steuerung` → Schalter ändert `e` in place, `main.ts` schreibt nie; dadurch übernimmt `steuerung.ts:96` (`{...this.einstellungen}`) den neuen Sparmodus.
**Eskalation:** Wenn die Hauptschleife nicht ohne Änderung an `steuerung.ts` umbaubar ist → stoppen, an den Projektleiter (A88-Kollision).
**Risiko-Auslöser:** nein (neuer localStorage-Merker ohne Personendaten).

### P2 Startbildschirm ganz ruhig — einfach (Aufräumen von SVG/CSS ohne Logik)
**Entscheidung:** E1 = (b), Logo einmal einblenden + Ladebalken, sonst nichts bewegt, kein Dampf.
**Dateien:** ändern `src/ui/vorspann.ts`, `src/ui/stil.css` (nur Vorspann-Abschnitt, heute Z. 314–355); Test `tests/nr12-vorspann.test.ts` (Text-Prüfung der Dateien wie `tests/anpassungen.test.ts:1175`).
**Liefert:** `vorspannZeigen(weniger_bewegung, tippNr?)` mit unveränderter Signatur. `bewegteEbene`, `BEWEGT` und die `.vs-bewegt`-Ebene entfallen.
**Inhalt:** alle bewegten SVG-Teile stehen still oder entfallen: Klassen `vs-wolke`, `vs-fluss`, `vs-rotor`, `vs-freude`, `vs-blatt`, `vs-strahlen` und ihre CSS-Animationen entfernen (Elemente bleiben als stilles Bild, wo sie sichtbar sind); Dampfkreise `vs-dampf` (`vorspann.ts:71`) ganz entfernen (sie sind ohne Animation unsichtbar, `opacity:0`). Bleiben: `vs-plopp` auf `.vs-kopf` (einmal, `both`) und `vs-laden` auf `.vs-fuellung` (`transform`, `forwards`, `will-change` nur hier). `#vorspann.aus` nur `opacity` (kein `transform: scale`, `transition` nur `opacity`). Toten Filter `#vorspann .schriftzug{…filter…}` (`stil.css:325`) entfernen. Keine neuen Filter. Nach dem Ausblenden wird `#vorspann` wie heute entfernt (unverändert lassen, falls schon so).
**Tests:** `NR12 P2: Vorspann ohne bewegte SVG-Teile` (vorspann.ts enthält keine der Klassen `vs-wolke|vs-dampf|vs-fluss|vs-rotor|vs-freude|vs-blatt|vs-strahlen` und kein `bewegteEbene`); `NR12 P2: im Vorspann-CSS nur die Animationen vs-plopp und vs-laden` (alle `animation:`-Werte im Abschnitt zählen); `NR12 P2: Vorspann-CSS ohne filter`; `NR12 P2: Ausblenden nur über Deckkraft` (`#vorspann.aus` und `#vorspann{…transition…}` ohne `transform`); `NR12 P2: Ladebalken weiter über transform` (`@keyframes vs-laden{to{transform:scaleX(1)}}` vorhanden).
**Randfälle:** „Weniger Bewegung“ (`.still`, `stil.css:352`) und `prefers-reduced-motion` (`stil.css:353`) unverändert wirksam.
**Sichtprüfung:** Designer, Foto 844×390 (Startbildschirm muss ohne Bewegung weiter einladend aussehen).
**Rückfragen (Kritiker) → Antwort:** Zählweise Z6 → verschiedene `animationName` mit `playState === 'running'`; `vs-plopp` ist nach 0,7 s `finished` und zählt nach 1 s nicht mehr. WebKit-Falle Dampf → entfällt mit E1 b.
**Vorarbeit:** Tester passt A78 an (Abschnitt 5).
**Risiko-Auslöser:** nein.

### P3a Bodenebene — schwer (Umbau der Zeichenreihenfolge, Gefahr veralteter Bilder, Speicherfallen in WebKit)
**Dateien:** neu `src/render/ebenen.ts`; ändern `src/render/szene.ts` (Boden-Teil Z. 53–211 in `zeichneBoden` auslagern, Glitzern herauslösen, Ebenen-Logik); Test `tests/nr12-ebenen.test.ts`. `gebaeude.ts` und `maler.ts` bleiben unverändert.
**Nutzt:** `bodenSchluessel`, `szenenSchluessel` (P0); Kamera-Felder `tw`, `winkel_rad`, `schiebe_x/y`, `breite`, `hoehe`, `pixelverhaeltnis` (liest direkt; braucht nichts aus P1).
**Liefert:**
```ts
// src/render/ebenen.ts
export interface Flaeche { width: number; height: number; getContext(t: '2d'): CanvasRenderingContext2D | null }
export type FlaechenFabrik = (breite_px: number, hoehe_px: number) => Flaeche;
export class BodenEbene {
  constructor(fabrik: FlaechenFabrik);
  /** true, wenn neu gemalt werden muss: keine Fläche, anderer Schlüssel oder Verschiebung seit dem Malen größer als der Rand. */
  braucht(schluessel: string, schiebe_x_px: number, schiebe_y_px: number): boolean;
  /** malt neu; rand_x_px/rand_y_px ganzzahlig; merkt sich die Verschiebung beim Malen. */
  neu(schluessel: string, breite_px: number, hoehe_px: number, rand_x_px: number, rand_y_px: number,
      schiebe_x_px: number, schiebe_y_px: number, malen: (X: CanvasRenderingContext2D) => void): void;
  /** kopiert die Fläche mit Einheitstransformation an (−rand + Verschiebungsdifferenz), auf ganze Gerätepixel gerundet. */
  auflegen(X: CanvasRenderingContext2D, schiebe_x_px: number, schiebe_y_px: number): void;
  freigeben(): void; // width = height = 0 (iOS-Speicher)
}
// src/render/szene.ts
export function bodenEbeneEinrichten(fabrik: FlaechenFabrik | null): void; // Modulvariable; Standard null = kein Zwischenspeicher
export function bodenEbeneVerwerfen(): void;                               // freigeben, nächstes Bild malt neu
export function zeichneSzene(m: Maler, k: Kamera, s: Szene, effekte: Effekte, dt_s: number): void; // Signatur unverändert
function zeichneBoden(m: Maler, k: Kamera, s: Szene): void;                // zeitlos (R8)
```
(`schiebe_*_px` = `k.schiebe_* · k.pixelverhaeltnis`.)
**Entscheidungen:**
- Bodenebene = Hintergrundfläche, Boden, Fluss mit Ufer **ohne Glitzern**, Straßen, Hausweg/Garten, Waldrand, Zaun, Gitter (`modus !== 'normal'`) – genau der Teil vor `zeichneLeitungen` (`szene.ts:212`). Alles danach (Leitungen, Wärmepunkte, Auswahlring, Gebäude, Plopp, Balken, Vorschau, Effekte) wird wie heute jedes gezeichnete Bild direkt gemalt – die Zeichenreihenfolge ändert sich nicht (E4 entfällt in Stufe 1).
- Glitzern wird nach dem Auflegen direkt gezeichnet, nur auf Flussfeldern **ohne** Straße (Brücken decken es heute zu).
- Gilt in allen Modi und Phasen, auch Durchsicht/`offen` und Platzieren/Verschieben.
- Rand je Achse: `rand_x_px = round(0,25 · breite · pv)`, `rand_y_px = round(0,25 · hoehe · pv)`; Fläche `(breite·pv + 2·rand_x_px) × (hoehe·pv + 2·rand_y_px)` (2,25-fach).
- Malen in die Fläche: in `try/finally` vorübergehend `m.X = Flächen-Kontext`, `k.breite += 2·rand_x_px/pv`, `k.hoehe += 2·rand_y_px/pv` (**Felder direkt setzen, nicht `groesseSetzen`** – das würde `basis` und damit `tw` ändern); das verschiebt den Ursprung (`kamera.ts:36`) genau um den Rand. `zeichneBoden` setzt wie heute `X.setTransform(k.pixelverhaeltnis, …)` – wirkt dann auf die Fläche. Im `finally` alles zurück.
- Sichtbarkeitsprüfungen (`cx < -tw || cx > W + tw …`) bleiben unverändert; sie nutzen in der Fläche automatisch das vergrößerte `W/H` und verwerfen den Rand nicht mehr.
- **Umgehen** (direkt zeichnen wie heute, ohne Ebene): wenn keine Fabrik eingerichtet ist; wenn sich `tw` oder `winkel_rad` gegenüber dem vorigen Bild geändert haben; und bis die Summe der `dt_s` seit dieser Änderung ≥ 0,15 s ist. Danach einmal neu aufbauen. Das allererste Bild nach dem Einrichten baut sofort auf. (Keine Uhr in `szene.ts` nötig; `dt_s` reicht.)
- Größen- oder Faktorwechsel → anderer Schlüssel → alte Fläche `freigeben()`, dann neu. Leinwand 0×0 → nichts tun.
**Tests (`tests/nr12-ebenen.test.ts`, Node, Aufzeichnungs-Kontext per `Proxy`, der alle Aufrufe mit Argumenten protokolliert; Fabrik liefert solche Kontexte; `afterEach(() => bodenEbeneEinrichten(null))`):**
- `NR12 P3a: ohne Fabrik ist die Befehlsfolge wie heute` (gleiche Folge wie ein direkt gezeichnetes Bild, Glitzern eingerechnet)
- `NR12 P3a: zweites Bild ohne Änderung malt den Boden nicht neu` (Fabrik-Kontext 0 Befehle)
- `NR12 P3a: Station gekauft → Boden bleibt, Hauptleinwand-Befehle ändern sich`
- `NR12 P3a: Haus fertig gebaut → Boden neu` (Hausweg erscheint)
- `NR12 P3a: Verschiebung um 10 px → nur auflegen; um mehr als den Rand → neu`
- `NR12 P3a: Verschiebung um Rand − 1 px → Fläche enthält Zeichenbefehle im Randstreifen` (Koordinaten links von `rand_x_px/pv` und rechts von `breite + rand_x_px/pv`)
- `NR12 P3a: auflegen rundet auf ganze Gerätepixel` (Verschiebung 3,4 px → `drawImage` mit ganzzahligen Zielkoordinaten)
- `NR12 P3a: Zoom/Drehung → direkt gezeichnet (Fabrik 0 Befehle), nach ≥ 0,15 s Ruhe genau ein Neuaufbau`
- `NR12 P3a: zeichneBoden ist zeitlos` (Befehlsfolge bei `zeit_s = 0` und `1,7` und `jetzt_ms + 5000` identisch, Stand mit Fluss, Bau, Brunnen, Großwärmepumpe, Plopp)
- `NR12 P3a: Ablauf – gleicher Schlüssel ⇒ gleiche Befehlsfolge` (Kette echter Spielaktionen über die öffentlichen `Spiel`-Methoden: platzieren, Station, Upgrade, Bau fertig, kündigen, Vorsehung, Abschnitt-Phasen, Besuch; nach jedem Schritt: gleicher `bodenSchluessel` wie vorher ⇔ gleiche `zeichneBoden`-Folge; gleicher `szenenSchluessel` ⇒ gleiche `zeichneSzene`-Folge bei festem `zeit_s`/`jetzt_ms`/Kamera)
- `NR12 P3a: Befehle je Bild in Ruhe ≤ 9 000 für den großen Stand` (Stand aus `neuerSpielstand` + Leitungen auf allen Straßen + Stationen, wie Abschnitt 1)
- `NR12 P3a: Größenänderung gibt alte Fläche frei (0×0)`; `NR12 P3a: bodenEbeneVerwerfen → nächstes Bild malt neu`
**Randfälle:** Besuchsmodus (anderer Ort → anderer Schlüssel); Pixel-Faktor-Wechsel (Sparmodus) → neu; Leinwand 0×0 beim Start; Fabrik liefert `getContext` = `null` → Ebene aus, direkt zeichnen, einmal `console.warn`.
**Rückfragen (Kritiker) → Antwort:** Instanz/Fabrik → Modulvariable in `szene.ts`, `bodenEbeneEinrichten`, Test ruft es mit Proxy-Fabrik. Malen in die Fläche → `m.X` tauschen + `setTransform(pv)`, `try/finally`. Rand und Sichtbarkeit → `k.breite/hoehe` vorübergehend vergrößern. Versatz → ganze Gerätepixel. Gerüst, Plopp → nicht in der Ebene (Stufe 1 enthält keine Gebäude). Baumvorlage → zurückgestellt. Zoom/Drehen → Ebene umgehen bis 0,15 s Ruhe.
**Eskalation:** Ablauf-Test findet ein fehlendes Schlüsselfeld → in `szene-schluessel.ts` ergänzen (erlaubt) und im Bericht nennen. Liegen die Befehle des großen Stands über 9 000 → nicht am Zeichnen kürzen, Zahl melden. Ändert A88-Nacharbeit gleichzeitig `szene.ts` → stoppen.
**Risiko-Auslöser:** nein.

### P4 Messwerkzeug — mittel (Browser-Steuerung, Ablaufverfolgung und Vorher/Nachher-Vergleich)
**Dateien:** neu `werkzeuge/messe-bildrate.cjs`; `werkzeuge/nr12-vorher.json` (vom Werkzeug geschrieben); Abschnitt „NR12 Messung“ in `docs/TESTNACHWEIS.md`.
**Liefert:** `node werkzeuge/messe-bildrate.cjs [--url http://localhost:4317/] [--nur-bericht] [--vorher-speichern]` – erwartet laufende Vorschau (`npx vite preview --port 4317`); Ausgabe Tabelle je Fall; Exit 0 nur, wenn Z1–Z10 erfüllt (mit `--nur-bericht` immer 0); `--vorher-speichern` schreibt die Werte für Z8/Z9 nach `werkzeuge/nr12-vorher.json`. `require('playwright')` wie `werkzeuge/bildschirmfoto.cjs`; **keine neue Abhängigkeit**, nicht Teil von `npm test`.
**Technik:** Kontext `viewport 844×390, deviceScaleFactor 3, hasTouch, isMobile`; CDP `Emulation.setCPUThrottlingRate`; per `addInitScript` eigener rAF-Zähler (Bildabstände), `PerformanceObserver('longtask')`, Zählung aller Methoden von `CanvasRenderingContext2D.prototype` (gezeichnet bei > 0 Befehlen seit dem letzten rAF; zählt auch Befehle auf der Ebenen-Fläche); CDP `Tracing` (`devtools.timeline`) für JS/Bild (`FireAnimationFrame` > 0,3 ms auf `CrRendererMain`); Gesten per `Input.dispatchTouchEvent` (1 Finger verschieben; 2 Finger zoomen+drehen gleichzeitig). Z6: `document.getAnimations()` 1 s nach Laden, `animationName` + `playState`. Z10: Gebäude per Tipp auswählen, `getImageData` einer 40×40-Stichprobe um den Tipp vor und 2 rAF nach dem Tipp vergleichen. Großer Spielstand über den Vite-Dev-Server `import('/src/core/spiel.ts')` und `speichern.ts` (Leitung `d40` auf jedes freie Straßenfeld, jedes Haus mit `passendeStation`, 6× `gas` Stufe 3 in `innen`, `namen_gefragt: true`), per `addInitScript` unter `waermedorf-spielstand-v1` **nur im Testbrowser**; Sparmodus/Weniger Bewegung über `waermedorf-einstellungen-v1` im Testbrowser.
**Vorher-Lauf** auf dem Basis-Commit (`git worktree add /tmp/nr12-basis <Basis-Commit>`, dort bauen + Vorschau) mit `--vorher-speichern --nur-bericht`; so blockiert P4 niemanden.
**Tests:** keine Unit-Tests; Nachweis = Vorher-Lauf und Lauf nach P5, beide Ausgaben in `docs/TESTNACHWEIS.md`.
**Rückfragen (Kritiker) → Antwort:** Übergabe/Rasterung → über Z9 (Bildabstand p95 nicht schlechter) und Z7 (Pixel). Z6 → neu definiert. Zoomen+Drehen → Z8. Zusammenspiel → Z10.
**Risiko-Auslöser:** nein.

### P5 Verdrahtung + Zusammenspieltest — einfach (wenige Zeilen in `main.ts`, ein Node-Test)
**Dateien:** ändern `src/main.ts`; Test `tests/nr12-zusammenspiel.test.ts`.
**Nutzt:** `bodenEbeneEinrichten`, `bodenEbeneVerwerfen`, `FlaechenFabrik` (P3a); `sollZeichnen`, `neuerTakt`, Merker `erzwingen` (P1); `szenenSchluessel`, `animationBedarf` (P0).
**main.ts:**
- einmal beim Start: `bodenEbeneEinrichten((b, h) => { const c = document.createElement('canvas'); c.width = b; c.height = h; c.addEventListener('contextrestored', neuAufbauen); return c; })`.
- `neuAufbauen = () => { bodenEbeneVerwerfen(); erzwingen = true; }` bei `visibilitychange` → sichtbar, `pageshow` und `contextrestored` auf `#karte`. Bestehender `visibilitychange`-Abo (Speichern bei `hidden`) bleibt.
**Tests (`tests/nr12-zusammenspiel.test.ts`, Node):** echtes `Spiel` aus `neuerSpielstand`, Szene aufgebaut wie `steuerung.szene()` (`steuerung.ts:353–362`), Kamera mit `groesseSetzen(844, 390, 2)`, `bodenEbeneEinrichten(Proxy-Fabrik)`, Takt aus P1:
- `NR12 P5: Aktion → Takt erlaubt das nächste Bild und die Befehle ändern sich` (Haus Station geben bzw. Gebäude platzieren → `sollZeichnen(...).zeichnen === true` im nächsten Aufruf, aufgezeichnete Befehle auf der Hauptleinwand anders als vorher)
- `NR12 P5: Ruhe → nach dem Neuaufbau zeichnet ein Bild nur noch auflegen + Bewegtes` (Fabrik-Kontext 0 Befehle)
- `NR12 P5: Verwerfen (Rückkehr in die App) → erzwungenes Bild baut den Boden neu`
**Randfälle:** Ereignis vor dem ersten Bild (nur Merker setzen); Besuch im Nachbardorf.
**Eskalation:** Wenn der Zusammenspieltest eine Lücke in P0/P1/P3a zeigt → nicht in `main.ts` umgehen, sondern stoppen und melden.
**Risiko-Auslöser:** nein.

---

## 8. Entscheidungen

- **E1 Startbildschirm: entschieden (b)** – ganz ruhig, Logo einmal einblenden + Ladebalken, kein Dampf (Projektleiter 2026-11-05; löst Z6 und die WebKit-Falle a).
- **E2 Hintergrund-Animationen:** (a) wie empfohlen – 30 Bilder/s gleichmäßig (mit Toleranz), Kamera jedes Bild.
- **E3 Sparmodus:** (a) wie empfohlen – Schalter + einmaliger Hinweis nur bei echt langsamem Gerät (Messung bei Kamerabewegung).
- **E4 Zeichenreihenfolge:** entfällt in Stufe 1 (Boden liegt ohnehin unter allem); kommt mit P3b wieder zum Designer.
- **E5 P3 in zwei Stufen: entschieden** – P3a Boden jetzt, P3b Gebäude nur nach Messung auf Simons Handy (Projektleiter).
- **E6 Geräte-Abnahme mit Verschieben und Zwei-Finger-Zoomen/Drehen: entschieden** – Bildabstand p50 ≤ 17,5 ms, p95 ≤ 25 ms (Projektleiter; Simon bestätigt mit der Messung).

## 9. Prüf-Schwerpunkt (nicht in Anforderungen, trifft echte Nutzer)

1. **Veraltetes Bild nach einer Aktion** (Station gekauft, Haus sieht weiter kalt aus) – erwartet: spätestens im nächsten Bild aktuell; P0 (Feldtabelle), P3a (Ablauf-Test), P5 (Zusammenspiel), P4 Z10.
2. **Zurück in die App / Handy gedreht / Fenstergröße geändert** – erwartet: sofort scharfes, richtig großes Bild, keine leere Karte, kein Speicheranstieg; P1 (`erzwingen`, Leinwand nur bei echter Änderung), P3a (freigeben), P5 (`visibilitychange`/`pageshow`/`contextrestored`).
3. **Zwei-Finger-Zoomen/Drehen auf großem Dorf** – erwartet: nicht langsamer als vorher; P3a (Umgehung während Geste), P4 Z8.
4. **Sparmodus mitten im Spiel umschalten** – erwartet: Auflösung, Bildrate und Effekte ändern sich sofort, Kamera bleibt am Ort, kW-Umschalten danach überschreibt nichts; P1 (Einstellungs-Tests).
5. **90/120-Hz-Handy** – erwartet: Rauch und Wärmepunkte laufen gleichmäßig mit 30 Bildern/s, Kamera mit voller Rate; P1 (Takt-Tests 90/120 Hz).
