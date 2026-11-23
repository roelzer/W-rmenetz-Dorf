// NR27 Tester-Vorarbeit V2 (Bauplan docs/bauplaene/NR27-bahnquerung-entwurf.md, Abschnitt 5 „Vorarbeit“, Q1/AE-NR27-7):
// Zwei eingefrorene Spielstände vom Stand vor P1 (tests/referenz/nr27/) laden heute mit Befund `ok` und bleiben dabei
// unverändert. Die Dateien werden nie neu erzeugt – sie sind das Orakel für „alte Spielstände bleiben gültig“.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KONSTANTEN } from '../src/core/katalog';
import { Spiel } from '../src/core/spiel';
import { ladenMitBefund } from '../src/core/speichern';
import type { Spielstand } from '../src/core/typen';

const N = KONSTANTEN.feldanzahl;
const ORDNER = new URL('./referenz/nr27/', import.meta.url);
const lesen = (datei: string): string => readFileSync(new URL(datei, ORDNER), 'utf8');
const istLeitungsTyp = (typ: string): boolean => /^d\d+$/.test(typ);

describe.each(['altstand-stufe6-layout3.json', 'altstand-mitten-im-bau.json'])('NR27 V2 %s', (datei) => {
  const text = lesen(datei);
  const roh = JSON.parse(text) as Spielstand;

  it('test_nr27_v2_laedt_mit_befund_ok', () => {
    expect(ladenMitBefund(text, roh.zuletzt_ms).befund).toBe('ok');
  });

  it('test_nr27_v2_objekte_und_schluessel_unveraendert', () => {
    const { stand } = ladenMitBefund(text, roh.zuletzt_ms);
    expect(Object.keys(stand).sort()).toEqual(Object.keys(roh).sort());
    expect(stand.objekte).toEqual(roh.objekte);
    expect(stand.gestattungen).toEqual(roh.gestattungen);
    expect(stand.neubau_strassenluecken).toEqual(roh.neubau_strassenluecken);
    expect(stand.abschnitt).toEqual(roh.abschnitt);
    expect(stand.naechste_id).toBe(roh.naechste_id);
  });

  it('test_nr27_v2_spiel_aendert_beim_start_keine_objekte', () => {
    const { stand } = ladenMitBefund(text, roh.zuletzt_ms);
    const spiel = new Spiel(stand, () => roh.zuletzt_ms);
    expect(spiel.stand.objekte).toEqual(roh.objekte);
    expect(spiel.stand.objekte.every((o) => o.y >= 0)).toBe(true);
  });
});

describe('NR27 V2 Inhalt der eingefrorenen Stände (was sie absichern sollen)', () => {
  it('test_nr27_v2_stufe6_layout3_hat_neubaugebiet_gestattungen_luecke_und_leitung_bis_nordrand', () => {
    const { stand } = ladenMitBefund(lesen('altstand-stufe6-layout3.json'), 0);
    expect(stand.objekte.find((o) => o.typ === 'hz')?.stufe).toBe(6);
    expect(stand.neubaugebiet).toBe(true);
    expect(stand.neubaugebiet_layout).toBe(3);
    // erzeugt: Leitungsfelder (9|0) und (8|0) abseits der Straße; Haus mit Station blieb beim Umzug auf (8|27) stehen
    expect(stand.gestattungen).toEqual(expect.arrayContaining([0 * N + 9, 0 * N + 8]));
    expect(stand.neubau_strassenluecken).toEqual([27 * N + 8]);
    expect(stand.objekte.some((o) => istLeitungsTyp(o.typ) && o.x === 10 && o.y === 0 && !o.geplant)).toBe(true);
    expect('nordviertel' in stand).toBe(false);
    expect(stand.abschnitt).toBeUndefined();
    // Die gebaute Leitung am Nordrand gehört zum Netz (Schlüssel 0 * N + 10)
    const spiel = new Spiel(stand, () => stand.zuletzt_ms);
    expect(spiel.netz.tiefe.has(0 * N + 10)).toBe(true);
  });

  it('test_nr27_v2_mitten_im_bau_hat_laufenden_abschnitt_geplante_leitungen_und_hausausbau', () => {
    const { stand } = ladenMitBefund(lesen('altstand-mitten-im-bau.json'), 0);
    const a = stand.abschnitt!;
    expect(a.phase).toBe('bau');
    expect(a.bau!.start_ms).toBeLessThan(stand.zuletzt_ms);
    expect(a.bau!.ende_ms).toBeGreaterThan(stand.zuletzt_ms);
    expect('mit_querung' in a).toBe(false);
    expect(stand.objekte.filter((o) => o.geplant && istLeitungsTyp(o.typ))).toHaveLength(4);
    const ausbau = stand.objekte.filter((o) => o.upgrade_auftrag);
    expect(ausbau).toHaveLength(1);
    expect(ausbau[0].upgrade_auftrag!.ende_ms).toBeGreaterThan(stand.zuletzt_ms);
  });
});
