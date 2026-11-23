# NR27 – Bahnstrecke und Bahnquerung (Entwurf Architekt, 2026-11-23)

**Auftrag:** Lastenheft NR27 (a)–(h). Simon: „eine Bahnquerung … nach oben hin … ab HZ6 … sehr teuer … bisschen was dazu erklärt“.
**Grundlage:** Stand `1f7d53f`. Code nur gelesen. Einziger Projekt-Eingriff: Architekturtest `tests/architektur/nr27-raster.test.ts` (greift erst ab Paket P1).
**Vorbild:** NR23 (Kartenerweiterung Süd, `neubaugebiet.ts`) und A46 (Fluss + Spülbohrung, `spiel.ts` Z. 591, 1059–1061).

---

## 1. Bestand (was genutzt werden muss)

| Was | Wo | Bedeutung für NR27 |
|---|---|---|
| Feldschlüssel `y*24+x` | 68 Stellen in `src` (spiel.ts 26, szene.ts 15, netz.ts 7, orte.ts 5, speichern.ts 5, …), 95 Stellen in 27 Testdateien | Steht im Spielstand (`gestattungen`, `neubau_strassenluecken`). Darf sich nicht ändern. |
| Rückrechnung Schlüssel → x/y mit `k % N` | 12 Stellen: netz.ts (4), szene.ts (4), ueberlast.ts (2), spiel.ts:993, steuerung.ts:1240, kontext.ts:491, tutorial-netz.ts:11 | Für negatives y falsch (`-19 % 24 = -19`). |
| „Kein Feld“ = `-1`, geprüft mit `>= 0` / `< 0` | rund 45 Stellen: netz.ts (35), engstelle.ts:62, rohrvorschau.ts:38–39, tutorial-netz.ts:33/40, kontext.ts:488, szene.ts:888/936 | Jeder negative Schlüssel würde als „Wurzel/Heizhaus“ gelesen. |
| Belegungskarte `Int32Array(N*MAX_Y)`, gelesen mit `bel[k]` | netz.ts:39–47; Leser in spiel.ts, engstelle.ts, speichern.ts, tutorial-netz.ts, kontext.ts, steuerung.ts | Ein Int32Array verwirft negative Indizes still. |
| Kartengröße | `KONSTANTEN.feldanzahl` 24, `neubau_hoehe` 46 (katalog.ts:339–340); `Spiel.kartenHoehe` (spiel.ts:415) | Breite bleibt fest. Wachstum nur in y-Richtung möglich. |
| Fluss + Spülbohrung | `istFluss`, `bohrungsFelder`, `bohrung_eur`, `ersatzPreis_eur`, `flussGesperrt` (spiel.ts) | **Genau dieses Muster** wird für die Bahn wiederverwendet: Hindernisfelder, Leitung nur mit Freischaltung, Aufpreis je Feld im Bauabschnitt. |
| Freischalt-Leiter | `freischaltung.ts` (AE-A88-1, Architekturtest a88) | `bahnquerung: 6` kommt dorthin; die Meldung „Neu ab Stufe 6: …“ entsteht dann von selbst (`neuBeiStufe`). |
| Erweiterte Karte | `spielOrt()` in neubaugebiet.ts:66 | Einziger Ort, der Straßen/Fluss der Erweiterungen zusammenführt. Die Nordzone hängt sich hier an. |
| Bauzeit Abschnitt | `materialBestellen()` spiel.ts:1364, Text ui/katalog.ts:114 | fest `abschnitt_bau_s`; bekommt einen Querungs-Zuschlag. |
| Spielstand-Version | `SPEICHER_VERSION = 3`, `gueltig()` prüft y nicht | Kein Versionssprung nötig (siehe AE-NR27-7). |
| Recherche | `docs/recherche/bahnquerung.md` (GELB) | Grabenlos, Vertrag mit der Bahn, teurer und langsamer. **Keine Euro- und Zeitwerte belegt.** |

---

## 2. Kernfrage 1: Wie wächst die Karte nach Norden?

| | (a) Alles um K Zeilen nach unten schieben + Umzug | (b) Bahn + Viertel ins heutige Raster | (c) Kulisse oben + eigene Koordinatenzone (z. B. y ≥ 50, oben gezeichnet) | **(d) Negative Zeilen y = −10 … −1, Schlüsselformel bleibt** |
|---|---|---|---|---|
| Idee | Spielstand-Umzug: jedes `o.y += K`, jeder Schlüssel `+= K*24` | Bahn in y = 0–1, Viertel darüber | Viertel liegt in Zeilen hinter dem Neubaugebiet, wird oben gezeichnet; Querung = „Portal“ | Die Karte beginnt bei `KARTE_OBEN_Y = −10`. `y*24+x` ist auch für negatives y eindeutig (x bleibt 0–23). |
| Alte Spielstände | Umzug aller Objekte, Gestattungen, Straßenlücken; Fehler = Datenverlust | – | unverändert | **unverändert, kein Umzug** (alte Stände haben kein y < 0) |
| Code | alle festen Koordinaten (orte.ts, neubaugebiet.ts `y ≥ 24`, Tutorial, Kamera, Start) | – | Nachbarschaft über die Naht in Netz, Platzieren, Zeichnen, Ringprüfung: neue Sonderfälle überall | ~60 Stellen in 11 Dateien, rein mechanisch: 12 Rückrechnungen, ~45 Wächter `-1`, 7 Belegungs-Leser, ~12 Randprüfungen `y < 0` |
| Tests | ~95 Schlüssel-Stellen + Hunderte feste Koordinaten | – | wenig | **2 Zeilen** (Erwartung `feld: -1`, Tester-Vorarbeit) |
| Risiko | hoch (Datenverlust, sehr viel Testumbau) | – | hoch (Netzrechnung an der Naht) | mittel: eine übersehene Stelle rechnet still falsch → abgefangen durch Architekturtest (Muster) **und** Verschiebungstest (gleiches Netz um −20 Zeilen verschoben muss gleich rechnen) **und** den vorhandenen 3.000-Netze-Vergleich (a91-vergleich) |
| Aufwand | sehr groß | – | groß | P1 ≈ 1,5–2 h |
| Ergebnis | verworfen | **nicht möglich**: Dorfstraßen ab y = 0 (Hauptstraße, Ring Ost), Nordring y = 2, Häuser ab y = 2, Hallenbad (3\|3) – kein Platz für Bahn **und** Viertel | verworfen | **Empfehlung** |

