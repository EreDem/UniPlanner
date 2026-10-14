-- Schnappschuss des Schemas in Version 1 (unverändert lassen).
-- Dient im Test als Ausgangspunkt, um die Upgrades in src/db/migrationen/ zu prüfen.

CREATE TABLE modul (
  id           TEXT    PRIMARY KEY,
  name         TEXT    NOT NULL,
  art          TEXT,
  quelle       TEXT    NOT NULL CHECK (quelle IN ('moodle', 'manuell')),
  ausgeblendet INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE event (
  id                      TEXT    PRIMARY KEY,
  typ                     TEXT    NOT NULL CHECK (typ IN ('vorlesung', 'abgabe')),
  quelle                  TEXT    NOT NULL CHECK (quelle IN ('moodle', 'manuell')),
  modul_id                TEXT    REFERENCES modul (id) ON DELETE SET NULL,
  titel                   TEXT    NOT NULL,
  beschreibung            TEXT,
  start_ms                INTEGER NOT NULL,
  ende_ms                 INTEGER NOT NULL,
  raeume                  TEXT    NOT NULL DEFAULT '[]',
  ausgeblendet            INTEGER NOT NULL DEFAULT 0,
  ausgeblendet_vom_nutzer INTEGER NOT NULL DEFAULT 0,
  moodle_last_modified_ms INTEGER,
  entfernt_ms             INTEGER,
  CHECK (ende_ms >= start_ms)
);

CREATE INDEX event_start ON event (start_ms);

CREATE TABLE event_uid (
  uid      TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES event (id) ON DELETE CASCADE
);

CREATE INDEX event_uid_event ON event_uid (event_id);

CREATE TABLE status (
  event_id     TEXT    PRIMARY KEY REFERENCES event (id) ON DELETE CASCADE,
  status       TEXT    NOT NULL CHECK (status IN (
                 'nachzuarbeiten', 'erledigt', 'ausstehend', 'angefangen', 'abgegeben'
               )),
  geaendert_ms INTEGER NOT NULL
);

CREATE TABLE einstellung (
  schluessel TEXT PRIMARY KEY,
  wert       TEXT NOT NULL
);
