import {
  KATALOG, KONSTANTEN, UPGRADES, SPREIZUNG_BASIS_K, MIN_RUECKLAUF_C, VOLLLASTSTUNDEN, DACH_PV, LEITUNGSRANG, VORLAUF, PREISSTUFEN, GRUNDGEBUEHR, SPIELJAHR_MS, istLeitung, istPufferStation, stationHolen, PUFFER_STATIONEN,
  type Station, type TypId,
} from './katalog';
import type { InnenQuelle, Netz, Objekt } from './typen';

/** Spreizung eines Kunden in K: Grundwert plus Upgrades (A33), aber höchstens Vorlauf minus Mindest-Rücklauf 40 °C (A73). */
export function spreizungHaus_k(o: Objekt, vorlauf_c: number = VORLAUF.start_c): number {
  const ziel = SPREIZUNG_BASIS_K + UPGRADES.slice(0, o.upgrade ?? 0).reduce((a, u) => a + u.senkung_k, 0);
  return Math.max(0, Math.min(ziel, vorlauf_c - MIN_RUECKLAUF_C));
}
/** A49: Mittlere Spreizung (Vorlauf minus Rücklauf) der Kunden in K, nach Bedarf gewichtet; mit `auswahl` nur diese Gebäude (z. B. die warmen). Niedrigere Rücklauftemperatur = größere Spreizung. */
export function mittlereSpreizung_k(objekte: Objekt[], auswahl?: ReadonlySet<number>, vorlauf_c: number = VORLAUF.start_c): number {
  let summe = 0, gew = 0;
  for (const o of objekte) {
    if (!istKunde(o) || (auswahl && !auswahl.has(o.id))) continue;
    const w = bedarfKw(o);
    summe += spreizungHaus_k(o, vorlauf_c) * w; gew += w;
  }
  return gew ? summe / gew : Math.min(SPREIZUNG_BASIS_K, vorlauf_c - MIN_RUECKLAUF_C);
}

const N = KONSTANTEN.feldanzahl;

/** Kantenlänge des Objekts in Feldern. Die Heizzentrale wächst ab Stufe 3 (oder im Ausbau auf 3) auf 3×3. */
export function groesse(o: Pick<Objekt, 'typ' | 'stufe' | 'bau'>): number {
  if (o.typ === 'hz') {
    return o.stufe >= 3 || (o.stufe === 2 && o.bau?.art === 'ausbau') ? 3 : 2;
  }
  return KATALOG[o.typ].groesse ?? 1;
}

export const istAktiv = (o: { bau: { art: string } | null }): boolean => !(o.bau && o.bau.art === 'neu');

export const heizzentrale = (objekte: Objekt[]): Objekt =>
  objekte.find((o) => o.typ === 'hz') as Objekt;

/** Belegung: Feld → Objekt-ID (0 = frei). */
export function belegungskarte(objekte: Objekt[], ohne?: Objekt): Int32Array {
  const m = new Int32Array(N * N);
  for (const o of objekte) {
    if (o === ohne) continue;
    const s = groesse(o);
    for (let dy = 0; dy < s; dy++) {
      for (let dx = 0; dx < s; dx++) {
        const x = o.x + dx, y = o.y + dy;
        if (x >= 0 && y >= 0 && x < N && y < N) m[y * N + x] = o.id;
      }
    }
  }
  return m;
}

/** Zahlender oder abnehmender Kunde? Häuser ohne Kündigung, Großabnehmer mit Vertrag und Wärmebedarf. */
export function istKunde(o: Objekt): boolean {
  const k = KATALOG[o.typ].kategorie;
  return (
    !o.ohne_station && ((k === 'haus' && istAktiv(o) && !o.gekuendigt) ||
    (k === 'gross' && o.zustand === 'vertrag' && !!KATALOG[o.typ].bedarf_kw))
  );
}

export function trassenUebergang(a: Objekt, b: Objekt): boolean | undefined {
  return a.trassenUebergaenge?.[b.id] ?? b.trassenUebergaenge?.[a.id];
}

const NACHBARN: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Zahl der Leitungsfelder rund um (x|y) – gemeinsame Grundlage für „Leitungsende“ (≤ 1) und „durchlaufend“ (≥ 2). */
export function leitungsNachbarn(x: number, y: number, istLeitungsfeld: (feld: number) => boolean): number {
  let z = 0;
  for (const [dx, dy] of NACHBARN) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N && istLeitungsfeld(ny * N + nx)) z++; }
  return z;
}

