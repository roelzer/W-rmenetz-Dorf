import { expect, it } from 'vitest';
import { laden, serialisieren } from '../src/core/speichern';
import { neuerSpielstand, Spiel } from '../src/core/spiel';
import type { Objekt } from '../src/core/typen';
import { echteSteuerung } from './hilfen/echte-steuerung';

function vorbereiten() {
  let jetzt = 1_000_000;
  const stand = neuerSpielstand(jetzt);
  const hz = stand.objekte.find((o) => o.typ === 'hz')!;
  const saegewerk = stand.objekte.find((o) => o.typ === 'gewerbe')!;
  hz.stufe = 2;
  saegewerk.x = 16;
  saegewerk.y = 10;
  const bestand: Objekt = { id: stand.naechste_id++, typ: 'd50', x: 13, y: 10, stufe: 1, bau: null, kasse_eur: 0 };
  stand.objekte = [hz, saegewerk, bestand];
  stand.geld_eur = 1_000_000;
  stand.abschnitt = { phase: 'offen', bau: null };
  const spiel = new Spiel(stand, () => jetzt);
  expect(spiel.platzieren('d50', 14, 10).ok).toBe(true);
  const neu = stand.objekte.at(-1)!;
  expect(spiel.platzieren('d50', 15, 10).ok).toBe(true);
  expect(spiel.vertragUnterschreiben(saegewerk.id).ok).toBe(true);
  const bauen = (s: Spiel) => {
    expect(s.abschnittAbschliessen().ok).toBe(true);
    expect(s.materialBestellen().ok).toBe(true);
    jetzt = s.abschnitt!.bau!.ende_ms;
    s.bis(jetzt);
  };
  const neuLaden = (s: Spiel) => new Spiel(laden(serialisieren(s.stand), jetzt), () => jetzt);
  return { spiel, bestand, neu, saegewerk, bauen, neuLaden };
}

it('verbindet eine gebaute Sägewerkstrasse erst nach manueller Freigabe mit dem Bestandsnetz', () => {
  const { spiel, bestand, neu, saegewerk, bauen, neuLaden } = vorbereiten();
  bauen(spiel);
  const geladen = neuLaden(spiel);
  expect(geladen.netz.anschluss.has(saegewerk.id)).toBe(false);
  expect(geladen.netz.verfuegbar_kw).toBe(60);
  expect(geladen.trassenUmschalten(bestand.id, neu.id).ok).toBe(true);
  expect(geladen.netz.anschluss.has(saegewerk.id)).toBe(true);
  expect(geladen.netz.verfuegbar_kw).toBe(120);
  expect(neuLaden(geladen).netz.anschluss.has(saegewerk.id)).toBe(true);
});

it('speichert den geplanten Übergang, aktiviert ihn aber erst beim Bauende', () => {
  const { spiel, bestand, neu, saegewerk, bauen, neuLaden } = vorbereiten();
  expect(spiel.trassenUmschalten(neu.id, bestand.id).ok).toBe(true);
  expect(spiel.trassenUmschalten(neu.id, bestand.id).ok).toBe(true);
  expect(spiel.trassenNachbarn(neu)[0].verbunden).toBe(false);
  expect(spiel.trassenUmschalten(neu.id, bestand.id).ok).toBe(true);
  const geladen = neuLaden(spiel);
  expect(geladen.netz.anschluss.has(saegewerk.id)).toBe(false);
  bauen(geladen);
  expect(geladen.netz.anschluss.has(saegewerk.id)).toBe(true);
});


