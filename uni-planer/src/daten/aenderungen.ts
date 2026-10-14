// Einfacher Änderungszähler: Nach jedem Schreibzugriff `meldeAenderung()` aufrufen,
// Screens laden ihre Daten neu, sobald sich `useDatenVersion()` ändert.

import { useSyncExternalStore } from 'react';

let version = 0;
const hoerer = new Set<() => void>();

export function meldeAenderung(): void {
  version++;
  for (const hoere of hoerer) hoere();
}

function abonniere(hoere: () => void): () => void {
  hoerer.add(hoere);
  return () => hoerer.delete(hoere);
}

export function useDatenVersion(): number {
  return useSyncExternalStore(abonniere, () => version);
}
