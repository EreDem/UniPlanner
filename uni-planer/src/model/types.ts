// Typen und Kernregeln des Uni-Planers.
// Rein, ohne Expo-Abhängigkeiten, damit mit Jest ohne Gerät testbar.
// Alle Zeitpunkte sind UTC-Millisekunden. Anzeige und Tagesgrenzen in Europe/Berlin (siehe src/zeit.ts).

/** Im MVP gibt es nur diese zwei Typen. Anmeldungen, Umfragen usw. zählen als Abgabe. */
export type EventTyp = 'vorlesung' | 'abgabe';

export type Quelle = 'moodle' | 'manuell';

export type VorlesungStatus = 'nachzuarbeiten' | 'erledigt';

/**
 * `erledigt` = fertig bearbeitet, aber noch nicht abgegeben. Erst `abgegeben` oder `verpasst`
 * entfernen sie aus der To-do-Liste. `verpasst` = Frist verstrichen, Abgabe nicht mehr möglich.
 */
export type AbgabeStatus = 'ausstehend' | 'angefangen' | 'erledigt' | 'abgegeben' | 'verpasst';

export type Status = VorlesungStatus | AbgabeStatus;

export const STATUS_WERTE = {
  vorlesung: ['nachzuarbeiten', 'erledigt'],
  abgabe: ['ausstehend', 'angefangen', 'erledigt', 'abgegeben', 'verpasst'],
} as const satisfies { vorlesung: readonly VorlesungStatus[]; abgabe: readonly AbgabeStatus[] };

export const STATUS_TEXT: Record<Status, string> = {
  nachzuarbeiten: 'Nachzuarbeiten',
  erledigt: 'Erledigt',
  ausstehend: 'Ausstehend',
  angefangen: 'Angefangen',
  abgegeben: 'Abgegeben',
  verpasst: 'Verpasst',
};

/** Kurze Erklärung pro Status für die Statusauswahl. `erledigt` bedeutet je nach Typ etwas anderes. */
export function statusErklaerung(typ: EventTyp, status: Status): string {
  if (typ === 'vorlesung') return status === 'erledigt' ? 'Nachgearbeitet' : 'Noch nicht nachgearbeitet';
  switch (status) {
    case 'angefangen':
      return 'In Bearbeitung';
    case 'erledigt':
      return 'Fertig, aber noch nicht hochgeladen';
    case 'abgegeben':
      return 'Hochgeladen, verschwindet aus der Liste';
    case 'verpasst':
      return 'Frist verstrichen, keine Abgabe mehr möglich';
    default:
      return 'Noch nicht begonnen';
  }
}

/** Veranstaltungsarten zu den Kürzeln aus CATEGORIES, z. B. für die Modulseite. */
export const KUERZEL_TEXT: Readonly<Record<string, string>> = {
  VO: 'Vorlesung',
  VU: 'Vorlesung mit Übung',
  TU: 'Tutorium',
  UE: 'Übung',
  PR: 'Praktikum',
  SE: 'Seminar',
  PS: 'Proseminar',
};

export interface Modul {
  /** Slug des Namens, z. B. `datenbanken`. */
  id: string;
  name: string;
  /** Veranstaltungsart aus dem Präfix, z. B. `VU` aus `(VU) Datenbanken`. */
  art: string | null;
  quelle: Quelle;
  /** Ganzes Modul ausgeblendet; gilt unabhängig von `ausgeblendeteKategorien`. */
  ausgeblendet: boolean;
  /** Einzelne Kategorien des Moduls ausgeblendet. */
  ausgeblendeteKategorien: Readonly<Record<Kategorie, boolean>>;
}

/** Was sich pro Modul ausblenden lässt. „Übungen“ = alle Veranstaltungen außer Vorlesungen. */
export type Kategorie = 'vorlesungen' | 'uebungen' | 'abgaben';

