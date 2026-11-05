# Bauplan A88 – Freischalt-Leiter (aus NR1) mit Kundenanfrage (F2)

Stand: 2026-11-05 · Architekt (Modus entwurf) · Grundlage: docs/lastenheft.md NR1, NR2; Code-Stand 75d289d; **Simons Antworten F1–F3 eingearbeitet** (docs/ENTSCHEIDUNGEN.md, letzter Eintrag).

**Paketschnitt:** zwei Teilpakete nacheinander (beide ändern `src/core/spiel.ts` und `src/ui/kontext.ts`, deshalb nicht parallel). Kritischer Pfad: V1 → P1 → P2.
- **P1 Kundenanfrage** (Abschnitt 6b, 7b, Tests T11) – Schwierigkeit **mittel**: neuer Zustand am Objekt, Zähler-Regeln, eine neue Blase; keine Rechnung.
- **P2 Leiter** (alles andere) – Schwierigkeit **mittel**: viele kleine Stellen im Kern und in der Oberfläche, Bestandsschutz für alte Stände; keine knifflige Rechnung.
Ein Reviewer kann P1 und P2 getrennt ablehnen. Werden sie zusammen gebaut, gilt derselbe Bauplan.

## 1. Ziel
Ein Spiel zeigt auf Stufe 1 nur die Inhalte der Stufe 1. Alles andere schaltet mit der Stufe der Heizzentrale frei. Gesperrtes bleibt sichtbar und zeigt „ab Heizzentrale Stufe X“. Ob etwas frei ist, entscheidet **eine** Funktion im Kern, die Oberfläche fragt nur ab. **Das gilt für alle Spielstände, auch alte** (F3); schon Gebautes bleibt, läuft weiter, lässt sich ausbauen und verkaufen. Kunden wachsen nicht mehr von selbst: Sie **fragen an** (Kamin aus, Aufstockung), der Spieler nimmt an oder lehnt vorerst ab (F2).

## 2. Prüfung des NR1-Vorschlags gegen den heutigen Spielablauf (gelesen, Belege)

**B1 – Gestattung und Anbohrung sind Kosten, kein Knopf.** Sie entstehen automatisch, sobald eine Leitung abseits der Straße liegt (`gestattungsFelder()`, src/core/spiel.ts:547) oder seitlich an eine durchlaufende Leitung andockt (`brauchtAnbohrung()`, spiel.ts:569). **F1 (Simon): vor der Freischaltung werden sie nicht berechnet und nicht erwähnt.**

**B2 – Das dritte Starthaus liegt nicht an der Straße.** Starthäuser (src/core/orte.ts:33): (9|13), (12|14), **(13|12)**. Jeder Weg dorthin braucht Felder abseits der Straße und dockt an die 40er an. Auftrag `c2` (src/core/auftraege.ts:14) und Stufenziel 2 (3 Anschlüsse, src/core/katalog.ts:440) hängen daran. Mit F1 kein Hindernis.

**B3 – Wachstum ohne Anfrage hätte Stufe 1 kalt gemacht.** Heute stockt ein Haus nach 1.800–2.700 s warmer Zeit von selbst auf (×1,4, spiel.ts:976–980; katalog.ts:365–366), bei sehr günstigem Preis kommt „Kamin aus“ dazu (×1,5, spiel.ts:969–974). **F2 (Simon): Das passiert nur noch auf Anfrage und nach Zustimmung des Spielers** (Abschnitt 6b). Nimmt der Spieler zu viel an, wird die 40er zu klein – dann gibt es auf Stufe 1 einen Ausweg ohne 50er: eine zweite 40er direkt aus der Heizzentrale. **Getestet** in einer Wegwerf-Kopie (Code-Stand 9e3d8a7): zwei Starthäuser mit „aufgestockt + Kamin aus“ = je 21 kW, an der Start-40er beide kalt (Grund „leitung“); zweite 40er auf (12|12),(12|13) → beide warm. Das Netzmodell kennt mehrere Abgänge (src/core/netz.ts:102–105).

**B4 – Heute gibt es drei verstreute Sperr-Mechanismen:** `min_hz_stufe` (katalog.ts:150/257/261/266), Nullen in `grenze` (katalog.ts:219–229, 179, 188, 286) und `baugebiet_hz_stufe` (katalog.ts:370). Die Oberfläche rechnet die Sperre selbst nach (src/ui/katalog.ts:88–89; src/ui/kontext.ts:268; src/steuerung.ts:149). A88 führt das in **eine** Tabelle zusammen.

**B5 – Wärmepumpe und Power-to-Heat sind heute ab Stufe 1 baubar**, obwohl A3 sagt „kommen später als Ausbau“. Die Tabelle legt sie fest.

**B6 – Viele bestehende Tests bauen auf Stufe-1-Freiheit** (tests/anpassungen.test.ts, tests/spiel.test.ts, tests/nachbarn.test.ts, tests/orte.test.ts – die vier einzigen Testdateien mit `new Spiel(`). Weil F3 die Leiter auch für alte Stände einschaltet, gibt es keinen Merker mehr, über den sie „wie früher“ laufen könnten. Lösung: Diese Testdateien ersetzen das Kernmodul per `vi.mock` durch eine Testhilfe mit den Stufen von heute (Abschnitt 11, V1). Im Produktivcode gibt es **keinen** Schalter dafür. **Getestet** in der Wegwerf-Kopie: (a) der `vi.mock`-Aufruf ist harmlos, solange `src/core/freischaltung.ts` noch nicht existiert (tests/spiel.test.ts 37/37 grün), (b) er ersetzt das Modul auch für Aufrufe aus `src/core/spiel.ts`, (c) er wirkt nur in der Datei, die ihn enthält.

**B7 – Nur zwei bestehende Tests hängen am automatischen Wachstum.** **Getestet** in der Wegwerf-Kopie: Automatik in spiel.ts:970/976 abgeschaltet → nur „A34: Dauerhaft hohe Zufriedenheit schaltet den Kamin ab …“ und „Aufstockung: Ein Wohnhaus stockt nach einiger Zeit auf …“ (tests/anpassungen.test.ts:288–302) werden rot; alle anderen Spiel-Tests bleiben grün. Die beiden ersetzt T11 (Vorarbeit V1).

**Aufträge gegen die Leiter** (Tabelle aus Abschnitt 4, F1/F2 entschieden):

