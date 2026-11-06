# P4 Zwischenstand (Commit 97df4af auf nr13-p4)

## Fertig (getestet, tests/nr13-einbindung.test.ts, 6 Tests)
- steuerung.ts: Feld `anleitung` (Tutorial), Wiedereinstieg = namen_gefragt !== false, meldungenStumm(true) + hud.tutorialModus(true),
  anleitungAnsicht(), nachTutorial(f), toastWichtig(t), ereignisse: 'schritt' -> anleitung.schritt(ev),
  tick: endet das Tutorial -> anleitungBeenden() (Stumm aus, tutorialModus aus, Liste nach 600 ms).
- main.ts: A38 nur mit !spiel.tutorialAktiv(); defekt/Absturz + Speicher-Warnung über toastWichtig; Update-Hinweis über nachTutorial.
- szene.ts: setLineDash aus spur_strich/spur_luecke, Halo = tokens.farbe.effekt.text_halo.

## Offen (Reihenfolge-Vorschlag)
1. tick: `this.fahrtJetzt = kamera.fahrtLaeuft(jetzt)` einmal je Bild; `anleitung?.zustandPruefen()`; dann anleitungAnwenden(jetzt).
2. anleitungAnwenden: Ansicht lesen; Schlüssel (Ansicht + Kamera-Schlüssel + Blattbreite + Rechtecke + Restsekunde) – nur bei Änderung:
   Löcher (Karte: Rechteck aus kamera.mitte der Objektecken, Bedienelemente `[data-ziel=..]`, Leitungskarte zusätzlich `[data-typ=leitung_typ]`,
   Leitungsstück aus objekt_ids.leitungsstueck), zielSichtbarMachen je Schrittwechsel für Ziele in `.blatt`,
   spotlightSetzen({loecher, abdunkeln: fahrt ? 'nichts' : a.abdunkeln, finger, ruhig, hud:[#hud-Rechteck]}),
   anleiterZeigen(a, anleiterPlatz(frei, ziel0, bild), {weiter: () => tutorialMelden({tipp:'weiter'})}, jetzt) bzw. anleiterAusblenden() solange sprecherAktiv(),
   infoKapsel(a.info_kapsel ?? null, Loch Haus 1), Szene: tutorial_spur (TUTORIAL_SPUR ohne Leitungsfelder, nur bei a.spur), erreicht (nur bei erreicht_zeigen).
   eingabeSperre einmal setzen: lage = { fahrt: fahrtJetzt, anleiter: anleiterRechteck(), abdunkeln: a.abdunkeln, art: a.art, loecher }, daneben -> tipp daneben + stupsen.
3. Kamera-Regel (Plan P4 „Kamera“): Schrittwechsel + kamera_ziele -> 1 Ziel zentrierenBei(..., frei.b/2, hoehe*T.menue.faktor.anleiter_ziel_hoehe) Zoom 3 (Desktop 1,9),
   >= 2 Ziele einpassenZiel(Rahmen, frei, 24, 3); 'fahrt' -> fahrtZu(..., 1200, jetzt) (ruhig: 0 ms). kamera_grenze -> grenzeSetzen(Rahmen HZ+Häuser, mitte_px, zoom_min = Zoom nach Einpassen, 3),
   Breitenwechsel in T13 nur mitte_px nachführen; sonst grenzeSetzen(null). kontext(): im Tutorial 0,38 statt 0,58.
   Achtung U2: keine 'T13'-Zeichenketten in steuerung.ts – nur Felder (kamera_grenze, kamera, kamera_ziele).
4. Tipps: tippen() -> Heizzentrale/Tutorial-Haus melden, Blatt nur bei normale_aktion; [Bauen] im Tutorial: katalog('netz') + baumenue + reiter_leitungen;
   tutorialMelden/tutorialSperreKnopf echt (Sperre {grund: kurz, schloss:false, hinweis: () => {gesperrtGetippt(b); return ''}});
   nach_handlung_schliessen der vorigen Ansicht: 'blatt' nach 200 ms kontextUi.schliessen, 'baumenue' sofort.
5. Zeichenleiste: hilfeOffen=false im Tutorial (zeichenhilfe_gesehen bleibt true), data-ziel zeichenleiste/abschliessen,
   Abschließen-Sperre + tutorialSperreKnopf('abschliessen') (letzter Grund in ersteSperre), [X] zuSperre + [?] mit 'blatt_schliessen' (ohne „später wählbar“-Beschriftung),
   handlung() bei Farbknopf/Radierer/Zurück/Strich; leisteAbschliessen öffnet im Tutorial kein Baumenü.
6. Gesten: tutorialSperre('karte_gesten') für Ziehen/Pinch-Zoom/Rad/Pfeile/+-; Drehen (Pinch-Drehung, Mitteltaste, Q/E) bei anleitung immer aus.
7. Namensfenster: im Tutorial ohne Begrüßung/Start-Tipp; „Ohne Tutorial starten“ nur bei tempo() > 1 -> tutorialUeberspringen + anleitungBeenden + wie heute.
8. Fokus: H + Bedienelement -> focus; H + Kartenziel -> ersatzZiel(KARTEN_VORLESENAME) + focus; tab_ziele = Ziel + #anleiter-weiter.
9. T16-Entscheidung: braucht neue Bedienung 'wandstation' (tutorial-vertrag.ts), Satz in Tutorial.sperre (tutorial.ts) und kontext.ts
   (Wandsperre-Hinweis über ui.tutorialSperreKnopf('wandstation')) – drei Dateien außerhalb des P4-Bauplans, PL muss freigeben.
   Hinweis: In echt fängt die Eingabesperre den Tipp vorher ab (T16 = W-Schritt, T17 Wandstation außerhalb des Lochs).
10. Tests: nr13-ablauf, nr13-klickweg, restliche nr13-einbindung (Liste im Plan P4).
