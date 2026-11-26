# Review Härtung (Geldbericht) + Geburtstagsschild (Modus paket, e07ffc4..674c71a) – 🟡 → 🟢 nach Test

Plan-Treue ✅ (nichts fehlt, nichts Fremdes; Zusatz: Schild im Hochformat ausgeblendet). Kritisch: keine.
- W1 (wichtig): Test für `s.abrechnung_monat = …` in zeitNeuAnsetzen (spiel.ts:1618) fehlte (Fehlerprobe NICHT ERKANNT). → Tester-Test tests/geld-zeitvorsprung-zusammenspiel.test.ts (Commit f41cba1), Gegenprobe ERKANNT. Erledigt.
- W2: Gegenproben der Geld-Punkte offen → vom Tester nachgeholt (Bericht a7e2e6bc…). Erledigt.
- Klein: (1) Kern rechnet je Bild zweimal (main.ts:181 und steuerung.ts:864) – harmlos, Kommentar ergänzen; (2) Schild ab 27.11. toter Code, Spitzname im Quelltext → später entfernen (Aufgabe in STATUS); (3) Schild verdeckt am 26.11. teils „Los geht’s“ (Ebene 95) → Designer; (4) vorbestehend: zu kleine naechste_id → Fix läuft.
- Unsicher: Uhr-Schummeln leichter (Spielbalance, Kinderspiel ohne Konto vertretbar).
