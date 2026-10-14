# Spezifikation: Prototyp Uni-Planer

Ergänzt die `CLAUDE.md` im Projektwurzelverzeichnis. Dort stehen Architektur, Tech-Stack, Datenmodell und Import-Regeln. Dieses Dokument beschreibt, **was der erste lauffähige Prototyp konkret können muss** und in welcher Reihenfolge er gebaut wird.

Referenzdateien:
- `src/db/schema.sql` – SQLite-Schema
- `src/model/types.ts` – Typen und Kernregeln (Klassifizierung, Öffnungs-Marker, effektiver Status, To-do-Liste)
- `docs/datenmodell.md` – Diagramme

- `test/fixtures/beispiel.ics` – anonymisierte Beispieldaten

## 1. Ziel des Prototyps

Eine App, die in **Expo Go auf Android** läuft und folgenden Ablauf vollständig abbildet:

1. Nutzer gibt die Moodle-Kalender-URL ein (oder lädt im Entwicklungsmodus Beispieldaten).
2. App ruft den Kalender ab, verarbeitet ihn und speichert alles in SQLite.
3. App zeigt die To-do-Liste mit drei Bereichen: Heute, Abgaben, Nachzuarbeiten.
4. Nutzer kann den Status jedes Eintrags ändern. Der Status überlebt jeden erneuten Import.
5. Nutzer kann manuell Events anlegen.
6. Nutzer kann Einstellungen ändern und manuell aktualisieren.

Hintergrundabruf und Benachrichtigungen sind **nicht** Teil des Prototyps (brauchen einen Development Build).

## 2. Screens und Navigation

Expo Router. Wenn keine Moodle-URL gespeichert ist und keine Beispieldaten geladen wurden, wird auf das Onboarding umgeleitet.

```
app/
├── _layout.tsx            Root: DB initialisieren, Onboarding-Weiche
├── onboarding.tsx
├── (tabs)/
│   ├── _layout.tsx        Tabs: „To-do“, „Einstellungen“
│   ├── index.tsx          To-do-Liste
│   └── einstellungen.tsx
├── event/[id].tsx         Event-Detail (Stack)
└── neues-event.tsx        Manuelles Event anlegen (Modal)
```

### 2.1 Onboarding

- Kurzer Erklärtext: wofür die App da ist, dass der Link nur auf dem Gerät gespeichert wird.
- Anleitung in 3 Schritten, wo man den Link in Moodle findet (Kalender → Exportieren → „Alle Termine“ → „Kalender-URL abfragen“ → kopieren).
- Textfeld für die URL, Button „Verbinden“.
- Validierung: muss mit `https://` beginnen. Danach Testabruf: Antwort muss `BEGIN:VCALENDAR` enthalten. Bei Fehler verständliche Meldung, nichts speichern.
- Bei Erfolg: URL in `expo-secure-store`, ersten Import ausführen, weiter zur To-do-Liste.
- **Nur im Entwicklungsmodus (`__DEV__`)**: Button „Beispieldaten laden“, der `test/fixtures/beispiel.ics` importiert, ohne eine URL zu speichern. So kann man ohne echten Token testen.

### 2.2 To-do-Liste (Hauptscreen)

Aufbau nach `baueToDoListe` in `types.ts`, als `SectionList`:

1. **Heute** – heutige Vorlesungen (Tagesgrenzen in Europe/Berlin), mit Uhrzeit und Raum
2. **Abgaben** – alle nicht abgegebenen, nach Deadline sortiert
3. **Nachzuarbeiten** – vergangene Vorlesungen mit Status `nachzuarbeiten`, älteste zuerst

Leere Bereiche werden ausgeblendet. Sind alle leer: freundlicher Leerzustand („Alles erledigt“).

Jede Zeile zeigt:
- Modulname (z. B. „Datenbanken“) und Titel
- Bei Abgaben: Deadline relativ und absolut („in 3 Tagen · Mo 26.10., 23:59“). Überfällige Abgaben farblich hervorheben.
- Bei Vorlesungen: Datum, Uhrzeit, Räume
- Aktuellen Status als kleines Badge

Interaktion:
- **Antippen der Zeile** → Event-Detail
- **Antippen des Status-Badges** → Auswahl der möglichen Status für diesen Typ (Action Sheet oder kleines Bottom-Sheet); Änderung wird sofort gespeichert
- **Pull-to-Refresh** → neuer Import
- Header zeigt „Zuletzt aktualisiert: vor X Min.“ und bei Fehlern einen Hinweis
- Floating Button „+“ → `neues-event`

Beim **Öffnen der App** (bzw. wenn sie in den Vordergrund kommt) wird automatisch importiert, wenn der letzte Abruf älter als 6 Stunden ist.

### 2.3 Event-Detail

