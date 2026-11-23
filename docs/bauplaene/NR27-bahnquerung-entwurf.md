# NR27 – Bahnstrecke und Bahnquerung (Bauplan Architekt, Fassung 3, 2026-11-23)

**Auftrag:** Lastenheft NR27 (a)–(h). Simon: „eine Bahnquerung … nach oben hin … ab HZ6 … sehr teuer … bisschen was dazu erklärt“.
**Grundlage:** Stand `e121764`. Code nur gelesen. Projekt-Eingriff des Architekten: `tests/architektur/nr27-raster.test.ts` (verschärft, greift ab P1 bzw. P2).
**Eingearbeitet:** Kritiker F1 (`docs/pruefberichte/20261123-kritiker-nr27-plan-f1.md`, Befunde 1–7 und Rückfragen), Entscheidungen 2026-11-23 (`docs/ENTSCHEIDUNGEN.md` am Ende), Fachprüfer (`docs/pruefberichte/20261123-fachpruefer-nr27-plan.md`, F1–F6; Texte `docs/recherche/bahnquerung-texte.md`).
**Gestaltung:** Alles Aussehen (Farben, Maße, Zug, Dunst, Masten, Baustelle, Erklärkarte, Erfolgsmoment) steht in `docs/DESIGN.md` Abschnitt 14 (Designer überarbeitet 14.2/14.5–14.7 auf diese Geometrie, Variante A). Dieser Bauplan nennt nur, **wer** was baut und welche Daten es gibt.

### Was sich gegenüber Fassung 2 geändert hat
| Kritiker | Änderung |
|---|---|
| 1 Geometrie | gilt wie Abschnitt 3 (10 Zeilen, 14 Häuser, kein MFH, Stichstraße x = 10); Querung genau an x = 10 (AE-NR27-10) |
| 2 Umfang/Texte | neues Paket **P5 Inszenierung**; **eine** Texttabelle `src/core/nord-texte.ts` (AE-NR27-12), Architekturtest |
| 3 Fachtexte | Schalter `NORD_FACHTEXTE_FREIGEGEBEN = false`, Architekturtest + Test (AE-NR27-13); Fachregeln BQ1–BQ3 an Simon |
| 4 weitere Schlüssel-Stellen | vollständige Bauliste P1 (Abschnitt 6), `mod()`, `alleSchluessel()`; Architekturtest erkennt `N_`, Abkürzungen, negative Reste, `belegung.length`-Schleifen; Verschiebungstest um `abschnittAnschluesse`/`schliesstLeitungsring` ergänzt |
| 5 stilles `continue` | `nordSperre()` als reine Funktion (P2), Steuerung zeigt den Grund beim Ziehen (P4), Zusammenspiel-Test |
| 6 Leitungsgrenze | Stufe 6 = **360** Leitungsfelder (AE-NR27-14), Balance-Test, Meldung bei Höchststufe ohne „nächste Stufe“ |
| 7 Altstände | Tester-Vorarbeit **V2** mit eingefrorenen echten Spielständen |

---

## 1. Bestand (was genutzt werden muss)

| Was | Wo | Bedeutung für NR27 |
|---|---|---|
| Feldschlüssel `y*24+x` | rund 70 Stellen in `src`, rund 95 in Tests; steht im Spielstand (`gestattungen`, `neubau_strassenluecken`) | Bleibt. Für negatives y eindeutig. |
| Rückrechnung `k % N` | netz.ts 117/151/291/504, spiel.ts 806 (über Abkürzung `N_`, Z. 803) und 993, tutorial-netz.ts 11, szene.ts 777/888/934/937, ueberlast.ts 40/55, steuerung.ts 1240, kontext.ts 491 | Für y < 0 falsch (`-19 % 24 = -19`). |
| „Kein Feld“ = `-1`, geprüft mit `>= 0`/`< 0` | netz.ts (35 Stellen), engstelle.ts 62, rohrvorschau.ts 38–39, tutorial-netz.ts 33/40, kontext.ts 488, szene.ts 888/936 | Ein Nordschlüssel würde als „direkt am Heizhaus“ gelesen. |
| Belegungskarte `Int32Array`, `bel[k]` | Leser: engstelle.ts 36/85, spiel.ts 495/1084/1219/1292, speichern.ts 122, tutorial-netz.ts 26, steuerung.ts 750, kontext.ts 585; Schleife ab 0: tutorial-netz.ts 95 | Negativer Index wird still verworfen; Schleife ab 0 übersieht den Norden. |
| Negativer Rest als Index/Bruchteil | szene.ts 126 `wiese[(x + y) % 2]`, 144 `LAUB[(x + y) % LAUB.length]`, 938 `(… + key * 0.37) % 1` | Für y < 0 `undefined` bzw. negativer Fortschritt. (szene.ts 246/263 und neubaugebiet.ts prüfen nur `=== 0`/wahr – bleiben richtig.) |
| Oberer Rand `y < 0` | spiel.ts 486 (`kannPlatzieren`), 1218, 1253; szene.ts 121/271/818; steuerung.ts 626; netz.ts (`randFelder` Z. 71, `leitungsNachbarn` Z. 79) | Muss `KARTE_OBEN_Y` werden. **Bewusst unverändert:** spiel.ts 449 (`platz.y < 0`, Ausbau der Heizzentrale bei (11\|10)), speichern.ts 120 (Umzug nur im Neubaugebiet Süd), nachbarn.ts (eigenes 24×24-Beispieldorf). |
| Fluss + Spülbohrung | `istFluss`, `bohrungsFelder`, `bohrung_eur`, `ersatzPreis_eur`, `flussGesperrt` (spiel.ts 1458) | Muster für die Bahn: Hindernisfeld, Leitung nur mit Freischaltung, Aufpreis je Feld. |
| Freischalt-Leiter | `freischaltung.ts` (AE-A88-1) | `bahnquerung: 6`; „Neu ab Stufe 6“ entsteht von selbst. |
| Erweiterte Karte | `spielOrt()` neubaugebiet.ts 66 – kehrt heute **ohne** Neubaugebiet sofort zurück | Muss die Nordzone immer anhängen. |
| Leitungsgrenze | `grenze` je Leitung `[60, 90, 130, 180, 240]` (katalog.ts 192–242), `grenze()` spiel.ts 422 nimmt bei Stufe 6 den 5. Wert; Meldung spiel.ts 594 „ab der nächsten Heizzentralen-Stufe“ | Bei Stufe 6 falsch und zu knapp. Heute schon: Dorf 163 Straßenfelder + Süd 66 + 84 Häuser ≈ 313 > 240 (gemessen mit Wegwerf-Test, nicht im Projekt). |
| Beschleunigen | `expressLiefern()` spiel.ts 1391, `beschleunigen()` 716 („Sofort fertig“ ui/katalog.ts 126) | Beides für den Abschnitt mit Querung sperren. |
| Ziehen | `stempelnBei` steuerung.ts 623; Z. 680–685 `if (!kannPlatzieren) continue;` ohne Hinweis | Stilles Überspringen → P4. |
| Echte Steuerung im Test | `tests/hilfen/echte-steuerung.ts` (z. B. tests/nr20-v1-zug.test.ts) | Für den Zusammenspiel-Test P4. |
| Alter Netz-Vergleich | `tests/hilfen/netz-alt-a91.ts` (eingefrorene alte Netzrechnung, `-1` als Wurzel) | Vergleichstests müssen „kein Feld“ angleichen (V1). |
| Spielstand | `SPEICHER_VERSION = 3`, `gueltig()` prüft y nicht | Kein Versionssprung (AE-NR27-7). |

## 2. Kernfrage: Wie wächst die Karte nach Norden? (entschieden 2026-11-23)
Variante (d): **negative Zeilen y = −10 … −1**, Schlüsselformel bleibt, Breite 24 bleibt für immer. Verworfen: (a) alles verschieben + Umzug (Datenverlust-Risiko), (b) Bahn ins heutige Raster (kein Platz: Dorfstraßen ab y = 0), (c) eigene Koordinatenzone mit Naht (Sonderfälle in Netz, Zeichnen, Ringprüfung). **Umkehrbar: nein** – Objekte mit negativem y stehen nach dem ersten Bau im Spielstand. Drei Sicherungen gegen still falsche Rechnung: Architekturtest (Muster), Verschiebungstest (P1), 3.000-Netze-Vergleich (`tests/a91-vergleich.test.ts`).

---

## 3. Rückgrat (Festlegungen)

