/**
 * Vorführ-Tempo: Die Spieluhr läuft auf Wunsch schneller als die echte Uhr (×1, ×10, ×60).
 * Der Spielkern kennt nur die Uhr, die ihm übergeben wird – er bleibt unverändert und testbar.
 * Gespeichert wird der Abstand zur echten Uhr; Zeit bei geschlossenem oder verborgenem Spiel läuft normal weiter.
 */
const SCHLUESSEL = 'waermedorf-tempo-v1';
export const TEMPO_STUFEN: ReadonlyArray<{ faktor: number; name: string }> = [
  { faktor: 1, name: 'Normal' }, { faktor: 10, name: 'Schnell ×10' }, { faktor: 60, name: 'Vorführung ×60' },
];

let faktor = 1;
let virtuell = Date.now();
let letztReal = virtuell;
/** Ist das Fenster nicht sichtbar, läuft die Zeit nur normal (kein Vorführ-Tempo im Hintergrund). */
let verborgen = false;

try {
  const g = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? '{}') as { faktor?: number; offset_ms?: number };
  if (typeof g.offset_ms === 'number' && Number.isFinite(g.offset_ms)) virtuell = Date.now() + Math.max(0, g.offset_ms);
  if (g.faktor && TEMPO_STUFEN.some((t) => t.faktor === g.faktor)) faktor = g.faktor;
} catch (fehler) { console.warn('Tempo nicht lesbar, Normal gilt', fehler); }
letztReal = Date.now();

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { uhr(); verborgen = document.hidden; });

/** Aktuelle Spielzeit in ms. */
export function uhr(): number {
  const r = Date.now();
  virtuell += Math.max(0, r - letztReal) * (verborgen ? 1 : faktor); letztReal = r;
  return virtuell;
}
export function tempo(): number { return faktor; }
export function tempoSpeichern(): void {
  uhr();
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify({ faktor, offset_ms: virtuell - Date.now() })); } catch (fehler) { console.warn('Tempo ließ sich nicht speichern', fehler); }
}
export function tempoSetzen(f: number): void {
  if (!TEMPO_STUFEN.some((t) => t.faktor === f)) return;
  uhr(); faktor = f; tempoSpeichern();
}
