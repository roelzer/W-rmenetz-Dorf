# Bauplan A88 – Freischalt-Leiter (aus NR1)

Stand: 2026-11-05 · Architekt (Modus entwurf) · Grundlage: docs/lastenheft.md NR1, NR2; Code-Stand 75d289d.
Ein Paket, Schwierigkeit **mittel** (viele kleine Stellen im Kern und in der Oberfläche, eine neue Kernregel, Altstand-Regel; keine knifflige Rechnung).

## 1. Ziel
Ein neues Spiel zeigt nur die Inhalte der Stufe 1. Alles andere schaltet mit der Stufe der Heizzentrale frei. Gesperrtes bleibt sichtbar und zeigt „ab Heizzentrale Stufe X“. Ob etwas frei ist, entscheidet **eine** Funktion im Kern, die Oberfläche fragt nur ab. Alte Spielstände spielen genau wie heute weiter.

## 2. Prüfung des NR1-Vorschlags gegen den heutigen Spielablauf (gelesen, Belege)

**B1 – Gestattung und Anbohrung sind Kosten, kein Knopf.** Sie entstehen automatisch, sobald eine Leitung abseits der Straße liegt (`gestattungsFelder()`, src/core/spiel.ts:547) oder seitlich an eine durchlaufende Leitung andockt (`brauchtAnbohrung()`, spiel.ts:569). „Sperren“ kann hier nur heißen: **vor der Freischaltung werden sie nicht berechnet und nicht erwähnt.** Ein Verbot wäre eine Sackgasse (B2).

**B2 – Das dritte Starthaus liegt nicht an der Straße.** Starthäuser (src/core/orte.ts:33): (9|13), (12|14), **(13|12)**. Straßen (orte.ts:40–52): x=10, x=17, y=6, y=17 …; kein Nachbarfeld von (13|12) ist Straße. Jeder Weg dorthin braucht 2 Felder abseits der Straße (Gestattung) und dockt an die durchlaufende 40er an (Anbohrung). Der zweite Auftrag `c2` („alle drei Starthäuser“, src/core/auftraege.ts:14) und das Stufenziel 2 (3 Anschlüsse, src/core/katalog.ts:440) hängen daran. Würde „Gestattung ab Stufe 2“ als Verbot gebaut, bliebe die Auftragsreihe bei `c2` für immer stehen (der angezeigte Auftrag ist der erste nicht erledigte, auftraege.ts:41).

**B3 – Stufe 1 kann nach etwa 30–45 Minuten kalt werden.** Start-Hauptleitung ist eine 40er (40 kW, katalog.ts:203; spiel.ts:46), sie trägt alle drei Starthäuser. Ein Einfamilienhaus braucht 10 kW (15.000 kWh ÷ 1.500 h). Nach 1.800–2.700 s warmer Zeit stockt es auf (×1,4, spiel.ts:974; katalog.ts:365–366), bei sehr günstigem Preis kommt „Kamin aus“ dazu (×1,5). Drei aufgestockte Häuser = 42 kW > 40 kW: Die überlastete Stelle direkt an der Heizzentrale macht alle Häuser dahinter kalt (netz.ts:165). Heute tauscht man auf eine 50er; nach NR1 ist die 50er erst ab Stufe 2 da. Stufe 2 kostet 48.000 € (1.200 × Kostenfaktor 40, katalog.ts:78/349) bei 30.000 € Start – grob überschlagen dauert Stufe 1 mehrere Stunden (nicht gemessen, nur gelesen und überschlagen). → Entscheidung F2.

**B4 – Heute gibt es schon drei verstreute Sperr-Mechanismen:** `min_hz_stufe` (BHKW, Großabnehmer; katalog.ts:150/257/261/266), Nullen in `grenze` (75er–110er, Solarthermie, Erdsonde, Brunnen; katalog.ts:219–229, 179, 188, 286) und die Konstante `baugebiet_hz_stufe` (katalog.ts:370). Die Oberfläche rechnet die Sperre selbst nach (src/ui/katalog.ts:88–89; src/ui/kontext.ts:268; src/steuerung.ts:149). A88 führt das in **eine** Tabelle zusammen.

**B5 – Wärmepumpe und Power-to-Heat sind heute ab Stufe 1 baubar**, obwohl A3 sagt „kommen später als Ausbau“. NR1 nennt sie nicht; der Plan legt sie fest (Tabelle).