export const KATEGORIEN: readonly Kategorie[] = ['vorlesungen', 'uebungen', 'abgaben'];

export const KATEGORIE_TEXT: Record<Kategorie, string> = {
  vorlesungen: 'Vorlesungen',
  uebungen: 'Übungen',
  abgaben: 'Abgaben',
};

export const KEINE_KATEGORIE_AUSGEBLENDET: Readonly<Record<Kategorie, boolean>> = {
  vorlesungen: false,
  uebungen: false,
  abgaben: false,
};

export interface UniEvent {
  /** Erste UID der Gruppe (sortiert) oder `manuell:<uuid>`. */
  id: string;
  typ: EventTyp;
  quelle: Quelle;
  modulId: string | null;
  titel: string;
  beschreibung: string | null;
  startMs: number;
  endeMs: number;
  raeume: string[];
  ausgeblendet: boolean;
  /** Gesetzt, wenn das Event aus dem Moodle-Kalender verschwunden ist. Es wird nie gelöscht. */
  entferntMs: number | null;
  /** Kürzel der Veranstaltungsart aus CATEGORIES, z. B. `TU` aus `(TU) Analysis`. */
  kuerzel: string | null;
}

/** Ein einzelnes VEVENT, wie es aus der .ics gelesen wurde. */
export interface RohEvent {
  uid: string;
  titel: string;
  beschreibung: string | null;
  startMs: number;
  endeMs: number;
  ort: string | null;
  /** Inhalt von `CATEGORIES`, z. B. `(VU) Datenbanken`. */
  kategorie: string | null;
  lastModifiedMs: number | null;
}

export interface Einstellungen {
  /** Status von Vorlesungen ohne gespeicherten Status. */
  vorlesungStandard: VorlesungStatus;
  /** Vorlesungen ganz aus der To-do-Liste ausblenden. */
  nurAbgaben: boolean;
  /**
   * Moodle-Events, die vorher beginnen, werden nicht angezeigt. Moodle exportiert die letzten
   * 60 Tage; wer die App mitten im Semester einrichtet, soll keine volle Liste geerbter Termine sehen.
   * `null` = alles anzeigen (z. B. bei Beispieldaten).
   */
  startdatumMs: number | null;
}

export const STANDARD_EINSTELLUNGEN: Einstellungen = {
  vorlesungStandard: 'nachzuarbeiten',
  nurAbgaben: false,
  startdatumMs: null,
};

// Termine mit Dauer (Typ `vorlesung`) sind entweder Vorlesungen oder andere Veranstaltungen
// (Übung, Tutorium, Praktikum …). Erkennung über den Titel und das Kürzel aus CATEGORIES.
const VORLESUNG_IM_TITEL = /vorlesung|lecture/i;
const ANDERE_VERANSTALTUNG_IM_TITEL =
  /übung|uebung|tutori|exercise|praktikum|labor|\blab\b|seminar|sprechstunde|fragestunde|repetitorium|kolloquium|workshop|klausur|prüfung|pruefung|exam/i;

/**
 * Kürzel anderer Veranstaltungen: Tutorium, Übung, Praktikum, Seminar, Proseminar.
 * VO (Vorlesung) und VU (Vorlesung mit Übung, gemischt) gelten als Vorlesung, ebenso unbekannte Kürzel.
 */
const KUERZEL_ANDERE_VERANSTALTUNG = new Set(['TU', 'UE', 'PR', 'SE', 'PS']);

type TitelInfo = Pick<UniEvent, 'typ' | 'quelle' | 'titel' | 'kuerzel'>;

/**
 * Vorlesung, die nachgearbeitet wird? Andere Veranstaltungen erscheinen nur unter „Heute“.
 * Reihenfolge: „Vorlesung“ im Titel → Vorlesung; Übung, Tutorium … im Titel → andere Veranstaltung;
 * Kürzel TU, UE, PR, SE, PS → andere Veranstaltung; sonst (VO, VU, unbekannt, ohne) → Vorlesung.
 * Der Titel geht vor, weil ein Kurs wie „(VU) Datenbanken“ Vorlesungen und Übungen enthält.
 * Manuelle Vorlesungen sind immer Vorlesungen, der Typ wurde bewusst gewählt.
 */
