# Bauplan NR12 „Weniger Rechenlast / flüssiger“ → Vorschlag **A90**

Stand 2026-11-05, Architekt. Grundlage: Messung auf Stand `dc6dc23` (Darstellung seitdem unverändert; A88 P2 hat nur Kern/Oberfläche geändert).
Architekturtests: `tests/architektur/nr12-zeichentakt.test.ts` (R1–R8, liegen schon im Repo).

**Vorschlag Lastenheft A90 (Muss):** Das Spiel zeichnet nur, wenn sich etwas ändert oder eine Animation läuft; die Karte hat eine Pixel-Obergrenze; ruhende Teile der Karte werden zwischengespeichert; der Startbildschirm bewegt fast nichts und das Spiel darunter ruht; Einstellung „Sparmodus“ (30 Bilder/s, keine Umgebungsanimation, geringere Auflösung). Abnahme: Messwerkzeug `werkzeuge/messe-bildrate.cjs` hält die Zielwerte Z1–Z7 (Abschnitt 6) ein; Tests mit „NR12“ im Namen grün; auf Simons iPhone und dem Android-Handy des Kollegen zeigt die Messanzeige (`?messen=1`) in Ruhe und beim Verschieben im Mittel ≥ 55 Bilder/s, im Sparmodus stabil ≥ 30.

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
| M1 | Nur zeichnen, wenn sich Szene/Kamera ändert oder eine Animation läuft; spätestens alle 500 ms ein Sicherheitsbild | Ruhe ohne Animation: ~0 statt 60 Bilder/s | mittel | P0+P1 |
| M2 | Pixel-Obergrenze (Faktor ≤ 2 und ≤ 1,5 MP, nie unter Faktor 1; Sparmodus Faktor ≤ 1,25) | Laptop 7,7 → ≤ 2 MP; Übergabe ~÷2–4 | klein | P1 |
| M3 | Spiel unter dem Vorspann ruht (ein Bild vorbereiten, dann bis zum Ausblenden nichts) | Startbildschirm: 13 500 → 0 Befehle/Bild | klein | P1 |
| M4 | Vorspann beruhigen: nur Ladebalken, Logo-Einblendung einmal, leiser Dampf; Ausblenden nur über Deckkraft | weniger Unruhe (Simon), WebKit-sicher | klein | P2 |
| M5 | Umgebungsanimation höchstens 30 Bilder/s (Kamera/Eingaben weiter 60) | Hälfte der Bilder bei laufender Animation | klein | P1 |
| M6 | Ruhende Ebene (Boden … Gebäude) zwischenspeichern, Bewegtes darüber; Rand für Verschieben | Befehle je Animationsbild 17 000 → < 3 000 | groß | P3 |
| M7 | Baum als vorgezeichnetes Bild statt 4 Verläufe je Baum | schnelleres Neuzeichnen bei Zoom/Drehen | klein | P3 |
| M8 | Sparmodus + Hinweis bei langsamem Gerät; `prefers-reduced-motion` schaltet Animationen aus (heute schon für „Weniger Bewegung“) | schwache Geräte stabil 30 | klein | P1 |
| M9 | Messanzeige `?messen=1` (Bilder/s p50/p95) für Simons Handy | Abnahme auf echtem Gerät | klein | P1 |

Zurückgestellt: zweite DOM-Leinwand statt Zweitleinwand (gleicher Nutzen, mehr Umbau an Treffer/Eingabe); HUD nur bei Änderung schreiben (in `hud.ts`/`steuerung.ts`, Nutzen < 1 %); Bildrate grundsätzlich auf 30 deckeln (nur im Sparmodus); WebGL/Pixi (Neubau, nicht nötig).

## 4. Aufbau (Plan-Abschnitt 4)

Grundmuster bleibt: Spielkern ohne Browser, Darstellung als Canvas-Maler. Neu: **ein Taktgeber entscheidet je Bild, ob gezeichnet wird; die Szene zeichnet in zwei Ebenen (ruhend zwischengespeichert, bewegt jedes Bild).** Alles in `src/render/` und `src/main.ts`; keine Änderung an Kern, Steuerung, Katalog, Kontext (A88-Dateien).

Abhängigkeitsrichtung: `main.ts → render/takt.ts, render/aufloesung.ts, render/szene-schluessel.ts, render/szene.ts`; `render/szene.ts → render/ebenen.ts, render/szene-schluessel.ts`; `takt.ts`/`aufloesung.ts` rein (kein Browser, kein Kern-Spiel, keine Oberfläche).

