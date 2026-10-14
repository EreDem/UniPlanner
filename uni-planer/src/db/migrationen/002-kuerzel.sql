-- Version 1 → 2: Kürzel der Veranstaltungsart pro Event (z. B. 'VO', 'TU' aus "(TU) Analysis").
-- Bestehende Events bekommen es beim nächsten Import.
ALTER TABLE event ADD COLUMN kuerzel TEXT;