export function istVorlesung(event: TitelInfo): boolean {
  if (event.typ !== 'vorlesung') return false;
  if (event.quelle === 'manuell') return true;
  if (VORLESUNG_IM_TITEL.test(event.titel)) return true;
  if (ANDERE_VERANSTALTUNG_IM_TITEL.test(event.titel)) return false;
  return !KUERZEL_ANDERE_VERANSTALTUNG.has(event.kuerzel?.trim().toUpperCase() ?? '');
}

/** Kategorie für das Ausblenden pro Modul. */
export function kategorieVon(event: TitelInfo): Kategorie {
  if (event.typ === 'abgabe') return 'abgaben';
  return istVorlesung(event) ? 'vorlesungen' : 'uebungen';
}

/** „Abgabe“, „Vorlesung“ oder „Übung“ (sammelt alle sonstigen Veranstaltungen wie Tutorien). */
export function artText(event: TitelInfo): string {
  const kategorie = kategorieVon(event);
  if (kategorie === 'abgaben') return 'Abgabe';
  return kategorie === 'vorlesungen' ? 'Vorlesung' : 'Übung';
}

/**
 * Titel für die Anzeige. Moodle-Vorlesungen heißen einheitlich „Vorlesung“, denn ihr Moodle-Titel
 * ist meist nur der Kursname, der ohnehin als Modul darübersteht. Andere Veranstaltungen
 * (z. B. „Tutorium“) und manuelle Events behalten ihren Titel.
 */
export function anzeigeTitel(event: TitelInfo): string {
  return event.quelle === 'moodle' && istVorlesung(event) ? 'Vorlesung' : event.titel;
}

/** `DTSTART == DTEND` → Abgabe (Frist), sonst → Vorlesung. */
export function klassifiziere(startMs: number, endeMs: number): EventTyp {
  return startMs === endeMs ? 'abgabe' : 'vorlesung';
}

// Moodle erzeugt für manche Aktivitäten ein Event beim Öffnen und eins beim Schließen.
// Nur das Schließen ist eine Aufgabe.
const OEFFNUNGS_ENDUNGEN = ['beginnt', 'gestartet', 'opens'];

export function istOeffnungsMarker(titel: string): boolean {
  const normiert = titel.trim().toLowerCase();
  return OEFFNUNGS_ENDUNGEN.some((endung) => normiert.endsWith(endung));
}

/** Gleiches Modul + gleiche Start- und Endzeit = ein Event (z. B. Übertragung in zwei Hörsäle). */
export function duplikatSchluessel(modulId: string | null, startMs: number, endeMs: number): string {
  return `${modulId ?? ''}|${startMs}|${endeMs}`;
}

export function istGueltigerStatus(typ: EventTyp, status: Status): boolean {
  return (STATUS_WERTE[typ] as readonly Status[]).includes(status);
}

/**
 * Status, der für ein Event gilt. Ohne (passenden) gespeicherten Status greift bei Vorlesungen
 * der Standard aus den Einstellungen, bei Abgaben `ausstehend`.
 */
export function effektiverStatus(
  typ: EventTyp,
  gespeichert: Status | null | undefined,
  einstellungen: Einstellungen,
): Status {
  if (gespeichert && istGueltigerStatus(typ, gespeichert)) return gespeichert;
  return typ === 'vorlesung' ? einstellungen.vorlesungStandard : 'ausstehend';
}

export interface ToDoEintrag {
  event: UniEvent;
  modul: Modul | null;
  status: Status;
  /** Abgabe, deren Frist vorbei ist und die noch nicht abgegeben wurde. */
  ueberfaellig: boolean;
}

