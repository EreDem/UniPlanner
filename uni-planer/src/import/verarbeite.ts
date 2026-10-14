// RohEvent[] → ImportErgebnis. Rein, ohne Expo-Abhängigkeiten.

import {
  duplikatSchluessel,
  istOeffnungsMarker,
  KEINE_KATEGORIE_AUSGEBLENDET,
  klassifiziere,
  type Modul,
  type RohEvent,
  type UniEvent,
} from '@/model/types';

export type ImportEvent = UniEvent & { uids: string[]; moodleLastModified: number | null };

export interface ImportErgebnis {
  module: Modul[];
  events: ImportEvent[];
}

/** Klein, Umlaute → ae/oe/ue, ß → ss, Leerzeichen → `-`. */
export function slug(text: string): string {
  const ergebnis = text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return ergebnis || 'modul';
}

/** `"(VU) Datenbanken"` → `{ id: "datenbanken", name: "Datenbanken", art: "VU" }`. */
export function leiteModulAb(kategorie: string): Pick<Modul, 'id' | 'name' | 'art'> {
  const treffer = /^\(([^)]+)\)\s*(.+)$/.exec(kategorie.trim());
  const name = (treffer ? treffer[2] : kategorie).trim();
  return { id: slug(name), name, art: treffer ? treffer[1].trim() : null };
}

export function verarbeite(rohEvents: readonly RohEvent[]): ImportErgebnis {
  const module = new Map<string, Modul>();
  // Doppelte UIDs in einer Datei: das letzte Vorkommen gewinnt.
  const nachUid = new Map(rohEvents.map((roh) => [roh.uid, roh]));
  const gruppen = new Map<string, { modulId: string | null; mitglieder: RohEvent[] }>();

  for (const roh of nachUid.values()) {
    let modulId: string | null = null;
    if (roh.kategorie) {
      const abgeleitet = leiteModulAb(roh.kategorie);
      modulId = abgeleitet.id;
      if (!module.has(modulId)) {
        module.set(modulId, {
          ...abgeleitet,
          quelle: 'moodle',
          ausgeblendet: false,
          ausgeblendeteKategorien: KEINE_KATEGORIE_AUSGEBLENDET,
        });
      }
    }

    // Nur Vorlesungen werden zusammengeführt, jede Abgabe bleibt ein eigenes Event.
    const schluessel =
      klassifiziere(roh.startMs, roh.endeMs) === 'vorlesung'
        ? duplikatSchluessel(modulId, roh.startMs, roh.endeMs)
        : `uid:${roh.uid}`;
    const gruppe = gruppen.get(schluessel);
    if (gruppe) gruppe.mitglieder.push(roh);
    else gruppen.set(schluessel, { modulId, mitglieder: [roh] });
  }

  const events = [...gruppen.values()].map(({ modulId, mitglieder }) =>
    baueEvent(modulId, mitglieder),
  );
  events.sort((a, b) => a.startMs - b.startMs || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return { module: [...module.values()], events };
}

function baueEvent(modulId: string | null, mitglieder: RohEvent[]): ImportEvent {
  const sortiert = [...mitglieder].sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
  const erstes = sortiert[0];
  const raeume = [...new Set(sortiert.flatMap((roh) => (roh.ort ? [roh.ort] : [])))];
  const lastModified = sortiert
    .map((roh) => roh.lastModifiedMs)
    .filter((ms): ms is number => ms !== null);

  return {
    id: erstes.uid,
    uids: sortiert.map((roh) => roh.uid),
    typ: klassifiziere(erstes.startMs, erstes.endeMs),
    quelle: 'moodle',
    modulId,
    titel: erstes.titel,
    beschreibung: erstes.beschreibung,
    startMs: erstes.startMs,
    endeMs: erstes.endeMs,
    raeume,
    ausgeblendet: istOeffnungsMarker(erstes.titel),
    entferntMs: null,
    kuerzel: erstes.kategorie ? leiteModulAb(erstes.kategorie).art : null,
    moodleLastModified: lastModified.length > 0 ? Math.max(...lastModified) : null,
  };
}
