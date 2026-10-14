-- Version 4 → 5: Eigene Angaben pro Modul (freier Text): Klausurtermine und Zulassungskriterien.
ALTER TABLE modul ADD COLUMN klausurtermine TEXT;
ALTER TABLE modul ADD COLUMN zulassungskriterien TEXT;