Umkehrbar: **nein** (Einbahn). Leitungen und Häuser mit negativem y stehen nach dem ersten Bau im Spielstand. Zurückdrehen hieße Umzug wie (a).

Grenze, die damit festliegt: **Die Breite 24 (x = 0–23) bleibt für immer.** Erweiterungen gehen nur nach Norden (y < −10 durch Vergrößern von `nord_zeilen`) oder Süden (`neubau_hoehe`). Das gilt auch für NR28.

---

## 3. Rückgrat (Festlegungen)

Grundmuster (bleibt): Spiellogik in `src/core` ohne Darstellung. Die Nordzone ist ein **reines Datenmodul** `src/core/nordviertel.ts` (wie `neubaugebiet.ts`). Die Regeln stehen in `spiel.ts` neben der Spülbohrung. Darstellung und Steuerung lesen nur.

Führende Qualitätsziele für NR27:
- **Q1 Alte Spielstände unverändert:** Ein Stand von heute lädt mit Befund `ok`, gleichen Objekten, gleichen Schlüsseln.
- **Q2 Netzrechnung ortsunabhängig:** Ein Netz rechnet in Zeile −10 genauso wie in Zeile 10.
- **Q3 Eine Regel an einer Stelle:** Bahnregel, Preis, Freischaltung, Nordzonen-Daten je genau ein Ort.

| Nr. | Bindet | Verhindert | Regel (prüfbar) | Ziel · Umkehrbar · Folgen |
|---|---|---|---|---|
| **AE-NR27-1** | Karte nach Norden über negative Zeilen; `KONSTANTEN.nord_zeilen = 10`; `KARTE_OBEN_Y = −nord_zeilen` in `src/core/feld.ts` | zweites Koordinatensystem, Umzug alter Stände | In netz.ts kein `y < 0`/`y >= 0` (Architekturtest); obere Grenze überall `KARTE_OBEN_Y` | Q1 · nein · Nachteil: ~60 mechanische Änderungen in einem Paket; die Nordzone ist für **alle** Stände von Anfang an da (die Karte wird für alle 10 Zeilen höher) |
| **AE-NR27-2** | Schlüssel → x/y nur über `feldVon(k)` aus feld.ts | falsches x für y < 0 | kein `% N`, `Math.floor(k / N)`, `(k - x) / N` außerhalb feld.ts (Architekturtest) | Q2 · ja (billig) · Nachteil: ein Import mehr in 7 Dateien |
| **AE-NR27-3** | „Kein Feld / direkt am Heizhaus“ = `KEIN_FELD` (= −1.000.000) aus feld.ts | Nordschlüssel werden als Wurzel gelesen | kein `-1`-Wächter, kein `p >= 0`/`f < 0`/`.feld >= 0` (Architekturtest) | Q2 · ja · Nachteil: 2 bestehende Tests müssen vorher umgestellt werden (Vorarbeit) |
| **AE-NR27-4** | Belegungskarte nur über `belegtId(bel, k)` aus netz.ts; Index intern `k − KARTE_OBEN_Y*N` | stilles Verwerfen negativer Indizes | kein `bel[`/`belegung[` außerhalb netz.ts (Architekturtest) | Q2 · ja · Nachteil: Karte 10 Zeilen größer (1.344 statt 1.104 Felder), vernachlässigbar |
| **AE-NR27-5** | Nordzone (Bahnzeilen, Brücke, Straßen, Fluss, Hausplan, Kulisse, „Querung gebaut?“, Wissenstext) nur in `src/core/nordviertel.ts`; importiert nur katalog/typen/freischaltung/feld | verstreute Bahn-Koordinaten, Kreis-Abhängigkeit zu spiel.ts | Architekturtest Importe; Konsistenztest P3: alle Nordkoordinaten ≥ `KARTE_OBEN_Y` | Q3 · ja · Nachteil: Hausplan ist Spielinhalt im Kern (wie NR23) |
| **AE-NR27-6** | Querung = **Leitung auf Bahnfeldern** (Muster Spülbohrung), kein eigenes Bauwerk-Objekt. Aufpreis `querung_eur_je_feld` je Bahnfeld im Abschnitt; Bauzeit-Zuschlag `querung_bau_s` für den ganzen Abschnitt; Länge = Zahl der Bahnzeilen (2 Felder = 20 m) | ein zweites Objekt auf demselben Feld (Belegungskarte kennt nur eins), Sonderwege in der Netzrechnung | `abschnittKosten_eur`, `ersatzPreis_eur` enthalten den Aufpreis; `gestattungsFelder` zählt Bahnfelder nicht; Netz (netz.ts) kennt keine Bahn | Q3 · ja (Leitungen auf Bahnfeldern ließen sich später in ein Bauwerk umdeuten) · Nachteil: der Zuschlag verlängert auch den restlichen Abschnitt |
| **AE-NR27-7** | Spielstand: neues optionales Feld `nordviertel?: true` (Viertel erschlossen); `Abschnitt.mit_querung?: true`; **kein** Versionssprung | Umzugslogik | Altstand-Test: Befund `ok`, Objekte gleich | Q1 · ja · Nachteil: die Häuser im Norden haben in alten und neuen Ständen andere IDs (egal, IDs sind nur Nummern) |
| **AE-NR27-8** | Häuser hinter der Bahn sind **Kulisse** (nur gezeichnet, keine Objekte), bis eine Querung gebaut ist; dann `nordviertelAnlegen()` als Bestandshäuser `ohne_station` | Interessenten, Kundenanfragen, Ziele greifen auf unerreichbare Häuser zu | Vor der Querung keine Objekte mit y ≤ −4; danach 14 | Q3 · ja · Nachteil: zweiter Zeichenweg für Häuser (Kulisse) |
| **AE-NR27-9** | Hinter der Bahn (y ≤ −4) darf **nichts** gebaut werden, bevor die Querung steht (auch keine Leitung) → „erst Querung, dann Viertel“, zwei Bauabschnitte | Leitungen auf späteren Hausplätzen; Insel-Netze mit eigener Quelle hinter der Bahn | `kannPlatzieren` false + Hinweistext | Q3 · ja · Nachteil: man kann Querung und Viertel nicht in einem Abschnitt zeichnen (bewusst: die Bahn genehmigt zuerst) |
| **AE-NR27-10** | Auf Bahnfeldern: nur Leitungen, nur quer (kein Leitungsnachbar links/rechts auf einem Bahnfeld), keine Leitung auf der Bahnbrücke (x = 19–20) | Leitung „entlang der Gleise“, Querung über die Flussbrücke | Tests in P3 | Q3 · ja · Nachteil: zwei Querungen brauchen mindestens eine Spalte Abstand |
| **AE-NR27-11** | Express ist für einen Abschnitt mit Querung gesperrt | Bauzeit der Querung per Aufpreis wegkaufen (verletzt (c) „braucht Bauzeit“) | Test P3 | Abwägungspunkt (Spielspaß gegen Fachaussage „Bahn prüft, das dauert“) · ja · Nachteil: einziger Abschnitt ohne Express |