| Auftrag | wird aktuell bei | braucht | frei? |
|---|---|---|---|
| c1 erstes Haus | Stufe 1 | – (beim Start schon erfüllt → NR2) | ja |
| c2 drei Starthäuser | 1 | Bauabschnitt, passende Station, Weg abseits der Straße, Andocken | ja (F1: Gestattung/Anbohrung kostenlos) |
| col Monatsabrechnung | 1 | nichts | ja |
| h3 viertes Haus | 1 | wie c2; 4 × 10 kW = 40 kW = genau die 40er | ja; Anfragen kann der Spieler ablehnen (F2) |
| grant Förderantrag | 1 | Förderung (bleibt Stufe 1) | ja |
| hz2 | 1 | 3 Anschlüsse, 48.000 € | ja |
| fund | 2 | eine förderfähige Quelle: 2. Kessel, Wärmepumpe, Puffer, Solarthermie | ja |
| obs | 1 | – | ja |
| main Hallenbad | 2 | Vertrag ab 2; Weg über Straßen x=10 → y=6 → x=5, 45 kW → 50er | ja (Knopf „110er-Leitung legen“ muss weg, siehe 7a) |
| saw Sägewerk | 2 | Vertrag ab 2; liegt östlich des Flusses → Spülbohrung | ja (Spülbohrung ab 2) |
| h8, deko | 2 | – | ja |
| hz3 | 2 | 5 Anschlüsse, 80 kW → 63er oder zwei Abgänge | ja |

## 3. Festlegungen

- **AE-A88-1 Eine Regel.** Bindet: jede Freischalt-Entscheidung. Verhindert: Oberfläche und Kern entscheiden verschieden. Regel: Die Tabelle `FREISCHALTUNGEN` steht und wird gelesen nur in `src/core/freischaltung.ts`; alle anderen Dateien (auch `spiel.ts`) nutzen nur `abStufe`/`freigeschaltet`/`sperrgrund`/`neuBeiStufe`. Außerhalb von `src/core` kommen weder `min_hz_stufe` noch `grenze(..) > 0` noch `hzStufe >= <Zahl>` vor. Prüfung: tests/architektur/a88-freischaltung.test.ts.
- **AE-A88-2 Der Kern setzt durch.** Jede Aktion, die ein gesperrtes Merkmal nutzt, lehnt der Kern selbst ab (`Ergebnis { ok: false, hinweis }`), die Oberfläche graut nur aus. Prüfung: T4.
- **AE-A88-3 Sperre gilt für Neues, nie für Bestehendes.** Gebautes läuft weiter, lässt sich ausbauen, verkaufen, entfernen, auf einen **freigeschalteten** Typ tauschen; laufende Aufträge (Helfer, Express, Bau, Förderantrag) laufen zu Ende. Gesperrt ist nur Neukauf, Neubau, Tausch *auf* einen gesperrten Typ und das **Einschalten** einer gesperrten Funktion – Ausschalten bleibt immer erlaubt (Vorsehung, Abschnitt 5). Prüfung: T8.
- **AE-A88-4 Kosten vor ihrer Freischaltung entfallen** (Gestattung, Anbohrung): nicht berechnet, nicht erwähnt (F1). Ab Freischaltung wie heute. Prüfung: T5.
- **AE-A88-5 Alle Spielstände bekommen die Leiter (F3).** Kein Merker im Spielstand (`freischalt_leiter` entfällt), kein Umschreiben beim Laden, kein Befund `migriert`, keine neue Speicher-Version. Tests, die Mechaniken nach den Stufen von vor A88 prüfen, tauschen das Kernmodul per `vi.mock` gegen `tests/ohne-leiter.ts` – im Produktivcode gibt es keinen Schalter und keine Testdaten. Prüfung: Architekturtest „kein `freischalt_leiter` in src“, T8.
- **AE-A88-6 `min_hz_stufe` und `KONSTANTEN.baugebiet_hz_stufe` entfallen**, die Tabelle ersetzt sie. `grenze` bleibt reine Stückzahl-Grenze; eine 0 in `grenze` ist nur unterhalb der Freischalt-Stufe erlaubt (T1c).
- **AE-A88-7 Kunden wachsen nur auf Anfrage (F2).** Bindet: Aufstockung und Vollversorgung („Kamin aus“). Verhindert: Bedarf steigt ohne Zutun des Spielers. Regel: `aufgestockt`/`vollversorgung` setzt ausschließlich `anfrageAnnehmen` auf `true` (in `src/` sonst nur Lesen). Höchstens eine offene Anfrage je Haus. Ablehnen kostet nichts und hat keine Strafe. Prüfung: T11 und T6 (über das Verhalten).

## 4. Freischalt-Tabelle (Werte sind Daten, Simon kann jede Zeile ändern)

Spalte „heute“ steht **nicht** im Produktivcode, sondern nur in der Testhilfe `tests/ohne-leiter.ts` (`WIE_VOR_A88`, Vorarbeit V1).

