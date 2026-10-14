// Abruf der .ics-Daten. Die Kalender-URL enthält einen Zugangstoken:
// Sie darf in keiner Fehlermeldung und keinem Log auftauchen.

const TIMEOUT_MS = 20_000;

/** Fehler mit einer Meldung, die man dem Nutzer direkt zeigen kann (ohne URL). */
export class ImportFehler extends Error {
  override name = 'ImportFehler';
}

/** Prüft die Eingabe und gibt die bereinigte URL zurück. */
export function pruefeUrl(eingabe: string): string {
  const url = eingabe.trim();
  if (!/^https:\/\//i.test(url)) {
    throw new ImportFehler('Der Link muss mit https:// beginnen.');
  }
  if (!/^https:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/i.test(url)) {
    throw new ImportFehler('Das sieht nicht nach einem gültigen Link aus.');
  }
  return url;
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
