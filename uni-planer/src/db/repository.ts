// Alle Lese- und Schreibzugriffe auf die Datenbank.

import { slug, type ImportErgebnis } from '@/import/verarbeite';
import {
  STANDARD_EINSTELLUNGEN,
  type Einstellungen,
  type EventTyp,
  type Kategorie,
  type Modul,
  type Quelle,
  type Status,
  type UniEvent,
  type VorlesungStatus,
} from '@/model/types';

import type { Db } from './db';

// ---------- Transaktionen ----------

// withTransactionAsync ist nicht exklusiv und lässt sich nicht verschachteln.
// Deshalb laufen alle Transaktionen der App nacheinander.
let transaktionsKette: Promise<unknown> = Promise.resolve();

function inTransaktion(db: Db, aufgabe: () => Promise<void>): Promise<void> {
  const lauf = transaktionsKette.then(() => db.withTransactionAsync(aufgabe));
  transaktionsKette = lauf.catch(() => undefined);
  return lauf;
}

// ---------- Events ----------

interface EventZeile {
  id: string;
  typ: EventTyp;
  quelle: Quelle;
  modul_id: string | null;
  titel: string;
  beschreibung: string | null;
  start_ms: number;
  ende_ms: number;
  raeume: string;
  ausgeblendet: number;
  entfernt_ms: number | null;
  kuerzel: string | null;
}

const EVENT_SPALTEN =
  'id, typ, quelle, modul_id, titel, beschreibung, start_ms, ende_ms, raeume, ausgeblendet, entfernt_ms, kuerzel';

function zuEvent(zeile: EventZeile): UniEvent {
  return {
    id: zeile.id,
    typ: zeile.typ,
    quelle: zeile.quelle,
    modulId: zeile.modul_id,
    titel: zeile.titel,
    beschreibung: zeile.beschreibung,
    startMs: zeile.start_ms,
    endeMs: zeile.ende_ms,
    raeume: JSON.parse(zeile.raeume) as string[],
    ausgeblendet: zeile.ausgeblendet === 1,
    entferntMs: zeile.entfernt_ms,
    kuerzel: zeile.kuerzel,
  };
}

export async function ladeEvents(db: Db): Promise<UniEvent[]> {
  const zeilen = await db.getAllAsync<EventZeile>(`SELECT ${EVENT_SPALTEN} FROM event ORDER BY start_ms`);
  return zeilen.map(zuEvent);
}

export async function ladeEvent(db: Db, id: string): Promise<UniEvent | null> {
  const zeile = await db.getFirstAsync<EventZeile>(`SELECT ${EVENT_SPALTEN} FROM event WHERE id = ?`, [id]);
  return zeile ? zuEvent(zeile) : null;
}

/** Ausblenden durch den Nutzer. Ein späterer Import überschreibt das nicht. */
export async function setzeEventAusgeblendet(db: Db, id: string, ausgeblendet: boolean): Promise<void> {
  await db.runAsync('UPDATE event SET ausgeblendet = ?, ausgeblendet_vom_nutzer = 1 WHERE id = ?', [
    ausgeblendet ? 1 : 0,
    id,
  ]);
}

export interface NeuesEvent {
  typ: EventTyp;
  modulId: string | null;
  titel: string;
  startMs: number;
  endeMs: number;
  raum: string | null;
}

export async function legeManuellesEventAn(db: Db, daten: NeuesEvent): Promise<string> {
  const id = `manuell:${zufallsUuid()}`;
  await db.runAsync(
    `INSERT INTO event (id, typ, quelle, modul_id, titel, start_ms, ende_ms, raeume)
     VALUES (?, ?, 'manuell', ?, ?, ?, ?, ?)`,
    [id, daten.typ, daten.modulId, daten.titel, daten.startMs, daten.endeMs, JSON.stringify(daten.raum ? [daten.raum] : [])],
  );
  return id;
}

/** Nur manuelle Events lassen sich löschen; der Status wird per Fremdschlüssel mitgelöscht. */
export async function loescheManuellesEvent(db: Db, id: string): Promise<void> {
  await db.runAsync("DELETE FROM event WHERE id = ? AND quelle = 'manuell'", [id]);
}

function zufallsUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (zeichen) => {
    const zufall = Math.floor(Math.random() * 16);
    return (zeichen === 'x' ? zufall : (zufall & 0x3) | 0x8).toString(16);
  });
}

// ---------- Status ----------

export async function ladeStatus(db: Db): Promise<Map<string, Status>> {
  const zeilen = await db.getAllAsync<{ event_id: string; status: Status }>('SELECT event_id, status FROM status');
  return new Map(zeilen.map((zeile) => [zeile.event_id, zeile.status]));
}

/** `null` entfernt den gespeicherten Status, dann gilt wieder der Standard (z. B. für „Rückgängig“). */
export async function setzeStatus(
  db: Db,
  eventId: string,
  status: Status | null,
  jetztMs = Date.now(),
): Promise<void> {
  if (status === null) {
    await db.runAsync('DELETE FROM status WHERE event_id = ?', [eventId]);
    return;
  }
  await db.runAsync(
    `INSERT INTO status (event_id, status, geaendert_ms) VALUES (?, ?, ?)
     ON CONFLICT (event_id) DO UPDATE SET status = excluded.status, geaendert_ms = excluded.geaendert_ms`,
    [eventId, status, jetztMs],
  );
}

// ---------- Module ----------

interface ModulZeile {
  id: string;
  name: string;
  art: string | null;
  quelle: Quelle;
  ausgeblendet: number;
  vorlesungen_ausgeblendet: number;
  uebungen_ausgeblendet: number;
  abgaben_ausgeblendet: number;
}

const KATEGORIE_SPALTE: Record<Kategorie, string> = {
  vorlesungen: 'vorlesungen_ausgeblendet',
  uebungen: 'uebungen_ausgeblendet',
  abgaben: 'abgaben_ausgeblendet',
};

export async function ladeModule(db: Db): Promise<Modul[]> {
  const zeilen = await db.getAllAsync<ModulZeile>(
    `SELECT id, name, art, quelle, ausgeblendet, vorlesungen_ausgeblendet, uebungen_ausgeblendet, abgaben_ausgeblendet
     FROM modul ORDER BY name COLLATE NOCASE`,
  );
  return zeilen.map((zeile) => ({
    id: zeile.id,
    name: zeile.name,
    art: zeile.art,
    quelle: zeile.quelle,
    ausgeblendet: zeile.ausgeblendet === 1,
    ausgeblendeteKategorien: {
      vorlesungen: zeile.vorlesungen_ausgeblendet === 1,
      uebungen: zeile.uebungen_ausgeblendet === 1,
      abgaben: zeile.abgaben_ausgeblendet === 1,
    },
  }));
}

/** Ganzes Modul aus- oder einblenden; die Einstellungen der einzelnen Kategorien bleiben erhalten. */
export async function setzeModulAusgeblendet(db: Db, id: string, ausgeblendet: boolean): Promise<void> {
  await db.runAsync('UPDATE modul SET ausgeblendet = ? WHERE id = ?', [ausgeblendet ? 1 : 0, id]);
}

/** Vorlesungen, Übungen oder Abgaben eines Moduls aus- oder einblenden. */
export async function setzeKategorieAusgeblendet(
  db: Db,
  modulId: string,
  kategorie: Kategorie,
  ausgeblendet: boolean,
): Promise<void> {
  await db.runAsync(`UPDATE modul SET ${KATEGORIE_SPALTE[kategorie]} = ? WHERE id = ?`, [ausgeblendet ? 1 : 0, modulId]);
}

/** Legt ein Modul per Name an. Gibt es den Slug schon, wird das vorhandene Modul verwendet. */
export async function legeModulAn(db: Db, name: string): Promise<string> {
  const id = slug(name.trim());
  await db.runAsync(
    "INSERT INTO modul (id, name, quelle) VALUES (?, ?, 'manuell') ON CONFLICT (id) DO NOTHING",
    [id, name.trim()],
  );
  return id;
}

// ---------- Einstellungen und Abrufzustand ----------

const SCHLUESSEL = {
  vorlesungStandard: 'vorlesung_standard',
  nurAbgaben: 'nur_abgaben',
  startdatum: 'startdatum_ms',
  letzterAbruf: 'letzter_abruf_ms',
  letzterFehler: 'letzter_abruf_fehler',
  beispieldaten: 'beispieldaten',
} as const;