| Merkmal (Schlüssel) | ab Stufe | heute (nur Testhilfe) | Durchsetzung im Kern | Anzeige |
|---|---|---|---|---|
| 25er/32er/40er, Hackschnitzelkessel, Bauabschnitt (Philipp/Laura), passende Übergabestation, Monteurhütte, Büro, Förderung, Deko außer Brunnen, **Kundenanfragen annehmen** | 1 | 1 | kein Eintrag | – |
| `d50`, `d63` | 2 | 1 | `platzieren`, `leitungTauschen`, `hausanschlussPlanen` (über `passendeLeitung`) | Baumenü-Karte, Zeichenleiste, Leitungskarte |
| `d75`, `d90`, `d110` | 3 | 2 | wie oben | wie oben |
| `stationstypen` (Station frei wählen statt automatisch passend) | 2 | 1 | `stationKaufen` | Hauskarte, Großabnehmerkarte |
| `express` | 2 | 1 | `expressLiefern` | Baumenü Bauabschnitt |
| `gestattung` (Kosten abseits der Straße) | 2 | 1 | `gestattungsFelder`, `feldKosten_eur`, `materialBestellen` | Baumenü-Texte |
| `spuelbohrung` (Leitung durch den Fluss) | 2 | 1 | `platzieren` (Flussfeld), `hausanschlussPlanen` (Flussfelder unpassierbar) | Hinweis beim Ablehnen |
| `wpg` Wärmepumpe | 2 | 1 | `innenEinbauen`, `foerderungBeantragen` | Baumenü Heizhaus, Büro |
| `puffer` Pufferspeicher außen | 2 | 1 | `platzieren`, `foerderungBeantragen` | Baumenü, Büro |
| `solar` | 2 | 2 | wie oben | wie oben |
| `bad`, `gewerbe` (Vertrag) | 2 | 2 | `vertragBedingungen` | Großabnehmerkarte (Liste „fehlt“) |
| `brunnen` | 2 | 2 | `platzieren` | Baumenü Deko |
| `vorlauf` (Regler) | 3 | 1 | `vorlaufSetzen` | Heizzentralen-Karte |
| `ruecklauf_helfer` (Sebastian, Christian, Manfred) | 3 | 1 | `upgradeKaufen` | Hauskarte, Heizzentralen-Karte (Helfer) |
| `hauspuffer` (Puffer im Haus) | 3 | 1 | `hauspufferEinbauen` | Hauskarte |
| `pellet`, `gas` | 3 | 1 | `innenEinbauen`, `foerderungBeantragen` | Baumenü Heizhaus, Büro |
| `sonde`, `klinik` | 3 | 3 | `platzieren` bzw. `vertragBedingungen` | wie oben |
| `vorsehung` (T-Stück-Werkzeug **und** Anbohrkosten) | 4 | 1 | `vorsehungUmschalten` (nur Einschalten), `brauchtAnbohrung` | Leitungskarte, Baumenü-Texte |
| `bhkw` | 4 | 2 | `innenEinbauen`, `foerderungBeantragen` | Baumenü Heizhaus, Büro |
| `ptk` Power-to-Heat | 4 | 1 | wie oben | wie oben |
| `pv` (außen), `dach_pv` | 4 | 1 | `platzieren`, `dachPvKaufen` | Baumenü, Heizzentralen-Karte |
| `baugebiet` | 4 | 3 | `baugebietBedingungen` | Heizzentralen-Karte |

Die frühere Zeile `kundenwachstum` entfällt: Wachstum ist seit F2 eine Anfrage und ab Stufe 1 möglich (Simon: „Annehmen ist auch in Stufe 1 möglich“).
Häuser (`rh`, `baeck`, `mfh`) baut der Spieler nicht; sie bekommen keinen Eintrag und sind von T1c ausgenommen (nur Kategorien aus `BAU_KATEGORIEN`).
Die Start-Vorsehung (A74) bleibt als Objekt im Startnetz; vor Stufe 4 hat sie nur keine Wirkung auf Kosten.

## 5. Alte Spielstände (F3: bekommen die Leiter)

Beim Laden passiert nichts Neues: kein Merker, kein Umschreiben, Befund bleibt `'ok'`. Die Leiter gilt ab dem ersten Bild nach der aktuellen Heizzentralen-Stufe. Ein alter Stand auf Stufe 1–3 sieht danach gesperrte Knöpfe, die er vorher hatte – das ist Simons Entscheidung.

**Prüfung „wird etwas unbedienbar?“** (gelesen im Code, Ausweg bei Überlast getestet, B3):

| Bestand im alten Stand | Was nach A88 gilt | bedienbar? |
|---|---|---|
| gebaute 50er–110er unter ihrer neuen Stufe | bleiben, tragen weiter; Tausch nur auf freigeschaltete Typen (also kleiner); Entfernen ok | ja |
| Netz überlastet, dickere Leitung gesperrt | zweite Leitung direkt aus der Heizzentrale teilt die Last (B3, getestet) | ja, mit Ausweg |
| Leitung auf Flussfeld (Spülbohrung) unter Stufe 2 | bleibt; Tausch dieser Leitung auf freigeschalteten Typ muss gehen – die Flussfeld-Sperre gilt nur für **neue** Felder in `platzieren`/Wegsuche, nicht in `leitungTauschen` | ja, **Regel für den Entwickler** |
| Haus mit zu kleiner Station, `stationstypen` gesperrt | Knopf „Größere Station einbauen · <passende>“ (kleinste passende, `passendeStation`) | ja |
| Haus mit „aufgestockt“/„Kamin aus“ | bleibt so (Simon), keine neue Anfrage dafür | ja |
| Pellet, Gas, BHKW, Wärmepumpe, Power-to-Heat im Heizhaus unter ihrer Stufe | laufen, `innenAusbauen` und Entfernen gehen; nach dem Entfernen nicht neu baubar | ja |
| Pufferspeicher außen, PV außen, Dach-PV, Brunnen, Erdsonde | bleiben und wirken; Verschieben/Entfernen gehen | ja |
| Puffer im Haus | bleibt; Hauskarte zeigt „Eingebaut“ (dieser Zweig kommt vor dem Sperr-Zweig) | ja |
| laufender Helferauftrag (`upgrade_auftrag`) | läuft in `bis()` zu Ende, Hauskarte zeigt den Fortschritt; erst danach der gesperrte Knopf | ja |
| laufende Expresslieferung | läuft zu Ende | ja |
| Vorlauf ≠ 75 °C unter Stufe 3 | **Bestandsschutz:** `freigeschaltet(stand, 'vorlauf')` ist wahr, solange `stand.vorlauf_c` gesetzt und ≠ `VORLAUF.start_c` ist; zurück auf 75 °C sperrt den Regler | ja |
| geplante Vorsehung im offenen Bauabschnitt unter Stufe 4 | Ausschalten erlaubt, Einschalten gesperrt; solange sie geplant bleibt, kostet sie wie heute | ja, **Regel für den Entwickler** |
| Förderantrag (wartet/bewilligt) für einen jetzt gesperrten Typ | bleibt gespeichert; nutzbar, sobald der Typ frei ist (Förderung wirkt nur beim Neubau) | ja |
| erschlossenes Baugebiet unter Stufe 4 | bleibt; nur das Erschließen ist ab 4 | ja |
| Großabnehmer mit Vertrag | unverändert (Vertrag gilt, `vertragBedingungen` nur vor der Unterschrift) | ja |
| Interessent jenseits des Flusses unter Stufe 2 | bleibt gelb bis Stufe 2 | zulässig |

Gefunden: **kein** Gebäude und keine Station wird unbedienbar, sofern die zwei markierten Regeln (Flussfeld nur bei Neubau, Vorsehung ausschalten) gebaut werden. Beide haben einen Test (T8).

## 6. Schnittstellen (exakt)

### 6a. Leiter (P2)