- **AE-NR12-1 Ein Taktgeber.** Bindet: ob ein Bild gezeichnet wird. Verhindert: zweite Schleife oder verstreute „jetzt neu zeichnen“-Merker. Regel: einzige Dauerschleife in `main.ts` (R1), Entscheidung nur über `sollZeichnen` (R6), `takt.ts` rein (R4).
- **AE-NR12-2 Eine Auflösungsregel.** Bindet: Leinwandgröße. Verhindert: unterschiedliche Pixelfaktoren in Kamera, Leinwand und Zwischenspeicher. Regel: `devicePixelRatio` nur einmal in `main.ts`, Umrechnung nur `zeichenAufloesung` (R5); Kamera bekommt den wirksamen Faktor.
- **AE-NR12-3 Szenen-Schlüssel an einer Stelle.** Bindet: Erkennung „Szene hat sich geändert“ und „Animation nötig“. Verhindert: Takt und Zwischenspeicher erkennen Änderungen verschieden → eingefrorene oder veraltete Bilder. Regel: nur `szenenSchluessel`/`animationBedarf` in `src/render/szene-schluessel.ts`; Unit-Test „gleicher Schlüssel ⇒ gleiche Befehlsfolge“.
- **AE-NR12-4 Ruhende Ebene ist zeitlos.** Bindet: was zwischengespeichert werden darf. Verhindert: eingefrorene Animationen. Regel: `zeichneRuhend` liest weder `zeit_s` noch `jetzt_ms` (R8); `ebenen.ts` bekommt die Leinwand-Fabrik übergeben (R7).
- **AE-NR12-5 Keine Weichzeichner, keine schnellen Dauer-Timer.** Regel: kein `shadowBlur`/`ctx.filter` in `src/render` (R2), kein `setInterval` < 1000 ms (R3). Im Vorspann-CSS kein `filter` mit Unschärfe auf bewegten oder großen Elementen (Test in P2).

**WebKit-Fallen (Safari/iPhone), in den Paketen berücksichtigt:** (a) CSS-Animationen auf SVG-Kindelementen laufen nicht auf der Grafikkarte → bewegte SVG-Teile klein und wenige halten (P2). (b) `transform: scale` auf einer großen Fläche mit SVG/Filter wird während der Animation neu gerastert → Vorspann nur per Deckkraft ausblenden (P2). (c) `filter: drop-shadow` mit Unschärfe ist teuer → keine Filter auf bewegten Elementen (P2). (d) Leinwand-Speicher ist auf iOS begrenzt (Gesamtspeicher aller Leinwände; ältere iOS-Versionen höchstens 16,7 Mio. Pixel je Leinwand) → Zwischenspeicher höchstens 2,25-fache Bildschirmfläche, bei Größenänderung alte Fläche freigeben (`width = height = 0`) (P3). (e) `will-change` nur auf kleinen Elementen; die bestehende `.vs-bewegt`-Ebene bleibt (A78-Test), wird aber inhaltlich klein (P2).

## 5. Pakete (Plan-Abschnitt 5)

| Paket | Dateien | Abhängig von | Parallel möglich mit | Schwierigkeit |
|---|---|---|---|---|
| **P0 Vertrag Szenen-Schlüssel** (< 30 min) | neu `src/render/szene-schluessel.ts`, `tests/nr12-szene-schluessel.test.ts` | – | P2, P4 | einfach |
| **P1 Takt, Auflösung, Sparmodus, Messanzeige** | neu `src/render/takt.ts`, `src/render/aufloesung.ts`; ändern `src/main.ts`, `src/render/kamera.ts`, `src/ui/einstellungen.ts`; Tests `tests/nr12-takt.test.ts`, `tests/nr12-aufloesung.test.ts` | P0 | P2, P3, P4 | mittel |
| **P2 Ruhiger Startbildschirm** | ändern `src/ui/vorspann.ts`, `src/ui/stil.css` (nur Vorspann-Abschnitt ab „A63/A64: Logo, Schriftzug und Ladebildschirm“); Test `tests/nr12-vorspann.test.ts` | – | P0, P1, P3, P4 | einfach |
| **P3 Ruhende Ebene** | neu `src/render/ebenen.ts`; ändern `src/render/szene.ts`, `src/render/gebaeude.ts`, `src/render/maler.ts`; Test `tests/nr12-ebenen.test.ts` | P0 | P1, P2, P4 | schwer |
| **P4 Messwerkzeug** | neu `werkzeuge/messe-bildrate.cjs`, Abschnitt in `docs/TESTNACHWEIS.md` | – | alle | einfach |

Kritischer Pfad: P0 (≤ 30 min) → P3. P1, P2, P4 laufen daneben. Keine gemeinsamen Dateien zwischen den parallelen Paketen; gemeinsame Ressource nur der Vorschau-Port bei P4 (eigener Port 4317).

