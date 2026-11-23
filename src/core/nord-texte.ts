import { abStufe } from './freischaltung';

/**
 * NR27 (AE-NR27-12): Alle Spielertexte zu Bahn und Querung stehen in dieser einen Tabelle. Sie liegt im Kern, weil die
 * Sperrtexte des Kerns sie brauchen und der Kern nichts aus `ui` importieren darf. Platzhalter: `{stufe}` füllt `nordText`
 * selbst aus der Freischalt-Leiter, alle anderen übergibt der Aufrufer.
 */
const TEXTE = {
  Q2: { text: 'Über die Bahn geht es erst mit einer Bahnquerung – {sperrgrund}' },
  Q4: { text: 'Unter der Bahn geht es im Spiel nur quer hindurch, nicht an den Gleisen entlang.' },
  STELLE: { text: 'Über die Gleise geht es nur an einer Stelle: in Verlängerung der Hauptstraße.' },
  BRUECKE: { text: 'Über die Bahnbrücke führt im Spiel keine Leitung.' },
  GLEISE: { text: 'Auf den Gleisen kann nichts gebaut werden.' },
  HINTER: { text: 'Hinter der Bahn geht es erst weiter, wenn die Bahnquerung gebaut ist.' },
  Q5: { text: 'Die Bahnquerung wird noch gebaut. Danach geht es hinter der Bahn weiter.' },
  EXPRESS: { text: 'Eine Bahnquerung lässt sich nicht beschleunigen.' },
  SOFORT_GRUND: { text: 'nicht bei Bahnquerung' },
  KATALOG_ZEILE: { text: 'Über die Bahn kommt eine Leitung nur quer über die Gleise – ab Heizzentrale Stufe {stufe}.' },
  KATALOG_PREIS: { text: 'Über die Gleise nur per Bahnquerung an der Hauptstraße: {preis} je Gleisfeld.' },
  N1: { text: 'Hinter der Bahn: Diese Häuser erreichst du über eine Bahnquerung ab Heizzentrale Stufe {stufe}.' },
  N2: { text: 'Zeichne im Bauabschnitt eine Leitung über die Gleise – in Verlängerung der Hauptstraße.' },
  F1: { text: 'Bahnquerung fertig! Die Häuser hinter der Bahn kannst du jetzt anschließen.' },
  WISSEN_A: { fach: true, text: 'Gleise werden in der Regel nicht aufgegraben. Die Leitung wird von Grube zu Grube unter ihnen durchgebohrt oder -gepresst.' },
  WISSEN_B: { fach: true, text: 'Vorher muss die Bahn den Plan prüfen und zustimmen. Das braucht Zeit.' },
  KARTE_1: { fach: true, text: 'Gleise werden in der Regel nicht aufgegraben wie eine Straße.' },
  KARTE_2: { fach: true, text: 'Man hebt zwei Gruben aus und bohrt oder presst die Leitung unter den Gleisen durch, oft in einem Schutzrohr.' },
  KARTE_3: { fach: true, text: 'Das braucht Spezialgeräte und genaue Planung.' },
  KARTE_4: { fach: true, text: 'Vorher muss die Bahn den Plan prüfen und zustimmen – das braucht Zeit.' },
  KARTE_5: { text: 'Preis und Bauzeit sind im Spiel vereinfacht.' },
  TUTORIAL_1: { fach: true, text: 'Mit einer Bahnquerung bringst du eine Leitung unter den Gleisen durch zum Wohngebiet dahinter.' },
  KOSTEN_ZUSATZ: { text: 'dazu eine Bahnquerung ({querung_eur}) · Bauzeit +{querung_zeit}' },
  TUTORIAL_BEDIEN: { text: 'Neu: Bahnquerung. Zieh an der Hauptstraße eine Leitung über die Gleise.' },
  BLATT_ZEILE: { text: 'Bahnquerung · unter den Gleisen · {laenge_m} m' },
  KARTE_TITEL: { text: 'Warum so teuer?' },
  KARTE_ALT: { text: 'Skizze: zwei Gruben, Leitung unter zwei Gleisen' },
  CHIP: { text: '+ Bahnquerung' },
  TUTORIAL_2: { text: 'Gut für die Häuser hinter der Bahn. Teuer und langsam – ein späterer Rohrtausch dort kostet die Querung noch einmal.' },
} as const satisfies Record<string, { text: string; fach?: true }>;

export type NordTextId = keyof typeof TEXTE;
export const NORD_TEXTE: Readonly<Record<NordTextId, { text: string; fach?: true }>> = TEXTE;

/** Nur mit Simons Eintrag „NR27-Fachtexte“ in .claude/freigaben.md auf true (AE-NR27-13). */
export const NORD_FACHTEXTE_FREIGEGEBEN: boolean = false;

/** Text zur Kennung. `null` nur für Fachtexte ohne Freigabe. Fehlt ein Platzhalterwert, ist das ein Programmfehler und wirft. */
export function nordText(
  id: NordTextId,
  werte: Readonly<Record<string, string | number>> = {},
  freigegeben: boolean = NORD_FACHTEXTE_FREIGEGEBEN,
): string | null {
  const eintrag: { text: string; fach?: true } = NORD_TEXTE[id];
  if (eintrag.fach && !freigegeben) return null;
  return eintrag.text.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (name === 'stufe') return String(abStufe('bahnquerung'));
    const wert = werte[name];
    if (wert === undefined) throw new Error(`nordText ${id}: Platzhalter {${name}} ohne Wert`);
    return String(wert);
  });
}

/** Text für Hinweise und Sperrgründe, der nie ein Fachtext sein darf (er muss immer erscheinen). Ein Fachtext hier ist ein
 *  Programmfehler und wirft – sonst stünde vor Spielern ein leerer Hinweis. */
export function nordHinweisText(id: NordTextId, werte: Readonly<Record<string, string | number>> = {}): string {
  const text = nordText(id, werte);
  if (text === null) throw new Error(`nordText ${id}: Hinweis darf kein Fachtext sein`);
  return text;
}
