-- Version 6 → 7: Neuer Status 'verpasst' für Abgaben (Frist verstrichen, Abgabe nicht mehr möglich).
-- SQLite kann CHECK-Bedingungen nicht ändern, deshalb wird die Tabelle status neu angelegt.
-- Keine andere Tabelle verweist auf status, die Fremdschlüssel können dabei aktiv bleiben.

CREATE TABLE status_neu (
  event_id     TEXT    PRIMARY KEY REFERENCES event (id) ON DELETE CASCADE,
  status       TEXT    NOT NULL CHECK (status IN (
                 'nachzuarbeiten', 'erledigt', 'ausstehend', 'angefangen', 'abgegeben', 'verpasst'
               )),
  geaendert_ms INTEGER NOT NULL
);

-- Nur Zeilen zu existierenden Events übernehmen, damit der Umbau nie an Altlasten scheitert.
INSERT INTO status_neu (event_id, status, geaendert_ms)
  SELECT event_id, status, geaendert_ms FROM status WHERE event_id IN (SELECT id FROM event);

DROP TABLE status;
ALTER TABLE status_neu RENAME TO status;