**Überschneidung mit A88-Arbeit** (`spiel.ts`, `freischaltung.ts`, `ui/katalog.ts`, `ui/kontext.ts`, `steuerung.ts`): keine Datei gemeinsam. Berührungspunkte nur lesend: `Szene` (aus `steuerung.szene()`), `maler.reduziert` (setzt `steuerung.ts:102`), `steuerung.toast()`. A88 P2 ist laut `9a10092` bereits gemergt. Falls eine spätere A88-Nacharbeit `src/render/szene.ts` oder `gebaeude.ts` ändert (P1 von A88 tat das für die Blase), kollidiert sie mit P3 → nacheinander mergen.

**Vorarbeit:** keine. Der bestehende Test `tests/anpassungen.test.ts:1175-1181` (A78: `bewegteEbene(szene)` in `vorspann.ts`, `.vs-bewegt{…will-change:transform` in `stil.css`) bleibt gültig, weil P2 die bewegte Ebene behält. Die Architekturtests R4–R8 sind schon eingecheckt und greifen von selbst, sobald `takt.ts` bzw. `ebenen.ts` existieren.

---

## 6. Messbare Abnahme (Zielwerte für `werkzeuge/messe-bildrate.cjs`)

„Gezeichnetes Bild“ = Bild mit mindestens einem Canvas-Befehl auf `#karte` oder dem Zwischenspeicher. Chromium kopflos, 844×390, Touch, Faktor 3, Spielstand „groß“ (vom Werkzeug selbst erzeugt, siehe P4).

| Ziel | Fall | Grenze | heute |
|---|---|---|---|
| Z1 | Ruhe, Sparmodus, 1× | ≤ 3 gezeichnete Bilder/s | ~20 |
| Z2 | Ruhe, „Weniger Bewegung“, 1× | ≤ 3 gezeichnete Bilder/s | ~20 |
| Z3 | Ruhe, normal, 1× | ≤ 31 gezeichnete Bilder/s **und** ≤ 3 000 Befehle je gezeichnetem Bild (Mittel) | ~20 / 16 900 |
| Z4 | Ruhe, normal, **4×** | JS je Bild p95 ≤ 12 ms | 59 |
| Z5 | Verschieben, normal, 4× | JS je Bild p95 ≤ 15 ms | 51 |
| Z6 | Vorspann (erste 2,5 s), 1× | ≤ 2 gezeichnete Bilder insgesamt; nach 1 s höchstens 2 laufende Animationen (`document.getAnimations()`) | ~55 Bilder; 20+ Animationen |
| Z7 | Leinwandpixel | 844×390 @3: ≤ 1,5 MP; 1920×1000 @2: ≤ 2,0 MP; Sparmodus 844×390 @3: ≤ 0,55 MP | 1,32 / 7,68 / 1,32 |

Nur berichten (keine Grenze, Gerät entscheidet): Bildabstand p50/p95, Anteil > 16,7 / > 33 ms, Zoomen+Drehen JS p95 (Ziel: deutlich unter heute 44 ms bei 4×), Long Tasks.
Auf dem Gerät (Simon, manuell, mit `?messen=1`): Ruhe und Verschieben p50 ≥ 55 Bilder/s; Sparmodus stabil ≥ 30.

---

## 7. Baupläne