it('bietet im Sägewerk mit bereits unterschriebenem Vertrag den fehlenden Übergang an', async () => {
  const { spiel, saegewerk, bauen, neuLaden } = vorbereiten();
  bauen(spiel);
  const geladen = neuLaden(spiel);

  await echteSteuerung(geladen, ({ st, dom, knoepfe }) => {
    st.kontext(saegewerk.id);
    const text = () => dom.app.querySelector('.blatt .inhalt')!.textContent;
    expect(text()).toContain('Vertrag läuft');
    expect(text()).toContain('Übergang bei (14|10)');
    expect(text()).not.toContain('Vertrag unterschreiben');
    const verbinden = knoepfe().find((knopf) => knopf.textContent === 'Mit Wärmenetz verbinden');
    expect(verbinden).toBeDefined();
    verbinden!.click();

    expect(geladen.netz.anschluss.has(saegewerk.id)).toBe(true);
    expect(geladen.netz.verfuegbar_kw).toBe(120);
    expect(geladen.objekt(saegewerk.id)?.zustand).toBe('vertrag');
    expect(text()).toContain('Abwärme ins Netz');
  });
});

it('unterscheidet ein geplantes Rohr an der Gebäudekante von einem Rohr, das nur diagonal danebenliegt', () => {
  const { spiel, saegewerk } = vorbereiten();
  const rohr = spiel.saegewerkTrasse(saegewerk).rohr!;
  expect(rohr.geplant).toBe(true);
  expect(spiel.saegewerkTrasse(saegewerk).uebergang).toBeUndefined();

  rohr.y--;
  expect(spiel.saegewerkTrasse(saegewerk)).toEqual({ rohr: undefined });
});

function leererAbschnitt(): Spiel {
  const jetzt = 1_000_000;
  const stand = neuerSpielstand(jetzt);
  stand.objekte = stand.objekte.filter((o) => o.typ === 'hz');
  stand.abschnitt = { phase: 'offen', bau: null };
  return new Spiel(stand, () => jetzt);
}

it('verhindert einen Ring beim Zeichnen, erlaubt aber einen Abzweig', () => {
  const spiel = leererAbschnitt();
  for (const [x, y] of [[3, 3], [4, 3], [4, 4]]) expect(spiel.platzieren('d25', x, y).ok).toBe(true);
  const vorher = serialisieren(spiel.stand);
  expect(spiel.platzieren('d25', 3, 4)).toMatchObject({ ok: false, hinweis: expect.stringContaining('Ringschluss') });
  expect(serialisieren(spiel.stand)).toBe(vorher);
  expect(spiel.platzieren('d25', 5, 3).ok).toBe(true);
});

it('verhindert einen Ring beim manuellen Zusammenschluss zweier Trassen', () => {
  const spiel = leererAbschnitt();
  for (const [x, y] of [[3, 3], [4, 3], [4, 4]]) {
    expect(spiel.platzieren('d25', x, y).ok).toBe(true);
    delete spiel.stand.objekte.at(-1)!.geplant;
  }
  const rohre = spiel.stand.objekte.slice(1);
  for (const rohr of rohre) delete rohr.trassenUebergaenge;
  expect(spiel.platzieren('d25', 3, 4).ok).toBe(true);
  const neu = spiel.stand.objekte.at(-1)!;
  expect(spiel.trassenUmschalten(neu.id, rohre[0].id).ok).toBe(true);
  expect(spiel.trassenUmschalten(neu.id, rohre[2].id)).toMatchObject({ ok: false, hinweis: expect.stringContaining('Ringschluss') });
  expect(spiel.trassenNachbarn(neu).find(({ nachbar }) => nachbar === rohre[2])?.verbunden).toBe(false);
});

it('verhindert die Rückführung zum Heizhaus und erlaubt separate Abgänge', () => {
  const spiel = leererAbschnitt();
  for (const [x, y] of [[10, 10], [10, 11], [10, 12]]) expect(spiel.platzieren('d25', x, y).ok).toBe(true);
  expect(spiel.platzieren('d25', 11, 12)).toMatchObject({ ok: false, hinweis: expect.stringContaining('Ringschluss') });
  expect(spiel.platzieren('d25', 12, 12).ok).toBe(true);
});
