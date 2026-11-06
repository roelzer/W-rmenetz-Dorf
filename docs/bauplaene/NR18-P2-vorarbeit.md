# NR18-P2 – Vorarbeit aus Lauf 1 (Entwickler, 06.11., blockiert nach dem Lesen)

Ausgangslage auf 1df16da: 19 rot / 1054 grün. Ziel P2: 4 Rote (a88-freischalt-leiter: test_a88_kern_setzt_durch_ersatz, test_a88_gebautes_bleibt_ersatz, test_a88_flussleitung_tauschbar; anpassungen „A30: Leitungsersatz im Bauabschnitt …“). 15 Rote gehören zu P3.

## Entscheidungen Projektleiter zu den drei Stolpersteinen
1. Typprüfung/Build sind auf dem P2-Branch rot, weil `src/ui/kontext.ts:225/382` noch `hausanschlussPlanen`/`leitungTauschen` aufruft. P2 fasst kontext.ts NICHT an; P2 und P3 werden gemeinsam gemergt. P2 meldet FERTIG_MIT_BEDENKEN, wenn die einzigen Typfehler diese Aufrufe in src/ui sind (genau auflisten).
2. Laufzeitmessung `tools/a91-laufzeit.messung.ts`: M2 entfällt mit der Wegsuche. M1 bekommt im Messwerkzeug eine kleine eigene Wegsuche (kürzester Weg Haus → nächste Leitung, Felder per `platzieren`) und baut auf `altesStartdorf` auf; M7 nutzt den M1-Aufbau.
3. Erreichte Häuser: Abgleich schon im Konstruktor merken (wie `haus_warm`), beim Laden nichts melden, danach jede Änderung melden.

## Bauskizze (gelesen und abgeglichen, nicht gebaut)
- Rückbau in spiel.ts: `hausanschlussPlanen` + `feldKosten_eur` (Z. 622–759), `leitungTauschen` (843–856), `gruppe` (458, 1032; typen.ts 39–40). Danach `berechneNetz(` einmal in spiel.ts, `probeNetz` die zweite Stelle (R4: höchstens 2). `passendeLeitung` bleibt (kontext.ts 322, 341).
- Private Felder `warnliste: string[]`, `erreicht?: Set<number>`.
- `probeNetz(anpassen?)` über alle Objekte; gebaute Leitung mit `ersatz` zählt als `{...o, typ: o.ersatz.typ}`. `erreichteHaeuser()` = Häuser/Großabnehmer mit Eintrag in `probeNetz().anschluss`, sortiert. `erreichtAbgleichen(probe)` meldet `haus_erreicht`/`haus_getrennt`.
- `ersatzPlanen`: (1) gebaut sonst {ok:false}; (2) Abschnitt offen sonst „Dickere Leitungen entstehen nur im Bauabschnitt – lass Philipp einen planen.“; (3) Kapazität > `ersatz?.typ ?? typ`; (4) `gesperrt(neu)`; dann `ersatz = {typ, nr: naechste_id++}`, `leitung_gezeichnet`. Keine Sperre auf Flussfeldern.
- `ersatz_eur()` = Neupreis − `rueckkauf_eur(alt,1)` + 8.000 € je Flussfeld, in `abschnittKosten_eur`. Probe A30: 40er→63er 1.520 − 400 = 1.120 €. `abschnittLeitungen()` zählt Ersatz mit.
- Warnungen: `stationKaufen` prüft nur, wenn Haus vorher `ohne_station`; vorher/nachher-Probe; neu kalt wegen Leitung → `engstellenFinden`, erster Text sonst `ENGPASS_ERSATZ`; Ereignis `engstelle` mit Feldern aller Stücke; in Phase `bestellen` zusätzlich `warnlisteFuellen(nachher)`. Stufe Satz 2: `e.empfohlen === null ? null : freigeschaltet(...) ? null : abStufe(e.empfohlen)`.
- Entfernen: Leitung mit Ersatz in Phase `bau` abgelehnt („Diese Leitung wird gerade ersetzt – warte, bis der Abschnitt gebaut ist.“). Sonst wie bisher (50 %), danach Probe für Abgleich und ggf. Warnliste.
- Zurücknehmen: `geplanteLeitungEntfernen` nimmt Ersatz zurück, wenn dort keine geplante Leitung liegt; `letzteLeitungZurueck` nimmt das jüngste (größte id bzw. ersatz.nr); `abschnittVerwerfen` löscht alle Ersatz-Einträge; `geplanteLeitungTyp` (nur offen, nur geplant, gesperrt-Prüfung) meldet `leitung_gezeichnet`.
- Warnliste füllen: `abschnittAbschliessen` (erster Text, bei >1 Stück plus `WEITERE_STELLEN`) und Konstruktor bei Phase `bestellen`. Leeren: Wieder-Öffnen, Verwerfen, Bestellen, Bauende.
- Bauende: `typ = ersatz.typ`, `ersatz` löschen, `_pop` setzen, dann `abschnitt_gebaut`. `haus_warm` in `neuBerechnen` per Vergleich mit `this.netz?.warm`, nicht bei der ersten Rechnung.
- Weitere Schritt-Ereignisse: `abschnitt_geplant`, `abschnitt_offen`, `station_gekauft`, `abschnitt_abgeschlossen`, `material_bestellt`.
- speichern.ts (nach `gueltig`, ohne `migriert`): `gruppe` löschen; `ersatz` löschen, wenn Leitung nicht gebaut, `ersatz.typ` keine Leitung/nicht dicker oder `nr` keine Zahl.
- Testaufbau „leeres Dorf“: aus `neuerSpielstand` ohne Leitungen/Stationen, mit Kessel (passt vor und nach P5). Heizzentrale (11|10), Spur (10|10)…(10|14).
- Wiederverwendbar: engstellenFinden/engstelleText/ENGPASS_ERSATZ/WEITERE_STELLEN (P1), rueckkauf_eur, gesperrt, nein, tests/hilfen/nr18.ts, altesStartdorf, zufallsNetz.