**B6 – Viele bestehende Tests bauen auf Stufe-1-Freiheit** (z. B. 50er platzieren, Vorlauf, Helfer, Express, Vorsehung, Pelletkessel in tests/anpassungen.test.ts:35–1161; tests/spiel.test.ts:21–256). Deshalb gilt für Spielstände ohne Leiter-Merker der heutige Stand (Abschnitt 5) – dann reicht eine mechanische Tester-Vorarbeit (Abschnitt 10).

**Aufträge gegen die Leiter** (mit Tabelle aus Abschnitt 4 und den Empfehlungen F1/F2):

| Auftrag | wird aktuell bei | braucht | frei? |
|---|---|---|---|
| c1 erstes Haus | Stufe 1 | – (beim Start schon erfüllt → NR2) | ja |
| c2 drei Starthäuser | 1 | Bauabschnitt, passende Station, Weg abseits der Straße, Andocken | ja, **nur** wenn Gestattung/Anbohrung vor Freischaltung kostenlos sind (B1/B2) |
| col Monatsabrechnung | 1 | nichts | ja |
| h3 viertes Haus | 1 | wie c2; 4 × 10 kW = 40 kW = genau die 40er | ja, aber nur ohne Aufstockung (F2) |
| grant Förderantrag | 1 | Förderung (bleibt Stufe 1) | ja |
| hz2 | 1 | 3 Anschlüsse, 48.000 € | ja |
| fund | 2 | eine förderfähige Quelle: 2. Kessel, Wärmepumpe, Puffer, Solarthermie | ja |
| obs | 1 | – | ja |
| main Hallenbad | 2 | Vertrag ab 2; Weg über Straßen x=10 → y=6 → x=5, 45 kW → 50er | ja (Knopf „110er-Leitung legen“ muss weg, siehe 7) |
| saw Sägewerk | 2 | Vertrag ab 2; liegt östlich des Flusses → Spülbohrung | ja (Spülbohrung ab 2) |
| h8, deko | 2 | – | ja |
| hz3 | 2 | 5 Anschlüsse, 80 kW → 63er oder zwei Abgänge | ja |

## 3. Festlegungen

- **AE-A88-1 Eine Regel.** Bindet: jede Freischalt-Entscheidung. Verhindert: Oberfläche und Kern entscheiden verschieden („Knopf grau, Aktion geht trotzdem“ oder umgekehrt). Regel: Die Tabelle `FREISCHALTUNGEN` steht nur in `src/core/freischaltung.ts`; außerhalb von `src/core` kommen weder die Tabelle noch `min_hz_stufe`/`grenze(..) > 0`/`hzStufe >= <Zahl>` vor. Prüfung: tests/architektur/a88-freischaltung.test.ts (greift, sobald die Datei existiert).
- **AE-A88-2 Der Kern setzt durch.** Jede Aktion, die ein gesperrtes Merkmal nutzt, lehnt der Kern selbst ab (`Ergebnis { ok: false, hinweis }`), die Oberfläche graut nur aus. Prüfung: Tests T4.
- **AE-A88-3 Sperre gilt für Neues, nie für Bestehendes.** Gebautes läuft weiter, lässt sich ausbauen, verkaufen, entfernen; laufende Aufträge (Helfer, Express, Bau) laufen zu Ende. Gesperrt ist nur Neukauf, Neubau, Tausch *auf* einen gesperrten Typ und das Einschalten einer gesperrten Funktion.
- **AE-A88-4 Kosten vor ihrer Freischaltung entfallen** (Gestattung, Anbohrung): nicht berechnet, nicht erwähnt. Ab Freischaltung gelten sie wie heute.
- **AE-A88-5 Altstand.** Merker `freischalt_leiter: true` setzt nur `neuerSpielstand`. Fehlt er (alte Stände, Sicherungsdateien von vor A88), gilt Spalte `alt_ab_stufe` = heutiges Verhalten. Muster übernommen von A79 (`namen_gefragt`, typen.ts:115) [ÜBERNOMMEN]. Keine neue Speicher-Version.
- **AE-A88-6 `min_hz_stufe` und `KONSTANTEN.baugebiet_hz_stufe` entfallen**, die Tabelle ersetzt sie. `grenze` bleibt reine Stückzahl-Grenze; eine 0 in `grenze` ist nur unterhalb der Freischalt-Stufe erlaubt (Test T1c).

