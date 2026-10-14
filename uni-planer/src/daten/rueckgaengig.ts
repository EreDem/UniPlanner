// Meldung mit „Rückgängig“-Aktion für die Leiste am unteren Rand.
// Sie verschwindet nach ein paar Sekunden; eine neue Meldung ersetzt die alte.

import { useSyncExternalStore } from 'react';

export const ANZEIGEDAUER_MS = 5000;

export interface RueckgaengigMeldung {
  id: number;
  text: string;
  rueckgaengig: () => Promise<void>;
}

let aktuell: RueckgaengigMeldung | null = null;
let naechsteId = 1;
let timer: ReturnType<typeof setTimeout> | null = null;
const hoerer = new Set<() => void>();

function setze(meldung: RueckgaengigMeldung | null): void {
  aktuell = meldung;
  for (const hoere of hoerer) hoere();
}

export function zeigeRueckgaengig(text: string, rueckgaengig: () => Promise<void>): void {
  if (timer) clearTimeout(timer);
  setze({ id: naechsteId++, text, rueckgaengig });
  timer = setTimeout(schliesseRueckgaengig, ANZEIGEDAUER_MS);
}

export function schliesseRueckgaengig(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  setze(null);
}

function abonniere(hoere: () => void): () => void {
  hoerer.add(hoere);
  return () => hoerer.delete(hoere);
}

export function useRueckgaengig(): RueckgaengigMeldung | null {
  return useSyncExternalStore(abonniere, () => aktuell);
}
