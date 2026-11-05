import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Spiel, neuerSpielstand } from '../src/core/spiel';
import type { TypId } from '../src/core/katalog';
import { attrappe, type AttrappenElement } from './hilfen/kontext-attrappe';

// Tester-Nachzug NR15-P1 / NR16-B2a (A91, Bauplan docs/bauplaene/NR15-netzmodell.md „test_a91_alter_hausanschluss_satz_ist_weg“,
// ENTSCHEIDUNGEN 2026-11-05): Die alten Hausanschluss-Sätze „Eine Leitung, die an ein Haus grenzt, ist sein Hausanschluss“
// (Zeichenleiste, src/steuerung.ts) und „Grenzt eine Leitung an ein Haus, ist das sein Hausanschluss“ (Baumenü,
// src/ui/katalog.ts) behaupteten, jede angrenzende Leitung sei der Hausanschluss – nach A91 falsch. Prüfmuster laut Bauplan
// /ist (das )?sein Hausanschluss/; der neue Satz „…, ist es sein Hausanschluss“ darf davon nicht getroffen werden (Selbstprobe).
// Dazu AE-A91-3: kein Text behauptet, Wasser/Wärme suche sich den dicksten Weg. Und die neuen Sätze (lang im Baumenü,
// kurz in der Zeichenleiste) stehen wörtlich so im Spiel, wie ENTSCHEIDUNGEN:130 sie festlegt.

const ALT = /ist (das )?sein Hausanschluss/;
const ALT_1 = 'Eine Leitung, die an ein Haus grenzt, ist sein Hausanschluss';
const ALT_2 = 'Grenzt eine Leitung an ein Haus, ist das sein Hausanschluss';
const NEU_LANG_1 = 'Grenzt eine Leitung an ein Haus, kann es darüber Wärme bekommen – den kurzen Abzweig setzt das Spiel selbst.';
const NEU_LANG_2 = 'Endet ein eigenes Leitungsstück am Haus, ist es sein Hausanschluss; er muss dick genug für das Haus sein.';
const NEU_KURZ = 'Endet eine Leitung an einem Haus, ist es sein Hausanschluss – er muss dick genug für das Haus sein.';
const DICKSTER_WEG = /dicksten Weg/i;

const T0 = 1_000_000_000_000;
const norm = (t: string): string => t.replace(/ /g, ' ');
const lies = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const srcDateien = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = `${dir}/${n}`;
  return statSync(p).isDirectory() ? srcDateien(p) : /\.(ts|html|json|webmanifest)$/.test(p) ? [p] : [];
});

const neu = (stufe = 1) => {
  const s = new Spiel(neuerSpielstand(T0), () => T0);
  s.ersteQuelleWaehlen('kessel');
  s.hz.stufe = stufe;
  s.stand.geld_eur = 1_000_000;
  s.neuBerechnen();
  return s;
};