async function ladeWerte(db: Db): Promise<Map<string, string>> {
  const zeilen = await db.getAllAsync<{ schluessel: string; wert: string }>('SELECT schluessel, wert FROM einstellung');
  return new Map(zeilen.map((zeile) => [zeile.schluessel, zeile.wert]));
}

async function setzeWert(db: Db, schluessel: string, wert: string | null): Promise<void> {
  if (wert === null) {
    await db.runAsync('DELETE FROM einstellung WHERE schluessel = ?', [schluessel]);
    return;
  }
  await db.runAsync(
    'INSERT INTO einstellung (schluessel, wert) VALUES (?, ?) ON CONFLICT (schluessel) DO UPDATE SET wert = excluded.wert',
    [schluessel, wert],
  );
}

export async function ladeEinstellungen(db: Db): Promise<Einstellungen> {
  const werte = await ladeWerte(db);
  const standard = werte.get(SCHLUESSEL.vorlesungStandard);
  return {
    vorlesungStandard:
      standard === 'erledigt' || standard === 'nachzuarbeiten'
        ? (standard satisfies VorlesungStatus)
        : STANDARD_EINSTELLUNGEN.vorlesungStandard,
    nurAbgaben: werte.get(SCHLUESSEL.nurAbgaben) === '1',
    startdatumMs: werte.has(SCHLUESSEL.startdatum) ? Number(werte.get(SCHLUESSEL.startdatum)) : null,
  };
}

export async function speichereEinstellungen(db: Db, aenderung: Partial<Einstellungen>): Promise<void> {
  if (aenderung.vorlesungStandard !== undefined) {
    await setzeWert(db, SCHLUESSEL.vorlesungStandard, aenderung.vorlesungStandard);
  }
  if (aenderung.nurAbgaben !== undefined) {
    await setzeWert(db, SCHLUESSEL.nurAbgaben, aenderung.nurAbgaben ? '1' : '0');
  }
  if (aenderung.startdatumMs !== undefined) {
    await setzeWert(db, SCHLUESSEL.startdatum, aenderung.startdatumMs === null ? null : String(aenderung.startdatumMs));
  }
}

export interface AbrufInfo {
  letzterAbrufMs: number | null;
  letzterFehler: string | null;
  beispieldaten: boolean;
}

export async function ladeAbrufInfo(db: Db): Promise<AbrufInfo> {
  const werte = await ladeWerte(db);
  const letzterAbruf = werte.get(SCHLUESSEL.letzterAbruf);
  return {
    letzterAbrufMs: letzterAbruf ? Number(letzterAbruf) : null,
    letzterFehler: werte.get(SCHLUESSEL.letzterFehler) ?? null,
    beispieldaten: werte.get(SCHLUESSEL.beispieldaten) === '1',
  };
}

export async function setzeAbrufErfolg(db: Db, jetztMs: number): Promise<void> {
  await setzeWert(db, SCHLUESSEL.letzterAbruf, String(jetztMs));
  await setzeWert(db, SCHLUESSEL.letzterFehler, null);
}

export async function setzeAbrufFehler(db: Db, meldung: string): Promise<void> {
  await setzeWert(db, SCHLUESSEL.letzterFehler, meldung);
}

export async function setzeBeispieldaten(db: Db, aktiv: boolean): Promise<void> {
  await setzeWert(db, SCHLUESSEL.beispieldaten, aktiv ? '1' : null);
}

// ---------- Import ----------

/**
 * Speichert ein Import-Ergebnis in einer Transaktion:
 * 1. Module upserten (`ausgeblendet` bleibt unberührt).
 * 2. Events über irgendeine ihrer UIDs wiederfinden und aktualisieren, sonst neu anlegen.
 *    `ausgeblendet` wird nur überschrieben, solange der Nutzer es nicht selbst gesetzt hat.
 *    Die Tabelle `status` wird nie angefasst.
 * 3. Moodle-Events in der Zukunft, die nicht mehr im Kalender sind, bekommen `entfernt_ms`.
 *    Vergangene nicht, weil der Moodle-Export je nach Einstellung nur einen Zeitraum enthält.
 */
