@AGENTS.md

# Uni-Planer

Handy-App für Studierende (Start: RWTH Aachen), die Veranstaltungen und Abgaben automatisch aus dem Moodle-Kalender importiert und daraus eine stets aktuelle To-do-Liste erzeugt. Der Nutzer muss nur noch abhaken.

Open Source unter AGPL-3.0. Kommunikation, Doku und Bezeichner im Code sind auf Deutsch.

## Stand

- Phase 1 (Marktforschung): abgeschlossen. Umfrage unter Studierenden: ca. 57 % würden die App nutzen, ca. die Hälfte will testen. Vertrauen beim Teilen des Moodle-Links ist für die Hälfte die Bedingung.
- Phase 2 (Konzept): abgeschlossen, Screen-Skizzen folgen nebenbei.
- **Phase 3 (aktuell): MVP für den Eigengebrauch.** Ziel: 2–3 Wochen tägliche Nutzung ohne Rückgriff auf andere To-do-Listen.
- Phase 4: kleiner Testkreis (Beta-Tester aus der Umfrage). Phase 5: öffentlicher Launch.

## Architektur

- Läuft **vollständig auf dem Gerät**, kein eigener Server. Grund: Datenschutz und Vertrauen.
- **Nur Mobile** (Android und iOS). Kein Desktop, keine Synchronisierung zwischen Geräten.
- Kalenderabruf: 1–2-mal täglich im Hintergrund, zusätzlich beim Öffnen der App und per Pull-to-Refresh.
- Native/hybride App ist Pflicht: Eine Web-App könnte die Moodle-URL wegen CORS nicht direkt abrufen.

## Tech-Stack

- React Native mit Expo, TypeScript, Expo Router
- `ical.js` zum Parsen der .ics-Daten
- `expo-sqlite` als lokale Datenbank
- `expo-secure-store` für die Moodle-Kalender-URL
- Später: Expo-Module für Hintergrundaufgaben und lokale Benachrichtigungen (brauchen einen Development Build, laufen nicht in Expo Go)
- Entwicklung und Tests primär auf Android

## Projektstruktur

```
src/app/                Screens (Expo Router): Onboarding, (tabs)/To-do + Erledigt + Module + Einstellungen,
                        event/[id], modul/[id], neues-event
src/model/types.ts      Typen und Kernregeln (rein, ohne Expo)
src/model/angaben.ts    Notiz und Punkte: Grenzen, Eingabe prüfen, Punktesumme (rein)
src/model/modul-uebersicht.ts  Modulseite: Events nach Kategorie, Punkte pro Modul (rein)
src/zeit.ts             Formatierung und Tagesgrenzen in Europe/Berlin (rein)
src/import/             abruf.ts, parse.ts, verarbeite.ts (rein), importiere.ts (Orchestrierung)
src/db/                 schema.sql (vollständiges aktuelles Schema für neue Installationen), migrationen/ (Upgrades
                        für bestehende, z. B. 002-kuerzel.sql), db.ts (PRAGMA user_version), repository.ts (alle Zugriffe)
src/speicher/           moodleLink.ts: Moodle-URL im expo-secure-store
src/daten/              Änderungszähler und Verbindungszustand für die UI
test/                   Jest-Tests; test/fixtures/beispiel.ics = anonymisierte Beispieldaten
werkzeuge/              Text-Transformer, damit .sql/.ics in Metro und Jest als String importierbar sind
docs/datenmodell.md     Diagramme (Mermaid)
prototyp.md             Spezifikation des ersten Prototyps
```

Schemaänderungen: immer beides anpassen, `schema.sql` und eine neue Datei in `src/db/migrationen/` (in `db.ts` als Upgrade eintragen, `SCHEMA_VERSION` erhöhen). Ein Test prüft, dass ein Upgrade ab Version 1 (Schnappschuss `test/fixtures/schema-v1.sql`, nie ändern) denselben Stand ergibt wie eine Neuinstallation. Im Schema keine Spalten per `DROP COLUMN` entfernen: SQLite scheitert daran bei Kommentaren in `CREATE TABLE`.

