# Bericht produktpruefer – 2026-11-05 17:03

AMPEL: GELB. Kurzfassung: NR16 liess sich so, wie Simon es beschreibt, auf dem Stand origin/main (c20ec80) NICHT als "es geht gar nichts mehr" nachstellen. Der Hausanschluss funktioniert. Das T-Stück ist für einen neuen Spieler aber gesperrt. Die Sperre ist so gewollt, wird dem Spieler aber schlecht erklärt. Dazu gibt es mehrere Oberflächenmängel.

Hinweise zur Methode:
- Build, `vite preview` auf Port 4321, Chrome mit Playwright, 844×390, isMobile, hasTouch, frischer Speicher. Zusätzlich 667×375 für Start und Baumenü.
- Das Kernmodell habe ich mit einem Wegwerf-Testskript gegengeprüft, das die echten Kernfunktionen nutzt.
- Server beendet, Worktree entfernt (git status sauber, nichts committet).
- Fotos (47 Dateien): /tmp/claude-0/-home-user-W-rmenetz-Dorf/689e9066-6050-59dc-abe0-ac861071fa0f/scratchpad/nr16-fotos/
- Der Stand ist nicht live auf heatville.pages.dev geprüft, sondern lokal gebaut.
- Nicht geprüft: Gewerbe-Blatt (Hallenbad) und Mehrfamilienhaus-Blatt wurden geöffnet, aber ein Anschluss wurde dort nicht durchgespielt. Das Abrechnungsbüro habe ich nicht gebaut, nur sein Blatt geöffnet. Deko und Gebäude platzieren (Hier bauen / Abbrechen) habe ich nicht getestet.

## 1. NR16-Ursache

Schritte als neuer Spieler (Fotos 02, 03, 06, 07, 12, 13, 14–19):
1. Start, Willkommen ("Los geht's"). Die Heizquelle (Hackschnitzelkessel) wird automatisch gewählt, es gibt keine Auswahl.
2. Bauen, Reiter "Leitungen", "Philipp: Neuen Bauabschnitt planen" (2.000 €). Planung dauert 30 s mal Faktor, bei mir etwa 80 s. Danach ist der Abschnitt "offen".
3. Haus antippen, "Hausanschluss ziehen". Meldung: "Hausanschluss geplant: 1 Felder, 25er-Leitung".
4. Bauen, "Abschnitt abschließen", "Laura: Material bestellen" (400 €), Bau. Das Bauen habe ich mit "Sofort fertig" (Taler) abgekürzt. Dann Haus antippen, "Station einbauen · Wandstation Typ 15" (2.400 €).
5. Ergebnis: Haus "warm", Auftrag "Auftrag geschafft! +10 Dorftaler" (Foto 19). Der Ablauf geht von Anfang bis Ende durch.

Das T-Stück ist gesperrt:
- Im Zeichenmodus ("Leitung selbst legen") steht der Knopf "T-Stück mit Vorsehung" grau da, mit dem Text "ab Heizzentrale Stufe 4" (Foto 40, 43). Antippen gibt keine Rückmeldung.
- Ursache: `src/core/freischaltung.ts:34` (`vorsehung: 4`, Anzeigename `FUNKTION_NAME`, Zeile 46). Die Sperre kommt über `sperrgrund()` (Zeile 61). Die Oberfläche setzt sie in `src/steuerung.ts:153` und `:156` (Knopf `aus: sperreTStueck !== null`) und in `src/ui/kontext.ts:321–322` (Leitungskarte).
- Sicherheit: 95 %, dass dies der "kein T-Stück"-Teil von Simons Meldung ist.
- Wichtig: Das T-Stück ist für den Hausanschluss nicht nötig. Seit A47 dockt der automatische Hausanschluss selbst an (`spiel.ts:653 hausanschlussPlanen`). "Vorsehung" ist nur ein Spielwert (A69), der die Anbohrung spart.
- Dem Spieler wird das nicht gesagt. Der Auftragstext und die Zeichenleiste legen nahe, man brauche ein T-Stück. Das ist vermutlich Simons Eindruck "ich konnte keine Häuser mehr anschließen, weil ich kein T-Stück bauen konnte".

