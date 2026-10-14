-- Version 2 → 3: Pro Modul einzeln ausblendbar: Vorlesungen, Übungen (sonstige Veranstaltungen), Abgaben.
ALTER TABLE modul ADD COLUMN vorlesungen_ausgeblendet INTEGER NOT NULL DEFAULT 0;
ALTER TABLE modul ADD COLUMN uebungen_ausgeblendet INTEGER NOT NULL DEFAULT 0;
ALTER TABLE modul ADD COLUMN abgaben_ausgeblendet INTEGER NOT NULL DEFAULT 0;