Tests: `npm test`. Repository-Tests laufen gegen das echte `schema.sql` mit `node:sqlite` (Node ≥ 22.5), sonst werden sie übersprungen.

Zeitzone: Den Berliner UTC-Offset berechnet `src/zeit.ts` selbst (EU-Sommerzeitregel), weil `@date-fns/tz` für `Europe/Berlin` Intl-Zeitzonen braucht, auf die wir uns in Hermes nicht verlassen.

## Datenquelle: Moodle-Kalender

- Format: iCalendar (.ics), abgerufen über die Kalender-URL aus RWTHmoodle (Kalender → Exportieren → „Alle Termine“ → „Kalender-URL abfragen“).
- Relevante Felder: `UID`, `SUMMARY`, `DESCRIPTION`, `DTSTART`, `DTEND`, `LOCATION`, `CATEGORIES` (= Modul, z. B. `(VU) IT-Sicherheit`), `LAST-MODIFIED`.
- Zeiten sind in UTC (`Z`), Anzeige immer in Europe/Berlin.
- Jeder Termin ist einzeln ausgerollt, es gibt kein `RRULE`.

## Import-Regeln

- **Klassifizierung**: `DTSTART == DTEND` → Abgabe (Frist), sonst → Typ `vorlesung` (Termin mit Dauer). Gespeichert werden nur diese zwei Typen. Auch Anmeldungen, Umfragen usw. zählen als Abgabe. Eine Kategorie „Sonstiges“ ist bewusst erst nach dem MVP geplant.
- **Kürzel**: Das Präfix aus `CATEGORIES` (z. B. `TU` aus `(TU) Analysis`) wird pro Event in `event.kuerzel` gespeichert. Das Modul (Slug ohne Präfix) fasst „(VO) Analysis“ und „(TU) Analysis“ zusammen. Kürzel: VO Vorlesung, VU Vorlesung mit Übung (gemischt), TU Tutorium, UE Übung, PR Praktikum, SE Seminar, PS Proseminar.
- **Vorlesung oder andere Veranstaltung** (abgeleitet, `istVorlesung`), in dieser Reihenfolge: „Vorlesung“/„Lecture“ im Titel → Vorlesung; Übung, Tutorium, Praktikum, Seminar, Labor, Sprechstunde, Klausur, Prüfung u. Ä. im Titel → andere Veranstaltung; Kürzel TU, UE, PR, SE, PS → andere Veranstaltung; sonst (VO, VU, unbekannt, ohne Kürzel) → Vorlesung. Der Titel geht vor, weil VU-Kurse beides enthalten. Manuelle Termine sind immer Vorlesungen.
- **Öffnungs-Marker ausblenden**: Moodle erzeugt für manche Aktivitäten ein Event beim Öffnen und eins beim Schließen. Titel, die auf „beginnt“, „gestartet“ oder „opens“ enden, werden ausgeblendet; nur das Schließen ist eine Aufgabe.
- **Deduplizierung**: Gleiches Modul + gleiche Start- und Endzeit = ein Event, auch wenn die UIDs verschieden sind (z. B. Übertragung in zwei Hörsäle). Räume werden gesammelt. Die Zuordnung UID → Event steht in `event_uid`.
- **Re-Import darf nie den Nutzerstatus überschreiben.** Status liegt deshalb in einer eigenen Tabelle, ebenso Notizen und Punkte (`nutzerdaten`).
- **Verschwundene Events** werden nicht gelöscht, sondern bekommen `entfernt_ms`.
- **Startdatum**: Moodle exportiert die letzten und nächsten 60 Tage. Damit die Liste bei Einrichtung mitten im Semester nicht voll ist, gilt als Startdatum der Montag der Woche, in der Moodle verbunden wurde (Einstellung `startdatum_ms`). Moodle-Events davor erscheinen weder in der To-do-Liste noch im Erledigt-Tab; manuelle Events immer. Beispieldaten haben kein Startdatum.