Mögliche echte Ursache für "gar nichts mehr geht": der Nutzer-Weg ist an mehreren Stellen irreführend.
- (a) Hausanschluss geht nur im offenen Bauabschnitt. Ohne Abschnitt ist der Knopf grau mit dem Text "braucht offenen Bauabschnitt" (Foto 30). Schlimmer: "Leitung selbst legen" ist ohne offenen Abschnitt NICHT gesperrt. Es öffnet den Zeichenmodus. Erst nach dem Wischen kommt die Meldung "Leitungen entstehen in Bauabschnitten – erst mit Philipp einen Abschnitt planen" (Foto 41). "Abschnitt abschließen" ist dort ebenfalls aktiv, gibt dieselbe Meldung und schließt den Modus.
- (b) Der Bauabschnitt-Kasten im Baumenü zeigt während der Planung "Philipp plant den Abschnitt … noch 1m 15s" als Standtext. Er zählt nicht mit und wechselt nicht von selbst auf "offen" (Foto 06 gegen 10). Man muss das Blatt schließen und neu öffnen.
- (c) Ein Haus ohne Anschluss zeigt widersprüchliche Sätze (Foto 12, 13, 30): Chip "heizt mit Öl" und "Heizt noch mit Öl. Leg eine Leitung …" und darunter "Angeschlossen, aber es kommt zu wenig Wärme an. Baue eine weitere Wärmequelle oder erhöhe die Leistung." Das ist falsch und verwirrt. Ursache: `src/ui/kontext.ts:175` (`else if (!warm)` greift auch ohne Anschluss; vermutlich fehlt dort die Prüfung auf `an`). Sicherheit 85 %.
- (d) "Hausanschluss ziehen" bleibt nach dem Planen aktiv und kann nochmal gedrückt werden. Es gibt keinen Zustand "geplant", und die Meldung "1 Felder" ist falsch gebeugt.
- (e) Die Meldung ist ein Toast. Er überdeckt beim Antippen Teile des Blatts (Foto 13).

Pfad-Suche (A89, Hinweis des Projektleiters): Sie sperrt am Spielstart NICHT alle Wege. Gegenprüfung mit den echten Kernfunktionen (Wegwerf-Test, nicht eingecheckt):
- Neues Spiel nach Planung, Probe aller 43 noch nicht angeschlossenen Häuser und Großabnehmer, einzeln gerechnet: 41 haben einen Weg. Nur 2 nicht: "Das Haus liegt schon an einer Leitung" (1×) und "Über den Fluss geht es erst mit Spülbohrung – ab Heizzentrale Stufe 2" (1×). Das entspricht der Zahl vor A89 aus tests/a89 (WEGE_VOR_A89[1]=41).
- Alle in einem Abschnitt hintereinander geplant: 8 neu geplant, ~19 "liegt schon an Leitung", 15 mal "Zu viele Leitungen für diese Heizzentralen-Stufe" (Obergrenze 60 Felder in Stufe 1, `katalog.ts` d25 `grenze:[60,…]`). Danach scheitert "Material bestellen" mit "Es fehlen 2.817 €". Das erwartbare Hemmnis in Stufe 1 sind also Geld (30.000 € Start) und die Grenze von 60 Leitungsfeldern, nicht A89.
- Einzeln nacheinander: Haus (13|12) und Haus (8|18) liessen sich anschließen. Beim dritten (12|20) fehlte das Geld ("Es fehlen 3.315 €"). Meine Schleife war grob, bitte nicht als Spielbalance werten.
- Die Meldung "direkt neben der Heizzentrale …" (`spiel.ts:765`) kam in keinem Lauf vor. "Kein Weg gefunden, bei dem alle Häuser warm bleiben" kam ebenfalls nie vor. Sicherheit: 80 %, dass A89 am Start nichts blockiert. Das gilt nicht für spätere Netzformen, die ich nicht durchgespielt habe.
- Der Auftrag c2 ("Versorge alle drei Starthäuser: kaufe dem dritten Haus eine Übergabestation und lass mit Philipp einen Bauabschnitt planen …") beschreibt den Ablauf richtig (Foto 19, Toast "Auftrag geschafft").

Vorschlag zur Abhilfe aus Spielersicht:
- (1) Zeichenleiste: T-Stück-Knopf mit einem Satz erklären ("Nicht nötig für den Hausanschluss. Spart später die Anbohrung. Frei ab Heizzentrale Stufe 4"). Tippen auf den grauen Knopf zeigt einen Toast mit demselben Text.
- (2) Beim Haus-Blatt "Leitung selbst legen" sperren, solange kein Abschnitt offen ist, und "braucht offenen Bauabschnitt" zeigen. Alternativ auf der Haus-Karte einen Knopf "Bauabschnitt planen lassen" direkt anbieten.
- (3) Der Planungsstand im Baumenü zählt live herunter und schaltet selbst auf "offen" um (oder mit Toast "Abschnitt bereit").
- (4) `kontext.ts:175` korrigieren (nur bei angeschlossenem Haus), damit "Angeschlossen, aber es kommt zu wenig Wärme an" nicht bei Öl-Häusern erscheint.

## 2. Mängelliste Knopf-Durchgang