## 4. Freischalt-Tabelle (Vorschlag; Werte sind Daten, Simon kann jede Zeile ändern)

| Merkmal (Schlüssel) | ab Stufe (neu) | alt (heute) | Durchsetzung im Kern | Anzeige |
|---|---|---|---|---|
| 25er/32er/40er, Hackschnitzelkessel, Bauabschnitt (Philipp/Laura), passende Übergabestation, Monteurhütte, Büro, Förderung, Deko außer Brunnen | 1 | 1 | kein Eintrag | – |
| `d50`, `d63` | 2 | 1 | `platzieren`, `leitungTauschen`, `hausanschlussPlanen` | Baumenü-Karte, Zeichenleiste, Leitungskarte |
| `d75`, `d90`, `d110` | **3** (Vorschlag Architekt) | 2 | wie oben | wie oben |
| `stationstypen` (Station frei wählen statt automatisch passend) | 2 | 1 | `stationKaufen` | Hauskarte, Großabnehmerkarte |
| `express` | 2 | 1 | `expressLiefern` | Baumenü Bauabschnitt |
| `gestattung` (Kosten abseits der Straße) | 2 | 1 | `gestattungsFelder`, `feldKosten_eur`, `materialBestellen` | Baumenü-Texte |
| `spuelbohrung` (Leitung durch den Fluss) | 2 | 1 | `platzieren` (Flussfeld), `hausanschlussPlanen` (Flussfelder unpassierbar) | Hinweis beim Ablehnen |
| `kundenwachstum` (Aufstockung, „Kamin aus“) | 2 (wenn F2 = ja) | 1 | `einnahmen` | – |
| `wpg` Wärmepumpe | 2 (Vorschlag, A3) | 1 | `innenEinbauen`, `foerderungBeantragen` | Baumenü Heizhaus, Büro |
| `puffer` Pufferspeicher außen | 2 (Vorschlag) | 1 | `platzieren`, `foerderungBeantragen` | Baumenü, Büro |
| `solar` | 2 | 2 | wie oben | wie oben |
| `bad`, `gewerbe` (Vertrag) | 2 | 2 | `vertragBedingungen` | Großabnehmerkarte (Liste „fehlt“) |
| `brunnen` | 2 | 2 | `platzieren` | Baumenü Deko |
| `vorlauf` (Regler) | 3 | 1 | `vorlaufSetzen` | Heizzentralen-Karte |
| `ruecklauf_helfer` (Sebastian, Christian, Manfred) | 3 | 1 | `upgradeKaufen` | Hauskarte, Heizzentralen-Karte (Helfer) |
| `hauspuffer` (Puffer im Haus) | 3 (Vorschlag) | 1 | `hauspufferEinbauen` | Hauskarte |
| `pellet`, `gas` | 3 | 1 | `innenEinbauen`, `foerderungBeantragen` | Baumenü Heizhaus, Büro |
| `sonde`, `klinik` | 3 | 3 | `platzieren` bzw. `vertragBedingungen` | wie oben |
| `vorsehung` (T-Stück-Werkzeug **und** Anbohrkosten) | 4 | 1 | `vorsehungUmschalten`, `brauchtAnbohrung` | Leitungskarte, Baumenü-Texte |
| `bhkw` | 4 | 2 | `innenEinbauen`, `foerderungBeantragen` | Baumenü Heizhaus, Büro |
| `ptk` Power-to-Heat | 4 (Vorschlag: Strom-Thema mit PV) | 1 | wie oben | wie oben |
| `pv` (außen), `dach_pv` | 4 | 1 | `platzieren`, `dachPvKaufen` | Baumenü, Heizzentralen-Karte |
| `baugebiet` | 4 | 3 | `baugebietBedingungen` | Heizzentralen-Karte |

Häuser (`rh`, `baeck`, `mfh`) baut der Spieler nicht; sie bekommen keinen Eintrag und sind von Test T1c ausgenommen (nur Kategorien aus `BAU_KATEGORIEN`).
Die Start-Vorsehung (A74) bleibt als Objekt im Startnetz; vor Stufe 4 hat sie nur keine Wirkung auf Kosten.

