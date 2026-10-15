# Design-Briefing: Uni-Planer

Dieses Dokument beschreibt Aufbau und Funktionen der App, damit ein neues, besseres Design entstehen kann. Die Funktionen sind fertig und getestet. Gesucht ist die **visuelle Gestaltung**: Designsystem, Screens und Komponenten. Abläufe und Inhalte bleiben, wie hier beschrieben.

---

## 1. Auftrag in Kürze

Gestalte eine mobile App (Android zuerst, auch iOS) für Studierende, die ihre Vorlesungen und Abgaben aus dem Uni-Kalender automatisch als To-do-Liste bekommen und nur noch abhaken müssen.

Liefere bitte:
1. ein **Designsystem**: Farben (hell und dunkel), Typografie, Abstände, Ecken, Schatten, Icons und Komponenten,
2. **alle Screens** aus Abschnitt 6 in hellem und dunklem Modus, inklusive der Zustände „leer“, „Fehler“ und „lädt“,
3. die **wiederkehrenden Komponenten** aus Abschnitt 7 einzeln.

Format: Smartphone hochkant, Android-Referenz 412 × 915 pt, iOS-Referenz 390 × 844 pt. Alle Texte auf Deutsch.

---

## 2. Produkt und Zielgruppe

- **Was:** Die App liest den Moodle-Kalender der Hochschule (Start: RWTH Aachen) und macht daraus eine stets aktuelle To-do-Liste mit Vorlesungen zum Nacharbeiten und Abgaben mit Fristen.
- **Für wen:** Studierende, oft mit 5–7 Modulen pro Semester, die den Überblick über Nacharbeiten und Fristen behalten wollen. Viele nutzen bisher TickTick, Google Tasks oder Notizen.
- **Kernversprechen:** „Der Nutzer muss nur noch abhaken.“ Die App pflegt sich selbst, der Nutzer setzt nur Status.
- **Vertrauen ist zentral:** Die App läuft komplett auf dem Gerät, ohne Server. Der Moodle-Link enthält einen Zugangsschlüssel und bleibt auf dem Handy. Für die Hälfte der befragten Studierenden war genau das die Bedingung, die App zu nutzen.
- **Arbeitstitel:** Uni-Planer. Ein Logo gibt es noch nicht, ein Vorschlag ist willkommen.

---

## 3. Gestaltungsziele

1. **Ruhig und schnell erfassbar.** Die To-do-Liste ist der Mittelpunkt. Ein Blick soll reichen: Was ist heute, was ist fällig, was hänge ich hinterher?
2. **So intuitiv wie möglich.** Wenige Bedienelemente, keine Einstellungsorgien, klare Sprache. Lieber weglassen als erklären.
3. **Abhaken fühlt sich gut an.** Statuswechsel sind schnell, mit sichtbarer Bestätigung und „Rückgängig“.
4. **Seriös und vertrauenswürdig**, nicht verspielt. Freundlich, aber ohne Comic-Look.
5. **Hell und dunkel** gleichwertig gut.
6. **Barrierearm:** Kontraste nach WCAG AA, Tippflächen mindestens 44 × 44 pt, Farbe nie als einzige Information (Status steht immer auch als Text da).

---

## 4. Technische Rahmenbedingungen

Die App ist mit React Native (Expo) gebaut. Das Design muss damit umsetzbar sein:

