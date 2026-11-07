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
  | 'daneben'                  // Berührung außerhalb des Lochs (für „Hilfe nach drei Fehltipps“)
  | 'farbknopf'                // NR21: Farbknopf der Zeichenleiste; typ = angetippte Leitung
  | 'abgehoben';               // NR21: letzter Finger hebt im Zeichenmodus ab (auch pointercancel)

/** Kennung eines Tutorial-Schritts (DESIGN 13.5). T13b entfällt (DESIGN 13.17.1): Der Zwischenstand nach dem ersten Haus
 *  ist kein eigener Schritt, sondern ein Text von T13h.
 *  NR21: Reihenfolge T12, T13 (Hauptleitung), T13w (Wechsel der Größe am Abzweig), T13h (Hausanschlüsse), T14. */
export type TutorialSchrittId =
  | 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06' | 'T07' | 'T08' | 'T09' | 'T10' | 'T11' | 'T12' | 'T13' | 'T13w' | 'T13h'
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
export interface TutorialWerte {
  kessel_kw: number; kwh: number; kw_ohne: number; kw_puffer: number;
  /** NR21: Puffer-Bedarf Haus 1 + Haus 2 – so viel trägt die Hauptleitung bis zum Abzweig */
  kw_summe: number;
  /** NR21: Größe der Hauptleitung (benannte Vorgabe, E2) */
  haupt: TypId;
  /** NR21: Größe jedes Hausanschlusses (aus der Spielrechnung, E2) */
  anschluss: TypId;
}

/** NR20/NR21: Feldkoordinate (x, y) auf der Karte. */
export type Feld = readonly [number, number];

/** NR21 (Bauplan NR20-22 E3): Wie die Leitungen des Spielers zu den Rollen der Tutorial-Spur passen; rechnet der Kern. */
export interface TutorialLeitungsLage {
  haupt_ok: boolean; haus1_ok: boolean; haus2_ok: boolean;
  haupt_zu_duenn: boolean; anschluss_zu_dick: boolean;
  /** Probe-Netz (gebaut + eingezeichnet) zeigt Reduzierung, Aufteilung oder Engpass */
  planungsfehler: boolean;
  /** Felder, die weg müssen: zuerst ein eigener Abgang (Hausweg ohne Abzweig) außerhalb der Spur, dann jedes übrige Leitungsfeld
   *  außerhalb von Spur und echtem Hauptweg (Rest-Stück, DESIGN 13.17.9 F3), aufsteigend; [] = nichts muss weg */
  fremd: ReadonlyArray<Feld>;
  /** kleinstes Tutorial-Haus mit eigenem Abgang, sonst null */
  fremd_haus: 1 | 2 | null;
  felder: ReadonlyArray<{ x: number; y: number; rolle: 'haupt' | 'anschluss'; typ: TypId; richtig: boolean }>;
  /** alle 6 Spurfelder in Zugrichtung */
  spur: ReadonlyArray<{ x: number; y: number; stueck: 'haupt' | 'haus1' | 'haus2'; belegt: TypId | null; richtig: boolean }>;
}

/** NR20: ein Feld der Geisterleitung (Band) mit Pfeil. */
export interface TutorialBandFeld {
  x: number; y: number; typ: TypId; aktiv: boolean; falsch: boolean;
  /** Feldschritt zum nächsten Feld des Stücks, letztes Feld → Haus ([0,1] = nach Süden); null auf dem Abzweig */
  pfeil: Feld | null;
}

/** Sperre einer Bedienung: `kurz` = Knopfzeile 2 (höchstens 18 Zeichen), `satz` = Simon-Satz in der Blase. */
export interface TutorialSperre { kurz: string; satz: string }

/** Alles, was die Oberfläche für den aktuellen Tutorial-Schritt zeigt – sie entscheidet nur nach diesen Feldern (AE-NR13-4). */
export interface TutorialAnsicht {
  schritt: TutorialSchrittId; kapitel: number; kapitel_name: string;
  art: 'W' | 'H';
  /** fertiger Blasentext nach Vorrang (Bauplan NR20-22 P2): T13/T13h Geld-Satz > Sperr-Satz > eigener Abgang > Größen-Satz >
   *  Hilfe > Zwischenstand (nur T13h) > Grundtext; T13w Sperr-Satz > Hilfe > Erklärsatz; sonst Sperr-Satz > Hilfe (nur H) >
   *  Grundtext. **fett**-Marken, höchstens 120 Zeichen ohne Marken */
  text: string;
  /** K4: Erklär-Schritt nach drei Fehltipps – „Tippe auf Weiter.“ gedämpft in der Knopfzeile */
  knopf_hinweis?: string;
  /** T25 */
  wusstest_du: boolean;
  /** Löcher; Fingerziel = ziele[0] */
  ziele: ZielName[];
  /** 'tippen' auf ziele[0]; 'spur' = fährt finger_weg ab, in T13 und T13h für den ganzen Schritt –
   *  weitergeschaltet wird erst nach dem Abheben des Zugs (`zugLaeuft`) */
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
  /** NR20: Geisterleitung; [] außerhalb T13/T13w/T13h */
  band: TutorialBandFeld[];
  /** NR20: Feld mit der leuchtenden Raute */
  naechstes_feld: Feld | null;
  /** NR20: T13, T13w: TUTORIAL_ABZWEIG; T13h bei fremd ≠ [] und nach einem eigenen Abgang, bis dessen Haus richtig angeschlossen
   *  ist (DESIGN 13.17.9 F8); sonst null */
  zielscheibe: Feld | null;
  /** NR20: Feldkoordinaten ab naechstes_feld; T13 endet auf der Zielscheibe, T13h auf der Hausmitte; [] = kein Ziehen */
  finger_weg: ReadonlyArray<readonly [number, number]>;
  /** NR21: = TutorialLeitungsLage.fremd in T13h/T14; in T13/T13w nur bei eigenem Abgang oder Planungsfehler trotz beider Häuser
   *  ok (Review P5f-1 W1 (a), Rest-Stück erst ab T13h); sonst [] */
  fremd: ReadonlyArray<Feld>;
  /** NR20: Haus-Ids mit Ziel-Stecker */
  ziel_stecker: number[];
  /** NR20: Haus-Id mit Ring; in T13/T13w immer null */
  ziel_ring: number | null;
  /** NR20: richtig angeschlossene Tutorial-Häuser (haus1_ok/haus2_ok) */
  erreicht_ids: number[];
  /** NR21: Farbknopf mit Ring */
  farbknopf_ring: TypId | null;
  /** NR21: Leiste muss offen sein; beim Herstellen mit diesem Typ öffnen */
  zeichenleiste: { typ: TypId } | null;
  /** NR21: nur T13w */
  zeichnen_ruht: boolean;
  /** NR20: kompakte Anleiter-Karte in T13/T13w/T13h */
  kompakt: boolean;
  /** NR20: Ruhe im Bild (kW-Schilder und fremde Blasen aus, Schleier) in T12–T14 */
  ruhe: boolean;
}