## 5. Alte Spielstände
- Fehlt `freischalt_leiter`, rechnet `abStufe()` mit `alt_ab_stufe`. Ergebnis: alles verhält sich wie vor A88 – nichts Gebautes und nichts Freigeschaltetes geht verloren. (Folge: Wer einen alten Stand hat, sieht die Leiter erst nach „Spielstand zurücksetzen“. → F3)
- Kein Umschreiben beim Laden, kein Befund `migriert` (sonst erscheint der Start-Hinweis über Straßen/Fluss, vgl. ENTSCHEIDUNGEN „Review A86“).
- Bestandsschutz Vorlauf (falls F3 anders entschieden wird und die Leiter auch für Altstände gilt): `freigeschaltet(stand, 'vorlauf')` ist auch wahr, solange `stand.vorlauf_c` gesetzt und ≠ `VORLAUF.start_c` ist – sonst säße ein Spieler mit gesenktem Vorlauf fest. Diese Ausnahme gehört in jedem Fall in `freigeschaltet` (kostet eine Zeile, schützt auch neue Stände vor Sonderfällen).

## 6. Schnittstellen (exakt)

**Neu: `src/core/freischaltung.ts`** (nur Kern-Importe: `katalog`, `typen`, `netz`)
```ts
export type Funktion =
  | 'stationstypen' | 'express' | 'gestattung' | 'spuelbohrung' | 'kundenwachstum'
  | 'vorlauf' | 'ruecklauf_helfer' | 'hauspuffer' | 'vorsehung' | 'dach_pv' | 'baugebiet';
export type Merkmal = TypId | Funktion;
export interface Freischaltung { ab_stufe: number; alt_ab_stufe: number }
export const FREISCHALTUNGEN: Readonly<Partial<Record<Merkmal, Freischaltung>>>;
export const FUNKTION_NAME: Readonly<Record<Funktion, string>>;   // Anzeigename, z. B. express: 'Expresslieferung'
export function merkmalName(m: Merkmal): string;                  // KATALOG[m].name oder FUNKTION_NAME[m]
export function abStufe(stand: Spielstand, m: Merkmal): number;   // 1 ohne Eintrag; alt_ab_stufe, wenn stand.freischalt_leiter !== true
export function freigeschaltet(stand: Spielstand, m: Merkmal): boolean; // heizzentrale(stand.objekte).stufe >= abStufe(...), plus Vorlauf-Bestandsschutz (5)
export function sperrgrund(stand: Spielstand, m: Merkmal): string | null; // `ab Heizzentrale Stufe ${abStufe}` oder null
export function neuBeiStufe(stand: Spielstand, stufe: number): Merkmal[]; // alle mit abStufe === stufe, Reihenfolge der Tabelle
```
Die Stufe zählt erst, wenn der Ausbau fertig ist (`o.stufe` steigt in `bis()`, spiel.ts:872).

**`src/core/typen.ts`** – `Spielstand` bekommt:
```ts
/** A88: true = Freischalt-Leiter gilt (neues Spiel). Fehlt bei alten Ständen = Freischaltungen wie vor A88. */
freischalt_leiter?: boolean;
```

**`src/core/spiel.ts`**
- `neuerSpielstand(...)` setzt `freischalt_leiter: true`. Signatur unverändert.
- `Spiel` bekommt Abfragen für die Oberfläche (dünne Weiterleitungen, kein eigener Code):
  `freigeschaltet(m: Merkmal): boolean`, `sperrgrund(m: Merkmal): string | null`.
