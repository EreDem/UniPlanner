import { ImportFehler } from './abruf';

/**
 * Nur im Entwicklungsmodus: die anonymisierte Fixture als .ics-Text.
 * Der `require` steht im `__DEV__`-Zweig, damit Metro die Datei im Release-Build weglässt.
 */
export function ladeBeispielIcs(): string {
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- import würde die Datei immer bündeln
    return require('../../test/fixtures/beispiel.ics') as string;
  }
  throw new ImportFehler('Beispieldaten gibt es nur im Entwicklungsmodus.');
}