### P0 Vertrag Szenen-Schlüssel — einfach (kleine reine Funktionen, aber jede vergessene Eigenschaft wird später ein veraltetes Bild)
**Dateien:** neu `src/render/szene-schluessel.ts`; Test `tests/nr12-szene-schluessel.test.ts`.
**Nutzt:** `Szene` aus `src/render/szene.ts:16`, `istLeitung`, `KATALOG` aus `core/katalog`.
**Liefert:**
```ts
export type AnimBedarf = 'keine' | 'langsam' | 'fluessig';
/** Ändert sich genau dann, wenn sich etwas Sichtbares an der Szene (ohne Zeit) ändert. Kamera gehört NICHT dazu. */
export function szenenSchluessel(s: Szene): string;
/** Welche Zeitabhängigkeit hat die Szene? 'langsam' = nur Fortschrittsbalken/Blinken (4 Bilder/s genügen),
 *  'fluessig' = Rauch, Wärmepunkte, Puls, Blasen-Wippen, Glitzern, Auswahlring, Platzier-Pfeil, Effekte. */
export function animationBedarf(s: Szene, effekte_aktiv: boolean): AnimBedarf;
```
Schlüssel enthält mindestens: je Objekt `id, typ, x, y, stufe, !!bau, geplant, gekuendigt, interessent, anfrage, ohne_station, station, zustand, vorsehung, upgrade, zufriedenheit_pct < 40`; `innen` (typ, stufe, !!bau); eine fortlaufende Nummer je `netz`-Objekt (WeakMap; `Spiel.neuBerechnen` erzeugt ein neues Netz); `modus, auswahl_id, verschiebe_id, geist (typ,x,y,kante,ok), stempel, kw_anzeigen`, `spiel?.abschnitt?.phase`, Länge von `strassen`/`fluss`. Kein `JSON.stringify` der ganzen Objekte (Laufzeit); Zahlen-Hash oder kurze Verkettung, Ziel < 0,2 ms bei 230 Objekten.
`animationBedarf`: `'fluessig'` wenn `effekte_aktiv` oder Netz läuft (`genutzt_kw > 0`, Rauch) oder irgendein `last_kw > 0` (Wärmepunkte) oder ein Interessent ohne Anschluss, eine Blase, Auswahl, Fluss, Platzieren/Verschieben; sonst `'langsam'` wenn irgendein `bau`, `upgrade_auftrag`, Innen-Bau oder eine Überlast (`kapazitaet_ok === false`); sonst `'keine'`.
**Tests:** `NR12 P0: gleicher Stand ergibt gleichen Schlüssel`; `NR12 P0: Haus bekommt Station → anderer Schlüssel` (je eine Zeile für jedes oben genannte Feld, als Tabelle); `NR12 P0: neues Netz-Objekt → anderer Schlüssel`; `NR12 P0: jetzt_ms ändert den Schlüssel nicht`; `NR12 P0: leeres Dorf ohne Last → animationBedarf 'keine'`; `NR12 P0: Bau läuft → 'langsam'`; `NR12 P0: Leitung mit last_kw > 0 → 'fluessig'`.
**Randfälle:** Besuch im Nachbardorf (`spiel: null`, keine Straßen) – Schlüssel muss trotzdem gehen.
**Risiko-Auslöser:** nein (keine Daten von außen, keine Anmeldung, keine neue Schnittstelle nach außen).

