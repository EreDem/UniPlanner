// .ics-Text → RohEvent[]. Rein, ohne Expo-Abhängigkeiten.
// ical.js übernimmt gefaltete Zeilen und Escapes (\, \n \;).

import ICAL from 'ical.js';

import type { RohEvent } from '@/model/types';
import { berlinZuUtc } from '@/zeit';

export function parseIcs(icsText: string): RohEvent[] {
  const jcal = ICAL.parse(icsText);
  // ICAL.parse liefert eine Komponente oder, bei mehreren Wurzeln, ein Array davon.
  const wurzeln: unknown[] = typeof jcal[0] === 'string' ? [jcal] : jcal;

  return wurzeln.flatMap((wurzel) =>
    new ICAL.Component(wurzel as never).getAllSubcomponents('vevent').map(leseEvent),
  );
}

function leseEvent(vevent: ICAL.Component): RohEvent {
  const event = new ICAL.Event(vevent);
  const lastModified = vevent.getFirstPropertyValue('last-modified');
  const kategorien = vevent.getFirstProperty('categories')?.getValues() ?? [];

  return {
    uid: event.uid,
    titel: event.summary?.trim() ?? '',
    beschreibung: leerZuNull(event.description),
    startMs: zeitZuMs(event.startDate),
    endeMs: zeitZuMs(event.endDate),
    ort: leerZuNull(event.location),
    // Ein unmaskiertes Komma trennt in CATEGORIES Werte; Moodle meint damit aber einen Kursnamen.
    kategorie: leerZuNull(kategorien.join(',')),
    lastModifiedMs: lastModified instanceof ICAL.Time ? zeitZuMs(lastModified) : null,
  };
}

/** Moodle liefert UTC (`Z`). Zeiten ohne Zone und reine Datumsangaben gelten als Berliner Zeit. */
function zeitZuMs(zeit: ICAL.Time): number {
  if (zeit.isDate || !zeit.zone || zeit.zone === ICAL.Timezone.localTimezone) {
    return berlinZuUtc(zeit.year, zeit.month, zeit.day, zeit.hour, zeit.minute);
  }
  return zeit.toUnixTime() * 1000;
}

function leerZuNull(text: string | null | undefined): string | null {
  const getrimmt = text?.trim();
  return getrimmt ? getrimmt : null;
}
