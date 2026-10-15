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

const STANDARD_MOODLE_DOMAIN = 'moodle.rwth-aachen.de';

/**
 * Startseite des eigenen Moodle (Knopf „Zu Moodle“). Nur die Domain des gespeicherten Links,
 * nie der Link selbst mit Token. Ohne Link (z. B. Beispieldaten) RWTHmoodle.
 */
export function moodleStartseite(domain: string | null): string {
  const sauber = domain && /^[a-z0-9.-]+$/i.test(domain) ? domain : STANDARD_MOODLE_DOMAIN;
  return `https://${sauber}/`;
}