**Neu: `src/core/freischaltung.ts`** (nur Kern-Importe: `katalog`, `typen`, `netz`)
```ts
export type Funktion =
  | 'stationstypen' | 'express' | 'gestattung' | 'spuelbohrung'
  | 'vorlauf' | 'ruecklauf_helfer' | 'hauspuffer' | 'vorsehung' | 'dach_pv' | 'baugebiet';
export type Merkmal = TypId | Funktion;
export const FREISCHALTUNGEN: Readonly<Partial<Record<Merkmal, number>>>; // Merkmal → ab Stufe; fehlt = 1
export const FUNKTION_NAME: Readonly<Record<Funktion, string>>;   // Anzeigename, z. B. express: 'Expresslieferung'
export function merkmalName(m: Merkmal): string;                  // KATALOG[m].name oder FUNKTION_NAME[m]
export function abStufe(m: Merkmal): number;                      // FREISCHALTUNGEN[m] ?? 1 – einzige Stelle, die die Tabelle liest
export function freigeschaltet(stand: Spielstand, m: Merkmal): boolean; // heizzentrale(stand.objekte).stufe >= abStufe(m), plus Vorlauf-Bestandsschutz (5)
export function sperrgrund(stand: Spielstand, m: Merkmal): string | null; // `ab Heizzentrale Stufe ${abStufe(m)}` oder null
export function neuBeiStufe(stufe: number): Merkmal[];            // alle mit abStufe === stufe, Reihenfolge der Tabelle
```
Die Stufe zählt erst, wenn der Ausbau fertig ist (`o.stufe` steigt in `bis()`, spiel.ts:872).
`abStufe` und `neuBeiStufe` brauchen keinen Spielstand mehr (kein Merker, F3).

**`src/core/typen.ts`** – `Spielstand` bekommt **kein** neues Feld.

**`src/core/spiel.ts`**
- `neuerSpielstand(...)` bleibt unverändert.
- `Spiel` bekommt Abfragen für die Oberfläche (dünne Weiterleitungen, kein eigener Code):
  `freigeschaltet(m: Merkmal): boolean`, `sperrgrund(m: Merkmal): string | null`.
- `passendeLeitung(bedarf_kw: number): TypId | undefined` – kleinste **freigeschaltete** Leitung mit `kapazitaet_kw ≥ bedarf`, sonst die dickste freigeschaltete. Aus `hausanschlussPlanen` (spiel.ts:620–621) herausgezogen, dort und in der Oberfläche genutzt.
- `vorlaufSetzen(c: number): Ergebnis` (bisher `void`; Aufrufer, die das Ergebnis ignorieren, bleiben gültig).
- Durchsetzung je Methode: Spalte „Durchsetzung“ in Abschnitt 4. Meldungen über `this.nein(...)` mit `${merkmalName(m)} ${sperrgrund}`; Flussfeld: „Über den Fluss geht es erst mit Spülbohrung – ab Heizzentrale Stufe 2“. Großabnehmer: Eintrag in `fehlt` im Format `Heizzentrale Stufe ${n}` (tests/spiel.test.ts:226 prüft diesen Text). Baugebiet ebenso.
- `vorsehungUmschalten`: gesperrt nur, wenn eingeschaltet würde (`!o.vorsehung`); Ausschalten immer erlaubt.
- `leitungTauschen`: prüft nur den **neuen** Typ (`freigeschaltet(neu)`), nie das Feld (Flussfeld eines Bestands bleibt tauschbar).
- `brauchtAnbohrung` liefert `false`, solange `vorsehung` gesperrt ist → `anbohrungsFelder()`, `anbohrung_eur()` und die Wegsuche rechnen automatisch ohne Anbohrung.
- `gestattungsFelder()` liefert `[]`, solange `gestattung` gesperrt ist; `feldKosten_eur` rechnet dann ohne Gestattung; `materialBestellen` merkt sich in diesem Fall keine Felder.
- Freischalt-Meldung: In `bis()` an der Stelle, an der ein Ausbau fertig wird (spiel.ts:872), bei `o.typ === 'hz'` ein `hinweis` „Neu ab Stufe X: …“ mit `neuBeiStufe(X)`-Namen (höchstens 4 Namen, dann „…“). Kein neuer Ereignistyp – NR3 ersetzt das später durch die „Wusstest du?“-Karte.

**`src/core/katalog.ts`** – Feld `min_hz_stufe` aus `Definition` und den vier Einträgen entfernen; `baugebiet_hz_stufe` aus `KONSTANTEN` entfernen. `grenze` bleibt unverändert.

### 6b. Kundenanfrage (P1, F2)

Heutige Logik (gelesen): In `einnahmen()` (spiel.ts:965–981) zählt jedes warme Nicht-Großabnehmer-Haus `warm_s` hoch und `voll_s`, solange die Zufriedenheit ≥ 95 % ist (unter 85 % zurück auf 0). Bei `voll_s ≥ KONSTANTEN.vollversorgung_nach_s` (900) wird `vollversorgung = true`; bei Typ `efh`/`rh`/`baeck` und `warm_s ≥ aufstockung_nach_s (1800) + (id % 4) × 300` wird `aufgestockt = true`. `nutzungsfaktor()` (netz.ts:287) multipliziert den Bedarf mit 1,5 bzw. 1,4.

**`src/core/typen.ts`** – `Objekt` bekommt:
```ts
/** A88/F2: offene Kundenanfrage; der Bedarf steigt erst, wenn der Spieler annimmt */
anfrage?: 'vollversorgung' | 'aufstockung';
```
`warm_s`, `voll_s`, `aufgestockt`, `vollversorgung` bleiben mit gleicher Bedeutung.

**`src/core/spiel.ts`**
- `einnahmen()`: Die Zähler laufen wie heute. Wo heute das Flag gesetzt wird, wird stattdessen – **nur wenn `!o.anfrage`** – `o.anfrage` gesetzt. Reihenfolge: zuerst `vollversorgung` prüfen, dann `aufstockung`. Bedingungen unverändert (inkl. `!o.vollversorgung` bzw. `!o.aufgestockt`, also keine Anfrage für schon Gewährtes). Kein `neuBerechnen` nötig (Bedarf ändert sich nicht).
  - Meldung (nicht bei `this.abwesend`): „<Name> fragt an: Kamin abschalten und ganz mit Fernwärme heizen? Bedarf dann X kW“ bzw. „<Name> baut ein Stockwerk auf und fragt nach mehr Wärme: Bedarf dann X kW“; Ereignis `schwebtext` „fragt an“ (Farbe `#ffd166`).
  - Bei Abwesenheit keine Einzelmeldung; am Ende von `bis()` (bei den Sammelmeldungen, spiel.ts:854–856) eine Zeile „Während du weg warst: N Kunden fragen nach mehr Wärme“, wenn in dieser Abwesenheit N > 0 Anfragen entstanden sind.
  - Wird ein Haus `gekuendigt`, wird `o.anfrage` gelöscht.