export type BereichSchluessel =
  | 'heute'
  | 'abgaben'
  | 'nachzuarbeiten'
  | 'erledigte-abgaben'
  | 'erledigte-vorlesungen';

export interface ToDoBereich {
  schluessel: BereichSchluessel;
  titel: string;
  eintraege: ToDoEintrag[];
}

export interface ToDoEingabe {
  events: readonly UniEvent[];
  module: readonly Modul[];
  /** Gespeicherte Status nach Event-ID. */
  status: ReadonlyMap<string, Status>;
  einstellungen: Einstellungen;
  jetztMs: number;
  /** Grenzen des heutigen Tages in Europe/Berlin, Ende exklusiv. */
  heute: { startMs: number; endeMs: number };
}

/**
 * Gehört das Event in den Erledigt-Tab? Vorlesung: `erledigt`. Abgabe: erst `abgegeben`, denn
 * `erledigt` heißt dort „fertig, aber noch nicht hochgeladen“ und bleibt bewusst in der To-do-Liste.
 */
export function istErledigt(typ: EventTyp, status: Status): boolean {
  return typ === 'vorlesung' ? status === 'erledigt' : status === 'abgegeben';
}

/**
 * Ist nichts mehr zu tun, sodass das Event aus der To-do-Liste verschwindet? Erledigt (siehe
 * `istErledigt`) oder eine verpasste Abgabe. Verpasste Abgaben stehen nicht im Erledigt-Tab,
 * sondern nur noch auf der Modulseite.
 */
export function istAbgeschlossen(typ: EventTyp, status: Status): boolean {
  return istErledigt(typ, status) || (typ === 'abgabe' && status === 'verpasst');
}

/** Hat das Event einen Status (und damit eine Checkbox)? Übungen, Tutorien usw. nicht. */
export function hatStatus(event: TitelInfo): boolean {
  return event.typ === 'abgabe' || istVorlesung(event);
}

/**
 * Status nach einem Tipp auf die Checkbox. Abgehakt ist ein Event genau dann, wenn es erledigt ist
 * (siehe `istErledigt`), egal ob per Checkbox oder über die Statusauswahl. Abhaken setzt den letzten
 * Status (Abgabe: abgegeben, Vorlesung: erledigt), ein erneuter Tipp setzt den ersten
 * (ausstehend bzw. nachzuarbeiten).
 */
export function statusNachAbhaken(typ: EventTyp, status: Status): Status {
  if (istErledigt(typ, status)) return STATUS_WERTE[typ][0];
  return typ === 'abgabe' ? 'abgegeben' : 'erledigt';
}

/** Moodle-Event vor dem Startdatum? Solche Events zeigt die App nirgends an. */
export function istVorStartdatum(event: UniEvent, einstellungen: Einstellungen): boolean {
  const startdatum = einstellungen.startdatumMs;
  return startdatum !== null && event.quelle === 'moodle' && event.startMs < startdatum;
}

/**
 * Sichtbare Events mit Modul und effektivem Status. Es fehlen: Moodle-Events vor dem Startdatum,
 * ausgeblendete Events, Events ausgeblendeter Module oder ausgeblendeter Kategorien eines Moduls
 * (Vorlesungen, Übungen, Abgaben), bei „nur Abgaben“ alle Vorlesungen und aus
 * Moodle entfernte Vorlesungen (z. B. ausgefallene Termine). Entfernte Abgaben bleiben sichtbar,
 * damit eine verschwundene Frist nicht unbemerkt untergeht.
 */
