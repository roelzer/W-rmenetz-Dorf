/**
 * Philis 9. Geburtstag (Simon, Entwurf docs/entwuerfe/geburtstagsschild-entwurf.html): Das Schild erscheint nur am 26.11.2026.
 * Maßgeblich ist der Kalendertag in der Ortszeit des Geräts, darum getFullYear/getMonth/getDate statt der UTC-Varianten.
 * Das Datum kommt von außen, damit der Kern keine Uhr liest und die Mitternachtsränder testbar bleiben.
 */
export function geburtstagsschildAktiv(datum: Date): boolean {
  // getMonth zählt ab 0: November = 10. Ein ungültiges Datum liefert NaN und ist damit nie gleich.
  return datum.getFullYear() === 2026 && datum.getMonth() === 10 && datum.getDate() === 26;
}
