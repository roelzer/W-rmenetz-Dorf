# Wärmenetz-Dorf

Gilt nur für dieses Projekt. Allgemeine Regeln stehen im Grundgesetz des Dev-Teams.

## Worum geht es
Ein Handyspiel rund um ein Dorf mit Wärmenetz. Idee, Zielgruppe und Spielablauf legt Simon im ersten Auftrag fest; der Projektleiter hält sie in `docs/lastenheft.md` fest.

## Besetzung
**Solo** (der Projektleiter baut selbst, Schranken nach jedem Feature, Review je Abschnitt). Der `designer` legt zu Beginn den Spielstil fest (Grafik, Farben, Animation, Spielgefühl) und prüft je Abschnitt mit Bildschirmfotos auf Handygröße. Soll das Spiel in einen App-Store oder sammelt es Daten von Spielern: Besetzung **Kunde** und vor der Veröffentlichung einmal der `sicherheitspruefer`.

## Fachgebiet
Wärmenetze (Nahwärme): Erzeugung, Leitungen, Hausanschlüsse, Verluste, Speicher. Spielregeln dürfen vereinfachen, aber nichts fachlich Falsches behaupten – der `fachpruefer` prüft Zahlen und Aussagen, die im Spiel als Wissen auftauchen. Fachwissen-Bibliothek: `wissen/fachwissen/waermenetz.md` im Plugin.

## Technik
- Typ: Handyspiel. Plattform und Technik entscheidet der Projektleiter in der Startfreigabe mit Empfehlung (z. B. Web-Spiel als installierbare App/PWA mit Phaser oder PixiJS, später per Capacitor in die Stores; oder eine Spiel-Engine wie Godot). Kriterien: läuft flüssig auf dem Handy, Touch-Bedienung, offline spielbar, schnell gebaut.
- Setup-, Test- und Zusatzbefehle stehen **nur** in `.claude/dev-team.json` (legt der Projektleiter beim ersten Auftrag fest).

## Architekturregeln
- Spiellogik (Regeln, Simulation, Punkte) getrennt von Darstellung und Eingabe, damit sie ohne Grafik testbar ist.
- Spielstand an genau einer Stelle; Speichern lokal auf dem Gerät, kein Konto nötig.
- Physikalische Größen mit Einheit im Namen (`leistung_kw`, `laenge_m`, `waerme_kwh`); Zahlen aus der Fachwissen-Bibliothek mit Quelle.
- Menüs und Bedienoberflächen nach dem Oberflächen-Standard des Dev-Teams (`wissen/oberflaeche.md`); die Spielgrafik bekommt ihren eigenen, einheitlichen Stil vom Designer.
- Bildschirm: **nur Querformat** auf dem Handy (Prüfgröße 844×390 px, Entscheidung Simon 2026-11-04), Tippflächen mindestens 44 px, flüssig mit 60 Bildern pro Sekunde.

## Wichtige Dateien
- `docs/lastenheft.md` – Anforderungen A1 … mit Abnahmekriterien (entsteht beim ersten Auftrag)
- `docs/STATUS.md` – Stand beim eigenständigen Bauen
- `docs/OFFENE_FRAGEN.md` – Fragen an Simon und „Nur Simon“-Liste
- `docs/ENTSCHEIDUNGEN.md` – Entscheidungen des Projektleiters
- `docs/DESIGN.md` – Spielstil und Oberfläche (Designer)
- `.claude/freigaben.md` – Freigaben: technische trägt der Projektleiter nach Kritiker-Prüfung ein, fachliche nur Simon

## Entscheidungslog
Format: `Datum – Entscheidung – Grund`
- 2026-11-04 – Dev-Team eingerichtet, Besetzung Solo – eigenes Spielprojekt (Simon)
- 2026-11-04 – Nur Querformat am Handy, Blätter als Seitenfläche rechts, Hochformat zeigt Dreh-Hinweis – Simon: „eigentlich nur quer“

## Projekt-Lektionen
<!-- Nur was speziell für dieses Projekt gilt. Allgemeines gehört in die Lessons des Dev-Teams. -->
