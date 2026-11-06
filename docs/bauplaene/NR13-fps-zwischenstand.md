# NR13 Bildrate im Durchklick – Messung und Übergabe (2026-11-06)

Stand: nur gemessen, **kein Spielcode geändert**. Entscheidung des Projektleiters nötig (unten).

## Messung (Chromium kopflos, ohne Grafikkarte, 844×390 bei Faktor 2)

Werkzeuge: CPU-Profil + Chrome-Trace während der Messfenster des Durchklicks (Wegwerf-Kopie von
`tests/browser/nr13-tutorial.browser.cjs`), dazu `werkzeuge/messe-zeichenkosten.cjs` (Zeichenkosten je Fall).

Bildrate im Durchklick (Basis c06c9fe, ohne Profiler; Streuung zwischen Läufen ±5 Bilder/s):

| Situation | Bilder/s |
|---|---|
| T05 Kamerafahrt | 22–27 |
| T22 Kamerafahrt | 29–42 |
| T13 Ziehen | 33–47 |
| Ruhe T01 | 42–54 |

Zeit je Bild auf dem Hauptfaden (Trace):

| Situation | Leinwand malen (`DoUpdateLayers`) | ganzes JS je Bild | davon `anleitungAnwenden` |
|---|---|---|---|
| Ruhe T01 | 16,8 ms | 4,4 ms | ≈ 0,5 ms |
| T05 Fahrt | 28–32 ms | 7,5–11,5 ms | ≈ 0,8 ms |
| T22 Fahrt | 24,8 ms | 7,3 ms | ≈ 0,6 ms |
| T13 Ziehen | 21,8 ms | 5,5 ms | ≈ 0,8 ms |

Gegenprobe: `anleitungAnwenden` während der Fahrt ganz übersprungen bzw. Lochränder ohne Schatten/Blende → keine
messbare Änderung (innerhalb der Streuung).

## Ursache

1. Das Malen der Karte selbst. `zeichneSzene` sammelt Befehle; gemalt wird beim Übergeben des Bildes. Ohne Grafikkarte
   kostet das ~17–20 ms je Bild, davon die 42 Häuser ~19 ms (`messe-zeichenkosten.cjs`).
2. T05: Die Fahrt ändert den Zoom (gezählt 2,915 → 3,0). Nach NR12 P3a wird der Boden dann jedes Bild direkt gezeichnet
   statt aus der Bodenebene (gezählt: 0 × aufgelegt in der ganzen Fahrt) → +13–16 ms Malen je Bild.
3. T22: Zoom bleibt, Boden kommt aus der Ebene (1 Neuaufbau, 30 × aufgelegt) – dort bremsen nur die Gebäude.

Tutorial-Code (Spotlight, Anleiter, Layout-Abfragen, Vergleichsschlüssel): zusammen < 1 ms je Bild, nicht die Ursache.

## Mögliche Wege (Entscheidung Projektleiter)

- a) NR12 „Gebäude in der Ebene“ (P3b, laut NR12 zurückgestellt bis zur Messung auf dem Handy).
- b) Während einer Kamerafahrt den zwischengespeicherten Boden skaliert auflegen statt direkt zeichnen (kurz leicht
  unscharf; Rand der Ebene reicht nur bis Zoom-Faktor 1,5 nach außen).
- c) Prüfgrenze 50 Bilder/s im kopflosen Durchklick an die Einordnung von `werkzeuge/messe-bildrate.cjs` angleichen
  (absolute Bildraten ohne Grafikkarte nicht übertragbar) und auf dem Gerät mit `?messen=1` messen (NR12 E6).
