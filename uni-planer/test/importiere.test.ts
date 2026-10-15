/**
 * @jest-environment node
 */
import { migriere, type Db } from '@/db/db';
import {
  ladeAbrufInfo,
  ladeEinstellungen,
  ladeEvents,
  ladeStatus,
  setzeStatus,
  speichereEinstellungen,
} from '@/db/repository';
import { holeKalender, ImportFehler, mitExportVoreinstellungen, normalisiereMoodleLink } from '@/import/abruf';
import { importiere, ladeBeispieldaten, verbindeMoodle } from '@/import/importiere';
import { domainVon } from '@/speicher/moodleLink';
import { wochenbeginn } from '@/zeit';

import beispielIcs from './fixtures/beispiel.ics';
import { erzeugeTestDb, nodeSqliteVerfuegbar } from './hilfen/testDb';

const mockSecureStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (schluessel: string) => mockSecureStore.get(schluessel) ?? null,
  setItemAsync: async (schluessel: string, wert: string) => void mockSecureStore.set(schluessel, wert),
  deleteItemAsync: async (schluessel: string) => void mockSecureStore.delete(schluessel),
}));

// Ein Link im Format von RWTHmoodle, mit erfundenem Token.
const LINK = 'https://moodle.example.org/calendar/export_execute.php?userid=1&authtoken=GEHEIMERTOKEN123';

