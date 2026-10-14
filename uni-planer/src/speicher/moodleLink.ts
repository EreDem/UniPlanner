// Die Moodle-Kalender-URL enthält einen Zugangstoken und liegt nur im Secure Store.
// Nie loggen, nie vollständig anzeigen.

import * as SecureStore from 'expo-secure-store';

const SCHLUESSEL = 'moodle_kalender_url';

export function ladeMoodleLink(): Promise<string | null> {
  return SecureStore.getItemAsync(SCHLUESSEL);
}

export function speichereMoodleLink(url: string): Promise<void> {
  return SecureStore.setItemAsync(SCHLUESSEL, url);
}

export function loescheMoodleLink(): Promise<void> {
  return SecureStore.deleteItemAsync(SCHLUESSEL);
}

/** Nur die Domain, z. B. `moodle.rwth-aachen.de`, zur Anzeige. */
export function domainVon(url: string): string | null {
  return /^https:\/\/(?:[^@/?#]*@)?([^/?#:]+)/i.exec(url)?.[1] ?? null;
}