function sichtbareEintraege(eingabe: ToDoEingabe): ToDoEintrag[] {
  const { einstellungen, jetztMs } = eingabe;
  const modulNachId = new Map(eingabe.module.map((modul) => [modul.id, modul]));

  return eingabe.events.flatMap((event) => {
    if (istVorStartdatum(event, einstellungen)) return [];
    if (event.ausgeblendet) return [];
    const modul = event.modulId ? (modulNachId.get(event.modulId) ?? null) : null;
    if (modul && (modul.ausgeblendet || modul.ausgeblendeteKategorien[kategorieVon(event)])) return [];
    if (event.typ === 'vorlesung' && (einstellungen.nurAbgaben || event.entferntMs !== null)) return [];

    const status = effektiverStatus(event.typ, eingabe.status.get(event.id), einstellungen);
    const ueberfaellig = event.typ === 'abgabe' && !istAbgeschlossen(event.typ, status) && event.startMs < jetztMs;
    return [{ event, modul, status, ueberfaellig }];
  });
}

function istHeute(event: UniEvent, heute: ToDoEingabe['heute']): boolean {
  return event.startMs >= heute.startMs && event.startMs < heute.endeMs;
}

/**
 * Baut die To-do-Liste:
 * 1. Heute – alle heutigen Veranstaltungen nach Beginn (Vorlesungen, Übungen, Tutorien …),
 *    auch erledigte Vorlesungen (die bleiben bis Tagesende stehen)
 * 2. Abgaben – alle nicht abgegebenen und nicht verpassten, nach Deadline
 * 3. Nachzuarbeiten – nicht erledigte vergangene Vorlesungen (vor heute), älteste zuerst;
 *    andere Veranstaltungen landen hier nie (siehe `istVorlesung`)
 * Leere Bereiche werden weggelassen.
 */
export function baueToDoListe(eingabe: ToDoEingabe): ToDoBereich[] {
  const { jetztMs, heute } = eingabe;
  const heuteListe: ToDoEintrag[] = [];
  const abgaben: ToDoEintrag[] = [];
  const nachzuarbeiten: ToDoEintrag[] = [];

  for (const eintrag of sichtbareEintraege(eingabe)) {
    const { event, status } = eintrag;
    if (event.typ === 'vorlesung' && istHeute(event, heute)) {
      heuteListe.push(eintrag);
      continue;
    }
    if (event.typ === 'vorlesung' && !istVorlesung(event)) continue;
    if (istAbgeschlossen(event.typ, status)) continue;

    if (event.typ === 'abgabe') abgaben.push(eintrag);
    else if (event.startMs < heute.startMs && event.endeMs <= jetztMs) nachzuarbeiten.push(eintrag);
  }

  return ohneLeere([
    { schluessel: 'heute', titel: 'Heute', eintraege: heuteListe.sort(nachBeginn) },
    { schluessel: 'abgaben', titel: 'Abgaben', eintraege: abgaben.sort(nachBeginn) },
    { schluessel: 'nachzuarbeiten', titel: 'Nachzuarbeiten', eintraege: nachzuarbeiten.sort(nachBeginn) },
  ]);
}

/**
 * Baut die Liste „Ausgeblendet“ (Einstellungen): vom Nutzer ausgeblendete Events, nach Datum.
 * `eingabe.events` sind nur diese Events (siehe `ladeVomNutzerAusgeblendet`). Events vor dem
 * Startdatum fehlen, weil sie auch eingeblendet nirgends erscheinen würden.
 */
export function baueAusgeblendetListe(
  eingabe: Pick<ToDoEingabe, 'events' | 'module' | 'status' | 'einstellungen' | 'jetztMs'>,
): ToDoEintrag[] {
  const { einstellungen, jetztMs } = eingabe;
  const modulNachId = new Map(eingabe.module.map((modul) => [modul.id, modul]));

  return eingabe.events
    .filter((event) => event.ausgeblendet && !istVorStartdatum(event, einstellungen))
    .map((event) => {
      const status = effektiverStatus(event.typ, eingabe.status.get(event.id), einstellungen);
      return {
        event,
        modul: event.modulId ? (modulNachId.get(event.modulId) ?? null) : null,
        status,
        ueberfaellig: event.typ === 'abgabe' && !istAbgeschlossen(event.typ, status) && event.startMs < jetztMs,
      };
    })
    .sort(nachBeginn);
}