- `passendeLeitung(bedarf_kw: number): TypId | undefined` – kleinste **freigeschaltete** Leitung mit `kapazitaet_kw ≥ bedarf`, sonst die dickste freigeschaltete. Aus `hausanschlussPlanen` (spiel.ts:620–621) herausgezogen, dort und in der Oberfläche genutzt.
- `vorlaufSetzen(c: number): Ergebnis` (bisher `void`; Aufrufer, die das Ergebnis ignorieren, bleiben gültig).
- Durchsetzung je Methode: siehe Spalte „Durchsetzung“ in Abschnitt 4. Meldungen über `this.nein(...)` mit `${merkmalName(m)} ${sperrgrund}`; Flussfeld: „Über den Fluss geht es erst mit Spülbohrung – ab Heizzentrale Stufe 2“. Großabnehmer: Eintrag in `fehlt` bleibt im Format `Heizzentrale Stufe ${n}` (Test tests/spiel.test.ts:226 prüft diesen Text). Baugebiet ebenso.
- `brauchtAnbohrung` liefert `false`, solange `vorsehung` gesperrt ist → `anbohrungsFelder()`, `anbohrung_eur()` und die Wegsuche rechnen automatisch ohne Anbohrung.
- `gestattungsFelder()` liefert `[]`, solange `gestattung` gesperrt ist; `feldKosten_eur` rechnet dann ohne Gestattung; `materialBestellen` merkt sich in diesem Fall keine Felder.
- Freischalt-Meldung: In `bis()` an der Stelle, an der ein Ausbau fertig wird (spiel.ts:872), bei `o.typ === 'hz'` einen `hinweis` „Neu ab Stufe X: …“ mit `neuBeiStufe(...)`-Namen (höchstens 4 Namen, dann „…“). Kein neuer Ereignistyp – NR3 ersetzt das später durch die „Wusstest du?“-Karte und nutzt dafür `neuBeiStufe`.

**`src/core/katalog.ts`** – Feld `min_hz_stufe` aus `Definition` und den vier Einträgen entfernen; `baugebiet_hz_stufe` aus `KONSTANTEN` entfernen. `grenze` bleibt unverändert.

## 7. Oberfläche (fragt nur ab: `sp.freigeschaltet(m)`, `sp.sperrgrund(m)`, `sp.passendeLeitung(kw)`)
Gestaltung nach DESIGN.md 12.5/12.7/12.14: gesperrter Knopf = deaktiviert, Grund in Zeile 2, keine Münze; Katalogkarte gesperrt = Bild blass, Schloss, Grund, bleibt tippbar.
- **src/ui/katalog.ts:83–108** Baumenü: `gesperrt = !sp.freigeschaltet(t)`, Grund = `sp.sperrgrund(t)`. Eigene Berechnung (Z. 88–89) entfällt. Antippen einer gesperrten Karte: Toast mit dem Grund.
- **src/ui/katalog.ts:55–79** Bauabschnitt: Gestattungs-, Bohrungs-, Anbohr- und Vorsehungssätze nur, wenn das jeweilige Merkmal frei ist; Express-Knopf gesperrt = deaktiviert mit Grund.
- **src/steuerung.ts:149** Zeichenleiste: freigeschaltete Durchmesser + **ein** deaktivierter Knopf „Dickere ab Stufe X“ (X = kleinste `abStufe` einer gesperrten Leitung).
- **src/ui/kontext.ts** Leitungskarte (Z. 262–269): Vorsehungs-Text und -Knopf nur bei `vorsehung` frei (sonst ein deaktivierter Knopf mit Grund, solange der Abschnitt offen ist); Tauschen nur auf freigeschaltete + ein deaktivierter Knopf wie in der Zeichenleiste.
- Hauskarte: `stationswahl` (Z. 188–203) – ohne `stationstypen` ein Knopf „Übergabestation einbauen · <passende>“ (bzw. „Größere Station einbauen“, wenn die alte zu klein ist); `pufferBereich` und `upgradeBereich` gesperrt = Kastentitel + ein deaktivierter Knopf mit Grund, kein Erklärtext.
- Großabnehmerkarte (Z. 213): Knopf „110er-Leitung legen“ ersetzen durch `stempeln(sp.passendeLeitung(bedarfKw(o)))` (heute wäre die 110er bei Stufe 2 gesperrt).
- Heizzentralen-Karte (Z. 290–317): Vorlauf-Stepper gesperrt = deaktiviert, Grund darunter; Kasten „Helfer“ gesperrt = eine Zeile mit Grund; PV-Dach und Baugebiet = deaktivierter Knopf mit Grund.
- Büro (Z. 350–354): Zeile je Quelle; gesperrte Quelle zeigt deaktivierten Knopf mit Grund statt „Antrag stellen“.

## 8. Dateien
- **anlegen:** `src/core/freischaltung.ts`; Testdatei `tests/a88-freischalt-leiter.test.ts`
- **ändern:** `src/core/typen.ts` (Spielstand-Feld), `src/core/spiel.ts` (neuerSpielstand, Abfragen, Durchsetzung, passendeLeitung, Meldung in bis), `src/core/katalog.ts` (min_hz_stufe, baugebiet_hz_stufe raus), `src/ui/katalog.ts`, `src/ui/kontext.ts`, `src/steuerung.ts`
- **nicht ändern:** `src/core/auftraege.ts` (Reihenfolge und Texte sind NR2), `src/core/speichern.ts` (kein Umschreiben nötig), bestehende Tests (→ Vorarbeit)