- `anfrageAnnehmen(id: number): Ergebnis` – nur bei Haus mit gültiger `o.anfrage` und nicht `gekuendigt`, sonst `{ ok: false }`. Setzt das passende Flag auf `true`, löscht `anfrage`, `neuBerechnen()`, Hinweis wie heute („… hat den Kamin abgeschaltet … (+50 % Verbrauch)“ bzw. „… stockt auf: Bedarf X kW – reicht die Übergabestation noch?“), `schwebtext` „Kamin aus“ / „Aufstockung“. Kostenlos, ab Stufe 1, keine Kapazitätsprüfung (der Spieler entscheidet).
- `anfrageAblehnen(id: number): Ergebnis` – gleiche Vorbedingung. Löscht `anfrage` und setzt den zugehörigen Zähler auf 0 (`voll_s = 0` bzw. `warm_s = 0`). Folge: Die Anfrage kommt nach derselben Wartezeit wieder (900 s mit ≥ 95 % bzw. 1.800 s + Versatz warm). Keine Zufriedenheits-Strafe, keine Kosten. Hinweis: „<Name> wartet und fragt später wieder“.
- `anfrageBedarf_kw(o: Objekt): number` – Bedarf nach Annahme (`bedarfKw` mit gesetztem Flag); ohne Anfrage = `bedarfKw(o)`. Damit rechnet die Oberfläche nicht selbst.

**Alte Stände:** Häuser mit `aufgestockt`/`vollversorgung: true` bleiben so (kein Rückbau, keine Anfrage). Häuser, deren Zähler die Schwelle schon überschritten haben, fragen beim nächsten Takt an. `speichern.ts` bleibt unverändert (das Feld wird mit dem Objekt gespeichert; ein unbekannter Wert wird von `anfrageAnnehmen` mit `ok: false` abgelehnt und gelöscht).

## 7. Oberfläche

### 7a. Leiter (P2) – fragt nur ab: `sp.freigeschaltet(m)`, `sp.sperrgrund(m)`, `sp.passendeLeitung(kw)`
Gestaltung nach DESIGN.md 12.5/12.7/12.14: gesperrter Knopf = deaktiviert, Grund in Zeile 2, keine Münze; Katalogkarte gesperrt = Bild blass, Schloss, Grund, bleibt tippbar.
- **src/ui/katalog.ts:83–108** Baumenü: `gesperrt = !sp.freigeschaltet(t)`, Grund = `sp.sperrgrund(t)`. Eigene Berechnung (Z. 88–89) entfällt. Antippen einer gesperrten Karte: Toast mit dem Grund.
- **src/ui/katalog.ts:55–79** Bauabschnitt: Gestattungs-, Bohrungs-, Anbohr- und Vorsehungssätze nur, wenn das jeweilige Merkmal frei ist; Express-Knopf gesperrt = deaktiviert mit Grund (laufende Expresslieferung zeigt weiter ihren Stand).
- **src/steuerung.ts:149** Zeichenleiste: freigeschaltete Durchmesser + **ein** deaktivierter Knopf „Dickere ab Stufe X“ (X = kleinste `abStufe` einer gesperrten Leitung, abgefragt über `sp.sperrgrund`).
- **src/ui/kontext.ts** Leitungskarte (Z. 262–269): Vorsehung einschalten nur bei `vorsehung` frei (sonst deaktivierter Knopf mit Grund, solange der Abschnitt offen ist); eine schon gesetzte geplante Vorsehung zeigt immer den Knopf zum Wegnehmen. Tauschen nur auf freigeschaltete + ein deaktivierter Knopf wie in der Zeichenleiste.
- Hauskarte: `stationswahl` (Z. 188–203) – ohne `stationstypen` ein Knopf „Übergabestation einbauen · <passende>“ (bzw. „Größere Station einbauen“, wenn die alte zu klein ist); `pufferBereich` und `upgradeBereich`: Bestand und laufender Auftrag zuerst, sonst gesperrt = Kastentitel + ein deaktivierter Knopf mit Grund, kein Erklärtext.
- Großabnehmerkarte (Z. 213): Knopf „110er-Leitung legen“ ersetzen durch `stempeln(sp.passendeLeitung(bedarfKw(o)))`.
- Heizzentralen-Karte (Z. 290–317): Vorlauf-Stepper gesperrt = deaktiviert, Grund darunter; Kasten „Helfer“ gesperrt = eine Zeile mit Grund; PV-Dach und Baugebiet = deaktivierter Knopf mit Grund.
- Büro (Z. 350–354): Zeile je Quelle; gesperrte Quelle zeigt deaktivierten Knopf mit Grund statt „Antrag stellen“.

### 7b. Kundenanfrage (P1)
- **Kennzeichen am Haus:** `src/render/gebaeude.ts:213` – `Blase` um `'anfrage'` erweitern, `zeichneBlase` zeichnet sie (Symbol: Flamme mit Plus; Stil wie DESIGN.md 12.14 „Sprechblase“; Feinheiten legt der Designer fest). `src/render/szene.ts` `blase()` (Z. 304): nach den Problemfällen (`weg`, `stecker`, `leitung`, `kalt`, `wuetend`) und vor `return null` → `if (o.anfrage) return 'anfrage'`. Probleme haben also Vorrang.
- **Hauskarte** (`src/ui/kontext.ts` `haus()`): Chip „fragt an“ (gold) in der Chip-Reihe. Direkt nach den Zeilen (vor der Wärmerechnung) ein Kasten (DESIGN.md 12.7) „Anfrage“ mit
  - einem Satz in der Stimme des Kunden: Vollversorgung „Darf ich meinen Kaminofen abschalten und ganz mit Fernwärme heizen?“, Aufstockung „Wir bauen ein Stockwerk auf – könnt ihr mehr Wärme liefern?“;
  - Zeile „Anschlussleistung danach“ = `${kw(bedarfKw(o))} → ${kw(sp.anfrageBedarf_kw(o))} kW`; reicht die vorhandene Station danach nicht, Chip „Station dann zu klein“ (rot);
  - Knopfreihe: **„Annehmen“** = Haupt (`los`, grün, kostenlose Hauptaktion, DESIGN 12.5), Zeile 2 „+X kW Bedarf“; **„Später“** = Neutral, Zeile 2 „fragt später wieder“. Beide Tippflächen ≥ 44 px (`klein`).
