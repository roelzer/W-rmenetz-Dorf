# Kritiker – Planprüfung NR27 Bahnquerung (Fassung 1) – 🔴
Gelesen, nichts ausgeführt. Grundidee steht, eine Überarbeitung reicht.
1. HOCH: Bauplan (10 Zeilen, Bahn y=−3/−2, Grünstreifen y=−1, Häuser y=−9/−5, 14 Häuser, Stichstraße x=10) und Designer 14.2 (8 Zeilen, Bahn y=−1/−2, Zielgruben y=−3, Bahnstraße y=−4, Häuser y=−6, MFH) beschreiben zwei Karten; Tests schreiben Koordinaten fest; Lage nach erstem Bau unumkehrbar. Designer-14.5–14.7 noch Variante B (eigenes Bauwerk, 60.000 €/2 h).
2. HOCH: P4 deckt Designer-Umfang nicht ab (Dunst, Zug+Takt, Masten, Schranke, Schleier, Erklärkarte, Mini-Tutorial, Erfolgsmoment, Baustelle/Bohrlinie, Strichellinie statt Rohr auf Bahnfeldern). Texte Plan vs. Designer (Sperre, nordInfo/N1/N2, Fertig/F1) widersprüchlich → eine Texttabelle.
3. KRITISCH (Fachregel): QUERUNG_WISSEN würde ungeprüft gezeigt; kein Schritt Fachprüfer→Simon, kein Schalter/Test „ohne Freigabe kein Text“. Preis/Zeit Platzhalter → „Nur Simon“.
4. HOCH: Weitere Stellen mit negativen Schlüsseln: spiel.ts:806 (abschnittAnschluesse, f % N_), tutorial-netz.ts:95, szene.ts:126/144/263/938 (negative Modulo), Architekturtest erkennt N_ nicht. Verschiebungstest fehlt für abschnittAnschluesse/schliesstLeitungsring.
5. HOCH: steuerung.ts:679–685 `continue` ohne Hinweis → stilles Überspringen beim Ziehen; gehört in P4; Zusammenspiel-Test über stempelBei.
6. MITTEL: Leitungsgrenze 240 bei Stufe 6 (spiel.ts:422, Meldung :594 falsch bei Höchststufe), Erzeugung Stufe 6 Süd+Nord ungeprüft.
7. MITTEL: Altstand-Test braucht eingefrorene echte JSON-Dateien (Stufe 6 mit Neubau Layout 3; Stand mitten im Bau) → Tester-Vorarbeit V2.
Rückfragen: V1 weitere Tests mit -1? P1 spiel.ts:806, tutorial-netz.ts:95, speichern.ts:120, spiel.ts:449; P2 Zeilenlage/Häuser/MFH; P3 Textfreigabe, mehrere Querungen, Grenze; P4 Umfang, steuerung.ts, Modulo, Takt A90.