### P1 Takt, Auflösung, Sparmodus, Messanzeige — mittel (Zustandslogik mit Zeitgrenzen, Einbau in die Hauptschleife)
**Dateien:** neu `src/render/takt.ts`, `src/render/aufloesung.ts`; ändern `src/main.ts` (Zeilen 56–75: `groesseAnpassen` und Schleife; Vorspann-Abfrage; Messanzeige), `src/render/kamera.ts` (zwei Methoden ergänzen), `src/ui/einstellungen.ts` (Feld `sparmodus`, Schalter, Änderungs-Abo); Tests `tests/nr12-takt.test.ts`, `tests/nr12-aufloesung.test.ts`.
**Nutzt:** `szenenSchluessel`, `animationBedarf` (P0); `effekte.aktiv()` (`effekte.ts:29`); `maler.reduziert`; `steuerung.szene()`, `steuerung.toast()`.
**Liefert:**
```ts
// src/render/takt.ts (rein)
export interface TaktZustand { letztes_bild_ms: number; szene: string; kamera: string; gezeichnet: boolean }
export interface TaktEingabe {
  jetzt_ms: number; szene: string; kamera: string; bedarf: AnimBedarf;
  animation: 'an' | 'aus';      // aus = „Weniger Bewegung“ oder Sparmodus
  deckel_fps: 60 | 30;          // 30 = Sparmodus
  verdeckt: boolean;            // Vorspann deckt die Karte ab
}
export const SICHERHEITSBILD_MS = 500, LANGSAM_MS = 250, FLUESSIG_MS = 1000 / 30;
export function neuerTakt(): TaktZustand;
/** Gibt zurück, ob jetzt gezeichnet wird, und den neuen Zustand (Eingabezustand bleibt unverändert). */
export function sollZeichnen(z: TaktZustand, e: TaktEingabe): { zeichnen: boolean; zustand: TaktZustand };

// src/render/aufloesung.ts (rein)
export interface Aufloesung { faktor: number; breite_px: number; hoehe_px: number }
export const MAX_FAKTOR = 2, MAX_PIXEL = 1_500_000, SPAR_FAKTOR = 1.25;
export function zeichenAufloesung(css_breite: number, css_hoehe: number, dpr: number, spar: boolean): Aufloesung;

// src/render/kamera.ts (ergänzen)
schluessel(): string;   // breite, hoehe, pixelverhaeltnis, zoom, winkel_rad, schiebe_x, schiebe_y (gerundet auf 0,01)
inBewegung(): boolean;  // weiche Drehung (dreh_rest_rad) läuft noch

// src/ui/einstellungen.ts (ergänzen)
export interface Einstellungen { weniger_bewegung: boolean; kw_anzeigen: boolean; sparmodus: boolean } // Standard false
export function beiEinstellungsAenderung(f: (e: Einstellungen) => void): void; // einstellungenSchreiben ruft alle Abonnenten
```
**Regeln für `sollZeichnen`** (in dieser Reihenfolge): `verdeckt` → nur zeichnen, wenn noch nie gezeichnet. Abstand seit letztem Bild < `1000/deckel_fps` − 1 ms → nicht zeichnen (Änderung bleibt vorgemerkt, weil `szene`/`kamera` im Zustand erst beim Zeichnen übernommen werden). Kamera- oder Szenenschlüssel anders → zeichnen. `animation 'an'` und `bedarf 'fluessig'` → zeichnen, wenn Abstand ≥ `FLUESSIG_MS`. `bedarf ≠ 'keine'` (auch bei `animation 'aus'`, weil Balken Information sind) → zeichnen, wenn Abstand ≥ `LANGSAM_MS`. Sonst zeichnen, wenn Abstand ≥ `SICHERHEITSBILD_MS`.
**Regeln für `zeichenAufloesung`:** `f = min(dpr || 1, spar ? SPAR_FAKTOR : MAX_FAKTOR)`; wenn `css_breite·css_hoehe·f² > MAX_PIXEL`, dann `f = sqrt(MAX_PIXEL / (css_breite·css_hoehe))`; nie unter 1; `breite_px = round(css_breite·f)`.
**main.ts:** `groesseAnpassen` nutzt `zeichenAufloesung` (einzige Stelle mit `devicePixelRatio`) und auch bei Sparmodus-Wechsel (Abo). Schleife: `steuerung.tick(uhr())` und `kamera.schritt(dt)` wie heute **jedes** Bild; danach `sollZeichnen` mit `szenenSchluessel(steuerung.szene())`, `kamera.schluessel()` (bei `inBewegung()` ändert er sich ohnehin), `animationBedarf(…, steuerung.effekte.aktiv())`, `animation: maler.reduziert || sparmodus ? 'aus' : 'an'`, `verdeckt: Vorspann vorhanden und ohne Klasse 'aus'` (`document.getElementById('vorspann')`). `maler.reduziert = weniger_bewegung || sparmodus` (main setzt es je Bild; `steuerung.ts:102` bleibt unverändert). `dt` für `zeichneSzene` = Zeit seit dem **letzten gezeichneten** Bild (Effekte laufen sonst zu langsam). `steuerung.szene()` wird nur einmal je Bild aufgerufen und an Schlüssel und `zeichneSzene` weitergegeben.
**Sparmodus-Hinweis:** misst `main.ts` in den ersten 5 s nach dem Vorspann einen mittleren Bildabstand > 25 ms (nur bei laufender Animation gezeichnete Bilder zählen), einmal je Gerät `steuerung.toast('Das Spiel ruckelt auf diesem Gerät. Tipp: Sparmodus in den Dorf-Einstellungen einschalten.')`. Merker in localStorage unter neuem Schlüssel `waermedorf-sparhinweis-v1` (bestehende Schlüssel unverändert).
**Messanzeige:** nur bei URL-Parameter `messen=1`: kleines Feld oben links, einmal je Sekunde `textContent` = „xx B/s · p95 yy ms · gezeichnet zz/s“. Kein `innerHTML`.
**Einstellungen:** Schalter „Sparmodus“ unter „Weniger Bewegung“, Beschreibung „30 Bilder/s, keine Hintergrund-Animationen, etwas geringere Schärfe – für ältere Handys“. Tippfläche ≥ 44 px, Stil wie der vorhandene Schalter.
**Tests (`tests/nr12-takt.test.ts`):** `NR12 P1: ohne Änderung und ohne Animation höchstens 2 Bilder je Sekunde` (60 Aufrufe à 16,7 ms → 2 Zeichnungen); `NR12 P1: Kameraänderung zeichnet im nächsten Bild`; `NR12 P1: Szenenänderung während Deckel-Wartezeit wird nachgeholt`; `NR12 P1: Sparmodus höchstens 30 Bilder/s bei laufender Kamera` (60 Aufrufe mit wechselndem Kameraschlüssel → 30); `NR12 P1: fließende Animation an → 30 Bilder/s, aus → 2 Bilder/s`; `NR12 P1: Baubalken bei Animation aus → 4 Bilder/s`; `NR12 P1: verdeckt → genau ein Bild, danach keins`. (`tests/nr12-aufloesung.test.ts`): `NR12 P1: Handy 844×390 Faktor 3 → Faktor 2, 1688×780`; `NR12 P1: Laptop 1920×1000 Faktor 2 → Faktor 1, 1920×1000` (Rechnung: 7,68 MP > 1,5 MP → √(1,5/1,92) = 0,88 → nie unter 1 → 1; bewusst über MAX_PIXEL, weil unter Faktor 1 unscharf wird); `NR12 P1: Sparmodus 844×390 Faktor 3 → Faktor 1,25, 1055×488`; `NR12 P1: dpr 0/undefined → Faktor 1`; `NR12 P1: Einstellungen ohne sparmodus-Feld lesen → false`.
**Randfälle:** Fenster verborgen (rAF pausiert, nach Rückkehr großer `dt` – Effekte begrenzen `dt` schon auf 0,1 s); Größenänderung/Drehen des Handys → Kamera-Schlüssel ändert sich; Besuchsmodus; Sparmodus-Umschalten mitten im Spiel (Leinwand neu anlegen, Kamera-Faktor setzen).
**Eskalation:** Wenn die Hauptschleife nicht ohne Änderung an `steuerung.ts` umbaubar ist → stoppen, an den Projektleiter (A88-Kollision).
**Risiko-Auslöser:** nein.

