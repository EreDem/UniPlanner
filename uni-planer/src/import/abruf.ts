// Abruf der .ics-Daten. Die Kalender-URL enthält einen Zugangstoken:
// Sie darf in keiner Fehlermeldung und keinem Log auftauchen.

const TIMEOUT_MS = 20_000;

/** Fehler mit einer Meldung, die man dem Nutzer direkt zeigen kann (ohne URL). */
export class ImportFehler extends Error {
  override name = 'ImportFehler';
}

/**
 * Export-Voreinstellungen, die die App braucht: alle Termine (nicht nur Kurstermine) und das größte
 * Zeitfenster (letzte und kommende Termine). Wer in Moodle beim Export etwas anderes wählt, bekäme
 * sonst still weniger Termine, und fehlende künftige Termine würden als „entfernt“ markiert.
 * Der Token hängt nicht an diesen Parametern, der Link bleibt gültig.
 */
const EXPORT_VOREINSTELLUNGEN: Readonly<Record<string, string>> = {
  preset_what: 'all',
  preset_time: 'recentupcoming',
};

/** Setzt die Export-Voreinstellungen; alle anderen Parameter (userid, authtoken) bleiben unverändert. */
export function mitExportVoreinstellungen(url: string): string {
  // Bewusst ohne die URL-Klasse, deren Umsetzung in React Native unvollständig sein kann.
  const ohneFragment = url.split('#')[0];
  const frage = ohneFragment.indexOf('?');
  const basis = frage === -1 ? ohneFragment : ohneFragment.slice(0, frage);
  const parameter = (frage === -1 ? '' : ohneFragment.slice(frage + 1))
    .split('&')
    .filter((teil) => teil && !(teil.split('=')[0] in EXPORT_VOREINSTELLUNGEN));
  const voreinstellungen = Object.entries(EXPORT_VOREINSTELLUNGEN).map(([name, wert]) => `${name}=${wert}`);
  return `${basis}?${[...parameter, ...voreinstellungen].join('&')}`;
}

/**
 * Prüft den eingegebenen Link und bringt ihn in die Form, die die App braucht:
 * Leerzeichen und Anführungszeichen am Rand weg, nur https, nur der Kalender-Export von Moodle
 * (`/calendar/export_execute.php` mit `userid` und `authtoken`), Export-Voreinstellungen gesetzt.
 * Fehlermeldungen enthalten den Link nie.
 */
export function normalisiereMoodleLink(eingabe: string): string {
  const url = eingabe
    .trim()
    .replace(/^["'„“”‚‘’<]+|["'„“”‚‘’>]+$/g, '')
    .trim();
  if (!/^https:\/\//i.test(url)) {
    throw new ImportFehler('Der Link muss mit https:// beginnen.');
  }
  if (!/^https:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/i.test(url)) {
    throw new ImportFehler('Das sieht nicht nach einem gültigen Link aus.');
  }

  const [pfad, abfrage = ''] = url.split('#')[0].split('?');
  const istExportLink =
    /\/calendar\/export_execute\.php$/i.test(pfad) &&
    /(^|&)userid=[^&]+/.test(abfrage) &&
    /(^|&)authtoken=[^&]+/.test(abfrage);
  if (!istExportLink) {
    throw new ImportFehler(
      'Das ist nicht der Export-Link des Kalenders. In Moodle: Kalender → Exportieren → „Kalender-URL abfragen“ ' +
        'und den angezeigten Link kopieren.',
    );
  }
  return mitExportVoreinstellungen(url);
}

/** Ruft den Kalender ab. Wirft `ImportFehler`, wenn die Antwort kein Kalender ist. */
export async function holeKalender(url: string, timeoutMs = TIMEOUT_MS): Promise<string> {
  const abbruch = new AbortController();
  const timer = setTimeout(() => abbruch.abort(), timeoutMs);

  try {
    const antwort = await fetch(url, { signal: abbruch.signal, headers: { Accept: 'text/calendar' } });
    if (!antwort.ok) throw new ImportFehler(httpMeldung(antwort.status));

    const text = await antwort.text();
    if (!text.includes('BEGIN:VCALENDAR')) {
      throw new ImportFehler(
        'Die Antwort ist kein Kalender. Bitte prüfe, ob du den Link aus „Kalender-URL abfragen“ kopiert hast.',
      );
    }
    return text;
  } catch (fehler) {
    if (fehler instanceof ImportFehler) throw fehler;
    // Den Originalfehler bewusst nicht weitergeben: Er kann die URL mit Token enthalten.
    throw new ImportFehler(
      abbruch.signal.aborted
        ? 'Zeitüberschreitung: Moodle hat nicht rechtzeitig geantwortet.'
        : 'Keine Verbindung zu Moodle. Bitte prüfe deine Internetverbindung.',
    );
  } finally {
    clearTimeout(timer);
  }
}

function httpMeldung(status: number): string {
  if (status === 401 || status === 403) {
    return `Moodle hat den Zugriff abgelehnt (HTTP ${status}). Ist der Link noch gültig?`;
  }
  if (status === 404) return 'Kalender nicht gefunden (HTTP 404). Bitte prüfe den Link.';
  if (status >= 500) return `Moodle ist gerade nicht erreichbar (HTTP ${status}). Bitte später erneut versuchen.`;
  return `Abruf fehlgeschlagen (HTTP ${status}).`;
}