## Status

- **Vorlesung**: `nachzuarbeiten` | `erledigt`
  - Ohne gespeicherten Status gilt der Standard aus den Einstellungen (Default `nachzuarbeiten`, alternativ `erledigt`).
  - Erscheint am Tag selbst unter „Heute“, danach unter „Nachzuarbeiten“.
  - Bewusste Entscheidung: Alle Vorlesungen erscheinen standardmäßig in der Liste, weil sie bearbeitet werden müssen.
  - `erledigt` hält sie aus „Nachzuarbeiten“ heraus. Unter „Heute“ bleibt sie bis Tagesende stehen (mit Badge „Erledigt“), danach erscheint sie im Erledigt-Tab.
- **Abgabe**: `ausstehend` | `angefangen` | `erledigt` | `abgegeben`
  - `erledigt` = fertig bearbeitet, aber noch nicht abgegeben (z. B. Warten auf Abgabepartner). Bleibt bewusst in der To-do-Liste.
  - Erst `abgegeben` entfernt sie aus der To-do-Liste.
- Regel im Code: `istErledigt` in `src/model/types.ts`.

## To-do-Liste

1. Alle heutigen Veranstaltungen oben (Vorlesungen, Übungen, Tutorien …), auch erledigte Vorlesungen. Andere Veranstaltungen haben kein Status-Badge und erscheinen nur hier.
2. Alle nicht abgegebenen Abgaben, nach Deadline sortiert
3. Vergangene Vorlesungen mit Status `nachzuarbeiten`
   - Stapel: Hat ein Modul mehr als eine, erscheint nur eine Zeile pro Modul. Sie zeigt die älteste Vorlesung wie eine einzelne, rechts aber die Anzahl statt des Status. Antippen öffnet ein schwebendes Popup in der Mitte mit den einzelnen Vorlesungen nach Datum, im normalen Zeilen-Design. Vorlesungen ohne Modul werden nicht gestapelt.

Einstellungen: Vorlesungen standardmäßig `erledigt`, oder nur Abgaben anzeigen.

Module ausblenden (Einstellungen → Module): Der Schalter am Modul blendet das ganze Modul aus. Aufgeklappt (Pfeil) lassen sich die Kategorien einzeln ausblenden: Vorlesungen, Übungen, Abgaben (`kategorieVon`). „Übungen“ heißt in der App alles, was keine Vorlesung ist (Übung, Tutorium, Praktikum …), vorläufiger Name. Ist das ganze Modul aus, bleiben die Kategorie-Schalter erhalten, sind aber ausgegraut. Gilt für To-do-Liste und Erledigt-Tab; ein Import ändert nichts daran.

Anzeige: Moodle-Vorlesungen heißen überall „Vorlesung“ (`anzeigeTitel`), weil ihr Moodle-Titel meist nur der Kursname ist, der schon als Modul darübersteht. Andere Veranstaltungen (z. B. „Tutorium“) und manuelle Events behalten ihren Titel.

## Notiz und Punkte

In der Detailansicht jedes Events gibt es eine Notiz (höchstens 50 Zeichen, Zähler „n / 50“), bei Abgaben zusätzlich Punkte („erreicht / maximal“). Gespeichert wird beim Tippen in der Tabelle `nutzerdaten`. Punkte sind Zahlen (`REAL`, Eingabe mit Komma oder Punkt, höchstens zwei Nachkommastellen), damit sie später ausgewertet werden können (z. B. Zulassungs-Tracking pro Modul). Erreicht darf größer als maximal sein (Bonuspunkte), maximal muss größer als 0 sein; ungültige Eingaben werden nicht gespeichert. Regeln in `src/model/angaben.ts`.

## Module-Tab