## 9. Tests (neue Datei `tests/a88-freischalt-leiter.test.ts`; Stände über `neuerSpielstand` = mit Leiter)
Erwartete Werte stammen aus der Tabelle in Abschnitt 4 und den Daten in katalog.ts/orte.ts, nicht aus eigener Rechnung.

- **T1 Tabelle**
  - `test_a88_tabelle_stufen`: für jede Zeile aus Abschnitt 4 `abStufe(neu, m)` = Spalte „neu“ und `abStufe(alt, m)` = Spalte „alt“ (alt = Stand ohne `freischalt_leiter`).
  - `test_a88_jede_funktion_hat_namen`: jeder `Funktion`-Schlüssel hat einen Eintrag in `FREISCHALTUNGEN` und `FUNKTION_NAME`.
  - `test_a88_grenze_null_nur_unter_freischaltung` (T1c): für jeden Typ aus den Kategorien von `BAU_KATEGORIEN` und jede Stufe s: `grenze[s-1] === 0` ⇒ `s < min(ab_stufe, alt_ab_stufe)`.
- **T2 Je Stufe, was baubar ist** (`test_a88_stufe_<n>_baubar`, n = 1…5): Stand mit Leiter, HZ-Stufe n gesetzt; die Menge der freigeschalteten Merkmale entspricht genau der Tabelle (Stufe 1: d25, d32, d40, kessel, Büro, Hütte, Deko ohne Brunnen; keine Funktion frei).
- **T3 Neues Spiel**
  - `test_a88_neues_spiel_hat_leiter`: `neuerSpielstand(0).freischalt_leiter === true`.
  - `test_a88_neues_spiel_nur_stufe1`: Stufe 1; `platzieren('d50', …)` im offenen Abschnitt → `ok: false`, Hinweis enthält „ab Heizzentrale Stufe 2“; `innenEinbauen('pellet')` → `ok: false`; `innenEinbauen('kessel')` mit Geld → `ok: true`.
  - `test_a88_startnetz_bleibt` (A74): Startnetz unverändert inkl. Vorsehung bei (10|14); `netz.warm` enthält beide Starthäuser.
- **T4 Kern setzt durch** (je ein Fall, Stufe 1, mit genug Geld): `leitungTauschen(startleitung, 'd50')`, `stationKaufen(haus, 'st_25')` bei 10-kW-Haus (nicht passend) → false, mit `'st_15'` → true; `expressLiefern()` im laufenden Bau → false; `vorsehungUmschalten(geplant)` → false; `upgradeKaufen` → false; `hauspufferEinbauen` → false; `vorlaufSetzen(65)` → `ok: false` und `vorlauf_c` bleibt 75; `dachPvKaufen` → false; `foerderungBeantragen('pellet')` → false, `('kessel')` → true; Leitung auf Flussfeld (19|3) → false; `baugebietBedingungen().fehlt` enthält „Heizzentrale Stufe 4“; `vertragBedingungen(bad).fehlt` enthält „Heizzentrale Stufe 2“.
- **T5 Kosten vor Freischaltung**
  - `test_a88_stufe1_ohne_gestattung`: Leitung abseits der Straße, z. B. (12|15) → `gestattung_eur() === 0`, Materialpreis ohne Gestattung, `stand.gestattungen` bleibt leer.
  - `test_a88_stufe1_ohne_anbohrung`: seitliches Andocken an die Start-40er → `anbohrungsFelder()` leer.
  - `test_a88_ab_stufe2_gestattung`: gleicher Fall mit HZ-Stufe 2 → `gestattung_eur() === KONSTANTEN.gestattung_eur_je_feld`.
  - `test_a88_ab_stufe4_anbohrung`: mit HZ-Stufe 4 → genau ein Anbohrfeld.
