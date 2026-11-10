import type { Objekt } from '../core/typen';
import { schatten } from './farben';
import { type Maler, type Punkt } from './maler';
import { atlasFlaeche } from './grafiken';

/** Fassadendetails sitzen in lokalen Koordinaten auf der jeweiligen Hausseite. */
function fassade(m: Maler, a: Punkt, b: Punkt, hp: number, mitte: Punkt, front: boolean, holz: boolean, etagen: number, balkon: boolean, warm: boolean, baeckerei: boolean): void {
  if (b[0] >= a[0] - 0.01) return;
  const dx = (a[0] + b[0]) / 2 - mitte[0], dy = (a[1] + b[1]) / 2 - mitte[1];
  const punkt = (u: number, z: number, tiefe = 0): Punkt =>
    [a[0] + (b[0] - a[0]) * u + dx * tiefe, a[1] + (b[1] - a[1]) * u - hp * z + dy * tiefe];
  const rechteck = (l: number, r: number, unten: number, oben: number, farbe: string, tiefe = 0): void => {
    m.flaeche([punkt(l, unten, tiefe), punkt(r, unten, tiefe), punkt(r, oben, tiefe), punkt(l, oben, tiefe)], farbe, false);
  };
  // Balkonplatten, Fensterbänke und Vordach haben eine sichtbare Ober- und Vorderkante.
  const vorbau = (l: number, r: number, unten: number, oben: number, tiefe: number, farbe: string): void => {
    m.flaeche([punkt(l, oben), punkt(r, oben), punkt(r, oben, tiefe), punkt(l, oben, tiefe)], schatten(farbe, 0.18), false);
    const kante = dx < 0 ? r : l;
    m.flaeche([punkt(kante, unten), punkt(kante, unten, tiefe), punkt(kante, oben, tiefe), punkt(kante, oben)], schatten(farbe, -0.24), false);
    rechteck(l, r, unten, oben, farbe, tiefe);
  };

  rechteck(0, 1, 0, 0.07, '#a6a09a');
  if (holz) {
    rechteck(0.14, 0.86, 0.07, 1, '#bc824b');
    if (m.tw >= 32) {
      for (let i = 1; i <= 8; i++) rechteck(0.14, 0.86, i / 9, i / 9 + 0.012, '#a76e3e');
    }
  }
  for (let i = 0; i < etagen; i++) {
    const unten = (i + 0.12) / etagen, oben = (i + 0.84) / etagen;
    const tuer = front && i === 0;
    const links = tuer ? 0.47 : 0.20, rechts = tuer ? 0.86 : 0.80;
    rechteck(links, rechts, unten, oben, '#323941');
    rechteck(links + 0.025, rechts - 0.025, unten + 0.022, oben - 0.022, warm ? '#f1c880' : '#6996ad');
    const sprosse = (links + rechts) / 2;
    rechteck(sprosse - 0.018, sprosse + 0.018, unten, oben, '#39434b');
    if (m.tw >= 32) rechteck(links + 0.048, links + 0.085, unten + 0.04, oben - 0.04, warm ? '#ffe4b2' : '#a8c4cf');
    vorbau(links - 0.018, rechts + 0.018, unten - 0.035, unten, 0.055, '#7d807e');

    if (balkon && front && i > 0) {
      vorbau(0.13, 0.88, unten - 0.048, unten + 0.02, 0.27, '#c9c0b2');
      rechteck(0.15, 0.86, unten + 0.02, unten + 0.15, 'rgba(126,167,180,.65)', 0.27);
      rechteck(0.14, 0.87, unten + 0.145, unten + 0.165, '#555e64', 0.27);
      for (const u of [0.15, 0.50, 0.85]) rechteck(u, u + 0.014, unten + 0.02, unten + 0.16, '#555e64', 0.27);
    }
    if (tuer) {
      rechteck(0.14, 0.40, 0, oben, '#383d42');
      rechteck(0.17, 0.37, 0.015, oben - 0.025, '#ad7547');
      rechteck(0.31, 0.335, oben * 0.36, oben * 0.56, '#e0d7bf');
      vorbau(0.10, 0.43, 0, 0.04, 0.17, '#b7afa3');
      vorbau(0.09, baeckerei ? 0.9 : 0.44, oben + 0.015, oben + 0.06, 0.19, baeckerei ? '#ab5844' : '#3c4955');
    }
  }
}

