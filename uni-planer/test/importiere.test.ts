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
import { holeKalender, ImportFehler, pruefeUrl } from '@/import/abruf';
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

describe('pruefeUrl', () => {
  it('akzeptiert https-Links', () => {
    expect(pruefeUrl(`  ${LINK}  `)).toBe(LINK);
  });

  it('lehnt andere Links ab', async () => {
    expect(() => pruefeUrl('http://moodle.example.org/x')).toThrow('https://');
    expect(() => pruefeUrl('webcal://moodle.example.org/x')).toThrow('https://');
    expect(() => pruefeUrl('https://')).toThrow(ImportFehler);
    expect(() => pruefeUrl('https://kein leerzeichen.de')).toThrow(ImportFehler);
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

  it('speichert Link und Daten nach erfolgreichem Testabruf', async () => {
    fetchMock.mockReturnValue(antwort(beispielIcs));
    await verbindeMoodle(db, LINK);
    expect([...mockSecureStore.values()]).toEqual([LINK]);
    expect(await ladeEvents(db)).toHaveLength(16);
    expect((await ladeAbrufInfo(db)).letzterAbrufMs).not.toBeNull();
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