- **T6 Stufe 1 ist durchspielbar** (`test_a88_stufe1_durchspielbar`, Uhr als Variable): neues Spiel, Kessel gewählt → `abschnittPlanen` → nach Planungszeit `hausanschlussPlanen(haus 13|12)` ok, nur freigeschaltete Leitungstypen geplant → passende Station kaufen → `abschnittAbschliessen`, `materialBestellen` ok → nach Bauzeit sind 3 Häuser warm → `hzZiele()` für Stufe 2: Anschlüsse erreicht → `pruefeAuftraege` hat `c2` erledigt. Danach Uhr um 3 Stunden vor: alle drei Häuser weiter warm (prüft F2; entfällt, wenn Simon F2 ablehnt – dann stattdessen Test, dass eine zweite Leitung direkt aus der Heizzentrale die Last teilt).
- **T7 Auftragsreihe** (`test_a88_auftraege_brauchen_nur_freies`): Tabelle im Test „Auftrag → nötige Merkmale“ gemäß Abschnitt 2 (c2/h3: Stufe 1 ohne Gestattungs-/Anbohrkosten; fund: kessel|wpg|puffer|solar; main: bad, d50; saw: gewerbe, spuelbohrung; hz3: d63); für jede Zeile: bei der Stufe, auf der der Auftrag frühestens aktuell wird (vor hz2 = 1, danach 2), ist mindestens ein bzw. jedes nötige Merkmal frei. Schützt NR2 vor einer Umordnung, die eine Sperre trifft.
- **T8 Altstand**
  - `test_a88_altstand_wie_vorher`: Stand ohne `freischalt_leiter`, Stufe 1: `platzieren('d50')` im Abschnitt ok, `vorlaufSetzen(65)` ok, Gestattung wird berechnet, `innenEinbauen('bhkw')` → false (wie heute).
  - `test_a88_altstand_laden`: `serialisieren` eines Stands ohne Merker → `ladenMitBefund` → Befund `'ok'` (nicht `'migriert'`), Merker fehlt weiter.
  - `test_a88_gebautes_bleibt`: Stand **mit** Leiter, Stufe 1, gebaute 50er, Pelletkessel und Pufferspeicher vorhanden (direkt in den Stand gelegt): nach `neuBerechnen` und `bis(+1 h)` alles vorhanden und wirksam; `innenAusbauen` des Pelletkessels wird nicht wegen der Leiter abgelehnt (nur wegen HZ-Stufe); 50er gegen 40er tauschen ok.
  - `test_a88_vorlauf_bestandsschutz`: Stand mit Leiter, Stufe 1, `vorlauf_c = 65` → `freigeschaltet('vorlauf')` true; nach `vorlaufSetzen(75)` false.
- **T9 Freischalt-Meldung** (`test_a88_meldung_bei_stufe2`): HZ-Ausbau auf 2 fertig → ein `hinweis` mit „Neu ab Stufe 2“ und „Expresslieferung“.
- **T10 Oberfläche fragt nur ab** – bereits als Architekturtest vorhanden (`tests/architektur/a88-freischaltung.test.ts`). Zusätzlich mit der DOM-Attrappe aus tests/menue-v2.test.ts (Muster A84 W1), falls die Karte ohne Browser baubar ist: Baumenü auf Stufe 1 zeigt die 50er-Karte mit Klasse `gesperrt` und Text „ab Heizzentrale Stufe 2“. Geht das ohne neue Abhängigkeit nicht: Sichtprüfung durch den Designer (Fotos Baumenü Reiter Leitungen, Hauskarte, Heizzentralen-Karte auf Stufe 1, 844×390 und 667 px).

## 10. Randfälle und Fehlerfälle
- HZ-Ausbau läuft gerade: es gilt die alte Stufe, bis der Bau fertig ist.
- Haus jenseits des Flusses auf Stufe 1: „Hausanschluss ziehen“ → Hinweis mit Spülbohrung/Stufe 2, kein stilles „kein Weg“.
- Offener Bauabschnitt mit geplanten Leitungen, dann HZ wird Stufe 2: Kosten ändern sich ab dem Moment (Gestattung kommt dazu). Die Bestellsumme wird beim Bestellen neu berechnet (heute schon so) – im Baumenü muss die angezeigte Summe dieselbe Funktion nutzen (heute so: `abschnittKosten_eur`).
- Geplante Vorsehung in einem alten Stand ohne Leiter: unverändert.
- Interessent (A50) jenseits des Flusses auf Stufe 1: bleibt gelb, bis Stufe 2 – zulässig, keine Sonderregel.
- Sicherungsdatei (A83) von vor A88 einspielen: Altstand, kein Fehler.