Grundmuster (bleibt): Spiellogik in `src/core` ohne Darstellung. Die Nordzone ist ein reines Datenmodul `src/core/nordviertel.ts`, die Texte eine reine Tabelle `src/core/nord-texte.ts`. Regeln in `spiel.ts` neben der Spülbohrung. Darstellung und Steuerung lesen nur.

Führende Qualitätsziele:
- **Q1 Alte Spielstände unverändert:** Die eingefrorenen Stände aus V2 laden mit Befund `ok`, gleichen Objekten, gleichen Schlüsseln.
- **Q2 Netzrechnung ortsunabhängig:** Ein Netz rechnet in Zeile −10 genauso wie in Zeile 2 (Verschiebungstest).
- **Q3 Eine Regel, ein Ort:** Bahnregel, Sperrgründe, Preis, Texte, Nordzonen-Daten je genau ein Ort.

| Nr. | Bindet | Verhindert | Regel (prüfbar) | Ziel · Umkehrbar · Folgen (Nachteil) · Status |
|---|---|---|---|---|
| **AE-NR27-1** | Karte nach Norden über negative Zeilen; `KONSTANTEN.nord_zeilen = 10`; `KARTE_OBEN_Y = −nord_zeilen` (feld.ts) | zweites Koordinatensystem, Umzug | Architekturtest: netz.ts und jede Datei, die `KARTE_OBEN_Y`/`kartenOben` kennt, ohne `y < 0`/`y >= 0` | Q1 · nein · ~70 mechanische Änderungen; Nordzone für alle Stände da · gilt |
| **AE-NR27-2** | Schlüssel → x/y nur `feldVon(k)`; Rest von Ausdrücken mit y/Schlüssel als Index/Bruchteil nur `mod(a, n)` (feld.ts); keine Abkürzung von N | falsches x, `farben[-1]` | Architekturtest (auch `% N_`, `const N_ = N`, `[(x+y) % 2]`, `(…key…) % 1`) | Q2 · ja · ein Import mehr in ~8 Dateien · gilt |
| **AE-NR27-3** | „Kein Feld / direkt am Heizhaus“ = `KEIN_FELD` (−1.000.000) | Nordschlüssel als Wurzel gelesen | Architekturtest (kein `-1`-/`>= 0`-Wächter) | Q2 · ja · Vergleichstests brauchen Angleich (V1) · gilt |
| **AE-NR27-4** | Belegungskarte nur `belegtId(bel, k)` und `alleSchluessel(bel)` (netz.ts) | stilles Verwerfen, Schleife übersieht Norden | Architekturtest (kein `bel[`, kein `< belegung.length` außerhalb netz.ts) | Q2 · ja · Karte 1.344 statt 1.104 Felder · gilt |
| **AE-NR27-5** | Nordzone (Bahnzeilen, Brücke, Querungsspalte, Straßen, Fluss, Hausplan, Kulisse, `querungGebaut`, `nordSperre`, `nordInfo`) nur in `nordviertel.ts`; Importe nur katalog/typen/freischaltung/feld/nord-texte | verstreute Bahn-Koordinaten, Kreis zu spiel.ts | Architekturtest Importe; Konsistenztest P3 | Q3 · ja · Hausplan ist Spielinhalt im Kern (wie NR23) · gilt |
| **AE-NR27-6** | Querung = **Leitung auf Bahnfeldern** (Muster Spülbohrung), kein eigenes Objekt. Aufpreis `querung_eur_je_feld` je Bahnfeld im Abschnitt; Zuschlag `querung_bau_s` für den ganzen Abschnitt | zweites Objekt je Feld, Sonderwege im Netz | `abschnittKosten_eur`/`ersatzPreis_eur` enthalten den Aufpreis; netz.ts kennt keine Bahn | Q3 · ja · Zuschlag hält den ganzen Abschnitt auf · gilt (Entscheidung 23.11.) |
| **AE-NR27-7** | Spielstand: optional `nordviertel?: true`, `bahn_hilfe_gesehen?: true`, `Abschnitt.mit_querung?: true`; **kein** Versionssprung | Umzugslogik | Altstand-Tests mit V2-Dateien | Q1 · ja · Nordhäuser haben in alten/neuen Ständen andere IDs (egal) · gilt |
| **AE-NR27-8** | Häuser hinter der Bahn sind **Kulisse**, bis eine Querung gebaut ist; dann `nordviertelAnlegen()` (Bestand, `ohne_station`) | Anfragen/Ziele auf unerreichbare Häuser | vor der Querung keine Objekte mit y ≤ −4; danach 14 | Q3 · ja · zweiter Zeichenweg (Kulisse) · gilt |
| **AE-NR27-9** | **Ein** Sperrgrund für die Nordzone: `nordSperre(stand, t, x, y)` (nordviertel.ts). Genutzt von `kannPlatzieren`/`platzieren` (P3) **und** vom Ziehen in der Steuerung (P4). Hinter der Bahn (y ≤ −4) nichts, bevor die Querung steht | stilles Überspringen beim Ziehen; zwei Regelkopien | Tests P2 (Funktion), P3 (Kern), P4 (Zusammenspiel) | Q3 · ja · Querung und Viertel nie in einem Abschnitt · gilt |
| **AE-NR27-10** | Auf Bahnfeldern nur Leitungen und nur in der Spalte `QUERUNG_X = 10` (Verlängerung der Dorfstraße x = 10, Stichstraße im Norden); Brücke x = 19–20 nie | Leitung entlang der Gleise, Querung über die Flussbrücke, mehrere Querungen | Tests P2/P3 | Q3 · ja · Spieler wählt die Stelle nicht · gilt (Entscheidung 23.11.) |
| **AE-NR27-11** | Express **und** „Sofort fertig“ (Taler) sind für einen Abschnitt mit Querung gesperrt | Bauzeit wegkaufen (Abnahme (c)) | Tests P3 | Abwägungspunkt Spielspaß ↔ BQ2 · ja · einziger Abschnitt ohne Abkürzung · gilt |
| **AE-NR27-12** | **Alle** Spielertexte zu Bahn/Querung stehen in `src/core/nord-texte.ts` (`NORD_TEXTE`, Abruf `nordText(id, werte?)`). Liegt im Kern, weil Kern-Sperrtexte sie brauchen und der Kern nichts aus `ui` importieren darf. DESIGN.md 14.6 verweist auf die IDs | zwei widersprüchliche Texttabellen (Kritiker 2) | Architekturtest: kein String mit „Bahn“/„Gleis“ außerhalb nord-texte.ts (Ausnahme `FUNKTION_NAME.bahnquerung`) | Q3 · ja · Texte stehen nicht neben ihrer Verwendung · gilt |
| **AE-NR27-13** | Fachtexte (Wissen: Erklärkarte Sätze 1–4, Wissenstext A/B, Tutorial-Satz 1) tragen `fach: true` und erscheinen nur bei `NORD_FACHTEXTE_FREIGEGEBEN = true`; Standard **false**. Umschalten nur mit Eintrag „NR27-Fachtexte“ in `.claude/freigaben.md` (Simon, nach Fachprüfer) | ungeprüfte Fachaussage im Spiel (Kritiker 3) | Architekturtest (Schalter ↔ Freigabe), Test P2/P3 (ohne Freigabe kein Fachtext) | Fachregel · ja · bis zur Freigabe erklärt das Spiel weniger · gilt |
| **AE-NR27-14** | Leitungsgrenze bei Heizzentrale Stufe 6 = **360** Leitungsfelder (6. Eintrag in jedem `grenze` der Leitungen). Bei Höchststufe Meldung ohne „nächste Stufe“ | Querung bei Stufe 6 nicht zeichenbar | Balance-Test P3 | Spielwert, ohne Fachbeleg · ja (eine Zahl) · evtl. zu großzügig · gilt |

**Fachregeln** (vom Fachprüfer vorgeschlagen, **nicht bestätigt**, „Nur Simon“): BQ1 grabenlose Unterquerung von Grube zu Grube (im Spiel nur diese Bauart), BQ2 Bahn prüft und regelt vertraglich vor dem Bau, BQ3 teurer und länger als normaler Leitungsbau; Euro/Zeit sind Spielwerte („vereinfacht“). Die Spielmechanik (Aufpreis, Zuschlag, keine Abkürzung) folgt BQ3/BQ2 in der Richtung; die Zahlen 45.000 €/Bahnfeld und 1.440 s sind Platzhalter (Simon bestätigt 23.11. als „vereinfacht“).