- **Untere Tab-Leiste:** Sie ist **nativ**, auf Android eine Material-3-Navigation-Bar, auf iOS die System-Tab-Bar. Gestaltbar sind Icons, Labels, Hintergrund- und Akzentfarbe, nicht die Form.
- **Kopfzeilen** von Unterseiten (Detail, Modul, Ausgeblendet, Neues Event) sind native Stack-Header mit Zurück-Pfeil und Titel.
- **Bestätigungsdialoge** („Alle Daten löschen?“) sind native Systemdialoge.
- **Schrift:** Die Systemschrift ist gesetzt (Roboto bzw. SF Pro). Eine eigene Schrift ist möglich, aber kein Muss.
- **Effekte:** Einfache Animationen (Einblenden, Hochschieben) sind gut machbar. Unschärfe- oder Glas-Effekte bitte nur optional, weil sie auf Android kaum verfügbar sind.
- **Lange Texte** müssen funktionieren. Modulnamen wie „Elements of Machine Learning and Data Science“ werden einzeilig gekürzt (…), Titel dürfen zweizeilig sein.
- **Schriftgrößen:** Die Systemschriftgröße kann vergrößert sein, Layouts sollen das aushalten.

---

## 5. Begriffe (wichtig für das Verständnis)

| Begriff | Bedeutung |
|---|---|
| **Modul** | Eine Lehrveranstaltung, z. B. „Analysis für Informatik“. Kommt aus Moodle, hat ein Kürzel wie **VO** (Vorlesung), **VU** (Vorlesung mit Übung), **PR** (Praktikum). Jedes Modul hat eine feste **Modulfarbe** aus einer Palette von 8 Farben. |
| **Vorlesung** | Termin mit Beginn und Ende, z. B. „Do 15.10., 10:30–12:00 · Hörsaal A“. Wird nachgearbeitet. |
| **Übung** | Termin wie eine Vorlesung (Tutorium, Praktikum, Seminar …), wird aber **nicht** nachgearbeitet und hat keinen Status. Erscheint nur am selben Tag. In der Praxis selten. |
| **Abgabe** | Frist ohne Dauer, z. B. „Übungsblatt 3 ist fällig, Mo 26.10., 23:59“. Auch Anmeldungen und Umfragen zählen dazu. |
| **Event** | Oberbegriff für Vorlesung, Übung und Abgabe. |
| **Status** | Bearbeitungsstand eines Events, siehe unten. |

**Status einer Vorlesung:** Nachzuarbeiten → Erledigt

**Status einer Abgabe:**
- Ausstehend
- Angefangen
- Erledigt (= fertig bearbeitet, aber noch **nicht** hochgeladen, z. B. weil der Abgabepartner hochlädt)
- Abgegeben
- Verpasst (Frist verstrichen, Abgabe nicht mehr möglich)

**Überfällig** ist kein eigener Status, sondern eine Markierung: Frist vorbei und noch nicht abgegeben oder verpasst.

---

## 6. Screens

### Navigation im Überblick

```
Onboarding (nur beim ersten Start bzw. ohne verbundenen Link)
        ↓
Tab-Leiste unten:  [ To-do ] [ Erledigt ] [ Module ] [ Einstellungen ]
        │              │           │              │
        │              │           └→ Modulseite  ├→ Ausgeblendet
        └──────────────┴──────────────┴──────────→ Event-Detail
To-do „+“ → Neues Event (als Modal von unten)
```

Aktuelle Tab-Icons: Checkliste, Häkchen im Kreis, Bücher/Doktorhut, Zahnrad.

### 6.1 Onboarding („Moodle verbinden“)

**Zweck:** Erster Start. Den persönlichen Kalender-Link aus Moodle einfügen, damit die App Termine laden kann.

**Inhalt von oben nach unten:**
1. Überschrift: **„Dein Semester als To-do-Liste“**
2. Kurztext: „Uni-Planer holt Vorlesungen und Abgaben aus deinem Moodle-Kalender und macht daraus eine To-do-Liste. Du musst nur noch abhaken.“
3. Vertrauenshinweis (zurückhaltend, aber gut sichtbar): „Dein Kalender-Link wird nur auf diesem Gerät gespeichert und nirgendwohin geschickt außer an Moodle selbst.“
4. Karte **„So findest du den Link“** mit drei nummerierten Schritten:
   1. Öffne in RWTHmoodle den Kalender und tippe unten auf „Exportieren“.
   2. Wähle bei den Veranstaltungen „Alle Termine“ und einen Zeitraum, dann „Kalender-URL abfragen“.
   3. Kopiere den angezeigten Link und füge ihn hier ein.
