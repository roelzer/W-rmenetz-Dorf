# P4 Teil 2 – Zwischenstand (Commit a1d7f6f auf nr13-p4-2, Kontext voll)

## Im Commit (nur src/steuerung.ts, tsc/Build/1360 Tests grün, Schranke OK)
- tick: fahrtJetzt = kamera.fahrtLaeuft(performance.now()) einmal je Bild; anleitung.zustandPruefen(); anleitungAnwenden().
- anleitungAnwenden: Kamera-Regel (Wechsel + kamera_ziele / freie Breite bei kamera != frei; T13-Grenze mit zoom_min = Zoom
  nach dem Einpassen, Breitenwechsel nur mitte_px), Löcher (Karte über kamera.mitte, [data-ziel], Leitungskarte mit data-typ,
  Leitungsstück), zielSichtbarMachen (einmal je Schritt, nur mit Layout), spotlightSetzen (Fahrt -> 'nichts'), anleiterZeigen /
  anleiterAusblenden bei sprecherAktiv, infoKapsel (Haus 1), Szene tutorial_spur/erreicht, eingabeSperre (Lage aus der Ansicht).
- tutorialMelden/tutorialSperreKnopf echt, bauenGetippt, mitSchliessen (Blatt 200 ms, Baumenü sofort), Kartentipp im Tutorial,
  kontext() 38 %, Zeichenleiste (Hilfe zu, data-ziel, Abschließen-Sperre, [X]/[?]-Sperre, handlung()), kein Baumenü nach
  Abschließen, Gesten-Sperre + Drehen aus.
- anleitungBeenden: Sperre/Spotlight/Anleiter/Kapsel weg, Grenze null.

## Offen
1. Tests: Entwurf liegt in scratchpad/p4-2-nr13-einbindung.test.ts (Teil-2-Block an tests/nr13-einbindung.test.ts anhängen).
   Stand: alle 12 neuen Tests rot an derselben Stelle – Tipp auf spiel.hz-Mitte in T01 schaltet nicht auf T02.
   Ursache NICHT geklärt. Zu prüfen: wirkt [Weiter] der Wiedereinstiegs-Blase (intro aus?) – schrittJetzt zeigt in der Intro
   auch 'T01'; sonst trifft objektAmPunkt an der HZ-Mitte ein anderes Objekt (anderes Objekt davor?).
   Testhilfe stubbt kein `Image` -> im Test `vi.stubGlobal('Image', …)` in beforeEach (schon im Entwurf).
2. test_nr13_geldmangel_kein_festhaengen (nr13-ablauf) nicht geschrieben.
3. Nicht gebaut: Federn des ersten Auftrags nach T26, Effekt hz_federn/pille_huepfen (Kann).
4. Unsicher: Lochhöhe für Gebäude (Bodenrechteck + th × Kante nach oben) – im Browser-Test (Teil 3) prüfen.