Konventionen: Einheiten im Namen (`querung_eur_je_feld`, `querung_bau_s`, `laenge_m` = Felder × `feldlaenge_m`). Fehler sichtbar: jede Ablehnung als Hinweis mit Grund, kein stilles Nichtstun.

**Zurückgestellt:** eigener Kamera-Knopf „Zur Bahn“ (Designer entscheidet nach Foto); Bahnübergang/Straße über die Gleise (nur Grafik, nicht in den Daten); Zug-Animation.
**Nicht-Ziel:** Leitung oberirdisch über die Bahn (Recherche Satz 4) – eine zweite Bauart verdoppelt Regeln und Texte ohne Spielgewinn.

### Kartenzeilen der Nordzone (vorläufig, Designer darf in nordviertel.ts verschieben, solange die Tests halten)
```
      x 012345678901234567890123
  y=-10 ..........=........~~...   Gärten / Kartenrand (Stichstraße x=10 führt aus der Karte)
  y=-9  ..E.R.R.E.=.R.R.E..~~...   Hausreihe Nord
  y=-8  ..........=........~~...   Vorgärten
  y=-7  .=================.~~...   Wohnstraße
  y=-6  ...................~~...   Vorgärten
  y=-5  ..R.E.R.R...E.R.R..~~...   Hausreihe Süd
  y=-4  ...................~~...   Böschung (hinter der Bahn, gesperrt bis Querung)
  y=-3  ######################## Bahn (x=19–20 Brücke)
  y=-2  ######################## Bahn
  y=-1  ...................~~...   Grünstreifen (Dorfseite, normal bebaubar)
  y=0   (heutiger Nordrand des Dorfs)
```
14 Häuser (6 EFH, 8 RH), gleiche Grundstücksregel wie NR23 (Vorgarten, Haus, Garten; 1 Feld Abstand). Bedarf mit den Werten aus NR23 Abschnitt 3: 6 × 15.000 + 8 × 24.000 = 282.000 kWh/a, Anschlussleistung ÷ 1.500 h = 188 kW. Liste zum Abtippen:
```
efh 2 -9, rh 4 -9, rh 6 -9, efh 8 -9, rh 12 -9, rh 14 -9, efh 16 -9,
rh 2 -5, efh 4 -5, rh 6 -5, rh 8 -5, efh 12 -5, rh 14 -5, rh 16 -5
```

---

## 4. Kernfrage 3: Bezug zu Stufe 6 und Neubaugebiet Süd

- **Keine Kollision der Koordinaten:** Süd wächst bei Stufe 6 auf y < 46 (`kartenHoehe`), Nord ist immer y ≥ −10 (`KARTE_OBEN_Y`). Beide Grenzen sind unabhängig; Kamera und Boden nutzen beide.
- **Gleichzeitige Freischaltung:** Bei Stufe 6 erscheint „Neubaugebiet Süd erschlossen …“ und „Neu ab Stufe 6: Neubaugebiet Süd, Bahnquerung“. Das ist gewollt: zwei Wege, der Spieler wählt. Die Reihenfolge ergibt sich aus dem Preis (Süd = Straßenleitungen, Nord = ~90.000 € Querung). Keine Sperre „erst Süd“ – Simon sagte „ab HZ6“.
- **Leistung:** Süd 576 kW (NR23), Nord 188 kW. Ob Stufe 6 beides trägt, ist Spielbalance → Bitte an Projektleiter, beim Testlauf prüfen (siehe Unsichere Beobachtungen: Leitungs-Stückzahlgrenze 240).