## 11. Vorarbeit (nicht für den Entwickler)
- **Tester-Vorarbeit V1 (vor dem Bau, eigener Commit):** In `tests/hilfen.ts` eine Hilfe `altstand(jetzt_ms: number, ortId?: string): Spielstand` = `neuerSpielstand(...)` ohne Feld `freischalt_leiter` (heute schon kompilierbar, z. B. `Reflect.deleteProperty(s, 'freischalt_leiter')`). In `tests/anpassungen.test.ts`, `tests/spiel.test.ts`, `tests/nachbarn.test.ts`, `tests/orte.test.ts` jeden Aufruf `neuerSpielstand(` durch `altstand(` ersetzen (mechanisch, Import ergänzen). Bedeutung: Diese Tests prüfen die Mechaniken nach heutigen Regeln. Erwartung: vor und nach V1 alle 296 Tests grün.
- **Architekt-Vorarbeit:** erledigt – `tests/architektur/a88-freischaltung.test.ts` liegt bereit und greift automatisch, sobald `src/core/freischaltung.ts` existiert.

## 12. Eskalation – Entwickler stoppt, wenn
- ein bestehender Test nach V1 rot wird, der nicht nur am Meldungstext hängt (dann ändert die Leiter heutiges Verhalten für Altstände – das darf sie nicht);
- `speichern.ts` oder die Speicher-Version geändert werden müssten;
- Simon F1–F3 anders entschieden hat als hier angenommen und die Tabelle dadurch eine Sackgasse in T6/T7 erzeugt.

## 13. Risiko-Auslöser
Nein. Keine Anmeldung, keine Daten von außen (Spielstand-Laden bleibt unverändert), keine neue Schnittstelle nach außen, keine Geheimnisse, keine Zahlungen. Sicherheitsprüfung am Meilenstein reicht.

## 14. Offene Fragen an Simon (je mit Empfehlung)
- **F1 Gestattung und Anbohrung auf den ersten Stufen:** (a) vor Stufe 2 bzw. 4 kostenlos und nicht erwähnt, ab dann wie heute – **Empfehlung**; (b) ab Stufe 1 wie heute, nur mit Erklärung (NR3) – dann taucht der Fachbegriff gleich im ersten Bauabschnitt auf; (c) als Verbot – geht nicht, das dritte Starthaus wäre unerreichbar (B2). Zusatz: Anbohren ist bei (a) drei Stufen lang kostenlos und kostet erst ab Stufe 4 – wer lieber früher lernen soll, setzt `vorsehung` auf Stufe 3.
- **F2 Kunden wachsen erst ab Stufe 2** (Aufstockung, „Kamin aus“): (a) ja – **Empfehlung**, sonst wird die 40er auf Stufe 1 nach 30–45 Minuten zu klein und ohne 50er kalt (B3); (b) nein, dafür 50er schon ab Stufe 1; (c) nein, Stufe 2 billiger machen (Wirtschaft, eigenes Paket).
- **F3 Alte Spielstände:** (a) spielen wie bisher, die Leiter gilt nur für neue Spiele – **Empfehlung** (am sichersten, wenig Aufwand; Leiter sehen nach „Zurücksetzen“); (b) bekommen die Leiter auch, nur Gebautes bleibt – mehr Sonderfälle (Vorlauf, laufende Helfer) und mehr Testumbau.
Ohne Antwort baut der Projektleiter mit den Empfehlungen; jede ist eine Tabellenzeile bzw. eine Bedingung und später leicht änderbar.

## 15. Zusammenspiel mit NR2
NR2 ordnet die Aufträge und kürzt Texte; A88 ändert `auftraege.ts` nicht. Test T7 hält fest, welche Merkmale jeder Auftrag braucht – NR2 muss ihn grün halten. Für NR2 nützlich: `neuBeiStufe()` und `freigeschaltet()` (z. B. „Auftrag erst zeigen, wenn frei“). Der verkürzte erste Bauabschnitt (NR2) berührt die Leiter nicht. NR3 hängt an jede Zeile der Tabelle eine „Wusstest du?“-Karte; der Schlüssel `Merkmal` ist dafür die Kennung.
