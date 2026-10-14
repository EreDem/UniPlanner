# Datenmodell

Quelle der Wahrheit für das Schema ist [`src/db/schema.sql`](../src/db/schema.sql) (aktueller Stand, Version 4; bestehende Installationen werden über [`src/db/migrationen/`](../src/db/migrationen/) aktualisiert), für Typen und Kernregeln [`src/model/types.ts`](../src/model/types.ts).

## Tabellen

```mermaid
erDiagram
    modul ||--o{ event : "gehört zu"
    event ||--o{ event_uid : "hat UIDs"
    event ||--o| status : "hat Status"
    event ||--o| nutzerdaten : "hat Notiz, Punkte"

    modul {
        TEXT id PK "Slug, z. B. datenbanken"
        TEXT name
        TEXT art "Kürzel der zuerst importierten Kategorie"
        TEXT quelle "moodle | manuell"
        INTEGER ausgeblendet "ganzes Modul, nur vom Nutzer"
        INTEGER vorlesungen_ausgeblendet
        INTEGER uebungen_ausgeblendet "sonstige Veranstaltungen"
        INTEGER abgaben_ausgeblendet
    }
    event {
        TEXT id PK "erste UID oder manuell:uuid"
        TEXT typ "vorlesung | abgabe"
        TEXT quelle "moodle | manuell"
        TEXT modul_id FK
        TEXT titel
        TEXT beschreibung
        INTEGER start_ms
        INTEGER ende_ms
        TEXT raeume "JSON-Array"
        INTEGER ausgeblendet
        INTEGER ausgeblendet_vom_nutzer
        INTEGER moodle_last_modified_ms
        INTEGER entfernt_ms "gesetzt = aus Moodle verschwunden"
        TEXT kuerzel "VO, VU, TU, UE, PR, SE, PS"
    }
    event_uid {
        TEXT uid PK
        TEXT event_id FK
    }
    status {
        TEXT event_id PK, FK
        TEXT status
        INTEGER geaendert_ms
    }
    nutzerdaten {
        TEXT event_id PK, FK
        TEXT notiz "höchstens 50 Zeichen"
        REAL punkte_erreicht "nur Abgaben"
        REAL punkte_max "nur Abgaben, größer 0"
        INTEGER geaendert_ms
    }
    einstellung {
        TEXT schluessel PK
        TEXT wert
    }
```

- Der Nutzerstatus liegt in `status`, Notiz und Punkte in `nutzerdaten`. Ein Import fasst beide Tabellen nie an.
- Punkte sind Zahlen, damit sie sich später auswerten lassen (z. B. Summe oder Anteil pro Modul).
- Fehlt eine Zeile in `status`, gilt der Standard: Vorlesung → Einstellung (Default `nachzuarbeiten`), Abgabe → `ausstehend`.
- `ausgeblendet` setzt der Import für Öffnungs-Marker. Hat der Nutzer selbst ein- oder ausgeblendet (`ausgeblendet_vom_nutzer = 1`), überschreibt der Import das nicht mehr.
- `einstellung` enthält `vorlesung_standard`, `nur_abgaben`, `startdatum_ms` (Montag der Einrichtungswoche; Moodle-Events davor werden nicht angezeigt), `letzter_abruf_ms`, `letzter_abruf_fehler` und `beispieldaten`.
- Die Moodle-Kalender-URL liegt **nicht** in der Datenbank, sondern nur im `expo-secure-store`.

## Import-Ablauf

```mermaid
flowchart TD
    A[Kalender-URL aus SecureStore] --> B[abruf.ts: fetch mit Timeout,<br/>Prüfung auf BEGIN:VCALENDAR]
    B --> C[parse.ts: VEVENT → RohEvent]
    C --> D[verarbeite.ts: Modul ableiten,<br/>klassifizieren]
    D --> E{Titel endet auf<br/>beginnt / gestartet / opens?}
    E -- ja --> F[ausgeblendet = 1,<br/>trotzdem speichern]
    E -- nein --> G
    F --> G{Vorlesung?}
    G -- ja --> H[Deduplizieren:<br/>Modul + Start + Ende]
    G -- nein --> I
    H --> I[repository.ts: in einer Transaktion<br/>über irgendeine UID wiederfinden,<br/>aktualisieren oder anlegen]
    I --> J[Zukünftige Moodle-Events, die fehlen:<br/>entfernt_ms setzen]
```

## Status

### Vorlesung

```mermaid
stateDiagram-v2
    [*] --> nachzuarbeiten : Standard
    [*] --> erledigt : Einstellung „standardmäßig erledigt“
    nachzuarbeiten --> erledigt
    erledigt --> nachzuarbeiten
```

Erscheint am Tag der Vorlesung unter „Heute“ (unabhängig vom Status), danach mit Status `nachzuarbeiten` unter „Nachzuarbeiten“ oder mit `erledigt` im Erledigt-Tab.

Andere Veranstaltungen (Typ `vorlesung`, aber laut Titel oder Kürzel Übung, Tutorium usw., siehe `istVorlesung`; in der App „Übung“) haben keinen Status: Sie erscheinen nur am selben Tag unter „Heute“.

Pro Modul lassen sich Vorlesungen, Übungen und Abgaben einzeln ausblenden (`modul.*_ausgeblendet`), zusätzlich zum ganzen Modul (`modul.ausgeblendet`).

### Abgabe

```mermaid
stateDiagram-v2
    [*] --> ausstehend
    ausstehend --> angefangen
    angefangen --> erledigt
    erledigt --> abgegeben
    ausstehend --> abgegeben
    abgegeben --> [*] : wandert in den Erledigt-Tab
```

`erledigt` = fertig bearbeitet, aber noch nicht abgegeben (z. B. Warten auf Abgabepartner).