### P2 Ruhiger Startbildschirm — einfach (CSS/SVG-Aufräumen, ohne Logik)
Entscheidung E1 abwarten (Empfehlung a).
**Dateien:** ändern `src/ui/vorspann.ts` (`BEWEGT`, `ladebildSvg`, `vorspannZeigen`), `src/ui/stil.css` (nur Vorspann-Abschnitt, heute Zeilen 314–353); Test `tests/nr12-vorspann.test.ts` (Text-Prüfung der Dateien wie `tests/anpassungen.test.ts:1175`).
**Liefert:** `vorspannZeigen(weniger_bewegung, tippNr?)` unverändert; `bewegteEbene(szene)` bleibt (A78-Test).
**Inhalt (E1 a):** in der bewegten Ebene nur noch `.vs-dampf` (4 Kreise am Schornstein); Wolken, Blätter, Rotoren, Herzen, Fließpunkte stehen still (Klassen aus `BEWEGT` und CSS-Animationen entfernen; die Elemente bleiben im ruhenden Bild). Ladebalken bleibt (`transform`). Logo-Einblendung `vs-plopp` bleibt einmalig. `#vorspann.aus` blendet nur über `opacity` aus (kein `transform: scale` – WebKit-Falle b). Toten Filter `#vorspann .schriftzug{…filter…}` entfernen. Keine neuen Filter.
**Tests:** `NR12 P2: Vorspann bewegt nur Dampf` (`BEWEGT` enthält genau `.vs-dampf`); `NR12 P2: Vorspann-CSS ohne filter mit Unschärfe` (kein `filter:` im Vorspann-Abschnitt); `NR12 P2: Ausblenden ohne scale` (`#vorspann.aus` ohne `transform`); `NR12 P2: nur Ladebalken, Logo und Dampf haben Animationen` (alle `animation:`-Regeln im Vorspann-Abschnitt zählen: `vs-kopf`, `vs-fuellung`, `vs-dampf`).
**Randfälle:** „Weniger Bewegung“ (`.still`) unverändert; `prefers-reduced-motion` unverändert (`stil.css:353`).
**Sichtprüfung:** Designer, Foto 844×390 (Lektion: Überlagerungen fotografieren).
**Risiko-Auslöser:** nein.