- Der Erklärtext in `stationswahl` („Schaltet der Kunde seinen Ofen ab oder baut an …“) wird zu „Fragt der Kunde nach mehr Wärme und du stimmst zu, steigt der Bedarf – dann brauchst du eine größere Station.“

## 8. Dateien
- **anlegen:** `src/core/freischaltung.ts` (P2); Testdateien `tests/a88-kundenanfrage.test.ts` (P1, T11) und `tests/a88-freischalt-leiter.test.ts` (P2, T1–T10)
- **ändern:** `src/core/typen.ts` (P1: `Objekt.anfrage`), `src/core/spiel.ts` (P1: einnahmen, Anfrage-Methoden; P2: Abfragen, Durchsetzung, passendeLeitung, Meldung in bis), `src/core/katalog.ts` (P2: min_hz_stufe, baugebiet_hz_stufe raus), `src/ui/kontext.ts` (P1 Anfrage-Kasten, P2 Sperren), `src/ui/katalog.ts` (P2), `src/steuerung.ts` (P2), `src/render/szene.ts` und `src/render/gebaeude.ts` (P1: Blase)
- **nicht ändern:** `src/core/auftraege.ts` (NR2), `src/core/speichern.ts`, `src/core/netz.ts` (`nutzungsfaktor` bleibt), bestehende Tests (→ Vorarbeit V1)

## 9. Tests
Erwartete Werte stammen aus der Tabelle in Abschnitt 4 und den Daten in katalog.ts/orte.ts, nicht aus eigener Rechnung. Neue Testdateien nutzen das **echte** Modul (kein `vi.mock`).

- **T1 Tabelle**
  - `test_a88_tabelle_stufen`: für jede Zeile aus Abschnitt 4 `abStufe(m)` = Spalte „ab Stufe“.
  - `test_a88_jede_funktion_hat_namen`: jeder `Funktion`-Schlüssel hat einen Eintrag in `FREISCHALTUNGEN` und `FUNKTION_NAME`.
  - `test_a88_grenze_null_nur_unter_freischaltung` (T1c): für jeden Typ aus den Kategorien von `BAU_KATEGORIEN` und jede Stufe s: `grenze[s-1] === 0` ⇒ `s < abStufe(t)`.
- **T2 Je Stufe, was baubar ist** (`test_a88_stufe_<n>_baubar`, n = 1…5): HZ-Stufe n gesetzt; die Menge der freigeschalteten Merkmale entspricht genau der Tabelle (Stufe 1: d25, d32, d40, kessel, Büro, Hütte, Deko ohne Brunnen; keine Funktion frei).
- **T3 Neues Spiel**
  - `test_a88_neues_spiel_nur_stufe1`: Stufe 1; `platzieren('d50', …)` im offenen Abschnitt → `ok: false`, Hinweis enthält „ab Heizzentrale Stufe 2“; `innenEinbauen('pellet')` → `ok: false`; `innenEinbauen('kessel')` mit Geld → `ok: true`.
  - `test_a88_startnetz_bleibt` (A74): Startnetz unverändert inkl. Vorsehung bei (10|14); `netz.warm` enthält beide Starthäuser.
- **T4 Kern setzt durch** (je ein Fall, Stufe 1, mit genug Geld): `leitungTauschen(startleitung, 'd50')` → false; `stationKaufen(haus, 'st_25')` bei 10-kW-Haus (nicht passend) → false, mit `'st_15'` → true; `expressLiefern()` im laufenden Bau → false; `vorsehungUmschalten(geplant ohne Vorsehung)` → false; `upgradeKaufen` → false; `hauspufferEinbauen` → false; `vorlaufSetzen(65)` → `ok: false` und `vorlauf_c` bleibt 75; `dachPvKaufen` → false; `foerderungBeantragen('pellet')` → false, `('kessel')` → true; Leitung auf Flussfeld (19|3) → false; `baugebietBedingungen().fehlt` enthält „Heizzentrale Stufe 4“; `vertragBedingungen(bad).fehlt` enthält „Heizzentrale Stufe 2“.
- **T5 Kosten vor Freischaltung**
  - `test_a88_stufe1_ohne_gestattung`: Leitung abseits der Straße, z. B. (12|15) → `gestattung_eur() === 0`, Materialpreis ohne Gestattung, `stand.gestattungen` bleibt leer.
  - `test_a88_stufe1_ohne_anbohrung`: seitliches Andocken an die Start-40er → `anbohrungsFelder()` leer.
  - `test_a88_ab_stufe2_gestattung`: gleicher Fall mit HZ-Stufe 2 → `gestattung_eur() === KONSTANTEN.gestattung_eur_je_feld`.
  - `test_a88_ab_stufe4_anbohrung`: mit HZ-Stufe 4 → genau ein Anbohrfeld.
