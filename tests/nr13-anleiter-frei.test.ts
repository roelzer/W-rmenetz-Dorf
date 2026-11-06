// Browser-Fund F3.1 (NR13, T24/T25 bei 844×390): DESIGN 13.3 „nie über dem Ziel“ gilt für alle Lochränder (inklusive Abstand)
// und die echte Kartenhöhe. Reine Rechnungen ohne Oberfläche; alle erwarteten Zahlen von Hand hergeleitet (Rechnung im Kommentar).
import { describe, expect, it } from 'vitest';
import { anleiterPlatzFrei, zielFlaecheNebenKarte } from '../src/ui/anleiter';
import { lochRand } from '../src/ui/spotlight';

const BILD = { breite: 844, hoehe: 390 }, FREI = { x: 0, y: 0, b: 844, h: 390 };

describe('NR13 Anleiter-Karte frei vom Loch', () => {
  it('test_nr13_anleiter_platz_frei: unten links, sonst oben links; null, wenn beide einen Lochrand träfen', () => {
    const unten = { links: 12, unten: 12, breite: 460, figur_px: 112 }, oben = { links: 12, oben: 64, breite: 460, figur_px: 112 };
    // Karte 178 hoch: unten von 390 − 12 − 178 = 200 bis 378, oben von 64 bis 242; links 12 bis 472
    expect(anleiterPlatzFrei(FREI, [], BILD, 178)).toEqual(unten);
    expect(anleiterPlatzFrei(FREI, [{ x: 300, y: 64, b: 100, h: 100 }], BILD, 178)).toEqual(unten);
    // Grenze: Lochrand endet genau an der Oberkante (100 + 100 = 200) → frei; 0,5 px tiefer → unten belegt, oben auch
    expect(anleiterPlatzFrei(FREI, [{ x: 300, y: 100, b: 100, h: 100 }], BILD, 178)).toEqual(unten);
    expect(anleiterPlatzFrei(FREI, [{ x: 300, y: 100, b: 100, h: 100.5 }], BILD, 178)).toBeNull();
    // Loch unten (250 bis 350): oben endet bei 242 → oben
    expect(anleiterPlatzFrei(FREI, [{ x: 300, y: 250, b: 100, h: 100 }], BILD, 178)).toEqual(oben);
    // rechts neben der Karte (ab x 472) stört nichts
    expect(anleiterPlatzFrei(FREI, [{ x: 472, y: 250, b: 100, h: 100 }], BILD, 178)).toEqual(unten);
    // zwei Löcher: das erste belegt oben, das zweite unten → null; T25 gemessen (280,118 245×134) → null
    expect(anleiterPlatzFrei(FREI, [{ x: 300, y: 64, b: 50, h: 50 }, { x: 300, y: 250, b: 50, h: 50 }], BILD, 178)).toBeNull();
    expect(anleiterPlatzFrei(FREI, [{ x: 280, y: 118, b: 245, h: 134 }], BILD, 178)).toBeNull();
    // Kartenhöhe zählt: 130 hoch → unten ab 248; T24 gemessen (257,99 134×134, bis 233) → unten frei
    expect(anleiterPlatzFrei(FREI, [{ x: 257, y: 99, b: 134, h: 134 }], BILD, 130)).toEqual(unten);
    // offenes Blatt: Breite und Figur wie anleiterPlatz (frei 456 → 456 − 24 = 432)
    expect(anleiterPlatzFrei({ x: 0, y: 0, b: 456, h: 390 }, [], BILD, 162)).toEqual({ links: 12, unten: 12, breite: 432, figur_px: 112 });
  });

  it('test_nr13_ziel_flaeche_neben_karte: Löcher ohne Zoom neben die Karte schieben, sonst so wenig wie nötig verkleinern', () => {
    const unten = { x: 12, y: 200, b: 460, h: 178 }, oben = { x: 12, y: 64, b: 460, h: 178 };
    // T25 844×390: Fläche 0..756 × 64..378, Lochrand 280,118 245×134 (Mitte 402,5|185), Randzugabe 24.
    // Über der unteren Karte: 1..755 × 65..199 (1 px Sicherheit) → Höhe 134 passt genau, Faktor 1, Mitte y 65 + 67 = 132.
    // Rechts (ab 473) wären 193 px Weg, unter der oberen Karte (243..377) 125 px → über der unteren gewinnt.
    expect(zielFlaecheNebenKarte({ x: 280, y: 118, b: 245, h: 134 }, [unten, oben], { x: 0, y: 64, b: 756, h: 314 }, 24))
      .toEqual({ faktor: 1, von: [402.5, 185], nach: [402.5, 132] });
    // Zu groß für jede Lücke: Fläche 0..600 × 64..364, Karten 186..364 bzw. 64..242, Lochrand 100,100 224×224 (Mitte 212|212).
    // Über der unteren: Höhe 185 − 65 = 120 → Faktor (120 − 24) / (224 − 24) = 0,48, neue Höhe 120, Mitte y 65 + 60 = 125;
    // rechts: Breite 599 − 473 = 126 → 0,51, aber 324 px Weg; unter der oberen: 0,48 und 91 px Weg.
    const r = zielFlaecheNebenKarte({ x: 100, y: 100, b: 224, h: 224 }, [{ x: 12, y: 186, b: 460, h: 178 }, oben], { x: 0, y: 64, b: 600, h: 300 }, 24);
    expect(r?.faktor).toBeCloseTo(0.48, 10);
    expect(r?.von).toEqual([212, 212]);
    expect(r?.nach[0]).toBeCloseTo(212, 10);
    expect(r?.nach[1]).toBeCloseTo(125, 10);
    // Kein Platz neben der Karte (Karte füllt die Fläche) → null
    expect(zielFlaecheNebenKarte({ x: 100, y: 100, b: 50, h: 50 }, [{ x: 0, y: 64, b: 600, h: 300 }], { x: 0, y: 64, b: 600, h: 300 }, 24)).toBeNull();
  });

  it('test_nr13_loch_rand: Umriss inklusive Abstand wie der gezeichnete Lochrand', () => {
    // Ellipse: Halbachsen 100/√2 + 12 bzw. 50/√2 + 12 um die Mitte (150|125)
    const e = lochRand({ r: { x: 100, y: 100, b: 100, h: 50 }, form: 'ellipse' });
    expect(e.x).toBeCloseTo(150 - 100 / Math.SQRT2 - 12, 10);
    expect(e.y).toBeCloseTo(125 - 50 / Math.SQRT2 - 12, 10);
    expect(e.b).toBeCloseTo(2 * (100 / Math.SQRT2 + 12), 10);
    expect(e.h).toBeCloseTo(2 * (50 / Math.SQRT2 + 12), 10);
    // Bedienelement: Rechteck + 8 je Seite
    expect(lochRand({ r: { x: 10, y: 20, b: 30, h: 40 }, form: 'rund' })).toEqual({ x: 2, y: 12, b: 46, h: 56 });
  });
});
