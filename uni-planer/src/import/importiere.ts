// Orchestrierung: abrufen → parsen → verarbeiten → speichern.

import type { Db } from '@/db/db';
import {
  ladeAbrufInfo,
  ladeEinstellungen,
  loescheKalenderdaten,
  setzeAbrufErfolg,
  setzeAbrufFehler,
  setzeBeispieldaten,
  speichereEinstellungen,
  speichereImport,
} from '@/db/repository';
import { ladeMoodleLink, speichereMoodleLink } from '@/speicher/moodleLink';
import { wochenbeginn } from '@/zeit';

import { holeKalender, ImportFehler, mitExportVoreinstellungen, normalisiereMoodleLink } from './abruf';
import { ladeBeispielIcs } from './beispieldaten';
import { parseIcs } from './parse';
import { verarbeite, type ImportErgebnis } from './verarbeite';

export { ImportFehler } from './abruf';

/** Automatischer Import beim Öffnen, wenn der letzte Abruf älter ist. */
export const AUTO_IMPORT_NACH_MS = 6 * 60 * 60 * 1000;

function verarbeiteText(icsText: string): ImportErgebnis {
  try {
    return verarbeite(parseIcs(icsText));
  } catch {
    throw new ImportFehler('Die Kalenderdaten konnten nicht gelesen werden.');
  }
}

async function speichere(db: Db, ergebnis: ImportErgebnis): Promise<void> {
  await speichereImport(db, ergebnis, Date.now());
  await setzeAbrufErfolg(db, Date.now());
}

/**
 * Setzt das Startdatum auf den Montag der aktuellen Woche, falls noch keins gesetzt ist.
 * Moodle exportiert die letzten 60 Tage; ältere Termine sollen die To-do-Liste nicht füllen.
 */
async function sichereStartdatum(db: Db): Promise<void> {
  const { startdatumMs } = await ladeEinstellungen(db);
  if (startdatumMs === null) await speichereEinstellungen(db, { startdatumMs: wochenbeginn(Date.now()) });
}

let laufenderImport: Promise<void> | null = null;

/**
 * Importiert aus der aktuellen Quelle (Moodle-Link oder Beispieldaten).
 * Bei Fehlern bleiben die Daten unverändert, die Meldung wird gespeichert und als `ImportFehler` geworfen.
 * Läuft schon ein Import, wird auf diesen gewartet statt einen zweiten zu starten.
 */
export function importiere(db: Db): Promise<void> {
  laufenderImport ??= (async () => {
    try {
      const { beispieldaten } = await ladeAbrufInfo(db);
      let icsText: string;
      if (beispieldaten) {
        icsText = ladeBeispielIcs();
      } else {
        const url = await ladeMoodleLink();
        if (!url) throw new ImportFehler('Kein Moodle-Link gespeichert.');
        // Auch für Links, die vor der Normalisierung gespeichert wurden.
        icsText = await holeKalender(mitExportVoreinstellungen(url));
        await sichereStartdatum(db);
      }
      await speichere(db, verarbeiteText(icsText));
    } catch (fehler) {
      const meldung = fehler instanceof ImportFehler ? fehler.message : 'Unerwarteter Fehler beim Import.';
      await setzeAbrufFehler(db, meldung);
      throw new ImportFehler(meldung);
    }
  })().finally(() => {
    laufenderImport = null;
  });
  return laufenderImport;
}

/** Importiert, wenn ein Moodle-Link gespeichert ist und der letzte Abruf älter als 6 Stunden ist. */
export async function importiereFallsVeraltet(db: Db): Promise<void> {
  const info = await ladeAbrufInfo(db);
  if (info.beispieldaten || !(await ladeMoodleLink())) return;
  if (info.letzterAbrufMs !== null && Date.now() - info.letzterAbrufMs < AUTO_IMPORT_NACH_MS) return;
  await importiere(db);
}

/**
 * Onboarding: Link prüfen und normalisieren, Testabruf, erst bei Erfolg speichern und importieren.
 * Bei einem Fehler wird nichts gespeichert.
 */
export async function verbindeMoodle(db: Db, eingabe: string): Promise<void> {
  const url = normalisiereMoodleLink(eingabe);
  const ergebnis = verarbeiteText(await holeKalender(url));

  await speichereMoodleLink(url);
  const { beispieldaten } = await ladeAbrufInfo(db);
  if (beispieldaten) {
    // Beispieldaten nicht mit echten Daten mischen.
    await loescheKalenderdaten(db);
    await setzeBeispieldaten(db, false);
  }
  await sichereStartdatum(db);
  await speichere(db, ergebnis);
}

/**
 * Nur im Entwicklungsmodus: Fixture importieren, ohne eine URL zu speichern.
 * Ohne Startdatum, damit die ganze Fixture (auch ältere Vorlesungen) sichtbar ist.
 */
export async function ladeBeispieldaten(db: Db): Promise<void> {
  const ergebnis = verarbeiteText(ladeBeispielIcs());
  await setzeBeispieldaten(db, true);
  await speichereEinstellungen(db, { startdatumMs: null });
  await speichere(db, ergebnis);
}
