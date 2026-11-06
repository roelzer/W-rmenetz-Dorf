// AE-NR13-2 (Bauplan NR18 Fassung 3, Abschnitt 5.4): die Namen, über die ein Tutorial vom Spiel erfährt, an genau einer
// Stelle. Nur Typen; den Ablauf baut NR13. Die Zuordnung zu den Tutorial-Schritten steht im Bauplan.

import type { TypId } from './katalog';

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

/** Kennung eines Tutorial-Schritts (DESIGN 13.5). T13b ist kein eigener Schritt, sondern ein Text von T13. */
export type TutorialSchrittId =
  | 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06' | 'T07' | 'T08' | 'T09' | 'T10' | 'T11' | 'T12' | 'T13'
  | 'T14' | 'T15' | 'T16' | 'T17' | 'T18' | 'T19' | 'T20' | 'T21' | 'T22' | 'T23' | 'T24' | 'T25' | 'T26';

/** Stellen, die das Tutorial hervorhebt (Löcher im Abdunkeln); das Fingerziel ist das erste. */
export type ZielName =
  | 'heizzentrale' | 'haus1' | 'haus2' | 'leitungsstueck'             // Karte (Rechteck aus Kamera)
  | 'waerme_pille' | 'geld_pille' | 'bauen'                          // HUD
  | 'reiter_leitungen' | 'philipp' | 'kasten_abschnitt' | 'leitungskarte' | 'laura'  // Baumenü
  | 'zeichenleiste' | 'abschliessen'                                 // Zeichenleiste
  | 'kasten_station' | 'puffer_knopf';                               // Hausblatt

/** Bedienungen, die das Tutorial sperren kann (gesperrter Grundzustand, DESIGN 13.5). */
export type Bedienung = 'zoom' | 'doerfer' | 'auftrag' | 'blatt_schliessen' | 'verwerfen' | 'sofort' | 'express'
  | 'weiter_einzeichnen' | 'abschliessen' | 'karte_gesten';

/** Meldung der Oberfläche an das Tutorial über einen reinen Bedienschritt. */
export interface TippMeldung { art: 'tipp'; tipp: Tipp; objekt_id?: number; typ?: TypId }

/** Zahlen aus dem Spiel, die in den Tutorial-Texten stehen (DESIGN 13.9 „Zahlen aus dem Spiel“). */
export interface TutorialWerte { kessel_kw: number; kwh: number; kw_ohne: number; kw_puffer: number; leitung: TypId; kap_kw: number }

/** Sperre einer Bedienung: `kurz` = Knopfzeile 2 (höchstens 18 Zeichen), `satz` = Simon-Satz in der Blase. */
export interface TutorialSperre { kurz: string; satz: string }

/** Alles, was die Oberfläche für den aktuellen Tutorial-Schritt zeigt – sie entscheidet nur nach diesen Feldern (AE-NR13-4). */
export interface TutorialAnsicht {
  schritt: TutorialSchrittId; kapitel: number; kapitel_name: string;
  art: 'W' | 'H';
  /** fertiger Blasentext nach Vorrang K4 (Sperr-Satz > Hilfe nur bei H > T13b > Grundtext; in T13 bei fehlendem Geld der
   *  Geld-Satz), **fett**-Marken, höchstens 120 Zeichen ohne Marken */
  text: string;
  /** K4: Erklär-Schritt nach drei Fehltipps – „Tippe auf Weiter.“ gedämpft in der Knopfzeile */
  knopf_hinweis?: string;
  /** T25 */
  wusstest_du: boolean;
  /** Löcher; Fingerziel = ziele[0] */
  ziele: ZielName[];
  /** 'tippen' auf ziele[0]; 'spur' = fährt die Tutorial-Spur ab (T13 bis zum ersten eigenen Strich) */
  finger: 'aus' | 'tippen' | 'spur';
  abdunkeln: 'alles' | 'nur_hud' | 'nichts';
  /** null = Handlungs-Schritt; 'wartet' = [Weiter] noch nicht frei (T11/T23) */
  weiter: 'weiter' | 'los' | 'wartet' | null;
  /** warte_text enthält genau einmal „{Restzeit}“, die Oberfläche setzt ein */
  warte_text?: string; warte_bis_ms?: number;
  kamera: 'steht' | 'fahrt' | 'frei';
  /** [] = Kamera bleibt; 1 Ziel = Mitte auf 38 % Höhe der freien Fläche, Zoom 3 (Desktop 1,9);
   *  ab 2 Zielen = Rahmen der Ziele einpassen (24 px Rand, Zoom höchstens 3) */
  kamera_ziele: ZielName[];
  /** K5, nur T13: Bildmitte im Rahmen Heizzentrale + beide Häuser, Zoom mindestens Startansicht */
  kamera_grenze: boolean;
  /** K10: nur T13 */
  spur: boolean;
  /** nur T13: „Erreicht“-Zeichen über erreichten Tutorial-Häusern */
  erreicht_zeigen: boolean;
  /** K9: T06/T07 „{kwh} im Jahr · bis {kw_ohne}“ fertig eingesetzt */
  info_kapsel?: string;
  /** einmal beim Eintritt (T02 hz_federn, T03 pille_huepfen) */
  effekt?: 'hz_federn' | 'pille_huepfen';
  /** T17/T19 'blatt' (200 ms nach dem Kauf), T21 'baumenue' */
  nach_handlung_schliessen?: 'blatt' | 'baumenue';
  /** T12: Ziel 'leitungskarte' ist die Karte dieses Typs */
  leitung_typ?: TypId;
  objekt_ids: { heizzentrale: number; haus1: number; haus2: number; leitungsstueck: number[] };
  /** true nur T15/T18: Kartentipp auf das Haus öffnet das Hausblatt; sonst öffnet ein Kartentipp nichts */
  normale_aktion: boolean;
  /** true = Blase „Weiter geht’s, {Name}! …“ vor dem eigentlichen Schritt */
  wiedereinstieg: boolean;
}
