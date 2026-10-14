import {
  berlinOffsetMinuten,
  berlinZuUtc,
  fristText,
  leseDatumZeit,
  relativerTag,
  tagesgrenzen,
  terminText,
  vorWieLange,
  wochenbeginn,
} from '@/zeit';

const STUNDE = 3_600_000;

describe('berlinOffsetMinuten', () => {
  it('stimmt 2024–2030 stündlich mit der IANA-Zeitzonendatenbank überein', () => {
    // In Node ist Intl vollständig; in der App verlassen wir uns bewusst nicht darauf.
    const intl = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', timeZoneName: 'longOffset' });
    const erwartet = (ms: number) => (intl.format(ms).endsWith('GMT+02:00') ? 120 : 60);

    const abweichungen: string[] = [];
    for (let ms = Date.UTC(2024, 0, 1); ms < Date.UTC(2031, 0, 1); ms += STUNDE) {
      if (berlinOffsetMinuten(ms) !== erwartet(ms)) abweichungen.push(new Date(ms).toISOString());
    }
    expect(abweichungen).toEqual([]);
  });
});

describe('berlinZuUtc', () => {
  it('rechnet Winter- und Sommerzeit um', () => {
    expect(berlinZuUtc(2026, 10, 26, 23, 59)).toBe(Date.UTC(2026, 9, 26, 22, 59));
    expect(berlinZuUtc(2026, 10, 15, 10, 30)).toBe(Date.UTC(2026, 9, 15, 8, 30));
  });
});

describe('tagesgrenzen', () => {
  it('liefert Mitternacht bis Mitternacht in Berlin', () => {
    expect(tagesgrenzen(Date.UTC(2026, 9, 20, 23, 30))).toEqual({
      startMs: Date.UTC(2026, 9, 20, 22, 0),
      endeMs: Date.UTC(2026, 9, 21, 22, 0),
    });
  });

  it('kennt den 25-Stunden-Tag der Zeitumstellung', () => {
    const { startMs, endeMs } = tagesgrenzen(Date.UTC(2026, 9, 25, 12, 0));
    expect(startMs).toBe(Date.UTC(2026, 9, 24, 22, 0));
    expect(endeMs - startMs).toBe(25 * STUNDE);
  });
});

describe('wochenbeginn', () => {
  const montag = Date.UTC(2026, 9, 11, 22, 0); // Mo 12.10.2026 00:00 Berlin (Sommerzeit)

  it('liefert Montag 00:00 Berliner Zeit', () => {
    expect(wochenbeginn(berlinZuUtc(2026, 10, 14, 12, 0))).toBe(montag);
    expect(wochenbeginn(berlinZuUtc(2026, 10, 18, 23, 59))).toBe(montag);
    expect(wochenbeginn(montag)).toBe(montag);
  });

  it('beginnt die neue Woche um Mitternacht in Berlin, nicht in UTC', () => {
    // So 18.10. 23:30 UTC ist in Berlin schon Mo 19.10. 01:30.
    expect(wochenbeginn(Date.UTC(2026, 9, 18, 23, 30))).toBe(Date.UTC(2026, 9, 18, 22, 0));
  });

  it('rechnet über die Zeitumstellung hinweg', () => {
    // Mi 28.10.2026 liegt nach der Umstellung am 25.10.; Mo 26.10. 00:00 ist Winterzeit.
    expect(wochenbeginn(berlinZuUtc(2026, 10, 28, 12, 0))).toBe(Date.UTC(2026, 9, 25, 23, 0));
  });
});

describe('Texte', () => {
  const jetzt = berlinZuUtc(2026, 10, 23, 12, 0);

  it('beschreibt Fristen relativ und absolut', () => {
    expect(fristText(Date.UTC(2026, 9, 26, 22, 59), jetzt)).toBe('in 3 Tagen · Mo 26.10., 23:59');
  });

  it('zählt Kalendertage in Berlin', () => {
    expect(relativerTag(berlinZuUtc(2026, 10, 23, 23, 59), jetzt)).toBe('heute');
    expect(relativerTag(berlinZuUtc(2026, 10, 24, 0, 1), jetzt)).toBe('morgen');
    expect(relativerTag(berlinZuUtc(2026, 10, 22, 8, 0), jetzt)).toBe('gestern');
    expect(relativerTag(berlinZuUtc(2026, 10, 20, 8, 0), jetzt)).toBe('vor 3 Tagen');
  });

  it('formatiert Vorlesungstermine', () => {
    expect(terminText(Date.UTC(2026, 9, 15, 8, 30), Date.UTC(2026, 9, 15, 10, 0))).toBe(
      'Do 15.10., 10:30–12:00',
    );
  });

  it('beschreibt, wie lange etwas her ist', () => {
    expect(vorWieLange(jetzt - 30_000, jetzt)).toBe('gerade eben');
    expect(vorWieLange(jetzt - 5 * 60_000, jetzt)).toBe('vor 5 Min.');
    expect(vorWieLange(jetzt - 3 * STUNDE, jetzt)).toBe('vor 3 Std.');
    expect(vorWieLange(jetzt - 50 * STUNDE, jetzt)).toBe('vor 2 Tagen');
  });
});

describe('leseDatumZeit', () => {
  it('liest Datum und Uhrzeit als Berliner Zeit', () => {
    expect(leseDatumZeit('26.10.2026', '23:59')).toBe(Date.UTC(2026, 9, 26, 22, 59));
    expect(leseDatumZeit(' 1.4.2027 ', '8:15')).toBe(Date.UTC(2027, 3, 1, 6, 15));
  });

  it('lehnt ungültige Eingaben ab', () => {
    expect(leseDatumZeit('31.02.2026', '10:00')).toBeNull();
    expect(leseDatumZeit('26.10.2026', '24:00')).toBeNull();
    expect(leseDatumZeit('2026-10-26', '10:00')).toBeNull();
    expect(leseDatumZeit('26.10.2026', '')).toBeNull();
  });
});