**Konventionen:** Einheiten im Namen (`querung_eur_je_feld`, `querung_bau_s`). Jede Ablehnung zeigt einen Grund (Kern als Hinweis, beim Ziehen als Toast) – nie stilles Nichtstun. Fehlt einem Text ein Platzhalterwert, wirft `nordText` einen Fehler mit ID und Platzhalter (sichtbar im Test).
**Zurückgestellt:** Kamera-Knopf „Zur Bahn“ (Designer nach Foto); Bahnübergang nur Grafik; Erzeugungs-Balance Stufe 6 (Süd 576 kW + Nord 188 kW) → Testlauf Projektleiter.
**Nicht-Ziele:** Leitung oberirdisch über die Bahn (zweite Bauart verdoppelt Regeln ohne Spielgewinn); freie Wahl der Querungsstelle (Entscheidung 23.11.); Versionssprung im Spielstand.

### Kartenzeilen der Nordzone (verbindlich; Designer gestaltet das Aussehen, nicht die Lage)
```
      x 012345678901234567890123
  y=-10 ..........=........~~...   Gärten / Kartenrand (Stichstraße x=10 führt aus der Karte)
  y=-9  ..E.R.R.E.=.R.R.E..~~...   Hausreihe Nord
  y=-8  ..........=........~~...   Vorgärten
  y=-7  .=================.~~...   Wohnstraße
  y=-6  ...................~~...   Vorgärten
  y=-5  ..R.E.R.R...E.R.R..~~...   Hausreihe Süd
  y=-4  ...................~~...   Böschung (hinter der Bahn, gesperrt bis Querung)
  y=-3  ######################## Bahn (x=19–20 Brücke; Querung nur x=10)
  y=-2  ######################## Bahn
  y=-1  ...................~~...   Grünstreifen (Dorfseite, normal bebaubar)
  y=0   (heutiger Nordrand; Dorfstraße x=10 läuft hier nach Norden aus, geprüft am Startdorf)
```
14 Häuser (6 EFH, 8 RH), Grundstücksregel wie NR23. Bedarf mit NR23-Werten: 6 × 15.000 + 8 × 24.000 = 282.000 kWh/a, ÷ 1.500 h = 188 kW.
```
efh 2 -9, rh 4 -9, rh 6 -9, efh 8 -9, rh 12 -9, rh 14 -9, efh 16 -9,
rh 2 -5, efh 4 -5, rh 6 -5, rh 8 -5, efh 12 -5, rh 14 -5, rh 16 -5
```
Querungsweg: (10\|0) Dorfstraße → (10\|−1) → Bahn (10\|−2), (10\|−3) → (10\|−4) … (10\|−6) frei → (10\|−7) Wohnstraße.

### Texttabelle `src/core/nord-texte.ts` (einzige Quelle, Startinhalt)
Wortlaut-Herkunft: **F** = Fachprüfer (`docs/recherche/bahnquerung-texte.md`), **D** = DESIGN 14.6 (Fachprüfer: in Ordnung), **A** = neu vom Architekten (reine Spielmechanik; Designer darf umformulieren, nur in dieser Tabelle).
| ID | fach | Text | Herkunft · Verwendung |
|---|---|---|---|
| `Q2` | | Über die Bahn geht es erst mit einer Bahnquerung – {sperrgrund} | D · Leitung auf Bahnfeld vor Stufe 6 |
| `Q4` | | Unter der Bahn geht es im Spiel nur quer hindurch, nicht an den Gleisen entlang. | F · Leitung auf Bahnfeld neben einer Bahn-Leitung derselben Zeile |
| `STELLE` | | Über die Gleise geht es nur an einer Stelle: in Verlängerung der Dorfstraße. | A · Leitung auf anderem Bahnfeld als x = 10 |
| `BRUECKE` | | Über die Bahnbrücke führt im Spiel keine Leitung. | F · x = 19–20 |
| `GLEISE` | | Auf den Gleisen kann nichts gebaut werden. | A · Nicht-Leitung auf Bahnfeld |
| `HINTER` | | Hinter der Bahn geht es erst weiter, wenn die Bahnquerung gebaut ist. | A · y ≤ −4 vor Erschließung |
| `Q5` | | Die Bahnquerung wird noch gebaut. Danach geht es hinter der Bahn weiter. | D gekürzt (ohne Restzeit: der Kern formatiert keine Zeiten; Restzeit steht am Bauabschnitt) · y ≤ −4, Abschnitt mit Querung im Bau |
| `EXPRESS` | | Eine Bahnquerung lässt sich nicht beschleunigen. | F · Express und Sofort fertig |
| `SOFORT_GRUND` | | nicht bei Bahnquerung | A · Zeile 2 am gesperrten Knopf (≤ 28 Zeichen) |
| `KATALOG_ZEILE` | | Über die Bahn kommt eine Leitung nur quer über die Gleise – ab Heizzentrale Stufe {stufe}. | F (ersetzt Q3) · Bauen-Blatt vor Stufe 6 |
| `KATALOG_PREIS` | | Über die Gleise kommst du im Spiel nur per Bahnquerung an der Dorfstraße ({preis} je Gleisfeld{aktuell}). | A · Bauen-Blatt ab Stufe 6 |
| `N1` | | Hinter der Bahn: Diese Häuser erreichst du über eine Bahnquerung ab Heizzentrale Stufe {stufe}. | D · Antippen vor Stufe 6 |
| `N2` | | Diese Häuser erreichst du erst durch eine Bahnquerung. Bauen → Leitungen. | D · Antippen ab Stufe 6, Viertel nicht erschlossen |
| `F1` | | Bahnquerung fertig! Die Häuser hinter der Bahn kannst du jetzt anschließen. | D · Erschließung |
| `WISSEN_A` | ja | Gleise werden in der Regel nicht aufgegraben. Die Leitung wird von Grube zu Grube unter ihnen durchgebohrt oder -gepresst. | F · erste Bahn-Leitung im Abschnitt |
| `WISSEN_B` | ja | Vorher muss die Bahn den Plan prüfen und zustimmen. Das braucht Zeit. | F · dito |
| `KARTE_1` … `KARTE_4` | ja | Erklärkarte Sätze 1–4 wörtlich aus bahnquerung-texte.md Abschnitt 1 | F · Erklärkarte |
| `KARTE_5` | | Preis und Bauzeit sind im Spiel vereinfacht. | F · Erklärkarte, immer |
| `TUTORIAL_1` | ja | Mit einer Bahnquerung bringst du eine Leitung unter den Gleisen durch zum Wohngebiet dahinter. | F · Mini-Tutorial |
| `TUTORIAL_2` | | Gut für die Häuser hinter der Bahn. Teuer und langsam – ein späterer Rohrtausch dort kostet die Querung noch einmal. | F · Mini-Tutorial |
Platzhalter: `{stufe}` füllt `nordText` selbst aus `abStufe('bahnquerung')`; `{sperrgrund}`, `{preis}`, `{aktuell}` übergibt der Aufrufer.

---

## 4. Bezug zu Stufe 6 und Neubaugebiet Süd
- Keine Kollision: Süd wächst bei Stufe 6 bis y < 46 (`kartenHoehe`), Nord ist immer y ≥ −10 (`KARTE_OBEN_Y`).
- Bei Stufe 6 erscheinen „Neubaugebiet Süd“ und „Bahnquerung“ zugleich; keine Sperre „erst Süd“.
- **Leitungsgrenze (AE-NR27-14):** Obergrenzen-Netz „jede Straße eine Leitung + ein Anschlussfeld je Haus + 2 Bahnfelder“ ≈ 163 + 66 + 20 (Nordstraßen) + 98 Häuser + 2 ≈ 349 (Zahlen aus Wegwerf-Messung am Startdorf; der Balance-Test rechnet sie aus den Daten). 360 deckt das, 240 nicht.

---

## 5. Pakete (Plan-Abschnitt 5)

