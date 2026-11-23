import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

// NR27 P5a4 – Nachträge aus dem P5a-Review: Tippfläche des Chips, Fokus beim Tippen aufs Abdunkeln der Erklärkarte und
// eine einzige Stelle für den Zuschlag-Text. Fachtext-Schalter nur hier im Test (Muster tests/nr27-p5a3-ui.test.ts).
const schalter = vi.hoisted(() => ({ frei: false }));
vi.mock('../src/core/nord-texte', async (orig) => {
  const echt = await orig<typeof import('../src/core/nord-texte')>();
  return { ...echt, nordText: (id: Parameters<typeof echt.nordText>[0], werte?: Record<string, string | number>, frei?: boolean) => echt.nordText(id, werte, frei ?? schalter.frei) };
});

import tokens from '../design/tokens.json';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import { querungZuschlagText } from '../src/ui/sperrtexte';
import { echteSteuerung, tippe } from './hilfen/echte-steuerung';

const T0 = 1_700_000_000_000;
const norm = (s: string): string => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const lies = (p: string): string => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const regeln = (css: string, selektor: string): string => {
  const esc = selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|[}\\s,])${esc}\\{([^}]*)\\}`, 'gm'))].map((m) => m[1]).join(';');
};
function spiel(stufe: number): Spiel {
  const st = neuerSpielstand(T0);
  st.objekte.find((o) => o.typ === 'hz')!.stufe = stufe;
  st.geld_eur = 10_000_000; st.taler = 10_000;
  st.abschnitt = { phase: 'offen', bau: null };
  const sp = new Spiel(st, () => T0);
  sp.neuBerechnen();
  sp.ereignisse.splice(0);
  return sp;
}

describe('NR27 P5a4 Review-Nachträge', () => {
  // Fix-Runde NR27 (Designer-Treue M1): „+ Bahnquerung“ ist kein eigener Chip mehr, sondern zweite Zeile im Knopf „Abschnitt
  // abschließen“; die Tippfläche ist damit die des Abschlussknopfs.
  // Fehler, der ihn rot macht: Höhe des Abschlussknopfs nicht mehr aus dem Token, oder das Token fällt unter 44 px.
  it('Knopf „Abschnitt abschließen“ (trägt „+ Bahnquerung“) mindestens 44 px hoch', () => {
    const r = regeln(lies('src/ui/stil.css'), '.aktionsleiste .knopf');
    expect(r).toMatch(/(?:^|;)height:var\(--menue-mass-px-zeichen-abschluss-hoehe\)/);
    expect(tokens.menue.mass_px.zeichen_abschluss_hoehe).toBeGreaterThanOrEqual(44);
  });

  // Fehler, die ihn rot machen: Tippen aufs Abdunkeln lässt den Fokus außerhalb des Popups (im Browser fällt er auf body),
  // oder schließt dabei auch den Katalog darunter.
  it('Tippen aufs Abdunkeln der Erklärkarte holt den Fokus zurück ins Popup', async () => {
    schalter.frei = true;
    await echteSteuerung(spiel(6), (u) => {
      u.st.katalog('netz');
      const info = u.dom.html.querySelectorAll('[data-ziel="bahn_info"]')[0];
      tippe(info);
      const ebene = u.dom.html.querySelector('#bahn-karte')!;
      info.focus(); // wie der Browser: Fokus ist nicht mehr im Popup
      tippe(ebene.querySelector('.abdunkeln')!);
      const verstanden = ebene.querySelectorAll('button').find((k) => norm(k.textContent) === 'Verstanden');
      expect(u.dom.doc.activeElement === verstanden, 'Fokus auf [Verstanden]').toBe(true);
      expect(u.dom.html.querySelector('[data-ziel="kasten_abschnitt"]')?.isConnected, 'Katalog bleibt offen').toBe(true);
    });
  });

  // Fehler, die ihn rot machen: falsche Formel (ohne bauzeit_faktor: 24 Min.), oder der Ausdruck steht wieder doppelt.
  it('Zuschlag-Text an einer Stelle: 1440 s × 2,5 = 3600 s → „1 Std.“', () => {
    expect(querungZuschlagText()).toBe('1 Std.');
    expect(lies('src/ui/bahn-karte.ts')).not.toContain('querung_bau_s');
    expect(lies('src/ui/sperrtexte.ts').match(/querung_bau_s/g)?.length).toBe(1);
  });
});
