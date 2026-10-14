-- Version 3 → 4: Eigene Angaben des Nutzers pro Event (Notiz, bei Abgaben Punkte).
CREATE TABLE nutzerdaten (
  event_id        TEXT    PRIMARY KEY REFERENCES event (id) ON DELETE CASCADE,
  notiz           TEXT    CHECK (notiz IS NULL OR length(notiz) <= 50),
  punkte_erreicht REAL    CHECK (punkte_erreicht IS NULL OR punkte_erreicht >= 0),
  punkte_max      REAL    CHECK (punkte_max IS NULL OR punkte_max > 0),
  geaendert_ms    INTEGER NOT NULL
);