5. Eingabefeld für den Link (lang, einzeilig, Platzhalter „https://moodle.rwth-aachen.de/calendar/export_execute.php?…“)
6. Primärknopf **„Verbinden“** (deaktiviert, solange das Feld leer ist; zeigt beim Prüfen einen Ladezustand)
7. Fehlermeldung bei Problemen, z. B. „Das ist nicht der Export-Link des Kalenders. In Moodle: Kalender → Exportieren → ‚Kalender-URL abfragen‘ und den angezeigten Link kopieren.“

**Wunsch:** Dieser Screen entscheidet, ob jemand die App überhaupt nutzt. Er darf gern einladender werden, z. B. mit Illustration, klarer Schrittfolge oder einem Bild, wo der Link in Moodle steht. Aber bitte ohne Karussell aus vielen Seiten.

### 6.2 Tab „To-do“ (Hauptscreen)

**Kopf:** Großer Titel **„To-do“**, darunter klein „Zuletzt aktualisiert: vor 12 Min.“. Hat die letzte Aktualisierung nicht geklappt, steht dort eine rote Hinweisbox: „Letzte Aktualisierung fehlgeschlagen: Keine Verbindung zu Moodle. Bitte prüfe deine Internetverbindung.“

**Drei Bereiche** mit Überschrift und Anzahl. Die Überschriften bleiben beim Scrollen oben haften. Leere Bereiche entfallen.
1. **Heute:** alle heutigen Vorlesungen (und ggf. Übungen) nach Uhrzeit. Hier steht nur die Uhrzeit, z. B. „10:30–12:00 · Hörsaal A“. Auch erledigte Vorlesungen bleiben bis Tagesende stehen, dann mit grünem Badge.
2. **Abgaben:** alle offenen Abgaben nach Frist. Überfällige stehen zuerst und sind rot.
3. **Nachzuarbeiten:** vergangene, noch nicht erledigte Vorlesungen, älteste zuerst. Hat ein Modul mehrere, werden sie zu einem **Stapel** zusammengefasst (siehe 7.3).

**Unten rechts schwebend:** ein Pillen-Knopf **„Zu Moodle ↗“** (öffnet Moodle im Browser) und daneben ein runder **„+“-Knopf** (neues Event anlegen). Beide rücken nach oben, wenn die Rückgängig-Leiste erscheint.

**Interaktionen:**
- Zeile antippen → Event-Detail
- Status-Badge antippen → Statusauswahl (7.4)
- Liste nach unten ziehen → Kalender neu laden
- Ändert sich ein Status so, dass der Eintrag verschwindet (abgegeben, verpasst, erledigt), erscheint die **Rückgängig-Leiste** (7.5)

**Leerzustand:** „Alles erledigt“ und „Keine offenen Abgaben und nichts nachzuarbeiten. Zum Aktualisieren nach unten ziehen.“ Das ist ein schöner Moment für eine kleine Illustration.

### 6.3 Tab „Erledigt“

Titel **„Erledigt“**, Hinweis „Status antippen, um etwas wieder in die To-do-Liste zu holen.“

Zwei Bereiche, jeweils das Neueste oben:
- **Abgegeben:** abgegebene Abgaben
- **Vorlesungen:** erledigte Vorlesungen, je Modul gestapelt wie unter „Nachzuarbeiten“

Status ändern geht hier genauso, mit Rückgängig-Leiste. Leerzustand: „Noch nichts erledigt“ und „Abgegebene Abgaben und erledigte Vorlesungen erscheinen hier.“

### 6.4 Tab „Module“

Titel **„Module“**. Liste aller belegten Module. Jede Zeile enthält:
- Modulfarbe als Streifen links
- Name mit Kürzel, z. B. „Analysis für Informatik (VO)“
- Zusammenfassung: „5 Vorlesungen · 3 Abgaben · 1 Übung“
- falls vorhanden in Warnfarbe: „2 nachzuarbeiten“
- rechts eine Pille mit dem **Punkteanteil**, z. B. „78,3 %“ (nur wenn Punkte eingetragen sind), und ein Pfeil „›“

Leerzustand: „Noch keine Module“.

### 6.5 Modulseite (Unterseite, Titel = Modulname)

**Oben zwei einzeilige Eingabefelder** mit kleiner Überschrift:
- **Klausurtermine** (Platzhalter „z. B. 1. Termin 12.02., 2. Termin 20.03.“)
- **Zulassungskriterien** (Platzhalter „z. B. 50 % der Übungspunkte, falls es welche gibt“)

Gespeichert wird beim Tippen, es gibt keinen Speichern-Knopf.

**Darunter drei aufklappbare Kategorien als Karten**, immer alle drei, auch wenn leer:
1. **Vorlesungen** mit Anzahl. Darunter ggf. „2 nachzuarbeiten“.
2. **Abgaben** mit Anzahl. Direkt in der Karte, auch zugeklappt sichtbar, stehen die **Gesamtpunkte** als drei Kennzahlen nebeneinander:
   - **Erzielt** 23,5
   - **Möglich** 30
   - **Prozent** 78,3 %
   Darunter klein: „Aus 3 von 4 Abgaben mit eingetragenen Punkten“. Ohne Punkte steht dort: „Noch keine Punkte eingetragen. Trage sie in der Detailansicht einer Abgabe ein.“
3. **Übungen** mit Anzahl.

Aufgeklappt erscheinen die Events chronologisch als Event-Zeilen (7.1). Bei Abgaben steht zusätzlich „Punkte: 7,5 / 10“ (oder „Punkte: –“). Verpasste Abgaben haben ein graues Badge „Verpasst“. Eine leere Kategorie zeigt aufgeklappt „Bisher keine Abgaben in diesem Modul.“

**Wunsch:** Die Punkte sind für Studierende wichtig (Zulassung zur Klausur). Eine kleine Fortschrittsanzeige (Balken oder Ring) wäre denkbar.

### 6.6 Event-Detail (Unterseite, Titel „Details“)

Von oben nach unten:
1. Zeile mit Modulfarb-Punkt: „Analysis für Informatik (VO) · Abgabe“ (bei selbst angelegten Events zusätzlich „· manuell“)
2. **Titel groß**, z. B. „Übungsblatt 3 ist fällig“ (bei Vorlesungen steht einfach „Vorlesung“)
3. Zeitangabe: bei Abgaben „Frist: in 3 Tagen · Mo 26.10., 23:59“, bei Vorlesungen „Do 15.10., 10:30–12:00“
4. Räume, je eine Zeile, z. B. „[1420|001] Hörsaal A“
5. Gegebenenfalls Hinweisboxen (gelb):
   - „Dieses Event ist seit 18.10.2026 nicht mehr im Moodle-Kalender. Vielleicht wurde es verschoben oder abgesagt.“
   - „Ausgeblendet – erscheint nicht in der To-do-Liste.“
6. **Status** als Auswahlliste mit Häkchen (nicht bei Übungen)
7. **Punkte** (nur bei Abgaben): zwei kleine Zahlenfelder nebeneinander „[ 7,5 ] / [ 10 ]“ (erreicht / maximal). Bei ungültiger Eingabe roter Rahmen und z. B. „Bitte nur Zahlen eingeben, z. B. 7,5.“
8. **Notiz:** mehrzeiliges Feld, höchstens 50 Zeichen. Unten rechts im Feld ein Zähler „27 / 50“, bei 50 rot.
9. **Beschreibung** aus Moodle (kann lang sein, mehrzeilig, Text markierbar)
10. Knöpfe: **„Ausblenden“** bzw. **„Wieder einblenden“** (sekundär) und bei selbst angelegten Events **„Löschen“** (destruktiv, mit Systemdialog)

### 6.7 Neues Event (Modal von unten, Titel „Neues Event“)

Für Termine, die nicht in Moodle stehen.
- **Typ:** Chips „Abgabe“ | „Vorlesung“
- **Modul:** Chips „Ohne Modul“, alle Module, „+ Neues Modul“. Letzteres blendet ein Textfeld „Name des Moduls“ ein.
- **Titel:** Textfeld (Platzhalter „z. B. Übungsblatt 4“)
- **Deadline** (Abgabe): Felder „Datum“ (TT.MM.JJJJ) und „Uhrzeit“ (HH:MM)
- **Termin** (Vorlesung): „Datum“, „Beginn“, „Ende“
- **Raum (optional)**, nur bei Vorlesung
- Fehlermeldung, z. B. „Das Ende muss nach dem Beginn liegen.“
- Primärknopf **„Speichern“**

Ein nativer Datums- und Uhrzeitwähler wäre schöner als Textfelder und darf so gestaltet werden.

### 6.8 Tab „Einstellungen“

Titel **„Einstellungen“**, darunter Abschnitte mit kleiner Überschrift in Großbuchstaben, jeweils als Karte:

1. **Moodle-Verbindung:** „Verbunden mit moodle.rwth-aachen.de“, darunter „Der Link wird nur auf diesem Gerät gespeichert.“ Knöpfe „Link ändern“ (sekundär) und „Link entfernen“ (destruktiv).
2. **Vorlesungen standardmäßig:** Einfachauswahl „Nachzuarbeiten“ / „Erledigt“
3. **Anzeige:** Schalter „Nur Abgaben anzeigen“. Darunter klein: „Termine aus Moodle vor dem Mo 12.10.2026 werden nicht angezeigt (Beginn der Woche, in der du die App eingerichtet hast).“
4. **Module:** Hinweis „Antippen, um Vorlesungen, Übungen oder Abgaben einzeln auszublenden.“ Dann je Modul eine Zeile:
   - Modulfarb-Punkt, Name (Kürzel), Aufklapp-Pfeil, rechts ein Schalter (ganzes Modul ein/aus)
   - Zugeklappt ggf. klein darunter: „Übungen ausgeblendet“
   - Aufgeklappt drei eingerückte Schalter: Vorlesungen, Übungen, Abgaben. Ist das ganze Modul aus, sind sie ausgegraut.
5. **Ausgeblendet:** eine Menüzeile „Ausgeblendete Events · 2 ›“ führt zur Seite 6.9
6. **Aktualisieren:** „Letzter Abruf: vor 12 Min. (15.10., 14:05)“, ggf. rote Fehlerbox, Primärknopf „Jetzt aktualisieren“
7. **Daten:** „Löscht alles, was die App auf diesem Gerät gespeichert hat.“, Knopf „Alle Daten löschen“ (destruktiv, mit Systemdialog)

### 6.9 Ausgeblendet (Unterseite)

- Hinweis: „Diese Events hast du ausgeblendet. ‚Einblenden‘ holt sie zurück in die Listen.“
- Event-Zeilen, rechts statt des Status ein kleiner Knopf **„Einblenden“**, danach Rückgängig-Leiste
- Fußzeile: „Ganze Module oder ihre Vorlesungen, Übungen und Abgaben blendest du unter Einstellungen → Module ein und aus.“
- Leerzustand: „Nichts ausgeblendet“ und „Einzelne Events blendest du in ihrer Detailansicht aus.“

---

## 7. Wiederkehrende Komponenten

### 7.1 Event-Zeile (wichtigste Komponente)

```
┃ Analysis für Informatik                  [Nachzuarbeiten]
┃ Vorlesung
┃ Mo 05.10., 10:30–12:00 · [1420|001] Hörsaal A
```
- **Links:** schmaler, senkrechter Streifen in der Modulfarbe
- **Zeile 1:** Modulname klein und gedämpft (einzeilig, gekürzt), rechts das **Status-Badge**
- **Zeile 2:** Titel, fett, bis zu 2 Zeilen
- **Zeile 3:** Details, gedämpft. Bei Abgaben relative und absolute Frist („in 3 Tagen · Mo 26.10., 23:59“; überfällig: „vor 2 Tagen · …“ in Rot). Bei Vorlesungen Datum, Uhrzeit und Räume.
- **Optional:** „Aus Moodle entfernt“ (Warnfarbe) oder „Punkte: 7,5 / 10“
- **Rechts statt Badge** kann stehen: eine Anzahl (Stapel), ein Knopf („Einblenden“) oder nichts (Übungen)
- Die ganze Zeile ist antippbar (Detail), das Badge separat (Status ändern)

### 7.2 Status-Badge

Kleine Pille mit Text. **Die Farbbedeutung muss erhalten bleiben**, die genauen Töne sind frei:

| Ton | Status |
|---|---|
| neutral/grau | Ausstehend, Nachzuarbeiten, Verpasst |
| gelb | Angefangen |
| blau | Erledigt (Abgabe: fertig, aber noch nicht hochgeladen) |
| grün | Abgegeben, Erledigt (Vorlesung) |
| rot | Überfällig (Text „Überfällig“ statt „Ausstehend“) |

### 7.3 Stapel und Stapel-Popup

Hat ein Modul mehrere nachzuarbeitende (bzw. erledigte) Vorlesungen, erscheint nur **eine** Zeile. Sie zeigt die älteste (bzw. neueste) Vorlesung, rechts aber statt des Badges die **Anzahl** („3“) als Pille. Antippen öffnet ein **schwebendes Popup in der Bildschirmmitte** (Karte mit abgedunkeltem Hintergrund):
- Kopf: Modulfarb-Punkt, Modulname, „3 Vorlesungen nachzuarbeiten“, rechts „Fertig“
- darunter die einzelnen Vorlesungen als Event-Zeilen, nach Datum
- Abhaken im Popup lässt den Eintrag sofort verschwinden. Nach dem letzten schließt sich das Popup.

**Wunsch:** Der Stapel soll als Stapel erkennbar sein, z. B. durch angedeutete Karten dahinter. Bisher gibt es nur die Anzahl.

### 7.4 Statusauswahl (Bottom Sheet)

Blatt von unten mit abgedunkeltem Hintergrund. Oben eine kurze Bezeichnung, z. B. „Analysis für Informatik · Mo 05.10.“ oder „Übungsblatt 3 ist fällig“, darunter die möglichen Status als Liste mit Häkchen beim aktuellen. Bei Abgaben sind das 5 Optionen, bei Vorlesungen 2.

**Wunsch:** Ein schnelleres Abhaken direkt in der Zeile (z. B. Checkbox oder Wischgeste) wäre erwünscht, falls es sich schlüssig gestalten lässt.

### 7.5 Rückgängig-Leiste (Snackbar)

Dunkle Leiste über dem unteren Rand, 5 Sekunden sichtbar: links „Abgegeben: Übungsblatt 3 ist fällig“, rechts **„RÜCKGÄNGIG“**. Sie fährt weich ein und aus.

### 7.6 Weitere Bausteine

- **Abschnittsüberschrift** in Listen: groß und fett („Abgaben“) mit gedämpfter Anzahl daneben
- **Karte:** abgesetzte Fläche mit runden Ecken für Einstellungsgruppen und Modulkategorien
- **Knöpfe:** primär (Akzentfarbe), sekundär (Fläche), destruktiv (rote Schrift), jeweils mit Lade- und Deaktiviert-Zustand
- **Chips** zur Einfachauswahl (Typ, Modul)
- **Textfelder:** einzeilig, mehrzeilig mit Zähler, kleine Zahlenfelder
- **Hinweisboxen:** Warnung (gelb) und Fehler (rot)
- **Leerzustände** mit Titel und Text (Illustrationen erwünscht)
- **Modulfarben:** 8 gut unterscheidbare Farben, in hell und dunkel lesbar. Ein Modul behält immer seine Farbe.

---

## 8. Aktuelles Erscheinungsbild (nur zur Orientierung)

Derzeit sehr schlicht: weißer bzw. schwarzer Hintergrund, Flächen in Hellgrau (#F0F0F3) bzw. Dunkelgrau (#212225), Akzent Blau (#0B6BCB, dunkel #4C9EFF), Systemschrift, Pillen-Badges, Karten mit 14 pt Ecken. Modulfarben: #E5484D, #F76B15, #E2A336, #46A758, #12A594, #0090FF, #6E56CF, #D6409F. Das alles darf vollständig neu gestaltet werden.

---

## 9. Beispieldaten für Entwürfe

Heute ist **Donnerstag, 15.10.2026, 11:00 Uhr**.

**Module:** Analysis für Informatik (VO), Datenbanken (VU), IT-Sicherheit (VU), Spieleprogrammierung (PR), Elements of Machine Learning and Data Science (VU)

**To-do:**
- **Heute (2):** Analysis für Informatik · Vorlesung · 10:30–12:00 · Hörsaal A, Hörsaal B (Status: Nachzuarbeiten); Datenbanken · Vorlesung · 14:30–16:00 · Seminarraum 1 (Status: Erledigt, grün)
- **Abgaben (4):**
  - IT-Sicherheit · „Team-Anmeldung ist fällig“ · vor 2 Tagen · Di 13.10., 17:00 (**Überfällig**, rot)
  - Datenbanken · „Gruppenanmeldung ist fällig“ · in 4 Tagen · Mo 19.10., 23:59 (Ausstehend)
  - Analysis für Informatik · „Übungsblatt 1 ist fällig“ · in 11 Tagen · Mo 26.10., 23:59 (Angefangen, gelb)
  - Spieleprogrammierung · „Assignment for Unit 1 - Search is due“ · in 15 Tagen · Fr 30.10., 23:59 (Erledigt, blau)
- **Nachzuarbeiten (6):** Stapel Analysis für Informatik (3, ab Mo 05.10.), Stapel Datenbanken (2, ab Di 06.10.), Spieleprogrammierung · Vorlesung · Mi 07.10., 16:30–18:00

**Modulseite Analysis für Informatik:** Klausurtermine „1. Termin 12.02., 2. Termin 20.03.“, Zulassung „50 % der Übungspunkte“, 5 Vorlesungen (2 nachzuarbeiten), 3 Abgaben mit 23,5 / 30 Punkten = 78,3 %, 0 Übungen.

---

## 10. Freiheiten und Grenzen

**Frei gestaltbar:** Farben, Typografie, Abstände, Formen, Icons, Illustrationen, Logo, Animationen, die Anmutung der Karten und Listen, Onboarding-Gestaltung, Leerzustände.

**Bitte beibehalten:**
- die vier Tabs und die Screens mit ihren Inhalten
- die Reihenfolge der Bereiche in der To-do-Liste (Heute, Abgaben, Nachzuarbeiten)
- die Bedeutung der Statusfarben (7.2) und dass Status immer auch als Text dasteht
- die feste Farbe pro Modul
- Rückgängig nach dem Abhaken
- die schwebenden Knöpfe „Zu Moodle ↗“ und „+“

**Bewusst nicht Teil der App** (bitte nicht entwerfen): Anmeldung oder Benutzerkonto, Cloud-Sync, Benachrichtigungen, Stundenplan-Import aus RWTHonline, wiederkehrende eigene Termine, soziale Funktionen, Werbung.