---

## 5. Pakete (Plan-Abschnitt 5)

| Paket | Inhalt | Dateien | Abhängig von | Parallel mit | Schwierigkeit |
|---|---|---|---|---|---|
| **P1 Raster nach Norden** | feld.ts, Rückrechnung, `KEIN_FELD`, `belegtId`, Netzgrenzen. Keine sichtbare Änderung. | neu: `src/core/feld.ts`, `tests/nr27-raster.test.ts`; ändern: katalog.ts (1 Zeile), netz.ts, engstelle.ts, rohrvorschau.ts, tutorial-netz.ts, spiel.ts (nur Belegungs-Leser + Z. 993), speichern.ts (1 Leser), ui/kontext.ts (Z. 488–491), render/szene.ts (Z. 777, 888, 934–937), render/ueberlast.ts (Z. 40, 55), steuerung.ts (Z. 1240 + Belegungs-Leser) | Tester-Vorarbeit V1 | P2 | **schwer** – Netzrechnung, stille Fehler möglich |
| **P2 Nordzone-Daten** | nordviertel.ts, Freischaltung, Typen, `spielOrt` | neu: `src/core/nordviertel.ts`, `tests/nr27-nordzone-daten.test.ts`; ändern: freischaltung.ts, orte.ts (Typ `Ort`), neubaugebiet.ts (`spielOrt`), typen.ts | – | P1 | **einfach** – Daten und kleine reine Funktionen |
| **P3 Bahnregeln im Kern** | Platzieren, Preis, Bauzeit, Express, Erschließen, Wissenstext, Bauen-Blatt | ändern: spiel.ts, katalog.ts (KONSTANTEN), nordviertel.ts (1 Zeile), typen.ts (`Abschnitt`), ui/katalog.ts (Z. 100, 114); neu: `tests/nr27-bahnquerung.test.ts` | P1, P2 | P4 | **schwer** – Fachregeln, Kosten, Spielstand |
| **P4 Darstellung und Bedienung** | Gleise, Kulisse, Boden/Kamera nach Norden, Antippen | ändern: render/szene.ts, render/szene-schluessel.ts, render/kamera.ts, steuerung.ts; neu: `tests/nr27-darstellung.test.ts` | P1, P2 | P3 | **mittel** – Zeichnen, keine Fachlogik |

Kritischer Pfad: V1 → P1 → P3 (P2 läuft neben P1, P4 neben P3). 2 von 4 Paketen liegen hintereinander.
Gemeinsame Ressourcen: keine (kein Port, keine Datei doppelt innerhalb einer Parallelstufe; katalog.ts/typen.ts/steuerung.ts/szene.ts nur in Paketen verschiedener Stufen).

### Vorarbeit (nicht für den Entwickler)
- **Tester-Vorarbeit V1 (vor P1, eigener Commit):** zwei Erwartungen auf „kein Leitungsfeld“ umstellen, ohne das neue Modul zu importieren (damit main vor P1 grün bleibt):
  - `tests/nr18-engstelle-kern.test.ts` Z. 182 `expect(netz.anschluss.get(amHeizhaus)?.feld).toBe(-1)` → Tiefe 0 und `netz.tiefe.has(feld) === false` prüfen.
  - `tests/a91-anschluss.test.ts` Z. 184 `toEqual({ feld: -1, tiefe: 0 })` → ebenso.
- **Architekt-Vorarbeit:** keine. `tests/architektur/nr27-raster.test.ts` liegt schon (siehe Abschnitt 8).
- `tests/ohne-leiter.ts` muss **nicht** angepasst werden: `bahnquerung` fehlt dort → Stufe 1; diese Tests zeichnen nie auf y < 0.

---

## 6. Baupläne

### P1 – Raster nach Norden
**Ziel:** Die Kernrechnung funktioniert für Felder mit y = −10 … −1 genauso wie heute. Spielerisch ändert sich nichts (`kannPlatzieren` lehnt y < 0 weiter ab – das öffnet erst P3).

**Liefert** (`src/core/feld.ts`, importiert nur `./katalog`):
- `export const KARTE_OBEN_Y: number` (= `-KONSTANTEN.nord_zeilen`)
- `export const KEIN_FELD = -1_000_000`
- `export function feldVon(k: number): [number, number]` – x immer 0–23 (`((k % N) + N) % N`), y = `(k - x) / N`
- `export function schluessel(x: number, y: number): number` – `y * N + x` (Inline-Formel bleibt erlaubt, sie ist für negatives y richtig)

In `src/core/netz.ts`:
- `belegungskarte()` → Größe `N * (MAX_Y - KARTE_OBEN_Y)`, Grenzen `y >= KARTE_OBEN_Y`
- `export function belegtId(bel: Int32Array, k: number): number` – 0 außerhalb der Karte
- alle `-1`-Wächter → `KEIN_FELD`; `anschluss.feld` „direkt am Heizhaus“ = `KEIN_FELD`; alle `ny < 0` → `ny < KARTE_OBEN_Y`

`KONSTANTEN.nord_zeilen: 10` (katalog.ts, neben `neubau_hoehe`).

