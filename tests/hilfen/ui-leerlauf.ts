// Gemeinsame Testhilfe (Tester-Vorarbeit V1 zu NR13, Bauplan docs/bauplaene/NR13-tutorial.md §3a Teil C):
// Ersatz-Oberflächen in Tests bauen nur einen Teil von `Ui` nach. Ab NR13 rufen Baumenü (Katalog) und Hausblatt
// (Kontext) zusätzlich `tutorialMelden` und `tutorialSperreKnopf` auf. Diese Leerlauf-Fassung meldet nichts und
// sperrt keinen Knopf (null = keine Tutorial-Sperre), damit sich das bisher geprüfte Verhalten nicht ändert.
// Einbau per Objekt-Spread am Anfang der Ersatz-Oberfläche: `{ ...UI_LEERLAUF, spiel: s, … }`.
export const UI_LEERLAUF = {
  tutorialMelden: (): void => {},
  tutorialSperreKnopf: (): null => null,
};
