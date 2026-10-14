// Eigene Angaben des Nutzers zu einem Event: kurze Notiz und (bei Abgaben) Punkte.
// Rein, ohne Expo-Abhängigkeiten. Punkte werden als Zahl gespeichert, damit sie sich später
// auswerten lassen (z. B. Summe oder Anteil pro Modul).

export const MAX_NOTIZ_ZEICHEN = 50;

/** Eigene Angaben pro Modul als freier Text. */
export interface ModulAngaben {
  klausurtermine: string | null;
  zulassungskriterien: string | null;
}

export type ModulAngabe = keyof ModulAngaben;

export const MAX_MODUL_ANGABE_ZEICHEN = 100;

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

export interface PunkteSumme {
  erreicht: number;
  max: number;
  /** Anteil in Prozent (eine Nachkommastelle), `null` ohne bewertete Abgaben. */
  prozent: number | null;
  /** Anzahl der Abgaben, die eingerechnet wurden. */
  bewertet: number;
}

/**
 * Summiert Punkte. Eingerechnet werden nur Abgaben mit erreichten UND maximalen Punkten,
 * damit noch nicht bewertete Abgaben den Anteil nicht verfälschen.
 */
export function summierePunkte(liste: readonly Punkte[]): PunkteSumme {
  let erreicht = 0;
  let max = 0;
  let bewertet = 0;
  for (const punkte of liste) {
    if (punkte.erreicht === null || punkte.max === null) continue;
    erreicht += punkte.erreicht;
    max += punkte.max;
    bewertet++;
  }
  return {
    erreicht: runde(erreicht, 2),
    max: runde(max, 2),
    prozent: max > 0 ? runde((erreicht / max) * 100, 1) : null,
    bewertet,
  };
}

/** 78.3 → „78,3 %“. */
export function formatiereProzent(prozent: number): string {
  return `${String(prozent).replace('.', ',')} %`;
}

function runde(wert: number, stellen: number): number {
  const faktor = 10 ** stellen;
  return Math.round(wert * faktor) / faktor;
}