/**
 * Baut den Erledigt-Tab: abgegebene Abgaben und erledigte Vorlesungen, jeweils neueste zuerst.
 * Andere Veranstaltungen (Übung, Tutorium …) haben keinen Status und fehlen hier.
 * Heutige Vorlesungen fehlen, sie stehen bis Tagesende unter „Heute“ in der To-do-Liste.
 * Vorlesungen, die nur über den Standard „erledigt“ sind, erscheinen erst nach ihrem Ende,
 * damit dort keine künftigen Termine stehen, die niemand abgehakt hat.
 */
export function baueErledigtListe(eingabe: ToDoEingabe): ToDoBereich[] {
  const abgaben: ToDoEintrag[] = [];
  const vorlesungen: ToDoEintrag[] = [];

  for (const eintrag of sichtbareEintraege(eingabe)) {
    const { event, status } = eintrag;
    if (!istErledigt(event.typ, status)) continue;

    if (event.typ === 'abgabe') abgaben.push(eintrag);
    else if (!istVorlesung(event) || istHeute(event, eingabe.heute)) continue;
    else if (eingabe.status.has(event.id) || event.endeMs <= eingabe.jetztMs) vorlesungen.push(eintrag);
  }

  const neuesteZuerst = (a: ToDoEintrag, b: ToDoEintrag) => nachBeginn(b, a);
  return ohneLeere([
    { schluessel: 'erledigte-abgaben', titel: 'Abgegeben', eintraege: abgaben.sort(neuesteZuerst) },
    { schluessel: 'erledigte-vorlesungen', titel: 'Vorlesungen', eintraege: vorlesungen.sort(neuesteZuerst) },
  ]);
}

/** Mehrere Einträge desselben Moduls, in der Liste als eine Zeile mit Anzahl. */
export interface Stapel {
  modulId: string;
  modul: Modul | null;
  /** In der Reihenfolge der Eingabe (bei „Nachzuarbeiten“: nach Datum, älteste zuerst). */
  eintraege: ToDoEintrag[];
}

export type ListenPosten = { art: 'eintrag'; eintrag: ToDoEintrag } | { art: 'stapel'; stapel: Stapel };

/**
 * Fasst Einträge desselben Moduls zu einem Stapel zusammen, sobald es mehr als einen gibt.
 * Der Stapel steht an der Stelle seines ersten Eintrags. Einträge ohne Modul bleiben einzeln.
 */
export function stapleNachModul(eintraege: readonly ToDoEintrag[]): ListenPosten[] {
  const nachModul = new Map<string, ToDoEintrag[]>();
  for (const eintrag of eintraege) {
    const modulId = eintrag.event.modulId;
    if (modulId) nachModul.set(modulId, [...(nachModul.get(modulId) ?? []), eintrag]);
  }

  const posten: ListenPosten[] = [];
  const schonGestapelt = new Set<string>();
  for (const eintrag of eintraege) {
    const modulId = eintrag.event.modulId;
    const gruppe = modulId ? nachModul.get(modulId)! : [];
    if (!modulId || gruppe.length < 2) {
      posten.push({ art: 'eintrag', eintrag });
    } else if (!schonGestapelt.has(modulId)) {
      schonGestapelt.add(modulId);
      posten.push({ art: 'stapel', stapel: { modulId, modul: eintrag.modul, eintraege: gruppe } });
    }
  }
  return posten;
}

function ohneLeere(bereiche: ToDoBereich[]): ToDoBereich[] {
  return bereiche.filter((bereich) => bereich.eintraege.length > 0);
}

function nachBeginn(a: ToDoEintrag, b: ToDoEintrag): number {
  return a.event.startMs - b.event.startMs || a.event.titel.localeCompare(b.event.titel, 'de');
}