### P3 Ruhende Ebene — schwer (Umbau der Zeichenreihenfolge, Gefahr eingefrorener oder veralteter Bilder, Speicherfallen in WebKit)
**Dateien:** neu `src/render/ebenen.ts`; ändern `src/render/szene.ts` (`zeichneSzene` aufteilen), `src/render/gebaeude.ts` (zeitabhängige Teile aus `zeichneObjekt` herauslösen: Zeilen um 98, 135, 144, 205, 274), `src/render/maler.ts` (`baum` über Bildvorlage); Test `tests/nr12-ebenen.test.ts`.
**Nutzt:** `szenenSchluessel` (P0); Kamera-Felder (`tw`, `winkel_rad`, `schiebe_x/y`, `breite`, `hoehe`, `pixelverhaeltnis`) – liest sie direkt, braucht `kamera.schluessel()` aus P1 **nicht**.
**Liefert:**
```ts
// src/render/ebenen.ts
export interface Flaeche { width: number; height: number; getContext(t: '2d'): CanvasRenderingContext2D | null }
export type FlaechenFabrik = (breite_px: number, hoehe_px: number) => Flaeche;
export class RuhendeEbene {
  constructor(fabrik: FlaechenFabrik);
  /** true, wenn neu gemalt werden muss (Schlüssel anders oder Verschiebung außerhalb des Randes). */
  braucht(schluessel: string, versatz_x: number, versatz_y: number): boolean;
  /** malt die Ebene neu; `malen` zeichnet in Bildschirm-Koordinaten zuzüglich Rand. */
  neu(schluessel: string, breite_px: number, hoehe_px: number, rand_px: number, versatz_x: number, versatz_y: number, malen: (X: CanvasRenderingContext2D) => void): void;
  /** kopiert die Ebene passend zum aktuellen Versatz auf die Leinwand. */
  auflegen(X: CanvasRenderingContext2D, versatz_x: number, versatz_y: number): void;
  freigeben(): void; // width = height = 0 (iOS-Speicher)
}
// src/render/szene.ts
export function zeichneSzene(m: Maler, k: Kamera, s: Szene, effekte: Effekte, dt_s: number): void; // Signatur unverändert
function zeichneRuhend(m: Maler, k: Kamera, s: Szene): void;  // ohne zeit_s/jetzt_ms (R8)
function zeichneBewegt(m: Maler, k: Kamera, s: Szene, effekte: Effekte, dt_s: number): void;
```
**Entscheidungen:** Ruhend = Hintergrund, Boden, Fluss (ohne Glitzern), Straßen, Wege, Waldrand, Zaun, Gitter, Leitungen (Überlastfarbe dauerhaft dunkelrot), Gebäude in Ruhestellung (Rotor fest, ohne Rauch), kW-Schilder, Gerüste. Bewegt (jedes gezeichnete Bild, darüber): Glitzern, Wärmepunkte, Interessenten-Puls, Auswahlring, Überlast-Blinken (hellrot über dunkelrot), Rotor, Rauch, Blasen, Balken, Platzier-Vorschau, Pfeil, Effekte. **Ausnahme Durchsicht-Modus** (`istDurchsichtig`, `szene.ts:223`) und Platzieren/Verschieben: alles bewegt zeichnen, ohne Zwischenspeicher (selten, kurz). Schlüssel der Ebene = `szenenSchluessel(s)` + `tw`, `winkel_rad`, `breite`, `hoehe`, `pixelverhaeltnis` (nicht die Verschiebung). Rand = 25 % je Seite (Fläche 2,25-fach, bei 1688×780 = 3 MP ≈ 12 MB; unter der iOS-Grenze). Verschiebung innerhalb des Randes → nur `auflegen` mit Versatz; außerhalb → neu malen. Bei Zoomen/Drehen wird neu gemalt (gemessen akzeptiert; Bäume über Bildvorlage beschleunigen das). Baum-Bildvorlage: je Variante (2) und `tw` auf ganze Pixel gerundet, höchstens 4 Vorlagen behalten.
**Zeichenreihenfolge ändert sich sichtbar:** Wärmepunkte und Puls liegen künftig über statt unter Gebäuden. → Entscheidung E4 / Designer-Foto.
**Tests (`tests/nr12-ebenen.test.ts`, Node, Aufzeichnungs-Kontext per `Proxy`, der alle Aufrufe mit Argumenten protokolliert; Fabrik liefert solche Kontexte):** `NR12 P3: zweites Bild ohne Änderung malt die ruhende Ebene nicht neu` (Fabrik-Kontext bekommt 0 Befehle); `NR12 P3: Haus bekommt Station → ruhende Ebene neu`; `NR12 P3: Verschiebung um 10 px → nur auflegen, um mehr als den Rand → neu`; `NR12 P3: Zoom → neu`; `NR12 P3: zeichneRuhend ist zeitlos` (Befehlsfolge bei `zeit_s = 0` und `zeit_s = 1,7` und `jetzt_ms + 5000` identisch); `NR12 P3: Befehle je Bild in Ruhe ≤ 3 000 für den großen Stand` (Stand im Test aus `neuerSpielstand` + Leitungen auf allen Straßen, wie in Abschnitt 1); `NR12 P3: Durchsicht-Modus zeichnet ohne Zwischenspeicher`; `NR12 P3: freigeben setzt Fläche auf 0×0`.
**Randfälle:** Größenänderung → alte Fläche freigeben; Besuchsmodus (anderes Dorf → anderer Schlüssel); Wechsel des Pixel-Faktors (Sparmodus) → neu; Leinwand 0×0 beim Start (vor `groesseAnpassen`) → nichts tun.
**Eskalation:** Wenn eine Gebäudeart sich nicht sauber in ruhend/bewegt teilen lässt → diese Art komplett in „bewegt“ lassen und im FERTIG-Bericht nennen, nicht umgestalten. Wenn A88-Nacharbeit gleichzeitig `szene.ts`/`gebaeude.ts` ändert → stoppen.
**Risiko-Auslöser:** nein.

