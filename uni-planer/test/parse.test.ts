import { parseIcs } from '@/import/parse';

import beispielIcs from './fixtures/beispiel.ics';

describe('parseIcs', () => {
  const roh = parseIcs(beispielIcs);
  const nachUid = (nummer: number) => roh.find((r) => r.uid === `${nummer}@moodle.example.org`)!;

  it('liest alle VEVENTs der Fixture', () => {
    expect(roh).toHaveLength(18);
  });

  it('liest alle relevanten Felder', () => {
    expect(nachUid(2001)).toEqual({
      uid: '2001@moodle.example.org',
      titel: 'Vorlesung',
      beschreibung: null,
      startMs: Date.UTC(2026, 9, 15, 8, 30),
      endeMs: Date.UTC(2026, 9, 15, 10, 0),
      ort: '[1420|001] Hörsaal A',
      kategorie: '(VO) Analysis',
      lastModifiedMs: Date.UTC(2026, 9, 1, 8, 0),
    });
  });

  it('setzt maskierte Kommas und gefaltete Zeilen korrekt zusammen', () => {
    expect(nachUid(2011).beschreibung).toBe(
      'Implement breadth-first search, depth-first search and A* search for the grid world.',
    );
  });

  it('erhält Zeilenumbrüche in der Beschreibung', () => {
    expect(nachUid(2008).beschreibung).toBe('Bitte als PDF hochladen.\nGruppen bis 3 Personen.');
  });

  it('übernimmt UTC-Zeiten unverändert', () => {
    expect(nachUid(2008).startMs).toBe(Date.UTC(2026, 9, 26, 22, 59));
    expect(nachUid(2008).endeMs).toBe(Date.UTC(2026, 9, 26, 22, 59));
  });

  it('liest Zeiten ohne Zone als Berliner Zeit', () => {
    const [event] = parseIcs(
      [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'UID:floating',
        'SUMMARY:Ohne Zone',
        'DTSTART:20261026T235900',
        'DTEND:20261026T235900',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n'),
    );
    expect(event.startMs).toBe(Date.UTC(2026, 9, 26, 22, 59));
    expect(event.kategorie).toBeNull();
    expect(event.ort).toBeNull();
  });

  it('wirft bei Daten, die kein Kalender sind', () => {
    expect(() => parseIcs('<html>Anmeldung erforderlich</html>')).toThrow();
  });
});
