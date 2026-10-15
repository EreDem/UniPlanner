# Uni-Planer

Handy-App für Studierende: Sie holt Vorlesungen und Abgaben automatisch aus dem Moodle-Kalender und macht daraus eine stets aktuelle To-do-Liste. Du musst nur noch abhaken.

Gestartet an der RWTH Aachen. Läuft komplett auf dem Handy, ohne eigenen Server.

> **Stand:** Prototyp im Eigentest. Die App ist noch nicht im Play Store oder App Store. Getestet wurde bisher mit RWTHmoodle auf Android.

## Funktionen

- **To-do-Liste in drei Bereichen:** _Heute_ (alle heutigen Veranstaltungen), _Abgaben_ (nach Frist sortiert, überfällige rot) und _Nachzuarbeiten_ (vergangene Vorlesungen, pro Modul gestapelt).
- **Abhaken mit einem Tipp:** Der Kreis links hakt ab (Abgabe → abgegeben, Vorlesung → erledigt). Über das Badge gibt es feinere Status wie „Angefangen“, „Erledigt, aber noch nicht hochgeladen“ oder „Verpasst“. Verschwindet ein Eintrag dadurch aus der Liste, lässt sich das einige Sekunden lang rückgängig machen.
- **Aktualisiert sich selbst:** beim Öffnen der App, wenn der letzte Abruf älter als sechs Stunden ist, und per Pull-to-Refresh. Dein Status bleibt bei jedem Abruf erhalten.
- **Erledigt-Tab** mit allem, was abgegeben oder nachgearbeitet ist.
- **Module:** pro Modul alle bisherigen Vorlesungen, Abgaben und Übungen, eigene Notizen zu Klausurterminen und Zulassungskriterien sowie die Summe der Punkte aus deinen Abgaben mit Fortschrittsbalken.
- **Details pro Event:** kurze Notiz, Punkte (erreicht / maximal), Beschreibung aus Moodle.
- **Eigene Events** für Fristen, die nicht in Moodle stehen.
- **Ausblenden:** einzelne Events, ganze Module oder nur deren Vorlesungen, Übungen oder Abgaben.
- **Hell, dunkel oder wie das System.**

## Datenschutz

Vertrauen ist die Grundlage der App, deshalb:

- **Kein Server, kein Konto, kein Tracking.** Alle Daten liegen in einer lokalen Datenbank auf deinem Handy.
- **Dein Moodle-Link bleibt auf dem Gerät.** Er wird im geschützten Speicher des Betriebssystems abgelegt (Android Keystore bzw. iOS Keychain) und nur an Moodle selbst geschickt, um den Kalender abzurufen.
- **Der Link ist ein Zugangsschlüssel** zu deinem Kalender. Gib ihn nicht weiter. Falls er doch einmal in fremde Hände gerät, kannst du in Moodle einen neuen erzeugen.

## So findest du deinen Moodle-Link

1. In RWTHmoodle den **Kalender** öffnen und unten auf **„Exportieren“** tippen.
2. **„Alle Termine“** und einen Zeitraum wählen, dann **„Kalender-URL abfragen“**.
3. Den angezeigten Link kopieren und in der App einfügen.

Der Link hat die Form `https://moodle.rwth-aachen.de/calendar/export_execute.php?userid=…&authtoken=…`. Andere Hochschulen mit Moodle sollten ähnlich funktionieren, das ist aber noch nicht getestet.

## Ausprobieren

Fertige Installationsdateien gibt es noch nicht öffentlich. Zum Ausprobieren startest du die App selbst mit [Expo Go](https://expo.dev/go), siehe [Entwicklung](#entwicklung).

## Entwicklung

Die App ist mit [Expo](https://expo.dev) (SDK 57), React Native, TypeScript und Expo Router gebaut. Der Code liegt im Ordner [`uni-planer/`](uni-planer/).

### Voraussetzungen

- [Node.js](https://nodejs.org) 22.5 oder neuer (die Datenbank-Tests nutzen `node:sqlite`)
- [Expo Go](https://expo.dev/go) auf dem Handy, passend zu SDK 57
- Handy und Rechner im selben WLAN. Ein aktives VPN auf dem Rechner kann die Verbindung verhindern.

### Starten

```bash
cd uni-planer
npm install
npx expo start
```

Den QR-Code mit Expo Go (Android) bzw. der Kamera (iOS) scannen. Im Entwicklungsmodus gibt es im Onboarding den Knopf **„Beispieldaten laden“**, damit lässt sich alles ohne echten Moodle-Link testen.

Logs der App (`console.log`) erscheinen seit React Native 0.77 nicht mehr im Terminal. Zur Fehlersuche hilft die [Web-Version](#web) mit der Konsole des Browsers.

### Prüfen

```bash
npm test            # Jest-Tests (Import, Regeln der To-do-Liste, Datenbank)
npx expo lint       # ESLint
npx tsc --noEmit    # Typen
```

### Neue Pakete

Immer mit `npx expo install <paket>` hinzufügen, damit die Version zum Expo SDK passt. Pakete mit nativem Code laufen nur, wenn Expo Go sie mitbringt. Sonst braucht es einen eigenen Build.

### Android-APK bauen

```bash
npx eas-cli@latest build --profile preview --platform android
```

Das Profil `preview` erzeugt eine APK zum direkten Installieren. Dafür ist ein Expo-Konto mit Zugriff auf das Projekt nötig.

### Web

`npx expo start` und dann `w` öffnet die App im Browser. Das ist nur für die Fehlersuche gedacht. Im Browser fehlen der geschützte Speicher für den Moodle-Link, Bestätigungsdialoge und der Datumswähler.

## Aufbau

```
uni-planer/
├── src/app/          Screens (Expo Router): Onboarding, Tabs, Event-Detail, Modulseite, Neues Event
├── src/components/   UI-Bausteine, Event-Zeile, Statusauswahl, Icons
├── src/model/        Kernregeln ohne Expo-Abhängigkeiten: Status, To-do-Liste, Module, Punkte
├── src/import/       Moodle-Kalender abrufen, parsen und verarbeiten
├── src/db/           SQLite-Schema, Migrationen und alle Datenbankzugriffe
├── src/speicher/     Moodle-Link im geschützten Speicher des Geräts
├── src/constants/    Designsystem: Farben, Schrift, Abstände
├── test/             Jest-Tests mit anonymisierten Beispieldaten
├── design/           Entwürfe aller Screens (PDF)
└── docs/             Datenmodell und Design-Briefing
```

Die ausführliche Projektdokumentation mit allen Regeln (Import, Status, To-do-Liste, Design) steht in [`uni-planer/CLAUDE.md`](uni-planer/CLAUDE.md).

## Mitmachen

Fehler und Ideen gern als [Issue](https://github.com/EreDem/UniPlanner/issues). Für Code gilt:

- Bezeichner, Kommentare und Doku sind auf Deutsch.
- Vor einem Pull Request Tests, Lint und Typen prüfen (siehe oben).
- **Nie einen echten Moodle-Link committen**, weder in Code noch in Tests, Konfiguration oder Logs. Test-Daten sind gekürzte, anonymisierte Kalender.

## Lizenz

[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) (AGPL-3.0)