/**
 * Berechnet das Wärmenetz: Verbindung, Lastfluss, Kapazität, Versorgung, Kosten, Einnahmen.
 * Rein und deterministisch – keine Zeit, kein Zufall, kein Browser.
 * Fachregeln (siehe docs/lastenheft.md A6–A10):
 *  - Versorgt wird nur, wer über eine durchgehende Leitung mit der Heizzentrale verbunden ist.
 *  - Ein Leitungsabschnitt überträgt höchstens seine Nennleistung (Summe der Last dahinter).
 *  - Wird die Leitung Richtung Kunde dünner und danach wieder dicker, ist das ein Planungsfehler.
 *  - Dünner wird sie nur an einem Abzweig (A67), sonst ist das ebenfalls ein Planungsfehler.
 *  - Es wird nie mehr Wärme verteilt als erzeugt (genutzt ≤ verfügbar).
 *  - Einnahmen nur für warme Kunden, Betriebskosten nur für tatsächlich erzeugte Wärme.
 */
export function berechneNetz(objekte: Objekt[], innen: InnenQuelle[], preisstufe: number, vorlauf_c: number = VORLAUF.start_c, grundgebuehr_eur: number = GRUNDGEBUEHR.start_eur): Netz {
  const belegung = belegungskarte(objekte);
  const nachId = new Map(objekte.map((o) => [o.id, o]));
  const hz = heizzentrale(objekte);
  const leitungAn = (k: number): Objekt | null => {
    const o = nachId.get(belegung[k]);
    return o && istLeitung(o.typ) ? o : null;
  };
  const rund = (o: Objekt): Array<[number, number]> => {
    const s = groesse(o);
    const r: Array<[number, number]> = [];
    for (let i = 0; i < s; i++) r.push([o.x + i, o.y - 1], [o.x + i, o.y + s], [o.x - 1, o.y + i], [o.x + s, o.y + i]);
    return r.filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N);
  };

  const verbunden = (a: number, b: number): boolean => {
    const nachbar = leitungAn(b);
    return !!nachbar && trassenUebergang(leitungAn(a)!, nachbar) !== false;
  };

  // Ausbreitung von der Heizzentrale über zusammenhängende Leitungsfelder
  const tiefe = new Map<number, number>();
  const eltern = new Map<number, number>();
  const reihenfolge: number[] = [];
  for (const [x, y] of rund(hz)) {
    const k = y * N + x;
    if (leitungAn(k) && !tiefe.has(k)) { tiefe.set(k, 1); eltern.set(k, -1); reihenfolge.push(k); }
  }
  for (let i = 0; i < reihenfolge.length; i++) {
    const k = reihenfolge[i], x = k % N, y = (k - x) / N;
    for (const [dx, dy] of NACHBARN) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const nk = ny * N + nx;
      if (verbunden(k, nk) && !tiefe.has(nk)) {
        tiefe.set(nk, (tiefe.get(k) as number) + 1);
        eltern.set(nk, k);
        reihenfolge.push(nk);
      }
    }
  }
  const hzFelder = new Set<number>();
  { const s = groesse(hz); for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) hzFelder.add((hz.y + dy) * N + hz.x + dx); }

  // A49: Eine Leitung transportiert bei größerer Spreizung mehr Wärme (Q = m·c·ΔT): Kapazität × Spreizung / Basisspreizung
  const spreizung_faktor = mittlereSpreizung_k(objekte, undefined, vorlauf_c) / SPREIZUNG_BASIS_K;
  const kap_kw = (k: number): number => (KATALOG[(leitungAn(k) as Objekt).typ].kapazitaet_kw as number) * spreizung_faktor;

  // Anschlusspunkt je Gebäude, Durchgang 1: nächstes erreichtes Leitungsfeld (oder direkt an der Heizzentrale)
  const anschluss = new Map<number, { feld: number; tiefe: number }>();
  const kandidaten = new Map<number, number[]>(); // A91: angrenzende erreichte Felder je Kunde ohne eigenes Leitungsende
  for (const o of objekte) {
    const kat = KATALOG[o.typ].kategorie;
    if (!(kat === 'haus' || kat === 'waerme' || kat === 'gross')) continue;
    let best: number | null = null, bd = 1e9, eigenesEnde = false;
    const felder: number[] = [];
    for (const [x, y] of rund(o)) {
      const k = y * N + x;
      if (hzFelder.has(k)) { best = -1; bd = 0; break; }
      const t = tiefe.get(k);
      if (t === undefined) continue;
      // A57: Eine Leitung, die nur am Haus vorbeiläuft, ist kein Anschluss. Bevorzugt wird ein Leitungsende,
      // das am Haus endet (Hausanschluss); nur wenn es keins gibt, zählt die vorbeilaufende Leitung.
      const px = k % N, py = (k - px) / N;
      const nb = leitungsNachbarn(px, py, (f) => verbunden(k, f));
      if (nb <= 1) eigenesEnde = true;
      felder.push(k);
      const wert = (nb <= 1 ? 0 : 1000) + t;
      if (wert < bd) { bd = wert; best = k; }
    }
    if (best !== null) {
      anschluss.set(o.id, { feld: best, tiefe: best === -1 ? 0 : (tiefe.get(best) as number) });
      if (best >= 0 && !eigenesEnde && felder.length >= 2 && istKunde(o)) kandidaten.set(o.id, felder);
    }
    // A24: Ein Pufferspeicher außen ist ohne eigene Leitung mit der Heizzentrale verbunden.
    else if (o.typ === 'puffer') anschluss.set(o.id, { feld: -1, tiefe: 0 });
  }
  const kunden = objekte.filter((o) => istKunde(o) && anschluss.has(o.id));

  // Endprüfung (Kapazität): Last je Feld = eigene Kunden plus alles dahinter im Baum; ok, wenn das Feld und alle Felder
  // davor bis zur Heizzentrale die Last tragen. rest_kw = kleinste freie Kapazität von diesem Feld bis zur Heizzentrale.
  // A91: Dieselbe Funktion entscheidet über Wechsel und Endergebnis – eine Summierreihenfolge, kein Gleitkomma-Widerspruch.
  // Der Baum `el` muss Elternfelder vor ihren Kindern in `reihenfolge` haben (gilt, weil nur zu kleinerer Tiefe umgehängt wird).
  // Achtung: `nachSummieren` im Netzbaum-Block unten summiert die Last in genau derselben Reihenfolge nach – wer hier die
  // Summierung ändert, muss sie dort gleich ändern, sonst entscheidet das Umhängen mit anderen Zahlen als das Endergebnis.
  const endpruefung = (an: ReadonlyMap<number, { feld: number }>, el: ReadonlyMap<number, number>): { ok: Map<number, boolean>; last_kw: Map<number, number>; rest_kw: Map<number, number> } => {
    const last = new Map<number, number>();
    for (const k of reihenfolge) last.set(k, 0);
    for (const o of kunden) {
      const f = (an.get(o.id) as { feld: number }).feld;
      if (f >= 0) last.set(f, (last.get(f) as number) + bedarfKw(o));
    }
    for (let i = reihenfolge.length - 1; i >= 0; i--) {
      const k = reihenfolge[i], p = el.get(k) as number;
      if (p >= 0) last.set(p, (last.get(p) as number) + (last.get(k) as number));
    }
    const ok = new Map<number, boolean>(), rest = new Map<number, number>();
    for (const k of reihenfolge) {
      const p = el.get(k) as number, kap = kap_kw(k), lk = last.get(k) as number;
      ok.set(k, (p < 0 || (ok.get(p) as boolean)) && lk <= kap);
      rest.set(k, p < 0 ? kap - lk : Math.min(rest.get(p) as number, kap - lk));
    }
    return { ok, last_kw: last, rest_kw: rest };
  };

  // A91 Durchgang 2: Ein Kunde ohne eigenes Leitungsende, der an der zuerst gefundenen Leitung wegen Überlast kalt wäre,
  // hängt an einer anderen angrenzenden Leitung, die ihn mit der übrigen Last noch trägt. Wer ein eigenes Leitungsende hat,
  // bleibt daran, auch wenn es zu dünn ist (Spielregel: ein Haus wird über seinen Hausanschluss versorgt).
  const anschlussAlt = new Map(anschluss);
  const pruefungAlt = endpruefung(anschluss, eltern);
  let stand = pruefungAlt, geaendert = false;
  const rang = (k: number): number => LEITUNGSRANG[(leitungAn(k) as Objekt).typ];
  // A67: Ein Feld ist ein Abzweig, wenn mehrere Leitungen dahinter liegen, ein Gebäude dort anschließt oder es eine Vorsehung hat (A69).
  const istAbzweig = (k: number, kinderzahl: number, gebaeude: number): boolean =>
    kinderzahl >= 2 || gebaeude > 0 || !!(leitungAn(k) as Objekt).vorsehung;
  // Aktueller Baum für die Warnprüfung bei Wechsel und Umhängen; wird nach jeder behaltenen Änderung nachgeführt.
  const baum = baumKennzahlen(eltern, anschluss);
  if (kandidaten.size && [...pruefungAlt.ok.values()].includes(false)) {
    for (const id of [...kandidaten.keys()].sort((a, b) => a - b)) {
      const alt = (anschluss.get(id) as { feld: number }).feld;
      if (stand.ok.get(alt)) continue;
      // Kein Wechsel, wenn das alte Feld danach eine neue A67-Warnung bekäme (kein Abzweig mehr, ein Kind ist dünner).
      const kinder = baum.kinder.get(alt) ?? [];
      if (!istAbzweig(alt, kinder.length, (baum.angebunden.get(alt) as number) - 1) && kinder.some((k) => rang(k) < rang(alt))) continue;
      const n = bedarfKw(nachId.get(id) as Objekt);
      const altWeg = new Set<number>();
      for (let f = alt; f >= 0; f = eltern.get(f) as number) altWeg.add(f);
      // Freie Kapazität auf dem Weg des Kandidaten, ohne die eigene Last: Auf dem Stück, das er mit dem alten Weg teilt,
      // ist die eigene Last schon enthalten und wandert nur mit (sonst zählte sie doppelt).
      const restOhne = (k: number): number => {
        let m = Infinity, f = k;
        for (; f >= 0 && !altWeg.has(f); f = eltern.get(f) as number) m = Math.min(m, kap_kw(f) - (stand.last_kw.get(f) as number));
        return f >= 0 ? Math.min(m, (stand.rest_kw.get(f) as number) + n) : m;
      };
      let neu = -1, beste = -Infinity;
      for (const k of kandidaten.get(id) as number[]) {
        if (k === alt) continue;
        const r = restOhne(k);
        if (r >= n && r > beste) { beste = r; neu = k; }
      }
      if (neu < 0) continue;
      // Probehalber umhängen; behalten nur, wenn die Endprüfung selbst das neue Feld trägt.
      anschluss.set(id, { feld: neu, tiefe: tiefe.get(neu) as number });
      const probe = endpruefung(anschluss, eltern);
      if (!probe.ok.get(neu)) { anschluss.set(id, anschlussAlt.get(id) as { feld: number; tiefe: number }); continue; }
      stand = probe; geaendert = true;
      baum.angebunden.set(alt, (baum.angebunden.get(alt) as number) - 1);
      baum.angebunden.set(neu, (baum.angebunden.get(neu) ?? 0) + 1);
    }
  }

  // A91 Netzbaum: Hat die Breitensuche ein Feld über ein dünneres Feld erreicht, hängt es an einem gleich nahen, mindestens
  // so dicken Nachbarn, wenn dessen Weg die Last dahinter noch trägt. Die Fließrichtung ist eine Modellannahme des Spiels;
  // Kapazität, Planungsfehler und Einspeisung werden entlang dieses Baums geprüft. Tiefe und Reihenfolge bleiben.
  if (reihenfolge.some((k) => { const p = eltern.get(k) as number; return p >= 0 && rang(p) < rang(k); })) {
    // Teilbäume, an denen eine Wärmequelle, ein Puffer oder ein Gewerbe hängt, bleiben, wo sie sind: Sonst änderte sich die
    // Einspeisung (V1); schon mehr Wärme kann in der Verteilung ein bisher warmes Haus verdrängen (Bauplan NR15, AE-A91-4).
    const mitQuelle = new Set<number>();
    for (const o of objekte) {
      const a = anschluss.get(o.id);
      if (a && a.feld >= 0 && (KATALOG[o.typ].kategorie === 'waerme' || o.typ === 'gewerbe')) mitQuelle.add(a.feld);
    }
    for (let i = reihenfolge.length - 1; i >= 0; i--) {
      const k = reihenfolge[i], p = eltern.get(k) as number;
      if (p >= 0 && mitQuelle.has(k)) mitQuelle.add(p);
    }
    // Schrittweise Prüfung statt voller Endprüfung je Umhängen (dicht verlegte Netze mit Hunderten Umhängungen rechneten sonst
    // ein Vielfaches): Ein Umhängen ändert die Last nur auf den Wegen über p und q zur Heizzentrale.
    // Diese Felder werden genau so neu summiert wie in der Endprüfung (eigene Kunden, dann Kinder von hinten nach vorn in
    // `reihenfolge`), damit Rest und Tragfähigkeit Bit für Bit dieselben sind wie bei einer vollen Endprüfung.
    const platz = new Map(reihenfolge.map((k, i) => [k, i]));
    const eigen = new Map<number, number>();
    for (const k of reihenfolge) eigen.set(k, 0);
    for (const o of kunden) {
      const fa = (anschluss.get(o.id) as { feld: number }).feld;
      if (fa >= 0) eigen.set(fa, (eigen.get(fa) as number) + bedarfKw(o));
    }
    const last = new Map(stand.last_kw);
    const nachSummieren = (wege: number[]): void => {
      const felder = new Set<number>();
      for (const start of wege) for (let g = start; g >= 0; g = eltern.get(g) as number) felder.add(g);
      for (const g of [...felder].sort((a, b) => (platz.get(b) as number) - (platz.get(a) as number))) {
        let s = eigen.get(g) as number;
        for (const c of [...(baum.kinder.get(g) ?? [])].sort((a, b) => (platz.get(b) as number) - (platz.get(a) as number))) s += last.get(c) as number;
        last.set(g, s);
      }
    };
    const restWeg = (q: number): number => {
      let m = Infinity;
      for (let g = q; g >= 0; g = eltern.get(g) as number) m = Math.min(m, kap_kw(g) - (last.get(g) as number));
      return m;
    };
    const traegtWeg = (q: number): boolean => {
      for (let g = q; g >= 0; g = eltern.get(g) as number) if ((last.get(g) as number) > kap_kw(g)) return false;
      return true;
    };
    let umgehaengt = false;
    for (const k of reihenfolge) {
      const p = eltern.get(k) as number;
      if (p < 0 || rang(p) >= rang(k) || mitQuelle.has(k)) continue;
      // Ohne k wäre p kein Abzweig mehr, und ein verbleibendes Kind ist dünner → neue A67-Warnung an p.
      const ohneK = (baum.kinder.get(p) as number[]).filter((c) => c !== k);
      if (!istAbzweig(p, ohneK.length, baum.angebunden.get(p) ?? 0) && ohneK.some((c) => rang(c) < rang(p))) continue;
      const tk = tiefe.get(k) as number, lastK = last.get(k) as number, x = k % N, y = (k - x) / N;
      let neu = -1, beste = -Infinity;
      for (const [dx, dy] of NACHBARN) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const q = ny * N + nx;
        if (q === p || tiefe.get(q) !== tk - 1 || rang(q) < rang(k)) continue;
        const kinderQ = baum.kinder.get(q) ?? [];
        // k dünner als q und q auch mit k kein Abzweig → neue A67-Warnung an q.
        if (rang(k) < rang(q) && !istAbzweig(q, kinderQ.length + 1, baum.angebunden.get(q) ?? 0)) continue;
        // k so dick wie q und q hat schon einen so dicken Abgang → k käme in eine A76-Warnung an q.
        if (rang(k) === rang(q) && kinderQ.some((c) => rang(c) >= rang(q))) continue;
        // Rest über q auf dem aktuellen Baum, die Last hinter k zählt noch über p mit (vorsichtig gerechnet).
        const r = restWeg(q);
        if (r >= lastK && r > beste) { beste = r; neu = q; }
      }
      if (neu < 0) continue;
      // Probehalber umhängen; behalten nur, wenn der neue Weg die Last trägt.
      const mitP = baum.kinder.get(p) as number[], mitNeu = baum.kinder.get(neu) ?? [];
      eltern.set(k, neu);
      baum.kinder.set(p, ohneK);
      baum.kinder.set(neu, [...mitNeu, k]);
      nachSummieren([p, neu]);
      if (!traegtWeg(neu)) {
        eltern.set(k, p);
        baum.kinder.set(p, mitP);
        baum.kinder.set(neu, mitNeu);
        nachSummieren([p, neu]);
        continue;
      }
      umgehaengt = true;
    }
    // Schlussprüfung über das ganze Netz: Sie liefert das Ergebnis, die schrittweise Rechnung nur die Entscheidungen.
    if (umgehaengt) { stand = endpruefung(anschluss, eltern); geaendert = true; }
  }

  // Last in den Leitungen (Baum von der Heizzentrale aus)
  const last_kw = stand.last_kw;
  const kapazitaet_ok = stand.ok;
  // Fachregel: Dimension in Fließrichtung nur gleich oder kleiner
  const engpass = new Set<number>();
  for (const k of reihenfolge) {
    const p = eltern.get(k) as number;
    if (p >= 0 && LEITUNGSRANG[(leitungAn(k) as Objekt).typ] > LEITUNGSRANG[(leitungAn(p) as Objekt).typ]) {
      engpass.add(k); engpass.add(p);
    }
  }
  // A67 (Simon): Kleiner wird eine Leitung nur an einem Abzweig (T-Stück), nie mitten auf der Strecke.
  // Abzweig = das Feld davor hat mehrere Leitungen dahinter oder ein Gebäude schließt dort seitlich an.
  const endbaum = baumKennzahlen(eltern, anschluss);
  const reduzierung = new Set<number>();
  for (const k of reihenfolge) {
    const p = eltern.get(k) as number;
    if (p < 0 || LEITUNGSRANG[(leitungAn(k) as Objekt).typ] >= LEITUNGSRANG[(leitungAn(p) as Objekt).typ]) continue;
    if (istAbzweig(p, endbaum.kinder.get(p)?.length ?? 0, endbaum.angebunden.get(p) ?? 0)) continue; // A69: T-Stück mit Vorsehung ist ein Abzweig
    reduzierung.add(k); reduzierung.add(p);
  }
  // A76 (Simon): Teilt sich eine Leitung an einem T-Stück, laufen nicht beide Abgänge so dick weiter wie die Zuleitung –
  // dann braucht es eine dickere Zuleitung (z. B. 90er aus der Heizzentrale) oder zwei eigene Abgänge an der Heizzentrale.
  const aufteilung = new Set<number>();
  const gleichDick = new Map<number, number[]>();
  for (const k of reihenfolge) {
    const p = eltern.get(k) as number;
    if (p >= 0 && LEITUNGSRANG[(leitungAn(k) as Objekt).typ] >= LEITUNGSRANG[(leitungAn(p) as Objekt).typ]) gleichDick.set(p, [...(gleichDick.get(p) ?? []), k]);
  }
  for (const [p, kinder] of gleichDick) if (kinder.length >= 2) { aufteilung.add(p); for (const k of kinder) aufteilung.add(k); }

  // Erzeugung. Fachregel V1: Von außen eingespeiste Wärme ist höchstens so groß wie die kleinste
  // Leitungskapazität auf dem Weg zur Heizzentrale. V2: Ein Speicher erzeugt keine Wärme (zählt nur, wenn eine Quelle läuft).
  const wegKapazitaet_kw = (feld: number): number => {
    let kap = Infinity;
    for (let k = feld; k >= 0; k = eltern.get(k) as number) kap = Math.min(kap, (KATALOG[(leitungAn(k) as Objekt).typ].kapazitaet_kw as number) * spreizung_faktor);
    return kap;
  };
  let aussen_kw = 0, strom_kw = 0, speicher_kw = 0;
  for (const o of objekte) {
    const D = KATALOG[o.typ];
    if (D.kategorie === 'waerme' && istAktiv(o) && anschluss.has(o.id)) {
      const weg = wegKapazitaet_kw((anschluss.get(o.id) as { feld: number }).feld);
      if (D.leistung_kw) {
        const kw = Math.min(D.leistung_kw[o.stufe - 1], weg);
        if (o.typ === 'puffer') speicher_kw += kw; else aussen_kw += kw;
      }
      if (D.strom_kw) strom_kw += D.strom_kw[o.stufe - 1];
    }
  }
  if (hz.dach_pv) strom_kw += DACH_PV.kw_je_stufe[hz.stufe - 1] ?? 0; // A36: PV auf dem Heizhaus-Dach
  let abwaerme_kw = 0;
  for (const o of objekte) {
    if (o.typ === 'gewerbe' && o.zustand === 'vertrag' && anschluss.has(o.id))
      abwaerme_kw += Math.min(KATALOG.gewerbe.abwaerme_kw as number, wegKapazitaet_kw((anschluss.get(o.id) as { feld: number }).feld));
  }
  const quellen = innen.filter((k) => istAktiv(k));
  const leistung = (k: InnenQuelle): number => (KATALOG[k.typ].leistung_kw as number[])[k.stufe - 1];
  const innen_kw = quellen.reduce((a, k) => a + leistung(k), 0);
  const ohneSpeicher_kw = aussen_kw + abwaerme_kw + innen_kw;
  if (ohneSpeicher_kw > 0) aussen_kw += speicher_kw;
  const verfuegbar_kw = aussen_kw + abwaerme_kw + innen_kw;

  // Wärme verteilen: nah zuerst, nur wenn die Leitungen reichen. A91 (Variante a): Wer erst durch Anschlusswechsel oder
  // Umhängen warm werden kann (begünstigt), kommt zuletzt – so nimmt er keinem bisher warmen Haus die Wärme weg.
  // Alt geprüft wird auf dem Baum der Breitensuche (pruefungAlt), neu auf dem Endbaum.
  const beguenstigt = new Set<number>();
  if (geaendert) {
    for (const o of kunden) {
      const fa = (anschlussAlt.get(o.id) as { feld: number }).feld, fn = (anschluss.get(o.id) as { feld: number }).feld;
      if (fa >= 0 && !pruefungAlt.ok.get(fa) && fn >= 0 && kapazitaet_ok.get(fn)) beguenstigt.add(o.id);
    }
  }
  const warm = new Set<number>();
  const kalt = new Map<number, 'leitung' | 'waerme' | 'station'>();
  let genutzt_kw = 0, bedarf_kw = 0;
  const geordnet = [...kunden].sort(
    (a, b) => Number(beguenstigt.has(a.id)) - Number(beguenstigt.has(b.id)) ||
      (anschluss.get(a.id) as { tiefe: number }).tiefe - (anschluss.get(b.id) as { tiefe: number }).tiefe || a.id - b.id,
  );
  for (const o of geordnet) {
    const n = bedarfKw(o);
    const a = anschluss.get(o.id) as { feld: number };
    bedarf_kw += n;
    if (a.feld >= 0 && !kapazitaet_ok.get(a.feld)) { kalt.set(o.id, 'leitung'); continue; }
    const st = stationHolen(o.station);
    if (st && !stationReicht(st, o)) { kalt.set(o.id, 'station'); continue; } // A32/NR19: Station zu klein
    if (genutzt_kw + n <= verfuegbar_kw) { genutzt_kw += n; warm.add(o.id); } else kalt.set(o.id, 'waerme');
  }

  // Betriebskosten (Merit-Order: kostenlose Außenanlagen, dann Abwärme, dann günstigste Innenquelle)
  const elektrisch_kw = quellen.filter((k) => KATALOG[k.typ].elektrisch).reduce((a, k) => a + leistung(k), 0);
  const pv_faktor = Math.max(0.25, 1 - strom_kw / Math.max(1, elektrisch_kw));
  const preis = (k: InnenQuelle): number =>
    (KATALOG[k.typ].betriebskosten_eur_je_kw_min as number) * (KATALOG[k.typ].elektrisch ? pv_faktor : 1);
  let rest = Math.max(0, genutzt_kw - aussen_kw);
  let betriebskosten_eur_min = 0;
  const ab = Math.min(rest, abwaerme_kw);
  betriebskosten_eur_min += ab * KONSTANTEN.abwaerme_eur_je_kw_min;
  rest -= ab;
  const laeuft_mit_kw = new Map<InnenQuelle, number>();
  for (const k of [...quellen].sort((a, b) => preis(a) - preis(b))) {
    const h = Math.min(rest, leistung(k));
    rest -= h;
    laeuft_mit_kw.set(k, h);
    betriebskosten_eur_min += h * preis(k);
  }
  // A58: Ein BHKW erzeugt Strom im Verhältnis zur tatsächlich erzeugten Wärme (Kraft-Wärme-Kopplung).
  // Der BHKW-Strom zählt erst nach der Einsatzreihenfolge, damit er seine eigene Laufzeit nicht beeinflusst.
  for (const k of quellen) strom_kw += (laeuft_mit_kw.get(k) ?? 0) * (KATALOG[k.typ].strom_je_waerme ?? 0);
  const einspeisung_kw = Math.max(0, strom_kw - elektrisch_kw);
  // A33: niedrigere Vorlauftemperatur spart Betriebskosten (Pumpen, Netzverluste)
  betriebskosten_eur_min *= Math.max(0.5, 1 - (VORLAUF.start_c - vorlauf_c) * VORLAUF.ersparnis_je_k);
  const P = PREISSTUFEN[preisstufe ?? 2];
  // A81: mittlere Einnahmen je Minute aus der Monatsabrechnung (Jahresverbrauch × Wärmepreis + 12 Grundgebühren, verteilt aufs Spieljahr)
  let einnahmen_eur_a = 0;
  for (const o of objekte) {
    if (!istKunde(o) || !anschluss.has(o.id)) continue;
    einnahmen_eur_a += 12 * grundgebuehr_eur; // Grundgebühr zahlen alle angeschlossenen Kunden mit Station (Review A81 K6)
    if (warm.has(o.id)) einnahmen_eur_a += (KATALOG[o.typ].verbrauch_kwh_a ?? 0) * nutzungsfaktor(o) * P.ct_je_kwh / 100;
  }
  const einnahmen_eur_min = einnahmen_eur_a / (SPIELJAHR_MS / 60_000);
  return {
    tiefe, eltern, reihenfolge, last_kw, kapazitaet_ok, engpass, reduzierung, aufteilung, anschluss, warm, kalt,
    verfuegbar_kw, genutzt_kw, bedarf_kw, betriebskosten_eur_min, einnahmen_eur_min,
    spreizung_faktor, pv_faktor, strom_kw, einspeisung_kw, laeuft_mit_kw, belegung, nachId,
  };
}