### P4 Messwerkzeug — einfach (Werkzeug außerhalb der Tests, nach Muster `werkzeuge/bildschirmfoto.cjs`)
**Dateien:** neu `werkzeuge/messe-bildrate.cjs`; Abschnitt „NR12 Messung“ in `docs/TESTNACHWEIS.md`.
**Liefert:** `node werkzeuge/messe-bildrate.cjs [--url http://localhost:4317/] [--nur-bericht]` – erwartet laufende Vorschau (`npx vite preview --port 4317`); Ausgabe Tabelle je Fall; Exit 0 nur wenn Z1–Z7 erfüllt (mit `--nur-bericht` immer 0). `require('playwright')` wie im bestehenden Werkzeug; **keine neue Abhängigkeit in package.json**, nicht Teil von `npm test`.
**Technik (so wurde vorher gemessen):** Kontext `viewport 844×390, deviceScaleFactor 3, hasTouch, isMobile`; CDP `Emulation.setCPUThrottlingRate`; per `addInitScript` eigener rAF-Zähler (Bildabstände), `PerformanceObserver('longtask')`, Zählung aller Methoden von `CanvasRenderingContext2D.prototype` (Bild zählt als gezeichnet bei > 0 Befehlen seit dem letzten rAF); CDP `Tracing` (Kategorie `devtools.timeline`) für JS/Bild (`FireAnimationFrame` > 0,3 ms auf `CrRendererMain`); Gesten per `Input.dispatchTouchEvent` (1 Finger verschieben, 2 Finger zoomen+drehen). Großer Spielstand: über den Vite-Dev-Server `import('/src/core/spiel.ts')` und `speichern.ts` erzeugen (Leitung `d40` auf jedes freie Straßenfeld, jedes Haus mit `passendeStation`, 6× `gas` Stufe 3 in `innen`, `namen_gefragt: true`) und per `addInitScript` unter `waermedorf-spielstand-v1` **nur im Testbrowser** setzen; Sparmodus/Weniger Bewegung über `waermedorf-einstellungen-v1` im Testbrowser.
**Tests:** keine Unit-Tests; Nachweis = Lauf vor P1/P3 (alle Z rot außer Z7 Handy) und nach dem Merge (grün), beide Ausgaben in `docs/TESTNACHWEIS.md`.
**Risiko-Auslöser:** nein.

---

## 8. Entscheidungen für Simon

- **E1 Startbildschirm:** (a) **Empfehlung:** nur Ladebalken, einmaliges Logo-Einblenden und leiser Dampf am Schornstein; (b) ganz still bis auf den Ladebalken; (c) Bewegung wie bisher, nur das Spiel darunter ruht.
- **E2 Hintergrund-Animationen im Normalbetrieb** (Rauch, Wärmepunkte, Puls): (a) **Empfehlung:** 30 Bilder/s, Bewegungen der Karte weiter 60; (b) alles 60 (flüssiger, doppelte Last); (c) nur bei Berührung, sonst still.
- **E3 Sparmodus:** (a) **Empfehlung:** Schalter in den Einstellungen plus einmaliger Hinweis, wenn das Gerät ruckelt; (b) bei langsamem Gerät automatisch an; (c) nur Schalter.
- **E4 (Designer):** Wärmepunkte und Interessenten-Leuchten liegen künftig über den Gebäuden statt darunter (Folge der Zwischenspeicherung). Annehmen oder diese Teile weiter jedes Bild komplett zeichnen (kostet den Nutzen von P3 teilweise).

## 9. Prüf-Schwerpunkt (nicht in Anforderungen, trifft echte Nutzer)

1. **Veraltetes Bild nach einer Aktion** (z. B. Station gekauft, Haus sieht weiter kalt aus) – erwartet: nach jeder Spielaktion spätestens im nächsten Bild aktuell; Test P0 (Feldtabelle) + P3 „Haus bekommt Station“.
2. **Handy gedreht / Fenstergröße geändert / Tab zurückgeholt** – erwartet: sofort scharfes, richtig großes Bild, kein Speicheranstieg; P1 (Kamera-Schlüssel), P3 (freigeben).
3. **Sparmodus mitten im Spiel umschalten** – erwartet: Auflösung und Bildrate ändern sich sofort, Kamera bleibt am Ort; P1.
4. **Langer Bau läuft, „Weniger Bewegung“ an** – erwartet: Balken läuft weiter (4 Bilder/s), sonst steht alles; P1 Test Baubalken.
5. **Schnelles Antippen direkt nach dem Vorspann** – erwartet: Karte ist schon gezeichnet (ein vorbereitetes Bild), Tipp trifft; P1 Test „verdeckt → genau ein Bild“.