/** Oberflächen-Module frisch mit der DOM-Attrappe laden (Muster tests/a92-sperre.test.ts); das Seitenblatt ist ein Kasten. */
async function mitAttrappe(arbeit: (a: ReturnType<typeof attrappe>, blatt: { inhalt: AttrappenElement }) => Promise<void>): Promise<void> {
  const a = attrappe();
  Object.defineProperty(a.El.prototype, 'classList', {
    get(this: AttrappenElement) {
      const liste = () => this.className.split(' ').filter(Boolean);
      return { add: (k: string) => { if (!liste().includes(k)) this.className = [...liste(), k].join(' '); }, remove: (k: string) => { this.className = liste().filter((x) => x !== k).join(' '); }, contains: (k: string) => liste().includes(k), toggle: () => false };
    },
    configurable: true,
  });
  Object.defineProperty(a.El.prototype, 'textContent', {
    get(this: AttrappenElement) { return a.text(this); },
    set(this: AttrappenElement, v: string) { this.kinder = [{ text: v }]; },
    configurable: true,
  });
  Object.assign(a.doc, { body: new a.El('body'), getElementById: () => null });
  const blatt = { inhalt: new a.El('div'), zu: () => {} };
  vi.resetModules();
  vi.stubGlobal('document', a.doc); vi.stubGlobal('DOMParser', a.Parser);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  const matchMedia = (q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal('matchMedia', matchMedia);
  vi.stubGlobal('window', { matchMedia, setTimeout, clearTimeout, devicePixelRatio: 1 });
  vi.doMock('../src/ui/blatt', () => ({ blattOeffnen: () => blatt, blattOffen: () => false }));
  vi.doMock('../src/ui/bild', () => ({ katalogBild: () => new a.El('canvas') }));
  vi.doMock('../src/ui/toast', () => ({ toast: () => {}, hinweisMitKnopf: () => {} }));
  vi.doMock('../src/ui/sprecher', () => ({ sprecherZeigen: () => {} }));
  try { await arbeit(a, blatt); } finally {
    vi.unstubAllGlobals();
    for (const m of ['../src/ui/blatt', '../src/ui/bild', '../src/ui/toast', '../src/ui/sprecher']) vi.doUnmock(m);
  }
}

describe('A91 – alter Hausanschluss-Satz ist weg (Bauplan NR15 P1, ENTSCHEIDUNGEN 2026-11-05)', () => {
  it('A91 Selbstprobe: das Prüfmuster trifft beide alten Sätze, aber keinen der neuen', () => {
    expect(ALT.test(ALT_1)).toBe(true);
    expect(ALT.test(ALT_2)).toBe(true);
    expect(ALT.test(NEU_LANG_2)).toBe(false);
    expect(ALT.test(NEU_KURZ)).toBe(false);
    expect(DICKSTER_WEG.test('Wasser sucht sich den dicksten Weg.')).toBe(true);
  });

  it('test_a91_alter_hausanschluss_satz_ist_weg: steuerung.ts und katalog.ts enthalten keinen alten Satz', () => {
    for (const datei of ['src/steuerung.ts', 'src/ui/katalog.ts']) {
      const q = lies(datei);
      expect(q, datei).not.toMatch(ALT);
      expect(q, datei).not.toContain(ALT_1);
      expect(q, datei).not.toContain(ALT_2);
    }
  });

  it('A91: im ganzen Spiel (src/, index.html) steht kein alter Hausanschluss-Satz und nichts vom „dicksten Weg“ (AE-A91-3)', () => {
    const dateien = [...srcDateien(new URL('../src', import.meta.url).pathname), new URL('../index.html', import.meta.url).pathname];
    expect(dateien.length).toBeGreaterThan(10);
    for (const p of dateien) {
      const q = readFileSync(p, 'utf8');
      expect(q, p).not.toMatch(ALT);
      expect(q, p).not.toMatch(DICKSTER_WEG);
    }
  });

  it('A91: Zeichenleiste (Leitung einzeichnen) zeigt den neuen kurzen Satz, keinen alten', async () => {
    await mitAttrappe(async (a, blatt) => {
      const { Steuerung } = await import('../src/steuerung');
      const s = neu(1);
      s.stand.abschnitt = { phase: 'offen', bau: null };
      const st = Object.assign(Object.create(Steuerung.prototype), { spiel: s, katalogUi: { schliessen: () => {} }, kontextUi: { schliessen: () => {} }, modusBlatt: null, vorsehen: false });
      (st as { stempeln: (t: TypId) => void }).stempeln('d25');
      const t = norm(a.text(blatt.inhalt));
      expect(t).toContain(NEU_KURZ);
      expect(t).not.toMatch(ALT);
    });
  });

  it('A91: Baumenü „Leitungen“ mit offenem Abschnitt zeigt beide neuen langen Sätze, keinen alten', async () => {
    await mitAttrappe(async (a, blatt) => {
      const { Katalog } = await import('../src/ui/katalog');
      const s = neu(2);
      s.stand.abschnitt = { phase: 'offen', bau: null };
      const ui = { spiel: s, jetzt_ms: () => T0, geaendert: () => {}, stempeln: () => {}, toast: () => {}, katalog: () => {}, verschieben: () => {} };
      new Katalog(ui as unknown as ConstructorParameters<typeof Katalog>[0]).oeffnen('netz');
      const t = norm(a.text(blatt.inhalt));
      expect(t).toContain(NEU_LANG_1);
      expect(t).toContain(NEU_LANG_2);
      expect(t).not.toMatch(ALT);
    });
  });
});
