// Erscheinungsbild der App: wie das System, immer hell oder immer dunkel (Einstellungen → Darstellung).
// Gespeichert in der Datenbank (`ladeErscheinungsbild`), hier der aktuelle Wert für die Oberfläche.

import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

export type Erscheinungsbild = 'system' | 'hell' | 'dunkel';

export const ERSCHEINUNGSBILDER: readonly Erscheinungsbild[] = ['system', 'hell', 'dunkel'];

const NATIV = { system: 'unspecified', hell: 'light', dunkel: 'dark' } as const;

let aktuell: Erscheinungsbild = 'system';
const hoerer = new Set<() => void>();

/**
 * Setzt das Erscheinungsbild für die ganze App. Auch native Teile wie Systemdialoge und der
 * Datumswähler folgen, soweit die Plattform das kann (im Browser nicht).
 */
export function setzeErscheinungsbild(wert: Erscheinungsbild): void {
  if (typeof Appearance.setColorScheme === 'function') Appearance.setColorScheme(NATIV[wert]);
  if (wert === aktuell) return;
  aktuell = wert;
  for (const hoere of hoerer) hoere();
}

function abonniere(hoere: () => void): () => void {
  hoerer.add(hoere);
  return () => hoerer.delete(hoere);
}

export function useErscheinungsbild(): Erscheinungsbild {
  return useSyncExternalStore(abonniere, () => aktuell);
}
