// Modul-Tab: alle bisherigen Events eines Moduls nach Kategorie, mit Punktesumme der Abgaben.
// Rein, ohne Expo-Abhängigkeiten.

import { summierePunkte, type Punkte, type PunkteSumme } from './angaben';
import {
  effektiverStatus,
  istErledigt,
  istVorStartdatum,
  kategorieVon,
  type Kategorie,
  type Modul,
  type ToDoEingabe,
  type ToDoEintrag,
} from './types';

/** Reihenfolge der Kategorien auf der Modulseite. */
export const UEBERSICHT_KATEGORIEN: readonly Kategorie[] = ['vorlesungen', 'abgaben', 'uebungen'];

export interface ModulUebersicht {
  modul: Modul;
  /** Immer alle drei Kategorien (auch leere), je nach Datum sortiert (älteste zuerst). */
  kategorien: { kategorie: Kategorie; eintraege: ToDoEintrag[] }[];
  /** Summe über die Abgaben dieses Moduls mit eingetragenen Punkten. */
  punkte: PunkteSumme;
  /** Vergangene Vorlesungen mit Status `nachzuarbeiten`. */
  nachzuarbeiten: number;
}

const KEINE_PUNKTE: Punkte = { erreicht: null, max: null };

/**
 * Alle bisherigen Events des Moduls: begonnen bzw. Frist erreicht, oder vom Nutzer schon
 * abgehakt (z. B. vor der Frist abgegebene Abgaben). Nur über den Standard „erledigt“ zählt nicht,
 * sonst stünden bei dieser Einstellung alle künftigen Vorlesungen hier.
 * Es fehlen ausgeblendete Events (z. B. Öffnungs-Marker), Moodle-Events vor dem Startdatum und
 * aus Moodle entfernte Vorlesungen. Die Ausblende-Schalter für Module und Kategorien gelten nur
 * für die To-do-Liste, hier nicht.
 */
export function baueModulUebersicht(
  eingabe: ToDoEingabe,
  modul: Modul,
  punkte: ReadonlyMap<string, Punkte>,
): ModulUebersicht {
  const { einstellungen, jetztMs } = eingabe;
  const nachKategorie = new Map<Kategorie, ToDoEintrag[]>(UEBERSICHT_KATEGORIEN.map((k) => [k, []]));

  for (const event of eingabe.events) {
    if (event.modulId !== modul.id || event.ausgeblendet) continue;
    if (istVorStartdatum(event, einstellungen)) continue;
    if (event.typ === 'vorlesung' && event.entferntMs !== null) continue;

    const gespeichert = eingabe.status.get(event.id);
    const schonAbgehakt = gespeichert !== undefined && istErledigt(event.typ, gespeichert);
    if (event.startMs > jetztMs && !schonAbgehakt) continue;

    const status = effektiverStatus(event.typ, gespeichert, einstellungen);
    const ueberfaellig = event.typ === 'abgabe' && !istErledigt(event.typ, status) && event.startMs < jetztMs;
    nachKategorie.get(kategorieVon(event))!.push({ event, modul, status, ueberfaellig });
  }

  const kategorien = UEBERSICHT_KATEGORIEN.map((kategorie) => ({
    kategorie,
    eintraege: nachKategorie.get(kategorie)!.sort((a, b) => a.event.startMs - b.event.startMs),
  }));

  const abgaben = nachKategorie.get('abgaben')!;
  const vorlesungen = nachKategorie.get('vorlesungen')!;
  return {
    modul,
    kategorien,
    punkte: summierePunkte(abgaben.map(({ event }) => punkte.get(event.id) ?? KEINE_PUNKTE)),
    nachzuarbeiten: vorlesungen.filter((e) => e.status === 'nachzuarbeiten' && e.event.endeMs <= jetztMs).length,
  };
}

/** Alle belegten Module (nicht komplett ausgeblendet), alphabetisch. */
export function baueModulListe(eingabe: ToDoEingabe, punkte: ReadonlyMap<string, Punkte>): ModulUebersicht[] {
  return eingabe.module
    .filter((modul) => !modul.ausgeblendet)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .map((modul) => baueModulUebersicht(eingabe, modul, punkte));
}

/** Anzahl der Events einer Kategorie in der Übersicht. */
export function anzahlIn(uebersicht: ModulUebersicht, kategorie: Kategorie): number {
  return uebersicht.kategorien.find((k) => k.kategorie === kategorie)?.eintraege.length ?? 0;
}