Geprüft: Leiste oben (Einstellungen, Auftrag, kW, Dörfer, Bauen), alle 5 Baumenü-Reiter, Zeichenleiste (25er/32er/40er, gesperrtes "Dickere", Radierer, T-Stück, Letzte zurück, Abschnitt abschließen), Blätter für Heizzentrale, Einfamilienhaus, Mehrfamilienhaus, Klinik, Hallenbad, Abrechnungsbüro, Leitung, Einstellungen, Dörfer.

Technisch:
- Konsole: außer der Warnung "Drehsperre abgelehnt NotSupportedError: screen.orientation.lock() is not available on this device" (nur ohne echtes Gerät) gab es keine Fehler.
- Tippflächen unter 44 px: nur die beiden Schalter in den Einstellungen (Input "on", 52×30; die Beschriftung daneben ist vermutlich mittippbar, nicht geprüft). Alle Buttons mindestens 44 px, auch die Vorlauf-Schritte (48×48).
- Gesperrte Knöpfe zeigen die Begründung ("ab Heizzentrale Stufe 3", "Erst Heizzentrale ausbauen").

MUSS: keine neuen reinen Programmfehler gefunden. Aber die Punkte (a), (b), (c) oben sind für Simons Meldung wichtig. Punkt (c) ist ein fachlich falscher Satz im Spiel ("angeschlossen", obwohl nicht angeschlossen) und könnte als Muss zählen. Fotos 12, 30-kontext-mehrfam_lila_oben, 31-kontext-mfh_rechts.

SOLL:
1. Baumenü-Reiter: bei 844×390 liegen "Dorf" (x 836) und "Deko" (x 906) ausserhalb des Bildschirms. Bei 667×375 ist auch "Leitungen" fast abgeschnitten (Foto 51-667-bauen.png, nur "L" sichtbar). Man erkennt nur an einem Verlauf, dass man scrollen kann. Neue Spieler finden Büro und Deko schwer. Fotos 04-bauen, 24-reiter-Dorf, 51-667-bauen. Vorschlag: Reiter in zwei Zeilen oder Icons oder schmalere Beschriftung.
2. Gesperrter "T-Stück"-Knopf gibt beim Antippen keine Rückmeldung (siehe oben).
3. Toast verdeckt Blattinhalt, z. B. "Viel Erfolg, Tester! …" verdeckt Feldbeschriftungen in den Einstellungen (Foto 20-einstellungen) und "Hausanschluss geplant …" den Text im Haus-Blatt (Foto 13). Vorschlag: Toasts oben links oder über dem Blatt aufstellen, oder früher ausblenden.
4. Zeichenleiste: "Letzte zurück" liegt am unteren Rand abgeschnitten (Foto 43-gezeichnet.png). Das Blatt belegt über die Hälfte des Bildschirms (Kartenfläche links nur etwa 450 px breit), das Zeichnen wird eng.
5. Hausblatt/Heizzentrale: lange Blätter, Hauptknopf (Station einbauen) liegt weit unten. Im Haus-Blatt ist "Hausanschluss ziehen" nach dem Planen weiter aktiv (siehe d).
6. Büro-Blatt (Foto 31-kontext-gruenes.png): "Kassenspeicher 270.000 €" bei 30.000 € Startkasse wirkt unplausibel. Sicherheit nur etwa 40 %, ob das ein Anzeigefehler ist oder die Obergrenze, nicht nachgerechnet.

KANN:
- Klinik/Hallenbad-Blatt: "70 kW freie Leistung (frei: 40 kW)" ist als Satz missverständlich (Foto 31-kontext-klinik).
- Ladebildschirm beim Start dauert mit Playwright mehrere Sekunden (Foto 01-start.png).
- Einstellungen: bei Spielstand-Aktionen nicht weiter geprüft.

## 3. Pflichtfragen (soweit für diesen Auftrag)
- Start mit dokumentiertem Befehl: Build und `vite preview` liefen (Konsolenwarnung zu `./tools/sw` ohne Dateiendung, harmlos).
- Wichtigste Abläufe: Hausanschluss → Bau → Station → warm → Auftrag: erfüllt.
- Desktop-Aussehen entfällt (Handy-Spiel). Handy 844×390: ordentlich, außer Reiter und Zeichenleiste (siehe Soll).
- Fehlermeldungen: verständlich, aber teilweise zu spät (Leitung selbst legen ohne Abschnitt) oder widersprüchlich (Punkt c).
- Datenverlust: nicht geprüft.
- Barrierefreiheit: Tastaturbedienung und Fokus nicht geprüft. Knöpfe haben aria-label.

## 4. Verbesserungsideen (max. 3)
1. Ein klarer Einstiegsknopf "Haus anschließen" (plant bei Bedarf selbst den Abschnitt und führt durch Material und Station).
2. Fortschrittsanzeige "Planung läuft, noch 1 m 15 s" mit Zähler und Hinweis-Toast bei Fertigstellung.
3. Baumenü-Reiter in zwei Reihen statt scrollender Leiste.
