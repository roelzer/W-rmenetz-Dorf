import { KONSTANTEN, LEITUNGSRANG, istLeitung, type TypId } from './katalog';
import { leitungsNachbarn } from './netz';
import { TUTORIAL_ABZWEIG, TUTORIAL_ANSCHLUSS_1, TUTORIAL_ANSCHLUSS_2, TUTORIAL_HAUPT } from './start';
import type { Feld, TutorialLeitungsLage } from './tutorial-vertrag';
import type { Netz, Objekt } from './typen';

// AE-NR21-1 (Bauplan NR20-22 E3): Wie die Leitungen des Spielers zur Tutorial-Spur passen. Liest nur den Netzbaum, den
// berechneNetz schon gerechnet hat (Hausanschluss, Eltern, Planungsfehler) – keine zweite Netzrechnung.
const N = KONSTANTEN.feldanzahl;
const nummer = ([x, y]: Feld): number => y * N + x;
const koordinate = (k: number): Feld => [k % N, (k - (k % N)) / N];
const ABZWEIG = nummer(TUTORIAL_ABZWEIG);
const HAUPT_SPUR = new Set(TUTORIAL_HAUPT.map(nummer));
const ANSCHLUSS_SPUR = [new Set(TUTORIAL_ANSCHLUSS_1.map(nummer)), new Set(TUTORIAL_ANSCHLUSS_2.map(nummer))];
const SPUR: ReadonlyArray<{ feld: Feld; stueck: 'haupt' | 'haus1' | 'haus2' }> = [
  ...TUTORIAL_HAUPT.map((feld) => ({ feld, stueck: 'haupt' as const })),
  ...TUTORIAL_ANSCHLUSS_1.map((feld) => ({ feld, stueck: 'haus1' as const })),
  ...TUTORIAL_ANSCHLUSS_2.map((feld) => ({ feld, stueck: 'haus2' as const })),
];
const SPUR_FELDER = new Set(SPUR.map((s) => nummer(s.feld)));