/** Faktor auf Bedarf und Einnahmen: Vollversorgung (Kamin aus, A34) und Aufstockung erhöhen beides. */
export function nutzungsfaktor(o: Objekt): number {
  return (o.vollversorgung ? KONSTANTEN.vollversorgung_faktor : 1) * (o.aufgestockt ? KONSTANTEN.aufstockung_faktor : 1);
}
/** A71: Anschlussleistung = Jahresverbrauch ÷ Volllaststunden (2.000 h mit Pufferspeicher im Haus, sonst 1.500 h), mal Nutzung (Kamin aus, aufgestockt). */
export function bedarfKw(o: Objekt): number {
  const D = KATALOG[o.typ];
  const basis = D.verbrauch_kwh_a ? D.verbrauch_kwh_a / (o.hauspuffer ? VOLLLASTSTUNDEN.mit_puffer_h : VOLLLASTSTUNDEN.ohne_puffer_h) : (D.bedarf_kw ?? 0);
  return basis * nutzungsfaktor(o);
}

/**
 * A32/NR19: Schafft die Station das Gebäude? Jede Station muss die Leistung aus dem Netz übergeben. Eine Puffer-Station muss
 * zusätzlich die Spitze im Haus abgeben – das ist die Leistung, die das Haus ohne Puffer aus dem Netz bräuchte.
 */