Listet alle belegten Module (nicht komplett ausgeblendet) mit Kurzübersicht und Punkteanteil. Antippen öffnet die Modulseite (`modul/[id]`): oben zwei einzeilige Freitextfelder „Klausurtermine“ und „Zulassungskriterien“ (je höchstens 100 Zeichen, Spalten in `modul`, ein Import fasst sie nie an), darunter alle bisherigen Events des Moduls (begonnen bzw. Frist erreicht, oder vom Nutzer schon erledigt/abgegeben, z. B. vor der Frist abgegebene Abgaben; ein nur per Standard „erledigt“ zählt dafür nicht), aufklappbar nach Vorlesungen, Abgaben und Übungen (immer alle drei, auch leere), jeweils älteste zuerst. Die Ausblende-Schalter für Kategorien gelten hier nicht (nur für die To-do-Liste), das Startdatum schon. Bei den Abgaben stehen die Gesamtpunkte (erzielt, möglich, Prozent), auch zugeklappt; eingerechnet werden nur Abgaben mit beiden Punktwerten. Logik in `src/model/modul-uebersicht.ts`.

## Erledigt-Tab

Vier Tabs: To-do, Erledigt, Module, Einstellungen. Der Erledigt-Tab zeigt abgegebene Abgaben und erledigte Vorlesungen, neueste zuerst. Erledigte Vorlesungen werden wie unter „Nachzuarbeiten“ pro Modul gestapelt (Zeile zeigt die neueste, Popup neueste zuerst). Heutige Vorlesungen erscheinen dort erst ab dem nächsten Tag (bis dahin stehen sie unter „Heute“), Vorlesungen, die nur über den Standard `erledigt` sind, erst nach ihrem Ende. Verschwindet ein Eintrag durch eine Statusänderung aus einer der beiden Listen (also nicht unter „Heute“), erscheint unten für 5 Sekunden eine Leiste mit „Rückgängig“; sie stellt den vorher gespeicherten Status wieder her (oder den Standard, wenn keiner gespeichert war).

## MVP-Umfang

Drin:
- Moodle-URL eingeben, automatischer und manueller Abruf
- Klassifizierung, Deduplizierung, Speicherung
- To-do-Liste und Status ändern
- Einstellungen (s. o.)
- Manuelle Events als Fallback

Bewusst nicht im MVP: Kategorie „Sonstiges“, Export/Sync in andere Apps, automatisches Zulassungs-Tracking und Klausurtermine aus Moodle (im MVP nur als Freitext pro Modul), Benachrichtigungen, geteilte Kursdaten, ML-Features.

## Reihenfolge in Phase 3

1. Projekt-Setup (Expo, Repo, Lizenz, Struktur)
2. Import-Kern ohne UI, mit Unit-Tests gegen eine Beispiel-.ics
3. To-do-Liste
4. Onboarding (Moodle-URL eingeben)
5. Pull-to-Refresh (Hintergrundabruf folgt mit Development Build)
6. Manuelle Events
7. **Selbst nutzen, Probleme als GitHub-Issues erfassen** ← nächster Schritt

Schritte 2–6 sind als Prototyp nach `prototyp.md` umgesetzt, aber noch nicht in Expo Go auf einem Gerät geprüft.

## Sicherheitsregeln

- **Die Moodle-Kalender-URL enthält einen Zugangstoken. Sie darf nie ins Repo**, nicht in Code, Tests, Konfiguration oder Logs. Sie liegt nur im `expo-secure-store`.
- Test-Fixtures sind gekürzte, anonymisierte .ics-Dateien, kein echter Export mit vollständigem Stundenplan.
- Nur speichern, was die App wirklich braucht.

## Für später notiert

- Umfrage zeigte: Viele nutzen schon TickTick, Google Tasks, Kalender-Apps o. ä. Export in solche Apps wäre ein starkes Feature nach dem MVP.
- Modul-Struktur ist vorhanden und kann um Klausurtermine und Zulassungskriterien erweitert werden.
- Mögliche Finanzierung später: Spenden, Freemium für Zusatzfunktionen, Hochschul-Lizenzen. Niemals Datenverkauf oder aufdringliche Werbung.