function antwort(text: string, status = 200) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, text: async () => text } as Response);
}

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
beforeEach(() => {
  mockSecureStore.clear();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

/** Die URL bzw. der Token darf in keiner Fehlermeldung auftauchen. */
async function fehlermeldung(versprechen: Promise<unknown>): Promise<string> {
  const fehler = await versprechen.then(
    () => {
      throw new Error('Fehler erwartet');
    },
    (f: unknown) => f,
  );
  expect(fehler).toBeInstanceOf(ImportFehler);
  const meldung = (fehler as Error).message;
  expect(meldung).not.toContain('GEHEIMERTOKEN123');
  expect(meldung).not.toContain('moodle.example.org');
  return meldung;
}

describe('normalisiereMoodleLink', () => {
  const VOREINSTELLUNGEN = 'preset_what=all&preset_time=recentupcoming';

  it('ergänzt fehlende Export-Voreinstellungen', () => {
    expect(normalisiereMoodleLink(LINK)).toBe(`${LINK}&${VOREINSTELLUNGEN}`);
  });

  it('ersetzt abweichende Voreinstellungen und lässt den Rest unverändert', () => {
    expect(
      normalisiereMoodleLink(`${LINK}&preset_what=courses&preset_time=weeknow&lang=de#oben`),
    ).toBe(`${LINK}&lang=de&${VOREINSTELLUNGEN}`);
  });

  it('entfernt Leerzeichen und Anführungszeichen am Rand', () => {
    for (const eingabe of [`  ${LINK}  `, `"${LINK}"`, `„${LINK}“`, `<${LINK}>`, `\n'${LINK}'\n`]) {
      expect(normalisiereMoodleLink(eingabe)).toBe(`${LINK}&${VOREINSTELLUNGEN}`);
    }
  });

  it('lehnt Links ab, die nicht mit https beginnen', () => {
    expect(() => normalisiereMoodleLink('http://moodle.example.org/x')).toThrow('https://');
    expect(() => normalisiereMoodleLink('webcal://moodle.example.org/x')).toThrow('https://');
    expect(() => normalisiereMoodleLink('https://')).toThrow(ImportFehler);
    expect(() => normalisiereMoodleLink('https://kein leerzeichen.de')).toThrow(ImportFehler);
  });

  it('erkennt Links, die nicht der Kalender-Export sind, ohne den Link zu verraten', () => {
    const falsch = [
      'https://moodle.example.org/calendar/view.php?view=month',
      'https://moodle.example.org/calendar/export_execute.php?userid=1',
      'https://moodle.example.org/calendar/export_execute.php?authtoken=GEHEIMERTOKEN123',
      'https://moodle.example.org/export_execute.php.html?userid=1&authtoken=GEHEIMERTOKEN123',
    ];
    for (const link of falsch) {
      let meldung = '';
      try {
        normalisiereMoodleLink(link);
      } catch (fehler) {
        meldung = (fehler as Error).message;
      }
      expect([link, meldung]).toEqual([link, expect.stringContaining('Export-Link')]);
      expect(meldung).not.toContain('GEHEIMERTOKEN123');
    }
  });
});

describe('mitExportVoreinstellungen', () => {
  it('setzt die Voreinstellungen auch bei bereits gespeicherten Links', () => {
    expect(mitExportVoreinstellungen(`${LINK}&preset_time=monthnow`)).toBe(
      `${LINK}&preset_what=all&preset_time=recentupcoming`,
    );
  });

  it('ist idempotent', () => {
    const einmal = mitExportVoreinstellungen(LINK);
    expect(mitExportVoreinstellungen(einmal)).toBe(einmal);
  });
});

describe('holeKalender', () => {
  it('gibt den Kalendertext zurück', async () => {
    fetchMock.mockReturnValue(antwort(beispielIcs));
    await expect(holeKalender(LINK)).resolves.toBe(beispielIcs);
  });

  it('meldet HTTP-Fehler verständlich und ohne URL', async () => {
    fetchMock.mockReturnValue(antwort('Forbidden', 403));
    expect(await fehlermeldung(holeKalender(LINK))).toContain('abgelehnt');
  });

  it('erkennt Antworten, die kein Kalender sind', async () => {
    fetchMock.mockReturnValue(antwort('<html>Login</html>'));
    expect(await fehlermeldung(holeKalender(LINK))).toContain('kein Kalender');
  });

  it('verwirft Netzwerkfehler, die die URL enthalten', async () => {
    fetchMock.mockRejectedValue(new TypeError(`Network request failed: ${LINK}`));
    expect(await fehlermeldung(holeKalender(LINK))).toContain('Internetverbindung');
  });

  it('bricht nach dem Timeout ab', async () => {
    fetchMock.mockImplementation(
      (_url, optionen) =>
        new Promise((_ok, fehler) => optionen?.signal?.addEventListener('abort', () => fehler(new Error('aborted')))),
    );
    expect(await fehlermeldung(holeKalender(LINK, 10))).toContain('Zeitüberschreitung');
  });
});

describe('domainVon', () => {
  it('zeigt nur die Domain', () => {
    expect(domainVon(LINK)).toBe('moodle.example.org');
  });
});

(nodeSqliteVerfuegbar ? describe : describe.skip)('Import-Ablauf', () => {
  let db: Db;

  beforeEach(async () => {
    db = erzeugeTestDb();
    await migriere(db);
  });

  it('speichert bei fehlerhaftem Testabruf nichts', async () => {
    fetchMock.mockReturnValue(antwort('<html>Login</html>'));
    await fehlermeldung(verbindeMoodle(db, LINK));
    expect(mockSecureStore.size).toBe(0);
    expect(await ladeEvents(db)).toEqual([]);
  });

  it('speichert den normalisierten Link und die Daten nach erfolgreichem Testabruf', async () => {
    const normalisiert = `${LINK}&preset_what=all&preset_time=recentupcoming`;
    fetchMock.mockReturnValue(antwort(beispielIcs));
    await verbindeMoodle(db, `"${LINK}&preset_time=weeknow"`);
    expect(fetchMock).toHaveBeenCalledWith(normalisiert, expect.anything());
    expect([...mockSecureStore.values()]).toEqual([normalisiert]);
    expect(await ladeEvents(db)).toHaveLength(16);
    expect((await ladeAbrufInfo(db)).letzterAbrufMs).not.toBeNull();
  });

  it('ruft auch alte, nicht normalisierte Links mit den richtigen Voreinstellungen ab', async () => {
    mockSecureStore.set('moodle_kalender_url', `${LINK}&preset_what=courses&preset_time=weeknow`);
    fetchMock.mockReturnValue(antwort(beispielIcs));
    await importiere(db);
    expect(fetchMock).toHaveBeenCalledWith(`${LINK}&preset_what=all&preset_time=recentupcoming`, expect.anything());
  });

  it('speichert nichts, wenn der Link nicht der Kalender-Export ist', async () => {
    await fehlermeldung(verbindeMoodle(db, 'https://moodle.example.org/calendar/view.php?view=month'));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockSecureStore.size).toBe(0);
  });

  it('behält bei Abruffehlern die Daten und speichert die Meldung', async () => {
    fetchMock.mockReturnValue(antwort(beispielIcs));
    await verbindeMoodle(db, LINK);
    await setzeStatus(db, '2008@moodle.example.org', 'abgegeben');

    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await fehlermeldung(importiere(db));

    expect(await ladeEvents(db)).toHaveLength(16);
    expect((await ladeStatus(db)).get('2008@moodle.example.org')).toBe('abgegeben');
    expect((await ladeAbrufInfo(db)).letzterFehler).toContain('Internetverbindung');

    fetchMock.mockReturnValue(antwort(beispielIcs));
    await importiere(db);
    expect((await ladeAbrufInfo(db)).letzterFehler).toBeNull();
  });

  it('lädt Beispieldaten ohne Link und importiert sie erneut ohne Netzwerk', async () => {
    await ladeBeispieldaten(db);
    expect(mockSecureStore.size).toBe(0);
    expect((await ladeAbrufInfo(db)).beispieldaten).toBe(true);

    await importiere(db);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await ladeEvents(db)).toHaveLength(16);
  });

  it('setzt beim Verbinden das Startdatum auf den Wochenbeginn', async () => {
    fetchMock.mockReturnValue(antwort(beispielIcs));
    await verbindeMoodle(db, LINK);
    expect((await ladeEinstellungen(db)).startdatumMs).toBe(wochenbeginn(Date.now()));
  });

  it('behält ein vorhandenes Startdatum und setzt ein fehlendes beim nächsten Import', async () => {
    fetchMock.mockReturnValue(antwort(beispielIcs));
    await verbindeMoodle(db, LINK);
    await speichereEinstellungen(db, { startdatumMs: 12345 });
    await importiere(db);
    expect((await ladeEinstellungen(db)).startdatumMs).toBe(12345);

    // Installationen von vor dem Startdatum bekommen es beim nächsten Import.
    await speichereEinstellungen(db, { startdatumMs: null });
    await importiere(db);
    expect((await ladeEinstellungen(db)).startdatumMs).toBe(wochenbeginn(Date.now()));
  });

  it('setzt bei Beispieldaten kein Startdatum, beim Wechsel zu Moodle schon', async () => {
    await ladeBeispieldaten(db);
    await importiere(db);
    expect((await ladeEinstellungen(db)).startdatumMs).toBeNull();

    fetchMock.mockReturnValue(antwort(beispielIcs));
    await verbindeMoodle(db, LINK);
    expect((await ladeEinstellungen(db)).startdatumMs).toBe(wochenbeginn(Date.now()));
  });

  it('ersetzt Beispieldaten beim Verbinden mit Moodle', async () => {
    await ladeBeispieldaten(db);
    await setzeStatus(db, '2008@moodle.example.org', 'abgegeben');

    fetchMock.mockReturnValue(antwort(beispielIcs));
    await verbindeMoodle(db, LINK);

    expect((await ladeAbrufInfo(db)).beispieldaten).toBe(false);
    expect((await ladeStatus(db)).size).toBe(0);
  });
});
