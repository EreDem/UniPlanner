
-- SQLite-Schema des Uni-Planers (expo-sqlite), aktueller Stand = Version 5.
-- Neue Installationen führen diese Datei aus; bestehende werden über src/db/migrationen/ aktualisiert
-- (siehe src/db/db.ts, PRAGMA user_version). Änderungen hier immer auch als Migration anlegen.
-- Zeitpunkte sind UTC-Millisekunden, Spalten enden auf _ms. Wahrheitswerte sind 0/1.
-- Die Moodle-Kalender-URL gehört NICHT hierher, sondern in expo-secure-store.

-- Modul = CATEGORIES aus Moodle, z. B. "(VU) Datenbanken", oder manuell angelegt.
-- Später erweiterbar um Klausurtermine und Zulassungskriterien.
CREATE TABLE modul (
  id           TEXT    PRIMARY KEY,          -- Slug des Namens, z. B. 'datenbanken'
  name         TEXT    NOT NULL,
  art          TEXT,                         -- Präfix der zuerst importierten Kategorie, z. B. 'VO'
  quelle       TEXT    NOT NULL CHECK (quelle IN ('moodle', 'manuell')),
  ausgeblendet INTEGER NOT NULL DEFAULT 0,   -- ganzes Modul, vom Nutzer; ein Import fasst das nie an
  -- Einzelne Kategorien des Moduls ausblenden, vom Nutzer (seit Version 3):
  vorlesungen_ausgeblendet INTEGER NOT NULL DEFAULT 0,
  uebungen_ausgeblendet    INTEGER NOT NULL DEFAULT 0,   -- sonstige Veranstaltungen (Übung, Tutorium …)
  abgaben_ausgeblendet     INTEGER NOT NULL DEFAULT 0,
  -- Eigene Angaben als freier Text, vom Nutzer (seit Version 5):
  klausurtermine           TEXT,
  zulassungskriterien      TEXT
);

-- Ein Event nach Deduplizierung. Mehrere Moodle-UIDs können auf dasselbe Event zeigen.
CREATE TABLE event (
  id                      TEXT    PRIMARY KEY,   -- erste UID der Gruppe (sortiert) oder 'manuell:<uuid>'
  typ                     TEXT    NOT NULL CHECK (typ IN ('vorlesung', 'abgabe')),
  quelle                  TEXT    NOT NULL CHECK (quelle IN ('moodle', 'manuell')),
  modul_id                TEXT    REFERENCES modul (id) ON DELETE SET NULL,
  titel                   TEXT    NOT NULL,
  beschreibung            TEXT,
  start_ms                INTEGER NOT NULL,
  ende_ms                 INTEGER NOT NULL,
  raeume                  TEXT    NOT NULL DEFAULT '[]',  -- JSON-Array, Strings unverändert aus LOCATION
  ausgeblendet            INTEGER NOT NULL DEFAULT 0,     -- z. B. Öffnungs-Marker oder vom Nutzer
  ausgeblendet_vom_nutzer INTEGER NOT NULL DEFAULT 0,     -- 1 = Import überschreibt `ausgeblendet` nicht mehr
  moodle_last_modified_ms INTEGER,                        -- LAST-MODIFIED aus Moodle
  entfernt_ms             INTEGER,                        -- aus Moodle verschwunden; wird nie gelöscht
  kuerzel                 TEXT,                           -- Kürzel aus CATEGORIES, z. B. 'VO', 'TU' (seit Version 2)
  CHECK (ende_ms >= start_ms)
);

CREATE INDEX event_start ON event (start_ms);

-- Zuordnung Moodle-UID → Event (z. B. Übertragung in zwei Hörsäle = zwei UIDs, ein Event).
CREATE TABLE event_uid (
  uid      TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES event (id) ON DELETE CASCADE
);

CREATE INDEX event_uid_event ON event_uid (event_id);

-- Nutzerstatus, getrennt vom Event. Ein Import fasst diese Tabelle nie an.
-- Fehlt eine Zeile, gilt der Standard (Vorlesung: Einstellung, Abgabe: 'ausstehend').
CREATE TABLE status (
  event_id     TEXT    PRIMARY KEY REFERENCES event (id) ON DELETE CASCADE,
  status       TEXT    NOT NULL CHECK (status IN (
                 'nachzuarbeiten', 'erledigt', 'ausstehend', 'angefangen', 'abgegeben'
               )),
  geaendert_ms INTEGER NOT NULL
);

-- Eigene Angaben des Nutzers pro Event, getrennt vom Event. Ein Import fasst diese Tabelle nie an.
-- Punkte als Zahl, damit sie später ausgewertet werden können (seit Version 4).
CREATE TABLE nutzerdaten (
  event_id        TEXT    PRIMARY KEY REFERENCES event (id) ON DELETE CASCADE,
  notiz           TEXT    CHECK (notiz IS NULL OR length(notiz) <= 50),
  punkte_erreicht REAL    CHECK (punkte_erreicht IS NULL OR punkte_erreicht >= 0),
  punkte_max      REAL    CHECK (punkte_max IS NULL OR punkte_max > 0),
  geaendert_ms    INTEGER NOT NULL
);

-- Einstellungen und Abrufzustand als Schlüssel-Wert-Paare:
-- vorlesung_standard, nur_abgaben, startdatum_ms, letzter_abruf_ms, letzter_abruf_fehler, beispieldaten
CREATE TABLE einstellung (
  schluessel TEXT PRIMARY KEY,
  wert       TEXT NOT NULL
);
