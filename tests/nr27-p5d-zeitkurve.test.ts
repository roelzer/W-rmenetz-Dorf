import { describe, expect, it } from 'vitest';
import tokens from '../design/tokens.json';
import { berechneNetz } from '../src/core/netz';
import { bahnFelder, NORD_PLAN } from '../src/core/nordviertel';
import type { Objekt } from '../src/core/typen';
import { Effekte } from '../src/render/effekte';
import { Kamera } from '../src/render/kamera';
import { Maler } from '../src/render/maler';
import { bodenEbeneEinrichten, zeichneSzene, type Szene } from '../src/render/szene';
import { neu } from './hilfen';
import { aufnahme, leeresDorf } from './hilfen/nr22';

// NR27 P5d (Review P5b K1): Der Dunst hebt sich mit `kurve.weich` (DESIGN 14.8 „Dunst 1200 ms kurve.weich“), nicht gleichmäßig.
// Bisher prüften die Tests nur Anfang (1), Ende (weg) und „fällt stetig“ – eine Gerade bestand genauso. Muster wie
// tests/nr27-p5b4-erfolg.test.ts.
//
// Werte von Hand (unabhängig vom Code, Newton-Verfahren auf der Bézier-Kurve cubic-bezier(.2,.9,.3,1), P1 = (0,2|0,9),
// P2 = (0,3|1)): x(s) = 3(1−s)²s·0,2 + 3(1−s)s²·0,3 + s³, y(s) = 3(1−s)²s·0,9 + 3(1−s)s²·1 + s³.
//   Zeitanteil ¼: x(s) = 0,25 bei s ≈ 0,418688 → y ≈ 0,761116 → Deckkraft 1 − y ≈ 0,238884 (Gerade: 0,75)
//   Zeitanteil ½: x(s) = 0,5  bei s ≈ 0,689049 → y ≈ 0,949947 → Deckkraft 1 − y ≈ 0,050053 (Gerade: 0,5)
// Die Dauer kommt aus `zeit_ms.dunst_heben`; die Bildzeit ist ein Zwölftel davon (bei 1200 ms 0,1 s, unter der Kappung 0,1 s
// in Effekte.zeichnen), 3 Bilder = ¼, 6 Bilder = ½. Im Auslösebild steht t = 0, das k-te Bild danach zeigt t = k · dt.
const DAUER_S = tokens.zeit_ms.dunst_heben / 1000, DT = DAUER_S / 12;
const SOLL_VIERTEL = 0.238884, SOLL_HALB = 0.050053, GENAU = 1e-4;

function kamera(): Kamera {
  const k = new Kamera();
  k.kartenOben = -10; k.kartenHoehe = 46;
  k.groesseSetzen(844, 390, 1); k.zoom = 1.4; k.zentrieren(10, -3, 1);
  return k;
}
const HZ = neu('hz', 11, 30), NETZ = berechneNetz([HZ], [], 1);
const szene = (spiel: Szene['spiel'], mit_kulisse: boolean): Szene => ({
  objekte: [HZ] as Objekt[], innen: [], netz: NETZ, spiel, auswahl_id: null, modus: 'normal', geist: null,
  verschiebe_id: null, stempel: null, jetzt_ms: 50_000, strassen: [], fluss: [], kw_anzeigen: false, kartenOben: -10, kartenHoehe: 46,
  bahn: bahnFelder(), kulisse: mit_kulisse ? NORD_PLAN : [],
});

function darstellung() {
  const e = new Effekte();
  return {
    e,
    bild(s: Szene, dt_s = DT): string[] {
      const a = aufnahme(), m = new Maler(a.X);
      m.reduziert = false;
      bodenEbeneEinrichten(null);
      zeichneSzene(m, kamera(), s, e, dt_s);
      return a.befehle;
    },
  };
}
/** Deckkraft, mit der der Dunst gezeichnet wird (Kennzeichen wie in tests/nr27-p5b4-erfolg.test.ts), sonst null. */
function dunst(b: string[]): number | null {
  const args = (c: string): string[] => c.slice(c.indexOf('(') + 1, -1).split(',');
  const i = b.findIndex((c, j) => {
    if (!c.startsWith('createLinearGradient(')) return false;
    const ecke = b.slice(j + 1, j + 4).find((x) => x.startsWith('moveTo('));
    return !!ecke && args(ecke).join() === args(c).slice(0, 2).join();
  });
  if (i < 0) return null;
  const vorher = b.slice(Math.max(0, i - 3), i).reverse().find((c) => c.startsWith('globalAlpha='));
  return vorher ? Number(vorher.slice(12)) : 1;
}

describe('NR27 P5d Dunst hebt sich mit kurve.weich, nicht gleichmäßig (DESIGN 14.8)', () => {
  it('Testaufbau: Zeitkurve und Dauer wie in der Herleitung, Bildzeit unter der Kappung', () => {
    expect(tokens.menue.kurve.weich.replace(/\s/g, '')).toBe('cubic-bezier(.2,.9,.3,1)');
    expect(DT).toBeGreaterThan(0);
    expect(DT).toBeLessThanOrEqual(0.1);
  });

  // Fehler, die ihn rot machen: die Deckkraft fällt gleichmäßig (Gerade 1 − t/T: ¼ → 0,75, ½ → 0,5), mit einer anderen oder
  // gespiegelten Kurve (langsam beginnend), oder die Zeit läuft nicht über dt_s.
  it('test_nr27_dunst_zeitkurve: Effekte – nach ¼ der Dauer Deckkraft 1 − WEICH(¼), nach ½ 1 − WEICH(½)', () => {
    const e = new Effekte(), a = aufnahme(), m = new Maler(a.X), mitte = (): [number, number] => [0, 0];
    e.erfolgsmoment([[10, -1], [10, -4]], false, 0);
    expect(e.dunstDeckkraft(), 'beim Auslösen').toBe(1);
    for (let i = 0; i < 3; i++) e.zeichnen(m, DT, mitte);
    expect(e.dunstDeckkraft(), 'nach ¼ der Dauer').toBeCloseTo(SOLL_VIERTEL, 4);
    for (let i = 0; i < 3; i++) e.zeichnen(m, DT, mitte);
    expect(Math.abs(e.dunstDeckkraft() - SOLL_HALB), 'nach ½ der Dauer').toBeLessThan(GENAU);
  });

  // Fehler, die ihn rot machen: die Szene zeichnet den Dunst mit einer eigenen (geraden) Deckkraft statt der Zeitkurve.
  it('test_nr27_dunst_zeitkurve: gezeichneter Dunst nach ¼ und ½ der Dauer mit der Deckkraft der weichen Kurve', () => {
    const d = darstellung(), sp = leeresDorf(1_700_000_000_000).s;
    expect(dunst(d.bild(szene(sp, true))), 'vorher: Dunst über der Kulisse').toBe(1);
    const werte: Array<number | null> = [];
    for (let k = 0; k <= 6; k++) werte.push(dunst(d.bild(szene(sp, false))));
    expect(werte[0], 'Auslösebild').toBe(1);
    expect(werte[3], 'nach ¼ der Dauer gezeichnet').not.toBeNull();
    expect(Math.abs((werte[3] as number) - SOLL_VIERTEL), `nach ¼: ${werte[3]}`).toBeLessThan(GENAU);
    expect(werte[6], 'nach ½ der Dauer gezeichnet').not.toBeNull();
    expect(Math.abs((werte[6] as number) - SOLL_HALB), `nach ½: ${werte[6]}`).toBeLessThan(GENAU);
  });
});
