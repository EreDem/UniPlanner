// Eigene Angaben des Nutzers zu einem Event: kurze Notiz und (bei Abgaben) Punkte.
// Rein, ohne Expo-Abhängigkeiten. Punkte werden als Zahl gespeichert, damit sie sich später
// auswerten lassen (z. B. Summe oder Anteil pro Modul).

export const MAX_NOTIZ_ZEICHEN = 50;

/** Größte erlaubte Punktzahl, schützt vor Tippfehlern wie „755“ statt „7,5“ nicht, aber vor Unsinn. */
const MAX_PUNKTE = 10_000;

export interface Punkte {
  erreicht: number | null;
  max: number | null;
}

/** Liest „7“, „7,5“ oder „7.5“ (höchstens zwei Nachkommastellen). Leer → `null`, ungültig → `undefined`. */
export function lesePunkte(eingabe: string): number | null | undefined {
  const text = eingabe.trim();
  if (text === '') return null;
  if (!/^\d+([.,]\d{1,2})?$/.test(text)) return undefined;
  const wert = Number(text.replace(',', '.'));
  return wert <= MAX_PUNKTE ? wert : undefined;
}

/** Prüft beide Felder. Gibt die Punkte oder eine Fehlermeldung für den Nutzer zurück. */
export function pruefePunkte(erreicht: string, max: string): Punkte | { fehler: string } {
  const e = lesePunkte(erreicht);
  const m = lesePunkte(max);
  if (e === undefined || m === undefined) return { fehler: 'Bitte nur Zahlen eingeben, z. B. 7,5.' };
  if (m === 0) return { fehler: 'Die maximale Punktzahl muss größer als 0 sein.' };
  // Mehr als die Maximalpunktzahl ist erlaubt (Bonuspunkte).
  return { erreicht: e, max: m };
}

/** 7.5 → „7,5“, `null` → „“. */
export function formatierePunkte(wert: number | null): string {
  return wert === null ? '' : String(wert).replace('.', ',');
}
