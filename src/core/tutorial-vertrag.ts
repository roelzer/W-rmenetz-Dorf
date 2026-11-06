// AE-NR13-2 (Bauplan NR18 Fassung 3, Abschnitt 5.4): die Namen, über die ein Tutorial vom Spiel erfährt, an genau einer
// Stelle. Nur Typen; den Ablauf baut NR13. Die Zuordnung zu den Tutorial-Schritten steht im Bauplan.

/** Kern meldet nach dem Gelingen einer Handlung (AE-NR13-2). */
export type Schritt =
  | 'abschnitt_geplant'        // abschnittPlanen ok (Philipp plant)
  | 'abschnitt_offen'          // Planung fertig, Phase planung → offen (Takt)
  | 'leitung_gezeichnet'       // platzieren einer geplanten Leitung ok, geplanteLeitungTyp ok, ersatzPlanen ok; objekt_id = Leitung
  | 'haus_erreicht'            // Haus neu in erreichteHaeuser(); objekt_id = Haus
  | 'haus_getrennt'            // Haus nicht mehr in erreichteHaeuser(); objekt_id = Haus
  | 'station_gekauft'          // stationKaufen ok; objekt_id = Haus
  | 'abschnitt_abgeschlossen'  // abschnittAbschliessen ok
  | 'material_bestellt'        // materialBestellen ok
  | 'abschnitt_gebaut'         // Bauende des Abschnitts (Takt)
  | 'haus_warm';               // Kunde neu in netz.warm; objekt_id = Kunde

/** Nur die Oberfläche meldet reine Bedienschritte (AE-NR13-2). */
export type Tipp =
  | 'heizzentrale'             // Heizzentrale auf der Karte angetippt
  | 'baumenue'                 // Rundknopf [Bauen] angetippt
  | 'reiter_leitungen'         // Reiter „Leitungen“ im Baumenü
  | 'leitungskarte'            // Katalogkarte einer Leitung; typ = Leitungstyp
  | 'haus'                     // Haus auf der Karte angetippt; objekt_id = Haus
  | 'weiter'                   // [Weiter] bzw. [Los geht’s] der Anleiter-Karte
  | 'daneben';                 // Berührung außerhalb des Lochs (für „Hilfe nach drei Fehltipps“)