/** Rein: Lage der Tutorial-Leitungen im übergebenen Netz (Probe-Netz: gebaut + eingezeichnet). */
export function tutorialLeitungsLage(netz: Netz, objekte: ReadonlyArray<Objekt>, haus1_id: number, haus2_id: number, haupt: TypId, anschluss: TypId): TutorialLeitungsLage {
  for (const id of [haus1_id, haus2_id]) if (!objekte.some((o) => o.id === id)) throw new Error(`NR21: Tutorial-Haus ${id} fehlt`);
  const typAn = (k: number): TypId | null => {
    const o = netz.nachId.get(netz.belegung[k]);
    return o && istLeitung(o.typ) ? o.typ : null;
  };
  // Weg über netz.eltern bis zur Heizzentrale (Eltern −1); [] für ein Feld, das nicht mit ihr verbunden ist.
  const weg = (start: number): number[] => {
    if (!netz.tiefe.has(start)) return [];
    const w: number[] = [];
    for (let k = start; k >= 0; k = netz.eltern.get(k) as number) w.push(k);
    return w;
  };
  const hauptweg = weg(ABZWEIG);
  const aufHauptweg = new Set(hauptweg);
  const haeuser = [haus1_id, haus2_id].map((id, i) => {
    const a = netz.anschluss.get(id);
    const hausweg = a && a.feld >= 0 ? weg(a.feld) : [];
    const vorhanden = hausweg.length > 0;
    const eigenerAbgang = vorhanden && !hausweg.includes(ABZWEIG);
    // A57/M2/N2: nur ein Anschluss am Leitungsende oder auf einem Spurfeld des eigenen Hausanschlusses bestimmt Rollen.
    const ende = vorhanden && leitungsNachbarn(...koordinate(hausweg[0]), (f) => typAn(f) !== null) <= 1;
    const gezaehlt = vorhanden && !eigenerAbgang && (ende || ANSCHLUSS_SPUR[i].has(hausweg[0]));
    return { hausweg, eigenerAbgang, gezaehlt };
  });

  // fremd, erster Teil: Felder eines eigenen Abgangs außerhalb der Spur und des echten Hauptwegs, Haus 1 vor Haus 2.
  const fremd: number[] = [];
  haeuser.forEach((h, i) => {
    if (!h.eigenerAbgang) return;
    for (const k of h.hausweg) {
      if (ANSCHLUSS_SPUR[i].has(k) || HAUPT_SPUR.has(k) || aufHauptweg.has(k) || fremd.includes(k)) continue;
      fremd.push(k);
    }
  });
  const fremd_haus = haeuser[0].eigenerAbgang ? 1 : haeuser[1].eigenerAbgang ? 2 : null;

  const gezaehlt = haeuser.map((h) => new Set(h.gezaehlt ? h.hausweg : []));
  // Felder aus dem ersten Teil von fremd liegen auf keinem gezählten Hausweg (ein eigener Abgang läuft nicht über den Abzweig)
  // und nach K-a nie auf dem Hauptweg, haben also keine Rolle. Felder aus dem zweiten Teil können auf einem gezählten Hausweg
  // liegen (Haus am Ende eines Rings); dort hat fremd Vorrang, sie werden unten aus `felder` genommen.
  const rolleVon = (k: number): 'haupt' | 'anschluss' | null => {
    if (aufHauptweg.has(k) || (gezaehlt[0].has(k) && gezaehlt[1].has(k))) return 'haupt';
    return gezaehlt[0].has(k) || gezaehlt[1].has(k) ? 'anschluss' : null;
  };
  const passt = (rolle: 'haupt' | 'anschluss', typ: TypId): boolean =>
    rolle === 'haupt' ? LEITUNGSRANG[typ] >= LEITUNGSRANG[haupt] : typ === anschluss;

  const rollenFelder = new Set([...hauptweg, ...gezaehlt[0], ...gezaehlt[1]]);
  const alleFelder = [...rollenFelder].sort((p, q) => p - q).flatMap((k) => {
    const rolle = rolleVon(k), typ = typAn(k);
    if (!rolle || !typ) return [];
    const [x, y] = koordinate(k);
    return [{ x, y, rolle, typ, richtig: passt(rolle, typ) }];
  });
  const richtig = new Map(alleFelder.map((f) => [nummer([f.x, f.y]), f.richtig]));
  const haupt_zu_duenn = alleFelder.some((f) => f.rolle === 'haupt' && !f.richtig);
  const anschluss_zu_dick = alleFelder.some((f) => f.rolle === 'anschluss' && LEITUNGSRANG[f.typ] > LEITUNGSRANG[anschluss]);
  const haupt_ok = hauptweg.length > 0 && !haupt_zu_duenn;
  // Haus ok (E3 Punkte 1–3): gezählter Hausweg, jedes Feld mit Rolle richtig. Punkt 3 (Hausweg enthält den Abzweig) steckt in
  // „gezählt“, denn ein Hausweg ohne Abzweig ist ein eigener Abgang.
  const [haus1_ok, haus2_ok] = haeuser.map((h) =>
    h.gezaehlt && h.hausweg.every((k) => !rolleVon(k) || richtig.get(k) === true));

  const fehlerFelder = new Set([...netz.reduzierung, ...netz.aufteilung, ...netz.engpass]);
  const planungsfehler = fehlerFelder.size > 0;
  // fremd, zweiter Teil (Fassung 2.3 M1): Planungsfehler abseits der Spur, obwohl beide Häuser richtig angeschlossen sind.
  if (haus1_ok && haus2_ok && planungsfehler) {
    fremd.push(...[...fehlerFelder].filter((k) => !SPUR_FELDER.has(k) && !aufHauptweg.has(k)).sort((p, q) => p - q));
  }
  // fremd, dritter Teil (Entscheidung PL 2026-11-07, DESIGN 13.17.9 F3 „Rest-Stück“): Im geführten Kapitel 3 muss jede Leitung
  // außerhalb von Spur und echtem Hauptweg weg – auch ein Rest nach [Zurück] oder ein unverbundenes Stück. Sonst würde ein
  // falsches Stück still mitgebaut. Aufsteigend nach Feldnummer, jedes Feld nur einmal.
  for (let k = 0; k < netz.belegung.length; k++) {
    if (typAn(k) !== null && !SPUR_FELDER.has(k) && !aufHauptweg.has(k) && !fremd.includes(k)) fremd.push(k);
  }

  // Entscheidung PL: fremd hat Vorrang vor der Rolle. Die Bewertung oben bleibt, wie sie ist – der zweite Teil von fremd entsteht
  // ohnehin erst, wenn beide Häuser ok sind, also jedes Feld mit Rolle richtig ist.
  const fremdFelder = new Set(fremd);
  const felder = alleFelder.filter((f) => !fremdFelder.has(nummer([f.x, f.y])));

  const spur = SPUR.map(({ feld, stueck }) => {
    const k = nummer(feld), belegt = typAn(k), rolle = rolleVon(k);
    const regel = rolle ?? (stueck === 'haupt' ? 'haupt' : 'anschluss');
    return { x: feld[0], y: feld[1], stueck, belegt, richtig: belegt !== null && passt(regel, belegt) };
  });
  return {
    haupt_ok, haus1_ok, haus2_ok, haupt_zu_duenn, anschluss_zu_dick, planungsfehler,
    fremd: fremd.map(koordinate), fremd_haus, felder, spur,
  };
}