- **T6 Stufe 1 ist durchspielbar** (`test_a88_stufe1_durchspielbar`, Uhr als Variable): neues Spiel, Kessel → `abschnittPlanen` → nach Planungszeit `hausanschlussPlanen(haus 13|12)` ok, nur freigeschaltete Leitungstypen geplant → passende Station kaufen → `abschnittAbschliessen`, `materialBestellen` ok → nach Bauzeit 3 Häuser warm → `hzZiele()` Stufe 2: Anschlüsse erreicht → `pruefeAuftraege` hat `c2` erledigt. Danach Uhr 3 Stunden vor, **ohne** Anfragen anzunehmen: alle drei Häuser warm, kein Haus `aufgestockt`/`vollversorgung`, mindestens ein Haus hat `anfrage` (F2).
- **T7 Auftragsreihe** (`test_a88_auftraege_brauchen_nur_freies`): Tabelle im Test „Auftrag → nötige Merkmale“ gemäß Abschnitt 2 (c2/h3: Stufe 1 ohne Gestattungs-/Anbohrkosten; fund: kessel|wpg|puffer|solar; main: bad, d50; saw: gewerbe, spuelbohrung; hz3: d63); für jede Zeile: bei der Stufe, auf der der Auftrag frühestens aktuell wird (vor hz2 = 1, danach 2), ist mindestens ein bzw. jedes nötige Merkmal frei.
- **T8 Alte Stände und Bestand** (F3)
  - `test_a88_alter_stand_bekommt_leiter`: Stand serialisieren, im JSON ein Feld `freischalt_leiter` **nicht** vorhanden → `ladenMitBefund` → Befund `'ok'` (nicht `'migriert'`); auf Stufe 1 `platzieren('d50')` → `ok: false`.
  - `test_a88_gebautes_bleibt`: Stufe 1, direkt in den Stand gelegt: 50er, Pelletkessel, Pufferspeicher außen, Dach-PV, Haus mit Puffer, Haus mit laufendem `upgrade_auftrag`: nach `neuBerechnen` und `bis(+1 h)` alles vorhanden und wirksam, Helferauftrag fertig (`upgrade` +1); `innenAusbauen` des Pelletkessels wird nicht mit „ab Heizzentrale Stufe“ abgelehnt; 50er → 40er tauschen ok; 50er entfernen ok.
  - `test_a88_flussleitung_tauschbar`: Stufe 1, eine 40er auf Flussfeld (19|3) direkt in den Stand gelegt → `leitungTauschen(id, 'd32')` ok.
  - `test_a88_vorsehung_ausschalten`: Stufe 1, offener Abschnitt, geplante Leitung mit `vorsehung: true` → `vorsehungUmschalten` ok und `vorsehung` weg; erneut → `ok: false`.
  - `test_a88_station_ohne_stationstypen`: Stufe 1, Haus mit `aufgestockt` + `vollversorgung` (21 kW) und `st_15` → `stationKaufen(id, passendeStation(bedarfKw(haus)).id)` ok.
  - `test_a88_ueberlast_ausweg_stufe1`: Stufe 1, beide angeschlossenen Starthäuser `aufgestockt` + `vollversorgung`, Station `st_25` → beide kalt (`netz.kalt` = `'leitung'`); 40er auf (12|12) und (12|13) direkt in den Stand gelegt, `neuBerechnen` → beide warm. (Erwartung in der Wegwerf-Kopie bestätigt, B3.)
  - `test_a88_vorlauf_bestandsschutz`: Stufe 1, `vorlauf_c = 65` → `freigeschaltet('vorlauf')` true; nach `vorlaufSetzen(75)` false.
- **T9 Freischalt-Meldung** (`test_a88_meldung_bei_stufe2`): HZ-Ausbau auf 2 fertig → ein `hinweis` mit „Neu ab Stufe 2“ und „Expresslieferung“.
- **T10 Oberfläche fragt nur ab** – Architekturtest (`tests/architektur/a88-freischaltung.test.ts`). Zusätzlich mit der DOM-Attrappe aus tests/menue-v2.test.ts (Muster A84 W1), falls ohne Browser baubar: Baumenü auf Stufe 1 zeigt die 50er-Karte mit Klasse `gesperrt` und Text „ab Heizzentrale Stufe 2“; Hauskarte mit `anfrage` zeigt Knöpfe „Annehmen“ und „Später“. Geht das ohne neue Abhängigkeit nicht: Sichtprüfung durch den Designer (Fotos Baumenü Reiter Leitungen, Hauskarte mit Anfrage, Haus mit Anfrage-Blase, Heizzentralen-Karte auf Stufe 1; 844×390 und 667 px).
- **T11 Kundenanfrage** (P1, `tests/a88-kundenanfrage.test.ts`; ersetzt tests/anpassungen.test.ts:288–302)
  - `test_a88_f2_kamin_wird_anfrage`: neues Spiel, Kessel, `preisSetzen(0)`, Lauf `vollversorgung_nach_s + 1200` s in 10-s-Schritten (Muster tests/anpassungen.test.ts:285–286) → Starthaus hat `anfrage === 'vollversorgung'`, `vollversorgung` nicht gesetzt, `bedarfKw` = `verbrauch_kwh_a / 1500` (unverändert).
  - `test_a88_f2_annehmen`: danach `anfrageAnnehmen` → `ok`, `vollversorgung === true`, `anfrage` weg, `bedarfKw` = vorher × `KONSTANTEN.vollversorgung_faktor`, `netz.bedarf_kw` gestiegen; HZ-Stufe ist 1.
  - `test_a88_f2_ablehnen_kommt_wieder`: `anfrageAblehnen` → `ok`, `anfrage` weg, `vollversorgung` nicht gesetzt, `voll_s === 0`, Zufriedenheit gleich wie in einem Vergleichsspiel ohne Ablehnen (± 0,01); nach weiteren `vollversorgung_nach_s + 300` s wieder `anfrage === 'vollversorgung'`.
  - `test_a88_f2_aufstockung_wird_anfrage`: Preisstufe mit `PREISSTUFEN[i].zufriedenheit_pct < 95`, Starthaus `warm_s = aufstockung_nach_s + (id % 4) × 300` gesetzt, ein Takt → `anfrage === 'aufstockung'`, `aufgestockt` nicht gesetzt; annehmen → `aufgestockt`, `bedarfKw` × `aufstockung_faktor`; in einem zweiten Spiel ablehnen → `warm_s === 0`.
  - `test_a88_f2_eine_anfrage_je_haus`: beide Bedingungen erfüllt → genau eine Anfrage (`vollversorgung`); nach Annehmen beim nächsten Takt `aufstockung`.
  - `test_a88_f2_ohne_anfrage_nein`: `anfrageAnnehmen`/`anfrageAblehnen` ohne Anfrage, auf Büro, auf unbekanntem Wert → `ok: false`; bei Kündigung wird `anfrage` gelöscht.
  - `test_a88_f2_altstand_bleibt_aufgestockt`: Haus mit `aufgestockt: true, vollversorgung: true` → `serialisieren` → `ladenMitBefund` → beide Flags bleiben, Bedarf × 1,5 × 1,4, nach 1 h keine `anfrage`.
  - `test_a88_f2_anfrage_wird_gespeichert`: Haus mit `anfrage` → serialisieren/laden → `anfrage` bleibt.
  - `test_a88_f2_abwesend_eine_meldung`: zwei Häuser erreichen während einer Abwesenheit (> `OFFLINE_SCHWELLE_S`) die Schwelle → keine Einzelmeldung „fragt an“, genau eine Meldung „Kunden fragen nach mehr Wärme“.
  - (AE-A88-7 „nur Annehmen setzt das Flag“ prüfen `test_a88_f2_kamin_wird_anfrage`, `…_aufstockung_wird_anfrage` und T6 über das Verhalten; eine Textsuche wäre zu leicht zu umgehen.)