**Tests** (`tests/nr27-raster.test.ts`):
- `test_nr27_feldVon_umkehr`: für alle x 0–23, y −10 … 45 gilt `feldVon(y*24+x)` = `[x, y]`; `feldVon(-1)` = `[23, -1]`; `KEIN_FELD` ist kein Schlüssel dieses Bereichs.
- `test_nr27_belegung_nord`: Haus auf (5\|−10) und (5\|45) → `belegtId` liefert beide IDs; (5\|−11) und (5\|46) → 0.
- `test_nr27_verschiebung_netz`: ein Netz mit Heizzentrale, Abzweigen, Engstelle, Puffer, Quelle an Leitung in Zeilen 2–9 rechnen; dasselbe Netz um −12 Zeilen verschoben rechnen. Gleich sein müssen: `warm`, `kalt`, `verfuegbar_kw`, `last_kw`/`tiefe`/`eltern` (Schlüssel verschoben, `KEIN_FELD` bleibt), `engpass`, `reduzierung`, `aufteilung`, `engstellenFinden(...)`, `rohrVorschau(...)`.
- Bestehende Tests bleiben grün, besonders `tests/a91-vergleich.test.ts` (3.000 Netze) und alle `nr18-*`, `nr24-*`.
- Architekturtest `tests/architektur/nr27-raster.test.ts` muss grün werden.

**Randfälle:** Haus direkt am Heizhaus (`KEIN_FELD`); Puffer (`feld: KEIN_FELD`); Schleifen in `engstelle.ts`/`rohrvorschau.ts`, die bis zur Wurzel laufen (`?? KEIN_FELD` statt `?? -1`, Abbruch bei `=== KEIN_FELD`).
**Eskalation:** Wenn der Verschiebungstest nur mit Änderung an einem Rechenergebnis grün wird → stoppen, Projektleiter.
**Risiko-Auslöser:** nein (keine Daten von außen, keine Anmeldung, keine Geheimnisse).

### P2 – Nordzone-Daten
**Liefert** (`src/core/nordviertel.ts`; Importe nur katalog, typen, freischaltung, feld – feld erst nach P1, vorher nicht nötig):
- `export const BAHN_ZEILEN_Y: readonly number[] = [-3, -2]`
- `export const BRUECKE_X: readonly number[] = [19, 20]`
- `export const NORD_PLAN: ReadonlyArray<{ typ: TypId; x: number; y: number }>` – die 14 Häuser aus Abschnitt 3
- `export function bahnFelder(): Array<[number, number]>` – alle x 0–23 in beiden Bahnzeilen (Brücke eingeschlossen)
- `export function nordStrassen(): Array<[number, number]>`, `export function nordFluss(): Array<[number, number]>` – Fluss x = 19/20 für y = −10 … −1 **ohne** Bahnzeilen (dort Brücke)
- `export function istBahn(x: number, y: number): boolean`, `export function istBruecke(x: number, y: number): boolean`
- `export function hinterDerBahn(y: number): boolean` – y ≤ −4
- `export function nordKulisse(stand: Pick<Spielstand, 'nordviertel'>): ReadonlyArray<{ typ: TypId; x: number; y: number }>` – `NORD_PLAN`, solange nicht erschlossen, sonst leer
- `export function querungGebaut(objekte: ReadonlyArray<Objekt>): boolean` – es gibt eine Spalte x, in der auf **jeder** Bahnzeile eine gebaute (`!geplant`) Leitung liegt
- `export function nordviertelAnlegen(stand: Spielstand): boolean` – einmalig (Merker `nordviertel`); stellt `NORD_PLAN` als `{ bestand: true, ohne_station: true, zufriedenheit_pct: 80, kasse_eur: 0, bau: null, stufe: 1 }` mit neuen IDs auf; ein belegter Platz wird übersprungen; gibt zurück, ob angelegt wurde
- `export function nordInfo(stand: Spielstand, x: number, y: number): string | null` – Text für Antippen eines Bahnfelds oder Kulissenhauses (vor Stufe 6: „Hinter der Bahn liegt ein Wohngebiet. Hin kommst du nur mit einer Bahnquerung – ab Heizzentrale Stufe 6.“; danach: „Zeichne in einem Bauabschnitt eine Leitung quer über die Gleise. Erst wenn die Querung gebaut ist, geht es dahinter weiter.“); sonst `null`
- `export const QUERUNG_WISSEN: readonly string[]` – vorläufig die Sätze 1 und 3 aus `docs/recherche/bahnquerung.md` („Eine Bahnstrecke wird nicht aufgegraben. Die Leitung wird unter den Gleisen durchgepresst oder gebohrt, damit der Zug weiterfahren kann und sich die Schienen nicht senken.“ / „Bevor gebaut wird, braucht ihr einen Vertrag mit der Bahn. Die Bahn prüft den Plan genau, das dauert.“). **Endfassung: Fachprüfer, dann Simon** (Abnahme (d)).

Weitere Änderungen:
- `freischaltung.ts`: `Funktion` um `'bahnquerung'`; `FREISCHALTUNGEN.bahnquerung: 6`; `FUNKTION_NAME.bahnquerung: 'Bahnquerung'`.
- `orte.ts`: `Ort` bekommt `bahn?: Array<[number, number]>` (Kommentar: „Bahnfelder: nichts bauen, Leitungen nur quer per Bahnquerung (NR27)“).
- `neubaugebiet.ts` `spielOrt()`: hängt **immer** (auch ohne Neubaugebiet) `nordStrassen()`, `nordFluss()` an und setzt `bahn: bahnFelder()`; Cache-Schlüssel bleibt gültig, weil die Nordzone fest ist.
- `typen.ts`: `Spielstand.nordviertel?: true` (Kommentar „NR27: Wohngebiet hinter der Bahn erschlossen“); Kommentar an `Netz.anschluss` „KEIN_FELD (feld.ts) = direkt am Heizhaus“.