| Paket | Inhalt | Dateien | Abhängig von | Parallel mit | Schwierigkeit |
|---|---|---|---|---|---|
| **V2** Tester | eingefrorene Altstände | neu: `tests/referenz/nr27/*.json` | – (vor P1!) | V1 | – |
| **V1** Tester | Tests auf „kein Feld“ angleichen, K1-Rand | `tests/hilfen/kein-feld.ts` (neu), 5 Testdateien | – | V2 | – |
| **P1 Raster nach Norden** | feld.ts, alle Schlüssel-/Wächter-/Belegungs-/Rest-Stellen, Konstanten | Abschnitt 6 P1 | V1 | P2 | **schwer** – Netzrechnung, stille Fehler möglich |
| **P2 Nordzone + Verträge** | nordviertel.ts (inkl. `nordSperre`, `nordInfo`), nord-texte.ts, Typen, Freischaltung, `spielOrt`, Platzhalter bahn-karte.ts | Abschnitt 6 P2 | – | P1 | **einfach** – Daten, kleine reine Funktionen |
| **P3 Bahnregeln im Kern** | Platzieren, Preis, Bauzeit, Express/Sofort, Erschließen, Wissenstext, Leitungsgrenze, Bauen-Blatt | Abschnitt 6 P3 | P1, P2, V2 | P4, P5 | **schwer** – Fachregeln, Kosten, Spielstand |
| **P4 Darstellung Grundlage** | Boden/Kamera nach Norden, Gleise, Kulisse, Antippen, Hinweis beim Ziehen | Abschnitt 6 P4 | P1, P2 | P3 | **mittel** – Zeichnen + Steuerung, keine Fachlogik |
| **P5 Inszenierung** | Zug (Takt A90), Dunst, Masten/Zaun/Schranke, Schleier, Strichellinie, Baustelle/Bohrlinie, Erklärkarte, Mini-Tutorial, Erfolgsmoment | Abschnitt 6 P5 | P2, P4, DESIGN 14 Variante A | P3 | **mittel** – viel Zeichnen, Zeitsteuerung, keine Rechnung |

Stufen: (0) V2 → V1 · (1) P1 ∥ P2 · (2) P3 ∥ P4 · (3) P5 ∥ Rest von P3. **Kritischer Pfad:** V1 → P1 → P3; gleich lang P2 → P4 → P5. Je 3 von 5 Paketen liegen hintereinander – knapp über der Hälfte. Weiter schneiden hieße, dass P4 und P5 gleichzeitig `szene.ts`/`steuerung.ts` ändern; das nehme ich nicht in Kauf (bei Besetzung Solo baut der Projektleiter ohnehin nacheinander).
Gemeinsame Dateien je Stufe: keine (P1: katalog.ts, szene.ts, steuerung.ts – P2 nicht; P3: spiel.ts, katalog.ts, ui/katalog.ts, nordviertel.ts – P4/P5 nicht; P4 → P5 nacheinander auf szene.ts, szene-schluessel.ts, steuerung.ts). Keine Ports, keine Datenbank.
**Nach P3 + P4 + P5:** Tester-Abnahme `tests/nr27-abnahme.test.ts` (Ende-zu-Ende über die echte Steuerung, Prüf-Schwerpunkt Abschnitt 7) – Bitte an den Projektleiter, einzuplanen.

### Vorarbeit (nicht für den Entwickler)
**Tester-Vorarbeit V2 (zuerst, eigener Commit, auf dem Stand vor P1):** zwei echte Spielstände mit dem heutigen Code erzeugen (`serialisieren`) und als Dateien einfrieren; danach nie neu erzeugen. Je eine Zeile in `tests/referenz/nr27/LIESMICH.md`: Commit, wie erzeugt.
- `altstand-stufe6-layout3.json`: Heizzentrale Stufe 6, `neubaugebiet: true`, `neubaugebiet_layout: 3`, mindestens 1 Eintrag in `gestattungen` und, wenn erzeugbar, in `neubau_strassenluecken`; gebaute Leitungen bis an den Nordrand (10\|0); kein `nordviertel`.
- `altstand-mitten-im-bau.json`: Bauabschnitt in Phase `bau` mit laufender Uhr und geplanten Leitungen, dazu ein Haus mit laufendem Ausbau.
- Ein Test in `tests/nr27-altstand-v2.test.ts`, der beide Dateien heute schon lädt (`ladenMitBefund` → `ok`) – damit ist belegt, dass sie gültig sind, bevor P1 etwas ändert.

**Tester-Vorarbeit V1 (vor P1, eigener Commit; main bleibt vor P1 grün, kein Import aus feld.ts):**
- neu `tests/hilfen/kein-feld.ts`: `export const istKeinFeld = (v: number | undefined): boolean => v === -1 || v === -1_000_000;` und `export function elternAngleichen(m: ReadonlyMap<number, number>): Array<[number, number | 'kein']>` (Wurzel → `'kein'`). Gilt vor und nach P1.
- `tests/nr18-engstelle-kern.test.ts` Z. 182 `…?.feld).toBe(-1)` → `istKeinFeld(…)` ist true.
- `tests/a91-anschluss.test.ts` Z. 184 `toEqual({ feld: -1, tiefe: 0 })` → Tiefe 0 und `istKeinFeld(feld)`.
- `tests/a91-netzbaum.test.ts` Z. 131 `expect([...neu.eltern]).toEqual([...alt.eltern])` → beide über `elternAngleichen` (die alte Rechnung `tests/hilfen/netz-alt-a91.ts` bleibt eingefroren mit −1).
- `tests/a91-wirkung-p1.test.ts` Z. 20 Vergleich `alt…feld === neu…feld` → „beide kein Feld“ gilt als gleich.
- `tests/nr20-v1-zug.test.ts` Z. 156–172 (K1): Der Test nutzt (10\|−1) als „außerhalb der Karte“. Nach P4 ist das Karte (Grünstreifen). Auf den **linken** Kartenrand umstellen (Startfeld x = 0 mit Leitung, Ziel x = −1; Zeile wählt der Tester so, dass (0\|y) frei ist); Prüfzweck bleibt.
- Geprüft und **unverändert** lassen (bleiben mit `KEIN_FELD` richtig, solange sie keine Nordfelder nutzen): `tests/a91-vergleich.test.ts` 76/87/125, `tests/a91-netzbaum.test.ts` 207, `tests/hilfen/netz-alt-a91.ts`.
- Suche, die der Tester wiederholt (falls seit `e121764` Neues dazukam): `toBe(-1)`, `feld: -1`, `?? -1`, `eltern` mit `toEqual`, Koordinaten mit negativem y in `kannPlatzieren`/`platzieren`/`mitte`/`feld`.

**Architekt-Vorarbeit:** erledigt in diesem Durchgang (`tests/architektur/nr27-raster.test.ts` verschärft). Keine weitere.
`tests/ohne-leiter.ts` muss nicht angepasst werden (`bahnquerung` fehlt dort → Stufe 1; diese Tests zeichnen nie auf y < 0).

---

## 6. Baupläne

### P1 – Raster nach Norden
**Ziel:** Die Kernrechnung und alle Leser von Schlüsseln funktionieren für y = −10 … −1. Spielerisch ändert sich nichts (`kannPlatzieren` lehnt y < 0 weiter ab – das öffnet P3).

**Liefert** `src/core/feld.ts` (importiert nur `./katalog`):
- `export const KARTE_OBEN_Y: number` (= `-KONSTANTEN.nord_zeilen`)
- `export const KEIN_FELD = -1_000_000`
- `export function feldVon(k: number): [number, number]` – x immer 0–23
- `export function schluessel(x: number, y: number): number` – `y * N + x` (Inline-Formel bleibt erlaubt)
- `export function mod(a: number, n: number): number` – Ergebnis immer 0 ≤ r < n (auch für n = 1 bei Bruchteilen)

In `src/core/netz.ts`: `belegungskarte()` Größe `N * (MAX_Y - KARTE_OBEN_Y)`; `export function belegtId(bel: Int32Array, k: number): number` (0 außerhalb); `export function alleSchluessel(bel: Int32Array): number[]` (aufsteigend, inkl. Nordzone); alle `-1`-Wächter → `KEIN_FELD`; `anschluss.feld` „direkt am Heizhaus“ = `KEIN_FELD`; `randFelder` (71), `leitungsNachbarn` (79) und alle `ny < 0` → `KARTE_OBEN_Y`.

`src/core/katalog.ts` (neben `neubau_hoehe`): `nord_zeilen: 10`; `querung_eur_je_feld: 45000` – Kommentar „NR27 PLATZHALTER: Querung je Bahnfeld; Spielwert ohne Beleg, im Spiel ‚vereinfacht‘ (Fachregel BQ3, docs/recherche/bahnquerung.md)“; `querung_bau_s: 1440` – Kommentar „NR27 PLATZHALTER: Zuschlag auf die Abschnitts-Bauzeit – Prüfung und Bau, vereinfacht zusammengelegt; Spielwert ohne Beleg“. (Die beiden Werte liegen hier, damit P3 und P5 gleichzeitig darauf bauen.)