## 10. Randfälle und Fehlerfälle
- HZ-Ausbau läuft gerade: es gilt die alte Stufe, bis der Bau fertig ist.
- Haus jenseits des Flusses auf Stufe 1: „Hausanschluss ziehen“ → Hinweis mit Spülbohrung/Stufe 2, kein stilles „kein Weg“.
- Offener Bauabschnitt mit geplanten Leitungen, dann HZ wird Stufe 2: Kosten ändern sich ab dem Moment (Gestattung kommt dazu). Bestellsumme und Anzeige nutzen dieselbe Funktion (`abschnittKosten_eur`).
- Alter Stand mit offenem Bauabschnitt auf Stufe 1: Gestattungs- und Anbohrkosten fallen sofort weg (F1 + F3); schon bezahlte Abschnitte bleiben bezahlt.
- Interessent (A50) jenseits des Flusses auf Stufe 1: bleibt gelb bis Stufe 2.
- Sicherungsdatei (A83) von vor A88 einspielen: normaler Stand mit Leiter, kein Fehler.
- Anfrage an einem kalten oder überlasteten Haus: bleibt stehen, Blase „kalt“/„leitung“ hat Vorrang; Annehmen bleibt möglich.
- Anfrage und Haus wird abgerissen/entfernt: Anfrage verschwindet mit dem Objekt.
- Spieler nimmt an, Station zu klein: Haus wird kalt wie heute nach der Aufstockung („Station zu klein“), der Kasten hat vorher darauf hingewiesen.

## 11. Vorarbeit (nicht für den Entwickler)
- **Tester-Vorarbeit V1 (vor P1, eigener Commit):**
  1. Neue Datei `tests/ohne-leiter.ts` mit `WIE_VOR_A88` (Spalte „heute“ aus Abschnitt 4: d50, d63, stationstypen, express, gestattung, spuelbohrung, wpg, puffer, vorlauf, ruecklauf_helfer, hauspuffer, pellet, gas, vorsehung, ptk, pv, dach_pv = 1; d75, d90, d110, solar, bad, gewerbe, brunnen, bhkw = 2; sonde, klinik, baugebiet = 3) und
     `export function ohneLeiter(echt: Record<string, unknown>): Record<string, unknown>` – gibt `{ ...echt, abStufe, freigeschaltet, sperrgrund, neuBeiStufe }` zurück, alle vier mit `WIE_VOR_A88` (fehlt = 1) und der HZ-Stufe aus `stand.objekte`. **Alle vier** müssen ersetzt werden: Aufrufe innerhalb des echten Moduls (z. B. `freigeschaltet` → `abStufe`) erreicht ein Mock nicht. Nur lokale Typen bzw. `typen.ts`/`katalog.ts` importieren (nicht `freischaltung.ts`), damit die Typprüfung vor P2 grün ist.
  2. In `tests/anpassungen.test.ts`, `tests/spiel.test.ts`, `tests/nachbarn.test.ts`, `tests/orte.test.ts` je oben:
     ```ts
     // A88: Diese Tests prüfen Mechaniken nach den Freischalt-Stufen von vor A88 (Bauplan Abschnitt 11)
     vi.mock('../src/core/freischaltung', async (orig) => (await import('./ohne-leiter')).ohneLeiter(await orig()));
     ```
     (`vi` zum vitest-Import ergänzen). Sonst keine Änderung an diesen Dateien – `neuerSpielstand(` bleibt.
  3. In `tests/anpassungen.test.ts` die beiden Tests Z. 288–302 („A34: Dauerhaft hohe Zufriedenheit …“, „Aufstockung: Ein Wohnhaus stockt …“) entfernen; Kommentar „ersetzt durch tests/a88-kundenanfrage.test.ts (A88/F2)“. Der Rest des `describe` bleibt.
  Erwartung: vor P1 alle Tests grün (heute 296, danach 294); `npm run typecheck` grün. In der Wegwerf-Kopie getestet: Schritt 2 ist vor P2 wirkungslos und stört nicht.
- **Architekt-Vorarbeit:** erledigt – `tests/architektur/a88-freischaltung.test.ts` an F3 angepasst (Tabelle nur in freischaltung.ts gelesen, kein `freischalt_leiter` in `src/`), greift, sobald `src/core/freischaltung.ts` existiert.

## 12. Eskalation – Entwickler stoppt, wenn
- ein bestehender Test (mit dem Mock aus V1) rot wird, der nicht nur am Meldungstext hängt – dann verhält sich eine Mechanik anders als vor A88;
- `speichern.ts`, `netz.ts` oder die Speicher-Version geändert werden müssten;
- `spiel.ts` die Tabelle `FREISCHALTUNGEN` direkt lesen „müsste“ (dann greift der Test-Mock nicht – Architekturtest wird rot);
- ein Gebäude oder eine Station eines alten Stands durch die Sperre unbedienbar würde, das in Abschnitt 5 nicht steht.

## 13. Risiko-Auslöser
Nein (P1 und P2). Keine Anmeldung, keine Daten von außen (Spielstand-Laden unverändert; ein manipulierter `anfrage`-Wert wird abgelehnt), keine neue Schnittstelle nach außen, keine Geheimnisse, keine Zahlungen. Sicherheitsprüfung am Meilenstein reicht.

## 14. Entscheidungen Simon (2026-11-05)
- **F1:** wie empfohlen – Gestattung (ab 2) und Anbohrung (ab 4) vorher kostenlos und nicht erwähnt.
- **F2:** „Kunden fragen an, ob sie Ofen abschalten dürfen und mehr Wärme von mir beziehen, so kann ich je nach Möglichkeit freigeben.“ → Anfrage mit Annehmen/Später, ab Stufe 1 (Abschnitt 6b, 7b, T11). Schon aufgestockte Häuser alter Stände bleiben aufgestockt.
- **F3:** abweichend von der Empfehlung – alle Spielstände bekommen die Leiter, Gebautes bleibt (Abschnitt 5).
- Vom Architekten festgelegt (Simon kann ändern): Ablehnen ohne Strafe; die Anfrage kommt nach derselben Wartezeit wieder.

## 15. Zusammenspiel mit NR2/NR3
NR2 ordnet die Aufträge und kürzt Texte; A88 ändert `auftraege.ts` nicht. T7 hält fest, welche Merkmale jeder Auftrag braucht – NR2 muss ihn grün halten. Für NR2 nützlich: `neuBeiStufe()` und `freigeschaltet()`. NR3 hängt an jede Zeile der Tabelle eine „Wusstest du?“-Karte; der Schlüssel `Merkmal` ist dafür die Kennung. Eine Wissenskarte zur Kundenanfrage („Wer mehr Wärme will, beantragt beim Versorger eine höhere Anschlussleistung“) prüft vorher der Fachprüfer.