**Tests** (`tests/nr27-nordzone-daten.test.ts`):
- `test_nr27_a_plan`: 14 Häuser, 6 EFH / 8 RH; kein Haus auf Straße, Fluss oder Bahn; alle y in −9 … −5; Chebyshev-Abstand ≥ 2 zwischen Häusern; jedes Haus hat ein freies Nachbarfeld, das an eine Straße grenzt.
- `test_nr27_e_flaechen_getrennt`: Bahn ∩ Straßen = ∅, Bahn ∩ Fluss = ∅; Brücke ⊂ Bahn.
- `test_nr27_f_querung_gebaut`: geplante Leitungen → false; nur eine Bahnzeile → false; zwei Zeilen in verschiedenen Spalten → false; beide Zeilen in Spalte 10 gebaut → true.
- `test_nr27_f_anlegen_einmal`: zweimal `nordviertelAnlegen` → 14 neue Objekte, `naechste_id` +14, zweiter Aufruf false.
- `test_nr27_b_freischaltung`: Stufe 5 → `sperrgrund(stand,'bahnquerung')` = „ab Heizzentrale Stufe 6“; Stufe 6 → frei; `neuBeiStufe(6)` enthält `neubaugebiet` und `bahnquerung`.
- `test_nr27_a_spielort`: Stand ohne Neubaugebiet → `spielOrt(stand).bahn` hat 48 Felder, Straßen enthalten (1\|−7).
- `test_nr27_info`: `nordInfo` auf Bahnfeld vor/nach Stufe 6, auf Kulissenhaus, auf (5\|5) → null.

**Eskalation:** Wenn der Hausplan mit der Designer-Gestaltung nicht passt → nur die Liste ändern, Tests behalten; mehr als 2 Zeilen Nordzone nötig → Projektleiter (dann `nord_zeilen` in P1 anpassen).
**Risiko-Auslöser:** nein.

### P3 – Bahnregeln im Kern
**Nutzt:** alles aus P1 (`KARTE_OBEN_Y`, `feldVon`, `KEIN_FELD`, `belegtId`) und P2 (`istBahn`, `istBruecke`, `hinterDerBahn`, `querungGebaut`, `nordviertelAnlegen`, `QUERUNG_WISSEN`, `BAHN_ZEILEN_Y`).

**Liefert** (Klasse `Spiel`):
- `get kartenOben(): number` – `KARTE_OBEN_Y`
- `istBahn(x: number, y: number): boolean`
- `querungsFelder(): number[]` – Schlüssel geplanter Leitungen auf Bahnfeldern
- `querung_eur(): number` – `querungsFelder().length * KONSTANTEN.querung_eur_je_feld`
- `abschnittBau_s(): number` – `abschnitt_bau_s + (Abschnitt hat geplante Leitung oder Ersatz auf Bahnfeld ? querung_bau_s : 0)`

`KONSTANTEN` (katalog.ts), beide **PLATZHALTER-Spielwerte** (Recherche fand keine Euro/Zeit; Wert setzt Projektleiter/Simon):
- `querung_eur_je_feld: 45000` – Kommentar „NR27 PLATZHALTER: Querung je Bahnfeld, grabenlos mit Bahnvertrag; Spielwert ohne Beleg (docs/recherche/bahnquerung.md Abschnitt 3)“
- `querung_bau_s: 1440` – Kommentar „NR27 PLATZHALTER: Zuschlag auf die Abschnitts-Bauzeit (Prüfung durch die Bahn); Spielwert ohne Beleg“

Regeln:
1. Private `nordSperre(t: TypId, x: number, y: number): string | null`, genutzt von `kannPlatzieren` (false bei Text) **und** `platzieren` (Text als Hinweis, vor „Hier ist kein Platz“):
   - Bahnfeld + keine Leitung → „Auf den Gleisen kann nichts gebaut werden“
   - Bahnfeld + Leitung + gesperrt → Sperrtext `bahnquerung` („Bahnquerung ab Heizzentrale Stufe 6“)
   - Brücke → „Über die Bahnbrücke führt keine Leitung“
   - Bahnfeld + Leitung links oder rechts auf einem Bahnfeld (geplant oder gebaut) → „Unter der Bahn geht es nur quer hindurch, nicht entlang der Gleise“
   - `hinterDerBahn(y)` und nicht `stand.nordviertel` → „Hinter der Bahn geht es erst weiter, wenn eine Bahnquerung gebaut ist“
2. `kannPlatzieren`: obere Grenze `y < KARTE_OBEN_Y` statt `y < 0`; ebenso `spiel.ts` Z. 1218 und 1253.
3. `gestattungsFelder()` ohne Bahnfelder; `abschnittKosten_eur()` + `querung_eur()`; `ersatzPreis_eur()` + `querung_eur_je_feld` auf Bahnfeld (wie Spülbohrung).
4. `materialBestellen()`: `this.neuerBau('neu', this.abschnittBau_s())` (Tutorial-Zweig unverändert); bei Querung `a.mit_querung = true` (`Abschnitt.mit_querung?: true` in typen.ts).
5. `expressLiefern()`: bei `a.mit_querung` → „Die Prüfung durch die Bahn lässt sich nicht beschleunigen“.
6. Nach Fertigstellen eines Abschnitts **und** im Konstruktor: `if (!stand.nordviertel && querungGebaut(stand.objekte) && nordviertelAnlegen(stand))` → Hinweis „Bahnquerung fertig · Das Wohngebiet hinter der Bahn ist erreichbar“, `neuBerechnen()`.
7. Erste Leitung auf einem Bahnfeld im laufenden Abschnitt (danach `querungsFelder().length === 1`) → `sagt(ABSCHNITT_HELFER.planung, QUERUNG_WISSEN.join(' '))`. Keine Merke im Spielstand.
8. `nordviertel.ts`: eigene Untergrenze −10 durch `KARTE_OBEN_Y` ersetzen.
9. `ui/katalog.ts` Z. 100: Zeile „Über die Bahn kommst du nur mit einer Bahnquerung (… je Feld, aktuell …)“, nur wenn `sp.freigeschaltet('bahnquerung')`; Z. 114: „… dazu eine Bahnquerung (…)“ und Bauzeit aus `sp.abschnittBau_s()` statt `KONSTANTEN.abschnitt_bau_s`.