**Bauliste (vollständig; alle Fundstellen des Architekturtests am Stand `e121764`):**
| Datei | Stellen | Änderung |
|---|---|---|
| netz.ts | 71, 79, 114–521 (Wächter), 117/151/291/504 (Rückrechnung) | KARTE_OBEN_Y, KEIN_FELD, feldVon |
| engstelle.ts | 36, 85 (`belegung[`), 62 (`?? -1`, `feld >= 0`) | belegtId, KEIN_FELD |
| rohrvorschau.ts | 38–39 | KEIN_FELD |
| tutorial-netz.ts | 11 (Rückrechnung), 26 (`belegung[`), 33/40 (Wächter), **95** (Schleife `k < netz.belegung.length`) | feldVon, belegtId, KEIN_FELD, `for (const k of alleSchluessel(netz.belegung))` – Reihenfolge bleibt aufsteigend |
| spiel.ts | 495, 1084, 1219, 1292 (`bel[`), **803–806** (`const N_ = N` weg, `f % N_` → feldVon), 993 | belegtId, feldVon. 486/1218/1253 (`y < 0`) bleiben bis P3 |
| speichern.ts | **122** `bel[…]` | belegtId; **120 bleibt** `y < 0` (Umzug nur im Süden; Kommentar dazu) |
| ui/kontext.ts | 488, 491, 585 | KEIN_FELD, feldVon, belegtId |
| render/szene.ts | 126, 144 (`[(x + y) % …]`), 777, 888, 934–937, **938** (`… % 1`) | mod, feldVon, KEIN_FELD. 121/271/818 bleiben bis P4 |
| render/ueberlast.ts | 40, 55 | feldVon |
| steuerung.ts | 750 (`belegung[`), 1240 | belegtId, feldVon. 626 bleibt bis P4 |
| typen.ts | – | **nicht** in P1 (gehört P2) |

**Tests** `tests/nr27-raster.test.ts`:
- `test_nr27_feldVon_umkehr`: für alle x 0–23, y −10 … 45: `feldVon(y*24+x)` = `[x, y]`; `feldVon(-1)` = `[23, -1]`; `KEIN_FELD` liegt außerhalb dieses Bereichs.
- `test_nr27_mod`: `mod(-1, 2) = 1`, `mod(-3, 4) = 1`, `mod(-0.25, 1) = 0.75`, `mod(5, 24) = 5`.
- `test_nr27_belegung_nord`: Haus auf (5\|−10) und (5\|45) → `belegtId` liefert beide IDs; (5\|−11), (5\|46) → 0; `alleSchluessel` beginnt bei `-10*24`, ist aufsteigend und hat 1.344 Einträge.
- `test_nr27_verschiebung_netz`: Stand direkt aus Objekten (nicht über `platzieren`): Heizzentrale (11\|10), Leitungen mit Abzweigen, Engstelle, Puffer, Quelle an Leitung, Häuser – alles in Zeilen 2–11. Derselbe Stand um −12 Zeilen verschoben (Zeilen −10 … −1). Gleich sein müssen (Schlüssel verschoben, `KEIN_FELD` bleibt): `warm`, `kalt`, `verfuegbar_kw`, `last_kw`, `tiefe`, `eltern`, `engpass`, `reduzierung`, `aufteilung`, `engstellenFinden(...)`, `rohrVorschau(...)`, **`spiel.abschnittAnschluesse()`** (IDs gleich; mit offenem Abschnitt und geplanten Leitungen) und **`schliesstLeitungsring`** (privat, über `spiel as unknown as {…}` wie in bestehenden Tests: ein Fall mit Ring, ein Fall ohne, ein Fall über die Heizzentrale).
- Bestehende Tests bleiben grün, besonders `tests/a91-vergleich.test.ts`, alle `nr18-*`, `nr20-*`, `nr24-*`.
- Architekturtest `tests/architektur/nr27-raster.test.ts` wird grün (alle Regeln ab feld.ts).

**Randfälle:** Haus direkt am Heizhaus und Puffer (`KEIN_FELD`); Schleifen bis zur Wurzel in engstelle.ts/rohrvorschau.ts (`?? KEIN_FELD`, Abbruch bei `=== KEIN_FELD`); Tutorial-Reihenfolge `fremd` bleibt aufsteigend.
**Eskalation:** Verschiebungstest nur mit geändertem Rechenergebnis grün → stoppen. Der `Spiel`-Konstruktor ändert den verschobenen Stand (repariert/entfernt Objekte mit y < 0) → stoppen, Projektleiter. Ein bestehender Test wird rot, der nicht in V1 steht → stoppen (Tester-Vorarbeit).
**Risiko-Auslöser:** nein (keine Daten von außen, keine Anmeldung, keine Geheimnisse).

### P2 – Nordzone-Daten und Verträge
**Liefert** `src/core/nord-texte.ts` (Importe nur `./katalog`, `./freischaltung`):
- `export type NordTextId` (alle IDs der Tabelle in Abschnitt 3)
- `export const NORD_TEXTE: Readonly<Record<NordTextId, { text: string; fach?: true }>>`
- `export const NORD_FACHTEXTE_FREIGEGEBEN: boolean = false` – Kommentar „Nur mit Simons Eintrag ‚NR27-Fachtexte‘ in .claude/freigaben.md auf true (AE-NR27-13)“
- `export function nordText(id: NordTextId, werte: Readonly<Record<string, string | number>> = {}, freigegeben: boolean = NORD_FACHTEXTE_FREIGEGEBEN): string | null` – `null` nur für `fach`-Texte ohne Freigabe; fehlender Platzhalterwert → `Error` mit ID und Platzhalter

**Liefert** `src/core/nordviertel.ts` (Importe: katalog, typen, freischaltung, nord-texte; feld erst ab P3):
- `export const BAHN_ZEILEN_Y: readonly number[] = [-3, -2]`, `export const BRUECKE_X: readonly number[] = [19, 20]`, `export const QUERUNG_X = 10`
- `export const NORD_PLAN: ReadonlyArray<{ typ: TypId; x: number; y: number }>` (14 Häuser, Abschnitt 3)
- `export function bahnFelder(): Array<[number, number]>` (48 Felder, Brücke eingeschlossen); `nordStrassen()`, `nordFluss()` (x = 19/20, y = −10 … −1 ohne Bahnzeilen) – je `Array<[number, number]>`
- `export function istBahn(x: number, y: number): boolean`, `istBruecke(x, y): boolean`, `hinterDerBahn(y: number): boolean` (y ≤ −4)
- `export function nordKulisse(stand: Pick<Spielstand, 'nordviertel'>): ReadonlyArray<{ typ: TypId; x: number; y: number }>` – `NORD_PLAN` bis erschlossen, dann leer
- `export function querungGebaut(objekte: ReadonlyArray<Objekt>): boolean` – auf **jeder** Bahnzeile in Spalte `QUERUNG_X` eine gebaute (`!geplant`) Leitung
- `export function querungImBau(stand: Pick<Spielstand, 'abschnitt'>): boolean` – `abschnitt?.mit_querung && abschnitt.phase === 'bau'` (für Q5 und den Zug in P5)
- `export function nordviertelAnlegen(stand: Spielstand): boolean` – einmalig (Merker `nordviertel`), Häuser als `{ bestand: true, ohne_station: true, zufriedenheit_pct: 80, kasse_eur: 0, bau: null, stufe: 1 }` mit neuen IDs; belegter Platz wird übersprungen
- `export function nordSperre(stand: Spielstand, t: TypId, x: number, y: number): string | null` – Reihenfolge: weder Bahnfeld noch hinter der Bahn → null · Bahnfeld: keine Leitung → `GLEISE`; Brücke → `BRUECKE`; nicht freigeschaltet → `Q2` mit `sperrgrund(stand, 'bahnquerung')`; x ≠ `QUERUNG_X` → `Q4`, wenn links/rechts auf derselben Bahnzeile eine Leitung (geplant oder gebaut) liegt, sonst `STELLE`; sonst null · `hinterDerBahn(y)` und nicht `stand.nordviertel` → `Q5` bei `querungImBau`, sonst `HINTER` · sonst null
- `export function nordInfo(stand: Spielstand, x: number, y: number): string | null` – Bahnfeld oder Kulissenfeld (y ≤ −4, Viertel nicht erschlossen): `N1` vor Stufe 6, `N2` ab Stufe 6; sonst null