export async function speichereImport(db: Db, ergebnis: ImportErgebnis, jetztMs: number): Promise<void> {
  await inTransaktion(db, async () => {
    for (const modul of ergebnis.module) {
      await db.runAsync(
        `INSERT INTO modul (id, name, art, quelle) VALUES (?, ?, ?, 'moodle')
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, art = excluded.art, quelle = 'moodle'`,
        [modul.id, modul.name, modul.art],
      );
    }

    const uidZuEvent = new Map(
      (await db.getAllAsync<{ uid: string; event_id: string }>('SELECT uid, event_id FROM event_uid')).map(
        (zeile) => [zeile.uid, zeile.event_id],
      ),
    );
    const vergebeneIds = new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM event')).map((z) => z.id));
    // Events, die in diesem Import schon zugeordnet wurden. Teilt sich eine frühere Gruppe auf,
    // bekommt der abgespaltene Teil so ein eigenes Event statt das erste zu überschreiben.
    const zugeordnet = new Set<string>();

    for (const event of ergebnis.events) {
      const vorhanden = event.uids
        .map((uid) => uidZuEvent.get(uid))
        .find((id): id is string => id !== undefined && !zugeordnet.has(id));
      const raeume = JSON.stringify(event.raeume);
      const ausgeblendet = event.ausgeblendet ? 1 : 0;

      let id: string;
      if (vorhanden) {
        id = vorhanden;
        await db.runAsync(
          `UPDATE event SET typ = ?, modul_id = ?, titel = ?, beschreibung = ?, start_ms = ?, ende_ms = ?,
             raeume = ?, moodle_last_modified_ms = ?, kuerzel = ?, entfernt_ms = NULL,
             ausgeblendet = CASE WHEN ausgeblendet_vom_nutzer = 1 THEN ausgeblendet ELSE ? END
           WHERE id = ?`,
          [event.typ, event.modulId, event.titel, event.beschreibung, event.startMs, event.endeMs,
            raeume, event.moodleLastModified, event.kuerzel, ausgeblendet, id],
        );
      } else {
        id = freieId(event.id, vergebeneIds);
        vergebeneIds.add(id);
        await db.runAsync(
          `INSERT INTO event (id, typ, quelle, modul_id, titel, beschreibung, start_ms, ende_ms, raeume,
             ausgeblendet, moodle_last_modified_ms, kuerzel)
           VALUES (?, ?, 'moodle', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, event.typ, event.modulId, event.titel, event.beschreibung, event.startMs, event.endeMs,
            raeume, ausgeblendet, event.moodleLastModified, event.kuerzel],
        );
      }
      zugeordnet.add(id);

      for (const uid of event.uids) {
        if (uidZuEvent.get(uid) === id) continue;
        await db.runAsync(
          'INSERT INTO event_uid (uid, event_id) VALUES (?, ?) ON CONFLICT (uid) DO UPDATE SET event_id = excluded.event_id',
          [uid, id],
        );
        uidZuEvent.set(uid, id);
      }
    }

    const kandidaten = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM event WHERE quelle = 'moodle' AND entfernt_ms IS NULL AND start_ms > ?",
      [jetztMs],
    );
    for (const { id } of kandidaten) {
      if (!zugeordnet.has(id)) {
        await db.runAsync('UPDATE event SET entfernt_ms = ? WHERE id = ?', [jetztMs, id]);
      }
    }
  });
}

function freieId(wunsch: string, vergeben: ReadonlySet<string>): string {
  if (!vergeben.has(wunsch)) return wunsch;
  for (let nummer = 2; ; nummer++) {
    if (!vergeben.has(`${wunsch}#${nummer}`)) return `${wunsch}#${nummer}`;
  }
}

// ---------- Löschen ----------

/** Löscht Events, Module und Status, behält aber die Einstellungen. */
export async function loescheKalenderdaten(db: Db): Promise<void> {
  await inTransaktion(db, async () => {
    await db.execAsync('DELETE FROM status; DELETE FROM event_uid; DELETE FROM event; DELETE FROM modul;');
  });
}

/** Löscht den gesamten Datenbankinhalt (der Moodle-Link liegt separat im Secure Store). */
export async function loescheAlleDaten(db: Db): Promise<void> {
  await inTransaktion(db, async () => {
    await db.execAsync(
      'DELETE FROM status; DELETE FROM event_uid; DELETE FROM event; DELETE FROM modul; DELETE FROM einstellung;',
    );
  });
}