export function stationReicht(st: Station, o: Objekt): boolean {
  if (st.leistung_kw < bedarfKw(o)) return false;
  return !istPufferStation(st) || st.spitze_kw >= bedarfKw({ ...o, hauspuffer: false });
}

/** NR19: Reicht für das Haus noch eine der Puffer-Stationen? Solange ja, tauscht ein Haus mit Puffer-Station nur gegen eine größere Puffer-Station. */
export function pufferStationReicht(o: Objekt): boolean {
  return PUFFER_STATIONEN.some((st) => stationReicht(st, { ...o, hauspuffer: true }));
}

/** Dorfwert für die Rangliste. */
export function dorfwert(objekte: Objekt[], innen: InnenQuelle[]): number {
  let v = innen.reduce((a, k) => a + k.stufe * 12, 0);
  for (const o of objekte) {
    const D = KATALOG[o.typ];
    if (o.typ === 'hz') v += o.stufe * 60;
    else if (D.bauzeit_s) v += o.stufe * (D.groesse ?? 1) * 8;
    else if (D.kategorie === 'deko') v += 2;
    else if (istLeitung(o.typ)) v += LEITUNGSRANG[o.typ];
    else if (D.kategorie === 'gross' && o.zustand === 'vertrag') v += 40;
  }
  return v;
}