**Wichtig für den Architekturtest:** in nordviertel.ts keine Vergleiche `y < 0`/`y >= 0` (Schleifen bis `y <= -1`, Abfragen über `istBahn`/`hinterDerBahn`). Sobald P3 dort `KARTE_OBEN_Y` einsetzt, greift AE-NR27-1 auch für diese Datei.

**Liefert** `src/ui/bahn-karte.ts` (Vertrag für P3/P5): `export function bahnKarteZeigen(sp: Spiel): void` – Platzhalter zeigt `toast(nordText('KARTE_5'))`; P5 ersetzt den Rumpf, die Signatur bleibt.

Weitere Änderungen:
- `freischaltung.ts`: `Funktion` + `'bahnquerung'`; `FREISCHALTUNGEN.bahnquerung: 6`; `FUNKTION_NAME.bahnquerung: 'Bahnquerung'`.
- `orte.ts`: `Ort.bahn?: Array<[number, number]>` (Kommentar „Bahnfelder (NR27): nichts bauen, Leitungen nur an der Querungsstelle“).
- `neubaugebiet.ts` `spielOrt()`: hängt **immer** (auch ohne Neubaugebiet – heute Rückkehr in Z. 68) `nordStrassen()`, `nordFluss()` an und setzt `bahn: bahnFelder()`; Cache bleibt gültig (Nordzone fest).
- `typen.ts`: `Spielstand.nordviertel?: true`, `Spielstand.bahn_hilfe_gesehen?: true`, `Abschnitt.mit_querung?: true` (Kommentare mit „NR27“); Kommentar an `Netz.anschluss` „KEIN_FELD (feld.ts) = direkt am Heizhaus“.

**Tests** `tests/nr27-nordzone-daten.test.ts`:
- `test_nr27_a_plan`: 14 Häuser (6 EFH/8 RH); keins auf Straße, Fluss, Bahn; y in −9 … −5; Chebyshev-Abstand ≥ 2; jedes Haus hat ein freies Nachbarfeld an einer Straße; (10\|−4) … (10\|−6) frei (Querungsweg).
- `test_nr27_e_flaechen_getrennt`: Bahn ∩ Straßen = ∅, Bahn ∩ Fluss = ∅, Brücke ⊂ Bahn, `QUERUNG_X` ∉ `BRUECKE_X`.
- `test_nr27_f_querung_gebaut`: geplant → false; nur eine Zeile → false; beide Zeilen in Spalte 5 gebaut → false; beide in Spalte 10 gebaut → true.
- `test_nr27_f_anlegen_einmal`: zweimal anlegen → 14 Objekte, `naechste_id` +14, zweiter Aufruf false.
- `test_nr27_b_freischaltung`: Stufe 5 → `sperrgrund(…,'bahnquerung')` = „ab Heizzentrale Stufe 6“; Stufe 6 frei; `neuBeiStufe(6)` enthält `neubaugebiet` und `bahnquerung`.
- `test_nr27_a_spielort`: ohne Neubaugebiet → `bahn` hat 48 Felder, Straßen enthalten (1\|−7) und (10\|−9).
- `test_nr27_e_sperre`: `nordSperre` für jeden Zweig mit erwartetem Text aus `nordText(…)` (Stufe 5/6; (10\|−2) Leitung → null ab Stufe 6; (5\|−2) Leitung → `STELLE`; (11\|−2) neben geplanter (12\|−2) → `Q4`; (19\|−2) → `BRUECKE`; Baum auf (5\|−2) → `GLEISE`; (10\|−4) → `HINTER` bzw. `Q5` mit `mit_querung` + Phase `bau`; (10\|−1) und (10\|5) → null).
- `test_nr27_info`: `nordInfo` auf Bahnfeld/Kulissenhaus vor und ab Stufe 6 (`N1`/`N2`), nach Erschließung null, (5\|5) null.
- `test_nr27_d_texte`: jeder Eintrag mit Platzhaltern liefert mit Werten einen Text ohne `{`; fehlender Wert wirft; **ohne Freigabe** liefert jede `fach`-ID `null`, mit `freigegeben = true` den Text; die Menge der `fach`-IDs ist genau {`WISSEN_A`, `WISSEN_B`, `KARTE_1`–`KARTE_4`, `TUTORIAL_1`}; `NORD_FACHTEXTE_FREIGEGEBEN === false`.

**Eskalation:** Hausplan passt nicht zur Designer-Gestaltung → Projektleiter (Lage ist entschieden, nur das Aussehen ist frei). Ein Text muss „Bahn“ außerhalb von nord-texte.ts enthalten → nicht umgehen, Projektleiter.
**Risiko-Auslöser:** nein.

### P3 – Bahnregeln im Kern
**Nutzt:** P1 (`KARTE_OBEN_Y`, `feldVon`, `KEIN_FELD`, `belegtId`, `KONSTANTEN.querung_eur_je_feld`, `querung_bau_s`), P2 (`istBahn`, `nordSperre`, `querungGebaut`, `nordviertelAnlegen`, `BAHN_ZEILEN_Y`, `nordText`, `bahnKarteZeigen`), V2-Dateien.

**Liefert** (Klasse `Spiel`):
- `get kartenOben(): number` (= `KARTE_OBEN_Y`)
- `istBahn(x: number, y: number): boolean`
- `querungsFelder(): number[]` – Schlüssel geplanter Leitungen auf Bahnfeldern
- `querung_eur(): number` – `querungsFelder().length * querung_eur_je_feld`
- `abschnittBau_s(): number` – `abschnitt_bau_s + (Abschnitt hat geplante Leitung oder Ersatz auf Bahnfeld ? querung_bau_s : 0)`

Regeln:
1. `kannPlatzieren` false, wenn `nordSperre(...)` einen Text liefert; `platzieren` gibt diesen Text als Hinweis zurück (vor „Hier ist kein Platz“). Obere Grenze `y < KARTE_OBEN_Y` in Z. 486, 1218, 1253.
2. `gestattungsFelder()` ohne Bahnfelder; `abschnittKosten_eur()` + `querung_eur()`; `ersatzPreis_eur()` + `querung_eur_je_feld` auf Bahnfeld.
3. `materialBestellen()`: `neuerBau('neu', this.abschnittBau_s())` (Tutorial-Zweig unverändert); bei Querung `a.mit_querung = true`.
4. `expressLiefern()` und `beschleunigen(bau)` (wenn `bau === stand.abschnitt?.bau`): bei `mit_querung` → Hinweis `EXPRESS`, nichts bezahlt.
5. Nach Fertigstellen eines Abschnitts **und** im Konstruktor: `!stand.nordviertel && querungGebaut(...) && nordviertelAnlegen(stand)` → Hinweis `F1`, `neuBerechnen()`.
6. Erste Leitung auf einem Bahnfeld im laufenden Abschnitt (danach `querungsFelder().length === 1`): sind `nordText('WISSEN_A')` und `nordText('WISSEN_B')` nicht null → ein `sprecher`-Ereignis (`ABSCHNITT_HELFER.planung`, beide Sätze). Ohne Freigabe: nichts. Keine Merke im Spielstand.
7. Leitungsgrenze: jede Leitung in katalog.ts bekommt den 6. Eintrag `360` (`[…, 240, 360]`); Kommentar katalog.ts Z. 26 „Stufe 1..6“. Meldung Z. 594: bei `hzStufe >= KONSTANTEN.heizzentrale_hoechststufe` „Mehr Leitungen gehen nicht – die Heizzentrale hat schon die höchste Stufe“ (ebenso Z. 596 sinngemäß für andere Typen), sonst wie bisher.
8. `nordviertel.ts`: Untergrenze −10 durch `KARTE_OBEN_Y` ersetzen (einzige Änderung dort).
9. `ui/katalog.ts`: Z. 100 Zeile `KATALOG_ZEILE` (vor Stufe 6) bzw. `KATALOG_PREIS` (ab Stufe 6) mit (i)-Knopf 44 × 44 → `bahnKarteZeigen(sp)`; Z. 114 Bauzeit aus `sp.abschnittBau_s()`; Z. 126 „Sofort fertig“ gesperrt mit `SOFORT_GRUND`, Hinweis `EXPRESS`, wenn `a.mit_querung`.

