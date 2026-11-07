# Sammelliste für P5 (Einbindung Tutorial) – Ergänzung zum Bauplan NR20-22 §7 P5

Entschieden vom Projektleiter aus den Reviews von P1, P2, P3 und P4 (2026-11-07). Gilt zusätzlich zu P5 im Bauplan.

1. `anleiterHoehe` auf 92 px für die kompakte Karte (steuerung.ts ~780; Wert wie ui/anleiter.ts Klasse `kompakt`).
2. `schleierSetzen` (ui/spotlight.ts, aus P4) aufrufen; braucht `#karte`. Den Schleier neu aufbauen, wenn sich die Kamera bewegt.
3. Test: Die Löcher im Schleier sind in der Maske schwarz (Maskentest).
4. `knopf_hinweis` ist auf der kompakten Karte unsichtbar: In T13/T13w/T13h darf kein Text vom Knopf-Hinweis abhängen (prüfen und testen).
5. Kein Chip auf der kompakten Karte.
6. Test 96-Zeichen-Grenze über **alle** Texte von Kapitel 3 (T12 ist ausgenommen, siehe ENTSCHEIDUNGEN).
7. `TUTORIAL_SPUR` und `Szene.tutorial_spur?` samt Nutzern löschen (steht schon im Bauplan).
8. Veralteten Kommentar „T13b ist kein eigener Schritt …“ in src/core/tutorial-vertrag.ts:~31 berichtigen.
9. Aus Review P3:
   - K1: Zug beginnt auf einer Leitung am Kartenrand, Finger geht über den Rand hinaus → `stempelStart = null` (E4 Regel 2 „außerhalb → S bleibt“). Test dazu.
   - K2: Test schnelles Wischen von S über ein freies Nachbarfeld auf ein Feld mit Leitung → S bleibt.
   - K3: Tests „Ende über/unter der Heizzentrale bleibt dick“ und „Ende diagonal an der Ecke wird überzeichnet“.
10. Aus Review P4a: Test für das allererste Bandfeld (10|11), das keinen festen Vorgänger hat (szene.ts ~429). Bandrichtung dort prüfen.
11. Browser-Fotos auch bei 667×375 (zusätzlich 844×390).
