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

## Für P5e (aus Zwischen-Review P5 Teil 1 + c, 2026-11-07)
12. K1: Kommentar steuerung.ts ~1006 berichtigen (T14 öffnet immer `tutorialWerte().anschluss`, Entscheidung c). In Ablauftest (5) für T14 zusätzlich prüfen: Farbknopf `d25` hat `aria-pressed=true`.
13. Foto „eigener Abgang“ während des Zugs mit aufnehmen (Ring und Satz wechseln schon unter dem Finger, Streifen erst beim Abheben) – der Designer entscheidet beim Fotocheck, ob der Ring bis zum Abheben warten soll.
14. Band am Feld (10|11) kommt von der Heizzentrale (Osten): `bandVorgaenger` in src/core/tutorial-band.ts anpassen, Test in nr20-darstellung (Eingang von Osten).
15.–18. Aus Review P5d an P5e nachgereicht: Test pointercancel/Radierer-Tipp ohne Hängen; Test Wiedereinstieg setzt keinen Zug; (10|11)-Test mit Eingang von Osten; doppelter Import.

## Für P7 (Nachtrag)
- Chip-Regel im Code: anleiter.ts ~144 `!a.kompakt && a.wusstest_du` (heute nur über Daten gesichert).
- P7 übernimmt aus P5e: `Szene.tutorial_spur?` in src/render/szene.ts ~41–42 löschen (nach Merge mit b879a41 hat es keinen Nutzer mehr); überholten Kommentar in zeichneBand („ohne festen Vorgänger … gegen den eigenen Pfeil“) berichtigen.
- P7 übernimmt aus Review P5e: Test „Schleier wird ohne Änderung nicht neu gebaut“ (SVG-Element bleibt dasselbe, Fehlerprobe spotlight.ts:223); Test Lochmitten Heizzentrale/Haus 2 (Fehlerprobe steuerung.ts:899 haus2→haus1); verwaister Kommentar tutorial-band.ts:4–7 (Datei nur Kommentar); Leistung Schleier bei Kamerafahrt beachten (ggf. verschieben statt neu bauen, Messung mit ?messen=1).

## Für P7 (aus P5f-3)
- Satz T13h bei beiden Häusern ok + Stummel: nur erster Satz von SATZ_EIGENER_ABGANG (auch Sperre tutorial.ts ~462). Vorher Tester: nr21-feinschliff-kern.test.ts:88–94 anpassen.
- Leisten-Abgleich je Bild (steuerung.ts ~1003) liest die gehaltene Sperre – nicht auf aktuelle zurückstellen (sonst Neuaufbau je Bild im Zug); ggf. Zähltest.

## Nach P7e
- Test fehlt: eingezeichnete Leitungen mit Deckkraft 0,6 (src/render/szene.ts:751) – Review P7e, klein
- Browser-Skript tests/browser/nr13-tutorial.browser.cjs:128 `/\s+/g` frisst geschützte Leerzeichen → T13w-Erklärsatz immer FEHLT; Vorschlag `/[ \t\n\r\f]+/g` (Tester)
- T13h „Zurück“ im nr13-Browser-Skript: Zeitrennen, auf Knopf warten (Tester)
- Rohrfaktor 0,62 und Kante w+1,25 in DESIGN/Tokens eintragen (Designer)
- 72 px Figurplatz in stil.css als Token; Test für figurPx-Fehlermeldung (Nachprüfung Merge, klein)