**Tests** `tests/nr27-bahnquerung.test.ts` (Erwartungswerte aus Konstanten und Texttabelle, keine eigenen Rechenwerte):
- `test_nr27_b_gesperrt_vor_stufe6`: Stufe 5, offener Abschnitt, `platzieren('d90', 10, -2)` → `ok: false`, Hinweis = `nordText('Q2', …)`.
- `test_nr27_b_frei_ab_stufe6`: Stufe 6 → ok; `querungsFelder()` = `[-2*24+10]`.
- `test_nr27_e_nur_querungsstelle`: (5\|−2) → `STELLE`; (19\|−2) → `BRUECKE`; `kannPlatzieren('baum', 5, -2)` false; zweite Querung unmöglich.
- `test_nr27_e_kein_weg_vorbei`: vor Erschließung (10\|−4) → `HINTER`; `kannPlatzieren('solar', 5, -6)` false; während Bau mit Querung → `Q5`.
- `test_nr27_c_teurer`: `querung_eur_je_feld >= 4 * bohrung_eur_je_feld`; Abschnitt (10\|−1),(10\|−2),(10\|−3): `abschnittKosten_eur()` = Material + 2 × `querung_eur_je_feld` (+ Gestattung nur, falls (10\|−1) keine Straße); 2 × `querung_eur_je_feld` + 3 × teuerste Stufe-6-Leitung + `abschnitt_planung_eur` ≤ `grundkasse_eur`.
- `test_nr27_c_bauzeit`: `ende_ms − start_ms = (abschnitt_bau_s + querung_bau_s) × bauzeit_faktor × 1000`; ohne Bahnfeld unverändert.
- `test_nr27_c_keine_abkuerzung`: `expressLiefern()` und `beschleunigen(abschnitt.bau)` → `ok: false`, Hinweis `EXPRESS`, Geld/Taler unverändert.
- `test_nr27_d_wissenstext_ohne_freigabe`: Standard → erste Bahn-Leitung erzeugt **kein** `sprecher`-Ereignis.
- `test_nr27_d_wissenstext_mit_freigabe`: Stand so herstellen, dass der Schalter wirkt (z. B. `vi.mock('../src/core/nord-texte', …)` mit `NORD_FACHTEXTE_FREIGEGEBEN = true`) → genau ein Ereignis mit `WISSEN_A` + `WISSEN_B`; zweite Bahn-Leitung im selben Abschnitt → keins.
- `test_nr27_f_erschliessen`: Querung bauen, vorspulen → `nordviertel === true`, 14 Häuser y ≤ −5, alle `ohne_station`, Hinweis `F1`; danach (10\|−4) im neuen Abschnitt ok; Neuladen legt nichts doppelt an.
- `test_nr27_g_alter_stand` (beide V2-Dateien): Befund `ok`, Objektliste tief gleich, `gestattungen`/`neubau_strassenluecken` gleich, kein Objekt mit y < 0, `kartenOben === -10`; Mitten-im-Bau-Stand: Bauende und Abschnittsdauer unverändert, kein `mit_querung`.
- `test_nr27_ersatz_unter_bahn`: Ersatz auf (10\|−2) kostet zusätzlich `querung_eur_je_feld` und verlängert um `querung_bau_s`.
- `test_nr27_leitungsgrenze_stufe6`: `grenze('d25')` bei Stufe 6 = 360, bei Stufe 5 = 240; Meldung bei 360 Leitungen und Stufe 6 enthält nicht „nächsten“.
- `test_nr27_balance_leitungen`: Obergrenzen-Netz aus den Daten = Straßenfelder (Dorf + Süd Layout 3 + `nordStrassen()`) + alle Häuser (Dorf + `neubauPlan(3)` + `NORD_PLAN`) + `BAHN_ZEILEN_Y.length`; es gilt Obergrenzen-Netz ≤ 360 ≤ 1,25 × Obergrenzen-Netz.
- `test_nr27_konsistenz`: alle Felder aus `bahnFelder()`, `nordStrassen()`, `nordFluss()`, `NORD_PLAN` haben `KARTE_OBEN_Y` ≤ y < 0.

**Randfälle:** Querung gebaut, nicht angeschlossen → Viertel erschlossen, Häuser kalt, kein Fehler. Querungs-Leitung später entfernt → Häuser bleiben (`nordviertel` bleibt), werden getrennt. Kasse reicht nicht → übliche Meldung. Neuladen während Querung im Bau → `mit_querung` bleibt, Abkürzungen bleiben gesperrt.
**Eskalation:** Leitungen in der Bau-Phase nicht mehr `geplant` → `mit_querung` als einzige Quelle, im Bericht nennen. Ein bestehender Test erwartet andere Bauzeit/Kosten/Grenze → stoppen (Tester). Balance-Test rot → nicht die Zahl anpassen, Werte melden (Projektleiter entscheidet).
**Risiko-Auslöser:** nein (Spielregeln; Spielstand nur um optionale Felder erweitert).

### P4 – Darstellung Grundlage und Bedienung
**Nutzt:** `KARTE_OBEN_Y`, `feldVon` (P1); `spielOrt(stand).bahn`, `nordKulisse`, `nordInfo`, `nordSperre` (P2). **Nicht** die neuen `Spiel`-Methoden aus P3.

**Liefert:**
- `Szene` (szene.ts): `bahn?: ReadonlyArray<[number, number]>`, `kulisse?: ReadonlyArray<{ typ: TypId; x: number; y: number }>`, `kartenOben?: number`.
- Boden ab `kartenOben − WIESENRAND`; `GRAS` mit `N * (neubau_hoehe + nord_zeilen)` Einträgen, Index `(y − KARTE_OBEN_Y) * N + x`; Randprüfungen Z. 121, 271, 818 mit `kartenOben`.
- Gleise als Grundbild (Schotter, Schienen, Schwellen, Brücke) und Kulissenhäuser mit dem vorhandenen Hauszeichner – Aussehen nach DESIGN 14.2/14.4.
- `szene-schluessel.ts`: `bahn`, `kulisse`, `kartenOben` im Schlüssel der festen Ebene.
- `Kamera.kartenOben: number` (kamera.ts); `begrenzen()` erlaubt `kartenOben … kartenHoehe`.
- `steuerung.ts`: übergibt `bahn`, `kulisse`, `kartenOben`; Grenzen Z. 620/626 mit `KARTE_OBEN_Y`; Antippen eines Feldes ohne Objekt → `nordInfo(...)` ≠ null → Hinweis. Lokale Variable `kartenOben` in Z. 955 umbenennen (z. B. `blaseUnten`), damit sie nicht mit der Kamera-Eigenschaft verwechselt wird.
- **Hinweis beim Ziehen (Kritiker 5):** in `stempelnBei` vor `kannPlatzieren`: für Leitungen `const grund = nordSperre(sp.stand, typ, fx, fy)`; bei Text → `toast(grund)` höchstens **einmal je Zug** (Merker, der beim Zugbeginn zurückgesetzt wird) und `break` (die Leitung endet am letzten erlaubten Feld). Das bisherige `continue` bleibt nur für Fälle ohne Nordsperre.

**Tests** `tests/nr27-darstellung.test.ts` (Zeichen-Protokoll wie `nr20-*-darstellung`, echte Steuerung über `tests/hilfen/echte-steuerung.ts`):
- `test_nr27_a_gleise`: mit `bahn` wird in den Bahnzeilen gezeichnet, ohne nicht.
- `test_nr27_a_kulisse`: 14 Kulissenhäuser gezeichnet; leere Kulisse → anderer Schlüssel der festen Ebene.
- `test_nr27_a_boden_nord`: Boden für y = −10 ohne `undefined` (kein Absturz).
- `test_nr27_kamera_nord`: bei Zoom 2,2 lässt sich (10\|−7) in die Bildmitte holen; (10\|45) bei Stufe 6 weiterhin; Startansicht unverändert.
- `test_nr27_antippen`: (5\|−9) ohne Objekt → Hinweis = `nordInfo(stand, 5, -9)`.
- `test_nr27_zusammenspiel_ziehen` (gilt vor **und** nach P3): (a) Stufe 5, offener Abschnitt, Zug (10\|0) → (10\|−3): genau ein Toast = `nordText('Q2', …)`, keine Leitung mit y ≤ −2; (b) Stufe 6, Zug (10\|0) → (10\|−6): genau ein Toast = `nordText('HINTER')`, keine Leitung mit y ≤ −4; (c) Stufe 6, Zug (14\|0) → (14\|−3) (senkrecht, damit die Achsenregel aus A47 nicht stört): genau ein Toast `STELLE`, keine Leitung mit y ≤ −2.