- Titel, Modul, Typ, Zeit (Berlin), Räume, Beschreibung (Zeilenumbrüche erhalten)
- Status mit allen möglichen Werten als Auswahl
- Hinweis, falls das Event aus Moodle verschwunden ist
- Bei manuellen Events zusätzlich „Löschen“
- „Ausblenden“ für jedes Event (setzt `ausgeblendet = 1`)

### 2.4 Manuelles Event anlegen

- Typ: Vorlesung oder Abgabe
- Modul: Auswahl aus bestehenden Modulen oder neues Modul per Name anlegen (`quelle = 'manuell'`)
- Titel
- Abgabe: Datum + Uhrzeit der Deadline
- Vorlesung: Datum, Start- und Endzeit, optional Raum
- Speichern → `event` mit `quelle = 'manuell'`, ID `manuell:<uuid>`

### 2.5 Einstellungen

- **Moodle-Verbindung**: Status (verbunden / Beispieldaten / nicht verbunden), Link ändern, Link entfernen. Den Link selbst nie vollständig anzeigen, höchstens die Domain.
- **Vorlesungen standardmäßig**: „Nachzuarbeiten“ oder „Erledigt“
- **Nur Abgaben anzeigen**: Schalter
- **Module**: Liste aller Module mit Schalter zum Ausblenden
- **Aktualisieren**: Button „Jetzt aktualisieren“, Anzeige letzter Abruf und letzter Fehler
- **Alle Daten löschen**: mit Bestätigung; löscht DB-Inhalt und Secure-Store-Eintrag, zurück zum Onboarding

## 3. Code-Aufbau

Reine Logik strikt von Expo-Abhängigkeiten trennen, damit sie mit Jest ohne Gerät testbar ist.

```
src/
├── model/types.ts          (vorhanden) Typen, Kernregeln
├── import/
│   ├── abruf.ts            fetch mit Timeout, Prüfung auf VCALENDAR
│   ├── parse.ts            ical.js → RohEvent[]            (rein)
│   ├── verarbeite.ts       RohEvent[] → ImportErgebnis      (rein)
│   └── importiere.ts       Orchestrierung: abrufen → parsen → verarbeiten → speichern
├── db/
│   ├── schema.sql          (vorhanden)
│   ├── db.ts               Verbindung öffnen, Migrationen per PRAGMA user_version
│   └── repository.ts       alle Lese-/Schreibfunktionen
├── speicher/
│   └── moodleLink.ts       get/set/delete in expo-secure-store
└── zeit.ts                 Formatierung und Tagesgrenzen in Europe/Berlin
```

### 3.1 `parse.ts`

Eingabe: .ics-Text. Ausgabe: `RohEvent[]` mit `uid`, `titel` (SUMMARY), `beschreibung`, `startMs`, `endeMs`, `ort` (LOCATION oder null), `kategorie` (CATEGORIES), `lastModifiedMs`. ical.js übernimmt Zeilenumbrüche und Escapes.

### 3.2 `verarbeite.ts`

Reine Funktion, Eingabe `RohEvent[]`, Ausgabe:

```ts
interface ImportErgebnis {
  module: Modul[];
  events: Array<UniEvent & { uids: string[]; moodleLastModified: number | null }>;
}
```

Schritte:
1. **Modul ableiten** aus `kategorie`: `"(VU) Datenbanken"` → `art = "VU"`, `name = "Datenbanken"`, `id` = slug des Namens (klein, Umlaute → ae/oe/ue, ß → ss, Leerzeichen → `-`). Ohne Präfix: `art = null`.
2. **Klassifizieren** mit `klassifiziere(startMs, endeMs)`.
3. **Öffnungs-Marker** mit `istOeffnungsMarker(titel)` → `ausgeblendet = true` (Event wird trotzdem gespeichert).
4. **Deduplizieren** (nur Vorlesungen) mit `duplikatSchluessel`: Gruppe wird ein Event, `id` = erste UID der Gruppe (sortiert), `uids` = alle UIDs, `raeume` = alle unterschiedlichen Orte. Raum-Strings wie `[1420|001] Hörsaal A` bleiben unverändert.

### 3.3 Speichern (`repository.ts`), in einer Transaktion

1. Module upserten (Name/Art aktualisieren, `ausgeblendet` nicht anfassen).
2. Für jedes importierte Event: bestehendes Event über **irgendeine** seiner UIDs in `event_uid` suchen.
   - Gefunden → Felder aktualisieren (nicht `ausgeblendet`, falls vom Nutzer gesetzt), `entfernt_ms = NULL`, neue UIDs ergänzen.
   - Nicht gefunden → neu anlegen.
   - Tabelle `status` wird **nie** angefasst.
3. **Verschwundene Moodle-Events**: Events mit `quelle = 'moodle'`, die nicht im Import vorkamen **und deren Start in der Zukunft liegt**, bekommen `entfernt_ms = jetzt`. Vergangene Events werden nicht markiert, weil der Moodle-Export je nach Einstellung nur einen Zeitraum enthält.
4. `letzter_abruf_ms` setzen, `letzter_abruf_fehler` leeren. Bei Fehlern: Fehlertext speichern, vorhandene Daten unverändert lassen.