/**
 * A91: Liegt die Überlast eines kalten Hauses ganz in seinem eigenen Hausanschluss? Dann hilft nur ein dickerer
 * Hausanschluss (das Haus wechselt nicht auf eine andere Leitung). Endstück = Anschlussfeld und die Felder davor,
 * solange dort weder ein Abzweig noch ein weiteres Gebäude ist; davor muss die Leitung die Last tragen.
 */
export function eigenerAnschlussZuDuenn(netz: Netz, o: Objekt): boolean {
  const f = netz.anschluss.get(o.id)?.feld;
  if (netz.kalt.get(o.id) !== 'leitung' || f === undefined || f < 0) return false;
  const istLeitungsfeld = (k: number): boolean => { const l = netz.nachId.get(netz.belegung[k]); return !!l && istLeitung(l.typ); };
  if (leitungsNachbarn(f % N, Math.floor(f / N), istLeitungsfeld) > 1) return false;
  const { kinder, angebunden } = baumKennzahlen(netz.eltern, netz.anschluss);
  let t = f;
  for (let p = netz.eltern.get(t) as number; p >= 0 && kinder.get(p)?.length === 1 && !angebunden.has(p); p = netz.eltern.get(t) as number) t = p;
  const s = netz.eltern.get(t) as number;
  return s < 0 || netz.kapazitaet_ok.get(s) === true;
}

/** Grundlage der Abzweig-Regel A67: Kinder je Leitungsfeld im Baum `eltern` und Zahl der Gebäude, die an einem Feld anschließen. */
function baumKennzahlen(eltern: ReadonlyMap<number, number>, anschluss: ReadonlyMap<number, { feld: number }>): { kinder: Map<number, number[]>; angebunden: Map<number, number> } {
  const kinder = new Map<number, number[]>();
  for (const [k, p] of eltern) {
    if (p < 0) continue;
    const liste = kinder.get(p);
    if (liste) liste.push(k); else kinder.set(p, [k]);
  }
  const angebunden = new Map<number, number>();
  for (const a of anschluss.values()) if (a.feld >= 0) angebunden.set(a.feld, (angebunden.get(a.feld) ?? 0) + 1);
  return { kinder, angebunden };
}

export type { TypId };