**Randfälle:** Hochformat-Hinweis unverändert; Winter (Schneefall über `kartenOben … kartenHoehe`); 60 Bilder/s beim Ziehen mit 10 Zeilen mehr Boden und bis zu 360 Leitungen.
**Eskalation:** Kamera-Grenze nur mit geänderter Mitte (`c = (N − 1) / 2`) möglich und alte Kamerafahrten (Neubaugebiet, Tutorial) wandern → stoppen. Bestehende Kamera-/Darstellungstests werden rot → Liste melden (Tester), nicht anpassen.
**Risiko-Auslöser:** nein.

### P5 – Inszenierung
**Eingang:** DESIGN 14 in der Fassung Variante A (Designer überarbeitet parallel). Alle Maße, Farben, Zeiten, Abläufe von dort; dieser Plan wiederholt sie nicht.
**Nutzt:** P2 (`istBahn`, `QUERUNG_X`, `BAHN_ZEILEN_Y`, `querungImBau`, `nordKulisse`, `nordText`, `Spielstand.bahn_hilfe_gesehen`, `bahnKarteZeigen`-Signatur), P4 (`Szene.bahn/kulisse/kartenOben`, Gleise, Kamera), P1 (`querung_eur_je_feld`, `querung_bau_s`).

**Liefert / Umfang** (je Punkt Verweis auf DESIGN 14):
| Punkt | DESIGN | Bauentscheidung (nur was nicht im DESIGN steht) |
|---|---|---|
| Zug mit Takt A90 | 14.3 | Bedarf „flüssig“ nur, solange der Zug im Bild ist (vorhandener Bedarfsweg aus `render/takt.ts`). **Kein Zug, solange `querungImBau(stand)`** (Fachprüfer F3) und bei „Weniger Bewegung“/Sparmodus. Fahrplan rein aus der Uhrzeit (keine Zufallszahl je Bild). |
| Dunst über dem Viertel | 14.4 | an `nordKulisse(stand).length > 0` gekoppelt |
| Masten/Fahrdraht, Zaun, Schranke | 14.2 | reine Grafik, keine Daten im Kern |
| Schleier | 14.x (Designer) | nur Darstellung |
| Strichellinie statt Rohr auf Bahnfeldern | 14.5 | Leitungen mit `istBahn(x, y)` werden nicht als Rohr, sondern als Strichellinie unter den Gleisen gezeichnet; Netzrechnung unverändert |
| Baustelle/Bohrlinie | 14.5 | sichtbar bei `querungImBau(stand)`; Gruben auf (10\|−1) und (10\|−4) |
| Erklärkarte | 14.7 | in `src/ui/bahn-karte.ts`, Signatur `bahnKarteZeigen(sp: Spiel): void` bleibt. Sätze `KARTE_1`–`KARTE_4` nur, wenn `nordText` nicht null; `KARTE_5`, Preis (`querung_eur_je_feld × BAHN_ZEILEN_Y.length`) und Zuschlag immer. Erklärbild ohne fahrenden Zug (F3) |
| Mini-Tutorial | 14.x (Designer) | einmalig, Merker `stand.bahn_hilfe_gesehen = true`; `TUTORIAL_1` nur mit Freigabe, `TUTORIAL_2` immer |
| Erfolgsmoment | 14.8 | ausgelöst in der Steuerung beim Wechsel `stand.nordviertel` undefined → true (kein neues Ereignis im Kern nötig); `F1` kommt als Hinweis aus P3 |

Dateien: neu `src/render/bahn.ts` (Zug, Masten, Zaun, Schranke, Dunst, Baustelle, Strichellinie), Rumpf von `src/ui/bahn-karte.ts`; ändern `src/render/szene.ts` (Aufrufe, Leitungen auf Bahnfeldern), `src/render/szene-schluessel.ts`, `src/steuerung.ts` (Erfolgsmoment, Tutorial, Erklärkarte beim Antippen, falls DESIGN es vorsieht); Farbwerte nach DESIGN 14.9 am vorhandenen Ort der Tokens (wie 13.10). Neu `tests/nr27-inszenierung.test.ts`.

**Tests** `tests/nr27-inszenierung.test.ts`:
- `test_nr27_zug_takt`: Zug im Bild → Bedarf flüssig; außerhalb → keiner; `querungImBau` → kein Zug gezeichnet, kein Bedarf; „Weniger Bewegung“ → kein Zug.
- `test_nr27_dunst`: mit Kulisse Dunst gezeichnet, nach Erschließung nicht.
- `test_nr27_strichellinie`: Leitung auf (10\|−2) wird nicht mit dem Rohrzeichner gezeichnet, auf (10\|−1) schon.
- `test_nr27_baustelle`: `mit_querung` + Phase `bau` → Baustelle an beiden Gruben; danach nicht.
- `test_nr27_erklaerkarte_ohne_freigabe`: Standard → Karte enthält `KARTE_5` und Preis, keinen der Sätze `KARTE_1`–`KARTE_4`.
- `test_nr27_tutorial_einmal`: zweites Auslösen zeigt nichts; Merker überlebt `serialisieren` → `laden`.
- `test_nr27_erfolgsmoment`: Wechsel `nordviertel` → true löst den Effekt genau einmal aus; Neuladen eines erschlossenen Stands löst ihn nicht aus.

**Randfälle:** Stand nach dem Laden schon erschlossen (kein Erfolgsmoment, kein Dunst); Querung im Bau beim Laden (Zug pausiert sofort); Sparmodus.
**Eskalation:** DESIGN 14 verlangt Daten, die der Kern nicht liefert (z. B. ein neues Ereignis) → stoppen, Projektleiter. Der Takt-Bedarfsweg aus A90 passt nicht → stoppen.
**Risiko-Auslöser:** nein.

---

## 7. Prüf-Schwerpunkt (nicht ausdrücklich in NR27, trifft echte Spieler)
| # | Eingabe | Erwartet | Test in |
|---|---|---|---|
| 1 | In einem Zug über die Bahn und weiter ins Viertel ziehen | Leitung endet am letzten Bahnfeld; ein Toast `HINTER` | P4 (Zusammenspiel), Abnahme |
| 2 | Längs über die Gleise oder an anderer Stelle ziehen | Toast `STELLE`/`Q4`, vorhandene Felder bleiben | P2, P4 |
| 3 | Querung gebaut, nicht angeschlossen | Viertel erschlossen, Häuser kalt, kein Fehler | P3 |
| 4 | Querungs-Leitung wieder entfernen oder tauschen | Häuser bleiben, getrennt; Tausch kostet die Querung erneut | P3 |
| 5 | Alter Stand (Stufe 6 bzw. mitten im Bau) laden | Befund `ok`, nichts verändert, Bahn/Kulisse sichtbar, Querung sofort zeichenbar | P3 (V2-Dateien), P4 (Bild) |

## 8. Architekturtest
`tests/architektur/nr27-raster.test.ts` (ab `src/core/feld.ts`): Rückrechnung nur in feld.ts, auch mit `N_`; keine Abkürzung von N; kein negativer Rest als Index/Bruchteil (AE-NR27-2); kein `-1`-/`< 0`-Wächter (AE-NR27-3); Belegung nur über `belegtId`, Schleifen nur über `alleSchluessel` (AE-NR27-4); `y < 0` verboten in netz.ts und in jeder Datei, die `KARTE_OBEN_Y`/`kartenOben` kennt (AE-NR27-1); Importe feld.ts/nordviertel.ts (AE-NR27-5). Ab `src/core/nord-texte.ts`: Importe der Tabelle, kein Bahn-Text außerhalb (AE-NR27-12), Schalter nur mit Freigabe (AE-NR27-13). Jede Meldung nennt AE-Nummer, Datei und erlaubten Weg. Ausgenommen: `src/core/nachbarn.ts` (eigenes Beispieldorf).

## 9. NR28 (Tal, Höhenübergabe, Druck) – nicht verbaut
Das Tal liegt in y-Richtung (nördlich durch größeres `nord_zeilen` oder südlich über `neubau_hoehe`), weil die Breite 24 fest ist. Geländehöhe wird ein Datenmodul (`gelaende_hoehe_m(x, y)`), kein Spielstandfeld. Druck (`druck_bar`) wird eine eigene Kernrechnung über `eltern`/`tiefe`; Voraussetzung ist die ortsunabhängige Netzrechnung aus P1. Die Höhenübergabe wird ein eigener Objekttyp (anders als die Querung, AE-NR27-6). netz.ts bleibt bahnfrei.