**Tests** (`tests/nr27-bahnquerung.test.ts`; Erwartungswerte aus den Konstanten, keine eigenen Rechenwerte):
- `test_nr27_b_gesperrt_vor_stufe6`: Stufe 5, offener Abschnitt, `platzieren('d90', 10, -2)` → `ok: false`, Hinweis enthält „ab Heizzentrale Stufe 6“.
- `test_nr27_b_frei_ab_stufe6`: Stufe 6 → ok; `querungsFelder()` = `[-2*24+10]`.
- `test_nr27_c_teurer`: `querung_eur_je_feld >= 4 * bohrung_eur_je_feld`; Abschnitt mit (10\|−1),(10\|−2),(10\|−3): `abschnittKosten_eur()` = Material + 2 × `querung_eur_je_feld` (+ Gestattung nur für (10\|−1), falls nicht Straße); **Kasse:** 2 × `querung_eur_je_feld` + 3 × teuerste bei Stufe 6 freie Leitung + `abschnitt_planung_eur` ≤ `grundkasse_eur`.
- `test_nr27_c_bauzeit`: nach `materialBestellen` gilt `ende_ms − start_ms = (abschnitt_bau_s + querung_bau_s) × bauzeit_faktor × 1000`; ohne Bahnfeld unverändert `abschnitt_bau_s × …`.
- `test_nr27_c_express_gesperrt`.
- `test_nr27_d_wissenstext`: erste Bahnleitung → genau ein `sprecher`-Ereignis mit `QUERUNG_WISSEN`; zweite im selben Abschnitt → keins.
- `test_nr27_e_nur_quer`: (10\|−2) geplant, dann (11\|−2) → abgelehnt mit „nur quer“; (19\|−2) → Brücke; `kannPlatzieren('baum', 5, -2)` und `('efh', 5, -3)` → false.
- `test_nr27_e_kein_weg_vorbei`: vor Erschließung `platzieren('d50', 10, -4)` → abgelehnt mit „erst weiter, wenn eine Bahnquerung gebaut ist“; auch `kannPlatzieren('solar', 5, -6)` → false.
- `test_nr27_f_erschliessen`: Querung bauen, Zeit bis Bauende vorspulen → `stand.nordviertel === true`, 14 Häuser mit y ≤ −5, alle `ohne_station`; danach `platzieren('d50', 10, -4)` im neuen Abschnitt → ok; Neuladen (`serialisieren` → `laden` → `new Spiel`) legt nichts doppelt an.
- `test_nr27_g_alter_stand`: ein Stand von heute (Stufe 6, Neubaugebiet Layout 3, ohne `nordviertel`) → `ladenMitBefund` Befund `ok`, Objektliste gleich, kein Objekt mit y < 0, `kartenOben === -10`.
- `test_nr27_ersatz_unter_bahn`: Ersatz einer gebauten Leitung auf (10\|−2) kostet zusätzlich `querung_eur_je_feld` und verlängert den Abschnitt um `querung_bau_s`.
- `test_nr27_konsistenz`: alle Felder aus `bahnFelder()`, `nordStrassen()`, `nordFluss()`, `NORD_PLAN` haben y ≥ `KARTE_OBEN_Y` und y < 0.

**Randfälle:** Querung gebaut, aber ohne Verbindung zur Heizzentrale → Viertel trotzdem erschlossen, Häuser bleiben kalt. Querungs-Leitung später entfernt → Häuser bleiben stehen (`nordviertel` bleibt), werden getrennt; kein Fehler. Kasse reicht nicht → übliche Meldung „Es fehlen … €“ bei `materialBestellen`. Ziehen mit dem Finger über Bahn und weiter nach Norden → die Leitung endet am letzten Bahnfeld, der Hinweis erscheint (kein stilles Abbrechen).
**Eskalation:** Wenn Leitungen in der Bau-Phase nicht mehr `geplant` sind und dadurch Bauzeit oder Express anders wirken als beschrieben → `mit_querung` als einzige Quelle nutzen und im Bericht nennen. Wenn ein bestehender Test eine andere Bauzeit/Kosten erwartet → stoppen (Tester-Vorarbeit).
**Risiko-Auslöser:** nein (Spielregeln, keine Daten von außen; Spielstand nur um optionale Felder erweitert).

### P4 – Darstellung und Bedienung
**Nutzt:** `KARTE_OBEN_Y`, `feldVon` (P1); `spielOrt(stand).bahn`, `nordKulisse(stand)`, `nordInfo(stand, x, y)` (P2). **Nicht** die neuen `Spiel`-Methoden aus P3 (läuft parallel).