### 3.4 Zeit

Alle Werte intern in UTC-Millisekunden. Anzeige und „heute“-Grenzen immer in `Europe/Berlin`. Für die Umrechnung `date-fns` mit `@date-fns/tz` verwenden, nicht auf `Intl`-Zeitzonen in Hermes verlassen.

## 4. Tests

Jest mit `jest-expo`. Pflicht sind Tests für `parse.ts` und `verarbeite.ts` gegen `test/fixtures/beispiel.ics`. Erwartete Ergebnisse für die Fixture:

- **3 Module**: Analysis (VO), Datenbanken (VU), Spieleprogrammierung (PR)
- **12 Termine mit Dauer**:
  - Analysis 05.10., 08.10., 12.10., 22.10.
  - Analysis 15.10. – aus zwei UIDs zusammengeführt, 2 Räume
  - Analysis 09.10. – Tutorium: Kategorie „(TU) Analysis“, Titel nur „Analysis“; wird über das Kürzel als andere Veranstaltung erkannt
  - Datenbanken 06.10., 13.10., 20.10.
  - Datenbanken Präsenzübung 18.12. – aus zwei UIDs zusammengeführt, 2 Räume; laut Titel andere Veranstaltung
  - Spieleprogrammierung 07.10., 14.10.
- **Stapel**: Am 14.10. stehen unter „Nachzuarbeiten“ ein Stapel Analysis (3, ohne das Tutorium), ein Stapel Datenbanken (2) und Spieleprogrammierung 07.10. einzeln; Spieleprogrammierung 14.10. steht unter „Heute“.
- **4 Abgaben**, davon **1 ausgeblendet** („Gruppenanmeldung beginnt“) und 3 sichtbar:
  - „Übungsblatt 1 ist fällig“ – Deadline Mo 26.10., **23:59 Uhr Berliner Zeit** (nach der Zeitumstellung am 25.10., UTC 22:59)
  - „Gruppenanmeldung ist fällig“
  - „Assignment for Unit 1 - Search is due“ – Beschreibung enthält ein echtes Komma und ist über eine umgebrochene Zeile korrekt zusammengesetzt

Zusätzlich Tests für `baueToDoListe` (Sortierung, Ausblenden, „nur Abgaben“, Standardstatus) und `effektiverStatus`.

## 5. Gestaltung

- Schlicht und gut lesbar, Fokus auf die Liste. Systemschrift.
- Hell- und Dunkelmodus über `useColorScheme`.
- Pro Modul eine feste Farbe (aus einer kleinen Palette per Hash der Modul-ID), als schmaler Streifen links an jeder Zeile.
- Status-Badges mit klaren Farben: offen/ausstehend neutral, angefangen gelblich, erledigt blau, abgegeben bzw. erledigte Vorlesung grün, überfällig rot.
- Alle Texte auf Deutsch.

## 6. Reihenfolge der Umsetzung

Nach jedem Schritt: Tests laufen lassen, App in Expo Go prüfen, committen.

1. Abhängigkeiten installieren: `expo-sqlite`, `expo-secure-store`, `ical.js`, `date-fns`, `@date-fns/tz`, `jest-expo`. Weitere Abhängigkeiten nur nach Rückfrage.
2. `parse.ts` und `verarbeite.ts` mit Tests gegen die Fixture
3. `db.ts` und `repository.ts`, inklusive Re-Import-Verhalten (Status bleibt erhalten, verschwundene Events)
4. `importiere.ts` und `moodleLink.ts`
5. Onboarding inklusive „Beispieldaten laden“
6. To-do-Liste mit Status ändern und Pull-to-Refresh
7. Event-Detail
8. Manuelles Event anlegen
9. Einstellungen

## 7. Akzeptanzkriterien

- [ ] Alle Tests grün
- [ ] Nach „Beispieldaten laden“ zeigt die To-do-Liste die erwarteten Einträge
- [ ] Status ändern, App neu starten → Status ist noch da
- [ ] Erneuter Import ändert keinen gesetzten Status
- [ ] Mit echter Moodle-URL funktioniert Import und Pull-to-Refresh
- [ ] Ungültige URL oder fehlendes Netz führt zu verständlicher Meldung, nicht zum Absturz
- [ ] „Nur Abgaben anzeigen“ und Standardstatus wirken sofort
- [ ] Manuell angelegte Events erscheinen korrekt und überleben einen Import
- [ ] „Alle Daten löschen“ entfernt DB-Inhalt und gespeicherten Link
- [ ] Die Moodle-URL taucht nirgends in Logs, Fehlermeldungen oder im Repo auf

## 8. Nicht Teil des Prototyps

Hintergrundabruf, Benachrichtigungen, Kategorie „Sonstiges“, Export in andere Apps, Zulassungs-Tracking, Klausurtermine, iOS-spezifisches Feintuning, App-Store-Veröffentlichung.