/** Die zwei im Atlas fotografierten Seiten je Haustyp. Dach und PV liegen außerhalb der Ausschnitte. */
const FASSADEN: Record<'haus' | 'mfh', Record<'eingang' | 'seite', [Punkt, Punkt, Punkt]>> = {
  haus: {
    eingang: [[315, 312], [558, 245], [315, 571]],
    seite: [[77, 273], [298, 311], [77, 526]],
  },
  mfh: {
    eingang: [[308, 821], [577, 753], [308, 1211]],
    seite: [[68, 766], [288, 822], [68, 1140]],
  },
};

/** Nach dem Dorf-Atlas modellierte Wohnhäuser mit Putz, Holz und Glas. */
export function zeichneWohnhaus(m: Maler, o: Objekt, cx: number, cy: number, strassenseite: number, warm: boolean): void {
  const mfh = o.typ === 'mfh', reihe = o.typ === 'rh';
  const breite = mfh ? 1.5 : reihe ? 0.80 : 0.68 + 0.023 * o.stufe;
  const hp = m.tw * (mfh ? 0.78 : reihe ? 0.34 : 0.32) * (1 + 0.04 * (o.stufe - 1));
  const dachhoehe = mfh ? 0 : hp * 0.47;
  const quer = strassenseite % 2 === 1;
  const wand = ['#f1e5d0', '#e8dfce', '#eee8db'][o.id % 3];
  const dach = '#374656';

  m.schatten(cx, cy, breite);
  m.kontaktSchatten(cx, cy, breite);
  const gesims = breite * 1.07, blende = m.tw * 0.028;
  m.quader(cx, cy, breite, hp, wand, false);
  const boden = m.ecken(cx, cy, breite);
  for (let i = 0; i < 4; i++) {
    const rechts = boden[i], links = boden[(i + 1) % 4];
    if (links[0] >= rechts[0] - 0.01) continue;
    const front = i === strassenseite, seite = i === (strassenseite + 1) % 4;
    if (!front && !seite) continue;
    const obenLinks: Punkt = [links[0], links[1] - hp], obenRechts: Punkt = [rechts[0], rechts[1] - hp];
    if (o.typ !== 'baeck' && atlasFlaeche(m.X, FASSADEN[mfh ? 'mfh' : 'haus'][front ? 'eingang' : 'seite'],
      [obenLinks, obenRechts, links], [obenLinks, obenRechts, rechts, links])) {
      if (warm) m.flaeche([obenLinks, obenRechts, rechts, links], 'rgba(255,185,88,.10)', false);
      continue;
    }
    fassade(m, rechts, links, hp, [cx, cy], front, seite || (mfh && front),
      mfh ? 3 : reihe || o.typ === 'baeck' ? 1 : 2, mfh, warm, o.typ === 'baeck');
  }
  const kranz = m.quader(cx, cy - hp, gesims, blende, dach, mfh);
  if (mfh) {
    m.flaeche(m.ecken(cx, cy - hp - blende, breite * 0.93), '#696d6c', false);
    m.quader(cx, cy - hp - blende, 0.22, m.tw * 0.06, '#989e9e');
  } else {
    kranz.wandR = '#b88654';
    const first = m.dach(kranz, dachhoehe, dach, quer);
    const seite = (strassenseite + 1) % 4, naechste = (seite + 1) % 4;
    const rechts = boden[seite], links = boden[naechste];
    if (o.typ !== 'baeck' && links[0] < rechts[0] - 0.01) {
      const l: Punkt = [links[0], links[1] - hp], r: Punkt = [rechts[0], rechts[1] - hp];
      const spitze = (seite + (quer ? 3 : 0)) % 4 === 1 ? first.P2 : first.P1;
      atlasFlaeche(m.X, FASSADEN.haus.seite, [l, r, links], [l, r, spitze]);
    }
  }
}