**Liefert:**
- `Szene` (szene.ts): `bahn?: ReadonlyArray<[number, number]>`, `kulisse?: ReadonlyArray<{ typ: TypId; x: number; y: number }>`, `kartenOben?: number`.
- Boden ab `kartenOben − WIESENRAND`; `GRAS` mit `N * (neubau_hoehe + nord_zeilen)` Einträgen, Index `(y − KARTE_OBEN_Y) * N + x`; Randprüfungen Z. 121, 271, 818 mit `kartenOben`.
- Gleise auf Bahnfeldern (Schotter, zwei Schienenpaare, Schwellen), Brücke über dem Fluss – Stil vom Designer (`docs/DESIGN.md`).
- Kulissenhäuser mit dem vorhandenen Hauszeichner, nicht antippbar wie Kunden (Gestaltung: Designer).
- `szene-schluessel.ts`: `bahn` und `kulisse` gehen in den Schlüssel der festen Ebene ein (sonst bleibt nach der Erschließung die Kulisse stehen).
- `Kamera.kartenOben: number` (kamera.ts); `begrenzen()` erlaubt den Bereich `kartenOben … kartenHoehe`.
- `steuerung.ts`: übergibt `bahn`, `kulisse`, `kartenOben` an Szene und Kamera; Grenzen Z. 620/626 mit `KARTE_OBEN_Y`; Antippen eines Feldes ohne Objekt → `nordInfo(...)` ≠ null → als Hinweis zeigen (vorhandener Hinweisweg).

**Tests** (`tests/nr27-darstellung.test.ts`, mit dem Zeichen-Protokoll wie in `nr20-*-darstellung`/`nr12-ebenen`):
- `test_nr27_a_gleise`: Szene mit `bahn` zeichnet in den Bahnzeilen etwas, ohne `bahn` nicht.
- `test_nr27_a_kulisse`: `kulisse` mit 14 Häusern wird gezeichnet; leere Kulisse → Schlüssel der festen Ebene ändert sich.
- `test_nr27_a_boden_nord`: Boden für y = −10 nutzt `GRAS` ohne `undefined` (kein Absturz bei y < 0).
- `test_nr27_kamera_nord`: bei Zoom 2,2 lässt sich (10\|−7) in die Bildmitte holen; (10\|45) bei Stufe 6 weiterhin.
- `test_nr27_antippen`: Antippen (5\|−9) ohne Objekt → Hinweis = `nordInfo(stand, 5, -9)`.

**Randfälle:** Hochformat-Hinweis unverändert; Winter (Schneefall über die volle Höhe `kartenOben … kartenHoehe`); 60 Bilder/s beim Ziehen (10 Zeilen mehr Boden).
**Eskalation:** Wenn die Kamera-Grenze nur mit Änderung der Mitte (`c = (N − 1) / 2`) geht und dadurch alte Kamerafahrten (Neubaugebiet, Tutorial) wandern → stoppen.
**Risiko-Auslöser:** nein.

---

## 7. Prüf-Schwerpunkt (nicht ausdrücklich in NR27, trifft echte Spieler)
| # | Eingabe | Erwartet | Test in |
|---|---|---|---|
| 1 | In einem Zug über die Bahn und weiter ins Viertel ziehen | Leitung endet am letzten Bahnfeld; Hinweis „erst weiter, wenn eine Bahnquerung gebaut ist“ | P3 |
| 2 | Längs über die Gleise ziehen | abgelehnt mit „nur quer“, vorhandene Felder bleiben | P3 |
| 3 | Querung gebaut, aber nicht ans Netz angeschlossen | Viertel erschlossen, Häuser kalt, keine Fehlermeldung | P3 |
| 4 | Querungs-Leitung wieder entfernen | Häuser bleiben, sind getrennt; kein Absturz | P3 |
| 5 | Alter Stand mit Stufe 6 laden | Bahn und Kulisse sichtbar, Querung sofort zeichenbar, Befund `ok` | P3 (Kern), P4 (Bild) |

## 8. Architekturtest
`tests/architektur/nr27-raster.test.ts` (geschrieben, greift ab `src/core/feld.ts`): Rückrechnung nur in feld.ts (AE-NR27-2), kein `-1`-/`< 0`-Wächter (AE-NR27-3), Belegung nur über `belegtId` (AE-NR27-4), netz.ts ohne `y < 0` (AE-NR27-1), feld.ts importiert nur katalog, nordviertel.ts nur katalog/typen/freischaltung/feld (AE-NR27-5). Jede Meldung nennt AE-Nummer, Fundstelle und erlaubten Weg.

## 9. NR28 (Tal, Höhenübergabe, Druck) – nicht verbaut
Das Tal muss in **y-Richtung** liegen (nördlich hinter dem Nordviertel durch größeres `nord_zeilen`, oder im Süden über `neubau_hoehe`), weil die Breite 24 fest ist (AE-NR27-1). Geländehöhe wird dann – wie die Bahn – ein Datenmodul (`gelaende_hoehe_m(x, y)`), nicht ein Feld im Spielstand. Der Druck (`druck_bar`) wird eine eigene Kernrechnung, die über die vorhandenen `eltern`/`tiefe`-Wege des Netzes läuft; dafür ist die ortsunabhängige Netzrechnung aus P1 (Verschiebungstest) die Voraussetzung. Die Höhenübergabe wird ein eigener Objekttyp, der das Netz in zwei Druckzonen teilt – das ist bewusst **anders** als die Bahnquerung (dort reicht eine Leitung mit Aufpreis, AE-NR27-6); NR27 legt dazu nichts fest. Netz.ts bleibt bahnfrei, damit NR28 dort nur eine Regel hinzufügt.
